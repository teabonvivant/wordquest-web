const {sandbox,create}=require('./engine_harness.cjs');const S=sandbox.WQArcadeSnapshot28;
for(const id of sandbox.WQR2.ids)for(let d=0;d<3;d++)for(const seed of [1,234,999]){
 const g=create(id,d,seed);let err=null,n=0;
 try{for(;n<18000&&!g.done;n++){if(n%37===0){g.key('left',false);g.key('right',false);g.key(n%74===0?'right':'left',true)}if(n%67===0)g.key('up',true);if(n%67===25)g.key('up',false);if(n%90===0)g.key('action',true);if(n%90===2)g.key('action',false);if(n%131===0)g.key('down',true);if(n%131===12)g.key('down',false);if(n%211===0)g.key('x',true);g.tick(1/60);if(n%20===0){S.capture(g);g.draw();}}S.capture(g)}catch(e){err=e.message;}
 console.log(id,d,seed,n,g.health,g.won,err||'ok');if(err){require('fs').writeFileSync('/mnt/data/arcade_work/error_'+id+'.json',JSON.stringify(Object.fromEntries(Object.entries(g).filter(([k])=>!['api','c','r','meta'].includes(k))),null,2));}
}
