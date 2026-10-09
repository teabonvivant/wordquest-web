"""Regenerate PACKAGE_MANIFEST.json and SHA256SUMS.txt for the R3.7 tree.

    python3 tools/package_r37.py

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
    runner = R / 'r37_evidence' / 'final_runner.json'
    suites = json.loads(runner.read_text()) if runner.exists() else []
    manifest = {
        'product': '學霸星球 SmartQuest Planet',
        'version': 'R3.7.0',
        'releaseStatus': 'planet home, level mode (English / maths / olympiad), two test modes only, five parent difficulty levels, word-shooter FPS, runner game, characters and daily missions; checks are Chromium emulation, not real devices or children',
        'createdAtUTC': dt.datetime.now(dt.timezone.utc).isoformat(),
        'base': 'R3.6 (commit bd28b55), then r37_src/patches by tools/build_r37.py',
        'entry': 'START_HERE.html',
        'app': 'app/index.html',
        'rebuild': 'python3 tools/build_r37.py',
        'nativeValidation': 'not completed; no real-device, iOS Safari or child verification (phone tests are Chromium touch emulation)',
        'suites': suites,
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
