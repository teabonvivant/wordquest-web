#!/usr/bin/env python3
"""R3.3 p30 / WQ32-04: "準備網頁" must really register the service worker, cache index.html and survive offline.

Real Chromium against a real `node server/local_server.mjs` (http://127.0.0.1:<port>/app/index.html).
    WQ33_OUT   root that holds app/ and server/ (default: the repo root; use a build dir or originals/R3_2 for the baseline)
    WQ33_PORT  first port to use (default 8801; the run uses a handful of consecutive ports)

One line per check: `PASS name` / `FAIL name :: detail` (summary line starts with TOTAL). Exit code 1 on any FAIL.
Only the server processes started here are stopped. Baseline (originals/R3_2) takes a few minutes because its failure
paths simply wait out their time limits.
"""
import json
import os
import shutil
import socket
import struct
import subprocess
import sys
import tempfile
import time
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import wq33  # noqa: E402
from playwright.sync_api import sync_playwright  # noqa: E402

OUT = Path(os.environ.get('WQ33_OUT') or wq33.R).resolve()
BASE_PORT = int(os.environ.get('WQ33_PORT') or 8801)
TMP = Path(tempfile.mkdtemp(prefix='wq33-p30-pwa-'))
rows = []
procs = []
_next_port = [BASE_PORT]


def report(name, ok, detail=''):
    rows.append((name, ok))
    print(('PASS ' if ok else 'FAIL ') + name + (' :: ' + detail if detail else ''), flush=True)


def check(name, fn):
    """Run fn; it returns an optional detail string and raises AssertionError / any error to fail."""
    try:
        detail = fn()
        report(name, True, detail or '')
    except Exception as e:  # noqa: BLE001 - every error is a failed check
        report(name, False, (str(e) or type(e).__name__).splitlines()[0][:300])


def need(cond, msg):
    if not cond:
        raise AssertionError(msg)


# ---- servers ----------------------------------------------------------------------------------------------------
def start_server(root, port=None):
    if port is None:
        port = _next_port[0]
        _next_port[0] += 1
    log = open(TMP / f'server{port}.log', 'w')
    pr = subprocess.Popen(['node', str(Path(root) / 'server/local_server.mjs')], cwd=str(root),
                          env={**os.environ, 'WORDQUEST_PORT': str(port)}, stdout=log, stderr=subprocess.STDOUT)
    procs.append(pr)
    deadline = time.time() + 15
    while time.time() < deadline:
        if pr.poll() is not None:
            raise RuntimeError(f'server on {port} exited early (port busy?) see {TMP}/server{port}.log')
        try:
            socket.create_connection(('127.0.0.1', port), timeout=0.5).close()
            return port, pr
        except OSError:
            time.sleep(0.2)
    raise RuntimeError(f'server on {port} did not start')


def stop_server(pr):
    if pr.poll() is None:
        pr.terminate()
        try:
            pr.wait(5)
        except subprocess.TimeoutExpired:
            pr.kill()


def variant(name, sw=None, drop_sw=False):
    """Copy only the shipped app files + server to a temp root, optionally with a different sw.js."""
    d = TMP / name
    (d / 'app').mkdir(parents=True)
    shutil.copytree(OUT / 'server', d / 'server')
    for f in ['index.html', 'sw.js', 'manifest.webmanifest']:
        if (OUT / 'app' / f).exists():
            shutil.copy(OUT / 'app' / f, d / 'app' / f)
    if (OUT / 'app/icons').exists():
        shutil.copytree(OUT / 'app/icons', d / 'app/icons')
    if drop_sw:
        (d / 'app/sw.js').unlink()
    elif sw is not None:
        (d / 'app/sw.js').write_text(sw)
    return d


def http_get(port, path, headers=None):
    req = urllib.request.Request(f'http://127.0.0.1:{port}{path}', headers=headers or {})
    try:
        with urllib.request.urlopen(req, timeout=15) as r:
            return r.status, dict(r.headers), r.read()
    except urllib.error.HTTPError as e:
        return e.code, dict(e.headers), e.read()


