(()=>{
 const el=id=>document.getElementById(id),esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 let run,timer,tracking=false,starting=false;const seen={};
 function track(type){if(!tracking||!run||Date.now()-(seen[type]||0)<2000)return;seen[type]=Date.now();fetch('/api/competition/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({runId:run.id,events:[type]}),keepalive:true}).catch(()=>{});}
 document.addEventListener('visibilitychange',()=>{if(document.hidden)track('tab_hidden');});window.addEventListener('blur',()=>track('focus_lost'));document.addEventListener('paste',()=>track('paste'));document.addEventListener('copy',()=>track('copy'));
 async function send(body){const r=await fetch('/api/competition',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw Error(d.error||'Bellashuv ochilmadi.');return d;}
 const draftKey=()=> 'ziyo-competition-draft:'+run.id;
 function clearDraft(){try{sessionStorage.removeItem(draftKey());}catch{}}
 function restoreDraft(){let draft=[];try{draft=JSON.parse(sessionStorage.getItem(draftKey())||'[]');}catch{}if(!Array.isArray(draft))return;run.questions.forEach((q,i)=>{const v=draft[i];if(Number.isInteger(v)&&v>=0&&v<q.options.length){const input=document.querySelector('input[name="q'+i+'"][value="'+v+'"]');if(input)input.checked=true;}});}
 el('onlineQuiz').addEventListener('change',()=>{if(!run)return;const data=new FormData(el('onlineQuiz')),answers=run.questions.map((_,i)=>data.has('q'+i)?Number(data.get('q'+i)):null);try{sessionStorage.setItem(draftKey(),JSON.stringify(answers));}catch{}});
 async function start(){
  if(starting||tracking)return;starting=true;el('startQuiz').disabled=true;el('startQuiz').hidden=false;el('quizState').textContent='Bellashuv avtomatik ochilmoqda…';
  try{
   run=await send({action:'start'});tracking=true;clearInterval(timer);el('startQuiz').hidden=true;el('quizState').textContent='Bellashuv avtomatik boshlandi. Javoblarni belgilang.';el('onlineQuiz').hidden=false;el('finished').hidden=true;el('finishQuiz').disabled=false;
   el('quizQuestions').innerHTML=run.questions.map((q,i)=>`<fieldset style="margin:20px 0;padding:16px;border:1px solid #cbded1;border-radius:12px"><legend>${i+1}. ${esc(q.text)}</legend>${q.options.map((x,j)=>`<label style="font-weight:400"><input type="radio" name="q${i}" value="${j}" required> ${esc(x)}</label>`).join('')}</fieldset>`).join('');restoreDraft();
   function tick(){const n=Math.max(0,Math.ceil((Date.parse(run.expiresAt)-Date.now())/1000));el('time').textContent='Qolgan vaqt: '+Math.floor(n/60)+':'+String(n%60).padStart(2,'0');if(!n){tracking=false;clearInterval(timer);clearDraft();el('finishQuiz').disabled=true;el('quizState').textContent='Vaqt tugadi. Yangi bellashuvni boshlashingiz mumkin.';el('startQuiz').textContent='Yangi bellashuv';el('startQuiz').disabled=false;el('startQuiz').hidden=false;}}
   timer=setInterval(tick,1000);tick();
  }catch(e){tracking=false;el('quizState').textContent=e.message;el('startQuiz').textContent='Qayta urinish';el('startQuiz').disabled=false;el('startQuiz').hidden=false;}finally{starting=false;}
 }
 el('startQuiz').onclick=start;
 el('onlineQuiz').onsubmit=async event=>{
  event.preventDefault();if(!run||!tracking)return;el('finishQuiz').disabled=true;
  try{const f=new FormData(event.target),answers=run.questions.map((_,i)=>f.has('q'+i)?Number(f.get('q'+i)):-1);if(answers.includes(-1))throw Error('Barcha savollarga javob bering.');const d=await send({action:'finish',id:run.id,answers});tracking=false;clearInterval(timer);clearDraft();el('onlineQuiz').hidden=true;el('finished').hidden=false;el('score').textContent=d.score+' / 100 ball';el('quizState').textContent='';}catch(e){el('quizState').textContent=e.message;el('finishQuiz').disabled=false;}
 };
 start();
})();
