/* R3.20 s71 - per-game adapters for WQArcPlus (see s70_arcplus.js). One short entry per arcade game:
 *   thr   smallest score jump (per engine tick) that counts as one good event; smaller drips (distance, time) are ignored
 *   speed the director may scale dt (x1.12 / x1.25) in waves 2 / 3; off for physics shots, puzzles and the rhythm game
 *   pos   where the player is on the 800x560 canvas, when the engine keeps a screen position; crystals are then collected by touching them
 *   prog  progress 0..1 for the HUD bar and the wave director (falls back to play time)
 *   math  the learning moments are sums instead of English words
 *   first / every  seconds of game time before the first learning crystal / default spacing
 * Games without `pos` collect crystals by tapping them on the canvas, the dock chips, or keys 1 2 3. */
Object.assign(WQArcPlus.cfg,{
 /* action */
 'sky-rescue':{para:'clouds',thr:3,speed:true,pos:g=>g.p,r:34,prog:g=>g.rescued/12},
 'forest-dash':{thr:3,speed:true,prog:g=>g.distance/1500},
 'moon-bells':{thr:3,prog:g=>g.maxH/500},
 'drift-path':{thr:3,speed:true},
 'valley-race':{thr:3,prog:g=>g.lap/3},
 'ruins-courier':{thr:3,speed:true,prog:g=>g.distance/1500},
 'cloud-island':{thr:3,prog:g=>g.p.x/g.mapEnd},
 'star-patrol':{thr:3,pos:g=>g.p,r:34,prog:g=>(g.wave-1)/6},
 'lighthouse-well':{dockOnly:true,thr:3,prog:g=>g.floor/60},
 /* sport */
 'bounce-basket':{para:'bokeh',thr:1,prog:g=>g.shots/7},
 'forest-pong':{thr:1,speed:true},
 'meadow-cricket':{thr:1,prog:g=>g.round/10},
 'harbor-volley':{thr:3,pos:g=>g.p,r:36,area:{xs:[100,210,320],y:[405,435]},prog:g=>(g.points[0]+g.points[1])/9},
 /* puzzle */
 'honey-delivery':{para:'petals',dockOnly:true,thr:3,prog:g=>(g.level-1)/8},
 'rolling-block':{dockOnly:true,thr:3,prog:g=>(g.level-1)/10},
 'juice-lines':{dockOnly:true,thr:2,prog:g=>g.caught/g.required},
 'color-workshop':{dockOnly:true,thr:3,prog:g=>(g.level-1)/10},
 'little-engineer':{dockOnly:true,thr:3,math:true},
 /* strategy */
 'number-garden':{para:'digits',dockOnly:true,thr:3,math:true},
 'block-studio':{dockOnly:true,thr:3,math:true,speed:true},
 'honeycomb-puzzle':{dockOnly:true,thr:3},
 'color-orbit':{dockOnly:true,thr:3},
 'garden-paths':{dockOnly:true,thr:3},
 /* creative */
 'star-rhythm':{para:'streaks',dockOnly:true,thr:3,prog:g=>g.index/g.total},
 'forest-band':{dockOnly:true,thr:1},
 'sweet-studio':{dockOnly:true,thr:3,prog:g=>g.served/(6+g.d*2)}
});

/* ---- L2 mechanics: one game-specific event / behaviour on top of the shared layer (the engines stay untouched; only their own arrays are fed) ---- */
Object.assign(WQArcPlus.game,{
 'sky-rescue':{pool:['flock'],names:{flock:['金色鳥群！','一排金鳥，快去救']},
  events:{flock(g,s){const y=130+Math.floor(s.rng()*4)*99,gold=s.gold||(s.gold=new WeakSet());for(let i=0;i<5;i++){const o={x:860+i*78,y,kind:'bird',hit:false};g.items.push(o);gold.add(o);}}},
  draw(g,s,c){if(!s.gold)return;c.save();c.setTransform(c.canvas.width/800,0,0,c.canvas.height/560,0,0);c.strokeStyle='#FFC94A';c.lineWidth=3;
   for(const o of g.items)if(!o.hit&&s.gold.has(o)&&o.x>-40&&o.x<840){c.globalAlpha=.85;c.beginPath();c.arc(o.x,o.y,30,0,7);c.stroke();}c.restore();}},
 'cloud-island':{pool:['coinarc'],names:{coinarc:['光石弧！','前方一排光石']},
  events:{coinarc(g){for(let i=0;i<7;i++)g.coins.push({x:g.p.x+170+i*46,y:Math.max(110,g.p.y-80-Math.sin(i/6*Math.PI)*70),taken:false});}}},
 'star-patrol':{pool:['overdrive'],names:{overdrive:['火力全開！','護盾即時充能，火力 +1']},
  events:{overdrive(g){g.shieldCD=0;g.power=Math.min(3,(g.power||1)+1);}}},
 'bounce-basket':{tick(g,s){if(s.phase>=2&&!g.flying){const a=s.phase===2?50:80;g.hoop.x=590+Math.sin((g.t||0)*.9)*a;g.hoop.y=225+(s.phase===3?Math.sin((g.t||0)*1.3)*25:0);}}}
});
