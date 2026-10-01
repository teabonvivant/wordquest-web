"""R1 integration acceptance. Chromium DOM + labelled synthetic storage faults.
Account/child names and answer data are test fixtures, not real students.
See harness.py for explicit native-browser limitations.
"""
from pathlib import Path
import sys,json,time,traceback
from playwright.sync_api import sync_playwright
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'tests'))
from harness import boot,register,state_snapshot,ROOT
RESULTS=[]

def check(name,fn,group='INTEGRATION'):
 t=time.monotonic()
 try:
  detail=fn(); assert detail is not False,'condition returned false'
  RESULTS.append({'id':f'R1-{len(RESULTS)+1:03d}','group':group,'name':name,'status':'PASS','detail':detail,'seconds':round(time.monotonic()-t,3)})
 except Exception as e:
  RESULTS.append({'id':f'R1-{len(RESULTS)+1:03d}','group':group,'name':name,'status':'FAIL','detail':str(e)[:2400],'seconds':round(time.monotonic()-t,3)})
 print(RESULTS[-1]['status'],name, flush=True)
 (ROOT/'arcade_evidence/r1_regression/integration_results.json').write_text(json.dumps(RESULTS,ensure_ascii=False,indent=2))
 return RESULTS[-1]['status']=='PASS'

def req(cond,msg):
 assert cond,msg
 return True

def mc(p,action):p.locator(f'#wqm-app-host [data-action="{action}"]').first.click()
def mtext(p):return p.locator('#wqm-app-host main').inner_text()
def close(p):p.evaluate('WQMathApp.close()')
def op(p,route='home'):p.evaluate('(r)=>WQMathApp.open(r)',route)
def prof(p):return p.evaluate('WQMathHost.profile()')
def state(p):return p.evaluate('WQMathApp.getState()')
def balance(p):return prof(p)['balance']
def question(p):
 return p.evaluate('''()=>{const C=WQMathCore,L=C.library(WQMathData),s=WQMathApp.getState().current,r=s.queues[s.stage][s.index];return C.generate(L,r.template,r.seed)}''')
def answer(p,q=None,enter=False):
 q=q or question(p)
 if q['type']=='choice':
  idx=next(i for i,c in enumerate(q['choices']) if str(c['value'])==str(q['answer']))
  mc(p,f'choice:{idx}')
 else:
  p.locator('#wqm-app-host #answer').fill(str(q['answer']))
  if q['type']=='word':
   # The recovered word templates expose a concrete expression in their answer.
   expression=q.get('expression')
   if not expression:
    z=q['params'];expression=f"{z['paid']}-{z['price']}" if 'qty' not in z else f"{z['paid']}-{z['qty']}*{z['price']}"
   p.locator('#wqm-app-host #expression').fill(expression)
   p.locator('#wqm-app-host #unit').select_option('元')
  if q['type']=='remainder':p.locator('#wqm-app-host #remainder').fill(str(q['remainder']))
 if enter and q['type']!='choice':p.locator('#wqm-app-host #answer').press('Enter')
 else:mc(p,'submit')
 return state(p)['current']['feedback']

def daily(p):
 mc(p,'daily:normal')
 while not state(p)['current']['completed']:
  s=state(p)['current']
  if not s.get('feedback'):req(answer(p)['correct'],'daily answer did not pass')
  if state(p)['current'].get('fastPause'):mc(p,'unpause-fast')
  mc(p,'nextq')
 return state(p)['current']

def unlock(p):
 p.locator('#v23-parent-password').fill('R1testPass99')
 p.locator('[data-v23="parent-unlock"]').click()
 p.wait_for_function('WQMathHost.parentAllowed()')

def create_event(p,key='fixture',age=0):
 return p.evaluate('''({key,age})=>{const C=WQMathCore,st=new WQMathStorage.Store(WQMathHost,C.library(WQMathData));const at=Date.now()+age;st.change(n=>C.enqueueReward(n,{key,startedAt:at-10000,completedAt:at,valid:true}));return {key:st.key,scope:st.scope,event:st.state.outbox.find(e=>e.key===key)}}''',{'key':key,'age':age})


