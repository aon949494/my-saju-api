/* ═══ OracAi — api.js ═══ */
/* 백엔드 통신 & 구독/광고 로직 */

async function personaSend(){
  var qa=document.getElementById('personaQ');
  if(!qa)return;
  var q=qa.value.trim();
  if(!q)return;
  if(!_curPersonaId){showToast('캐릭터를 선택해주세요');return;}
  if(window._isGenerating){showToast('답변 생성 중이에요. 잠시 기다려주세요.');return;}
  window._isGenerating=true;
  var p=PERSONAS[_curPersonaId];

  // 무료 티어: 하루 1회 무료, 광고 후 1회 추가, 이후 복채 3개 필요
  // ── 무료 & 구독 게이트 ──
  var _subbed=isSubscribed();

  if(_subbed){
    // ── 구독자: 하루 2회 무료 → 패스 차감 → 패스 없으면 복채 → 둘 다 없으면 차단
    var subFreeKey='msr_sub_free_'+getTodayStr();
    var subFreeUsed=parseInt(localStorage.getItem(subFreeKey)||'0');
    var SUB_FREE_LIMIT=2;

    if(!_freePersonaCountedThisSession){
      // 첫 메시지
      if(subFreeUsed<SUB_FREE_LIMIT){
        // 무료 횟수 남음 → 통과, 차감은 아래 응답 후
      } else {
        // 무료 소진 → 패스 체크
        if(getPassRemain()<=0){
          // 패스도 없음 → 복채 체크
          if(getBokchaeCnt()<p.costBokchae){
            window._isGenerating=false;showBokchaeModal();return;
          }
        }
      }
    } else {
      // 두 번째 이후 메시지 (같은 세션)
      if(subFreeUsed<SUB_FREE_LIMIT){
        // 아직 무료 횟수 남음
      } else {
        if(getPassRemain()<=0){
          if(getBokchaeCnt()<p.costBokchae){
            window._isGenerating=false;showBokchaeModal();return;
          }
        }
      }
    }

  } else if(p.tier==='free'){
    // ── 비구독 무료 캐릭터: 하루 1회 무료 → 광고 1회 → 복채
    var usedToday=getFreePersonaToday();
    var adUsed=getFreePersonaAdToday();
    var maxFree=1+adUsed;

    if(!_freePersonaCountedThisSession){
      if(usedToday>=maxFree){
        if(adUsed<1){
          var savedQ=q;
          openRewardAdModal(
            '오늘 무료 횟수를 다 썼어요',
            '젬나·루나·백호는 오늘 1회 무료예요.\n광고 1회 보면 오늘 1회 더 사용할 수 있어요.',
            function(){
              addFreePersonaAdToday();
              _freePersonaCountedThisSession=true;
              var qa2=document.getElementById('personaQ');
              if(qa2) qa2.value=savedQ;
              personaSend();
            }
          );
          window._isGenerating=false;
          return;
        } else {
          // 광고도 봤음 → 복채
          if(getBokchaeCnt()<p.costBokchae){window._isGenerating=false;showBokchaeModal();return;}
        }
      }
    } else {
      var adUsed2=getFreePersonaAdToday();
      var usedToday2=getFreePersonaToday();
      if(usedToday2<1+adUsed2){
        // 무료 남음
      } else if(adUsed2<1){
        var savedQ2=q;
        openRewardAdModal(
          '무료 횟수를 다 썼어요',
          '광고 1회 보면 오늘 1회 더 무료로 사용할 수 있어요.',
          function(){
            addFreePersonaAdToday();
            var qa2=document.getElementById('personaQ');
            if(qa2) qa2.value=savedQ2;
            personaSend();
          }
        );
        window._isGenerating=false;
        return;
      } else {
        if(getBokchaeCnt()<p.costBokchae){window._isGenerating=false;showBokchaeModal();return;}
      }
    }

  } else {
    // ── 비구독 프리미엄 캐릭터: 접근 불가
    // (openPersonaChat에서 이미 막지만 이중 방어)
    if(p.tier==='standard'||p.tier==='premium'){
      if(!canAccessPersona(_curPersonaId)){
        showToast('🔒 '+(p.tier==='standard'?'스탠다드':'프리미엄')+' 구독 전용이에요');
        window._isGenerating=false;
        return;
      }
    }
    // 혹시 접근 됐다면 복채만
    if(getBokchaeCnt()<p.costBokchae){window._isGenerating=false;showBokchaeModal();return;}
  }

  qa.value='';qa.style.height='44px';
  pcAppendUser(q);
  pcAppendLoading();

  var def=getDefaultProfile();
  var sajuInfo='';
  try{ sajuInfo=await callContextApi(def); }catch(e){ sajuInfo=buildRichSajuContext(def)||''; }
  var sysPrompt='';
  try{ sysPrompt=p.system(sajuInfo); }catch(e){ window._isGenerating=false;pcStopLoading();pcAppendPersona('사주 정보를 불러오지 못했어요. 프로필을 확인해주세요.');return; }

  // 히스토리 (최근 6턴, 각 200자로 압축)
  var historyText='';
  // 프리미엄: 더 긴 컨텍스트 (최근 10턴), 무료: 최근 6턴
  var ctxLen=(p.tier==='premium')?10:6;
  var recentHistory=_personaHistory.slice(-ctxLen);
  if(recentHistory.length>1){
    var prefix=p.tier==='premium'?'\n\n[이전 대화 — 이 흐름을 기억하고 이어받아서 답해]\n':'\n\n[이전 대화]\n';
    historyText=prefix+recentHistory.slice(0,-1).map(function(m){
      var maxLen=p.tier==='premium'?300:200;
      var content=m.content.length>maxLen?m.content.slice(0,maxLen)+'...':m.content;
      return (m.role==='user'?'사용자: ':p.name+': ')+content;
    }).join('\n')+'\n\n[현재 질문]\n';
  }
  // system과 user 메시지 분리 전송 (input 토큰 최소화 → output 토큰 최대화)
  var userMsg=historyText+q;

  _personaHistory.push({role:'user',content:q});

  try{
    var ctrl=new AbortController();
    var tid=setTimeout(function(){ctrl.abort();},60000);
    var res;
    try{
      res=await fetch('https://my-saju-api.onrender.com/api/saju',{
        method:'POST',signal:ctrl.signal,
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          model:(['hades','sera','red'].indexOf(_curPersonaId)>=0)?'gemini-pro':'gemini',
          max_tokens:6000,
          mode:'long',
          system:sysPrompt,
          messages:[{role:'user',content:userMsg}]
        })
      });
    } catch(fe){
      clearTimeout(tid);
      pcStopLoading();
      window._isGenerating=false;
      // 히스토리 롤백 (재시도 시 중복 방지)
      if(_personaHistory.length>0&&_personaHistory[_personaHistory.length-1].role==='user'){
        _personaHistory.pop();
      }
      showRetryToast('서버 응답이 느려요. 재시도할까요?', personaSend);
      return;
    }
    clearTimeout(tid);
    if(!res.ok){
      pcStopLoading();
      window._isGenerating=false;
      pcAppendPersona('서버 오류가 났어요 ('+res.status+'). 잠시 후 다시 시도해줘.');
      return;
    }
    var data=await res.json();
      var answer='';
    if(data&&data.content&&Array.isArray(data.content)){
      // 배열의 모든 text 합치기
      answer=data.content.map(function(c){return c.text||'';}).join('');
    } else if(data&&data.content&&typeof data.content==='string'&&data.content.trim()){
      answer=data.content.trim();
    } else if(data&&data.text){
      answer=data.text;
    }
    pcStopLoading();

    if(!answer){
      // 디버그용: 실제 받은 데이터 일부 보여주기
      var raw=JSON.stringify(data).slice(0,100);
      window._isGenerating=false;
      pcAppendPersona('응답 파싱 실패. 개발자 확인 필요 | '+raw);
      return;
    }

    _personaHistory.push({role:'assistant',content:answer});

    if(_subbed){
      // ── 구독자 차감 ──
      var subFreeKeyNow='msr_sub_free_'+getTodayStr();
      var subFreeUsedNow=parseInt(localStorage.getItem(subFreeKeyNow)||'0');
      if(subFreeUsedNow<2){
        // 하루 2회 무료 차감
        localStorage.setItem(subFreeKeyNow, subFreeUsedNow+1);
        _freePersonaCountedThisSession=true;
      } else {
        // 무료 소진 → 패스→복채
        var crS=chargePersonaChat(p.costBokchae);
        if(crS==='pass') showToast('🎫 AI 패스 사용 ('+getPassRemain()+'회 남음)');
        else if(crS==='bokchae') showToast('💎 복채 '+p.costBokchae+'개 사용');
        renderBokchae&&renderBokchae();
        renderSettingsProfile&&renderSettingsProfile();
      }
      pcFreeSave(_curPersonaId,_personaHistory);

    } else if(p.tier==='free'){
      // ── 비구독 무료 캐릭터 차감 ──
      var adUsedNow=getFreePersonaAdToday();
      var usedNow=getFreePersonaToday();
      if(!_freePersonaCountedThisSession){
        addFreePersonaToday();
        _freePersonaCountedThisSession=true;
      } else if(usedNow>=1+adUsedNow){
        var cr1=chargePersonaChat(p.costBokchae);
        if(cr1==='fail'){window._isGenerating=false;showBokchaeModal();return;}
        if(cr1==='pass') showToast('🎫 AI 패스 사용 ('+getPassRemain()+'회 남음)');
        renderBokchae&&renderBokchae();
        renderSettingsProfile&&renderSettingsProfile();
      } else {
        addFreePersonaToday();
      }
      pcFreeSave(_curPersonaId,_personaHistory);

    } else {
      // ── 비구독 프리미엄 캐릭터: 여기 오면 안 됨 (이중 방어)
      if(p.tier==='premium'){
        if(!canAccessPersona(_curPersonaId)){window._isGenerating=false;return;}
      }
      addBokchae(-p.costBokchae);
      renderBokchae&&renderBokchae();
      renderSettingsProfile&&renderSettingsProfile();
    }

    // 첫 질문 수신 확인 멘트
    var ackLines={
      gemna:'응, 봤어.',luna:'그렇군요. 읽어볼게요.',baekho:'음... 신령님께 여쭤보겠습니다.',
      hades:'...보고 있습니다.',sera:'그 감정 들어요. 한번 같이 볼게요.',red:'알겠어요. 솔직하게 말해줄게요.'
    };
    if(_personaHistory.length<=2){
      _pcBubble(ackLines[_curPersonaId]||'살펴볼게요.',0);
      setTimeout(function(){
        window._isGenerating=false;
        pcAppendPersona(answer);
        setTimeout(function(){pcAppendSuggestions(answer);},300);
      },500);
    } else {
      window._isGenerating=false;
      pcAppendPersona(answer);
      setTimeout(function(){pcAppendSuggestions(answer);},300);
    }
    if(p.tier!=='free'&&_curSessionId) pcSaveSession(_curPersonaId,_curSessionId,_personaHistory);
  } catch(e){
    pcStopLoading();
    window._isGenerating=false;
    pcAppendPersona('연결이 끊겼어요. 다시 시도해줘.');
  }
}

