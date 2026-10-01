import sys,json
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'tests'))
from harness import boot,register,state_snapshot
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox','--autoplay-policy=no-user-gesture-required'])
 ctx,page,errors,dialogs=boot(b)
 print('boot errors',errors)
 print(page.evaluate('WQR2Runtime.status()'))
 profile=register(page,'r2-probe');print('profile',profile)
 page.evaluate("location.hash='#game'");page.wait_for_timeout(200)
 print('body',page.locator('main').first.inner_text()[:5000]);print('errors',errors)
 page.screenshot(path=str(ROOT/'arcade_evidence/lobby_probe.png'),full_page=True)
 state=state_snapshot(page);(ROOT/'arcade_evidence/test_fixture_initial.json').write_text(json.dumps(state,ensure_ascii=False,indent=2))
 print('dbkeys',list(state['local']))
 # Use actual preview function via UI, no currency or engine fixtures.
 page.locator('[data-cabinet="ruins-courier"] [data-a28="intro"]').click();print('dialog',page.locator('#pg-dialog').inner_text())
 print('buttons',page.locator('#pg-dialog button').evaluate_all('(els)=>els.map(e=>({text:e.innerText,data:e.dataset}))'))
 b.close()
