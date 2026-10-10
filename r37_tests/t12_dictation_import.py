"""R3.10 t12 - dictation upload (#range-new): word-length filter, basic-word switch, auto recognise, fixed action bar, save.

    WQ33_APP=<app/index.html> python3 r37_tests/t12_dictation_import.py

Two inputs are exercised: the photo sheet (real native tesseract behind the OCR stub of r35_tests/p40_lib35) and pasted text.
The photo is built by r37_tests/t12_sheet.py (same layout as the director's sheet.png: the, on, in, an, I, The, ...)."""
import os
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import lib37 as L  # noqa: E402
import p40_lib35 as P  # noqa: E402  (OCR stub + native tesseract bridge)

C = L.Checker('t12 dictation import')
SHEET = Path(os.environ.get('T12_SHEET', '/tmp/t12_sheet.png'))
SHOTS = Path(os.environ.get('T12_SHOTS', '/tmp/t12_shots'))
SHOTS.mkdir(parents=True, exist_ok=True)

PASTE = 'in on an the The the pencil ruler school bag box desk apple'


def make_sheet():
    from PIL import Image, ImageDraw, ImageFont
    f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 34)
    im = Image.new('RGB', (1100, 900), 'white')
    d = ImageDraw.Draw(im)
    # R3.13: numbered cells of one or two words are list items (a phrase each); the in / on / an / the words that the filter tests
    # sit in sentences, as they do on a real sheet
    lines = ["Unit 3 Dictation  Date: 15/10/2026", "1. pencil  2. ruler  3. eraser", "4. school bag  5. favourite",
             "6. Put it in the box on the desk.", "8. I ate an apple on Wednesday.", "10. grandmother  11. I am happy.",
             "Sentence: The cat is on the mat."]
    for i, t in enumerate(lines):
        d.text((60, 60 + i * 110), t, fill='black', font=f)
    im.save(SHEET)


def open_page(p, w, h, touch):
    b, ctx, pg, errs = L.open_page(p, w, h, touch)
    pg.add_init_script(P.STUB)
    pg.expose_function('__ocr', P.native_ocr)
    return b, ctx, pg, errs


def boot(pg):
    L.register(pg)
    pg.wait_for_function('typeof window.__r37==="function"', timeout=15000)


def go_new(pg):
    L.go(pg, '#range-new', 900)
    if pg.query_selector('#v23-parent-password'):
        L.wq33.unlock_parent(pg)
    pg.wait_for_timeout(500)


def step(pg):
    return pg.evaluate("()=>document.querySelector('#import-v20')?.dataset.p40Step||''")


def wait_step(pg, n, ms=60000):
    try:
        pg.wait_for_function("(n)=>document.querySelector('#import-v20')?.dataset.p40Step===String(n)", arg=str(n), timeout=ms)
        return True
    except Exception:
        return False


def sel_map(pg):
    """{en: selected} for the items the parent can see as cards (not skipped, not duplicates)."""
    return pg.evaluate("""()=>{const m={};document.querySelectorAll('#word-editor .v20-candidate').forEach(a=>{
        const en=a.querySelector('strong').textContent;m[en]=a.classList.contains('is-selected');});return m;}""")


def skipped(pg):
    return pg.evaluate("()=>[...document.querySelectorAll('.s50-skipped .s50-chip')].map(b=>b.textContent.replace('＋','').trim())")


def open_skipped(pg):
    if not pg.evaluate("()=>document.querySelector('.s50-skipped')?.open"):
        pg.click('.s50-skipped>summary')
        pg.wait_for_timeout(150)


def pill(pg, label):
    pg.click(f'.s50-seg button:has-text("{label}")')
    pg.wait_for_timeout(200)


def open_text(pg):
    if not pg.evaluate("()=>document.querySelector('#v20-text-details')?.open"):
        pg.click('#v20-text-details>summary')
        pg.wait_for_timeout(150)


def fixed_bar_ok(pg, sel):
    """The bar is fully inside the viewport and above the bottom navigation, with the page scrolled to the top."""
    return L.fits(pg, sel)


