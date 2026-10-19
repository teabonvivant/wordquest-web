import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib import open_game, R
from playwright.sync_api import sync_playwright
OUT = R/'r37_evidence'/'r321'/'maze2'; OUT.mkdir(parents=True, exist_ok=True)
tag = sys.argv[1] if len(sys.argv)>1 else 'a'
J="""window.D=()=>WQ37Maze._debug;window.C=(n,a)=>WQ37Maze._cmd(n,a);window.ST=(n,dt)=>WQ37Maze._step(n,dt);null;"""
with sync_playwright() as p:
  for subj,w,s,diff in [('english',0,3,2),('math',2,3,3)]:
    for (W,H,touch) in [(390,844,True),(360,640,True),(844,390,True),(1440,900,False)]:
      b,pg,errs=open_game(p,'maze_game.js','WQ37Maze',subj,w,s,diff,size=(W,H),touch=touch,reduced=False,seed=7)
      pg.evaluate(J); pg.wait_for_timeout(300)
      if pg.query_selector('.gx-how [data-r=ok]'): pg.click('.gx-how [data-r=ok]')
      pg.wait_for_selector('[data-r=go]'); pg.click('[data-r=go]'); pg.wait_for_timeout(2600)
      pg.evaluate("()=>{C('calm',0);}")
      pg.evaluate("()=>{C('goto', D().tiles.filter(t=>t.tgt)[0].c-0)}") if False else None
      pg.evaluate("()=>{C('eatNext');}"); pg.wait_for_timeout(110)
      pg.screenshot(path=str(OUT/f'{tag}-{subj}-{W}x{H}-fly.png')); pg.wait_for_timeout(800)
      pg.screenshot(path=str(OUT/f'{tag}-{subj}-{W}x{H}-play.png'))
      pg.evaluate("()=>{C('eatWrong');}"); pg.wait_for_timeout(700)
      pg.screenshot(path=str(OUT/f'{tag}-{subj}-{W}x{H}-wrong.png'))
      print(subj,W,H,errs); b.close()
