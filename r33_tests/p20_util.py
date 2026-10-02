"""Shared helpers for the R3.3 p20 browser suites (this file is not a test).

* build_copy()  writes a TEST COPY of the app under test (WQ33_APP) into a temp dir. The copy gets a small `window.__T`
                hook block injected in front of the shared anchor so tests can reach script-scope functions. The hook
                block is NEVER part of the product build. Fault injection is limited to one-shot wrappers around
                r3ReplaceMedia / r3Journal / openMediaDb (real validators, parent gate and IndexedDB stay in place).
* Reporter      prints one `PASS <name>` / `FAIL <name> :: <detail>` line per check (run_release.py counts those lines)
                and exits non-zero when anything failed.
"""
import atexit, os, shutil, sys, tempfile, traceback
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import wq33  # noqa: E402
from wq33 import sync_playwright, PW  # noqa: E402,F401

ANCHOR = '\ninstallMediaEvents();\nrender();'

TEST_JS = r'''
/* TEST ONLY (r33_tests/p20_util.py): reach script-scope functions; never shipped. */
window.__T={
 db:()=>db, render:()=>{render();return 1;}, owner:()=>accountId(), key:()=>dbKey(),
 marker:()=>localStorage.getItem(r3Marker()), setMarker:v=>localStorage.setItem(r3Marker(),v), clearMarker:()=>localStorage.removeItem(r3Marker()),
 kv:()=>r3ReadKV(), canWrite:()=>v24CanWrite(), save:()=>save(), loadBlocked:()=>loadBlocked, issue:()=>persistenceIssue,
 parentAllowed:()=>v23ParentAllowed(), expireParent:()=>{v23ParentUntil=0;}, parentFor:ms=>{v23ParentOwner=v23Owner();v23ParentUntil=performance.now()+ms;},
 hasLease:()=>v23HasLease(), releaseLease:()=>{arReleaseLease?.();}, setBusy:v=>{r3Busy=!!v;},
 capErr:()=>v23CapabilityError(), requireParent:w=>v24RequireParent(w),
 journalGet:async()=>await r3Journal('get',accountId()), journalPut:async row=>{await r3Journal('put',row);return true;}, journalDel:async()=>{await r3Journal('delete',accountId());return true;},
 validJournalRow:(label='test')=>({owner:accountId(),before:r3ReadKV(),beforeMedia:[],at:Date.now(),label}),
 media:async()=>(await readMediaOwner(accountId())).map(r=>({key:r.key,kind:r.kind,size:r.blob?r.blob.size:0})),
 putMedia:async rows=>{const d=await openMediaDb(),o=accountId();await new Promise((res,rej)=>{const tx=d.transaction('assets','readwrite');for(const r of rows)tx.objectStore('assets').put({...r,id:recordId(o,r.key),owner:o,updatedAt:new Date().toISOString()});tx.oncomplete=res;tx.onabort=()=>rej(tx.error||Error('put failed'));});return true;},
 clearMedia:async()=>{const d=await openMediaDb(),o=accountId(),rows=await readMediaOwner(o);await new Promise((res,rej)=>{const tx=d.transaction('assets','readwrite');for(const r of rows)tx.objectStore('assets').delete(r.id);tx.oncomplete=res;tx.onabort=()=>rej(tx.error||Error('clear failed'));});return rows.length;},
 png:()=>new Blob([new Uint8Array([137,80,78,71,13,10,26,10,0,0,0,0])],{type:'image/png'}),
 addWord:(en,childId)=>{const cid=childId||activeChild().id;let r=db.ranges.find(x=>x.childId===cid);if(!r){r={id:uid('r'),childId:cid,title:'測試範圍',dictationDate:'',createdAt:new Date().toISOString()};db.ranges.push(r);}
  const w={id:uid('w'),childId:cid,rangeId:r.id,en,zh:'測試',example:'',kind:'word',emoji:'',createdAt:new Date().toISOString(),studySeen:0,reviewLevel:0,reviewDue:null,lastSeen:null};db.words.push(w);if(!save())throw Error('save failed');return w;},
 addChild:name=>{const c={id:uid('c'),name,grade:3,stars:0,createdAt:new Date().toISOString()};db.children.push(c);if(!save())throw Error('save failed');return c.id;},
 rename:name=>{db.children[0].name=name;if(!save())throw Error('save failed');return true;},
 reloadSettings:()=>{r3SettingsOwner='';return 1;},
 tomb:()=>localStorage.getItem('wq-r3-media-gc:'+accountId()),
 exportPack:async()=>{const p=await r3Export();return JSON.parse(JSON.stringify(p));},
 restore:async payload=>{try{await r3Restore(payload);return '';}catch(e){return e.message||String(e);}},
 recover:async()=>{try{return {done:await r3Recover(),msg:''};}catch(e){return {done:false,msg:e.message};}},
 reset:async()=>{try{await resetAll();return '';}catch(e){return e.message;}},
 exportTry:async()=>{try{const p=await r3Export();return {ok:true,keys:p.payload.media.map(m=>m.key),children:p.payload.english.children.length};}catch(e){return {ok:false,msg:e.message};}},
 panel:()=>{try{r3Panel();return '';}catch(e){return e.message;}}, health:()=>{try{r32OpenHealth();return '';}catch(e){return e.message;}},
 failReplaceMedia:n=>{const p=r3ReplaceMedia;let k=n;r3ReplaceMedia=async function(){if(k>0){k--;if(k===0)r3ReplaceMedia=p;throw Error('Injected media write failure');}return p.apply(this,arguments);};},
 failJournal:(mode,n)=>{const p=r3Journal;let k=n;r3Journal=async function(m){if(m===mode&&k>0){k--;if(k===0)r3Journal=p;throw Error('Injected journal '+mode+' failure');}return p.apply(this,arguments);};},
 failJournalAlways:mode=>{const p=r3Journal;r3Journal=async function(m){if(m===mode)throw Error('Injected journal '+mode+' failure');return p.apply(this,arguments);};return true;},
 mediaWriteFault:on=>{if(!window.__openMediaDbOrig)window.__openMediaDbOrig=openMediaDb;if(on)openMediaDb=function(){return window.__openMediaDbOrig.apply(this,arguments).then(d=>new Proxy(d,{get(t,k){if(k==='transaction')return (s,m)=>{if(m==='readwrite')throw Error('Injected IDB transaction failure');return t.transaction(s,m);};const v=t[k];return typeof v==='function'?v.bind(t):v;}}));};else openMediaDb=window.__openMediaDbOrig;return true;},
 gcNow:async()=>{try{return {n:await wq20MediaGc(accountId())};}catch(e){return {err:e.message};}},
 gcBackoffReset:()=>{try{wq20GcBackoff=0;}catch(_){}return 1;},
 deleteChildRaw:id=>{deleteChild(id);return true;},
 importDraft:()=>({title:importDraft.title,raw:importDraft.raw}),
};
'''


