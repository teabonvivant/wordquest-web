
// R3.31 variety: extra templates for 數學 世界1 (w=0, 小一二 20/100 以內加減) and 世界2 (w=1, 兩位數加減、乘法入門、補到 100).
// Same level as the existing templates (numbers scale with p.s), only new question types / wordings / scenes.
(function(){'use strict';
const X=(globalThis.WQ37MathX=globalThis.WQ37MathX||{q:[]});
const D13=[1,2,3];

// scenes: [place, thing, classifier, "more arrive", "some leave"]
const SC=[['樹上','小鳥','隻','又飛來','飛走了'],['池塘裏','小鴨','隻','又游來','游走了'],['公園裏','小朋友','位','又來了','回家了'],['草地上','小白兔','隻','又跳來','跳走了'],
  ['魚缸裏','金魚','條','又放入','被撈走了'],['停車場','汽車','輛','又駛入','駛走了'],['書架上','故事書','本','又放上','被借走了'],['籃子裏','蘋果','個','又放入','被拿走了'],
  ['課室裏','男同學','位','又走進','走出去了'],['農場裏','母雞','隻','又買入','賣走了']];
const EM=[['🍎','蘋果','個'],['🍌','香蕉','隻'],['🍓','士多啤梨','粒'],['🐟','魚','條'],['🎈','氣球','個'],['⭐','星星','粒'],['🌸','花','朵'],['🐥','小雞','隻']];
const TS=[['盒','糖果','粒'],['袋','橙','個'],['盤','餃子','隻'],['束','花','枝'],['包','餅乾','塊'],['排','樹','棵'],['輛車','乘客','位'],['籃','雞蛋','隻'],['行','座位','個'],['箱','汽水','枝']];
const LEG=[[4,'隻','小狗','條','腿'],[2,'隻','小鳥','條','腿'],[4,'隻','小貓','條','腿'],[2,'輛','單車','個','輪'],[3,'輛','三輪車','個','輪'],[4,'張','椅子','條','腳'],[4,'張','桌子','條','腳'],
  [5,'隻','手','隻','手指'],[2,'位','小朋友','隻','眼睛'],[2,'位','小朋友','隻','耳朵']];
const SHOP=[['雪糕','枝'],['橡皮擦','個'],['小蛋糕','個'],['鉛筆','枝'],['氣球','個'],['麵包','個']];
const STK=[['書','本'],['蛋糕','個'],['氣球','個'],['雪糕','枝'],['貼紙','張'],['彈珠','粒']];

// numbers.  cfg.w 1: whole-number parts, total <= cap (cap grows with p.s, stays inside 「20 以內」 for the first two stages).  cfg.w 2: two-digit parts.
const cap=(p,w)=>w===1?(p.stage<=1?Math.min(20,Math.round(8+p.s*35)):Math.min(99,Math.round(8+p.s*85))):Math.min(99,Math.round(26+p.s*110));
const pairAdd=(H,r,p,w)=>{const {ri}=H,c=cap(p,w),lo=w===1?1:10,a=ri(r,lo,c-lo),b=ri(r,lo,c-a);return [a,b]};
// total t, part b, answer t-b
const pairSub=(H,r,p,w)=>{const {ri}=H,c=cap(p,w);if(w===1){const t=ri(r,3,c);return [t,ri(r,1,t-1)]}const t=ri(r,20,c);return [t,ri(r,10,t-1)]};
const two=(H,r)=>{const a=H.nm(r);let b=H.nm(r);for(let t=0;t<30&&b===a;t++)b=H.nm(r);return [a,b]};
const wr=(s,a,b)=>[s+1,s-1,s+10,s-10,a+b,Math.abs(a-b)].filter(v=>v!==s&&v>0);
const yy=(H,r,p)=>{const hi=Math.min(9,2+Math.max(3,Math.round(8*p.s))),lo=Math.min(hi,2+Math.round((hi-2)*.3));return H.ri(r,lo,hi)};
const addEx=(H,a,b)=>H.addHow(a,b),subEx=(H,a,b)=>H.subHow(a,b);

// ── generators: each returns (r,p)=>o(...) with one fixed skill name ──
const G={
addScene:(w,sk)=>H=>(r,p)=>{const {o,pk,ri,nm}=H,[a,b]=pairAdd(H,r,p,w),s=a+b,[pl,th,u,av]=pk(r,SC),m=nm(r),f=ri(r,0,2);
  const q=f===0?`${pl}有 ${a} ${u}${th}，${av} ${b} ${u}，現在一共有多少${u}${th}？`:f===1?`${pl}原來有 ${a} ${u}${th}，${av} ${b} ${u}，${pl}現在共有多少${u}？`:`${m}數一數，${pl}有 ${a} ${u}${th}。${av} ${b} ${u}後，${pl}共有多少${u}${th}？`;
  return o(sk,q,s,`「${av.replace('又','')}」即是多了，用加法。`,`多了一些，用加法：${a}＋${b}＝${s}。${addEx(H,a,b)}`,wr(s,a,b),`${a}+${b}`)},
subScene:(w,sk)=>H=>(r,p)=>{const {o,pk,ri,nm}=H,[t,b]=pairSub(H,r,p,w),s=t-b,[pl,th,u,av,sv]=pk(r,SC),m=nm(r),f=ri(r,0,2);
  const q=f===0?`${pl}有 ${t} ${u}${th}，${sv} ${b} ${u}，還剩下多少${u}${th}？`:f===1?`${pl}原來有 ${t} ${u}${th}，${sv} ${b} ${u}，${pl}現在還有多少${u}？`:`${m}數一數，${pl}有 ${t} ${u}${th}。有 ${b} ${u}${sv}之後，${pl}還剩多少${u}${th}？`;
  return o(sk,q,s,`「${sv.replace('被','')}」即是少了，用減法。`,`少了一些，用減法：${t}－${b}＝${s}。${subEx(H,t,b)}`,wr(s,t,b).concat([t+b]),`${t}-${b}`)},
cmp:(w,sk)=>H=>(r,p)=>{const {o,pk,ri}=H,[m1,m2]=two(H,r),[i,u]=pk(r,H.IT),subOnly=w===1?p.stage===2:p.stage===1,addOnly=w===2&&p.stage===0;let f=addOnly?pk(r,[3,5]):ri(r,0,5);if(subOnly&&(f===3||f===5))f=ri(r,0,2);
  if(f===5){const [a,b]=pairAdd(H,r,p,w),s=a+b;return o(sk,`${m1}有 ${a} ${u}${i}，${m2}有 ${b} ${u}${i}，兩人一共有多少${u}？`,s,'兩人的合起來，用加法。',`兩人合起來，用加法：${a}＋${b}＝${s}。${addEx(H,a,b)}`,wr(s,a,b),`${a}+${b}`)}
  if(f===3){const [a,b]=pairAdd(H,r,p,w),s=a+b;return o(sk,`${m1}有 ${a} ${u}${i}，${m2}比${m1}多 ${b} ${u}，${m2}有多少${u}${i}？`,s,`「比${m1}多」即是${m1}的數量再加上 ${b}。`,`${m2}比${m1}多 ${b} ${u}，用加法：${a}＋${b}＝${s}。${addEx(H,a,b)}`,wr(s,a,b),`${a}+${b}`)}
  const [t,b]=pairSub(H,r,p,w),s=t-b;
  if(f===0)return o(sk,`${m1}有 ${t} ${u}${i}，${m2}有 ${b} ${u}${i}，${m1}比${m2}多多少${u}？`,s,'比較多出的部分，用減法：大數減小數。',`求「多多少」用減法：${t}－${b}＝${s}，${m1}比${m2}多 ${s} ${u}。${subEx(H,t,b)}`,wr(s,t,b).concat([t+b]),`${t}-${b}`);
  if(f===1)return o(sk,`${m1}有 ${t} ${u}${i}，${m2}有 ${b} ${u}${i}，${m2}比${m1}少多少${u}？`,s,'比較少了的部分，也是用減法。',`求「少多少」也用減法：${t}－${b}＝${s}，${m2}比${m1}少 ${s} ${u}。${subEx(H,t,b)}`,wr(s,t,b).concat([t+b]),`${t}-${b}`);
  if(f===2)return o(sk,`${m1}有 ${t} ${u}${i}，${m2}有 ${b} ${u}${i}，要多給${m2}多少${u}，兩人才一樣多？`,s,'兩人要一樣多，想想相差多少。',`要一樣多，就要補上相差的數量：${t}－${b}＝${s}，所以要多給${m2} ${s} ${u}。${subEx(H,t,b)}`,wr(s,t,b).concat([t+b]),`${t}-${b}`);
  return o(sk,`${m1}有 ${t} ${u}${i}，比${m2}多 ${b} ${u}，${m2}有多少${u}${i}？`,s,`「比${m2}多」，所以${m2}的比${m1}少。`,`${m1}比${m2}多 ${b} ${u}，${m2}的就是${m1}的減去 ${b}：${t}－${b}＝${s}。${subEx(H,t,b)}`,wr(s,t,b).concat([t+b]),`${t}-${b}`)},
wfAdd:(w,sk)=>H=>(r,p)=>{const {o,ri}=H,[a,b]=pairAdd(H,r,p,w),s=a+b,f=ri(r,0,4);
  const q=[`比 ${a} 大 ${b} 的數是多少？`,`${a} 和 ${b} 的和是多少？`,`由 ${a} 開始，向上數 ${b} 個數，會數到哪個數？`,`${a} 再多 ${b} 是多少？`,`把 ${a} 加上 ${b}，得多少？`][f];
  return o(sk,q,s,['「大 b」即是加上 b。','「和」就是加起來的結果。','向上數，數字會愈來愈大。','「再多」即是加上。','「加上」就用加法。'][f],`${f===2?'向上數就是加：':''}${a}＋${b}＝${s}。${addEx(H,a,b)}`,wr(s,a,b),`${a}+${b}`)},
wfSub:(w,sk)=>H=>(r,p)=>{const {o,ri}=H,[t,b]=pairSub(H,r,p,w),s=t-b,f=ri(r,0,4);
  const q=[`比 ${t} 小 ${b} 的數是多少？`,`${t} 和 ${b} 相差多少？`,`由 ${t} 開始，倒數 ${b} 個數，會數到哪個數？`,`從 ${t} 中減去 ${b}，得多少？`,`${t} 減去 ${b} 是多少？`][f];
  return o(sk,q,s,['「小 b」即是減去 b。','「相差」即是大數減小數。','倒數，數字會愈來愈小。','「減去」就用減法。','用大數減去小數。'][f],`${f===2?'倒數就是減：':f===1?'求相差用大數減小數：':''}${t}－${b}＝${s}。${subEx(H,t,b)}`,wr(s,t,b).concat([t+b]),`${t}-${b}`)},
// missing number, addition flavour: a＋☐＝c, ☐＋b＝c, c＝a＋☐, how many more needed, how many were there at first
missAdd:(w,sk)=>H=>(r,p)=>{const {o,pk,ri,nm}=H,[a,b]=pairAdd(H,r,p,w),c=a+b,m=nm(r),[i,u]=pk(r,H.IT),f=ri(r,0,5);
  const e=`缺少的一份＝總數－已知的一份：${c}－${a}＝${b}。檢查：${a}＋${b}＝${c}。`,wA=[c+a,a,b+1,b-1>0?b-1:b+2,c];
  if(f===0)return o(sk,`${a}＋☐＝${c}，☐ 是多少？`,b,'想想：總數減去已知的一份。',e,wA,`${c}-${a}`);
  if(f===1)return o(sk,`${c}＝${a}＋☐，☐ 是多少？`,b,'想想：總數減去已知的一份。',e,wA,`${c}-${a}`);
  if(f===2)return o(sk,`${m}有 ${a} ${u}${i}，想有 ${c} ${u}，還差多少${u}？`,b,'還差多少，用總數減去已有的。',`還差的＝想要的－已有的：${c}－${a}＝${b}，還差 ${b} ${u}。${subEx(H,c,a)}`,wA,`${c}-${a}`);
  if(f===3)return o(sk,`${m}有一些${i}，又得到 ${b} ${u}後，一共有 ${c} ${u}，原來有多少${u}？`,a,'原來的＝後來的總數－得到的。',`原來的＝總數－後來得到的：${c}－${b}＝${a}，原來有 ${a} ${u}。${subEx(H,c,b)}`,[c+b,b,a+1,a-1>0?a-1:a+2],`${c}-${b}`);
  if(f===4)return o(sk,`☐＋${b}＝${c}，☐ 是多少？`,a,'想想：總數減去已知的一份。',`缺少的一份＝總數－已知的一份：${c}－${b}＝${a}。檢查：${a}＋${b}＝${c}。`,[c+b,b,a+1,a-1>0?a-1:a+2,c],`${c}-${b}`);
  const col=pk(r,['紅','黃','綠','藍']),ob=pk(r,['球','珠子','積木','氣球']);
  return o(sk,`盒子裏有 ${c} 個${ob}，其中 ${a} 個是${col}色的，其餘不是${col}色，不是${col}色的有多少個？`,b,'全部減去那一部分，就是其餘的。',`其餘的＝全部－那一部分：${c}－${a}＝${b}。${subEx(H,c,a)}`,wA,`${c}-${a}`)},
// missing number, subtraction flavour: c－☐＝a, ☐－b＝a, c－a＝☐
missSub:(w,sk)=>H=>(r,p)=>{const {o,pk,ri,nm}=H,[t,b]=pairSub(H,r,p,w),a=t-b,m=nm(r),[i,u]=pk(r,H.IT),f=ri(r,0,4);
  if(f===0)return o(sk,`${t}－☐＝${a}，☐ 是多少？`,b,`想想：${t} 減去幾等於 ${a}？`,`被減去的數＝${t}－${a}＝${b}。檢查：${t}－${b}＝${a}。`,[t+a,a,b+1,b-1>0?b-1:b+2],`${t}-${a}`);
  if(f===1)return o(sk,`☐－${b}＝${a}，☐ 是多少？`,t,`想想：什麼數減去 ${b} 剩下 ${a}？`,`原來的數＝剩下的＋減去的：${a}＋${b}＝${t}。檢查：${t}－${b}＝${a}。`,[a-b>0?a-b:a+b+1,b,t+1,t-1],`${a}+${b}`);
  if(f===2)return o(sk,`${a}＝${t}－☐，☐ 是多少？`,b,`想想：${t} 減去幾等於 ${a}？`,`被減去的數＝${t}－${a}＝${b}。檢查：${t}－${b}＝${a}。`,[t+a,a,b+1,b-1>0?b-1:b+2],`${t}-${a}`);
  if(f===3)return o(sk,`${m}有 ${t} ${u}${i}，送給同學一些後還剩 ${a} ${u}，送出了多少${u}？`,b,'送出的＝原來的－剩下的。',`送出的＝原來的－剩下的：${t}－${a}＝${b}，送出了 ${b} ${u}。${subEx(H,t,a)}`,[t+a,a,b+1,b-1>0?b-1:b+2],`${t}-${a}`);
  return o(sk,`${m}有一些${i}，送出 ${b} ${u}後還剩 ${a} ${u}，原來有多少${u}？`,t,'原來的＝剩下的＋送出的。',`原來的＝剩下的＋送出的：${a}＋${b}＝${t}，原來有 ${t} ${u}。${addEx(H,a,b)}`,[a-b>0?a-b:a+b+1,b,t+1,t-1],`${a}+${b}`)},
// pictures of emoji (world 1 only)
emoji:(w,sk)=>H=>(r,p)=>{const {o,pk,ri,nm}=H,c=Math.min(20,cap(p,1)),[E,th,u]=pk(r,EM),f=ri(r,0,3);
  if(f===0){const [a,b]=pairAdd(H,r,Object.assign({},p,{stage:Math.min(p.stage,1)}),1),s=a+b;return o(sk,`圖中有 ${E.repeat(a)}，再加 ${b} ${u}${th}，一共有多少${u}${th}？`,s,'先數圖中有幾個，再加上新加的。',`先數出圖中有 ${a} ${u}，再加 ${b} ${u}：${a}＋${b}＝${s}。`,wr(s,a,b),`${a}+${b}`)}
  const t=ri(r,3,c),b=ri(r,1,t-1),s=t-b;
  if(f===1)return o(sk,`圖中有 ${E.repeat(t)}，拿走 ${b} ${u}${th}，還剩下多少${u}${th}？`,s,'先數圖中有幾個，再減去拿走的。',`先數出圖中有 ${t} ${u}，拿走 ${b} ${u}：${t}－${b}＝${s}。`,wr(s,t,b).concat([t+b]),`${t}-${b}`);
  if(f===2){const [m1,m2]=two(H,r);return o(sk,`數一數：${E.repeat(t)}。其中 ${b} ${u}是${m1}的，其餘是${m2}的，${m2}有多少${u}${th}？`,s,'先數出全部，再減去另一個人的。',`全部有 ${t} ${u}，${m1}有 ${b} ${u}，${m2}的就是 ${t}－${b}＝${s}。`,wr(s,t,b).concat([t+b]),`${t}-${b}`)}
  const E2=pk(r,EM.filter(e=>e[0]!==E));return o(sk,`上行：${E.repeat(t)}，下行：${E2[0].repeat(b)}，上行比下行多幾個？`,s,'兩行各數一數，再比較。',`上行有 ${t} 個，下行有 ${b} 個，多出的：${t}－${b}＝${s}。`,wr(s,t,b).concat([t+b]),`${t}-${b}`)},
// make 10 (world 1 only)
bond10:(w,sk)=>H=>(r,p)=>{const {o,pk,ri,nm}=H,a=ri(r,1,9),s=10-a,m=nm(r),[i,u]=pk(r,H.IT),f=ri(r,0,4);
  const e=`10 可以分成 ${a} 和 ${s}：${a}＋${s}＝10，所以要 ${s}。`,wo=[s+1,s-1>0?s-1:s+2,a,10,s+2];
  if(f===0)return o(sk,`☐＋${a}＝10，☐ 是多少？`,s,`想想：${a} 加幾等於 10？`,e,wo,`10-${a}`);
  if(f===1)return o(sk,`${a} 和多少合起來是 10？`,s,`想想：${a} 加幾等於 10？`,e,wo,`10-${a}`);
  if(f===2)return o(sk,`${m}有 ${a} ${u}${i}，要湊成 10 ${u}，還要多少${u}？`,s,`想想：${a} 加幾等於 10？`,e,wo,`10-${a}`);
  if(f===3)return o(sk,`10 可以分成 ${a} 和多少？`,s,`想想：${a} 加幾等於 10？`,e,wo,`10-${a}`);
  return o(sk,`手上有 10 ${u}${i}，其中 ${a} ${u}給了弟弟，其餘留給自己，自己有多少${u}？`,s,'10 減去給了弟弟的。',`其餘的＝10－${a}＝${s}。`,wo,`10-${a}`)},
// ── world 2 : to 100 ──
to100:(w,sk)=>H=>(r,p)=>{const {o,pk,ri,nm,sh}=H,sp=85,t=10+Math.max(5,Math.round(sp*p.s)),lo=10+Math.round(sp*p.s*.25),a=ri(r,Math.min(lo,t),t),s=100-a,m=nm(r),[th,u]=pk(r,STK),f=ri(r,0,7),
  m10=Math.ceil(a/10)*10,c1=m10-a,e=c1&&m10<100?`先補到整十：${a}＋${c1}＝${m10}，再由 ${m10} 補到 100 要 ${100-m10}，一共補 ${c1}＋${100-m10}＝${s}。`:`缺少的數＝100－已有的數：100－${a}＝${s}。`,wo=[s+10,s-10,s+1,s-1,a,100+a];
  const q=[`☐＋${a}＝100，☐ 是多少？`,`100－${a}＝？`,`${m}有 ${a} 元，想買一件 100 元的玩具，還差多少元？`,`${m}想儲夠 100 元，已儲了 ${a} 元，還要再儲多少元？`,`一條繩長 100 厘米，剪去 ${a} 厘米，餘下多少厘米？`,
    `${m}有 100 ${u}${th}，用了 ${a} ${u}，還剩下多少${u}？`,`${a} 和多少合起來是 100？`,`100 比 ${a} 大多少？`][f];
  return o(sk,q,s,['想想：先補到下一個整十，再補到 100。','100 減去一個數，可以先補到整十。','還差多少，用 100 減去已有的。','還要多少，用 100 減去已有的。','剪去一部分，用減法。','用了一部分，用減法。','想想：先補到下一個整十，再補到 100。','比較大多少，用大數減小數。'][f],e,wo.filter(v=>v>0&&v!==s),`100-${a}`)},
// ── world 2 : intro multiplication ──
tmScene:sk=>H=>(r,p)=>{const {o,pk,ri,nm}=H,xs=[2,5,10,3,4].slice(0,2+Math.round(3*p.s)),x=pk(r,xs),y=yy(H,r,p),s=x*y,[c,th,u]=pk(r,TS),m=nm(r),f=ri(r,0,2);
  const q=f===0?`每${c}有 ${x} ${u}${th}，${y} ${c}共有多少${u}${th}？`:f===1?`${m}數了 ${y} ${c}，每${c}有 ${x} ${u}${th}，一共有多少${u}${th}？`:`一共有 ${y} ${c}，每${c}有 ${x} ${u}${th}，${th}共有多少${u}？`;
  return o(sk,q,s,'每份數量 × 份數。',`${y} 份，每份 ${x}，用乘法：${x}×${y}＝${s}。${H.timesHow(x,y)}`,[x+y,s+x,s-x,s+y,x*(y+1)],`${x}*${y}`)},
tmMoney:sk=>H=>(r,p)=>{const {o,pk,ri,nm}=H,xs=[2,5,10,3,4].slice(0,2+Math.round(3*p.s)),x=pk(r,xs),y=yy(H,r,p),s=x*y,[th,u]=pk(r,SHOP),m=nm(r),f=ri(r,0,2);
  const q=f===0?`一${u}${th}賣 ${x} 元，買 ${y} ${u}要多少元？`:f===1?`${m}每日儲 ${x} 元，${y} 日後共儲了多少元？`:`${m}買了 ${y} ${u}${th}，每${u}${x} 元，共付多少元？`;
  return o(sk,q,s,'每份的錢 × 份數。',`${y} 份，每份 ${x} 元，用乘法：${x}×${y}＝${s}，共 ${s} 元。${H.timesHow(x,y)}`,[x+y,s+x,s-x,s+y,x*(y+1)],`${x}*${y}`)},
tmLegs:sk=>H=>(r,p)=>{const {o,pk,ri}=H,xs=[2,5,10,3,4].slice(0,2+Math.round(3*p.s)),L=LEG.filter(z=>xs.includes(z[0])),[x,cl,no,pu,pn]=pk(r,L),y=yy(H,r,p),s=x*y;
  return o(sk,`每${cl}${no}有 ${x} ${pu}${pn}，${y} ${cl}${no}共有多少${pu}${pn}？`,s,'每份數量 × 份數。',`每${cl}有 ${x} ${pu}，${y} ${cl}就有 ${y} 個 ${x}，用乘法：${x}×${y}＝${s}。${H.timesHow(x,y)}`,[x+y,s+x,s-x,s+y,x*(y+1)],`${x}*${y}`)},
tmRows:sk=>H=>(r,p)=>{const {o,pk,ri,nm}=H,xs=[2,5,10,3,4].slice(0,2+Math.round(3*p.s)),x=pk(r,xs),y=yy(H,r,p),s=x*y,[i,u]=pk(r,H.IT),m=nm(r),f=ri(r,0,2);
  const q=f===0?`${m}把${i}排成 ${y} 行，每行放 ${x} ${u}，一共有多少${u}${i}？`:f===1?`禮堂有 ${y} 排座位，每排有 ${x} 個座位，一共有多少個座位？`:`${m}用${i}排成長方形，有 ${y} 列，每列 ${x} ${u}，共用了多少${u}${i}？`;
  return o(sk,q,s,'行數 × 每行的數量。',`${y} 行，每行 ${x}，用乘法：${x}×${y}＝${s}。${H.timesHow(x,y)}`,[x+y,s+x,s-x,s+y,x*(y+1)],`${x}*${y}`)},
tmPhrase:sk=>H=>(r,p)=>{const {o,ri}=H,xs=[2,5,10,3,4].slice(0,2+Math.round(3*p.s)),x=H.pk(r,xs),y=yy(H,r,p),s=x*y,f=ri(r,0,5),how=H.timesHow(x,y),ww=[x+y,s+x,s-x,s+y,x*(y+1)];
  if(f===0)return o(sk,`${y} 個 ${x} 是多少？`,s,`${y} 個 ${x} 就是 ${x}×${y}。`,`${y} 個 ${x} 相加，用乘法：${x}×${y}＝${s}。${how}`,ww,`${x}*${y}`);
  if(f===1)return o(sk,`${x} 乘 ${y} 等於多少？`,s,`「乘」就是 ${x}×${y}。`,`${x}×${y}＝${s}。${how}`,ww,`${x}*${y}`);
  if(f===2)return o(sk,`由 0 開始，每次加 ${x}，加 ${y} 次，會數到哪個數？`,s,`每次加 ${x}，加 ${y} 次，就是 ${y} 個 ${x}。`,`${y} 個 ${x} 相加，用乘法：${x}×${y}＝${s}。${how}`,ww,`${x}*${y}`);
  if(f===3)return o(sk,`${x}×☐＝${s}，☐ 是多少？`,y,`想想：${x} 乘幾等於 ${s}？`,`${x} 個 ${y} 是 ${s}，所以 ☐＝${y}。檢查：${x}×${y}＝${s}。`,[y+1,y-1,s-x,x,s/x===y?y+2:y],`${s}/${x}`);
  if(f===4)return o(sk,`☐×${x}＝${s}，☐ 是多少？`,y,`想想：幾個 ${x} 是 ${s}？`,`${y} 個 ${x} 是 ${s}，所以 ☐＝${y}。檢查：${y}×${x}＝${s}。`,[y+1,y-1,s-x,x,y+2],`${s}/${x}`);
  const sq=[1,2,3].map(k=>x*k).slice(0,Math.min(3,y-1)),nxt=sq.length+1;
  return o(sk,`${sq.join('、')}、☐，這排數每次加 ${x}，☐ 是多少？`,x*nxt,`每次加 ${x}，下一個數就是上一個加 ${x}。`,`每次加 ${x}：${sq[sq.length-1]}＋${x}＝${x*nxt}。這也是 ${nxt} 個 ${x}：${x}×${nxt}＝${x*nxt}。`,[x*nxt+x,x*nxt-x,x*(nxt+1),x+nxt],`${x}*${nxt}`)},
tmRepeat:sk=>H=>(r,p)=>{const {o,ri}=H,xs=[2,5,10,3,4].slice(0,2+Math.round(3*p.s)),x=H.pk(r,xs),y=yy(H,r,p),s=x*y,f=ri(r,0,3),ex=Array(y).fill(x).join('＋');
  if(f===0)return o(sk,`${ex}＝${x}×☐，☐ 是多少？`,y,`數一數一共有幾個 ${x} 相加。`,`${x} 一共加了 ${y} 次，可以寫成 ${x}×${y}，所以 ☐＝${y}。`,[y+1,y-1,s,x],`${y}`);
  if(f===1)return o(sk,`${ex}＝☐×${x}，☐ 是多少？`,y,`數一數一共有幾個 ${x} 相加。`,`${x} 一共加了 ${y} 次，即 ${y} 個 ${x}，寫成 ${y}×${x}，所以 ☐＝${y}。`,[y+1,y-1,s,x],`${y}`);
  if(f===2)return o(sk,`${y} 個 ${x} 相加，答案是多少？`,s,`${y} 個 ${x} 相加，可以用乘法。`,`${y} 個 ${x}：${ex}＝${s}，即 ${x}×${y}＝${s}。`,[x+y,s+x,s-x,s+y],`${x}*${y}`);
  return o(sk,`${ex}＝☐，☐ 是多少？`,s,`相同的數加了 ${y} 次，可以用乘法。`,`${x} 加了 ${y} 次，可以寫成乘法：${x}×${y}＝${s}。`,[x+y,s+x,s-x,s+y],`${x}*${y}`)}
};

// world 1 (w=0): diffs 1-3 only (the 'lo' line)
const W1=(stages,g,sk)=>X.q.push({w:0,stages,diffs:D13,make:G[g](1,sk)});
W1([0,1],'addScene','within20');
W1([0,1,2],'subScene','within20');
W1([0,1,2],'cmp','within20');
W1([0,1],'wfAdd','within20');
W1([0,1,2],'wfSub','within20');
W1([0,1,3],'missAdd','within20');
W1([0,1,2,3],'missSub','within20');
W1([0,1,2],'emoji','within20');
W1([0,1,2,3],'bond10','within20');
// world 2 (w=1): all difficulties
const W2=(stages,g,sk)=>X.q.push({w:1,stages,make:G[g](2,sk)});
W2([0],'addScene','add2');
W2([0],'wfAdd','add2');
W2([0],'missAdd','add2');
W2([0],'cmp','add2');
W2([1],'subScene','sub2');
W2([1],'wfSub','sub2');
W2([1],'missSub','sub2');
W2([1],'cmp','sub2');
W2([2],'to100','to100');
const T2=(stages,g,sk)=>X.q.push({w:1,stages,make:G[g](sk)});
T2([3,4,5],'tmScene','times-story');
T2([3,4,5],'tmMoney','times-story');
T2([3,4,5],'tmLegs','times');
T2([3,4,5],'tmRows','times-story');
T2([3,4],'tmPhrase','times');
T2([3,4],'tmRepeat','repeat-add');
})();

