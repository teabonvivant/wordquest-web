from pathlib import Path
import sys,json
R=Path(__file__).resolve().parents[1];E=R/'r32_evidence';sys.path.insert(0,str(R/'tests'));from harness import boot,register
from playwright.sync_api import sync_playwright
rows=[]
def t(n,c):
 try:assert c;rows.append({'id':f'FOREST-SCOPE-{len(rows)+1:02d}','name':n,'status':'pass'})
 except Exception as ex:rows.append({'id':f'FOREST-SCOPE-{len(rows)+1:02d}','name':n,'status':'fail','error':str(ex)})
def go(p,s):p.evaluate('(s)=>location.hash="#"+s',s);p.wait_for_timeout(120)
def unlock(p):
 if p.locator('#v23-parent-password').count():p.locator('#v23-parent-password').fill('R1testPass99');p.locator('[data-v23="parent-unlock"]').click();p.wait_for_function('WQMathHost.parentAllowed()')
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);c,p,err,d=boot(b);first=register(p,name='forest-scope-qa',child='角色測試甲')
 p.evaluate('WQ32.setPreference("guide","star")');t('First child uses chosen hedgehog helper',p.evaluate('WQ32.getPreferences().guide==="star"'))
 go(p,'children');unlock(p);p.locator('[data-act="show-add-child"]').click();p.locator('#new-child-name').fill('角色測試乙');p.locator('#new-child-grade').select_option('2');p.locator('[data-act="add-child"]').click();p.wait_for_timeout(100);second=p.evaluate('WQMathHost.profile()')
 t('Second child identity actually differs',first['id']!=second['id']);t('Second child defaults do not inherit first child selection',p.evaluate('WQ32.getPreferences().guide==="auto"'))
 p.evaluate('WQ32.setPreference("guide","bee")');t('Second child independent choice saved',p.evaluate('WQ32.getPreferences().guide==="bee"'))
 go(p,'children');unlock(p);p.locator(f'[data-act="set-child"][data-id="{first["id"]}"]').click();p.wait_for_timeout(120)
 t('Switching back restores first child helper, not second child choice',p.evaluate('WQ32.getPreferences().guide==="star"'))
 p.evaluate('WQMathApp.open("home")');p.wait_for_timeout(80);t('First child actual maths portrait is hedgehog',p.locator('.forest-math-guide').get_attribute('data-forest-character')=='ci-ci')
 p.locator('#wqm-app-host [data-action="nav:olympiad"]').first.click();p.locator('#wqm-app-host [data-action="mock:1"]').click()
 t('Real mock button enters independent diagnostic mode',p.evaluate('WQMathApp.getState().current.mode==="diagnostic"'))
 t('Independent assessment hides fixed companion and its settings',p.locator('.forest-math-guide').count()==0 and p.locator('#wqm-app-host [data-forest-options]').count()==0)
 t('Independent assessment leaves original question and submit available',p.locator('#wqm-app-host [data-action="submit"]').count()==1)
 p.screenshot(path=str(E/'independent_assessment.png'),full_page=False)
 p.evaluate('WQMathApp.close()');t('Character actions have not added any coins',p.evaluate('WQMathHost.profile().balance===0'))
 t('No uncaught browser errors',not err);b.close()
(E/'child_and_exam.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2));print('TOTAL',len(rows),'PASS',sum(x['status']=='pass' for x in rows));sys.exit(any(x['status']!='pass' for x in rows))