def run():
 with sync_playwright() as pw:
  browser=pw.chromium.launch(headless=True,executable_path='/usr/bin/chromium',args=['--no-sandbox'])
  ctx,p,errors,dialogs=boot(browser)
  check('Host bridge exposes correct version and no mutable database',lambda:req(p.evaluate("WQMathHost.apiVersion===1&&WQMathHost.version==='V32-M0.1.2-R1'&&!('db' in WQMathHost)&&Object.isFrozen(WQMathHost)"),'host bridge'))
  check('Single homepage has both ordinary maths and Olympiad buttons',lambda:req(p.locator('[data-wqm-open="normal"]').count()==1 and p.locator('[data-wqm-open="olympiad"]').count()==1,'subject entries'))
  op(p)
  check('Maths resolves the real V32 bridge, not standalone profile adapter',lambda:req(p.evaluate('WQMathApp.hostConnected()'),'not connected'))
  check('Retained bank contains 28 skills and 84 templates',lambda:req(p.evaluate('WQMathData.skills.length===28&&WQMathData.templates.length===84'),'bank count'))
  check('Original V32 companion is decoded and visible in maths',lambda:req(p.locator('.wqm-v32-companion img').evaluate('(i)=>i.complete&&i.naturalWidth>0'),'image missing'))
  check('Guest open does not create standalone child registry',lambda:req(p.evaluate("localStorage.getItem('wqm-profiles-v1')===null"),'split registry'))
  def guestdraft():
   mc(p,'daily:normal');q=question(p)
   p.locator('#wqm-app-host #answer').fill('123');close(p);op(p);mc(p,'resume')
   return req(p.locator('#wqm-app-host #answer').input_value()=='123','guest draft lost')
  check('Guest unfinished answer survives closing/reopening on same page',guestdraft)
  close(p)
  account=register(p)
  check('Real registration is shared by English and maths',lambda:req(account['persistent'] and account['name']=='整合測試學員','registration'))
  op(p)
  check('Registered maths opens current English child, without second registry',lambda:req('整合測試學員' in mtext(p) and p.evaluate("localStorage.getItem('wqm-profiles-v1')===null"),'not shared'))
  initial_english=p.evaluate("JSON.parse(localStorage.getItem('wordquest-v10-user-'+WQMathHost.profile().account))")
  result={}
  def complete():
   result.update(daily(p));return req(result['completed'] and len(result['results'])==10,'not complete')
  check('Ten-question daily task completed by actual answer inputs',complete)
  check('Daily task writes ten maths attempts to the shared child scope',lambda:req(len(state(p)['attempts'])==10,'attempts'))
  check('Eligible maths completion credits the original English coin balance',lambda:req(balance(p)==1 and result.get('award')==1,'expected first daily coin'))
  check('Outbox settles once after English wallet success',lambda:req(len(state(p)['outbox'])==1 and state(p)['outbox'][0]['settled'],'unsettled'))
  def repeatflush():
   b=balance(p);x=p.evaluate('''()=>{const s=new WQMathStorage.Store(WQMathHost,WQMathCore.library(WQMathData));return s.flush()}''');return req(x==0 and balance(p)==b,'duplicate award')
  check('Repeated flush does not award a second coin',repeatflush)
  def english_preserved():
   now=p.evaluate("JSON.parse(localStorage.getItem('wordquest-v10-user-'+WQMathHost.profile().account))")
   stable=[k for k in ('ranges','attempts','history','words') if k in initial_english]
   return {'unchanged_fields':stable,'all_equal':req(all(now.get(k)==initial_english[k] for k in stable),'English content changed')}
  check('Maths completion preserves existing English learning content',english_preserved)
  p.screenshot(path=str(ROOT/'arcade_evidence/r1_regression/daily-complete.png'),full_page=True)
  saved=state_snapshot(p)
  def completion_parent_guard():
   mc(p,'completed-parent');p.wait_for_selector('#v23-parent-password')
   return req(not p.locator('#wqm-dialog').evaluate('(d)=>d.open'),'completed-page parent bypass')
  check('Completion-page progress button cannot bypass English parent guard',completion_parent_guard)
  close(p)
  def parentguard():
   op(p,'parent');p.wait_for_selector('#v23-parent-password')
   return req(not p.locator('#wqm-dialog').evaluate('(d)=>d.open'),'math parent bypass')
  check('Maths parent entry redirects to existing English password gate',parentguard)
  def wrongpw():
   p.locator('#v23-parent-password').fill('incorrect-password');p.locator('[data-v23="parent-unlock"]').click();p.wait_for_timeout(180)
   return req(not p.evaluate('WQMathHost.parentAllowed()'),'wrong password accepted')
  check('Incorrect password cannot unlock maths settings',wrongpw)
  check('Existing parent password unlocks without another account',lambda:(unlock(p),True)[1])
  check('English parent page displays separate maths activity count',lambda:req('普通數學 10 次作答' in p.locator('#wq-maths-parent').inner_text(),'missing summary'))
  p.locator('[data-wqm-open="parent"]').click()
  check('Unlocked maths settings open in same program',lambda:req(p.locator('#wqm-app-host #limit').count()==1,'settings absent'))
  def settings():
   p.locator('#wqm-app-host #setting-olympiad').uncheck();mc(p,'save-settings');req(state(p)['settings']['olympiad'] is False,'not disabled')
   p.locator('#wqm-app-host #setting-olympiad').check();mc(p,'save-settings');return req(state(p)['settings']['olympiad'],'not enabled')
  check('Parent settings persist through guarded UI save',settings)
  close(p);p.evaluate("location.hash='#kid'");p.wait_for_timeout(100)
  # Two independent account snapshots used below; no real personal storage.
  check('Actual browser run so far has no JavaScript exceptions',lambda:req(not errors,errors))
  ctx.close()
  ctx,p,errors,dialogs=boot(browser,initial=saved)
  op(p)
  check('Serialized reload restores current child and maths attempts',lambda:req(len(state(p)['attempts'])==10 and balance(p)==1,'reload mismatch'))
  close(p)
  # Fault injection deliberately operates on persisted synthetic outbox records.
  def unsupported():
   return req(p.evaluate('''()=>{try{WQMathHost.award({id:'unknown'},WQMathHost.profile().account+':'+WQMathHost.profile().id);return false}catch(e){return /找不到/.test(e.message)}}'''),'unknown event accepted')
  check('Uncommitted reward event cannot credit wallet',unsupported,'FAULT')
  evt=create_event(p,'r1-second')
  check('Reward for wrong child scope is rejected',lambda:req(p.evaluate('''(e)=>{try{WQMathHost.award(e.event,'other:child');return false}catch(x){return /切換/.test(x.message)}}''',evt),'wrong scope accepted'),'FAULT')
  def tampered():
   return req(p.evaluate('''(e)=>{try{WQMathHost.award({...e.event,valid:false},e.scope);return false}catch(x){return /不一致/.test(x.message)}}''',evt),'tampered event accepted')
  check('Event payload must match saved outbox',tampered,'FAULT')
  def walletfailure():
   b=balance(p)
   x=p.evaluate('''()=>{const k='wordquest-v10-user-'+WQMathHost.profile().account;const before=localStorage.getItem(k);window.__failSet=k;let err='';try{new WQMathStorage.Store(WQMathHost,WQMathCore.library(WQMathData)).flush()}catch(e){err=e.message}window.__failSet=null;return {unchanged:localStorage.getItem(k)===before,error:err}}''')
   return req(x['unchanged'] and bool(x['error']) and balance(p)==b,'wallet failure changed balance')
  check('Wallet storage failure leaves original wallet unchanged',walletfailure,'FAULT')
  def ackfailure():
   b=balance(p)
   r=p.evaluate('''()=>{const st=new WQMathStorage.Store(WQMathHost,WQMathCore.library(WQMathData));window.__failSet=st.key;let e='';try{st.flush()}catch(x){e=x.message}window.__failSet=null;const pending=JSON.parse(localStorage.getItem(st.key)).outbox.filter(e=>!e.settled).length;const credited=WQMathHost.profile().balance;const retry=new WQMathStorage.Store(WQMathHost,WQMathCore.library(WQMathData)).flush();return {e,pending,credited,retry,final:WQMathHost.profile().balance}}''')
   return req(bool(r['e']) and r['pending']==1 and r['credited']==b+1 and r['retry']==0 and r['final']==b+1,r)
  check('Wallet-success/outbox-ack-failure retries without double payout',ackfailure,'FAULT')
  def quota():
   r=p.evaluate('''()=>{const s=new WQMathStorage.Store(WQMathHost,WQMathCore.library(WQMathData)),before=localStorage.getItem(s.key);window.__failSet=s.key;let err='';try{s.change(n=>n.settings.limit=30)}catch(e){err=e.message}window.__failSet=null;return {same:localStorage.getItem(s.key)===before,err}}''')
   return req(r['same'] and bool(r['err']),r)
  check('Maths storage quota failure preserves previous serialized data',quota,'FAULT')
  def stale_math():
   return req(p.evaluate('''()=>{const s=new WQMathStorage.Store(WQMathHost,WQMathCore.library(WQMathData)),raw=localStorage.getItem(s.key),n=JSON.parse(raw);n.revision++;localStorage.setItem(s.key,JSON.stringify(n));let blocked=false;try{s.change(n=>n.settings.limit=30)}catch(e){blocked=true}localStorage.setItem(s.key,raw);return blocked}'''),'stale maths overwrite')
  check('Stale maths revision cannot overwrite newer data',stale_math,'FAULT')
  def stale_english():
   return req(p.evaluate('''()=>{const k='wordquest-v10-user-'+WQMathHost.profile().account,raw=localStorage.getItem(k),n=JSON.parse(raw);n.writeRevision++;localStorage.setItem(k,JSON.stringify(n));let blocked=false;try{WQMathHost.assertWritable()}catch(e){blocked=true}localStorage.setItem(k,raw);return blocked}'''),'stale English overwrite')
  check('Stale English revision prevents cross-subject writing',stale_english,'FAULT')
  def badmath():
   return req(p.evaluate('''()=>{const C=WQMathCore,L=C.library(WQMathData),s=new WQMathStorage.Store(WQMathHost,L),raw=localStorage.getItem(s.key);localStorage.setItem(s.key,'{broken');const t=new WQMathStorage.Store(WQMathHost,L);const good=t.readOnly&&localStorage.getItem(s.key)==='{broken';localStorage.setItem(s.key,raw);return good}'''),'corruption overwritten')
  check('Corrupt maths data is read-only and raw bytes are preserved',badmath,'FAULT')
  def wrongowner():
   return req(p.evaluate('''()=>{const s=new WQMathStorage.Store(WQMathHost,WQMathCore.library(WQMathData)),raw=localStorage.getItem(s.key),b=s.export();b.owner='other:child';try{s.import(b);return false}catch(e){return raw===localStorage.getItem(s.key)}}'''),'wrong owner backup accepted')
  check('Backup owned by another child cannot replace current progress',wrongowner,'FAULT')
  def expired():
   e=create_event(p,'expired',-8*86400000)
   r=p.evaluate('''e=>{try{WQMathHost.award(e.event,e.scope);return false}catch(x){return /日期/.test(x.message)}}''',e)
   # Keep later scenarios independent; remove synthetic expired fixture.
   p.evaluate("()=>new WQMathStorage.Store(WQMathHost,WQMathCore.library(WQMathData)).change(n=>n.outbox=n.outbox.filter(e=>e.key!=='expired'))")
   return req(r,'expired event accepted')
  check('Automatic reward sync rejects an over-seven-day event',expired,'FAULT')
  def future():
   e=create_event(p,'future',60000)
   r=p.evaluate('''e=>{try{WQMathHost.award(e.event,e.scope);return false}catch(x){return /日期/.test(x.message)}}''',e)
   p.evaluate("()=>new WQMathStorage.Store(WQMathHost,WQMathCore.library(WQMathData)).change(n=>n.outbox=n.outbox.filter(e=>e.key!=='future'))")
   return req(r,'future event accepted')
  check('Automatic reward sync rejects a future-dated event',future,'FAULT')
  def cap():
   for key in ['r1-third','r1-fourth','r1-fifth']:create_event(p,key)
   p.evaluate("()=>new WQMathStorage.Store(WQMathHost,WQMathCore.library(WQMathData)).flush()")
   return req(balance(p)==5,'shared daily cap changed')
  check('Maths uses existing four-task/five-coin daily cap',cap,'FAULT')
  def import_no_coins():
   b=balance(p)
   x=p.evaluate('''()=>{const s=new WQMathStorage.Store(WQMathHost,WQMathCore.library(WQMathData)),v=s.export();s.import(v);return {copy:!!localStorage.getItem(s.key+':before-restore'),pending:s.state.outbox.filter(e=>!e.settled).length}}''')
   return req(x['copy'] and not x['pending'] and balance(p)==b,x)
  check('Backup restore creates recovery copy without replaying coins',import_no_coins,'FAULT')
  # Real parent-managed creation and switching exercises deletion cleanup.
  p.evaluate("location.hash='#children'");p.wait_for_timeout(150)
  if p.locator('#v23-parent-password').count():unlock(p)
  old=prof(p)
  def add_child():
   p.locator('[data-act="show-add-child"]').click();p.locator('#new-child-name').fill('第二位測試學員');p.locator('#new-child-grade').select_option('2');p.locator('[data-act="add-child"]').click();p.wait_for_timeout(100)
   return req(prof(p)['id']!=old['id'],'new child not activated')
  added=check('Existing English parent UI creates the shared second child',add_child)
  if added:
   second=prof(p)
   op(p)
   check('New child starts with isolated maths progress and wallet',lambda:req(len(state(p)['attempts'])==0 and balance(p)==0,'child data leaked'))
   close(p)
   def switch_back():
    p.evaluate("location.hash='#children'");p.wait_for_timeout(100)
    if p.locator('#v23-parent-password').count():unlock(p)
    p.locator(f'[data-act="set-child"][data-id="{old["id"]}"]').click();p.wait_for_timeout(100)
    op(p);x=len(state(p)['attempts']);close(p)
    return req(prof(p)['id']==old['id'] and x==10 and balance(p)==5,'original child not restored')
   check('Switching back restores original child progress and coin balance',switch_back)
   def guard_reset():
    return req(not p.evaluate('WQMathHost.parentAllowed()'),'parent grant leaked across child switch')
   check('Switching child invalidates the previous parent unlock',guard_reset)
   # Seed sidecar for second child, then delete via real English UI.
   skey='wqm-state-v1:'+old['account']+':'+second['id']
   p.evaluate('''k=>{const v=JSON.stringify(WQMathCore.blank());localStorage.setItem(k,v);localStorage.setItem(k+':before-restore',v)}''',skey)
   p.evaluate("location.hash='#children'");p.wait_for_timeout(100)
   if p.locator('#v23-parent-password').count():unlock(p)
   def delete_failure():
    p.evaluate('(k)=>window.__failRemove=k',skey)
    p.locator(f'[data-act="delete-child"][data-id="{second["id"]}"]').click();p.wait_for_timeout(100);p.evaluate('window.__failRemove=null')
    return req(p.evaluate('''({k,id})=>{const d=JSON.parse(localStorage.getItem('wordquest-v10-user-'+WQMathHost.profile().account));return d.children.some(c=>c.id===id)&&localStorage.getItem(k)!==null}''',{'k':skey,'id':second['id']}),'failed deletion partially committed')
   check('Sidecar deletion failure cancels persisted English child deletion',delete_failure,'FAULT')
   # Reload avoids testing against intentionally failed in-memory delete state.
   snap=state_snapshot(p);ctx.close();ctx,p,errors,dialogs=boot(browser,initial=snap)
   p.evaluate("location.hash='#children'");p.wait_for_timeout(100)
   if p.locator('#v23-parent-password').count():unlock(p)
   def delete_ok():
    p.locator(f'[data-act="delete-child"][data-id="{second["id"]}"]').click();p.wait_for_timeout(100)
    return req(p.evaluate('''({k,id})=>{const d=JSON.parse(localStorage.getItem('wordquest-v10-user-'+WQMathHost.profile().account));return !d.children.some(c=>c.id===id)&&localStorage.getItem(k)===null&&localStorage.getItem(k+':before-restore')===null}''',{'k':skey,'id':second['id']}),'sidecar remained')
   check('Deleting English child also removes maths progress and recovery copy',delete_ok)
  check('No uncaught JavaScript errors in fault and child-management scenarios',lambda:req(not errors,errors))
  ctx.close()
  # Entire ordinary and Olympiad lessons are exercised through their six stages.
  ctx,p,errors,dialogs=boot(browser,initial=saved)
  op(p);mc(p,'completed-home');mc(p,'nav:normal');mc(p,'grade:1')
  def lesson_flow(skill_id,oly=False):
   mc(p,'lesson:'+skill_id);stages=set();steps=0
   while not state(p)['current']['completed']:
    ss=state(p)['current'];stages.add(ss['stage']);steps+=1
    req(steps<40,'lesson failed to terminate')
    q=ss.get('queues',{}).get(str(ss['stage']),[])
    if q and ss['index']<len(q):
     if not ss.get('feedback'):req(answer(p)['correct'],'lesson answer marked wrong')
     if state(p)['current'].get('fastPause'):mc(p,'unpause-fast')
     mc(p,'nextq')
    elif ss['stage']==5:
     if oly:mc(p,'reflect:0');mc(p,'finish')
     else:mc(p,'self:good')
    else:mc(p,'nextstage')
   return req(stages==set(range(6)),{'stages':sorted(stages)})
  check('Full ordinary lesson completes all six teaching stages',lambda:lesson_flow('1N1.1'))
  check('Guided questions remain separate from independent mastery attempts',lambda:req(sum(a['mode']=='guided' for a in state(p)['attempts'])==3,'guided classification'))
  mc(p,'completed-home');mc(p,'nav:olympiad')
  check('Full Olympiad lesson completes challenge, teaching and reflection',lambda:lesson_flow('O-NUM-pairs',True))
  check('Correct Olympiad reflection earns the real strategy card',lambda:req(len(state(p)['cards'])==1,'strategy not recorded'))
  check('Ordinary and Olympiad attempts coexist with separate track fields',lambda:req(set(a['track'] for a in state(p)['attempts'])=={'normal','olympiad'},'track data merged'))
  p.screenshot(path=str(ROOT/'arcade_evidence/r1_regression/olympiad-complete.png'),full_page=True)
  ctx.close()
  # Each template is injected as an isolated single-question fixture, then
  # genuinely displayed, entered and marked in the real integrated DOM.
  ctx,p,errors,dialogs=boot(browser,initial=saved)
  fixtures=p.evaluate('''()=>{const L=WQMathCore.library(WQMathData);return WQMathData.templates.map((t,i)=>({template:t.id,seed:100+i}))}''')
  for i,f in enumerate(fixtures):
   def one(f=f,i=i):
    p.evaluate('''({f,i})=>{WQMathApp.close();const C=WQMathCore,L=C.library(WQMathData),st=new WQMathStorage.Store(WQMathHost,L),q=C.generate(L,f.template,f.seed),r={template:f.template,seed:f.seed},n=C.blank();n.settings.slow=true;n.current={id:'template_case_'+i,skill:q.skill,track:q.track,mode:'practice',game:null,stage:4,index:0,queues:{4:[r]},example:r,startedAt:Date.now()-4000,questionAt:Date.now()-4000,activeMs:0,hint:0,feedback:null,results:[],replacements:[],completed:false,rewardDone:false,fast:0,draft:'',picked:'',reflection:null};st.commit(n);}''',{'f':f,'i':i})
    op(p);mc(p,'resume');q=question(p);r=answer(p,q,enter=q['type']=='number')
    req(r['correct'] and len(state(p)['attempts'])==1,'wrong answer/rendering')
    req(p.locator('.feedback').evaluate('(e)=>e.getRootNode().activeElement===e'),'feedback focus lost')
    return {'template':f['template'],'type':q['type'],'marked_correct':True,'keyboard_feedback_focus':True}
   check(f'Template {f["template"]}: render, input, mark, feedback focus',one,'TEMPLATE_DOM')
  check('No JavaScript errors across all template DOM operations',lambda:req(not errors,errors))
  ctx.close()
  # Independent viewport pages, no claims of actual iOS/Android devices.
  for width in [1280,768,390,320]:
   ctx,p,errors,dialogs=boot(browser,width=width)
   check(f'{width}px English subject buttons are visible with no page overflow',lambda:req(p.locator('[data-wqm-open="normal"]').is_visible() and p.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),'English overflow'),'VIEWPORT')
   op(p,'normal')
   check(f'{width}px maths catalogue has no horizontal content overflow',lambda:req(p.locator('#wqm-app-host .shell').evaluate('(s)=>s.scrollWidth<=s.clientWidth+1'),'Maths overflow'),'VIEWPORT')
   mc(p,'nav:home');mc(p,'daily:normal')
   check(f'{width}px question and submit button visible',lambda:req(p.locator('#wqm-app-host [data-action="submit"]').is_visible() and p.locator('#wqm-app-host .shell').evaluate('(s)=>s.scrollWidth<=s.clientWidth+1'),'question overflow'),'VIEWPORT')
   if width in [1280,390,320]:p.screenshot(path=str(ROOT/f'arcade_evidence/r1_regression/maths-{width}.png'),full_page=True)
   ctx.close()
  browser.close()
 totals={s:sum(r['status']==s for r in RESULTS) for s in ['PASS','FAIL']}
 (ROOT/'arcade_evidence/r1_regression/integration_summary.json').write_text(json.dumps({'counts':totals,'total':len(RESULTS),'environment':'Chromium real DOM / page.set_content; explicit memory storage, Web Locks and crypto adapters; network blocked; synthetic fixtures','groups':{g:sum(r['group']==g for r in RESULTS) for g in sorted({r['group'] for r in RESULTS})}},ensure_ascii=False,indent=2))
 print('TOTAL',len(RESULTS),totals)
 return totals['FAIL']
if __name__=='__main__':
 try:sys.exit(1 if run() else 0)
 except Exception as e:
  (ROOT/'arcade_evidence/r1_regression/integration_fatal.txt').write_text(traceback.format_exc())
  print(traceback.format_exc());sys.exit(2)
