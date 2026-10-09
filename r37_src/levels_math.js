// WQ37Math: pure deterministic question generator for level mode (math + olympiad). No DOM, no Math.random.
(function(){
'use strict';
const mb=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const hs=(...xs)=>{let h=2166136261;for(const x of xs){for(const c of String(x))h=Math.imul(h^c.charCodeAt(0),16777619);h=Math.imul(h^35,16777619)}return h>>>0};
const ri=(r,a,b)=>a+Math.floor(r()*(b-a+1));
const pk=(r,a)=>a[Math.floor(r()*a.length)];
const sh=(r,a)=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const N=(r,p,lo,hi)=>{if(hi<=lo)return lo;const sp=hi-lo,t=Math.min(hi,lo+Math.max(2,Math.round(sp*p.s))),b=Math.min(t,lo+Math.round(sp*p.s*.5));return ri(r,b,t)};
const gcd=(a,b)=>b?gcd(b,a%b):a;
const fx=x=>String(Math.round(x*1e6)/1e6);
const fr=(a,b)=>{const g=gcd(a,b);a/=g;b/=g;return b===1?String(a):a+'/'+b};
const NM=['小明','小美','阿強','小欣','家豪','詩婷'],IT=[['糖果','粒'],['貼紙','張'],['彈珠','粒'],['書籤','張'],['卡片','張']];
const nm=r=>pk(r,NM);
const o=(sk,q,a,h,e,w,calc,acc)=>({sk,q,a:String(a),h,e,w:w||[],calc,acc:acc||[]});
const spread=(r,k,m,d)=>{for(let t=0;t<60;t++){const v=[];let s=0;for(let i=0;i<k-1;i++){const x=m+ri(r,-d,d);v.push(x);s+=x}const l=k*m-s;if(l>=1&&l<=Math.max(100,m+d*2))return v.concat(l)}const v=Array(k).fill(m);v[0]=m+1;v[1]=m-1;return v};
const CN=['','一','二','三','四','五','六','七','八','九'];
const mul=n=>{const a=[];for(let i=n;i>1;i--)a.push(i);a.push(1);return a.join('*')};

const MATH=[
[ // P1-2: add/sub within 20 and 100
(r,p)=>{const a=N(r,p,2,70),b=N(r,p,1,99-a),s=a+b;return o('add',`${a}＋${b}＝？`,s,'先加整十，再加個位。',`${a}＋${b}＝${s}。`,[s+10,s-10,s+1,s-1,Math.abs(a-b)],`${a}+${b}`)},
(r,p)=>{const a=N(r,p,4,99),b=N(r,p,1,a-1),s=a-b;return o('sub',`${a}－${b}＝？`,s,'由大數減去小數，留意個位夠不夠減。',`${a}－${b}＝${s}。`,[s+10,s-10,s+1,s-1,a+b],`${a}-${b}`)},
(r,p)=>{const a=N(r,p,1,60),b=N(r,p,2,99-a),c=a+b;return o('missing',`☐＋${b}＝${c}，☐ 是多少？`,a,'想想：總數減去已知的一份。',`☐＝${c}－${b}＝${a}。`,[c+b,b,a+1,a-1],`${c}-${b}`)},
(r,p)=>{const [i,u]=pk(r,IT),m=nm(r),a=N(r,p,5,80);if(r()<.5){const b=N(r,p,1,99-a);return o('story',`${m}有 ${a} ${u}${i}，媽媽再給他 ${b} ${u}，現在一共有多少${u}？`,a+b,'「再給」即是加多一些。',`${a}＋${b}＝${a+b}。`,[a-b>0?a-b:a+b+1,a+b+1,a+b-1,a+b+10],`${a}+${b}`)}const b=N(r,p,1,a-1);return o('story',`${m}有 ${a} ${u}${i}，送了 ${b} ${u}給同學，還剩下多少${u}？`,a-b,'「送出」即是減去。',`${a}－${b}＝${a-b}。`,[a+b,a-b+1,a-b-1,a-b+10],`${a}-${b}`)},
(r,p)=>{const a=N(r,p,3,50),b=N(r,p,2,99-a),c=N(r,p,1,a+b-1),s=a+b-c;return o('add-sub',`${a}＋${b}－${c}＝？`,s,'由左至右，先加後減。',`${a}＋${b}＝${a+b}，${a+b}－${c}＝${s}。`,[a+b+c,a+b,s+1,s-1,Math.abs(a-b)-c>0?Math.abs(a-b)-c:s+10],`${a}+${b}-${c}`)},
(r,p)=>{const k=N(r,p,2,10),m=N(r,p,2,10),f=pk(r,[['🍎','🍌','水果'],['⭐','🌙','圖案'],['🐱','🐶','動物']]),s=k+m;return o('count',`數一數：${f[0].repeat(k)} 和 ${f[1].repeat(m)}，一共有多少個${f[2]}？`,s,'分別數兩行，再加起來。',`${k}＋${m}＝${s}。`,[s+1,s-1,Math.abs(k-m),s+2],`${k}+${m}`)}
],
[ // P2: two-digit add/sub, intro multiplication
(r,p)=>{const a=N(r,p,10,90),b=N(r,p,10,99),s=a+b;return o('add2',`${a}＋${b}＝？`,s,'先加十位，再加個位，留意進位。',`${a}＋${b}＝${s}。`,[s+10,s-10,s+1,s-1,s+100],`${a}+${b}`)},
(r,p)=>{const a=N(r,p,20,99),b=N(r,p,10,a-1),s=a-b;return o('sub2',`${a}－${b}＝？`,s,'個位不夠減時要退位。',`${a}－${b}＝${s}。`,[s+10,s-10,s+1,s-1,a+b],`${a}-${b}`)},
(r,p)=>{const x=pk(r,[2,5,10,3,4].slice(0,2+Math.round(3*p.s))),y=N(r,p,2,10),s=x*y;return o('times',`${x}×${y}＝？`,s,`想想 ${x} 個 ${x} 個地數。`,`${x}×${y}＝${s}。`,[x+y,s+x,s-x,x*(y+1)],`${x}*${y}`)},
(r,p)=>{const a=pk(r,[2,5,10,3,4].slice(0,2+Math.round(3*p.s))),b=N(r,p,2,9),it=pk(r,[['枝','筆'],['粒','糖'],['個','橡皮擦'],['本','簿']]),s=a*b;return o('times-story',`每盒有 ${a} ${it[0]}${it[1]}，${b} 盒共有多少${it[0]}${it[1]}？`,s,'每盒數量 × 盒數。',`${a}×${b}＝${s}。`,[a+b,s+a,s-a,s+b],`${a}*${b}`)},
(r,p)=>{const a=N(r,p,2,25),k=N(r,p,3,7),s=a*k;return o('repeat-add',`${Array(k).fill(a).join('＋')}＝？`,s,`一共加了 ${k} 次，可以用乘法。`,`${a}×${k}＝${s}。`,[s+a,s-a,a+k,s+10],Array(k).fill(a).join('+'))},
(r,p)=>{const a=N(r,p,10,60),b=N(r,p,10,99-a),c=N(r,p,5,a+b-1),s=a+b-c;return o('add-sub2',`${a}＋${b}－${c}＝？`,s,'先算前兩個數，再減。',`${a}＋${b}＝${a+b}，再減 ${c} 得 ${s}。`,[a+b+c,a+b,s+10,s-10,s+1],`${a}+${b}-${c}`)},
(r,p)=>{const a=N(r,p,10,95),s=100-a;return o('to100',`${a}＋☐＝100，☐ 是多少？`,s,'想想：先補到下一個整十，再補到 100。',`100－${a}＝${s}。`,[s+10,s-10,s+1,s-1],`100-${a}`)}
],
[ // P3: times tables, division, multi-digit
(r,p)=>{const a=N(r,p,2,12),b=N(r,p,2,9),s=a*b;return o('times',`${a}×${b}＝？`,s,'用九九乘法表。',`${a}×${b}＝${s}。`,[s+a,s-a,s+b,s-b,a+b],`${a}*${b}`)},
(r,p)=>{const b=N(r,p,2,9),q=N(r,p,2,12),s=b*q;return o('div',`${s}÷${b}＝？`,q,`想想 ${b} 乘幾等於 ${s}。`,`${b}×${q}＝${s}，所以 ${s}÷${b}＝${q}。`,[q+1,q-1,s-b,b],`${s}/${b}`)},
(r,p)=>{const a=N(r,p,12,999),b=N(r,p,2,9),s=a*b;return o('mul-multi',`${a}×${b}＝？`,s,'把多位數拆開，逐位乘，再相加。',`${a}×${b}＝${s}。`,[s+b*10,s-b*10,s+100,s-100,a+b],`${a}*${b}`)},
(r,p)=>{const a=N(r,p,120,9000);if(r()<.5){const b=N(r,p,100,9000-1),s=a+b;return o('add-multi',`${a}＋${b}＝？`,s,'從個位開始逐位加，留意進位。',`${a}＋${b}＝${s}。`,[s+100,s-100,s+10,s-10,s+1000],`${a}+${b}`)}const b=N(r,p,100,a-1),s=a-b;return o('sub-multi',`${a}－${b}＝？`,s,'從個位開始逐位減，留意退位。',`${a}－${b}＝${s}。`,[s+100,s-100,s+10,s-10,a+b],`${a}-${b}`)},
(r,p)=>{const b=N(r,p,2,9),q=N(r,p,2,12),m=ri(r,1,b-1),a=b*q+m;if(r()<.5)return o('remainder',`${a}÷${b} 的餘數是多少？`,m,'先找最接近而不超過的倍數。',`${a}＝${b}×${q}＋${m}，餘數是 ${m}。`,[q,m+1,b-m,m-1>0?m-1:m+2],`${a}%${b}`);return o('quotient',`${a}÷${b} 的商（不計餘數）是多少？`,q,'找出最大的倍數而不超過被除數。',`${a}＝${b}×${q}＋${m}，商是 ${q}。`,[q+1,q-1,m,q+2],`(${a}-${m})/${b}`)},
(r,p)=>{const a=N(r,p,3,25),b=N(r,p,2,9),c=N(r,p,1,a*b-1),m=nm(r),s=a*b-c;return o('story2',`${m}買了 ${b} 包糖，每包有 ${a} 粒，然後送出 ${c} 粒，還剩下多少粒？`,s,'先求一共有多少粒。',`${a}×${b}＝${a*b}，${a*b}－${c}＝${s}。`,[a*b+c,a*b,s+1,s-1,a+b-c>0?a+b-c:s+2],`${a}*${b}-${c}`)},
(r,p)=>{const b=N(r,p,2,9),q=N(r,p,3,30),t=b*q,m=nm(r);return o('share',`${m}有 ${t} 張貼紙，平均分給 ${b} 個人，每人分到多少張？`,q,'平均分用除法。',`${t}÷${b}＝${q}。`,[q+1,q-1,t-b,b],`${t}/${b}`)}
],
[ // P4: fractions and decimals intro
(r,p)=>{const d=N(r,p,3,12),a=ri(r,1,d-2),b=ri(r,1,d-1-a);return o('frac-add',`${a}/${d}＋${b}/${d}＝？（答案寫成最簡分數，例如 3/4）`,fr(a+b,d),'分母相同，只加分子。',`(${a}＋${b})/${d}＝${a+b}/${d}，化簡得 ${fr(a+b,d)}。`,[`${a+b}/${2*d}`,`${a*b}/${d}`,`${a+b+1}/${d}`,`${a+b}/${d+1}`],null,[`${a+b}/${d}`])},
(r,p)=>{const d=N(r,p,3,12),a=ri(r,2,d-1),b=ri(r,1,a-1);return o('frac-sub',`${a}/${d}－${b}/${d}＝？（答案寫成最簡分數，例如 3/4）`,fr(a-b,d),'分母相同，只減分子。',`(${a}－${b})/${d}＝${a-b}/${d}，化簡得 ${fr(a-b,d)}。`,[`${a-b}/${d*2}`,`${a-b}/${d-1<2?d+1:d-1}`,`${a+b}/${d}`,`${a-b+1}/${d}`],null,[`${a-b}/${d}`])},
(r,p)=>{const d=pk(r,[2,3,4,5,6,8,10].slice(0,3+Math.round(4*p.s))),k=N(r,p,2,12),t=d*k,n=ri(r,1,d-1),s=n*k;return o('frac-of',`${t} 個蘋果的 ${n}/${d} 是多少個？`,s,`先求 1/${d} 是多少。`,`${t}÷${d}＝${k}，${k}×${n}＝${s}。`,[k,t-s,s+k,s-k>0?s-k:s+1],`${t}/${d}*${n}`)},
(r,p)=>{const u=p.s>.6?100:10,dg=u===10?1:2,hi=u===10?60:600,A=N(r,p,1,hi),B=N(r,p,1,hi),f=x=>(x/u).toFixed(dg),s=fx((A+B)/u);return o('dec-add',`${f(A)}＋${f(B)}＝？`,s,'小數點要對齊，再逐位相加。',`${f(A)}＋${f(B)}＝${s}。`,[(A+B)/u+1,(A+B)/u-.1*(u===10?1:.1),(A+B)/(u*10),A+B],`${fx(A/u)}+${fx(B/u)}`,[f(A+B)])},
(r,p)=>{const u=p.s>.6?100:10,dg=u===10?1:2,hi=u===10?99:900,A=N(r,p,5,hi),B=N(r,p,1,A-1),f=x=>(x/u).toFixed(dg),s=fx((A-B)/u);return o('dec-sub',`${f(A)}－${f(B)}＝？`,s,'小數點要對齊，留意退位。',`${f(A)}－${f(B)}＝${s}。`,[(A-B)/u+1,(A-B)/u+(u===10?.1:.01),(A-B)/(u*10),A-B],`${fx(A/u)}-${fx(B/u)}`,[f(A-B)])},
(r,p)=>{const L=[[1,2],[1,4],[3,4],[1,5],[2,5],[3,5],[4,5],[1,8],[3,8],[1,20],[7,20],[9,20]],l=L.slice(0,3+Math.round(p.s*(L.length-3))),[a,b]=pk(r,l);return o('frac-dec',`${a}/${b} 化成小數是多少？`,fx(a/b),`試試把分母變成 10 或 100，或做 ${a}÷${b}。`,`${a}÷${b}＝${fx(a/b)}。`,[a/b*10,a/b/10,b/a<1?b/a:a/b+.1,a/b+.1],null,[`${a}/${b}`])},
(r,p)=>{const b=N(r,p,2,9),a=ri(r,1,b-1),k=N(r,p,2,6);return o('frac-eq',`${a}/${b}＝☐/${b*k}，☐ 是多少？`,a*k,'分母乘幾倍，分子也乘幾倍。',`${b}×${k}＝${b*k}，所以分子 ${a}×${k}＝${a*k}。`,[a+k,a,a*k+1,a*k-1],`${a}*${k}`)}
],
[ // P5: decimals, percent, average
(r,p)=>{const A=N(r,p,12,99),c=N(r,p,2,9),s=fx(A*c/10);return o('dec-mul',`${(A/10).toFixed(1)}×${c}＝？`,s,'先當作整數乘，再放回小數點。',`${A}×${c}＝${A*c}，放回小數點得 ${s}。`,[A*c/100,A*c,A*c/10+1,A*c/10-1],`${A/10}*${c}`,[(A*c/10).toFixed(1)])},
(r,p)=>{const Q=N(r,p,2,60),c=N(r,p,2,9),A=Q*c,s=fx(Q/10);return o('dec-div',`${(A/10).toFixed(1)}÷${c}＝？`,s,'先當作整數除，再放回小數點。',`${A}÷${c}＝${Q}，放回小數點得 ${s}。`,[Q/100,Q,Q/10+1,Q/10+.1],`${A/10}/${c}`,[(Q/10).toFixed(1)])},
(r,p)=>{const pc=pk(r,[10,50,20,25,5,30,40,75,60,15].slice(0,4+Math.round(6*p.s))),m=100/gcd(pc,100),N0=m*ri(r,1,2+Math.round(p.s*9)),s=N0*pc/100;return o('percent-of',`${N0} 的 ${pc}% 是多少？`,s,`${pc}% 即是 ${pc}/100。`,`${N0}×${pc}÷100＝${s}。`,[N0*pc,N0-s,N0+s,s*10],`${N0}*${pc}/100`)},
(r,p)=>{const b=pk(r,[2,4,5,10,20,25,50].slice(0,3+Math.round(4*p.s))),a=ri(r,1,b-1),s=a*100/b;return o('frac-pct',`${a}/${b} 等於百分之幾？（答案只寫數字，單位：%）`,s,'把分母化成 100。',`${a}/${b}＝${s}/100＝${s}%。`,[a*b,s/10,100-s,s+10],`${a}*100/${b}`)},
(r,p)=>{const k=ri(r,3,3+Math.round(3*p.s)),m=N(r,p,5,90),v=spread(r,k,m,Math.min(m-1,2+Math.round(10*p.s)));return o('mean',`某同學 ${k} 次測驗的分數是：${v.join('、')}。平均分是多少？`,m,'平均數＝總和 ÷ 項數。',`總和 ${k*m}，${k*m}÷${k}＝${m}。`,[k*m,m+1,m-1,Math.max(...v)],`(${v.join('+')})/${k}`)},
(r,p)=>{const P=10*N(r,p,3,60),z=pk(r,[9,8,5,7,6].slice(0,2+Math.round(3*p.s))),s=P*z/10;return o('discount',`原價 $${P} 的貨品打${CN[z]}折出售，售價是多少元？（答案只寫數字）`,s,`${CN[z]}折即是原價的 ${z}/10。`,`${P}×${z}÷10＝${s}。`,[P*(10-z)/10,P-z,P*z/100,s+10],`${P}*${z}/10`)},
(r,p)=>{const k=ri(r,3,3+Math.round(2*p.s)),m=N(r,p,40,90),v=spread(r,k,m,Math.min(15,2+Math.round(10*p.s))),f=v.slice(0,k-1),l=v[k-1],nn=nm(r);return o('mean-missing',`${nn}前 ${k-1} 次測驗的分數是 ${f.join('、')}。若 ${k} 次測驗的平均分是 ${m}，第 ${k} 次要考多少分？`,l,'先求出總分應該是多少。',`總分 ${m}×${k}＝${m*k}，${m*k}－${f.reduce((a,b)=>a+b,0)}＝${l}。`,[m,l+1,l-1,m*k],`${m}*${k}-(${f.join('+')})`)}
],
[ // P6: perimeter, area, speed, ratio
(r,p)=>{if(r()<.3){const a=N(r,p,3,40);return o('perim',`正方形的邊長是 ${a} 厘米，周界是多少厘米？（答案只寫數字）`,4*a,'正方形有四條相等的邊。',`${a}×4＝${4*a}。`,[a*a,2*a,a*3,4*a+4],`4*${a}`)}const l=N(r,p,3,40),w=N(r,p,2,l-1);return o('perim',`長方形的長是 ${l} 厘米，闊是 ${w} 厘米，周界是多少厘米？（答案只寫數字）`,2*(l+w),'周界是四條邊的總長。',`2×(${l}＋${w})＝${2*(l+w)}。`,[l*w,l+w,2*l+w,l*2+w*2+2],`2*(${l}+${w})`)},
(r,p)=>{if(r()<.3){const a=N(r,p,3,25);return o('area',`正方形的邊長是 ${a} 厘米，面積是多少平方厘米？（答案只寫數字）`,a*a,'面積＝邊長×邊長。',`${a}×${a}＝${a*a}。`,[4*a,2*a,a*a+a,a*a-a],`${a}*${a}`)}const l=N(r,p,3,40),w=N(r,p,2,l-1);return o('area',`長方形的長是 ${l} 厘米，闊是 ${w} 厘米，面積是多少平方厘米？（答案只寫數字）`,l*w,'面積＝長×闊。',`${l}×${w}＝${l*w}。`,[2*(l+w),l+w,l*w+l,l*w-w],`${l}*${w}`)},
(r,p)=>{const b=N(r,p,3,30);let h=N(r,p,2,24);if(b*h%2)h++;const s=b*h/2;return o('tri-area',`三角形的底是 ${b} 厘米，高是 ${h} 厘米，面積是多少平方厘米？（答案只寫數字）`,s,'三角形面積＝底×高÷2。',`${b}×${h}÷2＝${s}。`,[b*h,b+h,s+b,s-h>0?s-h:s+2],`${b}*${h}/2`)},
(r,p)=>{const v=N(r,p,20,90),t=N(r,p,2,8),d=v*t,k=ri(r,0,2);if(k===0)return o('speed',`一輛巴士以每小時 ${v} 公里的速度行駛 ${t} 小時，共行駛多少公里？`,d,'路程＝速度×時間。',`${v}×${t}＝${d}。`,[v+t,d+v,d-v,d/10],`${v}*${t}`);if(k===1)return o('speed',`一輛巴士行駛了 ${d} 公里，用了 ${t} 小時，平均每小時行駛多少公里？`,v,'速度＝路程÷時間。',`${d}÷${t}＝${v}。`,[d*t,v+1,v-1,d-t],`${d}/${t}`);return o('speed',`一輛巴士以每小時 ${v} 公里的速度行駛，要行駛 ${d} 公里，需要多少小時？`,t,'時間＝路程÷速度。',`${d}÷${v}＝${t}。`,[v,t+1,t-1,d-v>0?d-v:t+2],`${d}/${v}`)},
(r,p)=>{const a=N(r,p,1,5),b=N(r,p,2,7),T=(a+b)*N(r,p,2,15),x=r()<.5,q=T/(a+b)*(x?a:b),c=x?['紅','藍']:['藍','紅'];return o('ratio-share',`紅珠和藍珠的數量比是 ${a}:${b}，共有 ${T} 粒，${x?'紅':'藍'}珠有多少粒？`,q,'先求每一份是多少。',`共 ${a+b} 份，每份 ${T/(a+b)}，${x?'紅':'藍'}珠有 ${q} 粒。`,[T/(a+b),T-q,q+T/(a+b),T/(a+b)*(x?b:a)],`${T}/(${a}+${b})*${x?a:b}`)},
(r,p)=>{const x=N(r,p,1,6),y=N(r,p,2,9),k=N(r,p,2,12);return o('ratio-scale',`甲與乙的比是 ${x}:${y}。若甲是 ${x*k}，乙是多少？`,k*y,'先求比的每一份是多少。',`${x*k}÷${x}＝${k}，乙＝${k}×${y}＝${k*y}。`,[x*k+y,k*y+k,k*y-k>0?k*y-k:k*y+1,k],`${x*k}/${x}*${y}`)},
(r,p)=>{const L=N(r,p,6,30),W=N(r,p,5,L-1),l2=N(r,p,2,L-3),w2=N(r,p,2,W-2),s=L*W-l2*w2;return o('area-sub',`一個長 ${L} 米、闊 ${W} 米的長方形地方，角落挖去一個長 ${l2} 米、闊 ${w2} 米的長方形水池，剩下的面積是多少平方米？（答案只寫數字）`,s,'大面積減去挖去的面積。',`${L}×${W}－${l2}×${w2}＝${s}。`,[L*W+l2*w2,L*W,(L-l2)*(W-w2),s+l2],`${L}*${W}-${l2}*${w2}`)}
]
];

const OLY=[
[ // sequences
(r,p)=>{const a=N(r,p,1,40),d=N(r,p,2,15),len=4+Math.round(2*p.s),t=[...Array(len)].map((_,i)=>a+d*i),s=a+d*len;return o('seq-arith',`找規律：${t.join('、')}、？`,s,'看看相鄰兩個數相差多少。',`每次加 ${d}，${t[len-1]}＋${d}＝${s}。`,[s+1,s-1,s+d,t[len-1]+d+1],`${t[len-1]}+${d}`)},
(r,p)=>{const a=N(r,p,1,30),d=N(r,p,2,12),n=N(r,p,6,40),s=a+(n-1)*d;return o('seq-nth',`一列數：${a}、${a+d}、${a+2*d}、${a+3*d}、……，第 ${n} 項是多少？`,s,'第 n 項＝首項＋(n－1)×相差。',`${a}＋(${n}－1)×${d}＝${s}。`,[a+n*d,a+(n-2)*d,n*d,s+d],`${a}+(${n}-1)*${d}`)},
(r,p)=>{const a=pk(r,[1,2,3]),k=pk(r,[2,2,3].slice(0,2+(p.s>.5?1:0))),len=4+(p.s>.6?1:0),t=[...Array(len)].map((_,i)=>a*Math.pow(k,i)),s=t[len-1]*k;return o('seq-geo',`找規律：${t.join('、')}、？`,s,'每一項是前一項的幾倍？',`每次乘 ${k}，${t[len-1]}×${k}＝${s}。`,[t[len-1]+k,t[len-1]*2+1,s-k,t[len-1]+(t[len-1]-t[len-2])],`${t[len-1]}*${k}`)},
(r,p)=>{const a=ri(r,1,8),d1=ri(r,1,3),e=ri(r,1,1+Math.round(p.s*2)),len=5+(p.s>.5?1:0),t=[a];for(let i=0;i<len;i++)t.push(t[i]+d1+e*i);const sh_=t.slice(0,len);return o('seq-diff2',`找規律：${sh_.join('、')}、？`,t[len],'看看相鄰兩數的差，這些差有什麼規律？',`差依次是 ${sh_.slice(1).map((x,i)=>x-sh_[i]).join('、')}，下一個差是 ${t[len]-t[len-1]}，所以是 ${t[len]}。`,[t[len]+1,t[len]-1,t[len-1]+(t[len-1]-t[len-2]),t[len]+e])},
(r,p)=>{const a=ri(r,1,4),b=ri(r,1,6),len=5+Math.round(p.s*2),t=[a,b];for(let i=2;i<=len;i++)t.push(t[i-1]+t[i-2]);return o('seq-fib',`一列數：${t.slice(0,len).join('、')}、？（由第 3 個數起，每個數都等於前兩個數之和）`,t[len],'下一個數＝最後兩個數相加。',`${t[len-2]}＋${t[len-1]}＝${t[len]}。`,[t[len]+1,t[len]-1,t[len-1]+1,t[len-1]*2],`${t[len-2]}+${t[len-1]}`)},
(r,p)=>{const a=N(r,p,1,20),b=N(r,p,30,60),d=ri(r,1,2+Math.round(4*p.s)),e=ri(r,2,3+Math.round(6*p.s)),m=6+(r()<.5?1:0),t=[];for(let i=0;i<m+1;i++)t.push(i%2?b+e*((i-1)/2):a+d*(i/2));const sh_=t.slice(0,m);return o('seq-inter',`找規律：${sh_.join('、')}、？`,t[m],'把單數位置和雙數位置的數分開看。',`${m%2?'偶':'奇'}數位置的數每次加 ${m%2?e:d}，所以是 ${t[m]}。`,[t[m]+1,t[m]-1,m%2?t[m-1]+e:t[m-1]+d])},
(r,p)=>{const a=N(r,p,3,50),d=N(r,p,2,12),i=ri(r,1,4),t=[...Array(6)].map((_,j)=>j===i?'☐':a+d*j),s=a+d*i;return o('seq-missing',`找出空格的數：${t.join('、')}`,s,'先找出相鄰兩數的差。',`每次加 ${d}，☐＝${a+d*(i-1)}＋${d}＝${s}。`,[s+1,s-1,s+d,s-d],`${a}+${d}*${i}`)}
],
[ // clever calculation
(r,p)=>{const S=p.s>.55&&r()<.6?1000:100,x=ri(r,S/10+1,S-S/10-1),y=ri(r,S/10+1,S-S/10-1),e=ri(r,S/10,S-1),ts=sh(r,[x,y,S-x,S-y,e]),s=2*S+e;return o('make-whole',`${ts.join('＋')}＝？（想想怎樣湊整）`,s,`找兩個加起來是 ${S} 的數。`,`${x}＋${S-x}＝${S}，${y}＋${S-y}＝${S}，所以 ${S}＋${S}＋${e}＝${s}。`,[s+S,s-S,s+10,s-10,s+1],ts.join('+'))},
(r,p)=>{const n=N(r,p,10,100),s=n*(n+1)/2;return o('gauss',`1＋2＋3＋……＋${n}＝？`,s,'頭尾配對，每對的和相同。',`(1＋${n})×${n}÷2＝${s}。`,[n*(n+1),s+n,s-n,n*n/2+0.5>0?Math.round(n*n/2):s+1],`${n}*(${n}+1)/2`)},
(r,p)=>{const a=ri(r,1,9),d=ri(r,2,9),n=N(r,p,5,30),l=a+d*(n-1),s=n*(a+l)/2;return o('arith-sum',`${a}＋${a+d}＋${a+2*d}＋……＋${l}（每項比前一項多 ${d}，共 ${n} 項）＝？`,s,'(首項＋末項)×項數÷2。',`(${a}＋${l})×${n}÷2＝${s}。`,[n*(a+l),s+l,s-a,s+d],`${n}*(${a}+${l})/2`)},
(r,p)=>{const K=pk(r,[[99,0],[101,0],[11,0],[25,1],[5,2]].slice(0,2+Math.round(3*p.s)));let a=N(r,p,12,99);if(K[1]===1)a=4*ri(r,3,24);if(K[1]===2)a=2*ri(r,6,49);const s=a*K[0],hh={99:'×99＝×100 再減一份。',101:'×101＝×100 再加一份。',11:'×11＝×10 再加一份。',25:'×25＝×100÷4。',5:'×5＝×10÷2。'}[K[0]];return o('quick-mul',`${a}×${K[0]}＝？`,s,hh,`${a}×${K[0]}＝${s}。`,[s+a,s-a,s+10,s-10],`${a}*${K[0]}`)},
(r,p)=>{const x=N(r,p,12,99),c=ri(r,11,90);if(r()<.5){const q=ri(r,11,89);return o('distrib',`${x}×${q}＋${x}×${100-q}＝？`,x*100,'相同的因數可以提出來。',`${x}×(${q}＋${100-q})＝${x}×100＝${x*100}。`,[x*10,x*100+x,x*100-x,x*1000],`${x}*${q}+${x}*${100-q}`)}const m=pk(r,[10,100,20,50]);return o('distrib',`${x}×${c+m}－${x}×${c}＝？`,x*m,'相同的因數可以提出來。',`${x}×(${c+m}－${c})＝${x}×${m}＝${x*m}。`,[x*(m+c),x*m+x,x*m-x,x*c],`${x}*${c+m}-${x}*${c}`)},
(r,p)=>{const n=2*N(r,p,3,50);return o('alt-sum',`${n}－${n-1}＋${n-2}－${n-3}＋……＋2－1＝？`,n/2,'兩個兩個一組，看每組的結果。',`(${n}－${n-1})＝1，共 ${n/2} 組，所以是 ${n/2}。`,[n,n/2+1,n/2-1,n-1],`${n}/2`)},
(r,p)=>{const k=pk(r,[3,5,7].slice(0,1+Math.round(2*p.s))),mid=N(r,p,5,200),S=mid*k,s=mid+(k-1)/2;return o('consec',`${k} 個連續整數的和是 ${S}，其中最大的一個是多少？`,s,'連續整數的平均數就是中間那個數。',`中間數＝${S}÷${k}＝${mid}，最大數＝${mid}＋${(k-1)/2}＝${s}。`,[mid,s+1,s-1,mid-(k-1)/2],`${S}/${k}+${(k-1)/2}`)}
],
[ // logic, ordering, planting
(r,p)=>{const a=N(r,p,1,30),b=N(r,p,1,30),m=nm(r);return o('queue',`${m}排隊，他前面有 ${a} 人，後面有 ${b} 人，隊伍一共有多少人？`,a+b+1,'別忘了把他自己算進去。',`${a}＋${b}＋1＝${a+b+1}。`,[a+b,a+b+2,a+b-1,a*b],`${a}+${b}+1`)},
(r,p)=>{const a=N(r,p,1,15),b=a+N(r,p,2,12);return o('between',`同學們按身高由高至低排隊，小明排第 ${a}，小華排第 ${b}，兩人中間有多少人？`,b-a-1,'兩個名次相差多少，中間就少一個。',`${b}－${a}－1＝${b-a-1}。`,[b-a,b-a+1,b-a-2>0?b-a-2:b-a+2,b+a],`${b}-${a}-1`)},
(r,p)=>{const d=pk(r,[2,3,4,5,6,10]),m=N(r,p,4,40),L=d*m,v=ri(r,0,2);if(v===0)return o('plant',`一條長 ${L} 米的路，每隔 ${d} 米種一棵樹，兩端都要種，一共要種多少棵樹？`,m+1,'段數比棵數少一。',`${L}÷${d}＝${m} 段，棵數＝${m}＋1＝${m+1}。`,[m,m+2,L/d*2,m-1],`${L}/${d}+1`);if(v===1)return o('plant',`一條長 ${L} 米的路，每隔 ${d} 米種一棵樹，只有一端種樹，另一端不種，一共要種多少棵樹？`,m,'一端種、一端不種時，棵數＝段數。',`${L}÷${d}＝${m}。`,[m+1,m-1,m*2,L-d],`${L}/${d}`);return o('plant',`一個周界 ${L} 米的環形水池，每隔 ${d} 米放一盞燈，一共要放多少盞燈？`,m,'環形時，棵數＝段數。',`${L}÷${d}＝${m}。`,[m+1,m-1,m*2,L-d],`${L}/${d}`)},
(r,p)=>{const k=N(r,p,3,12),t=ri(r,2,6);if(r()<.5)return o('saw',`把一根木頭鋸成 ${k} 段，每鋸一刀要 ${t} 分鐘（鋸完立即再鋸，不休息），一共需要多少分鐘？`,(k-1)*t,'鋸成幾段，要鋸的刀數少一。',`鋸 ${k-1} 刀，${k-1}×${t}＝${(k-1)*t}。`,[k*t,(k+1)*t,(k-2)*t,k+t],`(${k}-1)*${t}`);const f=k+1;return o('saw',`${nm(r)}從 1 樓走到 ${f} 樓，每走一層樓梯需要 ${t} 秒，一共需要多少秒？`,(f-1)*t,'由 1 樓走到 n 樓，只走 n－1 層。',`${f}－1＝${f-1} 層，${f-1}×${t}＝${(f-1)*t}。`,[f*t,(f+1)*t,(f-2)*t,f+t],`(${f}-1)*${t}`)},
(r,p)=>{const n=N(r,p,3,10);return o('liars',`有 ${n} 個人，第 1 人說：「我們之中有 1 個人說謊。」第 2 人說：「我們之中有 2 個人說謊。」……第 ${n} 人說：「我們之中有 ${n} 個人說謊。」實際上有多少個人說謊？`,n-1,'這些說法互相矛盾，最多只有一句是真的。',`最多一人說真話；若沒人說真話，第 ${n} 人就變成真話，矛盾。所以恰好 1 人說真話，說謊的有 ${n}－1＝${n-1} 人。`,[n,1,n-2>0?n-2:n+1,n+1],`${n}-1`)},
(r,p)=>{const k=N(r,p,3,5),L=[...'甲乙丙丁戊'].slice(0,k),ord=sh(r,L),f=[];for(let i=0;i<k-1;i++)f.push(r()<.5||p.s<.3?`${ord[i]}比${ord[i+1]}高`:`${ord[i+1]}比${ord[i]}矮`);const idx=ri(r,0,k-1);return o('rank',`${k} 個人比身高。${sh(r,f).join('；')}。由高至低排，${ord[idx]}排第幾？`,idx+1,'先把大家由高至低排成一行。',`排序是 ${ord.join('、')}，${ord[idx]}排第 ${idx+1}。`,[k-idx,idx,idx+2>k?idx:idx+2,1])},
(r,p)=>{const a=N(r,p,2,30),b=N(r,p,2,30),m=nm(r);return o('left-right',`${m}在隊伍中，從左面數起排第 ${a}，從右面數起排第 ${b}，隊伍共有多少人？`,a+b-1,'他被左右兩邊都數了一次。',`${a}＋${b}－1＝${a+b-1}。`,[a+b,a+b-2,a+b+1,a*b],`${a}+${b}-1`)}
],
[ // ages, sum/diff/multiple, chicken-rabbit
(r,p)=>{const big=N(r,p,6,60),sm=N(r,p,2,big-1),S=big+sm,D=big-sm;if(r()<.6)return o('sum-diff',`甲乙兩數的和是 ${S}，差是 ${D}，甲是較大的數，甲是多少？`,big,'較大數＝(和＋差)÷2。',`(${S}＋${D})÷2＝${big}。`,[sm,S-D,big+1,big-1],`(${S}+${D})/2`);return o('sum-diff',`甲乙兩數的和是 ${S}，差是 ${D}，乙是較小的數，乙是多少？`,sm,'較小數＝(和－差)÷2。',`(${S}－${D})÷2＝${sm}。`,[big,S-D,sm+1,sm-1],`(${S}-${D})/2`)},
(r,p)=>{const sm=N(r,p,3,40),k=N(r,p,2,6),S=sm*(k+1);if(r()<.5)return o('sum-mult',`甲乙兩數的和是 ${S}，甲是乙的 ${k} 倍，乙是多少？`,sm,`把乙看作 1 份，甲就是 ${k} 份。`,`共 ${k+1} 份，${S}÷${k+1}＝${sm}。`,[sm*k,S/k>0&&S%k===0?S/k:sm+1,sm+1,S-k],`${S}/(${k}+1)`);return o('sum-mult',`甲乙兩數的和是 ${S}，甲是乙的 ${k} 倍，甲是多少？`,sm*k,`把乙看作 1 份，甲就是 ${k} 份。`,`共 ${k+1} 份，乙＝${sm}，甲＝${sm}×${k}＝${sm*k}。`,[sm,S-k,sm*k+sm,sm*k-sm],`${S}/(${k}+1)*${k}`)},
(r,p)=>{const sm=N(r,p,3,40),k=N(r,p,2,6),D=sm*(k-1);return o('diff-mult',`甲比乙多 ${D}，而且甲是乙的 ${k} 倍，乙是多少？`,sm,`甲比乙多出 ${k-1} 份。`,`${D}÷(${k}－1)＝${sm}。`,[D,sm*k,sm+1,D/k>0&&D%k===0?D/k:sm-1>0?sm-1:sm+2],`${D}/(${k}-1)`)},
(r,p)=>{let b,x,k,a;for(let t=0;t<50;t++){b=N(r,p,5,15);x=N(r,p,2,10);k=ri(r,2,3+(p.s>.6?1:0));a=k*(b+x)-x;if(a<=65)break}if(a>65){b=8;x=4;k=3;a=32}return o('age',`今年爸爸 ${a} 歲，兒子 ${b} 歲，幾年後爸爸的年齡是兒子的 ${k} 倍？`,x,'兩人的年齡差永遠不變。',`年齡差 ${a-b}，那時兒子 ${(a-b)/(k-1)} 歲，所以是 ${(a-b)/(k-1)}－${b}＝${x} 年後。`,[(a-b)/(k-1),x+1,x-1>0?x-1:x+2,a-b])},
(r,p)=>{const th=r()<.7?[2,4,'雞','兔','腳']:[2,3,'單車','三輪車','輪'],c=N(r,p,2,20),t=N(r,p,2,20),H=c+t,F=th[0]*c+th[1]*t,ask=r()<.5;return o('chicken-rabbit',`籠裏有${th[2]}和${th[3]}共 ${H} 隻（輛），共有 ${F} 隻${th[4]}。${ask?th[3]:th[2]}有多少隻（輛）？（${th[2]}有 ${th[0]} 隻${th[4]}，${th[3]}有 ${th[1]} 隻${th[4]}）`,ask?t:c,`假設全部都是${th[2]}，看看${th[4]}數差多少。`,`假設全是${th[2]}有 ${th[0]*H} 隻${th[4]}，多出 ${F-th[0]*H}，每換一隻多 ${th[1]-th[0]}，${th[3]}有 ${t}，${th[2]}有 ${c}。`,[ask?c:t,H,(ask?t:c)+1,(ask?t:c)-1>0?(ask?t:c)-1:(ask?t:c)+2],ask?`(${F}-${th[0]}*${H})/${th[1]-th[0]}`:`(${th[1]}*${H}-${F})/${th[1]-th[0]}`)},
(r,p)=>{const x=N(r,p,2,15),y=N(r,p,2,15),n=x+y,M=2*x+5*y,ask=r()<.5;return o('coins',`錢罌內有 $2 和 $5 的硬幣共 ${n} 枚，總值 $${M}。${ask?'$5':'$2'}硬幣有多少枚？`,ask?y:x,'假設全部都是 $2 硬幣。',`假設全是 $2 共 $${2*n}，多出 $${M-2*n}，每換一枚多 $3。$5 有 ${y} 枚，$2 有 ${x} 枚。`,[ask?x:y,n,(ask?y:x)+1,(ask?y:x)-1>0?(ask?y:x)-1:(ask?y:x)+2],ask?`(${M}-2*${n})/3`:`(5*${n}-${M})/3`)},
(r,p)=>{const z=N(r,p,5,40),b=ri(r,1,10),a=ri(r,1,10),S=3*z+2*b+a;return o('three',`甲、乙、丙三人共有 ${S} 粒糖，甲比乙多 ${a} 粒，乙比丙多 ${b} 粒，丙有多少粒？`,z,'把三人都看作和丙一樣多，再補回多出的部分。',`甲＝丙＋${a+b}，乙＝丙＋${b}，所以 3 個丙＝${S}－${a+b}－${b}＝${3*z}，丙＝${z}。`,[S/3>0&&S%3===0?S/3:z+1,z+1,z-1>0?z-1:z+2,z+b],`(${S}-${a}-2*${b})/3`)}
],
[ // counting
(r,p)=>{const n=N(r,p,3,6),k=ri(r,2,Math.min(3,n)),c=[...Array(n)].map((_,i)=>i+1),v=[...Array(k)].map((_,i)=>n-i),s=v.reduce((a,b)=>a*b,1);return o('perm',`用數字卡 ${c.join('、')}（每張只可用一次）組成不同的 ${k} 位數，一共可以組成多少個？`,s,`第一位有幾個選擇？第二位呢？`,`${v.join('×')}＝${s}。`,[n*k,Math.pow(n,k),s+n,s/ k>0&&s%k===0?s/k:s+1],v.join('*'))},
(r,p)=>{const n=N(r,p,3,20),s=n*(n-1)/2;return o('handshake',`${n} 個人聚會，每兩個人都握手一次，一共握手多少次？`,s,'每人和其他人握手，但每次握手被算了兩次。',`${n}×${n-1}÷2＝${s}。`,[n*(n-1),s+n,s-n>0?s-n:s+1,n*n/2>0?Math.round(n*n/2):s+1],`${n}*(${n}-1)/2`)},
(r,p)=>{const m=N(r,p,2,6),n=N(r,p,2,6),k=p.s>.5?N(r,p,2,5):1;if(k===1)return o('route',`由甲地到乙地有 ${m} 條路，由乙地到丙地有 ${n} 條路，由甲地經乙地到丙地有多少種不同走法？`,m*n,'每條第一段路都可配搭每條第二段路。',`${m}×${n}＝${m*n}。`,[m+n,m*n+m,m*n-n,m*n+1],`${m}*${n}`);return o('route',`由甲地到乙地有 ${m} 條路，乙地到丙地有 ${n} 條路，丙地到丁地有 ${k} 條路，由甲地經乙、丙到丁地有多少種不同走法？`,m*n*k,'逐段相乘。',`${m}×${n}×${k}＝${m*n*k}。`,[m+n+k,m*n*k+m,m*n+k,m*n*k-1],`${m}*${n}*${k}`)},
(r,p)=>{const n=N(r,p,2,6);if(r()<.5){const t=[...Array(n)].map((_,i)=>`${i+1}*${i+1}`),s=n*(n+1)*(2*n+1)/6;return o('squares',`一個 ${n}×${n} 的方格網由 ${n*n} 個大小相同的小正方形組成，圖中一共有多少個正方形？（包括各種大小）`,s,'分開數：邊長 1、2、3……的正方形各有多少個。',`${t.join('＋').replace(/\*/g,'×')}＝${s}。`,[n*n,s-n,s+n,n*n+n],t.join('+'))}const m=n+2,s=m*(m-1)/2;return o('segments',`一條直線上有 ${m} 個點，以其中任意兩點為端點，一共可得多少條線段？`,s,'每點與其他點連成線段，但每條被算兩次。',`${m}×${m-1}÷2＝${s}。`,[m*(m-1),s+m,s-m>0?s-m:s+1,m*m/2>0?Math.round(m*m/2):s+1],`${m}*(${m}-1)/2`)},
(r,p)=>{const m=N(r,p,2,8),n=N(r,p,2,8),k=p.s>.4?N(r,p,2,5):1,nn=nm(r);return o('combo',`${nn}有 ${m} 件上衣、${n} 條褲${k>1?`、${k} 對鞋`:''}，穿一套（上衣、褲${k>1?'、鞋':''}各一）有多少種不同配法？`,m*n*k,'每個項目的選擇數相乘。',`${[m,n,k>1?k:null].filter(Boolean).join('×')}＝${m*n*k}。`,[m+n+k-(k>1?0:1),m*n*k+m,m*n*k-1,m*n+k],k>1?`${m}*${n}*${k}`:`${m}*${n}`)},
(r,p)=>{const n=N(r,p,3,6);if(r()<.5)return o('arrange',`${n} 個同學排成一行拍照，有多少種不同排法？`,mul(n).split('*').reduce((a,b)=>a*b,1),'第一個位置有 n 個選擇，之後逐個減少。',`${mul(n).replace(/\*/g,'×')}＝${mul(n).split('*').reduce((a,b)=>a*b,1)}。`,[n*n,n*(n-1),mul(n).split('*').reduce((a,b)=>a*b,1)*2,mul(n).split('*').reduce((a,b)=>a*b,1)-n],mul(n));const s=2*mul(n-1).split('*').reduce((a,b)=>a*b,1);return o('arrange-adj',`${n} 個人排成一行，其中小明和小華一定要相鄰，有多少種不同排法？（他們兩人的先後次序也要計算）`,s,'把相鄰的兩人當作一個人，再想他們的前後次序。',`當作 ${n-1} 個人：${mul(n-1).replace(/\*/g,'×')}，再乘 2＝${s}。`,[s/2,s*n,s+n,mul(n).split('*').reduce((a,b)=>a*b,1)],`2*${mul(n-1)}`)},
(r,p)=>{const n=N(r,p,4,32);return o('knockout',`${n} 隊參加淘汰賽（每場比賽輸的一隊即被淘汰，直至剩下冠軍），一共要進行多少場比賽？`,n-1,'每場比賽淘汰一隊。',`要淘汰 ${n-1} 隊，所以要 ${n-1} 場。`,[n,n/2>0?Math.floor(n/2):n+1,n*(n-1)/2,n-2],`${n}-1`)}
],
[ // digit puzzles, remainders, surplus/deficit
(r,p)=>{const d=N(r,p,3,9),a=ri(r,1,d-1),k=ri(r,2,10+Math.round(20*p.s)),s=(a+k)%d;return o('rem-shift',`一個數除以 ${d} 餘 ${a}，這個數加 ${k} 後再除以 ${d}，餘數是多少？`,s,'只需要看餘數加上去之後的情況。',`(${a}＋${k})÷${d} 的餘數＝${s}。`,[a+k,(a+k)%d+1,a,k%d===s?s+1:k%d],`(${a}+${k})%${d}`)},
(r,p)=>{const P=[[3,4],[3,5],[4,5],[3,7],[5,7],[4,9],[5,8],[7,9]],[m1,m2]=pk(r,P.slice(0,3+Math.round(5*p.s))),r1=ri(r,1,m1-1),r2=ri(r,1,m2-1);let s=0;for(let n=1;n<=m1*m2;n++)if(n%m1===r1&&n%m2===r2){s=n;break}return o('crt',`一個數除以 ${m1} 餘 ${r1}，除以 ${m2} 餘 ${r2}，這個數最小是多少？（正整數）`,s,`列出除以 ${m2} 餘 ${r2} 的數，逐個試。`,`試 ${r2}、${r2+m2}、${r2+2*m2}……，第一個除以 ${m1} 餘 ${r1} 的是 ${s}。`,[s+m1,s+m2,s-m1>0?s-m1:s+m1*2,r1+r2])},
(r,p)=>{const n=N(r,p,3,20),a=ri(r,2,6),b=a+ri(r,1,3),pp=ri(r,1,n*(b-a)-1),q=n*(b-a)-pp,tot=n*a+pp;if(r()<.5)return o('surplus',`把一些糖果分給小朋友，每人分 ${a} 粒，多出 ${pp} 粒；每人分 ${b} 粒，則少 ${q} 粒。共有多少個小朋友？`,n,'兩種分法相差多少粒？每人相差多少粒？',`(${pp}＋${q})÷(${b}－${a})＝${n}。`,[pp+q,n+1,n-1,tot],`(${pp}+${q})/(${b}-${a})`);return o('surplus',`把一些糖果分給小朋友，每人分 ${a} 粒，多出 ${pp} 粒；每人分 ${b} 粒，則少 ${q} 粒。共有多少粒糖果？`,tot,'先求出小朋友人數。',`人數＝(${pp}＋${q})÷(${b}－${a})＝${n}，糖果＝${a}×${n}＋${pp}＝${tot}。`,[n,tot+a,tot-a,b*n],`${a}*${n}+${pp}`)},
(r,p)=>{const t=ri(r,1,8),o2=ri(r,t+1,9);return o('digits',`一個兩位數，十位數字與個位數字的和是 ${t+o2}，個位數字比十位數字大 ${o2-t}，這個兩位數是多少？`,10*t+o2,'用和差問題的方法求兩個數字。',`十位＝(${t+o2}－${o2-t})÷2＝${t}，個位＝${o2}，所以是 ${10*t+o2}。`,[10*o2+t,t+o2,10*t+o2+1,10*t+o2-1])},
(r,p)=>{const v=[0,0,0].map(()=>N(r,p,2,30)),[x,y,z]=v,A=x+y,B=y+z,C=x+z,i=ri(r,0,2),sy=['🍎','🍌','🍇'],ex=[`(${A}+${C}-${B})/2`,`(${A}+${B}-${C})/2`,`(${B}+${C}-${A})/2`][i];return o('symbols',`${sy[0]}＋${sy[1]}＝${A}，${sy[1]}＋${sy[2]}＝${B}，${sy[0]}＋${sy[2]}＝${C}。${sy[i]}＝？`,v[i],'三條式子加起來，看看有幾個相同的圖案。',`三式相加：每個圖案出現 2 次，總和＝${A+B+C}，一個各＝${(A+B+C)/2}，再減去其餘兩個的和。`,[v[i]+1,v[i]-1>0?v[i]-1:v[i]+2,(A+B+C)/2,v[(i+1)%3]],ex)},
(r,p)=>{const q=pk(r,[3,4,5,6].slice(0,2+Math.round(2*p.s))),n=N(r,p,10,100),seq=[...Array(q)].map((_,i)=>i+1).join('、')+'、'+[...Array(q)].map((_,i)=>i+1).join('、')+'、……';if(r()<.5)return o('cycle',`把 ${[...Array(q)].map((_,i)=>i+1).join('、')} 重複排成一行：${seq}　第 ${n} 個數字是多少？`,(n-1)%q+1,'看看每 '+q+' 個數字是一個週期。',`${n}÷${q} 餘 ${n%q}，餘 0 即是 ${q}，所以是 ${(n-1)%q+1}。`,[n%q,q,(n%q)+1>q?1:(n%q)+1,Math.floor(n/q)],`(${n}-1)%${q}+1`);const full=Math.floor(n/q),rem=n%q,s=full*q*(q+1)/2+rem*(rem+1)/2;return o('cycle-sum',`把 ${[...Array(q)].map((_,i)=>i+1).join('、')} 重複排成一行：${seq}　前 ${n} 個數字的和是多少？`,s,'先算一個週期的和。',`一個週期和 ${q*(q+1)/2}，共 ${full} 個週期，餘下 ${rem} 個的和是 ${rem*(rem+1)/2}，合共 ${s}。`,[full*q*(q+1)/2,s+q,s-q,(full+1)*q*(q+1)/2],`${full}*${q*(q+1)/2}+${rem*(rem+1)/2}`)},
(r,p)=>{const b=pk(r,[2,3,7,8,4].slice(0,2+Math.round(3*p.s))),n=N(r,p,5,60);let v=1;for(let i=0;i<n;i++)v=v*b%10;return o('last-digit',`${n} 個 ${b} 連乘（即 ${b} 的 ${n} 次方）的個位數字是多少？`,v,'列出頭幾次方的個位，找循環。',`個位數字有循環，推算得 ${v}。`,[(v+1)%10,(v+2)%10,b,(v+9)%10])}
]
];

const TPL={math:MATH,olympiad:OLY};
const WORLDS={
math:[['數字小島','🏝️','小一二：20以內及100以內加減'],['乘法森林','🌳','小二：兩位數加減與乘法入門'],['九九城堡','🏰','小三：乘除與九九、多位數運算'],['分數小鎮','🍰','小四：分數與小數入門'],['百分比海洋','🌊','小五：小數、百分數、平均數'],['圖形太空站','🚀','小六：周界、面積、速度、比']],
olympiad:[['規律迷宮','🧩','數列規律'],['巧算山谷','⚡','巧算：湊整、等差求和、速算'],['邏輯偵探社','🕵️','邏輯推理與排序、植樹問題'],['和差倍工廠','🏭','年齡、和差倍、雞兔同籠'],['計數樂園','🎡','排列、握手、路線、圖形數'],['謎題深淵','🔮','數字謎、餘數與盈虧問題']]
};
const trk=t=>t==='olympiad'?'olympiad':'math';
const worlds=track=>{const t=trk(track);return WORLDS[t].map((w,i)=>({id:`${t}-${i+1}`,name:w[0],icon:w[1],desc:w[2],stages:10}))};

const norm=s=>String(s==null?'':s).replace(/[０-９]/g,c=>String.fromCharCode(c.charCodeAt(0)-65248)).replace(/[／]/g,'/').replace(/[．。]/g,'.').replace(/[\s　]+/g,'');
const num=s=>{s=norm(s);if(/^\d+\/\d+$/.test(s)){const [a,b]=s.split('/').map(Number);return b?a/b:NaN}return /^(\d+\.?\d*|\.\d+)$/.test(s)?+s:NaN};
const eq=(a,b)=>{a=norm(a);b=norm(b);if(a===b)return true;const x=num(a),y=num(b);return x===x&&y===y&&Math.abs(x-y)<1e-9};
const check=(q,i)=>!!q&&norm(i)!==''&&[q.answer,...(q.accept||[])].some(a=>eq(a,i));

const gen=(a,d)=>{
  if(a.includes('/')){const [x,y]=a.split('/').map(Number);return[`${x+1}/${y}`,`${x}/${y+1}`,`${Math.max(1,x-1)}/${y}`,`${y}/${x}`,`${x+1}/${y+1}`,`${x}/${y*2}`]}
  const v=+a,dg=(a.split('.')[1]||'').length,st=Math.pow(10,-dg),rd=x=>Math.round(x*Math.pow(10,dg))/Math.pow(10,dg);
  const near=[v+st,v-st,v+2*st,v-2*st],far=[v+10*st,v-10*st,rd(v*2),rd(v/2)];
  if(dg)far.push(v*10,v/10,v+1,v-1);else if(a.length>1&&a[0]!==a[1])far.push(+(a[1]+a[0]+a.slice(2)));
  if(d>=4)return near.concat(far);
  if(d<=2)return far.concat(near);
  const m=[];for(let i=0;i<Math.max(near.length,far.length);i++){if(i<near.length)m.push(near[i]);if(i<far.length)m.push(far[i])}return m;
};
const mk=(r,x,diff,mode)=>{
  const q={mode,q:x.q,answer:x.a,accept:x.acc.filter(s=>s!==x.a),hint:x.h,explain:x.e,skill:x.sk};
  if(x.calc){q.calc={expr:x.calc,value:+x.a}}
  if(mode==='fill')return q;
  const isInt=/^\d+$/.test(x.a),isFr=x.a.includes('/'),tw=x.w.map(v=>typeof v==='number'?(isFinite(v)&&v>=0?fx(v):null):String(v)).filter(v=>v!==null&&(!isFr||v.includes('/'))&&(isFr||!v.includes('/'))&&(!isInt||/^\d+$/.test(v)));
  const g=gen(x.a,diff).map(v=>typeof v==='number'?(isFinite(v)&&v>=0?fx(v):null):v).filter(v=>v!==null&&(!isInt||/^\d+$/.test(v)));
  const cand=diff>=4?g.concat(tw):tw.concat(g);
  for(let i=1;i<20;i++)cand.push(isFr?`${x.a.split('/')[0]*1+i}/${+x.a.split('/')[1]+i}`:fx(+x.a+i*(isInt?3:.1)));
  const out=[];
  for(const c of cand){if(out.length>=3)break;if(check(q,c))continue;if(out.some(z=>eq(z,c)))continue;out.push(norm(c))}
  if(out.length<3)return null;
  q.options=sh(r,[x.a,...out]);
  return q;
};
const make=(track,wi,si,n,diff,seed)=>{
  const t=trk(track);wi=Math.min(5,Math.max(0,wi|0));si=Math.min(9,Math.max(0,si|0));diff=Math.min(5,Math.max(1,diff|0||3));n=Math.max(0,n|0);seed=seed|0;
  const r=mb(hs(t,wi,si,n,diff,seed)),T=TPL[t][wi],L=T.length,boss=si===9,base=Math.min(1,.35*si/9+.65*(diff-1)/4+(boss?.1:0));
  const res=[],seen=new Set(),all=T.map((_,i)=>i);
  for(let k=0;k<n;k++){
    const mode=k%2?'fill':'mcq';
    for(let att=0;;att++){
      if(att>600)throw new Error('WQ37Math: cannot build question');
      const p={s:Math.min(1,base+(att>20?(att-20)*.03:0)),diff,stage:si};
      const pool=boss||att>40?all:[si%L,(si+1)%L,(si+2)%L];
      const x=T[pk(r,pool)](r,p);
      if(seen.has(x.q))continue;
      const q=mk(r,x,diff,mode);
      if(!q)continue;
      seen.add(x.q);
      res.push(Object.assign({id:`M${t==='olympiad'?'O':''}${wi+1}-${si+1}-${k+1}`},q));
      break;
    }
  }
  return res;
};
const api={worlds,make,check};
globalThis.WQ37Math=api;
if(typeof module!=='undefined')module.exports=globalThis.WQ37Math;
})();
