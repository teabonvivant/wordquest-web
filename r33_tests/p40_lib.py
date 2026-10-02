"""Shared helpers for the p40 browser tests (arcade overlay, sfx, library checkbox).

* WQ33_APP (see wq33.py) picks the index.html under test; the file on disk is never modified.
* The page is served through Playwright route(): the SAME html plus a read-only diagnostics bridge `window.__p40`
  that is spliced in just before the test-injection anchor. The bridge is test-only and is not part of the app.
* `Checker` prints one `PASS ...` / `FAIL ...` line per check (what run_release.py counts). Checks marked base=True
  ("[B]") are the ones that are EXPECTED to fail on the frozen R3.2 base; the summary line separates them.
* Exit code is 1 when anything FAILs (on the base build that is expected for the [B] checks).
"""
import json
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import wq33  # noqa: E402
from wq33 import APP, URL, new_page, register, unlock_parent, sync_playwright  # noqa: E402,F401

ANCHOR = '\ninstallMediaEvents();\nrender();'

BRIDGE = r"""
window.__p40={
 state(){const r=a28Run()||{};return {stars:activeChild().stars,used:a28Child().batch.used,playing:!!pgPlaying,reason:pgReason,
  game:(pgMeta&&pgMeta.id)||'',phase:r.phase||'',lives:r.lives,run:r.id||'',done:!!(pgGame&&pgGame.done),route:lastRoute,
  overlay:!!document.querySelector('#pg-overlay:not([hidden]) .a28-overlaycard'),title:(document.querySelector('#pg-overlay h2')||{}).textContent||'',
  ledger:a28Child().ledger.length};},
 boost(n){const c=a28Child();for(const id of COIN28.ids)c.permissions[id]='open';c.batch.used=0;activeChild().stars=n||60;if(!save())throw Error('boost: save failed');return activeChild().stars;},
 end(msg){a28Fail(msg||'p40 test');return performance.now();},
 now(){return performance.now();},
 setFree(b){pgFree=!!b;},
 reset(n){const c=a28Child();if(c.run)COIN28.close(c);pgPlaying=false;pgGame=null;a28Epoch++;pgFree=false;const r=this.boost(n||60);go('game');render();return r;},
 overlay(){pgOverlay();},
 voice(v){voiceBusy=!!v;},
 sfx(on){db.settings.sfxEnabled=!!on;},
 sfxOn(){return sfxEnabled();},
 failSave(on){if(on){if(!window.__p40_save)window.__p40_save=save;save=function(){return false;};}else if(window.__p40_save){save=window.__p40_save;window.__p40_save=null;}},
 l30(){const s=l30Session();return s?{id:s.id,index:s.index,len:s.queue.length,mode:s.queue[s.index].mode,q:s.queue[s.index],fb:s.feedback,tiles:s.tiles,unit:s.unit}:null;},
 l30Start(u,m,w){l30Start(u,m,w||null);},
 l30Units(){return D30.units.map(u=>u.id);},
 l30Modes(u){return L30.allowed(LIB30,u);},
 l30Done(){const s=[...l30Read().sessions].reverse()[0];return s?{status:s.status,award:s.award,fin:!!s.finishedAt}:null;},
 l31(){const s=l31Session();return s?{id:s.id,index:s.index,len:s.queue.length,step:s.queue[s.index].step,rec:s.queue[s.index].recipe,fb:s.feedback,picked:s.picked,cuts:s.cuts,draft:s.draft}:null;},
 l31Start(g,m,o){l31Start(g,m,o||null);},
 l31Groups(){return D31.groups.map(g=>({id:g.id,kind:g.kind,recipes:g.recipes}));},
 l31Recipe(id){const r=LIB31.recipes.get(id);return {id:r.id,kind:r.kind,form:r.form,parts:r.parts,sources:r.sources,meaning:r.meaning};},
 l31Done(){const s=[...l31Read().sessions].reverse()[0];return s?{status:s.status,award:s.award}:null;},
 stars(){return activeChild().stars;},
 play(n){playSfx(n);},
 renderNow(){render();}
};
"""

