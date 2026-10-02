/* R3.4 p30: phone play layer.
 *   1. Canvas gestures (drag to steer, tap, swipe) for the action games whose engines have no pointer handling of their own.
 *      Gestures only call a28Input(), exactly like the on-screen keys, so pause / checkpoint / result rules are unchanged.
 *   2. Split key docks (direction keys left, action keys right) for the landscape layout in touch.css.
 *   3. Orientation helper: portrait hint chip, automatic enlarged mode in landscape phones.
 * Runs inside the host closure (pgAttach, a28Input, a28Sources, r2Immersive ... are in scope). Never touches game instances. */
const WQ34G=Object.freeze({
 // mode: steer (hold left / right while dragging), lanes (one left / right step per stretch of drag, for lane games), stick (drag in 4 directions),
 // hold (whole screen is the action key). Only games in a28Motion get gestures (the host drops their canvas pointer events, so nothing is doubled);
 // games whose engines read the finger themselves (rolling-block, color-orbit, moon-bells, juice-lines ...) only get a hint.
 // tap: key pulsed by a tap; up / down: key used by a swipe up / down ({key, ms} pulse, or {key, hold:true} while the finger stays down)
 'valley-race':{mode:'steer',down:{key:'down',hold:true},hint:'左右拖動轉向，手指向下拖就煞車。'},
 'drift-path':{mode:'hold',hint:'輕按畫面任何位置轉彎。'},
 'rolling-block':{hint:'向上、下、左、右滑動畫面，滾動方塊。'},
 'color-orbit':{hint:'輕按畫面左邊或右邊轉動。'},
 'sky-rescue':{mode:'stick',tap:'action',hint:'手指拖動飛行，輕按畫面開護盾。'},
 'forest-dash':{mode:'lanes',tap:'up',up:{key:'up',ms:240},down:{key:'down',ms:360},hint:'向左或向右滑動換跑道，輕按跳躍，向下滑動滑行。'},
 'ruins-courier':{mode:'lanes',tap:'up',up:{key:'up',ms:240},down:{key:'down',ms:360},hint:'向左或向右滑動換跑道，輕按跳躍，向下滑動滑行。'},
 'cloud-island':{mode:'steer',tap:'up',up:{key:'up',ms:240},hint:'左右拖動移動，輕按畫面跳躍；短衝用右邊按鈕。'},
 'star-patrol':{mode:'stick',tap:'action',hint:'手指拖動飛行，輕按畫面開護盾。'},
 'lighthouse-well':{mode:'steer',tap:'action',down:{key:'down',hold:true},hint:'左右拖動移動，輕按開降落傘，向下滑動加速落下。'},
 'harbor-volley':{mode:'steer',tap:'action',up:{key:'up',ms:200},down:{key:'down',ms:120},hint:'左右拖動移動，輕按擊球，向上滑跳躍，向下滑打短球。'},
 // Engines that already read the finger themselves: hint text only.
 'moon-bells':{hint:'用手指左右拖動兔仔。'},
 'forest-pong':{hint:'用手指左右拖動球拍。'},
 'bounce-basket':{hint:'拖住皮球向後拉，放開就投出；或按住「蓄力投籃」再放開。'},
 'meadow-cricket':{hint:'輕按畫面任何位置揮棒。'},
 'star-rhythm':{hint:'輕按畫面任何位置打拍子。'},
 'honey-delivery':{hint:'用手指劃過繩子就剪斷；也可用按鈕選繩。'},
 'number-garden':{hint:'上下左右滑動畫面，移動數字。'},
 'juice-lines':{hint:'用手指在畫面上畫斜線，再按「開水」。'},
 'little-engineer':{hint:'用手指點選零件來連接，再按「試行」。'},
 'honeycomb-puzzle':{hint:'先選下方積木，再輕按棋盤：第一下預覽，第二下放置。'},
 'forest-band':{hint:'輕按格子開關聲音，再按「播放合奏」。'},
 'block-studio':{hint:'輕按畫面旋轉，左右滑動移動，向下滑直接落下。'}
});
window.WQ34G=WQ34G;
const WQ34T=(function(){
 const LAND=matchMedia('(orientation: landscape) and (max-height: 550px)');
 const S={dismissed:false,auto:false,land:null,ptr:new Map(),taps:0,swipes:0,steers:0,autoEnter:0,heavy:false};
 const coarse=()=>{try{return matchMedia('(pointer: coarse)').matches;}catch(_){return false;}};
 const cfg=()=>{try{const c=WQ34G[pgMeta&&pgMeta.id];return c&&c.mode&&a28Motion.has(pgMeta.id)?c:null;}catch(_){return null;}};
 const has=(st,k)=>{const s=a28Sources.get(k);return !!(s&&s.has('g'+st.id));};
 const press=(st,k)=>{if(!has(st,k))a28Input(k,true,'g'+st.id);};
 const release=(st,k)=>{if(has(st,k))a28Input(k,false,'g'+st.id);};
 const set=(st,k,on)=>{if(on)press(st,k);else release(st,k);};
 function pulse(k,ms){
  const src='gp'+k+Math.round(performance.now());
  try{a28Input(k,true,src);}catch(_){return;}
  setTimeout(()=>{try{a28Input(k,false,src);}catch(_){}},ms||100);
 }
 function feedback(cv,e,strong){
  try{const r=cv.getBoundingClientRect();if(window.WQFX){WQFX.ring((e.clientX-r.left)*800/r.width,(e.clientY-r.top)*560/r.height,strong?'#fff3b0':'#cfeaff');WQFX.haptic(strong?14:8);}}catch(_){}
 }
 // ---- gestures --------------------------------------------------------------------------------------------------------------------
 function gestures(cv){
  if(cv.dataset.wq34g)return;cv.dataset.wq34g='1';
  cv.addEventListener('contextmenu',e=>{if(cfg())e.preventDefault();});
  cv.addEventListener('pointerdown',e=>{
   const c=cfg();if(!c||!pgPlaying||e.pointerType==='mouse')return;
   e.preventDefault();try{cv.setPointerCapture(e.pointerId);}catch(_){}
   const st={id:e.pointerId,x0:e.clientX,y0:e.clientY,ax:e.clientX,ay:e.clientY,t0:performance.now(),moved:false,swiped:false,fired:false,btn:false};
   // A second finger is an instant button (thumb steers, other thumb taps): held while it stays down.
   if(S.ptr.size>0&&c.tap){st.btn=true;S.ptr.set(st.id,st);press(st,c.tap);feedback(cv,e,true);S.taps++;return;}
   S.ptr.set(st.id,st);
   if(c.mode==='hold'){press(st,'action');feedback(cv,e,true);S.taps++;}
  });
  cv.addEventListener('pointermove',e=>{
   const st=S.ptr.get(e.pointerId),c=cfg();if(!st||!c||!pgPlaying||st.btn)return;
   const dx0=e.clientX-st.x0,dy0=e.clientY-st.y0,dt=performance.now()-st.t0;
   if(!st.moved&&Math.hypot(dx0,dy0)>14)st.moved=true;
   const r=cv.getBoundingClientRect(),thr=Math.max(9,r.width*.022),lead=thr*3.2;
   if(c.mode==='steer'||c.mode==='lanes'||c.mode==='stick'){
    const dx=e.clientX-st.ax;
    if(c.mode==='stick'){
     if(dx>lead)st.ax=e.clientX-lead;else if(dx<-lead)st.ax=e.clientX+lead;   // re-anchor: turning back reacts at once
     const dy=e.clientY-st.ay;if(dy>lead)st.ay=e.clientY-lead;else if(dy<-lead)st.ay=e.clientY+lead;
     const ddx=e.clientX-st.ax,ddy=e.clientY-st.ay;
     set(st,'left',ddx<-thr);set(st,'right',ddx>thr);set(st,'up',ddy<-thr);set(st,'down',ddy>thr);return;
    }
    // A quick, mostly vertical flick is a swipe, not a steer.
    if(!st.swiped&&dt<420&&Math.abs(dy0)>Math.max(30,r.height*.07)&&Math.abs(dy0)>1.5*Math.abs(dx0)){
     const s=dy0<0?c.up:c.down;
     if(s){st.swiped=true;S.swipes++;feedback(cv,e,false);release(st,'left');release(st,'right');
      if(s.hold)press(st,s.key);else pulse(s.key,s.ms||120);}
    }
    if(st.swiped)return;
    if(c.mode==='lanes'){
     const step=Math.max(26,r.width*.11);
     if(Math.abs(dx)>=step){S.steers++;st.ax=e.clientX;pulse(dx>0?'right':'left',70);feedback(cv,e,false);}
     return;
    }
    if(dx>lead)st.ax=e.clientX-lead;else if(dx<-lead)st.ax=e.clientX+lead;
    const ddx=e.clientX-st.ax;set(st,'left',ddx<-thr);set(st,'right',ddx>thr);if(ddx<-thr||ddx>thr)S.steers++;
   }
  });
  const end=e=>{
   const st=S.ptr.get(e.pointerId);if(!st)return;S.ptr.delete(st.id);
   const c=cfg();
   for(const k of ['left','right','up','down','action'])release(st,k);
   if(st.btn&&c&&c.tap)release(st,c.tap);
   if(!st.btn&&c&&c.tap&&c.mode!=='hold'&&e.type==='pointerup'&&pgPlaying&&!st.moved&&!st.swiped&&performance.now()-st.t0<320){
    S.taps++;feedback(cv,e,true);pulse(c.tap,c.tap==='up'?150:110);
   }
  };
  for(const t of ['pointerup','pointercancel','lostpointercapture'])cv.addEventListener(t,end);
 }
 // ---- key docks -------------------------------------------------------------------------------------------------------------------
 function docks(){
  const box=document.querySelector('.a28-touch-controls');if(!box||box.dataset.wq34)return;box.dataset.wq34='1';
  const play=document.querySelector('.a28-play');if(play&&pgMeta)play.dataset.wq34Game=pgMeta.id;
  // Footer buttons: short captions for the narrow landscape dock (the real text and aria-label stay).
  const SHORT={pause:'暫停',leave:'離開',help:'說明','r2-full':'還原','finish-art':'完成'};
  for(const b of document.querySelectorAll('.a28-game-footer .btn')){
   const s=SHORT[b.dataset.a28];if(!s)continue;
   if(!b.getAttribute('aria-label'))b.setAttribute('aria-label',b.textContent.trim());b.dataset.wq34s=s;
  }
  const btns=[...box.querySelectorAll('.a28-touch-key')];if(!btns.length)return;
  const key=b=>b.dataset.a28key,label=b=>b.textContent.trim();
  const hasLR=btns.some(b=>key(b)==='left')&&btns.some(b=>key(b)==='right');
  const plain=b=>/^[↑↓]$|^[上下]$/.test(label(b));
  const isDir=b=>key(b)==='left'||key(b)==='right'||((key(b)==='up'||key(b)==='down')&&(!hasLR||plain(b)));
  const dir=btns.filter(isDir),act=btns.filter(b=>!isDir(b));
  const gd=document.createElement('div'),ga=document.createElement('div');
  gd.className='wq34-kg wq34-kg-dir'+(dir.some(b=>key(b)==='up'||key(b)==='down')?' has-ud':'');ga.className='wq34-kg wq34-kg-act';
  if(act.length>=4)ga.classList.add('many');
  gd.append(...dir);ga.append(...act);box.append(gd,ga);
 }
 // ---- orientation -----------------------------------------------------------------------------------------------------------------
 const heavy=()=>document.querySelectorAll('#pg-tools [data-a28tool]').length>5;
 function chip(){
  try{
   if(document.querySelector('.wq34-rotate')||!coarse()||S.heavy)return;
   if(sessionStorage.getItem('wq34.rot')==='1')return;
  }catch(_){if(document.querySelector('.wq34-rotate')||!coarse()||S.heavy)return;}
  const v=document.querySelector('.a28-viewport');if(!v)return;
  const d=document.createElement('div');d.className='wq34-rotate';d.setAttribute('role','note');
  d.innerHTML='<span class="wq34-rot-icon" aria-hidden="true">📱</span><span class="wq34-rot-text">橫放手機，畫面更大、更好玩。</span><button type="button" aria-label="關閉提示">✕</button>';
  d.querySelector('button').addEventListener('click',()=>{try{sessionStorage.setItem('wq34.rot','1');}catch(_){}d.remove();});
  v.parentNode.insertBefore(d,v);
 }
 function enter(){
  const el=document.querySelector('.a28-play');if(!el)return;
  if(r2Immersive&&!r2Immersive.isConnected)r2Immersive=null;
  if(r2Immersive)return;
  r2Immersive=el;el.classList.add('r2-immersive');document.body.classList.add('r2-fullscreen');S.autoEnter++;r2Fit();
 }
 function sync(){
  try{
   const el=document.querySelector('.a28-play');if(!el||!pgGame)return;
   if(r2Immersive&&!r2Immersive.isConnected)r2Immersive=null;
   const land=LAND.matches;
   if(S.land!==land){S.land=land;S.dismissed=false;}
   if(land&&coarse()&&!S.dismissed&&!r2Immersive){enter();S.auto=true;}
   else if(!land&&S.auto&&r2Immersive){S.auto=false;r2ExitFullscreen();}
  }catch(e){try{console.error('WQ34T sync:',e);}catch(_){}}
 }
 function attach(){
  const cv=document.querySelector('#pg-canvas');if(!cv||!pgGame)return;
  S.ptr.clear();S.dismissed=false;S.auto=false;S.heavy=heavy();S.land=LAND.matches;
  docks();gestures(cv);chip();sync();
 }
 try{LAND.addEventListener('change',()=>{S.dismissed=false;sync();});}catch(_){try{LAND.addListener(()=>{S.dismissed=false;sync();});}catch(__){}}
 window.addEventListener('orientationchange',()=>setTimeout(sync,200));
 // A person who leaves the enlarged view by hand (button, Esc, system back) keeps the normal view until the phone is turned again.
 document.addEventListener('fullscreenchange',()=>{if(!document.fullscreenElement)S.dismissed=true;});
 return {attach,sync,state:S,gestures,docks};
})();
window.WQ34T=WQ34T;
{
 const wq34PriorAttach=pgAttach;
 pgAttach=function(){const out=wq34PriorAttach.apply(this,arguments);try{WQ34T.attach();}catch(e){try{console.error('WQ34T attach:',e);}catch(_){}}return out;};
 const wq34PriorFull=r2Fullscreen;
 r2Fullscreen=function(){const wasOn=!!r2Immersive||!!document.fullscreenElement;WQ34T.state.dismissed=wasOn;WQ34T.state.auto=false;return wq34PriorFull.apply(this,arguments);};
}
