"""Real Chromium DOM. Application I/O is explicitly adapted; native device page is NOT.
Synthetic test accounts only. Delays/corrupt journals/size refusal are deliberate fault injections.
"""
from pathlib import Path
import ast,sys,json,traceback,time
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1];E=R/'r32_evidence';sys.path.insert(0,str(R/'tests'));import harness
T=ast.parse((R/'r32_tests/family_browser.py').read_text());base=next(ast.literal_eval(n.value) for n in T.body if isinstance(n,ast.Assign) and any(isinstance(t,ast.Name) and t.id=='INJECT' for t in n.targets))
extra=r'''
let __release32=null,__result32=null,__delay32=false;const __read32=readMediaOwner;
readMediaOwner=async owner=>{if(__delay32){__delay32=false;await new Promise(r=>__release32=r);}return __read32(owner);};
window.__R32TEST={canWrite:v24CanWrite,setMediaBusy:v=>mediaBusy=v,save:save,store:()=>storeMedia([{key:'should-not-write',kind:'note',text:'TEST'}]),del:()=>removeMedia('should-not-write'),beginExport:()=>{__delay32=true;__result32=null;r3Export().then(v=>__result32={ok:true,version:v.appVersion}).catch(e=>__result32={ok:false,message:e.message});},release:()=>__release32?.(),result:()=>__result32,
 mutate:()=>localStorage.setItem('wqm-state-v1:'+accountId()+':injected','{}'),unmutate:()=>localStorage.removeItem('wqm-state-v1:'+accountId()+':injected'),
 poison:()=>{const owner=accountId(),before=r3ReadKV();before['wqm-state-v1:OTHER-FAMILY:child']='corrupted';__journal3.set(owner,{owner,before,beforeMedia:[],at:Date.now(),label:'TEST CORRUPT JOURNAL'});localStorage.setItem(r3Marker(),'prepared');},poisonMain:()=>{const owner=accountId();__journal3.set(owner,{owner,before:{[dbKey()]:'{broken'},beforeMedia:[],at:Date.now(),label:'TEST BROKEN MAIN'});localStorage.setItem(r3Marker(),'prepared');},clean:()=>{__journal3.delete(accountId());localStorage.removeItem(r3Marker());},
 oversized:async()=>{const old=WQR32Safety;window.WQR32Safety={...old,canExport:()=>false};try{await r3Export();return ''}catch(e){return e.message}finally{window.WQR32Safety=old;}},
 blockedIDB:async()=>{const desc=Object.getOwnPropertyDescriptor(window,'indexedDB');mediaPromise=null;let request={},closed=false;Object.defineProperty(window,'indexedDB',{configurable:true,value:{open:()=>{setTimeout(()=>request.onblocked(),0);return request;}}});let error='';try{await openMediaDb()}catch(e){error=e.message}request.result={close(){closed=true;}};request.onsuccess();if(desc)Object.defineProperty(window,'indexedDB',desc);else delete window.indexedDB;mediaPromise=null;return {error,closed};}
};
'''
harness.HTML=(R/'app/index.html').read_text().replace('\ninstallMediaEvents();\nrender();',base+extra+'\ninstallMediaEvents();\nrender();')
rows=[]
def need(x,msg='assertion failed'):assert x,msg;return True
def check(name,fn,scope='app-adapted-IO'):
 try:v=fn();need(v is not False);rows.append({'name':name,'scope':scope,'status':'pass','detail':v})
 except Exception as e:rows.append({'name':name,'scope':scope,'status':'fail','error':str(e)});traceback.print_exc()
 (E/'new_browser_results.json').write_text(json.dumps(rows,ensure_ascii=False,indent=2));print(rows[-1]['status'],name,flush=True)
