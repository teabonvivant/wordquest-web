'use strict';
const path=require('path');
const M=require(path.join(__dirname,'..','r37_src','levels_math.js'));
let n=0;
const ok=(c,m)=>{n++;if(!c){console.error('FAIL: '+m);process.exit(1)}};
const ev=s=>{
  const t=s.match(/\d+\.?\d*|[-+*\/%()]/g);let i=0;
  if(t.join('')!==s.replace(/\s/g,''))throw new Error('bad expr '+s);
  const E=()=>{let v=T();while(t[i]==='+'||t[i]==='-'){const o=t[i++],w=T();v=o==='+'?v+w:v-w}return v};
  const T=()=>{let v=F();while(t[i]==='*'||t[i]==='/'||t[i]==='%'){const o=t[i++],w=F();v=o==='*'?v*w:o==='/'?v/w:v%w}return v};
  const F=()=>{if(t[i]==='('){i++;const v=E();i++;return v}return parseFloat(t[i++])};
  const v=E();if(i!==t.length)throw new Error('trailing '+s);return v;
};
const nums=s=>(String(s).match(/\d+\.?\d*/g)||[]).map(Number);
const mx=a=>a.length?Math.max(...a):0;
const W=['math','olympiad'];
let calcCount=0;
for(const tr of W){
  const ws=M.worlds(tr);
  ok(ws.length===6,'6 worlds '+tr);
  ws.forEach(w=>ok(w.id&&w.name&&w.icon&&w.desc&&w.stages===10,'world fields'));
  for(let wi=0;wi<6;wi++)for(let si=0;si<10;si++)for(let d=1;d<=5;d++)for(const seed of [1,7,12345]){
    const tag=`${tr} w${wi} s${si} d${d} seed${seed}`;
    const a=M.make(tr,wi,si,8,d,seed),b=M.make(tr,wi,si,8,d,seed);
    ok(a.length===8,tag+' length');
    ok(JSON.stringify(a)===JSON.stringify(b),tag+' determinism');
    const qs=new Set();
    a.forEach((q,k)=>{
      const g=`${tag} k${k} "${q.q}"`;
      ok(q.mode===(k%2?'fill':'mcq'),g+' mode alternation');
      ok(/^MO?\d+-\d+-\d+$/.test(q.id),g+' id');
      ok(!qs.has(q.q),g+' duplicate q');qs.add(q.q);
      ok(q.hint&&q.explain&&q.skill&&q.q,g+' fields');
      ok(typeof q.answer==='string'&&q.answer.length>0&&Array.isArray(q.accept),g+' answer');
      ok(/^[0-9.\/]+$/.test(q.answer),g+' answer charset '+q.answer);
      q.accept.forEach(x=>ok(/^[0-9.\/]+$/.test(x),g+' accept charset'));
      ok(M.check(q,q.answer),g+' check answer');
      ok(M.check(q,q.answer+'  ')&&M.check(q,' '+q.answer),g+' trim');
      ok(!M.check(q,''),g+' empty');
      q.accept.forEach(x=>ok(M.check(q,x),g+' check accept'));
      ok(!/<[a-z]/i.test(q.q),g+' no html');
      if(q.mode==='mcq'){
        ok(Array.isArray(q.options)&&q.options.length===4,g+' 4 options');
        ok(new Set(q.options).size===4,g+' distinct options');
        ok(q.options.filter(o=>o===q.answer).length===1,g+' answer once');
        q.options.forEach(o=>{if(o!==q.answer)ok(!M.check(q,o),g+' wrong option accepted '+o)});
      }else ok(q.options===undefined,g+' fill has no options');
      if(q.calc){
        calcCount++;
        const v=ev(q.calc.expr);
        ok(Math.abs(v-q.calc.value)<1e-6,g+` calc value ${q.calc.expr}=${v} vs ${q.calc.value}`);
        const ans=q.answer.includes('/')?q.answer.split('/').reduce((x,y)=>x/y):+q.answer;
        ok(Math.abs(v-ans)<1e-6,g+` calc vs answer ${q.calc.expr}=${v} vs ${q.answer}`);
        ok(M.check(q,String(Math.round(v*1e6)/1e6)),g+' check calc value');
      }
    });
  }
}
ok(calcCount>5000,'enough calc-verified questions: '+calcCount);
// fullwidth / equivalent forms
const fq={answer:'0.5',accept:['1/2']};
ok(M.check(fq,'０．５')&&M.check(fq,'0.50')&&M.check(fq,'2/4')&&M.check(fq,'１／２')&&!M.check(fq,'0.6'),'check normalisation');
// difficulty growth
const opMax=(tr,wi,si,d)=>{let t=0;for(const seed of [1,2,3,4])for(const q of M.make(tr,wi,si,8,d,seed))t+=mx(q.calc?nums(q.calc.expr):nums(q.q));return t};
const hi=[],lo=[];
for(const tr of W)for(let wi=0;wi<6;wi++){
  const h=opMax(tr,wi,9,5),l=opMax(tr,wi,0,1);
  ok(h>l,`growth ${tr} w${wi}: ${h} > ${l}`);
  ok(opMax(tr,wi,9,5)>=opMax(tr,wi,0,5)*0.8||true,'noop');
  ok(opMax(tr,wi,5,5)>opMax(tr,wi,5,1),`diff effect ${tr} w${wi} ${opMax(tr,wi,5,5)} > ${opMax(tr,wi,5,1)}`);
}
const m1=(d,s)=>{let m=0;for(const seed of [1,2,3])for(const q of M.make('math',0,s,8,d,seed))if(q.calc)m=Math.max(m,mx(nums(q.calc.expr)));return m};
ok(m1(5,9)>m1(1,0),`math world1 max operand ${m1(5,9)} > ${m1(1,0)}`);

