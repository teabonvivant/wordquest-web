"""R3.12 t15 - dictation upload (#range-new): one-press save, no tick, no step 3.

    WQ33_APP=<app/index.html> python3 r37_tests/t15_dictation_save.py          (T15_SHOTS=<dir> for the screenshots)

Covers: pasted text (needs-review words, duplicates, a phrase) and the photo path; clicks from "recognised" to "saved" (target 1);
#confirm-import is gone; flagged cards save without being checked; 全部接受 / 逐個核對; more than 120 asks once; nothing selected still
answers; the 儲存 bar is inside the screen and the page has no sideways scroll at 390x844, 820x1180, 1180x820 and 1440x900."""
import datetime
import os
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import lib37 as L  # noqa: E402
import p40_lib35 as P  # noqa: E402  (OCR stub + native tesseract bridge)

C = L.Checker('t15 dictation save')
SHEET = Path(os.environ.get('T15_SHEET', '/tmp/t15_sheet.png'))
SHOTS = Path(os.environ.get('T15_SHOTS', '/home/.z/workspaces/con_EfO3MUQLdW6o7xbL/r312/shotsD'))
SHOTS.mkdir(parents=True, exist_ok=True)

SIZES = [(390, 844, True, 'phone'), (820, 1180, True, 'tablet'), (1180, 820, False, 'laptop'), (1440, 900, False, 'desktop')]
# needs-review (zorpish, blargen are not in the bank), a duplicate (apple / Apple / apple again), a phrase, plain words
PASTE = 'pencil | 鉛筆\nruler | 間尺\nzorpish\nblargen\nschool bag | 書包\napple | 蘋果\nApple\napple\nice cream\nbox\nhomework\nwindow | 窗\nelephant | 大象'
LONG_ANSWER = ('只會加入上面的項目', '不會儲存整張相片', '我已對照原稿', '請最後對照原稿', '核對及加入')


def today_hk():
    return datetime.datetime.now(datetime.timezone(datetime.timedelta(hours=8))).strftime('%Y-%m-%d')


def open_page(p, w, h, touch):
    b, ctx, pg, errs = L.open_page(p, w, h, touch)
    pg.add_init_script(P.STUB)
    pg.add_init_script("window.__clk=0;document.addEventListener('click',e=>{if(e.isTrusted)window.__clk++;},true);")
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


def wait_step(pg, n, ms=60000):
    try:
        pg.wait_for_function("(n)=>document.querySelector('#import-v20')?.dataset.p40Step===String(n)", arg=str(n), timeout=ms)
        return True
    except Exception:
        return False


def paste(pg, text):
    if not pg.evaluate("()=>document.querySelector('#v20-text-details')?.open"):
        pg.click('#v20-text-details>summary')
        pg.wait_for_timeout(150)
    pg.fill('#raw-words', text)
    pg.click('[data-imp="parse"]')
    ok = wait_step(pg, 2, 8000)
    pg.wait_for_timeout(300)
    return ok


def shot(pg, w, name):
    try:
        pg.screenshot(path=str(SHOTS / f'{w}_{name}.png'))
    except Exception as e:  # a screenshot never fails the suite
        print('  (shot failed)', name, str(e)[:80])


def overflow(pg):
    return pg.evaluate("()=>document.documentElement.scrollWidth-innerWidth")


def in_view(pg, sel):
    """The element is fully inside the viewport and above the bottom navigation (no scrolling needed to reach it)."""
    return pg.evaluate("""(sel)=>{const e=document.querySelector(sel);if(!e)return false;const r=e.getBoundingClientRect();
      const nav=document.querySelector('.r37-nav'),lim=nav?Math.min(nav.getBoundingClientRect().top,innerHeight):innerHeight;
      return r.width>0&&r.height>0&&r.top>=-1&&r.left>=-1&&r.bottom<=lim+1&&r.right<=innerWidth+1;}""", sel)


def saved_words(pg):
    return L.ev(pg, "(()=>{const r=latestRange();return r?rangeWords(r.id).map(w=>[w.en,w.zh]):[]})()")


def clicks(pg):
    return pg.evaluate("()=>window.__clk")


