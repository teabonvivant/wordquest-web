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
 /* R3.19: another child on the same device never inherits the map cursor or a half-played level of the previous child */
 if(r37Mem._wk!==k){const first=r37Mem._wk===undefined;r37Mem._wk=k;if(!first){r37Mem._w=null;delete r37Mem._rw;delete r37Mem._fw;try{if(r37P&&r37P.key&&r37P.key!==k)r37P=null;}catch(_){}}}
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
 if(!o.day||o.day.d!==r37Day())o.day={d:r37Day(),levels:0,correct:0,fps:0,five:0,enok:0,cn:0,claimed:[]};
 if(!Array.isArray(o.day.claimed))o.day.claimed=[];
 /* R3.23: the six-world olympiad levels are replaced by the 30-unit 奧數路線 (same keys 'olympiad:grade:stage', new meaning). Old passes never count as new levels; coins stay with the child. */
 if(o.olyV!==2){let n=0,st=0;for(const k of Object.keys(o.lv))if(k.startsWith('olympiad:')){if(o.lv[k].passed)n++;st+=o.lv[k].best||0;delete o.lv[k];}if(n||st)o.olyOld={n,st};o.miss=o.miss.filter(m=>m.t!=='olympiad');if(o.seen)delete o.seen.olympiad;o.olyV=2;}
 if(!o.oly||typeof o.oly!=='object'||Array.isArray(o.oly))o.oly={seen:{},last:''};
 if(!o.oly.seen||typeof o.oly.seen!=='object'||Array.isArray(o.oly.seen))o.oly.seen={};
 return r37Mem[k]=o;
}
function r37Save(){if(!isLoggedIn())return;try{localStorage.setItem(r37Key(),JSON.stringify(r37Get()));}catch(_){toast('儲存不了，請先匯出備份。','bad');}}
/* difficulty is stored per subject (diffs.english / math / olympiad); games and dictation follow the English setting */
const r37DiffT=t=>t==='math'||t==='olympiad'?t:'english';
function r37DiffN(t){return r37Get().diffs[r37DiffT(t)];}
function r37Diff(t){return R37_DIFF[r37DiffN(t)-1];}
function r37Char(){return R37_CHARS.find(c=>c.id===r37Get().pick)||R37_CHARS[0];}
function r37Coins(){return activeChild()?.stars||0;}
/* R3.30 C-03: coins from 闖關, 快速測驗, 默書 and the games share a daily cap (day.cn counts them, so it resets at the same Hong Kong midnight as the missions).
   Coins past the cap are not paid later. 每日任務 claims pass free=true: their total is already fixed by the three missions of the day. Returns the coins really paid. */
