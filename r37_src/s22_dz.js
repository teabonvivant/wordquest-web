/* R3.14 s22 - dictation study: groups of 8 words, learn cards, then three quiz levels (choice, fill the letters, full spelling). */
const R37_DZ_LV=['✅','🧩','✍️'],R37_DZ_NAMES=['選擇','補字母','默寫'];
/*SYL-BEGIN*/
/* ---- syllables (R3.18, T06): words of 7+ letters are shown and masked in whole syllables.
   Order: teaching list -> WQ31 compound / chunk recipe -> rule table (suffix, silent e, vowel groups, consonant cluster split). ---- */
const R37_SYL_EX={};
`beau·ti·ful fa·vour·ite be·cause el·e·phant um·brel·la com·pu·ter dic·tion·ar·y hos·pi·tal choc·o·late break·fast birth·day to·mor·row yes·ter·day to·geth·er re·mem·ber af·ter·noon sand·wich res·tau·rant veg·e·ta·ble kan·ga·roo di·no·saur straw·ber·ry but·ter·fly grand·moth·er grand·fa·ther won·der·ful im·por·tant dif·fer·ent in·ter·est·ing li·brar·y class·room play·ground home·work su·per·mar·ket tel·e·vi·sion tel·e·phone ad·ven·ture ham·bur·ger sau·sage pine·ap·ple wa·ter·mel·on py·ja·mas cal·en·dar Feb·ru·ar·y Sat·ur·day Wednes·day Thurs·day Sep·tem·ber Oc·to·ber No·vem·ber De·cem·ber spa·ghet·ti sun·flower rain·bow foot·ball bas·ket·ball moun·tain neigh·bour some·times ev·ery·one ev·ery·thing pos·si·ble care·ful·ly de·li·cious ex·er·cise ex·cit·ed ques·tion ed·u·ca·tion in·for·ma·tion cel·e·brate hol·i·day com·fort·a·ble vo·cab·u·lar·y bi·cy·cle hap·pi·ness un·hap·py un·kind·ly ex·cuse·me al·pha·bet air·port air·plane aer·o·plane`.split(/\s+/).forEach(x=>{R37_SYL_EX[x.replace(/·/g,'').toLowerCase()]=x.toLowerCase();});
const R37_SYL_ON3=new Set(['str','spr','scr','spl','thr','shr','sch','squ']);
const R37_SYL_ON2=new Set(['bl','br','cl','cr','dr','fl','fr','gl','gr','pl','pr','tr','tw','sw','sc','sk','sl','sm','sn','sp','st','th','sh','ch','ph','wh','kn','wr','qu','gn']);
const R37_SYL_FLUID=new Set(['bl','br','cl','cr','dr','fl','fr','gl','gr','pl','pr','tr']);
const R37_SYL_DIG=new Set(['th','sh','ch','ph','wh']);
let r37SylRecipes=null;
function r37SylRecipe(w){
 if(!r37SylRecipes){r37SylRecipes={};try{for(const r of globalThis.WQ31Library.recipes.values())if(r.parts&&r.parts.length>1&&r.parts.every(x=>x.length>=2)&&(r.kind==='compound'||r.kind==='chunk'))r37SylRecipes[r.form]=r.parts;}catch(_){}}
 return r37SylRecipes[w]||null;
}
function r37SylRule(w){
 const isV=i=>{const c=w[i];if('aeiou'.includes(c))return !(c==='u'&&i>0&&w[i-1]==='q');if(c==='y')return i>0;if(c==='w')return i>0&&'aeiou'.includes(w[i-1]);return false;};
 /* suffixes that stand as a syllable of their own; the stem is split on its own */
 const m=/^(.{3,})(ful|less|ness|ment|ship|ly|ish|hood|ing)$/.exec(w);
 if(m){
  let stem=m[1],suf=m[2];
  if(suf==='ing'&&/([^aeiouylsfz])\1$/.test(stem)){suf=stem.slice(-1)+'ing';stem=stem.slice(0,-1);}
  const a=r37SylRule(stem);return a.concat([suf]);
 }
 const md=/^(.{3,}[td])ed$/.exec(w);
 if(md)return r37SylRule(md[1]).concat(['ed']);
 let end=w.length;
 /* silent endings: -e, -ed, -es are not syllables of their own (except -le after a consonant) */
 if(/[^aeiou]e$/.test(w)&&!/[^aeiouy]le$/.test(w))end=w.length-1;
 else if(/[^aeiouy]ed$/.test(w)||/[^sxzcg]es$/.test(w)&&!/(ch|sh)es$/.test(w))end=w.length-1;
 const nuc=[];let i=0;
 while(i<end){if(isV(i)){let j=i;while(j<end&&isV(j))j++;nuc.push([i,j]);i=j;}else i++;}
 if(nuc.length<2)return [w];
 const cuts=[];
 for(let k=0;k<nuc.length-1;k++){
  const a=nuc[k][1],b=nuc[k+1][0],c=w.slice(a,b),len=nuc[k][1]-nuc[k][0];
  let at;
  if(c.length===0)at=a;
  else if(c.length===1)at=(c==='r'&&len>=2||c==='x')?b:a;
  else if(/^(.)\1$/.test(c))at=a+1;
  else{
   let on=1;
   for(let n=Math.min(3,c.length);n>=2;n--){const t=c.slice(-n);if(n===3?R37_SYL_ON3.has(t):R37_SYL_ON2.has(t)){on=n;break;}}
   /* two-letter clusters split between the letters unless they are a stop + l/r (ze·bra) or a digraph (ma·ther) */
   if(c.length===2&&on===2&&!R37_SYL_FLUID.has(c)&&!R37_SYL_DIG.has(c))on=1;
   if(/ck$|ng$/.test(c)&&on<2)on=1;
   at=b-on;
   if(c.endsWith('ck')||c.endsWith('ng'))at=b-Math.min(on,c.length-2>=1?c.length-2:0)||b-1;
  }
  cuts.push(at);
 }
 const out=[];let st=0;for(const c of cuts){if(c>st){out.push(w.slice(st,c));st=c;}}
 out.push(w.slice(st));
 return out.filter(x=>x);
}
/* r37Syl('Beautiful') -> ['Beau','ti','ful']; short words and anything with a non-letter -> [word] */
function r37Syl(en){
 const raw=String(en||'').trim();
 if(!/^[A-Za-z]+$/.test(raw)||raw.length<7)return [raw];
 const w=raw.toLowerCase();
 let parts=R37_SYL_EX[w]?R37_SYL_EX[w].split('·'):(r37SylRecipe(w)||r37SylRule(w));
 if(parts.join('')!==w||parts.some(x=>x.length<1))parts=[w];
 let p=0;return parts.map(x=>{const r=raw.slice(p,p+x.length);p+=x.length;return r;});
}
/* every alphabetic token of a word / phrase -> [{from,to}] syllable ranges over the string's characters (tokens < 7 letters have none) */
function r37SylRanges(en){
 const ch=[...String(en||'')],out=[];let i=0;
 while(i<ch.length){
  if(!/[A-Za-z]/.test(ch[i])){i++;continue;}
  let j=i;while(j<ch.length&&/[A-Za-z]/.test(ch[j]))j++;
  const tok=ch.slice(i,j).join(''),parts=r37Syl(tok);
  if(parts.length>1){let p=i;for(const x of parts){out.push({from:p,to:p+x.length});p+=x.length;}}
  i=j;
 }
 return out;
}
function r37SylText(en){
 return String(en||'').split(/(\s+)/).map(t=>/^\s+$/.test(t)?t:(/^[A-Za-z]+$/.test(t)?r37Syl(t).join('·'):t)).join('');
}
/*SYL-END*/
function r37DzData(){
 const r=latestRange();if(!r)return {rid:'',title:'',words:[],groups:[]};
 const seen=new Set(),words=rangeWords(r.id).filter(w=>w.kind!=='sentence'&&/\p{L}/u.test(String(w.en||''))&&!seen.has(norm(w.en))&&seen.add(norm(w.en)));
 const groups=[];for(let i=0;i<words.length;i+=8)groups.push(words.slice(i,i+8));
 return {rid:r.id,title:r.title||'',words,groups};
}
function r37DzQuizWords(D,g){
 const learn=D.groups[g]||[],quiz=[...learn];
 for(let k=g-1;k>=0&&quiz.length<8;k--)for(const w of D.groups[k]){if(quiz.length>=8)break;quiz.push(w);}
 return {learn,quiz};
}
function r37DzBest(rid,g){const e=((r37Get().dz||{})[rid]||{})[g]||{};return [e.l1|0,e.l2|0,e.l3|0];}
function r37DzRec(b){const i=b.findIndex(n=>n<3);return i<0?2:i;}
/* level 2 hides whole syllables of long words (never the first one); short words keep the letter mask */
function r37DzMaskSyl(en){
 const rs=r37SylRanges(en);if(!rs.length)return null;
 const ch=[...en],first=rs[0],cand=rs.filter(r=>r!==first);
 const k=Math.min(2,Math.max(1,Math.floor(rs.length/2))),rng=r37Rng(r37Hash('dz2s|'+norm(en)));
 const pick=r37Shuf(cand,rng).slice(0,Math.min(k,cand.length));
 const hide=new Set();for(const r of pick)for(let i=r.from;i<r.to;i++)hide.add(i);
 /* short words of a phrase stay visible */
 return {hide,ranges:rs,ch};
}
function r37DzMask(en){
 const ch=[...en],letters=ch.map((c,i)=>/\p{L}/u.test(c)?i:-1).filter(i=>i>=0),cand=letters.filter(i=>i>0&&ch[i-1]!==' ');
 const pool=cand.length?cand:letters,k=letters.length<=3?1:Math.max(1,Math.round(cand.length*.45));
 return new Set(r37Shuf(pool,r37Rng(r37Hash('dz2|'+norm(en)))).slice(0,Math.min(k,pool.length)));
}
function r37DzMcq(w,k,D,rng){
 const en=w.en.trim(),zh=String(w.zh||'').trim(),kind=zh?['zh2en','listen','en2zh'][k%3]:'listen',zhOpt=kind==='en2zh';
 const used=new Set([zhOpt?zh:norm(en)]),opts=[];
 const take=x=>{const v=zhOpt?String(x.zh||'').trim():String(x.en).trim();if(!v||used.has(zhOpt?v:norm(v))||(kind==='zh2en'&&String(x.zh||'').trim()===zh))return;used.add(zhOpt?v:norm(v));opts.push(v);};
 for(const x of r37Shuf(D.words.filter(x=>x!==w),rng)){if(opts.length>=3)break;take(x);}
 if(opts.length<3){
  const near=r37EnPool().filter(x=>Math.abs(x.en.length-en.length)<=2&&(!zhOpt||x.zh)).map(x=>({x,d:r37Edit(x.en,en)})).sort((a,b)=>a.d-b.d||a.x.en.localeCompare(b.x.en)).slice(0,20).map(o=>o.x);
  for(const x of r37Shuf(near,rng)){if(opts.length>=3)break;take(x);}
 }
 const answer=zhOpt?zh:en,base={mode:'mcq',kind,answer,options:r37Shuf([answer,...opts],rng),audio:en,explain:(zh?zh+' = ':'')+en,word:en,lang:zhOpt?'zh':'en',dz:{wid:w.id,lvl:1,type:kind==='listen'?'listenChoice':'meaning'}};
 if(kind==='zh2en')return Object.assign(base,{prompt:zh,emoji:r37Emoji(en)});
 if(kind==='en2zh')return Object.assign(base,{prompt:en,emoji:r37Emoji(en)});
 return Object.assign(base,{prompt:'🔊',emoji:'',autoPlay:true});
}
function r37DzCell(w,lvl){
 const en=w.en.trim(),zh=String(w.zh||'').trim();
 const q={mode:lvl===2?'cells':'fill',kind:'dz'+lvl,prompt:zh||'🔊',emoji:r37Emoji(en),word:en,answer:en,accept:[en],audio:en,autoPlay:true,noleak:true,explain:(zh?zh+' = ':'')+en,dz:{wid:w.id,lvl,type:lvl===2?'spell':'listenSpell'}};
 if(lvl===2){
  const m=r37DzMaskSyl(en);
  if(m){q.hide=[...m.hide].sort((a,b)=>a-b);q.syl=m.ranges.map(r=>[r.from,r.to]);}
  else q.hide=[...r37DzMask(en)].sort((a,b)=>a-b);
 }
 return q;
}
function r37DzQs(D,g,lvl,seed){
 const rng=r37Rng(r37Hash('dz|'+D.rid+'|'+g+'|'+lvl+'|'+seed));
 return r37Shuf(r37DzQuizWords(D,g).quiz,rng).map((w,k)=>lvl===1?r37DzMcq(w,k,D,rng):r37DzCell(w,lvl));
}
function r37DzStart(g,lvl,skipLearn){
 if(window.WQR3&&!WQR3.canStudy())return;
 const D=r37DzData(),learn=D.groups[g];if(!learn)return;
 lvl=lvl||r37DzRec(r37DzBest(D.rid,g))+1;
 const qs=r37DzQs(D,g,lvl,r37Mem._seed!==undefined?r37Mem._seed:(Date.now()&0xfffff));
 if(!skipLearn){try{v24Expose(learn.map(w=>w.en));}catch(_){}}
 r37P={kind:'dz',track:'dictation',diff:r37DiffN('english'),qs,i:0,res:[],hearts:99,maxHearts:0,shield:false,correct:0,hinted:0,phase:skipLearn?'quiz':'learn',fb:null,hintShown:false,title:r37Icon('📖')+' 第 '+(g+1)+' 組',praise:'做得好！',learn:learn.map(w=>({en:w.en.trim(),zh:String(w.zh||'').trim()})),dz:{rid:D.rid,g,lvl,n:D.groups.length}};
 r37Nav37('lp/play');
}
function r37DzRecord(q,value,ok){
 if(!isLoggedIn()||!q.dz)return;
 const w=db.words.find(x=>x.id===q.dz.wid);if(!w)return;
 try{if(q.dz.lvl===2)v24Expose([w.en]);recordAttempt(w,q.dz.type,ok,value,q.answer,'默書學習',{src:'dz',lvl:q.dz.lvl});save();}catch(_){}
}
/* spaced revisit (T17): 3 stars on level 3 schedules a full-spelling revisit after 1, then 3, then 7 days.
   Pass -> next step; fail -> try again tomorrow. Stars already earned are never taken away. */
