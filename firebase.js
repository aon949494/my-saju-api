// ══════════════════════════════════════════════
// OracAi — Firebase Auth + Firestore
// ══════════════════════════════════════════════

// Firebase SDK (CDN 모듈 방식)
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, updateDoc, serverTimestamp }
  from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

// ── 설정 ──
const firebaseConfig = {
  apiKey: "AIzaSyAewcp26WxeVxtc5dvhs5gyp-CHTvO38oY",
  authDomain: "oracai-7f297.firebaseapp.com",
  projectId: "oracai-7f297",
  storageBucket: "oracai-7f297.firebasestorage.app",
  messagingSenderId: "472337218464",
  appId: "1:472337218464:web:afcef6ac6a3eac569242c5",
};

const fbApp  = initializeApp(firebaseConfig);
const auth   = getAuth(fbApp);
const db     = getFirestore(fbApp);

// 전역 노출 (다른 JS 파일에서 접근)
window._fbAuth = auth;
window._fbDb   = db;
window._fbUser = null;  // 현재 로그인 유저

// ── 구글 로그인 ──
export async function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch(e) {
    console.error('구글 로그인 실패:', e);
    throw e;
  }
}

// ── 로그아웃 ──
export async function signOutUser() {
  await signOut(auth);
  window._fbUser = null;
}

// ── 로그인 상태 감지 ──
onAuthStateChanged(auth, async (user) => {
  window._fbUser = user;
  if (user) {
    console.log('로그인:', user.displayName, user.uid);
    await _ensureUserDoc(user);
    await _syncFromFirestore(user.uid);
    _updateLoginUI(user);
  } else {
    console.log('로그아웃 상태');
    _updateLoginUI(null);
  }
});

// ── Firestore 유저 문서 초기화 ──
async function _ensureUserDoc(user) {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    // 최초 가입 시 기본 데이터 생성
    await setDoc(ref, {
      uid: user.uid,
      displayName: user.displayName || '',
      email: user.email || '',
      photoURL: user.photoURL || '',
      createdAt: serverTimestamp(),
      // 복채/구독
      bokchae: parseInt(localStorage.getItem('msr_bokchae_cnt') || '0'),
      miniBokchae: parseInt(localStorage.getItem('msr_mini_bokchae_cnt') || '0'),
      subPlan: localStorage.getItem('sub_plan') || null,
      subUntil: parseInt(localStorage.getItem('sub_until') || '0'),
      // 프로필
      profiles: JSON.parse(localStorage.getItem('msr_profiles') || '[]'),
      defaultProfileId: localStorage.getItem('msr_default_profile_id') || null,
    });
    console.log('신규 유저 문서 생성');
  } else {
    // 기존 유저 — 서버 데이터로 동기화
    console.log('기존 유저 로드');
  }
}

// ── Firestore → localStorage 동기화 ──
async function _syncFromFirestore(uid) {
  try {
    const snap = await getDoc(doc(db, 'users', uid));
    if (!snap.exists()) return;
    const d = snap.data();

    // 복채 (서버 > 로컬 원칙)
    if (d.bokchae !== undefined) localStorage.setItem('msr_bokchae_cnt', String(d.bokchae));
    if (d.miniBokchae !== undefined) localStorage.setItem('msr_mini_bokchae_cnt', String(d.miniBokchae));

    // 구독 (서버 우선)
    if (d.subPlan) localStorage.setItem('sub_plan', d.subPlan);
    if (d.subUntil) localStorage.setItem('sub_until', String(d.subUntil));
    if (d.subStart) localStorage.setItem('sub_start', String(d.subStart));

    // 프로필
    if (d.profiles && d.profiles.length > 0) {
      localStorage.setItem('msr_profiles', JSON.stringify(d.profiles));
    }
    if (d.defaultProfileId) {
      localStorage.setItem('msr_default_profile_id', d.defaultProfileId);
    }

    console.log('Firestore 동기화 완료');

    // UI 업데이트 (로그인 후 화면 갱신)
    if (typeof renderSettingsProfile === 'function') renderSettingsProfile();
    if (typeof renderBokchae === 'function') renderBokchae();
    if (typeof updateTimer === 'function') updateTimer();

    // 로그인 후 화면 이동 (온보딩 중이면 건너뛰기)
    var curScreen = document.querySelector('.screen.active');
    if (curScreen && curScreen.id === 'onboardingScreen') {
      var profiles = [];
      try { profiles = JSON.parse(localStorage.getItem('msr_profiles') || '[]'); } catch(e) {}
      if (profiles.length > 0) {
        if (typeof goScreen === 'function') { goScreen('mainScreen'); }
        if (typeof renderMainRecent === 'function') renderMainRecent();
        if (typeof updateTimer === 'function') updateTimer();
      } else {
        if (typeof goScreen === 'function') goScreen('addProfileScreen');
      }
    }

  } catch(e) {
    console.error('Firestore 동기화 오류:', e);
  }
}

// ── localStorage → Firestore 저장 ──
export async function syncToFirestore(fields = {}) {
  const user = window._fbUser;
  if (!user) return;  // 비로그인 시 무시

  try {
    const ref = doc(db, 'users', user.uid);
    await updateDoc(ref, {
      ...fields,
      updatedAt: serverTimestamp(),
    });
  } catch(e) {
    // 문서 없으면 생성
    try {
      const ref = doc(db, 'users', user.uid);
      await setDoc(ref, { ...fields, updatedAt: serverTimestamp() }, { merge: true });
    } catch(e2) {
      console.error('Firestore 저장 오류:', e2);
    }
  }
}

// ── Firebase ID 토큰 가져오기 (백엔드 인증용) ──
export async function getIdToken() {
  const user = window._fbUser;
  if (!user) return null;
  return await user.getIdToken();
}

// ── UI 업데이트 ──
function _updateLoginUI(user) {
  // 설정 화면 유저 정보
  const nameEl = document.getElementById('settingsUserName');
  const emailEl = document.getElementById('settingsUserEmail');
  const photoEl = document.getElementById('settingsUserPhoto');
  const loginBtn = document.getElementById('settingsLoginBtn');
  const logoutBtn = document.getElementById('settingsLogoutBtn');

  if (user) {
    if (nameEl) nameEl.textContent = user.displayName || '사용자';
    if (emailEl) emailEl.textContent = user.email || '';
    if (photoEl && user.photoURL) { photoEl.src = user.photoURL; photoEl.style.display = 'block'; }
    if (loginBtn) loginBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'block';
  } else {
    if (nameEl) nameEl.textContent = '로그인이 필요해요';
    if (emailEl) emailEl.textContent = '';
    if (photoEl) photoEl.style.display = 'none';
    if (loginBtn) loginBtn.style.display = 'block';
    if (logoutBtn) logoutBtn.style.display = 'none';
  }
}

// ── 구독 상태 서버 검증 (RevenueCat 연동 후 활성화) ──
export async function verifySubscription() {
  const user = window._fbUser;
  if (!user) return null;
  try {
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (!snap.exists()) return null;
    const d = snap.data();
    const now = Date.now();
    if (d.subPlan && d.subUntil && d.subUntil > now) {
      return { plan: d.subPlan, until: d.subUntil };
    }
    return null;
  } catch(e) {
    return null;
  }
}

// 전역 노출
window.signInWithGoogle = signInWithGoogle;
window.signOutUser = signOutUser;
window.syncToFirestore = syncToFirestore;
window.getIdToken = getIdToken;
window.verifySubscription = verifySubscription;
