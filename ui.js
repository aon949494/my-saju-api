/* ═══ OracAi — ui.js ═══ */
/* 화면 제어 & UI 렌더링 */

function showToast(msg){
  var t=document.createElement('div');
  t.style.cssText='position:fixed;bottom:calc(var(--NAV,64px) + var(--BNR,50px) + 12px);left:50%;transform:translateX(-50%);background:rgba(240,192,96,.96);color:#1a0d00;padding:10px 20px;border-radius:20px;font-size:13px;font-weight:600;z-index:9999;white-space:nowrap;animation:fadeUp .3s ease;pointer-events:none;';
  t.textContent=msg;document.body.appendChild(t);
  setTimeout(function(){if(t.parentNode)(function(e){if(e&&e.parentNode)e.parentNode.removeChild(e);})(t);},2500);
}

function escH(s){return(s||'').replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]);});}

function _navTo(screenId,key){
  _curNav=key;
  document.querySelectorAll('.nav-item').forEach(function(el){el.className='nav-item';});
  var el=document.getElementById('nav-'+key);if(el)el.className='nav-item on';
  goScreen(screenId);
}

function goScreen(id){
  // zodiacScreen 떠날 때 1회성 광고 세션 플래그 초기화
  var curActive=document.querySelector('.screen.active');
  if(curActive&&curActive.id==='zodiacScreen'&&id!=='zodiacScreen'){
    _zAdUnlockedSession=false;
  }
  _screenStack.push(id);
  if(_screenStack.length>15) _screenStack.shift();
  var screens = document.querySelectorAll('.screen');
  for(var i=0; i<screens.length; i++) {
      screens[i].classList.remove('active');
      screens[i].classList.add('hidden');
  }
  var el=document.getElementById(id);
  if(el) {
      el.classList.remove('hidden');
      el.classList.add('active');
      el.scrollTop=0;
  }
  if(id==='mainScreen') setTimeout(updateMainTodayCard,100);
}

function goBack(){
  // 별자리 화면 나가면 1회성 플래그 초기화
  var active=document.querySelector('.screen.active');
  if(active&&active.id==='zodiacScreen') _zAdUnlockedSession=false;
  _screenStack.pop();
  var prev=_screenStack.length>0?_screenStack[_screenStack.length-1]:'mainScreen';
  // goScreen 호출 시 스택에 또 push되므로 직접 화면 전환
  var screens=document.querySelectorAll('.screen');
  for(var i=0;i<screens.length;i++){screens[i].classList.remove('active');screens[i].classList.add('hidden');}
  var el=document.getElementById(prev);
  if(el){el.classList.remove('hidden');el.classList.add('active');el.scrollTop=0;}
  if(prev==='mainScreen') setTimeout(updateMainTodayCard,100);
}

function navSaju(){
  _curNav='saju';
  document.querySelectorAll('.nav-item').forEach(function(el){el.className='nav-item';});
  var el=document.getElementById('nav-saju');if(el)el.className='nav-item on';
  if(typeof switchCalcTab==='function')switchCalcTab('saju');
  goScreen('calcScreen');
  setTimeout(function(){renderSajuProfList();},200);
}

function navPersona(){
  _curNav='persona';
  document.querySelectorAll('.nav-item').forEach(function(el){el.className='nav-item';});
  var el=document.getElementById('nav-persona');if(el)el.className='nav-item on';
  goScreen('personaScreen');
  renderPersonaScreen();
}

function navUnse(type){
  _curNav='unse';
  document.querySelectorAll('.nav-item').forEach(function(el){el.className='nav-item';});
  var el=document.getElementById('nav-unse');if(el)el.className='nav-item on';
  goUnse(type);
}

function navUnseHome(){
  _curNav='unse';
  document.querySelectorAll('.nav-item').forEach(function(el){el.className='nav-item';});
  var el=document.getElementById('nav-unse');if(el)el.className='nav-item on';
  goScreen('unseHomeScreen');
  renderUnseHome();
}

function navBokchae(){
  _curNav='bokchae';
  document.querySelectorAll('.nav-item').forEach(function(el){el.className='nav-item';});
  var el=document.getElementById('nav-bokchae');if(el)el.className='nav-item on';
  goScreen('bokchaeScreen');
  renderBokchae();
}

function navZodiac(){
  _curNav='unse';
  document.querySelectorAll('.nav-item').forEach(function(el){el.className='nav-item';});
  var el=document.getElementById('nav-unse');if(el)el.className='nav-item on';
  goScreen('zodiacScreen');
  zInit();
}

function navMyInfo(){navSettings('profile');}

function navSettings(tab){
  _curNav='myinfo';
  document.querySelectorAll('.nav-item').forEach(function(el){el.className='nav-item';});
  var el=document.getElementById('nav-myinfo');if(el)el.className='nav-item on';
  if(tab==='att'){
    goScreen('attendanceScreen');
    renderAttendance();
  } else {
    goScreen('profileScreen');
    renderSettingsProfile();
  }
}

function goSinnyunScreen(){switchCalcTab('sinnyun');goScreen('calcScreen');}

function goSajuScreen(){switchCalcTab('saju');goScreen('calcScreen');}

function goCalc(){goScreen('calcScreen');}

function goMain(){goScreen('mainScreen');renderMainRecent();}

function showConfirmModal(msg,cb){
  _confirmCb=cb;
  var box=document.getElementById('confirmModal');
  var txt=document.getElementById('confirmModalMsg');
  if(!box){
    box=document.createElement('div');
    box.id='confirmModal';
    box.style.cssText='position:fixed;inset:0;background:rgba(7,7,26,.82);backdrop-filter:blur(14px);display:flex;align-items:center;justify-content:center;z-index:9000;';
    box.innerHTML='<div style="background:rgba(22,16,50,.95);border:1px solid rgba(255,255,255,.13);border-radius:24px;padding:28px 24px;width:80%;max-width:300px;text-align:center;">'
      +'<div id="confirmModalMsg" style="font-size:15px;color:var(--text);margin-bottom:20px;line-height:1.6;"></div>'
      +'<div style="display:flex;gap:10px;">'
      +'<button onclick="closeConfirmModal(false)" style="flex:1;height:46px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:14px;color:var(--dim);font-size:14px;cursor:pointer;font-family:Pretendard;">취소</button>'
      +'<button onclick="closeConfirmModal(true)" style="flex:1;height:46px;background:rgba(248,113,113,.2);border:1px solid rgba(248,113,113,.4);border-radius:14px;color:#fca5a5;font-size:14px;font-weight:600;cursor:pointer;font-family:Pretendard;">삭제</button>'
      +'</div>'
      +'</div>';
    document.body.appendChild(box);
  }
  var txt2=document.getElementById('confirmModalMsg');
  if(txt2) txt2.textContent=msg;
  box.style.display='flex';
}

function closeConfirmModal(ok){
  var box=document.getElementById('confirmModal');
  if(box) box.style.display='none';
  if(ok&&_confirmCb) _confirmCb();
  _confirmCb=null;
}

function showPrivacy(){goScreen('privacyScreen');}

function openSelectProfModal(id){
  var ps=getProfiles(),p=ps.find(function(x){return x.id===id;});if(!p)return;
  _selectingProfId=id;
  var noH=(p.hour===99||p.hour===undefined)?'시간모름':(p2(p.hour)+'시 '+p2(p.min||0)+'분');
  var nm=document.getElementById('selectProfModalName');
  var inf=document.getElementById('selectProfModalInfo');
  if(nm) nm.textContent=escH(p.name||'이름없음');
  if(inf) inf.textContent=p.gY+'년 '+p2(p.gM)+'월 '+p2(p.gD)+'일 '+noH+'\n'+(p.gen==='male'?'남성':'여성')+' · '+(p.saju||'');
  document.getElementById('selectProfModal').classList.add('show');
}

function closeSelectProfModal(){
  document.getElementById('selectProfModal').classList.remove('show');
  _selectingProfId=null;
}

function confirmSelectProf(){
  if(!_selectingProfId){closeSelectProfModal();return;}
  var id=_selectingProfId;
  setDefaultProfileId(id);
  closeSelectProfModal();
  renderProfileScreen();
  renderSajuProfList&&renderSajuProfList();
  showToast('프로필이 선택됐어요 ✦');
}

function showBokchaeModal(cost){
  if(isSubscribed()){showToast('구독 중에는 복채 없이 사용 가능해요');return;}
  var needCnt=cost||1;
  // 기존 모달 있으면 텍스트 업데이트 후 표시
  var existing=document.getElementById('bokchaeNeedModal');
  if(existing){
    var txt=existing.querySelector('.bokchae-cost-txt');
    if(txt) txt.textContent='복채 '+needCnt+'개로 리딩을 받을 수 있어요.';
    existing.classList.add('show');return;
  }
  var div=document.createElement('div');
  div.id='bokchaeNeedModal';
  div.className='modal-overlay';
  div.innerHTML='<div class="modal-box" style="text-align:center;">'
    +'<div style="font-size:28px;margin-bottom:10px;">💎</div>'
    +'<div style="font-family:Gowun Dodum,serif;font-size:18px;color:var(--gold2);margin-bottom:8px;">복채가 부족해요</div>'
    +'<div class="bokchae-cost-txt" style="font-size:13px;color:var(--dim);line-height:1.7;margin-bottom:20px;">복채 '+needCnt+'개로 리딩을 받을 수 있어요.</div>'
    +'<div style="display:flex;gap:8px;">'
    +'<button onclick="closeBokchaeModal()" style="flex:1;height:44px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:12px;color:var(--muted);font-size:13px;cursor:pointer;font-family:Pretendard;">취소</button>'
    +'<button onclick="closeBokchaeModal();navBokchae();" style="flex:1;height:44px;background:linear-gradient(135deg,#b87800,#f0c060);border:none;border-radius:12px;color:#1a0d00;font-size:13px;font-weight:700;cursor:pointer;font-family:Pretendard;">복채 충전하기</button>'
    +'</div></div>';
  document.body.appendChild(div);
  setTimeout(function(){div.classList.add('show');},10);
}

function closeBokchaeModal(){var m=document.getElementById("bokchaeNeedModal");if(m)m.classList.remove("show");}

function showNatalBokchaeModal(){
  // 기존 모달 재사용 (이미 1개 텍스트로 수정됨)
  showBokchaeModal();
}

function renderMainRecent(){
  var h=gh(), el=document.getElementById('mainRecent');
  if(!el) return;
  if(!h.length){el.innerHTML='<div style="text-align:center;padding:20px;font-size:12px;color:var(--muted)">아직 저장된 사주가 없습니다</div>';return;}
  var html = '';
  for(var i=0; i<h.length; i++){
      var e = h[i];
      html += '<div class="rec-card" onclick="loadAndGo('+i+')"><div><div class="rec-saju">'+e.saju+'</div><div class="rec-date">'+e.gY+'년 '+p2(e.gM)+'월 '+p2(e.gD)+'일 '+p2(e.hour)+'시 '+p2(e.min||0)+'분</div></div><div style="display:flex;align-items:center;gap:8px"><span class="rec-gen '+(e.gen==='male'?'m':'f')+'">'+(e.gen==='male'?'남 ♂':'여 ♀')+'</span><span style="color:var(--muted)">›</span></div></div>';
  }
  el.innerHTML = html;
}

function renderPersonaScreen(){
  var pc=document.getElementById('pcBokchae');
  if(pc) pc.textContent=getBokchaeCnt();
  pcFreeClean();
  _renderPersonaCards();
}

function _renderPersonaCards(){
  // 루나/백호 이미지 로드
  var lunaImg=document.getElementById('lunaCardImg2');
  var baekhoImg=document.getElementById('baekhoCardImg2');
  if(lunaImg&&PERSONAS.luna&&PERSONAS.luna.imgSrc) lunaImg.src=PERSONAS.luna.imgSrc;
  if(baekhoImg&&PERSONAS.baekho&&PERSONAS.baekho.imgSrc) baekhoImg.src=PERSONAS.baekho.imgSrc;

  // 프리미엄 잠금 업데이트
  var premiumIds=['hades','sera','red'];
  var canPremium=canAccessPersona('hades');
  premiumIds.forEach(function(id){
    var lock=document.getElementById(id+'Lock2');
    if(lock) lock.style.display=canPremium?'none':'flex';
  });
}

function renderProfileScreen(){
  var el=document.getElementById('profileList');if(!el)return;
  var ps=getProfiles(),did=getDefaultProfileId();
  if(!ps.length){
    el.innerHTML='<div style="text-align:center;padding:28px;font-size:13px;color:var(--muted);">저장된 프로필이 없어요<br><span style="font-size:11px;font-weight:300;margin-top:8px;display:block;">아래 버튼으로 추가할 수 있어요</span></div>';
    return;
  }
  // 전역 맵에 프로필 저장 (안전한 참조용)
  window._profMap={};
  ps.forEach(function(p){window._profMap[p.id]=p;});
  
  el.innerHTML=ps.map(function(p){
    var isDef=(p.id===did);
    var noH=(p.hour===99||p.hour===undefined)?'시간모름':(p2(p.hour)+'시 '+p2(p.min||0)+'분');
    var idx=ps.indexOf(p); // 인덱스 사용
    return '<div class="prof-card'+(isDef?' default':'')+'" onclick="profCardClick('+idx+')">'
      +'<div class="prof-avatar '+(p.gen==='male'?'m':'f')+'">'+(p.gen==='male'?'♂':'♀')+'</div>'
      +'<div class="prof-info">'
      +'<div class="prof-name">'+escH(p.name||'이름없음')+(isDef?'<span class="prof-badge">대표</span>':'')+'</div>'
      +'<div class="prof-saju">'+(p.saju||'')+'</div>'
      +'<div class="prof-date">'+p.gY+'년 '+p2(p.gM)+'월 '+p2(p.gD)+'일 '+noH+'</div>'
      +'</div>'
      +'<div class="prof-actions">'
      +(isDef
        ?'<button class="prof-btn star" onclick="event.stopPropagation()">★</button>'
        :'<button class="prof-btn" onclick="profSetStar('+idx+');event.stopPropagation()">☆</button>'
      )
      +'<button class="prof-btn" style="font-size:12px;" onclick="profEdit('+idx+');event.stopPropagation()">✎</button>'
      +'<button class="prof-btn" style="color:#f87171;" onclick="profDelete('+idx+');event.stopPropagation()">×</button>'
      +'</div>'
      +'</div>';
  }).join('');
}

