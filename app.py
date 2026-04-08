import os
import json
import urllib.request
import urllib.error
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ═══════════════════════════════════════
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
MODEL_NAME = "gemini-2.5-flash" 
# ═══════════════════════════════════════

DIR = os.path.dirname(os.path.abspath(__file__))

@app.route('/')
def index():
    html_file = next((f for f in os.listdir(DIR) if f.endswith('.html')), None)
    if html_file:
        return send_from_directory(DIR, html_file)
    return "HTML 파일을 찾을 수 없습니다.", 404

@app.route('/api/saju', methods=['POST'])
def saju_api():
    if not GEMINI_API_KEY:
        print("!!! 에러: API 키가 환경변수에 없습니다.")
        return jsonify({'error': {'message': '서버에 API 키가 설정되지 않았습니다.'}}), 500

    try:
        payload = request.json
        system_prompt = payload.get('system', '')
        msgs = payload.get('messages', [])
        max_tokens = payload.get('max_tokens', 8000)
        
        if not msgs or not msgs[0].get('content'):
            print("!!! 에러: 전달된 메시지 내용이 비어있습니다.")
            return jsonify({'error': {'message': '질문 내용이 없습니다.'}}), 400
            
        user_prompt = msgs[0]['content']
        print(f" → Gemini 요청 시도 (모델: {MODEL_NAME})")

        # [안전 설정] 사주 풀이 차단 방지
        safety_settings = [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"}
        ]

        gbody = {
            'contents': [{'role': 'user', 'parts': [{'text': user_prompt}]}],
            'generationConfig': {
                'maxOutputTokens': max_tokens, 
                'temperature': 0.7
            },
            'safetySettings': safety_settings
        }
        
        if system_prompt.strip():
            gbody['systemInstruction'] = {'parts': [{'text': system_prompt}]}

        url = f'https://generativelanguage.googleapis.com/v1beta/models/{MODEL_NAME}:generateContent?key={GEMINI_API_KEY}'

        req = urllib.request.Request(
            url,
            data=json.dumps(gbody).encode(),
            headers={'Content-Type': 'application/json'},
            method='POST'
        )

        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                gd = json.loads(r.read())
                
                if 'candidates' in gd and len(gd['candidates']) > 0:
                    candidate = gd['candidates'][0]
                    
                    if candidate.get('finishReason') == 'SAFETY':
                        print("!!! 차단됨: 세이프티 필터에 의해 답변이 거부되었습니다.")
                        return jsonify({'error': {'message': '안전 정책으로 차단되었습니다.'}}), 500
                    
                    if 'content' in candidate and 'parts' in candidate['content']:
                        text = candidate['content']['parts'][0]['text']
                        print(" → 성공: 답변 생성 완료")
                        return jsonify({'content': [{'type': 'text', 'text': text}]})
                
                return jsonify({'error': {'message': '응답 형식이 올바르지 않습니다.'}}), 500

        except urllib.error.HTTPError as e:
            # ★ 여기가 핵심입니다. 구글이 보낸 에러 '본문'을 읽어서 로그에 찍습니다.
            error_body = e.read().decode()
            print(f"!!! Google API 상세 에러 (Code {e.code}): {error_body}")
            return jsonify({'error': {'message': f'Google API 에러 {e.code}', 'details': error_body}}), e.code

    except Exception as e:
        import traceback
        print(f"!!! 서버 내부 에러: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': {'message': str(e)}}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
