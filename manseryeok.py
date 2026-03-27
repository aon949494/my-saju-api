# encoding: utf-8
"""
만세력(萬歲曆) 계산기
────────────────────────────────────────────────────────────────
생년월일시(KST)를 입력받아 사주팔자(년주·월주·일주·시주)를 출력합니다.

핵심 특징
  • 태양 황경(Jean Meeus 알고리즘)으로 절기 일시를 분·초 단위로 계산
  • 년주: 입춘(立春, 황경 315°) 이전 출생은 전년도 기준
  • 월주: 12절기 실제 입절 시각 기준 (근사값 아님)
  • 일주: 검증된 오프셋 기반 갑자일 순환 (2024-01-01 壬子 기준)
  • 시주: 자시법 적용 – 23:00 이후는 다음날 일주 기준 자시(子時)
  • 외부 라이브러리 불필요 (순수 표준 라이브러리 + math)
"""

import math
from datetime import datetime, timedelta


# ══════════════════════════════════════════════════════════════
# 기본 데이터
# ══════════════════════════════════════════════════════════════

CHEONGAN    = ['갑', '을', '병', '정', '무', '기', '경', '신', '임', '계']
CHEONGAN_HJ = ['甲', '乙', '丙', '丁', '戊', '己', '庚', '辛', '壬', '癸']

JIJI        = ['자', '축', '인', '묘', '진', '사', '오', '미', '신', '유', '술', '해']
JIJI_HJ     = ['子', '丑', '寅', '卯', '辰', '巳', '午', '未', '申', '酉', '戌', '亥']

ANIMALS     = ['쥐', '소', '호랑이', '토끼', '용', '뱀', '말', '양', '원숭이', '닭', '개', '돼지']

# 천간 오행·음양
OHAENG_CG   = ['목', '목', '화', '화', '토', '토', '금', '금', '수', '수']
UMYANG_CG   = ['양', '음', '양', '음', '양', '음', '양', '음', '양', '음']

# 지지 오행·음양
OHAENG_JJ   = ['수', '토', '목', '목', '토', '화', '화', '토', '금', '금', '토', '수']
UMYANG_JJ   = ['양', '음', '양', '음', '양', '음', '양', '음', '양', '음', '양', '음']

# 절기: (이름, 태양황경°, 대략입절월, 월지 branch, 사주월번호 1~12)
#   월지 branch : 자=0 축=1 인=2 묘=3 진=4 사=5 오=6 미=7 신=8 유=9 술=10 해=11
JEOLGI = [
    ('소한', 285,  1,  1, 12),   # 축월(丑月) 시작
    ('입춘', 315,  2,  2,  1),   # 인월(寅月) 시작  ← 년주 경계
    ('경칩', 345,  3,  3,  2),   # 묘월(卯月) 시작
    ('청명',  15,  4,  4,  3),   # 진월(辰月) 시작
    ('입하',  45,  5,  5,  4),   # 사월(巳月) 시작
    ('망종',  75,  6,  6,  5),   # 오월(午月) 시작
    ('소서', 105,  7,  7,  6),   # 미월(未月) 시작
    ('입추', 135,  8,  8,  7),   # 신월(申月) 시작
    ('백로', 165,  9,  9,  8),   # 유월(酉月) 시작
    ('한로', 195, 10, 10,  9),   # 술월(戌月) 시작
    ('입동', 225, 11, 11, 10),   # 해월(亥月) 시작
    ('대설', 255, 12,  0, 11),   # 자월(子月) 시작
]


# ══════════════════════════════════════════════════════════════
# 천문 계산
# ══════════════════════════════════════════════════════════════

def julian_day(year: int, month: int, day: int, hour: float = 12.0) -> float:
    """율리우스 적일(JD) 계산"""
    if month <= 2:
        year  -= 1
        month += 12
    A = year // 100
    B = 2 - A + A // 4
    return (int(365.25 * (year + 4716))
            + int(30.6001 * (month + 1))
            + day + B - 1524.5
            + hour / 24.0)