def build_copy():
    """Write the test copy of WQ33_APP and point wq33.URL at it. Returns the copy's path."""
    src = wq33.APP.read_text(encoding='utf-8')
    assert src.count(ANCHOR) == 1, 'shared test anchor missing or duplicated in ' + str(wq33.APP)
    d = Path(tempfile.mkdtemp(prefix='wq33_p20_'))
    atexit.register(shutil.rmtree, d, True)
    out = d / 'index.html'
    out.write_text(src.replace(ANCHOR, '\n' + TEST_JS + ANCHOR, 1), encoding='utf-8')
    wq33.URL = out.as_uri()
    return out


class Reporter:
    def __init__(self, title):
        self.title, self.n, self.fail = title, 0, 0
        print('# ' + title + ' | app under test: ' + str(wq33.APP), flush=True)

    def check(self, name, fn):
        """A check passes when fn() returns anything but False and does not raise."""
        self.n += 1
        detail = ''
        try:
            ok = fn() is not False
        except Exception as e:  # noqa: BLE001
            ok, detail = False, ' '.join(str(e).split())[:300]
            if os.environ.get('P20_TRACE'):
                traceback.print_exc()
        if not ok:
            self.fail += 1
        print(('PASS ' if ok else 'FAIL ') + name + ((' :: ' + detail[:200]) if detail and not ok else ''), flush=True)
        return ok

    def done(self, errors=None):
        if errors is not None:
            self.check('no uncaught page errors', lambda: require(not errors, '; '.join(errors[:3])))
        print(f'# TOTAL {self.n} checks, {self.n - self.fail} pass, {self.fail} fail', flush=True)
        sys.exit(1 if self.fail else 0)


def require(cond, msg='assertion failed'):
    if not cond:
        raise AssertionError(msg)
    return True


def boot(p, w=390, h=844, touch=False, name='tester', child='小明'):
    """Fresh browser context, register a family account, unlock the parent gate. Returns (browser, ctx, page, errors)."""
    b, ctx, pg, errs = wq33.new_page(p, w=w, h=h, touch=touch, accept_downloads=True)
    pg.set_default_timeout(20000)
    pg.set_default_navigation_timeout(30000)
    wq33.register(pg, name=name, child=child)
    return b, ctx, pg, errs


def unlock(pg):
    """Pass the parent gate on the settings page (no-op when already allowed)."""
    pg.evaluate("location.hash='#settings'")
    pg.wait_for_timeout(300)
    wq33.unlock_parent(pg)
    pg.wait_for_function('window.__T.parentAllowed()', timeout=8000)


def soft(fn):
    """Run a UI step that may legitimately not exist on the baseline build; True when it worked, never raises."""
    try:
        fn()
        return True
    except Exception:  # noqa: BLE001
        return False


def ev(pg, expr, arg=None):
    return pg.evaluate(expr, arg) if arg is not None else pg.evaluate(expr)
