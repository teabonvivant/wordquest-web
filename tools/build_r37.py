"""Deterministic R3.7 incremental build on top of the committed R3.6 output (planet home, level mode, two test modes, FPS, parent levels).

    python3 tools/build_r37.py                 # rebuild app/index.html, app/sw.js into the repo
    python3 tools/build_r37.py --out /tmp/o37  # build elsewhere
    python3 tools/build_r37.py --base-only --out /tmp/o36   # the R3.6 text, for A/B comparison

Base text is `git show <R36_COMMIT>:app/index.html`. Patch modules r37_src/patches/sNN_*.py expose
apply(s, ctx) -> str and optionally apply_sw(s, ctx); ctx.once(s, a, b) replaces exactly one occurrence or raises.
"""
from pathlib import Path
import argparse, hashlib, importlib.util, json, re, shutil, subprocess, sys

R = Path(__file__).resolve().parents[1]
R36_COMMIT = 'bd28b55'
# R3.30: the service-worker cache name follows this label (plus a signature of the shipped art), so a new release always gets a new cache and the old one is dropped on activate.
# Bump it with every release; tests/r37 t61 and r320_sw_offline.py read it from sw.js.
RELEASE = 'R3.40.0'
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


# A missing data script would otherwise leave a blank page: every later block throws on the absent globals.
LOAD_GUARD = """<script>addEventListener('error',e=>{const t=e.target;if(!t||t.tagName!=='SCRIPT'||!/\\/data\\/d\\d+-/.test(t.src)||document.getElementById('wq-load-fail'))return;const d=document.createElement('div');d.id='wq-load-fail';d.setAttribute('role','alert');d.style.cssText='position:fixed;inset:0;z-index:2147483647;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:16px;padding:24px;background:#fff8ed;color:#3b2a1e;font:18px/1.5 sans-serif;text-align:center';d.innerHTML='<p style="margin:0">學霸星球未能完整載入，請檢查網絡。<br>你的進度沒有遺失。</p><button style="min-height:48px;padding:0 24px;border:0;border-radius:24px;background:#bf4d25;color:#fff;font:inherit">重新載入</button>';d.querySelector('button').onclick=()=>location.reload();document.body.append(d);},true)</script>"""


def lift_host_data(s):
    """R3.40: the two big constants inside the inline host script (1 MB of images, 285 KB of word bank) move into one external block, which the browser can code-cache."""
    parts = []
    for name, key in (('BUILTIN_IMAGES', 'WQ_D_IMG'), ('WQ_BANK', 'WQ_D_BANK')):
        m = re.search(rf'^const {name}=(.*);$', s, re.M)
        json.loads(m.group(1))
        s = s[:m.start()] + f'const {name}=globalThis.{key};' + s[m.end():]
        parts.append(f'globalThis.{key}=JSON.parse({json.dumps(m.group(1), ensure_ascii=False)});')
    return once(s, '<script data-wq28="host">', '<script data-wq40="host-data">' + ''.join(parts) + '</script>\n<script data-wq28="host">')


def json_parse_form(b):
    """R3.40: a block that is one pure JSON value assigned to a global parses faster as JSON.parse('...') than as a JS literal."""
    m = re.fullmatch(r'\s*((?:window|globalThis)\.\w+)=([\[{].*[\]}]);?\s*', b.decode(), re.S)
    if not m:
        return b
    try:
        json.loads(m.group(2))
    except ValueError:
        return b
    return f'{m.group(1)}=JSON.parse({json.dumps(m.group(2), ensure_ascii=False)});'.encode()


def split_data(s, sw):
    """R3.39: the large data and library blocks become same-order classic <script src>, so a browser keeps their compiled code between visits (inline scripts get no code cache).
    Measured with 4x CPU slowdown: first open 6.1 s to 4.0 s, later opens 3.3 s to 2.2 s. File names carry a content hash; the service worker precaches them with index.html.
    Runs last because build_math_m1.py counts the inline blocks."""
    d = R / 'app/data'
    if d.exists():
        shutil.rmtree(d)
    d.mkdir()
    s = lift_host_data(s)
    res, pos, names = [], 0, []
    for m in re.finditer(r'<script([^>]*)>', s):
        if m.start() < pos:
            continue
        e = s.find('</script>', m.end())
        b = s[m.end():e].encode()
        if len(b) > 500_000 and 'src=' not in m.group(1) and 'data-wq28="host"' not in m.group(1):
            b = json_parse_form(b)
            name = f'data/d{len(names) + 1}-{hashlib.sha256(b).hexdigest()[:10]}.js'
            (R / 'app' / name).write_bytes(b)
            names.append(name)
            res.append(s[pos:m.start()] + (LOAD_GUARD if len(names) == 1 else '') + f'<script{m.group(1)} src="{name}">')
            pos = e
    res.append(s[pos:])
    (R / 'app/index.html').write_text(''.join(res))
    sw = once(sw, "await c.addAll([new URL('index.html',BASE).href]);", "await c.addAll(['index.html'," + ','.join(json.dumps(n) for n in names) + "].map(a=>new URL(a,BASE).href));")
    sw = once(sw, " if(u.pathname===new URL('index.html',BASE).pathname",
              " if(/\\/data\\/d\\d+-[0-9a-f]+\\.js$/.test(u.pathname)){e.respondWith((async()=>{const c=await caches.open(SHELL),hit=await c.match(req,{ignoreSearch:true});if(hit)return hit;const r=await fetch(req);if(r.ok)await c.put(req,r.clone());return r;})());return;}\n"
              " if(u.pathname===new URL('index.html',BASE).pathname")
    (R / 'app/sw.js').write_text(sw)


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
            'base': R36_COMMIT, 'version': RELEASE, 'appSHA256': hashlib.sha256(s.encode()).hexdigest(),
            'swSHA256': hashlib.sha256(sw.encode()).hexdigest(), 'modules': applied}, indent=2))
    if out == R and not only and not base_only:
        split_data(s, sw)
    print('R3.7 built:' if not base_only else 'R3.6 base:', len(s.encode()), 'bytes; modules:', ','.join(applied) or '(none)')
    return s


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    ap.add_argument('--only')
    ap.add_argument('--out')
    ap.add_argument('--base-only', action='store_true')
    a = ap.parse_args()
    build(set(a.only.split(',')) if a.only else None, a.out, a.base_only)
