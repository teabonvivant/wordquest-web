/* R3.7 s20 - planet shell views: galaxy home, planet hubs, level maps, play screen, parent dashboard. */
const R37_PLANETS=[
 {id:'english',name:'英文星',icon:'🔤',hue:205,x:20,y:27,tilt:-18},
 {id:'math',name:'數學星',icon:'🔢',hue:155,x:50,y:15,tilt:14},
 {id:'olympiad',name:'奧數星',icon:'🧩',hue:272,x:80,y:27,tilt:-26},
 {id:'games',name:'遊戲星',icon:'🎮',hue:28,x:80,y:73,tilt:20},
 {id:'dictation',name:'默書星',icon:'✏️',hue:340,x:50,y:85,tilt:-12},
 {id:'parent',name:'家長星',icon:'👪',hue:46,x:20,y:73,tilt:16}
];
const r37Planet=id=>R37_PLANETS.find(p=>p.id===id);
/* R3.18: collectible characters are illustrations (assets/r318/ch_<id>.webp, transparent full body); heads are cropped by CSS (.r37-cimg) */
const r37ChImg=(ch,cls='')=>ch&&ch.img?`<img class="r37-cimg ${cls}" src="${ch.img}" alt="" width="96" height="96" decoding="async" draggable="false">`:r37Icon(ch?ch.icon:'🐼');
const r37Ico=icon=>String(icon).startsWith('<')?icon:r37Icon(icon);
/* world nebula tint (hue) per map */
const R37_WHUE={english:[150,128,38,14,196,266,214,286],math:[155,205,45,282,325,22],olympiad:[272,300,215,160,40,340],runner:[322,140,38,12,262],fps:[150,128,38,14,196,266,214,286]};
const r37WHue=(t,w)=>{const a=R37_WHUE[t]||[222];return a[w%a.length];};
const R37_ASSET='assets/r316/';
/* planet: back half of the ring, picture (gradient ball underneath as fallback), terminator shade, front half of the ring, tool badge */
const r37Arc=sweep=>`<svg class="r37-ring ${sweep?'bk':'fr'}" viewBox="0 0 200 200" aria-hidden="true" focusable="false"><path d="M6 100A94 27 0 0 ${sweep} 194 100"/><path class="in" d="M22 100A78 21 0 0 ${sweep} 178 100"/></svg>`;
function r37OrbHTML(id,badge=true){
 const p=r37Planet(id);if(!p)return '';
 return `${r37Arc(1)}<img class="r37-img" src="${R37_ASSET}pl_${id}.webp" alt="" width="384" height="384" loading="eager" decoding="async"><span class="r37-sh"></span>${r37Arc(0)}${badge?`<span class="r37-badge" aria-hidden="true">${r37Icon(p.icon)}</span>`:''}`;
}
const r37Coin=()=>`<span class="r37-coin" title="金幣">${r37Icon('🪙')}<b>${isLoggedIn()?r37Coins():0}</b></span>`;
/* level-map trail: one segment between each pair of consecutive stages, drawn in cell coordinates of the 5x2 and 2x5 layouts (serpentine, so every link is a short hop) */
function r37Trail(lit){
 return `<svg class="r37-trail" aria-hidden="true" focusable="false">${lit.slice(0,-1).map(l=>`<path class="${l?'lit':''}"/>`).join('')}</svg>`;
}
/* the segments run from node centre to node centre as cubic curves (S-bends, alternating side), re-measured on every render / resize */
function r37DrawTrails(){
 for(const p of document.querySelectorAll('.r37-path')){
  const sv=p.querySelector(':scope>.r37-trail');if(!sv)continue;
  const ns=[...p.querySelectorAll(':scope>.r37-node')],W=p.clientWidth,H=p.clientHeight;
  sv.setAttribute('viewBox','0 0 '+W+' '+H);
  const c=ns.map(n=>[Math.round((n.offsetLeft+n.offsetWidth/2)*10)/10,Math.round((n.offsetTop+n.offsetHeight/2)*10)/10]);
  sv.querySelectorAll('path').forEach((el,i)=>{
   const a=c[i],b=c[i+1];if(!b){el.setAttribute('d','');return;}
   const dx=b[0]-a[0],dy=b[1]-a[1],len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len,bul=Math.min(34,len*.22)*(i%2?-1:1);
   const c1=[a[0]+dx/3+nx*bul,a[1]+dy/3+ny*bul],c2=[a[0]+dx*2/3-nx*bul,a[1]+dy*2/3-ny*bul];
   el.setAttribute('d',`M${a[0]} ${a[1]}C${c1[0].toFixed(1)} ${c1[1].toFixed(1)} ${c2[0].toFixed(1)} ${c2[1].toFixed(1)} ${b[0]} ${b[1]}`);
  });
 }
}
{
 const host=document.getElementById('app')||document.body;
 new MutationObserver(()=>{if(host.querySelector('.r37-path'))r37DrawTrails();}).observe(host,{childList:true,subtree:true});
 addEventListener('resize',()=>{try{r37DrawTrails();}catch(_){}});
 addEventListener('orientationchange',()=>{setTimeout(()=>{try{r37DrawTrails();}catch(_){}},120);});
}
/* main action tile (.gold): saturated planet gradient + the planet picture cropped by the card's lower right corner */
const r37Cta=pl=>pl?`<img class="r37-tpl" src="${R37_ASSET}pl_${pl}.webp" alt="" width="384" height="384" loading="lazy" decoding="async">`:'';
const r37Sub=sub=>sub?`<span class="r37-ts">${sub}</span>`:'';
const r37B=(icon,label,attrs,cls='',pl='',sub='')=>`<button type="button" class="r37-tile ${cls}${pl?' pl-'+pl:''}" ${attrs}>${r37Cta(pl)}<span class="r37-ti" aria-hidden="true">${r37Ico(icon)}</span><span class="r37-tn">${label}</span>${r37Sub(sub)}</button>`;
const r37A=(icon,label,href,cls='',pl='',sub='')=>`<a class="r37-tile ${cls}${pl?' pl-'+pl:''}" href="${href}">${r37Cta(pl)}<span class="r37-ti" aria-hidden="true">${r37Ico(icon)}</span><span class="r37-tn">${label}</span>${r37Sub(sub)}</a>`;
/* one header capsule per hub (36px): an icon or stars + one number */
const r37Cap=(inner,label)=>`<div class="r37-prog" aria-label="${esc(label||'')}">${inner}</div>`;
/* map nodes show three stars under the circle: 1 = passed, 2 = 3-4 stars, 3 = 5 stars (the result screen keeps the exact 5-star count) */
const r37Stars3=best=>{const n=best>=5?3:best>=3?2:best>=1?1:0;return `<span class="r37-st r37-st3" aria-label="最佳成績 ${best||0}/5 星">${[0,1,2].map(i=>`<i class="${i<n?'on':''}">${r37Icon('⭐')}</i>`).join('')}</span>`;};
const r37Here=()=>`<span class="r37-here" aria-hidden="true">${r37ChImg(r37Char())}</span>`;
function r37NodeHTML({cls,attrs,label,num,name,best,cur}){
 return `<button type="button" class="r37-node ${cls}" ${attrs} aria-label="${label}"><span class="r37-nn">${num}</span>${name?`<span class="r37-nu">${esc(name)}</span>`:''}${r37Stars3(best)}${cur?r37Here():''}</button>`;
}
const r37Stars=(n,max=5)=>'<span class="r37-st" aria-label="'+n+' 顆星">'+Array.from({length:max},(_,i)=>`<i class="${i<n?'on':''}">★</i>`).join('')+'</span>';
function r37Top(extra=''){
 const c=activeChild(),ch=r37Char();
 return `<div class="r37-bar"><a class="r37-back" href="#kid" aria-label="回星系">${r37Logo()}<span class="r37-wm" aria-hidden="true">學霸星球</span></a><div class="r37-who"><span class="r37-av">${r37ChImg(ch)}</span><span class="r37-wn">${esc(c?.name||'小朋友')}</span></div>${extra}${r37Coin()}</div>`;
}
function r37Nav(active){
 const items=[['kid','🪐','星系',250],['p/english','🔤','英文',205],['p/math','🔢','數學',155],['p/olympiad','🧩','奧數',272],['p/games','🎮','遊戲',28],['p/parent','👪','家長',46]];
 return `<nav class="r37-nav" aria-label="主選單">${items.map(([h,i,t,hue])=>`<a href="#${h}" style="--h:${hue}" class="${active===h?'on':''}" ${active===h?'aria-current="page"':''}><span aria-hidden="true">${r37Icon(i)}</span><b>${t}</b></a>`).join('')}</nav>`;
}
function r37Home(){
 const m=r37Mission(),day=r37Get().day,doneN=m.filter(x=>day.claimed.includes(x.id)).length,prog={english:r37TrackProgress('english'),math:r37TrackProgress('math'),olympiad:r37TrackProgress('olympiad')};
 const ring=p=>{const q=prog[p.id];if(!q)return '';const v=Math.round(q.done/Math.max(1,q.total)*100);return v>0?`<span class="r37-pp" style="--p:${v}"><b>${q.done}/${q.total}</b></span>`:'';};
 return `<section class="r37-gx">${r37Top()}
 <div class="r37-sys"><div class="r37-sun" aria-hidden="true"><img class="r37-sunimg" src="${R37_ASSET}core_sun.webp" alt="" width="384" height="384" loading="eager" decoding="async"><b>學霸星球</b><small>SmartQuest Planet</small></div><i class="r37-orbit o1"></i><i class="r37-orbit o2"></i><i class="r37-orbit o3"></i>
 ${R37_PLANETS.map((p,i)=>`<a class="r37-planet" href="#p/${p.id}" data-pl="${p.id}" style="--h:${p.hue};--x:${p.x}%;--y:${p.y}%;--d:${(i*.7).toFixed(1)}s;--tilt:${p.tilt}deg"><span class="r37-orb">${r37OrbHTML(p.id)}</span><span class="r37-pn">${p.name}</span>${ring(p)}</a>`).join('')}</div>
 <a class="r37-quest" href="#p/games"><span class="r37-qi" aria-hidden="true">${r37Icon('🎁')}</span><b>今日任務</b><span class="r37-pips2">${m.map(x=>`<i class="${day.claimed.includes(x.id)?'on':''}"></i>`).join('')}</span><span>${doneN}/3</span></a>
 ${r37Nav('kid')}</section>`;
}
function r37Hub(id){
 const p=r37Planet(id);if(!p)return r37Home();
 let tiles='',extra='';
 const quiz=t=>r37B('✅','選擇題',`data-r37="quiz" data-track="${t}" data-mode="mcq"`,'blue')+r37B('✍️','填充題',`data-r37="quiz" data-track="${t}" data-mode="fill"`,'green');
 if(id==='english'){
  const q=r37TrackProgress('english');
  tiles=r37A('🏆','闖關','#lv/english','gold big','english',`${q.done}/${q.total} 關`)+quiz('english')+r37A('📚','課堂','#classroom')+r37A('🧰','字詞工房','#assembly')+r37A('🔊','拼音','#learning')+r37A('📖','詞庫','#library');
  extra=r37Cap(r37Stars(Math.min(5,Math.round(q.stars/Math.max(1,q.max)*5)))+`<b>${q.done}/${q.total}</b>`,'英文進度');
 }else if(id==='math'){
  const q=r37TrackProgress('math');
  tiles=r37B('📚','主題課堂','data-wqm-open="normal"','gold big','math','小一至小六 · 每個主題兩課')+r37A('🏆','闖關','#lv/math','gold','',`${q.done}/${q.total} 關`)+quiz('math')+r37B('📝','考考自己','data-wqm-open="assessment"')+r37B('🔁','再練一練','data-wqm-open="review"');
  extra=r37Cap(r37Stars(Math.min(5,Math.round(q.stars/Math.max(1,q.max)*5)))+`<b>${q.done}/${q.total}</b>`,'數學進度');
 }else if(id==='olympiad'){
  return r80Hub();/* R3.23: one screen - six grade buttons, continue, strategy cards, wrong book (the old tiles' code stays below, no longer an entry) */
 }else if(id==='dictation'){
  const dzR=latestRange(),dzS=dzR&&rangeWords(dzR.id).some(w=>w.kind==='sentence');
  const dzN=dzR?rangeWords(dzR.id).length:0;
  tiles=r37A('📖','學習','#dz','gold big','dictation',dzN?`${dzN} 個字`:'')+(dzS?r37B('🗒️','句子','data-act="start-daily"'):'')+r37B('🔁','補練錯題','data-act="practice-weak"')+r37A('📝','默書範圍','#ranges')+r37A('📊','報告','#report');
  extra=r37Cap(r37Icon('📝')+`<b>${dzN} 字</b>`,'默書範圍字數');
 }else if(id==='games'){
  return r37GamesHub();
 }else if(id==='parent'){
  return r37ParentHub();
 }
 return `<section class="r37-hub" data-pl="${id}" style="--h:${p.hue}">${r37Top()}<div class="r37-hero"><span class="r37-bigorb" style="--tilt:${p.tilt}deg">${r37OrbHTML(p.id)}</span><h1>${p.name}</h1>${extra}</div><div class="r37-tiles">${tiles}</div>${r37Nav('p/'+id)}</section>`;
}
function r37GamesHub(){
 const m=r37Mission(),d=r37Get().day,ch=r37Char(),doneN=m.filter(x=>d.claimed.includes(x.id)).length;
 const quest=m.map(x=>{const v=Math.min(x.goal,d[x.key]||0),ok=v>=x.goal,got=d.claimed.includes(x.id);return `<div class="r37-mq ${ok?'ok':''}"><span class="r37-mi" aria-hidden="true">${r37Icon(x.icon)}</span><b>${x.name}</b><i style="--p:${Math.round(v/x.goal*100)}%"></i><em>${v}/${x.goal}</em>${got?'<span class="r37-got">✓</span>':ok?`<button type="button" data-r37="claim" data-id="${x.id}">${r37Icon('🎁')}+${x.coins}</button>`:`<span class="r37-rw">${r37Icon('🪙')}${x.coins}</span>`}</div>`;}).join('');
 return `<section class="r37-hub" style="--h:28">${r37Top()}<div class="r37-hero"><span class="r37-bigorb" style="--tilt:20deg">${r37OrbHTML('games')}</span><h1>遊戲星</h1>${r37Cap(r37Icon('🎁')+`<b>${doneN}/3</b>`,'今日任務')}</div>
 <div class="r37-tiles r37-gt g8">${r37A('🕹️','遊戲街機','#game','gold big','games')+r37A('🏃','星際跑酷','#lv/runner','green big')+r37A('🎯','字母獵場','#lv/fps','pink big')+r37A('🏰','字母砲台','#lv/td','violet big')+r37A('🌀','字母迷宮','#lv/mz','teal big')+r37A('🃏','字卡征途','#lv/cd','rose big')+r37B(r37ChImg(ch),'角色','data-r37="chars"','blue big')}</div>
 <div class="r37-card r37-quests"><h2>${r37Icon('🎁')}今日任務</h2>${quest}</div>${r37Nav('p/games')}</section>`;
}
function r37Chars(){
 const o=r37Get(),coins=r37Coins();
 return `<section class="r37-hub" style="--h:28">${r37Top('<a class="r37-back2" href="#p/games">←</a>')}<div class="r37-hero"><h1>角色圖鑑</h1></div><div class="r37-chars">${R37_CHARS.map(c=>{const own=o.chars.includes(c.id),on=o.pick===c.id;return `<div class="r37-char ${on?'on':''} ${own?'own':'lock'}"><span class="r37-cav">${r37ChImg(c,'full')}</span><b>${c.name}</b><small>${c.desc||'　'}</small>${on?'<span class="r37-got">使用中</span>':own?`<button type="button" data-r37="pick" data-id="${c.id}">選用</button>`:`<button type="button" data-r37="buy" data-id="${c.id}" ${coins>=c.cost&&isLoggedIn()?'':'disabled'}>${r37Icon('🪙')}${c.cost}</button>`}</div>`;}).join('')}</div>${isLoggedIn()?'':'<p class="r37-note">登入後才可以收集角色</p>'}${r37Nav('p/games')}</section>`;
}
function r37LevelMap(t,wIdx){
 const worlds=r37TrackWorlds(t),T=R37_TRACKS[t];
 if(!worlds.length)return `<section class="r37-hub">${r37Top()}<div class="r37-card"><h2>${T.name}闖關準備中</h2></div>${r37Nav('p/'+t)}</section>`;
 let w=Number.isInteger(wIdx)?wIdx:r37Mem._w?.[t];if(!Number.isInteger(w)){w=0;for(let i=0;i<worlds.length;i++)if(r37StageOpen(t,i,0))w=i;}
 w=Math.max(0,Math.min(worlds.length-1,w));(r37Mem._w=r37Mem._w||{})[t]=w;
 const diff=r37Diff(t),W=worlds[w],wOpen=r37StageOpen(t,w,0),ut=x=>t==='english'&&typeof LIB30!=='undefined'?(LIB30.units.get(W.units?.[x])?.title||''):'';
 const lit=[];
 const nodes=Array.from({length:10},(_,s)=>{const e=r37Entry(t,w,s),open=r37StageOpen(t,w,s),cur=open&&!e?.passed&&(s===0||r37Entry(t,w,s-1)?.passed||adminUnlocks()),boss=s===9;lit.push(!!e?.passed);
  return r37NodeHTML({cls:`${e?.passed?'done':''} ${cur?'cur':''} ${open?'':'lock'} ${boss?'boss':''}`,attrs:open?`data-r37="level" data-track="${t}" data-w="${w}" data-s="${s}"`:'disabled',label:`${boss?'魔王關':'第 '+(s+1)+' 關'}${ut(s)?'：'+esc(ut(s)):''}`,num:open?(boss?r37Icon('👹'):s+1):r37Icon('🔒'),name:ut(s),best:open&&e?e.best:0,cur});}).join('');
 return `<section class="r37-hub r37-map" style="--h:${t==='english'?205:t==='math'?155:272};--wh:${r37WHue(t,w)}">${r37Top('<a class="r37-back2" href="#p/'+t+'">←</a>')}
 <div class="r37-worlds${worlds.length>6?' many':''}" role="tablist">${worlds.map((x,i)=>`<button type="button" role="tab" class="r37-wtab ${i===w?'on':''} ${r37StageOpen(t,i,0)?'':'lock'}" data-r37="world" data-track="${t}" data-w="${i}" ${r37StageOpen(t,i,0)?'':'disabled'}><span aria-hidden="true">${r37Icon(r37StageOpen(t,i,0)?x.icon||'🌍':'🔒')}</span><b>${i+1}</b></button>`).join('')}</div>
 <div class="r37-wtitle"><span class="r37-wic" aria-hidden="true">${r37Icon(W.icon||'🌍')}</span><div><h1>${esc(W.name)}</h1><small>${r37WorldDone(t,w)}/10 · ${r37Stars(Math.min(5,Math.round(r37WorldStars(t,w)/50*5)))}</small></div>${t==='english'?`<a class="r37-dchip r37-lk" href="#classroom" aria-label="課堂">${r37Icon('📚')}</a>`:`<button type="button" class="r37-dchip r37-lk" data-wqm-open="${t==='olympiad'?'olympiad':'normal'}" aria-label="${t==='olympiad'?'思維之塔':'主題課堂'}">${r37Icon(t==='olympiad'?'🗼':'🏝️')}</button>`}<span class="r37-dchip" title="難度" aria-label="難度 ${diff.n}">${r37Icon(diff.icon)}<span class="r37-dn">難度 ${diff.n}</span></span></div>
 <div class="r37-path">${r37Trail(lit)}${nodes}</div>${r37Nav('p/'+t)}</section>`;
}
const R37_RUN_WORLDS=[{name:'彩虹草原',icon:'🌈'},{name:'迷霧森林',icon:'🌲'},{name:'金沙沙漠',icon:'🏜️'},{name:'火焰火山',icon:'🌋'},{name:'星空宇宙',icon:'🌌'}];
function r37RunOpen(w,s){if(adminUnlocks())return true;if(s>0)return !!r37Entry('runner',w,s-1)?.passed;if(w>0)return !!r37Entry('runner',w-1,2)?.passed;return true;}
function r37RunMap(){
 let w=Number.isInteger(r37Mem._rw)?r37Mem._rw:0;if(!Number.isInteger(r37Mem._rw))for(let i=0;i<5;i++)if(r37RunOpen(i,0))w=i;
 const W=R37_RUN_WORLDS[w],ch=r37Char();
 const lit=[];
 const nodes=[0,1,2].map(s=>{const e=r37Entry('runner',w,s),open=r37RunOpen(w,s),cur=open&&!e?.passed;lit.push(!!e?.passed);
  return r37NodeHTML({cls:`${e?.passed?'done':''} ${cur?'cur':''} ${open?'':'lock'} ${s===2?'boss':''}`,attrs:open?`data-r37="run" data-w="${w}" data-s="${s}"`:'disabled',label:s===2?'魔王關':`第 ${s+1} 關`,num:open?(s===2?r37Icon('🐲'):s+1):r37Icon('🔒'),name:'',best:open&&e?e.best:0,cur});}).join('');
 return `<section class="r37-hub r37-map" style="--h:28;--wh:${r37WHue('runner',w)}">${r37Top('<a class="r37-back2" href="#p/games">←</a>')}
 <div class="r37-worlds" role="tablist">${R37_RUN_WORLDS.map((x,i)=>`<button type="button" role="tab" class="r37-wtab ${i===w?'on':''} ${r37RunOpen(i,0)?'':'lock'}" data-r37="rworld" data-w="${i}" ${r37RunOpen(i,0)?'':'disabled'}><span aria-hidden="true">${r37Icon(r37RunOpen(i,0)?x.icon:'🔒')}</span><b>${i+1}</b></button>`).join('')}</div>
 <div class="r37-wtitle"><span class="r37-wic" aria-hidden="true">${r37Icon(W.icon)}</span><div><h1>${W.name}</h1><small>${[0,1,2].filter(s=>r37Entry('runner',w,s)?.passed).length}/3</small></div><button type="button" class="r37-dchip r37-lk r37-endless" data-r37="run-endless" aria-label="無盡模式">${r37Icon('♾️')}</button><span class="r37-dchip r37-chip-ch">${r37ChImg(ch)}</span></div>
 <div class="r37-path n3">${r37Trail(lit)}${nodes}</div>${r37Nav('p/games')}</section>`;
}
function r37FpsMap(){
 const worlds=R37_TRACKS.english.worlds;
 let w=r37Mem._fw;if(!Number.isInteger(w)){w=0;for(let i=0;i<worlds.length;i++)if(r37FpsWorldOpen(i))w=i;}
 w=Math.max(0,Math.min(worlds.length-1,w));r37Mem._fw=w;
 const diff=r37Diff(),W=worlds[w],ut=s=>typeof LIB30!=='undefined'?(LIB30.units.get(W.units[s])?.title||''):'';
 let curS=-1,locked=0,done=0,stars=0;
 for(let s=0;s<10;s++){const e=r37Entry('fps',w,s);if(!r37FpsOpen(w,s))locked++;else if(curS<0&&!e?.passed)curS=s;if(e?.passed)done++;stars+=e?.best||0;}
 const lit=[];
 const nodes=Array.from({length:10},(_,s)=>{const e=r37Entry('fps',w,s),open=r37FpsOpen(w,s),boss=s===9,t=ut(s),cur=s===curS;lit.push(!!e?.passed);
  return r37NodeHTML({cls:`${e?.passed?'done':''} ${cur?'cur':''} ${open?'':'lock'} ${boss?'boss':''}`,attrs:open?`data-r37="fps-level" data-w="${w}" data-s="${s}"`:'disabled',label:`${boss?'魔王關':'第 '+(s+1)+' 關'}${t?'：'+esc(t):''}`,num:open?(boss?r37Icon('👹'):s+1):r37Icon('🔒'),name:t,best:open&&e?e.best:0,cur});}).join('');
 return `<section class="r37-hub r37-map r37-fmap" style="--h:340;--wh:${r37WHue('fps',w)}">${r37Top('<a class="r37-back2" href="#p/games" aria-label="遊戲星">←</a>'+(locked?'<a class="r37-back2 r37-fhint" href="#lv/english" aria-label="先完成英文闖關">'+r37Icon('🔤')+'</a>':''))}
 <div class="r37-worlds${worlds.length>6?' many':''}" role="tablist">${worlds.map((x,i)=>{const o=r37FpsWorldOpen(i);return `<button type="button" role="tab" class="r37-wtab ${i===w?'on':''} ${o?'':'lock'}" data-r37="fworld" data-w="${i}" ${o?'':'disabled'}><span aria-hidden="true">${r37Icon(o||i===w?x.icon||'🌍':'🔒')}</span><b>${i+1}</b></button>`;}).join('')}</div>
 <div class="r37-wtitle"><span class="r37-wic" aria-hidden="true">${r37Icon(W.icon||'🌍')}</span><div><h1>${esc(W.name)}</h1><small>${done}/10 · ${r37Stars(Math.min(5,Math.round(stars/50*5)))}</small></div><a class="r37-dchip r37-lk r37-free" href="#fps" aria-label="自由練習" title="自由練習">${r37Icon('🎲')}<span class="r37-fl">自由練習</span></a><span class="r37-dchip" title="難度" aria-label="難度 ${diff.n}">${r37Icon(diff.icon)}<span class="r37-dn">難度 ${diff.n}</span></span></div>
 <div class="r37-path">${r37Trail(lit)}${nodes}</div>${r37Nav('p/games')}</section>`;
}
function r37G3Map(g){
 const G=R37_G3[g];let subj=r37Mem._gs&&r37Mem._gs[g]||'english';if(subj!=='math')subj='english';
 const worlds=r37G3Worlds(subj),t=r37G3Track(g,subj);
 let w=r37Mem._gw&&r37Mem._gw[t];if(!Number.isInteger(w)){w=0;for(let i=0;i<worlds.length;i++)if(r37G3WorldOpen(g,subj,i))w=i;}
 w=Math.max(0,Math.min(worlds.length-1,w));(r37Mem._gw=r37Mem._gw||{})[t]=w;
 const W=worlds[w],diff=r37Diff(subj==='math'?'math':'english'),gr=r37G3Grade(subj,w),lit=[];let curS=-1,done=0,stars=0;
 for(let s=0;s<10;s++){const e=r37Entry(t,w,s);if(curS<0&&r37G3Open(g,subj,w,s)&&!e?.passed)curS=s;if(e?.passed)done++;stars+=e?.best||0;}
 const ut=s=>subj==='english'&&typeof LIB30!=='undefined'?(LIB30.units.get(W.units?.[s])?.title||''):'';
 const nodes=Array.from({length:10},(_,s)=>{const e=r37Entry(t,w,s),open=r37G3Open(g,subj,w,s),boss=s===9,nm=ut(s);lit.push(!!e?.passed);
  return r37NodeHTML({cls:`${e?.passed?'done':''} ${s===curS?'cur':''} ${open?'':'lock'} ${boss?'boss':''}`,attrs:open?`data-r37="g3-level" data-g="${g}" data-subj="${subj}" data-w="${w}" data-s="${s}"`:'disabled',label:`${boss?'魔王關':'第 '+(s+1)+' 關'}${nm?'：'+esc(nm):''}`,num:open?(boss?r37Icon('👹'):s+1):r37Icon('🔒'),name:nm,best:open&&e?e.best:0,cur:s===curS});}).join('');
 const wopen=i=>r37G3WorldOpen(g,subj,i);
 return `<section class="r37-hub r37-map r37-fmap r37-g3" data-g="${g}" style="--h:${G.hue};--wh:${r37WHue(subj==='math'?'math':'english',w)}">${r37Top('<a class="r37-back2" href="#p/games" aria-label="遊戲星">←</a>')}
 <div class="r37-worlds${worlds.length>6?' many':''}" role="tablist">${worlds.map((x,i)=>`<button type="button" role="tab" class="r37-wtab ${i===w?'on':''} ${wopen(i)?'':'lock'}" data-r37="g3-world" data-g="${g}" data-w="${i}" ${wopen(i)?'':'disabled'} aria-label="${subj==='math'?esc(r37G3Grade('math',i)):esc(x.name||'')}"><span aria-hidden="true">${r37Icon(wopen(i)||i===w?x.icon||'🌍':'🔒')}</span><b>${i+1}</b></button>`).join('')}</div>
 <div class="r37-wtitle"><span class="r37-wic" aria-hidden="true">${r37Icon(G.icon)}</span><div><h1>${G.name}</h1><small>${esc(W.name||'')}${subj==='math'?' · '+esc(gr):''} · ${done}/10 · ${r37Stars(Math.min(5,Math.round(stars/50*5)))}</small></div>
  <span class="r37-gsub" role="group" aria-label="科目"><button type="button" class="${subj==='english'?'on':''}" data-r37="g3-subj" data-g="${g}" data-subj="english" aria-pressed="${subj==='english'}">${r37Icon('🔤')}<b>英文</b></button><button type="button" class="${subj==='math'?'on':''}" data-r37="g3-subj" data-g="${g}" data-subj="math" aria-pressed="${subj==='math'}">${r37Icon('🔢')}<b>數學</b></button></span><span class="r37-dchip" title="難度" aria-label="難度 ${diff.n}">${r37Icon(diff.icon)}<span class="r37-dn">難度 ${diff.n}</span></span></div>
 <div class="r37-path">${r37Trail(lit)}${nodes}</div>${r37Nav('p/games')}</section>`;
}
/* ---------------------------------------------------------------------------------------------- play */
let r37P=null,r37Timer=0;
const R37_EN_TYPE={zh2en:'meaning',en2zh:'meaning',listen:'listenChoice',fill:'spell','fill-listen':'listenSpell'};
function r37Hearts(){return Array.from({length:r37P.maxHearts},(_,i)=>`<i class="${i<r37P.hearts?'on':''}">${r37Icon('❤️')}</i>`).join('');}
/* progress bar (12px, gold fill, 300ms): counts the current run only (warm-up or main); the question being answered counts once its answer is in */
function r37Pips(){
 const P=r37P,cur=P.qs[P.i],warm=cur&&cur.warm,idx=P.qs.map((q,i)=>i).filter(i=>warm?P.qs[i].warm:!P.qs[i].warm);
 const n=idx.length,d=Math.min(n,idx.filter(i=>i<P.i).length+(P.fb?1:0));
 return `<div class="r37-pbar" role="progressbar" aria-label="進度" aria-valuemin="0" aria-valuemax="${n}" aria-valuenow="${d}"><i style="width:${Math.round(d/Math.max(1,n)*100)}%"></i></div>`;
}
function r37Play(){
 const P=r37P;if(!P)return r37Home();
 const D=R37_DIFF[P.diff-1],top=`<header class="r37-ptop"><button type="button" class="r37-x" data-r37="exit" aria-label="離開">${r37Icon('✕')}</button><div class="r37-pips">${P.phase==='quiz'?r37Pips():''}</div>${P.kind==='level'&&P.track==='olympiad'?`<button type="button" class="r37-dchip r80-tolesson" data-r37="oly-lesson" aria-label="看課堂">${r37Icon('📚')}<b>課</b></button>`:''}${P.kind==='level'?`<div class="r37-hearts" aria-label="生命">${r37Hearts()}</div>`:P.kind==='dz'?`<span class="r37-dchip" role="img" aria-label="第 ${P.dz.lvl} 級：${R37_DZ_NAMES[P.dz.lvl-1]}">${r37Icon(R37_DZ_LV[P.dz.lvl-1])}<b>第 ${P.dz.lvl} 級</b></span>`:`<span class="r37-dchip">${r37Icon(D.icon)}</span>`}</header>`;
 if(P.phase==='learn'){
  const card=w=>`<div class="r37-wc${P.kind==='dz'?'':' r37-wcx'}"><button type="button" class="r37-wcb" data-r37="speak" data-t="${esc(w.en)}"><span class="r37-wem" aria-hidden="true">${r37WordArt(w.en)}</span><b lang="en">${w.fi&&w.fi.length?r37Hl(w.en,w.fi):esc(w.en)}</b><span>${esc(w.zh)}</span></button>${P.kind==='dz'?r37SylRow(w.en):''}${P.kind!=='dz'&&w.ex?`<button type="button" class="r37-exl" lang="en" data-r37="speak" data-t="${esc(w.ex)}"><span aria-hidden="true">${r37Icon('🔊')}</span>${esc(w.ex)}</button>`:''}</div>`;
  const sent=P.kind!=='dz'&&P.sentence?`<button type="button" class="r37-us" lang="en" data-r37="speak" data-t="${esc(P.sentence)}"><span aria-hidden="true">${r37Icon('🔊')}</span>${esc(P.sentence)}</button>`:'';
  return `<section class="r37-play">${top}<div class="r37-stage"><h2 class="r37-ptitle">${P.title}</h2>${P.chunks&&P.chunks.length>1?`<div class="r37-cks" aria-label="第 ${P.ck+1} 組，共 ${P.chunks.length} 組">${P.chunks.map((c,i)=>`<i class="${i<P.ck?'done':i===P.ck?'on':''}">${c.length}</i>`).join('')}</div>`:''}<div class="r37-learn ${P.kind==='dz'?'dz':''}">${P.learn.map(card).join('')}</div>${sent}<button type="button" class="r37-go" data-r37="learn-go">${r37Icon('▶')}<span>${P.kind==='dz'?'開始測驗（第 '+P.dz.lvl+' 級）':'闖關'}</span></button></div></section>`;
 }
 if(P.phase==='example'){
  const x=P.exq||{};
  return `<section class="r37-play">${top}<div class="r37-stage"><div class="r37-ptitle">${P.title}</div><div class="r37-excard" role="region" aria-label="例題"><h2><span aria-hidden="true">${r37Icon('💡')}</span>先看一題例子</h2><div class="r37-exq">${esc(x.q||'')}</div>${x.svg?`<div class="r80-fig">${x.svg}</div>`:''}<div class="r37-exa">答案：<b>${esc(x.answer||'')}</b></div><p class="r37-exe">${esc(x.explain||'')}</p>${x.tip?`<p class="r37-ext">${esc(x.tip)}</p>`:''}</div><div class="r37-exb">${P.exBack?`<button type="button" class="r37-go" data-r37="learn-go">${r37Icon('▶')}<span>返回結果</span></button>`:`<button type="button" class="r37-go" data-r37="learn-go">${r37Icon('▶')}<span>我試試</span></button><button type="button" class="r37-sec2" data-r37="learn-go" data-skip="1">略過</button>`}</div></div></section>`;
 }
 if(P.phase==='result')return r37Result();
 const q=P.qs[P.i],fb=P.fb;
 let body='';
 const aud=q.audio?`<button type="button" class="r37-spk" ${q.noleak?'data-r37="qspeak"':`data-r37="speak" data-t="${esc(q.audio)}"`} aria-label="聽">${r37Icon('🔊')}</button>`:'';
 if(q.mode==='mcq'){
  body=`<div class="r37-q">${q.emoji?`<div class="r37-qe" aria-hidden="true">${q.word?r37WordArt(q.word):q.emoji}</div>`:''}${r80Fig(q)}<div class="r37-qt ${String(q.prompt).length>14?'long':''}" ${q.kind==='en2zh'?'lang="en"':''}>${esc(q.prompt)}</div>${aud}</div><div class="r37-opts n${q.options.length}">${q.options.map((o,i)=>{const mark=fb?(o===q.answer?'ok':o===fb.value?'bad':''):'';return `<button type="button" class="r37-opt ${mark}" data-r37="pick-opt" data-v="${esc(o)}" ${fb?'disabled':''}><kbd>${i+1}</kbd><span ${q.lang==='en'?'lang="en"':''}>${esc(o)}</span></button>`;}).join('')}</div>`;
 }else if(q.mode==='cells'){
  body=r37DzCellsBody(q,fb,aud);
 }else{
  body=`<div class="r37-q">${q.emoji?`<div class="r37-qe" aria-hidden="true">${q.word?r37WordArt(q.word):q.emoji}</div>`:''}${r80Fig(q)}<div class="r37-qt">${esc(q.prompt)}</div>${aud}</div>${q.scaffold?`<div class="r37-sc" lang="en">${esc(q.scaffold)}</div>`:''}<form class="r37-fill" data-r37-form="1"><input id="r37-in" type="text" inputmode="${q.kind==='math'?'decimal':'text'}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" ${fb?'disabled':''} value="${fb?esc(fb.value):''}" aria-label="答案" placeholder="…"><button type="submit" class="r37-ok" ${fb?'disabled':''}>確定</button></form>`;
 }
 const nudge=!fb&&P.nudge?`<div class="r37-nudge" role="status"><span aria-hidden="true">${r37Icon('💡')}</span><b>${esc(P.nudge.msg)}</b></div>`:'';
 const foot=fb?r37FbHTML(P,q,fb):`<div class="r37-pfoot">${D.hint&&q.hint?`<button type="button" class="r37-hintb" data-r37="hint" aria-label="提示">${r37Icon('💡')}<b>提示</b></button>`:''}${P.hintShown?`<span class="r37-hint">${esc(q.hint)}</span>`:''}</div>`;
 const bubble=fb?(fb.ok?P.praise:'下一題加油，你可以的'):(P.hintShown?'慢慢想，不用急':'選出正確的答案');
 const comp=`<div class="r37-comp ${fb?(fb.ok?'ok':'no'):''}"><span class="r37-compav">${r37ChImg(r37Char())}</span><span class="r37-bub" role="status">${esc(bubble)}</span></div>`;
 const title=q.warm?P.warmTitle:P.kind==='level'?P.title:'';
 return `<section class="r37-play">${top}<div class="r37-stage ${q.mode==='fill'?'fill':''} ${fb?(fb.ok?'ok':'shake'):''}">${title?`<div class="r37-ptitle">${title}</div>`:''}${comp}${body}${nudge}</div>${foot}</section>`;
}
/* feedback bar: say why it was wrong, keep the right answer on screen, show what was picked (T11) */
function r37FbHTML(P,q,fb){
 const lock=!fb.ok&&fb.lock>Date.now(),dzFill=q.dz&&q.dz.lvl>1,fillEn=q.mode==='fill'&&!q.mq&&!q.dz;
 let head,sub='';
 if(fb.ok){
  if(fb.hint)head=`答對了！不過用了提示，只算半分；下一題試試自己想`;
  else if(fb.part)head=`字對了，但留意大小寫：<span lang="en">${esc(q.answer)}</span>`;
  else if(fb.syn)head=`也對！這一題要寫的是 <span lang="en">${esc(q.answer)}</span>（${esc(r37ZhKey(q.zhOf))}），<span lang="en">${esc(fb.syn)}</span> 亦是${esc(r37ZhKey(q.zhOf))}`;
  else head=esc(P.praise);
  if(!fb.part&&!fb.syn&&!fb.hint&&q.word&&!q.dz&&R37_DIFF[P.diff-1].n<5)sub=`<small><span lang="en">${esc(q.word)}</span> ＝ ${esc(q.zhOf||'')}</small>`;
 }else{
  head='正確答案是 '+(dzFill?r37DzAns(q,fb):fillEn?r37DzAns(q,fb):esc(q.answer));
  if(dzFill)sub=r37DzYou(q,fb);
  else if(fillEn)sub=r37DzYou(q,fb)+(q.explain?`<small>${esc(q.explain)}</small>`:'');
  else{
   sub=r80Why(q,fb);
   if(q.explain)sub+=`<small>${esc(q.explain)}</small>`;
   if(q.mode==='mcq'&&q.info&&fb.value&&fb.value!==q.answer&&q.info[fb.value]!==undefined){
    const a=q.kind==='en2zh'?[fb.value,q.info[fb.value]]:[fb.value,q.info[fb.value]];
    sub+=`<small class="r37-picked">你選了 ${esc(a[0])}＝${esc(a[1])}</small>`;
   }
  }
 }
 return `<div class="r37-fb ${fb.ok?(fb.part||fb.hint?'part':'ok'):'bad'}" role="status"><span class="r37-fbi" aria-hidden="true">${r37Icon(fb.ok?'⭐':'💭')}</span><div><b>${head}</b>${sub}</div><button type="button" class="r37-next" data-r37="next" aria-label="下一題" ${lock?'disabled aria-disabled="true"':''}>▶</button></div>`;
}
function r37MissHTML(r){
 const items=(r.missed||[]).slice(0,8);if(!items.length)return '';
 const li=m=>m.en?`<li><button type="button" class="r37-ms" data-r37="speak" data-t="${esc(m.en)}" aria-label="聽 ${esc(m.en)}">${r37Icon('🔊')}</button><b lang="en">${esc(m.en)}</b><span>${esc(m.zh)}</span>${m.fixed?'<i class="r37-mk" aria-label="補考答對">✓</i>':''}${m.you?`<small>你寫：<span lang="en">${esc(m.you)}</span></small>`:''}</li>`
  :`<li class="m"><span class="r37-mqq">${esc(m.q)}</span><b>${esc(m.answer)}</b>${m.svg?`<div class="r80-fig">${m.svg}</div>`:''}${m.you?`<small>你答：${esc(m.you)}</small>`:''}${m.fixed?'<i class="r37-mk" aria-label="補考答對">✓</i>':''}</li>`;
 return `<div class="r37-miss" role="region" aria-label="這次答錯"><h2><span aria-hidden="true">${r37Icon('💭')}</span>這次答錯 <em>${items.length}</em></h2><ul>${items.map(li).join('')}</ul></div>`;
}
function r37Result(){
 const P=r37P,r=P.result,total=r.total||P.qs.length;
 /* detail row: correct / coins / best streak in a row */
 let best=0,run=0;for(let i=0;i<P.qs.length;i++){if(P.qs[i]&&(P.qs[i].warm||P.qs[i].retest))continue;if(P.res[i]){run++;best=Math.max(best,run);}else run=0;}
 const chip=(icon,txt,cls='')=>`<span class="r37-rd ${cls}">${r37Icon(icon)}<b>${txt}</b></span>`;
 const detail=`<div class="r37-rdetail">${chip('✅',`正確 ${r.correct}/${total}`)}${r.coins?chip('🪙',`+${r.coins} 金幣`,'r37-rc'):''}${best>1?chip('🔥',`連對 ×${best}`):''}</div>`;
 const act=(cls,attrs,icon,label)=>`<button type="button" class="${cls}" ${attrs}><span class="r37-ai" aria-hidden="true">${r37Icon(icon)}</span><b>${label}</b></button>`;
 const miss=r.missed||[],unfixed=miss.filter(m=>!m.fixed).length;
 let next='',extra='',note='',lessons='',redo='';
 if(P.kind==='dz'){
  const {g,lvl,n}=P.dz;
  if(lvl<3)next=act('r37-go','data-r37="dz-next"','▶',`第 ${lvl+1} 級`);
  else if(g<n-1)next=act('r37-go','data-r37="dz-next"','▶',`下一組 ${g+2}`);
  note=P.dz.rv?(r.passed?`<p class="r37-rn">${P.rvDone?'重溫全部完成！':'下一次重溫：'+(P.rvNext||1)+' 天後'}</p>`:'<p class="r37-rn">明天再重溫一次</p>'):lvl===3&&!r.passed?'<p class="r37-rn">再試一次！</p>':'';
 }else{
  const nextOk=P.kind==='level'&&!P.redo&&r.passed&&(P.s<9||P.w<r37TrackWorlds(P.track).length-1);
  if(nextOk)next=act('r37-go','data-r37="level-next"','▶',P.track==='olympiad'&&(P.s&1)?'下一單元':'下一關');
  if(P.kind==='level'&&P.track==='english'&&r.passed&&!P.redo&&r37EnStage(P.w,P.s).length>=4)extra=`<button type="button" class="r37-fpsgo" data-r37="fps-level" data-w="${P.w}" data-s="${P.s}" data-from="#lv/english">${r37Icon('🎯')}射擊鞏固</button>`;
  note=P.kind==='level'?(P.redo?(r.passed?'<p class="r37-rn">錯題全部答對了！</p>':'<p class="r37-rn">再試一次！</p>'):!r.passed?`<p class="r37-rn">${r.why==='retest'?'補考還有 '+unfixed+' 題未答對'+(r.hintedFix?'（用了提示答對的不算自己答對）':'')+'，再試一次！':'再試一次！'}</p>`:''):'';
 if(r.hintedRight&&P.kind!=='dz')note+=`<p class="r37-rn r37-rh">有 ${r.hintedRight} 題用了提示才答對，只算半分</p>`;
  lessons=(r.lessons||[]).map((l,i)=>l.code?act('r37-lesson',`data-r37="lesson" data-code="${esc(l.code)}" data-track="${esc(P.track)}"`,'📚','看課堂'):act('r37-lesson r37-exagain',`data-r37="ex-again" data-i="${i}"`,'💡','再看例題')).join('');
  if(miss.length&&P.kind==='level')redo=act('r37-redo','data-r37="redo-miss"','🔁','只重做錯的');
 }
 const exitLabel=P.kind==='dz'?'組別':P.kind==='level'?'地圖':'返回';
 const badge=r.passed?`<img class="r37-badge-win" src="assets/r318/badge_win.webp" alt="" width="120" height="120" decoding="async">`:`<span class="r37-rb-ic">${r37Icon('⭐')}</span>`;
 return `<section class="r37-play"><div class="r37-result ${r.passed?'win':'lose'} ${miss.length?'hasmiss':''}"><div class="r37-rb" aria-hidden="true">${badge}</div>${r37Stars(r.stars)}<div class="r37-rs" aria-label="答對 ${r.correct} 題，共 ${total} 題">${r.correct}/${total}</div>${detail}${note}${r37MissHTML(r)}${extra}${r80ResultCard(P)}
 <div class="r37-ra">${redo}${lessons}${next}${act('r37-sec','data-r37="retry" aria-label="重做"','↻','再玩')}${act('r37-sec','data-r37="exit" aria-label="'+(P.kind==='dz'?'組別':'返回地圖')+'"','🗺️',exitLabel)}</div></div></section>`;
}
/* ---- starting a level: warm-up of old wrong words (English), example card (maths), first learn chunk ---- */
function r37Lookup(w,s,en){
 const all=[...r37EnStage(w,s),...r37EnWorldPool(w),...r37EnPool()];
 return all.find(x=>x.en===en)||null;
}
function r37WarmWords(w,n=3){
 const o=r37Get(),day=r37Day();
 if(o.warm.en&&o.warm.en[w]===day)return [];
 return o.wrong.filter(x=>x.w===w&&x.n>0).sort((a,b)=>(b.n-a.n)||(a.at-b.at)).slice(0,n);
}
/* R3.19 T02: maths / olympiad warm-up. Up to 3 skills missed in this world before come back as NEW questions of the same skill (once a day per world);
   a right answer takes that skill off the wrong list */
