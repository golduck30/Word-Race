#!/usr/bin/env python3
"""Patch generated dist only, preserving tracked Word-Race feature updates."""
from pathlib import Path
import re,sys,shutil
root=Path(__file__).resolve().parents[1];dist=root/'dist'
if not (dist/'game.js').exists():sys.exit('Build dist missing. Run tools/build.py first.')
def edit(file,old,new,expected=1):
 p=dist/file;s=p.read_text(encoding='utf-8');count=s.count(old)
 if count!=expected:sys.exit(f'Anchor mismatch: {file}: {old[:90]!r} found {count}, expected {expected}. Nothing published.')
 p.write_text(s.replace(old,new),encoding='utf-8')
# Create item categories using the authoritative source catalogs, without inventing IDs.
game=dist/'game.js';s=game.read_text(encoding='utf-8')
if 'WR_PET_EXTRA_CATEGORIES_V1' not in s:
 s+='''\n/* WR_PET_EXTRA_CATEGORIES_V1 — original todayword optional neck and hand/side assets. */
(function(){
  const src=typeof SHOP_ITEMS==='object' ? SHOP_ITEMS : {}; // Original todayword: neck/side live in SHOP_ITEMS, not EXTRA_SHOP_ITEMS
  const read=(keys)=>keys.flatMap(k=>Array.isArray(src[k])?src[k]:[]);
  const convert=(rows)=>rows.map(x=>({id:String(x.id),name:String(x.n||x.name||x.id),price:Math.max(0,Number(x.p??x.price??0)||0),emoji:String(x.emoji||x.icon||x.e||x.glyph||x.id||'🎀')}));
  window.WR_PET_CATALOG.necks=[{id:'neck:none',name:'목 장식 없음',price:0,emoji:'❌'},...convert(read(['neck']))];
  window.WR_PET_CATALOG.hands=[{id:'hand:none',name:'손/옆 장식 없음',price:0,emoji:'❌'},...convert(read(['side']))];
})();
'''
 game.write_text(s,encoding='utf-8')
# Extend wallet with standalone pet-neck and pet-hand ownership and equipment.
eco=dist/'addons/spark-economy.js';s=eco.read_text(encoding='utf-8')
if 'wrImportPetExtras' not in s:
 s=s.replace("if(!['base','wing'].includes(kind))", "if(!['base','wing','neck','hand'].includes(kind))")
 s=s.replace("(kind==='base'?catalog.petBases:catalog.petWings)||[]", "(kind==='base'?catalog.petBases:kind==='wing'?catalog.petWings:kind==='neck'?catalog.petNecks:catalog.petHands)||[]")
 s=s.replace("u.petOwned??={bases:{},wings:{}};", "u.petOwned??={bases:{},wings:{}};u.petOwned.necks??={};u.petOwned.hands??={};")
 s=s.replace("u.petLook??={base:'🐶',wing:'wing:none'};", "u.petLook??={base:'🐶',wing:'wing:none'};u.petLook.neck??='neck:none';u.petLook.hand??='hand:none';")
 s=s.replace("const key=kind==='base'?'bases':'wings';", "const key=kind==='base'?'bases':kind==='wing'?'wings':kind==='neck'?'necks':'hands';")
 # Also support new pet inventories when users sign in on a second device.
 s=s.replace("for(const group of ['bases','wings']){", "for(const group of ['bases','wings','necks','hands']){")
 # Import from legacy names, separate from previous one-time pet migration, never double import.
 marker=" function scores(room){"
 if marker not in s:sys.exit('Economy score anchor missing')
 extra=''' function mutatePetExtrasImport(state,uid,catalog,params){
  const u=petDefaults(ensure(state,uid,catalog));
  if(u.petExtrasMigrated)throw Error('목·손 아이템을 이미 이전했어요');
  const ids=new Set(Array.isArray(params.owned)?params.owned.filter(x=>typeof x==='string').slice(0,1000):[]);
  for(const [kind,items,key] of [['neck',catalog.petNecks||[],'necks'],['hand',catalog.petHands||[],'hands']]){
   for(const item of items){if(!Number(item.price)||ids.has(item.id))u.petOwned[key][item.id]=true;}
  }
  const eq=params.eq||{};
  for(const [kind,source,key] of [['neck',eq.neck||eq.n||'','necks'],['hand',eq.hand||eq.side||eq.s||'','hands']]){
   if(u.petOwned[key][source])u.petLook[kind]=source;
  }
  u.petExtrasMigrated={at:Date.now()};return copy(u);
 }
 function mutateArcade(state,uid,catalog,params){
  const u=ensure(state,uid,catalog),stake=Number(params.stake),rate=Number(params.rate);
  if(!Number.isSafeInteger(stake)||stake<10||stake>5000||stake%10!==0)throw Error('10~5000코인, 10코인 단위로 입력해 주세요');
  if(![0,0.5,1,1.5,1.9,2,5,9,10,25].includes(rate))throw Error('잘못된 배당');
  if(u.coins<stake)throw Error('코인이 부족해요');
  u.coins=u.coins-stake+Math.floor(stake*rate);
  return copy(u);
 }
'''
 s=s.replace(marker,extra+marker,1)
 marker2="if(name==='wrBuyPet')"
 if marker2 not in s:sys.exit('Wallet pet action missing')
 s=s.replace(marker2,"if(name==='wrImportPetExtras')return transaction(s=>mutatePetExtrasImport(s,uid,catalog,params));\n   if(name==='wrArcade')return transaction(s=>mutateArcade(s,uid,catalog,params));\n   "+marker2,1)
 # New categories must resolve into current wallet catalog from UI; callback receives window state at runtime
 eco.write_text(s,encoding='utf-8')
