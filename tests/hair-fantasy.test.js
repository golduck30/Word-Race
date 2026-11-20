const assert=require('node:assert/strict');
const fs=require('fs');
const path=require('path');
const api=require('../addons/spark-economy.js');
const root=path.resolve(__dirname,'..');
const catalog=JSON.parse(fs.readFileSync(path.join(root,'assets/nonemo/catalog.json'),'utf8'));
for(const [cat,expected] of Object.entries({frontHair:45,backHair:28,fantasy:11,eyes:75})){
 assert.equal(catalog.categories[cat].length,expected,`missing ${cat}`);
 for(const it of catalog.categories[cat])if(it.file)assert.ok(fs.existsSync(path.join(root,it.file)),it.file);
}
const state={users:{},rooms:{}};
const options={categories:catalog.categories};
let w=api.mutateWallet(state,'uid001',options);
assert.equal(w.coins,200);
const f=catalog.categories.frontHair.find(x=>x.price>0),b=catalog.categories.backHair.find(x=>x.price>0),magic=catalog.categories.fantasy.find(x=>x.price>0);
// legacy ownership is accepted as frontHair entitlement
state.users.uid001.owned.hair={[f.id]:true};
const oldBalance=state.users.uid001.coins;
api.mutateBuy(state,'uid001',options,'frontHair',f.id);
assert.equal(state.users.uid001.coins,oldBalance);
api.mutateEquip(state,'uid001',options,'frontHair',f.id);
assert.equal(state.users.uid001.look.frontHair,f.id);
assert.equal(state.users.uid001.look.hair,f.id);
api.mutateBuy(state,'uid001',options,'backHair',b.id);
api.mutateEquip(state,'uid001',options,'backHair',b.id);
assert.equal(state.users.uid001.look.backHair,b.id);
// add sufficient friend-game coins for fantasy example purchase
state.users.uid001.coins=500;
api.mutateBuy(state,'uid001',options,'fantasy',magic.id);
api.mutateEquip(state,'uid001',options,'fantasy',magic.id);
assert.equal(state.users.uid001.look.fantasy,magic.id);
console.log('PASS: 45 front hairstyles, 27 back hairstyles, 10 fantasy, legacy owned hair, buy/equip');