function renderBokchae(){
  var mini=getMiniBokchaeCnt(),bok=getBokchaeCnt();
  ['bcMini','bcMini2'].forEach(function(id){var e=document.getElementById(id);if(e)e.textContent=mini;});
  ['bcBokchae','bcBokchae2'].forEach(function(id){var e=document.getElementById(id);if(e)e.textContent=bok;});
  var today=getTodayStr();
  var adCnt=parseInt(localStorage.getItem('msr_ad_cnt_'+today)||'0');
  var ac=document.getElementById('bcAdCount');if(ac)ac.textContent=adCnt+'/5';
  if(ac)ac.style.color=adCnt>=5?'var(--muted)':'#fb923c';
  _renderPassBadges();
}

function renderSettingsProfile(){
  // 패스 뱃지 업데이트
  _renderPassBadges();
  _renderRewardBadges();
  var def=getDefaultProfile();
  var empty=document.getElementById('spEmpty');
  var card=document.getElementById('settingsProfileCard');
  var editBtn=document.getElementById('spEditBtn');
  if(!def){
    if(empty) empty.style.display='block';
    // 프로필 없을 때 통계, 프로필정보, 수정버튼 전부 숨기기
    ['spAvatar','spName','spSaju','spDate','spCity'].forEach(function(id){
      var e=document.getElementById(id);if(e)e.style.display='none';
    });
    if(editBtn) editBtn.style.display='none';
    var statsGrid=document.getElementById('settingsStatsGrid');
    if(statsGrid) statsGrid.style.display='none';
    return;
  }
  // 프로필 있으면 통계 보이기
  var statsGrid2=document.getElementById('settingsStatsGrid');
  if(statsGrid2) statsGrid2.style.display='grid';
  if(empty) empty.style.display='none';
  ['spAvatar','spName','spSaju','spDate'].forEach(function(id){var e=document.getElementById(id);if(e)e.style.display='';});
  if(editBtn) editBtn.style.display='';
  var av=document.getElementById('spAvatar');
  if(av){av.textContent=def.gen==='male'?'♂':'♀';av.style.background=def.gen==='male'?'rgba(96,165,250,.2)':'rgba(244,114,182,.2)';}
  var nm=document.getElementById('spName');if(nm) nm.textContent=def.name||'이름없음';
  var sj=document.getElementById('spSaju');if(sj) sj.textContent=def.saju||'';
  var dt=document.getElementById('spDate');
  if(dt){
    var noH=(def.hour===99||def.hour===undefined);
    var timeStr=noH?'시간모름':(p2(def.hour)+'시'+(def.min===30?'30':'00'));
    dt.textContent=def.gY+'년 '+p2(def.gM)+'월 '+p2(def.gD)+'일 '+timeStr;
  }
  var ct=document.getElementById('spCity');
  if(ct) ct.textContent=def.cityName?'📍 '+def.cityName+' 출생':'';
  // 통계
  var sajuCache={};try{sajuCache=JSON.parse(localStorage.getItem('saju_cache')||'{}');}catch(e){}
  var sajuCnt=Object.keys(sajuCache).length;
  var unseCache={};try{unseCache=JSON.parse(localStorage.getItem('unse_cache')||'{}');}catch(e){}
  var st=document.getElementById('statSaju');if(st) st.innerHTML=sajuCnt+'<span style="font-size:11px;color:var(--muted);font-weight:300;"> 회</span>';
  var tCnt=0;try{tCnt=JSON.parse(localStorage.getItem('tarot_cnt')||'0');}catch(e){}
  var tt=document.getElementById('statTarot');if(tt) tt.innerHTML=tCnt+'<span style="font-size:11px;color:var(--muted);font-weight:300;"> 회</span>';
  // 미니복채/복채 실제 값
  var sm=document.getElementById('statMini');if(sm) sm.innerHTML=getMiniBokchaeCnt()+'<span style="font-size:11px;color:var(--muted);font-weight:300;"> 개</span>';
  var sb=document.getElementById('statBokchae');if(sb) sb.innerHTML=getBokchaeCnt()+'<span style="font-size:11px;color:var(--muted);font-weight:300;"> 개</span>';
  // 출석 스트릭 배지
  var streak=getAttStreak();
  var badge=document.getElementById('attStreakBadge');
  if(badge) badge.textContent=streak?'🔥 '+streak+'일 연속':'';
  // 프로필 수 배지
  var pcb=document.getElementById('profCountBadge');
  if(pcb){var pc=getProfiles().length;pcb.textContent=pc+'개';}
}

function renderAttendance(){
  var el=document.getElementById('attContent');if(!el)return;
  var dates=getAttDates();
  var rec=getRecoveredDates();
  var today=getTodayStr();
  var checked=dates.indexOf(today)>=0;
  var streak=getAttStreak();
  var week=getThisWeekDates();
  var now=new Date();
  var year=now.getFullYear(),month=now.getMonth();
  var firstDay=new Date(year,month,1).getDay();
  var daysInMonth=new Date(year,month+1,0).getDate();
  var mNames=['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'];
  var dLabels=['월','화','수','목','금','토','일'];
  var weekDayNames=['월','화','수','목','금','토','일'];

  // 이번 주 진행 상태
  var weekChecked=week.filter(function(d){return dates.indexOf(d)>=0;}).length;
  var recoveryUsed=getThisWeekRecoveryUsed();
  var miniGoal=7, bokchaeGoal=1;

  // 이번주 7일 버블
  var weekBubbles='';
  week.forEach(function(ds,i){
    var isChecked=dates.indexOf(ds)>=0;
    var isToday=(ds===today);
    var isFuture=(ds>today);
    var isRecovered=rec.indexOf(ds)>=0;
    var isMissed=!isChecked&&!isFuture&&ds<today;
    var canRecover=isMissed&&recoveryUsed<1;
    var label=weekDayNames[i];
    var dayNum=parseInt(ds.slice(-2));
    if(isChecked){
      weekBubbles+='<div style="display:flex;flex-direction:column;align-items:center;gap:4px;">'
        +'<div style="width:40px;height:40px;border-radius:50%;background:'+(isRecovered?'rgba(139,92,246,.4)':'rgba(74,222,128,.3)')+';border:2px solid '+(isRecovered?'rgba(139,92,246,.7)':'#4ade80')+';display:flex;align-items:center;justify-content:center;font-size:16px;">'+(isRecovered?'🔄':'✓')+'</div>'
        +'<div style="font-size:9px;color:'+(isToday?'var(--gold2)':'var(--muted)')+';">'+label+'</div>'
        +'</div>';
    } else if(isToday){
      weekBubbles+='<div style="display:flex;flex-direction:column;align-items:center;gap:4px;">'
        +'<div style="width:40px;height:40px;border-radius:50%;background:rgba(240,192,96,.15);border:2px dashed var(--gold);display:flex;align-items:center;justify-content:center;font-size:13px;color:var(--gold2);font-weight:700;">今</div>'
        +'<div style="font-size:9px;color:var(--gold2);">오늘</div>'
        +'</div>';
    } else if(canRecover){
      weekBubbles+='<div style="display:flex;flex-direction:column;align-items:center;gap:4px;cursor:pointer;" onclick="doRecovery(\''+ds+'\')">'
        +'<div style="width:40px;height:40px;border-radius:50%;background:rgba(251,146,60,.1);border:2px dashed rgba(251,146,60,.6);display:flex;align-items:center;justify-content:center;font-size:14px;">📺</div>'
        +'<div style="font-size:9px;color:rgba(251,146,60,.8);">복구</div>'
        +'</div>';
    } else if(isMissed){
      weekBubbles+='<div style="display:flex;flex-direction:column;align-items:center;gap:4px;">'
        +'<div style="width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.04);border:2px solid rgba(255,255,255,.1);display:flex;align-items:center;justify-content:center;font-size:13px;color:rgba(255,255,255,.2);">✗</div>'
        +'<div style="font-size:9px;color:rgba(255,255,255,.2);">'+label+'</div>'
        +'</div>';
    } else {
      weekBubbles+='<div style="display:flex;flex-direction:column;align-items:center;gap:4px;">'
        +'<div style="width:40px;height:40px;border-radius:50%;background:rgba(255,255,255,.04);border:2px solid rgba(255,255,255,.08);display:flex;align-items:center;justify-content:center;font-size:12px;color:rgba(255,255,255,.2);">'+dayNum+'</div>'
        +'<div style="font-size:9px;color:rgba(255,255,255,.15);">'+label+'</div>'
        +'</div>';
    }
  });

  // 이번 주 보상 진행
  var progressPct=Math.round(weekChecked/7*100);
  var progBar='<div style="height:8px;background:rgba(255,255,255,.07);border-radius:4px;overflow:hidden;margin-top:10px;">'
    +'<div style="height:100%;width:'+progressPct+'%;background:linear-gradient(90deg,#4ade80,#22c55e);border-radius:4px;transition:width .5s cubic-bezier(.22,1,.36,1);"></div>'
    +'</div>';

  // 달력 그리드
  var cells='';
  var calFirstDay=(new Date(year,month,1).getDay()+6)%7; // 월요일 시작
  for(var i=0;i<calFirstDay;i++) cells+='<div class="att-cell empty"></div>';
  for(var d=1;d<=daysInMonth;d++){
    var ds=year+'-'+String(month+1).padStart(2,'0')+'-'+String(d).padStart(2,'0');
    var isToday2=(ds===today),isChecked2=dates.indexOf(ds)>=0,isFuture2=(ds>today);
    var isRec=rec.indexOf(ds)>=0;
    var cls='att-cell'+(isFuture2?' future':isChecked2?(isRec?' checked" style="background:rgba(139,92,246,.2);border-color:rgba(139,92,246,.5)':' checked'):' past')+(isToday2?' today':'');
    cells+='<div class="'+cls+'">'+(isChecked2?(isRec?'🔄':'✓'):d)+'</div>';
  }

  el.innerHTML=
    // 1. 이번 주 진행 카드
    '<div style="background:linear-gradient(145deg,rgba(22,16,50,.9),rgba(10,40,30,.8));border:1px solid rgba(74,222,128,.2);border-radius:22px;padding:18px 16px;margin-bottom:14px;">'
    +'<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;">'
    +'<div><div style="font-family:\'Gowun Dodum\',serif;font-size:16px;color:#4ade80;letter-spacing:1px;">이번 주 목표</div>'
    +'<div style="font-size:11px;color:var(--muted);margin-top:2px;">7일 연속 출석 시 복채 1개 보너스</div></div>'
    +'<div style="text-align:right;"><div style="font-family:\'Gowun Dodum\',serif;font-size:24px;font-weight:700;color:#4ade80;">'+weekChecked+'<span style="font-size:14px;color:rgba(74,222,128,.5);">/7</span></div></div>'
    +'</div>'
    // 버블 행
    +'<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px;justify-items:center;">'+weekBubbles+'</div>'
    // 프로그레스 바
    +progBar
    // 보상 안내
    +'<div style="display:flex;gap:8px;margin-top:12px;">'
    +'<div style="flex:1;background:rgba(255,255,255,.05);border-radius:12px;padding:10px;text-align:center;">'
    +'<div style="font-size:10px;color:var(--muted);margin-bottom:4px;">매일 출석</div>'
    +'<div style="font-size:14px;">💎<span style="font-family:\'Gowun Dodum\',serif;font-size:15px;color:var(--gold2);font-weight:700;"> 미니복채 +2</span></div>'
    +'</div>'
    +'<div style="flex:1;background:rgba(255,255,255,.05);border-radius:12px;padding:10px;text-align:center;">'
    +'<div style="font-size:10px;color:var(--muted);margin-bottom:4px;">7일 달성</div>'
    +'<div style="font-size:14px;">🏆<span style="font-family:\'Gowun Dodum\',serif;font-size:15px;color:var(--gold2);font-weight:700;"> 복채 +1</span></div>'
    +'</div>'
    +'</div>'
    +(recoveryUsed<1&&!checked&&weekChecked<7&&weekChecked>0?'<div style="text-align:center;margin-top:10px;font-size:11px;color:rgba(251,146,60,.7);">📺 빠진 날이 있다면 위에서 광고 보고 복구 가능 (주 1회)</div>':'')

    // 복구 기능 안내 (항상 표시)
    +'<div style="margin-top:12px;padding:12px 14px;background:rgba(251,146,60,.07);border:1px solid rgba(251,146,60,.2);border-radius:14px;">'
    +'<div style="display:flex;gap:10px;align-items:flex-start;">'
    +'<div style="font-size:18px;flex-shrink:0;">📺</div>'
    +'<div>'
    +'<div style="font-size:13px;color:rgba(251,146,60,.9);font-weight:600;margin-bottom:4px;">하루 빠졌어도 괜찮아요</div>'
    +'<div style="font-size:12px;color:var(--muted);line-height:1.6;">이번 주 출석을 못 한 날이 있다면 광고 1회를 보고 빠진 날을 채울 수 있어요. 복구는 <span style="color:rgba(251,146,60,.8);font-weight:600;">주 1회</span>만 가능하고, 복구한 날에도 미니복채 +2가 지급돼요.</div>'
    +'</div>'
    +'</div>'
    +'</div>'
    +'</div>'

    // 2. 현재 보유 보상
    +'<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:14px;">'
    +'<div style="background:rgba(22,16,50,.6);border:1px solid rgba(255,255,255,.09);border-radius:16px;padding:14px;text-align:center;">'
    +'<div style="font-size:10px;color:var(--muted);margin-bottom:6px;">보유 미니복채</div>'
    +'<div style="font-size:11px;margin-bottom:4px;">💎</div>'
    +'<div style="font-family:\'Gowun Dodum\',serif;font-size:22px;font-weight:700;color:var(--gold2);">'+getMiniBokchaeCnt()+'<span style="font-size:12px;color:var(--muted);"> 개</span></div>'
    +'</div>'
    +'<div style="background:rgba(22,16,50,.6);border:1px solid rgba(255,255,255,.09);border-radius:16px;padding:14px;text-align:center;">'
    +'<div style="font-size:10px;color:var(--muted);margin-bottom:6px;">보유 복채</div>'
    +'<div style="font-size:11px;margin-bottom:4px;">🏆</div>'
    +'<div style="font-family:\'Gowun Dodum\',serif;font-size:22px;font-weight:700;color:var(--gold2);">'+getBokchaeCnt()+'<span style="font-size:12px;color:var(--muted);"> 개</span></div>'
    +'</div>'
    +'</div>'

    // 3. 출석 버튼
    +'<button class="att-check-btn" onclick="doCheckIn()" '+(checked?'disabled':'')+'>'
    +(checked?'✅ 오늘 출석 완료':'🌿 오늘 출석하기 (미니복채 +2)')
    +'</button>'

    // 4. 연속 정보
    +'<div class="att-streak" style="margin-bottom:14px;">'
    +'<div class="att-streak-ico">🔥</div>'
    +'<div><div class="att-streak-num">'+streak+'일</div><div class="att-streak-lbl">연속 출석</div></div>'
    +'<div style="margin-left:auto;text-align:right;"><div style="font-size:20px;font-weight:700;color:var(--gold2);">'+dates.length+'</div><div style="font-size:10px;color:var(--muted);">총 출석일</div></div>'
    +'</div>'

    // 5. 달력
    +'<div class="att-calendar">'
    +'<div class="att-cal-header"><span class="att-cal-title">'+year+'년 '+mNames[month]+'</span></div>'
    +'<div class="att-days-row">'+['월','화','수','목','금','토','일'].map(function(l){return'<div class="att-day-lbl">'+l+'</div>';}).join('')+'</div>'
    +'<div class="att-grid">'+cells+'</div>'
    +'</div>';
}

