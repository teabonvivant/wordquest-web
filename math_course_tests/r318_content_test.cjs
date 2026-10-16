'use strict';
// R3.18 teaching-content checks for the HK-M4 classroom packs (170 lessons) and the templates they practise.
const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),path=require('node:path');
const R=path.resolve(__dirname,'..'),read=f=>fs.readFileSync(path.join(R,f),'utf8');
const cases=[];
function test(name,fn){try{fn();cases.push({name,passed:true});console.log('PASS',name)}catch(e){cases.push({name,passed:false,error:e.stack});console.error('FAIL',name,e.message);process.exitCode=1;}}
const bundle={};bundle.globalThis=bundle;vm.createContext(bundle);vm.runInContext(read('math_course_src/classroom_bundle.js'),bundle);
const lessons=bundle.WQClassroomData.lessons,keys=Object.keys(lessons);
const TRUNC=/[；，、：（]$/;
// ---- exact rational helpers (BigInt) for answer verification
const gcd=(a,b)=>b?gcd(b,a%b):a<0n?-a:a;
class Q{constructor(n,d=1n){if(d<0n){n=-n;d=-d}const g=gcd(n,d)||1n;this.n=n/g;this.d=d/g}
 add(o){return new Q(this.n*o.d+o.n*this.d,this.d*o.d)}sub(o){return new Q(this.n*o.d-o.n*this.d,this.d*o.d)}
 mul(o){return new Q(this.n*o.n,this.d*o.d)}div(o){if(o.n===0n)throw new Error('div0');return new Q(this.n*o.d,this.d*o.n)}
 eq(o){return this.n===o.n&&this.d===o.d}toString(){return this.d===1n?String(this.n):this.n+'/'+this.d}}
const num=s=>{const m=/^(\d+)(?:\.(\d+))?$/.exec(s);if(!m)throw new Error('bad number '+s);const f=m[2]||'';return new Q(BigInt(m[1]+f),10n**BigInt(f.length))};
function evalExpr(src){ // + - * / ( ) max min round floor gcd, decimal literals; exact arithmetic
 const toks=src.replace(/\s+/g,'').match(/\d+(?:\.\d+)?|[A-Za-z]+|[-+*/(),]/g);assert.equal(toks.join(''),src.replace(/\s+/g,''),'unparsed '+src);
 let i=0;const peek=()=>toks[i],next=()=>toks[i++];
 const fn={max:(a,b)=>a.sub(b).n>=0n?a:b,min:(a,b)=>a.sub(b).n<=0n?a:b,round:a=>{const f=a.n/a.d,r=a.n%a.d,two=2n*(r<0n?-r:r)>=a.d;return new Q(two?(a.n>=0n?f+1n:f-1n):f)},floor:a=>{let f=a.n/a.d;if(a.n<0n&&a.n%a.d!==0n)f-=1n;return new Q(f)}};
 function prim(){const t=next();if(t==='('){const v=add();assert.equal(next(),')');return v}
  if(t==='-')return new Q(0n).sub(prim());
  if(/^\d/.test(t))return num(t);
  if(fn[t]){assert.equal(next(),'(');const args=[add()];while(peek()===','){next();args.push(add())}assert.equal(next(),')');return fn[t](...args)}
  throw new Error('token '+t)}
 function mul(){let v=prim();while(peek()==='*'||peek()==='/'){const o=next(),r=prim();v=o==='*'?v.mul(r):v.div(r)}return v}
 function add(){let v=mul();while(peek()==='+'||peek()==='-'){const o=next(),r=mul();v=o==='+'?v.add(r):v.sub(r)}return v}
 const v=add();assert.equal(i,toks.length,'trailing tokens '+src);return v}
// number out of an answer text: 1,234 / 3.5 / 3/4 / 1又1/2 / 25% / 0.5米
function textValue(t){const s=t.replace(/,/g,'').replace(/^[^\d]+/,'');
 let m=/^(\d+)又(\d+)\/(\d+)/.exec(s);if(m)return num(m[1]).add(num(m[2]).div(num(m[3])));
 m=/^(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)/.exec(s);if(m)return num(m[1]).div(num(m[2]));
 m=/^\d+(?:\.\d+)?/.exec(s);return m?num(m[0]):null}