;
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

;
(function(){'use strict';
// R3.31 variety: extra templates for math world 5 (w=4: decimals, percent, average) and world 6 (w=5: perimeter, area, speed, ratio).
// Same level as the templates they sit beside (numbers use the same N() ranges); only the question types / wordings / contexts differ.
const X=(globalThis.WQ37MathX=globalThis.WQ37MathX||{q:[]});
const add=(w,stages,make)=>X.q.push({w,stages,make});
const D1=x=>(x/10).toFixed(1);
const two=(r,nm)=>{const a=nm(r);let b=nm(r);for(let i=0;i<20&&String(b)===String(a);i++)b=nm(r);return [a,b]};

// ───────────── World 5 (w=4) ─────────────
// stage 0: dec-mul
add(4,[0],H=>{const {o,pk,N,nm,fx}=H;
  const C=[['鉛筆','枝'],['雪糕','筒'],['橡皮','個'],['麵包','個'],['膠尺','把'],['筆記簿','本'],['汽水','罐'],['貼紙','包']];
  return (r,p)=>{const A=N(r,p,12,99),c=N(r,p,2,9),m=nm(r),[it,ms]=pk(r,C),s=fx(A*c/10),pr=D1(A);
    return o('dec-mul',`${m}買了 ${c} ${ms}${it}，每${ms} $${pr}，一共要付多少元？（答案只寫數字）`,s,'一共付的錢＝每件的價錢×件數。',`${c} ${ms}${it}，每${ms} $${pr}，要算 ${pr}×${c}。先當作整數乘：${A}×${c}＝${A*c}；${pr} 有 1 位小數，積也要有 1 位小數，所以是 ${s}（元）。`,[A*c/100,A*c,A*c/10+1,A*c/10-1],`${A/10}*${c}`,[(A*c/10).toFixed(1)])}});
add(4,[0],H=>{const {o,pk,N,fx}=H;
  return (r,p)=>{const A=N(r,p,12,99),c=N(r,p,2,9),x=fx(A*c/10),pr=D1(A),f=pk(r,[0,1]);
    return o('dec-mul',f?`${c}×☐＝${x}，☐ 是多少？`:`☐×${c}＝${x}，☐ 是多少？`,fx(A/10),'乘法倒轉就是除法。',`乘法倒轉用除法：☐＝${x}÷${c}。先當作整數除：${A*c}÷${c}＝${A}；${x} 有 ${x.includes('.')?'1':'0'} 位小數，商取 1 位小數，所以 ☐＝${pr}。檢查：${pr}×${c}＝${x}。`,[A*c/10-A/10,A/100,A/10+.1,A/10-.1],`${x}/${c}`,[pr])}});
add(4,[0],H=>{const {o,pk,N,fx}=H;
  const G=[
    (pr,c)=>`一根木條長 ${pr} 米，把 ${c} 根同樣的木條接起來，共長多少米？`,
    (pr,c)=>`每個水壺可盛 ${pr} 升水，${c} 個水壺共可盛多少升水？`,
    (pr,c)=>`每袋米重 ${pr} 公斤，${c} 袋米共重多少公斤？`,
    (pr,c)=>`一條絲帶長 ${pr} 米，用了 ${c} 條，絲帶一共有多少米長？`,
    (pr,c)=>`${pr} 的 ${c} 倍是多少？`,
    (pr,c)=>`${c} 個 ${pr} 相加，和是多少？`,
    (pr,c)=>`一塊磚頭厚 ${pr} 厘米，疊 ${c} 塊磚頭，總高度是多少厘米？`
  ];
  return (r,p)=>{const A=N(r,p,12,99),c=N(r,p,2,9),s=fx(A*c/10),pr=D1(A);
    return o('dec-mul',pk(r,G)(pr,c),s,'幾個相同的數相加，就用乘法。',`${c} 個 ${pr}，即 ${pr}×${c}。先當作整數乘：${A}×${c}＝${A*c}；${pr} 有 1 位小數，積也要有 1 位小數，所以是 ${s}。`,[A*c/100,A*c,A*c/10+1,A*c/10-1],`${A/10}*${c}`,[(A*c/10).toFixed(1)])}});

// stage 1: dec-div
add(4,[1],H=>{const {o,pk,N,nm,fx}=H;
  const G=[
    (a,c,m)=>`${m}有 ${a} 公斤白糖，平均分成 ${c} 包，每包重多少公斤？`,
    (a,c)=>`一條 ${a} 米長的繩，剪成 ${c} 段同樣長的，每段長多少米？`,
    (a,c)=>`一瓶 ${a} 升的果汁，平均倒進 ${c} 隻杯，每隻杯有多少升？`,
    (a,c)=>`${c} 枝同樣的鉛筆共 $${a}，每枝多少元？（答案只寫數字）`,
    (a,c)=>`${a} 公斤的米，平均裝入 ${c} 個袋，每袋多少公斤？`,
    (a,c,m)=>`${m}用 ${c} 小時行了 ${a} 公里，平均每小時行多少公里？`
  ];
  return (r,p)=>{const Q=N(r,p,2,60),c=N(r,p,2,9),A=Q*c,s=fx(Q/10),m=nm(r);
    return o('dec-div',pk(r,G)(D1(A),c,m),s,'平均分用除法。',`平均分用除法：${D1(A)}÷${c}。先當作整數除：${A}÷${c}＝${Q}；被除數有 1 位小數，商也有 1 位小數，所以是 ${s}。檢查：${s}×${c}＝${D1(A)}。`,[Q/100,Q,Q/10+1,Q/10+.1],`${A/10}/${c}`,[(Q/10).toFixed(1)])}});
add(4,[1],H=>{const {o,pk,N,fx}=H;
  return (r,p)=>{const Q=N(r,p,2,60),c=N(r,p,2,9),A=Q*c,q=fx(Q/10),s=fx(A/10);
    return o('dec-div',`☐÷${c}＝${q}，☐ 是多少？`,s,'除法倒轉就是乘法。',`除法倒轉用乘法：☐＝${q}×${c}。先當作整數乘：${Q}×${c}＝${A}；${q} 有 ${q.includes('.')?'1':'0'} 位小數，所以 ☐＝${D1(A)}。檢查：${D1(A)}÷${c}＝${q}。`,[A/100,A/10+.1,A/10-.1,Q/10+c],`${q}*${c}`,[D1(A)])}});
add(4,[1],H=>{const {o,pk,N,fx}=H;
  const G=[
    (a,c)=>`把 ${a} 平均分成 ${c} 份，每份是多少？`,
    (a,c)=>`${c} 個相同的數加起來是 ${a}，這個數是多少？`,
    (a,c)=>`${a} 裏面有 ${c} 個多少？`,
    (a,c)=>`${a} 除以 ${c}，商是多少？`
  ];
  return (r,p)=>{const Q=N(r,p,2,60),c=N(r,p,2,9),A=Q*c,s=fx(Q/10);
    return o('dec-div',pk(r,G)(D1(A),c),s,'先當作整數除，再放回小數點。',`先當作整數除：${A}÷${c}＝${Q}；被除數有 1 位小數，商也有 1 位小數，所以 ${D1(A)}÷${c}＝${s}。`,[Q/100,Q,Q/10+1,Q/10+.1],`${A/10}/${c}`,[(Q/10).toFixed(1)])}});

// stage 2: frac-pct
add(4,[2],H=>{const {o,pk,ri,nm,gcd}=H;
  const TL=[5,10,20,25,50];
  const G=[
    (T,a)=>`盒子裏有 ${T} 粒糖，其中 ${a} 粒是紅色的，紅色的糖佔全部的百分之幾？`,
    (T,a,m)=>`一份測驗共 ${T} 題，${m}答對了 ${a} 題，答對的題目佔全部的百分之幾？`,
    (T,a)=>`花園種了 ${T} 棵花，其中 ${a} 棵是玫瑰，玫瑰佔全部的百分之幾？`,
    (T,a)=>`一包有 ${T} 張卡片，其中 ${a} 張是閃卡，閃卡佔全部的百分之幾？`,
    (T,a)=>`一個圖案分成 ${T} 格，其中 ${a} 格塗了顏色，塗色部分佔全部的百分之幾？`
  ];
  return (r,p)=>{const T=pk(r,TL.slice(0,2+Math.round(3*p.s))),a=ri(r,1,T-1),m=nm(r),s=a*100/T;
    return o('frac-pct',`${pk(r,G)(T,a,m)}（答案只寫數字，單位：%）`,s,'先寫成分數，再把分母化成 100。',`佔全部的 ${a}/${T}。百分數的分母是 100：${T}×${100/T}＝100，分子也乘 ${100/T}：${a}×${100/T}＝${s}，所以是 ${s}%。`,[a*T,s/10,100-s,s+10],`${a}*100/${T}`)}});
add(4,[2],H=>{const {o,pk,ri,nm}=H;
  const G=[
    (T,a)=>`有 ${T} 個蘋果，吃了 ${a} 個，沒有吃的佔全部的百分之幾？`,
    (T,a)=>`一本書共 ${T} 頁，已經看了 ${a} 頁，未看的佔全部的百分之幾？`,
    (T,a)=>`一桶水有 ${T} 升，用了 ${a} 升，剩下的佔全部的百分之幾？`,
    (T,a)=>`一盒有 ${T} 支顏色筆，其中 ${a} 支寫不出，仍可使用的佔全部的百分之幾？`,
    (T,a,m)=>`${m}有 ${T} 張貼紙，送了 ${a} 張給朋友，剩下的佔全部的百分之幾？`
  ];
  return (r,p)=>{const T=pk(r,[5,10,20,25,50].slice(0,2+Math.round(3*p.s))),a=ri(r,1,T-1),m=nm(r),b=T-a,s=b*100/T;
    return o('frac-pct',`${pk(r,G)(T,a,m)}（答案只寫數字，單位：%）`,s,'先求剩下（沒有用）的部分是多少，再化成百分數。',`先求剩下的：${T}－${a}＝${b}，佔全部的 ${b}/${T}。分母化成 100：${T}×${100/T}＝100，分子也乘 ${100/T}：${b}×${100/T}＝${s}，所以是 ${s}%。`,[a*100/T,b*T,s/10,s+10],`(${T}-${a})*100/${T}`)}});
add(4,[2],H=>{const {o,pk,ri,fx}=H;
  const L=[2,4,5,10,20,25,50],PH=[v=>`${v} 等於百分之幾？（答案只寫數字，單位：%）`,v=>`把小數 ${v} 寫成百分數，是百分之幾？（答案只寫數字，單位：%）`,v=>`${v} 即是百分之幾？（答案只寫數字，單位：%）`];
  return (r,p)=>{const b=pk(r,L.slice(0,3+Math.round(4*p.s))),a=ri(r,1,b-1),v=fx(a/b),s=a*100/b;
    return o('frac-pct',pk(r,PH)(v),s,'百分數是分母為 100 的分數：乘 100 就可以。',`${v} 是 ${s} 個 0.01，也就是 ${s}/100，所以是 ${s}%（小數乘 100，小數點向右移兩位）。`,[a*b,s/10,s*10,100-s],`${fx(a/b)}*100`)}});
add(4,[2],H=>{const {o,pk,ri,fr}=H;
  const L=[2,4,5,10,20,25,50],PH=[v=>`${v}% 化成最簡分數是多少？（答案寫成最簡分數，例如 3/4）`,v=>`把 ${v}% 寫成最簡分數，是多少？（答案寫成最簡分數，例如 3/4）`,v=>`百分之 ${v} 等於哪個最簡分數？（答案寫成最簡分數，例如 3/4）`];
  return (r,p)=>{const b=pk(r,L.slice(0,3+Math.round(4*p.s))),a=ri(r,1,b-1),pc=a*100/b,ans=fr(a,b),[n,d]=ans.split('/');
    return o('frac-pct',pk(r,PH)(pc),ans,'百分數就是分母為 100 的分數，再化簡。',`${pc}% 就是 ${pc}/100。分子分母同除以它們的最大公因數 ${100/Number(d)}：${pc}/100＝${ans}，已是最簡分數。`,[`${pc}/100`,`${d}/${n}`,`${Number(n)+1}/${d}`,`${n}/${Number(d)+1}`],null,null,'simplest')}});

// stages 3-4: percent-of
const POOL=[10,50,20,25,5,30,40,75,60,15];
const expl=(N0,pc,s)=>`求 ${N0} 的 ${pc}%，就是把 ${N0} 當作 100 份，取其中 ${pc} 份。`+({10:`10% 就是十分之一，把 ${N0} 除以 10：${N0}÷10＝${s}。`,50:`50% 就是一半：${N0}÷2＝${s}。`,25:`25% 就是四分之一：${N0}÷4＝${s}。`}[pc]||`${pc}% 就是 100 份中取 ${pc} 份：先乘 ${pc}，再除以 100：${N0}×${pc}＝${N0*pc}，${N0*pc}÷100＝${s}。`);
const pcVals=(r,p,H)=>{const {pk,ri,gcd}=H,pc=pk(r,POOL.slice(0,4+Math.round(6*p.s))),m=100/gcd(pc,100),N0=m*ri(r,1,2+Math.round(p.s*9));return [pc,N0,N0*pc/100]};
add(4,[3,4],H=>{const {o,pk,nm}=H;
  const G=[
    (N0,pc,m)=>`${m}有 $${N0}，用了其中的 ${pc}% 買書，用了多少元？（答案只寫數字）`,
    (N0,pc)=>`一箱有 ${N0} 個蘋果，其中 ${pc}% 是紅蘋果，紅蘋果有多少個？`,
    (N0,pc,m)=>`${m}有 ${N0} 粒糖，把其中 ${pc}% 送給朋友，送出了多少粒？`,
    (N0,pc,m)=>`一本書共 ${N0} 頁，${m}已看了 ${pc}%，已看了多少頁？`,
    (N0,pc)=>`一桶水有 ${N0} 升，用去了 ${pc}%，用去了多少升？`,
    (N0,pc)=>`一條路長 ${N0} 米，已鋪好 ${pc}%，已鋪好多少米？`
  ];
  return (r,p)=>{const [pc,N0,s]=pcVals(r,p,H);
    return o('percent-of',pk(r,G)(N0,pc,nm(r)),s,`${pc}% 即是 ${pc}/100。`,expl(N0,pc,s),[N0*pc,N0-s,N0+s,s*10],`${N0}*${pc}/100`)}});
add(4,[3,4],H=>{const {o,pk}=H;
  const U=['公斤','米','升','厘米','毫升'];
  return (r,p)=>{const [pc,N0,s]=pcVals(r,p,H),f=pk(r,[0,1,2,3]),u=pk(r,U);
    const q=f===0?`${N0}×${pc}%＝？`:f===1?`${pc}%×${N0}＝？`:f===2?`${N0} ${u}的 ${pc}% 是多少${u}？`:`$${N0} 的 ${pc}% 是多少元？（答案只寫數字）`;
    return o('percent-of',q,s,`${pc}% 即是 ${pc}/100。`,expl(N0,pc,s),[N0*pc,N0-s,N0+s,s*10],`${N0}*${pc}/100`)}});
add(4,[3,4],H=>{const {o,pk,nm}=H;
  const G=[
    (N0,pc)=>`原價 $${N0} 的貨品減價 ${pc}%，減價了多少元？（答案只寫數字）`,
    (N0,pc)=>`一件貨品的進貨價是 $${N0}，加價 ${pc}%，加了多少元？（答案只寫數字）`,
    (N0,pc,m)=>`${m}存了 $${N0}，其中 ${pc}% 捐給慈善機構，捐了多少元？（答案只寫數字）`,
    (N0,pc)=>`一件外套標價 $${N0}，現在特價減 ${pc}%，減去了多少元？（答案只寫數字）`
  ];
  return (r,p)=>{const [pc,N0,s]=pcVals(r,p,H);
    return o('percent-of',pk(r,G)(N0,pc,nm(r)),s,`${pc}% 即是 ${pc}/100。`,expl(N0,pc,s),[N0*pc,N0-s,N0+s,s*10],`${N0}*${pc}/100`)}});

// stage 4: discount
add(4,[4],H=>{const {o,pk,N,nm,CN}=H;
  const I=['書包','球鞋','玩具車','外套','水樽','畫簿','電子錶','運動褲'];
  return (r,p)=>{const P=10*N(r,p,3,60),z=pk(r,[9,8,5,7,6].slice(0,2+Math.round(3*p.s))),s=P*z/10,m=nm(r),it=pk(r,I);
    return o('discount',`${m}在商店看中一件${it}，原價 $${P}，現在打${CN[z]}折，要付多少元？（答案只寫數字）`,s,`${CN[z]}折即是原價的 ${z}/10。`,`${CN[z]}折就是付原價的 ${z}/10：先求 1/10，${P}÷10＝${P/10}，再乘 ${z}：${P/10}×${z}＝${s}（元）。`,[P*(10-z)/10,P-z,P*z/100,s+10],`${P}*${z}/10`)}});
add(4,[4],H=>{const {o,pk,N,CN}=H;
  const I=['書包','球鞋','玩具車','外套','水樽','畫簿','電子錶','運動褲'];
  return (r,p)=>{const P=10*N(r,p,3,60),z=pk(r,[9,8,5,7,6].slice(0,2+Math.round(3*p.s))),s=P*z/10,sv=P-s,it=pk(r,I);
    return o('discount',`${it}原價 $${P}，打${CN[z]}折後，比原價平了多少元？（答案只寫數字）`,sv,`先求現價，再用原價減現價。`,`打${CN[z]}折，現價是原價的 ${z}/10：${P}÷10＝${P/10}，${P/10}×${z}＝${s}；平了 ${P}－${s}＝${sv}（元）。`,[s,P-z,P*z/100,sv+10],`${P}-${P}*${z}/10`)}});

// ───────────── World 6 (w=5) ─────────────
// stage 0: perim
add(5,[0],H=>{const {o,pk,N}=H;
  const S=[['等邊三角形',3],['正方形',4],['正五邊形',5],['正六邊形',6]];
  return (r,p)=>{const [nmS,k]=pk(r,S.slice(0,2+Math.round(2*p.s))),a=N(r,p,3,40),u=pk(r,['厘米','米']);
    return o('perim',`${nmS}的邊長是 ${a} ${u}，周界是多少${u}？（答案只寫數字）`,k*a,`${nmS}的 ${k} 條邊一樣長。`,`${nmS}有 ${k} 條相等的邊，周界＝邊長×${k}：${a}×${k}＝${k*a}（${u}）。`,[a*a,a+k,a*(k-1),k*a+k],`${k}*${a}`)}});
add(5,[0],H=>{const {o,pk,N,nm}=H;
  const G=[
    (l,w,m)=>`${m}想用彩帶圍着一幅長 ${l} 厘米、闊 ${w} 厘米的長方形畫，彩帶至少要多少厘米長？`,
    (l,w)=>`一個長方形花圃長 ${l} 米，闊 ${w} 米，沿花圃四周圍上欄杆，欄杆共長多少米？`,
    (l,w)=>`一張長方形桌布長 ${l} 厘米、闊 ${w} 厘米，四邊釘上花邊，花邊至少要多少厘米長？`,
    (l,w,m)=>`長方形操場長 ${l} 米、闊 ${w} 米，${m}沿邊跑一圈，跑了多少米？`,
    (l,w)=>`一塊長方形地毯長 ${l} 米、闊 ${w} 米，四周鑲上金邊，金邊共長多少米？`
  ];
  return (r,p)=>{const l=N(r,p,3,40),w=N(r,p,2,l-1);
    return o('perim',`${pk(r,G)(l,w,nm(r))}（答案只寫數字）`,2*(l+w),'四周的長度就是周界。',`長方形對邊相等，周界＝(長＋闊)×2：(${l}＋${w})×2＝${l+w}×2＝${2*(l+w)}。`,[l*w,l+w,2*l+w,2*(l+w)+2],`2*(${l}+${w})`)}});
add(5,[0],H=>{const {o,pk,N}=H;
  return (r,p)=>{if(r()<.4){const a=N(r,p,3,40),u=pk(r,['厘米','米']);
      return o('perim',`正方形的周界是 ${4*a} ${u}，邊長是多少${u}？（答案只寫數字）`,a,'正方形的四條邊一樣長。',`正方形周界＝邊長×4，所以邊長＝周界÷4：${4*a}÷4＝${a}（${u}）。`,[4*a,2*a,a+4,a*a],`${4*a}/4`)}
    const l=N(r,p,3,40),w=N(r,p,2,l-1),P=2*(l+w),f=pk(r,[0,1]);
    return o('perim',f?`長方形的周界是 ${P} 厘米，闊是 ${w} 厘米，長是多少厘米？（答案只寫數字）`:`長方形的周界是 ${P} 厘米，長是 ${l} 厘米，闊是多少厘米？（答案只寫數字）`,f?l:w,'長＋闊＝周界的一半。',`長方形周界＝(長＋闊)×2，所以長＋闊＝${P}÷2＝${l+w}；${f?`長＝${l+w}－${w}＝${l}`:`闊＝${l+w}－${l}＝${w}`}（厘米）。`,[P-(f?w:l),l+w,P/2+(f?w:l),f?w:l],`${P}/2-${f?w:l}`)}});

// stage 1: area
add(5,[1],H=>{const {o,pk,N}=H;
  const G=[
    (l,w)=>`一幅長方形的牆長 ${l} 米、高 ${w} 米，牆的面積是多少平方米？`,
    (l,w)=>`一張長方形桌面長 ${l} 厘米、闊 ${w} 厘米，桌面的面積是多少平方厘米？`,
    (l,w)=>`課室的長方形地板長 ${l} 米、闊 ${w} 米，地板的面積是多少平方米？`,
    (l,w)=>`一張長方形郵票長 ${l} 厘米、闊 ${w} 厘米，它的面積是多少平方厘米？`,
    (l,w)=>`長方形花園長 ${l} 米、闊 ${w} 米，花園的面積是多少平方米？`,
    (l,w)=>`一塊長方形黑板長 ${l} 分米、闊 ${w} 分米，面積是多少平方分米？`,
    (l,w)=>`一張長方形地毯長 ${l} 米、闊 ${w} 米，面積是多少平方米？`
  ];
  return (r,p)=>{const l=N(r,p,3,40),w=N(r,p,2,l-1);
    return o('area',`${pk(r,G)(l,w)}（答案只寫數字）`,l*w,'長方形面積＝長×闊。',`面積是鋪滿多少個 1 平方單位；長方形面積＝長×闊：${l}×${w}＝${l*w}。`,[2*(l+w),l+w,l*w+l,l*w-w],`${l}*${w}`)}});
add(5,[1],H=>{const {o,pk,N}=H;
  return (r,p)=>{if(r()<.3){const a=N(r,p,3,25),u=pk(r,['厘米','米']);
      return o('area',`正方形的面積是 ${a*a} 平方${u}，邊長是多少${u}？（答案只寫數字）`,a,'哪個數乘自己等於面積？',`正方形面積＝邊長×邊長，想 ${a*a} 是哪個數乘自己：${a}×${a}＝${a*a}，所以邊長是 ${a}（${u}）。`,[a*a,a*2,a+1,a-1],`${a}`)}
    const l=N(r,p,3,40),w=N(r,p,2,l-1),A=l*w,f=pk(r,[0,1]);
    return o('area',f?`長方形的面積是 ${A} 平方厘米，闊是 ${w} 厘米，長是多少厘米？（答案只寫數字）`:`長方形的面積是 ${A} 平方厘米，長是 ${l} 厘米，闊是多少厘米？（答案只寫數字）`,f?l:w,'面積÷一條邊＝另一條邊。',`長方形面積＝長×闊，所以${f?'長':'闊'}＝面積÷${f?'闊':'長'}：${A}÷${f?w:l}＝${f?l:w}（厘米）。`,[A-(f?w:l),A+(f?w:l),f?w:l,l+w],`${A}/${f?w:l}`)}});
add(5,[1],H=>{const {o,pk,N}=H;
  const G=[
    (l,w)=>`一個長方形由正方格排成，每行有 ${l} 格，共有 ${w} 行，每格面積是 1 平方厘米，長方形的面積是多少平方厘米？`,
    (l,w)=>`地板用正方形地磚鋪成，每行鋪 ${l} 塊，鋪了 ${w} 行，每塊地磚面積是 1 平方米，地板面積是多少平方米？`,
    (l,w)=>`方格紙上塗了一個長方形，橫向 ${l} 格，縱向 ${w} 格，每格面積是 1 平方厘米，塗色部分的面積是多少平方厘米？`
  ];
  return (r,p)=>{const l=N(r,p,3,40),w=N(r,p,2,l-1);
    return o('area',`${pk(r,G)(l,w)}（答案只寫數字）`,l*w,'一行有幾格，共幾行，用乘法。',`每行有 ${l} 格，共有 ${w} 行，總格數就是面積（每格 1 個面積單位）：${l}×${w}＝${l*w}。`,[l+w,2*(l+w),l*w+l,l*w-w],`${l}*${w}`)}});

// stage 2: tri-area
add(5,[2],H=>{const {o,pk,N}=H;
  const G=[
    (b,h)=>`一面三角旗的底是 ${b} 厘米，高是 ${h} 厘米，旗的面積是多少平方厘米？`,
    (b,h)=>`一塊三角形紙板的底是 ${b} 厘米，高是 ${h} 厘米，紙板的面積是多少平方厘米？`,
    (b,h)=>`三角形花圃的底是 ${b} 米，高是 ${h} 米，花圃的面積是多少平方米？`,
    (b,h)=>`一幅三角形風帆底長 ${b} 米，高 ${h} 米，風帆的面積是多少平方米？`,
    (b,h)=>`一個三角形路標的底是 ${b} 厘米，高是 ${h} 厘米，路標的面積是多少平方厘米？`
  ];
  return (r,p)=>{const b=N(r,p,3,30);let h=N(r,p,2,24);if(b*h%2)h++;const s=b*h/2;
    return o('tri-area',`${pk(r,G)(b,h)}（答案只寫數字）`,s,'三角形面積＝底×高÷2。',`三角形是同底同高長方形的一半：先算 ${b}×${h}＝${b*h}，再除以 2：${b*h}÷2＝${s}。`,[b*h,b+h,s+b,s-h>0?s-h:s+2],`${b}*${h}/2`)}});
add(5,[2],H=>{const {o,pk,N}=H;
  return (r,p)=>{const a=N(r,p,3,30);let b=N(r,p,2,24);if(a*b%2)b++;const s=a*b/2,u=pk(r,['厘米','米']);
    return o('tri-area',`直角三角形的兩條直角邊分別長 ${a} ${u}和 ${b} ${u}，面積是多少平方${u}？（答案只寫數字）`,s,'兩條直角邊，一條當底，另一條當高。',`直角三角形的兩條直角邊互相垂直，一條當底，另一條就是高：${a}×${b}÷2＝${a*b}÷2＝${s}（平方${u}）。`,[a*b,a+b,s+a,s-b>0?s-b:s+2],`${a}*${b}/2`)}});
add(5,[2],H=>{const {o,pk,N}=H;
  return (r,p)=>{const l=N(r,p,3,30);let w=N(r,p,2,24);if(l*w%2)w++;const s=l*w/2,u=pk(r,['厘米','米']);
    return o('tri-area',`把一個長 ${l} ${u}、闊 ${w} ${u}的長方形沿對角線剪開，得到兩個相同的三角形，每個三角形的面積是多少平方${u}？（答案只寫數字）`,s,'每個三角形是長方形的一半。',`兩個相同的三角形剛好拼成長方形，所以每個是長方形的一半：長方形面積 ${l}×${w}＝${l*w}，${l*w}÷2＝${s}（平方${u}）。`,[l*w,l+w,s+l,s-w>0?s-w:s+2],`${l}*${w}/2`)}});
add(5,[2],H=>{const {o,pk,N}=H;
  return (r,p)=>{const b=N(r,p,3,30);let h=N(r,p,2,24);if(b*h%2)h++;const S=b*h/2,f=pk(r,[0,1]);
    return o('tri-area',f?`三角形的面積是 ${S} 平方厘米，高是 ${h} 厘米，底是多少厘米？`:`三角形的面積是 ${S} 平方厘米，底是 ${b} 厘米，高是多少厘米？`,f?b:h,'先想想面積的兩倍是甚麼。',`三角形面積＝底×高÷2，所以底×高＝面積×2＝${S}×2＝${S*2}；${f?`底＝${S*2}÷${h}＝${b}`:`高＝${S*2}÷${b}＝${h}`}（厘米）。`,[S,S*2,f?h:b,S/(f?h:b)],`${S}*2/${f?h:b}`)}});

add(5,[2],H=>{const {o,pk,N}=H;
  return (r,p)=>{const b=N(r,p,3,30);let h=N(r,p,2,24);if(b*h%2)h++;const u=pk(r,['厘米','米']);
    if(r()<.5)return o('tri-area',`兩個相同的三角形，底都是 ${b} ${u}，高都是 ${h} ${u}，兩個三角形的面積合共是多少平方${u}？（答案只寫數字）`,b*h,'一個三角形是底×高÷2，兩個就剛好是底×高。',`每個三角形面積是 ${b}×${h}÷2＝${b*h/2}，兩個合共 ${b*h/2}×2＝${b*h}（平方${u}）。也就是拼成一個底 ${b}、高 ${h} 的長方形。`,[b*h/2,b+h,b*h+b,b*h*2],`${b}*${h}`);
    return o('tri-area',`一個長方形的長是 ${b} ${u}，闊是 ${h} ${u}；一個三角形的底是 ${b} ${u}，高是 ${h} ${u}。長方形的面積比三角形的面積大多少平方${u}？（答案只寫數字）`,b*h/2,'三角形面積是同底同高長方形的一半。',`長方形面積 ${b}×${h}＝${b*h}，三角形面積 ${b*h}÷2＝${b*h/2}，相差 ${b*h}－${b*h/2}＝${b*h/2}（平方${u}）。`,[b*h,b*h/2+b,b+h,b*h/2-1],`${b}*${h}-${b}*${h}/2`)}});
add(5,[2],H=>{const {o,pk,N,nm}=H;
  const G=[
    (b,h,m,u)=>`${m}剪了一個三角形，底是 ${b} ${u}，高是 ${h} ${u}，這個三角形的面積是多少平方${u}？`,
    (b,h,m,u)=>`${m}在方格紙上畫了一個高 ${h} ${u}、底 ${b} ${u}的三角形，它的面積是多少平方${u}？`,
    (b,h,m,u)=>`${m}用硬卡紙做了一個三角形，量得底長 ${b} ${u}，高 ${h} ${u}，卡紙的面積是多少平方${u}？`
  ];
  return (r,p)=>{const b=N(r,p,3,30);let h=N(r,p,2,24);if(b*h%2)h++;const s=b*h/2,u=pk(r,['厘米','米']);
    return o('tri-area',`${pk(r,G)(b,h,nm(r),u)}（答案只寫數字）`,s,'三角形面積＝底×高÷2。',`三角形是同底同高長方形的一半：先算 ${b}×${h}＝${b*h}，再除以 2：${b*h}÷2＝${s}（平方${u}）。`,[b*h,b+h,s+b,s-h>0?s-h:s+2],`${b}*${h}/2`)}});

// stages 5-6: ratio-share
const RV=(r,p,H)=>{const {N}=H;const a=N(r,p,1,5);let b=N(r,p,2,7);if(b===a)b=a+1;const k=N(r,p,2,15);return [a,b,k]};
add(5,[5,6],H=>{const {o,pk,nm,NM}=H;
  return (r,p)=>{const [a,b,k]=RV(r,p,H),T=(a+b)*k,per=k,x=r()<.5,q=(x?a:b)*per,[m1,m2]=two(r,nm),g=Math.floor(r()*5);
    const who=x?['第一個人','第二個人']:['',''];
    const S=[
      `${m1}和${m2}分 $${T}，兩人所得的錢數比是 ${a}:${b}，${x?m1:m2}得多少元？（答案只寫數字）`,
      `班裏男生與女生的人數比是 ${a}:${b}，全班共 ${T} 人，${x?'男':'女'}生有多少人？`,
      `一杯奶茶由茶和奶按 ${a}:${b} 的比混合而成，共 ${T} 毫升，${x?'茶':'奶'}有多少毫升？`,
      `花園裏紅花與黃花的數量比是 ${a}:${b}，共有 ${T} 朵，${x?'紅':'黃'}花有多少朵？`,
      `水泥與沙的重量比是 ${a}:${b}，混合後共重 ${T} 公斤，${x?'水泥':'沙'}重多少公斤？`
    ];
    return o('ratio-share',S[g],q,'先求每一份是多少。',`先把比當作份數：共 ${a}＋${b}＝${a+b} 份，每份 ${T}÷${a+b}＝${per}；所求的佔 ${x?a:b} 份：${per}×${x?a:b}＝${q}。`,[per,T-q,q+per,per*(x?b:a)],`${T}/(${a}+${b})*${x?a:b}`)}});
add(5,[5,6],H=>{const {o,pk,nm}=H;
  return (r,p)=>{const [a0,b0,k]=RV(r,p,H),a=Math.min(a0,b0),b=Math.max(a0,b0),T=(a+b)*k,d=(b-a)*k,g=Math.floor(r()*4),[m1,m2]=two(r,nm);
    const S=[
      `${m1}和${m2}分 $${T}，兩人所得的錢數比是 ${a}:${b}，${m2}比${m1}多得多少元？（答案只寫數字）`,
      `紅珠與藍珠的數量比是 ${a}:${b}，共有 ${T} 粒，藍珠比紅珠多多少粒？`,
      `甲繩與乙繩的長度比是 ${a}:${b}，兩條繩共長 ${T} 米，乙繩比甲繩長多少米？`,
      `男生與女生的人數比是 ${a}:${b}，全班共 ${T} 人，女生比男生多多少人？`
    ];
    return o('ratio-share',S[g],d,'先求每一份是多少，再看相差幾份。',`共 ${a}＋${b}＝${a+b} 份，每份 ${T}÷${a+b}＝${k}；兩者相差 ${b}－${a}＝${b-a} 份：${k}×${b-a}＝${d}。`,[k,T-d,d+k,k*b],`${T}/(${a}+${b})*(${b}-${a})`)}});

// stage 6: ratio-scale (given one part) and whole from a part
add(5,[6],H=>{const {o,pk,nm,N}=H;
  return (r,p)=>{const x=N(r,p,1,6);let y=N(r,p,2,9);if(y===x)y=x+1;const k=N(r,p,2,12),g=Math.floor(r()*5),m=nm(r);
    const S=[
      `男生與女生的人數比是 ${x}:${y}，男生有 ${x*k} 人，女生有多少人？`,
      `糖與水的重量比是 ${x}:${y}，糖有 ${x*k} 克，水有多少克？`,
      `${m}和弟弟存款的比是 ${x}:${y}，${m}存了 $${x*k}，弟弟存了多少元？（答案只寫數字）`,
      `長方形的長與闊的比是 ${x}:${y}，長是 ${x*k} 厘米，闊是多少厘米？`,
      `紅筆與藍筆的數量比是 ${x}:${y}，紅筆有 ${x*k} 枝，藍筆有多少枝？`
    ];
    return o('ratio-scale',S[g],k*y,'先求比的每一份是多少。',`先求一份是多少：前項佔 ${x} 份是 ${x*k}，一份＝${x*k}÷${x}＝${k}；後項佔 ${y} 份：${k}×${y}＝${k*y}。`,[x*k+y,k*y+k,k*y-k>0?k*y-k:k*y+1,k],`${x*k}/${x}*${y}`)}});
add(5,[6],H=>{const {o,nm,N}=H;
  return (r,p)=>{const [a,b,k]=RV(r,p,H),x=r()<.5,g=Math.floor(r()*4),known=(x?a:b)*k,T=(a+b)*k;
    const S=[
      `班裏男生與女生的人數比是 ${a}:${b}，男生有 ${a*k} 人，全班共有多少人？`,
      `紅珠與藍珠的數量比是 ${a}:${b}，藍珠有 ${b*k} 粒，兩種珠一共有多少粒？`,
      `甲繩與乙繩的長度比是 ${a}:${b}，甲繩長 ${a*k} 米，兩條繩合共長多少米？`,
      `茶與奶的比是 ${a}:${b}，奶有 ${b*k} 毫升，混合後共有多少毫升？`
    ];
    const useB=g%2===1,kn=useB?b:a;
    return o('ratio-share',S[g],T,'先求一份是多少，再算全部共幾份。',`先求一份：已知的一項佔 ${kn} 份是 ${kn*k}，一份＝${kn*k}÷${kn}＝${k}；全部共 ${a}＋${b}＝${a+b} 份：${k}×${a+b}＝${T}。`,[k*(useB?a:b),kn*k+k,T+k,T-k],`${kn*k}/${kn}*(${a}+${b})`)}});
})();