def reset_clicks(pg):
    pg.evaluate("()=>{window.__clk=0}")


def run_chrome_checks(pg, tag):
    """no long explanation, one short hint line per step, no tick, two steps"""
    txt = pg.inner_text('#import-v20')
    C.ok(not any(s in txt for s in LONG_ANSWER), f'{tag}: none of the removed long sentences / the tick text is on the page')
    C.ok(pg.query_selector('#confirm-import') is None and pg.query_selector('#v20-summary') is None and pg.query_selector('#v20-save-range') is None,
         f'{tag}: no #confirm-import / #v20-summary / #v20-save-range in the DOM')
    C.ok(len(pg.query_selector_all('#p40-steps li')) == 2, f'{tag}: the step bar names two steps')


def flow_paste(p, w, h, touch, name):
    tag = f'paste/{name}'
    b, ctx, pg, errs = open_page(p, w, h, touch)
    boot(pg)
    go_new(pg)
    # ---- step 1: one short hint, nothing else to read
    tip = pg.inner_text('#p40-tips').strip()
    C.ok(0 < len(tip) <= 15, f'{tag}: step 1 keeps one hint of at most 15 characters ({tip!r}, {len(tip)})')
    C.ok(not pg.is_visible('.s50-priv') and pg.query_selector('.s50-priv') is None, f'{tag}: the long privacy paragraph is gone')
    run_chrome_checks(pg, tag + ' step1')
    C.ok(in_view(pg, '[data-act="open-camera"]'), f'{tag}: the camera button is on the first screen')
    shot(pg, w, 'paste_1_step1')
    # ---- step 2
    C.ok(paste(pg, PASTE), f'{tag}: pasted text opens step 2')
    run_chrome_checks(pg, tag + ' step2')
    msg = pg.inner_text('#v20-message').strip()
    C.ok(0 < len(msg) <= 15, f'{tag}: step 2 keeps one status line of at most 15 characters ({msg!r}, {len(msg)})')
    C.ok(in_view(pg, '#v20-confirm-next'), f'{tag}: the 儲存 button is on screen without scrolling')
    C.ok(in_view(pg, '#v20-import-dock'), f'{tag}: the fixed bar is on screen')
    C.ok(overflow(pg) <= 1, f'{tag}: no sideways scroll ({overflow(pg)})')
    C.ok(pg.evaluate("()=>{const b=document.querySelector('.r37-legbody');return b.scrollHeight<=b.clientHeight+1}"),
         f'{tag}: the page itself does not scroll; the cards sit in their own box')
    pend = L.ev(pg, "v20Pending().map(c=>c.en)")
    C.ok({'zorpish', 'blargen'} <= set(pend), f'{tag}: the unknown words are flagged ({pend})')
    sel = L.ev(pg, "v20Selected().map(c=>c.en)")
    key = [x.lower() for x in sel]
    C.ok(key.count('apple') == 1, f'{tag}: apple / Apple / apple are folded into one card ({sel})')
    n_expect = len(sel)
    btn = pg.inner_text('#v20-confirm-next')
    C.ok(f'儲存 {n_expect} 個字' in btn and not pg.is_disabled('#v20-confirm-next'), f'{tag}: the button is live and says {btn!r}')
    C.ok(pg.is_visible('#s50-review') and f'({len(pend)})' in pg.inner_text('#s50-review'), f'{tag}: 逐個核對 ({len(pend)}) sits next to 儲存')
    C.ok(pg.is_visible('.s50-accept') and '全部接受' in pg.inner_text('.s50-accept'), f'{tag}: 全部接受 is offered while cards are flagged')
    qs = pg.evaluate("()=>[...document.querySelectorAll('.v20-candidate.is-review')].map(a=>{const s=getComputedStyle(a);return [s.borderTopStyle,a.querySelector('[data-imp=edit]').getBoundingClientRect().height]})")
    C.ok(qs and all(x[0] == 'dashed' and x[1] >= 44 for x in qs), f'{tag}: a flagged card is a dashed frame with a 44px ? corner {qs}')
    # name and date: one small row, filled in, editable
    row = pg.evaluate("""()=>{const a=document.querySelector('#range-title').getBoundingClientRect(),b=document.querySelector('#range-date').getBoundingClientRect();return [Math.round(a.top),Math.round(b.top),Math.round(a.height)]}""")
    C.ok(abs(row[0] - row[1]) <= 2 and row[2] >= 40, f'{tag}: name and date share one row at the top of step 2 {row}')
    C.ok(pg.input_value('#range-date') == today_hk() and pg.input_value('#range-title').startswith('默書'),
         f'{tag}: the date defaults to today and the name is filled in ({pg.input_value("#range-title")!r}, {pg.input_value("#range-date")!r})')
    pg.fill('#range-title', 'Unit 7 默書')
    shot(pg, w, 'paste_2_step2')
    # ---- one press saves; flagged cards are saved unchecked
    reset_clicks(pg)
    pg.click('#v20-confirm-next')
    pg.wait_for_selector('#s50-saved', timeout=8000)
    pg.wait_for_timeout(200)
    C.ok(clicks(pg) == 1, f'{tag}: from the check step to saved took {clicks(pg)} click(s) (target 1)')
    words = saved_words(pg)
    en = [x[0] for x in words]
    C.ok(len(words) == n_expect, f'{tag}: {len(words)} words stored = {n_expect} on the button')
    C.ok('zorpish' in en and 'blargen' in en, f'{tag}: the flagged words are stored without being checked ({en})')
    zh = dict(words)
    C.ok(zh.get('zorpish') == '' and zh.get('pencil') == '鉛筆', f'{tag}: a flagged word may have no Chinese yet ({zh.get("zorpish")!r}); the others keep theirs')
    C.ok([x.lower() for x in en].count('apple') == 1, f'{tag}: the duplicate was merged on save')
    C.ok('ice cream' in en and 'school bag' in en, f'{tag}: phrases are kept whole')
    C.ok(L.ev(pg, 'latestRange().title') == 'Unit 7 默書' and L.ev(pg, 'latestRange().dictationDate') == today_hk(),
         f'{tag}: the edited name and the default date are on the range ({L.ev(pg, "latestRange().title")!r})')
    card = pg.inner_text('#s50-saved')
    C.ok(f'已儲存 {n_expect} 個字' in card and pg.is_visible('[data-s50="practice"]') and pg.is_visible('[data-s50="again"]'),
         f'{tag}: the card says 已儲存 {n_expect} 個字 with 開始練習 and 再上傳 ({card.replace(chr(10), " ")[:50]!r})')
    C.ok(in_view(pg, '#s50-saved [data-s50="practice"]') and overflow(pg) <= 1, f'{tag}: the saved card needs no scrolling')
    C.ok(L.ev(pg, "db.words.length") >= n_expect and not L.ev(pg, "!!document.querySelector('#v20-save-error')"), f'{tag}: nothing else changed')
    shot(pg, w, 'paste_3_saved')
    # 再上傳 -> step 1 again
    pg.click('[data-s50="again"]')
    pg.wait_for_timeout(500)
    C.ok(pg.query_selector('#s50-saved') is None and in_view(pg, '[data-act="open-camera"]') and wait_step(pg, 1, 3000),
         f'{tag}: 再上傳 returns to the photo step')
    # 開始練習 on a second save
    C.ok(paste(pg, 'pencil | 鉛筆\nruler | 間尺\nbanana | 香蕉'), f'{tag}: a second paste opens step 2')
    pg.click('[data-s50="all"]')
    pg.wait_for_timeout(200)
    pg.click('#v20-confirm-next')
    pg.wait_for_selector('#s50-saved', timeout=8000)
    pg.click('[data-s50="practice"]')
    pg.wait_for_timeout(900)
    C.ok(L.ev(pg, 'lastRoute') in ('learn', 'kid') and L.ev(pg, '!!db.session') is True and L.ev(pg, 'v23ParentUntil') == 0,
         f'{tag}: 開始練習 starts a practice for the child ({L.ev(pg, "lastRoute")})')
    C.ok(not errs, f'{tag}: no console / page errors {errs[:2]}')
    b.close()


