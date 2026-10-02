"""Sequential R3.4 regression runner (new suites only; the R3.3 and older suites run separately, see README_R3_4.md).

    python3 r34_tests/run_release.py            # everything, against app/index.html
    python3 r34_tests/run_release.py touch      # only jobs whose name contains 'touch'

`[B]` checks are expected to fail on the R3.3 text; r34_tests/run_behaviour.py proves that (A/B run).
Each job's output goes to r34_evidence/<name>.log; a JSON summary to r34_evidence/final_runner.json.
Browser suites must not run in parallel with other heavy browser suites (the app is a 12 MB inline page).
"""
from pathlib import Path
import json
import re
import subprocess
import sys
import time

R = Path(__file__).resolve().parents[1]
E = R / 'r34_evidence'
E.mkdir(exist_ok=True)
PY = sys.executable
JOBS = [
    ('engine-behaviour', 'node', 'engine_behaviour.cjs'),
    ('engine-validity', 'node', 'engine_validity.cjs'),
    ('browser-rules', PY, 'browser_rules.py'),
    ('browser-feel', PY, 'browser_feel.py'),
    ('browser-touch', PY, 'browser_touch.py'),
]
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
            row['returncode'] = subprocess.run([exe, str(R / 'r34_tests' / file)], cwd=R, stdout=f, stderr=subprocess.STDOUT, timeout=1800).returncode
        except subprocess.TimeoutExpired:
            row['returncode'] = 'timeout'
    text = log.read_text(errors='replace')
    nfail = len(re.findall(r'^\s*(?:\[?FAIL\]?)\b', text, re.M))
    npass = len(re.findall(r'^\s*(?:\[?PASS\]?)\b', text, re.M))
    row.update(seconds=round(time.time() - row['started'], 1), pass_lines=npass, fail_lines=nfail)
    (E / 'final_runner.json').write_text(json.dumps(rows, indent=2))
    print(f"{name:20s} rc={row['returncode']} pass={npass} fail={nfail} {row['seconds']}s", flush=True)
sys.exit(1 if any(r['returncode'] != 0 for r in rows) else 0)
