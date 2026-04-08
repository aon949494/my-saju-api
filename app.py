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
    html_files = [f for f in os.listdir(DIR) if f.endswith('.html')]
    if html_files:
        return send_from_directory(DIR, html_files[0])
    return "HTML 파일을 찾을 수 없습니다.", 404

@app.route('/api/saju', methods=['POST'])
def saju_api():
    if not GEMINI_API_KEY:
        return jsonify({'error': {'message': 'API 키가 설정되지 않았습니다.'}}), 500

    try:
        payload = request.json
        user_prompt = payload.get('messages', [{}])[0].get('content', '')

        gbody = {
            'contents': [{'role': 'user', 'parts': [{'text': user_prompt}]}],
            'generationConfig': {'temperature': 0.7, 'maxOutputTokens': 8000},
            'safetySettings': [
                {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"}
            ]
        }

        # 지역 제한 에러가 가장 적은 v1beta 경로 사용
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
                text = gd['candidates'][0]['content']['parts'][0]['text']
                return jsonify({'content': [{'type': 'text', 'text': text}]})

        except urllib.error.HTTPError as e:
            err_body = e.read().decode('utf-8')
            
            # [핵심] 지역 제한 에러 발생 시 처리
            if "location is not supported" in err_body.lower():
                print("!!! 지역 제한 발생: Render 서버 IP가 구글에 의해 차단되었습니다.")
                return jsonify({
                    'error': {
                        'message': '서버 위치 문제 (Location Error)',
                        'details': '현재 서버의 IP가 구글 API 미지원 대역에 걸렸습니다. Render에서 "Manual Deploy > Clear build cache & deploy"를 눌러 서버 IP를 새로 할당받으세요.'
                    }
                }), 400
            
            return jsonify({'error': {'message': f'Google API Error {e.code}', 'details': err_body}}), e.code

    except Exception as e:
        return jsonify({'error': {'message': str(e)}}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 10000))
    app.run(host='0.0.0.0', port=port)