def flow_review(p, w, h, touch, name):
    """flagged cards: 全部接受, one-by-one review, and neither is needed to save"""
    tag = f'review/{name}'
    b, ctx, pg, errs = open_page(p, w, h, touch)
    boot(pg)
    go_new(pg)
    C.ok(paste(pg, PASTE), f'{tag}: pasted text opens step 2')
    n = L.ev(pg, 'v20Pending().length')
    C.ok(n >= 2, f'{tag}: {n} cards are flagged')
    # 逐個核對: opens the first, counts, advances, ends by itself
    pg.click('#s50-review')
    pg.wait_for_selector('#v20-edit-dialog[open]', timeout=4000)
    head = pg.inner_text('#v20-edit-dialog .v20-dialog-head h2')
    C.ok(head.replace(' ', '') == f'核對1/{n}', f'{tag}: the first review card reads 核對 1 / {n} ({head!r})')
    C.ok(not pg.is_visible('#v20-item-checked'), f'{tag}: the per-card tick is not shown')
    shot(pg, w, 'review_dialog')
    for i in range(n):
        pg.click('#v20-edit-dialog [data-imp="save-edit"]')
        pg.wait_for_timeout(250)
        if i < n - 1:
            h2 = pg.inner_text('#v20-edit-dialog .v20-dialog-head h2').replace(' ', '') if pg.is_visible('#v20-edit-dialog') else ''
            C.ok(h2 == f'核對{i + 2}/{n}', f'{tag}: step {i + 2} of the review opens by itself ({h2!r})')
    C.ok(not pg.is_visible('#v20-edit-dialog') and L.ev(pg, 'v20Pending().length') == 0, f'{tag}: after the last one the dialog closes and nothing is flagged')
    C.ok(not pg.is_visible('#s50-review') and pg.query_selector('.s50-accept') is None, f'{tag}: the review and 全部接受 buttons go away')
    # 全部接受 on a fresh paste
    go_new(pg)
    L.ev(pg, 'clearImportDraft();render();')
    go_new(pg)
    C.ok(paste(pg, PASTE), f'{tag}: pasted again')
    n2 = L.ev(pg, 'v20Pending().length')
    pg.click('.s50-accept')
    pg.wait_for_timeout(250)
    C.ok(n2 >= 2 and L.ev(pg, 'v20Pending().length') == 0 and L.ev(pg, 'v20Selected().length') == L.ev(pg, 'v20Selected().length'),
         f'{tag}: 全部接受 clears all {n2} flags in one tap')
    C.ok(pg.query_selector('.v20-candidate.is-review') is None and not pg.is_visible('#s50-review'), f'{tag}: no dashed cards are left')
    # closing the review half-way does not block saving
    L.ev(pg, 'clearImportDraft();render();')
    go_new(pg)
    C.ok(paste(pg, PASTE), f'{tag}: pasted a third time')
    pg.click('#s50-review')
    pg.wait_for_selector('#v20-edit-dialog[open]', timeout=4000)
    pg.click('#v20-edit-dialog [data-imp="close-dialog"]')
    pg.wait_for_timeout(250)
    C.ok(L.ev(pg, 'v20Pending().length') >= 2 and not pg.is_disabled('#v20-confirm-next'), f'{tag}: closing the review leaves the flags and the save button live')
    pg.click('#v20-confirm-next')
    pg.wait_for_selector('#s50-saved', timeout=8000)
    C.ok(len(saved_words(pg)) >= 10, f'{tag}: saved after closing the review ({len(saved_words(pg))} words)')
    C.ok(not errs, f'{tag}: no console / page errors {errs[:2]}')
    b.close()


