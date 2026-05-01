
// ── 사주 계산 백엔드 호출 헬퍼 ──
async function callCalcApiWithGender(gY, gM, gD, hour, isMale) {
  try {
    var h = (hour===99||hour===undefined)?99:parseInt(hour);
    var fh = (h===99)?12:h;
    return calcSaju(gY, gM, gD, fh, 0);
  } catch(e) {
    throw new Error('사주 계산 오류: '+e.message);
  }
}

async function callCalcApi(gY, gM, gD, hour) {
  return callCalcApiWithGender(gY, gM, gD, hour, false);
}

// ── 천간/지지 상수 ──
var GAN_KR  = ['갑','을','병','정','무','기','경','신','임','계'];
var JI_KR   = ['자','축','인','묘','진','사','오','미','신','유','술','해'];
/* ═══ OracAi — astrology.js ═══ */
/* 핵심 역학 계산 알고리즘 */

function jd(y,m,d,h){if(h===undefined)h=12;if(m<=2){y--;m+=12;}var A=Math.floor(y/100),B=2-A+Math.floor(A/4);return Math.floor(365.25*(y+4716))+Math.floor(30.6001*(m+1))+d+B-1524.5+h/24;}

function slon(j){var T=(j-2451545)/36525,L0=((280.46646+36000.76983*T+.0003032*T*T)%360+360)%360,M=((357.52911+35999.05029*T-.0001537*T*T)%360+360)%360*Math.PI/180,C=(1.914602-.004817*T-.000014*T*T)*Math.sin(M)+(.019993-.000101*T)*Math.sin(2*M)+.000289*Math.sin(3*M),om=(125.04-1934.136*T)*Math.PI/180;return((L0+C-.00569-.00478*Math.sin(om))%360+360)%360;}

function fjd(y,lon,am){var j0=jd(y,am,1);var lo=j0-20,hi=j0+20;function dv(v){var x=slon(v)-lon;if(x>180)x-=360;else if(x<-180)x+=360;return x;}for(var i=0;i<50;i++){var mid=(lo+hi)/2;if(dv(lo)*dv(mid)<=0)hi=mid;else lo=mid;}return(lo+hi)/2;}

function mpillar(bjd,by){var pool=[];for(var i=0;i<3;i++){var y=by-1+i;for(var j=0;j<JGD.length;j++){var e=JGD[j];pool.push([fjd(y,e[1],e[2]),e[0],e[3],e[4]]);}}pool.sort(function(a,b){return a[0]-b[0];});var best=pool[0];for(var k=0;k<pool.length;k++){if(pool[k][0]<=bjd)best=pool[k];else break;}return{n:best[1],br:best[2],mn:best[3]};}

function calcSaju(Y,M,D,H,MIN){if(MIN===undefined)MIN=0;var dt=new Date(Y,M-1,D,H-9,MIN,0),bjd=jd(dt.getFullYear(),dt.getMonth()+1,dt.getDate(),dt.getHours()+dt.getMinutes()/60),ip=fjd(Y,315,2),sy=bjd>=ip?Y:Y-1,ys=((sy-4)%10+10)%10,yb=((sy-4)%12+12)%12,p=mpillar(bjd,Y),jn=p.n,mb=p.br,mn=p.mn,ms=((ys%5*2+2)%10+mn-1)%10,ddt=H>=23?new Date(Y,M-1,D+1,12):new Date(Y,M-1,D,12),djd=jd(ddt.getFullYear(),ddt.getMonth()+1,ddt.getDate(),12),di=(Math.floor(djd+.5)+49)%60,ds=di%10,db=di%12,hb=H===23?0:Math.floor((H+1)/2)%12,hs=((ds%5*2)%10+hb)%10;return{ys:ys,yb:yb,sy:sy,ms:ms,mb:mb,jn:jn,ds:ds,db:db,hs:hs,hb:hb};}

function tr(d){return d*Math.PI/180;}

function nmJDE(k){var T=k/1236.85,T2=T*T,T3=T2*T,T4=T3*T;var J=2451550.09766+29.530588861*k+.00015437*T2-.00000015*T3+.00000000073*T4;var E=1-.002516*T-.0000074*T2,M=tr(2.5534+29.1053567*k-.0000014*T2),Mp=tr(201.5643+385.81693528*k+.0107582*T2+.00001238*T3),F=tr(160.7108+390.67050284*k-.0016118*T2-.00000227*T3),Om=tr(124.7746-1.56375588*k+.0020672*T2+.00000215*T3);J+=-.40720*Math.sin(Mp)+.17241*E*Math.sin(M)+.01608*Math.sin(2*Mp)+.01039*Math.sin(2*F)+.00739*E*Math.sin(Mp-M)-.00514*E*Math.sin(Mp+M)+.00208*E*E*Math.sin(2*M)-.00111*Math.sin(Mp-2*F)-.00057*Math.sin(Mp+2*F)+.00056*E*Math.sin(2*Mp+M)-.00042*Math.sin(3*Mp)+.00042*E*Math.sin(M+2*F)+.00038*E*Math.sin(M-2*F)-.00024*E*Math.sin(2*Mp-M)-.00017*Math.sin(Om)-.00007*Math.sin(Mp+2*M)+.00004*Math.sin(2*Mp-2*F)+.00004*Math.sin(3*M)+.00003*Math.sin(Mp+M-2*F)+.00003*Math.sin(2*Mp+2*F)-.00003*Math.sin(Mp+M+2*F)+.00003*Math.sin(Mp-M+2*F)-.00002*Math.sin(Mp-M-2*F)-.00002*Math.sin(3*Mp+M)+.00002*Math.sin(4*Mp);var C=[[.000325,299.77+.107408*k-.009173*T2],[.000165,251.88+.016321*k],[.000164,251.83+26.651886*k],[.000126,349.42+36.412478*k],[.00011,84.66+18.206239*k],[.000062,141.74+53.303771*k],[.00006,207.14+2.453732*k],[.000056,154.84+7.30686*k],[.000047,34.52+27.261239*k],[.000042,207.19+.121824*k],[.00004,291.34+1.844379*k],[.000037,161.72+24.198154*k],[.000035,239.56+25.513099*k],[.000023,331.55+3.592518*k]];for(var i=0;i<C.length;i++){J+=C[i][0]*Math.sin(tr(C[i][1]));}return J;}

function getMoons(jde1,jde2){var k0=Math.floor((2000+(jde1-2451545)/365.25-2000)*12.3685)-2,ms=[];for(var k=k0;;k++){var x=nmJDE(k);if(x>jde2+35)break;if(x>=jde1-35)ms.push({jde:x,dn:Math.floor(x+9/24+.5)});}return ms;}

function hasJ(d1,d2){var ya=Math.round(2000+(d1-2451545)/365.25);for(var y=ya-1;y<=ya+1;y++){for(var i=0;i<JGG.length;i++){var dn=Math.floor(fjd(y,JGG[i][0],JGG[i][1])+9/24+.5);if(dn>=d1&&dn<d2)return true;}}return false;}

function buildM(dzA,dzB){var adN=Math.floor(dzA+9/24+.5),bdN=Math.floor(dzB+9/24+.5),ms=getMoons(dzA-35,dzB+5);var aI=-1,bI=-1;for(var i=0;i<ms.length-1;i++){if(aI<0&&ms[i].dn<=adN&&adN<ms[i+1].dn)aI=i;if(bI<0&&ms[i].dn<=bdN&&bdN<ms[i+1].dn)bI=i;}if(aI<0||bI<0)return null;var res=[],leap=(bI-aI)===13;var mn=11,prev=11,ld=false;for(var i=aI;i<bI;i++){var s=ms[i].dn,e=ms[i+1].dn,h=hasJ(s,e);if(leap&&!ld&&!h&&i>aI){res.push({m:prev,isLeap:true,s:s,e:e});ld=true;}else{res.push({m:mn,isLeap:false,s:s,e:e});prev=mn;mn=(mn%12)+1;}}return res;}

function g2l(gY,gM,gD,gH){if(gH===undefined)gH=12;var bdn=Math.floor(jd(gY,gM,gD,gH)+.5),dzT=fjd(gY,270,12),dzP=fjd(gY-1,270,12),dzN=fjd(gY+1,270,12);var dzA,dzB,dgy;if(bdn>=Math.floor(dzT+9/24+.5)){dzA=dzT;dzB=dzN;dgy=gY;}else{dzA=dzP;dzB=dzT;dgy=gY-1;}var months=buildM(dzA,dzB);if(!months)return null;var lm=months.find(function(x){return x.s<=bdn&&bdn<x.e;});if(!lm)return null;return{year:lm.m>=11?dgy:dgy+1,month:lm.m,day:bdn-lm.s+1,isLeap:lm.isLeap};}