const R37_COIN_CAP=10;
const r37CoinToday=()=>Math.min(R37_COIN_CAP,(r37Get().day.cn)||0);
function r37AddCoins(n,free,quiet){
 const c=activeChild();if(!c||!isLoggedIn()||!n)return 0;
 if(!free){const req=n;n=Math.min(n,Math.max(0,R37_COIN_CAP-((r37Get().day.cn)||0)));if(n<req&&!quiet)toast('今日闖關和遊戲的金幣已達上限（'+R37_COIN_CAP+' 枚），明天再賺。');if(n<=0)return 0;r37Get().day.cn=((r37Get().day.cn)||0)+n;r37Save();}
 c.stars+=n;save();return n;
}
try{window.r37CoinToday=r37CoinToday;window.R37_COIN_CAP=R37_COIN_CAP;}catch(_){}
function r37Bump(key,n=1){const d=r37Get().day;d[key]=(d[key]||0)+n;r37Save();}
function r37Mission(){const day=r37Get().day;/* R3.29 C-06: the same Hong Kong day as the counters (dayKey), so the missions change at the same midnight as the counts reset */const base=Math.floor(Date.parse(dayKey()+'T00:00:00Z')/86400000)%R37_MISSIONS.length;return [0,1,2].map(i=>R37_MISSIONS[(base+i)%R37_MISSIONS.length]);}
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
 if(t==='olympiad'&&globalThis.WQOly)return r80StageOpen(w,s);
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
 if(passed){if(!old.passed){if(s===9)coins+=2;r37Bump('levels');}e.passed=true;if(stars===5&&!old.five){e.five=true;coins+=1+(r37Char().perk==='coin'?1:0);r37Bump('five');}}
 r37Bump('fps');r37Save();
 if(!isLoggedIn())coins=0;
 coins=r37AddCoins(coins);
 return coins;
}
/* ---- R3.21: the three learning games (字母砲台 td / 字母迷宮 mz / 字卡征途 cd), English and maths. Track keys td-en td-ma mz-en mz-ma cd-en cd-ma ---- */
const R37_G3={
 td:{name:'字母砲台',icon:'🏰',lib:'WQ37TD',hue:265,tag:'拼對才發炮'},
 mz:{name:'字母迷宮',icon:'🌀',lib:'WQ37Maze',hue:190,tag:'按序吃字母'},
 cd:{name:'字卡征途',icon:'🃏',lib:'WQ37Card',hue:335,tag:'解題才出牌'}
};
const r37G3Track=(g,subj)=>g+'-'+(subj==='math'?'ma':'en');
const r37G3Worlds=subj=>subj==='math'?WQ37Math.worlds('math'):R37_TRACKS.english.worlds;
const r37G3Grade=(subj,w)=>subj==='math'?(['小一二','小二','小三','小四','小五','小六'][w]||''):(R37_TRACKS.english.worlds[w]?.name||'詞彙 '+(w+1));
/* a level is open after the previous level of the same game and subject, after the matching lesson level (English unit / maths level) was passed, or for Admin */
function r37G3Open(g,subj,w,s){
 if(adminUnlocks())return true;const t=r37G3Track(g,subj);
 if(r37Entry(t,w,s)?.passed)return true;
 if(s>0?r37Entry(t,w,s-1)?.passed:(w===0||r37Entry(t,w-1,9)?.passed))return true;
 return !!r37Entry(subj==='math'?'math':'english',w,s)?.passed;
}
function r37G3WorldOpen(g,subj,w){for(let s=0;s<10;s++)if(r37G3Open(g,subj,w,s))return true;return false;}
function r37G3Next(g,subj,w,s){let nw=w,ns=s+1;if(ns>9){nw++;ns=0;}return nw<r37G3Worlds(subj).length?{w:nw,s:ns}:null;}
function r37G3Items(subj,w,s,diff,seed){
 if(subj==='math'){
  const qs=WQ37Math.make('math',w,s,8,diff,seed,(r37Get().recent.math||[]).slice(-30));
  return qs.map((x,i)=>({id:'m'+w+'-'+s+'-'+i,kind:'math',q:x.q,a:x.answer,explain:x.explain||'',hint:x.hint||'',skill:x.skill||'',pad:(/[\/.]/.test(x.answer)||x.form)?'frac':'digits',check:t=>WQ37Math.check(x,t),detail:t=>WQ37Math.checkDetail(x,t)}));
 }
 return r37EnStage(w,s).map(x=>({id:'e:'+x.en,kind:'word',en:x.en,zh:x.zh,emoji:r37Pic(x.en)||'',ex:x.ex||''}));
}
/* up to two words / problems the child got wrong before (the existing wrong bank), else a couple from the previous level: slipped into the deck as spaced review, never counted in the stars */
function r37G3Review(subj,w,s,diff,seed,items){
 const have=new Set(items.map(x=>x.en||x.q)),o=r37Get();
 if(subj==='math'){
  const sk=new Set(o.miss.filter(m=>m.t==='math'&&m.w===w&&m.sk).map(m=>m.sk));
  if(s===0&&!sk.size)return [];
  try{return WQ37Math.make('math',w,Math.max(0,s-1),6,diff,seed+97).filter(x=>!have.has(x.q)&&(!sk.size||sk.has(x.skill))).slice(0,2).map((x,i)=>({id:'m'+w+'-rv-'+i,kind:'math',q:x.q,a:x.answer,explain:x.explain||'',hint:x.hint||'',skill:x.skill||'',pad:(/[\/.]/.test(x.answer)||x.form)?'frac':'digits',check:t=>WQ37Math.check(x,t),detail:t=>WQ37Math.checkDetail(x,t)}));}catch(_){return [];}
 }
 let pool=o.wrong.filter(x=>!have.has(x.en)&&x.zh).sort((a,b)=>(b.n-a.n)||(b.at-a.at)).slice(0,2).map(x=>({id:'e:'+x.en,kind:'word',en:x.en,zh:x.zh,emoji:r37Pic(x.en)||''}));
 if(pool.length<2&&s>0)pool=pool.concat(r37EnStage(w,s-1).filter(x=>!have.has(x.en)&&!pool.some(p=>p.en===x.en)).slice(0,2-pool.length).map(x=>({id:'e:'+x.en,kind:'word',en:x.en,zh:x.zh,emoji:r37Pic(x.en)||''})));
 return pool;
}
function r37G3Pay(g,subj,w,s,res,items){
 const o=r37Get(),k=r37LvKey(r37G3Track(g,subj),w,s),old=o.lv[k]||{best:0},stars=Math.max(1,Math.min(5,Math.round(Number(res&&res.stars))||1)),passed=!!(res&&res.passed);
 const e=o.lv[k]=Object.assign({},old,{best:Math.max(old.best||0,stars),at:new Date().toISOString()});let coins=0;
 if(passed){if(!old.passed){coins+=1+(s===9?2:0);r37Bump('levels');}e.passed=true;if(stars===5&&!old.five){e.five=true;coins+=1+(r37Char().perk==='coin'?1:0);r37Bump('five');}}
 /* learning loop: a first-try miss goes into the same wrong bank / maths mistake list the quiz uses, so the warm-up and review pick it up; a first-try hit clears a word from the bank */
 const now=Date.now(),by={};items.forEach(x=>{by[x.id]=x;});
 for(const p of (res&&res.perItem)||[]){
  if(p.rv){if(subj!=='math'&&p.firstOk&&p.en){const j=o.wrong.findIndex(x=>x.en===p.en);if(j>=0){o.wrong[j].n--;if(o.wrong[j].n<=0)o.wrong.splice(j,1);}}continue;}
  if(!p.tries)continue;const it=by[p.id];if(!it)continue;
  if(subj==='math'){if(!p.firstOk){o.miss.push({t:'math',sk:it.skill||'',q:it.q,a:it.a,at:now,w,s});if(o.miss.length>60)o.miss.shift();}continue;}
  const i=o.wrong.findIndex(x=>x.en===p.en);
  if(!p.firstOk){if(i>=0){o.wrong[i].n++;o.wrong[i].at=now;o.wrong[i].w=w;o.wrong[i].s=s;}else{o.wrong.push({en:p.en,zh:p.zh,w,s,at:now,n:1});if(o.wrong.length>60)o.wrong.shift();}}
  else if(i>=0&&o.wrong[i].n<=1)o.wrong.splice(i,1);
  try{if(isLoggedIn()){const c=activeChild(),wd=db.words.find(x=>x.childId===c?.id&&norm(x.en)===norm(p.en));if(wd){recordAttempt(wd,'spell',!!p.firstOk,p.firstOk?p.en:'',p.en,'遊戲',{src:'g3-'+g,track:'english',w,s});}}}catch(_){}
 }
 const fc=((res&&res.perItem)||[]).filter(p=>!p.rv&&p.firstOk).length;if(fc){r37Bump('correct',fc);if(subj!=='math')r37Bump('enok',fc);}
 r37Save();if(!isLoggedIn())coins=0;coins=r37AddCoins(coins);return coins;
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
  const xr=B.ext.filter(id=>G.recipes.has(id)),xw=[];
  /* R3.29 A-13: the 'familiar parts' of the extension card are this group's own source words (costume, play, situation), not the first blend group's */
  for(const id of xr)for(const sr of (G.recipes.get(id).sources||[]))if(sr.word&&!xw.includes(sr.word))xw.push(sr.word);
  const x=Object.assign({},g,{id:B.extId,title:B.extTitle,recipes:xr,baseWords:xw.length?xw.slice(0,3):g.baseWords});
  G.groups.set(B.extId,x);try{G.data.groups.push(x);}catch(_){}
 }catch(_){}
})();
/* R3.19 N02: a fill-in answer is also right for a real synonym (high / tall = 高的), from a checked list only. Words that merely share a gloss are not
   synonyms: cat / cats, tooth / teeth, jump / jumped are forms of one word, so the typed form is marked "another form" (no heart lost, one more try) */
