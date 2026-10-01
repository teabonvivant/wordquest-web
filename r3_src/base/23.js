
/* Engine snapshots preserve RNG and clear input. No image/audio nodes are serialised. */
(function(){
'use strict';
const skip=new Set(['api','c','r','meta','keys','preview']);
const special=new Set(['sky-rescue','forest-dash','sweet-studio','ruins-courier','cloud-island','star-patrol','lighthouse-well','harbor-volley']);
function verify(s,run){
 if(!s||typeof s!=='object'||!WQArcade28.ids.includes(s.id))throw Error('街機局面識別碼無效');
 if(!special.has(s.id))return WQRewards.verifySnapshot(s);
 if(s.v!==28||!Number.isInteger(s.d)||s.d<0||s.d>2||!Number.isInteger(s.r)||s.r<0||s.r>0xffffffff)throw Error('街機局面版本或難度無效');
 if(Object.keys(s).sort().join(',')!=='d,id,r,state,v'||JSON.stringify(s).length>900000)throw Error('街機局面欄位或大小不符');
 const state=WQRewards.decode(s.state);if(!state||typeof state!=='object')throw Error('局面資料無效');
 for(const k of Object.keys(state))if(skip.has(k)||['tick','update','draw','tool','act','pointer','key','tools','hint','say','sound','end','next','onResume'].includes(k))throw Error('局面不能覆蓋程式');
 WQGameSchema.validate(s.id,state,s.d);
 if(run&&!['finished','refunded','error'].includes(run.phase)){
  if(state.health!==run.lives)throw Error('生命紀錄與實際局面不一致');
  if(['ready','playing','paused'].includes(run.phase)&&state.done)throw Error('已結算的局面不能當作仍在遊玩');
 }
 return s;
}
function capture(g){
 if(!special.has(g.meta.id))return WQRewards.snapshot(g);
 const state={};for(const[k,v]of Object.entries(g))if(!skip.has(k))state[k]=v;
 const s={v:28,id:g.meta.id,d:g.d,r:g.r.state(),state:WQRewards.encode(state)};verify(s);return s;
}
function restore(g,s){verify(s);if(s.id!==g.meta.id||s.d!==g.d)throw Error('局面與所選遊戲不同');
 if(!special.has(s.id))return WQRewards.restore(g,s,WQCore.rng);
 const state=WQRewards.decode(s.state);for(const[k,v]of Object.entries(state)){if(typeof g[k]==='function')throw Error('局面方法覆蓋');g[k]=v;}g.r=WQCore.rng(s.r);g.keys.clear();return g;
}
globalThis.WQArcadeSnapshot28=Object.freeze({verify,capture,restore});
})();

