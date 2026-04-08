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
        print("!!! 에러: API 키가 설정되지 않았습니다.")
        return jsonify({'error': {'message': '서버에 API 키가 설정되지 않았습니다.'}}), 500

    try:
        payload = request.json
        system_prompt = payload.get('system', '')
        msgs = payload.get('messages', [])
        max_tokens = payload.get('max_tokens', 8000)
        
        # 메시지 내용이 비어있는지 확인 (400 에러 방지)
        if not msgs or not msgs[0].get('content'):
            print("!!! 에러: 요청 메시지가 비어있습니다.")
            return jsonify({'error': {'message': '질문 내용이 없습니다.'}}), 400
            
        user_prompt = msgs[0]['content']
        print(f" → Gemini 요청 시작 (모델: {MODEL_NAME})")

        # [중요] 세이프티 필터 해제: 사주 풀이 중 차단되는 것을 방지합니다.
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
                
                # 응답 구조 안전하게 검사
                if 'candidates' in gd and len(gd['candidates']) > 0:
                    candidate = gd['candidates'][0]
                    
                    # 차단 여부 확인
                    if candidate.get('finishReason') == 'SAFETY':
                        print("!!! 차단됨: 콘텐츠가 세이프티 필터에 의해 거부되었습니다.")
                        return jsonify({'error': {'message': '안전 정책에 의해 답변이 차단되었습니다.'}}), 500
                    
                    if 'content' in candidate and 'parts' in candidate['content']:
                        text = candidate['content']['parts'][0]['text']
                        print(" → 분석 완료!")
                        return jsonify({'content': [{'type': 'text', 'text': text}]})
                
                print(f"!!! 에러: 예상치 못한 응답 구조입니다: {gd}")
                return jsonify({'error': {'message': '응답 데이터를 읽을 수 없습니다.'}}), 500

        except urllib.error.HTTPError as e:
            # 구글 API가 직접 뱉는 에러 메시지를 Render 로그에 출력
            error_msg = e.read().decode()
            print(f"!!! Google API HTTP 에러 ({e.code}): {error_msg}")
            return jsonify({'error': {'message': f'Google API 에러 ({e.code})', 'details': error_msg}}), e.code

    except Exception as e:
        import traceback
        print(f"!!! 서버 로직 에러: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': {'message': str(e)}}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
