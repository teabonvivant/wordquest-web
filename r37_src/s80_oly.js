/* R3.23 s80 - 奧數路線 UI: planet hub, grade star-path maps, picture-card lesson player, strategy cards, wrong book.
   Units live in r37_src/oly (WQOly registry + WQOlyWidgets tools). Level play itself stays in the shared level engine (r37StartLevel / r37Play / r37Finish);
   the 'olympiad' track = 6 grade worlds x 10 stages, stage 2k = unit k+1 level A, stage 2k+1 = unit k+1 level B.
   No voice anywhere in here (no speech buttons, no TTS calls). Everything animated honours prefers-reduced-motion (r37Calm). */
const r80Units=()=>globalThis.WQOly?WQOly.order.map(id=>WQOly.units[id]):[];
const r80Unit=(g,n)=>globalThis.WQOly&&WQOly.units['p'+g+'-'+n]||null;
const r80Grade=g=>WQOly.grades[g-1];
const r80O=()=>{const o=r37Get();if(!o.oly||typeof o.oly!=='object')o.oly={seen:{},last:''};return o.oly;};
const r80Seen=id=>!!r80O().seen[id];
const r80Passed=(g,n,lv)=>!!r37Entry('olympiad',g-1,2*(n-1)+lv)?.passed;
const r80UnitOpen=(g,n)=>adminUnlocks()||n===1||r80Passed(g,n-1,0);
/* the shared stage lock (r37StageOpen) for the olympiad track: A needs the unit open + its lesson seen; B needs A; a unit opens when the previous unit's A is passed; any grade may be entered */
function r80StageOpen(w,s){
 if(adminUnlocks())return true;
 const g=w+1,n=(s>>1)+1,u=r80Unit(g,n);if(!u)return false;
 if(s&1)return r80Passed(g,n,0);
 return r80UnitOpen(g,n)&&(r80Seen(u.id)||r80Passed(g,n,0));
}
function r80Mark(id){const o=r80O();if(!o.seen[id]){o.seen[id]=Date.now();}o.last=id;r37Save();}
const r80Sfx=(n,o)=>{try{if(!sfxEnabled())return;(r80Sfx.a=r80Sfx.a||WQ37GX.audio(true)).sfx(n,o);}catch(_){}};
const r80Esc=s=>esc(String(s==null?'':s));
function r80Collected(){return r80Units().filter(u=>r80Passed(u.grade,u.n,1));}
function r80GradeStat(g){const us=WQOly.unitsOf(g);return {done:us.filter(u=>r80Passed(g,u.n,1)).length,aDone:us.filter(u=>r80Passed(g,u.n,0)).length,total:us.length};}
/* where "繼續" goes: the first unfinished unit at or after the one touched last */
function r80Next(){
 const us=r80Units(),last=r80O().last;let from=Math.max(0,us.findIndex(u=>u.id===last));
 let pick=null;
 for(let k=0;k<us.length&&!pick;k++){const u=us[(from+k)%us.length];if(!r80Passed(u.grade,u.n,1)&&r80UnitOpen(u.grade,u.n))pick=u;}
 if(!pick)return {u:us[0],kind:'learn',done:true};
 const kind=!r80Seen(pick.id)&&!r80Passed(pick.grade,pick.n,0)?'learn':!r80Passed(pick.grade,pick.n,0)?'A':'B';
 return {u:pick,kind,done:false};
}
const r80Label=x=>x.kind==='learn'?'圖解課':x.kind==='A'?'闖關 ①':'闖關 ②';
const r80WrongList=()=>{const by={};for(const m of r37Get().miss){if(m.t!=='olympiad')continue;const k=m.q;const b=by[k]=by[k]||{q:m.q,a:m.a,n:0,at:0,sk:m.sk};b.n++;b.at=Math.max(b.at,m.at||0);}return Object.values(by).sort((a,b)=>b.at-a.at);};
const r80UnitOfSk=sk=>{const m=/^(p\d-\d):/.exec(sk||'');return m&&globalThis.WQOly?WQOly.units[m[1]]:null;};

