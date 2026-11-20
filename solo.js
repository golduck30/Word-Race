'use strict';
const $=id=>document.getElementById(id),LIMIT={5:240,6:360,7:480,8:600};
let secret='',secretJamo='',length=5,tries=[],start=0,limit=240,ended=true,ticker=null;
const keyColors={}; const KEY_RANK={absent:1,present:2,correct:3};
const JAMO_EXPAND={'ㄲ':'ㄱㄱ','ㄸ':'ㄷㄷ','ㅃ':'ㅂㅂ','ㅆ':'ㅅㅅ','ㅉ':'ㅈㅈ','ㅐ':'ㅏㅣ','ㅒ':'ㅑㅣ','ㅔ':'ㅓㅣ','ㅖ':'ㅕㅣ','ㅘ':'ㅗㅏ','ㅙ':'ㅗㅏㅣ','ㅚ':'ㅗㅣ','ㅝ':'ㅜㅓ','ㅞ':'ㅜㅓㅣ','ㅟ':'ㅜㅣ','ㅢ':'ㅡㅣ','ㄳ':'ㄱㅅ','ㄵ':'ㄴㅈ','ㄶ':'ㄴㅎ','ㄺ':'ㄹㄱ','ㄻ':'ㄹㅁ','ㄼ':'ㄹㅂ','ㄽ':'ㄹㅅ','ㄾ':'ㄹㅌ','ㄿ':'ㄹㅍ','ㅀ':'ㄹㅎ','ㅄ':'ㅂㅅ'};
function decompose(word){return Hangul.disassemble(word).map(j=>JAMO_EXPAND[j]||j).join('')}
function grade(guess,target){const res=Array(guess.length).fill('absent'),count={};for(let i=0;i<target.length;i++){if(guess[i]===target[i])res[i]='correct';else count[target[i]]=(count[target[i]]||0)+1}for(let i=0;i<guess.length;i++){if(res[i]==='correct')continue;if(count[guess[i]]>0){res[i]='present';count[guess[i]]--}}return res}
const KEY_ROWS=['ㅂㅈㄷㄱㅅㅛㅕㅑㅐㅔ','ㅁㄴㅇㄹㅎㅗㅓㅏㅣ','ㅋㅌㅊㅍㅠㅜㅡ'];
function renderKeyboard(){
 const node=$('soloKeyboard');if(!node)return;
 node.innerHTML=KEY_ROWS.map((row,i)=>'<div class="solo-key-row">'+[...row].map(ch=>`<button type="button" class="solo-key ${keyColors[ch]||''}" data-key="${ch}" aria-label="${ch}">${ch}</button>`).join('')+(i===0?'<button type="button" class="solo-key solo-delete" data-key="Backspace" aria-label="한 글자 삭제">⌫</button>':i===2?'<button type="button" class="solo-key solo-enter" data-key="Enter">제출</button>':'')+'</div>').join('');
}
function typeKey(key){
 const input=$('soloInput');if(key==='Enter'){$('soloForm').requestSubmit();return;}
 if(ended)return;
 if(key==='Backspace'){
   const pieces=Hangul.disassemble(input.value);
   pieces.pop();input.value=Hangul.assemble(pieces);
 }else{
   const pieces=Hangul.disassemble(input.value);
   if(decompose(input.value).length>=length)return;
   pieces.push(key);input.value=Hangul.assemble(pieces);
 }
 input.dispatchEvent(new Event('input',{bubbles:true}));input.focus();
}
$('soloKeyboard').addEventListener('click',e=>{const btn=e.target.closest('[data-key]');if(btn)typeKey(btn.dataset.key)});
$('soloInput').addEventListener('input',render);
function render(){let html='';for(let row=0;row<5;row++){let guess=tries[row]?.jamo||(row===tries.length&&!ended?decompose($('soloInput').value):''),colors=tries[row]?.colors||[];html+='<div class="solo-row">';for(let i=0;i<length;i++){let ch=guess[i]||'';html+=`<span class="solo-tile ${colors[i]||(row===tries.length&&!ended&&ch?'current':'')}">${ch}</span>`}html+='</div>'} $('soloBoard').innerHTML=html}
async function fresh(){
 length=Number($('soloLength').value);limit=$('soloTime').value==='attack'?LIMIT[length]:0;ended=true;
 $('soloMessage').textContent='원본 사전을 불러오는 중…';$('soloNext').disabled=true;
 try{await ensureDictionaryForLength(length);const words=[...dictSet].filter(w=>decompose(w).length===length);if(!words.length)throw Error('사전이 비어 있습니다');secret=words[Math.floor(Math.random()*words.length)];secretJamo=decompose(secret);tries=[];ended=false;start=Date.now();$('soloMessage').textContent='게임 시작! 힌트 없이 5번 안에 맞혀보세요.';$('soloInput').value='';Object.keys(keyColors).forEach(k=>delete keyColors[k]);renderKeyboard();render();refreshClock();$('soloInput').focus()}
 catch(e){$('soloMessage').textContent='사전 로딩 오류: '+e.message}finally{$('soloNext').disabled=false}
}
function refreshClock(){if(ended||!start)return;$('soloTimer').textContent=limit?`⏱ ${Math.max(0,Math.ceil(limit-(Date.now()-start)/1000))}초 남음`:'⏱ 무제한 모드';if(limit&&Date.now()-start>=limit*1000){ended=true;$('soloMessage').textContent=`시간 종료! 정답: ${secret} · 획득 코인 0개`}}
$('soloForm').onsubmit=e=>{e.preventDefault();if(ended){$('soloMessage').textContent='새 문제 버튼을 눌러 주세요.';return}
 const word=$('soloInput').value.trim().normalize('NFC');if(!/^[가-힣]+$/.test(word)){$('soloMessage').textContent='완성된 한글 단어를 입력해 주세요.';return}
 const jamo=decompose(word);if(jamo.length!==length){$('soloMessage').textContent=`${length}자모인 단어만 입력할 수 있어요.`;return}
 if(!dictSet.has(word)){$('soloMessage').textContent='todayword 사전에 없는 단어예요.';return}
 const colors=grade(jamo,secretJamo);tries.push({jamo,colors});for(let k=0;k<jamo.length;k++){const key=jamo[k],col=colors[k];if((KEY_RANK[col]||0)>(KEY_RANK[keyColors[key]]||0))keyColors[key]=col;}$('soloInput').value='';renderKeyboard();render();if(word===secret||tries.length>=5){ended=true;$('soloMessage').textContent=word===secret?`🎉 정답! ${tries.length}회 만에 성공 · 획득 코인 0개`:`정답은 ${secret}였어요. 획득 코인 0개`}
 else $('soloMessage').textContent=`${tries.length}/5회 도전 완료. 다음 단어를 입력해 주세요.`;
};
$('soloNext').onclick=fresh;$('soloLength').onchange=fresh;$('soloTime').onchange=fresh;setInterval(refreshClock,1000);renderKeyboard();fresh();