def run_filter_checks(pg, tag):
    m = sel_map(pg)
    C.ok(m.get('pencil') and m.get('ruler') and m.get('school bag'), f'{tag}: pencil / ruler / school bag are selected by default {m}')
    C.ok(not any(k in m for k in ('in', 'on', 'an')), f'{tag}: in / on / an are not cards under 3+ {sorted(m)}')
    C.ok(pg.evaluate("()=>document.querySelector('.s50-seg [aria-pressed=true]').textContent") == '3+', f'{tag}: the default length is 3+')
    sk = skipped(pg)
    C.ok('in' in sk and 'on' in sk, f'{tag}: in / on sit in the skipped line {sk}')
    C.ok('the' in sk and 'The' not in sk and sk.count('the') == 1, f'{tag}: the (basic word) is skipped once, duplicates folded {sk}')
    C.ok(pg.query_selector('[data-imp="dedupe"]') is None and '合併相同項目' not in pg.inner_text('#word-editor'),
         f'{tag}: no 合併相同項目 notice is shown (duplicates are folded silently)')
    summ = pg.inner_text('.s50-skipped summary')
    C.ok(summ.strip().startswith('已略過') and '個' in summ, f'{tag}: the skipped line reads 已略過 N 個 ({summ.strip()[:30]})')
    sel = L.ev(pg, "v20Selected().map(c=>c.en).join('|')").split('|')
    C.ok(len(sel) == len(set(x.lower() for x in sel)), f'{tag}: no identical word is selected twice {sel}')
    C.ok(not any(x.lower() in ('in', 'on', 'an', 'the') for x in sel), f'{tag}: none of in/on/an/the is selected {sel}')

    # 不限: in/on come back as cards (the ones tesseract kept), selected
    pill(pg, '不限')
    m2 = sel_map(pg)
    C.ok(m2.get('in') is True and m2.get('on') is True, f'{tag}: 不限 -> in / on are cards and selected {m2}')
    C.ok(m2.get('the') is False or 'the' not in m2, f'{tag}: 不限 does not bring the back while the basic switch is on')
    # basic switch off -> the selected
    pg.click('.s50-sw')
    pg.wait_for_timeout(200)
    m3 = sel_map(pg)
    C.ok(m3.get('the') is True, f'{tag}: basic switch off -> the is a selected card {m3.get("the")}')
    C.ok(sum(1 for k in m3 if k.lower() == 'the') == 1, f'{tag}: the appears once even though it was written 2-3 times')
    pg.click('.s50-sw')
    pg.wait_for_timeout(200)
    # 5+: short words drop out, 5-letter ruler stays (5 letters >= 5), 3-letter box leaves the cards
    pill(pg, '5+')
    m5 = sel_map(pg)
    C.ok('box' not in m5 and 'desk' not in m5, f'{tag}: 5+ -> box / desk (3-4 letters) are skipped {sorted(m5)}')
    C.ok(m5.get('ruler') is True and m5.get('pencil') is True, f'{tag}: 5+ -> ruler (5 letters) and pencil stay selected')
    C.ok('box' in skipped(pg), f'{tag}: 5+ -> box is in the skipped line')
    # manual choices survive: bring back "box" by hand, then switch the filter around
    open_skipped(pg)
    pg.click('.s50-chip:has-text("box")')
    pg.wait_for_timeout(200)
    C.ok(sel_map(pg).get('box') is True, f'{tag}: a skipped word can be added back with one tap')
    pill(pg, '3+')
    pill(pg, '5+')
    C.ok(sel_map(pg).get('box') is True, f'{tag}: the hand-added box stays selected after switching 3+ / 5+')
    # a hand-deselected word stays off too
    pg.click('.v20-candidate:has(strong:text-is("pencil")) [data-imp="toggle"]')
    pg.wait_for_timeout(150)
    pill(pg, '不限')
    pill(pg, '3+')
    C.ok(sel_map(pg).get('pencil') is False, f'{tag}: a word the parent switched off stays off after changing the filter')
    pg.click('.v20-candidate:has(strong:text-is("pencil")) [data-imp="toggle"]')
    pg.wait_for_timeout(150)
    # 不限 then in: manual in
    pill(pg, '3+')
    open_skipped(pg)
    pg.click('.s50-chip:has-text("in")')
    pg.wait_for_timeout(200)
    C.ok(sel_map(pg).get('in') is True, f'{tag}: in added back by hand')
    pill(pg, '5+')
    pill(pg, '3+')
    C.ok(sel_map(pg).get('in') is True, f'{tag}: the hand-selected in survives the filter changes')


