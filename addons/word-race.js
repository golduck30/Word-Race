/* Word-Race: nonemo modular closet + friend-only Spark credits + shared-lane relative-position race.
   The entire original todayword gameplay remains in game.js, imported at build time. */
(() => {
'use strict';
const $=id=>document.getElementById(id);
const escape=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const CATS={skin:'피부',bottom:'하의',outfit:'의상',eyes:'표정',frontHair:'앞머리',backHair:'뒷머리',glasses:'안경',beard:'수염'};
const DEFAULT={skin:'',bottom:'',outfit:'',eyes:'',frontHair:'',backHair:'none',glasses:'none',beard:'none'};
let catalog={},look={...DEFAULT},wallet={coins:0,owned:{},look:{}},uid='',activeCat='outfit',busy=false,economy=null;
let lastSettling='',settleBusy=false,lastBoundNickname='',bindingNickname=false;
let previewSelection=null;
const safeFile=f=>typeof f==='string'&&/^assets\/nonemo\/[a-zA-Z0-9_./-]+\.png$/.test(f)&&!f.includes('..');
const pick=(cat,id)=> (catalog[cat]||[]).find(it=>it.id===id)||(catalog[cat]||[])[0];
// All nonemo layers are pre-aligned on one 290 x 356 transparent pixel canvas.
// Each item is rendered at the same intrinsic size. Never crop/resize a single part.
const LAYER_ORDER=['backHair','skin','bottom','outfit','eyes','frontHair','glasses','beard'];
function normalizedLook(raw={}){
  const v={...DEFAULT,...(raw||{})};
  if (!raw?.frontHair && raw?.hair) v.frontHair=raw.hair;
  return v;
}
function avatar(customLook={},size=48,bounce=false){
  const L=normalizedLook(customLook);
  const w=Math.max(22,Math.min(210,Number(size)||48));
  const images=LAYER_ORDER.map(cat=>{
    const it=pick(cat,L[cat]);
    return safeFile(it?.file)?`<img class="wr-layer wr-layer-${cat}" src="${it.file}" alt="" draggable="false" loading="lazy" width="290" height="356">`:'';
  }).join('');
  return `<span class="wr-avatar${bounce?' wr-bounce':''}" style="--w:${w}px" role="img" aria-label="커스터마이징 캐릭터">${images}</span>`;
}
function injectUI(){
 if($('wrShell'))return;
 const shell=document.createElement('section');shell.id='wrShell';shell.className='wr-shell';
 shell.innerHTML=`<div class="wr-top"><div><div class="wr-title">🏁 WORD-RACE</div><div class="wr-tagline">오늘의 단어 · 원본 규칙 + 치비 코디 + 관전자 예측</div></div><div class="wr-actions"><a class="wr-btn primary" href="solo.html">혼자하기 · 보상 0</a><button class="wr-btn" id="wrClosetBtn">👗 드레스룸</button><button class="wr-btn" id="wrBetBtn">👀 우승자 예측</button><span id="wrCoins" class="wr-btn">🪙 코인 연결 중</span></div></div><div class="wr-race"><div class="wr-hill"></div><div class="wr-track" id="wrTrack"><div class="wr-message">방을 만들거나 참가하면 캐릭터들이 이곳에서 달려요.</div></div><span class="wr-roadlabel start">START</span><span class="wr-roadlabel end">LEADER 🏁</span></div>`;
 const originalHeader=document.querySelector('body > header');
 if(originalHeader) originalHeader.insertAdjacentElement('afterend',shell);
 else document.body.prepend(shell);
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
  if(s.uid===uid && wallet?.petLook)player.wrPet=wallet.petLook;
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
  // Original todayword uses myNickname and the wordrace_nick key after build.
  let nick='';
  try {if(typeof myNickname!=='undefined' && myNickname!=='플레이어')nick=String(myNickname||'').trim()}catch{}
  if(!nick)try{nick=String(localStorage.getItem('wordrace_nick')||'').trim()}catch{}
  return nick;
}
async function bindCurrentNickname(){
  const nick=currentNickname();
  if(!economy||!nick||bindingNickname||lastBoundNickname===nick)return;
  bindingNickname=true;
  try{
    const result=await call('wrBindNickname',{nickname:nick});
    lastBoundNickname=nick;wallet=result;look={...DEFAULT,...(wallet.look||{})}; if(!wallet.look?.frontHair && wallet.look?.hair)look.frontHair=wallet.look.hair;renderWallet();
  }catch(err){console.warn('닉네임 아이템 동기화 실패:',err.message)}
  finally{bindingNickname=false}
}
async function syncWallet(){try{wallet=await call('wrWallet');look={...DEFAULT,...wallet.look};if(!wallet.look?.frontHair && wallet.look?.hair)look.frontHair=wallet.look.hair;renderWallet()}catch(e){console.warn('wallet:',e.message)}}
function itemOwned(cat,it){
 return Number(it.price)===0 || !!wallet.owned?.[cat]?.[it.id] || (cat==='frontHair' && !!wallet.owned?.hair?.[it.id]);
}
function previewLook(){
 return previewSelection?{...look,[previewSelection.cat]:previewSelection.id}:look;
}
function redrawPreview(){
 const view=$('wrPreviewAvatar');if(view){
   const chosen=pick('backHair',previewLook().backHair);
   const part=(activeCat==='backHair')
     ? `<div class="wr-backhair-inspector"><small>뒷머리 원본 모양</small>${safeFile(chosen?.file)?`<img src="${chosen.file}" alt="선택한 뒷머리 원본" draggable="false">`:'<small>뒷머리 미착용</small>'}</div>` : '';
   view.innerHTML=avatar(previewLook(),176)+part;
 }
 const title=$('wrPreviewTitle'),hint=$('wrPreviewHint'),button=$('wrPreviewAction');
 if(!previewSelection){
   if(title)title.textContent='현재 장착 중인 코디';
   if(hint)hint.textContent='아이템을 누르면 구입 전에 미리 입어볼 수 있어요.';
   if(button){button.textContent='아이템을 선택해 주세요';button.disabled=true}
   return;
 }
 const {cat,id}=previewSelection,it=pick(cat,id);if(!it)return;
 const own=itemOwned(cat,it);
 if(title)title.textContent=`미리보기: ${it.name}`;
 if(hint)hint.textContent=own?'미리 착용 중 · 보유 아이템입니다. 장착 버튼을 눌러 확정해 주세요.':'미리 착용 중 · 코인은 구매 버튼을 누를 때만 차감됩니다.';
 if(button){button.disabled=busy||look[cat]===id;button.textContent=look[cat]===id?'이미 장착 중':own?'선택한 아이템 장착':`🪙 ${Number(it.price)}코인에 구매 후 장착`}
}
async function openCloset(){
 // The real catalog may still be downloading when the user opens the wardrobe.
 if(!Object.keys(catalog).length){
   try{await loadCatalog()}catch(e){openModal('드레스룸 오류',`<p class="wr-note">아이템 목록을 읽지 못했어요: ${escape(e.message)}</p><button class="wr-btn" id="wrCatalogRetry">다시 불러오기</button>`);$('wrCatalogRetry').onclick=openCloset;return;}
 }
 const tabs=Object.entries(CATS).map(([k,v])=>`<button class="wr-btn${activeCat===k?' primary':''}" data-tab="${k}">${v} (${(catalog[k]||[]).length})</button>`).join('');
 openModal('👗 나의 드레스룸',`<div class="wr-closet"><div class="wr-preview"><div id="wrPreviewAvatar">${avatar(previewLook(),176)}</div><strong id="wrPreviewTitle"></strong><div class="wr-note" id="wrPreviewHint"></div><button id="wrPreviewAction" class="wr-btn primary" type="button"></button><button id="wrPreviewReset" class="wr-btn" type="button">미리보기 취소</button></div><div><div class="wr-tabs" id="wrTabs">${tabs}</div><div class="wr-grid" id="wrItems"></div></div></div>`);
 $('wrTabs').onclick=e=>{const btn=e.target.closest('[data-tab]');if(!btn)return;activeCat=btn.dataset.tab;previewSelection=null;openCloset()};
 $('wrPreviewReset').onclick=()=>{previewSelection=null;redrawPreview();renderItems()};
 $('wrPreviewAction').onclick=async()=>{
   if(!previewSelection||busy)return;
   const {cat,id}=previewSelection,it=pick(cat,id);if(!it||look[cat]===id)return;
   const owned=itemOwned(cat,it);
   if(!owned&&!confirm(`${it.name}을(를) ${it.price}코인에 구매하고 장착할까요?`))return;
   try{
     busy=true;redrawPreview();
     if(!owned)wallet=await call('wrBuy',{cat,id});
     wallet=await call('wrEquip',{cat,id});
     look={...DEFAULT,...wallet.look};
     if(!wallet.look?.frontHair&&wallet.look?.hair)look.frontHair=wallet.look.hair;
     renderWallet();
     if(typeof db!=='undefined'&&db&&typeof currentRoomCode!=='undefined'&&currentRoomCode){
       db.ref(`rooms/${currentRoomCode}/players/${uid}/wrLook`).set(look).catch(console.warn);
     }
     previewSelection=null;renderItems();redrawPreview();
   }catch(err){alert('구매/장착 실패: '+err.message)}finally{busy=false;redrawPreview();}
 };
 renderItems();redrawPreview();
}
function renderItems(){
 const grid=$('wrItems');if(!grid)return;
 const items=catalog[activeCat]||[];
 if(!items.length){grid.innerHTML='<p class="wr-note">이 카테고리의 아이템이 비어 있어요. catalog.json과 이미지 파일을 확인해 주세요.</p>';return;}
 grid.innerHTML=items.map(it=>{
  const owned=itemOwned(activeCat,it),equipped=look[activeCat]===it.id,selected=previewSelection?.cat===activeCat&&previewSelection?.id===it.id;
  const picture=activeCat==='backHair'
   ? `<span class="wr-backhair-piece">${safeFile(it.file)?`<img src="${it.file}" alt="${escape(it.name)} 뒷머리 원본" loading="lazy" draggable="false">`:'<span class="wr-no-backhair">미착용</span>'}</span><small class="wr-backhair-piece-label">뒷머리 단독</small>`
   : avatar({...look,[activeCat]:it.id},82);
  return `<button type="button" class="wr-item${equipped?' active':''}${selected?' wr-tryon':''}" data-id="${escape(it.id)}" aria-label="${escape(it.name)} 미리보기">${picture}<strong>${escape(it.name)}</strong><span class="price">${equipped?'장착 중':owned?'보유 · 미리보기':'🪙 '+Number(it.price)}</span></button>`;
 }).join('');
 grid.onclick=e=>{
  const btn=e.target.closest('[data-id]');if(!btn)return;
  const item=items.find(x=>x.id===btn.dataset.id);if(!item)return;
  previewSelection={cat:activeCat,id:item.id};renderItems();redrawPreview();
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
async function loadCatalog(){const r=await fetch('assets/nonemo/catalog.json?v=20261120c', {cache:'no-store'});if(!r.ok)throw Error('nonemo 에셋 목록 없음');const json=await r.json();catalog=json.categories||{};for(const cat of Object.keys(CATS)){const a=catalog[cat]||[];if(!a.length)throw Error(`${cat} 에셋 누락`);DEFAULT[cat]=a[0].id}}
function initOffline(){injectUI();loadCatalog().catch(console.warn);}
async function init(authUid){uid=authUid;injectUI();await loadCatalog();
 economy=WordRaceSparkEconomy.createClient(firebase.database(),uid,{categories:catalog,petBases:window.WR_PET_CATALOG?.bases||[],petWings:window.WR_PET_CATALOG?.wings||[]},()=>Date.now()+(typeof serverOffset!=='undefined'?serverOffset:0));
 window.WordRacePets?.init(uid,economy);
 await bindCurrentNickname();
 await syncWallet();
 if(typeof renderProfileBtn==='function')renderProfileBtn();
 // Keep legacy profile as historical bookkeeping only; game scores and wardrobe use the Spark wallet.
 if(typeof db!=='undefined'&&db){economy.subscribe(v=>{wallet=v;look={...DEFAULT,...(wallet.look||{})};if(!wallet.look?.frontHair && wallet.look?.hair)look.frontHair=wallet.look.hair;renderWallet()})}
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
