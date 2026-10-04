/* R3.6 q30 - one rule for every flow: 5 stars (every question right on your own, no hint) pays 1 coin, nothing less does. */
function q36Stars(good,total){return total>0?L30.starRule(good,total):1;}
function q36Block(good,total,hinted,rule=true){
 const n=q36Stars(good,total);
 return `<div class="q36-resultline">${l30StarsHtml(n,'big')}<p class="q36-count">答對 ${good} ／ ${total} 題${hinted?'，有 '+hinted+' 題用了提示':''}</p>${rule&&n<5?'<p class="q36-rule2">滿 5 顆星，才有金幣。</p>':''}</div>`;
}
function q36SessionStars(s){
 const items=s.queue.filter(q=>q.type!=='study'),hints=new Set((pgChild().hints)||[]);
 const recs=db.attempts.filter(a=>a.childId===s.childId&&a.time>=s.startedAt&&a.correct!==null&&!a.technical);
 const used=new Set();let good=0,hinted=0;
 for(const q of items){
  const a=recs.find(x=>!used.has(x.id)&&x.wordId===q.wordId&&x.type===q.type);if(!a)continue;used.add(a.id);
  if(a.correct&&!hints.has(q.id))good++;else if(a.correct)hinted++;
 }
 return {good,total:items.length,hinted,stars:q36Stars(good,items.length)};
}
function q36SessionBlock(s){if(!isLoggedIn()||!s)return '';const r=q36SessionStars(s);return q36Block(r.good,r.total,r.hinted);}
function q36L31Stars(c,s){
 const rows=c.events.filter(e=>e.session===s.id&&e.step!=='notice');
 const good=rows.filter(e=>e.correct&&!e.hinted).length,hinted=rows.filter(e=>e.correct&&e.hinted).length;
 return {good,total:rows.length,hinted,stars:q36Stars(good,rows.length)};
}
function q36L31Block(s){const r=q36L31Stars(l31Read(),s);return s.status==='completed'?q36Block(r.good,r.total,r.hinted):'';}
function q36FamilyStars(s){
 const first=new Map();for(const a of fgStore().attempts)if(a.sessionId===s.id&&a.stage==='recall'&&!first.has(a.word))first.set(a.word,a);
 let good=0,hinted=0;for(const a of first.values()){if(a.correct&&!a.hinted)good++;else if(a.correct)hinted++;}
 return {good,total:first.size,hinted,stars:q36Stars(good,first.size)};
}
function q36FamilyBlock(s){if(!isLoggedIn()||!s)return '';const r=q36FamilyStars(s);return q36Block(r.good,r.total,r.hinted);}
function q36PhonicsBlock(r){return r.pending?'':q36Block(r.score,5,0,false);}
