
/* WordQuest Arcade R2. New implementation from recovered design notes, NOT V33 source.
 * Original code and vector artwork. No external assets, telemetry, paid currency, or random rewards.
 * Physics uses seconds; all state is bounded and serializable. Rendering never advances state.
 */
'use strict';
const R2_IDS=['ruins-courier','cloud-island','star-patrol','lighthouse-well','harbor-volley'];
const R2={
 clamp:(n,a,b)=>Math.max(a,Math.min(b,n)),
 approach:(a,b,n)=>a<b?Math.min(b,a+n):Math.max(b,a-n),
 hit:(a,b,r)=>Math.hypot(a.x-b.x,a.y-b.y)<r,
 rect(c,x,y,w,h,col,r=8){D.round(c,x,y,w,h,r,col);},
 text(c,s,x,y,n=16,col='#edf6ff',align='center'){c.save();c.font=`700 ${n}px system-ui,sans-serif`;c.textAlign=align;c.textBaseline='middle';c.fillStyle=col;c.fillText(s,x,y);c.restore();},
 sky(c,stage,t=0,space=false){const cols=space?['#111a36','#181636','#12333b']:['#99d9dc','#f4b885','#525486'];const bg=c.createLinearGradient(0,0,0,560);bg.addColorStop(0,cols[(stage-1)%3]);bg.addColorStop(1,space?'#273b5a':'#f8e5bd');c.fillStyle=bg;c.fillRect(0,0,800,560);if(space){for(let i=0;i<66;i++){const x=(i*137+19)%800,y=(i*79+t*(10+i%4*7))%560;D.circle(c,x,y,i%3===0?1.8:1,'#dae9ff');}}else{for(let i=0;i<5;i++){const x=((i*193-t*7)%1050+1050)%1050-120;D.ellipse(c,x,94+(i%3)*29,64,14,'#ffffff70');D.ellipse(c,x+22,86+(i%3)*29,35,17,'#ffffff60');}for(let i=0;i<8;i++){const x=i*136-80;D.poly(c,[{x,y:420},{x:x+89,y:185+(i%3)*34},{x:x+188,y:420}],'#366f8230');}}},
 hud(g,title,progress){const c=g.c;R2.rect(c,16,14,768,49,'#142639ed',12);R2.text(c,title,34,39,20,'#f9dc93','left');R2.text(c,progress,432,39,16);if(g.meta.id==='harbor-volley')R2.text(c,'5 分賽',729,39,15,'#8fe6cf');else for(let i=0;i<3;i++)R2.rect(c,690+i*25,28,17,21,i<g.health?'#79e2c0':'#536477',5);},
 gem(c,x,y,size=8,col='#f9d786'){D.poly(c,[{x,y:y-size},{x:x+size*.75,y},{x,y:y+size},{x:x-size*.75,y}],col);},
 badge(g,text){if(g.noticeTime>0){R2.rect(g.c,125,478,550,49,'#132c42e8',14);R2.text(g.c,g.notice,400,502,16,'#fff0c2');}},
 particles(g,x,y,col,n=8){for(let i=0;i<n;i++)g.fx.push({x,y,vx:(g.r()-.5)*140,vy:-40-g.r()*110,life:.4+g.r()*.3,col});g.fx=g.fx.slice(-64);},
 fx(g,dt){for(const p of g.fx){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=200*dt;p.life-=dt;}g.fx=g.fx.filter(p=>p.life>0);},
 drawFx(g){for(const p of g.fx){g.c.save();g.c.globalAlpha=Math.min(1,p.life*2);D.circle(g.c,p.x,p.y,3,p.col);g.c.restore();}},
 finish(g,won,text){if(g.done)return;g.won=won;g.end(text,won?'任務完成':'這一局結束');},
 beat(g,dt,theme=0){g.musicClock-=dt;if(g.musicClock<=0){g.musicClock+=.29;const scales=[[220,277.18,329.63,440,369.99,329.63,277.18,329.63],[261.63,329.63,392,523.25,440,392,329.63,293.66],[164.81,220,246.94,329.63,293.66,246.94,220,185]];const n=g.musicStep++%16;g.api.music?.(scales[theme%3][n%8]*(n%4===0?.5:1),.19,'triangle',.07);}},
 setup(g){g.engineVersion=1;g.health=3;g.inv=0;g.won=false;g.skin='classic';g.fx=[];g.musicClock=.1;g.musicStep=0;}
};

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

