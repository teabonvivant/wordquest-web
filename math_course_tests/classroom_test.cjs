'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path'),cp=require('node:child_process');
const R=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(R,f),'utf8');
const c={};c.globalThis=c;vm.createContext(c);vm.runInContext(read('math_course_src/classroom_bundle.js'),c);vm.runInContext(read('math_course_src/classroom_ui.js'),c);
const lessons=c.WQClassroomData.lessons,K=c.WQClassroom;assert.equal(Object.keys(lessons).length,170);
let diagrams=0;for(const [key,p] of Object.entries(lessons)){
 assert(p.goal&&p.teacher.lookFor&&p.teacher.ifStuck&&p.explain.model&&p.toolTask.length>=2,key);
 assert(p.readiness.choices.some(x=>x.id===p.readiness.answer),key);
 const scan=v=>{if(!v||typeof v!=='object')return;if(v.svg){diagrams++;assert(v.alt&&!/<script|foreignObject|\son\w+=|javascript:|<image|<iframe/i.test(v.svg),key+' safe SVG');}Object.values(v).forEach(scan);};scan(p);
 for(const html of [K.intro(key),K.workshop(key,false),K.explain(key),K.teacher(key)])assert(!/undefined|NaN/.test(html),key);
 assert.equal(K.state(key).stage,'warmup');assert(p.diagram.svg.includes('<svg'),key+' teaching diagram');
}
const old=cp.execFileSync('git',['show','HEAD:app/index.html'],{cwd:R,encoding:'utf8',maxBuffer:20*1024*1024});
const originals=s=>[...s.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)].filter(x=>!x[1].includes('data-course-m1=')).map(x=>x[2].replace(/\r\n/g,'\n'));assert.deepEqual(originals(read('app/index.html')),originals(old),'English and other original scripts untouched');
const map=JSON.parse(read('math_course_src/curriculum-map.json')).units,units=Object.fromEntries(map.map(u=>[u.code,u]));
assert.deepEqual(units['1M4'].lessons[0].config,{minutes:120,target:180,step:60});
assert.deepEqual(units['3N5'].lessons[1].config,{den:4,selected:0,targetDen:4,targetNum:3});
assert.deepEqual(units['5A2'].lessons[1].config,{a:1,b:3,c:11});
console.log(JSON.stringify({chapters:170,diagrams,allRenderingChecks:true,originalScriptsUnchanged:true,alignedMissions:3}));
