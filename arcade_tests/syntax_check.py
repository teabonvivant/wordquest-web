from pathlib import Path
import re,subprocess,json,tempfile
ROOT=Path(__file__).resolve().parents[1]
out=[]
with tempfile.TemporaryDirectory() as d:
 for i,m in enumerate(re.finditer(r'<script\b[^>]*>(.*?)</script>',(ROOT/'app/index.html').read_text(),re.S|re.I)):
  code=m.group(1);p=Path(d)/f'script{i}.js';p.write_text(code)
  r=subprocess.run(['node','--check',str(p)],capture_output=True,text=True)
  out.append({'id':f'JS-{i:02}','pass':r.returncode==0,'details':r.stderr})
(ROOT/'arcade_evidence/syntax.json').write_text(json.dumps(out,ensure_ascii=False,indent=2))
print(len(out), 'scripts',sum(x['pass'] for x in out),'pass')
for x in out:
 if not x['pass']:print(x)
