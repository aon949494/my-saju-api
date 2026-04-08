import os
import json
from flask import Flask, request, jsonify
import vertexai
from vertexai.generative_models import GenerativeModel, SafetySetting

app = Flask(__name__)

# 1. 인증 설정 (JSON 키 파일 경로 또는 환경변수)
# Render 환경변수에 JSON 키의 내용을 통째로 넣거나 파일을 업로드해야 합니다.
os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = "your-service-account-key.json"

project_id = "your-project-id" # 내 GCP 프로젝트 ID
location = "us-central1"       # 서버 위치 (미국 중부)

vertexai.init(project=project_id, location=location)

@app.route('/api/saju', methods=['POST'])
def saju_api():
    try:
        model = GenerativeModel("gemini-1.5-flash") # 또는 gemini-2.0-flash-exp (2.5는 Vertex 지원 확인 필요)
        
        payload = request.json
        user_prompt = payload.get('messages', [{}])[0].get('content', '')

        # 세이프티 설정
        safety_config = [
            SafetySetting(category=SafetySetting.HarmCategory.HARM_CATEGORY_HARASSMENT, threshold=SafetySetting.HarmBlockThreshold.BLOCK_NONE),
            SafetySetting(category=SafetySetting.HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold=SafetySetting.HarmBlockThreshold.BLOCK_NONE),
        ]

        response = model.generate_content(
            user_prompt,
            safety_settings=safety_config
        )

        return jsonify({'content': [{'type': 'text', 'text': response.text}]})

    except Exception as e:
        return jsonify({'error': str(e)}), 500
