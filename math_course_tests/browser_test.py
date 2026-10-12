"""Offline Chromium UI checks. Browser policy disallows all URL navigation here.
Use set_content with a clearly simulated in-memory Web Storage; no admin policy is changed.
This tests actual DOM/JS, NOT native disk persistence, HTTP/PWA or real-device browser behaviour.
"""
from playwright.sync_api import sync_playwright
from pathlib import Path
import json,traceback
R=Path(__file__).resolve().parents[1]; O=R/'math_course_evidence'; O.mkdir(exist_ok=True)
STORAGE='''seed=>{ for(const name of ['localStorage','sessionStorage']){const m=new Map(Object.entries(seed[name]||{}));Object.defineProperty(window,name,{value:{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(String(k),String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear(),key:i=>[...m.keys()][i]??null,get length(){return m.size}},configurable:true});}}'''
results=[];errors=[]
def check(name,fn):
 try: fn();results.append({'name':name,'pass':True});print('PASS',name,flush=True)
 except Exception as e:results.append({'name':name,'pass':False,'error':str(e)});print('FAIL',name,str(e),flush=True)
def eq(a,b):assert a==b,(a,b)
def truth(x):assert x
with sync_playwright() as p:
 b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 def make(full=False,width=1440,seed=None):
  pg=b.new_page(viewport={'width':width,'height':1000});pg.set_default_timeout(7000);pg.on('pageerror',lambda e:errors.append(str(e)));pg.evaluate(STORAGE,seed or {});pg.set_content((R/('app/index.html' if full else 'math_course_preview.html')).read_text(),wait_until='load');return pg
 page=make();click=lambda a:page.locator('[data-c1="'+a+'"]').first.click()
 st=lambda:page.evaluate('WQCourseApp.getState().courseM1')
 txt=lambda:page.locator('#wq-course-host main').inner_text()
 check('Standalone launches and shows true empty history',lambda:(eq(st()['history'],[]),truth(page.locator('#wq-course-dialog').is_visible())))
 def grade_check():
  for g,n in [(1,12),(2,14),(3,14),(4,16),(5,14),(6,15)]:
   click('grade:'+str(g));eq(page.locator('.lesson-link').count(),n*2)
 # Actual report counts, do not hard-code assumptions.
 counts=page.evaluate('WQCourseData.units.reduce((a,u)=>(a[u.grade]=(a[u.grade]||0)+1,a),{})')
 def grade_check_actual():
  for g,n in counts.items():click('grade:'+str(g));eq(page.locator('.lesson-link').count(),n*2)
 check('All six grades show two chapters per actual report unit',grade_check_actual)
 click('grade:1');page.screenshot(path=str(O/'desktop_map.png'));click('learn:1N1:1');click('step:1');page.wait_for_timeout(200)
 def tool_complete():
  f=page.frames[-1]
  for _ in range(12):f.get_by_role('button',name='放一顆星星',exact=True).click()
  f.get_by_role('button',name='檢查小任務',exact=True).click();page.wait_for_timeout(100)
  truth(st()['lessons']['1N1-1']['toolAt']>0);eq(len(st()['practice']),0);eq(len(st()['history']),0)
 check('Real star manipulative completion records participation, not marks',tool_complete)
 page.locator('#wq-course-dialog').evaluate('(e)=>e.scrollTop=0');page.screenshot(path=str(O/'desktop_tool.png'))
 click('step:3')
 def practice_hint():
  click('hint');page.locator('#c1-answer').fill('999');click('practice-check');truth('這題可以這樣做' in txt());truth('答案' in txt());eq(st()['practice'][0]['independent'],False);eq(st()['practice'][0]['input']['value'],'999');truth(page.locator('#c1-answer').is_disabled())
 check('Hinted practice teaches on error and freezes original answer',practice_hint)
 # Parent-confirmed synthetic test profile. No real child data is used.
 click('view:parent');click('new-profile');page.locator('#c1-name').fill('測試學生');page.locator('#c1-new-grade').select_option('4');page.locator('#c1-consent').check();click('create-profile')
 check('Parent creates isolated profile without copying visitor answers',lambda:(eq(st()['practice'],[]),eq(st()['grade'],4)))
 click('view:setup');page.locator('[data-select-unit="4M2"]').check();page.locator('#c1-count').select_option('5');click('start-exam')
 check('Test has no hints or solutions before submission',lambda:(eq(page.locator('[data-c1="hint"]').count(),0),eq(page.locator('.solution').count(),0),eq(st()['history'],[])))
 def navigation():
  page.locator('#c1-answer').fill('999');click('exam-next');click('exam-prev');eq(page.locator('#c1-answer').input_value(),'999');click('view:map') if page.locator('[data-c1="view:map"]').count() else None
 check('Previous/next keeps draft answers unchanged',navigation)
 snapshot=page.evaluate("Object.fromEntries(['localStorage','sessionStorage'].map(k=>[k,Object.fromEntries(Array.from({length:window[k].length},(_,i)=>{let n=window[k].key(i);return[n,window[k].getItem(n)]}))]))")
 before=st()['exam'];page.close();page=make(seed=snapshot)
 check('Reopening from serialized storage restores identical draft questions and answers',lambda:(eq(st()['exam']['refs'],before['refs']),eq(st()['exam']['inputs'],before['inputs']),eq(page.evaluate('WQCourseApp.getView()'),'exam')))
 click('confirm-submit')
 check('Blank-answer confirmation shows exact unanswered count',lambda:truth('還有4題' in txt()))
 click('submit-exam')
 check('Submission saves all answers including blanks and gives per-question explanations',lambda:(eq(st()['history'][0]['total'],5),eq(st()['history'][0]['results'][0]['input']['value'],'999'),eq(st()['history'][0]['results'][1]['input']['value'],''),truth(page.locator('.solution').count()>=5)))
 page.locator('#wq-course-dialog').evaluate('(e)=>e.scrollTop=0');page.screenshot(path=str(O/'desktop_feedback.png'))
 check('Zero correct on five questions does not falsely call it a short test',lambda:truth('這次未獲星星' in txt()))
 click('view:review');check('Wrong-question page links to relearning and new retry',lambda:(truth(page.locator('[data-c1^="learn:4M2:"]').count()>0),truth(page.locator('[data-c1^="retry:4M2"]').count()>0)))
 click('view:map');click('learn:4F1:1');page.locator('#c1-journal').fill('我畫圖，再試另一種分法。');click('journal')
 check('Exploration saves free-response journal without extra test score',lambda:(eq(st()['journal']['4F1-1']['text'],'我畫圖，再試另一種分法。'),eq(len(st()['history']),1)))
 # App re-open reads stored family data and checks new grade draft.
 click('view:map');click('grade:6');click('learn:6D3:1');click('step:1')
 check('P6 pie-chart activity does not require hand drawing',lambda:truth('不要求用紙筆自行繪製圓形圖' in txt()))
 # Mobile desktop uses same renderer, not a separate mockup.
 page.set_viewport_size({'width':390,'height':844});click('view:map');page.locator('#wq-course-dialog').evaluate('(e)=>e.scrollTop=0');page.screenshot(path=str(O/'mobile_map.png'))
 check('390px mobile main screen has no horizontal document overflow',lambda:truth(page.evaluate('document.querySelector("#wq-course-dialog").scrollWidth<=390')))
 click('learn:6M3:2');click('step:3');page.locator('#wq-course-dialog').evaluate('(e)=>e.scrollTop=0');page.screenshot(path=str(O/'mobile_practice.png'))
 check('390px mobile practice fields fit',lambda:truth(page.evaluate('document.querySelector("#wq-course-dialog").scrollWidth<=390')))
 page.close()
 full=make(full=True);full.evaluate("location.hash='p/math'");full.wait_for_timeout(250)
 check('Actual R3.9 math hub shows new mode buttons',lambda:truth(full.locator('[data-wqm-open="normal"]').count()>=1))
 full.locator('[data-wqm-open="normal"]').first.click();check('Actual host launches integrated course through real button',lambda:truth(full.locator('#wq-course-dialog').is_visible()))
 full.evaluate("WQMathApp.close();WQMathApp.open('olympiad')");check('Olympiad still opens original preserved module',lambda:truth('思維之塔' in full.locator('#wqm-app-host main').inner_text()))
 full.evaluate("WQMathApp.close();location.hash='p/english'");full.wait_for_timeout(400);check('English hub still renders after returning from math',lambda:truth('英文' in full.locator('body').inner_text()))
 full.evaluate("location.hash='p/games'");full.wait_for_timeout(250);check('Arcade entry still renders',lambda:truth('遊戲' in full.locator('body').inner_text()))
 full.close();check('No uncaught JavaScript errors in these tested paths',lambda:eq(errors,[]));b.close()
report={'environment':'Chromium 144.0.7559.96; offline set_content; simulated in-memory Web Storage; no real student data. Native disk persistence / HTTP / PWA / real devices NOT tested.','passed':sum(x['pass'] for x in results),'failed':sum(not x['pass'] for x in results),'cases':results,'pageErrors':errors}
(O/'browser_results.json').write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps({'passed':report['passed'],'failed':report['failed']},ensure_ascii=False))
