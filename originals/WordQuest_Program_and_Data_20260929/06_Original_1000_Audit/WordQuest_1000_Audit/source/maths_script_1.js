/* WordQuest Maths 0.1.0 — deterministic, dependency-free learning core.
 * This local practice engine is NOT a secure examination server.
 */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.WQMathCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const DAY = 86400000, REVIEW = [1, 3, 7, 21];
  const assert = (v, m) => { if (!v) throw new Error(m); };
  const clone = v => JSON.parse(JSON.stringify(v));
  const safeId = v => typeof v === 'string' && /^[A-Za-z0-9_.:-]{1,100}$/.test(v) && !['__proto__','constructor','prototype'].includes(v);
  const int = (v, a, b) => { assert(Number.isInteger(v) && v >= a && v <= b, '整數超出範圍'); return v; };
  const gcd = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a,b] = [b,a%b]; return a; };
  class Q {
    constructor(n, d = 1n) {
      n = BigInt(n); d = BigInt(d); assert(d !== 0n, '分母不可為零');
      assert(n.toString().length < 100 && d.toString().length < 100, '數值太大');
      if (d < 0n) { n = -n; d = -d; }
      const g = gcd(n,d); this.n=n/g; this.d=d/g;
    }
    static parse(v) {
      if (v instanceof Q) return v;
      const s=String(v).normalize('NFKC').trim().replace(/−/g,'-').replace(/⁄/g,'/');
      assert(s.length && s.length<=60, '請輸入有效數字');
      let m;
      if ((m=s.match(/^([+-]?\d+)\s+(\d+)\s*\/\s*(\d+)$/))) {
        const whole=BigInt(m[1]), n=BigInt(m[2]), d=BigInt(m[3]); assert(d>0n && n<d,'帶分數格式不正確');
        return new Q(whole*d+(s.startsWith('-')?-n:n),d);
      }
      if ((m=s.match(/^([+-]?\d+)\s*\/\s*(\d+)$/))) return new Q(m[1],m[2]);
      assert(/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(s),'請輸入整數、小數或分數，例如 1/2');
      const neg=s.startsWith('-'), abs=s.replace(/^[+-]/,''), [a,b='']=abs.split('.');
      return new Q((neg?-1n:1n)*BigInt((a||'0')+b),10n**BigInt(b.length));
    }
    add(b){b=Q.parse(b);return new Q(this.n*b.d+b.n*this.d,this.d*b.d);}
    sub(b){b=Q.parse(b);return new Q(this.n*b.d-b.n*this.d,this.d*b.d);}
    mul(b){b=Q.parse(b);return new Q(this.n*b.n,this.d*b.d);}
    div(b){b=Q.parse(b);return new Q(this.n*b.d,this.d*b.n);}
    mod(b){b=Q.parse(b);assert(this.d===1n && b.d===1n && b.n!==0n,'餘數只適用於整數');return new Q(this.n%b.n);}
    cmp(b){b=Q.parse(b);const x=this.n*b.d-b.n*this.d;return x<0n?-1:x>0n?1:0;}
    floor(){return new Q(this.n/this.d-(this.n<0n && this.n%this.d!==0n?1n:0n));}
    toString(){return this.d===1n?String(this.n):`${this.n}/${this.d}`;}
    number(){return Number(this.n)/Number(this.d);}
  }
  // Small expression parser. No eval/Function, member access, strings or arbitrary calls.
  function parseExpr(src) {
    assert(typeof src==='string' && src.length<=240,'算式太長');
    src=src.normalize('NFKC').replace(/×/g,'*').replace(/(\d|\))\s*x\s*(?=\d|\()/gi,'$1*').replace(/÷/g,'/').replace(/−/g,'-');
    const ts=[]; let p=0;
    while(p<src.length){if(/\s/.test(src[p])){p++;continue;}const m=src.slice(p).match(/^(?:\d+(?:\.\d*)?|\.\d+|[A-Za-z_][A-Za-z0-9_]*|[+\-*/%()])/);assert(m,'算式有不支援的符號');ts.push(m[0]);p+=m[0].length;}
    assert(ts.length>0 && ts.length<=100,'算式太長或空白');let i=0,depth=0;
    function atom(){assert(++depth<=20,'括號太多');let a,t=ts[i++];assert(t,'算式未完成');
      if(t==='('){a=sum();assert(ts[i++]===')','括號未配對');}
      else if(t==='-' || t==='+'){a=['neg',atom()];if(t==='+')a=a[1];}
      else if(t==='floor'){assert(ts[i++]==='(','floor 格式');a=['floor',sum()];assert(ts[i++]===')','floor 格式');}
      else if(/^(\d|\.)/.test(t))a=['num',Q.parse(t).toString()];
      else {assert(safeId(t) && !['window','globalThis'].includes(t),'算式名稱無效');a=['var',t];}
      depth--;return a;
    }
    function product(){let a=atom();while(['*','/','%'].includes(ts[i])){const op=ts[i++];a=[op,a,atom()];}return a;}
    function sum(){let a=product();while(['+','-'].includes(ts[i])){const op=ts[i++];a=[op,a,product()];}return a;}
    const ast=sum();assert(i===ts.length,'算式未完成');return ast;
  }
  function evaluate(ast, env={}) {
    if(typeof ast==='string')ast=parseExpr(ast);
    switch(ast[0]){
      case 'num':return Q.parse(ast[1]);
      case 'var':assert(Object.hasOwn(env,ast[1]) && (typeof env[ast[1]]==='number'||typeof env[ast[1]]==='string'),'不支援的算式名稱');return Q.parse(env[ast[1]]);
      case 'neg':return new Q(0).sub(evaluate(ast[1],env));
      case 'floor':return evaluate(ast[1],env).floor();
      default:{const a=evaluate(ast[1],env),b=evaluate(ast[2],env);return ({'+':()=>a.add(b),'-':()=>a.sub(b),'*':()=>a.mul(b),'/':()=>a.div(b),'%':()=>a.mod(b)})[ast[0]]();}
    }
  }
  function constraint(expr, env){const m=expr.match(/^(.*?)\s*(<=|>=|==|!=|<|>)\s*(.*?)$/);assert(m,'條件格式無效');const v=evaluate(m[1],env).cmp(evaluate(m[3],env));return ({'<':v<0,'>':v>0,'<=':v<=0,'>=':v>=0,'==':v===0,'!=':v!==0})[m[2]];}
  function canonical(ast){if(['num','var'].includes(ast[0]))return JSON.stringify(ast);if(['+','*'].includes(ast[0])){const list=[];function collect(a){if(a[0]===ast[0]){collect(a[1]);collect(a[2]);}else list.push(canonical(a));}collect(ast);return ast[0]+'['+list.sort().join(',')+']';}return ast[0]+'('+ast.slice(1).map(canonical).join(',')+')';}
  function substitute(ast,env){if(ast[0]==='var')return ['num',Q.parse(env[ast[1]]).toString()];return [ast[0],...ast.slice(1).map(v=>Array.isArray(v)?substitute(v,env):v)];}
  function random(seed){let x=int(seed,0,0xffffffff)>>>0;return ()=>{x=(x+0x6D2B79F5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
  function fill(s,p,lang='zh'){return String(s).replace(/\{([\w]+)\}/g,(_,k)=>{assert(Object.hasOwn(p,k),'題目缺少參數 '+k);const v=p[k];return v&&typeof v==='object'?String(v[lang]||v.zh):String(v);});}
  function library(data){
    assert(data.version===1 && Array.isArray(data.skills) && Array.isArray(data.templates),'內容版本不支援');
    const skills=new Map(),templates=new Map();
    for(const s of data.skills){assert(safeId(s.id)&&!skills.has(s.id),'技能 ID 重複');assert(['normal','olympiad'].includes(s.track),'路線無效');skills.set(s.id,s);}
    for(const s of data.skills)for(const pre of s.prerequisites)assert(skills.has(pre),'先備技能不存在');
    const done=new Set(),stack=new Set();function visit(id){if(done.has(id))return;assert(!stack.has(id),'先備技能循環');stack.add(id);skills.get(id).prerequisites.forEach(visit);stack.delete(id);done.add(id);}skills.forEach((_,id)=>visit(id));
    for(const t of data.templates){assert(safeId(t.id)&&!templates.has(t.id)&&skills.has(t.skill),'題目 ID 無效');int(t.difficulty,1,3);assert(['number','choice','fraction','word','remainder'].includes(t.type),'題型無效');templates.set(t.id,t);}
    for(const s of skills.values())assert([...templates.values()].some(t=>t.skill===s.id),'技能沒有題目');
    return {data,skills,templates};
  }
  function generate(lib,templateId,seed){
    const t=lib.templates.get(templateId);assert(t,'題目模板不存在');const r=random(seed);let p={},valid=false;
    for(let trial=0;trial<500;trial++){
      p={};for(const [k,v]of Object.entries(t.params)){assert(safeId(k),'參數名稱無效');if(v.int){const [a,b]=v.int;int(a,0,1000000);int(b,a,1000000);p[k]=a+Math.floor(r()*(b-a+1));}else if(v.pick){assert(v.pick.length && v.pick.length<=100,'參數清單錯誤');p[k]=v.pick[Math.floor(r()*v.pick.length)];}else p[k]=evaluate(v.expr,p).toString();}
      if((t.constraints||[]).every(c=>constraint(c,p))){valid=true;break;}
    }
    assert(valid,'題目條件無法滿足');const answer=evaluate(t.answer.expr,p).toString(),choices=[{value:answer,code:null}];
    for(const d of t.distractors||[]){const v=evaluate(d.expr,p).toString();if(!choices.some(c=>Q.parse(c.value).cmp(v)===0))choices.push({value:v,code:d.code});}
    if(t.type==='choice'&&choices.length<(t.choiceCount||4)){for(const off of [1,-1,2,-2]){const v=Q.parse(answer).add(off).toString();if(Q.parse(v).cmp(0)>=0&&!choices.some(c=>Q.parse(c.value).cmp(v)===0))choices.push({value:v,code:'RECHECK'});if(choices.length>=(t.choiceCount||4))break;}assert(choices.length>=2,'選項不足');}
    for(let i=choices.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[choices[i],choices[j]]=[choices[j],choices[i]];}
    return {id:templateId+':'+seed,templateId,skill:t.skill,track:lib.skills.get(t.skill).track,seed,params:p,type:t.type,difficulty:t.difficulty,
      stem_zh:fill(t.stem_zh,p),stem_en:fill(t.stem_en,p,'en'),answer,unit:t.answer.unit||'',unit_en:t.answer.unit_en||'',formats:t.answer.formats||['integer','fraction','decimal'],simplest:!!t.answer.simplest,
      remainder:t.answer.remainder?evaluate(t.answer.remainder,p).toString():null,choices:choices.slice(0,t.choiceCount||4),hints:t.hints.map(h=>fill(h,p)),explanation:fill(t.explanation,p),process:t.answer.process?substitute(parseExpr(t.answer.process),p):null,visual:t.visual||'',strategy:lib.skills.get(t.skill).strategy||null};
  }
  function mark(q,input){
    const a=typeof input==='object'&&input?input:{value:input};let value;try{value=Q.parse(a.value);}catch(e){return {valid:false,correct:false,credit:0,message:e.message,code:'FORMAT'};}
    const raw=String(a.value).normalize('NFKC').trim(),format=raw.includes('/')?'fraction':raw.includes('.')?'decimal':'integer';
    if(!q.formats.includes(format))return {valid:false,correct:false,credit:0,message:'請用題目指定的數字格式作答。',code:'FORMAT'};
    const numerical=value.cmp(q.answer)===0;
    let simplified=true;
    if(numerical&&q.simplest){const m=raw.match(/^([+-]?\d+)\s*\/\s*(\d+)$/);simplified=!!m && gcd(BigInt(m[1]),BigInt(m[2]))===1n;}
    let credit=numerical?(simplified?1:0.5):0,code=numerical?(simplified?null:'SIMPLIFY'):(q.choices.find(c=>Q.parse(c.value).cmp(value)===0)?.code||'RECHECK'),parts=null;
    if(q.type==='remainder'){
      let rem=false;try{const x=Q.parse(a.remainder);rem=x.d===1n&&x.cmp(q.remainder)===0;}catch(_){}
      parts={quotient:numerical,remainder:rem};credit=(Number(numerical)+Number(rem))/2;if(!rem)code='REMAINDER';
    }
    if(q.type==='word'){
      let process=false;try{process=canonical(parseExpr(a.expression||''))===canonical(q.process);}catch(_){}
      const unit=String(a.unit||'').normalize('NFKC').trim().toLowerCase();const unitOK=[q.unit,q.unit_en,'hkd','$','港元'].map(x=>String(x).toLowerCase()).includes(unit);
      // Answer sentence is a structured frame in the UI. Free-text semantics are NOT auto-graded.
      parts={value:numerical,expression:process,unit:unitOK};credit=(Number(numerical)*2+Number(process)+Number(unitOK))/4;
      if(!numerical)code=code||'RECHECK';else if(!unitOK)code='UNIT';else if(!process)code='PROCESS';
    }
    const correct=credit===1;return {valid:true,correct,credit,parts,code,message:correct?'完成咗！你用自己嘅方法搵到答案。':code==='SIMPLIFY'?'數值正確，再化成最簡分數。':code==='UNIT'?'數值正確，留意答案單位。':code==='PROCESS'?'數值正確；此算式未能自動核對。本版只支援指定的一步算式及交換加數／乘數，不代表其他方法一定錯。':'一齊睇清楚題目，再試另一個方法。'};
  }
  function hkDay(now=Date.now()){return new Date(now+8*3600000).toISOString().slice(0,10);}
  function plusDay(s,n){return new Date(Date.parse(s+'T00:00:00Z')+n*DAY).toISOString().slice(0,10);}
  function blank(){return {schema:1,revision:0,serial:0,attempts:[],mastery:{normal:{},olympiad:{}},mistakes:{},cards:[],lessons:{},sessions:[],outbox:[],wallet:{balance:0,days:{}},settings:{language:'zh',voice:'yue-HK',sound:true,slow:false,olympiad:true,limit:20,schoolUnit:'',showScore:false},usage:{},reports:[],created:Date.now()};}
  function validateState(v,lib){
    assert(v&&v.schema===1,'數學備份版本不支援');assert(JSON.stringify(v).length<=2500000,'數學資料過大');
    function scan(x,depth=0){assert(depth<25,'資料層數太多');if(!x||typeof x!=='object')return;for(const k of Object.keys(x)){assert(!['__proto__','constructor','prototype'].includes(k),'資料含不安全欄位');scan(x[k],depth+1);}}
    scan(v);const out=clone(v);int(out.revision,0,1e9);int(out.serial,0,1e9);
    assert(Array.isArray(out.attempts)&&out.attempts.length<=5000,'作答紀錄無效');assert(new Set(out.attempts.map(a=>a.id)).size===out.attempts.length,'作答紀錄重複');
    for(const a of out.attempts){assert(safeId(a.id)&&lib.skills.has(a.skill)&&a.track===lib.skills.get(a.skill).track,'作答路線無效');int(a.hint,0,5);int(a.time_ms,0,3600000);assert(Number.isFinite(a.at)&&a.at>0&&typeof a.correct==='boolean','作答資料無效');}
    for(const track of ['normal','olympiad']){assert(out.mastery&&out.mastery[track]&&typeof out.mastery[track]==='object','掌握度無效');for(const [id,m] of Object.entries(out.mastery[track])){assert(lib.skills.get(id)?.track===track,'掌握度跨科混合');assert(Number.isFinite(m.score)&&m.score>=0&&m.score<=100,'掌握度超出範圍');assert(Array.isArray(m.recent)&&m.recent.length<=5,'掌握度樣本無效');}}
    const st=out.settings;assert(st&&['zh','en','bi'].includes(st.language)&&['yue-HK','zh-CN','en-GB'].includes(st.voice),'語言設定無效');int(st.limit,5,90);for(const b of ['sound','slow','olympiad','showScore'])assert(typeof st[b]==='boolean','設定無效');assert(typeof st.schoolUnit==='string'&&st.schoolUnit.length<30,'學校進度無效');
    assert(out.wallet&&Array.isArray(out.cards)&&out.cards.length<=30&&Array.isArray(out.outbox)&&out.outbox.length<=200,'資料格式無效');int(out.wallet.balance,0,1000000);
    assert(out.usage&&typeof out.usage==='object','時間紀錄無效');for(const [d,ms]of Object.entries(out.usage)){assert(/^\d{4}-\d{2}-\d{2}$/.test(d),'日期無效');int(ms,0,86400000);}
    for(const e of out.outbox){assert(safeId(e.id)&&typeof e.key==='string'&&e.key.length<=200&&/^\d{4}-\d{2}-\d{2}$/.test(e.day),'獎勵紀錄无效');assert(Number.isFinite(e.startedAt)&&Number.isFinite(e.completedAt)&&e.completedAt>=e.startedAt,'獎勵時間無效');}
    const validDay=d=>typeof d==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(d)&&new Date(d+'T00:00:00Z').toISOString().slice(0,10)===d;
    const finite=(x,min=0,max=1e15)=>assert(Number.isFinite(x)&&x>=min&&x<=max,'資料數值無效');
    const obj=x=>assert(x&&typeof x==='object'&&!Array.isArray(x),'資料物件無效');
    const array=(x,max)=>assert(Array.isArray(x)&&x.length<=max,'資料列表無效');
    const string=(x,max)=>assert(typeof x==='string'&&x.length<=max,'資料文字無效');
    obj(out.mistakes);obj(out.lessons);obj(out.wallet.days);if(out.lastGenerated){obj(out.lastGenerated);for(const [id,sig]of Object.entries(out.lastGenerated)){assert(lib.skills.has(id),'出題技能無效');string(sig,1000);}}array(out.sessions,300);array(out.reports,100);
    for(const card of out.cards)assert(lib.data.cards.some(c=>c.id===card),'策略卡不存在');
    for(const [key,m]of Object.entries(out.mistakes)){assert(lib.skills.get(m.skill)?.track===m.track&&key===m.track+':'+m.skill,'錯題技能無效');array(m.due,3);assert(m.due.every(validDay),'錯題日期無效');int(m.successes,0,2);int(m.lastSeed,0,0xffffffff);assert(typeof m.cleared==='boolean','錯題狀態無效');}
    for(const [id,l]of Object.entries(out.lessons)){assert(lib.skills.has(id),'課堂技能無效');finite(l.at);string(l.self,20);}
    for(const r of out.reports){assert(lib.templates.has(r.template),'報錯模板無效');int(r.seed,0,0xffffffff);finite(r.at);}
    for(const [d,w]of Object.entries(out.wallet.days)){assert(validDay(d),'錢包日期無效');array(w.keys,128);w.keys.forEach(k=>string(k,200));int(w.blocks,0,4);assert(typeof w.bonus==='boolean','錢包狀態無效');}
    for(const e of out.outbox){assert(typeof e.settled==='boolean'&&e.valid===true&&validDay(e.day),'待結算紀錄無效');int(e.award,0,5);}
    for(const track of ['normal','olympiad'])for(const m of Object.values(out.mastery[track])){finite(m.last);finite(m.achieved);assert(m.next===''||validDay(m.next),'重溫日期無效');assert(m.reviewBase===''||validDay(m.reviewBase),'重溫基準無效');int(m.reviewIndex,0,1000000);for(const r of m.recent){int(r.difficulty,1,3);int(r.hint,0,5);assert(typeof r.correct==='boolean'&&typeof r.independent==='boolean','掌握度證據無效');}}
    if(out.current){const ss=out.current;obj(ss);assert(safeId(ss.id)&&['normal','olympiad'].includes(ss.track),'課堂狀態無效');assert(['lesson','practice','daily','diagnostic'].includes(ss.mode),'課堂模式無效');assert(ss.skill===null||lib.skills.get(ss.skill)?.track===ss.track,'課堂技能無效');int(ss.stage,0,5);int(ss.index,0,250);int(ss.hint,0,5);finite(ss.startedAt);finite(ss.questionAt);array(ss.results,250);array(ss.replacements,250);obj(ss.queues);assert([null,'numberline','money'].includes(ss.game),'操作遊戲無效');
      const checkRef=r=>{assert(r&&lib.templates.has(r.template)&&lib.skills.get(lib.templates.get(r.template).skill).track===ss.track,'課堂題目無效');int(r.seed,0,0xffffffff);};
      for(const [stage,queue]of Object.entries(ss.queues)){assert(['0','3','4'].includes(stage),'課堂步驟無效');array(queue,250);queue.forEach(checkRef);}
      if(ss.example)checkRef(ss.example);if(ss.queues[ss.stage])assert(ss.index<ss.queues[ss.stage].length||ss.completed,'課堂題目位置無效');
      assert(typeof ss.completed==='boolean','課堂完成狀態無效');string(ss.draft||'',60);string(ss.draftExpression||'',120);string(ss.draftUnit||'',20);string(ss.draftRemainder||'',8);string(ss.picked||'',60);
      for(const r of ss.results){assert(lib.skills.get(r.skill)?.track===ss.track&&typeof r.correct==='boolean','課堂結果無效');int(r.hint,0,5);finite(r.credit,0,1);}
    }
    return out;
  }
  function mastery(state,skill){return state.mastery[skill.track][skill.id]||{score:30,recent:[],last:0,achieved:0,reviewBase:'',reviewIndex:0,next:''};}
  function isMastered(m){return m.score>=80 && m.recent.length===5 && m.recent.filter(x=>x.correct&&x.difficulty>=2&&x.hint<4&&x.independent).length>=4;}
  function readiness(m,now){return Math.max(0,m.score-Math.max(0,(now-m.last)/DAY-7)*0.7);}
  function accessible(state,skill,lib,grade){return skill.track==='olympiad'||skill.grade<=grade||skill.prerequisites.every(id=>isMastered(mastery(state,lib.skills.get(id))));}
  function record(state,lib,q,input,{id,at=Date.now(),hint=0,time_ms=0,independent=true,mode='practice'}={}){
    assert(safeId(id),'作答 ID 無效');int(hint,0,5);int(time_ms,0,3600000);assert(lib.templates.has(q.templateId)&&lib.skills.get(q.skill)?.track===q.track,'題目路線不一致');
    if(state.attempts.some(a=>a.id===id))return {duplicate:true};
    const result=mark(q,input);if(!result.valid)return result;
    const a={id,skill:q.skill,track:q.track,template:q.templateId,seed:q.seed,answer:clone(input),correct:result.correct,credit:result.credit,hint,time_ms,at,mode,code:result.code,difficulty:q.difficulty,independent:independent&&hint<4};
    state.attempts.push(a);if(state.attempts.length>5000)state.attempts.shift();
    if(mode==='guided'||mode==='challenge-demo')return {...result,recorded:true};
    const sk=lib.skills.get(q.skill),m=clone(mastery(state,sk)),weight=hint>=4?0.5:1;
    const expected=1/(1+Math.pow(10,((q.difficulty*20+20)-m.score)/40));
    const delta=18*weight*(result.credit-expected);
    m.score=Math.max(0,Math.min(100,m.score+(independent?delta:Math.max(0,delta)*0.35)));
    m.recent.push({correct:result.correct,difficulty:q.difficulty,hint,independent:independent&&hint<4});m.recent=m.recent.slice(-5);m.last=at;
    const day=hkDay(at);
    if(isMastered(m)&&!m.achieved){m.achieved=at;m.reviewBase=day;m.reviewIndex=0;m.next=plusDay(day,1);}
    else if(m.next&&m.next<=day&&result.correct&&hint<4&&independent){if(m.reviewBase){m.reviewIndex++;const scheduled=m.reviewIndex<REVIEW.length?plusDay(m.reviewBase,REVIEW[m.reviewIndex]):plusDay(day,21);m.next=scheduled>day?scheduled:plusDay(day,3);}else{m.next=plusDay(day,3);}}
    if(!result.correct)m.next=plusDay(day,1);
    state.mastery[q.track][q.skill]=m;
    const key=q.track+':'+q.skill;let mistake=state.mistakes[key];
    if(!result.correct){mistake={skill:q.skill,track:q.track,code:result.code||'RECHECK',first:day,due:[1,3,7].map(d=>plusDay(day,d)),successes:0,lastSeed:q.seed,cleared:false};state.mistakes[key]=mistake;}
    else if(mistake&&!mistake.cleared&&hint<4&&independent&&mistake.lastSeed!==q.seed){mistake.successes++;mistake.lastSeed=q.seed;if(mistake.successes>=2)mistake.cleared=true;else mistake.due=mistake.due.filter(d=>d>day);if(!mistake.cleared&&!mistake.due.length)mistake.due=[plusDay(day,1)];}
    return {...result,recorded:true,mastered:isMastered(m)};
  }
  function choose(lib,skill,difficulty,serial){const pool=[...lib.templates.values()].filter(t=>t.skill===skill&&t.difficulty===difficulty);assert(pool.length,'沒有合適模板');return pool[serial%pool.length].id;}
  function nextQuestion(state,lib,skill,difficulty=2,avoid=null){
    const signature=q=>q.stem_zh+'|'+q.answer;state.lastGenerated=state.lastGenerated||{};
    const latest=[...state.attempts].reverse().find(a=>a.skill===skill),old=latest?generate(lib,latest.template,latest.seed):null;
    const banned=new Set([state.lastGenerated[skill],avoid?signature(avoid):null,old?signature(old):null]);
    for(let i=0;i<100;i++){state.serial++;const seed=(Math.imul(state.serial,2654435761)+12345)>>>0,q=generate(lib,choose(lib,skill,difficulty,state.serial),seed);if(!banned.has(signature(q))){state.lastGenerated[skill]=signature(q);return q;}}
    throw Error('未能產生不同數字的新題，請改練另一個技能。');
  }
  function dueSkills(state,lib,day=hkDay(),track='normal'){
    return [...lib.skills.values()].filter(s=>s.track===track && ((mastery(state,s).next&&mastery(state,s).next<=day)||Object.values(state.mistakes).some(m=>m.skill===s.id&&!m.cleared&&m.due.some(d=>d<=day))));
  }
  function planDaily(state,lib,{grade=3,track='normal',day=hkDay()}={}){
    const all=[...lib.skills.values()].filter(s=>s.track===track&&accessible(state,s,lib,grade));assert(all.length,'沒有可用課程');
    const fresh=all.filter(s=>!isMastered(mastery(state,s)));const preferred=fresh.filter(s=>s.unit===state.settings.schoolUnit);
    const main=(preferred.length?preferred:fresh.length?fresh:all),review=dueSkills(state,lib,day,track);const ids=[];
    for(let i=0;i<10;i++)ids.push(i<7?main[i%main.length].id:(review.length?review[(i-7)%review.length]:main[i%main.length]).id);
    return ids;
  }
  function standaloneAward(state,event){
    assert(event.valid===true,'任務未達獎勵條件');const w=state.wallet,d=w.days[event.day]||(w.days[event.day]={keys:[],blocks:0,bonus:false});
    if(d.keys.includes(event.key))return 0;assert(d.keys.length<128,'每日任務已達上限');d.keys.push(event.key);let n=0;if(d.blocks<4){d.blocks++;n=1;if(d.blocks===3&&!d.bonus){n++;d.bonus=true;}}n=Math.min(n,1000000-w.balance);w.balance+=n;return n;
  }
  function enqueueReward(state,{key,startedAt,completedAt=Date.now(),valid}){
    const day=hkDay(completedAt),id='reward:'+day+':'+key;assert(safeId(id),'任務識別碼無效');if(!valid||state.outbox.some(x=>x.id===id))return null;
    assert(state.outbox.length<200,'請先處理待同步獎勵');const e={id,key,day,startedAt,completedAt,valid:true,settled:false,award:0};state.outbox.push(e);return e;
  }
  return Object.freeze({Q,parseExpr,evaluate,constraint,canonical,substitute,random,fill,library,generate,mark,blank,validateState,mastery,isMastered,readiness,accessible,record,nextQuestion,choose,dueSkills,planDaily,standaloneAward,enqueueReward,hkDay,plusDay,clone,assert,safeId,REVIEW,version:'0.1.0'});
});
