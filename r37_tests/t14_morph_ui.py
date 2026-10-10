"""R3.11 t14 - word-form labels, same-family fold and "already learned" on the dictation step-2 cards (#range-new).

    WQ33_APP=<app/index.html> python3 r37_tests/t14_morph_ui.py            # shots: $T14_SHOTS or /tmp/t14_shots

Pasted list "1. book / 2. books / 3. ran / 4. quickly / 5. colour / 6. glasses / 7. glass" at 390x844 and 1440x900:
  - labels: ran -> run 的過去式, quickly -> 來自 quick, colour -> 英式串法 color, books -> 同字根 book (un-selected, visible, can be added back)
  - glass / glasses (two dictionary entries) are both selected and carry no label
  - a hand choice wins; 全選 does not sweep a same-family card in
  - labels stay on one line inside the card, cards stay inside the grid, no sideways scroll, no console error
  - second round on an account that already saved book + run: book / books / ran show 已學過 and are not pre-selected, a tap adds them
"""
import os
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import lib37 as L  # noqa: E402

C = L.Checker('t14 morph ui')
SHOTS = Path(os.environ.get('T14_SHOTS', '/tmp/t14_shots'))
SHOTS.mkdir(parents=True, exist_ok=True)
PASTE = '1. book\n2. books\n3. ran\n4. quickly\n5. colour\n6. glasses\n7. glass'
FIRST = '1. book\n2. run'

CARDS = """()=>{const out={};document.querySelectorAll('#word-editor .s50-grid .v20-candidate').forEach(a=>{
  const en=a.querySelector('strong').textContent,t=a.querySelector('.s56-tag'),r=a.getBoundingClientRect(),g=a.parentElement.getBoundingClientRect();
  let tr=null;if(t){const q=t.getBoundingClientRect();tr={l:q.left,r:q.right,t:q.top,b:q.bottom,h:q.height,sw:t.scrollWidth,cw:t.clientWidth};}
  out[en]={sel:a.classList.contains('is-selected'),tag:t?t.textContent:'',kind:a.dataset.s56||'',
    box:{l:r.left,r:r.right,t:r.top,b:r.bottom,w:r.width,h:r.height},grid:{l:g.left,r:g.right},tagBox:tr,
    aria:a.querySelector('[data-imp=toggle]').getAttribute('aria-label')};});return out;}"""


def boot(pg):
    L.register(pg)
    pg.wait_for_function('typeof window.__r37==="function"', timeout=15000)


def go_new(pg):
    L.go(pg, '#range-new', 900)
    if pg.query_selector('#v20-parent-password') or pg.query_selector('#v23-parent-password'):
        L.wq33.unlock_parent(pg)
    pg.wait_for_timeout(500)


def step(pg):
    return pg.evaluate("()=>document.querySelector('#import-v20')?.dataset.p40Step||''")


def wait_step(pg, n, ms=8000):
    try:
        pg.wait_for_function("(n)=>document.querySelector('#import-v20')?.dataset.p40Step===String(n)", arg=str(n), timeout=ms)
        return True
    except Exception:
        return False


def paste_parse(pg, text):
    if not pg.evaluate("()=>document.querySelector('#v20-text-details')?.open"):
        pg.click('#v20-text-details>summary')
        pg.wait_for_timeout(150)
    pg.fill('#raw-words', text)
    pg.click('[data-imp="parse"]')
    ok = wait_step(pg, 2)
    pg.wait_for_timeout(350)
    return ok


def cards(pg):
    return pg.evaluate(CARDS)


def tap(pg, en):
    pg.click(f'.s50-grid .v20-candidate:has(strong:text-is("{en}")) [data-imp="toggle"]')
    pg.wait_for_timeout(200)


def selected(pg):
    return sorted(x.lower() for x in L.ev(pg, "v20Selected().map(c=>c.en)"))


