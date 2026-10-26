/* R3.31 s95 - host resolvers for WQPad: where each fill-in input finds its answer. Math pages (separate closures) use the fixed digit / operator pads in wq_pad.js. */
WQPad.fx=()=>{try{playSfx('tap');}catch(_){}};
WQPad.resolvers.push(function(inp){
 const id=inp.id,tx=/[A-Za-z]/;
 const typ=a=>/^[\d.,:\/\s-]+$/.test(String(a))?'num':'text';
 if(inp.classList.contains('r37-cell')){
  const P=r37P,q=P&&P.phase==='quiz'&&P.qs[P.i];
  return q&&q.mode==='cells'?{type:'cells',answer:q.answer,hide:q.hide,group:'.r37-cf'}:null;
 }
 if(id==='r37-in'){
  const P=r37P,q=P&&P.phase==='quiz'&&P.qs[P.i];
  return q&&q.mode==='fill'?{type:q.kind==='math'?'num':typ(q.answer),answer:String(q.answer),group:'.r37-fill'}:null;
 }
 if(id==='r80-in'){const c=r80LesCard();return c&&c.q&&c.q.answer!=null?{type:typ(c.q.answer),answer:String(c.q.answer),group:'.r80-fill'}:null;}
 if(inp.closest('.wqm,#wq-course-dialog'))return null;
 if(id==='answer'&&db&&db.session){const w=currentWord();return w?{type:inp.tagName==='TEXTAREA'?'sentence':'text',answer:w.en}:null;}
 if(id==='pc-answer'){const s=pcSession(),l=pcLesson();return s&&l&&s.mode==='quiz'?{type:'text',answer:pcExpected(s.queue[s.index],l)}:null;}
 if(id==='l30-answer'){const s=l30Session();if(!s)return null;const q=s.queue[s.index];return {type:'text',answer:q.mode==='missing'?q.missing:q.answer};}
 if(id==='l31-answer'){const s=l31Session();if(!s)return null;const r=LIB31.recipes.get(s.queue[s.index].recipe);return r?{type:'text',answer:r.form}:null;}
 if(id==='l31-correction'){const s=l31Session();return s&&s.feedback&&s.feedback.expected?{type:'text',answer:String(s.feedback.expected)}:null;}
 if(id==='pg-correction'){const e=document.querySelector('[data-wq-exposure]');return e?{type:'text',answer:e.textContent}:null;}
 if(id==='fg-answer'){const s=fgSession(),l=fgLesson();return s&&l?{type:'text',answer:s.stage==='fill'?'air':l.word}:null;}
 return null;
});
