"""Deterministic R3.7 incremental build on top of the committed R3.6 output (planet home, level mode, two test modes, FPS, parent levels).

    python3 tools/build_r37.py                 # rebuild app/index.html, app/sw.js into the repo
    python3 tools/build_r37.py --out /tmp/o37  # build elsewhere
    python3 tools/build_r37.py --base-only --out /tmp/o36   # the R3.6 text, for A/B comparison

Base text is `git show <R36_COMMIT>:app/index.html`. Patch modules r37_src/patches/sNN_*.py expose
apply(s, ctx) -> str and optionally apply_sw(s, ctx); ctx.once(s, a, b) replaces exactly one occurrence or raises.
"""
from pathlib import Path
import argparse, hashlib, importlib.util, json, re, subprocess

R = Path(__file__).resolve().parents[1]
R36_COMMIT = 'bd28b55'
PATCHES = R / 'r37_src/patches'


def once(s, a, b):
    n = s.count(a)
    if n != 1:
        raise ValueError(f'expected one anchor, got {n}: {a[:100]}')
    return s.replace(a, b, 1)


class Ctx:
    once = staticmethod(once)
    src = R / 'r37_src'
    root = R


def git_show(path):
    return subprocess.run(['git', 'show', f'{R36_COMMIT}:{path}'], cwd=R, check=True, capture_output=True).stdout.decode()


def load_modules(only=None):
    mods = []
    for p in sorted(PATCHES.glob('s[0-9][0-9]_*.py')):
        mid = p.stem.split('_')[0]
        if only and mid not in only and p.stem not in only:
            continue
        spec = importlib.util.spec_from_file_location('wq37_' + p.stem, p)
        m = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(m)
        m.MODULE_ID = p.stem
        mods.append(m)
    return mods


def build(only=None, out=None, base_only=False):
    out = Path(out) if out else R
    s, sw = git_show('app/index.html'), git_show('app/sw.js')
    mods = [] if base_only else load_modules(only)
    ctx, applied = Ctx(), []
    for m in mods:
        if hasattr(m, 'apply'):
            s = m.apply(s, ctx)
        if hasattr(m, 'apply_sw'):
            sw = m.apply_sw(sw, ctx)
        applied.append(m.MODULE_ID)
    if not base_only:
        s = s.replace('R3.6.0', 'R3.7.0')
        sw = sw.replace("-3.6.0'", "-3.7.0'")
    (out / 'app').mkdir(parents=True, exist_ok=True)
    (out / 'app/index.html').write_text(s)
    (out / 'app/sw.js').write_text(sw)
    if out == R and not only and not base_only:
        (R / 'r37_evidence').mkdir(exist_ok=True)
        (R / 'r37_evidence/build.json').write_text(json.dumps({
            'base': R36_COMMIT, 'version': 'R3.7.0', 'appSHA256': hashlib.sha256(s.encode()).hexdigest(),
            'swSHA256': hashlib.sha256(sw.encode()).hexdigest(), 'modules': applied}, indent=2))
    print('R3.7 built:' if not base_only else 'R3.6 base:', len(s.encode()), 'bytes; modules:', ','.join(applied) or '(none)')
    return s


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--only')
    ap.add_argument('--out')
    ap.add_argument('--base-only', action='store_true')
    a = ap.parse_args()
    build(set(a.only.split(',')) if a.only else None, a.out, a.base_only)
