"""字母砲台 per-frame script cost (update + draw + fx) in a busy scene, 4x CPU throttle (CDP). Deterministic: G._step(1) timed with performance.now.
Reports avg / p95 / max ms over N frames for en 390x844 and math 1440x900. Raster/composite cost is NOT included (see td_perf_rt.py for real rAF intervals).
python3 r37_tests/gx_fixture/td_perf_cpu.py [out.json]"""
import sys, json
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from lib import open_game, sync_playwright, R  # noqa: E402

JS = """(N)=>{G._S.ui.closeAll();G._cmd('begin');G._cmd('spawn');G._step(200);G._cmd('spawn');G._step(200);G._cmd('spawn');G._step(120);
const a=[];for(let i=0;i<N;i++){
  if(i%25===0){G._cmd('combo',(i/25|0)%9);G._cmd('solve');}
  if(i===150)G._cmd('event','meteor'); if(i===350)G._cmd('event','freeze');
  if(i%60===30)G._cmd('spawn');
  const t=performance.now();G._step(1);a.push(performance.now()-t);}
a.sort((x,y)=>x-y);const s=a.reduce((p,c)=>p+c,0);return {n:a.length,avg:+(s/a.length).toFixed(2),p95:+a[Math.floor(a.length*.95)].toFixed(2),max:+a[a.length-1].toFixed(2)}}"""
out = {}
with sync_playwright() as p:
    for (tag, subj, size, touch) in (('p390_en', 'english', (390, 844), True), ('d1440_ma', 'math', (1440, 900), False)):
        b, pg, errs = open_game(p, 'td_game.js', 'WQ37TD', subj, 3, 6, 3, size=size, touch=touch, reduced=False, seed=7, manual=True)
        c = pg.context.new_cdp_session(pg); c.send('Emulation.setCPUThrottlingRate', {'rate': 4})
        pg.evaluate("()=>G._step(30)"); res = pg.evaluate(JS, 600); out[tag] = res; print(tag, res, errs); b.close()
if len(sys.argv) > 1: Path(sys.argv[1]).write_text(json.dumps(out, indent=1))