;
// WQ37Math: pure deterministic question generator for level mode (math + olympiad). No DOM, no Math.random.
(function(){
'use strict';
// R3.23: the 奧數路線 units live in r37_src/oly/ (globalThis.WQOly). In the app they are bundled before this file runs; in Node load them next to it.
if(typeof require!=='undefined'&&!globalThis.WQOly)require('./oly/load_node.js');
const mb=a=>()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const hs=(...xs)=>{let h=2166136261;for(const x of xs){for(const c of String(x))h=Math.imul(h^c.charCodeAt(0),16777619);h=Math.imul(h^35,16777619)}return h>>>0};
const ri=(r,a,b)=>a+Math.floor(r()*(b-a+1));
const pk=(r,a)=>a[Math.floor(r()*a.length)];
const sh=(r,a)=>{a=a.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]]}return a};
const N=(r,p,lo,hi)=>{if(hi<=lo)return lo;const sp=hi-lo,t=Math.min(hi,lo+Math.max(2,Math.round(sp*p.s))),b=Math.min(t,lo+Math.round(sp*p.s*.5));return ri(r,b,t)};
const gcd=(a,b)=>b?gcd(b,a%b):a;
const fx=x=>String(Math.round(x*1e6)/1e6);
const fr=(a,b)=>{const g=gcd(a,b);a/=g;b/=g;return b===1?String(a):a+'/'+b};
// names carry a pronoun so a girl's name never gets 「他」 (toString gives the name, so ${m} still works in templates)
const P=(n,p)=>({n,p,toString(){return n}});
const NM=[P('小明','他'),P('小美','她'),P('阿強','他'),P('小欣','她'),P('家豪','他'),P('詩婷','她')],IT=[['糖果','粒'],['貼紙','張'],['彈珠','粒'],['書籤','張'],['卡片','張']];
const nm=r=>pk(r,NM);
// o(skill, stem, answer, hint, explain, wrongs, calc, accept, form): form 'dec' | 'simplest' = the question asks for that written form
const o=(sk,q,a,h,e,w,calc,acc,form)=>({sk,q,a:String(a),h,e,w:w||[],calc,acc:acc||[],form:form||null});
const spread=(r,k,m,d)=>{for(let t=0;t<60;t++){const v=[];let s=0;for(let i=0;i<k-1;i++){const x=m+ri(r,-d,d);v.push(x);s+=x}const l=k*m-s;if(l>=1&&l<=Math.max(100,m+d*2))return v.concat(l)}const v=Array(k).fill(m);v[0]=m+1;v[1]=m-1;return v};
const CN=['','一','二','三','四','五','六','七','八','九'];
const mul=n=>{const a=[];for(let i=n;i>1;i--)a.push(i);a.push(1);return a.join('*')};
const fact=n=>{let v=1;for(let i=2;i<=n;i++)v*=i;return v};
const X=a=>a.join('×');