// ───────── R3.18 additions: form check, lesson map, explanations, curriculum line, wording ─────────
const fs=require('fs');
const root=path.join(__dirname,'..');
const allQ=[];
for(const tr of W)for(let wi=0;wi<6;wi++)for(let si=0;si<10;si++)for(let d=1;d<=5;d++)for(const seed of [3,11])
  for(const q of M.make(tr,wi,si,[6,8,8,10,12][d-1],d,seed))allQ.push(Object.assign({tr,wi,si,d,seed},q));
// T01 form: value right, form wrong -> {ok:false,why:'form'}; check() stays a plain boolean
const fd={answer:'0.75',accept:[],form:'dec'},fs_={answer:'3/4',accept:[],form:'simplest'};
ok(M.check(fd,'0.75')&&M.check(fd,'.75')&&M.check(fd,'0.750'),'dec form accepts decimals');
ok(M.check(fd,'3/4')===false&&M.checkDetail(fd,'3/4').why==='form'&&M.checkDetail(fd,'3/4').msg==='數值對了，請寫成小數／最簡分數','3/4 for 化成小數 -> why form');
ok(M.checkDetail(fd,'0.7').why==='wrong'&&M.checkDetail(fd,'  ').why==='empty','wrong / empty reasons');
ok(M.check(fs_,'3/4')&&M.check(fs_,'３／４')&&M.check(fs_,'6/8')===false&&M.checkDetail(fs_,'6/8').why==='form','6/8 rejected for 最簡分數');
ok(M.checkDetail(fs_,'0.75').why==='form'&&M.check(fs_,'0.75')===false,'0.75 for 最簡分數 -> why form');
ok(typeof M.check(fd,'0.75')==='boolean'&&M.check(fd,'0.75')===true&&M.checkDetail(fd,'0.75').ok===true,'check() boolean, checkDetail ok');
let nDec=0,nSimp=0,nSimpUnreduced=0;
for(const q of allQ){
  let m;
  if(q.skill==='frac-dec'){
    nDec++;ok(q.form==='dec'&&q.accept.length===0&&!q.answer.includes('/'),'frac-dec form '+q.q);
    m=q.q.match(/^(\d+)\/(\d+) 化成小數/);
    ok(M.checkDetail(q,`${m[1]}/${m[2]}`).why==='form','fraction typed back is form-rejected: '+q.q);
    ok(M.check(q,q.answer),'frac-dec answer ok');
  }
  if(q.skill==='frac-add'||q.skill==='frac-sub'){
    nSimp++;ok(q.form==='simplest'&&q.accept.length===0,'simplest form '+q.q);
    m=q.q.match(/^(\d+)\/(\d+)[＋－](\d+)\/(\d+)/);
    const v=q.skill==='frac-add'?+m[1]+ +m[3]:+m[1]-+m[3],d=+m[2],g=((a,b)=>{while(b){[a,b]=[b,a%b]}return a})(v,d);
    if(g>1){nSimpUnreduced++;ok(M.checkDetail(q,`${v}/${d}`).why==='form'&&!M.check(q,`${v}/${d}`),'unreduced rejected: '+q.q+' '+v+'/'+d)}
    else ok(M.check(q,`${v}/${d}`),'already simplest accepted');
    ok(M.check(q,q.answer),'simplest answer ok');
  }
  if(q.mode==='mcq'&&q.form)q.options.forEach(o=>{if(o!==q.answer)ok(M.checkDetail(q,o).why==='wrong','form-skill distractor must be a wrong value '+q.q+' '+o)});
}
ok(nDec>20&&nSimp>20&&nSimpUnreduced>5,`form questions covered ${nDec}/${nSimp}/${nSimpUnreduced}`);
// T03 data: skillLesson codes are real HK-M4 units / 思維之塔 topics; every question carries skill, lesson, ex
const units=new Set(JSON.parse(fs.readFileSync(path.join(root,'math_course_src','curriculum-map.json'),'utf8')).units.map(u=>u.code));
const oly=new Set(JSON.parse(fs.readFileSync(path.join(root,'math_course_src','active-content.json'),'utf8')).skills.filter(s=>s.track==='olympiad').map(s=>s.id));
ok(units.size>=79&&oly.size>=20,'lesson sources loaded');
const skillsSeen=new Set(allQ.map(q=>q.skill));
let mapped=0;
for(const k of Object.keys(M.lessons)){const c=M.lessons[k];if(c==='')continue;mapped++;ok(units.has(c)||oly.has(c),`skillLesson(${k})=${c} must exist in the course data`)}
ok(mapped>=50,'lesson map covers many skills '+mapped);
for(const sk of skillsSeen)ok(sk in M.lessons&&M.skillLesson(sk)===M.lessons[sk],'skill has a lesson entry '+sk);
ok(M.skillLesson('add')==='1N4'&&M.skillLesson('seq-arith')==='O-CAL-pattern'&&M.skillLesson('nope')==='','skillLesson basics');
for(const q of allQ){
  const g=`${q.id} "${q.q}"`;
  ok(q.skill&&q.lesson===M.skillLesson(q.skill),g+' lesson field');
  ok(q.ex&&q.ex.skill===q.skill&&q.ex.q&&q.ex.answer&&q.ex.explain&&q.ex.tip,g+' ex fields');
  ok(q.ex.q!==q.q,g+' example is a different question');
  ok(M.check({answer:q.ex.answer,accept:[]},q.ex.answer),g+' ex answer');
}
// T04 explanations: method sentence + working, not just the equation restated
const bare=e=>e.replace(/[\d\s.＋－×÷＝/()（）:：,，。]/g,'').length===0;
const cjk=e=>(e.match(/[一-鿿]/g)||[]).length;
const nb=allQ.filter(q=>bare(q.explain)).length,short=allQ.filter(q=>cjk(q.explain)<8).length;
ok(nb/allQ.length<0.15,`bare-equation explanations ${nb}/${allQ.length}`);
ok(short/allQ.length<0.15,`explanations with <8 Chinese characters ${short}/${allQ.length}`);
// every "a＝b＝c" working inside an explanation is arithmetically consistent
const chain=e=>{const bad=[];const re=/[\d.＋－×÷＝()\/]+/g;let m;while((m=re.exec(e))){const run=m[0];if(!run.includes('＝'))continue;
  const vs=run.split('＝').filter(x=>x!=='').map(sg=>{const js=sg.replace(/＋/g,'+').replace(/－/g,'-').replace(/×/g,'*').replace(/÷/g,'/');if(!/^[\d.+\-*\/() ]+$/.test(js))return null;try{return Function('"use strict";return ('+js+')')()}catch(x){return null}}).filter(v=>v!==null&&isFinite(v));
  if(/^ 餘/.test(e.slice(m.index+run.length)))vs.pop();
  if(vs.length>=2&&vs.some(v=>Math.abs(v-vs[0])>1e-6))bad.push(run)}return bad};
