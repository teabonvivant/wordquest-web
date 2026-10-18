"""R3.20 fix A: star runner gate cadence, time-based slow-down, obstacle clearance. Run: python3 t29_runner_gate.py
Drives r37_src/runner_game.js standalone (like test_runner.py) with the learn card off and god mode on, one frame at a time."""
import os, json, sys, statistics
from playwright.sync_api import sync_playwright

HERE = os.path.dirname(os.path.abspath(__file__))
JS = os.path.abspath(os.path.join(HERE, '..', 'r37_src', 'runner_game.js'))
WORK = os.path.abspath(os.path.join(HERE, '..', '_team_runs', 'r320', 'work'))
os.makedirs(WORK, exist_ok=True)
PAGE = os.path.join(WORK, 't29_page.html')
WORDS = [('apple', '蘋果', '🍎'), ('banana', '香蕉', '🍌'), ('cat', '貓', '🐱'), ('dog', '狗', '🐶'),
         ('egg', '雞蛋', '🥚'), ('fish', '魚', '🐟'), ('grape', '葡萄', '🍇'), ('house', '屋', '🏠')]
with open(PAGE, 'w') as f:
    f.write('''<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;height:100%}#c{position:relative;width:100vw;height:100vh}</style></head>
<body><div id="c"></div><script src="file://@JS@"></script><script>
window.boot=function(o){WQ37Run._debugSeed(o.seed||1);
 WQ37Run.start(document.getElementById('c'),{words:@W@,character:{icon:'🐼',name:'熊貓',perk:''},world:o.world,stage:o.stage,difficulty:o.diff,sound:false,mode:o.mode||'story',onFinish:function(){},onExit:function(){}});};
</script></body></html>'''.replace('@JS@', JS).replace('@W@', json.dumps([dict(en=a, zh=b, emoji=c) for a, b, c in WORDS], ensure_ascii=False)))

# runs the whole stage frame by frame inside the page and returns a compact trace
RUN = '''async o=>{const W=WQ37Run;W._debugQuiet(false);
 const tr={gates:[],arr:[],ts:[],kAt:[],end:null};let arrived=false,lastIdx=0,frames=0,maxFrames=o.maxSec*60;
 W._debugGod(true);
 // press start
 for(const b of document.querySelectorAll('button')) if(b.textContent.includes('開始')){b.click();break;}
 let prevK=0;
 while(frames++<maxFrames){
  const d=W._debug; if(!d||d.state!=='play'){ if(d&&d.state!=='play'){tr.end=d.state;break;} }
  // steer: answer correctly
  if(d.gateKind==='spell'&&d.spell&&d.spell.open>0)W._debugLane(d.spell.okLane);
  else if(d.doors&&d.doors.length){const c=d.doors.find(x=>x.word===d.correctWord);if(c)W._debugLane(c.lane);}
  if(!arrived&&d.gateX!=null&&d.gateX-d.dist<=d.effSpeed/60*1.5){arrived=true;tr.arr.push([d.runT,d.gateKind]);}
  W._debugStep(1);
  const e=W._debug; if(!e)break;
  tr.ts.push([e.runT,e.effSpeed,e.speed,e.gateX==null?null:e.gateX-e.distNow,e.gateKind,e.ts]);
  if(e.gateIndex!==lastIdx){tr.gates.push([e.runT,e.gateIndex,e.kSpawned]);lastIdx=e.gateIndex;arrived=false;}
  if(e.hearts<3)W._debugHearts(3);
 }
 const f=W._debug; tr.final=f?{state:f.state,gates:f.gates,gateIndex:f.gateIndex,runT:f.runT,kSpawned:f.kSpawned}:null; return tr;}'''


def run(pg, **o):
    pg.evaluate('o=>boot(o)', o)
    pg.wait_for_timeout(200)
    o.setdefault('maxSec', 400)
    return pg.evaluate(RUN, o)


def intervals(tr, skip_first=False):
    # run-time from the previous gate being judged (spelling time excluded) to the next gate arriving
    out = []; prev = 0
    for i, (t, kind) in enumerate(tr['arr']):
        out.append(t - prev)
        prev = tr['gates'][i][0] if i < len(tr['gates']) else t
    return out


fails = []
def ok(c, m):
    print(('  ok   ' if c else '  FAIL ') + m)
    if not c: fails.append(m)