// ── explanation helpers: a method sentence first, then the working ──
const place=n=>{const s=String(n),p=[];for(let i=0;i<s.length;i++){const d=+s[i];if(d)p.push(d*Math.pow(10,s.length-1-i))}return p};
const addHow=(a,b)=>{
  const s=a+b,o1=a%10,gap=10-o1;
  if(b<10&&o1+b>=10){const rest=b-gap;return `${a}＋${b}：先湊成整十，${a}＋${gap}＝${a+gap}${rest?`，再加餘下的 ${rest}，得 ${s}`:`，得 ${s}`}。`}
  if(b<10)return `${a}＋${b}：個位 ${o1}＋${b}＝${o1+b}，十位不變，得 ${s}。`;
  const ps=place(b);let acc=a;
  return `${a}＋${b}：把 ${b} 拆成 ${ps.join('＋')}，`+ps.map((x,i)=>{acc+=x;return `${i?'再':'先'}加 ${x} 得 ${acc}`}).join('，')+'。';
};
const subHow=(a,b)=>{
  const s=a-b,o1=a%10;
  if(b<10&&o1>=b)return `${a}－${b}：個位 ${o1}－${b}＝${o1-b}，十位不變，得 ${s}。`;
  if(b<10)return `${a}－${b}：個位不夠減，先減 10 再把多減的 ${10-b} 加回去：${a}－10＝${a-10}，${a-10}＋${10-b}＝${s}。`;
  const ps=place(b);let acc=a;
  return `${a}－${b}：把 ${b} 拆成 ${ps.join('＋')}，`+ps.map((x,i)=>{acc-=x;return `${i?'再':'先'}減 ${x} 得 ${acc}`}).join('，')+'。';
};
const mulHow=(a,b)=>{
  const s=a*b,ps=place(a);
  if(ps.length===1){const z=String(a).length-1;return z?`${a}×${b}：先算 ${a/Math.pow(10,z)}×${b}＝${a/Math.pow(10,z)*b}，再補回 ${z} 個 0，得 ${s}。`:`${a}×${b}＝${s}。`}
  return `${a}×${b}：把 ${a} 拆成 ${ps.join('＋')}，分別乘 ${b}：${ps.map(x=>x+'×'+b).join('＋')}＝${ps.map(x=>x*b).join('＋')}＝${s}。`;
};
const timesHow=(a,b)=>{
  const s=a*b;
  if(b<=5)return `${a}×${b} 就是 ${b} 個 ${a} 相加：${Array(b).fill(a).join('＋')}＝${s}。`;
  return `${a}×${b}：把 ${b} 拆成 5＋${b-5}，${a}×5＝${a*5}，${a}×${b-5}＝${a*(b-5)}，相加 ${a*5}＋${a*(b-5)}＝${s}。`;
};
const lastCycle=b=>{const c=[];let v=b%10;while(!c.includes(v)){c.push(v);v=v*b%10}return c};

// ── R3.19 (N22) richer variants for skills that had only a handful of stems ──
// liars with groups: a_i people all say 「有 c_i 人說謊」. The claims contradict, so at most one group tells the truth; a group of a people can be the truthful one only if n－a＝c.
// One group says 「有 n 人說謊」, which rules out "nobody tells the truth"; exactly one other group fits n－a＝c, the rest do not.
const liarsGroups=(r,p)=>{
  for(let t=0;t<200;t++){
    const n=ri(r,5,p.s>.6?13:10),k=p.s>.6?4:3,as=Array(k).fill(1);
    for(let i=k;i<n;i++)as[ri(r,0,k-1)]++;
    const cl=[n,n-as[1]];
    for(let i=2;i<k;i++){const c=ri(r,1,n-1);if(c===n-as[i]||cl.includes(c))break;cl.push(c)}
    if(cl.length<k)continue;
    const g=sh(r,as.map((a,i)=>({a,c:cl[i]}))).sort((x,y)=>x.c-y.c);
    const hit=g.filter(x=>n-x.a===x.c);
    if(hit.length!==1)continue;
    const T=hit[0],c=T.c;
    const said=g.map(x=>`${x.a} 人說：「我們之中有 ${x.c} 個人說謊。」`).join('');
    const tryAll=g.map(x=>`若說「${x.c} 人說謊」的 ${x.a} 人是說真話，說謊的就是 ${n}－${x.a}＝${n-x.a} 人，${n-x.a===x.c?`和 ${x.c} 相同，成立`:`和 ${x.c} 不同，矛盾`}`).join('；');
    return o('liars',`有 ${n} 個人，${said}實際上有多少個人說謊？`,c,'這些說法互相矛盾，最多只有一組人說真話；逐組試試。',`這些說法互相矛盾，最多只有一組人說真話。逐組試：${tryAll}。若沒有人說真話，說謊的就有 ${n} 人，但有一組說的正是「${n} 人說謊」，那就變成真話，矛盾。所以只有一組成立，說謊的有 ${c} 人。`,[n,n-T.a+1,c+1,c-1>0?c-1:c+2,...g.map(x=>x.c)],`${n}-${T.a}`);
  }
  return null;
};
// squares in an a×b rectangle grid
const rectSquares=(r,p)=>{
  const a=ri(r,2,4),b=ri(r,a+1,6),t=[],parts=[];let s=0;
  for(let k=1;k<=a;k++){t.push(`${a-k+1}*${b-k+1}`);parts.push(`${a-k+1}×${b-k+1}`);s+=(a-k+1)*(b-k+1)}
  return o('squares',pk(r,[`一個 ${a}×${b} 的長方形方格網（每格都是邊長 1 的小正方形，共 ${a*b} 格），圖中一共有多少個正方形？（包括各種大小）`,`一塊 ${a} 行 ${b} 列的長方形棋盤，共有 ${a*b} 格，棋盤上一共有多少個正方形？（包括各種大小）`]),s,'分開數：邊長 1、2、3……的正方形各有多少個。',`按邊長分開數：邊長 1 的有 ${a}×${b} 個，邊長 2 的有 ${a-1}×${b-1} 個，……最大的正方形邊長只能是 ${a}（只有 ${a} 行）。逐個加起來：${parts.join('＋')}＝${s}。`,[a*b,s-a,s+a,a*b+a],t.join('+'));
};
// "every two of m things make one": angles from m rays, triangles on a base with m points
const pairsGeo=(r,p)=>{
  const m=ri(r,3,Math.min(8,3+Math.round(p.s*5))),s=m*(m-1)/2;
  if(r()<.5)return o('segments',`從點 O 畫出 ${m} 條射線，都在同一條直線的同一旁（任意兩條射線的夾角都小於 180°），圖中一共有多少個角？`,s,'每兩條射線組成一個角，和數線段一樣。',`每兩條射線組成一個角：每條射線可以和其他 ${m-1} 條配對，共 ${m}×${m-1}＝${m*(m-1)}；但每一對被數了兩次，所以除以 2：${m*(m-1)}÷2＝${s}。`,[m*(m-1),s+m,s-m>0?s-m:s+1,m],`${m}*(${m}-1)/2`);
  return o('segments',`△ABC 的底邊 BC 上，除了 B、C 外還有 ${m-2} 個點，把這些點都和頂點 A 連起來，圖中一共有多少個三角形？`,s,'每個三角形都以 A 為頂點，底邊是 BC 上兩個點之間的線段。',`每個三角形都以 A 為頂點，底邊是 BC 上任意兩點之間的線段。BC 上共有 ${m} 個點，要數有多少條線段：${m}×${m-1}÷2＝${s}，所以有 ${s} 個三角形。`,[m*(m-1),s+m,s-m>0?s-m:s+1,m],`${m}*(${m}-1)/2`);
};
// fractions that turn into terminating decimals, easiest first (reduced, denominators 2 4 5 10 8 20 25 50)
const FRAC_DEC=(()=>{const L=[];for(const b of [2,4,5,10,8,20,25,50])for(let a=1;a<b;a++)if(gcd(a,b)===1&&(b>=20||b<=10||a%2))L.push([a,b]);const o1=[[1,2],[1,4],[3,4],[1,5],[2,5],[3,5],[4,5]],rest=L.filter(x=>!o1.some(y=>y[0]===x[0]&&y[1]===x[1]));return o1.concat(rest)})();

