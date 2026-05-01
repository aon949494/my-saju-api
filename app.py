import os, json, traceback, time, logging, sys, math
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

ENDINGS = ('다', '요', '야', '어', '네', '죠', '게', '.', '!', '?', '…',
           '?**', '.**', '!**', '요**', '다**', '어**', '네**', '?**"', '.**"')

def make_model(sys_prompt, use_pro=False):
    sys_clean = (sys_prompt or '').strip()
    model_name = 'gemini-2.5-pro' if use_pro else 'gemini-2.5-flash'
    try:
        if sys_clean:
            return GenerativeModel(model_name, system_instruction=sys_clean)
        return GenerativeModel(model_name)
    except Exception as e:
        log.warning(f"system_instruction 실패: {e}")
        return GenerativeModel(model_name)

def get_text(resp):
    return (getattr(resp, 'text', '') or '').rstrip()

# ════════════════════════════════════════════════════════════
#   사주 계산 알고리즘 (보안상 백엔드에서 처리)
# ════════════════════════════════════════════════════════════

GAN    = ['갑','을','병','정','무','기','경','신','임','계']
JI     = ['자','축','인','묘','진','사','오','미','신','유','술','해']
GAN_HJ = ['甲','乙','丙','丁','戊','己','庚','辛','壬','癸']
JI_HJ  = ['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥']

OHAENG_GAN = [0,0,1,1,2,2,3,3,4,4]  # 목목화화토토금금수수
OHAENG_JI  = [4,2,0,0,2,1,1,2,3,3,2,4]
OHAENG_MAP = ['목','화','토','금','수']

# 절기: [이름, 황경, 대략적월, 일간지월번호, 연간지월번호]
JGD = [
    ['소한',285,1,1,12],['입춘',315,2,2,1],['경칩',345,3,3,2],
    ['청명',15,4,4,3],['입하',45,5,5,4],['망종',75,6,6,5],
    ['소서',105,7,7,6],['입추',135,8,8,7],['백로',165,9,9,8],
    ['한로',195,10,10,9],['입동',225,11,11,10],['대설',255,12,0,11]
]

TERM24 = [
    [285,1],[300,1],[315,2],[330,2],[345,3],[0,3],[15,4],[30,4],
    [45,5],[60,5],[75,6],[90,6],[105,7],[120,7],[135,8],[150,8],
    [165,9],[180,9],[195,10],[210,10],[225,11],[240,11],[255,12],[270,12]
]

def _jd(y, m, d, h=12):
    if m <= 2: y -= 1; m += 12
    A = int(y/100); B = 2 - A + int(A/4)
    return int(365.25*(y+4716)) + int(30.6001*(m+1)) + d + B - 1524.5 + h/24

def _slon(j):
    T = (j-2451545)/36525
    L0 = (280.46646 + 36000.76983*T + 0.0003032*T*T) % 360
    M  = math.radians((357.52911 + 35999.05029*T - 0.0001537*T*T) % 360)
    C  = (1.914602 - 0.004817*T - 0.000014*T*T)*math.sin(M) + \
         (0.019993 - 0.000101*T)*math.sin(2*M) + 0.000289*math.sin(3*M)
    omega = math.radians(125.04 - 1934.136*T)
    return (L0 + C - 0.00569 - 0.00478*math.sin(omega)) % 360

def _fjd(y, lon, am):
    j0 = _jd(y, am, 1)
    lo, hi = j0-20, j0+20
    for _ in range(50):
        mid = (lo+hi)/2
        diff = (_slon(mid)-lon+180) % 360 - 180
        if abs(diff) < 0.0001: break
        sl0 = (_slon(lo)-lon+180) % 360 - 180
        if sl0 * diff <= 0: hi = mid
        else: lo = mid
    return (lo+hi)/2

def _pillar(idx60):
    g = GAN[idx60 % 10]; j = JI[idx60 % 12]
    gh = GAN_HJ[idx60 % 10]; jh = JI_HJ[idx60 % 12]
    return g+j, gh+jh

def _year_pillar(y):
    return _pillar((y-4) % 60)

def _month_pillar(y, m, d, h):
    bjd = _jd(y, m, d, h-9)
    pool = []
    for yr in [y-1, y, y+1]:
        for e in JGD:
            pool.append([_fjd(yr, e[1], e[2]), e[3], e[4]])
    pool.sort(key=lambda x: x[0])
    best = pool[0]
    for p in pool:
        if p[0] <= bjd: best = p
        else: break
    mn = best[2]  # 월 번호 (1~12)
    yg = (y-4) % 10
    base = (yg % 5) * 2
    mg = (base + mn - 1) % 10
    mj = (mn + 1) % 12
    return GAN[mg]+JI[mj], GAN_HJ[mg]+JI_HJ[mj]

def _day_pillar(y, m, d):
    idx = int(_jd(y, m, d, 12) - 2415021 + 40) % 60
    return _pillar(idx)

