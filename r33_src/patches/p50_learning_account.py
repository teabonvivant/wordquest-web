"""R3.3 p50 - learning and account stop-gap (N7, N6, N8, N13a).

Patched pieces (every anchor is checked to occur exactly once, see ctx.once):

  N7  required grade at registration, grade editing in the parent area
      * login view: a required <select id="register-grade"> after the child-name field
      * HOST_JS wraps registerAccount (blocks submit while no grade is chosen), newUserDb (the first
        child gets the chosen grade; guests keep demoDb grade 3) and childrenView (a "修改年級" button
        per child + inline editor).  The three new data-act values are added to v23ParentActions, and
        the save handler re-checks the parent gate and the write lease.
      * WQMathHost / math bridge read activeChild().grade on every open, so no change is needed there.
  N6  "結束這組，不領獎" while tiles are selected
      * s25 core: new WQ30Core.abandon(session, now) clears tiles/feedback and closes the session.
        validateState is NOT relaxed; the host calls the new core function.
  N8  public Admin/1234 and sandbox entry
      * WQ_LOCAL_TEST_ALLOWED is true only for file: or localhost / 127.0.0.1 / [::1]
        (WQ_TEST_MODE still needs ?mode=admin-test), __WQ_ADMIN_INFO__ only exists in the sandbox.
      * every public Admin / 1234 / sandbox-link text is removed (login, home, help, tutor, dialogs).
  N13a demo scope + guest copy
      * demoDb fills an empty zh / example of the demo words from the original demo dictionary
        (the shared lexicon pass blanks "water" because it has two senses).
      * guest copy now says that practising needs a login.

Design notes
  * The only text anchored in the original code is what has to change in place.  Behaviour that can be
    layered on top (grade form logic, children page) lives in HOST_JS, injected before the frozen
    "\\ninstallMediaEvents();\\nrender();" anchor (the anchor itself is not modified).
  * No <script> tag is added or removed and no version string is touched.
"""
import json
import re

HOST_ANCHOR = '\ninstallMediaEvents();\nrender();'

GRADE_FIELD = (
    '<div class="field" style="margin-top:12px"><label for="register-grade">小朋友年級</label>'
    '<select id="register-grade" required aria-describedby="register-grade-hint register-grade-error">'
    '<option value="" selected>請選擇年級</option>'
    + ''.join(f'<option value="{n}">小{"一二三四五六"[n - 1]}</option>' for n in range(1, 7))
    + '</select>'
    '<p class="small muted" id="register-grade-hint" style="margin:10px 0 0">'
    '幼稚園高班可選「小一」。每課詞數會按年級調整，之後可在家長區修改。</p>'
    '<p class="small" id="register-grade-error" role="alert" style="display:none;margin:8px 0 0;color:#b3261e">'
    '請先選擇年級，才可以建立帳戶。</p></div>'
)

CORE_ABANDON = r"""function abandon(s,now=Date.now()){
 obj(s);if(s.status!=='active'||s.finishedAt||!Array.isArray(s.queue)||!s.queue.length)fail('這組已經結束');
 int(now,1);int(s.startedAt,1);
 // Close the session in a state validateState accepts. Selected tiles belong to the question being left,
 // so they are cleared here; every other validation rule stays as strict as before.
 s.tiles=[];s.feedback=null;s.index=s.queue.length;s.finishedAt=Math.max(now,s.startedAt);s.status='abandoned';s.awarded=true;s.award=0;
 return s;
}
"""

HOST_ABANDON_OLD = "const live=l30Session();live.index=live.queue.length;live.finishedAt=Date.now();live.status='abandoned';live.feedback=null;live.awarded=true;live.award=0;}"
HOST_ABANDON_NEW = "const live=l30Session();L30.abandon(live,Date.now());}"