const R37_DZ_GAP={1:3,2:7},R37_DAY=86400000;
function r37DzDue(rid,g){const e=((r37Get().dz||{})[rid]||{})[g],r=e&&e.rv;return r&&r.due&&r.due<=Date.now()?r:null;}
function r37DzSave(P,stars,passed){
 const {rid,g,lvl,rv}=P.dz;
 const o=r37Get();o.dz=o.dz||{};
 const R=o.dz[rid]=o.dz[rid]||{},e=R[g]=R[g]||{},now=Date.now();
 if(rv){
  const r=e.rv||(e.rv={s:0,due:now});
  if(passed){r.s=(r.s|0)+1;r.due=r.s>=3?0:now+R37_DZ_GAP[r.s]*R37_DAY;}else r.due=now+R37_DAY;
  r.at=now;P.rvNext=r.due?Math.round((r.due-now)/R37_DAY):0;P.rvDone=r.s>=3;
  return;
 }
 if(lvl===3&&!passed)return;
 e['l'+lvl]=Math.max(e['l'+lvl]|0,stars);e.at=new Date().toISOString();
 if(lvl===3&&passed&&!e.rv)e.rv={s:0,due:now+R37_DAY};
}
function r37DzReview(g){
 if(window.WQR3&&!WQR3.canStudy())return;
 const D=r37DzData(),grp=D.groups[g];if(!grp)return;
 const e=((r37Get().dz||{})[D.rid]||{})[g]||{},st=(e.rv&&e.rv.s)|0;
 const rng=r37Rng(r37Hash('rv|'+D.rid+'|'+g+'|'+st+'|'+(r37Mem._seed!==undefined?r37Mem._seed:Math.floor(Date.now()/r37DayMs))));
 const lastWrong=w=>{try{const a=attemptsFor(w.id);return a.length>0&&!a[a.length-1].correct;}catch(_){return false;}};
 /* two newly missed words (this group first, then the rest of the range), four old words from the group */
 let nw=r37Shuf(grp.filter(lastWrong),rng).slice(0,2);
 if(nw.length<2)nw=nw.concat(r37Shuf(D.words.filter(w=>!grp.includes(w)&&lastWrong(w)),rng).slice(0,2-nw.length));
 const old=r37Shuf(grp.filter(w=>!nw.includes(w)),rng).slice(0,4);
 const words=[...old,...nw];
 const target=Math.min(6,grp.length+nw.filter(w=>!grp.includes(w)).length);
 for(const w of r37Shuf(grp.filter(w=>!words.includes(w)),rng)){if(words.length>=target)break;words.push(w);}
 const qs=r37Shuf(words,rng).map(w=>r37DzCell(w,3));
 r37P={kind:'dz',track:'dictation',diff:r37DiffN('english'),qs,i:0,res:[],hearts:99,maxHearts:0,shield:false,correct:0,hinted:0,phase:'quiz',fb:null,hintShown:false,title:r37Icon('🔁')+' 第 '+(g+1)+' 組重溫',praise:'做得好！',learn:[],dz:{rid:D.rid,g,lvl:3,n:D.groups.length,rv:true},log:[],miss:{},nudge:null};
 r37Nav37('lp/play');
}
const r37DayMs=86400000;
function r37DzHome(){
 const D=r37DzData(),top=r37Top('<a class="r37-back2" href="#p/dictation" aria-label="默書星">←</a>');
 if(!D.groups.length)return `<section class="r37-hub r37-dz" style="--h:340">${top}<div class="r37-gate"><div class="r37-login"><div class="r37-lk" aria-hidden="true">${r37Icon('📝')}</div><b>請家長先加入默書範圍</b><a class="r37-go" href="#ranges">${r37Icon('📝')}默書範圍</a></div></div>${r37Nav('p/dictation')}</section>`;
 const cards=D.groups.map((ws,g)=>{
  const b=r37DzBest(D.rid,g),rec=r37DzRec(b);
  const due=r37DzDue(D.rid,g);
  return `<article class="r37-dzc${due?' due':''}" data-g="${g}" ${due?'data-due="1"':''}><button type="button" class="r37-dzm" data-r37="dz-go" data-g="${g}" data-l="0" aria-label="第 ${g+1} 組，${ws.length} 個字"><span class="r37-dzn">${g+1}</span><span class="r37-dzp" lang="en">${ws.slice(0,3).map(w=>esc(w.en)).join(' · ')}</span></button>${due?`<button type="button" class="r37-dzrv" data-r37="dz-rv" data-g="${g}"><span aria-hidden="true">${r37Icon('🔁')}</span>今日重溫</button>`:''}<div class="r37-dzl">${[1,2,3].map(l=>`<button type="button" class="r37-dzb ${rec===l-1?'rec':''} ${b[l-1]>=3?'done':''}" data-r37="dz-go" data-g="${g}" data-l="${l}" data-stars="${b[l-1]}" aria-label="第 ${l} 級 ${R37_DZ_NAMES[l-1]}，${b[l-1]} 星"><span aria-hidden="true">${r37Icon(R37_DZ_LV[l-1])}</span><b>${l} ★${b[l-1]}</b></button>`).join('')}</div></article>`;
 }).join('');
 return `<section class="r37-hub r37-dz" style="--h:340">${top}<div class="r37-dzh"><span aria-hidden="true">${r37Icon('📖')}</span><b>${esc(D.title)}</b><em>${D.words.length}</em></div><div class="r37-dzg">${cards}</div>${r37Nav('p/dictation')}</section>`;
}
function r37DzCellsBody(q,fb,aud){
 const ch=[...q.answer],hide=new Set(q.hide),typed=fb?[...fb.value]:[],out=[],starts=new Set((q.syl||[]).map(r=>r[0]));let cur=[];
 ch.forEach((c,i)=>{
  if(c===' '){out.push(`<span class="r37-cw">${cur.join('')}</span>`);cur=[];return;}
  if(starts.has(i)&&i>0&&ch[i-1]!==' '&&/[A-Za-z]/.test(ch[i-1]))cur.push('<span class="r37-sd" aria-hidden="true">·</span>');
  if(!hide.has(i)){cur.push(`<span class="r37-cl">${esc(c)}</span>`);return;}
  const t=typed[i]||'',cls=fb?(norm(t)===norm(c)?'ok':'bad'):'';
  cur.push(`<input class="r37-cell ${cls}" type="text" inputmode="text" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" data-ci="${i}" data-v="${esc(t)}" value="${esc(t)}" aria-label="第 ${i+1} 個字母" ${fb?'disabled':''}>`);
 });
 out.push(`<span class="r37-cw">${cur.join('')}</span>`);
 return `<div class="r37-q">${q.emoji?`<div class="r37-qe" aria-hidden="true">${q.word?r37WordArt(q.word):q.emoji}</div>`:''}<div class="r37-qt ${String(q.prompt).length>14?'long':''}">${esc(q.prompt)}</div>${aud}</div><form class="r37-fill r37-cf" data-r37-form="1"><div class="r37-cells" lang="en" style="--n:${Math.max(...q.answer.split(' ').map(x=>[...x].length))}">${out.join('')}</div><button type="submit" class="r37-ok" ${fb?'disabled':''}>確定</button></form>`;
}
function r37DzDiff(exp,got){
 const a=[...norm(exp)],b=[...norm(got)];
 if(a.length===b.length)return {a:a.map((c,i)=>c===b[i]),b:b.map((c,i)=>c===a[i])};
 const m=a.length,n=b.length,d=Array.from({length:m+1},()=>Array(n+1).fill(0));
 for(let i=m-1;i>=0;i--)for(let j=n-1;j>=0;j--)d[i][j]=a[i]===b[j]?d[i+1][j+1]+1:Math.max(d[i+1][j],d[i][j+1]);
 const ma=Array(m).fill(false),mb=Array(n).fill(false);let i=0,j=0;
 while(i<m&&j<n){if(a[i]===b[j]){ma[i]=mb[j]=true;i++;j++;}else if(d[i+1][j]>=d[i][j+1])i++;else j++;}
 return {a:ma,b:mb};
}
function r37DzMark(text,flags,rs){
 const raw=[...text],chars=raw.length===flags.length?raw:[...norm(text)];
 const one=(c,i)=>c===' '?' ':`<i class="${flags[i]?'ok':'bad'}">${esc(c)}</i>`;
 if(!rs||!rs.length||raw.length!==flags.length)return chars.map(one).join('');
 const st=new Map(rs.map(r=>[r.from,r]));let out='',i=0,prevEnd=-1;
 while(i<chars.length){
  const r=st.get(i);
  if(r){
   let g='',bad=false;for(let k=r.from;k<r.to;k++){g+=one(chars[k],k);if(!flags[k])bad=true;}
   out+=(prevEnd===i?'<span class="r37-sd" aria-hidden="true">·</span>':'')+`<span class="r37-sy2${bad?' bad':''}">${g}</span>`;prevEnd=r.to;i=r.to;continue;
  }
  out+=one(chars[i],i);i++;
 }
 return out;
}
function r37DzAns(q,fb){const d=r37DzDiff(q.answer,fb.value);return `<span class="r37-ans" lang="en">${r37DzMark(q.answer,d.a,r37SylRanges(q.answer))}</span>`;}
/* learn card: the word cut into syllables; each piece is a button that reads that piece aloud */
function r37SylRow(en){
 const toks=String(en||'').split(/(\s+)/);let any=false;
 const html=toks.map(t=>{
  if(/^\s+$/.test(t))return ' ';
  const p=r37Syl(t);
  if(p.length<2)return `<span class="r37-sw">${esc(t)}</span>`;
  any=true;return p.map(x=>`<button type="button" class="r37-sy" data-r37="speak" data-t="${esc(x)}">${esc(x)}</button>`).join('<span class="r37-sd" aria-hidden="true">·</span>');
 }).join('');
 return any?`<div class="r37-sylrow" lang="en" aria-label="音節 ${esc(r37SylText(en))}">${html}</div>`:'';
}
function r37DzYou(q,fb){const d=r37DzDiff(q.answer,fb.value),t=norm(fb.value);return `<small class="r37-you">你寫：<span lang="en">${r37DzMark(t,d.b)}</span></small>`;}
function r37DzResult(){
 const P=r37P,r=P.result,{g,lvl,n}=P.dz,coins=r.coins?`<div class="r37-rc">${r37Icon('🪙')}+${r.coins}</div>`:'';
 const next=lvl<3?`<button type="button" class="r37-go" data-r37="dz-next" aria-label="第 ${lvl+1} 級">▶ ${r37Icon(R37_DZ_LV[lvl])}</button>`:g<n-1?`<button type="button" class="r37-go" data-r37="dz-next" aria-label="下一組">▶ ${r37Icon('📖')}${g+2}</button>`:'';
 return `<section class="r37-play"><div class="r37-result ${r.passed?'win':'lose'}"><div class="r37-rb" aria-hidden="true">${r37Icon(r.passed?'🎉':'⭐')}</div>${r37Stars(r.stars)}<div class="r37-rs">${r.correct}/${P.qs.length}</div>${coins}${P.dz.rv?(r.passed?`<p class="r37-rn">${P.rvDone?'重溫全部完成！':'下一次重溫：'+(P.rvNext||1)+' 天後'}</p>`:'<p class="r37-rn">明天再重溫一次</p>'):lvl===3&&!r.passed?'<p class="r37-rn">再試一次！</p>':''}${r37MissHTML(r)}
 <div class="r37-ra">${next}<button type="button" class="r37-sec" data-r37="retry" aria-label="重做">↻</button><button type="button" class="r37-sec" data-r37="exit" aria-label="組別">${r37Icon('🗺️')}</button></div></div></section>`;
}
function r37DzSubmit(){
 const P=r37P;if(!P||P.phase!=='quiz'||P.fb)return;
 const q=P.qs[P.i];if(q.mode!=='cells')return;
 const cells=[...document.querySelectorAll('.r37-cell')],empty=cells.find(c=>!c.value);
 if(empty){empty.focus();return;}
 const ch=[...q.answer];cells.forEach(c=>{ch[+c.dataset.ci]=c.value;});
 r37Answer(ch.join(''));
}
function r37DzCellInput(c,e){
 const cells=[...document.querySelectorAll('.r37-cell')],i=cells.indexOf(c),v=[...c.value].filter(x=>/\p{L}/u.test(x));
 if(!v.length){c.value=c.dataset.v||'';return;}
 if(e&&e.inputType==='insertFromPaste'&&v.length>1){v.slice(0,cells.length-i).forEach((x,k)=>{cells[i+k].value=x;cells[i+k].dataset.v=x;});const t=cells[Math.min(cells.length-1,i+v.length)];t.focus();t.select();return;}
 c.value=v[v.length-1];c.dataset.v=c.value;
 const nx=cells[i+1];if(nx){nx.focus();nx.select();}
}
function r37DzCellKey(c,e){
 const cells=[...document.querySelectorAll('.r37-cell')],i=cells.indexOf(c);
 if(e.key==='Backspace'&&!c.value&&i>0){e.preventDefault();const p=cells[i-1];p.value='';p.dataset.v='';p.focus();}
 else if(e.key==='ArrowLeft'&&i>0){e.preventDefault();cells[i-1].focus();cells[i-1].select();}
 else if(e.key==='ArrowRight'&&i<cells.length-1){e.preventDefault();cells[i+1].focus();cells[i+1].select();}
}