def flow_photo(p, w, h, touch, tag):
    b, ctx, pg, errs = open_page(p, w, h, touch)
    boot(pg)
    go_new(pg)
    # step 1: camera button on the first screen, hero gone, paste area collapsed
    cam = pg.query_selector('[data-act="open-camera"]')
    C.ok(cam is not None and L.fits(pg, '[data-act="open-camera"]'), f'{tag}: the camera button is on the first screen')
    C.ok(L.fits(pg, '[data-act="open-upload"]'), f'{tag}: the upload button is on the first screen')
    vis = pg.evaluate("""()=>({h1:!!document.querySelector('#import-v20 h1')&&document.querySelector('#import-v20 h1').getClientRects().length>0,
        guide:[...document.querySelectorAll('#import-v20 .wq32-guide')].some(e=>e.getClientRects().length>0),
        psm:!!document.querySelector('#v20-psm')&&document.querySelector('#v20-psm').getClientRects().length>0,
        enh:!!document.querySelector('#v20-enhance')&&document.querySelector('#v20-enhance').getClientRects().length>0,
        modes:[...document.querySelectorAll('.v20-modes')].some(e=>e.getClientRects().length>0),
        text:false})""")
    vis['text'] = pg.is_visible('#raw-words')
    C.ok(not vis['h1'] and not vis['guide'], f'{tag}: hero title and tiger card are hidden on this page {vis}')
    C.ok(not vis['psm'] and not vis['enh'], f'{tag}: PSM select and enhance checkbox are not visible')
    C.ok(not vis['text'], f'{tag}: paste-text area starts collapsed')
    C.ok(not pg.is_visible('#range-title') and not pg.is_visible('#range-date'), f'{tag}: R3.12 step 1 shows no name / date fields (they sit on step 2)')
    tip = pg.inner_text('#p40-tips').strip()
    C.ok(0 < len(tip) <= 16 and pg.inner_text('#import-v20 .v20-source').count('。') <= 2, f'{tag}: step 1 keeps one short hint line ({tip!r})')
    C.ok(len(pg.query_selector_all('#p40-steps li')) == 2, f'{tag}: the step bar names two steps')
    C.ok(pg.evaluate("()=>document.querySelector('#run-ocr').getClientRects().length===0"), f'{tag}: no 辨認 button is offered before a photo is chosen')
    pg.screenshot(path=str(SHOTS / f'{w}_1_step1.png'))
    # choose the photo: recognition starts by itself and the check step opens by itself
    pg.set_input_files('#ocr-upload', str(SHEET))
    C.ok(wait_step(pg, 2), f'{tag}: choosing the photo goes to step 2 without pressing 辨認')
    pg.wait_for_timeout(400)
    C.ok(pg.evaluate("()=>window.__stubCalls&&window.__stubCalls.recognize>=1"), f'{tag}: the recognition engine ran once for the chosen photo')
    run_filter_checks(pg, tag)
    # the action bar and the length pills are on screen; tools and cards are reachable
    pg.evaluate("()=>{const b=document.querySelector('.r37-legbody');if(b)b.scrollTop=0}")
    C.ok(fixed_bar_ok(pg, '#v20-import-dock'), f'{tag}: the 儲存 bar is inside the viewport at the top')
    row = pg.evaluate("""()=>{const a=document.querySelector('#range-title').getBoundingClientRect(),b=document.querySelector('#range-date').getBoundingClientRect();return [Math.round(a.top),Math.round(b.top),Math.round(a.height)]}""")
    C.ok(abs(row[0] - row[1]) <= 2 and row[2] > 0, f'{tag}: R3.12 name and date share one small row on step 2 {row}')
    C.ok(pg.input_value('#range-date') != '' and pg.input_value('#range-title') != '', f'{tag}: name and date are filled in by themselves ({pg.input_value("#range-title")!r}, {pg.input_value("#range-date")!r})')
    pg.evaluate("()=>{const b=document.querySelector('.r37-legbody');if(b)b.scrollTop=b.scrollHeight}")
    pg.wait_for_timeout(100)
    C.ok(fixed_bar_ok(pg, '#v20-import-dock'), f'{tag}: the bar is still inside the viewport after scrolling to the bottom')
    pg.evaluate("()=>{const b=document.querySelector('.r37-legbody');if(b)b.scrollTop=0}")
    pg.screenshot(path=str(SHOTS / f'{w}_2_step2.png'))
    bar = pg.inner_text('#v20-import-dock')
    C.ok('儲存' in bar and '個字' in bar and '下一步' not in bar, f'{tag}: bar text {bar.replace(chr(10), " ")[:40]}')
    sizes = pg.evaluate("""()=>[...document.querySelectorAll('.s50-seg button,.s50-sw,#v20-confirm-next,.s50-tools .btn,.s50-more summary,.v20-candidate .v20-token,.v20-candidate [data-imp=edit],.s50-chip')]
        .filter(e=>e.getClientRects().length).map(e=>{const r=e.getBoundingClientRect();return [e.className||e.tagName,Math.round(r.height),Math.round(r.width)]}).filter(x=>x[1]<44)""")
    C.ok(not sizes, f'{tag}: every control is at least 44px high {sizes[:3]}')
    cols = pg.evaluate("""()=>{const t=[...document.querySelectorAll('.s50-grid .v20-candidate')].map(a=>Math.round(a.getBoundingClientRect().top));return t.filter(x=>x===t[0]).length}""")
    C.ok(cols >= (3 if w < 500 else 5), f'{tag}: cards per row {cols}')
    ov = pg.evaluate("()=>document.documentElement.scrollWidth-innerWidth")
    C.ok(ov <= 1, f'{tag}: no sideways scroll on step 2 ({ov})')
    # R3.12: no step 3, no tick. Items that still need a check do not stop the save (the old loop that opened each 核對 card is gone)
    n_pend = len(L.ev(pg, "v20Pending().map(c=>c.en)"))
    n_sel = len(L.ev(pg, "v20Selected().map(c=>c.en)"))
    C.ok(pg.query_selector('#confirm-import') is None and pg.query_selector('#v20-summary') is None, f'{tag}: no 我已對照原稿 tick and no summary page in the DOM')
    C.ok(not pg.is_disabled('#v20-confirm-next') and f'儲存 {n_sel} 個字' in pg.inner_text('#v20-confirm-next'),
         f'{tag}: 儲存 {n_sel} 個字 is live straight away ({pg.inner_text("#v20-confirm-next")!r}, {n_pend} flagged)')
    if n_pend:
        C.ok(pg.is_visible('#s50-review') and f'({n_pend})' in pg.inner_text('#s50-review'), f'{tag}: 逐個核對 ({n_pend}) sits next to 儲存')
    sel_names = L.ev(pg, "v20Selected().map(c=>c.en)")
    pg.click('#v20-confirm-next')
    pg.wait_for_selector('#s50-saved', timeout=8000)
    rid = L.ev(pg, "latestRange()&&latestRange().id")
    cnt = L.ev(pg, "(()=>{const r=latestRange();return r?rangeWords(r.id).length:-1})()")
    C.ok(rid and cnt == n_sel, f'{tag}: the saved range has {cnt} words = {n_sel} selected (one press)')
    C.ok(f'已儲存 {n_sel} 個字' in pg.inner_text('#s50-saved') and pg.is_visible('[data-s50="practice"]') and pg.is_visible('[data-s50="again"]'),
         f'{tag}: the small card says 已儲存 {n_sel} 個字 with 開始練習 / 再上傳')
    C.ok(L.fits(pg, '#s50-saved [data-s50="practice"]') and pg.evaluate("()=>document.documentElement.scrollWidth-innerWidth") <= 1, f'{tag}: the saved card fits without scrolling')
    pg.screenshot(path=str(SHOTS / f'{w}_3_saved.png'))
    en_saved = L.ev(pg, "rangeWords(latestRange().id).map(w=>w.en).join('|')").split('|')
    C.ok(sorted(en_saved) == sorted(sel_names), f'{tag}: saved words equal the selected cards')
    L.go(pg, '#ranges', 600)
    if pg.query_selector('#v23-parent-password'):
        L.wq33.unlock_parent(pg)
    names = L.ev(pg, "db.ranges.map(r=>r.title+':'+rangeWords(r.id).length).join(';')")
    C.ok(f':{n_sel}' in names, f'{tag}: the range list shows the new range with {n_sel} words ({names})')
    C.ok(not errs, f'{tag}: no console / page errors {errs[:2]}')
    b.close()


