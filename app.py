import os, json, traceback, time
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import vertexai
from vertexai.generative_models import (
    GenerativeModel, SafetySetting, HarmCategory,
    HarmBlockThreshold, Content, Part, FinishReason
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

def was_cut(response):
    """MAX_TOKENS로 잘렸는지 확인 - 여러 방법으로 체크"""
    try:
        fr = response.candidates[0].finish_reason
        # FinishReason enum 또는 int 모두 처리
        if hasattr(fr, 'name'):
            cut = fr.name == 'MAX_TOKENS'
        else:
            cut = int(fr) == 2
        print(f"[finish_reason] {fr} → cut={cut}")
        return cut
    except Exception as e:
        print(f"[finish_reason 확인 실패] {e}")
        # 폴백: 텍스트 끝 문자로 판단
        text = (getattr(response, 'text', '') or '').rstrip()
        if not text:
            return False
        ends = ('다', '요', '야', '어', '네', '죠', '게', '.', '!', '?', '…', '👍', '다.')
        result = not any(text.endswith(e) for e in ends)
        print(f"[폴백 판단] 마지막 10자: '{text[-10:]}' → cut={result}")
        return result

def run_with_continuation(model, first_prompt, sys_prompt, gen_cfg, max_segs=3):
    """
    자동 이어쓰기 핵심 함수
    - 첫 번째 생성 후 잘렸으면 자동으로 이어쓰기
    - 최대 max_segs번 반복
    """
    full = ""
    prompt = first_prompt

    for seg in range(max_segs):
        print(f"\n[seg {seg+1}/{max_segs}] 생성 시작...")
        t0 = time.time()

        resp = model.generate_content(
            prompt,
            generation_config=gen_cfg,
            safety_settings=SAFETY
        )

        chunk = getattr(resp, 'text', '') or ''
        full += chunk
        elapsed = round(time.time() - t0, 1)
        print(f"[seg {seg+1}] {len(chunk)}자 생성, {elapsed}s, 누적 {len(full)}자")

        if not was_cut(resp):
            print(f"[완료] 정상 종료 (seg {seg+1})")
            break

        if seg < max_segs - 1:
            print(f"[이어쓰기] seg {seg+1} 잘림 → 다음 세그먼트")
            last_ctx = full[-300:] if len(full) > 300 else full
            prompt = (
                f"방금 작성 중이던 답변의 마지막 부분입니다:\n\"{last_ctx}\"\n\n"
                "위 내용 다음부터 자연스럽게 이어서 계속 작성해줘. "
                "이미 쓴 내용은 절대 반복하지 말고, "
                "문단 구조를 유지하면서 결론까지 완성해줘."
            )

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

        # 핑
        if data.get('ping'):
            return jsonify({'content': [{'type': 'text', 'text': 'pong'}]})

        sys_prompt = data.get('system', '')
        messages   = data.get('messages', [])
        mode       = data.get('mode', 'normal')  # short / normal / long

        # 모드별 설정
        MODES = {
            'short':  {'per_seg': 1000, 'segs': 1},
            'normal': {'per_seg': 2000, 'segs': 2},
            'long':   {'per_seg': 2000, 'segs': 3},
        }
        cfg = MODES.get(mode, MODES['normal'])

        gen_cfg = {
            'temperature': 0.85,
            'max_output_tokens': cfg['per_seg'],
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
            # 히스토리 있을 때: chat 사용 후 잘리면 이어쓰기
            history = []
            for m in history_msgs:
                role = 'model' if m.get('role') == 'assistant' else 'user'
                history.append(Content(role=role, parts=[Part.from_text(m.get('content',''))]))

            chat = model.start_chat(history=history)
            resp = chat.send_message(last_msg, generation_config=gen_cfg, safety_settings=SAFETY)
            full_text = getattr(resp, 'text', '') or ''
            print(f"[chat] {len(full_text)}자")

            # 잘렸으면 이어쓰기 (히스토리 없이 standalone 호출)
            if was_cut(resp) and cfg['segs'] > 1:
                last_ctx = full_text[-300:] if len(full_text) > 300 else full_text
                cont_prompt = (
                    f"방금 작성 중이던 답변의 마지막 부분:\n\"{last_ctx}\"\n\n"
                    "위 내용 다음부터 자연스럽게 이어서 계속 작성해줘. "
                    "이미 쓴 내용 반복 금지. 결론까지 완성해줘."
                )
                extra = run_with_continuation(model, cont_prompt, sys_prompt, gen_cfg, cfg['segs'] - 1)
                full_text += extra
        else:
            # 히스토리 없음: 자동 이어쓰기 풀 지원
            full_text = run_with_continuation(model, last_msg, sys_prompt, gen_cfg, cfg['segs'])

        total_t = round(time.time() - t_start, 2)
        print(f"\n[DONE] 총 {len(full_text)}자, {total_t}s")

        return jsonify({'content': [{'type': 'text', 'text': full_text}]})

    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': {'message': str(e)}}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 10000)))
