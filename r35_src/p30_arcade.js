/* R3.5 p30: arcade lobby, game cards, intro dialog ("看玩法"), ready / result card, arcade-wide touch / keyboard help.
   Host closure code: it runs inside the main script scope just before installMediaEvents();render(), so it can wrap
   gameView / pgIntro / pgOverlay / pgAttach / pgRenderTools / r2AudioPanel / render by name.

   Design rules
   - The R3.3 / R3.4 code stays the source of truth. Every wrapper calls the previous function first, then reshapes its output.
   - The lobby is re-composed from the OLD lobby html (the filter, the old parent-ish blocks, the notices are moved, not re-typed),
     so wording changes made later by the automatic copy pass still flow through the parts that are only moved.
   - Strings that this module writes are new strings. Test hooks of older suites are kept: data-cabinet, data-a28="intro" | "buy" | "play" |
     "leave" | "filter", #pg-overlay h2 / small, the replay button of the result card.
   - One switch for touch versus keyboard text: .p30-how holds both sentences, CSS (pointer: coarse) shows the touch one only. */
(function(){
 'use strict';
 const CAP='試玩預覽・不扣幣・不能操作';
 const EARN='去賺金幣：做一個小練習';
 const EARN_NOTE='做完 1 組練習得 1 枚金幣';
 const UNLOCK='做練習解鎖';
 const SLOGAN_ZERO='做練習，賺金幣，就可以玩';
 const BEAT_CAP='第幾拍（先選樂器，再按數字）';
 const guard=(label,fn)=>{try{return fn();}catch(e){try{console.error('p30 '+label,e);}catch(_){}}};
 const mk=(tag,cls,html)=>{const e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;};
 const txt=(tag,cls,t)=>{const e=document.createElement(tag);if(cls)e.className=cls;e.textContent=t;return e;};
 const reduceMotion=()=>{try{return matchMedia('(prefers-reduced-motion: reduce)').matches;}catch(_){return false;}};

 // ------------------------------------------------------------------ per-game text: t = touch, k = keyboard / mouse, g = goal ------------------
 // One entry per catalog game. t never names a key; k never names a finger. g works on both.
 const GM={
  'sky-rescue':{t:'用手指拖動小飛機，輕按畫面開護盾。',k:'按方向鍵或 W A S D 飛行，按 Space 開護盾。',g:'救起 12 隻小鳥就完成。你有 3 格生命，收集物只加分。'},
  'forest-dash':{t:'左右滑動換跑道，輕按跳躍，向下滑動滑行。',k:'按 ← → 換路，↑ 跳起，↓ 滑行。',g:'跑完 1500 米就完成。你有 3 格生命，沒有倒數。'},
  'moon-bells':{t:'用手指左右拖動小兔。',k:'按 ← → 或 A D 移動小兔。',g:'小兔下降時踩到鈴鐺，就會再跳高。'},
  'bounce-basket':{t:'拖住皮球向後拉，放手投籃。也可以按住「蓄力投籃」。',k:'按住 Space 蓄力，放開就投籃。',g:'球從籃框上方落下才得分。最多 7 球，失 3 球就結束。'},
  'number-garden':{t:'向上下左右滑，移動全部數字。',k:'按方向鍵，移動全部數字。',g:'相同的數字相撞會合起來。留一點空位，別把自己封住。'},
  'forest-band':{t:'輕按格子開關聲音，再按「播放合奏」。',k:'用滑鼠點格子開關聲音，再按「播放合奏」。',g:'每一列是一種樂器，每一格是一拍。完成後按「完成演出」。'},
  'drift-path':{t:'輕按畫面任何位置轉彎。',k:'按 Space 轉彎。',g:'在轉角中間轉向，留在米色小徑上。'},
  'meadow-cricket':{t:'球到金色圈時，輕按畫面揮棒。',k:'球到金色圈時，按 Space 揮棒。',g:'越接近圈心，得分越高。共 10 球，每球只能揮一次。'},
  'honey-delivery':{t:'用手指劃過繩子剪斷，也可以按下方按鈕選繩。',k:'用滑鼠點繩子剪斷，或按 Space 剪下一條。',g:'讓蜜糖落進杯子就過關。剪繩的次序會改變落點。'},
  'color-workshop':{t:'輕按按鈕遮住球的一半，再選顏色染色。',k:'用滑鼠點按鈕遮住球的一半，再選顏色染色。',g:'做出和目標一樣的彩球。完成前要先除去遮罩。'},
  'forest-pong':{t:'用手指左右拖動球拍。',k:'按 ← → 或 A D 移動球拍。',g:'先得 5 分就贏，失 3 分就結束。'},
  'juice-lines':{t:'用手指在畫面畫斜線，再按「開水」。',k:'用滑鼠在畫面畫斜線，再按「開水」。',g:'把水滴引進杯子就過關。平的線會讓水滴停住。'},
  'honeycomb-puzzle':{t:'先選下面的積木，再輕按棋盤。第一下預覽，第二下放置。',k:'先選下方積木，再用滑鼠點棋盤放下。',g:'排滿一整行就會消除。三組用完才補新積木。'},
  'valley-race':{t:'左右拖動轉向，手指向下拖就煞車。',k:'按 ← → 轉向，按 ↓ 煞車。',g:'留在米色道路上，依次經過四個路標。跑三圈完成。'},
  'rolling-block':{t:'上下左右滑動畫面，滾動方塊。',k:'按方向鍵翻滾方塊。',g:'最後要讓方塊直立在金色格。可以退一步，也可以看提示。'},
  'block-studio':{t:'輕按旋轉，左右滑動移動，向下滑直接落下。',k:'按 ← → 移動，↑ 旋轉，↓ 加速，Space 直接落下。',g:'排滿一整行就會消除。可以先收藏一塊，之後再換出來。'},
  'star-rhythm':{t:'金球走到下一個光圈時，輕按畫面打拍子。',k:'金球走到下一個光圈時，按 Space。',g:'先聽四拍預備。共 32 拍，打得越準，得分越高。'},
  'color-orbit':{t:'輕按畫面左邊或右邊，轉動六角形。',k:'按 ← → 轉動六角形。',g:'同一面連續三塊同色就會消除。一面疊到八塊就結束。'},
  'garden-paths':{t:'輕按旋轉鍵轉動路片，再按「放置」。',k:'按 ← → 旋轉路片，按 Space 放置。',g:'金色格是下一塊路片。路走出邊界或連成花環，這局就結束。'},
  'little-engineer':{t:'用手指點兩個零件連起來，再按「試行」。',k:'用滑鼠點兩個零件連起來，再按「試行」。',g:'貨箱到達旗幟才算成功。你有 3 次試行機會。'},
  'sweet-studio':{t:'用下方按鈕選口味和配料，做好後按「交杯」。',k:'按 1 至 4 選口味，按 Q E 換配料，按 Space 交杯。',g:'做錯訂單才扣 1 格生命。完成 6 至 10 張訂單就結束。'},
  'ruins-courier':{t:'左右滑動換跑道，輕按跳躍，向下滑動滑行。',k:'按 ← → 換線，↑ 跳起，↓ 滑行。',g:'跑完 1500 米就完成。橫跨三線的障礙，要跳或滑過去。'},
  'cloud-island':{t:'左右拖動移動，輕按畫面跳起。短衝用右邊的按鈕。',k:'按 ← → 移動，↑ 跳起，X 短衝。',g:'走完三座雲島就完成。你有 3 格生命，三座島共用。'},
  'star-patrol':{t:'用手指拖動飛行，輕按畫面開護盾。',k:'按方向鍵飛行，Space 開護盾，X 切換能量泡。',g:'共三區，每區六波編隊，再加守關機。只有機械和能量效果。'},
  'lighthouse-well':{t:'左右拖動移動，輕按開降落傘，向下滑動加速。',k:'按 ← → 移動，↓ 穿過平台，Space 開降落傘。',g:'往下走到 60 層就完成。避開橙色尖台和上方警戒線。'},
  'harbor-volley':{t:'左右拖動移動，輕按擊球。向上滑跳起，向下滑打短球。',k:'按 ← → 移動，↑ 跳起，Space 擊球。',g:'先得 5 分並領先 2 分就贏，最多打 7 分。'}
 };
 const howHtml=gm=>`<span class="p30-t">${esc(gm.t)}</span><span class="p30-k">${esc(gm.k)}</span>`;

 // ------------------------------------------------------------------ small helpers ----------------------------------------------------------------
 const admin=()=>{try{return isLoggedIn()&&adminUnlocks();}catch(_){return false;}};
 const coinsNow=()=>{try{return isLoggedIn()?Number(activeChild().stars)||0:0;}catch(_){return 0;}};
 const roundUsed=()=>{try{return isLoggedIn()?Number(a28Child().batch.used)||0:0;}catch(_){return 0;}};
 const canPay=()=>admin()||(coinsNow()>=1&&roundUsed()<5);
 // The earn button reuses the lesson-start mechanism of the child home (data-l30="start"); it falls back to a link.
 function earnHtml(label,kind){
  const cls=`btn ${kind||'primary'} p30-earn-btn`;
  try{
   if(typeof l30Session==='function'&&l30Session())return `<a class="${cls}" href="#learning" data-p30="earn">${esc(label)}</a>`;
   if(typeof l30Recommended==='function'){const u=l30Recommended();if(u&&u.id)return `<button type="button" class="${cls}" data-p30="earn" data-l30="start" data-unit="${esc(u.id)}" data-mode="lesson">${esc(label)}</button>`;}
  }catch(_){}
  return `<a class="${cls}" href="#classroom" data-p30="earn">${esc(label)}</a>`;
 }
 const fold={locked:false,more:false};

 // ------------------------------------------------------------------ lobby ----------------------------------------------------------------------------
 function cardHtml(id,logged){
  const m=a28Meta(id),g=COIN28.game(id),idx=COIN28.ids.indexOf(id),n=a28Qualified();
  const open=logged&&a28Allow(id),locked=logged&&!open;
  let badge=open?'已開放':locked?'還沒開放':'先看玩法',note='登入後才能玩';
  if(open)note='玩一次 1 枚金幣';
  if(locked){
   const c=a28Child(),rule=c.permissions[id]||pgChild().override[g.legacy],blocked=rule==='blocked'||c.paused;
   note=blocked?a28Label(id):`${UNLOCK}，還差 ${Math.max(0,g.words-n)} 項複習`;
  }
  return `<article class="a28-cabinet p30-card ${open?'is-open':locked?'is-locked':'is-guest'}" style="--machine:${a28Themes[idx%6]}" data-cabinet="${id}" data-r2-new="${WQR2.ids.includes(id)}">`+
   `<div class="p30-shot"><div data-a28thumb="${id}" class="a28-thumb"></div><span class="p30-badge${open?'':' shut'}">${badge}</span></div>`+
   `<div class="a28-cabinet-body"><h3>${esc(m.name)}</h3><p class="p30-en">${esc(m.en)}</p><p class="p30-desc">${esc(m.desc)}</p>`+
   `<button type="button" class="btn ${open?'primary':'secondary'} a28-btn" data-a28="intro" data-id="${id}" aria-label="看玩法：${esc(m.name)}">看玩法</button>`+
   `<p class="p30-note">${esc(note)}</p></div></article>`;
 }
 function lobbyHtml(old){
  const tpl=document.createElement('template');tpl.innerHTML=old;
  const root=tpl.content.querySelector('section.a28-lobby');if(!root)return old;
  const kids=[...root.children],used=new Set();
  const take=sel=>{const n=kids.find(k=>k.matches(sel));if(n)used.add(n);return n||null;};
  take('header.a28-hero');
  const classmates=take('.wq32-classmate-strip'),strip=take('.a28-status-strip'),tabs=take('.a28-tabs'),cabs=take('.a28-cabinets');
  take('.a28-section-head');
  const ward=take('.a28-wardrobe'),rules=take('details.a28-rules');
  const notices=kids.filter(k=>k.matches('.notice,.a28-resume,.a28-break'));notices.forEach(n=>used.add(n));
  const rest=kids.filter(k=>!used.has(k));
  const sibs=[...tpl.content.children].filter(k=>k!==root);
  const parentLink=root.querySelector('.a28-hero-actions a[href="#game-settings"]');
  if(!cabs||!tabs)return old;
  const logged=isLoggedIn(),coins=coinsNow(),ids=[...cabs.querySelectorAll('article[data-cabinet]')].map(a=>a.dataset.cabinet);
  const open=[],shut=[];
  for(const id of ids)((!logged||a28Allow(id))?open:shut).push(id);
  const pay=logged&&canPay();
  const slogan=!logged?'先看玩法。登入後才能玩。':coins<1&&!admin()?SLOGAN_ZERO:!pay?'這一輪的 5 次玩完了。做練習，就能玩下一輪。':'選一個遊戲，先看玩法。';
  const wallet=`<div class="p30-wallet"><span class="a28-coin" aria-hidden="true">W</span><div><small>我的金幣</small><strong>${coins}<span>枚</span></strong></div></div>`;
  const top=`<div class="p30-top${logged?'':' p30-top-guest'}">${logged?wallet:''}<p class="p30-slogan">${esc(slogan)}</p>`+
   (logged&&!pay?`<div class="p30-earn">${earnHtml(EARN)}<small>${EARN_NOTE}</small></div>`:'')+`</div>`;
  const showShut=fold.locked||!open.length;
  const sec=`<div class="p30-sec"><h2>可以玩的遊戲</h2><span>${open.length} 款</span></div>`;
  const empty=!open.length?`<p class="p30-empty">這一類現在沒有可以玩的遊戲。做練習就能解鎖。</p>`:'';
  const shutHtml=shut.length?`<details class="p30-fold p30-locked" data-fold="locked"${showShut?' open':''}><summary>還沒開放（${shut.length} 款）<span class="p30-fold-hint">${UNLOCK}</span></summary><div class="p30-fold-body"><div class="p30-cards">${shut.map(id=>cardHtml(id,logged)).join('')}</div></div></details>`:'';
  const more=[strip,classmates,ward,rules,...sibs.filter(k=>k.matches('details.r2-records')),...rest].filter(Boolean).map(n=>n.outerHTML).join('');
  const other=sibs.filter(k=>!k.matches('details.r2-records')).map(n=>n.outerHTML).join('');
  if(parentLink){parentLink.className='btn soft p30-parent-link';}
  const moreHtml=`<details class="p30-fold p30-more" data-fold="more"${fold.more?' open':''}><summary>進度、造型和規則<span class="p30-fold-hint">家長也可以看</span></summary><div class="p30-fold-body">${more}${parentLink?parentLink.outerHTML:''}</div></details>`;
  return `<section class="a28-lobby p30-lobby"><h1>遊戲街機</h1>${top}${notices.map(n=>n.outerHTML).join('')}${sec}${tabs.outerHTML}<div class="p30-cards">${open.map(id=>cardHtml(id,logged)).join('')}</div>${empty}${shutHtml}${moreHtml}</section>${other}`;
 }
 const priorGameView=gameView;
 gameView=function(){
  const html=priorGameView.apply(this,arguments);
  return guard('lobby',()=>lobbyHtml(html))||html;
 };
 document.addEventListener('toggle',e=>{const d=e.target;if(d&&d.classList&&d.classList.contains('p30-fold')&&d.dataset.fold)fold[d.dataset.fold]=d.open;},true);

 // ------------------------------------------------------------------ back to top (long lobby) ---------------------------------------------------------
 let topBtn=null;
 function topUpdate(){
  if(!topBtn)return;
  const on=typeof lastRoute!=='undefined'&&lastRoute==='game'&&window.scrollY>520&&document.querySelector('.p30-lobby');
  topBtn.classList.toggle('show',!!on);
 }
 function topInit(){
  if(topBtn)return;
  topBtn=txt('button','p30-top-btn','回到頂部');topBtn.type='button';topBtn.id='p30-top';topBtn.setAttribute('aria-label','回到頁面頂部');
  topBtn.addEventListener('click',()=>{window.scrollTo({top:0,behavior:reduceMotion()?'auto':'smooth'});const h=document.querySelector('.p30-lobby h1');if(h){h.tabIndex=-1;h.focus({preventScroll:true});}});
  document.body.append(topBtn);
  window.addEventListener('scroll',topUpdate,{passive:true});
  window.addEventListener('resize',topUpdate);
 }

 // ------------------------------------------------------------------ intro dialog (看玩法) --------------------------------------------------------------
 function introFix(d,id){
  const m=a28Meta(id),g=COIN28.game(id),logged=isLoggedIn(),yes=a28Allow(id),n=a28Qualified();
  const c=logged?a28Child():null,stars=coinsNow(),used=roundUsed(),free=admin(),pay=logged&&yes&&canPay();
  d.classList.add('p30-intro');
  const close=d.querySelector('.a28-dialog-top [data-a28="close"]');
  if(close){close.classList.add('p30-close');close.innerHTML='<span aria-hidden="true">✕</span><span>關閉</span>';close.setAttribute('aria-label','關閉玩法說明');}
  const cap=d.querySelector('.a28-preview>span');if(cap)cap.textContent=CAP;
  // On a phone the buddy line must not tell the child to look at "keys".
  const gl=d.querySelector('.wq32-guide .wq32-line');if(gl&&coarse())gl.textContent=gl.textContent.replace(/看清楚按鍵再選擇。?/,'').trim();
  const box=d.querySelector('.a28-dialog-content');if(!box)return;
  const gm=GM[id],first=box.querySelector(':scope > p:not(.small)');
  if(first&&gm){first.replaceWith(mk('p','p30-how',howHtml(gm)),txt('p','p30-goal',gm.g));box.querySelector(':scope > strong')?.remove();}
  const prog=box.querySelector('.a28-preview-progress');
  let blocked=false;
  if(logged){const rule=c.permissions[id]||pgChild().override[g.legacy];blocked=rule==='blocked'||c.paused;}
  if(prog&&logged){
   if(yes)prog.textContent=pay?`已解鎖。玩一次要 1 枚金幣，你現在有 ${stars} 枚。`:stars<1?`已解鎖。玩一次要 1 枚金幣，你現在有 ${stars} 枚。`:'已解鎖。這一輪的 5 次玩完了。';
   else if(!blocked&&g.words)prog.textContent=`還沒開放。要通過 ${g.words} 項複習，你已通過 ${n} 項。`;
  }
  const old={login:box.querySelector('a[href="#login"]'),resume:box.querySelector('[data-a28="resume"]'),buy:box.querySelector('[data-a28="buy"]'),kid:box.querySelector('a[href="#kid"]')};
  const smalls=[...box.querySelectorAll(':scope > p.small')],fine=smalls[smalls.length-1]||null;
  if(fine)fine.classList.add('p30-fine');
  const keepNote=old.resume&&smalls.length>1?smalls[0]:null;
  for(const nd of [old.login,old.resume,old.buy,old.kid,...smalls])if(nd&&nd!==fine&&nd!==keepNote)nd.remove();
  const act=mk('div','p30-actions');
  if(!logged){if(old.login)act.append(old.login);}
  else if(old.resume){act.append(old.resume);if(keepNote)act.append(keepNote);}
  else if(pay&&old.buy){
   old.buy.disabled=false;old.buy.removeAttribute('disabled');
   old.buy.innerHTML=free?`${a28Coin()} 開始測試（不扣金幣）`:`${a28Coin()} 用 1 枚金幣開始`;
   if(!free)act.append(txt('p','p30-before','按下去才會扣 1 枚金幣'));
   act.append(old.buy);
   if(!free)act.append(txt('p','p30-after',`你有 ${stars} 枚金幣・這一輪已玩 ${used}/5 次`));
  }else if(yes){
   act.insertAdjacentHTML('beforeend',earnHtml(EARN));act.append(txt('p','p30-after',EARN_NOTE));
  }else if(!blocked){
   act.insertAdjacentHTML('beforeend',earnHtml(UNLOCK));act.append(txt('p','p30-after','通過複習，這個遊戲就會開放。'));
  }else if(old.kid)act.append(old.kid);
  if(fine)box.append(fine);
  box.append(act);
 }
 const priorIntro=pgIntro;
 pgIntro=function(id){
  const out=priorIntro.apply(this,arguments);
  guard('intro',()=>{const d=document.getElementById('pg-dialog');if(d&&d.open&&COIN28.ids.includes(id))introFix(d,id);});
  return out;
 };

 // ------------------------------------------------------------------ ready / result card ----------------------------------------------------------------
 let lastKey='';
 function reveal(key){
  if(!matchMedia('(max-width: 700px)').matches)return;
  const run=()=>{
   const box=document.getElementById('pg-overlay');
   if(lastKey!==key||!box||box.hidden)return;
   const r=box.getBoundingClientRect(),nav=document.querySelector('.wq29-nav'),nh=nav&&getComputedStyle(nav).position==='fixed'?nav.offsetHeight:0;
   const limit=window.innerHeight-nh-8;
   if(r.bottom>limit)window.scrollBy({top:r.bottom-limit,behavior:'auto'});
  };
  requestAnimationFrame(run);setTimeout(run,400);
 }
 function cardFix(){
  const box=document.getElementById('pg-overlay');if(!box)return;
  const play=box.closest('.a28-play'),card=box.querySelector('.a28-overlaycard');
  const showing=!!card&&!box.hidden&&!pgPlaying;
  if(play)play.classList.toggle('p30-card-on',showing);
  if(!showing){lastKey='';return;}
  if(card.dataset.p30){return;}
  card.dataset.p30='1';
  const id=pgMeta&&pgMeta.id,gm=id&&GM[id];
  const r=pgFree?null:a28Run(),phase=pgFree?pgReason:r&&r.phase;
  const ready=!!card.querySelector('.wq34-goalbox');
  const bPlay=card.querySelector('[data-a28="play"]'),bLeave=card.querySelector('[data-a28="leave"]');
  if(bPlay)bPlay.textContent=ready?'開始':'繼續';
  if(bLeave){bLeave.textContent='返回';bLeave.setAttribute('aria-label','儲存並返回遊戲街機');}
  const note=card.querySelector(':scope > small');
  if(note&&!pgFree&&phase!=='error'&&pgReason!=='error'){
   const used=roundUsed(),done=!!card.querySelector('.wq34-result')||phase==='finished';
   note.textContent=done?`這一輪已玩 ${used}/5 次。不會自動再扣金幣。`:`已投 1 枚金幣・這一輪 ${used}/5`;
  }
  const how=card.querySelector('.wq34-how');
  if(how&&gm){how.classList.add('p30-how');how.innerHTML=howHtml(gm);}
  const stars=card.querySelector('.wq34-stars[aria-label]');
  if(stars){const k=(stars.getAttribute('aria-label').match(/\d+/)||['1'])[0];stars.setAttribute('aria-label',`${k} 顆星`);}
  const earn=card.querySelector('.wq34-earn');
  if(earn){earn.textContent=roundUsed()>=5?'這一輪的 5 枚金幣用完了。休息一下，或去做練習。':'金幣用完了。做完 1 組練習，就得 1 枚金幣。';}
  const kid=card.querySelector('.row a[href="#kid"]');
  if(kid&&isLoggedIn()){kid.outerHTML=earnHtml(EARN);}
  const key=(id||'')+'|'+(phase||'')+'|'+(card.querySelector('h2')?.textContent||'');
  if(key!==lastKey){lastKey=key;reveal(key);}
 }
 const priorOverlay=pgOverlay;
 pgOverlay=function(){const out=priorOverlay.apply(this,arguments);guard('card',cardFix);return out;};

 // ------------------------------------------------------------------ play view: layout class, dock captions, band caption --------------------------------
 function bandCaption(){
  const tools=document.getElementById('pg-tools');if(!tools||!pgMeta||pgMeta.id!=='forest-band')return;
  const first=tools.querySelector('[data-a28tool="step0"]');
  if(!first){tools.querySelector('.p30-beat-cap')?.remove();return;}
  let cap=tools.querySelector('.p30-beat-cap');
  if(!cap){cap=txt('span','p30-beat-cap',BEAT_CAP);}
  if(cap.nextElementSibling!==first)tools.insertBefore(cap,first);
 }
 const priorTools=pgRenderTools;
 pgRenderTools=function(){const out=priorTools.apply(this,arguments);guard('tools',bandCaption);return out;};
 function dockCaptions(){
  for(const b of document.querySelectorAll('.a28-game-footer .btn')){
   const k=b.dataset.a28;
   if(k==='leave')b.dataset.wq34s='返回';
   else if(k==='r2-full')b.dataset.wq34s='縮小';
  }
 }
 // The line under the canvas (#pg-hint) is written by the engines with key names. On touch devices it must say the touch sentence.
 const KBD=/方向鍵|WASD|W A S D|Space|空白鍵|鍵盤|Shift|Esc|滑鼠|Backspace|[←→↑↓]|\bQ E\b|按 [0-9A-Z]|Enter|\bTab\b/;
 const coarse=()=>{try{return matchMedia('(pointer: coarse)').matches;}catch(_){return false;}};
 function hintFix(){
  const h=document.getElementById('pg-hint'),gm=pgMeta&&GM[pgMeta.id];
  if(!h||!gm||!coarse()||h.textContent===gm.t||!KBD.test(h.textContent))return;
  h.textContent=gm.t;
 }
 function hintWatch(){
  const h=document.getElementById('pg-hint');if(!h)return;
  hintFix();
  if(h.dataset.p30)return;
  h.dataset.p30='1';
  new MutationObserver(()=>guard('hint',hintFix)).observe(h,{childList:true,characterData:true,subtree:true});
 }
 const priorAttach=pgAttach;
 pgAttach=function(){
  const out=priorAttach.apply(this,arguments);
  guard('attach',()=>{
   document.querySelector('.a28-viewport')?.classList.add('p30-below');
   const eb=document.querySelector('.a28-playhead .a28-eyebrow');if(eb&&!pgFree)eb.textContent='遊戲街機・已投 1 枚金幣';
   dockCaptions();bandCaption();cardFix();hintWatch();
  });
  return out;
 };

 // ------------------------------------------------------------------ motion switch must survive a rewrite of the old panel text ------------------------
 const priorPanel=r2AudioPanel;
 r2AudioPanel=function(){
  let h=priorPanel.apply(this,arguments);
  if(typeof h==='string'&&!h.includes('wq34-fx-toggle')){
   const on=(typeof WQFX!=='undefined'&&WQFX.on&&WQFX.on())?'checked':'';
   const label=`<label class="wq34-fxopt"><input type="checkbox" id="wq34-fx-toggle" ${on}> 動感效果：畫面震動、閃光和彩帶</label>`;
   const m=h.match(/<button[^>]*data-a28="r2-test-audio"[^>]*>[\s\S]*?<\/button>/);
   if(m)h=h.replace(m[0],m[0]+label);
  }
  return h;
 };

 // ------------------------------------------------------------------ help dialog: replaces the browser alert (keyboard text on phones) --------------------
 document.addEventListener('click',e=>{
  const b=e.target&&e.target.closest?e.target.closest('[data-a28="help"]'):null;
  if(!b||!pgMeta)return;
  e.preventDefault();e.stopImmediatePropagation();
  guard('help',()=>{
   try{pgPause();}catch(_){}
   const id=pgMeta.id,gm=GM[id],name=a28Meta(id).name;
   document.getElementById('p30-help')?.remove();
   const d=mk('dialog','p30-help');d.id='p30-help';
   d.innerHTML=`<div class="p30-help-in"><h2>${esc(name)}・玩法</h2>`+(gm?`<p class="p30-how">${howHtml(gm)}</p><p class="p30-goal">${esc(gm.g)}</p>`:`<p>${esc(pgMeta.guide||'')}</p>`)+`<button type="button" class="btn primary" data-p30="help-close">知道了</button></div>`;
   d.addEventListener('click',ev=>{if(ev.target.closest('[data-p30="help-close"]')||ev.target===d)d.close();});
   d.addEventListener('close',()=>d.remove());
   document.body.append(d);d.showModal();
   d.querySelector('[data-p30="help-close"]')?.focus();
  });
 },true);

 // ------------------------------------------------------------------ after every render ---------------------------------------------------------------
 // The classmate picker is added after render (to the top of the page); it belongs with the folded extras.
 function moveClassmates(){
  const cs=document.getElementById('wq32-classmates'),body=document.querySelector('.p30-more > .p30-fold-body');
  if(!cs||!body||body.contains(cs))return;
  const strip=body.querySelector('.a28-status-strip');
  if(strip)strip.after(cs);else body.prepend(cs);
 }
 const priorRender=render;
 render=function(){
  const out=priorRender.apply(this,arguments);
  guard('render',()=>{moveClassmates();topInit();topUpdate();if(typeof lastRoute!=='undefined'&&lastRoute==='playground'){cardFix();hintWatch();}});
  return out;
 };
 window.WQ35A={GM,earnHtml,lobbyHtml};
})();
