"""Sequential R3.3 regression runner (new suites only; run the legacy runners separately, see README_R3_3.md).

    python3 r33_tests/run_release.py            # everything
    python3 r33_tests/run_release.py layout     # only jobs whose name contains 'layout'

Each job's output goes to r33_evidence/<name>.log; a JSON summary to r33_evidence/final_runner.json.
Browser suites must not run in parallel with other heavy browser suites (the app is a 12 MB inline page).
"""
from pathlib import Path
import subprocess, json, time, sys, re

R = Path(__file__).resolve().parents[1]
E = R / 'r33_evidence'
E.mkdir(exist_ok=True)
PY = sys.executable
JOBS = [
    ('p20-pure', 'node', 'p20_pure.cjs'),
    ('p30-speech-limit', 'node', 'p30_speech_limit.mjs'),
    ('p30-static-cache', 'node', 'p30_static_cache.mjs'),
    ('p30-pwa', PY, 'p30_pwa_browser.py'),
    ('p20-rescue', PY, 'p20_rescue_browser.py'),
    ('p20-media-gc', PY, 'p20_media_gc_browser.py'),
    ('p20-gate-dialog', PY, 'p20_gate_dialog_browser.py'),
    ('p40-arcade-overlay', PY, 'p40_arcade_overlay.py'),
    ('p40-sfx', PY, 'p40_sfx.py'),
    ('p40-library-checkbox', PY, 'p40_library_checkbox.py'),
    ('p10-layout', PY, 'test_layout.py'),
    ('p10-hit-test', PY, 'hit_test.py'),
    ('p50-learning-account', PY, 'test_p50_learning_account.py'),
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
            row['returncode'] = subprocess.run([exe, str(R / 'r33_tests' / file)], cwd=R, stdout=f, stderr=subprocess.STDOUT, timeout=1800).returncode
        except subprocess.TimeoutExpired:
            row['returncode'] = 'timeout'
    text = log.read_text(errors='replace')
    nfail = len(re.findall(r'^\s*(?:\[?FAIL\]?)\b', text, re.M))
    npass = len(re.findall(r'^\s*(?:\[?PASS\]?)\b', text, re.M))
    row.update(seconds=round(time.time() - row['started'], 1), pass_lines=npass, fail_lines=nfail)
    (E / 'final_runner.json').write_text(json.dumps(rows, indent=2))
    print(f"{name:24s} rc={row['returncode']} pass={npass} fail={nfail} {row['seconds']}s", flush=True)
sys.exit(1 if any(r['returncode'] != 0 for r in rows) else 0)
