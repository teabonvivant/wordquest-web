"""Audit the release inputs; write preservation, checksums, and one distributable ZIP.
Run after docs/report generation. No user-browser data or credentials are read.
"""
from pathlib import Path
import json,hashlib,zipfile,sys,datetime
R=Path(__file__).resolve().parents[1]
def sha(data):return hashlib.sha256(data).hexdigest()
def preserve(source):
 records=[]
 with zipfile.ZipFile(source) as z:
  assert z.testzip() is None,'Original R2 archive CRC failed'
  for info in z.infolist():
   if info.is_dir():continue
   rel=Path(info.filename).relative_to('WordQuest_Arcade_R2');raw=z.read(info);target=R/rel
   if rel.as_posix() not in ('PACKAGE_MANIFEST.json','SHA256SUMS.txt') and target.is_file() and target.read_bytes()==raw:destination=rel.as_posix();kind='unchanged'
   else:
    dest=R/'originals/R2'/rel
    if rel.as_posix()=='app/index.html':dest=R/'originals/R2/index.html'
    dest.parent.mkdir(parents=True,exist_ok=True)
    if dest.exists():assert dest.read_bytes()==raw,'Original archive collision: '+str(dest)
    else:dest.write_bytes(raw)
    destination=dest.relative_to(R).as_posix();kind='archived-before-change'
   records.append({'original_path':rel.as_posix(),'preserved_path':destination,'kind':kind,'sha256':sha(raw),'bytes':len(raw)})
 result={'input_zip':Path(source).name,'input_zip_sha256':sha(Path(source).read_bytes()),'original_file_count':len(records),'all_preserved':True,'files':records}
 (R/'r3_evidence/R2_PRESERVATION.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));return result
if __name__=='__main__':
 source=Path(sys.argv[1]) if len(sys.argv)>1 else R.parent/'WordQuest_Arcade_R2_Complete_20260929.zip'
 if source.exists():preserve(source)
 files=sorted(p for p in R.rglob('*') if p.is_file() and p.name not in ('PACKAGE_MANIFEST.json','SHA256SUMS.txt'))
 # Historical manifests must still be included; exclude ONLY root manifest/checksum.
 files=sorted(p for p in R.rglob('*') if p.is_file() and p not in (R/'PACKAGE_MANIFEST.json',R/'SHA256SUMS.txt'))
 assert not [p for p in files if p.suffix.lower() in ('.ttf','.ttc','.otf','.woff','.woff2')], 'Font file must not be distributed'
 records=[{'path':p.relative_to(R).as_posix(),'bytes':p.stat().st_size,'sha256':sha(p.read_bytes())} for p in files]
 manifest={'version':'R3.0.0','created_at_utc':datetime.datetime.now(datetime.timezone.utc).isoformat(),'app_sha256':sha((R/'app/index.html').read_bytes()),'scope':'All packaged files except the two root manifest/checksum files themselves','files':records}
 (R/'PACKAGE_MANIFEST.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
 (R/'SHA256SUMS.txt').write_text('\n'.join(x['sha256']+'  '+x['path'] for x in records)+'\n')
 for old in json.loads((R/'r3_evidence/R2_PRESERVATION.json').read_text())['files']:
  assert sha((R/old['preserved_path']).read_bytes())==old['sha256'],'Preserved R2 file changed: '+old['original_path']
 out=R.parent/'WordQuest_R3_Complete_20260929.zip'
 with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
  for p in sorted(R.rglob('*')):
   if p.is_file():z.write(p,arcname='WordQuest_R3/'+p.relative_to(R).as_posix())
 with zipfile.ZipFile(out) as z:
  assert z.testzip() is None
  for x in records:assert sha(z.read('WordQuest_R3/'+x['path']))==x['sha256'],x['path']
  count=len([x for x in z.infolist() if not x.is_dir()])
 summary={'zip_path':str(out),'zip_bytes':out.stat().st_size,'files':count,'sha256':sha(out.read_bytes()),'crc':'pass','manifest_files_verified':len(records),'max_path_length':max(len('WordQuest_R3/'+x['path']) for x in records)}
 (R.parent/'WordQuest_R3_Package_Verification.json').write_text(json.dumps(summary,indent=2));print(json.dumps(summary,indent=2))
