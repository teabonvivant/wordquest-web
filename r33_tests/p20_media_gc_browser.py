"""R3.3 p20 / WQ32-02: IndexedDB media of a deleted child (image:/note:) must not survive or be exported.

Run:  WQ33_APP=<index.html> python3 r33_tests/p20_media_gc_browser.py   (default app/index.html)
Real Chromium and real IndexedDB (wordquest-media-v13/assets). The only injected fault is a one-shot wrapper that makes
readwrite transactions on the media database throw (p20_util.mediaWriteFault).
"""
import json
import time
from pathlib import Path
import p20_util as U
from p20_util import require, sync_playwright

U.build_copy()
R = U.Reporter('p20 media GC (WQ32-02)')
ERRS = []

SEED_MEDIA = """async ids=>{const rows=[];for(const [id,en] of ids){rows.push({key:'image:'+id+':'+en,kind:'image',blob:__T.png(),source:'t'},{key:'note:'+id+':'+en,kind:'note',textOnly:true});}
 rows.push({key:'audio:en-GB:apple',kind:'audio',blob:new Blob([new Uint8Array(64)],{type:'audio/wav'}),locale:'en-GB',verified:true});await __T.putMedia(rows);return rows.length;}"""


def new(p):
    b, ctx, pg, errs = U.boot(p)
    ERRS.extend(errs)
    pg.dstate = {'accept': True}
    pg.on('dialog', lambda d: d.accept() if pg.dstate['accept'] else d.dismiss())
    U.unlock(pg)
    return b, pg


def seed(pg):
    """Child A (active; apple, banana) and child B (cherry), image+note for every word and one shared audio row."""
    a = pg.evaluate("__T.db().children[0].id")
    wa1 = pg.evaluate("__T.addWord('apple').id")
    wa2 = pg.evaluate("__T.addWord('banana').id")
    bch = pg.evaluate("__T.addChild('小華')")
    wb = pg.evaluate("(c)=>__T.addWord('cherry',c).id", bch)
    pg.evaluate(SEED_MEDIA, [[wa1, 'apple'], [wa2, 'banana'], [wb, 'cherry']])
    return dict(a=a, b=bch, wa=[wa1, wa2], wb=wb)


def keys(pg):
    return sorted(m['key'] for m in pg.evaluate('__T.media()'))


def of_words(ks, ids):
    return [k for k in ks if any(k.startswith(('image:%s:' % i, 'note:%s:' % i)) for i in ids)]


def wait_until(pg, expr_fn, timeout=9.0):
    end = time.time() + timeout
    while time.time() < end:
        if expr_fn():
            return True
        pg.wait_for_timeout(250)
    return False


def delete_child_ui(pg, cid):
    pg.evaluate("location.hash='#children'")
    pg.wait_for_timeout(400)
    pg.click('[data-act="delete-child"][data-id="%s"]' % cid, timeout=5000)
    pg.wait_for_timeout(300)


