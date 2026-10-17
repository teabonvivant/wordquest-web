"""R3.20 G - sequential regression with per-suite logs and a summary table.

    WQ33_APP=$PWD/app/index.html python3 r37_tests/r320_regression.py [name-filter ...]
One suite at a time (the app is a 12 MB inline page), each under `timeout`; a failed suite is re-run up to 2 more times (the shared box has known
flaky browser tests, see README R3.18) and the log of every attempt is kept as logs/<name>.try<N>.log. Writes r37_evidence/r320/regression.md
and regression.json. t06 (needs the live site and WQ_ADMIN_PW) is listed as not run; t16 (about 45 min) runs last."""
import json, os, subprocess, sys, time
from pathlib import Path

R = Path(__file__).resolve().parents[1]
OUT = R / 'r37_evidence' / 'r320'
LOGS = OUT / 'logs'
LOGS.mkdir(parents=True, exist_ok=True)
PY = sys.executable
T = R / 'r37_tests'
JOBS = [  # (name, cwd, argv, timeout seconds)
    ('levels-math-unit', R, ['node', str(T / 'test_levels_math.cjs')], 900),
    ('en-content-unit', R, ['node', str(T / 'test_en_content.cjs')], 900),
    ('math-mark-unit', R, ['node', str(T / 'test_math_mark.cjs')], 900),
    ('morph-unit', R, ['node', str(T / 'test_morph.cjs')], 900),
    ('r319-toolTask', R, ['node', str(R / 'math_course_tests' / 'r319_toolTask_test.cjs')], 900),
    ('arcade-syntax', R, [PY, str(R / 'arcade_tests' / 'syntax_check.py')], 900),
    ('arcade-core-tests', R, ['node', str(R / 'arcade_tests' / 'core_tests.cjs')], 1800),
    ('t01-shell-levels', R, [PY, str(T / 't01_shell_levels.py')], 2400),
    ('t02-math-levels', R, [PY, str(T / 't02_math_levels.py')], 2400),
    ('t03-parent-chars', R, [PY, str(T / 't03_parent_chars.py')], 2400),
    ('t04-games', R, [PY, str(T / 't04_games.py')], 2400),
    ('t05-admin-regression', R, [PY, str(T / 't05_admin_regression.py')], 2400),
    ('t07-visual-daily', R, [PY, str(T / 't07_visual_daily.py')], 2400),
    ('t08-integration-fx', R, [PY, str(T / 't08_integration_fx.py')], 2400),
    ('t09-arcade', R, [PY, str(T / 't09_arcade.py')], 2400),
    ('t10-fps-levels', R, [PY, str(T / 't10_fps_levels.py')], 2400),
    ('fps-module', R, [PY, str(T / 'test_fps.py')], 2400),
    ('runner-module', R, [PY, str(T / 'test_runner.py')], 2400),
    ('t11-learn-card', R, [PY, str(T / 't11_learn_card.py')], 2400),
    ('t12-dictation-import', R, [PY, str(T / 't12_dictation_import.py')], 2400),
    ('t13-morph-import', R, [PY, str(T / 't13_morph_import.py')], 2400),
    ('t14-morph-ui', R, [PY, str(T / 't14_morph_ui.py')], 2400),
    ('t15-dictation-save', R, [PY, str(T / 't15_dictation_save.py')], 2400),
    ('t17-legacy-fit', R, [PY, str(T / 't17_legacy_fit.py')], 2400),
    ('t18-dictation-study', R, [PY, str(T / 't18_dictation_study.py')], 2400),
    ('t19-save-landing', R, [PY, str(T / 't19_save_landing.py')], 2400),
    ('t20-brand-ui', R, [PY, str(T / 't20_brand_ui.py')], 2400),
    ('t21-webkit-smoke', R, [PY, str(T / 't21_webkit_smoke.py')], 2400),
    ('t22-game-polish', R, [PY, str(T / 't22_game_polish.py')], 2400),
    ('t23-consistency', R, [PY, str(T / 't23_consistency.py')], 2400),
    ('t24-learning-loop', R, [PY, str(T / 't24_learning_loop.py')], 2400),
    ('t25-dz-syllable', R, [PY, str(T / 't25_dz_syllable.py')], 2400),
    ('t26-r319-ui', R, [PY, str(T / 't26_r319_ui.py')], 2400),
    ('t27-r319-teach', R, [PY, str(T / 't27_r319_teach.py')], 2400),
    ('t28-arcade-r320', R, [PY, str(T / 't28_arcade_r320.py')], 5400),
    ('t29-runner-gate', R, [PY, str(T / 't29_runner_gate.py')], 1800),
    ('t30-fps-focus', R, [PY, str(T / 't30_fps_focus.py')], 1800),
    ('arcade-browser', R, [PY, str(R / 'arcade_tests' / 'browser_arcade.py')], 2400),
    ('arcade-safety', R, [PY, str(R / 'arcade_tests' / 'browser_safety.py')], 2400),
    ('arcade-compat', R, [PY, str(R / 'arcade_tests' / 'browser_compatibility.py')], 2400),
    ('r1-regression', R, [PY, str(R / 'arcade_tests' / 'r1_regression.py')], 2400),
    ('t16-dictation-real', R, [PY, str(T / 't16_dictation_real.py')], 6000),
]
NOT_RUN = [('t06-live-admin', '未跑：不適用（需要正式網站及 WQ_ADMIN_PW，本輪不部署）')]


