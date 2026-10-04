"""Shared helpers for the p20 (English lesson loop) browser tests of R3.5.

* WQ33_APP (see r33_tests/wq33.py) picks the index.html under test; the file on disk is never modified.
* The page is served through Playwright route(): the SAME html plus two read-only test bridges spliced in just
  before the injection anchor: the R3.3 `window.__p40` diagnostics and `window.__ev(code)` (an eval inside the
  host closure). Neither is part of the app.
* Set-up goes through the bridges (same on the R3.2 base and on the new build); the behaviour under test is always
  done with real clicks / key presses on the DOM, or read from the DOM.
"""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
R = HERE.parent
sys.path.insert(0, str(R / 'r33_tests'))
import wq33  # noqa: E402
from wq33 import APP, URL, new_page, register, sync_playwright  # noqa: E402,F401
from p40_lib import Checker, BRIDGE as P40_BRIDGE, ANCHOR  # noqa: E402,F401

BRIDGE = P40_BRIDGE + "\nwindow.__ev=(s)=>eval(s);\n"
SHOTS = Path('/home/claude/audit_r35/r35/p20')
SHOTS.mkdir(parents=True, exist_ok=True)
VIEWPORTS = [(390, 844, 'phone'), (844, 390, 'landscape'), (320, 568, 'small'), (768, 1024, 'tablet')]


def patched_html():
    s = APP.read_text()
    assert s.count(ANCHOR) == 1, 'test-injection anchor must exist exactly once'
    return s.replace(ANCHOR, '\n' + BRIDGE + ANCHOR, 1)


def open_page(p, w=390, h=844, touch=True):
    """Returns (browser, context, page, errors). Console errors and page errors are collected in `errors`."""
    b, ctx, pg, errs = new_page(p, w, h, touch=touch)
    html = patched_html()
    pg.route(URL, lambda route: route.fulfill(status=200, content_type='text/html; charset=utf-8', body=html))
    pg.on('console', lambda m: errs.append('CONSOLE ' + m.text) if m.type == 'error' else None)
    pg.set_default_timeout(12000)
    return b, ctx, pg, errs


def boot(pg, name='p20tester', grade='3'):
    register(pg, name=name, grade=grade)
    pg.wait_for_function('typeof window.__p40==="object"', timeout=15000)
    pg.evaluate('__p40.boost(60)')


def ev(pg, code):
    return pg.evaluate('(c)=>window.__ev(c)', code)


def units(pg):
    return pg.evaluate('__p40.l30Units()')


def clear(pg):
    """Abandon any active l30 session (set-up only; works on every build) and go home."""
    ev(pg, "(()=>{const s=l30Session();if(s){l30Commit(()=>{L30.abandon(l30Session(),Date.now());},{redraw:false});}go('kid');render();})()")
    pg.wait_for_timeout(250)


def start(pg, mode='lesson', unit=None, settle=500):
    clear(pg)
    u = unit or units(pg)[0]
    pg.evaluate(f'__p40.l30Start("{u}","{mode}")')
    pg.wait_for_timeout(settle)
    return pg.evaluate('__p40.l30()')


def cur(pg):
    return pg.evaluate('__p40.l30()')


def correct_text(info):
    q = info['q']
    return q.get('answer')


def advance(pg, until_mode=None, until_index=None, max_steps=40):
    """Move through steps (study -> submit; others: answer correctly, then next) until the target is current."""
    for _ in range(max_steps):
        info = cur(pg)
        if not info:
            return None
        if until_mode and info['mode'] == until_mode and not info['fb']:
            return info
        if until_index is not None and info['index'] >= until_index and not info['fb']:
            return info
        if info['fb']:
            pg.click('[data-l30="next"]')
        elif info['mode'] == 'study':
            pg.click('[data-l30="submit"]')
        else:
            answer(pg, True)
            pg.click('[data-l30="submit"]')
        pg.wait_for_timeout(220)
    return cur(pg)


