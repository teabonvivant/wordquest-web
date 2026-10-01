from pathlib import Path
import sys,json
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'tests'))
from harness import *
from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 c,p,e,d=boot(b)
 print('guest',e, p.locator('body').inner_text()[:250])
 profile=register(p);print('registered',profile,e)
 p.evaluate("location.hash='#settings'");p.wait_for_timeout(250)
 if p.locator('#v23-parent-password').count():
  p.locator('#v23-parent-password').fill('R1testPass99');p.locator('[data-v23="parent-unlock"]').click();p.wait_for_timeout(300)
 print('family',p.locator('[data-r3="family"]').count(),e)
 p.locator('[data-r3="family"]').click();p.wait_for_timeout(200);print('dialog',p.locator('#r3-dialog').count(),e,d[-5:]);
 p.screenshot(path=str(R/'r3_evidence/smoke_family.png'),full_page=True)
 (R/'r3_evidence/smoke.json').write_text(json.dumps({'errors':e,'dialogs':d,'profile':profile},ensure_ascii=False,indent=2));b.close()
