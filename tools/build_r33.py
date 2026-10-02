"""Deterministic R3.3 incremental build.

Reads the frozen R3.2 release in originals/R3_2 and applies the ordered patch
modules in r33_src/patches/pNN_*.py. Every module exposes
    apply(s, ctx)          -> str   patch for app/index.html (optional)
    apply_sw(s, ctx)       -> str   patch for app/sw.js (optional)
    apply_server(s, ctx)   -> str   patch for server/local_server.mjs (optional)
    extra_files(ctx)       -> {relpath: str|bytes}  new files under the output root (optional)
`ctx.once(s, a, b)` replaces exactly one occurrence or raises, as in the earlier builds.

Usage:
    python3 tools/build_r33.py                     # full build into the repo (app/, server/)
    python3 tools/build_r33.py --only p01,p02 --out /tmp/x   # isolated build for development
"""
from pathlib import Path
import argparse, hashlib, importlib.util, json, re, shutil, sys

R = Path(__file__).resolve().parents[1]
ORIG = R / 'originals/R3_2'
PATCHES = R / 'r33_src/patches'
VERSION_OLD, VERSION_NEW = 'R3.2.0', 'R3.3.0'


def once(s, a, b):
    n = s.count(a)
    if n != 1:
        raise ValueError(f'expected one anchor, got {n}: {a[:100]}')
    return s.replace(a, b, 1)


R32_INPUTS = {  # frozen R3.2 release files and their SHA-256 (the build refuses any other base)
    'app/index.html': '8657afc155e26f9206bfc7abc02b80b982ede397366988cb1d932e2a2aa157d7',
    'app/sw.js': 'e42e724a2037b2bd35fb7f74e2a6eeec16c4516442043231446ef49d8e62442f',
    'server/local_server.mjs': '8846b5650412c51b0e656d67feb79c19e7ee95c3eb9a5a402869473ade6da377',
}
R32_COMMIT = 'f82ec681b4d2eae6c9aa0110a01b39c612540aed'  # the upload commit that holds R3.2


def _sha(b):
    return hashlib.sha256(b).hexdigest()


def ensure_base():
    """Make originals/R3_2 exist and verify it. Source order: already frozen -> git history -> current tree (if still R3.2)."""
    import subprocess
    for rel, want in R32_INPUTS.items():
        dest = ORIG / rel
        if dest.exists() and _sha(dest.read_bytes()) == want:
            continue
        data = None
        try:
            data = subprocess.run(['git', '-C', str(R), 'show', f'{R32_COMMIT}:{rel}'], capture_output=True, check=True).stdout
        except Exception:
            data = None
        if data is None or _sha(data) != want:
            cur = R / rel
            data = cur.read_bytes() if cur.exists() and _sha(cur.read_bytes()) == want else None
        if data is None:
            raise SystemExit(f'R3.2 base for {rel} not found. Restore originals/R3_2/{rel} (SHA-256 {want}) '
                             f'or fetch git commit {R32_COMMIT}.')
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(data)


class Ctx:
    once = staticmethod(once)
    src = R / 'r33_src'
    root = R


def load_modules(only=None):
    mods = []
    for p in sorted(PATCHES.glob('p[0-9][0-9]_*.py')):
        mid = p.stem.split('_')[0]
        if only and mid not in only and p.stem not in only:
            continue
        spec = importlib.util.spec_from_file_location('wq33_' + p.stem, p)
        m = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(m)
        m.MODULE_ID = p.stem
        mods.append(m)
    return mods


def build(only=None, out=None):
    out = Path(out) if out else R
    ensure_base()
    raw = (ORIG / 'app/index.html').read_text()
    scripts_before = len(re.findall(r'<script\b', raw))
    s = raw
    mods = load_modules(only)
    ctx = Ctx()
    applied = []
    for m in mods:
        if hasattr(m, 'apply'):
            s = m.apply(s, ctx)
        applied.append(m.MODULE_ID)
    # Core-owned version bump (modules must not touch version strings).
    s = s.replace(VERSION_OLD, VERSION_NEW)
    s = s.replace('R3.2 · 森林學園', 'R3.3 · 森林學園')
    s = re.sub(r'<title>.*?</title>', '<title>WordQuest R3.3 · 手機版穩定與資料安全</title>', s, count=1)
    # Invariants the existing test-suite relies on.
    assert s.count('\ninstallMediaEvents();\nrender();') == 1, 'test injection anchor changed'
    assert len(re.findall(r'<script\b', s)) == scripts_before, 'a module added or removed a <script> tag'
    sw = (ORIG / 'app/sw.js').read_text().replace("-3.2.0'", "-3.3.0'")
    server = (ORIG / 'server/local_server.mjs').read_text()
    extras = {}
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
    if out == R and not only:
        (R / 'r33_evidence').mkdir(exist_ok=True)
        (R / 'r33_evidence/build.json').write_text(json.dumps({
            'base': 'R3.2.0', 'version': 'R3.3.0',
            'baseSHA256': hashlib.sha256(raw.encode()).hexdigest(),
            'appSHA256': hashlib.sha256(s.encode()).hexdigest(),
            'swSHA256': hashlib.sha256(sw.encode()).hexdigest(),
            'serverSHA256': hashlib.sha256(server.encode()).hexdigest(),
            'modules': applied, 'extraFiles': sorted(extras),
            'scripts': scripts_before}, indent=2, ensure_ascii=False))
    print('R3.3 built:', len(s.encode()), 'bytes; modules:', ','.join(applied) or '(none)')
    return s


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--only', help='comma separated module ids, e.g. p01,p02')
    ap.add_argument('--out', help='output root (default: repo root)')
    a = ap.parse_args()
    build(set(a.only.split(',')) if a.only else None, a.out)
