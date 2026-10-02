"""Native-only acceptance, no shims, no user profiles. Requires Node and Playwright.
Creates a disposable synthetic family through the shipped UI. BLOCKED is not PASS.
Run: python r32_tests/native_acceptance.py [--browser /path/to/chromium] [--headed]
The scratch browser profile is removed on exit. No real learner account is accessed.
"""
from pathlib import Path
import argparse,datetime,json,os,shutil,socket,subprocess,tempfile,time,urllib.request,sys
from fractions import Fraction
from playwright.sync_api import sync_playwright
R=Path(__file__).resolve().parents[1]
a=argparse.ArgumentParser();a.add_argument('--browser',default=shutil.which('chromium'));a.add_argument('--headed',action='store_true');a.add_argument('--output',default=str(R/'r32_evidence/native_acceptance.json'));args=a.parse_args()
rows=[];stage='navigation';output=Path(args.output);output.parent.mkdir(parents=True,exist_ok=True)
def record(name,status,detail=''):
 rows.append({'name':name,'status':status,'detail':detail,'at':datetime.datetime.now(datetime.timezone.utc).isoformat()});save()
def save():
 output.write_text(json.dumps({'scope':'native browser + actual localStorage/IndexedDB/WebLocks/WebCrypto; no adapters','disposableSyntheticProfile':True,'results':rows,'notCovered':['physical phone','Safari','real OCR materials','human voice review','classroom outcome','full recovery after OS/power crash','complete custom-media migration']},ensure_ascii=False,indent=2))
def require(ok,msg):
 if not ok:raise AssertionError(msg)
username='r32-native-'+str(int(time.time()));password='R32-Test-Only-2026!'
def login(p):
 if p.evaluate('!!sessionStorage.getItem("wordquest-v10-current-account")'):return
 p.evaluate("location.hash='#login'");p.locator('#login-name').fill(username);p.locator('#login-pin').fill(password);p.locator('[data-act="login-submit"]').click();p.wait_for_function('!!sessionStorage.getItem("wordquest-v10-current-account")')
def parent(p):
 p.evaluate("WQMathApp.close();location.hash='#settings'");p.locator('#v23-parent-password').fill(password);p.locator('[data-v23="parent-unlock"]').click();p.wait_for_function('WQMathHost.parentAllowed()');p.locator('[data-r3="family"]').click()
def counts(p):
 return p.evaluate('''()=>{const p=WQMathHost.profile();const x=JSON.parse(localStorage.getItem('wordquest-v10-user-'+p.account));return {account:p.account,child:p.id,balance:p.balance,englishAttempts:x.attempts.length,mathAttempts:WQMathApp.getState().attempts.length};}''')
