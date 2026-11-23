const assert=require('node:assert/strict');
const E=require('../addons/spark-economy.js');
const cat={categories:{hair:[{id:'free',price:0},{id:'premium',price:30}]},petBases:[{id:'🐶',price:0}],petWings:[{id:'wing:none',price:0}]};
const s={users:{},rooms:{}};
// Same browser / Firebase UID switches nickname: no money or items copied.
E.bindNickname(s,'deviceA','ㅇㅇ',cat);
E.mutateBuy(s,'deviceA',cat,'hair','premium');
assert.equal(E.mutateWallet(s,'deviceA',cat).coins,170);
const test=E.bindNickname(s,'deviceA','test',cat);
assert.equal(test.coins,200);
assert.equal(!!test.owned.hair?.premium,false);
E.mutateBuy(s,'deviceA',cat,'hair','premium');
E.mutateBuy(s,'deviceA',cat,'hair','premium');
assert.equal(E.mutateWallet(s,'deviceA',cat).coins,170);
assert.equal(E.bindNickname(s,'deviceA','ㅇㅇ',cat).coins,170);
assert.equal(E.bindNickname(s,'deviceB','ㅇㅇ',cat).coins,170);
assert.equal(E.bindNickname(s,'deviceB','test',cat).coins,170);
// Existing nickname wallets are NOT automatically cleared or rewritten.
assert.equal(s.users[E.nicknameKey('ㅇㅇ')].coins,170);
assert.equal(s.users[E.nicknameKey('test')].coins,170);
console.log('NICKNAME ISOLATION PASS');
