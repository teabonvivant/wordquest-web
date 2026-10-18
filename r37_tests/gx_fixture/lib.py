"""Stand-alone dev/test harness for the R3.21 games (no full app build needed).
   open_game(p, game_file, global_name, subject='english', w=0, s=0, difficulty=2, size=(390,844), **start_opts)
   -> (browser, page, errs). The page has gx_core.js + levels_math.js + the game file inlined, items built the way the host will build them
   (English: real unit words from en_units.json; math: WQ37Math.make + WQ37Math.check). window.G = the running handle, window.OPTS = the options used.
   Playwright is used with touch enabled by default; pass touch=False for the desktop keyboard tests."""
import json
from pathlib import Path
from playwright.sync_api import sync_playwright  # noqa: F401

R = Path(__file__).resolve().parents[2]
SRC = R / 'r37_src'
UNITS = json.loads((Path(__file__).parent / 'en_units.json').read_text())

BOOT = """
window.MKITEMS = function(subject, w, s, diff, n){
  if(subject==='english'){
    const u=UNITS[w].units[s].words.slice(0,n||99);
    return u.map((x,i)=>({id:'e'+w+'-'+s+'-'+i,kind:'word',en:x.en,zh:x.zh,emoji:x.emoji||'',syl:x.syl||'',ex:x.ex||''}));
  }
  const qs=WQ37Math.make('math',w,s,n||8,diff||2,12345);
  return qs.map((x,i)=>({id:'m'+w+'-'+s+'-'+i,kind:'math',q:x.q,a:x.answer,explain:x.explain||'',hint:x.hint||'',pad:(/[\\/.]/.test(x.answer)||x.form)?'frac':'digits',check:t=>WQ37Math.check(x,t)}));
};
window.MKREVIEW = function(subject, w, s, diff){ return s>0?MKITEMS(subject,w,s-1,diff,2).map(x=>Object.assign({},x,{id:'rv-'+x.id})):[]; };
window.STARTGAME = function(name, subject, w, s, diff, extra){
  const items=MKITEMS(subject,w,s,diff,(subject==='english'&&w>=6)?12:8);
  const grade=subject==='math'?['小一二','小二','小三','小四','小五','小六'][w]:'詞彙 '+(w+1);
  window.OPTS=Object.assign({subject,items,review:MKREVIEW(subject,w,s,diff),difficulty:diff,mode:'level',sound:true,assetBase:'assets/r321/',
    level:{w,s,boss:s===9,title:'測試關',icon:'🌱',hue:205,grade},character:{id:'panda',icon:'🐼',img:'',name:'熊貓',perk:'heart'},
    syllables:e=>{const m=UNITS_SYL[e];return m||e;},
    onFinish:r=>{window.RESULT=r;return r.passed?1:0;},onNext:()=>{window.NEXT=1;},onExit:()=>{window.EXIT=1;}},extra||{});
  window.G=globalThis[name].start(document.getElementById('box'),window.OPTS);return window.G;
};
"""

def _units_js():
    return 'const UNITS=' + json.dumps([{'units': [{'words': u['words']} for u in W['units']]} for W in UNITS], ensure_ascii=False) + ';'

def page_html(game_file):
    syl = {x['en']: x['syl'] for W in UNITS for u in W['units'] for x in u['words'] if x.get('syl')}
    scripts = [_units_js(), 'const UNITS_SYL=' + json.dumps(syl, ensure_ascii=False) + ';', (SRC / 'gx_core.js').read_text(), (SRC / 'levels_math.js').read_text(), (SRC / game_file).read_text(), BOOT]
    for s in scripts: assert '</script' not in s.lower()
    return '<!doctype html><meta name=viewport content="width=device-width,initial-scale=1,viewport-fit=cover"><body style="margin:0;background:#000"><div id=box style="position:fixed;inset:0"></div>' + ''.join('<script>' + s + '</script>' for s in scripts)

def open_game(p, game_file, global_name, subject='english', w=0, s=0, difficulty=2, size=(390, 844), touch=True, reduced=True, cpu=None, **extra):
    b = p.chromium.launch(args=['--no-sandbox'])
    ctx = b.new_context(viewport=dict(width=size[0], height=size[1]), has_touch=touch, is_mobile=touch, device_scale_factor=2 if touch else 1, reduced_motion='reduce' if reduced else 'no-preference')
    pg = ctx.new_page(); errs = []
    pg.on('console', lambda m: errs.append('CONSOLE ' + m.text) if m.type == 'error' else None); pg.on('pageerror', lambda e: errs.append('PAGEERROR ' + str(e)))
    html = page_html(game_file)
    asset_root = R / 'app'
    def _assets(route):
        from urllib.parse import urlparse, unquote
        f = asset_root / unquote(urlparse(route.request.url).path).lstrip('/')
        if f.is_file():
            import mimetypes
            return route.fulfill(status=200, body=f.read_bytes(), content_type=mimetypes.guess_type(str(f))[0] or 'application/octet-stream')
        return route.fulfill(status=404, body='')
    pg.route('http://gx.test/**', lambda route: route.fulfill(status=200, content_type='text/html; charset=utf-8', body=html) if route.request.url.rstrip('/') == 'http://gx.test' else _assets(route))
    pg.goto('http://gx.test/'); pg.wait_for_timeout(200)
    if cpu:
        c = ctx.new_cdp_session(pg); c.send('Emulation.setCPUThrottlingRate', {'rate': cpu})
    pg.evaluate("(a)=>STARTGAME(a[0],a[1],a[2],a[3],a[4],a[5])", [global_name, subject, w, s, difficulty, extra])
    return b, pg, errs
