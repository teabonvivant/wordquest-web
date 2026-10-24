'use strict';
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path'),cp=require('node:child_process'),os=require('node:os');
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
/* R3.30: the old check compared the scripts with `git show HEAD:app/index.html` and needed one line of s20_ui.js (the 闖關 tile) that no longer exists; with any uncommitted change it
   failed for reasons that had nothing to do with the classroom. The same two guarantees are now checked against the current structure:
   (1) every course plugin script embedded in app/index.html is exactly the current source bundle, once;
   (2) the course integration (tools/build_math_m1.py) leaves every other script alone: the app's non-plugin scripts equal a fresh pre-integration build (`build_r37.py --out`). */
const app=read('app/index.html');
const blocks=s=>[...s.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)];
const isPlugin=x=>x[1].includes('data-course-m1=')||x[1].includes('data-olympiad-sync');
const PLUGINS=['course_data.js','school_bundle.js','course_pedagogy.js','course_engine.js','tools_bundle.js','style_bundle.js','course_visuals.js','classroom_bundle.js','classroom_ui.js','course_ui.js'];
for(const name of PLUGINS){
 const hit=blocks(app).filter(x=>x[1].includes('data-course-m1="'+name+'"'));
 assert.equal(hit.length,1,name+' is embedded exactly once');
 assert.equal(hit[0][2].trim(),read('math_course_src/'+name).replace(/<\/script/g,'<\\/script').trim(),name+' in the app equals math_course_src/'+name+' (rebuild with tools/build_r37.py)');
}
assert.equal(blocks(app).filter(x=>x[1].includes('data-course-m1=')).length,PLUGINS.length,'no other course script');
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'wq-classroom-base-'));
cp.execFileSync('python3',['tools/build_r37.py','--out',tmp],{cwd:R,stdio:'pipe',maxBuffer:50*1024*1024});
const originals=s=>blocks(s).filter(x=>!isPlugin(x)).map(x=>x[2].replace(/\r\n/g,'\n'));
const currentScripts=originals(app),baseScripts=originals(fs.readFileSync(path.join(tmp,'app/index.html'),'utf8'));
assert.equal(currentScripts.length,baseScripts.length,'same number of original scripts');
currentScripts.forEach((s,i)=>assert.ok(s===baseScripts[i],'Unrelated original script changed by the course integration: '+i+' (or app/index.html is older than r37_src: run tools/build_r37.py)'));
fs.rmSync(tmp,{recursive:true,force:true});
const map=JSON.parse(read('math_course_src/curriculum-map.json')).units,units=Object.fromEntries(map.map(u=>[u.code,u]));
assert.deepEqual(units['1M4'].lessons[0].config,{minutes:120,target:180,step:60});
assert.deepEqual(units['3N5'].lessons[1].config,{den:4,selected:0,targetDen:4,targetNum:3});
assert.deepEqual(units['5A2'].lessons[1].config,{a:1,b:3,c:11});
console.log(JSON.stringify({chapters:170,diagrams,allRenderingChecks:true,originalScriptsUnchanged:true,alignedMissions:3}));
