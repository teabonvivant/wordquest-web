"""R3.41: copy of app/ for the browser tests, which splice a bridge into the host script's text.
Same files through symlinks; only index.html differs: the host and the small script chunks go back inline.

    python3 tools/test_app.py     # prints the path to use as WQ33_APP"""
from pathlib import Path
import re, shutil

R = Path(__file__).resolve().parents[1]
T = Path('/tmp/wq_test_app')
shutil.rmtree(T, ignore_errors=True)
T.mkdir()
for f in (R / 'app').iterdir():
    if f.name != 'index.html':
        (T / f.name).symlink_to(f)


def inline(m):
    body = (R / 'app' / m.group(2)).read_text(encoding='utf8')
    if len(body.encode()) > 500_000 and 'data-wq28="host"' not in m.group(1):
        return m.group(0)
    return f'<script{m.group(1)}>{body}</script>'


html = re.sub(r'<script([^>]*) src="(data/d\d+-[0-9a-f]+\.js)"></script>', inline, (R / 'app/index.html').read_text(encoding='utf8'))
(T / 'index.html').write_text(html, encoding='utf8')
print(T / 'index.html')
