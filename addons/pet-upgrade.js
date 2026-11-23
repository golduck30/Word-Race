/* Word-Race pet upgrade using todayword emoji animals and original SVG wings.
   The old site's local storage is accessed exclusively via the migration bridge on its own origin. */
(() => {
  'use strict';
  const $=id=>document.getElementById(id);
  const esc=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
  let economy=null, wallet=null, uid='', tab='base', busy=false, petPreview=null;
  const cat=()=>window.WR_PET_CATALOG||{bases:[],wings:[]};
  const getItems=()=>tab==='base'?cat().bases:cat().wings;
  const petLook=()=>wallet?.petLook||{base:'🐶',wing:'wing:none'};
  function petMarkup(v,size=44){
    const p=v||{base:'🐶',wing:'wing:none'};
    const allowedBases=cat().bases.map(x=>x.id), allowedWings=cat().wings.map(x=>x.id);
    const base=allowedBases.includes(p.base)?p.base:'🐶';
    const wing=allowedWings.includes(p.wing)?p.wing:'wing:none';
    const kind=wing.slice(5);
    const wingImg=['angel','butterfly','fairy','devil','fire','aurora','crystal'].includes(kind)
      ? `<span class="wr-pet-wing-pair" aria-hidden="true"><img class="wr-pet-wings-image" src="assets/wings/${kind}.svg" alt="" draggable="false"></span>`:'';
    return `<span class="wr-pet" style="--pet-size:${Math.max(20,Math.min(120,size))}px" aria-label="펫 ${esc(base)}">${wingImg}<span class="wr-pet-base">${esc(base)}</span></span>`;
  }
  function attachRace(data){
    const root=$('wrTrack');if(!root||!data?.players)return;
    root.querySelectorAll('.wr-runner').forEach(el=>{
      const name=el.querySelector('.wr-name')?.textContent;
      const player=Object.values(data.players).find(p=>String(p.nickname)===name);
      if(!player)return;
      const old=el.querySelector('.wr-pet-follower');if(old)old.remove();
      const wrap=document.createElement('span');wrap.className='wr-pet-follower';
      wrap.innerHTML=petMarkup(player.wrPet||null,window.innerWidth<550?24:30);
      el.appendChild(wrap);
    });
  }
  async function refresh(){if(!economy)return;wallet=await economy.action('wrWallet');}
  async function openPetCloset(){
    if(!uid){alert('온라인 Firebase 인증 후 펫을 꾸밀 수 있어요.');return;}
    await refresh();
    const items=getItems(),own=wallet.petOwned||{},chosen=petLook();
    const root=$('wrModalBody');if(!root){alert('드레스룸 화면을 찾지 못했습니다.');return}
    $('wrModalTitle').textContent='🐾 나의 펫 꾸미기';$('wrModal').classList.add('show');
    const visual=petPreview?{...chosen,[petPreview.kind==='base'?'base':'wing']:petPreview.id}:chosen;
    root.innerHTML=`<section class="wr-pet-closet"><div class="wr-pet-showcase"><div id="wrPetVisual">${petMarkup(visual,94)}</div><strong id="wrPetPreviewName">${petPreview?'착용 미리보기':'나의 펫'}</strong><small>아이템을 눌러 미리 본 뒤 구매할 수 있어요.</small><button id="wrPetBuyEquip" class="wr-btn primary" ${petPreview?'':'disabled'}> ${petPreview?'선택한 아이템 구매/장착':'펫 아이템 선택'} </button><button id="wrPetPreviewCancel" class="wr-btn">미리보기 취소</button><button id="wrPetMigrate" class="wr-btn">🔗 todayword 아이템·코인 전체 가져오기</button><div class="wr-note">기존 코인 전액과 펫·날개를 이전합니다. 이전 불가한 보유 아이템은 1개당 10코인을 지급해요. 같은 브라우저에서 1회만 가능합니다.</div></div><div><div class="wr-tabs"><button id="wrPetsBase" class="wr-btn ${tab==='base'?'primary':''}">🐾 동물</button><button id="wrPetsWing" class="wr-btn ${tab==='wing'?'primary':''}">🪽 날개</button></div><div class="wr-pet-grid">${items.map(it=>{
      const owned=Number(it.price)===0||!!(tab==='base'?own.bases?.[it.id]:own.wings?.[it.id]);const equipped=tab==='base'?chosen.base===it.id:chosen.wing===it.id;
      const selected=petPreview?.kind===tab&&petPreview?.id===it.id;
      return `<button data-pet-id="${esc(it.id)}" class="wr-item ${equipped?'active':''} ${selected?'wr-tryon':''}"><span class="wr-pet-item-image">${tab==='base'?esc(it.id):petMarkup({base:'🐶',wing:it.id},56)}</span><strong>${esc(it.name)}</strong><span class="price">${equipped?'장착중':owned?'보유중':`🪙 ${it.price}`}</span></button>`;
    }).join('')}</div></div></section>`;
    $('wrPetsBase').onclick=()=>{tab='base';petPreview=null;openPetCloset()};$('wrPetsWing').onclick=()=>{tab='wing';petPreview=null;openPetCloset()};
    $('wrPetPreviewCancel').onclick=()=>{petPreview=null;openPetCloset()};
    $('wrPetMigrate').onclick=startTransfer;
    $('wrPetBuyEquip').onclick=async()=>{
      if(!petPreview||busy)return;
      const {kind,id}=petPreview,it=(kind==='base'?cat().bases:cat().wings).find(x=>x.id===id);if(!it)return;
      const owned=Number(it.price)===0||!!(kind==='base'?wallet.petOwned?.bases?.[id]:wallet.petOwned?.wings?.[id]);
      if(!owned&&!confirm(`${it.name}을(를) ${it.price}코인에 구매하고 장착할까요?`))return;
      try{busy=true;if(!owned)await economy.action('wrBuyPet',{kind,id});await economy.action('wrEquipPet',{kind,id});await refresh();await publishPet();petPreview=null;await openPetCloset()}
      catch(err){alert('펫 구매/장착 실패: '+err.message)}finally{busy=false}
    };
    root.querySelector('.wr-pet-grid').onclick=e=>{
      const button=e.target.closest('[data-pet-id]');if(!button)return;
      const id=button.dataset.petId,it=items.find(x=>x.id===id);if(!it)return;
      petPreview={kind:tab,id};
      $('wrPetVisual').innerHTML=petMarkup({...chosen,[tab==='base'?'base':'wing']:id},94);
      $('wrPetPreviewName').textContent=`미리보기: ${it.name}`;
      const owned=Number(it.price)===0||!!(tab==='base'?own.bases?.[id]:own.wings?.[id]);
      const action=$('wrPetBuyEquip');action.disabled=(tab==='base'?chosen.base===id:chosen.wing===id);
      action.textContent=action.disabled?'이미 장착 중':owned?'이 아이템 장착':`🪙 ${it.price}코인에 구매 후 장착`;
      root.querySelectorAll('[data-pet-id]').forEach(x=>x.classList.toggle('wr-tryon',x.dataset.petId===id));
    };
    if(petPreview){const it=items.find(x=>x.id===petPreview.id);if(it){const btn=root.querySelector(`[data-pet-id="${CSS.escape(it.id)}"]`);btn?.click()}}
  }
  async function publishPet(){
    if(typeof currentRoomCode!=='undefined'&&currentRoomCode&&typeof db!=='undefined'&&db&&uid){
      await db.ref('rooms/'+currentRoomCode+'/players/'+uid+'/wrPet').set(petLook()).catch(()=>{});
    }
  }
  async function startTransfer(){
    if(wallet?.legacyImport?.completed){
      const s=wallet.legacyImport;
      alert(`✅ 이미 todayword 전체 이전을 완료했어요.\n기존 코인: ${s.oldCoins}\n전환 보상: ${s.convertedCoins}코인 (${s.convertedItems}개)`);return;
    }
    const suggestion=localStorage.getItem('wordle_nick')||localStorage.getItem('wordrace_nick')||'';
    const nick=prompt('todayword에서 사용하던 닉네임을 입력해 줘.\n기존 사이트에서 사용하던 같은 브라우저에서만 기록을 찾을 수 있어요.',suggestion);
    if(!nick?.trim())return;
    const key='wordle_profile::'+encodeURIComponent(nick.trim().toLowerCase()).replace(/\./g,'%2E');
    let old=null;
    try{old=JSON.parse(localStorage.getItem(key)||'null')}catch{}
    if(!old||!Array.isArray(old.owned)||!old.eq||!Number.isFinite(Number(old.coins))){
      alert('이 브라우저에서 해당 닉네임의 todayword 보유 기록을 찾지 못했어.\n기존 todayword에 접속한 같은 브라우저에서 닉네임을 확인해 줘.');return;
    }
    const catalog=cat();
    const bases=new Set(catalog.bases.map(x=>x.id));
    const wings=new Set(catalog.wings.map(x=>x.id));
    const ids=[...new Set(old.owned.filter(v=>typeof v==='string'&&v.length<100))];
    const covered=ids.filter(id=>bases.has(id)||wings.has(id));
    const missing=ids.filter(id=>!bases.has(id)&&!wings.has(id));
    const coins=Math.max(0,Math.floor(Number(old.coins)));
    const refund=missing.length*10;
    if(!confirm(`${nick.trim()}의 todayword 데이터를 1회 이전할까?\n\n기존 코인: ${coins.toLocaleString()}코인\n이전 가능한 펫·날개: ${covered.length}개\n이전 불가 아이템: ${missing.length}개 × 10코인 = ${refund.toLocaleString()}코인\n\n총 지급: ${(coins+refund).toLocaleString()}코인\n\n※ 기존 todayword 기록은 삭제되지 않아.`))return;
    try{
      const result=await economy.action('wrImportLegacyAll',{nick:nick.trim(),coins,owned:ids,eq:{a:old.eq.a,wing:old.eq.wing}});
      await refresh();await publishPet();petPreview=null;await openPetCloset();
      const r=result.summary;
      alert(`🎁 todayword 데이터 이전 완료!\n\n🪙 기존 코인: ${r.oldCoins.toLocaleString()}코인\n🐾 펫·날개: ${r.transferredItems}개 이전\n📦 이전 불가 아이템: ${r.convertedItems}개\n🎉 아이템 보상: ${r.convertedCoins.toLocaleString()}코인\n\n총 ${r.credited.toLocaleString()}코인을 지급했어!`);
    }catch(err){alert('이전 오류: '+err.message)}
  }
  // race DOM is re-rendered by the original Word-Race renderer; append after it finishes.
  function init(authUid,econ){uid=authUid;economy=econ;
    const b=document.createElement('button');b.id='wrPetBtn';b.className='wr-btn';b.textContent='🐾 펫 꾸미기';b.onclick=()=>openPetCloset().catch(e=>alert(e.message));
    $('wrClosetBtn')?.after(b);
    refresh().catch(console.warn);
  }
  window.WordRacePets={init,petMarkup,attachRace,publishPet,openPetCloset};
})();
