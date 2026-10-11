/* HK-M3. Each chapter has an explicit question scope and worked models using the same data as its questions. */
(function(root){'use strict';
const C=root.WQMathCore,D=root.WQSchoolData;
const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const plan=(code,part)=>D.plans[code]?.[part]||null;
const ids=(code,part=0)=>part?plan(code,part)?.templates||[]:[...new Set([...(plan(code,1)?.templates||[]),...(plan(code,2)?.templates||[])])];
const fmt=v=>{try{const n=C.Q.parse(String(v));let d=n.d;while(d%2n===0n)d/=2n;while(d%5n===0n)d/=5n;return d===1n?String(Number(n.n)/Number(n.d)):n.toString();}catch{return String(v);}};
const gcd=(a,b)=>b?gcd(b,a%b):a;
const calc=(s,p)=>fmt(C.evaluate(s,p).toString());
const val=(p,k)=>Number(p[k]);
const chunks=s=>String(s||'').split(/(?<=[。！？；])/u).map(x=>x.trim()).filter(Boolean);
function arithmetic(a,b,op){
 const minus=op==='−',steps=[`相同數位對齊，從個位開始${minus?'減':'加'}。`],names=['個','十','百','千','萬'];
 if(!Number.isInteger(a)||!Number.isInteger(b)||a<0||b<0)return [];
 let carry=0,borrow=0;const n=Math.max(String(a).length,String(b).length);
 for(let i=0;i<n;i++){let x=Math.floor(a/10**i)%10,y=Math.floor(b/10**i)%10;
  if(minus){x-=borrow;borrow=0;if(x<y){steps.push(`${names[i]}位不夠減，向左一位借1，換成10個${names[i]==='個'?'一':names[i]}。`);x+=10;borrow=1;}steps.push(`${names[i]}位：${x} − ${y} ＝ ${x-y}。${borrow?'左邊一位記得少1。':''}`);}
  else{const total=x+y+carry;steps.push(`${names[i]}位：${x} ＋ ${y}${carry?' ＋ '+carry+'（進位）':''} ＝ ${total}。${total>=10?'寫'+total%10+'，向左進1。':''}`);carry=Math.floor(total/10);}
 }
 if(!minus&&carry)steps.push(`最高位再寫上進位的${carry}。`);
 steps.push(`${a} ${op} ${b} ＝ ${minus?a-b:a+b}。${minus?`驗算：${a-b} ＋ ${b} ＝ ${a}。`:''}`);return steps;
}
function stepsFor(q,t,lib){const p=q.params,k=q.skill,kind=t.verification?.kind,ans=q.displayAnswer||q.answer;
 if(t.school){const values={...p,result:q.type==='fraction'?p.result:fmt(p.result)};return t.school.steps.map(s=>C.fill(s,values));}
 if(t.pedagogy==='reasoning')return chunks(q.explanation);
 if(k==='1N1.1')return ['按固定方向，一個圓點數一次。',`最後數到 ${p.n}，所以總數是 ${p.n}。`,'把數過的圓點逐個指出來，檢查有沒有漏數或重複數。'];
 if(k==='1N1.5')return [`全部是 ${p.n}，其中一部分是 ${p.a}。`,`把 ${p.a} 個移到一邊，數餘下的：${p.n} − ${p.a} ＝ ${ans}。`,`檢查：${p.a} ＋ ${ans} ＝ ${p.n}，兩部分合成原數。`];
 if(k==='1N2.2')return /−/.test(q.stem_zh)?arithmetic(+p.n,+p.a,'−'):arithmetic(+p.a,+p.b,'＋');
 if(['1N4.1','2N2.1'].includes(k)||kind==='add')return arithmetic(+p.a,+p.b,'＋');
 if(['1N4.4','2N2.3','2N5.1'].includes(k)||kind==='subtract')return arithmetic(+p.a,+p.b,'−');
 if(k==='3N5.1')return [`整個圖形平均分成 ${p.den} 份，分母寫 ${p.den}。`,`其中 ${p.num} 份著色，分子寫 ${p.num}。`,`著色部分是 ${p.num}/${p.den}；先看全部等份，再看著色份數。`];
 if(k==='3N5.3')return ['先確認兩條分數條代表同樣大的整體。',`同樣取 ${p.num} 份，分成 ${p.a} 份時，每份比分成 ${p.b} 份大。`,`${p.num}/${p.a} 比 ${p.num}/${p.b} 大。分母較大，不代表分數較大。`];
 if(k==='3N5.4'||kind==='sameFraction'){const den=p.den||p.b,n=+p.a+(+(p.den?p.b:p.c));return [`每份都是 1/${den}，份的大小沒有改變。`,`合共有 ${p.a} ＋ ${p.den?p.b:p.c} ＝ ${n} 份。`,`所以是 ${n}/${den}。分母不相加；這課不要求約分。`];}
 if(kind==='unlikeAdd'){const d=+p.b*(+p.e)/gcd(+p.b,+p.e),x=+p.a*d/(+p.b),y=+p.c*d/(+p.e);return [`分母不同，要先把每份變成一樣大。`,`用 ${d} 作共同分母：${p.a}/${p.b} ＝ ${x}/${d}；${p.c}/${p.e} ＝ ${y}/${d}。`,`分子相加：${x}/${d} ＋ ${y}/${d} ＝ ${x+y}/${d}。`,`最後約至最簡，答案是 ${ans}。`];}
 if(kind==='fractionMultiply')return [`求一部分的另一部分，用乘法。`,`分子相乘：${p.a} × ${p.c} ＝ ${+p.a*(+p.c)}。`,`分母相乘：${p.b} × ${p.e} ＝ ${+p.b*(+p.e)}。`,`再約至最簡，得到 ${ans}。`];
 if(kind==='fractionDivide')return [`除以 ${p.c}/${p.e}，改成乘它的倒數 ${p.e}/${p.c}。`,`${p.a}/${p.b} × ${p.e}/${p.c} ＝ ${+p.a*(+p.e)}/${+p.b*(+p.c)}。`,`最後約至最簡，得到 ${ans}。`];
 if(kind==='multiply'||k==='3N2.1'){const a=+p.a,b=+p.b,split=a>=10?a:b,other=a>=10?b:a,tens=Math.floor(split/10)*10,ones=split%10;if(tens)return [`把 ${split} 分成 ${tens} 和 ${ones}。`,`${tens} × ${other} ＝ ${tens*other}。`,`${ones} × ${other} ＝ ${ones*other}。`,`兩部分相加：${tens*other} ＋ ${ones*other} ＝ ${ans}。`];return [`有 ${p.b} 組，每組 ${p.a} 個。`,`${p.a} × ${p.b} ＝ ${ans}。`,`用重複加法 ${Array.from({length:b},()=>a).join('＋')} 檢查。`];}
 if(q.type==='remainder'){const a=+p.a,b=+p.b,n=+q.answer,r=+q.remainder;return [`${a} 要每 ${b} 個一組，找不超過 ${a} 的最大 ${b} 的倍數。`,`${b} × ${n} ＝ ${b*n}，已分去 ${b*n} 個。`,`餘下：${a} − ${b*n} ＝ ${r}。`,`商是 ${n}，餘數 ${r} 小於除數 ${b}；${b} × ${n} ＋ ${r} ＝ ${a}。`];}
 if(kind==='decimalAdd')return ['小數點上下對齊，缺少的末位可以補0。',`${p.a} 和 ${p.b} 的相同數位逐位相加，滿十向左進1。`,`${p.a} ＋ ${p.b} ＝ ${ans}。檢查答案的小數點是否對齊。`];
 if(kind==='decimalDivide'){const places=(String(p.b).split('.')[1]||'').length,f=10**places;return [`除數 ${p.b} 有 ${places} 位小數，把它乘 ${f} 變成整數。`,`被除數也乘 ${f}：${calc('a*'+f,p)} ÷ ${calc('b*'+f,p)}。`,`兩個數同乘一樣的倍數，商不變，答案是 ${ans}。`];}
 if(kind==='lcmConsecutive'){const a=+p.a,b=+p.b,lcm=a*b/gcd(a,b);const list=n=>Array.from({length:Math.min(lcm/n,8)},(_,i)=>n*(i+1)).join('、')+(lcm/n>8?'……':'');return [`列出 ${a} 的倍數：${list(a)}。`,`再列 ${b} 的倍數：${list(b)}。`,`第一個相同的正倍數是 ${lcm}，最少再過 ${lcm} 分鐘同時響。`];}
 if(kind==='mean')return [`先求三天總數：${p.a} ＋ ${p.b} ＋ ${p.c} ＝ ${+p.a+(+p.b)+(+p.c)}。`,`共有3天，用總數除以3。`,`平均每天 ${ans} 本；平均數應在最小和最大數據之間。`];
 if(k==='6N4.R3'){if(t.id.includes('T2'))return [`原來 ${p.total} 本是100%。`,`增加的數量：${p.total} × ${p.percent}% ＝ ${calc('total*percent/100',p)} 本。`,`原有加增加：${p.total} ＋ ${calc('total*percent/100',p)} ＝ ${ans} 本。`];if(t.id.includes('T3'))return [`原來 ${p.total} 張是100%。`,`用去的數量：${p.total} × ${p.percent}% ＝ ${calc('total*percent/100',p)} 張。`,`原有減用去：${p.total} − ${calc('total*percent/100',p)} ＝ ${ans} 張。`];return [`${p.percent}% 即每100份取 ${p.percent} 份。`,`把全部 ${p.total} 本乘 ${p.percent}/100。`,`${p.total} × ${p.percent}/100 ＝ ${ans} 本。`];}
 // Retain the topic-specific method, and expand calculable nested operations into actual worked steps.
 let expr=t.answer.expr;for(let i=0;i<3&&p[expr]!==undefined&&t.params[expr]?.expr;i++)expr=t.params[expr].expr;
 let extra=[];try{const ast=C.substitute(C.parseExpr(expr),p),seen=new Set();function walk(a){if(!Array.isArray(a)||a[0]==='num'||a[0]==='var')return;for(const v of a.slice(1))if(Array.isArray(v))walk(v);if(a.length===3&&['+','-','*','/'].includes(a[0])){const text=`${fmt(C.evaluate(a[1]).toString())} ${{'+':'＋','-':'−','*':'×','/':'÷'}[a[0]]} ${fmt(C.evaluate(a[2]).toString())} ＝ ${fmt(C.evaluate(a).toString())}`;if(!seen.has(text)){extra.push(text+'。');seen.add(text);}}}walk(ast);}catch(_){}
 const concept=lib.skills.get(q.skill)?.lesson?.concept;
 return [...new Set([concept,...extra,...chunks(q.explanation)].filter(Boolean))].slice(0,9);
}
function enrich(q,lib){const t=lib.templates.get(q.templateId)||lib.archived.get(q.templateId);q.school=t.school||null;q.objective=t.school?.objective||lib.skills.get(q.skill).name_zh;
 if(q.formats.includes('decimal')&&!q.formats.includes('fraction'))q.displayAnswer=fmt(q.answer);
 if(q.skill==='3N5.1')q.displayAnswer=q.params.num+'/'+q.params.den;
 if(q.skill==='3N5.4')q.displayAnswer=(+q.params.a+(+q.params.b))+'/'+q.params.den;
 if(q.skill==='3N5.3'){for(const ch of q.choices){for(const den of [q.params.left,q.params.right])if(C.Q.parse(ch.value).cmp(C.Q.parse(q.params.num+'/'+den))===0)ch.label=q.params.num+'/'+den;}q.answerLabel=q.choices.find(c=>c.value===q.answer)?.label;}
 if(q.skill==='6N4.R3'&&!q.school)q.displayUnit=q.templateId.includes('T3')?'張':'本';
 q.workedSteps=stepsFor(q,t,lib);q.explanation=q.workedSteps.join('');q.hints=[q.hints[0],q.workedSteps[0],q.workedSteps[1]].filter((s,i,a)=>s&&a.indexOf(s)===i);return q;}
const text=(x,y,t,size=24,fill='#293458')=>`<text x="${x}" y="${y}" text-anchor="middle" fill="${fill}" font-size="${size}" font-weight="650">${esc(t)}</text>`;
const rect=(x,y,w,h,fill='#e9e3fb')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="4" fill="${fill}" stroke="#7864aa" stroke-width="1.5"/>`;
const line=(x,y,X,Y,color='#6e599e',dash='')=>`<line x1="${x}" y1="${y}" x2="${X}" y2="${Y}" stroke="${color}" stroke-width="3" ${dash?'stroke-dasharray="6 5"':''}/>`;
const dot=(x,y,color='#7960bd')=>`<circle cx="${x}" cy="${y}" r="10" fill="${color}"/>`;
const wrap=(content,label)=>content?`<svg class="lesson-diagram" viewBox="0 0 640 260" role="img" aria-label="${esc(label)}"><title>${esc(label)}</title>${content}</svg>`:'';
function bar(n,d,y,label,second=0){if(!Number.isInteger(+d)||d<1||d>160||n>d||n<0)return '';return text(320,y-12,label,21)+Array.from({length:+d},(_,i)=>rect(60+i*520/d,y,520/d-2,48,i<n?'#9074cd':i<n+second?'#eab65d':'#f4f1f8')).join('');}
function figure(q,stage=0){const p=q.params,k=q.skill,m=q.school?.model;let out='';
 if(m==='polygon'){const n=+p.sides,pts=Array.from({length:n},(_,i)=>{const a=(i/n*360-90+(+p.rotation))*Math.PI/180;return (320+100*Math.cos(a))+','+(130+100*Math.sin(a));});out=`<polygon points="${pts.join(' ')}" fill="#e5dbf7" stroke="#756098" stroke-width="4"/>`;}
 else if(m==='angle'){const a=+p.angle*Math.PI/180,x=295,y=207;out=line(x,y,530,y)+line(x,y,x+188*Math.cos(a),y-188*Math.sin(a))+`<path d="M${x+43} ${y} A43 43 0 0 0 ${x+43*Math.cos(a)} ${y-43*Math.sin(a)}" fill="none" stroke="#c78b42" stroke-width="3"/>`;}
 else if(m==='triangle-class'||m==='symmetry-read'&&+p.i>=2){const a=m==='triangle-class'?+p.left:+p.i===2?5:4,b=m==='triangle-class'?+p.right:5,base=m==='triangle-class'?+p.base:6,X=(a*a+base*base-b*b)/(2*base),height=Math.sqrt(a*a-X*X),f=30,ox=220,oy=220;out=`<polygon points="${ox},${oy} ${ox+base*f},${oy} ${ox+X*f},${oy-height*f}" fill="#e8e1f5" stroke="#796699" stroke-width="3"/>`+text(ox+base*f/2,250,base,23)+text(ox+X*f/2-24,oy-height*f/2,a,23)+text(ox+(base+X)*f/2+24,oy-height*f/2,b,23);}
 else if(m==='map-direction'){const positions=[[460,55],[460,205],[180,205],[180,55]],[x,y]=positions[+p.i];out=line(590,95,590,30)+`<path d="M580 43 L590 27 L600 43" fill="none" stroke="#6e599e" stroke-width="3"/>`+text(590,20,'北',20)+rect(250,100,130,56,'#fff0c8')+text(315,136,'校門',25)+rect(x-56,y-23,112,48,'#e8f5ef')+text(x,y+8,'花圃',25)+line(315,92,315,22,'#dad3e7',true)+line(315,166,315,233,'#dad3e7',true)+line(60,128,230,128,'#dad3e7',true)+line(400,128,545,128,'#dad3e7',true);}
 else if(m==='circle-radius'){out=`<circle cx="320" cy="128" r="91" fill="#eee6fb" stroke="#796699" stroke-width="3"/>`+line(229,128,411,128)+dot(320,128)+text(205,132,'A')+text(435,132,'B')+text(320,160,'O')+text(320,244,`AB ＝ ${p.diameter} 厘米`,24);}
 else if(m==='symmetry-read'){const square=+p.i===1,x=square?240:185,w=square?150:270,h=150;out=rect(x,40,w,h)+text(320,222,square?'6':'9',23)+text(x-28,120,square?'6':'5',23);for(const [a,b,dx,dy]of [[x,40,1,1],[x+w,40,-1,1],[x,190,1,-1],[x+w,190,-1,-1]])out+=`<path d="M${a+dx*14} ${b} V${b+dy*14} H${a}" fill="none" stroke="#796699" stroke-width="2"/>`;}
 else if(k==='3N5.1')out=bar(+p.num,+p.den,94,'一個整體，平均分開');
 else if(k==='3N5.3')out=bar(+p.num,+p.left,55,`${p.num}/${p.left}`)+bar(+p.num,+p.right,159,`${p.num}/${p.right}`);
 else if(k==='3N5.4'||m==='fraction-add')out=bar(+p.a,+p.den,74,`${p.a}/${p.den} 個（紫色）`,+p.b)+text(320,190,`${p.b}/${p.den} 個（金色）`,23);
 else if(m==='unlike-fraction'||k==='5N2.R3')out=bar(+p.a,+p.b,55,`${p.a}/${p.b}`)+bar(+p.c,+p.e,160,`${p.c}/${p.e}`);
 else if(m==='combine'){out=rect(30,30,250,170,'#f4effb')+rect(360,30,250,170,'#fff5dc')+text(320,126,'＋',37);for(const [count,x,color]of [[+p.a,65,'#9074cd'],[+p.b,395,'#dca94d']])for(let i=0;i<count;i++)out+=dot(x+(i%5)*43,82+Math.floor(i/5)*65,color);out+=text(155,240,`原有 ${p.a}`,24)+text(485,240,`再添 ${p.b}`,24);}
 else if(m==='takeaway'){const n=m==='takeaway'?+p.a:+p.a+(+p.b);out=Array.from({length:n},(_,i)=>{const x=65+i%9*62,y=85+Math.floor(i/9)*65;return dot(x,y,i<(+p.a)?'#9074cd':'#eab65d')+(m==='takeaway'&&i<(+p.b)?line(x-15,y-15,x+15,y+15,'#b7544c'):'');}).join('');out+=text(320,228,m==='takeaway'?`原有 ${p.a}，取走 ${p.b}`:`原有 ${p.a}，再添 ${p.b}`,24);}
 else if(m==='groups'){const n=+(p.b||p.qty),count=+(p.a||p.price);if(n<=9){out=Array.from({length:n},(_,i)=>{const x=26+i%5*120,y=25+Math.floor(i/5)*112;return rect(x,y,106,92)+(count<=9?Array.from({length:count},(_,j)=>`<circle cx="${x+25+j%3*28}" cy="${y+20+Math.floor(j/3)*25}" r="7" fill="#8261ba"/>`).join(''):text(x+53,y+53,String(count),29));}).join('');out+=text(320,250,`每組 ${count}，共 ${n} 組`,20);}}
 else if(m==='ruler'||q.visual==='r3:ruler'){const end=+p.end,start=+p.start,scale=520/Math.max(12,end+1);out=rect(55+start*scale,58,(end-start)*scale,38,'#ebbb62');for(let i=0;i<=Math.max(12,end+1);i++)out+=line(55+i*scale,122,55+i*scale,145)+text(55+i*scale,175,i,19);out+=text(320,226,'刻度單位：厘米（螢幕圖不按實物比例）',18);}
 else if(m==='shopping'||m==='change'||m==='price'){const price=p.price||p.a,qty=p.qty||p.b;out=rect(46,38,260,130,'#fff0c8')+text(176,75,m==='change'?'圖畫簿':'每件價錢',20)+text(176,128,`${price} 元`,36);out+=rect(336,38,260,130,'#e8f5ef')+text(466,77,m==='price'?'購買數量':'付出',20)+text(466,128,m==='price'?`${qty} 件`:`${p.paid} 元`,36);if(m==='shopping')out+=text(320,222,`共買 ${p.qty} 件；每件都是 ${p.price} 元`,24);if(m==='change'&&stage>0)out+=text(320,222,'付款 ＝ 貨價 ＋ 找續',24);}
 else if(m==='timeline'){const left=+p.first,right=+p.end,mid=65+500*left/(left+right);out=line(65,126,565,126);for(const [x,t]of [[65,`${p.h}:${String(p.start).padStart(2,'0')}`],...(stage>0?[[mid,`${p.next}:00`]]:[]),[565,`${p.next}:${String(p.end).padStart(2,'0')}`]])out+=line(x,105,x,145)+text(x,182,t,23);if(stage>0)out+=text((65+mid)/2,76,'先數到整點',21)+text((mid+565)/2,76,'再數餘下',21);else out+=text(65,76,'開始',21)+text(565,76,'結束',21);}
 else if(m==='jug'||m==='displacement'){const values=m==='jug'?[+p.water]:[+p.before,+p.after],scale=m==='jug'?+p.scale:50;for(let z=0;z<values.length;z++){const x=values.length===1?240:100+320*z,base=216;out+=rect(x,26,110,190,'#fafafa')+rect(x+4,base-values[z]/scale*18,102,values[z]/scale*18,'#99d2e8');for(let i=0;i<=10;i++){out+=line(x+96,base-i*18,x+113,base-i*18);if(i%2===0)out+=text(x+155,base-i*18+5,i*scale,17);}out+=text(x+55,248,values.length===1?'毫升':z?'浸入後':'浸入前',19);}}
 else if(m==='scale'){out=line(70,150,570,150);for(let i=0;i<=10;i++)out+=line(70+i*50,137,70+i*50,158)+text(70+i*50,190,i*(+p.scale),17);const x=70+(+p.level)*50;out+=`<path d="M${x-13} 87 L${x+13} 87 L${x} 132 Z" fill="#9878c8"/>`+text(320,50,'秤的刻度（克）',24);}
 else if(m==='pictogram'){out=text(320,32,`喜愛的球類　● 代表 ${p.scale} 人`,22);for(const [i,n,label]of [[0,+p.na,'足球'],[1,+p.nb,'籃球']]){out+=text(65,101+i*88,label,22);for(let j=0;j<n;j++)out+=dot(150+j*60,94+i*88);}}
 else if(m==='rectangle'||['4M1.R3','4M2.R3'].includes(k)){const a=+p.a,b=+p.b,f=Math.min(430/a,142/b),w=a*f,h=b*f,x=320-w/2,y=126-h/2,unit=(q.unit||'').includes('米')&&!(q.unit||'').includes('厘米')?'米':'厘米';out=rect(x,y,w,h)+text(320,y-16,`${a} ${unit}`)+text(x+w+45,126,`${b} ${unit}`,21)+text(320,240,'依標示長度計算',18);if(stage&&k==='4M1.R3')out+=text(320,y+h+30,`${a} ${unit}`,21);}
 else if(m==='triangle'){out=`<path d="M125 204 L530 204 L284 48 Z" fill="#e8e1f5" stroke="#776293" stroke-width="3"/>`+line(284,48,284,204,'#ae6757',true)+line(284,184,304,184)+line(304,184,304,204)+text(326,240,`底 ${p.base} 厘米`,24)+text(350,162,`高 ${p.height} 厘米`,22);}
 else if(m==='cuboid'){out=`<path d="M155 90 L405 90 L405 215 L155 215 Z M155 90 L230 42 L480 42 L405 90 M405 90 L480 42 L480 167 L405 215" fill="#e8e1f5" stroke="#776293" stroke-width="3"/>`+text(280,250,`長 ${p.a}`,23)+text(491,212,`闊 ${p.b}`,23)+text(99,160,`高 ${p.c}`,23)+text(320,20,'單位：厘米',18);}
 else if(m==='mean'){for(const [i,label,v]of [[0,'第一天',p.a],[1,'第二天',p.b],[2,'第三天','？']])out+=rect(40+i*200,38,170,138)+text(125+i*200,78,label,24)+text(125+i*200,134,`${v} 本`,30);out+=text(320,233,`平均每天 ${p.mean} 本`,25);}
 else if(m==='percent'){out=rect(65,75,510,75,'#f4f1f8')+rect(65,75,510*(+p.some)/(+p.all),75,'#ad94d4')+text(320,51,`全部 ${p.all} 人`,25)+text(320,213,`戴眼鏡 ${p.some} 人（紫色部分）`,24);}
 else if(m==='journey'){out=rect(70,55,220,120,'#e8f5ef')+text(180,92,'路程',22)+text(180,140,`${p.distance} 公里`,31)+rect(350,55,220,120,'#fff0c8')+text(460,92,'時間',22)+text(460,140,`${p.minutes} 分鐘`,31);}
 else if(m==='packing'||m==='sharing'){const items=m==='packing'?[[p.a,'枝鉛筆'],[p.b,'塊擦膠']]:[[p.a,'張卡紙'],[p.b,'組']];out=items.map(([n,label],i)=>rect(70+280*i,65,220,122)+text(180+280*i,119,n,36)+text(180+280*i,162,label,23)).join('');}
 else if(/^[\d.]+\s*[+＋−-]\s*[\d.]+\s*=/.test(q.stem_zh)||m==='decimal-add'){const match=m==='decimal-add'?['',p.a,'＋',p.b]:q.stem_zh.match(/^([\d.]+)\s*([+＋−-])\s*([\d.]+)/),a=match[1],b=match[3],places=Math.max((a.split('.')[1]||'').length,(b.split('.')[1]||'').length),A=Number(a).toFixed(places),B=Number(b).toFixed(places),n=Math.max(A.length,B.length),x=320-(n-1)*32;
  out=text(320,26,stage?(places?'小數點對齊':'相同數位對齊'):'直式',20);for(let i=0;i<n;i++){const X=x+i*64;out+=rect(X-26,44,52,147,stage&&i===n-Math.min(stage,n)?'#fff0c8':'#f4f1f8')+text(X,89,A.padStart(n,' ')[i],34)+text(X,143,B.padStart(n,' ')[i],34);}out+=text(x-58,143,match[2],35)+line(x-36,162,x+(n-1)*64+32,162)+text(320,229,stage>=q.workedSteps?.length?q.displayAnswer||q.answer:'？',33);
 }
 return wrap(out,q.objective||q.stem_zh);
}
function cards(l,lib){const refs=l.examples||[],out=[];for(let n=0;n<refs.length;n++){const r=refs[n],q=enrich(C.generate(lib,r.template,r.seed),lib);out.push({title:'先讀題',body:q.hints[0]||'先找已知資料，再看看題目要找甚麼。',q,stage:0,example:n});q.workedSteps.forEach((body,i)=>out.push({title:i===q.workedSteps.length-1?'檢查與作答':'一起做 · 第'+(i+1)+'步',body,q,stage:i+1,example:n}));}return out;}
root.WQCoursePedagogy=Object.freeze({version:D.version,plan,ids,enrich,figure,cards,arithmetic,format:fmt});
})(globalThis);
