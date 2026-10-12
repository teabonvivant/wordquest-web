"""Sequential R3.7 regression runner.

    python3 r37_tests/run_r37.py            # everything, against app/index.html (or WQ33_APP)
    python3 r37_tests/run_r37.py t03        # only jobs whose name contains 't03'

Logs go to r37_evidence/<name>.log, a JSON summary to r37_evidence/final_runner.json.
Browser suites must run one after the other (the app is a 12 MB inline page).
"""
from pathlib import Path
import json, re, subprocess, sys, time

R = Path(__file__).resolve().parents[1]
E = R / 'r37_evidence'
E.mkdir(exist_ok=True)
PY = sys.executable
JOBS = [
    ('levels-math-unit', 'node', 'test_levels_math.cjs'),
    ('t01-shell-levels', PY, 't01_shell_levels.py'),
    ('t02-math-levels', PY, 't02_math_levels.py'),
    ('t03-parent-chars', PY, 't03_parent_chars.py'),
    ('t04-games', PY, 't04_games.py'),
    ('t05-admin-regression', PY, 't05_admin_regression.py'),
    ('t06-live-admin', PY, 't06_live_admin.py'),
    ('t07-visual-daily', PY, 't07_visual_daily.py'),
    ('t08-integration-fx', PY, 't08_integration_fx.py'),
    ('t09-arcade', PY, 't09_arcade.py'),
    ('t10-fps-levels', PY, 't10_fps_levels.py'),
    ('fps-module', PY, 'test_fps.py'),
    ('runner-module', PY, 'test_runner.py'),
    ('t11-learn-card', PY, 't11_learn_card.py'),
    ('t12-dictation-import', PY, 't12_dictation_import.py'),
    ('morph-module', 'node', 'test_morph.cjs'),
    ('t13-morph-import', PY, 't13_morph_import.py'),
    ('t14-morph-ui', PY, 't14_morph_ui.py'),
    ('t15-dictation-save', PY, 't15_dictation_save.py'),
    ('t16-dictation-real', PY, 't16_dictation_real.py'),
    ('t17-legacy-fit', PY, 't17_legacy_fit.py'),
    ('t18-dictation-study', PY, 't18_dictation_study.py'),
]
if __name__ == '__main__':
    want = [a.lower() for a in sys.argv[1:]]
    rows = []
    for name, exe, file in JOBS:
        if want and not any(w in name for w in want):
            continue
        t0 = time.time()
        r = subprocess.run([exe, str(R / 'r37_tests' / file)], capture_output=True, text=True, timeout=6000 if 't16' in file else 2400)
        out = r.stdout + r.stderr
        (E / (name + '.log')).write_text(out)
        last = [l for l in out.splitlines() if l.strip()][-1:] or ['']
        rows.append({'name': name, 'file': file, 'returncode': r.returncode, 'last_line': last[0][:200], 'seconds': round(time.time() - t0)})
        print(name, r.returncode, last[0][:120], flush=True)
    if not want:
        (E / 'final_runner.json').write_text(json.dumps(rows, ensure_ascii=False, indent=2))
    sys.exit(1 if any(x['returncode'] for x in rows) else 0)
