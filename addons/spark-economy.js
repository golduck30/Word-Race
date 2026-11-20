/* Word-Race Spark economy — no Cloud Functions / no billing account.
   Best-effort friend-only credits: clients can be modified; NOT tamper-proof.
   Transactions ensure an honest client cannot accidentally settle/bet twice. */
(function(root,factory){
 const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;
 if(root)root.WordRaceSparkEconomy=api;
})(typeof window!=='undefined'?window:null,function(){
 'use strict';
 const START=200,ENTRY=20,CATS=['skin','bottom','outfit','eyes','hair','frontHair','backHair','glasses','beard','fantasy'];
 const copy=x=>JSON.parse(JSON.stringify(x));
 const own=(obj,key)=>Object.prototype.hasOwnProperty.call(obj||{},key);
 const arr=x=>Array.isArray(x)?x:Object.values(x||{});
 // Friendly-room identity: all UID sessions using the same nickname share one wallet.
 // Deliberately no password: identical nicknames share coins/items by design.
 function nicknameKey(nick){
   const clean=String(nick??'').trim().normalize('NFC');
   if(!clean||clean.length>32||/[\u0000-\u001f\u007f]/.test(clean))throw Error('닉네임은 1~32자로 입력해 주세요');
   return 'nick_'+encodeURIComponent(clean.toLowerCase()).replace(/\./g,'%2E');
 }
 function resolvedUid(state,uid){return state.uidAliases?.[uid]||uid}
 function bindNickname(state,uid,nick,catalog){
   const key=nicknameKey(nick);
   state.uidAliases??={};state.users??={};
   const prior=state.uidAliases[uid];
   if(prior===key)return copy(ensure(state,uid,catalog));
   const original=state.users[prior||uid];
   const existed=!!state.users[key];
   if(!existed){
     state.users[key]=original?copy(original):undefined;
     if(!state.users[key]){delete state.users[key];}
   } else if(original && (prior||uid)!==key){
     // Preserve purchased items on either device, but never duplicate starter coins.
     const dest=state.users[key];
     for(const [cat,items] of Object.entries(original.owned||{})){
       dest.owned??={};dest.owned[cat]??={};
       for(const [id,v] of Object.entries(items||{}))if(v)dest.owned[cat][id]=true;
     }
     for(const group of ['bases','wings']){
       dest.petOwned??={};dest.petOwned[group]??={};
       for(const [id,v] of Object.entries(original.petOwned?.[group]||{}))if(v)dest.petOwned[group][id]=true;
     }
     if(!dest.petMigrated&&original.petMigrated)dest.petMigrated=original.petMigrated;
   }
   // Keep historical wallets as a backup, but use the named wallet from now on.
   state.uidAliases[uid]=key;
   const u=ensure(state,uid,catalog);u.nickname=String(nick).trim();
   return copy(u);
 }
 function ensure(state,uid,catalog){
   uid=resolvedUid(state,uid);
   state.users??={};
   if(!own(state.users,uid)){
     const look={};for(const cat of CATS){const options=catalog.categories?.[cat];if(options?.length)look[cat]=options[0].id;}
     state.users[uid]={coins:START,owned:{},look};
   }
   return state.users[uid];
 }
 function item(catalog,cat,id){
  if(!CATS.includes(cat))throw Error('잘못된 아이템 카테고리');
  const it=(catalog.categories[cat]||[]).find(it=>it.id===id);
  if(!it)throw Error('존재하지 않는 아이템');return it;
 }
 // Pet inventory is distinct from the nonemo outfit collection.
 function petItem(catalog,kind,id){
   if(!['base','wing'].includes(kind))throw Error('올바르지 않은 펫 종류');
   const list=(kind==='base'?catalog.petBases:catalog.petWings)||[];
   const found=list.find(x=>x.id===id);if(!found)throw Error('존재하지 않는 펫 아이템');return found;
 }
 function petDefaults(u){
   u.petOwned??={bases:{},wings:{}};
   u.petLook??={base:'🐶',wing:'wing:none'};
   return u;
 }
 function mutatePetBuy(state,uid,catalog,kind,id){
   const it=petItem(catalog,kind,id),u=petDefaults(ensure(state,uid,catalog));
   const key=kind==='base'?'bases':'wings';
   if(Number(it.price)>0&&!u.petOwned[key][id]){
     if(u.coins<it.price)throw Error('코인이 부족해요');u.coins-=it.price;u.petOwned[key][id]=true;
   }
   return copy(u);
 }
 function mutatePetEquip(state,uid,catalog,kind,id){
   const it=petItem(catalog,kind,id),u=petDefaults(ensure(state,uid,catalog));
   const key=kind==='base'?'bases':'wings';
   if(it.price>0&&!u.petOwned[key][id])throw Error('먼저 구매하거나 기존 todayword에서 가져와 주세요');
   u.petLook[kind]=id;return copy(u);
 }
 function mutatePetImport(state,uid,catalog,params){
   const u=petDefaults(ensure(state,uid,catalog));
   if(u.petMigrated)throw Error('이미 기존 펫 기록을 가져온 계정입니다');
   const nick=String(params.nick||'').trim();if(!nick||nick.length>32)throw Error('닉네임이 올바르지 않습니다');
   const ids=Array.isArray(params.owned)?params.owned.filter(x=>typeof x==='string').slice(0,500):[];
   const eq=params.eq||{};
   for(const i of catalog.petBases||[])if(i.price===0||ids.includes(i.id))u.petOwned.bases[i.id]=true;
   for(const i of catalog.petWings||[])if(i.price===0||ids.includes(i.id))u.petOwned.wings[i.id]=true;
   if(u.petOwned.bases[eq.a])u.petLook.base=eq.a;
   if(u.petOwned.wings[eq.wing])u.petLook.wing=eq.wing;
   u.petMigrated={nick,at:Date.now()};return copy(u);
 }
 function scores(room){
  const out={};if(!room?.secretWord||!room?.players)return out;
  const secret=room.secretWord,hints=Object.keys(room.hintState?.revealed||{}).length;
  const start=Number(room.startedAt)||0,limitMs=(Number(room.timeLimit)||0)*1000;
  const parts=Object.entries(room.players).filter(([uid,p])=>uid!==room.masterUid&&!p.spectator);
  const solved=parts.map(([uid,p])=>({uid,p,g:arr(p.guesses)})).filter(x=>x.g.includes(secret)).sort((a,b)=>(a.p.solvedTimestamp||9e15)-(b.p.solvedTimestamp||9e15));
  solved.forEach((x,i)=>{
   const k=x.g.indexOf(secret)+1,base=Math.max(10,(6-k)*20),speed=[30,20,10][i]||0;
   const time=limitMs>0&&start&&x.p.solvedTimestamp?Math.round(20*Math.max(0,Math.min(1,(start+limitMs-x.p.solvedTimestamp)/limitMs))):0;
   const hint=Math.min(hints*10,Math.max(0,base-10));out[x.uid]=Math.max(10,base+speed+time-hint);
  });
  const fails=parts.filter(([uid,p])=>p.completed&&!arr(p.guesses).includes(secret)).length;
  const bonus=Math.min(fails*15,60);if(bonus>0&&room.players[room.masterUid])out[room.masterUid]=bonus;
  return out;
 }
 function validRoom(code){if(!/^\d{6}$/.test(String(code||'')))throw Error('방 코드 형식이 잘못됐어요');return String(code)}
 function validateBet(room,uid,target,round,now){
  if(!room?.secretWord||Number(room.round)!==Number(round))throw Error('진행 중인 라운드가 아니에요');
  if(!room.players?.[uid]?.spectator||room.players[uid].waiting)throw Error('현재 관전자만 예측할 수 있어요');
  if(!room.players[target]||room.players[target].spectator||target===room.masterUid)throw Error('출제자나 관전자는 선택할 수 없어요');
  if(!Number.isFinite(Number(room.startedAt))||now<room.startedAt||now-room.startedAt>60000)throw Error('예측은 출제 후 60초 안에만 가능해요');
 }
 function mutateWallet(state,uid,catalog){return copy(ensure(state,uid,catalog))}
 function mutateBuy(state,uid,catalog,cat,id){
  const it=item(catalog,cat,id),u=ensure(state,uid,catalog),price=Number(it.price)||0;
  if(price>0&&!u.owned?.[cat]?.[it.id] && !(cat==='frontHair' && u.owned?.hair?.[it.id])){
   if(u.coins<price)throw Error('코인이 부족해요');u.coins-=price;
   u.owned??={};u.owned[cat]??={};u.owned[cat][it.id]=true;
  }
  return copy(u);
 }
 function mutateEquip(state,uid,catalog,cat,id){
  const it=item(catalog,cat,id),u=ensure(state,uid,catalog);
  if(Number(it.price)>0&&!u.owned?.[cat]?.[it.id] && !(cat==='frontHair' && u.owned?.hair?.[it.id]))throw Error('구매하지 않은 아이템이에요');
  u.look??={};u.look[cat]=id; if(cat==='frontHair')u.look.hair=id;return copy(u);
 }
 function mutateBet(state,uid,catalog,code,round,target,now){
  const u=ensure(state,uid,catalog);state.rooms??={};state.rooms[code]??={};
  const r=state.rooms[code][round]??={bets:{},settled:false};
  if(r.settled)throw Error('이미 종료된 라운드예요');
  if(own(r.bets,uid))throw Error('이번 라운드에 이미 참여했어요');
  if(u.coins<ENTRY)throw Error('예측에 필요한 20코인이 부족해요');
  u.coins-=ENTRY;r.bets[uid]={targetUid:target,stake:ENTRY,at:now};state.rooms[code][round]=r;
  return copy(u);
 }
 function mutateSettle(state,catalog,code,round,room,now){
  state.rooms??={};state.rooms[code]??={};
  const r=state.rooms[code][round]??={bets:{},settled:false};
  if(r.settled)return {already:true,winners:r.winners||[]};
  const points=scores(room);
  const participants=Object.entries(room.players||{}).filter(([uid,p])=>uid!==room.masterUid&&!p.spectator);
  const max=Math.max(0,...participants.map(([uid])=>points[uid]||0));
  const winners=max>0?participants.filter(([uid])=>(points[uid]||0)===max).map(([uid])=>uid):[];
  const bets=Object.entries(r.bets||{}),correct=bets.filter(([,v])=>winners.includes(v.targetUid));
  const pot=bets.reduce((n,[,b])=>n+(Number(b.stake)||0),0);
  if(winners.length===0){for(const [uid,b] of bets)ensure(state,uid,catalog).coins+=Number(b.stake)||0}
  else if(correct.length){const amount=Math.floor(pot/correct.length);for(const [uid] of correct)ensure(state,uid,catalog).coins+=amount}
  for(const [uid,pointsEarned] of Object.entries(points))ensure(state,uid,catalog).coins+=pointsEarned;
  Object.assign(r,{settled:true,settledAt:now,winners,pot,correct:correct.length});state.rooms[code][round]=r;
  return {already:false,winners,correct:correct.length,pot,scores:points};
 }
 function readyToSettle(room,round){
  if(!room?.secretWord||Number(room.round)!==Number(round)||!room.players)return false;
  const solvers=Object.entries(room.players).filter(([uid,p])=>uid!==room.masterUid&&!p.spectator);
  return solvers.length>0&&solvers.every(([,p])=>p.completed);
 }
 function createClient(db,uid,catalog,serverNow=()=>Date.now()){
  const stateRef=db.ref('wrEconomy/state');
  // Transaction handler may run multiple times. No side effects within callback.
  async function transaction(fn){
   let error=null;let response;
   const tx=await stateRef.transaction(current=>{
    const state=current?copy(current):{users:{},rooms:{}};
    try{response=fn(state);error=null;return state}catch(e){error=e;return undefined}
   },undefined,false);
   if(!tx.committed)throw error||Error('동시 요청을 처리하지 못했어요. 다시 시도해 주세요');
   return response;
  }
  async function action(name,params={}){
   if(name==='wrBindNickname')return transaction(s=>bindNickname(s,uid,params.nickname,catalog));
   if(name==='wrWallet')return transaction(s=>{const u=mutateWallet(s,uid,catalog);petDefaults(s.users[resolvedUid(s,uid)]);return copy(s.users[resolvedUid(s,uid)])});
   if(name==='wrBuyPet')return transaction(s=>mutatePetBuy(s,uid,catalog,params.kind,params.id));
   if(name==='wrEquipPet')return transaction(s=>mutatePetEquip(s,uid,catalog,params.kind,params.id));
   if(name==='wrImportPet')return transaction(s=>mutatePetImport(s,uid,catalog,params));
   if(name==='wrBuy')return transaction(s=>mutateBuy(s,uid,catalog,params.cat,params.id));
   if(name==='wrEquip')return transaction(s=>mutateEquip(s,uid,catalog,params.cat,params.id));
   if(name==='wrBet'){
    const code=validRoom(params.roomCode),round=Number(params.roundId),now=serverNow();
    const room=(await db.ref('rooms/'+code).once('value')).val();
    validateBet(room,uid,params.targetUid,round,now);
    return transaction(s=>mutateBet(s,uid,catalog,code,round,params.targetUid,now));
   }
   if(name==='wrSettle'){
    const code=validRoom(params.roomCode),round=Number(params.roundId),now=serverNow();
    const room=(await db.ref('rooms/'+code).once('value')).val();
    if(!room||(![room.hostUid,room.masterUid].includes(uid)))throw Error('출제자 또는 방장만 정산할 수 있어요');
    if(!readyToSettle(room,round))throw Error('아직 문제를 풀고 있는 참가자가 있어요');
    return transaction(s=>mutateSettle(s,catalog,code,round,room,now));
   }
   throw Error('알 수 없는 요청입니다: '+name);
  }
  return {action,subscribe(callback){
   // Root subscription tracks alias changes on login from a different device.
   // Friend-only Spark project: this is small but reads the full economy state.
   const ref=stateRef;const handler=s=>{const state=s.val()||{};
     const wallet=state.users?.[resolvedUid(state,uid)];if(wallet)callback(wallet);
   };
   ref.on('value',handler);return ()=>ref.off('value',handler);
  }};
 }
 return {createClient,nicknameKey,bindNickname,readyToSettle,scores,mutateBet,mutateSettle,mutateWallet,mutateBuy,mutateEquip,mutatePetBuy,mutatePetEquip,mutatePetImport,validateBet,ENTRY,START};
});