def solar_longitude(jd_val: float) -> float:
    """태양의 겉보기 황경(°) 계산 – Jean Meeus 『Astronomical Algorithms』"""
    T   = (jd_val - 2451545.0) / 36525.0
    L0  = (280.46646 + 36000.76983 * T + 0.0003032 * T**2) % 360.0
    M   = math.radians((357.52911 + 35999.05029 * T - 0.0001537 * T**2) % 360.0)
    C   = ((1.914602 - 0.004817 * T - 0.000014 * T**2) * math.sin(M)
           + (0.019993 - 0.000101 * T) * math.sin(2 * M)
           + 0.000289 * math.sin(3 * M))
    omega = math.radians(125.04 - 1934.136 * T)
    return (L0 + C - 0.00569 - 0.00478 * math.sin(omega)) % 360.0


def find_jeolgi_jd(year: int, target_lon: float, approx_month: int) -> float:
    """
    이분법(50회 반복)으로 목표 태양황경(target_lon)에 해당하는 JD를 계산.
    검색 범위: approx_month 1일 기준 ±20일
    """
    jd0 = julian_day(year, approx_month, 1)
    lo, hi = jd0 - 20.0, jd0 + 20.0

    def delta(v: float) -> float:
        d = solar_longitude(v) - target_lon
        if   d >  180: d -= 360
        elif d < -180: d += 360
        return d

    for _ in range(50):
        mid = (lo + hi) / 2.0
        if delta(lo) * delta(mid) <= 0:
            hi = mid
        else:
            lo = mid
    return (lo + hi) / 2.0


# ══════════════════════════════════════════════════════════════
# 사주팔자 계산
# ══════════════════════════════════════════════════════════════

def _month_pillar(birth_jd: float, birth_year: int):
    """
    월주 계산: 출생 JD가 속하는 절기 구간을 탐색.
    전년·당년·내년 절기를 모두 계산한 뒤 정렬 → 이진 탐색.

    Returns
    -------
    (jeolgi_name, month_branch, month_num)
    """
    pool = []
    for y in (birth_year - 1, birth_year, birth_year + 1):
        for name, lon, approx_m, branch, mnum in JEOLGI:
            pool.append((find_jeolgi_jd(y, lon, approx_m), name, branch, mnum))
    pool.sort()

    best = pool[0]
    for entry in pool:
        if entry[0] <= birth_jd:
            best = entry
        else:
            break
    _, name, branch, mnum = best
    return name, branch, mnum