function l2g(lY,lM,lD,isLeap){if(isLeap===undefined)isLeap=false;for(var i=0;i<2;i++){var dy=[lY-1,lY][i];var months=buildM(fjd(dy,270,12),fjd(dy+1,270,12));if(!months)continue;var lm=months.find(function(x){return x.m===lM&&x.isLeap===isLeap;});if(!lm)continue;if((lm.m>=11?dy:dy+1)!==lY)continue;if(lD<1||lD>lm.e-lm.s)return null;var n=lm.s+lD-1,al=Math.floor((n-1867216.25)/36524.25),A=n+1+al-Math.floor(al/4),B=A+1524,Cv=Math.floor((B-122.1)/365.25),Dv=Math.floor(365.25*Cv),Ev=Math.floor((B-Dv)/30.6001),day=B-Dv-Math.floor(30.6001*Ev),month=Ev<14?Ev-1:Ev-13,year=month>2?Cv-4716:Cv-4715;return{year:year,month:month,day:day};}return null;}

function calcSunLon(year,month,day,hour){
  var jd=toJD_KST(year,month,day,hour||12);
  var n=jd-2451545.0;
  var L=(280.46+0.9856474*n)%360;
  var g=((357.528+0.9856003*n)%360)*Math.PI/180;
  var lon=L+1.9148*Math.sin(g)+0.0200*Math.sin(2*g)+0.0003*Math.sin(3*g);
  return((lon%360)+360)%360;
}

function calcMoonLon(year,month,day,hour){
  var jd=toJD_KST(year,month,day,hour||12);
  var d=jd-2451545.0;
  var L=((218.316+13.176396*d)%360+360)%360;
  var M=((134.963+13.064993*d)%360+360)%360*Math.PI/180;
  var F=((93.272+13.229350*d)%360+360)%360*Math.PI/180;
  var D=((297.850+12.190749*d)%360+360)%360*Math.PI/180;
  var lon=L+6.289*Math.sin(M)-1.274*Math.sin(2*D-M)+0.658*Math.sin(2*D)
          -0.214*Math.sin(2*M)+0.110*Math.sin(D)-0.186*Math.sin(M-D)
          +0.059*Math.sin(2*D-2*M)-0.057*Math.sin(2*D-M+D);
  return((lon%360)+360)%360;
}

function calcRahuLon(year,month,day){
  var jd=toJD_KST(year,month,day,12);
  var d=jd-2451545.0;
  var rahu=(125.044-0.0529539*d)%360;
  return((rahu%360)+360)%360;
}

function calcPlanetLon(year,month,day,planet){
  var jd=toJD_KST(year,month,day,12);
  var d=jd-2451545.0;
  var T=d/36525.0;
  var lon=0;
  if(planet==='mercury'){
    var L=(252.251+4.09233445*d)%360;
    var M=((174.795+4.09233445*d)%360)*Math.PI/180;
    lon=L+23.440*Math.sin(M)+2.869*Math.sin(2*M)+0.364*Math.sin(3*M);
  } else if(planet==='venus'){
    var L2=(181.979+1.60216872*d)%360;
    var M2=((220.422+1.60213034*d)%360)*Math.PI/180;
    lon=L2+0.777*Math.sin(M2)+0.628*Math.sin(2*M2);
    // 태양 기반 보정
    var sunM=((357.528+0.9856003*d)%360)*Math.PI/180;
    lon+=1.5*Math.sin(M2-2*sunM);
  } else if(planet==='mars'){
    var L3=(355.433+0.52402068*d)%360;
    var M3=((19.373+0.52402075*d)%360)*Math.PI/180;
    lon=L3+10.691*Math.sin(M3)+0.623*Math.sin(2*M3)+0.050*Math.sin(3*M3);
  } else if(planet==='jupiter'){
    var L4=(34.351+0.08308530*d)%360;
    var M4=((20.020+0.08309879*d)%360)*Math.PI/180;
    lon=L4+5.555*Math.sin(M4)+0.168*Math.sin(2*M4);
    var sunM4=((357.528+0.9856003*d)%360)*Math.PI/180;
    lon+=0.922*Math.sin(M4-2*sunM4)+0.307*Math.sin(2*M4-2*sunM4);
  } else if(planet==='saturn'){
    var L5=(50.077+0.03344414*d)%360;
    var M5=((317.020+0.03344968*d)%360)*Math.PI/180;
    lon=L5+6.393*Math.sin(M5)+0.166*Math.sin(2*M5);
    var sunM5=((357.528+0.9856003*d)%360)*Math.PI/180;
    lon+=0.545*Math.sin(M5-2*sunM5);
  }
  return((lon%360)+360)%360;
}

function calcAscendant(year,month,day,hour,lat,lon){
  lat=lat||37.5666; lon=lon||126.9779;
  // KST → UTC
  var utcH=hour-9;
  var d2=day,m2=month,y2=year;
  if(utcH<0){utcH+=24;d2--;if(d2<1){m2--;if(m2<1){m2=12;y2--;}d2=[0,31,28,31,30,31,30,31,31,30,31,30,31][m2]+(m2===2&&((y2%4===0&&y2%100!==0)||y2%400===0)?1:0);}}

  var jd=toJD_UTC(y2,m2,d2,utcH);
  var T=(jd-2451545.0)/36525.0;

  // 정밀 GMST 계산 (IAU 1982)
  var GMST=280.46061837+360.98564736629*(jd-2451545.0)
           +0.000387933*T*T-T*T*T/38710000;
  GMST=((GMST%360)+360)%360;

  // 지방항성시 (LST)
  var LST=((GMST+lon)%360+360)%360;

  // 황도 기울기 (정밀)
  var eps=(23.439291111-0.013004167*T-0.0000001639*T*T+0.0000005036*T*T*T)*Math.PI/180;

  var lstRad=LST*Math.PI/180;
  var latRad=lat*Math.PI/180;

  // 상승궁 황경 계산
  var ascRad=Math.atan2(Math.cos(lstRad),-(Math.sin(lstRad)*Math.cos(eps)+Math.tan(latRad)*Math.sin(eps)));
  var asc=((ascRad*180/Math.PI)%360+360)%360;

  // 황도 1사분면 보정
  if(Math.cos(lstRad)<0) asc=(asc+180)%360;

  return asc;
}

function calcVimshottariDasha(gY,gM,gD,moonLon){
  try{
    // 라히리 아야남샤 (Lahiri Ayanamsa) → 항성 달 황경
    var ayanamsa=23.85+(gY-2000)*0.01397;
    var sidMoon=((moonLon-ayanamsa)%360+360)%360;

    // 27 낙샤트라와 다샤주 (순서: 케투부터)
    var NK=[
      {n:'아쉬위니(Ashwini)',   l:'케투',  y:7},
      {n:'바라니(Bharani)',     l:'금성',  y:20},
      {n:'크리티카(Krittika)',  l:'태양',  y:6},
      {n:'로히니(Rohini)',      l:'달',    y:10},
      {n:'므리가시라(Mrigashira)',l:'화성', y:7},
      {n:'아르드라(Ardra)',     l:'라후',  y:18},
      {n:'푸나르바수(Punarvasu)',l:'목성', y:16},
      {n:'푸샤(Pushya)',        l:'토성',  y:19},
      {n:'아슐레샤(Ashlesha)',  l:'수성',  y:17},
      {n:'마가(Magha)',         l:'케투',  y:7},
      {n:'푸르바팔구니',        l:'금성',  y:20},
      {n:'웃타라팔구니',        l:'태양',  y:6},
      {n:'하스타(Hasta)',       l:'달',    y:10},
      {n:'치트라(Chitra)',      l:'화성',  y:7},
      {n:'스와티(Swati)',       l:'라후',  y:18},
      {n:'비사카(Vishakha)',    l:'목성',  y:16},
      {n:'아누라다(Anuradha)', l:'토성',   y:19},
      {n:'즈예쉬타(Jyeshtha)', l:'수성',  y:17},
      {n:'물라(Mula)',          l:'케투',  y:7},
      {n:'푸르바아샤다',        l:'금성',  y:20},
      {n:'웃타라아샤다',        l:'태양',  y:6},
      {n:'슈라바나(Shravana)', l:'달',    y:10},
      {n:'다니쉬타(Dhanishtha)',l:'화성', y:7},
      {n:'샤타비샤(Shatabhisha)',l:'라후', y:18},
      {n:'푸르바바드라파다',    l:'목성',  y:16},
      {n:'웃타라바드라파다',    l:'토성',  y:19},
      {n:'레바티(Revati)',      l:'수성',  y:17}
    ];

    var SPAN=360/27; // 13.333°/낙샤트라
    var nIdx=Math.floor(sidMoon/SPAN)%27;
    var nPos=sidMoon%SPAN;
    var nk=NK[nIdx];
    var remaining=(SPAN-nPos)/SPAN; // 0~1 (현재 낙샤트라 남은 비율)

    // 출생일 기준 연도 (소수)
    var birthYr=gY+(gM-1)/12+(gD-1)/365.25;
    var nowYr=new Date().getFullYear()+(new Date().getMonth())/12+new Date().getDate()/365.25;

    // 다샤 순서 (케투=0 기준)
    var DASHA_ORDER=['케투','금성','태양','달','화성','라후','목성','토성','수성'];
    var DASHA_YEARS={케투:7,금성:20,태양:6,달:10,화성:7,라후:18,목성:16,토성:19,수성:17};

    // 시작 다샤주의 인덱스
    var startLord=nk.l;
    var startIdx=DASHA_ORDER.indexOf(startLord);

    // 다샤 시퀀스 생성
    var seq=[];
    var t=birthYr;

    // 첫 다샤 (남은 부분)
    var firstYrs=remaining*nk.y;
    seq.push({lord:startLord,start:t,end:t+firstYrs,years:firstYrs,nakshatra:nk.n});
    t+=firstYrs;

    // 이후 다샤들 (최대 120년치)
    var idx=(startIdx+1)%9;
    while(t<birthYr+120){
      var lord=DASHA_ORDER[idx];
      var yrs=DASHA_YEARS[lord];
      seq.push({lord:lord,start:t,end:t+yrs,years:yrs,nakshatra:''});
      t+=yrs;
      idx=(idx+1)%9;
    }

    // 현재 다샤 찾기
    var cur=null,nxt=null;
    for(var i=0;i<seq.length;i++){
      if(seq[i].start<=nowYr&&seq[i].end>nowYr){
        cur=seq[i]; nxt=seq[i+1]||null; break;
      }
    }

    // 현재 다샤 경과/남은 년수
    var elapsed=cur?Math.round((nowYr-cur.start)*10)/10:0;
    var remain=cur?Math.round((cur.end-nowYr)*10)/10:0;

    return {
      nakshatra:nk.n, nakshatraLord:nk.l, sidMoon:Math.round(sidMoon*10)/10,
      sequence:seq.slice(0,9), // 생애 전체 9개 주기
      current:cur, next:nxt, elapsed:elapsed, remain:remain
    };
  }catch(e){return null;}
}

