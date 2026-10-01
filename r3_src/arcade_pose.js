/* R3 original procedural character rig. Draw-only; never changes gameplay/saved state.
 * Positions and joint rotations have independent animation curves, no sprite assets.
 */
R2.pose=function(c,x,y,s,type,accent,action='idle',time=0,face=1){
 const reduced=globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
 const t=reduced?0:time,run=action==='run',air=['jump','fall','spike'].includes(action),slide=action==='slide',hit=action==='hit',wave=Math.sin(t*12),rise=action==='jump'?-0.75:0.65;
 const fur=type==='fox'?'#e6a16a':type==='panda'?'#f5f0e8':'#f6eddc',dark=type==='panda'?'#41475f':type==='fox'?'#bf714e':'#baac97';
 c.save();c.translate(x,y+(run?Math.abs(wave)*-2:0));c.scale(s*(face<0?-1:1),s);
 const joint=(x,y,angle,len,color,width=12,bend=0)=>{c.save();c.translate(x,y);c.rotate(angle);D.line(c,[{x:0,y:0},{x:0,y:len*.55},{x:bend,y:len}],color,width);D.ellipse(c,bend,len,width*.65,5,fur);c.restore();};
 if(type==='fox'){c.save();c.translate(13,24);c.rotate(-.4+Math.sin(t*7)*.18+(slide?1:0));D.ellipse(c,25,0,27,13,dark);D.ellipse(c,44,0,9,11,'#fff6e5');c.restore();}
 if(slide){joint(-10,23,-.95,28,dark,12,-4);joint(10,23,-1.45,33,dark,12,0);}else{joint(-11,26,run?wave*.85:air?rise:0.12,22,dark,12,air?9:0);joint(11,26,run?-wave*.85:air?-rise:-.12,22,dark,12,air?-8:0);}
 c.save();c.rotate(slide?.55:hit?-.22:run?.05:0);D.ellipse(c,0,19,23,28,fur);D.round(c,-24,12,48,23,9,accent);D.circle(c,3,23,4,'#f5ce7b');
 const arms=action==='spike'?[-2.85,-1.8]:action==='serve'?[-1.5,-1.8]:action==='victory'?[-2.45,2.45]:air?[-2.15,2.15]:hit?[-1.1,1.1]:slide?[-.95,-1.6]:run?[wave*.85,-wave*.85]:[-.18,.18];
 joint(-22,8,arms[0],26,fur,12,run?7:0);joint(22,8,arms[1],26,fur,12,run?-7:0);
 // Separate neck/head group, ears trail the action instead of stretching the full body.
 c.save();c.translate(0,slide?-3:0);c.rotate((run?wave*.04:0)+(hit?-.14:0));
 if(type==='rabbit')for(const a of [-14,14]){c.save();c.translate(a,-31);c.rotate(a/110+(run?wave*.1:air?-.24:0));D.ellipse(c,0,-20,10,27,fur);D.ellipse(c,0,-22,4,17,'#dfb3ac');c.restore();}
 else if(type==='panda'){D.circle(c,-24,-31,12,dark);D.circle(c,24,-31,12,dark);}
 else{D.poly(c,[{x:-29,y:-16},{x:-25,y:-46},{x:-6,y:-28}],dark);D.poly(c,[{x:29,y:-16},{x:25,y:-46},{x:6,y:-28}],dark);}
 D.ellipse(c,0,-9,32,29,fur);if(type==='fox'){D.ellipse(c,-13,3,18,14,'#fff6e7');D.ellipse(c,13,3,18,14,'#fff6e7');}if(type==='panda')for(const z of [-12,12])D.ellipse(c,z,-9,11,14,dark);
 for(const z of [-12,12]){if(hit){D.line(c,[{x:z-5,y:-13},{x:z+3,y:-8},{x:z-5,y:-3}],'#473e45',3);}else{D.ellipse(c,z,-10,6,9,'#473e45');D.circle(c,z-2,-14,2.5,'#fff');}}
 D.ellipse(c,0,1,4,3,'#8c625d');c.beginPath();c.moveTo(-7,8);c.quadraticCurveTo(0,action==='victory'?20:16,7,8);c.lineWidth=2;c.strokeStyle='#8c625d';c.stroke();
 c.restore();c.restore();c.restore();
};