// Template order inside a world = order of the LINE tables below (index = position in the array).
const MATH=[
[ // W1 P1-2: add/sub within 20 and 100.  0 add, 1 sub, 2 missing, 3 story, 4 add-sub, 5 count, 6 within20
(r,p)=>{const a=N(r,p,2,70),b=N(r,p,1,99-a),s=a+b;return o('add',`${a}＋${b}＝？`,s,'先加整十，再加個位。',addHow(a,b),[s+10,s-10,s+1,s-1,Math.abs(a-b)],`${a}+${b}`)},
(r,p)=>{const a=N(r,p,4,99),b=N(r,p,1,a-1),s=a-b;return o('sub',`${a}－${b}＝？`,s,'由大數減去小數，留意個位夠不夠減。',subHow(a,b),[s+10,s-10,s+1,s-1,a+b],`${a}-${b}`)},
(r,p)=>{const a=N(r,p,1,60),b=N(r,p,2,99-a),c=a+b;return o('missing',`☐＋${b}＝${c}，☐ 是多少？`,a,'想想：總數減去已知的一份。',`缺少的一份＝總數－已知的一份：${c}－${b}＝${a}。檢查：${a}＋${b}＝${c}。`,[c+b,b,a+1,a-1],`${c}-${b}`)},
(r,p)=>{const [i,u]=pk(r,IT),m=nm(r),a=N(r,p,5,80);if(r()<.5){const b=N(r,p,1,99-a);return o('story',`${m}有 ${a} ${u}${i}，媽媽再給${m.p} ${b} ${u}，現在一共有多少${u}？`,a+b,'「再給」即是加多一些。',`「再給」是增加，用加法：${a}＋${b}＝${a+b}，現在一共有 ${a+b} ${u}。`,[a-b>0?a-b:a+b+1,a+b+1,a+b-1,a+b+10],`${a}+${b}`)}const b=N(r,p,1,a-1);return o('story',`${m}有 ${a} ${u}${i}，送了 ${b} ${u}給同學，還剩下多少${u}？`,a-b,'「送出」即是減去。',`「送了」是減少，用減法：${a}－${b}＝${a-b}，還剩下 ${a-b} ${u}。`,[a+b,a-b+1,a-b-1,a-b+10],`${a}-${b}`)},
(r,p)=>{const a=N(r,p,3,50),b=N(r,p,2,99-a),c=N(r,p,1,a+b-1),s=a+b-c;return o('add-sub',`${a}＋${b}－${c}＝？`,s,'由左至右，先加後減。',`由左至右，先算加法：${a}＋${b}＝${a+b}，再減 ${c}：${a+b}－${c}＝${s}。`,[a+b+c,a+b,s+1,s-1,Math.abs(a-b)-c>0?Math.abs(a-b)-c:s+10],`${a}+${b}-${c}`)},
(r,p)=>{const k=N(r,p,2,10),m=N(r,p,2,10),f=pk(r,[['🍎','🍌','水果'],['⭐','🌙','圖案'],['🐱','🐶','動物']]),s=k+m;return o('count',`數一數：${f[0].repeat(k)} 和 ${f[1].repeat(m)}，一共有多少個${f[2]}？`,s,'分別數兩行，再加起來。',`先分別數出兩行：${k} 個和 ${m} 個，合起來用加法：${k}＋${m}＝${s}。`,[s+1,s-1,Math.abs(k-m),s+2],`${k}+${m}`)},
(r,p)=>{if(r()<.5){const a=N(r,p,2,18),b=N(r,p,1,20-a),s=a+b;return o('within20',`${a}＋${b}＝？`,s,'20 以內加法：能湊成 10 就先湊十。',s<=10?`${a}＋${b}：由 ${a} 再往上數 ${b} 個，合起來是 ${s}（${a}＋${b}＝${s}）。`:addHow(a,b),[s+1,s-1,s+10,Math.abs(a-b),s+2],`${a}+${b}`)}
  const a=N(r,p,3,20),b=N(r,p,1,a-1),s=a-b,e=a>10&&b>a-10?`${a}－${b}：先減到 10，${a}－${a-10}＝10，再減餘下的 ${b-(a-10)}，10－${b-(a-10)}＝${s}。`:`${a}－${b}：想「${b} 加幾等於 ${a}」，${b}＋${s}＝${a}，所以 ${a}－${b}＝${s}。`;
  return o('within20',`${a}－${b}＝？`,s,`想想：${b} 加幾等於 ${a}？`,e,[s+1,s-1,a+b,s+10,b],`${a}-${b}`)}
],
[ // W2 P2: two-digit add/sub, intro multiplication.  0 add2, 1 sub2, 2 times, 3 times-story, 4 repeat-add, 5 add-sub2, 6 to100
(r,p)=>{const a=N(r,p,10,90),b=N(r,p,10,99),s=a+b;return o('add2',`${a}＋${b}＝？`,s,'先加十位，再加個位，留意進位。',addHow(a,b),[s+10,s-10,s+1,s-1,s+100],`${a}+${b}`)},
(r,p)=>{const a=N(r,p,20,99),b=N(r,p,10,a-1),s=a-b;return o('sub2',`${a}－${b}＝？`,s,'個位不夠減時要退位。',subHow(a,b),[s+10,s-10,s+1,s-1,a+b],`${a}-${b}`)},
(r,p)=>{const x=pk(r,[2,5,10,3,4].slice(0,2+Math.round(3*p.s))),y=N(r,p,2,10),s=x*y;return o('times',`${x}×${y}＝？`,s,`想想 ${x} 個 ${x} 個地數。`,timesHow(x,y),[x+y,s+x,s-x,x*(y+1)],`${x}*${y}`)},
(r,p)=>{const a=pk(r,[2,5,10,3,4].slice(0,2+Math.round(3*p.s))),b=N(r,p,2,9),it=pk(r,[['枝','筆'],['粒','糖'],['個','橡皮擦'],['本','簿']]),s=a*b;return o('times-story',`每盒有 ${a} ${it[0]}${it[1]}，${b} 盒共有多少${it[0]}${it[1]}？`,s,'每盒數量 × 盒數。',`每盒 ${a}，${b} 盒就是 ${b} 個 ${a} 相加，用乘法：${a}×${b}＝${s}，共 ${s} ${it[0]}${it[1]}。`,[a+b,s+a,s-a,s+b],`${a}*${b}`)},
(r,p)=>{const a=N(r,p,2,25),k=N(r,p,3,7),s=a*k;return o('repeat-add',`${Array(k).fill(a).join('＋')}＝？`,s,`一共加了 ${k} 次，可以用乘法。`,`相同的數加了 ${k} 次，可以寫成乘法：${a}×${k}＝${s}。`,[s+a,s-a,a+k,s+10],Array(k).fill(a).join('+'))},
(r,p)=>{const a=N(r,p,10,60),b=N(r,p,10,99-a),c=N(r,p,5,a+b-1),s=a+b-c;return o('add-sub2',`${a}＋${b}－${c}＝？`,s,'先算前兩個數，再減。',`由左至右，先算加法：${a}＋${b}＝${a+b}，再減 ${c}：${a+b}－${c}＝${s}。`,[a+b+c,a+b,s+10,s-10,s+1],`${a}+${b}-${c}`)},
(r,p)=>{const a=N(r,p,10,95),s=100-a,m=Math.ceil(a/10)*10,c1=m-a;return o('to100',`${a}＋☐＝100，☐ 是多少？`,s,'想想：先補到下一個整十，再補到 100。',c1&&m<100?`先補到整十：${a}＋${c1}＝${m}，再由 ${m} 補到 100 要 ${100-m}，一共補 ${c1}＋${100-m}＝${s}。`:`缺少的數＝100－已有的數：100－${a}＝${s}。`,[s+10,s-10,s+1,s-1],`100-${a}`)}
],
[ // W3 P3: times tables, division, multi-digit.  0 times, 1 div, 2 mul-multi, 3 add/sub-multi, 4 remainder/quotient, 5 story2, 6 share
(r,p)=>{const hi=p.stage>=3?12:9,a=N(r,p,2,hi),b=N(r,p,2,9),s=a*b;return o('times',`${a}×${b}＝？`,s,'用九九乘法表。',timesHow(a,b),[s+a,s-a,s+b,s-b,a+b],`${a}*${b}`)},
(r,p)=>{const b=N(r,p,2,9),q=N(r,p,2,12),s=b*q;return o('div',`${s}÷${b}＝？`,q,`想想 ${b} 乘幾等於 ${s}。`,`除法是乘法倒轉：想 ${b} 乘幾等於 ${s}，${b}×${q}＝${s}，所以 ${s}÷${b}＝${q}。`,[q+1,q-1,s-b,b],`${s}/${b}`)},
(r,p)=>{const a=N(r,p,12,999),b=N(r,p,2,9),s=a*b;return o('mul-multi',`${a}×${b}＝？`,s,'把多位數拆開，逐位乘，再相加。',mulHow(a,b),[s+b*10,s-b*10,s+100,s-100,a+b],`${a}*${b}`)},
(r,p)=>{const a=N(r,p,120,9000);if(r()<.5){const b=N(r,p,100,9000-1),s=a+b;return o('add-multi',`${a}＋${b}＝？`,s,'從個位開始逐位加，留意進位。',addHow(a,b),[s+100,s-100,s+10,s-10,s+1000],`${a}+${b}`)}const b=N(r,p,100,a-1),s=a-b;return o('sub-multi',`${a}－${b}＝？`,s,'從個位開始逐位減，留意退位。',subHow(a,b),[s+100,s-100,s+10,s-10,a+b],`${a}-${b}`)},
(r,p)=>{const b=N(r,p,2,9),q=N(r,p,2,12),m=ri(r,1,b-1),a=b*q+m;if(r()<.5)return o('remainder',`${a}÷${b} 的餘數是多少？`,m,'先找最接近而不超過的倍數。',`找最接近而不超過 ${a} 的 ${b} 的倍數：${b}×${q}＝${b*q}，${a}－${b*q}＝${m}，餘數是 ${m}（比 ${b} 小）。`,[q,m+1,b-m,m-1>0?m-1:m+2],`${a}%${b}`);return o('quotient',`${a}÷${b} 的商（不計餘數）是多少？`,q,'找出最大的倍數而不超過被除數。',`找最大的倍數而不超過 ${a}：${b}×${q}＝${b*q}（${b}×${q+1}＝${b*(q+1)} 就超過了），所以商是 ${q}，餘 ${m}。`,[q+1,q-1,m,q+2],`(${a}-${m})/${b}`)},
(r,p)=>{const a=N(r,p,3,25),b=N(r,p,2,9),c=N(r,p,1,a*b-1),m=nm(r),s=a*b-c;return o('story2',`${m}買了 ${b} 包糖，每包有 ${a} 粒，然後送出 ${c} 粒，還剩下多少粒？`,s,'先求一共有多少粒。',`分兩步：先求一共有多少粒，${a}×${b}＝${a*b}；再減去送出的 ${c} 粒，${a*b}－${c}＝${s}。`,[a*b+c,a*b,s+1,s-1,a+b-c>0?a+b-c:s+2],`${a}*${b}-${c}`)},
(r,p)=>{const b=N(r,p,2,9),q=N(r,p,3,30),t=b*q,m=nm(r);return o('share',`${m}有 ${t} 張貼紙，平均分給 ${b} 個人，每人分到多少張？`,q,'平均分用除法。',`平均分用除法：${t}÷${b}＝${q}，每人分到 ${q} 張。檢查：${b}×${q}＝${t}。`,[q+1,q-1,t-b,b],`${t}/${b}`)}
],
[ // W4 P4: fractions and decimals intro.  0 frac-add, 1 frac-sub, 2 frac-of, 3 dec-add, 4 dec-sub, 5 frac-dec, 6 frac-eq
(r,p)=>{const d=N(r,p,3,12),a=ri(r,1,d-2),b=ri(r,1,d-1-a),g=gcd(a+b,d);return o('frac-add',`${a}/${d}＋${b}/${d}＝？（答案寫成最簡分數，例如 3/4）`,fr(a+b,d),'分母相同，只加分子。',`分母相同（都是 ${d} 份），只把分子相加：${a}＋${b}＝${a+b}，得 ${a+b}/${d}；${g>1?`分子分母同除以 ${g}，化簡得 ${fr(a+b,d)}`:'已經是最簡分數，不用再化簡'}。`,[`${a+b}/${2*d}`,`${a*b}/${d}`,`${a+b+1}/${d}`,`${a+b}/${d+1}`],null,null,'simplest')},
(r,p)=>{const d=N(r,p,3,12),a=ri(r,2,d-1),b=ri(r,1,a-1),g=gcd(a-b,d);return o('frac-sub',`${a}/${d}－${b}/${d}＝？（答案寫成最簡分數，例如 3/4）`,fr(a-b,d),'分母相同，只減分子。',`分母相同（都是 ${d} 份），只把分子相減：${a}－${b}＝${a-b}，得 ${a-b}/${d}；${g>1?`分子分母同除以 ${g}，化簡得 ${fr(a-b,d)}`:'已經是最簡分數，不用再化簡'}。`,[`${a-b}/${d*2}`,`${a-b}/${d-1<2?d+1:d-1}`,`${a+b}/${d}`,`${a-b+1}/${d}`],null,null,'simplest')},
(r,p)=>{const d=pk(r,[2,3,4,5,6,8,10].slice(0,3+Math.round(4*p.s))),k=N(r,p,2,12),t=d*k,n=ri(r,1,d-1),s=n*k;return o('frac-of',`${t} 個蘋果的 ${n}/${d} 是多少個？`,s,`先求 1/${d} 是多少。`,`先求 1 份：把 ${t} 平均分成 ${d} 份，${t}÷${d}＝${k}；再取 ${n} 份：${k}×${n}＝${s}。`,[k,t-s,s+k,s-k>0?s-k:s+1],`${t}/${d}*${n}`)},
(r,p)=>{const u=p.s>.6?100:10,dg=u===10?1:2,hi=u===10?60:600,A=N(r,p,1,hi),B=N(r,p,1,hi),f=x=>(x/u).toFixed(dg),s=fx((A+B)/u),un=u===10?'0.1':'0.01';return o('dec-add',`${f(A)}＋${f(B)}＝？`,s,'小數點要對齊，再逐位相加。',`小數點對齊再加：${f(A)} 是 ${A} 個 ${un}，${f(B)} 是 ${B} 個 ${un}，合共 ${A}＋${B}＝${A+B} 個 ${un}，即 ${s}。`,[(A+B)/u+1,(A+B)/u-.1*(u===10?1:.1),(A+B)/(u*10),A+B],`${fx(A/u)}+${fx(B/u)}`,[f(A+B)])},
(r,p)=>{const u=p.s>.6?100:10,dg=u===10?1:2,hi=u===10?99:900,A=N(r,p,5,hi),B=N(r,p,1,A-1),f=x=>(x/u).toFixed(dg),s=fx((A-B)/u),un=u===10?'0.1':'0.01';return o('dec-sub',`${f(A)}－${f(B)}＝？`,s,'小數點要對齊，留意退位。',`小數點對齊再減：${f(A)} 是 ${A} 個 ${un}，${f(B)} 是 ${B} 個 ${un}，相差 ${A}－${B}＝${A-B} 個 ${un}，即 ${s}。`,[(A-B)/u+1,(A-B)/u+(u===10?.1:.01),(A-B)/(u*10),A-B],`${fx(A/u)}-${fx(B/u)}`,[f(A-B)])},
(r,p)=>{const L=FRAC_DEC,l=L.slice(0,3+Math.round(p.s*(L.length-3))),[a,b]=pk(r,l),pw=[10,100,1000].find(x=>x%b===0);return o('frac-dec',`${a}/${b} 化成小數是多少？（答案寫成小數）`,fx(a/b),`試試把分母變成 10 或 100，或做 ${a}÷${b}。`,(b===pw?`分母已經是 ${pw}，${a}/${b} 就是 ${a} 個十分之一，＝${fx(a/b)}。`:`把分母 ${b} 變成 ${pw}：分子分母同乘 ${pw/b}，${a}/${b}＝${a*pw/b}/${pw}＝${fx(a/b)}。`)+`（也可以做除法：${a}÷${b}＝${fx(a/b)}）`,[a/b*10,a/b/10,b/a<1?b/a:a/b+.1,a/b+.1],null,null,'dec')},
(r,p)=>{const b=N(r,p,2,9),a=ri(r,1,b-1),k=N(r,p,2,6);return o('frac-eq',`${a}/${b}＝☐/${b*k}，☐ 是多少？`,a*k,'分母乘幾倍，分子也乘幾倍。',`分母由 ${b} 變成 ${b*k}，乘了 ${k}；分數的值不變，分子也要乘 ${k}：${a}×${k}＝${a*k}。`,[a+k,a,a*k+1,a*k-1],`${a}*${k}`)}
],
[ // W5 P5: decimals, percent, average.  0 dec-mul, 1 dec-div, 2 percent-of, 3 frac-pct, 4 mean, 5 discount, 6 mean-missing
(r,p)=>{const A=N(r,p,12,99),c=N(r,p,2,9),s=fx(A*c/10);return o('dec-mul',`${(A/10).toFixed(1)}×${c}＝？`,s,'先當作整數乘，再放回小數點。',`先當作整數乘：${A}×${c}＝${A*c}；${(A/10).toFixed(1)} 有 1 位小數，積也要有 1 位小數，所以是 ${s}。`,[A*c/100,A*c,A*c/10+1,A*c/10-1],`${A/10}*${c}`,[(A*c/10).toFixed(1)])},
(r,p)=>{const Q=N(r,p,2,60),c=N(r,p,2,9),A=Q*c,s=fx(Q/10);return o('dec-div',`${(A/10).toFixed(1)}÷${c}＝？`,s,'先當作整數除，再放回小數點。',`先當作整數除：${A}÷${c}＝${Q}；被除數有 1 位小數，商也有 1 位小數，所以是 ${s}。`,[Q/100,Q,Q/10+1,Q/10+.1],`${A/10}/${c}`,[(Q/10).toFixed(1)])},
(r,p)=>{const pc=pk(r,[10,50,20,25,5,30,40,75,60,15].slice(0,4+Math.round(6*p.s))),m=100/gcd(pc,100),N0=m*ri(r,1,2+Math.round(p.s*9)),s=N0*pc/100,sp={10:`10% 就是十分之一，把 ${N0} 除以 10：${N0}÷10＝${s}。`,50:`50% 就是一半：${N0}÷2＝${s}。`,25:`25% 就是四分之一：${N0}÷4＝${s}。`}[pc];return o('percent-of',`${N0} 的 ${pc}% 是多少？`,s,`${pc}% 即是 ${pc}/100。`,sp||`${pc}% 就是 100 份中取 ${pc} 份：先乘 ${pc}，再除以 100：${N0}×${pc}＝${N0*pc}，${N0*pc}÷100＝${s}。`,[N0*pc,N0-s,N0+s,s*10],`${N0}*${pc}/100`)},
(r,p)=>{const b=pk(r,[2,4,5,10,20,25,50].slice(0,3+Math.round(4*p.s))),a=ri(r,1,b-1),s=a*100/b;return o('frac-pct',`${a}/${b} 等於百分之幾？（答案只寫數字，單位：%）`,s,'把分母化成 100。',`百分數的分母是 100：${b}×${100/b}＝100，分子也要乘 ${100/b}：${a}×${100/b}＝${s}，所以是 ${s}%。`,[a*b,s/10,100-s,s+10],`${a}*100/${b}`)},
(r,p)=>{const k=ri(r,3,3+Math.round(3*p.s)),m=N(r,p,5,90),v=spread(r,k,m,Math.min(m-1,2+Math.round(10*p.s)));return o('mean',`某同學 ${k} 次測驗的分數是：${v.join('、')}。平均分是多少？`,m,'平均數＝總和 ÷ 項數。',`平均數＝總和÷次數：先把分數加起來，${v.join('＋')}＝${k*m}，再除以 ${k}：${k*m}÷${k}＝${m}。`,[k*m,m+1,m-1,Math.max(...v)],`(${v.join('+')})/${k}`)},
(r,p)=>{const P=10*N(r,p,3,60),z=pk(r,[9,8,5,7,6].slice(0,2+Math.round(3*p.s))),s=P*z/10;return o('discount',`原價 $${P} 的貨品打${CN[z]}折出售，售價是多少元？（答案只寫數字）`,s,`${CN[z]}折即是原價的 ${z}/10。`,`${CN[z]}折就是付原價的 ${z}/10：先求 1/10，${P}÷10＝${P/10}，再乘 ${z}：${P/10}×${z}＝${s}（元）。`,[P*(10-z)/10,P-z,P*z/100,s+10],`${P}*${z}/10`)},
(r,p)=>{const k=ri(r,3,3+Math.round(2*p.s)),m=N(r,p,40,90),v=spread(r,k,m,Math.min(15,2+Math.round(10*p.s))),f=v.slice(0,k-1),l=v[k-1],nn=nm(r),sm=f.reduce((a,b)=>a+b,0);return o('mean-missing',`${nn}前 ${k-1} 次測驗的分數是 ${f.join('、')}。若 ${k} 次測驗的平均分是 ${m}，第 ${k} 次要考多少分？`,l,'先求出總分應該是多少。',`平均數×次數＝總分：${m}×${k}＝${m*k}；前 ${k-1} 次已得 ${f.join('＋')}＝${sm}，所以第 ${k} 次要考 ${m*k}－${sm}＝${l}。`,[m,l+1,l-1,m*k],`${m}*${k}-(${f.join('+')})`)}
],
[ // W6 P6: perimeter, area, speed, ratio.  0 perim, 1 area, 2 tri-area, 3 speed, 4 ratio-share, 5 ratio-scale, 6 area-sub
(r,p)=>{if(r()<.3){const a=N(r,p,3,40);return o('perim',`正方形的邊長是 ${a} 厘米，周界是多少厘米？（答案只寫數字）`,4*a,'正方形有四條相等的邊。',`正方形四條邊一樣長，周界＝邊長×4：${a}×4＝${4*a}（厘米）。`,[a*a,2*a,a*3,4*a+4],`4*${a}`)}const l=N(r,p,3,40),w=N(r,p,2,l-1);return o('perim',`長方形的長是 ${l} 厘米，闊是 ${w} 厘米，周界是多少厘米？（答案只寫數字）`,2*(l+w),'周界是四條邊的總長。',`長方形對邊相等，周界＝(長＋闊)×2：(${l}＋${w})×2＝${l+w}×2＝${2*(l+w)}（厘米）。`,[l*w,l+w,2*l+w,l*2+w*2+2],`2*(${l}+${w})`)},
(r,p)=>{if(r()<.3){const a=N(r,p,3,25);return o('area',`正方形的邊長是 ${a} 厘米，面積是多少平方厘米？（答案只寫數字）`,a*a,'面積＝邊長×邊長。',`面積是鋪滿多少個 1 平方厘米；正方形面積＝邊長×邊長：${a}×${a}＝${a*a}（平方厘米）。`,[4*a,2*a,a*a+a,a*a-a],`${a}*${a}`)}const l=N(r,p,3,40),w=N(r,p,2,l-1);return o('area',`長方形的長是 ${l} 厘米，闊是 ${w} 厘米，面積是多少平方厘米？（答案只寫數字）`,l*w,'面積＝長×闊。',`面積是鋪滿多少個 1 平方厘米；長方形面積＝長×闊：${l}×${w}＝${l*w}（平方厘米）。`,[2*(l+w),l+w,l*w+l,l*w-w],`${l}*${w}`)},
(r,p)=>{const b=N(r,p,3,30);let h=N(r,p,2,24);if(b*h%2)h++;const s=b*h/2;return o('tri-area',`三角形的底是 ${b} 厘米，高是 ${h} 厘米，面積是多少平方厘米？（答案只寫數字）`,s,'三角形面積＝底×高÷2。',`三角形是同底同高長方形的一半：先算長方形 ${b}×${h}＝${b*h}，再除以 2：${b*h}÷2＝${s}（平方厘米）。`,[b*h,b+h,s+b,s-h>0?s-h:s+2],`${b}*${h}/2`)},
(r,p)=>{const v=N(r,p,20,90),t=N(r,p,2,8),d=v*t,k=ri(r,0,2);if(k===0)return o('speed',`一輛巴士以每小時 ${v} 公里的速度行駛 ${t} 小時，共行駛多少公里？`,d,'路程＝速度×時間。',`路程＝速度×時間：每小時行 ${v} 公里，行 ${t} 小時，就是 ${t} 個 ${v}：${v}×${t}＝${d}（公里）。`,[v+t,d+v,d-v,d/10],`${v}*${t}`);if(k===1)return o('speed',`一輛巴士行駛了 ${d} 公里，用了 ${t} 小時，平均每小時行駛多少公里？`,v,'速度＝路程÷時間。',`速度＝路程÷時間：${d} 公里平均分給 ${t} 小時，${d}÷${t}＝${v}（公里／小時）。`,[d*t,v+1,v-1,d-t],`${d}/${t}`);return o('speed',`一輛巴士以每小時 ${v} 公里的速度行駛，要行駛 ${d} 公里，需要多少小時？`,t,'時間＝路程÷速度。',`時間＝路程÷速度：看看 ${d} 公里裏有幾個 ${v} 公里，${d}÷${v}＝${t}（小時）。`,[v,t+1,t-1,d-v>0?d-v:t+2],`${d}/${v}`)},
(r,p)=>{const a=N(r,p,1,5),b=N(r,p,2,7),T=(a+b)*N(r,p,2,15),x=r()<.5,q=T/(a+b)*(x?a:b),per=T/(a+b);return o('ratio-share',`紅珠和藍珠的數量比是 ${a}:${b}，共有 ${T} 粒，${x?'紅':'藍'}珠有多少粒？`,q,'先求每一份是多少。',`先把比當作份數：共 ${a}＋${b}＝${a+b} 份，每份 ${T}÷${a+b}＝${per}；${x?'紅':'藍'}珠佔 ${x?a:b} 份：${per}×${x?a:b}＝${q}（粒）。`,[per,T-q,q+per,per*(x?b:a)],`${T}/(${a}+${b})*${x?a:b}`)},
(r,p)=>{const x=N(r,p,1,6),y=N(r,p,2,9),k=N(r,p,2,12);return o('ratio-scale',`甲與乙的比是 ${x}:${y}。若甲是 ${x*k}，乙是多少？`,k*y,'先求比的每一份是多少。',`先求一份是多少：甲佔 ${x} 份是 ${x*k}，一份＝${x*k}÷${x}＝${k}；乙佔 ${y} 份：${k}×${y}＝${k*y}。`,[x*k+y,k*y+k,k*y-k>0?k*y-k:k*y+1,k],`${x*k}/${x}*${y}`)},
(r,p)=>{const L=N(r,p,6,30),W=N(r,p,5,L-1),l2=N(r,p,2,L-3),w2=N(r,p,2,W-2),s=L*W-l2*w2;return o('area-sub',`一個長 ${L} 米、闊 ${W} 米的長方形地方，角落挖去一個長 ${l2} 米、闊 ${w2} 米的長方形水池，剩下的面積是多少平方米？（答案只寫數字）`,s,'大面積減去挖去的面積。',`剩下的面積＝大長方形－水池：大長方形 ${L}×${W}＝${L*W}，水池 ${l2}×${w2}＝${l2*w2}，${L*W}－${l2*w2}＝${s}（平方米）。`,[L*W+l2*w2,L*W,(L-l2)*(W-w2),s+l2],`${L}*${W}-${l2}*${w2}`)}
]
];

