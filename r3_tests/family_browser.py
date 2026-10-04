"""Real Chromium DOM & downloaded files. Storage/WebLocks/crypto and IDB I/O are explicit substitutes.
Tests use synthetic accounts and generated practice data, never the user's browser records.
"""
from pathlib import Path
import sys,json,copy,hashlib,traceback
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1];sys.path.insert(0,str(R/'tests'));import harness
INJECT=r'''
// TEST ONLY: replace external I/O, not validators, merge logic, parent gate, or transaction ordering.
const __media3=new Map(),__journal3=new Map();let __fault3=null;
function __f3(stage){if(__fault3===stage){__fault3=null;throw Error('Injected '+stage);}}
readMediaOwner=async owner=>{__f3('read-media');return (__media3.get(owner)||[]).slice();};
r3ReplaceMedia=async(owner,rows)=>{__f3('write-media');__media3.set(owner,rows.slice());};
r3Journal=async(mode,row)=>{__f3('journal-'+mode);if(mode==='put'){__journal3.set(row.owner,row);return;}if(mode==='get')return __journal3.get(row);if(mode==='delete')__journal3.delete(row);};
syncMediaOwner=async()=>{};
window.__R3TEST={export:r3Export,restore:r3Restore,recover:r3Recover,reset:resetAll,kv:r3ReadKV,saveSettings:r3SaveSettings,settings:()=>r3Clone(r3Settings()),journal:()=>[...__journal3.keys()],marker:()=>localStorage.getItem(r3Marker()),fault:s=>__fault3=s,db:()=>r3Clone(db),media:()=>[...(__media3.get(accountId())||[])].map(r=>({key:r.key,kind:r.kind,size:r.blob?.size||0})),seedMedia:()=>__media3.set(accountId(),[{owner:accountId(),key:'test-custom-picture',kind:'image',blob:new Blob([new Uint8Array([137,80,78,71,13,10,26,10])],{type:'image/png'}),source:'test binary fixture'},{owner:accountId(),key:'test-note',kind:'note',text:'synthetic note'}]),
 seedMath:()=>{const C=WQMathCore,L=C.library(WQMathData),st=new WQMathStorage.Store(WQMathHost,L);st.change(n=>{const q=C.generate(L,'4N8.R3-T2',7);C.record(n,L,q,{value:'999'},{id:'test-attempt-1',time_ms:5000});});localStorage.setItem(st.key+':before-restore',JSON.stringify(st.state));return st.state;},
 oldMath:()=>{const C=WQMathCore,L=C.library(WQMathData),st=C.blank(),q=C.generate(L,'1N1.1-T1',2);C.record(st,L,q,{value:q.answer},{id:'old-a1',time_ms:5000});return {format:'wordquest-maths',version:1,owner:'legacy:old-child',profile:{id:'old-child',name:'舊版測試學員',grade:2},state:st};},
 poisonMarker:()=>localStorage.setItem(r3Marker(),'prepared'),clearMarker:()=>localStorage.removeItem(r3Marker()),setEnglishName:name=>{db.children[0].name=name;save();},key:()=>dbKey(),owner:accountId,
 seedTime:()=>{const n=r3Clone(r3Settings());n.usage[activeChild().id]={[F3.day()]:{english:100000,math:200000,olympiad:0,arcade:0}};r3SaveSettings(n);}
};
'''
harness.HTML=(R/'app/index.html').read_text().replace('\ninstallMediaEvents();\nrender();',INJECT+'\ninstallMediaEvents();\nrender();',1)
rows=[]
def check(name,fn):
 try:result=fn();assert result is not False;rows.append({'id':'FAMILY-'+str(len(rows)+1),'name':name,'status':'pass','detail':result})
 except Exception as e:rows.append({'id':'FAMILY-'+str(len(rows)+1),'name':name,'status':'fail','error':str(e)});print(traceback.format_exc())
 print(rows[-1]['status'],name,flush=True);(R/'r3_evidence/family_browser.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2))
def require(ok,msg='assertion failed'):assert ok,msg;return True
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox']);ctx,p,errors,dialogs=harness.boot(b);harness.register(p)
 p.evaluate("location.hash='#settings'");p.wait_for_timeout(150);p.locator('#v23-parent-password').fill('R1testPass99');p.locator('[data-v23="parent-unlock"]').click();p.wait_for_function('WQMathHost.parentAllowed()');p.locator('[data-r3="family"]').click()
 check('Family management and offline preparation controls visible',lambda:require(p.locator('#r3-prepare-offline').count()==1))
 p.screenshot(path=str(R/'r3_evidence/family_panel.png'),full_page=False)
 check('Fresh family settings are valid and 45-minute total default',lambda:require(p.evaluate('__R3TEST.settings().limitMinutes===45')))
 p.evaluate('''()=>{__R3TEST.seedMath();__R3TEST.seedMedia();__R3TEST.seedTime();localStorage.setItem('wordquest-v32-characters:normal:'+__R3TEST.owner()+':'+WQMathHost.profile().id,JSON.stringify({show:false,motion:false,compact:true,gameBuddy:'panda'}));}''')
 pack={}
 def exp():
  with p.expect_download() as d:p.locator('[data-r3="export-family"]').click()
  file=d.value.path();pack.update(json.loads(Path(file).read_text()));return require(pack['format']=='wordquest-family' and len(pack['payload']['math'][0]['state']['attempts'])==1 and len(pack['payload']['media'])==2)
 check('Real button produces downloaded family JSON with maths and custom-media fixtures',exp)
 check('SHA256 payload checksum independently rechecked in Python',lambda:require(hashlib.sha256(json.dumps(pack['payload'],ensure_ascii=False,separators=(',',':')).encode()).hexdigest()==pack['integrity']['digest']))
 check('Family backup includes per-child character preferences',lambda:require(len(pack['payload']['characterPreferences'])==1 and pack['payload']['characterPreferences'][0]['preferences']['gameBuddy']=='panda'))
 check('No account credential registry in family backup',lambda:require(all(x not in json.dumps(pack) for x in ['passwordHash','passwordSalt','AZURE_SPEECH_KEY'])))
 source=json.dumps(pack,ensure_ascii=False).encode();(R/'r3_evidence/family_export_fixture.json').write_bytes(source)
 def preview():
  p.locator('#r3-family-file').set_input_files({'name':'family.json','mimeType':'application/json','buffer':source});p.wait_for_selector('#r3-restore-consent');return require('整合測試學員' in p.locator('#r3-dialog').inner_text())
 check('Family restore shows real preview and explicit replacement consent',preview)
 check('Restore button without consent cannot write',lambda:(p.locator('[data-r3="confirm-restore"]').click(),require('勾選' in p.locator('#r3-dialog').inner_text()))[1])
 p.locator('#r3-restore-consent').check();p.locator('[data-r3="confirm-restore"]').click();p.wait_for_timeout(200)
 check('Confirmed restore preserves full custom-media count and closes dialog',lambda:require(p.evaluate('__R3TEST.media().length===2') and not p.locator('#r3-dialog').evaluate('(d)=>d.open')))
 check('Confirmed family restore retains character preferences',lambda:require(p.evaluate('''JSON.parse(localStorage.getItem('wordquest-v32-characters:normal:'+__R3TEST.owner()+':'+WQMathHost.profile().id)).compact===true''')))
 check('Successful transaction leaves no journal/marker',lambda:require(p.evaluate('__R3TEST.journal().length===0&&__R3TEST.marker()===null')))
 def failure(stage):
  before=p.evaluate('__R3TEST.kv()');payload=copy.deepcopy(pack['payload']);payload['english']['children'][0]['name']='不得保存';p.evaluate('(s)=>__R3TEST.fault(s)',stage)
  msg=p.evaluate('async v=>{try{await __R3TEST.restore(v);return "";}catch(e){return e.message;}}',payload);after=p.evaluate('__R3TEST.kv()');old=json.loads(next(v for k,v in before.items() if k==p.evaluate('__R3TEST.key()')));new=p.evaluate('__R3TEST.db()')
  # pause/save revisions can advance legitimately before a failure, learning/name/media must not change.
  return require(bool(msg) and new['children']==old['children'] and p.evaluate('__R3TEST.media().length===2&&__R3TEST.marker()===null'),msg)
 for stage in ['read-media','journal-put','write-media']:check('Transaction '+stage+' fault keeps prior family intact',lambda stage=stage:failure(stage))
 def commitcleanup():
  p.evaluate('__R3TEST.fault("journal-delete")');msg=p.evaluate('async v=>{try{await __R3TEST.restore(v);return ""}catch(e){return e.message}}',pack['payload']);require(p.evaluate('__R3TEST.marker()==="committed"') and msg);p.evaluate('__R3TEST.recover()');return require(p.evaluate('__R3TEST.marker()===null&&__R3TEST.journal().length===0'))
 check('Committed transaction with cleanup failure completes through recovery',commitcleanup)
 def missingjournal():
  p.evaluate('__R3TEST.poisonMarker()');m=p.evaluate('async()=>{try{await __R3TEST.recover();return "";}catch(e){return e.message}}');require(('遺失' in m or '不見了' in m) and p.evaluate('__R3TEST.marker()==="prepared"'));p.evaluate('__R3TEST.clearMarker()');return True
 check('Missing prepared journal is not silently treated as successful recovery',missingjournal)
 check('Games-clock guard blocks new play after the daily games time, learning stays open',lambda:p.evaluate('''()=>{const n=__R3TEST.settings();n.limitMinutes=5;n.englishMinutes=0;n.mathMinutes=0;n.olympiadMinutes=0;const id=WQMathHost.profile().id,d=WQFamilyCore.day();n.usage[id]=n.usage[id]||{};n.usage[id][d]=Object.assign({english:0,math:0,olympiad:0,arcade:0},n.usage[id][d]);n.usage[id][d].arcade=400000;__R3TEST.saveSettings(n);let play=false,study=true;try{WQR3.assertPlay()}catch(e){play=/遊戲時間/.test(e.message)}try{WQR3.assertStudy()}catch(e){study=false}return play&&study}'''))
 p.evaluate('()=>{const n=__R3TEST.settings();n.limitMinutes=45;__R3TEST.saveSettings(n)}')
 check('Same-account restore cannot rewind accumulated cross-subject time',lambda:(p.evaluate('async v=>{const n=__R3TEST.settings();n.usage[WQMathHost.profile().id][WQFamilyCore.day()].arcade=100000;__R3TEST.saveSettings(n);await __R3TEST.restore(v);}',pack['payload']),require(p.evaluate('__R3TEST.settings().usage[WQMathHost.profile().id][WQFamilyCore.day()].arcade===100000')))[1])
 # Run old standalone learner migration through real file input and confirmation.
 old=p.evaluate('__R3TEST.oldMath()');oldbytes=json.dumps(old,ensure_ascii=False).encode()
 p.evaluate('WQMathApp.open("parent")');p.locator('#wqm-app-host [data-action="migrate"]').click();p.locator('#wqm-app-host #import-file').set_input_files({'name':'oldmath.json','mimeType':'application/json','buffer':oldbytes});p.wait_for_selector('#wqm-app-host #r3-math-consent')
 check('Old learner name and target shown before merge',lambda:require('舊版測試學員' in p.locator('#wqm-app-host #r3-math-preview').inner_text()))
 def migr():
  p.locator('#wqm-app-host #r3-math-consent').check();p.locator('#wqm-app-host [data-action="confirm-migrate"]').click();return require(p.evaluate('WQMathApp.getState().attempts.length===2&&WQMathHost.profile().balance===0'))
 check('Confirmed old maths merge adds record without awarding old currency',migr)
 def duplicate():
  p.locator('#wqm-app-host [data-action="migrate"]').click();p.locator('#wqm-app-host #import-file').set_input_files({'name':'oldmath.json','mimeType':'application/json','buffer':oldbytes});p.wait_for_selector('#wqm-app-host #r3-math-consent');p.locator('#wqm-app-host #r3-math-consent').check();p.locator('#wqm-app-host [data-action="confirm-migrate"]').click();detail=p.evaluate('({attempts:WQMathApp.getState().attempts.length,receipts:WQMathApp.getState().r3MigrationDigests?.length,notice:document.body.innerText.slice(-2000)})');print('duplicate detail',detail);return require(detail['attempts']==2 and detail['receipts']==1)
 check('Repeated old backup cannot duplicate submitted answers',duplicate)
 p.evaluate('WQMathApp.close()');p.evaluate('localStorage.setItem("wqm-state-v1:other:child","keep-other-owner")')
 def reset():
  p.evaluate('__R3TEST.reset()');return require(p.evaluate('__R3TEST.kv()') and p.evaluate('Object.keys(__R3TEST.kv()).every(k=>!k.startsWith("wqm-state-v1:")&&!k.startsWith("wq-r3-family:")&&!k.startsWith("wordquest-v32-characters:"))&&__R3TEST.media().length===0&&__R3TEST.db().children[0].name==="小朋友"'))
 check('Account reset removes maths main and restoration copies plus custom media',reset)
 check('Account reset preserves unrelated family data',lambda:require(p.evaluate('localStorage.getItem("wqm-state-v1:other:child")==="keep-other-owner"')))
 check('No uncaught JavaScript browser errors',lambda:require(not errors,errors))
 p.screenshot(path=str(R/'r3_evidence/family_after_reset.png'),full_page=False);b.close()
print('TOTAL',len(rows),'PASS',sum(r['status']=='pass' for r in rows))