def geometry_checks(pg, tag, w):
    m = cards(pg)
    bad = [k for k, v in m.items() if v['box']['l'] < v['grid']['l'] - 1 or v['box']['r'] > v['grid']['r'] + 1 or v['box']['r'] > w + 1]
    C.ok(not bad, f'{tag}: every card sits inside the grid / viewport {bad}')
    bad = [k for k, v in m.items() if v['tagBox'] and (v['tagBox']['r'] > v['box']['r'] + 1 or v['tagBox']['l'] < v['box']['l'] - 1
                                                         or v['tagBox']['b'] > v['box']['b'] + 1)]
    C.ok(not bad, f'{tag}: every label sits inside its card {bad}')
    bad = [(k, v['tagBox']['h']) for k, v in m.items() if v['tagBox'] and v['tagBox']['h'] > 18]
    C.ok(not bad, f'{tag}: every label is one line (<=18px high) {bad}')
    bad = [(k, v['tagBox']['sw'], v['tagBox']['cw']) for k, v in m.items() if v['tagBox'] and v['tagBox']['sw'] > v['tagBox']['cw'] + 1]
    C.ok(not bad, f'{tag}: no label needs an ellipsis in these examples {bad}')
    per_row = pg.evaluate("""()=>{const t=[...document.querySelectorAll('#word-editor .s50-grid .v20-candidate')].map(a=>Math.round(a.getBoundingClientRect().top));
      return t.length?t.filter(x=>x===t[0]).length:0}""")
    C.ok(per_row >= (3 if w < 500 else 5) or len(m) < (3 if w < 500 else 5), f'{tag}: cards per row {per_row}')
    ov = pg.evaluate("()=>document.documentElement.scrollWidth-innerWidth")
    C.ok(ov <= 1, f'{tag}: no sideways scroll ({ov})')
    # card heights in one row stay equal-ish (a label must not make one card jump out)
    hs = sorted({round(v['box']['h']) for v in m.values()})
    C.ok(hs[-1] - hs[0] <= 24, f'{tag}: card heights {hs}')


def round_fresh(p, w, h, touch, tag):
    b, ctx, pg, errs = L.open_page(p, w, h, touch)
    boot(pg)
    go_new(pg)
    C.ok(paste_parse(pg, PASTE), f'{tag}: pasted list opens step 2')
    m = cards(pg)
    pg.screenshot(path=str(SHOTS / f'{w}_fresh_step2.png'))
    C.ok(set(m) >= {'book', 'books', 'ran', 'quickly', 'colour', 'glasses', 'glass'}, f'{tag}: all seven words are visible cards {sorted(m)}')
    C.ok(m['book']['sel'] and m['book']['tag'] == '',
         f'{tag}: book selected, no label, although the sample range holds a book ({m["book"]["sel"]}, {m["book"]["tag"]!r})')
    C.ok(not m['books']['sel'] and m['books']['tag'] == '同字根 book' and m['books']['kind'] == 'root',
         f'{tag}: books is visible, not selected, labelled 同字根 book ({m["books"]["sel"]}, {m["books"]["tag"]!r})')
    C.ok(m['ran']['sel'] and m['ran']['tag'] == 'run 的過去式', f'{tag}: ran -> {m["ran"]["tag"]!r}')
    C.ok(m['quickly']['sel'] and m['quickly']['tag'] == '來自 quick' and m['quickly']['kind'] == 'derived', f'{tag}: quickly -> {m["quickly"]["tag"]!r}')
    C.ok(m['colour']['sel'] and m['colour']['tag'] == '', f'{tag}: colour is a dictionary entry itself: selected, no label ({m["colour"]["tag"]!r})')
    C.ok(m['glasses']['sel'] and m['glass']['sel'] and m['glasses']['tag'] == '' and m['glass']['tag'] == '',
         f'{tag}: glass / glasses (two dictionary entries) stay separate and unlabelled ({m["glasses"]["tag"]!r}, {m["glass"]["tag"]!r})')
    C.ok('同字根' in m['books']['aria'] and 'run 的過去式' in m['ran']['aria'], f'{tag}: the label is part of the button name ({m["ran"]["aria"]})')
    sel = selected(pg)
    C.ok('books' not in sel and 'book' in sel and len(sel) == 6, f'{tag}: six selected, books not among them {sel}')
    msg = pg.inner_text('#v20-message')
    C.ok('同字根 1 個' in msg and '未選' in msg, f'{tag}: the message says what was left out ({msg!r})')
    geometry_checks(pg, tag, w)

    # one tap adds the same-family card back; a second tap removes it again
    tap(pg, 'books')
    C.ok('books' in selected(pg) and 'book' in selected(pg), f'{tag}: tapping books adds it back (book stays) {selected(pg)}')
    C.ok(cards(pg)['books']['sel'], f'{tag}: the books card shows as selected')
    # a hand choice wins: switching the length filter must not take books away again
    pg.click('.s50-seg button:has-text("4+")')
    pg.wait_for_timeout(250)
    pg.click('.s50-seg button:has-text("3+")')
    pg.wait_for_timeout(250)
    C.ok('books' in selected(pg), f'{tag}: the hand-selected books survives a filter change {selected(pg)}')
    pg.screenshot(path=str(SHOTS / f'{w}_fresh_books_added.png'))
    tap(pg, 'books')
    C.ok('books' not in selected(pg), f'{tag}: a second tap takes books out again')
    # 全不選 then 全選: one card per family, books stays out
    pg.click('[data-s50="none"]')
    pg.wait_for_timeout(200)
    C.ok(selected(pg) == [], f'{tag}: 全不選 clears everything')
    pg.click('[data-s50="all"]')
    pg.wait_for_timeout(250)
    sel = selected(pg)
    C.ok('book' in sel and 'books' not in sel and len(sel) == 6, f'{tag}: 全選 keeps one card per family {sel}')
    # taking away the kept card by hand does not make the other one jump in
    tap(pg, 'book')
    C.ok('book' not in selected(pg) and 'books' not in selected(pg), f'{tag}: unticking book does not tick books for the parent {selected(pg)}')
    tap(pg, 'books')
    C.ok('books' in selected(pg) and 'book' not in selected(pg), f'{tag}: the parent can pick books instead of book {selected(pg)}')
    m = cards(pg)
    C.ok(m['book']['tag'] == '' and m['books']['tag'] == '同字根 book' and m['books']['sel'],
         f'{tag}: the family label stays on the later card ({m["book"]["tag"]!r}, {m["books"]["tag"]!r})')
    tap(pg, 'book')
    C.ok({'book', 'books'} <= set(selected(pg)), f'{tag}: both hand-picked cards stay selected {selected(pg)}')
    geometry_checks(pg, tag + '/after taps', w)
    # R3.12: 儲存 stores exactly the picked words (no step 3 any more)
    picked = sorted(selected(pg))
    C.ok(f'儲存 {len(picked)} 個字' in pg.inner_text('#v20-confirm-next'), f'{tag}: the button names the count ({pg.inner_text("#v20-confirm-next")!r})')
    pg.click('#v20-confirm-next')
    pg.wait_for_selector('#s50-saved', timeout=8000)
    saved = sorted(L.ev(pg, "rangeWords(latestRange().id).map(x=>x.en).join('|')").split('|'))
    C.ok(saved == picked and 'books' in saved and 'book' in saved, f'{tag}: the saved range holds the picked words {saved}')
    C.ok(not errs, f'{tag}: no console / page errors {errs[:2]}')
    b.close()


