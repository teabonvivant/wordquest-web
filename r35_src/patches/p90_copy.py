"""R3.5 p90 - plain-wording pass.

Applies the curated rewrite list r35_src/copy/rewrite_audit.csv (id, original, new_text, ...) to the final text.
Only a literal that is a whole string (or a whole HTML text node / template piece) is rewritten, never a substring of a longer
literal, so code and data keep their shape. Rules that make a row skip (every skip is written to r35_evidence/copy_applied.csv):
  short       the original has 3 characters or fewer (too ambiguous; a few are on ALLOW_SHORT)
  notfound    no whole-literal occurrence is left (an earlier module already replaced the text)
  compare     the literal sits next to ===, ==, !=, case, includes(, indexOf(, has( ... : it may be a key the code reads
  key         the literal looks like an object key
  placeholder the ${...} placeholders of original and new text differ
  unsafe      new text has characters that would break the literal (&, <, > in HTML text)
  partial     some occurrences were skipped (compare / key / unsafe): the same text is used in two roles, so none is changed
  scope       an occurrence outside the script(s) named in the row's `locations` is never touched (the audit numbers scripts from 0,
              so audit 腳本k is script k+1 of the page). This keeps dictionary and lesson data (for example 香草 = herb) intact.
  override    listed in r35_src/copy/overrides.csv (action=skip) after human review
r35_src/copy/overrides.csv (id,action,text,reason) can also replace new_text (action=edit).
After the pass every inline script is parsed with node (vm.Script) and the build fails when one stops parsing.
"""
import csv
import io
import json
import re
import subprocess
import tempfile
from pathlib import Path

# Short originals that were checked one by one. T2947 is the lone literal '街機'; 去遊戲街機 style strings are longer literals.
ALLOW_SHORT = {'T2947', 'T0062', 'T0320', 'T0436', 'T0638', 'T0751', 'T0753', 'T1066', 'T2088', 'T2374', 'T2584', 'T2907', 'T3839'}
OPEN_OK = {"'": "'", '"': '"', '`': '`\\$', '>': '<$', '}': '`<$'}
COMPARE_BEFORE = re.compile(r"(===?|!==?|\bcase\s|\.includes\(|\.indexOf\(|\.startsWith\(|\.endsWith\(|\.has\(|\.get\(|\.add\(|\.delete\(|\[)\s*$")


def _load(ctx, name):
    p = ctx.src / 'copy' / name
    if not p.exists():
        return []
    return list(csv.DictReader(io.StringIO(p.read_text(encoding='utf-8-sig'))))


def _placeholders(t):
    return sorted(re.findall(r'\$\{[^}]*\}', t))


def _scan(s, o):
    """Spans (start, end, opener, closer) of whole-literal occurrences of o in s."""
    out = []
    i = s.find(o)
    n = len(s)
    while i != -1:
        j = i + len(o)
        p = s[i - 1] if i else ''
        q = s[j] if j < n else ''
        if p in OPEN_OK and q and q in OPEN_OK[p]:
            if q == '$' and s[j + 1:j + 2] != '{':
                pass
            else:
                out.append((i, j, p, q))
        i = s.find(o, i + 1)
    return out


SCRIPT_RE = re.compile(r'<script\b[^>]*>([\s\S]*?)</script>')


def _script_index(s):
    """Return (starts, ends) of script bodies so an offset can be mapped to a 1-based script number (or 0 = outside)."""
    spans = [(m.start(1), m.end(1)) for m in SCRIPT_RE.finditer(s)]
    return spans


def _which(spans, pos):
    import bisect
    starts = [a for a, _ in spans]
    k = bisect.bisect_right(starts, pos) - 1
    if k >= 0 and pos < spans[k][1]:
        return k + 1
    return 0


def _allowed_scripts(locations):
    nums = {int(n) + 1 for n in re.findall(r'腳本(\d+)', locations)}
    outside = bool(re.search(r'內嵌CSS|靜態HTML', locations))
    return nums, outside


def _escape(new, p, q):
    if p == "'":
        return new.replace('\\', '\\\\').replace("'", "\\'")
    if p == '"':
        return new.replace('\\', '\\\\').replace('"', '\\"')
    if p == '`' or q == '`' or q == '$':
        # backticks inside a ${...} placeholder belong to the code and stay; only literal text is escaped
        out, i, n = [], 0, len(new)
        while i < n:
            if new.startswith('${', i):
                depth, j = 0, i + 1
                while j < n:
                    if new[j] == '{':
                        depth += 1
                    elif new[j] == '}':
                        depth -= 1
                        if depth == 0:
                            break
                    j += 1
                out.append(new[i:j + 1]); i = j + 1
            else:
                out.append('\\`' if new[i] == '`' else new[i]); i += 1
        return ''.join(out)
    return new


