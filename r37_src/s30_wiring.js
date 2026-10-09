/* R3.7 s30 - routing, events, keyboard, fps mount, navigation clean-up. */
const R37_ROUTE=/^(kid|p\/(english|math|olympiad|games|dictation|parent|chars)|lv\/(english|math|olympiad|runner)|lp\/play|fps|rn\/play)$/;
let r37FpsHandle=null,r37RunHandle=null,r37RunSel=null;
function r37RunStop(){if(r37RunHandle){try{r37RunHandle.destroy();}catch(_){}r37RunHandle=null;}}
function r37FpsStop(){if(r37FpsHandle){try{r37FpsHandle.destroy();}catch(_){}r37FpsHandle=null;}}
function r37FpsWords(){
 const diff=r37Get().diff,pool=r37EnPool(),band=r37EnBand(Math.min(4,Math.max(0,diff-1))),rng=r37Rng(r37Hash('fps|'+Date.now()));
 const src=pool.slice(band.a,band.b),withEmoji=src.filter(x=>r37Emoji(x.en)),mix=[...r37Shuf(withEmoji,rng).slice(0,5),...r37Shuf(src,rng).slice(0,12)];
 const seen=new Set();return mix.filter(x=>!seen.has(x.en)&&seen.add(x.en)).map(x=>({en:x.en,zh:x.zh,emoji:r37Emoji(x.en)||'🔤'}));
}
function r37FpsMount(){
 const box=$('#r37-fps-box');if(!box)return;r37FpsStop();
 if(!globalThis.WQ37FPS){box.innerHTML='<div class="r37-card"><h2>🎯</h2></div>';return;}
 r37FpsHandle=WQ37FPS.start(box,{words:r37FpsWords(),difficulty:r37Get().diff,rounds:10,sound:sfxEnabled(),
  onFinish:res=>{let coins=0;const d=r37Get().day;r37Bump('fps');if(res&&res.stars>=5&&(d.fc||0)<2){d.fc=(d.fc||0)+1;coins=1;r37Save();r37AddCoins(1);}return coins;},
  onExit:()=>{r37FpsStop();location.hash='#p/games';}});
}
function r37RunMount(){
 const box=$('#r37-run-box');if(!box||!r37RunSel)return;r37RunStop();
 const {w,s}=r37RunSel;if(!globalThis.WQ37Run){box.innerHTML='<div class="r37-card"><h2>🏃</h2></div>';return;}
 const diff=r37Get().diff,pool=r37EnPool(),band=r37EnBand(Math.min(4,w)),rng=r37Rng(r37Hash('run|'+Date.now())),src=pool.slice(band.a,band.b);
 const words=[...r37Shuf(src.filter(x=>r37Emoji(x.en)),rng).slice(0,6),...r37Shuf(src,rng).slice(0,14)];const seen=new Set();
 const ch=r37Char();
 r37RunHandle=WQ37Run.start(box,{words:words.filter(x=>!seen.has(x.en)&&seen.add(x.en)).map(x=>({en:x.en,zh:x.zh,emoji:r37Emoji(x.en)||''})),character:{icon:ch.icon,name:ch.name,perk:ch.perk},world:w,stage:s,difficulty:diff,sound:sfxEnabled(),
  onFinish:res=>{const o=r37Get(),k=r37LvKey('runner',w,s),old=o.lv[k]||{best:0},stars=res.stars||1;let coins=0;
   const e=o.lv[k]=Object.assign({},old,{best:Math.max(old.best||0,stars),at:new Date().toISOString()});
   if(res.passed){const first=!old.passed;e.passed=true;if(first)r37Bump('levels');if(stars===5&&!old.five){e.five=true;coins+=s===2?3:1;if(ch.perk==='coin')coins+=1;r37Bump('five');}if(first&&s===2)coins+=2;}
   r37Save();if(coins)r37AddCoins(coins);return coins;},
  onExit:()=>{r37RunStop();location.hash='#lv/runner';}});
}
function r37Layout(){
 const h=$('.header');const top=document.body.classList.contains('r37-playing')?0:(h?Math.round(h.getBoundingClientRect().bottom):0);
 document.documentElement.style.setProperty('--r37-top',Math.max(0,top)+'px');
}
const r37PriorRender=render;
render=function(){
 const route=(location.hash||'#kid').slice(1).split('?')[0];
 if(!R37_ROUTE.test(route)){
  document.body.classList.remove('r37','r37-playing');r37FpsStop();r37RunStop();
  const out=r37PriorRender.apply(this,arguments);
  try{r37FixNav();}catch(_){}
  return out;
 }
 if(route==='lp/play'&&!r37P){location.replace('#kid');return;}
 if(lastRoute&&lastRoute!==route){stopSpeech();clearTimeout(r37Timer);}
 if(route!=='fps')r37FpsStop();
 if(route!=='rn/play')r37RunStop();
 lastRoute=route;
 const c=activeChild();$('#header-child').textContent=c?.name||'未設定';$('#header-auth').textContent=isLoggedIn()?'登出':'登入';updateSfxButton();
 document.body.classList.add('r37');document.body.classList.remove('quiz-active');document.body.classList.toggle('r37-playing',route==='lp/play'||route==='fps'||route==='rn/play');
 let html='';
 if(route==='kid')html=r37Home();
 else if(route==='p/chars')html=r37Chars();
 else if(route==='p/parent'&&!isLoggedIn())html='<section class="r37-hub">'+r37Top()+'<div class="r37-gate"><div class="r37-login"><div class="r37-lk" aria-hidden="true">🔒</div><b>家長請先登入</b><a class="r37-go" href="#login">登入</a></div></div>'+r37Nav('p/parent')+'</section>';
 else if(route==='p/parent'&&!v23ParentAllowed())html='<section class="r37-hub">'+r37Top()+'<div class="r37-gate">'+v23Gate()+'</div>'+r37Nav('p/parent')+'</section>';
 else if(route.startsWith('p/'))html=r37Hub(route.slice(2));
 else if(route==='lv/runner')html=r37RunMap();
 else if(route.startsWith('lv/'))html=r37LevelMap(route.slice(3));
 else if(route==='rn/play')html=r37RunSel?'<section class="r37-fps"><div id="r37-run-box"></div></section>':(location.replace('#lv/runner'),'');
 else if(route==='lp/play')html=r37Play();
 else if(route==='fps')html='<section class="r37-fps"><div id="r37-fps-box"></div></section>';
 $('#app').innerHTML=html;
 r37Layout();
 if(route==='fps')r37FpsMount();
 if(route==='rn/play')r37RunMount();
 if(route==='lp/play'&&r37P&&r37P.phase==='quiz'&&!r37P.fb){
  const q=r37P.qs[r37P.i];
  if(q.mode==='fill'){const el=$('#r37-in');if(el)el.focus({preventScroll:true});}
  if(q.autoPlay&&q.audio)r37Speak(q.audio);
 }
 showSaveIssue();
};
function r37FixNav(){
 const nav=$('#wq29-nav');if(!nav)return;
 const map={'#practice':'#p/english','#game':'#p/games','#parent':'#p/parent'};
 for(const a of nav.querySelectorAll('a')){
  if(a.dataset.wqmOpen){a.setAttribute('href','#p/'+(a.dataset.wqmOpen==='olympiad'?'olympiad':'math'));delete a.dataset.wqmOpen;}
  else if(map[a.getAttribute('href')])a.setAttribute('href',map[a.getAttribute('href')]);
  const t=a.textContent.trim();if(t==='練習')a.textContent='英文';else if(t==='首頁')a.textContent='星系';
 }
}
document.addEventListener('click',e=>{
 const el=e.target.closest?.('[data-r37]');if(!el)return;
 const a=el.dataset.r37,P=r37P;
 if(a==='level')r37StartLevel(el.dataset.track,+el.dataset.w,+el.dataset.s);
 else if(a==='quiz')r37StartQuiz(el.dataset.track,el.dataset.mode);
 else if(a==='run'){r37RunSel={w:+el.dataset.w,s:+el.dataset.s};location.hash='#rn/play';}
 else if(a==='rworld'){r37Mem._rw=+el.dataset.w;render();}
 else if(a==='world'){(r37Mem._w=r37Mem._w||{})[el.dataset.track]=+el.dataset.w;render();}
 else if(a==='learn-go'&&P){P.phase='quiz';render();}
 else if(a==='pick-opt'&&P)r37Answer(el.dataset.v);
 else if(a==='next')r37Next();
 else if(a==='hint'&&P){P.hintShown=true;render();}
 else if(a==='speak')r37Speak(el.dataset.t);
 else if(a==='exit')r37Exit();
 else if(a==='retry'&&P){if(P.kind==='level')r37StartLevel(P.track,P.w,P.s);else r37StartQuiz(P.track,P.mode);}
 else if(a==='level-next'&&P){let w=P.w,s=P.s+1;if(s>9){w++;s=0;}r37StartLevel(P.track,w,s);}
 else if(a==='diff'){if(isLoggedIn()&&!v23ParentAllowed()){render();return;}r37Get().diff=+el.dataset.n;r37Save();render();}
 else if(a==='ptab'){r37Mem._ptab=el.dataset.k;render();}
 else if(a==='chars')location.hash='#p/chars';
 else if(a==='pick'){const o=r37Get();if(o.chars.includes(el.dataset.id)){o.pick=el.dataset.id;r37Save();render();}}
 else if(a==='buy'){const o=r37Get(),ch=R37_CHARS.find(x=>x.id===el.dataset.id),c=activeChild();if(ch&&c&&isLoggedIn()&&!o.chars.includes(ch.id)&&c.stars>=ch.cost){c.stars-=ch.cost;if(save()){o.chars.push(ch.id);o.pick=ch.id;r37Save();playSfx('correct');}else c.stars+=ch.cost;render();}}
 else if(a==='claim'){const m=R37_MISSIONS.find(x=>x.id===el.dataset.id),d=r37Get().day;if(m&&!d.claimed.includes(m.id)&&(d[m.key]||0)>=m.goal){d.claimed.push(m.id);r37Save();r37AddCoins(m.coins);playSfx('correct');render();}}
});
document.addEventListener('submit',e=>{
 if(!e.target.closest?.('[data-r37-form]'))return;e.preventDefault();
 const el=$('#r37-in');if(el)r37Answer(el.value);
});
document.addEventListener('keydown',e=>{
 const P=r37P;if(!P||lastRoute!=='lp/play'||e.ctrlKey||e.metaKey||e.altKey)return;
 if(e.key==='Escape'){r37Exit();return;}
 if(P.phase==='learn'&&(e.key==='Enter'||e.key===' ')){e.preventDefault();P.phase='quiz';render();return;}
 if(P.phase==='result'){if(e.key==='Enter')$('[data-r37="level-next"],[data-r37="retry"]')?.click();return;}
 if(P.phase!=='quiz')return;
 if(P.fb){if(e.key==='Enter'||e.key===' '){e.preventDefault();r37Next();}return;}
 const q=P.qs[P.i],typing=document.activeElement&&document.activeElement.id==='r37-in';
 if(q.mode==='mcq'&&/^[1-9]$/.test(e.key)){const o=q.options[+e.key-1];if(o!==undefined){e.preventDefault();r37Answer(o);}}
 else if(!typing&&(e.key==='h'||e.key==='H')&&R37_DIFF[P.diff-1].hint&&q.hint){P.hintShown=true;render();}
});
window.addEventListener('resize',()=>{try{r37Layout();}catch(_){}});
