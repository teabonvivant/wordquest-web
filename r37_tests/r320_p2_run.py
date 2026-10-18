"""R3.20 stage 2 - one-suite-at-a-time runner: syntax + core + engine behaviour, t31, t28 (13 play games + 3 smoke), t09, t22.
Writes r37_evidence/r320/logs/p2/<name>.log and regression_p2.md (suite, result, build SHA256, start / end - the time spans never overlap).
    WQ33_APP=$PWD/app/index.html python3 r37_tests/r320_p2_run.py [name ...]"""
import hashlib, os, subprocess, sys, time
from pathlib import Path
R = Path(__file__).resolve().parents[1]
OUT = R / 'r37_evidence' / 'r320'
LOGS = OUT / 'logs' / 'p2'
LOGS.mkdir(parents=True, exist_ok=True)
T = R / 'r37_tests'
PY = sys.executable
IDS13 = 'sky-rescue,forest-dash,moon-bells,drift-path,valley-race,ruins-courier,cloud-island,star-patrol,lighthouse-well,bounce-basket,forest-pong,meadow-cricket,harbor-volley'
JOBS = [
    ('arcade-syntax', [PY, str(R / 'arcade_tests' / 'syntax_check.py')], {}, 900),
    ('arcade-core-tests', ['node', str(R / 'arcade_tests' / 'core_tests.cjs')], {}, 1800),
    ('engine-behaviour', ['node', str(R / 'r34_tests' / 'engine_behaviour.cjs')], {}, 1800),
    ('t31-play-answer', [PY, str(T / 't31_play_answer.py')], {}, 3600),
    ('t28-arcade', [PY, str(T / 't28_arcade_r320.py')], {'T28_IDS': IDS13 + ',honey-delivery,number-garden,forest-band'}, 9000),
    ('t09-arcade', [PY, str(T / 't09_arcade.py')], {}, 3000),
    ('t22-game-polish', [PY, str(T / 't22_game_polish.py')], {'T22_SHOTS': str(R / '_team_runs' / 'r320-p2' / 'work' / 't22_shots')}, 3000),
]
app = Path(os.environ.get('WQ33_APP') or (R / 'app' / 'index.html'))
sha = hashlib.sha256(app.read_bytes()).hexdigest()
only = sys.argv[1:]
rows = []
for name, argv, env, to in JOBS:
    if only and name not in only:
        continue
    t0 = time.time(); s0 = time.strftime('%H:%M:%S')
    with open(LOGS / f'{name}.log', 'w') as f:
        try:
            r = subprocess.run(argv, cwd=R, env={**os.environ, **env}, stdout=f, stderr=subprocess.STDOUT, timeout=to)
            rc = r.returncode
        except subprocess.TimeoutExpired:
            rc = 'timeout'
    rows.append((name, 'PASS' if rc == 0 else f'FAIL({rc})', s0, time.strftime('%H:%M:%S'), round(time.time() - t0)))
    print(rows[-1], flush=True)
    md = ['# R3.20 stage 2 regression (one suite at a time)', '', f'build `{app}` sha256 `{sha}`', '', '| suite | result | start | end | seconds |', '|---|---|---|---|---|']
    md += [f'| {a} | {b} | {c} | {d} | {e} |' for a, b, c, d, e in rows]
    (OUT / ('regression_p2.md' if not only else 'regression_p2_partial.md')).write_text('\n'.join(md) + '\n')
