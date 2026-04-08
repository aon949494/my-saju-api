import os
import json
import urllib.request
import urllib.error
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ═══════════════════════════════════════
# [보안 적용] API 키를 환경 변수에서 가져옵니다.
# 로컬 테스트 시에는 터미널에서 설정을 해주어야 하며, 
# Render 배포 시에는 Environment Variables 설정창에 입력하면 됩니다.
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
    # 키가 설정되지 않았을 경우 에러 처리
    if not GEMINI_API_KEY:
        return jsonify({'error': {'message': '서버에 API 키가 설정되지 않았습니다.'}}), 500

    try:
        payload = request.json
        system_prompt = payload.get('system', '')
        msgs = payload.get('messages', [])
        max_tokens = payload.get('max_tokens', 8000)
        user_prompt = msgs[0]['content'] if msgs else ''

        print(f" → Gemini 요청중... (모델: {MODEL_NAME})")

        gbody = {
            'contents': [{'role': 'user', 'parts': [{'text': user_prompt}]}],
            'generationConfig': {'maxOutputTokens': max_tokens, 'temperature': 0.7}
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

# ... (중략: 58행 부근) ...
    try:
        with urllib.request.urlopen(req, timeout=60) as r:
            gd = json.loads(r.read())
            # (정상 처리 로직...)
            text = gd['candidates'][0]['content']['parts'][0]['text']
            return jsonify({'content': [{'type': 'text', 'text': text}]})

    except urllib.error.HTTPError as e:
        # 구글 API가 보내는 400 에러의 상세 내용을 로그에 찍습니다.
        error_details = e.read().decode()
        print(f"!!! Google API 400 Error Details: {error_details}")
        return jsonify({'error': {'message': 'Google API Error', 'details': error_details}}), 400

    except Exception as e:
        print(f" → 서버 내부 에러: {str(e)}")
        return jsonify({'error': {'message': str(e)}}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8080))
    app.run(host='0.0.0.0', port=port)