function renderUnseResult(scores, texts) {
  var tc=scores.overall;
  var tcol=tc>=80?'#4a9a6a':tc>=60?'var(--gold2)':tc>=40?'#e8a090':'#e09090';
  var tel=document.getElementById('uTotalScore');tel.textContent=tc;tel.style.color=tcol;

  drawRadar([scores.overall,scores.money,scores.love,scores.work,scores.health]);

  var leg=document.getElementById('uLegend');
  var scoreArr=[
    {id:'overall',lbl:'✦ 총운',   color:'#c8a96e'},
    {id:'money',  lbl:'◈ 재물운', color:'#4a9a6a'},
    {id:'love',   lbl:'♡ 연애운', color:'#c84a7e'},
    {id:'work',   lbl:'⊕ 직업운', color:'#4a7ec8'},
    {id:'health', lbl:'☽ 건강운', color:'#9a6ac8'},
  ];
  leg.innerHTML=scoreArr.map(function(s){
    return '<div class="sl-item"><div class="sl-dot" style="background:'+s.color+'"></div><span>'+s.lbl.substring(2)+'</span><strong style="color:var(--text)">'+scores[s.id]+'</strong></div>';
  }).join('');

  // 탭 숨기고 단일 스크롤 페이지로
  var te=document.getElementById('uTabs');
  var se=document.getElementById('uSecs');
  if(te){te.style.cssText='display:none!important;height:0;overflow:hidden;';te.innerHTML='';}
  se.innerHTML='';

  scoreArr.forEach(function(cat,i){
    var sv=scores[cat.id];
    var scol=sv>=80?'#4a9a6a':sv>=60?'var(--gold2)':sv>=40?'#e8a090':'#e09090';

    // 섹션 카드
    var sec=document.createElement('div');
    sec.style.cssText='margin-bottom:20px;';
    sec.innerHTML=
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px;">'
      +'<span style="font-size:16px;font-weight:700;color:var(--text);letter-spacing:.5px;">'+cat.lbl+'</span>'
      +'<span style="font-size:20px;font-weight:700;color:'+scol+';font-family:\'Gowun Dodum\',serif;">'+sv+'점</span>'
      +'</div>'
      +'<div class="aitxt" id="utx-'+cat.id+'" style="font-size:14px;color:var(--dim);line-height:1.9;word-break:keep-all;"></div>';
    se.appendChild(sec);

    // 재물운 다음 광고 배너 삽입 (연애운 위)
    if(cat.id==='money'){
      var adDiv=document.createElement('div');
      adDiv.style.cssText='margin:4px 0 20px;border-radius:12px;overflow:hidden;min-height:100px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;';
      adDiv.innerHTML='<div id="unseAdBanner" style="width:100%;text-align:center;"><span style="font-size:11px;color:var(--muted);letter-spacing:1px;">ADVERTISEMENT</span></div>';
      se.appendChild(adDiv);
    }

    // 구분선 (마지막 제외)
    if(i<scoreArr.length-1&&cat.id!=='money'){
      var hr=document.createElement('div');
      hr.style.cssText='height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.08),transparent);margin:4px 0 20px;';
      se.appendChild(hr);
    }
  });

  // 텍스트 자연스럽게 줄바꿈 처리 후 입력
  scoreArr.forEach(function(cat,i){
    var el=document.getElementById('utx-'+cat.id);if(!el)return;
    var raw=texts[cat.id]||'';
    var formatted=_formatUnseText(raw);
    if(i===0) tyTxt(el,formatted,10);
    else el.innerHTML=formatted;
  });

  // 공유버튼/점수저장/블러 부가 처리
  setTimeout(function(){
    window._initUnseResultExtras&&window._initUnseResultExtras(scores);
  },100);
}

function _formatUnseText(text){
  if(!text) return '';
  // 마크다운 제거
  text=text.replace(/\*\*([^*]+)\*\*/g,'$1').replace(/\*([^*]+)\*/g,'$1');
  // 문장 분리 (마침표/요/다/야 뒤에서 단락)
  var sentences=text.split(/(?<=[다요야죠네\.!?])\s+/);
  if(sentences.length<=2) return text;
  // 2~3문장씩 묶어서 단락 구성
  var paras=[],chunk=[];
  sentences.forEach(function(s,i){
    chunk.push(s.trim());
    if(chunk.length>=2||(i===sentences.length-1)){
      paras.push(chunk.join(' '));
      chunk=[];
    }
  });
  return paras.join('<br><br>');
}

function renderFullSaju(secs) {
  var te=document.getElementById('aitabs2')||document.getElementById('aitabs');
  var se=document.getElementById('aisecs2')||document.getElementById('aisecs');
  te.innerHTML='';
  if(te) te.style.cssText='display:none!important;height:0;overflow:hidden;';
  se.innerHTML='';

  var TAGS=[
    {tag:'TOTAL',  id:'total',  lbl:'✦ 총운',   color:'#c8a96e'},
    {tag:'NATURE', id:'nature', lbl:'⊕ 성격',   color:'#7ec8c8'},
    {tag:'WEALTH', id:'wealth', lbl:'◈ 재물운', color:'#4a9a6a'},
    {tag:'LOVE',   id:'love',   lbl:'♡ 애정운', color:'#c84a7e'},
    {tag:'HEALTH', id:'health', lbl:'☽ 건강운', color:'#9a6ac8'}
  ];

  TAGS.forEach(function(cat,i){
    // 섹션 헤더
    var sec=document.createElement('div');
    sec.style.cssText='margin-bottom:24px;';
    sec.innerHTML=
      '<div style="font-size:16px;font-weight:700;color:'+cat.color+';letter-spacing:.5px;margin-bottom:14px;padding-bottom:10px;border-bottom:1px solid rgba(255,255,255,.07);">'+cat.lbl+'</div>'
      +'<div class="aitxt" id="atx2-'+cat.id+'" style="font-size:14px;color:var(--dim);line-height:1.95;word-break:keep-all;"></div>';
    se.appendChild(sec);

    // 재물운과 애정운 사이 광고
    if(cat.id==='wealth'){
      var adDiv=document.createElement('div');
      adDiv.style.cssText='margin:4px 0 24px;border-radius:12px;overflow:hidden;min-height:100px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;';
      adDiv.innerHTML='<span id="midAdBanner" style="width:100%;text-align:center;font-size:11px;color:var(--muted);letter-spacing:1px;">ADVERTISEMENT</span>';
      se.appendChild(adDiv);
    }

    // 섹션 사이 구분선 (마지막 제외, 광고 앞 제외)
    if(i<TAGS.length-1 && cat.id!=='wealth'){
      var hr=document.createElement('div');
      hr.style.cssText='height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,.07),transparent);margin:4px 0 24px;';
      se.appendChild(hr);
    }
  });

  // 텍스트 채우기 — 자연스러운 단락 처리
  TAGS.forEach(function(cat,i){
    var el=document.getElementById('atx2-'+cat.id);if(!el)return;
    var raw=secs[cat.tag]||secs[cat.id]||'내용 없음';
    var formatted=_formatUnseText(raw);
    if(i===0) tyTxt(el,formatted,10);
    else el.innerHTML=formatted;
  });
}

async function renderZodiacScreen(){
  _zAdUnlockedSession=false;
  // 이전에 열린 결과창 전부 닫기
  var re=document.getElementById('zNatalAIResult');
  if(re){re.style.display='none';re.innerHTML='';}
  var sr=document.getElementById('zSignResult');
  if(sr){sr.style.display='none';sr.innerHTML='';}
  var dr=document.getElementById('zDashaResult');
  if(dr){dr.style.display='none';dr.innerHTML='';}
  // 인라인 배너 광고 (AdMob)
  _zShowInlineBanners();
  zSwitchTab('natal');
}

function renderStarScreen(){
  var def=getDefaultProfile();
  if(!def){
    document.getElementById('starNatalContent').innerHTML='<div style="text-align:center;padding:20px;color:var(--muted);">프로필을 먼저 추가해주세요</div>';
    return;
  }
  var noH=(def.hour===99||def.hour===undefined);
  var lat=def.lat||37.5666, lon=def.lon||126.9779;
  var nc=calcNatalChart(def.gY,def.gM,def.gD,noH?12:def.hour,noH,lat,lon);
  var SIGNS=['양자리','황소자리','쌍둥이자리','게자리','사자자리','처녀자리','천칭자리','전갈자리','사수자리','염소자리','물병자리','물고기자리'];
  var SIGN_KW=['용기·개척','안정·소유욕','소통·변화','감수성·직관','자존심·창조','분석·완벽','균형·관계','집착·변혁','자유·철학','인내·야망','독창·이상','감수성·경계없음'];

  // 네이탈 차트 렌더
  var html2='';
  html2+='<div style="font-size:11px;color:var(--muted);letter-spacing:1.5px;margin-bottom:14px;">'+def.name+'님의 네이탈 차트 '+(def.cityName?'('+def.cityName+')':'(서울 기준)')+'</div>';

  var planets=[
    {icon:'☉',name:'태양',sign:nc.sun.sign,deg:nc.sun.deg,desc:'핵심 자아·생명력'},
    {icon:'☽',name:'달',sign:nc.moon.sign,deg:nc.moon.deg,desc:'감정·무의식·본능'},
    {icon:'☊',name:'라후',sign:nc.rahu.sign,deg:nc.rahu.deg,desc:'이번 생 성장 방향'},
    {icon:'☋',name:'케투',sign:nc.ketu.sign,deg:nc.ketu.deg,desc:'전생의 익숙한 패턴'},
  ];
  if(nc.asc) planets.push({icon:'↑',name:'상승궁(ASC)',sign:nc.asc.sign,deg:nc.asc.deg,desc:'외면·첫인상·삶의 방식'});

  planets.forEach(function(p){
    html2+='<div style="display:flex;align-items:center;gap:10px;padding:10px 0;border-bottom:1px solid rgba(255,255,255,.05);">'
      +'<div style="width:32px;height:32px;border-radius:10px;background:rgba(255,255,255,.06);display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;">'+p.icon+'</div>'
      +'<div style="flex:1;">'
      +'<div style="font-size:12px;color:var(--muted);margin-bottom:2px;">'+p.name+' · '+p.desc+'</div>'
      +'<div style="font-size:14px;color:var(--text);font-weight:600;">'+SIGNS[p.sign]+'&nbsp;<span style="font-size:12px;color:var(--gold2);">'+p.deg+'°</span></div>'
      +'<div style="font-size:11px;color:rgba(200,180,255,.5);">'+SIGN_KW[p.sign]+'</div>'
      +'</div></div>';
  });
  document.getElementById('starNatalContent').innerHTML=html2;

  // 다샤 렌더
  if(nc.dasha&&nc.dasha.current){
    var cur=nc.dasha.current, nxt=nc.dasha.next;
    var elapsed=nc.dasha.elapsed, remain=nc.dasha.remain;
    var pct=Math.round(elapsed/(elapsed+remain)*100);
    var PLANET_COLOR={케투:'#94a3b8',금성:'#f472b6',태양:'#f59e0b',달:'#c4b5fd',화성:'#f87171',라후:'#818cf8',목성:'#4ade80',토성:'#94a3b8',수성:'#67e8f9'};
    var DASHA_MEANING={케투:'영적 성장과 분리의 시기. 과거와의 단절, 집착을 내려놓아야 해요.',금성:'사랑과 물질적 풍요가 흘러오는 시기. 인연과 재물이 풍성해요.',태양:'자아를 확립하고 명예를 얻는 시기. 리더십이 빛나요.',달:'감수성과 직관이 높아지는 시기. 감정의 변화가 많아요.',화성:'행동과 추진력이 강해지는 시기. 적극적으로 나아가야 해요.',라후:'야망과 물질욕이 강해지는 시기. 혼돈 속에서 성장해요.',목성:'지혜와 성장·행운의 시기. 인생에서 가장 확장되는 황금기예요.',토성:'인내와 카르마 정산의 시기. 노력한 만큼 결실이 와요.',수성:'소통과 학습이 활발한 시기. 지적 활동과 네트워크가 중요해요.'};
    document.getElementById('starDashaName').textContent=cur.lord+' 다샤';
    document.getElementById('starDashaName').style.color=PLANET_COLOR[cur.lord]||'var(--gold2)';
    document.getElementById('starDashaYear').textContent=Math.round(cur.start)+'년 ~ '+Math.round(cur.end)+'년 ('+cur.years+'년간) · 남은 기간 '+remain+'년';
    document.getElementById('starDashaFill').style.width=pct+'%';
    document.getElementById('starDashaFill').style.background='linear-gradient(90deg,'+(PLANET_COLOR[cur.lord]||'#7c3aed')+',#f0c060)';
    document.getElementById('starDashaProgress').textContent='경과 '+elapsed+'년 ('+pct+'%)';
    document.getElementById('starDashaDesc').innerHTML='<div style="font-size:11px;color:var(--muted);margin-bottom:6px;">'+nc.dasha.nakshatra+' 낙샤트라 출생</div>'+
      '<div>'+DASHA_MEANING[cur.lord]+'</div>'+
      (nxt?'<div style="margin-top:10px;font-size:12px;color:rgba(200,180,255,.5);">다음 다샤: <span style="color:'+(PLANET_COLOR[nxt.lord]||'var(--gold2)')+'">'+nxt.lord+' 다샤</span> ('+Math.round(nxt.start)+'년~, '+nxt.years+'년간)</div>':'');

    // 타임라인
    var tlHtml='';
    (nc.dasha.sequence||[]).forEach(function(d,i){
      var isCur=(cur&&d.lord===cur.lord&&Math.round(d.start)===Math.round(cur.start));
      tlHtml+='<div style="display:flex;align-items:center;gap:10px;padding:10px 14px;background:'+(isCur?'rgba(240,192,96,.08)':'rgba(255,255,255,.02)')+';border:1px solid rgba(255,255,255,'+(isCur?'.15':'.05')+');border-radius:12px;">'
        +'<div style="width:10px;height:10px;border-radius:50%;background:'+(PLANET_COLOR[d.lord]||'#888')+';flex-shrink:0;'+(isCur?'box-shadow:0 0 8px '+(PLANET_COLOR[d.lord]||'#888'):'')+';"></div>'
        +'<div style="flex:1;font-size:13px;color:'+(isCur?'var(--text)':'var(--muted)')+';">'+d.lord+' 다샤</div>'
        +'<div style="font-size:11px;color:var(--muted);">'+Math.round(d.start)+'~'+Math.round(d.end)+'년</div>'
        +(isCur?'<div style="font-size:10px;color:var(--gold2);font-weight:700;">현재</div>':'')
        +'</div>';
    });
    document.getElementById('starDashaTimeline').innerHTML=tlHtml;
  }
}