def flow_crop(p, w, h, touch, tag):
    """框選／拉直 stays as a secondary button; choosing 用這個範圍 recognises again by itself."""
    b, ctx, pg, errs = open_page(p, w, h, touch)
    boot(pg)
    go_new(pg)
    pg.set_input_files('#ocr-upload', str(SHEET))
    C.ok(wait_step(pg, 2), f'{tag}: photo -> step 2')
    pg.wait_for_timeout(300)
    calls0 = pg.evaluate("()=>window.__stubCalls.recognize")
    pg.click('#p40-back2')
    pg.wait_for_timeout(300)
    C.ok(step(pg) == '1' and L.fits(pg, '#v20-photo-tools [data-imp="crop"]'), f'{tag}: back on step 1 the 框選／拉直 button is shown ({step(pg)})')
    C.ok(pg.evaluate("()=>{const e=document.querySelector('#v20-photo-tools [data-imp=crop]').getBoundingClientRect();return e.height>=44}"),
         f'{tag}: the crop button is a 44px target')
    pg.click('#v20-photo-tools [data-imp="crop"]')
    pg.wait_for_selector('#v20-crop[open]')
    pg.click('#v20-crop [data-imp="crop-done"]')
    ok = False
    try:
        pg.wait_for_function("(n)=>window.__stubCalls.recognize>n", arg=calls0, timeout=30000)
        ok = True
    except Exception:
        pass
    C.ok(ok, f'{tag}: 用這個範圍 starts recognition without pressing 辨認')
    C.ok(wait_step(pg, 2, 30000), f'{tag}: and the check step opens again')
    sel = L.ev(pg, "v20Selected().map(c=>c.en.toLowerCase()).join('|')").split('|')
    C.ok(len(sel) == len(set(sel)) and 'pencil' in sel, f'{tag}: the second pass adds no repeated word {len(sel)}')
    C.ok(not errs, f'{tag}: no console / page errors {errs[:2]}')
    b.close()


