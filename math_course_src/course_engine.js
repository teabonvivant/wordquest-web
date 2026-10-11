/* HK-M1 course and assessment engine. No network, no eval. All marks are local learning records, not secure exams. */
(function(root){'use strict';
const B=root.WQMathCore, D=root.WQCourseData;
const assert=B.assert, clone=B.clone, U=new Map(D.units.map(u=>[u.code,u]));
const DAY=86400000, intervals=[1,3,7,21];
const ref=q=>({template:q.templateId,seed:q.seed});
const signature=q=>q.stem_zh+'|'+q.answer+'|'+(q.remainder??'');
function initial(grade=1){return {version:1,grade,serial:0,learning:null,exam:null,history:[],practice:[],lessons:{},reviews:{},journal:{},rewarded:[],exposures:[]};}
function state(s){if(!s.courseM1)s.courseM1=initial();return s.courseM1;}
function unit(code){const u=U.get(code);assert(u,'找不到這個課堂。');return u;}
function question(lib,r){return B.generate(lib,r.template,r.seed);}
function cleanInput(a={}){const o={value:'',expression:'',unit:'',remainder:''};for(const[k,max]of [['value',60],['expression',240],['unit',20],['remainder',60]]){const v=a[k]??'';assert(typeof v==='string'||typeof v==='number','答案格式不正確。');assert(String(v).length<=max,'答案太長，請保留最需要的資料。');o[k]=String(v);}return o;}
function validate(v,lib){
 if(v===undefined)return;
 const obj=x=>assert(x&&typeof x==='object'&&!Array.isArray(x),'課堂資料格式不正確，原資料沒有重設。');
 const arr=(a,n)=>assert(Array.isArray(a)&&a.length<=n,'課堂資料太多或格式不正確。');
 const num=(n,a,b)=>assert(Number.isInteger(n)&&n>=a&&n<=b,'課堂數值不正確。');
 const str=(s,n)=>assert(typeof s==='string'&&s.length<=n,'課堂文字格式不正確。');
 const time=n=>assert(Number.isFinite(n)&&n>=0&&n<=253402214400000,'日期格式不正確。');
 const rf=r=>{obj(r);num(r.seed,0,0xffffffff);const t=lib.templates.get(r.template)||lib.archived.get(r.template);assert(t&&lib.skills.get(t.skill)?.track==='normal','課堂題目資料不正確。');};
 const result=x=>{obj(x);rf(x.ref);cleanInput(x.input);assert(typeof x.correct==='boolean'&&typeof x.pending==='boolean','評分資料不正確。');num(x.hint??0,0,5);assert(Number.isFinite(x.credit)&&x.credit>=0&&x.credit<=1,'評分超出範圍。');str(x.code??'',80);};
 obj(v);assert(v.version===1,'課堂資料版本不相容，原資料沒有重設。');num(v.grade,1,6);num(v.serial,0,1e9);
 arr(v.history,120);arr(v.practice,1000);arr(v.rewarded,300);arr(v.exposures,2000);
 assert(new Set(v.history.map(h=>h.id)).size===v.history.length,'測驗紀錄重複。');
 for(const x of v.exposures)str(x,1200);
 for(const k of v.rewarded)str(k,80);
 for(const h of v.history){obj(h);assert(B.safeId(h.id),'測驗編號不正確。');time(h.at);arr(h.units,20);h.units.forEach(unit);arr(h.results,20);h.results.forEach(result);num(h.stars,0,5);assert(h.percent===null||Number.isFinite(h.percent)&&h.percent>=0&&h.percent<=100,'分數不正確。');str(h.kind,24);num(h.part,0,2);}
 for(const p of v.practice){result(p);time(p.at);assert(typeof p.independent==='boolean','作答方式不正確。');str(p.id,100);}
 for(const name of ['lessons','reviews','journal'])obj(v[name]);
 assert(Object.keys(v.lessons).length<=170&&Object.keys(v.reviews).length<=85&&Object.keys(v.journal).length<=170,'課堂紀錄太多。');
 for(const[k,p]of Object.entries(v.lessons)){assert(/^[1-6][NASMDF]\d+-[12]$/.test(k),'課堂編號不正確。');unit(k.split('-')[0]);obj(p);for(const field of ['seenAt','toolAt','practiceAt','lastTest'])if(p[field]!==undefined)time(p[field]);}
 for(const[k,j]of Object.entries(v.journal)){assert(/^[1-6]F1-[12]$/.test(k),'探索筆記編號不正確。');obj(j);str(j.text,1000);time(j.at);}
 for(const[k,r]of Object.entries(v.reviews)){unit(k);obj(r);time(r.due);num(r.level,0,4);assert(typeof r.cleared==='boolean','重溫狀態不正確。');arr(r.good,4);r.good.forEach(x=>str(x,1200));str(r.lastWrong,1200);time(r.lastWrongAt);}
 if(v.learning){const l=v.learning;obj(l);unit(l.unit);num(l.part,1,2);num(l.step,0,4);time(l.at);arr(l.examples,3);l.examples.forEach(rf);arr(l.refs,6);l.refs.forEach(r=>{rf(r);assert(lib.skills.get((lib.templates.get(r.template)||lib.archived.get(r.template)).skill).unit===l.unit,'練習混入其他單元。');});num(l.index,0,Math.max(0,l.refs.length-1));arr(l.inputs,6);l.inputs.forEach(cleanInput);arr(l.hints,6);l.hints.forEach(x=>num(x,0,5));arr(l.checked,6);l.checked.forEach(x=>assert(typeof x==='boolean','練習狀態不正確。'));arr(l.first,6);l.first.forEach(x=>{if(x)result(x);});assert(l.inputs.length===l.refs.length&&l.hints.length===l.refs.length&&l.checked.length===l.refs.length&&l.first.length===l.refs.length,'練習數量對不上。');}
 if(v.exam){const x=v.exam;obj(x);assert(B.safeId(x.id),'測驗編號不正確。');assert(['draft','submitted'].includes(x.status),'測驗狀態不正確。');num(x.grade,1,6);num(x.part,0,2);str(x.kind,24);time(x.at);arr(x.units,20);assert(x.units.length>0&&new Set(x.units).size===x.units.length,'選擇的單元重複。');x.units.forEach(c=>assert(unit(c).grade===x.grade&&unit(c).category!=='F','測驗年級或單元不正確。'));arr(x.refs,20);assert(x.refs.length>0,'測驗沒有題目。');x.refs.forEach(r=>{rf(r);assert(x.units.includes(lib.skills.get((lib.templates.get(r.template)||lib.archived.get(r.template)).skill).unit),'測驗混入未選擇的單元。');});arr(x.inputs,20);assert(x.inputs.length===x.refs.length,'測驗答案數量對不上。');x.inputs.forEach(cleanInput);num(x.index,0,x.refs.length-1);num(x.requested,1,20);}
}
function nextSeed(c){c.serial++;assert(c.serial<1e9,'出題紀錄已滿，請先匯出備份。');return (Math.imul(c.serial,2654435761)+12345)>>>0;}
function build(s,lib,{codes,part=0,count=5,exclude=[],focus=null}={}){
 const c=state(s);assert(Array.isArray(codes)&&codes.length>0&&codes.length<=20,'請選擇課題。');assert(Number.isInteger(count)&&count>=1&&count<=20,'題數須為1至20。');
 const pools=codes.map(code=>{unit(code);return [...lib.templates.values()].filter(t=>lib.skills.get(t.skill)?.unit===code&&lib.skills.get(t.skill)?.track==='normal'&&(!focus||t.skill===focus)&&(part!==1||t.difficulty<=2));});
 const used=new Set(exclude),out=[];let failures=0,turn=0;
 while(out.length<count&&failures<1600){const pool=pools[turn++%pools.length];if(!pool.length){failures++;continue;}const seed=nextSeed(c);let t=pool[c.serial%pool.length];
  // The second chapter includes a reasoning item when available, not only bigger operands.
  if(part===2&&turn<=pools.length)t=pool.find(x=>x.pedagogy==='reasoning')||t;
  const q=B.generate(lib,t.id,seed),sig=signature(q);if(used.has(sig)){failures++;continue;}used.add(sig);out.push(ref(q));failures=0;
 }
 return out;
}
function startLearning(s,lib,code,part=1,now=Date.now()){
 const c=state(s),u=unit(code);assert(!c.exam||c.exam.status==='submitted','請先完成或取消目前的小測。');assert([1,2].includes(part),'課堂編號不正確。');
 const key=code+'-'+part;c.lessons[key]={...(c.lessons[key]||{}),seenAt:now};c.grade=u.grade;
 const examples=u.category==='F'?[]:build(s,lib,{codes:[code],part,count:2});
 const banned=examples.map(r=>signature(question(lib,r)));const refs=u.category==='F'?[]:build(s,lib,{codes:[code],part,count:3,exclude:banned});
 c.learning={unit:code,part,step:0,at:now,examples,refs,index:0,inputs:refs.map(()=>cleanInput()),hints:refs.map(()=>0),checked:refs.map(()=>false),first:refs.map(()=>null)};
 return c.learning;
}
function verdict(q,input){const a=cleanInput(input),m=B.mark(q,a);const pending=m.code==='PROCESS'&&m.parts?.value&&m.parts?.unit;
 return {ref:ref(q),input:a,correct:!!m.correct,credit:m.credit||0,code:m.code||(m.correct?'CORRECT':'RECHECK'),pending:!!pending,hint:0,message:!a.value.trim()?'這題還未作答。':m.message};
}
function practice(s,lib,input,now=Date.now()){
 const c=state(s),l=c.learning;assert(l&&l.refs.length,'先打開課堂練習。');const i=l.index,q=question(lib,l.refs[i]),v=verdict(q,input);assert(l.checked[i]!==true,'本題已記下，請前往下一題。');
 l.inputs[i]=cleanInput(input);v.hint=l.hints[i];const isFirst=!l.first[i];
 if(isFirst){l.first[i]=clone(v);const rec={...clone(v),id:'c1p'+nextSeed(c),at:now,independent:v.hint===0};c.practice.push(rec);c.practice=c.practice.slice(-1000);
  if(B.mark(q,input).valid&&!v.pending)B.record(s,lib,q,cleanInput(input),{id:rec.id,at:now,hint:v.hint,independent:v.hint===0,mode:v.hint?'guided':'practice'});
 }
 c.exposures=[...new Set([...c.exposures,signature(q)])].slice(-2000);
 // A viewed explanation is assisted on all later submissions; the first answer is immutable.
 l.hints[i]=Math.max(l.hints[i],4);l.checked[i]=true;
 if(l.checked.every(Boolean))c.lessons[l.unit+'-'+l.part]={...(c.lessons[l.unit+'-'+l.part]||{}),practiceAt:now};
 return v;
}
function startExam(s,lib,{codes,grade,part=0,count=10,kind='selected',focus=null}={},now=Date.now()){
 const c=state(s);assert(!c.exam||c.exam.status==='submitted','已有未交卷的測驗，請先繼續或取消。');
 assert([1,2,3,4,5,6].includes(grade),'請選擇年級。');codes=[...new Set(codes)];codes.forEach(x=>assert(unit(x).grade===grade&&unit(x).category!=='F','請選擇同一年級的普通數學課題。'));
 const examples=c.learning?.examples||[];const banned=[...c.exposures,...examples.map(r=>signature(question(lib,r)))];
 let refs=build(s,lib,{codes,part,count,exclude:banned,focus});let rehearsal=false;
 const covered=()=>codes.every(code=>refs.some(r=>lib.skills.get(question(lib,r).skill).unit===code));
 if(!covered()){refs=build(s,lib,{codes,part,count,focus});rehearsal=true;}assert(refs.length&&covered(),'部分課題未能選出題目，請減少主題或增加題數。');
 c.exam={id:'c1e'+nextSeed(c),grade,part,kind,units:codes,requested:count,rehearsal,refs,inputs:refs.map(()=>cleanInput()),index:0,status:'draft',at:now};return c.exam;
}
function draft(s,input){const x=state(s).exam;assert(x?.status==='draft','這份測驗已交卷，不能覆寫原答案。');x.inputs[x.index]=cleanInput(input);}
function reviewResult(c,u,results,now){
 const wrong=results.filter(r=>!r.correct&&!r.pending),good=results.filter(r=>r.correct&&!r.pending);let rv=c.reviews[u];
 if(wrong.length){rv={due:now+DAY,level:0,cleared:false,good:[],lastWrong:wrong[0].signature,lastWrongAt:now};c.reviews[u]=rv;return;}
 if(!rv){c.reviews[u]={due:now+DAY,level:0,cleared:false,good:[],lastWrong:'',lastWrongAt:0};return;}
 // A same-day correction does not prove retention or clear a review reminder.
 if(now<rv.due)return;
 for(const r of good){if(r.signature!==rv.lastWrong&&!rv.good.includes(r.signature))rv.good.push(r.signature);}
 rv.good=rv.good.slice(-4);if(rv.good.length>=2){rv.level=Math.min(4,rv.level+1);rv.cleared=rv.level>=4;rv.good=[];rv.due=now+DAY*intervals[Math.min(rv.level,3)];}
}
function submitExam(s,lib,now=Date.now()){
 const c=state(s),x=c.exam;assert(x,'沒有可交的測驗。');if(x.status==='submitted')return c.history.find(h=>h.id===x.id);
 const results=x.refs.map((r,i)=>{const q=question(lib,r);return {...verdict(q,x.inputs[i]),signature:signature(q)};});
 const correct=results.filter(r=>r.correct).length,pending=results.filter(r=>r.pending).length,n=results.length,percent=pending?null:Math.round(correct/n*100);
 // Fewer than five items are a short check: no mastery badge, stars or coins.
 const stars=pending||n<5||x.rehearsal?0:percent===100?5:percent>=90?4:percent>=75?3:percent>=50?2:percent>0?1:0;
 const h={id:x.id,units:clone(x.units),grade:x.grade,part:x.part,kind:x.kind,at:now,startedAt:x.at,results,correct,total:n,percent,pending,stars,rehearsal:!!x.rehearsal,rewardEligible:false};
 for(let i=0;i<results.length;i++){const r=results[i],q=question(lib,r.ref);if(!r.pending&&B.mark(q,r.input).valid)B.record(s,lib,q,r.input,{id:x.id+'.'+i,at:now,hint:0,independent:true,mode:'practice'});}
 for(const code of x.units){const sub=results.filter(r=>lib.skills.get(question(lib,r.ref).skill).unit===code);if(sub.length)reviewResult(c,code,sub,now);if(x.part)c.lessons[code+'-'+x.part]={...(c.lessons[code+'-'+x.part]||{}),lastTest:now};}
 c.exposures=[...new Set([...c.exposures,...results.map(r=>r.signature)])].slice(-2000);
 const rewardKey=x.units.length===1?x.units[0]+'.'+x.part:null;
 if(stars===5&&rewardKey&&!c.rewarded.includes(rewardKey)){c.rewarded.push(rewardKey);h.rewardEligible=true;B.enqueueReward(s,{key:'courseM1.'+rewardKey,startedAt:x.at,completedAt:now,valid:true});}
 c.history.push(h);c.history=c.history.slice(-120);x.status='submitted';return h;
}
function status(s,code){const c=state(s),h=c.history.filter(x=>x.units.includes(code)).at(-1),p=Object.keys(c.lessons).some(k=>k.startsWith(code+'-'));
 if(!h)return p?'正在學':'還未開始';const rs=h.results.filter(r=>r.ref&&r.signature&&h.units.length===1);
 if(h.pending)return '有解法待核對';if(h.rehearsal)return '已完成重溫';if(h.units.length>1)return '已做綜合小測';if(rs.length<5)return '已做短練習';if(h.percent<80)return '再練一練';return '本次小測達標';
}
function submitted(s){const c=state(s);return c.history.find(h=>h.id===c.exam?.id)||c.history.at(-1)||null;}
root.WQCourseEngine=Object.freeze({initial,state,unit,question,cleanInput,ref,signature,validate,build,startLearning,practice,startExam,draft,submitExam,status,submitted,verdict,version:'HK-M1.0'});
// The same validation path is used by the existing family backup and profile storage.
root.WQMathCore=Object.freeze({...B,validateState(v,lib){const clean=B.validateState(v,lib);validate(clean.courseM1,lib);return clean;}});
})(globalThis);
