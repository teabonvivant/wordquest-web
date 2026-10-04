"""A/B proof for the R3.6 suites: every `[B]` check must FAIL on the R3.5 text and PASS on R3.6.

    python3 r36_tests/run_behaviour36.py [--out DIR] [--only t01,t05,...]

1. builds the R3.5 text (`build_r36.py --base-only`) and the full R3.6 build into a scratch directory,
2. runs each suite against both builds (every suite reads WQ33_APP),
3. fails when a `[B]` check passes on R3.5 (it proves nothing), when any check fails on R3.6,
   or when a non-`[B]` check fails on R3.5 (a regression guard that was already broken).

Browser suites run one after the other (the app is a 12 MB inline page).
Writes r36_evidence/ab_summary.json (+ r36_evidence/ab_logs/*.log) and prints one PASS/FAIL line per suite.
"""
import json
import os
import re
import subprocess
import sys
import tempfile
import time
from pathlib import Path

R = Path(__file__).resolve().parents[1]
E = R / 'r36_evidence'
PY = sys.executable
sys.path.insert(0, str(R / 'r36_tests'))
from run_r36 import JOBS  # noqa: E402

LINE = re.compile(r'^(PASS|FAIL)( \[B\])? (.*?)(?: (?:::|\|) .*)?$')


def run(exe, file, app, label, timeout=2400):
    env = dict(os.environ, WQ33_APP=str(app))
    p = subprocess.run([exe, str(R / 'r36_tests' / file)], cwd=R, env=env, capture_output=True, text=True, timeout=timeout)
    logdir = E / 'ab_logs'
    logdir.mkdir(parents=True, exist_ok=True)
    (logdir / f'{Path(file).stem}.{label}.log').write_text(p.stdout + p.stderr)
    rows = {}
    for line in (p.stdout + p.stderr).splitlines():
        m = LINE.match(line.strip())
        if m and not m.group(3).startswith(('SUMMARY',)):
            rows[m.group(3)] = (m.group(1) == 'PASS', bool(m.group(2)))
    return rows, p.returncode


def main():
    only = set(sys.argv[sys.argv.index('--only') + 1].split(',')) if '--only' in sys.argv else None
    out = Path(tempfile.mkdtemp(prefix='wq36_ab_')) if '--out' not in sys.argv else Path(sys.argv[sys.argv.index('--out') + 1])
    base, new = out / 'r35', out / 'r36'
    for args, d in ((['--base-only'], base), ([], new)):
        subprocess.run([PY, str(R / 'tools/build_r36.py'), *args, '--out', str(d)], cwd=R, check=True, capture_output=True)
    base_app, new_app = base / 'app/index.html', new / 'app/index.html'
    summary = []
    for name, exe, file in JOBS:
        if only and not any(o in name for o in only):
            continue
        t0 = time.time()
        rn, rc_new = run(exe, file, new_app, 'r36')
        rb, _ = run(exe, file, base_app, 'r35')
        proves = [k for k, (ok, b) in rn.items() if b and k in rb and not rb[k][0]]
        crashed = [k for k, (ok, b) in rn.items() if b and k not in rb]
        vacuous = [k for k, (ok, b) in rn.items() if b and k in rb and rb[k][0]]
        new_fail = [k for k, (ok, b) in rn.items() if not ok]
        guard_broken = [k for k, (ok, b) in rb.items() if not b and not ok]
        if rc_new != 0 and not new_fail:  # a suite that stops half way prints no FAIL line, so look at its exit code too
            new_fail = ['(suite exited with code %s after %d checks)' % (rc_new, len(rn))]
        ok = not new_fail and not vacuous
        row = dict(suite=name, newChecks=len(rn), newFailed=new_fail, bChecks=sum(1 for v in rn.values() if v[1]),
                   bFailOnR35=len(proves) + len(crashed), bPassOnR35=vacuous, guardsBrokenOnR35=guard_broken,
                   seconds=round(time.time() - t0))
        summary.append(row)
        print(f"{'PASS' if ok else 'FAIL'} A/B {name}: R3.6 {len(rn) - len(new_fail)}/{len(rn)} pass; "
              f"[B] failing on R3.5: {row['bFailOnR35']}/{row['bChecks']}; [B] passing on R3.5: {len(vacuous)}; {row['seconds']}s", flush=True)
        for k in new_fail[:8]:
            print('   new FAIL:', k)
        for k in vacuous[:8]:
            print('   [B] passes on R3.5 (proves nothing):', k)
        for k in guard_broken[:8]:
            print('   guard already failing on R3.5:', k)
    E.mkdir(exist_ok=True)
    f = E / 'ab_summary.json'
    if only and f.exists():  # a partial re-run replaces only the suites it ran
        old = {r['suite']: r for r in json.loads(f.read_text())}
        old.update({r['suite']: r for r in summary})
        order = [n for n, _, _ in JOBS]
        summary = [old[n] for n in order if n in old]
    f.write_text(json.dumps(summary, indent=2, ensure_ascii=False))
    total_bad = sum(1 for r in summary if r['newFailed'] or r['bPassOnR35'])
    print(f"{'PASS' if not total_bad else 'FAIL'} A/B overall: {len(summary) - total_bad}/{len(summary)} suites")
    return 1 if total_bad else 0


if __name__ == '__main__':
    sys.exit(main())