function handleSajuRequest() { handleSajuAction(); }

function handleSajuAction() {
    if(isPassActive()) { executeSajuFetch(); } 
    else { openAdModal(executeSajuFetch); } // 광고 성공 후 즉시 사주 가져오기 실행
}

async function executeSajuFetch(){
  if(!LD){showToast('먼저 사주를 계산해주세요');return;}
  var btn=document.getElementById('bai');
  if(btn) btn.disabled=true;

  /* ── 1단계: 로딩 화면 전환 ── */
  goScreen('sajuLoadingScreen');

  // 로딩 화면에 만세력 미니표 표시
  var lmt=document.getElementById('loadingMiniTable');
  if(lmt) renderLoadingMiniTable(lmt);

  // 로딩 메시지 순환
  var msgs=['사주 데이터를 읽는 중...','오행의 흐름을 분석하는 중...','천간지지를 계산하는 중...','운명의 실마리를 찾는 중...','풀이를 완성하는 중...'];
  var mi=0;
  var lmsgEl=document.getElementById('sajuLoadingMsg');
  // transition 제거 (겹침 방지) - JS로만 제어
  if(lmsgEl) lmsgEl.style.transition='none';
  var _lmsgTimer=null;
  var lv=setInterval(function(){
    if(!lmsgEl) return;
    // 이전 타이머 취소
    if(_lmsgTimer) clearTimeout(_lmsgTimer);
    lmsgEl.style.opacity='0';
    _lmsgTimer=setTimeout(function(){
      if(!lmsgEl) return;
      lmsgEl.textContent=msgs[mi++%msgs.length];
      lmsgEl.style.opacity='1';
    },300);
  },2500);

  function stopLoading(){clearInterval(lv);}

  /* ── 캐시 확인 ── */
  var cacheKey='saju_v4_'+LD.sstr.replace(/\s/g,'')+'_'+LD.gen;
  var sajuCache={};
  try{sajuCache=JSON.parse(localStorage.getItem('saju_cache')||'{}');}catch(e){}

  if(sajuCache[cacheKey]&&sajuCache[cacheKey].secs){
    setTimeout(function(){
      stopLoading();
      showSajuResult(sajuCache[cacheKey].secs);
      if(btn) btn.disabled=false; updateTimer();
    },900);
    return;
  }

  /* ── 2단계: API 호출 ── */
  var ctrl=new AbortController(),tid=setTimeout(function(){ctrl.abort();},90000);
  var res;
  try{
    res=await fetch('https://my-saju-api.onrender.com/api/saju',{
      method:'POST',signal:ctrl.signal,headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        model:'gemini',max_tokens:8000,
        system:'당신은 한국 전통 사주명리학 전문가입니다. 반드시 지정된 태그를 사용하세요.',
        messages:[{role:'user',content:buildPrompt(LD)}]
      })
    });
  }catch(e){
    clearTimeout(tid);stopLoading();
    goScreen('calcScreen');
    if(btn) btn.disabled=false;
    showRetryToast(e.name==='AbortError'?'시간이 초과됐어요. 재시도할까요?':'서버 연결 실패. 재시도할까요?', executeSajuFetch);
    return;
  }
  clearTimeout(tid);
  if(!res.ok){
    stopLoading();goScreen('calcScreen');
    if(btn) btn.disabled=false;
    showToast('오류 '+res.status);return;
  }

  var data;try{data=await res.json();}catch(e){
    stopLoading();goScreen('calcScreen');
    if(btn) btn.disabled=false;
    showToast('응답 파싱 실패');return;
  }
  var raw=data.content&&data.content[0]?data.content[0].text||'':'';
  if(!raw){stopLoading();goScreen('calcScreen');if(btn)btn.disabled=false;showToast('응답이 비어있습니다');return;}

  /* ── 파싱 ── */
  var TAGS=[{tag:'TOTAL',id:'total',lbl:'✦ 총운'},{tag:'NATURE',id:'nature',lbl:'⊕ 성격'},{tag:'WEALTH',id:'wealth',lbl:'◈ 재물'},{tag:'LOVE',id:'love',lbl:'♡ 애정'},{tag:'HEALTH',id:'health',lbl:'☽ 건강'}];
  var secs={total:'',nature:'',wealth:'',love:'',health:''};
  raw=raw.replace(/\*\*/g,'').replace(/```[a-z]*\n?/gi,'').replace(/```/g,'');
  var tagFound=false;

  function extractTagContent(text,tag){
    var reg=new RegExp('\\['+tag+'\\]([\\s\\S]*?)(?=\\[\\/?[A-Z_]+\\]|$)','i');
    var m=text.match(reg);
    if(m&&m[1]){
      var txt=m[1].replace(new RegExp('^\\]|^\\s*\\]'),'').trim();
      txt=txt.replace(new RegExp('\\[\\/?'+tag+'\\]','i'),'').trim();
      return txt||'내용을 찾을 수 없습니다.';
    }
    return '내용을 분석할 수 없습니다.';
  }
  for(var i=0;i<TAGS.length;i++){
    var tc=extractTagContent(raw,TAGS[i].tag);
    if(tc!=='내용을 분석할 수 없습니다.') tagFound=true;
    secs[TAGS[i].id]=tc;
  }
  if(!tagFound) secs['total']=raw||'풀이 내용을 찾을 수 없습니다.';

  sajuCache[cacheKey]={secs:secs};
  localStorage.setItem('saju_cache',JSON.stringify(sajuCache));

  stopLoading();

  /* ── 3단계: 결과 화면 전환 ── */
  showSajuResult(secs);
  if(btn) btn.disabled=false; updateTimer();
}

