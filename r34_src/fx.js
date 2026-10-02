/* R3.4 p10 host code: the shared arcade "feel" layer (WQFX), the ready/result cards and the result jingles.
 * It runs inside the main script scope (just before installMediaEvents();render();), so pgGame, pgMeta, pgPlaying, pgFree,
 * a28Run, a28Child, a28Objective, a28Winning, pgAudio ... are all in scope.
 *
 * Design rules (they come from the audit, see README_R3_4.md):
 *  - WQFX never adds a property to a game instance. Snapshot validation (WQGameSchema / WQR2Validate) rejects unknown own
 *    fields, so every bit of state lives in the closure below.
 *  - WQFX only reads score / health / level / lives and a per-game "focus point"; it never changes game rules.
 *  - Everything is drawn on its own overlay canvas (#wq34-fx), never on the game canvas, so engine transforms cannot clash.
 *  - Shake and flash are single short pulses (<= 0.4 s, no repeats faster than the games' own invulnerability), and are off
 *    for prefers-reduced-motion or when the player switched "動感效果" off.
 */
const WQFX=(()=>{
 'use strict';
 const KEY='wq34.fx';
 const S={game:null,id:'',score:0,lives:null,level:1,combo:0,lastAt:0,trickle:0,bestBefore:0,runKey:'',frames:0,popGap:0};
 const parts=[],pops=[],rings=[];let banner=null;
 let cv=null,cx=null,raf=0,last=0,shakeAmp=0,shakeT=0,flashA=0,flashC='255,70,70';
 const stats={pops:0,hits:0,bursts:0,banners:0,confetti:0,jingles:0,shakes:0,haptics:0,combos:0};
 const GOOD=['#ffd45e','#ffe9a3','#9be3b0','#8fd3ff','#ffb3c7'];
 const CONFETTI=['#ff6b6b','#ffd45e','#6bd49a','#6bb8ff','#c28bff','#ff9ed2'];
 function on(){try{return localStorage.getItem(KEY)!=='off';}catch(_){return true;}}
 function calm(){try{return !!(window.matchMedia&&matchMedia('(prefers-reduced-motion: reduce)').matches);}catch(_){return false;}}
 function setOn(v){try{localStorage.setItem(KEY,v?'on':'off');}catch(_){}}
 // Where the action is, in 800x560 canvas coordinates. Only reads engine fields; falls back to the middle of the field.
 const FOCUS={
  'sky-rescue':g=>g.p,'star-patrol':g=>g.p,'harbor-volley':g=>g.p,
  'forest-pong':g=>g.ball,'meadow-cricket':g=>g.ball,'bounce-basket':g=>g.hoop,
  'moon-bells':g=>({x:g.p.x,y:g.p.y-g.camera}),
  'cloud-island':g=>({x:g.p.x-g.camera,y:g.p.y-20}),
  'lighthouse-well':g=>({x:g.p.x,y:g.p.y-g.camera-10}),
  'ruins-courier':g=>({x:400+(g.visualLane-1)*225,y:430}),
  'forest-dash':g=>({x:400+(g.visualLane-1)*224,y:430}),
  'valley-race':g=>g.car,'drift-path':g=>({x:400,y:280})
 };
 function focus(){
  let p=null;try{p=FOCUS[S.id]?.(S.game);}catch(_){p=null;}
  const ok=p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
  return ok?{x:Math.max(40,Math.min(760,p.x)),y:Math.max(70,Math.min(520,p.y))}:{x:400,y:250};
 }
 function livesNow(g){
  try{if(!pgFree){const r=a28Run();if(r&&Number.isFinite(r.lives)&&r.game===pgMeta?.id)return r.lives;}}catch(_){}
  return Number.isFinite(g.health)?g.health:null;
 }
 function ensure(){
  const vp=document.querySelector('.a28-viewport'),game=document.getElementById('pg-canvas');
  if(!vp||!game)return false;
  if(!cv||cv.parentNode!==vp){
   cv=document.getElementById('wq34-fx');
   if(!cv||cv.parentNode!==vp){cv=document.createElement('canvas');cv.id='wq34-fx';cv.width=800;cv.height=560;cv.setAttribute('aria-hidden','true');vp.appendChild(cv);}
   cx=cv.getContext('2d');
  }
  const l=game.offsetLeft+'px',t=game.offsetTop+'px',w=game.offsetWidth+'px',h=game.offsetHeight+'px';
  if(cv.style.left!==l)cv.style.left=l;if(cv.style.top!==t)cv.style.top=t;if(cv.style.width!==w)cv.style.width=w;if(cv.style.height!==h)cv.style.height=h;
  return true;
 }
 function scale(){const g=document.getElementById('pg-canvas');return g&&g.offsetWidth?g.offsetWidth/800:.5;}
 function kick(){if(!raf){last=performance.now();raf=requestAnimationFrame(loop);}}
 // ---- emitters -------------------------------------------------------------------------------------------------
 function burst(x,y,colors,n,speed=190,life=.7,size=4){
  if(!on())return;n=calm()?Math.ceil(n/3):n;n=Math.min(n,60);stats.bursts++;
  for(let i=0;i<n&&parts.length<260;i++){const a=Math.random()*Math.PI*2,v=speed*(.35+Math.random()*.75);
   parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v-40,g:380,life:life*(.7+Math.random()*.6),age:0,c:colors[i%colors.length],s:size*(.7+Math.random()*.9),kind:'dot'});}
  kick();
 }
 function confetti(n=110,fromTop=true){
  if(!on())return;n=calm()?Math.ceil(n/4):n;stats.confetti++;
  for(let i=0;i<n&&parts.length<260;i++){
   parts.push({x:fromTop?Math.random()*800:400,y:fromTop?-20-Math.random()*60:260,vx:(Math.random()-.5)*(fromTop?160:520),vy:fromTop?60+Math.random()*120:-260-Math.random()*220,g:300,
    life:2.1+Math.random()*1.1,age:0,c:CONFETTI[i%CONFETTI.length],s:6+Math.random()*6,rot:Math.random()*6,vr:(Math.random()-.5)*9,kind:'conf'});
  }
  kick();
 }
 function pop(text,x,y,color='#ffe27a',size=34){
  if(!on())return;stats.pops++;pops.push({t:String(text),x,y,c:color,s:size,age:0,life:.95});if(pops.length>8)pops.shift();kick();
 }
 function ring(x,y,color='#fff3b0'){if(!on()||calm())return;rings.push({x,y,c:color,age:0,life:.45});kick();}
 function say(text,color='#ffe27a',ms=1100){
  if(!on())return;stats.banners++;banner={t:text,c:color,age:0,life:ms/1000};kick();
 }
 function shake(amp=8,t=.32){
  if(!on()||calm())return;stats.shakes++;shakeAmp=Math.max(shakeAmp,amp);shakeT=Math.max(shakeT,t);kick();
 }
 function flash(rgb='255,70,70',a=.28){if(!on()||calm())return;flashC=rgb;flashA=Math.max(flashA,a);kick();}
 function haptic(p){try{if(on()&&navigator.vibrate&&!calm()){navigator.vibrate(p);stats.haptics++;}}catch(_){}}
 // ---- drawing loop (only runs while something is animating) ----------------------------------------------------------------
 function loop(now){
  raf=0;const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;
  if(!ensure()){parts.length=pops.length=rings.length=0;banner=null;return;}
  const c=cx;c.clearRect(0,0,800,560);let alive=false;
  // vignette flash
  if(flashA>0){const g=c.createRadialGradient(400,280,170,400,280,520);g.addColorStop(0,`rgba(${flashC},0)`);g.addColorStop(1,`rgba(${flashC},${flashA.toFixed(3)})`);c.fillStyle=g;c.fillRect(0,0,800,560);flashA=Math.max(0,flashA-dt*.9);alive=true;}
  // rings
  for(let i=rings.length-1;i>=0;i--){const r=rings[i];r.age+=dt;if(r.age>=r.life){rings.splice(i,1);continue;}const k=r.age/r.life;c.globalAlpha=1-k;c.strokeStyle=r.c;c.lineWidth=5*(1-k)+1;c.beginPath();c.arc(r.x,r.y,16+k*58,0,Math.PI*2);c.stroke();alive=true;}
  // particles
  for(let i=parts.length-1;i>=0;i--){const p=parts[i];p.age+=dt;if(p.age>=p.life){parts.splice(i,1);continue;}
   p.vy+=p.g*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;if(p.kind==='conf'){p.vx*=1-dt*.6;p.rot+=p.vr*dt;}
   const k=p.age/p.life;c.globalAlpha=Math.min(1,(1-k)*1.6);c.fillStyle=p.c;
   if(p.kind==='conf'){c.save();c.translate(p.x,p.y);c.rotate(p.rot);c.fillRect(-p.s/2,-p.s/3,p.s,p.s*.6);c.restore();}
   else{c.beginPath();c.arc(p.x,p.y,Math.max(.8,p.s*(1-k*.6)),0,Math.PI*2);c.fill();}
   alive=true;}
  // pop-ups
  c.textAlign='center';c.textBaseline='middle';c.lineJoin='round';
  for(let i=pops.length-1;i>=0;i--){const p=pops[i];p.age+=dt;if(p.age>=p.life){pops.splice(i,1);continue;}
   const k=p.age/p.life,ease=1-Math.pow(1-Math.min(1,k*2.2),3),sc=k<.12?.6+k/.12*.6:1.2-Math.min(.2,(k-.12)*.8);
   c.save();c.globalAlpha=k>.65?1-(k-.65)/.35:1;c.translate(p.x,p.y-ease*46);c.scale(sc,sc);c.font=`900 ${p.s}px "Noto Sans TC","PingFang HK",system-ui,sans-serif`;
   c.lineWidth=7;c.strokeStyle='#1f2d3d';c.strokeText(p.t,0,0);c.fillStyle=p.c;c.fillText(p.t,0,0);c.restore();alive=true;}
  // banner
  if(banner){banner.age+=dt;const b=banner;if(b.age>=b.life)banner=null;else{
   const k=b.age/b.life,sc=k<.14?.5+(k/.14)*.62:k<.24?1.12-(k-.14)/.1*.12:1,a=k>.75?1-(k-.75)/.25:1;
   c.save();c.globalAlpha=a;c.translate(400,118);c.scale(sc,sc);c.font='900 46px "Noto Sans TC","PingFang HK",system-ui,sans-serif';c.lineWidth=9;c.strokeStyle='#1f2d3d';c.strokeText(b.t,0,0);c.fillStyle=b.c;c.fillText(b.t,0,0);c.restore();alive=true;}}
  c.globalAlpha=1;
  // shake (CSS transform on both canvases, in CSS pixels so it is visible at phone scale)
  const gc=document.getElementById('pg-canvas');
  if(shakeT>0){shakeT=Math.max(0,shakeT-dt);const k=shakeT/.32,a=Math.max(2,shakeAmp*scale())*k*k;const t=`translate(${((Math.random()*2-1)*a).toFixed(1)}px,${((Math.random()*2-1)*a).toFixed(1)}px)`;if(gc)gc.style.transform=t;cv.style.transform=t;alive=true;if(shakeT===0)shakeAmp=0;}
  else if(gc&&gc.style.transform){gc.style.transform='';cv.style.transform='';}
  if(alive)raf=requestAnimationFrame(loop);else{c.clearRect(0,0,800,560);if(gc)gc.style.transform='';cv.style.transform='';}
 }
 // ---- run bookkeeping ---------------------------------------------------------------------------------------------------
 function begin(g){
  S.game=g;S.id=pgMeta?.id||'';S.score=Number(g.score)||0;S.lives=livesNow(g);S.level=g.level||1;S.combo=0;S.lastAt=0;S.trickle=0;S.frames=0;S.popGap=0;
  S.bestBefore=0;S.runKey='';
  try{if(!pgFree){const c=a28Child(),r=c.run,key=pgMeta.id+'|'+g.d;S.runKey=(r&&r.id?String(r.id):'')+':'+key;
   let saved=null;try{saved=sessionStorage.getItem('wq34.best.'+S.runKey);}catch(_){}
   if(saved!==null)S.bestBefore=Number(saved)||0;else{S.bestBefore=Number(c.bests?.[key])||0;try{sessionStorage.setItem('wq34.best.'+S.runKey,String(S.bestBefore));}catch(_){}}}}catch(_){}
  parts.length=pops.length=rings.length=0;banner=null;shakeAmp=shakeT=flashA=0;
 }
 const COMBO_SAY={3:['好棒！','#ffe27a'],5:['連擊 ×5','#ffb86b'],8:['太強了！','#ff8fb1'],12:['連擊 ×12','#8fe3ff'],20:['傳說級！','#d6a6ff']};
 const STING=[523.25,659.25,783.99,1046.5,1318.5];
 function sting(n){try{if(!on()||!pgPlaying)return;const t=pgAudio.ctx?.currentTime;if(t===undefined)return;
   const lvl=Math.min(STING.length-2,Math.floor(n/4));pgAudio.tone(STING[lvl],.09,'triangle',.07,t+.01);pgAudio.tone(STING[lvl+1],.12,'triangle',.07,t+.09);}catch(_){}}
 function onScore(d){
  const now=performance.now(),f=focus();
  S.combo=now-S.lastAt<1800?S.combo+1:1;S.lastAt=now;
  const big=d>=60;
  burst(f.x,f.y,GOOD,Math.min(16,6+Math.floor(d/12)),big?250:190,.75,big?5.2:4);
  if(S.popGap<=0||big){pop('+'+Math.round(d),f.x,f.y-34,S.combo>=5?'#ffb86b':'#ffe27a',S.combo>=8?42:34);S.popGap=.12;}
  if(big)ring(f.x,f.y);
  const m=COMBO_SAY[S.combo];if(m){say(m[0],m[1],1000);stats.combos++;sting(S.combo);}
  haptic(8);
 }
 function onHit(){
  stats.hits++;const f=focus();
  S.combo=0;
  burst(f.x,f.y,['#ff9a8c','#ffd0c8','#ffffff'],12,220,.55,4.5);
  shake(9,.32);flash('255,70,70',.28);haptic(38);
 }
 function frame(dt){
  const g=pgGame;if(!g||!pgMeta||g.preview||!pgPlaying)return;
  if(S.game!==g){begin(g);ensure();say('出發！','#9be3b0',900);return;}
  S.frames++;S.popGap-=dt;ensure();
  const sc=Number(g.score)||0,lv=livesNow(g),level=g.level||1;
  const d=sc-S.score;
  if(d>=3)onScore(d);
  else if(d>0){S.trickle+=d;if(S.trickle>=50){const f=focus();pop('+'+Math.round(S.trickle),f.x,f.y-34,'#cfeaff',28);S.trickle=0;}}
  S.score=sc;
  if(lv!==null&&S.lives!==null&&lv<S.lives)onHit();
  S.lives=lv;
  if(level>S.level){S.level=level;const f=focus();say('第 '+level+' 關','#8fe3ff',1200);confetti(36);burst(f.x,f.y,CONFETTI,18,260,.9,5);sting(8);}
  if(S.combo&&performance.now()-S.lastAt>1800)S.combo=0;
 }
 // ---- results --------------------------------------------------------------------------------------------------------------------
 function jingle(kind){
  try{
   const A=pgAudio;if(!A.ctx||!sfxEnabled()||A.volume('sfx')===0)return;stats.jingles++;
   const seq=kind==='win'?[[523.25,0],[659.25,.12],[783.99,.24],[1046.5,.36],[1318.5,.52]]:kind==='next'?[[587.33,0],[739.99,.11],[880,.22]]:[[392,0],[349.23,.16],[293.66,.32]];
   const dur=kind==='win'?.22:.16,vol=kind==='fail'?.08:.12;
   A.sample=true;
   A.ctx.resume().then(()=>{const ep=A.epoch,t=A.ctx.currentTime;seq.forEach(([f,o])=>A.tone(f,dur,'triangle',vol,t+.02+o));
    setTimeout(()=>{if(A.epoch!==ep||pgPlaying)return;A.sample=false;A.pause();},kind==='win'?1300:900);}).catch(()=>{A.sample=false;});
  }catch(_){}
 }
 function ended(result){
  try{
   if(!pgGame||!pgMeta)return;
   const win=a28Winning(pgGame),next=pgGame._wqNext&&!win;
   jingle(win?'win':next?'next':'fail');
   if(win){confetti(150);haptic([25,50,25,50,40]);}
   else if(next){confetti(60);haptic(20);}
   else haptic(60);
  }catch(_){}
 }
 // ---- ready / result card decoration ----------------------------------------------------------------------------------------
 const nf=n=>Math.max(0,Math.floor(Number(n)||0)).toLocaleString('en-US');
 function decorate(){
  try{
   if(pgPlaying||!pgGame||!pgMeta)return;
   const card=document.querySelector('#pg-overlay .a28-overlaycard');if(!card||card.dataset.wq34)return;
   card.dataset.wq34='1';
   const h2=card.querySelector('h2')?.textContent||'',p=card.querySelector(':scope > p'),row=card.querySelector('.row');
   const neverPlayed=S.game!==pgGame;
   const r=pgFree?null:a28Run(),phase=pgFree?pgReason:r?.phase;
   if((h2==='準備好了？'||(neverPlayed&&h2==='已保存，稍休一下'))&&p){
    let goal='';try{goal=a28Objective(pgMeta.id);}catch(_){}
    let how=String(pgMeta.guide||'').trim();
    try{if(matchMedia('(pointer: coarse)').matches){const gh=window.WQ34G&&window.WQ34G[pgMeta.id]&&window.WQ34G[pgMeta.id].hint;
      const keys=[...document.querySelectorAll('.a28-touch-key')].map(b=>b.textContent.trim()).filter(Boolean);
      if(gh)how=gh;else if(keys.length)how='用畫面兩旁或下方按鈕操作：'+keys.join('、')+'。';else if(pgMeta.touchGuide)how=pgMeta.touchGuide;}}catch(_){}
    p.className='wq34-goalbox';
    p.innerHTML=`<span class="wq34-goal">${esc(goal||'完成這款遊戲的目標')}</span>${how?`<span class="wq34-how">${esc(how)}</span>`:''}`;
    return;
   }
   const finished=(phase==='finished'||(pgFree&&pgGame.done))&&pgReason!=='error';
   if(!finished&&phase!=='retry'&&phase!=='next')return;
   const score=Math.floor(Number(pgGame.score)||0),win=finished&&(r?r.success:a28Winning(pgGame));
   let bestHtml='',tag='';
   if(!pgFree){try{const key=pgMeta.id+'|'+pgGame.d,best=Math.max(Number(a28Child().bests?.[key])||0,score);
     bestHtml=`<span class="wq34-best">最高 ${nf(best)}</span>`;
     if(finished&&score>0&&S.bestBefore>0&&score>S.bestBefore)tag=`<span class="wq34-new">新紀錄！</span>`;
     else if(finished&&score>0&&S.bestBefore===0&&S.game===pgGame)tag=`<span class="wq34-new">首次紀錄</span>`;}catch(_){}}
   let stars='';
   if(win){const left=Math.max(1,Math.min(3,Math.round(Number(r?r.lives:pgGame.health)||1)));
    stars=`<div class="wq34-stars" role="img" aria-label="${left} 粒星">${[1,2,3].map(i=>`<span class="${i<=left?'on':''}" style="--i:${i}">★</span>`).join('')}</div>`;}
   const block=document.createElement('div');block.className='wq34-result';
   block.innerHTML=`${stars}<div class="wq34-line"><b>${nf(score)}</b><span>分</span>${tag}</div>${bestHtml?`<div class="wq34-line sub">${bestHtml}</div>`:''}`;
   if(row)card.insertBefore(block,row);else card.appendChild(block);
   if(finished&&!pgFree&&row&&!row.querySelector('[data-a28="buy"]')){
    const used=a28Child().batch?.used||0,msg=used>=5?'今輪 5 個金幣已用完，休息一下，或者去學習。':'金幣用完了，完成一段學習就有新金幣！';
    const n=document.createElement('p');n.className='wq34-earn';n.textContent=msg;card.insertBefore(n,row);}
  }catch(e){try{console.error('WQFX card:',e);}catch(_){}}
 }
 return {frame,ended,decorate,burst,confetti,pop,say,shake,flash,ring,jingle,haptic,on,setOn,stats,
  _state:S,_focus:focus,
  // Read-only peek for tests / diagnostics (the host state lives in a closure, not on window).
  _peek(){return{reason:pgReason,playing:pgPlaying,free:pgFree,id:pgMeta?.id||null,score:pgGame?Number(pgGame.score)||0:null,health:pgGame?.health??null,level:pgGame?.level??null,done:pgGame?!!pgGame.done:null,error:pgError||''};},
  _game(){return pgGame;},_emit(kind,d){if(kind==='score')onScore(d||50);else if(kind==='hit')onHit();}};
})();
window.WQFX=WQFX;
{
 // Hook the result card.
 const wq34PriorOverlay=pgOverlay;
 pgOverlay=function(){const out=wq34PriorOverlay.apply(this,arguments);WQFX.decorate();return out;};
 // Result sounds + confetti (a28Complete stops all audio on the same frame, so the jingle is scheduled after that).
 const wq34PriorComplete=a28Complete;
 a28Complete=function(result){const was=pgPlaying,out=wq34PriorComplete.apply(this,arguments);if(was&&!pgPlaying)WQFX.ended(result);return out;};
 // Settings: the "動感效果" switch lives next to the volume sliders.
 const wq34PriorPanel=r2AudioPanel;
 r2AudioPanel=function(){return wq34PriorPanel().replace('</div><p class="small muted">所有街機沿用',`<label class="wq34-fxopt"><input type="checkbox" id="wq34-fx-toggle" ${WQFX.on()?'checked':''}> 動感效果（震動、閃光、彩帶、手機震動）</label></div><p class="small muted">所有街機沿用`);};
 document.addEventListener('change',e=>{if(e.target&&e.target.id==='wq34-fx-toggle')WQFX.setOn(e.target.checked);});
}
