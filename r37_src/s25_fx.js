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
  for(let i=0;i<Math.min(5,n*2+1);i++){const el=document.createElement('span');el.className='r37-flycoin';el.textContent='🪙';el.style.left=(r.left+r.width/2)+'px';el.style.top=(r.top+r.height/2)+'px';document.body.appendChild(el);
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
/* living sky behind planet screens: twinkles, shooting stars, gentle parallax */
const r37Sky=(()=>{
 let cv=null,cx=null,stars=[],raf=0,t0=0,shoot=null,tx=0,ty=0,ox=0,oy=0,host=null;
 addEventListener('pointermove',e=>{tx=(e.clientX/innerWidth-.5)*14;ty=(e.clientY/innerHeight-.5)*10;},{passive:true});
 function build(){const w=cv.clientWidth,h=cv.clientHeight,d=Math.min(2,devicePixelRatio||1);cv.width=w*d;cv.height=h*d;cx.setTransform(d,0,0,d,0,0);
  const n=Math.round(w*h/5200);stars=Array.from({length:n},()=>({x:Math.random()*w,y:Math.random()*h,z:.3+Math.random()*.7,p:Math.random()*6.28,s:.5+Math.random()*1.4,c:Math.random()<.15?'#ffe9a8':Math.random()<.2?'#bfe6ff':'#ffffff'}));}
 function frame(t){
  raf=0;if(!cv||!cv.isConnected)return;const w=cv.clientWidth,h=cv.clientHeight;ox+=(tx-ox)*.05;oy+=(ty-oy)*.05;
  cx.clearRect(0,0,w,h);
  for(const s of stars){const a=.35+.65*Math.abs(Math.sin(t/1000*s.z*1.6+s.p));cx.globalAlpha=a;cx.fillStyle=s.c;cx.beginPath();cx.arc((s.x+ox*s.z+w)%w,(s.y+oy*s.z+h)%h,s.s*s.z+.3,0,7);cx.fill();}
  if(!shoot&&t-t0>3500+Math.random()*4000){t0=t;shoot={x:Math.random()*w*.7,y:Math.random()*h*.4,l:0};}
  if(shoot){shoot.l+=.025;const L=shoot.l,x=shoot.x+L*w*.5,y=shoot.y+L*h*.25,g=cx.createLinearGradient(x-90,y-45,x,y);g.addColorStop(0,'rgba(255,255,255,0)');g.addColorStop(1,'rgba(255,255,255,.9)');cx.globalAlpha=Math.max(0,1-L);cx.strokeStyle=g;cx.lineWidth=2;cx.beginPath();cx.moveTo(x-90,y-45);cx.lineTo(x,y);cx.stroke();if(L>=1)shoot=null;}
  cx.globalAlpha=1;raf=requestAnimationFrame(frame);
 }
 function attach(){
  host=document.querySelector('#app>.r37-gx,#app>.r37-hub');
  if(!host||r37Calm()){if(cv)cv.remove();return;}
  if(!cv){cv=document.createElement('canvas');cv.className='r37-sky';cv.setAttribute('aria-hidden','true');cx=cv.getContext('2d');}
  if(cv.parentNode!==host){host.prepend(cv);build();}
  if(!raf)raf=requestAnimationFrame(frame);
 }
 addEventListener('resize',()=>{if(cv&&cv.isConnected)build();});
 return {attach,get on(){return !!(cv&&cv.isConnected&&raf);}};
})();
/* planet warp: zoom into the tapped planet, then navigate */
document.addEventListener('click',e=>{
 const a=e.target.closest?.('a.r37-planet');if(!a||r37Calm()||e.ctrlKey||e.metaKey)return;
 e.preventDefault();const href=a.getAttribute('href');r37Fx.st.warps++;
 a.classList.add('warp');document.querySelector('.r37-gx')?.classList.add('warping');
 setTimeout(()=>{location.hash=href;},260);
},true);
