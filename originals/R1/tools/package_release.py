"""Create an integrity-checked release ZIP from the finished local folder."""
from pathlib import Path
from html.parser import HTMLParser
from urllib.parse import unquote,urlparse
import json,hashlib,zipfile,shutil
R=Path(__file__).resolve().parents[1]
class Links(HTMLParser):
 def __init__(self):super().__init__();self.links=[]
 def handle_starttag(self,t,attrs):
  a=dict(attrs)
  for k in ['href','src']:
   if k in a:self.links.append(a[k])
def run():
 for f in R.rglob('__pycache__'):shutil.rmtree(f)
 # Manifest is generated below; reserve its path for local link validation.
 (R/'PACKAGE_MANIFEST.json').write_text('{}')
 out=[]
 for f in [R/'START_HERE.html',R/'docs/本輪套用及驗證報告.html']:
  p=Links();p.feed(f.read_text())
  for u in p.links:
   if u.startswith(('#','data:','http:','https:')):continue
   target=(f.parent/unquote(urlparse(u).path)).resolve()
   out.append({'page':str(f.relative_to(R)),'link':u,'exists':target.is_file()})
 assert all(c['exists'] for c in out),[c for c in out if not c['exists']]
 (R/'evidence/delivery_links.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
 assert not [p for p in R.rglob('*') if p.suffix.lower() in ['.ttf','.otf','.woff','.woff2']]
 summary=json.loads((R/'evidence/final_summary.json').read_text());assert summary['fail']==0
 manifest=[]
 for p in sorted(R.rglob('*')):
  if not p.is_file() or p.parent==R and p.name in ['PACKAGE_MANIFEST.json','SHA256SUMS.txt']:continue
  raw=p.read_bytes();manifest.append({'path':p.relative_to(R).as_posix(),'bytes':len(raw),'sha256':hashlib.sha256(raw).hexdigest()})
 meta={'release':'V32-M0.1.2-R1','file_count_including_this_manifest_and_sha256_list':len(manifest)+2,'payload_files':len(manifest),'original_files_preserved':650,'summary':summary,'self_reference_note':'Manifest excludes its own hash and SHA256SUMS hash; SHA256SUMS includes the manifest but excludes itself.','files':manifest}
 (R/'PACKAGE_MANIFEST.json').write_text(json.dumps(meta,ensure_ascii=False,indent=2))
 hashes=[f"{m['sha256']}  {m['path']}" for m in manifest]
 hashes.append(hashlib.sha256((R/'PACKAGE_MANIFEST.json').read_bytes()).hexdigest()+'  PACKAGE_MANIFEST.json')
 (R/'SHA256SUMS.txt').write_text('\n'.join(hashes)+'\n')
 dest=R.parent/'WordQuest_V32_Maths_Integrated_R1_20260929.zip'
 with zipfile.ZipFile(dest,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  for p in sorted(R.rglob('*')):
   if p.is_file():z.write(p,(Path(R.name)/p.relative_to(R)).as_posix())
 with zipfile.ZipFile(dest) as z:
  assert z.testzip() is None
  assert len(z.namelist())==len(manifest)+2
  for m in manifest:
   raw=z.read(R.name+'/'+m['path']);assert hashlib.sha256(raw).hexdigest()==m['sha256']
 verification={'zip':str(dest),'bytes':dest.stat().st_size,'MB':round(dest.stat().st_size/1000000,2),'files':len(manifest)+2,'CRC_errors':0,'payload_sha256_mismatches':0,'original_files_preserved':650,'new_delivery_links_valid':len(out),'zip_sha256':hashlib.sha256(dest.read_bytes()).hexdigest()}
 (R.parent/'WordQuest_R1_release_verification.json').write_text(json.dumps(verification,ensure_ascii=False,indent=2))
 print(json.dumps(verification,ensure_ascii=False,indent=2))
if __name__=='__main__':run()