HOST_JS = r"""
/* R3.3 p50: registration grade (N7). Wraps registerAccount / newUserDb / childrenView; see p50_learning_account.py. */
(function(){
 'use strict';
 const GRADES=[1,2,3,4,5,6],ZH=['一','二','三','四','五','六'];
 let pendingGrade=0,editingChild='';

 // ---- required grade at registration -------------------------------------------------------------
 function gradeError(sel){
  sel.setAttribute('aria-invalid','true');
  const e=$('#register-grade-error');if(e)e.style.display='block';
  toast('請先選擇小朋友的年級。','bad');
  try{sel.scrollIntoView({block:'nearest'});sel.focus({preventScroll:true});}catch(_){}
 }
 function clearGradeError(){
  const sel=$('#register-grade');if(sel)sel.removeAttribute('aria-invalid');
  const e=$('#register-grade-error');if(e)e.style.display='none';
 }
 const priorRegister=registerAccount;
 registerAccount=async function(){
  const sel=$('#register-grade');
  if(!sel)return priorRegister.apply(this,arguments);
  const g=Number(sel.value);
  if(!GRADES.includes(g)){gradeError(sel);return;}
  clearGradeError();
  pendingGrade=g;
  try{return await priorRegister.apply(this,arguments);}finally{pendingGrade=0;}
 };
 const priorNewUserDb=newUserDb;
 newUserDb=function(){
  const d=priorNewUserDb.apply(this,arguments);
  if(pendingGrade&&d&&Array.isArray(d.children)&&d.children[0])d.children[0].grade=pendingGrade;
  return d;
 };
 document.addEventListener('change',e=>{if(e.target&&e.target.id==='register-grade')clearGradeError();});

 // ---- parent area: change a child's grade --------------------------------------------------------
 for(const a of ['show-grade-edit','save-child-grade','cancel-grade-edit'])v23ParentActions.add(a);
 const css=document.createElement('style');css.id='wq33-p50-style';
 css.textContent='.child-card{flex-wrap:wrap}@media(max-width:520px){.child-card .actions-inline{width:100%}}'
  +'.wq33-grade-edit{margin-top:-4px}.wq33-grade-edit .actions-inline{margin-top:12px}'
  +'.wq33-grade-edit .btn,.child-card [data-act="show-grade-edit"]{min-height:44px}';
 document.head.appendChild(css);

 function editorHtml(c){
  return `<section class="card pad wq33-grade-edit" id="wq33-grade-editor" data-child="${esc(c.id)}" aria-label="修改年級">`
   +`<div class="field" style="margin-top:0"><label for="wq33-grade-select">${esc(c.name)} 的年級</label>`
   +`<select id="wq33-grade-select">${GRADES.map(n=>`<option value="${n}" ${n===c.grade?'selected':''}>小${ZH[n-1]}</option>`).join('')}</select></div>`
   +`<p class="small muted" style="margin:10px 0 0">每課詞數會按年級調整。已經開始的小課不會改變。</p>`
   +`<div class="actions-inline">${btn('儲存','save-child-grade','primary',`data-id="${esc(c.id)}"`)}${btn('取消','cancel-grade-edit','quiet')}</div></section>`;
 }
 function gradeButton(c){return btn('修改年級','show-grade-edit','soft',`data-id="${esc(c.id)}"`);}
 function decorateChildren(html){
  const t=document.createElement('template');t.innerHTML=html;
  const cards=[...t.content.querySelectorAll('.child-card')],kids=db.children||[];
  let placed=0;
  if(cards.length===kids.length)cards.forEach((card,i)=>{
   const c=kids[i],box=card.querySelector('.actions-inline');
   if(!box)return;
   box.insertAdjacentHTML('afterbegin',gradeButton(c));placed++;
   if(editingChild===c.id)card.insertAdjacentHTML('afterend',editorHtml(c));
  });
  if(placed!==kids.length){
   // Fallback when the card markup is not recognised: a separate, self-contained block.
   const old=t.content.querySelector('#wq33-grade-fallback');if(old)old.remove();
   const box=document.createElement('section');box.id='wq33-grade-fallback';box.className='card pad';box.style.marginTop='18px';
   box.innerHTML='<h2>修改年級</h2>'+kids.map(c=>`<div class="row between" style="margin:10px 0"><span>${esc(c.name)} · 小${ZH[c.grade-1]||c.grade}</span>${gradeButton(c)}</div>${editingChild===c.id?editorHtml(c):''}`).join('');
   t.content.appendChild(box);
  }
  return t.innerHTML;
 }
 const priorChildrenView=childrenView;
 childrenView=function(){
  const html=priorChildrenView.apply(this,arguments);
  try{return decorateChildren(html);}catch(_){return html;}
 };
 window.addEventListener('hashchange',()=>{editingChild='';});
 // Any other action (switch child, log out, add/delete a child...) closes a half-open editor before it re-renders.
 document.addEventListener('click',e=>{
  const a=e.target&&e.target.closest?e.target.closest('[data-act]'):null;
  if(a&&editingChild&&!['show-grade-edit','save-child-grade','cancel-grade-edit'].includes(a.dataset.act))editingChild='';
 },true);
 document.addEventListener('click',e=>{
  const b=e.target&&e.target.closest?e.target.closest('[data-act="show-grade-edit"],[data-act="save-child-grade"],[data-act="cancel-grade-edit"]'):null;
  if(!b)return;
  e.preventDefault();
  const act=b.dataset.act;
  if(!isLoggedIn()){go('login');return;}
  // The capture-phase v23 guard already blocks these actions without the parent gate / write lease;
  // this re-check keeps the handler safe if it is ever reached another way.
  if(!v24RequireParent(act==='save-child-grade'))return;
  if(act==='show-grade-edit'){
   if(!(db.children||[]).some(c=>c.id===b.dataset.id))return;
   editingChild=b.dataset.id;render();
   setTimeout(()=>{const s=$('#wq33-grade-select');if(s)s.focus();},0);return;
  }
  if(act==='cancel-grade-edit'){editingChild='';render();return;}
  const id=b.dataset.id||editingChild,c=(db.children||[]).find(x=>x.id===id),g=Number($('#wq33-grade-select')?.value);
  if(!c||!GRADES.includes(g)){toast('請選擇年級。','bad');return;}
  if(g===c.grade){editingChild='';render();return;}
  const old=structuredClone(db);
  c.grade=g;
  if(!save()){db=old;toast('未能儲存年級，請稍後再試。','bad');return;}
  editingChild='';
  toast(`已將${c.name}改為小${ZH[g-1]}。每課詞數會按年級調整。`);
  render();
 });
})();
"""


