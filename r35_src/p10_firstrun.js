/* R3.5 p10: first-run screens (child home, login / create account), header and navigation chrome,
   engineering text removal, offline strip. Host closure code: it runs inside the main script scope just before
   installMediaEvents();render(), so it can wrap render(), toast(), loginView() ... by name.
   Design rules:
   - structural anchors only (ids, classes, data attributes); never depend on the old wording of a string;
   - every render() is followed by an idempotent pass (p10After); a pass that cannot recognise the markup leaves the page alone;
   - the original controls (data-l30 start button, data-act submit buttons, ids of the form fields) are kept, only moved. */
(function(){
 'use strict';
 const FOOT='資料只存在這部裝置，不會自動同步到其他裝置。';
 const MENU='p10-menu-open';
 let moreOpen=false,authForm='',inlineShown=false,resetting=false,resetDone=false,labelSeq=0,labelRaf=0;
 const route=()=>(location.hash||'#kid').slice(1).split('?')[0];
 const mk=(tag,cls,html)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;};
 const guard=fn=>{try{return fn();}catch(e){try{console.warn('p10',e&&e.message||e);}catch(_){}}};
 const reduceMotion=()=>{try{return matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(_){return false;}};

 // ------------------------------------------------------------------ chrome (header, footer, navigation) ----------------
 function chrome(){
  // Version badge and status footer never show on child or parent screens (the one honest line lives in settings).
  document.getElementById('v25-build-badge')?.remove();
  const foot=$('.footer');if(foot&&foot.textContent!==FOOT)foot.textContent=FOOT;
  const logged=isLoggedIn();
  // The name capsule only shows who is learning. It used to open the parent password page.
  const pill=$('.head-actions .child-pill');
  if(pill&&pill.tagName==='BUTTON'){const span=mk('span','child-pill p10-pill');span.append(...pill.childNodes);pill.replaceWith(span);}
  const who=$('#header-child');if(who&&!logged)who.textContent='試玩中';
  // A signed-in child has no log-out button; the parent finds it in settings. Visitors keep the log-in button.
  const auth=$('.head-actions .auth-head');if(auth)auth.hidden=logged;
  // Sound toggle states its state in words.
  const sfx=$('#header-sfx .label');if(sfx){const t=sfxEnabled()?'聲音：開':'聲音：關';if(sfx.textContent!==t)sfx.textContent=t;}
  // Navigation: 首頁 練習 數學 遊戲 家長. The maths item replaces the floating maths button.
  const nav=$('#wq29-nav');
  if(nav){
   for(const a of nav.querySelectorAll('a[href="#game"]'))if(a.textContent!=='遊戲')a.textContent='遊戲';
   if(!nav.querySelector('[data-wqm-open]')){
    const m=mk('a','p10-nav-math');m.href='#kid';m.dataset.wqmOpen='home';m.setAttribute('aria-haspopup','dialog');m.textContent='數學';
    const anchor=nav.querySelector('a[href="#practice"]');anchor?anchor.after(m):nav.prepend(m);
   }
  }
  // Short screens (phone held sideways): the navigation sits behind a menu button.
  if(!$('#p10-menu')){
   const b=mk('button','btn soft p10-menu','<span class="icon" aria-hidden="true">☰</span><span class="label">選單</span>');
   b.id='p10-menu';b.type='button';b.dataset.p10='menu';b.setAttribute('aria-expanded','false');b.setAttribute('aria-controls','wq29-nav');
   $('.head-actions')?.append(b);
  }
  closeMenu();
  offline();
 }
 function closeMenu(){document.body.classList.remove(MENU);$('#p10-menu')?.setAttribute('aria-expanded','false');}
 function toggleMenu(){const on=!document.body.classList.contains(MENU);document.body.classList.toggle(MENU,on);$('#p10-menu')?.setAttribute('aria-expanded',String(on));}

 // ------------------------------------------------------------------ offline strip ------------------------------------------
 function offline(){
  let bar=document.getElementById('p10-offline');
  if(!bar){
   bar=mk('div');bar.id='p10-offline';bar.setAttribute('role','status');bar.textContent='目前沒有網絡，仍可練習';
   const h=$('.header');h?h.after(bar):document.body.prepend(bar);
  }
  bar.hidden=navigator.onLine!==false;
 }
 window.addEventListener('offline',()=>guard(offline));
 window.addEventListener('online',()=>guard(offline));

 // ------------------------------------------------------------------ child home ---------------------------------------------
 function dictRange(){
  const c=activeChild();if(!c)return null;
  const rs=childRanges(c.id).filter(r=>rangeWords(r.id).length>0);
  const isDemo=r=>r.isDemo===true||r.id==='r_demo';
  const school=rs.filter(r=>!isDemo(r));
  if(school.length){const cur=latestRange();return {r:school.includes(cur)?cur:school[0],demo:false};}
  const demo=rs.find(isDemo);
  return demo?{r:demo,demo:true}:null;
 }
 function dateText(r){
  const m=/^(\d{4})-(\d{2})-(\d{2})$/.exec(r.dictationDate||'');
  if(!m||r.dictationDate<today())return '';
  return '默書日：'+(+m[2])+'月'+(+m[3])+'日';
 }
 function dictCard(){
  if(!isLoggedIn())return null;
  const d=dictRange();if(!d)return null;
  const n=rangeWords(d.r.id).length,resume=canResume(),date=d.demo?'':dateText(d.r);
  const card=mk('section','p10-dict');card.setAttribute('aria-label','今次默書練習');
  card.innerHTML=`<div class="p10-dict-copy"><h2>今次默書練習</h2><p class="p10-range"><strong>${esc(d.r.title)}</strong>${d.demo?' <span class="p10-badge">示範</span>':''}</p><p class="p10-meta">${n} 個單字${date?' · '+esc(date):''}</p></div>`
   +`<button type="button" class="btn primary p10-dict-btn" data-p10="dictation" data-range="${esc(d.r.id)}">${resume?'繼續練習':'開始練習'}</button>`;
  return card;
 }
 function startDictation(rid){
  if(!isLoggedIn()){go('login');return;}
  if(canResume()){go('learn');return;}
  const c=activeChild(),r=c&&childRanges(c.id).find(x=>x.id===rid);if(!r)return;
  // The dictation module may register its own entry; the plain practice set is the fallback.
  const hook=window.WQ35Dictation;
  if(hook&&typeof hook.start==='function'){hook.start(rid);return;}
  if(c.activeRangeId!==rid){c.activeRangeId=rid;if(!save()){toast('未能儲存。請再按一次。','bad');return;}}
  startPractice('spell');
 }
 function chip(text,cls){const s=mk('span','p10-chip'+(cls?' '+cls:''));s.textContent=text;return s;}
 function home(){
  const app=$('#app');if(!app||app.querySelector('#p10-first'))return;
  const hero=app.querySelector('.l30-hero'),main=hero&&hero.querySelector('.l30-btn.primary');
  if(!hero||!main)return;                       // unknown layout: leave the page alone
  const c=activeChild(),logged=isLoggedIn();
  // --- first block: greeting, ONE big button, a short line under it
  const words=((hero.textContent||'').match(/先學\s*(\d+)\s*個/)||[])[1];
  let sess=null;try{sess=l30Session();}catch(_){}
  let subText='';
  if(logged&&sess&&sess.queue)subText='已完成 '+sess.index+'／'+sess.queue.length+' 步。';
  else subText='約 5 分鐘'+(words?'。先學 '+words+' 個單字。':'。');
  const sub=mk('p');sub.className='p10-sub';sub.textContent=subText;
  // visitors keep the host's own line about signing in (its text is not touched)
  let note=null;
  if(!logged){note=hero.querySelector('#wq33-guest-note');if(!note){note=mk('p');note.id='wq33-guest-note';note.textContent='練習需要先登入。';}note.className='p10-sub p10-guest';}
  const top=mk('div','p10-top');
  const fig=hero.querySelector('.wq32-hero-figure');
  if(fig){fig.classList.add('p10-owl');fig.querySelector('figcaption')?.remove();top.append(fig);}
  const g=mk('div','p10-greet'),h1=mk('h1');h1.textContent=logged?(c?.name||'')+'，你好':'你好，歡迎來玩';
  const chips=mk('div','p10-chips');
  if(logged){if(c&&c.grade)chips.append(chip('小'+c.grade));chips.append(chip((c?.stars||0)+' 金幣','coin'));}
  else chips.append(chip('試玩中'));
  g.append(h1,chips);top.append(g);
  hero.className='l30-hero p10-hero';
  hero.replaceChildren(top,main,sub,...(note?[note]:[]));
  // --- dictation card (school range) under the main button
  const dict=dictCard();
  // --- three big tiles
  const tiles=mk('nav','p10-tiles');tiles.id='p10-tiles';tiles.setAttribute('aria-label','選擇學習內容');
  tiles.innerHTML='<a class="p10-tile en" href="#practice"><span class="p10-ti" aria-hidden="true">🔤</span><span class="p10-tn">英文</span></a>'
   +'<button type="button" class="p10-tile math" data-wqm-open="home"><span class="p10-ti" aria-hidden="true">🔢</span><span class="p10-tn">數學</span></button>'
   +'<a class="p10-tile game" href="#game"><span class="p10-ti" aria-hidden="true">🎮</span><span class="p10-tn">遊戲</span></a>';
  // --- everything else folds into 更多玩法 (a real <details>; its state survives re-render in `moreOpen`)
  const more=mk('details','p10-more');more.id='p10-more';more.open=moreOpen;
  const sum=mk('summary');sum.textContent='更多玩法';
  const body=mk('div','p10-more-body');
  const stay=[],resume=app.querySelector('#l30-school-resume');
  for(const el of [...app.children]){
   if(el===hero)continue;
   if(el.matches('aside,.notice,[role="alert"],.guest-banner')){stay.push(el);continue;}
   if(el.matches('.l30-topline')&&el.querySelector('.l30-tag')&&!el.querySelector('.l30-source')){el.remove();continue;}   // brand line + coin tag (the greeting shows the coins)
   if(el===resume&&!dict){stay.push(el);continue;}
   body.append(el);
  }
  more.append(sum,body);
  const first=mk('div','p10-first');first.id='p10-first';
  first.append(hero);if(dict)first.append(dict);first.append(tiles);
  app.replaceChildren(...stay.filter(e=>e.matches('aside,.notice,[role="alert"],.guest-banner')),first,...stay.filter(e=>!e.matches('aside,.notice,[role="alert"],.guest-banner')),more);
 }
 // The practice cards say the same thing on the home page and on the practice page.
 function cardWords(){
  const r=route();if(r!=='kid'&&r!=='practice')return;
  for(const s of document.querySelectorAll('#app .l30-card[data-l30="entry"] .l30-go>span:first-child'))if(s.textContent!=='開始')s.textContent='開始';
 }

 // ------------------------------------------------------------------ login / create account --------------------------------
 const GRADES='<option value="" selected>請選擇年級</option>'+[1,2,3,4,5,6].map((n,i)=>`<option value="${n}">小${'一二三四五六'[i]}</option>`).join('');
 const PW_HINT='密碼要 8 個字或以上。可用三個詞加數字，例如 apple-tree-2026。';
 function gradeHint(){      // reuse the host's own hint text (so later copy edits still reach this screen)
  try{const d=new DOMParser().parseFromString(priorLoginView(),'text/html'),e=d.getElementById('register-grade-hint');if(e&&e.textContent.trim())return e.innerHTML;}catch(_){}
  return '幼稚園高班可選「小一」。每課詞數會按年級調整，之後可在家長區修改。';
 }
 function loginCard(){
  return `<section class="card auth-card p10-card" id="p10-login-card" aria-labelledby="p10-login-h"><h2 id="p10-login-h">登入</h2>`
   +`<div class="field"><label for="login-name">帳戶名稱</label><input id="login-name" autocomplete="username" autocapitalize="none" spellcheck="false" aria-required="true" placeholder="例如：chan-family"></div>`
   +`<div class="field"><label for="login-pin">家長密碼</label><div class="p10-pw"><input id="login-pin" type="password" maxlength="128" autocomplete="current-password" aria-required="true" placeholder="輸入家長密碼"><button type="button" class="btn soft p10-eye" data-p10="pw" data-target="login-pin" aria-pressed="false">顯示密碼</button></div><p class="small muted" id="p10-legacy" hidden>這是舊帳戶，請輸入原來的 4 位數字 PIN。</p></div>`
   +`<div class="p10-submit">${btn('登入','login-submit','primary full')}</div></section>`;
 }
 function registerCard(){
  return `<section class="card auth-card p10-card" id="p10-register-card" aria-labelledby="p10-register-h"><h2 id="p10-register-h">建立新帳戶</h2>`
   +`<div class="field"><label for="register-name">帳戶名稱</label><input id="register-name" autocomplete="username" autocapitalize="none" spellcheck="false" aria-required="true" placeholder="例如：chan-family"><p class="small muted">3 個字或以上，用來登入。</p></div>`
   +`<div class="field"><label for="register-child">孩子的名字</label><input id="register-child" placeholder="例如：樂樂"><p class="small muted">可以不填，之後再改。</p></div>`
   +`<div class="field"><label for="register-grade">孩子的年級</label><select id="register-grade" required aria-required="true" aria-describedby="register-grade-hint register-grade-error">${GRADES}</select><p class="small muted" id="register-grade-hint" style="margin:10px 0 0">${gradeHint()}</p><p class="small" id="register-grade-error" role="alert" style="display:none;margin:8px 0 0;color:#b3261e">請先選擇年級，才可以建立帳戶。</p></div>`
   +`<div class="field"><label for="register-pin">家長密碼</label><div class="p10-pw"><input id="register-pin" type="password" maxlength="128" autocomplete="new-password" aria-required="true" placeholder="至少 8 個字" aria-describedby="register-pin-hint"><button type="button" class="btn soft p10-eye" data-p10="pw" data-target="register-pin" aria-pressed="false">顯示密碼</button></div><p class="small muted" id="register-pin-hint">用來登入，也用來進入家長頁。可用三個詞加數字，例如 apple-tree-2026。</p></div>`
   +`<div class="p10-submit">${btn('建立帳戶','register-submit','primary full')}</div></section>`;
 }
 function loginHtml(){
  let has=false;try{has=readAccounts().length>0;}catch(_){}
  return `<div class="p10-login" id="p10-login"><a class="btn quiet p10-back" href="#kid">← 返回</a><div class="p10-login-head"><h1>登入或建立帳戶</h1></div>`
   +`<div class="auth-note p10-note"><div class="lock" aria-hidden="true">🔐</div><div><strong>練習需要先登入</strong><div class="small">先試玩不會儲存紀錄和金幣。帳戶只存在這部裝置，不會上傳；請不要用其他網站的密碼。</div></div></div>`
   +`<div class="p10-choices"><button type="button" class="p10-choice new" data-p10="jump" data-target="p10-register-card"><strong>第一次使用：建立帳戶</strong><span>由家長設定，約 1 分鐘</span></button>`
   +`<button type="button" class="p10-choice old" data-p10="jump" data-target="p10-login-card"><strong>已有帳戶：登入</strong><span>輸入帳戶名稱和家長密碼</span></button></div>`
   +`<div class="auth-grid p10-forms">${has?loginCard()+registerCard():registerCard()+loginCard()}</div>`
   +`<p class="p10-try"><a href="#kid">先試玩，不登入</a></p></div>`;
 }
 const priorLoginView=loginView;
 loginView=function(){
  if(WQ_TEST_MODE||isLoggedIn())return priorLoginView.apply(this,arguments);
  return loginHtml();
 };
 function loginAfter(){
  const root=$('#app .p10-login');if(!root)return;
  const guide=$('#app .wq32-guide');if(guide&&guide.parentNode!==root)root.append(guide);
  const portal=$('#app .wq29-portal');if(portal)root.append(portal);       // arcade promo goes below the two choices and the forms
 }
 // inline, persistent errors under the field
 function clearErrors(){
  for(const e of document.querySelectorAll('#app .p10-err'))e.remove();
  for(const i of document.querySelectorAll('#app [aria-invalid="true"]'))if(i.id!=='register-grade')i.removeAttribute('aria-invalid');
 }
 function showError(fieldId,msg,focus){
  const f=document.getElementById(fieldId);if(!f)return false;
  const holder=f.closest('.p10-pw')||f;
  const p=mk('p','p10-err small');p.id='p10-err-'+fieldId;p.setAttribute('role','alert');p.textContent=msg;
  holder.insertAdjacentElement('afterend',p);
  f.setAttribute('aria-invalid','true');f.setAttribute('aria-describedby',[(f.getAttribute('aria-describedby')||'').replace(/\s*p10-err-\S+/g,''),p.id].join(' ').trim());
  if(focus){try{f.focus();}catch(_){}}
  inlineShown=true;return true;
 }
 function errorField(form,msg){
  if(form==='login')return /名稱|名字/.test(msg)&&!/密碼/.test(msg)?'login-name':'login-pin';
  if(/名稱|名字/.test(msg)&&!/密碼/.test(msg))return 'register-name';
  if(/密碼|PIN/.test(msg))return 'register-pin';
  if(/年級/.test(msg))return 'register-grade';
  return 'register-pin';
 }
 const priorToast=toast;
 toast=function(msg,type){
  const out=priorToast.apply(this,arguments);
  guard(()=>{
   if(type==='bad'&&lastRoute==='login'&&authForm&&!inlineShown&&$('#p10-login'))showError(errorField(authForm,String(msg)),String(msg),false);
   if(resetting&&type!=='bad')resetDone=true;
  });
  return out;
 };
 document.addEventListener('click',e=>{
  const b=e.target.closest?.('[data-act="login-submit"],[data-act="register-submit"]');if(!b||!$('#p10-login'))return;
  authForm=b.dataset.act==='login-submit'?'login':'register';clearErrors();inlineShown=false;
  const val=id=>(document.getElementById(id)?.value||'');
  if(authForm==='login'){
   // an empty form is not a wrong password: do not count it towards the lock-out
   if(!val('login-name').trim()){showError('login-name','請填寫帳戶名稱。',true);e.stopImmediatePropagation();e.preventDefault();return;}
   if(!val('login-pin')){showError('login-pin','請填寫家長密碼。',true);e.stopImmediatePropagation();e.preventDefault();return;}
  }else{
   const n=val('register-name').trim();
   if(n.length<3||n.length>40){showError('register-name','請填寫帳戶名稱，3 至 40 個字。',true);return;}
   const pw=val('register-pin');
   if(pw.length<8||pw.length>128){showError('register-pin',PW_HINT,true);return;}
  }
 },true);
 document.addEventListener('input',e=>{
  const t=e.target;if(!t||!t.id||!$('#p10-login'))return;
  if(t.getAttribute('aria-invalid')==='true'&&t.id!=='register-grade'){document.getElementById('p10-err-'+t.id)?.remove();t.removeAttribute('aria-invalid');}
  if(t.id==='login-name'){
   const hint=document.getElementById('p10-legacy');if(!hint)return;
   let legacy=false;try{const n=norm(t.value),acc=readAccounts().find(a=>a.name===n);legacy=!!acc&&!WQAuth.isModern(acc);}catch(_){}
   hint.hidden=!legacy;
  }
 });

 // ------------------------------------------------------------------ parent area -------------------------------------------
 function visitorParent(){
  if(isLoggedIn()||lastRoute!=='parent'||route()!=='parent')return;
  const app=$('#app');if(!app)return;
  app.innerHTML='<section class="card pad p10-gate" id="p10-gate"><h1>請先建立帳戶</h1><p>家長頁要先有帳戶，才能加入默書範圍和看孩子的進度。</p><div class="row"><a class="btn primary" href="#login">建立帳戶</a><a class="btn secondary" href="#kid">返回首頁</a></div></section>';
 }
 function settingsAfter(){
  if(lastRoute!=='settings'||route()!=='settings')return;
  const app=$('#app');if(!app||document.getElementById('p10-about')||document.getElementById('v23-parent-password'))return;
  const ver=(window.WQR3&&WQR3.version)||'';
  let html='';
  if(isLoggedIn())html+='<section class="card pad p10-account" id="p10-account"><h2>帳戶</h2><p class="small muted">登出後，要用家長密碼才能再登入。</p><button type="button" class="btn secondary" data-p10="logout">登出</button></section>';
  html+='<section class="card pad p10-about" id="p10-about"><h2>關於這個程式</h2><p class="small muted">WordQuest'+(ver?' '+esc(ver):'')+' · 內容尚未經老師逐題審核。</p></section>';
  app.insertAdjacentHTML('beforeend',html);
 }
 // the plain-language storage note replaces the engineering line (Web Locks / UTF-8 ...)
 const priorStatus=v25RenderStatus;
 v25RenderStatus=function(){
  const out=priorStatus.apply(this,arguments);
  guard(()=>{
   const el=document.getElementById('v25-runtime-details');if(!el)return;
   const d=v25Diagnostics(),bad=[];
   if(!d.secureContext)bad.push('這個頁面不是安全連線，部分功能可能不能用。');
   if(!d.webLocks)bad.push('這個瀏覽器不能防止同時開多個頁面，請只開一個頁面使用。');
   if(!d.passwordCrypto)bad.push('這個瀏覽器不能處理密碼，請改用較新的瀏覽器。');
   const size=d.mainUtf8Bytes===null?'':'已儲存的資料約 '+Math.max(1,Math.round(d.mainUtf8Bytes/1024))+' KB。';
   el.textContent=(bad.length?bad.join(''):'這部裝置可以正常儲存資料。')+size;
   // the "this tab holds the edit lock" line is engineering talk: say it only when it matters
   const st=document.getElementById('v25-runtime-status');
   if(st&&st.textContent===d.mainStatus&&isLoggedIn()&&!loadBlocked){
    st.hidden=v23HasLease();
    if(!st.hidden)st.textContent='這個頁面現在只能閱讀。請關閉另一個已開啟的頁面，再重新整理。';
   }else if(st)st.hidden=false;
  });
  return out;
 };
 const priorReset=resetAll;
 resetAll=async function(){
  resetting=true;resetDone=false;
  try{await priorReset.apply(this,arguments);}finally{resetting=false;}
  if(resetDone){
   resetDone=false;
   guard(()=>{
    go('children');render();
    // the hashchange renders land after this tick; the add-child form is opened after them
    setTimeout(()=>guard(()=>{if(route()==='children'&&$('[data-act="show-add-child"]'))showAddChild();toast('資料已清除。請建立新孩子。');}),160);
   });
  }
 };
 // a visible log-out button asks first, in plain words
 document.addEventListener('click',e=>{
  const b=e.target.closest?.('[data-act="logout"]');if(!b)return;
  if(!confirm('要登出嗎？登出後，要用家長密碼才能再登入。')){e.stopImmediatePropagation();e.preventDefault();}
 },true);

 // ------------------------------------------------------------------ small actions -----------------------------------------
 document.addEventListener('click',e=>{
  const b=e.target.closest?.('[data-p10]');
  if(!b){
   if(document.body.classList.contains(MENU)&&!e.target.closest?.('#wq29-nav'))closeMenu();
   return;
  }
  const a=b.dataset.p10;
  if(a==='menu'){e.preventDefault();toggleMenu();return;}
  if(a==='pw'){
   const i=document.getElementById(b.dataset.target);if(!i)return;
   const show=i.type==='password';i.type=show?'text':'password';b.setAttribute('aria-pressed',String(show));b.textContent=show?'隱藏密碼':'顯示密碼';return;
  }
  if(a==='jump'){
   const t=document.getElementById(b.dataset.target);if(!t)return;
   t.scrollIntoView({behavior:reduceMotion()?'auto':'smooth',block:'start'});
   const i=t.querySelector('input');setTimeout(()=>{try{i&&i.focus({preventScroll:true});}catch(_){}},reduceMotion()?0:350);
   t.classList.add('p10-flash');setTimeout(()=>t.classList.remove('p10-flash'),1600);return;
  }
  if(a==='dictation'){e.preventDefault();startDictation(b.dataset.range);return;}
  if(a==='logout'){e.preventDefault();if(confirm('要登出嗎？登出後，要用家長密碼才能再登入。'))logout();return;}
 });
 document.addEventListener('keydown',e=>{if(e.key==='Escape'&&document.body.classList.contains(MENU)){closeMenu();$('#p10-menu')?.focus();}});
 // <details> does not bubble its toggle event: listen in the capture phase
 document.addEventListener('toggle',e=>{const d=e.target;if(d&&d.id==='p10-more')moreOpen=!!d.open;},true);

 // ------------------------------------------------------------------ labels / required fields --------------------------------
 const REQUIRED=['login-name','login-pin','register-name','register-pin','register-grade','new-child-name','new-child-grade'];
 function labels(){
  for(const l of document.querySelectorAll('#app label:not([for])')){
   if(l.querySelector('input,select,textarea,button'))continue;
   let c=null,n=l.nextElementSibling;
   for(let k=0;n&&k<2&&!c;k++,n=n.nextElementSibling){
    if(/^(INPUT|SELECT|TEXTAREA)$/.test(n.tagName))c=n;else{const i=n.querySelector&&n.querySelector('input,select,textarea');if(i)c=i;}
   }
   if(!c||c.type==='hidden'||(c.labels&&c.labels.length))continue;
   if(!c.id)c.id='p10-f'+(++labelSeq);
   l.setAttribute('for',c.id);
  }
  for(const id of REQUIRED){const f=document.getElementById(id);if(f&&!f.hasAttribute('aria-required'))f.setAttribute('aria-required','true');}
 }
 function watchLabels(){
  const app=$('#app');if(!app||!window.MutationObserver)return;
  new MutationObserver(()=>{if(labelRaf)return;labelRaf=requestAnimationFrame(()=>{labelRaf=0;guard(labels);});}).observe(app,{childList:true,subtree:true});
 }

 // ------------------------------------------------------------------ wiring -------------------------------------------------
 const priorSfx=updateSfxButton;
 updateSfxButton=function(){const out=priorSfx.apply(this,arguments);guard(()=>{const l=$('#header-sfx .label');if(l)l.textContent=sfxEnabled()?'聲音：開':'聲音：關';});return out;};
 const priorRender=render;
 render=function(){
  const out=priorRender.apply(this,arguments);
  guard(()=>{
   if(!$('#app'))return;
   chrome();
   const r=route();
   if(lastRoute!==r)return;                     // render() returned early (a game is still running)
   if(r!=='login'){authForm='';inlineShown=false;}   // the remembered form belongs to the login page only
   if(r==='kid')home();
   else if(r!=='login'&&$('#app .l30-hero')&&!$('#app .p10-hero')){location.replace('#kid');return;}   // an address the app does not know falls back to the old home block (a huge portrait over the text): send it to the new home
   if(r==='login')loginAfter();
   if(r==='parent')visitorParent();
   settingsAfter();
   cardWords();
   labels();
  });
  return out;
 };
 guard(watchLabels);
 window.WQ35P10=Object.freeze({startDictation,dictRange});
})();
