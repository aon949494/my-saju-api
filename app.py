import os
import json
import traceback
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

import vertexai
from vertexai.generative_models import GenerativeModel, SafetySetting, HarmCategory, HarmBlockThreshold, Content, Part
from google.oauth2 import service_account

app = Flask(__name__)
CORS(app)

PROJECT_ID = "uncannyai-492713"
GCP_KEY_JSON = os.environ.get("GCP_SERVICE_ACCOUNT_KEY")
LOCATION = "us-central1"

def init_vertex():
    if not PROJECT_ID:
        return False, "PROJECT_ID가 없습니다."
    if not GCP_KEY_JSON:
        return False, "Render 환경변수에 GCP_SERVICE_ACCOUNT_KEY가 설정되지 않았습니다."
    try:
        key_dict = json.loads(GCP_KEY_JSON)
        credentials = service_account.Credentials.from_service_account_info(key_dict)
        vertexai.init(project=PROJECT_ID, location=LOCATION, credentials=credentials)
        return True, "성공"
    except Exception as e:
        return False, f"GCP 인증 오류: {str(e)}"

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
        system_prompt = payload.get('system', '')
        messages = payload.get('messages', [])
        max_tokens = payload.get('max_tokens', 8000)

        safety_settings = [
            SafetySetting(category=HarmCategory.HARM_CATEGORY_HARASSMENT, threshold=HarmBlockThreshold.BLOCK_NONE),
            SafetySetting(category=HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold=HarmBlockThreshold.BLOCK_NONE),
            SafetySetting(category=HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold=HarmBlockThreshold.BLOCK_NONE),
            SafetySetting(category=HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold=HarmBlockThreshold.BLOCK_NONE),
        ]

        # system_instruction 지원 여부에 따라 분기
        if system_prompt:
            model = GenerativeModel(
                "gemini-2.5-flash",
                system_instruction=system_prompt
            )
        else:
            model = GenerativeModel("gemini-2.5-flash")

        # messages 배열 → Vertex AI Content 형식으로 변환
        # role: user/assistant → user/model
        if messages:
            history = []
            for i, msg in enumerate(messages[:-1]):  # 마지막 제외한 히스토리
                role = "model" if msg.get("role") == "assistant" else "user"
                history.append(Content(role=role, parts=[Part.from_text(msg.get("content", ""))]))

            last_msg = messages[-1].get("content", "")

            if history:
                chat = model.start_chat(history=history)
                response = chat.send_message(
                    last_msg,
                    generation_config={"temperature": 0.7, "max_output_tokens": max_tokens},
                    safety_settings=safety_settings
                )
            else:
                response = model.generate_content(
                    last_msg,
                    generation_config={"temperature": 0.7, "max_output_tokens": max_tokens},
                    safety_settings=safety_settings
                )
        else:
            response = model.generate_content(
                "안녕하세요",
                generation_config={"temperature": 0.7, "max_output_tokens": max_tokens},
                safety_settings=safety_settings
            )

        return jsonify({'content': [{'type': 'text', 'text': response.text}]})

    except Exception as e:
        traceback.print_exc()
        return jsonify({
            'error': {
                'message': 'Vertex AI 호출 중 에러',
                'details': str(e)
            }
        }), 500

if __name__ == '__main__':
    port = int(os.environ.get("PORT", 10000))
    app.run(host='0.0.0.0', port=port)