function tyTxt(el,text,sp){
  el.innerHTML='';
  // <br> 태그 기준으로 단락 분리 후 타이핑 효과
  var parts=text.split(/(<br\s*\/?>)/gi);
  var i=0,partIdx=0;
  var cur=document.createElement('span');cur.className='cur';el.appendChild(cur);
  var t=setInterval(function(){
    // 현재 파트 처리
    while(partIdx<parts.length){
      var part=parts[partIdx];
      if(/^<br\s*\/?>$/i.test(part)){
        // br 태그면 바로 삽입
        cur.insertAdjacentHTML('beforebegin','<br>');
        partIdx++;i=0;continue;
      }
      if(i>=part.length){partIdx++;i=0;continue;}
      cur.insertAdjacentText('beforebegin',part[i++]);
      return;
    }
    clearInterval(t);(function(e){if(e&&e.parentNode)e.parentNode.removeChild(e);})(cur);
  },sp||12);
}

function swTab(sid){AT=sid;var tabs = document.querySelectorAll('#aitabs .aitab');for(var i=0; i<tabs.length; i++) tabs[i].className='aitab'+(tabs[i].id==='atb-'+sid?' on':'');var secs = document.querySelectorAll('#aisecs .aisec');for(var i=0; i<secs.length; i++) secs[i].className='aisec'+(secs[i].id==='asc-'+sid?' show':'');}

function swTab2(sid){
  AT=sid;
  document.querySelectorAll('#aitabs2 .aitab').forEach(function(t){t.className='aitab'+(t.id==='atb2-'+sid?' on':'');});
  document.querySelectorAll('#aisecs2 .aisec').forEach(function(s){s.className='aisec'+(s.id==='asc2-'+sid?' show':'');});
}

function uhGoSlide(idx){
  idx=Math.max(0,Math.min(_uhTotal-1,idx));
  _uhIdx=idx;
  var t=document.getElementById('uhTrack');if(t) t.style.transform='translateX('+(-idx*100)+'%)';
  for(var i=0;i<_uhTotal;i++){var d=document.getElementById('uhd'+i);if(d)d.className='hero-dot'+(i===idx?' on':'');}
  var al=document.getElementById('uhArrowL'),ar=document.getElementById('uhArrowR');
  if(al) al.style.opacity=idx===0?'0':'1';
  if(ar) ar.style.opacity=idx===_uhTotal-1?'0':'1';
}

function _uhReset(){clearInterval(_uhTimer);_uhTimer=setInterval(function(){uhGoSlide((_uhIdx+1)%_uhTotal);},4500);}

function heroGoSlide(idx){
  var track=document.getElementById('heroTrack');if(!track)return;
  _heroIdx=Math.max(0,Math.min(_heroTotal-1,idx));
  track.style.transform='translateX('+(-_heroIdx*100)+'%)';
  document.querySelectorAll('.hero-dot').forEach(function(d,i){d.className='hero-dot'+(i===_heroIdx?' on':'');});
  var al=document.getElementById('heroArrowL'),ar=document.getElementById('heroArrowR');
  if(al) al.style.opacity=_heroIdx===0?'0':'1';
  if(ar) ar.style.opacity=_heroIdx===_heroTotal-1?'0':'1';
}

function _heroNext(){heroGoSlide((_heroIdx+1)%_heroTotal);}

function _heroStart(){_heroTimer=setInterval(_heroNext,4000);}

function _heroReset(){clearInterval(_heroTimer);_heroStart();}