class RuinsCourierR2 extends WQGame{
 constructor(a){super(a);R2.setup(this);this.distance=0;this.lane=1;this.visualLane=1;this.jump=0;this.jumpV=0;this.slide=0;this.gems=0;this.combo=0;this.obstacles=[];this.nextAt=100;this.rowId=0;this.lastPattern=-1;this.actions={jump:0,slide:0,dodge:0};this.hint('← → 換線；↑／Space 跳躍；↓ 滑行。橫跨三線的木欄必須跳，拱門必須滑。閃光箭嘴會預告下一組障礙。');this.spawn();}
 spawn(){const id=this.rowId++,pattern=id<2?9:id%6,lane=Math.floor(this.r()*3),at=this.nextAt;let kinds=['gem','gem','gem'];
  if(pattern===0)kinds=['log','log','log'];else if(pattern===1)kinds=['arch','arch','arch'];else if(pattern===2)kinds=[0,1,2].map(l=>l===lane?'gem':'wall');else if(pattern===3)kinds=[0,1,2].map(l=>l===lane?'pit':'gem');else if(pattern===4)kinds=[0,1,2].map(l=>l===lane?'wall':'log');else kinds=[0,1,2].map(l=>l===lane?'gem':'arch');
  this.obstacles.push({id,at,kinds,checked:false,kind:pattern});this.nextAt+=70+this.r()*14;this.lastPattern=pattern;
 }
 act(k){if(this.done)return;if(k==='left'||k==='right'){const n=R2.clamp(this.lane+(k==='right'?1:-1),0,2);if(n!==this.lane){this.lane=n;this.actions.dodge++;}}if((k==='up'||k==='action')&&this.jump===0&&this.slide===0){this.jumpV=420;this.jump=.01;this.actions.jump++;this.sound(510,.07,'triangle');}if(k==='down'&&this.jump===0){this.slide=.72;this.actions.slide++;this.sound(230,.04,'triangle');}}
 update(dt){this.inv=Math.max(0,this.inv-dt);this.slide=Math.max(0,this.slide-dt);const speed=[35,40,46][this.d]+(this.level-1)*3;this.distance+=speed*dt;this.level=Math.min(3,1+Math.floor(this.distance/500));this.visualLane+=(this.lane-this.visualLane)*Math.min(1,dt*17);if(this.jump>0){this.jumpV-=1050*dt;this.jump=Math.max(0,this.jump+this.jumpV*dt);if(this.jump===0)this.jumpV=0;}
  while(this.nextAt<this.distance+230)this.spawn();for(const o of this.obstacles){if(o.checked||o.at>this.distance)continue;o.checked=true;const k=o.kinds[this.lane],safe=k==='gem'||k==='log'&&this.jump>29||k==='pit'&&this.jump>26||k==='arch'&&this.slide>0&&this.jump===0;if(safe){this.combo++;this.score+=40+Math.min(this.combo,20)*3;if(k==='gem'){this.gems++;this.score+=50;this.sound(740,.055);}else this.sound(k==='arch'?430:650,.06,'triangle');}else if(this.inv===0){this.health--;this.inv=1.3;this.combo=0;this.say(k==='arch'?'低身滑過拱門。':k==='wall'?'石牆不能跳過，提早換線。':'看見橫欄或裂縫，提早跳躍。');this.sound(150,.16,'triangle');if(!this.health)return R2.finish(this,false,`送信走了 ${Math.floor(this.distance)} 米；露珠 ${this.gems} 顆。`);}}
  this.obstacles=this.obstacles.filter(o=>o.at>this.distance-20);if(this.distance>=1500){this.distance=1500;return R2.finish(this,true,`三個區域送達；連續避障 ${this.combo} 次，露珠 ${this.gems} 顆。`);}this.stat=`第 ${this.level}/3 區 · ${Math.floor(this.distance)}/1500 米 · 連續 ${this.combo}`;R2.beat(this,dt,0);
 }
 draw(){const c=this.c;R2.sky(c,this.level,this.distance/8);const colors=['#b99b75','#bd8270','#737da0'];D.poly(c,[{x:332,y:161},{x:468,y:161},{x:800,y:560},{x:0,y:560}],colors[this.level-1]);for(let i=0;i<14;i++){const z=((i/14+this.distance/180)%1),y=166+z*z*394,w=136+z*664;D.line(c,[{x:400-w/2,y},{x:400+w/2,y}],'#faf2d244',2);}for(const sign of [-1,1])D.line(c,[{x:400+sign*24,y:162},{x:400+sign*133,y:560}],'#ffe8a2aa',3);
  for(let i=0;i<6;i++){const z=((i/6+this.distance/460)%1);for(const side of [-1,1]){const x=400+side*(95+z*z*330),y=175+z*z*390,w=12+z*27;R2.rect(c,x-w/2,y-w*3,w,w*3.2,'#315c6680',3);R2.rect(c,x-w*.8,y-w*3.4,w*1.6,w*.4,'#467787',3);}}
  const project=(lane,at)=>{const f=R2.clamp(1-(at-this.distance)/240,0,1.1);return{x:400+(lane-1)*225*f,y:167+f*f*323,s:.1+f*.96};};
  for(const o of [...this.obstacles].sort((a,b)=>b.at-a.at))for(let lane=0;lane<3;lane++){const p=project(lane,o.at),k=o.kinds[lane];c.save();c.translate(p.x,p.y);c.scale(p.s,p.s);if(k==='gem'){R2.gem(c,0,-25,17);}if(k==='log'){R2.rect(c,-64,-39,128,39,'#865943',8);D.ellipse(c,-57,-18,9,21,'#f2c28b');D.line(c,[{x:-40,y:-27},{x:52,y:-27}],'#c49467',5);}if(k==='arch'){R2.rect(c,-69,-132,18,134,'#486c78',5);R2.rect(c,51,-132,18,134,'#486c78',5);R2.rect(c,-77,-116,154,61,'#e5bb79',8);R2.text(c,'↓',0,-84,44,'#3b566a');}if(k==='wall'){R2.rect(c,-60,-150,120,150,'#677e87',8);for(let j=1;j<4;j++)D.line(c,[{x:-54,y:-j*37},{x:54,y:-j*37}],'#8ea0a1',3);R2.text(c,'↔',0,-78,34,'#f5d383');}if(k==='pit')D.ellipse(c,0,0,91,19,'#182c42');c.restore();}
  const x=400+(this.visualLane-1)*225;D.ellipse(c,x,505,37,9,'#172c4244');c.save();c.globalAlpha=this.inv&&Math.floor(this.t*12)%2?.42:1;c.translate(x,462-this.jump);if(this.slide)c.translate(0,10);R2.pose(c,0,0,1.05,'fox',this.skin==='moonlight'?'#939edb':'#458c98',this.done&&this.won?'victory':this.slide?'slide':this.jump>0?'jump':this.inv>0?'hit':'run',this.t);c.restore();const next=this.obstacles.find(o=>!o.checked);if(next&&next.at-this.distance<95){R2.rect(c,267,91,266,42,'#17364bdb',12);R2.text(c,next.kind===0?'↑ 跳過橫欄':next.kind===1?'↓ 低身滑行':next.kind===2?'↔ 找到缺口':next.kind===3?'↑ 跳過裂縫，或換線':next.kind===4?'↔ 避開石牆，再跳過橫欄':next.kind===5?'↔ 走有露珠的一線，或↓滑過':'留意前方路線',400,112,21,'#ffe3a4');}R2.hud(this,['遺跡郵差 · 石林','遺跡郵差 · 峽谷','遺跡郵差 · 月廟'][this.level-1],`${Math.floor(this.distance)} / 1500 m`);R2.badge(this);}
}

