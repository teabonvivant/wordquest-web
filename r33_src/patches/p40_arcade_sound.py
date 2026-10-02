"""R3.3 p40 - arcade settlement guard (N5), L30/L31 + coin sound (N9), library checkbox (N13b).

Everything is additive host JS placed BEFORE the test-injection anchor "\\ninstallMediaEvents();\\nrender();"
(the anchor text itself is never modified). It runs inside the main strict closure, so it can wrap the closure-level
function declarations by plain assignment (the same technique the V32/R2 layers already use). No old function body is
rewritten and no <script> is added or removed.

N5  arcade settlement screen charged a second coin
    Root cause: R2 moves focus to the first overlay button (= "再投 1 幣") when the canvas had focus, so the Space/Enter
    the child was mashing a moment ago activated the coin button.
    * default focus on a finished screen = "返回大堂" (never a coin-spending button)
    * the coin button ("再投 1 幣" / free-mode "重新測試") is natively `disabled` for A33_LOCK_MS (700 ms) after the
      screen appears, with a progress bar along its bottom edge (text unchanged); locked once per settlement screen
    * window-capture key guard on #pg-overlay buttons: Space/Enter swallowed while locked; auto-repeat always swallowed;
      a keyup only completes an activation whose (non-repeat, unlocked) keydown landed on the same button, so a key that
      was already down when the screen appeared, or one released after the lock, can never click a button
    * window-capture click guard on the locked coin button (covers script/AT clicks on a re-rendered node)
    * next / retry screens keep their primary button focused (it never costs a coin) but get the same 700 ms key guard
    * keyboard accessibility is kept: after the lock, Shift+Tab (DOM order is [coin][leave]) + Enter/Space buys; a
      click always works. The lobby flow (確認投 1 幣開始) is untouched.
    Only `a28Buy` charges a coin and its only overlay entry point is the `data-a28="buy"` button; the legacy R1 arcade
    overlay ("再挑戰 · 不扣幣") and the legacy playground are ticket-based and never charge coins.

N9  L30 / L31 had no sound, 'complete' was silent, no coin sound
    * playSfx gains 'complete' (523-659-784-1047 Hz) and 'coin' (988 -> 1319 Hz sine, like the other cues)
    * l30Submit / l30Next / l31Submit / l31Next are wrapped: right/wrong (soft descending 'wrong'), group complete
    * tile / piece / cut / choice / correction clicks: state before (capture) vs after (bubble) decides the cue, so a
      rejected click or a failed save is silent
    * every cue goes through playSfx -> sfxEnabled, voiceBusy and document.hidden are respected; sfxAudioCtx is reused
    * coin cue: a28Grant (main flow, family, phonics, L30, L31) and the maths bridge `award` (one text patch, after the
      save succeeded). 600 ms after the grant so it follows the finish fanfare; once per burst; at fire time the
      ledger entry must still exist (a rolled-back grant stays silent)

N13b  library "只看有圖片" checkbox rendered as a 150x48 white box
    `.l30-search input{flex:1;min-width:150px}` + `.l30-root input{min-height:48px;border;padding;background:white}`
    hit the checkbox. A runtime <style id="wq33-p40-css"> restores a 24x24 native checkbox (accent colour of the page),
    a 48 px high label hit area and a full-width search box on phones. Only #l30-word-search is touched.

Anchors: "\\ninstallMediaEvents();\\nrender();" (prepend only) and the maths bridge text
"if(save()!==true)throw Error('英文錢包未能儲存；沒有完成這次結算。');\\n      return result.award;" (one added line).
"""
import json

CSS = """
/* R3.3 p40 */
#pg-overlay .a33-locked{position:relative;overflow:hidden;cursor:progress}
#pg-overlay .a33-locked::after{content:"";position:absolute;left:0;right:0;bottom:0;height:5px;background:currentColor;opacity:.85;transform-origin:left center;transform:scaleX(0);animation:a33-lock var(--a33-ms,700ms) linear forwards}
@keyframes a33-lock{to{transform:scaleX(1)}}
@media (prefers-reduced-motion:reduce){#pg-overlay .a33-locked::after{animation:none;transform:scaleX(.5)}}
#l30-word-search{align-items:center}
#l30-word-search input[type=checkbox]{all:revert;appearance:auto;-webkit-appearance:checkbox;box-sizing:border-box;width:24px;height:24px;min-width:24px;min-height:24px;flex:0 0 auto;margin:0;accent-color:var(--l30-sea,#136f74);cursor:pointer}
#l30-word-search label{display:inline-flex;align-items:center;gap:10px;min-height:48px;flex:0 0 auto;cursor:pointer;line-height:1.4}
@media (max-width:520px){#l30-word-search #l30-word-q{flex:1 1 100%}}
"""

