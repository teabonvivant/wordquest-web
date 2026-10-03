/* ===== p40 part 3: parent side (D8 demo range, D9 landing, D15 range management, D16 report, D17 gate, D24 words) ===== */
 const STATUS=['還沒練習','選對過','有提示時答對','最近自己串對','隔日複習也串對'];
 const status=n=>STATUS[n]||STATUS[0];
 const isDemo=r=>!!r&&(r.isDemo===true||r.id==='r_demo');
 P40.status=status;

 // ---------------------------------------------------------------- range list and detail (D8, D9, D15) -----------------------
 function rangeCard(r,active){
  const n=rangeWords(r.id).length,cur=!!active&&r.id===active.id;
  return `<section class="range-card ${cur?'is-current':''}" data-range="${esc(r.id)}"><div class="row between"><div><h3>${esc(r.title)}${isDemo(r)?' <span class="chip p40-demo">示範</span>':''}</h3><p class="range-meta">${r.dictationDate?esc(r.dictationDate)+' · ':''}${n} 個單字</p></div>${cur?'<span class="chip current">✓ 目前練習中</span>':btn('改練這個範圍','activate-range','primary',`data-id="${esc(r.id)}"`)}</div><div class="actions-inline">${btn('查看','view-range','soft',`data-id="${esc(r.id)}"`)}${btn('刪除','delete-range','danger',`data-id="${esc(r.id)}"`)}</div></section>`;
 }
 rangesView=function(){
  const rs=childRanges(),active=latestRange();
  const list=rs.map(r=>rangeCard(r,active)).join('')||`<div class="card pad"><p>還沒有默書範圍。</p>${link('加入默書範圍','range-new','primary')}</div>`;
  const detail='<div id="range-detail"></div>';
  return `${navTabs('ranges')}<div class="row between"><h1>默書範圍</h1>${link('＋ 加入範圍','range-new','primary')}</div>${landing?detail:''}<div class="stack" style="margin-top:18px">${list}</div>${landing?'':detail}`;
 };
 function missingZh(ws){return ws.filter(w=>!(w.zh||'').trim());}
 viewRange=function(id){
  const r=db.ranges.find(x=>x.id===id),box=$('#range-detail');if(!r||!box)return;
  const ws=rangeWords(id),miss=missingZh(ws),isNew=!!landing&&landing.rid===id,cur=latestRange()?.id===id;
  const ok=isNew?`<div class="p40-saved" role="status"><strong>已儲存「${esc(r.title)}」，共 ${ws.length} 個單字。</strong><span>${cur?'這是目前練習的範圍。':'按「改練這個範圍」就可以開始用它。'}</span></div>`:'';
  const demo=isDemo(r)?'<p class="notice">這是示範範圍，只供試用。不需要的話可以刪除。</p>':'';
  const missNote=miss.length?`<p class="notice">${miss.length} 個單字沒有中文意思（${esc(miss.slice(0,4).map(w=>w.en).join('、'))}${miss.length>4?'…':''}）。孩子會用聽讀音的方式練這些字。</p>`:'';
  const start=cur?`<button type="button" class="btn primary big" data-p40="start-kid">請孩子開始練習</button>`:'';
  box.innerHTML=`<section class="card pad p40-detail" style="margin-top:18px">${ok}<div class="row between"><div><h2>${esc(r.title)}${isDemo(r)?' <span class="chip p40-demo">示範</span>':''}</h2><p class="muted">${r.dictationDate?esc(r.dictationDate):'沒有填默書日期'}</p></div>${btn('關閉','close-detail','quiet')}</div>${demo}${missNote}<div class="p40-detail-actions">${start}<details class="p40-rename"><summary>改名稱或日期</summary><div class="form-grid"><div class="v20-field"><label for="p40-rn-title">名稱</label><input id="p40-rn-title" maxlength="120" value="${esc(r.title)}"></div><div class="v20-field"><label for="p40-rn-date">默書日期（可不填）</label><input id="p40-rn-date" type="date" value="${esc(r.dictationDate||'')}"></div></div><button type="button" class="btn secondary" data-p40="rename-save" data-id="${esc(r.id)}">儲存名稱和日期</button><p class="p40-why" id="p40-rn-msg" role="status" hidden></p></details></div><ul class="list">${ws.map(w=>`<li><div><strong lang="en">${esc(w.en)}</strong><div class="small muted">${esc(w.zh||'沒有中文意思')}</div></div><span>${status(mastery(w))}</span></li>`).join('')}</ul></section>`;
  if(isNew)box.scrollIntoView({block:'start'});
 };
 function renameSave(id){
  if(isLoggedIn()&&!v23ParentAllowed()){$('#app').innerHTML=v23Gate();return;}
  const r=db.ranges.find(x=>x.id===id),msg=$('#p40-rn-msg');if(!r)return;
  const title=($('#p40-rn-title')?.value||'').trim(),date=$('#p40-rn-date')?.value||'';
  const say=t=>{if(msg){msg.textContent=t;msg.hidden=!t;}};
  if(!title||title.length>120){say('名稱請用 1 至 120 個字。');return;}
  if(date&&!WQEducation.validDate(date)){say('日期格式不對，請重新選擇。');return;}
  const before=structuredClone(db);r.title=title;r.dictationDate=date;
  if(!save()){db=before;say('未能儲存。請再按一次，或先匯出備份。');return;}
  toast('已儲存名稱和日期。');render();
 }
 P40.landed=function(rid){landing={rid};go('ranges');};
 function startKid(){
  v23ParentUntil=0;                      // the device goes back to the child: no parent powers left
  startDaily();
  if(['ranges','range-new'].includes(route()))go('kid');
 }

 // ---------------------------------------------------------------- parent report (D16, D24) -------------------------------------
 reportView=function(){
  const c=activeChild(),r=latestRange(),ws=r?rangeWords(r.id):childWords();
  const as=db.attempts.filter(a=>a.childId===c?.id).sort((a,b)=>b.time.localeCompare(a.time));
  const s=statsForChild(),weak=ws.filter(weakWord);
  const sum=r?`「${esc(r.title)}」有 ${ws.length} 個單字。最近自己串對 ${s.ready} 個，要再練 ${weak.length} 個。`:'還沒有默書範圍。請先加入範圍。';
  const again=weak.length?`<button type="button" class="btn primary big" data-p40="practice-weak">再練這些字</button>`:`<button type="button" class="btn primary big" disabled>再練這些字</button><p class="p40-why">目前沒有要再練的字。</p>`;
  const typeLine=w=>weakTypes(w).map(typeName).join('、');
  return `${navTabs('report')}<div><div class="eyebrow">${esc(c?.name||'')}</div><h1>學習報告</h1><p class="muted">${sum}</p></div>
<section class="card pad p40-next"><h2>下一步</h2><p>${weak.length?`請孩子把這 ${weak.length} 個字再練一次，大約幾分鐘。`:'暫時不用特別再練。可以隔幾天再看看。'}</p>${again}</section>
<div class="stats"><div class="stat"><strong>${s.ready}/${s.total}</strong><span>最近自己串對</span></div><div class="stat"><strong>${s.weak}</strong><span>要再練的字</span></div><div class="stat"><strong>${s.due}</strong><span>該複習的字</span></div><div class="stat"><strong>${as.length}</strong><span>作答次數</span></div></div>
<div class="grid2" style="margin-top:18px"><section class="card pad"><h2>要再練的字</h2>${weak.length?`<ul class="list">${weak.slice(0,12).map(w=>`<li><div><strong lang="en">${esc(w.en)}</strong><div class="small muted">${esc(w.zh||'')}</div></div><span>${esc(typeLine(w))}<br>答錯過</span></li>`).join('')}</ul>`:'<p class="muted">暫時沒有。</p>'}</section><section class="card pad"><h2>範圍內的單字</h2>${r?`<p><strong>${esc(r.title)}</strong></p><p class="small muted">${r.dictationDate?esc(r.dictationDate):'沒有填默書日期'}</p>`:''}<ul class="list">${ws.map(w=>{const m=mastery(w);return `<li><div><strong lang="en">${esc(w.en)}</strong><div class="small muted">${esc(w.zh||'')}</div></div><span><i class="status-dot dot${m}"></i>${weakWord(w)?'要再練':status(m)}</span></li>`;}).join('')}</ul></section></div>
<section class="card pad" style="margin-top:18px"><h2>最近作答</h2><ul class="list">${as.slice(0,20).map(a=>{const w=db.words.find(x=>x.id===a.wordId);return `<li><div><strong lang="en">${esc(w?.en||a.expected)}</strong><div class="small muted">${typeName(a.type)} · ${new Date(a.time).toLocaleString('zh-HK',{month:'numeric',day:'numeric',hour:'2-digit',minute:'2-digit'})}</div></div><span>${a.correct?(a.assisted?'有提示時答對':'答對'):'再練'}</span></li>`;}).join('')||'<li class="muted">還沒有作答紀錄。</li>'}</ul></section>
<details class="card pad p40-legend" style="margin-top:18px"><summary>這些說法是甚麼意思？</summary><ul class="list"><li><strong>還沒練習</strong><span>孩子還沒答過這個字。</span></li><li><strong>選對過</strong><span>在選擇題選對過，但還沒自己串。</span></li><li><strong>有提示時答對</strong><span>看了提示或答案後答對。</span></li><li><strong>最近自己串對</strong><span>沒有提示，自己串對。</span></li><li><strong>隔日複習也串對</strong><span>隔了一天再練，仍然自己串對。</span></li></ul></details>`;
 };
 v24ReportPanel=function(){
  const a=db.attempts.filter(a=>a.childId===activeChild()?.id),v=a.filter(a=>a.evidenceV24),old=a.length-v.length;
  const count=reason=>v.filter(a=>a.evidenceV24.reason===reason&&a.correct).length;
  return `<section class="card pad v24-panel" id="v24-evidence-summary"><h2>答對的情況</h2><div class="grid2"><p>自己答對：<strong>${count('independent')}</strong> 次</p><p>剛看過答案後答對：<strong>${count('recent-answer')}</strong> 次</p><p>用提示或選項答對：<strong>${count('hint')+count('scaffold')}</strong> 次</p><p>較早的紀錄：<strong>${old}</strong> 次</p></div><p class="small muted">較早的紀錄沒有記下孩子有沒有看過提示，所以不在上面分類。答對次數不等於已經記得的字數。</p></section>`;
 };
 v24PolicyPanel=function(){
  const p=v24Policy(),c=activeChild(),pace=ED.pace(c.grade,db.settings,p.gradePacing),lock=p.rangeLocks[c.id];
  return `<section class="card pad v24-panel" id="v24-learning-policy"><h2>練習設定</h2><p>默書在這裏是練習，不是考試。你可以選大小寫要不要完全一樣。</p><div class="grid2"><label>串字的大小寫<select id="v24-grading" class="input"><option value="practice" ${p.grading!=='strict'?'selected':''}>大小寫不同也算對（預設）</option><option value="strict" ${p.grading==='strict'?'selected':''}>大小寫要完全一樣</option></select></label><label><input type="checkbox" id="v24-grade-pacing" ${p.gradePacing?'checked':''}>按年級減少每次的題數</label><label><input type="checkbox" id="v24-range-lock" ${lock?'checked':''}>固定孩子目前練習的範圍</label></div><p class="small">小${c.grade}：今日最多 ${pace.dailyMax} 題、新字最多 ${pace.dailyNew} 個。</p><p class="small">選「大小寫要完全一樣」時，大小寫不對會當作寫錯，孩子可以再試。</p><button class="btn primary" data-v24="save-policy">儲存練習設定</button></section>`;
 };

 // ---------------------------------------------------------------- parent gate (D15, D17) ------------------------------------------
 v23ParentRoutes.add('ranges');
 const LEASE=900000;
 const renew=()=>{if(isLoggedIn()&&v23ParentRoutes.has(lastRoute)&&v23ParentAllowed())v23ParentUntil=Math.max(v23ParentUntil,performance.now()+LEASE);};
 for(const ev of ['click','keydown','input','pointerdown'])document.addEventListener(ev,renew,true);
 function gateText(){
  const pw=$('#v23-parent-password');if(!pw)return;
  const sec=pw.closest('section');if(!sec)return;
  const ps=sec.querySelectorAll('p');
  const rt=route();
  if(ps[0]&&['ranges','range-new'].includes(rt))ps[0].textContent='管理默書範圍前，請先輸入家長密碼。';
  const last=ps[ps.length-1];
  if(last&&last.classList.contains('muted'))last.textContent='確認後 15 分鐘內不用再輸入，有操作會自動延長；切換孩子就會失效。這只是這部裝置上的保護，不是網上登入。';
 }
