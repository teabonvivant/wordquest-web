"""字母砲台 real-time frame-interval measurement (no page polling), 390x844 DPR2, 4x CPU throttle, game running by itself (2 monsters walking).
Compares: 'before' = the round-2 CSS (background-colour blink/caret animations that repaint the DOM every frame), 'after' = current build,
'control' = an empty page whose only work is a full-size static canvas blit + 5 sprite blits (same canvas size/DPR/throttle, same rAF logger).
Also counts Chrome-tracing Paint / RasterTask events per second (the cause found: per-frame DOM repaint + software raster).
Usage: python3 r37_tests/gx_fixture/td_perf_rt.py [trials=3] [secs=10]  -> r37_evidence/r321/td/perf_realtime.json"""
import sys, json, time, collections
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from lib import open_game, sync_playwright, R  # noqa: E402

OUT = R / 'r37_evidence' / 'r321' / 'td'
HOOK = "()=>{window.__fr={on:false,dt:[],last:0};function f(ts){const F=window.__fr;if(F.on){if(F.last)F.dt.push(ts-F.last);F.last=ts}requestAnimationFrame(f)}requestAnimationFrame(f)}"
OLD = '.td-slots i.n::after{display:none}.td-slots i.n{animation:tdold 1s infinite}@keyframes tdold{50%{background:rgba(255,201,74,.28)}}.td-num u{will-change:auto}.gx-key.td-hl{animation:tdold .8s infinite}'


def stats(a):
    a = sorted(a)
    return {'n': len(a), 'avg': round(sum(a) / len(a), 2), 'p95': round(a[int(len(a) * .95)], 2), 'max': round(a[-1], 1), 'over33': sum(1 for v in a if v > 33)} if a else {}


def one(p, kind, secs, rate=4, trace=False):
    size = (390, 844)
    if kind == 'control':
        b = p.chromium.launch(args=['--no-sandbox']); ctx = b.new_context(viewport=dict(width=size[0], height=size[1]), device_scale_factor=2, has_touch=True, is_mobile=True); pg = ctx.new_page()
        pg.set_content('<canvas id=c width=780 height=1688 style="position:fixed;inset:0;width:100%;height:100%"></canvas>')
        pg.evaluate("""()=>{const c=document.getElementById('c'),x=c.getContext('2d');x.scale(2,2);const st=document.createElement('canvas');st.width=780;st.height=1688;const g=st.getContext('2d');g.fillStyle='#223';g.fillRect(0,0,780,1688);
          const sp=document.createElement('canvas');sp.width=sp.height=256;const sg=sp.getContext('2d');sg.fillStyle='#4a4';sg.beginPath();sg.arc(128,128,100,0,6.3);sg.fill();
          (function loop(){x.drawImage(st,0,0,390,844);for(let i=0;i<5;i++)x.drawImage(sp,50+i*60,300+i*30,100,100);requestAnimationFrame(loop)})()}""")
    else:
        b, pg, errs = open_game(p, 'td_game.js', 'WQ37TD', 'english', 0, 5, 3, size=size, reduced=False, seed=7)
        pg.evaluate("()=>{G._S.ui.closeAll();G._cmd('begin');G._cmd('spawn');G._cmd('spawn')}")
        if kind == 'before': pg.add_style_tag(content=OLD)
        ctx = pg.context
    pg.evaluate(HOOK); pg.wait_for_timeout(800)
    cdp = ctx.new_cdp_session(pg)
    if trace: cdp.send('Tracing.start', {'categories': 'devtools.timeline,cc', 'transferMode': 'ReturnAsStream'})
    cdp.send('Emulation.setCPUThrottlingRate', {'rate': rate}); pg.evaluate("()=>{window.__fr.on=true}"); time.sleep(secs)
    fr = pg.evaluate("()=>{window.__fr.on=false;return window.__fr}"); cdp.send('Emulation.setCPUThrottlingRate', {'rate': 1})
    res = {'dt': stats(fr['dt'][5:])}
    if trace:
        done = []; cdp.on('Tracing.tracingComplete', lambda e: done.append(e)); cdp.send('Tracing.end')
        for _ in range(100):
            if done: break
            pg.wait_for_timeout(100)
        h = done[0]['stream']; buf = ''
        while True:
            r = cdp.send('IO.read', {'handle': h, 'size': 1 << 20}); buf += r.get('data', '')
            if r.get('eof'): break
        tr = json.loads(buf); tr = tr if isinstance(tr, list) else tr['traceEvents']
        c = collections.Counter(e['name'] for e in tr if e.get('ph') in ('X', 'B', 'I'))
        res['trace_per_second'] = {n: round(c[n] / secs, 1) for n in ('Paint', 'RasterTask', 'UpdateLayoutTree', 'FireAnimationFrame')}
    b.close(); return res


if __name__ == '__main__':
    trials = int(sys.argv[1]) if len(sys.argv) > 1 else 3; secs = int(sys.argv[2]) if len(sys.argv) > 2 else 10
    out = {k: [] for k in ('before', 'after', 'control')}
    with sync_playwright() as p:
        for t in range(trials):
            for k in out:
                r = one(p, 'game' if k == 'after' else k, secs); out[k].append(r); print(t, k, r['dt'], flush=True)
        out['trace'] = {k: one(p, 'game' if k == 'after' else k, 4, trace=True).get('trace_per_second') for k in ('before', 'after', 'control')}
    print('trace events per second', out['trace'])
    def agg(l): return {'over33_per_trial': [x['dt']['over33'] for x in l], 'max_per_trial': [x['dt']['max'] for x in l], 'avg_per_trial': [x['dt']['avg'] for x in l], 'p95_per_trial': [x['dt']['p95'] for x in l]}
    summ = {k: agg(out[k]) for k in ('before', 'after', 'control')}; summ['trace_events_per_second'] = out['trace']
    summ['method'] = f'{trials} trials x {secs} s, 390x844 DPR2, CDP CPU throttle 4x, in-page rAF logger, no page.evaluate polling while measuring; machine shared with other jobs (1 core), so compare within a run'
    OUT.mkdir(parents=True, exist_ok=True); (OUT / 'perf_realtime.json').write_text(json.dumps(summ, indent=1)); print(json.dumps(summ, indent=1))
