"""Extract exactly the four scripts from the indexed HTML snapshot; do not edit the app."""
import re, subprocess, hashlib
from pathlib import Path
root=Path(__file__).resolve().parents[1]
p=root/'source/WordQuest_Maths_Try.html'
s=p.read_text(encoding='utf-8')
scripts=re.findall(r'<script\b[^>]*>(.*?)</script\s*>',s,re.S|re.I)
assert len(scripts)==4, f'Unexpected number of scripts: {len(scripts)}'
for i,script in enumerate(scripts):
    (root/f'source/maths_script_{i}.js').write_text(script,encoding='utf-8')
subprocess.run(['node',str(root/'extract.js')],check=True,stdout=subprocess.DEVNULL)
print('source_sha256',hashlib.sha256(p.read_bytes()).hexdigest())
