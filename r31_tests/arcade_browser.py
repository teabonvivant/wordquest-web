"""Actual Chromium DOM/input and native audio; memory storage / locks / crypto are explicit substitutes.
Only the in-memory HTML under test gains a read-only diagnostics bridge. Not shipped in app.
Synthetic fixture balance unlocks tests; it is not a student's learning record.
"""
from pathlib import Path
import sys,json,copy,time,traceback
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'tests'))
import harness
from playwright.sync_api import sync_playwright
harness.HTML=harness.HTML.replace('window.WQR2Runtime=Object.freeze',"window.__arcadeQA={game:()=>{if(!pgGame)return null;const s=SNAP28.capture(pgGame);return {...s,state:WQRewards.decode(s.state)}},host:()=>({playing:pgPlaying,reason:pgReason,error:pgError,run:structuredClone(a28Run()),balance:activeChild().stars,child:activeChild().id}),buses:()=>({sfx:pgAudio.master?.gain.value,music:pgAudio.musicMaster?.gain.value}),db:()=>structuredClone(db)};window.WQR2Runtime=Object.freeze")
results=[]
def check(name,ok,detail=None):
 results.append({'id':f'UI-{len(results)+1:03}','name':name,'pass':bool(ok),'detail':detail})
 print(results[-1],flush=True)
def snap(page):return page.evaluate('__arcadeQA.host()')
def keys(page,key,ms=180):
 page.keyboard.down(key);page.wait_for_timeout(ms);page.keyboard.up(key)
def start(page,gid):
 page.evaluate("location.hash='#game'");page.wait_for_selector(f'[data-cabinet="{gid}"]');page.locator(f'[data-cabinet="{gid}"] [data-a28="intro"]').click();page.locator('#pg-dialog [data-a28="buy"]').click();page.wait_for_selector('#pg-canvas');page.locator('[data-a28="play"]').click();page.wait_for_function('__arcadeQA.host().playing');
fixture=json.loads((ROOT/'arcade_evidence/test_fixture_initial.json').read_text())
key=next(k for k in fixture['local'] if k.startswith('wordquest-v10-user-'));db=json.loads(fixture['local'][key]);db['children'][0]['stars']=40
db.setdefault('arcadeV28',{'v':28,'children':{'c_demo':{'batch':{'number':1,'used':0,'lastSpentAt':0},'days':{},'ledger':[],'run':None,'paused':False,'permissions':{},'selectedSkin':'classic','bests':{},'migration':{'original':40,'returned':0,'due':0,'at':0}}}})
ac=db['arcadeV28']['children']['c_demo'];ac['permissions'].update({x:'open' for x in ['ruins-courier','cloud-island','star-patrol','lighthouse-well','harbor-volley']});ac['bests']['forest-dash|1']=987;ac['batch']['used']=0
fixture['local'][key]=json.dumps(db,ensure_ascii=False)
try:
 with sync_playwright() as p:
  b=p.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  for gid in ['ruins-courier','cloud-island','star-patrol','lighthouse-well','harbor-volley']:
   ctx,page,errors,dialogs=harness.boot(b,initial=fixture)
   start(page,gid);page.wait_for_timeout(160)
   st=snap(page);check(gid+' one coin admission',st['balance']==39,st)
   g=page.evaluate('__arcadeQA.game()');check(gid+' registered ID and state',g['id']==gid and g['state']['health']==3)
   keys(page,'ArrowRight',150);keys(page,'ArrowUp',90);page.wait_for_timeout(60)
   moved=page.evaluate('__arcadeQA.game()');check(gid+' keyboard updates simulation',moved['state']['t']>g['state']['t'])
   check(gid+' native audio running',page.evaluate("WQR2Runtime.status().audioContext==='running'"),page.evaluate('WQR2Runtime.status()'))
   page.locator('[data-a28="pause"]').click();st=snap(page);saved=page.evaluate('__arcadeQA.game()');page.wait_for_timeout(130)
   check(gid+' pause freezes simulation',not st['playing'] and saved==page.evaluate('__arcadeQA.game()'))
   check(gid+' pause stops audio',page.evaluate("WQR2Runtime.status().audioContext==='suspended' && WQR2Runtime.status().liveAudioNodes===0"))
   page.locator('[data-a28="play"]').click();page.wait_for_function('__arcadeQA.host().playing')
   check(gid+' resume no second charge',snap(page)['balance']==39)
   page.wait_for_timeout(220);page.locator('[data-a28="pause"]').click();page.screenshot(path=str(ROOT/'r31_evidence'/f'{gid}_paused.png'),full_page=True)
   savedState=harness.state_snapshot(page);savedRun=snap(page)['run'];ctx.close()
   ctx,page,errors2,dialogs=harness.boot(b,initial=savedState)
   page.evaluate("location.hash='#game'");page.wait_for_timeout(100);page.locator('[data-a28="resume"]').first.click();page.wait_for_selector('#pg-canvas')
   restored=snap(page);check(gid+' restore on independent DOM instance',restored['run']['id']==savedRun['id'] and restored['run']['snapshot']==savedRun['snapshot'] and restored['balance']==39)
   check(gid+' old best retained',page.evaluate("__arcadeQA.db().arcadeV28.children.c_demo.bests['forest-dash|1']===987"))
   # Mobile dimensions / enlarged layout is tested by actual user button.
   for w,h in [(320,568),(390,844),(844,390)]:
    page.set_viewport_size({'width':w,'height':h});page.wait_for_timeout(80)
    page.locator('[data-a28="r2-full"]').click();page.wait_for_timeout(160)
    metrics=page.evaluate("""()=>{const c=document.querySelector('#pg-canvas').getBoundingClientRect(),v=document.querySelector('.a28-viewport').getBoundingClientRect();return {canvas:{x:c.x,y:c.y,w:c.width,h:c.height},viewport:{x:v.x,y:v.y,w:v.width,h:v.height},inner:[innerWidth,innerHeight],overflow:document.querySelector('.a28-play').scrollHeight>innerHeight+2,keys:[...document.querySelectorAll('.a28-touch-key')].map(x=>{const r=x.getBoundingClientRect();return {w:r.width,h:r.height,y:r.y,x:r.x}})}}""")
    c=metrics['canvas'];check(f'{gid} {w}x{h} enlarged canvas',c['w']>=250 and c['h']>=175 and c['x']>=0 and c['x']+c['w']<=w+2 and c['y']>=0 and c['y']+c['h']<=h+2,metrics)
    check(f'{gid} {w}x{h} touch targets',all(k['w']>=43 and k['h']>=43 and k['x']>=0 and k['x']+k['w']<=w+1 and k['y']+k['h']<=h+1 for k in metrics['keys']),metrics['keys'])
    if gid in ['ruins-courier','star-patrol']:
     page.locator('[data-a28="play"]').click();page.wait_for_timeout(200);page.screenshot(path=str(ROOT/'r31_evidence'/f'{gid}_{w}x{h}.png'));page.keyboard.press('Escape');page.wait_for_timeout(80)
    else:
     page.locator('[data-a28="r2-full"]').click();page.wait_for_timeout(80)
   check(gid+' no browser exceptions',not errors and not errors2,errors+errors2);ctx.close()
  b.close()
except Exception as e:
 check('browser suite interrupted',False,traceback.format_exc())
finally:
 (ROOT/'r31_evidence/arcade_browser_results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