const R37_SYN_PAIRS=[['angry','mad'],['rock','stone'],['close','shut'],['lorry','truck'],['boat','ship'],['dish','plate'],['bicycle','bike'],['road','way'],['high','tall']];
const R37_FORM_TAG=/（(?:複數|單數|單顆|單隻|[^）]*過去式)[^）]*）/;
let r37SynMap=null,r37FormMap=null;
const r37ZhKey=zh=>String(zh||'').replace(/（[^）]*）/g,'').trim();
function r37SynInit(){
 r37SynMap={};r37FormMap={};
 const ok=new Set();for(const [a,b] of R37_SYN_PAIRS){ok.add(a+'|'+b);ok.add(b+'|'+a);}
 const by={},tagged=new Set();
 try{for(const x of LIB30.words.values()){const k=r37ZhKey(x.meaning);if(!k)continue;(by[k]=by[k]||new Set()).add(x.form);if(R37_FORM_TAG.test(String(x.meaning)))tagged.add(x.form);}}catch(_){}
 for(const set of Object.values(by)){
  const a=[...set];
  for(const x of a)for(const y of a){
   if(x===y)continue;
   if(ok.has(x+'|'+y))(r37SynMap[x]=r37SynMap[x]||[]).push(y);
   else if(tagged.has(x)||tagged.has(y))(r37FormMap[x]=r37FormMap[x]||[]).push(y);
  }
 }
}
function r37Syns(en){if(!r37SynMap)r37SynInit();return (r37SynMap[en]||[]).slice();}
/* other forms of the same word (cat -> cats): the typed one is not a synonym, it gets the "another form" hint */
function r37FormMates(en){if(!r37SynMap)r37SynInit();return (r37FormMap[en]||[]).slice();}
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
function r37EnDistractors(word,pool,n,near,rng,unit,kind,bad){
 /* R3.31: every English choice question uses the closest wrong answers: spelling for zh2en / listen, meaning (same category + part of speech + similar length) for en2zh. near==='soft' (level 1) picks at random from the closest few */
 const wk=r37ZhKey(word.zh),ok=x=>x.en!==word.en&&r37ZhKey(x.zh)!==wk&&!(bad&&bad.has(x.en));
 const shared=(a,b)=>[...new Set(a)].filter(c=>b.includes(c)).length;
 const sc=kind==='en2zh'
  ?x=>(x.cat&&word.cat?(x.cat===word.cat?0:3):1.5)+(x.pos&&word.pos?(x.pos===word.pos?0:2):1)+Math.abs(x.zh.length-word.zh.length)*.4-shared(x.zh,word.zh)*.6+r37Edit(x.en,word.en)*.04
  :x=>r37Edit(x.en,word.en)+(x.pos===word.pos?-.5:0)+Math.abs(x.en.length-word.en.length)*.3;
 const rank=a=>a.map(x=>({x,d:sc(x)})).sort((p,q)=>p.d-q.d||p.x.en.localeCompare(q.x.en)).map(o=>o.x);
 const pick=(a,k)=>near==='soft'?r37Shuf(rank(a).slice(0,k*2),rng).slice(0,k):rank(a).slice(0,k);
 const cand=pool.filter(ok);
 if(unit&&unit.length){
  const same=unit.filter(ok),want=Math.min(same.length,n),head=pick(same,want);
  if(head.length>=n)return head.slice(0,n);
  const used=new Set(head.map(x=>x.en));
  return head.concat(r37EnDistractors(word,pool.filter(x=>!used.has(x.en)),n-head.length,near,rng,null,kind,bad));
 }
 return pick(cand,n);
}
function r37Edit(a,b){const m=a.length,n=b.length,d=Array.from({length:m+1},(_,i)=>[i,...Array(n).fill(0)]);for(let j=1;j<=n;j++)d[0][j]=j;for(let i=1;i<=m;i++)for(let j=1;j<=n;j++)d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+(a[i-1]===b[j-1]?0:1));return d[m][n];}
const R37_UEMO={"pet":"🐾","win":"🏆","sit":"🪑","hit":"🎯","kit":"🧰","top":"🔝","hop":"🐇","pop":"🍿","dot":"⚫","hug":"🤗","fun":"🎉","bad":"👎","mad":"😠","sled":"🛷","beg":"🥺","dig":"⛏️","zip":"🤐","sip":"🥤","jog":"🏃","dock":"⚓","shut":"🚪","luck":"🍀","shell":"🐚","wish":"🌠","chip":"🍟","rich":"💰","lunch":"🍱","mother":"👩","song":"🎤","long":"📏","bang":"💥","hang":"🪝","wink":"😉","link":"🔗","kick":"⚽","pack":"🧳","sick":"🤒","photo":"📷","alphabet":"🔤","step":"👣","spin":"🌀","skip":"⏭️","smell":"👃","small":"🤏","sweet":"🍬","block":"🧱","crop":"🌾","grin":"😁","drop":"💧","free":"🆓","sand":"🏖️","wind":"🌬️","lamp":"💡","jump":"🐸","name":"📛","same":"🟰","plate":"🍽️","time":"⏰","stone":"🪨","hope":"🤞","note":"📝","tube":"🧪","cute":"🥰","June":"📅","tune":"🎵","sail":"⛵","wait":"⏳","day":"☀️","say":"💬","clay":"🏺","see":"👀","team":"👥","meat":"🍖","float":"🛟","slow":"🐢","grow":"🌱","blow":"🎈","yellow":"🟡","right":"➡️","bright":"🔆","sight":"👁️","high":"🪁","flight":"✈️","lie":"🛏️","die":"🎲","cried":"😢","flies":"🪰","room":"🛋️","zoo":"🐼","good":"👍","wool":"🧶","point":"👉","joy":"😄","loud":"📢","brown":"🟫","farm":"🚜","arm":"💪","card":"💳","dark":"🌑","sport":"🏀","north":"🧭","fern":"🌿","turn":"🔄","air":"💨","fair":"⚖️","repair":"🔧","airport":"🛫","hear":"👂","dear":"💌","beard":"🧔","box":"📦","baby":"👶","city":"🏙️","cities":"🏙️","puppy":"🐶","toys":"🧸","walked":"🚶","jumped":"🐸","make":"🛠️","tall":"🦒","unhappy":"😞","kind":"🫶","safe":"🛡️","reuse":"♻️","rewrite":"✍️","build":"🏗️","rebuild":"🏗️","give":"🎁","love":"❤️","said":"🗣️","great":"🌟","steak":"🥩","here":"📍","Monday":"📅","Friday":"📅","Sunday":"📅","May":"📅","calculator":"🧮","brave":"🦁","careful":"⚠️","draw":"✏️","carry":"🎒","open":"🔓","close":"🔒","help":"🤝","wide":"↔️","above":"⬆️","below":"⬇️","afternoon":"🌤️","evening":"🌇","breakfast":"🥞","dinner":"🍲","fan":"🪭","jam":"🍓","ham":"🍖","wet":"💦","mop":"🧹","bun":"🍞","wig":"💇","chest":"🧰","bench":"🪑","moth":"🦋","sink":"🚰","neck":"🦒","pond":"🦆","lake":"🏞️","gate":"🚪","rope":"🪢","cone":"🔺","mule":"🐴","flute":"🪈","tail":"🐕","pillow":"🛏️","pool":"🏊","soil":"🪴","hair":"💇","stairs":"🪜","raincoat":"🧥","playground":"🛝","head":"🙂","spray":"🧴","coach":"🧑‍🏫","path":"🛤️","mat":"🧘","yam":"🍠","men":"👬","get":"🤲","fin":"🦈","fit":"👕","lot":"🏞️","rag":"🧽","wag":"🐕","fed":"🍼","peg":"📎","keg":"🛢️","lid":"🫙","hid":"🙈","big":"🐘","tip":"👆","dim":"🔅","rim":"⭕","slim":"🧍","stuck":"🚧","chin":"🧔","much":"➕","chop":"🔪","thin":"📄","thick":"📚","this":"👇","that":"👉","these":"👇","those":"👉","them":"👥","then":"⏭️","there":"👉","tank":"🚰","back":"🔙","pick":"☝️","nephew":"👦","spot":"🔴","skin":"✋","flat":"➖","went":"🚶","line":"〰️","rule":"📜","stay":"🏠","way":"🛣️","show":"🎭","tight":"🤏","tried":"💪","dried":"☀️","boil":"♨️","join":"🤝","out":"🚪","now":"⏰","short":"🩳","born":"👶","her":"👩","pair":"🧦","near":"📍","clear":"💎","year":"🗓️","fear":"😨","played":"⚽","want":"🙋","wanted":"🙋","playing":"🤸","making":"🛠️","smaller":"🔽","smallest":"🐜","bigger":"🔼","biggest":"🐋","taller":"🦒","unkind":"😠","unfair":"⚖️","unsafe":"⚠️","reread":"📖","use":"🖐️","have":"🎁","come":"👋","some":"🍬","break":"☕","English":"🔤","Tom":"👦","Hong Kong":"🇭🇰","share":"🍰","far":"🔭","inside":"📦","outside":"🌳","today":"📅","tomorrow":"🌅","yesterday":"🌙","weekend":"🎉"};
const R37_EMO={aim:'🎯',hen:'🐔',nut:'🥜',tap:'🚰',bird:'🐦',burn:'🔥',dawn:'🌅',feed:'🍼',gift:'🎁',half:'🌗',knit:'🧶',look:'👀',sale:'🏷️',soft:'🧸',vest:'🦺',yawn:'🥱',bacon:'🥓',chips:'🍟',count:'🔢',easel:'🎨',guess:'🤔',kayak:'🛶',relay:'🏃',nurse:'🧑‍⚕️',shape:'🔷',stove:'🍳',thumb:'👍',weigh:'⚖️',afraid:'😨',ban:'🚫',chilli:'🌶️',meadow:'🌾',napkin:'🧻',puddle:'💧',risk:'⚠️',tailor:'🧵',writer:'✍️',cabbage:'🥬',holiday:'🏖️',picture:'🖼️',scooter:'🛴',trouble:'😣',receive:'📥',asteroid:'☄️',dumpling:'🥟',lemonade:'🍋',omelette:'🍳',reindeer:'🦌',system:'⚙️',tense:'😬',whirl:'🌀',celebrate:'🎉',encourage:'📣',principal:'🧑‍🏫',resort:'🏝️',tablespoon:'🥄',language:'🗣️',protection:'🛡️',soloist:'🎤',handout:'📄',imitate:'🦜',allergic:'🤧',equipment:'🧰',information:'ℹ️',medieval:'🏰',pathogen:'🦠',relieved:'😌',retailer:'🏪',amphibian:'🐸',supermarket:'🛒',diagnosis:'🩺',interface:'💻',concentrate:'🧠',enterprise:'🏢',disagreement:'🙅',successfully:'🏆',pessimistic:'😞',imaginative:'💭',honest:'😇',little:'🤏',debt:'💸',event:'📅',produce:'🏭',adjust:'🎛️',impact:'💥',permit:'✅',assess:'📝',complex:'🧩',quality:'⭐',severe:'⛈️',mean:'💬',past:'⏪',pour:'🫗',term:'🏫',crutch:'🩼',square:'⛲',turnip:'🥔',ceiling:'🏠',issue:'❓',mostly:'📊',squeeze:'🍋',colander:'🥣',fault:'🌍',denote:'👉',funnel:'🔻',kidney:'🫘',newton:'🍎',solute:'🧂',tackle:'💪',vertex:'🔺',anaemia:'🩸',concede:'🤝',convert:'🔄',deprive:'🚫',excerpt:'📑',pension:'👴',relieve:'😌',unlikely:'🙅',cauliflower:'🥦',compound:'⚗️',digitise:'💾',hardship:'😣',workload:'📚',bandwidth:'📶',encounter:'👋',fieldwork:'🧭',mandatory:'❗',perimeter:'📐',reference:'📖',undertake:'📋',withstand:'🛡️',capability:'🦾',decorative:'🎀',generosity:'💝',livelihood:'💼',persuasive:'🗣️',proportion:'🥧',surrounding:'🏞️',behavioural:'🙋',controversy:'⚡',credibility:'✅',prospective:'🔭',unavoidable:'⛔',reproduction:'🐣',irresistible:'🍩'};
let r37ImgMap=null;
function r37UnitEmoji(en){if(!r37ImgMap){r37ImgMap={};try{for(const x of LIB30.words.values())if(x.image&&/^[0-9a-f-]+$/.test(x.image))r37ImgMap[x.form]=String.fromCodePoint(...x.image.split('-').map(h=>parseInt(h,16)));}catch(_){}}return r37ImgMap[en]||'';}
/* T14: function / abstract words get no picture (a wrong picture is a wrong anchor); a few unit pictures are replaced; unit picture beats dictionary */
const R37_NOPIC=new Set(['mat','short','high','much','tip','pop','lot','get','went','them','her','this','that','these','those','there','then','the','a','an','is','are','was','were','be','been','am','do','does','did','have','has','had','will','would','could','shall','should','may','might','must','of','to','in','on','at','by','for','with','from','and','or','but','not','no','yes','if','so','as','it','he','she','we','you','they','me','him','us','my','your','his','its','our','their','who','what','when','where','why','how','which','some','any','all','one','very','too','just','also','more','most','many','such','than','only','even','still','again','here','now','out','up','down','off','over','back','much','lot','get','go','come','make','take','put','let','say','said']);
const R37_EMOFIX={jump:'🦘',jumped:'🦘',play:'⚽',played:'⚽',star:'⭐'};
function r37Emoji(en){
 if(R37_NOPIC.has(en)||R37_NOEMO.has(en))return '';
 if(R37_EMOFIX[en])return R37_EMOFIX[en];
 let d='';try{d=(dictionary[en]&&dictionary[en].emoji)||'';}catch(_){}
 if(d==='🪙'&&!/^(coin|coins|money|gold)$/.test(en))d='';
 return r37UnitEmoji(en)||R37_EMO[en]||R37_UEMO[en]||d||'';
}
/* R3.26: picture slot of a question / study card: the emoji, or '🖼️' as the marker for a drawn card (r37WordArt draws it); games keep r37Emoji */
function r37Pic(en){return r37Emoji(en)||(typeof window.wqImgWord==='function'&&window.wqImgWord(en)?'🖼️':'');}
function r37Scaffold(en,mode){if(mode==='first')return en[0]+' '+[...en].slice(1).map(()=>'＿').join(' ');if(mode==='blanks')return [...en].map(()=>'＿').join(' ');return '';}

