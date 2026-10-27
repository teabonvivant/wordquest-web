/* R3.28 s90 - answer feedback on the legacy teaching pages (默書星 / 英文課堂 / 字詞工房), same standard as the level engine:
   wrong = red + x, right = green + tick, a short headline (答對了 / 再想想), the wrong sound on every wrong try, and the feedback
   scrolled into view. The old pages are baked into the base text, so this layer annotates their DOM after each render
   (idempotent: a data-s90 flag per node) instead of editing r35_src / r3_src, which are no longer rebuilt. */
(function(){
 const q$=(s,r)=>(r||document).querySelector(s), q$$=(s,r)=>[...(r||document).querySelectorAll(s)];

 /* ---- shared helpers for other pages (the maths course reaches the app sound through this global) ---- */
 globalThis.WQAnswerSfx=function(ok){try{playSfx(ok?'correct':'wrong');}catch(_){}};

 /* ---- the default 默書星 retry plays the soft 'pop'; a wrong try must sound like a wrong answer ---- */
 let inSubmit=0,popSeen=false;
 const sfxPrior=playSfx;
 playSfx=function(name){if(name==='pop'&&inSubmit){popSeen=true;return;}return sfxPrior.apply(this,arguments);};
 const submitPrior=submitAnswer;
 submitAnswer=function(){
  inSubmit++;popSeen=false;
  try{return submitPrior.apply(this,arguments);}
  finally{inSubmit--;if(popSeen){popSeen=false;playSfx('wrong');}}
 };

 /* ---- keep a node clear of the bar on top and of the sticky action bar / nav at the bottom ---- */
 function reveal(el){
  if(!el||!el.isConnected)return;
  let sc=el.parentElement;
  while(sc&&sc!==document.body&&sc!==document.documentElement){const cs=getComputedStyle(sc);if(/(auto|scroll)/.test(cs.overflowY)&&sc.scrollHeight>sc.clientHeight+2)break;sc=sc.parentElement;}
  const r=el.getBoundingClientRect();let top=0,bottom=innerHeight;
  for(const sel of ['.r37-nav','.task-actions','.l30-quizactions','.l31-actions']){
   const n=q$(sel);if(!n)continue;const pos=getComputedStyle(n).position;
   if(pos==='fixed'||pos==='sticky'){const t=n.getBoundingClientRect().top;if(t>innerHeight/3)bottom=Math.min(bottom,t);}
  }
  const bar=q$('.r37-leg>.r37-bar');if(bar)top=Math.max(top,bar.getBoundingClientRect().bottom);
  let dy=0;
  if(r.height>bottom-top-16||r.top<top+8)dy=r.top-(top+10);
  else if(r.bottom>bottom-10)dy=r.bottom-(bottom-10);
  if(Math.abs(dy)<2)return;
  if(sc&&sc!==document.body&&sc!==document.documentElement)sc.scrollTop+=dy;else window.scrollBy(0,dy);
 }

 /* ---- 默書星 (句子 / 補練錯題 / daily practice) ---- */
 function fixDictation(){
  const sh=q$('#app .task-shell');if(!sh||!db.session)return;
  const f=db.session.feedback;let target=null;
  const enc=q$('.p40-encourage',sh);
  if(enc&&!enc.dataset.s90){enc.dataset.s90='1';const t=enc.textContent.trim();enc.innerHTML='<div class="s90-head no">再想想</div>'+esc(t);target=enc;}
  const fb=q$('.p40-fb',sh);
  if(fb&&!fb.dataset.s90){
   fb.dataset.s90='1';const bad=fb.classList.contains('bad'),st=q$('strong',fb),ic=fb.firstElementChild;
   if(ic&&ic.tagName==='SPAN')ic.hidden=true;
   if(st){
    st.classList.add('s90-head',bad?'no':'ok');
    if(bad){const t=st.textContent.trim();st.textContent=t==='先記住這個答案。'?'再想想，答案是：':'再想想。'+t;}
   }
   target=st||fb;
  }
  if(f){
   const exp=String(f.expected??''),val=String(f.value??'');
   for(const b of q$$('.option[data-value]',sh)){
    b.classList.remove('s90-right','s90-wrong');
    if(b.dataset.value===exp)b.classList.add('s90-right');
    else if(!f.correct&&b.dataset.value===val)b.classList.add('s90-wrong');
   }
  }
  if(target)reveal(target);
 }

 /* ---- 英文課堂 考考你 (l30) ---- */
 function fixClassroom(){
  const fbEl=q$('#app .l30-quiz .l30-feedback');if(!fbEl||fbEl.dataset.s90)return;
  fbEl.dataset.s90='1';
  const st=q$('strong',fbEl),txt=st?st.textContent.trim():'';
  const bad=fbEl.classList.contains('try')&&/^正確答案是/.test(txt),ok=!fbEl.classList.contains('try')&&/^答對/.test(txt);
  if(!bad&&!ok)return;
  fbEl.classList.add(bad?'s90-no':'s90-ok');
  st.classList.add('s90-head',bad?'no':'ok');
  if(bad)st.insertAdjacentText('afterbegin','再想想，');
  const inp=q$('#app .l30-quiz #l30-answer');if(inp)inp.classList.add(bad?'s90-fieldno':'s90-fieldok');
  reveal(fbEl);
 }

 /* ---- 字詞工房 (l31) ---- */
 function fixAssembly(){
  const fbEl=q$('#app .l31-lesson .l31-feedback');if(!fbEl||fbEl.dataset.s90)return;
  const s=l31Session();if(!s||!s.feedback)return;const q=s.queue[s.index];if(!q||q.step==='notice')return;
  fbEl.dataset.s90='1';const f=s.feedback,ok=f.correct===true,st=q$('strong',fbEl),ps=q$$('p',fbEl);
  fbEl.classList.add(ok?'s90-ok':'s90-no');
  if(st){
   st.classList.add('s90-head',ok?'ok':'no');
   if(ok)st.textContent='答對了！';
   else st.innerHTML='再想想，答案是 <b lang="en">'+esc(f.expected)+'</b>';
  }
  if(!ok){
   if(ps[0])ps[0].textContent='先看清楚，照著輸入一次，就可以繼續。';
   if(ps[1]&&/正確答案/.test(ps[1].textContent))ps[1].hidden=true;
  }
  if(q.step==='meaning'){
   for(const b of q$$('#app .l31-lesson [data-l31=choice]')){
    b.classList.remove('s90-right','s90-wrong');
    if(b.dataset.value===f.expected)b.classList.add('s90-right');
    else if(!ok&&b.dataset.value===s.draft)b.classList.add('s90-wrong');
   }
  }else if(q.step==='assemble'){const z=q$('#app .l31-lesson .l31-dropzone');if(z)z.classList.add(ok?'s90-ok':'s90-no');}
  else if(q.step==='recall'){const i=q$('#app .l31-lesson #l31-answer');if(i)i.classList.add(ok?'s90-ok':'s90-no');}
  reveal(fbEl);
 }

 function annotate(){
  try{fixDictation();}catch(e){}
  try{fixClassroom();}catch(e){}
  try{fixAssembly();}catch(e){}
 }
 window.s90Annotate=annotate;
 const app=document.getElementById('app');
 if(app){
  let sched=0;
  const obs=new MutationObserver(()=>{if(sched)return;sched=requestAnimationFrame(()=>{sched=0;obs.disconnect();try{annotate();}catch(_){}obs.observe(app,{childList:true,subtree:true});});});
  obs.observe(app,{childList:true,subtree:true});
 }
})();
