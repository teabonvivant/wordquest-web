"""Regenerate PACKAGE_MANIFEST.json and SHA256SUMS.txt for the R3.5 tree.

    python3 tools/package_r35.py

Hashes every tracked-style file under the repository root (not .git, caches or the two manifests themselves).
GITHUB_UPLOAD_MANIFEST.json is the historical record of the R3.2 upload and is left untouched; it is listed like any file.
The release-status fields below are written by hand on purpose: they say what has and has not been verified.
"""
from pathlib import Path
import datetime as dt
import hashlib
import json

R = Path(__file__).resolve().parents[1]
SELF = {'PACKAGE_MANIFEST.json', 'SHA256SUMS.txt'}
SKIP_DIRS = {'.git', '__pycache__', 'node_modules', '.venv', 'venv'}


def sha(p: Path) -> str:
    h = hashlib.sha256()
    with p.open('rb') as f:
        for chunk in iter(lambda: f.read(1 << 20), b''):
            h.update(chunk)
    return h.hexdigest()


def main():
    entries = []
    for p in sorted(R.rglob('*'), key=lambda x: x.relative_to(R).as_posix()):
        rel = p.relative_to(R)
        if not p.is_file() or set(rel.parts) & SKIP_DIRS or rel.as_posix() in SELF or p.suffix == '.pyc':
            continue
        entries.append({'path': rel.as_posix(), 'bytes': p.stat().st_size, 'sha256': sha(p)})
    runner = R / 'r35_evidence' / 'final_runner.json'
    suites = json.loads(runner.read_text()) if runner.exists() else []
    manifest = {
        'product': 'WordQuest',
        'version': 'R3.5.0',
        'releaseStatus': 'plain-language copy, first-run flow, lesson and dictation-practice repairs on top of R3.4 (not a commercial release; teacher review of content still outstanding)',
        'createdAtUTC': dt.datetime.now(dt.timezone.utc).isoformat(),
        'base': 'WordQuest R3.4 (rebuilt from originals/R3_2 by tools/build_r33.py and tools/build_r34.py, then r35_src/patches by tools/build_r35.py)',
        'entry': 'START_HERE.html',
        'app': 'app/index.html',
        'rebuild': 'python3 tools/build_r35.py',
        'nativeValidation': 'not completed; no real-device, iOS Safari, child, listening or Windows-launcher verification (phone tests are Chromium touch emulation)',
        'suites': [{k: s.get(k) for k in ('name', 'returncode', 'pass_lines', 'fail_lines')} for s in suites],
        'totalFiles': len(entries) + len(SELF),
        'hashedFiles': len(entries),
        'excludes': sorted(SELF),
        'files': entries,
    }
    (R / 'PACKAGE_MANIFEST.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    sums = ''.join(f"{e['sha256']}  {e['path']}\n" for e in entries)
    (R / 'SHA256SUMS.txt').write_text(sums, encoding='utf-8')
    print(f'{len(entries)} files hashed')


if __name__ == '__main__':
    main()