async function reqUnseAI(target){
  var d=uData;
  var cacheKey = 'unse_v3_' + d.sstr.replace(/\s/g,'') + '_' + d.gen;
  var unseCache = {};
  try { unseCache = JSON.parse(localStorage.getItem('unse_cache') || '{}'); } catch(e) {}
  var userCache = unseCache[cacheKey] || {};
  // 레이아웃 버전 체크 (탭→스크롤 전환 후 캐시 무효화)
  if(userCache._layoutVer!=='scroll'){userCache={};}

  var todayObj = new Date();
  var todayStr = todayObj.getFullYear() + '-' + (todayObj.getMonth()+1) + '-' + todayObj.getDate();
  var tomorrowObj = new Date(todayObj.getTime() + 86400000);
  var tomorrowStr = tomorrowObj.getFullYear() + '-' + (tomorrowObj.getMonth()+1) + '-' + tomorrowObj.getDate();

  var finalScores = null, finalTexts = null, needFetch = true;

  if (UNSE_TYPE === 'today') {
    if (userCache.todayDate === todayStr && userCache.todayData) {
      finalScores = userCache.todayData.scores; finalTexts = userCache.todayData.texts; needFetch = false;
    } else if (userCache.tomorrowDate === todayStr && userCache.tomorrowData) {
      userCache.todayDate = todayStr; userCache.todayData = userCache.tomorrowData;
      userCache.tomorrowDate = null; userCache.tomorrowData = null;
      userCache._layoutVer='scroll';unseCache[cacheKey] = userCache; localStorage.setItem('unse_cache', JSON.stringify(unseCache));
      finalScores = userCache.todayData.scores; finalTexts = userCache.todayData.texts; needFetch = false;
    }
  } else {
    if (userCache.tomorrowDate === tomorrowStr && userCache.tomorrowData) {
      finalScores = userCache.tomorrowData.scores; finalTexts = userCache.tomorrowData.texts; needFetch = false;
    }
  }

  if (!needFetch && finalTexts && (finalTexts.overall.includes('받지 못했') || finalTexts.overall.includes('찾을 수 없'))) {
      needFetch = true;
  }

  if (!needFetch) {
    setTimeout(function(){
      document.getElementById('uLd').style.display='none';
      renderUnseResult(finalScores, finalTexts);
    }, 500); 
    return;
  }

  var msgs=['서버를 연결하는 중...','일진을 분석하는 중...','운세를 작성하는 중...'];
  var mi=0;
  var lv=setInterval(function(){var e=document.getElementById('uLdTxt');if(e)e.textContent=msgs[mi++%msgs.length];},1800);
  function stopL(){clearInterval(lv);document.getElementById('uLd').style.display='none';}
  function showE(msg){
    stopL();var e=document.getElementById('uErr');e.style.display='block';
    e.innerHTML='<div style="font-size:18px;margin-bottom:8px">&#9888;</div><div>'+msg+'</div>';
  }

  var ctrl=new AbortController(),tid=setTimeout(function(){ctrl.abort();},90000);
  var res;
  try{
    res=await fetch('https://my-saju-api.onrender.com/api/saju',{
      method:'POST',signal:ctrl.signal,headers:{'Content-Type':'application/json'},
      body:JSON.stringify({model:'gemini',max_tokens:8000,
        system:'당신은 한국 전통 사주명리학 전문가입니다. 반드시 지정된 태그 형식을 정확히 사용하세요.',
        messages:[{role:'user',content:buildUPrompt(d,UNSE_TYPE,target)}]})
    });
  }catch(e){clearTimeout(tid);if(e.name==='AbortError')showE('요청 시간 초과');else showE('서버 연결 실패');return;}
  clearTimeout(tid);
  
  if(!res.ok){showE('운세를 받지 못했습니다');return;}
  var data;try{data=await res.json();}catch(e){showE('응답 오류');return;}
  var raw=(data.content&&data.content[0])?data.content[0].text||'':'';
  if(!raw){showE('응답이 비어있습니다');return;}

  raw = raw.replace(/\*\*/g, ''); 
  function pScore(tag){
    var m = raw.match(new RegExp('\\['+tag+'_SCORE\\][^\\d]*(\\d+)', 'i'));
    return m ? Math.min(100, Math.max(0, parseInt(m[1]))) : 50;
  }
  function pText(tag){
    var m = raw.match(new RegExp('\\['+tag+'\\]([\\s\\S]*?)(?=\\[\\/?[A-Z_]+\\]|$)', 'i'));
    if(m && m[1]) {
        var txt = m[1].replace(new RegExp('^\\]|^\\s*\\]'), '').trim();
        txt = txt.replace(new RegExp('\\[\\/'+tag+'\\]', 'i'), '').trim();
        return txt || '내용을 찾을 수 없습니다.';
    }
    return '운세 내용을 가져오는 중 문제가 발생했습니다.';
  }

  var scores={overall:pScore('OVERALL'),money:pScore('MONEY'),love:pScore('LOVE'),work:pScore('WORK'),health:pScore('HEALTH')};
  var texts={overall:pText('OVERALL'),money:pText('MONEY'),love:pText('LOVE'),work:pText('WORK'),health:pText('HEALTH')};

  stopL();

  if(UNSE_TYPE === 'today'){
     userCache.todayDate = todayStr; userCache.todayData = {scores: scores, texts: texts};
  } else {
     userCache.tomorrowDate = tomorrowStr; userCache.tomorrowData = {scores: scores, texts: texts};
  }
  unseCache[cacheKey] = userCache;
  localStorage.setItem('unse_cache', JSON.stringify(unseCache));

  renderUnseResult(scores, texts);
}

function handleUnseRequest() {
  if(isPassActive()) { uConfirm(); } 
  else { openAdModal(uConfirm); }
}

function startUnse(){
  if(!uData)return;
  var today=new Date(),target=UNSE_TYPE==='tomorrow'?new Date(today.getTime()+86400000):today;
  var days=['일','월','화','수','목','금','토'];
  var ymd=target.getFullYear()+'년 '+(target.getMonth()+1)+'월 '+target.getDate()+'일 ('+days[target.getDay()]+'요일)';
  document.getElementById('uDateLbl').textContent=(UNSE_TYPE==='today'?'오늘 ':'내일 ')+ymd;
  document.getElementById('uSaju').textContent=CH[uData.ys]+JH[uData.yb]+' '+CH[uData.ms]+JH[uData.mb]+' '+CH[uData.ds]+JH[uData.db]+' '+CH[uData.hs]+JH[uData.hb];
  document.getElementById('uInfo').textContent=uData.ani+'띠 · '+CG[uData.ys]+JJ[uData.yb]+'년 · '+(uData.gen==='male'?'남성':'여성');
  document.getElementById('uTotalScore').textContent='';
  var _sb=document.getElementById('unseShareBtn');if(_sb)_sb.style.display='none';
  document.getElementById('uSecs').innerHTML='';
  document.getElementById('uErr').style.display='none';
  document.getElementById('uLd').style.display='block';
  document.getElementById('uResult').style.display='block';
  drawRadar([0,0,0,0,0]);
  document.getElementById('uLegend').innerHTML='';
  document.getElementById('uResult').scrollIntoView({behavior:'smooth',block:'start'});
  reqUnseAI(target);
}

