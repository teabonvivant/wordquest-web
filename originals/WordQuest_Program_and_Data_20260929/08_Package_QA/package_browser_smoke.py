"""Packaging smoke tests, not a replacement for the historical 1,000-case audit.
Chromium uses real DOM inputs and isolated in-memory localStorage.
Native file:// loading is blocked in the authoring environment and is not certified.
Run with Python + Playwright and a local Chromium executable (developer use only).
"""
from pathlib import Path
import json, os, traceback
from playwright.sync_api import sync_playwright
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'08_Package_QA';RESULTS=[]
MEMORY="""()=>{const m=new Map();window.__packageStorage=m;Object.defineProperty(window,'localStorage',{configurable:true,value:{getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear(),key:i=>[...m.keys()][i],get length(){return m.size}}});}"""
def check(name,fn):
 try:r=fn();RESULTS.append({'name':name,'status':'PASS','actual':r or '符合本項預期'})
 except Exception as e:RESULTS.append({'name':name,'status':'FAIL','actual':str(e)})
 print(RESULTS[-1],flush=True)
def need(ok,msg):
 if not ok:raise AssertionError(msg)
with sync_playwright() as p:
 browser=p.chromium.launch(executable_path=os.environ.get('CHROMIUM_EXECUTABLE','/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
 env={'browser':browser.version,'real_dom_inputs':True,'storage':'isolated in-memory localStorage adapter','native_file_loading':'BLOCKED_BY_ADMINISTRATOR; not verified','native_indexeddb':'not verified','native_downloads':'not verified','real_device_or_voice_listening':'not performed','historical_1000_rerun':False}
 def boot(rel,width=1280):
  ctx=browser.new_context(viewport={'width':width,'height':900});page=ctx.new_page();page.set_default_timeout(3500);errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)));page.on('dialog',lambda d:d.accept());page.evaluate(MEMORY);page.set_content((ROOT/rel).read_text(),wait_until='load');page.wait_for_timeout(350)
  return ctx,page,errors
 english='01_English_V32/WordQuest_V32_Integrated.html';maths='02_Maths_0.1.2/WordQuest_Maths_0.1.2.html'
 for width in [1280,390]:
  ctx,page,errors=boot(english,width)
  check(f'英文 V32 {width}px 首頁啟動',lambda:(need('WordQuest V32' in page.title(),'版本標題不符'),need(page.get_by_role('link',name='登入／開始使用',exact=True).is_visible(),'首頁入口不存在'),need(not errors,str(errors))))
  # Scroll lazy-loaded images into view before asserting they were decoded.
  image_states=page.locator('img').evaluate_all('(es)=>es.map(e=>({alt:e.alt,loading:e.loading,complete:e.complete,width:e.naturalWidth}))')
  if width==390:(OUT/'mobile_image_initial_states.json').write_text(json.dumps(image_states,ensure_ascii=False,indent=2)+'\n')
  for image in page.locator('img').all():
   if image.is_visible():image.scroll_into_view_if_needed()
  page.wait_for_function('Array.from(document.images).every(e=>e.complete&&e.naturalWidth>0)')
  page.evaluate('scrollTo(0,0)')
  check(f'英文 V32 {width}px 圖像載入（已捲動觸發延遲載入）',lambda:need(page.locator('img').evaluate_all('(es)=>es.every(e=>e.complete&&e.naturalWidth>0)'),'捲動載入後仍有未能解碼的圖像'))
  page.screenshot(path=str(OUT/f'english_{width}.png'),full_page=True)
  if width==1280:
   page.get_by_role('button',name='認識六位夥伴',exact=True).click();page.wait_for_timeout(150)
   check('英文角色入口實際點擊',lambda:need('奧奧' in page.locator('body').inner_text() and not errors,'角色頁錯誤'))
   page.locator('a[href="#game"]').first.click();page.wait_for_timeout(200)
   check('英文街機入口實際點擊',lambda:need('遊戲' in page.locator('body').inner_text() and not errors,'街機頁錯誤'))
  ctx.close()
 for width in [1280,390]:
  ctx,page,errors=boot(maths,width)
  check(f'數學 0.1.2 {width}px 首頁啟動',lambda:(need(page.evaluate('WQMathApp.version')=='0.1.2','版本不符'),need(page.locator('[data-action="daily:normal"]').is_visible(),'入口不存在'),need(not errors,str(errors))))
  check(f'數學 {width}px 題庫讀取',lambda:need(page.evaluate('WQMathApp.contentStats()')=={'skills':28,'templates':84},'技能／模板數量不符'))
  page.screenshot(path=str(OUT/f'maths_{width}.png'),full_page=True)
  if width==1280:
   page.locator('[data-action="nav:profiles"]').first.click();page.locator('#nickname').fill('打包驗證學員');page.locator('#new-grade').select_option('3');page.locator('#consent').check();page.locator('[data-action="create-profile"]').click()
   check('數學建立測試學員',lambda:need(page.evaluate('__packageStorage.has("wqm-profiles-v1")'),'沒有寫入隔離名單'))
   page.locator('[data-action="daily:normal"]').click()
   check('數學開始今日練習',lambda:need(page.evaluate('WQMathApp.getState().current.queues[4].length')==10,'不是十題'))
   q=page.evaluate('()=>{const s=WQMathApp.getState().current,r=s.queues[s.stage][s.index];return WQMathCore.generate(WQMathCore.library(WQMathData),r.template,r.seed)}')
   if q['type']=='choice':
    idx=next(i for i,c in enumerate(q['choices']) if c['value']==q['answer']);page.locator(f'[data-action="choice:{idx}"]').click()
   else:
    page.locator('#answer').fill(q['answer'])
    if q['type']=='word':
     x=q['params'];page.locator('#expression').fill(f"{x['paid']}-{x['price']}" if q['skill']=='2N5.3' else f"{x['paid']}-{x['price']}*{x['qty']}");page.locator('#unit').select_option('元')
    if q['type']=='remainder':page.locator('#remainder').fill(str(q['remainder']))
   page.locator('[data-action="submit"]').click()
   check('數學實際填答及提交',lambda:need(page.evaluate('WQMathApp.getState().attempts.length===1 && WQMathApp.getState().current.feedback.correct'),'作答沒有記錄或沒有正確回饋'))
   page.screenshot(path=str(OUT/'maths_answer.png'),full_page=True)
   check('數學儲存序列化（隔離替身）',lambda:need(page.evaluate('[...__packageStorage.keys()].some(k=>k.startsWith("wqm-state-v1:"))'),'沒有數學狀態鍵'))
  ctx.close()
 # Confirm the old installer does not, by itself, integrate with this V32 host closure.
 ctx=browser.new_context();page=ctx.new_page();page.evaluate(MEMORY);alerts=[];page.on('dialog',lambda d:(alerts.append(d.message),d.accept()))
 source=(ROOT/english).read_text();plugin=(ROOT/'02_Maths_0.1.2/WordQuest_Maths_Plugin_0.1.2.html.txt').read_text();i=source.lower().rfind('</body>')
 page.set_content(source[:i]+plugin+source[i:],wait_until='load');page.locator('#wqm-launch').click()
 RESULTS.append({'name':'0.1.2 整合器直接注入 V32 的相容性','status':'KNOWN_LIMITATION','actual':alerts[0] if alerts else '需另行核對','host_connected':page.evaluate('WQMathApp.hostConnected()'),'included_as_merged_release':False})
 ctx.close();browser.close()
(OUT/'browser_environment.json').write_text(json.dumps(env,ensure_ascii=False,indent=2)+'\n')
(OUT/'browser_smoke_results.json').write_text(json.dumps(RESULTS,ensure_ascii=False,indent=2)+'\n')
print('SUMMARY',json.dumps({k:sum(r['status']==k for r in RESULTS) for k in ['PASS','FAIL','KNOWN_LIMITATION']}))
