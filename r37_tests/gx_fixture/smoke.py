"""GX core DOM smoke: loads gx_core.js alone in a bare page, mounts a shell with a keypad and walks preview / wrong-answer card / ok chip / result card.
Usage: python3 r37_tests/gx_fixture/smoke.py [outdir]   (screenshots at 390x844, 360x640, 844x390, 1440x900)"""
import sys, json
from pathlib import Path
from playwright.sync_api import sync_playwright
R = Path(__file__).resolve().parents[2]
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else '/tmp/gx_smoke'); OUT.mkdir(parents=True, exist_ok=True)
JS = (R / 'r37_src' / 'gx_core.js').read_text()
HTML = '<!doctype html><meta name=viewport content="width=device-width,initial-scale=1"><body style="margin:0"><div id=box style="position:fixed;inset:0"></div><script>' + JS + '</script>'
ITEMS = [dict(kind='word', en=e, zh=z, emoji=m, ex='I see a ' + e + '.') for e, z, m in [('cat', '貓', '🐱'), ('carpet', '地毯', '🧶'), ('butter', '牛油', '🧈'), ('sun', '太陽', '☀️'), ('dog', '狗', '🐶'), ('hat', '帽子', '🎩'), ('bus', '巴士', '🚌'), ('cup', '杯子', '🥤')]]
errs = []
def run(p, w, h, tag):
    b = p.chromium.launch(args=['--no-sandbox']); ctx = b.new_context(viewport=dict(width=w, height=h), has_touch=True, device_scale_factor=2); pg = ctx.new_page()
    pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None); pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.set_content(HTML)
    pg.evaluate("""(items)=>{const GX=WQ37GX;window.S=GX.shell(document.getElementById('box'),{items,subject:'english',difficulty:2,sound:true,syllables:e=>e==='carpet'?'car·pet':e==='butter'?'but·ter':e,level:{w:0,s:2,grade:'詞彙 1'},onFinish:r=>2,onNext:()=>{},onExit:()=>{}},{id:'smoke'});
      window.P=GX.pad(S.root,{onKey:k=>{S.fx.burst(S.W/2,S.H/3,{n:10});S.sfx('key',{i:2})},onBack:()=>{}}); S.loop(()=>{},(c,W,H)=>{c.fillStyle='#14204f';c.fillRect(0,0,W,H);c.fillStyle='#fff';c.font='20px sans-serif';c.fillText('GX smoke',20,40)});
      S.ui.preview(S.learn.items,{onStart:()=>{}});}""", ITEMS)
    pg.wait_for_timeout(600); pg.screenshot(path=str(OUT / f'{tag}_1_preview.png'))
    pg.click('[data-r="go"]'); pg.wait_for_timeout(300)
    pg.screenshot(path=str(OUT / f'{tag}_2_pad.png'))
    pg.evaluate("()=>{S.ui.learn(S.learn.items[1],{typed:'carpit',onDone:()=>{window._learnDone=1}})}")
    pg.wait_for_timeout(500); pg.screenshot(path=str(OUT / f'{tag}_3_learn.png'))
    dis = pg.evaluate("()=>document.querySelector('.gx-learn [data-r=ok]').disabled"); assert dis, 'learn card must block continue during hold'
    pg.click('[data-r="ok"]', force=True, no_wait_after=True); assert not pg.evaluate("()=>window._learnDone"), 'cannot dismiss before 2s'
    pg.wait_for_timeout(1900); assert not pg.evaluate("()=>document.querySelector('.gx-learn [data-r=ok]').disabled"), 'enabled after hold'
    pg.click('[data-r="ok"]'); assert pg.evaluate("()=>window._learnDone") == 1
    pg.evaluate("()=>S.ui.ok(S.learn.items[2])"); pg.wait_for_timeout(300); pg.screenshot(path=str(OUT / f'{tag}_4_okchip.png'))
    pg.evaluate("()=>{S.learn.items.forEach((it,i)=>{const x=S.learn.take();S.learn.answer(x,i>1,900)}); S.finish({score:1200,maxCombo:7,seconds:84})}")
    pg.wait_for_timeout(1700); pg.screenshot(path=str(OUT / f'{tag}_5_result.png'))
    st = pg.evaluate("()=>({stars:S.result.stars,passed:S.result.passed,miss:S.result.missed.length,coins:S.result.coins,ctx:WQ37GX._contexts()})"); print(tag, json.dumps(st))
    pg.evaluate("()=>S.destroy()"); assert pg.evaluate("()=>document.querySelectorAll('.gx-root').length") == 0
    b.close()
with sync_playwright() as p:
    for w, h, t in [(390, 844, 'phone'), (360, 640, 'small'), (844, 390, 'land'), (1440, 900, 'desk')]: run(p, w, h, t)
print('console errors:', errs or 'none'); print('shots in', OUT)
