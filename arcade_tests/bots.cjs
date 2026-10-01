const {sandbox,create}=require('./engine_harness.cjs');const S=sandbox.WQArcadeSnapshot28;
function direction(g,dir){g.keys.delete('left');g.keys.delete('right');if(dir)g.keys.add(dir<0?'left':'right');}
function runner(g,n){const o=g.obstacles.find(o=>!o.checked);if(!o)return;const delta=o.at-g.distance,speed=[35,40,46][g.d]+(g.level-1)*3;
 let lane=o.kinds.indexOf('gem');if(lane<0)lane=o.kinds.findIndex(k=>k!=='wall');if(lane<0)lane=1;
 if(delta>25&&g.lane!==lane)g.act(g.lane<lane?'right':'left');
 const k=o.kinds[g.lane];if(delta<speed*.30&&delta>speed*.05){if(['log','pit'].includes(k))g.act('up');if(k==='arch')g.act('down');}}
const cloudPlan=new WeakMap();
function cloud(g,n){const f=g.platforms.find(f=>g.p.x>=f.x-16&&g.p.x<=f.x+f.w+8&&Math.abs(g.p.y+22-f.y)<12);let plan=cloudPlan.get(g);
 if(g.inv>2.1)plan=null;
 if(g.grounded&&f){plan=null;const e=g.enemies.find(e=>!e.stunned&&e.x-g.p.x>0&&e.x-g.p.x<90);
  if(f.x+f.w-g.p.x<48){const next=g.platforms[f.id+1];if(next){plan={target:next.x+Math.min(95,next.w/2)};g.key('up',true);}}
  else if(e){plan={target:f.x+f.w-42};g.key('up',true);}
 }
 if(plan){const delta=plan.target-g.p.x,brake=Math.abs(g.p.vx)*.055+5;direction(g,Math.abs(delta)<brake?0:Math.sign(delta));}else direction(g,1);
 if(g.p.vy>0&&g.jumpHeld)g.key('up',false);cloudPlan.set(g,plan);
}
function stairs(g,n){const below=g.platforms.filter(f=>f.y>g.p.y+22&&f.y-g.camera<550&&f.kind!=='hazard'&&f.life!==0).sort((a,b)=>a.y-b.y);let target=below[0];if(!target)return;direction(g,Math.abs(target.x-g.p.x)<7?0:Math.sign(target.x-g.p.x));const hazard=g.platforms.find(f=>f.kind==='hazard'&&f.y>g.p.y+18&&f.y<g.p.y+48);if(hazard&&g.dropTime===0)g.act('down');if(g.onPlatform>=0&&g.p.y-g.camera<345&&Math.abs(target.x-g.p.x)<target.w/2-18)g.act('down');if(g.p.y-g.camera>490&&g.chuteCD===0)g.act('action');}
module.exports={runner,cloud,stairs,direction};
if(require.main===module){for(const id of ['ruins-courier','cloud-island','lighthouse-well'])for(let d=0;d<3;d++)for(const seed of [12,456]){const g=create(id,d,seed);let err=null,n=0;try{for(;n<36000&&!g.done;n++){({ 'ruins-courier':runner,'cloud-island':cloud,'lighthouse-well':stairs})[id](g,n);g.tick(1/60);if(n%45===0)S.capture(g);}S.capture(g)}catch(e){err=e.message}console.log(id,d,seed,Number(g.t.toFixed(2)),g.won,g.health,g.distance||g.p.x,g.floor||g.level,err||'ok')}}
