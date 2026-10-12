from playwright.sync_api import sync_playwright
from pathlib import Path
import json
R=Path(__file__).resolve().parents[1];O=R/'math_course_evidence';units=json.loads((R/'math_course_src/curriculum-map.json').read_text())['units'];results=[];errors=[]
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);page=b.new_page(viewport={'width':1440,'height':1000});page.set_default_timeout(6000)
 page.evaluate("()=>{let m=new Map();Object.defineProperty(window,'localStorage',{value:{getItem:k=>m.get(k)??null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),key:i=>[...m.keys()][i]??null,get length(){return m.size}}});}")
 page.on('pageerror',lambda e:errors.append(str(e)));page.set_content((R/'math_course_preview.html').read_text(),wait_until='load')
 for u in [x for x in units if x.get('tool')]:
  for part in [1,2]:
   try:
    page.locator('[data-c1="view:map"]').first.click();page.locator(f'[data-c1="grade:{u["grade"]}"]').first.click();page.locator(f'[data-c1="learn:{u["code"]}:{part}"]').first.click();page.locator('[data-c1="step:1"]').first.click()
    frame=page.frame_locator('#c1-tool');frame.locator('#tool-visual').wait_for();frame.locator('[data-action="tool-reset"]').click();frame.locator('[data-action="tool-check"]').click();page.wait_for_timeout(50)
    f=page.frames[-1];text=frame.locator('#view').inner_text();assert '今日小任務' in text and 'undefined' not in text and 'NaN' not in text
    # Explicitly check both desktop and mobile child documents.
    for width in [1440,390]:
     page.set_viewport_size({'width':width,'height':1000});assert page.evaluate('document.querySelector("#wq-course-dialog").scrollWidth<=innerWidth')
     size=f.evaluate('({w:innerWidth,s:document.documentElement.scrollWidth})');assert size['s']<=size['w']+1,(u['code'],width,size)
    page.set_viewport_size({'width':1440,'height':1000});results.append({'unit':u['code'],'part':part,'pass':True})
   except Exception as e:results.append({'unit':u['code'],'part':part,'pass':False,'error':str(e)})
 print('RESULT',sum(r['pass'] for r in results),'/',len(results),'errors',errors)
 (O/'tools_results.json').write_text(json.dumps({'environment':'Same offline Chromium and simulated Web Storage as browser_test.py. Tool render/reset/check smoke only, not all mathematical actions exhaustively tested.','passed':sum(r['pass'] for r in results),'failed':sum(not r['pass'] for r in results),'cases':results,'pageErrors':errors},ensure_ascii=False,indent=2));b.close()
