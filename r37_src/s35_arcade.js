/* R3.8 s35 - Arcade+ : one shared reward layer over the 26 legacy arcade games (see s35_arcade.css).
 * Star challenges, record fanfare, live combo badge, achievements and an optional vocab power-up.
 * Rules: never adds a property to a game instance (snapshot validation rejects unknown keys; all per-game state lives in WeakMaps),
 * never changes a game's rules or score, every DOM element it creates is outside the game canvas. Persistent data: r37Get().arc. */
const WQArc=(()=>{
 'use strict';
 const nf=n=>Math.max(0,Math.floor(Number(n)||0)).toLocaleString('en-US');
 const calm=()=>{try{return r37Calm();}catch(_){return false;}};
 const CATS=['動作','運動','解謎','策略','創作'],CICON={動作:'🏃',運動:'⚽',解謎:'🧩',策略:'♟️',創作:'🎨'};
 /* Score targets [★1,★2,★3]. Tuned from the engines' scoring rules and from scripted random-input runs (a random bot lands around ★0-★1,
  * a careful child reaches ★2, a full clear / very good run reaches ★3). Unknown ids fall back to the category default. */
 const CAT_DEF={動作:[400,1000,2000],運動:[300,800,1500],解謎:[500,1200,2200],策略:[500,1500,3000],創作:[500,1200,2200]};
 const TARGETS={
  'valley-race':[1200,3000,5500],'drift-path':[300,900,1800],'moon-bells':[150,500,1200],
  'forest-pong':[300,800,1500],'bounce-basket':[6,12,18],'meadow-cricket':[15,30,45],'harbor-volley':[300,900,1500],
  'honey-delivery':[300,900,1500],'rolling-block':[800,2000,3500],'juice-lines':[400,1000,1800],'color-workshop':[600,1800,3200],'little-engineer':[200,600,1500],
  'number-garden':[1500,4000,8000],'color-orbit':[600,1500,3000],'honeycomb-puzzle':[200,600,1200],'garden-paths':[200,500,1000],'block-studio':[500,1500,3500],
  'forest-band':[2,4,8],'star-rhythm':[800,1800,3000],'sweet-studio':[500,1200,2200],
  'sky-rescue':[500,1200,2200],'forest-dash':[600,1400,2400],'ruins-courier':[500,1200,2200],'cloud-island':[500,1500,2800],'star-patrol':[800,2500,6000],'lighthouse-well':[800,2000,3500]
 };
 const gameIds=()=>{try{return COIN28.ids.slice();}catch(_){return Object.keys(TARGETS);}};
 const metaOf=id=>{try{return a28Meta(id)||null;}catch(_){return null;}};
 const catOf=id=>(metaOf(id)||{}).category||'';
 const nameOf=id=>(metaOf(id)||{}).name||id;
 function targets(id){const t=TARGETS[id]||CAT_DEF[catOf(id)]||CAT_DEF.動作;return t.slice();}
 function starsFor(id,score){const s=Number(score)||0;return targets(id).reduce((n,t)=>n+(s>=t?1:0),0);}
 const totalMax=()=>gameIds().length*3;

 /* ---------------------------------------------------------------- persistent store */
 const isObj=o=>o&&typeof o==='object'&&!Array.isArray(o);
 function A(){
  const o=r37Get();let a=o.arc;if(!isObj(a))a=o.arc={};
  for(const k of ['st','best','plays','ach'])if(!isObj(a[k]))a[k]={};
  for(const k of ['recs','combo','shields'])if(!Number.isFinite(a[k]))a[k]=0;
  return a;
 }
 const save=()=>{try{r37Save();}catch(_){}};
 const totalStars=a=>Object.values((a||A()).st).reduce((n,v)=>n+(Number(v)||0),0);
 function legacyBest(id){try{const b=a28Child().bests||{};return Math.max(0,...[0,1,2].map(d=>Number(b[id+'|'+d])||0));}catch(_){return 0;}}
 function bestOf(id){const a=A();return Number.isFinite(a.best[id])?a.best[id]:legacyBest(id);}

 /* ---------------------------------------------------------------- achievements */
 const nDiff=a=>Object.keys(a.plays).filter(k=>a.plays[k]>0).length;
 const catStar=(a,c)=>gameIds().some(id=>catOf(id)===c&&(a.st[id]||0)>=1);
 const ACH=[
  {id:'first',icon:'🎮',name:'初次登場',desc:'完成 1 局街機遊戲',prog:a=>[Math.min(1,Object.values(a.plays).reduce((n,v)=>n+v,0)),1],ok:a=>Object.values(a.plays).reduce((n,v)=>n+v,0)>=1},
  {id:'g5',icon:'🗺️',name:'五款探險家',desc:'玩過 5 款不同的遊戲',prog:a=>[Math.min(5,nDiff(a)),5],ok:a=>nDiff(a)>=5},
  {id:'s3',icon:'🌟',name:'三星達人',desc:'在任何一款遊戲拿到 3 顆星',prog:a=>[Math.max(0,...Object.values(a.st)),3],ok:a=>Object.values(a.st).some(v=>v>=3)},
  {id:'st10',icon:'⭐',name:'十星閃閃',desc:'累積 10 顆挑戰星',prog:a=>[Math.min(10,totalStars(a)),10],ok:a=>totalStars(a)>=10},
  {id:'st30',icon:'💫',name:'三十星大師',desc:'累積 30 顆挑戰星',prog:a=>[Math.min(30,totalStars(a)),30],ok:a=>totalStars(a)>=30},
  {id:'rec3',icon:'🏆',name:'紀錄製造機',desc:'打破自己的最高分 3 次',prog:a=>[Math.min(3,a.recs),3],ok:a=>a.recs>=3},
  {id:'combo5',icon:'🔥',name:'連擊高手',desc:'在一局裏打出 ×5 連擊',prog:a=>[Math.min(5,a.combo),5],ok:a=>a.combo>=5},
  {id:'shield',icon:'🛡️',name:'生字補給兵',desc:'生字補給 3 題全對，拿到能量盾',prog:a=>[Math.min(1,a.shields),1],ok:a=>a.shields>=1},
  ...CATS.map(c=>({id:'cat_'+c,icon:CICON[c],name:c+'新手',desc:`在「${c}」遊戲拿到至少 1 顆星`,prog:a=>[catStar(a,c)?1:0,1],ok:a=>catStar(a,c)})),
  {id:'allcat',icon:'🌈',name:'五類全能',desc:'五種遊戲類別都拿到星',prog:a=>[CATS.filter(c=>catStar(a,c)).length,5],ok:a=>CATS.every(c=>catStar(a,c))}
 ];
 function checkAch(a){
  a=a||A();const out=[];
  for(const d of ACH)if(!a.ach[d.id]&&d.ok(a)){a.ach[d.id]=Date.now();out.push(d.id);}
  if(out.length)for(const id of out){const d=ACH.find(x=>x.id===id);toastMsg(`🏅 解鎖成就：${d.name}`);}
  return out;
 }

 /* ---------------------------------------------------------------- toast */
 let toastBox=null;
 function toastMsg(txt,ms=3200){
  try{
   if(!toastBox||!toastBox.isConnected){toastBox=document.createElement('div');toastBox.className='arx-toasts';toastBox.setAttribute('role','status');toastBox.setAttribute('aria-live','polite');document.body.appendChild(toastBox);}
   const t=document.createElement('div');t.className='arx-toast';t.textContent=txt;toastBox.appendChild(t);
   while(toastBox.children.length>2)toastBox.firstChild.remove();
   setTimeout(()=>t.remove(),ms);
  }catch(_){}
 }

 /* ---------------------------------------------------------------- per-run state (WeakMaps keyed by the game instance) */
 const runs=new WeakMap(),results=new WeakMap(),combos=new WeakMap(),pws=new WeakMap();
 function runOf(g,id){
  let r=runs.get(g);
  if(!r){r={id,base:bestOf(id),rec:false,counted:false};runs.set(g,r);}
  return r;
 }
 /* the scoring entry point: called once per finished round with the final score */
 function record(id,score,run,opt){
  opt=opt||{};const a=A();score=Math.max(0,Math.floor(Number(score)||0));
  const base=run&&run.base!=null?run.base:bestOf(id);
  const prevStars=a.st[id]||0,stars=starsFor(id,score),top=Math.max(prevStars,stars);
  const record=base>0&&score>base,first=base===0&&score>0,count=record&&!(run&&run.rec);
  if(run&&record)run.rec=true;
  a.plays[id]=(a.plays[id]||0)+(run&&run.counted?0:1);if(run)run.counted=true;
  if(count)a.recs++;
  a.best[id]=Math.max(Number.isFinite(a.best[id])?a.best[id]:0,base,score);
  a.st[id]=top;
  const combo=Math.max(0,Math.floor(Number(opt.combo)||0));a.combo=Math.max(a.combo,combo);
  const t=targets(id),k=t.findIndex(x=>score<x);
  const info={id,score,stars,prevStars,best:top,gained:top-prevStars,record,first,prevBest:base,combo,next:k<0?null:{star:k+1,target:t[k],need:t[k]-score},newAch:[]};
  info.newAch=checkAch(a);
  save();
  if(opt.celebrate!==false)celebrate(info);
  return info;
 }
 function celebrate(info){
  try{
   if(info.gained>0){toastMsg(`⭐ ${nameOf(info.id)}：挑戰星 ${info.best}/3`);try{if(!calm()){r37Fx.confetti(info.best>=3?120:60);r37Fx.text('★ 新星星！',innerWidth/2,innerHeight*.3,'#ffd15c',32);}}catch(_){}setTimeout(()=>{try{playSfx('coin');}catch(_){}},500);}
   else if(info.record){try{if(!calm())r37Fx.burst(innerWidth/2,innerHeight*.35,26);}catch(_){}}
  }catch(_){}
 }
 /* a28Complete hook: figure out whether this call really ends a round (same guard as the host) and score it before the card is drawn */
 const priorComplete=a28Complete;
 a28Complete=function(result){
  try{
   if(pgGame&&pgPlaying&&!pgFree){
    const r=a28Run(),id=pgMeta&&pgMeta.id;
    if(r&&r.game===id&&r.phase==='playing'&&gameIds().includes(id)){
     const cb=combos.get(pgGame);
     results.set(pgGame,record(id,pgGame.score,runOf(pgGame,id),{combo:cb?cb.max:0}));
    }
   }
  }catch(e){console.error('Arcade+ score',e);}
  return priorComplete.apply(this,arguments);
 };

 /* ---------------------------------------------------------------- live combo (pure DOM, polled) */
 const COMBO_WIN=1800;
 const newCombo=()=>({score:null,n:0,last:0,max:0});
 /* a score jump counts as one hit when it is >= 1 point and arrives fast (>= 30 points/s); slow drip scoring (distance, time) is ignored */
 function feed(c,score,now,dt){
  score=Number(score)||0;dt=Math.max(1,Number(dt)||16);
  if(c.score===null){c.score=score;return c;}
  const d=score-c.score;c.score=score;
  if(c.n&&now-c.last>COMBO_WIN)c.n=0;
  if(d>=1&&d/dt*1000>=30){c.n=c.n&&now-c.last<=COMBO_WIN?c.n+1:1;c.last=now;if(c.n>c.max)c.max=c.n;}
  return c;
 }
 const live=c=>c.n>=2&&performance.now()-c.last<=COMBO_WIN;
 let raf=0,lastT=0,badge=null,shieldEl=null,shownN=0;
 function mount(){
  const vp=document.querySelector('.a28-viewport');if(!vp)return null;
  if(!badge||badge.parentNode!==vp){badge=vp.querySelector(':scope>.arx-combo')||document.createElement('div');badge.className='arx-combo';badge.setAttribute('aria-hidden','true');badge.hidden=true;vp.appendChild(badge);}
  if(!shieldEl||shieldEl.parentNode!==vp){shieldEl=vp.querySelector(':scope>.arx-shield')||document.createElement('div');shieldEl.className='arx-shield';shieldEl.setAttribute('aria-hidden','true');shieldEl.hidden=true;shieldEl.textContent='🛡️ 能量盾';vp.appendChild(shieldEl);}
  return vp;
 }
 function paint(g){
  if(!mount())return;
  const c=g&&combos.get(g),p=g&&pws.get(g);
  shieldEl.hidden=!(p&&p.shield);
  if(c&&live(c)){if(shownN!==c.n){shownN=c.n;badge.textContent='×'+c.n+' 連擊';badge.dataset.n=c.n;badge.hidden=false;badge.classList.remove('hit');void badge.offsetWidth;if(!calm())badge.classList.add('hit');}}
  else if(!badge.hidden){badge.hidden=true;shownN=0;badge.textContent='';}
 }
 function loop(t){
  raf=0;
  if(lastRoute!=='playground'||!pgGame){if(badge)badge.hidden=true;shownN=0;return;}
  const g=pgGame,dt=lastT?t-lastT:16;lastT=t;
  try{
   if(pgMeta&&gameIds().includes(pgMeta.id))runOf(g,pgMeta.id);
   let c=combos.get(g);if(!c){c=newCombo();combos.set(g,c);}
   if(pgPlaying)feed(c,g.score,performance.now(),dt);else c.score=null;
   if(!pgPlaying&&c.n){c.n=0;}
   paint(g);
  }catch(e){console.error('Arcade+ poll',e);}
  raf=requestAnimationFrame(loop);
 }
 function ensureLoop(){if(!raf&&lastRoute==='playground'&&pgGame){lastT=0;raf=requestAnimationFrame(loop);}}

 /* ---------------------------------------------------------------- star rows (lobby cards, intro dialog, ready card) */
 function starsHtml(n,cls){return `<span class="arx-stars ${cls||''}" role="img" aria-label="分數挑戰 ${n} / 3 星">${[1,2,3].map(i=>`<i class="${i<=n?'on':''}" aria-hidden="true">★</i>`).join('')}</span>`;}
 function rowHtml(id){
  const a=A(),n=a.st[id]||0,t=targets(id),best=bestOf(id);
  return `<div class="arx-row" data-arx-game="${esc(id)}" data-stars="${n}">${starsHtml(n)}<span class="arx-best${best?'':' none'}">${best?'最高 '+nf(best):'未挑戰'}</span><span class="arx-tg">目標 ${t.map(nf).join(' / ')}</span></div>`;
 }
 function decorateLobby(){
  const cards=document.querySelectorAll('[data-cabinet]');
  for(const c of cards){
   const id=c.dataset.cabinet;if(!id||c.querySelector('.arx-row'))continue;
   const host=c.querySelector('.a28-cabinet-body')||c,anchor=c.querySelector('.p30-desc')||host.querySelector('p');
   const tpl=document.createElement('template');tpl.innerHTML=rowHtml(id);
   if(anchor)anchor.after(tpl.content);else host.prepend(tpl.content);
  }
  const lobby=document.querySelector('.p30-lobby,.a28-lobby');
  if(lobby&&!lobby.querySelector('.arx-bar')){
   const a=A(),n=Object.keys(a.ach).filter(k=>ACH.some(d=>d.id===k)).length,h=lobby.querySelector('h1');
   const bar=document.createElement('div');bar.className='arx-bar';
   bar.innerHTML=`<button type="button" class="arx-btn" data-arx="ach" aria-haspopup="dialog">🏅 成就 <b>${n}/${ACH.length}</b></button><span class="arx-chip" title="挑戰星">⭐ <b>${totalStars(a)}</b>/${totalMax()}</span><span class="arx-hint">每款遊戲有 3 個分數目標</span>`;
   if(h)h.after(bar);else lobby.prepend(bar);
  }
 }
 const priorIntro=typeof pgIntro==='function'?pgIntro:null;
 if(priorIntro){pgIntro=function(id){
  const out=priorIntro.apply(this,arguments);
  try{const box=document.querySelector('#pg-dialog .a28-dialog-content');if(box&&!box.querySelector('.arx-row')&&gameIds().includes(id))box.insertAdjacentHTML('afterbegin',rowHtml(id));}catch(e){console.error('Arcade+ intro',e);}
  return out;
 };}

 /* ---------------------------------------------------------------- result / ready card */
 function resultHtml(info){
  const parts=[];
  if(info.record)parts.push(`<div class="arx-rec" role="status"><b>🏆 新紀錄！</b><span>上次最佳 ${nf(info.prevBest)} → ${nf(info.score)}</span></div>`);
  else if(info.first)parts.push(`<div class="arx-rec first" role="status"><b>🎉 首次紀錄</b><span>${nf(info.score)} 分，下次來打破它</span></div>`);
  const gain=info.gained>0?`<em class="arx-new">+${info.gained} 新星</em>`:'';
  parts.push(`<div class="arx-cl"><span class="arx-cap">分數挑戰</span>${starsHtml(info.best,'big')}${gain}</div>`);
  parts.push(info.next?`<p class="arx-next">再 ${nf(info.next.need)} 分，得第 ${info.next.star} 顆星（目標 ${nf(info.next.target)}）</p>`:`<p class="arx-next done">三顆星全部達成！</p>`);
  if(info.combo>=2)parts.push(`<p class="arx-next">最高連擊 ×${info.combo}</p>`);
  return `<div class="arx-res" data-arx-rec="${info.record?1:0}" data-arx-stars="${info.best}">${parts.join('')}</div>`;
 }
 function pwButtonHtml(g){
  const p=pws.get(g);
  if(p&&p.tried)return `<p class="arx-pwstat" role="status">${p.shield?'🛡️ 能量盾已啟動'+(p.life?'，生命 +1':'，生命已滿，衝刺高分！'):'生字補給完成（'+p.ok+'/3）'}</p>`;
  return `<button type="button" class="btn soft arx-pw" data-arx="pw">⚡ 生字補給 <small>3 題</small></button>`;
 }
 function decorateCard(){
  if(pgPlaying||!pgGame||!pgMeta||!gameIds().includes(pgMeta.id))return;
  const card=document.querySelector('#pg-overlay .a28-overlaycard');if(!card)return;
  const row=card.querySelector(':scope > .row');
  const res=results.get(pgGame),block=card.querySelector('.wq34-result');
  if(block&&res&&!card.querySelector('.arx-res')){
   block.insertAdjacentHTML('afterend',resultHtml(res));
   card.classList.add('arx-on');
   if(res.record)card.classList.add('arx-has-rec');
  }else if(card.querySelector('.wq34-goalbox')&&!card.querySelector('.arx-row')){
   const goal=card.querySelector('.wq34-goalbox');
   card.classList.add('arx-on');
   goal.insertAdjacentHTML('afterend',rowHtml(pgMeta.id));
   if(row&&!row.querySelector('.arx-pw')){const play=row.querySelector('[data-a28="play"]');const h=document.createElement('template');h.innerHTML=pwButtonHtml(pgGame);if(play)play.after(h.content);else row.prepend(h.content);}
  }
 }
 const priorOverlay=pgOverlay;
 pgOverlay=function(){
  const out=priorOverlay.apply(this,arguments);
  try{if(pgGame&&pgMeta&&gameIds().includes(pgMeta.id))runOf(pgGame,pgMeta.id);decorateCard();ensureLoop();paint(pgGame);}catch(e){console.error('Arcade+ card',e);}
  return out;
 };

 /* ---------------------------------------------------------------- vocab power-up (optional, skippable) */
 let Q=null;
 function buildQuiz(){
  let ws=[];try{ws=r37GameWords(0,12);}catch(_){}
  const seen=new Set();ws=ws.filter(w=>w&&w.en&&w.zh&&!seen.has(w.zh)&&seen.add(w.zh));
  if(ws.length<4)return null;
  const rng=r37Rng(r37Hash('arx|'+Date.now())),pick=r37Shuf(ws,rng);
  return pick.slice(0,3).map((w,i)=>{
   const ds=r37Shuf(pick.filter(x=>x.zh!==w.zh),rng).slice(0,2).map(x=>x.zh);
   return {en:w.en,emoji:w.emoji||'🔤',ans:w.zh,opts:r37Shuf([w.zh,...ds],rng)};
  });
 }
 function dlgEl(){
  let d=document.getElementById('arx-pw-dlg');
  if(!d){d=document.createElement('dialog');d.id='arx-pw-dlg';d.className='arx-dlg';d.setAttribute('aria-label','生字補給');document.body.appendChild(d);d.addEventListener('close',()=>{Q=null;});}
  return d;
 }
 function pwDraw(){
  const d=dlgEl();if(!Q)return;
  const skip=`<button type="button" class="arx-x" data-arx="pw-skip">跳過，直接玩</button>`;
  if(Q.i>=Q.qs.length){
   const win=Q.ok===Q.qs.length;
   d.innerHTML=`<div class="arx-dh"><h2>⚡ 生字補給</h2></div><div class="arx-dbody"><div class="arx-big" aria-hidden="true">${win?'🛡️':'📚'}</div><h3>${win?'3/3 全對！能量盾啟動':`答對 ${Q.ok}/3`}</h3><p>${win?(Q.life?'這局生命 +1，加油！':'生命已滿。能量盾陪你衝高分！'):'差一點點。沒有獎勵也不要緊，直接開始玩吧！'}</p><button type="button" class="arx-go" data-arx="pw-done">開始玩</button></div>`;
   return;
  }
  const q=Q.qs[Q.i],ans=Q.picked!=null;
  d.innerHTML=`<div class="arx-dh"><h2>⚡ 生字補給 <small>${Q.i+1}/3</small></h2>${skip}</div><div class="arx-dbody"><div class="arx-big" aria-hidden="true">${esc(q.emoji)}</div><div class="arx-word"><span lang="en">${esc(q.en)}</span><button type="button" class="arx-say" data-arx="pw-say" aria-label="聽發音">🔊</button></div><p class="arx-q">這個字是甚麼意思？</p><div class="arx-opts" role="group" aria-label="選擇答案">${q.opts.map(o=>`<button type="button" class="arx-opt${ans?(o===q.ans?' ok':o===Q.picked?' bad':''):''}" data-arx="pw-opt" data-v="${esc(o)}" ${ans?'disabled':''}>${esc(o)}</button>`).join('')}</div>${ans?`<p class="arx-fb" role="status">${Q.picked===q.ans?'✅ 答對了！':'❌ 答案是「'+esc(q.ans)+'」'}</p><button type="button" class="arx-go" data-arx="pw-next">${Q.i>=Q.qs.length-1?'看結果':'下一題'}</button>`:''}</div>`;
  const f=d.querySelector(ans?'[data-arx="pw-next"]':'.arx-opt');if(f)f.focus({preventScroll:true});
 }
 function pwOpen(){
  const g=pgGame;if(!g||pgPlaying)return;const p=pws.get(g);if(p&&p.tried)return;
  const qs=buildQuiz();if(!qs){toastMsg('現在沒有足夠生字，直接開始玩吧！');return;}
  Q={g,qs,i:0,ok:0,picked:null};
  const d=dlgEl();pwDraw();if(!d.open)d.showModal();
 }
 function pwFinish(){
  const g=Q&&Q.g;if(!g)return;
  const win=Q.ok===Q.qs.length,p={tried:true,ok:Q.ok,shield:win,life:false};
  if(win){
   try{
    if(pgGame===g&&!pgFree){const r=a28Run();
     if(r&&r.game===pgMeta.id&&typeof r.lives==='number'&&Number.isFinite(r.lives)&&r.lives>0&&r.lives<3&&['ready','paused'].includes(r.phase)){r.lives+=1;if(pgCheckpoint()){p.life=true;try{a28HUD();}catch(_){}}else r.lives-=1;}}
   }catch(e){console.error('Arcade+ life',e);}
   const a=A();a.shields++;checkAch(a);save();
   toastMsg(p.life?'🛡️ 能量盾啟動！生命 +1':'🛡️ 能量盾啟動！');
  }
  pws.set(g,p);Q.i=Q.qs.length;pwDraw();
  try{if(pgGame===g){pgOverlay();}}catch(_){}
 }
 function pwPick(v){
  if(!Q||Q.picked!=null||Q.i>=Q.qs.length)return;
  Q.picked=v;if(v===Q.qs[Q.i].ans)Q.ok++;pwDraw();
 }
 function pwNext(){
  if(!Q||Q.picked==null)return;
  Q.picked=null;Q.i++;
  if(Q.i>=Q.qs.length)pwFinish();else pwDraw();
 }
 function pwClose(){const d=document.getElementById('arx-pw-dlg');if(d&&d.open)d.close();Q=null;}

 /* ---------------------------------------------------------------- achievements panel */
 function achOpen(){
  const a=A();let d=document.getElementById('arx-ach-dlg');
  if(!d){d=document.createElement('dialog');d.id='arx-ach-dlg';d.className='arx-dlg wide';d.setAttribute('aria-label','成就');document.body.appendChild(d);}
  const have=ACH.filter(x=>a.ach[x.id]).length;
  d.innerHTML=`<div class="arx-dh"><h2>🏅 成就 <small>${have}/${ACH.length}</small></h2><button type="button" class="arx-x" data-arx="ach-close">關閉</button></div><div class="arx-dbody"><p class="arx-sum">⭐ 挑戰星 <b>${totalStars(a)}</b> / ${totalMax()} · 破紀錄 ${a.recs} 次 · 最高連擊 ×${a.combo}</p><ul class="arx-achs">${ACH.map(x=>{const on=!!a.ach[x.id],pr=x.prog(a);return `<li class="arx-ach${on?' on':''}" data-ach="${x.id}"><span class="arx-ai" aria-hidden="true">${on?x.icon:'🔒'}</span><span class="arx-at"><b>${esc(x.name)}</b><small>${esc(x.desc)}</small></span><span class="arx-ap">${on?'已解鎖':pr[0]+'/'+pr[1]}</span></li>`;}).join('')}</ul></div>`;
  if(!d.open)d.showModal();
  d.querySelector('.arx-x')?.focus({preventScroll:true});
 }

 /* ---------------------------------------------------------------- events + render hooks */
 document.addEventListener('click',e=>{
  const el=e.target.closest&&e.target.closest('[data-arx]');if(!el)return;
  const a=el.dataset.arx;
  if(a==='ach')achOpen();
  else if(a==='ach-close')document.getElementById('arx-ach-dlg')?.close();
  else if(a==='pw')pwOpen();
  else if(a==='pw-skip')pwClose();
  else if(a==='pw-opt')pwPick(el.dataset.v);
  else if(a==='pw-next')pwNext();
  else if(a==='pw-say'&&Q){try{r37Speak(Q.qs[Q.i].en);}catch(_){}}
  else if(a==='pw-done')pwClose();
 });
 document.addEventListener('click',e=>{ // backdrop click closes the dialogs (they never block the game)
  const t=e.target;if(t&&t.tagName==='DIALOG'&&(t.id==='arx-ach-dlg'||t.id==='arx-pw-dlg'))t.close();
 });
 function lobbyDirty(){for(const c of document.querySelectorAll('[data-cabinet]'))if(!c.querySelector('.arx-row'))return true;const l=document.querySelector('.p30-lobby,.a28-lobby');return !!l&&!l.querySelector('.arx-bar');}
 function afterRender(){
  if(lastRoute==='game'||document.querySelector('.p30-lobby,.a28-lobby'))decorateLobby();
  if(lastRoute==='playground'){mount();decorateCard();ensureLoop();}
  else pwClose();
 }
 const priorRender=render;
 render=function(){const out=priorRender.apply(this,arguments);try{afterRender();}catch(e){console.error('Arcade+ render',e);}return out;};
 const app=document.getElementById('app');
 if(app)new MutationObserver(()=>{if(lobbyDirty()){try{decorateLobby();}catch(e){console.error('Arcade+ lobby',e);}}}).observe(app,{childList:true,subtree:true});

 return {targets,starsFor,record,runOf,bestOf,ACH,checkAch,newCombo,feed,live,state:A,totalStars,gameIds,
  _pw:()=>Q,_pwState:g=>pws.get(g||pgGame)||null,_combo:g=>combos.get(g||pgGame)||null,_result:g=>results.get(g||pgGame)||null,_pwOpen:pwOpen,_decorateLobby:decorateLobby,get COMBO_WIN(){return COMBO_WIN;}};
})();
