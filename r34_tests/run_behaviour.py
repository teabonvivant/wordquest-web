"""A/B proof for the R3.4 behaviour suites: every `[B]` check must FAIL on the R3.3 text and PASS on R3.4.

    python3 r34_tests/run_behaviour.py [--out DIR] [--only engine,touch,rules,feel]

1. builds the R3.3 text (`build_r34.py --base-only`) and the full R3.4 text into a scratch directory,
2. runs each suite against both builds (node suites read WQ34_APP, browser suites read WQ33_APP),
3. fails when a `[B]` check passes on R3.3 (it proves nothing), when any check fails on R3.4,
   or when a non-`[B]` check fails on R3.3 (a regression guard that was already broken).

Browser suites run one after the other (the app is a 12 MB inline page).
Writes r34_evidence/ab_summary.json and prints one `PASS`/`FAIL` line per suite.
"""
import json
import re
import subprocess
import sys
import tempfile
import time
from pathlib import Path

R = Path(__file__).resolve().parents[1]
E = R / 'r34_evidence'
PY = sys.executable
SUITES = [
    ('engine', 'node', 'engine_behaviour.cjs', 'WQ34_APP'),
    ('validity', 'node', 'engine_validity.cjs', 'WQ34_APP'),
    ('rules', PY, 'browser_rules.py', 'WQ33_APP'),
    ('feel', PY, 'browser_feel.py', 'WQ33_APP'),
    ('touch', PY, 'browser_touch.py', 'WQ33_APP'),
]
LINE = re.compile(r'^(PASS|FAIL)( \[B\])? (.*?)(?: (?:::|\|) .*)?$')


def run(exe, file, env_name, app, timeout=1800):
    import os
    env = dict(os.environ, **{env_name: str(app)})
    p = subprocess.run([exe, str(R / 'r34_tests' / file)], cwd=R, env=env, capture_output=True, text=True, timeout=timeout)
    rows = {}
    for line in (p.stdout + p.stderr).splitlines():
        m = LINE.match(line.strip())
        if m and not m.group(3).startswith(('behaviour summary', 'validity:')):
            rows[m.group(3)] = (m.group(1) == 'PASS', bool(m.group(2)))
        elif m:
            rows[m.group(3)[:40]] = (m.group(1) == 'PASS', False)
    return rows, p.returncode


def main():
    only = None
    if '--only' in sys.argv:
        only = set(sys.argv[sys.argv.index('--only') + 1].split(','))
    out = Path(tempfile.mkdtemp(prefix='wq34_ab_')) if '--out' not in sys.argv else Path(sys.argv[sys.argv.index('--out') + 1])
    base, new = out / 'r33', out / 'r34'
    for args, d in ((['--base-only'], base), ([], new)):
        subprocess.run([PY, str(R / 'tools/build_r34.py'), *args, '--out', str(d)], cwd=R, check=True, capture_output=True)
    base_app, new_app = base / 'app/index.html', new / 'app/index.html'
    summary = []
    bad = 0
    for name, exe, file, env in SUITES:
        if only and name not in only:
            continue
        t0 = time.time()
        rn, _ = run(exe, file, env, new_app)
        rb, _ = run(exe, file, env, base_app)
        proves = [k for k, (ok, b) in rn.items() if b and k in rb and not rb[k][0]]
        vacuous = [k for k, (ok, b) in rn.items() if b and (k not in rb or rb[k][0])]
        new_fail = [k for k, (ok, b) in rn.items() if not ok]
        base_guard_broken = [k for k, (ok, b) in rb.items() if not b and not ok]
        # [B] checks that crash the whole R3.3 suite before they run count as "fail on base" (nothing passed there)
        crashed = [k for k in vacuous if k not in rb]
        vacuous = [k for k in vacuous if k in rb]
        ok = not new_fail and not vacuous
        bad += 0 if ok else 1
        row = dict(suite=name, newChecks=len(rn), newFailed=new_fail, bChecks=sum(1 for v in rn.values() if v[1]),
                   bFailOnR33=len(proves) + len(crashed), bPassOnR33=vacuous, guardsBrokenOnR33=base_guard_broken,
                   seconds=round(time.time() - t0))
        summary.append(row)
        print(f"{'PASS' if ok else 'FAIL'} A/B {name}: R3.4 {len(rn) - len(new_fail)}/{len(rn)} pass; "
              f"[B] checks failing on R3.3: {row['bFailOnR33']}/{row['bChecks']}; [B] passing on R3.3: {len(vacuous)}; "
              f"{row['seconds']}s", flush=True)
        for k in new_fail[:8]:
            print('   new FAIL:', k)
        for k in vacuous[:8]:
            print('   [B] passes on R3.3 (proves nothing):', k)
    E.mkdir(exist_ok=True)
    (E / 'ab_summary.json').write_text(json.dumps(summary, indent=2, ensure_ascii=False))
    print(f"{'PASS' if not bad else 'FAIL'} A/B overall: {len(summary) - bad}/{len(summary)} suites")
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