const OLY=[
[ // W1 sequences.  0 seq-arith, 1 seq-nth, 2 seq-geo, 3 seq-diff2, 4 seq-fib, 5 seq-inter, 6 seq-missing
(r,p)=>{const a=N(r,p,1,40),d=N(r,p,2,15),len=4+Math.round(2*p.s),t=[...Array(len)].map((_,i)=>a+d*i),s=a+d*len;return o('seq-arith',`找規律：${t.join('、')}、？`,s,'看看相鄰兩個數相差多少。',`看相鄰兩個數的差：${t[1]}－${t[0]}＝${d}，每次都加 ${d}；最後一個是 ${t[len-1]}，下一個 ${t[len-1]}＋${d}＝${s}。`,[s+1,s-1,s+d,t[len-1]+d+1],`${t[len-1]}+${d}`)},
(r,p)=>{const a=N(r,p,1,30),d=N(r,p,2,12),n=N(r,p,6,40),s=a+(n-1)*d;return o('seq-nth',`一列數：${a}、${a+d}、${a+2*d}、${a+3*d}、……，第 ${n} 項是多少？`,s,'第 n 項＝首項＋(n－1)×相差。',`第 n 項＝首項＋(n－1)×相差：相差是 ${d}，第 ${n} 項是由第 1 項再加 ${n-1} 次：${a}＋${n-1}×${d}＝${a}＋${(n-1)*d}＝${s}。`,[a+n*d,a+(n-2)*d,n*d,s+d],`${a}+(${n}-1)*${d}`)},
(r,p)=>{const k=pk(r,[2,2,3,4].slice(0,2+(p.s>.3?1:0)+(p.s>.6?1:0))),down=p.s>.3&&r()<.3,a=ri(r,1,2+Math.round(7*p.s));let len=4+(p.s>.6?1:0);while(len>3&&a*Math.pow(k,len)>2200)len--;
  if(down){const t=[...Array(len)].map((_,i)=>a*Math.pow(k,len-i));return o('seq-geo',`找規律：${t.join('、')}、？`,a,'每一項是前一項的幾分之一？',`看相鄰兩個數是幾倍關係：${t[0]}÷${t[1]}＝${k}，每次都除以 ${k}；${t[len-1]}÷${k}＝${a}。`,[a+1,a*k,t[len-1]-k>0?t[len-1]-k:a+2,a*2+1],`${t[len-1]}/${k}`)}
  const t=[...Array(len)].map((_,i)=>a*Math.pow(k,i)),s=t[len-1]*k;return o('seq-geo',`找規律：${t.join('、')}、？`,s,'每一項是前一項的幾倍？',`看相鄰兩個數是幾倍關係：${t[1]}÷${t[0]}＝${k}，每次都乘 ${k}；${t[len-1]}×${k}＝${s}。`,[t[len-1]+k,t[len-1]*2+1,s-k,t[len-1]+(t[len-1]-t[len-2])],`${t[len-1]}*${k}`)},(r,p)=>{const a=ri(r,1,8),d1=ri(r,1,3),e=ri(r,1,1+Math.round(p.s*2)),len=5+(p.s>.5?1:0),t=[a];for(let i=0;i<len;i++)t.push(t[i]+d1+e*i);const sh_=t.slice(0,len),df=sh_.slice(1).map((x,i)=>x-sh_[i]);return o('seq-diff2',`找規律：${sh_.join('、')}、？`,t[len],'看看相鄰兩數的差，這些差有什麼規律？',`先看相鄰兩數的差：${df.join('、')}；這些差每次多 ${e}，下一個差是 ${t[len]-t[len-1]}，所以 ${t[len-1]}＋${t[len]-t[len-1]}＝${t[len]}。`,[t[len]+1,t[len]-1,t[len-1]+(t[len-1]-t[len-2]),t[len]+e])},
(r,p)=>{const a=ri(r,1,4),b=ri(r,1,6),len=5+Math.round(p.s*2),t=[a,b];for(let i=2;i<=len;i++)t.push(t[i-1]+t[i-2]);return o('seq-fib',`一列數：${t.slice(0,len).join('、')}、？（由第 3 個數起，每個數都等於前兩個數之和）`,t[len],'下一個數＝最後兩個數相加。',`每個數都是前兩個數之和，所以下一個數是最後兩個數相加：${t[len-2]}＋${t[len-1]}＝${t[len]}。`,[t[len]+1,t[len]-1,t[len-1]+1,t[len-1]*2],`${t[len-2]}+${t[len-1]}`)},
(r,p)=>{const a=N(r,p,1,20),b=N(r,p,30,60),d=ri(r,1,2+Math.round(4*p.s)),e=ri(r,2,3+Math.round(6*p.s)),m=6+(r()<.5?1:0),t=[];for(let i=0;i<m+1;i++)t.push(i%2?b+e*((i-1)/2):a+d*(i/2));const sh_=t.slice(0,m),od=sh_.filter((_,i)=>i%2===0),ev_=sh_.filter((_,i)=>i%2===1);return o('seq-inter',`找規律：${sh_.join('、')}、？`,t[m],'把單數位置和雙數位置的數分開看。',`把數列分成兩行：第 1、3、5……個數是 ${od.join('、')}（每次加 ${d}），第 2、4、6……個數是 ${ev_.join('、')}（每次加 ${e}）；要找的是第 ${m+1} 個，在${m%2?'第二':'第一'}行，${t[m-2]}＋${m%2?e:d}＝${t[m]}。`,[t[m]+1,t[m]-1,m%2?t[m-1]+e:t[m-1]+d])},
(r,p)=>{const a=N(r,p,3,50),d=N(r,p,2,12),i=ri(r,1,4),t=[...Array(6)].map((_,j)=>j===i?'☐':a+d*j),s=a+d*i;return o('seq-missing',`找出空格的數：${t.join('、')}`,s,'先找出相鄰兩數的差。',`先找相鄰兩數的差：每次都加 ${d}；空格前面是 ${a+d*(i-1)}，所以 ☐＝${a+d*(i-1)}＋${d}＝${s}。`,[s+1,s-1,s+d,s-d],`${a}+${d}*${i}`)}
],
[ // W2 clever calculation.  0 make-whole, 1 gauss, 2 arith-sum, 3 quick-mul, 4 distrib, 5 alt-sum, 6 consec
(r,p)=>{const S=p.s>.55&&r()<.6?1000:100,x=ri(r,S/10+1,S-S/10-1),y=ri(r,S/10+1,S-S/10-1),e=ri(r,S/10,S-1),ts=sh(r,[x,y,S-x,S-y,e]),s=2*S+e;return o('make-whole',`${ts.join('＋')}＝？（想想怎樣湊整）`,s,`找兩個加起來是 ${S} 的數。`,`先找加起來湊成 ${S} 的一對：${x}＋${S-x}＝${S}，${y}＋${S-y}＝${S}；兩對共 ${2*S}，再加 ${e}：${2*S}＋${e}＝${s}。`,[s+S,s-S,s+10,s-10,s+1],ts.join('+'))},
(r,p)=>{const n=N(r,p,10,100),s=n*(n+1)/2;return o('gauss',`1＋2＋3＋……＋${n}＝？`,s,'頭尾配對，每對的和相同。',`頭尾配對：1＋${n}＝${n+1}，2＋${n-1}＝${n+1}，每對的和都一樣；${n} 個數配成 ${n}÷2 對，所以 ${n+1}×${n}÷2＝${s}。`,[n*(n+1),s+n,s-n,n*n/2+0.5>0?Math.round(n*n/2):s+1],`${n}*(${n}+1)/2`)},
(r,p)=>{const a=ri(r,1,9),d=ri(r,2,9),n=N(r,p,5,30),l=a+d*(n-1),s=n*(a+l)/2;return o('arith-sum',`${a}＋${a+d}＋${a+2*d}＋……＋${l}（每項比前一項多 ${d}，共 ${n} 項）＝？`,s,'(首項＋末項)×項數÷2。',`首尾配對，每對的和都是首項＋末項：${a}＋${l}＝${a+l}；共 ${n} 項，配成 ${n}÷2 對：${a+l}×${n}÷2＝${s}。`,[n*(a+l),s+l,s-a,s+d],`${n}*(${a}+${l})/2`)},
(r,p)=>{const K=pk(r,[[99,0],[101,0],[11,0],[25,1],[5,2]].slice(0,2+Math.round(3*p.s)));let a=N(r,p,12,99);if(K[1]===1)a=4*ri(r,3,24);if(K[1]===2)a=2*ri(r,6,49);const s=a*K[0],hh={99:'×99＝×100 再減一份。',101:'×101＝×100 再加一份。',11:'×11＝×10 再加一份。',25:'×25＝×100÷4。',5:'×5＝×10÷2。'}[K[0]],ee={99:`×99 可以看成 ×100 再減去一份：${a}×100－${a}＝${a*100}－${a}＝${s}。`,101:`×101 可以看成 ×100 再加上一份：${a}×100＋${a}＝${a*100}＋${a}＝${s}。`,11:`×11 可以看成 ×10 再加上一份：${a}×10＋${a}＝${a*10}＋${a}＝${s}。`,25:`25 是 100 的四分之一，×25 可以看成 ×100 再除以 4：${a}×100÷4＝${a*100}÷4＝${s}。`,5:`×5 可以看成 ×10 再除以 2：${a}×10÷2＝${a*10}÷2＝${s}。`}[K[0]];return o('quick-mul',`${a}×${K[0]}＝？`,s,hh,ee,[s+a,s-a,s+10,s-10],`${a}*${K[0]}`)},
(r,p)=>{const x=N(r,p,12,99),c=ri(r,11,90);if(r()<.5){const q=ri(r,11,89);return o('distrib',`${x}×${q}＋${x}×${100-q}＝？`,x*100,'相同的因數可以提出來。',`${x} 是相同的因數，把它提出來，先算括號：${x}×(${q}＋${100-q})＝${x}×100＝${x*100}。`,[x*10,x*100+x,x*100-x,x*1000],`${x}*${q}+${x}*${100-q}`)}const m=pk(r,[10,100,20,50]);return o('distrib',`${x}×${c+m}－${x}×${c}＝？`,x*m,'相同的因數可以提出來。',`${x} 是相同的因數，把它提出來，先算括號：${x}×(${c+m}－${c})＝${x}×${m}＝${x*m}。`,[x*(m+c),x*m+x,x*m-x,x*c],`${x}*${c+m}-${x}*${c}`)},
(r,p)=>{const n=2*N(r,p,3,50);return o('alt-sum',`${n}－${n-1}＋${n-2}－${n-3}＋……＋2－1＝？`,n/2,'兩個兩個一組，看每組的結果。',`兩個兩個一組：(${n}－${n-1})，(${n-2}－${n-3})，……，(2－1)，每組的結果都是 1；${n} 個數共 ${n}÷2＝${n/2} 組，所以是 ${n/2}。`,[n,n/2+1,n/2-1,n-1],`${n}/2`)},
(r,p)=>{const k=pk(r,[3,5,7].slice(0,1+Math.round(2*p.s))),mid=N(r,p,5,200),S=mid*k,s=mid+(k-1)/2;return o('consec',`${k} 個連續整數的和是 ${S}，其中最大的一個是多少？`,s,'連續整數的平均數就是中間那個數。',`連續整數的平均數就是中間那個數：${S}÷${k}＝${mid}；${k} 個連續數，最大的比中間大 ${(k-1)/2}，所以是 ${mid}＋${(k-1)/2}＝${s}。`,[mid,s+1,s-1,mid-(k-1)/2],`${S}/${k}+${(k-1)/2}`)}
],
[ // W3 logic, ordering, planting.  0 queue, 1 between, 2 plant, 3 saw, 4 liars, 5 rank, 6 left-right
(r,p)=>{const a=N(r,p,1,30),b=N(r,p,1,30),m=nm(r);return o('queue',`${m}排隊，${m.p}前面有 ${a} 人，後面有 ${b} 人，隊伍一共有多少人？`,a+b+1,`別忘了把${m.p}自己算進去。`,`別忘了把自己算進去：前面 ${a} 人，加上自己 1 人，再加後面 ${b} 人：${a}＋1＋${b}＝${a+b+1}。`,[a+b,a+b+2,a+b-1,a*b],`${a}+${b}+1`)},
(r,p)=>{const a=N(r,p,1,15),b=a+N(r,p,2,12);return o('between',`同學們按身高由高至低排隊，小明排第 ${a}，小華排第 ${b}，兩人中間有多少人？`,b-a-1,'兩個名次相差多少，中間就少一個。',`中間的人排第 ${a+1} 至第 ${b-1}，人數＝大名次－小名次－1：${b}－${a}－1＝${b-a-1}。`,[b-a,b-a+1,b-a-2>0?b-a-2:b-a+2,b+a],`${b}-${a}-1`)},
(r,p)=>{const d=pk(r,[2,3,4,5,6,10]),m=N(r,p,4,40),L=d*m,v=ri(r,0,2);if(v===0)return o('plant',`一條長 ${L} 米的路，每隔 ${d} 米種一棵樹，兩端都要種，一共要種多少棵樹？`,m+1,'段數比棵數少一。',`每隔 ${d} 米是一段，先求段數：${L}÷${d}＝${m} 段；兩端都種，棵數比段數多 1：${m}＋1＝${m+1}。`,[m,m+2,L/d*2,m-1],`${L}/${d}+1`);if(v===1)return o('plant',`一條長 ${L} 米的路，每隔 ${d} 米種一棵樹，只有一端種樹，另一端不種，一共要種多少棵樹？`,m,'一端種、一端不種時，棵數＝段數。',`先求段數：${L}÷${d}＝${m} 段；一端種、一端不種，每段配一棵樹，所以棵數＝段數＝${m}。`,[m+1,m-1,m*2,L-d],`${L}/${d}`);return o('plant',`一個周界 ${L} 米的環形水池，每隔 ${d} 米放一盞燈，一共要放多少盞燈？`,m,'環形時，棵數＝段數。',`環形沒有端點，首尾相連，每段配一盞燈，所以燈數＝段數：${L}÷${d}＝${m}。`,[m+1,m-1,m*2,L-d],`${L}/${d}`)},
(r,p)=>{const k=N(r,p,3,12),t=ri(r,2,6);if(r()<.5)return o('saw',`把一根木頭鋸成 ${k} 段，每鋸一刀要 ${t} 分鐘（鋸完立即再鋸，不休息），一共需要多少分鐘？`,(k-1)*t,'鋸成幾段，要鋸的刀數少一。',`鋸成 ${k} 段，要鋸的刀數比段數少 1：${k}－1＝${k-1} 刀；每刀 ${t} 分鐘，${k-1}×${t}＝${(k-1)*t} 分鐘。`,[k*t,(k+1)*t,(k-2)*t,k+t],`(${k}-1)*${t}`);const f=k+1;return o('saw',`${nm(r)}從 1 樓走到 ${f} 樓，每走一層樓梯需要 ${t} 秒，一共需要多少秒？`,(f-1)*t,'由 1 樓走到 n 樓，只走 n－1 層。',`由 1 樓走到 ${f} 樓，只走 ${f}－1＝${f-1} 層樓梯（一層樓梯連接兩層樓）；${f-1}×${t}＝${(f-1)*t} 秒。`,[f*t,(f+1)*t,(f-2)*t,f+t],`(${f}-1)*${t}`)},
(r,p)=>{if(p.s>.3&&r()<.55){const v=liarsGroups(r,p);if(v)return v}const n=N(r,p,3,10);return o('liars',`有 ${n} 個人，第 1 人說：「我們之中有 1 個人說謊。」第 2 人說：「我們之中有 2 個人說謊。」……第 ${n} 人說：「我們之中有 ${n} 個人說謊。」實際上有多少個人說謊？`,n-1,'這些說法互相矛盾，最多只有一句是真的。',`這些說法互相矛盾，最多只有一句是真話。若沒有人說真話，那第 ${n} 人說的「有 ${n} 人說謊」就變成真話，矛盾；所以恰好 1 人說真話，說謊的有 ${n}－1＝${n-1} 人。`,[n,1,n-2>0?n-2:n+1,n+1],`${n}-1`)},
(r,p)=>{const k=N(r,p,4,5),L=[...'甲乙丙丁戊'].slice(0,k),ord=sh(r,L),f=[];for(let i=0;i<k-1;i++)f.push(r()<.5||p.s<.3?`${ord[i]}比${ord[i+1]}高`:`${ord[i+1]}比${ord[i]}矮`);const idx=ri(r,0,k-1);return Object.assign(o('rank',`${k} 個人比身高。${sh(r,f).join('；')}。由高至低排，${ord[idx]}排第幾？`,idx+1,'先把大家由高至低排成一行。',`把每句話連起來，排成一行（由高至低）：${ord.join('、')}；${ord[idx]}排第 ${idx+1}。`,[...Array(k)].map((_,i)=>i+1).filter(v=>v!==idx+1)),{lim:[1,k]})},
(r,p)=>{const a=N(r,p,2,30),b=N(r,p,2,30),m=nm(r);return o('left-right',`${m}在隊伍中，從左面數起排第 ${a}，從右面數起排第 ${b}，隊伍共有多少人？`,a+b-1,`${m.p}被左右兩邊都數了一次。`,`從左數第 ${a}、從右數第 ${b}，${m}被左右兩邊各數了一次，要減去 1：${a}＋${b}－1＝${a+b-1}。`,[a+b,a+b-2,a+b+1,a*b],`${a}+${b}-1`)}
],
[ // W4 ages, sum/diff/multiple, chicken-rabbit.  0 sum-diff, 1 sum-mult, 2 diff-mult, 3 age, 4 chicken-rabbit, 5 coins, 6 three
(r,p)=>{const big=N(r,p,6,60),sm=N(r,p,2,big-1),S=big+sm,D=big-sm;if(r()<.6)return o('sum-diff',`甲乙兩數的和是 ${S}，差是 ${D}，甲是較大的數，甲是多少？`,big,'較大數＝(和＋差)÷2。',`和差問題：和＋差＝2 個較大的數，所以較大數＝(和＋差)÷2＝(${S}＋${D})÷2＝${S+D}÷2＝${big}。`,[sm,S-D,big+1,big-1],`(${S}+${D})/2`);return o('sum-diff',`甲乙兩數的和是 ${S}，差是 ${D}，乙是較小的數，乙是多少？`,sm,'較小數＝(和－差)÷2。',`和差問題：和－差＝2 個較小的數，所以較小數＝(和－差)÷2＝(${S}－${D})÷2＝${S-D}÷2＝${sm}。`,[big,S-D,sm+1,sm-1],`(${S}-${D})/2`)},
(r,p)=>{const sm=N(r,p,3,40),k=N(r,p,2,6),S=sm*(k+1);if(r()<.5)return o('sum-mult',`甲乙兩數的和是 ${S}，甲是乙的 ${k} 倍，乙是多少？`,sm,`把乙看作 1 份，甲就是 ${k} 份。`,`把乙看作 1 份，甲就是 ${k} 份，共 ${k}＋1＝${k+1} 份；一份是乙：${S}÷${k+1}＝${sm}。`,[sm*k,S/k>0&&S%k===0?S/k:sm+1,sm+1,S-k],`${S}/(${k}+1)`);return o('sum-mult',`甲乙兩數的和是 ${S}，甲是乙的 ${k} 倍，甲是多少？`,sm*k,`把乙看作 1 份，甲就是 ${k} 份。`,`把乙看作 1 份，甲就是 ${k} 份，共 ${k}＋1＝${k+1} 份；一份（乙）＝${S}÷${k+1}＝${sm}，甲＝${sm}×${k}＝${sm*k}。`,[sm,S-k,sm*k+sm,sm*k-sm],`${S}/(${k}+1)*${k}`)},
(r,p)=>{const sm=N(r,p,3,40),k=N(r,p,2,6),D=sm*(k-1);return o('diff-mult',`甲比乙多 ${D}，而且甲是乙的 ${k} 倍，乙是多少？`,sm,`甲比乙多出 ${k-1} 份。`,`把乙看作 1 份，甲是 ${k} 份，甲比乙多 ${k}－1＝${k-1} 份；這 ${k-1} 份就是多出的 ${D}，一份（乙）＝${D}÷${k-1}＝${sm}。`,[D,sm*k,sm+1,D/k>0&&D%k===0?D/k:sm-1>0?sm-1:sm+2],`${D}/(${k}-1)`)},
(r,p)=>{let b,x,k,a;for(let t=0;t<50;t++){b=N(r,p,5,15);x=N(r,p,2,10);k=ri(r,2,3+(p.s>.6?1:0));a=k*(b+x)-x;if(a<=65)break}if(a>65){b=8;x=4;k=3;a=32}const df=a-b,sn=df/(k-1);return o('age',`今年爸爸 ${a} 歲，兒子 ${b} 歲，幾年後爸爸的年齡是兒子的 ${k} 倍？`,x,'兩人的年齡差永遠不變。',`年齡差 ${df} 歲永遠不變；${k} 倍時，兒子占 1 份、爸爸占 ${k} 份，差 ${k-1} 份＝${df}，1 份＝${df}÷${k-1}＝${sn}，即那時兒子 ${sn} 歲，所以是 ${sn}－${b}＝${x} 年後。`,[sn,x+1,x-1>0?x-1:x+2,df])},
(r,p)=>{const th=r()<.7?{n1:'雞',n2:'兔',l1:2,l2:4,part:'腳',u:'隻',pu:'隻',at:'籠裏'}:{n1:'單車',n2:'三輪車',l1:2,l2:3,part:'輪',u:'輛',pu:'個',at:'車房裏'},c=N(r,p,2,20),t=N(r,p,2,20),H=c+t,F=th.l1*c+th.l2*t,ask=r()<.5,dF=F-th.l1*H,dl=th.l2-th.l1,uu=th.u,pp=th.pu+th.part;return o('chicken-rabbit',`${th.at}有${th.n1}和${th.n2}共 ${H} ${uu}，共有 ${F} ${pp}。${ask?th.n2:th.n1}有多少${uu}？（${th.n1}有 ${th.l1} ${pp}，${th.n2}有 ${th.l2} ${pp}）`,ask?t:c,`假設全部都是${th.n1}，看看${th.part}數差多少。`,`先假設全部是${th.n1}：${H}×${th.l1}＝${th.l1*H} ${pp}，比實際少 ${dF}；每把 1 ${uu}${th.n1}換成${th.n2}，就多 ${dl} ${pp}，所以${th.n2}有 ${dF}÷${dl}＝${t} ${uu}，${th.n1}有 ${H}－${t}＝${c} ${uu}。`,[ask?c:t,H,(ask?t:c)+1,(ask?t:c)-1>0?(ask?t:c)-1:(ask?t:c)+2],ask?`(${F}-${th.l1}*${H})/${dl}`:`(${th.l2}*${H}-${F})/${dl}`)},
(r,p)=>{const x=N(r,p,2,15),y=N(r,p,2,15),n=x+y,M=2*x+5*y,ask=r()<.5;return o('coins',`錢罌內有 $2 和 $5 的硬幣共 ${n} 枚，總值 $${M}。${ask?'$5':'$2'}硬幣有多少枚？`,ask?y:x,'假設全部都是 $2 硬幣。',`先假設全部是 $2 硬幣：${n}×2＝${2*n}，比實際少 ${M-2*n} 元；每把 1 枚 $2 換成 $5，就多 3 元，所以 $5 有 ${M-2*n}÷3＝${y} 枚，$2 有 ${n}－${y}＝${x} 枚。`,[ask?x:y,n,(ask?y:x)+1,(ask?y:x)-1>0?(ask?y:x)-1:(ask?y:x)+2],ask?`(${M}-2*${n})/3`:`(5*${n}-${M})/3`)},
(r,p)=>{const z=N(r,p,5,40),b=ri(r,1,10),a=ri(r,1,10),S=3*z+2*b+a;return o('three',`甲、乙、丙三人共有 ${S} 粒糖，甲比乙多 ${a} 粒，乙比丙多 ${b} 粒，丙有多少粒？`,z,'把三人都看作和丙一樣多，再補回多出的部分。',`把三人都看作和丙一樣多：甲＝丙＋${a+b}，乙＝丙＋${b}，多出的部分共 ${a+b}＋${b}＝${a+2*b}；去掉它，${S}－${a+2*b}＝${3*z} 就是 3 個丙，丙＝${3*z}÷3＝${z}。`,[S/3>0&&S%3===0?S/3:z+1,z+1,z-1>0?z-1:z+2,z+b],`(${S}-${a}-2*${b})/3`)}
],
[ // W5 counting.  0 perm, 1 handshake, 2 route, 3 squares/segments, 4 combo, 5 arrange, 6 knockout
(r,p)=>{const n=N(r,p,3,6),k=ri(r,2,Math.min(3,n)),c=sh(r,[1,2,3,4,5,6,7,8,9]).slice(0,n).sort((x,y)=>x-y),v=[...Array(k)].map((_,i)=>n-i),s=v.reduce((a,b)=>a*b,1);return o('perm',`用數字卡 ${c.join('、')}（每張只可用一次）組成不同的 ${k} 位數，一共可以組成多少個？`,s,`第一位有幾個選擇？第二位呢？`,`一位一位地選：第 1 位有 ${n} 種選擇；用過的卡不能再用，第 2 位有 ${n-1} 種${k>2?`，第 3 位有 ${n-2} 種`:''}；相乘：${v.join('×')}＝${s}。`,[n*k,Math.pow(n,k),s+n,s/ k>0&&s%k===0?s/k:s+1],v.join('*'))},
(r,p)=>{const n=N(r,p,3,20),s=n*(n-1)/2,sc=pk(r,[['個人聚會，每兩個人都握手一次，一共握手多少次','人','握手','次'],['個同學互相交換一張心意卡（每兩人只交換一次），一共交換多少次','人','交換','次'],['隊參加循環賽，每兩隊都要比賽一場，一共要比賽多少場','隊','比賽','場'],['位客人見面，每兩位客人都碰杯一次，一共碰杯多少次','人','碰杯','次'],['個朋友通電話，每兩個人都通話一次，一共通話多少次','人','通話','次']]);return o('handshake',`${n} ${sc[0]}？`,s,`每${sc[1]}和其他${sc[1]}${sc[2]}，但每${sc[3]}被算了兩次。`,`每${sc[1]}要和其他 ${n-1} ${sc[1]}${sc[2]}，${n} ${sc[1]}共 ${n}×${n-1}＝${n*(n-1)} ${sc[3]}；但每${sc[3]}被兩${sc[1]}各算了一次，所以要除以 2：${n*(n-1)}÷2＝${s}。`,[n*(n-1),s+n,s-n>0?s-n:s+1,n*n/2>0?Math.round(n*n/2):s+1],`${n}*(${n}-1)/2`)},
(r,p)=>{const m=N(r,p,2,8),n=N(r,p,2,8),k=p.s>.5?N(r,p,2,5):1;if(k===1)return o('route',pk(r,[`由甲地到乙地有 ${m} 條路，由乙地到丙地有 ${n} 條路，由甲地經乙地到丙地有多少種不同走法？`,`小明由家去車站有 ${m} 條路，由車站去學校有 ${n} 條路，他由家經車站到學校有多少種不同走法？`,`由碼頭乘船到小島有 ${m} 個班次，由小島乘纜車到山頂有 ${n} 個班次，由碼頭到山頂有多少種不同乘法？`]),m*n,'每條第一段路都可配搭每條第二段路。',`第一段 ${m} 條路中，每一條都可以接第二段的 ${n} 條路，用乘法：${m}×${n}＝${m*n}。`,[m+n,m*n+m,m*n-n,m*n+1],`${m}*${n}`);return o('route',`由甲地到乙地有 ${m} 條路，乙地到丙地有 ${n} 條路，丙地到丁地有 ${k} 條路，由甲地經乙、丙到丁地有多少種不同走法？`,m*n*k,'逐段相乘。',`每一段的選擇都可以和下一段任意配搭，逐段相乘：${m}×${n}×${k}＝${m*n*k}。`,[m+n+k,m*n*k+m,m*n+k,m*n*k-1],`${m}*${n}*${k}`)},
(r,p)=>{const n=N(r,p,2,6);if(r()<.5){if(p.s>.25&&r()<.45)return rectSquares(r,p);const t=[...Array(n)].map((_,i)=>`${n-i}*${n-i}`),s=n*(n+1)*(2*n+1)/6;return o('squares',pk(r,[`一個 ${n}×${n} 的方格網由 ${n*n} 個大小相同的小正方形組成，圖中一共有多少個正方形？（包括各種大小）`,`把邊長 ${n} 厘米的正方形，劃成 ${n*n} 個邊長 1 厘米的小方格，圖中一共有多少個正方形？（包括各種大小）`,`一塊 ${n}×${n} 的棋盤，共有 ${n*n} 格，棋盤上一共有多少個正方形？（包括各種大小）`]),s,'分開數：邊長 1、2、3……的正方形各有多少個。',`按邊長分開數：邊長 1 的有 ${n}×${n} 個，邊長 2 的有 ${n-1}×${n-1} 個……逐個加起來：${t.join('＋').replace(/\*/g,'×')}＝${s}。`,[n*n,s-n,s+n,n*n+n],t.join('+'))}if(p.s>.2&&r()<.4)return pairsGeo(r,p);const m=n+2,s=m*(m-1)/2,sc=pk(r,[[`一條直線上有 ${m} 個點，以其中任意兩點為端點，一共可得多少條線段？`,'點','線段'],[`一條直線上依次標了 ${[...'ABCDEFGHIJ'].slice(0,m).join('、')} 這 ${m} 個點，以其中任意兩點為端點，一共可得多少條線段？`,'點','線段'],[`一條路上有 ${m} 個車站，每兩個車站之間都有一種車票，一共有多少種不同的車票？（只算單程）`,'站','車票']]);return o('segments',sc[0],s,`每${sc[1]}和其他${sc[1]}配成一對，但每一對被算了兩次。`,`每個${sc[1]}可以和其他 ${m-1} 個${sc[1]}配成一對（一對就是一${sc[2]==='車票'?'種':'條'}${sc[2]}），共 ${m}×${m-1}＝${m*(m-1)}；但每一對被數了兩次，所以除以 2：${m*(m-1)}÷2＝${s}。`,[m*(m-1),s+m,s-m>0?s-m:s+1,m*m/2>0?Math.round(m*m/2):s+1],`${m}*(${m}-1)/2`)},(r,p)=>{const m=N(r,p,2,8),n=N(r,p,2,8),k=p.s>.4?N(r,p,2,5):1,nn=nm(r),v=r()<.5,e=`每個項目的選擇數相乘：${[m,n,k>1?k:null].filter(Boolean).join('×')}＝${m*n*k}。`;return o('combo',v?`${nn}有 ${m} 件上衣、${n} 條褲${k>1?`、${k} 對鞋`:''}，穿一套（上衣、褲${k>1?'、鞋':''}各一）有多少種不同配法？`:`餐廳的套餐：主食有 ${m} 款、飲品有 ${n} 款${k>1?`、甜品有 ${k} 款`:''}，每人每項各選一款，有多少種不同的套餐？`,m*n*k,'每個項目的選擇數相乘。',e,[m+n+k-(k>1?0:1),m*n*k+m,m*n*k-1,m*n+k],k>1?`${m}*${n}*${k}`:`${m}*${n}`)},
(r,p)=>{const n=N(r,p,3,7),ob=pk(r,[['個同學','排成一行拍照'],['個朋友','站成一行'],['個小朋友','排隊上車'],['位乘客','排隊入閘'],['位學生','排成一行領獎'],['位運動員','排成一行入場'],['位客人','排隊進餐廳'],['個小隊員','站成一行升旗']]);if(r()<.5){const s=fact(n);return o('arrange',`${n} ${ob[0]}${ob[1]}，有多少種不同排法？`,s,'第一個位置有 n 個選擇，之後逐個減少。',`一個位置一個位置地排：第 1 位有 ${n} 種選擇，之後每個位置少一種：${mul(n).replace(/\*/g,'×')}＝${s}。`,[n*n,n*(n-1),s*2,s-n],mul(n))}const pr=pk(r,[['小明','小華'],['阿強','家豪'],['小美','小欣'],['詩婷','小明'],['小華','阿強'],['家豪','小美'],['小欣','詩婷'],['小明','家豪']]),s=2*fact(n-1);return o('arrange-adj',`${n} 個人排成一行，其中${pr[0]}和${pr[1]}一定要相鄰，有多少種不同排法？（兩人的先後次序也要計算）`,s,'把相鄰的兩人當作一個人，再想這兩人的前後次序。',`把相鄰的兩人看成 1 個人，就剩 ${n-1} 個人排隊：${mul(n-1).replace(/\*/g,'×')}＝${fact(n-1)}；這兩人本身有 2 種先後次序，再乘 2：${fact(n-1)}×2＝${s}。`,[s/2,s*n,s+n,fact(n)],`2*${mul(n-1)}`)},
(r,p)=>{const n=N(r,p,4,32),sc=pk(r,[[`${n} 隊參加淘汰賽（每場比賽輸的一隊即被淘汰，直至剩下冠軍），一共要進行多少場比賽？`,'隊'],[`${n} 位選手參加乒乓球單淘汰賽（每場輸的一位即離場，直至剩下冠軍），一共要進行多少場比賽？`,'位'],[`${n} 個同學玩猜拳淘汰遊戲（每場輸的人即退出，只剩下最後一人為勝），一共要進行多少場比賽？`,'個']]);return o('knockout',sc[0],n-1,`每場比賽淘汰一${sc[1]}。`,`每場比賽淘汰 1 ${sc[1]}，要由 ${n} ${sc[1]}淘汰到只剩 1 ${sc[1]}（冠軍），就要淘汰 ${n}－1＝${n-1} ${sc[1]}，所以要進行 ${n-1} 場。`,[n,n/2>0?Math.floor(n/2):n+1,n*(n-1)/2,n-2],`${n}-1`)}
],
[ // W6 digit puzzles, remainders, surplus/deficit.  0 rem-shift, 1 crt, 2 surplus, 3 digits, 4 symbols, 5 cycle, 6 last-digit
(r,p)=>{const d=N(r,p,3,9),a=ri(r,1,d-1),k=ri(r,2,10+Math.round(20*p.s)),s=(a+k)%d;return o('rem-shift',`一個數除以 ${d} 餘 ${a}，這個數加 ${k} 後再除以 ${d}，餘數是多少？`,s,'只需要看餘數加上去之後的情況。',`只看餘數：餘 ${a}，再加 ${k}，得 ${a+k}；${a+k}÷${d}＝${Math.floor((a+k)/d)} 餘 ${s}，所以餘數是 ${s}。`,[a+k,(a+k)%d+1,a,k%d===s?s+1:k%d],`(${a}+${k})%${d}`)},
(r,p)=>{const P=[[3,4],[3,5],[4,5],[3,7],[5,7],[4,9],[5,8],[7,9]],[m1,m2]=pk(r,P.slice(0,3+Math.round(5*p.s))),r1=ri(r,1,m1-1),r2=ri(r,1,m2-1);let s=0;for(let n=1;n<=m1*m2;n++)if(n%m1===r1&&n%m2===r2){s=n;break}const vs=[];for(let v=r2;v<=s;v+=m2)vs.push(v);return o('crt',`一個數除以 ${m1} 餘 ${r1}，除以 ${m2} 餘 ${r2}，這個數最小是多少？（正整數）`,s,`列出除以 ${m2} 餘 ${r2} 的數，逐個試。`,`先列出除以 ${m2} 餘 ${r2} 的數：${vs.join('、')}；逐個試除以 ${m1}，第一個餘 ${r1} 的是 ${s}（${s}÷${m1}＝${Math.floor(s/m1)} 餘 ${r1}），所以最小是 ${s}。`,[s+m1,s+m2,s-m1>0?s-m1:s+m1*2,r1+r2])},
(r,p)=>{const n=N(r,p,3,20),a=ri(r,2,6),b=a+ri(r,1,3),pp=ri(r,1,n*(b-a)-1),q=n*(b-a)-pp,tot=n*a+pp;if(r()<.5)return o('surplus',`把一些糖果分給小朋友，每人分 ${a} 粒，多出 ${pp} 粒；每人分 ${b} 粒，則少 ${q} 粒。共有多少個小朋友？`,n,'兩種分法相差多少粒？每人相差多少粒？',`兩種分法的糖果數相差 ${pp}＋${q}＝${pp+q} 粒（多出的和不足的加起來），因為每人多分 ${b}－${a}＝${b-a} 粒，所以人數＝${pp+q}÷${b-a}＝${n}。`,[pp+q,n+1,n-1,tot],`(${pp}+${q})/(${b}-${a})`);return o('surplus',`把一些糖果分給小朋友，每人分 ${a} 粒，多出 ${pp} 粒；每人分 ${b} 粒，則少 ${q} 粒。共有多少粒糖果？`,tot,'先求出小朋友人數。',`先求人數：兩種分法相差 ${pp}＋${q}＝${pp+q} 粒，每人差 ${b}－${a}＝${b-a} 粒，人數＝${pp+q}÷${b-a}＝${n}；糖果＝${a}×${n}＋${pp}＝${tot}。`,[n,tot+a,tot-a,b*n],`${a}*${n}+${pp}`)},
(r,p)=>{const t=ri(r,1,8),o2=ri(r,t+1,9);return o('digits',`一個兩位數，十位數字與個位數字的和是 ${t+o2}，個位數字比十位數字大 ${o2-t}，這個兩位數是多少？`,10*t+o2,'用和差問題的方法求兩個數字。',`用和差問題的方法：十位數字＝(和－差)÷2＝(${t+o2}－${o2-t})÷2＝${t}，個位數字＝${t}＋${o2-t}＝${o2}，所以這個數是 ${10*t+o2}。`,[10*o2+t,t+o2,10*t+o2+1,10*t+o2-1])},
(r,p)=>{const v=[0,0,0].map(()=>N(r,p,2,30)),[x,y,z]=v,A=x+y,B=y+z,C=x+z,i=ri(r,0,2),sy=['🍎','🍌','🍇'],ex=[`(${A}+${C}-${B})/2`,`(${A}+${B}-${C})/2`,`(${B}+${C}-${A})/2`][i],T=(A+B+C)/2,oth=[B,C,A][i],othS=[`${sy[1]}＋${sy[2]}`,`${sy[0]}＋${sy[2]}`,`${sy[0]}＋${sy[1]}`][i];return o('symbols',`${sy[0]}＋${sy[1]}＝${A}，${sy[1]}＋${sy[2]}＝${B}，${sy[0]}＋${sy[2]}＝${C}。${sy[i]}＝？`,v[i],'三條式子加起來，看看有幾個相同的圖案。',`三條式子相加：每個圖案出現 2 次，所以 2 個${sy[0]}＋2 個${sy[1]}＋2 個${sy[2]}＝${A+B+C}，三個圖案合共 ${A+B+C}÷2＝${T}；${sy[i]}＝三個合共－另外兩個的和（${othS}＝${oth}）：${T}－${oth}＝${v[i]}。`,[v[i]+1,v[i]-1>0?v[i]-1:v[i]+2,T,v[(i+1)%3]],ex)},
(r,p)=>{const q=pk(r,[4,5,6,7].slice(0,2+Math.round(2*p.s))),n=N(r,p,10,100),dg=[...Array(q)].map((_,i)=>i+1),seq=dg.join('、')+'、'+dg.join('、')+'、……';if(r()<.5){const ans=(n-1)%q+1;return Object.assign(o('cycle',`把 ${dg.join('、')} 重複排成一行：${seq}　第 ${n} 個數字是多少？`,ans,`看看每 ${q} 個數字是一個週期。`,`每 ${q} 個數字（${dg.join('、')}）是一輪；${n}÷${q}＝${Math.floor(n/q)}${n%q?` 餘 ${n%q}`:''}，${n%q?`就取每輪的第 ${n%q} 個`:`正好整除，就是每輪的最後一個`}，所以是 ${ans}。`,[n%q,q,(n%q)+1>q?1:(n%q)+1,Math.floor(n/q)],`(${n}-1)%${q}+1`),{lim:[1,q]})}const full=Math.floor(n/q),rem=n%q,one=q*(q+1)/2,s=full*one+rem*(rem+1)/2;return o('cycle-sum',`把 ${dg.join('、')} 重複排成一行：${seq}　前 ${n} 個數字的和是多少？`,s,'先算一個週期的和。',`先算一輪的和：${dg.join('＋')}＝${one}；${n}÷${q} 的商是 ${full}（${full} 輪）${rem?`，餘 ${rem} 個`:''}，${full} 輪共 ${full}×${one}＝${full*one}${rem?`，餘下的 ${rem} 個是 ${rem>1?dg.slice(0,rem).join('＋')+'＝':''}${rem*(rem+1)/2}，合共 ${s}`:`，所以是 ${s}`}。`,[full*one,s+q,s-q,(full+1)*one],`${full}*${one}+${rem*(rem+1)/2}`)},
(r,p)=>{const b=pk(r,[2,3,7,8,4].slice(0,2+Math.round(3*p.s))),n=N(r,p,5,60);let v=1;for(let i=0;i<n;i++)v=v*b%10;const c=lastCycle(b),L=c.length;return o('last-digit',`${n} 個 ${b} 連乘（即 ${b} 的 ${n} 次方）的個位數字是多少？`,v,'列出頭幾次方的個位，找循環。',`列出 ${b} 的各次方的個位：${c.join('、')}，每 ${L} 個一輪（再下去就重複）；${n}÷${L} 餘 ${n%L}，餘 0 取第 ${L} 個，否則取第 ${n%L} 個，所以個位是 ${v}。`,[(v+1)%10,(v+2)%10,b,(v+9)%10])}
]
];