/* ---------------------------------------------------------------------------------------------- strategy card */
function r80ArtDefault(u){return `<svg viewBox="0 0 120 80" aria-hidden="true"><circle cx="60" cy="40" r="30" fill="rgba(255,255,255,.08)"/><text x="60" y="42" text-anchor="middle" dominant-baseline="central" font-size="40">${esc(u.icon)}</text></svg>`;}
function r80CardHTML(u,own,cls=''){
 const g=r80Grade(u.grade);
 if(!own)return `<div class="r80-card lock ${cls}" style="--h:${g.hue}" role="img" aria-label="未收集的策略卡：${g.name}第 ${u.n} 單元"><div class="r80-ca"><span class="r80-sil" data-i="${esc(u.icon)}"></span></div><b class="r80-cm">？？？</b><small class="r80-cl">${g.name} · 第 ${u.n} 單元</small></div>`;
 return `<div class="r80-card ${cls}" style="--h:${g.hue}"><span class="r80-cn">${g.name} · ${u.n}</span><div class="r80-ca">${u.card.art||r80ArtDefault(u)}</div><b class="r80-ct">${r80Esc(u.title)}</b><b class="r80-cm">${r80Esc(u.card.motto)}</b><small class="r80-ce">${r80Esc(u.card.example)}</small></div>`;
}
/* ---------------------------------------------------------------------------------------------- hub */
function r80Hub(){
 const nx=r80Next(),col=r80Collected().length,wr=r80WrongList().length;
 const tiles=WQOly.grades.map(g=>{const st=r80GradeStat(g.n);
  return `<a class="r80-g" href="#oly/${g.n}" style="--h:${g.hue}" data-g="${g.n}" aria-label="${g.name}，已收集 ${st.done} 張策略卡，共 ${st.total} 張"><span class="r80-gi" aria-hidden="true">${r37Icon(g.icon)}</span><span class="r80-gt"><b>${g.name}</b><small>${esc(g.theme)}</small><span class="r80-pips" aria-hidden="true">${Array.from({length:st.total},(_,i)=>`<i class="${i<st.done?'on':i<st.aDone?'half':''}"></i>`).join('')}</span></span><em>${st.done}/${st.total}</em></a>`;}).join('');
 const href=nx.kind==='learn'?`#oly/${nx.u.grade}/${nx.u.n}/learn`:`#oly/${nx.u.grade}`;
 const cont=`<a class="r80-cont r80-go" href="${href}" data-r80="cont" data-g="${nx.u.grade}" data-n="${nx.u.n}" data-kind="${nx.kind}"><span class="r80-ci" aria-hidden="true">${r37Icon('▶')}</span><span class="r80-ctx"><b>繼續</b><small>${r80Grade(nx.u.grade).name} · ${r80Esc(nx.u.title)} · ${r80Label(nx)}</small></span></a>`;
 return `<section class="r37-hub r80-hub" data-pl="olympiad" style="--h:272">${r37Top()}
 <div class="r80-hm"><div class="r80-hd"><h1>奧數星</h1><span class="r80-hs">${col}/30 張策略卡</span></div>
 <div class="r80-grades" role="list">${tiles}</div>
 <div class="r80-side">${cont}<div class="r80-two"><a class="r80-sec" href="#oly/cards" data-r80="cards"><span aria-hidden="true">${r37Icon('🃏')}</span><b>策略卡</b><em>${col}/30</em></a><a class="r80-sec" href="#oly/wrong" data-r80="wrong"><span aria-hidden="true">${r37Icon('📝')}</span><b>錯題</b><em>${wr}</em></a></div></div></div>
 ${r37Nav('p/olympiad')}</section>`;
}
/* ---------------------------------------------------------------------------------------------- grade map */
function r80Map(g){
 r37Mem._og=g;
 const G=r80Grade(g),us=WQOly.unitsOf(g),st=r80GradeStat(g),diff=r37Diff('olympiad');
 const cur=us.find(u=>!r80Passed(g,u.n,1)&&r80UnitOpen(g,u.n));
 const tabs=WQOly.grades.map(x=>`<a class="r80-gtab ${x.n===g?'on':''}" href="#oly/${x.n}" style="--h:${x.hue}" ${x.n===g?'aria-current="page"':''}><span aria-hidden="true">${r37Icon(x.icon)}</span><b>${x.name}</b></a>`).join('');
 const isles=us.map((u,i)=>{
  const open=r80UnitOpen(g,u.n),seen=r80Seen(u.id)||r80Passed(g,u.n,0),pa=r80Passed(g,u.n,0),pb=r80Passed(g,u.n,1),isCur=cur&&cur.id===u.id;
  const w=g-1,sa=2*(u.n-1),eA=r37Entry('olympiad',w,sa),eB=r37Entry('olympiad',w,sa+1);
  const nd=(cls,inner,attrs,label)=>`<${attrs.startsWith('href')?'a':'button type="button"'} class="r80-nd ${cls}" ${attrs} aria-label="${label}"><span>${inner}</span></${attrs.startsWith('href')?'a':'button'}>`;
  const nodes=[
   nd(`learn ${seen?'done':''} ${isCur&&!seen?'cur':''}`,r37Icon('📖'),`href="#oly/${g}/${u.n}/learn"`,`${u.title}：圖解課${seen?'（已看）':''}`),
   nd(`lv ${pa?'done':''} ${r80StageOpen(w,sa)?'':'lock'} ${isCur&&seen&&!pa?'cur':''}`,r80StageOpen(w,sa)?'①':r37Icon('🔒'),r80StageOpen(w,sa)?`data-r37="level" data-track="olympiad" data-w="${w}" data-s="${sa}"`:'disabled',`${u.title}：闖關 ①${pa?'（已過關）':r80StageOpen(w,sa)?'':'（未開放）'}`),
   nd(`lv ${pb?'done':''} ${r80StageOpen(w,sa+1)?'':'lock'} ${isCur&&pa&&!pb?'cur':''}`,r80StageOpen(w,sa+1)?'②':r37Icon('🔒'),r80StageOpen(w,sa+1)?`data-r37="level" data-track="olympiad" data-w="${w}" data-s="${sa+1}"`:'disabled',`${u.title}：闖關 ②${pb?'（已過關）':r80StageOpen(w,sa+1)?'':'（未開放）'}`),
   nd(`card ${pb?'done':'lock'}`,pb?r37Icon('🃏'):r37Icon('🔒'),pb?`href="#oly/cards?u=${u.id}"`:'disabled',`${u.title}：策略卡${pb?'':'（過關 ② 後得到）'}`)
  ].join('');
  const stars=`<span class="r80-isst" aria-hidden="true">${[eA,eB].map(e=>`<i class="${e&&e.passed?'on':''}">${r37Icon('⭐')}</i>`).join('')}</span>`;
  return `<article class="r80-isle ${pb?'done':''} ${isCur?'cur':''} ${open?'':'closed'}" data-n="${u.n}"><a class="r80-cov" href="#oly/${g}/${u.n}/learn" tabindex="-1" aria-hidden="true"><span class="r80-cf" data-i="${esc(u.icon)}"></span><img src="${esc(u.cover)}" alt="" width="160" height="160" loading="lazy" decoding="async" draggable="false" onerror="this.remove()"></a><div class="r80-ib"><b class="r80-un">${u.n}. ${r80Esc(u.title)}${u.draft?'<i class="r80-draft">草稿</i>':''}</b><small class="r80-im">${r80Esc(u.card.motto)}</small><div class="r80-nodes">${nodes}</div></div>${stars}</article>`;
 }).join('');
 return `<section class="r37-hub r80-map" data-g="${g}" style="--h:${G.hue}">${r37Top('<a class="r37-back2" href="#p/olympiad" aria-label="奧數星">←</a>')}
 <nav class="r80-gtabs" aria-label="年級">${tabs}</nav>
 <div class="r80-gtitle"><span class="r80-gic" aria-hidden="true">${r37Icon(G.icon)}</span><div><h1>${G.name}奧數</h1><small>${st.done}/${st.total} 張策略卡 · ${esc(G.theme)}</small></div><span class="r37-dchip" title="難度">${r37Icon(diff.icon)}${diff.n}</span></div>
 <div class="r80-isles"><svg class="r80-trail" aria-hidden="true" focusable="false"></svg>${isles}</div>
 ${r37Nav('p/olympiad')}</section>`;
}
/* a winding dashed star path from island to island (centre of each cover), re-measured after every render / resize */
function r80DrawTrail(){
 const box=document.querySelector('.r80-isles');if(!box)return;
 const sv=box.querySelector(':scope>.r80-trail');if(!sv)return;
 const W=box.scrollWidth,H=box.scrollHeight,bx=box.getBoundingClientRect(),sx=box.scrollLeft,sy=box.scrollTop;
 sv.setAttribute('viewBox',`0 0 ${W} ${H}`);sv.style.width=W+'px';sv.style.height=H+'px';
 const cs=[...box.querySelectorAll('.r80-cov')].map(c=>{const r=c.getBoundingClientRect();return [r.left-bx.left+sx+r.width/2,r.top-bx.top+sy+r.height/2];});
 const done=[...box.querySelectorAll('.r80-isle')].map(e=>e.classList.contains('done'));
 let d='';sv.innerHTML='';
 for(let i=0;i<cs.length-1;i++){
  const a=cs[i],b=cs[i+1],dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len,bul=Math.min(46,len*.28)*(i%2?-1:1);
  const p=document.createElementNS('http://www.w3.org/2000/svg','path');
  p.setAttribute('d',`M${a[0].toFixed(1)} ${a[1].toFixed(1)}C${(a[0]+dx/3+nx*bul).toFixed(1)} ${(a[1]+dy/3+ny*bul).toFixed(1)} ${(a[0]+dx*2/3-nx*bul).toFixed(1)} ${(a[1]+dy*2/3-ny*bul).toFixed(1)} ${b[0].toFixed(1)} ${b[1].toFixed(1)}`);
  if(done[i])p.setAttribute('class','lit');sv.appendChild(p);
 }
}
/* ---------------------------------------------------------------------------------------------- strategy cards page + wrong book */
function r80Cards(){
 const q=new URLSearchParams((location.hash.split('?')[1]||'')),one=q.get('u'),U=one&&WQOly.units[one];
 if(U&&r80Passed(U.grade,U.n,1)){
  return `<section class="r37-hub r80-cards one" style="--h:${r80Grade(U.grade).hue}">${r37Top('<a class="r37-back2" href="#oly/cards" aria-label="策略卡">←</a>')}<div class="r80-bigc">${r80CardHTML(U,true,'big')}<div class="r80-bigact"><a class="r80-sec" href="#oly/${U.grade}/${U.n}/learn"><span aria-hidden="true">${r37Icon('📖')}</span><b>看課堂</b></a></div></div>${r37Nav('p/olympiad')}</section>`;
 }
 const body=WQOly.grades.map(g=>{const us=WQOly.unitsOf(g.n),n=us.filter(u=>r80Passed(g.n,u.n,1)).length;
  return `<section class="r80-cg" style="--h:${g.hue}"><h2><span aria-hidden="true">${r37Icon(g.icon)}</span>${g.name}<em>${n}/${us.length}</em></h2><div class="r80-crow">${us.map(u=>{const own=r80Passed(g.n,u.n,1);return own?`<a class="r80-cw" href="#oly/cards?u=${u.id}" aria-label="${r80Esc(u.title)}策略卡">${r80CardHTML(u,true)}</a>`:`<div class="r80-cw">${r80CardHTML(u,false)}</div>`;}).join('')}</div></section>`;}).join('');
 return `<section class="r37-hub r80-cards" style="--h:272">${r37Top('<a class="r37-back2" href="#p/olympiad" aria-label="奧數星">←</a>')}<div class="r80-hd2"><h1>我的策略卡</h1><span class="r80-hs">${r80Collected().length}/30</span></div><div class="r80-cbody">${body}</div>${r37Nav('p/olympiad')}</section>`;
}
function r80Wrong(){
 const list=r80WrongList(),by={};
 for(const x of list){const u=r80UnitOfSk(x.sk),k=u?u.id:'?';(by[k]=by[k]||{u,items:[]}).items.push(x);}
 const groups=Object.values(by).map(gr=>{const u=gr.u;
  return `<section class="r80-wg"><header><span class="r80-wi" aria-hidden="true" data-i="${u?esc(u.icon):'🧩'}"></span><b>${u?`${r80Grade(u.grade).name} · ${r80Esc(u.title)}`:'其他'}</b>${u?`<a class="r80-sec sm" href="#oly/${u.grade}/${u.n}/learn" data-r80="wrong-lesson">${r37Icon('📖')} 看課堂</a>`:''}</header><ul>${gr.items.map(x=>`<li><span class="r319-q">${r80Esc(x.q)}</span><span class="r319-a">答案：<b>${r80Esc(x.a)}</b></span><em>${x.n} 次</em></li>`).join('')}</ul></section>`;}).join('');
 return `<section class="r37-hub r80-wrong" style="--h:272">${r37Top('<a class="r37-back2" href="#p/olympiad" aria-label="奧數星">←</a>')}<div class="r80-hd2"><h1>錯題</h1><span class="r80-hs">${list.length} 題</span></div><div class="r80-cbody">${list.length?groups:'<p class="r80-empty">暫時沒有奧數錯題，真棒！</p>'}</div>${r37Nav('p/olympiad')}</section>`;
}
/* ---------------------------------------------------------------------------------------------- lesson player */
let r80L=null;
function r80LessonShell(g,n){return `<section class="r37-play r80-les" id="r80-les" data-g="${g}" data-n="${n}" style="--h:${r80Grade(g).hue}"></section>`;}
function r80LesStart(g,n){
 const u=r80Unit(g,n);if(!u){location.replace('#oly/'+g);return;}
 if(r80L&&r80L.w){try{r80L.w.destroy();}catch(_){}}
 const q=new URLSearchParams((location.hash.split('?')[1]||'')),c=Math.max(0,Math.min(u.lesson.length-1,(+q.get('c')||1)-1));
 r80L={g,n,u,i:c,st:u.lesson.map(()=>({})),w:null};
 r80O().last=u.id;r37Save();
 r80LesDraw();
}
function r80LesCard(){return r80L.u.lesson[r80L.i];}
function r80LesDraw(){
 const L=r80L,root=document.getElementById('r80-les');if(!L||!root)return;
 if(L.w){try{L.w.destroy();}catch(_){}L.w=null;}
 const u=L.u,c=r80LesCard(),S=L.st[L.i],last=L.i===u.lesson.length-1,calm=r37Calm();
 const dots=u.lesson.map((_,k)=>`<i class="${k<L.i?'done':k===L.i?'on':''}"></i>`).join('');
 const gate=c.t==='predict'||c.t==='do'||c.t==='try';
 const needs=gate&&!S.done;
 let side='',scene='';
 if(c.t==='card'){scene=`<div class="r80-cardwrap">${r80CardHTML(u,true,'show')}</div>`;}
 else if(c.t==='try'&&!c.scene){scene=`<div class="r80-trystem"><p class="r80-stem">${r80Esc(c.q.stem)}</p>${c.q.svg?`<div class="r80-fig">${c.q.svg}</div>`:''}</div>`;}
 else scene=`<div class="r80-wbox" id="r80-wbox"></div>`;
 const say=c.t==='card'?(c.say||'做完闖關 ②，這張卡就是你的！'):(c.say||'');
 let tools='';
 if(c.t==='show'&&c.scene&&c.scene.w!=='banner')tools=`<button type="button" class="r80-tool" data-r80="replay" aria-label="重播動畫"><span aria-hidden="true">↻</span><b>重播</b></button>`;
 if(c.t==='do')tools=`<button type="button" class="r80-tool" data-r80="demo" aria-label="示範一次"><span aria-hidden="true">▶</span><b>示範一次</b></button><button type="button" class="r80-tool" data-r80="reset" aria-label="重來"><span aria-hidden="true">↺</span><b>重來</b></button>`;
 if(c.t==='predict'){
  side=`${c.ask?`<p class="r80-ask">${r80Esc(c.ask)}</p>`:''}<div class="r80-opts n${c.options.length}" role="group" aria-label="選擇答案">${c.options.map((o,k)=>`<button type="button" class="r80-opt ${S.picked===k?(String(o)===String(c.answer)?'ok':'miss'):(S.done&&String(o)===String(c.answer)?'ok':'')}" data-r80="predict" data-k="${k}" ${S.done?'disabled':''}>${r80Esc(o)}</button>`).join('')}</div>`;
 }else if(c.t==='try'){
  const q=c.q;
  side=`${c.scene?`<p class="r80-ask">${r80Esc(q.stem)}</p>`:''}${q.options?`<div class="r80-opts n${q.options.length}" role="group" aria-label="選擇答案">${q.options.map((o,k)=>`<button type="button" class="r80-opt ${S.done&&String(o)===String(q.answer)?'ok':S.bad&&S.bad.includes(String(o))?'miss':''}" data-r80="try" data-v="${r80Esc(o)}" ${S.done||(S.bad&&S.bad.includes(String(o)))?'disabled':''}>${r80Esc(o)}</button>`).join('')}</div>`:`<form class="r80-fill" data-r80-form="1"><input id="r80-in" type="text" inputmode="decimal" autocomplete="off" aria-label="答案" placeholder="答案" ${S.done?'disabled':''}><button type="submit" class="r80-ok" ${S.done?'disabled':''}>確定</button></form>`}`;
 }
 const sayHtml=S.msg!==undefined?S.msg:r80Esc(say);
 root.innerHTML=`<header class="r80-lh"><button type="button" class="r80-x" data-r80="close" aria-label="離開課堂">${r37Icon('✕')}</button><div class="r80-dots" role="progressbar" aria-label="課堂進度" aria-valuemin="1" aria-valuemax="${u.lesson.length}" aria-valuenow="${L.i+1}">${dots}</div>${last?'':`<button type="button" class="r80-skip" data-r80="skip"><span aria-hidden="true">${r37Icon('▶')}</span><b>我懂了，直接闖關</b></button>`}</header>
 <div class="r80-lb"><div class="r80-scene ${c.t}">${scene}</div><div class="r80-sd"><p class="r80-say ${S.bad&&S.bad.length&&!S.done?'bad':''}" id="r80-say" role="status" aria-live="polite">${sayHtml}</p>${side}${tools?`<div class="r80-tools">${tools}</div>`:''}</div></div>
 <footer class="r80-lf"><button type="button" class="r80-prev" data-r80="prev" aria-label="上一步" ${L.i?'':'disabled'}><span aria-hidden="true">←</span><b>上一步</b></button><button type="button" class="r80-next ${needs?'':'lit'}" data-r80="next" id="r80-next" ${needs?'disabled aria-disabled="true"':''}><b>${last?'去闖關':'下一步'}</b><span aria-hidden="true">→</span></button></footer>`;
 r80LesWidget();
 if(last)r80Mark(u.id);
 r80Focus();
}
function r80Focus(){const b=document.getElementById('r80-next');if(b&&!b.disabled){}}
function r80LesWidget(){
 const L=r80L,c=r80LesCard(),box=document.getElementById('r80-wbox');if(!box||!c.scene)return;
 const S=L.st[L.i],still=!!c.scene.still;
 if(c.t==='try'||c.t==='predict'||c.t==='show'||c.t==='do'){
  const mode=c.t==='do'?'do':'show';
  const api={reduced:r37Calm(),sfx:r80Sfx,onChange:()=>r80Changed()};
  try{L.w=WQOlyWidgets.mount(c.scene.w,box,Object.assign({},c.scene.p,{mode}),api);}catch(e){box.innerHTML='<p class="r80-empty">圖片載入不了</p>';return;}
  if(c.t==='show'&&!still)setTimeout(()=>{if(r80L===L&&L.w)L.w.demo();},60);
  if(c.t==='predict'&&S.done&&L.w)L.w.demo();
  if(c.t==='do'&&S.done&&L.w&&L.w.check())r80Changed();
 }
}
function r80Changed(){
 const L=r80L;if(!L)return;const c=r80LesCard(),S=L.st[L.i];
 if(c.t!=='do'||S.done||!L.w)return;
 if(L.w.check()){
  S.done=true;const b=document.getElementById('r80-next'),say=document.getElementById('r80-say');
  if(b){b.disabled=false;b.removeAttribute('aria-disabled');b.classList.add('lit');}
  if(say){say.textContent='做到了！按「下一步」繼續。';S.msg='做到了！按「下一步」繼續。';say.classList.add('ok');}
  r80Sfx('good');
 }
}
function r80LesMove(d){
 const L=r80L;if(!L)return;const n=L.i+d;
 if(n<0)return;
 if(n>=L.u.lesson.length){r80LesGo();return;}
 if(d>0){const c=r80LesCard(),S=L.st[L.i];if((c.t==='predict'||c.t==='do'||c.t==='try')&&!S.done)return;}
 L.i=n;r80Sfx('tap');r80LesDraw();
}
function r80LesGo(){const L=r80L;if(!L)return;r80Mark(L.u.id);const g=L.g,sa=2*(L.n-1);r80L=null;if(r80StageOpen(g-1,sa))r37StartLevel('olympiad',g-1,sa);else location.hash='#oly/'+g;}
function r80LesPredict(k){
 const L=r80L,c=r80LesCard(),S=L.st[L.i];if(S.done)return;
 S.picked=k;S.done=true;const ok=String(c.options[k])===String(c.answer);
 S.msg=`<b class="r80-res ${ok?'ok':'no'}">${ok?'估對了！':'差一點！'}</b> ${r80Esc(c.reveal||'')}`;
 r80Sfx(ok?'good':'tap');
 const w=L.w;r80LesDraw();
}
function r80LesTry(v){
 const L=r80L,c=r80LesCard(),S=L.st[L.i],q=c.q;if(S.done)return;
 v=String(v).trim();if(!v)return;
 const norm=x=>String(x).replace(/\s+/g,'');
 if(norm(v)===norm(q.answer)||(globalThis.WQ37Math&&WQ37Math.check({answer:String(q.answer),accept:q.accept||[]},v))){
  S.done=true;S.msg=`<b class="r80-res ok">答對了！</b> ${r80Esc(q.explain||'')}`;r80Sfx('great');r80LesDraw();
  try{r37Fx.burst(innerWidth/2,innerHeight*.45,22);}catch(_){}
 }else{
  S.bad=(S.bad||[]).concat(String(v));const why=q.why&&q.why[v];
  S.msg=`<span aria-hidden="true">💭</span> ${r80Esc(why||('再想想。'+(q.hint?q.hint:'')))}`;r80Sfx('bad');
  if(S.bad.length>=3&&q.options){S.done=true;S.msg=`答案是 ${r80Esc(q.answer)}。${r80Esc(q.explain||'')}`;}
  r80LesDraw();
  const sc=document.querySelector('.r80-sd');if(sc&&!r37Calm())sc.animate([{transform:'translateX(0)'},{transform:'translateX(-6px)'},{transform:'translateX(6px)'},{transform:'translateX(0)'}],{duration:240});
 }
}
document.addEventListener('click',e=>{
 const el=e.target.closest?.('[data-r80]');if(!el)return;
 const a=el.dataset.r80;
 if(a==='next'){r80LesMove(1);}
 else if(a==='prev'){r80LesMove(-1);}
 else if(a==='close'){const g=r80L?r80L.g:1;r80L=null;location.hash='#oly/'+g;}
 else if(a==='skip'&&r80L){r80L.i=r80L.u.lesson.length-1;r80LesGo();}
 else if(a==='replay'&&r80L&&r80L.w){r80L.w.reset();setTimeout(()=>r80L&&r80L.w&&r80L.w.demo(),40);}
 else if(a==='demo'&&r80L&&r80L.w){r80L.w.demo();}
 else if(a==='reset'&&r80L&&r80L.w){const S=r80L.st[r80L.i];S.done=false;S.msg=undefined;r80L.w.reset();const b=document.getElementById('r80-next');if(b){b.disabled=true;b.setAttribute('aria-disabled','true');b.classList.remove('lit');}const s=document.getElementById('r80-say');if(s){s.classList.remove('ok');s.textContent=r80LesCard().say||'';}}
 else if(a==='predict')r80LesPredict(+el.dataset.k);
 else if(a==='try')r80LesTry(el.dataset.v);
});
document.addEventListener('submit',e=>{if(!e.target.closest?.('[data-r80-form]'))return;e.preventDefault();const i=document.getElementById('r80-in');if(i)r80LesTry(i.value);});
document.addEventListener('keydown',e=>{
 if(!r80L||!document.getElementById('r80-les')||e.ctrlKey||e.metaKey||e.altKey)return;
 if(e.key==='Escape'){const g=r80L.g;r80L=null;location.hash='#oly/'+g;return;}
 const t=e.target,inWidget=t&&t.closest&&t.closest('.r80-wbox,input,textarea');
 if(inWidget)return;
 if(e.key==='ArrowRight'){e.preventDefault();r80LesMove(1);}
 else if(e.key==='ArrowLeft'){e.preventDefault();r80LesMove(-1);}
});
/* routing hooks used by the shell (s30) */
function r80Html(route){
 const p=route.split('/');
 if(!globalThis.WQOly||!globalThis.WQOlyWidgets)return '<section class="r37-hub"><div class="r37-card"><h2>奧數路線準備中</h2></div></section>';
 if(p[1]==='cards')return r80Cards();
 if(p[1]==='wrong')return r80Wrong();
 if(/^[1-6]$/.test(p[1]||'')){if(p[2]&&p[3]==='learn')return r80LessonShell(+p[1],+p[2]);return r80Map(+p[1]);}
 return r80Hub();
}
function r80Mount(route){
 const p=route.split('/');
 if(/^[1-6]$/.test(p[1]||'')&&p[3]==='learn')r80LesStart(+p[1],+p[2]);
 else{
  if(/^[1-6]$/.test(p[1]||'')){r80DrawTrail();const c=document.querySelector('.r80-isle.cur')||document.querySelector('.r80-isle');if(c&&c.scrollIntoView)c.scrollIntoView({block:'center',inline:'center'});}
  r80L=null;
 }
}
addEventListener('resize',()=>{try{r80DrawTrail();}catch(_){}});
{const host=document.getElementById('app')||document.body;new MutationObserver(rs=>{if(rs.every(r=>r.target.closest&&r.target.closest('.r80-trail')))return;if(host.querySelector('.r80-map'))r80DrawTrail();}).observe(host,{childList:true,subtree:true});}
/* strategy card flip on the level result (first pass of level B) */
function r80ResultCard(P){
 const r=P.result;if(!r||!r.card||!globalThis.WQOly)return '';
 const u=WQOly.units[r.card];if(!u)return '';
 return `<div class="r80-got" role="status"><div class="r80-flip ${r37Calm()?'calm':''}">${r80CardHTML(u,true,'got')}</div><b>得到策略卡！</b></div>`;
}

/* olympiad figure (small svg above the stem) and the 錯因 hint in the feedback bar */
function r80Fig(q){return q&&q.mq&&q.mq.svg?`<div class="r80-fig" aria-hidden="false">${q.mq.svg}</div>`:'';}
function r80Why(q,fb){
 const w=q&&q.mq&&q.mq.why;if(!w||!fb||fb.ok)return '';
 const k=String(fb.value||'').replace(/[\s　]+/g,''),t=w[k]||w[String(Math.round(Number(k)*1e6)/1e6)];
 return t?`<small class="r80-whyb"><span aria-hidden="true">${r37Icon('💡')}</span>${esc(t)}</small>`:'';
}
