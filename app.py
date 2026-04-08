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

# ... (생략: urllib.request.Request 부분까지)

        try:
            with urllib.request.urlopen(req, timeout=60) as r:
                gd = json.loads(r.read())
                text = gd['candidates'][0]['content']['parts'][0]['text']
                print(" → 분석 완료!")
                return jsonify({'content': [{'type': 'text', 'text': text}]})
        
        # 구글 API가 에러를 뱉었을 때 (400, 404, 429 등)
        except urllib.error.HTTPError as e:
            error_body = e.read().decode() # 구글이 보내준 진짜 에러 메시지 읽기
            print(f"!!! 구글 API 에러 발생: {e.code} !!!")
            print(f"상세 내용: {error_body}")
            return jsonify({'error': {'message': f'Google API Error {e.code}', 'details': error_body}}), e.code

    except Exception as e:
        import traceback
        print("!!! 서버 내부 로직 에러 !!!")
        print(traceback.format_exc()) # 어디서 터졌는지 전체 경로 출력
        return jsonify({'error': {'message': str(e)}}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 8080))
    app.run(host='0.0.0.0', port=port)