class CloudIslandR2 extends WQGame{
 constructor(a){super(a);R2.setup(this);this.p={x:90,y:420,vx:0,vy:0};this.camera=0;this.coyote=.1;this.jumpBuffer=0;this.grounded=true;this.jumpHeld=false;this.dash=0;this.dashCD=0;this.platforms=[];this.coins=[];this.enemies=[];this.checkpoint={x:90,y:420,index:0};this.collected=0;this.mapEnd=2850;this.build();this.hint('← → 移動；↑／Space 跳躍，短按低跳、按住高跳；X 短衝。旗幟是安全點。掉下去會在最近的旗幟重生，不會連續失去生命。');}
 build(){this.platforms=[];this.coins=[];this.enemies=[];let x=0;for(let i=0;i<12;i++){const y=i%4===0?460:[420,385,425][i%3],w=i%4===0?245:180;const kind=i%4===0?'safe':(i+this.level-1)%5===3?'moving':(i+this.level-1)%5===1?'spring':'normal';this.platforms.push({id:i,x,y,baseY:y,w,kind});if(i%4!==0)this.coins.push({x:x+w*.55,y:y-60,taken:false});if(i%4===2)this.enemies.push({x:x+w*.65,y:y-22,base:x+w*.65,vy:0,phase:this.r()*6,stunned:0});x+=w+65+((i+this.level-1)%3)*8;}this.mapEnd=x-65;this.p={x:90,y:420,vx:0,vy:0};this.camera=0;this.checkpoint={x:90,y:420,index:0};this.grounded=true;this.coyote=.1;this.jumpBuffer=0;this.dash=0;this.dashCD=0;}
 act(k){if(k==='up'||k==='action'){this.jumpBuffer=.14;this.jumpHeld=true;}if(k==='x'&&this.dashCD===0){this.dash=.17;this.dashCD=1.4;this.sound(260,.07,'triangle');}}
 key(k,on){super.key(k,on);if(k==='up'||k==='action')this.jumpHeld=this.keys.has('up')||this.keys.has('action');}
 damage(reason){if(this.inv>0)return;this.health--;this.sound(165,.14,'triangle');if(this.health<=0)return R2.finish(this,false,`第 ${this.level} 區，收集 ${this.collected} 顆光石。`);this.respawn();this.say(reason+' 已回到安全旗幟。');}
 respawn(){this.p={x:this.checkpoint.x,y:this.checkpoint.y,vx:0,vy:0};this.inv=2.2;this.grounded=true;this.coyote=.1;this.jumpBuffer=0;this.dash=0;this.jumpHeld=this.keys.has('up')||this.keys.has('action');this.camera=R2.clamp(this.p.x-180,0,this.mapEnd-760);}
 update(dt){this.inv=Math.max(0,this.inv-dt);this.dash=Math.max(0,this.dash-dt);this.dashCD=Math.max(0,this.dashCD-dt);this.jumpBuffer=Math.max(0,this.jumpBuffer-dt);this.coyote=this.grounded?.11:Math.max(0,this.coyote-dt);if(this.jumpBuffer>0&&this.coyote>0){this.p.vy=-[500,500,485][this.d];this.grounded=false;this.coyote=0;this.jumpBuffer=0;this.sound(490,.07,'triangle');}
  const dx=(this.keys.has('right')?1:0)-(this.keys.has('left')?1:0),target=dx*(this.dash?430:245);this.p.vx=R2.approach(this.p.vx,target,dt*(this.grounded?1700:1000));if(!this.jumpHeld&&this.p.vy< -180)this.p.vy=Math.min(0,this.p.vy+1500*dt);this.p.vy=Math.min(750,this.p.vy+1150*dt);const oldY=this.p.y;this.p.x=R2.clamp(this.p.x+this.p.vx*dt,16,this.mapEnd-20);this.p.y+=this.p.vy*dt;this.grounded=false;
  for(const f of this.platforms){f.y=f.baseY+(f.kind==='moving'?Math.sin(this.t*1.7+f.id)*20:0);if(this.p.vy>=0&&this.p.x+16>f.x&&this.p.x-16<f.x+f.w&&oldY+22<=f.y+6&&this.p.y+22>=f.y){this.p.y=f.y-22;this.p.vy=0;this.grounded=true;if(f.kind==='spring'&&this.jumpHeld){this.p.vy=-580;this.grounded=false;this.sound(620,.08);}if(f.kind==='safe'&&f.id>this.checkpoint.index){this.checkpoint={x:f.x+75,y:f.y-22,index:f.id};this.score+=150;this.say('旗幟已亮起：安全重生點。');this.sound(730,.1);}}}
  for(const item of this.coins)if(!item.taken&&R2.hit(this.p,item,36)){item.taken=true;this.collected++;this.score+=100;this.sound(880,.07);}
  for(const e of this.enemies){e.stunned=Math.max(0,e.stunned-dt);e.phase+=dt;e.x=e.base+Math.sin(e.phase*(1+this.d*.2+(this.level-1)*.1))*45;if(!e.stunned&&R2.hit(this.p,e,34)){if(this.p.vy>90&&this.p.y<e.y-12){e.stunned=3;this.p.vy=-370;this.score+=60;this.sound(650,.06);}else this.damage('碰到巡遊風球。');}}
  if(this.p.y>620){if(this.inv>0){const remaining=this.inv;this.respawn();this.inv=remaining;}else this.damage('這次未踏上平台。');}if(this.done)return;
  const last=this.platforms.at(-1);if(this.p.x>last.x+last.w-55&&this.grounded){this.score+=500;if(this.level===3)return R2.finish(this,true,`三座雲島完成，找到 ${this.collected} 顆光石。`);this.level++;this.build();this.inv=1.2;this.health=Math.min(3,this.health+1);this.say('下一座雲島；回復一顆心。');}
  this.camera+= (R2.clamp(this.p.x-250,0,this.mapEnd-760)-this.camera)*Math.min(1,dt*7);this.stat=`第 ${this.level}/3 島 · 旗幟 ${Math.floor(this.checkpoint.index/4)+1}/3 · 光石 ${this.collected}`;R2.beat(this,dt,1);
 }
 draw(){const c=this.c;R2.sky(c,this.level,this.camera/7);c.save();c.translate(-this.camera,0);for(const f of this.platforms){R2.rect(c,f.x,f.y,f.w,120,'#365d7277',18);R2.rect(c,f.x,f.y,f.w,21,f.kind==='spring'?'#e9b377':f.kind==='moving'?'#91a7dd':'#609a94',8);D.poly(c,[{x:f.x+12,y:f.y+30},{x:f.x+f.w*.48,y:f.y+166},{x:f.x+f.w-10,y:f.y+30}],'#477389');if(f.kind==='safe'){D.line(c,[{x:f.x+75,y:f.y},{x:f.x+75,y:f.y-93}],'#f3d49e',4);D.poly(c,[{x:f.x+76,y:f.y-93},{x:f.x+127,y:f.y-80},{x:f.x+76,y:f.y-64}],f.id<=this.checkpoint.index?'#fae08b':'#edf6ee');}if(f.kind==='spring'){for(let i=0;i<3;i++)R2.text(c,'↑',f.x+45+i*45,f.y+11,20,'#463d60');}}
  for(const coin of this.coins)if(!coin.taken)R2.gem(c,coin.x,coin.y+Math.sin(this.t*4+coin.x)*4,12);
  for(const e of this.enemies){D.ellipse(c,e.x,e.y,22,18,e.stunned?'#9db4c588':'#b4a4e3');R2.text(c,e.stunned?'· ·':'~',e.x,e.y,18,'#354361');}
  const last=this.platforms.at(-1);R2.rect(c,last.x+last.w-65,last.y-112,47,112,'#ffe0a0',12);R2.text(c,'門',last.x+last.w-41,last.y-72,22,'#435c69');c.save();c.globalAlpha=this.inv&&Math.floor(this.t*12)%2?.4:1;WQAFeng.renderGame(c,this);c.restore();c.restore();R2.hud(this,'雲島探險',`第 ${this.level}/3 島 · 光石 ${this.collected}`);R2.rect(c,24,75,180,8,'#ffffff80',4);R2.rect(c,24,75,180*R2.clamp(this.p.x/this.mapEnd,0,1),8,'#f5d17d',4);R2.badge(this);}
}

