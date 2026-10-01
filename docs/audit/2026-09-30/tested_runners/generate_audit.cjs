const fs=require('fs'),path=require('path'),vm=require('vm');
const root=path.resolve('audit_work'),ex=path.join(root,'extracted'),out=path.join(root,'data_evidence');fs.mkdirSync(out,{recursive:true});
const s={console,TextEncoder,TextDecoder,crypto:require('node:crypto').webcrypto,URL};s.window=s;s.globalThis=s;vm.createContext(s);
for(const i of [2,3,4,5,7,8,9,10,11,19,24,25,26,27,28,29,32,34,35,37])vm.runInContext(fs.readFileSync(path.join(ex,'script_'+String(i).padStart(2,'0')+'.js'),'utf8'),s,{timeout:15000});
const M=s.WQMathCore,L=M.library(s.WQMathData);
fs.writeFileSync(path.join(out,'current_maths_curriculum.json'),JSON.stringify(s.WQMathData,null,2));
fs.writeFileSync(path.join(out,'runtime_globals.json'),JSON.stringify(Object.fromEntries(Object.keys(s).filter(k=>k.startsWith('WQ')).map(k=>[k,{type:typeof s[k],keys:Object.keys(s[k]||{}).slice(0,50)}])),null,2));
const gens=[],fail=[],seeds=[0,1,2,3,4,5,11,31,255,1024,32768,65535,1048576,0x7fffffff,0x80000000,0xfffffffe,0xffffffff];
for(const t of L.templates.values()){
 for(const seed of seeds){
  try{const q=M.generate(L,t.id,seed);const again=M.generate(L,t.id,seed);if(JSON.stringify(q)!==JSON.stringify(again))throw Error('nondeterministic');if(q.type==='choice'&&q.choices.filter(c=>M.Q.parse(c.value).cmp(q.answer)===0).length!==1)throw Error('correct choice absent / repeated');
  let val=q.answer;if(q.formats.includes('decimal')&&!q.formats.includes('fraction')&&val.includes('/'))val=String(M.Q.parse(val).number());if(q.formats.length===1&&q.formats[0]==='fraction'&&!val.includes('/'))val+='/1';
  const expr=a=>a[0]==='num'?a[1]:a[0]==='neg'?'(-'+expr(a[1])+')':a[0]==='floor'?'floor('+expr(a[1])+')':'('+expr(a[1])+a[0]+expr(a[2])+')';
  const answer={value:val,unit:q.unit,expression:q.process?expr(q.process):'',remainder:q.remainder};const mark=M.mark(q,answer);
  if(!mark.correct)fail.push({template:t.id,seed,category:'own_answer_rejected',answer,mark});
  const badMark=M.mark(q,{...answer,value:M.Q.parse(q.answer).add(1).toString()});if(badMark.correct)throw Error('wrong answer accepted');
  gens.push(q);}catch(e){fail.push({template:t.id,seed,category:'generation_exception',error:e.message});}
 }
}
const meta={skills:L.skills.size,normal:[...L.skills.values()].filter(x=>x.track==='normal').length,olympiad:[...L.skills.values()].filter(x=>x.track==='olympiad').length,templates:L.templates.size,archiveTemplates:L.archived.size,generated:gens.length,failures:fail,englishLibrary:s.WQ_SHARED_REFERENCE?.length,englishData:Object.keys(s.WQ30Data),characters:s.WQ32Core?.ids||s.WQ32Characters?.ids};
fs.writeFileSync(path.join(out,'generated_current_cases.json'),JSON.stringify(gens));fs.writeFileSync(path.join(out,'maths_generation_results.json'),JSON.stringify(meta,null,2));
console.log(JSON.stringify(meta,null,2));

