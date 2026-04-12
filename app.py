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

def looks_complete(text):
    """텍스트가 자연스럽게 끝났는지 판단"""
    t = (text or '').rstrip()
    if not t:
        return True
    # 문장 마무리 표현
    endings = ('다.', '요.', '야.', '어.', '네.', '죠.', '게.', '다!', '요!', '다?', '요?', '…', '👍')
    return any(t.endswith(e) for e in endings)

def smart_continuation(model, prev_text, gen_cfg):
    """
    무조건 2차 호출 — 모델이 스스로 완료 여부 판단
    완료면 [END], 미완료면 이어서 작성
    """
    last_ctx = prev_text[-300:].strip()
    cont_prompt = (
        f"방금 작성한 답변의 마지막 부분입니다:\n\"{last_ctx}\"\n\n"
        "위 답변이 자연스럽게 마무리됐으면 [END] 라고만 써주세요.\n"
        "마무리가 안 됐으면 끊긴 부분 다음부터 이어서 완성해주세요.\n"
        "이미 쓴 내용은 절대 반복하지 말고, 이어지는 내용만 작성하세요."
    )
    try:
        resp = model.generate_content(cont_prompt, generation_config=gen_cfg, safety_settings=SAFETY)
        chunk = (getattr(resp, 'text', '') or '').strip()
        print(f"[2차 호출] '{chunk[:50]}...' ({len(chunk)}자)")

        if chunk == '[END]' or chunk.startswith('[END]'):
            print("[2차] 완료 확인")
            return prev_text

        return prev_text + "\n" + chunk
    except Exception as e:
        print(f"[2차 호출 오류] {e}")
        return prev_text


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

        sys_prompt = (data.get('system', '') or '').strip()
        messages   = data.get('messages', [])
        mode       = data.get('mode', '')

        # 모드 설정
        # mode 없음 → 사주/운세/타로 (이어쓰기 없음, 태그 구조 보존)
        # mode='long' → 페르소나 채팅 (2차 호출로 이어쓰기)
        if mode == 'long':
            tokens = 2000
            do_continuation = True
        elif mode == 'normal':
            tokens = 2000
            do_continuation = False
        elif mode == 'short':
            tokens = 1200
            do_continuation = False
        else:
            # 사주/운세: 이어쓰기 절대 없음
            tokens = min(int(data.get('max_tokens', 8000)), 8000)
            do_continuation = False

        gen_cfg = {'temperature': 0.85, 'max_output_tokens': tokens}

        # system_instruction 길이 제한 (안전)
        sys_short = sys_prompt[:3500] if len(sys_prompt) > 3500 else sys_prompt

        try:
            model = GenerativeModel(
                'gemini-2.5-flash',
                system_instruction=sys_short if sys_short else None
            )
        except Exception as e:
            print(f"[모델 생성 오류] {e}")
            model = GenerativeModel('gemini-2.5-flash')

        if not messages:
            return jsonify({'content': [{'type': 'text', 'text': ''}]})

        last_msg     = messages[-1].get('content', '')
        history_msgs = messages[:-1]
        t_start = time.time()

        # 1차 생성
        if history_msgs:
            history = []
            for m in history_msgs:
                role = 'model' if m.get('role') == 'assistant' else 'user'
                history.append(Content(role=role, parts=[Part.from_text(m.get('content', ''))]))
            chat = model.start_chat(history=history)
            resp = chat.send_message(last_msg, generation_config=gen_cfg, safety_settings=SAFETY)
        else:
            resp = model.generate_content(last_msg, generation_config=gen_cfg, safety_settings=SAFETY)

        full_text = getattr(resp, 'text', '') or ''
        print(f"[1차] {len(full_text)}자, complete={looks_complete(full_text)}")

        # 2차 호출: mode='long'이고 자연스럽게 끝나지 않은 경우
        if do_continuation and not looks_complete(full_text):
            print("[2차 호출 시작]")
            full_text = smart_continuation(model, full_text, gen_cfg)

        elapsed = round(time.time() - t_start, 2)
        print(f"[DONE] {len(full_text)}자, {elapsed}s, mode='{mode or '기본'}'")

        return jsonify({'content': [{'type': 'text', 'text': full_text}]})

    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': {'message': str(e)}}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 10000)))
