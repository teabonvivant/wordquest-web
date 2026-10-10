import sys, json
from common import *
from wq33 import unlock_parent
from run_audit import click_if, click_text, SHOT, MEASURE, VPS
def shot_measure(pg, sid, name, res, opts=None):
    pg.wait_for_timeout(400); pg.evaluate("window.scrollTo(0,0)")
    try:
        m = pg.evaluate(MEASURE, opts or {})
        m['final_hash'] = pg.evaluate('location.hash'); res[sid] = m
    except Exception as ex:
        res[sid] = {'error': str(ex)[:200]}
    pg.screenshot(path=str(SHOT / f"{sid}__{name}.jpg"), type='jpeg', quality=60, scale='css')
def run(vp):
    name, w, h, touch = vp; res = {}
    with sync_playwright() as p:
        # guest
        b, ctx, pg, errs = open_page(p, w, h, touch, learn=True)
        pg.set_default_timeout(6000)
        pg.goto(URL); pg.wait_for_timeout(1500)
        shot_measure(pg, 'g-kid', name, res)
        go(pg, '#p/parent', 500); shot_measure(pg, 'g-parent', name, res)
        go(pg, '#p/dictation', 500); shot_measure(pg, 'g-dictation', name, res)
        go(pg, '#login', 600); shot_measure(pg, 'g-login', name, res)
        click_text(pg, '#app', '建立', 600); shot_measure(pg, 'g-register', name, res)
        go(pg, '#ranges', 500); shot_measure(pg, 'g-ranges', name, res)
        go(pg, '#range-new', 500); shot_measure(pg, 'g-range-new', name, res)
        b.close()
        # family account, fresh
        b, ctx, pg, errs = open_page(p, w, h, touch, learn=True)
        pg.set_default_timeout(6000)
        register(pg); pg.wait_for_timeout(600)
        shot_measure(pg, 'f-after-register', name, res)
        go(pg, '#kid', 500); shot_measure(pg, 'f-kid', name, res)
        go(pg, '#p/parent', 600); shot_measure(pg, 'f-parent-gate', name, res)
        unlock_parent(pg); pg.wait_for_timeout(600); shot_measure(pg, 'f-parent-open', name, res)
        go(pg, '#p/dictation', 500); shot_measure(pg, 'f-dictation-empty', name, res)
        go(pg, '#ranges', 500); shot_measure(pg, 'f-ranges-empty', name, res)
        go(pg, '#report', 500); shot_measure(pg, 'f-report-empty', name, res)
        go(pg, '#settings', 500); shot_measure(pg, 'f-settings', name, res)
        go(pg, '#login', 500); shot_measure(pg, 'f-login-loggedin', name, res)
        res['_errs'] = errs[:8]
        b.close()
    return res
if __name__ == '__main__':
    vp = next(v for v in VPS if v[0] == sys.argv[1])
    r = run(vp)
    Path(f'/home/workspace/wordquest-web-dev/r37_eval/ui_audit/raw_guest_{vp[0]}.json').write_text(json.dumps(r, ensure_ascii=False, indent=1))
    print('done', vp[0], len(r))