/* ---- question builders: every question is {mode:'mcq'|'fill', kind, prompt, sub, emoji, options, answer, accept, audio, hint, explain, scaffold, word} ---- */
/* one English question for word wd of the given kind: zh2en | en2zh | listen (choice), fill | fill-listen (typed) */
function r37EnBuild(wd,kind,c){
 const D=c.D,rng=c.rng,emoji=R37_NOEMO.has(wd.en)?'':r37Pic(wd.en),ck=c.ck;
 const syn=r37Syns(wd.en),forms=r37FormMates(wd.en),zhShort=r37ZhKey(wd.zh);
 if(kind==='fill'||kind==='fill-listen'){
  const listen=kind==='fill-listen';
  return {mode:'fill',kind,prompt:listen?'🔊':wd.zh,emoji:listen?'':emoji,answer:wd.en,accept:[wd.en,...syn],syn,forms,zhOf:wd.zh,audio:wd.en,autoPlay:listen,scaffold:r37Scaffold(wd.en,D.scaffold),hint:'提示：第一個字母是 '+wd.en[0]+'，一共 '+wd.en.length+' 個字母。',explain:wd.zh+' = '+wd.en,word:wd.en,len:wd.en.length,cs:/[A-Z]/.test(wd.en),ck};
 }
 const nOpt=D.opts-1,seenZ=new Set([r37ZhKey(wd.zh)]),seenE=new Set([wd.en]),ds=[];
 const bad=new Set([...syn,...forms]);for(const x of r37EnDistractors(wd,c.near,nOpt+3,D.n===1?'soft':true,rng,c.unit,kind,bad)){if(ds.length>=nOpt)break;if(seenZ.has(r37ZhKey(x.zh))||seenE.has(x.en))continue;seenZ.add(r37ZhKey(x.zh));seenE.add(x.en);ds.push(x);}
 const opts=r37Shuf([wd,...ds],rng),info={};
 const q={mode:'mcq',kind,answer:wd.en,audio:wd.en,word:wd.en,ck,zhOf:wd.zh};
 if(kind==='zh2en'){opts.forEach(o=>{info[o.en]=o.zh;});return Object.assign(q,{prompt:wd.zh,emoji,options:opts.map(o=>o.en),hint:'提示：第一個字母是 '+wd.en[0]+'，一共 '+wd.en.length+' 個字母。',explain:wd.zh+' = '+wd.en,lang:'en',info});}
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
  if(!seen.has(key)){seen.add(key);q.lw=w;q.ls=s;out.push(q);}
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
  if(q.cs&&v.replace(/\s+/g,' ').trim()!==a.replace(/\s+/g,' ').trim())return {ok:false,why:'case',msg:'字對了，留意大小寫'};
  return {ok:true};
 }
 const hit=(q.accept||[]).find(x=>norm(r37Apos(x))===nv);
 if(hit)return hit===q.answer?{ok:true}:{ok:true,syn:hit};
 if(!q.dz&&(q.forms||[]).some(x=>norm(r37Apos(x))===nv))return {ok:false,why:'inflect',msg:`「${v.trim()}」字對了，但形式不對：留意單數／複數或時態，再試一次`};
 const strip=x=>norm(x).replace(/[\s-]+/g,'');
 if((!q.dz||q.dz.lvl===3)&&strip(a)&&strip(v)===strip(a))return {ok:false,why:'space',msg:'字對了，注意空格／連字號'};
 return {ok:false,why:'wrong'};
}
function r37Check(q,input){return r37Judge(q,input).ok;}