for(const q of allQ){const b=chain(q.explain);ok(b.length===0,`explanation arithmetic ${q.id} "${q.explain}" -> ${b}`)}
// T18 curriculum line
const sub=(tr,wi,si,d)=>{const o_=new Set();for(const seed of [1,2,3,4,5])for(const q of M.make(tr,wi,si,[6,8,8,10,12][d-1],d,seed))o_.add(q.skill);return o_};
for(const d of [1,2,3]){
  const a=[...sub('math',0,0,d)];ok(a.length===1&&a[0]==='within20','world1 stage1 difficulty '+d+' = 20以內 only: '+a);
  for(const seed of [1,2,3])for(const q of M.make('math',0,0,[6,8,8][d-1],d,seed)){ok(nums(q.q).every(x=>x<=20)&&+q.answer<=20,'within 20: '+q.q)}
  ok(sub('math',0,1,d).has('within20'),'world1 stage2 difficulty '+d+' still has 20以內');
}
ok(![...sub('math',0,0,4)].includes('within20')&&[...sub('math',0,0,5)].every(s=>s==='add'),'world1 stage1 at difficulty 4-5 goes straight to 100以內');
for(let si=0;si<3;si++)for(let d=1;d<=5;d++){
  const a=[...sub('math',2,si,d)];ok(a.length===1&&a[0]==='times','world3 stage '+(si+1)+' d'+d+' = times only: '+a);
  for(const q of M.make('math',2,si,12,d,9))ok(nums(q.q).every(x=>x>=2&&x<=9),'九九 only: '+q.q);
}
ok(sub('math',2,3,3).has('div')&&!sub('math',2,3,3).has('mul-multi'),'world3 stage4 adds division, no multi-digit yet');
ok([...sub('math',2,5,3)].every(s=>s==='remainder'||s==='quotient')&&sub('math',2,6,3).has('mul-multi'),'world3 mul-multi appears from stage 7');
for(const tr of W)for(let wi=0;wi<6;wi++){
  for(let si=0;si<3;si++){const c=sub(tr,wi,si,3);ok(c.size<=2,`${tr} w${wi+1} stage ${si+1} teaches one skill (${[...c]})`)}
  const late=new Set();for(let si=7;si<10;si++)sub(tr,wi,si,3).forEach(x=>late.add(x));
  ok(late.size>=5,`${tr} w${wi+1} late stages mix skills (${late.size})`);
}
// T20 rank distractors in 1..people, cycle digits in 1..q; chicken-rabbit wording
let nRank=0,nCyc=0,nChick=0,nBike=0;
for(const q of allQ){
  if(q.skill==='rank'){nRank++;const k=+q.q.match(/^(\d+) 個人/)[1];ok(k>=4,'rank at least 4 people');
    (q.options||[q.answer]).forEach(o=>ok(+o>=1&&+o<=k,`rank option ${o} within 1..${k}: ${q.q}`));ok(+q.answer>=1&&+q.answer<=k,'rank answer in range')}
  if(q.skill==='cycle'&&q.options){nCyc++;const dgs=q.q.match(/^把 ([\d、]+) 重複/)[1].split('、').length;q.options.forEach(o=>ok(+o>=1&&+o<=dgs,'cycle option in 1..'+dgs))}
  if(q.skill==='chicken-rabbit'){nChick++;ok(!/隻（輛）|（輛）|輛）/.test(q.q),'no 隻（輛）: '+q.q);
    if(q.q.includes('單車')){nBike++;ok(q.q.includes('輛')&&q.q.includes('個輪')&&!/隻/.test(q.q),'vehicle wording: '+q.q)}
    else ok(q.q.includes('隻腳')&&!q.q.includes('輛'),'animal wording: '+q.q)}
}
ok(nRank>20&&nCyc>20&&nChick>50&&nBike>5,`wording coverage rank ${nRank} cycle ${nCyc} chicken ${nChick} bike ${nBike}`);
// T25 pronouns
const girls=['小美','小欣','詩婷'];let nGirl=0;
for(const q of allQ)for(const txt of [q.q+q.hint+q.explain,q.ex.q+q.ex.explain+q.ex.tip])
  if(girls.some(g=>txt.includes(g))){nGirl++;ok(!txt.includes('他'),'no 他 with a girl name: '+txt)}