async function reqGoonghapAI(type,dA,dB){
  // 캐시 확인
  var cached=getGoonghapCache(type,dA,dB);
  if(cached){
    setTimeout(function(){
      document.getElementById('gLd').style.display='none';
      renderGoonghapResult(cached);
    },400);
    return;
  }
  var msgs=['젬나가 운명을 읽는 중...','전생 인연을 살피는 중...','합충을 계산하는 중...','팩트를 준비하는 중...'];
  var mi=0;
  var lv=setInterval(function(){var e=document.getElementById('gLdTxt');if(e)e.textContent=msgs[mi++%msgs.length];},1800);
  function stopL(){clearInterval(lv);document.getElementById('gLd').style.display='none';}
  function showE(msg){stopL();var e=document.getElementById('gErr');e.style.display='block';e.innerHTML='<div style="font-size:18px;margin-bottom:8px">⚠</div><div>'+msg+'</div>';}

  var ohA=Object.entries(dA.cnt).map(function(e){return e[0]+':'+e[1];}).join(' ');
  var ohB=Object.entries(dB.cnt).map(function(e){return e[0]+':'+e[1];}).join(' ');
  var suyoInfo='';
  if(type==='suyo'){
    var rel=getSuyoRel(dA.suyoIdx,dB.suyoIdx);
    suyoInfo='\n\n【숙요점 관계】\n'
      +'- 나의 宿: '+SUYO_NAMES[dA.suyoIdx]+'\n'
      +'- 상대의 宿: '+SUYO_NAMES[dB.suyoIdx]+'\n'
      +'- 숙요 관계: '+rel.name+' ('+rel.desc+')';
  }
  var typeDesc=type==='suyo'?'숙요점 전생 궁합 (운명/카르마 기반)':'전통 만세력 궁합 (오행 합충 기반)';
  var prompt=[
    '분석 방식: '+typeDesc,
    '【나 (첫번째 사람)】',
    '사주: '+CG[dA.ys]+JJ[dA.yb]+'('+CH[dA.ys]+JH[dA.yb]+') '+CG[dA.ms]+JJ[dA.mb]+'('+CH[dA.ms]+JH[dA.mb]+') '+CG[dA.ds]+JJ[dA.db]+'('+CH[dA.ds]+JH[dA.db]+') '+CG[dA.hs]+JJ[dA.hb]+'('+CH[dA.hs]+JH[dA.hb]+')',
    '일간: '+CG[dA.ds]+'('+CH[dA.ds]+'), 성별: '+(dA.gen==='male'?'남':'여')+', 오행: '+ohA,
    '【상대방 (두번째 사람)】',
    '사주: '+CG[dB.ys]+JJ[dB.yb]+'('+CH[dB.ys]+JH[dB.yb]+') '+CG[dB.ms]+JJ[dB.mb]+'('+CH[dB.ms]+JH[dB.mb]+') '+CG[dB.ds]+JJ[dB.db]+'('+CH[dB.ds]+JH[dB.db]+') '+CG[dB.hs]+JJ[dB.hb]+'('+CH[dB.hs]+JH[dB.hb]+')',
    '일간: '+CG[dB.ds]+'('+CH[dB.ds]+'), 성별: '+(dB.gen==='male'?'남':'여')+', 오행: '+ohB,
    suyoInfo,
    '',
    '※ 중요 지칭 룰: 풀이를 작성할 때 절대로 "첫번째 분", "두번째 분"이라는 단어를 쓰지 마세요. 무조건 "당신"과 "상대"로 지칭해야 합니다.',
    '인사말 없이 바로 아래 4개 태그로만 출력하세요. 각 300~400자, 젬나 스타일로 단호하게.',
    type==='suyo'?'숙요 관계('+getSuyoRel(dA.suyoIdx,dB.suyoIdx).name+')를 중심으로 전생 카르마와 운명적 관계를 서늘하게 짚어주세요.':'두 일간의 합충과 오행 밸런스를 팩트로 짚어주세요.',
    '',
    '아래 4개 태그를 반드시 모두 포함해서 출력하세요. 태그 안에 실제 내용을 300~400자로 작성하세요:',
    '[OVERALL]두 사람의 전반적인 궁합 풀이를 300자 내외로 작성[/OVERALL]',
    '[CHEMISTRY]두 사람의 케미와 끌림의 원인을 200자 내외로 작성[/CHEMISTRY]',
    '[CONFLICT]충돌 지점과 조심할 점을 200자 내외로 작성[/CONFLICT]',
    '[ADVICE]젬나의 단호한 조언을 2~3문장으로 작성[/ADVICE]'
  ].join('\n');

  var ctrl=new AbortController(),tid=setTimeout(function(){ctrl.abort();},90000);
  var res;
  try{
    res=await fetch('https://my-saju-api.onrender.com/api/saju',{
      method:'POST',signal:ctrl.signal,headers:{'Content-Type':'application/json'},
      body:JSON.stringify({model:'gemini',max_tokens:8000,
        system:GEMNA_PERSONA+' 반드시 [OVERALL]...[/OVERALL], [CHEMISTRY]...[/CHEMISTRY], [CONFLICT]...[/CONFLICT], [ADVICE]...[/ADVICE] 형식의 4개 태그로만 응답하세요. 태그 외 다른 형식 금지.',
        messages:[{role:'user',content:prompt}]})
    });
  }catch(e){clearTimeout(tid);if(e.name==='AbortError')showE('요청 시간 초과');else showE('서버 연결 실패');return;}
  clearTimeout(tid);
  if(!res.ok){showE('궁합을 받지 못했습니다');return;}
  var data;try{data=await res.json();}catch(e){showE('응답 오류');return;}
  var raw=(data.content&&data.content[0])?data.content[0].text||'':'';
  if(!raw){showE('응답이 비어있습니다');return;}
  raw=raw.replace(/\*\*/g,'');

  function pText(tag){var re=new RegExp('\\['+tag+'\\]([\\s\\S]*?)\\[/'+tag+'\\]','i');var m=raw.match(re);if(m&&m[1].trim())return m[1].trim();var re2=new RegExp('\\['+tag+'\\]([\\s\\S]*?)(?=\\[(?:OVERALL|CHEMISTRY|CONFLICT|ADVICE)|$)','i');var m2=raw.match(re2);return m2&&m2[1].trim()?m2[1].trim():'내용 분석 중 오류가 발생했습니다.';}
  stopL();

  var gResult={overall:pText('OVERALL'),chemistry:pText('CHEMISTRY'),conflict:pText('CONFLICT'),advice:pText('ADVICE')};
  setGoonghapCache(type,dA,dB,gResult);
  renderGoonghapResult(gResult);
}

function execGoonghap(type,dA,dB){
  var cached=getGoonghapCache(type,dA,dB);
  var res=document.getElementById('gResult');res.style.display='block';
  document.getElementById('gASaju').textContent=dA.saju;
  document.getElementById('gAInfo').textContent=ANI[dA.yb]+'띠·'+(dA.gen==='male'?'남':'여');
  document.getElementById('gBSaju').textContent=dB.saju;
  document.getElementById('gBInfo').textContent=ANI[dB.yb]+'띠·'+(dB.gen==='male'?'남':'여');
  var suyoTag=document.getElementById('gSuyoTag');
  var relColors={best:'#4a9a6a',good:'var(--gold2)',warn:'#e8a090',danger:'#e09090',special:'#c890e8'};
  if(type==='suyo'){
    var rel=getSuyoRel(dA.suyoIdx,dB.suyoIdx);
    document.getElementById('gSuyoRel').textContent=rel.name;
    document.getElementById('gSuyoRel').style.color=relColors[rel.type]||'var(--gold2)';
    document.getElementById('gSuyoDesc').textContent=rel.desc;
    document.getElementById('gCompatBadge').textContent=rel.type==='best'?'♡':rel.type==='danger'?'⚡':rel.type==='warn'?'△':'☯';
    suyoTag.style.display='block';
  }else{
    suyoTag.style.display='none';
    document.getElementById('gCompatBadge').textContent='☯';
  }
  document.getElementById('gTabs').innerHTML='';document.getElementById('gSecs').innerHTML='';
  document.getElementById('gErr').style.display='none';
  res.scrollIntoView({behavior:'smooth',block:'start'});
  if(cached){document.getElementById('gLd').style.display='none';renderGoonghapResult(cached);return;}
  document.getElementById('gLd').style.display='block';
  reqGoonghapAI(type,dA,dB);
}

function handleSinnyunRequest() {
  if (isPassActive()) { startSinnyun(); return; }
  openAdModal(startSinnyun);
}

