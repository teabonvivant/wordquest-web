#!/usr/bin/env python3
"""Side probes on the frozen build (run after run_eval.py; results -> probe_results.json).

 1. 合併字詞 on a split phrase ("a car park"): can the parent reach the first word, and what card comes out?
 2. A phrase typed with 1 per line vs several per line (known vs unknown phrase) - how the list mode splits.
 3. Tap-target check on pending cards at 390 and 1440 (is the card centre the 核對 button?).
"""
import json
import os
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]
sys.path.insert(0, str(ROOT / 'r37_tests'))
sys.path.insert(0, str(ROOT / 'r35_tests'))
sys.path.insert(0, str(HERE))
if not os.environ.get('WQ33_APP'):
    sys.exit('WQ33_APP required')
import lib37 as L  # noqa: E402
import run_eval as R  # noqa: E402  (page / OCR-stub plumbing shared with the main harness; no t12 dependency)


class T:
    open_page = staticmethod(R.open_page)
    boot = staticmethod(R.boot)
    go_new = staticmethod(R.go_new)
    wait_step = staticmethod(R.wait_step)

    @staticmethod
    def open_text(pg):
        if not pg.evaluate("()=>document.querySelector('#v20-text-details')?.open"):
            pg.click('#v20-text-details>summary')
            pg.wait_for_timeout(150)

OUT = {}


def cards(pg):
    return pg.evaluate("""()=>[...document.querySelectorAll('#word-editor .v20-candidate')].map(a=>({en:a.querySelector('strong').textContent,
        sel:a.classList.contains('is-selected'),review:a.classList.contains('is-review')}))""")


def paste(pg, text):
    L.ev(pg, "clearImportDraft();render();")
    T.go_new(pg)
    T.open_text(pg)
    pg.fill('#raw-words', text)
    pg.click('[data-imp="parse"]')
    T.wait_step(pg, 2, 8000)
    pg.wait_for_timeout(300)


with L.sync_playwright() as p:
    b, ctx, pg, errs = T.open_page(p, 390, 844, True)
    T.boot(pg)
    T.go_new(pg)

    # ---- 1. merge "a car park"
    paste(pg, "1. a car park\n2. a bus terminal\n3. traffic lights\n4. a footbridge")
    r = {'before': cards(pg), 'skipped_chips': pg.evaluate("()=>[...document.querySelectorAll('.s50-chip')].map(b=>b.textContent.replace('＋','').trim())")}
    # 更多 -> 合併字詞
    pg.click('.s50-more summary')
    pg.click('.s50-menu [data-imp="merge-mode"]')
    pg.wait_for_timeout(150)
    r['merge_note'] = pg.evaluate("()=>(document.querySelector('.s50-note')||{}).textContent||''")
    # first word of "a car park" is "a" -> is there a card for it?
    r['card_a_visible'] = pg.evaluate("()=>[...document.querySelectorAll('#word-editor .v20-candidate strong')].map(e=>e.textContent).includes('a')")
    # merge "car" .. "park" (the only reachable pair) and see what the card is
    try:
        pg.click('.v20-candidate:has(strong:text-is("car")) [data-imp="toggle"]', timeout=3000, position={'x': 16, 'y': 10})
        pg.click('.v20-candidate:has(strong:text-is("park")) [data-imp="toggle"]', timeout=3000, position={'x': 16, 'y': 10})
        pg.wait_for_timeout(200)
        r['after_merge_car_park'] = cards(pg)
    except Exception as e:  # noqa: BLE001
        r['merge_error'] = str(e)[:200]
    OUT['merge_a_car_park'] = r

    # ---- 2. phrase handling in list mode
    for k, txt in {'single_phrase_per_line_unknown': "a car park\na taxi rank\na footbridge",
                   'comma_list': "a car park, a taxi rank, a footbridge",
                   'known_phrases': "ice cream\nschool bag\nlook after\nlisten to\nhave a bath\nfire station",
                   'unknown_phrases': "cook a meal\nhang the washing\nvacuum the rug\nwalk the dog\nmake candles"}.items():
        paste(pg, txt)
        OUT['phrase_' + k] = cards(pg)

    # ---- 2b. English + Chinese rows in different glue styles
    zh_rows = [('towel', '毛巾'), ('bucket', '水桶'), ('swimming suit', '泳衣'), ('sunbathe', '曬日光浴')]
    variants = {
        'numbered_glued_1.towel': '\n'.join('%d.%s %s' % (i + 1, a, b) for i, (a, b) in enumerate(zh_rows)),
        'numbered_spaced_1._towel': '\n'.join('%d. %s %s' % (i + 1, a, b) for i, (a, b) in enumerate(zh_rows)),
        'plain_space': '\n'.join('%s %s' % (a, b) for a, b in zh_rows),
        'pipe': '\n'.join('%s | %s' % (a, b) for a, b in zh_rows),
        'tab': '\n'.join('%s\t%s' % (a, b) for a, b in zh_rows),
    }
    DUMP = "JSON.stringify(v20.items.map(c=>({en:c.en,zh:c.zh,kind:c.kind,sel:c.selected,pend:!!V20.pending(c)})))"
    for k, txt in variants.items():
        paste(pg, txt)
        OUT['zh_' + k] = json.loads(L.ev(pg, DUMP))

    # ---- 2c. accept the glued-Chinese list as is (review what blocks) and look at what is stored
    paste(pg, variants['numbered_glued_1.towel'])
    for _ in range(12):
        btn = pg.query_selector('.v20-candidate.is-review [data-imp="edit"]')
        if not btn:
            break
        btn.click()
        pg.wait_for_selector('#v20-item-checked')
        pg.check('#v20-item-checked')
        pg.click('[data-imp="save-edit"]')
        pg.wait_for_timeout(150)
        if pg.query_selector('#v20-edit-error .v20-error'):
            OUT['zh_glued_review_error'] = pg.inner_text('#v20-edit-error')
            pg.evaluate("()=>document.querySelectorAll('dialog[open]').forEach(d=>d.close())")
            break
    OUT['zh_glued_pending_left'] = pg.evaluate("()=>document.querySelectorAll('.v20-candidate.is-review').length")
    pg.click('#v20-confirm-next')
    pg.wait_for_timeout(400)
    if pg.query_selector('#confirm-import:not([disabled])'):
        pg.check('#confirm-import')
        pg.click('#v20-save-range')
        pg.wait_for_timeout(1200)
        OUT['zh_glued_saved'] = json.loads(L.ev(pg, "(()=>{const r=latestRange();return r?JSON.stringify(rangeWords(r.id).map(w=>[w.en,w.zh])):'[]'})()"))
    else:
        OUT['zh_glued_saved'] = 'save disabled'

    # ---- 3. same words, unknown-to-bank: how many need review
    paste(pg, "softly\npatiently\npolitely\nrudely\nquietly\nloudly\nimpatiently\nearly\nlate\nnoisily")
    OUT['adverbs'] = cards(pg)
    b.close()

(HERE / 'probe_results.json').write_text(json.dumps(OUT, ensure_ascii=False, indent=1))
print(json.dumps(OUT, ensure_ascii=False, indent=1)[:6000])
