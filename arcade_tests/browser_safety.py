from pathlib import Path
import sys,json,copy,traceback,time
ROOT=Path(__file__).resolve().parents[1];sys.path.insert(0,str(ROOT/'tests'))
import harness
from playwright.sync_api import sync_playwright
# Read-only test inspection, plus an analyser tap with zero additional audio output.
harness.HTML=harness.HTML.replace('window.WQR2Runtime=Object.freeze',"""window.__arcadeQA={game:()=>{if(!pgGame)return null;const s=SNAP28.capture(pgGame);return {...s,state:WQRewards.decode(s.state)}},host:()=>({playing:pgPlaying,reason:pgReason,error:pgError,run:structuredClone(a28Run()),balance:activeChild().stars}),buses:()=>({sfx:pgAudio.master?.gain.value,music:pgAudio.musicMaster?.gain.value}),db:()=>structuredClone(db),audioDebug:()=>({time:pgAudio.ctx?.currentTime,state:pgAudio.ctx?.state,sfx:pgAudio.master?.gain.value,music:pgAudio.musicMaster?.gain.value,settings:structuredClone(db.settings),playing:pgPlaying,reason:pgReason}),meter(){if(!this.a&&pgAudio.ctx){this.a=pgAudio.ctx.createAnalyser();this.a.fftSize=1024;this.zero=pgAudio.ctx.createGain();this.zero.gain.value=0;pgAudio.master.connect(this.a);pgAudio.musicMaster.connect(this.a);this.a.connect(this.zero);this.zero.connect(pgAudio.ctx.destination)}const x=new Float32Array(1024);this.a?.getFloatTimeDomainData(x);return Math.max(...x.map(Math.abs));}};window.WQR2Runtime=Object.freeze""")
fixture=json.loads((ROOT/'arcade_evidence/test_fixture_initial.json').read_text());key=next(k for k in fixture['local'] if k.startswith('wordquest-v10-user-'));db=json.loads(fixture['local'][key]);db['children'][0]['stars']=40
ac={'batch':{'number':1,'used':0,'lastSpentAt':0},'days':{},'ledger':[],'run':None,'paused':False,'permissions':{},'selectedSkin':'classic','bests':{'forest-dash|1':987},'migration':{'original':40,'returned':0,'due':0,'at':0}}
ac['permissions']={g:'open' for g in ['ruins-courier','cloud-island','star-patrol','lighthouse-well','harbor-volley','forest-band']};db['arcadeV28']={'v':28,'children':{'c_demo':ac}};fixture['local'][key]=json.dumps(db,ensure_ascii=False)
results=[]
def check(name,ok,detail=None):
 results.append({'id':f'SAFE-{len(results)+1:03}','name':name,'pass':bool(ok),'detail':detail});print(results[-1],flush=True);(ROOT/'arcade_evidence/safety_results.json').write_text(json.dumps(results,ensure_ascii=False,indent=2))
def lobby(page,gid):
 page.evaluate("location.hash='#game'");page.wait_for_timeout(100)
 if gid=='forest-band':page.locator('[data-a28="filter"][data-filter="全部"]').click()
 page.locator(f'[data-cabinet="{gid}"] [data-a28="intro"]').click()
def buy(page,gid):
 lobby(page,gid);page.locator('#pg-dialog [data-a28="buy"]').click();page.wait_for_selector('#pg-canvas')
def play(page):page.locator('[data-a28="play"]').click();page.wait_for_function('__arcadeQA.host().playing')
def pause(page):page.locator('[data-a28="pause"]').click();page.wait_for_timeout(80)
def vol(page,key,value):
 page.locator(f'[data-r2-volume="{key}"]').evaluate('(e,v)=>{e.value=v;e.dispatchEvent(new Event("input",{bubbles:true}));e.dispatchEvent(new Event("change",{bubbles:true}));}',str(value))
def peaks(page,n=12):
 out=[]
 for _ in range(n):page.wait_for_timeout(45);out.append(page.evaluate('__arcadeQA.meter()'))
 return out
