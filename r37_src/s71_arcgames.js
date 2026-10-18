/* R3.20 s71 - per-game adapters for WQArcPlus (see s70_arcplus.js). One short entry per arcade game:
 *   thr   smallest score jump (per engine tick) that counts as one good event; smaller drips (distance, time) are ignored
 *   speed the director may scale dt (x1.12 / x1.25) in waves 2 / 3; off for physics shots, puzzles and the rhythm game
 *   pos   where the player is on the 800x560 canvas, when the engine keeps a screen position; crystals are then collected by touching them
 *   prog  progress 0..1 for the HUD bar and the wave director (falls back to play time)
 *   math  the learning moments are sums instead of English words
 *   first / every  seconds of game time before the first learning crystal / default spacing
 * Games without `pos` collect crystals by tapping them on the canvas, the dock chips, or keys 1 2 3.
 * R3.20 stage 2: the 13 action / sport games are `play` games (s72): their words are targets in the game world, no chips, no taps, no keys 1-3. */
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

/* ---- L2 mechanics, play-action answers, events and per-wave difficulty of the 13 action / sport games: see s72_arcplay.js ---- */
