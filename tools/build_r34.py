"""Deterministic R3.4 incremental build (arcade feel, fixes and phone play).

R3.4 is built on top of the byte-reproducible R3.3 output:

    originals/R3_2  --(tools/build_r33.py, r33_src/patches)-->  R3.3 text  --(r34_src/patches)-->  R3.4

Nothing is edited by hand. Each patch module in r34_src/patches/pNN_*.py exposes
    apply(s, ctx)          -> str   patch for app/index.html (optional)
    apply_sw(s, ctx)       -> str   patch for app/sw.js (optional)
    apply_server(s, ctx)   -> str   patch for server/local_server.mjs (optional)
    extra_files(ctx)       -> {relpath: str|bytes}  new files under the output root (optional)
`ctx.once(s, a, b)` replaces exactly one occurrence or raises. `ctx.src` is r34_src/.

The core owns the version bump (R3.3.0 -> R3.4.0); modules must not touch version strings.

Usage:
    python3 tools/build_r34.py                       # full build into the repo (app/, server/)
    python3 tools/build_r34.py --only p10,p20 --out /tmp/x   # isolated build for development
    python3 tools/build_r34.py --base-only --out /tmp/r33    # only the R3.3 text (for A/B tests)
"""
from pathlib import Path
import argparse, hashlib, importlib.util, json, re, sys, tempfile

R = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(R / 'tools'))
import build_r33  # noqa: E402

PATCHES = R / 'r34_src/patches'


def once(s, a, b):
    n = s.count(a)
    if n != 1:
        raise ValueError(f'expected one anchor, got {n}: {a[:100]}')
    return s.replace(a, b, 1)


class Ctx:
    once = staticmethod(once)
    src = R / 'r34_src'
    root = R


def load_modules(only=None):
    mods = []
    for p in sorted(PATCHES.glob('p[0-9][0-9]_*.py')):
        mid = p.stem.split('_')[0]
        if only and mid not in only and p.stem not in only:
            continue
        spec = importlib.util.spec_from_file_location('wq34_' + p.stem, p)
        m = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(m)
        m.MODULE_ID = p.stem
        mods.append(m)
    return mods


def r33_text():
    """Build R3.3 into a scratch directory and return (index.html, sw.js, server) as text."""
    with tempfile.TemporaryDirectory() as td:
        build_r33.build(None, td)
        t = Path(td)
        return ((t / 'app/index.html').read_text(), (t / 'app/sw.js').read_text(),
                (t / 'server/local_server.mjs').read_text(),
                {str(p.relative_to(t)): p.read_bytes() for p in t.rglob('*')
                 if p.is_file() and str(p.relative_to(t)) not in ('app/index.html', 'app/sw.js', 'server/local_server.mjs')})


def build(only=None, out=None, base_only=False):
    out = Path(out) if out else R
    base_html, base_sw, base_server, base_extra = r33_text()
    s, sw, server = base_html, base_sw, base_server
    scripts_before = len(re.findall(r'<script\b', s))
    mods = [] if base_only else load_modules(only)
    ctx = Ctx()
    applied = []
    for m in mods:
        if hasattr(m, 'apply'):
            s = m.apply(s, ctx)
        applied.append(m.MODULE_ID)
    if not base_only:
        # Core-owned version bump.
        s = s.replace('R3.3.0', 'R3.4.0')
        s = s.replace('R3.3 · 森林學園', 'R3.4 · 森林學園')
        s = re.sub(r'<title>.*?</title>', '<title>WordQuest R3.4 · 街機手感與手機玩法</title>', s, count=1)
        sw = sw.replace("-3.3.0'", "-3.4.0'")
    assert s.count('\ninstallMediaEvents();\nrender();') == 1, 'test injection anchor changed'
    assert len(re.findall(r'<script\b', s)) == scripts_before, 'a module added or removed a <script> tag'
    extras = dict(base_extra)
    for m in mods:
        if hasattr(m, 'apply_sw'):
            sw = m.apply_sw(sw, ctx)
        if hasattr(m, 'apply_server'):
            server = m.apply_server(server, ctx)
        if hasattr(m, 'extra_files'):
            extras.update(m.extra_files(ctx))
    (out / 'app').mkdir(parents=True, exist_ok=True)
    (out / 'server').mkdir(parents=True, exist_ok=True)
    (out / 'app/index.html').write_text(s)
    (out / 'app/sw.js').write_text(sw)
    (out / 'server/local_server.mjs').write_text(server)
    for rel, data in sorted(extras.items()):
        p = out / rel
        p.parent.mkdir(parents=True, exist_ok=True)
        p.write_bytes(data if isinstance(data, bytes) else data.encode())
    if out == R and not only and not base_only:
        (R / 'r34_evidence').mkdir(exist_ok=True)
        (R / 'r34_evidence/build.json').write_text(json.dumps({
            'base': 'R3.3.0', 'version': 'R3.4.0',
            'baseSHA256': hashlib.sha256(base_html.encode()).hexdigest(),
            'appSHA256': hashlib.sha256(s.encode()).hexdigest(),
            'swSHA256': hashlib.sha256(sw.encode()).hexdigest(),
            'serverSHA256': hashlib.sha256(server.encode()).hexdigest(),
            'modules': applied, 'extraFiles': sorted(extras), 'scripts': scripts_before}, indent=2, ensure_ascii=False))
    print('R3.4 built:' if not base_only else 'R3.3 text built:', len(s.encode()), 'bytes; modules:', ','.join(applied) or '(none)')
    return s


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--only', help='comma separated module ids, e.g. p10,p20')
    ap.add_argument('--out', help='output root (default: repo root)')
    ap.add_argument('--base-only', action='store_true', help='emit the R3.3 text without any R3.4 patch (A/B baseline)')
    a = ap.parse_args()
    build(set(a.only.split(',')) if a.only else None, a.out, a.base_only)
