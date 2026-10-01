from pathlib import Path
import sys,subprocess,json,hashlib,time
R=Path(__file__).resolve().parents[1];E=R/'r31_evidence';rows=[]
app_hash=hashlib.sha256((R/'app/index.html').read_bytes()).hexdigest()
commands=[['node','r31_tests/characters_core.cjs'],['node','r31_tests/family_contracts.cjs'],['node','r31_tests/arcade_regression.cjs'],[sys.executable,'r31_tests/characters_browser.py'],[sys.executable,'r31_tests/family_browser.py'],[sys.executable,'r31_tests/integration_regression.py'],[sys.executable,'r31_tests/arcade_browser.py']]
for cmd in commands:
 name=Path(cmd[-1]).stem;start=time.monotonic()
 try:
  with (E/(name+'.log')).open('w') as f:p=subprocess.run(cmd,cwd=R,stdout=f,stderr=subprocess.STDOUT,timeout=480)
  row={'suite':name,'returncode':p.returncode,'seconds':round(time.monotonic()-start,2),'appSha256':app_hash}
 except Exception as ex:row={'suite':name,'returncode':-1,'error':str(ex),'appSha256':app_hash}
 rows.append(row);(E/'runs.json').write_text(json.dumps(rows,indent=2));print(row,flush=True)
finalhash=hashlib.sha256((R/'app/index.html').read_bytes()).hexdigest()
(E/'run_complete.json').write_text(json.dumps({'runs':len(rows),'allProcessExitZero':all(r['returncode']==0 for r in rows),'sameAppDuringTests':finalhash==app_hash,'appSha256':finalhash},indent=2))

sys.exit(0 if all(r['returncode']==0 for r in rows) and finalhash==app_hash else 1)