async function startSinnyun() {
  var d = getSajuData();
  if (!d) return;
  var today = new Date();
  var targetYear = today.getFullYear();

  var bai = document.getElementById('snBai');
  bai.disabled = true;
  bai.innerHTML = '분석 중...';
  document.getElementById('snAip').className = 'aip show';
  document.getElementById('snLd').style.display = 'block';
  document.getElementById('snTabs').innerHTML = '';
  document.getElementById('snSecs').innerHTML = '';
  document.getElementById('snErr').style.display = 'none';

  // 캐시 확인
  var cacheKey = 'sinnyun_' + d.sstr.replace(/\s/g,'') + '_' + d.gen + '_' + targetYear;
  var cached = null;
  try { var raw = localStorage.getItem(cacheKey); if(raw) cached = JSON.parse(raw); } catch(e) {}
  if (cached) {
    // 한자 독음 없는 구버전 캐시 무효화 (예: 丙午 단독 표기)
    var hasRawHanja = /[甲乙丙丁戊己庚辛壬癸子丑寅卯辰巳午未申酉戌亥]{2}(?!\()/.test(cached.overall||'');
    if (hasRawHanja) { cached = null; try { localStorage.removeItem(cacheKey); } catch(e) {} }
  }
  if (cached) {
    document.getElementById('snLd').style.display = 'none';
    renderSinnyunResult(cached, targetYear);
    return;
  }

  await reqSinnyunAI(d, targetYear, cacheKey);
}

async function snFetch(prompt) {
  var ctrl = new AbortController(), tid = setTimeout(function(){ctrl.abort();}, 120000);
  var res;
  try {
    res = await fetch('https://my-saju-api.onrender.com/api/saju', {
      method:'POST', signal:ctrl.signal, headers:{'Content-Type':'application/json'},
      body: JSON.stringify({model:'gemini', max_tokens:8000,
        system:'당신은 한국 전통 사주명리학 전문가입니다. 반드시 지정된 태그 형식만 사용하고 인사말 없이 바로 내용을 출력하세요. 모든 닫는 태그를 반드시 포함하세요.',
        messages:[{role:'user', content:prompt}]})
    });
  } catch(e) { clearTimeout(tid); return null; }
  clearTimeout(tid);
  if(!res.ok) return null;
  var data; try{data=await res.json();}catch(e){return null;}
  var raw=(data.content&&data.content[0])?data.content[0].text||'':'';
  return raw.replace(/\*\*/g,'');
}

async function reqSinnyunAI(d, year, cacheKey) {
  var ldEl = document.getElementById('snLdTxt');
  function setMsg(t){ if(ldEl) ldEl.textContent = t; }
  function stopL(){ document.getElementById('snLd').style.display='none'; }
  function showE(msg){ stopL(); var e=document.getElementById('snErr'); e.style.display='block'; e.innerHTML='<div style="font-size:18px;margin-bottom:8px">⚠</div><div>'+msg+'</div>'; }

  // 4개 동시 병렬 요청
  setMsg('신년운세 전체 분석 중...');
  var all = await Promise.all([
    snFetch(buildSnPrompt1(d, year)),
    snFetch(buildSnPromptLove(d, year)),
    snFetch(buildSnPromptMoney(d, year)),
    snFetch(buildSnPrompt2(d, year, [1,2,3,4,5,6])),
    snFetch(buildSnPrompt2(d, year, [7,8,9,10,11,12]))
  ]);
  var rawO=all[0], rawL=all[1], rawM=all[2], raw2=all[3], raw3=all[4];

  if(!rawO){showE('총운을 받지 못했습니다');return;}
  if(!rawL){showE('애정운을 받지 못했습니다');return;}
  if(!rawM){showE('재물운을 받지 못했습니다');return;}
  if(!raw2){showE('상반기 월별 운세를 받지 못했습니다');return;}
  if(!raw3){showE('하반기 월별 운세를 받지 못했습니다');return;}

  var result = {
    overall: pSnText(rawO,'OVERALL'),
    love:    pSnText(rawL,'LOVE'),
    money:   pSnText(rawM,'MONEY'),
    months:  {}
  };
  for(var m=1;m<=6;m++){
    var mm=m<10?'0'+m:''+m;
    result.months[m] = pSnText(raw2,'MONTH_'+mm);
  }
  for(var m=7;m<=12;m++){
    var mm=m<10?'0'+m:''+m;
    result.months[m] = pSnText(raw3,'MONTH_'+mm);
  }

  stopL();
  try { localStorage.setItem(cacheKey, JSON.stringify(result)); } catch(e) {}
  renderSinnyunResult(result, year);
}

async function zNatalAsk(idx){

  var def=getDefaultProfile();
  if(!def){showToast('프로필을 먼저 추가해주세요');return;}
  var profId=_zNatalGetDefaultProfId();
  var cacheKey=_zNatalCacheKey(profId,idx);
  var lo=document.getElementById('zNatalLoading');
  var re=document.getElementById('zNatalAIResult');

  // ── 결제 먼저 체크 (캐시보다 먼저) ──
  if(idx===0){
    // 무료: 광고 or 30분 패스 필요
    if(!zCheckNatalFreeUnlock()){
      adSuccessCallback=function(){
        _zAdUnlockedSession=true;
        // 광고 후 캐시 있으면 바로, 없으면 API
        var c=localStorage.getItem(cacheKey);
        if(c){if(re){re.style.display='block';re.innerHTML=c;}if(re)re.scrollIntoView({behavior:'smooth',block:'start'});}
        else {_zDoNatalFetch(idx,def,profId,cacheKey,lo,re);}
      };
      var modal=document.getElementById('adModal');
      if(modal) modal.classList.add('show');
      if(lo) lo.style.display='none';
      return;
    }
  } else {
    // 유료: 복채 1개
    var bok=getBokchaeCnt();
    if(bok<1){showNatalBokchaeModal();return;}
    // 캐시 있으면 복채 차감 없이 바로 열람
    var c2=localStorage.getItem(cacheKey);
    if(c2){if(re){re.style.display='block';re.innerHTML=c2;}if(re)re.scrollIntoView({behavior:'smooth',block:'start'});return;}
    addBokchae(-1);
    showToast('💎 복채 1개 사용');
  }

  // ── 캐시 확인 (광고/복채 통과 후) ──
  var cached=localStorage.getItem(cacheKey);
  if(cached){
    if(re){re.style.display='block';re.innerHTML=cached;}
    if(re) re.scrollIntoView({behavior:'smooth',block:'start'});
    return;
  }

  if(lo)lo.style.display='block';
  if(re){re.style.display='none';re.innerHTML='';}
  _zDoNatalFetch(idx,def,profId,cacheKey,lo,re);
}

async function _zDoNatalFetch(idx,def,profId,cacheKey,lo,re){
  var noH=(def.hour===99||def.hour===undefined);
  var lat=def.lat||def.cityLat||37.5666;
  var lon2=def.lon||def.cityLon||126.9779;
  if(lo) lo.style.display='block';
  var chart=calcNatalChart(def.gY,def.gM,def.gD,noH?12:(def.hour||12),noH,lat,lon2);
  var SIGNS=['양자리','황소자리','쌍둥이자리','게자리','사자자리','처녀자리','천칭자리','전갈자리','사수자리','염소자리','물병자리','물고기자리'];

  // 네이탈 차트 데이터만 간결하게 구성
  var chartCtx='[네이탈 차트]\n';
  chartCtx+='태양궁: '+SIGNS[chart.sun.sign]+' '+chart.sun.deg+'°\n';
  chartCtx+='달궁: '+SIGNS[chart.moon.sign]+' '+chart.moon.deg+'°\n';
  // 5행성 위치 추가
  var planets5=['mercury','venus','mars','jupiter','saturn'];
  var pNames5=['수성','금성','화성','목성','토성'];
  planets5.forEach(function(p,i){
    var pLon=calcPlanetLon(def.gY,def.gM,def.gD,p);
    chartCtx+=pNames5[i]+': '+SIGNS[Math.floor(pLon/30)]+' '+Math.round(pLon%30*10)/10+'°\n';
  });
  chartCtx+='라후(북교점): '+SIGNS[chart.rahu.sign]+' '+chart.rahu.deg+'°\n';
  chartCtx+='케투(남교점): '+SIGNS[chart.ketu.sign]+' '+chart.ketu.deg+'°\n';
  if(chart.asc) chartCtx+='상승궁(ASC): '+SIGNS[chart.asc.sign]+' '+chart.asc.deg+'°'+(def.cityName?' ('+def.cityName+'기준)':'')+'\n';
  if(chart.dasha&&chart.dasha.current){
    var cur=chart.dasha.current;
    chartCtx+='현재 다샤: '+cur.lord+' 다샤 ('+Math.round(cur.start)+'~'+Math.round(cur.end)+'년, 남은 '+chart.dasha.remain+'년)\n';
    chartCtx+='출생 낙샤트라: '+chart.dasha.nakshatra+'\n';
  }
  var q=_zNatalQs[idx]||_zNatalQs[0];

  try{
    var ctrl=new AbortController();
    var tid=setTimeout(function(){ctrl.abort();},90000); // 90초 타임아웃
    var resp=await fetch('https://my-saju-api.onrender.com/api/saju',{
      method:'POST',signal:ctrl.signal,headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        model:'gemini',
        mode:'star',
        max_tokens:6000,
        system:'당신은 프리미엄 서양+베딕 점성술 전문가입니다. 네이탈 차트 데이터만 기반으로 분석합니다. 사주 내용 절대 언급 금지. 출력 형식: ## 핵심결론 → ### 섹션제목 → - 불릿 → 마지막에 > 인용구로 핵심메시지. **볼드체는 섹션당 1개 핵심 단어에만 사용**. 나머지는 일반 텍스트. 한국어. MZ 눈높이. 전문 용어 쉽게 번역. 1000자 이상. 완전한 문장으로 끝낼 것.',
        messages:[{role:'user',content:chartCtx+'\n질문: '+q+'\n\n반드시 아래 형식으로 작성해:\n## [핵심 한 줄 결론]\n\n각 섹션은 ### 제목 사용\n각 항목은 - 불릿으로\n중요 키워드는 **굵게**\n마지막에 > 인용구 형식으로 핵심 메시지 한 줄'}]
      })
    });
    clearTimeout(tid);
    var data=await resp.json();
    var txt='';
    if(data&&data.content&&Array.isArray(data.content))
      txt=data.content.map(function(c){return c.text||'';}).join('');
    else if(data&&data.content&&typeof data.content==='string') txt=data.content.trim();
    else if(data&&data.text) txt=data.text;
    // 에러 응답 처리
    if(!txt&&data&&data.error) txt='서버 오류: '+(data.error.message||JSON.stringify(data.error));

    if(lo)lo.style.display='none';
    var rendered=natalMdToHtml(txt);
    localStorage.setItem(cacheKey,rendered);
    if(lo)lo.style.display='none';
    if(re){re.style.display='block';re.innerHTML=rendered;}
    if(re) re.scrollIntoView({behavior:'smooth',block:'start'});
    zRenderNatalBtns();
  }catch(e){
    if(lo)lo.style.display='none';
    var msg=e.name==='AbortError'?'시간이 초과됐어요. 서버가 깨어나는 중일 수 있어요.':'서버 연결에 실패했어요.';
    showRetryToast(msg,function(){zNatalAsk(idx);});
  }
}