function lonToSign(lon){return Math.floor(((lon%360)+360)%360/30);}

function lonToDeg(lon){return Math.round(((lon%360)+360)%360%30*10)/10;}

function calcNatalChart(gY,gM,gD,hour,noHour,lat,lon){
  var h=noHour?12:(hour||12);
  var sunLon=calcSunLon(gY,gM,gD,h);
  var moonLon=calcMoonLon(gY,gM,gD,h);
  var rahuLon=calcRahuLon(gY,gM,gD);
  var ascLon=noHour?null:calcAscendant(gY,gM,gD,h,lat,lon);
  var ketuLon=((rahuLon+180)%360);
  // Vimshottari Dasha (달 황경 기반)
  var dasha=calcVimshottariDasha(gY,gM,gD,moonLon);
  return {
    sun:{sign:lonToSign(sunLon),deg:lonToDeg(sunLon),lon:sunLon},
    moon:{sign:lonToSign(moonLon),deg:lonToDeg(moonLon),lon:moonLon},
    rahu:{sign:lonToSign(rahuLon),deg:lonToDeg(rahuLon),lon:rahuLon},
    ketu:{sign:lonToSign(ketuLon),deg:lonToDeg(ketuLon),lon:ketuLon},
    asc:ascLon!==null?{sign:lonToSign(ascLon),deg:lonToDeg(ascLon),lon:ascLon}:null,
    dasha:dasha,
    noHour:noHour
  };
}

function natalToText(nc,cityNote){
  var s=ZODIAC_NAMES_KR;
  var note=cityNote||'(서울 기준)';
  var txt='[서양+베딕 점성술] '+note+'\n';
  txt+='• 태양궁(☉): '+s[nc.sun.sign]+' '+nc.sun.deg+'° — 핵심 자아·생명력\n';
  txt+='• 달궁(☽): '+s[nc.moon.sign]+' '+nc.moon.deg+'° — 감정·무의식·본능\n';
  txt+='• 라후(☊): '+s[nc.rahu.sign]+' '+nc.rahu.deg+'° — 이번 생 성장 방향\n';
  txt+='• 케투(☋): '+s[nc.ketu.sign]+' '+nc.ketu.deg+'° — 전생의 익숙한 패턴\n';
  if(nc.asc){
    txt+='• 상승궁(ASC): '+s[nc.asc.sign]+' '+nc.asc.deg+'° — 외면·첫인상·삶의 방식\n';
  }else{
    txt+='• 상승궁: 출생 시간 필요\n';
  }
  // Vimshottari Dasha
  if(nc.dasha&&nc.dasha.current){
    var cur=nc.dasha.current;
    var nxt=nc.dasha.next;
    txt+='\n[빔쇼타리 다샤 — 현재 인생 시기]\n';
    txt+='• 출생 낙샤트라: '+nc.dasha.nakshatra+' ('+nc.dasha.nakshatraLord+' 다샤)\n';
    txt+='• 현재 다샤: '+cur.lord+' 다샤 ('+Math.round(cur.start)+'년~'+Math.round(cur.end)+'년)\n';
    txt+='• 경과: '+nc.dasha.elapsed+'년 · 남은 기간: '+nc.dasha.remain+'년\n';
    if(nxt) txt+='• 다음 다샤: '+nxt.lord+' 다샤 ('+Math.round(nxt.start)+'년~'+Math.round(nxt.end)+'년, '+nxt.years+'년간)\n';
    // 다샤 의미
    var dashaMeaning={
      '케투':'영적 성장·분리·집착 내려놓기. 과거와의 단절이 필요한 시기.',
      '금성':'사랑·아름다움·물질적 풍요. 인연과 재물이 들어오는 시기.',
      '태양':'자아 확립·명예·아버지운. 리더십이 빛나는 시기.',
      '달':'감수성·직관·어머니운. 감정이 풍부해지고 변화가 많은 시기.',
      '화성':'행동력·투쟁·에너지. 적극적으로 나아가야 하는 시기.',
      '라후':'야망·물질욕·외국 인연. 변화와 혼돈 속에서 성장하는 시기.',
      '목성':'지혜·성장·행운. 인생에서 가장 확장되는 황금 시기.',
      '토성':'시련·인내·카르마 정산. 노력한 만큼 결실이 오는 시기.',
      '수성':'소통·학습·분석. 지적 활동과 네트워크가 활발한 시기.'
    };
    if(dashaMeaning[cur.lord]) txt+='• '+cur.lord+' 다샤 의미: '+dashaMeaning[cur.lord]+'\n';
  }
  return txt;
}