try:
 with sync_playwright() as pw:
  browser=pw.chromium.launch(executable_path='/usr/bin/chromium',headless=True,args=['--no-sandbox'])
  ctx,p,err,_=harness.boot(browser,initial=fixture);buy(p,'star-patrol');play(p)
  samples=peaks(p);check('Native AudioContext produces nonzero measured samples',max(samples)>.000001,samples)
  p.locator('.r2-audio summary').click();vol(p,'arcadeSfxVolume',0);vol(p,'arcadeMusicVolume',0);samples=peaks(p)
  check('Both volume buses at zero output zero samples',max(samples[-5:])<.0000001,{'samples':samples,'buses':p.evaluate('__arcadeQA.buses()')})
  check('Zero volume schedules no new sound nodes',p.evaluate('WQR2Runtime.status().liveAudioNodes===0'))
  vol(p,'arcadeSfxVolume',50);vol(p,'arcadeMusicVolume',25);p.wait_for_timeout(100);buses=p.evaluate('__arcadeQA.buses()')
  check('Independent SFX and music gain controls',abs(buses['sfx']-.4)<.00001 and abs(buses['music']-.2)<.00001,buses)
  pause(p);saved=harness.state_snapshot(p);ctx.close();ctx,p,err2,_=harness.boot(browser,initial=saved)
  check('Volume settings survive serialization and new DOM',p.evaluate('WQR2Runtime.status().sfxVolume===.5&&WQR2Runtime.status().musicVolume===.25'))
  p.evaluate("location.hash='#game'");p.wait_for_timeout(100);p.locator('[data-a28="resume"]').first.click();play(p)
  # Real mouse down/up goes through the same Pointer Event handler as touch controls.
  before=p.evaluate('__arcadeQA.game().state.p.x');btn=p.locator('[data-a28key="right"]');btn.scroll_into_view_if_needed();pos=btn.bounding_box();p.mouse.move(pos['x']+pos['width']/2,pos['y']+pos['height']/2);p.mouse.down();p.wait_for_timeout(150);p.mouse.up();after=p.evaluate('__arcadeQA.game().state.p.x')
  check('Pointer-held control moves player',after>before+10,{'before':before,'after':after})
  p.wait_for_timeout(120);after2=p.evaluate('__arcadeQA.game().state.p.x');check('Pointer release stops movement',abs(after2-after)<1,{'after':after,'later':after2})
  # Global UI mute while playing.
  toggle=p.locator('[data-act="toggle-sfx"]').first
  toggle.click();p.wait_for_timeout(100);check('Global sound toggle mutes both buses',p.evaluate('WQR2Runtime.status().globalMute&&__arcadeQA.buses().sfx===0&&__arcadeQA.buses().music===0'))
  check('Global mute does not stop gameplay',p.evaluate('__arcadeQA.host().playing'))
  toggle.click();p.wait_for_timeout(80);check('Global toggle restores configured volumes',p.evaluate('!WQR2Runtime.status().globalMute&&Math.abs(__arcadeQA.buses().sfx-.4)<.00001'))
  # Hide event pathway pauses; synthetic event, not a physical tab-switch claim.
  p.evaluate("window.dispatchEvent(new Event('blur'))");p.wait_for_timeout(100);check('Window blur releases input and pauses',p.evaluate('!__arcadeQA.host().playing'))
  check('No native-audio/control JavaScript errors',not err and not err2,err+err2);ctx.close()
  # Pre-admission write failure must leave both stored and in-memory balance intact.
  ctx,p,err,_=harness.boot(browser,initial=fixture);lobby(p,'ruins-courier');p.evaluate('(k)=>window.__failSet=k',key);p.locator('#pg-dialog [data-a28="buy"]').click();p.wait_for_timeout(150)
  check('Admission save failure does not debit in-memory coins',p.evaluate('__arcadeQA.host().balance===40'))
  check('Admission save failure does not debit stored coins',p.evaluate('(k)=>JSON.parse(localStorage.getItem(k)).children[0].stars===40',key))
  check('Admission save failure has no playable charged run',p.evaluate('!__arcadeQA.host().run'))
  p.evaluate('window.__failSet=null');ctx.close()
  # Mid-game write failure freezes progress and retains old durable checkpoint.
  ctx,p,err,_=harness.boot(browser,initial=fixture);buy(p,'cloud-island');play(p);p.wait_for_timeout(130);stored=p.evaluate('(k)=>localStorage.getItem(k)',key);p.evaluate('(k)=>window.__failSet=k',key);pause(p)
  check('Checkpoint failure freezes playing state',p.evaluate('!__arcadeQA.host().playing'))
  check('Checkpoint failure retains stored last-good data',p.evaluate('(k)=>localStorage.getItem(k)',key)==stored)
  check('Checkpoint failure presents recovery action',p.locator('[data-a28="retry-save"]').count()==1)
  p.evaluate('window.__failSet=null');p.locator('[data-a28="retry-save"]').click();p.wait_for_timeout(120)
  check('Retry save clears failure without a second admission',p.evaluate('__arcadeQA.host().balance===39'))
  play(p);btn=p.locator('[data-a28key="up"]');btn.scroll_into_view_if_needed();box=btn.bounding_box();p.mouse.move(box['x']+box['width']/2,box['y']+box['height']/2);p.mouse.down();p.wait_for_timeout(70)
  check('Cloud pointer press holds jump',p.evaluate('__arcadeQA.game().state.jumpHeld'))
  btn.dispatch_event('pointercancel',{'pointerId':1,'bubbles':True});p.mouse.up();p.wait_for_timeout(80)
  check('Cloud pointer cancellation clears held jump',p.evaluate('!__arcadeQA.game().state.jumpHeld'))
  ctx.close()
  # Use all filter via actual tab to verify old 21 remain visible.
  ctx,p,err,_=harness.boot(browser,initial=fixture);p.evaluate("location.hash='#game'");p.wait_for_timeout(100)
  tabs=p.locator('[data-a28="filter"]').evaluate_all('(xs)=>xs.map(x=>({text:x.innerText,data:x.dataset}))');# Filter metadata retained only for local test inspection.
  p.locator('[data-a28="filter"]').filter(has_text='全部').click();p.wait_for_timeout(100)
  check('All tab displays old 21 plus new 5 cabinets',p.locator('[data-cabinet]').count()==26)
  p.locator('.r2-records summary').click();check('Old best score visible by original game identity','987 分' in p.locator('.r2-records').inner_text())
  p.locator('[data-cabinet="forest-band"] [data-a28="intro"]').click();p.locator('#pg-dialog [data-a28="buy"]').click();p.wait_for_selector('#pg-canvas');play(p);check('Original music studio still starts after audio replacement',p.evaluate('__arcadeQA.host().playing&&__arcadeQA.game().id==="forest-band"'))
  p.locator('.r2-audio summary').click();vol(p,'arcadeSfxVolume',0);p.wait_for_timeout(250);check('Original game obeys new SFX volume bus',p.evaluate('__arcadeQA.buses().sfx===0'))
  check('Old game and all-catalogue no JS errors',not err,err);ctx.close();browser.close()
except Exception:
 check('Safety suite interrupted',False,traceback.format_exc())
