'use strict';
// R3.31: how many DIFFERENT stems does each (track, world, stage, difficulty) cell offer?  usage: node variety_pool.cjs <math|olympiad|all> [world 1-6|all] [target=60]
const path=require('path');
const M=require(path.join(__dirname,'..','r37_src','levels_math.js'));
const tr=process.argv[2]||'all',wf=process.argv[3]||'all',target=+(process.argv[4]||60);
let weak=0,cells=0,min=1e9;
for(const t of ['math','olympiad']){if(tr!=='all'&&tr!==t)continue;
 for(let w=0;w<6;w++){if(wf!=='all'&&+wf!==w+1)continue;
  const bad=[];
  for(let s=0;s<10;s++)for(let d=1;d<=5;d++){
   const pool=new Set();
   for(let k=0;k<120;k++)M.make(t,w,s,8,d,70000+k*53).forEach(q=>pool.add(q.q));
   cells++;min=Math.min(min,pool.size);if(pool.size<target){weak++;bad.push(`s${s}d${d}=${pool.size}`)}
  }
  console.log(`${t} W${w+1}: ${bad.length?'weak '+bad.join(' '):'all cells >= '+target}`);
 }}
console.log(`cells ${cells}, below ${target}: ${weak}, min pool ${min}`);
process.exit(weak?1:0);
