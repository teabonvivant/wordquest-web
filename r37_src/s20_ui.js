/* R3.7 s20 - planet shell views: galaxy home, planet hubs, level maps, play screen, parent dashboard. */
const R37_PLANETS=[
 {id:'english',name:'英文星',icon:'🔤',hue:205,x:20,y:27},
 {id:'math',name:'數學星',icon:'🔢',hue:155,x:50,y:15},
 {id:'olympiad',name:'奧數星',icon:'🧩',hue:272,x:80,y:27},
 {id:'games',name:'遊戲星',icon:'🎮',hue:28,x:80,y:73},
 {id:'dictation',name:'默書星',icon:'✏️',hue:340,x:50,y:85},
 {id:'parent',name:'家長星',icon:'👪',hue:46,x:20,y:73}
];
const r37Planet=id=>R37_PLANETS.find(p=>p.id===id);
const r37B=(icon,label,attrs,cls='')=>`<button type="button" class="r37-tile ${cls}" ${attrs}><span class="r37-ti" aria-hidden="true">${r37Icon(icon)}</span><span class="r37-tn">${label}</span></button>`;
const r37A=(icon,label,href,cls='')=>`<a class="r37-tile ${cls}" href="${href}"><span class="r37-ti" aria-hidden="true">${r37Icon(icon)}</span><span class="r37-tn">${label}</span></a>`;
const r37Stars=(n,max=5)=>'<span class="r37-st" aria-label="'+n+' 顆星">'+Array.from({length:max},(_,i)=>`<i class="${i<n?'on':''}">★</i>`).join('')+'</span>';
function r37Top(extra=''){
 const c=activeChild(),ch=r37Char();
 return `<div class="r37-bar"><a class="r37-back" href="#kid" aria-label="回星系">${r37Icon('🪐')}</a><div class="r37-who"><span class="r37-av">${ch.icon}</span><span>${esc(c?.name||'小朋友')}</span></div>${extra}<span class="r37-coin" title="金幣">🪙 ${isLoggedIn()?r37Coins():0}</span></div>`;
}
function r37Nav(active){
 const items=[['kid','🪐','星系'],['p/english','🔤','英文'],['p/math','🔢','數學'],['p/olympiad','🧩','奧數'],['p/games','🎮','遊戲'],['p/parent','👪','家長']];
 return `<nav class="r37-nav" aria-label="主選單">${items.map(([h,i,t])=>`<a href="#${h}" class="${active===h?'on':''}" ${active===h?'aria-current="page"':''}><span aria-hidden="true">${r37Icon(i)}</span><b>${t}</b></a>`).join('')}</nav>`;
}
function r37Home(){
 const m=r37Mission(),day=r37Get().day,doneN=m.filter(x=>day.claimed.includes(x.id)).length,prog={english:r37TrackProgress('english'),math:r37TrackProgress('math'),olympiad:r37TrackProgress('olympiad')};
 const ring=p=>{const q=prog[p.id];if(!q)return '';return `<span class="r37-pp" style="--p:${Math.round(q.done/Math.max(1,q.total)*100)}"><b>${q.done}/${q.total}</b></span>`;};
 return `<section class="r37-gx">${r37Top()}
 <div class="r37-sys"><div class="r37-sun" aria-hidden="true"><span>★</span><small>學霸星球</small></div><i class="r37-orbit o1"></i><i class="r37-orbit o2"></i><i class="r37-orbit o3"></i>
 ${R37_PLANETS.map((p,i)=>`<a class="r37-planet" href="#p/${p.id}" data-pl="${p.id}" style="--h:${p.hue};--x:${p.x}%;--y:${p.y}%;--d:${(i*.7).toFixed(1)}s"><span class="r37-orb"><em aria-hidden="true">${r37Icon(p.icon)}</em></span><span class="r37-pn">${p.name}</span>${ring(p)}</a>`).join('')}</div>
 <a class="r37-quest" href="#p/games"><span aria-hidden="true">🎁</span><b>今日任務</b><span class="r37-pips2">${m.map(x=>`<i class="${day.claimed.includes(x.id)?'on':''}"></i>`).join('')}</span><span>${doneN}/3</span></a>
 ${r37Nav('kid')}</section>`;
}
function r37Hub(id){
 const p=r37Planet(id);if(!p)return r37Home();
 let tiles='',extra='';
 const quiz=t=>r37B('✅','選擇題',`data-r37="quiz" data-track="${t}" data-mode="mcq"`,'blue')+r37B('✍️','填充題',`data-r37="quiz" data-track="${t}" data-mode="fill"`,'green');
 if(id==='english'){
  const q=r37TrackProgress('english');
  tiles=r37A('🏆','闖關','#lv/english','gold big')+quiz('english')+r37A('📚','課堂','#classroom')+r37A('🧰','字詞工房','#assembly')+r37A('🔊','拼音','#learning')+r37A('📖','詞庫','#library');
  extra=`<div class="r37-prog">${r37Stars(Math.min(5,Math.round(q.stars/Math.max(1,q.max)*5)))}<b>${q.done}/${q.total}</b></div>`;
 }else if(id==='math'){
  tiles=r37A('🏆','闖關','#lv/math','gold big')+quiz('math')+r37B('🏝️','數學島','data-wqm-open="home"')+r37B('🧮','教具工房','data-wqm-open="tools"');
  extra=`<div class="r37-prog">${r37Stars(Math.min(5,Math.round(r37TrackProgress('math').stars/Math.max(1,r37TrackProgress('math').max)*5)))}<b>${r37TrackProgress('math').done}/${r37TrackProgress('math').total}</b></div>`;
 }else if(id==='olympiad'){
  tiles=r37A('🏆','闖關','#lv/olympiad','gold big')+quiz('olympiad')+r37B('🗼','思維之塔','data-wqm-open="olympiad"')+r37B('🃏','策略卡','data-wqm-open="cards"');
  extra=`<div class="r37-prog">${r37Stars(Math.min(5,Math.round(r37TrackProgress('olympiad').stars/Math.max(1,r37TrackProgress('olympiad').max)*5)))}<b>${r37TrackProgress('olympiad').done}/${r37TrackProgress('olympiad').total}</b></div>`;
 }else if(id==='dictation'){
  tiles=r37B('▶️','今日默書','data-act="start-daily"','gold big')+r37B('✅','選擇題','data-act="start-practice" data-type="mcq"','blue')+r37B('✍️','填充題','data-act="start-practice" data-type="fill"','green')+r37B('🔁','補練錯題','data-act="practice-weak"')+r37A('📝','默書範圍','#ranges')+r37A('📊','報告','#report');
 }else if(id==='games'){
  return r37GamesHub();
 }else if(id==='parent'){
  return r37ParentHub();
 }
 return `<section class="r37-hub" style="--h:${p.hue}">${r37Top()}<div class="r37-hero"><span class="r37-bigorb"><em aria-hidden="true">${r37Icon(p.icon)}</em></span><h1>${p.name}</h1>${extra}</div><div class="r37-tiles">${tiles}</div>${r37Nav('p/'+id)}</section>`;
}
function r37GamesHub(){
 const m=r37Mission(),d=r37Get().day,ch=r37Char();
 const quest=m.map(x=>{const v=Math.min(x.goal,d[x.key]||0),ok=v>=x.goal,got=d.claimed.includes(x.id);return `<div class="r37-mq ${ok?'ok':''}"><span aria-hidden="true">${x.icon}</span><b>${x.name}</b><i style="--p:${Math.round(v/x.goal*100)}%"></i><em>${v}/${x.goal}</em>${got?'<span class="r37-got">✓</span>':ok?`<button type="button" data-r37="claim" data-id="${x.id}">🎁 +${x.coins}</button>`:`<span class="r37-rw">🪙${x.coins}</span>`}</div>`;}).join('');
 return `<section class="r37-hub" style="--h:28">${r37Top()}<div class="r37-hero"><span class="r37-bigorb"><em aria-hidden="true">${r37Icon('🎮')}</em></span><h1>遊戲星</h1></div>
 <div class="r37-tiles r37-gt">${r37A('🕹️','遊戲街機','#game','gold big')+r37A('🏃','星際跑酷','#lv/runner','green big')+r37A('🎯','字母獵場','#fps','pink big')+r37B(ch.icon,'角色','data-r37="chars"','blue big')}</div>
 <div class="r37-card r37-quests"><h2>🎁 今日任務</h2>${quest}</div>${r37Nav('p/games')}</section>`;
}
function r37Chars(){
 const o=r37Get(),coins=r37Coins();
 return `<section class="r37-hub" style="--h:28">${r37Top('<a class="r37-back2" href="#p/games">←</a>')}<div class="r37-hero"><h1>角色圖鑑</h1></div><div class="r37-chars">${R37_CHARS.map(c=>{const own=o.chars.includes(c.id),on=o.pick===c.id;return `<div class="r37-char ${on?'on':''} ${own?'':'lock'}"><span class="r37-cav">${c.icon}</span><b>${c.name}</b><small>${c.desc||'　'}</small>${on?'<span class="r37-got">使用中</span>':own?`<button type="button" data-r37="pick" data-id="${c.id}">選用</button>`:`<button type="button" data-r37="buy" data-id="${c.id}" ${coins>=c.cost&&isLoggedIn()?'':'disabled'}>🪙 ${c.cost}</button>`}</div>`;}).join('')}</div>${isLoggedIn()?'':'<p class="r37-note">登入後才可以收集角色</p>'}${r37Nav('p/games')}</section>`;
}
function r37LevelMap(t,wIdx){
 const worlds=r37TrackWorlds(t),T=R37_TRACKS[t];
 if(!worlds.length)return `<section class="r37-hub">${r37Top()}<div class="r37-card"><h2>${T.name}闖關準備中</h2></div>${r37Nav('p/'+t)}</section>`;
 let w=Number.isInteger(wIdx)?wIdx:r37Mem._w?.[t];if(!Number.isInteger(w)){w=0;for(let i=0;i<worlds.length;i++)if(r37StageOpen(t,i,0))w=i;}
 w=Math.max(0,Math.min(worlds.length-1,w));(r37Mem._w=r37Mem._w||{})[t]=w;
 const diff=r37Diff(),W=worlds[w],wOpen=r37StageOpen(t,w,0),ut=x=>t==='english'&&typeof LIB30!=='undefined'?(LIB30.units.get(W.units?.[x])?.title||''):'';
 const nodes=Array.from({length:10},(_,s)=>{const e=r37Entry(t,w,s),open=r37StageOpen(t,w,s),cur=open&&!e?.passed&&(s===0||r37Entry(t,w,s-1)?.passed||adminUnlocks()),boss=s===9;
  return `<button type="button" class="r37-node ${e?.passed?'done':''} ${cur?'cur':''} ${open?'':'lock'} ${boss?'boss':''}" ${open?`data-r37="level" data-track="${t}" data-w="${w}" data-s="${s}"`:'disabled'} aria-label="${boss?'魔王關':'第 '+(s+1)+' 關'}${ut(s)?'：'+esc(ut(s)):''}"><span class="r37-nn">${open?(boss?'👹':s+1):'🔒'}</span>${ut(s)?`<span class="r37-nu">${esc(ut(s))}</span>`:''}${open&&e?r37Stars(e.best):'<span class="r37-st ph"></span>'}</button>`;}).join('');
 return `<section class="r37-hub r37-map" style="--h:${t==='english'?205:t==='math'?155:272}">${r37Top('<a class="r37-back2" href="#p/'+t+'">←</a>')}
 <div class="r37-worlds" role="tablist">${worlds.map((x,i)=>`<button type="button" role="tab" class="r37-wtab ${i===w?'on':''} ${r37StageOpen(t,i,0)?'':'lock'}" data-r37="world" data-track="${t}" data-w="${i}" ${r37StageOpen(t,i,0)?'':'disabled'}><span aria-hidden="true">${r37StageOpen(t,i,0)?x.icon||'🌍':'🔒'}</span><b>${i+1}</b></button>`).join('')}</div>
 <div class="r37-wtitle"><span class="r37-wic" aria-hidden="true">${W.icon||'🌍'}</span><div><h1>${esc(W.name)}</h1><small>${r37WorldDone(t,w)}/10 · ${r37Stars(Math.min(5,Math.round(r37WorldStars(t,w)/50*5)))}</small></div>${t==='english'?'<a class="r37-dchip r37-lk" href="#classroom" aria-label="課堂">📚</a>':`<button type="button" class="r37-dchip r37-lk" data-wqm-open="${t==='olympiad'?'olympiad':'normal'}" aria-label="${t==='olympiad'?'思維之塔':'數學群島'}">${t==='olympiad'?'🗼':'🏝️'}</button>`}<span class="r37-dchip" title="難度">${diff.icon} ${diff.n}</span></div>
 <div class="r37-path">${nodes}</div>${r37Nav('p/'+t)}</section>`;
}
const R37_RUN_WORLDS=[{name:'彩虹草原',icon:'🌈'},{name:'迷霧森林',icon:'🌲'},{name:'金沙沙漠',icon:'🏜️'},{name:'火焰火山',icon:'🌋'},{name:'星空宇宙',icon:'🌌'}];
function r37RunOpen(w,s){if(adminUnlocks())return true;if(s>0)return !!r37Entry('runner',w,s-1)?.passed;if(w>0)return !!r37Entry('runner',w-1,2)?.passed;return true;}
function r37RunMap(){
 let w=Number.isInteger(r37Mem._rw)?r37Mem._rw:0;if(!Number.isInteger(r37Mem._rw))for(let i=0;i<5;i++)if(r37RunOpen(i,0))w=i;
 const W=R37_RUN_WORLDS[w],ch=r37Char();
 const nodes=[0,1,2].map(s=>{const e=r37Entry('runner',w,s),open=r37RunOpen(w,s),cur=open&&!e?.passed;return `<button type="button" class="r37-node ${e?.passed?'done':''} ${cur?'cur':''} ${open?'':'lock'} ${s===2?'boss':''}" ${open?`data-r37="run" data-w="${w}" data-s="${s}"`:'disabled'} aria-label="第 ${s+1} 關"><span class="r37-nn">${open?(s===2?'🐲':s+1):'🔒'}</span>${open&&e?r37Stars(e.best):'<span class="r37-st ph"></span>'}</button>`;}).join('');
 return `<section class="r37-hub r37-map" style="--h:28">${r37Top('<a class="r37-back2" href="#p/games">←</a>')}
 <div class="r37-worlds" role="tablist">${R37_RUN_WORLDS.map((x,i)=>`<button type="button" role="tab" class="r37-wtab ${i===w?'on':''} ${r37RunOpen(i,0)?'':'lock'}" data-r37="rworld" data-w="${i}" ${r37RunOpen(i,0)?'':'disabled'}><span aria-hidden="true">${r37RunOpen(i,0)?x.icon:'🔒'}</span><b>${i+1}</b></button>`).join('')}</div>
 <div class="r37-wtitle"><span class="r37-wic" aria-hidden="true">${W.icon}</span><div><h1>${W.name}</h1><small>${[0,1,2].filter(s=>r37Entry('runner',w,s)?.passed).length}/3</small></div><button type="button" class="r37-dchip r37-lk r37-endless" data-r37="run-endless" aria-label="無盡模式">♾️</button><span class="r37-dchip">${ch.icon}</span></div>
 <div class="r37-path n3">${nodes}</div>${r37Nav('p/games')}</section>`;
}
/* ---------------------------------------------------------------------------------------------- play */
let r37P=null,r37Timer=0;
function r37Hearts(){return Array.from({length:r37P.maxHearts},(_,i)=>`<i class="${i<r37P.hearts?'on':''}">❤</i>`).join('');}
function r37Pips(){return r37P.qs.map((q,i)=>`<i class="${i<r37P.i?(r37P.res[i]?'ok':'bad'):i===r37P.i?'cur':''}"></i>`).join('');}
function r37Play(){
 const P=r37P;if(!P)return r37Home();
 const D=R37_DIFF[P.diff-1],top=`<header class="r37-ptop"><button type="button" class="r37-x" data-r37="exit" aria-label="離開">✕</button><div class="r37-pips">${P.phase==='quiz'?r37Pips():''}</div>${P.kind==='level'?`<div class="r37-hearts" aria-label="生命">${r37Hearts()}</div>`:`<span class="r37-dchip">${D.icon}</span>`}</header>`;
 if(P.phase==='learn'){
  return `<section class="r37-play">${top}<div class="r37-stage"><h2 class="r37-ptitle">${P.title}</h2>${P.chunks&&P.chunks.length>1?`<div class="r37-cks" aria-label="第 ${P.ck+1} 組，共 ${P.chunks.length} 組">${P.chunks.map((c,i)=>`<i class="${i<P.ck?'done':i===P.ck?'on':''}">${c.length}</i>`).join('')}</div>`:''}<div class="r37-learn">${P.learn.map(w=>`<button type="button" class="r37-wc" data-r37="speak" data-t="${esc(w.en)}"><span class="r37-wem" aria-hidden="true">${r37WordArt(w.en)}</span><b lang="en">${esc(w.en)}</b><span>${esc(w.zh)}</span></button>`).join('')}</div><button type="button" class="r37-go" data-r37="learn-go">▶ 闖關</button></div></section>`;
 }
 if(P.phase==='result')return r37Result();
 const q=P.qs[P.i],fb=P.fb;
 let body='';
 const aud=q.audio?`<button type="button" class="r37-spk" data-r37="speak" data-t="${esc(q.audio)}" aria-label="聽">${r37Icon('🔊')}</button>`:'';
 if(q.mode==='mcq'){
  body=`<div class="r37-q">${q.emoji?`<div class="r37-qe" aria-hidden="true">${q.word?r37WordArt(q.word):q.emoji}</div>`:''}<div class="r37-qt ${String(q.prompt).length>14?'long':''}" ${q.kind==='en2zh'?'lang="en"':''}>${esc(q.prompt)}</div>${aud}</div><div class="r37-opts n${q.options.length}">${q.options.map((o,i)=>{const mark=fb?(o===q.answer?'ok':o===fb.value?'bad':''):'';return `<button type="button" class="r37-opt ${mark}" data-r37="pick-opt" data-v="${esc(o)}" ${fb?'disabled':''}><kbd>${i+1}</kbd><span ${q.lang==='en'?'lang="en"':''}>${esc(o)}</span></button>`;}).join('')}</div>`;
 }else{
  body=`<div class="r37-q">${q.emoji?`<div class="r37-qe" aria-hidden="true">${q.word?r37WordArt(q.word):q.emoji}</div>`:''}<div class="r37-qt">${esc(q.prompt)}</div>${aud}</div>${q.scaffold?`<div class="r37-sc" lang="en">${esc(q.scaffold)}</div>`:''}<form class="r37-fill" data-r37-form="1"><input id="r37-in" type="text" inputmode="${q.kind==='math'?'decimal':'text'}" autocomplete="off" autocapitalize="off" autocorrect="off" spellcheck="false" ${fb?'disabled':''} value="${fb?esc(fb.value):''}" aria-label="答案" placeholder="…"><button type="submit" class="r37-ok" ${fb?'disabled':''}>確定</button></form>`;
 }
 const foot=fb?`<div class="r37-fb ${fb.ok?'ok':'bad'}" role="status"><span aria-hidden="true">${fb.ok?'🎉':'💭'}</span><div><b>${fb.ok?P.praise:'答案：'+esc(q.answer)}</b>${!fb.ok&&q.explain?`<small>${esc(q.explain)}</small>`:''}</div><button type="button" class="r37-next" data-r37="next">▶</button></div>`
  :`<div class="r37-pfoot">${D.hint&&q.hint?`<button type="button" class="r37-hintb" data-r37="hint">💡</button>`:''}${P.hintShown?`<span class="r37-hint">${esc(q.hint)}</span>`:''}</div>`;
 return `<section class="r37-play">${top}<div class="r37-stage ${q.mode==='fill'?'fill':''} ${fb?(fb.ok?'ok':'shake'):''}">${P.kind==='level'?`<div class="r37-ptitle">${P.title}</div>`:''}${body}</div>${foot}</section>`;
}
function r37Result(){
 const P=r37P,r=P.result;
 const coins=r.coins?`<div class="r37-rc">🪙 +${r.coins}</div>`:'';
 const nextOk=P.kind==='level'&&r.passed&&(P.s<9||P.w<r37TrackWorlds(P.track).length-1);
 return `<section class="r37-play"><div class="r37-result ${r.passed?'win':'lose'}"><div class="r37-rb" aria-hidden="true">${r.passed?(P.s===9?'🏆':'🎉'):'💫'}</div>${r37Stars(r.stars)}<div class="r37-rs">${r.correct}/${P.qs.length}</div>${coins}${P.kind==='level'&&!r.passed?'<p class="r37-rn">再試一次！</p>':''}
 <div class="r37-ra">${nextOk?'<button type="button" class="r37-go" data-r37="level-next">▶</button>':''}<button type="button" class="r37-sec" data-r37="retry">↻</button><button type="button" class="r37-sec" data-r37="exit">🗺️</button></div></div></section>`;
}
function r37StartLevel(track,w,s){
 const diff=r37Get().diff,D=R37_DIFF[diff-1],ch=r37Char(),seed=r37Mem._seed!==undefined?r37Mem._seed:(Date.now()&0xfffff);
 const qs=track==='english'?r37EnQuestions(w,s,diff,seed):r37MathQuestions(track,w,s,diff,seed);
 if(!qs.length){toast('這一關還未準備好。','bad');return;}
 const W=r37TrackWorlds(track)[w],u=track==='english'&&typeof LIB30!=='undefined'?LIB30.units.get(r37UnitId(w,s)):null,title=(s===9?'👹 ':'')+(W?.icon||'')+' '+(u?esc(u.title):(W?.name||'')+' · '+(s+1));
 const chunks=track==='english'?r37EnChunks(r37EnStage(w,s)):[];
 r37P={kind:'level',track,w,s,diff,qs,i:0,res:[],hearts:D.hearts+(ch.perk==='heart'?1:0),maxHearts:D.hearts+(ch.perk==='heart'?1:0),shield:ch.perk==='shield',correct:0,hinted:0,phase:track==='english'?'learn':'quiz',chunks,ck:0,learn:chunks[0]||[],fb:null,hintShown:false,title,praise:'做得好！'};
 r37Nav37('lp/play');
}
function r37StartQuiz(track,mode){
 const diff=r37Get().diff,qs=r37QuizQuestions(track,mode,R37_DIFF[diff-1].qs,diff,r37Mem._seed!==undefined?r37Mem._seed:(Date.now()&0xfffff));
 if(!qs.length){toast('這部分還未準備好。','bad');return;}
 r37P={kind:'quiz',track,mode,diff,qs,i:0,res:[],hearts:99,maxHearts:0,shield:false,correct:0,hinted:0,phase:'quiz',fb:null,hintShown:false,title:'',praise:'答對了！'};
 r37Nav37('lp/play');
}
function r37Nav37(h){if(location.hash==='#'+h)render();else location.hash='#'+h;}
function r37Answer(value){
 const P=r37P;if(!P||P.phase!=='quiz'||P.fb)return;
 const q=P.qs[P.i],ok=r37Check(q,value);
 if(!String(value).trim())return;
 P.fb={ok,value:String(value).trim()};P.res[P.i]=ok;
 if(ok){P.correct++;r37Bump('correct');if(P.track==='english')r37Bump('enok');playSfx('correct');r37Cheer();}
 else{if(P.kind==='level'){if(P.shield){P.shield=false;P.fb.shielded=true;}else P.hearts--;}playSfx('wrong');}
 if(P.hintShown)P.hinted++;
 render();
 try{r37FxAnswer(ok);}catch(_){}
 if(ok){clearTimeout(r37Timer);r37Timer=setTimeout(()=>{if(r37P===P&&P.fb&&P.fb.ok)r37Next();},750);}
}
function r37Cheer(){const P=r37P;P.praise=['做得好！','好叻！','正確！','太棒了！','答對了！'][P.correct%5];}
function r37Next(){
 const P=r37P;if(!P||!P.fb)return;clearTimeout(r37Timer);
 P.i++;P.fb=null;P.hintShown=false;
 if(P.hearts<=0||P.i>=P.qs.length){r37Finish();return;}
 const ck=P.qs[P.i].ck;if(P.chunks&&ck!==undefined&&ck!==P.ck&&P.chunks[ck]){P.ck=ck;P.learn=P.chunks[ck];P.phase='learn';}
 render();
}
function r37Finish(){
 const P=r37P,D=R37_DIFF[P.diff-1],total=P.qs.length,answered=P.i>=total?total:P.i,correct=P.correct;
 const failedLife=P.hearts<=0&&P.kind==='level',ratio=correct/total;
 const stars=failedLife?Math.min(1,r37StarsFor(correct,total,P.hinted>0)):r37StarsFor(correct,total,P.hinted>0);
 const passed=P.kind==='level'?(!failedLife&&ratio>=D.pass):ratio>=D.pass;
 let coins=0;
 if(P.kind==='level'){
  const o=r37Get(),k=r37LvKey(P.track,P.w,P.s),old=o.lv[k]||{best:0},boss=P.s===9;
  const e=o.lv[k]=Object.assign({},old,{best:Math.max(old.best||0,stars),at:new Date().toISOString()});
  const firstPass=passed&&!old.passed;if(passed)e.passed=true;
  if(stars===5&&!old.five){e.five=true;coins+=boss?3:1;if(r37Char().perk==='coin')coins+=1;r37Bump('five');}
  if(firstPass&&boss)coins+=2;
  if(firstPass)r37Bump('levels');
  r37Save();
 }else{
  const d=r37Get().day;d.qc=d.qc||0;
  if(stars===5&&d.qc<3){coins+=1;d.qc++;if(r37Char().perk==='coin')coins+=1;r37Bump('five');}
  r37Save();
 }
 if(!isLoggedIn())coins=0;
 if(coins)r37AddCoins(coins);
 P.result={stars,passed,correct,coins};P.phase='result';playSfx(passed?'finish':'wrong');render();
}
function r37Exit(){
 const P=r37P;r37P=null;clearTimeout(r37Timer);try{speechSynthesis.cancel();}catch(_){}
 if(P&&P.kind==='level')location.hash='#lv/'+P.track;else location.hash=P?'#p/'+P.track:'#kid';
}
function r37Speak(t){try{speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(t);u.lang='en-GB';u.rate=.85;const v=typeof britishVoices==='function'?britishVoices()[0]:null;if(v)u.voice=v;speechSynthesis.speak(u);}catch(_){}}
/* ---------------------------------------------------------------------------------------------- parent */
function r37ParentHub(){
 const o=r37Get(),tab=r37Mem._ptab||'diff',c=activeChild();
 const tabs=[['diff','🎚️'],['prog','📊'],['kids','👦'],['data','🛠️']].map(([k,i])=>`<button type="button" class="r37-ptab ${tab===k?'on':''}" data-r37="ptab" data-k="${k}" aria-label="${k}">${i}</button>`).join('');
 let body='';
 if(tab==='diff'){
  body=`<div class="r37-card"><h2>🎚️ 難度</h2><div class="r37-diffs">${R37_DIFF.map(d=>`<button type="button" class="r37-df ${o.diff===d.n?'on':''}" data-r37="diff" data-n="${d.n}"><span class="r37-dfi">${d.icon}</span><b>${d.n} ${d.name}</b><small>${d.qs} 題 · ${'❤'.repeat(d.hearts)} · ${Math.round(d.pass*100)}%</small></button>`).join('')}</div>
  <ul class="r37-dl"><li><b>1–2</b> 較少選項、字首提示、較少題目</li><li><b>3</b> 標準</li><li><b>4–5</b> 相似選項、更多填充、更高合格線${o.diff===5?'、沒有提示':''}</li></ul></div>`;
 }else if(tab==='prog'){
  body=['english','math','olympiad'].map(t=>{const q=r37TrackProgress(t),T=R37_TRACKS[t];return `<div class="r37-card r37-pr"><div class="r37-prh"><span>${T.icon}</span><b>${T.name}</b><em>${q.done}/${q.total}</em></div><div class="r37-bar2"><i style="width:${Math.round(q.done/Math.max(1,q.total)*100)}%"></i></div><div class="r37-prs">${r37Stars(Math.min(5,Math.round(q.stars/Math.max(1,q.max)*5)))}<b>${q.stars}/${q.max}</b></div></div>`;}).join('')+(c?`<div class="r37-card"><div class="r37-prh"><span>🪙</span><b>${r37Coins()}</b><span>🔥</span><b>${o.day.levels}</b><span>✅</span><b>${o.day.correct}</b></div></div>`:'');
 }else if(tab==='kids'){
  body=`<div class="r37-tiles">${r37A('👦','孩子','#children')+r37A('📝','默書範圍','#ranges')+r37A('📊','學習報告','#report')+r37A('🏆','學習計劃','#learning-plan')}</div>`;
 }else{
  body=`<div class="r37-tiles">${r37A('⚙️','設定／備份','#settings')+r37A('🔐',isLoggedIn()?'登出':'登入','#login')+r37A('📴','離線教材','#offline')+r37A('🖼️','圖片來源','#credits')+(isTestAdmin()?r37A('🧪','測試中心','#admin'):'')}</div>`;
 }
 return `<section class="r37-hub" style="--h:46">${r37Top()}<div class="r37-hero"><span class="r37-bigorb"><em aria-hidden="true">${r37Icon('👪')}</em></span><h1>家長星</h1></div><div class="r37-ptabs" role="tablist">${tabs}</div>${body}${r37Nav('p/parent')}</section>`;
}
