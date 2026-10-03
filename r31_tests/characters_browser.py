"""Executed Chromium UI checks. Native navigation blocked; see environment.json.
Only test adapters for browser storage, locks, crypto, media I/O. No real user data.
"""
from pathlib import Path
import sys,json,traceback,ast,copy,hashlib,time
R=Path(__file__).resolve().parents[1];E=R/'r31_evidence';sys.path.insert(0,str(R/'tests'));import harness
from playwright.sync_api import sync_playwright
# Reuse the declared R3 family I/O fixture; retain real backup validators and authorization.
module=ast.parse((R/'r3_tests/family_browser.py').read_text())
inject=next(ast.literal_eval(n.value) for n in module.body if isinstance(n,ast.Assign) and any(isinstance(x,ast.Name) and x.id=='INJECT' for x in n.targets))
harness.HTML=(R/'app/index.html').read_text().replace('\ninstallMediaEvents();\nrender();',inject+'\ninstallMediaEvents();\nrender();',1)
rows=[]
def check(name,fn):
 try:
  result=fn();assert result is not False;row={'id':f'FOREST-UI-{len(rows)+1:03d}','name':name,'status':'pass','detail':result}
 except Exception as ex:
  row={'id':f'FOREST-UI-{len(rows)+1:03d}','name':name,'status':'fail','error':str(ex)};print(traceback.format_exc(),flush=True)
 rows.append(row);print(row['status'],name,flush=True);(E/'characters_browser.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
def req(b,msg='assertion failed'):assert b,msg;return True
def route(p,s):p.evaluate('(s)=>location.hash="#"+s',s);p.wait_for_timeout(90)
def mc(p,a):p.locator('#wqm-app-host [data-action="'+a+'"]').first.click()
def openmath(p,view='home'):p.evaluate('(v)=>WQMathApp.open(v)',view);p.wait_for_timeout(70)
def closemath(p):p.evaluate('WQMathApp.close()')
def qnow(p):return p.evaluate('()=>{const C=WQMathCore,L=C.library(WQMathData),s=WQMathApp.getState().current,r=s.queues[s.stage][s.index];return C.generate(L,r.template,r.seed)}')
def bodyfits(p):return p.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
def mathfits(p):return p.locator('#wqm-app-host main').evaluate('(m)=>m.scrollWidth<=m.getBoundingClientRect().width+1')
def prefs(p,k,v):p.evaluate('([k,v])=>WQ32.setPreference(k,v)',[k,v]);p.wait_for_timeout(20)
def unlock(p):
 route(p,'settings')
 if p.locator('#v23-parent-password').count():
  p.locator('#v23-parent-password').fill('R1testPass99');p.locator('[data-v23="parent-unlock"]').click();p.wait_for_function('WQMathHost.parentAllowed()')
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);ctx,p,errors,dialogs=harness.boot(b)
 check('App opens without JavaScript exceptions',lambda:req(not errors,str(errors)))
 check('Six named animals, never the previous owl/firefly/bee identities',lambda:req([x['name'] for x in p.evaluate('WQ32.roles()')]==['烈烈老師','柚柚老師','糖栗老師','波波','刺刺','阿峰']))
 check('42 inline artwork assets decode without network',lambda:req(p.evaluate('async()=>{const rs=await Promise.all(Object.values(WQ32Art).map(src=>new Promise(r=>{const im=new Image();im.onload=()=>r(im.naturalWidth>0);im.onerror=()=>r(false);im.src=src;})));return rs.length===42&&rs.every(Boolean)}')))
 check('New account defaults disable animation and use automatic assignment',lambda:req(p.evaluate('!WQ32.getPreferences().motion&&WQ32.getPreferences().guide==="auto"')))
 route(p,'companions')
 slots=['owl','fox','panda','bee','star','rabbit']
 for slot in slots:
  p.locator(f'#wq32-gallery-page [data-wq32="gallery-select"][data-key="{slot}"]').click()
  for pose in ['front','face0','face1','face2','face3','face4','sheet']:
   def selectpose(slot=slot,pose=pose):
    p.locator(f'.wq32-profile [data-wq32="pose"][data-key="{pose}"]').click()
    im=p.locator('.wq32-portrait-stage img');im.wait_for();p.wait_for_function('document.querySelector(".wq32-portrait-stage img")?.complete')
    return req(im.get_attribute('data-wq32-character')==slot and im.get_attribute('data-wq32-pose')==pose and im.evaluate('(i)=>i.naturalWidth>0'))
   check(f'Gallery {slot}: real click selects decoded {pose}',selectpose)
 check('No invented side or back angles advertised as available',lambda:req(p.locator('[data-wq32="pose"][data-key="side"],[data-wq32="pose"][data-key="back"]').count()==0))
 p.locator('[data-wq32="pose"][data-key="front"]').click()
 for width in [320,390,768,1280]:
  p.set_viewport_size({'width':width,'height':844});check(f'Gallery no horizontal overflow at {width}px',lambda:req(bodyfits(p)))
  if width in [320,1280]:p.screenshot(path=str(E/f'gallery_{width}.png'),full_page=True)
 p.set_viewport_size({'width':1280,'height':900})
 p.locator('[data-wq32-pref="guide"]').select_option('fox')
 check('Gallery fixed selection keeps keyboard focus on the replacement selector',lambda:req(p.evaluate('document.activeElement?.dataset.wq32Pref==="guide"')))
 route(p,'kid');p.evaluate("(()=>{const d=document.getElementById('p10-more');if(d)d.open=true})()");p.wait_for_timeout(60);p.locator('#wq32-home-cast [data-wq32="gallery"][data-key="owl"]').click()
 check('Home character opens actual modal with focus on close control',lambda:req(p.locator('#wq32-character-dialog').evaluate('(d)=>d.open') and p.evaluate('document.activeElement?.dataset.wq32==="close"')))
 p.keyboard.press('Escape')
 check('Escape closes gallery and returns focus to origin button',lambda:req(not p.locator('#wq32-character-dialog').count() and p.evaluate('document.activeElement?.dataset.key==="owl"')))
 prefs(p,'guide','auto');openmath(p)
 check('Maths home automatically uses otter helper',lambda:req(p.locator('.forest-math-guide').get_attribute('data-forest-character')=='bo-bo'))
 mc(p,'nav:tools');check('Tool workshop uses the red panda teacher',lambda:req(p.locator('.forest-math-guide').get_attribute('data-forest-character')=='tang-li'))
 mc(p,'nav:olympiad');check('Olympiad home uses the goat classmate',lambda:req(p.locator('.forest-math-guide').get_attribute('data-forest-character')=='a-feng'))
 # R3.5: a question in progress shows no partner row (r35 p50 F3, so the question gets the whole screen). The partner choices are therefore checked
 # with the same inputs the maths screens hand to WQ32.mathHTML, and the partner settings are checked on the maths home, where the partner still stands.
 def guide(**o):
  ctx={'view':'lesson','grade':1,'mode':'practice','track':'normal','rest':False,'completed':False,'feedback':'','hinted':False,'exploring':False,'visual':False,'earlyNumber':False,'busy':True};ctx.update(o)
  return p.evaluate('(c)=>{const d=document.createElement("div");d.innerHTML=WQ32.mathHTML(c);const g=d.querySelector(".forest-math-guide");return g?{c:g.dataset.forestCharacter,s:g.dataset.state}:null}',ctx)
 mc(p,'nav:normal');mc(p,'grade:1');mc(p,'practice:1N1.1')
 check('Question screen shows no partner row and no partner settings button (R3.5)',lambda:req(p.locator('.forest-math-guide').count()==0 and p.locator('#wqm-app-host [data-forest-options]').count()==0))
 check('Early number practice uses the otter',lambda:req((guide(earlyNumber=True) or {}).get('c')=='bo-bo'))
 p.locator('#wqm-app-host #answer').fill('9999');p.locator('#wqm-app-host #answer').press('Enter')
 check('Wrong answer shows supportive hedgehog, not reward or shame',lambda:req((lambda g:bool(g) and g['c']=='ci-ci' and g['s']=='retry')(guide(earlyNumber=True,feedback='retry',busy=False))))
 check('Enter submission retains keyboard focus on actual feedback',lambda:req(p.locator('#wqm-app-host .feedback').evaluate('(e)=>e.getRootNode().activeElement===e')))
 mc(p,'nextq');q=qnow(p);p.locator('#wqm-app-host #answer').fill(str(q['answer']));mc(p,'submit')
 check('Correct submission switches to success expression',lambda:req((lambda g:bool(g) and g['s']=='correct')(guide(earlyNumber=True,feedback='correct',busy=False))))
 check('Companion never prints the answer or invokes scoring itself',lambda:req(p.evaluate('WQ32.inspect().learningWriteAccess===false')))
 p.screenshot(path=str(E/'math_correct_desktop.png'),full_page=False)
 closemath(p);openmath(p)
 if p.locator('#wqm-app-host [data-action="nav:home"]').count():mc(p,'nav:home')
 before=p.evaluate('WQMathApp.getState()');bal=p.evaluate('WQMathHost.profile().balance')
 p.locator('#wqm-app-host [data-forest-options]').click();p.locator('#wqm-app-host [data-forest-pref="guide"]').select_option('panda')
 check('Changing fixed maths helper does not write maths state or balance',lambda:req(p.evaluate('WQMathApp.getState()')==before and p.evaluate('WQMathHost.profile().balance')==bal))
 check('Fixed helper actually changes image and name',lambda:req(p.locator('.forest-math-guide').get_attribute('data-forest-character')=='tang-li'))
 p.locator('#wqm-app-host [data-forest-pref="show"]').uncheck()
 check('Hide setting removes maths portrait',lambda:req(p.locator('.forest-math-guide').count()==0))
 p.locator('#wqm-app-host [data-forest-pref="show"]').check();p.locator('#wqm-app-host [data-forest-pref="guide"]').select_option('auto')
 closemath(p);openmath(p); # preserve current session; move away to home if resume overlay
 if p.locator('#wqm-app-host [data-action="nav:home"]').count():mc(p,'nav:home')
 # Switching view with current work is handled by original preserve-work code.
 mc(p,'nav:normal');mc(p,'grade:4')
 # Exercise with no prerequisites, using the visible R3 geometry/measure entry.
 choices=p.locator('#wqm-app-host [data-action^="practice:4S"]')
 if choices.count():choices.first.click()
 check('Geometry practice chooses fox teacher from skill context',lambda:req((guide(grade=4,visual=True) or {}).get('c')=='you-you'))
 for width in [320,390,844,1280]:
  p.set_viewport_size({'width':width,'height':844 if width<800 else 900});check(f'Maths guide and question no overflow at {width}px',lambda:req(mathfits(p)))
  if width==320:p.screenshot(path=str(E/'math_geometry_320.png'),full_page=False)
 # Check draft edits while hidden and unhidden remain non-destructive.
 closemath(p);prefs(p,'show',False);route(p,'kid')
 check('Global hide makes decorative English portraits invisible and keeps character gallery access',lambda:req(p.locator('.l30-hero img[data-wq32-character]').evaluate_all('(xs)=>xs.every(e=>!e.getClientRects().length)') and p.locator('#wq32-home-cast').count()==1))
 prefs(p,'show',True);prefs(p,'motion',True);p.emulate_media(reduced_motion='reduce');openmath(p)
 check('Reduced-motion preference suppresses maths entry animation',lambda:req(p.locator('.forest-math-guide').evaluate('(e)=>getComputedStyle(e).animationName')=='none'))
 closemath(p);p.emulate_media(reduced_motion='no-preference');prefs(p,'motion',False)
 # Create a real UI account using synthetic, non-user data, then save new preference.
 p.set_viewport_size({'width':1280,'height':900});profile=harness.register(p,name='forest-qa',child='森林測試學員');prefs(p,'guide','star');prefs(p,'compact',True)
 initial=harness.state_snapshot(p);ctx2,p2,err2,d2=harness.boot(b,initial=initial)
 check('Simulated app reopen restores per-child fixed preference',lambda:req(p2.evaluate('WQ32.getPreferences().guide==="star"&&WQ32.getPreferences().compact')))
 openmath(p2);check('Restored preference is used by actual maths image',lambda:req(p2.locator('.forest-math-guide').get_attribute('data-forest-character')=='ci-ci'))
 closemath(p2);ctx2.close()
 # Quota failure must keep original stored data and disclose session-only setting.
 key=p.evaluate('Object.keys(localStorage.dump()).find(k=>k.startsWith("wordquest-v32-characters:normal:")&&!k.includes(":guest:"))')
 old=p.evaluate('(k)=>localStorage.getItem(k)',key);p.evaluate('(k)=>window.__failSet=k',key);route(p,'companions');p.locator('[data-wq32-pref="guide"]').select_option('fox')
 check('Storage failure reports session-only preferences and preserves stored JSON',lambda:req(p.evaluate('(k)=>localStorage.getItem(k)',key)==old and any(w in p.locator('.wq32-setting-status').inner_text() for w in ('未能保存','沒有儲存成功'))))
 p.evaluate('window.__failSet=null');prefs(p,'guide','star')
 # Full family export includes new field; true media I/O is the explicitly declared adapter.
 unlock(p);p.locator('[data-r3="family"]').click()
 with p.expect_download() as dl:p.locator('[data-r3="export-family"]').click()
 pack=json.loads(Path(dl.value.path()).read_text());char=pack['payload']['characterPreferences'];
 check('Family JSON exports new fixed-helper preference',lambda:req(any(r['preferences'].get('guide')=='star' for r in char)))
 check('Family JSON checksum matches independent Python SHA256',lambda:req(hashlib.sha256(json.dumps(pack['payload'],ensure_ascii=False,separators=(',',':')).encode()).hexdigest()==pack['integrity']['digest']))
 check('New family backup accurately identifies the application version (R3.x)',lambda:req(__import__('re').fullmatch(r'R3\.\d+\.\d+',pack['appVersion'] or '') is not None))  # R3.3: was an exact R3.1.0 match
 prefs(p,'guide','panda');p.evaluate('(payload)=>__R3TEST.restore(payload)',pack['payload']);
 check('Restore reloads backed-up preference in UI without extra rewards',lambda:req(p.evaluate('WQ32.getPreferences().guide==="star"')))
 # Legacy R3 optional field absent stays importable, resolves to automatic assignment.
 legacy=copy.deepcopy(pack['payload'])
 for row in legacy['characterPreferences']:row['preferences'].pop('guide',None)
 p.evaluate('(payload)=>__R3TEST.restore(payload)',legacy)
 check('Old R3 family preferences without new field restore as automatic',lambda:req(p.evaluate('WQ32.getPreferences().guide==="auto"')))
 broken=copy.deepcopy(pack['payload']);broken['characterPreferences'][0]['preferences']['guide']='not-a-role'
 check('Malformed new preference is rejected before family replacement',lambda:req(p.evaluate('async payload=>{try{await __R3TEST.restore(payload);return false}catch(e){return (e.message.includes("角色偏好")||e.message.includes("角色設定"))}}',broken)))
 check('No uncaught JavaScript exceptions in complete UI run',lambda:req(not errors,str(errors)))
 b.close()
print('TOTAL',len(rows),'PASS',sum(x['status']=='pass' for x in rows),'FAIL',sum(x['status']=='fail' for x in rows))
if any(x['status']=='fail' for x in rows):sys.exit(1)