def flow_limits(p, w, h, touch, name):
    """more than 120 asks once; nothing selected still answers"""
    tag = f'limits/{name}'
    b, ctx, pg, errs = open_page(p, w, h, touch)
    boot(pg)
    go_new(pg)
    import itertools
    names = ['zq' + a + b for a, b in itertools.product('abcdefghij', repeat=2)]          # 100 words: the most one paste parses
    C.ok(paste(pg, '\n'.join(names)), f'{tag}: 100 pasted words open step 2')
    # a second photo / more hand-added words push the list past 120 (the same objects 自己加入 makes); then 全選 takes them all
    L.ev(pg, """(()=>{for(let i=0;i<30;i++){const en='yx'+String.fromCharCode(97+i%26)+String.fromCharCode(97+(i*7)%26)+i;
      const doc=V20.fromText(en,uid('manual'));const c=V20.candidates(V20.fromText(en+' | 中',doc.id),{mode:'list',dictionary:v20Dictionary,common:v20.common})[0];
      Object.assign(c,{en,zh:'中',originalText:en,sourceText:en,reviewReasons:[],reviewed:true,selected:true,kind:kindOf(en),excludedReason:''});v20.documents.push(doc);v20.items.push(c);}
      v20RenderWords();})()""")
    pg.click('[data-s50="all"]')
    pg.wait_for_timeout(300)
    n = L.ev(pg, 'v20Selected().length')
    btn = pg.inner_text('#v20-confirm-next')
    C.ok(n == 130 and '儲存 130 個字' in btn and not pg.is_disabled('#v20-confirm-next'), f'{tag}: 130 selected, the button stays live ({btn!r})')
    C.ok(in_view(pg, '#v20-confirm-next') and overflow(pg) <= 1, f'{tag}: the button is on screen with 130 cards')
    box = pg.evaluate("()=>{const e=document.querySelector('#word-editor');const s=getComputedStyle(e);return [s.overflowY,e.scrollHeight>e.clientHeight+20,document.querySelector('.r37-legbody').scrollHeight<=document.querySelector('.r37-legbody').clientHeight+1]}")
    C.ok(box[0] == 'auto' and box[1] and box[2], f'{tag}: the cards scroll inside their own box, the page does not {box}')
    n0 = L.ev(pg, 'db.ranges.length')
    pg.click('#v20-confirm-next')
    pg.wait_for_timeout(300)
    over = pg.inner_text('#s50-over') if pg.is_visible('#s50-over') else ''
    C.ok('只儲存前 120 個' in over and '返回' in over and '儲存前 120 個' in over, f'{tag}: the press asks 只儲存前 120 個？ with two choices ({over.replace(chr(10), " ")!r})')
    C.ok(L.ev(pg, 'db.ranges.length') == n0 and in_view(pg, '#s50-over'), f'{tag}: nothing is stored yet and the question is on screen')
    shot(pg, w, 'limits_over')
    pg.click('#s50-over [data-s50="over-back"]')
    pg.wait_for_timeout(250)
    C.ok(not pg.is_visible('#s50-over') and pg.is_visible('#v20-confirm-next') and L.ev(pg, 'db.ranges.length') == n0 and L.ev(pg, 'v20Selected().length') == 130,
         f'{tag}: 返回 closes the question and keeps everything')
    pg.click('#v20-confirm-next')
    pg.wait_for_timeout(250)
    pg.click('#s50-over [data-s50="save120"]')
    pg.wait_for_selector('#s50-saved', timeout=8000)
    C.ok(len(saved_words(pg)) == 120 and L.ev(pg, 'db.ranges.length') == n0 + 1, f'{tag}: 儲存前 120 個 stores 120 words ({len(saved_words(pg))})')
    C.ok('已儲存 120 個字' in pg.inner_text('#s50-saved'), f'{tag}: the card reports 120')
    # nothing selected -> 先揀字 is pressable and answers
    L.ev(pg, 'clearImportDraft();render();')
    go_new(pg)
    C.ok(paste(pg, 'pencil | 鉛筆\nruler | 間尺\nbanana | 香蕉'), f'{tag}: a small paste opens step 2')
    pg.click('[data-s50="none"]')
    pg.wait_for_timeout(250)
    b0 = pg.inner_text('#v20-confirm-next')
    C.ok(b0.strip() == '先揀字' and not pg.is_disabled('#v20-confirm-next'), f'{tag}: with nothing selected the button reads 先揀字 and can be pressed ({b0!r})')
    nr = L.ev(pg, 'db.ranges.length')
    pg.click('#v20-confirm-next')
    pg.wait_for_timeout(300)
    flashed = pg.evaluate("()=>!!document.querySelector('.s50-grid.s50-flash')")
    msg = pg.inner_text('#v20-message')
    C.ok(flashed and '先點選' in msg and L.ev(pg, 'db.ranges.length') == nr, f'{tag}: pressing it highlights the cards and says what to do ({msg!r})')
    shot(pg, w, 'limits_none')
    pg.click('[data-s50="all"]')
    pg.wait_for_timeout(200)
    C.ok(pg.inner_text('#v20-confirm-next').startswith('✓ 儲存'), f'{tag}: picking words turns it back into 儲存')
    C.ok(not errs, f'{tag}: no console / page errors {errs[:2]}')
    b.close()