async function zDashaAsk(idx){
  var def=getDefaultProfile();if(!def){showToast('프로필을 먼저 추가해주세요');return;}
  var lo=document.getElementById('zDashaLoading'),re=document.getElementById('zDashaResult');

  // 프로필 기반 캐시 (동일 프로필이면 동일 결과)
  var profId=_zNatalGetDefaultProfId();
  var cacheKey='msr_dasha_reading_'+profId+'_'+idx;
  var cached=localStorage.getItem(cacheKey);
  if(cached){
    if(re){re.style.display='block';re.innerHTML=cached;}
    if(re) re.scrollIntoView({behavior:'smooth',block:'start'});
    return;
  }

  if(lo)lo.style.display='block';if(re){re.style.display='none';re.innerHTML='';}

  var noH=(def.hour===99||def.hour===undefined);
  var nc=calcNatalChart(def.gY,def.gM,def.gD,noH?12:def.hour,noH,def.lat||37.5666,def.lon||126.9779);
  var SIGNS=['양자리','황소자리','쌍둥이자리','게자리','사자자리','처녀자리','천칭자리','전갈자리','사수자리','염소자리','물병자리','물고기자리'];

  // 핵심만 (입력 최소화)
  var ctx='';
  ctx+='태양궁:'+SIGNS[nc.sun.sign]+' 달궁:'+SIGNS[nc.moon.sign];
  ctx+=' 라후:'+SIGNS[nc.rahu.sign]+' 케투:'+SIGNS[nc.ketu.sign];
  if(nc.asc) ctx+=' ASC:'+SIGNS[nc.asc.sign];
  if(nc.dasha&&nc.dasha.current){
    var cur=nc.dasha.current;
    ctx+='\n현재다샤:'+cur.lord+'('+Math.round(cur.start)+'~'+Math.round(cur.end)+'년,남은'+nc.dasha.remain+'년)';
    ctx+=' 낙샤트라:'+nc.dasha.nakshatra;
    if(nc.dasha.next) ctx+=' 다음:'+nc.dasha.next.lord+'('+Math.round(nc.dasha.next.start)+'년~)';
  }
  ['jupiter','saturn'].forEach(function(p,i){
    var l=calcPlanetLon(def.gY,def.gM,def.gD,p);
    ctx+=' '+['목성','토성'][i]+':'+SIGNS[Math.floor(l/30)];
  });

  var q=_zDashaQs[idx]||_zDashaQs[0];
  var fmt='\n형식: ## 결론한줄 ### 섹션 - 불릿 > 마지막인용구. 끝까지 완성할것.';

  try{
    var ctrl=new AbortController();
    var tid=setTimeout(function(){ctrl.abort();},90000);
    var resp=await fetch('https://my-saju-api.onrender.com/api/saju',{
      method:'POST',signal:ctrl.signal,headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        model:'gemini',
        mode:'star',
        max_tokens:6000,
        system:'당신은 베딕+서양 점성술 전문가입니다. 다샤 시스템을 중심으로 분석합니다. 사주 내용 언급 금지. 첫 문장에 핵심 결론. 한국어. MZ 눈높이. 전문 용어 쉽게 번역. 완전한 문장으로 끝낼 것.',
        messages:[{role:'user',content:ctx+'\n질문: '+q+fmt}]
      })
    });
    clearTimeout(tid);
    var data=await resp.json();
    var txt='';
    if(data&&data.content&&Array.isArray(data.content))
      txt=data.content.map(function(c){return c.text||'';}).join('');
    else if(data&&data.content&&typeof data.content==='string') txt=data.content.trim();
    else if(data&&data.text) txt=data.text;
    if(!txt) txt='분석에 실패했어요. 다시 시도해주세요.';
    var rendered=natalMdToHtml(txt);
    localStorage.setItem(cacheKey,rendered); // 프로필 기반 캐시 저장
    if(lo)lo.style.display='none';
    if(re){re.style.display='block';re.innerHTML=rendered;}
    if(re) re.scrollIntoView({behavior:'smooth',block:'start'});
  }catch(e){
    if(lo)lo.style.display='none';
    var msg=e.name==='AbortError'?'시간이 초과됐어요. 다시 시도해주세요.':'서버 연결 실패.';
    showRetryToast(msg,function(){zDashaAsk(idx);});
  }
}

async function zGetAIReading(mode){
  var def=getDefaultProfile();
  var noH=def&&(def.hour===99||def.hour===undefined);
  var lat=def?(def.cityLat||def.la||37.5666):37.5666;
  var lon=def?(def.cityLon||def.lo||126.9779):126.9779;
  var chart=def?calcNatalChart(def.gY,def.gM,def.gD,noH?12:(def.hour||12),noH,lat,lon):null;
  var resultEl;
  if(mode==='natal') resultEl=document.getElementById('zNatalAIResult');
  else if(mode==='sign') resultEl=document.getElementById('zSignDetailResult');
  else resultEl=document.getElementById('zMyAIResult');
  if(!resultEl)return;
  resultEl.style.display='block';
  resultEl.innerHTML='<div style="padding:20px 0;display:flex;justify-content:center;"><div class="aidots"><span></span><span></span><span></span></div></div>';
  var days=['일','월','화','수','목','금','토'],now=new Date();
  var dateStr=now.getFullYear()+'년 '+(now.getMonth()+1)+'월 '+now.getDate()+'일 '+days[now.getDay()]+'요일';
  var prompt='';
  if(mode==='natal'&&def&&chart){
    var ncTxt=natalToText(chart,def.cityName?'('+def.cityName+')':'');
    prompt='당신은 신빨 넘치는 네이탈+베딕 통합 점성술 마스터예요.\n"~이에요, ~거예요, ~네요" 말투로 소름돋게.\n\n'+ncTxt+'\n분석일: '+dateStr+'\n\n각 150~200자로 소름돋게 분석:\n1. 핵심 기질과 운명 (태양+달+상승궁 통합)\n2. 라후-케투 카르마 (이번 생 숙제 vs 전생 패턴)\n3. 지금 이 순간 흐르는 에너지\n4. 인연에서 반복되는 패턴';
  } else if(mode==='my'&&def&&chart){
    var sunSign=ZODIAC[chart.sun.sign];
    prompt='당신은 신빨 넘치는 별자리 점성술사예요. "~이에요, ~거예요" 말투로.\n\n태양궁: '+sunSign.n+' '+chart.sun.deg+'°\n분석일: '+dateStr+'\n\n오늘 '+sunSign.n+' 에너지 리딩 (각 100자):\n1. 오늘 전반적 흐름\n2. 인연·관계 에너지\n3. 집중해야 할 것 하나';
  } else if(mode==='sign'&&_zSelectedSign!==null){
    var z=ZODIAC[_zSelectedSign];
    prompt='당신은 신빨 넘치는 별자리 점성술사예요. "~이에요, ~거예요" 말투로.\n\n분석 별자리: '+z.n+'\n분석일: '+dateStr+'\n\n오늘 '+z.n+' 에너지 리딩 (총운/연애/재물 각 80자):';
  } else {
    resultEl.innerHTML='<div style="text-align:center;padding:16px;color:var(--muted);font-size:13px;">프로필을 등록하면 더 정확한 리딩이 가능해요</div>';return;
  }
  try{
    var ctrl=new AbortController(),tid=setTimeout(function(){ctrl.abort();},50000);
    var res=await fetch('https://my-saju-api.onrender.com/api/saju',{
      method:'POST',signal:ctrl.signal,headers:{'Content-Type':'application/json'},
      body:JSON.stringify({model:'gemini',max_tokens:1200,system:'당신은 신빌 넘치는 점성술 마스터예요.',messages:[{role:'user',content:prompt}]})
    });
    clearTimeout(tid);
    if(!res.ok){resultEl.innerHTML='<div style="color:var(--muted);padding:16px;font-size:13px;">서버 오류. 잠시 후 다시 시도해주세요.</div>';return;}
    var data=await res.json();
    var answer='';
    if(data&&data.content&&Array.isArray(data.content)&&data.content[0]&&data.content[0].text) answer=data.content[0].text;
    else if(data&&data.content&&typeof data.content==='string') answer=data.content.trim();
    if(!answer){resultEl.innerHTML='<div style="color:var(--muted);padding:16px;font-size:13px;">응답이 비어있어요.</div>';return;}
    resultEl.innerHTML='<div style="background:rgba(20,30,60,.8);border:1px solid rgba(251,191,36,.2);border-radius:20px;padding:18px 16px;margin-top:12px;">'
      +'<div style="font-size:10px;color:rgba(253,230,138,.5);letter-spacing:2px;margin-bottom:12px;">✦ AI 별자리 리딩</div>'
      +'<div style="font-size:13px;color:var(--dim);line-height:1.85;white-space:pre-wrap;">'+answer+'</div></div>';
  } catch(e){resultEl.innerHTML='<div style="color:var(--muted);padding:16px;font-size:13px;">연결 오류. 잠시 후 다시 시도해주세요.</div>';}
}

