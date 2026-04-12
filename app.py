import os, json, traceback, time
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import vertexai
from vertexai.generative_models import (
    GenerativeModel, SafetySetting, HarmCategory,
    HarmBlockThreshold, Content, Part
)
from google.oauth2 import service_account

app = Flask(__name__)
CORS(app)

PROJECT_ID = "uncannyai-492713"
GCP_KEY_JSON = os.environ.get("GCP_SERVICE_ACCOUNT_KEY")
LOCATION = "us-central1"

def init_vertex():
    if not GCP_KEY_JSON:
        return False, "GCP_SERVICE_ACCOUNT_KEY 없음"
    try:
        creds = service_account.Credentials.from_service_account_info(json.loads(GCP_KEY_JSON))
        vertexai.init(project=PROJECT_ID, location=LOCATION, credentials=creds)
        return True, "OK"
    except Exception as e:
        return False, str(e)

is_ready, init_msg = init_vertex()
DIR = os.path.dirname(os.path.abspath(__file__))

SAFETY = [
    SafetySetting(category=HarmCategory.HARM_CATEGORY_HARASSMENT,       threshold=HarmBlockThreshold.BLOCK_NONE),
    SafetySetting(category=HarmCategory.HARM_CATEGORY_HATE_SPEECH,       threshold=HarmBlockThreshold.BLOCK_NONE),
    SafetySetting(category=HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold=HarmBlockThreshold.BLOCK_NONE),
    SafetySetting(category=HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold=HarmBlockThreshold.BLOCK_NONE),
]

def check_max_tokens(response):
    """
    MAX_TOKENS로 잘렸는지 확인.
    finish_reason이 명확히 MAX_TOKENS(2)일 때만 True.
    불확실하면 False 반환 (반복 방지).
    """
    try:
        fr = response.candidates[0].finish_reason
        if hasattr(fr, 'name'):
            result = fr.name == 'MAX_TOKENS'
        elif hasattr(fr, 'value'):
            result = fr.value == 2
        else:
            result = int(fr) == 2
        print(f"[finish_reason] {fr} → MAX_TOKENS={result}")
        return result
    except Exception as e:
        print(f"[finish_reason 확인 실패, 이어쓰기 안 함] {e}")
        return False  # 불확실하면 이어쓰기 안 함


def run_continuation(model, prev_text, sys_prompt, gen_cfg, max_extra=2):
    """
    잘린 텍스트 이어쓰기.
    system_instruction 유지하여 자기소개 반복 방지.
    """
    # system이 있는 모델 재사용 (자기소개 반복 방지)
    cont_model = GenerativeModel(
        'gemini-2.5-flash',
        system_instruction=sys_prompt if sys_prompt else None
    )

    full = prev_text

    for i in range(max_extra):
        # 마지막 200자를 문맥으로 제공
        last_ctx = full[-200:].strip()
        cont_prompt = (
            "이전 답변이 글자 수 제한으로 중간에 끊겼습니다.\n"
            f"마지막으로 작성된 내용: \"{last_ctx}\"\n\n"
            "위 내용 바로 다음 문장부터 자연스럽게 이어서 작성해주세요.\n"
            "절대 인사말, 자기소개, 앞 내용 요약을 반복하지 마세요.\n"
            "오직 끊긴 부분 다음 내용만 이어서 마무리해주세요."
        )

        print(f"[이어쓰기 {i+1}] 생성 중...")
        resp = cont_model.generate_content(
            cont_prompt,
            generation_config=gen_cfg,
            safety_settings=SAFETY
        )
        chunk = getattr(resp, 'text', '') or ''
        print(f"[이어쓰기 {i+1}] {len(chunk)}자")

        if not chunk:
            break

        full += "\n" + chunk

        if not check_max_tokens(resp):
            print("[이어쓰기 완료] 정상 종료")
            break

    return full


@app.route('/')
def index():
    files = [f for f in os.listdir(DIR) if f.endswith('.html')]
    return send_from_directory(DIR, files[0]) if files else ("No HTML", 404)


@app.route('/api/saju', methods=['POST'])
def saju_api():
    if not is_ready:
        return jsonify({'error': init_msg}), 500

    try:
        data = request.json or {}

        if data.get('ping'):
            return jsonify({'content': [{'type': 'text', 'text': 'pong'}]})

        sys_prompt = data.get('system', '')
        messages   = data.get('messages', [])
        mode       = data.get('mode', 'normal')

        # 모드별 per_segment 토큰 / 최대 이어쓰기 횟수
        MODES = {
            'short':  {'tokens': 1500, 'extra': 0},
            'normal': {'tokens': 3000, 'extra': 1},
            'long':   {'tokens': 3000, 'extra': 2},
        }
        cfg = MODES.get(mode, MODES['normal'])

        gen_cfg = {
            'temperature': 0.85,
            'max_output_tokens': cfg['tokens'],
        }

        model = GenerativeModel(
            'gemini-2.5-flash',
            system_instruction=sys_prompt or None
        )

        if not messages:
            return jsonify({'content': [{'type': 'text', 'text': ''}]})

        last_msg     = messages[-1].get('content', '')
        history_msgs = messages[:-1]
        t_start = time.time()

        if history_msgs:
            history = []
            for m in history_msgs:
                role = 'model' if m.get('role') == 'assistant' else 'user'
                history.append(Content(role=role, parts=[Part.from_text(m.get('content', ''))]))

            chat = model.start_chat(history=history)
            resp = chat.send_message(last_msg, generation_config=gen_cfg, safety_settings=SAFETY)
            full_text = getattr(resp, 'text', '') or ''
            print(f"[chat] {len(full_text)}자")

            # 명확히 MAX_TOKENS로 잘린 경우만 이어쓰기
            if check_max_tokens(resp) and cfg['extra'] > 0:
                full_text = run_continuation(model, full_text, sys_prompt, gen_cfg, cfg['extra'])
        else:
            # 히스토리 없음
            resp = model.generate_content(last_msg, generation_config=gen_cfg, safety_settings=SAFETY)
            full_text = getattr(resp, 'text', '') or ''
            print(f"[direct] {len(full_text)}자")

            if check_max_tokens(resp) and cfg['extra'] > 0:
                full_text = run_continuation(model, full_text, sys_prompt, gen_cfg, cfg['extra'])

        elapsed = round(time.time() - t_start, 2)
        print(f"[DONE] 총 {len(full_text)}자, {elapsed}s")

        return jsonify({'content': [{'type': 'text', 'text': full_text}]})

    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': {'message': str(e)}}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 10000)))
