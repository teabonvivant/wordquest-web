/* R3.8 s25 - visual effects: living starfield, planet warp, answer bursts, combo text, result celebration. All off under prefers-reduced-motion. */
const r37Calm=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
const r37Fx=(()=>{
 let cv=null,cx=null,parts=[],raf=0,px=innerWidth/2,py=innerHeight/2;
 const st={bursts:0,confetti:0,texts:0,warps:0};
 document.addEventListener('pointerdown',e=>{px=e.clientX;py=e.clientY;},true);
 function canvas(){
  if(cv&&cv.isConnected)return cv;
  cv=document.createElement('canvas');cv.id='r37-fx';cv.setAttribute('aria-hidden','true');document.body.appendChild(cv);cx=cv.getContext('2d');size();return cv;
 }
 function size(){if(!cv)return;const d=Math.min(2,devicePixelRatio||1);cv.width=innerWidth*d;cv.height=innerHeight*d;cx.setTransform(d,0,0,d,0,0);}
 addEventListener('resize',size);
 function loop(){
  raf=0;if(!cx)return;cx.clearRect(0,0,innerWidth,innerHeight);
  parts=parts.filter(p=>p.life>0);
  for(const p of parts){
   p.life-=1/60;p.vy+=p.g;p.x+=p.vx;p.y+=p.vy;p.r+=p.spin;const a=Math.max(0,Math.min(1,p.life/p.max*1.6));
   cx.save();cx.globalAlpha=a;cx.translate(p.x,p.y);cx.rotate(p.r);
   if(p.t==='star'){cx.fillStyle=p.c;cx.beginPath();for(let i=0;i<10;i++){const rr=i%2?p.s*.45:p.s,an=i*Math.PI/5-Math.PI/2;cx.lineTo(Math.cos(an)*rr,Math.sin(an)*rr);}cx.fill();}
   else if(p.t==='rect'){cx.fillStyle=p.c;cx.fillRect(-p.s/2,-p.s/4,p.s,p.s/2);}
   else if(p.t==='text'){cx.font='900 '+p.s+'px system-ui,sans-serif';cx.textAlign='center';cx.lineWidth=5;cx.strokeStyle='rgba(20,16,60,.85)';cx.strokeText(p.txt,0,0);cx.fillStyle=p.c;cx.fillText(p.txt,0,0);}
   else{cx.fillStyle=p.c;cx.beginPath();cx.arc(0,0,p.s,0,7);cx.fill();}
   cx.restore();
  }
  if(parts.length)raf=requestAnimationFrame(loop);
 }
 const kick=()=>{if(!raf)raf=requestAnimationFrame(loop);};
 const C=['#ffd15c','#7ee3a1','#7cc8ff','#ff8fc7','#c6a2ff','#ffffff'];
 function burst(x=px,y=py,n=18){
  if(r37Calm())return;canvas();st.bursts++;
  for(let i=0;i<n;i++){const an=Math.random()*Math.PI*2,sp=2+Math.random()*4.5;parts.push({t:i%3?'star':'dot',x,y,vx:Math.cos(an)*sp,vy:Math.sin(an)*sp-1.5,g:.12,s:4+Math.random()*6,r:0,spin:(Math.random()-.5)*.3,c:C[i%C.length],life:.8+Math.random()*.4,max:1.1});}
  kick();
 }
 function text(txt,x=px,y=py,c='#ffd15c',s=30){if(r37Calm())return;canvas();st.texts++;parts.push({t:'text',txt,x,y:y-20,vx:0,vy:-1.4,g:.01,s,r:0,spin:0,c,life:1,max:1});kick();}
 function confetti(n=90){
  if(r37Calm())return;canvas();st.confetti++;
  for(let i=0;i<n;i++)parts.push({t:'rect',x:Math.random()*innerWidth,y:-20-Math.random()*innerHeight*.3,vx:(Math.random()-.5)*2,vy:2+Math.random()*3,g:.04,s:8+Math.random()*8,r:Math.random()*6,spin:(Math.random()-.5)*.25,c:C[i%C.length],life:2.6+Math.random(),max:3});
  kick();
 }
 function coinFly(from,n=1){
  if(r37Calm()||!from)return;const r=from.getBoundingClientRect(),tx=innerWidth-40,ty=30;
  for(let i=0;i<Math.min(5,n*2+1);i++){const el=document.createElement('span');el.className='r37-flycoin';el.innerHTML=r37Icon('🪙');el.style.left=(r.left+r.width/2)+'px';el.style.top=(r.top+r.height/2)+'px';document.body.appendChild(el);
   el.animate([{transform:'translate(-50%,-50%) scale(1)',opacity:1},{transform:`translate(${tx-r.left-r.width/2}px,${ty-r.top-r.height/2}px) scale(.5)`,opacity:.2}],{duration:700,delay:i*90,easing:'cubic-bezier(.5,0,.3,1)',fill:'forwards'}).onfinish=()=>el.remove();}
 }
 return {burst,text,confetti,coinFly,st,get count(){return parts.length;}};
})();
/* answer feedback: explicit calls from the level/quiz engine and the classroom quiz */
let r37Streak=0;
function r37FxAnswer(ok){
 if(ok){r37Streak++;r37Fx.burst();if(r37Streak>=3)r37Fx.text('連對 ×'+r37Streak,innerWidth/2,innerHeight*.32,'#ffd15c',34);}
 else{r37Streak=0;if(!r37Calm())document.querySelector('.r37-stage,.l30-quiz')?.animate([{transform:'translateX(0)'},{transform:'translateX(-6px)'},{transform:'translateX(6px)'},{transform:'translateX(0)'}],{duration:260});}
}
function r37FxResult(r){
 r37Streak=0;if(!r)return;
 if(r.stars>=5)r37Fx.confetti();else if(r.passed)r37Fx.burst(innerWidth/2,innerHeight*.35,26);
 if(r.coins)setTimeout(()=>r37Fx.coinFly(document.querySelector('.r37-rc'),r.coins),450);
}
if(typeof l30Bridge==='function'){const r37L30Bridge=l30Bridge;l30Bridge=function(a,w){const out=r37L30Bridge.apply(this,arguments);try{if(a&&!a.technical&&a.mode!=='study')r37FxAnswer(!!a.exact);}catch(_){}return out;};}
/* sky layer behind planet screens (R3.16): twinkling dots are pure CSS on .r37-sky; no canvas loop, no shooting stars, no parallax. Not attached under reduced motion. */
const r37Sky=(()=>{
 let el=null;
 function attach(){
  const host=document.querySelector('#app>.r37-gx,#app>.r37-hub');
  if(!host||r37Calm()){if(el)el.remove();return;}
  if(!el){el=document.createElement('div');el.className='r37-sky';el.setAttribute('aria-hidden','true');}
  if(el.parentNode!==host)host.prepend(el);
 }
 return {attach,get on(){return !!(el&&el.isConnected);}};
})();
/* planet warp: zoom into the tapped planet, then navigate */
document.addEventListener('click',e=>{
 const a=e.target.closest?.('a.r37-planet');if(!a||r37Calm()||e.ctrlKey||e.metaKey)return;
 e.preventDefault();const href=a.getAttribute('href');r37Fx.st.warps++;
 a.classList.add('warp');document.querySelector('.r37-gx')?.classList.add('warping');
 setTimeout(()=>{location.hash=href;},260);
},true);
