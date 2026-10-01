const fs=require('fs'),path=require('path'),vm=require('vm');
const ROOT=path.resolve(__dirname,'..');
const html=fs.readFileSync(path.join(ROOT,'app/index.html'),'utf8');
const tags=[...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(x=>x[1]);
const noop=()=>{};const gradient={addColorStop:noop};
const ctx=new Proxy({canvas:{width:800,height:560},measureText:x=>({width:String(x).length*12}),createLinearGradient:()=>gradient,createRadialGradient:()=>gradient},{get:(o,k)=>k in o?o[k]:noop,set:(o,k,v)=>(o[k]=v,true)});
const sandbox={console,performance:{now:()=>0},Date,Math,JSON,Set,Map,TextEncoder,TextDecoder,Uint8Array,ArrayBuffer,structuredClone,Buffer,atob:s=>Buffer.from(s,'base64').toString('binary'),btoa:s=>Buffer.from(s,'binary').toString('base64'),setTimeout,clearTimeout};sandbox.window=sandbox;sandbox.globalThis=sandbox;
vm.createContext(sandbox);
// Original contracts, wallet and all old engines, followed by R2 engines and snapshot adapter.
for(const i of [6,9,11,12,13,14,15,16,17,18,19,20,21,22,23])vm.runInContext(tags[i],sandbox,{filename:'app-script-'+i+'.js'});
vm.runInContext('globalThis.registry=WQGames;globalThis.core=WQCore',sandbox);
function create(id,difficulty=1,seed=123){const m=sandbox.registry.find(x=>x.id===id);if(!m)throw Error(id);let result=null;const api={meta:m,ctx,seed,difficulty,preview:false,tools:noop,hint:noop,announce:noop,tone:noop,music:noop,clock:()=>0,instrument:noop,complete:r=>{result=r},getData:()=>null,putData:noop,downloadJSON:noop,importJSON:noop};return new m.Class(api);}
module.exports={ROOT,sandbox,create,ctx,vm};
if(require.main===module){for(const id of sandbox.WQR2.ids){try{const g=create(id);const s=sandbox.WQArcadeSnapshot28.capture(g);g.draw();console.log(id,'PASS')}catch(e){console.error(id,e.stack)}}}
