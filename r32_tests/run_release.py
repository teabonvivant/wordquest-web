"""Sequential R3.2 regression runner; does NOT certify native persistence.
Run native_acceptance.py separately. Avoid simultaneous large inline-app browser suites.
"""
from pathlib import Path
import subprocess,json,time,sys
R=Path(__file__).resolve().parents[1];E=R/'r32_evidence';E.mkdir(exist_ok=True)
jobs=[('arcade-core','node','arcade_regression.cjs'),('family-core','node','family_contracts.cjs'),('new-core','node','new_core.cjs'),('family-browser',sys.executable,'family_browser.py'),('integration-focused',sys.executable,'integration_regression.py'),('arcade-browser',sys.executable,'arcade_browser.py'),('new-browser',sys.executable,'browser_new.py'),('cloud-live',sys.executable,'cloud_live.py'),('server-contracts','node','server_contracts.mjs'),('server-native-http','node','server_native_http.mjs')]
rows=[]
for name,exe,file in jobs:
 row={'name':name,'started':time.time()};rows.append(row);(E/'final_runner.json').write_text(json.dumps(rows,indent=2))
 with (E/(name+'.log')).open('w') as f:
  try:row['returncode']=subprocess.run([exe,str(R/'r32_tests'/file)],cwd=R,stdout=f,stderr=subprocess.STDOUT,timeout=600).returncode
  except subprocess.TimeoutExpired:row['returncode']='timeout'
 row['seconds']=round(time.time()-row['started'],2);(E/'final_runner.json').write_text(json.dumps(rows,indent=2));print(name,row['returncode'],flush=True)
sys.exit(1 if any(x['returncode']!=0 for x in rows) else 0)