const fullwidth=s=>s.replace(/＋/g,'+').replace(/－/g,'-').replace(/[×]/g,'*').replace(/÷/g,'/').replace(/＝/g,'=').replace(/（/g,'(').replace(/）/g,')').replace(/？/g,'?');
function textValues(t){const s=t.replace(/,/g,''),out=[];const re=/(\d+)又(\d+)\/(\d+)|(\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)|\d+(?:\.\d+)?/g;let m;
 while((m=re.exec(s))){out.push(m[1]?num(m[1]).add(num(m[2]).div(num(m[3]))):m[4]?num(m[4]).div(num(m[5])):num(m[0]))}return out}
function correctText(p){return p.readiness.choices.find(c=>c.id===p.readiness.answer).text}

test('Every classroom model ends with a full sentence, never a clause fragment (T07)',()=>{
 for(const k of keys){const p=lessons[k];assert(!TRUNC.test(p.explain.model),k+' model ends '+p.explain.model.slice(-8));
  assert(p.modelSteps.length>=2,k+' needs at least two teaching steps');
  assert.equal(p.modelSteps.join(''),p.explain.model,k+' model must equal the joined steps');
  assert(p.modelSteps.every(s=>s.trim().length>=6),k);
  assert(!/圖、算式和單位要說同一件事|檢查時，把所得數量放回原來的關係/.test(p.explain.model),k+' generic filler');
  assert(/[。！？]$/.test(p.explain.model),k+' model must end with 。')}});
test('Same-chapter lessons 1 and 2 have different readiness, explain prompt, model, misconception and look-for (T08)',()=>{
 let pairs=0;for(const k of keys.filter(x=>x.endsWith('-1'))){const a=lessons[k],b=lessons[k.slice(0,-1)+'2'];assert(b,k);pairs++;
  for(const [n,x,y] of [['readiness.prompt',a.readiness.prompt,b.readiness.prompt],['explain.model',a.explain.model,b.explain.model],['explain.prompt',a.explain.prompt,b.explain.prompt],['misconception.wrongIdea',a.misconception.wrongIdea,b.misconception.wrongIdea],['misconception.repair',a.misconception.repair,b.misconception.repair],['teacher.lookFor',a.teacher.lookFor,b.teacher.lookFor]])assert.notEqual(x,y,k+' '+n+' repeated in lesson 2');
  assert.notEqual(a.readiness.answer+a.readiness.choices.map(c=>c.text).join('|'),b.readiness.answer+b.readiness.choices.map(c=>c.text).join('|'),k)}
 assert.equal(pairs,85)});
test('Lesson 2 of the 44 P4-P6 chapters has its own teaching diagram that matches its model (T08)',()=>{
 for(const k of keys.filter(x=>/^[456]/.test(x)&&x.endsWith('-2'))){const a=lessons[k.slice(0,-1)+'1'],b=lessons[k];assert.notEqual(a.diagram.svg,b.diagram.svg,k+' reuses lesson 1 diagram');assert(b.diagram.alt.length>8&&b.diagram.svg.includes('<svg'),k)}});
test('Readiness has 3-4 distinct options, answer id exists and is unique (T09)',()=>{
 for(const k of keys){const r=lessons[k].readiness,ids=r.choices.map(c=>c.id),texts=r.choices.map(c=>c.text);
  assert(r.choices.length>=3&&r.choices.length<=4,k+' options '+r.choices.length);assert.equal(new Set(ids).size,ids.length,k);assert.equal(new Set(texts).size,texts.length,k+' duplicate option');
  assert.equal(ids.filter(i=>i===r.answer).length,1,k+' answer id');assert(r.explanation&&r.retry,k);
  assert(texts.every(t=>t&&t.length<=24),k+' option length')}
 const dist=[0,0,0,0];for(const k of keys){dist[ids(lessons[k])]++}function ids(p){return p.readiness.choices.findIndex(c=>c.id===p.readiness.answer)}
 assert(dist.filter(x=>x>0).length>=3,'correct option position should vary: '+dist)});