def png_size(b):
    need(b[:8] == b'\x89PNG\r\n\x1a\n', 'not a PNG')
    return struct.unpack('>II', b[16:24])


# ---- page helpers -----------------------------------------------------------------------------------------------
def new_ctx(p, **kw):
    b = wq33.launch(p)
    ctx = b.new_context(viewport={'width': 390, 'height': 844}, **kw)
    return b, ctx


def open_offline(pg, url):
    """Fresh account -> parent gate -> offline route -> extra tools open (where the 準備網頁 button lives)."""
    pg.set_default_timeout(20000)
    pg.goto(url)
    pg.wait_for_timeout(1200)
    pg.evaluate("location.hash='#login'")
    pg.wait_for_timeout(400)
    pg.fill('#register-name', 'tester')
    pg.fill('#register-child', '小明')
    if pg.query_selector('#register-grade'):
        pg.select_option('#register-grade', '3')
    pg.fill('#register-pin', wq33.PW)
    pg.click('[data-act="register-submit"]')
    pg.wait_for_timeout(2500)
    pg.evaluate("location.hash='#offline'")
    pg.wait_for_timeout(900)
    wq33.unlock_parent(pg)
    pg.evaluate("location.hash='#offline'")
    pg.wait_for_timeout(700)
    pg.evaluate("document.querySelector('.offline-extra')&&(document.querySelector('.offline-extra').open=true)")


def ui_ready(pg):
    return pg.evaluate("document.querySelector('.offline-counts > div:nth-child(3) strong')?.innerText||''")


def status_msg(pg):
    return pg.evaluate("document.querySelector('#media-job-status')?.innerText||''")


def toast_text(pg):
    return pg.evaluate("document.querySelector('#toast')?.textContent||''")


def press_prepare(pg):
    pg.evaluate("document.querySelector('.offline-extra')&&(document.querySelector('.offline-extra').open=true)")
    pg.click('[data-act="prepare-shell"]')


def wait_outcome(pg, seconds):
    """Poll until the page reports success or failure; returns (message, elapsed). Message '' means it never decided."""
    t0 = time.time()
    while time.time() - t0 < seconds:
        pg.wait_for_timeout(250)
        m = status_msg(pg)
        if '網頁已儲存' in m or '離線網頁準備不到' in m:
            return m, time.time() - t0
    return status_msg(pg), time.time() - t0


SHELL_STATE = """async()=>{const regs=await navigator.serviceWorker.getRegistrations();const names=await caches.keys();
 const out={regs:regs.map(r=>({scope:r.scope,active:!!r.active})),caches:names,controlled:!!navigator.serviceWorker.controller,index:null};
 for(const n of names){if(!n.startsWith('wordquest-r3-shell-'))continue;const r=await(await caches.open(n)).match(new URL('index.html',location.href).href);if(r){out.index={cache:n,status:r.status,bytes:(await r.clone().arrayBuffer()).byteLength};}}return out;}"""