function calcZiweiDoushu(gY, gM, gD, hour, gen) {
  try {
    var lunar = g2l(gY, gM, gD, hour===99?12:hour);
    if (!lunar) return null;
    var lY=lunar.year, lM=lunar.month, lD=lunar.day;

    // 시지 (子=0,丑=1,...,亥=11)
    var h=(hour===99||hour===undefined)?12:hour;
    var hB=h===23?0:Math.floor((h+1)/2)%12;

    // ① 命宮 지지
    // 寅(2)宮에서 정월 시작, 생월만큼 순행, 생시만큼 역행
    var mG=(2+lM-1-hB+36)%12;

    // ② 年干
    var yS=((lY-4)%10+10)%10; // 甲=0...癸=9

    // ③ 五虎遁年 → 寅월 천간
    // 甲己→丙寅, 乙庚→戊寅, 丙辛→庚寅, 丁壬→壬寅, 戊癸→甲寅
    var yinStems=[2,4,6,8,0,2,4,6,8,0];
    var yinStem=yinStems[yS];

    // ④ 命宮 천간
    // 寅(2)에서 시작, 命宮 지지까지 각 지지당 천간 2씩 증가
    var mGS=(yinStem+((mG-2+12)%12)*2)%10;

    // ⑤ 五行局
    // 甲己→水2, 乙庚→木3, 丙辛→金4, 丁壬→土5, 戊癸→火6
    var bureaus=[2,3,4,5,6,2,3,4,5,6];
    var bureau=bureaus[mGS];
    var bureauName=['','','水二局','木三局','金四局','土五局','火六局'][bureau];

    // ⑥ 紫微星 위치 (음력 생일 기준)
    var k=Math.ceil(lD/bureau);
    var ZW=(1+k)%12; // 子=0 시스템에서 k=1→寅(2)

    // ⑦ 天府星 위치 (紫微와 대칭)
    var TF=(4-ZW+12)%12;

    // ⑧ 14정성 배치
    var S={};
    // 紫微系 (자미성에서 시계방향)
    S['紫微']  = ZW;
    S['天機']  = (ZW+11)%12;  // ZW-1
    S['太陽']  = (ZW+2)%12;
    S['武曲']  = (ZW+3)%12;
    S['天同']  = (ZW+4)%12;
    S['廉貞']  = (ZW+7)%12;
    // 天府系 (천부성에서 시계방향)
    S['天府']  = TF;
    S['太陰']  = (TF+1)%12;
    S['貪狼']  = (TF+2)%12;
    S['巨門']  = (TF+3)%12;
    S['天相']  = (TF+4)%12;
    S['天梁']  = (TF+5)%12;
    S['七殺']  = (TF+6)%12;
    S['破軍']  = (TF+10)%12;

    // ⑨ 12궁 배치 (命宮=0번부터 순서대로)
    var pNames=['命宮','兄弟宮','夫妻宮','子女宮','財帛宮','疾厄宮','遷移宮','僕役宮','官祿宮','田宅宮','福德宮','父母宮'];
    var pKr=['명궁','형제궁','부처궁(인연)','자녀궁','재백궁(재물)','질액궁(건강)','천이궁(변화)','복역궁','관록궁(직업)','전택궁','복덕궁(행복)','부모궁'];
    var pStars={};
    for(var sn in S){
      var pi=(S[sn]-mG+12)%12;
      if(!pStars[pi]) pStars[pi]=[];
      pStars[pi].push(sn);
    }

    // ⑩ 주요 별 한국어 의미
    var starMeaning={
      '紫微':'황제의 별 — 리더십·귀인운·카리스마. 자연스럽게 중심이 되는 운명.',
      '天機':'지략의 별 — 뛰어난 두뇌·변화 적응력. 전략적 사고가 강함.',
      '太陽':'태양의 별 — 명예·활동력·개방성. 사람들 속에서 에너지를 얻음.',
      '武曲':'무곡의 별 — 강한 의지·재물 축적력. 현실적 성취에 뛰어남.',
      '天同':'복록의 별 — 낙천적·예술적 감수성. 삶 자체를 즐기는 기질.',
      '廉貞':'정열의 별 — 강렬한 열정·결단력. 충동과 고집이 함께 있음.',
      '天府':'안정의 별 — 귀인운·재물 안정. 든든한 지원과 보호.',
      '太陰':'달의 별 — 뛰어난 직관·감수성·내면의 깊이. 여성운 강함.',
      '貪狼':'욕망의 별 — 다재다능·강한 매력·이성운. 원하는 게 많음.',
      '巨門':'언변의 별 — 뛰어난 언변·의심이 많음. 말로 먹고 사는 타입.',
      '天相':'보좌의 별 — 협조적·귀인에게 도움받음. 보조 역할에서 빛남.',
      '天梁':'지혜의 별 — 깊은 지혜·보호 기운. 장수하고 정신력이 강함.',
      '七殺':'독립의 별 — 강렬한 독립심·추진력. 자신만의 길을 개척.',
      '破軍':'변혁의 별 — 파괴와 창조의 반복. 기존 틀을 깨는 개혁가.'
    };

    // ⑪ 핵심 궁별 텍스트 생성
    var JG=['자','축','인','묘','진','사','오','미','신','유','술','해'];
    var JGK=['子','丑','寅','卯','辰','巳','午','未','申','酉','戌','亥'];
    var GGK=['甲','乙','丙','丁','戊','己','庚','辛','壬','癸'];

    var result=[];
    result.push('[자미두수(紫微斗數) 정밀 포반]');
    result.push('음력 '+lY+'년 '+lM+'월 '+lD+'일 · 시지: '+JG[hB]+'시');
    result.push('명궁: '+JG[mG]+'('+JGK[mG]+') · 명궁 천간: '+GGK[mGS]+' · '+bureauName);
    result.push('자미성 위치: '+JG[ZW]+'('+JGK[ZW]+') · 천부성 위치: '+JG[TF]+'('+JGK[TF]+')');
    result.push('');

    // 주요 5궁 분석
    var keyPalaces=[0,2,4,8,10]; // 명궁,부처궁,재백궁,관록궁,복덕궁
    keyPalaces.forEach(function(pi){
      var stars=pStars[pi]||[];
      if(stars.length===0) return;
      var desc=stars.map(function(s){return starMeaning[s]||s;}).join(' / ');
      result.push(pKr[pi]+': '+stars.map(function(s){return s+'('+s+')'}).join('+')+'  → '+desc);
    });

    return result.join('\n');
  } catch(e){ return null; }
}

function calcDaewunNum(gY,gM,gD,hour,isMale){
  try{
    var h=(hour===99||hour===undefined)?12:hour;
    var utcH=h-9; var d2=gD,m2=gM,y2=gY;
    if(utcH<0){utcH+=24;d2--;if(d2<1){m2--;if(m2<1){m2=12;y2--;}d2=28;}}
    var birthJd=jd(y2,m2,d2,utcH);
    var isYang=(gY%2===1);
    var fwd=(isMale&&isYang)||(!isMale&&!isYang);
    var minDiff=99999;
    for(var dy=-1;dy<=1;dy++){
      var y=gY+dy;
      for(var i=0;i<_TERM24.length;i++){
        try{
          var tJd=fjd(y,_TERM24[i][0],_TERM24[i][1]);
          var diff=fwd?(tJd-birthJd):(birthJd-tJd);
          if(diff>0.1&&diff<minDiff) minDiff=diff;
        }catch(e2){}
      }
    }
    if(minDiff>=99999) return 3;
    return Math.max(1,Math.min(9,Math.round(minDiff/3)));
  }catch(e){return 3;}
}

