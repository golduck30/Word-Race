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
      ? `<span class="wr-pet-wing-pair" aria-hidden="true"><img class="wr-pet-wing wr-pet-wing-left" src="assets/wings/${kind}.svg" alt="" draggable="false"><img class="wr-pet-wing wr-pet-wing-right" src="assets/wings/${kind}.svg" alt="" draggable="false"></span>`:'';
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
    root.innerHTML=`<section class="wr-pet-closet"><div class="wr-pet-showcase"><div id="wrPetVisual">${petMarkup(visual,94)}</div><strong id="wrPetPreviewName">${petPreview?'착용 미리보기':'나의 펫'}</strong><small>아이템을 눌러 미리 본 뒤 구매할 수 있어요.</small><button id="wrPetBuyEquip" class="wr-btn primary" ${petPreview?'':'disabled'}> ${petPreview?'선택한 아이템 구매/장착':'펫 아이템 선택'} </button><button id="wrPetPreviewCancel" class="wr-btn">미리보기 취소</button><button id="wrPetMigrate" class="wr-btn">🔗 todayword 아이템 가져오기</button><div class="wr-note">기존 코인은 이전하지 않습니다. 같은 브라우저의 todayword 보유 아이템만 1회 이전합니다.</div></div><div><div class="wr-tabs"><button id="wrPetsBase" class="wr-btn ${tab==='base'?'primary':''}">🐾 동물</button><button id="wrPetsWing" class="wr-btn ${tab==='wing'?'primary':''}">🪽 날개</button></div><div class="wr-pet-grid">${items.map(it=>{
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
    if(wallet?.petMigrated){alert('이 Word-Race 계정은 todayword 펫 이전을 이미 완료했어.');return}
    const suggestion=localStorage.getItem('wordle_nick')||'';
    const nick=prompt('todayword에서 사용하던 닉네임을 입력해 줘.\n같은 브라우저의 저장 기록만 이전할 수 있어.',suggestion);
    if(!nick?.trim())return;
    // Both pages reside on https://golduck30.github.io, so they have the SAME localStorage origin.
    const key='wordle_profile::'+encodeURIComponent(nick.trim().toLowerCase()).replace(/\./g,'%2E');
    let old=null;
    try{old=JSON.parse(localStorage.getItem(key)||'null')}catch{}
    if(!old||!Array.isArray(old.owned)||!old.eq){
      alert('이 브라우저에 해당 닉네임의 todayword 저장 기록이 없어. 기존 todayword에서 같은 닉네임으로 들어간 뒤 다시 시도해 줘. 다른 기기에서만 이용했다면 자동 이전을 지원하지 않아.');return;
    }
    const owned=old.owned.filter(v=>typeof v==='string'&&v.length<80).slice(0,500);
    if(!confirm(`${nick.trim()}의 보유 동물과 날개를 현재 Word-Race 계정으로 한 번만 가져올까?\n코인·다른 꾸미기 아이템은 이전하지 않아.`))return;
    try{
      await economy.action('wrImportPet',{nick:nick.trim(),owned,eq:{a:old.eq.a,wing:old.eq.wing}});
      await refresh();await publishPet();await openPetCloset();alert('펫 이전 완료!');
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
