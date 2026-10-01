"""Create the single complete ZIP with SHA-256 inventory after all tests and docs exist."""
from pathlib import Path
import hashlib,json,zipfile,subprocess,sys
ROOT=Path(__file__).resolve().parents[1]
subprocess.run([sys.executable,str(ROOT/'tools/verify_r2.py')],check=True)
def digest(p):return hashlib.sha256(p.read_bytes()).hexdigest()
excluded={'PACKAGE_MANIFEST.json','SHA256SUMS.txt'}
files=sorted(p for p in ROOT.rglob('*') if p.is_file() and '__pycache__' not in p.parts and p.suffix not in {'.pyc','.ttf','.otf','.woff','.woff2'} and p.relative_to(ROOT).as_posix() not in excluded)
entries=[{'path':p.relative_to(ROOT).as_posix(),'bytes':p.stat().st_size,'sha256':digest(p)} for p in files]
summary=json.loads((ROOT/'arcade_evidence/summary.json').read_text())
manifest={'release':'WordQuest Arcade R2.0.0','base':'V32 + Maths 0.1.2 integrated R1','file_count':len(entries)+2,'payload_files':len(entries),'summary':summary,'files':entries}
(ROOT/'PACKAGE_MANIFEST.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2))
(ROOT/'SHA256SUMS.txt').write_text(''.join(f'{x["sha256"]}  {x["path"]}\n' for x in entries)+digest(ROOT/'PACKAGE_MANIFEST.json')+'  PACKAGE_MANIFEST.json\n')
archive=ROOT.parent/'WordQuest_Arcade_R2_Complete_20260929.zip'
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED,compresslevel=6) as z:
 for p in files+[ROOT/'PACKAGE_MANIFEST.json',ROOT/'SHA256SUMS.txt']:
  z.write(p,'WordQuest_Arcade_R2/'+p.relative_to(ROOT).as_posix())
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
 assert len(z.infolist())==manifest['file_count']
 for x in entries:
  assert hashlib.sha256(z.read('WordQuest_Arcade_R2/'+x['path'])).hexdigest()==x['sha256'],x['path']
result={'zip':str(archive),'bytes':archive.stat().st_size,'files':manifest['file_count'],'sha256':digest(archive),'crc_and_payload_sha256_verified':True,'case_total':summary['case_total'],'case_pass':summary['case_pass']}
(ROOT.parent/'WordQuest_Arcade_R2_Delivery.json').write_text(json.dumps(result,ensure_ascii=False,indent=2));print(json.dumps(result,ensure_ascii=False,indent=2))