function buildRichSajuContext(def, tier){
  if(!def) return '(프로필 없음)';
  var noH=(def.hour===99||def.hour===undefined);
  var lines=[];

  lines.push('[기본 정보]');
  lines.push('이름: '+def.name+'  성별: '+(def.gen==='male'?'남성':'여성'));
  lines.push('생년월일: '+def.gY+'년 '+p2(def.gM)+'월 '+p2(def.gD)+'일'+(noH?' (시간모름)':' '+p2(def.hour)+'시'));

  if(def.saju){
    lines.push('');
    lines.push('[사주팔자]  '+def.saju);
  }

  // ── LD 기반 사주 상세 ──
  if(typeof LD!=='undefined'&&LD&&LD.gY===def.gY&&LD.gM===def.gM&&LD.gD===def.gD){
    var GG=['갑','을','병','정','무','기','경','신','임','계'];
    var GH=['목(양)','목(음)','화(양)','화(음)','토(양)','토(음)','금(양)','금(음)','수(양)','수(음)'];
    var JG=['자','축','인','묘','진','사','오','미','신','유','술','해'];
    var JH=['수','토','목','목','토','화','화','토','금','금','토','수'];
    var ds=LD.ds, db=LD.db;

    // 일주 특성
    var ilju=(GG[ds]||'')+(JG[db]||'');
    var iljuTraits={
      '갑자':'리더십 있지만 현실 안주 경향. 의지 강하고 독립적.',
      '갑인':'강한 추진력. 자존심 강하고 경쟁심 높음. 시작은 잘 하나 마무리 약함.',
      '갑오':'화려하고 직관적. 감정 기복 있음. 인기 많지만 외로움 탐.',
      '갑신':'갈등 많은 일주. 능력은 있으나 관재구설 주의.',
      '갑술':'고집 세고 신중. 재물과 인연 있으나 고독함.',
      '갑진':'실력파. 자기 확신 강함. 고집으로 인해 주변과 마찰.',
      '을축':'성실하고 꼼꼼. 재물 복 있으나 답답함을 느낌.',
      '을묘':'감수성 풍부. 예술적 재능. 의존성 있고 우유부단함.',
      '을사':'지적이고 섬세. 숨겨진 강인함. 고독한 영혼.',
      '을미':'온화하고 인정 많음. 재물 인연 있으나 감정 소모 큼.',
      '을유':'완벽주의. 냉정하고 분석적. 외로움 많이 탐.',
      '을해':'이상주의적. 감성 풍부. 현실 감각 다소 부족.',
      '병자':'열정적이고 직설적. 감정 기복 큼. 충돌 잦음.',
      '병인':'화끈하고 적극적. 리더 기질. 성급함이 단점.',
      '병오':'강렬한 에너지. 자기표현 강함. 감정 조절 필요.',
      '병신':'이중적. 겉은 강하고 속은 예민. 갈등 많은 구조.',
      '병술':'실행력 강함. 뚝심 있음. 고집으로 손해 보기도.',
      '병진':'추진력과 리더십. 자기중심적 경향. 성취욕 강함.',
      '정축':'세심하고 배려 깊음. 재물 있으나 소심함으로 기회 놓침.',
      '정묘':'감성적이고 예술적. 섬세하지만 상처 잘 받음.',
      '정사':'총명하고 집중력 강함. 완벽주의. 번아웃 주의.',
      '정미':'따뜻하고 포용적. 봉사 정신. 자기 희생 과함.',
      '정유':'예리하고 분석적. 비판적 성향. 완벽함 추구.',
      '정해':'이상적이고 낭만적. 감수성 풍부. 현실 직시 필요.',
      '무자':'실용적이고 안정 추구. 재물 인연 있으나 감정 메마름.',
      '무인':'강직하고 의지 강함. 독선적 경향. 주관 확고.',
      '무오':'열정적이고 자신감 넘침. 오버페이스 주의.',
      '무신':'현실적이고 분석적. 갈등 구조 내재. 능력 출중.',
      '무술':'고집 세고 신중. 토(土) 과다로 답답함. 성실함.',
      '무진':'토(土) 과다. 고집과 신중함. 변화에 저항.',
      '기축':'성실하고 인내심 강함. 답답하지만 안정적.',
      '기묘':'따뜻하고 감성적. 협력 잘 함. 우유부단함.',
      '기사':'총명하고 끈기 있음. 자존심 강함. 변화 두려워함.',
      '기미':'온순하고 배려 깊음. 과도한 배려로 손해.',
      '기유':'꼼꼼하고 완벽주의. 냉정한 판단력. 외로움.',
      '기해':'이상주의. 감수성 강함. 현실과 이상의 괴리.',
      '경자':'영리하고 실리적. 경쟁심 강함. 냉철한 판단.',
      '경인':'강하고 독립적. 시작을 잘 함. 갈등 구조 많음.',
      '경오':'화끈하고 직선적. 감정적 충돌 잦음. 에너지 넘침.',
      '경신':'강직하고 원칙적. 독선적. 인간관계 마찰.',
      '경술':'근면하고 뚝심 있음. 고집 강함. 현실적.',
      '경진':'강한 추진력. 갈등 많은 구조. 능력은 탁월.',
      '신축':'섬세하고 완벽주의. 재물 있으나 소심함.',
      '신묘':'예술적 감수성. 부드럽지만 냉철함 내재.',
      '신사':'총명하고 예리함. 고독한 영혼. 집착 경향.',
      '신미':'따뜻하고 인정 많음. 재물 인연. 감정 소모.',
      '신유':'완벽주의. 냉철하고 예리. 인간관계 어려움.',
      '신해':'감성적이고 이상적. 직관 뛰어남. 현실감 부족.',
      '임자':'총명하고 직관적. 감정 기복. 자기중심적.',
      '임인':'강한 추진력. 개혁가 기질. 갈등 구조.',
      '임오':'화끈하고 감정 풍부. 충동적. 인기 많음.',
      '임신':'총명하고 실리적. 갈등 내재. 능력 출중.',
      '임술':'끈기와 실행력. 고집 강함. 현실적 성취.',
      '임진':'지도력과 추진력. 자기중심. 성취욕 강함.',
      '계축':'인내심 강하고 성실. 소심함. 재물 있음.',
      '계묘':'감성적이고 예술적. 섬세하고 상처 잘 받음.',
      '계사':'총명하고 이중적. 속마음 숨김. 집착.',
      '계미':'따뜻하고 감성적. 감정 소모 큼. 이상주의.',
      '계유':'냉철하고 분석적. 완벽주의. 고독함.',
      '계해':'감수성 극강. 이상주의. 현실과 괴리.'
    };
    var iljuDesc=iljuTraits[ilju]||'';

    lines.push('');
    lines.push('[일주(日柱) — 사주의 핵심, 나 자신]');
    lines.push('일주: '+ilju+' ('+GH[ds]+' / 지지: '+(JG[db]||'')+'  오행: '+(JH[db]||'')+')');
    if(iljuDesc) lines.push('일주 특성: '+iljuDesc);

    // 오행 분포
    if(LD.cnt){
      var oh=Object.entries(LD.cnt).map(function(e){return e[0]+' '+e[1]+'개';}).join(', ');
      lines.push('오행 분포: '+oh+(noH?' (3주 기준, 시주 미산정)':''));
      // 과다/부족 분석
      var cnts=LD.cnt;
      var strong=Object.entries(cnts).filter(function(e){return e[1]>=3;}).map(function(e){return e[0];});
      var weak=Object.entries(cnts).filter(function(e){return e[1]===0;}).map(function(e){return e[0];});
      if(strong.length) lines.push('과다 오행: '+strong.join(', ')+' → '+strong.map(function(o){
        return ({목:'고집·분노·시작집착',화:'충동·감정기복·과열',토:'답답함·고집·비만',금:'냉철함·냉정·집착',수:'감성과다·두려움·방랑'}[o]||'');
      }).join(', '));
      if(weak.length) lines.push('부족 오행: '+weak.join(', ')+' → '+weak.map(function(o){
        return ({목:'추진력 부족·결단력 약함',화:'열정 부족·자신감 저하',토:'현실감각 부족·산만',금:'결단력·정리정돈 약함',수:'감수성 부족·직관 약함'}[o]||'');
      }).join(', '));
    }

    // 절기
    if(LD.jn) lines.push('월령 절기: '+LD.jn);
  }

  // ── 합충 분석 ──
  if(def.saju){
    lines.push('');
    lines.push('[합충 분석]');
    var sajuStr=def.saju;
    // 지지 추출 (두 번째 글자들)
    var jiJi=[];
    var jjMap={'자':'자','축':'축','인':'인','묘':'묘','진':'진','사':'사','오':'오','미':'미','신':'신','유':'유','술':'술','해':'해'};
    for(var i=0;i<sajuStr.length;i++){
      if(jjMap[sajuStr[i]]) jiJi.push(sajuStr[i]);
    }
    var chongPairs=[['자','오'],['축','미'],['인','신'],['묘','유'],['진','술'],['사','해']];
    var hapPairs=[['자','축'],['인','해'],['묘','술'],['진','유'],['사','신'],['오','미']];
    var foundChong=[], foundHap=[];
    chongPairs.forEach(function(pair){
      if(jiJi.includes(pair[0])&&jiJi.includes(pair[1])) foundChong.push(pair[0]+pair[1]+'충');
    });
    hapPairs.forEach(function(pair){
      if(jiJi.includes(pair[0])&&jiJi.includes(pair[1])) foundHap.push(pair[0]+pair[1]+'합');
    });
    // 천간합
    var ganHapMap={'갑기':'갑기합(토)',을경:'을경합(금)','병신':'병신합(수)','정임':'정임합(목)','무계':'무계합(화)'};
    var ganStr=def.saju.replace(/[자축인묘진사오미신유술해]/g,'');
    Object.keys(ganHapMap).forEach(function(k){
      var g1=k[0],g2=k[1];
      if(ganStr.includes(g1)&&ganStr.includes(g2)) foundHap.push(ganHapMap[k]);
    });

    if(foundChong.length) lines.push('충(沖): '+foundChong.join(', ')+' → 변화·갈등·불안정·이동 에너지');
    if(foundHap.length) lines.push('합(合): '+foundHap.join(', ')+' → 결합·안정·관계 형성 에너지');
    if(!foundChong.length&&!foundHap.length) lines.push('주요 합충 없음');
  }

  // ── 공망(空亡) 계산 ──
  if(typeof LD!=='undefined'&&LD&&LD.gY===def.gY){
    var gongmangTable={
      0:['술','해'],1:['신','유'],2:['오','미'],3:['진','사'],
      4:['인','묘'],5:['자','축'],6:['술','해'],7:['신','유'],
      8:['오','미'],9:['진','사']
    };
    var gm=gongmangTable[LD.ds%10];
    if(gm) lines.push('공망(空亡): '+gm[0]+gm[1]+' → '+gm[0]+'·'+gm[1]+' 지지에 해당하는 것(직업·인연·재물 등)이 공허하게 될 수 있음');
  }

  // ── 대운 계산 (나이+연도 정확하게) ──
  if(typeof LD!=='undefined'&&LD&&LD.gY===def.gY){
    var now=new Date();
    var curYear=now.getFullYear();
    var curMonth=now.getMonth()+1;
    // 만 나이: 생일 지났으면 +1
    var age=curYear-def.gY-(curMonth<def.gM?1:0);

    // 대운수 계산: 양남/음여=순행(생일~다음절기), 음남/양여=역행(이전절기~생일)
    var isYangYear=(def.gY%2===1);
    var isMale=(def.gen==='male');
    var fwd=(isMale&&isYangYear)||(!isMale&&!isYangYear);
    // 대운수 정밀 계산 (절기까지 일수÷3)
    var dwNum=calcDaewunNum(def.gY,def.gM,def.gD,def.hour===99?12:def.hour,def.gen==='male');
    var dwStart=def.gY+dwNum; // 대운 시작 연도
    var dwStartAge=dwNum;     // 대운 시작 나이

    // 현재 몇 번째 대운인지
    var dwIdx=Math.max(0,Math.floor((age-dwStartAge)/10));
    var curDwAge=dwStartAge+dwIdx*10;
    var curDwYear=def.gY+curDwAge; // 현재 대운 시작 연도
    var nextDwAge=curDwAge+10;
    var nextDwYear=curDwYear+10;

    var GG2=['갑','을','병','정','무','기','경','신','임','계'];
    var JG2=['자','축','인','묘','진','사','오','미','신','유','술','해'];

    lines.push('');
    lines.push('[대운 정보]');
    lines.push('현재 만 나이: '+age+'세 ('+curYear+'년 기준)');
    lines.push('출생연도: '+def.gY+'년');
    lines.push('현재 대운 구간: 만 '+curDwAge+'세~'+nextDwAge+'세 ('+curDwYear+'년~'+nextDwYear+'년)');
    lines.push('※ AI는 반드시 위 연도 기준으로 답변할 것. 2026년은 올해임.');
  }

  // ── 네이탈 차트 ──
  try{
    var lat=def.cityLat||37.5666, lon=def.cityLon||126.9779;
    var noHr=(def.hour===99||def.hour===undefined);
    var nc=calcNatalChart(def.gY,def.gM,def.gD,noHr?12:def.hour,noHr,lat,lon);
    var cityNote=def.cityName?'('+def.cityName+' 기준)':'(서울 기준)';
    lines.push('');
    lines.push(natalToText(nc,cityNote));
  } catch(e){}

  // ── 프리미엄 전용 역학 (무료는 기본 사주만) ──
  if(tier==='premium'){
  // ── 수비학 (數秘學) ──
  try{
    var digits=(String(def.gY)+String(def.gM).padStart(2,'0')+String(def.gD).padStart(2,'0')).split('').map(Number);
    var sum=digits.reduce(function(a,b){return a+b;},0);
    while(sum>9&&sum!==11&&sum!==22&&sum!==33) sum=String(sum).split('').reduce(function(a,b){return a+Number(b);},0);
    var numMeaning={
      1:'개척·독립·리더십. 혼자 가는 힘이 강하지만 고집과 고독.',
      2:'감수성·조화·직관. 관계에서 소모가 크고 의존성 주의.',
      3:'창의·표현·인기. 감정 기복 크고 집중력 약함.',
      4:'안정·노력·현실. 변화를 두려워하고 답답함이 쌓임.',
      5:'자유·변화·모험. 한 곳에 정착 어렵고 산만함.',
      6:'책임·봉사·가정. 타인을 위해 자신을 희생하는 패턴.',
      7:'분석·고독·신비. 내면 세계가 깊고 현실과 괴리.',
      8:'성취·물질·권력. 집착과 통제욕 강함.',
      9:'완성·이상·희생. 끝을 맺지 못하는 패턴.',
      11:'직관·영적 감수성. 예민함이 강점이자 약점.',
      22:'현실적 이상주의. 큰 계획 세우지만 완성 어려움.',
      33:'봉사·희생·치유. 타인을 위해 자신을 잃는 패턴.'
    };
    lines.push('');
    lines.push('[수비학(數秘學)]');
    lines.push('인생수(生命數): '+sum+' — '+( numMeaning[sum]||'강한 에너지'));
    // 운명수
    var dSum=String(def.gD).split('').reduce(function(a,b){return a+Number(b);},0);
    while(dSum>9) dSum=String(dSum).split('').reduce(function(a,b){return a+Number(b);},0);
    lines.push('운명수(日數): '+dSum+' — 행동 패턴과 대인관계 성향');
  } catch(e){}

  // ── 신살 (神殺) ──
  try{
    var yb2=((def.gY-4)%12+12)%12; // 연지
    var JG3=['자','축','인','묘','진','사','오','미','신','유','술','해'];
    // 일지 (LD에서)
    var db2=(typeof LD!=='undefined'&&LD&&LD.db!==undefined)?LD.db:0;

    var sinsal=[];

    // 도화살(桃花殺): 일지·연지 기준
    var doHwa={0:'유(酉)',3:'오(午)',6:'묘(卯)',9:'자(子)'}; // 자→유, 묘→자, 오→묘, 유→오
    var dhKey=yb2%3===0?yb2:yb2;
    // 연지 기준 도화
    var dohwa_map={0:'유',3:'자',6:'묘',9:'오',1:'오',2:'유',4:'유',5:'자',7:'자',8:'묘',10:'묘',11:'오'};
    if(dohwa_map[yb2]&&JG3[db2]&&dohwa_map[yb2]===JG3[db2])
      sinsal.push('도화살(桃花殺): 매력과 인기가 넘치나 이성 문제 주의');

    // 역마살(驛馬殺): 연지 기준
    var yukma={0:'인',3:'사',6:'신',9:'해',1:'인',2:'인',4:'사',5:'사',7:'신',8:'신',10:'해',11:'해'};
    if(yukma[yb2]&&JG3[db2]===yukma[yb2])
      sinsal.push('역마살(驛馬殺): 이동·변화·해외 인연. 한 곳에 정착 어려움');

    // 화개살(華蓋殺): 예술·종교·고독
    var hwage={0:'술',3:'미',6:'진',9:'축',1:'술',2:'술',4:'미',5:'미',7:'진',8:'진',10:'축',11:'축'};
    if(hwage[yb2]&&JG3[db2]===hwage[yb2])
      sinsal.push('화개살(華蓋殺): 예술·종교적 감수성. 고독한 영혼');

    // 홍염살(紅艶殺): 이성 매력, 일지 기준
    var hongYom=[0,3,4,6,7]; // 자오진신묘 일지
    if(hongYom.indexOf(db2)>=0)
      sinsal.push('홍염살(紅艶殺): 이성에게 강한 매력 발산. 감정 소모 큼');

    // 천을귀인(天乙貴人): 일간 기준
    var ds2=(typeof LD!=='undefined'&&LD&&LD.ds!==undefined)?LD.ds:0;
    var cheoneul={0:[1,7],1:[0,8],2:[11,9],3:[10,8],4:[11,9],5:[0,8],6:[1,7],7:[2,6],8:[3,5],9:[2,6]};
    if(cheoneul[ds2]&&cheoneul[ds2].indexOf(db2)>=0)
      sinsal.push('천을귀인(天乙貴人): 위기 때 귀인이 나타나는 길성. 어려울수록 도움받음');

    // 겁살(劫殺)
    var geop={0:'사',3:'인',6:'해',9:'신',1:'사',2:'사',4:'인',5:'인',7:'해',8:'해',10:'신',11:'신'};
    if(geop[yb2]&&JG3[db2]===geop[yb2])
      sinsal.push('겁살(劫殺): 예상치 못한 손해·사고 주의. 충동 억제 필요');

    if(sinsal.length>0){
      lines.push('');
      lines.push('[신살(神殺)]');
      sinsal.forEach(function(s){lines.push('• '+s);});
    }
  } catch(e){}

  // ── 대운 천간지지 ──
  try{
    if(typeof LD!=='undefined'&&LD&&LD.gY===def.gY){
      var GG3=['갑(甲)','을(乙)','병(丙)','정(丁)','무(戊)','기(己)','경(庚)','신(辛)','임(壬)','계(癸)'];
      var JG4=['자(子)','축(丑)','인(寅)','묘(卯)','진(辰)','사(巳)','오(午)','미(未)','신(申)','유(酉)','술(戌)','해(亥)'];
      var curY2=new Date().getFullYear();
      var age2=curY2-def.gY;
      var dwStart=LD.daewun||8;
      var dwIdx=Math.max(0,Math.floor((age2-dwStart)/10));

      // 대운 방향: 남자 양년생 or 여자 음년생 → 순행, 반대 → 역행
      var isYang=(def.gY%2===1); // 양년(홀수)
      var isMale=(def.gen==='male');
      var forward=(isMale&&isYang)||(!isMale&&!isYang);

      // 월주에서 대운 시작
      var ms=LD.ms, mb=LD.mb;
      var dwGan=(ms+(forward?dwIdx+1:-(dwIdx+1))+60)%10;
      var dwJi=(mb+(forward?dwIdx+1:-(dwIdx+1))+60)%12;

      var curDwAge=dwStart+dwIdx*10;
      lines.push('');
      lines.push('[대운(大運) — 현재 구간]');
      lines.push('대운 시작: '+dwStart+'세, 현재 구간: '+curDwAge+'~'+(curDwAge+10)+'세');
      lines.push('현재 대운 천간지지: '+GG3[dwGan]+' '+JG4[dwJi]);
      lines.push('다음 대운 ('+( curDwAge+10)+'세~): '+GG3[(dwGan+(forward?1:-1)+10)%10]+' '+JG4[(dwJi+(forward?1:-1)+12)%12]);
    }
  } catch(e){}

  // ── 자미두수 (紫微斗數) 정밀 포반 ──
  try{
    var zwResult=calcZiweiDoushu(def.gY,def.gM,def.gD,def.hour===99?99:def.hour,def.gen);
    if(zwResult){
      lines.push('');
      lines.push(zwResult);
    }
  } catch(e){}

  // ── 당사주 (唐四柱) ──
  try{
    var yb3=((def.gY-4)%12+12)%12;
    var mb3=(def.gM-1+12)%12;
    var db3=((def.gD-1)%30+30)%30; // 간략화
    var dangsaju_year={
      0:'쥐(子)띠 — 총명하고 기민함. 재물 인연 있음.',
      1:'소(丑)띠 — 성실하고 인내심 강함. 느리지만 확실함.',
      2:'호랑이(寅)띠 — 용맹하고 리더십. 감정 기복 있음.',
      3:'토끼(卯)띠 — 감수성 풍부하고 예술적. 우유부단함.',
      4:'용(辰)띠 — 카리스마 강함. 고집과 독선 주의.',
      5:'뱀(巳)띠 — 지혜롭고 집중력 강함. 집착 경향.',
      6:'말(午)띠 — 활동적이고 인기 많음. 산만함.',
      7:'양(未)띠 — 온화하고 예술적. 자기희생 큼.',
      8:'원숭이(申)띠 — 영리하고 적응력 강함. 잔꾀 주의.',
      9:'닭(酉)띠 — 완벽주의이고 꼼꼼함. 비판적 경향.',
      10:'개(戌)띠 — 의리 있고 성실함. 고집 강함.',
      11:'돼지(亥)띠 — 넉넉하고 복 있음. 순박하나 고집.'
    };
    lines.push('');
    lines.push('[당사주(唐四柱)]');
    lines.push('년주(年柱): '+(dangsaju_year[yb3]||JG3[yb3]+'띠'));
    // 주요 살 추가 체크
    var dang_sal=[];
    if([2,5,8,11].indexOf(yb3)>=0) dang_sal.push('삼재(三災) 방향 주의 (해당 띠 기준 확인 필요)');
    if(def.gD===3||def.gD===7||def.gD===13||def.gD===18||def.gD===27) dang_sal.push('일진(日辰) 특이점 있음');
    if(dang_sal.length) lines.push('특이사항: '+dang_sal.join(', '));
  } catch(e){}

  } // end premium

  // ── 오늘 세운 ──
  var nowY=new Date().getFullYear();
  var nowM=new Date().getMonth()+1;
  var nowD=new Date().getDate();
  lines.push('');
  lines.push('[오늘 날짜] '+nowY+'년 '+nowM+'월 '+nowD+'일 (현재 기준)');
  lines.push('세운(歲運): '+nowY+'년이 올해. 현재 '+nowY+'년 '+nowM+'월'+nowD+'일 기준.');
  lines.push('※ 나이 계산: '+nowY+'년 - 출생년도 = 만 나이 근사치. 절대 혼동하지 말 것.');

  return lines.join('\n');
}