function r37WarmMiss(track,w,n=3){
 const o=r37Get(),day=r37Day();
 if(o.warm[track]&&o.warm[track][w]===day)return [];
 const by={};
 for(const m of o.miss){if(m.t!==track||m.w!==w||!m.sk)continue;const b=by[m.sk]=by[m.sk]||{n:0,at:0,m};b.n++;if(m.at>=b.at){b.at=m.at;b.m=m;}}
 return Object.values(by).sort((a,b)=>b.n-a.n||b.at-a.at).slice(0,n).map(b=>b.m);
}
function r37WarmMathQs(track,w,diff,seed){
 const out=[];if(!globalThis.WQ37Math)return out;
 for(const m of r37WarmMiss(track,w)){
  let c=null;
  for(let k=0;k<8&&!c;k++){try{c=WQ37Math.make(track,m.w,m.s,6,diff,seed+k*7+1,[m.q,...(r37Get().recent[track]||[]).slice(-30)]).find(x=>x.skill===m.sk&&x.q!==m.q)||null;}catch(_){c=null;}}
  if(c)out.push({mode:c.mode,kind:'math',prompt:c.q,options:c.options,answer:c.answer,accept:c.accept,hint:c.hint,explain:c.explain,skill:c.skill,mq:c,warm:true,warmSk:m.sk,warmW:m.w});
 }
 return out;
}
function r37StartLevel(track,w,s,opts){
 opts=opts||{};
 const diff=r37DiffN(track),D=R37_DIFF[diff-1],ch=r37Char(),seed=r37Mem._seed!==undefined?r37Mem._seed:(Date.now()&0xfffff);
 let qs=track==='english'?r37EnQuestions(w,s,diff,seed):r37MathQuestions(track,w,s,diff,seed);
 if(opts.redo){
  const keep=new Set(opts.redo.map(m=>m.key));
  if(track==='english'){
   const rng=r37Rng(r37Hash('redo|'+seed+'|'+w+'|'+s)),stage=r37EnStage(w,s),pool=r37EnPool(),wp=r37EnWorldPool(w),near=wp.length>20?wp:pool;
   qs=opts.redo.map(m=>{const wd=r37Lookup(w,s,m.en);if(!wd)return null;const kinds=['zh2en','listen','fill','en2zh'].filter(k=>k!==m.kind);
    return r37EnBuild(wd,kinds[Math.floor(rng()*kinds.length)],{D,rng,near,unit:r37UnitOf(w,wd)||stage});}).filter(Boolean);
  }else qs=opts.redo.map(m=>JSON.parse(JSON.stringify(m.q)));
 }
 if(!qs.length){toast('這一關還未準備好。','bad');return;}
 const W=r37TrackWorlds(track)[w],u=track==='english'&&typeof LIB30!=='undefined'?LIB30.units.get(r37UnitId(w,s)):null,ou=track==='olympiad'&&r80Unit(w+1,(s>>1)+1),title=ou?`${r37Icon(r80Grade(w+1).icon)} ${esc(ou.title)} · 闖關 ${s&1?'②':'①'}`:(s===9?r37Icon('👹'):'')+r37Icon(W?.icon||'')+' '+(u?esc(u.title):(W?.name||'')+' · '+(s+1));
 const chunks=track==='english'&&!opts.redo?r37EnChunks(r37EnStage(w,s)):[];
 /* 30-second warm-up: up to 3 words missed in this world before (English, once a day per world) */
 const warm=[];
 if(track==='english'&&!opts.redo){
  const rng=r37Rng(r37Hash('warm|'+seed+'|'+w)),stage=r37EnStage(w,s),wp=r37EnWorldPool(w),near=wp.length>20?wp:r37EnPool();
  for(const x of r37WarmWords(w)){const wd=r37Lookup(w,s,x.en);if(!wd)continue;
   const q=r37EnBuild(wd,'zh2en',{D,rng,near,unit:r37UnitOf(w,wd)||stage});q.warm=true;warm.push(q);}
 }else if(track!=='english'&&!opts.redo)warm.push(...r37WarmMathQs(track,w,diff,seed));
 const first=qs[0]&&qs[0].ck!==undefined?qs[0].ck:0;
 r37P={kind:'level',track,w,s,diff,qs:[...warm,...qs],nq0:qs.length,nWarm:warm.length,i:0,res:[],hearts:D.hearts+(ch.perk==='heart'?1:0),maxHearts:D.hearts+(ch.perk==='heart'?1:0),shield:ch.perk==='shield',correct:0,hinted:0,
  phase:track==='english'&&!warm.length?'learn':'quiz',chunks,ck:first,learn:chunks[first]||[],sentence:track==='english'?r37UnitSentence(w,s):'',fb:null,hintShown:false,title,warmTitle:r37Icon('🔥')+(track==='english'?' 熱身 · 上次錯過的字':' 熱身 · 上次錯過的題型'),praise:'做得好！',
  log:[],miss:{},redo:!!opts.redo,exShown:false,nudge:null,warmEnd:warm.length?Date.now()+(track==='english'?30000:75000):0,key:r37Key()};
 if(warm.length){const o=r37Get(),wk=track==='english'?'en':track;(o.warm[wk]=o.warm[wk]||{})[w]=r37Day();r37Save();}
 else r37MaybeExample();
 r37Nav37('lp/play');
}
/* the first time a child meets a skill (maths / olympiad) a worked example comes first; skippable, one card per level */
function r37MaybeExample(){
 const P=r37P;if(!P||P.exShown||P.kind!=='level'||P.track==='english')return false;
 const q=P.qs[P.i],mq=q&&q.mq;if(!mq||!mq.skill||!mq.ex)return false;
 const o=r37Get(),seen=o.seen[P.track]=o.seen[P.track]||{};
 if(seen[mq.skill])return false;
 seen[mq.skill]=1;r37Save();P.exShown=true;P.exq=mq.ex;P.phase='example';return true;
}
function r37StartQuiz(track,mode){
 const diff=r37DiffN(track),qs=r37QuizQuestions(track,mode,R37_DIFF[diff-1].qs,diff,r37Mem._seed!==undefined?r37Mem._seed:(Date.now()&0xfffff));
 if(!qs.length){toast('這部分還未準備好。','bad');return;}
 r37P={kind:'quiz',key:r37Key(),track,mode,diff,qs,i:0,res:[],hearts:99,maxHearts:0,shield:false,correct:0,hinted:0,phase:'quiz',fb:null,hintShown:false,title:'',praise:'答對了！',log:[],miss:{},nq0:qs.length,nudge:null};
 r37Nav37('lp/play');
}
function r37Nav37(h){if(location.hash==='#'+h)render();else location.hash='#'+h;}
const r37QKey=q=>q.word?'w:'+q.word:q.mq?'m:'+q.mq.q:'a:'+q.answer;
/* the same word / skill again, three questions later, in a different form */
function r37Retest(P,q){
 const rng=r37Rng(r37Hash('rt|'+r37QKey(q)+'|'+P.i+'|'+P.log.length));
 if(q.word){
  const wd=r37Lookup(P.w,P.s,q.word);if(!wd)return null;
  const D=R37_DIFF[P.diff-1],wp=r37EnWorldPool(P.w),near=wp.length>20?wp:r37EnPool();
  const kinds=q.mode==='mcq'?['fill','fill-listen']:['listen','zh2en','en2zh'];
  const rq=r37EnBuild(wd,kinds[Math.floor(rng()*kinds.length)],{D,rng,near,unit:r37UnitOf(P.w,wd)||r37EnStage(P.w,P.s)});
  rq.retest=true;delete rq.ck;return rq;
 }
 if(q.mq&&globalThis.WQ37Math){
  const D=R37_DIFF[P.diff-1],used=new Set(P.qs.map(x=>x.mq&&x.mq.q)),avoid=[...used,...(r37Get().recent[P.track]||[])];
  for(let k=1;k<=12;k++){
   const c=WQ37Math.make(P.track,P.w,P.s,6,P.diff,(r37Hash('rt'+P.i+'|'+k+'|'+q.mq.q)>>>1),avoid).find(x=>x.skill===q.mq.skill&&!used.has(x.q));
   if(c){return {mode:c.mode,kind:'math',prompt:c.q,options:c.options,answer:c.answer,accept:c.accept,hint:c.hint,explain:c.explain,skill:c.skill,mq:c,retest:true,origKey:r37QKey(q)};}
  }
 }
 return null;
}
function r37NoteWrong(P,q,value){
 const o=r37Get(),now=Date.now(),w=P.w!==undefined?P.w:q.lw,s=P.s!==undefined?P.s:q.ls;
 if(q.word){
  const k=o.wrong.findIndex(x=>x.en===q.word);
  if(k>=0){o.wrong[k].n++;o.wrong[k].at=now;o.wrong[k].w=w;o.wrong[k].s=s;}
  else{o.wrong.push({en:q.word,zh:q.zhOf||'',w,s,at:now,n:1});if(o.wrong.length>60)o.wrong.shift();}
 }else if(q.mq){
  o.miss.push({t:P.track,sk:q.mq.skill||'',q:q.mq.q,a:q.answer,at:now,w,s});if(o.miss.length>60)o.miss.shift();
 }
 r37Save();
}
function r37RecordEn(P,q,value,ok,src,hinted){
 if(!isLoggedIn()||!q.word)return;
 try{
  const c=activeChild(),w=db.words.find(x=>x.childId===c?.id&&norm(x.en)===norm(q.word));if(!w)return;
  const lv0=w.reviewLevel,due0=w.reviewDue;
  recordAttempt(w,R37_EN_TYPE[q.kind]||'meaning',ok,value,q.answer,'闖關',{src,track:P.track,w:P.w!==undefined?P.w:q.lw,s:P.s!==undefined?P.s:q.ls,hinted:!!hinted});
  /* R3.19: a right answer given after the hint is assisted - it does not count towards "typed it on my own" and does not push the review date out */
  if(hinted&&ok){const a=db.attempts[db.attempts.length-1];if(a){a.assisted=true;w.reviewLevel=lv0;w.reviewDue=due0;}}
  save();
 }catch(_){}
}
function r37Answer(value){
 const P=r37P;if(!P||P.phase!=='quiz'||P.fb)return;
 const q=P.qs[P.i],v=String(value??'').trim();
 if(!v)return;
 const j=r37Judge(q,v);
 /* right value, wrong form (3/4 for 0.75, a lower-case name, a missing space, cats for cat): no heart lost, one more try */
 if(!j.ok&&(j.why==='form'||j.why==='case'||j.why==='space'||j.why==='inflect')&&!q.nudged&&(!q.dz||j.why==='case'||j.why==='space')){
  q.nudged=j.why;P.nudge={msg:j.msg||'答案的寫法不對，請再寫一次',why:j.why,value:v};render();
  const el=document.getElementById('r37-in');if(el){el.value='';el.focus({preventScroll:true});}
  return;
 }
 const hinted=!!P.hintShown;
 let credit=j.ok?(q.nudged==='case'?.5:1):0;
 /* R3.19: a right answer after the hint counts half and is not independent mastery (no 5 stars, cannot clear a retest, vocabulary stays "assisted") */
 if(credit>0&&hinted&&!q.dz)credit=Math.min(credit,.5);
 const ok=credit>0,hintRight=ok&&hinted&&!q.dz;
 P.nudge=null;
 P.fb={ok,value:v,part:ok&&credit<1&&!hintRight,syn:j.syn||'',hint:hintRight};P.res[P.i]=ok;
 if(hintRight){q.hintedRight=true;if(!q.warm)P.hintedRight=(P.hintedRight||0)+1;}
 if(q.dz)r37DzRecord(q,P.fb.value,ok);
 const key=q.origKey||r37QKey(q); /* a retest of a maths skill has a new stem, so it carries the key of the question it re-tests */
 if(!q.dz){
  P.log.push({key,ok,value:v,retest:!!q.retest,warm:!!q.warm});
  if(q.warm){
   const o=r37Get();
   if(q.mq){
    /* maths warm-up: an independent right answer takes the skill off the wrong list; a wrong one keeps it */
    if(ok&&!hintRight)o.miss=o.miss.filter(m=>!(m.t===P.track&&m.w===q.warmW&&m.sk===q.warmSk));
    r37Save();
   }else{
    const k=o.wrong.findIndex(x=>x.en===q.word);
    if(k>=0){if(ok&&!hintRight)o.wrong.splice(k,1);else if(!ok){o.wrong[k].n++;o.wrong[k].at=Date.now();}r37Save();}
    r37RecordEn(P,q,v,ok,'warm',hinted||!!q.nudged);
   }
  }else{
   if(!q.retest){P.correct+=credit;}
   if(P.track==='english')r37RecordEn(P,q,v,ok,q.retest?'retest':P.kind==='quiz'?'quiz':'lv',hinted||!!q.nudged);
   if(!ok){
    if(!P.miss[key])P.miss[key]={key,q,value:v,fixed:false,kind:q.kind,en:q.word||'',zh:q.zhOf||'',skill:q.mq&&q.mq.skill||'',n:0};
    P.miss[key].n++;
    if(P.kind==='level'||P.kind==='quiz')r37NoteWrong(P,q,v);
   }else if(q.retest&&P.miss[key]){if(hintRight)P.miss[key].hintedFix=true;else P.miss[key].fixed=true;}
   if(q.mq&&q.mq.q){const rc=r37Get().recent,a=rc[P.track]=rc[P.track]||[];a.push(q.mq.q);if(a.length>30)a.splice(0,a.length-30);r37Save();}
  }
 }else if(ok)P.correct+=credit;
 if(ok){if(!q.warm){r37Bump('correct');if(P.track==='english')r37Bump('enok');}playSfx('correct');r37Cheer();}
 else{
  if(P.kind==='level'&&!q.warm){if(P.shield){P.shield=false;P.fb.shielded=true;}else P.hearts--;}
  playSfx('wrong');
  if(!q.dz&&q.word){P.fb.lock=Date.now()+1500;setTimeout(()=>{if(r37P===P&&P.fb&&P.fb.lock&&P.phase==='quiz')render();},1560);}
  /* retest the same word / skill three questions later, once, in another form */
  if(P.kind==='level'&&!q.retest&&!q.warm&&!P.redo&&!q.dz){const rq=r37Retest(P,q);if(rq)P.qs.splice(Math.min(P.qs.length,P.i+4),0,rq);}
 }
 if(P.hintShown)P.hinted++;
 render();
 try{r37FxAnswer(ok);}catch(_){}
 if(!ok&&(q.dz||q.word))r37Speak(q.audio);
 if(ok){
  clearTimeout(r37Timer);
  const showWord=!q.dz&&q.word&&!q.warm&&R37_DIFF[P.diff-1].n<5,wait=P.fb.part||P.fb.syn||P.fb.hint?1400:showWord?880:750;
  r37Timer=setTimeout(()=>{if(r37P===P&&P.fb&&P.fb.ok)r37Next();},wait);
 }
}
function r37Cheer(){const P=r37P;P.praise=['做得好！','好叻！','正確！','太棒了！','答對了！'][Math.floor(P.correct)%5];}
function r37Next(){
 const P=r37P;if(!P||!P.fb)return;
 if(!P.fb.ok&&P.fb.lock>Date.now())return;
 clearTimeout(r37Timer);
 const was=P.qs[P.i];
 P.i++;P.fb=null;P.hintShown=false;P.nudge=null;
 /* warm-up is timed (30 s) and skipped once it runs out */
 if(was&&was.warm&&P.warmEnd&&Date.now()>P.warmEnd)while(P.i<P.qs.length&&P.qs[P.i].warm)P.i++;
 if(P.hearts<=0||P.i>=P.qs.length){r37Finish();return;}
 const nq=P.qs[P.i];
 if(was&&was.warm&&!nq.warm&&P.chunks&&P.chunks.length&&nq.ck!==undefined){P.ck=nq.ck;P.learn=P.chunks[nq.ck]||[];P.phase='learn';render();return;}
 const ck=nq.ck;
 if(P.chunks&&ck!==undefined&&ck!==P.ck&&P.chunks[ck]){P.ck=ck;P.learn=P.chunks[ck];P.phase='learn';}
 else if(!nq.warm)r37MaybeExample();
 render();
}
function r37Finish(){
 const P=r37P,D=R37_DIFF[P.diff-1],total=P.nq0||P.qs.length,correct=P.correct;
 const failedLife=P.hearts<=0&&P.kind==='level',ratio=total?correct/total:0;
 const missed=Object.values(P.miss||{});
 const unfixed=missed.filter(m=>!m.fixed);
 let stars=failedLife?Math.min(1,r37StarsFor(correct,total,P.hinted>0)):r37StarsFor(correct,total,P.hinted>0);
 let passed,why='';
 if(P.kind==='level'){
  if(P.redo)passed=!failedLife&&unfixed.length===0&&missed.length===0&&correct>=total;
  else{passed=!failedLife&&ratio>=D.pass&&unfixed.length===0;if(!failedLife&&ratio>=D.pass&&unfixed.length)why='retest';}
 }else passed=ratio>=(P.kind==='dz'?.75:D.pass);
 /* maths / olympiad: a skill missed twice, or a level not passed, points to the lesson */
 const lessons=[];
 if(P.kind==='level'&&P.track!=='english'&&!P.redo){
  const cnt={};for(const e of P.log)if(!e.ok&&!e.warm){const m=P.miss[e.key];const sk=m&&m.skill;if(sk)cnt[sk]=(cnt[sk]||0)+1;}
  const lessonOf=sk=>{try{return WQ37Math.skillLesson?WQ37Math.skillLesson(sk):'';}catch(_){return '';}};
  /* R3.19 T03: a skill with no lesson of its own gets 再看例題 (the worked example again) instead of nothing */
  const exOf=sk=>{const m=Object.values(P.miss).find(m=>m.skill===sk&&m.q&&m.q.mq&&m.q.mq.ex);return m?m.q.mq.ex:null;};
  const ranked=Object.entries(cnt).sort((a,b)=>b[1]-a[1]).map(([sk,n])=>({sk,n,code:lessonOf(sk),ex:exOf(sk)})).filter(x=>x.code||x.ex);
  for(const x of ranked){if((x.n>=2||!passed)&&!lessons.some(l=>x.code?l.code===x.code:l.sk===x.sk))lessons.push(x);if(lessons.length>=2)break;}
 }
 let coins=0,newCard='';
 if(P.kind==='level'&&!P.redo){
  const o=r37Get(),k=r37LvKey(P.track,P.w,P.s),old=o.lv[k]||{best:0},boss=P.s===9;
  const e=o.lv[k]=Object.assign({},old,{best:Math.max(old.best||0,stars),at:new Date().toISOString()});
  const firstPass=passed&&!old.passed;if(passed)e.passed=true;
  if(firstPass&&P.track==='olympiad'&&(P.s&1)){const ou=r80Unit(P.w+1,(P.s>>1)+1);if(ou)newCard=ou.id;}
  if(stars===5&&!old.five){e.five=true;coins+=boss?3:1;if(r37Char().perk==='coin')coins+=1;r37Bump('five');}
  if(firstPass&&boss)coins+=2;
  if(firstPass)r37Bump('levels');
  r37Save();
 }else if(P.kind!=='level'){
  if(P.kind==='dz')r37DzSave(P,stars,passed);
  const d=r37Get().day;d.qc=d.qc||0;
  if(stars===5&&d.qc<3){coins+=1;d.qc++;if(r37Char().perk==='coin')coins+=1;r37Bump('five');}
  r37Save();
 }
 if(!isLoggedIn())coins=0;
 if(coins)r37AddCoins(coins);
 const list=missed.map(m=>m.en?{en:m.en,zh:m.zh,you:m.value,fixed:m.fixed,kind:m.kind,key:m.key}:{q:m.q.prompt,svg:m.q.mq&&m.q.mq.svg||'',answer:m.q.answer,you:m.value,fixed:m.fixed,key:m.key,skill:m.skill});
 P.result={stars,passed,card:newCard,correct:Math.round(correct*2)/2,total,coins,missed:list,lessons,why,rvNext:P.rvNext||0,hintedRight:P.hintedRight||0,hintedFix:missed.filter(m=>m.hintedFix&&!m.fixed).length};P.missed=missed;P.phase='result';playSfx(passed?'finish':'wrong');render();
}
function r37Exit(){
 const P=r37P;r37P=null;clearTimeout(r37Timer);try{speechSynthesis.cancel();}catch(_){}
 if(P&&P.kind==='level')location.hash=P.track==='olympiad'?'#oly/'+(P.w+1):'#lv/'+P.track;else location.hash=P&&P.kind==='dz'?'#dz':P?'#p/'+P.track:'#kid';
}
function r37Speak(t){try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang='en-GB';u.rate=.85;const v=typeof britishVoices==='function'?britishVoices()[0]:null;if(v)u.voice=v;speechSynthesis.speak(u);}catch(_){}}
/* "只重做錯的": only the questions missed this time (English words in another form; maths the same questions) */
function r37Redo(){
 const P=r37P;if(!P||P.kind!=='level'||!P.missed||!P.missed.length)return;
 const items=P.missed.map(m=>({key:m.key,en:m.en,kind:m.kind,q:m.q}));
 const track=P.track,w=P.w,s=P.s;
 r37StartLevel(track,w,s,{redo:items});
}
/* "看課堂": open the HK-M4 chapter (maths) or the 思維之塔 topic (olympiad) for this skill */
function r37OpenLesson(code,track){
 try{
  if(!code)return false;
  { const m=/^oly:p(\d)-(\d)$/.exec(code);if(m){r37P=null;clearTimeout(r37Timer);location.hash='#oly/'+m[1]+'/'+m[2]+'/learn';return true;} }
  if(track==='olympiad'||/^O-/.test(code)){
   const A=globalThis.WQMathApp;if(!A)return false;A.open('olympiad');
   const root=document.getElementById('wqm-app-host')?.shadowRoot;if(!root)return true;
   const lv=(/-L(\d)-/.exec(code)||[])[1];
   if(lv){root.querySelector(`[data-action="olylevel:${lv}"]`)?.click();}
   (document.getElementById('wqm-app-host')?.shadowRoot||root).querySelector(`[data-action="lesson:${code}"]`)?.click();
   return true;
  }
  const A=globalThis.WQCourseApp;if(!A)return false;
  A.open('normal');
  const root=document.getElementById('wq-course-host')?.shadowRoot;if(!root)return true;
  const g=String(code)[0];
  root.querySelector(`[data-c1="grade:${g}"]`)?.click();
  (document.getElementById('wq-course-host').shadowRoot).querySelector(`[data-c1="learn:${code}:1"]`)?.click();
  return true;
 }catch(_){return false;}
}
/* ---------------------------------------------------------------------------------------------- parent */
/* R3.19 T02: 闖關錯題 - what the child missed in 闖關 / 考考自己 (English words with count, maths stems with the answer and count). Shown on the report page and the parent progress tab */
function r37WrongHTML(){
 const o=r37Get(),by={};
 const en=o.wrong.filter(x=>x.en).slice().sort((a,b)=>(b.n-a.n)||(b.at-a.at)).slice(0,12);
 for(const m of o.miss){const k=m.t+'|'+m.q,b=by[k]=by[k]||{t:m.t,q:m.q,a:m.a,n:0,at:0};b.n++;b.at=Math.max(b.at,m.at||0);}
 const ma=Object.values(by).sort((a,b)=>(b.n-a.n)||(b.at-a.at));
 const grp=(title,items)=>items.length?`<h3>${title}</h3><ul>${items.join('')}</ul>`:'';
 const enLi=en.map(x=>`<li><b lang="en">${esc(x.en)}</b><span>${esc(x.zh||'')}</span><em>${x.n} 次</em></li>`);
 const mLi=t=>ma.filter(x=>x.t===t).slice(0,10).map(x=>`<li class="m"><span class="r319-q">${esc(x.q)}</span><span class="r319-a">答案：<b>${esc(x.a)}</b></span><em>${x.n} 次</em></li>`);
 const none=!enLi.length&&!ma.length;
 return `<section class="r319-wrong" id="r319-wrong" aria-label="闖關錯題"><h2>闖關錯題</h2>${none?'<p class="r319-empty">暫時沒有闖關錯題。</p>':grp('英文',enLi)+grp('數學',mLi('math'))+grp('奧數',mLi('olympiad'))}</section>`;
}
/* the report page is the old dictation report: append the card once after it has rendered */
function r37ReportExtra(route){
 if(route!=='report')return;
 const root=document.getElementById('app');if(!root||root.querySelector('#r319-wrong'))return;
 const stats=root.querySelector('.stats');if(!stats)return;
 stats.insertAdjacentHTML('afterend',r37WrongHTML());
}
function r37ParentHub(){
 const o=r37Get(),tab=r37Mem._ptab||'diff',c=activeChild();
 const tabs=[['diff','🎚️','難度'],['prog','📊','進度'],['kids','👦','孩子'],['data','🛠️','工具']].map(([k,i,l])=>`<button type="button" class="r37-ptab ${tab===k?'on':''}" data-r37="ptab" data-k="${k}" aria-label="${l}">${r37Icon(i)}<b>${l}</b></button>`).join('');
 const today=`<div class="r37-card r37-today"><h2>${r37Icon('📅')}今日學習</h2><div class="r37-todayrow"><span>${r37Icon('🏆')}<b>${o.day.levels}</b><small>過關</small></span><span>${r37Icon('✅')}<b>${o.day.correct}</b><small>答對</small></span><span>${r37Icon('🎯')}<b>${o.day.fps||0}</b><small>獵場</small></span></div></div>`;
 let body='';
 if(tab==='diff'){
  const sub=['english','math','olympiad'].includes(r37Mem._dsub)?r37Mem._dsub:'english',cur=o.diffs[sub],T=R37_TRACKS[sub];
  const subs=['english','math','olympiad'].map(k=>`<button type="button" class="r37-dsub ${sub===k?'on':''}" data-r37="dsub" data-k="${k}" aria-pressed="${sub===k}"><span aria-hidden="true">${r37Icon(R37_TRACKS[k].icon)}</span><b>${R37_TRACKS[k].name}</b><small>${r37Icon(R37_DIFF[o.diffs[k]-1].icon)}${o.diffs[k]}</small></button>`).join('');
  const note=sub==='english'
   ?`<li><b>1</b> 3 個選項、填充題先顯示首字母；<b>2</b> 4 個選項、填充題顯示字母空格</li><li><b>3</b> 標準：沒有字形提示</li><li><b>4–5</b> 選項改為拼法相近的字、填充題更多；<b>5</b> 沒有提示${cur===5?'（目前）':''}</li><li>題數是每個生字至少考 1 題；答錯的詞 3 題後換題型補考，合格＝每個詞最後一次答對，星星按第一次答對率計</li>`
   :`<li><b>題數、心數、合格線</b>跟上面一樣；難度改變的是<b>數字大小與步驟數</b></li><li><b>1–2</b> 較小的數、較少步驟</li><li><b>3</b> 標準（${sub==='olympiad'?'奧數':'數學'}年級內常見大小）</li><li><b>4–5</b> 較大的數、多一兩步，${sub==='olympiad'?'更像比賽題':'接近下一年級'}</li>`;
  body=`<div class="r37-card"><h2>${r37Icon('🎚️')}難度</h2><div class="r37-dsubs" role="tablist">${subs}</div><div class="r37-diffs">${R37_DIFF.map(d=>`<button type="button" class="r37-df ${cur===d.n?'on':''}" data-r37="diff" data-t="${sub}" data-n="${d.n}"><span class="r37-dfi">${r37Icon(d.icon)}</span><b>${d.n} ${d.name}</b><small>${sub==='english'?'≥'+Math.max(d.qs,8):d.qs} 題 · <span class="r37-hs" aria-label="${d.hearts} 顆心">${r37Icon('❤️').repeat(d.hearts)}</span> · ${Math.round(d.pass*100)}%</small></button>`).join('')}</div>
  <ul class="r37-dl">${note}</ul></div>${today}`;
 }else if(tab==='prog'){
  body=['english','math','olympiad'].map(t=>{const q=r37TrackProgress(t),T=R37_TRACKS[t];return `<div class="r37-card r37-pr"><div class="r37-prh"><span>${r37Icon(T.icon)}</span><b>${T.name}</b><em>${q.done}/${q.total}</em></div><div class="r37-bar2"><i style="width:${Math.round(q.done/Math.max(1,q.total)*100)}%"></i></div><div class="r37-prs">${r37Stars(Math.min(5,Math.round(q.stars/Math.max(1,q.max)*5)))}<b>${q.stars}/${q.max}</b></div></div>`;}).join('')+r37WrongHTML()+(c?`<div class="r37-card"><div class="r37-prh"><span>${r37Icon('🪙')}</span><b>${r37Coins()}</b><span>${r37Icon('🔥')}</span><b>${o.day.levels}</b><span>${r37Icon('✅')}</span><b>${o.day.correct}</b></div></div>`:'');
 }else if(tab==='kids'){
  body=`<div class="r37-tiles">${r37A('👦','孩子','#children')+r37A('📝','默書範圍','#ranges')+r37A('📊','學習報告','#report')+r37A('🏆','學習計劃','#learning-plan')}</div>`;
 }else{
  body=`<div class="r37-tiles">${r37A('⚙️','設定／備份','#settings')+r37A('🔐',isLoggedIn()?'登出':'登入','#login')+r37A('📴','離線教材','#offline')+r37A('🖼️','圖片來源','#credits')+(isTestAdmin()?r37A('🧪','測試中心','#admin'):'')}</div>`;
 }
 return `<section class="r37-hub" style="--h:46">${r37Top()}<div class="r37-hero"><span class="r37-bigorb" style="--tilt:16deg">${r37OrbHTML('parent')}</span><h1>家長星</h1>${r37Cap(r37Icon(r37Diff().icon)+`<b>難度 ${o.diff}</b>`,'目前難度')}</div><div class="r37-ptabs" role="tablist">${tabs}</div>${body}${r37Nav('p/parent')}</section>`;
}
