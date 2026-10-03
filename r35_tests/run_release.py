"""Sequential R3.5 regression runner (new suites only; older suites run separately, see README_R3_5.md).

    python3 r35_tests/run_release.py            # everything, against app/index.html
    python3 r35_tests/run_release.py p40        # only jobs whose name contains 'p40'

`[B]` checks are expected to fail on the R3.4 text; r35_tests/run_behaviour.py proves that (A/B run).
Each job's output goes to r35_evidence/<name>.log; a JSON summary to r35_evidence/final_runner.json.
Browser suites must not run in parallel with other heavy browser suites (the app is a 12 MB inline page).
"""
from pathlib import Path
import json
import re
import subprocess
import sys
import time

R = Path(__file__).resolve().parents[1]
E = R / 'r35_evidence'
E.mkdir(exist_ok=True)
PY = sys.executable
JOBS = [
    ('p50-logic', 'node', 'p50_logic.cjs'),
    ('p40-ocr', 'node', 'p40_ocr.cjs'),
    ('p90-copy-text', PY, 'p90_copy_text.py'),
    ('p10-firstrun', PY, 'p10_firstrun_browser.py'),
    ('p20-lesson', PY, 'p20_lesson_browser.py'),
    ('p30-lobby', PY, 'p30_lobby.py'),
    ('p30-cards', PY, 'p30_cards.py'),
    ('p30-misc', PY, 'p30_misc.py'),
    ('p30-play', PY, 'p30_play.py'),
    ('p30-states', PY, 'p30_states.py'),
    ('p40-dictation', PY, 'p40_dictation_browser.py'),
    ('p50-browser', PY, 'p50_browser.py'),
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
                row['returncode'] = subprocess.run([exe, str(R / 'r35_tests' / file)], cwd=R, stdout=f, stderr=subprocess.STDOUT, timeout=2400).returncode
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
        print(f"{name:16s} rc={row['returncode']} pass={npass} fail={nfail} {row['seconds']}s", flush=True)
    sys.exit(1 if any(r['returncode'] != 0 for r in rows) else 0)
