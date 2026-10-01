"""Verify the built R1, refresh real test inputs and preserve all original bytes.
Standard library only; Node is used solely for JS syntax verification.
"""
from pathlib import Path
from html.parser import HTMLParser
import hashlib,json,subprocess,tempfile,zipfile,platform,sys,importlib.metadata
ROOT=Path(__file__).resolve().parents[1]
class Scripts(HTMLParser):
 def __init__(self):super().__init__(convert_charrefs=False);self.blocks=[];self.current=None
 def handle_starttag(self,tag,attrs):
  if tag=='script':self.current={'attrs':dict(attrs),'source':''}
 def handle_data(self,s):
  if self.current is not None:self.current['source']+=s
 def handle_endtag(self,tag):
  if tag=='script' and self.current is not None:self.blocks.append(self.current);self.current=None

def run():
 app=ROOT/'app/index.html';p=Scripts();p.feed(app.read_text());checks=[]
 with tempfile.TemporaryDirectory() as d:
  for i,s in enumerate(p.blocks):
   if s['attrs'].get('type','').lower() not in ('','text/javascript','application/javascript','module'):continue
   if 'src' in s['attrs']:continue
   f=Path(d)/f'inline_{i}.js';f.write_text(s['source']);r=subprocess.run(['node','--check',str(f)],capture_output=True,text=True)
   checks.append({'script':i,'status':'PASS' if not r.returncode else 'FAIL','error':r.stderr})
 (ROOT/'evidence/javascript_syntax.json').write_text(json.dumps(checks,ensure_ascii=False,indent=2))
 assert checks and all(x['status']=='PASS' for x in checks),'JavaScript syntax error'
 assert 'QuotaExceededError(test)' not in app.read_text() and '__failSet' not in app.read_text(),'Test shims in delivery app'
 p=Scripts();p.feed((ROOT/'app/WordQuest_Maths_Plugin_R1.html.txt').read_text());assert len(p.blocks)==4
 for i,s in enumerate(p.blocks):(ROOT/f'tests/legacy_rerun/source/maths_script_{i}.js').write_text(s['source'])
 # Original package is optional after delivery; original hashes are still verifiable
 # using its own retained manifest and the R1 top-level SHA256 list.
 old=ROOT.parent/'WordQuest_Program_and_Data_20260929.zip'
 if old.exists():
  good=[]
  with zipfile.ZipFile(old) as z:
   for i in z.infolist():
    if i.is_dir():continue
    f=ROOT/'originals'/i.filename
    assert f.is_file(),f'Missing original {i.filename}'
    assert hashlib.sha256(f.read_bytes()).digest()==hashlib.sha256(z.read(i)).digest(),f'Changed original {i.filename}'
    good.append(i.filename)
  (ROOT/'evidence/originals_integrity.json').write_text(json.dumps({'original_files':len(good),'unchanged':len(good),'missing':0,'changed':0,'source_zip_sha256':hashlib.sha256(old.read_bytes()).hexdigest()},indent=2))
 env={'platform':platform.platform(),'python':sys.version,'node':subprocess.check_output(['node','--version'],text=True).strip(),'chromium':subprocess.check_output(['/usr/bin/chromium','--version'],text=True).strip(),'browser_input':'page.set_content(full app/index.html)','storage':'Explicit memory adapter with get/set/remove fault injection','web_locks':'In-page adapter; not native cross-tab locking','webcrypto':'Test adapter calls actual Python hashlib.pbkdf2_hmac SHA-256; native browser API not certified','fixtures':'Synthetic accounts, answers and failure conditions; not real student data','network':'All external requests aborted; file/HTTP navigation blocked by environment','windows_launcher':'Not executed on Windows'}
 try:env['playwright']=importlib.metadata.version('playwright')
 except importlib.metadata.PackageNotFoundError:pass
 (ROOT/'evidence/environment.json').write_text(json.dumps(env,ensure_ascii=False,indent=2))
 print('SYNTAX',len(checks),'PASS; current maths source refreshed; originals verified where original ZIP is available')
if __name__=='__main__':run()