class StarPatrolR2 extends WQGame{
 constructor(a){super(a);R2.setup(this);this.p={x:400,y:452};this.shots=[];this.drones=[];this.orbs=[];this.drops=[];this.wave=0;this.waveClock=.8;this.fireClock=0;this.boss=null;this.bosses=0;this.shield=0;this.shieldCD=0;this.mode=0;this.power=1;this.chain=0;this.nextId=0;this.hint('按方向鍵或 WASD 飛行，會自動發射能量泡。Space 開護盾，X 切換散射／集中。按住 Shift 可以慢慢移動。閃開核心就安全。每區有六波敵機和一架大型敵機。');}
 act(k){if(k==='action'&&this.shieldCD===0){this.shield=1.45;this.shieldCD=7;this.orbs=[];this.sound(330,.18,'triangle');}if(k==='x'){this.mode=1-this.mode;this.sound(660,.05);}}
 spawnWave(){this.wave++;const n=4+this.d,kind=(this.wave-1)%3;for(let i=0;i<n;i++)this.drones.push({id:this.nextId++,x:100+i*(600/(n-1)),y:-30-i*19,base:100+i*(600/(n-1)),kind,age:0,hp:2+this.level,fire:.6+i*.16});this.waveClock=4.4-this.d*.25;}
 damage(){if(this.inv||this.shield)return;this.health--;this.inv=1.8;this.power=Math.max(1,this.power-1);this.chain=0;this.orbs=this.orbs.filter(o=>!R2.hit(o,this.p,90));this.sound(150,.16,'triangle');if(this.health===0)R2.finish(this,false,`闖過 ${this.bosses} 區的大型敵機，得 ${Math.floor(this.score)} 分。`);}
 update(dt){this.inv=Math.max(0,this.inv-dt);this.shield=Math.max(0,this.shield-dt);this.shieldCD=Math.max(0,this.shieldCD-dt);const speed=this.keys.has('hold')||this.orbs.some(o=>Math.abs(o.x-this.p.x)<90&&Math.abs(o.y-this.p.y)<140)?150:300,dx=(this.keys.has('right')?1:0)-(this.keys.has('left')?1:0),dy=(this.keys.has('down')?1:0)-(this.keys.has('up')?1:0),norm=Math.hypot(dx,dy)||1;this.p.x=R2.clamp(this.p.x+dx/norm*speed*dt,38,762);this.p.y=R2.clamp(this.p.y+dy/norm*speed*dt,100,505);this.fireClock-=dt;
  if(this.fireClock<=0){this.fireClock+=this.mode===0?.15:.11;for(let i=-1;i<=1;i++){if(this.mode===1&&i!==0)continue;this.shots.push({x:this.p.x+i*12,y:this.p.y-24,vx:i*(this.mode===0?65:0),vy:-610,power:(this.mode===1?2:1)+(this.power-1)*.5});}if(Math.floor(this.t*4)%3===0)this.sound(960,.027,'sine',.015);}
  this.waveClock-=dt;if(!this.boss&&this.wave<6&&this.waveClock<=0)this.spawnWave();if(!this.boss&&this.wave===6&&this.waveClock<=0&&this.drones.length===0)this.boss={x:400,y:115,hp:130+this.d*25+this.level*20,max:130+this.d*25+this.level*20,age:0,fire:1};
  for(const e of this.drones){e.age+=dt;e.y+=(65+this.level*7+this.d*8)*dt;e.x=e.base+Math.sin(e.age*(e.kind+1))*[55,105,38][e.kind];e.fire-=dt;if(e.fire<=0){e.fire=1.6-this.d*.15;const a=Math.atan2(this.p.y-e.y,this.p.x-e.x);for(let k=0;k<(e.kind===2?3:1);k++){const b=a+(k-(e.kind===2?1:0))*.22;this.orbs.push({x:e.x,y:e.y,vx:Math.cos(b)*(145+this.d*20),vy:Math.sin(b)*(145+this.d*20)});}}if(R2.hit(this.p,e,27))this.damage();}
  if(this.boss){const b=this.boss;b.age+=dt;b.x=400+Math.sin(b.age*.75)*240;b.fire-=dt;if(b.fire<=0){b.fire=b.hp<b.max*.5?.58:.83;const aim=Math.atan2(this.p.y-b.y,this.p.x-b.x),n=(b.hp<b.max*.5?7:5)-(this.d===0?2:0);for(let i=0;i<n;i++){const a=aim+(i-(n-1)/2)*.20;this.orbs.push({x:b.x,y:b.y+22,vx:Math.cos(a)*(175+this.d*15),vy:Math.sin(a)*(175+this.d*15)});}this.sound(210,.04,'triangle',.025);}}
  for(const s of this.shots){s.x+=s.vx*dt;s.y+=s.vy*dt;let hit=this.drones.find(e=>e.hp>0&&R2.hit(s,e,25));if(hit){hit.hp-=s.power;s.y=-100;if(hit.hp<=0){this.chain++;this.score+=80+Math.min(this.chain,30)*5;R2.particles(this,hit.x,hit.y,'#8eedda');this.sound(520+Math.min(this.chain||0,20)*18,.06,'triangle',.06);if(this.chain%5===0)this.drops.push({x:hit.x,y:hit.y});}}else if(this.boss&&Math.abs(s.x-this.boss.x)<59&&Math.abs(s.y-this.boss.y)<36){this.boss.hp=Math.max(0,this.boss.hp-s.power);s.y=-100;this.score+=5;}}
  this.shots=this.shots.filter(s=>s.y>65&&s.x>0&&s.x<800).slice(-90);this.drones=this.drones.filter(e=>e.y<590&&e.hp>0).slice(-32);for(const o of this.orbs){o.x+=o.vx*dt;o.y+=o.vy*dt;if(R2.hit(o,this.p,this.shield?52:12)){o.y=900;if(!this.shield)this.damage();}}this.orbs=this.orbs.filter(o=>o.x>0&&o.x<800&&o.y>55&&o.y<555).slice(-180);
  for(const p of this.drops){p.y+=90*dt;if(R2.hit(p,this.p,30)){this.power=Math.min(3,this.power+1);this.score+=150;p.y=900;this.shieldCD=Math.max(0,this.shieldCD-2);this.sound(880,.1);}}this.drops=this.drops.filter(p=>p.y<550).slice(-12);
  if(this.boss&&this.boss.hp<=0){this.score+=2000;this.bosses++;this.boss=null;this.orbs=[];this.shots=[];this.wave=0;this.waveClock=2;this.inv=2;this.sound(780,.2,'triangle');if(this.bosses>=3)return R2.finish(this,true,`三段星環航線完成，最高連擊 ${this.chain}。`);this.level++;this.say('大型敵機已解除，前往下一段星環。');}
  this.stat=`第 ${this.level}/3 星環 · 第 ${this.wave}/6 波 · ${this.mode?'集中':'散射'} · 護盾 ${this.shieldCD?this.shieldCD.toFixed(1)+' 秒':'可用'}`;R2.fx(this,dt);R2.beat(this,dt,2);
 }
 draw(){const c=this.c;R2.sky(c,this.level,this.t,true);c.save();c.strokeStyle='#8acde32b';c.lineWidth=9;for(let i=0;i<3;i++){c.beginPath();c.ellipse(400,210+i*110,330+i*38,85,0,0,Math.PI*2);c.stroke();}c.restore();
  for(const s of this.shots){R2.rect(c,s.x-3,s.y-14,6,22,this.mode?'#fff0ab':'#7eebdf',3);}for(const e of this.drones){D.poly(c,[{x:e.x,y:e.y+25},{x:e.x-25,y:e.y-4},{x:e.x-13,y:e.y-20},{x:e.x+13,y:e.y-20},{x:e.x+25,y:e.y-4}],['#93a7e9','#dcb17e','#a4d2b2'][e.kind]);D.circle(c,e.x,e.y,8,'#273c57');D.circle(c,e.x,e.y+2,3,'#f4d594');}
  if(this.boss){const b=this.boss;R2.rect(c,b.x-62,b.y-28,124,52,'#809aca',16);for(const sign of [-1,1])D.poly(c,[{x:b.x+sign*50,y:b.y-18},{x:b.x+sign*116,y:b.y+5},{x:b.x+sign*86,y:b.y+40},{x:b.x+sign*36,y:b.y+17}],'#d2aa85');D.circle(c,b.x,b.y,22,'#2e4a70');D.circle(c,b.x,b.y,12,b.hp<b.max*.5?'#f2bb99':'#8de1dd');R2.rect(c,180,76,440,8,'#ffffff40',4);R2.rect(c,180,76,440*Math.max(0,b.hp/b.max),8,'#f8cb86',4);}
  for(const o of this.orbs){D.circle(c,o.x,o.y,7,'#f5b7af');D.circle(c,o.x,o.y,3,'#fff7d4');}for(const p of this.drops)R2.gem(c,p.x,p.y,13,'#a1f6ce');
  const p=this.p;c.save();c.globalAlpha=this.inv&&Math.floor(this.t*12)%2?.4:1;if(this.shield){D.circle(c,p.x,p.y,49,'#9cebd326','#9cebd3');}D.poly(c,[{x:p.x,y:p.y-31},{x:p.x-13,y:p.y-5},{x:p.x-35,y:p.y+17},{x:p.x-12,y:p.y+13},{x:p.x,y:p.y+23},{x:p.x+12,y:p.y+13},{x:p.x+35,y:p.y+17},{x:p.x+13,y:p.y-5}],'#ddedf0');D.poly(c,[{x:p.x,y:p.y-20},{x:p.x-7,y:p.y+5},{x:p.x+7,y:p.y+5}],'#5d8cab');D.circle(c,p.x,p.y,4,'#ffe1a1');D.ellipse(c,p.x,p.y+28,5,10+Math.sin(this.t*40)*3,'#80ddd4');c.restore();R2.drawFx(this);R2.hud(this,'星環巡航',`第 ${this.level}/3 區 · ${this.wave}/6 波`);R2.text(c,`空白鍵護盾 ${this.shieldCD?Math.ceil(this.shieldCD)+'s':'READY'} · X ${this.mode?'集中':'散射'}`,400,540,16,'#a5e8da');R2.badge(this);}
}