AUDIO_SPY = r"""
(()=>{
 const log={osc:[],ctx:0};window.__au=log;
 for(const name of ['AudioContext','webkitAudioContext']){
  const AC=window[name];if(!AC||AC.__p40)continue;
  const Wrapped=function(...a){log.ctx++;return new AC(...a);};
  Wrapped.prototype=AC.prototype;Wrapped.__p40=true;
  try{window[name]=Wrapped;}catch(_){}
 }
 const AC=window.AudioContext||window.webkitAudioContext;
 const proto=(window.BaseAudioContext||AC).prototype;
 const orig=proto.createOscillator;
 proto.createOscillator=function(){
  const o=orig.apply(this,arguments);const rec={f:[],type:'',at:performance.now(),ctxTime:this.currentTime};
  const sv=o.frequency.setValueAtTime.bind(o.frequency);
  o.frequency.setValueAtTime=function(v,t){rec.f.push(Math.round(v*100)/100);return sv(v,t);};
  const st=o.start.bind(o);o.start=function(t){rec.type=o.type;rec.when=t;log.osc.push(rec);return st(t);};
  return o;
 };
})();
"""


class Checker:
    def __init__(self, title):
        self.title = title
        self.rows = []
        self.t0 = time.time()
        print(f'# {title}  app={APP}', flush=True)

    def check(self, name, ok, detail='', base=False):
        ok = bool(ok)
        self.rows.append((name, ok, base))
        tag = ' [B]' if base else ''
        d = f' | {detail}' if detail != '' else ''
        print(f"{'PASS' if ok else 'FAIL'}{tag} {name}{d}", flush=True)
        return ok

    def finish(self):
        total = len(self.rows)
        passed = sum(1 for r in self.rows if r[1])
        fail_b = sum(1 for r in self.rows if not r[1] and r[2])
        fail_other = sum(1 for r in self.rows if not r[1] and not r[2])
        print(f'SUMMARY {self.title}: {passed}/{total} passed; failed [B] (expected on R3.2 base) = {fail_b}; '
              f'failed other = {fail_other}; {time.time() - self.t0:.0f}s', flush=True)
        return 0 if passed == total else 1


def patched_html():
    s = APP.read_text()
    assert s.count(ANCHOR) == 1, 'test-injection anchor must exist exactly once'
    return s.replace(ANCHOR, '\n' + BRIDGE + ANCHOR, 1)


def open_page(p, w=1280, h=900, touch=False, audio=False, accept_downloads=False):
    """Browser + context + page serving APP with the diagnostics bridge. Returns (browser, ctx, page, errors)."""
    b, ctx, pg, errs = new_page(p, w, h, touch=touch, accept_downloads=accept_downloads)
    html = patched_html()
    pg.route(URL, lambda route: route.fulfill(status=200, content_type='text/html; charset=utf-8', body=html))
    if audio:
        pg.add_init_script(AUDIO_SPY)
    pg.on('dialog', lambda d: d.accept())
    return b, ctx, pg, errs


def boot_account(pg, name='p40tester', grade='3', coins=60):
    register(pg, name=name, grade=grade)
    pg.wait_for_function('typeof window.__p40==="object"', timeout=15000)
    if coins is not None:
        pg.evaluate(f'__p40.boost({int(coins)})')


def st(pg):
    return pg.evaluate('__p40.state()')


def osc(pg):
    """Oscillators recorded so far: list of {f:[freq,...], type}."""
    return pg.evaluate('window.__au?window.__au.osc.map(o=>({f:o.f,type:o.type})):[]')


def osc_mark(pg):
    return len(osc(pg))


def osc_since(pg, mark):
    return osc(pg)[mark:]


def freqs(rows):
    return [f for r in rows for f in r['f']]
