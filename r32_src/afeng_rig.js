/* R3.2 A-Feng articulated game rig. Original runtime vector artwork based on the
 * six-character Forest Academy design: cream mountain goat, brown horns,
 * green argyle vest, green tie, brown shorts, backpack and cloven hooves.
 * It is NOT a recovered V33 sprite, a resized poster, or a new approved concept.
 * Rendering has no access to the wallet, answers, or persisted game objects. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.WQAFeng=api;})(globalThis,function(){'use strict';
 const STATES=Object.freeze(['idle','run','jump','fall','land','dash','hit','victory']);
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const PALETTE=Object.freeze({fur:'#f5e8cc',shade:'#d8be95',light:'#fff6e4',horn:'#806047',hornLight:'#b19166',ink:'#513f30',vest:'#576c48',diamond:'#879263',shirt:'#eee8d4',tie:'#3e5540',shorts:'#785e43',hoof:'#534337',bag:'#687057',gold:'#c9a767'});
 function pose(action='idle',time=0,face=1,reduced=false){
  action=STATES.includes(action)?action:'idle';time=Number.isFinite(time)?Math.max(0,time):0;
  const swing=Math.sin(time*13),walk=action==='run',s=reduced?0:1;
  const p={action,face:face<0?-1:1,body:0,head:0,bob:0,scaleY:1,scaleX:1,
   legs:[{hip:.06,knee:.08},{hip:-.06,knee:-.08}],arms:[{shoulder:.18,elbow:-.15},{shoulder:-.18,elbow:.15}],ear:0,tail:0,blink:time%4.3>4.13};
  if(walk){p.legs=[{hip:swing*.78,knee:.35+Math.max(0,-swing)*.7},{hip:-swing*.78,knee:-.35-Math.max(0,swing)*.7}];p.arms=[{shoulder:-swing*.8,elbow:-.3},{shoulder:swing*.8,elbow:.3}];p.bob=-Math.abs(swing)*2.3*s;p.body=.09;p.head=-.05;p.ear=swing*.075*s;}
  if(action==='jump'){p.legs=[{hip:-.45,knee:.9},{hip:.55,knee:-.65}];p.arms=[{shoulder:2.1,elbow:-.3},{shoulder:-2.25,elbow:.22}];p.body=-.06;p.head=-.06;p.ear=-.14;}
  if(action==='fall'){p.legs=[{hip:.13,knee:.33},{hip:-.2,knee:-.35}];p.arms=[{shoulder:1.22,elbow:-.4},{shoulder:-1.15,elbow:.5}];p.ear=.15;p.head=.06;}
  if(action==='land'){p.scaleY=.91;p.scaleX=1.07;p.bob=3;p.legs=[{hip:-.45,knee:.8},{hip:.45,knee:-.8}];p.arms=[{shoulder:.7,elbow:-.4},{shoulder:-.7,elbow:.4}];p.head=.07;}
  if(action==='dash'){p.body=.28;p.head=-.17;p.legs=[{hip:.95,knee:-.5},{hip:-.85,knee:.6}];p.arms=[{shoulder:.75,elbow:-.3},{shoulder:1,elbow:.1}];p.ear=-.2;}
  if(action==='hit'){p.body=-.16;p.head=.15;p.arms=[{shoulder:1.5,elbow:-.3},{shoulder:-1.5,elbow:.3}];p.legs=[{hip:-.23,knee:.3},{hip:.2,knee:-.3}];p.blink=true;}
  if(action==='victory'){p.arms=[{shoulder:2.8,elbow:-.3},{shoulder:-2.75,elbow:.3}];p.bob=-Math.abs(Math.sin(time*5))*2*s;p.head=Math.sin(time*4)*.06*s;p.blink=false;}
  if(action==='idle'){p.bob=Math.sin(time*2)*.55*s;p.head=Math.sin(time*1.7)*.025*s;}
  p.tail=Math.sin(time*5)*.12*s;return p;
 }
 function draw(c,x,y,scale,p){
  const C=PALETTE,ellipse=(x,y,rx,ry,col)=>{c.fillStyle=col;c.beginPath();c.ellipse(x,y,rx,ry,0,0,Math.PI*2);c.fill();};
  const path=(points,fill,stroke=C.ink,width=.7)=>{c.beginPath();for(const a of points){if(a[0]==='M')c.moveTo(a[1],a[2]);else if(a[0]==='L')c.lineTo(a[1],a[2]);else if(a[0]==='Q')c.quadraticCurveTo(...a.slice(1));else if(a[0]==='C')c.bezierCurveTo(...a.slice(1));else c.closePath();}if(fill){c.fillStyle=fill;c.fill();}if(stroke){c.strokeStyle=stroke;c.lineWidth=width;c.lineJoin='round';c.lineCap='round';c.stroke();}};
  const line=(x1,y1,x2,y2,col,w)=>{c.beginPath();c.moveTo(x1,y1);c.lineTo(x2,y2);c.strokeStyle=col;c.lineWidth=w;c.lineCap='round';c.stroke();};
  const hoof=(x,y,r=1)=>{c.save();c.translate(x,y);c.scale(r,r);ellipse(1,1,6.8,4.7,C.hoof);line(1,0,1,5,'#b09b78',.9);c.restore();};
  const leg=(side,a)=>{c.save();c.translate(side*8.2,18);c.rotate(a.hip);line(0,0,0,12,C.shorts,12);c.translate(0,10);c.rotate(a.knee);line(0,0,0,11,C.fur,9);path([['M',-4,4],['L',-5,8],['L',-3,7],['L',-4,11],['L',3,11]],C.fur,null);hoof(0,14);c.restore();};
  const arm=(side,a)=>{c.save();c.translate(side*14,-5);c.rotate(a.shoulder);line(0,0,0,11,C.shirt,10);ellipse(0,11,5.3,2,C.shade);c.translate(0,10);c.rotate(a.elbow);line(0,0,0,10,C.fur,8);hoof(0,12,.86);c.restore();};
  c.save();c.translate(x,y+p.bob);c.scale(scale*p.face*p.scaleX,scale*p.scaleY);
  // Backpack and far limbs sit behind the vest rather than translating a poster.
  c.save();c.rotate(p.body);path([['M',-18,-15],['Q',-28,-17,-27,-5],['L',-28,16],['Q',-27,25,-17,22],['L',-11,16],['L',-12,-11],['Z']],C.bag);path([['M',-28,-8],['L',-15,-8],['L',-16,5],['L',-28,5]],C.shorts);ellipse(-22,-5,1.6,2,C.gold);c.restore();
  c.save();c.translate(-16,18);c.rotate(p.tail);path([['M',0,0],['Q',-13,-5,-18,3],['L',-15,8],['L',-13,7],['Q',-6,14,3,7],['Z']],C.fur);c.restore();
  leg(-1,p.legs[0]);arm(-1,p.arms[0]);
  c.save();c.rotate(p.body);
  path([['M',-11,-17],['Q',0,-21,11,-17],['L',17,17],['Q',10,24,0,21],['Q',-11,24,-17,17],['Z']],C.vest);
  // Argyle motif is a separate clipped garment group.
  c.save();c.beginPath();c.moveTo(-11,-14);c.lineTo(11,-14);c.lineTo(15,16);c.lineTo(-15,16);c.clip();
  for(const yy of [-6,7,20])for(const xx of [-14,0,14])path([['M',xx,yy-7],['L',xx+7,yy],['L',xx,yy+7],['L',xx-7,yy],['Z']],C.diamond,null);
  c.restore();path([['M',-10,-18],['L',-2,-5],['L',0,-15],['L',3,-5],['L',11,-18]],C.shirt);path([['M',-2,-14],['L',3,-14],['L',4,-10],['L',2,-7],['L',5,3],['L',0,7],['L',-4,2],['L',-1,-7],['L',-3,-10],['Z']],C.tie);
  line(-13,-13,-12,18,C.shorts,3.6);ellipse(-12,8,3.2,4,C.gold);line(-12,6,-12,10,C.ink,.8);line(-14,15,13,15,C.shorts,2.5);ellipse(0,15,2.2,2,C.gold);
  c.restore();leg(1,p.legs[1]);arm(1,p.arms[1]);
  // Ears, horns, muzzle and eyes are independent drawing components.
  c.save();c.translate(0,-25);c.rotate(p.head+p.body*.35);
  for(const side of [-1,1]){
   c.save();c.translate(side*17,-9);c.rotate(side*p.ear);
   path([['M',0,-4],['Q',side*14,-9,side*22,-4],['Q',side*17,6,side*6,7],['L',0,3],['Z']],C.fur);path([['M',side*4,-1],['Q',side*13,-3,side*17,-3],['Q',side*12,3,side*6,4],['Z']],C.shade,null);c.restore();
  }
  for(const side of [-1,1]){c.save();c.scale(side,1);path([['M',8,-21],['Q',7,-33,15,-42],['Q',22,-49,24,-45],['Q',17,-35,17,-21],['Z']],C.horn);for(let j=0;j<4;j++)line(10+j*.9,-25-j*4,16+j*.45,-27-j*4,C.hornLight,1.1);c.restore();}
  ellipse(0,-1,23,23,C.fur);
  path([['M',-23,-1],['L',-27,2],['L',-21,5],['L',-26,7],['L',-20,9],['L',-23,12],['Q',-10,26,0,25],['Q',10,26,23,12],['L',20,9],['L',26,7],['L',21,5],['L',27,2],['L',23,-1]],C.fur,null);
  path([['M',-19,-18],['Q',-14,-29,-5,-24],['L',-8,-30],['Q',4,-28,10,-22],['L',14,-28],['Q',19,-24,16,-16],['Q',9,-22,1,-17],['L',1,-24],['Q',-5,-16,-10,-15],['L',-9,-23],['Z']],C.light,null);
  for(const z of [-10,10]){ellipse(z,-6,8,10.4,C.light);if(p.blink){path([['M',z-5,-5],['Q',z,-1,z+5,-5]],null,C.ink,1.8);}else{ellipse(z+1,-5,5.8,8,C.ink);ellipse(z+1,-4,3.5,5.7,'#9e753b');ellipse(z+1,-5,2.5,5.6,'#392c24');ellipse(z-1,-8,1.9,2.5,'#fff');}path([['M',z-5,-19],['Q',z,-22,z+5,-18]],null,C.horn,2.2);}
  ellipse(-7,9,9,8.5,C.light);ellipse(7,9,9,8.5,C.light);path([['M',-4,6],['Q',0,4,5,6],['L',1,10],['Q',-1,10,-4,6]],C.ink,null);
  path(p.action==='hit'?[['M',-5,17],['Q',1,12,6,17]]:[['M',-6,15],['Q',0,22,7,14]],null,C.ink,1.3);
  if(p.action==='victory')ellipse(0,17,3.5,3,'#bc7d65');
  path([['M',-4,22],['L',-1,29],['L',1,26],['L',4,29],['L',5,22],['Z']],C.light,null);
  c.restore();c.restore();
 }
 const state=new WeakMap();
 function observe(g,dt){const prev=state.get(g)||{facing:1,action:'idle',grounded:g.grounded,health:g.health,timer:0,x:g.p.x};let action=prev.action,timer=Math.max(0,prev.timer-Math.max(0,dt));const vx=g.p.vx,vy=g.p.vy;
  const hasKeys=typeof g.keys?.has==='function',input=hasKeys?Number(g.keys.has('right'))-Number(g.keys.has('left')):0;
  if(input)prev.facing=input<0?-1:1;else if((!hasKeys||!state.has(g))&&Math.abs(vx)>6)prev.facing=vx<0?-1:1;
  if(g.health<prev.health){action='hit';timer=.25;}
  else if(g.done&&g.won){action='victory';timer=0;}
  else if(action==='hit'&&timer>0){}
  else if(g.dash>0){action='dash';timer=0;}
  else if(!g.grounded){action=vy<0?'jump':'fall';timer=0;}
  else if(!prev.grounded&&g.grounded&&Math.abs(g.p.x-prev.x)<200){action='land';timer=.12;}
  else if(action==='land'&&timer>0){}
  else{action=Math.abs(vx)>12?'run':'idle';timer=0;}
  state.set(g,{facing:prev.facing,action,timer,grounded:g.grounded,health:g.health,x:g.p.x});
 }
 function describe(g){const s=state.get(g);return {character:'a-feng',action:g.done&&g.won?'victory':s?.action||(!g.grounded?(g.p.vy<0?'jump':'fall'):'idle'),face:s?.facing||1,time:Number.isFinite(g.t)?g.t:0};}
 function renderGame(c,g){const d=describe(g),reduced=!!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;draw(c,g.p.x,g.p.y-3,.62,pose(d.action,d.time,d.face,reduced));}
 return Object.freeze({version:'3.2.0',states:STATES,palette:PALETTE,pose,draw,observe,describe,renderGame});
});
// Visual-state tracking is outside all saved gameplay objects.
if(typeof CloudIslandR2!=='undefined'){
 const prior=CloudIslandR2.prototype.update;
 CloudIslandR2.prototype.update=function(dt){const r=prior.call(this,dt);WQAFeng.observe(this,dt);return r;};
}
