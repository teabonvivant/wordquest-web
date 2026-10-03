"""R3.5 p20 - English lesson loop: answer / feedback / hints / result page / lesson navigation.

Issues handled: S1-03, S1-04, S2-14, S2-20, S3-08, S3-12, S3-13, S3-14, S3-15, S2-07 (lesson pages only), S2-02 (lesson pages only).

Design rules for this module
  * Every text change is a SURGICAL, in-place edit of the original template (ctx.once on a code anchor). Original strings that
    are not part of an issue stay exactly where they were, so the later copy pass (p90, exact-match rewrite from CSV) still finds them once.
  * New strings never repeat an old string. One known exception: the owner-mandated button 去遊戲街機 contains the substring 街機, so the
    copy pass must match whole string literals (not substrings) for the row 街機 -> 遊戲, or it would turn this button into 去遊戲遊戲.
  * New behaviour lives in one host script block (HOOK_JS) that is inserted just before the test-injection anchor; it only wraps
    render() / l30Submit() / l31Submit() and adds two document listeners. No <script> tag is added.
  * The header / nav chrome belongs to module p10 and is not touched here.

Patched pieces
  * </head>                                   + <style id="p20-lesson">
  * "\\ninstallMediaEvents();\\nrender();"       + host block (anchor text kept)
  * l30Commit / l30Draft / l31Commit / l31Checkpoint / l31Draft   save-failure flag, no duplicate toast inside a lesson
  * l30Choices, l30Learning, l30Finished, l30 click handler       option marks, feedback card, hint, menu, result buttons
  * l31Learn, l31Done, l31 click handler                          same vocabulary for the word-workshop lesson
  * companion card (voice button label, hint aria-label)          help entrance is called 怎樣玩？
  * l30Report                                                     one parent-only sentence about hints
"""

CSS = r"""<style id="p20-lesson">
/* R3.5 p20: lesson loop (additive; see r35_src/patches/p20_lesson.py) */
.l30-quiz,.l31-lesson{position:relative}

/* S3-14: the "give up" action lives in a small menu at the top right (DOM-last, so Tab reaches it after the main actions). */
.p20-top{padding-right:56px}
.p20-more{position:absolute;top:0;right:0;z-index:12}
.p20-more>summary{list-style:none;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;width:46px;height:46px;border-radius:13px;border:1px solid #b8ccca;background:#fff;color:#21364c;font:800 24px/1 Arial,sans-serif;user-select:none}
.p20-more>summary::-webkit-details-marker{display:none}
.p20-more>summary::marker{content:""}
.p20-more[open]>summary{background:#e7f4ed}
.p20-more-panel{position:absolute;right:0;top:calc(100% + 6px);min-width:160px;background:#fff;border:1px solid #d9e4e4;border-radius:14px;box-shadow:0 12px 30px #0003;padding:8px}
.p20-more-panel .l30-btn{width:100%;white-space:nowrap}
.l30-btn.p20-danger{color:#a3281a;border-color:#d99a92;background:#fff4f2}

/* S1-03: "no answer yet" is a hint next to the answer area, never a warning bar. */
.l30-inline-hint{margin:12px 0 0;padding:10px 14px;border-radius:12px;background:#fff6df;border:1px solid #eddbac;color:#5b4310;font-size:15px;line-height:1.6;text-align:left}
.l30-inline-hint:empty{display:none}
.p20-nw{white-space:nowrap}
/* S1-03: a real save failure is a sticky warning that says what happened and what to do. */
.l30-alert.p20-savefail{position:sticky;top:var(--p20-hdr,0px);z-index:19;display:grid;gap:4px;box-shadow:0 6px 18px #0002}
.p20-savefail strong{font-size:17px}
.p20-savefail .l30-btn{justify-self:start;margin-top:6px}

/* S1-04: options are marked by words and borders, not by colour alone. */
.l30-root .l30-choice.p20-answer,.l30-root .l30-choice.p20-retry{opacity:1}
.l30-qcard .l30-choice.p20-answer{border:4px solid #1b7d4b;background:#e2f5e9;box-shadow:none;color:#14502f}
.l30-qcard .l30-choice.p20-retry{border:3px dashed #d97a1f;background:#fff4e5;box-shadow:none;color:#6d3a0a}
.p20-tag{display:block;margin-top:4px;font:800 14px/1.3 system-ui,-apple-system,"Noto Sans TC","PingFang HK","Microsoft JhengHei",sans-serif;letter-spacing:0}
.l30-feedback b{font-size:1.15em}

/* Toasts inside a lesson sit at the top, so they never cover the main button at the bottom. */
body[data-wq33-route="learning"] #toast,body[data-wq33-route="assembly-learn"] #toast{top:calc(env(safe-area-inset-top,0px) + 10px)!important;bottom:auto!important}

/* S2-02: the main button stays on screen. Phones in portrait already have a sticky bar (R3.3); wider or shorter screens get it too. */
@media (min-width:521px),(max-height:500px){
 .l30-quiz .l30-quizactions,.l31-lesson .l31-actions{position:sticky;bottom:0;z-index:6;background:#f7f9f5f5;padding:10px 0;margin:10px 0;justify-content:flex-start}
 .l30-quiz .l30-quizactions .l30-btn.primary,.l31-lesson .l31-actions .l30-btn.primary{flex:0 1 280px}
}
@media (max-height:500px){
 .l30-quiz .l30-qcard{min-height:0;padding:12px 18px}
 .l30-quiz .l30-qcard .l30-qimage{height:64px;width:64px;margin:4px auto}
 .l30-quiz .l30-prompt{font-size:20px;margin:6px 0}
 .l30-quiz .l30-bigword{margin:6px 0!important}
 .l30-quiz .l30-choicegrid{margin:10px 0}
 .l30-quiz .l30-choice{min-height:52px;padding:8px}
 .l30-quiz .l30-topline,.l31-lesson .l30-topline{margin-bottom:8px}
 .l30-quiz .l30-progress,.l31-lesson .l30-progress{margin:6px 0}
 .l30-quiz .wq32-guide>.wq32-image,.l31-lesson .wq32-guide>.wq32-image{height:46px;width:38px;flex-basis:38px}
 .l30-quiz .wq32-guide,.l31-lesson .wq32-guide{padding:6px 12px;margin:8px 0}
 .l31-lesson .l31-workbench{padding:14px 18px}
}
</style>
"""

