/* Word-Race: nonemo modular closet + friend-only Spark credits + shared-lane relative-position race.
   The entire original todayword gameplay remains in game.js, imported at build time. */
(() => {
'use strict';
const $=id=>document.getElementById(id);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const CATS={skin:'피부',bottom:'하의',outfit:'의상',eyes:'표정',hair:'헤어',glasses:'안경',beard:'수염'};
const DEFAULT={skin:'',bottom:'',outfit:'',eyes:'',hair:'',glasses:'none',beard:'none'};
let catalog={},look={...DEFAULT},wallet={coins:0,owned:{},look:{}},uid='',activeCat='outfit',busy=false,economy=null;
let lastSettling='',settleBusy=false,lastBoundNickname='',bindingNickname=false;
const safeFile=f=>typeof f==='string'&&/^assets\/nonemo\/[a-zA-Z0-9_./-]+\.png$/.test(f)&&!f.includes('..');
const pick=(cat,id)=> (catalog[cat]||[]).find(it=>it.id===id)||(catalog[cat]||[])[0];
function avatar(customLook,size=48,bounce=false){
  const L={...DEFAULT,...customLook};const w=Math.max(22,Math.min(210,Number(size)||48));
  const images=Object.keys(CATS).map(cat=>{const item=pick(cat,L[cat]);return safeFile(item?.file)?`<img alt="" src="${item.file}" draggable="false" loading="lazy">`:''}).join('');
  return `<span class="wr-avatar${bounce?' wr-bounce':''}" style="--w:${w}px">${images}</span>`;
}
function injectUI(){
 if($('wrShell'))return;
 const shell=document.createElement('section');shell.id='wrShell';shell.className='wr-shell';
 shell.innerHTML=`<div class="wr-top"><div><div class="wr-title">🏁 WORD-RACE</div><div class="wr-tagline">오늘의 단어 · 원본 규칙 + 치비 코디 + 관전자 예측</div></div><div class="wr-actions"><a class="wr-btn primary" href="solo.html">혼자하기 · 보상 0</a><button class="wr-btn" id="wrClosetBtn">👗 드레스룸</button><button class="wr-btn" id="wrBetBtn">👀 우승자 예측</button><span id="wrCoins" class="wr-btn">🪙 코인 연결 중</span></div></div><div class="wr-race"><div class="wr-hill"></div><div class="wr-track" id="wrTrack"><div class="wr-message">방을 만들거나 참가하면 캐릭터들이 이곳에서 달려요.</div></div><span class="wr-roadlabel start">START</span><span class="wr-roadlabel end">LEADER 🏁</span></div>`;
 document.body.prepend(shell);
 const modal=document.createElement('div');modal.id='wrModal';modal.className='wr-modal';
 modal.innerHTML='<div class="wr-dialog"><div class="wr-head"><h2 id="wrModalTitle">드레스룸</h2><button id="wrClose" class="wr-btn">✕ 닫기</button></div><div id="wrModalBody"></div></div>';
 document.body.append(modal);
 $('wrClosetBtn').onclick=openCloset;$('wrBetBtn').onclick=openBets;$('wrClose').onclick=closeModal;
 modal.onclick=e=>{if(e.target===modal)closeModal()};
}
function renderRace(data){
 if(data?.players?.[uid]?.nickname&&!lastBoundNickname){bindCurrentNickname().catch(console.warn)}
 const root=$('wrTrack');if(!root)return;
 if(!data?.players){root.innerHTML='<div class="wr-message">대결방 참가 후 레이스가 표시됩니다.</div>';return}
 let standings;
 try{standings=getStandings(data).filter(x=>!data.players[x.uid]?.spectator)}catch{standings=Object.entries(data.players).filter(([id,p])=>!p.spectator).map(([uid,p])=>({uid,nickname:p.nickname,total:Number(p.score)||0}))}
 if(!standings.length){root.innerHTML='<div class="wr-message">참가자를 기다리고 있어요.</div>';return}
 const scores=standings.map(s=>s.total),hi=Math.max(...scores),lo=Math.min(...scores);
 root.innerHTML=[...standings].reverse().map(s=>{
  let x=hi===lo?50:10+80*(s.total-lo)/(hi-lo);
  const player=data.players[s.uid]||{};
  const i=standings.findIndex(p=>p.uid===s.uid);
  return `<div class="wr-runner" style="--x:${x};--z:${standings.length-i+2}" title="${escape(s.nickname)}"><div class="wr-name">${escape(s.nickname)}</div>${i===0&&hi>0?'<span class="wr-crown">👑</span>':''}${avatar(player.wrLook||(s.uid===uid?look:{}),window.innerWidth<550?40:58,true)}</div>`;
 }).join('');
 window.WordRacePets?.attachRace(data);
}
const closeModal=()=>{$('wrModal')?.classList.remove('show')};
function openModal(title,html){$('wrModalTitle').textContent=title;$('wrModalBody').innerHTML=html;$('wrModal').classList.add('show')}
function renderWallet(){const el=$('wrCoins');if(el)el.textContent=`🪙 ${wallet.coins??0} 코인`;}
async function call(name,data={}){
 if(!economy)throw new Error('온라인 인증 후 이용할 수 있어요.');
 return economy.action(name,data);
}
function currentNickname(){
  // The original todayword game keeps its nickname in myNick / wordrace_nick.
  let nick='';
  try {if(typeof myNick!=='undefined')nick=String(myNick||'').trim()}catch{}
  if(!nick)try{nick=String(localStorage.getItem('wordrace_nick')||'').trim()}catch{}
  return nick;
}
async function bindCurrentNickname(){
  const nick=currentNickname();
  if(!economy||!nick||bindingNickname||lastBoundNickname===nick)return;
  bindingNickname=true;
  try{
    const result=await call('wrBindNickname',{nickname:nick});
    lastBoundNickname=nick;wallet=result;look={...DEFAULT,...(wallet.look||{})};renderWallet();
  }catch(err){console.warn('닉네임 아이템 동기화 실패:',err.message)}
  finally{bindingNickname=false}
}
async function syncWallet(){try{wallet=await call('wrWallet');look={...DEFAULT,...wallet.look};renderWallet()}catch(e){console.warn('wallet:',e.message)}}
async function openCloset(){
 const tabs=Object.entries(CATS).map(([k,v])=>`<button class="wr-btn${activeCat===k?' primary':''}" data-tab="${k}">${v}</button>`).join('');
 openModal('👗 나의 드레스룸',`<div class="wr-closet"><div class="wr-preview"><div id="wrPreviewAvatar">${avatar(look,150)}</div><strong>나의 코디</strong><div class="wr-note">의상과 헤어는 nonemo 원본 이미지로 구성해요.</div></div><div><div class="wr-tabs" id="wrTabs">${tabs}</div><div class="wr-grid" id="wrItems"></div></div></div>`);
 $('wrTabs').onclick=e=>{const btn=e.target.closest('[data-tab]');if(!btn)return;activeCat=btn.dataset.tab;openCloset()};renderItems();
}
function renderItems(){
 const grid=$('wrItems');if(!grid)return;
 grid.innerHTML=(catalog[activeCat]||[]).map(it=>{
 const owned=Number(it.price)===0||!!wallet.owned?.[activeCat]?.[it.id];
 const selected=look[activeCat]===it.id;
 const picture=safeFile(it.file)?`<img src="${it.file}" alt="">`:'<div style="height:80px;padding-top:23px">미착용</div>';
 return `<button class="wr-item${selected?' active':''}" data-id="${escape(it.id)}">${picture}<strong>${escape(it.name)}</strong><span class="price">${selected?'장착 중':owned?'보유중':'🪙 '+Number(it.price)}</span></button>`;
 }).join('');
 grid.onclick=async e=>{const btn=e.target.closest('[data-id]');if(!btn||busy)return;
 const it=pick(activeCat,btn.dataset.id);if(!it)return;
 try{busy=true;let owned=Number(it.price)===0||!!wallet.owned?.[activeCat]?.[it.id];
 if(!owned){if(!confirm(`${it.name} 아이템을 ${it.price}코인에 구매할까요?`))return;wallet=await call('wrBuy',{cat:activeCat,id:it.id})}
 wallet=await call('wrEquip',{cat:activeCat,id:it.id});look={...DEFAULT,...wallet.look};renderWallet();renderItems();$('wrPreviewAvatar').innerHTML=avatar(look,150);
 if(typeof db!=='undefined'&&db&&typeof currentRoomCode!=='undefined'&&currentRoomCode)db.ref(`rooms/${currentRoomCode}/players/${uid}/wrLook`).set(look).catch(()=>{});
 }catch(err){alert(err.message)}finally{busy=false}
 };
}
async function openBets(){
 if(!uid){openModal('관전자 예측','<p>온라인 설정이 필요해요.</p>');return}
 const data=typeof lastRoomData!=='undefined'?lastRoomData:null;
 const room=typeof currentRoomCode!=='undefined'?currentRoomCode:null;
 const me=data?.players?.[uid];
 if(!room||!data?.secretWord||!me?.spectator){openModal('👀 관전자 우승 예측','<p class="wr-note">대결방에 관전자로 입장하고 문제가 출제되면 참여할 수 있어요.</p>');return}
 const sec=Math.max(0,Math.ceil((60000-(Date.now()-(data.startedAt||0)))/1000));
 const solvers=Object.entries(data.players).filter(([id,p])=>id!==data.masterUid&&!p.spectator);
 openModal('👀 이번 라운드 1등 맞히기',`<div class="wr-prediction"><div class="wr-note">시작 후 60초까지 · 1명만 선택 · 참여금 20코인<br>맞힌 관전자끼리 전체 참여금을 나눠 받아요. 적중자가 적을수록 배당이 커져요.</div><b>남은 시간: ${sec}초 / 보유: ${wallet.coins}코인</b><div class="wr-pick" id="wrBetPicks">${solvers.map(([id,p])=>`<button class="wr-btn" data-uid="${escape(id)}">${escape(p.nickname)}</button>`).join('')}</div><div id="wrBetStatus" class="wr-note"></div></div>`);
 $('wrBetPicks').onclick=async e=>{const b=e.target.closest('[data-uid]');if(!b||busy)return;if(!confirm(`${b.textContent}님에게 20코인을 걸까요? (변경 불가)`))return;
 try{busy=true;wallet=await call('wrBet',{roomCode:room,roundId:data.round,targetUid:b.dataset.uid});renderWallet();$('wrBetStatus').textContent='예측 완료! 라운드 종료 후 자동 정산됩니다.';$('wrBetPicks').style.display='none';}catch(err){$('wrBetStatus').textContent='예측 실패: '+err.message}finally{busy=false}
 };
}
async function beforeNextRound(){
 const data=typeof lastRoomData!=='undefined'?lastRoomData:null;
 const room=typeof currentRoomCode!=='undefined'?currentRoomCode:null;
 if(!room||!data?.secretWord)return true;
 try{await call('wrSettle',{roomCode:room,roundId:data.round});await syncWallet();return true}
 catch(e){alert('이번 라운드 예측 정산을 확인할 수 없어 다음 라운드를 중지했습니다.\n'+e.message);return false}
}
async function loadCatalog(){const r=await fetch('assets/nonemo/catalog.json');if(!r.ok)throw Error('nonemo 에셋 목록 없음');const json=await r.json();catalog=json.categories||{};for(const cat of Object.keys(CATS)){const a=catalog[cat]||[];if(!a.length)throw Error(`${cat} 에셋 누락`);DEFAULT[cat]=a[0].id}}
function initOffline(){injectUI();loadCatalog().catch(console.warn);}
async function init(authUid){uid=authUid;injectUI();await loadCatalog();
 economy=WordRaceSparkEconomy.createClient(firebase.database(),uid,{categories:catalog,petBases:window.WR_PET_CATALOG?.bases||[],petWings:window.WR_PET_CATALOG?.wings||[]},()=>Date.now()+(typeof serverOffset!=='undefined'?serverOffset:0));
 window.WordRacePets?.init(uid,economy);
 await bindCurrentNickname();
 await syncWallet();
 if(typeof renderProfileBtn==='function')renderProfileBtn();
 // Keep legacy profile as historical bookkeeping only; game scores and wardrobe use the Spark wallet.
 if(typeof db!=='undefined'&&db){economy.subscribe(v=>{wallet=v;look={...DEFAULT,...(wallet.look||{})};renderWallet()})}
 if(typeof lastRoomData!=='undefined'&&lastRoomData)renderRace(lastRoomData);
 let lastRoom='';setInterval(()=>{bindCurrentNickname().catch(console.warn);if(typeof currentRoomCode==='undefined'||!currentRoomCode||!db||typeof lastRoomData==='undefined'||!lastRoomData?.players?.[uid])return;const code=currentRoomCode;if(code!==lastRoom){lastRoom=code;db.ref('rooms/'+code+'/players/'+uid).update({wrLook:look,wrPet:wallet.petLook||{base:'🐶',wing:'wing:none'}}).catch(console.warn)}},2500);
}
window.WR_BEFORE_NEXT_ROUND=beforeNextRound;
function renderProfileBadge(){const btn=$('profileBtn');if(btn){btn.textContent='👗 코디 · 상점';btn.title='Word-Race 드레스룸';}}
// Browser-side settlement fallback: triggered when last solver completes.
// Does not rely on Cloud Functions; an active host/master must remain online.
function maybeSettle(data){
 const code=typeof currentRoomCode!=='undefined'?currentRoomCode:null;
 if(!economy||!code||![data?.hostUid,data?.masterUid].includes(uid))return;
 if(!WordRaceSparkEconomy.readyToSettle(data,data.round))return;
 const key=code+':'+data.round;
 if(settleBusy||lastSettling===key)return;
 settleBusy=true;
 call('wrSettle',{roomCode:code,roundId:data.round}).then(()=>{lastSettling=key;syncWallet()}).catch(err=>console.warn('자동 정산 보류:',err.message)).finally(()=>settleBusy=false);
}
const originalRace=renderRace;
window.WordRaceUI={init,initOffline,avatar,renderRace(data){originalRace(data);maybeSettle(data)},openCloset,renderProfileBadge};
})();
