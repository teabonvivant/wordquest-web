"""Sequential R3.6 regression runner (the new R3.6 suites).

    python3 r36_tests/run_r36.py            # everything, against app/index.html (or WQ33_APP)
    python3 r36_tests/run_r36.py t05        # only jobs whose name contains 't05'

`[B]` checks are expected to fail on the R3.5 text; r36_tests/run_behaviour36.py proves that (A/B run).
Each job's output goes to r36_evidence/<name>.log; a JSON summary to r36_evidence/final_runner.json.
Browser suites must not run in parallel with other heavy browser suites (the app is a 12 MB inline page).
"""
from pathlib import Path
import json
import re
import subprocess
import sys
import time

R = Path(__file__).resolve().parents[1]
E = R / 'r36_evidence'
E.mkdir(exist_ok=True)
PY = sys.executable
JOBS = [
    ('t01-home-brand', PY, 't01_home_brand.py'),
    ('t02-lesson-quiz', PY, 't02_lesson_quiz.py'),
    ('t03-stars-coins', PY, 't03_stars_coins.py'),
    ('t04-econ', 'node', 't04_econ.cjs'),
    ('t04-games-ui', PY, 't04_games_ui.py'),
    ('t05-time-notices', PY, 't05_time_notices.py'),
    ('t06-admin', PY, 't06_admin.py'),
]
if __name__ == '__main__':
    want = [a.lower() for a in sys.argv[1:]]
    rows = []
    for name, exe, file in JOBS:
        if want and not any(w in name for w in want):
            continue
        row = {'name': name, 'file': file, 'started': time.time()}
        rows.append(row)
        log = E / (name + '.log')
        with log.open('w') as f:
            try:
                row['returncode'] = subprocess.run([exe, str(R / 'r36_tests' / file)], cwd=R, stdout=f, stderr=subprocess.STDOUT, timeout=2400).returncode
            except subprocess.TimeoutExpired:
                row['returncode'] = 'timeout'
        text = log.read_text(errors='replace')
        nfail = len(re.findall(r'^\s*(?:\[?FAIL\]?)\b', text, re.M))
        npass = len(re.findall(r'^\s*(?:\[?PASS\]?)\b', text, re.M))
        row.update(seconds=round(time.time() - row['started'], 1), pass_lines=npass, fail_lines=nfail)
        f = E / 'final_runner.json'
        keep = [r for r in json.loads(f.read_text()) if r['name'] not in {x['name'] for x in rows}] if want and f.exists() else []
        order = [n for n, _, _ in JOBS]
        f.write_text(json.dumps(sorted(keep + rows, key=lambda r: order.index(r['name'])), indent=2))
        print(f"{name:18s} rc={row['returncode']} pass={npass} fail={nfail} {row['seconds']}s", flush=True)
    sys.exit(1 if any(r['returncode'] != 0 for r in rows) else 0)
