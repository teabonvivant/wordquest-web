/* R3.39 到期重溫: a word or maths skill missed in 闖關, 測驗 or a game comes back the next day; each independent right answer pushes it out (3, then 7 days) and the third one retires it.
 * A wrong answer starts the word again from tomorrow. A right answer after a hint keeps its stage and comes back tomorrow. Olympiad is left out: its figures do not regenerate by skill. */
const R39_GAPS=[1,3,7],R39_MAX=60,R39_SESSION=8;
function r39Plus(n){const t=new Date(r37Day()+'T12:00:00Z');t.setUTCDate(t.getUTCDate()+n);return t.toISOString().slice(0,10);}
function r39Enrol(e){
 const o=r37Get(),i=o.rv.findIndex(x=>x.k===e.k),due=r39Plus(R39_GAPS[0]);
 if(i>=0)Object.assign(o.rv[i],{st:0,due,w:e.w,s:e.s});
 else{o.rv.push({...e,st:0,due});if(o.rv.length>R39_MAX)o.rv.shift();}
}
const r39EnrolWord=(en,zh,w,s)=>r39Enrol({k:'w:'+en,t:'english',en,zh,w,s});
const r39EnrolSkill=(sk,w,s)=>{if(sk)r39Enrol({k:'m:'+w+':'+sk,t:'math',sk,w,s});};
function r39Due(){const d=r37Day();return isLoggedIn()?r37Get().rv.filter(x=>x.due<=d):[];}
function r39Pass(k,assisted){
 const o=r37Get(),i=o.rv.findIndex(x=>x.k===k);if(i<0)return;
 const e=o.rv[i];
 if(assisted)e.due=r39Plus(1);
 else if(e.st>=R39_GAPS.length-1){
  o.rv.splice(i,1);
  if(e.t==='english')o.wrong=o.wrong.filter(x=>x.en!==e.en);
  else o.miss=o.miss.filter(m=>!(m.t==='math'&&m.w===e.w&&m.sk===e.sk));
 }else{e.st++;e.due=r39Plus(R39_GAPS[e.st]);}
 r37Save();
}
function r39Question(e,diff,seed){
 const rng=r37Rng(r37Hash('rv|'+e.k+'|'+seed));
 if(e.t==='english'){
  const wd=r37Lookup(e.w,e.s,e.en);if(!wd)return null;
  const D=R37_DIFF[diff-1],wp=r37EnWorldPool(e.w),near=wp.length>20?wp:r37EnPool();
  const q=r37EnBuild(wd,e.st===1?'fill-listen':'fill',{D,rng,near,unit:r37UnitOf(e.w,wd)||r37EnStage(e.w,e.s)});
  delete q.ck;q.rv=e.k;q.lw=e.w;q.ls=e.s;return q;
 }
 if(!globalThis.WQ37Math)return null;
 for(let n=0;n<12;n++){
  const c=WQ37Math.make('math',e.w,e.s,6,diff,(r37Hash('rv'+n+'|'+e.k+'|'+seed)>>>1)).find(x=>x.skill===e.sk);
  if(c)return {mode:c.mode,kind:'math',prompt:c.q,options:c.options,answer:c.answer,accept:c.accept,hint:c.hint,explain:c.explain,skill:c.skill,mq:c,rv:e.k,lw:e.w,ls:e.s};
 }
 return null;
}
function r39Start(){
 const all=r39Due(),track=all.some(x=>x.t==='english')?'english':'math',diff=r37DiffN(track),seed=r37Mem._seed!==undefined?r37Mem._seed:(Date.now()&0xfffff),o=r37Get(),qs=[];
 for(const e of all.filter(x=>x.t===track)){
  const q=r39Question(e,diff,seed);
  if(q)qs.push(q);else o.rv=o.rv.filter(x=>x.k!==e.k);/* the word or skill is no longer in the course */
  if(qs.length>=R39_SESSION)break;
 }
 r37Save();
 if(!qs.length){if(r39Due().length)return r39Start();toast('今日要溫的都完成了。');r37Nav37('kid');return;}
 r37P={kind:'quiz',key:r37Key(),track,mode:'due',diff,qs,i:0,res:[],hearts:99,maxHearts:0,shield:false,correct:0,hinted:0,phase:'quiz',fb:null,hintShown:false,title:'今日要溫',praise:'答對了！',log:[],miss:{},nq0:qs.length,nudge:null};
 r37Nav37('lp/play');
}
/* R3.39 backup: the level map, wrong lists, characters and review dates live under one wq37- key per child, outside db. They travel inside the sealed backup and are merged on restore, so nothing already earned on this device is lost. */
const r39KeyOf=cid=>'wq37-'+(WQ_TEST_MODE?'t-':'')+accountId()+'-'+cid;
const r39Read=k=>{try{const o=r37Mem[k]||JSON.parse(localStorage.getItem(k)||'null');return o&&typeof o==='object'&&!Array.isArray(o)?o:null;}catch(_){return null;}};
function r39BackupAdd(checked){
 const p={};for(const c of checked.children){const o=r39Read(r39KeyOf(c.id));if(o)p[c.id]=o;}
 return {...checked,r39Progress:JSON.parse(JSON.stringify(p))};
}
function r39Merge(a,b){
 const m={...b,...a},isO=x=>x&&typeof x==='object'&&!Array.isArray(x),lv={...(a.lv||{})};
 for(const [k,e] of Object.entries(isO(b.lv)?b.lv:{})){
  if(!/^[\w:-]+$/.test(k)||!isO(e)||(k.startsWith('english:')&&b.enV!==2)||(k.startsWith('olympiad:')&&b.olyV!==2))continue;
  const x=lv[k];lv[k]=x?{...e,...x,best:Math.max(x.best||0,e.best||0),passed:!!(x.passed||e.passed),five:!!(x.five||e.five)}:e;
 }
 m.lv=lv;
 const uni=(p,q,key)=>{const seen=new Set(),out=[];for(const x of [...(Array.isArray(p)?p:[]),...(Array.isArray(q)?q:[])]){const k=key(x);if(!seen.has(k)){seen.add(k);out.push(x);}}return out.slice(-60);};
 m.wrong=uni(a.wrong,b.wrong,x=>x.en);m.miss=uni(a.miss,b.miss,x=>x.t+'|'+x.q);m.rv=uni(a.rv,b.rv,x=>x.k);
 m.chars=[...new Set([...(a.chars||[]),...(b.chars||[])])];
 if(isO(a.oly)||isO(b.oly))m.oly={...(b.oly||{}),...(a.oly||{}),seen:{...(b.oly?.seen||{}),...(a.oly?.seen||{})}};
 m.enV=2;m.olyV=2;m.rvV=1;
 delete m.day;if(a.day)m.day=a.day;/* the daily coin cap and missions are never rewound */
 return m;
}
function r39BackupApply(raw){
 const p=raw&&raw.r39Progress;if(!p||typeof p!=='object'||Array.isArray(p))return;
 for(const c of db.children){
  const b=p[c.id];if(!b||typeof b!=='object'||Array.isArray(b))continue;
  const k=r39KeyOf(c.id),a=r39Read(k);
  const{day,...fresh}=b;
  localStorage.setItem(k,JSON.stringify(a?r39Merge(a,b):fresh));delete r37Mem[k];
 }
}
