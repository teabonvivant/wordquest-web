/* R3.13 s60 - legacy pages inside the planet shell: one top bar (back, planet, voice, menu, coins), teacher cards folded to a 🔊 button,
   plain copy, decorative icons removed, page-specific fit recipes. Layout lives in s60_legacy.css (keyed by data-s60 / data-s60-pl on .r37-legbody).
   Nothing here changes lesson, quiz or game logic: it re-parents existing nodes, hides copy and adds small ⓘ / ⋯ controls. */
(function(){
 const PL={
  english:/^(classroom|unit|library|learning|assembly|assembly-unit|assembly-learn|practice|companions|spelling-family|family-lesson|phonics|phonics-lesson)$/,
  dictation:/^(learn|ranges|range-new|report)$/,
  games:/^(game|game-settings)$/,
  parent:/^(parent|children|settings|learning-report|learning-plan|learning-help|assembly-report|assembly-plan|legacy-family|legacy-phonics|offline|credits)$/,
  account:/^(login|admin)$/};
 const ACCOUNT={id:'account',name:'帳戶',icon:'🔐',hue:222};
 const planetOf=route=>{for(const k in PL)if(PL[k].test(route))return k;return '';};
 const routeNow=()=>(location.hash||'#kid').slice(1).split('?')[0];
 const q$=(s,r)=>(r||document).querySelector(s), q$$=(s,r)=>[...(r||document).querySelectorAll(s)];
 const EMO=/^[\p{Extended_Pictographic}️‍\s]+/u;
 const KEEP=/^[★☆✓✔✖✕✗●⭐❤♥🪙🔒🔓🎁🏅]/u;

 /* ---- one wrapper for every legacy page (replaces s30 r37Wrap; same DOM contract: .r37-leg > .r37-bar + .r37-legbody + .r37-nav) ---- */
 r37Wrap=function(route){
  const pl=planetOf(route),app=$('#app');if(!pl||!app||app.querySelector(':scope>.r37-leg'))return;
  if(route==='unit'&&typeof r37UnitLevelBtn==='function')r37UnitLevelBtn();
  const p=pl==='account'?ACCOUNT:r37Planet(pl);
  const back=route==='unit'?'#classroom':route==='assembly-unit'||route==='assembly-learn'?'#assembly':route==='game-settings'?'#game':route==='credits'?'#offline':route==='family-lesson'?'#spelling-family':route==='phonics-lesson'?'#phonics':pl==='account'?'#kid':'#p/'+pl;
  for(const a of app.querySelectorAll('a.l30-back,a.wq32-btn')){const h=a.getAttribute('href');if(h==='#kid'||h==='#parent'){a.setAttribute('href',pl==='account'?'#kid':'#p/'+pl);a.textContent='← '+p.name;}}
  const sec=document.createElement('section');sec.className='r37-hub r37-leg';sec.style.setProperty('--h',p.hue);sec.dataset.pl=pl;
  sec.innerHTML=`<div class="r37-bar"><a class="r37-back2" href="${back}" aria-label="返回">←</a><a class="r37-legt" href="${pl==='account'?'#kid':'#p/'+pl}"><span aria-hidden="true">${r37Icon(p.icon)}</span>${p.name}</a><span class="s60-slot"></span><button type="button" class="s60-more" aria-haspopup="true" aria-expanded="false" aria-label="更多">⋯</button>${r37Coin()}</div>`;
  const body=document.createElement('div');body.className='r37-legbody';body.dataset.s60=route;body.dataset.s60Pl=pl;
  while(app.firstChild)body.appendChild(app.firstChild);
  sec.appendChild(body);
  sec.insertAdjacentHTML('beforeend',r37Nav(pl==='english'||pl==='games'||pl==='parent'?'p/'+pl:''));
  app.appendChild(sec);
  document.body.classList.add('r37','r37leg');r37Layout();
  try{s60Tidy();}catch(_){}
 };

 /* ---- ⋯ menu: the old site header (child, sound, login, parent) folded into the single bar ---- */
 function menuClose(){const m=q$('.s60-menu');if(m)m.remove();q$$('.s60-more').forEach(b=>b.setAttribute('aria-expanded','false'));}
 function menuOpen(btn){
  menuClose();
  const child=(q$('#header-child')?.textContent||'').trim()||'孩子',snd=q$('#header-sfx'),on=snd?snd.getAttribute('aria-pressed')==='true':true,auth=(q$('#header-auth')?.textContent||'登入').trim();
  const m=document.createElement('div');m.className='s60-menu';m.setAttribute('role','menu');
  m.innerHTML=`<button type="button" role="menuitem" data-s60m="child">換孩子<small>${esc(child)}</small></button><button type="button" role="menuitem" data-s60m="sfx">聲音<small>${on?'開':'關'}</small></button><button type="button" role="menuitem" data-s60m="auth">${esc(auth)}</button><a role="menuitem" href="#p/parent">家長</a>${q$('#wq29-test-banner a[data-wq29-mode]')?'<a role="menuitem" data-wq29-mode="" href="'+esc(q$('#wq29-test-banner a[data-wq29-mode]').getAttribute('href'))+'">離開測試</a>':''}`;
  (btn.closest('.r37-bar')||document.body).appendChild(m);
  btn.setAttribute('aria-expanded','true');
  const f=m.querySelector('button');if(f)f.focus({preventScroll:true});
 }
 document.addEventListener('click',e=>{
  const more=e.target.closest?.('.s60-more');
  if(more){e.preventDefault();e.stopPropagation();more.getAttribute('aria-expanded')==='true'?menuClose():menuOpen(more);return;}
  const it=e.target.closest?.('[data-s60m]');
  if(it){e.preventDefault();e.stopPropagation();const k=it.dataset.s60m;menuClose();
   const src=k==='child'?q$('.header [data-act="switch-child"]'):k==='sfx'?q$('#header-sfx'):q$('.header [data-act="auth-toggle"]');if(src)src.click();return;}
  if(!e.target.closest?.('.s60-menu'))menuClose();
  const ch=e.target.closest?.('#p10-login .p10-choice');
  if(ch){const r=ch.closest('#p10-login');r.dataset.s60Form=ch.dataset.target==='p10-login-card'?'login':'register';q$$('.p10-choice',r).forEach(c=>c.classList.toggle('on',c===ch));}
  const ac=e.target.closest?.('#arx-ach-dlg .arx-ach');
  if(ac){ac.classList.toggle('s60-open');}
  const ib=e.target.closest?.('.s60-i');
  if(ib){e.preventDefault();const host=ib.closest('[data-s60-help]')||ib.parentElement;const open=host.classList.toggle('s60-help-open');ib.setAttribute('aria-expanded',String(open));return;}
  const fh=e.target.closest?.('.s60-fold>h2:first-child');
  if(fh&&!e.target.closest('.s60-i')){const c=fh.parentElement;const closed=c.classList.toggle('s60-closed');fh.setAttribute('aria-expanded',String(!closed));}
 },true);
 document.addEventListener('keydown',e=>{
  if(e.key==='Escape'&&q$('.s60-menu')){menuClose();return;}
  if((e.key==='Enter'||e.key===' ')&&e.target.matches?.('.s60-fold>h2:first-child')){e.preventDefault();e.target.click();}
 });

 /* ---- helpers used by the recipes ---- */
 function stripEmoji(root){
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);const hit=[];
  for(let n=w.nextNode();n;n=w.nextNode())hit.push(n);
  for(const n of hit){
   if(n.__s60)continue;
   const el=n.parentElement;if(!el)continue;
   if(el.closest('.r37-nav,.r37-bar,[lang="en"],.r37-nu,.s60-menu,summary.s60-keep,script,style,textarea,option'))continue;
   const m=n.nodeValue.match(EMO);if(!m)continue;
   const rest=n.nodeValue.slice(m[0].length);
   if(KEEP.test(n.nodeValue.trim()))continue;
   const whole=(el.textContent||'').replace(EMO,'').trim();
   if(!rest.trim()&&!(n.nextSibling||n.previousSibling))continue; /* emoji-only control: that icon IS the label */
   if(!whole||!/[A-Za-z0-9㐀-鿿]/.test(whole))continue;
   n.nodeValue=rest;n.__s60=1;
  }
 }
 function hide(el){if(el)el.classList.add('s60-off');}
 function hideAll(sel,root){q$$(sel,root).forEach(hide);}
 function help(host,btnHost,label){ /* fold the copy inside host behind a ⓘ in btnHost (default: host heading) */
  if(host.dataset.s60Help)return;host.dataset.s60Help='1';
  const b=document.createElement('button');b.type='button';b.className='s60-i';b.setAttribute('aria-expanded','false');b.setAttribute('aria-label',label||'說明');b.textContent='ⓘ';
  const h=btnHost||host.querySelector(':scope>h2,:scope>h1,:scope>summary')||host;h.appendChild(b);
 }
 function fold(card,openFirst){
  if(card.classList.contains('s60-fold'))return;
  const h=card.querySelector(':scope>h2');if(!h)return;
  card.classList.add('s60-fold');h.setAttribute('role','button');h.tabIndex=0;
  const closed=!openFirst;
  if(closed)card.classList.add('s60-closed');
  h.setAttribute('aria-expanded',String(!closed));
 }


 function mk(tag,cls,html){const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;}
 function fit(b,list){b.dataset.s60Fit='';if(list)list.dataset.s60List='';}
 /* one scrolling region for several siblings (the only part of a fitted page that may scroll) */
 function scrollWrap(b,nodes,cls){
  nodes=nodes.filter(Boolean);if(!nodes.length)return null;
  let w=q$(':scope>.s60-scroll',b);
  if(!w){w=mk('div','s60-scroll '+(cls||''));b.appendChild(w);}
  for(const n of nodes)if(n.parentElement!==w)w.appendChild(n);
  w.dataset.s60List='';return w;
 }
 /* cards in balanced columns: an auto-height inner box (multicol on a height-limited flex child would fragment the cards) */
 function colWrap(b,scroll){
  let w=q$(':scope>.s60-colbox',b);if(!w){w=mk('div','s60-colbox');b.appendChild(w);}
  for(const n of [...b.children]){
   if(n===w||n.matches('.tabs,h1,.l30-topline,.s60-scroll'))continue;
   if(n.matches('.grid2,.l30-grid')){[...n.children].forEach(c=>w.appendChild(c));n.classList.add('s60-off');continue;}
   w.appendChild(n);
  }
  for(const g of q$$('.grid2,.l30-grid',w)){[...g.children].forEach(c=>g.parentElement.insertBefore(c,g));g.classList.add('s60-off');}
  if(scroll){b.dataset.s60Fit='';let s=q$(':scope>.s60-scroll',b);if(!s){s=mk('div','s60-scroll');b.appendChild(s);}if(w.parentElement!==s)s.appendChild(w);s.dataset.s60List='';}
  return w;
 }
 /* whole word card is the tap target (the small button inside keeps working for keyboards) */
 function cardTap(b,sel,btnSel){
  if(b.__s60tap)return;b.__s60tap=1;
  b.addEventListener('click',e=>{const c=e.target.closest(sel);if(!c||e.target.closest('button,a,input,select,label'))return;const x=c.querySelector(btnSel);if(x)x.click();});
 }
 /* the paragraph right after a heading becomes a ⓘ */
 function intro(root){
  for(const h of q$$('h1',root)){
   if(h.dataset.s60i)continue;h.dataset.s60i='1';
   const p=h.nextElementSibling;
   if(p&&p.tagName==='P'&&!p.querySelector('a,button,input,select')&&!p.classList.contains('s60-help-text')){
    p.classList.add('s60-help-text');const host=h.parentElement;host.dataset.s60Help='1';
    const b=mk('button','s60-i','ⓘ');b.type='button';b.setAttribute('aria-expanded','false');b.setAttribute('aria-label','說明');h.appendChild(b);
   }
  }
 }
 /* card paragraphs -> ⓘ on the card heading (keep.length: selectors of status lines that must stay visible) */
 function helpify(card,keep){
  if(card.dataset.s60Help)return;
  const ps=q$$(':scope>p,:scope p.small,:scope p.muted,:scope .small.muted,:scope>div>p',card).filter(p=>!p.closest('details')).filter(p=>!(keep&&p.matches(keep))&&!p.querySelector('a,button,input,select'));
  if(!ps.length)return;
  ps.forEach(p=>p.classList.add('s60-help-text'));
  help(card,card.querySelector(':scope>h2'),'說明');
 }
 const RECIPE_TXT=(root,map)=>{ /* shorten labels without touching their node (text node only) */
  const w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
  for(let n=w.nextNode();n;n=w.nextNode()){const v=n.nodeValue.trim();if(map[v]!=null&&!n.__s60t){n.nodeValue=n.nodeValue.replace(v,map[v]);n.__s60t=1;}}
 };
 /* ------------------------------------------------------------------ per-page recipes */
 const RECIPE={};
 window.__s60Recipes=RECIPE;
 RECIPE.classroom=b=>{fit(b,q$('.l30-grid',b));b.dataset.s60Cols='';};
 RECIPE.library=b=>{fit(b,q$('.l30-list',b));cardTap(b,'.l30-word','[data-l30="one"]');};
 RECIPE.unit=b=>{
  const words=q$('.l30-words',b),panel=words&&words.closest('.l30-panel');
  fit(b,panel);cardTap(b,'.l30-word','[data-l30="one"]');
  const st=q$('.q36-start',b);if(st&&!st.dataset.s60Help){const r=q$('.q36-rule',st);if(r){r.classList.add('s60-help-text');help(st,st,'獎勵說明');}}
 };
 RECIPE.learning=b=>{b.dataset.s60Quiz='';};
 RECIPE['assembly-learn']=b=>{b.dataset.s60Quiz='';};
 RECIPE.report=b=>{
  fit(b);
  const nx=q$(':scope>.p40-next',b);if(nx)helpify(nx);
  const cards=q$$(':scope>section.card:not(.p40-next):not(#r3-family-entry)',b);
  const isRecent=c=>/最近作答/.test((c.querySelector(':scope>h2')?.textContent)||'');
  const rest=[q$(':scope>.grid2',b),...cards.filter(isRecent)];
  const more=[...q$$(':scope>details',b),...cards.filter(c=>!isRecent(c))];
  let box=q$(':scope>.s60-scroll>.s60-morebox',b);
  const w=scrollWrap(b,rest);
  if(w&&more.length){if(!box){box=mk('details','card pad s60-morebox','<summary>更多紀錄</summary>');w.appendChild(box);}more.forEach(n=>{if(n.parentElement!==box)box.appendChild(n);});}
 };
 RECIPE.settings=b=>{
  intro(b);
  const tabs=q$(':scope>.tabs',b),h=q$(':scope>h1',b);
  if(tabs&&b.firstElementChild!==tabs)b.prepend(tabs);
  if(tabs&&h&&tabs.nextElementSibling!==h)tabs.after(h);
  const w=colWrap(b,true);
  q$$(':scope>section.card',w).forEach(c=>{
   fold(c,c.id==='v25-version-panel'||/^每日學習/.test((c.querySelector(':scope>h2')?.textContent||'').trim()));
   helpify(c,'#v25-backup-status,#voice-status,#v24-checkpoint-text,.voice-badge,#v25-inspection');
  });
  RECIPE_TXT(b,{'每日安排上限（含學字）':'每日上限','舊版小遊戲的每次時間':'小遊戲時長','按年級減少每次的題數':'按年級減題','固定孩子目前練習的範圍':'鎖定練習範圍','角色出場時有簡單的動畫效果':'角色動畫','每天最多新學項目':'每日新字上限'});
 };
 RECIPE.parent=b=>{
  intro(b);
  const h=q$('h1',b);if(h&&/下一步怎樣學/.test(h.textContent)&&!h.querySelector('.s60-i')){h.firstChild.nodeValue='家長工具';}
  const w=colWrap(b,true);
  q$$(':scope>section.card,:scope>.l30-panel,:scope>details.l30-panel',w).forEach(c=>{if(c.querySelector(':scope>h2')){fold(c,false);helpify(c);}});
 };
 RECIPE.children=b=>{intro(b);};
 RECIPE.offline=b=>{
  fit(b);intro(b);
  const oc=q$('#offline-content',b),ml=q$('.media-list',b);
  if(oc&&ml){oc.classList.add('s60-grow');ml.dataset.s60List='';if(ml.parentElement!==oc){}}
 };
 RECIPE.credits=b=>{
  const card=q$(':scope>section.card',b);if(!card)return;
  if(!q$(':scope>details.s60-morebox',card)){
   const ps=q$$(':scope>p',card);const d=mk('details','s60-morebox','<summary>來源明細</summary>');
   ps.forEach(x=>d.appendChild(x));card.appendChild(d);
  }
 };
 RECIPE['game-settings']=b=>{
  const card=q$(':scope>section.card',b);if(!card)return;
  b.dataset.s60Fit='';card.dataset.s60List='';
  card.querySelectorAll(':scope>p.small,:scope>p.muted').forEach(p=>{if(!p.querySelector('a,button,input,select'))p.classList.add('s60-help-text');});
  const hr=q$(':scope>hr',card);
  if(hr&&!q$(':scope>details.s60-rules',card)){
   const nodes=[];for(let n=hr.nextElementSibling;n&&n.tagName!=='DETAILS';n=n.nextElementSibling)nodes.push(n);
   const d=mk('details','s60-rules','<summary>金幣獎勵規則</summary>');nodes.forEach(n=>{if(n.tagName!=='H2')d.appendChild(n);else n.classList.add('s60-off');});
   hr.classList.add('s60-off');card.insertBefore(d,hr.nextSibling);
  }
 };
 RECIPE.game=b=>{
  const lobby=q$('.p30-lobby',b);if(!lobby)return;
  b.dataset.s60Fit='';lobby.classList.add('s60-grow');
  const cards=q$('.p30-cards',lobby);if(cards)cards.dataset.s60List='';
  cardTap(lobby,'.p30-card .p30-shot','.a28-btn[data-a28="intro"]');
 };
 RECIPE.assembly=b=>{
  b.dataset.s60Fit='';b.dataset.s60Help='1';
  const hero=q$('.l31-hero',b),h=q$('h1',b);
  q$$('.l31-hero>div>p,.l31-hero .l31-help,.l31-guide',b).forEach(x=>x.classList.add('s60-help-text'));
  if(h&&!q$('.s60-i',h)){const i=mk('button','s60-i','ⓘ');i.type='button';i.setAttribute('aria-expanded','false');i.setAttribute('aria-label','說明');h.appendChild(i);}
  const grid=q$('.l31-grid',b);
  if(grid){const tail=[grid,...q$$(':scope>section.l30-panel,:scope>.l30-panel',b)];scrollWrap(b,tail);}
 };
 RECIPE['assembly-unit']=b=>{
  b.dataset.s60Fit='';b.dataset.s60Help='1';
  const h=q$('h1',b);
  q$$(':scope>.l31-lead,:scope>.l31-help,.l31-launch .l31-help',b).forEach(x=>x.classList.add('s60-help-text'));
  if(h&&!q$('.s60-i',h)){const i=mk('button','s60-i','ⓘ');i.type='button';i.setAttribute('aria-expanded','false');i.setAttribute('aria-label','說明');h.appendChild(i);}
  RECIPE_TXT(b,{'這次學幾個組合？':'組合數','跟着學：認識 → 組合 → 詞義 → 串字':'跟着學','收起字塊，自己串字':'自己串字','選一種方式開始':'開始'});
  /* launch panel + recipe grid side by side on wide screens: put both in one frame, only the recipes scroll */
  const launch=q$('.l31-launch',b),grid=q$('.l31-grid',b);
  if(launch&&grid){let f=q$(':scope>.s60-split',b);if(!f){f=mk('div','s60-split s60-grow');b.appendChild(f);}
   if(launch.parentElement!==f)f.appendChild(launch);if(grid.parentElement!==f)f.appendChild(grid);grid.dataset.s60List='';}
 };
 RECIPE['assembly-report']=b=>{intro(b);const sc=scrollWrap(b,q$$(':scope>*:not(h1):not(.tabs):not(.s60-scroll):not(.wq32-guide)',b));if(sc)b.dataset.s60Fit='';};
 RECIPE['assembly-plan']=b=>{intro(b);};
 RECIPE['learning-report']=b=>{intro(b);const sc=scrollWrap(b,q$$(':scope>*:not(h1):not(.tabs):not(.s60-scroll)',b));if(sc)b.dataset.s60Fit='';};
 RECIPE['legacy-phonics']=b=>{intro(b);const sc=scrollWrap(b,q$$(':scope>*:not(h1):not(.tabs):not(.s60-scroll)',b));if(sc)b.dataset.s60Fit='';};
 RECIPE['legacy-family']=b=>{intro(b);const sc=scrollWrap(b,q$$(':scope>*:not(h1):not(.tabs):not(.s60-scroll)',b));if(sc)b.dataset.s60Fit='';};
 RECIPE.playground=b=>{};
 RECIPE['learning-plan']=b=>{
  intro(b);
  const sel=q$('#l30-plan-unit',b);
  if(sel&&!q$('.s60-unitgrid',b)){
   const panel=sel.closest('.l30-panel'),row=q$(':scope>.l30-row',panel);
   const grid=mk('div','s60-unitgrid');
   [...sel.options].forEach(o=>{const c=mk('button','s60-chip');c.type='button';c.dataset.v=o.value;c.textContent=o.textContent.replace(/\s*·\s*/,' ');if(o.selected)c.classList.add('on');grid.appendChild(c);});
   grid.addEventListener('click',e=>{const c=e.target.closest('.s60-chip');if(!c)return;sel.value=c.dataset.v;sel.dispatchEvent(new Event('change',{bubbles:true}));q$$('.s60-chip',grid).forEach(x=>x.classList.toggle('on',x===c));});
   panel.insertBefore(grid,row||null);sel.classList.add('s60-off');
   panel.classList.add('s60-grow');grid.dataset.s60List='';b.dataset.s60Fit='';
   const lbl=sel.closest('label');if(lbl){lbl.classList.add('s60-off');}
   const plan=q$('.l30-plan-grid',panel);if(plan)plan.classList.add('s60-off');
  }
  const p2=q$$(':scope>.l30-panel',b)[1];if(p2){p2.classList.add('s60-keepfit');q$$(':scope>p',p2).forEach(x=>x.classList.add('s60-off'));}
 };

 RECIPE['learning-help']=b=>{
  intro(b);
  q$$('.l30-card>p,.l30-panel>p,.wq32-entry p',b).forEach(p=>p.classList.add('s60-off'));
  colWrap(b,true);
 };
 RECIPE.practice=b=>{
  b.dataset.s60Fit='';
  const g=q$('.l30-grid',b);if(g)g.dataset.s60List='';
 };
 RECIPE.companions=b=>{
  b.dataset.s60Fit='';
  const pg=q$('#wq32-gallery-page',b);if(!pg)return;pg.classList.add('s60-grow');
  const prof=q$('.wq32-profile',pg);if(prof){prof.dataset.s60List='';
   q$$('dl,.wq32-quote,:scope>div>p:not(.wq32-preview-tag)',prof).forEach(x=>x.classList.add('s60-help-text'));
   const h=q$('h2',prof);if(h&&!q$('.s60-i',h)){prof.dataset.s60Help='1';const i=mk('button','s60-i','ⓘ');i.type='button';i.setAttribute('aria-expanded','false');i.setAttribute('aria-label','說明');h.appendChild(i);}}
 };
 RECIPE.login=b=>{
  q$$(':scope>.card.pad',b).forEach(c=>{if(!c.querySelector('#p10-login'))helpify(c);});
  q$$('.wq29-portal p,.wq29-login>p,.wq29-portal .wq29-caption',b).forEach(p=>p.classList.add('s60-help-text'));
  const root=q$('#p10-login',b);
  if(root){
   if(!root.dataset.s60Form){const f=q$('.p10-forms>section',root);root.dataset.s60Form=f&&f.id==='p10-login-card'?'login':'register';}
   const want=root.dataset.s60Form==='login'?'p10-login-card':'p10-register-card';
   q$$('.p10-choice',root).forEach(c=>c.classList.toggle('on',c.dataset.target===want));
   const n=q$('.auth-note',root);if(n)n.classList.add('s60-help-text');
   const h=q$('h1',root);if(h&&n&&!q$('.s60-i',h)){root.dataset.s60Help='1';const i=mk('button','s60-i','ⓘ');i.type='button';i.setAttribute('aria-expanded','false');i.setAttribute('aria-label','說明');h.appendChild(i);}
   RECIPE_TXT(root,{'第一次使用：建立帳戶':'建立帳戶','已有帳戶：登入':'登入','建立新帳戶':'建立帳戶'});
   q$$('.p10-card .field>p',root).forEach(p=>p.classList.add('s60-help-text'));
   b.dataset.s60Fit='';root.classList.add('s60-grow');const fm=q$('.p10-forms',root);
   if(fm){fm.dataset.s60List='';['.p10-try','.wq29-portal'].forEach(s=>{const n=q$(s,b);if(n&&n.parentElement!==fm)fm.appendChild(n);});}
   return;
  }
  /* logged in (or test session): compact portal + status card */
  b.dataset.s60Fit='';
  q$$('.wq29-portal p,.wq29-login>p,.wq29-portal .wq29-caption',b).forEach(p=>p.classList.add('s60-help-text'));
 };
 RECIPE.admin=b=>{
  intro(b);
  q$$('.wq29-admin>section.card,.wq29-admin>.l30-panel',b).forEach(s=>helpify(s));
  q$$('.wq29-admin-head p',b).forEach(x=>x.classList.add('s60-off'));
  const secs=q$$(':scope>section',b);
  if(secs.length){const s=scrollWrap(b,secs);if(s)b.dataset.s60Fit='';}
 };
 const famRecipe=b=>{
  b.dataset.s60Quiz='';
  const ov=q$('.fg-overview',b);if(!ov)return;
  b.dataset.s60Fit='';ov.classList.add('s60-grow');
  const g=q$('.fg-family-grid',ov);if(g)g.dataset.s60List='';
 };
 RECIPE['family-lesson']=famRecipe;RECIPE['spelling-family']=famRecipe;
 const phoRecipe=b=>{
  b.dataset.s60Quiz='';
  const ov=q$('.pc-overview',b);if(!ov)return;
  b.dataset.s60Fit='';ov.classList.add('s60-grow');
  const g=q$('.pc-course-grid',ov);if(g)g.dataset.s60List='';
  const foot=[...q$$(':scope>p',ov),...q$$(':scope>.pc-bottom p',ov)];
  if(foot.length&&!ov.dataset.s60Help){ov.dataset.s60Help='1';foot.forEach(x=>x.classList.add('s60-help-text'));
   const h=q$('h1',ov);if(h){const i=mk('button','s60-i','ⓘ');i.type='button';i.setAttribute('aria-expanded','false');i.setAttribute('aria-label','說明');h.appendChild(i);}}
 };
 RECIPE['phonics-lesson']=phoRecipe;RECIPE.phonics=phoRecipe;


 /* ---- maths / olympiad dialogs (shadow DOM): same fit rules as the legacy pages ---- */
 const WQM_CSS=`
.wqm{height:100vh!important;height:100dvh!important;overflow:hidden!important}
.wqm .shell{height:100%;display:flex;flex-direction:column;gap:8px;padding:6px 12px 10px!important;box-sizing:border-box;overflow:hidden;max-width:1360px;margin:0 auto}
.wqm .shell>*{flex:none;margin-top:0!important;margin-bottom:0!important}
.wqm .shell>.s60-fill{flex:1 1 auto;min-height:0;overflow:auto;overscroll-behavior:contain;-webkit-overflow-scrolling:touch;align-content:start}
.wqm .topbar{padding:0!important;min-height:0}
.wqm .topbar button,.wqm .nav button,.wqm .row>button{min-height:44px}
.s60-navrow{display:flex;align-items:center;gap:8px}
.s60-navrow>.nav{flex:1 1 auto;min-width:0;display:flex!important;flex-wrap:nowrap!important;gap:6px;overflow-x:auto;scrollbar-width:none;padding:0!important;margin:0!important;border:0}
.s60-navrow>.nav::-webkit-scrollbar{display:none}
.s60-navrow>.nav button{flex:none;white-space:nowrap}
.s60-navrow>#forest-math-slot{flex:none;margin:0!important;min-height:0!important}
.wqm .forest-math-guide{display:none!important}
.wqm .forest-controlbar{margin:0!important}
.wqm .forest-controlbar>button{position:relative;width:44px;height:44px;min-height:44px;padding:0!important;border-radius:50%!important;color:transparent!important;overflow:hidden;white-space:nowrap;text-indent:-300px}
.wqm .forest-controlbar>button::before{content:"⚙";position:absolute;inset:0;display:grid;place-items:center;text-indent:0;font-size:20px;color:#fff}
.wqm .section-head{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:0;padding:0}
.wqm .section-head .eyebrow,.wqm .hero .eyebrow,.wqm .hero-art,.wqm .hero>div>p,.wqm .tower>p,.wqm .shell>p.muted,.wqm .track-card p,.wqm .track-card .symbol,.wqm .grid2>.card>p.muted{display:none!important}
.wqm .section-head h1,.wqm .hero h1,.wqm .tower h1{font-size:24px!important;line-height:1.25;margin:0!important;color:#fff!important}
.wqm .cards:has(.track-card){grid-template-columns:repeat(2,minmax(0,1fr))}
.wqm .shell>.grid2{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}
.wqm .shell>.section-head:has(+.cards .track-card),.wqm .shell>.section-head:has(+.grid2){display:none}
.wqm .track-card{min-height:0!important}
.wqm .stat span,.wqm .tag,.wqm .islands .tag,.wqm small,.wqm .small{font-size:12px!important}
.wqm .wq36-home{position:relative;font-size:16px!important;color:transparent!important;overflow:hidden;white-space:nowrap;text-indent:-400px;min-width:96px}
.wqm .wq36-home::after{position:absolute;inset:0;display:grid;place-items:center;text-indent:0;color:#fff;font-size:16px}
.wqm .wq36-home-small{font-size:16px!important;color:transparent!important;position:relative;overflow:hidden;text-indent:-300px}
.wqm .wq36-home-small::after{position:absolute;inset:0;display:grid;place-items:center;text-indent:0;color:#fff;font-size:15px}
.wqm .switch input[type=checkbox]{-webkit-appearance:none;appearance:none;flex:none;width:52px;height:44px;margin:0;border:0;border-radius:22px;cursor:pointer;background:radial-gradient(circle at 19px 50%,#fff 0 15px,transparent 16px) no-repeat #b9bde0}
.wqm .switch input[type=checkbox]:checked{background:radial-gradient(circle at 33px 50%,#fff 0 15px,transparent 16px) no-repeat #2f7d6b}
.wqm .switch{display:flex;align-items:center;gap:12px;min-height:44px}
.wqm .section-head h2{font-size:18px;margin:0}
.wqm .hero{padding:0!important;display:block!important;min-height:0}
.wqm .hero .row,.wqm .tower .row{margin:6px 0 0!important;gap:8px}
.wqm .tower{padding:10px 12px!important;min-height:0}
.wqm .stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(96px,1fr));gap:8px}
.wqm .stat{padding:8px!important;min-height:0}
.wqm .stat strong{font-size:22px}
.wqm .cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(190px,1fr));gap:8px;grid-auto-rows:max-content;margin:0}
.wqm .card{padding:12px!important;margin:0}
.wqm .card h2{font-size:18px;margin:0 0 6px}
.wqm .card h3{font-size:17px;margin:0 0 4px}
.wqm .lesson-card>p:not(:has(.tag)),.wqm .badge-card>p,.wqm .badge-card>.note{display:none}
.wqm .badge-card.s60-open>p,.wqm .badge-card.s60-open>.note{display:block}
.wqm .badge-card{cursor:pointer}
.wqm .grade-selector{display:flex;flex-wrap:nowrap;gap:6px;overflow-x:auto;margin:0;scrollbar-width:none}
.wqm .grade-selector button{flex:none;min-width:48px}
.wqm .islands{display:flex;flex-wrap:nowrap;gap:6px;overflow-x:auto;margin:0;scrollbar-width:none}
.wqm .islands .tag{flex:none}
.wqm .tool-tabs{display:flex;flex-wrap:nowrap;gap:6px;overflow-x:auto;margin:0;scrollbar-width:none}
.wqm .tool-tabs button{flex:none}
.wqm .parentview{display:block}
.wqm .parentview .grid2{display:grid;grid-template-columns:repeat(auto-fill,minmax(260px,1fr));gap:8px}
.wqm .parentview .grid2>.card:has(button[data-action^="term"]){display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 12px!important}
.wqm .parentview .grid2>.card:has(button[data-action^="term"])>p{display:none}
.wqm .parentview .section-head{margin:10px 0 6px}
.wqm .parentview .card>p:not(.small){font-size:14px}
.wqm .s60i{margin:0}
.wqm .s60i>summary{cursor:pointer;min-height:44px;display:flex;align-items:center;font-weight:800;list-style:none}
.wqm .s60i>summary::-webkit-details-marker{display:none}
.wqm .unit-head{margin:10px 0 6px}
.wqm .toolbox{padding:10px!important}
.wqm .s60-toolbody p{display:none}
.wqm .parentview .card:has(>p:only-child){display:none}
.wqm .note{font-size:14px}
@media(min-width:900px){.wqm .cards{grid-template-columns:repeat(auto-fill,minmax(220px,1fr))}}
`;
 let wqmBusy=false;
 function wqmApply(){
  const host=document.getElementById('wqm-app-host'),R=host&&host.shadowRoot;if(!R||wqmBusy)return;
  const shell=R.querySelector('.shell');
  wqmBusy=true;
  try{
   if(!R.querySelector('#s60-wqm')){const st=document.createElement('style');st.id='s60-wqm';st.textContent=WQM_CSS;R.appendChild(st);}
   if(!shell)return;
   const nav=shell.querySelector(':scope>.nav'),slot=shell.querySelector(':scope>#forest-math-slot');
   if(nav&&slot&&!(nav.parentElement&&nav.parentElement.classList.contains('s60-navrow'))){const row=document.createElement('div');row.className='s60-navrow';shell.insertBefore(row,nav);row.append(nav,slot);}
   const home=!!shell.querySelector('.nav button.active[data-action="nav:home"]');
   shell.querySelectorAll(':scope>.s60-fill').forEach(x=>{x.classList.remove('s60-fill');delete x.dataset.s60List;});
   if(!home){
    const tabs=shell.querySelector(':scope>.tool-tabs');
    if(tabs){
     let w=shell.querySelector(':scope>.s60-toolbody');
     if(!w){w=document.createElement('div');w.className='s60-toolbody';shell.appendChild(w);}
     for(const n of [...shell.children]){if(n===w)continue;if(tabs.compareDocumentPosition(n)&Node.DOCUMENT_POSITION_FOLLOWING)w.appendChild(n);}
     w.classList.add('s60-fill');w.dataset.s60List='';
    }else{
     const c=[...shell.children].filter(e=>e.matches('.parentview,.catalog,.cards'));
     const f=c[c.length-1];if(f){f.classList.add('s60-fill');f.dataset.s60List='';}
    }
   }
   /* long notes -> ⓘ */
   shell.querySelectorAll('.parentview .card>p:not(.small):not(.s60-done),.parentview .card>p.small.muted:not(.s60-done)').forEach(p=>{
    p.classList.add('s60-done');
    if((p.textContent||'').trim().length<28||p.parentElement.closest('.s60i'))return;
    const d=document.createElement('details');d.className='s60i';d.innerHTML='<summary aria-label="說明">ⓘ</summary>';p.parentElement.insertBefore(d,p);d.appendChild(p);
   });
   const SHORT={'慢速模式：不再顯示「快速亂估」提示。所有練習本來都沒有計時。':'慢速模式','高小顯示數值成績（小一至小三不顯示百分比）':'高小顯示數值成績','開啟思維之塔（奧數選修）':'開啟思維之塔','匯出目前孩子的數學資料':'匯出數學資料','匯入同一孩子的備份':'匯入備份','清除目前孩子的數學進度':'清除數學進度','重試未處理的獎勵':'重試獎勵','讀題聲音（需裝置支援）':'讀題聲音','0 次自己作答的練習紀錄 · 已掌握 0 個入門技能':'','沿用英文部分的家長確認':'家長確認'};
   const tw=document.createTreeWalker(shell,NodeFilter.SHOW_TEXT);for(let n=tw.nextNode();n;n=tw.nextNode()){const v=n.nodeValue.trim();if(SHORT[v]){n.parentElement.title=v;n.nodeValue=SHORT[v];}}
   shell.querySelectorAll('.parentview .card>p.small.muted').forEach(p=>{if(/排行榜|廣告/.test(p.textContent))p.style.display='none';});
   shell.querySelectorAll('.parentview .card>.note:not(.s60-done)').forEach(p=>{p.classList.add('s60-done');if(p.parentElement.closest('.s60i'))return;const d=document.createElement('details');d.className='s60i';d.innerHTML='<summary aria-label="說明">ⓘ</summary>';p.parentElement.insertBefore(d,p);d.appendChild(p);});
   shell.querySelectorAll('.badge-card:not([tabindex])').forEach(c=>{c.tabIndex=0;c.setAttribute('role','button');});
   if(!R.__s60clk){R.__s60clk=1;R.addEventListener('click',e=>{const c=e.target.closest&&e.target.closest('.badge-card');if(c)c.classList.toggle('s60-open');});
    R.addEventListener('keydown',e=>{if((e.key==='Enter'||e.key===' ')&&e.target.matches&&e.target.matches('.badge-card')){e.preventDefault();e.target.classList.toggle('s60-open');}});}
  }finally{wqmBusy=false;}
 }
 window.s60WqmApply=wqmApply;
 (function(){
  let ob=null,t2=0;
  const watch=()=>{const host=document.getElementById('wqm-app-host'),R=host&&host.shadowRoot;if(!R){return;}
   wqmApply();
   if(ob)ob.disconnect();
   ob=new MutationObserver(()=>{if(t2)return;t2=setTimeout(()=>{t2=0;if(ob)ob.disconnect();wqmApply();try{ob.observe(R,{childList:true,subtree:true});}catch(_){}} ,30);});
   ob.observe(R,{childList:true,subtree:true});};
  document.addEventListener('click',e=>{if(e.target.closest?.('[data-wqm-open],#wqm-launch')){[0,120,400,1000].forEach(ms=>setTimeout(watch,ms));}},true);
 })();

 /* ---- R3.18 D04: sticker / emoji entrances become vector icons; the picture must match the label ---- */
 const ICONMAP=[[/選擇題/,'✅'],[/填充題/,'✍️'],[/重溫|錯字|補練/,'🔁'],[/學新詞|新詞|選擇內容|拼字教室/,'📖'],[/完成一小組|所有練習/,'✅'],[/加入默書範圍|拍照|默書範圍|範圍/,'📷'],
  [/看孩子|學得怎樣|報告|進度/,'📊'],[/安排|下一次|計劃/,'📅'],[/金幣|遊戲|看進度/,'🎮']];
 const EMOONLY=/^[\p{Extended_Pictographic}‍️]+$/u;
 function iconFor(txt){for(const [re,k] of ICONMAP)if(re.test(txt))return k;return '';}
 function swapIcons(root){
  for(const img of q$$('.l30-card>img,.l30-card>.wq32-image',root)){
   if(img.dataset.s60ico)continue;
   const card=img.closest('.l30-card'),txt=((card.querySelector('h2,h3,strong,b')||card).textContent||'').replace(/\s+/g,' ');
   const k=iconFor(txt)||'📖';
   const sp=document.createElement('span');sp.className='s60-ico';sp.setAttribute('aria-hidden','true');sp.innerHTML=r37Icon(k);
   img.dataset.s60ico='1';img.replaceWith(sp);
  }
  for(const el of q$$('.arx-btn,.arx-chip',root)){ /* arcade lobby badge / star chips: leading emoji -> vector icon */
   if(el.dataset.s60ico)continue;
   const t=el.firstChild&&el.firstChild.nodeType===3?el.firstChild:null,m=t&&t.nodeValue.match(/^\s*(🏅|⭐)\s*/u);
   if(!m)continue;
   el.dataset.s60ico='1';t.nodeValue=t.nodeValue.slice(m[0].length);
   const sp=document.createElement('span');sp.className='s60-ico-sm';sp.setAttribute('aria-hidden','true');sp.innerHTML=r37Icon(m[1]);el.insertBefore(sp,el.firstChild);
  }
  for(const el of q$$('.p10-ti,.ico',root)){
   if(el.dataset.s60ico)continue;
   const t=(el.textContent||'').trim();if(!t||!EMOONLY.test(t))continue;
   el.dataset.s60ico='1';el.setAttribute('aria-hidden','true');el.innerHTML=r37Icon(t);
  }
 }
 /* ---- L05: #ranges with only the demo range gets an empty state with one clear next step ---- */
 function rangesEmpty(root,route){
  if(route!=='ranges')return;
  const cards=q$$('.range-card',root),real=cards.filter(c=>c.dataset.range!=='r_demo');
  let box=q$('.s60-empty',root);
  if(real.length){if(box)box.remove();return;}
  if(box||!cards.length)return;
  const host=q$('.stack',root)||root;
  box=mk('div','s60-empty',`<span class="s60-empty-art" aria-hidden="true">${r37Icon('📝')}</span><h2>加入第一份默書</h2><a class="btn primary" href="#range-new">＋ 加入第一份默書</a>`);
  host.after(box);
 }
 /* ---- M06: a 28px fade + thin scrollbar show that a fixed frame has more below ---- */
 function flagScroll(e){
  if(!e||!e.isConnected)return;
  const more=e.scrollHeight-e.clientHeight>8&&e.scrollHeight-e.scrollTop-e.clientHeight>8;
  if(more)e.dataset.s60More='';else delete e.dataset.s60More;
 }
 function scrollFlags(){q$$('.r37-legbody,.r37-legbody [data-s60-list]').forEach(flagScroll);}
 document.addEventListener('scroll',e=>{const t=e.target;if(t&&t.nodeType===1&&t.matches&&t.matches('.r37-legbody,.r37-legbody [data-s60-list]'))flagScroll(t);},true);
 window.addEventListener('resize',()=>{try{scrollFlags();}catch(_){}});

 /* ---- the generic tidy that runs after every render of a legacy page ---- */
 function s60Tidy(){
  const body=q$('.r37-legbody');if(!body)return;
  const bar=q$('.r37-leg>.r37-bar');
  /* teacher cards -> one 🔊 in the bar (the card stays in the DOM so the voice code keeps working) */
  for(const g of q$$('.wq32-guide',body)){
   if(!g.querySelector('[data-wq32="voice"]')){g.classList.add('s60-off');continue;}
   if(bar){const slot=bar.querySelector('.s60-slot');if(slot&&!slot.contains(g)){g.classList.add('s60-guide');slot.appendChild(g);}}
  }
  hideAll('.wq32-voice-note,.l30-back,.wq32-hero-figure,.wq32-hint-portrait',body);
  const route=body.dataset.s60,pl=body.dataset.s60Pl;
  const rc=RECIPE[route];if(rc){try{rc(body);}catch(e){}}
  if(!/^(range-new|learn)$/.test(route)){if(!/^(learning|assembly-learn|family-lesson|spelling-family|phonics-lesson|phonics)$/.test(route)){try{intro(body);}catch(e){}}stripEmoji(body);}
  try{swapIcons(body);rangesEmpty(body,route);scrollFlags();}catch(e){}
 /* checkboxes / radios sit inside labels: make the whole label the tap target */
  q$$('label',body).forEach(l=>{if(l.querySelector('input[type=checkbox],input[type=radio]'))l.classList.add('s60-check');});
  /* parent tabs only inside the parent area */
  body.classList.toggle('s60-notabs',pl!=='parent');
 }
 window.s60Tidy=s60Tidy;
 let sched=0;
 const app=document.getElementById('app');
 if(app){
  const obs=new MutationObserver(()=>{if(sched)return;sched=requestAnimationFrame(()=>{sched=0;obs.disconnect();try{
    q$$('.r37-hub:not(.r37-leg) .r37-bar').forEach(b=>{if(!b.querySelector('.s60-more')){const c=b.querySelector('.r37-coin');const m=document.createElement('button');m.type='button';m.className='s60-more';m.setAttribute('aria-haspopup','true');m.setAttribute('aria-expanded','false');m.setAttribute('aria-label','更多');m.textContent='⋯';b.insertBefore(m,c);}});
    q$$('.r37-gate .card').forEach(c=>{if(c.dataset.s60Help)return;
     const ps=[...c.querySelectorAll(':scope>p')].filter(x=>!x.id&&!x.querySelector('button,a,input'));
     ps.forEach(x=>x.classList.add('s60-help-text'));
     const h=c.querySelector('h1,h2');
     if(h&&ps.length){c.dataset.s60Help='1';const i=document.createElement('button');i.type='button';i.className='s60-i';i.setAttribute('aria-expanded','false');i.setAttribute('aria-label','說明');i.textContent='ⓘ';h.appendChild(i);}
     c.querySelectorAll('a.btn.soft').forEach(a=>a.classList.add('s60-off'));});
    q$$('.r37-card:has(.r37-diffs)').forEach(c=>{if(c.dataset.s60Help)return;const dl=c.querySelector('.r37-dl'),h=c.querySelector('h2');
     if(dl&&h){dl.classList.add('s60-help-text');c.dataset.s60Help='1';const i=document.createElement('button');i.type='button';i.className='s60-i';i.setAttribute('aria-expanded','false');i.setAttribute('aria-label','說明');i.textContent='ⓘ';h.appendChild(i);}
     c.querySelectorAll('h2').forEach(x=>{const w=document.createTreeWalker(x,NodeFilter.SHOW_TEXT);for(let n=w.nextNode();n;n=w.nextNode()){if(!n.__s60&&EMO.test(n.nodeValue)){n.nodeValue=n.nodeValue.replace(EMO,'');n.__s60=1;}}});});
    q$$('.r37-ptab').forEach((b,i)=>{if(!b.querySelector('b')){const l=document.createElement('b');l.textContent=['難度','進度','孩子','工具'][i]||'';b.appendChild(l);}});
    s60Tidy();}catch(_){}obs.observe(app,{childList:true,subtree:true});});});
  obs.observe(app,{childList:true,subtree:true});
 }
 window.addEventListener('resize',()=>{menuClose();});
})();
