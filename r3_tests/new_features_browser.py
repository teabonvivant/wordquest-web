"""R3 new-feature acceptance. Real Chromium DOM; explicit harness substitutes for native persistence."""
from pathlib import Path
import json,sys,traceback
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'tests'));sys.path.insert(0,str(R/'r3_tests'))
import harness
from integration_regression import mc,op,close,question,answer,state
from playwright.sync_api import sync_playwright
harness.HTML=(R/'app/index.html').read_text().replace('window.WQR2Runtime=Object.freeze',"window.__arcadeQA={game:()=>pgGame,host:()=>({playing:pgPlaying})};window.WQR2Runtime=Object.freeze")
results=[]
def ck(name,fn):
 try:v=fn();assert v is not False;results.append({'id':'NEW-'+str(len(results)+1),'name':name,'pass':True,'detail':v})
 except Exception as e:results.append({'id':'NEW-'+str(len(results)+1),'name':name,'pass':False,'detail':traceback.format_exc()});print(traceback.format_exc())
 print(results[-1]['pass'],name,flush=True);(R/'r3_evidence/new_features_browser.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
def req(v,msg='failed'):assert v,msg;return True
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);ct,p,errs,ds=harness.boot(b);harness.register(p);op(p,'normal')
 for g in range(1,7):
  mc(p,'grade:'+str(g));ck('Grade '+str(g)+' has startable real lessons',lambda:req(p.locator('#wqm-app-host [data-action^="lesson:"]').count()>0))
 ck('All five ordinary maths strands have skills',lambda:p.evaluate("['N','M','S','D','A'].every(k=>WQMathData.skills.some(s=>s.track==='normal'&&s.id.includes(k)))"))
 mc(p,'nav:tools');mc(p,'selecttool:clock');p.locator('#wqm-app-host #tool-r3-hour').focus();p.keyboard.press('End');p.locator('#wqm-app-host #tool-r3-minute').focus();p.keyboard.press('End')
 ck('Clock keyboard range updates to 23:59',lambda:req('23:59' in p.locator('#wqm-app-host #tool-region').inner_text()))
 mc(p,'r3tool:minute:-5');ck('Clock buttons still work after redraw',lambda:req('23:54' in p.locator('#wqm-app-host #tool-region').inner_text()))
 p.locator('#wqm-app-host #tool-r3-minute').focus();p.keyboard.press('End');ck('Range listener retained after redraw',lambda:req('23:59' in p.locator('#wqm-app-host #tool-region').inner_text()))
 mc(p,'selecttool:angle');p.locator('#wqm-app-host #tool-r3-angle').focus();p.keyboard.press('End');mc(p,'r3tool:angle:-5');ck('Protractor shows 175 degree bounded value',lambda:req('175°' in p.locator('#wqm-app-host #tool-region').inner_text()))
 mc(p,'selecttool:solid')
 for key in ['sx','sy','sz']:p.locator('#wqm-app-host #tool-r3-'+key).focus();p.keyboard.press('End')
 ck('Unit-cube stack has 125 cubes, not a flat cuboid placeholder',lambda:req('125 粒' in p.locator('#wqm-app-host #tool-region').inner_text() and p.locator('#wqm-app-host svg.r3-diagram g').count()==125))
 p.set_viewport_size({'width':320,'height':844});p.screenshot(path=str(R/'r3_evidence/new_solid_320.png'),full_page=False)
 ck('3D tool 320px width has no horizontal overflow',lambda:p.locator('#wqm-app-host .shell').evaluate('(x)=>x.scrollWidth<=x.clientWidth+1'))
 p.set_viewport_size({'width':1280,'height':900});mc(p,'selecttool:ruler');p.locator('#wqm-app-host #tool-r3-rulerStart').focus();p.keyboard.press('End');ck('Ruler start/end remain ordered at right bound',lambda:req('20 − 19 = 1' in p.locator('#wqm-app-host #tool-region').inner_text()))
 p.locator('#wqm-app-host #tool-r3-rulerEnd').focus();p.keyboard.press('Home');ck('Ruler left bound keeps a positive interval',lambda:req('1 − 0 = 1' in p.locator('#wqm-app-host #tool-region').inner_text()))
 mc(p,'selecttool:chart')
 for key in ['chartA','chartB','chartC']:p.locator('#wqm-app-host #tool-r3-'+key).focus();p.keyboard.press('Home')
 ck('Zero data chart has no NaN/Infinity SVG coordinates',lambda:req(not any(x in p.locator('#wqm-app-host #tool-region').inner_html() for x in ['NaN','Infinity'])))
 # Per-course tool state retained via actual pause/reopen, not free-tool values.
 mc(p,'nav:normal');mc(p,'grade:1');mc(p,'lesson:1M4.R3');mc(p,'nextstage');p.locator('#wqm-app-host #tool-r3-hour').focus();p.keyboard.press('End');close(p);op(p);mc(p,'resume')
 ck('Lesson clock adjustment persists through close and resume',lambda:req(p.locator('#wqm-app-host #tool-r3-hour').input_value()=='23'))
 close(p);op(p);mc(p,'abandon');mc(p,'nav:olympiad')
 for level in [1,2,3,4]:
  mc(p,'olylevel:'+str(level));ck('Olympiad level '+str(level)+' shows five different skills',lambda:req(p.locator('#wqm-app-host [data-action^="lesson:"]').count()==5));mc(p,'mock:'+str(level));ss=state(p)['current'];ck('Original mock '+str(level)+' includes ten questions and correct level',lambda ss=ss: req(len(ss['queues']['4'])==10 and ss['track']=='olympiad'))
  for i in range(10):
   if not state(p)['current'].get('feedback'):req(answer(p)['correct'],'mock answer')
   if state(p)['current'].get('fastPause'):mc(p,'unpause-fast')
   mc(p,'nextq')
  ck('Mock '+str(level)+' completed without paying exam coins',lambda:req(state(p)['current']['completed'] and not state(p)['current'].get('award')));mc(p,'completed-home');mc(p,'nav:olympiad')
 # Old money template: sentence must survive submission/re-render.
 close(p);p.evaluate('''()=>{const C=WQMathCore,L=C.library(WQMathData),st=new WQMathStorage.Store(WQMathHost,L),n=C.blank(),r={template:'2N5.3-T1',seed:5},q=C.generate(L,r.template,r.seed);n.settings.slow=true;n.current={id:'sentence-fix',skill:q.skill,track:q.track,mode:'practice',game:null,stage:4,index:0,queues:{4:[r]},example:r,startedAt:Date.now()-5000,questionAt:Date.now()-5000,activeMs:0,hint:0,feedback:null,results:[],replacements:[],completed:false,rewardDone:false,fast:0,draft:'',picked:'',reflection:null};st.commit(n);}''');op(p);mc(p,'resume');q=question(p)
 if q['type']=='word':
  # New structured money expression uses cost, while legacy helper assumes price.
  p.locator('#wqm-app-host #answer').fill(q['answer']);p.locator('#wqm-app-host #expression').fill(f"{q['params']['paid']}-{q['params']['price']}");p.locator('#wqm-app-host #unit').select_option('元');mc(p,'submit');ck('Money answer sentence remains populated after grading',lambda:req(q['answer'] in p.locator('#wqm-app-host #sentence').inner_text() and '＿＿' not in p.locator('#wqm-app-host #sentence').inner_text()));p.screenshot(path=str(R/'r3_evidence/money_sentence_fixed.png'),full_page=False)
 ck('No browser exceptions across new tools and mocks',lambda:req(not errs,errs));ct.close()
 # Actual touch key entry exists. Test pointer down/cancel key-release against current engine.
 fixture=json.loads((R/'arcade_evidence/test_fixture_initial.json').read_text());key=next(k for k in fixture['local'] if k.startswith('wordquest-v10-user-'));db=json.loads(fixture['local'][key]);db['children'][0]['stars']=40;db.setdefault('arcadeV28',{'v':28,'children':{'c_demo':{'batch':{'number':1,'used':0,'lastSpentAt':0},'days':{},'ledger':[],'run':None,'paused':False,'permissions':{},'selectedSkin':'classic','bests':{},'migration':{'original':40,'returned':0,'due':0,'at':0}}}});db['arcadeV28']['children']['c_demo']['permissions']['star-patrol']='open';db['arcadeV28']['children']['c_demo']['batch']['used']=0;fixture['local'][key]=json.dumps(db)
 ct,p,errs,ds=harness.boot(b,initial=fixture,width=390);p.evaluate("location.hash='#game'");p.locator('[data-cabinet="star-patrol"] [data-a28="intro"]').click();p.locator('#pg-dialog [data-a28="buy"]').click();p.locator('[data-a28="play"]').click();p.wait_for_function('__arcadeQA.host().playing');key=p.locator('.a28-touch-key[data-a28key="hold"]');ck('Star Patrol mobile slow key is visible',lambda:req(key.count()==1 and key.is_visible()))
 if key.count():
  box=key.bounding_box();p.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);p.mouse.down();ck('Native pointer on mobile slow button reaches engine hold state',lambda:p.evaluate('__arcadeQA.game().keys.has("hold")'));key.dispatch_event('pointercancel',{'pointerId':1,'pointerType':'mouse','isPrimary':True,'bubbles':True});p.mouse.up();ck('Pointer cancellation releases slow button',lambda:p.evaluate('!__arcadeQA.game().keys.has("hold")'));p.screenshot(path=str(R/'r3_evidence/slow_key_mobile.png'),full_page=False)
 ck('Arcade control test no uncaught errors',lambda:req(not errs,errs));b.close()
print('TOTAL',len(results),'PASS',sum(x['pass'] for x in results))
