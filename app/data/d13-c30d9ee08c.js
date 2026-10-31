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
  const int = (v, a, b) => { assert(Number.isInteger(v) && v >= a && v <= b, '數字超出範圍，請輸入較小的整數。'); return v; };
  const gcd = (a, b) => { a = a < 0n ? -a : a; b = b < 0n ? -b : b; while (b) [a,b] = [b,a%b]; return a; };
  // Expand vulgar fractions BEFORE width normalisation: 1⅔ means 1 + 2/3, never 12/3.
  const VULGAR={'¼':'1/4','½':'1/2','¾':'3/4','⅐':'1/7','⅑':'1/9','⅒':'1/10','⅓':'1/3','⅔':'2/3','⅕':'1/5','⅖':'2/5','⅗':'3/5','⅘':'4/5','⅙':'1/6','⅚':'5/6','⅛':'1/8','⅜':'3/8','⅝':'5/8','⅞':'7/8','↉':'0/3'};
  function numberText(v){
    assert(typeof v==='string'||typeof v==='number','請只輸入數字。');
    let s=String(v).trim();assert(s.length>0&&s.length<=60,'請輸入有效數字');
    // Only full-width digits/signs are folded; superscripts and invisible symbols are not numbers.
    s=s.replace(/[！-～]/g,c=>String.fromCharCode(c.charCodeAt(0)-0xfee0)).replace(/−/g,'-').replace(/⁄/g,'/');
    const m=s.match(/^([+-]?)(\d*)\s*([¼½¾⅐⅑⅒⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞↉])$/);
    if(m)s=m[1]+(m[2]?m[2]+' ':'')+VULGAR[m[3]];
    return s;
  }
  class Q {
    constructor(n, d = 1n) {
      n = BigInt(n); d = BigInt(d); assert(d !== 0n, '分母不可以是 0，請重新輸入。');
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
        const whole=BigInt(m[1]), n=BigInt(m[2]), d=BigInt(m[3]); assert(d>0n && n<d,'帶分數的寫法不對，請再檢查。');
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
    while(p<src.length){if(/\s/.test(src[p])){p++;continue;}const m=src.slice(p).match(/^(?:\d+(?:\.\d*)?|\.\d+|[A-Za-z_][A-Za-z0-9_]*|[+\-*/%()])/);assert(m,'算式有不能使用的符號，請刪除後再試。');ts.push(m[0]);p+=m[0].length;}
    assert(ts.length>0 && ts.length<=100,'算式太長或空白');let i=0,depth=0;
    function atom(){assert(++depth<=20,'括號太多');let a,t=ts[i++];assert(t,'算式還沒寫完，請補完整。');
      if(t==='('){a=sum();assert(ts[i++]===')','括號沒有配對，請檢查。');}
      else if(t==='-' || t==='+'){a=['neg',atom()];if(t==='+')a=a[1];}
      else if(t==='floor'){assert(ts[i++]==='(','floor（取整數部分）的寫法不對');a=['floor',sum()];assert(ts[i++]===')','floor（取整數部分）的寫法不對');}
      else if(/^(\d|\.)/.test(t))a=['num',Q.parse(t).toString()];
      else {assert(safeId(t) && !['window','globalThis'].includes(t),'算式名稱無效');a=['var',t];}
      depth--;return a;
    }
    function product(){let a=atom();while(['*','/','%'].includes(ts[i])){const op=ts[i++];a=[op,a,atom()];}return a;}
    function sum(){let a=product();while(['+','-'].includes(ts[i])){const op=ts[i++];a=[op,a,product()];}return a;}
    const ast=sum();assert(i===ts.length,'算式還沒寫完，請補完整。');return ast;
  }
  function evaluate(ast, env={}) {
    if(typeof ast==='string')ast=parseExpr(ast);
    switch(ast[0]){
      case 'num':return Q.parse(ast[1]);
      case 'var':assert(Object.hasOwn(env,ast[1]) && (typeof env[ast[1]]==='number'||typeof env[ast[1]]==='string'),'算式中有不能使用的名稱。');return Q.parse(env[ast[1]]);
      case 'neg':return new Q(0).sub(evaluate(ast[1],env));
      case 'floor':return evaluate(ast[1],env).floor();
      default:{const a=evaluate(ast[1],env),b=evaluate(ast[2],env);return ({'+':()=>a.add(b),'-':()=>a.sub(b),'*':()=>a.mul(b),'/':()=>a.div(b),'%':()=>a.mod(b)})[ast[0]]();}
    }
  }
  function constraint(expr, env){const m=expr.match(/^(.*?)\s*(<=|>=|==|!=|<|>)\s*(.*?)$/);assert(m,'條件的寫法不正確。');const v=evaluate(m[1],env).cmp(evaluate(m[3],env));return ({'<':v<0,'>':v>0,'<=':v<=0,'>=':v>=0,'==':v===0,'!=':v!==0})[m[2]];}
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
  function speakMath(s){return String(s).replace(/(\d+)\s*\/\s*(\d+)/g,(_,n,d)=>d+'分之'+n).replace(/×/g,' 乘 ').replace(/÷/g,' 除以 ').replace(/−/g,' 減 ').replace(/\+/g,' 加 ').replace(/=\s*[?？]/g,'等於多少？');}
  function random(seed){let x=int(seed,0,0xffffffff)>>>0;return ()=>{x=(x+0x6D2B79F5)>>>0;let t=x;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return ((t^(t>>>14))>>>0)/4294967296;};}
  function fill(s,p,lang='zh'){return String(s).replace(/\{([\w]+)\}/g,(_,k)=>{assert(Object.hasOwn(p,k),'題目缺少數值 '+k);const v=p[k];return v&&typeof v==='object'?String(v[lang]||v.zh):String(v);});}
  // ---- R3.5 p50: answer display and answer-text cleaning --------------------------------------------------------
  // Formatting only. Marking rules (what is correct) are unchanged: q.answer stays the canonical exact fraction string.
  // 1) displayAnswer: the corrected answer is shown in the format the question asks for (decimal question -> decimal).
  // 2) mark(): a unit that matches the question's unit is ignored (7 cm, 7厘米, 7元), 又 joins a mixed number (4又3/10),
  //    and the error text says what to change instead of a generic number message.
  const R35_UNITS={
    '厘米':['厘米','釐米','公分','cm','centimetre','centimetres','centimeter','centimeters'],
    '平方厘米':['平方厘米','平方釐米','平方公分','cm2','sqcm','squarecm'],
    '立方厘米':['立方厘米','立方釐米','立方公分','cm3','cucm'],
    '毫米':['毫米','mm'],'米':['米','m','metre','metres','meter','meters'],'公里':['公里','千米','km'],
    '公里／小時':['公里/小時','公里每小時','千米/小時','千米每小時','km/h','kmh','kph'],
    '公斤':['公斤','千克','kg'],'克':['克','公克','g'],'毫升':['毫升','ml'],
    '升':['升','l','litre','litres','liter','liters'],
    '元':['元','港元','hk$','hkd','$','dollar','dollars'],
    '分鐘':['分鐘','min','mins','minute','minutes'],'小時':['小時','h','hr','hrs','hour','hours'],
    '度':['度','°','deg','degree','degrees']
  };
  const R35_UNIT_RE=/(?:多少|幾)\s*(公里\s*[／/]\s*小時|平方厘米|立方厘米|厘米|毫米|公里|公斤|毫升|升|克|米|元|分鐘|小時|度|個|粒|本|人|條|件|張|輛|隻|枝|對|種)/g;
  // Skills whose answer is a measured amount without a unit in the template: show the unit the stem asks for.
  const R35_DISPLAY_UNIT={'6N4.R3':'元','6M3.R3':'厘米','6M5.R3':'平方厘米'};
  function r35Places(q){let d=q.d,k=0,j=0;while(d%2n===0n){d/=2n;k++;}while(d%5n===0n){d/=5n;j++;}return d===1n?Math.max(k,j):-1;}
  // Exact decimal text of a fraction whose denominator has only the factors 2 and 5; null when it is a recurring decimal.
  function r35Decimal(q){
    const p=r35Places(q);if(p<0)return null;if(p===0)return q.toString();
    const neg=q.n<0n,n=neg?-q.n:q.n,t=(n*10n**BigInt(p)/q.d).toString().padStart(p+1,'0');
    return (neg?'-':'')+t.slice(0,-p)+'.'+t.slice(-p);
  }
  function r35InferUnit(stem){let u='';for(const m of String(stem).matchAll(R35_UNIT_RE))u=m[1].replace(/\s+/g,'').replace('/','／');return u;}
  function r35Display(t,p,answer){
    const out={text:answer,unit:t.answer.unit||'',changed:false,added:'',unitHint:''};
    const stem=fill(t.stem_zh,p);
    try{
      if(t.type==='number'){
        const fm=t.answer.formats||['integer','fraction','decimal'],a=Q.parse(answer);
        // A decimal question: decimal allowed, and either fractions are excluded or the stem itself uses no fraction.
        const decimalAsked=fm.includes('decimal')&&(!fm.includes('fraction')||!/\d\s*\/\s*\d/.test(stem));
        if(decimalAsked&&a.d!==1n){const dt=r35Decimal(a);if(dt!==null){out.text=dt;out.changed=true;}}
        if(!out.unit&&decimalAsked&&R35_DISPLAY_UNIT[t.skill])out.unit=out.added=R35_DISPLAY_UNIT[t.skill];
      }
    }catch(_){out.text=answer;out.changed=false;out.unit=t.answer.unit||'';out.added='';}
    out.unitHint=out.unit||r35InferUnit(stem);
    return out;
  }
  // Explanation text: "答案是 {r3Answer}" must use the displayed form too.
  function r35FillParams(p,answer,d){
    if(!(d.changed||d.added)||!Object.hasOwn(p,'r3Answer')||p.r3Answer!==answer)return p;
    return {...p,r3Answer:d.text+(d.added?' '+d.added:'')};
  }
  function r35UnitOf(q){return q.unit||q.displayUnit||q.unitHint||r35InferUnit(q.stem_zh||'');}
  function r35UnitMatches(unit,token){
    const tok=String(token).normalize('NFKC').toLowerCase().replace(/\s+/g,'');
    const list=R35_UNITS[unit]||[unit];
    return list.some(x=>x.normalize('NFKC').toLowerCase()===tok);
  }
  // Returns {value} (text to grade, original when nothing needed cleaning) or {error:'unit'|'mixed',token}.
  function r35Prepare(q,raw){
    if(typeof raw!=='string')return {value:raw};
    let s=raw.normalize('NFKC').replace(/\s+/g,' ').trim(),touched=false;
    if(!s)return {value:raw};
    if(/\d\s*又\s*\d/.test(s)){s=s.replace(/(\d)\s*又\s*(?=\d)/g,'$1 ');touched=true;}
    const unit=r35UnitOf(q);
    let m=s.match(/^(hk\$|hkd|\$)\s*(.+)$/i);
    if(m){
      if(unit!=='元')return {error:'unit',token:m[1],unit};
      s=m[2];touched=true;
    }
    m=s.match(/^(.*?\d)\s*([A-Za-z㐀-鿿°$%][A-Za-z㐀-鿿°$%\/]*[23]?)$/);
    if(m){
      const token=m[2];
      if(/^又+$/.test(token))return {error:'mixed',token};
      if(!unit||!r35UnitMatches(unit,token))return {error:'unit',token,unit};
      s=m[1];touched=true;
    }
    return touched?{value:s}:{value:raw};
  }
  function r35Format(text){const s=numberText(text);return s.includes('/')?'fraction':s.includes('.')?'decimal':'integer';}
  function r35FormatMessage(formats,got){
    const has=x=>formats.includes(x);
    if(got==='fraction'&&!has('fraction'))return has('decimal')?'這題請用小數作答，例如 0.25。':'這題只填整數，例如 12。';
    if(got==='decimal'&&!has('decimal'))return has('fraction')?'這題請用分數作答，例如 1/2。':'這題只填整數，例如 12。';
    if(got==='integer'&&!has('integer'))return has('fraction')?'這題請用分數作答，例如 1/2。':'這題請用小數作答，例如 0.25。';
    return '請按題目要求的寫法作答。';
  }
  function diagnose(q,value){
    const p=q.params||{},same=v=>{try{return v!==undefined&&v!==null&&Q.parse(String(v)).cmp(value)===0;}catch(_){return false;}};
    if(/^O-CAL-pattern/.test(q.skill)){if(same(p.c))return 'PATTERN_LAST';if(same(p.step))return 'PATTERN_STEP';}
    if(q.track==='olympiad'&&(String(q.stem_zh||'').match(/\d+(?:\.\d+)?/g)||[]).some(same))return 'GIVEN_NUMBER';
    return 'RECHECK';
  }
  function mark(q,input){
    const a=typeof input==='object'&&input?input:{value:input};
    const pre=r35Prepare(q,a.value);
    if(pre.error==='mixed')return {valid:false,correct:false,credit:0,message:'帶分數請這樣寫：4又3/10。',code:'FORMAT'};
    if(pre.error==='unit')return {valid:false,correct:false,credit:0,message:pre.unit?`單位不對，這題的單位是${pre.unit}。只填數字，單位不用寫。`:'只填數字，單位不用寫。',code:'FORMAT'};
    const res=mark0(q,pre.value===a.value?input:{...a,value:pre.value});
    if(!res.valid&&res.code==='FORMAT'){
      const text=typeof pre.value==='string'?pre.value.trim():pre.value;
      let parsed=true;try{Q.parse(text);}catch(_){parsed=false;}
      if(parsed)res.message=r35FormatMessage(q.formats,r35Format(text));
      else if(text===''||text===undefined||text===null)res.message='請先填答案。';
      else if(String(text).length>60)res.message='答案太長了，只填數字就可以。';
      // zero denominator and a mixed number with an improper part keep their own messages
      else if(!/^[+-]?\d+\s*\/\s*0+$/.test(String(text))&&!/^[+-]?\d+\s+\d+\s*\/\s*\d+$/.test(String(text)))res.message='這裏只填數字，例如 12、0.5 或 1/2。';
    }
    return res;
  }
  function library(data){
    assert(data.version===1 && Array.isArray(data.skills) && Array.isArray(data.templates),'題庫的版本不對，這個版本讀不了。');
    const skills=new Map(),templates=new Map();
    for(const s of data.skills){assert(safeId(s.id)&&!skills.has(s.id),'題庫有重複的技能編號。');assert(['normal','olympiad'].includes(s.track),'題庫的路線設定不正確。');skills.set(s.id,s);}
    for(const s of data.skills)for(const pre of s.prerequisites)assert(skills.has(pre),'題庫要求的前置技能找不到。');
    const done=new Set(),stack=new Set();function visit(id){if(done.has(id))return;assert(!stack.has(id),'題庫的前置技能互相依賴，形成循環。');stack.add(id);skills.get(id).prerequisites.forEach(visit);stack.delete(id);done.add(id);}skills.forEach((_,id)=>visit(id));
    for(const t of data.templates){assert(safeId(t.id)&&!templates.has(t.id)&&skills.has(t.skill),'題目編號不正確。');int(t.difficulty,1,3);assert(['number','choice','fraction','word','remainder'].includes(t.type),'題型不正確。');templates.set(t.id,t);}
    for(const s of skills.values())assert([...templates.values()].some(t=>t.skill===s.id),'有技能沒有題目。');
    const archived=new Map((data.archiveTemplates||[]).map(t=>[t.id,t]));return {data,skills,templates,archived};
  }
  function generate(lib,templateId,seed){
    const t=templateOf(lib,templateId);assert(t,'找不到題目的範本。');const r=random(seed);let p={},valid=false;
    for(let trial=0;trial<500;trial++){
      p={};for(const [k,v]of Object.entries(t.params)){assert(safeId(k),'題目的數值名稱不正確。');if(v.int){const [a,b]=v.int;int(a,0,1000000);int(b,a,1000000);p[k]=a+Math.floor(r()*(b-a+1));}else if(v.pick){assert(v.pick.length && v.pick.length<=100,'題目的數值清單有誤。');p[k]=v.pick[Math.floor(r()*v.pick.length)];}else if(v.lookup){const i=Number(p[v.lookup.from]);assert(Number.isInteger(i)&&Array.isArray(v.lookup.values)&&i>=0&&i<v.lookup.values.length,'題目的數值對照不正確。');p[k]=clone(v.lookup.values[i]);}else if(v.decimal){const places=v.decimal.places;int(places,0,3);const x=evaluate(v.decimal.expr,p),scale=10**places,y=x.mul(scale);assert(y.d===1n,'小數不能四捨五入後，當作精確的答案。');const n=y.n.toString();p[k]=places?n.padStart(places+1,'0').slice(0,-places)+'.'+n.padStart(places+1,'0').slice(-places):n;}else p[k]=evaluate(v.expr,p).toString();}
      if((t.constraints||[]).every(c=>constraint(c,p))){valid=true;break;}
    }
    assert(valid,'題目的條件無法同時成立，不能出題。');const answer=evaluate(t.answer.expr,p).toString(),choices=[{value:answer,code:null}];
    for(const d of t.distractors||[]){if(d.when&&!d.when.every(c=>constraint(c,p)))continue;const v=evaluate(d.expr,p).toString();if(!choices.some(c=>Q.parse(c.value).cmp(v)===0))choices.push({value:v,code:d.code});}
    if(t.choiceLabels){for(const val of Object.keys(t.choiceLabels))if(!choices.some(c=>c.value===val))choices.push({value:val,code:'RECHECK'});for(const c of choices){assert(t.choiceLabels[c.value],'選項缺少文字');c.label=t.choiceLabels[c.value];}}
    if(t.type==='choice'&&choices.length<(t.choiceCount||4)){for(const off of [1,-1,2,-2]){const v=Q.parse(answer).add(off).toString();if(Q.parse(v).cmp(0)>=0&&!choices.some(c=>Q.parse(c.value).cmp(v)===0))choices.push({value:v,code:'RECHECK'});if(choices.length>=(t.choiceCount||4))break;}assert(choices.length>=2,'選項不足');}
    for(let i=choices.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[choices[i],choices[j]]=[choices[j],choices[i]];}
    const r35d=r35Display(t,p,answer);
    return {id:templateId+':'+seed,templateId,skill:t.skill,track:lib.skills.get(t.skill).track,seed,params:p,type:t.type,difficulty:t.difficulty,
      stem_zh:fill(t.stem_zh,p),stem_en:englishNumbers(fill(t.stem_en,p,'en')),speech_yue:speakMath(fill(t.speech_yue||t.stem_zh,p)),answer,unit:t.answer.unit||'',unit_en:t.answer.unit_en||'',formats:t.answer.formats||['integer','fraction','decimal'],simplest:!!t.answer.simplest,
      answerLabel:t.choiceLabels?.[answer]||null,answerSentence:t.answer.sentence||'',verification:t.verification||null,remainder:t.answer.remainder?evaluate(t.answer.remainder,p).toString():null,choices:choices.slice(0,t.choiceCount||4),hints:t.hints.map(h=>fill(h,p)),explanation:fill(t.explanation,r35FillParams(p,answer,r35d)),process:t.answer.process?substitute(parseExpr(t.answer.process),p):null,visual:t.visual||'',strategy:lib.skills.get(t.skill).strategy||null,displayAnswer:r35d.text,displayUnit:r35d.unit,unitHint:r35d.unitHint};
  }
  function mark0(q,input){
    const a=typeof input==='object'&&input?input:{value:input};let value;try{value=Q.parse(a.value);}catch(e){return {valid:false,correct:false,credit:0,message:e.message,code:'FORMAT'};}
    const raw=numberText(a.value),format=raw.includes('/')?'fraction':raw.includes('.')?'decimal':'integer';
    if(!q.formats.includes(format))return {valid:false,correct:false,credit:0,message:'請按題目要求的數字寫法作答。',code:'FORMAT'};
    const numerical=value.cmp(q.answer)===0;
    let simplified=true;
    if(numerical&&q.simplest){const m=raw.match(/^(?:[+-]?\d+\s+)?([+-]?\d+)\s*\/\s*(\d+)$/);simplified=format==='integer'||!!m&&gcd(BigInt(m[1]),BigInt(m[2]))===1n;}
    let credit=numerical?(simplified?1:0.5):0,code=numerical?(simplified?null:'SIMPLIFY'):(q.choices.find(c=>Q.parse(c.value).cmp(value)===0)?.code||diagnose(q,value)),parts=null;
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
    const correct=credit===1;return {valid:true,correct,credit,parts,code,message:correct?'答對了！':code==='SIMPLIFY'?'數值正確，再化成最簡分數。':code==='UNIT'?'數值正確，留意答案單位。':code==='PROCESS'?'數值正確；這個算式暫時未能自動核對。請保留你的解法，交給家長或老師查看。':code==='PATTERN_LAST'?'你答了最後一項，下一個數還要再加一次差。':code==='PATTERN_STEP'?'你找到每次加的數了，下一步要把它加到最後一項。':code==='GIVEN_NUMBER'?'你答了題目裏的數，要的是計算的結果。':'再看清楚題目，試試另一個方法。'};
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
    assert(v&&v.schema===1,'數學備份的版本不對，這個版本讀不了。');assert(JSON.stringify(v).length<=2500000,'數學資料太大，不能處理。');
    function scan(x,depth=0){assert(depth<25,'資料層次太多，備份檔不正確。');if(!x||typeof x!=='object')return;for(const k of Object.keys(x)){assert(!['__proto__','constructor','prototype'].includes(k),'資料裏有不安全的項目，已拒絕。');scan(x[k],depth+1);}}
    scan(v);const out=clone(v);
    const obj=x=>assert(x&&typeof x==='object'&&!Array.isArray(x),'備份檔的資料格式不正確。');
    const array=(x,max)=>assert(Array.isArray(x)&&x.length<=max,'備份檔的資料格式不正確。');
    const string=(x,max)=>assert(typeof x==='string'&&x.length<=max,'備份檔的資料格式不正確。');
    const finite=(x,min=0,max=253402214400000)=>assert(typeof x==='number'&&Number.isFinite(x)&&x>=min&&x<=max,'備份檔的資料格式不正確。');
    const bool=x=>assert(typeof x==='boolean','備份檔的資料格式不正確。');
    const validDay=d=>{if(typeof d!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(d))return false;const t=Date.parse(d+'T00:00:00Z');return Number.isFinite(t)&&new Date(t).toISOString().slice(0,10)===d;};
    const mode=x=>assert(['lesson','practice','daily','diagnostic','guided','challenge-demo'].includes(x),'作答方式不正確。');
    const trackSkill=(id,track)=>assert(lib.skills.get(id)?.track===track,'技能路線不正確。');
    const answer=x=>{if(typeof x==='string'){string(x,60);return;}if(typeof x==='number'){finite(x,-1e12,1e12);return;}obj(x);assert(Object.hasOwn(x,'value'),'答案缺少數字。');if(typeof x.value==='number')finite(x.value,-1e12,1e12);else string(x.value,60);for(const[k,max]of [['expression',240],['unit',20],['remainder',60]])if(x[k]!==undefined)string(x[k],max);};
    const code=x=>{if(x!==null&&x!==undefined){string(x,80);assert(/^[A-Za-z0-9_.:-]+$/.test(x),'錯誤類型的代碼不正確。');}};
    const templateRef=(r,skill=null,track=null)=>{obj(r);const t=templateOf(lib,r.template);assert(t,'找不到題目的範本。');if(skill!==null)assert(t.skill===skill,'題目範本和技能不相符。');if(track!==null)trackSkill(t.skill,track);int(r.seed,0,0xffffffff);return t;};
    obj(out);if(out.r3MigrationDigests!==undefined){array(out.r3MigrationDigests,300);assert(new Set(out.r3MigrationDigests).size===out.r3MigrationDigests.length,'重複的轉入紀錄。');for(const d of out.r3MigrationDigests)assert(typeof d==='string'&&/^[a-f0-9]{64}$/.test(d),'轉入紀錄的格式不正確。');}int(out.revision,0,1e9);int(out.serial,0,1e9);finite(out.created);
    array(out.attempts,5000);assert(new Set(out.attempts.map(a=>a.id)).size===out.attempts.length,'作答紀錄重複');
    for(const a of out.attempts){obj(a);assert(safeId(a.id),'作答編號不正確。');trackSkill(a.skill,a.track);const t=templateRef(a,a.skill,a.track);int(a.hint,0,5);int(a.time_ms,0,3600000);finite(a.at,1);bool(a.correct);bool(a.independent);finite(a.credit,0,1);mode(a.mode);int(a.difficulty,1,3);assert(a.difficulty===t.difficulty,'題目難度和範本不相符。');answer(a.answer);code(a.code);}
    obj(out.mastery);for(const track of ['normal','olympiad']){obj(out.mastery[track]);for(const[id,m]of Object.entries(out.mastery[track])){trackSkill(id,track);obj(m);finite(m.score,0,100);array(m.recent,5);finite(m.last);finite(m.achieved);assert(m.next===''||validDay(m.next),'重溫日期不正確。');assert(m.reviewBase===''||validDay(m.reviewBase),'重溫的計算基準不正確。');int(m.reviewIndex,0,1000000);for(const r of m.recent){obj(r);int(r.difficulty,1,3);int(r.hint,0,5);bool(r.correct);bool(r.independent);}}}
    const st=out.settings;obj(st);assert(['zh','en','bi'].includes(st.language)&&['yue-HK','zh-CN','en-GB'].includes(st.voice),'語言設定不正確。');int(st.limit,5,90);for(const b of ['sound','slow','olympiad','showScore'])bool(st[b]);string(st.schoolUnit,29);
    obj(out.wallet);int(out.wallet.balance,0,1000000);obj(out.wallet.days);
    for(const[d,w]of Object.entries(out.wallet.days)){assert(validDay(d),'金幣日期不正確。');obj(w);array(w.keys,128);w.keys.forEach(k=>string(k,200));assert(new Set(w.keys).size===w.keys.length,'金幣任務重複。');int(w.blocks,0,4);bool(w.bonus);}
    obj(out.usage);for(const[d,ms]of Object.entries(out.usage)){assert(validDay(d),'使用時間的日期不正確。');int(ms,0,86400000);}
    array(out.cards,30);assert(new Set(out.cards).size===out.cards.length,'策略卡重複');for(const card of out.cards)assert(lib.data.cards.some(c=>c.id===card),'找不到這張策略卡。');
    array(out.outbox,200);assert(new Set(out.outbox.map(e=>e.id)).size===out.outbox.length,'獎勵編號重複。');
    for(const e of out.outbox){obj(e);assert(safeId(e.id)&&typeof e.key==='string'&&e.key.length<=200&&validDay(e.day),'獎勵紀錄不正確。');finite(e.startedAt);finite(e.completedAt,e.startedAt);assert(hkDay(e.completedAt)===e.day&&e.id==='reward:'+e.day+':'+e.key,'獎勵的日期或任務對不上。');bool(e.settled);assert(e.valid===true,'任務未達獎勵條件');int(e.award,0,5);}
    obj(out.mistakes);for(const[key,m]of Object.entries(out.mistakes)){obj(m);trackSkill(m.skill,m.track);assert(key===m.track+':'+m.skill,'錯題的技能不正確。');array(m.due,3);assert(m.due.every(validDay)&&validDay(m.first),'錯題日期不正確。');int(m.successes,0,2);int(m.lastSeed,0,0xffffffff);bool(m.cleared);code(m.code);if(m.seenSignatures!==undefined){array(m.seenSignatures,3);m.seenSignatures.forEach(s=>string(s,1000));}}
    obj(out.lessons);for(const[id,l]of Object.entries(out.lessons)){assert(lib.skills.has(id),'學習中的技能不正確。');obj(l);finite(l.at);string(l.self,20);bool(l.completed);}
    if(out.lastGenerated){obj(out.lastGenerated);for(const[id,sig]of Object.entries(out.lastGenerated)){assert(lib.skills.has(id),'出題用的技能不正確。');string(sig,1000);}}
    array(out.sessions,300);for(const ss of out.sessions){obj(ss);assert(safeId(ss.id)&&['normal','olympiad'].includes(ss.track),'已完成的學習紀錄不正確。');assert(['lesson','practice','daily','diagnostic'].includes(ss.mode),'學習模式不正確。');if(ss.skill!==null)trackSkill(ss.skill,ss.track);finite(ss.at);int(ss.attempts,0,250);int(ss.correct,0,ss.attempts);}
    array(out.reports,100);for(const r of out.reports){templateRef(r);finite(r.at);if(r.skill!==undefined)assert(templateOf(lib,r.template).skill===r.skill,'題目報錯的技能對不上。');}
    if(out.current){const ss=out.current;obj(ss);assert(safeId(ss.id)&&['normal','olympiad'].includes(ss.track),'學習狀態不正確。');assert(['lesson','practice','daily','diagnostic'].includes(ss.mode),'學習模式不正確。');if(ss.skill!==null)trackSkill(ss.skill,ss.track);if(ss.mode==='lesson')assert(ss.skill!==null&&ss.example,'教學課缺少技能或示範題。');int(ss.stage,0,5);int(ss.index,0,250);int(ss.hint,0,5);finite(ss.startedAt);finite(ss.questionAt);finite(ss.activeMs??0);array(ss.results,250);array(ss.replacements,250);ss.replacements.forEach(x=>string(x,20));obj(ss.queues);assert([null,'numberline','money'].includes(ss.game),'操作遊戲不正確。');bool(ss.completed);
      for(const[stage,queue]of Object.entries(ss.queues)){assert(['0','3','4'].includes(stage),'學習步驟不正確。');array(queue,250);queue.forEach(r=>templateRef(r,ss.skill,ss.track));}
      const requiresQuestion=ss.mode==='lesson'?(ss.track==='normal'?[3,4].includes(ss.stage):[0,3].includes(ss.stage)):ss.stage===4;
      if(!ss.completed&&requiresQuestion)assert(Array.isArray(ss.queues[ss.stage])&&ss.queues[ss.stage].length>0,'這個學習步驟缺少題目，所以停止還原。原有資料沒有改動。');
      if(ss.example)templateRef(ss.example,ss.skill,ss.track);if(ss.queues[ss.stage])assert(ss.index<ss.queues[ss.stage].length||ss.completed,'學習中的題目位置不正確。');
      for(const[k,max]of [['draft',60],['draftExpression',240],['draftUnit',20],['draftRemainder',60],['picked',60]])if(ss[k]!==undefined)string(ss[k],max);
      for(const r of ss.results){obj(r);trackSkill(r.skill,ss.track);bool(r.correct);int(r.hint,0,5);finite(r.credit,0,1);mode(r.mode);int(r.time_ms,0,3600000);finite(r.at);}
      if(ss.feedback!==null&&ss.feedback!==undefined){const f=ss.feedback;obj(f);bool(f.valid);bool(f.correct);finite(f.credit,0,1);string(f.message,1000);code(f.code);if(f.answer!==undefined)answer(f.answer);if(f.parts){obj(f.parts);for(const[k,b]of Object.entries(f.parts)){assert(['value','expression','unit','quotient','remainder'].includes(k),'評分資料不正確。');bool(b);}}}
      if(ss.elapsedQuestionMs!==undefined)int(ss.elapsedQuestionMs,0,3600000);if(ss.questionPaused!==undefined)bool(ss.questionPaused);if(ss.toolState!==undefined){obj(ss.toolState);assert(JSON.stringify(ss.toolState).length<=10000,'教具的資料太大，不能儲存。');}
    }
    if(out.contentRevision===undefined){
      for(const a of out.attempts){if(!a.template.startsWith('v011:'))a.template='v011:'+a.template;assert(templateOf(lib,a.template),'找不到舊版題目。');}
      for(const r of out.reports){if(!r.template.startsWith('v011:'))r.template='v011:'+r.template;}
      out.current=null;out.lastGenerated={};
      for(const track of ['normal','olympiad'])for(const m of Object.values(out.mastery[track])){
        m.recent=[];m.achieved=0;m.next=hkDay();m.reviewBase='';m.reviewIndex=0;
      }
      out.upgradeNotice='題庫已更新。舊的作答、金幣和設定都保留。未完成的練習要重新開始。舊的評分不會改動，請做新題，確認掌握情況。';
      out.contentRevision=2;
    }
    assert(out.contentRevision===2,'題庫進度的版本不對，這個版本讀不了。請保留原有備份。');
    return out;
  }

  function mastery(state,skill){return state.mastery[skill.track][skill.id]||{score:30,recent:[],last:0,achieved:0,reviewBase:'',reviewIndex:0,next:''};}
  function isMastered(m){return m.score>=80 && m.recent.length===5 && m.recent.filter(x=>x.correct&&x.difficulty>=2&&x.hint<4&&x.independent).length>=4;}
  function readiness(m,now){return Math.max(0,m.score-Math.max(0,(now-m.last)/DAY-7)*0.7);}
  function accessible(state,skill,lib,grade){return skill.track==='olympiad'||skill.grade<=grade||skill.prerequisites.every(id=>isMastered(mastery(state,lib.skills.get(id))));}
  function record(state,lib,q,input,{id,at=Date.now(),hint=0,time_ms=0,independent=true,mode='practice'}={}){
    assert(safeId(id),'作答編號不正確。');int(hint,0,5);int(time_ms,0,3600000);const template=lib.templates.get(q.templateId);assert(template&&template.skill===q.skill&&template.difficulty===q.difficulty&&lib.skills.get(q.skill)?.track===q.track,'題目的路線、技能或難度對不上。');int(q.seed,0,0xffffffff);assert(generate(lib,q.templateId,q.seed).answer===q.answer,'題目答案和出題資料對不上。');
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
  function choose(lib,skill,difficulty,serial){const pool=[...lib.templates.values()].filter(t=>t.skill===skill&&t.difficulty===difficulty);assert(pool.length,'沒有合適的題目範本。');return pool[serial%pool.length].id;}
  function nextQuestion(state,lib,skill,difficulty=2,avoid=null){
    const signature=q=>q.stem_zh+'|'+q.answer;state.lastGenerated=state.lastGenerated||{};
    const latest=[...state.attempts].reverse().find(a=>a.skill===skill),old=latest?generate(lib,latest.template,latest.seed):null;
    const banned=new Set([state.lastGenerated[skill],avoid?signature(avoid):null,old?signature(old):null]);
    for(let i=0;i<100;i++){state.serial++;const seed=(Math.imul(state.serial,2654435761)+12345)>>>0,q=generate(lib,choose(lib,skill,difficulty,state.serial),seed);if(!banned.has(signature(q))){state.lastGenerated[skill]=signature(q);return q;}}
    throw Error('未能出到數字不同的新題。請改練另一個技能。');
  }
  function dueSkills(state,lib,day=hkDay(),track='normal'){
    return [...lib.skills.values()].filter(s=>s.track===track && ((mastery(state,s).next&&mastery(state,s).next<=day)||Object.values(state.mistakes).some(m=>m.skill===s.id&&!m.cleared&&m.due.some(d=>d<=day))));
  }
  function planDaily(state,lib,{grade=3,track='normal',day=hkDay()}={}){
    const all=[...lib.skills.values()].filter(s=>s.track===track&&(track!=='normal'||s.grade<=grade)&&accessible(state,s,lib,grade));assert(all.length,'沒有可用課程');
    const fresh=all.filter(s=>!isMastered(mastery(state,s)));const preferred=fresh.filter(s=>s.unit===state.settings.schoolUnit);
    const main=(preferred.length?preferred:fresh.length?fresh:all),review=dueSkills(state,lib,day,track);const ids=[];
    for(let i=0;i<10;i++)ids.push(i<7?main[i%main.length].id:(review.length?review[(i-7)%review.length]:main[i%main.length]).id);
    return ids;
  }
  function standaloneAward(state,event){
    assert(event.valid===true,'任務未達獎勵條件');const w=state.wallet,d=w.days[event.day]||(w.days[event.day]={keys:[],blocks:0,bonus:false});
    if(d.keys.includes(event.key))return 0;assert(d.keys.length<128,'今天的任務已達上限，明天再來。');d.keys.push(event.key);let n=0;if(d.blocks<4){d.blocks++;n=1;if(d.blocks===3&&!d.bonus){n++;d.bonus=true;}}n=Math.min(n,1000000-w.balance);w.balance+=n;return n;
  }
  function enqueueReward(state,{key,startedAt,completedAt=Date.now(),valid}){
    const day=hkDay(completedAt),id='reward:'+day+':'+key;assert(safeId(id),'任務編號不正確。');if(!valid||state.outbox.some(x=>x.id===id))return null;
    if(state.outbox.length>=200){const pending=state.outbox.filter(e=>!e.settled);assert(pending.length<200,'未處理的獎勵已滿。請先按「重試未處理的獎勵」，並匯出備份。');const settled=state.outbox.filter(e=>e.settled);const keep=Math.max(0,150-pending.length);state.outbox=[...(keep?settled.slice(-keep):[]),...pending];if(state.outbox.length>=200)state.outbox=pending;}
    const e={id,key,day,startedAt,completedAt,valid:true,settled:false,award:0};state.outbox.push(e);return e;
  }
  return Object.freeze({Q,numberText,processMatches,speakMath,toolModel,numberlineTicks,moveOnLine,sharingStep,parseExpr,evaluate,constraint,canonical,substitute,random,fill,library,generate,mark,blank,validateState,mastery,isMastered,readiness,accessible,record,nextQuestion,choose,dueSkills,planDaily,standaloneAward,enqueueReward,hkDay,plusDay,clone,assert,safeId,REVIEW,version:'0.1.2+r3'});
});
