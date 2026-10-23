/* R3.7 s30 - routing, events, keyboard, fps mount, navigation clean-up. */
const R37_ROUTE=/^(kid|p\/(english|math|olympiad|games|dictation|parent|chars)|lv\/(english|math|olympiad|runner|fps|td|mz|cd)|lp\/play|dz|fps|fp\/play|rn\/play|g3\/play|oly(?:\/[\w\/-]+)?)$/;
let r37FpsHandle=null,r37RunHandle=null,r37RunSel=null,r37FpsSel=null,r37G3Handle=null,r37G3Sel=null;
function r37G3Stop(){if(r37G3Handle){try{r37G3Handle.destroy();}catch(_){}r37G3Handle=null;}}
function r37RunStop(){if(r37RunHandle){try{r37RunHandle.destroy();}catch(_){}r37RunHandle=null;}}
function r37FpsStop(){if(r37FpsHandle){try{r37FpsHandle.destroy();}catch(_){}r37FpsHandle=null;}}
function r37GameWords(w0,n){
 const W=R37_TRACKS.english.worlds,rng=r37Rng(r37Hash('gw|'+Date.now())),ok=x=>/^[a-z]{2,10}$/.test(x.en),learned=[];
 for(let w=0;w<W.length;w++)for(let s=0;s<10;s++)if(r37Entry('english',w,s)?.passed)learned.push(...r37EnStage(w,s));
 let src=learned.filter(ok);if(src.length<8)src=src.concat(r37EnWorldPool(Math.min(W.length-1,w0||0)).filter(ok));
 const seen=new Set(),pick=[...r37Shuf(src.filter(x=>r37Emoji(x.en)),rng),...r37Shuf(src,rng)].filter(x=>!seen.has(x.en)&&seen.add(x.en)).slice(0,n);
 return pick.map(x=>({en:x.en,zh:x.zh,emoji:r37Emoji(x.en)||'🔤'}));
}
function r37FpsWords(){return r37GameWords(0,17);}
function r37FpsMount(){
 const box=$('#r37-fps-box');if(!box)return;r37FpsStop();
 if(!globalThis.WQ37FPS){box.innerHTML='<div class="r37-card"><h2>🎯</h2></div>';return;}
 r37FpsHandle=WQ37FPS.start(box,{words:r37FpsWords(),difficulty:r37DiffN('english'),rounds:10,sound:sfxEnabled(),
  onFinish:res=>{let coins=0;const d=r37Get().day;r37Bump('fps');if(res&&res.stars>=5&&(d.fc||0)<2){d.fc=(d.fc||0)+1;coins=1;r37Save();r37AddCoins(1);}return coins;},
  onExit:()=>{r37FpsStop();location.hash='#p/games';}});
}
function r37FpsLvMount(){
 const box=$('#r37-fps-box');if(!box||!r37FpsSel)return;r37FpsStop();
 if(!globalThis.WQ37FPS){box.innerHTML='<div class="r37-card"><h2>🎯</h2></div>';return;}
 const {w,s,from}=r37FpsSel,W=R37_TRACKS.english.worlds[w],u=typeof LIB30!=='undefined'?LIB30.units.get(r37UnitId(w,s)):null,nx=r37FpsNext(w,s);
 const opts={words:r37FpsUnitWords(w,s),syllables:r37SylText,difficulty:r37DiffN('english'),mode:'level',title:(s===9?'👹 ':'')+(W.icon||'')+' '+(u?u.title:W.name+' · '+(s+1)),sound:sfxEnabled(),
  onFinish:res=>r37FpsPay(w,s,res),
  onExit:()=>{r37FpsStop();location.hash=from||'#lv/fps';}};
 if(s===9)opts.boss=true;
 if(nx&&r37FpsOpen(nx.w,nx.s))opts.onNext=()=>{r37FpsSel={w:nx.w,s:nx.s,from:'#lv/fps'};r37Mem._fw=nx.w;r37Nav37('fp/play');};
 r37FpsHandle=WQ37FPS.start(box,opts);
}
function r37StartFps(w,s,from){
 if(!r37FpsOpen(w,s))return;
 if(r37EnStage(w,s).length<4){toast('這一關還未準備好。','bad');return;}
 r37P=null;clearTimeout(r37Timer);r37FpsSel={w,s,from:from||'#lv/fps'};r37Mem._fw=w;r37Nav37('fp/play');
}
function r37G3Start(g,subj,w,s,from){
 if(!r37G3Open(g,subj,w,s))return;
 r37P=null;clearTimeout(r37Timer);r37G3Sel={g,subj,w,s,from:from||'#lv/'+g,seed:(Date.now()&0xfffff)};r37Nav37('g3/play');
}
function r37G3Mount(){
 const box=$('#r37-g3-box'),sel=r37G3Sel;if(!box||!sel)return;r37G3Stop();
 const {g,subj,w,s,from}=sel,G=R37_G3[g],lib=globalThis[G.lib];
 if(!lib){box.innerHTML='<div class="r37-card"><h2>'+r37Icon(G.icon)+'</h2></div>';return;}
 const diff=r37DiffN(subj==='math'?'math':'english'),ch=r37Char(),W=r37G3Worlds(subj)[w],items=r37G3Items(subj,w,s,diff,sel.seed),review=r37G3Review(subj,w,s,diff,sel.seed,items);
 if(items.length<4){toast('這一關還未準備好。','bad');location.hash=from;return;}
 const nx=r37G3Next(g,subj,w,s),ut=subj==='english'&&typeof LIB30!=='undefined'?(LIB30.units.get(r37UnitId(w,s))?.title||''):'';
 const opts={subject:subj,items,review,difficulty:diff,mode:'level',sound:sfxEnabled(),assetBase:'assets/r321/',seed:sel.seed,
  title:G.name,level:{w,s,boss:s===9,title:ut||(W&&W.name)||'',icon:(W&&W.icon)||'',hue:G.hue,grade:r37G3Grade(subj,w)},
  character:{id:ch.id,icon:ch.icon,img:ch.img,name:ch.name,perk:ch.perk},syllables:r37SylText,
  regen:()=>{if(subj!=='math')return null;const sd=(Date.now()&0xfffff)+1,its=r37G3Items(subj,w,s,diff,sd);return {items:its,review:r37G3Review(subj,w,s,diff,sd,its)};},speak:t=>{try{r37Speak(t);}catch(_){}},
  onFinish:res=>r37G3Pay(g,subj,w,s,res,items),
  onExit:()=>{r37G3Stop();location.hash=from;}};
 if(nx)opts.onNext=()=>{if(!r37G3Open(g,subj,nx.w,nx.s)){r37G3Stop();location.hash=from;return;}r37G3Sel={g,subj,w:nx.w,s:nx.s,from,seed:(Date.now()&0xfffff)};(r37Mem._gw=r37Mem._gw||{})[r37G3Track(g,subj)]=nx.w;r37G3Mount();};
 r37G3Handle=lib.start(box,opts);
}
function r37RunMount(){
 const box=$('#r37-run-box');if(!box||!r37RunSel)return;r37RunStop();
 const {w,s}=r37RunSel;if(!globalThis.WQ37Run){box.innerHTML='<div class="r37-card"><h2>🏃</h2></div>';return;}
 const diff=r37DiffN('english'),ch=r37Char();
 r37RunHandle=WQ37Run.start(box,{words:r37GameWords(w,20).map(x=>Object.assign(x,{emoji:x.emoji==='🔤'?'':x.emoji})),character:{id:ch.id,icon:ch.icon,name:ch.name,perk:ch.perk},world:w,stage:s,difficulty:diff,sound:sfxEnabled(),mode:r37RunSel.endless?'endless':undefined,
  onFinish:res=>{if(r37RunSel&&r37RunSel.endless){r37Bump('fps');return 0;}const o=r37Get(),k=r37LvKey('runner',w,s),old=o.lv[k]||{best:0},stars=res.stars||1;let coins=0;
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
  document.body.classList.remove('r37','r37-playing','r37leg');document.body.classList.toggle('r37arc',/^(playground|arcade-play|gameplay)$/.test(route));r37FpsStop();r37RunStop();
  const out=r37PriorRender.apply(this,arguments);
  try{r37FixNav();}catch(_){}
  try{r37ReportExtra(route);}catch(_){}
  try{r37Wrap(route);}catch(_){}
  return out;
 }
 if(route==='lp/play'&&!r37P){location.replace('#kid');return;}
 if(lastRoute&&lastRoute!==route){stopSpeech();clearTimeout(r37Timer);}
 if(route!=='fps'&&route!=='fp/play')r37FpsStop();
 if(route!=='rn/play')r37RunStop();
 if(route!=='g3/play')r37G3Stop();
 lastRoute=route;
 const c=activeChild();$('#header-child').textContent=c?.name||'未設定';$('#header-auth').textContent=isLoggedIn()?'登出':'登入';updateSfxButton();
 document.body.classList.add('r37');document.body.classList.remove('quiz-active','r37leg','r37arc');document.body.classList.toggle('r37-playing',route==='lp/play'||route==='fps'||route==='fp/play'||route==='rn/play'||route==='g3/play'||/^oly\/[1-6]\/[1-5]\/learn$/.test(route));
 let html='';
 if(route==='kid')html=r37Home();
 else if(route==='p/chars')html=r37Chars();
 else if(route==='p/parent'&&!isLoggedIn())html='<section class="r37-hub">'+r37Top()+'<div class="r37-gate"><div class="r37-login"><div class="r37-lk" aria-hidden="true">'+r37Icon('🔒')+'</div><b>家長請先登入</b><a class="r37-go" href="#login">登入</a></div></div>'+r37Nav('p/parent')+'</section>';
 else if(route==='p/parent'&&!v23ParentAllowed())html='<section class="r37-hub">'+r37Top()+'<div class="r37-gate">'+v23Gate()+'</div>'+r37Nav('p/parent')+'</section>';
 else if(route.startsWith('p/'))html=r37Hub(route.slice(2));
 else if(route==='lv/runner')html=r37RunMap();
 else if(route==='lv/fps')html=r37FpsMap();
 else if(/^lv\/(td|mz|cd)$/.test(route))html=r37G3Map(route.slice(3));
 else if(route==='lv/olympiad'){location.replace('#oly/'+(r37Mem._og||1));return;}
 else if(route==='oly'||route.startsWith('oly/'))html=r80Html(route);
 else if(route.startsWith('lv/'))html=r37LevelMap(route.slice(3));
 else if(route==='rn/play')html=r37RunSel?'<section class="r37-fps"><div id="r37-run-box"></div></section>':(location.replace('#lv/runner'),'');
 else if(route==='dz')html=r37DzHome();
 else if(route==='lp/play')html=r37Play();
 else if(route==='fps')html='<section class="r37-fps"><div id="r37-fps-box"></div></section>';
 else if(route==='g3/play')html=r37G3Sel?'<section class="r37-fps"><div id="r37-g3-box"></div></section>':(location.replace('#p/games'),'');
 else if(route==='fp/play')html=r37FpsSel?'<section class="r37-fps"><div id="r37-fps-box"></div></section>':(location.replace('#lv/fps'),'');
 $('#app').innerHTML=html;
 r37Layout();
 if(route==='oly'||route.startsWith('oly/'))r80Mount(route);
 try{r37Sky.attach();if(route==='lp/play'&&r37P&&r37P.phase==='result'&&!r37P.fxDone){r37P.fxDone=1;r37FxResult(r37P.result);}}catch(_){}
 if(route==='fps')r37FpsMount();
 if(route==='fp/play')r37FpsLvMount();
 if(route==='rn/play')r37RunMount();
 if(route==='g3/play')r37G3Mount();
 if(route==='lp/play'&&r37P&&r37P.phase==='quiz'&&!r37P.fb){
  const q=r37P.qs[r37P.i];
  if(q.mode==='fill'){const el=$('#r37-in');if(el)el.focus({preventScroll:true});}
  if(q.mode==='cells'){const el=document.querySelector('.r37-cell');if(el)el.focus({preventScroll:true});}
  if(q.autoPlay&&q.audio)r37Speak(q.audio);
 }
 showSaveIssue();
};
const R37_LEG={english:/^(classroom|unit|library|learning|assembly|assembly-unit|assembly-learn|practice|companions)$/,dictation:/^(learn|ranges|range-new|report)$/,games:/^(game|game-settings)$/,parent:/^(parent|children|settings|learning-report|learning-plan|learning-help|assembly-report|assembly-plan|legacy-family|legacy-phonics)$/};
function r37LegPlanet(route){for(const k in R37_LEG)if(R37_LEG[k].test(route))return k;return '';}
function r37Wrap(route){
 const pl=r37LegPlanet(route),app=$('#app');if(!pl||!app||app.querySelector(':scope>.r37-leg'))return;
 if(route==='unit')r37UnitLevelBtn();
 const p=r37Planet(pl),back=route==='unit'?'#classroom':route==='assembly-unit'||route==='assembly-learn'?'#assembly':'#p/'+pl;
 for(const a of app.querySelectorAll('a.l30-back,a.wq32-btn')){const h=a.getAttribute('href');if(h==='#kid'||h==='#parent'){a.setAttribute('href','#p/'+pl);a.textContent='← '+p.name;}}
 const sec=document.createElement('section');sec.className='r37-hub r37-leg';sec.style.setProperty('--h',p.hue);sec.dataset.pl=pl;
 sec.innerHTML=`<div class="r37-bar"><a class="r37-back2" href="${back}" aria-label="返回">←</a><a class="r37-legt" href="#p/${pl}"><span aria-hidden="true">${r37Icon(p.icon)}</span>${p.name}</a>${r37Coin()}</div>`;
 const body=document.createElement('div');body.className='r37-legbody';while(app.firstChild)body.appendChild(app.firstChild);
 sec.appendChild(body);sec.insertAdjacentHTML('beforeend',r37Nav(pl==='english'||pl==='games'||pl==='parent'?'p/'+pl:''));app.appendChild(sec);
 document.body.classList.add('r37','r37leg');r37Layout();
}
new MutationObserver(()=>{if(!document.body.classList.contains('r37leg'))return;const app=$('#app');if(app&&!app.querySelector(':scope>.r37-leg')){const r=(location.hash||'#kid').slice(1).split('?')[0];try{r37Wrap(r);}catch(_){}}}).observe(document.getElementById('app')||document.body,{childList:true});
const r37L30Done=l30UnitDone;
r37ClassDone=uid=>{try{return r37L30Done(uid);}catch(_){return null;}};
l30UnitDone=function(uid){const x=r37L30Done(uid);if(x)return x;const at=r37UnitAt(uid);if(!at)return null;const e=r37Get().lv[r37LvKey('english',at.w,at.s)];return e&&e.passed?{at:Date.parse(e.at)||Date.now(),stars:e.best||0,best:e.best||0}:null;};
function r37UnitLevelBtn(){
 const id=new URLSearchParams((location.hash.split('?')[1]||'')).get('id'),at=id&&r37UnitAt(id),row=$('#app .q36-start .l30-row');if(!at||!row)return;
 const open=r37StageOpen('english',at.w,at.s);
 row.insertAdjacentHTML('beforeend',open?`<button type="button" class="l30-btn r37-ulv" data-r37="level" data-track="english" data-w="${at.w}" data-s="${at.s}">🏆 闖關挑戰</button>`:`<a class="l30-btn r37-ulv lock" href="#lv/english">🔒 闖關：${R37_TRACKS.english.worlds[at.w].icon} ${R37_TRACKS.english.worlds[at.w].name} 第 ${at.s+1} 關</a>`);
 if(r37Entry('english',at.w,at.s)?.passed&&r37EnStage(at.w,at.s).length>=4)row.insertAdjacentHTML('beforeend',`<button type="button" class="l30-btn r37-ulv r37-ufps" data-r37="fps-level" data-w="${at.w}" data-s="${at.s}" data-from="#unit?id=${esc(id)}">🎯 射擊鞏固</button>`);
}
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
 else if(a==='run-endless'){r37RunSel={w:Number.isInteger(r37Mem._rw)?r37Mem._rw:0,s:0,endless:true};location.hash='#rn/play';}
 else if(a==='fps-level')r37StartFps(+el.dataset.w,+el.dataset.s,el.dataset.from);
 else if(a==='g3-level')r37G3Start(el.dataset.g,el.dataset.subj,+el.dataset.w,+el.dataset.s);
 else if(a==='g3-world'){(r37Mem._gw=r37Mem._gw||{})[r37G3Track(el.dataset.g,(r37Mem._gs||{})[el.dataset.g]||'english')]=+el.dataset.w;render();}
 else if(a==='g3-subj'){(r37Mem._gs=r37Mem._gs||{})[el.dataset.g]=el.dataset.subj;render();}
 else if(a==='fworld'){r37Mem._fw=+el.dataset.w;render();}
 else if(a==='rworld'){r37Mem._rw=+el.dataset.w;render();}
 else if(a==='world'){(r37Mem._w=r37Mem._w||{})[el.dataset.track]=+el.dataset.w;render();}
 else if(a==='learn-go'&&P){if(P.exBack){P.exBack=false;P.phase='result';}else P.phase='quiz';render();}
 else if(a==='ex-again'&&P){const l=((P.result||{}).lessons||[])[+el.dataset.i];if(l&&l.ex){P.exq=l.ex;P.exBack=true;P.phase='example';render();}}
 else if(a==='pick-opt'&&P)r37Answer(el.dataset.v);
 else if(a==='next')r37Next();
 else if(a==='hint'&&P){P.hintShown=true;render();}
 else if(a==='speak')r37Speak(el.dataset.t);
 else if(a==='qspeak'&&P&&P.qs[P.i])r37Speak(P.qs[P.i].audio);
 else if(a==='dz-go')r37DzStart(+el.dataset.g,+el.dataset.l||0);
 else if(a==='dz-rv')r37DzReview(+el.dataset.g);
 else if(a==='dz-next'&&P&&P.kind==='dz'){const {g,lvl,n}=P.dz;if(lvl<3)r37DzStart(g,lvl+1,true);else if(g<n-1)r37DzStart(g+1,0);}
 else if(a==='exit')r37Exit();
 else if(a==='retry'&&P){if(P.kind==='dz'){if(P.dz.rv)r37DzReview(P.dz.g);else r37DzStart(P.dz.g,P.dz.lvl,true);}else if(P.kind==='level')r37StartLevel(P.track,P.w,P.s);else r37StartQuiz(P.track,P.mode);}
 else if(a==='level-next'&&P){let w=P.w,s=P.s+1;if(s>9){w++;s=0;}if(P.track==='olympiad'&&!(s&1)&&!r80Seen('p'+(w+1)+'-'+((s>>1)+1))&&!adminUnlocks()){r37P=null;location.hash='#oly/'+(w+1)+'/'+((s>>1)+1)+'/learn';}else r37StartLevel(P.track,w,s);}
 else if(a==='oly-lesson'&&P&&P.track==='olympiad'){const g=P.w+1,n=(P.s>>1)+1;r37P=null;clearTimeout(r37Timer);location.hash='#oly/'+g+'/'+n+'/learn';}
 else if(a==='diff'){if(isLoggedIn()&&!v23ParentAllowed()){render();return;}const t=r37DiffT(el.dataset.t||r37Mem._dsub||'english');r37Get().diffs[t]=+el.dataset.n;r37Save();render();}
 else if(a==='dsub'){r37Mem._dsub=el.dataset.k;render();}
 else if(a==='redo-miss')r37Redo();
 else if(a==='lesson'){r37OpenLesson(el.dataset.code,el.dataset.track);}
 else if(a==='ptab'){r37Mem._ptab=el.dataset.k;render();}
 else if(a==='chars')location.hash='#p/chars';
 else if(a==='pick'){const o=r37Get();if(o.chars.includes(el.dataset.id)){o.pick=el.dataset.id;r37Save();render();}}
 else if(a==='buy'){const o=r37Get(),ch=R37_CHARS.find(x=>x.id===el.dataset.id),c=activeChild();if(ch&&c&&isLoggedIn()&&!o.chars.includes(ch.id)&&c.stars>=ch.cost){c.stars-=ch.cost;if(save()){o.chars.push(ch.id);o.pick=ch.id;r37Save();playSfx('correct');}else c.stars+=ch.cost;render();}}
 else if(a==='claim'){const m=R37_MISSIONS.find(x=>x.id===el.dataset.id),d=r37Get().day;if(m&&!d.claimed.includes(m.id)&&(d[m.key]||0)>=m.goal){d.claimed.push(m.id);r37Save();r37AddCoins(m.coins);playSfx('correct');render();}}
});
document.addEventListener('submit',e=>{
 if(!e.target.closest?.('[data-r37-form]'))return;e.preventDefault();
 const el=$('#r37-in');if(el)r37Answer(el.value);else r37DzSubmit();
});
document.addEventListener('input',e=>{if(e.target.classList?.contains('r37-cell')&&!e.isComposing)r37DzCellInput(e.target,e);});
document.addEventListener('keydown',e=>{if(e.target.classList?.contains('r37-cell'))r37DzCellKey(e.target,e);});
document.addEventListener('focusin',e=>{if(e.target.classList?.contains('r37-cell'))e.target.select();});
document.addEventListener('keydown',e=>{
 const P=r37P;if(!P||lastRoute!=='lp/play'||e.ctrlKey||e.metaKey||e.altKey)return;
 if(e.key==='Escape'){r37Exit();return;}
 if((P.phase==='learn'||P.phase==='example')&&(e.key==='Enter'||e.key===' ')){e.preventDefault();if(P.exBack){P.exBack=false;P.phase='result';}else P.phase='quiz';render();return;}
 if(P.phase==='result'){if(e.key==='Enter')$('[data-r37="level-next"],[data-r37="dz-next"],[data-r37="retry"]')?.click();return;}
 if(P.phase!=='quiz')return;
 if(P.fb){if(e.key==='Enter'||e.key===' '){e.preventDefault();r37Next();}return;}
 const q=P.qs[P.i],typing=document.activeElement&&document.activeElement.id==='r37-in';
 if(q.mode==='mcq'&&/^[1-9]$/.test(e.key)){const o=q.options[+e.key-1];if(o!==undefined){e.preventDefault();r37Answer(o);}}
 else if(!typing&&(e.key==='h'||e.key==='H')&&R37_DIFF[P.diff-1].hint&&q.hint){P.hintShown=true;render();}
});
window.addEventListener('resize',()=>{try{r37Layout();}catch(_){}});
/* R3.8 maths dialog joins the planet look: space backdrop, white text outside the cards, back button returns to the planet */
(()=>{
 const css=`\n/* R3.8 planet theme */\n.wqm{background:radial-gradient(1100px 620px at 50% -8%,#1f6b5c 0,#161a5a 52%,#0c1033 100%)!important;background-attachment:fixed!important}
.wqm .topbar{border-bottom-color:rgba(255,255,255,.14)}.wqm .topbar .brand,.wqm .topbar .name,.wqm .hero h1,.wqm .hero p,.wqm .section-head h2,.wqm .section-head p,.wqm>.shell>h1,.wqm>.shell>h2,.wqm>.shell>p,.wqm .shell>section>h2{color:#fff}
.wqm .eyebrow{color:#9ff0d4}.wqm .nav button{color:#cfd4ff;border-radius:999px}.wqm .nav button.active{background:rgba(255,255,255,.18);color:#fff}
.wqm .card,.wqm .notice,.wqm .stats>*{border-radius:24px;box-shadow:0 10px 30px rgba(4,6,30,.4)}
.wqm .wq36-home{font-size:0!important;background:rgba(255,255,255,.16)!important;color:#fff!important;border:1px solid rgba(255,255,255,.3)!important;border-radius:999px!important}.wqm .wq36-home::after{content:"🪐 回星球";font-size:17px}
.wqm .wq36-home-small{font-size:0!important}.wqm .wq36-home-small::after{content:"🪐 星球";font-size:16px}
.wqm .wallet{background:#ffd15c;border-color:#c5942b;color:#4a3000;font-weight:800}
.wqm .hero .row>button.quiet{color:#fff;border:1px solid rgba(255,255,255,.45);border-radius:999px}.wqm .forest-controlbar>button{color:#fff;border-color:rgba(255,255,255,.5);background:rgba(255,255,255,.12)}`;
 const apply=()=>{const host=document.getElementById('wqm-app-host');if(host&&host.shadowRoot&&!host.shadowRoot.querySelector('#r38-wqm')){const st=document.createElement('style');st.id='r38-wqm';st.textContent=css;host.shadowRoot.appendChild(st);}};
 document.addEventListener('click',e=>{if(e.target.closest?.('[data-wqm-open],#wqm-launch')){setTimeout(apply,0);setTimeout(apply,400);}},true);
 globalThis.r38WqmTheme=apply;
})();
/* R3.18 D01 / D02 / L03: the maths dialogs (HK-M4 course, thinking tower / strategy cards) join the galaxy shell without touching their source:
   - the dialog gets the nebula backdrop; the app's own header is hidden and replaced by the shell bar (back, planet title, coin) and the bottom
     navigation, both living in the dialog's light DOM (they survive every re-render of the shadow root);
   - styles are injected from outside into each shadow root; the course content sits on one 24px paper card floating on the stars;
   - the primary button is the one gold CTA, selected states use the shell indigo, headings 900. */
