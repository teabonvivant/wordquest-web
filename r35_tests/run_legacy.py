"""Run every older suite once, one after the other, against the current app/index.html (R3.5 final-build regression).

    python3 r35_tests/run_legacy.py                 # all groups
    python3 r35_tests/run_legacy.py r34 r3    # only the named groups: r33 r34 r3 r31 r32 arcade

Why this file exists: the older runners write into their own evidence folders (r3_evidence ... r34_evidence) and a few of them
start several browsers at once. This one runs each suite as its own process, never in parallel (the app is one 12 MB page), keeps the
logs in r35_evidence/legacy_logs/<group>__<suite>.log and writes r35_evidence/legacy_summary.json.
After a run, restore the older evidence folders with `git checkout -- r33_evidence r3_evidence ...` if you do not want them changed.

Pass/fail rule: the process exit code, plus (for the R3 suites) the failed-case count in the JSON the suite itself writes.
Two suites were already failing before R3.5 (10 of 429 maths-template checks, same as R3.2 and R3.4) and are listed as KNOWN_FAILING:
they must finish (exit code 1, not a crash) with exactly the same totals, 419 pass / 10 fail.
"""
import json
import re
import subprocess
import sys
import time
from pathlib import Path

R = Path(__file__).resolve().parents[1]
OUT = R / 'r35_evidence' / 'legacy_logs'
OUT.mkdir(parents=True, exist_ok=True)
PY = sys.executable

R3_RESULTS = {  # suite file -> result JSON in r3_evidence (same mapping as r3_tests/run_release.py)
    'independent_oracle.py': 'independent_results.json', 'family_contracts.cjs': 'family_contracts.json',
    'server_contracts.mjs': 'server_contracts.json', 'arcade_regression.cjs': 'arcade_core_results.json',
    'family_browser.py': 'family_browser.json', 'new_features_browser.py': 'new_features_browser.json',
    'arcade_browser.py': 'arcade_browser_results.json', 'integration_regression.py': 'integration_results.json',
    'lesson_text_browser.py': 'lesson_text_browser.json',
}
KNOWN_FAILING = {'arcade_tests/r1_regression.py': "TOTAL 429 {'PASS': 419, 'FAIL': 10}", 'tests/integration_checks.py': "TOTAL 429 {'PASS': 419, 'FAIL': 10}"}

GROUPS = [
    ('r33', [[PY, 'r33_tests/run_release.py']], 7200),
    ('r34', [[PY, 'r34_tests/run_release.py']], 3600),
    ('r3', [['node', 'r3_tests/content_generate.cjs'], [PY, 'r3_tests/independent_oracle.py'], ['node', 'r3_tests/family_contracts.cjs'],
            ['node', 'r3_tests/server_contracts.mjs'], ['node', 'r3_tests/arcade_regression.cjs'], [PY, 'r3_tests/family_browser.py'],
            [PY, 'r3_tests/new_features_browser.py'], [PY, 'r3_tests/arcade_browser.py'], [PY, 'r3_tests/integration_regression.py'],
            [PY, 'r3_tests/lesson_text_browser.py']], 900),
    ('r31', [['node', 'r31_tests/characters_core.cjs'], ['node', 'r31_tests/family_contracts.cjs'], ['node', 'r31_tests/arcade_regression.cjs'],
             [PY, 'r31_tests/characters_browser.py'], [PY, 'r31_tests/family_browser.py'], [PY, 'r31_tests/integration_regression.py'],
             [PY, 'r31_tests/arcade_browser.py']], 900),
    ('r32', [['node', 'r32_tests/arcade_regression.cjs'], ['node', 'r32_tests/family_contracts.cjs'], ['node', 'r32_tests/new_core.cjs'],
             [PY, 'r32_tests/family_browser.py'], [PY, 'r32_tests/characters_browser.py'], [PY, 'r32_tests/integration_regression.py'], [PY, 'r32_tests/arcade_browser.py'],
             [PY, 'r32_tests/browser_new.py'], [PY, 'r32_tests/cloud_live.py'], ['node', 'r32_tests/server_contracts.mjs'],
             ['node', 'r32_tests/server_native_http.mjs']], 900),
    ('arcade', [['node', 'arcade_tests/core_tests.cjs'], [PY, 'arcade_tests/syntax_check.py'], [PY, 'arcade_tests/browser_arcade.py'],
                [PY, 'arcade_tests/browser_compatibility.py'], [PY, 'arcade_tests/browser_probe.py'], [PY, 'arcade_tests/browser_safety.py'],
                [PY, 'tests/smoke.py'], [PY, 'arcade_tests/r1_regression.py'], [PY, 'tests/integration_checks.py']], 900),
]


def failed_cases(name):
    """Failed-case count from the result JSON an R3 suite wrote, or None when there is nothing to read."""
    f = R / 'r3_evidence' / R3_RESULTS.get(name, '')
    if name == 'content_generate.cjs':
        f = R / 'r3_evidence' / 'generation_failures.json'
        return len(json.loads(f.read_text())) if f.exists() else None
    if not f.exists() or name not in R3_RESULTS:
        return None
    raw = json.loads(f.read_text())
    cases = raw['tests'] if isinstance(raw, dict) else raw
    return sum(not (x.get('pass') is True or str(x.get('status', '')).lower() == 'pass') for x in cases)


def main():
    want = [a.lower() for a in sys.argv[1:]]
    SUM = R / 'r35_evidence' / 'legacy_summary.json'
    prev = json.loads(SUM.read_text()) if want and SUM.exists() else []
    rows = []
    for group, cmds, timeout in GROUPS:
        if want and group not in want:
            continue
        for cmd in cmds:
            suite = cmd[-1]
            name = Path(suite).name
            log = OUT / f"{group}__{Path(suite).parent.name}__{Path(suite).stem}.log"
            t0 = time.time()
            try:
                with log.open('w') as f:
                    rc = subprocess.run(cmd, cwd=R, stdout=f, stderr=subprocess.STDOUT, timeout=timeout).returncode
            except subprocess.TimeoutExpired:
                rc = 'timeout'
            text = log.read_text(errors='replace')
            row = {'group': group, 'suite': suite, 'returncode': rc, 'seconds': round(time.time() - t0),
                   'fail_lines': len(re.findall(r'^\s*(?:\[?FAIL\]?)\b', text, re.M)),
                   'pass_lines': len(re.findall(r'^\s*(?:\[?PASS\]?)\b', text, re.M))}
            if group == 'r3':
                row['failed_cases'] = failed_cases(name)
            if suite in KNOWN_FAILING:
                row['known_failing'] = KNOWN_FAILING[suite]
                row['ok'] = rc == 1 and KNOWN_FAILING[suite] in text
            else:
                row['ok'] = rc == 0 and not row.get('failed_cases')
            rows.append(row)
            print(f"{'OK  ' if row['ok'] else 'FAIL'} {group:6s} {suite:44s} rc={rc} pass={row['pass_lines']} fail={row['fail_lines']} {row['seconds']}s", flush=True)
            keep = [r for r in prev if (r['group'], r['suite']) not in {(x['group'], x['suite']) for x in rows}]
            SUM.write_text(json.dumps(keep + rows, indent=2, ensure_ascii=False))
    rows = keep + rows if rows else prev
    bad = [r for r in rows if not r['ok']]
    print(f"{'PASS' if not bad else 'FAIL'} legacy: {len(rows) - len(bad)}/{len(rows)} suites ok")
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
