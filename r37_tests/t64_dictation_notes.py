"""R3.36 t64 - the teacher's notes on a dictation sheet are not words to learn.

    WQ33_APP=<app/index.html> python3 r37_tests/t64_dictation_notes.py      T64_INPUTS=paste,photo   T64_ONLY=91,94

Ten short sheets (t64_notes_cases.json): Chinese and English instructions ("請溫習以下生字", "The following words will be
dictated.", "Parent's signature"), "只需認讀，不用默寫" / "Reading only (no need to dictate):" above or below a block, an inline
"(不用默)", "Part A 生字" headings, and traps that must stay items (revise 溫習, below 在下面, "the words will be tested tomorrow"
inside a sentence).  Each is pasted and photographed (synthetic photo, native tesseract eng+chi_tra), then per sheet:
  sel  - selected by default; off - kept but not selected; nothing else selected except words of the listed sentences;
  zh   - the teacher's Chinese (paste only: a photo's Chinese gives way to the dictionary), with the note taken out."""
import json
import os
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
R = HERE.parent
EVAL = R / 'r37_eval' / 'dictation50'
os.environ.setdefault('WQ33_APP', str(R / 'app' / 'index.html'))
os.environ.setdefault('EVAL_WORK', '/tmp/t64_work')
Path(os.environ['EVAL_WORK']).mkdir(parents=True, exist_ok=True)
sys.path[:0] = [str(HERE), str(R / 'r35_tests'), str(EVAL)]
import lib37 as L  # noqa: E402
import run_eval as E  # noqa: E402
from playwright.sync_api import sync_playwright  # noqa: E402

C = L.Checker('t64 dictation notes')
CASES = json.loads((HERE / 't64_notes_cases.json').read_text())
INPUTS = [x for x in os.environ.get('T64_INPUTS', 'paste,photo').split(',') if x]
ONLY = [x for x in os.environ.get('T64_ONLY', '').split(',') if x]
norm = lambda s: re.sub(r'\s+', ' ', s.strip().lower().rstrip('.'))  # noqa: E731

with sync_playwright() as p:
    for S0 in CASES:
        if ONLY and S0['id'][:2] not in ONLY:
            continue
        for inp in INPUTS:
            S = dict(S0, raw_text=S0['text'], photo_text=S0['text'])
            d = E.prelude(p, S, inp, (390, 844))
            items = E.snap(d['pg'])['items']
            tag = f"{S0['id']} {inp}"
            C.ok(d['ok'], f'{tag}: reached step 2')
            sel = {norm(c['en']) for c in items if c['sel']}
            sents = [norm(x) for x in S0.get('sentences', [])]
            known = S0.get('photo_known', {}) if inp == 'photo' else {}
            for w in S0['sel']:
                if w in known and norm(w) not in sel:
                    print(f'  WARN {tag}: "{w}" not whole - {known[w]}')
                    continue
                C.ok(norm(w) in sel, f'{tag}: "{w}" selected')
            for w in S0.get('off', []):
                hit = [c for c in items if norm(c['en']) == norm(w) or norm(w) in norm(c['en'])]
                C.ok(not any(c['sel'] for c in hit), f'{tag}: "{w}" not selected')
            allowed = {norm(w) for w in S0['sel']} | set(sents) | {norm(p) for w in known for p in w.split()}
            extra = sorted(w for w in sel if w not in allowed and not any(w in x for x in sents))
            C.ok(not extra, f'{tag}: nothing else selected {extra}')
            if inp == 'paste':
                for w, z in S0.get('zh', {}).items():
                    c = [c for c in items if norm(c['en']) == norm(w)]
                    C.ok(bool(c) and c[0]['zh'] == z, f'{tag}: "{w}" keeps the teacher\'s Chinese {z}')
                for c in [c for c in items if c['sel']]:
                    C.ok(not re.search(r'默|認讀', c['zh']), f'{tag}: the note is not part of the meaning of "{c["en"]}" ({c["zh"]})')
            errs = [e for e in d['errs'] if 'ERR_FILE_NOT_FOUND' not in e]   # a copy of the app outside app/ has no assets beside it
            C.ok(not errs, f'{tag}: no page errors {errs[:2]}')
            d['b'].close()
C.done()
