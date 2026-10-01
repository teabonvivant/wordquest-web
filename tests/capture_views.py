from playwright.sync_api import sync_playwright
from harness import boot,ROOT
from integration_checks import mc,op,question,answer
import json
out=[]
with sync_playwright() as pw:
 browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
 for w in [390,1280]:
  ctx,p,errors,dialogs=boot(browser,width=w)
  p.screenshot(path=str(ROOT/f'evidence/english-home-{w}.png'))
  op(p)
  p.screenshot(path=str(ROOT/f'evidence/maths-home-{w}.png'))
  mc(p,'daily:normal')
  out.append(p.evaluate('''()=>{const d=document.querySelector('#wqm-dialog'),a=document.querySelector('#wqm-app-host').shadowRoot.querySelector('[data-action="submit"]');return{width:innerWidth,dialog:d.getBoundingClientRect().toJSON(),scroll:d.scrollHeight,height:d.clientHeight,submit:a.getBoundingClientRect().toJSON()}}'''))
  p.locator('#wqm-app-host [data-action="submit"]').scroll_into_view_if_needed()
  p.screenshot(path=str(ROOT/f'evidence/maths-answer-{w}.png'))
  answer(p)
  p.screenshot(path=str(ROOT/f'evidence/maths-feedback-{w}.png'))
  ctx.close()
 browser.close()
(ROOT/'evidence/viewport_capture.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
print(json.dumps(out,indent=2))
