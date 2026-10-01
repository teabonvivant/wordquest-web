"""Release verification: evidence, script mapping, diagnostic exclusion and R1 byte preservation."""
from pathlib import Path
import re,json,hashlib,subprocess,sys
from html.parser import HTMLParser
ROOT=Path(__file__).resolve().parents[1]
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
checks=[]
def check(name,condition,detail=None):
 checks.append({'name':name,'pass':bool(condition),'detail':detail})
app=(ROOT/'app/index.html').read_text();old=(ROOT/'originals/R1/index.html').read_text()
a=[m.group(1) for m in re.finditer(r'<script\b[^>]*>(.*?)</script>',old,re.S|re.I)];b=[m.group(1) for m in re.finditer(r'<script\b[^>]*>(.*?)</script>',app,re.S|re.I)]
check('35 original scripts + 1 new script',len(a)==35 and len(b)==36)
changes=[]
for i,src in enumerate(a):
 j=i if i<=21 else i+1;changes.append({'R1_script':i,'R2_script':j,'identical':src==b[j],'R1_sha256':hashlib.sha256(src.encode()).hexdigest(),'R2_sha256':hashlib.sha256(b[j].encode()).hexdigest()})
(ROOT/'arcade_evidence/source_comparison.json').write_text(json.dumps(changes,indent=2))
check('Only intended original scripts changed',[x['R1_script'] for x in changes if not x['identical']]==[9,19,22,30])
check('No test diagnostics in production',all(x not in app for x in ['window.__arcadeQA','window.__compat','__lockDenied','SecurityError(test)']))
check('New engine source embedded verbatim',(ROOT/'arcade_src/engines.js').read_text() in app)
# Byte-for-byte preservation of every SHA-listed R1 payload, using explicit locations for changed files.
mapping={'app/index.html':'originals/R1/index.html','README_先看這份.md':'originals/R1/README_先看這份.md','START_HERE.html':'originals/R1/START_HERE.html'}
for t in ['build.py','make_delivery.py','package_release.py','verify_build.py']:mapping['tools/'+t]='originals/R1/tools/'+t
preserved=[]
for line in (ROOT/'originals/R1/SHA256SUMS.txt').read_text().splitlines():
 if not line.strip():continue
 expected,rel=line.split('  ',1)
 if rel in ['PACKAGE_MANIFEST.json','SHA256SUMS.txt']:rel_target='originals/R1/'+rel
 else:rel_target=mapping.get(rel,rel)
 p=ROOT/rel_target;preserved.append({'original_path':rel,'preserved_path':rel_target,'identical':p.is_file() and digest(p)==expected})
(ROOT/'arcade_evidence/r1_preservation.json').write_text(json.dumps(preserved,ensure_ascii=False,indent=2))
check('Every checksum-listed R1 file recoverable unchanged',all(x['identical'] for x in preserved),{'files':len(preserved),'missing_or_changed':[x for x in preserved if not x['identical']]})
for fn in ['core_results.json','browser_results.json','safety_results.json','compatibility_results.json']:
 xs=json.loads((ROOT/'arcade_evidence'/fn).read_text());check(fn+' final cases pass',bool(xs) and all(x['pass'] for x in xs),len(xs))
xs=json.loads((ROOT/'arcade_evidence/r1_regression/integration_results.json').read_text());check('English and maths regression passes',len(xs)==147 and all(x['status']=='PASS' for x in xs),len(xs))
summary=json.loads((ROOT/'arcade_evidence/summary.json').read_text());check('Report matches current app',summary['app_sha256']==digest(ROOT/'app/index.html'))
class Links(HTMLParser):
 def __init__(self):super().__init__();self.paths=[]
 def handle_starttag(self,tag,attrs):
  d=dict(attrs)
  for k in ['href','src']:
   if k in d:self.paths.append(d[k])
for relative in ['START_HERE.html','docs/街機R2_升級及驗證報告.html']:
 p=ROOT/relative;q=Links();q.feed(p.read_text());bad=[]
 for target in q.paths:
  clean=target.split('#')[0].split('?')[0]
  if not clean or re.match(r'^[a-z]+:',clean,re.I):continue
  if not (p.parent/clean).exists():bad.append(target)
 check(relative+' internal links exist',not bad,bad)
subprocess.run([sys.executable,str(ROOT/'arcade_tests/syntax_check.py')],check=True)
check('All JavaScript syntax checks pass',all(x['pass'] for x in json.loads((ROOT/'arcade_evidence/syntax.json').read_text())))
result={'checks':checks,'pass':sum(x['pass'] for x in checks),'total':len(checks),'app_sha256':digest(ROOT/'app/index.html')}
(ROOT/'arcade_evidence/release_verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2))
print(json.dumps(result,ensure_ascii=False,indent=2));sys.exit(0 if all(x['pass'] for x in checks) else 1)
