"""R3.41 loading: runs on the real app/ (external host), served like GitHub Pages. The service worker is switched on with WQ_SW_TEST because it stays off under webdriver."""
import functools, gzip, re, threading, time
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from playwright.sync_api import sync_playwright

R = Path(__file__).resolve().parents[1]
APP = R / 'app'
SLOW = [0]
ok, bad = 0, 0


def check(cond, msg):
    global ok, bad
    ok, bad = ok + bool(cond), bad + (not cond)
    print(('  ok ' if cond else '  FAIL ') + msg, flush=True)


class H(SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass

    def end_headers(self):
        self.send_header('Cache-Control', 'max-age=0')
        super().end_headers()

    def do_GET(self):
        if SLOW[0] and self.path.split('?')[0].endswith('index.html'):
            time.sleep(SLOW[0])
        super().do_GET()


srv = ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(H, directory=str(APP)))
threading.Thread(target=srv.serve_forever, daemon=True).start()
URL = f'http://127.0.0.1:{srv.server_address[1]}/index.html'
HOME = "document.querySelector('.r37-planet')&&!document.getElementById('wq-splash')"


def t_static():
    html = (APP / 'index.html').read_text()
    chunks = sorted((APP / 'data').glob('*.js'))
    text = html + ''.join(f.read_text() for f in chunks)
    check(len(html) < 1_000_000, f'index.html under 1 MB ({len(html)})')
    check(len(gzip.compress(html.encode(), 6)) + sum(len(gzip.compress(f.read_bytes(), 6)) for f in chunks) < 2_600_000, 'start-up download under 2.6 MB after gzip')
    check(not re.search(r'data:image/(webp|png);base64,[A-Za-z0-9+/=]{2000,}', text), 'no large picture left inside a script')
    refs = set(re.findall(r'assets/x/[0-9a-f]{12}\.webp', text))
    check(refs and all((APP / r).exists() for r in refs), f'all {len(refs)} extracted pictures exist')
    check(set(refs) == {f'assets/x/{f.name}' for f in (APP / 'assets/x').iterdir()}, 'no unused picture shipped')
    sw = (APP / 'sw.js').read_text()
    check(all(r in sw for r in refs) and all(f'data/{f.name}' in sw for f in chunks), 'the service worker stores every picture and script')


def t_sw(p):
    b = p.chromium.launch(args=['--no-sandbox'])
    c = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    pg = c.new_page()
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)[:160]))
    pg.goto(URL)
    pg.wait_for_function(HOME)
    check(pg.evaluate("document.title").startswith('學霸星球'), 'home opens from the external scripts')
    pg.wait_for_timeout(4000)
    check(pg.evaluate("navigator.serviceWorker.getRegistration().then(r=>!r)"), 'no worker under webdriver without the test switch, so other tests stay unaffected')
    pg.close()
    c.close()

    c = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    c.add_init_script("Object.defineProperty(navigator,'connection',{value:{saveData:true}})")
    c.add_init_script('window.WQ_SW_TEST=1')
    pg = c.new_page()
    pg.goto(URL)
    pg.wait_for_function(HOME)
    pg.wait_for_timeout(4000)
    check(pg.evaluate("navigator.serviceWorker.getRegistration().then(r=>!r)"), 'data saver: nothing is stored')
    c.close()

    c = b.new_context(viewport={'width': 390, 'height': 844}, is_mobile=True, has_touch=True)
    c.add_init_script('window.WQ_SW_TEST=1')
    pg = c.new_page()
    pg.on('pageerror', lambda e: errs.append(str(e)[:160]))
    pg.goto(URL)
    pg.wait_for_function(HOME)
    check(pg.evaluate("!!document.querySelector('.r37-planet')"), 'splash is gone and home is there')
    pg.wait_for_function("navigator.serviceWorker.controller", timeout=60000)
    check(True, 'worker registers by itself and takes control')
    pg.wait_for_function("""(async()=>{const k=(await caches.keys()).find(x=>x.includes('-shell-'));if(!k)return false;return (await (await caches.open(k)).keys()).length>500})()""", timeout=120000)
    check(True, 'pictures and scripts are stored')
    SLOW[0] = 8
    t = time.time()
    pg.reload(wait_until='commit', timeout=30000)
    pg.wait_for_function(HOME, timeout=20000)
    took = time.time() - t
    SLOW[0] = 0
    check(took < 7.5, f'a stalled network falls back to the saved page ({took:.1f} s against an 8 s server)')
    pg.wait_for_timeout(500)
    c.set_offline(True)
    pg.reload()
    pg.wait_for_function(HOME, timeout=20000)
    check(True, 'offline reload opens home')
    src = pg.evaluate("document.querySelectorAll('script[src*=\"data/\"]').length")
    check(src >= 15, 'offline reload ran every script')
    r = pg.evaluate("""async()=>{const t=WQ_D_IMG.apple,i=new Image();i.src=t;await new Promise((ok,no)=>{i.onload=ok;i.onerror=no;});return i.naturalWidth}""")
    check(r > 0, 'an extracted picture opens offline')
    c.set_offline(False)
    check(not errs, f'no page errors {errs[:3]}')
    b.close()


t_static()
with sync_playwright() as p:
    t_sw(p)
print(f't68: {ok}/{ok + bad} checks passed')
raise SystemExit(1 if bad else 0)