def run_one(name, cwd, argv, timeout):
    attempts = []
    for n in range(1, 4):
        t0 = time.time()
        log = LOGS / f'{name}.try{n}.log'
        try:
            r = subprocess.run(argv, cwd=cwd, capture_output=True, text=True, timeout=timeout)
            code, text = r.returncode, (r.stdout or '') + (('\n--- stderr ---\n' + r.stderr) if r.stderr else '')
        except subprocess.TimeoutExpired as e:
            code, text = 124, f'TIMEOUT after {timeout}s\n' + ((e.stdout or b'').decode(errors='replace')[-4000:] if isinstance(e.stdout, bytes) else (e.stdout or ''))
        log.write_text(text)
        attempts.append({'try': n, 'code': code, 'secs': round(time.time() - t0), 'log': str(log.relative_to(R))})
        print(f'{name} try{n}: exit {code} in {attempts[-1]["secs"]}s', flush=True)
        if code == 0:
            break
    final = LOGS / f'{name}.log'
    final.write_text((LOGS / f'{name}.try{len(attempts)}.log').read_text())
    return {'name': name, 'status': 'pass' if attempts[-1]['code'] == 0 else 'fail', 'attempts': attempts}


def main():
    want = [a.lower() for a in sys.argv[1:]]
    rows = []
    for name, cwd, argv, to in JOBS:
        if want and not any(w in name for w in want):
            continue
        rows.append(run_one(name, cwd, argv, to))
        (OUT / 'regression.json').write_text(json.dumps(rows, ensure_ascii=False, indent=1))
    md = ['# R3.20 回歸測試紀錄', '', f'建置：`{os.environ.get("WQ33_APP", "app/index.html")}`；逐套依序、單一瀏覽器；失敗最多再跑 2 次（共用機器有已知不穩定）。log：`r37_evidence/r320/logs/`。', '',
          '| 套件 | 結果 | 嘗試 | 用時 | log |', '|---|---|---|---|---|']
    for r in rows:
        a = r['attempts']
        md.append(f"| {r['name']} | {'通過' if r['status']=='pass' else '**失敗**'} | {len(a)}（exit {', '.join(str(x['code']) for x in a)}） | {sum(x['secs'] for x in a)} s | `{a[-1]['log']}` |")
    for n, why in NOT_RUN:
        md.append(f'| {n} | {why} | — | — | — |')
    npass = sum(1 for r in rows if r['status'] == 'pass')
    md += ['', f'通過 {npass}／{len(rows)}；未跑 {len(NOT_RUN)}（見表）。']
    (OUT / 'regression.md').write_text('\n'.join(md) + '\n')
    print('\n'.join(md[-4:]))


if __name__ == '__main__':
    main()
