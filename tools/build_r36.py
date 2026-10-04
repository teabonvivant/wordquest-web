"""Deterministic R3.6 incremental build (learning rules, star-based rewards, SmartQuest Planet branding).

R3.6 is built on top of the byte-reproducible R3.5 output:

    originals/R3_2 -> build_r33 -> build_r34 -> build_r35 (r35_src/patches) -> R3.5 text -> (r36_src/patches) -> R3.6

Each patch module r36_src/patches/qNN_*.py exposes
    apply(s, ctx)          -> str   patch for app/index.html (optional)
    apply_sw(s, ctx)       -> str   patch for app/sw.js (optional)
    apply_server(s, ctx)   -> str   patch for server/local_server.mjs (optional)
    extra_files(ctx)       -> {relpath: str|bytes}  new files under the output root (optional)
`ctx.once(s, a, b)` replaces exactly one occurrence or raises. `ctx.src` is r36_src/.

The core owns the version bump (R3.5.0 -> R3.6.0), the page title and the service-worker cache name.

Usage:
    python3 tools/build_r36.py                       # full build into the repo (app/, server/)
    python3 tools/build_r36.py --only q10,q20 --out /tmp/x
    python3 tools/build_r36.py --base-only --out /tmp/r35   # only the R3.5 text (A/B baseline)
    WQ36_BASE_DIR=/tmp/wt35 python3 tools/build_r36.py ...  # reuse an already built R3.5 tree (development shortcut)
"""
from pathlib import Path
import argparse, hashlib, importlib.util, json, os, re, sys, tempfile

R = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(R / 'tools'))
import build_r35  # noqa: E402

PATCHES = R / 'r36_src/patches'
CORE_FILES = ('app/index.html', 'app/sw.js', 'server/local_server.mjs')
TITLE = '學霸星球 SmartQuest Planet'


def once(s, a, b):
    n = s.count(a)
    if n != 1:
        raise ValueError(f'expected one anchor, got {n}: {a[:100]}')
    return s.replace(a, b, 1)


class Ctx:
    once = staticmethod(once)
    src = R / 'r36_src'
    root = R

    def __init__(self):
        self.evidence = {}


def load_modules(only=None):
    mods = []
    for p in sorted(PATCHES.glob('q[0-9][0-9]_*.py')):
        mid = p.stem.split('_')[0]
        if only and mid not in only and p.stem not in only:
            continue
        spec = importlib.util.spec_from_file_location('wq36_' + p.stem, p)
        m = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(m)
        m.MODULE_ID = p.stem
        mods.append(m)
    return mods


def _read_tree(t):
    t = Path(t)
    return ((t / 'app/index.html').read_text(), (t / 'app/sw.js').read_text(),
            (t / 'server/local_server.mjs').read_text(),
            {str(p.relative_to(t)): p.read_bytes() for p in t.rglob('*')
             if p.is_file() and str(p.relative_to(t)) not in CORE_FILES})


def r35_text():
    """R3.5 core files plus its extra files (from a scratch build, or WQ36_BASE_DIR when given)."""
    d = os.environ.get('WQ36_BASE_DIR')
    if d:
        return _read_tree(d)
    with tempfile.TemporaryDirectory() as td:
        build_r35.build(None, td)
        return _read_tree(td)


def build(only=None, out=None, base_only=False):
    out = Path(out) if out else R
    base_html, base_sw, base_server, base_extra = r35_text()
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
        s = s.replace('R3.5.0', 'R3.6.0')
        s = re.sub(r'<title>.*?</title>', f'<title>{TITLE}</title>', s, count=1)
        sw = sw.replace("-3.5.0'", "-3.6.0'")
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
        (R / 'r36_evidence').mkdir(exist_ok=True)
        (R / 'r36_evidence/build.json').write_text(json.dumps({
            'base': 'R3.5.0', 'version': 'R3.6.0',
            'baseSHA256': hashlib.sha256(base_html.encode()).hexdigest(),
            'appSHA256': hashlib.sha256(s.encode()).hexdigest(),
            'swSHA256': hashlib.sha256(sw.encode()).hexdigest(),
            'serverSHA256': hashlib.sha256(server.encode()).hexdigest(),
            'modules': applied, 'extraFiles': sorted(extras), 'scripts': scripts_before,
            'evidence': ctx.evidence}, indent=2, ensure_ascii=False))
    print('R3.6 built:' if not base_only else 'R3.5 text built:', len(s.encode()), 'bytes; modules:', ','.join(applied) or '(none)')
    return s


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--only', help='comma separated module ids, e.g. q10,q20')
    ap.add_argument('--out', help='output root (default: repo root)')
    ap.add_argument('--base-only', action='store_true', help='emit the R3.5 text without any R3.6 patch (A/B baseline)')
    a = ap.parse_args()
    build(set(a.only.split(',')) if a.only else None, a.out, a.base_only)