with sync_playwright() as pw:
 b=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
 ctx,p,errors,dialogs=harness.boot(b);harness.register(p,name='r32-new-qa',child='TEST私人姓名')
 p.evaluate("location.hash='#settings'");p.locator('#v23-parent-password').fill('R1testPass99');p.locator('[data-v23="parent-unlock"]').click();p.wait_for_function('WQMathHost.parentAllowed()');p.locator('[data-r3="family"]').click()
 p.locator('[data-r32="health"]').click()
 check('Actual family-panel device report dialog opens',lambda:need(p.locator('[data-r32="report"]').is_visible()))
 def report():
  with p.expect_download() as d:p.locator('[data-r32="report"]').click()
  h=json.loads(Path(d.value.path()).read_text());(E/'device_health_fixture.json').write_text(json.dumps(h,ensure_ascii=False,indent=2));need(h['version']=='3.2.0');need('TEST私人姓名' not in json.dumps(h,ensure_ascii=False));return {'children':h['counts']['children'],'noName':True,'notRestartProof':True}
 check('Downloaded health report excludes synthetic pupil name and account data',report)
 p.evaluate("document.querySelector('#r3-dialog').close()")
 downloads=[];p.on('download',lambda d:downloads.append(d.suggested_filename))
 p.evaluate('__R32TEST.beginExport()');p.wait_for_function('WQR3.dataBusy()')
 check('Export holds writer guard while media snapshot is pending',lambda:need(p.evaluate('WQR3.dataBusy()&&!__R32TEST.canWrite()')))
 check('Export makes application UI inert until snapshot completes',lambda:need(p.evaluate('document.body.inert')))
 check('Concurrent ordinary save is refused while exporting',lambda:need(p.evaluate('__R32TEST.save()===false')))
 for method in ['store','del']:
  check('Pending export refuses media '+method,lambda method=method:need(p.evaluate("async m=>{try{await __R32TEST[m]();return false}catch(e){return !!e.message}}",method)))
 check('Second export request is refused during first',lambda:need(p.evaluate('async()=>{try{await __R3TEST.export();return false}catch(e){return true}}')))
 p.evaluate('__R32TEST.release()');p.wait_for_function('__R32TEST.result()!==null')
 check('Successful export releases busy guard and inert state',lambda:need(p.evaluate('__R32TEST.result().ok&&!WQR3.dataBusy()&&!document.body.inert')))
 check('Real family backup download reports the current release (R3.4)',lambda:need(p.evaluate('__R32TEST.result().version==="R3.4.0"') and len(downloads)==1))
 n=len(downloads);p.evaluate('__R32TEST.beginExport()');p.wait_for_function('WQR3.dataBusy()');p.evaluate('__R32TEST.mutate();__R32TEST.release()');p.wait_for_function('__R32TEST.result()!==null')
 check('External storage mutation during export rejects inconsistent snapshot',lambda:need(not p.evaluate('__R32TEST.result().ok') and len(downloads)==n))
 p.evaluate('__R32TEST.unmutate()')
 check('Failed export restores usability',lambda:need(p.evaluate('!WQR3.dataBusy()&&!document.body.inert')))
 p.evaluate('__R32TEST.setMediaBusy(true)')
 check('In-progress image/audio importer blocks family export',lambda:need(p.evaluate('async()=>{try{await __R3TEST.export();return false}catch(e){return e.message.includes("教材")}}')))
 p.evaluate('__R32TEST.setMediaBusy(false)')
 check('Oversize fault path emits no unrecoverable download and releases guard',lambda:need('140 MB' in p.evaluate('__R32TEST.oversized()') and len(downloads)==n and p.evaluate('!WQR3.dataBusy()')))
 key=p.evaluate('__R3TEST.key()');before=p.evaluate('(k)=>localStorage.getItem(k)',key)
 p.evaluate('localStorage.setItem("wqm-state-v1:OTHER-FAMILY:child","DO-NOT-CHANGE");__R32TEST.poison()')
 msg=p.evaluate('async()=>{try{await __R3TEST.recover();return ""}catch(e){return e.message}}')
 check('Foreign-family recovery journal is refused before any replay',lambda:need(bool(msg) and p.evaluate('localStorage.getItem("wqm-state-v1:OTHER-FAMILY:child")==="DO-NOT-CHANGE"') and before==p.evaluate('(k)=>localStorage.getItem(k)',key)))
 check('Invalid recovery keeps evidence marker and blocks other writes',lambda:need(p.evaluate('__R3TEST.marker()==="prepared"&&!__R32TEST.canWrite()&&!WQR3.dataBusy()')))
 p.evaluate('__R32TEST.clean();__R32TEST.poisonMain()')
 msg=p.evaluate('async()=>{try{await __R3TEST.recover();return ""}catch(e){return e.message}}')
 check('Same-family corrupt main JSON journal cannot overwrite last valid main',lambda:need(bool(msg) and before==p.evaluate('(k)=>localStorage.getItem(k)',key) and p.evaluate('__R3TEST.marker()==="prepared"')))
 p.evaluate('__R32TEST.clean()')
 check('Blocked IndexedDB open rejects rather than hanging; late connection closes',lambda:need(p.evaluate('__R32TEST.blockedIDB()')=={'error':'請關閉同網站的其他分頁，再重試。','closed':True}))
 check('No uncaught errors in new host safety scenarios',lambda:need(not errors,errors));ctx.close()
 # Native-only diagnostic page: NEVER install any storage/crypto/locks adapter.
 ctx=b.new_context(accept_downloads=True);p=ctx.new_page();native_errors=[];p.on('pageerror',lambda e:native_errors.append(str(e)))
 h=(R/'app/device-check.html').read_text().replace('<script src="device-check.js"></script>','<script>'+(R/'app/device-check.js').read_text()+'</script>');p.set_content(h);p.locator('#start').click();p.wait_for_function('!document.querySelector("#start").disabled')
 with p.expect_download() as d:p.locator('#download').click()
 native=json.loads(Path(d.value.path()).read_text());(E/'device_page_native_about_blank.json').write_text(json.dumps(native,ensure_ascii=False,indent=2))
 check('Native diagnostic page refuses unsupported insecure context instead of shimming',lambda:need(not native['environment']['secureContext'] and all(r['status']!='pass' for r in native['results'])),'native-diagnostic-ui-only')
 check('Failed probe preparation is stated without false success message',lambda:need('尚未成功' in p.locator('#notice').inner_text()),'native-diagnostic-ui-only')
 p.locator('#confirm-reopen').click();check('Restart attestation requires explicit user action',lambda:need('請先' in p.locator('#notice').inner_text()),'native-diagnostic-ui-only')
 p.locator('#closed-browser').check();p.locator('#confirm-reopen').click();check('Attestation without successful stored-data check cannot pass restart',lambda:need('先按' in p.locator('#notice').inner_text()),'native-diagnostic-ui-only')
 p.locator('#compete').click();check('Unsupported native cross-tab test explicitly blocked',lambda:need('未能執行' in p.locator('#results').inner_text()),'native-diagnostic-ui-only')
 p.screenshot(path=str(E/'native-page-blocked.png'),full_page=True);check('Native diagnostic page has no uncaught exceptions in blocked environment',lambda:need(not native_errors,native_errors),'native-diagnostic-ui-only');ctx.close()
 # Articulated animation controls in a real rendered canvas (no learner I/O).
 ctx=b.new_context(viewport={'width':1280,'height':900});p=ctx.new_page();art_errors=[];p.on('pageerror',lambda e:art_errors.append(str(e)))
 h=(R/'app/afeng-animation.html').read_text().replace('<script src="afeng-rig.js"></script>','<script>'+(R/'app/afeng-rig.js').read_text()+'</script>')
 import base64
 image=R/'app/assets/forest/a-feng/front.webp';h=h.replace('assets/forest/a-feng/front.webp','data:image/webp;base64,'+base64.b64encode(image.read_bytes()).decode())
 p.set_content(h);p.wait_for_timeout(100)
 check('Canvas rig is painted and exposes eight selectable states',lambda:need(p.locator('#action option').count()==8 and len(p.locator('#stage').evaluate('(c)=>c.toDataURL()'))>10000),'animation-real-canvas')
 for action in ['idle','run','jump','fall','land','dash','hit','victory']:
  p.locator('#action').select_option(action);p.wait_for_timeout(45)
  check('Action selector drives '+action,lambda action=action:need(p.evaluate('AFENG_LAB.inspect().action')==action),'animation-real-canvas')
 p.locator('#pause').click();t=p.evaluate('AFENG_LAB.inspect().t');p.wait_for_timeout(150)
 check('Pause freezes animation timeline',lambda:need(p.evaluate('AFENG_LAB.inspect().t')==t),'animation-real-canvas')
 p.locator('#step').click();check('Single-step advances one frame without resume',lambda:need(p.evaluate('AFENG_LAB.inspect().paused') and abs(p.evaluate('AFENG_LAB.inspect().t')-t-1/30)<1e-6),'animation-real-canvas')
 p.locator('#reverse').click();check('Reverse preserves selection and flips direction',lambda:need(p.evaluate('AFENG_LAB.inspect().face')==-1),'animation-real-canvas')
 p.locator('#reduce').check();p.locator('#action').select_option('run');p.locator('#step').click();p.screenshot(path=str(E/'afeng-lab-desktop.png'),full_page=True)
 p.set_viewport_size({'width':320,'height':850});p.screenshot(path=str(E/'afeng-lab-mobile.png'),full_page=True)
 check('320px action lab has no horizontal overflow',lambda:need(p.evaluate('document.documentElement.scrollWidth<=innerWidth')),'animation-real-canvas')
 check('No uncaught canvas/control errors',lambda:need(not art_errors,art_errors),'animation-real-canvas');ctx.close();b.close()
print('TOTAL',len(rows),'PASS',sum(r['status']=='pass' for r in rows));sys.exit(1 if any(r['status']=='fail' for r in rows) else 0)