test('P4-P6 readiness asks a prerequisite of its own, not a recycled primary-school fact (T09)',()=>{
 const upper=keys.filter(k=>/^[456]/.test(k));assert.equal(upper.length,88);
 const prompts=upper.map(k=>lessons[k].readiness.prompt);
 for(const k of upper)assert(!/^(3組，每組4粒|每盒3張，2盒|6粒，每2粒|3盒每盒4枝)/.test(lessons[k].readiness.prompt),k);
 // the -2 lessons never share a prompt with any other lesson
 const seen=new Map();for(const k of upper.filter(x=>x.endsWith('-2'))){const p=lessons[k].readiness.prompt;assert(!seen.has(p),k+' same readiness as '+seen.get(p));seen.set(p,k)}});
test('P4-P6 explain prompts are specific: no two of the 88 lessons share one (T23)',()=>{
 const m=new Map();for(const k of keys.filter(x=>/^[456]/.test(x))){const q=lessons[k].explain.prompt;assert(!m.has(q),k+' repeats '+m.get(q));m.set(q,k);
  assert(!/^跟着圖，說出每個數代表甚麼|^先遮住算式，只看圖說出做法/.test(q),k+' generic prompt');assert(/[？?]$/.test(q),k+' prompt should be one question');assert(q.length<=60,k+' prompt too long')}
 assert.equal(m.size,88)});
test('Readiness numeric answers are recomputed independently (T09)',()=>{
 let calc=0,auto=0,concept=0;const errors=[];
 for(const k of keys){try{const p=lessons[k],r=p.readiness,ct=correctText(p),cv=textValue(ct);
  if(r.calc){const v=evalExpr(r.calc);assert(cv,k+' correct text has no number: '+ct);assert(v.eq(cv),`${k} calc ${r.calc}=${v} but answer "${ct}"`);
   // the expression must be tied to the prompt: every literal is stated in the prompt, except unit/place-value constants
   for(const lit of r.calc.match(/\d+(?:\.\d+)?/g))if(!['1','2','4','5','10','12','60','100','1000','10000'].includes(lit))assert(r.prompt.replace(/,/g,'').includes(lit),k+' calc literal '+lit+' is not in the prompt');
   const cvs=textValues(ct);
   for(const c of r.choices)if(c.id!==r.answer&&/^[\d.,]/.test(c.text)){const w=textValues(c.text);assert(!(w.length===cvs.length&&w.every((x,i)=>x.eq(cvs[i]))),k+' distractor "'+c.text+'" equals the answer')}
   calc++;continue}
  const m=/^([0-9.＋－×÷（）()\s]+)＝？$/.exec(r.prompt);
  if(m){const v=evalExpr(fullwidth(m[1]));assert(cv&&v.eq(cv),`${k} prompt ${r.prompt} = ${v} but answer "${ct}"`);auto++;continue}
  concept++}catch(e){errors.push(e.message)}}
 assert.deepEqual(errors,[]);
 console.log(JSON.stringify({calcVerified:calc,promptVerified:auto,conceptOnly:concept}));
 assert(calc+auto>=60,'at least 60 readiness answers must be recomputed, got '+(calc+auto))});
test('Every numeric readiness answer is restated in its explanation text',()=>{
 const errors=[];for(const k of keys){const p=lessons[k],ct=correctText(p),cv=textValue(ct);if(!cv||!/^[\d.,]/.test(ct))continue;
  const nums=(p.readiness.explanation.replace(/,/g,'').match(/\d+(?:\.\d+)?/g)||[]);
  if(cv.d===1n&&!nums.some(x=>num(x).eq(cv)))errors.push(`${k}: explanation "${p.readiness.explanation}" never states ${ct}`)}
 assert.deepEqual(errors,[])});