def mc(p,act):p.locator(f'#wqm-app-host [data-action="{act}"]').first.click()
sock=socket.socket();sock.bind(('127.0.0.1',0));port=sock.getsockname()[1];sock.close();env={**os.environ,'WORDQUEST_PORT':str(port)}
server=None;ctx=None
try:
 with tempfile.TemporaryDirectory(prefix='wordquest-r32-native-') as work:
  log=open(Path(work)/'server.log','w');server=subprocess.Popen(['node',str(R/'server/local_server.mjs')],env=env,stdout=log,stderr=subprocess.STDOUT)
  url=f'http://127.0.0.1:{port}/app/index.html'
  for _ in range(100):
   try:urllib.request.urlopen(url,timeout=2).close();break
   except Exception:time.sleep(.1)
  with sync_playwright() as pw:
   opts={'headless':not args.headed,'viewport':{'width':1280,'height':900},'accept_downloads':True}
   if args.browser:opts['executable_path']=args.browser
   if sys.platform.startswith('linux'):opts['args']=['--no-sandbox']
   def open_profile():
    c=pw.chromium.launch_persistent_context(str(Path(work)/'profile'),**opts);p=c.pages[0] if c.pages else c.new_page();p.set_default_timeout(12000);p.on('dialog',lambda d:d.accept());p.goto(url,wait_until='load');return c,p
   ctx,p=open_profile();p.wait_for_function('!!window.WQR32');require(p.evaluate('isSecureContext&&!!navigator.locks&&!!crypto.subtle'),'Required native APIs unavailable');record(stage,'pass','Normal HTTP navigation, no page.set_content or injected adapters.')
   stage='native registration and family writer lock';p.evaluate("location.hash='#login'");p.locator('#register-name').fill(username);p.locator('#register-child').fill('TEST 本機驗收');p.locator('#register-pin').fill(password);p.locator('#register-grade').count() and p.locator('#register-grade').select_option('3');p.locator('[data-act="register-submit"]').click();p.wait_for_function('WQR32.inspect().current.writer');record(stage,'pass')
   stage='ten-question daily practice and one shared reward';p.evaluate('WQMathApp.open("home")');mc(p,'daily:normal');steps=0
   while not p.evaluate('WQMathApp.getState().current.completed'):
    steps+=1;require(steps<=30,'Unexpected daily-loop length');s=p.evaluate('WQMathApp.getState().current')
    if not s.get('feedback'):
     q=p.evaluate('''()=>{const s=WQMathApp.getState().current,r=s.queues[s.stage][s.index];return WQMathCore.generate(WQMathCore.library(WQMathData),r.template,r.seed);}''')
     if q['type']=='choice':mc(p,'choice:'+str(next(i for i,x in enumerate(q['choices']) if str(x['value'])==str(q['answer']))))
     else:
      value=str(q['answer']);fm=q.get('formats',[])
      if 'decimal' in fm and 'fraction' not in fm and '/' in value:value=str(float(Fraction(value)))
      if fm==['fraction'] and '/' not in value:value+='/1'
      p.locator('#wqm-app-host #answer').fill(value)
      if q['type']=='remainder':p.locator('#wqm-app-host #remainder').fill(str(q['remainder']))
      if q['type']=='word':
       z=q['params'];ex=q.get('expression') or (f"{z['paid']}-{z['price']}" if 'qty' not in z else f"{z['paid']}-{z['qty']}*{z['price']}");p.locator('#wqm-app-host #expression').fill(ex);p.locator('#wqm-app-host #unit').select_option('元')
     mc(p,'submit');require(p.evaluate('WQMathApp.getState().current.feedback.correct'),'Incorrect test answer or marking mismatch')
    if p.evaluate('WQMathApp.getState().current.fastPause'):mc(p,'unpause-fast')
    mc(p,'nextq')
   saved=counts(p);require(saved['mathAttempts']==10 and saved['balance']==1,'Expected 10 records and one coin');record(stage,'pass','Synthetic answers through actual input controls; not a pedagogy or independent-answer audit.')
   stage='native family export';parent(p)
   with p.expect_download() as dl:p.locator('[data-r3="export-family"]').click()
   backup=json.loads(Path(dl.value.path()).read_text());require(backup['format']=='wordquest-family' and backup['appVersion']=='R3.2.0','Invalid family backup');record(stage,'pass','Actual download; empty custom-media inventory for this newly-created test family.')
   stage='close entire persistent context then reopen same on-disk profile';ctx.close();ctx=None;ctx,p=open_profile();login(p);p.wait_for_function('WQR32.inspect().current.writer');p.evaluate('WQMathApp.open("home")');require(counts(p)==saved,'Learning/coin identity changed across native context restart');record(stage,'pass','Persistent Chromium context closed and recreated. Not OS reboot/power-loss recovery.')
   stage='native second-tab writer exclusion';second=ctx.new_page();second.goto(url);second.wait_for_function('!!window.WQR32');login(second);require(not second.evaluate('WQR32.inspect().current.writer'),'Two tabs acquired same account writer');require(p.evaluate('WQR32.inspect().current.writer'),'Primary tab unexpectedly lost lock');record(stage,'pass','Actual independent tabs; no lock or storage adapters.')
   stage='native lock release and reacquire after first tab closes';p.close();second.locator('[data-v23="acquire"]').first.click();second.wait_for_function('WQR32.inspect().current.writer');record(stage,'pass');ctx.close();ctx=None
except Exception as e:
 blocked='ERR_BLOCKED_BY_ADMINISTRATOR' in str(e) or stage=='navigation' and ('Executable doesn' in str(e) or 'browserType' in str(e))
 record(stage,'blocked' if blocked else 'fail',str(e)[:2000])
finally:
 if ctx:
  try:ctx.close()
  except Exception:pass
 if server:server.terminate();server.wait(timeout=8)
save();print(json.dumps(rows,ensure_ascii=False,indent=2));sys.exit(2 if any(x['status']=='blocked' for x in rows) else 1 if any(x['status']=='fail' for x in rows) else 0)
