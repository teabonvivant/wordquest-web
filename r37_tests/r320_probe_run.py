"""R3.20 probe runner: measure the play / learn / result states of the arcade games with arc_probe.js (no screenshots unless SHOTS is set).

    WQ33_APP=<index.html> python3 r37_tests/r320_probe_run.py <out.json> [ids] [sizes] [states]
sizes: small,phone,land,desk,tablet (default the first four); states: play,learn,result (default all three).
result = pgGame.end() (the same call t28 B6 uses); learn = WQArcPlus._force('learn'); play = natural play for ~3 s."""
import sys, os, json, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from arc_lib import *  # noqa: E402,F401,F403

PROBE = Path(__file__).resolve().parent / 'arc_probe.js'
SIZES = {'small': (360, 640), 'phone': (390, 844), 'land': (844, 390), 'desk': (1440, 900), 'tablet': (768, 1024)}


def probe(pg, state):
    pg.evaluate('window.scrollTo(0,0)')
    return pg.evaluate("(s)=>window.__arcProbe({state:s})", state)


def run(out, ids, sizes, states, shots=None, hi_score=False):
    res = {}
    with sync_playwright() as p:
        for sz in sizes:
            w, h = SIZES[sz]
            touch = w < 900 or h < 500
            b, ctx, pg, errs = new_session(p, w, h, touch, learn=True)
            keepalive(pg)
            for gid in ids:
                key = f'{gid}|{sz}'
                try:
                    start_game(pg, gid)
                    pg.add_script_tag(path=str(PROBE))
                    pg.wait_for_timeout(2600)
                    ensure_play(pg)
                    if hi_score:
                        pg.evaluate("(c)=>window.__r37(c)", "pgGame.score=99999")
                        pg.wait_for_timeout(300)
                    r = {}
                    if 'play' in states:
                        r['play'] = probe(pg, 'play')
                        if shots:
                            pg.screenshot(path=str(Path(shots) / f'{gid}__{sz}__play.jpg'), type='jpeg', quality=82)
                    if 'learn' in states:
                        pg.evaluate("(c)=>window.__r37(c)", "WQArcPlus._force('learn')")
                        pg.wait_for_timeout(600)
                        r['learn'] = probe(pg, 'learn')
                        if shots:
                            pg.screenshot(path=str(Path(shots) / f'{gid}__{sz}__learn.jpg'), type='jpeg', quality=82)
                    if 'result' in states:
                        pg.evaluate("(c)=>window.__r37(c)", "(()=>{WQArcPlus._force('god',false);return 1})()")
                        pg.evaluate("(c)=>window.__r37(c)", "pgGame.end('測試結束','測試')")
                        try:
                            pg.wait_for_selector('#pg-overlay .a28-overlaycard', timeout=15000)
                        except Exception:
                            pass
                        pg.wait_for_timeout(1000)
                        r['result'] = probe(pg, 'result')
                        if shots:
                            pg.screenshot(path=str(Path(shots) / f'{gid}__{sz}__result.jpg'), type='jpeg', quality=82)
                    res[key] = r
                except Exception as e:
                    res[key] = {'error': repr(e)[:200]}
                    print('  fail', key, repr(e)[:140])
                Path(out).write_text(json.dumps(res, ensure_ascii=False))
            res[f'_errs|{sz}'] = errs[:5]
            b.close()
            print('done', sz, flush=True)
    Path(out).write_text(json.dumps(res, ensure_ascii=False))
    return res


def verdict(r, state):
    """short list of problems found by the probe for one state"""
    bad = []
    if r.get('hscroll'): bad.append('hscroll')
    if r.get('vscroll'): bad.append(f"vscroll {r['sy']}>{r['H']}")
    if r.get('outside'): bad.append('outside:' + ','.join(f"{o['el']}[{o['t']:.0f}-{o['b']:.0f}]" for o in r['outside'][:3]))
    if r.get('clipped'): bad.append('clipped:' + ','.join(o['txt'] for o in r['clipped'][:3]))
    if r.get('innerScroll'): bad.append('innerScroll')
    if r.get('lowText'): bad.append('lowText:' + ','.join(f"{o['txt']}({o['contrast']})" for o in r['lowText'][:3]))
    lo = [b for b in r.get('buttons', []) if not b['disabled'] and (b['contrast'] < 4.5 or b['lines'] > 1)]
    if lo: bad.append('btn:' + ','.join(f"{b['txt']}({b['contrast']},{b['lines']})" for b in lo[:3]))
    if state == 'play' and r.get('dupStats'): bad.append('dup:' + ','.join(r['dupWhere'][:2]))
    ov = r.get('overlaps') or {}
    for k in ('bb', 'bt', 'cov', 'card', 'pad', 'edge'):
        if ov.get(k): bad.append(f"ov-{k}:" + ';'.join('/'.join(map(str, x)) for x in ov[k][:3]))
    return bad


if __name__ == '__main__':
    out = sys.argv[1]
    ids = sys.argv[2].split(',') if len(sys.argv) > 2 and sys.argv[2] != 'all' else ALL_IDS
    sizes = sys.argv[3].split(',') if len(sys.argv) > 3 else ['small', 'phone', 'land', 'desk']
    states = sys.argv[4].split(',') if len(sys.argv) > 4 else ['play', 'learn', 'result']
    shots = os.environ.get('SHOTS')
    if shots: Path(shots).mkdir(parents=True, exist_ok=True)
    res = run(out, ids, sizes, states, shots, os.environ.get('HI_SCORE') == '1')
    n = 0
    for k, v in res.items():
        if k.startswith('_'): continue
        for st, r in v.items():
            if st == 'error': print('ERR', k, r); n += 1; continue
            b = verdict(r, st)
            if b: n += 1; print(k, st, b)
    print('problems:', n)