const TPL={math:MATH,olympiad:OLY};
const WORLDS={
math:[['數字小島','🏝️','小一二：20以內及100以內加減'],['乘法森林','🌳','小二：兩位數加減與乘法入門'],['九九城堡','🏰','小三：乘除與九九、多位數運算'],['分數小鎮','🍰','小四：分數與小數入門'],['百分比海洋','🌊','小五：小數、百分數、平均數'],['圖形太空站','🚀','小六：周界、面積、速度、比']],
olympiad:[['小一','🌱','找規律、湊十、排隊'],['小二','🌿','跳數、巧算、植樹、週期'],['小三','🌳','和差倍、年齡、搭配'],['小四','🔥','雞兔、高斯、握手、盈虧'],['小五','🚀','餘數、抽屜、推理、容斥'],['小六','👑','分數、份數、工程、追及、立體']]
};
// Curriculum line: LINE[track][world][stage 0..9] = template indexes allowed at that stage.
// Stages 1-3 teach one skill each, 4-7 add the next skill beside the previous one, 8-10 mix everything seen.
const ALL=[0,1,2,3,4,5,6],A6=[0,1,2,3,4,5];
const LINE={
math:[
  {lo:[[6],[6,0],[1],[2],[3],[4],[5,4],A6,A6,ALL],               // difficulty 1-3: 20以內 first, then 100以內
   hi:[[0],[1],[2],[2,3],[3,4],[4,5],[0,1,2,3],A6,A6,A6]},       // difficulty 4-5: straight into 100以內
  [[0],[1],[6],[2],[2,4],[3],[5],ALL,ALL,ALL],                    // W2: add2, sub2, to100, times ... mixed
  [[0],[0],[0],[0,1],[1,6],[4],[2],[3,5],ALL,ALL],                // W3: 九九 first (times only for stages 1-3)
  [[2],[6],[0],[0,1],[5],[3],[3,4],ALL,ALL,ALL],                  // W4: fraction of a set, equivalent, add/sub, decimals
  [[0],[1],[3],[2],[2,5],[4],[4,6],ALL,ALL,ALL],                  // W5: decimals x/÷, percent, average
  [[0],[1],[2],[6],[3],[4],[4,5],ALL,ALL,ALL]                     // W6: perimeter, area, speed, ratio
],
olympiad:[
  [[0],[6],[1],[2],[3],[5],[4],ALL,ALL,ALL],
  [[0],[3],[1],[2],[4],[5],[6],ALL,ALL,ALL],
  [[0],[6],[1],[3],[2],[5],[4],ALL,ALL,ALL],
  [[0],[1],[2],[3],[4],[5],[6],ALL,ALL,ALL],
  [[2],[4],[0],[5],[1],[3],[6],ALL,ALL,ALL],
  [[3],[4],[5],[0],[6],[2],[1],ALL,ALL,ALL]
]};
const poolOf=(t,wi,si,diff)=>{const w=LINE[t][wi];return Array.isArray(w)?w[si]:(diff<=3?w.lo:w.hi)[si]};
// R3.31 variety: levels_math_x_*.js queue extra math templates on WQ37MathX.q ({w,stages,diffs,make:H=>(r,p)=>o(..)}); they are appended to MATH[w] and
// added to LINE.math[w] at the given stages (diffs 1-3 -> the 'lo' line, 4-5 -> the 'hi' line of a world that splits by difficulty). Same level, more different stems.
if(typeof require!=='undefined'&&!globalThis.WQ37MathX)['w12','w34','w56'].forEach(k=>{try{require('./levels_math_x_'+k+'.js')}catch(e){if(e.code!=='MODULE_NOT_FOUND')throw e}});
{const XQ=(globalThis.WQ37MathX&&globalThis.WQ37MathX.q)||[],H={o,ri,pk,sh,N,nm,NM,IT,P,gcd,fr,fx,spread,CN,X,fact,mulHow,timesHow,addHow,subHow,place,mb,hs};
  LINE.math=LINE.math.map(w=>Array.isArray(w)?w.map(a=>a.slice()):{lo:w.lo.map(a=>a.slice()),hi:w.hi.map(a=>a.slice())});
  for(const e of XQ){const idx=MATH[e.w].push(e.make(H))-1,ds=e.diffs||[1,2,3,4,5],wl=LINE.math[e.w];
    for(const si of e.stages){if(Array.isArray(wl))wl[si].push(idx);else{if(ds.some(d=>d<=3))wl.lo[si].push(idx);if(ds.some(d=>d>=4))wl.hi[si].push(idx)}}}}