def main():
    main_port, main_proc = start_server(OUT)
    aux_port, aux_proc = start_server(OUT)
    URL = f'http://127.0.0.1:{main_port}/app/index.html'
    errs = []

    # ---- static facts ---------------------------------------------------------------------------------------------
    manifest = {}

    def t_manifest():
        st, h, body = http_get(main_port, '/app/manifest.webmanifest')
        need(st == 200, f'GET manifest.webmanifest -> {st}')
        need('manifest+json' in h.get('Content-Type', ''), 'content-type ' + h.get('Content-Type', ''))
        m = json.loads(body.decode('utf-8'))
        manifest.update(m)
        need(m.get('name') == 'WordQuest' and m.get('lang') == 'zh-HK', f"name/lang {m.get('name')}/{m.get('lang')}")
        need(m.get('start_url') == './index.html' and m.get('display') == 'standalone', 'start_url/display')
        need(m.get('theme_color', '').lower() == '#bf4d25' and m.get('background_color', '').lower() == '#fff8ed', 'colours')
        need({i.get('purpose') for i in m.get('icons', [])} >= {'any', 'maskable'}, 'icon purposes')
        return f'{len(body)} bytes'
    check('manifest.webmanifest is served as manifest+json and is valid (zh-HK, WordQuest, standalone, #fff8ed / #bf4d25)', t_manifest)

    def t_icons():
        got = []
        for ic in manifest.get('icons', []):
            st, h, body = http_get(main_port, '/app/' + ic['src'])
            need(st == 200 and 'image/png' in h.get('Content-Type', ''), f"{ic['src']} -> {st}")
            w, hh = png_size(body)
            need(f'{w}x{hh}' == ic['sizes'], f"{ic['src']} is {w}x{hh}, declared {ic['sizes']}")
            got.append(f'{ic["src"]} {w}x{hh}')
        need({i['sizes'] for i in manifest.get('icons', [])} >= {'192x192', '512x512'}, 'need 192 and 512 icons')
        return ', '.join(sorted(set(got)))
    check('manifest icons exist, are PNG and match their declared 192 / 512 sizes', t_icons)

    with sync_playwright() as p:
        # ---- head links + Chromium transfer size ----------------------------------------------------------------
        b, ctx = new_ctx(p)
        pg = ctx.new_page()
        pg.on('pageerror', lambda e: errs.append(str(e)))
        first = {}

        def t_links():
            r = pg.goto(URL)
            first['resp'] = r
            first['sizes'] = r.request.sizes()
            first['etag'] = r.headers.get('etag')
            first['enc'] = r.headers.get('content-encoding')
            links = pg.evaluate("""()=>({m:document.querySelector('link[rel=manifest]')?.href||'',a:document.querySelector('link[rel=apple-touch-icon]')?.href||'',t:document.querySelector('meta[name=theme-color]')?.content||''})""")
            need(links['m'].endswith('/app/manifest.webmanifest'), 'manifest link: ' + links['m'])
            need(links['a'].endswith('/app/icons/icon-192.png'), 'apple-touch-icon: ' + links['a'])
            need(links['t'].lower() == '#bf4d25', 'theme-color ' + links['t'])
            for u in (links['m'], links['a']):
                need(http_get(main_port, u.split(str(main_port), 1)[1])[0] == 200, u + ' not 200')
        check('head has <link rel=manifest> and apple-touch-icon (both resolve), theme-color kept', t_links)

        def t_transfer():
            n = first['sizes']['responseBodySize']
            need(first['enc'] in ('br', 'gzip'), 'content-encoding ' + str(first['enc']))
            need(n < 7 * 1048576, f'index.html transferred {n / 1048576:.2f} MB')
            return f"index.html first load {n} bytes ({first['enc']})"
        check('Chromium first load of index.html transfers under 7 MB (compressed)', t_transfer)

        def t_revalidate():
            r = pg.goto(URL)
            hdr = r.request.all_headers()
            n = r.request.sizes()['responseBodySize']
            need(first['etag'] and hdr.get('if-none-match') == first['etag'], f"if-none-match {hdr.get('if-none-match')} vs etag {first['etag']}")
            need(n == 0, f'revalidation still downloaded {n} bytes')
            return 'revalidated with If-None-Match, 0 body bytes'
        check('second load revalidates with If-None-Match and downloads no body (304)', t_revalidate)
        b.close()

        # ---- main flow: prepare -> cache -> offline -----------------------------------------------------------
        b, ctx = new_ctx(p)
        pg = ctx.new_page()
        pg.on('pageerror', lambda e: errs.append(str(e)))
        state = {}
        try:
            open_offline(pg, URL)
        except Exception as e:  # noqa: BLE001
            report('open the offline page of a clean browser', False, str(e).splitlines()[0])
            return finish(b)

        def t_prepare():
            press_prepare(pg)
            state['msg'], state['secs'] = wait_outcome(pg, 25)
            toast = toast_text(pg)
            need('此接入版請保留 HTML 檔案' not in toast, 'still shows the old stub toast: ' + toast)
            s = pg.evaluate(SHELL_STATE)
            state['s'] = s
            need(s['regs'] and s['regs'][0]['active'], 'no active service worker registration: ' + json.dumps(s['regs']))
            need(s['regs'][0]['scope'].endswith('/app/'), 'scope ' + s['regs'][0]['scope'])
            return f"registered + active in {state['secs']:.1f} s"
        check('按「準備網頁」: service worker is registered and active (scope /app/), old stub toast is gone', t_prepare)

        def t_cache():
            s = state.get('s') or pg.evaluate(SHELL_STATE)
            need(s['index'], 'no wordquest-r3-shell-* cache holds index.html; caches=' + json.dumps(s['caches']))
            need(s['index']['status'] == 200 and s['index']['bytes'] > 1000000, json.dumps(s['index']))
            return f"{s['index']['cache']}: index.html {s['index']['bytes']} bytes"
        check('the shell cache really contains index.html (200, > 1 MB)', t_cache)

        def t_ui():
            need(ui_ready(pg) == '已準備', f"offline summary says '{ui_ready(pg)}'")
            need('網頁已儲存' in status_msg(pg), 'message: ' + status_msg(pg))
        check('UI shows 已準備 + success message only after the cache check', t_ui)

        def t_offline():
            ctx.set_offline(True)
            pg.reload()
            pg.wait_for_function("document.body&&document.body.innerText.length>20", timeout=15000)
            title = pg.title()
            need('WordQuest' in title, 'title after offline reload: ' + title)
            need(pg.evaluate("!!navigator.serviceWorker.controller"), 'page not controlled by the service worker')
            return title
        check('offline (set_offline) reload still shows the app, served by the service worker', t_offline)

        def t_again():
            ctx.set_offline(False)
            pg.reload()
            pg.wait_for_timeout(1500)
            wq33.unlock_parent(pg)
            pg.evaluate("location.hash='#offline'")
            pg.wait_for_timeout(900)
            wq33.unlock_parent(pg)
            press_prepare(pg)
            msg, _ = wait_outcome(pg, 25)
            s = pg.evaluate(SHELL_STATE)
            shell_caches = [c for c in s['caches'] if c.startswith('wordquest-r3-shell-')]
            need(len(s['regs']) == 1 and len(shell_caches) == 1, f"{len(s['regs'])} registrations, {len(shell_caches)} shell caches")
            need(ui_ready(pg) == '已準備', 'UI after pressing again: ' + ui_ready(pg))
        check('pressing 準備網頁 again keeps exactly 1 registration and 1 shell cache', t_again)

        def t_server_dead():
            stop_server(main_proc)
            time.sleep(0.5)
            pg.reload()
            pg.wait_for_function("document.body&&document.body.innerText.length>20", timeout=15000)
            need('WordQuest' in pg.title(), 'title ' + pg.title())
            return 'node server stopped; page still opens from the cache'
        check('with the server process really stopped, a reload still opens the app', t_server_dead)
        b.close()

        # ---- failure paths: never claim 已準備 -----------------------------------------------------------------
        def failure(name, make_url, init_script=None, limit=14, max_secs=None, extra=None):
            def run():
                bb, cc = new_ctx(p)
                try:
                    if init_script:
                        cc.add_init_script(init_script)
                    g = cc.new_page()
                    g.on('pageerror', lambda e: errs.append(str(e)))
                    open_offline(g, make_url)
                    press_prepare(g)
                    msg, secs = wait_outcome(g, limit)
                    g.wait_for_timeout(500)
                    need(ui_ready(g) != '已準備', f'UI claims ready ({ui_ready(g)})')
                    need('離線網頁準備不到' in msg, f"no failure reason shown (message '{msg}')")
                    if max_secs:
                        need(secs < max_secs, f'took {secs:.1f} s to give up')
                    if extra:
                        extra(g)
                    return f"'{msg[:40]}…' after {secs:.1f} s"
                finally:
                    bb.close()
            check(name, run)

        failure('failure: service worker registration rejected -> not 已準備, reason shown',
                f'http://127.0.0.1:{aux_port}/app/index.html',
                init_script="ServiceWorkerContainer.prototype.register=function(){return Promise.reject(new DOMException('blocked by test','SecurityError'));};")

        d404 = variant('sw404', drop_sw=True)
        p404, pr404 = start_server(d404)
        failure('failure: sw.js is missing (404) -> not 已準備, reason shown', f'http://127.0.0.1:{p404}/app/index.html')
        stop_server(pr404)

        dfail = variant('swfail', sw="self.addEventListener('install',e=>e.waitUntil(Promise.reject(new Error('install failed on purpose'))));")
        pfail, prfail = start_server(dfail)
        failure('failure: install fails -> not 已準備, decided within 15 s (does not wait for the 45 s limit)',
                f'http://127.0.0.1:{pfail}/app/index.html', limit=20, max_secs=15)
        stop_server(prfail)

        dnoidx = variant('swnoindex', sw=(
            "const S='wordquest-r3-shell-'+encodeURIComponent(new URL('./',self.location.href).pathname)+'-3.4.0';"
            "self.addEventListener('install',e=>e.waitUntil(caches.open(S).then(c=>c.put(new Request('/app/other.txt'),new Response('x')))));"
            "self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));"))
        pnoidx, prnoidx = start_server(dnoidx)
        failure('failure: worker is active but index.html is not in the cache -> not 已準備, reason shown',
                f'http://127.0.0.1:{pnoidx}/app/index.html')
        stop_server(prnoidx)

        # ---- activate cleanup -------------------------------------------------------------------------------------
        def t_cleanup():
            bb, cc = new_ctx(p)
            try:
                g = cc.new_page()
                open_offline(g, f'http://127.0.0.1:{aux_port}/app/index.html')
                g.evaluate("""async()=>{for(const n of ['wordquest-r3-shell-%2Fapp%2F-3.2.0','wordquest-r3-shell-%2Fapp%2F-0.0.1','wordquest-r3-shell-%2Fother%2F-3.2.0','wordquest-r3-ocr-%2Fapp%2F-1234','wordquest-r3-config','unrelated-cache']){await(await caches.open(n)).put('/seed.txt',new Response(n));}}""")
                press_prepare(g)
                msg, secs = wait_outcome(g, 25)
                need('網頁已儲存' in msg, 'prepare did not succeed: ' + msg)
                g.wait_for_timeout(1000)
                names = set(g.evaluate("caches.keys()"))
                gone = {'wordquest-r3-shell-%2Fapp%2F-3.2.0', 'wordquest-r3-shell-%2Fapp%2F-0.0.1'}
                kept = {'wordquest-r3-shell-%2Fother%2F-3.2.0', 'wordquest-r3-ocr-%2Fapp%2F-1234', 'wordquest-r3-config', 'unrelated-cache'}
                need(not (gone & names), 'old shell caches survived: ' + str(sorted(gone & names)))
                need(kept <= names, 'removed too much: ' + str(sorted(kept - names)))
                need(any(n.startswith('wordquest-r3-shell-%2Fapp%2F-') and n not in gone for n in names), 'current shell cache missing: ' + str(sorted(names)))
                return f'left: {sorted(names)}'
            finally:
                bb.close()
        check('activate removes only OLD shell caches of this scope (OCR, config, other scopes and unrelated caches stay)', t_cleanup)

        # ---- upgrade from an R3.2 worker (same scope, same URL): honest "ready", no hang ---------------------------
        def t_upgrade():
            old_sw = (wq33.R / 'originals/R3_2/app/sw.js').read_text()
            dold = variant('oldsw', sw=old_sw)
            port, pr = start_server(dold)
            bb, cc = new_ctx(p)
            try:
                g = cc.new_page()
                furl = f'http://127.0.0.1:{port}/app/index.html'
                open_offline(g, furl)
                # Install the R3.2 worker directly (R3.2's own page never could): it caches index.html under the -3.2.0 name.
                g.evaluate("navigator.serviceWorker.register('sw.js',{scope:'./'}).then(()=>navigator.serviceWorker.ready)")
                g.wait_for_timeout(1500)
                before = g.evaluate(SHELL_STATE)
                need(before['regs'] and before['regs'][0]['active'], 'old worker did not activate')
                stop_server(pr)
                port2, pr2 = start_server(OUT, port=port)
                g.reload()
                g.wait_for_timeout(1500)
                wq33.unlock_parent(g)
                g.evaluate("location.hash='#offline'")
                g.wait_for_timeout(900)
                wq33.unlock_parent(g)
                press_prepare(g)
                msg, secs = wait_outcome(g, 30)
                after = g.evaluate(SHELL_STATE)
                shell = [c for c in after['caches'] if c.startswith('wordquest-r3-shell-')]
                need('網頁已儲存' in msg and ui_ready(g) == '已準備', f"upgrade not reported as ready: '{msg}' / '{ui_ready(g)}'")
                need(after['index'] is not None, 'no cached index.html after the upgrade')
                return f'ready after {secs:.1f} s; shell caches {shell}'
            finally:
                bb.close()
        check('upgrade over an active R3.2 worker: still reports ready only with a cached index.html, no hang', t_upgrade)

        # ---- file: mode -------------------------------------------------------------------------------------------
        def t_file():
            bb, cc = new_ctx(p)
            try:
                g = cc.new_page()
                con = []
                g.on('console', lambda m: con.append(m.text) if m.type == 'error' else None)
                g.on('pageerror', lambda e: errs.append(str(e)))
                furl = (OUT / 'app/index.html').as_uri()
                open_offline(g, furl)
                press_prepare(g)
                g.wait_for_timeout(1500)
                msg = status_msg(g)
                regs = g.evaluate("(async()=>{try{return navigator.serviceWorker?(await navigator.serviceWorker.getRegistrations()).length:0;}catch(_){return 0;}})()")  # file: origin may refuse the call: still 0 registrations
                body = g.evaluate("document.querySelector('.offline-summary')?.innerText||''")
                need('保留' in msg and '檔案' in msg, 'file: message was: ' + msg)
                need('保留這個檔案' in body or '保留' in body, 'summary wording missing')
                need(regs == 0, f'{regs} service worker registrations in file: mode')
                bad = [c for c in con if 'manifest' in c.lower()]
                need(not bad, 'manifest console errors: ' + str(bad))
                return msg
            finally:
                bb.close()
        check('file: mode keeps the "keep this HTML file" wording, registers nothing, no manifest errors', t_file)

        check('no uncaught page errors during any of the flows', lambda: need(not errs, 'page errors: ' + ' | '.join(errs[:3])) or f'{len(errs)} errors')
    return finish(None)


def finish(browser):
    if browser:
        try:
            browser.close()
        except Exception:  # noqa: BLE001
            pass
    for pr in procs:
        stop_server(pr)
    shutil.rmtree(TMP, ignore_errors=True)
    failed = sum(1 for _, ok in rows if not ok)
    print(f'TOTAL {len(rows)} PASS {len(rows) - failed} FAIL {failed} (out: {OUT})', flush=True)
    sys.exit(1 if failed else 0)


if __name__ == '__main__':
    try:
        main()
    finally:
        for pr in procs:
            stop_server(pr)
        shutil.rmtree(TMP, ignore_errors=True)