# --- host block ------------------------------------------------------------------------------------
HOOK_JS = r"""
/* R3.5 p20: English lesson loop (host code, runs in the main script scope). Helpers are function declarations so the
   in-place template edits above can call them; behaviour wiring is inside the IIFE at the bottom. */
let p20SF=false,p20SF31=false,p20Key='',p20FbKey='';
function p20Letters(form){
 const words=String(form||'').trim().split(/\s+/);
 if(!words.length||!words.every(x=>/^[A-Za-z]+$/.test(x))||words.join('').length>14)return '';
 return words.map(x=>[...x].join('－')).join('　');
}
function p20Said(fb){return '答案是 <b lang="en">'+esc(fb.expected)+'</b>。';}
function p20Why(q,w,fb,why){
 if(fb.technical||q.mode==='study'||fb.caseOnly)return '<p>'+why+'</p>';
 if(fb.correct)return '';
 let line='';
 if(q.mode==='missing')line='整個字是 <b lang="en">'+esc(w.form)+'</b>。';
 else if(!['focus','sort'].includes(q.mode)){const sp=p20Letters(w.form);if(sp)line='一起看：<span lang="en">'+esc(sp)+'</span>。';}
 return line?'<p>'+line+'</p>':'';
}
function p20Mark(s,v){
 const fb=s.feedback;if(!fb||fb.technical)return {cls:'',tag:''};
 if(v===fb.expected)return {cls:' p20-answer',tag:'<span class="p20-tag"><span aria-hidden="true">✓ </span>答案</span>'};
 if(v===s.selected)return {cls:' p20-retry',tag:'<span class="p20-tag">再看看</span>'};
 return {cls:'',tag:''};
}
function p20HintText(w){
 const f=String(w.form||''),first=[...f].find(c=>/[A-Za-z]/.test(c))||f[0]||'',n=[...f].filter(c=>/[A-Za-z]/.test(c)).length,k=f.trim().split(/\s+/).length;
 return '提示：第一個字母是 '+esc(first)+'，一共 '+n+' 個字母'+(k>1?'，分成 '+k+' 個字':'')+'。';
}
function p20Steps(s){
 const total=s.queue.length,study=s.queue.filter(q=>q.mode==='study').length;
 return study?'<p class="l30-muted">這一組共 '+total+' 步：'+study+' 步學新詞，'+(total-study)+' 步做題。</p>':'';
}
function p20Alert(msg,saveFail,kind){
 if(!saveFail)return '<div class="l30-alert" role="alert">'+esc(msg)+'</div>';
 const btn=kind==='l31'?B31('再試一次','save','','small'):l30Button('再試一次','retry-save','','small');
 return '<div class="l30-alert p20-savefail" role="alert"><strong>這次沒能儲存進度。</strong><span>請先不要關閉這一頁，按「再試一次」。</span><span>如果還是不行，請家長到「家長」→「設定／備份」下載備份。</span>'+btn+'</div>';
}
function p20Menu(kind){
 const item=kind==='l31'?B31('放棄這組','abandon','','small p20-danger'):l30Button('放棄這組','abandon','','small p20-danger');
 return '<details class="p20-more"><summary aria-label="更多" title="更多">⋯</summary><div class="p20-more-panel">'+item+'</div></details>';
}
// Keep an element clear of the sticky header (top) and of the bottom action bar / fixed nav (bottom).
function p20Reveal(el){
 if(!el)return;
 const r=el.getBoundingClientRect(),pos=n=>n?getComputedStyle(n).position:'';
 let top=0,bottom=innerHeight;
 const hdr=document.querySelector('.header');if(hdr&&['sticky','fixed'].includes(pos(hdr)))top=Math.max(0,hdr.getBoundingClientRect().bottom);
 const bar=document.querySelector('.l30-quizactions,.l31-actions');if(bar&&['sticky','fixed'].includes(pos(bar)))bottom=Math.min(bottom,bar.getBoundingClientRect().top);
 const nav=document.getElementById('wq29-nav');if(nav&&pos(nav)==='fixed')bottom=Math.min(bottom,nav.getBoundingClientRect().top);
 let dy=0;
 if(r.bottom>bottom-8)dy=r.bottom-(bottom-8);
 if(r.top-dy<top+8)dy=r.top-(top+8);
 if(Math.abs(dy)>1)window.scrollBy(0,dy);
}
function p20ShowEmpty(id,msg,focusSel){
 const el=document.getElementById(id);if(!el)return;
 el.innerHTML=msg;p20Reveal(el);
 if(focusSel)try{document.querySelector(focusSel)?.focus({preventScroll:true});}catch(_){}
}
function p20Say(what){return what+'，再按<span class="p20-nw">「提交答案」</span>。不肯定也可以試一個，答錯不扣金幣。';}
(function(){
 'use strict';
 const noticeText=()=>isLoggedIn()?'今天還沒開始，按「開始今天的小課」。':'今天還沒開始。先登入，再按「開始今天的小課」。';
 // S2-14 + scroll / feedback handling after every paint.
 const priorRender=render;
 render=function(){
  try{
   const route=(location.hash||'#kid').slice(1).split('?')[0];
   if(route==='learn'){
    const s=db.session,c=activeChild();
    if(!s||!c||s.childId!==c.id){
     // A running l30 / l31 practice is the real "current practice": go there quietly. Otherwise go home with a plain notice.
     let live='';try{live=l30Session()?'learning':l31Session()?'assembly-learn':'';}catch(_){}
     try{history.replaceState(null,'','#'+(live||'kid'));}catch(_){location.hash='#'+(live||'kid');}
     if(!live)try{toast(noticeText());}catch(_){}
    }
   }
  }catch(_){}
  const out=priorRender.apply(this,arguments);
  try{p20After();}catch(e){try{console.error('R3.5 p20:',e);}catch(_){}}
  return out;
 };
 function p20Hdr(){
  // The save-failure card sticks just under the sticky page header, never on top of it.
  try{const h=document.querySelector('.header');
   const st=h?getComputedStyle(h).position:'';
   document.documentElement.style.setProperty('--p20-hdr',(st==='sticky'||st==='fixed'?Math.round(h.getBoundingClientRect().height):0)+'px');}catch(_){}
 }
 window.addEventListener('resize',p20Hdr);
 function p20After(){
  p20Hdr();
  const route=lastRoute;
  if(route!=='learning'&&route!=='assembly-learn'){p20Key='';p20FbKey='';return;}
  const s=route==='learning'?l30Session():l31Session();
  if(!s)return;
  const key=route+':'+s.id+':'+s.index;
  if(key!==p20Key){p20Key=key;p20FbKey='';window.scrollTo(0,0);}
  const fb=document.querySelector(route==='learning'?'.l30-feedback':'.l31-feedback');
  if(fb&&p20FbKey!==key){
   p20FbKey=key;p20Reveal(fb);
   // Say the answer aloud after a wrong answer (reuses the workshop's English voice helper; follows the 聲效 switch).
   if(route==='learning'&&s.feedback&&s.feedback.correct===false&&!s.feedback.technical){
    try{const q=s.queue[s.index],w=LIB30.words.get(q.target);
     if(w&&!['focus','sort'].includes(q.mode)&&sfxEnabled()&&!document.hidden)l31Speak(w.form);}catch(_){}
   }
  }
 }
 // S1-03: an empty answer never reaches the save path.
 const priorSubmit=l30Submit;
 l30Submit=function(technical=false){
  if(technical!==true){
   const s=l30Session();
   if(s&&!s.feedback&&!l30Busy&&!l30Composing&&l30CanWrite()){
    const q=s.queue[s.index];
    if(q&&q.mode!=='study'){
     let a;if(q.choices)a=s.selected;else if(q.mode==='tiles')a=s.tiles.length?'x':'';else a=($('#l30-answer')?.value??s.draft);
     if(L30.clean(a)===''){
      const what=q.choices?'先選一個答案':q.mode==='tiles'?'先按字塊排出答案':q.mode==='missing'?'先填上缺少的字母':'先輸入答案';
      p20ShowEmpty('l30-answer-hint',p20Say(what),q.choices||q.mode==='tiles'?'':'#l30-answer');
      return;
     }
    }
   }
  }
  return priorSubmit.apply(this,arguments);
 };
 const priorSubmit31=l31Submit;
 l31Submit=function(){
  const s=l31Session();
  if(s&&!s.feedback&&!l31Busy&&!l31Composing&&l30CanWrite()){
   const q=s.queue[s.index];
   if(q&&(q.step==='meaning'||q.step==='recall')){
    const a=q.step==='recall'?($('#l31-answer')?.value??s.draft):s.draft;
    if(L30.clean(a)===''){p20ShowEmpty('l31-answer-hint',p20Say(q.step==='meaning'?'先選一個答案':'先輸入答案'),q.step==='recall'?'#l31-answer':'');return;}
   }
  }
  return priorSubmit31.apply(this,arguments);
 };
 // Typing clears the hint again.
 document.addEventListener('input',e=>{
  if(e.target.id==='l30-answer'||e.target.id==='l31-answer'){const h=document.getElementById(e.target.id.replace('answer','answer-hint'));if(h)h.textContent='';}
 });
 // The top-right menu closes when something else is tapped, after a choice, or on Escape; a successful retry says so.
 document.addEventListener('click',e=>{
  const t=e.target;if(!t||!t.closest)return;
  const open=document.querySelector('.p20-more[open]');
  if(open&&!open.contains(t))open.removeAttribute('open');
  const b=t.closest('[data-l30],[data-l31]');
  if(open&&b&&open.contains(b))open.removeAttribute('open');
  if(b&&b.dataset.l30==='retry-save'&&!l30Error&&!l30Dirty)toast('已儲存。');
  if(b&&b.dataset.l31==='save'&&!l31Error&&!l31Dirty)toast('已儲存。');
 });
 document.addEventListener('keydown',e=>{
  if(e.key!=='Escape')return;
  const o=document.querySelector('.p20-more[open]');
  if(o){o.removeAttribute('open');try{o.querySelector('summary').focus();}catch(_){}}
 });
})();
"""

