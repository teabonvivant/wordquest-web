"""Run delivery suites. Uses Node and Python/Playwright on a development machine.
Browser adapters are explicit; this is not native persistent storage or real-phone acceptance.
"""
from pathlib import Path
import subprocess,json,hashlib,datetime,concurrent.futures,sys
R=Path(__file__).resolve().parents[1];E=R/'r3_evidence';E.mkdir(exist_ok=True)
commands=[['node','r3_tests/content_generate.cjs'],['python','r3_tests/independent_oracle.py'],['node','r3_tests/family_contracts.cjs'],['node','r3_tests/server_contracts.mjs'],['node','r3_tests/arcade_regression.cjs'],['python','r3_tests/family_browser.py'],['python','r3_tests/new_features_browser.py'],['python','r3_tests/arcade_browser.py'],['python','r3_tests/integration_regression.py'],['python','r3_tests/lesson_text_browser.py']]
buildhash=hashlib.sha256((R/'app/index.html').read_bytes()).hexdigest();records=[]
def run(cmd):
 record={'command':cmd,'started_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'app_sha256':buildhash};log=E/('delivery_'+Path(cmd[-1]).name+'.log')
 with log.open('w') as f:r=subprocess.run(cmd,cwd=R,stdout=f,stderr=subprocess.STDOUT,timeout=600)
 mappings={'independent_oracle.py':'independent_results.json','family_contracts.cjs':'family_contracts.json','server_contracts.mjs':'server_contracts.json','arcade_regression.cjs':'arcade_core_results.json','family_browser.py':'family_browser.json','new_features_browser.py':'new_features_browser.json','arcade_browser.py':'arcade_browser_results.json','integration_regression.py':'integration_results.json','lesson_text_browser.py':'lesson_text_browser.json'}
 try:
  name=Path(cmd[-1]).name
  if name=='content_generate.cjs':
   failed=len(json.loads((E/'generation_failures.json').read_text()));count=len(json.loads((E/'generated_cases.json').read_text()));assert count==3660
  else:
   raw=json.loads((E/mappings[name]).read_text());cases=raw['tests'] if isinstance(raw,dict) else raw;count=len(cases);assert count>0
   failed=sum(not (x.get('pass') is True or str(x.get('status','')).lower()=='pass') for x in cases)
  record.update(cases=count,failed_cases=failed)
  code=r.returncode or (1 if failed else 0)
 except Exception as e:
  code=1;record['validation_error']=str(e)
 record.update(returncode=code,process_returncode=r.returncode,finished_at_utc=datetime.datetime.now(datetime.timezone.utc).isoformat(),log=log.name);return record
# Generate before independent oracle; data files not raced.
for cmd in commands[:5]:records.append(run(cmd))
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
 for record in pool.map(run,commands[5:]):
  records.append(record);(E/'delivery_runs.json').write_text(json.dumps(records,indent=2));print(record['command'][-1],record['returncode'],flush=True)
assert hashlib.sha256((R/'app/index.html').read_bytes()).hexdigest()==buildhash,'App changed during release run'
(E/'delivery_runs.json').write_text(json.dumps(records,indent=2));print('Completed',len(records),'commands; inspect case result files, not just exit codes.')

if any(x['returncode'] for x in records):sys.exit(1)
