/* R3.14 s22 - dictation study: groups of 8 words, learn cards, then three quiz levels (choice, fill the letters, full spelling). */
const R37_DZ_LV=['✅','🧩','✍️'],R37_DZ_NAMES=['選擇','補字母','默寫'];
function r37DzData(){
 const r=latestRange();if(!r)return {rid:'',title:'',words:[],groups:[]};
 const seen=new Set(),words=rangeWords(r.id).filter(w=>w.kind!=='sentence'&&/\p{L}/u.test(String(w.en||''))&&!seen.has(norm(w.en))&&seen.add(norm(w.en)));
 const groups=[];for(let i=0;i<words.length;i+=8)groups.push(words.slice(i,i+8));
 return {rid:r.id,title:r.title||'',words,groups};
}
function r37DzQuizWords(D,g){
 const learn=D.groups[g]||[],quiz=[...learn];
 for(let k=g-1;k>=0&&quiz.length<8;k--)for(const w of D.groups[k]){if(quiz.length>=8)break;quiz.push(w);}
 return {learn,quiz};
}
function r37DzBest(rid,g){const e=((r37Get().dz||{})[rid]||{})[g]||{};return [e.l1|0,e.l2|0,e.l3|0];}
function r37DzRec(b){const i=b.findIndex(n=>n<3);return i<0?2:i;}
function r37DzMask(en){
 const ch=[...en],letters=ch.map((c,i)=>/\p{L}/u.test(c)?i:-1).filter(i=>i>=0),cand=letters.filter(i=>i>0&&ch[i-1]!==' ');
 const pool=cand.length?cand:letters,k=letters.length<=3?1:Math.max(1,Math.round(cand.length*.45));
 return new Set(r37Shuf(pool,r37Rng(r37Hash('dz2|'+norm(en)))).slice(0,Math.min(k,pool.length)));
}
function r37DzMcq(w,k,D,rng){
 const en=w.en.trim(),zh=String(w.zh||'').trim(),kind=zh?['zh2en','listen','en2zh'][k%3]:'listen',zhOpt=kind==='en2zh';
 const used=new Set([zhOpt?zh:norm(en)]),opts=[];
 const take=x=>{const v=zhOpt?String(x.zh||'').trim():String(x.en).trim();if(!v||used.has(zhOpt?v:norm(v))||(kind==='zh2en'&&String(x.zh||'').trim()===zh))return;used.add(zhOpt?v:norm(v));opts.push(v);};
 for(const x of r37Shuf(D.words.filter(x=>x!==w),rng)){if(opts.length>=3)break;take(x);}
 if(opts.length<3){
  const near=r37EnPool().filter(x=>Math.abs(x.en.length-en.length)<=2&&(!zhOpt||x.zh)).map(x=>({x,d:r37Edit(x.en,en)})).sort((a,b)=>a.d-b.d||a.x.en.localeCompare(b.x.en)).slice(0,20).map(o=>o.x);
  for(const x of r37Shuf(near,rng)){if(opts.length>=3)break;take(x);}
 }
 const answer=zhOpt?zh:en,base={mode:'mcq',kind,answer,options:r37Shuf([answer,...opts],rng),audio:en,explain:(zh?zh+' = ':'')+en,word:en,lang:zhOpt?'zh':'en',dz:{wid:w.id,lvl:1,type:kind==='listen'?'listenChoice':'meaning'}};
 if(kind==='zh2en')return Object.assign(base,{prompt:zh,emoji:r37Emoji(en)});
 if(kind==='en2zh')return Object.assign(base,{prompt:en,emoji:r37Emoji(en)});
 return Object.assign(base,{prompt:'🔊',emoji:'',autoPlay:true});
}
function r37DzCell(w,lvl){
 const en=w.en.trim(),zh=String(w.zh||'').trim();
 const q={mode:lvl===2?'cells':'fill',kind:'dz'+lvl,prompt:zh||'🔊',emoji:r37Emoji(en),word:en,answer:en,accept:[en],audio:en,autoPlay:true,noleak:true,explain:(zh?zh+' = ':'')+en,dz:{wid:w.id,lvl,type:lvl===2?'spell':'listenSpell'}};
 if(lvl===2)q.hide=[...r37DzMask(en)].sort((a,b)=>a-b);
 return q;
}
function r37DzQs(D,g,lvl,seed){
 const rng=r37Rng(r37Hash('dz|'+D.rid+'|'+g+'|'+lvl+'|'+seed));
 return r37Shuf(r37DzQuizWords(D,g).quiz,rng).map((w,k)=>lvl===1?r37DzMcq(w,k,D,rng):r37DzCell(w,lvl));
}
function r37DzStart(g,lvl,skipLearn){
 if(window.WQR3&&!WQR3.canStudy())return;
 const D=r37DzData(),learn=D.groups[g];if(!learn)return;
 lvl=lvl||r37DzRec(r37DzBest(D.rid,g))+1;
 const qs=r37DzQs(D,g,lvl,r37Mem._seed!==undefined?r37Mem._seed:(Date.now()&0xfffff));
 if(!skipLearn){try{v24Expose(learn.map(w=>w.en));}catch(_){}}
 r37P={kind:'dz',track:'dictation',diff:r37Get().diff,qs,i:0,res:[],hearts:99,maxHearts:0,shield:false,correct:0,hinted:0,phase:skipLearn?'quiz':'learn',fb:null,hintShown:false,title:'📖 第 '+(g+1)+' 組',praise:'做得好！',learn:learn.map(w=>({en:w.en.trim(),zh:String(w.zh||'').trim()})),dz:{rid:D.rid,g,lvl,n:D.groups.length}};
 r37Nav37('lp/play');
}
function r37DzRecord(q,value,ok){
 if(!isLoggedIn()||!q.dz)return;
 const w=db.words.find(x=>x.id===q.dz.wid);if(!w)return;
 try{if(q.dz.lvl===2)v24Expose([w.en]);recordAttempt(w,q.dz.type,ok,value,q.answer,'默書學習',{src:'dz',lvl:q.dz.lvl});save();}catch(_){}
}
function r37DzSave(P,stars,passed){
 const {rid,g,lvl}=P.dz;if(lvl===3&&!passed)return;
 const o=r37Get();o.dz=o.dz||{};
 const R=o.dz[rid]=o.dz[rid]||{},e=R[g]=R[g]||{};
 e['l'+lvl]=Math.max(e['l'+lvl]|0,stars);e.at=new Date().toISOString();
}
function r37DzHome(){
 const D=r37DzData(),top=r37Top('<a class="r37-back2" href="#p/dictation" aria-label="默書星">←</a>');
 if(!D.groups.length)return `<section class="r37-hub r37-dz" style="--h:340">${top}<div class="r37-gate"><div class="r37-login"><div class="r37-lk" aria-hidden="true">📝</div><b>請家長先加入默書範圍</b><a class="r37-go" href="#ranges">📝 默書範圍</a></div></div>${r37Nav('p/dictation')}</section>`;
 const cards=D.groups.map((ws,g)=>{
  const b=r37DzBest(D.rid,g),rec=r37DzRec(b);
  return `<article class="r37-dzc" data-g="${g}"><button type="button" class="r37-dzm" data-r37="dz-go" data-g="${g}" data-l="0" aria-label="第 ${g+1} 組，${ws.length} 個字"><span class="r37-dzn">${g+1}</span><span class="r37-dzp" lang="en">${ws.slice(0,3).map(w=>esc(w.en)).join(' · ')}</span></button><div class="r37-dzl">${[1,2,3].map(l=>`<button type="button" class="r37-dzb ${rec===l-1?'rec':''} ${b[l-1]>=3?'done':''}" data-r37="dz-go" data-g="${g}" data-l="${l}" data-stars="${b[l-1]}" aria-label="第 ${l} 級 ${R37_DZ_NAMES[l-1]}，${b[l-1]} 星"><span aria-hidden="true">${r37Icon(R37_DZ_LV[l-1])}</span><b>${l} ★${b[l-1]}</b></button>`).join('')}</div></article>`;
 }).join('');
 return `<section class="r37-hub r37-dz" style="--h:340">${top}<div class="r37-dzh"><span aria-hidden="true">📖</span><b>${esc(D.title)}</b><em>${D.words.length}</em></div><div class="r37-dzg">${cards}</div>${r37Nav('p/dictation')}</section>`;
}
function r37DzCellsBody(q,fb,aud){
 const ch=[...q.answer],hide=new Set(q.hide),typed=fb?[...fb.value]:[],out=[];let cur=[];
 ch.forEach((c,i)=>{
  if(c===' '){out.push(`<span class="r37-cw">${cur.join('')}</span>`);cur=[];return;}
  if(!hide.has(i)){cur.push(`<span class="r37-cl">${esc(c)}</span>`);return;}
  const t=typed[i]||'',cls=fb?(norm(t)===norm(c)?'ok':'bad'):'';
  cur.push(`<input class="r37-cell ${cls}" type="text" inputmode="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" data-ci="${i}" data-v="${esc(t)}" value="${esc(t)}" aria-label="第 ${i+1} 個字母" ${fb?'disabled':''}>`);
 });
 out.push(`<span class="r37-cw">${cur.join('')}</span>`);
 return `<div class="r37-q">${q.emoji?`<div class="r37-qe" aria-hidden="true">${q.word?r37WordArt(q.word):q.emoji}</div>`:''}<div class="r37-qt ${String(q.prompt).length>14?'long':''}">${esc(q.prompt)}</div>${aud}</div><form class="r37-fill r37-cf" data-r37-form="1"><div class="r37-cells" lang="en" style="--n:${Math.max(...q.answer.split(' ').map(x=>[...x].length))}">${out.join('')}</div><button type="submit" class="r37-ok" ${fb?'disabled':''}>確定</button></form>`;
}
function r37DzDiff(exp,got){
 const a=[...norm(exp)],b=[...norm(got)];
 if(a.length===b.length)return {a:a.map((c,i)=>c===b[i]),b:b.map((c,i)=>c===a[i])};
 const m=a.length,n=b.length,d=Array.from({length:m+1},()=>Array(n+1).fill(0));
 for(let i=m-1;i>=0;i--)for(let j=n-1;j>=0;j--)d[i][j]=a[i]===b[j]?d[i+1][j+1]+1:Math.max(d[i+1][j],d[i][j+1]);
 const ma=Array(m).fill(false),mb=Array(n).fill(false);let i=0,j=0;
 while(i<m&&j<n){if(a[i]===b[j]){ma[i]=mb[j]=true;i++;j++;}else if(d[i+1][j]>=d[i][j+1])i++;else j++;}
 return {a:ma,b:mb};
}
function r37DzMark(text,flags){
 const raw=[...text],chars=raw.length===flags.length?raw:[...norm(text)];
 return chars.map((c,i)=>c===' '?' ':`<i class="${flags[i]?'ok':'bad'}">${esc(c)}</i>`).join('');
}
function r37DzAns(q,fb){const d=r37DzDiff(q.answer,fb.value);return `<span class="r37-ans" lang="en">${r37DzMark(q.answer,d.a)}</span>`;}
function r37DzYou(q,fb){const d=r37DzDiff(q.answer,fb.value),t=norm(fb.value);return `<small class="r37-you">你寫：<span lang="en">${r37DzMark(t,d.b)}</span></small>`;}
function r37DzResult(){
 const P=r37P,r=P.result,{g,lvl,n}=P.dz,coins=r.coins?`<div class="r37-rc">🪙 +${r.coins}</div>`:'';
 const next=lvl<3?`<button type="button" class="r37-go" data-r37="dz-next" aria-label="第 ${lvl+1} 級">▶ ${r37Icon(R37_DZ_LV[lvl])}</button>`:g<n-1?`<button type="button" class="r37-go" data-r37="dz-next" aria-label="下一組">▶ 📖 ${g+2}</button>`:'';
 return `<section class="r37-play"><div class="r37-result ${r.passed?'win':'lose'}"><div class="r37-rb" aria-hidden="true">${r.passed?'🎉':'💫'}</div>${r37Stars(r.stars)}<div class="r37-rs">${r.correct}/${P.qs.length}</div>${coins}${lvl===3&&!r.passed?'<p class="r37-rn">再試一次！</p>':''}
 <div class="r37-ra">${next}<button type="button" class="r37-sec" data-r37="retry" aria-label="重做">↻</button><button type="button" class="r37-sec" data-r37="exit" aria-label="組別">🗺️</button></div></div></section>`;
}
function r37DzSubmit(){
 const P=r37P;if(!P||P.phase!=='quiz'||P.fb)return;
 const q=P.qs[P.i];if(q.mode!=='cells')return;
 const cells=[...document.querySelectorAll('.r37-cell')],empty=cells.find(c=>!c.value);
 if(empty){empty.focus();return;}
 const ch=[...q.answer];cells.forEach(c=>{ch[+c.dataset.ci]=c.value;});
 r37Answer(ch.join(''));
}
function r37DzCellInput(c,e){
 const cells=[...document.querySelectorAll('.r37-cell')],i=cells.indexOf(c),v=[...c.value].filter(x=>/\p{L}/u.test(x));
 if(!v.length){c.value=c.dataset.v||'';return;}
 if(e&&e.inputType==='insertFromPaste'&&v.length>1){v.slice(0,cells.length-i).forEach((x,k)=>{cells[i+k].value=x;cells[i+k].dataset.v=x;});const t=cells[Math.min(cells.length-1,i+v.length)];t.focus();t.select();return;}
 c.value=v[v.length-1];c.dataset.v=c.value;
 const nx=cells[i+1];if(nx){nx.focus();nx.select();}
}
function r37DzCellKey(c,e){
 const cells=[...document.querySelectorAll('.r37-cell')],i=cells.indexOf(c);
 if(e.key==='Backspace'&&!c.value&&i>0){e.preventDefault();const p=cells[i-1];p.value='';p.dataset.v='';p.focus();}
 else if(e.key==='ArrowLeft'&&i>0){e.preventDefault();cells[i-1].focus();cells[i-1].select();}
 else if(e.key==='ArrowRight'&&i<cells.length-1){e.preventDefault();cells[i+1].focus();cells[i+1].select();}
}
