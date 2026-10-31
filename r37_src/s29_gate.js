/* R3.38 s29 - the arcade seal and the learning gate of the five kept games.
 * Seal: the 26 arcade games stay in the bundle but no route, tile or text leads to them. Set R37_ARC_SEALED=false to bring them back; coins, characters and saves are untouched.
 * Gate: two questions in a row with no answer stop the action until one untimed question is right. Three runs in a row with under three answers need a three-question warm-up.
 * The run count lives in localStorage by child and Hong Kong day, so a replay, a reload or quitting never clears it. */
const R37_ARC_SEALED=true;
const R38={idle:2,runs:3,warm:3,enough:3};
const r37TestOld=()=>{try{return localStorage.getItem('wq37-t-legacy')==='1';}catch(_){return false;}};
const r37ArcOpen=()=>!R37_ARC_SEALED||r37TestOld();
const R38_ARC_ROUTE=/^(game|game-settings|playground|arcade|arcade-play|gameplay)$/;
function r37ArcScrub(){
 if(r37ArcOpen())return;const app=$('#app');if(!app)return;
 app.querySelectorAll('.l30-arcade,.wq29-portal').forEach(x=>x.remove());
 app.querySelectorAll('a[href="#game-settings"]').forEach(a=>a.remove());/* R3.39: only the card; closest('section') was the whole parent page */
 app.querySelectorAll('a[href="#game"]').forEach(a=>a.setAttribute('href','#p/games'));
 const tw=document.createTreeWalker(app,NodeFilter.SHOW_TEXT);
 for(let n=tw.nextNode();n;n=tw.nextNode())if(n.nodeValue.includes('街機'))n.nodeValue=n.nodeValue.replace(/遊戲街機/g,'遊戲星').replace(/街機/g,'遊戲');
}
const r38Key=()=>r37Key()+'-gate';
function r38Load(){let s=null;try{s=JSON.parse(localStorage.getItem(r38Key())||'null');}catch(_){}if(!s||s.d!==r37Day())s={d:r37Day(),runs:0,got:0,idle:0};return s;}
function r38Save(s){try{localStorage.setItem(r38Key(),JSON.stringify(s));}catch(_){}}
function r38Ev(kind,x){
 const s=r38Load();
 if(kind==='ok'||kind==='wrong'){s.idle=0;if(++s.got>=R38.enough)s.runs=0;r38Save(s);r37Bump('ans');}
 else if(kind==='lapse'){s.idle=x&&x.typed?0:s.idle+1;r38Save(s);r37Bump('lapse');}
 else if(kind==='hint')r37Bump('hint');
 else if(kind==='fix')r37Bump('fix');
}
function r38Ask(box,o){
 const el=document.createElement('div');el.className='r38-ov';el.setAttribute('role','dialog');el.setAttribute('aria-modal','true');el.setAttribute('aria-label',o.title);
 const stop=e=>e.stopPropagation();for(const t of ['keydown','keyup','keypress','pointerdown','touchstart'])el.addEventListener(t,stop);
 const isMath=x=>x.kind==='math'||x.en==null,used=new Set();let left=o.need,cur=o.first||null;
 const pick=()=>{const c=o.pool.filter(x=>!used.has(x.q||x.en));return (c.length?c:o.pool)[Math.floor(Math.random()*(c.length||o.pool.length))];};
 const done=()=>{if(--left>0){cur=null;draw();}else{el.remove();o.onDone();}};
 function draw(){
  const it=cur=cur||pick();used.add(it.q||it.en);const math=isMath(it);
  const count=o.need>1?`<p class="r38-n">還有 ${left} 題</p>`:'';
  const head=`<h2>${esc(o.title)}</h2><p class="r38-s">${esc(o.sub)}</p>${count}`;
  if(math){
   el.innerHTML=`<div class="r38-card">${head}<p class="r38-q">${esc(it.q)}</p><form class="r38-f"><input aria-label="答案" autocomplete="off" inputmode="${it.pad==='frac'?'text':'decimal'}"><button type="submit" class="r38-go">確定</button></form><p class="r38-fb" role="status"></p><a class="r38-x" href="#p/games">離開遊戲</a></div>`;
   const inp=el.querySelector('input'),fb=el.querySelector('.r38-fb');let shown=false;
   el.querySelector('form').onsubmit=e=>{e.preventDefault();const v=inp.value.trim();if(!v)return;let ok=false;try{ok=typeof it.check==='function'?!!it.check(v):String(v)===String(it.a);}catch(_){}
    if(ok){done();return;}if(shown)return;shown=true;fb.textContent=`答案是 ${it.a}。${it.explain||''}照着輸入一次。`;inp.value='';inp.focus();};
   inp.focus({preventScroll:true});return;
  }
  const others=o.pool.filter(x=>!isMath(x)&&x.en!==it.en).sort(()=>Math.random()-.5).slice(0,2).map(x=>x.en);
  const opts=[it.en,...others].sort(()=>Math.random()-.5);
  el.innerHTML=`<div class="r38-card">${head}<p class="r38-q">${it.emoji&&it.emoji!=='🔤'?`<span aria-hidden="true">${esc(it.emoji)}</span> `:''}${esc(it.zh||'')}</p><button type="button" class="r38-say" aria-label="再聽一次">🔊 聽一聽</button><div class="r38-opts">${opts.map(w=>`<button type="button" class="r38-opt" lang="en" data-w="${esc(w)}">${esc(w)}</button>`).join('')}</div><p class="r38-fb" role="status"></p><a class="r38-x" href="#p/games">離開遊戲</a></div>`;
  el.querySelector('.r38-say').onclick=()=>{try{r37Speak(it.en);}catch(_){}};
  el.querySelectorAll('.r38-opt').forEach(b=>{b.onclick=()=>{if(b.dataset.w===it.en){done();return;}b.classList.add('no');b.disabled=true;el.querySelector('.r38-fb').textContent='再想想，也可以先聽一聽。';};});
  el.querySelector('.r38-opt').focus({preventScroll:true});
 }
 draw();box.appendChild(el);
}
function r38Idle(box,pool,it,resume){
 if(r37TestOld())return false;const s=r38Load();if(s.idle<R38.idle)return false;
 r38Ask(box,{title:'先答一題再玩',sub:'剛才沒有作答。答對就繼續，不限時間。',need:1,first:it,pool,onDone:()=>{const t=r38Load();t.idle=R38.idle-1;r38Save(t);r37Bump('gate');resume();}});
 return true;
}
function r38Run(box,pool,go){
 if(!box)return;if(r37TestOld()){go();return;}
 const s=r38Load(),start=()=>{const t=r38Load();t.runs++;t.got=0;t.idle=0;r38Save(t);go();};
 if(s.runs<R38.runs){start();return;}
 r38Ask(box,{title:'先熱身',sub:'答對三題就可以開始。',need:R38.warm,pool,onDone:()=>{const t=r38Load();t.runs=0;r38Save(t);r37Bump('gate');start();}});
}
function r38Hook(box,pool){return {onLearn:r38Ev,onIdle:(root,it,resume)=>r38Idle(root||box,pool,it,resume),onAgain:go=>r38Run(box,pool,go)};}
const r38Words=()=>r37GameWords(0,8);