def calc_manseryeok(year: int, month: int, day: int,
                    hour: int, minute: int = 0) -> dict:
    """
    사주팔자 계산 (KST 입력 기준)

    Parameters
    ----------
    year, month, day : int   생년월일 (양력)
    hour             : int   시(0-23, 24시간제)
    minute           : int   분(0-59)

    Returns
    -------
    dict  각 주의 천간/지지 인덱스 및 부가 정보
    """
    # ── KST → UTC 변환 (절기 계산은 UTC 기준) ──────────────────
    dt_kst  = datetime(year, month, day, hour, minute)
    dt_utc  = dt_kst - timedelta(hours=9)
    birth_jd = julian_day(dt_utc.year, dt_utc.month, dt_utc.day,
                          dt_utc.hour + dt_utc.minute / 60.0)

    # ── 년주(年柱) ─────────────────────────────────────────────
    # 입춘(立春, 황경 315°) 이전 출생 → 전년도 기준
    ipchun_jd = find_jeolgi_jd(year, 315, 2)
    saju_year = year if birth_jd >= ipchun_jd else year - 1
    y_stem    = (saju_year - 4) % 10
    y_branch  = (saju_year - 4) % 12

    # ── 월주(月柱) ─────────────────────────────────────────────
    jeolgi_name, m_branch, m_num = _month_pillar(birth_jd, year)
    # 년간(年干)별 인월(寅月) 천간 시작점
    #   갑·기=丙(2)  을·경=戊(4)  병·신=庚(6)  정·임=壬(8)  무·계=甲(0)
    m_stem_start = (y_stem % 5 * 2 + 2) % 10
    m_stem       = (m_stem_start + m_num - 1) % 10

    # ── 일주(日柱) ─────────────────────────────────────────────
    # 자시법(子時法): 23:00 이후 → 다음날 일주 기준
    local_dt = datetime(year, month, day, hour, minute)
    day_dt   = local_dt + timedelta(days=1) if hour >= 23 else local_dt
    day_jd   = julian_day(day_dt.year, day_dt.month, day_dt.day, 12.0)
    day_num  = int(day_jd + 0.5)
    # 오프셋 49: 1994-01-19(乙巳, idx=41) 기준 검증
    #   day_num=2449372, 2449372%60=52, (41-52+60)%60=49
    day_idx  = (day_num + 49) % 60
    d_stem   = day_idx % 10
    d_branch = day_idx % 12

    # ── 시주(時柱) ─────────────────────────────────────────────
    # 시지(時支): 자시=0 축시=1 인시=2 … 해시=11
    #   23시 → 야자시(夜子時, branch=0) / 나머지: (hour+1)//2 % 12
    if hour == 23:
        h_branch = 0
    else:
        h_branch = ((hour + 1) // 2) % 12
    # 일간(日干)별 자시(子時) 천간 시작점
    #   갑·기=甲(0)  을·경=丙(2)  병·신=戊(4)  정·임=庚(6)  무·계=壬(8)
    h_stem_start = (d_stem % 5 * 2) % 10
    h_stem       = (h_stem_start + h_branch) % 10

    return {
        'year':  (y_stem,  y_branch,  saju_year),
        'month': (m_stem,  m_branch,  m_num, jeolgi_name),
        'day':   (d_stem,  d_branch),
        'hour':  (h_stem,  h_branch),
        'input': (year, month, day, hour, minute),
    }


# ══════════════════════════════════════════════════════════════
# 출력
# ══════════════════════════════════════════════════════════════

def print_manseryeok(r: dict):
    ys, yb, saju_year          = r['year']
    ms, mb, mnum, jeolgi_name  = r['month']
    ds, db                     = r['day']
    hs, hb                     = r['hour']
    y, mo, d, h, mi            = r['input']

    W = 66

    def bar(ch='═'): return ch * W

    def pillar(s, b, hanja=False):
        cg = CHEONGAN_HJ[s] if hanja else CHEONGAN[s]
        jj = JIJI_HJ[b]     if hanja else JIJI[b]
        return f"{cg}{jj}"

    # 헤더
    print()
    print(bar())
    print(f"  📚 만세력(萬歲曆)")
    print(bar('─'))
    print(f"  🗓  생년월일시 : {y}년 {mo:02d}월 {d:02d}일  {h:02d}시 {mi:02d}분  (KST / 양력)")
    print(f"  🌱 사주기준년  : {saju_year}년  │  입절기준 절기 : {jeolgi_name}")
    print(f"  🐾 띠          : {ANIMALS[yb]}띠  ({JIJI[yb]})")
    print(bar())

    # ── 사주 표 ───────────────────────────────────────────────
    cols = [
        ("시주(時柱)", hs, hb),
        ("일주(日柱)", ds, db),
        ("월주(月柱)", ms, mb),
        ("년주(年柱)", ys, yb),
    ]

    COL_W = 14

    # 열 헤더
    print(f"  {'':8}", end="")
    for label, *_ in cols:
        print(f"  {label:^{COL_W}}", end="")
    print()
    print("  " + bar('─'))

    # 천간 행
    print(f"  {'천간(天干)':8}", end="")
    for _, s, _ in cols:
        cell = f"{CHEONGAN[s]}({CHEONGAN_HJ[s]})  {UMYANG_CG[s]}{OHAENG_CG[s]}"
        print(f"  {cell:^{COL_W}}", end="")
    print()

    # 지지 행
    print(f"  {'지지(地支)':8}", end="")
    for _, _, b in cols:
        cell = f"{JIJI[b]}({JIJI_HJ[b]})  {UMYANG_JJ[b]}{OHAENG_JJ[b]}"
        print(f"  {cell:^{COL_W}}", end="")
    print()

    print("  " + bar('─'))

    # 갑자 한글·한자 표기
    kr = [pillar(s, b)       for _, s, b in cols]
    hj = [pillar(s, b, True) for _, s, b in cols]
    labels_kr = ['시', '일', '월', '년']
    labels_hj = ['時', '日', '月', '年']

    line_kr = "  ".join(f"{labels_kr[i]} {kr[i]}" for i in range(4))
    line_hj = "  ".join(f"{labels_hj[i]} {hj[i]}" for i in range(4))
    print(f"\n  ✨ 사주(한글) :  {line_kr}")
    print(f"  ✨ 사주(한자) :  {line_hj}")

    # 60갑자 인덱스
    y_idx = ys * 6 % 60  # 단순 표시용 (실제 순서와 무관한 간단 인덱스)
    print()
    print(bar())
    print()


# ══════════════════════════════════════════════════════════════
# 검증용 테스트
# ══════════════════════════════════════════════════════════════

def run_tests():
    """주요 날짜에 대한 결과 검증 출력"""
    tests = [
        # (year, month, day, hour, minute, 예상 메모)
        (2024,  1,  1,  0,  0, "2024-01-01 00시 (입춘 전 → 癸卯년)"),
        (2024,  2,  4, 12,  0, "2024-02-04 12시 입춘일 → 甲辰년"),
        (1990,  3, 15,  9, 30, "1990-03-15 09:30"),
        (1985, 11, 20, 23,  0, "1985-11-20 23시 야자시"),
        (2000,  1,  1,  0,  0, "2000-01-01 밀레니엄"),
    ]
    print("\n" + "─" * 66)
    print("  [검증 테스트]")
    print("─" * 66)
    for y, mo, d, h, mi, memo in tests:
        r = calc_manseryeok(y, mo, d, h, mi)
        ys, yb, sy   = r['year']
        ms, mb, *_   = r['month']
        ds, db       = r['day']
        hs, hb       = r['hour']
        print(f"  {memo}")
        print(f"    년주={CHEONGAN[ys]}{JIJI[yb]}({CHEONGAN_HJ[ys]}{JIJI_HJ[yb]})  "
              f"월주={CHEONGAN[ms]}{JIJI[mb]}({CHEONGAN_HJ[ms]}{JIJI_HJ[mb]})  "
              f"일주={CHEONGAN[ds]}{JIJI[db]}({CHEONGAN_HJ[ds]}{JIJI_HJ[db]})  "
              f"시주={CHEONGAN[hs]}{JIJI[hb]}({CHEONGAN_HJ[hs]}{JIJI_HJ[hb]})")
        print()


# ══════════════════════════════════════════════════════════════
# 메인
# ══════════════════════════════════════════════════════════════

def main():
    print("\n" + "★" * 34)
    print("      만세력(萬歲曆) 계산기")
    print("★" * 34)
    print("  ※ 양력 기준, 한국 표준시(KST) 입력")
    print("  ※ 종료하려면 아무 입력에서 'q' 입력\n")

    while True:
        try:
            raw = input("  생년(年) [예: 1990 / 종료: q] : ").strip()
            if raw.lower() == 'q':
                print("\n  프로그램을 종료합니다.\n")
                break

            year   = int(raw)
            month  = int(input("  생월(月) [1-12]              : "))
            day    = int(input("  생일(日) [1-31]              : "))
            hour   = int(input("  생시(時) [0-23, 24시간제]    : "))
            raw_mi = input("  생분(分) [0-59, 미입력=00분] : ").strip()
            minute = int(raw_mi) if raw_mi else 0

            # 날짜 유효성 검증
            datetime(year, month, day, hour, minute)

            result = calc_manseryeok(year, month, day, hour, minute)
            print_manseryeok(result)

        except ValueError as e:
            print(f"\n  ⚠  입력 오류: {e}")
            print("  다시 입력해 주세요.\n")
        except KeyboardInterrupt:
            print("\n\n  프로그램을 종료합니다.\n")
            break
        except Exception as e:
            print(f"\n  ⚠  계산 오류: {e}\n")

        again = input("  다른 생년월일시를 조회하시겠습니까? (y/n) : ").strip().lower()
        if again != 'y':
            print("\n  프로그램을 종료합니다.\n")
            break
        print()

    # VS Code 터미널에서 창이 바로 닫히지 않도록 대기
    input("  [Enter] 키를 누르면 창이 닫힙니다...")


if __name__ == "__main__":
    import sys
    if len(sys.argv) > 1 and sys.argv[1] == "--test":
        run_tests()
    else:
        main()