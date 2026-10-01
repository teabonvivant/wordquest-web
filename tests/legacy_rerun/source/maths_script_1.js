/* WordQuest Maths 0.1.2 — deterministic, dependency-free learning core.
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
  // Expand vulgar fractions BEFORE width normalisation: 1⅔ means 1 + 2/3, never 12/3.
  const VULGAR={'¼':'1/4','½':'1/2','¾':'3/4','⅐':'1/7','⅑':'1/9','⅒':'1/10','⅓':'1/3','⅔':'2/3','⅕':'1/5','⅖':'2/5','⅗':'3/5','⅘':'4/5','⅙':'1/6','⅚':'5/6','⅛':'1/8','⅜':'3/8','⅝':'5/8','⅞':'7/8','↉':'0/3'};
  function numberText(v){
    assert(typeof v==='string'||typeof v==='number','請輸入數字，不要輸入其他資料');
    let s=String(v).trim();assert(s.length>0&&s.length<=60,'請輸入有效數字');
    // Only full-width digits/signs are folded; superscripts and invisible symbols are not numbers.
    s=s.replace(/[！-～]/g,c=>String.fromCharCode(c.charCodeAt(0)-0xfee0)).replace(/−/g,'-').replace(/⁄/g,'/');
    const m=s.match(/^([+-]?)(\d*)\s*([¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞↉])$/);
    if(m)s=m[1]+(m[2]?m[2]+' ':'')+VULGAR[m[3]];
    return s;
  }
  class Q {
    constructor(n, d = 1n) {
      n = BigInt(n); d = BigInt(d); assert(d !== 0n, '分母不可為零');
      assert(n.toString().length < 100 && d.toString().length < 100, '數值太大');
      if (d < 0n) { n = -n; d = -d; }
      const g = gcd(n,d); this.n=n/g; this.d=d/g;
    }
    static parse(v) {
      if (v instanceof Q) return v;
      const s=numberText(v);
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
    src=src.replace(/[！-～]/g,c=>String.fromCharCode(c.charCodeAt(0)-0xfee0)).replace(/×/g,'*').replace(/(\d|\))\s*x\s*(?=\d|\()/gi,'$1*').replace(/÷/g,'/').replace(/−/g,'-');
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
  function processMatches(source,expected){
    if(!expected||typeof source!=='string'||source.length>240)return false;
    try{
      const sides=source.replace(/＝/g,'=').split('=');if(sides.length>2)return false;
      const got=parseExpr(sides[0]);if(['num','var'].includes(got[0]))return false;
      if(sides.length===2&&evaluate(got).cmp(Q.parse(sides[1]))!==0)return false;
      function signedKey(ast){const terms=[];function walk(a,sign){
        if(a[0]==='+'){walk(a[1],sign);walk(a[2],sign);}
        else if(a[0]==='-'){walk(a[1],sign);walk(a[2],-sign);}
        else if(a[0]==='neg')walk(a[1],-sign);
        else terms.push((sign>0?'+':'-')+canonical(a));
      }walk(ast,1);return terms.sort().join('|');}
      function variants(a,root=false){
        if(a[0]==='num')return[a];
        if(a.length!==3)return[a];
        const out=[];
        for(const x of variants(a[1]))for(const y of variants(a[2])){if(out.length<48)out.push([a[0],x,y]);}
        if(!root)out.push(['num',evaluate(a).toString()]);
        if(a[0]==='*')for(const [term,count] of [[a[1],a[2]],[a[2],a[1]]]){
          const n=evaluate(count);if(n.d===1n&&n.n>=2n&&n.n<=12n){let sum=term;for(let k=1;k<Number(n.n);k++)sum=['+',sum,term];out.push(sum);}
        }
        return out;
      }
      const key=signedKey(got);return variants(expected,true).some(v=>signedKey(v)===key);
    }catch(_){return false;}
  }
  function templateOf(lib,id){return lib.templates.get(id)||lib.archived?.get(id);}
  function englishNumbers(s){return s.replace(/\b1 (ones|tens|hundreds|thousands|ten-thousands)\b/g,(_,w)=>'1 '+w.slice(0,-1));}
  function speakMath(s){return String(s).replace(/(\d+)\s*\/\s*(\d+)/g,(_,n,d)=>d+'分之'+n).replace(/×/g,' 乘 ').replace(/÷/g,' 除以 ').replace(/−/g,' 減 ').replace(/\+/g,' 加 ').replace(/=\s*\?/g,'等於幾多？');}
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
    const archived=new Map((data.archiveTemplates||[]).map(t=>[t.id,t]));return {data,skills,templates,archived};
  }
  function generate(lib,templateId,seed){
    const t=templateOf(lib,templateId);assert(t,'題目模板不存在');const r=random(seed);let p={},valid=false;
    for(let trial=0;trial<500;trial++){
      p={};for(const [k,v]of Object.entries(t.params)){assert(safeId(k),'參數名稱無效');if(v.int){const [a,b]=v.int;int(a,0,1000000);int(b,a,1000000);p[k]=a+Math.floor(r()*(b-a+1));}else if(v.pick){assert(v.pick.length && v.pick.length<=100,'參數清單錯誤');p[k]=v.pick[Math.floor(r()*v.pick.length)];}else p[k]=evaluate(v.expr,p).toString();}
      if((t.constraints||[]).every(c=>constraint(c,p))){valid=true;break;}
    }
    assert(valid,'題目條件無法滿足');const answer=evaluate(t.answer.expr,p).toString(),choices=[{value:answer,code:null}];
    for(const d of t.distractors||[]){if(d.when&&!d.when.every(c=>constraint(c,p)))continue;const v=evaluate(d.expr,p).toString();if(!choices.some(c=>Q.parse(c.value).cmp(v)===0))choices.push({value:v,code:d.code});}
    if(t.type==='choice'&&choices.length<(t.choiceCount||4)){for(const off of [1,-1,2,-2]){const v=Q.parse(answer).add(off).toString();if(Q.parse(v).cmp(0)>=0&&!choices.some(c=>Q.parse(c.value).cmp(v)===0))choices.push({value:v,code:'RECHECK'});if(choices.length>=(t.choiceCount||4))break;}assert(choices.length>=2,'選項不足');}
    for(let i=choices.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[choices[i],choices[j]]=[choices[j],choices[i]];}
    return {id:templateId+':'+seed,templateId,skill:t.skill,track:lib.skills.get(t.skill).track,seed,params:p,type:t.type,difficulty:t.difficulty,
      stem_zh:fill(t.stem_zh,p),stem_en:englishNumbers(fill(t.stem_en,p,'en')),speech_yue:speakMath(fill(t.speech_yue||t.stem_zh,p)),answer,unit:t.answer.unit||'',unit_en:t.answer.unit_en||'',formats:t.answer.formats||['integer','fraction','decimal'],simplest:!!t.answer.simplest,
      remainder:t.answer.remainder?evaluate(t.answer.remainder,p).toString():null,choices:choices.slice(0,t.choiceCount||4),hints:t.hints.map(h=>fill(h,p)),explanation:fill(t.explanation,p),process:t.answer.process?substitute(parseExpr(t.answer.process),p):null,visual:t.visual||'',strategy:lib.skills.get(t.skill).strategy||null};
  }
  function mark(q,input){
    const a=typeof input==='object'&&input?input:{value:input};let value;try{value=Q.parse(a.value);}catch(e){return {valid:false,correct:false,credit:0,message:e.message,code:'FORMAT'};}
    const raw=numberText(a.value),format=raw.includes('/')?'fraction':raw.includes('.')?'decimal':'integer';
    if(!q.formats.includes(format))return {valid:false,correct:false,credit:0,message:'請用題目指定的數字格式作答。',code:'FORMAT'};
    const numerical=value.cmp(q.answer)===0;
    let simplified=true;
    if(numerical&&q.simplest){const m=raw.match(/^(?:[+-]?\d+\s+)?([+-]?\d+)\s*\/\s*(\d+)$/);simplified=format==='integer'||!!m&&gcd(BigInt(m[1]),BigInt(m[2]))===1n;}
    let credit=numerical?(simplified?1:0.5):0,code=numerical?(simplified?null:'SIMPLIFY'):(q.choices.find(c=>Q.parse(c.value).cmp(value)===0)?.code||'RECHECK'),parts=null;
    if(q.type==='remainder'){
      let rem=false;try{const x=Q.parse(a.remainder);rem=x.d===1n&&x.cmp(q.remainder)===0;}catch(_){}
      parts={quotient:numerical,remainder:rem};credit=(Number(numerical)+Number(rem))/2;if(!rem)code='REMAINDER';
    }
    if(q.type==='word'){
      const process=processMatches(a.expression||'',q.process);
      const unit=String(a.unit||'').normalize('NFKC').trim().toLowerCase();const units=[q.unit,q.unit_en].map(x=>String(x||'').normalize('NFKC').trim().toLowerCase()).filter(Boolean);if(['元','港元','hkd','hk$','$'].includes(String(q.unit||'').toLowerCase()))units.push('hkd','hk$','$','港元','元','dollar','dollars','hong kong dollars');const unitOK=units.includes(unit);
      // Answer sentence is a structured frame in the UI. Free-text semantics are NOT auto-graded.
      parts={value:numerical,expression:process,unit:unitOK};credit=(Number(numerical)*2+Number(process)+Number(unitOK))/4;
      if(!numerical)code=code||'RECHECK';else if(!unitOK)code='UNIT';else if(!process)code='PROCESS';
    }
    const correct=credit===1;return {valid:true,correct,credit,parts,code,message:correct?'答對了！':code==='SIMPLIFY'?'數值正確，再化成最簡分數。':code==='UNIT'?'數值正確，留意答案單位。':code==='PROCESS'?'數值正確；這個算式暫時未能自動核對。請保留你的解法，交給家長或老師查看。':'再看清楚題目，試試另一個方法。'};
  }
  function toolModel(kind='tenframe',q=null){
    const p=q?.params||{},sid=q?.skill||'';
    const n=(k,f=0)=>p[k]!==undefined&&Number.isFinite(Number(p[k]))?Number(p[k]):f;
    const base=n('a',n('n',52)),compare=sid==='3N5.3',division=sid==='2N6.2';
    const den=compare?n('left',4):n('den',4),den2=compare?n('right',6):n('den',6);
    const lineMax=kind==='numberline'?Math.max(20,Math.ceil((sid==='O-CAL-pattern'?n('c')+4*n('step'):Math.max(n('a'),n('b'),n('n')))/10)*10):20;
    return {kind,questionId:q?.id||'',cells:Array.from({length:20},(_,i)=>i<n('n')),h:Math.floor(base/100)%10,t:Math.floor(base/10)%10,o:base%10,
      digits:String(Math.max(0,Math.floor(base))).padStart(5,'0').slice(-5).split('').map(Number),position:0,lineMax:Math.min(100,lineMax),
      den,num:compare?n('num'):sid==='3N5.4'?n('a'):0,den2,num2:compare?n('num'):sid==='3N5.4'?n('b'):1,
      rows:q?n('b',3):3,cols:q?n('a',4):4,extra:sid==='3N4.3'?n('c'):0,
      mode:division?'division':'array',dividend:division?n('a'):0,divisor:division?n('b'):1,shared:0,
      money:[],front:Math.max(0,n('front',4)-1),back:Math.max(0,n('back',5)-1),
      points:n('points',4),pairs:[],first:null,tens:1,ones:0,entries:[],changed:0};
  }
  function numberlineTicks(max=20){int(max,20,100);const step=Math.ceil(max/20),ticks=[];for(let x=0;x<=max;x+=step)ticks.push(x);if(ticks.at(-1)!==max)ticks.push(max);return ticks;}
  function moveOnLine(t,step){int(step,-100,100);t.position=Math.max(0,Math.min(t.lineMax,t.position+step));return t.position;}
  function sharingStep(t,delta){int(delta,-1,1);const next=t.shared+delta;if(next>=0&&next*t.divisor<=t.dividend)t.shared=next;return {each:t.shared,left:t.dividend-t.shared*t.divisor};}
  function hkDay(now=Date.now()){return new Date(now+8*3600000).toISOString().slice(0,10);}
  function plusDay(s,n){return new Date(Date.parse(s+'T00:00:00Z')+n*DAY).toISOString().slice(0,10);}
  function blank(){return {schema:1,contentRevision:2,revision:0,serial:0,attempts:[],mastery:{normal:{},olympiad:{}},mistakes:{},cards:[],lessons:{},sessions:[],outbox:[],wallet:{balance:0,days:{}},settings:{language:'zh',voice:'yue-HK',sound:true,slow:false,olympiad:true,limit:20,schoolUnit:'',showScore:false},usage:{},reports:[],created:Date.now()};}
  // Validate persisted bytes before they can be used for question generation or rendering.
  // This is corruption protection, NOT authentication of offline grades.
  function validateState(v,lib){
    assert(v&&v.schema===1,'數學備份版本不支援');assert(JSON.stringify(v).length<=2500000,'數學資料過大');
    function scan(x,depth=0){assert(depth<25,'資料層數太多');if(!x||typeof x!=='object')return;for(const k of Object.keys(x)){assert(!['__proto__','constructor','prototype'].includes(k),'資料含不安全欄位');scan(x[k],depth+1);}}
    scan(v);const out=clone(v);
    const obj=x=>assert(x&&typeof x==='object'&&!Array.isArray(x),'資料物件無效');
    const array=(x,max)=>assert(Array.isArray(x)&&x.length<=max,'資料列表無效');
    const string=(x,max)=>assert(typeof x==='string'&&x.length<=max,'資料文字無效');
    const finite=(x,min=0,max=253402214400000)=>assert(typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max,'資料數值無效');
    const bool=x=>assert(typeof x==='boolean','資料狀態無效');
    const validDay=d=>{if(typeof d!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d))return false;const t=Date.parse(d+'T00:00:00Z');return Number.isFinite(t)&&new Date(t).toISOString().slice(0,10)===d;};
    const mode=x=>assert(['lesson','practice','daily','diagnostic','guided','challenge-demo'].includes(x),'作答模式無效');
    const trackSkill=(id,track)=>assert(lib.skills.get(id)?.track===track,'技能路線無效');
    const answer=x=>{if(typeof x==='string'){string(x,60);return;}if(typeof x==='number'){finite(x,-1e12,1e12);return;}obj(x);assert(Object.hasOwn(x,'value'),'答案缺少數值');if(typeof x.value==='number')finite(x.value,-1e12,1e12);else string(x.value,60);for(const[k,max]of [['expression',240],['unit',20],['remainder',60]])if(x[k]!==undefined)string(x[k],max);};
    const code=x=>{if(x!==null&&x!==undefined){string(x,80);assert(/^[A-Za-z0-9_.:-]+$/.test(x),'迷思代碼無效');}};
    const templateRef=(r,skill=null,track=null)=>{obj(r);const t=templateOf(lib,r.template);assert(t,'題目模板不存在');if(skill!==null)assert(t.skill===skill,'題目模板與技能不一致');if(track!==null)trackSkill(t.skill,track);int(r.seed,0,0xffffffff);return t;};
    obj(out);int(out.revision,0,1e9);int(out.serial,0,1e9);finite(out.created);
    array(out.attempts,5000);assert(new Set(out.attempts.map(a=>a.id)).size===out.attempts.length,'作答紀錄重複');
    for(const a of out.attempts){obj(a);assert(safeId(a.id),'作答 ID 無效');trackSkill(a.skill,a.track);const t=templateRef(a,a.skill,a.track);int(a.hint,0,5);int(a.time_ms,0,3600000);finite(a.at,1);bool(a.correct);bool(a.independent);finite(a.credit,0,1);mode(a.mode);int(a.difficulty,1,3);assert(a.difficulty===t.difficulty,'題目難度與模板不一致');answer(a.answer);code(a.code);}
    obj(out.mastery);for(const track of ['normal','olympiad']){obj(out.mastery[track]);for(const[id,m]of Object.entries(out.mastery[track])){trackSkill(id,track);obj(m);finite(m.score,0,100);array(m.recent,5);finite(m.last);finite(m.achieved);assert(m.next===''||validDay(m.next),'重溫日期無效');assert(m.reviewBase===''||validDay(m.reviewBase),'重溫基準無效');int(m.reviewIndex,0,1000000);for(const r of m.recent){obj(r);int(r.difficulty,1,3);int(r.hint,0,5);bool(r.correct);bool(r.independent);}}}
    const st=out.settings;obj(st);assert(['zh','en','bi'].includes(st.language)&&['yue-HK','zh-CN','en-GB'].includes(st.voice),'語言設定無效');int(st.limit,5,90);for(const b of ['sound','slow','olympiad','showScore'])bool(st[b]);string(st.schoolUnit,29);
    obj(out.wallet);int(out.wallet.balance,0,1000000);obj(out.wallet.days);
    for(const[d,w]of Object.entries(out.wallet.days)){assert(validDay(d),'錢包日期無效');obj(w);array(w.keys,128);w.keys.forEach(k=>string(k,200));assert(new Set(w.keys).size===w.keys.length,'錢包任務重複');int(w.blocks,0,4);bool(w.bonus);}
    obj(out.usage);for(const[d,ms]of Object.entries(out.usage)){assert(validDay(d),'使用時間日期無效');int(ms,0,86400000);}
    array(out.cards,30);assert(new Set(out.cards).size===out.cards.length,'策略卡重複');for(const card of out.cards)assert(lib.data.cards.some(c=>c.id===card),'策略卡不存在');
    array(out.outbox,200);assert(new Set(out.outbox.map(e=>e.id)).size===out.outbox.length,'獎勵 ID 重複');
    for(const e of out.outbox){obj(e);assert(safeId(e.id)&&typeof e.key==='string'&&e.key.length<=200&&validDay(e.day),'獎勵紀錄無效');finite(e.startedAt);finite(e.completedAt,e.startedAt);assert(hkDay(e.completedAt)===e.day&&e.id==='reward:'+e.day+':'+e.key,'獎勵日期或任務不一致');bool(e.settled);assert(e.valid===true,'任務未達獎勵條件');int(e.award,0,5);}
    obj(out.mistakes);for(const[key,m]of Object.entries(out.mistakes)){obj(m);trackSkill(m.skill,m.track);assert(key===m.track+':'+m.skill,'錯題技能無效');array(m.due,3);assert(m.due.every(validDay)&&validDay(m.first),'錯題日期無效');int(m.successes,0,2);int(m.lastSeed,0,0xffffffff);bool(m.cleared);code(m.code);if(m.seenSignatures!==undefined){array(m.seenSignatures,3);m.seenSignatures.forEach(s=>string(s,1000));}}
    obj(out.lessons);for(const[id,l]of Object.entries(out.lessons)){assert(lib.skills.has(id),'課堂技能無效');obj(l);finite(l.at);string(l.self,20);bool(l.completed);}
    if(out.lastGenerated){obj(out.lastGenerated);for(const[id,sig]of Object.entries(out.lastGenerated)){assert(lib.skills.has(id),'出題技能無效');string(sig,1000);}}
    array(out.sessions,300);for(const ss of out.sessions){obj(ss);assert(safeId(ss.id)&&['normal','olympiad'].includes(ss.track),'已完成課堂無效');assert(['lesson','practice','daily','diagnostic'].includes(ss.mode),'課堂模式無效');if(ss.skill!==null)trackSkill(ss.skill,ss.track);finite(ss.at);int(ss.attempts,0,250);int(ss.correct,0,ss.attempts);}
    array(out.reports,100);for(const r of out.reports){templateRef(r);finite(r.at);if(r.skill!==undefined)assert(templateOf(lib,r.template).skill===r.skill,'報錯技能不一致');}
    if(out.current){const ss=out.current;obj(ss);assert(safeId(ss.id)&&['normal','olympiad'].includes(ss.track),'課堂狀態無效');assert(['lesson','practice','daily','diagnostic'].includes(ss.mode),'課堂模式無效');if(ss.skill!==null)trackSkill(ss.skill,ss.track);if(ss.mode==='lesson')assert(ss.skill!==null&&ss.example,'教學課堂缺少技能或示範題');int(ss.stage,0,5);int(ss.index,0,250);int(ss.hint,0,5);finite(ss.startedAt);finite(ss.questionAt);finite(ss.activeMs??0);array(ss.results,250);array(ss.replacements,250);ss.replacements.forEach(x=>string(x,20));obj(ss.queues);assert([null,'numberline','money'].includes(ss.game),'操作遊戲無效');bool(ss.completed);
      for(const[stage,queue]of Object.entries(ss.queues)){assert(['0','3','4'].includes(stage),'課堂步驟無效');array(queue,250);queue.forEach(r=>templateRef(r,ss.skill,ss.track));}
      const requiresQuestion=ss.mode==='lesson'?(ss.track==='normal'?[3,4].includes(ss.stage):[0,3].includes(ss.stage)):ss.stage===4;
      if(!ss.completed&&requiresQuestion)assert(Array.isArray(ss.queues[ss.stage])&&ss.queues[ss.stage].length>0,'這個課堂步驟缺少題目；已停止恢復，沒有覆蓋原資料');
      if(ss.example)templateRef(ss.example,ss.skill,ss.track);if(ss.queues[ss.stage])assert(ss.index<ss.queues[ss.stage].length||ss.completed,'課堂題目位置無效');
      for(const[k,max]of [['draft',60],['draftExpression',240],['draftUnit',20],['draftRemainder',60],['picked',60]])if(ss[k]!==undefined)string(ss[k],max);
      for(const r of ss.results){obj(r);trackSkill(r.skill,ss.track);bool(r.correct);int(r.hint,0,5);finite(r.credit,0,1);mode(r.mode);int(r.time_ms,0,3600000);finite(r.at);}
      if(ss.feedback!==null&&ss.feedback!==undefined){const f=ss.feedback;obj(f);bool(f.valid);bool(f.correct);finite(f.credit,0,1);string(f.message,1000);code(f.code);if(f.answer!==undefined)answer(f.answer);if(f.parts){obj(f.parts);for(const[k,b]of Object.entries(f.parts)){assert(['value','expression','unit','quotient','remainder'].includes(k),'評分欄位無效');bool(b);}}}
      if(ss.elapsedQuestionMs!==undefined)int(ss.elapsedQuestionMs,0,3600000);if(ss.questionPaused!==undefined)bool(ss.questionPaused);if(ss.toolState!==undefined){obj(ss.toolState);assert(JSON.stringify(ss.toolState).length<=10000,'教具狀態過大');}
    }
    if(out.contentRevision===undefined){
      for(const a of out.attempts){if(!a.template.startsWith('v011:'))a.template='v011:'+a.template;assert(templateOf(lib,a.template),'舊題目版本不存在');}
      for(const r of out.reports){if(!r.template.startsWith('v011:'))r.template='v011:'+r.template;}
      out.current=null;out.lastGenerated={};
      for(const track of ['normal','olympiad'])for(const m of Object.values(out.mastery[track])){
        m.recent=[];m.achieved=0;m.next=hkDay();m.reviewBase='';m.reviewIndex=0;
      }
      out.upgradeNotice='題庫已更新。舊作答、金幣及設定已保留；未完成的課堂請重新開始。舊版評分不會改寫，請做新題確認掌握情況。';
      out.contentRevision=2;
    }
    assert(out.contentRevision===2,'題庫進度版本不支援，請保留原備份');
    return out;
  }

  function mastery(state,skill){return state.mastery[skill.track][skill.id]||{score:30,recent:[],last:0,achieved:0,reviewBase:'',reviewIndex:0,next:''};}
  function isMastered(m){return m.score>=80 && m.recent.length===5 && m.recent.filter(x=>x.correct&&x.difficulty>=2&&x.hint<4&&x.independent).length>=4;}
  function readiness(m,now){return Math.max(0,m.score-Math.max(0,(now-m.last)/DAY-7)*0.7);}
  function accessible(state,skill,lib,grade){return skill.track==='olympiad'||skill.grade<=grade||skill.prerequisites.every(id=>isMastered(mastery(state,lib.skills.get(id))));}
  function record(state,lib,q,input,{id,at=Date.now(),hint=0,time_ms=0,independent=true,mode='practice'}={}){
    assert(safeId(id),'作答 ID 無效');int(hint,0,5);int(time_ms,0,3600000);const template=lib.templates.get(q.templateId);assert(template&&template.skill===q.skill&&template.difficulty===q.difficulty&&lib.skills.get(q.skill)?.track===q.track,'題目路線、技能或難度不一致');int(q.seed,0,0xffffffff);assert(generate(lib,q.templateId,q.seed).answer===q.answer,'題目答案與種子不一致');
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
    if(!result.correct){mistake={skill:q.skill,track:q.track,code:result.code||'RECHECK',first:day,due:[1,3,7].map(d=>plusDay(day,d)),successes:0,lastSeed:q.seed,seenSignatures:[q.stem_zh+'|'+q.answer],cleared:false};state.mistakes[key]=mistake;}
    else if(mistake&&!mistake.cleared&&hint<4&&independent&&mistake.lastSeed!==q.seed){
      // Different seeds can generate exactly the same small-number question.
      const sig=q.stem_zh+'|'+q.answer;
      if(!mistake.seenSignatures){const old=state.attempts.find(a=>a.skill===q.skill&&a.seed===mistake.lastSeed);mistake.seenSignatures=old?[generate(lib,old.template,old.seed)].map(x=>x.stem_zh+'|'+x.answer):[];}
      if(!mistake.seenSignatures.includes(sig)){mistake.successes++;mistake.lastSeed=q.seed;mistake.seenSignatures.push(sig);if(mistake.successes>=2)mistake.cleared=true;else mistake.due=mistake.due.filter(d=>d>day);if(!mistake.cleared&&!mistake.due.length)mistake.due=[plusDay(day,1)];}
    }
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
    if(state.outbox.length>=200){const pending=state.outbox.filter(e=>!e.settled);assert(pending.length<200,'待結算獎勵已達上限，請先重試同步並匯出備份');const settled=state.outbox.filter(e=>e.settled);const keep=Math.max(0,150-pending.length);state.outbox=[...(keep?settled.slice(-keep):[]),...pending];if(state.outbox.length>=200)state.outbox=pending;}
    const e={id,key,day,startedAt,completedAt,valid:true,settled:false,award:0};state.outbox.push(e);return e;
  }
  return Object.freeze({Q,numberText,processMatches,speakMath,toolModel,numberlineTicks,moveOnLine,sharingStep,parseExpr,evaluate,constraint,canonical,substitute,random,fill,library,generate,mark,blank,validateState,mastery,isMastered,readiness,accessible,record,nextQuestion,choose,dueSkills,planDaily,standaloneAward,enqueueReward,hkDay,plusDay,clone,assert,safeId,REVIEW,version:'0.1.2'});
});
