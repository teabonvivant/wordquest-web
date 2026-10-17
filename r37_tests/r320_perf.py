"""R3.20 D8 - arcade performance before / after.

    WQ33_APP=<index.html> python3 r37_tests/r320_perf.py <label> <out.json>      # one pass over the 8 games for one build
    python3 r37_tests/r320_perf.py merge <perf.json> <before1.json> <after1.json> [<before2.json> <after2.json>]   # median of the passes + verdicts
Each game: 390x844 touch viewport, CDP Emulation.setCPUThrottlingRate 4, ~10 s of scripted input (keys + taps). The metric is the rAF interval
(ms): long frames (> 50 ms) and p95. The legacy engine auto-pauses on a stall > 250 ms, so a keep-alive presses 開始 again (its pauses are counted)."""
import sys, json, random, statistics, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from arc_lib import *  # noqa: E402,F401,F403

import os
IDS = os.environ.get('PERF_IDS','').split(',') if os.environ.get('PERF_IDS') else ['block-studio', 'juice-lines', 'little-engineer', 'star-patrol', 'forest-dash', 'sky-rescue', 'honeycomb-puzzle', 'valley-race']
KEYS = ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space']


def one_pass(label, out):
    res = {}
    with sync_playwright() as p:
        for gid in IDS:
            b, ctx, pg, errs = new_session(p, 390, 844, True, learn=True)
            keepalive(pg)
            cdp = ctx.new_cdp_session(pg)
            try:
                start_game(pg, gid); pg.wait_for_timeout(800)
                pg.evaluate("""()=>{window.__f=[];window.__lf=0;let l=performance.now();const f=t=>{window.__f.push(t-l);l=t;requestAnimationFrame(f)};requestAnimationFrame(f);
                  try{new PerformanceObserver(l=>{for(const e of l.getEntries())window.__lf++}).observe({type:'long-animation-frame',buffered:false})}catch(_){}}""")
                cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4})
                random.seed(3)
                t0 = time.time()
                while time.time() - t0 < 10:
                    k = random.choice(KEYS)
                    pg.keyboard.down(k); pg.wait_for_timeout(random.randint(60, 220)); pg.keyboard.up(k)
                    if random.random() < .3:
                        pg.touchscreen.tap(random.randint(30, 360), random.randint(120, 420))
                f = pg.evaluate("window.__f"); lf = pg.evaluate("window.__lf")
                cdp.send('Emulation.setCPUThrottlingRate', {'rate': 1})
                f = sorted(f[5:])
                res[gid] = {'frames': len(f), 'long50': sum(1 for x in f if x > 50), 'p95': round(f[int(len(f) * .95)], 1), 'median': round(statistics.median(f), 1), 'loaf': lf,
                            'errors': len(errs)}
            except Exception as e:
                res[gid] = {'error': repr(e)[:160]}
            finally:
                b.close()
            print(label, gid, res[gid])
    Path(out).write_text(json.dumps({'label': label, 'games': res}, indent=1))


def merge(out, files):
    runs = [json.loads(Path(f).read_text()) for f in files]
    by = {}
    for r in runs:
        for gid, m in r['games'].items():
            by.setdefault(r['label'], {}).setdefault(gid, []).append(m)
    rep = {'method': 'CPU throttle x4, 390x844 touch viewport, 10 s scripted input per pass, rAF intervals; median of the passes, before and after alternated', 'games': {}, 'verdict': {}}
    ok = True
    for gid in IDS:
        row = {}
        for lab in ('before', 'after'):
            ms = [m for m in by.get(lab, {}).get(gid, []) if 'p95' in m]
            row[lab] = {'long50': statistics.median([m['long50'] for m in ms]) if ms else None, 'p95': statistics.median([m['p95'] for m in ms]) if ms else None,
                        'median': statistics.median([m['median'] for m in ms]) if ms else None, 'passes': len(ms)}
        b, a = row['before'], row['after']
        good = bool(b['p95'] is not None and a['p95'] is not None and a['long50'] <= b['long50'] + 1 and a['p95'] <= b['p95'] * 1.15 + 2)
        row['pass'] = good; ok = ok and good
        rep['games'][gid] = row
    rep['verdict'] = {'all_pass': ok}
    Path(out).write_text(json.dumps(rep, indent=1, ensure_ascii=False))
    print(json.dumps(rep['verdict']), out)


if __name__ == '__main__':
    if sys.argv[1] == 'merge':
        merge(sys.argv[2], sys.argv[3:])
    else:
        one_pass(sys.argv[1], sys.argv[2])
