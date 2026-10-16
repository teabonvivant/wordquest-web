/* R3.7 s10 - planet shell core: progress store, difficulty, English level words, question adapters. Runs inside the app closure (host code). */
const R37_DIFF=[
 {n:1,icon:'🌱',name:'萌芽',hearts:5,qs:6,pass:.67,opts:3,scaffold:'first',hint:true},
 {n:2,icon:'🌿',name:'起步',hearts:5,qs:8,pass:.75,opts:4,scaffold:'blanks',hint:true},
 {n:3,icon:'🌳',name:'標準',hearts:4,qs:8,pass:.8,opts:4,scaffold:'none',hint:true},
 {n:4,icon:'🔥',name:'挑戰',hearts:3,qs:10,pass:.85,opts:4,scaffold:'none',hint:true,near:true},
 {n:5,icon:'🚀',name:'極速',hearts:3,qs:12,pass:.9,opts:4,scaffold:'none',hint:false,near:true}
];
const r37U=(p,a)=>Array.from({length:10},(_,i)=>p+String(a+i).padStart(2,'0'));
const R37_TRACKS={english:{name:'英文',icon:'🔤',worlds:[
 {name:'萌芽草原',icon:'🌱',units:r37U('U',1)},{name:'彩虹森林',icon:'🌲',units:r37U('U',11)},{name:'金沙沙漠',icon:'🏜️',units:r37U('U',21)},{name:'火焰火山',icon:'🌋',units:r37U('U',31)},
 {name:'冰晶雪山',icon:'🏔️',units:r37U('U',41)},{name:'星空城堡',icon:'🏰',units:r37U('U',51)},{name:'生活海港',icon:'⚓',units:r37U('T',1)},{name:'未來太空站',icon:'🛸',units:r37U('T',11)}]},
 math:{name:'數學',icon:'🔢'},olympiad:{name:'奧數',icon:'🧩'}};
