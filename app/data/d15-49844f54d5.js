/* Accessible local UI; all lesson content comes from curriculum.json. */
(function(root){'use strict';
 const C=root.WQMathCore,S=root.WQMathStorage,L=C.library(root.WQMathData);
 const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const btn=(text,action,cls='',extra='')=>`<button type="button" data-action="${esc(action)}" class="${cls}" ${extra}>${text}</button>`;
 const tag=t=>`<span class="tag">${esc(t)}</span>`;
 const ref=q=>({template:q.templateId,seed:q.seed});
 const question=r=>C.generate(L,r.template,r.seed);
 const toolLabels={clock:'可調鐘面',angle:'量角器',solid:'立體積木',ruler:'間距與量度',chart:'統計圖',tenframe:'十格框',blocks:'數粒積木',numberline:'數線',fraction:'分數條',place:'數位表',array:'數陣',money:'港幣',bar:'線段圖',segments:'數線段',table:'列表'};
 const stageNames=['情境引入','動手探索','概念講解','一起做','自己做','小結'];
 const towerNames=['先挑戰','先試簡單例子','發現策略','變式練習','一題多解','回想方法'];
 // ---- R3.5 p50: maths chrome and answer display helpers ----------------------------------------------------------
 const R36CSS="/* R3.6 q10: maths chrome */\n.wq36-left{gap:12px;flex-wrap:nowrap;min-width:0}\n.wq36-home{min-height:52px;padding:8px 16px;font-size:17px;border-radius:16px;white-space:nowrap;flex:0 0 auto}\n.wq36-home-small{margin-left:auto;min-height:48px}\n.focusbar{gap:10px;justify-content:space-between}\n.wq36-resume{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;padding:12px 16px;margin:0 0 14px;border-radius:18px;background:#fff5df;border:1px solid #e3d2b3;font-weight:700}\n@media(max-width:560px){.wq36-left .brand small{display:none}.wq36-left .brand{font-size:19px}.topbar{min-height:0;padding:10px 0;gap:10px}}\n";
 const R35CSS="/* R3.5 p50: maths chrome. Appended after the maths base CSS inside the shadow root. */\n.eyebrow{font-size:14px;letter-spacing:.5px}\n/* Question screens: only 「← 返回」 and the progress bar above the question. */\n.focusbar{display:flex;align-items:center;min-height:60px;padding:6px 0;border-bottom:1px solid var(--edge)}\n.backbtn{min-height:48px;min-width:48px;padding:8px 16px;background:#fff;border:1px solid #d5dfd9}\n.wqm.focus .lesson-panel{padding-top:14px}\n@media(max-height:480px){.focusbar{padding:2px 0}.wqm.focus .lesson-panel{padding-top:8px}.wqm.focus .question-wrap{padding-top:14px;padding-bottom:16px}.wqm.focus .progress{margin:10px 0}}\n/* Partner row: one compact line; the settings button sits beside it and its panel opens below. */\n#forest-math-slot{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;margin:10px 0 12px}\n#forest-math-slot>.wqm-v32-companion{flex:1 1 220px;min-width:0;margin:0;padding:6px 10px;gap:10px;border-radius:16px}\n#forest-math-slot .forest-math-guide img{width:40px;height:46px;border-radius:12px}\n#forest-math-slot .forest-math-guide .forest-job{display:none}\n#forest-math-slot .forest-math-guide strong{font-size:15px}\n#forest-math-slot .forest-math-guide p{font-size:13px;margin:0;line-height:1.45;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:2;overflow:hidden}\n#forest-math-slot .forest-controlbar{margin:0;flex:0 0 auto}\n#forest-math-slot .forest-controlbar span{display:none}\n#forest-math-slot .forest-controlbar button{min-height:48px}\n#forest-math-slot .forest-options,#forest-math-slot .forest-quiet{flex:0 0 100%;margin-top:0}\n/* Touch targets: 48 px for everything a child taps. */\n.nav button{min-height:48px}\n.placeboard>div{padding-left:0;padding-right:0}\n.placeboard button{min-width:48px;min-height:48px;padding:3px 8px}\n.tool-tabs button{min-width:48px;min-height:48px;padding:7px 12px}\n.keypad button{min-width:48px}\n.tenframe{grid-template-columns:repeat(5,minmax(44px,48px))}\n.tiny-link{min-height:44px;padding:10px 14px;font-size:13px}\n/* Parent page: text links look like buttons. */\n.parentview button.quiet{background:#f6e6cc;border:1px solid #e4ccaa;color:#59442e;min-height:48px}\n.parentview button.quiet:hover:not(:disabled){background:#efdcbc}\n.about-math{margin-top:26px}\n";
 // Corrected answer in the format the question asks for; falls back to the exact fraction when unsure.
 const ansNum=q=>q.displayAnswer!==undefined&&q.displayAnswer!==q.answer?esc(q.displayAnswer):fraction(q.answer);
 const ansUnit=q=>q.unit||q.displayUnit||'';
 // A lesson in progress: show only the way back and the progress, not the tab bars, partner row or stage row.
 function r35Focus(){return view==='lesson'&&!awaitingBreak&&!!store&&!!current()&&!current().completed;}
 function r35Header(){return r35Focus()?`<header class="focusbar">${btn('← 返回','pause','quiet backbtn')}${root.WQM_INTEGRATED?btn('🏠 首頁','close','quiet backbtn wq36-home-small'):''}</header>`:header();}
 function fraction(v){const a=String(v).split('/');return a.length===2?`<span class="fraction-display" aria-label="${esc(a[1])}分之${esc(a[0])}"><span>${esc(a[0])}</span><span>${esc(a[1])}</span></span>`:esc(v);}
 function df(ms){return Math.max(0,Math.round(ms/60000));}
 let bridge=root.WQM_INTEGRATED?S.createHostBridge():S.standalone(),store,view='home',app,shadow,dialog,launch,toastTimer,audio=null,activeSince=Date.now(),continuous=0,awaitingBreak=false,initialFocus;
 const ui={grade:3,tools:null,freeTool:'tenframe',toolOpen:false,tab:'normal',busy:false,error:'',lastRead:'',lastFast:0,selectedStrategy:'',forceRemedy:false};
 function defaultTool(kind='tenframe',q=null){const t={...C.toolModel(kind,q),hour:Number(q?.params.hour??3),minute:Number(q?.params.minute??0),angle:Number(q?.params.angle??60),sx:3,sy:2,sz:2,rulerStart:0,rulerEnd:6,chartA:3,chartB:5,chartC:4};return root.WQMathVisuals.bindTool(t,q);}
 // Capture work before navigation; never trust imported tool fields as HTML.
 function writeDraft(ss,pause=false){if(!ss||ss.completed||view!=='lesson')return;
  if(!ss.feedback){for(const[id,key]of [['answer','draft'],['expression','draftExpression'],['unit','draftUnit'],['remainder','draftRemainder']]){const e=app?.querySelector('#'+id);if(e)ss[key]=e.value;}if(ui.tools)ss.toolState=C.clone(ui.tools);}
  if(pause&&!ss.questionPaused){ss.elapsedQuestionMs=Math.min(3600000,(ss.elapsedQuestionMs||0)+Math.max(0,Date.now()-ss.questionAt));ss.questionPaused=true;}
 }
 function preserveWork(pause=false){if(store&&!store.readOnly&&current()&&!current().completed&&view==='lesson')save(n=>writeDraft(n.current,pause));}
 function restoreTool(){const ss=current(),q=ss?.queues?.[ss.stage]?.[ss.index]?question(ss.queues[ss.stage][ss.index]):ss?.example?question(ss.example):null,kind=ss?.game||L.skills.get(q?.skill||ss?.skill)?.tool||'tenframe';const t=defaultTool(kind,q),saved=ss?.toolState;
  if(saved&&saved.kind===kind){for(const[k,min,max]of [['hour',0,23],['minute',0,59],['angle',0,180],['sx',1,5],['sy',1,5],['sz',1,5],['rulerStart',0,19],['rulerEnd',1,20],['chartA',0,20],['chartB',0,20],['chartC',0,20],['h',0,9],['t',0,99],['o',0,99],['position',0,t.lineMax],['den',2,12],['num',0,12],['den2',2,12],['num2',0,12],['shared',0,99],['rows',0,10],['cols',0,10],['front',0,20],['back',0,20],['points',2,8],['tens',1,9],['ones',0,9]])if(Number.isInteger(saved[k])&&saved[k]>=min&&saved[k]<=max)t[k]=saved[k];
   t.shared=Math.min(t.shared,Math.floor(t.dividend/t.divisor));t.num=Math.min(t.num,t.den);t.num2=Math.min(t.num2,t.den2);if(Array.isArray(saved.cells)&&saved.cells.length===20&&saved.cells.every(x=>typeof x==='boolean'))t.cells=saved.cells.slice();if(Array.isArray(saved.digits)&&saved.digits.length===5&&saved.digits.every(x=>Number.isInteger(x)&&x>=0&&x<=9))t.digits=saved.digits.slice();
   if(Array.isArray(saved.money)&&saved.money.length<=50&&saved.money.every(x=>[1,2,5,10,20,50].includes(x)))t.money=saved.money.slice();if(Array.isArray(saved.entries)&&saved.entries.length<=90&&saved.entries.every(x=>Number.isInteger(x)&&x>=10&&x<=99))t.entries=[...new Set(saved.entries)];if(Array.isArray(saved.pairs)&&saved.pairs.length<=28&&saved.pairs.every(a=>Array.isArray(a)&&a.length===2&&a.every(x=>Number.isInteger(x)&&x>=0&&x<t.points)))t.pairs=saved.pairs.map(a=>a.slice());t.num=Math.min(t.den,t.num);
  }ui.tools=t;
 }
 function current(){return store.state.current;}
 function skill(){return current()?.skill?L.skills.get(current().skill):null;}
 function currentQ(){const s=current();const arr=s?.queues?.[s.stage];return arr?.[s.index]?question(arr[s.index]):null;}
 function active(){return !document.hidden && (!root.WQM_INTEGRATED||dialog?.open);}
 function toast(t){clearTimeout(toastTimer);let e=shadow.getElementById('toast');if(e)e.remove();e=document.createElement('div');e.id='toast';e.className='toast';e.setAttribute('role','status');e.textContent=t;shadow.append(e);toastTimer=setTimeout(()=>e.remove(),6500);}
 function fail(e){ui.error=e.message||String(e);toast(ui.error);}
 function save(fn){return store.change(fn);}
 function initStore(){const p=bridge.profile();
  if(!(root.WQM_INTEGRATED&&!p.persistent&&store&&!store.profile.persistent&&store.scope===p.account+':'+p.id))store=new S.Store(bridge,L);ui.grade=store.profile.grade;ui.error=store.error||store.profile.recoveryError||'';ui.tools=defaultTool();restoreTool();activeSince=Date.now();view=store.state.current?(store.state.current.completed?'lesson':'resume'):'home';}
 function status(s){const m=C.mastery(store.state,s);return C.isMastered(m)?'✓ 已掌握':m.last?'◐ 練習中':'○ 未開始';}
 function mastered(track){return [...L.skills.values()].filter(s=>s.track===track&&C.isMastered(C.mastery(store.state,s))).length;}
 function statCard(n,t){return `<div class="stat"><strong>${n}</strong><span>${esc(t)}</span></div>`;}
 function canStudy(){root.WQR3?.assertStudy();if(view==='lesson'&&current()?.track==='olympiad'&&!store.state.settings.olympiad)throw Error('家長已關閉奧數；這輪已保留，重新開啟後才可繼續。');if(store.readOnly)throw Error(store.error);store.check();}
 let wq36Scope='normal';
 function wq36Oly(){return wq36Scope==='olympiad';}
 function wq36Fix(){if(view==='resume')view=wq36Oly()?'olympiad':'home';if(wq36Oly()){if(['home','normal','tools'].includes(view))view='olympiad';}else if(['olympiad','cards'].includes(view))view='home';}
 function nav(){const items=wq36Oly()?[['olympiad','思維之塔'],['cards','策略卡'],['parent','家長與進度']]:[['home','數學首頁'],['normal','數學群島'],['tools','教具工房'],['parent','家長與進度']];return `<nav class="nav" aria-label="${wq36Oly()?'奧數功能':'數學功能'}">${items.map(([id,n])=>btn(n,'nav:'+id,view===id?'active':'')).join('')}</nav>`;}
 function header(){const p=store.profile,oly=wq36Oly();return `<header class="topbar"><div class="row wq36-left">${root.WQM_INTEGRATED?btn('🏠 回首頁','close','primary wq36-home'):''}<div class="brand"><div class="brandmark" aria-hidden="true">${oly?'◇':'＋'}</div><div>學霸星球<small>${oly?'奧數 · 思維之塔':'數學群島'}</small></div></div></div><div class="row"><span class="small name">${esc(p.name)} · 小${'一二三四五六'[p.grade-1]||p.grade}</span><span class="wallet">◉ <strong id="balance">${store.balance()}</strong> 金幣</span>${root.WQM_INTEGRATED?'':btn(p.persistent?'切換孩子':'家長設定','nav:profiles','quiet')}</div></header>${nav()}`;}
 function home(){const state=store.state,days=Object.keys(state.usage).filter(d=>state.usage[d]>0&&d>=C.plusDay(C.hkDay(),-6)),due=C.dueSkills(state,L).length;return `
 <section class="hero"><div><div class="eyebrow">每天一個小發現</div><h1>今天，<br>用新方法學數學。</h1><p>先動手，再想通。每日一小步，<br>學到方法，不只是答案。</p><div class="row">${btn('開始今日練習　→','daily:normal','primary')}${btn('選一課來學','nav:normal','quiet')}</div></div><div class="hero-art" aria-hidden="true"><div class="artgrid"><span>3</span><span>+</span><span>5</span><span>½</span><span>×</span><span>8</span><span>÷</span><span>10</span><span>?</span></div><div class="artnote">一個問題，可以有不只一種方法。</div></div></section>
 <div class="stats">${statCard(days.length,'本週學習日數')}${statCard(mastered('normal'),'普通數學已掌握技能')}${statCard(due,'等你重溫的技能')}</div>
 <div class="section-head"><h2>今天想學甚麼？</h2></div><div class="cards">
 <article class="card track-card"><span class="symbol">＋ ÷</span><h3>數學群島</h3><p>跟着學校進度，練熟數感、加減乘除和分數。</p>${btn('前往數字島　→','nav:normal','primary')}</article>
 <article class="card track-card"><span class="symbol">▦</span><h3>教具工房</h3><p>拆十條、跳數線、比較分數。慢慢試，這裏不計分。</p>${btn('動手試一試　→','nav:tools','secondary')}</article></div>
 ${!store.profile.persistent?`<div class="notice"><strong>你正在訪客試玩。</strong> 關閉後不保留進度，也不會給金幣。${root.WQM_INTEGRATED?'請返回英文登入原有家庭帳戶。':btn('由家長建立本機學習檔案','nav:profiles','tiny-link')}</div>`:''}
 <div class="section-head"><h2>每次，只專心一件事</h2></div><div class="grid2"><div class="card"><h3>學校教到哪裏？</h3><p class="muted">家長選好正在學的單元，每日練習便會優先安排。</p>${btn('設定學校進度','nav:parent','quiet')}</div><div class="card"><h3>第一次來？</h3><p class="muted">用 15 題看看「數」範疇從哪裏開始。</p>${btn('基礎選題起步測試','diagnostic:normal','quiet')}</div></div>`;}
 function catalog(){const list=L.data.units.filter(u=>u.grade===ui.grade);return `<div class="section-head"><div><div class="eyebrow">從一個島開始</div><h1>數學群島</h1></div><div class="row grade-selector" aria-label="選擇年級">${[1,2,3,4,5,6].map(g=>btn('小'+g,'grade:'+g,ui.grade===g?'selected':'')).join('')}</div></div>
 <div class="islands">${[['N','數字島'],['M','量度工坊'],['S','圖形森林'],['D','數據市集'],['A','代數城堡']].map(([st,n])=>`<span class="tag ${st==='N'?'selected':''}">${esc(n)}</span>`).join('')}</div>
 <section class="catalog">${list.map(u=>`<div class="unit-head"><span class="unit-id">${u.id}</span><h2>${u.name}</h2>${u.skills.length?tag('入門選段'):tag('還未有內容')}</div>${u.skills.length?`<div class="cards">${u.skills.map(id=>{const sk=L.skills.get(id),m=C.mastery(store.state,sk),open=C.accessible(store.state,sk,L,store.profile.grade);return `<article class="card lesson-card"><span class="small muted">${id} · 約 ${sk.lesson.minutes} 分鐘</span><h3>${esc(sk.name_zh)}</h3><p>${esc(sk.name_en)}</p><div>${tag(status(sk))}${m.next?` <span class="small muted">重溫 ${esc(m.next)}</span>`:''}</div><div class="row">${btn(open?'學這一課':'先練基礎','lesson:'+id,'primary',open?'':'disabled')}${btn('5 題練習','practice:'+id,'quiet',open?'':'disabled')}</div>${!open?`<span class="small">需要先會：${sk.prerequisites.map(i=>L.skills.get(i).name_zh).map(esc).join('、')}</span>`:''}</article>`;}).join('')}</div>`:`<div class="small muted" style="padding:0 0 17px">這個單元已預留位置，還沒有題目。這裏不會用其他單元的題目代替。</div>`}`).join('')}</section>`;}
 function olympiad(){if(!store.state.settings.olympiad)return `<div class="card"><h1>思維之塔暫未開啟</h1>${btn('前往家長設定','nav:parent','primary')}</div>`;const level=ui.olyLevel||1,names=['啟蒙','基礎','進階','競賽練習'];return `<section class="tower"><h1>思維之塔</h1><p>畫圖、列表、倒推。先學方法，再嘗試不同解法。</p><div class="row">${names.map((n,i)=>btn(n,'olylevel:'+(i+1),level===i+1?'selected':'')).join('')}</div></section><div class="section-head"><h2>${names[level-1]} · 五個思維主題</h2>${btn('10 題原創模擬卷','mock:'+level,'secondary')}${btn('策略卡','nav:cards')}</div><div class="cards">${L.data.skills.filter(s=>s.track==='olympiad'&&(s.level||1)===level).map(sk=>`<article class="card lesson-card"><span class="tag">${esc(L.data.cards.find(c=>c.id===sk.strategy)?.name||'思考方法')}</span><h3>${esc(sk.name_zh)}</h3><p>${esc(sk.lesson.scene)}</p><p>${tag(status(sk))}</p>${btn('學習與挑戰','lesson:'+sk.id,'primary')}</article>`).join('')}</div><p class="note"></p>`;}

 function cards(){return `<div class="section-head"><div><div class="eyebrow">用過的方法，都收在這裏</div><h1>策略卡收集冊</h1></div>${tag(store.state.cards.length+' / '+L.data.cards.length)}</div><p class="muted">同一主題至少兩題不用提示完成，並在小結選對方法，就能得到入門策略卡。</p><div class="cards">${L.data.cards.map(c=>`<article class="card badge-card ${store.state.cards.includes(c.id)?'':'locked'}"><span class="tag">${store.state.cards.includes(c.id)?'✓ 已收集':'○ 未收集 · 可先閱讀'}</span><h2 style="margin-top:20px">${esc(c.name)}</h2><p>${esc(c.description)}</p><div class="note">${esc(c.example)}</div></article>`).join('')}</div>`;}
 function setTool(kind,q=null){ui.tools=defaultTool(kind,q);ui.freeTool=kind;}
 function ten(n,interactive=false){return [0,1].map(row=>`<div class="tenframe" aria-label="十格框 ${row+1}">${Array.from({length:10},(_,i)=>{const j=row*10+i,on=interactive?ui.tools.cells[j]:j<n;return interactive?btn('',`tool:cell:${j}`,'cell '+(on?'filled':''),`aria-label="第 ${j+1} 格${on?'，有數粒':'，空白'}" aria-pressed="${on}"`):`<span class="cell ${on?'filled':''}" aria-hidden="true"></span>`;}).join('')}</div>`).join('');}
 function strip(den,num,interactive=false){return `<div class="strips" aria-label="${den} 等份，已選 ${num} 份">${Array.from({length:den},(_,i)=>interactive?btn(i<num?'✓':'',`tool:part:${i}`,(i<num?'filled':''),`aria-label="第 ${i+1} 份" aria-pressed="${i<num}"`):`<span class="${i<num?'filled':''}" aria-hidden="true">${i<num?'✓':''}</span>`).join('')}</div>`;}
 function dots(rows,cols){return rows&&cols?`<div class="dots" style="grid-template-columns:repeat(${Math.min(10,cols)},minmax(8px,22px))" aria-label="${rows*cols} 個圓點"><span class="sr-only">${rows*cols} 個</span>${Array.from({length:Math.min(1000,rows*cols)},()=>'<span class="dot"></span>').join('')}</div>`:'<p>0 個，沒有圓點。</p>';}
 function illustration(q){if(q.visual?.startsWith('r3:'))return root.WQMathVisuals?.question(q)||'';const p=q.params; if(q.skill==='1N1.1')return `<div class="mini-board" aria-label="供點數的數粒">${ten(Number(p.n))}</div>`;
  if(q.skill==='3N5.1')return `<div class="mini-board">${strip(Number(p.den),Number(p.num))}</div>`;
  if(q.skill==='3N5.3')return `<div class="mini-board"><span>${p.num}/${p.left}</span>${strip(Number(p.left),Number(p.num))}<span>${p.num}/${p.right}</span>${strip(Number(p.right),Number(p.num))}</div>`;
  if(q.skill==='2N3.3'&&q.difficulty===1)return `<div class="mini-board">${dots(Number(p.b),Number(p.a))}</div>`;
  if(q.skill==='O-GEO-segments'){const n=Number(p.points);return `<svg class="svgboard" viewBox="0 0 600 75" role="img" aria-label="一條直線上有 ${n} 個已標示的點"><path d="M30 34H570" stroke="#78906d" stroke-width="3"/>${Array.from({length:n},(_,i)=>`<circle cx="${30+i*540/(n-1)}" cy="34" r="7" fill="#335547"/><text x="${30+i*540/(n-1)}" y="65" text-anchor="middle" font-size="18">${String.fromCharCode(65+i)}</text>`).join('')}</svg>`;}
  return '';
 }
 function toolsHTML(kind=ui.tools.kind){const t=ui.tools;let body=root.WQMathVisuals?.tool(kind,t)||'';
  if(kind==='tenframe')body=`${ten(0,true)}<div class="tool-value">${t.cells.filter(Boolean).length} 粒</div><div class="row">${btn('放多一粒','tool:more')}${btn('拿走一粒','tool:less')}${btn('清空','tool:clear','quiet')}</div><p class="small muted">點格子放入／拿走數粒；鍵盤可用 Tab 和空白鍵。</p>`;
  if(kind==='blocks')body=`<div class="blocks-grid">${[['h',t.h,'block-hundred'],['t',t.t,'block-ten'],['o',t.o,'block-one']].map(([k,n,cl])=>`<div><span class="small">${{h:'百板',t:'十條',o:'數粒'}[k]}：${n}</span><div class="blockgroup">${Array.from({length:Math.min(n,25)},()=>`<span class="${cl}"></span>`).join('')}${n>25?'…':''}</div></div>`).join('')}</div><div class="tool-value">總量 ${t.h*100+t.t*10+t.o}</div><div class="row">${btn('＋1','tool:one')}${btn('＋10','tool:ten')}${btn('＋100','tool:hundred')}${btn('拆一個十','tool:split', '',t.t?'':'disabled')}${btn('10 個一換一個十','tool:merge','',t.o>=10?'':'disabled')}${btn('拆一個百','tool:splith','',t.h?'':'disabled')}${btn('清空','tool:clear','quiet')}</div><p class="small muted">交換不會改變總量。用不同分法看清退位和進位。</p>`;
  if(kind==='numberline')body=`<svg class="svgboard" viewBox="0 0 680 135" role="img" aria-label="數線，現在位於 ${t.position}，範圍 0 至 ${t.lineMax}"><path d="M30 80H650" stroke="#56734f" stroke-width="3"/>${C.numberlineTicks(t.lineMax).map(x=>`<path d="M${30+x*620/t.lineMax} 71v18" stroke="#657d5b"/><text x="${30+x*620/t.lineMax}" y="112" font-size="15" text-anchor="middle">${x}</text>`).join('')}<circle cx="${30+t.position*620/t.lineMax}" cy="48" r="18" fill="#ba8139"/><text x="${30+t.position*620/t.lineMax}" y="55" text-anchor="middle" font-size="19" fill="#fff">${t.position}</text></svg><div class="row">${[-5,-1,1,5].map(n=>btn((n>0?'＋':'')+n,'tool:jump:'+n)).join('')}${btn('回到 0','tool:clear','quiet')}</div><p class="small muted">向右是加，向左是減。範圍：0–${t.lineMax}。按「＋1」每次前進一個數。</p>`;
  if(kind==='fraction')body=`<div class="row"><label>第一條分成 <select id="tool-den" aria-label="分數條等份">${Array.from({length:11},(_,i)=>`<option value="${i+2}" ${t.den===i+2?'selected':''}>${i+2}</option>`).join('')}</select> 份</label>${btn('清空著色','tool:clear','quiet')}</div>${strip(t.den,t.num,true)}<div class="tool-value">已選 ${fraction(t.num+'/'+t.den)}</div><label>第二條分成 <select id="tool-den2" aria-label="比較分數條等份">${Array.from({length:11},(_,i)=>`<option value="${i+2}" ${t.den2===i+2?'selected':''}>${i+2}</option>`).join('')}</select> 份</label>${strip(t.den2,t.num2)}<p class="small muted">兩條的總長相同。點上方的等份，看看不同分母的每一份有多大。</p>`;
  if(kind==='place')body=`<div class="placeboard">${['萬','千','百','十','一'].map((n,i)=>`<div>${n}${btn('＋',`tool:digit:${i}:1`,'quiet',`aria-label="增加${n}位"`)}<strong>${t.digits[i]}</strong>${btn('−',`tool:digit:${i}:-1`,'quiet',`aria-label="減少${n}位"`)}</div>`).join('')}</div><div class="tool-value">${t.digits.reduce((n,d,i)=>n+d*10**(4-i),0)}</div><p class="small muted">改變一個數位，再看看整個數怎樣改變。</p>`;
  if(kind==='array')body=`<div class="row"><label>行 <select id="tool-rows">${Array.from({length:11},(_,n)=>`<option ${n===t.rows?'selected':''}>${n}</option>`).join('')}</select></label><label>列 <select id="tool-cols">${Array.from({length:11},(_,n)=>`<option ${n===t.cols?'selected':''}>${n}</option>`).join('')}</select></label></div>${dots(t.rows,t.cols)}<div class="tool-value">${t.rows} × ${t.cols} = ${t.rows*t.cols}</div>`;
  if(kind==='array'&&t.mode==='division'){
    const left=t.dividend-t.shared*t.divisor;
    body=`<p>把 <strong>${t.dividend}</strong> 件物件平均分給 <strong>${t.divisor}</strong> 人。每次給每人一件。</p><div class="chiprow">${Array.from({length:t.divisor},(_,i)=>`<div class="card" style="padding:10px"><span>第 ${i+1} 人</span>${dots(1,t.shared)}<div>${t.shared} 件</div></div>`).join('')}</div><p>未分的物件：${left} 件</p>${dots(1,left)}<div class="row">${btn('每人分一件','tool:share:1','primary',left>=t.divisor?'':'disabled')}${btn('收回一輪','tool:share:-1','',t.shared?'':'disabled')}${btn('重新分','tool:clear','quiet')}</div><p class="small muted">${left>=t.divisor?'仍然足夠每人再分一件。':'已不夠每人再分一件，剩下的就是餘數。'}每人有 ${t.shared} 件，剩下 ${left} 件。</p>`;
  }else if(kind==='array'&&t.extra){body+=`<p>另外加上 ${t.extra} 個：</p>${dots(1,t.extra)}<p class="small">先算每組一樣多的部分，再加上這些。</p>`;}
  if(kind==='money')body=`<div class="chiprow">${[1,2,5,10,20,50].map(n=>btn('$'+n,'tool:coin:'+n,'coin '+(n>=20?'note-coin':''),`aria-label="加入 ${n} 元"`)).join('')}</div><div class="tool-value">已砌金額：$${t.money.reduce((a,b)=>a+b,0)}</div><div class="chiprow">${t.money.map((n,i)=>btn('$'+n,'tool:remove-coin:'+i,'tag',`aria-label="移除一個 ${n} 元"`)).join('')}</div>${btn('清空','tool:clear','quiet')}<p class="small muted">只用整元。小店找贖適合小二或以上。</p>`;
  if(kind==='bar')body=`<div class="row">${btn('前方 ＋1','tool:front:1')}${btn('前方 −1','tool:front:-1')}${btn('後方 ＋1','tool:back:1')}${btn('後方 −1','tool:back:-1')}</div><svg class="svgboard" viewBox="0 0 640 120" role="img" aria-label="前方 ${t.front} 人，自己一人，後方 ${t.back} 人"><rect x="10" y="25" width="${t.front*540/(t.front+t.back+1)}" height="42" rx="6" fill="#86a179"/><rect x="${20+t.front*540/(t.front+t.back+1)}" y="25" width="${540/(t.front+t.back+1)}" height="42" rx="6" fill="#c18a43"/><rect x="${30+(t.front+1)*540/(t.front+t.back+1)}" y="25" width="${t.back*540/(t.front+t.back+1)}" height="42" rx="6" fill="#708da2"/><text x="10" y="100" font-size="20">前方 ${t.front} ＋ 自己 1 ＋ 後方 ${t.back} ＝ ${t.front+t.back+1}</text></svg>`;
  if(kind==='segments')body=`<label>標示點的數量 <select id="tool-points">${[2,3,4,5,6,7,8].map(n=>`<option ${n===t.points?'selected':''}>${n}</option>`).join('')}</select></label><div class="chiprow" style="margin:18px 0">${Array.from({length:t.points},(_,i)=>btn(String.fromCharCode(65+i),'tool:point:'+i,t.first===i?'primary':'')).join('')}</div><p class="small">先選一個端點，再選另一個。AB 和 BA 只記一次。</p><div class="chiprow">${t.pairs.map(p=>tag(String.fromCharCode(65+p[0])+String.fromCharCode(65+p[1]))).join('')}</div><div class="tool-value">已找到 ${t.pairs.length} 條</div>${btn('重新列出','tool:clear','quiet')}`;
  if(kind==='table')body=`<div class="row"><label>十位 <select id="tool-tens">${Array.from({length:9},(_,i)=>`<option ${t.tens===i+1?'selected':''}>${i+1}</option>`).join('')}</select></label><label>個位 <select id="tool-ones">${Array.from({length:10},(_,i)=>`<option ${t.ones===i?'selected':''}>${i}</option>`).join('')}</select></label>${btn('加入列表','tool:entry')}</div><div class="scrolltable"><table><thead><tr><th>兩位數</th><th>十位＋個位</th></tr></thead><tbody>${t.entries.map(n=>`<tr><td>${n}</td><td>${Math.floor(n/10)} ＋ ${n%10} ＝ ${Math.floor(n/10)+n%10}</td></tr>`).join('')}</tbody></table></div><div class="tool-value">已列 ${t.entries.length} 個不同的數</div>${btn('清空','tool:clear','quiet')}`;
  return `<div class="toolbox"><h3>${toolLabels[kind]}</h3>${t.r3Note?'<p class="note">'+esc(t.r3Note)+'</p>':''}${body}</div>`;
 }
 function toolsPage(){return `<div class="section-head"><div><div class="eyebrow">邊做邊學</div><h1>教具工房</h1></div>${tag('自由探索 · 不計入掌握度')}</div><div class="tool-tabs">${Object.entries(toolLabels).map(([k,n])=>btn(n,'selecttool:'+k,ui.tools.kind===k?'picked':'')).join('')}</div><div id="tool-region">${toolsHTML()}</div><div class="section-head"><h2>把數學放進玩法</h2></div><div class="grid2"><div class="card"><h3>數線跳跳</h3><p>在 0–20 的數線跳出答案，完成 5 道加減題。不是做完題目才准玩的街機。</p>${btn('開始數線任務','game:numberline','primary')}</div><div class="card"><h3>港式小店</h3><p>按錢幣砌出找贖，再交給客人。適合小二以上，成績會記在數學紀錄裏。</p>${btn('開舖試一試','game:money','primary')}</div></div><p class="small muted"></p>`;}
 function makeSession(skId,mode='lesson',game=null){canStudy();const sk=L.skills.get(skId);if(!sk)throw Error('技能不存在');if(sk.track==='olympiad'&&!store.state.settings.olympiad)throw Error('家長尚未開啟奧數');if(!C.accessible(store.state,sk,L,store.profile.grade))throw Error('請先完成列出的基礎技能。');
  save(n=>{const oly=sk.track==='olympiad';const s={id:S.uid(),skill:sk.id,track:sk.track,mode,game,stage:mode==='lesson'?0:4,index:0,queues:{},example:null,startedAt:Date.now(),questionAt:Date.now(),activeMs:0,hint:0,feedback:null,results:[],replacements:[],completed:false,rewardDone:false,fast:0,draft:'',picked:'',reflection:null};
   s.example=ref(C.nextQuestion(n,L,sk.id,1));
   if(mode==='lesson'&&oly){s.queues[0]=[ref(C.nextQuestion(n,L,sk.id,2))];s.queues[3]=Array.from({length:3},(_,i)=>ref(C.nextQuestion(n,L,sk.id,i===2?3:2)));}
   else {if(mode==='lesson')s.queues[3]=Array.from({length:3},(_,i)=>ref(C.nextQuestion(n,L,sk.id,i?2:1)));s.queues[4]=Array.from({length:5},(_,i)=>ref(C.nextQuestion(n,L,sk.id,game?2:i===4?3:2)));}
   n.current=s;});ui.toolOpen=false;setTool(game||sk.tool,question(store.state.current.example));view='lesson';render();readAuto();
 }
 function makePlan(mode,track){canStudy();if(track==='olympiad'&&!store.state.settings.olympiad)throw Error('家長尚未開啟奧數');save(n=>{
  const all=L.data.skills.filter(s=>s.track===track&&(track!=='normal'||s.grade<=store.profile.grade)&&C.accessible(n,s,L,store.profile.grade));let ids;
  if(mode==='daily')ids=C.planDaily(n,L,{grade:store.profile.grade,track});
  else{const near=all.filter(s=>s.grade===store.profile.grade);const pool=near.length?near:all;ids=Array.from({length:track==='normal'?15:10},(_,i)=>(i%3===0?all[i%all.length]:pool[i%pool.length]).id);}
  const s={id:S.uid(),skill:null,track,mode,game:null,stage:4,index:0,queues:{4:ids.map((id,i)=>ref(C.nextQuestion(n,L,id,mode==='daily'?2:i<5?1:i<10?2:3)))},example:null,startedAt:Date.now(),questionAt:Date.now(),activeMs:0,hint:0,feedback:null,results:[],replacements:[],completed:false,rewardDone:false,fast:0,draft:'',picked:'',reflection:null};n.current=s;
 });view='lesson';ui.toolOpen=false;render();readAuto();}
 function answerSentence(a,q){const value=a?.value??'',u=a?.unit||q?.unit||'＿＿';return esc((q?.answerSentence||'應找回{value}{unit}。').replace('{value}',value===''?'＿＿':value).replace('{unit}',u));}
 function questionView(q){const s=current(),sk=L.skills.get(q.skill),setting=store.state.settings,language=setting.language;const idx=s.index+1,total=s.queues[s.stage].length;
  let input='';
  if(s.game){if(ui.tools.kind!==s.game)setTool(s.game);input=`<div id="tool-region">${toolsHTML(s.game)}</div>${s.game==='money'?'<p class="small">用錢幣砌好找贖，按下面「交給客人」。遊戲記錄的是金額，不評算式過程。</p>':''}`;}
  else if(q.type==='choice')input=`<div class="choices" role="group" aria-label="選擇答案">${q.choices.map((c,i)=>btn(c.label?esc(typeof c.label==='string'?c.label:language==='en'?c.label.en:c.label.zh):fraction(c.value),'choice:'+i,'choice '+(s.picked===c.value?'picked':''),`${s.feedback?'disabled':''} aria-pressed="${s.picked===c.value}"`)).join('')}</div>`;
  else if(q.type==='word')input=`<div class="word-fields"><div class="field"><label for="expression">① 算式（可以先計總價）</label><input id="expression" placeholder="例如：50 − 8 × 3，或 50 − 24" value="${esc(s.feedback?.answer?.expression??s.draftExpression??'')}" ${s.feedback?'disabled':''} maxlength="240"></div><div class="field"><label for="answer">② 答案數字</label><input id="answer" inputmode="decimal" placeholder="填寫答案" value="${esc(s.feedback?.answer?.value||s.draft||'')}" ${s.feedback?'disabled':''} maxlength="60"></div><div class="field"><label for="unit">③ 單位</label><select id="unit" ${s.feedback?'disabled':''}><option value="">請選擇</option>${[['元','元 dollars'],['個','個 objects'],['分鐘','分鐘 minutes']].map(([v,t])=>`<option value="${v}" ${(s.feedback?.answer?.unit??s.draftUnit)===v?'selected':''}>${t}</option>`).join('')}</select></div><div class="field"><label>④ 答句（數值加單位）</label><div class="answer-sentence" id="sentence">${answerSentence(s.feedback?.answer??{value:s.draft,unit:s.draftUnit},q)}</div></div></div><p class="small muted">分數：數值 2、算式 1、單位 1。</p>`;
  else input=`<div class="row"><div class="field"><label for="answer">${q.type==='remainder'?'商':'你的答案'}</label><input id="answer" class="answer-input" inputmode="decimal" maxlength="60" placeholder="${q.type==='fraction'?'例如 1/2':'填寫數字'}" value="${esc(s.feedback?.answer?.value??s.draft??'')}" ${s.feedback?'disabled':''}></div>${q.type==='remainder'?`<div class="field"><label for="remainder">餘數（沒有餘數填 0）</label><input id="remainder" class="answer-input" inputmode="numeric" maxlength="8" placeholder="0" value="${esc(s.feedback?.answer?.remainder??s.draftRemainder??'')}" ${s.feedback?'disabled':''}></div>`:''}</div>${q.type==='fraction'&&!s.feedback?`<div class="keypad">${['1','2','3','4','5','6','7','8','9','0','/','⌫'].map(k=>btn(k,'key:'+k,'',`aria-label="${k==='/'?'分數線':k}"`)).join('')}</div>`:''}`;
  const challenge=s.track==='olympiad'&&s.mode==='lesson'&&s.stage===0;
  const progress=(idx-1)/total*100;
  return `<section class="question-wrap motion"><div class="row between"><span class="small muted">${esc(sk.name_zh)} · ${idx} / ${total}</span><div class="row">${tag(['','入門','練熟','挑戰'][q.difficulty])}${btn('🔊 讀題','speak','quiet',`aria-label="讀出題目"`)}</div></div><div class="progress"><i style="width:${progress}%"></i></div><div class="question-stem" id="stem">${language!=='en'?esc(q.stem_zh):''}${language!=='zh'?`<div class="${language==='bi'?'en':''}">${esc(q.stem_en)}</div>`:''}</div>${illustration(q)}${input}
   ${s.hint&&!s.feedback?`<aside class="hint"><strong>提示 ${s.hint}/5 · 慢慢想</strong><ol>${q.hints.slice(0,Math.min(4,s.hint)).map(h=>`<li>${esc(h)}</li>`).join('')}${s.hint===5?`<li><strong>完整解答：${(q.answerLabel?esc(typeof q.answerLabel==='string'?q.answerLabel:store.state.settings.language==='en'?q.answerLabel.en:q.answerLabel.zh):ansNum(q))}${q.remainder!==null?' 餘 '+esc(q.remainder):''}</strong><p>${esc(q.explanation)}</p>下一步要做一題數字不同的新題。</li>`:''}</ol></aside>`:''}
   ${ui.toolOpen&&!s.game?`<div id="tool-region">${toolsHTML()}</div>`:''}
   ${s.feedback?feedbackHTML(s.feedback,q):''}${s.fastPause?`<div class="notice" role="alert">先停一停，讀清楚題目。${btn('我會慢慢讀題','unpause-fast','secondary')}</div>`:''}
   <div class="actions"><div class="row">${!s.feedback&&!challenge?btn(s.hint<5?'給我一點提示':'已看完整解答','hint','secondary',s.hint<5?'':'disabled'):''}${challenge&&!s.feedback?btn('先試簡單例子','nextstage','quiet'):''}</div>${s.feedback?btn('下一步　→','nextq','primary',s.fastPause?'disabled':''):btn(s.game==='money'?'交給客人':s.game?'在這裏落腳':'檢查答案','submit','primary')}</div>
   ${challenge?'<p class="small muted">先自己試一試。這道開場題不計入掌握度。</p>':''}<div style="margin-top:20px">${btn('這題可能有問題','report-item','tiny-link')}</div></section>`;
 }
 function feedbackHTML(f,q){const mis=L.data.misconceptions[f.code];return `<div class="feedback ${f.correct?'':'partial'}" role="status"><strong>${f.correct?'✓':'↗'} ${esc(f.message)}</strong>${!f.correct&&mis?`<p>${esc(mis.remedy+(f.code==='RECHECK'&&L.skills.get(q.skill)?.tool?'再用教具試一次。':''))}</p>`:''}${!f.correct?`<p><strong>訂正：</strong>${(q.answerLabel?esc(typeof q.answerLabel==='string'?q.answerLabel:store.state.settings.language==='en'?q.answerLabel.en:q.answerLabel.zh):ansNum(q))}${q.remainder!==null?' 餘 '+esc(q.remainder):''} ${esc(ansUnit(q))}</p><p>${esc(q.explanation)}</p><p class="small">原來的作答會保留，作為學習紀錄。下一題會換數字，不能靠背答案。</p>`:''}${f.parts?`<p class="small">${Object.entries(f.parts).map(([k,v])=>esc(({value:'數值',expression:'算式',unit:'單位',quotient:'商',remainder:'餘數'})[k])+` ${v?'✓':'待調整'}`).join('　')}</p>`:''}</div>`;}
 function lesson(){const s=current();if(!s)return home();const sk=skill(),oly=s.track==='olympiad',title=sk?.name_zh||({daily:'今日 10 題練習',diagnostic:oly?'思維起步測試':'基礎選題起步測試'}[s.mode]||'練習');
  const names=oly?towerNames:stageNames;const r35q=r35Focus()&&!!currentQ();const head=`<div class="lesson-panel">${r35q?'':`<div class="lesson-title"><div><div class="eyebrow">${s.mode==='lesson'?'一課，一個發現':s.mode==='diagnostic'?'找出從哪裏開始':'每次練一點，記得更牢'}</div><h1>${esc(title)}</h1></div>${r35Focus()?'':btn('稍後繼續','pause','quiet')}</div>`}${s.mode==='lesson'&&!r35q?`<div class="steps">${names.map((n,i)=>`<span class="step ${i===s.stage?'current':i<s.stage?'done':''}" ${i===s.stage?'aria-current="step"':''}>${i+1} ${n}</span>`).join('')}</div>`:''}`;
  if(s.completed)return head+summaryHTML(s)+'</div>';
  const q=currentQ();if(q)return head+questionView(q)+'</div>';
  let body='';const ex=question(s.example);
  if(!oly&&s.stage===0)body=`<div class="scene">${esc(sk.lesson.scene)}</div><p>這課學習：<strong>${esc(sk.name_zh)}</strong></p><p class="muted">先用教具試一試，再一起做，最後自己完成 5 題。</p>${btn('開始動手探索　→','nextstage','primary')}`;
  if(s.stage===1){if(ui.tools.kind!==sk.tool)setTool(sk.tool,ex);body=`<h2>${ui.forceRemedy?'換個方法再試':'先動手，看看會怎樣。'}</h2><p>${esc(ui.forceRemedy?sk.lesson.remedy:sk.lesson.explore)}</p><div id="tool-region">${toolsHTML()}</div>${btn('我試過了，看看原理　→','nextstage','primary')}`;}
  if(s.stage===2)body=`<h2>${oly?'你剛才用的方法':'把圖像變成算式'}</h2><div class="scene">${esc(sk.lesson.concept)}</div><div class="mini-board"><strong>${esc(ex.stem_zh)}</strong>${illustration(ex)}<p>答案：${(ex.answerLabel?esc(typeof ex.answerLabel==='string'?ex.answerLabel:store.state.settings.language==='en'?ex.answerLabel.en:ex.answerLabel.zh):ansNum(ex))}${ex.remainder!==null?' 餘 '+ex.remainder:''}${ansUnit(ex)?' '+esc(ansUnit(ex)):''}</p><p>${esc(ex.explanation)}</p></div>${oly?`<div class="note">策略卡：${esc(L.data.cards.find(c=>c.id===sk.strategy).name)}。閱讀不會自動獲得卡片；下一步試着自己運用。</div>`:''}<div class="actions">${btn(oly?'用這個方法試新題　→':'一起做三題　→','nextstage','primary')}</div>`;
  if(oly&&s.stage===4)body=`<h2>同一題，可以換一條路。</h2><div class="scene">${esc(sk.lesson.concept)}</div><div class="note">${esc(C.fill(sk.lesson.alternative,ex.params))}</div><div class="actions">${btn('回想剛才的方法　→','nextstage','primary')}</div>`;
  if(s.stage===5){body=oly?`<h2>下次見到類似題目，你會先做甚麼？</h2><p class="muted">選擇本課真正用到的方法。不是選最快按答案的。</p><div class="stack">${[sk.lesson.reflection,'先亂估一個數，再不停按答案。','只把所有數字加起來，不看它們的關係。'].map((t,i)=>btn(esc(t),'reflect:'+i,i===s.reflection?'primary':'',`style="display:block;width:100%;text-align:left"`)).join('')}</div><div class="actions">${btn('完成這次探索','finish','primary',s.reflection!==null?'':'disabled')}</div>`:`<h2>今天的一個重點</h2><div class="scene">${esc(sk.lesson.concept)}</div><p>現在的感覺怎樣？</p><div class="row">${btn('明白了','self:good','primary')}${btn('有些不明白','self:unsure','secondary')}${btn('有點難，想換個方法','self:hard')}</div>`;}
  return head+`<section class="question-wrap motion">${body}</section></div>`;
 }
 function wq36Stars(g,t){return t>0&&g>=t?5:t>0&&g/t>=.9?4:t>0&&g/t>=.75?3:t>0&&g/t>=.5?2:1;}
 function summaryHTML(s){const r=s.results.filter(r=>r.mode!=='guided'&&r.mode!=='challenge-demo'),count=r.length,good=r.filter(r=>r.correct).length,clean=r.filter(r=>r.correct&&!(r.hint>0)).length,stars=wq36Stars(clean,count);const isDiagnostic=s.mode==='diagnostic',sk=skill();return `<div class="question-wrap"><div class="eyebrow">${isDiagnostic?'這是起點，不是評級':'你一直有動腦筋'}</div><h2>${isDiagnostic?'知道下一步怎樣開始了。':'完成一輪，有新發現。'}</h2>${!isDiagnostic?`<div class="summary-score" aria-label="${stars} 顆星">${'★'.repeat(stars)}${'☆'.repeat(5-stars)}</div>`:''}<p>${isDiagnostic?'起步測試不會顯示總分。':`你完成了 ${count} 次自己作答的練習。需要訂正的題目，會用新數字再練。`}</p>${store.profile.grade>=4&&store.state.settings.showScore&&!isDiagnostic?`<p>本輪正確：${good}/${count}</p>`:''}<div class="notice">${!store.profile.persistent?'訪客模式沒有金幣。建立學習檔案後，才會儲存。':isDiagnostic?'起步測試沒有獎勵。':s.award?`◉ 本輪獲得 ${s.award} 枚金幣。`:(stars<5?'滿 5 顆星，才有金幣。':'這輪沒有多得金幣。今天可能已完成同一個任務。')}${s.rewardError?`<br>${esc(s.rewardError)}；記錄已保留，家長頁可重試。`:''}</div>
 ${sk?.strategy&&store.state.cards.includes(sk.strategy)?`<div class="card badge-card"><h3>✓ 已收集策略卡</h3><p>${esc(L.data.cards.find(c=>c.id===sk.strategy).name)}</p></div>`:''}
 ${s.self==='hard'||s.self==='unsure'?`<div class="note"><strong>下次換個方法：</strong>${esc(sk?.lesson.remedy||'先用教具，再試一小步。')}${sk?btn('現在換個方法教','remedy:'+sk.id,'tiny-link'):''}</div>`:''}
 <h3 style="margin-top:23px">下一步</h3>${[...new Set(r.filter(a=>!a.correct).map(a=>a.skill))].slice(0,3).map(id=>`<div class="report-row"><span>${esc(L.skills.get(id).name_zh)}</span>${btn('換個方法再學','remedy:'+id,'quiet')}</div>`).join('')||'<p>過一段時間再試新題，看看還記不記得這個方法。</p>'}<div class="actions">${btn('返回學習首頁','completed-home','primary')}${btn('查看學習進度','completed-parent','quiet')}</div></div>`;}
 function parent(){const state=store.state,today=C.hkDay(),from=C.plusDay(today,-6),a=state.attempts.filter(a=>C.hkDay(a.at)>=from&&a.mode!=='guided'&&a.mode!=='challenge-demo'),normal=a.filter(x=>x.track==='normal'),oly=a.filter(x=>x.track==='olympiad'),minutes=Object.entries(state.usage).filter(([d])=>d>=from).reduce((a,[_,b])=>a+b,0),days=Object.keys(state.usage).filter(d=>d>=from&&state.usage[d]>0).length;
  const weak=[...new Set(normal.filter(a=>!a.correct).map(a=>a.skill))];return `<div class="parentview"><div class="section-head"><div><div class="eyebrow">看清楚進度，不和別人比</div><h1>${esc(store.profile.name)}的學習週報</h1><span class="small muted">${from} 至 ${today} · 香港日期</span></div>${btn('匯出數學備份','export','secondary')}</div><div class="stats">${statCard(days,'有學數學的日數')}${statCard(df(minutes),'數學使用分鐘')}${statCard(L.data.skills.filter(s=>s.track==='normal'&&C.mastery(state,s).achieved>=Date.parse(from+'T00:00:00+08:00')).length,'本週新達標技能')}</div>
 <div class="grid2"><section class="card"><h2>普通數學</h2><p class="muted">${normal.length} 次自己作答的練習紀錄 · 已掌握 ${mastered('normal')} 個入門技能</p>${weak.length?weak.slice(0,5).map(id=>{const m=Object.values(state.mistakes).find(m=>m.skill===id),mi=m?L.data.misconceptions[m.code]:null;return `<div class="report-row"><div><strong>${esc(L.skills.get(id).name_zh)}</strong><p>${esc(mi?.name||'需要再練一次')} · ${esc(mi?.remedy||L.skills.get(id).lesson.remedy)}</p></div>${btn('下一步','remedy:'+id,'quiet')}</div>`;}).join(''):'<p>尚未找到本週需要留意的弱項。</p>'}</section><section class="card"><h2>奧數 · 另外的紀錄</h2><p>${oly.length} 次自己作答的練習紀錄</p><p>已收集 ${state.cards.length} 張入門策略卡。</p><div class="note">奧數做錯，不會扣普通數學的掌握度。</div>${btn('查看策略卡','nav:cards','quiet')}</section></div>
 <div class="section-head"><h2>錯題本 · 用新題再試</h2></div><div class="card">${Object.values(state.mistakes).filter(m=>!m.cleared).map(m=>`<div class="report-row"><div><strong>${esc(L.skills.get(m.skill)?.name_zh||m.skill)}</strong> ${tag(m.track==='normal'?'普通數學':'奧數')}<p>${esc(L.data.misconceptions[m.code]?.name||'再看一次')} · 下次 ${esc(m.due[0]||today)}</p></div>${btn('做兩題新題','mistake:'+m.skill,'quiet')}</div>`).join('')||'<p>暫時沒有待重溫的錯題技能。</p>'}</div>
 <div class="section-head"><h2>安排與控制</h2>${tag(root.WQM_INTEGRATED?'沿用英文部分的家長確認':'這部裝置上的家長頁 · 沒有身份驗證')}</div><section class="card"><div class="grid2"><div class="field"><label for="school">學校正在教的單元</label><select id="school"><option value="">按技能進度安排</option>${L.data.units.filter(u=>u.skills.length).map(u=>`<option value="${u.id}" ${state.settings.schoolUnit===u.id?'selected':''}>小${'一二三四五六'[u.grade-1]||u.grade} · ${u.id} ${u.name}</option>`).join('')}</select></div><div class="field"><label for="language">題目文字</label><select id="language">${[['zh','繁體中文'],['en','English'],['bi','中英雙語']].map(([v,t])=>`<option value="${v}" ${state.settings.language===v?'selected':''}>${t}</option>`).join('')}</select></div><div class="field"><label for="voice">讀題聲音（需裝置支援）</label><select id="voice">${[['yue-HK','粵語'],['zh-CN','普通話'],['en-GB','英式英文']].map(([v,t])=>`<option value="${v}" ${state.settings.voice===v?'selected':''}>${t}</option>`).join('')}</select></div></div>
 ${[['olympiad','開啟思維之塔（奧數選修）'],['sound','播放答題音效'],['slow','慢速模式：不再顯示「快速亂估」提示。所有練習本來都沒有計時。'],['showScore','高小顯示數值成績（小一至小三不顯示百分比）']].map(([k,t])=>`<label class="switch"><input type="checkbox" id="setting-${k}" ${state.settings[k]?'checked':''}><span>${esc(t)}</span></label>`).join('')}<div class="row">${btn('儲存安排','save-settings','primary')}${btn('試聽讀題','sample-speech','quiet')}</div><p class="small muted">沒有排行榜、通知或廣告。</p></section>
 <div class="section-head"><h2>資料與可靠性</h2></div><div class="card"><p>所有資料只存在這部裝置的瀏覽器。清除瀏覽資料、換網址、換瀏覽器或更改本機檔案位置，都可能看不到原有進度。先保留備份。</p><div class="row">${btn('匯出目前孩子的數學資料','export','secondary')}${btn('匯入同一孩子的備份','import')}${btn('轉入舊數學紀錄','migrate','secondary')}${btn('重試未處理的獎勵','flush')}${btn('清除目前孩子的數學進度','clear-maths','danger')}</div><input type="file" id="import-file" accept="application/json,.json" hidden><p class="small muted">家長頁的「家庭完整備份」，則一次包含全部孩子、圖片和音檔。清除數學進度，不會收回已給的英文金幣。</p>${state.reports.length?`<p>有 ${state.reports.length} 條題目報錯紀錄，已包含在數學備份中，還沒有傳到網上。</p>`:''}</div><div class="section-head"><h2>中英數學詞彙</h2></div><div class="grid2">${L.data.glossary.map(g=>`<div class="card"><h3>${esc(g.zh)} · ${esc(g.en)}</h3><p class="small muted">${esc(g.note)}</p>${btn('聽英文','term:'+g.en,'quiet')}</div>`).join('')}</div></div>`;}
 function profiles(){if(root.WQM_INTEGRATED)return '<div class="card">請回到英文部分，用原有的切換孩子功能。</div>';return `<div class="section-head"><div><div class="eyebrow">在這部裝置上</div><h1>一人一份學習紀錄</h1></div></div><div class="notice">沒有收集電郵、真名、學校或密碼，也沒有把資料傳到網上。</div><div class="grid2"><div class="card"><h2>選擇孩子</h2>${bridge.children().map(c=>`<div class="report-row"><span>${esc(c.name)} · 小${'一二三四五六'[c.grade-1]||c.grade}</span>${btn('使用此檔案','switch:'+c.id,'quiet')}</div>`).join('')||'<p>尚未建立學習檔案。</p>'}${btn('不用儲存，訪客試玩','guest','quiet')}${store.profile.persistent?btn('刪除目前孩子在這部裝置上的資料','delete-profile','danger'):''}</div><div class="card"><h2>由家長建立學習檔案</h2><div class="field" style="margin-top:18px"><label for="nickname">暱稱（不用真名）</label><input id="nickname" maxlength="24" placeholder="例如：樂樂"></div><div class="field" style="margin-top:15px"><label for="new-grade">年級</label><select id="new-grade">${[1,2,3,4,5,6].map(n=>`<option value="${n}" ${n===3?'selected':''}>小${'一二三四五六'[n-1]}</option>`).join('')}</select></div><label class="switch"><input type="checkbox" id="consent"><span>我是家長／照顧者，同意在這個瀏覽器儲存孩子的暱稱、年級和學習資料。</span></label>${btn('建立本機學習檔案','create-profile','primary')}</div></div>`;}
 function companion(){
  if(!root.WQM_INTEGRATED||!root.WQ32?.mathHTML||r35Focus())return '';
  const s=current(),q=currentQ(),sk=skill()||(q?L.skills.get(q.skill):null);
  const unit=String(sk?.unit||sk?.id||q?.skill||'');
  return root.WQ32.mathHTML({view,grade:store.profile.grade,mode:s?.mode||'',track:s?.track||(view==='olympiad'||view==='cards'?'olympiad':'normal'),rest:awaitingBreak,completed:!!s?.completed,feedback:s?.feedback?(s.feedback.correct?'correct':'retry'):'',hinted:!!s?.hint,exploring:view==='lesson'&&(s?.stage===1||ui.toolOpen),visual:/(^[1-6][MSD])|fraction|segments|angle|chart|solid/.test(unit+' '+(sk?.tool||'')),earlyNumber:!!sk&&sk.grade<=2&&/^[12]N/.test(unit),busy:view==='lesson'&&!s?.feedback&&!!q});
 }
 // Patch only the companion's DOM; never rerender the question or save study state.
 function refreshForestOnly(){
  if(!app||!store)return;const slot=app.querySelector('#forest-math-slot');if(!slot)return;
  const open=slot.querySelector('[data-forest-options]')?.getAttribute('aria-expanded')==='true';
  const focused=shadow.activeElement,focusKey=slot.contains(focused)?focused?.dataset?.forestPref:null,focusOptions=slot.contains(focused)&&focused?.hasAttribute('data-forest-options');
  slot.innerHTML=companion();
  if(open){const panel=slot.querySelector('.forest-options'),button=slot.querySelector('[data-forest-options]');if(panel)panel.hidden=false;button?.setAttribute('aria-expanded','true');}
  if(focusKey)slot.querySelector('[data-forest-pref="'+focusKey+'"]')?.focus({preventScroll:true});else if(focusOptions)slot.querySelector('[data-forest-options]')?.focus({preventScroll:true});
 }

 function render(){if(!store)return;wq36Fix();const s=current();let content;
  if(view==='resume')content=`<div class="hero"><div><div class="eyebrow">歡迎回來</div><h1>上次學到這裏。</h1><p>已提交的答案已儲存。可以繼續上次的一課，或結束這一輪再重新選擇。</p><div class="row">${btn('繼續上次學習','resume','primary')}${btn('結束這輪','abandon','quiet')}</div></div></div>`;
  else content=({home,normal:catalog,olympiad,cards,tools:toolsPage,parent,profiles,lesson})[view]?.()||home();
  if(current()&&!current().completed&&['home','olympiad'].includes(view))content=`<div class="wq36-resume"><span>有一課做到一半</span>${btn('繼續上次學習','resume','primary')}</div>`+content;
  if(awaitingBreak)content=`<div class="hero"><div><div class="eyebrow">離開螢幕一下</div><h1>先休息一下。</h1><p>已連續使用約 20 分鐘。放下裝置，看看遠處，活動一下。</p>${btn('休息後繼續','rested','primary')}</div></div>`;
  app.innerHTML=`<div class="wqm ${store.profile.grade>=5?'older':''}${r35Focus()?' focus':''}"><div class="shell">${r35Header()}${ui.error?`<div class="notice" role="alert">${esc(ui.error)}</div>`:''}${store.profile.recoveryError?btn('匯出原有孩子名單（不修改）','export-registry','quiet'):''}${store.state.upgradeNotice?`<div class="notice">${esc(store.state.upgradeNotice)}</div>`:''}<div id="forest-math-slot">${companion()}</div>${content}</div></div>`;
  app.querySelectorAll('input,select').forEach(e=>e.addEventListener('change',changeHandler));
  const ans=app.querySelector('#answer');if(ans)ans.addEventListener('input',()=>{const sent=app.querySelector('#sentence');if(sent)sent.textContent='應找回 '+(ans.value||'＿＿')+' '+(app.querySelector('#unit')?.value||'＿＿')+'。';});
 }
 function redrawTool(){const el=app.querySelector('#tool-region');if(el){const focused=shadow.activeElement,action=focused?.getAttribute('data-action'),id=focused?.id;el.innerHTML=toolsHTML();el.querySelectorAll('select,input[type=range]').forEach(e=>e.addEventListener('change',changeHandler));const next=action?[...el.querySelectorAll('[data-action]')].find(e=>e.dataset.action===action):id?el.querySelector('#'+id):null;if(next&&!next.disabled)next.focus({preventScroll:true});}}
 function changeHandler(e){if(e.target.id.startsWith('tool-')){try{canStudy();}catch(err){fail(err);return;}}const id=e.target.id,v=Number(e.target.value),t=ui.tools;if(id.startsWith('tool-r3-')){root.WQMathVisuals.change(t,id.slice(8),v);t.changed++;redrawTool();return;}if(id==='tool-den'){t.den=v;t.num=Math.min(t.num,v);}else if(id==='tool-den2'){t.den2=v;t.num2=Math.min(t.num2,v);}else if(id==='tool-rows')t.rows=v;else if(id==='tool-cols')t.cols=v;else if(id==='tool-points'){t.points=v;t.pairs=[];t.first=null;}else if(id==='tool-tens')t.tens=v;else if(id==='tool-ones')t.ones=v;else if(id==='unit'){const a=app.querySelector('#answer');const sent=app.querySelector('#sentence');if(sent)sent.textContent='應找回 '+(a?.value||'＿＿')+' '+(e.target.value||'＿＿')+'。';return;}else return;t.changed++;redrawTool();}
 function toolAction(parts){canStudy();const t=ui.tools,k=parts[1],n=Number(parts[2]);t.changed++;
  if(k==='cell')t.cells[n]=!t.cells[n];if(k==='more'){const i=t.cells.indexOf(false);if(i>=0)t.cells[i]=true;}if(k==='less'){const i=t.cells.lastIndexOf(true);if(i>=0)t.cells[i]=false;}
  if(k==='clear'){const kind=t.kind;ui.tools=defaultTool(kind);for(const k of ['questionId','lineMax','mode','dividend','divisor','extra'])ui.tools[k]=t[k];if(kind==='array'){ui.tools.shared=0;ui.tools.rows=t.rows;ui.tools.cols=t.cols;}if(kind==='blocks'){ui.tools.h=ui.tools.t=ui.tools.o=0;}if(kind==='tenframe')ui.tools.cells.fill(false);if(kind==='segments')ui.tools.points=t.points;if(kind==='fraction'){ui.tools.den=t.den;ui.tools.den2=t.den2;ui.tools.num=0;ui.tools.num2=t.num2;}}
  if(k==='one'&&t.o<99)t.o++;if(k==='ten'&&t.t<99)t.t++;if(k==='hundred'&&t.h<9)t.h++;
  if(k==='split'&&t.t&&t.o<=89){t.t--;t.o+=10;}if(k==='merge'&&t.o>=10&&t.t<99){t.t++;t.o-=10;}if(k==='splith'&&t.h&&t.t<=89){t.h--;t.t+=10;}
  if(k==='jump')C.moveOnLine(t,n);if(k==='share')C.sharingStep(t,n);if(k==='part')t.num=t.num===n+1?n:n+1;
  if(k==='digit'){const delta=Number(parts[3]);t.digits[n]=Math.max(0,Math.min(9,t.digits[n]+delta));}
  if(k==='coin'){if(t.money.length<50)t.money.push(n);else toast('先把部分金額換成較大的錢幣。');}if(k==='remove-coin')t.money.splice(n,1);
  if(k==='front'||k==='back')t[k]=Math.max(0,Math.min(20,t[k]+n));
  if(k==='point'){if(t.first===null)t.first=n;else{if(t.first!==n){const pair=[t.first,n].sort((a,b)=>a-b);if(!t.pairs.some(p=>p[0]===pair[0]&&p[1]===pair[1]))t.pairs.push(pair);}t.first=null;}}
  if(k==='entry'){const x=t.tens*10+t.ones;if(!t.entries.includes(x))t.entries.push(x);}
  redrawTool();
 }
 async function submit(){canStudy();const s=current(),q=currentQ();if(!s||!q||s.feedback)return;let input;
  if(s.game==='numberline')input={value:String(ui.tools.position)};
  else if(s.game==='money'){const sum=ui.tools.money.reduce((a,b)=>a+b,0);input={value:String(sum)};}
  else if(q.type==='choice'){if(!s.picked){toast('先選一個答案。');return;}input={value:s.picked};}
  else input={value:app.querySelector('#answer')?.value||'',expression:app.querySelector('#expression')?.value||'',unit:app.querySelector('#unit')?.value||'',remainder:app.querySelector('#remainder')?.value||''};
  // Cash game evaluates amount only: no fabricated expression/process credit.
  const scoredQ=s.game==='money'?{...q,type:'number',unit:''}:q;
  const result=C.mark(scoredQ,input);if(!result.valid){toast(result.message);return;}
  const mode=s.mode==='lesson'&&s.stage===3&&s.track==='normal'?'guided':s.mode==='lesson'&&s.stage===0&&s.track==='olympiad'?'challenge-demo':s.mode;
  const time=Math.min(3600000,Math.max(0,(s.elapsedQuestionMs||0)+Date.now()-s.questionAt));let fastPause=false;
  save(n=>{const ss=n.current;const r=C.record(n,L,scoredQ,input,{id:ss.id+':'+ss.stage+':'+ss.index,at:Date.now(),hint:ss.hint,time_ms:time,independent:mode!=='guided'&&mode!=='challenge-demo',mode});
   if(r.duplicate)return;ss.feedback={...r,answer:input};ss.results.push({skill:q.skill,correct:r.correct,credit:r.credit,hint:ss.hint,mode,time_ms:time,at:Date.now()});
   if(q.type==='choice'&&time<2000&&!n.settings.slow)ss.fast++;else ss.fast=0;if(ss.fast>=3){fastPause=true;ss.fastPause=true;ss.fast=0;}
  });sound(result.correct);render();const feedbackNode=app.querySelector('.feedback');if(feedbackNode){feedbackNode.tabIndex=-1;feedbackNode.focus({preventScroll:true});}if(fastPause)toast('慢慢想。你已連續快速選了三次；下一題先讀清楚，再作答。');
 }
 function nextQ(){const s=current();if(!s?.feedback||s.fastPause)return;save(n=>{const ss=n.current,q=question(ss.queues[ss.stage][ss.index]);
   if(ss.hint===5&&!ss.replacements.includes(ss.stage+':'+ss.index)){const newRef=ref(C.nextQuestion(n,L,q.skill,q.difficulty,q));ss.queues[ss.stage].splice(ss.index+1,0,newRef);ss.replacements.push(ss.stage+':'+ss.index);}
   ss.index++;ss.feedback=null;ss.hint=0;ss.draft='';ss.draftExpression='';ss.draftUnit='';ss.draftRemainder='';ss.picked='';ss.questionAt=Date.now();ss.elapsedQuestionMs=0;ss.questionPaused=false;delete ss.toolState;
   if(ss.index>=ss.queues[ss.stage].length){if(ss.mode!=='lesson'){ss.stage=5;}else{ss.stage++;ss.index=0;}if(ss.mode==='lesson'&&ss.track==='normal'&&ss.stage===3)ss.hint=2;}
  });ui.toolOpen=false;const ss=current();if(ss.game)setTool(ss.game);
  if(ss.mode!=='lesson'&&ss.stage===5)finishSession();else{render();readAuto();}
 }
 function nextStage(){save(n=>{const s=n.current;s.stage++;s.index=0;s.feedback=null;s.hint=s.stage===3&&s.track==='normal'?2:0;s.picked='';s.draft='';s.draftExpression='';s.draftUnit='';s.draftRemainder='';s.questionAt=Date.now();s.elapsedQuestionMs=0;s.questionPaused=false;delete s.toolState;});ui.toolOpen=false;const sk=skill();setTool(sk.tool,currentQ()||(current().example?question(current().example):null));render();readAuto();}
 function finishSession(){const existing=current();if(!existing||existing.completed)return;if(existing.track==='olympiad'&&existing.mode==='lesson'&&existing.reflection!==0){toast('再看看本課真正用到的方法。');return;}
  save(n=>{const s=n.current;if(s.completed)return;s.completed=true;s.finishedAt=Date.now();const r=s.results.filter(r=>r.mode!=='guided'&&r.mode!=='challenge-demo'&&r.hint<5),needed=s.track==='olympiad'&&s.mode==='lesson'?3:5;
   const all=s.results.filter(r=>r.mode!=='guided'&&r.mode!=='challenge-demo'),valid=s.mode!=='diagnostic'&&r.length>=needed&&r.length===all.length&&all.every(r=>r.correct&&!(r.hint>0));
   const sk=L.skills.get(s.skill);
   if(sk){n.lessons[sk.id]={at:s.finishedAt,self:s.self||'',completed:true};if(sk.strategy&&s.reflection===0&&r.filter(r=>r.correct&&r.hint===0).length>=2&&!n.cards.includes(sk.strategy))n.cards.push(sk.strategy);}
   n.sessions.push({id:s.id,skill:s.skill,track:s.track,mode:s.mode,at:s.finishedAt,attempts:r.length,correct:r.filter(r=>r.correct).length});n.sessions=n.sessions.slice(-300);
   // One activity key per skill/day, shared across learning and practice appearances.
   const key=(s.track==='normal'?'normal':'olympiad')+':'+(s.skill||'daily');
   n.outbox=n.outbox.filter(e=>!e.settled||e.day>=C.plusDay(C.hkDay(),-30));
   if(store.profile.persistent&&valid)C.enqueueReward(n,{key,startedAt:s.startedAt,completedAt:s.finishedAt,valid:true});
  });let reward=0,error='';try{reward=store.flush();}catch(e){error=e.message;}
  save(n=>{n.current.award=reward;n.current.rewardError=error;});render();
 }
 function sound(ok){if(!store.state.settings.sound)return;try{audio=audio||new (root.AudioContext||root.webkitAudioContext)();audio.resume();const t=audio.currentTime;[ok?523:330,ok?659:294].forEach((f,i)=>{const o=audio.createOscillator(),g=audio.createGain();o.type='sine';o.frequency.value=f;g.gain.setValueAtTime(.0001,t+i*.12);g.gain.exponentialRampToValueAtTime(.045,t+i*.12+.02);g.gain.exponentialRampToValueAtTime(.0001,t+i*.12+.18);o.connect(g);g.connect(audio.destination);o.start(t+i*.12);o.stop(t+i*.12+.2);});}catch(_){toast('裝置暫時未能播放音效；不影響作答。');}}
 function speech(text,lang){if(root.WQR3?.voice().mode==='server'){root.WQR3Speech?.cancel();root.speechSynthesis?.cancel();root.WQR3Speech.speak(text,lang,store.state.settings.slow).catch(e=>toast(e.message));return;}if(!('speechSynthesis'in root)){toast('這個瀏覽器沒有讀題功能。');return;}const voices=root.speechSynthesis.getVoices();const match=lang==='yue-HK'?v=>/^(yue|zh[-_]HK)/i.test(v.lang):v=>v.lang.toLowerCase()===lang.toLowerCase();const v=voices.find(match);if(!v){toast(`這部裝置沒有可用的${lang==='yue-HK'?'粵語':lang==='en-GB'?'英式英文':'普通話'}聲音。文字仍可使用。`);return;}
  root.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang=lang;u.voice=v;u.rate=store.state.settings.slow?.8:.9;u.onerror=()=>toast('讀題未能完成，請再按一次。');root.speechSynthesis.speak(u);
 }
 function speakQ(){const q=currentQ();if(!q)return;const lang=store.state.settings.voice;speech(lang==='en-GB'?q.stem_en:lang==='yue-HK'?q.speech_yue:q.stem_zh,lang);}
 function readAuto(){const q=currentQ();if(q&&store.profile.grade<=2&&!current().feedback){setTimeout(()=>{if(currentQ()?.id===q.id&&active())speakQ();},180);}}
 function download(name,value,type='application/json'){const blob=new Blob([typeof value==='string'?value:JSON.stringify(value,null,2)],{type});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}

 let r3Migration=null;
 async function chooseMigration(){
  if(bridge.parentAllowed?.()===false)throw Error('請先完成家長確認');
  const input=app.querySelector('#import-file');input.value='';input.onchange=async ev=>{try{const f=ev.target.files[0];if(!f)return;if(f.size>2500000)throw Error('數學備份超過 2.5 MB');const raw=JSON.parse(await f.text()),p=root.WQFamilyCore.portableMath(raw,C,L);if(!root.crypto.subtle)throw Error('這個瀏覽器不能檢查備份檔。請用 https 網址，或本機啟動器。');const bytes=new TextEncoder().encode(JSON.stringify(p));const hash=[...new Uint8Array(await root.crypto.subtle.digest('SHA-256',bytes))].map(v=>v.toString(16).padStart(2,'0')).join('');
   r3Migration={payload:p,hash,scope:store.scope};const box=document.createElement('section');box.id='r3-math-preview';box.className='card';box.innerHTML=`<h2>核對舊紀錄 → 目前孩子</h2><p>來源：${esc(p.profile.name)}，小${'一二三四五六'[p.profile.grade-1]||p.profile.grade}，${p.state.attempts.length} 次作答。</p><p>目標：${esc(store.profile.name)}，小${'一二三四五六'[store.profile.grade-1]||store.profile.grade}，已有 ${store.state.attempts.length} 次作答。</p><div class="note">會保留現有的英文金幣，不會再給舊的獎勵。已提交的數學紀錄會合併，相同的紀錄只留一份。已完成的評分不會重新計算，掌握度以最後更新的一份為準。同一天的數學時間，取較大的一個，不會把可能重疊的時間加起來。沒完成的舊練習不會轉入。</div><label><input id="r3-math-consent" type="checkbox">我確認來源紀錄屬於目前孩子</label>${btn('確認合併舊紀錄','confirm-migrate','primary')}`;
   app.querySelector('#r3-math-preview')?.remove();app.querySelector('.shell').prepend(box);box.scrollIntoView({block:'start'});
  }catch(e){fail(e);}};input.click();
 }
 function confirmMigration(){if(bridge.parentAllowed?.()===false)throw Error('請先完成家長確認');if(!r3Migration||r3Migration.scope!==store.scope)throw Error('目標孩子已改變，請重新選擇備份');if(!app.querySelector('#r3-math-consent')?.checked)throw Error('請先核對舊紀錄和目前的孩子，並勾選確認。');const r=store.migrate(r3Migration.payload,r3Migration.hash);r3Migration=null;view='parent';render();toast(`已合併 ${r.addedAttempts} 筆舊紀錄，合共 ${r.totalAttempts} 筆；沒有重複給金幣。`);}
 function makeMock(level){canStudy();if(![1,2,3,4].includes(level))throw Error('模擬卷的級別不正確。');if(!store.state.settings.olympiad)throw Error('家長已關閉奧數');
  const pool=L.data.skills.filter(s=>s.track==='olympiad'&&(s.level||1)===level);if(pool.length<5)throw Error('這個級別的題庫還沒齊全。');save(n=>{const queues={4:[]};for(let i=0;i<10;i++)queues[4].push(ref(C.nextQuestion(n,L,pool[i%pool.length].id,Math.min(3,1+Math.floor(i/4)))));n.current={id:S.uid(),skill:null,track:'olympiad',mode:'diagnostic',game:null,stage:4,index:0,queues,example:null,startedAt:Date.now(),questionAt:Date.now(),activeMs:0,hint:0,feedback:null,results:[],replacements:[],completed:false,rewardDone:false,fast:0,draft:'',picked:'',reflection:null,r3MockLevel:level};});view='lesson';ui.toolOpen=false;render();toast('原創 10 題模擬卷。');
 }

 async function action(e){const el=e.target.closest?.('[data-action]');if(!el)return;e.preventDefault();const a=el.dataset.action,parts=a.split(':');if(ui.busy)return;tickUsage();ui.busy=true;
  try{
   if(root.WQM_INTEGRATED && (['nav:parent','completed-parent'].includes(a)||['save-settings','import','migrate','confirm-migrate','export','clear-maths','delete-profile','create-profile'].includes(a)) && bridge.parentAllowed?.()===false){
     wq33Fast=true;const wq33Ok=close()!==false;wq33Fast=false;if(wq33Ok)wq33AfterPop(()=>bridge.openParentGate?.());return;
   }
   if(parts[0]==='tool'){toolAction(parts);return;}
   if(parts[0]==='r3tool'){canStudy();root.WQMathVisuals.step(ui.tools,parts[1],Number(parts[2]));ui.tools.changed++;redrawTool();return;}
   if(parts[0]==='olylevel'){ui.olyLevel=Number(parts[1]);render();return;}
   if(parts[0]==='mock'){makeMock(Number(parts[1]));return;}
   if(parts[0]==='nav'){if(current()&&!current().completed&&view==='lesson'){preserveWork(true);view='resume';render();return;}view=parts[1];if(view==='tools')setTool(ui.freeTool);render();return;}
   if(parts[0]==='grade'){ui.grade=Number(parts[1]);render();return;}
   if(parts[0]==='lesson'||parts[0]==='practice'||parts[0]==='remedy'||parts[0]==='mistake'){
    ui.forceRemedy=parts[0]==='remedy';makeSession(parts[1],parts[0]==='practice'||parts[0]==='mistake'?'practice':'lesson');
    if(parts[0]==='mistake'){save(n=>n.current.queues[4]=n.current.queues[4].slice(0,2));render();}
    if(parts[0]==='remedy'){save(n=>n.current.stage=1);render();}return;
   }
   if(parts[0]==='daily'||parts[0]==='diagnostic'){makePlan(parts[0],parts[1]);return;}
   if(parts[0]==='selecttool'){canStudy();setTool(parts[1]);render();return;}
   if(parts[0]==='game'){const id=parts[1]==='money'?'2N5.3':'1N2.2';makeSession(id,'practice',parts[1]);return;}
   if(parts[0]==='choice'){if(current().feedback)return;save(n=>n.current.picked=currentQ().choices[Number(parts[1])].value);render();return;}
   if(parts[0]==='key'){const f=app.querySelector('#answer');if(!f)return;f.value=parts[1]==='⌫'?f.value.slice(0,-1):(f.value+parts[1]).slice(0,60);f.focus();return;}
   if(parts[0]==='reflect'){save(n=>n.current.reflection=Number(parts[1]));render();return;}
   if(parts[0]==='self'){save(n=>n.current.self=parts[1]);finishSession();return;}
   if(parts[0]==='switch'){bridge.switch(parts[1]);initStore();render();return;}
   if(parts[0]==='term'){speech(parts.slice(1).join(':'),'en-GB');return;}
   switch(a){
    case 'submit':await submit();break;
    case 'nextq':nextQ();break;
    case 'nextstage':nextStage();break;
    case 'finish':finishSession();break;
    case 'hint':{if(current().feedback)return;canStudy();const q=currentQ();save(n=>{n.current.draft=app.querySelector('#answer')?.value||'';n.current.draftExpression=app.querySelector('#expression')?.value||'';n.current.draftUnit=app.querySelector('#unit')?.value||'';n.current.draftRemainder=app.querySelector('#remainder')?.value||'';n.current.hint=Math.min(5,n.current.hint+1);});if(current().hint>=3){if(!ui.toolOpen||ui.tools.questionId!==q.id)setTool(L.skills.get(q.skill).tool,q);ui.toolOpen=true;}render();break;}
    case 'unpause-fast':save(n=>n.current.fastPause=false);render();break;
    case 'speak':speakQ();break;
    case 'pause':preserveWork(true);view='resume';root.WQR3Speech?.cancel();root.speechSynthesis?.cancel();render();break;
    case 'resume':if(current()?.track==='olympiad'&&!store.state.settings.olympiad)throw Error('家長已關閉奧數；這輪已保留，重新開啟後才可繼續。');canStudy();save(n=>{n.current.questionAt=Date.now();n.current.questionPaused=false;});restoreTool();view='lesson';render();readAuto();break;
    case 'abandon':if(confirm('結束這輪？已提交的作答紀錄會保留。')){save(n=>n.current=null);view='home';render();}break;
    case 'completed-home':case 'completed-parent':save(n=>n.current=null);view=a==='completed-home'?'home':'parent';render();break;
    case 'close':if(close()!==false)root.WQ36Home?.();break;
    case 'rested':awaitingBreak=false;continuous=0;activeSince=Date.now();render();break;
    case 'create-profile':bridge.add(app.querySelector('#nickname').value,Number(app.querySelector('#new-grade').value),app.querySelector('#consent').checked);initStore();view='home';render();break;
    case 'guest':bridge.guest();initStore();view='home';render();break;
    case 'delete-profile':if(confirm('要永久刪除目前孩子在這部裝置上的數學資料嗎？請先匯出備份。')){bridge.remove();initStore();view='profiles';render();}break;
    case 'save-settings':save(n=>{const st=n.settings;st.schoolUnit=app.querySelector('#school').value;st.language=app.querySelector('#language').value;st.voice=app.querySelector('#voice').value;for(const k of ['sound','slow','olympiad','showScore'])st[k]=app.querySelector('#setting-'+k).checked;});toast('安排已儲存。');break;
    case 'sample-speech':{const v=app.querySelector('#voice').value;speech(v==='en-GB'?'Let us try a new way to solve the problem.':v==='zh-CN'?'我們試着用另一個方法思考。':'我哋試下用另一個方法去諗。',v);break;}
    case 'export-registry':download('SmartQuest_registry_recovery.txt',localStorage.getItem('wqm-profiles-v1')||'沒有可讀的原始名單','text/plain');break;
    case 'export':if(store.readOnly){download('SmartQuest_Maths_unreadable_raw.txt',localStorage.getItem(store.key)||'', 'text/plain');toast('已匯出原始資料，沒有覆蓋或自動修復。');}else download('SmartQuest_Maths_'+store.profile.id+'.json',store.export());break;
    case 'migrate':await chooseMigration();break;
    case 'confirm-migrate':confirmMigration();break;
    case 'import':app.querySelector('#import-file').click();app.querySelector('#import-file').onchange=async ev=>{try{const f=ev.target.files[0];if(!f)return;if(f.size>2500000)throw Error('備份大於 2.5 MB');const v=JSON.parse(await f.text());if(confirm('取代目前孩子的數學資料？原英文資料不會改動。')){store.import(v);view='parent';render();toast('數學資料已還原，沒有重新給金幣。');}}catch(err){fail(err);}};break;
    case 'flush':{const n=store.flush();render();toast(n?'已處理 '+n+' 枚金幣。':'沒有未處理的新金幣。');break;}
    case 'clear-maths':if(confirm('只清除目前孩子的數學進度？英文內容和英文部分的金幣都不變。')){const old=store.state;save(n=>{const b=C.blank();b.wallet=old.wallet;b.settings=old.settings;b.outbox=old.outbox;b.usage=old.usage;b.created=old.created;b.serial=old.serial;b.revision=n.revision;for(const k of Object.keys(n))delete n[k];Object.assign(n,b);n.current=null;});view='home';render();}break;
    case 'report-item':{const q=currentQ();save(n=>{n.reports.push({template:q.templateId,seed:q.seed,skill:q.skill,at:Date.now()});n.reports=n.reports.slice(-100);});toast('已記錄這道題目，會跟數學備份一起儲存，還沒有上傳到網上。');break;}
   }
  }catch(err){fail(err);}finally{ui.busy=false;}
 }
 function open(requested='home'){
   if(!root.WQM_INTEGRATED)return;
   if(!bridge)throw Error('連接不到英文部分的帳戶，也沒有另建金幣紀錄。請回到英文部分，重新整理頁面再試。');
   if(dialog?.open){if(current()&&!current().completed&&view==='lesson')preserveWork(true);dialog.focus();return;}
   bridge.beforeOpen?.();
   if(requested==='parent'&&bridge.parentAllowed?.()===false){bridge.openParentGate?.();return;}
   initStore();
   if(requested==='olympiad')wq36Scope='olympiad';else if(['home','normal'].includes(requested))wq36Scope='normal';
   else if(store.state.current)wq36Scope=store.state.current.track==='olympiad'?'olympiad':'normal';
   if(store.state.current&&!store.state.current.completed&&['home','normal','olympiad'].includes(requested)&&(store.state.current.track==='olympiad')!==wq36Oly()){try{save(n=>{n.current=null;});view='home';}catch(e){fail(e);}}
   if(!store.state.current && ['home','normal','olympiad','parent'].includes(requested))view=requested;
   if(requested==='parent')view='parent';
   render();dialog.showModal();wq33Push();activeSince=Date.now();app.querySelector('button')?.focus();
 }
 // R3.3 p10: one history entry per open maths dialog. Back closes it; Esc / close button pop it again.
 // The pop is deferred (250ms; 0ms for the parent-gate hand-over) so close() followed by open() simply reuses the entry, a navigation made
 // right after close() is never undone, and the parent gate waits for the pop to finish (a late history.back() would undo it).
 // While our own history.back() is in flight (wq33Fly) a foreign navigation can be overtaken by it (the traversal lands on the entry we
 // pushed and the page snaps back). Chromium also fires popstate for fragment navigations, so events cannot tell the two apart; instead we
 // remember the first foreign navigation (hashchange) and, once events have been quiet for 150ms, re-apply it if it was lost.
 let wq33Pushed=false,wq33Lazy=0,wq33Fly=false,wq33After=[],wq33Cap=0,wq33Quiet=0,wq33Url='',wq33Fast=false,wq33Intent='';
 function wq33Flush(){const f=wq33After.splice(0);for(const fn of f){try{fn();}catch(e){fail(e);}}}
 function wq33Settle(){
  clearTimeout(wq33Cap);clearTimeout(wq33Quiet);wq33Cap=wq33Quiet=0;wq33Fly=false;
  const want=wq33Intent;wq33Intent='';
  if(want&&location.href!==want){try{location.hash=new URL(want).hash;}catch(_){}}
  wq33Flush();
 }
 function wq33Bump(){if(!wq33Fly)return;clearTimeout(wq33Quiet);wq33Quiet=setTimeout(wq33Settle,150);}
 function wq33Push(){
  if(wq33Lazy){clearTimeout(wq33Lazy);wq33Lazy=0;wq33Pushed=true;wq33Flush();return;}
  if(wq33Pushed||!root.history?.pushState)return;
  if(wq33Fly){wq33After.push(()=>{if(dialog?.open)wq33Push();});return;}
  try{history.pushState({wqmOpen:1},'');wq33Pushed=true;wq33Url=location.href;}catch(_){}
 }
 function wq33Pop(fast){
  if(!wq33Pushed)return;wq33Pushed=false;
  // Settle delay: a navigation issued right after close() (a few ms later, e.g. a recovery flow or a test) must win and
  // must never race a half-issued history.back(). Back pressed inside the delay just leaves the page; the check below then skips.
  wq33Lazy=setTimeout(()=>{wq33Lazy=0;
   // Something navigated in the same tick as close() (e.g. go('kid') after the recovery dialog): that navigation wins.
   // The unused entry stays behind (same URL), which costs one harmless extra Back press and never loses a route.
   if(location.href!==wq33Url||history.state?.wqmOpen!==1){wq33Flush();return;}
   try{wq33Fly=true;wq33Intent='';history.back();wq33Cap=setTimeout(wq33Settle,600);wq33Bump();}catch(_){wq33Fly=false;wq33Flush();}},fast?0:250);
 }
 function wq33AfterPop(fn){if(wq33Lazy||wq33Fly)wq33After.push(fn);else fn();}
 function wq33OnHash(e){if(!wq33Fly)return;if(!wq33Intent&&e.newURL&&e.newURL!==wq33Url)wq33Intent=e.newURL;wq33Bump();}
 function wq33OnPop(){
  if(wq33Fly){wq33Bump();return;}
  if(!wq33Pushed)return;
  if(location.href!==wq33Url){wq33Pushed=false;return;}
  if(dialog?.open){wq33Pushed=false;if(close()===false)wq33Push();}else wq33Pushed=false;
 }
 function close(){tickUsage();try{preserveWork(true);}catch(e){fail(e);if(!confirm('草稿儲存失敗。按「取消」會留在目前畫面。按「確定」會回到英文，沒儲存的草稿可能會丟失。'))return false;}root.WQR3Speech?.cancel();root.speechSynthesis?.cancel();if(dialog?.open){dialog.close();wq33Pop(wq33Fast);wq33Fast=false;bridge.afterClose?.();launch?.focus();}activeSince=Date.now();return true;}
 function tickUsage(wasVisible=false){const now=Date.now(),dt=Math.min(15000,Math.max(0,now-activeSince));activeSince=now;if(!dt||!store||(!wasVisible&&!active())||(root.WQM_INTEGRATED&&!dialog?.open)||awaitingBreak||!['lesson','tools','normal','olympiad','home'].includes(view)||store.readOnly)return;continuous+=dt;
  try{save(n=>{const day=C.hkDay(now);n.usage[day]=Math.min(86400000,(n.usage[day]||0)+dt);for(const d of Object.keys(n.usage))if(d<C.plusDay(day,-180))delete n.usage[d];if(n.current&&!n.current.completed){n.current.activeMs=(n.current.activeMs||0)+dt;writeDraft(n.current);}});}catch(e){ui.error=e.message;}
 }
 function mount(){const host=document.createElement('div');host.id='wqm-app-host';shadow=host.attachShadow({mode:'open'});const style=document.createElement('style');style.textContent=root.WQMathCSS+'\n.wqm-v32-companion{display:flex;gap:16px;align-items:center;padding:12px 18px;margin:16px 0;background:#fffdf7;border:1px solid #deded0;border-radius:20px}.wqm-v32-companion img{width:72px;height:92px;object-fit:contain}.wqm-v32-companion p{margin:4px 0}.wqm-v32-companion small{color:#536357}.wqm-v32-companion strong{font-size:17px}@media(max-width:440px){.wqm-v32-companion{gap:10px;padding:10px}.wqm-v32-companion img{width:48px;height:62px}}';style.textContent+='\n'+(root.WQForestMathCSS||'');style.textContent+='\n'+R35CSS;style.textContent+='\n'+R36CSS;shadow.append(style);app=document.createElement('main');app.setAttribute('aria-label','學霸星球 數學學習');shadow.append(app);
  app.addEventListener('click',e=>{const b=e.target.closest('[data-forest-options]');if(b){e.preventDefault();e.stopImmediatePropagation();const panel=app.querySelector('#forest-math-options');if(panel){panel.hidden=!panel.hidden;b.setAttribute('aria-expanded',String(!panel.hidden));}return;}},true);
  app.addEventListener('change',e=>{const k=e.target.dataset?.forestPref;if(k){e.stopImmediatePropagation();root.WQ32.setPreference(k,e.target.tagName==='SELECT'?e.target.value:e.target.checked);}},true);
  root.addEventListener('wq-forest-preferences-changed',refreshForestOnly);
  app.addEventListener('click',action);app.addEventListener('keydown',e=>{if(e.key==='Enter'&&e.target.id==='answer'&&!e.isComposing){e.preventDefault();if(!ui.busy){ui.busy=true;submit().catch(fail).finally(()=>ui.busy=false);}}});
  if(root.WQM_INTEGRATED){
   dialog=document.createElement('dialog');dialog.id='wqm-dialog';dialog.setAttribute('aria-label','學霸星球 數學模組');Object.assign(dialog.style,{border:'0',padding:'0',width:'100vw',maxWidth:'100vw',height:'100dvh',maxHeight:'100dvh',margin:'0',background:'#f7f5ec'});dialog.append(host);document.body.append(dialog);dialog.addEventListener('cancel',e=>{e.preventDefault();close();});window.addEventListener('popstate',wq33OnPop);window.addEventListener('hashchange',wq33OnHash);
   launch=document.createElement('button');launch.id='wqm-launch';launch.textContent='＋ 數學／奧數';launch.type='button';Object.assign(launch.style,{position:'fixed',bottom:'18px',right:'18px',zIndex:'8000',background:'#24564c',color:'#fff',border:'2px solid #d8e6d3',borderRadius:'20px',padding:'13px 18px',font:'700 16px system-ui',boxShadow:'0 4px 16px #0002',cursor:'pointer'});document.body.append(launch);launch.onclick=()=>{
    if(!bridge){alert('認不出這個英文版本的帳戶或金幣介面。以免損壞資料，數學功能沒有啟動。請使用獨立試玩版，並提供原來的 HTML 檔案做完整測試。');return;}
    try{open('home');}catch(e){alert(e.message);}
   };
  }else{document.body.style.margin='0';document.body.append(host);try{initStore();render();}catch(e){
   app.innerHTML=`<div class="wqm"><div class="shell"><section class="card" role="alert"><h1>暫時讀不到這部裝置上的資料</h1><p>${esc(e.message)}</p><p>舊進度沒有重設、刪除或蓋掉。請先保留原檔和備份，檢查瀏覽器有沒有允許儲存。不要為了重新開始而清除瀏覽資料。</p><button type="button" id="recovery-export">匯出可讀的原始名單備份</button><p id="recovery-status" role="status"></p><p>損壞的名單要人手核對才能修改。這個頁面不會自動建立同名的新孩子。</p></section></div></div>`;
   app.querySelector('#recovery-export').onclick=()=>{try{const raw=localStorage.getItem('wqm-profiles-v1');download('SmartQuest_registry_recovery.txt',raw||'沒有可讀的原始名單','text/plain');}catch(err){app.querySelector('#recovery-status').textContent='瀏覽器仍然不讓網頁讀取儲存的資料，沒有匯出。'+err.message;}};
  }}
  setInterval(tickUsage,15000);
  document.addEventListener('visibilitychange',()=>{if(document.hidden){tickUsage(true);try{preserveWork(true);}catch(e){fail(e);}root.WQR3Speech?.cancel();root.speechSynthesis?.cancel();audio?.suspend();}activeSince=Date.now();});
  root.addEventListener('pagehide',()=>{tickUsage(true);try{preserveWork(true);}catch(e){fail(e);}root.WQR3Speech?.cancel();root.speechSynthesis?.cancel();audio?.suspend();});
  // Diagnostics expose the deterministic content engine, never host account credentials.
  root.WQMathApp=Object.freeze({version:'3.1.0',integrationVersion:'R3.1-FOREST',open,close,startDaily:(track='normal')=>makePlan('daily',track),pauseForLimit:()=>{if(store&&dialog?.open){preserveWork(true);view='resume';render();}},getState:()=>C.clone(store?.state),getView:()=>view,contentStats:()=>({skills:L.skills.size,templates:L.templates.size}),hostConnected:()=>bridge?.mode==='wordquest'});
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})(globalThis);
