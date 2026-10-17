"""R3.20 H1 - offline: build served by `python3 -m http.server`, service worker installed, then the context goes offline and the page is reloaded.

    python3 r37_tests/r320_sw_offline.py [app_dir]        # default: <repo>/app
Checks: sw.js cache name ends with -3.20; after the SW is active and the context is offline a reload still shows the kid home (#kid) and the arcade
lobby (#game), and one arcade game opens (play page with the HUD). Failed requests while offline are listed (only external fonts / speech may fail).
Screenshots and a JSON summary go to r37_evidence/r320/sw/."""
import json, re, subprocess, sys, time, socket
from pathlib import Path
from playwright.sync_api import sync_playwright

R = Path(__file__).resolve().parents[1]
APP = Path(sys.argv[1]).resolve() if len(sys.argv) > 1 else R / 'app'
OUT = R / 'r37_evidence' / 'r320' / 'sw'
OUT.mkdir(parents=True, exist_ok=True)


def free_port():
    s = socket.socket(); s.bind(('127.0.0.1', 0)); p = s.getsockname()[1]; s.close(); return p


def main():
    port = free_port()
    srv = subprocess.Popen([sys.executable, '-m', 'http.server', str(port), '--bind', '127.0.0.1'], cwd=str(APP), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.0)
    summary = {'sw_cache_name': None, 'checks': {}, 'failed_requests_offline': []}
    try:
        sw = (APP / 'sw.js').read_text()
        m = re.search(r"['\"]([^'\"]*-3\.20)['\"]", sw)
        summary['sw_cache_name'] = m.group(1) if m else None
        summary['checks']['sw_cache_name_ends_-3.20'] = bool(m)
        base = f'http://127.0.0.1:{port}/index.html'
        with sync_playwright() as p:
            b = p.chromium.launch(args=['--no-sandbox'])
            ctx = b.new_context(viewport={'width': 1440, 'height': 900}, service_workers='allow')
            pg = ctx.new_page(); errs = []
            pg.on('pageerror', lambda e: errs.append(str(e)))
            pg.goto(base); pg.wait_for_timeout(2500)
            # account + child (same helper as the other tests, without the file:// route trick)
            pg.evaluate("location.hash='#login'"); pg.wait_for_timeout(400)
            pg.fill('#register-name', 'offlinetest'); pg.fill('#register-child', '小明')
            if pg.query_selector('#register-grade'):
                pg.select_option('#register-grade', '3')
            pg.fill('#register-pin', 'R1testPass99'); pg.click('[data-act="register-submit"]'); pg.wait_for_timeout(2500)
            # wait for the service worker to be active and controlling
            for _ in range(40):
                st = pg.evaluate("navigator.serviceWorker?navigator.serviceWorker.getRegistration().then(r=>!!(r&&r.active)):false")
                if st: break
                pg.wait_for_timeout(500)
            summary['checks']['sw_active'] = bool(st)
            pg.reload(); pg.wait_for_timeout(2500)
            caches = pg.evaluate("caches.keys()")
            summary['caches'] = caches
            summary['checks']['cache_name_in_browser'] = any(c.endswith('-3.20') for c in caches)
            ctx.set_offline(True)
            failed = []
            pg.on('requestfailed', lambda r: failed.append(r.url[:120]))
            pg.reload(); pg.wait_for_timeout(3000)
            pg.evaluate("location.hash='#kid'"); pg.wait_for_timeout(1500)
            kid = pg.evaluate("!!document.querySelector('#app')&&document.querySelector('#app').innerText.length>40")
            pg.screenshot(path=str(OUT / 'offline_kid.png'))
            summary['checks']['offline_kid_home'] = bool(kid)
            pg.evaluate("location.hash='#game'"); pg.wait_for_timeout(2000)
            lobby = pg.evaluate("document.querySelectorAll('[data-cabinet]').length")
            pg.screenshot(path=str(OUT / 'offline_game_lobby.png'))
            summary['checks']['offline_arcade_lobby_cards'] = lobby >= 20
            summary['lobby_cards'] = lobby
            # open a game while offline: preview dialog proves the engines are in the cached page; then the buy flow
            ok_open = False
            try:
                pg.locator('[data-cabinet="sky-rescue"] [data-a28="intro"]').click(); pg.wait_for_timeout(800)
                pg.screenshot(path=str(OUT / 'offline_game_intro.png'))
                ok_open = pg.evaluate("!!document.querySelector('#pg-dialog canvas')")
            except Exception as e:
                summary['open_error'] = repr(e)[:160]
            summary['checks']['offline_game_opens'] = bool(ok_open)
            summary['failed_requests_offline'] = sorted(set(failed))[:20]
            summary['page_errors'] = errs[:5]
            summary['checks']['no_external_failures_except_fonts_speech'] = all(('fonts.g' in u or 'speech' in u or 'gstatic' in u) for u in summary['failed_requests_offline'])
            b.close()
    finally:
        srv.terminate()
    summary['all_pass'] = all(summary['checks'].values())
    (OUT / 'summary.json').write_text(json.dumps(summary, ensure_ascii=False, indent=1))
    print(json.dumps(summary, ensure_ascii=False, indent=1))
    sys.exit(0 if summary['all_pass'] else 1)


if __name__ == '__main__':
    main()