with sync_playwright() as p:
    # ------------------------------------------------------------ 1. delete a child through the real button
    b, pg = new(p)
    s = seed(pg)
    R.check('G0 seed: 6 image/note rows + 1 shared audio row exist', lambda: require(len(keys(pg)) == 7, str(keys(pg))))
    delete_child_ui(pg, s['a'])
    R.check('G1 the child and its words are gone from the family data', lambda: require(all(c['id'] != s['a'] for c in pg.evaluate('__T.db().children')) and not [w for w in pg.evaluate('__T.db().words') if w['childId'] == s['a']]))
    R.check('G2 IndexedDB holds no image/note of the deleted child', lambda: require(wait_until(pg, lambda: not of_words(keys(pg), s['wa'])), str(keys(pg))))
    R.check('G3 the other child\'s media is untouched', lambda: require(len(of_words(keys(pg), [s['wb']])) == 2, str(keys(pg))))
    R.check('G4 account-shared audio is untouched', lambda: require('audio:en-GB:apple' in keys(pg)))
    R.check('G5 the tombstone is cleared after a successful cleanup', lambda: require(wait_until(pg, lambda: not of_words(keys(pg), s['wa']) and pg.evaluate('__T.tomb()') is None), str(pg.evaluate('__T.tomb()'))))
    b.close()

    # ------------------------------------------------------------ 2. export / restore hide orphans (and old dirty data)
    b, pg = new(p)
    s = seed(pg)
    pg.evaluate("async()=>{await __T.putMedia([{key:'image:w_ghost:old',kind:'image',blob:__T.png()},{key:'note:w_ghost:old',kind:'note',textOnly:true}]);return 1;}")
    R.check('E0 dirty data from an older version exists in IndexedDB (reproduction)', lambda: require('image:w_ghost:old' in keys(pg)))
    exp = pg.evaluate('__T.exportTry()')
    R.check('E1 export succeeds', lambda: require(exp.get('ok'), str(exp)))
    R.check('E2 export contains no orphan image/note', lambda: require(not [k for k in exp['keys'] if 'w_ghost' in k], str(exp.get('keys'))))
    R.check('E3 export keeps every live image/note and the shared audio', lambda: require(len(exp['keys']) == 7 and 'audio:en-GB:apple' in exp['keys'], str(exp['keys'])))
    with pg.expect_download() as dl:
        pg.evaluate('__T.exportPack().then(()=>0)')
    payload = json.loads(Path(dl.value.path()).read_bytes())['payload']
    dirty = json.loads(json.dumps(payload))
    have = {m['key'] for m in dirty['media']}  # the baseline export already carries them: add only what is missing
    dirty['media'] += [m for m in ({'key': 'image:w_ghost:old', 'kind': 'image', 'meta': {}, 'mime': 'image/png', 'data': 'data:image/png;base64,iVBORw0KGgo='},
                                   {'key': 'note:w_ghost:old', 'kind': 'note', 'meta': {'textOnly': True}}) if m['key'] not in have]
    msg = pg.evaluate('(x)=>__T.restore(x)', dirty)
    R.check('E4 restoring a backup that carries orphans succeeds', lambda: require(msg == '', msg))
    R.check('E5 after the restore IndexedDB has no orphan and all live media', lambda: require(len(keys(pg)) == 7 and not [k for k in keys(pg) if 'w_ghost' in k], str(keys(pg))))
    b.close()

    # ------------------------------------------------------------ 3. IndexedDB failure: tombstone, no data loss, retry
    b, pg = new(p)
    s = seed(pg)
    pg.evaluate('__T.mediaWriteFault(true)')
    pg.evaluate('(id)=>__T.deleteChildRaw(id)', s['a'])
    pg.wait_for_timeout(1500)
    R.check('F1 cleanup failed: the deletion itself still went through', lambda: require(all(c['id'] != s['a'] for c in pg.evaluate('__T.db().children'))))
    R.check('F2 cleanup failed: media rows are still there (nothing half-deleted)', lambda: require(len(of_words(keys(pg), s['wa'])) == 4, str(keys(pg))))
    tomb = json.loads(pg.evaluate('__T.tomb()') or '{}')
    R.check('F3 cleanup failed: a tombstone lists the deleted word ids', lambda: require(tomb.get('v') == 1 and set(s['wa']) <= set(tomb.get('ids', [])) and all(i not in tomb['ids'] for i in [s['wb']]), str(tomb)[:200]))
    R.check('F4 the other child\'s data and media are untouched', lambda: require(len(of_words(keys(pg), [s['wb']])) == 2 and any(w['id'] == s['wb'] for w in pg.evaluate('__T.db().words'))))
    pg.evaluate('__T.parentFor(60000)')
    exp = pg.evaluate('__T.exportTry()')
    R.check('F5 export during the pending cleanup already hides the orphans', lambda: require(exp.get('ok') and not of_words(exp['keys'], s['wa']) and len(exp['keys']) == 3, str(exp)))
    pg.evaluate('__T.mediaWriteFault(false)')
    pg.evaluate('__T.gcBackoffReset()')
    R.check('F6 the timer retry removes the rows once IndexedDB works again', lambda: require(wait_until(pg, lambda: not of_words(keys(pg), s['wa']), 12), str(keys(pg))))
    R.check('F7 and then the tombstone is cleared', lambda: require(not of_words(keys(pg), s['wa']) and wait_until(pg, lambda: pg.evaluate('__T.tomb()') is None), str(pg.evaluate('__T.tomb()'))))
    b.close()

    b, pg = new(p)
    s = seed(pg)
    pg.evaluate('__T.mediaWriteFault(true)')
    pg.evaluate('(id)=>__T.deleteChildRaw(id)', s['a'])
    pg.wait_for_timeout(800)
    R.check('F8 pending tombstone survives until the page is reloaded', lambda: require(pg.evaluate('__T.tomb()') is not None and len(of_words(keys(pg), s['wa'])) == 4))
    pg.reload()
    pg.wait_for_timeout(1500)
    R.check('F9 after a reload the cleanup is retried and succeeds', lambda: require(wait_until(pg, lambda: not of_words(keys(pg), s['wa']), 14) and pg.evaluate('__T.tomb()') is None, str(keys(pg))))
    b.close()

    # ------------------------------------------------------------ 4. a deletion that does not happen must not clean anything
    b, pg = new(p)
    s = seed(pg)
    pg.evaluate("__T.parentFor(60000)")
    pg.evaluate("__T.setMarker('prepared')")  # ordinary saves are refused, so the inner deleteChild rolls itself back
    pg.evaluate('(id)=>__T.deleteChildRaw(id)', s['a'])
    pg.wait_for_timeout(800)
    R.check('H1 failed deletion (family save refused): child, words and media all stay', lambda: require(any(c['id'] == s['a'] for c in pg.evaluate('__T.db().children')) and len(of_words(keys(pg), s['wa'])) == 4))
    R.check('H2 failed deletion leaves no tombstone behind', lambda: require(pg.evaluate('__T.tomb()') is None))
    pg.evaluate('__T.clearMarker()')
    pg.evaluate("__T.parentFor(60000)")
    pg.dstate['accept'] = False
    pg.evaluate('(id)=>__T.deleteChildRaw(id)', s['a'])
    pg.dstate['accept'] = True
    pg.wait_for_timeout(800)
    R.check('H3 cancelled confirmation: nothing deleted, no tombstone', lambda: require(any(c['id'] == s['a'] for c in pg.evaluate('__T.db().children')) and len(of_words(keys(pg), s['wa'])) == 4 and pg.evaluate('__T.tomb()') is None))
    # A tombstone that mentions a word that is still alive must never delete that word's media.
    dead = 'w_dead_1'
    pg.evaluate("async(d)=>{await __T.putMedia([{key:'image:'+d+':old',kind:'image',blob:__T.png()},{key:'note:'+d+':old',kind:'note',textOnly:true}]);return 1;}", dead)
    pg.evaluate("(a)=>localStorage.setItem('wq-r3-media-gc:'+__T.owner(),JSON.stringify({v:1,ids:a}))", [dead, s['wb'], s['wa'][0]])
    res = pg.evaluate('__T.gcNow()')
    R.check('H4 cleanup of a tombstone that also lists live word ids runs', lambda: require('err' not in res, str(res)))
    ks = keys(pg)
    R.check('H5 media of words that still exist is never removed', lambda: require(len(of_words(ks, [s['wb']])) == 2 and len(of_words(ks, s['wa'])) == 4, str(ks)))
    R.check('H6 the really deleted word\'s media is removed and the tombstone emptied', lambda: require(not of_words(ks, [dead]) and pg.evaluate('__T.tomb()') is None, str(ks)))
    b.close()

    # ------------------------------------------------------------ 5. several deletions, no media, marker blocks the timer
    b, pg = new(p)
    s = seed(pg)
    c3 = pg.evaluate("__T.addChild('小美')")
    w3 = pg.evaluate("(c)=>__T.addWord('date',c).id", c3)
    pg.evaluate("async(i)=>{await __T.putMedia([{key:'image:'+i+':date',kind:'image',blob:__T.png()}]);return 1;}", w3)
    pg.evaluate("__T.parentFor(60000)")
    pg.evaluate('(id)=>__T.deleteChildRaw(id)', s['a'])
    pg.evaluate("__T.parentFor(60000)")
    pg.evaluate('(id)=>__T.deleteChildRaw(id)', s['b'])
    R.check('M1 two quick deletions: both children\'s media removed, the third child keeps its media',
            lambda: require(wait_until(pg, lambda: not of_words(keys(pg), s['wa'] + [s['wb']])) and len(of_words(keys(pg), [w3])) == 1, str(keys(pg))))
    R.check('M2 and the tombstone ends empty', lambda: require(not of_words(keys(pg), s['wa'] + [s['wb']]) and wait_until(pg, lambda: pg.evaluate('__T.tomb()') is None)))
    b.close()

    b, pg = new(p)
    s = seed(pg)
    pg.evaluate("__T.parentFor(60000)")
    pg.evaluate('__T.mediaWriteFault(true)')
    pg.evaluate('(id)=>__T.deleteChildRaw(id)', s['a'])
    pg.wait_for_timeout(600)
    pg.evaluate('__T.mediaWriteFault(false)')
    pg.evaluate('__T.gcBackoffReset()')
    pg.evaluate("__T.setMarker('prepared')")
    pg.wait_for_timeout(6500)
    R.check('M3 while a recovery marker exists the timer does not touch IndexedDB', lambda: require(len(of_words(keys(pg), s['wa'])) == 4 and pg.evaluate('__T.tomb()') is not None))
    pg.evaluate('__T.clearMarker()')
    R.check('M4 once the marker is gone the cleanup runs', lambda: require(wait_until(pg, lambda: not of_words(keys(pg), s['wa']), 12), str(keys(pg))))
    b.close()

R.done(ERRS)
