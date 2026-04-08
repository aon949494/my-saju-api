import os
import json
import urllib.request
import urllib.error
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ═══════════════════════════════════════
# [설정] 환경 변수 및 모델 이름
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
PRIMARY_MODEL = "gemini-2.5-flash"
FALLBACK_MODEL = "gemini-1.5-flash"  # 2.5 모델 장애 시 백업용
# ═══════════════════════════════════════

DIR = os.path.dirname(os.path.abspath(__file__))

@app.route('/')
def index():
    # 폴더 내의 첫 번째 html 파일 서빙
    html_files = [f for f in os.listdir(DIR) if f.endswith('.html')]
    if html_files:
        return send_from_directory(DIR, html_files[0])
    return "HTML 파일을 찾을 수 없습니다.", 404

def call_gemini_api(model_name, user_prompt, system_prompt):
    # 세이프티 필터 해제 (사주 답변 차단 방지)
    safety_settings = [
        {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
        {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"}
    ]

    gbody = {
        'contents': [{'role': 'user', 'parts': [{'text': user_prompt}]}],
        'generationConfig': {'temperature': 0.7, 'maxOutputTokens': 8000},
        'safetySettings': safety_settings
    }
    
    if system_prompt.strip():
        gbody['systemInstruction'] = {'parts': [{'text': system_prompt}]}

    url = f'https://generativelanguage.googleapis.com/v1beta/models/{model_name}:generateContent?key={GEMINI_API_KEY}'
    
    req = urllib.request.Request(
        url,
        data=json.dumps(gbody).encode(),
        headers={'Content-Type': 'application/json'},
        method='POST'
    )

    with urllib.request.urlopen(req, timeout=60) as r:
        return json.loads(r.read())

@app.route('/api/saju', methods=['POST'])
def saju_api():
    if not GEMINI_API_KEY:
        return jsonify({'error': {'message': 'Render Settings에서 GEMINI_API_KEY를 설정해주세요.'}}), 500

    try:
        payload = request.json
        system_prompt = payload.get('system', '')
        msgs = payload.get('messages', [])
        user_prompt = msgs[0]['content'] if msgs else ''

        try:
            # 1차 시도: 2.5 모델
            print(f"--- {PRIMARY_MODEL} 호출 시도 ---")
            gd = call_gemini_api(PRIMARY_MODEL, user_prompt, system_prompt)
        except Exception as e:
            # 2차 시도: 2.5 실패 시 1.5로 자동 전환 (지역 제한 방어)
            print(f"--- {PRIMARY_MODEL} 실패, {FALLBACK_MODEL}로 재시도 ---")
            gd = call_gemini_api(FALLBACK_MODEL, user_prompt, system_prompt)

        # 응답 데이터 처리
        if 'candidates' in gd and len(gd['candidates']) > 0:
            candidate = gd['candidates'][0]
            if candidate.get('finishReason') == 'SAFETY':
                return jsonify({'error': {'message': '구글의 안전 정책으로 내용이 차단되었습니다.'}}), 400
            
            text = candidate['content']['parts'][0]['text']
            return jsonify({'content': [{'type': 'text', 'text': text}]})
        
        return jsonify({'error': {'message': '응답 형식이 올바르지 않습니다.'}}), 500

    except urllib.error.HTTPError as e:
        # 구글이 보낸 상세 에러 본문을 읽어서 브라우저로 전달
        err_detail = e.read().decode('utf-8')
        return jsonify({'error': {'message': f'Google API Error {e.code}', 'details': err_detail}}), 400
    except Exception as e:
        return jsonify({'error': {'message': str(e)}}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 10000))
    app.run(host='0.0.0.0', port=port)
