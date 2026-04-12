import os
import json
import traceback
import time
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

import vertexai
from vertexai.generative_models import (
    GenerativeModel, SafetySetting, HarmCategory, HarmBlockThreshold,
    Content, Part
)
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
        return False, "GCP_SERVICE_ACCOUNT_KEY가 설정되지 않았습니다."
    try:
        key_dict = json.loads(GCP_KEY_JSON)
        credentials = service_account.Credentials.from_service_account_info(key_dict)
        vertexai.init(project=PROJECT_ID, location=LOCATION, credentials=credentials)
        return True, "성공"
    except Exception as e:
        return False, f"GCP 인증 오류: {str(e)}"

is_ready, init_msg = init_vertex()
DIR = os.path.dirname(os.path.abspath(__file__))

SAFETY_SETTINGS = [
    SafetySetting(category=HarmCategory.HARM_CATEGORY_HARASSMENT,       threshold=HarmBlockThreshold.BLOCK_NONE),
    SafetySetting(category=HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold=HarmBlockThreshold.BLOCK_NONE),
    SafetySetting(category=HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold=HarmBlockThreshold.BLOCK_NONE),
    SafetySetting(category=HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold=HarmBlockThreshold.BLOCK_NONE),
]

def is_truncated(response):
    """MAX_TOKENS로 잘렸는지 확인"""
    try:
        reason = response.candidates[0].finish_reason
        reason_val = reason.value if hasattr(reason, 'value') else int(reason)
        return reason_val == 2  # MAX_TOKENS
    except Exception:
        text = getattr(response, 'text', '') or ''
        if not text:
            return False
        last = text.rstrip()
        ENDINGS = ('.', '!', '?', '요', '다', '야', '어', '네', '게', '죠', '…', '👍')
        return not any(last.endswith(e) for e in ENDINGS)

def generate_with_continuation(model, prompt, gen_config, max_segments=3):
    """자동 이어쓰기 포함 생성 (최대 max_segments번)"""
    full_text = ""
    current_prompt = prompt
    seg_config = dict(gen_config)

    for i in range(max_segments):
        try:
            response = model.generate_content(
                current_prompt,
                generation_config=seg_config,
                safety_settings=SAFETY_SETTINGS
            )
            text = getattr(response, 'text', '') or ''
            full_text += text
            print(f"[seg {i+1}] {len(text)}자 / 누적 {len(full_text)}자")

            if not is_truncated(response):
                print(f"[완료] 정상 종료")
                break

            if i < max_segments - 1:
                print(f"[이어쓰기] {i+1}번째 잘림 → 계속")
                last_ctx = full_text[-200:] if len(full_text) > 200 else full_text
                current_prompt = (
                    f"방금 작성 중이던 답변의 마지막 부분:\n\"{last_ctx}\"\n\n"
                    "위 내용에 이어서 자연스럽게 계속 작성해줘. "
                    "이미 쓴 내용은 절대 반복하지 말고, 문단 흐름을 유지하면서 "
                    "끝맺음까지 완성해줘."
                )
        except Exception as e:
            print(f"[오류] seg {i+1}: {e}")
            if not full_text:
                raise
            break

    return full_text


@app.route('/')
def index():
    html_files = [f for f in os.listdir(DIR) if f.endswith('.html')]
    return send_from_directory(DIR, html_files[0]) if html_files else ("No HTML", 404)


@app.route('/api/saju', methods=['POST'])
def saju_api():
    if not is_ready:
        return jsonify({'error': {'message': '서버 설정 오류', 'details': init_msg}}), 500

    try:
        payload = request.json or {}

        if payload.get('ping'):
            return jsonify({'content': [{'type': 'text', 'text': 'pong'}]})

        system_prompt = payload.get('system', '')
        messages      = payload.get('messages', [])
        max_tokens    = max(int(payload.get('max_tokens', 6000)), 1500)
        mode          = payload.get('mode', 'normal')

        # 모드별 설정
        modes = {
            'short':  {'per_seg': 800,  'segs': 1},
            'normal': {'per_seg': 2000, 'segs': 2},
            'long':   {'per_seg': 2000, 'segs': 3},
        }
        cfg = modes.get(mode, modes['normal'])
        gen_config = {
            'temperature': 0.85,
            'max_output_tokens': min(max_tokens, cfg['per_seg']),
        }
        max_segs = cfg['segs']

        # 모델
        model = GenerativeModel(
            "gemini-2.5-flash",
            system_instruction=system_prompt if system_prompt else None
        )

        if not messages:
            return jsonify({'content': [{'type': 'text', 'text': ''}]})

        last_content  = messages[-1].get('content', '')
        history_msgs  = messages[:-1]
        start = time.time()

        if history_msgs:
            # 히스토리 있을 때
            history = []
            for msg in history_msgs:
                role = 'model' if msg.get('role') == 'assistant' else 'user'
                history.append(Content(role=role, parts=[Part.from_text(msg.get('content', ''))]))

            chat = model.start_chat(history=history)
            response = chat.send_message(
                last_content,
                generation_config=gen_config,
                safety_settings=SAFETY_SETTINGS
            )
            full_text = getattr(response, 'text', '') or ''

            # 잘렸으면 이어쓰기
            if is_truncated(response) and max_segs > 1:
                last_ctx = full_text[-200:] if len(full_text) > 200 else full_text
                cont_prompt = (
                    f"방금 작성 중이던 답변의 마지막 부분:\n\"{last_ctx}\"\n\n"
                    "이어서 자연스럽게 계속 작성해줘. 반복 금지. 끝맺음까지."
                )
                full_text += generate_with_continuation(model, cont_prompt, gen_config, max_segs - 1)
        else:
            # 히스토리 없음: 풀 자동 이어쓰기
            full_text = generate_with_continuation(model, last_content, gen_config, max_segs)

        elapsed = round(time.time() - start, 2)
        print(f"[DONE] {len(full_text)}자, {elapsed}s")

        return jsonify({
            'content': [{'type': 'text', 'text': full_text}],
            'meta': {'length': len(full_text), 'elapsed': elapsed}
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': {'message': 'Vertex AI 호출 중 에러', 'details': str(e)}}), 500


if __name__ == '__main__':
    port = int(os.environ.get("PORT", 10000))
    app.run(host='0.0.0.0', port=port)
