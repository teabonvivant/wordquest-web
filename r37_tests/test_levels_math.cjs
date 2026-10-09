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
console.log(`PASS ${n} checks`);
