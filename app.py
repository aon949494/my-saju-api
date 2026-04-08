import os
import json
import urllib.request
import urllib.error
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ═══════════════════════════════════════
# [설정] 요청하신 gemini-2.5-flash 모델로 복구
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
MODEL_NAME = "gemini-2.5-flash" 
# ═══════════════════════════════════════

DIR = os.path.dirname(os.path.abspath(__file__))

@app.route('/')
def index():
    html_files = [f for f in os.listdir(DIR) if f.endswith('.html')]
    if html_files:
        return send_from_directory(DIR, html_files[0])
    return "HTML 파일을 찾을 수 없습니다.", 404

@app.route('/api/saju', methods=['POST'])
def saju_api():
    if not GEMINI_API_KEY:
        return jsonify({'error': {'message': 'Render 환경변수에 API 키가 설정되지 않았습니다.'}}), 500

    try:
        payload = request.json
        system_prompt = payload.get('system', '')
        msgs = payload.get('messages', [])
        user_prompt = msgs[0]['content'] if msgs else '사주를 분석해줘.'

        # [중요] 세이프티 필터 해제 (사주 답변 차단 방지)
        # 사주 풀이 중 '운명', '죽음', '위험' 등의 단어가 필터링되는 것을 막습니다.
        safety_settings = [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"}
        ]

        gbody = {
            'contents': [{'role': 'user', 'parts': [{'text': user_prompt}]}],
            'generationConfig': {
                'temperature': 0.7,
                'maxOutputTokens': 8000
            },
            'safetySettings': safety_settings
        }
        
        if system_prompt.strip():
            gbody['systemInstruction'] = {'parts': [{'text': system_prompt}]}

        # 요청 URL (v1beta 경로 사용)
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
                    # 구글 필터에 의해 차단되었는지 확인
                    if candidate.get('finishReason') == 'SAFETY':
                        return jsonify({'error': {'message': '안전 정책으로 인해 답변이 차단되었습니다.'}}), 400
                    
                    text = candidate['content']['parts'][0]['text']
                    return jsonify({'content': [{'type': 'text', 'text': text}]})
                
                return jsonify({'error': {'message': '응답 형식이 올바르지 않습니다.'}}), 500

        except urllib.error.HTTPError as e:
            # 에러 발생 시 구글이 보낸 상세 이유를 포함하여 반환
            error_body = e.read().decode('utf-8')
            return jsonify({
                'error': {
                    'message': f'Google API Error {e.code}',
                    'details': error_body
                }
            }), e.code

    except Exception as e:
        return jsonify({'error': {'message': str(e)}}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 10000))
    app.run(host='0.0.0.0', port=port)
