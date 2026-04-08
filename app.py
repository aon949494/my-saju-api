import os
import json
import traceback
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

import vertexai
from vertexai.generative_models import GenerativeModel, SafetySetting, HarmCategory, HarmBlockThreshold
from google.oauth2 import service_account

app = Flask(__name__)
CORS(app)

# ─── [보안과 작동을 모두 잡는 설정] ───
# 1. 프로젝트 ID: 공개되어도 안전합니다. 여기에 직접 입력하세요.
# 예: PROJECT_ID = "gen-lang-client-0051198627"
PROJECT_ID = "uncannyai-492713" 

# 2. JSON 키: 절대 노출 금지! Render 환경변수(GCP_SERVICE_ACCOUNT_KEY)에서 가져옵니다.
GCP_KEY_JSON = os.environ.get("GCP_SERVICE_ACCOUNT_KEY")
LOCATION = "us-central1"

def init_vertex():
    # 프로젝트 ID 입력 여부 확인
    if not PROJECT_ID or "여기에" in PROJECT_ID:
        return False, "코드 상단 PROJECT_ID 변수에 실제 ID를 입력해 주세요."
    if not GCP_KEY_JSON:
        return False, "Render 환경변수에 GCP_SERVICE_ACCOUNT_KEY가 설정되지 않았습니다."
    
    try:
        key_dict = json.loads(GCP_KEY_JSON)
        credentials = service_account.Credentials.from_service_account_info(key_dict)
        
        # vertexai 초기화 시 프로젝트 ID를 강제로 주입합니다.
        vertexai.init(project=PROJECT_ID, location=LOCATION, credentials=credentials)
        return True, "성공"
    except Exception as e:
        return False, f"GCP 인증 오류: {str(e)}"

# 서버 구동 시 초기화
is_ready, init_msg = init_vertex()

DIR = os.path.dirname(os.path.abspath(__file__))

@app.route('/')
def index():
    html_files = [f for f in os.listdir(DIR) if f.endswith('.html')]
    return send_from_directory(DIR, html_files[0]) if html_files else ("No HTML", 404)

@app.route('/api/saju', methods=['POST'])
def saju_api():
    if not is_ready:
        return jsonify({'error': {'message': '서버 설정 오류', 'details': init_msg}}), 500

    try:
        payload = request.json
        user_prompt = payload.get('messages', [{}])[0].get('content', '사주 분석해줘')
        
        # 모델 생성 시에도 명시적으로 프로젝트를 지정할 수 있습니다.
        model = GenerativeModel("gemini-2.5-flash")
        
        safety_settings = [
            SafetySetting(category=HarmCategory.HARM_CATEGORY_HARASSMENT, threshold=HarmBlockThreshold.BLOCK_NONE),
            SafetySetting(category=HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold=HarmBlockThreshold.BLOCK_NONE),
            SafetySetting(category=HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold=HarmBlockThreshold.BLOCK_NONE),
            SafetySetting(category=HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold=HarmBlockThreshold.BLOCK_NONE),
        ]

        response = model.generate_content(
            user_prompt,
            generation_config={"temperature": 0.7, "max_output_tokens": 8000},
            safety_settings=safety_settings
        )

        return jsonify({'content': [{'type': 'text', 'text': response.text}]})

    except Exception as e:
        return jsonify({
            'error': {
                'message': 'Vertex AI 호출 중 에러',
                'details': str(e)
            }
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 10000))
    app.run(host='0.0.0.0', port=port)
