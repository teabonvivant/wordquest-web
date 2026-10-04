/** Actual loopback HTTP sockets + shipped files. No browser claim and no external service call. */
import {makeServer} from '../server/local_server.mjs';import {once} from 'node:events';import fs from 'node:fs/promises';import assert from 'node:assert/strict';
const server=makeServer();server.listen(0,'127.0.0.1');await once(server,'listening');const base='http://127.0.0.1:'+server.address().port,rows=[];
async function test(name,f){try{await f();rows.push({name,status:'pass'});}catch(e){rows.push({name,status:'fail',error:String(e)});}}
let original;
await test('Legacy /index.html returns current R3.6 app',async()=>{let r=await fetch(base+'/index.html');assert.equal(r.status,200);original=await r.text();assert(original.includes("version:'R3.6.0'"));});
for(const p of ['/','/app','/app/','/app/index.html'])await test('Canonical alias '+p+' is byte-identical to legacy app',async()=>{const r=await fetch(base+p);assert.equal(r.status,200);assert.equal(await r.text(),original);});
for(const p of ['/app/device-check.html','/app/device-check.js','/app/afeng-animation.html','/app/afeng-rig.js','/app/assets/forest/a-feng/front.webp','/app/sw.js'])await test('Actual local resource '+p,async()=>{const r=await fetch(base+p);assert.equal(r.status,200);assert.equal(r.headers.get('x-content-type-options'),'nosniff');assert((await r.arrayBuffer()).byteLength>0);});
await test('HEAD current app has length but no body',async()=>{const r=await fetch(base+'/app/index.html',{method:'HEAD'});assert.equal(r.status,200);assert(Number(r.headers.get('content-length'))>1000000);assert.equal(await r.text(),'');});
await test('POST to static app is refused',async()=>assert.equal((await fetch(base+'/app/index.html',{method:'POST'})).status,405));
await test('Encoded path cannot expose package backup originals',async()=>assert.equal((await fetch(base+'/app/%2e%2e%2foriginals/R3_1/app/index.html')).status,403));
await test('Unconfigured optional voice API fails closed without sending provider request',async()=>{const r=await fetch(base+'/api/speech',{method:'POST',headers:{'Content-Type':'application/json',Origin:base,'X-WordQuest-Speech':'1'},body:'{}'});assert.equal(r.status,503);});
server.close();await fs.writeFile(new URL('../r32_evidence/server_native_http.json',import.meta.url),JSON.stringify({scope:'native Node HTTP loopback + real filesystem; NOT browser persistence',rows},null,2));console.log('Actual HTTP',rows.length,'PASS',rows.filter(r=>r.status==='pass').length);if(rows.some(r=>r.status==='fail')){console.log(rows);process.exitCode=1;}
