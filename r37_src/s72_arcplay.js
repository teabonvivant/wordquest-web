/* R3.20 s72 - gameplay-action adapters (stage 2): for the 13 action / sport games the learning moment is a game action, not a menu choice.
 * Every adapter gives WQArcPlus.game[id].play = {verb, spawn, hit, gone, draw, near, slow, reward, wrong, cleanup} plus the game's own
 * mechanic (mech / forceMech / diff), events and per-wave difficulty. Rules that hold for all of them (see s70_arcplus.js):
 *  - the three word targets are plain side objects (s.pl / the question), never new fields on the game object and never pushed into the engine arrays
 *  - fields the engine recomputes every tick are not changed after its tick (only persistent fields: base, vy, v, camera, timers)
 *  - nothing here calls g.r() (the snapshot stores its state); the adapter's own random numbers come from s.rng */
(()=>{
 'use strict';
 const A=WQArcPlus,G=A.game,C=A.cfg,clamp=A.clamp;
 const hook=id=>G[id]||(G[id]={});
 const P=s=>s.pl;
 const SIN=x=>A.calm()?0:Math.sin(x);   /* decorative motion (bobbing, pulsing) stands still with prefers-reduced-motion */
 const withPlay=(id,cfg)=>{C[id]=Object.assign(C[id]||{},{play:true},cfg||{});};
 const bellIcon=(c,x,y,a)=>{c.save();c.globalAlpha=a==null?1:a;c.fillStyle='#FFD86B';c.strokeStyle='#fff';c.lineWidth=3;
  c.beginPath();c.moveTo(x-24,y+12);c.quadraticCurveTo(x-22,y-18,x,y-20);c.quadraticCurveTo(x+22,y-18,x+24,y+12);c.closePath();c.fill();c.stroke();
  c.fillStyle='#B8862E';c.beginPath();c.arc(x,y+16,5,0,7);c.fill();c.fillStyle='#fff';c.beginPath();c.arc(x,y-24,5,0,7);c.fill();c.restore();};


 /* game time that passed since the adapter last looked (the engine ran with a scaled dt, so this is the engine's own dt) */
 const dte=(g,pl)=>{const d=pl.lt==null?0:Math.max(0,Math.min(.1,(g.t||0)-pl.lt));pl.lt=g.t||0;return d;};
 const arcLen=(pts,i0,i1)=>{let L=0;for(let i=i0;i<i1;i++){const a=pts[i%pts.length],b=pts[(i+1)%pts.length];L+=Math.hypot(b.x-a.x,b.y-a.y);}return L;};
 /* "signs": the word tiles hang in a free part of the screen (row or column) and a dashed leader of the same colour runs to the marker of that word in the world */
 const signsRow=(q,cx,y)=>{const xs=A.xs3(q,cx);q.cr.forEach((k,i)=>{k.x=xs[i];k.y=y;k.vis=true;});};
 const signsCol=(q,cx,cy)=>{q.cr.forEach((k,i)=>{k.x=cx;k.y=cy+(i-1)*70;k.vis=true;});};
 function signsDraw(c,q,pts,r){
  for(const k of q.cr){
   const p=pts[k.i];
   if(p){c.save();c.globalAlpha=k.gone?.2:.85;c.strokeStyle=k.col;c.lineWidth=3;c.setLineDash([7,6]);c.beginPath();c.moveTo(k.x,k.y+k.h/2-2);c.lineTo(p.x,p.y);c.stroke();c.setLineDash([]);
    c.fillStyle=k.col;c.beginPath();c.arc(p.x,p.y,r||11,0,7);c.fill();c.lineWidth=3;c.strokeStyle='#fff';c.stroke();c.restore();}
   A.tile(c,k,k.x,k.y,{alpha:q.armed===false?.8:undefined});
  }
 }

 /* ================================================================= moon-bells: land on the bell that carries the right word */
 {const id='moon-bells';
  withPlay(id,{comboStar:6,first:8});
  const H=hook(id),BX=new WeakMap(),FR=new WeakSet();
  const amp=s=>[0,40,70][s.phase-1]||0;
  const bx=b=>{if(!BX.has(b))BX.set(b,b.x);return BX.get(b);};
  H.tick=(g,s,dt)=>{
   const p=g.p,pl=P(s);
   pl.prevY=pl.curY==null?p.y:pl.curY;pl.curY=p.y;
   if(pl.pvy!=null&&pl.pvy>=0&&p.vy<0)pl.apex=p.y-p.vy*p.vy/1520;   /* the world height this hop will reach */
   pl.pvy=p.vy;
   const a=amp(s),n=g.bells.length;
   for(let i=0;i<n;i++){
    const b=g.bells[i];
    if(Math.abs(b.y-p.y)>700)continue;
    const base=bx(b);
    if(b.x>1000||b.x<-100)continue;   /* a crumbled bell stays away */
    b.x=clamp(base+(a?Math.sin(g.t*1.1+i*1.7)*a:0),60,740);
    if(s.phase>=3&&b.used&&i<n-3&&i%10>=7&&!FR.has(b)){FR.add(b);b.x=-400;pl.frag=(pl.frag||0)+1;}   /* the 30 % fragile bells (phase 3) crumble after one landing */
   }
  };
  H.play={verb:'跳上寫着正確英文的鈴鐺',
   spawn(g,s,q){
    const pl=P(s),p=g.p,ap=pl.apex==null?p.y-145:pl.apex,n=g.bells.length;
    if(pl.curY==null)return false;
    if(g.bells[n-1].y>ap-300)return false;   /* the summit is close: no question near the finish */
    const cand=g.bells.map((b,i)=>({b,i})).filter(o=>o.b.y<ap-10&&o.b.y>ap-400&&o.i<n-2).sort((a,b)=>b.b.y-a.b.y);
    if(cand.length<2)return false;
    q.eta=2.6;   /* two hops up (about 1.2 s each) before the row can be landed on */
    const row=cand[1].b.y+42,sy=row-g.camera;   /* between two bell rows: no engine bell shares the target row, so the landing is never taken by an engine bell */
    if(sy<40||sy>330)return false;
    const xs=A.xs3(q,400);
    for(let i=0;i<3;i++){
     const k=q.cr[i];k.bx=xs[i];k.by=row;k.x=xs[i];k.y=sy+44;k.vis=true;
    }
    return true;
   },
   near(g,s,q){const pl=P(s);const ap=pl.apex==null?g.p.y:pl.apex;return q.cr.some(k=>!k.gone&&ap+1<=k.by-27&&Math.abs(g.p.x-k.bx)<260);},
   layout(g,s,q){for(const k of q.cr){k.y=k.by-g.camera+44;k.x=k.bx;k.vis=k.by-g.camera>40&&k.by-g.camera<520;}},
   hit(g,s,q){
    const pl=P(s),p=g.p,tol=[54,46,38][g.d];
    if(p.vy<=0)return -1;
    for(const k of q.cr){
     if(k.gone)continue;
     if(pl.prevY+27<=k.by&&p.y+27>=k.by&&Math.abs(p.x-k.bx)<tol){pl.land=k;return k.i;}
    }
    return -1;
   },
   gone(g,s,q){return q.cr.every(k=>k.by-g.camera>620);},
   draw(g,s,c,q){
    for(const k of q.cr){const sy=k.by-g.camera;if(sy<-30||sy>600)continue;
     bellIcon(c,k.bx,sy-4,k.gone?.3:1);A.tile(c,k,k.bx,sy+44);}
   },
   reward(g,s,q,cr){const pl=P(s),p=g.p,b=pl.land||cr;p.y=cr.by-27;p.vy=-650;pl.sj=(pl.sj||0)+1;pl.lastVy=-650;pl.land=null;g.sound(880,.2,'triangle',.12);return '🚀 超級跳！一口氣跳上三層';},
   wrong(g,s,q,cr){const p=g.p;p.y=cr.by-27;p.vy=-300;P(s).lastVy=-300;P(s).land=null;return '只彈起一小步';}
  };
  H.mech=(g,s)=>({superJumps:P(s).sj||0,lastVy:P(s).lastVy||0,fragile:P(s).frag||0,rescueArmed:!wq34S(g).saved});
  H.forceMech=(g,s)=>{g.p.vy=-650;P(s).sj=(P(s).sj||0)+1;P(s).lastVy=-650;return true;};
  H.diff=(g,s)=>({sway:amp(s),fragile:s.phase>=3?.3:0});
  H.pool=['moonbird'];
  H.names={moonbird:['月光鳥！','再多一次跌落救援']};
  H.events={moonbird(g,s){wq34S(g).saved=false;P(s).birds=(P(s).birds||0)+1;}};
 }
/* ================================================================= forest-dash: run through the lane gate that carries the right word */
 {const id='forest-dash';
  withPlay(id,{comboStar:6,first:8});
  const H=hook(id);
  const gateSpeed=g=>[.27,.31,.35][g.d]+Math.min(.04,g.distance/14000);   /* the engine's own row speed */
  const logEvery=s=>[0,10.5,7][s.phase-1]||0;
  const LOGY=(lane,z)=>({x:400+(lane-1)*224*Math.max(0,1-z),y:176+Math.pow(Math.max(0,1-z),2)*315,s:.15+Math.max(0,1-z)*.95});
  H.tick=(g,s,dt)=>{
   const pl=P(s),de=pl.lt==null?0:Math.max(0,g.t-pl.lt);pl.lt=g.t;
   /* a gate moves with the road: same speed formula as the engine rows */
   const q=s.q;if(q&&q.play&&q.gz!=null&&!q.pending)q.gz-=de*gateSpeed(g);
   /* fireflies: gems of the neighbouring lanes slide into the player's lane */
   if(pl.ff>0){pl.ff=Math.max(0,pl.ff-dt);for(const o of g.rows)if(o.kind==='gem'&&o.z>.2&&Math.abs(o.lane-g.lane)===1&&!o.checked){o.lane=g.lane;pl.ffMoved=(pl.ffMoved||0)+1;}}
   /* rolling log (phase 2+): shadow + shaking warning for 1.5 s, then it rolls in 1.6x faster than the road */
   if(!g.done){
    if(s.phase>=2){pl.logT=pl.logT==null?(logEvery(s)*.6):pl.logT-de;}
    if(s.phase>=2&&pl.logT<=0&&!(pl.logs&&pl.logs.length>=2)){
     const lane=Math.floor(s.rng()*3),arr=pl.logs||(pl.logs=[]);
     arr.push({lane,warn:1.5,z:1.15});
     if(s.phase>=3&&s.rng()<.3){const l2=(lane+1+Math.floor(s.rng()*2))%3;if(l2!==lane)arr.push({lane:l2,warn:1.5,z:1.15});}   /* two logs at most - one lane stays free */
     pl.logT=logEvery(s)*(.85+.3*s.rng());pl.logN=(pl.logN||0)+arr.length;
    }
    for(const L of pl.logs||[]){
     if(L.warn>0){L.warn-=de;continue;}
     L.z-=de*gateSpeed(g)*1.6;
     if(!L.done&&L.z<.075){L.done=true;
      if(L.lane===g.lane&&g.jump<36&&g.invincible===0&&!g.done){
       if(!A.absorb(g,s)){g.health--;g.invincible=1.8;g.combo=0;g.sound(185,.09);pl.logHits=(pl.logHits||0)+1;
        if(g.health<=0)g.end(`走過 ${Math.floor(g.distance)} 米；收集 ${g.gems} 顆露珠。`,'森林旅程結束');}
      }else if(L.lane===g.lane)pl.logDodged=(pl.logDodged||0)+1;
      else pl.logDodged=(pl.logDodged||0)+1;
     }
    }
    if(pl.logs)pl.logs=pl.logs.filter(L=>L.z>-.1);
   }
  };
  H.play={verb:'換到寫着正確英文的跑道，穿過字門',
   spawn(g,s,q){
    if(g.distance>1340||g.done)return false;
    g.rows=g.rows.filter(o=>!(o.z>.85&&o.z<1.45));g.spawn=Math.max(g.spawn,1.2);
    q.gz=1.15;q.eta=(1.15-.075)/gateSpeed(g);
    const xs=A.xs3(q,400);
    q.cr.forEach((k,i)=>{k.sx=xs[i];k.x=xs[i];k.y=128;k.vis=true;});
    return true;
   },
   slow(g,s,q){return q.gz>.35?.75:1;},
   near(g,s,q){return q.gz<.4;},
   hit(g,s,q){if(q.gz<.075){const i=g.lane;return q.cr[i]&&!q.cr[i].gone?i:-1;}return -1;},
   gone(g,s,q){return q.gz<-.2;},
   draw(g,s,c,q){
    const z=q.gz;
    q.cr.forEach((k,i)=>{
     const p=g.point(i,Math.max(z,.02));
     c.save();c.globalAlpha=.9;c.strokeStyle=k.col;c.lineWidth=3;c.setLineDash([6,6]);c.beginPath();c.moveTo(k.sx,k.y+30);c.lineTo(p.x,p.y-135*p.s);c.stroke();c.setLineDash([]);
     c.translate(p.x,p.y);c.scale(p.s,p.s);
     c.fillStyle='#88a890';c.fillRect(-47,-111,15,125);c.fillRect(32,-111,15,125);c.fillStyle=k.col;c.beginPath();c.roundRect?c.roundRect(-51,-112,102,26,10):c.rect(-51,-112,102,26);c.fill();c.restore();
     A.tile(c,k,k.sx,k.y);
    });
   },
   reward(g,s,q,cr){g.invincible=Math.max(g.invincible,2);g.distance=Math.min(1499,g.distance+20);P(s).sprints=(P(s).sprints||0)+1;return '⚡ 衝刺：2 秒無敵，向前 20 米';},
   wrong(){return '字門熄滅了';}
  };
  H.mech=(g,s)=>({logsSpawned:P(s).logN||0,logHits:P(s).logHits||0,logDodged:P(s).logDodged||0,logsActive:(P(s).logs||[]).length,sprints:P(s).sprints||0,fireflies:+(P(s).ff||0).toFixed(1),ffMoved:P(s).ffMoved||0});
  H.forceMech=(g,s)=>{const pl=P(s);pl.logs=(pl.logs||[]);pl.logs.push({lane:g.lane,warn:.2,z:1.15});pl.logN=(pl.logN||0)+1;return true;};
  H.diff=(g,s)=>({logRate:+(logEvery(s)?1/logEvery(s):0).toFixed(3),speed:+[1,1.1,1.2][s.phase-1]});
  H.pool=['fireflies'];
  H.names={fireflies:['螢火蟲燈籠！','8 秒內寶石都游向你']};
  H.events={fireflies(g,s){P(s).ff=8;}};
  const od=H.draw;
  H.draw=(g,s,c)=>{
   const pl=P(s),T=g.t||0;
   for(const L of pl.logs||[]){
    const z=Math.max(L.z,.02),p=LOGY(L.lane,z);
    c.save();
    if(L.warn>0){const k=.5+.5*SIN(T*18);c.globalAlpha=.75;c.fillStyle='rgba(20,10,10,.35)';c.beginPath();c.ellipse(400+(L.lane-1)*224*.8,176+.64*315*.85+0,70,16,0,0,7);c.fill();
     c.globalAlpha=.6+.4*k;c.fillStyle='#FFC94A';c.font='900 40px "Noto Sans TC",system-ui,sans-serif';c.textAlign='center';c.textBaseline='middle';c.lineWidth=6;c.strokeStyle='#3B2600';c.strokeText('!',400+(L.lane-1)*(60+120*.2),250);c.fillText('!',400+(L.lane-1)*(60+120*.2),250);}
    else{c.translate(p.x,p.y);c.scale(p.s,p.s);c.fillStyle='#865943';c.beginPath();c.roundRect?c.roundRect(-70,-62,140,62,26):c.rect(-70,-62,140,62);c.fill();c.fillStyle='#c49467';c.fillRect(-60,-48,120,8);c.fillStyle='#f2c28b';c.beginPath();c.ellipse(-64,-31,12,28,0,0,7);c.fill();}
    c.restore();
   }
   if(pl.ff>0){c.save();c.globalAlpha=.5;c.fillStyle='#FFE08A';for(let i=0;i<9;i++){c.beginPath();c.arc(120+((i*173+T*60)%560),130+SIN(T*3+i)*28+i*22,4,0,7);c.fill();}c.restore();}
  };
 }
 /* ================================================================= bounce-basket: the first balloon the ball touches is the answer */
 {const id='bounce-basket';
  withPlay(id,{comboStar:3,first:8,every:14,unit:3});
  const H=hook(id);
  const BAL=[[.25,.30],[.55,.50],[.85,.70]];   /* charge, flight time of the balloon along that charge's arc */
  const arc=(c,t)=>{const v=350+c*290;return {x:170+.82*v*t,y:397-.86*v*t+285*t*t};};
  const hoopX=s=>[0,50,80][s.phase-1]||0,hoopY=s=>[0,0,25][s.phase-1]||0;
  H.tick=(g,s,dt)=>{
   const pl=P(s),S=wq34S(g);
   S.hx=hoopX(s)?Math.sin((g.t||0)*.9)*hoopX(s):0;S.hy=hoopY(s)?Math.sin((g.t||0)*1.3)*hoopY(s):0;
   /* shots: a shot ended when flying goes false; the miss count of a question runs on that */
   if(pl.pf&&!g.flying){pl.pf=false;if(s.q&&s.q.play&&!s.q.pending&&s.q.armed!==false){s.q.shots=(s.q.shots||0)+1;}if(pl.windLeft>0){pl.windLeft--;if(pl.windLeft<=0)pl.wind=0;}}
   if(g.flying)pl.pf=true;
   if(g.flying&&pl.wind)g.ball.vx+=pl.wind*dt;
   /* basket detection (g.scored flips on the engine's own rule) -> streak + "hot ball" bonus */
   if(g.scored&&!pl.ps){pl.baskets=(pl.baskets||0)+1;pl.streak=(pl.streak||0)+1;
    if(pl.hot){pl.hot=false;pl.hotBonus=(pl.hotBonus||0)+A.addBonus(g,s,3);g.say('火熱球！再 +3 分');}
    if(pl.streak>=3&&!pl.hot){pl.hot=true;pl.streak=0;A.floatText(s,'🔥 火熱球',400,170,'#FFC94A',30);}}
   pl.ps=g.scored;
  };
  H.play={verb:'把球投向寫着正確英文的氣球',
   arm:2.5,
   spawn(g,s,q){
    if(g.flying||g.charging||g.drag||g.done)return false;
    const w=q.cr[0].w;
    q.cr.forEach((k,i)=>{const a=arc(BAL[i][0],BAL[i][1]);k.bx=a.x;k.by=a.y;k.x=a.x;k.y=a.y-52;k.vis=true;});
    q.shots=0;q.eta=0;return true;
   },
   near(g,s,q){return g.flying;},
   hit(g,s,q){
    if(!g.flying)return -1;
    const b=g.ball;
    for(const k of q.cr)if(!k.gone&&Math.hypot(b.x-k.bx,b.y-k.by)<40)return k.i;
    return -1;
   },
   gone(g,s,q){return (q.shots||0)>=2;},
   draw(g,s,c,q){
    const T=g.t||0;
    for(const k of q.cr){
     c.save();c.globalAlpha=k.gone?.3:1;c.strokeStyle='rgba(255,255,255,.7)';c.lineWidth=2;c.beginPath();c.moveTo(k.bx,k.by+24);c.lineTo(k.bx,k.by+44);c.stroke();
     const inf=q.armed===false?.35+.65*clamp(((g.t||0)-(q.visT==null?g.t:q.visT))/2.5,0,1):1;   /* inflating: not hittable yet */
     c.fillStyle=k.col;c.strokeStyle='#fff';c.lineWidth=3;c.beginPath();c.ellipse(k.bx,k.by+SIN(T*3+k.i)*3,24*inf,29*inf,0,0,7);c.fill();c.stroke();c.restore();
     A.tile(c,k,k.x,k.y-6+SIN(T*3+k.i)*3,{alpha:q.armed===false?.75:1});
    }
   },
   reward(g,s,q,cr){const pl=P(s);pl.hot=true;pl.streak=0;pl.popped=(pl.popped||0)+1;g.sound(880,.1,'triangle',.1);return '🔥 火熱球：下一個入球多 +3 分';},
   wrong(g,s,q,cr){P(s).streak=0;return '氣球洩氣了';}
  };
  H.mech=(g,s)=>({hot:!!P(s).hot,baskets:P(s).baskets||0,streak:P(s).streak||0,hotBonus:P(s).hotBonus||0,popped:P(s).popped||0,hoopOffset:[+(wq34S(g).hx||0).toFixed(1),+(wq34S(g).hy||0).toFixed(1)],hoop:[+g.hoop.x.toFixed(1),+g.hoop.y.toFixed(1)],wind:P(s).wind||0});
  H.forceMech=(g,s)=>{P(s).hot=true;return true;};
  H.diff=(g,s)=>({hoopX:hoopX(s),hoopY:hoopY(s)});
  H.pool=['wind'];
  H.names={wind:['起風了！','這一球會被吹向一邊']};
  H.events={wind(g,s){const pl=P(s);pl.wind=(s.rng()<.5?-1:1)*70;pl.windLeft=1;}};
  const wd=H.draw;
  H.draw=(g,s,c)=>{
   const pl=P(s);
   if(pl.wind){c.save();c.fillStyle='rgba(18,24,68,.82)';c.beginPath();c.roundRect?c.roundRect(300,86,200,40,14):c.rect(300,86,200,40);c.fill();c.fillStyle='#BFE3FF';c.font='900 22px "Noto Sans TC",system-ui,sans-serif';c.textAlign='center';c.textBaseline='middle';c.fillText((pl.wind>0?'風 →→→':'←←← 風'),400,106);c.restore();}
  };
 }
 /* ================================================================= sky-rescue: fly the plane through the word gem that is right */
 {const id='sky-rescue';
  withPlay(id,{comboStar:6,first:8});
  const H=hook(id),LANES=[130,229,328,427],BASE=new WeakMap();
  const SPEED=60;   /* the word column drifts slowly: reading time before the first gem can be touched */
  const flock=(g,s)=>{const y=LANES[Math.floor(s.rng()*4)],gold=P(s).goldSet||(P(s).goldSet=new WeakSet()),L=P(s).goldList||(P(s).goldList=[]);
   for(let i=0;i<5;i++){const o={x:860+i*78,y,kind:'bird',hit:false};g.items.push(o);gold.add(o);L.push({o,x:o.x});}};
  H.tick=(g,s,dt)=>{
   const pl=P(s),de=dte(g,pl),p=g.p;
   pl.seen=pl.seen||new WeakSet();pl.extra=pl.extra||new WeakSet();
   /* wave 2+: two clouds per group, wave 3: the clouds bob up and down (their y is a persistent field) */
   for(const o of g.items){
    if(o.kind!=='cloud')continue;
    if(!pl.seen.has(o)){pl.seen.add(o);BASE.set(o,o.y);
     if(s.phase>=2&&!pl.extra.has(o)&&g.items.length<100){const l0=Math.round((o.y-130)/99),l=(l0+1+Math.floor(s.rng()*3))%4,o2={x:o.x+34,y:LANES[l],kind:'cloud',hit:false};g.items.push(o2);pl.extra.add(o2);pl.seen.add(o2);BASE.set(o2,o2.y);}}
    if(s.phase>=3&&BASE.has(o))o.y=clamp(BASE.get(o)+Math.sin((g.t||0)*1.6+o.x*.012)*30,104,440);
   }
   /* gold birds: which ones were rescued (vanished while still on screen) and the chain of five */
   const L=pl.goldList||[];
   for(let i=L.length-1;i>=0;i--){const e=L[i];
    if(g.items.includes(e.o)){e.x=e.o.x;continue;}
    L.splice(i,1);
    if(e.x>-60){pl.chain=(pl.chain||0)+1;pl.goldSaved=(pl.goldSaved||0)+1;if(pl.chain>=5){pl.chain=0;pl.rainbow=3;pl.rainbowUses=(pl.rainbowUses||0)+1;A.floatText(s,'🌈 彩虹尾跡',400,170,'#FFC94A',30);}}
    else pl.chain=0;
   }
   if(pl.rainbow>0){pl.rainbow=Math.max(0,pl.rainbow-de);for(const o of g.items){if(o.kind==='cloud'||o.hit)continue;const d=Math.hypot(o.x-p.x,o.y-p.y);if(d<140&&d>1){o.x+=(p.x-o.x)*Math.min(1,de*5);o.y+=(p.y-o.y)*Math.min(1,de*5);}}}
  };
  H.play={verb:'飛過寫着正確英文的寶石',arm:2.5,
   spawn(g,s,q){
    if(g.done)return false;
    g.items=g.items.filter(o=>!(o.kind==='cloud'&&o.x>480));g.spawn=Math.max(g.spawn,3);
    const order=[0,1,2,3];for(let i=3;i>0;i--){const j=Math.floor(s.rng()*(i+1));[order[i],order[j]]=[order[j],order[i]];}
    const w=q.cr[0].w;
    q.cr.forEach((k,i)=>{k.wx=800+w/2+4;k.wy=LANES[order[i]];k.x=k.wx;k.y=k.wy;k.vis=false;});
    return true;
   },
   near(g,s,q){return q.armed;},
   layout(g,s,q){const w=q.cr[0].w;for(const k of q.cr){k.x=k.wx;k.y=k.wy;k.vis=k.wx<=800-w/2-2;}},
   hit(g,s,q){
    const p=g.p,w=q.cr[0].w;
    if(!q.armed)return -1;
    for(const k of q.cr){if(k.gone)continue;if(Math.abs(p.x-k.wx)<w/2+16&&Math.abs(p.y-k.wy)<44)return k.i;}
    return -1;
   },
   gone(g,s,q){const w=q.cr[0].w;return q.cr.every(k=>k.wx<-w/2-10);},
   draw(g,s,c,q){
    for(const k of q.cr){if(k.gone)continue;const T=g.t||0;
     c.save();c.globalAlpha=q.armed===false?.55:.9;A.tile(c,k,k.x,k.y+SIN(T*3+k.i)*3,{alpha:q.armed===false?.8:1});c.restore();
    }
   },
   reward(g,s,q,cr){g.energy=Math.min(5,g.energy+2);flock(g,s);P(s).gemEnergy=(P(s).gemEnergy||0)+1;return '⚡ 能量 +2，金色鳥群飛來！';},
   wrong(){return '寶石碎裂了';}
  };
  /* the column drifts with the road's own clock (engine dt) */
  {const t0=H.tick;H.tick=(g,s,dt)=>{const pl=P(s),de0=pl.lt==null?0:Math.max(0,Math.min(.1,(g.t||0)-pl.lt));if(s.q&&s.q.play&&!s.q.pending)for(const k of s.q.cr)if(k.wx!=null&&!k.gone)k.wx-=SPEED*de0;t0(g,s,dt);};}
  H.mech=(g,s)=>({goldChain:P(s).chain||0,goldSaved:P(s).goldSaved||0,rainbow:+(P(s).rainbow||0).toFixed(1),rainbowUses:P(s).rainbowUses||0,gemEnergy:P(s).gemEnergy||0});
  H.forceMech=(g,s)=>{P(s).rainbow=3;P(s).rainbowUses=(P(s).rainbowUses||0)+1;return true;};
  H.diff=(g,s)=>({clouds:[1,2,2][s.phase-1],bob:[0,0,30][s.phase-1]});
  H.pool=['flock'];
  H.names={flock:['金色鳥群！','一排金鳥，連救五隻有彩虹尾跡']};
  H.events={flock};
  const pd=H.draw;
  H.draw=(g,s,c)=>{
   const pl=P(s);
   c.save();c.setTransform(c.canvas.width/800,0,0,c.canvas.height/560,0,0);c.strokeStyle='#FFC94A';c.lineWidth=3;
   if(pl.goldSet)for(const o of g.items)if(!o.hit&&pl.goldSet.has(o)&&o.x>-40&&o.x<840){c.globalAlpha=.85;c.beginPath();c.arc(o.x,o.y,30,0,7);c.stroke();}
   if(pl.rainbow>0){const p=g.p;for(let i=0;i<5;i++){c.globalAlpha=.55;c.strokeStyle=['#FF8FC7','#FFC94A','#7EE3A1','#7CC8FF','#B79CFF'][i];c.lineWidth=5;c.beginPath();c.moveTo(p.x-30,p.y+i*5-10);c.lineTo(p.x-150,p.y+i*5-10);c.stroke();}}
   c.restore();
  };
 }

 /* ================================================================= star-patrol: shoot the lettered ship that carries the right word */
 {const id='star-patrol';
  withPlay(id,{comboStar:6,first:8});
  const H=hook(id);
  const dropMul=s=>[1,1.15,1.3][s.phase-1],fireMul=s=>[0,.10,.20][s.phase-1];
  H.tick=(g,s,dt)=>{
   const pl=P(s),de=dte(g,pl);
   /* difficulty: faster descent (y is persistent), shorter fire timers (fire is a plain timer) */
   if(s.phase>=2)for(const e of g.drones){e.y+=(dropMul(s)-1)*(65+g.level*7+g.d*8)*de;e.fire-=fireMul(s)*de;}
   /* reflecting shield: the enemy bullets of the previous tick become the player's own upward bullets the moment the shield opens */
   const on=g.shield>0;
   if(on&&!pl.shOn&&pl.snap&&pl.snap.length){
    let n=0;for(const o of pl.snap){if(g.shots.length>=88)break;g.shots.push({x:o.x,y:o.y,vx:0,vy:-420,power:1});n++;}
    pl.reflected=(pl.reflected||0)+n;if(n)A.floatText(s,'↩ 反彈 '+n,g.p.x,g.p.y-60,'#7CC8FF',26);
   }
   pl.shOn=on;pl.snap=g.orbs.slice(0,40).map(o=>({x:o.x,y:o.y}));
  };
  H.play={verb:'射中寫着正確英文的字母艦（要打 4 下）',arm:2.5,
   spawn(g,s,q){
    if(g.boss||g.done)return false;
    const gap=Math.max(180,q.cr[0].w+22),xs=[400-gap,400,400+gap];
    q.ships=q.cr.map((k,i)=>({k,hp:4,y:112,x:xs[i],flash:0,out:false}));
    q.cr.forEach((k,i)=>{k.x=xs[i];k.y=64;k.vis=true;});
    return true;
   },
   near(g,s,q){return q.armed;},
   layout(g,s,q){const T=g.t||0;for(const sh of q.ships){const k=sh.k;sh.y=Math.min(300,112+(T-q.spawnT)*22);k.x=sh.x;k.y=sh.y-50;k.vis=k.y>=60;}},
   hit(g,s,q){
    const pl=P(s);
    let res=-1;
    for(const o of g.shots){
     if(o.y<-50)continue;
     for(const sh of q.ships){
      if(sh.k.gone||sh.out)continue;
      if(Math.abs(o.x-sh.x)<36&&Math.abs(o.y-sh.y)<34){
       o.y=-100;
       if(!q.armed){pl.deflect=(pl.deflect||0)+1;break;}
       sh.hp--;sh.flash=.25;
       if(sh.hp<=0&&res<0){res=sh.k.i;pl.kills=(pl.kills||0)+1;}
       break;
      }
     }
    }
    return res;
   },
   gone(g,s,q){return q.t>34||!!g.boss;},
   draw(g,s,c,q){
    const T=g.t||0;
    for(const sh of q.ships){const k=sh.k;if(k.gone)continue;
     c.save();c.globalAlpha=q.armed===false?.65:1;
     c.fillStyle='#A9B8FF';c.strokeStyle='#fff';c.lineWidth=3;c.beginPath();c.moveTo(sh.x,sh.y+26);c.lineTo(sh.x-28,sh.y-6);c.lineTo(sh.x-14,sh.y-22);c.lineTo(sh.x+14,sh.y-22);c.lineTo(sh.x+28,sh.y-6);c.closePath();c.fill();c.stroke();
     c.fillStyle=k.col;c.beginPath();c.arc(sh.x,sh.y,9,0,7);c.fill();
     if(q.armed===false){c.strokeStyle='rgba(124,200,255,.9)';c.lineWidth=4;c.setLineDash([8,6]);c.beginPath();c.arc(sh.x,sh.y,40+SIN(T*6)*2,0,7);c.stroke();c.setLineDash([]);}
     for(let i=0;i<4;i++){c.fillStyle=i<sh.hp?'#FFC94A':'rgba(255,255,255,.25)';c.fillRect(sh.x-26+i*14,sh.y+34,11,7);}
     if(sh.flash>0){sh.flash-=1/60;c.strokeStyle='#fff';c.lineWidth=5;c.beginPath();c.arc(sh.x,sh.y,34,0,7);c.stroke();}
     c.restore();
     A.tile(c,k,k.x,k.y,{alpha:q.armed===false?.8:1});
    }
   },
   reward(g,s,q,cr){g.power=Math.min(3,(g.power||1)+1);g.shieldCD=0;return '✨ 火力 +1，護盾充滿';},
   wrong(){return '字母艦冒煙離場了';}
  };
  H.mech=(g,s)=>({reflected:P(s).reflected||0,shieldOn:g.shield>0,kills:P(s).kills||0,deflected:P(s).deflect||0,power:g.power});
  H.forceMech=(g,s)=>{const pl=P(s);if(pl.snap&&pl.snap.length===0)pl.snap=[{x:g.p.x,y:g.p.y-160}];g.act('action');return true;};
  H.diff=(g,s)=>({dropSpeed:dropMul(s),fireRate:fireMul(s)});
  H.pool=['overdrive'];
  H.names={overdrive:['火力全開！','護盾即時充能，火力 +1']};
  H.events={overdrive(g){g.shieldCD=0;g.power=Math.min(3,(g.power||1)+1);}};
 }
 /* ================================================================= lighthouse-well: land on the platform that carries the right word */
 {const id='lighthouse-well';
  withPlay(id,{comboStar:6,first:8,dockOnly:false});
  const H=hook(id);
  const camMul=s=>[1,1.15,1.3][s.phase-1],hazard=s=>[0,.10,.20][s.phase-1];
  const camSpeed=g=>(g.t<2?0:[26,34,42][g.d]+(g.level-1)*6);
  const ring=(g,s)=>{const pl=P(s);return clamp(330-g.floor*3.5,150,330)*(1+(pl.light||0)*.5);};
  H.tick=(g,s,dt)=>{
   const pl=P(s),de=dte(g,pl);
   pl.seen=pl.seen||new WeakSet();
   /* camera: ×1.15 / ×1.3 of the engine's rise (persistent field), ×0.7 under the lantern */
   const extra=(camMul(s)-1)-(pl.lantern>0?.3:0);
   if(extra)g.camera=Math.max(0,g.camera+extra*camSpeed(g)*de);
   if(pl.lantern>0)pl.lantern=Math.max(0,pl.lantern-de);
   if(pl.light>0)pl.light=Math.max(0,pl.light-de*.06);
   /* hazards: a share of the new platforms is a spiked one */
   for(const f of g.platforms){if(pl.seen.has(f))continue;pl.seen.add(f);
    if(f.kind==='safe'&&f.id>=12&&hazard(s)&&!f.grp&&s.rng()<hazard(s)){f.kind='hazard';pl.hazards=(pl.hazards||0)+1;}}
   pl.prevOn=pl.on==null?-1:pl.on;pl.on=g.onPlatform;
  };
  H.play={verb:'落在寫着正確英文的平台上',arm:2.5,
   spawn(g,s,q){
    if(g.done||g.inv>0)return false;
    const pl=P(s),pf=g.platforms;
    let a=-1;
    for(let i=0;i+2<pf.length;i++){
     const y1=pf[i+1].y-g.camera;
     if(pf[i+1].id===pf[i].id+1&&pf[i+2].id===pf[i].id+2&&y1>=500&&y1<=700&&pf[i].kind!=='hazard'){a=i;break;}
    }
    if(a<0)return false;
    const row=pf[a+1].y,xs=[190,400,610];
    q.grp=[];
    for(let j=0;j<3;j++){const f=pf[a+j];f.x=f.base=xs[j];f.y=row;f.kind='safe';f.life=-1;f.w=175;f.grp=true;pl.seen.add(f);q.grp.push(f);}
    q.cr.forEach((k,i)=>{k.pid=q.grp[i].id;});
    q.gx=xs;q.row=row;
    return true;
   },
   near(g,s,q){return q.armed;},
   layout(g,s,q){for(const k of q.cr){const f=q.grp[k.i],sy=f.y-g.camera;k.x=f.x;k.y=sy-(k.i===1?112:46);k.vis=k.y>=60&&k.y<=530&&sy<590;}},
   hit(g,s,q){
    if(!q.armed)return -1;
    const pl=P(s);
    if(g.onPlatform>=0&&g.onPlatform!==pl.prevOn){const k=q.cr.find(k=>k.pid===g.onPlatform&&!k.gone);if(k)return k.i;}
    return -1;
   },
   gone(g,s,q){return q.grp.every(f=>f.y-g.camera<80||f.life===0);},
   draw(g,s,c,q){
    for(const k of q.cr){if(k.gone)continue;const f=q.grp[k.i],sy=f.y-g.camera;
     c.save();c.globalAlpha=.9;c.strokeStyle=k.col;c.lineWidth=3;c.beginPath();c.moveTo(f.x-f.w/2,sy+2);c.lineTo(f.x+f.w/2,sy+2);c.stroke();
     c.setLineDash([6,6]);c.beginPath();c.moveTo(k.x,k.y+k.h/2);c.lineTo(f.x,sy-8);c.stroke();c.setLineDash([]);c.restore();
     A.tile(c,k,k.x,k.y,{alpha:q.armed===false?.8:1});
    }
   },
   reward(g,s,q,cr){const pl=P(s);g.chuteCD=0;pl.light=1;pl.refills=(pl.refills||0)+1;return '💡 燈芯補光：光圈全滿，降落傘可用';},
   wrong(g,s,q,cr){const f=q.grp[cr.i];f.kind='crumble';f.life=.7;P(s).crumbled=(P(s).crumbled||0)+1;return '平台碎裂，繼續落下（不扣命）';}
  };
  H.mech=(g,s)=>({ring:Math.round(ring(g,s)),light:+(P(s).light||0).toFixed(2),refills:P(s).refills||0,crumbled:P(s).crumbled||0,lantern:+(P(s).lantern||0).toFixed(1),hazards:P(s).hazards||0});
  H.forceMech=(g,s)=>{P(s).light=1;P(s).refills=(P(s).refills||0)+1;return true;};
  H.diff=(g,s)=>({camSpeed:camMul(s),hazard:hazard(s)});
  H.pool=['lantern'];
  H.names={lantern:['燈籠亮起！','光圈全滿，鏡頭慢 5 秒']};
  H.events={lantern(g,s){P(s).light=1;P(s).lantern=5;}};
  H.draw=(g,s,c)=>{   /* the well gets darker with depth: a dark veil with a round window around the lamp-bearer; the lantern / a right answer widens it */
   if(g.done)return;
   const p=g.p,x=p.x,y=p.y-g.camera,R=ring(g,s);
   c.save();c.setTransform(c.canvas.width/800,0,0,c.canvas.height/560,0,0);
   const gr=c.createRadialGradient(x,y,R*.55,x,y,R);gr.addColorStop(0,'rgba(8,12,34,0)');gr.addColorStop(1,'rgba(8,12,34,.62)');
   c.fillStyle=gr;c.fillRect(0,0,800,560);
   c.restore();
  };
 }

 /* ================================================================= cloud-island: collect the light stone that carries the right word */
 {const id='cloud-island';
  withPlay(id,{comboStar:6,first:8});
  const H=hook(id),EB=new WeakMap();
  const amp=s=>[0,40,80][s.phase-1];
  H.tick=(g,s,dt)=>{
   const pl=P(s),de=dte(g,pl),p=g.p;
   /* wind balls patrol wider: the base moves, the engine adds its own sine on top (judging and drawing both use the engine's e.x of the same tick) */
   g.enemies.forEach((e,i)=>{if(!EB.has(e))EB.set(e,e.base);e.base=EB.get(e)+(amp(s)?Math.sin((g.t||0)*.8+i*2)*amp(s):0);});
   /* jump shoes: the first frame of a jump (vy from >=0 to clearly negative) gets x1.25, kept inside the saved range */
   if(pl.boots>0){pl.boots=Math.max(0,pl.boots-de);if(pl.pvy!=null&&pl.pvy>=-5&&p.vy<-300){p.vy=Math.max(-610,p.vy*1.25);pl.boosted=(pl.boosted||0)+1;}}
   pl.pvy=p.vy;
  };
  H.play={verb:'碰到寫着正確英文的光石',arm:2.5,
   spawn(g,s,q){
    if(g.done||g.inv>0)return false;
    const w=q.cr[0].w,pls=g.platforms.filter(f=>{const sx=f.x+f.w/2-g.camera;return sx>w/2+10&&sx<790-w/2&&f.x+f.w*.5>g.p.x+60;});
    if(!pls.length)return false;
    const pick=pls.slice(0,3),mid=f=>f.x+f.w/2;
    const xs=pick.length>=3?[mid(pick[0]),mid(pick[1]),mid(pick[2])]:pick.length===2?[mid(pick[0]),mid(pick[1])-48,mid(pick[1])+48]:[mid(pick[0])-70,mid(pick[0]),mid(pick[0])+70];
    const th=pick.length>=3?[52,118,52]:[52,118,184];   /* tile height above the stone: staggered so the three words never overlap */
    const fy=pick.length>=3?[pick[0],pick[1],pick[2]]:pick.length===2?[pick[0],pick[1],pick[1]]:[pick[0],pick[0],pick[0]];
    q.cr.forEach((k,i)=>{k.wx=xs[i];k.wy=fy[i].y-60;k.th=th[i];k.vis=true;});
    return true;
   },
   near(g,s,q){return q.armed;},
   layout(g,s,q){q.cr.forEach((k,i)=>{k.x=k.wx-g.camera;k.y=k.wy-k.th;k.vis=k.x>0&&k.x<800;});},
   hit(g,s,q){
    const p=g.p;
    if(!q.armed)return -1;
    for(const k of q.cr){if(k.gone)continue;if(Math.hypot(p.x-k.wx,p.y-k.wy)<36)return k.i;}
    return -1;
   },
   gone(g,s,q){return q.cr.every(k=>k.wx-g.camera<-q.cr[0].w);},
   draw(g,s,c,q){
    const T=g.t||0;
    for(const k of q.cr){if(k.gone)continue;const sx=k.wx-g.camera,sy=k.wy+SIN(T*4+k.i)*4;
     c.save();c.globalAlpha=q.armed===false?.55:1;c.fillStyle=k.col;c.strokeStyle='#fff';c.lineWidth=3;c.beginPath();c.moveTo(sx,sy-18);c.lineTo(sx+14,sy);c.lineTo(sx,sy+18);c.lineTo(sx-14,sy);c.closePath();c.fill();c.stroke();c.restore();
     A.tile(c,k,k.x,k.y,{alpha:q.armed===false?.8:1});
    }
   },
   reward(g,s,q,cr){P(s).boots=8;P(s).bootsUsed=(P(s).bootsUsed||0)+1;return '👟 彈跳鞋 8 秒：跳得更高';},
   wrong(){return '光石變暗了';}
  };
  H.mech=(g,s)=>({boots:+(P(s).boots||0).toFixed(1),bootsUsed:P(s).bootsUsed||0,boosted:P(s).boosted||0,coins:g.coins.length,arcs:P(s).arcs||0});
  H.forceMech=(g,s)=>{P(s).boots=8;P(s).bootsUsed=(P(s).bootsUsed||0)+1;return true;};
  H.diff=(g,s)=>({windBall:amp(s)});
  H.pool=['coinarc'];
  H.names={coinarc:['光石弧！','前方一排光石']};
  /* F1 fix: the arc re-uses stones (taken first, then the ones left furthest behind) - the engine and the saved-game check need exactly 9 */
  H.events={coinarc(g,s){
   const p=g.p,order=g.coins.map((c,i)=>({c,i})).sort((a,b)=>(a.c.taken===b.c.taken?(a.c.x-b.c.x):(a.c.taken?-1:1)));
   const n=Math.min(7,order.length);
   for(let i=0;i<n;i++){const c=order[i].c;c.x=Math.min(g.mapEnd-30,p.x+170+i*46);c.y=Math.max(110,p.y-80-Math.sin(i/6*Math.PI)*70);c.taken=false;}
   P(s).arcs=(P(s).arcs||0)+1;}};
 }

 /* ================================================================= ruins-courier: carry the parcel through the lane that has the right word */
 {const id='ruins-courier';
  withPlay(id,{comboStar:6,first:8});
  const H=hook(id);
  const speed=g=>[35,40,46][g.d]+(g.level-1)*3;
  const mixRate=s=>[0,.2,.4][s.phase-1];
  const farthest=g=>g.obstacles.reduce((m,o)=>Math.max(m,o.at),g.distance);
  H.tick=(g,s,dt)=>{
   const pl=P(s);
   pl.seen=pl.seen||new WeakSet();
   /* harder rows: a share of the rows that just spawned (still at the horizon) becomes a mixed arch / log / gem row - only the game's own kinds */
   for(const o of g.obstacles){if(pl.seen.has(o))continue;pl.seen.add(o);
    if(!pl.mix)pl.mix=0;
    if(mixRate(s)&&o.id>=3&&o.at-g.distance>200&&s.rng()<mixRate(s)){
     const ks=['arch','log','gem'];for(let i=2;i>0;i--){const j=Math.floor(s.rng()*(i+1));[ks[i],ks[j]]=[ks[j],ks[i]];}
     o.kinds=ks;o.kind=6;pl.mix++;
    }}
   /* parcels / chests are judged by the engine's own distance clock */
   for(const pk of [pl.chest].filter(Boolean)){
    if(!pk.done&&pk.at<=g.distance){pk.done=true;
     if(g.lane===pk.lane){pl.chests=(pl.chests||0)+1;A.addBonus(g,s,120);s.x2=Math.max(s.x2,6);A.floatText(s,'🎁 寶箱！+120',400,200,'#FFC94A',30);g.sound(900,.12,'triangle');}
    }}
   if(pl.chest&&pl.chest.done)pl.chest=null;
  };
  H.play={verb:'換到有正確英文的跑道，把郵包送進去',
   spawn(g,s,q){
    if(g.done||g.distance>1250)return false;
    const at=farthest(g)+65;
    g.nextAt=Math.max(g.nextAt,at+65);
    q.at=at;q.eta=(at-g.distance)/speed(g);
    signsRow(q,400,128);
    return true;
   },
   near(g,s,q){return q.at-g.distance<45;},
   hit(g,s,q){if(q.at<=g.distance){const k=q.cr[g.lane];return k&&!k.gone?k.i:-1;}return -1;},
   gone(g,s,q){return q.at<g.distance-30;},
   draw(g,s,c,q){
    const f=clamp(1-(q.at-g.distance)/240,0,1.1),pts=q.cr.map((k,i)=>({x:400+(i-1)*225*f,y:167+f*f*323-30*(.1+f*.96)}));
    for(const k of q.cr){const p=pts[k.i];if(k.gone)continue;const sc=.1+f*.96;c.save();c.translate(p.x,p.y+30*sc);c.scale(sc,sc);c.fillStyle=k.col;c.strokeStyle='#fff';c.lineWidth=4;c.beginPath();c.roundRect?c.roundRect(-34,-46,68,46,8):c.rect(-34,-46,68,46);c.fill();c.stroke();c.fillStyle='#fff';c.fillRect(-4,-46,8,46);c.restore();}
    signsDraw(c,q,pts,8);
   },
   reward(g,s,q,cr){const pl=P(s);pl.stamps=(pl.stamps||0)+1;let txt='📮 郵票 +1（'+pl.stamps+'/3）';
    if(pl.stamps>=3){pl.stamps=0;pl.chestsOpened=(pl.chestsOpened||0)+1;if(g.health<3){g.health++;txt='🎁 郵票集滿：+1 命';}else{s.x2=Math.max(s.x2,12);txt='🎁 郵票集滿：12 秒雙倍分';}}
    return txt;},
   wrong(){return '郵包濕掉了';}
  };
  H.mech=(g,s)=>({stamps:P(s).stamps||0,stampChests:P(s).chestsOpened||0,chests:P(s).chests||0,mixedRows:P(s).mix||0,chestSpawned:P(s).chestSpawned||0,chestPending:!!P(s).chest});
  H.forceMech=(g,s)=>{const pl=P(s);pl.chestsOpened=(pl.chestsOpened||0)+1;if(g.health<3)g.health++;else s.x2=Math.max(s.x2,12);return true;};
  H.diff=(g,s)=>({mixedRows:mixRate(s)});
  H.pool=['chest'];
  H.names={chest:['寶箱！','跑過有寶箱的跑道']};
  H.events={chest(g,s){const pl=P(s);const at=farthest(g)+65;g.nextAt=Math.max(g.nextAt,at+65);pl.chest={at,lane:Math.floor(s.rng()*3),done:false};pl.chestSpawned=(pl.chestSpawned||0)+1;}};
  const dr=H.draw;
  H.draw=(g,s,c)=>{const pk=P(s).chest;if(!pk)return;const f=clamp(1-(pk.at-g.distance)/240,0,1.1);if(f<=0)return;const x=400+(pk.lane-1)*225*f,y=167+f*f*323,sc=.1+f*.96;c.save();c.translate(x,y);c.scale(sc,sc);c.fillStyle='#E8B04A';c.strokeStyle='#7A4B10';c.lineWidth=5;c.beginPath();c.roundRect?c.roundRect(-40,-56,80,56,10):c.rect(-40,-56,80,56);c.fill();c.stroke();c.fillStyle='#7A4B10';c.fillRect(-6,-36,12,16);c.restore();};
 }
 /* ================================================================= drift-path: turn at the corner so the car passes the lamp that carries the right word */
 {const id='drift-path';
  withPlay(id,{comboStar:6,first:8,ownCombo:true});
  const H=hook(id),LF=60,OFF=[20,0,-20];   /* early / on time / late turn = the lamp 20 px inside / on / 20 px past the corner line */
  const spd=g=>[83,108,132][g.d];
  const tr=(g,p)=>({x:310+((p.x-g.camera.x)-(p.y-g.camera.y))*.7,y:365+((p.x-g.camera.x)+(p.y-g.camera.y))*.37});
  const unit=(a,b)=>{const d=Math.hypot(b.x-a.x,b.y-a.y)||1;return {x:(b.x-a.x)/d,y:(b.y-a.y)/d};};
  const curSeg=g=>{let best=1e9,bi=0;for(let i=0;i<g.nodes.length-1;i++){const n=WQCore.nearest(g.pos,g.nodes[i],g.nodes[i+1]);if(n.d<best-1e-9){best=n.d;bi=i;}}return bi;};
  const legScale=s=>[1,.85,.7][s.phase-1];
  const rebuild=(g,s)=>{
   const pl=P(s);
   if(!pl.orig){pl.orig=[];for(let i=0;i<g.nodes.length-1;i++)pl.orig.push(Math.hypot(g.nodes[i+1].x-g.nodes[i].x,g.nodes[i+1].y-g.nodes[i].y));}
   const f=legScale(s),cur=curSeg(g);
   for(let i=cur+2;i<g.nodes.length-1;i++){
    const a=g.nodes[i],b=g.nodes[i+1],ux=Math.sign(b.x-a.x),uy=Math.sign(b.y-a.y),len=Math.max(90,(pl.orig[i]||120)*f);
    b.x=a.x+ux*len;b.y=a.y+uy*len;
   }
  };
  H.phase=(g,s,p)=>rebuild(g,s);
  H.tick=(g,s,dt)=>{
   const pl=P(s),de=dte(g,pl);
   if(pl.pdir==null)pl.pdir=g.dir;
   if(g.dir!==pl.pdir){   /* a turn: perfect when the car is within 6 px of a corner centre */
    pl.pdir=g.dir;pl.turns=(pl.turns||0)+1;
    let d=1e9;for(let i=2;i<g.nodes.length-1;i++)d=Math.min(d,Math.hypot(g.pos.x-g.nodes[i].x,g.pos.y-g.nodes[i].y));
    if(d<=6){pl.perfect=(pl.perfect||0)+1;pl.streak=(pl.streak||0)+1;A.floatText(s,'完美！',400,200,'#7EE3A1',30);
     if(pl.streak>=3){pl.streak=0;pl.nitro=2;pl.nitroUses=(pl.nitroUses||0)+1;}}
    else pl.streak=0;
   }
   if(pl.nitro>0){pl.nitro=Math.max(0,pl.nitro-de);const ex=.3*spd(g)*de;if(g.dir===0)g.pos.x+=ex;else g.pos.y-=ex;g.travel+=ex;pl.acc=(pl.acc||0)+spd(g)*de;const n=Math.floor(pl.acc);if(n>0){pl.acc-=n;A.addBonus(g,s,n);}}
   if(pl.glow>0)pl.glow=Math.max(0,pl.glow-de);
  };
  const corner=(g,q)=>({n:q.n,node:g.nodes[q.n],ui:unit(g.nodes[q.n-1],g.nodes[q.n]),uo:unit(g.nodes[q.n],g.nodes[q.n+1])});
  const lamps=(g,q)=>{const c=corner(g,q);return OFF.map(e=>({x:c.node.x-c.ui.x*e+c.uo.x*LF,y:c.node.y-c.ui.y*e+c.uo.y*LF}));};
  H.play={verb:'在轉角按「轉彎」，讓小車經過寫着正確英文的燈',
   spawn(g,s,q){
    if(g.done)return false;
    const cur=curSeg(g);
    if(WQCore.nearest(g.pos,g.nodes[cur],g.nodes[cur+1]).d>[39,34,30][g.d])return false;   /* the car is off its road: no question until it is back (nothing to turn at) */
    let L=Math.hypot(g.nodes[cur+1].x-g.pos.x,g.nodes[cur+1].y-g.pos.y);
    let n=cur+1;
    while(n<g.nodes.length-2&&L<2.8*spd(g)+40){L+=Math.hypot(g.nodes[n+1].x-g.nodes[n].x,g.nodes[n+1].y-g.nodes[n].y);n++;}
    if(n>=g.nodes.length-2||n<2||L>9*spd(g))return false;
    q.n=n;q.eta=(L-34)/spd(g);q.lamp=lamps(g,q);
    signsRow(q,400,128);
    return true;
   },
   slow(g,s,q){const c=corner(g,q),v={x:g.pos.x-c.node.x,y:g.pos.y-c.node.y},ai=v.x*c.ui.x+v.y*c.ui.y,ao=v.x*c.uo.x+v.y*c.uo.y;return (ai>-2.5*spd(g)&&ao<LF+34)?.55:1;},
   near(g,s,q){const c=corner(g,q),v={x:g.pos.x-c.node.x,y:g.pos.y-c.node.y};return v.x*c.ui.x+v.y*c.ui.y>-60;},
   hit(g,s,q){
    let bi=-1,bd=14;
    q.lamp.forEach((l,i)=>{const d=Math.hypot(g.pos.x-l.x,g.pos.y-l.y);if(d<bd&&!q.cr[i].gone){bd=d;bi=i;}});
    return bi;
   },
   gone(g,s,q){const c=corner(g,q),v={x:g.pos.x-c.node.x,y:g.pos.y-c.node.y};return v.x*c.uo.x+v.y*c.uo.y>LF+44;},
   draw(g,s,c,q){signsDraw(c,q,q.lamp.map(l=>tr(g,l)),12);},
   reward(g,s,q,cr){P(s).nitro=2;P(s).nitroUses=(P(s).nitroUses||0)+1;return '💨 氮氣 2 秒：速度 ×1.3，分數 ×2';},
   wrong(){return '字燈熄滅了';}
  };
  H.mech=(g,s)=>({perfect:P(s).perfect||0,streak:P(s).streak||0,nitro:+(P(s).nitro||0).toFixed(1),nitroUses:P(s).nitroUses||0,turns:P(s).turns||0,glow:+(P(s).glow||0).toFixed(1)});
  H.forceMech=(g,s)=>{P(s).nitro=2;P(s).nitroUses=(P(s).nitroUses||0)+1;return true;};
  H.diff=(g,s)=>({legShort:+(1-legScale(s)).toFixed(2),legMin:90});
  H.pool=['glowpath'];
  H.names={glowpath:['夜光路！','8 秒內標出最佳轉向點']};
  H.events={glowpath(g,s){P(s).glow=8;}};
  H.draw=(g,s,c)=>{
   const pl=P(s);if(!(pl.glow>0))return;
   const cur=curSeg(g),n=Math.min(g.nodes.length-2,cur+1);if(n<1)return;
   const p=tr(g,g.nodes[n]),T=g.t||0;
   c.save();c.globalAlpha=.6+.3*SIN(T*6);c.strokeStyle='#7EE3A1';c.lineWidth=5;c.beginPath();c.arc(p.x,p.y,14,0,7);c.stroke();c.globalAlpha=.35;c.fillStyle='#7EE3A1';c.beginPath();c.arc(p.x,p.y,24,0,7);c.fill();c.restore();
  };
 }

 /* ================================================================= valley-race: drive the car over the word pad that is right */
 {const id='valley-race';
  withPlay(id,{comboStar:6,first:8});
  const H=hook(id),OFFS=[-34,0,34];
  const base=g=>[165,195,225][g.d],rw=g=>[43,37,32][g.d];
  const carMul=s=>[1,1.05,1.1][s.phase-1];
  const nearest=g=>{let nr={d:1e9,t:0,i:0};const N=g.path.length;for(let i=0;i<N;i++){const n=WQCore.nearest(g.car,g.path[i],g.path[(i+1)%N]);if(n.d<nr.d)nr={d:n.d,t:n.t,i};}return nr;};
  const LEAF=[60,68];
  const inRange=(i,a,b,N)=>{const d=((i-a)%N+N)%N;return d<=((b-a)%N+N)%N;};
  H.tick=(g,s,dt)=>{
   const pl=P(s),de=dte(g,pl);
   if(g.edit){return;}
   const N=g.path.length,a=g.car,nr=nearest(g);pl.near=nr;
   /* the car is a little faster in wave 2 / 3 (x, y are persistent fields) */
   if(carMul(s)>1){const ex=(carMul(s)-1)*a.v*de;a.x=clamp(a.x+Math.cos(a.a)*ex,18,782);a.y=clamp(a.y+Math.sin(a.a)*ex,65,525);}
   /* clean driving gauge: 6 s on the road -> 1.5 s of speed */
   if(nr.d<rw(g)){pl.clean=(pl.clean||0)+de;if(pl.clean>=6){pl.clean=0;pl.boost=1.5;pl.boosts=(pl.boosts||0)+1;A.floatText(s,'⚡ 乾淨駕駛加速',400,200,'#7EE3A1',28);}}
   else pl.clean=0;
   if(pl.boost>0){pl.boost=Math.max(0,pl.boost-de);a.v=Math.max(a.v,300);}
   /* rainbow strip + leaf zone */
   if(pl.pad&&nr.d<rw(g)+10){const inside=inRange(nr.i,pl.pad.i0,(pl.pad.i0+6)%N,N);if(inside){a.v=Math.max(a.v,300);if(!pl.padIn){pl.padHits=(pl.padHits||0)+1;}}pl.padIn=inside;}
   if(s.phase>=3&&nr.i>=LEAF[0]&&nr.i<=LEAF[1]&&N>=LEAF[1]){a.v=Math.min(a.v,.8*base(g));pl.leafSlow=(pl.leafSlow||0)+1;}
  };
  const padPts=(g,q)=>{const N=g.path.length,p=g.path[q.idx%N],q2=g.path[(q.idx+1)%N],t=unit(p,q2),n={x:-t.y,y:t.x};return OFFS.map(o=>({x:p.x+n.x*o,y:p.y+n.y*o}));};
  const unit=(a,b)=>{const d=Math.hypot(b.x-a.x,b.y-a.y)||1;return {x:(b.x-a.x)/d,y:(b.y-a.y)/d};};
  H.play={verb:'把車開過寫着正確英文的字墊',
   spawn(g,s,q){
    if(g.done||g.edit||g.path.length<6)return false;
    const N=g.path.length,nr=P(s).near||nearest(g);
    let L=0,k=0;while(L<2.8*base(g)+60&&k<N-2){L+=Math.hypot(g.path[(nr.i+k+1)%N].x-g.path[(nr.i+k)%N].x,g.path[(nr.i+k+1)%N].y-g.path[(nr.i+k)%N].y);k++;}
    if(L>9*base(g))return false;
    q.idx=(nr.i+k)%N;q.eta=L/base(g);q.pads=padPts(g,q);
    signsCol(q,400,282);
    return true;
   },
   slow(g,s,q){const pd=q.pads[1],d=Math.hypot(g.car.x-pd.x,g.car.y-pd.y);return d<170?.7:1;},
   near(g,s,q){const pd=q.pads[1];return Math.hypot(g.car.x-pd.x,g.car.y-pd.y)<120;},
   hit(g,s,q){
    q.pads=padPts(g,q);
    for(const k of q.cr){if(k.gone)continue;const pd=q.pads[k.i];if(Math.hypot(g.car.x-pd.x,g.car.y-pd.y)<15)return k.i;}
    return -1;
   },
   gone(g,s,q){const N=g.path.length,nr=P(s).near;if(!nr)return false;const d=((nr.i-q.idx)%N+N)%N;return d>=3&&d<N/2;},
   draw(g,s,c,q){signsDraw(c,q,q.pads,15);},
   reward(g,s,q,cr){g.car.v=320;P(s).nitros=(P(s).nitros||0)+1;return '💨 氮氣：衝出去！';},
   wrong(g,s,q,cr){g.car.v=60;return '車打滑了';}
  };
  H.mech=(g,s)=>({clean:+(P(s).clean||0).toFixed(1),boosts:P(s).boosts||0,boost:+(P(s).boost||0).toFixed(1),nitros:P(s).nitros||0,padHits:P(s).padHits||0,leafSlow:P(s).leafSlow||0,pad:!!P(s).pad});
  H.forceMech=(g,s)=>{P(s).clean=5.95;return true;};
  H.diff=(g,s)=>({carSpeed:carMul(s),leaf:s.phase>=3?1:0});
  H.pool=['rainbowpad'];
  H.names={rainbowpad:['彩虹加速帶！','前面的路上有一段加速帶']};
  H.events={rainbowpad(g,s){const N=g.path.length,nr=P(s).near||nearest(g);P(s).pad={i0:(nr.i+Math.max(4,Math.round(N*.08)))%N};P(s).padT=0;}};
  H.draw=(g,s,c)=>{
   const pl=P(s);if(g.edit)return;const N=g.path.length;
   if(pl.pad){c.save();c.lineCap='round';const cols=['#FF8FC7','#FFC94A','#7EE3A1','#7CC8FF'];for(let i=0;i<6;i++){const a=g.path[(pl.pad.i0+i)%N],b=g.path[(pl.pad.i0+i+1)%N];c.strokeStyle=cols[i%4];c.globalAlpha=.75;c.lineWidth=18;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();}c.restore();}
   if(s.phase>=3&&N>=LEAF[1]){c.save();c.fillStyle='#B8741A';for(let i=LEAF[0];i<=LEAF[1];i++){const a=g.path[i];for(let j=0;j<3;j++){c.globalAlpha=.8;c.beginPath();c.ellipse(a.x+(j-1)*14,a.y+((i+j)%2?7:-7),6,3,i+j,0,7);c.fill();}}c.restore();}
  };
 }
 /* ================================================================= forest-pong: return the ball through the lantern that carries the right word */
 {const id='forest-pong';
  withPlay(id,{comboStar:4,first:8});
  const H=hook(id);
  const LY=190;
  const aiBoost=s=>[0,.15,.3][s.phase-1],retMul=s=>[1,1.02,1.04][s.phase-1];
  const predict=g=>{const b=g.ball;if(b.vy<=0)return null;const t=(473-b.y)/b.vy;let x=b.x+b.vx*t;for(let i=0;i<3;i++){if(x<108)x=216-x;if(x>692)x=1384-x;}return clamp(x,108,692);};
  H.tick=(g,s,dt)=>{
   const pl=P(s),de=dte(g,pl),b=g.ball,q=s.q&&s.q.play?s.q:null;
   /* AI: extra chase speed (ax is persistent), and a short "reaction delay" after a right answer */
   if(g.wait<=0&&aiBoost(s)){const lim=[150,235,335][g.d],d=b.x-g.ax;g.ax=clamp(g.ax+Math.sign(d)*Math.min(Math.abs(d),aiBoost(s)*lim*de),145,655);}
   if(pl.aiHold>0){pl.aiHold=Math.max(0,pl.aiHold-de);if(pl.axPrev!=null)g.ax=pl.axPrev;}
   pl.axPrev=g.ax;
   /* the player's return: ball speed per wave, side spin from the paddle speed, bookkeeping of the lantern question */
   if(pl.hits==null)pl.hits=g.hits;
   if(g.hits>pl.hits){
    pl.hits=g.hits;pl.returns=(pl.returns||0)+1;
    const sp=de>0?(g.px-(pl.pxPrev==null?g.px:pl.pxPrev))/de:0;pl.spin=clamp(sp*.2,-90,90);pl.spinT=1;pl.spinTotal=(pl.spinTotal||0)+Math.abs(pl.spin);
    const m=retMul(s);if(m>1){b.vx*=m;b.vy*=m;const v=Math.hypot(b.vx,b.vy);if(v>600){b.vx*=600/v;b.vy*=600/v;}}
    pl.fromPlayer=true;
    if(q&&q.armed===true)q.rets=(q.rets||0)+1;else if(q)q.sawUnarmed=1;
   }
   pl.pxPrev=g.px;
   if(pl.spinT>0){pl.spinT=Math.max(0,pl.spinT-de);b.vx+=pl.spin*de;}
   if(pl.fromPlayer&&b.vy>0){pl.fromPlayer=false;if(q&&q.armed===true&&q.rets>(q.passes||0)&&!q.answered)q.passes=(q.passes||0)+1;}
   if(pl.fire>0)pl.fire=Math.max(0,pl.fire-de);
  };
  H.play={verb:'把球打向寫着正確英文的燈籠',arm:2.5,
   spawn(g,s,q){
    if(g.done)return false;
    const xs=A.xs3(q,400);
    q.cr.forEach((k,i)=>{k.lx=xs[i];k.x=xs[i];k.y=LY-52;k.vis=true;});
    q.rets=0;q.passes=0;return true;
   },
   near(g,s,q){return q.armed===true;},
   hit(g,s,q){
    const pl=P(s),b=g.ball;
    if(!q.armed||!pl.fromPlayer||b.vy>=0)return -1;
    for(const k of q.cr){if(k.gone)continue;if(Math.hypot(b.x-k.lx,b.y-LY)<26){q.answered=true;return k.i;}}
    return -1;
   },
   gone(g,s,q){return (q.passes||0)>=3;},
   draw(g,s,c,q){
    const T=g.t||0;
    for(const k of q.cr){if(k.gone)continue;
     c.save();c.globalAlpha=q.armed===false?.55:1;c.strokeStyle='rgba(255,255,255,.55)';c.lineWidth=2;c.beginPath();c.moveTo(k.lx,LY-26);c.lineTo(k.lx,LY-28);c.stroke();
     c.fillStyle=k.col;c.strokeStyle='#fff';c.lineWidth=3;c.beginPath();c.ellipse(k.lx,LY+SIN(T*3+k.i)*3,20,26,0,0,7);c.fill();c.stroke();
     c.fillStyle='rgba(255,255,255,.75)';c.fillRect(k.lx-9,LY-30,18,5);c.restore();
     A.tile(c,k,k.x,k.y,{alpha:q.armed===false?.8:1});
    }
   },
   reward(g,s,q,cr){const b=g.ball,pl=P(s);if(b.vy<0){b.vy=Math.max(-640,b.vy*1.25);}pl.aiHold=.25;pl.power=(pl.power||0)+1;return '💪 強力回球：對手慢半拍';},
   wrong(){return '燈籠熄滅了';}
  };
  H.mech=(g,s)=>({spin:+(P(s).spin||0).toFixed(1),spinTotal:Math.round(P(s).spinTotal||0),returns:P(s).returns||0,power:P(s).power||0,aiHold:+(P(s).aiHold||0).toFixed(2),fire:+(P(s).fire||0).toFixed(1)});
  H.forceMech=(g,s)=>{const pl=P(s);pl.spin=60;pl.spinT=1;pl.spinTotal=(pl.spinTotal||0)+60;return true;};
  H.diff=(g,s)=>({aiBoost:aiBoost(s),returnSpeed:retMul(s)});
  H.pool=['firefly'];
  H.names={firefly:['螢火引路！','8 秒內標出球的落點']};
  H.events={firefly(g,s){P(s).fire=8;}};
  H.draw=(g,s,c)=>{
   const pl=P(s);if(!(pl.fire>0))return;const x=predict(g);if(x==null)return;const T=g.t||0;
   c.save();c.globalAlpha=.7+.2*SIN(T*8);c.strokeStyle='#FFE08A';c.lineWidth=4;c.beginPath();c.arc(x,473,18,0,7);c.stroke();c.fillStyle='rgba(255,224,138,.35)';c.fill();c.restore();
  };
 }

 /* ================================================================= meadow-cricket: swing only at the ball that carries the right word */
 {const id='meadow-cricket';
  withPlay(id,{comboStar:4,first:5,every:3,unit:4});
  const H=hook(id),RING={x:570,y:170,r:45};
  const spread=s=>[0,.10,.15][s.phase-1];
  const MC=(WQGames.find(m=>m.id===id)||{}).Class;
  const live=g=>{try{return pgGame===g&&!g.preview;}catch(_){return false;}};
  if(MC){const oact=MC.prototype.act;
   MC.prototype.act=function(k){
    try{
     if(k==='action'&&live(this)){
      const s=A.stateOf(this),q=s.q,pl=P(s);
      pl.dir=(this.keys.has('right')?1:0)-(this.keys.has('left')?1:0);
      if(q&&q.play&&!q.pending&&q.armed===true&&pl.cur&&!this.didSwing&&this.wait<=0&&this.ball.mode==='pitch'){
       const err=Math.abs(this.ball.x-210),win=[70,55,42][this.d];
       if(err<win&&!pl.cur.o.ok){this.didSwing=true;this.swing=.3;pl.wrongSwing=pl.cur.i;this.say('這個字不對，讓它過去');return;}   /* swinging at a wrong word: the bat whooshes, no hit, and it is the answer "wrong" */
      }
     }
    }catch(e){console.error('WQArcPlus cricket act',e);}
    return oact.apply(this,arguments);
   };
  }
  H.tick=(g,s,dt)=>{
   const pl=P(s),de=dte(g,pl),q=s.q&&s.q.play?s.q:null;
   if(pl.round==null){pl.round=g.round;pl.hit=g.hit;pl.ball=g.ball;}
   /* a ball ended: a word ball that was not hit does not cost a life */
   if(g.round>pl.round){
    if(pl.curBall&&!pl.curHit){const S=wq34S(g);S.forgive=(S.forgive||0)+1;pl.forgiven=(pl.forgiven||0)+1;}
    if(q&&pl.curBall)q.endedWords=(q.endedWords||0)+1;
    pl.curBall=null;pl.cur=null;pl.curHit=false;pl.round=g.round;
   }
   /* a new ball: pace spread, slow pitch, and the next word of the question */
   if(g.ball!==pl.ball){
    pl.ball=g.ball;pl.ringDone=false;pl.hitDone=false;
    if(spread(s)){g.ball.vx*=1+(s.rng()*2-1)*spread(s);}
    if(pl.slowBalls>0){g.ball.vx*=.8;pl.slowBalls--;}
    if(q&&!q.pending&&q.armed===true&&(q.next||0)<3&&!q.answered){pl.cur=q.cr[q.next];q.next++;pl.curBall=g.ball;pl.curHit=false;}
   }
   /* a hit on the word ball with the right word = the answer; batting direction + the golden ring */
   if(g.hit>pl.hit){
    pl.hit=g.hit;
    if(pl.curBall===g.ball)pl.curHit=true;
    if(!pl.hitDone){pl.hitDone=true;if(pl.dir){g.ball.vy-=pl.dir*60;pl.dirUsed=(pl.dirUsed||0)+1;}}
   }
   if(g.ball.mode==='hit'&&!pl.ringDone&&Math.hypot(g.ball.x-RING.x,g.ball.y-RING.y)<RING.r){pl.ringDone=true;pl.rings=(pl.rings||0)+1;A.addBonus(g,s,2);A.floatText(s,'金圈 +2',RING.x,RING.y-50,'#FFC94A',28);}
  };
  H.play={verb:'只向寫着正確英文的球揮棒，錯的讓它過',arm:2.5,
   spawn(g,s,q){
    if(g.done||g.round>7)return false;
    signsRow(q,400,128);q.next=0;q.endedWords=0;return true;
   },
   near(g,s,q){return q.armed===true;},
   hit(g,s,q){
    const pl=P(s);
    if(pl.wrongSwing!=null){const i=pl.wrongSwing;pl.wrongSwing=null;q.answered=true;return i;}
    if(pl.cur&&pl.cur.o.ok&&pl.curHit&&!pl.cur.gone){q.answered=true;return pl.cur.i;}
    return -1;
   },
   gone(g,s,q){return (q.next||0)>=3&&(q.endedWords||0)>=3;},
   draw(g,s,c,q){
    const pl=P(s);
    for(const k of q.cr){A.tile(c,k,k.x,k.y,{alpha:q.armed===false?.8:(pl.cur===k?1:.9)});}
    if(pl.cur&&g.ball===pl.curBall&&!pl.cur.gone){const b=g.ball;A.tile(c,pl.cur,clamp(b.x,pl.cur.w/2+6,794-pl.cur.w/2),b.y-52);}
   },
   reward(g,s,q,cr){const pl=P(s);pl.fireworks=(pl.fireworks||0)+1;A.addBonus(g,s,4);return '🎆 邊界煙火 +4 分';},
   wrong(){return '錯字球變灰了（不扣命）';}
  };
  H.mech=(g,s)=>({rings:P(s).rings||0,dirUsed:P(s).dirUsed||0,fireworks:P(s).fireworks||0,forgiven:P(s).forgiven||0,slowBalls:P(s).slowBalls||0});
  H.forceMech=(g,s)=>{const pl=P(s);pl.dir=1;pl.hitDone=false;return true;};
  H.diff=(g,s)=>({speedSpread:spread(s)});
  H.pool=['slowpitch'];
  H.names={slowpitch:['慢球來了！','接下來 2 球慢一點']};
  H.events={slowpitch(g,s){P(s).slowBalls=2;}};
  H.draw=(g,s,c)=>{
   if(g.ball.mode!=='hit'&&g.wait>0)return;
   c.save();c.strokeStyle='#FFC94A';c.lineWidth=4;c.globalAlpha=.7;c.setLineDash([8,6]);c.beginPath();c.arc(RING.x,RING.y,RING.r,0,7);c.stroke();c.setLineDash([]);c.restore();
  };
 }

 /* ================================================================= harbor-volley: send the ball over the net into the zone that carries the right word */
 {const id='harbor-volley';
  withPlay(id,{comboStar:4,first:8});
  const H=hook(id);
  const ZONES=[[430,545],[545,665],[665,782]],GY=482;
  const aiFast=s=>[0,.176,.4286][s.phase-1];
  const land=g=>{const b=g.ball,t=(-b.vy+Math.sqrt(b.vy*b.vy+2*530*Math.max(0,GY-b.y)))/530;let x=b.x+b.vx*t;if(x>782)x=1564-x;if(x<18)x=36-x;return x;};
  const zoneOf=x=>x<545?0:x<665?1:2;
  H.tick=(g,s,dt)=>{
   const pl=P(s),de=dte(g,pl),b=g.ball,q=s.q&&s.q.play?s.q:null;
   if(aiFast(s)&&g.servePause<=0)g.ai.react-=de*aiFast(s);
   if(pl.px==null)pl.px=b.x;
   /* the player's ball crosses the net */
   if(b.x>=400&&pl.px<400&&b.vx>0&&g.servePause<=0){
    pl.cross=(pl.cross||0)+1;
    if(g.touches[0]>=3){b.vx=Math.min(700,b.vx*1.2);pl.triple=(pl.triple||0)+1;A.floatText(s,'三傳攻勢！',400,200,'#FFC94A',28);}
    pl.lastLand=land(g);
    if(q&&q.armed===true&&!q.pending)q.land=zoneOf(pl.lastLand);
   }
   pl.px=b.x;
   /* seagull */
   if(pl.gull){const gl=pl.gull;gl.x+=gl.vx*de;gl.y=230+Math.sin(gl.x*.02)*22;if(!gl.hit&&Math.hypot(b.x-gl.x,b.y-gl.y)<34){gl.hit=true;pl.gullHits=(pl.gullHits||0)+1;A.addBonus(g,s,Math.round(40*s.mult));A.floatText(s,'🕊️ 海鷗助攻！',gl.x,gl.y-30,'#7CC8FF',26);}
    if(gl.x>860)pl.gull=null;}
  };
  H.play={verb:'把球打過網，落在寫着正確英文的區域',arm:2.5,
   spawn(g,s,q){
    if(g.done)return false;
    signsRow(q,400,175);q.land=null;return true;
   },
   near(g,s,q){return q.armed===true;},
   hit(g,s,q){if(q.land!=null){const i=q.land;q.land=null;return q.cr[i]&&!q.cr[i].gone?i:-1;}return -1;},
   gone(g,s,q){return false;},
   draw(g,s,c,q){
    const pts=ZONES.map(z=>({x:(z[0]+z[1])/2,y:476}));
    c.save();
    q.cr.forEach((k,i)=>{c.globalAlpha=q.armed===false?.25:.4;c.fillStyle=k.col;c.fillRect(ZONES[i][0]+3,452,ZONES[i][1]-ZONES[i][0]-6,48);});
    c.restore();
    signsDraw(c,q,pts,10);
   },
   reward(g,s,q,cr){g.ai.react+=.3;P(s).assist=(P(s).assist||0)+1;return '🕊️ 海鷗助攻：對手慢半拍';},
   wrong(g,s,q,cr){return '那一區閃紅了';}
  };
  H.mech=(g,s)=>({triple:P(s).triple||0,crossings:P(s).cross||0,gullHits:P(s).gullHits||0,assist:P(s).assist||0,touches:g.touches[0],gull:!!P(s).gull});
  H.forceMech=(g,s)=>{const b=g.ball;g.touches[0]=3;b.x=398;b.vx=200;b.vy=-100;P(s).px=390;return true;};
  H.diff=(g,s)=>({aiReaction:aiFast(s)});
  H.pool=['seagull'];
  H.names={seagull:['海鷗飛來！','球碰到海鷗有獎勵']};
  H.events={seagull(g,s){P(s).gull={x:-40,y:230,vx:170,hit:false};}};
  H.draw=(g,s,c)=>{
   const gl=P(s).gull;if(!gl)return;
   c.save();c.strokeStyle=gl.hit?'#aaa':'#fff';c.lineWidth=5;c.lineCap='round';const f=Math.sin((g.t||0)*14)*8;c.beginPath();c.moveTo(gl.x-22,gl.y+f);c.quadraticCurveTo(gl.x-10,gl.y-12,gl.x,gl.y);c.quadraticCurveTo(gl.x+10,gl.y-12,gl.x+22,gl.y+f);c.stroke();c.restore();
  };
 }
})();