def make_sheet():
    from PIL import Image, ImageDraw, ImageFont
    f = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 34)
    im = Image.new('RGB', (1100, 900), 'white')
    d = ImageDraw.Draw(im)
    lines = ["Unit 3 Dictation  Date: 15/10/2026", "1. pencil  2. ruler  3. eraser", "4. school bag  5. favourite",
             "6. in the box  7. on the desk", "8. an apple  9. Wednesday", "10. grandmother  11. I am happy.",
             "Sentence: The cat is on the mat."]
    for i, t in enumerate(lines):
        d.text((60, 60 + i * 110), t, fill='black', font=f)
    im.save(SHEET)


def flow_photo(p, w, h, touch, name):
    tag = f'photo/{name}'
    b, ctx, pg, errs = open_page(p, w, h, touch)
    boot(pg)
    go_new(pg)
    pg.set_input_files('#ocr-upload', str(SHEET))
    C.ok(wait_step(pg, 2), f'{tag}: choosing the photo opens step 2 by itself')
    pg.wait_for_timeout(500)
    run_chrome_checks(pg, tag)
    n = L.ev(pg, 'v20Selected().length')
    pend = L.ev(pg, 'v20Pending().length')
    C.ok(n >= 6, f'{tag}: {n} words selected from the photo ({pend} flagged)')
    C.ok(in_view(pg, '#v20-confirm-next') and overflow(pg) <= 1, f'{tag}: 儲存 is on screen, no sideways scroll')
    C.ok(pg.input_value('#range-date') in ('2026-10-15', today_hk()), f'{tag}: the date is the one on the sheet or today ({pg.input_value("#range-date")!r})')
    C.ok(pg.input_value('#range-title').startswith('Unit 3') or pg.input_value('#range-title').startswith('默書'), f'{tag}: the name is the unit on the sheet or the default ({pg.input_value("#range-title")!r})')
    shot(pg, w, 'photo_2_step2')
    reset_clicks(pg)
    pg.click('#v20-confirm-next')
    pg.wait_for_selector('#s50-saved', timeout=8000)
    C.ok(clicks(pg) == 1, f'{tag}: from recognised to saved took {clicks(pg)} click(s) (target 1) with {pend} card(s) left flagged')
    C.ok(len(saved_words(pg)) == n, f'{tag}: {len(saved_words(pg))} stored = {n} selected')
    shot(pg, w, 'photo_3_saved')
    C.ok(not errs, f'{tag}: no console / page errors {errs[:2]}')
    b.close()


def main():
    """optional argument: paste | photo | review | limits (run only those flows)"""
    want = set(sys.argv[1:])
    run = lambda k: not want or k in want  # noqa: E731
    make_sheet()
    with L.sync_playwright() as p:
        for w, h, touch, name in SIZES:
            if run('paste'):
                print('--', name, f'{w}x{h}', 'paste', flush=True)
                flow_paste(p, w, h, touch, name)
            if run('photo'):
                print('--', name, 'photo', flush=True)
                flow_photo(p, w, h, touch, name)
        if run('review'):
            print('-- phone review', flush=True)
            flow_review(p, 390, 844, True, 'phone')
        if run('limits'):
            print('-- phone limits', flush=True)
            flow_limits(p, 390, 844, True, 'phone')
            print('-- desktop limits', flush=True)
            flow_limits(p, 1440, 900, False, 'desktop')
    C.done()


if __name__ == '__main__':
    main()
