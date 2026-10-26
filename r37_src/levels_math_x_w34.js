// R3.31 variety pool for 數學 世界3 (w=2, 小三九九乘除) and 世界4 (w=3, 小四分數小數). Pure functions, only the seeded `r`.
(function(){'use strict';
const X=(globalThis.WQ37MathX=globalThis.WQ37MathX||{q:[]});

// ── shared tables ──
// [container, measure word, thing] : 「每盒有 3 粒糖，4 盒共有……」
const CT=[['盒','粒','糖'],['排','張','椅子'],['籃','個','橙'],['袋','個','麵包'],['層','本','書'],['碟','塊','餅乾'],['束','枝','花'],['行','棵','樹'],['包','塊','朱古力'],['格','件','玩具']];
// [container noun, measure word, thing] : 「平均裝入 4 個盒子」
const BX=[['盒子','粒','糖'],['籃子','個','橙'],['袋子','個','麵包'],['碟子','塊','餅乾'],['箱子','本','書'],['筆盒','枝','筆']];
const PRICE=[['棒冰','支'],['麵包','個'],['橡皮擦','塊'],['小冊子','本'],['蘋果','個'],['氣球','個'],['書籤','張'],['貼紙簿','本']];
// 九九 factor ceiling: starts at the first tables and grows with p.s, never beyond 9
const cap=p=>Math.min(9,5+Math.round(p.s*5));

// ════════════════ 世界3 ════════════════
// Stages 1-3 must stay 九九-only: skill 'times', and every number printed in a stem is 2..9 (so no products in the stem there).
const FIX=[['單車','個輪',2],['小狗','隻腳',4],['一隻手','隻手指',5],['昆蟲','隻腳',6],['一個星期','日',7],['蜘蛛','隻腳',8]];
const W3=[0,1,2,3];
// forward story, ten containers
X.q.push({w:2,stages:W3,make:H=>{const {o,ri,pk}=H;return (r,p)=>{
  const c=cap(p),a=ri(r,2,c),b=ri(r,2,c),s=a*b,[cn,m,t]=pk(r,CT),f=ri(r,0,1);
  const q=f?`${b} ${cn}${t}，每${cn}有 ${a} ${m}，一共有多少${m}${t}？`:`每${cn}有 ${a} ${m}${t}，${b} ${cn}共有多少${m}${t}？`;
  return o('times',q,s,`每${cn}有 ${a}，有 ${b} ${cn}，用乘法。`,`每${cn}有 ${a} ${m}，${b} ${cn}就是 ${b} 個 ${a}，用乘法：${a}×${b}＝${s}，共 ${s} ${m}${t}。`,[a+b,s+a,s-a,s+b,s-b],`${a}*${b}`)}}});

// compare two products
X.q.push({w:2,stages:W3,make:H=>{const {o,ri}=H;return (r,p)=>{
  const c=cap(p);let a,b,d,e;
  for(let t=0;t<60;t++){a=ri(r,2,c);b=ri(r,2,c);d=ri(r,2,c);e=ri(r,2,c);if(a*b!==d*e&&!(a===d&&b===e)&&!(a===e&&b===d))break}
  if(a*b===d*e)e=e<c?e+1:e-1;
  const s1=a*b,s2=d*e,mx=Math.max(s1,s2),mn=Math.min(s1,s2),hi=s1>s2?`${a}×${b}`:`${d}×${e}`;
  const f=ri(r,0,2);
  const q=f===0?`${a}×${b} 和 ${d}×${e}，兩個積中較大的是多少？`:f===1?`比較 ${a}×${b} 和 ${d}×${e}，較大的那個積是多少？`:`${a}×${b}＝？${d}×${e}＝？兩個答案中，較大的是多少？`;
  return o('times',q,mx,'分別算出兩個積，再比較大小。',`先分別算：${a}×${b}＝${s1}，${d}×${e}＝${s2}。${mx} 比 ${mn} 大，所以較大的積是 ${mx}（${hi}）。`,[mn,mx+1,mx-1,s1+s2],`${hi.replace('×','*')}`)}}});

// difference of lots: n lots of a  vs  m lots of a
X.q.push({w:2,stages:W3,make:H=>{const {o,ri,pk,nm}=H;return (r,p)=>{
  const c=cap(p),a=ri(r,2,c),n=ri(r,3,Math.max(4,c)),m=ri(r,2,n-1),s=a*(n-m),f=ri(r,0,2);
  if(f===0)return o('times',`${a}×${n} 比 ${a}×${m} 多多少？`,s,`差了幾個 ${a}？`,`${a}×${n} 是 ${n} 個 ${a}，${a}×${m} 是 ${m} 個 ${a}，相差 ${n}－${m}＝${n-m} 個 ${a}：${a}×${n-m}＝${s}。（或算 ${a*n}－${a*m}＝${s}）`,[a*n,a*m,s+a,s-a>0?s-a:s+2*a],`${a}*${n}-${a}*${m}`);
  const [it,u]=pk(r,PRICE),nn=nm(r);
  if(f===1)return o('times',`每${u}${it}$${a}，${nn}買了 ${n} ${u}，${nn.p}的朋友買了 ${m} ${u}，${nn}比朋友多用了多少元？（答案只寫數字）`,s,'先看多買了幾件，再乘單價。',`${nn}比朋友多買 ${n}－${m}＝${n-m} ${u}，每${u} ${a} 元：${a}×${n-m}＝${s}，多用了 ${s} 元。（或算 ${a*n}－${a*m}＝${s}）`,[a*n,a*m,s+a,s-a>0?s-a:s+2*a],`${a}*${n}-${a}*${m}`);
  const [cn,mm,t]=pk(r,CT);
  return o('times',`甲組有 ${n} ${cn}${t}，乙組有 ${m} ${cn}，每${cn}都有 ${a} ${mm}，甲組比乙組多多少${mm}${t}？`,s,'先看多了幾'+cn+'，再乘每'+cn+'的數量。',`甲組比乙組多 ${n}－${m}＝${n-m} ${cn}，每${cn} ${a} ${mm}：${a}×${n-m}＝${s}，多 ${s} ${mm}。（或算 ${a*n}－${a*m}＝${s}）`,[a*n,a*m,s+a,s-a>0?s-a:s+2*a],`${a}*${n}-${a}*${m}`)}}});

// two lots added (b+c <= 9, so still a 九九 fact)
X.q.push({w:2,stages:W3,make:H=>{const {o,ri,pk,nm}=H;return (r,p)=>{
  const c=cap(p),a=ri(r,2,c),b=ri(r,2,7),d=ri(r,2,9-b),s=a*(b+d),n1=nm(r);let n2=nm(r);for(let t=0;t<9&&n2===n1;t++)n2=nm(r);
  const [cn,m,t]=pk(r,CT);
  return o('times',`${n1}有 ${b} ${cn}${t}，${n2}有 ${d} ${cn}${t}，每${cn}都有 ${a} ${m}，兩人一共有多少${m}${t}？`,s,`先求一共有幾${cn}，再乘每${cn}的數量。`,`兩人一共有 ${b}＋${d}＝${b+d} ${cn}，每${cn} ${a} ${m}：${a}×${b+d}＝${s}，共 ${s} ${m}。（也可分開算：${a}×${b}＋${a}×${d}＝${a*b}＋${a*d}＝${s}）`,[a*b,a*d,s+a,a*b+d],`${a}*(${b}+${d})`)}}});

// arrays / rows and columns
X.q.push({w:2,stages:W3,make:H=>{const {o,ri,pk}=H;return (r,p)=>{
  const c=cap(p),a=ri(r,2,c),b=ri(r,2,c),s=a*b;
  const T=[
    `禮堂的椅子排成 ${a} 行，每行 ${b} 張，一共有多少張椅子？`,
    `一個朱古力盒的朱古力排成 ${a} 行 ${b} 列，一共有多少粒朱古力？`,
    `花園裏種了 ${a} 行菜，每行 ${b} 棵，一共種了多少棵菜？`,
    `課室的座位有 ${a} 排，每排 ${b} 個座位，共有多少個座位？`,
    `一版郵票有 ${a} 行，每行 ${b} 枚，這版郵票共有多少枚？`,
    `棋盤上的一個方陣有 ${a} 行 ${b} 列，共有多少格？`,
    `停車場每層停 ${b} 輛車，共有 ${a} 層，一共可以停多少輛車？`];
  return o('times',pk(r,T),s,'行數 × 每行的數量。',`行數乘每行的數量：${a}×${b}＝${s}（也可以看成 ${b} 個 ${a}，答案相同）。`,[a+b,s+a,s-b,s+b],`${a}*${b}`)}}});

// multiples (no products printed)
X.q.push({w:2,stages:W3,make:H=>{const {o,ri}=H;return (r,p)=>{
  const c=cap(p),a=ri(r,2,c),b=ri(r,3,Math.max(4,c)),f=ri(r,0,2);
  if(f===0)return o('times',`${a} 的第 ${b} 個倍數是多少？`,a*b,`第 ${b} 個倍數就是 ${b} 個 ${a}。`,`${a} 的倍數是 ${a}、${a*2}、${a*3}……，第 ${b} 個倍數是 ${b} 個 ${a} 相加，即 ${a}×${b}＝${a*b}。`,[a*b+a,a*b-a,a+b,a*(b+1)],`${a}*${b}`);
  if(f===1)return o('times',`從 ${a} 開始，每次加 ${a}，第 ${b} 個數是多少？`,a*b,`第 ${b} 個數就是 ${b} 個 ${a}。`,`每次加 ${a}，第 ${b} 個數就是 ${b} 個 ${a}：${a}×${b}＝${a*b}。`,[a*b+a,a*b-a,a*(b+1),a+b],`${a}*${b}`);
  return o('times',`${a} 個 ${b} 相加是多少？`,a*b,'幾個相同的數相加，用乘法。',`${a} 個 ${b} 相加，就是 ${a}×${b}＝${a*b}。`,[a+b,a*b+b,a*b-b,a*b+a],`${a}*${b}`)}}});

// unit price
X.q.push({w:2,stages:W3,make:H=>{const {o,ri,pk,nm}=H;return (r,p)=>{
  const c=cap(p),a=ri(r,2,c),b=ri(r,2,c),s=a*b,m=nm(r),[it,u]=pk(r,PRICE),f=ri(r,0,1);
  const q=f?`每${u}${it}$${a}，${m}買了 ${b} ${u}，一共用了多少元？（答案只寫數字）`:`${m}買了 ${b} ${u}${it}，每${u} ${a} 元，一共要付多少元？（答案只寫數字）`;
  return o('times',q,s,'單價 × 數量。',`每${u} ${a} 元，買 ${b} ${u}，用乘法：${a}×${b}＝${s}，一共 ${s} 元。`,[a+b,s+a,s-a,s+b],`${a}*${b}`)}}});

// fixed-number facts (a bicycle has 2 wheels ...)
X.q.push({w:2,stages:W3,make:H=>{const {o,ri,pk}=H;return (r,p)=>{
  const c=cap(p),l=FIX.filter(x=>x[2]<=c),[w,u,a]=pk(r,l.length?l:FIX.slice(0,1)),b=ri(r,2,c),s=a*b;
  const q=w==='一個星期'?`一個星期有 ${a} 日，${b} 個星期共有多少日？`:w==='一隻手'?`一隻手有 ${a} 隻手指，${b} 隻手共有多少隻手指？`:`每隻${w}有 ${a} ${u}，${b} 隻${w}共有多少${u}？`;
  const q2=w==='單車'?`每輛單車有 ${a} 個輪，${b} 輛單車共有多少個輪？`:q;
  return o('times',q2,s,`每份 ${a}，有 ${b} 份，用乘法。`,`每份有 ${a}，有 ${b} 份，用乘法：${a}×${b}＝${s}。`,[a+b,s+a,s-a,s+b],`${a}*${b}`)}}});

// combinations
X.q.push({w:2,stages:W3,make:H=>{const {o,ri,pk}=H;return (r,p)=>{
  const c=cap(p),a=ri(r,2,c),b=ri(r,2,c),s=a*b;
  const T=[`${a} 件不同的上衣配 ${b} 條不同的褲子，一共有多少種配法？`,`${a} 款麵包配 ${b} 款飲品，各選一種，一共有多少種選法？`,`${a} 種顏色的杯和 ${b} 種顏色的碟，各選一個配成一套，一共有多少種配法？`,`${a} 種雪糕味道，每種味道可以配 ${b} 種脆餅，一共有多少種配搭？`];
  return o('times',pk(r,T),s,'每一款都可以配每一款，用乘法。',`${a} 款中的每一款，都可以配另外 ${b} 款中的任何一款，所以一共有 ${a}×${b}＝${s} 種。`,[a+b,s+a,s-b,s+b],`${a}*${b}`)}}});

// ── stage 3 only (numbers up to 81 may be printed from here on) ──
X.q.push({w:2,stages:[3],make:H=>{const {o,ri}=H;return (r,p)=>{
  const c=cap(p),a=ri(r,2,c),b=ri(r,2,c),s=a*b,f=ri(r,0,4);
  let q,x,k;
  if(f===0){q=`☐×${b}＝${s}，☐ 是多少？`;x=a;k=b}
  else if(f===1){q=`${a}×☐＝${s}，☐ 是多少？`;x=b;k=a}
  else if(f===2){q=`${s}＝☐×${b}，☐ 是多少？`;x=a;k=b}
  else if(f===3){q=`${s}＝${a}×☐，☐ 是多少？`;x=b;k=a}
  else {q=`${a} 乘多少等於 ${s}？`;x=b;k=a}
  return o('times',q,x,`想想：${k} 乘幾等於 ${s}？`,`逆向用九九乘法表：想「${k} 乘幾等於 ${s}」，${k}×${x}＝${s}，所以答案是 ${x}。`,[x+1,x-1,s,k,x+k],`${s}/${k}`)}}});
X.q.push({w:2,stages:[3],make:H=>{const {o,ri,pk}=H;return (r,p)=>{
  const c=cap(p),a=ri(r,2,c),b=ri(r,2,c),s=a*b,[cn,m,t]=pk(r,CT);
  const T=[`有 ${s} ${m}${t}，每${cn}放 ${a} ${m}，要放多少${cn}？`,`${s} ${m}${t}，每${cn}裝 ${a} ${m}，剛好裝滿多少${cn}？`];
  return o('times',pk(r,T),b,`想想：${a} 乘幾等於 ${s}？`,`每${cn} ${a} ${m}，想「${a} 乘幾等於 ${s}」：${a}×${b}＝${s}，所以要 ${b} ${cn}。`,[b+1,b-1,s,a,s-a],`${s}/${a}`)}}});
X.q.push({w:2,stages:[3],make:H=>{const {o,ri}=H;return (r,p)=>{
  const c=Math.min(8,cap(p)),a=ri(r,2,c),b=ri(r,2,c),s=a*b,f=ri(r,0,3);
  if(f===0)return o('times',`已知 ${a}×${b}＝${s}，那麼 ${a}×${b+1}＝？`,s+a,`${b+1} 個 ${a} 比 ${b} 個 ${a} 多一個 ${a}。`,`${a}×${b+1} 比 ${a}×${b} 多一個 ${a}：${s}＋${a}＝${s+a}。`,[s+b,s+1,s,s+a+1],`${s}+${a}`);
  if(f===1)return o('times',`已知 ${a}×${b}＝${s}，那麼 ${a}×${b-1}＝？`,s-a,`${b-1} 個 ${a} 比 ${b} 個 ${a} 少一個 ${a}。`,`${a}×${b-1} 比 ${a}×${b} 少一個 ${a}：${s}－${a}＝${s-a}。`,[s-b,s-1,s,s-a+1],`${s}-${a}`);
  if(f===2)return o('times',`已知 ${a}×${b}＝${s}，那麼 ${a+1}×${b}＝？`,s+b,`${a+1} 個 ${b} 比 ${a} 個 ${b} 多一個 ${b}。`,`${a+1}×${b} 比 ${a}×${b} 多一個 ${b}：${s}＋${b}＝${s+b}。`,[s+a,s+1,s,s+b+1],`${s}+${b}`);
  return o('times',`已知 ${a}×${b}＝${s}，那麼 ${b}×${a}＝？`,s,'兩個數交換位置，積不變。',`乘法交換位置，積不變：${b}×${a}＝${a}×${b}＝${s}。`,[s+a,s-a,s+b,a+b],`${b}*${a}`)}}});

// ── division (stages 3-4) ──
// share to people with the sharer included
X.q.push({w:2,stages:[3,4],make:H=>{const {o,ri,pk,nm,IT}=H;return (r,p)=>{
  const c=cap(p),b=ri(r,3,Math.max(4,c)),q=ri(r,2,c),s=b*q,m=nm(r),[i,u]=pk(r,IT),f=ri(r,0,1);
  const T=f?`${s} ${u}${i}平均分給 ${b} 位朋友，每位朋友得到多少${u}？`:`${m}和 ${b-1} 位朋友把 ${s} ${u}${i}平均分了，每人得到多少${u}？`;
  return o('share',T,q,'平均分用除法。',`平均分用除法：${s}÷${b}＝${q}，每人得到 ${q} ${u}。檢查：${b}×${q}＝${s}。`,[q+1,q-1,s-b,b,s],`${s}/${b}`)}}});

// equal packing into containers, find per-container
X.q.push({w:2,stages:[3,4],make:H=>{const {o,ri,pk}=H;return (r,p)=>{
  const c=cap(p),b=ri(r,2,c),q=ri(r,2,c),s=b*q,[cn,m,t]=pk(r,BX);
  return o('share',`${s} ${m}${t}平均裝入 ${b} 個${cn}，每個${cn}裝多少${m}？`,q,'平均分用除法。',`平均分用除法：${s}÷${b}＝${q}，每個${cn}裝 ${q} ${m}。檢查：${b}×${q}＝${s}。`,[q+1,q-1,s-b,b],`${s}/${b}`)}}});

// how many groups
X.q.push({w:2,stages:[3,4],make:H=>{const {o,ri,pk}=H;return (r,p)=>{
  const c=cap(p),a=ri(r,2,c),b=ri(r,2,c),s=a*b,[cn,m,t]=pk(r,CT);
  const T=[`有 ${s} ${m}${t}，每${cn}放 ${a} ${m}，可以放滿多少${cn}？`,`${s} ${m}${t}，每 ${a} ${m}分成一組，可以分成多少組？`,`把 ${s} ${m}${t}每 ${a} ${m}放成一${cn}，一共有多少${cn}？`];
  return o('div',pk(r,T),b,`想想：${a} 乘幾等於 ${s}？`,`每份 ${a}，看 ${s} 裏有多少個 ${a}，用除法：${s}÷${a}＝${b}（因為 ${a}×${b}＝${s}），所以有 ${b} 份。`,[b+1,b-1,a,s-a],`${s}/${a}`)}}});

// missing number in a division sentence
X.q.push({w:2,stages:[3,4],make:H=>{const {o,ri}=H;return (r,p)=>{
  const c=cap(p),b=ri(r,2,c),q=ri(r,2,c),s=b*q,f=ri(r,0,2);
  if(f===0)return o('div',`☐÷${b}＝${q}，☐ 是多少？`,s,`除法倒轉：☐＝${q}×${b}。`,`除法和乘法互逆：☐÷${b}＝${q}，所以 ☐＝${q}×${b}＝${s}。檢查：${s}÷${b}＝${q}。`,[q+b,s+b,s-b,q],`${q}*${b}`);
  if(f===1)return o('div',`${s}÷☐＝${q}，☐ 是多少？`,b,`想想：${q} 乘幾等於 ${s}？`,`${s}÷☐＝${q}，即 ${q}×☐＝${s}，想「${q} 乘幾等於 ${s}」，${q}×${b}＝${s}，所以 ☐ 是 ${b}。`,[q,b+1,b-1,s-q],`${s}/${q}`);
  return o('div',`某數除以 ${b}，商是 ${q}（沒有餘數），這個數是多少？`,s,`商乘除數，就是原來的數。`,`沒有餘數：這個數＝商×除數＝${q}×${b}＝${s}。檢查：${s}÷${b}＝${q}。`,[q+b,s+b,s-b,q],`${q}*${b}`)}}});

// relation between ×  and ÷
X.q.push({w:2,stages:[3,4],make:H=>{const {o,ri}=H;return (r,p)=>{
  const c=cap(p),a=ri(r,2,c),b=ri(r,2,c),s=a*b,f=ri(r,0,3);
  const k=f%2?b:a,x=f%2?a:b;
  const q=f<2?`已知 ${a}×${b}＝${s}，那麼 ${s}÷${k}＝？`:`因為 ${a}×${b}＝${s}，所以 ${s}÷${k} 的商是多少？`;
  return o('div',q,x,'乘法和除法是互逆的。',`${a}×${b}＝${s}，把乘法倒轉：${s}÷${k}＝${x}（因為 ${k}×${x}＝${s}）。`,[k,s,x+1,x-1],`${s}/${k}`)}}});

// unit price (division)
X.q.push({w:2,stages:[3,4],make:H=>{const {o,ri,pk,nm}=H;return (r,p)=>{
  const c=cap(p),b=ri(r,2,c),q=ri(r,2,c),s=b*q,m=nm(r),[it,u]=pk(r,PRICE);
  return o('share',`${m}用 ${s} 元買了 ${b} ${u}同價的${it}，每${u}多少元？（答案只寫數字）`,q,'總錢數 ÷ 數量。',`每${u}的價錢＝總錢數÷數量：${s}÷${b}＝${q}，每${u} ${q} 元。檢查：${b}×${q}＝${s}。`,[q+1,q-1,s-b,b],`${s}/${b}`)}}});

// ── remainder (stage 5) ──
const RPACK=[['粒','糖','袋'],['隻','雞蛋','盒'],['張','貼紙','份'],['枝','鉛筆','筒'],['本','書','疊'],['個','橙','籃']];
X.q.push({w:2,stages:[5],make:H=>{const {o,ri,pk}=H;return (r,p)=>{
  const c=cap(p),b=ri(r,2,c),q=ri(r,2,c),m=ri(r,1,b-1),a=b*q+m,[u,t,cn]=pk(r,RPACK),f=ri(r,0,2);
  const base=`${a} ${u}${t}，每${cn}裝 ${b} ${u}`;
  if(f===0)return o('quotient',`${base}，最多可以裝滿多少${cn}？`,q,'找最大的倍數而不超過總數。',`${b}×${q}＝${b*q}，${b}×${q+1}＝${b*(q+1)} 已超過 ${a}，所以最多裝滿 ${q} ${cn}，餘下 ${m} ${u}。`,[q+1,q-1,m,q+2],`(${a}-${m})/${b}`);
  if(f===1)return o('remainder',`${base}，裝滿幾${cn}後，還剩下多少${u}${t}？`,m,'先找最接近而不超過的倍數。',`${a}÷${b}＝${q} 餘 ${m}：裝滿 ${q} ${cn}用了 ${b*q}，${a}－${b*q}＝${m}，還剩 ${m} ${u}。`,[q,m+1,b-m,q+m],`${a}%${b}`);
  return o('quotient',`${base}，全部裝完（最後一${cn}可以不滿），最少需要多少${cn}？`,q+1,'有剩餘的也要多用一個。',`${a}÷${b}＝${q} 餘 ${m}，裝滿 ${q} ${cn}還剩 ${m} ${u}，剩下的也要多用一${cn}，所以最少要 ${q+1} ${cn}。`,[q,q+2,m,q-1],`(${a}-${m})/${b}+1`)}}});

X.q.push({w:2,stages:[5],make:H=>{const {o,ri,pk,nm,IT}=H;return (r,p)=>{
  const c=cap(p),b=ri(r,2,c),q=ri(r,2,c),m=ri(r,1,b-1),a=b*q+m,n=nm(r),[i,u]=pk(r,IT),f=ri(r,0,1);
  return f?o('quotient',`${n}把 ${a} ${u}${i}平均分給 ${b} 個人，每人最多分到多少${u}？`,q,'每人分到的數量要相同。',`${a}÷${b}＝${q} 餘 ${m}，每人最多分到 ${q} ${u}，餘下 ${m} ${u}分不了。`,[q+1,q-1,m,q+2],`(${a}-${m})/${b}`)
    :o('remainder',`${n}把 ${a} ${u}${i}平均分給 ${b} 個人，每人分到的數量相同，最後剩下多少${u}？`,m,'分剩的就是餘數。',`${a}÷${b}＝${q} 餘 ${m}：每人 ${q} ${u}共分出 ${b*q}，${a}－${b*q}＝${m}，剩下 ${m} ${u}。`,[q,m+1,b-m,q+m],`${a}%${b}`)}}});

X.q.push({w:2,stages:[5],make:H=>{const {o,ri}=H;return (r,p)=>{
  const c=cap(p),b=ri(r,2,c),q=ri(r,2,c),m=ri(r,1,b-1),a=b*q+m,f=ri(r,0,3);
  if(f===0)return o('remainder',`某數除以 ${b}，商是 ${q}，餘數是 ${m}，這個數是多少？`,a,'被除數＝商×除數＋餘數。',`被除數＝商×除數＋餘數：${q}×${b}＋${m}＝${b*q}＋${m}＝${a}。`,[b*q,q+b+m,a+1,a-1],`${q}*${b}+${m}`);
  if(f===1)return o('remainder',`${a} 最少再加多少，才可以被 ${b} 整除？`,b-m,'先找出餘數，再看還差多少。',`${a}÷${b}＝${q} 餘 ${m}，再補 ${b}－${m}＝${b-m}，就湊成 ${b*(q+1)}，剛好被 ${b} 整除。`,[m,b-m+1,b-m-1>0?b-m-1:b+1,q],`${b}-${m}`);
  if(f===2)return o('remainder',`${a}÷${b}＝${q} 餘 ${m}，用乘法檢驗：${b}×${q}＋${m}＝？`,a,'檢驗：商×除數＋餘數。',`${b}×${q}＝${b*q}，再加餘數 ${m}：${b*q}＋${m}＝${a}，剛好是被除數，所以計算正確。`,[b*q,a+1,a-1,b*q-m],`${b}*${q}+${m}`);
  return o('remainder',`一個數除以 ${b}，餘數最大可以是多少？`,b-1,'餘數一定比除數小。',`餘數一定比除數小，除數是 ${b}，餘數最大是 ${b}－1＝${b-1}。`,[b,b+1,b-2>0?b-2:b+2,1],`${b}-1`)}}});

// ════════════════ 世界4 ════════════════
const dmaxF=p=>Math.min(12,5+Math.round(8*p.s));
// ── stage 0: fraction of a set ──
const S4=[
  (m,t,n,d)=>`${m}有 ${t} 粒糖，吃了其中的 ${n}/${d}，吃了多少粒？`,
  (m,t,n,d)=>`一盒有 ${t} 枝顏色筆，其中 ${n}/${d} 是紅色的，紅色的有多少枝？`,
  (m,t,n,d)=>`班上有 ${t} 位同學，其中 ${n}/${d} 戴眼鏡，戴眼鏡的有多少位？`,
  (m,t,n,d)=>`${t} 個氣球中，${n}/${d} 是藍色的，藍色氣球有多少個？`,
  (m,t,n,d)=>`書架上有 ${t} 本書，借出了 ${n}/${d}，借出了多少本？`,
  (m,t,n,d)=>`果籃裏有 ${t} 個水果，其中 ${n}/${d} 是橙，橙有多少個？`,
  (m,t,n,d)=>`天空中有 ${t} 隻小鳥，${n}/${d} 飛走了，飛走了多少隻？`,
  (m,t,n,d)=>`農場有 ${t} 隻動物，${n}/${d} 是雞，雞有多少隻？`];
const R4=[
  (m,t,n,d)=>`${m}有 ${t} 粒糖，吃了其中的 ${n}/${d}，還剩下多少粒？`,
  (m,t,n,d)=>`書架上有 ${t} 本書，借出了 ${n}/${d}，書架上還剩下多少本？`,
  (m,t,n,d)=>`班上有 ${t} 位同學，${n}/${d} 是男生，女生有多少位？`,
  (m,t,n,d)=>`${t} 個氣球中，${n}/${d} 爆破了，沒有爆破的有多少個？`,
  (m,t,n,d)=>`水桶裝了 ${t} 公升水，用去了 ${n}/${d}，還剩下多少公升？`,
  (m,t,n,d)=>`一條 ${t} 厘米長的緞帶，剪去了 ${n}/${d}，還剩下多少厘米？`];
const dpick=(r,p,ri,pk)=>{const L=[2,3,4,5,6,8,10].slice(0,Math.max(4,3+Math.round(4*p.s)));return pk(r,L)};
const kmaxF=p=>Math.min(12,4+Math.round(9*p.s));
X.q.push({w:3,stages:[0],make:H=>{const {o,ri,pk,nm}=H;return (r,p)=>{
  const d=dpick(r,p,ri,pk),k=ri(r,2,kmaxF(p)),t=d*k,n=ri(r,1,d-1),s=n*k,m=nm(r);
  return o('frac-of',pk(r,S4)(m,t,n,d),s,`先求 1/${d} 是多少。`,`先求 1 份：把 ${t} 平均分成 ${d} 份，${t}÷${d}＝${k}；再取 ${n} 份：${k}×${n}＝${s}。`,[k,t-s,s+k,s-k>0?s-k:s+1],`${t}/${d}*${n}`)}}});
X.q.push({w:3,stages:[0],make:H=>{const {o,ri,pk,nm}=H;return (r,p)=>{
  const d=dpick(r,p,ri,pk),k=ri(r,2,kmaxF(p)),t=d*k,n=ri(r,1,d-1),s=(d-n)*k,m=nm(r);
  return o('frac-of',pk(r,R4)(m,t,n,d),s,`先求 1/${d} 是多少，再看還剩幾份。`,`把 ${t} 平均分成 ${d} 份，每份 ${t}÷${d}＝${k}。用去 ${n} 份，還剩 ${d}－${n}＝${d-n} 份：${k}×${d-n}＝${s}。`,[k*n,t,s+k,s-k>0?s-k:s+1],`${t}/${d}*${d-n}`)}}});
X.q.push({w:3,stages:[0],make:H=>{const {o,ri,pk,nm}=H;return (r,p)=>{
  const d=dpick(r,p,ri,pk),k=ri(r,2,kmaxF(p)),t=d*k,m=nm(r),f=ri(r,0,3),n=ri(r,2,d-1>1?d-1:2);
  if(f===0)return o('frac-of',`某數的 1/${d} 是 ${k}，這個數是多少？`,t,`1 份是 ${k}，一共有 ${d} 份。`,`1/${d} 是 ${k}，整體有 ${d} 份，每份 ${k}：${k}×${d}＝${t}。`,[k+d,k,t+k,t-k],`${k}*${d}`);
  if(f===1)return o('frac-of',`${m}把一些糖果平均分成 ${d} 份，其中 1 份是 ${k} 粒，全部糖果有多少粒？`,t,`有幾份，每份幾粒？`,`平均分成 ${d} 份，每份 ${k} 粒，全部是 ${d} 份：${k}×${d}＝${t} 粒。`,[k+d,k,t+k,t-k],`${k}*${d}`);
  if(f===2)return o('frac-of',`一條繩子的 1/${d} 長 ${k} 厘米，這條繩子有多長？（答案只寫數字，單位：厘米）`,t,`1 份是 ${k}，一共有 ${d} 份。`,`1/${d} 是 ${k} 厘米，整條繩子是 ${d} 份：${k}×${d}＝${t} 厘米。`,[k+d,k,t+k,t-k],`${k}*${d}`);
  return o('frac-of',`某數的 ${n}/${d} 是 ${n*k}，這個數是多少？`,t,`先求 1/${d} 是多少。`,`${n} 份是 ${n*k}，1 份是 ${n*k}÷${n}＝${k}；整體有 ${d} 份：${k}×${d}＝${t}。`,[n*k,k,t+k,n*k+d],`${n*k}/${n}*${d}`)}}});
// ── stage 1: equivalent fractions ──
const bmaxF=p=>Math.min(9,5+Math.round(4*p.s)),kmaxE=p=>Math.min(6,4+Math.round(3*p.s));
const eqPick=(r,p,ri,gcd)=>{let b,a;for(let t=0;t<40;t++){b=ri(r,2,bmaxF(p));a=ri(r,1,b-1);if(gcd(a,b)===1)break}if(gcd(a,b)!==1){a=1}return [a,b,ri(r,2,kmaxE(p))]};
X.q.push({w:3,stages:[1],make:H=>{const {o,ri,gcd}=H;return (r,p)=>{
  const [a,b,k]=eqPick(r,p,ri,gcd),f=ri(r,0,3);
  if(f===0)return o('frac-eq',`${a}/${b}＝${a*k}/☐，☐ 是多少？`,b*k,'分子乘幾倍，分母也乘幾倍。',`分子由 ${a} 變成 ${a*k}，乘了 ${k}；分數的值不變，分母也要乘 ${k}：${b}×${k}＝${b*k}。`,[b+k,b,b*k+1,b*k-1],`${b}*${k}`);
  if(f===1)return o('frac-eq',`${a*k}/${b*k}＝☐/${b}，☐ 是多少？`,a,'分母除以幾，分子也除以幾。',`分母由 ${b*k} 變成 ${b}，除以了 ${k}；分數的值不變，分子也除以 ${k}：${a*k}÷${k}＝${a}。`,[a*k,a+k,a+1,Math.max(1,a-1)===a?a+2:Math.max(1,a-1)],`${a*k}/${k}`);
  if(f===2)return o('frac-eq',`${a*k}/${b*k}＝${a}/☐，☐ 是多少？`,b,'分子除以幾，分母也除以幾。',`分子由 ${a*k} 變成 ${a}，除以了 ${k}；分數的值不變，分母也除以 ${k}：${b*k}÷${k}＝${b}。`,[b*k,b+k,b+1,Math.max(2,b-1)],`${b*k}/${k}`);
  return o('frac-eq',`${a}/${b}＝☐/${b*k}，☐ 是多少？`,a*k,'分母乘幾倍，分子也乘幾倍。',`分母由 ${b} 變成 ${b*k}，乘了 ${k}；分數的值不變，分子也要乘 ${k}：${a}×${k}＝${a*k}。`,[a+k,a,a*k+1,a*k-1],`${a}*${k}`)}}});
X.q.push({w:3,stages:[1],make:H=>{const {o,ri,pk,gcd}=H;return (r,p)=>{
  const [a,b,k]=eqPick(r,p,ri,gcd),f=ri(r,0,3);
  const T=[
    [`把一個薄餅平均切成 ${b} 件，${a>1?'吃了':'吃了'} ${a} 件。若改為平均切成 ${b*k} 件，要吃多少件才一樣多？`,'薄餅'],
    [`一塊巧克力平均分成 ${b} 份，取了 ${a} 份。如果把它平均分成 ${b*k} 份，要取多少份，分量才相同？`,'巧克力'],
    [`一條緞帶平均分成 ${b} 段，剪下 ${a} 段。若改為平均分成 ${b*k} 段，要剪下多少段才一樣長？`,'緞帶'],
    [`一幅圖畫平均分成 ${b} 格，塗了 ${a} 格。若平均分成 ${b*k} 格，要塗多少格，塗色部分才一樣大？`,'圖畫'],
    [`一杯果汁倒入 ${b} 格量杯的 ${a} 格。若換成有 ${b*k} 格的量杯，要倒到第幾格，分量才一樣？`,'量杯'],
    [`一個蛋糕平均切成 ${b} 塊，${a} 塊是 ${a}/${b}。若改為平均切成 ${b*k} 塊，${a}/${b} 即是多少塊？`,'蛋糕']];
  const [q]=pk(r,T);
  return o('frac-eq',q,a*k,'份數變多了，每份變小，要取的份數也要乘同一個倍數。',`每份分成 ${k} 小份，所以份數都乘 ${k}：總份數 ${b}×${k}＝${b*k}，取的份數 ${a}×${k}＝${a*k}。${a}/${b}＝${a*k}/${b*k}，要取 ${a*k}。`,[a+k,a,a*k+1,a*k-1],`${a}*${k}`)}}});
X.q.push({w:3,stages:[1],make:H=>{const {o,ri,gcd}=H;return (r,p)=>{
  const [a,b,k]=eqPick(r,p,ri,gcd),f=ri(r,0,3);
  if(f===0)return o('frac-eq',`把 ${a}/${b} 的分子和分母同時乘 ${k}，新分數的分母是多少？`,b*k,`分母也要乘 ${k}。`,`分子分母同乘 ${k}，分數的值不變：分母 ${b}×${k}＝${b*k}，新分數是 ${a*k}/${b*k}。`,[b+k,b,a*k,b*k+1],`${b}*${k}`);
  if(f===1)return o('frac-eq',`把 ${a}/${b} 的分子和分母同時乘 ${k}，新分數的分子是多少？`,a*k,`分子也要乘 ${k}。`,`分子分母同乘 ${k}，分數的值不變：分子 ${a}×${k}＝${a*k}，新分數是 ${a*k}/${b*k}。`,[a+k,a,b*k,a*k+1],`${a}*${k}`);
  if(f===2)return o('frac-eq',`把 ${a*k}/${b*k} 的分子和分母同時除以 ${k}，新分數的分子是多少？`,a,`分子除以 ${k}。`,`分子分母同除以 ${k}，分數的值不變：${a*k}÷${k}＝${a}，新分數是 ${a}/${b}。`,[a*k,a+k,b,a+1],`${a*k}/${k}`);
  return o('frac-eq',`把 ${a*k}/${b*k} 的分子和分母同時除以 ${k}，新分數的分母是多少？`,b,`分母除以 ${k}。`,`分子分母同除以 ${k}，分數的值不變：${b*k}÷${k}＝${b}，新分數是 ${a}/${b}。`,[b*k,b+k,a,b+1],`${b*k}/${k}`)}}});

// ── stages 2-3: same-denominator addition ──
const S4ADD=[
  (m,a,b,d)=>[`${m}喝了 ${a}/${d} 杯牛奶，又喝了 ${b}/${d} 杯牛奶，一共喝了多少杯？`,'杯'],
  (m,a,b,d)=>[`水壺先倒入 ${a}/${d} 公升水，再倒入 ${b}/${d} 公升水，現在共有多少公升水？`,'公升'],
  (m,a,b,d)=>[`${m}用了 ${a}/${d} 米長的緞帶包禮物，又用了 ${b}/${d} 米長的緞帶打結，一共用了多少米？`,'米'],
  (m,a,b,d)=>[`一個蛋糕，${m}吃了 ${a}/${d}，哥哥吃了 ${b}/${d}，兩人一共吃了這個蛋糕的幾分之幾？`,''],
  (m,a,b,d)=>[`一塊地，${a}/${d} 種了花，${b}/${d} 種了菜，種花和種菜的地方合共佔這塊地的幾分之幾？`,''],
  (m,a,b,d)=>[`${m}星期六做了 ${a}/${d} 小時功課，星期日做了 ${b}/${d} 小時功課，兩天一共做了多少小時？`,'小時'],
  (m,a,b,d)=>[`${m}第一日讀了一本書的 ${a}/${d}，第二日讀了 ${b}/${d}，兩日一共讀了這本書的幾分之幾？`,''],
  (m,a,b,d)=>[`米缸裏本來有 ${a}/${d} 公斤米，媽媽再倒入 ${b}/${d} 公斤，現在共有多少公斤？`,'公斤']];
const addPick=(r,p,ri,min)=>{const d=ri(r,min||3,Math.max(min||3,dmaxF(p))+(min?1:0)),a=ri(r,1,d-2),b=ri(r,1,d-1-a);return [d,a,b]};
const fracAddExplain=(H,a,b,d)=>{const g=H.gcd(a+b,d);return `分母相同（都是 ${d} 份），只把分子相加：${a}＋${b}＝${a+b}，得 ${a+b}/${d}；${g>1?`分子分母同除以 ${g}，化簡得 ${H.fr(a+b,d)}`:'已經是最簡分數，不用再化簡'}。`};
X.q.push({w:3,stages:[2,3],make:H=>{const {o,ri,pk,nm,fr}=H;return (r,p)=>{
  const [d,a,b]=addPick(r,p,ri),m=nm(r),[q0]=pk(r,S4ADD)(m,a,b,d),ask=/幾分之幾/.test(q0);
  return o('frac-eq',q0+'（答案寫成最簡分數，例如 3/4）',fr(a+b,d),'分母相同，只加分子。',fracAddExplain(H,a,b,d),[`${a+b}/${2*d}`,`${a*b}/${d}`,`${a+b+1}/${d}`,`${a+b}/${d+1}`],null,null,'simplest')}}});
X.q.push({w:3,stages:[2,3],make:H=>{const {o,ri,pk,fr}=H;return (r,p)=>{
  const [d,a,b]=addPick(r,p,ri),f=ri(r,0,4),c=a+b;
  if(f===0)return o('frac-eq',`${a}/${d}＋☐/${d}＝${c}/${d}，☐ 是多少？`,b,'分母相同，想想分子要加多少。',`分母相同，只看分子：總共 ${c}，已有 ${a}，另一個分子是 ${c}－${a}＝${b}。檢查：${a}/${d}＋${b}/${d}＝${c}/${d}。`,[c,a,b+1,c+a],`${c}-${a}`);
  if(f===1)return o('frac-eq',`☐/${d}＋${b}/${d}＝${c}/${d}，☐ 是多少？`,a,'分母相同，想想分子要加多少。',`分母相同，只看分子：總共 ${c}，已有 ${b}，另一個分子是 ${c}－${b}＝${a}。檢查：${a}/${d}＋${b}/${d}＝${c}/${d}。`,[c,b,a+1,c+b],`${c}-${b}`);
  if(f===2)return o('frac-eq',`${a}/${d}＋☐/${d}＝1，☐ 是多少？`,d-a,`1 就是 ${d}/${d}。`,`1＝${d}/${d}，分母相同只看分子：總共 ${d}，已有 ${a}，另一個分子是 ${d}－${a}＝${d-a}。`,[a,d,d-a+1,d-a-1>0?d-a-1:d+1],`${d}-${a}`);
  if(f===3)return o('frac-eq',`${a}/${d} 是 ${a} 個 1/${d}，${b}/${d} 是 ${b} 個 1/${d}，合起來是多少個 1/${d}？`,a+b,`一共有幾個 1/${d}？`,`${a} 個加 ${b} 個，一共 ${a}＋${b}＝${a+b} 個 1/${d}，即 ${a+b}/${d}。`,[a*b,a+b+1,a+b-1,d],`${a}+${b}`);
  return o('frac-eq',`${a}/${d}＋${b}/${d} 的分子是多少？（不用化簡，只寫相加後的分子）`,a+b,'分母相同，只加分子。',`分母相同（都是 ${d} 份），只把分子相加：${a}＋${b}＝${a+b}，得 ${a+b}/${d}。`,[a*b,a+b+1,a+b-1,d],`${a}+${b}`)}}});
// three addends, sum stays below one whole
X.q.push({w:3,stages:[2,3],make:H=>{const {o,ri,pk,nm,fr}=H;return (r,p)=>{
  let d,a,b,c;
  for(let t=0;t<60;t++){d=ri(r,5,Math.max(6,dmaxF(p)));a=ri(r,1,d-3);b=ri(r,1,d-2);c=ri(r,1,d-2);if(a+b+c<=d-1)break}
  if(a+b+c>d-1){d=7;a=1;b=2;c=3}
  const m=nm(r),s=a+b+c;
  const T=[`${a}/${d}＋${b}/${d}＋${c}/${d}＝？（答案寫成最簡分數，例如 3/4）`,
    `${m}第一日走了 ${a}/${d} 公里，第二日走了 ${b}/${d} 公里，第三日走了 ${c}/${d} 公里，三日一共走了多少公里？（答案寫成最簡分數，例如 3/4）`,
    `把 ${a}/${d}、${b}/${d}、${c}/${d} 三個分數加起來是多少？（答案寫成最簡分數，例如 3/4）`];
  const g=H.gcd(s,d);
  return o('frac-eq',pk(r,T),fr(s,d),'分母相同，把三個分子加起來。',`分母相同（都是 ${d} 份），只把分子相加：${a}＋${b}＋${c}＝${s}，得 ${s}/${d}；${g>1?`分子分母同除以 ${g}，化簡得 ${fr(s,d)}`:'已經是最簡分數，不用再化簡'}。`,[`${s}/${2*d}`,`${s+1}/${d}`,`${s}/${d+1}`,`${a*b*c}/${d}`],null,null,'simplest')}}});

// subtraction (stage 3)
const S4SUB=[
  (m,a,b,d)=>`水壺裏有 ${a}/${d} 公升水，倒出了 ${b}/${d} 公升，還剩下多少公升？`,
  (m,a,b,d)=>`${m}有一條 ${a}/${d} 米長的緞帶，剪去了 ${b}/${d} 米，還剩下多少米？`,
  (m,a,b,d)=>`冰箱裏有 ${a}/${d} 盒雪糕，${m}吃了 ${b}/${d} 盒，還剩下多少盒？`,
  (m,a,b,d)=>`${m}做了 ${a}/${d} 小時功課，其中 ${b}/${d} 小時是數學，其他科目做了多少小時？`,
  (m,a,b,d)=>`一袋米有 ${a}/${d} 公斤，用去了 ${b}/${d} 公斤，還剩下多少公斤？`,
  (m,a,b,d)=>`${m}有 ${a}/${d} 個蛋糕，分了 ${b}/${d} 個給朋友，還剩下多少個？`];
const subPick=(r,p,ri)=>{const d=ri(r,3,dmaxF(p)),a=ri(r,2,d-1),b=ri(r,1,a-1);return [d,a,b]};
const subExplain=(H,a,b,d)=>{const g=H.gcd(a-b,d);return `分母相同（都是 ${d} 份），只把分子相減：${a}－${b}＝${a-b}，得 ${a-b}/${d}；${g>1?`分子分母同除以 ${g}，化簡得 ${H.fr(a-b,d)}`:'已經是最簡分數，不用再化簡'}。`};
X.q.push({w:3,stages:[3],make:H=>{const {o,ri,pk,nm,fr}=H;return (r,p)=>{
  const [d,a,b]=subPick(r,p,ri),m=nm(r);
  return o('frac-eq',pk(r,S4SUB)(m,a,b,d)+'（答案寫成最簡分數，例如 3/4）',fr(a-b,d),'分母相同，只減分子。',subExplain(H,a,b,d),[`${a-b}/${d*2}`,`${a-b}/${d-1<2?d+1:d-1}`,`${a+b}/${d}`,`${a-b+1}/${d}`],null,null,'simplest')}}});
X.q.push({w:3,stages:[3],make:H=>{const {o,ri,pk,fr}=H;return (r,p)=>{
  const [d,a,b]=subPick(r,p,ri),c=a-b,f=ri(r,0,5);
  if(f===0)return o('frac-eq',`${a}/${d}－☐/${d}＝${c}/${d}，☐ 是多少？`,b,'分母相同，想想分子要減多少。',`分母相同，只看分子：原有 ${a}，剩下 ${c}，減去的分子是 ${a}－${c}＝${b}。檢查：${a}/${d}－${b}/${d}＝${c}/${d}。`,[c,a,b+1,a+c],`${a}-${c}`);
  if(f===1)return o('frac-eq',`☐/${d}－${b}/${d}＝${c}/${d}，☐ 是多少？`,a,'分母相同，想想原來的分子是多少。',`分母相同，只看分子：減去 ${b} 後剩 ${c}，原來的分子是 ${c}＋${b}＝${a}。檢查：${a}/${d}－${b}/${d}＝${c}/${d}。`,[c,b,a+1,a-1],`${c}+${b}`);
  if(f===2)return o('frac-eq',`1－${b}/${d}＝？（答案寫成最簡分數，例如 3/4）`,fr(d-b,d),`1 就是 ${d}/${d}。`,`1＝${d}/${d}。分母相同，只把分子相減：${d}－${b}＝${d-b}，得 ${d-b}/${d}${H.gcd(d-b,d)>1?`，化簡得 ${fr(d-b,d)}`:''}。`,[`${d-b}/${d*2}`,`${b}/${d}`,`${d-b+1}/${d}`,`${d-b}/${d+1}`],null,null,'simplest');
  if(f===3)return o('frac-eq',`${a}/${d} 比 ${b}/${d} 多多少？（答案寫成最簡分數，例如 3/4）`,fr(c,d),'求相差，用減法。',subExplain(H,a,b,d),[`${c}/${d*2}`,`${a+b}/${d}`,`${c+1}/${d}`,`${c}/${d+1}`],null,null,'simplest');
  if(f===4)return o('frac-eq',`${a}/${d} 減去 ${b}/${d} 是多少？（答案寫成最簡分數，例如 3/4）`,fr(c,d),'分母相同，只減分子。',subExplain(H,a,b,d),[`${c}/${d*2}`,`${a+b}/${d}`,`${c+1}/${d}`,`${c}/${d+1}`],null,null,'simplest');
  return o('frac-eq',`${a} 個 1/${d} 減去 ${b} 個 1/${d}，還剩多少個 1/${d}？`,c,`${a} 個減 ${b} 個。`,`都是 1/${d}，只比個數：${a}－${b}＝${c}，還剩 ${c} 個 1/${d}，即 ${c}/${d}。`,[a+b,c+1,c-1>0?c-1:c+2,d],`${a}-${b}`)}}});

// ── stage 4: fraction / decimal ──
const G1L=[...Array.from({length:9},(_,i)=>(i+1)*10),25,75,5,4,8,12,16,15,35,45,28,36,24,32]; // hundredths (10 = 0.1 ...)
X.q.push({w:3,stages:[4],make:H=>{const {o,ri,pk,fr,fx}=H;return (r,p)=>{
  const n=Math.max(11,12+Math.round(p.s*11)),m=pk(r,G1L.slice(0,n)),x=fx(m/100),a=fr(m,100),tenth=m%10===0;
  const T=[`${x} 化成分數是多少？（答案寫成最簡分數，例如 3/4）`,`把小數 ${x} 寫成最簡分數是多少？（答案寫成最簡分數，例如 3/4）`,`${x} 用最簡分數表示是多少？（答案寫成最簡分數，例如 3/4）`];
  return o('dec-add',pk(r,T),a,tenth?`${x} 是 ${m/10} 個十分之一。`:`${x} 是 ${m} 個百分之一。`,(tenth?`${x} 是 ${m/10} 個十分之一，即 ${m/10}/10`:`${x} 是 ${m} 個百分之一，即 ${m}/100`)+(H.gcd(m,100)>1&&!(tenth&&H.gcd(m/10,10)===1)?`；分子分母同除以 ${tenth?H.gcd(m/10,10):H.gcd(m,100)}，化簡得 ${a}。`:'，已經是最簡分數。'),[`${m}/10`,`${m}/1000`,`1/${m}`,`${m}/${tenth?100:10}`],null,null,'simplest')}}});
X.q.push({w:3,stages:[4],make:H=>{const {o,ri,pk,fx}=H;return (r,p)=>{
  const hundred=p.s>.4&&r()<.5,u=hundred?.01:.1;
  const mx=hundred?Math.min(99,20+Math.round(p.s*60)):Math.min(99,12+Math.round(p.s*40)),k=ri(r,2,mx),x=fx(k*u),un=hundred?'0.01':'0.1',f=ri(r,0,2);
  const q=f===0?`${x} 是由多少個 ${un} 組成的？`:f===1?`${x} 是多少個 ${un}？`:`☐ 個 ${un} 是 ${x}，☐ 是多少？`;
  return o('dec-add',q,k,`${un} 就是${hundred?'百':'十'}分之一。`,`${un} 是${hundred?'百':'十'}分之一，${x}＝${k}/${hundred?100:10}，即有 ${k} 個 ${un}。`,[k+1,k-1,k*10,Math.max(1,Math.round(k/10))===k?k+2:Math.max(1,Math.round(k/10))],null,[`${k}`])}}});
X.q.push({w:3,stages:[4],make:H=>{const {o,ri,pk,fx}=H;return (r,p)=>{
  const U=[['米',100,'厘米'],['公斤',1000,'克'],['元',10,'角'],['公里',1000,'米'],['小時',60,'分鐘']];
  const [u,f,v]=pk(r,U);let x,s;
  if(u==='小時'){x=pk(r,[.5,.25,.75,.1,.2,.3,.4,.6,.7,.8,.9]);s=f*x}
  else if(u==='米'){x=ri(r,1,p.s>.4?99:9)/(p.s>.4?100:10);s=f*x}
  else if(u==='元'){x=ri(r,1,9)/10;s=f*x}
  else {x=pk(r,[.1,.2,.3,.4,.5,.6,.7,.8,.9].concat(p.s>.4?[.25,.75,.05,.15]:[]));s=f*x}
  s=Math.round(s*1e6)/1e6;
  const un=u==='米'?'0.01':u==='元'?'0.1':null,fm=x=>fx(x);
  const q=u==='元'?`${fm(x)} 元是多少角？（1 元＝10 角）`:`${fm(x)} ${u}是多少${v}？（1 ${u}＝${f} ${v}）`;
  return o('dec-add',q,s,`1 ${u}＝${f} ${v}，小數乘 ${f}。`,`1 ${u}＝${f} ${v}，所以 ${fm(x)} ${u}＝${fm(x)}×${f}＝${s} ${v}。`,[s*10,s/10,s+1,s-1>0?s-1:s+2],`${fm(x)}*${f}`)}}});
const G4L=[[1,2],[1,4],[3,4],[1,5],[2,5],[3,5],[4,5],[1,10],[3,10],[7,10],[9,10],[1,8],[3,8],[1,20],[3,20],[1,25],[2,25],[1,50]];
X.q.push({w:3,stages:[4],make:H=>{const {o,ri,pk,fx}=H;return (r,p)=>{
  const l=G4L.slice(0,7+Math.round(p.s*(G4L.length-7))),[a,b]=pk(r,l),v=fx(a/b),pw=[10,100,1000].find(x=>x%b===0);
  const T=[
    `一條緞帶長 ${a}/${b} 米，用小數表示是多少米？（答案寫成小數）`,
    `一瓶水有 ${a}/${b} 公升，用小數表示是多少公升？（答案寫成小數）`,
    `一個蛋糕重 ${a}/${b} 公斤，用小數表示是多少公斤？（答案寫成小數）`,
    `學校離家 ${a}/${b} 公里，用小數表示是多少公里？（答案寫成小數）`,
    `${a}/${b} 用小數表示是多少？（答案寫成小數）`,
    `把分數 ${a}/${b} 寫成小數是多少？（答案寫成小數）`];
  return o('dec-add',pk(r,T),v,`把分母變成 10 或 100，或做 ${a}÷${b}。`,(b===pw?`分母已經是 ${pw}，${a}/${b}＝${v}。`:`把分母 ${b} 變成 ${pw}：分子分母同乘 ${pw/b}，${a}/${b}＝${a*pw/b}/${pw}＝${v}。`)+`（也可以做除法：${a}÷${b}＝${v}）`,[a/b*10,a/b/10,a/b+.1,a/b+.5],null,null,'dec')}}});
X.q.push({w:3,stages:[4],make:H=>{const {o,ri,pk,fx}=H;return (r,p)=>{
  const hundred=p.s>.4&&r()<.6,n=hundred?ri(r,1,99):ri(r,1,9),dn=hundred?100:10,v=fx(n/dn);
  const T=[`${n}/${dn} 化成小數是多少？（答案寫成小數）`,`把 ${n}/${dn} 寫成小數是多少？（答案寫成小數）`,`${n}/${dn} 用小數表示是多少？（答案寫成小數）`];
  return o('dec-add',pk(r,T),v,`分母是 ${dn}，就是${hundred?'百':'十'}分之幾。`,`分母是 ${dn}：${n}/${dn} 就是 ${n} 個${hundred?'百':'十'}分之一，寫成小數是 ${v}。`,[n/dn*10,n/dn/10,n/dn+.1,n],null,null,'dec')}}});
// compare decimals: tenths vs hundredths
X.q.push({w:3,stages:[4],make:H=>{const {o,ri,pk,fx}=H;return (r,p)=>{
  let x,y;
  for(let t=0;t<30;t++){x=ri(r,1,9)/10;y=ri(r,1,p.s>.3?99:19)/100;if(Math.abs(x-y)>1e-9)break}
  if(Math.abs(x-y)<1e-9)y=.45;
  const sw=r()<.5,a=sw?y:x,b=sw?x:y,big=Math.max(a,b),sm=Math.min(a,b),big2=fx(big),f=ri(r,0,1);
  return o('dec-add',f?`${fx(a)} 和 ${fx(b)} 哪個較大？（答案寫成小數）`:`比較 ${fx(a)} 與 ${fx(b)} 的大小，較大的數是多少？`,big2,'先把兩個小數寫成相同的位數再比較。',`把小數位數補齊：${fx(a)}＝${(a*100).toFixed(0)}/100，${fx(b)}＝${(b*100).toFixed(0)}/100。${(big*100).toFixed(0)} 比 ${(sm*100).toFixed(0)} 大，所以較大的是 ${big2}。`,[fx(sm),fx(big+.1),fx(big/10),fx(a+b)],null,null,'dec')}}});

// ── stage 5: decimal addition ──
const dScale=p=>p.s>.6?100:10;
const dRange=p=>dScale(p)===10?Math.min(60,8+Math.round(52*p.s)):Math.min(600,60+Math.round(540*(p.s-.6)/.4));
const dFmt=(x,u)=>(x/u).toFixed(u===10?1:2);
const D5=[
  (m,a,b)=>[`${m}買了 ${a} 公斤蘋果和 ${b} 公斤橙，一共買了多少公斤？`],
  (m,a,b)=>[`${m}跑步，早上跑了 ${a} 公里，下午跑了 ${b} 公里，今日一共跑了多少公里？`],
  (m,a,b)=>[`一條紅絲帶長 ${a} 米，一條藍絲帶長 ${b} 米，兩條接起來共長多少米？`],
  (m,a,b)=>[`水壺有 ${a} 公升水，再加入 ${b} 公升，現在共有多少公升水？`],
  (m,a,b)=>[`${m}的書包重 ${a} 公斤，放入一本重 ${b} 公斤的書後，書包重多少公斤？`],
  (m,a,b)=>[`${m}早上做功課用了 ${a} 小時，晚上用了 ${b} 小時，一共用了多少小時？`],
  (m,a,b)=>[`一枝鉛筆長 ${a} 厘米，一枝間尺長 ${b} 厘米，兩者首尾相連共長多少厘米？`],
  (m,a,b)=>[`容器裏有 ${a} 公升果汁，${m}再倒入 ${b} 公升，現在共有多少公升？`]];
X.q.push({w:3,stages:[5],make:H=>{const {o,ri,pk,nm,fx}=H;return (r,p)=>{
  const u=dScale(p),hi=dRange(p),A=ri(r,1,hi),B=ri(r,1,hi),dg=u===10?1:2,s=fx((A+B)/u),m=nm(r),un=u===10?'0.1':'0.01';
  const [q]=pk(r,D5)(m,dFmt(A,u),dFmt(B,u));
  return o('dec-add',q,s,'小數點要對齊，再逐位相加。',`小數點對齊再加：${dFmt(A,u)}＋${dFmt(B,u)}，${dFmt(A,u)} 是 ${A} 個 ${un}，${dFmt(B,u)} 是 ${B} 個 ${un}，合共 ${A+B} 個 ${un}，即 ${s}。`,[(A+B)/u+1,(A+B)/u-1,(A+B)/(u*10),A+B],`${fx(A/u)}+${fx(B/u)}`,[((A+B)/u).toFixed(dg)])}}});
X.q.push({w:3,stages:[5],make:H=>{const {o,ri,pk,fx}=H;return (r,p)=>{
  const u=dScale(p),hi=dRange(p),A=ri(r,1,hi),B=ri(r,1,hi),dg=u===10?1:2,S=A+B,f=ri(r,0,3),un=u===10?'0.1':'0.01';
  const fa=dFmt(A,u),fb=dFmt(B,u),fs=dFmt(S,u);
  if(f===0)return o('dec-add',`${fa}＋☐＝${fs}，☐ 是多少？`,fx(B/u),'總數減去已知的一份。',`缺少的一份＝總數－已知的一份：${fs}－${fa}＝${fx(B/u)}。檢查：${fa}＋${fx(B/u)}＝${fs}。`,[(B+1)/u,(B-1)/u,S/u,fx(A/u)],`${fx(S/u)}-${fx(A/u)}`,[(B/u).toFixed(dg)]);
  if(f===1)return o('dec-add',`☐＋${fb}＝${fs}，☐ 是多少？`,fx(A/u),'總數減去已知的一份。',`缺少的一份＝總數－已知的一份：${fs}－${fb}＝${fx(A/u)}。檢查：${fx(A/u)}＋${fb}＝${fs}。`,[(A+1)/u,(A-1)/u,S/u,fx(B/u)],`${fx(S/u)}-${fx(B/u)}`,[(A/u).toFixed(dg)]);
  if(f===2)return o('dec-add',`${fa} 和 ${fb} 的和是多少？`,fx(S/u),'小數點對齊，逐位相加。',`小數點對齊再加：${fa} 是 ${A} 個 ${un}，${fb} 是 ${B} 個 ${un}，合共 ${S} 個 ${un}，即 ${fx(S/u)}。`,[(S+1)/u,(S-1)/u,S/(u*10),S],`${fx(A/u)}+${fx(B/u)}`,[(S/u).toFixed(dg)]);
  return o('dec-add',`一個數是 ${fa}，另一個數比它多 ${fb}，另一個數是多少？`,fx(S/u),'「多」就是加。',`比 ${fa} 多 ${fb}，用加法：${fa}＋${fb}＝${fx(S/u)}。`,[(S+1)/u,(S-1)/u,S/(u*10),Math.abs(A-B)/u],`${fx(A/u)}+${fx(B/u)}`,[(S/u).toFixed(dg)])}}});
X.q.push({w:3,stages:[5],make:H=>{const {o,ri,pk,nm,fx}=H;return (r,p)=>{
  const u=dScale(p),hi=Math.max(6,Math.round(dRange(p)*.6)),A=ri(r,1,hi),B=ri(r,1,hi),C=ri(r,1,hi),dg=u===10?1:2,S=A+B+C,m=nm(r);
  const fa=dFmt(A,u),fb=dFmt(B,u),fc=dFmt(C,u);
  const T=[`${fa}＋${fb}＋${fc}＝？`,`${m}三次跳遠分別跳了 ${fa} 米、${fb} 米、${fc} 米，三次一共跳了多少米？`,`三條絲帶分別長 ${fa} 米、${fb} 米、${fc} 米，連起來共長多少米？`];
  return o('dec-add',pk(r,T),fx(S/u),'小數點對齊，由左至右逐步相加。',`由左至右：${fa}＋${fb}＝${fx((A+B)/u)}，再加 ${fc}：${fx((A+B)/u)}＋${fc}＝${fx(S/u)}。`,[(S+1)/u,(S-1)/u,S/(u*10),(A+B)/u],`${fx(A/u)}+${fx(B/u)}+${fx(C/u)}`,[(S/u).toFixed(dg)])}}});
})();