PARENT_NOTE = "<p>答對時，如果用了提示、字塊或選項，或者剛看過答案，只算練習，不算「自己串對」。</p>"


def apply(s, ctx):
    once = ctx.once
    # --- CSS and host block -----------------------------------------------------------------------
    s = once(s, '</head>', CSS + '</head>')
    anchor = '\ninstallMediaEvents();\nrender();'
    s = once(s, anchor, '\n' + HOOK_JS + anchor)

    # --- save-failure flag; no duplicate toast while the lesson shows its own warning (S1-03) -----------
    s = once(s, "if(!save())throw Error(persistenceIssue||'未能儲存');committed=true;l30Dirty=false;l30Error='';}",
             "p20SF=false;if(!save()){p20SF=true;throw Error(persistenceIssue||'未能儲存');}committed=true;l30Dirty=false;l30Error='';}")
    s = once(s, "catch(e){if(!committed)db=before;l30Error=e.message;l30Dirty=true;toast('未完成：'+e.message,'bad');}",
             "catch(e){if(!committed)db=before;l30Error=e.message;l30Dirty=true;if(!(redraw&&lastRoute==='learning'))toast('未完成：'+e.message,'bad');}")
    s = once(s, "else l30Error='答案仍在本頁，未成功保存。請勿關閉。';",
             "else{p20SF=true;l30Error='答案仍在本頁，未成功保存。請勿關閉。';}")
    s = once(s, "try{if(owner!==l30Owner())throw Error('孩子已切換');fn();if(!save())throw Error(persistenceIssue||'未能儲存');committed=true;l31Error='';}",
             "p20SF31=false;try{if(owner!==l30Owner())throw Error('孩子已切換');fn();if(!save()){p20SF31=true;throw Error(persistenceIssue||'未能儲存');}committed=true;l31Error='';}")
    s = once(s, "catch(e){if(!committed)db=before;l31Error=e.message;toast('未完成：'+e.message,'bad');}",
             "catch(e){if(!committed)db=before;l31Error=e.message;if(p20SF31)l31Dirty=true;if(!(redraw&&lastRoute==='assembly-learn'))toast('未完成：'+e.message,'bad');}")
    s = once(s, "if(!l30CanWrite()||!save()){l31Error='尚有未儲存的字塊或答案。請重試儲存，不要關閉本頁。';",
             "if(!l30CanWrite()||!save()){p20SF31=true;l31Error='尚有未儲存的字塊或答案。請重試儲存，不要關閉本頁。';")
    s = once(s, "else if(!l31Composing)l31Error='草稿仍在本頁，尚未儲存。';",
             "else if(!l31Composing){p20SF31=true;l31Error='草稿仍在本頁，尚未儲存。';}")

    # --- l30Choices: mark the answer and the wrong pick without colour alone (S1-04) ------------------
    s = once(s, """${q.choices.map((v,i)=>`<button type="button" class="l30-choice" data-l30="choose" data-index="${i}" aria-pressed="${s.selected===v}" ${s.feedback?'disabled':''}>${esc(v)}</button>`).join('')}""",
             """${q.choices.map((v,i)=>{const m=p20Mark(s,v);return `<button type="button" class="l30-choice${m.cls}" data-l30="choose" data-index="${i}" aria-pressed="${s.selected===v}" ${s.feedback?'disabled':''}>${esc(v)}${m.tag}</button>`;}).join('')}""")

    # --- l30Learning --------------------------------------------------------------------------------
    # S3-12: the listen buttons carry the speaker the sentences talk about; the word step says 聽讀音.
    s = once(s, ">聽整字讀音</button>", ">🔊 聽讀音</button>")
    s = once(s, "${s.replays?'再聽一次':'聽英文讀音'}", "${s.replays?'🔊 再聽一次':'🔊 聽英文讀音'}")
    # S2-20: kid-friendly hint; S1-03: live region for "no answer yet" next to the answer area.
    s = once(s, "if(s.hinted&&!fb)body+=`<div class=\"l30-note\">提示：${esc(w.form[0])}…　共有 ${w.form.length} 個字元。本題會記作有提示的練習。</div>`;",
             "if(q.mode!=='study'&&!fb)body+='<p class=\"l30-inline-hint\" id=\"l30-answer-hint\" role=\"status\" aria-live=\"polite\"></p>';"
             "if(s.hinted&&!fb)body+=`<div class=\"l30-note\">${p20HintText(w)}</div>`;")
    # S1-04 / S2-20: feedback card. Right: 答對了！ only. Wrong: 答案是 x。 plus one helpful line from the data.
    s = once(s, "fb.correct?'答對了':'一起訂正'}</strong><p>${why}</p>${!fb.technical&&q.mode!=='study'?`<p>正確答案：<b lang=\"en\">${esc(fb.expected)}</b></p>`:''}</div>`;}",
             "fb.correct?'答對了！':p20Said(fb)}</strong>${p20Why(q,w,fb,why)}</div>`;}")
    s = once(s, "l30Button(s.index+1===s.queue.length?'完成這一組':'下一步','next','','primary')",
             "l30Button(s.index+1===s.queue.length?'完成這一組':'下一題','next','','primary')")
    # Save failure vs. other errors (S1-03).
    s = once(s, "${l30Error?`<div class=\"l30-alert\" role=\"alert\">${esc(l30Error)} ${l30Button('重試儲存','retry-save','','small')}</div>`:''}",
             "${l30Error?p20Alert(l30Error,p20SF,'l30'):''}")
    # S2-02 / S3-14: top line leaves room for the menu; the give-up action leaves the thumb row (S3-13: DOM-last).
    s = once(s, "<section class=\"l30-quiz\"><div class=\"l30-topline\"><a href=\"#kid\" class=\"l30-back\">",
             "<section class=\"l30-quiz\"><div class=\"l30-topline p20-top\"><a href=\"#kid\" class=\"l30-back\">")
    s = once(s, "<div class=\"l30-row\">${l30Button('結束這組，不領獎','abandon','','quiet small')}<span class=\"l30-subtle\">${l30Dirty?'尚未保存 · 請勿關閉分頁':'題號和草稿會保存。手機 Enter 不會在選字途中提交。'}</span></div></section>`;",
             "<div class=\"l30-row\"><span class=\"l30-subtle\">${l30Dirty?'尚未保存 · 請勿關閉分頁':(!q.choices&&q.mode!=='tiles'&&q.mode!=='study'?'題號和草稿會保存。手機 Enter 不會在選字途中提交。':'進度會自動儲存。')}</span></div>${p20Menu('l30')}</section>`;")

    # --- result page (S2-20, S3-08) ------------------------------------------------------------------
    s = once(s, "${good}／${a.length-technical} 題答對${technical?' · '+technical+' 題待補聽':''}。不要求全對，也不扣走已有金幣。</p>",
             "做了 ${a.length-technical} 題，答對 ${good} 題${technical?' · '+technical+' 題待補聽':''}。不用全對，也不會扣掉已有的金幣。</p>${p20Steps(s)}")
    s = once(s, "${l30Link('回首頁','kid','primary')}${l30Link('看看遊戲目標','game')}${l30Link('選另一組詞','classroom')}",
             "${l30Link('再練一組','classroom','primary')}${l30Link('去遊戲街機','game')}${l30Link('回首頁','kid')}")

    # --- give-up confirm (kept, new wording) ---------------------------------------------------------
    s = once(s, "confirm('結束這組，不派完成獎勵。已作答的紀錄會保留，下一次可另選一組。')",
             "confirm('放棄這一組嗎？不會得到完成獎勵。已答的紀錄會保留，下次可以另選一組。')")
    s = once(s, "confirm('結束這組，不派完成獎勵；已作答紀錄仍保留。')",
             "confirm('放棄這一組嗎？不會得到完成獎勵。已答的紀錄會保留，下次可以另選一組。')")

    # --- l31Learn (word workshop lesson): same vocabulary and structure -------------------------------
    s = once(s, "<section class=\"l31-lesson\"><div class=\"l30-topline\">", "<section class=\"l31-lesson\"><div class=\"l30-topline p20-top\">")
    s = once(s, "B31('怎樣操作？','help','','small')", "B31('怎樣玩？','help','','small')")
    s = once(s, "${l31Error?`<div class=\"l30-alert\" role=\"alert\">${esc(l31Error)} ${B31('重試儲存','save','','small')}</div>`:''}",
             "${l31Error?p20Alert(l31Error,p20SF31,'l31'):''}")
    s = once(s, "${B31('結束這組，不領獎','abandon','','quiet small')}", "")
    s = once(s, "才可領本組獎勵。</p></section>`;", "才可領本組獎勵。</p>${p20Menu('l31')}</section>`;")
    s = once(s, "<p id=\"l31-audio-state\" class=\"l31-help\" role=\"status\">",
             "<p class=\"l30-inline-hint\" id=\"l31-answer-hint\" role=\"status\" aria-live=\"polite\"></p><p id=\"l31-audio-state\" class=\"l31-help\" role=\"status\">")
    s = once(s, "B31('聽這個詞','speak'", "B31('🔊 聽這個詞','speak'")
    s = once(s, "B31('聽新詞的整字讀音','speak'", "B31('🔊 聽新詞讀音','speak'")
    s = once(s, "${L31('回首頁','kid','primary')}${L31('選另一組','assembly')}${L31('看看街機目標','game')}",
             "${L31('再練一組','assembly','primary')}${L31('去遊戲街機','game')}${L31('回首頁','kid')}")

    # --- companion card: one name for the help entrance, no "counts as hinted" in an accessible name ---------
    s = once(s, "button('聽老師說明','voice')", "button('🔊 怎樣玩？','voice')")
    s = once(s, "b.setAttribute('aria-label','請刺刺提供原有提示；本題會記作有提示');",
             "b.setAttribute('aria-label','需要提示（請刺刺幫忙）');")

    # --- parent report: the caveat that left the child's feedback ---------------------------------------
    s = once(s, "<p>本機資料不是伺服器認證帳本。測試帳戶的紀錄不應用作真實學生評估。</p></details>",
             PARENT_NOTE + "<p>本機資料不是伺服器認證帳本。測試帳戶的紀錄不應用作真實學生評估。</p></details>")
    return s