class LighthouseWellR2 extends WQGame{
 constructor(a){super(a);R2.setup(this);this.p={x:400,y:172,vx:0,vy:0};this.camera=0;this.platforms=[];this.nextY=220;this.nextId=0;this.floor=0;this.gems=0;this.parachute=0;this.chuteCD=0;this.dropTime=0;this.onPlatform=-1;this.target=60;for(let i=0;i<11;i++)this.addPlatform();this.hint('← →／A D 移動；↓ 穿過腳下的平台；Space 開降落傘。平台有移動的、輸送帶、彈簧和會碎的。頂部的警戒線會追上來。目標是下到 60 層。');}
 addPlatform(){const id=this.nextId++,prev=this.platforms.at(-1),x=id===0?400:R2.clamp((prev?.base||400)+(this.r()-.5)*145,235,565);let kind=id<4?'safe':(id<12&&id%7===6?'safe':['safe','moving','belt','crumble','spring','safe','hazard'][id%7]);this.platforms.push({id,x,base:x,y:this.nextY,w:kind==='moving'?185:175,kind,life:-1,taken:false});this.nextY+=79;}
 act(k){if(k==='down'){this.dropTime=.24;this.p.y+=5;this.p.vy=100;this.onPlatform=-1;}if(k==='action'&&this.chuteCD===0){this.parachute=1.3;this.chuteCD=6;this.sound(390,.09,'triangle');}}
 damage(){if(this.inv>0)return;this.health--;this.sound(155,.13,'triangle');if(!this.health){this.inv=2.3;return R2.finish(this,false,`深入 ${this.floor} 層，收集 ${this.gems} 顆燈芯。`);}this.respawn();}
 respawn(grace=2.3){let f=this.platforms.find(f=>f.y>this.camera+225&&f.y<this.camera+450&&f.kind!=='hazard'&&f.life!==0);if(!f){f={id:this.nextId++,x:400,base:400,y:this.camera+300,w:220,kind:'safe',life:-1,taken:false};this.platforms.push(f);}this.p={x:f.x,y:f.y-20,vx:0,vy:0};this.onPlatform=f.id;this.inv=grace;this.dropTime=0;this.parachute=0;this.say('安全平台重生，先看下一個落點。');}
 update(dt){this.inv=Math.max(0,this.inv-dt);this.parachute=Math.max(0,this.parachute-dt);this.chuteCD=Math.max(0,this.chuteCD-dt);this.dropTime=Math.max(0,this.dropTime-dt);this.level=Math.min(3,1+Math.floor(this.floor/20));this.camera+=(this.t<2?0:[26,34,42][this.d]+(this.level-1)*6)*dt;const dx=(this.keys.has('right')?1:0)-(this.keys.has('left')?1:0);this.p.vx=R2.approach(this.p.vx,dx*255,dt*1800);this.p.x=R2.clamp(this.p.x+this.p.vx*dt,193,607);this.p.vy=Math.min(this.parachute?72:520,this.p.vy+760*dt);const oldY=this.p.y;this.p.y+=this.p.vy*dt;this.onPlatform=-1;
  for(const f of this.platforms){if(f.kind==='moving')f.x=f.base+Math.sin(this.t*1.5+f.id)*28;if(f.life>0){f.life=Math.max(0,f.life-dt);}if(f.life===0)continue;if(this.dropTime===0&&this.p.vy>=0&&oldY+20<=f.y+5&&this.p.y+20>=f.y&&Math.abs(this.p.x-f.x)<f.w/2+9){this.p.y=f.y-20;this.p.vy=0;this.onPlatform=f.id;this.floor=Math.max(this.floor,f.id);this.score=Math.max(this.score,this.floor*30+this.gems*80);if(f.kind==='belt')this.p.x+=((f.id%2)?1:-1)*80*dt;if(f.kind==='crumble'&&f.life<0)f.life=.7;if(f.kind==='spring'&&this.inv===0){this.p.vy=-225;this.sound(500,.06);}if(f.kind==='hazard')this.damage();if(!f.taken&&f.id%4===1){f.taken=true;this.gems++;this.score+=80;this.sound(820,.07);}}}
  while(this.nextY<this.camera+980)this.addPlatform();this.platforms=this.platforms.filter(f=>f.y>this.camera-130).slice(-20);if(!this.done&&(this.p.y<this.camera+87||this.p.y>this.camera+610)){if(this.inv>0)this.respawn(this.inv);else this.damage();}if(this.done)return;if(this.floor>=this.target)return R2.finish(this,true,`抵達燈塔第 ${this.target} 層，找回 ${this.gems} 顆燈芯。`);this.stat=`第 ${this.floor}/60 層 · 燈芯 ${this.gems} · 降落傘 ${this.chuteCD?Math.ceil(this.chuteCD)+' 秒':'可用'}`;R2.beat(this,dt,2);
 }
 draw(){const c=this.c;R2.sky(c,this.level,this.camera/22,true);R2.rect(c,167,65,466,495,'#183442f0',4);for(const x of [169,613]){R2.rect(c,x,65,18,495,'#789097',2);for(let i=0;i<9;i++)R2.rect(c,x-5,75+((i*72-this.camera*.6)%590+590)%590,28,12,'#d5bd91',2);}for(let i=0;i<6;i++){const y=((i*110-this.camera*.5)%660+660)%660;R2.rect(c,205,y,390,3,'#a9cfda17',0);}
  for(const f of this.platforms){const y=f.y-this.camera;if(y<60||y>580||f.life===0)continue;const col={safe:'#b6cfcb',moving:'#93b2d8',belt:'#87c7b4',crumble:'#d8bd8f',spring:'#b3a0df',hazard:'#de9979'}[f.kind];R2.rect(c,f.x-f.w/2,y,f.w,15,col,5);if(f.kind==='hazard')for(let i=0;i<6;i++)D.poly(c,[{x:f.x-70+i*25,y},{x:f.x-60+i*25,y:y-13},{x:f.x-50+i*25,y}],'#f0bf84');if(f.kind==='belt')R2.text(c,f.id%2?'› › › ›':'‹ ‹ ‹ ‹',f.x,y+7,18,'#28455a');if(f.kind==='moving')R2.text(c,'↔',f.x,y+7,19,'#2c485c');if(f.kind==='spring')R2.text(c,'⇡ ⇡ ⇡',f.x,y+7,19,'#403758');if(f.kind==='crumble')for(let i=0;i<4;i++)D.line(c,[{x:f.x-55+i*35,y:y+2},{x:f.x-42+i*35,y:y+13}],'#926846',2);if(!f.taken&&f.id%4===1)R2.gem(c,f.x,y-33,10,'#ffe6a6');}
  const y=this.p.y-this.camera;c.save();c.globalAlpha=this.inv&&Math.floor(this.t*11)%2?.4:1;if(this.parachute){D.ellipse(c,this.p.x,y-59,42,22,'#8fd6d5');D.line(c,[{x:this.p.x-40,y:y-54},{x:this.p.x,y:y-12},{x:this.p.x+40,y:y-54}],'#e9ead5',2);}R2.pose(c,this.p.x,y-9,.78,'panda','#cf9c70',this.done&&this.won?'victory':this.parachute?'jump':this.p.vy>20?'fall':Math.abs(this.p.vx||0)>10?'run':'idle',this.t,this.p.vx<0?-1:1);c.restore();R2.rect(c,187,72,426,7,'#e09b7e',2);R2.text(c,'頂部警戒線',400,94,16,'#f1bea2');R2.hud(this,'燈塔深井',`深度 ${this.floor} / 60`);R2.badge(this);}
}