# The pet renderer is fully retained, with two extra independently composited slots.
pet=dist/'addons/pet-upgrade.js';s=pet.read_text(encoding='utf-8')
if 'WR_PET_EXTRA_RENDER_V1' not in s:
 target='${wingImg}<span class="wr-pet-base">${esc(base)}</span>'
 if target not in s:sys.exit('Pet visual render anchor missing')
 # Runtime catalog for same emoji accessories is defined by original ID/name.
 start="    return `<span class=\"wr-pet\""
 pos=s.find(start)
 if pos<0:sys.exit('Pet return anchor missing')
 s=s[:pos]+'''    /* WR_PET_EXTRA_RENDER_V1: accessory slots are independent of wings. */
    const neckItem=p.neck&&p.neck!=='neck:none'?cat().necks?.find(x=>x.id===p.neck):null;
    const handItem=p.hand&&p.hand!=='hand:none'?cat().hands?.find(x=>x.id===p.hand):null;
    const neckHtml=neckItem?`<span class="wr-pet-neck" title="${esc(neckItem.name)}">${esc(neckItem.emoji||'🎀')}</span>`:'';
    const handHtml=handItem?`<span class="wr-pet-hand" title="${esc(handItem.name)}">${esc(handItem.emoji||'🪄')}</span>`:'';
'''+s[pos:]
 s=s.replace(target,'${wingImg}<span class="wr-pet-base">${esc(base)}</span>${neckHtml}${handHtml}',1)
 pet.write_text(s,encoding='utf-8')
# Browser navigation accesses original host and spectator handlers; no replacement of game rules.
shutil.copy2(root/'addons/restore-controls.js',dist/'addons/restore-controls.js')
shutil.copy2(root/'addons/casino-original.js',dist/'addons/casino-original.js')
css='''\n/* Restore original multiplayer utility controls + pet additional slots. */
.wr-legacy-controls{display:flex;gap:7px;flex-wrap:wrap;margin:10px 0 0;padding:9px;background:#fff;border:1px solid #eee5fb;border-radius:14px}
.wr-status-line{display:flex;justify-content:space-between;padding:10px 2px;border-bottom:1px solid #eee}
.wr-arcade{display:grid;gap:14px}.wr-arcade input,.wr-arcade select{padding:8px;border:1px solid #ded1fa;border-radius:9px;max-width:100%}
.wr-pet-neck{position:absolute;z-index:4;top:60%;left:38%;font-size:calc(var(--pet-size)*.26);line-height:1;pointer-events:none}
.wr-pet-hand{position:absolute;z-index:4;top:54%;right:-18%;font-size:calc(var(--pet-size)*.34);line-height:1;pointer-events:none}
.wr-pet-extra-view .wr-pet{--pet-size:105px}
'''
style=dist/'addons/word-race.css';style.write_text(style.read_text(encoding='utf-8')+css,encoding='utf-8')
html=dist/'index.html';t=html.read_text(encoding='utf-8');injection='<script src="addons/casino-original.js?v=20261123"></script>\n<script src="addons/restore-controls.js?v=20261123"></script>\n';
if 'restore-controls.js' not in t:t=t.replace('</body>',injection+'</body>')
html.write_text(t,encoding='utf-8')
print('Restored controls, pet neck/hand slots and friend-only arcade. Note: client arcade is not tamper-proof.')