(()=>{
 const COMMON=`
:host{display:block}
h1,h2,h3{font-weight:900;letter-spacing:.02em}
.stat b,.stat strong,.stat span,.badge-n,.num,.solution,.qnav button,.card-pagination button,.choice,.answer-input,.field input,.wallet,table{font-variant-numeric:tabular-nums}
button:focus-visible,a:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible,[tabindex]:focus-visible{outline:3px solid #ffc94a;outline-offset:3px}
`;
 const COURSE=COMMON+`
.app{background:transparent!important;background-image:none!important;min-height:0!important}
.wrap{width:calc(100% - 24px);max-width:1180px;margin:76px auto 96px!important;padding:12px 14px 22px!important;background:#faf7f0;border-radius:24px;box-shadow:0 10px 30px rgba(2,4,24,.45),0 0 0 1px rgba(255,255,255,.35)}
@media(min-width:760px){.wrap{padding:16px 26px 30px!important}}
.top{display:none!important}
.nav{padding-top:6px}
.eyebrow{color:#5a5170!important}.footer,.small.muted,.muted.small,.small{color:#555a6e}
.btn.primary,.btn.sun{background:#ffc94a!important;border:0!important;color:#3b2600!important;box-shadow:0 4px 0 #c48a00!important;min-height:52px;font-weight:900}
.btn.primary:hover:not(:disabled),.btn.sun:hover:not(:disabled){background:#ffd466!important;color:#3b2600!important}
.btn.primary:active:not(:disabled){transform:translateY(2px);box-shadow:0 2px 0 #c48a00!important}
.grades button.active,.nav button.active,.steps button.active,.learning-route button.active,.topic-filters button.active,.card-pagination button.active{background:#2a3282!important;border-color:#1b2160!important;color:#fff!important}
.learning-route button.active small{background:#ffc94a;color:#3b2600}
/* R3.24 cosmic: dark glass chrome, light "board" only for teaching figures */
:host{color:#eef1ff!important}
.wrap{background:linear-gradient(165deg,rgba(28,34,92,.9),rgba(14,18,56,.92))!important;border:1px solid rgba(255,255,255,.14);box-shadow:0 18px 44px rgba(2,4,24,.55)!important;backdrop-filter:blur(10px)}
h1,h2,h3,strong,b,label,summary,th{color:#fff}
a{color:#ffd56b}
.muted,.small,.small.muted,.muted.small,.eyebrow,.footer,.quiet-note,.topic-type{color:#c3cbf7!important}
.nav{border-bottom:1px solid rgba(255,255,255,.1)}
.nav button{color:#c3cbf7}.nav button:hover:not(.active){background:rgba(255,255,255,.08);color:#fff}
.hero,.hero.map-hero{background:radial-gradient(120% 140% at 85% 20%,rgba(130,110,255,.35),transparent 60%),linear-gradient(150deg,#2b2f86,#1a1d5c)!important;border:1px solid rgba(255,255,255,.18)!important;color:#eef1ff}
.hero h1,.hero h2{color:#fff!important}.hero::before,.hero::after{opacity:.25}
.card,.panel,.stat,.side,.lesson-companion,.answer-tile,.answer-door,.mission-cards article,.check,.manual,.confirm-card,.notice,.lesson-link,.topic-card,.learning-route button,.option,.qnav button,.speech,.explain-card,.actions.sticky,.lesson-actions,.visitor-strip{background:rgba(255,255,255,.06)!important;border-color:rgba(255,255,255,.16)!important;color:#eef1ff!important;box-shadow:none}
.card,.panel,.topic-card,.confirm-card{background:linear-gradient(160deg,rgba(38,46,118,.92),rgba(20,26,76,.94))!important;box-shadow:0 4px 0 #070a26!important}
.topic-card:hover{box-shadow:0 8px 0 #070a26,0 0 0 2px rgba(255,201,74,.5)!important}
.actions.sticky{background:rgba(16,20,62,.96)!important}
.lesson-link:hover,.option:hover:not(:disabled),.learning-route button:hover{background:rgba(255,255,255,.12)!important}
.option.selected,.qnav button.filled{background:rgba(255,201,74,.18)!important;border-color:#ffc94a!important}
.btn{background:rgba(255,255,255,.08);border-color:rgba(255,255,255,.24);color:#f4f6ff}
.btn:hover:not(:disabled){background:rgba(255,255,255,.16);border-color:rgba(255,255,255,.4);color:#fff}
.btn.soft,.picture-tools .btn,.classroom-grid .btn,.card-pagination button,.topic-filters button,.grades button{background:rgba(255,255,255,.08)!important;border:1px solid rgba(255,255,255,.24)!important;color:#f4f6ff!important;box-shadow:none}
.topic-filters button.active,.card-pagination button.active,.classroom-choices .btn[aria-pressed=true]{background:#2a3282!important;border-color:rgba(255,255,255,.5)!important;color:#fff!important}
.pill,.badge-n,.num,.lesson-link .badge-n,.word-card,.mini-path span,.hero-pal>span{background:rgba(255,255,255,.12)!important;border-color:rgba(255,255,255,.2)!important;color:#f4f6ff!important}
.pill.gold,.coin{background:rgba(255,201,74,.2)!important;color:#ffe08a!important}
.pill.green{background:rgba(80,220,150,.18)!important;color:#9ff0c4!important}
.banner,.hint-card,.pending-card,.incorrect{background:rgba(255,201,74,.12)!important;border-color:rgba(255,201,74,.45)!important;color:#fff3cf!important}
.correct,.classroom-feedback{background:rgba(80,220,150,.12)!important;border-color:rgba(80,220,150,.45)!important;color:#d9ffe9!important}
.error,.notice.warn{background:rgba(255,110,110,.14)!important;border-color:rgba(255,110,110,.45)!important;color:#ffe1e1!important}
.progress{background:rgba(255,255,255,.12)!important}
.field input,.field textarea,.field select,input.textbox,.fraction-inputs input{background:rgba(8,10,40,.6)!important;border-color:rgba(255,255,255,.3)!important;color:#fff!important}
th{background:rgba(255,255,255,.08)!important}td{border-color:rgba(255,255,255,.12)}
.topic-art,.teaching-picture,.diagram,.zoom-scroll,.thinking-art,.toolframe,.classroom-canvas,.guided-figure .diagram,.fraction-answer{background:#eef0fb!important;color:#24283d!important;border-color:rgba(255,255,255,.3)!important}
:is(.topic-art,.teaching-picture,.diagram,.zoom-scroll,.thinking-art,.fraction-answer) :is(h1,h2,h3,strong,b,label,th){color:#24283d}
.classroom-figure-scroll{background:#eef0fb!important;color:#24283d!important;border-radius:16px;padding:10px}
.hero p,.hero .muted{color:#d6dcff!important}
.learning-route button small{color:#c3cbf7}
.topic-status,.lesson-link small,.lesson-link .arrow,.arrow{color:#c3cbf7!important}
.topic-art .pill,.topic-art .topic-type,.teaching-picture .pill{background:rgba(42,50,130,.12)!important;color:#2a3282!important}
`;
 const WQM=COMMON+`
.wqm{background:transparent!important}
.wqm .topbar{display:none!important}
.wqm .shell{padding:70px 12px 84px!important}
.wqm .primary{background:#ffc94a!important;border:0!important;color:#3b2600!important;box-shadow:0 4px 0 #c48a00!important;min-height:52px;font-weight:900}
.wqm .primary:hover:not(:disabled){background:#ffd466!important;color:#3b2600!important}
.wqm .primary:active:not(:disabled){transform:translateY(2px);box-shadow:0 2px 0 #c48a00!important}
.wqm .grade-selector .selected,.wqm .step.current,.wqm .nav button.active,.wqm .tower button.selected{background:#2a3282!important;border-color:rgba(255,255,255,.5)!important;color:#fff!important}
.wqm .tower button.selected{background:#ffc94a!important;color:#3b2600!important;border-color:#c48a00!important}
.wqm .card,.wqm .stat,.wqm .notice,.wqm .badge-card,.wqm .track-card{background:linear-gradient(160deg,rgba(30,38,96,.94),rgba(18,24,68,.94))!important;border:1px solid rgba(255,255,255,.14)!important;border-radius:20px!important;color:#f4f6ff!important;box-shadow:0 4px 0 #070a26}
.wqm .card :is(h1,h2,h3,p,strong,b,li,label,summary),.wqm .stat :is(strong,b){color:#f4f6ff!important}
.wqm .card .muted,.wqm .card .small,.wqm .stat span,.wqm .card p.muted{color:#c3cbf7!important}
.wqm .tag{background:rgba(255,255,255,.1)!important;border-color:rgba(255,255,255,.22)!important;color:#f4f6ff!important}
.wqm .lesson-card button:not(.primary),.wqm .badge-card button:not(.primary){background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.22);color:#f4f6ff}
.wqm .badge-card.locked{opacity:.8}
.wqm .tower button{background:rgba(255,255,255,.08)!important;border:1px solid rgba(255,255,255,.22)!important;color:#f4f6ff!important}
.wqm .tower button:hover:not(:disabled){background:rgba(255,255,255,.16)!important}
.wqm .note{background:rgba(255,201,74,.12)!important;border-left-color:#ffc94a!important;color:#f4f6ff!important}
.wqm .note *{color:inherit}
.wqm :is(.secondary,.section-head>button,.shell>.row>button,.grade-selector button:not(.selected),.islands button){background:#2a3282!important;border:1px solid rgba(255,255,255,.35)!important;color:#fff!important;box-shadow:none}
`;
 const DLG={'wq-course-dialog':{host:'wq-course-host',close:'[data-c1="close"]',css:COURSE,planet:'math',title:'數學星'},
            'wqm-dialog':{host:'wqm-app-host',close:'[data-action="close"]',css:WQM,planet:'olympiad',title:'奧數星'}};
 function titleFor(d,cfg){
  if(d.id==='wqm-dialog'){const sub=d.querySelector('#wqm-app-host')?.shadowRoot?.querySelector('.brand small')?.textContent||'';return /奧數/.test(sub)?{planet:'olympiad',title:'奧數星'}:{planet:'math',title:'數學星'};}
  return {planet:cfg.planet,title:cfg.title};
 }
 function skin(d){
  const cfg=DLG[d.id];if(!cfg)return;
  const host=document.getElementById(cfg.host),R=host&&host.shadowRoot;
  if(R&&!R.querySelector('#r318-skin')){const st=document.createElement('style');st.id='r318-skin';st.textContent=cfg.css;R.appendChild(st);}
  const t=titleFor(d,cfg),p=r37Planet(t.planet)||r37Planet('math');
  let sh=d.querySelector(':scope>.r37-dshell');
  if(!sh){
   sh=document.createElement('div');sh.className='r37-dshell';sh.style.setProperty('--h',p.hue);
   d.appendChild(sh);
  }
  const key=t.planet+'|'+(isLoggedIn()?r37Coins():0)+'|'+(activeChild()?.id||'');
  if(sh.dataset.k!==key){
   sh.dataset.k=key;sh.style.setProperty('--h',p.hue);
   sh.innerHTML=`<div class="r37-bar"><button type="button" class="r37-back2" data-r37dlg="close" aria-label="返回">←</button><span class="r37-legt"><span aria-hidden="true">${r37Icon(p.icon)}</span>${t.title}</span>${r37Coin()}</div>${r37Nav('p/'+t.planet)}`;
  }
 }
 function closeDlg(d){
  const cfg=DLG[d.id],R=cfg&&document.getElementById(cfg.host)?.shadowRoot,b=R&&R.querySelector(cfg.close);
  if(b)b.click();else{try{d.close();}catch(_){}}
  if(d.open){try{d.close();}catch(_){}}
 }
 function sweep(){document.querySelectorAll('dialog#wq-course-dialog,dialog#wqm-dialog').forEach(d=>{if(d.open)skin(d);});}
 document.addEventListener('click',e=>{
  const c=e.target.closest?.('[data-r37dlg="close"]');
  if(c){e.preventDefault();const d=c.closest('dialog');if(d)closeDlg(d);return;}
  const nav=e.target.closest?.('dialog .r37-dshell .r37-nav a');
  if(nav){const d=nav.closest('dialog');if(d){const h=nav.getAttribute('href');if(h==='#'+(location.hash||'#kid').slice(1)){e.preventDefault();closeDlg(d);}else setTimeout(()=>{if(d.open)closeDlg(d);},0);}return;}
  if(e.target.closest?.('[data-wqm-open],#wqm-launch'))[0,60,200,500,1200].forEach(ms=>setTimeout(sweep,ms));
 },true);
 addEventListener('hashchange',()=>{document.querySelectorAll('dialog#wqm-dialog[open]').forEach(closeDlg);});
 new MutationObserver(()=>sweep()).observe(document.documentElement,{subtree:true,attributes:true,attributeFilter:['open']});
 document.addEventListener('DOMContentLoaded',sweep);
 /* the bar follows the app: coin / who may change while a dialog is open */
 setInterval(()=>{try{sweep();}catch(_){}},1500);
 globalThis.r318DialogSkin=sweep;
})();