function pcMdToHtml(t){
  // 한 줄씩 처리
  var lines=t.split('\n');
  var out=[];
  var i=0;
  while(i<lines.length){
    var line=lines[i];
    // 헤더
    if(/^###\s/.test(line)){
      out.push('<div style="font-size:15px;font-weight:700;color:#e2e8f0;margin:16px 0 8px;letter-spacing:.3px;">'+line.replace(/^###\s+/,'')+'</div>');
      i++;continue;
    }
    if(/^##\s/.test(line)){
      out.push('<div style="font-size:16px;font-weight:700;color:var(--gold2);margin:16px 0 8px;">'+line.replace(/^##\s+/,'')+'</div>');
      i++;continue;
    }
    if(/^#\s/.test(line)){
      out.push('<div style="font-size:17px;font-weight:700;color:var(--gold2);margin:18px 0 8px;">'+line.replace(/^#\s+/,'')+'</div>');
      i++;continue;
    }
    // 빈 줄 → 문단 구분
    if(line.trim()===''){
      out.push('<div style="height:10px;"></div>');
      i++;continue;
    }
    // 번호 리스트 묶음
    if(/^\d+\.\s/.test(line)){
      var items=[];
      while(i<lines.length&&/^\d+\.\s/.test(lines[i])){
        var li=lines[i].replace(/^\d+\.\s+/,'');
        li=li.replace(/\*\*(.+?)\*\*/g,'<b style="color:#e2e8f0;font-weight:700;">$1</b>').replace(/\*(.+?)\*/g,'<i>$1</i>');
        items.push('<li style="margin-bottom:10px;line-height:1.85;padding-left:4px;">'+li+'</li>');
        i++;
      }
      out.push('<ol style="margin:6px 0 14px 18px;padding:0;color:var(--dim);">'+items.join('')+'</ol>');
      continue;
    }
    // - 리스트 묶음
    if(/^[-•]\s/.test(line)){
      var items2=[];
      while(i<lines.length&&/^[-•]\s/.test(lines[i])){
        var li2=lines[i].replace(/^[-•]\s+/,'');
        li2=li2.replace(/\*\*(.+?)\*\*/g,'<b style="color:#e2e8f0;font-weight:700;">$1</b>').replace(/\*(.+?)\*/g,'<i>$1</i>');
        items2.push('<li style="margin-bottom:8px;line-height:1.85;padding-left:4px;">'+li2+'</li>');
        i++;
      }
      out.push('<ul style="margin:6px 0 14px 18px;padding:0;color:var(--dim);">'+items2.join('')+'</ul>');
      continue;
    }
    // 일반 문단
    var p2=line
      .replace(/\*\*(.+?)\*\*/g,'<b style="color:#e2e8f0;font-weight:700;">$1</b>')
      .replace(/\*(.+?)\*/g,'<i style="color:rgba(255,220,150,.8);">$1</i>');
    out.push('<p style="margin:0 0 10px;line-height:1.9;color:rgba(230,220,255,.75);">'+p2+'</p>');
    i++;
  }
  return out.join('');
}

function natalMdToHtml(t){
  var lines=t.split('\n');
  var out=[];
  var i=0;
  while(i<lines.length){
    var line=lines[i];
    // ## 핵심 결론
    if(/^##\s/.test(line)){
      var txt=line.replace(/^##\s+/,'').replace(/\*\*([^*]+)\*\*/g,'<span style="color:#fde68a;">$1</span>');
      out.push('<div style="font-size:17px;font-weight:800;color:var(--gold2);margin:0 0 20px;padding:16px 18px;background:linear-gradient(135deg,rgba(240,192,96,.08),rgba(168,85,247,.06));border-left:3px solid var(--gold2);border-radius:0 12px 12px 0;line-height:1.5;">'+txt+'</div>');
      i++;continue;
    }
    // ### 섹션 제목
    if(/^###\s/.test(line)){
      var txt2=line.replace(/^###\s+/,'');
      out.push('<div style="font-size:14px;font-weight:700;color:#c4b5fd;margin:20px 0 10px;display:flex;align-items:center;gap:8px;"><span style="width:4px;height:16px;background:#7c3aed;border-radius:2px;display:inline-block;flex-shrink:0;"></span>'+txt2+'</div>');
      i++;continue;
    }
    // > 인용구
    if(/^>\s/.test(line)){
      var txt3=line.replace(/^>\s+/,'').replace(/\*\*([^*]+)\*\*/g,'<strong>$1</strong>');
      out.push('<div style="margin:20px 0 4px;padding:14px 18px;background:rgba(168,85,247,.08);border:1px solid rgba(168,85,247,.25);border-radius:14px;font-size:13px;color:#ddd6fe;font-style:italic;line-height:1.7;">✦ '+txt3+'</div>');
      i++;continue;
    }
    // 빈 줄
    if(line.trim()===''){out.push('<div style="height:6px;"></div>');i++;continue;}
    // 불릿 리스트 묶음
    if(/^-\s/.test(line)){
      var items=[];
      while(i<lines.length&&/^-\s/.test(lines[i])){
        items.push(lines[i].replace(/^-\s+/,'').replace(/\*\*([^*]+)\*\*/g,'<strong style="color:#f0e6ff;">$1</strong>'));
        i++;
      }
      out.push('<div style="display:flex;flex-direction:column;gap:8px;margin:4px 0 12px;">'
        +items.map(function(it){
          return '<div style="display:flex;gap:10px;align-items:flex-start;font-size:13px;color:var(--dim);line-height:1.7;">'
            +'<span style="color:#7c3aed;margin-top:4px;flex-shrink:0;">◆</span>'
            +'<span>'+it+'</span></div>';
        }).join('')+'</div>');
      continue;
    }
    // 일반 텍스트
    var plain=line.replace(/\*\*([^*]+)\*\*/g,'<strong style="color:#f0e6ff;">$1</strong>').replace(/\*([^*]+)\*/g,'<em>$1</em>');
    out.push('<div style="font-size:13px;color:var(--dim);line-height:1.8;margin-bottom:4px;">'+plain+'</div>');
    i++;
  }
  return out.join('');
}

function pcBubbleColor(){
  var c=PC_BUBBLE_COLORS[_curPersonaId];
  return c?c.bg:'rgba(16,10,36,.9)';
}

function pcBubbleBorder(){
  var c=PC_BUBBLE_COLORS[_curPersonaId];
  return c?c.border:'rgba(255,255,255,.08)';
}

function openPersonaChat(id){
  var p=PERSONAS[id];if(!p)return;
  if(p.tier==='premium'){
    if(isPremiumTest()||canAccessPersona(id)){
      _doOpenPersonaChat(id);
      return;
    }
    showToast('🔒 '+p.name+'는 프리미엄 구독 전용이에요');
    return;
  }
  // 무료 캐릭터: 오늘 이미 메시지 보냈는지 체크 (채팅방 열기는 무제한)
  _doOpenPersonaChat(id);
}

function _doOpenPersonaChat(id){
  var p=PERSONAS[id];if(!p)return;
  // 생성 중에 돌아온 경우 히스토리 유지
  if(window._isGenerating && _curPersonaId===id){
    goScreen('personaChatScreen');
    return;
  }
  _curPersonaId=id;
  _curSessionId=null;
  _personaHistory=[];
  _freePersonaCountedThisSession=false;
  // 무료 유저 이전 대화 복원 시도
  if(p.tier==='free'){
    var prevHist=pcFreeLoad(id);
    if(prevHist&&prevHist.length){_personaHistory=prevHist;_freePersonaCountedThisSession=true;}
  }
  var av=document.getElementById('pcAvatar');
  if(av){if(p.imgSrc){av.style.backgroundImage='url('+p.imgSrc+')';av.style.backgroundSize='cover';av.style.backgroundPosition='center';av.textContent='';av.style.background='none';}else{av.textContent=p.avatar;av.style.background=p.color;}av.style.border='2px solid '+p.border;av.style.boxShadow='0 0 12px '+p.border;}
  var nm=document.getElementById('pcName');if(nm)nm.textContent=p.name;
  var tl=document.getElementById('pcTagline');if(tl)tl.textContent=p.tagline;
  var chat=document.getElementById('personaChat');
  if(chat) chat.innerHTML='';
  // 뒤로가기 탭에서 복귀를 위해 현재 캐릭터 ID 저장
  _prevPersonaId=id;

  // 자기소개
  var intros={
    gemna:'…왔어.\n\n나 젬나야. 10년 동안 타로 봤는데, 한 번도 틀린 적 없어.\n"그냥 운이 좋았겠지" 라고 생각해도 괜찮아. 나는 신경 안 써.\n\n근데 한 가지만 알고 가. 내 패는 네가 듣고 싶은 말이 아니라 봐야 하는 말을 보여줘.',
    luna:'…안녕하세요.\n\n저는 루나예요. 달이 뜰 때마다 느껴요. 사람들 감정이 달의 위상을 따라 움직인다는 걸.\n\n말하지 않아도 괜찮아요. 차트를 보면 지금 누구를 생각하는지, 그 인연이 어디로 흐르는지… 이미 보이거든요.',
    baekho:'어… 오셨군요.\n\n저는 백호예요. 17살에 신내림 받고 30년 됐어요. 도깨비신령님 모시고 있어요.\n\n사람이 들어오면 그 머리 위 기운이 먼저 보여요. 지금도 보이는 게 있는데… 먼저 확인하고 말씀드릴게요.',
    hades:'……왔군요.\n\n저는 하데스입니다. 말이 많지 않아요. 들어오는 순간 이미 알거든요.\n\n왜 그 사람을 못 잊는지, 왜 이 인연이 끊어지지 않는지. 이번 생이 처음인지, 전생에서 온 건지. 저는 그걸 읽어요.',
    sera:'어서오세요…\n\n저는 세라예요. 심리학 공부하다가 사주를 만났어요. 충격이었어요. 사주가 심리학보다 무의식을 더 정확하게 설명하더라고요.\n\n왜 같은 패턴이 반복되는지, 왜 그 사람에게 끌리는지. 이유가 다 있어요. 같이 들여다봐요.',
    red:'왔어요.\n\n나는 레드예요. 좋은 말만 해주는 사람한테 지쳐서 여기 온 거 맞죠?\n\n나는 보이는 것만 말해요. 듣기 불편해도요. 근데 솔직히, 그게 진짜 도움이 되는 거잖아요.'
  };
  pcAppendPersona(intros[id]||'안녕하세요.');

  // 두번째 말풍선 (확인 안내)
  var confirmLines={
    gemna:'근데 먼저 확인할 게 있어. 이 사주 맞아?',
    luna:'시작하기 전에요… 이 프로필 맞는 분이세요?',
    baekho:'헌데, 먼저 확인해야겠어요. 이 사주가 맞는 분이시죠?',
    hades:'시작 전에 확인이 필요합니다. 이 사주가 당신 것 맞나요?',
    sera:'잠깐, 먼저 확인할게요. 이 프로필이 맞나요?',
    red:'근데 먼저 프로필 확인해줘요. 엉뚱한 사람 사주 보면 안 되니까.'
  };
  setTimeout(function(){pcAppendPersona(confirmLines[id]||'먼저 프로필을 확인해볼게요.');},800);

  // 프로필 확인 카드
  setTimeout(function(){
    var def=getDefaultProfile();
    var wrap=document.createElement('div');
    wrap.style.cssText='margin:8px 0;';
    wrap.setAttribute('data-pccard','1');
    if(def){
      var noH=(def.hour===99||def.hour===undefined);
      var sajuShort=def.saju||'-';
      var timeStr=noH?'시간모름':(p2(def.hour)+'시'+(def.min===30?'30분':''));
      var dateStr=def.gY+'년 '+p2(def.gM)+'월 '+p2(def.gD)+'일 '+timeStr;
      var cityStr=def.cityName?' · '+def.cityName+'':'';
      wrap.innerHTML='<div style="background:rgba(22,16,50,.8);border:1px solid rgba(255,255,255,.12);border-radius:20px;padding:16px;font-size:13px;">'
        +'<div style="font-size:11px;color:var(--muted);margin-bottom:10px;letter-spacing:1px;">이 프로필로 시작할까요?</div>'
        +'<div style="display:flex;align-items:center;gap:10px;margin-bottom:12px;">'
        +'<div style="width:40px;height:40px;border-radius:50%;background:'+(def.gen==='male'?'rgba(96,165,250,.2)':'rgba(244,114,182,.2)')+';border:2px solid '+(def.gen==='male'?'rgba(96,165,250,.4)':'rgba(244,114,182,.4)')+';display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0;">'+(def.gen==='male'?'♂':'♀')+'</div>'
        +'<div><div style="font-size:15px;color:var(--gold2);font-weight:700;font-family:Gowun Dodum,serif;">'+escH(def.name)+'</div>'
        +'<div style="font-size:11px;color:var(--dim);margin-top:2px;">'+dateStr+cityStr+'</div>'
        +'<div style="font-size:11px;color:var(--muted);letter-spacing:2px;margin-top:2px;">'+sajuShort+'</div>'
        +'</div></div>'
        +'<div style="display:flex;gap:8px;">'
        +'<button onclick="pcConfirmProfile(true)" style="flex:1;height:42px;background:linear-gradient(135deg,#b87800,#f0c060);border:none;border-radius:12px;color:#1a0d00;font-size:13px;font-weight:700;cursor:pointer;font-family:Pretendard;">✓ 이 프로필로 시작</button>'
        +'<button onclick="pcConfirmProfile(false)" style="flex:1;height:42px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:12px;color:var(--dim);font-size:13px;cursor:pointer;font-family:Pretendard;">다른 프로필</button>'
        +'</div></div>';
    } else {
      wrap.innerHTML='<div style="background:rgba(22,16,50,.8);border:1px solid rgba(255,255,255,.12);border-radius:20px;padding:16px;text-align:center;">'
        +'<div style="font-size:13px;color:var(--muted);margin-bottom:12px;">저장된 프로필이 없어요. 프로필을 먼저 만들어야 사주 기반 답변을 드릴 수 있어요.</div>'
        +'<button onclick="goScreen(\'profileManageScreen\');renderProfileScreen()" style="height:40px;padding:0 20px;background:rgba(240,192,96,.15);border:1px solid rgba(240,192,96,.3);border-radius:12px;color:var(--gold2);font-size:13px;cursor:pointer;font-family:Pretendard;">프로필 추가하기 →</button>'
        +'</div>';
    }
    var c=document.getElementById('personaChat');if(c)c.appendChild(wrap);
    setTimeout(function(){if(c)c.scrollTop=c.scrollHeight;},50);
  },1400);

  goScreen('personaChatScreen');
}

function renderPersonaRecentList(){renderPersonaRecentList2();}

function pcAppendPersona(text){
  var chat=document.getElementById('personaChat');if(!chat)return;
  var p=PERSONAS[_curPersonaId];
  var rendered=pcMdToHtml(text);

  var wrap=document.createElement('div');
  wrap.style.cssText='display:flex;flex-direction:column;gap:0;margin-bottom:20px;animation:fadeInUp .25s ease;';
  wrap.innerHTML=
    // 캐릭터 헤더 (작게)
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;padding-left:4px;">'
    +_avHtml(p,28,9)
    +'<span style="font-size:12px;font-weight:600;color:rgba(220,200,255,.6);letter-spacing:.5px;">'+(p?p.name:'')+'</span>'
    +'</div>'
    // 말풍선
    +'<div style="background:'+pcBubbleColor()+';border:1px solid '+pcBubbleBorder()+';border-radius:4px 18px 18px 18px;padding:14px 17px;">'
    +'<div style="font-size:13px;line-height:1.8;color:rgba(235,228,255,.9);word-break:keep-all;">'+rendered+'</div>'
    +'</div>';

  chat.appendChild(wrap);
  if(!_pcUserScrolled){
    setTimeout(function(){if(!_pcUserScrolled)chat.scrollTop=chat.scrollHeight;},80);
  }
}

function pcAppendUser(text){
  var chat=document.getElementById('personaChat');if(!chat)return;
  _pcUserScrolled=false;
  _pcInitScrollWatch();
  var wrap=document.createElement('div');
  wrap.setAttribute('data-user-msg','1');
  wrap.style.cssText='display:flex;justify-content:flex-end;margin-bottom:16px;animation:fadeInUp .2s ease;';
  wrap.innerHTML='<div style="background:linear-gradient(135deg,rgba(124,58,237,.45),rgba(139,92,246,.3));border:1px solid rgba(139,92,246,.35);border-radius:18px 4px 18px 18px;padding:10px 14px;max-width:76%;font-size:13px;color:rgba(235,225,255,.95);line-height:1.65;">'+text+'</div>';
  chat.appendChild(wrap);
  setTimeout(function(){if(!_pcUserScrolled)wrap.scrollIntoView({behavior:'smooth',block:'start'});},50);
}

function pcAppendLoading(){
  var chat=document.getElementById('personaChat');if(!chat)return;
  var wrap=document.createElement('div');
  wrap.id='pcLoading';wrap.style.cssText='display:flex;flex-direction:column;gap:0;margin-bottom:8px;animation:fadeInUp .2s ease;';
  var p=PERSONAS[_curPersonaId];
  var msgs=_loadingMsgs[_curPersonaId]||['읽는 중...'];
  var idx=0;
  wrap.innerHTML=
    '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;padding-left:4px;">'
    +_avHtml(p,28,9)
    +'<span style="font-size:12px;font-weight:600;color:rgba(220,200,255,.6);">'+(p?p.name:'')+'</span>'
    +'</div>'
    +'<div style="background:'+pcBubbleColor()+';border:1px solid '+pcBubbleBorder()+';border-radius:4px 18px 18px 18px;padding:12px 16px;display:inline-flex;flex-direction:column;gap:8px;">'
    +'<div class="aidots"><span></span><span></span><span></span></div>'
    +'<div id="pcLoadingMsg" style="font-size:11px;color:rgba(200,180,255,.4);font-weight:300;letter-spacing:.3px;">'+msgs[0]+'</div>'
    +'</div>';
  chat.appendChild(wrap);
  if(_loadingInterval) clearInterval(_loadingInterval);
  _loadingInterval=setInterval(function(){
    idx=(idx+1)%msgs.length;
    var el=document.getElementById('pcLoadingMsg');
    if(el) el.textContent=msgs[idx];
  },2800);
  setTimeout(function(){if(!_pcUserScrolled)chat.scrollTop=chat.scrollHeight;},50);
}

function pcStopLoading(){
  if(_loadingInterval){clearInterval(_loadingInterval);_loadingInterval=null;}
  var ld=document.getElementById('pcLoading');
  if(ld&&ld.parentNode) ld.parentNode.removeChild(ld);
}

function _pcInitScrollWatch(){
  var chat=document.getElementById('personaChat');if(!chat)return;
  chat.removeEventListener('scroll',_pcOnScroll);
  chat.addEventListener('scroll',_pcOnScroll);
}

function _pcOnScroll(){
  var chat=document.getElementById('personaChat');if(!chat)return;
  var nearBottom=(chat.scrollHeight-chat.scrollTop-chat.clientHeight)<80;
  _pcUserScrolled=!nearBottom;
}

function _pcBubble(text, delay){
  var chat=document.getElementById('personaChat');if(!chat)return;
  var p=PERSONAS[_curPersonaId];
  var ico=_avHtml(p,32,10);
  setTimeout(function(){
    var wrap=document.createElement('div');
    wrap.style.cssText='display:flex;gap:8px;align-items:flex-start;margin-bottom:8px;';
    wrap.innerHTML=ico+'<div style="background:var(--bg2);border:1px solid var(--gb);border-radius:4px 18px 18px 18px;padding:12px 16px;max-width:85%;font-size:14px;color:var(--dim);line-height:1.75;word-break:keep-all;font-weight:300;">'+text+'</div>';
    chat.appendChild(wrap);
    if(!_pcUserScrolled) chat.scrollTop=chat.scrollHeight;
  }, delay||0);
}

function pcFreeSave(personaId, history){
  var today=getTodayStr();
  var key='msr_pcs_free_'+personaId+'_'+today;
  try{localStorage.setItem(key,JSON.stringify({history:history,date:today}));}catch(e){}
}

function pcFreeLoad(personaId){
  var today=getTodayStr();
  var key='msr_pcs_free_'+personaId+'_'+today;
  try{var d=JSON.parse(localStorage.getItem(key)||'null');return d&&d.date===today?d.history:null;}catch(e){return null;}
}

function pcFreeClean(){
  var today=getTodayStr();
  Object.keys(localStorage).forEach(function(k){
    // 오늘 날짜 포함 안 된 무료 관련 키 전부 삭제
    var isOld=(k.startsWith('msr_pcs_free_')||k.startsWith('msr_fp_cnt_')||k.startsWith('msr_fp_ad_'));
    if(isOld&&k.indexOf(today)<0) localStorage.removeItem(k);
  });
}

function pcGetSessions(personaId){
  try{
    var all=JSON.parse(localStorage.getItem('msr_pc_'+personaId)||'[]');
    var p=PERSONAS[personaId];
    var days=p?PC_EXPIRE[p.tier]:0;
    if(days<=0)return [];
    var cutoff=Date.now()-days*86400000;
    return all.filter(function(s){return s.updatedAt>cutoff;});
  }catch(e){return [];}
}

function pcSaveSessions(personaId,sessions){
  localStorage.setItem('msr_pc_'+personaId,JSON.stringify(sessions));
}

function openPersonaSessionList(id){
  var p=PERSONAS[id];if(!p)return;
  _curPersonaId=id;
  // 제목 설정
  var title=document.getElementById('pslTitle');if(title)title.textContent=p.avatar+' '+p.name+' 대화';
  var sub=document.getElementById('pslSub');if(sub)sub.textContent=(p.tier==='standard'?'7일':'30일')+' 동안 대화 내역이 유지돼요';
  renderPersonaSessionList(id);
  goScreen('personaSessionScreen');
}

function renderPersonaSessionList(personaId){
  var el=document.getElementById('pslList');if(!el)return;
  var sessions=pcGetSessions(personaId);
  var p=PERSONAS[personaId];
  if(!sessions.length){
    el.innerHTML='<div style="text-align:center;padding:40px 20px;color:var(--muted);font-size:13px;">아직 대화 내역이 없어요<br><span style="font-size:11px;font-weight:300;margin-top:8px;display:block;">아래 버튼으로 새 대화를 시작해보세요</span></div>';
    return;
  }
  el.innerHTML=sessions.map(function(s){
    var d=new Date(s.updatedAt);
    var dateStr=(d.getMonth()+1)+'월 '+d.getDate()+'일 '+p2(d.getHours())+':'+p2(d.getMinutes());
    return '<div style="background:rgba(22,16,50,.6);border:1px solid rgba(255,255,255,.08);border-radius:18px;padding:16px;margin-bottom:8px;display:flex;align-items:flex-start;gap:12px;cursor:pointer;" onclick="openSessionChat(\''+personaId+'\',\''+s.id+'\')">'
      +(p.imgSrc?'<div style="width:36px;height:36px;border-radius:10px;overflow:hidden;flex-shrink:0;border:1px solid '+p.border+';"><img src="'+p.imgSrc+'" style="width:100%;height:100%;object-fit:cover;"/></div>':'<div style="font-size:22px;flex-shrink:0;">'+p.avatar+'</div>')
      +'<div style="flex:1;min-width:0;">'
      +'<div style="font-size:13px;color:var(--text);font-weight:600;margin-bottom:4px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+s.title+'</div>'
      +'<div style="font-size:11px;color:var(--muted);white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">'+s.lastMsg+'</div>'
      +'<div style="font-size:10px;color:rgba(255,255,255,.2);margin-top:4px;">'+dateStr+'</div>'
      +'</div>'
      +'<button onclick="event.stopPropagation();pcDeleteSession(\''+personaId+'\',\''+s.id+'\')" style="flex-shrink:0;width:28px;height:28px;border-radius:8px;background:rgba(248,113,113,.1);border:1px solid rgba(248,113,113,.2);color:#f87171;font-size:12px;cursor:pointer;">✕</button>'
      +'</div>';
  }).join('');
}

function openSessionChat(personaId,sessionId){
  var sessions=pcGetSessions(personaId);
  var sess=sessions.find(function(s){return s.id===sessionId;});
  if(!sess)return;
  var p=PERSONAS[personaId];
  _curPersonaId=personaId;
  _curSessionId=sessionId;
  _personaHistory=sess.history||[];
  // 상단 세팅
  var av=document.getElementById('pcAvatar');if(av){if(p.imgSrc){av.style.backgroundImage='url('+p.imgSrc+')';av.style.backgroundSize='cover';av.style.backgroundPosition='center';av.textContent='';av.style.background='none';}else{av.textContent=p.avatar;av.style.background=p.color;}av.style.border='2px solid '+p.border;av.style.boxShadow='0 0 12px '+p.border;}
  var nm=document.getElementById('pcName');if(nm)nm.textContent=p.name;
  var tl=document.getElementById('pcTagline');if(tl)tl.textContent=p.tagline;
  // 이전 대화 복원
  var chat=document.getElementById('personaChat');if(!chat)return;
  chat.innerHTML='';
  _personaHistory.forEach(function(m){
    if(m.role==='user') pcAppendUser(m.content);
    else pcAppendPersona(m.content);
  });
  goScreen('personaChatScreen');
}

function startNewPersonaSession(personaId){
  var p=PERSONAS[personaId];if(!p)return;
  _curPersonaId=personaId;
  _curSessionId='ps_'+Date.now();
  _personaHistory=[];
  var av=document.getElementById('pcAvatar');if(av){if(p.imgSrc){av.style.backgroundImage='url('+p.imgSrc+')';av.style.backgroundSize='cover';av.style.backgroundPosition='center';av.textContent='';av.style.background='none';}else{av.textContent=p.avatar;av.style.background=p.color;}av.style.border='2px solid '+p.border;av.style.boxShadow='0 0 12px '+p.border;}
  var nm=document.getElementById('pcName');if(nm)nm.textContent=p.name;
  var tl=document.getElementById('pcTagline');if(tl)tl.textContent=p.tagline;
  var chat=document.getElementById('personaChat');
  if(chat){
    chat.innerHTML='';
    var greets={luna:'안녕하세요. 오늘 마음이 어떤지 먼저 여쭤봐도 될까요?',baekho:'네, 말씀하세요. 지금 상황 정확하게 짚어드릴게요.',hades:'무엇이 알고 싶으신가요.',sera:'어서오세요. 무엇이 반복되고 있나요?',red:'말해봐요. 듣고 싶지 않은 말도 해줄 준비 됐어요.'};
    pcAppendPersona(greets[personaId]||'안녕하세요.');
  }
  goScreen('personaChatScreen');
}

function openAddProfileScreen(){
  _editingProfId=null;
  var t=document.getElementById('addProfileScreenTitle');
  var btn=document.getElementById('apSaveBtn');
  if(t) t.textContent='프로필 추가';
  if(btn) btn.textContent='저장하기';
  document.getElementById('apName').value='';
  document.getElementById('apDateInput').value='';
  document.getElementById('apTimeInput').value='12:00';
  apAS={cal:'solar',gen:'male'};
  apSetCal('solar');apSetGen('male');
  _apNoHour=false;_apUpdateNoHourUI();
  // 도시 초기화
  _apCity=CITY_LIST[0];
  var cg=document.getElementById('apCityGrid');if(cg)cg.innerHTML='';
  apBuildCityGrid();
  goScreen('addProfileScreen');
}

function openEditProfileScreen(p){
  _editingProfId=p.id;
  var t=document.getElementById('addProfileScreenTitle');
  var btn=document.getElementById('apSaveBtn');
  if(t) t.textContent='프로필 수정';
  if(btn) btn.textContent='수정 저장';
  document.getElementById('apName').value=p.name||'';
  var yy=String(p.gY||1990);
  var mm=String(p.gM||1).padStart(2,'0');
  var dd=String(p.gD||1).padStart(2,'0');
  document.getElementById('apDateInput').value=yy+'-'+mm+'-'+dd;
  _apNoHour=(p.hour===99||p.hour===undefined);
  var hh=_apNoHour?12:(p.hour||12);
  document.getElementById('apTimeInput').value=String(hh).padStart(2,'0')+':'+(p.min===30?'30':'00');
  apAS={cal:p.cal||'solar',gen:p.gen||'male'};
  apSetCal(apAS.cal);apSetGen(apAS.gen);
  _apUpdateNoHourUI();
  // 도시: 기존 프로필에서 복원
  var cityIdx=0;
  if(p.birthCity){
    var fi=CITY_LIST.findIndex(function(c){return c.name===p.birthCity;});
    if(fi>=0)cityIdx=fi;
  }
  _apCity=CITY_LIST[cityIdx];
  var cg=document.getElementById('apCityGrid');if(cg)cg.innerHTML='';
  apBuildCityGrid();
  apSelectCity(cityIdx);
  goScreen('addProfileScreen');
}

async function saveNewProfile(){
  var name=document.getElementById('apName').value.trim();
  if(!name){showToast('닉네임을 입력해주세요');return;}

  var dateVal=document.getElementById('apDateInput').value; // 'YYYY-MM-DD'
  if(!dateVal){showToast('생년월일을 선택해주세요');return;}
  var parts=dateVal.split('-');
  var y=parseInt(parts[0]),m=parseInt(parts[1]),d=parseInt(parts[2]);

  var timeVal=document.getElementById('apTimeInput').value; // 'HH:MM'
  var h=12,min=0;
  if(!_apNoHour&&timeVal){
    var tp=timeVal.split(':');
    h=parseInt(tp[0])||12;
    min=parseInt(tp[1])||0;
    // 30분 단위 반올림
    min=min>=30?30:0;
  }
  var finalH=_apNoHour?99:h;
  var finalMin=_apNoHour?0:min;

  var gY=y,gM=m,gD=d;
  if(apAS.cal==='lunar'){
    var isLeap=apAS.leap||false;
    var g=l2g(y,m,d,isLeap);
    if(!g){
      // 윤달로 실패했으면 평달로 재시도
      if(isLeap){
        g=l2g(y,m,d,false);
        if(g) showToast('윤달 데이터 없음. 평달로 저장했어요.');
      }
      if(!g){showToast('유효하지 않은 음력 날짜예요. 날짜를 확인해주세요.');return;}
    }
    gY=g.year;gM=g.month;gD=g.day;
  }

  var s;
  try{s=await callCalcApiWithGender(gY,gM,gD,finalH,apAS.gen==='male');}
  catch(e){showToast('날짜를 다시 확인해주세요');return;}

  var profData={
    name:name,gen:apAS.gen,gY:gY,gM:gM,gD:gD,
    hour:finalH,min:finalMin||0,cal:apAS.cal,
    cityName:_apCity.name,cityLat:_apCity.lat,cityLon:_apCity.lon,
    saju:(typeof CH!=='undefined')?CH[s.ys]+JH[s.yb]+' '+CH[s.ms]+JH[s.mb]+' '+CH[s.ds]+JH[s.db]+' '+(finalH===99?'?':CH[s.hs]+JH[s.hb]):''
  };

  if(_editingProfId){
    var ps=getProfiles();
    var idx=ps.findIndex(function(x){return x.id===_editingProfId;});
    if(idx>=0){ps[idx]=Object.assign(ps[idx],profData);saveProfiles(ps);}
    showToast('✓ '+name+'님 프로필이 수정됐어요!');
  } else {
    addProfile(profData);
    showToast('✓ '+name+'님 프로필이 저장됐어요!');
  }
  goScreen('profileManageScreen');
  renderProfileScreen();
  renderSajuProfList&&renderSajuProfList();
  renderSettingsProfile&&renderSettingsProfile();
}

function _profCardHTML(p,isDef,clickFn,showActions){
  var noH=(p.hour===99||p.hour===undefined)?'시간모름':(p2(p.hour)+'시 '+p2(p.min||0)+'분');
  var h='<div class="prof-card'+(isDef?' default':'')+'" onclick="'+clickFn+'">'
    +'<div class="prof-avatar '+(p.gen==='male'?'m':'f')+'">'+(p.gen==='male'?'♂':'♀')+'</div>'
    +'<div class="prof-info">'
    +'<div class="prof-name">'+escH(p.name||'이름없음')+(isDef?'<span class="prof-badge">대표</span>':'')+'</div>'
    +'<div class="prof-saju">'+(p.saju||'')+'</div>'
    +'<div class="prof-date">'+p.gY+'년 '+p2(p.gM)+'월 '+p2(p.gD)+'일 '+noH+'</div>'
    +'</div>';
  if(showActions){
    h+='<div class="prof-actions">'
      +(isDef?'<button class="prof-btn star" onclick="event.stopPropagation()">★</button>'
        :'<button class="prof-btn" onclick="setDefaultProf(\''+p.id+'\');event.stopPropagation()">☆</button>')
      +'<button class="prof-btn" onclick="if(confirm(\'삭제할까요?\'))deleteProfile(\''+p.id+'\');event.stopPropagation()">×</button>'
      +'</div>';
  }
  h+='</div>';
  return h;
}

function renderSajuProfList(){
  var el=document.getElementById('sajuProfList');if(!el)return;
  var ps=getProfiles(),did=getDefaultProfileId();
  var def=ps.find(function(x){return x.id===did;})||ps[0];

  if(!def){
    el.innerHTML='<div style="text-align:center;padding:18px;font-size:12px;color:var(--muted);background:rgba(255,255,255,.03);border:1px dashed rgba(255,255,255,.08);border-radius:16px;margin-bottom:8px;">선택된 프로필이 없어요<br><span style="font-size:11px;">내 정보에서 프로필을 추가·선택해주세요</span></div>';
    var mw=document.getElementById('sajuManseryeokWrap');if(mw)mw.style.display='none';
    return;
  }

  var noH=(def.hour===99||def.hour===undefined)?'시간모름':(p2(def.hour)+'시 '+p2(def.min||0)+'분');
  el.innerHTML='<div class="prof-card default" style="cursor:default;margin-bottom:8px;">'
    +'<div class="prof-avatar '+(def.gen==='male'?'m':'f')+'">'+(def.gen==='male'?'♂':'♀')+'</div>'
    +'<div class="prof-info">'
    +'<div class="prof-name">'+escH(def.name||'이름없음')+'<span class="prof-badge">선택됨</span></div>'
    +'<div class="prof-saju">'+(def.saju||'')+'</div>'
    +'<div class="prof-date">'+def.gY+'년 '+p2(def.gM)+'월 '+p2(def.gD)+'일 '+noH+'</div>'
    +'</div>'
    +'<button onclick="goScreen(\'profileManageScreen\');renderProfileScreen()" style="background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.12);border-radius:10px;color:var(--dim);font-size:11px;padding:6px 10px;cursor:pointer;white-space:nowrap;font-family:Pretendard;">변경</button>'
    +'</div>';

  setTimeout(function(){loadProfileAndShowTable(def.id);},250);
}

function loadProfileAndShowTable(id){
  var ps=getProfiles(),p=ps.find(function(x){return x.id===id;});if(!p)return;
  setCal&&setCal(p.cal||'solar');
  setGen&&setGen(p.gen);
  function sv(pid,val){
    if(!pd||!pd.length)return;
    var d=pd.find(function(x){return x.id===pid;});if(!d)return;
    var idx=d.items.findIndex(function(x){return x.v===val;});
    if(idx>=0)setIdx(pid,idx,pi[pid],true);
  }
  sv('year',p.gY);sv('month',p.gM);sv('day',p.gD);
  var h=(p.hour===99||p.hour===undefined)?99:p.hour;
  sv('hour',h);sv('min',p.min>=15&&p.min<45?30:0);
  setTimeout(function(){
    calcMain&&calcMain();
    setTimeout(function(){renderSajuMiniTable(p);},350);
  },200);
}

function renderSajuMiniTable(p){
  var mw=document.getElementById('sajuManseryeokWrap');
  var mt=document.getElementById('sajuMiniTable');
  if(!mw||!mt)return;
  if(typeof LD==='undefined'||!LD){mw.style.display='none';return;}

  var labels=['년주','월주','일주','시주'];
  var noHour=(p.hour===99||p.hour===undefined);
  var stems=[CH[LD.ys],CH[LD.ms],CH[LD.ds],noHour?'?':CH[LD.hs]];
  var branches=[JH[LD.yb],JH[LD.mb],JH[LD.db],noHour?'?':JH[LD.hb]];
  var stemColors={'甲':'#4ade80','乙':'#4ade80','丙':'#f87171','丁':'#f87171','戊':'#facc15','己':'#facc15','庚':'#93c5fd','辛':'#93c5fd','壬':'#a78bfa','癸':'#a78bfa'};

  var table='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:6px;">';
  for(var i=0;i<4;i++){
    var sc=stemColors[stems[i]]||'var(--gold2)';
    table+='<div style="background:rgba(22,16,50,.7);border:1px solid rgba(255,255,255,.09);border-radius:14px;padding:12px 4px;text-align:center;">'
      +'<div style="font-size:9px;color:var(--muted);letter-spacing:1px;margin-bottom:6px;font-weight:400;">'+labels[i]+'</div>'
      +'<div style="font-family:Gowun Dodum,serif;font-size:24px;font-weight:700;color:'+sc+';line-height:1.2;margin-bottom:4px;">'+stems[i]+'</div>'
      +'<div style="font-family:Gowun Dodum,serif;font-size:24px;color:var(--text);font-weight:600;line-height:1.2;">'+branches[i]+'</div>'
      +'</div>';
  }
  table+='</div>';
  mt.innerHTML=table;
  mw.style.display='block';
}

function loadProfileToCalc(id){
  var ps=getProfiles(),p=ps.find(function(x){return x.id===id;});if(!p)return;
  hideSajuPicker();
  setTimeout(function(){
    setCal&&setCal(p.cal||'solar');
    setGen&&setGen(p.gen);
    function sv(pid,val){
      if(!pd||!pd.length)return;
      var d=pd.find(function(x){return x.id===pid;});if(!d)return;
      var idx=d.items.findIndex(function(x){return x.v===val;});
      if(idx>=0)setIdx(pid,idx,pi[pid],true);
    }
    sv('year',p.gY);sv('month',p.gM);sv('day',p.gD);
    var h=(p.hour===99||p.hour===undefined)?99:p.hour;
    sv('hour',h);sv('min',p.min>=15&&p.min<45?30:0);
    setTimeout(function(){calcMain&&calcMain();},400);
  },150);
}

function showSajuPicker(){
  var w=document.getElementById('sajuProfWrap'),p=document.getElementById('sajuPickerWrap');
  if(w)w.style.display='none';if(p)p.style.display='block';
}

function hideSajuPicker(){
  var w=document.getElementById('sajuProfWrap'),p=document.getElementById('sajuPickerWrap');
  if(w)w.style.display='block';if(p)p.style.display='none';
}

function openProfSaveModal(){
  if(typeof LD==='undefined'||!LD){showToast('먼저 사주를 계산해주세요');return;}
  _pendingProfileData=LD;
  document.getElementById('profNameInput').value='';
  var bi=document.getElementById('profBirthInput');
  if(bi&&LD.gY) bi.value=LD.gY+'년 '+p2(LD.gM)+'월 '+p2(LD.gD)+'일'+(LD.hV===99?' (시간모름)':' '+p2(LD.hV)+'시');
  document.getElementById('profSaveModal').classList.add('show');
  setTimeout(function(){document.getElementById('profNameInput').focus();},300);
}

function closeProfSaveModal(){
  document.getElementById('profSaveModal').classList.remove('show');
  _pendingProfileData=null;
}

function confirmSaveProfile(){
  var name=document.getElementById('profNameInput').value.trim();
  if(!name){showToast('닉네임을 입력해주세요');return;}
  if(!_pendingProfileData){closeProfSaveModal();return;}
  var d=_pendingProfileData;
  addProfile({
    name:name,gen:d.gen,gY:d.gY,gM:d.gM,gD:d.gD,
    hour:d.hV,min:d.minV||0,
    saju:(typeof CH!=='undefined')?CH[d.ys]+JH[d.yb]+' '+CH[d.ms]+JH[d.mb]+' '+CH[d.ds]+JH[d.db]+' '+(d.hV===99||d.noHour?'?':CH[d.hs]+JH[d.hb]):'',
    noHour:d.noHour||false,cal:'solar'
  });
  closeProfSaveModal();
  showToast('👤 '+name+'님 프로필 저장 완료!');
  renderProfileScreen();renderSajuProfList();
}

function renderUnseHome(){
  // 날짜
  var days=['일','월','화','수','목','금','토'],d=new Date();
  var dl=document.getElementById('uhDate');
  if(dl) dl.textContent=(d.getMonth()+1)+'월 '+d.getDate()+'일 '+days[d.getDay()]+'요일';
  // 미니복채
  var ml=document.getElementById('uhMini');if(ml) ml.textContent=getMiniBokchaeCnt();
  // 프로필 아이콘
  var pp=document.getElementById('uhProf');
  if(pp){var def=getDefaultProfile();pp.textContent=def?(def.gen==='male'?'♂':'♀'):'👤';}
  // 30분 패스
  var pass=isPassActive();
  var ph=document.getElementById('uhPass');
  var pt=document.getElementById('uhPassTxt');
  if(ph){
    if(pass){
      ph.style.display='flex';
      var until=parseInt(localStorage.getItem('ad_free_until')||'0');
      var diff=Math.max(0,Math.floor((until-Date.now())/1000));
      var mm=String(Math.floor(diff/60)).padStart(2,'0');
      var ss=String(diff%60).padStart(2,'0');
      if(pt) pt.textContent=mm+':'+ss;
    } else {
      ph.style.display='none';
    }
  }
  // 오늘 운세 점수
  var today=getTodayStr();
  var _def2=getDefaultProfile();
  var _pid2=_def2?_def2.id:'default';
  var sc=localStorage.getItem('msr_today_score_'+_pid2+'_'+today);
  var tsd=document.getElementById('uhTodayScore');
  if(tsd){
    if(sc){var n=parseInt(sc);var col=n>=80?'#4ade80':n>=60?'var(--gold2)':n>=40?'#fb923c':'#f87171';tsd.innerHTML='오늘 점수 <span style="font-family:Gowun Dodum,serif;font-size:18px;font-weight:700;color:'+col+';">'+n+'점</span>';}
    else tsd.textContent='오늘 운세 점수를 확인해보세요';
  }
  // 캐러셀 시작
  clearInterval(_uhTimer);
  _uhTimer=setInterval(function(){uhGoSlide((_uhIdx+1)%_uhTotal);},4500);
  uhGoSlide(0);
  // 스와이프
  var car=document.querySelector('#unseHomeScreen [style*="position:relative;overflow:hidden;border-radius:24px"]');
  if(car&&!car._uhSwipe){
    car._uhSwipe=true;
    car.addEventListener('touchstart',function(e){_uhStartX=e.touches[0].clientX;clearInterval(_uhTimer);},{passive:true});
    car.addEventListener('touchend',function(e){
      var dx=e.changedTouches[0].clientX-_uhStartX;
      if(dx<-40)uhGoSlide(_uhIdx+1);else if(dx>40)uhGoSlide(_uhIdx-1);
      _uhReset();
    },{passive:true});
  }
}

function goUnse(type){
  if(!requireProfile()) return;
  UNSE_TYPE=type;
  document.getElementById('unseTopTitle').textContent=type==='today'?'오늘의 운세':'내일의 운세';
  goScreen('unseScreen');
  var res=document.getElementById('uResult');if(res)res.style.display='none';
  // 기본 프로필 자동 실행
  var def=getDefaultProfile();
  if(def){
    setTimeout(function(){_runUnseForProfile(def.id,def.name);},300);
  }
}

function _applyUnseBlur(){
  if(_skipUnseBlur){_skipUnseBlur=false;return;} // 메인 광고 후 스킵
  var overlay=document.getElementById('unseBlurOverlay');
  var content=document.getElementById('unseContent');
  var btn=document.getElementById('unseMoreBtn');
  if(!overlay||!content)return;
  if(isPassActive()){
    // 패스 있음: 블러 없이 바로 공개, 버튼은 "더보기"로만 표시
    overlay.style.display='block';
    content.style.filter='blur(5px)';
    content.style.maxHeight='200px';
    content.style.overflow='hidden';
    content.style.pointerEvents='none';
    if(btn){btn.textContent='✦ 더보기';btn.style.background='rgba(240,192,96,.2)';btn.style.border='1px solid rgba(240,192,96,.4)';btn.style.color='var(--gold2)';}
  } else {
    overlay.style.display='block';
    content.style.filter='blur(5px)';
    content.style.maxHeight='200px';
    content.style.overflow='hidden';
    content.style.pointerEvents='none';
    if(btn){btn.textContent='🔒 광고보고 더보기';btn.style.background='linear-gradient(135deg,#b87800,#f0c060,#ffd97a,#f0c060,#b87800)';btn.style.border='none';btn.style.color='#1a0d00';}
  }
}

function handleUnseMore(){
  if(isPassActive()){_unblurUnse();return;}
  openAdModal(function(){_unblurUnse();});
}

function _unblurUnse(){
  var overlay=document.getElementById('unseBlurOverlay');
  var content=document.getElementById('unseContent');
  if(overlay) overlay.style.display='none';
  if(content){
    content.style.filter='none';
    content.style.maxHeight='none';
    content.style.overflow='visible';
    content.style.pointerEvents='auto';
  }
}

function _mainUnseAdCheck(){
  if(isSubscribed()){var bl=document.getElementById('mainUnseBlur');if(bl)bl.style.display='none';navUnse('today');return;}
  var freeUntil=parseInt(localStorage.getItem('ad_free_until')||'0');
  var active=Date.now()<freeUntil;
  if(active){
    var bl=document.getElementById('mainUnseBlur');
    if(bl) bl.style.display='none';
    _skipUnseBlur=true;
    navUnse('today');
    return;
  }
  openAdModal(function(){
    var bl=document.getElementById('mainUnseBlur');
    if(bl) bl.style.display='none';
    _skipUnseBlur=true;
    navUnse('today');
  });
}

function _mainUpdateUnseBox(){
  var freeUntil=parseInt(localStorage.getItem('ad_free_until')||'0');
  var active=Date.now()<freeUntil;
  // 오늘 이미 운세 봤는지 확인
  var def=getDefaultProfile();
  var today=getTodayStr();
  var scoreKey=def?'msr_today_score_'+def.id+'_'+today:null;
  var hasSeen=scoreKey&&localStorage.getItem(scoreKey)!==null;
  var show=active||hasSeen; // 30분 패스 or 이미 봤으면 블러 없음
  var bl=document.getElementById('mainUnseBlur');
  var box=document.getElementById('mainUnseBox');
  if(bl) bl.style.display=show?'none':'flex';
  if(box) box.onclick=show?function(){navUnse('today');}:null;
  // 점수/닉네임 동기화 (mainTodayCard와 동일)
  var def=getDefaultProfile();
  var nick=document.getElementById('mainUnseNick');
  var desc=document.getElementById('mainUnseDesc');
  var num=document.getElementById('mainUnseScoreNum');
  if(nick) nick.textContent=def?def.name+'님의 오늘 운세':'';
  // 출석 스트릭 업데이트
  var streakEl=document.getElementById('mainStreakNum');
  if(streakEl){
    var st=parseInt(localStorage.getItem('msr_streak')||'0');
    streakEl.textContent=st;
  }
}

function updateMainTodayCard(){
  var def=getDefaultProfile();
  var nick=document.getElementById('mainUnseNick')||document.getElementById('mainTodayNick');
  var desc=document.getElementById('mainUnseDesc')||document.getElementById('mainTodayDesc');
  var scoreEl=document.getElementById('mainUnseScoreNum')||document.getElementById('mainTodayScoreNum');
  var scoreWrap=document.getElementById('mainUnseScore')||document.getElementById('mainTodayScore');
  if(!nick||!desc||!scoreEl||!scoreWrap)return;

  if(!def){
    nick.textContent='';
    desc.textContent='오늘의 운세를 확인해보세요';
    scoreEl.textContent='-';
    scoreEl.style.color='var(--muted)';
    scoreWrap.style.borderColor='rgba(255,255,255,.12)';
    return;
  }

  nick.textContent=def.name+'님의 오늘 운세';

  var today=getTodayStr();
  var scoreKey='msr_today_score_'+def.id+'_'+today;
  var todayScore=localStorage.getItem(scoreKey);
  todayScore=(todayScore!==null&&todayScore!=='')?parseInt(todayScore):null;

  if(todayScore!==null&&todayScore!==undefined){
    var sc=Math.round(todayScore);
    var col=sc>=80?'#4ade80':sc>=60?'var(--gold2)':sc>=40?'#fb923c':'#f87171';
    scoreEl.textContent=sc;
    scoreEl.style.color=col;
    scoreWrap.style.borderColor=col;
    scoreWrap.style.background='rgba(255,255,255,.08)';
    desc.textContent='오늘 운세 총점 '+sc+'점이에요 →';
  } else {
    scoreEl.textContent='?';
    scoreEl.style.color='var(--gold2)';
    scoreWrap.style.borderColor='rgba(240,192,96,.3)';
    scoreWrap.style.background='rgba(240,192,96,.06)';
    desc.textContent='오늘의 운세를 확인해보세요 →';
  }
  _mainUpdateUnseBox();
}

function drawRadar(scores){
  var svg=document.getElementById('uRadar');
  svg.innerHTML='';
  var cx=150,cy=148,R=95,n=5;
  var colors=['#c8a96e','#4a9a6a','#c84a7e','#4a7ec8','#9a6ac8'];
  var labels=['총운','재물운','연애운','직업운','건강운'];
  var angles=[];
  for(var i=0;i<n;i++)angles.push(i*2*Math.PI/n - Math.PI/2);
  function pt(r,i){return [cx+r*Math.cos(angles[i]), cy+r*Math.sin(angles[i])];}

  [20,40,60,80,100].forEach(function(v){
    var pts=[];for(var i=0;i<n;i++){var p=pt(R*v/100,i);pts.push(p[0]+','+p[1]);}
    var poly=document.createElementNS('http://www.w3.org/2000/svg','polygon');
    poly.setAttribute('points',pts.join(' '));
    poly.setAttribute('fill','none');poly.setAttribute('stroke','rgba(200,169,110,0.12)');poly.setAttribute('stroke-width','1');
    svg.appendChild(poly);
  });
  for(var i=0;i<n;i++){
    var p=pt(R,i),line=document.createElementNS('http://www.w3.org/2000/svg','line');
    line.setAttribute('x1',cx);line.setAttribute('y1',cy);line.setAttribute('x2',p[0]);line.setAttribute('y2',p[1]);
    line.setAttribute('stroke','rgba(200,169,110,0.15)');line.setAttribute('stroke-width','1');
    svg.appendChild(line);
  }
  var dataPts=[];for(var i=0;i<n;i++)dataPts.push(pt(R*Math.max(scores[i]||0,4)/100,i));
  var poly=document.createElementNS('http://www.w3.org/2000/svg','polygon');
  poly.setAttribute('points',dataPts.map(function(p){return p[0]+','+p[1];}).join(' '));
  poly.setAttribute('fill','rgba(200,169,110,0.15)');poly.setAttribute('stroke','rgba(200,169,110,0.6)');poly.setAttribute('stroke-width','2');
  svg.appendChild(poly);
  for(var i=0;i<n;i++){
    var dp=dataPts[i];
    var c=document.createElementNS('http://www.w3.org/2000/svg','circle');
    c.setAttribute('cx',dp[0]);c.setAttribute('cy',dp[1]);c.setAttribute('r','5');
    c.setAttribute('fill',colors[i]);c.setAttribute('stroke','#0a0a0f');c.setAttribute('stroke-width','2');
    svg.appendChild(c);
    var lp=pt(R+22,i);
    var t=document.createElementNS('http://www.w3.org/2000/svg','text');
    t.setAttribute('x',lp[0]);t.setAttribute('y',lp[1]+4);t.setAttribute('text-anchor','middle');
    t.setAttribute('font-size','10');t.setAttribute('fill',colors[i]);t.setAttribute('font-family','Noto Sans KR,sans-serif');
    t.textContent=labels[i];
    svg.appendChild(t);
    if(scores[i]>0){
      var sp=pt(R*Math.max(scores[i],4)/100-14,i);
      var st=document.createElementNS('http://www.w3.org/2000/svg','text');
      st.setAttribute('x',sp[0]);st.setAttribute('y',sp[1]+4);st.setAttribute('text-anchor','middle');
      st.setAttribute('font-size','10');st.setAttribute('fill','rgba(240,234,216,0.8)');
      st.textContent=scores[i];svg.appendChild(st);
    }
  }
}

function renderURecent(){
  var h=gh(),el=document.getElementById('uRecentList');
  if(!h.length){
    el.innerHTML='<div style="text-align:center;padding:24px;font-size:12px;color:var(--muted)">저장된 사주가 없습니다<br>직접 입력 탭을 사용해주세요</div>';
    return;
  }
  el.innerHTML=h.map(function(e,i){
    return '<div onclick="handleUnseRecentClick('+i+')" style="background:var(--bg2);border:1px solid var(--gb);border-radius:12px;padding:12px 16px;margin-bottom:8px;cursor:pointer;display:flex;align-items:center;justify-content:space-between">'
      +'<div><div style="font-family:\'Noto Serif KR\',serif;font-size:16px;color:var(--gold2);letter-spacing:4px;margin-bottom:3px">'+e.saju+'</div>'
      +'<div style="font-size:11px;color:var(--dim)">'+e.gY+'년 '+p2(e.gM)+'월 '+p2(e.gD)+'일 '+p2(e.hour)+'시 '+p2(e.min||0)+'분</div></div>'
      +'<div style="display:flex;align-items:center;gap:8px">'
      +'<span style="font-size:11px;padding:3px 8px;border-radius:10px;background:'+(e.gen==='male'?'rgba(74,126,200,.2)':'rgba(200,74,126,.2)')+';color:'+(e.gen==='male'?'#7ab0f0':'#f07ab0')+'">'+(e.gen==='male'?'남 ♂':'여 ♀')+'</span>'
      +'<span style="color:var(--muted);font-size:14px">›</span></div></div>';
  }).join('');
}

function createShareCanvas(title, subtitle, score, items, callback){
  var c=document.createElement('canvas');
  c.width=720; c.height=1080;
  var ctx=c.getContext('2d');

  // 배경 그라데이션
  var bg=ctx.createLinearGradient(0,0,0,1080);
  bg.addColorStop(0,'#0a0a1a');
  bg.addColorStop(1,'#0f0820');
  ctx.fillStyle=bg;
  ctx.fillRect(0,0,720,1080);

  // 별 배경
  ctx.fillStyle='rgba(255,255,255,0.4)';
  for(var i=0;i<80;i++){
    ctx.beginPath();
    ctx.arc(Math.random()*720,Math.random()*1080,Math.random()*1.5,0,Math.PI*2);
    ctx.fill();
  }

  // 상단 골드 라인
  var gl=ctx.createLinearGradient(0,0,720,0);
  gl.addColorStop(0,'transparent');
  gl.addColorStop(0.5,'#f0c060');
  gl.addColorStop(1,'transparent');
  ctx.strokeStyle=gl;
  ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(0,80);ctx.lineTo(720,80);ctx.stroke();

  // 앱 이름
  ctx.font='bold 28px serif';
  ctx.fillStyle='#f0c060';
  ctx.textAlign='center';
  ctx.fillText('🔮 OracAi', 360, 55);

  // 제목
  ctx.font='bold 42px sans-serif';
  ctx.fillStyle='#ffffff';
  ctx.fillText(title, 360, 160);

  // 부제목
  ctx.font='22px sans-serif';
  ctx.fillStyle='rgba(200,180,255,0.8)';
  ctx.fillText(subtitle, 360, 210);

  // 점수 (있으면)
  if(score){
    ctx.font='bold 100px sans-serif';
    ctx.fillStyle='#f0c060';
    ctx.fillText(score, 360, 360);
    ctx.font='24px sans-serif';
    ctx.fillStyle='rgba(255,255,255,0.5)';
    ctx.fillText('점', 360, 400);
  }

  // 내용 항목들
  if(items&&items.length){
    var y=score?480:280;
    var lineH=58;
    items.forEach(function(item,i){
      // 카드 배경
      ctx.fillStyle='rgba(255,255,255,0.05)';
      ctx.beginPath();
      ctx.roundRect(60,y-36,600,50,12);
      ctx.fill();
      ctx.strokeStyle='rgba(255,255,255,0.1)';
      ctx.lineWidth=1;
      ctx.stroke();

      ctx.font='bold 20px sans-serif';
      ctx.fillStyle='#f0c060';
      ctx.textAlign='left';
      ctx.fillText(item.label, 90, y);
      ctx.font='20px sans-serif';
      ctx.fillStyle='rgba(255,255,255,0.85)';
      ctx.textAlign='right';
      ctx.fillText(item.value, 630, y);
      y+=lineH;
    });
  }

  // 하단 라인
  var bl=ctx.createLinearGradient(0,0,720,0);
  bl.addColorStop(0,'transparent');
  bl.addColorStop(0.5,'rgba(240,192,96,0.4)');
  bl.addColorStop(1,'transparent');
  ctx.strokeStyle=bl;
  ctx.lineWidth=1;
  ctx.beginPath();ctx.moveTo(0,980);ctx.lineTo(720,980);ctx.stroke();

  // 하단 문구
  ctx.font='20px sans-serif';
  ctx.fillStyle='rgba(200,180,255,0.6)';
  ctx.textAlign='center';
  ctx.fillText('운명을 꿰뚫는 AI · 사주 · 타로', 360, 1030);

  callback(c.toDataURL('image/png'));
}

function shareImageOrText(title, text, canvasFn){
  // Canvas 이미지 생성 시도
  try{
    canvasFn(function(dataUrl){
      // 이미지를 Blob으로 변환
      var arr=dataUrl.split(','), mime=arr[0].match(/:(.*?);/)[1];
      var bstr=atob(arr[1]), n=bstr.length, u8=new Uint8Array(n);
      while(n--) u8[n]=bstr.charCodeAt(n);
      var blob=new Blob([u8],{type:mime});
      var file=new File([blob],'oracai_result.png',{type:'image/png'});

      if(navigator.share&&navigator.canShare&&navigator.canShare({files:[file]})){
        navigator.share({title:title,text:text,files:[file]}).catch(function(){
          // 이미지 공유 실패 시 텍스트로
          shareTextFallback(title,text);
        });
      } else if(navigator.share){
        navigator.share({title:title,text:text}).catch(function(){});
      } else {
        // 이미지 다운로드 + 클립보드
        var a=document.createElement('a');
        a.href=dataUrl;a.download='oracai_result.png';a.click();
        showToast('이미지가 저장됐어요! 📸');
      }
    });
  }catch(e){
    shareTextFallback(title,text);
  }
}

function shareTextFallback(title,text){
  var shareText=title+'\n\n'+text+'\n\n🔮 OracAi - AI 사주';
  if(navigator.share){
    navigator.share({title:title,text:shareText}).catch(function(){});
  } else {
    try{navigator.clipboard.writeText(shareText).then(function(){showToast('결과가 복사됐어요 📋');});}
    catch(e){showToast('공유하려면 브라우저에서 열어주세요');}
  }
}

function shareUnseResult(){
  var today=new Date();
  var dn=UNSE_TYPE==='today'?'오늘':'내일';
  var title=dn+' 운세 결과';
  var scoreEl=document.getElementById('uTotalScore');
  var score=scoreEl?scoreEl.textContent.replace(/[^0-9]/g,''):'';
  var def=getDefaultProfile();
  var subtitle=(def?def.name+'님의 ':'')+(today.getMonth()+1)+'월 '+today.getDate()+'일';

  // 운세 점수 수집
  var labels=['총운','재물운','연애운','직업운','건강운'];
  var items=[];
  labels.forEach(function(lbl){
    var el=document.getElementById('uLegend');
    var scoreMatch=el?el.textContent.match(new RegExp(lbl+'[^0-9]*([0-9]+)')):null;
    if(scoreMatch) items.push({label:lbl,value:scoreMatch[1]+'점'});
  });

  shareImageOrText(title, subtitle+'의 운세 총점 '+score+'점', function(cb){
    createShareCanvas(title, subtitle, score+'점', items, cb);
  });
}

function shareSajuResult(){
  var def=getDefaultProfile();
  var title='AI 사주 분석 결과';
  var subtitle=def?def.name+'님의 사주 리딩':'OracAi 사주 분석';
  var items=[
    {label:'사주',value:def&&def.saju?def.saju:''},
    {label:'분석',value:'사주+베딕+자미두수 종합'}
  ];
  shareImageOrText(title, subtitle, function(cb){
    createShareCanvas(title, subtitle, null, items, cb);
  });
}

function shareResult(title,text,imageUrl){shareTextFallback(title,text);}

function rewardRateApp(){
  if(localStorage.getItem('reward_rate_done')==='1'){
    showToast('이미 보상을 받으셨어요');return;
  }
  // 앱스토어 리뷰 페이지 열기 (Capacitor 연동 전 임시)
  try{
    if(window.Capacitor&&window.Capacitor.Plugins.Browser){
      window.Capacitor.Plugins.Browser.open({url:'https://apps.apple.com/app/id0000000000'});
    }
  }catch(e){}
  // 확인 모달
  showConfirmModal(
    '앱을 평가해주셨나요?',
    '앱스토어에서 리뷰를 남겨주시면 복채 3개를 드려요.',
    '복채 받기',
    function(){
      localStorage.setItem('reward_rate_done','1');
      addBokchae(3);
      renderBokchae&&renderBokchae();
      _renderRewardBadges();
      showToast('⭐ 감사해요! 복채 3개 지급됐어요');
    }
  );
}

function rewardInstaFollow(){
  if(localStorage.getItem('reward_insta_done')==='1'){
    showToast('이미 보상을 받으셨어요');return;
  }
  // 인스타그램 열기
  try{
    if(window.Capacitor&&window.Capacitor.Plugins.Browser){
      window.Capacitor.Plugins.Browser.open({url:'https://instagram.com/oracai.kr'});
    } else {
      window.open('https://instagram.com/oracai.kr','_blank');
    }
  }catch(e){}
  showConfirmModal(
    '팔로우 하셨나요?',
    '@oracai.kr 팔로우 후 복채 3개를 드려요.',
    '복채 받기',
    function(){
      localStorage.setItem('reward_insta_done','1');
      addBokchae(3);
      renderBokchae&&renderBokchae();
      _renderRewardBadges();
      showToast('📸 팔로우 감사해요! 복채 3개 지급됐어요');
    }
  );
}

function _renderRewardBadges(){
  var rateDone=localStorage.getItem('reward_rate_done')==='1';
  var instaDone=localStorage.getItem('reward_insta_done')==='1';
  var rb=document.getElementById('rateRewardBadge');
  var ib=document.getElementById('instaRewardBadge');
  if(rb) rb.textContent=rateDone?'✓ 받음':'복채 +3';
  if(ib) ib.textContent=instaDone?'✓ 받음':'복채 +3';
}

function _renderPassBadges(){
  var plan=getSubPlan();
  var remain=getPassRemain();
  var isSubbed=plan!==null;
  var passType=plan==='premium'?'프리미엄패스':'AI패스';
  var badgeHtml=isSubbed
    ?'<span style="font-size:11px;color:#c4b5fd;background:rgba(139,92,246,.15);border:0.5px solid rgba(139,92,246,.3);border-radius:20px;padding:3px 10px;">🎫 '+passType+' '+remain+'회 남음</span>'
    :'';

  // 복채 탭 뱃지
  var bcB=document.getElementById('bcPassBadge');
  if(bcB){bcB.innerHTML=badgeHtml;bcB.style.display=isSubbed?'block':'none';}

  // 채팅 입력창 뱃지
  var pcB=document.getElementById('personaPassBadge');
  if(pcB){
    pcB.innerHTML=badgeHtml;
    if(isSubbed){
      // 오늘 무료 사용 현황도 함께
      var subFreeKey='msr_sub_free_'+getTodayStr();
      var subFreeUsed=parseInt(localStorage.getItem(subFreeKey)||'0');
      var freeLeft=Math.max(0,2-subFreeUsed);
      var freeHtml=freeLeft>0?'<span style="font-size:11px;color:#86efac;background:rgba(34,197,94,.1);border:0.5px solid rgba(34,197,94,.3);border-radius:20px;padding:3px 10px;">✓ 오늘 무료 '+freeLeft+'회 남음</span>':'';
      pcB.innerHTML=freeHtml+badgeHtml;
      pcB.style.display='flex';
    } else {
      pcB.style.display='none';
    }
  }

  // 설정 탭 뱃지
  var stB=document.getElementById('settingsPassBadge');
  if(stB){stB.innerHTML=badgeHtml;stB.style.display=isSubbed?'block':'none';}
}

function bcExchange(){
  var mini=getMiniBokchaeCnt();
  if(mini<10){showToast('미니복채가 10개 이상 있어야 환전 가능해요');return;}
  var times=Math.floor(mini/10);
  localStorage.setItem('msr_mini_bokchae', mini-(times*10));
  addBokchae(times);
  showToast('✨→💎 환전 완료! 복채 +'+times+'개');
  renderBokchae();
  renderSettingsProfile&&renderSettingsProfile();
}

function bcWatchAd(){
  var today=getTodayStr();
  var adCnt=parseInt(localStorage.getItem('msr_ad_cnt_'+today)||'0');
  if(adCnt>=5){showToast('오늘 광고 보상은 5회까지예요');return;}
  openRewardAdModal(
    '광고 보고 미니복채 받기',
    '광고 1회 시청하면 미니복채 3개를 드려요.\n오늘 남은 횟수: '+(5-adCnt)+'회',
    function(){
      var cnt=parseInt(localStorage.getItem('msr_ad_cnt_'+today)||'0');
      localStorage.setItem('msr_ad_cnt_'+today, cnt+1);
      addMiniBokchae(3);
      showToast('📺 광고 보상! 미니복채 +3');
      renderBokchae();
      renderSettingsProfile&&renderSettingsProfile();
    }
  );
}

function bcSubscribe(tier){
  var names={lite:'라이트 (9,900원/월)',standard:'스탠다드 (19,900원/월)',premium:'프리미엄 (29,900원/월)'};
  showToast('구독 기능 준비 중이에요: '+names[tier]);
}

function bcBuyPkg(count,price){
  showToast('결제 기능 준비 중이에요: 복채 '+count+'개 ('+parseInt(price).toLocaleString()+'원)');
}

function bcToggleAllPkg(){
  var el=document.getElementById('bcAllPkg');
  var arrow=document.getElementById('bcPkgArrow');
  if(!el)return;
  var open=el.style.display!=='none';
  el.style.display=open?'none':'block';
  if(arrow)arrow.style.transform=open?'':'rotate(180deg)';
}

function openPassModal(){
  var m=document.getElementById('passModal');if(m)m.classList.add('show');
}

function closePassModal(){
  var m=document.getElementById('passModal');if(m)m.classList.remove('show');
}


