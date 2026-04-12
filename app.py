import os, json, traceback, time, logging, sys
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import vertexai
from vertexai.generative_models import (
    GenerativeModel, GenerationConfig, SafetySetting,
    HarmCategory, HarmBlockThreshold, Content, Part
)
from google.oauth2 import service_account

logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s',
                    stream=sys.stdout, force=True)
log = logging.getLogger(__name__)

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
        log.info("Vertex AI 초기화 성공")
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

ENDINGS = ('다', '요', '야', '어', '네', '죠', '게', '.', '!', '?', '…')

def make_model(sys_prompt):
    # 자르지 않고 전체 전달 (Gemini 1M 컨텍스트 윈도우)
    sys_clean = (sys_prompt or '').strip()
    try:
        if sys_clean:
            return GenerativeModel('gemini-2.5-flash', system_instruction=sys_clean)
        return GenerativeModel('gemini-2.5-flash')
    except Exception as e:
        log.warning(f"system_instruction 실패: {e}")
        return GenerativeModel('gemini-2.5-flash')

def get_text(resp):
    return (getattr(resp, 'text', '') or '').rstrip()

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
        req_tokens = min(int(data.get('max_tokens', 8000)), 8000)

        log.info(f"요청: mode='{mode}', msgs={len(messages)}, sys={len(sys_prompt)}자")

        if not messages:
            return jsonify({'content': [{'type': 'text', 'text': ''}]})

        last_msg     = messages[-1].get('content', '')
        history_msgs = messages[:-1]
        t_start = time.time()
        model = make_model(sys_prompt)

        history = [
            Content(role='model' if m.get('role') == 'assistant' else 'user',
                    parts=[Part.from_text(m.get('content', ''))])
            for m in history_msgs
        ]

        # ══ 사주/운세: mode 없음 ══
        if not mode:
            cfg = GenerationConfig(temperature=0.85, max_output_tokens=req_tokens)
            if history:
                chat = model.start_chat(history=history)
                resp = chat.send_message(last_msg, generation_config=cfg, safety_settings=SAFETY)
            else:
                resp = model.generate_content(last_msg, generation_config=cfg, safety_settings=SAFETY)
            text = get_text(resp)
            log.info(f"사주/운세: {len(text)}자, {round(time.time()-t_start,1)}s")
            return jsonify({'content': [{'type': 'text', 'text': text}]})

        # ══ 페르소나: mode 있음 ══
        # GenerationConfig 객체 명시적 사용
        cfg1 = GenerationConfig(temperature=0.9, max_output_tokens=4000)
        cfg2 = GenerationConfig(temperature=0.9, max_output_tokens=2000)

        log.info(f"1단계 시작 (max_output_tokens=4000)")
        if history:
            chat = model.start_chat(history=history)
            resp1 = chat.send_message(last_msg, generation_config=cfg1, safety_settings=SAFETY)
        else:
            resp1 = model.generate_content(last_msg, generation_config=cfg1, safety_settings=SAFETY)

        text1 = get_text(resp1)
        log.info(f"1단계: {len(text1)}자, 끝='{text1[-20:] if text1 else ''}'")

        is_done     = any(text1.endswith(e) for e in ENDINGS)
        is_long     = len(text1) >= 400
        log.info(f"완료={is_done}, 충분={is_long}")

        if is_done and is_long:
            full_text = text1
        else:
            log.info("2단계 시작")
            last_ctx = text1[-300:].strip()
            cont = (
                f"앞서 작성한 답변의 마지막 부분:\n\"{last_ctx}\"\n\n"
                "위 내용 바로 다음 문장부터 이어서 작성해주세요.\n"
                "앞 내용 반복, 자기소개, 인사말 절대 금지.\n"
                "끊긴 부분 다음 내용만 이어서 마무리해주세요."
            )
            try:
                resp2 = model.generate_content(cont, generation_config=cfg2, safety_settings=SAFETY)
                text2 = (getattr(resp2, 'text', '') or '').strip()
                log.info(f"2단계: {len(text2)}자")
                full_text = (text1 + "\n\n" + text2) if text2 else text1
            except Exception as e:
                log.error(f"2단계 오류: {e}")
                full_text = text1

        elapsed = round(time.time() - t_start, 2)
        log.info(f"완료: {len(full_text)}자, {elapsed}s")
        return jsonify({'content': [{'type': 'text', 'text': full_text}]})

    except Exception as e:
        traceback.print_exc()
        log.error(f"오류: {e}")
        return jsonify({'error': {'message': str(e)}}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 10000)))