FORMS = 'color\nfavorite\nhappier\nice-cream\nchildren\ncolours\nteacher\nunhappy'


def round_forms(p, w, h, touch, tag):
    """other labels on a clean account: British / American side, comparative, other spelling; headwords stay unlabelled"""
    b, ctx, pg, errs = L.open_page(p, w, h, touch)
    boot(pg)
    go_new(pg)
    C.ok(paste_parse(pg, FORMS), f'{tag}: pasted forms open step 2')
    m = cards(pg)
    pg.screenshot(path=str(SHOTS / f'{w}_forms_step2.png'))
    want = {'color': '美式串法 colour', 'favorite': '美式 favourite', 'happier': 'happy 的比較級', 'children': '', 'teacher': ''}
    for k, v in want.items():
        C.ok(k in m and m[k]['tag'] == v, f'{tag}: {k} -> {m.get(k, {}).get("tag")!r} (want {v!r})')
    C.ok('ice-cream' in m and m['ice-cream']['tag'] == '寫法 ice cream',
         f'{tag}: ice-cream -> {m.get("ice-cream", {}).get("tag")!r}')
    C.ok(m['colours']['tag'] == '同字根 color', f'{tag}: colours (colour = color family) -> {m["colours"]["tag"]!r}')
    C.ok(m['unhappy']['tag'] == '來自 happy', f'{tag}: unhappy -> {m["unhappy"]["tag"]!r}')
    C.ok(all(v['sel'] for k, v in m.items() if k != 'colours'), f'{tag}: the forms are pre-selected (only one card per family is) {[k for k, v in m.items() if not v["sel"]]}')
    C.ok(not m['colours']['sel'] and m['colours']['kind'] == 'root', f'{tag}: colours is visible but not pre-selected {m["colours"]["sel"]}')
    # box check; a long label may be cut, it must still sit inside its card
    bad = [k for k, v in m.items() if v['tagBox'] and (v['tagBox']['r'] > v['box']['r'] + 1 or v['tagBox']['h'] > 18)]
    C.ok(not bad, f'{tag}: labels stay inside their card on one line {bad}')
    C.ok(pg.evaluate("()=>document.documentElement.scrollWidth-innerWidth") <= 1, f'{tag}: no sideways scroll')
    C.ok(not errs, f'{tag}: no console / page errors {errs[:2]}')
    b.close()


