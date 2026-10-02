"""R3.3 p10 - mobile layout stop-gap (N1, N2, N3, N4, N10, N12).

Patched pieces (all anchors are unique in the frozen R3.2 index.html):
  * </head>                         + <style id="wq33-layout"> (host CSS, appended last so it wins ties)
  * "\\ninstallMediaEvents();\\nrender();"   + small host script that wraps render() (anchor text is kept)
  * s39 maths mount()/open()/close() history entry (N12) - WQMathHost apiVersion 1 untouched
  * s34 WQMathCSS (shadow DOM) tower button colours (N10)

Design notes
  --wq33-nav-h   height of the fixed bottom nav (#wq29-nav, <=520px). CSS fallback 61px + safe area,
                 refined at run time by the host script from the real element.
  data-wq33-route on <body>: current route name, used only to hide the floating launcher in focus flows.
"""

FOCUS_ROUTES = ['learning', 'assembly-learn', 'learn', 'gameplay', 'arcade-play', 'playground',
                'range-new', 'family-lesson', 'phonics-lesson']

_FOCUS_SEL = ',\n'.join(f'body[data-wq33-route="{r}"] #wqm-launch' for r in FOCUS_ROUTES)

CSS = """<style id="wq33-layout">
/* R3.3 p10: layout guards. Everything here is additive; see r33_src/patches/p10_layout.py. */
:root{--wq33-nav-h:0px}
@media(max-width:520px){:root{--wq33-nav-h:calc(61px + env(safe-area-inset-bottom,0px))}}

/* N3: the floating maths launcher sits above the bottom nav and disappears in focus flows. */
#wqm-launch{bottom:calc(18px + env(safe-area-inset-bottom,0px))!important;right:calc(18px + env(safe-area-inset-right,0px))!important}
@media(max-width:520px){#wqm-launch{bottom:calc(var(--wq33-nav-h) + 14px)!important}}
body.quiz-active #wqm-launch,body.arcade-active #wqm-launch,body.pg-active #wqm-launch,
body.import-selection-active #wqm-launch,body.l30-learning-active #wqm-launch,
%(focus_sel)s{display:none!important}

/* N1: focusing / blurring a text field must never move the page. The mentor card keeps its box
   (visibility) so the first tap on a button lands where the pointer went down. */
@media(max-width:760px){body.wq32-typing .wq32-guide{display:flex!important;visibility:hidden!important}}
@media(min-width:521px) and (max-width:760px){body.wq32-typing #wq29-nav{display:flex!important}}
@media(max-width:760px){body.wq32-typing .l31-actions{bottom:70px}}
/* Sticky action bars clear the real nav height (includes the iOS home-indicator inset). */
@media(max-width:520px){.l30-quiz .l30-quizactions,.l31-actions,body.wq32-typing .l31-actions{bottom:calc(var(--wq33-nav-h) + 9px)!important}}

/* N2: the legacy one-screen quiz owns the whole viewport; its explicit exit is the "休息" button. */
@media(max-width:520px){body.quiz-active #wq29-nav{display:none!important}}

/* N4: the import dock sits above the fixed bottom nav (it used to be underneath it). */
@media(max-width:520px){.v20-selected-footer{bottom:var(--wq33-nav-h);padding-bottom:10px}}
</style>
""" % {'focus_sel': _FOCUS_SEL}

HOST_JS = """
/* R3.3 p10: layout guards (route flag + real bottom-nav height). */
(function(){
 'use strict';
 const root=document.documentElement;let watched=null,ro=null;
 function routeName(){return (location.hash||'#kid').slice(1).split('?')[0];}
 function measureNav(){
  try{
   if(innerWidth>520){root.style.setProperty('--wq33-nav-h','0px');return;}
   const nav=document.getElementById('wq29-nav');if(!nav)return;
   if('ResizeObserver' in window&&watched!==nav){ro?.disconnect();ro=new ResizeObserver(measureNav);try{ro.observe(nav,{box:'border-box'});}catch(_){ro.observe(nav);}watched=nav;}
   const cs=getComputedStyle(nav);if(cs.display==='none'||cs.position!=='fixed')return;
   const h=Math.round(nav.getBoundingClientRect().height);
   if(h>=40&&h<=240)root.style.setProperty('--wq33-nav-h',h+'px');
  }catch(_){}
 }
 function sync(){try{if(document.body)document.body.dataset.wq33Route=routeName();}catch(_){}measureNav();}
 const priorRender=render;
 render=function(){const out=priorRender.apply(this,arguments);sync();return out;};
 window.addEventListener('resize',measureNav);
 window.addEventListener('orientationchange',()=>setTimeout(measureNav,250));
 window.addEventListener('load',measureNav);
})();
"""

# --- s39: one history entry per open maths dialog (N12) -------------------------------------
HIST_JS = """ // R3.3 p10: one history entry per open maths dialog. Back closes it; Esc / close button pop it again.
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
"""

# Tower level buttons: dark panel, light text; selected level is gold (contrast >= 4.5:1).
TOWER_CSS = (".tower .eyebrow{color:#d7ba7b}"
             ".tower button{background:#35516a;color:#f8f3e4;border:1px solid #8fa5b5}"
             ".tower button:hover:not(:disabled){background:#46657f;color:#fff}"
             ".tower button.selected{background:#d7b771;border-color:#d7b771;color:#24394a}"
             ".tower button.selected:hover:not(:disabled){background:#e3c585;color:#24394a}")


def apply(s, ctx):
    once = ctx.once
    # --- CSS ---------------------------------------------------------------------------------
    s = once(s, '</head>', CSS + '</head>')
    # --- host script (keeps the test-injection anchor intact) -----------------------------------
    anchor = '\ninstallMediaEvents();\nrender();'
    s = once(s, anchor, '\n' + HOST_JS + anchor)
    # --- s39 maths: history entry (N12) -------------------------------------------------------
    s = once(s, " function close(){tickUsage();", HIST_JS + " function close(){tickUsage();")
    s = once(s, "render();dialog.showModal();activeSince=Date.now();app.querySelector('button')?.focus();",
             "render();dialog.showModal();wq33Push();activeSince=Date.now();app.querySelector('button')?.focus();")
    s = once(s, "if(dialog?.open){dialog.close();bridge.afterClose?.();launch?.focus();}",
             "if(dialog?.open){dialog.close();wq33Pop(wq33Fast);wq33Fast=false;bridge.afterClose?.();launch?.focus();}")
    s = once(s, "dialog.addEventListener('cancel',e=>{e.preventDefault();close();});",
             "dialog.addEventListener('cancel',e=>{e.preventDefault();close();});window.addEventListener('popstate',wq33OnPop);window.addEventListener('hashchange',wq33OnHash);")
    s = once(s, "if(close()!==false)bridge.openParentGate?.();return;",
             "wq33Fast=true;const wq33Ok=close()!==false;wq33Fast=false;if(wq33Ok)wq33AfterPop(()=>bridge.openParentGate?.());return;")
    # --- legacy #learn: the nav is hidden on phones, so the top-bar exit says what it does (N2) ----------
    s = once(s, "btn('休息','pause-session','quiet')",
             "btn('休息','pause-session','quiet','title=\"暫停，返回首頁\" aria-label=\"休息（暫停並返回首頁）\"')")
    # --- s34 maths CSS (shadow DOM): tower buttons (N10) --------------------------------------
    s = once(s, ".tower .eyebrow{color:#d7ba7b}", TOWER_CSS)
    return s