def answer(pg, correct=True):
    """Fill / select the current question's answer. Returns False when the mode has no way to answer."""
    info = cur(pg)
    q = info['q']
    mode = info['mode']
    ans = q.get('answer') or ''
    if mode in ('listenChoice', 'listenSpell'):
        # R3.6: a listening question can only be answered after the sound was played; a headless browser has no speech, so set it up through the bridge
        ev(pg, "l30Commit(()=>{const t=l30Session();t.audioHeard=true;t.audioStatus='done';t.replays=1;})")
        pg.wait_for_timeout(80)
    if q.get('choices'):
        if correct:
            idx = q['choices'].index(ans) if ans in q['choices'] else 0
        else:
            idx = [i for i, c in enumerate(q['choices']) if c != ans][0]
        pg.click(f'[data-l30="choose"][data-index="{idx}"]')
        return True
    if mode == 'tiles':
        chars = ev(pg, "(()=>{const s=l30Session();const q=s.queue[s.index];return L30.shuffle([...q.answer],L30.seed(s.id+':tiles:'+s.index));})()")
        order = []
        used = set()
        target = ans if correct else ans[::-1] + 'x'
        for ch in target:
            for i, c in enumerate(chars):
                if c == ch and i not in used:
                    used.add(i)
                    order.append(i)
                    break
        for i in order:
            pg.click(f'[data-l30="tile"][data-index="{i}"]')
        return True
    if pg.query_selector('#l30-answer'):
        ans = q.get('missing') if mode == 'missing' else ans
        pg.fill('#l30-answer', ans if correct else 'zzq')
        return True
    return False


def vis_rect(pg, sel):
    return pg.evaluate("""(s)=>{const e=document.querySelector(s);if(!e)return null;const r=e.getBoundingClientRect();
      return {top:r.top,bottom:r.bottom,left:r.left,right:r.right,w:r.width,h:r.height,vh:innerHeight,vw:innerWidth};}""", sel)


def topmost(pg, sel):
    """True when the centre of `sel` is the topmost element there (a real tap would reach it)."""
    return pg.evaluate("""(sel)=>{const e=document.querySelector(sel);if(!e)return null;const r=e.getBoundingClientRect();
      const x=r.left+r.width/2,y=r.top+r.height/2;if(x<0||y<0||x>innerWidth||y>innerHeight)return 'offscreen';
      const t=document.elementFromPoint(x,y);return !!t&&(t===e||e.contains(t)||t.contains(e));}""", sel)


def fully_visible(pg, sel):
    """True when the whole box of `sel` is inside the viewport and the elements at its four inner corners and centre belong to it."""
    return pg.evaluate("""(sel)=>{const e=document.querySelector(sel);if(!e)return null;const r=e.getBoundingClientRect();
      if(r.top<0||r.left<0||r.bottom>innerHeight||r.right>innerWidth)return false;
      const d=Math.min(20,r.width/4,r.height/4);   // inset so rounded corners do not count as "outside"
      const pts=[[r.left+d,r.top+d],[r.right-d,r.top+d],[r.left+d,r.bottom-d],[r.right-d,r.bottom-d],[r.left+r.width/2,r.top+r.height/2]];
      return pts.every(([x,y])=>{const t=document.elementFromPoint(x,y);return !!t&&(t===e||e.contains(t));});}""", sel)


def shot(pg, name):
    path = SHOTS / name
    pg.screenshot(path=str(path))
    return path


# ----------------------------------------------------------------------------- word-workshop (l31) lesson
def l31_start(pg, group=None):
    clear(pg)
    ev(pg, "(()=>{const s=l31Session();if(s){l31Commit(()=>C31.abandon(l31Session()));}go('kid');render();})()")
    pg.wait_for_timeout(200)
    g = group or pg.evaluate('__p40.l31Groups()')[0]['id']
    pg.evaluate(f'__p40.l31Start("{g}")')
    pg.wait_for_timeout(500)
    return pg.evaluate('__p40.l31()')