test('Every plain arithmetic equation written in the teaching text is true (self-check of 170 lessons)',()=>{
 const keep=t=>t.replace(/＋/g,'+').replace(/[－−]/g,'-').replace(/×/g,'*').replace(/＝/g,'=').replace(/（/g,'(').replace(/）/g,')').replace(/,/g,'').replace(/[，、；：。！？]/g,'|').replace(/\s*([+\-*\/÷=()])\s*/g,'$1');
 const span=/(?<![\d.])[\d(][\d.+\-*\/÷()]*(?:=[\d.+\-*\/÷()]+)+/g;let checked=0;const errors=[];
 for(const k of keys){const p=lessons[k];
  const fields={model:p.explain.model,steps:p.modelSteps.join(' '),'readiness.explanation':p.readiness.explanation,'readiness.retry':p.readiness.retry,repair:p.misconception.repair,lookFor:p.teacher.lookFor,extension:p.teacher.extension,'readiness.prompt':p.readiness.prompt,'explain.prompt':p.explain.prompt,diagram:p.diagram.alt};
  for(const [name,raw] of Object.entries(fields)){const t=keep(raw);let m;span.lastIndex=0;
   while((m=span.exec(t))){const s=m[0].trim(),before=t[m.index-1]||'',after=t[m.index+m[0].length]||'';
    if(/[餘%％又a-zA-Zπ□]/.test(after)||/[又a-zA-Zπ□+\-*\/÷)]/.test(before))continue;   // 14÷4＝3餘2, 25%, 2又1/4, x＋3＝8, （10＋x）×2＝28
    if(/^\d+\.\d+=/.test(s)&&after==='個')continue;                                 // 0.5＝5個十分之一 (notation, not arithmetic)
    if(/\d\/\d+\s*÷|÷\s*\d+\/\d/.test(s))continue;                          // fraction division is written without brackets
    const parts=s.split('=').map(x=>x.trim()).filter(Boolean).map(x=>x.replace(/÷/g,'/'));if(parts.length<2)continue;
    let vals;try{vals=parts.map(evalExpr)}catch(e){continue}
    checked++;if(!vals.every(v=>v.eq(vals[0])))errors.push(`${k} ${name}: ${s}`)}}}
 console.log(JSON.stringify({equationsChecked:checked}));
 assert(checked>=250,'expected to check many equations, got '+checked);assert.deepEqual(errors,[])});
// ---- templates that the lessons practise
const c={console,Date,Math};c.globalThis=c;vm.createContext(c);
for(const b of read('app/index.html').matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)){const t=b[2];if(t.includes('root.WQMathData=')||t.includes('window.WQMathData =')||t.includes('globalThis.WQMathData=')||/curriculum_extension|math_visuals.js|course_data|school_bundle|course_pedagogy|course_engine/.test(b[1])||t.includes('WordQuest Maths 0.1.2'))vm.runInContext(t,c);}
const C=c.WQMathCore,E=c.WQCourseEngine,P=c.WQCoursePedagogy,L=C.library(c.WQMathData);
test('Mixed-number conversion stems say "write as an improper fraction", never "reduce to simplest form" (T24)',()=>{
 for(const t of L.templates.values()){if(!/\{a\} 又 \{c\}\/\{b\}/.test(t.stem_zh||''))continue;assert(!/約成最簡/.test(t.stem_zh),t.id+' '+t.stem_zh);assert(/假分數/.test(t.stem_zh),t.id)}
 for(const id of ['4N6.R3-T1.C1','4N6.R3-T2.C1','4N6.R3-T3.C1'])for(let seed=0;seed<30;seed++){const q=E.question(L,{template:id,seed});assert(/又/.test(q.stem_zh)&&/假分數/.test(q.stem_zh)&&!/約成最簡/.test(q.stem_zh),q.stem_zh);
  const a=+q.params.a,b=+q.params.b,cc=+q.params.c;assert.equal(C.Q.parse(q.answer).cmp(`${a*b+cc}/${b}`),0,q.stem_zh)}
 const plan=P.ids('4N6',2);assert(plan.includes('4N6.SIMPLIFY.M3'),'lesson 2 has a dedicated simplification template')});
