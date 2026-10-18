"""R3.20 r3: re-run single suites on the SAME build and merge the new attempts into regression.json / regression.md (the earlier attempts and their logs stay).
    WQ33_APP=$PWD/app/index.html python3 tools/r320_regression_retest.py t19-save-landing t21-webkit-smoke
The earlier try logs are first copied to logs/<name>.first-run.tryN.log so the re-run cannot overwrite them."""
import json, shutil, sys
from pathlib import Path
R = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(R / 'r37_tests'))
import r320_regression as RG  # noqa: E402

rows = json.loads((RG.OUT / 'regression.json').read_text())
for name in sys.argv[1:]:
    job = next(j for j in RG.JOBS if j[0] == name)
    old = next(r for r in rows if r['name'] == name)
    if any('first-run' in a['log'] for a in old['attempts']):
        sys.exit(f'{name}: already merged once')
    for a in old['attempts']:
        src = R / a['log']
        dst = src.with_name(src.name.replace('.try', '.first-run.try'))
        shutil.copy(src, dst); a['log'] = str(dst.relative_to(R))
    new = RG.run_one(*job)
    sha_old, sha_new = old['sha256'], new['sha256']
    merged = dict(new, start=old['start'], attempts=old['attempts'] + new['attempts'],
                  note=f"重測：第一輪 {len(old['attempts'])} 次嘗試失敗（建置 {sha_old[:12]}…），其後在{'同一' if sha_old == sha_new else '另一'}建置重跑（{sha_new[:12]}…）"
                       + (' ' + new['note'] if new.get('note') else ''))
    rows[rows.index(old)] = merged
    (RG.OUT / 'regression.json').write_text(json.dumps(rows, ensure_ascii=False, indent=1))
RG.write_md(rows)
