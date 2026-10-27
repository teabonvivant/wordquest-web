"""Deterministic R3.7 incremental build on top of the committed R3.6 output (planet home, level mode, two test modes, FPS, parent levels).

    python3 tools/build_r37.py                 # rebuild app/index.html, app/sw.js into the repo
    python3 tools/build_r37.py --out /tmp/o37  # build elsewhere
    python3 tools/build_r37.py --base-only --out /tmp/o36   # the R3.6 text, for A/B comparison

Base text is `git show <R36_COMMIT>:app/index.html`. Patch modules r37_src/patches/sNN_*.py expose
apply(s, ctx) -> str and optionally apply_sw(s, ctx); ctx.once(s, a, b) replaces exactly one occurrence or raises.
"""
from pathlib import Path
import argparse, hashlib, importlib.util, json, re, subprocess, sys

R = Path(__file__).resolve().parents[1]
R36_COMMIT = 'bd28b55'
# R3.30: the service-worker cache name follows this label (plus a signature of the shipped art), so a new release always gets a new cache and the old one is dropped on activate.
# Bump it with every release; tests/r37 t61 and r320_sw_offline.py read it from sw.js.
RELEASE = 'R3.31.0'
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
        # R3.18: English content overrides (examples, meanings, blend groups) read by r37_src/s10_core.js
        fix = R / 'r37_src/en_content_r318.json'
        if fix.exists():
            body = json.dumps(json.loads(fix.read_text()), ensure_ascii=False, separators=(',', ':')).replace('</', '<\\/')
            # inside the host script (a new <script> block would change the block count build_math_m1.py checks)
            s = once(s, '<script data-wq28="host">', f'<script data-wq28="host">\nglobalThis.WQ37EnFix={body};')
        s = s.replace('R3.6.0', 'R3.7.0')
        # R3.19: precache the shipped art (planets, characters) and serve it cache-first offline
        art = sorted(f'assets/{d}/{f.name}' for d in ('r316', 'r318', 'r321', 'r323') for f in (R / 'app/assets' / d).glob('*.webp'))
        art_sig = hashlib.sha1('|'.join(f'{a}:{(R / "app" / a).stat().st_size}' for a in art).encode()).hexdigest()[:8]
        sw = sw.replace("-3.6.0'", f"-{RELEASE}-{art_sig}'")
        sw = once(sw, "await c.addAll([new URL('index.html',BASE).href]);",
                  "await c.addAll([new URL('index.html',BASE).href]);try{await c.addAll(" + json.dumps(art)
                  + ".map(a=>new URL(a,BASE).href));}catch(_){}")
        sw = once(sw, " if(u.pathname===new URL('index.html',BASE).pathname",
                  " if(/\\/assets\\/r3(?:16|18|21|23|26)\\/(?:words\\/)?[^/]+\\.webp$/.test(u.pathname)){e.respondWith((async()=>{const c=await caches.open(SHELL),hit=await c.match(req,{ignoreSearch:true});if(hit)return hit;const r=await fetch(req);if(r.ok)await c.put(req,r.clone());return r;})());return;}\n"
                  " if(u.pathname===new URL('index.html',BASE).pathname")
        if out == R and not only:
            for anchor, names in (('<script>/* WordQuest Maths 0.1.2', ['course_data.js']),
                                  ('<script>/* Separate subject storage', ['course_engine.js']),
                                  ('<!-- WQM_PLUGIN_END_0_1_2 -->', ['tools_bundle.js', 'style_bundle.js', 'course_ui.js'])):
                assert s.count(anchor) == 1, anchor
                s = s.replace(anchor, ''.join(f'<script data-course-m1="{n}"></script>\n' for n in names) + anchor, 1)
    (out / 'app').mkdir(parents=True, exist_ok=True)
    (out / 'app/index.html').write_text(s)
    (out / 'app/sw.js').write_text(sw)
    if out == R and not only and not base_only:
        subprocess.run([sys.executable, str(R / 'tools/build_math_m1.py')], check=True)
        s = (R / 'app/index.html').read_text()
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
