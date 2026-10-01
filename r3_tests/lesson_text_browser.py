"""Seed valid lesson states, then render actual lesson/explanation DOM; not a full course journey.
Explicit Chromium storage/crypto/lock adapters from harness. Synthetic child and questions only.
"""
from pathlib import Path
import sys,json,re,traceback
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'tests'));import harness
harness.HTML=(R/'app/index.html').read_text();rows=[]
def ck(name,fn):
 try:detail=fn();assert detail is not False;rows.append({'name':name,'pass':True,'detail':detail})
 except Exception as e:rows.append({'name':name,'pass':False,'error':traceback.format_exc()})
 print(rows[-1]['pass'],name,flush=True);(R/'r3_evidence/lesson_text_browser.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);ct,p,errs,ds=harness.boot(b);harness.register(p)
 ids=p.evaluate('WQMathData.skills.map(x=>({id:x.id,track:x.track}))')
 def render(sk,stage):
  p.evaluate('WQMathApp.close()')
  q=p.evaluate('''([sid,stage])=>{const C=WQMathCore,L=C.library(WQMathData),st=new WQMathStorage.Store(WQMathHost,L),n=C.blank(),t=[...L.templates.values()].find(t=>t.skill===sid),r={template:t.id,seed:7},q=C.generate(L,t.id,7);n.current={id:'lesson-text-'+sid,skill:sid,track:q.track,mode:'lesson',game:null,stage,index:0,queues:{},example:r,startedAt:Date.now()-10000,questionAt:Date.now()-10000,activeMs:0,hint:0,feedback:null,results:[],replacements:[],completed:false,rewardDone:false,fast:0,draft:'',picked:'',reflection:null};st.commit(n);return q;}''',[sk['id'],stage])
  p.evaluate('WQMathApp.open("home")');p.locator('#wqm-app-host [data-action="resume"]').click();text=p.locator('#wqm-app-host main').inner_text();assert not re.search(r'\{[\w]+\}',text),text[-2000:]
  if stage==2 and q.get('answerLabel'):
   label=q['answerLabel'];label=label.get('zh') if isinstance(label,dict) else label;assert '答案：'+label in text,text[-2000:]
  if stage==4:assert '同一題，可以換一條路' in text
  return {'template':q['id'] if 'id' in q else q.get('template'),'stage':stage,'answerLabel':q.get('answerLabel')}
 for sk in ids:
  ck('Concept/example '+sk['id'],lambda sk=sk:render(sk,2))
  if sk['track']=='olympiad':ck('Alternative method '+sk['id'],lambda sk=sk:render(sk,4))
 ck('No uncaught errors in 142 seeded lesson views',lambda:not errs)
 p.screenshot(path=str(R/'r3_evidence/olympiad_alternative.png'),full_page=False);b.close()
print('TOTAL',len(rows),'PASS',sum(x['pass'] for x in rows))