class HarborVolleyR2 extends WQGame{
 constructor(a){super(a);R2.setup(this);this.p={x:190,y:453,vx:0,vy:0};this.ai={x:610,y:453,vx:0,vy:0,target:600,react:0};this.ball={x:190,y:357,vx:0,vy:0};this.points=[0,0];this.server=0;this.servePause=1.2;this.serveClock=0;this.cool=[0,0];this.touches=[0,0];this.side=0;this.rally=0;this.longest=0;this.spike=0;this.aim=0;this.aiError=0;this.hint('← → 移動，↑ 跳躍；Space 擊球。跳起近網可以扣球。在地面按住 ↓＋Space 打短球。每邊最多碰球三次。先得 5 分並領先 2 分就贏（最多 7 分）。');}
 act(k){if(k==='up'&&this.p.y>=452){this.p.vy=-400;this.sound(420,.05);}if(k==='action'){if(this.servePause>0&&this.server===0){this.servePause=0;this.serve();}else this.spike=.20;}}
 serve(){const who=this.server;this.ball={x:who?this.ai.x:this.p.x,y:340,vx:who?-180:180,vy:-385};this.touches=[0,0];this.side=who;this.cool=[.3,.3];this.rally=0;this.spike=0;this.serveClock=0;}
 point(who,why){this.points[who]++;this.longest=Math.max(this.longest,this.rally);this.score=this.points[0]*300+this.longest*15;this.touches=[0,0];this.sound(who===0?780:190,.15,'triangle');this.say(why+' '+this.points[0]+'：'+this.points[1]);const hi=Math.max(...this.points),diff=Math.abs(this.points[0]-this.points[1]);if(hi>=7||hi>=5&&diff>=2)return R2.finish(this,this.points[0]>this.points[1],`海港賽 ${this.points[0]}：${this.points[1]}；最長來回 ${this.longest} 次。`);this.server=who;this.servePause=1.6;this.p={x:190,y:453,vx:0,vy:0};this.ai={x:610,y:453,vx:0,vy:0,target:610,react:0};this.ball={x:who?610:190,y:357,vx:0,vy:0};this.touches=[0,0];this.cool=[0,0];this.spike=0;}
 strike(actor,who,manual=false){const b=this.ball,dx=b.x-actor.x,dy=b.y-actor.y,d=Math.hypot(dx,dy);if(d>=47||this.cool[who]>0)return false;this.cool[who]=.22;if(++this.touches[who]>3){this.point(1-who,'碰球超過三次。');return true;}this.touches[1-who]=0;const dir=who?-1:1,short=who===0&&this.keys.has('down'),air=actor.y<410&&Math.abs(actor.x-400)<150;
  if(manual&&air&&b.y<actor.y){b.vx=dir*(330+this.d*16);b.vy=actor.y<320?150:-80;this.sound(630,.08,'triangle');}else if(manual&&short){b.vx=dir*115;b.vy=-365;this.sound(540,.06);}else{b.vx=dir*(190+Math.abs(actor.x-400)*.10)+actor.vx*.16;b.vy=-445-this.d*8;this.sound(500,.045);}b.x=actor.x+(dx/(d||1))*48;b.y=Math.min(actor.y-42,b.y);this.rally++;this.longest=Math.max(this.longest,this.rally);return true;}
 update(dt){this.spike=Math.max(0,this.spike-dt);for(let i=0;i<2;i++)this.cool[i]=Math.max(0,this.cool[i]-dt);const dx=(this.keys.has('right')?1:0)-(this.keys.has('left')?1:0);this.p.vx=R2.approach(this.p.vx,dx*290,1800*dt);this.p.x=R2.clamp(this.p.x+this.p.vx*dt,44,357);for(const a of [this.p,this.ai]){a.vy+=880*dt;a.y=Math.min(453,a.y+a.vy*dt);if(a.y===453)a.vy=0;}
  if(this.servePause>0){this.servePause=Math.max(0,this.servePause-dt);this.ball.x=this.server?this.ai.x:this.p.x;this.ball.y=357;if(this.servePause===0)this.serve();this.stat=`${this.points[0]} : ${this.points[1]} · ${this.server?'對手':'你'}發球`;R2.beat(this,dt,1);return;}
  const b=this.ball;this.ai.react-=dt;if(this.ai.react<=0){this.ai.react=[.30,.22,.15][this.d];const disc=b.vy*b.vy+2*530*Math.max(0,430-b.y),t=R2.clamp((-b.vy+Math.sqrt(disc))/530,0,1.4);let predicted=b.x+b.vx*t;for(let i=0;i<3;i++){if(predicted<30)predicted=60-predicted;if(predicted>770)predicted=1540-predicted;}this.aiError=(this.r()-.5)*[65,35,15][this.d]*(1+Math.min(3,Math.max(0,this.rally-6)/6));this.ai.target=b.x<385&&b.vx<0?610:R2.clamp(predicted+this.aiError,448,756);}
  this.ai.vx=R2.clamp((this.ai.target-this.ai.x)*4,-[208,246,280][this.d],[208,246,280][this.d]);this.ai.x=R2.clamp(this.ai.x+this.ai.vx*dt,443,756);if(this.ai.y>=452&&b.x>430&&Math.abs(b.x-this.ai.x)<75&&b.y<365&&b.y>250&&b.vy>0)this.ai.vy=-390;
  const oldX=b.x;b.vy=Math.min(680,b.vy+530*dt);b.x+=b.vx*dt;b.y+=b.vy*dt;if(b.x<18){b.x=18;b.vx=Math.abs(b.vx);}if(b.x>782){b.x=782;b.vx=-Math.abs(b.vx);}if(b.y<80){b.y=80;b.vy=Math.abs(b.vy)*.7;}
  // Swept side test prevents a fast ball passing through the net in one frame.
  if(b.y>327&&((oldX<385&&b.x>=385&&b.vx>0)||(oldX>415&&b.x<=415&&b.vx<0))){b.x=oldX<400?384:416;b.vx*=-.72;}else if(b.y>313&&b.y<341&&Math.abs(b.x-400)<23&&b.vy>0){b.y=313;b.vy=-Math.abs(b.vy)*.75;}
  const side=b.x<400?0:1;if(side!==this.side){this.touches[side]=0;this.side=side;}
  this.strike(this.p,0,this.spike>0);if(!this.done&&this.servePause===0)this.strike(this.ai,1,this.ai.y<405&&this.d>0);
  if(!this.done&&this.servePause===0&&b.y>482)this.point(b.x<400?1:0,'球落地。');this.stat=`${this.points[0]} : ${this.points[1]} · 來回 ${this.rally} · 我方碰球 ${this.touches[0]}/3`;R2.beat(this,dt,1);
 }
 draw(){const c=this.c;R2.sky(c,this.level,this.t*.1);R2.rect(c,0,226,800,212,'#549ca9',0);for(let i=0;i<8;i++){const y=245+i*24;D.line(c,[{x:0,y},{x:800,y}],'#d3eddf50',2);}for(let i=0;i<4;i++){const x=80+i*215;D.poly(c,[{x,y:272},{x:x+59,y:272},{x:x+42,y:287},{x:x+10,y:287}],'#3b6073');D.poly(c,[{x:x+25,y:220},{x:x+25,y:271},{x:x+52,y:266}],'#f6e3b7');}R2.rect(c,0,441,800,119,'#ddbc8c',0);D.line(c,[{x:28,y:498},{x:772,y:498}],'#fff4d7',4);D.line(c,[{x:400,y:330},{x:400,y:510}],'#577685',8);for(let y=337;y<478;y+=15)D.line(c,[{x:389,y},{x:411,y}],'#fff2d0',2);
  for(const [a,who]of [[this.p,0],[this.ai,1]]){D.ellipse(c,a.x,486,39,8,'#6f63523a');R2.pose(c,a.x,a.y-6,.96,who?'fox':'rabbit',who?'#d19278':'#5c8cac',this.done&&this.won&&!who?'victory':this.servePause>0&&this.server===who?'serve':!who&&this.spike>0?'spike':a.y<440?'jump':Math.abs(a.vx)>12?'run':'idle',this.t,who?-1:1);if(who===0&&this.spike>0){c.save();c.strokeStyle='#ffde87';c.lineWidth=3;c.beginPath();c.arc(a.x,a.y,53,3.5,6);c.stroke();c.restore();}}
  const b=this.ball;D.ellipse(c,b.x,486,12+Math.max(0,500-b.y)*.025,4,'#65564733');D.circle(c,b.x,b.y,15,'#fff0b6','#567c91');D.line(c,[{x:b.x-13,y:b.y-5},{x:b.x+12,y:b.y+6}],'#6a9db3',5);D.line(c,[{x:b.x+5,y:b.y-13},{x:b.x-6,y:b.y+13}],'#dc947b',4);R2.hud(this,'海港排球',`你 ${this.points[0]}  :  ${this.points[1]} 對手`);R2.text(c,'先得5分 · 領先2分 · 最多7分',400,87,15,'#294d61');if(this.servePause>0){R2.rect(c,275,164,250,45,'#173b51dc',13);R2.text(c,this.server?'對手準備發球':'按「擊球」發球',400,187,20,'#ffe5a9');}R2.badge(this);}
}

