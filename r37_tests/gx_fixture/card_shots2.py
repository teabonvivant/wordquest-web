import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from lib import open_game, R
from playwright.sync_api import sync_playwright
OUT = R/'r37_evidence'/'r322'/'card'
def C(pg,n,a=None): return pg.evaluate('([n,a])=>WQ37Card._cmd(n,a)',[n,a])
def D(pg): return pg.evaluate('WQ37Card._debug')
with sync_playwright() as p:
  for (W,H,t) in [(390,844,True),(844,390,True)]:
    b,pg,errs=open_game(p,'card_game.js','WQ37Card','english',0,9,3,size=(W,H),touch=t,reduced=False)
    pg.wait_for_timeout(200)
    if pg.query_selector('.gx-how [data-r=ok]'): pg.click('.gx-how [data-r=ok]')
    pg.wait_for_selector('.gx-pv [data-r=go]'); pg.click('.gx-pv [data-r=go]'); pg.wait_for_timeout(1500)
    C(pg,'noevent'); C(pg,'player',{'energy':3,'hp':12})
    for i in range(4):
        d=D(pg)
        if not d['hand']: break
        C(pg,'select',0); d=D(pg); c=d['cast']
        if not c: break
        it=pg.evaluate("(id)=>OPTS.items.concat(OPTS.review).find(x=>x.id===id).en",c['item'])
        C(pg,'type',it.replace(' ','')[c['locked']:]); 
        if D(pg)['cast']: C(pg,'submit')
        pg.wait_for_timeout(330 if i<3 else 120)
    pg.screenshot(path=str(OUT/f'c_combo_{W}x{H}.png')); pg.wait_for_timeout(700); pg.screenshot(path=str(OUT/f'c_combo2_{W}x{H}.png'))
    print(D(pg)['combo'], D(pg)['phase'], errs)
    b.close()