async function callContextApi(def, tier) {
  try {
    var resp = await fetch('https://my-saju-api.onrender.com/api/context', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({def: def, tier: tier || 'free'})
    });
    if (!resp.ok) throw new Error('context api error');
    var data = await resp.json();
    return data.context || '';
  } catch(e) {
    // 폴백: 프론트 buildRichSajuContext 사용
    return buildRichSajuContext(def, tier);
  }
}

function calcDaeun(d){
  // 방향: 양년생 남자 / 음년생 여자 = 순행, 반대 = 역행
  var yangYear = d.ys % 2 === 0; // 갑0·병2·무4·경6·임8 = 양
  var isMale = d.gen === 'male';
  var forward = (yangYear && isMale) || (!yangYear && !isMale);
  var bjd = jd(d.gY, d.gM, d.gD, d.hV || 12);
  // 가장 가까운 절기 찾기
  var closestJd = null, minDiff = 999999;
  for(var i = 0; i < 3; i++){
    var y = d.gY - 1 + i;
    for(var j = 0; j < JGD.length; j++){
      var termJd = fjd(y, JGD[j][1], JGD[j][2]);
      var diff = termJd - bjd;
      if(forward && diff > 0 && diff < minDiff){ minDiff = diff; closestJd = termJd; }
      if(!forward && diff < 0 && -diff < minDiff){ minDiff = -diff; closestJd = termJd; }
    }
  }
  if(!closestJd) return null;
  var days = Math.abs(closestJd - bjd);
  var startAge = Math.round(days / 3);
  var list = [];
  for(var i = 0; i < 9; i++){
    var offset = forward ? i + 1 : -(i + 1);
    var stem   = ((d.ms + offset) % 10 + 10) % 10;
    var branch = ((d.mb + offset) % 12 + 12) % 12;
    list.push({ age: startAge + i * 10, name: CG[stem]+JJ[branch]+'('+CH[stem]+JH[branch]+')' });
  }
  return { startAge: startAge, list: list };
}

