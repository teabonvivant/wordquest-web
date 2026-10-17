/* R3.20 s70 - WQArcPlus: one shared "arcade enhancement core" over the 26 legacy arcade games (see s70_arcplus.css, s71_arcgames.js).
 * Unified dark HUD, hit effects, synthesised sound, event combo with a real score multiplier, 3-wave director with power-ups and events,
 * learning crystals (English words / sums) with the shared learning card, one result block, performance tiers.
 * Rules (same as s35): never adds a property to a game instance (the snapshot schema rejects unknown keys; all per-game state is in WeakMaps
 * or wq34S), never changes a game's rules, every DOM element is created inside .a28-viewport. Nothing here is saved: after "save and return"
 * the core restarts its combo / wave from the game's own progress. */
const WQArcPlus=(()=>{
 'use strict';
 const calm=()=>{try{return r37Calm();}catch(_){return false;}};
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const esc2=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
 const LC_OK={min:.8,max:2.4},LC_BAD={min:2,max:8,again:2.6};   /* same numbers as the runner / shooter learning card */
 const MULT=[[15,5],[10,4],[6,3],[3,2],[0,1]];
 const multOf=n=>{for(const [k,m] of MULT)if(n>=k)return m;return 1;};
 const PENTA=[523,587,659,784,880,988,1175,1319];
 const FALL=[['sun','太陽','☀️'],['moon','月亮','🌙'],['star','星星','⭐'],['apple','蘋果','🍎'],['cat','貓','🐱'],['dog','狗','🐶'],['fish','魚','🐟'],['egg','雞蛋','🥚']].map(([en,zh,emoji])=>({en,zh,emoji}));
 const MISSGAMES=['forest-pong','bounce-basket','meadow-cricket','star-rhythm'];   /* lives = 3 - misses, recomputed by a28RulesTick (forgive offset: wq34S(g).forgive) */
 const noLearn=()=>{try{return localStorage.getItem('wq37-nolearn')==='1';}catch(_){return false;}};

 /* ---------------------------------------------------------------- per-game table (adapters). s71 fills CFG for the 26 ids. */
 const CAT={};          /* id -> category name (from the registered meta) */
 const CFG={};          /* id -> {thr,speed,pos(g),r,prog(g),math,every,first,hasLives,theme,...} */
 const DEF={thr:3,speed:false,pos:null,r:38,prog:null,math:false};
 const cfgOf=id=>Object.assign({},DEF,CFG[id]||{});
 const catOf=id=>{try{return (a28Meta(id)||{}).category||'';}catch(_){return '';}};
 const isAct=id=>['動作','運動'].includes(catOf(id));
 const S_=new WeakMap();
 const live=()=>pgGame&&pgMeta&&!pgGame.preview&&COIN28.ids.includes(pgMeta.id)?pgGame:null;
 const stateOf=g=>{
  let s=S_.get(g);
  if(!s){
   const id=g.meta.id,c=cfgOf(id);
   s={id,cat:catOf(id),cfg:c,t0:g.t||0,phase:1,phaseMax:1,combo:0,maxCombo:0,mult:1,lastFinal:g.score||0,prevRaw:g.score||0,bonus:0,goods:0,
      lives0:null,lastLives:null,shield:false,x2:0,slow:0,magnet:0,similar:false,events:[],evAt:null,nextEv:null,sfxLog:[],
      parts:[],floats:[],flash:0,shake:0,banner:null,freeze:0,card:null,q:null,nextQ:null,qCount:0,
      learn:{asked:0,ok:0,bad:0,missed:0,lastCardMs:0,log:[]},idle:0,motes:[],tier:'high',ft:[],lastNow:0,forced:{},rngSeed:(r37Hash(id+'|'+(g.seed||0))>>>0)||7,raf:0,final:null,hits:0};
   s.rng=r37Rng(s.rngSeed);
   s.nextQ=(c.first!=null?c.first:(isAct(id)?9:16));
   s.evAt=(isAct(id)?16:28);
   S_.set(g,s);
  }
  return s;
 };
 const run=()=>{try{return a28Run();}catch(_){return null;}};
 function livesOf(g){
  if(typeof g.health==='number')return g.health;
  const r=pgFree?null:run();return r&&typeof r.lives==='number'?r.lives:null;
 }
 const hasLives=(g,s)=>typeof g.health==='number'||MISSGAMES.includes(s.id);
 function addLife(g){   /* used by the s35 supply shield (B9) and by the in-game shield: makes the extra life survive a28RulesTick */
  try{
   if(typeof g.health==='number'){g.health=Math.min(5,g.health+1);return true;}
   if(MISSGAMES.includes(g.meta.id)){const v=wq34S(g);v.forgive=(v.forgive||0)+1;return true;}
  }catch(_){}
  return false;
 }

 /* ---------------------------------------------------------------- sound (all through pgAudio.tone; muted = 0 nodes) */
 const SFXDEF={
  good:[[660,.07,'triangle',.11,0],[880,.09,'triangle',.1,.06]],
  bad:[[196,.18,'sine',.11,0],[165,.2,'sine',.08,.07]],
  power:[[523,.08,'triangle',.11,0],[659,.08,'triangle',.11,.07],[784,.12,'triangle',.12,.14]],
  event:[[440,.07,'square',.06,0],[587,.1,'square',.06,.08]],
  phase:[[392,.08,'triangle',.11,0],[494,.08,'triangle',.11,.09],[587,.08,'triangle',.11,.18],[784,.16,'triangle',.12,.27]],
  tick:[[1320,.04,'square',.05,0]],
  clear:[[523,.1,'triangle',.12,0],[659,.1,'triangle',.12,.1],[784,.1,'triangle',.12,.2],[1047,.2,'triangle',.13,.3]],
  fail:[[294,.16,'sine',.1,0],[247,.2,'sine',.1,.14],[196,.3,'sine',.1,.28]],
  pick:[[988,.05,'sine',.08,0]]
 };
 const sfxOn=()=>{try{return sfxEnabled();}catch(_){return false;}};
 function sfx(s,kind,n){
  let nodes=0;
  try{
   if(sfxOn()&&pgAudio&&pgAudio.ctx){
    let def=SFXDEF[kind]||[];
    if(kind==='combo'){const f=PENTA[clamp((n||2)-2,0,7)];def=[[f,.09,'triangle',.11,0],[f*2,.08,'sine',.05,.05]];}
    const t0=pgAudio.ctx.currentTime;
    for(const [f,d,w,v,o] of def){try{pgAudio.tone(f,d,w,v,t0+o);nodes++;}catch(_){}}
   }
  }catch(_){}
  s.sfxLog.push({k:kind,n:nodes,t:+(performance.now()/1000).toFixed(2)});if(s.sfxLog.length>60)s.sfxLog.shift();
 }

 /* ---------------------------------------------------------------- effects (canvas coordinates 800x560) */
 const capParts=s=>s.tier==='low'?24:64;
 function burst(s,x,y,n,cols){
  if(calm()){ if(s.parts.length<6)for(let i=0;i<Math.min(6,n);i++)s.parts.push({x:x+(i-2.5)*14,y:y-10,vx:0,vy:0,life:.9,max:.9,c:cols[i%cols.length],r:5,still:1});return; }
  n=Math.min(n,capParts(s)-s.parts.length);
  for(let i=0;i<n;i++){const a=s.rng()*6.283,sp=60+s.rng()*140;s.parts.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp-50,life:.55+s.rng()*.35,max:.9,c:cols[i%cols.length],r:3+s.rng()*4});}
 }
 function floatText(s,txt,x,y,c,size){if(s.floats.length>5)s.floats.shift();s.floats.push({txt,x,y,c:c||'#FFC94A',size:size||26,life:1,max:1});}
 function shake(s,p){if(calm())return;s.shake=Math.max(s.shake,Math.min(8,p));s.shakeMax=Math.max(s.shakeMax||0,s.shake);}
 function flash(s,a){if(calm())return;s.flash=Math.max(s.flash,Math.min(.35,a));}
 function banner(s,text,sub){s.banner={text,sub:sub||'',t:.95};}
 const posOf=(g,s)=>{try{const p=s.cfg.pos&&s.cfg.pos(g);if(p&&Number.isFinite(p.x)&&Number.isFinite(p.y))return {x:clamp(p.x,30,770),y:clamp(p.y,70,520)};}catch(_){}return {x:400,y:280};};

 /* ---------------------------------------------------------------- learning questions */
 const lev=(a,b)=>{const m=[...Array(a.length+1)].map((_,i)=>[i,...Array(b.length).fill(0)]);for(let j=1;j<=b.length;j++)m[0][j]=j;for(let i=1;i<=a.length;i++)for(let j=1;j<=b.length;j++)m[i][j]=Math.min(m[i-1][j]+1,m[i][j-1]+1,m[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return m[a.length][b.length];};
 let wordCache=null;
 const wordPool=()=>{
  if(wordCache&&Date.now()-wordCache.t<60000)return wordCache.w;
  let ws=[];try{ws=r37GameWords(0,16)||[];}catch(_){}
  ws=ws.filter(w=>w&&w.en&&w.zh);
  for(const f of FALL)if(ws.length<8&&!ws.some(w=>w.en===f.en))ws.push(f);
  wordCache={t:Date.now(),w:ws};return ws;
 };
 function wordQ(s){
  const ws=wordPool(),rng=s.rng,w=ws[Math.floor(rng()*ws.length)];
  const hard=s.similar||((()=>{try{return r37DiffN('english');}catch(_){return 2;}})()>=4);
  let others=ws.filter(x=>x.en!==w.en);
  if(hard)others.sort((a,b)=>lev(a.en,w.en)-lev(b.en,w.en)+(rng()-.5)*.8);else others=r37Shuf(others,rng);
  const opts=r37Shuf([w,...others.slice(0,2)],rng);
  const kind=['zh','listen','pic'][s.qCount%3];
  const prompt=kind==='zh'?w.zh:kind==='pic'?(w.emoji||'🔤')+' '+w.zh:'🔊 聽一聽';
  return {type:'word',kind,w,prompt,say:w.en,answer:w.en,opts:opts.map(o=>({label:o.en,sub:o.zh,ok:o.en===w.en})),fix:w.en+' = '+w.zh};
 }
 function mathQ(s){
  const rng=s.rng,lv=(()=>{try{return r37DiffN('math');}catch(_){return 2;}})();
  let a,b,op,ans;
  const R=n=>1+Math.floor(rng()*n);
  if(lv<=2){a=R(9)+R(8);b=R(9);if(rng()<.5){op='+';ans=a+b;}else{if(b>a)[a,b]=[b,a];op='-';ans=a-b;}}
  else if(lv===3){a=R(9);b=R(9);op='×';ans=a*b;}
  else{a=R(12);b=R(9);if(rng()<.5){op='×';ans=a*b;}else{ans=a*b;a=ans;op='÷';ans=b;b=a/b;[a,b]=[a,b];}}
  const txt=op==='÷'?`${a} ÷ ${b}`:`${a} ${op} ${b}`;
  const set=new Set([ans]);const d=[1,2,10,-1,-2,-10,3];let k=0;while(set.size<3&&k<20){const v=ans+d[Math.floor(rng()*d.length)]*(1+(k>8?1:0));if(v>=0)set.add(v);k++;}
  while(set.size<3)set.add(ans+set.size+2);
  const opts=r37Shuf([...set].slice(0,3),rng).map(v=>({label:String(v),sub:'',ok:v===ans}));
  return {type:'math',kind:'math',prompt:txt+' = ?',say:'',answer:String(ans),opts,fix:txt+' = '+ans};
 }
 function makeQ(s){return (s.cfg.math&&!(s.qCount%3===2))?mathQ(s):wordQ(s);}

 /* ---------------------------------------------------------------- learning moment: crystals on the canvas + chips in the dock */
 function startQ(g,s,why){
  if(s.q||s.card||s.freeze>0||noLearn()||!pgPlaying||s.final)return false;   /* never over a result screen */
  const q=makeQ(s);s.qCount++;
  const c=s.cfg,xs=(c.area&&c.area.xs)||[170,400,630];
  q.t=0;q.ttl=16;q.why=why||'auto';
  q.cr=q.opts.map((o,i)=>({x:xs[i]+(s.rng()-.5)*30,y:(c.area?c.area.y[0]+s.rng()*(c.area.y[1]-c.area.y[0]):c.pos?190+s.rng()*60:250+s.rng()*40),ph:s.rng()*6,o,i,col:['#FF8FC7','#7CC8FF','#7EE3A1'][i],gone:false}));
  q.pos=!!c.pos;
  if(c.pos){try{const pp=c.pos(g),R=(c.r||34)+70;for(const k of q.cr){if(Math.hypot(k.x-pp.x,k.y-pp.y)<R){if(c.area){const lo=c.area.xs[0]-40,hi=c.area.xs[2]+40,d=(c.r||34)+34;k.x=Math.max(lo,Math.min(hi,pp.x+(k.x>=pp.x?d:-d)));if(Math.abs(k.x-pp.x)<d)k.x=pp.x-(k.x>=pp.x?d:-d);}else{const up=pp.y-R;k.y=up>110?up:Math.min(520,pp.y+R);}}}}catch(_){}}   /* a crystal never appears under the player: touching it must be a choice */
  s.q=q;s.learn.asked++;
  burst(s,400,260,10,['#fff','#FFC94A','#7CC8FF']);sfx(s,'event');
  floatText(s,s.cfg.dockOnly?'學習題！看下方':'字晶出現！',400,120,'#FFE08A',30);
  if(q.kind==='listen'&&q.say)setTimeout(()=>{try{r37Speak(q.say);}catch(_){}},180);
  dockDirty=true;return true;
 }
 function answerQ(g,s,idx,how){
  const q=s.q;if(!q||q.done)return;
  const cr=q.cr[idx];if(!cr||cr.gone)return;
  q.done=true;const o=cr.o,ok=!!o.ok,p={x:cr.x,y:cr.y};
  for(const c of q.cr)c.gone=true;
  s.q=null;s.nextQ=(g.t||0)+(isAct(s.id)?26:44);
  s.learn.log.push({fix:q.fix,en:q.type==='word'?q.answer:'',ok,type:q.type,picked:o.label});
  if(ok){
   s.learn.ok++;s.combo++;s.maxCombo=Math.max(s.maxCombo,s.combo);s.mult=multOf(s.combo);s.goods++;
   sfx(s,'power');
   burst(s,p.x,p.y,16,['#FFC94A','#fff','#7EE3A1']);floatText(s,'答對！',p.x,p.y-30,'#7EE3A1',32);
   const r=s.rng(),gain=powerUp(g,s,r);
   showCard(g,s,true,q,o,gain);
  }else{
   s.learn.bad++;s.combo=0;s.mult=1;
   sfx(s,'bad');burst(s,p.x,p.y,8,['#FF9AA8','#fff']);shake(s,3);
   showCard(g,s,false,q,o,'');
  }
  try{if(q.type==='word')r37Speak(q.answer);}catch(_){}
  dockDirty=true;
 }
 function powerUp(g,s,r){
  const L=livesOf(g);
  if(hasLives(g,s)&&!s.shield&&r<.4){s.shield=true;logEv(s,'shield','答對獎勵');return '🛡️ 護盾：擋住下一次失誤';}
  if(r<.75){s.x2=Math.max(s.x2,9);logEv(s,'double','答對獎勵');return '×2 雙倍分數 9 秒';}
  const b=Math.round(80*(s.mult));s.bonus+=b;g.score=(g.score||0)+b;s.lastFinal=g.score;logEv(s,'bonus','答對獎勵');return '+'+b+' 分';
 }
 function logEv(s,kind,why){s.events.push({k:kind,t:+(performance.now()/1000).toFixed(2),why});if(s.events.length>30)s.events.shift();}

 /* the shared learning card (DOM, inside the viewport) */
 function showCard(g,s,ok,q,picked,gain){
  const vp=document.querySelector('.a28-viewport');if(!vp)return;
  hideCard(s,true);
  const el=document.createElement('div');el.className='ap-card '+(ok?'ok':'bad');el.setAttribute('role','status');
  const T=ok?LC_OK:LC_BAD,ans=q.type==='word'?`<span lang="en" class="ap-cw">${esc2(q.answer)}</span><span class="ap-cz">${esc2(q.w.zh)}</span>`:`<span class="ap-cw">${esc2(q.fix)}</span>`;
  el.innerHTML=`<div class="ap-ct">${ok?'✓ 答對了':'正確答案'}</div><div class="ap-cb">${ans}${q.type==='word'?'<button type="button" class="ap-say" aria-label="聽發音">🔊</button>':''}</div>${ok?`<div class="ap-cg">${esc2(gain)}</div>`:`<div class="ap-cg">你選了「${esc2(picked.label)}」· 不扣命，記住它！</div>`}<button type="button" class="ap-go" disabled>${ok?'好':'我記住了'}</button><i class="ap-bar"><b></b></i>`;
  vp.appendChild(el);
  const c={el,t:0,ok,min:T.min,max:T.max,again:T.again||0,go:el.querySelector('.ap-go'),bar:el.querySelector('.ap-bar b'),q,spoken:false,t0:performance.now()};
  s.card=c;s.learn.lastCardMs=0;
  if(!ok)s.freeze=1e9;
  el.querySelector('.ap-say')?.addEventListener('click',e=>{e.stopPropagation();try{r37Speak(q.answer);}catch(_){}});
  c.go.addEventListener('click',e=>{e.stopPropagation();hideCard(s,false);});
 }
 function hideCard(s,quiet){
  const c=s.card;if(!c)return;
  if(!quiet&&c.t<c.min)return;
  s.learn.lastCardMs=Math.round(c.t*1000);
  try{c.el.remove();}catch(_){}
  s.card=null;s.freeze=0;
 }
 function cardTick(s,dt){
  const c=s.card;if(!c)return;
  const t0=c.t;c.t+=dt;
  if(c.bar)c.bar.style.width=Math.min(100,c.t/c.max*100).toFixed(1)+'%';
  if(c.t>=c.min&&c.go.disabled)c.go.disabled=false;
  if(c.again&&t0<c.again&&c.t>=c.again){try{if(c.q.type==='word')r37Speak(c.q.answer);}catch(_){}}
  if(c.t>=c.max)hideCard(s,true);
 }

 /* ---------------------------------------------------------------- events / director */
 const POOL={
  動作:['double','rain','slow','shield','magnet'],運動:['double','rain','shield','similar','magnet'],
  解謎:['double','rain','similar','magnet'],策略:['double','rain','similar','magnet'],創作:['double','rain','similar','magnet']
 };
 const EVNAME={double:['×2 雙倍時段','12 秒內得分 ×2'],rain:['金幣雨！','額外分數'],slow:['慢動作','6 秒放慢一點'],shield:['能量盾','擋住下一次失誤'],magnet:['磁石','字晶更易拾取'],similar:['小心相似字','下一題干擾字更像']};
 function fireEvent(g,s,kind,why){
  const GH=GAME_HOOKS[s.id],nm=(GH&&GH.names&&GH.names[kind])||EVNAME[kind];if(!nm)return;
  if(GH&&GH.events&&GH.events[kind]){try{GH.events[kind](g,s);}catch(e){console.error('WQArcPlus event',e);}logEv(s,kind,why||'event');sfx(s,'event');banner(s,nm[0],nm[1]);burst(s,400,200,12,['#FFC94A','#fff','#7CC8FF']);flash(s,.18);dockDirty=true;return;}
  if(kind==='double')s.x2=Math.max(s.x2,12);
  else if(kind==='rain'){const b=Math.round(60*s.mult);s.bonus+=b;g.score=(g.score||0)+b;s.lastFinal=g.score;s.rainT=1.2;floatText(s,'+'+b,400,200,'#FFC94A',34);}
  else if(kind==='slow')s.slow=6;
  else if(kind==='shield'){if(hasLives(g,s))s.shield=true;else{s.x2=Math.max(s.x2,8);kind='double';}}
  else if(kind==='magnet')s.magnet=10;
  else if(kind==='similar')s.similar=true;
  logEv(s,kind,why||'event');sfx(s,'event');
  banner(s,nm[0],nm[1]);burst(s,400,200,12,['#FFC94A','#fff','#7CC8FF']);flash(s,.18);
  dockDirty=true;
 }
 function setPhase(g,s,p,why){
  if(p<=s.phase)return;
  s.phase=p;s.phaseMax=Math.max(s.phaseMax,p);
  banner(s,p===2?'加速！':'最後衝刺！','第 '+p+' / 3 段');sfx(s,'phase');flash(s,.2);shake(s,3);burst(s,400,280,14,['#FFC94A','#fff','#FF8FC7']);
  const GH=GAME_HOOKS[s.id],pool=(POOL[s.cat]||POOL.動作).concat((GH&&GH.pool)||[]).filter(k=>k!=='shield'||hasLives(g,s)),ev=pool[Math.floor(s.rng()*pool.length)];
  fireEvent(g,s,ev,'phase '+p);
  if(typeof ARC_HOOKS.phase==='function'){try{ARC_HOOKS.phase(g,s,p);}catch(_){}}
 }
 function progOf(g,s){
  try{const f=s.cfg.prog&&s.cfg.prog(g);if(Number.isFinite(f))return clamp(f,0,1);}catch(_){}
  return clamp(((g.t||0)-s.t0)/120,0,1);
 }
 function dirTick(g,s){
  const el=(g.t||0)-s.t0,p=progOf(g,s),T=isAct(s.id)?[24,52]:[42,90];
  let ph=1;
  if(p>=.34||el>=T[0])ph=2;if(p>=.67||el>=T[1])ph=3;
  if(s.forced.phase)ph=Math.max(ph,s.forced.phase);
  if(ph>s.phase)setPhase(g,s,s.phase+1,'auto');
  if((g.t||0)>=s.evAt){
   s.evAt=(g.t||0)+(isAct(s.id)?34:55);
   const GH=GAME_HOOKS[s.id],pool=(POOL[s.cat]||POOL.動作).concat((GH&&GH.pool)||[]).filter(k=>k!=='shield'||hasLives(g,s));
   fireEvent(g,s,pool[Math.floor(s.rng()*pool.length)],'timer');
  }
 }
 const ARC_HOOKS={};
 const GAME_HOOKS={};   /* id -> {pool:[extra event kinds], names:{kind:[title,sub]}, events:{kind:fn(g,s)}, tick(g,s,dt), draw(g,s,c)} - the L2 mechanics of s71 */
 let inTick=false,inDraw=false;

 /* ---------------------------------------------------------------- tick wrapper */
 function afterTick(g,s,dt){
  const sc=Number(g.score)||0;
  let delta=0;
  if(sc>=s.lastFinal-1e-6){delta=sc-s.lastFinal;}
  else{delta=Math.max(0,sc-s.prevRaw);g.score=sc+s.bonus;}
  s.prevRaw=Number(g.score)||0;
  const thr=s.cfg.thr;
  if(delta>=thr){
   s.combo++;s.maxCombo=Math.max(s.maxCombo,s.combo);s.goods++;s.idle=0;
   const m=clamp(multOf(s.combo)*(s.x2>0?2:1),1,8),prevM=s.mult;s.mult=multOf(s.combo);
   const extra=Math.round(delta*(m-1));
   if(extra>0){s.bonus+=extra;g.score+=extra;}
   const p=posOf(g,s);
   floatText(s,'+'+Math.round(delta+extra)+(m>1?' ×'+m:''),p.x,p.y-26,m>1?'#FFC94A':'#fff',m>1?28:24);
   burst(s,p.x,p.y,m>=3?12:6,['#FFC94A','#fff','#7CC8FF']);
   sfx(s,'good');if(s.combo>=2)sfx(s,'combo',s.combo);
   if(s.mult>prevM&&s.mult>=3){burst(s,p.x,p.y,16,['#FF8FC7','#FFC94A','#fff']);flash(s,.14);}
   s.hits++;
  }
  s.lastFinal=Number(g.score)||0;
  /* test aid (WQArcPlus._force('god')): a run that would reach 0 lives is topped up so slow tests are not ended by the game's own rules */
  if(s.forced.god){const L0=livesOf(g);if(L0!=null&&L0<=0){if(typeof g.health==='number')g.health=Math.max(g.health,2);else addLife(g);s.lastLives=null;}}
  /* lives */
  const L=livesOf(g);
  if(L!=null){
   if(s.lastLives==null)s.lastLives=L;
   if(L<s.lastLives){
    const lost=s.lastLives-L;
    if(s.shield&&hasLives(g,s)){
     s.shield=false;for(let i=0;i<lost;i++)addLife(g);
     logEv(s,'shield-used','absorbed');sfx(s,'power');floatText(s,'🛡️ 擋住了！',400,150,'#7CC8FF',30);burst(s,400,280,12,['#7CC8FF','#fff']);
     s.lastLives=livesOf(g)??L;
    }else{
     s.combo=0;s.mult=1;sfx(s,'bad');shake(s,6);flash(s,.3);burst(s,posOf(g,s).x,posOf(g,s).y,10,['#FF9AA8','#fff']);floatText(s,'失誤',posOf(g,s).x,posOf(g,s).y-24,'#FF9AA8',24);
     s.lastLives=L;
    }
   }else s.lastLives=L;
  }
  /* quiet stretch: the combo fades */
  s.idle+=dt;if(s.combo&&s.idle>(isAct(s.id)?7:14)){s.combo=0;s.mult=1;s.idle=0;}
  if(s.x2>0)s.x2=Math.max(0,s.x2-dt);if(s.slow>0)s.slow=Math.max(0,s.slow-dt);if(s.magnet>0)s.magnet=Math.max(0,s.magnet-dt);
  dirTick(g,s);
  {const GH=GAME_HOOKS[s.id];if(GH&&GH.tick){try{GH.tick(g,s,dt);}catch(e){console.error('WQArcPlus hook',e);}}}
  /* learning moment */
  if(!s.q&&!s.card&&(g.t||0)>=s.nextQ&&!g.done&&!noLearn())startQ(g,s,'auto');
  if(s.q){
   s.q.t+=dt;
   const mg=s.magnet>0?1.5:1;
   if(s.q.pos){const p=posOf(g,s);for(const c of s.q.cr)if(!c.gone&&Math.hypot(c.x-p.x,c.y-p.y)<(s.cfg.r+10)*mg){answerQ(g,s,c.i,'touch');break;}}
   if(s.q&&s.q.t>=s.q.ttl){for(const c of s.q.cr)c.gone=true;s.learn.missed++;s.q=null;s.nextQ=(g.t||0)+8;dockDirty=true;}
  }
  /* fx clocks */
  for(const p of s.parts){p.life-=dt;if(!p.still){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=260*dt;}}
  s.parts=s.parts.filter(p=>p.life>0);
  for(const f of s.floats){f.life-=dt*1.1;f.y-=26*dt;}
  s.floats=s.floats.filter(f=>f.life>0);
  s.flash=Math.max(0,s.flash-dt/.12*.35);s.shake=Math.max(0,s.shake-dt*32);
  if(s.banner){s.banner.t-=dt;if(s.banner.t<=0)s.banner=null;}
  if(s.rainT>0){s.rainT-=dt;if(!calm()&&s.rng()<.5)s.parts.push({x:40+s.rng()*720,y:70,vx:0,vy:40+s.rng()*80,life:1,max:1,c:'#FFC94A',r:4});}
  if(s.card)cardTick(s,dt);
  hudTick(g,s);
 }
 function wrapTick(Class){
  const orig=Class.prototype.tick;
  Class.prototype.tick=function(dt){
   if(inTick||this.preview||this!==pgGame||this.done)return orig.call(this,dt);
   let s;try{s=stateOf(this);}catch(e){return orig.call(this,dt);}
   if(s.freeze>0){ if(s.card)cardTick(s,dt); return; }
   let d=dt;
   const sp=this.t!=null&&s.cfg.speed&&!s.forced.noSpeed?[1,1.12,1.25][s.phase-1]:1;
   d=Math.min(dt*sp*(s.slow>0?.7:1),1/50);
   inTick=true;try{orig.call(this,d);}finally{inTick=false;}
   try{afterTick(this,s,dt);}catch(e){console.error('WQArcPlus tick',e);}
  };
  /* input is ignored while the wrong-answer card freezes the game */
  for(const m of ['act','pointer','tool','key']){
   const o=Class.prototype[m];
   Class.prototype[m]=function(...a){
    try{if(!this.preview&&this===pgGame){const s=S_.get(this);if(s&&s.freeze>0&&!(m==='key'&&a[1]===false))return;}}catch(_){}   /* key releases still pass, so no key stays stuck */
    return o.apply(this,a);
   };
  }
  const od=Class.prototype.draw;
  Class.prototype.draw=function(){
   if(inDraw||this.preview||this!==pgGame)return od.apply(this,arguments);
   let s;try{s=stateOf(this);}catch(e){return od.apply(this,arguments);}
   const c=this.c;
   if(!c)return od.apply(this,arguments);
   s.chud=[];
   inDraw=true;try{od.apply(this,arguments);}finally{inDraw=false;}
   try{drawOverlay(this,s,c);}catch(e){console.error('WQArcPlus draw',e);}
   /* the shake moves the canvas element (a few px, <=250 ms), so it also works for games whose art resets the canvas transform */
   try{const cv=c.canvas,k=(cv.clientWidth||800)/800,on=s.shake>0&&!calm();cv.style.transform=on?`translate(${((Math.random()-.5)*2*s.shake*k).toFixed(1)}px,${((Math.random()-.5)*2*s.shake*k).toFixed(1)}px)`:'';}catch(_){}
   perfTick(s);
  };
 }

 /* ---------------------------------------------------------------- canvas overlay: ambient motes, crystals, particles, banner */
 function gem(c,x,y,r,col,t){
  c.save();c.translate(x,y);
  c.globalAlpha=.95;c.fillStyle=col;c.strokeStyle='#fff';c.lineWidth=3;
  c.beginPath();c.moveTo(0,-r*1.15);c.lineTo(r,-r*.2);c.lineTo(r*.6,r*.95);c.lineTo(-r*.6,r*.95);c.lineTo(-r,-r*.2);c.closePath();c.fill();c.stroke();
  c.globalAlpha=.45;c.fillStyle='#fff';c.beginPath();c.moveTo(-r*.5,-r*.25);c.lineTo(0,-r*.95);c.lineTo(r*.25,-r*.25);c.closePath();c.fill();
  c.restore();
 }
 function drawOverlay(g,s,c){
  const calmOn=calm(),T=g.t||0;
  c.save();c.setTransform(c.canvas.width/800,0,0,c.canvas.height/560,0,0);
  /* phase tint + ambient motes */
  if(!calmOn&&s.tier!=='low'||calmOn){
   const n=calmOn?0:(s.tier==='low'?0:10);
   for(let i=0;i<n;i++){
    const x=(i*83+T*(8+i%3*5))%820-10,y=(i*61+Math.sin(T*.6+i)*18+T*(4+i%4*3))%520+20;
    c.globalAlpha=.16+.1*Math.sin(T+i);c.fillStyle=s.phase===3?'#BFD4FF':'#FFF6D0';c.beginPath();c.arc(x,y,2+(i%3),0,7);c.fill();
   }
  }
  /* L3 flagship depth: two drifting layers (far = slow / faint, near = quicker) over the scene; one layer on a slow device, none with reduced motion */
  {const kind=s.cfg.para;if(kind&&!calmOn&&s.tier!=='low'){
   const layers=s.tier==='low'?[1]:[0,1];
   for(const L of layers){
    const sp=L?46:18,al=L?.3:.17,n=L?6:8;
    for(let i=0;i<n;i++){
     const k=i*(L?131:97)+L*37;let x,y,w=(L?46:30)+(i%3)*(L?14:9);
     if(kind==='clouds'){x=((k+T*sp)%1000)-100;y=40+((k*7)%330);c.globalAlpha=al;c.fillStyle='#fff';c.beginPath();c.ellipse(x,y,w*1.4,w*.42,0,0,7);c.ellipse(x+w*.6,y-w*.14,w*.8,w*.34,0,0,7);c.fill();}
     else if(kind==='bokeh'){x=(k*3)%800;y=560-((k*5+T*sp*.6)%620)+30;c.globalAlpha=al*.9;c.fillStyle=i%2?'#FFD27A':'#FFB0D0';c.beginPath();c.arc(x+Math.sin(T+i)*10,y,w*.45,0,7);c.fill();}
     else if(kind==='petals'){x=((k*3+T*sp*.5)%900)-50;y=((k*5+T*sp*.9)%620)-30;c.globalAlpha=al;c.fillStyle='#FFC94A';c.save();c.translate(x,y);c.rotate(T*.8+i);c.beginPath();for(let j=0;j<6;j++){const a=j*Math.PI/3;c.lineTo(Math.cos(a)*w*.28,Math.sin(a)*w*.28);}c.closePath();c.fill();c.restore();}
     else if(kind==='digits'){x=(k*3)%800;y=560-((k*5+T*sp*.5)%620)+30;c.globalAlpha=al*.8;c.fillStyle='#fff';c.font='900 '+Math.round(w*.9)+'px "Noto Sans TC",system-ui,sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText(String(1+(i*3+L)%9),x,y);}
     else if(kind==='streaks'){x=800-((k*3+T*sp*3)%1000)+100;y=30+((k*7)%500);c.globalAlpha=al;c.strokeStyle='#fff';c.lineWidth=2+L*2;c.beginPath();c.moveTo(x,y);c.lineTo(x+w*1.6,y);c.stroke();}
    }
   }
   c.globalAlpha=1;
  }}
  /* edge glow joins the pastel scene to the dark shell */
  c.globalAlpha=1;
  if(s.tier!=='low'){   /* a slow device skips the glow strips */
   const gr=s.gr||(s.gr=(()=>{const q=c.createLinearGradient(0,0,0,560);q.addColorStop(0,'rgba(11,16,48,.28)');q.addColorStop(.12,'rgba(11,16,48,0)');q.addColorStop(.88,'rgba(11,16,48,0)');q.addColorStop(1,'rgba(11,16,48,.30)');return q;})());
   c.fillStyle=gr;c.fillRect(0,0,800,68);c.fillRect(0,492,800,68);
  }
  if(s.phase>=2&&!calmOn&&s.tier!=='low'){c.globalAlpha=s.phase===2?.07:.12;c.fillStyle=s.phase===2?'#FF9A3C':'#6A5CFF';c.fillRect(0,0,800,560);c.globalAlpha=1;}
  /* crystals */
  if(s.q&&!s.cfg.dockOnly){   /* board / puzzle games: the question lives in the dock so nothing covers the board */
   for(const cr of s.q.cr){
    if(cr.gone)continue;
    const bob=calmOn?0:Math.sin(T*2.2+cr.ph)*7,fade=s.q.t>s.q.ttl-2?(.4+.6*Math.abs(Math.sin(T*8))):1;
    c.globalAlpha=fade;gem(c,cr.x,cr.y+bob,36,cr.col,T);
    c.globalAlpha=1;c.font='900 24px "Noto Sans TC",system-ui,sans-serif';c.textAlign='center';c.textBaseline='middle';
    c.lineWidth=5;c.strokeStyle='rgba(20,16,60,.88)';c.strokeText(cr.o.label,cr.x,cr.y+bob+62);c.fillStyle='#fff';c.fillText(cr.o.label,cr.x,cr.y+bob+62);
   }
  }
  {const GH=GAME_HOOKS[s.id];if(GH&&GH.draw){try{GH.draw(g,s,c);}catch(e){console.error('WQArcPlus hook draw',e);}}}
  /* particles */
  for(const p of s.parts){c.globalAlpha=clamp(p.life/p.max*1.4,0,1);c.fillStyle=p.c;
   if(p.still){c.beginPath();for(let i=0;i<10;i++){const rr=i%2?p.r*.45:p.r,a=i*Math.PI/5-Math.PI/2;c.lineTo(p.x+Math.cos(a)*rr,p.y+Math.sin(a)*rr);}c.fill();}
   else{c.beginPath();c.arc(p.x,p.y,p.r,0,7);c.fill();}}
  /* floating text */
  c.textAlign='center';c.textBaseline='middle';
  for(const f of s.floats){c.globalAlpha=clamp(f.life*1.5,0,1);c.font='900 '+f.size+'px "Noto Sans TC",system-ui,sans-serif';c.lineWidth=7;c.lineJoin='round';c.strokeStyle='rgba(20,16,60,.96)';c.strokeText(f.txt,f.x,f.y);c.fillStyle=f.c;c.fillText(f.txt,f.x,f.y);}
  c.globalAlpha=1;
  if(s.flash>0){c.globalAlpha=s.flash;c.fillStyle='#fff';c.fillRect(0,0,800,560);c.globalAlpha=1;}
  if(s.banner){
   const k=clamp(s.banner.t/.95,0,1),a=k>.8?(1-k)/.2:k<.2?k/.2:1;
   c.globalAlpha=a;c.fillStyle='rgba(18,24,68,.82)';c.beginPath();c.roundRect?c.roundRect(200,70,400,s.banner.sub?84:64,18):c.rect(200,70,400,64);c.fill();
   c.strokeStyle='rgba(255,255,255,.2)';c.lineWidth=2;c.stroke();
   c.fillStyle='#FFC94A';c.font='900 34px "Noto Sans TC",system-ui,sans-serif';c.fillText(s.banner.text,400,s.banner.sub?96:102);
   if(s.banner.sub){c.fillStyle='#E8ECFF';c.font='700 18px "Noto Sans TC",system-ui,sans-serif';c.fillText(s.banner.sub,400,128);}
   c.globalAlpha=1;
  }
  c.restore();
 }
 /* the 18 games drawn with D.bg get a soft parallax backdrop (two cloud / star layers); 3 flagship + 5 R2 ones use their own art helpers. */
 try{
  const bgOrig=D.bg;
  D.bg=function(c,type){
   const out=bgOrig.apply(this,arguments);
   try{const g=live();if(g&&g.c===c&&!calm())backdrop(g,c);}catch(_){}
   return out;
  };
 }catch(_){}
 function backdrop(g,c){
  const s=S_.get(g);if(!s||s.tier==='low')return;
  const T=g.t||0,ph=s.phase;
  c.save();c.setTransform(c.canvas.width/800,0,0,c.canvas.height/560,0,0);
  const night=ph===3;
  /* three drifting layers: far (slow, small), mid, near (fast, larger, fainter) */
  for(let L=0;L<3;L++){
   c.globalAlpha=[.11,.09,.07][L];c.fillStyle=night?'#CFE0FF':'#FFFFFF';
   const sp=[5,11,22][L],sz=[46,64,92][L],n=[6,4,3][L];
   for(let i=0;i<n;i++){const x=((i*(1000/n)+T*sp)%1000)-100,y=[80,170,300][L]+(i*53%90)+L*12;
    c.beginPath();c.ellipse(x,y,sz,sz*.26,0,0,7);c.fill();c.beginPath();c.ellipse(x+sz*.4,y-sz*.1,sz*.6,sz*.22,0,0,7);c.fill();}
  }
  /* sky-rescue: wave 2 is a storm (rain streaks), wave 3 a meteor night; other games keep the soft tint */
  if(g.meta.id==='sky-rescue'){
   if(ph===2){c.globalAlpha=.28;c.fillStyle='#4B5C86';c.fillRect(0,0,800,560);c.globalAlpha=.35;c.strokeStyle='#DDEBFF';c.lineWidth=2;
    for(let i=0;i<36;i++){const x=((i*47+T*180)%860)-30,y=((i*71+T*520)%600)-20;c.beginPath();c.moveTo(x,y);c.lineTo(x-9,y+26);c.stroke();}}
   else if(ph===3){c.globalAlpha=.42;c.fillStyle='#161B45';c.fillRect(0,0,800,560);c.globalAlpha=.8;c.fillStyle='#FFF6D0';
    for(let i=0;i<30;i++){c.beginPath();c.arc((i*97+13)%800,(i*53+7)%330,1.4+(i%3)*.5,0,7);c.fill();}
    c.strokeStyle='#FFE9A8';c.lineWidth=3;c.globalAlpha=.7;for(let i=0;i<3;i++){const k=((T*.5+i*.37)%1),x=860-k*1000-i*60,y=-20+k*620*.5+i*40;c.beginPath();c.moveTo(x,y);c.lineTo(x+70,y-35);c.stroke();}}
  }
  c.restore();
 }
 /* flagship + R2 games paint their sky through A28.sky / R2.sky */
 try{
  const wrap=(obj)=>{const o=obj.sky;obj.sky=function(c){const out=o.apply(this,arguments);try{const g=live();if(g&&g.c===c&&!calm())backdrop(g,c);}catch(_){}return out;};};
  wrap(A28);wrap(R2);
 }catch(_){}

 /* ---------------------------------------------------------------- performance tier */
 function perfTick(s){
  const now=performance.now();
  if(s.lastNow){const d=now-s.lastNow;if(d<400){s.ft.push(d);if(s.ft.length>150)s.ft.shift();}
   if(s.ft.length>=100&&!s.forced.tier){const avg=s.ft.reduce((a,b)=>a+b,0)/s.ft.length;
    if(avg>22&&s.tier==='high'){s.tier='low';s.parts.length=Math.min(s.parts.length,24);}
    else if(avg<17&&s.tier==='low'&&s.ft.length>=140)s.tier='high';}}
  s.lastNow=now;
 }

 /* ---------------------------------------------------------------- DOM HUD + dock */
 let hudEl=null,dockEl=null,dockDirty=true,lastLay='';
 const HEART='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 21s-7.5-4.6-9.4-9.2C1.2 8.4 3 5 6.3 5c2 0 3.5 1.1 4.2 2.6C11.2 6.1 12.7 5 14.7 5 18 5 19.8 8.4 18.4 11.8 16.5 16.4 12 21 12 21z" transform="translate(.6 0)"/></svg>';
 function mount(g,s){
  const vp=document.querySelector('.a28-viewport');if(!vp)return null;
  const play=vp.closest('.a28-play');
  if(play&&!play.classList.contains('ap-on'))play.classList.add('ap-on');
  if(play&&s&&play.dataset.apGame!==s.id)play.dataset.apGame=s.id;
  if(play)play.classList.toggle('ap-done',!!(s&&s.final&&!pgPlaying));   /* result screen: the dock needs no room for a question */
  if(!hudEl||hudEl.parentNode!==vp){
   hudEl=vp.querySelector(':scope>.ap-hud')||document.createElement('div');hudEl.className='ap-hud';hudEl.dataset.ap='hud';
   hudEl.innerHTML=`<span class="ap-lives" role="img" aria-label="生命"></span><span class="ap-score"><b>0</b><small>分</small></span><span class="ap-mult" data-m="1" role="img" aria-label="連擊倍率"><svg viewBox="0 0 36 36" aria-hidden="true"><circle cx="18" cy="18" r="15" class="bg"/><circle cx="18" cy="18" r="15" class="fg" pathLength="100"/></svg><b>×1</b></span><span class="ap-wave">第 1 段</span><span class="ap-name"></span><i class="ap-prog" role="progressbar" aria-label="進度" aria-valuemin="0" aria-valuemax="100"><b></b></i>`;
   vp.prepend(hudEl);
  }
  if(!dockEl||dockEl.parentNode!==vp){
   dockEl=vp.querySelector(':scope>.ap-dock')||document.createElement('div');dockEl.className='ap-dock';dockEl.dataset.ap='dock';
   const cv=vp.querySelector('#pg-canvas');if(cv&&cv.nextSibling)vp.insertBefore(dockEl,cv.nextSibling);else vp.appendChild(dockEl);
   dockDirty=true;
  }
  const cv=vp.querySelector('#pg-canvas');
  if(cv&&!cv.dataset.apPtr){cv.dataset.apPtr='1';cv.addEventListener('pointerdown',canvasDown,true);}
  return vp;
 }
 function canvasDown(e){
  const g=live();if(!g)return;const s=S_.get(g);if(!s||!s.q||s.freeze>0||s.cfg.dockOnly)return;
  const cv=e.currentTarget,r=cv.getBoundingClientRect(),x=(e.clientX-r.left)/r.width*800,y=(e.clientY-r.top)/r.height*560;
  const T=g.t||0;
  for(const cr of s.q.cr){
   if(cr.gone)continue;const by=cr.y+(calm()?0:Math.sin(T*2.2+cr.ph)*7);
   if(Math.hypot(x-cr.x,y-by)<54){e.stopImmediatePropagation();e.preventDefault();answerQ(g,s,cr.i,'tap');return;}
  }
 }
 document.addEventListener('keydown',e=>{
  const g=live();if(!g)return;const s=S_.get(g);if(!s||!s.q||s.freeze>0)return;
  const m=/^(?:Digit|Numpad)([1-3])$/.exec(e.code||'');if(!m)return;
  e.preventDefault();e.stopImmediatePropagation();answerQ(g,s,+m[1]-1,'key');
 },true);
 function hudTick(g,s){
  const vp=mount(g,s);if(!vp)return;
  const L=livesOf(g);
  const H=hudEl._c||(hudEl._c={lv:hudEl.querySelector('.ap-lives'),b:hudEl.querySelector('.ap-score b'),mm:hudEl.querySelector('.ap-mult'),fg:hudEl.querySelector('.ap-mult .fg'),mb:hudEl.querySelector('.ap-mult b'),wave:hudEl.querySelector('.ap-wave'),nm:hudEl.querySelector('.ap-name'),pb:hudEl.querySelector('.ap-prog')});
  const lv=H.lv;
  const key='L'+L+'S'+(s.shield?1:0);
  if(lv.dataset.k!==key){lv.dataset.k=key;const n=Math.max(3,L||0);lv.innerHTML=L==null?'':Array.from({length:Math.min(5,n)},(_,i)=>`<i class="${i<L?'on':''}">${HEART}</i>`).join('')+(s.shield?'<i class="sh" title="護盾">🛡️</i>':'');lv.setAttribute('aria-label',L==null?'無生命':`生命 ${L} 格`);}
  const sc=Math.floor(g.score||0),b=H.b;if(b.textContent!==String(sc))b.textContent=sc;
  const m=clamp(multOf(s.combo)*(s.x2>0?2:1),1,8),mm=H.mm;
  if(mm.dataset.m!==String(m)){mm.dataset.m=String(m);H.mb.textContent='×'+m;if(!calm()){mm.classList.remove('pop');void mm.offsetWidth;mm.classList.add('pop');}}
  const nxt=MULT.slice().reverse().find(([k])=>k>s.combo),frac=nxt?(s.combo-(MULT.find(([k])=>s.combo>=k)||[0])[0])/(nxt[0]-(MULT.find(([k])=>s.combo>=k)||[0])[0]):1;
  {const off=String(Math.round(100-100*clamp(s.x2>0?s.x2/12:frac,0,1)));if(H.fg.dataset.o!==off){H.fg.dataset.o=off;H.fg.style.strokeDashoffset=off;}}
  {const w='第 '+s.phase+' / 3 段';if(H.wave.textContent!==w)H.wave.textContent=w;}
  const nm=H.nm;if(!nm.textContent){try{nm.textContent=(a28Meta(s.id)||{}).name||'';}catch(_){}}
  const pr=Math.round(progOf(g,s)*100),pb=H.pb;if(pb.dataset.v!==String(pr)){pb.dataset.v=String(pr);pb.firstChild.style.width=pr+'%';pb.setAttribute('aria-valuenow',pr);}
  dockPaint(g,s);layout(vp);
 }
 function dockPaint(g,s){
  if(!dockEl)return;
  const q=s.q;
  const sig=(q?'q'+s.qCount+(q.cr.map(c=>c.gone?1:0).join('')):'n')+'|'+(s.shield?1:0)+(s.x2>0?1:0)+(s.slow>0?1:0)+(s.magnet>0?1:0)+'|'+(s.card?1:0);
  if(!q&&!s.card){const w=dockEl.querySelector('.ap-w');if(w){const v=String(Math.max(0,Math.ceil(s.nextQ-(g.t||0))));if(w.textContent!==v)w.textContent=v;}}   /* the countdown is one text node, not a re-render */
  if(!dockDirty&&dockEl.dataset.sig===sig)return;
  dockDirty=false;dockEl.dataset.sig=sig;
  const buffs=[s.shield?'<span class="ap-chip sh">🛡️ 護盾</span>':'',s.x2>0?`<span class="ap-chip x2">×2 ${Math.ceil(s.x2)}s</span>`:'',s.slow>0?'<span class="ap-chip">🐢 慢動作</span>':'',s.magnet>0?'<span class="ap-chip">🧲 磁石</span>':''].join('');
  if(noLearn()){dockEl.innerHTML=`<div class="ap-tip">學習挑戰已關閉</div><div class="ap-buffs">${buffs}</div>`;return;}
  if(q){
   dockEl.innerHTML=`<div class="ap-q"><span class="ap-qp" lang="${q.type==='word'?'zh':'en'}">${esc2(q.prompt)}</span>${q.type==='word'?'<button type="button" class="ap-say" data-ap="say" aria-label="聽發音">🔊</button>':''}<span class="ap-qh">${q.pos?'碰到或點選正確的字晶':'點選正確的字晶（或按 1 2 3）'}</span></div><div class="ap-opts" role="group" aria-label="選擇答案">${q.cr.map((c,i)=>`<button type="button" class="ap-opt" data-ap="opt" data-i="${i}" ${c.gone?'disabled':''}><b>${i+1}</b><span lang="en">${esc2(c.o.label)}</span></button>`).join('')}</div><div class="ap-buffs">${buffs}</div>`;
  }else{
   const wait=Math.max(0,Math.ceil(s.nextQ-(g.t||0)));
   dockEl.innerHTML=`<div class="ap-tip"><span class="ap-tl"><span class="ap-gem">◆</span> ${s.card?'學習時刻':'下一顆字晶 <span class="ap-w">'+wait+'</span> 秒'}</span><small>${s.cfg.math?'答對算式有強化':'答對英文字有強化，答錯不扣命'}</small></div><div class="ap-buffs">${buffs}</div>`;
  }
 }
 document.addEventListener('click',e=>{
  const el=e.target.closest&&e.target.closest('[data-ap]');if(!el)return;
  const g=live();if(!g)return;const s=S_.get(g);if(!s)return;
  if(el.dataset.ap==='opt'&&s.q)answerQ(g,s,+el.dataset.i,'chip');
  else if(el.dataset.ap==='say'&&s.q){try{r37Speak(s.q.say||s.q.answer);}catch(_){}}
 });
 /* layout: reserve room for the HUD (above) and the dock (below) so r2Fit sizes the canvas to what is left */
 function reserve(v){
  try{
   if(!hudEl||!dockEl||hudEl.parentNode!==v)return 0;
   const cs=getComputedStyle(v),gap=parseFloat(cs.rowGap)||0;
   let h=hudEl.offsetHeight+gap+(parseFloat(cs.paddingTop)||0)+(parseFloat(cs.paddingBottom)||0);
   const dc=getComputedStyle(dockEl);if(dc.display!=='none'&&dc.position!=='absolute')h+=dockEl.offsetHeight+gap;
   return h;
  }catch(_){return 0;}
 }
 let lastLayT=0;
 const overlayUp=()=>{const o=document.getElementById('pg-overlay');return !!(o&&!o.hidden);};
 /* The one-screen play layout (see the contract at the end of s70_arcplus.css): the play page gets the window height that is left under its top
  * edge (--ap-h); CSS does the rest, r2Fit() then fits the canvas into whatever the viewport has left after the HUD and the dock. */
 function layout(v){
  const play=v.closest('.a28-play');if(!play)return;
  const phone=innerWidth<700&&innerHeight>=innerWidth;
  const nowL=performance.now();if(!lastLay.startsWith('!')&&lastLay&&nowL-lastLayT<250&&!dockDirty)return;lastLayT=nowL;
  const sig=innerWidth+'x'+innerHeight+(hudEl?hudEl.offsetHeight:0)+(dockEl?dockEl.offsetHeight:0)+[...document.querySelectorAll('.a28-touch-key')].filter(e=>e.offsetParent).length+(overlayUp()?'o':'')+(play.classList.contains('ap-done')?'d':'');
  if(sig===lastLay)return;lastLay=sig;
  play.classList.toggle('ap-phone',phone);play.classList.toggle('ap-land',innerHeight<520&&innerWidth>innerHeight);
  if(play.classList.contains('r2-immersive')){play.classList.remove('ap-fit');play.style.removeProperty('--ap-h');}
  else{
   play.classList.add('ap-fit');play.classList.toggle('ap-short',phone&&innerHeight<700);
   const pr=play.getBoundingClientRect(),main=play.closest('main')||document.body,tail=Math.max(0,main.getBoundingClientRect().bottom-pr.bottom);
   const h=Math.max(300,Math.floor(innerHeight-(pr.top+scrollY)-tail));
   play.style.setProperty('--ap-h',h+'px');
   v.style.height='';
   if(scrollY>0)scrollTo(0,0);
   const vh=v.clientHeight,tight=!phone&&vh<470;if(play.classList.contains('ap-tight')!==tight)play.classList.toggle('ap-tight',tight);
  }
  try{r2Fit();}catch(_){}
 }
 addEventListener('resize',()=>{lastLay='';});

 /* ---------------------------------------------------------------- result block + clear / fail sound */
 const priorComplete=a28Complete;
 a28Complete=function(result){
  try{
   const g=live();
   if(g&&pgPlaying){const s=S_.get(g);
    if(s){hideCard(s,true);s.freeze=0;s.q=null;
     try{const cb=typeof WQArc!=='undefined'&&WQArc._combo(g),m=Math.max(s.maxCombo,cb?cb.max:0);s.maxCombo=m;if(cb)cb.max=m;}catch(_){}   /* one combo number: the card, the s35 record and _debug agree */
     const win=(()=>{try{return a28Winning(g);}catch(_){return false;}})();
     s.final={win,score:Math.floor(g.score||0),maxCombo:s.maxCombo,phase:s.phaseMax,learn:s.learn.log.slice(),ok:s.learn.ok,bad:s.learn.bad};
     sfx(s,win?'clear':'fail');
     {const pl=document.querySelector('.a28-play.ap-on');if(pl){pl.classList.add('ap-done');lastLay='';}}
     if(win&&!calm()){burst(s,400,260,24,['#FFC94A','#FF8FC7','#7CC8FF','#fff']);}
    }}
  }catch(e){console.error('WQArcPlus complete',e);}
  return priorComplete.apply(this,arguments);
 };
 function resultHtml(f){
  /* wrong ones first (they are the ones to remember), at most 2 lines, the rest as "＋N 個" - never hidden by clipping */
  const sorted=f.learn.slice().sort((a,b)=>(a.ok?1:0)-(b.ok?1:0)),shown=sorted.slice(0,2),more=sorted.length-shown.length;
  const items=f.learn.length?shown.map(x=>x.ok?`<li class="ok"><b>✓</b> ${esc2(x.fix)}</li>`:`<li class="bad"><b>✗</b> ${esc2(x.fix)}<small>（你選了 ${esc2(x.picked)}）</small></li>`).join('')+(more>0?`<li class="more">＋${more} 個</li>`:''):'<li class="none">本局未遇到字晶</li>';
  return `<div class="ap-res" data-ap="result"><div class="ap-rs"><span><b>×${f.maxCombo}</b><small>最高連擊</small></span><span><b>${f.phase}/3</b><small>到達波次</small></span><span><b>${f.ok}/${f.ok+f.bad}</b><small>字晶答對</small></span></div><ul class="ap-rl" aria-label="本局生字">${items}</ul></div>`;
 }
 const priorOverlay2=pgOverlay;
 pgOverlay=function(){
  const out=priorOverlay2.apply(this,arguments);
  try{
   const g=pgGame;if(g&&!g.preview&&COIN28.ids.includes(g.meta.id)){
    const s=S_.get(g);
    if(s&&s.final&&!pgPlaying){const card=document.querySelector('#pg-overlay .a28-overlaycard');if(card&&!card.querySelector('.ap-res')){const f=s.final,line=`最高連擊 ×${f.maxCombo} · 到達 ${f.phase}/3 波`+(f.ok+f.bad?` · 字晶 ${f.ok}/${f.ok+f.bad}`:''),nx=[...card.querySelectorAll('.arx-next')].find(e=>/最高連擊/.test(e.textContent));if(nx){nx.textContent=line;if(!f.learn.length){card.classList.add('ap-has-res');return out;}}const anchor=card.querySelector('.arx-res')||card.querySelector('.wq34-result')||card.querySelector('p');const t=document.createElement('template');t.innerHTML=resultHtml(s.final);if(anchor)anchor.after(t.content);else card.prepend(t.content);card.classList.add('ap-has-res');}}
    stateOf(g);mount(g,S_.get(g));
   }
  }catch(e){console.error('WQArcPlus overlay',e);}
  return out;
 };

 /* ---------------------------------------------------------------- the canvas HUDs of the 8 A28 / R2 games are replaced by the DOM HUD */
 try{
  const aHud=A28.hud;A28.hud=function(c){const g=live();if(g&&g.c===c)return;return aHud.apply(this,arguments);};
  const rHud=R2.hud;R2.hud=function(gm){const g=live();if(g&&g===gm)return;return rHud.apply(this,arguments);};
 }catch(_){}

 /* ---------------------------------------------------------------- the 18 D-art games print their small info boxes through D.badge / D.message in pale pastel;
  * while really playing they get the dark glass of the shell (same place, size and words). Lobby thumbnails / previews (live() false) keep the original art. */
 const GLASS={fill:'rgba(18,24,68,.88)',edge:'rgba(255,255,255,.18)',ink:'#F4F6FF'};
 function glassLabel(c,x,y,w,h,r,text,size,weight){
  D.round(c,x,y,w,h,r,GLASS.fill);c.lineWidth=1;D.round(c,x,y,w,h,r,null,GLASS.edge);
  D.text(c,text,x+w/2,y+h/2,size,GLASS.ink,'center',weight);
 }
 function noteLabel(g,kind,text,x,y,w,h){try{const s=S_.get(g);if(s){if(!s.chud)s.chud=[];if(s.chud.length<12)s.chud.push({kind,text:String(text),x:Math.round(x),y:Math.round(y),w:Math.round(w),h:Math.round(h),fill:GLASS.fill,color:GLASS.ink});}}catch(_){}}
 try{
  const bOrig=D.badge,mOrig=D.message;
  D.badge=function(c,text,x=400,y=40){
   const g=live();if(!(g&&g.c===c))return bOrig.apply(this,arguments);
   const w=Math.max(85,String(text).length*15+28);
   glassLabel(c,x-w/2,y-18,w,36,12,text,14,700);noteLabel(g,'badge',text,x-w/2,y-18,w,36);
  };
  D.message=function(c,text){
   const g=live();if(!(g&&g.c===c))return mOrig.apply(this,arguments);
   glassLabel(c,150,474,500,49,16,text,16,700);noteLabel(g,'message',text,150,474,500,49);
  };
 }catch(_){}

 /* ---------------------------------------------------------------- install on every registered game */
 let installed=false;
 function install(){
  if(installed)return;installed=true;
  for(const m of WQGames){if(!COIN28.ids.includes(m.id))continue;CAT[m.id]=m.category;try{wrapTick(m.Class);}catch(e){console.error('WQArcPlus install '+m.id,e);}}
 }
 install();

 /* ---------------------------------------------------------------- public / debug */
 function dbg(){
  const g=live();if(!g)return null;const s=stateOf(g);
  return {id:s.id,cat:s.cat,phase:s.phase,phaseMax:s.phaseMax,mult:multOf(s.combo)*(s.x2>0?2:1),combo:s.combo,maxCombo:s.maxCombo,bonus:s.bonus,hits:s.hits,
   shield:s.shield,x2:+s.x2.toFixed(1),slow:+s.slow.toFixed(1),magnet:+s.magnet.toFixed(1),events:s.events.slice(),sfxLog:s.sfxLog.slice(),
   tier:s.tier,shake:calm()?0:+s.shake.toFixed(2),shakePeak:calm()?0:+(s.shakeMax||0).toFixed(2),flash:calm()?0:+s.flash.toFixed(3),parts:s.parts.length,floats:s.floats.length,banner:s.banner?{text:s.banner.text,t:+s.banner.t.toFixed(2)}:null,
   canvasHud:(s.chud||[]).slice(),hudShown:hudShown(),frozen:s.freeze>0,card:s.card?{ok:s.card.ok,t:+s.card.t.toFixed(2),min:s.card.min,max:s.card.max,disabled:s.card.go.disabled}:null,
   q:s.q?{type:s.q.type,kind:s.q.kind,prompt:s.q.prompt,answer:s.q.answer,opts:s.q.cr.map(c=>({label:c.o.label,ok:c.o.ok,x:c.x,y:c.y,gone:c.gone})),pos:s.q.pos,t:+s.q.t.toFixed(1)}:null,
   learn:{asked:s.learn.asked,ok:s.learn.ok,bad:s.learn.bad,missed:s.learn.missed,lastCardMs:s.learn.lastCardMs,log:s.learn.log.slice()},nextQ:+(s.nextQ-(g.t||0)).toFixed(1),
   cfg:{thr:s.cfg.thr,speed:s.cfg.speed,pos:!!s.cfg.pos,math:!!s.cfg.math,lives:livesOf(g)},reduced:calm(),final:s.final};
 }
 /* what the DOM HUD shows right now, read back from the DOM (tests compare it with the engine) */
 function hudShown(){
  try{if(!hudEl||!hudEl.isConnected)return null;const lv=hudEl.querySelectorAll('.ap-lives i:not(.sh)');return {lives:lv.length?hudEl.querySelectorAll('.ap-lives i.on').length:null,score:+(hudEl.querySelector('.ap-score b').textContent||0)};}catch(_){return null;}
 }
 function force(kind,arg){
  const g=live();if(!g)return false;const s=stateOf(g);
  const r=force2(g,s,kind,arg);try{hudTick(g,s);}catch(_){}return r;
 }
 function force2(g,s,kind,arg){
  if(kind==='learn'){s.nextQ=0;if(s.q){for(const c of s.q.cr)c.gone=true;s.q=null;}const r=startQ(g,s,'force');if(s.q)s.q.ttl=120;return r;}   /* a forced question starts fresh and does not expire while a slow test works on it */
  if(kind==='answer'){if(!s.q)return false;const i=s.q.cr.findIndex(c=>c.o.ok===(arg!==false));answerQ(g,s,i<0?0:i,'force');return true;}
  if(kind==='phase'){s.forced.phase=Math.min(3,(arg||s.phase+1));setPhase(g,s,s.forced.phase,'force');return true;}
  if(kind==='event'){fireEvent(g,s,arg||'double','force');return true;}
  if(kind==='good'){s.combo++;s.maxCombo=Math.max(s.maxCombo,s.combo);s.mult=multOf(s.combo);return true;}
  if(kind==='combo'){s.combo=arg|0;s.maxCombo=Math.max(s.maxCombo,s.combo);s.mult=multOf(s.combo);return true;}
  if(kind==='score'){g.score=(g.score||0)+(arg|0);return true;}   /* a plain score jump, as the engine itself would add */
  if(kind==='tier'){s.forced.tier=1;s.tier=arg==='low'?'low':'high';if(s.tier==='low')s.parts.length=Math.min(s.parts.length,24);return true;}
  if(kind==='clear'){burst(s,400,260,24,['#FFC94A','#fff']);sfx(s,'clear');return true;}
  if(kind==='burst'){burst(s,400,280,arg||40,['#FFC94A','#fff','#7CC8FF']);return true;}
  if(kind==='lose'){const L=livesOf(g);if(typeof g.health==='number'){g.health=Math.max(0,g.health-1);return true;}return false;}
  if(kind==='shield'){s.shield=true;return true;}
  if(kind==='god'){s.forced.god=arg!==false;return true;}
  return false;
 }
 return {reserve,addLife,bonusOf:g=>{try{const s=g&&S_.get(g);return s?s.bonus:0;}catch(_){return 0;}},maxCombo:g=>{try{const s=g&&S_.get(g);return s?s.maxCombo:0;}catch(_){return 0;}},summary:g=>{const s=g&&S_.get(g);return s?s.final:null;},
  _debug:dbg,_force:force,cfg:CFG,hooks:ARC_HOOKS,game:GAME_HOOKS,multOf,posOf,cfgOf,isAct,stateOf,burst,floatText,banner,logEv,sfx,calm,
  get hud(){return hudEl;},get dock(){return dockEl;}};
})();
