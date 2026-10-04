/*@@UNIT@@*/
function l30UnitDone(uid){
 const d=l30Read(),rows=d.sessions.filter(s=>s.unit===uid&&s.status==='completed'&&s.mode==='lesson'&&s.queue.filter(q=>q.mode!=='study').length>=L30.QUIZ_TOTAL);
 if(!rows.length)return null;const last=rows[rows.length-1];let best=0;for(const r of rows)best=Math.max(best,L30.stars(d,r));
 return {at:last.finishedAt,stars:L30.stars(d,last),best};
}
function l30Day(ms){const t=new Date(ms);return (t.getMonth()+1)+'月'+t.getDate()+'日';}
function l30StarsHtml(n,cls=''){let h='';for(let i=0;i<5;i++)h+='<span class="q36-star'+(i<n?' on':'')+'" aria-hidden="true">★</span>';return '<span class="q36-stars '+cls+'" role="img" aria-label="'+n+' 顆星（滿分 5 顆）">'+h+'</span>';}
function l30DoneBadge(uid){
 const x=l30UnitDone(uid);if(!x)return '';
 return `<span class="q36-done"><b class="q36-tick" aria-hidden="true">✓</b><span>已學完 · ${l30Day(x.at)}</span>${l30StarsHtml(x.best,'small')}</span>`;
}
function l30Stage(s,q){
 const studyN=s.queue.filter(x=>x.mode==='study').length,graded=s.queue.length-studyN;
 if(s.mode==='lesson'){
  if(q.mode==='study')return {label:'學新詞',tag:'學新詞 '+(s.index+1)+'／'+studyN,intro:false,total:graded};
  const k=s.index-studyN+1;
  return {label:'考考你',tag:'考考你 '+k+'／'+graded,intro:studyN>0&&s.index===studyN&&!s.feedback,total:graded};
 }
 return {label:'',tag:'第 '+(s.index+1)+'／'+s.queue.length+' 題',intro:false,total:graded};
}
function l30Unit(){
 const u=LIB30.units.get(l30Params().get('id'));if(!u)return `<div class="l30-empty"><h1>找不到這個單元</h1>${l30Link('返回拼字教室','classroom','primary')}</div>`;
 const words=u.words.map(k=>LIB30.words.get(k)),chosen=l30Params().get('mode')||'lesson',drill=chosen!=='lesson'&&L30.MODES[chosen]?chosen:'',done=l30UnitDone(u.id);
 const startMode=drill==='review'?'mixed':drill||'lesson',coin=!drill||drill!=='study';
 return `<a class="l30-back" href="#classroom">← 選其他單元</a><div class="l30-topline"><div><div class="l30-eyebrow">${esc(u.track)}</div><h1>${esc(u.title)}</h1><p>${esc(u.objective)}</p>${l30DoneBadge(u.id)}</div><span class="l30-tag">${words.length} 個詞語</span></div>
 <section class="l30-panel q36-start"><h2>${drill?esc(L30.MODES[drill].title):'學習這一課'}</h2><p>${drill==='study'?'先看圖、聽讀音，認識 8 個詞。':drill?'用這一課的詞，做 8 題。':'先學 8 個詞，再做 20 題考考你。'}</p>${coin?'<p class="q36-rule"><span aria-hidden="true">★</span> 全部答對，拿 5 顆星，就有 1 枚金幣。</p>':''}<div class="l30-row">${l30Button(drill?'開始'+L30.MODES[drill].title:done?'再學一次':'開始這一課','start',`data-unit="${u.id}" data-mode="${startMode}"`,'primary')}</div></section>
 <section class="l30-panel"><h2>這課的詞語</h2><div class="l30-words">${words.map(w=>l30WordCard(w,u.id,{study:true})).join('')}</div></section>
 <details class="l30-panel"><summary>家長教學小貼士</summary><h3>學這課前要會的</h3><p>${esc(u.prerequisites)}</p><h3>小情境</h3><p>${esc(u.story)}</p><h3>容易混淆的地方</h3><p>${esc(u.note)}</p><h3>可以怎樣陪學</h3><p>${esc(u.parentGuide)}</p><h3>延伸</h3><p>${esc(u.extension)}</p></details>`;
}
/*@@END@@*/
/*@@FINISHED@@*/
function l30Finished(s){
 if(s.status==='abandoned')return `<div class="l30-empty"><h1>這組練習先停在這裏</h1><p>已答的題目有紀錄。</p>${l30Link('選另一小課','classroom','primary')}${l30Link('返回首頁','kid')}</div>`;
 const c=l30Read(),a=c.attempts.filter(x=>x.session===s.id&&x.mode!=='study'),good=a.filter(x=>x.correct===true).length,technical=a.filter(x=>x.technical).length,hinted=a.filter(x=>x.correct===true&&x.hinted).length;
 const n=L30.stars(c,s),total=s.queue.filter(q=>q.mode!=='study').length,lesson=s.mode==='lesson';
 const miss=[...new Map(a.filter(x=>x.correct!==true&&!x.technical||x.correct===true&&x.hinted).map(x=>LIB30.words.get(x.target)).filter(Boolean).map(w=>[w.id,w])).values()];
 const line=s.award?'得到 '+s.award+' 枚金幣！':n===5?'這一課今天已經得過金幣，或今天的金幣已領滿。':'拿到 5 顆星，就有金幣。';
 return `<section class="l30-quiz"><div class="l30-empty q36-result">${l30Art('panda')}<div class="l30-eyebrow">${lesson?'考考你完成了':'這一組完成了'}</div>${l30StarsHtml(n,'big')}<h1>${n===5?'全部答對！滿星':n>=3?'做得不錯':'再練一次，會更好'}</h1><p>${total} 題，答對 ${good} 題${hinted?'，其中 '+hinted+' 題用了提示':''}${technical?'，另有 '+technical+' 題待補聽':''}。</p><p class="l30-prompt">${esc(line)}</p>${miss.length?`<p class="l30-muted">要再練：${miss.map(w=>esc(w.form)).join('、')}</p>`:''}<div class="l30-row" style="justify-content:center">${n<5&&lesson?l30Button('再做一次這一課','start',`data-unit="${esc(s.unit)}" data-mode="lesson"`,'primary'):''}${l30Link('選另一課','classroom',n<5&&lesson?'':'primary')}${l30Link('去遊戲街機','game')}${l30Link('回首頁','kid')}</div></div></section>`;
}
/*@@END@@*/