function getDaeunStr(d, year){
  var daeun = calcDaeun(d);
  if(!daeun) return '';
  var age = year - d.gY + 1;
  var cur = null, next = null;
  for(var i = 0; i < daeun.list.length; i++){
    if(daeun.list[i].age <= age) cur = daeun.list[i];
    else if(!next) next = daeun.list[i];
  }
  var s = '\n- 대운 시작 나이: '+daeun.startAge+'세';
  if(cur)  s += '\n- 현재 대운: '+cur.name+'대운 ('+cur.age+'세 시작)';
  if(next) s += '\n- 다음 대운: '+next.name+'대운 ('+next.age+'세 시작, 아직 도래하지 않음)';
  return s;
}

function buildDivinationContext(d){
  var lines=[];
  var GG4=['갑(甲)','을(乙)','병(丙)','정(丁)','무(戊)','기(己)','경(庚)','신(辛)','임(壬)','계(癸)'];
  var JG4=['자(子)','축(丑)','인(寅)','묘(卯)','진(辰)','사(巳)','오(午)','미(未)','신(申)','유(酉)','술(戌)','해(亥)'];
  var JG5=['자','축','인','묘','진','사','오','미','신','유','술','해'];

  // ── 합충 ──
  var sajuStr=CH[d.ys]+JH[d.yb]+' '+CH[d.ms]+JH[d.mb]+' '+CH[d.ds]+JH[d.db]+' '+(d.noHour?'':CH[d.hs]+JH[d.hb]);
  var jiJi=[];
  for(var i=0;i<sajuStr.length;i++){if(JG5.indexOf(sajuStr[i])>=0)jiJi.push(sajuStr[i]);}
  var chongP=[['자','오'],['축','미'],['인','신'],['묘','유'],['진','술'],['사','해']];
  var hapP=[['자','축'],['인','해'],['묘','술'],['진','유'],['사','신'],['오','미']];
  var fC=[],fH=[];
  chongP.forEach(function(p){if(jiJi.indexOf(p[0])>=0&&jiJi.indexOf(p[1])>=0)fC.push(p[0]+p[1]+'충(沖)');});
  hapP.forEach(function(p){if(jiJi.indexOf(p[0])>=0&&jiJi.indexOf(p[1])>=0)fH.push(p[0]+p[1]+'합(合)');});
  if(fC.length) lines.push('지지충: '+fC.join(', '));
  if(fH.length) lines.push('지지합: '+fH.join(', '));

  // ── 공망 ──
  var gmt={0:['술','해'],1:['신','유'],2:['오','미'],3:['진','사'],4:['인','묘'],5:['자','축'],6:['술','해'],7:['신','유'],8:['오','미'],9:['진','사']};
  var gm2=gmt[d.ds%10];
  if(gm2) lines.push('공망: '+gm2[0]+'·'+gm2[1]);

  // ── 수비학 ──
  try{
    var yStr=String(d.gY||2000),mStr=String(d.gM||1).padStart(2,'0'),dStr=String(d.gD||1).padStart(2,'0');
    var digits2=(yStr+mStr+dStr).split('').map(Number);
    var s2=digits2.reduce(function(a,b){return a+b;},0);
    while(s2>9&&s2!==11&&s2!==22&&s2!==33) s2=String(s2).split('').reduce(function(a,b){return a+Number(b);},0);
    var nm2={1:'개척·독립·고독',2:'감수성·관계소모·의존',3:'창의·표현·감정기복',4:'안정·답답함·변화거부',5:'자유·이동·산만',6:'책임·희생·자기소모',7:'고독·분석·현실괴리',8:'성취·집착·통제욕',9:'이상·희생·미완성',11:'직관·예민·영적',22:'이상주의·미완성',33:'봉사·희생'};
    lines.push('수비학 인생수: '+s2+' ('+( nm2[s2]||'')+')');
  }catch(e2){}

  // ── 신살 ──
  try{
    var yb4=d.yb, db4=d.db, ds4=d.ds;
    var sal=[];
    var dhMap={0:'유',3:'자',6:'묘',9:'오',1:'오',2:'유',4:'유',5:'자',7:'자',8:'묘',10:'묘',11:'오'};
    if(dhMap[yb4]&&JG5[db4]===dhMap[yb4]) sal.push('도화살(桃花殺)');
    var ymMap={0:'인',3:'사',6:'신',9:'해',1:'인',2:'인',4:'사',5:'사',7:'신',8:'신',10:'해',11:'해'};
    if(ymMap[yb4]&&JG5[db4]===ymMap[yb4]) sal.push('역마살(驛馬殺)');
    var hwMap={0:'술',3:'미',6:'진',9:'축',1:'술',2:'술',4:'미',5:'미',7:'진',8:'진',10:'축',11:'축'};
    if(hwMap[yb4]&&JG5[db4]===hwMap[yb4]) sal.push('화개살(華蓋殺)');
    if([0,3,4,6,7].indexOf(db4)>=0) sal.push('홍염살(紅艶殺)');
    var ceMap={0:[1,7],1:[0,8],2:[11,9],3:[10,8],4:[11,9],5:[0,8],6:[1,7],7:[2,6],8:[3,5],9:[2,6]};
    if(ceMap[ds4]&&ceMap[ds4].indexOf(db4)>=0) sal.push('천을귀인(天乙貴人)');
    var gpMap={0:'사',3:'인',6:'해',9:'신',1:'사',2:'사',4:'인',5:'인',7:'해',8:'해',10:'신',11:'신'};
    if(gpMap[yb4]&&JG5[db4]===gpMap[yb4]) sal.push('겁살(劫殺)');
    if(sal.length) lines.push('신살: '+sal.join(', '));
  }catch(e3){}

  // ── 대운 천간지지 ──
  try{
    var gY4=d.gY||2000, gen4=d.gen||'female';
    var curY4=new Date().getFullYear(), age4=curY4-gY4;
    var isMale4b=(gen4==='male');
    // 정밀 대운수 계산
    var dwS=calcDaewunNum(d.gY||2000,d.gM||1,d.gD||1,d.noHour?12:(d.hV||12),isMale4b);
    var dwI=Math.max(0,Math.floor((age4-dwS)/10));
    var isYang4=(gY4%2===1);
    var isMale4=(gen4==='male');
    var fwd4=(isMale4&&isYang4)||(!isMale4&&!isYang4);
    var ms4=d.ms||0, mb4=d.mb||0;
    var dwG=(ms4+(fwd4?dwI+1:-(dwI+1))+60)%10;
    var dwJ=(mb4+(fwd4?dwI+1:-(dwI+1))+60)%12;
    var curDwA=dwS+dwI*10;
    var curDwYear4=gY4+curDwA;
    lines.push('현재 대운: 만 '+curDwA+'~'+(curDwA+10)+'세 ('+curDwYear4+'년~'+(curDwYear4+10)+'년) '+GG4[dwG]+' '+JG4[dwJ]);
    var nG=(dwG+(fwd4?1:-1)+10)%10, nJ=(dwJ+(fwd4?1:-1)+12)%12;
    lines.push('다음 대운: 만 '+(curDwA+10)+'세~ ('+(curDwYear4+10)+'년~) '+GG4[nG]+' '+JG4[nJ]);
  }catch(e4){}

  // ── 자미두수 정밀 포반 ──
  try{
    var zwR=calcZiweiDoushu(d.gY||2000,d.gM||1,d.gD||1,d.noHour?99:(d.hV||12),d.gen||'female');
    if(zwR) lines.push(zwR);
  }catch(e5){}

  // ── 베딕 점성술 (ASC + Vimshottari Dasha) ──
  try{
    var noH=(d.noHour||d.hV===99||d.hV===undefined);
    var lat2=d.lat||37.5666; var lon2=d.lon||126.9779;
    var nc2=calcNatalChart(d.gY||2000,d.gM||1,d.gD||1,noH?12:(d.hV||12),noH,lat2,lon2);
    var cityNote=d.cityName?'('+d.cityName+')':'(서울 기준)';
    lines.push(natalToText(nc2,cityNote));
  }catch(e6){}

  return lines.join('\n');
}

