import os
import json
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

# GCP Vertex AI 라이브러리
import vertexai
from vertexai.generative_models import GenerativeModel, SafetySetting, HarmCategory, HarmBlockThreshold
from google.oauth2 import service_account

app = Flask(__name__)
CORS(app)

# ═══════════════════════════════════════
# [GCP 설정] Render의 Environment Variables에 아래 항목을 반드시 넣으세요.
# 1. GCP_PROJECT_ID : 내 GCP 프로젝트 ID (예: saju-project-123)
# 2. GCP_SERVICE_ACCOUNT_KEY : 발급받은 JSON 키 파일의 내용을 통째로 복사해서 붙여넣기
# ═══════════════════════════════════════

PROJECT_ID = os.environ.get("GCP_PROJECT_ID")
LOCATION = "us-central1"  # 미국 중부 (지역 에러가 발생하지 않는 가장 안정적인 곳)
GCP_KEY_JSON = os.environ.get("GCP_SERVICE_ACCOUNT_KEY")

# 1. GCP Vertex AI 인증 및 초기화
try:
    if GCP_KEY_JSON:
        # 환경변수에 저장된 JSON 문자열을 파이썬 딕셔너리로 변환
        key_dict = json.loads(GCP_KEY_JSON)
        credentials = service_account.Credentials.from_service_account_info(key_dict)
        vertexai.init(project=PROJECT_ID, location=LOCATION, credentials=credentials)
        print(f"--- GCP Vertex AI 인증 성공 (Project: {PROJECT_ID}) ---")
    else:
        print("!!! 에러: GCP_SERVICE_ACCOUNT_KEY 환경 변수가 없습니다. !!!")
except Exception as e:
    print(f"!!! GCP 초기화 에러: {str(e)}")

# 모델 설정 (GCP Vertex AI에서 지원하는 모델명 사용)
# 2.5 모델이 아직 프리뷰라면 "gemini-1.5-flash"가 가장 속도가 빠르고 안정적입니다.
MODEL_NAME = "gemini-1.5-flash" 

DIR = os.path.dirname(os.path.abspath(__file__))

@app.route('/')
def index():
    html_files = [f for f in os.listdir(DIR) if f.endswith('.html')]
    if html_files:
        return send_from_directory(DIR, html_files[0])
    return "HTML 파일을 찾을 수 없습니다.", 404

@app.route('/api/saju', methods=['POST'])
def saju_api():
    try:
        payload = request.json
        user_prompt = payload.get('messages', [{}])[0].get('content', '')
        
        # 모델 로드
        model = GenerativeModel(MODEL_NAME)

        # 2. 세이프티 설정 (사주 풀이가 차단되지 않도록 BLOCK_NONE 설정)
        safety_config = [
            SafetySetting(category=HarmCategory.HARM_CATEGORY_HARASSMENT, threshold=HarmBlockThreshold.BLOCK_NONE),
            SafetySetting(category=HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold=HarmBlockThreshold.BLOCK_NONE),
            SafetySetting(category=HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold=HarmBlockThreshold.BLOCK_NONE),
            SafetySetting(category=HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold=HarmBlockThreshold.BLOCK_NONE),
        ]

        # 3. 답변 생성
        response = model.generate_content(
            user_prompt,
            generation_config={
                "temperature": 0.7,
                "max_output_tokens": 8000,
            },
            safety_settings=safety_config
        )

        return jsonify({'content': [{'type': 'text', 'text': response.text}]})

    except Exception as e:
        print(f"!!! 호출 에러: {str(e)}")
        return jsonify({'error': {'message': str(e)}}), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 10000))
    app.run(host='0.0.0.0', port=port)
