'use strict';
/* R3.19 T22 (node): the maths engine says WHY an olympiad answer is wrong (number pattern: last term / step; copied number), RECHECK's remedy no longer promises a tool.
   Loads WQMathCore from the built app like math_course_tests/engine_test.cjs. */
const fs=require('fs'),vm=require('vm'),path=require('path');
const app=process.env.WQ33_APP||path.join(__dirname,'..','app','index.html');
const c={console,Date,Math,JSON,Map,Set,BigInt,Object,Number,String,Array,Boolean,Error};c.globalThis=c;vm.createContext(c);
const html=fs.readFileSync(app,'utf8');
for(const b of [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)]){const txt=b[2];if(txt.includes('root.WQMathData=')||txt.includes('window.WQMathData =')||txt.includes('globalThis.WQMathData=')||b[1].includes('curriculum_extension')||b[1].includes('course_data')||txt.includes('WordQuest Maths 0.1.2')||b[1].includes('school_bundle')||b[1].includes('course_pedagogy')||b[1].includes('math_visuals.js')||b[1].includes('course_engine'))vm.runInContext(txt,c);}
let n=0;const fails=[];const ok=(x,m)=>{n++;if(!x){fails.push(m);console.log('  FAIL',m);}};
const C=c.WQMathCore;if(!C){console.log('WQMathCore not loaded');process.exit(1);}
const L=C.library(c.WQMathData);
const mis=L.data.misconceptions;
ok(mis.RECHECK&&!/教具/.test(mis.RECHECK.remedy),'RECHECK remedy no longer promises a tool: '+(mis.RECHECK&&mis.RECHECK.remedy));
for(const k of ['PATTERN_LAST','PATTERN_STEP','GIVEN_NUMBER'])ok(mis[k]&&mis[k].name&&mis[k].remedy,'misconception '+k+' exists');
let pat=0;
for(const id of ['O-CAL-pattern-T1','O-CAL-pattern-T2','O-CAL-pattern-T3'])for(let seed=1;seed<=12;seed++){
  const q=C.generate(L,id,seed),p=q.params;
  const last=C.mark(q,{value:String(p.c)}),step=C.mark(q,{value:String(p.step)}),right=C.mark(q,{value:q.answer});
  ok(right.correct,id+' right answer marked right');
  ok(last.code==='PATTERN_LAST'&&/最後一項/.test(last.message),id+' seed '+seed+': last term '+p.c+' -> '+last.code);
  if(String(p.step)!==String(p.c)&&String(p.step)!==q.answer&&!q.choices.some(ch=>ch.value===String(p.step)))ok(step.code==='PATTERN_STEP',id+' seed '+seed+': step '+p.step+' -> '+step.code);
  pat++;
}
/* the example from the audit: 11, 14, 17 */
{
  const t=[...L.templates.values()].find(x=>x.id==='O-CAL-pattern-T1');let q=null;
  for(let s=1;s<500&&!q;s++){const g=C.generate(L,t.id,s);if(g.params.a===11&&g.params.step===3)q=g;}
  if(q){ok(C.mark(q,{value:'17'}).code==='PATTERN_LAST','11、14、17 -> 17 is PATTERN_LAST');ok(C.mark(q,{value:'3'}).code==='PATTERN_STEP','11、14、17 -> 3 is PATTERN_STEP');ok(C.mark(q,{value:'20'}).correct,'11、14、17 -> 20 right');}
  else console.log('  (no a=11 step=3 seed in 500 - audit example skipped)');
}
/* other olympiad templates: copying a number from the question is named; random wrong numbers still fall back to RECHECK */
let given=0,recheck=0,other=0,total=0;
for(const t of L.templates.values()){
  if(!/^O-/.test(t.skill)||t.type==='choice')continue;
  for(let s=1;s<=6;s++){
    let q;try{q=C.generate(L,t.id,s);}catch(e){continue;}
    const nums=(String(q.stem_zh).match(/\d+(?:\.\d+)?/g)||[]).filter(x=>x!==q.answer&&!q.choices.some(ch=>ch.value===x));
    for(const x of nums.slice(0,2)){total++;const m=C.mark(q,{value:x});if(m.code==='GIVEN_NUMBER'){given++;ok(/題目裏的數/.test(m.message),'GIVEN_NUMBER message');}else if(m.code==='RECHECK')recheck++;else other++;}
  }
}
ok(given>0&&given>=total*.8,'copied question numbers are named GIVEN_NUMBER: '+given+'/'+total+' (RECHECK '+recheck+', other code '+other+')');
/* a random far-off number is still RECHECK, the tool line is only appended for skills that have a tool (checked in the page test) */
const q0=C.generate(L,'O-CAL-pattern-T1',3);ok(C.mark(q0,{value:'9999'}).code==='RECHECK','a random number stays RECHECK');
console.log('test_math_mark: '+(n-fails.length)+'/'+n+' checks passed ('+pat+' pattern questions)');
process.exit(fails.length?1:0);