async function tDoReading(){
  incTarotCount();
  tGoStep(3);
  // 로딩 메시지 순환
  var msgs=['운명의 패턴을 분석하는 중...','카드의 에너지를 읽는 중...','소름돋는 진실을 준비하는 중...','아르카나가 말을 건네는 중...'];
  var mi=0;
  var lv=setInterval(function(){var e=document.getElementById('tReadingMsg');if(e)e.textContent=msgs[mi++%msgs.length];},1800);

  var cards=_tSession.cards;
  var posLabels={1:['✦'],2:['첫번째','두번째'],3:['과거','현재','미래'],4:['관계','감정','조언','결론'],5:['과거','현재','미래','조언','결과'],7:['월','화','수','목','금','토','일'],10:['현재','도전','과거','최근','미래','가까운미래','자신','외부','희망','결론'],12:['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월']};
  var labels=posLabels[_tSession.count]||cards.map(function(_,i){return (i+1)+'번째';});
  var majorList=_tSession.majorCards.map(function(c){return c.name+(c.reversed?' (역방향)':'');}).join(', ');
  var minorList=_tSession.minorCards.map(function(c){return c.name+(c.reversed?' (역방향)':'');}).join(', ');

  // 질문 의도 분석
  var qLower=_tQuestion.toLowerCase();
  var intentGuide='';
  if(/언제|시기|시점|몇 월|얼마나/.test(_tQuestion)) intentGuide='시기와 타이밍을 구체적으로 짚어줘. ';
  else if(/좋아|마음|감정|느낌|생각/.test(_tQuestion)) intentGuide='상대방 감정과 마음 상태를 카드로 직접 읽어줘. ';
  else if(/연락|문자|카톡|올까|올것/.test(_tQuestion)) intentGuide='연락 여부와 가능성을 카드로 직접 판단해줘. ';
  else if(/취직|합격|될까|성공|안될/.test(_tQuestion)) intentGuide='가능성과 현실적 조건을 카드로 직접 말해줘. ';
  else if(/헤어|이별|끝|그만|포기/.test(_tQuestion)) intentGuide='관계의 흐름과 결말을 카드로 솔직하게 말해줘. ';

  var prompt='질문: '+_tQuestion+'\n\n'
    +'메이저 아르카나(운명의 흐름): '+majorList+'\n'
    +'마이너 아르카나(현실 에너지): '+minorList+'\n\n'
    +(intentGuide?'리딩 포커스: '+intentGuide+'\n\n':'')
    +'아래 4개 파트를 순서대로 작성해. 각 파트는 <<<REACT>>>, <<<CARDS>>>, <<<READING>>>, <<<PUNCHLINE>>> 으로 구분.\n\n'
    +'<<<REACT>>>\n카드 보자마자 드는 솔직한 반응. 1~2문장. 매번 다른 표현. 상투어 금지.\n\n'
    +'<<<CARDS>>>\n카드 이름 나열하지 말 것. 하나의 흐름으로 자연스럽게 풀어서. 카드: 어쩌고 이런 형식 절대 금지. 카드들이 전하는 이야기를 친구한테 말하듯이. 4~5문장.\n\n'
    +'<<<READING>>>\n카드들을 연결해서 질문에 직접적으로 답. YES/NO식으로 명확하게 방향을 잡아줘. 3~4문장.\n\n'
    +'<<<PUNCHLINE>>>\n딱 한 줄. 앞 내용과 다른 표현으로. 강렬하고 기억에 남게.';

  try{
    var ctrl=new AbortController(),tid=setTimeout(function(){ctrl.abort();},90000);
    var resp=await fetch('https://my-saju-api.onrender.com/api/saju',{
      method:'POST',signal:ctrl.signal,headers:{'Content-Type':'application/json'},
      body:JSON.stringify({model:'gemini',mode:'star',max_tokens:6000,
        system:GEMNA_PERSONA+' 절대 금지: 카드 이름을 나열하며 설명하는 방식 (예: "태양: 어쩌고", "소드 A: 어쩌고") 금지. 카드들의 메시지를 하나의 자연스러운 이야기로 녹여서 전달. 볼드(**) 마크다운 절대 금지. 상투적 표현 금지.',
        messages:[{role:'user',content:prompt}]})
    });
    clearTimeout(tid);clearInterval(lv);
    var data=await resp.json();
    var raw='';
    if(data.content&&Array.isArray(data.content)) raw=data.content.map(function(c){return c.text||'';}).join('');
    else if(data.content&&typeof data.content==='string') raw=data.content;
    else if(data.text) raw=data.text;
    // 볼드 제거
    // 볼드/태그 제거
    raw=raw.replace(/\*\*([^*]+)\*\*/g,'$1').replace(/\*([^*]+)\*/g,'$1');

    // <<< >>> 태그로 파싱
    function pText(tag){
      var re=new RegExp('<<<'+tag+'>>[\\s\\S]*?\\n([\\s\\S]*?)(?=<<<|$)','i');
      var m=raw.match(re);
      if(m) return m[1].replace(/<<<[^>]+>>>/g,'').trim();
      // fallback: 줄로 찾기
      var lines=raw.split('\n');
      var found=false,result=[];
      for(var i=0;i<lines.length;i++){
        if(lines[i].indexOf('<<<'+tag+'>>>')>=0){found=true;continue;}
        if(found&&lines[i].indexOf('<<<')>=0) break;
        if(found) result.push(lines[i]);
      }
      return result.join('\n').trim();
    }

    var react=pText('REACT'),cardsT=pText('CARDS'),reading=pText('READING'),punch=pText('PUNCHLINE');
    // 완전 실패 시 단락으로 분리
    if(!react&&!cardsT&&!reading&&!punch){
      var parts=raw.replace(/<<<[^>]+>>>/g,'|||').split('|||').map(function(p){return p.trim();}).filter(Boolean);
      react=parts[0]||''; cardsT=parts[1]||''; reading=parts[2]||''; punch=parts[3]||'';
      if(!punch&&parts.length===1) reading=parts[0];
    }
    tShowResult(cards,labels,react,cardsT,reading,punch);
  }catch(e){
    clearInterval(lv);
    tGoStep(2);
    showToast(e.name==='AbortError'?'시간 초과. 다시 시도해주세요.':'서버 연결 실패');
  }
}