def _hour_pillar(day_gan_idx, h):
    ji_idx = ((h+1)//2) % 12
    gan_idx = (day_gan_idx % 5 * 2 + ji_idx) % 10
    return GAN[gan_idx]+JI[ji_idx], GAN_HJ[gan_idx]+JI_HJ[ji_idx]

def _daewun_num(y, m, d, h, is_male):
    bjd = _jd(y, m, d, h-9)
    is_yang = (y % 2 == 1)
    fwd = (is_male and is_yang) or (not is_male and not is_yang)
    min_diff = 99999
    for dy in [-1, 0, 1]:
        for lon, mo in TERM24:
            try:
                t = _fjd(y+dy, lon, mo)
                diff = (t - bjd) if fwd else (bjd - t)
                if 0.1 < diff < min_diff:
                    min_diff = diff
            except: pass
    return max(1, min(9, round(min_diff/3))) if min_diff < 99999 else 3

def _l2g(lunar_y, lunar_m, lunar_d, leap=False):
    """음력→양력 (간략 버전, 정밀도 ±1일)"""
    # 실제 변환은 복잡하므로 근사값 사용
    # 정확한 변환은 만세력 DB 필요 — 현재 JS와 동일 로직 유지
    pass

def calc_saju(year, month, day, hour, is_male):
    """사주팔자 계산 메인 함수"""
    y, m, d = int(year), int(month), int(day)
    h = 12 if hour == 99 else int(hour)

    yp, yp_hj = _year_pillar(y)
    mp, mp_hj = _month_pillar(y, m, d, h)
    dp, dp_hj = _day_pillar(y, m, d)

    day_gan_idx = GAN.index(dp[0]) if dp[0] in GAN else 0
    if hour == 99:
        hp, hp_hj = '--', '--'
    else:
        hp, hp_hj = _hour_pillar(day_gan_idx, h)

    dw_num = _daewun_num(y, m, d, h, is_male)

    # 오행 분포
    pillars = [yp, mp, dp] + ([hp] if hour != 99 else [])
    ohaeng = {'목':0,'화':0,'토':0,'금':0,'수':0}
    for p in pillars:
        if len(p) >= 1 and p[0] in GAN:
            ohaeng[OHAENG_MAP[OHAENG_GAN[GAN.index(p[0])]]] += 1
        if len(p) >= 2 and p[1] in JI:
            ohaeng[OHAENG_MAP[OHAENG_JI[JI.index(p[1])]]] += 1

    # 대운 계열
    base_idx = (y-4) % 60
    daewuns = []
    for i in range(8):
        dw_age = dw_num + i*10
        dw_idx = (base_idx + (1 if is_male else -1) * (i+1)) % 60
        dw_k, dw_hj = _pillar(dw_idx)
        daewuns.append({'age': dw_age, 'pillar': dw_k, 'pillar_hj': dw_hj})

    return {
        'year_pillar':    yp,  'year_pillar_hj':    yp_hj,
        'month_pillar':   mp,  'month_pillar_hj':   mp_hj,
        'day_pillar':     dp,  'day_pillar_hj':     dp_hj,
        'hour_pillar':    hp,  'hour_pillar_hj':    hp_hj,
        'daewun_start':   dw_num,
        'daewuns':        daewuns,
        'ohaeng':         ohaeng,
        'il_gan':         dp[0] if dp else '',
        'il_ji':          dp[1] if len(dp) > 1 else '',
    }

# ════════════════════════════════════════════════════════════
#   라우트
# ════════════════════════════════════════════════════════════

@app.route('/')
def index():
    return send_from_directory(DIR, 'index.html')

@app.route('/<path:filename>')
def static_files(filename):
    """JS, CSS 등 정적 파일 서빙"""
    return send_from_directory(DIR, filename)

@app.route('/api/calc', methods=['POST'])
def calc_api():
    """사주 계산 전용 엔드포인트 (알고리즘 보호)"""
    try:
        data = request.json or {}
        year   = data.get('year')
        month  = data.get('month')
        day    = data.get('day')
        hour   = data.get('hour', 99)
        is_male = data.get('is_male', False)

        if not all([year, month, day]):
            return jsonify({'error': '필수 파라미터 없음'}), 400

        result = calc_saju(year, month, day, hour, is_male)
        log.info(f"사주 계산: {year}/{month}/{day} {'남' if is_male else '여'} → {result['day_pillar']}")
        return jsonify(result)

    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

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
        req_model_str = data.get('model', 'gemini')
        use_pro = req_model_str == 'gemini-pro'
        model = make_model(sys_prompt, use_pro=use_pro)
        log.info(f"모델: {'gemini-2.5-pro' if use_pro else 'gemini-2.5-flash'}")

        history = [
            Content(role='model' if m.get('role') == 'assistant' else 'user',
                    parts=[Part.from_text(m.get('content', ''))])
            for m in history_msgs
        ]

        if not mode:
            cfg = GenerationConfig(temperature=0.85, max_output_tokens=req_tokens)
            if history:
                chat = model.start_chat(history=history)
                resp = chat.send_message(last_msg, generation_config=cfg, safety_settings=SAFETY)
            else:
                resp = model.generate_content(last_msg, generation_config=cfg, safety_settings=SAFETY)
            text = get_text(resp)
            log.info(f"완료: {len(text)}자, {round(time.time()-t_start,1)}s")
            return jsonify({'content': [{'type': 'text', 'text': text}]})

        cfg1 = GenerationConfig(temperature=0.9, max_output_tokens=4000)
        cfg2 = GenerationConfig(temperature=0.9, max_output_tokens=2000)

        if history:
            chat = model.start_chat(history=history)
            resp1 = chat.send_message(last_msg, generation_config=cfg1, safety_settings=SAFETY)
        else:
            resp1 = model.generate_content(last_msg, generation_config=cfg1, safety_settings=SAFETY)

        text1 = get_text(resp1)
        is_done = any(text1.endswith(e) for e in ENDINGS)
        is_long = len(text1) >= 400

        if is_done and is_long:
            full_text = text1
        else:
            cont = (
                f"앞서 작성한 답변의 마지막 부분:\n\"{text1[-300:].strip()}\"\n\n"
                "위 내용 바로 다음 문장부터 이어서 작성해주세요.\n"
                "앞 내용 반복, 자기소개, 인사말 절대 금지.\n"
                "끊긴 부분 다음 내용만 이어서 마무리해주세요."
            )
            try:
                resp2 = model.generate_content(cont, generation_config=cfg2, safety_settings=SAFETY)
                text2 = (getattr(resp2, 'text', '') or '').strip()
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