def apply(s, ctx):
    rows = _load(ctx, 'rewrite_audit.csv')
    over = {r['id']: r for r in _load(ctx, 'overrides.csv')}
    report, edits = [], []
    spans = _script_index(s)
    for r in rows:
        rid, o, new = r['id'], r['original'], r['new_text']
        ov = over.get(rid)
        if ov and ov['action'] == 'skip':
            report.append((rid, 'override', 0, ov.get('reason', ''))); continue
        if ov and ov['action'] == 'edit':
            new = ov['text']
        if len(o) <= 3 and rid not in ALLOW_SHORT:
            report.append((rid, 'short', 0, '')); continue
        if _placeholders(o) != _placeholders(new):
            report.append((rid, 'placeholder', 0, '')); continue
        nums, outside = _allowed_scripts(r.get('locations', ''))
        cand = [x for x in _scan(s, o) if (_which(spans, x[0]) in nums) or (_which(spans, x[0]) == 0 and outside)]
        if not cand:
            report.append((rid, 'notfound', 0, '')); continue
        good, why = [], ''
        for (i, j, p, q) in cand:
            before = s[max(0, i - 24):i - 1]
            if COMPARE_BEFORE.search(before):
                why = 'compare'; continue
            after2 = s[j + 1:j + 3] if q in '\'"' else ''
            if p in '\'"' and after2.startswith(':') and re.search(r'[{,]\s*$', before):
                why = 'key'; continue
            if p == '>' and re.search(r'[&<>]', re.sub(r'\$\{[^}]*\}', '', new)):
                why = 'unsafe'; continue
            good.append((i, j, p, q))
        if not good:
            report.append((rid, why or 'notfound', 0, '')); continue
        if len(good) != len(cand):
            report.append((rid, 'partial', 0, f'{len(cand) - len(good)} of {len(cand)} occurrences look like code ({why})')); continue
        for (i, j, p, q) in good:
            edits.append((i, j, _escape(new, p, q), rid))
        report.append((rid, 'applied', len(good), ''))
    # A whole-template row and a row for a quoted piece inside its ${...} overlap. The outer row keeps its ${...} code
    # verbatim (the placeholder check above), so the inner piece would stay in the old wording. Fold the inner rewrite
    # into the outer replacement text (the piece must appear there exactly once), otherwise report it as unresolved.
    edits.sort(key=lambda e: (e[0], -(e[1] - e[0])))
    kept, folded, unresolved = [], set(), set()
    for e in edits:
        if kept and e[0] < kept[-1][1]:
            if e[1] <= kept[-1][1]:
                piece = s[e[0]:e[1]]
                outer = kept[-1]
                if outer[2].count(piece) == 1:
                    kept[-1] = (outer[0], outer[1], outer[2].replace(piece, e[2]), outer[3])
                    folded.add(e[3])
                else:
                    unresolved.add(e[3])
                continue
            raise ValueError(f'partially overlapping copy edits {kept[-1][3]} / {e[3]}')
        kept.append(e)
    edits = kept
    for k, r in enumerate(report):
        if r[1] == 'applied' and r[0] in unresolved and r[0] not in folded:
            report[k] = (r[0], 'nested', 0, 'could not be folded into the enclosing literal')
        elif r[1] == 'applied' and r[0] in folded:
            report[k] = (r[0], 'applied', r[2], 'folded into an enclosing literal')
    out, last = [], 0
    for i, j, t, rid in edits:
        out.append(s[last:i]); out.append(t); last = j
    out.append(s[last:])
    s2 = ''.join(out)
    _check_scripts(s2)
    ctx.copy_report = report
    ctx.evidence['p90'] = {'rows': len(rows), 'applied_rows': sum(1 for r in report if r[1] == 'applied'),
                           'edits': len(edits),
                           'skipped': {k: sum(1 for r in report if r[1] == k) for k in sorted({r[1] for r in report if r[1] != 'applied'})}}
    return s2


NODE_CHECK = r"""
const fs=require('fs'),vm=require('vm');
const s=fs.readFileSync(process.argv[2],'utf8');
const re=/<script\b([^>]*)>([\s\S]*?)<\/script>/g;let m,i=0,bad=[];
while((m=re.exec(s))){i++;if(/\bsrc=/.test(m[1])||/type=["'](?!text\/javascript|module)/.test(m[1]))continue;
 try{new vm.Script(m[2],{filename:'script'+i});}catch(e){bad.push(i+': '+e.message);}}
console.log(JSON.stringify({scripts:i,bad}));
"""


def _check_scripts(s):
    with tempfile.TemporaryDirectory() as td:
        h = Path(td) / 'a.html'
        j = Path(td) / 'c.cjs'
        h.write_text(s, encoding='utf-8')
        j.write_text(NODE_CHECK)
        p = subprocess.run(['node', str(j), str(h)], capture_output=True, text=True)
        res = json.loads(p.stdout or '{"bad":["node failed: ' + p.stderr[:200] + '"]}')
        if res['bad']:
            raise ValueError('copy pass broke inline script(s): ' + '; '.join(res['bad'][:5]))


def extra_files(ctx):
    buf = io.StringIO()
    w = csv.writer(buf)
    w.writerow(['id', 'status', 'occurrences', 'note'])
    w.writerows(getattr(ctx, 'copy_report', []))
    return {'r35_evidence/copy_applied.csv': buf.getvalue()}
