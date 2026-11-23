/* The original todayword coin / slot / roulette UI and odds, adapted for the Word-Race wallet.
   Virtual coins only. Browser RNG and client-submitted payouts are not fraud-resistant. */
(()=>{'use strict';
const $=id=>document.getElementById(id);
const SYMBOLS=['🍒','🍋','🔔','⭐','7️⃣'];
const ROULETTE=[{mult:0,weight:43,label:'💥 꽝'},{mult:.5,weight:20,label:'😅 ×0.5'},{mult:1.5,weight:20,label:'🙂 ×1.5'},{mult:2,weight:11,label:'😄 ×2'},{mult:5,weight:5,label:'🤩 ×5'},{mult:10,weight:1,label:'🎉 ×10 JACKPOT'}];
const rand=()=>{const x=new Uint32Array(1);crypto.getRandomValues(x);return x[0]/4294967296};
const sample=a=>a[Math.floor(rand()*a.length)];
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
let instance=0;
async function open(eco,modal){
 if(!eco)return alert('지갑 연결 후 이용해 주세요.');
 let wallet;try{wallet=await eco.action('wrWallet')}catch(e){return alert(e.message)}
 const token=++instance;
 let coins=Number(wallet.coins)||0,game='coin',bet=50,busy=false,history=[];
 const body=`<div class="wr-casino" id="wrCasino"><p class="wc-muted">오늘의단어 방식의 게임 코인 전용 미니게임 · 실제 돈/환전 불가</p><div class="wc-balance"><span class="wc-muted">내 코인</span><strong id="wcCoins"></strong></div><div class="wc-tabs" id="wcTabs"></div><div><div class="wc-muted" style="margin-bottom:6px">배팅 금액</div><div class="wc-chips" id="wcChips"></div><input id="wcBet" aria-label="배팅 금액" type="number" min="10" step="10" inputmode="numeric"></div><div class="wc-stage" id="wcStage"></div><div id="wcResult" class="wc-result" role="status" aria-live="polite"></div><div id="wcPayout" class="wc-payout"></div><div id="wcLog" class="wc-log"></div><div class="wc-muted">무료 Firebase 구조에서는 결과 조작을 완전히 방지할 수 없습니다. 친구끼리 사용하는 가상 코인 전용입니다.</div></div>`;
 modal('🎰 코인 도박장',body);
 const alive=()=>token===instance&&!!$('wrCasino')&&$('wrCasino').isConnected;
 const update=()=>{if(!alive())return;$('wcCoins').textContent='🪙 '+coins.toLocaleString('ko-KR');const badge=$('wrCoins');if(badge)badge.textContent='🪙 '+coins+' 코인';$('wcLog').innerHTML=history.map(s=>`<div>${s}</div>`).join('')};
 const wager=()=>{const n=Number($('wcBet')?.value);return Number.isSafeInteger(n)&&n>=10&&n<=5000?n:null};
 const disable=v=>{if(!alive())return;$('wrCasino').querySelectorAll('button,input').forEach(el=>el.disabled=v)};
 const play=async(mult,label)=>{
   const stake=wager();if(stake===null)return alert('10~5,000코인 사이에서 배팅해 주세요.');
   if(stake>coins)return alert('보유 코인이 부족해요.');
   try{const updated=await eco.action('wrArcade',{stake,rate:mult,game});coins=Number(updated.coins)||0;
    const net=Math.floor(stake*mult)-stake;history.unshift(`${label} → ${net>0?'+':''}${net}코인`);history=history.slice(0,6);
    if(alive()){$('wcResult').textContent=net>0?`🎉 +${net}코인 획득!`:net===0?'😐 본전이에요!':`😢 ${net}코인...`;$('wcResult').className='wc-result '+(net>0?'win':net<0?'lose':'');}update();
   }catch(e){if(alive())$('wcResult').textContent='처리 실패: '+e.message;}
 };
 const render=()=>{
 if(!alive())return;
 $('wcTabs').innerHTML=[['coin','🪙 동전'],['slot','🎰 슬롯'],['roulette','🎡 룰렛']].map(([id,label])=>`<button data-mode="${id}" class="${game===id?'active':''}">${label}</button>`).join('');
 $('wcChips').innerHTML=[10,50,100,500,'all'].map(v=>`<button data-bet="${v}">${v==='all'?'올인':v}</button>`).join('');
 $('wcBet').value=Math.min(bet,5000);
 $('wcStage').innerHTML=game==='coin'?'<div id="wcFace" class="wc-face">🪙</div><div class="wc-choices"><button data-pick="h">🙂 앞면</button><button data-pick="t">🌙 뒷면</button></div>':game==='slot'?'<div class="wc-reels"><span id="wcReel0">🎰</span><span id="wcReel1">🎰</span><span id="wcReel2">🎰</span></div><button class="wc-play" id="wcStart">🎰 레버 당기기</button>':'<div id="wcFace" class="wc-face">🎡</div><button class="wc-play roulette" id="wcStart">🎡 룰렛 돌리기</button>';
 $('wcPayout').innerHTML=game==='coin'?'앞/뒤를 맞히면 <b>1.9배</b> (확률 50%)':game==='slot'?'7️⃣7️⃣7️⃣ ×25 · 같은 그림 3개 ×9 · 2개 일치 ×1 · 전부 다르면 꽝':ROULETTE.map(r=>`${r.label} (${r.weight}%)`).join(' · ');
 $('wcResult').textContent='';
 $('wcTabs').querySelectorAll('button').forEach(btn=>btn.onclick=()=>{if(busy)return;game=btn.dataset.mode;render()});
 $('wcChips').querySelectorAll('button').forEach(btn=>btn.onclick=()=>{if(busy)return;const val=btn.dataset.bet;bet=val==='all'?Math.min(coins,5000):Number(val);$('wcBet').value=bet});
 if(game==='coin')$('wcStage').querySelectorAll('[data-pick]').forEach(btn=>btn.onclick=()=>spinCoin(btn.dataset.pick));
 else $('wcStart').onclick=()=>game==='slot'?spinSlot():spinRoulette();
 update();
 };
 const run=async(animation,result,label)=>{if(busy||!alive())return;const stake=wager();if(stake===null||stake>coins){alert('배팅 금액을 확인해 주세요.');return}busy=true;disable(true);try{await animation();if(alive())await play(result,label)}finally{busy=false;if(alive())disable(false)}};
 const spinCoin=pick=>{const landed=rand()<.5?'h':'t';return run(async()=>{for(let i=0;i<12&&alive();i++){if($('wcFace'))$('wcFace').textContent=i%2?'🙂':'🌙';await sleep(85)}if(alive())$('wcFace').textContent=landed==='h'?'🙂':'🌙'},landed===pick?1.9:0,`동전 ${landed==='h'?'앞':'뒤'}`)};
 const spinSlot=()=>{const out=Array.from({length:3},()=>sample(SYMBOLS));let rate=0;if(out.every(x=>x==='7️⃣'))rate=25;else if(out.every(x=>x===out[0]))rate=9;else if(new Set(out).size===2)rate=1;
 return run(async()=>{for(let k=0;k<12&&alive();k++){for(let i=0;i<3;i++){const el=$('wcReel'+i);if(el)el.textContent=sample(SYMBOLS)}await sleep(80)}if(alive())out.forEach((sym,i)=>{$('wcReel'+i).textContent=sym})},rate,`슬롯 ${out.join(' ')}`)};
 const spinRoulette=()=>{let x=rand()*100,chosen=ROULETTE.at(-1);for(const r of ROULETTE){x-=r.weight;if(x<0){chosen=r;break}}return run(async()=>{for(let i=0;i<15&&alive();i++){if($('wcFace'))$('wcFace').textContent=['🎡','💥','⭐','🎉'][i%4];await sleep(70)}if(alive())$('wcFace').textContent=chosen.label},chosen.mult,`룰렛 ${chosen.label}`)};
 render();
}
window.WordRaceCasino={open};
})();
