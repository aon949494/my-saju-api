import os
import json
import urllib.request
import urllib.error
import sys
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ═══════════════════════════════════════
# [설정] 환경 변수 및 모델 이름
GEMINI_API_KEY = os.environ.get("GEMINI_API_KEY")
MODEL_NAME = "gemini-2.5-flash" 
# ═══════════════════════════════════════

DIR = os.path.dirname(os.path.abspath(__file__))

@app.route('/')
def index():
    # 폴더 내의 첫 번째 html 파일을 서빙
    html_files = [f for f in os.listdir(DIR) if f.endswith('.html')]
    if html_files:
        return send_from_directory(DIR, html_files[0])
    return "HTML 파일을 찾을 수 없습니다.", 404

@app.route('/api/saju', methods=['POST'])
def saju_api():
    # 1. API 키 확인 (Render의 Environment Variables 설정 확인용)
    if not GEMINI_API_KEY:
        print("!!! [에러] GEMINI_API_KEY가 설정되지 않았습니다 !!!", flush=True)
        return jsonify({'error': {'message': '서버에 API 키가 설정되지 않았습니다.'}}), 500

    try:
        payload = request.json
        system_prompt = payload.get('system', '')
        msgs = payload.get('messages', [])
        user_prompt = msgs[0]['content'] if msgs else '사주를 분석해줘.'
        
        print(f"--- Gemini 요청 시작 (모델: {MODEL_NAME}) ---", flush=True)

        # 2. 세이프티 필터 해제 (사주 답변이 '미신/위험'으로 차단되는 것 방지)
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

        # 구글 API 호출 URL
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
                
                # 답변 결과 추출 및 차단 확인
                if 'candidates' in gd and len(gd['candidates']) > 0:
                    candidate = gd['candidates'][0]
                    if candidate.get('finishReason') == 'SAFETY':
                        print("!!! [차단] 세이프티 필터에 의해 답변이 거부됨 !!!", flush=True)
                        return jsonify({'error': {'message': '안전 정책으로 답변이 차단되었습니다.'}}), 500
                    
                    text = candidate['content']['parts'][0]['text']
                    print("--- [성공] 분석 완료 ---", flush=True)
                    return jsonify({'content': [{'type': 'text', 'text': text}]})
                
                return jsonify({'error': {'message': '응답 형식이 올바르지 않습니다.'}}), 500

        except urllib.error.HTTPError as e:
            # ★ 핵심: 구글이 보내준 진짜 에러 사유(Body)를 읽어서 출력합니다.
            err_body = e.read().decode('utf-8')
            print("\n" + "="*60, flush=True)
            print(f"!!! [구글 API 상세 에러 메시지] !!!", flush=True)
            print(f"상태 코드: {e.code}", flush=True)
            print(f"에러 본문: {err_body}", flush=True)
            print("="*60 + "\n", flush=True)
            
            # 브라우저(크롬)에서도 상세 내용을 볼 수 있게 보냅니다.
            return jsonify({
                'error': {
                    'message': f'Google API Error {e.code}',
                    'details': err_body
                }
            }), 400

    except Exception as e:
        import traceback
        print(f"!!! [서버 내부 에러] {str(e)}", flush=True)
        print(traceback.format_exc(), flush=True)
        return jsonify({'error': {'message': str(e)}}), 500

if __name__ == '__main__':
    # Render 환경의 포트에 맞춰 실행
    port = int(os.environ.get("PORT", 10000))
    app.run(host='0.0.0.0', port=port)