// skill -> real lesson id.  math: HK-M4 unit code (chapters are <code>-1 / <code>-2, see math_course_src/curriculum-map.json);
// olympiad: 思維之塔 topic id (math_course_src/active-content.json skills, track olympiad). '' = no matching lesson yet.
const LESSON={
  within20:'1N2',count:'1N2',add:'1N4',sub:'1N4',missing:'1N4',story:'1N4','add-sub':'1N4',
  add2:'2N2',sub2:'2N2','add-sub2':'2N5',to100:'1N4',times:'2N3','times-story':'2N3','repeat-add':'2N3',
  div:'2N6',remainder:'3N3',quotient:'3N3',share:'3N3','mul-multi':'3N2','add-multi':'3N4','sub-multi':'3N4',story2:'3N4',
  'frac-of':'3N5','frac-eq':'4N6','frac-add':'4N6','frac-sub':'4N6','frac-dec':'6N2','dec-add':'4N8','dec-sub':'4N8',
  'dec-mul':'5N4','dec-div':'6N1','percent-of':'6N4','frac-pct':'6N3',discount:'6N4',mean:'6D1','mean-missing':'6D1',
  perim:'4M1',area:'4M2','tri-area':'5M1',speed:'6M4','ratio-share':'','ratio-scale':'','area-sub':'4M2',
  'seq-arith':'O-CAL-pattern','seq-nth':'O-CAL-pattern','seq-geo':'O-CAL-pattern','seq-diff2':'O-CAL-pattern','seq-fib':'O-CAL-pattern','seq-inter':'O-CAL-pattern','seq-missing':'O-CAL-pattern',
  'make-whole':'O-NUM-pairs',gauss:'O-NUM-pairs','arith-sum':'O-NUM-pairs','alt-sum':'O-NUM-pairs','quick-mul':'',distrib:'',consec:'',
  queue:'O-APP-queue',between:'O-APP-queue','left-right':'O-APP-queue',plant:'',saw:'',liars:'',rank:'',
  'sum-diff':'','sum-mult':'','diff-mult':'',age:'','chicken-rabbit':'O-R3-L2-applied',coins:'O-R3-L2-applied',three:'',
  perm:'O-LOG-digits',digits:'O-LOG-digits',handshake:'O-GEO-segments',segments:'O-GEO-segments',squares:'O-R3-L2-geometry',
  combo:'O-R3-L2-count',route:'O-R3-L2-count',arrange:'O-R3-L2-count','arrange-adj':'O-R3-L2-count',knockout:'',
  'rem-shift':'',crt:'',surplus:'',symbols:'',cycle:'','cycle-sum':'','last-digit':''
};
const skillLesson=sk=>{const m=/^(p\d-\d):/.exec(sk||'');return m?'oly:'+m[1]:(LESSON[sk]||'')};

const trk=t=>t==='olympiad'?'olympiad':'math';
const worlds=track=>{const t=trk(track);return WORLDS[t].map((w,i)=>({id:`${t}-${i+1}`,name:w[0],icon:w[1],desc:w[2],stages:10}))};

const norm=s=>String(s==null?'':s).replace(/[０-９]/g,c=>String.fromCharCode(c.charCodeAt(0)-65248)).replace(/[／]/g,'/').replace(/[．。]/g,'.').replace(/[\s　]+/g,'');
const num=s=>{s=norm(s);if(/^\d+\/\d+$/.test(s)){const [a,b]=s.split('/').map(Number);return b?a/b:NaN}return /^(\d+\.?\d*|\.\d+)$/.test(s)?+s:NaN};
const eq=(a,b)=>{a=norm(a);b=norm(b);if(a===b)return true;const x=num(a),y=num(b);return x===x&&y===y&&Math.abs(x-y)<1e-9};
// value only (ignores the 「化成小數／最簡分數」 form rule): used for wrong-option screening and by checkDetail
const sameValue=(q,i)=>!!q&&norm(i)!==''&&[q.answer,...(q.accept||[])].some(a=>eq(a,i));
const formOk=(q,i)=>{
  const s=norm(i);
  if(q.form==='dec')return /^(\d+\.?\d*|\.\d+)$/.test(s);
  if(q.form==='simplest'){if(/^\d+$/.test(s))return true;const m=s.match(/^(\d+)\/(\d+)$/);return !!m&&+m[2]>1&&gcd(+m[1],+m[2])===1}
  return true;
};
const FORM_MSG='數值對了，請寫成小數／最簡分數';
// checkDetail -> {ok:true} | {ok:false,why:'empty'|'wrong'} | {ok:false,why:'form',msg,form}
const checkDetail=(q,i)=>{
  if(!q||norm(i)==='')return {ok:false,why:'empty'};
  if(!sameValue(q,i))return {ok:false,why:'wrong'};
  if(!formOk(q,i))return {ok:false,why:'form',msg:FORM_MSG,form:q.form};
  return {ok:true};
};
const check=(q,i)=>checkDetail(q,i).ok;

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
  const q={mode,q:x.q,answer:x.a,accept:x.acc.filter(s=>s!==x.a),hint:x.h,explain:x.e,skill:x.sk,form:x.form||null,lesson:skillLesson(x.sk)};
  if(x.calc){q.calc={expr:x.calc,value:+x.a}}
  if(mode==='fill')return q;
  const lim=x.lim,inLim=v=>!lim||(/^\d+$/.test(v)&&+v>=lim[0]&&+v<=lim[1]);
  const isInt=/^\d+$/.test(x.a),isFr=x.a.includes('/'),tw=x.w.map(v=>typeof v==='number'?(isFinite(v)&&v>=0?fx(v):null):String(v)).filter(v=>v!==null&&(!isFr||v.includes('/'))&&(isFr||!v.includes('/'))&&(!isInt||/^\d+$/.test(v)));
  const g=gen(x.a,diff).map(v=>typeof v==='number'?(isFinite(v)&&v>=0?fx(v):null):v).filter(v=>v!==null&&(!isInt||/^\d+$/.test(v)));
  const cand=(diff>=4?g.concat(tw):tw.concat(g)).filter(inLim);
  for(let i=1;i<20;i++){const c=isFr?`${x.a.split('/')[0]*1+i}/${+x.a.split('/')[1]+i}`:fx(+x.a+i*(isInt?3:.1));if(inLim(c))cand.push(c)}
  if(lim)for(let v=lim[0];v<=lim[1];v++)cand.push(String(v));
  const out=[];
  for(const c of cand){if(out.length>=3)break;if(sameValue(q,c))continue;if(out.some(z=>eq(z,c)))continue;out.push(norm(c))}
  if(out.length<3)return null;
  q.options=sh(r,[x.a,...out]);
  return q;
};
// A worked example for the 「例題卡」: the same template at its easiest settings, never the question being asked.
const exCache={};
const exampleFor=(t,wi,ti,sk,stem)=>{
  const key=`${t}|${wi}|${ti}|${sk}`;let L=exCache[key];
  if(!L){L=[];for(let s=0;s<80&&L.length<3;s++){const x=TPL[t][wi][ti](mb(hs('ex',t,wi,ti,sk,s)),{s:.22,diff:2,stage:2});if(x.sk===sk&&!L.some(y=>y.q===x.q))L.push({skill:sk,q:x.q,answer:x.a,explain:x.e,tip:x.h})}exCache[key]=L}
  const e=L.find(y=>y.q!==stem)||L[0];return e?Object.assign({},e):null;
};
// ── R3.23 奧數路線: world = grade (0-5), stage 2k = unit k+1 level A, stage 2k+1 = unit k+1 level B; the generators come from WQOly units ──
const OLYU=(wi,si)=>{const O=globalThis.WQOly;return O&&O.units['p'+(wi+1)+'-'+((si>>1)+1)]||null};
const wkey=k=>{k=String(k);return /^-?\d+(\.\d+)?$/.test(k)?fx(+k):k};
const oexCache={};
const exampleOly=(U,lv,gi,sk,stem)=>{
  const key=`${U.id}|${lv}|${gi}|${sk}`;let L=oexCache[key];
  if(!L){L=[];for(let k=0;k<80&&L.length<3;k++){const x=U.gens[lv][gi](mb(hs('oex',U.id,lv,gi,k)),{s:.04,diff:1,stage:0});if(x.sk===sk&&!L.some(y=>y.q===x.q))L.push({skill:U.id+':'+sk,q:x.q,answer:x.a,explain:x.e,tip:x.h,svg:x.svg||''})}oexCache[key]=L}
  const e=L.find(y=>y.q!==stem)||L[0];return e?Object.assign({},e):null;
};
const makeOly=(wi,si,n,diff,seed,avoid)=>{
  const U=OLYU(wi,si),lv=si&1?'B':'A',G=U.gens[lv];
  const r=mb(hs('oly',U.id,lv,n,diff,seed)),av=new Set(avoid||[]),res=[],seen=new Set();
  const s0=Math.min(1,.08+.8*(diff-1)/4+(lv==='B'?.07:0)+(si===9?.05:0)),off=ri(r,0,G.length-1);
  for(let k=0;k<n;k++){
    const mode=k%2?'fill':'mcq';
    for(let att=0;;att++){
      if(att>900)throw new Error('WQ37Math: cannot build olympiad question '+U.id+lv);
      const p={s:Math.min(1,s0+(att>20?(att-20)*.03:0)),diff,stage:si};
      const gi=att<G.length?(off+k+att)%G.length:ri(r,0,G.length-1);
      const x=G[gi](r,p);
      if(seen.has(x.q)||(att<=250&&av.has(x.q)))continue;
      const why={};if(x.why)for(const kk of Object.keys(x.why)){const w=wkey(kk);if(w!==wkey(x.a))why[w]=x.why[kk]}
      const wk=Object.keys(why),sk0=x.sk;x.sk=U.id+':'+sk0;
      x.w=[...wk.map(v=>/^-?\d+(\.\d+)?$/.test(v)?+v:v),...x.w];
      const q=mk(r,x,diff,mode);
      if(!q)continue;
      if(mode==='mcq'&&wk.length){
        const keep=wk.slice(0,3),rest=q.options.filter(o=>o!==x.a&&!keep.includes(o));
        q.options=sh(r,[x.a,...keep,...rest].slice(0,4));
      }
      seen.add(x.q);
      q.why=Object.keys(why).length?why:null;q.svg=x.svg||'';q.unit=U.id;q.level=lv;
      q.ex=exampleOly(U,lv,gi,sk0,x.q);
      res.push(Object.assign({id:`MO${wi+1}-${si+1}-${k+1}`},q));
      break;
    }
  }
  return res;
};
// make(track, world 0-5, stage 0-9, n, diff 1-5, seed[, avoid]): avoid = stems to skip (e.g. the last 30 the learner saw) so the same list gives the same questions.
const make=(track,wi,si,n,diff,seed,avoid)=>{
  const t=trk(track);wi=Math.min(5,Math.max(0,wi|0));si=Math.min(9,Math.max(0,si|0));diff=Math.min(5,Math.max(1,diff|0||3));n=Math.max(0,n|0);seed=seed|0;
  if(t==='olympiad'&&OLYU(wi,si))return makeOly(wi,si,n,diff,seed,avoid);
  const r=mb(hs(t,wi,si,n,diff,seed)),T=TPL[t][wi],boss=si===9,base=Math.min(1,.35*si/9+.65*(diff-1)/4+(boss?.1:0));
  const line=poolOf(t,wi,si,diff),sofar=[...new Set([].concat(...[...Array(si+1)].map((_,i)=>poolOf(t,wi,i,diff))))],all=T.map((_,i)=>i);
  const av=new Set(avoid||[]);
  const res=[],seen=new Set();
  for(let k=0;k<n;k++){
    const mode=k%2?'fill':'mcq';
    for(let att=0;;att++){
      if(att>900)throw new Error('WQ37Math: cannot build question');
      const p={s:Math.min(1,base+(att>20?(att-20)*.03:0)),diff,stage:si};
      const pool=att>400?all:att>200?sofar:line;
      const ti=pk(r,pool);
      const x=T[ti](r,p);
      if(seen.has(x.q)||(att<=250&&av.has(x.q)))continue;
      const q=mk(r,x,diff,mode);
      if(!q)continue;
      seen.add(x.q);
      q.ex=exampleFor(t,wi,ti,x.sk,x.q);
      res.push(Object.assign({id:`M${t==='olympiad'?'O':''}${wi+1}-${si+1}-${k+1}`},q));
      break;
    }
  }
  return res;
};
const api={worlds,make,check,checkDetail,skillLesson,legacy:(w,i)=>OLY[w][i],legacyMath:(w,i)=>MATH[w][i],lessons:Object.freeze(Object.assign({},LESSON))};
globalThis.WQ37Math=api;
if(typeof module!=='undefined')module.exports=globalThis.WQ37Math;
})();

;
