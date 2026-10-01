 function companion(){
  if(!root.WQM_INTEGRATED||!root.WQ32?.mathHTML)return '';
  const s=current(),q=currentQ(),sk=skill()||(q?L.skills.get(q.skill):null);
  const unit=String(sk?.unit||sk?.id||q?.skill||'');
  return root.WQ32.mathHTML({view,grade:store.profile.grade,mode:s?.mode||'',track:s?.track||(view==='olympiad'||view==='cards'?'olympiad':'normal'),rest:awaitingBreak,completed:!!s?.completed,feedback:s?.feedback?(s.feedback.correct?'correct':'retry'):'',hinted:!!s?.hint,exploring:view==='lesson'&&(s?.stage===1||ui.toolOpen),visual:/(^[1-6][MSD])|fraction|segments|angle|chart|solid/.test(unit+' '+(sk?.tool||'')),earlyNumber:!!sk&&sk.grade<=2&&/^[12]N/.test(unit),busy:view==='lesson'&&!s?.feedback&&!!q});
 }
 // Patch only the companion's DOM; never rerender the question or save study state.
 function refreshForestOnly(){
  if(!app||!store)return;const slot=app.querySelector('#forest-math-slot');if(!slot)return;
  const open=slot.querySelector('[data-forest-options]')?.getAttribute('aria-expanded')==='true';
  const focused=shadow.activeElement,focusKey=slot.contains(focused)?focused?.dataset?.forestPref:null,focusOptions=slot.contains(focused)&&focused?.hasAttribute('data-forest-options');
  slot.innerHTML=companion();
  if(open){const panel=slot.querySelector('.forest-options'),button=slot.querySelector('[data-forest-options]');if(panel)panel.hidden=false;button?.setAttribute('aria-expanded','true');}
  if(focusKey)slot.querySelector('[data-forest-pref="'+focusKey+'"]')?.focus({preventScroll:true});else if(focusOptions)slot.querySelector('[data-forest-options]')?.focus({preventScroll:true});
 }
