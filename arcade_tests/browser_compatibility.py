"""Create a paid run by operating the delivered R1 app, then restore its serialized
storage in R2. Uses declared synthetic fixtures and memory storage, not native disk.
"""
from pathlib import Path
import sys,json,traceback
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'tests'))
import harness
from playwright.sync_api import sync_playwright
R2=(ROOT/'app/index.html').read_text();R1=(ROOT/'originals/R1/index.html').read_text()
bridge="window.__compat={state:()=>({run:structuredClone(a28Run()),balance:activeChild().stars,words:structuredClone(db.words),children:structuredClone(db.children)}),game:()=>pgGame?SNAP28.capture(pgGame):null};\n"
fixture=json.loads((ROOT/'arcade_evidence/test_fixture_initial.json').read_text());key=next(k for k in fixture['local'] if k.startswith('wordquest-v10-user-'));db=json.loads(fixture['local'][key]);db['children'][0]['stars']=40;db.pop('arcadeV28',None);fixture['local'][key]=json.dumps(db,ensure_ascii=False)
out=[]
def check(name,ok,detail=None):
 out.append({'id':f'COMPAT-{len(out)+1:03}','name':name,'pass':bool(ok),'detail':detail});print(out[-1],flush=True);(ROOT/'arcade_evidence/compatibility_results.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for gid in ['sky-rescue','number-garden']:
   harness.HTML=R1.replace('\ninstallMediaEvents();\nrender();','\n'+bridge+'installMediaEvents();\nrender();')
   ctx,page,err,_=harness.boot(b,initial=fixture);page.evaluate("location.hash='#game'");page.wait_for_selector(f'[data-cabinet="{gid}"]');page.locator(f'[data-cabinet="{gid}"] [data-a28="intro"]').click();page.locator('#pg-dialog [data-a28="buy"]').click();page.wait_for_selector('#pg-canvas');page.locator('[data-a28="play"]').click();page.wait_for_timeout(120);page.keyboard.press('ArrowLeft');page.keyboard.press('ArrowDown');page.wait_for_timeout(160);page.locator('[data-a28="pause"]').click();page.wait_for_timeout(80)
   old=page.evaluate('__compat.state()');saved=harness.state_snapshot(page);check(gid+' R1 actual UI produced a charged paused checkpoint',old['balance']==39 and old['run']['phase']=='paused' and old['run']['started'] and old['run']['snapshot'] is not None);ctx.close()
   harness.HTML=R2.replace('\ninstallMediaEvents();\nrender();','\n'+bridge+'installMediaEvents();\nrender();')
   ctx,page,err2,_=harness.boot(b,initial=saved);page.evaluate("location.hash='#game'");page.wait_for_timeout(120);page.locator('[data-a28="resume"]').first.click();page.wait_for_selector('#pg-canvas');new=page.evaluate('__compat.state()');restored=page.evaluate('__compat.game()')
   check(gid+' R2 restores exact R1 run ID and engine snapshot',new['run']['id']==old['run']['id'] and restored==old['run']['snapshot'])
   check(gid+' R1 balance, English words and child records retained',new['balance']==old['balance'] and new['words']==old['words'] and new['children']==old['children'])
   page.locator('[data-a28="play"]').click();page.wait_for_timeout(180);page.locator('[data-a28="pause"]').click();continued=page.evaluate('__compat.state()')
   check(gid+' R1 run continues without buying again',continued['balance']==39 and continued['run']['id']==old['run']['id'] and continued['run']['elapsedMs']>old['run']['elapsedMs'])
   check(gid+' no R1 or R2 browser exceptions',not err and not err2,err+err2);ctx.close()
  b.close()
except Exception:check('Compatibility suite interrupted',False,traceback.format_exc())