HOST_JS = r"""// ===== R3.3 p40 (N5 / N9 / N13b): arcade settlement guard, L30/L31 + coin sound, library checkbox CSS =====
const A33_LOCK_MS=700,A33_COIN_DELAY=600;
(function(){try{const st=document.createElement('style');st.id='wq33-p40-css';st.textContent=__A33_CSS__;document.head.appendChild(st);}catch(_){}})();

// ---- N5: settlement screen guard --------------------------------------------------------------
let a33Cur=null,a33Down=null;
function a33Box(){return document.getElementById('pg-overlay');}
// Which settlement action the visible overlay offers ('' = not a settlement screen).
function a33Kind(box){
 if(!box||box.hidden||!pgGame||pgPlaying)return '';
 if(box.querySelector('[data-a28="buy"]'))return 'buy';
 if(box.querySelector('[data-a28="next"]'))return 'next';
 if(box.querySelector('[data-a28="retry"]'))return 'retry';
 return '';
}
function a33Release(){if(a33Cur)clearTimeout(a33Cur.timer);a33Cur=null;a33Down=null;}
function a33Unlock(){
 const cur=a33Cur;if(!cur||!cur.locked)return;cur.locked=false;clearTimeout(cur.timer);
 const box=a33Box();if(!box)return;
 for(const b of box.querySelectorAll('.a33-locked')){b.classList.remove('a33-locked');b.disabled=false;b.removeAttribute('data-a33-lock');b.style.removeProperty('--a33-ms');}
}
function a33Mark(box){
 const cur=a33Cur;if(!cur||!cur.locked)return;
 const left=Math.max(0,Math.round(cur.until-performance.now()));
 for(const b of box.querySelectorAll('[data-a28="buy"]')){b.disabled=true;b.classList.add('a33-locked');b.setAttribute('data-a33-lock','1');b.style.setProperty('--a33-ms',left+'ms');}
}
function a33Focus(cur){
 // Runs after R2's own queueMicrotask(focus first overlay button). One default-focus move per settlement screen.
 if(a33Cur!==cur||cur.focused)return;cur.focused=true;
 const box=a33Box();if(!box||!pgGame||pgPlaying)return;
 const leave=box.querySelector('[data-a28="leave"]');if(!leave)return;
 const ae=document.activeElement,onBuy=!!(ae&&ae.closest&&ae.closest('#pg-overlay [data-a28="buy"]'));
 if(onBuy||(ae&&ae.id==='pg-canvas'))leave.focus({preventScroll:true});
}
function a33Sync(prevAct){
 const box=a33Box(),kind=a33Kind(box);
 if(!kind){a33Release();return;}
 if(!a33Cur||a33Cur.game!==pgGame||a33Cur.kind!==kind){
  a33Release();
  a33Cur={game:pgGame,kind,locked:true,until:performance.now()+A33_LOCK_MS,timer:0,focused:false};
  a33Cur.timer=setTimeout(a33Unlock,A33_LOCK_MS);
 }
 a33Mark(box);
 if(kind==='buy'&&!a33Cur.focused){const cur=a33Cur;queueMicrotask(()=>a33Focus(cur));}
 else if(prevAct&&!(document.activeElement&&box.contains(document.activeElement))){
  // The screen was re-rendered under a focused button (innerHTML replaced it): put focus back, never on a locked coin button.
  const back=box.querySelector('[data-a28="'+prevAct+'"]');
  const t=back&&!back.disabled?back:box.querySelector('[data-a28="leave"]');
  if(t)t.focus({preventScroll:true});
 }
}
const a33PriorOverlay=pgOverlay;
pgOverlay=function(){
 const ae=document.activeElement,prev=ae&&ae.closest?ae.closest('#pg-overlay button'):null,prevAct=prev?(prev.dataset.a28||''):'';
 const out=a33PriorOverlay.apply(this,arguments);
 try{a33Sync(prevAct);}catch(e){try{console.error('p40 overlay guard:',e);}catch(_){}}
 return out;
};
function a33IsAct(e){return e.code==='Space'||e.code==='Enter'||e.code==='NumpadEnter'||e.key===' '||e.key==='Enter';}
function a33Btn(e){const t=e.target;return t&&t.closest?t.closest('#pg-overlay button'):null;}
window.addEventListener('keydown',e=>{
 if(!a33Cur||!a33IsAct(e))return;const b=a33Btn(e);if(!b)return;
 if(a33Cur.locked||e.repeat){e.preventDefault();e.stopImmediatePropagation();return;}
 a33Down={code:e.code||e.key,el:b};
},true);
window.addEventListener('keyup',e=>{
 if(!a33Cur||!a33IsAct(e))return;const b=a33Btn(e);if(!b)return;
 const d=a33Down;a33Down=null;
 if(a33Cur.locked||!d||d.el!==b||d.code!==(e.code||e.key)){e.preventDefault();e.stopImmediatePropagation();}
},true);
window.addEventListener('click',e=>{
 if(!a33Cur||!a33Cur.locked)return;
 const b=e.target&&e.target.closest?e.target.closest('#pg-overlay [data-a28="buy"]'):null;
 if(b){e.preventDefault();e.stopImmediatePropagation();}
},true);

// ---- N9: sound ---------------------------------------------------------------------------------
const a33PriorSfx=playSfx;
playSfx=function(name){
 if(name!=='complete'&&name!=='coin')return a33PriorSfx.apply(this,arguments);
 if(!sfxEnabled()||voiceBusy||document.hidden)return;
 const ctx=ensureAudioCtx();if(!ctx)return;const t=ctx.currentTime+.01;
 try{
  if(name==='complete'){tone(ctx,523,t,.12,'sine',.045);tone(ctx,659,t+.10,.12,'sine',.05);tone(ctx,784,t+.20,.14,'sine',.055);tone(ctx,1047,t+.32,.30,'sine',.055);}
  else{tone(ctx,988,t,.08,'sine',.05);tone(ctx,1319,t+.07,.16,'sine',.055);}
 }catch(_){}
};
function a33Sfx(name){try{playSfx(name);}catch(_){}}
function a33L30Done(sid){const s=l30Read().sessions.find(x=>x.id===sid);return !!(s&&s.finishedAt&&s.status==='completed');}
function a33L31Done(sid){const s=l31Read().sessions.find(x=>x.id===sid);return !!(s&&s.status==='completed');}
const a33PriorL30Submit=l30Submit;
l30Submit=function(technical=false){
 const s0=l30Session(),sid=s0&&s0.id,idx0=s0&&s0.index,had=!!(s0&&s0.feedback);
 const out=a33PriorL30Submit.apply(this,arguments);
 try{
  if(!s0||had||technical===true)return out;
  if(a33L30Done(sid))a33Sfx('complete');
  else{const s1=l30Session();
   if(s1&&s1.id===sid){
    if(s1.feedback){if(!s1.feedback.technical)a33Sfx(s1.feedback.correct===true?'correct':'wrong');}
    else if(s1.index!==idx0)a33Sfx('tap');
   }}
 }catch(_){}
 return out;
};
const a33PriorL30Next=l30Next;
l30Next=function(){
 const s0=l30Session(),sid=s0&&s0.id,had=!!(s0&&s0.feedback);
 const out=a33PriorL30Next.apply(this,arguments);
 try{if(s0&&had&&a33L30Done(sid))a33Sfx('complete');}catch(_){}
 return out;
};
const a33PriorL31Submit=l31Submit;
l31Submit=function(){
 const s0=l31Session(),sid=s0&&s0.id,had=!!(s0&&s0.feedback),step=s0&&s0.queue&&s0.queue[s0.index]&&s0.queue[s0.index].step;
 const out=a33PriorL31Submit.apply(this,arguments);
 try{
  if(s0&&!had){const s1=l31Session();
   if(s1&&s1.id===sid&&s1.feedback)a33Sfx(step==='notice'?'tap':(s1.feedback.correct?'correct':'wrong'));}
 }catch(_){}
 return out;
};
const a33PriorL31Next=l31Next;
l31Next=function(){
 const s0=l31Session(),sid=s0&&s0.id,had=!!(s0&&s0.feedback&&s0.feedback.corrected);
 const out=a33PriorL31Next.apply(this,arguments);
 try{if(s0&&had&&a33L31Done(sid))a33Sfx('complete');}catch(_){}
 return out;
};
// Tiles / pieces / cuts / choices: compare state before (capture) and after (bubble) the original click handler.
let a33Pre=null;
function a33Snap(b){
 const a30=b.dataset.l30,a31=b.dataset.l31;
 if(a30&&(a30==='choose'||a30==='tile'||a30==='untile'||a30==='clear-tiles')){const s=l30Session();return s?{a:a30,sid:s.id,sel:s.selected,n:(s.tiles||[]).length}:null;}
 if(a31&&(a31==='choice'||a31==='piece'||a31==='undo'||a31==='clear'||a31==='cut'||a31==='correct')){
  const s=l31Session();return s?{a:a31,sid:s.id,d:s.draft,n:(s.picked||[]).length,c:(s.cuts||[]).join('|'),ok:!!(s.feedback&&s.feedback.corrected)}:null;}
 return null;
}
function a33ClickSfx(p){
 if(p.a==='choose'||p.a==='tile'||p.a==='untile'||p.a==='clear-tiles'){
  const s=l30Session();if(!s||s.id!==p.sid)return;
  if(p.a==='choose'){if(s.selected&&s.selected!==p.sel)a33Sfx('tap');return;}
  const n=(s.tiles||[]).length,q=s.queue[s.index];
  if(n>p.n)a33Sfx(q&&q.answer&&n===[...q.answer].length?'match':'tap');else if(n<p.n)a33Sfx('pop');
  return;
 }
 const s=l31Session();if(!s||s.id!==p.sid)return;
 const q=s.queue[s.index],r=q&&LIB31.recipes.get(q.recipe),n=(s.picked||[]).length,c=(s.cuts||[]).join('|');
 if(p.a==='correct'){if(!p.ok&&s.feedback&&s.feedback.corrected)a33Sfx('match');}
 else if(p.a==='choice'){if(s.draft&&s.draft!==p.d)a33Sfx('tap');}
 else if(p.a==='piece'){if(n>p.n)a33Sfx(r&&n===r.parts.length?'match':'tap');}
 else if(p.a==='cut'){if(c!==p.c)a33Sfx(r&&(s.cuts||[]).filter(Boolean).length===r.parts.length?'match':'tap');}
 else if(p.a==='undo'||p.a==='clear'){if(n<p.n||(c!==p.c&&!(s.cuts||[]).some(Boolean)))a33Sfx('pop');}
}
document.addEventListener('click',e=>{
 a33Pre=null;
 try{const b=e.target&&e.target.closest?e.target.closest('[data-l30],[data-l31]'):null;if(b&&!b.disabled)a33Pre=a33Snap(b);}catch(_){}
},true);
document.addEventListener('click',()=>{const p=a33Pre;a33Pre=null;if(!p)return;try{a33ClickSfx(p);}catch(_){}});
// Coin cue: once per grant burst, 600 ms after the grant (behind the finish fanfare). A rolled-back grant has no
// ledger entry any more at fire time and stays silent. Must never throw: the maths bridge calls it inside its try.
let a33CoinTimer=0;
function a33CoinCue(entryId,childId){
 try{
  if(a33CoinTimer)return;
  a33CoinTimer=setTimeout(()=>{a33CoinTimer=0;
   try{
    if(entryId){const c=db&&db.arcadeV28&&db.arcadeV28.children&&db.arcadeV28.children[childId];if(!c||!c.ledger||!c.ledger.some(x=>x.id===entryId))return;}
    playSfx('coin');
   }catch(_){}
  },A33_COIN_DELAY);
 }catch(_){}
}
const a33PriorGrant=a28Grant;
a28Grant=function(){
 const award=a33PriorGrant.apply(this,arguments);
 try{
  if(award>0){const c=a28Child(),last=c&&c.ledger&&c.ledger[c.ledger.length-1];a33CoinCue(last&&last.kind==='learn'?last.id:'',activeChild().id);}
 }catch(_){}
 return award;
};
"""

MATH_OLD = ("if(save()!==true)throw Error('英文錢包未能儲存；沒有完成這次結算。');\n"
            "      return result.award;")
MATH_NEW = ("if(save()!==true)throw Error('英文錢包未能儲存；沒有完成這次結算。');\n"
            "      if(result.award>0)try{a33CoinCue('');}catch(_){}\n"
            "      return result.award;")


def apply(s, ctx):
    once = ctx.once
    anchor = '\ninstallMediaEvents();\nrender();'
    host = HOST_JS.replace('__A33_CSS__', json.dumps(CSS.strip(), ensure_ascii=False))
    s = once(s, anchor, '\n' + host + anchor)
    s = once(s, MATH_OLD, MATH_NEW)
    return s
