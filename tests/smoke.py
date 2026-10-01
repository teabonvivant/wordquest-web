from harness import *
from playwright.sync_api import sync_playwright
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 ctx,page,errors,dialogs=boot(b)
 print('BOOT',page.evaluate('({math:WQMathApp.hostConnected(),title:document.title,roles:WQ32.roles()})'))
 page.locator('[data-wqm-open="home"]').click();print('OPEN',page.evaluate('({open:document.querySelector("#wqm-dialog").open,state:WQMathApp.getState(),view:WQMathApp.getView()})'))
 page.screenshot(path=str(ROOT/'evidence/first-math-smoke.png'))
 page.locator('[data-action="close"]').click()
 print('PROFILE',register(page))
 page.locator('[data-wqm-open="home"]').click()
 print('REGISTERED MATH',page.evaluate('({open:document.querySelector("#wqm-dialog").open,profile:WQMathHost.profile(),view:WQMathApp.getView()})'))
 print('ERRORS',errors,'DIALOGS',dialogs)
 ctx.close();b.close()
