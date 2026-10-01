import {makeServer} from './program/WordQuest_R3_2/server/local_server.mjs';
import http from 'node:http';import fs from 'node:fs';import path from 'node:path';
const out=[];
async function burst(n){
 let calls=0,active=0,max=0;let releases=[];
 const fake=async()=>{calls++;active++;max=Math.max(max,active);await new Promise(r=>releases.push(r));active--;return {ok:true,arrayBuffer:async()=>new Uint8Array([1,2,3]).buffer};};
 const server=makeServer({key:'AUDIT-SYNTHETIC-NOT-A-REAL-KEY',region:'eastasia',fetcher:fake});await new Promise(r=>server.listen(0,'127.0.0.1',r));const port=server.address().port;
 const data=JSON.stringify({text:'TEST one word',lang:'en-GB',voice:'en-GB-SoniaNeural',slow:false});const pending=[],reqs=[];
 for(let i=0;i<n;i++)pending.push(new Promise((resolve,reject)=>{const req=http.request({host:'127.0.0.1',port,path:'/api/speech',method:'POST',headers:{Host:'127.0.0.1:'+port,Origin:'http://127.0.0.1:'+port,'X-WordQuest-Speech':'1','Content-Type':'application/json','Content-Length':Buffer.byteLength(data)}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});req.on('error',reject);req.flushHeaders();reqs.push(req);}));
 await new Promise(r=>setTimeout(r,150));for(const req of reqs)req.end(data);await new Promise(r=>setTimeout(r,180));
 const upstreamCalls=calls,maxActive=max;for(const release of releases)release();
 const statuses=await Promise.all(pending);await new Promise(r=>server.close(r));return {requests:n,upstreamCalls,maxActive,statusCounts:Object.fromEntries([...new Set(statuses)].map(x=>[x,statuses.filter(v=>v===x).length]))};
}
for(const n of [4,65]){const r=await burst(n);out.push({name:n===4?'Concurrency limit under simultaneous delayed request bodies':'60 per ten-minute rate cap under simultaneous delayed bodies',status:r.maxActive>2||r.upstreamCalls>60?'fail':'pass',detail:r,scope:'actual localhost sockets; native request handler; mocked paid speech upstream; no real key/network/billing'});console.log(out.at(-1));}
fs.mkdirSync('audit_work/server_evidence',{recursive:true});fs.writeFileSync('audit_work/server_evidence/race_results.json',JSON.stringify(out,null,2));

