import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from lib import open_game, R
from playwright.sync_api import sync_playwright
OUT = R/'r37_evidence'/'r322'/'card'; OUT.mkdir(parents=True, exist_ok=True)
tag = sys.argv[1] if len(sys.argv)>1 else 'a'
SIZES=[(390,844,True),(360,640,True),(844,390,True),(1440,900,False)]
def C(pg,n,a=None): return pg.evaluate('([n,a])=>WQ37Card._cmd(n,a)',[n,a])
def step(pg,n): pg.evaluate('(n)=>WQ37Card._step(n,1/60)',n)
with sync_playwright() as p:
  for subj,w,s in [('english',0,3),('math',2,4)]:
    for (W,H,t) in SIZES:
      b,pg,errs=open_game(p,'card_game.js','WQ37Card',subj,w,s,3,size=(W,H),touch=t,reduced=False)
      pg.wait_for_timeout(200)
      if pg.query_selector('.gx-how [data-r=ok]'): pg.click('.gx-how [data-r=ok]')
      pg.wait_for_selector('.gx-pv [data-r=go]'); pg.click('.gx-pv [data-r=go]'); pg.wait_for_timeout(1500)
      n=f'{tag}_{subj}_{W}x{H}'
      pg.screenshot(path=str(OUT/f'{n}_hand.png'))
      C(pg,'select',0); pg.wait_for_timeout(400); pg.screenshot(path=str(OUT/f'{n}_cast.png'))
      C(pg,'type','zzzzzzzzzzzz' if subj=='english' else '98765'); 
      if (C(pg,'snapshot') or {}).get('cast'): C(pg,'submit')
      pg.wait_for_timeout(500); pg.screenshot(path=str(OUT/f'{n}_wrong.png'))
      print(n, errs)
      b.close()