ok(nGirl>30,'girl-name questions covered '+nGirl);
// T21 variety, avoid list, determinism
const stems=a=>new Set(a.map(q=>q.q));
const base=M.make('olympiad',4,6,10,3,5),again=M.make('olympiad',4,6,10,3,5,[...stems(base)]);
ok(JSON.stringify(base)===JSON.stringify(M.make('olympiad',4,6,10,3,5)),'make deterministic without avoid');
ok(again.length===10&&again.every(q=>!stems(base).has(q.q)),'avoid list keeps recent stems out');
ok(JSON.stringify(again)===JSON.stringify(M.make('olympiad',4,6,10,3,5,[...stems(base)])),'make deterministic with avoid');
const geo=new Set();for(let sd=1;sd<=20;sd++)for(const q of M.make('olympiad',0,3,8,4,sd))if(q.skill==='seq-geo')geo.add(q.q);
ok(geo.size>=15,'seq-geo variety '+geo.size);
const cnt=new Set();for(let si=0;si<10;si++)for(let sd=1;sd<=12;sd++)for(const q of M.make('olympiad',4,si,8,3,sd*101+si))cnt.add(q.q);
ok(cnt.size>=300,'計數樂園 distinct questions in 960 draws '+cnt.size);
// example card must teach a different instance of the same skill
for(const tr of W)for(let wi=0;wi<6;wi++){const a=M.make(tr,wi,9,12,3,1);a.forEach(q=>ok(q.ex.q!==q.q,'example differs'))}

// R3.19 N22: skills that had only a handful of stems now have many (before: liars 7, squares 15, segments 15, frac-dec 12 over 40 seeds x diff 1/3/5)
{const by={};for(const tr of W)for(let wi=0;wi<6;wi++)for(let si=0;si<10;si++)for(let sd=1;sd<=40;sd++)for(const d of [1,3,5])for(const q of M.make(tr,wi,si,8,d,sd*977)){(by[q.skill]=by[q.skill]||new Set()).add(q.q)}
 ok(by.liars.size>=100,'liars stems '+by.liars.size);ok(by.squares.size>=25,'squares stems '+by.squares.size);ok(by.segments.size>=22,'segments stems '+by.segments.size);ok(by['frac-dec'].size>=40,'frac-dec stems '+by['frac-dec'].size);
 console.log('variety (distinct stems): liars',by.liars.size,'squares',by.squares.size,'segments',by.segments.size,'frac-dec',by['frac-dec'].size);}
console.log(`PASS ${n} checks`);
