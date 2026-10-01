from pathlib import Path
import re,subprocess,sys,json
R=Path(__file__).resolve().parents[1];E=R/'r31_evidence';E.mkdir(exist_ok=True)
for i,m in enumerate(re.finditer(r'<script\b[^>]*>(.*?)</script>',(R/'app/index.html').read_text(),re.S|re.I)):
 p=E/'syntax_temp.js';p.write_text(m[1]);q=subprocess.run(['node','--check',str(p)],capture_output=True,text=True)
 if q.returncode:print(i,q.stderr);sys.exit(1)
p.unlink();print('syntax all passed')
sys.path.insert(0,str(R/'tests'));from harness import boot,register
from playwright.sync_api import sync_playwright
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);c,p,err,d=boot(b)
 print('error boot',err);print('roles',p.evaluate('WQ32.roles()'))
 p.screenshot(path=str(E/'home_initial.png'),full_page=True)
 p.evaluate("location.hash='#companions'");p.wait_for_timeout(100)
 print('gallery',p.locator('.wq32-profile').count(),err)
 p.screenshot(path=str(E/'gallery_initial.png'),full_page=True)
 p.evaluate('WQMathApp.open()');p.wait_for_timeout(150)
 print('math',p.locator('.wqm-v32-companion').count(),err)
 p.screenshot(path=str(E/'math_initial.png'),full_page=False)
 p.locator('#wqm-app-host [data-forest-options]').click();p.locator('#wqm-app-host [data-forest-pref="guide"]').select_option('panda')
 print('mathfixed',p.locator('.wqm-v32-companion').inner_text(),err)
 b.close()
