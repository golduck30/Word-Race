const assert=require('node:assert/strict');
const e=require('../addons/spark-economy.js');
const catalog={categories:{},petBases:[{id:'🐶',price:0}],petWings:[{id:'wing:none',price:0}]};
const state={users:{},rooms:{}};
// Existing nickname wallet with old pet equipment (user's phone).
e.bindNickname(state,'phone','친구닉',catalog);
const original=e.mutateWallet(state,'phone',catalog);
original.petOwned={bases:{'🐶':true},wings:{'wing:none':true},necks:{'🎀':true},hands:{'🎈':true}};
original.petLook={base:'🐶',wing:'wing:none',neck:'🎀',hand:'🎈'};
original.petExtrasMigrated={at:11};
state.users[e.nicknameKey('친구닉')]=original;
// Another session independently bought an extra item before binding.
state.users['desktop']={coins:200,owned:{},look:{},petOwned:{necks:{'🔔':true},hands:{'🧸':true}},petLook:{neck:'🔔',hand:'🧸'},petExtrasMigrated:{at:22}};
const joined=e.bindNickname(state,'desktop','친구닉',catalog);
assert.equal(joined.petOwned.necks['🎀'],true);
assert.equal(joined.petOwned.necks['🔔'],true);
assert.equal(joined.petOwned.hands['🎈'],true);
assert.equal(joined.petOwned.hands['🧸'],true);
assert.equal(joined.petLook.neck,'🎀','keep currently selected outfit on nickname wallet');
assert.equal(joined.petLook.hand,'🎈');
assert.equal(joined.coins,200,'do not duplicate coin balances');
assert.equal(e.bindNickname(state,'desktop','친구닉',catalog).coins,200);
assert.deepEqual(e.mutateWallet(state,'phone',catalog).petOwned.necks,joined.petOwned.necks);
console.log('Pet neck/hand nickname migration and equip state: PASS');