const WQR2Games=[
 {id:'ruins-courier',name:'遺跡郵差',en:'RUINS COURIER',category:'動作',tag:'跳躍 × 滑行 × 路線',desc:'石林、峽谷、月廟，一共三段。看清橫欄和拱門，再決定跳、滑或換線。',guide:'方向鍵或 WASD：左右換線、上跳、下滑；Space 也可以跳。橫跨三線的障礙，一定要跳或滑。有三格生命，跑完 1500 米就完成。收集物只加分，不會得金幣。',keys:[['left','左'],['right','右'],['up','跳躍'],['down','滑行']],Class:RuinsCourierR2},
 {id:'cloud-island',name:'雲島探險',en:'CLOUD ISLAND',category:'動作',tag:'平台 × 跳躍技巧',desc:'探索三座雲島，用短跳、高跳、彈簧和短衝。有安全旗幟，掉下去也不用從頭來。',guide:'← →／A D 移動，↑／W／Space 跳躍，短按低跳、按住高跳；X 短衝。移動平台、彈簧和風球會改變路線。三座島都完成就過關。三格生命，三座島共用。',keys:[['left','左'],['right','右'],['up','跳躍'],['x','短衝']],Class:CloudIslandR2},
 {id:'star-patrol',name:'星環巡航',en:'STAR PATROL',category:'動作',tag:'閃避 × 走位 × 大型敵機',desc:'切換散射和集中的能量泡。穿過三種敵機陣形。大型敵機打到一半，會換攻擊方式。',guide:'按方向鍵或 WASD 飛行，會自動發射能量泡。Space 開護盾，X 切換集中／散射，Shift 慢慢移動。每區有六波敵機和一架大型敵機，三區都完成就過關。只有機械和能量，沒有血腥。',keys:[['left','左'],['up','上'],['down','下'],['right','右'],['action','護盾'],['hold','慢移'],['x','切換']],Class:StarPatrolR2},
 {id:'lighthouse-well',name:'燈塔深井',en:'LIGHTHOUSE WELL',category:'動作',tag:'落點 × 節奏 × 風險',desc:'越過輸送帶、移動平台、會碎的平台和彈簧。收集燈芯，下到六十層。',guide:'← →／A D 移動，↓ 穿過腳下的平台。Space 開降落傘，用完要等一會才能再用。避開橙色尖台和上面的警戒線。先看下一個落點。有三格生命，下到 60 層就完成。',keys:[['left','左'],['right','右'],['down','落下'],['action','降落傘']],Class:LighthouseWellR2},
 {id:'harbor-volley',name:'海港排球',en:'HARBOR VOLLEY',category:'運動',tag:'扣球 × 短球 × 看準球路',desc:'電腦對手要時間反應。用高球、扣球和短球來改變節奏。',guide:'← →／A D 移動、↑／W 跳躍、Space 擊球。在空中近網可以扣球。↓＋Space 打短球。身體碰到球，會自動接高球。每邊最多碰三次。先得 5 分並領先 2 分就贏，最多 7 分。',keys:[['left','左'],['right','右'],['up','跳躍'],['down','短球'],['action','擊球']],Class:HarborVolleyR2}
];
for(const m of WQR2Games)registerGame(m,m.Class);
globalThis.WQR2=Object.freeze({version:'R2.0.0',ids:Object.freeze(R2_IDS),games:WQR2Games});