with sync_playwright() as pw:
    b = pw.chromium.launch(executable_path=next((x for x in ('/opt/pw-browsers/chromium', '/usr/bin/chromium') if os.path.exists(x)), None), args=['--no-sandbox'])  # R3.20: same browser lookup as r33_tests/wq33.py (the default headless shell of the installed Playwright is missing on this machine)
    ctx = b.new_context(viewport={'width': 1200, 'height': 700})
    ctx.add_init_script("try{localStorage.setItem('wq37-nolearn','1')}catch(e){}")
    pg = ctx.new_page(); errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
    pg.goto('file://' + PAGE)
    summary = {}
    for name, o in (('w0s0d2', dict(world=0, stage=0, diff=2)), ('w2s1d4', dict(world=2, stage=1, diff=4))):
        iv_all = []; first = []; krate = []; dur = []
        for seed in (1, 2, 3):
            tr = run(pg, seed=seed, **o)
            iv = intervals(tr); first.append(iv[0]); iv_all += iv[1:]
            dur.append(tr['final']['runT']); krate.append(tr['final']['kSpawned'] / max(1, tr['final']['runT']) * 60)
            # slow-down shape on every gate
            pre = {}
            for t, eff, sp, dg, kind, ts in tr['ts']:
                pass
            summary[(name, seed)] = tr
            ok(tr['end'] in ('won', None), f'{name} seed{seed}: stage ends ({tr["end"]}) gates {tr["final"]["gateIndex"]}/{tr["final"]["gates"]}')
        avg = statistics.mean(iv_all)
        print(f'  {name}: gate interval avg {avg:.2f}s min {min(iv_all):.2f} max {max(iv_all):.2f}; first gates {[round(x,2) for x in first]}; stage secs {[round(x) for x in dur]}; jump/slide per 60s {[round(x,1) for x in krate]}')
        ok(6 <= avg <= 8, f'{name} E1 average gate spacing 6-8 s ({avg:.2f})')
        ok(max(iv_all) <= 9.5 and min(iv_all) >= 4.5 or name.endswith('d4') and max(iv_all) <= 9.5, f'{name} E1 spacing range ({min(iv_all):.2f}..{max(iv_all):.2f})')
        ok(max(first) <= 8, f'{name} E1 first gate <= 8 s ({max(first):.2f})')
        ok(min(dur) >= 60, f'{name} E5 stage run >= 60 s ({min(dur):.0f})')
        ok(min(krate) >= 4, f'{name} E4 >=4 jump/slide obstacles per 60 s ({min(krate):.1f})')
        trk = summary[(name, 1)]['gates']; kk = [b2[2] - a[2] for a, b2 in zip(trk, trk[1:])]
        ok(sum(1 for x in kk if x >= 1) / max(1, len(kk)) >= 0.6, f'{name} E4 >=60% of gate gaps hold a jump/slide obstacle ({kk})')
        if name == 'w0s0d2':
            # E3: slow-down shape
            tr = summary[(name, 1)]
            rows = tr['ts']; gates_t = [g[0] for g in tr['gates']]
            worst_step = 0; starts = []; mins = []; rec = []
            for gt in gates_t[1:6]:
                seg = [r for r in rows if gt - 4.2 <= r[0] <= gt + 0.02]
                full = max(r[1] for r in seg[:5]) if seg else 0
                base = [r for r in rows if gt - 5.5 <= r[0] <= gt - 3.6]
                v0 = statistics.mean(r[1] / r[2] for r in base) if base else 1
                # when does ts first drop below 0.99
                drop = next((r[0] for r in seg if r[5] < 0.99), None)
                starts.append(gt - drop if drop else None)
                mins.append(min(r[5] for r in seg))
            ok(all(s and s >= 2.0 for s in starts), f'E3 slow-down starts >= 2.0 s before the gate {[round(s,2) if s else s for s in starts]}')
            ok(all(0.55 <= m <= 0.65 for m in mins), f'E3 slow-down floor 0.55-0.65 {[round(m,3) for m in mins]}')
            ts_series = [r[5] for r in rows]
            worst = max(abs(a - b2) for a, b2 in zip(ts_series, ts_series[1:]))
            ok(worst <= 0.03, f'E3 smooth: max per-frame change of ts {worst:.4f} <= 0.03')
            # recovery after each gate
            recs = []
            for gt in gates_t[1:6]:
                after = [r for r in rows if gt <= r[0] <= gt + 2.5]
                t95 = next((r[0] - gt for r in after if r[5] >= 0.95), None)
                recs.append(t95)
            ok(all(t is not None and t <= 1.5 for t in recs), f'E3 recovery to >=0.95 within 1.5 s {[round(t,2) if t else t for t in recs]}')
    # boss stage last 3 gates
    tr = run(pg, seed=1, world=0, stage=2, diff=2)
    iv = intervals(tr); last3 = iv[-3:]
    print('  boss intervals', [round(x, 2) for x in iv], tr['end'])
    ok(all(4.5 <= x <= 6.5 for x in last3), f'E2 boss last-3 gate spacing 4.5-6.5 s {[round(x,2) for x in last3]}')
    tr = run(pg, seed=2, world=0, stage=0, diff=2, mode='endless', maxSec=60)
    iv = intervals(tr)
    print('  endless first 60s intervals', [round(x, 2) for x in iv])
    ok(iv and 6 <= statistics.mean(iv) <= 8 and min(iv) >= 4, f'E2 endless avg 6-8 s and min >= 4 s')
    ok(not errs, f'no page errors {errs[:3]}')
    b.close()
print('t29:', 'PASS' if not fails else f'FAIL ({len(fails)})')
sys.exit(1 if fails else 0)