function _tAutoCardCount(q){
  // 과거/현재/미래 패턴
  if(/과거.*현재.*미래|흐름|전체.*운|시간.*흐름|어떻게.*될|어떻게.*흘러/.test(q)) return 3;
  // 관계/궁합 패턴 (4장)
  if(/관계|궁합|우리.*사이|연애.*조언|어떻게.*해야|조언.*해줘/.test(q)) return 4;
  // 5가지 영역 패턴
  if(/전체적|종합|모든|인생|올해|올 한해|연간/.test(q)) return 5;
  // 켈틱 크로스 (10장) - 복잡한 상황
  if(/복잡|전반적.*상황|지금.*상황.*전부|깊게/.test(q)) return 10;
  // 주간 운세 (7장)
  if(/이번 주|한 주|7일|일주일/.test(q)) return 7;
  // 단순 예/아니오, 단일 질문 (1장)
  if(/^.{0,30}$/.test(q)&&!/[.!?].*[.!?]/.test(q)) return 1;
  // 두 가지 선택지 (2장)
  if(/아니면|아니면|둘 중|선택|vs|VS/.test(q)) return 2;
  // 기본: 3장 (과거-현재-미래)
  return 3;
}

function makeTarotBack(){
  return '<svg viewBox="0 0 80 130" xmlns="http://www.w3.org/2000/svg" style="width:80px;height:130px;display:block">'
    +'<defs>'
    +'<radialGradient id="bg" cx="50%" cy="50%" r="70%">'
    +'<stop offset="0%" stop-color="#1e0845"/>'
    +'<stop offset="100%" stop-color="#080318"/>'
    +'</radialGradient>'
    +'</defs>'
    +'<rect width="80" height="130" rx="10" fill="url(#bg)"/>'
    +'<rect x="3" y="3" width="74" height="124" rx="8" fill="none" stroke="#c8a96e" stroke-width="1"/>'
    +'<rect x="6" y="6" width="68" height="118" rx="6" fill="none" stroke="#c8a96e" stroke-width="0.4" opacity="0.4"/>'
    // 대각선 패턴
    +'<g stroke="#7c3aed" stroke-width="0.4" opacity="0.5">'
    +'<line x1="40" y1="10" x2="40" y2="120"/>'
    +'<line x1="10" y1="65" x2="70" y2="65"/>'
    +'<line x1="16" y1="22" x2="64" y2="108"/>'
    +'<line x1="64" y1="22" x2="16" y2="108"/>'
    +'</g>'
    // 중앙 별 크게
    +'<polygon points="40,28 43,38 54,38 45,45 48,55 40,49 32,55 35,45 26,38 37,38" fill="#c8a96e" opacity="0.95"/>'
    // 별 주변 글로우 원
    +'<circle cx="40" cy="41" r="20" fill="none" stroke="#c8a96e" stroke-width="0.5" opacity="0.3"/>'
    // 코너 별
    +'<polygon points="12,14 13.2,17.6 17,17.6 14,19.8 15.2,23.5 12,21.2 8.8,23.5 10,19.8 7,17.6 10.8,17.6" fill="#c8a96e" opacity="0.6"/>'
    +'<polygon points="68,14 69.2,17.6 73,17.6 70,19.8 71.2,23.5 68,21.2 64.8,23.5 66,19.8 63,17.6 66.8,17.6" fill="#c8a96e" opacity="0.6"/>'
    +'<polygon points="12,116 13.2,112.4 17,112.4 14,110.2 15.2,106.5 12,108.8 8.8,106.5 10,110.2 7,112.4 10.8,112.4" fill="#c8a96e" opacity="0.6"/>'
    +'<polygon points="68,116 69.2,112.4 73,112.4 70,110.2 71.2,106.5 68,108.8 64.8,106.5 66,110.2 63,112.4 66.8,112.4" fill="#c8a96e" opacity="0.6"/>'
    // 하단 ARCANA 텍스트
    +'<text x="40" y="108" text-anchor="middle" fill="#c8a96e" font-size="5" opacity="0.7" letter-spacing="3" font-family="serif">✦ ARCANA ✦</text>'
    +'</svg>';
}

function makeTarotFront(card, idx, reversed) {
  var imgSrc = TAROT_IMGS[idx] || '';
  var fb='<div style="position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;background:linear-gradient(145deg,#120530,#1e0845);">'
    +'<div style="font-size:28px;margin-bottom:5px;">'+(card.ico||'✦')+'</div>'
    +'<div style="font-size:10px;color:var(--gold2);text-align:center;font-family:\'Gowun Dodum\',serif;padding:0 6px;">'+card.name+'</div>'
    +(reversed?'<div style="font-size:8px;color:#e09090;margin-top:2px;">역방향</div>':'')
    +'</div>';
  return '<div style="position:absolute;inset:0;overflow:hidden;border-radius:12px;">'
    +(imgSrc
      ?'<img src="'+imgSrc+'" style="position:absolute;inset:0;width:100%;height:100%;object-fit:cover;" onerror="this.style.display=\'none\';this.nextSibling.style.display=\'flex\';">'
       +fb.replace('display:flex','display:none')
      :fb)
    +'</div>';
}

function calcSuyo(gY,gM,gD){
  var baseJD=2451545, baseIdx=10;
  var jdVal=Math.floor(jd(gY,gM,gD,12)+0.5);
  return ((jdVal-baseJD)%27+27+baseIdx)%27;
}

function getSuyoRel(a,b){var d=Math.abs(a-b);if(d>13)d=27-d;return SUYO_REL[d]||SUYO_REL[0];}

var _PASS_CONFIG={
  lite:     {sheets:4,  usesPerSheet:2},
  standard: {sheets:9,  usesPerSheet:2},
  premium:  {sheets:14, usesPerSheet:3}
};

var _TERM24=[[285,1],[300,1],[315,2],[330,2],[345,3],[0,3],[15,4],[30,4],[45,5],[60,5],[75,6],[90,6],[105,7],[120,7],[135,8],[150,8],[165,9],[180,9],[195,10],[210,10],[225,11],[240,11],[255,12],[270,12]];

var JGD=[['소한',285,1,1,12],['입춘',315,2,2,1],['경칩',345,3,3,2],['청명',15,4,4,3],['입하',45,5,5,4],['망종',75,6,6,5],['소서',105,7,7,6],['입추',135,8,8,7],['백로',165,9,9,8],['한로',195,10,10,9],['입동',225,11,11,10],['대설',255,12,0,11]];