function openAdModal(cb) {
    adSuccessCallback = cb;
    var m = document.getElementById('adModal');
    if(m) m.classList.add('show');
}

function closeAdModal() {
    var m = document.getElementById('adModal');
    if(m) m.classList.remove('show');
}

async function selectAdOption(type) {
    try {
        if (typeof window.capacitorAdMob !== 'undefined') {
            var AdMob = window.capacitorAdMob.AdMob;
            var RewardAdPluginEvents = window.capacitorAdMob.RewardAdPluginEvents;
            try { await AdMob.removeAllListeners(); } catch(e){}
            
            AdMob.addListener(RewardAdPluginEvents.Rewarded, function() { handleAdSuccess(type); });
            AdMob.addListener(RewardAdPluginEvents.FailedToLoad, function() { handleAdSuccess(type); });

            await AdMob.prepareRewardVideoAd({ adId: 'ca-app-pub-3940256099942544/5224354917', isTesting: true });
            await AdMob.showRewardVideoAd();
        } else {
            handleAdSuccess(type); 
        }
    } catch(e) { handleAdSuccess(type); }
}

function handleAdSuccess(type) {
    closeAdModal();
    if(type === '1hour') {
        localStorage.setItem('ad_free_until', Date.now() + 1800000); 
    }
    updateTimer(); 
    if(adSuccessCallback) {
        var cb = adSuccessCallback;
        adSuccessCallback = null; // 1회 실행 후 비워 무한루프 완벽 차단!
        cb();
    }
}

function openRewardAdModal(title,desc,cb){
  _rewardAdCallback=cb;
  var t=document.getElementById('rewardAdTitle');if(t)t.textContent=title||'광고 보고 받기';
  var d=document.getElementById('rewardAdDesc');if(d)d.textContent=desc||'';
  var m=document.getElementById('rewardAdModal');if(m)m.classList.add('show');
}

function closeRewardAdModal(){
  var m=document.getElementById('rewardAdModal');if(m)m.classList.remove('show');
  _rewardAdCallback=null;
}

function rewardAdWatch(){
  var cb=_rewardAdCallback;
  closeRewardAdModal();
  try{
    if(typeof window.capacitorAdMob!=='undefined'){
      window.capacitorAdMob.AdMob.showRewardVideoAd()
        .then(function(){if(cb)cb();})
        .catch(function(){if(cb)cb();});
    } else {if(cb)cb();}
  } catch(e){if(cb)cb();}
}

function isPassActive() {
    if(isSubscribed()) return true; // 구독자 광고 없음
    var until = parseInt(localStorage.getItem('ad_free_until') || '0');
    if(!until || until <= Date.now()) return false;
    // 남은 시간이 30분 초과면 30분으로 클램프
    if(until > Date.now() + 1800000) {
        localStorage.setItem('ad_free_until', Date.now() + 1800000);
    }
    return true;
}

function updateTimer() {
    var stored = parseInt(localStorage.getItem('ad_free_until') || '0');
    var now = Date.now();
    // 30분 초과 저장값이면 지금부터 30분으로 교정 후 재저장
    if(stored > now + 1800000) {
        stored = now + 1800000;
        localStorage.setItem('ad_free_until', stored);
    }
    var pass = stored > now;
    var diff = pass ? Math.floor((stored - now) / 1000) : 0;

    // 버튼 텍스트
    var bai = document.getElementById('bai');
    if(bai && !bai.disabled) bai.innerHTML = pass ? '<span>✦</span> 결과 바로 확인하기' : '<span>🔒</span> 광고보고 사주 풀이 받기';
    var snBai = document.getElementById('snBai');
    if(snBai && !snBai.disabled) snBai.innerHTML = pass ? '<span>✦</span> 신년운세 바로 확인하기' : '<span>🔒</span> 광고보고 신년운세 받기';
    var uBtn = document.getElementById('uConfBtn');
    if(uBtn) uBtn.innerHTML = pass ? '✦ 운세 결과 바로 확인하기' : '🔒 광고보고 운세 확인하기';

    // 타이머 배너
    var disp = document.getElementById('passTimerDisplay');
    var txt  = document.getElementById('passTimerText');
    if(pass && diff > 0) {
        var mm = String(Math.floor(diff / 60)); if(mm.length<2) mm='0'+mm;
        var ss = String(diff % 60);             if(ss.length<2) ss='0'+ss;
        if(txt)  txt.textContent = mm + ':' + ss;
        if(disp) disp.style.display = 'block';
    } else {
        if(disp) disp.style.display = 'none';
    }
}

function getSubPlan(){
  // 'lite' | 'standard' | 'premium' | null
  var until=parseInt(localStorage.getItem('sub_until')||'0');
  if(Date.now()>=until) return null;
  return localStorage.getItem('sub_plan')||'lite';
}

function isSubscribed(){ return getSubPlan()!==null; }

function isSubLite(){    var p=getSubPlan(); return p==='lite'||p==='standard'||p==='premium'; }

function isSubStandard(){ var p=getSubPlan(); return p==='standard'||p==='premium'; }

function isSubPremium(){  return getSubPlan()==='premium'; }

function getPassRemain(){
  var plan=getSubPlan(); if(!plan) return 0;
  var cfg=_PASS_CONFIG[plan]; if(!cfg) return 0;
  return Math.max(0, cfg.sheets*cfg.usesPerSheet - getPassUsed());
}

function getPassUsed(){ return parseInt(localStorage.getItem(_getPassKey())||'0'); }

function addPassUsed(n){ localStorage.setItem(_getPassKey(), getPassUsed()+n); }

function _getPassKey(){
  var subStart=parseInt(localStorage.getItem('sub_start')||'0');
  if(!subStart) return 'ai_pass_nosub';
  var cycle=Math.floor((Date.now()-subStart)/(30*24*60*60*1000));
  return 'ai_pass_cycle_'+cycle;
}

function chargePersonaChat(costBokchae){
  if(getPassRemain()>0){ addPassUsed(1); return 'pass'; }
  var bok=getBokchaeCnt();
  if(bok>=costBokchae){ addBokchae(-costBokchae); return 'bokchae'; }
  return 'fail';
}

function canAccessPersona(personaId){
  var p=PERSONAS[personaId];
  if(!p) return false;
  if(p.tier==='free') return true; // 누구나
  if(isPremiumTest()) return true;
  var plan=getSubPlan();
  if(!plan) return false;
  if(p.tier==='premium') return plan==='premium';
  return false;
}

function activateSubscription(tier){
  var cfg={lite:{bokchae:12},standard:{bokchae:18},premium:{bokchae:30}};
  var now=Date.now();
  localStorage.setItem('sub_plan', tier);
  localStorage.setItem('sub_until', now+30*24*60*60*1000);
  // 구독 시작일 저장 (갱신 시 업데이트)
  localStorage.setItem('sub_start', now);
  // 복채 지급
  if(cfg[tier]) addBokchae(cfg[tier].bokchae);
  // 패스는 getPassRemain()이 자동 계산하므로 별도 저장 불필요
  updatePassUI();
  showToast('🎉 '+({lite:'라이트',standard:'스탠다드',premium:'프리미엄'}[tier])+' 구독이 시작됐어요!');
}

var AppState = {
  // 광고 패스
  adPassExpire: function(){ return parseInt(localStorage.getItem('ad_free_until')||'0'); },
  adPassActive: function(){ return Date.now() < AppState.adPassExpire(); },

  // 오늘 운세 조회 여부
  todayUnseViewed: function(){
    var pid = (typeof getDefaultProfile==='function'&&getDefaultProfile())?getDefaultProfile().id:'default';
    return !!localStorage.getItem('msr_today_score_'+pid+'_'+(typeof getTodayStr==='function'?getTodayStr():''));
  },

  // 출석 스트릭
  streak: function(){
    return parseInt(localStorage.getItem('msr_att_streak')||'0');
  },

  // 구독 상태
  subPlan: function(){ return (typeof getSubPlan==='function')?getSubPlan():null; },
  isSubscribed: function(){ return AppState.subPlan()!==null; },

  // AI 패스 잔여
  passRemain: function(){ return (typeof getPassRemain==='function')?getPassRemain():0; },

  // 복채
  bokchae: function(){ return (typeof getBokchaeCnt==='function')?getBokchaeCnt():0; },
};

