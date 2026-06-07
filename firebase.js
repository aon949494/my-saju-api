// ══════════════════════════════════════════════
// OracAi — Firebase Auth + Firestore (compat)
// ══════════════════════════════════════════════

var firebaseConfig = {
  apiKey: "AIzaSyAewcp26WxeVxtc5dvhs5gyp-CHTvO38oY",
  authDomain: "oracai-7f297.firebaseapp.com",
  projectId: "oracai-7f297",
  storageBucket: "oracai-7f297.firebasestorage.app",
  messagingSenderId: "472337218464",
  appId: "1:472337218464:web:afcef6ac6a3eac569242c5",
};

// Firebase SDK 로드 될 때까지 폴링 후 초기화
function _initFirebase() {
  if (typeof firebase === 'undefined') {
    setTimeout(_initFirebase, 200);
    return;
  }

  try {
    firebase.initializeApp(firebaseConfig);
  } catch(e) {
    // 이미 초기화된 경우 무시
  }

  var _fbAuth = firebase.auth();
  var _fbDb   = firebase.firestore();
  window._fbAuth = _fbAuth;
  window._fbDb   = _fbDb;
  window._fbUser = null;

  // ── 구글 로그인 ──
  window.signInWithGoogle = async function() {
    var provider = new firebase.auth.GoogleAuthProvider();
    provider.setCustomParameters({ prompt: 'select_account' });
    var result = await _fbAuth.signInWithPopup(provider);
    return result.user;
  };

  // ── 로그아웃 ──
  window.signOutUser = async function() {
    await _fbAuth.signOut();
    window._fbUser = null;
  };

  // ── 로그인 상태 감지 ──
  _fbAuth.onAuthStateChanged(async function(user) {
    window._fbUser = user;
    if (user) {
      console.log('로그인:', user.displayName);
      await _ensureUserDoc(user);
      await _syncFromFirestore(user.uid);
      _updateLoginUI(user);
      // 온보딩 화면에 있으면 이동
      var cur = document.querySelector('.screen.active');
      if (cur && cur.id === 'onboardingScreen') {
        var profiles = [];
        try { profiles = JSON.parse(localStorage.getItem('msr_profiles') || '[]'); } catch(e) {}
        if (typeof goScreen === 'function') {
          goScreen(profiles.length > 0 ? 'mainScreen' : 'addProfileScreen');
        }
      }
    } else {
      _updateLoginUI(null);
    }
  });

  // ── Firestore 유저 문서 초기화 ──
  async function _ensureUserDoc(user) {
    try {
      var ref = _fbDb.collection('users').doc(user.uid);
      var snap = await ref.get();
      if (!snap.exists) {
        await ref.set({
          uid: user.uid,
          displayName: user.displayName || '',
          email: user.email || '',
          photoURL: user.photoURL || '',
          createdAt: firebase.firestore.FieldValue.serverTimestamp(),
          bokchae: parseInt(localStorage.getItem('msr_bokchae_cnt') || '0'),
          miniBokchae: parseInt(localStorage.getItem('msr_mini_bokchae_cnt') || '0'),
          subPlan: localStorage.getItem('sub_plan') || null,
          subUntil: parseInt(localStorage.getItem('sub_until') || '0'),
          profiles: JSON.parse(localStorage.getItem('msr_profiles') || '[]'),
          defaultProfileId: localStorage.getItem('msr_default_profile_id') || null,
        });
        console.log('신규 유저 생성');
      }
    } catch(e) { console.error('Firestore 초기화 오류:', e); }
  }

  // ── Firestore → localStorage 동기화 ──
  async function _syncFromFirestore(uid) {
    try {
      var snap = await _fbDb.collection('users').doc(uid).get();
      if (!snap.exists) return;
      var d = snap.data();
      if (d.bokchae !== undefined) localStorage.setItem('msr_bokchae_cnt', String(d.bokchae));
      if (d.miniBokchae !== undefined) localStorage.setItem('msr_mini_bokchae_cnt', String(d.miniBokchae));
      if (d.subPlan) localStorage.setItem('sub_plan', d.subPlan);
      if (d.subUntil) localStorage.setItem('sub_until', String(d.subUntil));
      if (d.profiles && d.profiles.length > 0) localStorage.setItem('msr_profiles', JSON.stringify(d.profiles));
      if (d.defaultProfileId) localStorage.setItem('msr_default_profile_id', d.defaultProfileId);
      console.log('Firestore 동기화 완료');
      if (typeof renderSettingsProfile === 'function') renderSettingsProfile();
      if (typeof renderBokchae === 'function') renderBokchae();
      if (typeof updateTimer === 'function') updateTimer();
    } catch(e) { console.error('Firestore 동기화 오류:', e); }
  }

  // ── localStorage → Firestore 저장 ──
  window.syncToFirestore = async function(fields) {
    if (!window._fbUser) return;
    try {
      await _fbDb.collection('users').doc(window._fbUser.uid).set(
        Object.assign({}, fields, { updatedAt: firebase.firestore.FieldValue.serverTimestamp() }),
        { merge: true }
      );
    } catch(e) { console.error('Firestore 저장 오류:', e); }
  };

  // ── UI 업데이트 ──
  function _updateLoginUI(user) {
    var nameEl    = document.getElementById('settingsUserName');
    var emailEl   = document.getElementById('settingsUserEmail');
    var photoEl   = document.getElementById('settingsUserPhoto');
    var defEl     = document.getElementById('settingsUserPhotoDefault');
    var loginBtn  = document.getElementById('settingsLoginBtn');
    var logoutBtn = document.getElementById('settingsLogoutBtn');
    if (user) {
      if (nameEl)  nameEl.textContent  = user.displayName || '사용자';
      if (emailEl) emailEl.textContent = user.email || '';
      if (photoEl && user.photoURL) { photoEl.src = user.photoURL; photoEl.style.display = 'block'; }
      if (defEl)   defEl.style.display = user.photoURL ? 'none' : 'flex';
      if (loginBtn)  loginBtn.style.display  = 'none';
      if (logoutBtn) logoutBtn.style.display = 'block';
    } else {
      if (nameEl)  nameEl.textContent  = '로그인이 필요해요';
      if (emailEl) emailEl.textContent = '로그인하면 데이터가 안전하게 저장돼요';
      if (photoEl) photoEl.style.display = 'none';
      if (defEl)   defEl.style.display = 'flex';
      if (loginBtn)  loginBtn.style.display  = 'block';
      if (logoutBtn) logoutBtn.style.display = 'none';
    }
  }

  window.getIdToken = async function() {
    if (!window._fbUser) return null;
    return await window._fbUser.getIdToken();
  };

  console.log('✅ Firebase 초기화 완료');
}

// 즉시 시작
_initFirebase();
