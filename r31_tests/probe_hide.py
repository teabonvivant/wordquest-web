from pathlib import Path
import sys,json
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'tests'));from harness import boot
from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);c,p,e,d=boot(b)
 p.evaluate('location.hash="#kid"');p.wait_for_timeout(100);p.evaluate('WQ32.setPreference("show",false)');p.evaluate('location.hash="#kid"');p.wait_for_timeout(200)
 r=p.evaluate('''()=>({pref:WQ32.getPreferences(),classes:document.body.className,roster:!!document.querySelector('#wq32-home-cast'),images:[...document.querySelectorAll('.l30-hero img[data-wq32-character]')].map(e=>({src:e.dataset.wq32Character,visible:!!e.getClientRects().length,display:getComputedStyle(e).display,visibility:getComputedStyle(e).visibility}))})''')
 print(json.dumps(r,ensure_ascii=False,indent=2));(R/'r31_evidence/hide_probe.json').write_text(json.dumps(r,ensure_ascii=False,indent=2));b.close()
