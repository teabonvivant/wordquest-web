/* ===== p40 part 4: render hooks, learn-screen pass, click handlers, window.WQP40 ===== */
 function learnWhy(){
  const s=db.session,it=currentItem(),w=$('#p40-why');if(!s||!it||!w)return;
  const b=$('#submit-answer'),h=$('[data-act="show-help"]');
  let r='';
  if(b&&b.disabled&&!s.feedback){
   const choice=CHOICE.includes(it.type),value=choice?s.selected:(s.answer||'').trim();
   const needAudio=LISTEN.includes(it.type)&&!s.played&&!audioOptional(it);
   r=!value?(choice?'先選一個答案，再按「檢查答案」。':'先輸入答案，再按「檢查答案」。'):needAudio?'先按「聽讀音」聽一次，再按「檢查答案」。':'';
  }
  if(!r&&h&&h.disabled&&!s.feedback)r='提示都看完了。再試試看。';
  // The line stays on screen while the question is open (its text changes), so the buttons never jump when the first letter is typed.
  if(!r&&!s.feedback)r=CHOICE.includes(it.type)?'選好了，就按「檢查答案」。':'寫好了，就按「檢查答案」。';
  w.textContent=r;w.hidden=!!s.feedback;
 }
 function afterLearn(){
  const s=db.session,it=currentItem(),w=currentWord(),root=$('.task-shell');
  const guideLine=$('.wq32-guide .wq32-line');
  if($('.p40-finish')){
   if(guideLine)guideLine.textContent='今天練完了，辛苦了。';
   $$('.wq32-wallet-note').forEach(x=>{x.hidden=true;});
   return;
  }
  if(!root||!s||!it||!w)return;
  const S=pst();
  const help=$('[data-act="show-help"]');
  if(help){help.textContent='💡 看提示';help.disabled=S.hint>=HINT_MAX;help.title=help.disabled?'提示都看完了':'看一個小提示。看了提示再答對，會記成有提示時答對';}
  const sub=$('#submit-answer');if(sub)sub.textContent='檢查答案';
  const pause=$('.task-top [data-act="pause-session"]');if(pause){pause.textContent='暫停';pause.title='暫停，下次再繼續';pause.setAttribute('aria-label','暫停（先存好，回到首頁）');}
  if(!$('#p40-why')){const p=mk('p','p40-why');p.id='p40-why';p.setAttribute('role','status');root.append(p);}
  // choice questions: tried options stay greyed, hints take away wrong options
  if(CHOICE.includes(it.type)&&!s.feedback){
   const exp=expectedOf(it,w),opts=$$('.task-card .option,.task-card .letter-pick');
   opts.forEach(b=>{if(S.wrong.includes(b.dataset.value)){b.disabled=true;b.classList.add('p40-nope');b.setAttribute('aria-label',b.textContent+'，不是這個');}});
   let take=S.hint;for(const b of opts){if(take<=0)break;if(b.dataset.value!==exp&&!S.wrong.includes(b.dataset.value)){b.hidden=true;take--;}}
  }
  // after a wrong answer the child edits the same answer
  if(!s.feedback&&S.tries>0&&TYPED.includes(it.type)){const a=$('#answer'),key=it.id+':'+S.tries;if(a&&afterLearn.k!==key){afterLearn.k=key;try{a.focus({preventScroll:true});a.select();}catch(_){}}}
  if(S.hint>0&&afterLearn.hk!==it.id+':'+S.hint){afterLearn.hk=it.id+':'+S.hint;$('#p40-hint')?.scrollIntoView({block:'nearest'});}
  // the earlier layers append their own technical notes to the feedback box; the box already says it in plain words
  $$('.feedback>p.small.muted').forEach(p=>p.remove());
  if(guideLine){
   guideLine.textContent=s.feedback?(s.feedback.correct?'做得好。':'先記住答案，下次再試。'):S.tries>0?'再試一次，你可以的。':(S.hint>0||S.copy)?'看了提示也沒關係，答對就好。':it.type==='study'?'先看圖和中文，再聽讀音，留意拼法。':'慢慢想。不會的話，可以按「看提示」。';
  }
  learnWhy();
 }
 const priorSync=syncSubmit;
 syncSubmit=function(){priorSync.apply(this,arguments);guard(learnWhy);};

 // ---------------------------------------------------------------- render hook -------------------------------------------------
 const priorRender=render;
 render=function(){
  const prev=lastRoute,rt=route();
  if(prev==='range-new'&&rt!=='range-new'){
   guard(()=>{if(ocrBusy)ocrInterrupted=true;saveDraft(true);});
  }
  const out=priorRender.apply(this,arguments);
  guard(()=>{
   const now=lastRoute;
   if(now!=='ranges')landing=null;
   if(now==='range-new')P40.afterRangeNew(prev!=='range-new');
   if(now==='ranges'&&landing&&$('#range-detail'))viewRange(landing.rid);
   if(now==='learn')afterLearn();
   gateText();
  });
  return out;
 };

 // ---------------------------------------------------------------- clicks -----------------------------------------------------
 document.addEventListener('click',e=>{
  const b=e.target.closest&&e.target.closest('[data-p40]');if(!b||b.disabled)return;
  const a=b.dataset.p40;
  guard(()=>{
   if(a==='step')goStep(Number(b.dataset.step));
   else if(a==='copy')startCopy();
   else if(a==='again')practiceAgain();
   else if(a==='discard')discardDraft();
   else if(a==='start-kid')startKid();
   else if(a==='rename-save')renameSave(b.dataset.id);
   else if(a==='practice-weak'){v23ParentUntil=0;practiceWeak();}
  });
 });
 window.WQP40=Object.freeze(P40);