const R37_CHARS=[
 {id:'panda',img:'assets/r318/ch_panda.webp',icon:'🐼',name:'熊貓',cost:0,perk:'heart',desc:'多一顆心'},
 {id:'rabbit',img:'assets/r318/ch_rabbit.webp',icon:'🐰',name:'小兔',cost:3,perk:'shield',desc:'每關第一次答錯不扣心'},
 {id:'fox',img:'assets/r318/ch_fox.webp',icon:'🦊',name:'小狐',cost:4,perk:'coin',desc:'五星多得 1 枚金幣'},
 {id:'cat',img:'assets/r318/ch_cat.webp',icon:'🐱',name:'小貓',cost:2,perk:'',desc:''},
 {id:'penguin',img:'assets/r318/ch_penguin.webp',icon:'🐧',name:'企鵝',cost:2,perk:'',desc:''},
 {id:'owl',img:'assets/r318/ch_owl.webp',icon:'🦉',name:'貓頭鷹',cost:5,perk:'heart',desc:'多一顆心'},
 {id:'tiger',img:'assets/r318/ch_tiger.webp',icon:'🐯',name:'小虎',cost:3,perk:'',desc:''},
 {id:'dragon',img:'assets/r318/ch_dragon.webp',icon:'🐲',name:'小龍',cost:8,perk:'shield',desc:'每關第一次答錯不扣心'},
 {id:'unicorn',img:'assets/r318/ch_unicorn.webp',icon:'🦄',name:'獨角獸',cost:8,perk:'coin',desc:'五星多得 1 枚金幣'},
 {id:'robot',img:'assets/r318/ch_robot.webp',icon:'🤖',name:'機械人',cost:6,perk:'',desc:''},
 {id:'alien',img:'assets/r318/ch_alien.webp',icon:'👽',name:'外星人',cost:6,perk:'',desc:''},
 {id:'astro',img:'assets/r318/ch_astro.webp',icon:'🧑‍🚀',name:'太空人',cost:10,perk:'heart',desc:'多一顆心'}
];
const R37_MISSIONS=[
 {id:'lv',icon:'🏆',name:'過 2 關',key:'levels',goal:2,coins:2},
 {id:'ok',icon:'✅',name:'答對 15 題',key:'correct',goal:15,coins:1},
 {id:'fps',icon:'🎯',name:'玩 1 局獵場',key:'fps',goal:1,coins:1},
 {id:'star',icon:'⭐',name:'得 1 個五星',key:'five',goal:1,coins:2},
 {id:'en',icon:'🔤',name:'英文答對 10 題',key:'enok',goal:10,coins:1}
];
const r37Mem={};
const r37Day=()=>dayKey();
function r37Key(){return 'wq37-'+(WQ_TEST_MODE?'t-':'')+(isLoggedIn()?accountId():'guest')+'-'+(activeChild()?.id||'x');}
function r37Get(){
 const k=r37Key();
 let o=r37Mem[k]||null;try{if(!o&&isLoggedIn())o=JSON.parse(localStorage.getItem(k)||'null');}catch(_){}
 if(!o||typeof o!=='object'||Array.isArray(o))o={};
 if(!o.lv||typeof o.lv!=='object'||Array.isArray(o.lv))o.lv={};
 if(o.enV!==2){let n=0,st=0;for(const k of Object.keys(o.lv))if(k.startsWith('english:')){if(o.lv[k].passed)n++;st+=o.lv[k].best||0;delete o.lv[k];}if(n||st)o.enOld={n,st};o.enV=2;}
 if(!o.diffs||typeof o.diffs!=='object'||Array.isArray(o.diffs)){const d=[1,2,3,4,5].includes(o.diff)?o.diff:3;o.diffs={english:d,math:d,olympiad:d};}
 for(const t of ['english','math','olympiad'])if(![1,2,3,4,5].includes(o.diffs[t]))o.diffs[t]=3;
 delete o.diff;
 /* r37Get().diff stays as the English level for older callers (legacy practice options); it is not saved */
 Object.defineProperty(o,'diff',{get(){return o.diffs.english;},set(v){if([1,2,3,4,5].includes(+v))o.diffs.english=+v;},enumerable:false,configurable:true});
 if(!Array.isArray(o.miss))o.miss=[];
 if(!Array.isArray(o.wrong))o.wrong=[];
 for(const k of ['seen','recent','warm'])if(!o[k]||typeof o[k]!=='object'||Array.isArray(o[k]))o[k]={};
 if(!Array.isArray(o.chars)||!o.chars.includes('panda'))o.chars=['panda',...(Array.isArray(o.chars)?o.chars:[])];
 if(!R37_CHARS.some(c=>c.id===o.pick&&o.chars.includes(c.id)))o.pick='panda';
 if(!o.day||o.day.d!==r37Day())o.day={d:r37Day(),levels:0,correct:0,fps:0,five:0,enok:0,claimed:[]};
 if(!Array.isArray(o.day.claimed))o.day.claimed=[];
 return r37Mem[k]=o;
}
function r37Save(){if(!isLoggedIn())return;try{localStorage.setItem(r37Key(),JSON.stringify(r37Get()));}catch(_){toast('儲存不了，請先匯出備份。','bad');}}
/* difficulty is stored per subject (diffs.english / math / olympiad); games and dictation follow the English setting */
const r37DiffT=t=>t==='math'||t==='olympiad'?t:'english';
function r37DiffN(t){return r37Get().diffs[r37DiffT(t)];}
function r37Diff(t){return R37_DIFF[r37DiffN(t)-1];}
function r37Char(){return R37_CHARS.find(c=>c.id===r37Get().pick)||R37_CHARS[0];}
function r37Coins(){return activeChild()?.stars||0;}
function r37AddCoins(n){const c=activeChild();if(!c||!isLoggedIn()||!n)return 0;c.stars+=n;save();return n;}
function r37Bump(key,n=1){const d=r37Get().day;d[key]=(d[key]||0)+n;r37Save();}
function r37Mission(){const day=r37Get().day;const base=Math.floor(Date.now()/86400000)%R37_MISSIONS.length;return [0,1,2].map(i=>R37_MISSIONS[(base+i)%R37_MISSIONS.length]);}
function r37Hash(str){let h=2166136261;for(const ch of String(str)){h^=ch.charCodeAt(0);h=Math.imul(h,16777619);}return h>>>0;}
function r37Rng(seed){let a=seed>>>0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function r37Shuf(arr,rng){const a=[...arr];for(let i=a.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;}

/* ---- level progress ---- */
const r37LvKey=(t,w,s)=>t+':'+w+':'+s;
function r37Entry(t,w,s){const e=r37Get().lv[r37LvKey(t,w,s)]||null;if(e||t!=='english')return e;const u=r37UnitId(w,s),x=u&&r37ClassDone(u);return x?{passed:true,best:x.best||0,cls:true}:null;}
function r37UnitId(w,s){return R37_TRACKS.english.worlds[w]?.units[s]||'';}
function r37UnitAt(uid){const W=R37_TRACKS.english.worlds;for(let w=0;w<W.length;w++){const s=W[w].units.indexOf(uid);if(s>=0)return {w,s};}return null;}
let r37ClassDone=()=>null;
function r37StageOpen(t,w,s){
 if(adminUnlocks())return true;
 if(s>0)return !!r37Entry(t,w,s-1)?.passed;
 if(w>0)return !!r37Entry(t,w-1,9)?.passed;
 return true;
}
/* FPS level map: node (w,s) is the English unit (w,s); open once that unit is passed (classroom completion counts) or for Admin */
function r37FpsOpen(w,s){return adminUnlocks()||!!r37Entry('english',w,s)?.passed;}
function r37FpsWorldOpen(w){return adminUnlocks()||Array.from({length:10},(_,s)=>s).some(s=>!!r37Entry('english',w,s)?.passed);}
function r37FpsNext(w,s){let nw=w,ns=s+1;if(ns>9){nw++;ns=0;}return nw<R37_TRACKS.english.worlds.length?{w:nw,s:ns}:null;}
function r37FpsUnitWords(w,s){return r37EnStage(w,s).map(x=>({en:x.en,zh:x.zh,emoji:r37Emoji(x.en)||'🔤'}));}
function r37FpsPay(w,s,res){
 const o=r37Get(),k=r37LvKey('fps',w,s),old=o.lv[k]||{best:0},stars=Math.max(1,Math.min(5,Math.round(Number(res&&res.stars))||1)),passed=res&&res.passed!==undefined?!!res.passed:stars>=3;
 const e=o.lv[k]=Object.assign({},old,{best:Math.max(old.best||0,stars),at:new Date().toISOString()});let coins=0;
 if(passed){if(!old.passed&&s===9)coins+=2;e.passed=true;if(stars===5&&!old.five){e.five=true;coins+=1+(r37Char().perk==='coin'?1:0);r37Bump('five');}}
 r37Bump('fps');r37Save();
 if(!isLoggedIn())coins=0;
 if(coins)r37AddCoins(coins);
 return coins;
}
function r37WorldStars(t,w){let n=0;for(let s=0;s<10;s++)n+=r37Entry(t,w,s)?.best||0;return n;}
function r37WorldDone(t,w){let n=0;for(let s=0;s<10;s++)if(r37Entry(t,w,s)?.passed)n++;return n;}
function r37TrackWorlds(t){return t==='english'?R37_TRACKS.english.worlds:(globalThis.WQ37Math?WQ37Math.worlds(t):[]);}
function r37TrackProgress(t){const W=r37TrackWorlds(t).length;let done=0,stars=0;for(let w=0;w<W;w++){done+=r37WorldDone(t,w);stars+=r37WorldStars(t,w);}return {done,total:W*10,stars,max:W*50};}
function r37StarsFor(correct,total,hinted){const r=total?correct/total:0;if(correct===total&&!hinted)return 5;if(r>=.9)return 4;if(r>=.75)return 3;if(r>=.5)return 2;return 1;}

/* ---- R3.18 English content overrides (r37_src/en_content_r318.json -> globalThis.WQ37EnFix): example sentences, meanings, blend groups ---- */
(function r37ApplyEnFix(){
 const F=globalThis.WQ37EnFix;if(!F)return;
 try{
  for(const [id,x] of Object.entries(F.ex||{})){const w=LIB30.words.get(id);if(w&&!w.example)w.example=x;}
  for(const [id,f] of Object.entries(F.fix||{})){const w=LIB30.words.get(id);if(!w)continue;if(f.zh)w.meaning=f.zh;if('image' in f)w.image=f.image;if(f.example)w.example=f.example;}
 }catch(_){}
 try{
  const B=F.blend,G=globalThis.WQ31Library;if(!B||!G)return;
  for(const r of B.extra||[]){if(G.recipes.has(r.id))continue;r.group=B.core.includes(r.id)?'blend':B.extId;G.recipes.set(r.id,r);try{G.data.recipes.push(r);}catch(_){}}
  const g=G.groups.get('blend');if(!g)return;
  for(const id of B.ext)if(G.recipes.get(id))G.recipes.get(id).group=B.extId;
  g.recipes=B.core.filter(id=>G.recipes.has(id));
  const x=Object.assign({},g,{id:B.extId,title:B.extTitle,recipes:B.ext.filter(id=>G.recipes.has(id))});
  G.groups.set(B.extId,x);try{G.data.groups.push(x);}catch(_){}
 }catch(_){}
})();
/* meanings that share one Chinese gloss (high / tall = 高的): a fill-in answer with either word is right */
let r37SynMap=null;
const r37ZhKey=zh=>String(zh||'').replace(/（[^）]*）/g,'').trim();
function r37Syns(en,zh){
 if(!r37SynMap){r37SynMap={};try{for(const x of LIB30.words.values()){const k=r37ZhKey(x.meaning);if(!k)continue;(r37SynMap[k]=r37SynMap[k]||new Set()).add(x.form);}}catch(_){}}
 const set=r37SynMap[r37ZhKey(zh)];return set?[...set].filter(x=>x!==en):[];
}
/* a word whose picture would teach another meaning (chest 胸膛 / die 死 / lot 很多) shows no picture */
const R37_NOEMO=new Set(['chest','die','lot']);

/* ---- English words per stage: 5 worlds by difficulty band, 10 stages of 3 words each ---- */
let r37Pool=null;
function r37EnPool(){
 if(r37Pool)return r37Pool;
 const out=[],seen=new Set();
 for(const e of (window.WQ_SHARED_REFERENCE||[])){
  const s=e.senses&&e.senses[0];if(!s||!s.zhHK||s.category==='grammar')continue;
  const en=e.en;if(!/^[a-z]{3,12}$/.test(en)||seen.has(en))continue;
  const zh=String(s.zhHK).replace(/（[^）]*）/g,'').trim();if(!zh||zh.length>7)continue;
  seen.add(en);const cat=s.category;
  out.push({en,zh,pos:s.pos,cat,sc:en.length+(cat.startsWith('js_')?3:/^extended/.test(cat)?2:0)+(s.pos==='adv'||s.pos==='conj'?1:0),ex:e.examples&&e.examples[0]?e.examples[0].en:''});
 }
 out.sort((a,b)=>a.sc-b.sc||a.en.localeCompare(b.en));
 return r37Pool=out;
}
function r37EnBand(w){const p=r37EnPool(),n=p.length,a=Math.floor(w*n/5),b=Math.floor((w+1)*n/5);return {a,b,len:b-a};}
const r37UW={};
function r37UnitWords(uid){
 if(r37UW[uid])return r37UW[uid];const u=typeof LIB30!=='undefined'&&LIB30.units.get(uid);if(!u)return [];
 const fo=u.focus||{};
 return r37UW[uid]=u.words.map(k=>LIB30.words.get(k)).filter(Boolean).map(x=>{const f=fo[x.id];return {en:x.form,zh:x.meaning,pos:'',sc:x.form.length,img:x.image||'',ex:x.example||'',fi:f&&Array.isArray(f.indices)?f.indices:[],fl:f?f.label:''};});
}
function r37EnStage(w,s){return r37UnitWords(r37UnitId(w,s));}
function r37EnWorldPool(w){return (R37_TRACKS.english.worlds[w]?.units||[]).flatMap(r37UnitWords);}
function r37EnReview(w,s){const out=[];for(let x=0;x<s;x++)out.push(...r37EnStage(w,x));return out;}
function r37EnChunks(words){const out=[];for(let i=0;i<words.length;i+=3)out.push(words.slice(i,i+3));return out;}
function r37UnitSentence(w,s){try{return (LIB30.units.get(r37UnitId(w,s))||{}).sentence||'';}catch(_){return '';}}
function r37Hl(en,idx){const set=new Set(idx||[]);return [...en].map((c,i)=>set.has(i)?`<i class="r37-fx">${esc(c)}</i>`:esc(c)).join('');}
function r37EnDistractors(word,pool,n,near,rng,unit){
 const cand=pool.filter(x=>x.en!==word.en&&x.zh!==word.zh);
 if(unit&&unit.length){
  /* contrast words from the same unit (cat / can / fan): the unit's own target is what gets tested. Levels 4-5 (near) take the closest spellings first */
  const same=unit.filter(x=>x.en!==word.en&&x.zh!==word.zh),want=Math.min(same.length,n);
  const head=near?same.map(x=>({x,d:r37Edit(x.en,word.en)})).sort((a,b)=>a.d-b.d||a.x.en.localeCompare(b.x.en)).slice(0,want).map(o=>o.x):r37Shuf(same,rng).slice(0,want);
  if(head.length>=n)return head.slice(0,n);
  const used=new Set(head.map(x=>x.en));
  return head.concat(r37EnDistractors(word,pool.filter(x=>!used.has(x.en)),n-head.length,near,rng));
 }
 let ranked;
 if(near)ranked=cand.map(x=>({x,d:r37Edit(x.en,word.en)+(x.pos===word.pos?-.5:0)})).sort((a,b)=>a.d-b.d||a.x.en.localeCompare(b.x.en)).slice(0,24).map(o=>o.x);
 else ranked=cand.filter(x=>x.pos===word.pos&&Math.abs(x.sc-word.sc)<=3);
 if(ranked.length<n)ranked=cand.filter(x=>Math.abs(x.sc-word.sc)<=4);
 return r37Shuf(ranked,rng).slice(0,n);
}
function r37Edit(a,b){const m=a.length,n=b.length,d=Array.from({length:m+1},(_,i)=>[i,...Array(n).fill(0)]);for(let j=1;j<=n;j++)d[0][j]=j;for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return d[m][n];}
const R37_UEMO={"pet":"🐾","win":"🏆","sit":"🪑","hit":"🎯","kit":"🧰","top":"🔝","hop":"🐇","pop":"🍿","dot":"⚫","hug":"🤗","fun":"🎉","bad":"👎","mad":"😠","sled":"🛷","beg":"🥺","dig":"⛏️","zip":"🤐","sip":"🥤","jog":"🏃","dock":"⚓","shut":"🚪","luck":"🍀","shell":"🐚","wish":"🌠","chip":"🍟","rich":"💰","lunch":"🍱","mother":"👩","song":"🎤","long":"📏","bang":"💥","hang":"🪝","wink":"😉","link":"🔗","kick":"⚽","pack":"🧳","sick":"🤒","photo":"📷","alphabet":"🔤","step":"👣","spin":"🌀","skip":"⏭️","smell":"👃","small":"🤏","sweet":"🍬","block":"🧱","crop":"🌾","grin":"😁","drop":"💧","free":"🆓","sand":"🏖️","wind":"🌬️","lamp":"💡","jump":"🐸","name":"📛","same":"🟰","plate":"🍽️","time":"⏰","stone":"🪨","hope":"🤞","note":"📝","tube":"🧪","cute":"🥰","June":"📅","tune":"🎵","sail":"⛵","wait":"⏳","day":"☀️","say":"💬","clay":"🏺","see":"👀","team":"👥","meat":"🍖","float":"🛟","slow":"🐢","grow":"🌱","blow":"🎈","yellow":"🟡","right":"➡️","bright":"🔆","sight":"👁️","high":"🪁","flight":"✈️","lie":"🛏️","die":"🎲","cried":"😢","flies":"🪰","room":"🛋️","zoo":"🐼","good":"👍","wool":"🧶","point":"👉","joy":"😄","loud":"📢","brown":"🟫","farm":"🚜","arm":"💪","card":"💳","dark":"🌑","sport":"🏀","north":"🧭","fern":"🌿","turn":"🔄","air":"💨","fair":"⚖️","repair":"🔧","airport":"🛫","hear":"👂","dear":"💌","beard":"🧔","box":"📦","baby":"👶","city":"🏙️","cities":"🏙️","puppy":"🐶","toys":"🧸","walked":"🚶","jumped":"🐸","make":"🛠️","tall":"🦒","unhappy":"😞","kind":"🫶","safe":"🛡️","reuse":"♻️","rewrite":"✍️","build":"🏗️","rebuild":"🏗️","give":"🎁","love":"❤️","said":"🗣️","great":"🌟","steak":"🥩","here":"📍","Monday":"📅","Friday":"📅","Sunday":"📅","May":"📅","calculator":"🧮","brave":"🦁","careful":"⚠️","draw":"✏️","carry":"🎒","open":"🔓","close":"🔒","help":"🤝","wide":"↔️","above":"⬆️","below":"⬇️","afternoon":"🌤️","evening":"🌇","breakfast":"🥞","dinner":"🍲","fan":"🪭","jam":"🍓","ham":"🍖","wet":"💦","mop":"🧹","bun":"🍞","wig":"💇","chest":"🧰","bench":"🪑","moth":"🦋","sink":"🚰","neck":"🦒","pond":"🦆","lake":"🏞️","gate":"🚪","rope":"🪢","cone":"🔺","mule":"🐴","flute":"🪈","tail":"🐕","pillow":"🛏️","pool":"🏊","soil":"🪴","hair":"💇","stairs":"🪜","raincoat":"🧥","playground":"🛝","head":"🙂","spray":"🧴","coach":"🧑‍🏫","path":"🛤️","mat":"🧘","yam":"🍠","men":"👬","get":"🤲","fin":"🦈","fit":"👕","lot":"🏞️","rag":"🧽","wag":"🐕","fed":"🍼","peg":"📎","keg":"🛢️","lid":"🫙","hid":"🙈","big":"🐘","tip":"👆","dim":"🔅","rim":"⭕","slim":"🧍","stuck":"🚧","chin":"🧔","much":"➕","chop":"🔪","thin":"📄","thick":"📚","this":"👇","that":"👉","these":"👇","those":"👉","them":"👥","then":"⏭️","there":"👉","tank":"🚰","back":"🔙","pick":"☝️","nephew":"👦","spot":"🔴","skin":"✋","flat":"➖","went":"🚶","line":"〰️","rule":"📜","stay":"🏠","way":"🛣️","show":"🎭","tight":"🤏","tried":"💪","dried":"☀️","boil":"♨️","join":"🤝","out":"🚪","now":"⏰","short":"🩳","born":"👶","her":"👩","pair":"🧦","near":"📍","clear":"💎","year":"🗓️","fear":"😨","played":"⚽","want":"🙋","wanted":"🙋","playing":"🤸","making":"🛠️","smaller":"🔽","smallest":"🐜","bigger":"🔼","biggest":"🐋","taller":"🦒","unkind":"😠","unfair":"⚖️","unsafe":"⚠️","reread":"📖","use":"🖐️","have":"🎁","come":"👋","some":"🍬","break":"☕","English":"🔤","Tom":"👦","Hong Kong":"🇭🇰","share":"🍰","far":"🔭","inside":"📦","outside":"🌳","today":"📅","tomorrow":"🌅","yesterday":"🌙","weekend":"🎉"};
const R37_EMO={aim:'🎯',hen:'🐔',nut:'🥜',tap:'🚰',bird:'🐦',burn:'🔥',dawn:'🌅',feed:'🍼',gift:'🎁',half:'🌗',knit:'🧶',look:'👀',sale:'🏷️',soft:'🧸',vest:'🦺',yawn:'🥱',bacon:'🥓',chips:'🍟',count:'🔢',easel:'🎨',guess:'🤔',kayak:'🛶',relay:'🏃',nurse:'🧑‍⚕️',shape:'🔷',stove:'🍳',thumb:'👍',weigh:'⚖️',afraid:'😨',ban:'🚫',chilli:'🌶️',meadow:'🌾',napkin:'🧻',puddle:'💧',risk:'⚠️',tailor:'🧵',writer:'✍️',cabbage:'🥬',holiday:'🏖️',picture:'🖼️',scooter:'🛴',trouble:'😣',receive:'📥',asteroid:'☄️',dumpling:'🥟',lemonade:'🍋',omelette:'🍳',reindeer:'🦌',system:'⚙️',tense:'😬',whirl:'🌀',celebrate:'🎉',encourage:'📣',principal:'🧑‍🏫',resort:'🏝️',tablespoon:'🥄',language:'🗣️',protection:'🛡️',soloist:'🎤',handout:'📄',imitate:'🦜',allergic:'🤧',equipment:'🧰',information:'ℹ️',medieval:'🏰',pathogen:'🦠',relieved:'😌',retailer:'🏪',amphibian:'🐸',supermarket:'🛒',diagnosis:'🩺',interface:'💻',concentrate:'🧠',enterprise:'🏢',disagreement:'🙅',successfully:'🏆',pessimistic:'😞',imaginative:'💭',honest:'😇',little:'🤏',debt:'💸',event:'📅',produce:'🏭',adjust:'🎛️',impact:'💥',permit:'✅',assess:'📝',complex:'🧩',quality:'⭐',severe:'⛈️',mean:'💬',past:'⏪',pour:'🫗',term:'🏫',crutch:'🩼',square:'⛲',turnip:'🥔',ceiling:'🏠',issue:'❓',mostly:'📊',squeeze:'🍋',colander:'🥣',fault:'🌍',denote:'👉',funnel:'🔻',kidney:'🫘',newton:'🍎',solute:'🧂',tackle:'💪',vertex:'🔺',anaemia:'🩸',concede:'🤝',convert:'🔄',deprive:'🚫',excerpt:'📑',pension:'👴',relieve:'😌',unlikely:'🙅',cauliflower:'🥦',compound:'⚗️',digitise:'💾',hardship:'😣',workload:'📚',bandwidth:'📶',encounter:'👋',fieldwork:'🧭',mandatory:'❗',perimeter:'📐',reference:'📖',undertake:'📋',withstand:'🛡️',capability:'🦾',decorative:'🎀',generosity:'💝',livelihood:'💼',persuasive:'🗣️',proportion:'🥧',surrounding:'🏞️',behavioural:'🙋',controversy:'⚡',credibility:'✅',prospective:'🔭',unavoidable:'⛔',reproduction:'🐣',irresistible:'🍩'};
let r37ImgMap=null;
function r37UnitEmoji(en){if(!r37ImgMap){r37ImgMap={};try{for(const x of LIB30.words.values())if(x.image&&/^[0-9a-f-]+$/.test(x.image))r37ImgMap[x.form]=String.fromCodePoint(...x.image.split('-').map(h=>parseInt(h,16)));}catch(_){}}return r37ImgMap[en]||'';}
/* T14: function / abstract words get no picture (a wrong picture is a wrong anchor); a few unit pictures are replaced; unit picture beats dictionary */
const R37_NOPIC=new Set(['short','high','much','tip','pop','lot','get','went','them','her','this','that','these','those','there','then','the','a','an','is','are','was','were','be','been','am','do','does','did','have','has','had','will','would','could','shall','should','may','might','must','of','to','in','on','at','by','for','with','from','and','or','but','not','no','yes','if','so','as','it','he','she','we','you','they','me','him','us','my','your','his','its','our','their','who','what','when','where','why','how','which','some','any','all','one','very','too','just','also','more','most','many','such','than','only','even','still','again','here','now','out','up','down','off','over','back','much','lot','get','go','come','make','take','put','let','say','said']);
const R37_EMOFIX={mat:'🧺',jump:'🦘',star:'⭐'};
function r37Emoji(en){
 if(R37_NOPIC.has(en)||R37_NOEMO.has(en))return '';
 if(R37_EMOFIX[en])return R37_EMOFIX[en];
 let d='';try{d=(dictionary[en]&&dictionary[en].emoji)||'';}catch(_){}
 if(d==='🪙'&&!/^(coin|coins|money|gold)$/.test(en))d='';
 return r37UnitEmoji(en)||R37_EMO[en]||R37_UEMO[en]||d||'';
}
function r37Scaffold(en,mode){if(mode==='first')return en[0]+' '+[...en].slice(1).map(()=>'＿').join(' ');if(mode==='blanks')return [...en].map(()=>'＿').join(' ');return '';}

/* ---- question builders: every question is {mode:'mcq'|'fill', kind, prompt, sub, emoji, options, answer, accept, audio, hint, explain, scaffold, word} ---- */
/* one English question for word wd of the given kind: zh2en | en2zh | listen (choice), fill | fill-listen (typed) */
function r37EnBuild(wd,kind,c){
 const D=c.D,rng=c.rng,emoji=R37_NOEMO.has(wd.en)?'':r37Emoji(wd.en),ck=c.ck;
 const syn=r37Syns(wd.en,wd.zh),zhShort=r37ZhKey(wd.zh);
 if(kind==='fill'||kind==='fill-listen'){
  const listen=kind==='fill-listen';
  return {mode:'fill',kind,prompt:listen?'🔊':wd.zh,emoji:listen?'':emoji,answer:wd.en,accept:[wd.en,...syn],syn,zhOf:wd.zh,audio:wd.en,autoPlay:listen,scaffold:r37Scaffold(wd.en,D.scaffold),hint:'第一個字母是 '+wd.en[0].toUpperCase()+'，共 '+wd.en.length+' 個字母',explain:wd.zh+' = '+wd.en,word:wd.en,len:wd.en.length,cs:/[A-Z]/.test(wd.en),ck};
 }
 const nOpt=D.opts-1,seenZ=new Set([wd.zh]),seenE=new Set([wd.en]),ds=[];
 for(const x of r37EnDistractors(wd,c.near,nOpt+3,D.near,rng,c.unit)){if(ds.length>=nOpt)break;if(seenZ.has(x.zh)||seenE.has(x.en))continue;seenZ.add(x.zh);seenE.add(x.en);ds.push(x);}
 const opts=r37Shuf([wd,...ds],rng),info={};
 const q={mode:'mcq',kind,answer:wd.en,audio:wd.en,word:wd.en,ck,zhOf:wd.zh};
 if(kind==='zh2en'){opts.forEach(o=>{info[o.en]=o.zh;});return Object.assign(q,{prompt:wd.zh,emoji,options:opts.map(o=>o.en),hint:'第一個字母是 '+wd.en[0].toUpperCase(),explain:wd.zh+' = '+wd.en,lang:'en',info});}
 if(kind==='en2zh'){opts.forEach(o=>{info[o.zh]=o.en;});return Object.assign(q,{prompt:wd.en,emoji,options:opts.map(o=>o.zh),answer:wd.zh,hint:'第一個字是「'+(zhShort[0]||wd.zh[0])+'」',explain:wd.en+' = '+wd.zh,lang:'zh',info});}
 opts.forEach(o=>{info[o.en]=o.zh;});
 return Object.assign(q,{kind:'listen',prompt:'🔊',emoji:'',options:opts.map(o=>o.en),autoPlay:true,hint:'意思：'+wd.zh,explain:wd.en+' = '+wd.zh,lang:'en',info});
}
function r37EnQuestions(w,s,diff,seed){
 const D=R37_DIFF[diff-1],rng=r37Rng(r37Hash('en-q|'+w+'|'+s+'|'+diff+'|'+seed)),stage=r37EnStage(w,s),pool=r37EnPool(),wp=r37EnWorldPool(w);
 const near=wp.length>20?wp:pool,chunks=r37EnChunks(stage),ctx={D,rng,near,unit:stage};
 const N=s===9?Math.max(D.qs,12):Math.max(D.qs,stage.length),qs=[];
 const fillShare=diff===5?[0,1,1,0,1]:diff===1?[0,0,1]:[0,1];
 const order=[],cks=[];chunks.forEach((c,i)=>{for(const x of r37Shuf(c,rng)){order.push(x);cks.push(i);}});
 const extra=r37Shuf(s===9?[...stage,...r37EnReview(w,9)]:stage,rng);
 for(let k=0;k<N;k++){
  const wd=k<order.length?order[k]:extra[(k-order.length)%extra.length],ck=k<order.length?cks[k]:chunks.length-1,mode=fillShare[k%fillShare.length]?'fill':'mcq';
  let kind;
  if(mode==='mcq')kind=['zh2en','en2zh','listen'][(diff===1?[0,2]:[0,1,2])[k%(diff===1?2:3)]];
  else kind=k%3===2&&diff>=2?'fill-listen':'fill';
  /* words from earlier units (boss stage) contrast with their own unit, not the boss unit */
  const own=stage.some(x=>x.en===wd.en);
  qs.push(r37EnBuild(wd,kind,Object.assign({},ctx,{ck,unit:own?stage:(r37UnitOf(w,wd)||stage)})));
 }
 return qs;
}
function r37UnitOf(w,wd){const W=R37_TRACKS.english.worlds[w];if(!W)return null;for(const u of W.units){const ws=r37UnitWords(u);if(ws.some(x=>x.en===wd.en))return ws;}return null;}
function r37MathQuestions(track,w,s,diff,seed){
 if(!globalThis.WQ37Math)return [];
 const D=R37_DIFF[diff-1],n=s===9?Math.max(D.qs,10):D.qs;
 const avoid=(r37Get().recent[track]||[]).slice(-30);
 return WQ37Math.make(track,w,s,n,diff,seed,avoid).map(q=>({mode:q.mode,kind:'math',prompt:q.q,options:q.options,answer:q.answer,accept:q.accept,hint:q.hint,explain:q.explain,skill:q.skill,mq:q}));
}
function r37QuizQuestions(track,mode,n,diff,seed){
 const out=[],seen=new Set(),open=[],rng=r37Rng(r37Hash('quiz|'+track+'|'+seed));
 if(track==='english'){for(let w=0;w<R37_TRACKS.english.worlds.length;w++)if(r37StageOpen('english',w,0))for(let s=0;s<10;s++)if(r37StageOpen('english',w,s))open.push([w,s]);}
 else{for(let w=0;w<6;w++)if(r37StageOpen(track,w,0))for(let s=0;s<10;s++)open.push([w,s]);}
 for(let k=0;out.length<n&&k<400;k++){
  const [w,s]=open[Math.floor(rng()*open.length)];
  const qs=(track==='english'?r37EnQuestions(w,s,diff,seed+k):r37MathQuestions(track,w,s,diff,seed+k)).filter(q=>mode==='mix'||q.mode===mode);
  if(!qs.length)continue;
  const q=qs[Math.floor(rng()*qs.length)],key=q.mode+'|'+q.prompt+'|'+q.answer;
  if(!seen.has(key)){seen.add(key);out.push(q);}
 }
 return out;
}
/* ---- judging: value, form (maths 3/4 for 0.75), capitals, spaces/hyphens, synonyms ---- */
const r37Apos=x=>String(x==null?'':x).replace(/[‘’ʼ′`´]/g,"'");
function r37Judge(q,input){
 const raw=String(input??'').trim();
 if(!raw)return {ok:false,why:'empty'};
 if(q.mq&&globalThis.WQ37Math){
  const d=WQ37Math.checkDetail?WQ37Math.checkDetail(q.mq,raw):{ok:WQ37Math.check(q.mq,raw)};
  return d.ok?{ok:true}:{ok:false,why:d.why||'wrong',msg:d.msg||''};
 }
 if(q.mode==='mcq')return {ok:raw===q.answer};
 const v=r37Apos(raw),a=r37Apos(q.answer),nv=norm(v),na=norm(a);
 if(nv===na){
  if(q.cs&&!q.dz&&v.replace(/\s+/g,' ').trim()!==a.replace(/\s+/g,' ').trim())return {ok:false,why:'case',msg:'字對了，留意大小寫'};
  return {ok:true};
 }
 const hit=(q.accept||[]).find(x=>norm(r37Apos(x))===nv);
 if(hit)return hit===q.answer?{ok:true}:{ok:true,syn:hit};
 const strip=x=>norm(x).replace(/[\s-]+/g,'');
 if(!q.dz&&strip(a)&&strip(v)===strip(a))return {ok:false,why:'space',msg:'字對了，注意空格／連字號'};
 return {ok:false,why:'wrong'};
}
function r37Check(q,input){return r37Judge(q,input).ok;}