def flow_paste(p, w, h, touch, tag):
    b, ctx, pg, errs = open_page(p, w, h, touch)
    boot(pg)
    go_new(pg)
    open_text(pg)
    pg.fill('#raw-words', PASTE)
    pg.click('[data-imp="parse"]')
    C.ok(wait_step(pg, 2, 8000), f'{tag}: 整理成可選字詞 opens step 2')
    pg.wait_for_timeout(300)
    m = sel_map(pg)
    C.ok(m.get('pencil') and m.get('ruler') and m.get('school bag'), f'{tag}: pencil / ruler / school bag are selected {m}')
    C.ok(not any(k in m for k in ('in', 'on', 'an')), f'{tag}: in / on / an are not cards under the default 3+')
    sk = skipped(pg)
    C.ok(sk.count('the') == 1 and 'The' not in sk, f'{tag}: the / The / the fold into one skipped entry {sk}')
    pill(pg, '不限')
    m2 = sel_map(pg)
    C.ok(m2.get('in') is True and m2.get('on') is True and m2.get('an') is True, f'{tag}: 不限 -> in / on / an are selected')
    pg.click('.s50-sw')
    pg.wait_for_timeout(200)
    m3 = sel_map(pg)
    C.ok(sum(1 for k in m3 if k.lower() == 'the') == 1 and m3.get('the') is True, f'{tag}: basic switch off -> exactly one the, selected')
    n = len([x for x in L.ev(pg, "v20Selected().map(c=>c.en)")])
    sel = L.ev(pg, "v20Selected().map(c=>c.en.toLowerCase()).join('|')").split('|')
    C.ok(len(sel) == len(set(sel)), f'{tag}: no repeated word among the {n} selected {sel}')
    # persistence per account
    pg.click('.s50-sw')
    pill(pg, '4+')
    pref = pg.evaluate("()=>Object.entries(localStorage).filter(([k])=>k.startsWith('wq50-dict-prefs')).map(([k,v])=>v)")
    C.ok(len(pref) == 1 and '"minLen":4' in pref[0] and '"basic":true' in pref[0], f'{tag}: the choice is stored per account {pref}')
    L.ev(pg, "clearImportDraft();render();")
    go_new(pg)
    open_text(pg)
    pg.fill('#raw-words', PASTE)
    pg.click('[data-imp="parse"]')
    wait_step(pg, 2, 8000)
    pg.wait_for_timeout(300)
    C.ok(pg.evaluate("()=>document.querySelector('.s50-seg [aria-pressed=true]').textContent") == '4+', f'{tag}: the next import starts on the saved 4+')
    pg.click('.s50-more summary')
    pg.wait_for_timeout(150)
    C.ok(pg.evaluate("()=>[...document.querySelectorAll('.s50-menu button')].map(b=>b.textContent.trim()).join('|')").count('合併字詞') == 1,
         f'{tag}: 合併字詞 / 復原 sit in the 更多 menu')
    C.ok(fixed_bar_ok(pg, '#v20-import-dock'), f'{tag}: the bar is inside the viewport')
    C.ok(not errs, f'{tag}: no console / page errors {errs[:2]}')
    b.close()


def main():
    make_sheet()
    with L.sync_playwright() as p:
        for w, h, touch, tag in ((390, 844, True, 'phone'), (1440, 900, False, 'desktop')):
            print('--', tag, 'photo', flush=True)
            flow_photo(p, w, h, touch, 'photo/' + tag)
            print('--', tag, 'paste', flush=True)
            flow_paste(p, w, h, touch, 'paste/' + tag)
        print('-- phone crop', flush=True)
        flow_crop(p, 390, 844, True, 'crop/phone')
    C.done()


if __name__ == '__main__':
    main()