test('4N6 simplification template asks real reductions with correct simplest answers (T24)',()=>{
 const seen=new Set();for(let seed=0;seed<60;seed++){const q=E.question(L,{template:'4N6.SIMPLIFY.M3',seed}),a=BigInt(q.params.a),b=BigInt(q.params.b),sn=BigInt(q.params.sn),sd=BigInt(q.params.sd);
  assert(/約成最簡分數/.test(q.stem_zh)&&/^把 \d+\/\d+ 約成最簡分數。$/.test(q.stem_zh),q.stem_zh);assert.equal(gcd(sn,sd),1n);assert(a*sd===b*sn,'equal value');assert(gcd(a,b)>1n,'must be reducible');
  assert.equal(C.Q.parse(q.answer).cmp(`${sn}/${sd}`),0);assert(q.workedSteps.length>=3&&!/NaN|undefined/.test(q.workedSteps.join('')));assert(P.figure(q).includes('<svg'));seen.add(`${a}/${b}`)}
 assert(seen.size>=8,'enough variety '+seen.size)});
test('Template explanations only mention carrying / zero place holders when the numbers need them (T28)',()=>{
 for(const [id,need,bad] of [['1N4.1-T1.C1',/不用進位/,/滿十，要把/],['1N4.1-T2.C1',/個位滿十/,/不用進位/],['2N2.1-T1.C1',/沒有進位/,/進位兩次|向十位進1/],['2N2.1-T2.C1',/向十位進1/,/沒有進位/],['2N2.1-T3.C1',/進位兩次/,/沒有進位/],['2N4.2-T1.C1',/排好/,/佔位/],['2N4.2-T2.C1',/十位沒有/,/百位和十位/],['3N1.2-T1.C1',/從萬位排到個位/,/仍要寫 0/]])
  for(let seed=0;seed<20;seed++){const q=E.question(L,{template:id,seed}),t=L.templates.get(id).explanation,filled=C.fill?C.fill(t,q.params):'';const text=(q.explanation||'')+(filled||'');
   assert(need.test(text),id+' should say '+need+' got '+text);assert(!bad.test(text),id+' should not say '+bad+' got '+text)}
 let zero=0,nonzero=0;for(const id of ['2N3.3-T1.C1','2N3.3-T2.C1','2N3.3-T3.C1'])for(let seed=0;seed<80;seed++){const q=E.question(L,{template:id,seed}),has0=+q.params.a===0||+q.params.b===0,text=C.fill(L.templates.get(id).explanation,q.params);
  assert.equal(/乘數是 0/.test(text),has0,`${id} a=${q.params.a} b=${q.params.b}: ${text}`);has0?zero++:nonzero++}
 assert(zero>=5&&nonzero>=20,`covered both cases ${zero}/${nonzero}`)});
test('Every chapter still has non-empty, finite practice figures after the template edits',()=>{
 for(const id of ['1N4.1-T1.C1','2N2.1-T3.C1','2N3.3-T3.C1','2N4.2-T3.C1','3N1.2-T3.C1','4N6.R3-T3.C1','4N6.SIMPLIFY.M3'])for(let seed=0;seed<10;seed++){const q=E.question(L,{template:id,seed});assert(!/NaN|undefined|Infinity/.test(P.figure(q)+q.explanation),id)}});
const dir=path.join(R,'math_course_evidence/m3');fs.mkdirSync(dir,{recursive:true});
fs.writeFileSync(path.join(dir,'r318_content_results.json'),JSON.stringify({environment:'Node VM, production content and engine. Not student research.',passed:cases.filter(c=>c.passed).length,failed:cases.filter(c=>!c.passed).length,cases},null,2)+'\n');
