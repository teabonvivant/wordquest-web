"""阿峰 live game keyboard/canvas checks. Explicit synthetic account + I/O adapters,
no direct physics mutation. Read-only game pose inspection is injected in test HTML only.
"""
from pathlib import Path
import json,sys,traceback
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1];E=R/'r32_evidence'
# Reuse the already reviewed synthetic arcade fixture, boot and keyboard helpers,
# without running that suite or changing its results.
ns={'__file__':str(R/'r32_tests/arcade_browser.py')}
exec((R/'r32_tests/arcade_browser.py').read_text().split('try:\n with sync_playwright()')[0],ns)
harness=ns['harness'];harness.HTML=harness.HTML.replace('window.__arcadeQA={','window.__arcadeQA={pose:()=>pgGame?WQAFeng.describe(pgGame):null,')
rows=[]
def check(name,ok,detail=None):
 rows.append({'name':name,'status':'pass' if ok else 'fail','detail':detail});(E/'cloud_live.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2));print(rows[-1],flush=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);ctx,p,errors,_=harness.boot(b,initial=ns['fixture']);ns['start'](p,'cloud-island');p.wait_for_timeout(250)
 check('Shipped cloud-island runtime has an articulated goat pose',p.evaluate('__arcadeQA.game().id==="cloud-island" && !!__arcadeQA.pose()'))
 p.keyboard.down('ArrowRight');p.wait_for_timeout(130);pose=p.evaluate('__arcadeQA.pose()');check('Held right key selects moving right-facing run pose',pose['action']=='run' and pose['face']==1,pose);p.keyboard.up('ArrowRight')
 p.keyboard.down('ArrowLeft');p.wait_for_timeout(70);p.keyboard.up('ArrowLeft');p.wait_for_timeout(180);pose=p.evaluate('__arcadeQA.pose()');check('Stopping after left movement retains left-facing pose',pose['face']==-1,pose)
 p.keyboard.down('ArrowUp');p.wait_for_timeout(70);pose=p.evaluate('__arcadeQA.pose()');check('Real jump key selects upward jump pose',pose['action']=='jump',pose);p.keyboard.up('ArrowUp')
 p.screenshot(path=str(E/'afeng-cloud-live-desktop.png'),full_page=True)
 p.locator('[data-a28="pause"]').click();pose=p.evaluate('__arcadeQA.pose()');p.wait_for_timeout(170);check('Game pause freezes articulated pose and source simulation clock',pose==p.evaluate('__arcadeQA.pose()'),pose)
 p.set_viewport_size({'width':320,'height':568});p.locator('[data-a28="r2-full"]').click();p.locator('[data-a28="play"]').click();p.wait_for_timeout(50);p.screenshot(path=str(E/'afeng-cloud-live-mobile.png'))
 m=p.locator('#pg-canvas').bounding_box();check('320px actual playing goat canvas remains within viewport',m['width']>=250 and m['x']>=0 and m['x']+m['width']<=321,m)
 check('No uncaught errors in live goat game',not errors,errors);ctx.close();b.close()
sys.exit(1 if any(x['status']=='fail' for x in rows) else 0)
