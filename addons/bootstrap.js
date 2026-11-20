/* Load the unchanged todayword gameplay engine only AFTER anonymous Firebase auth.
   The original game uses myUid as a database player key; bind it to authenticated UID. */
(async () => {
  const msg = document.createElement('div');
  msg.className='wr-boot';msg.textContent='Word-Race 서버에 연결하는 중…';document.body.appendChild(msg);
  const config=window.WORD_RACE_FIREBASE_CONFIG;
  if(!config?.apiKey || !config?.databaseURL){
    msg.innerHTML='Firebase 설정이 필요해요. <code>firebase-config.js</code>를 입력해 주세요. <a href="solo.html">혼자하기는 바로 시작할 수 있어요.</a>';
    window.WordRaceUI?.initOffline();return;
  }
  try {
    if(!firebase.apps.length)firebase.initializeApp(config);
    const {user}=await firebase.auth().signInAnonymously();
    localStorage.setItem('wordrace_uid', user.uid);
    await new Promise((resolve,reject)=>{let s=document.createElement('script');s.src='game.js';s.onload=resolve;s.onerror=reject;document.body.appendChild(s)});
    await window.WordRaceUI?.init(user.uid);
    msg.remove();
  } catch(e){msg.textContent='연결 오류: '+e.message+' · 혼자하기는 solo.html에서 가능합니다.';console.error(e)}
})();