def _demo_fallback(s):
    """Build {word: {zh, ex}} for the demo word list from the ORIGINAL demo dictionary in the page source."""
    d0 = s.index('const dictionary={')
    d1 = s.index('\n};', d0)
    block = s[d0:d1]
    entries = {m.group(1): {'zh': m.group(2), 'ex': m.group(3)}
               for m in re.finditer(r"(\w+):\{zh:'([^']*)',emoji:'[^']*',ex:'([^']*)'\}", block)}
    f0 = s.index('function demoDb(')
    lm = re.search(r"const list=\[([^\]]*)\];", s[f0:f0 + 1500])
    words = re.findall(r"'([a-z]+)'", lm.group(1))
    assert len(words) == 12, words
    missing = [w for w in words if w not in entries]
    assert not missing, f'demo words without an original dictionary entry: {missing}'
    return {w: entries[w] for w in words}


def apply(s, ctx):
    once = ctx.once

    # ---- N7: grade field on the registration form -----------------------------------------------
    a = '<div class="field" style="margin-top:12px"><label>小朋友名稱</label><input id="register-child" placeholder="例如：樂樂"></div>'
    s = once(s, a, a + GRADE_FIELD)

    # ---- N6: core abandon() + host call ---------------------------------------------------------
    s = once(s, "function pace(grade){return [0,2,3,4,4,5,5][grade]||3;}",
             "function pace(grade){return [0,2,3,4,4,5,5][grade]||3;}\n" + CORE_ABANDON)
    s = once(s, "eligible,validateState};", "eligible,validateState,abandon};")
    s = once(s, HOST_ABANDON_OLD, HOST_ABANDON_NEW)

    # ---- N8: local-only sandbox gate and removal of public Admin/1234 text ----------------------
    s = once(s, "const WQ_LOCAL_TEST_ALLOWED=['file:','http:','https:'].includes(location.protocol);",
             "const WQ_LOCAL_TEST_ALLOWED=location.protocol==='file:'||['localhost','127.0.0.1','[::1]','::1'].includes(location.hostname);")
    s = once(s, "window.__WQ_ADMIN_INFO__=Object.freeze({version:21,",
             "if(WQ_TEST_MODE)window.__WQ_ADMIN_INFO__=Object.freeze({version:21,")
    s = once(s, "return WQ_LOCAL_TEST_ALLOWED?`<a class=\"btn ${cls}\" data-wq29-mode href=\"${esc(wq29ModeURL(true))}\">${esc(label)}</a>`:'';",
             "return '';")
    s = once(s, "測試管理員使用預設 Admin 帳號。", "")
    s = once(s, ".replace('V23 標準版沒有預設管理員。','一般家庭登入不使用公開 Admin；測試請按「管理員測試登入」。')",
             ".replace('V23 標準版沒有預設管理員。','')")
    s = once(s, "if(!isTestAdmin())return `<section class=\"card pad\"><h1>管理員測試</h1><p>請先進入本機測試環境，再用 Admin／1234 登入。</p>${WQ_TEST_MODE?link('管理員測試登入','login','primary'):wq29AdminLink('管理員測試登入','primary')}</section>`;",
             "if(!isTestAdmin())return WQ_TEST_MODE?`<section class=\"card pad\"><h1>管理員測試</h1><p>請先進入本機測試環境，再用 Admin／1234 登入。</p>${link('管理員測試登入','login','primary')}</section>`:`<section class=\"card pad\"><h1>找不到這個頁面</h1><p>這個頁面不存在，請返回首頁。</p>${link('返回首頁','kid','primary')}</section>`;")
    s = once(s, "toast(WQ_LOCAL_TEST_ALLOWED?'請按「管理員測試登入」，以 Admin／1234 進入獨立測試環境。':'Admin／1234 只供本機測試，公開網站不開放這個帳戶。','bad');return;",
             "toast('這個帳戶名稱不能使用，請改用自己建立的家庭帳戶。','bad');return;")
    s = once(s, "<h2>帳戶與測試</h2><p>Admin／1234 是獨立示範帳戶，不是真正站長密碼。一般家庭請建立自己的帳戶，定期下載備份。</p>${l30Link('登入或進入測試區','login')}",
             "<h2>帳戶與備份</h2><p>一般家庭請建立自己的帳戶，並定期下載備份。</p>${l30Link('登入或建立帳戶','login')}")
    s = once(s, "if(route==='login'&&!$('#l30-test-entry')){", "if(WQ_TEST_MODE&&route==='login'&&!$('#l30-test-entry')){")
    s = once(s, "l30ShowDialog('Admin 是測試帳戶','普通家庭登入不會使用這個公開密碼。請進入獨立測試區後，再輸入 Admin／1234。',`<a class=\"l30-btn primary\" data-wq29-mode href=\"${esc(wq29ModeURL(true))}\">進入獨立測試區</a>`);",
             "l30ShowDialog('這個帳戶名稱不能使用','請改用自己建立的家庭帳戶登入；第一次使用請先建立帳戶。');")
    s = once(s, "<p class=\"l30-subtle\">管理員測試請使用登入頁的「獨立測試區」。</p>", "")
    s = once(s, "我是烈烈老師。先登入自己的帳戶，就可以跟學習夥伴一起開始；獨立測試區不會改動正式紀錄。",
             "我是烈烈老師。先登入自己的帳戶，就可以跟學習夥伴一起開始。")

    # ---- N13a: guest copy matches behaviour (practising needs a login) --------------------------
    s = once(s, "'未登入 · 可以先參觀'", "'未登入 · 登入後開始練習'")
    s = once(s, "答錯不扣金幣。</p>`:''}</div>${l30Art('owl','l30-art')}</section>",
             "答錯不扣金幣。</p>`:'<p class=\"l30-subtle\" id=\"wq33-guest-note\">練習需要先登入；先參觀不會儲存進度。</p>'}</div>${l30Art('owl','l30-art')}</section>")
    s = once(s, "<strong>訪客都可以做問題</strong><div class=\"small\">但答題紀錄、金幣同遊戲進度唔會儲存。",
             "<strong>練習需要先登入</strong><div class=\"small\">先參觀不會儲存答題紀錄、金幣或遊戲進度。")
    s = once(s, "訪客可以做題，但唔儲答題紀錄、金幣或設定。", "練習需要先登入；先參觀不會儲存答題紀錄、金幣或設定。")

    # ---- N13a: demo scope words keep zh + example --------------------------------------------------
    fb = json.dumps(_demo_fallback(s), ensure_ascii=False, separators=(',', ':'))
    s = once(s, "function demoDb(childName='小明'){\n",
             "function wq33FillDemo(d){\n const fb=" + fb + ";\n"
             " for(const w of d.words||[]){const f=fb[w.en];if(!f)continue;if(!w.zh)w.zh=f.zh;if(!w.example)w.example=f.ex;}\n return d;\n}\n"
             "function demoDb(childName='小明'){return wq33FillDemo(wq33DemoDbBase(childName));}\n"
             "function wq33DemoDbBase(childName='小明'){\n")

    # ---- host script (before the frozen test-injection anchor, which stays untouched) -----------
    s = once(s, HOST_ANCHOR, '\n' + HOST_JS + HOST_ANCHOR)
    return s
