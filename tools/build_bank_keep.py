"""R3.41: list the word-bank headwords that survive the word-form check, so the app does not re-run that check on every start.

    python3 tools/build_bank_keep.py     # rerun after changing the dictionary, wordbank_ext.json or s55_morph.js

Builds with the full list, reads the result from the running app, writes r37_src/wordbank_keep.json, then builds normally."""
from pathlib import Path
import json, os, subprocess, sys
from playwright.sync_api import sync_playwright

R = Path(__file__).resolve().parents[1]
subprocess.run([sys.executable, 'tools/build_r37.py'], cwd=R, check=True, env={**os.environ, 'WQ_FULL_BANK': '1'})
with sync_playwright() as p:
    b = p.chromium.launch(args=['--no-sandbox'])
    pg = b.new_page()
    pg.goto((R / 'app/index.html').as_uri(), wait_until='load', timeout=120000)
    keep = pg.evaluate("window.WQ_EXT_KEPT")
    b.close()
(R / 'r37_src/wordbank_keep.json').write_text(json.dumps(keep, ensure_ascii=False, separators=(',', ':')))
print(len(keep), 'headwords kept')
subprocess.run([sys.executable, 'tools/build_r37.py'], cwd=R, check=True)
