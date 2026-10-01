"""Verify shipped files against the package SHA256SUMS.txt (developer optional)."""
from pathlib import Path
import hashlib, sys
root=Path(__file__).resolve().parents[1]
fail=[]
count=0
for line in (root/"SHA256SUMS.txt").read_text(encoding="utf-8").splitlines():
    digest,rel=line.split("  ",1)
    path=root/rel
    count+=1
    if not path.is_file() or hashlib.sha256(path.read_bytes()).hexdigest()!=digest:
        fail.append(rel)
print(f"Checked {count} files; mismatches: {len(fail)}")
for path in fail: print(path)
sys.exit(bool(fail))
