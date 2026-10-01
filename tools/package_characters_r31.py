"""Package the current R3.1 program, all original data, source, artwork, and evidence.
No runtime caches or font binaries are distributed. The two root manifest files
are excluded from their own hash list, avoiding self-referential checksums.
"""
from pathlib import Path
import argparse, hashlib, json, zipfile
from datetime import datetime, timezone
R=Path(__file__).resolve().parents[1]
SELF_MANIFESTS={'PACKAGE_MANIFEST.json','SHA256SUMS.txt'}
FONT_EXTENSIONS={'.ttf','.otf','.woff','.woff2','.eot'}

def sha256(p:Path)->str:
    h=hashlib.sha256()
    with p.open('rb') as f:
        for block in iter(lambda:f.read(1<<20),b''):h.update(block)
    return h.hexdigest()

def eligible(p:Path)->bool:
    rel=p.relative_to(R)
    return p.is_file() and not any(s in {'__pycache__','.git','r31_work'} for s in rel.parts) and p.suffix.lower() not in {'.pyc','.pyo'}

def main()->None:
    args=argparse.ArgumentParser()
    args.add_argument('--output',type=Path,default=R.parent/'WordQuest_R3_1_Forest_Complete.zip')
    a=args.parse_args();out=a.output.resolve()
    if out==R or R in out.parents:raise ValueError('Write the ZIP outside the source tree.')
    summary=json.loads((R/'r31_evidence/SUMMARY.json').read_text())
    app_hash=sha256(R/'app/index.html')
    if app_hash!=summary['appSha256']:raise ValueError('App differs from the tested build.')
    if summary['total']!=summary['passed']:raise ValueError('Functional checks not all passing.')
    preserve=json.loads((R/'r31_evidence/R3_PRESERVATION.json').read_text())
    for row in preserve['entries']:
        p=R/row['preservedAt']
        if not p.is_file() or sha256(p)!=row['sha256']:raise ValueError('Original R3 source missing or changed: '+row['original'])
    paths=sorted((p for p in R.rglob('*') if eligible(p)),key=lambda p:p.relative_to(R).as_posix())
    fonts=[p for p in paths if p.suffix.lower() in FONT_EXTENSIONS]
    if fonts:raise ValueError('Font binary found; do not distribute: '+str(fonts))
    entries=[]
    for p in paths:
        rel=p.relative_to(R).as_posix()
        if rel in SELF_MANIFESTS:continue
        entries.append({'path':rel,'bytes':p.stat().st_size,'sha256':sha256(p)})
    manifest={
        'package':'WordQuest R3.1 Forest Complete','version':'R3.1.0',
        'generatedAtUtc':datetime.now(timezone.utc).isoformat(),
        'entrypoint':'START_HERE.html','application':'app/index.html',
        'appSha256':app_hash,'hashedFileCount':len(entries),'totalFileCount':len(entries)+2,
        'excludedFromOwnHashes':sorted(SELF_MANIFESTS),'originalR3FilesPreserved':preserve['exactlyPreserved'],
        'sourceImages':'six newly generated posters in this conversation, not historical V33 recovery',
        'testSummary':'r31_evidence/SUMMARY.json','testEnvironment':'r31_evidence/environment.json',
        'entries':entries}
    (R/'PACKAGE_MANIFEST.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
    (R/'SHA256SUMS.txt').write_text(''.join(e['sha256']+'  '+e['path']+'\n' for e in entries),encoding='utf-8')
    paths=sorted((p for p in R.rglob('*') if eligible(p)),key=lambda p:p.relative_to(R).as_posix())
    prefix='WordQuest_R3_1_Forest/'
    out.parent.mkdir(parents=True,exist_ok=True)
    with zipfile.ZipFile(out,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=6,allowZip64=True) as z:
        for p in paths:z.write(p,prefix+p.relative_to(R).as_posix())
    with zipfile.ZipFile(out) as z:
        if z.testzip() is not None:raise ValueError('ZIP CRC check failed.')
        if len(z.infolist())!=manifest['totalFileCount']:raise ValueError('ZIP count mismatch.')
        for e in entries:
            data=z.read(prefix+e['path'])
            if len(data)!=e['bytes'] or hashlib.sha256(data).hexdigest()!=e['sha256']:raise ValueError('ZIP checksum mismatch: '+e['path'])
    result={'zip':str(out),'bytes':out.stat().st_size,'MB':round(out.stat().st_size/1_000_000,1),'MiB':round(out.stat().st_size/1_048_576,1),'files':len(paths),'hashedFiles':len(entries),'originalR3FilesPreserved':preserve['exactlyPreserved'],'zipSha256':sha256(out),'crcCheck':'pass','entryHashCheck':'all pass','functionalCases':summary['total'],'syntaxChecks':summary['syntax'],'appSha256':app_hash}
    out.with_suffix('.verification.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
    print(json.dumps(result,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