def l31_to(pg, step, max_steps=12):
    """Walk the workshop lesson (notice -> assemble -> meaning -> recall) until `step` is the current step with no feedback."""
    for _ in range(max_steps):
        info = pg.evaluate('__p40.l31()')
        if not info:
            return None
        if info['step'] == step and not info['fb']:
            return info
        st = info['step']
        if info['fb']:
            nxt = pg.query_selector('[data-l31="next"]')
            if not nxt:
                return info
            nxt.click()
        elif st == 'notice':
            pg.click('[data-l31="submit"]')
        elif st == 'assemble':
            parts = pg.evaluate(f'__p40.l31Recipe("{info["rec"]}")')['parts']
            for part in parts:
                pg.click(f'[data-l31="piece"]:text-is("{part}")')
            pg.click('[data-l31="submit"]')
        elif st == 'meaning':
            form = pg.evaluate(f'__p40.l31Recipe("{info["rec"]}")')['meaning']
            pg.click(f'[data-l31="choice"][data-value="{form}"]')
            pg.click('[data-l31="submit"]')
        else:
            return info
        pg.wait_for_timeout(220)
    return pg.evaluate('__p40.l31()')


# ----------------------------------------------------------------------------- misc helpers shared by the tests
SPEECH = r"""
(()=>{
 window.__speak=[];
 const voices=[{name:'Test English (UK)',lang:'en-GB',default:true,localService:true,voiceURI:'test-gb'}];
 window.SpeechSynthesisUtterance=class{constructor(t){this.text=t||'';this.voice=null;this.lang='';this.rate=1;this.pitch=1;this.volume=1;this.onstart=null;this.onend=null;this.onerror=null;}};
 const fake={speaking:false,pending:false,paused:false,onvoiceschanged:null,
  getVoices(){return voices;},
  speak(u){try{window.__speak.push({t:u.text,lang:u.lang});}catch(_){}
   this.speaking=true;setTimeout(()=>{try{u.onstart&&u.onstart({});}catch(_){}},20);
   setTimeout(()=>{this.speaking=false;try{u.onend&&u.onend({});}catch(_){}},150);},
  cancel(){this.speaking=false;},pause(){},resume(){},addEventListener(){},removeEventListener(){}};
 try{Object.defineProperty(window,'speechSynthesis',{value:fake,configurable:true});}catch(e){window.speechSynthesis=fake;}
})();
"""


def text_of(pg, sel):
    """innerText of the first match, or None (never waits, so it is safe on builds that lack the element)."""
    return pg.evaluate("(s)=>{const e=document.querySelector(s);return e?e.innerText:null}", sel)


def body_text(pg):
    return pg.evaluate("document.body.innerText")


def hear(pg):
    """Play the listening step's audio (fake speech) until the submit button is enabled."""
    pg.click('[data-l30="audio"]')
    try:
        pg.wait_for_function("(()=>{const b=document.querySelector('[data-l30=\"submit\"]');return b&&!b.disabled})()", timeout=4000)
    except Exception:
        pass


def open_menu(pg):
    """Open the top-right menu when the build has one (new build); the base has the give-up button in view already."""
    if pg.query_selector('.p20-more summary'):
        pg.click('.p20-more summary')
        pg.wait_for_timeout(150)


def abandon(pg, accept=True, messages=None):
    """Press the give-up action (through the menu when present) and answer the confirm dialog."""
    handler = None
    if messages is not None or not accept:
        def handler(d):
            if messages is not None:
                messages.append(d.message)
            d.accept() if accept else d.dismiss()
        pg.once('dialog', handler)
    else:
        pg.once('dialog', lambda d: d.accept())
    open_menu(pg)
    pg.click('[data-l30="abandon"]')
    pg.wait_for_timeout(500)
