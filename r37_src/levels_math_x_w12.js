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