def import_once(pg, text):
    go_new(pg)
    ok = paste_parse(pg, text)
    pg.click('#v20-confirm-next')
    pg.wait_for_selector('#s50-saved', timeout=8000)
    pg.click('[data-s50="again"]')      # R3.12: the saved card stays on the page until 再上傳
    pg.wait_for_timeout(300)
    return ok


def round_learned(p, w, h, touch, tag):
    b, ctx, pg, errs = L.open_page(p, w, h, touch)
    boot(pg)
    C.ok(import_once(pg, FIRST), f'{tag}: first range (book, run) pasted')
    saved = L.ev(pg, "rangeWords(latestRange().id).map(x=>x.en).join('|')")
    C.ok(saved == 'book|run', f'{tag}: the account now holds book and run in a saved range ({saved})')
    go_new(pg)
    C.ok(paste_parse(pg, PASTE), f'{tag}: second paste opens step 2')
    m = cards(pg)
    pg.screenshot(path=str(SHOTS / f'{w}_learned_step2.png'))
    C.ok(not m['book']['sel'] and m['book']['tag'] == '已學過 book' and m['book']['kind'] == 'learned',
         f'{tag}: book -> {m["book"]["tag"]!r}, not selected ({m["book"]["sel"]})')
    C.ok(not m['books']['sel'] and m['books']['tag'] == '已學過 book', f'{tag}: books -> {m["books"]["tag"]!r}, not selected')
    C.ok(not m['ran']['sel'] and m['ran']['tag'] == '已學過 run', f'{tag}: ran -> {m["ran"]["tag"]!r}, not selected (run is saved)')
    C.ok(m['quickly']['sel'] and m['quickly']['tag'] == '來自 quick', f'{tag}: unrelated words keep their own label ({m["quickly"]["tag"]!r})')
    C.ok(m['colour']['sel'] and m['glass']['sel'] and m['glasses']['sel'], f'{tag}: new words are still pre-selected')
    sel = selected(pg)
    C.ok(sel == ['colour', 'glass', 'glasses', 'quickly'], f'{tag}: pre-selection = the new words only {sel}')
    msg = pg.inner_text('#v20-message')
    C.ok('已學過 3 個' in msg and '未選' in msg, f'{tag}: the message mentions the learned ones ({msg!r})')
    geometry_checks(pg, tag, w)
    # manual choice on a learned word wins and keeps its label
    tap(pg, 'book')
    m = cards(pg)
    C.ok(m['book']['sel'] and m['book']['tag'] == '已學過 book', f'{tag}: tapping book selects it, label stays ({m["book"]["tag"]!r})')
    pg.click('.s50-seg button:has-text("不限")')
    pg.wait_for_timeout(250)
    pg.click('.s50-seg button:has-text("3+")')
    pg.wait_for_timeout(250)
    C.ok('book' in selected(pg), f'{tag}: the hand-selected learned word survives a filter change')
    # 全選 picks the learned ones too (the parent asked for all) but still only one of book / books
    pg.click('[data-s50="all"]')
    pg.wait_for_timeout(250)
    sel = selected(pg)
    C.ok({'ran', 'book', 'colour', 'glass', 'glasses', 'quickly'} <= set(sel) and 'books' not in sel, f'{tag}: 全選 -> {sel}')
    pg.screenshot(path=str(SHOTS / f'{w}_learned_all.png'))
    C.ok(not errs, f'{tag}: no console / page errors {errs[:2]}')
    b.close()


def main():
    with L.sync_playwright() as p:
        for w, h, touch, tag in ((390, 844, True, 'phone'), (1440, 900, False, 'desktop')):
            print('--', tag, 'fresh', flush=True)
            round_fresh(p, w, h, touch, 'fresh/' + tag)
            print('--', tag, 'learned', flush=True)
            round_learned(p, w, h, touch, 'learned/' + tag)
            print('--', tag, 'forms', flush=True)
            round_forms(p, w, h, touch, 'forms/' + tag)
    C.done()


if __name__ == '__main__':
    main()