/* Additional semantic checks run after the existing bounded, no-prototype schema scan. */
globalThis.WQR2Validate=function(id,s){
 const ok=(v,m)=>{if(!v)throw Error('R2局面：'+m);},num=(n,a,b)=>ok(Number.isFinite(n)&&n>=a&&n<=b,'數值範圍'),integer=(n,a,b)=>{num(n,a,b);ok(Number.isInteger(n),'整數');};
 integer(s.engineVersion,1,1);integer(s.health,0,3);num(s.inv,0,3);integer(s.level,1,3);ok(typeof s.won==='boolean','勝負');ok(['classic','sunset','moonlight'].includes(s.skin),'造型');ok(s.fx.length<=64,'粒子');num(s.musicClock,-.1,1);integer(s.musicStep,0,1e9);
 if(id==='ruins-courier'){integer(s.lane,0,2);num(s.visualLane,0,2);num(s.distance,0,1500);num(s.jump,0,110);num(s.jumpV,-700,421);num(s.slide,0,.73);ok(s.obstacles.length<=9,'障礙數');integer(s.rowId,0,100);num(s.nextAt,0,2100);for(const o of s.obstacles){ok(Array.isArray(o.kinds)&&o.kinds.length===3,'跑道');ok(o.kinds.every(k=>['log','arch','wall','pit','gem'].includes(k)),'障礙類型');num(o.at,0,2100);ok(typeof o.checked==='boolean','經過標記');} }
 if(id==='cloud-island'){ok(s.platforms.length===12,'平台數');ok(s.coins.length===9,'光石數');ok(s.enemies.length===3,'風球數');num(s.p.x,0,4000);num(s.p.y,-300,650);num(s.p.vx,-450,450);num(s.p.vy,-610,760);integer(s.checkpoint.index,0,8);const f=s.platforms.find(f=>f.id===s.checkpoint.index);ok(f&&f.kind==='safe'&&s.checkpoint.x===f.x+75||s.checkpoint.index===0&&s.checkpoint.x===90,'安全旗幟');ok(s.checkpoint.y===(s.checkpoint.index===0?420:f.y-22),'重生高度');num(s.camera,0,4000);num(s.dash,0,.18);num(s.dashCD,0,1.5);for(const f of s.platforms){num(f.x,0,4000);num(f.y,350,485);num(f.w,175,250);ok(['safe','spring','normal','moving'].includes(f.kind),'平台類型');}}
 if(id==='star-patrol'){num(s.p.x,38,762);num(s.p.y,100,505);integer(s.wave,0,6);integer(s.bosses,0,3);num(s.shield,0,1.5);num(s.shieldCD,0,7.1);integer(s.mode,0,1);integer(s.power,1,3);ok(s.shots.length<=90&&s.orbs.length<=180&&s.drones.length<=32&&s.drops.length<=12,'飛行物上限');for(const xs of [s.shots,s.orbs])for(const o of xs){num(o.vx,-900,900);num(o.vy,-900,900);}if(s.boss){num(s.boss.hp,-9,300);num(s.boss.max,150,300);num(s.boss.x,100,700);}}
 if(id==='lighthouse-well'){num(s.camera,0,15000);num(s.p.x,175,625);num(s.p.y,-50,16000);integer(s.floor,0,200);ok(s.platforms.length<=21&&s.platforms.length>=1,'平台上限');num(s.parachute,0,1.4);num(s.chuteCD,0,6.1);for(const f of s.platforms){integer(f.id,0,250);num(f.x,170,630);num(f.w,160,230);num(f.life,-1,1);ok(['safe','moving','belt','crumble','spring','hazard'].includes(f.kind),'平台類型');}}
 if(id==='harbor-volley'){ok(s.points.length===2&&s.touches.length===2&&s.cool.length===2,'排球狀態');s.points.forEach(n=>integer(n,0,7));s.touches.forEach(n=>integer(n,0,3));num(s.p.x,44,357);num(s.ai.x,443,756);num(s.ball.x,0,800);num(s.ball.y,60,510);num(s.ball.vx,-700,700);num(s.ball.vy,-550,700);integer(s.server,0,1);integer(s.side,0,1);num(s.servePause,0,1.7);}
 return s;
};


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
 function renderGame(c,g){const d=describe(g),reduced=!!globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches;draw(c,g.p.x,g.p.y-3,.78,pose(d.action,d.time,d.face,reduced));}
 return Object.freeze({version:'3.2.0',states:STATES,palette:PALETTE,pose,draw,observe,describe,renderGame});
});
// Visual-state tracking is outside all saved gameplay objects.
if(typeof CloudIslandR2!=='undefined'){
 const prior=CloudIslandR2.prototype.update;
 CloudIslandR2.prototype.update=function(dt){const r=prior.call(this,dt);WQAFeng.observe(this,dt);return r;};
}
