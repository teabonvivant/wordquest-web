"""Materialize an unmodified WordQuest ZIP for the audit runners.
Run from the directory containing audit_work. Uses no network or user browser profile.
"""
from pathlib import Path
import argparse,re,zipfile,json
p=argparse.ArgumentParser();p.add_argument('zip_path');args=p.parse_args()
R=Path('audit_work');destination=R/'program';destination.mkdir(parents=True,exist_ok=True)
with zipfile.ZipFile(args.zip_path) as z:
    assert z.testzip() is None, 'ZIP CRC failure'
    for i in z.infolist():
        assert not i.filename.startswith('/') and '..' not in Path(i.filename).parts, 'Unsafe ZIP path'
        assert ((i.external_attr>>16)&0o170000)!=0o120000, 'ZIP symlink refused'
    z.extractall(destination)
html=(destination/'WordQuest_R3_2/app/index.html').read_text()
ex=R/'extracted';ex.mkdir(exist_ok=True);metadata=[]
for i,m in enumerate(re.finditer(r'<script\b([^>]*)>([\s\S]*?)</script\s*>',html,re.I)):
    (ex/f'script_{i:02d}.js').write_text(m.group(2))
    metadata.append({'i':i,'attrs':m.group(1),'len':len(m.group(2)),'html_line':html.count('\n',0,m.start())+1})
(ex/'script_metadata.json').write_text(json.dumps(metadata,indent=2))
assert len(metadata)==40,'This runner expects exactly the audited R3.2 build'
print('Extracted unchanged R3.2 and its 40 embedded scripts.')
