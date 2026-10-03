"""R3.5 p40 screenshots: every changed screen at 390x844, 844x390, 320x568, 768x1024 -> /home/claude/audit_r35/r35/p40/<screen>_<WxH>.png
Usage: WQ33_APP=<built index.html> python3 r35_tests/p40_shots.py [WxH ...]"""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from p40_dictation_browser import *  # noqa: F401,F403

JUNK = "Ll |1 ~ a\n.. Wy 20\nxx qq zz\n| ; 11\n"


def ocr_run(pg, canned=None, fail=None):
    pg.evaluate("(a)=>{window.__ocrCanned=a[0];window.__ocrFail=a[1];}", [canned, fail])
    pg.set_input_files('#ocr-upload', str(IMG / 'p1_clean_print.png'))
    wait_js(pg, "!!document.querySelector('#run-ocr')&&!document.querySelector('#run-ocr').disabled", 15000)
    pg.click('#run-ocr')
    wait_js(pg, "!window.__ev('ocrBusy')&&document.querySelector('#ocr-status').innerText.length>3", 30000)
    pg.wait_for_timeout(800)


def run_size(p, w, h):
    t = f'{w}x{h}'
    S = lambda pg, n, full=False: shot(pg, f'{n}_{t}', full)
    b, ctx, pg, errs = open_page(p, w, h)
    pg.goto(URL)
    boot(pg)
    parent_unlock(pg)
    go_range_new(pg)
    S(pg, 'a1_step1')
    ocr_run(pg, fail='Failed to fetch')
    S(pg, 'a2_ocr_error')
    ocr_run(pg, canned={'text': JUNK})
    S(pg, 'a3_ocr_unclear')
    ev(pg, 'clearImportDraft();render();')
    add_range(pg, title='Unit 4 水果與食物')
    S(pg, 'b1_landing')
    pg.evaluate("location.hash='#ranges'")
    pg.wait_for_timeout(500)
    S(pg, 'b2_ranges', True)
    go_range_new(pg)
    pg.fill('#raw-words', PASTE)
    pg.click('[data-imp="parse"]')
    pg.wait_for_timeout(800)
    S(pg, 'a4_step2')
    for _ in range(40):
        pend = pg.query_selector_all('.v20-grid .is-review [data-imp="edit"]')
        if not pend:
            break
        pend[0].scroll_into_view_if_needed(); pend[0].click(); pg.wait_for_timeout(250)
        if pg.query_selector('#v20-item-checked'):
            pg.check('#v20-item-checked'); pg.click('[data-imp="save-edit"]'); pg.wait_for_timeout(250)
    pg.click('#v20-confirm-next')
    pg.wait_for_timeout(500)
    S(pg, 'a5_step3')
    ev(pg, 'clearImportDraft();render();')
    start_session(pg, [['pencil', 'spell']])
    S(pg, 'c1_spell')
    answer(pg, 'pensil')
    S(pg, 'c2_retry')
    answer(pg, 'pencal'); answer(pg, 'pensel')
    S(pg, 'c3_shown')
    start_session(pg, [['pencil', 'meaning']])
    ev(pg, "(()=>{const w=currentWord();const o=[...document.querySelectorAll('.task-card .option')].find(b=>b.dataset.value!==w.en);o.click();})()")
    pg.wait_for_timeout(200); pg.click('#submit-answer'); pg.wait_for_timeout(400)
    S(pg, 'c4_choice_retry')
    ev(pg, """(()=>{const w=db.words.find(x=>x.en==='grandmother');db.session=newSession([prepareItem({id:uid('q'),wordId:w.id,type:'study',origin:'自選認詞'},w)],'practice');save();go('learn');render();})()""")
    pg.wait_for_timeout(500)
    S(pg, 'c5_study')
    start_session(pg, [['pencil', 'spell'], ['ruler', 'spell']])
    answer(pg, 'pencil'); pg.click('[data-act="next-task"]'); pg.wait_for_timeout(400)
    for x in ('rulr', 'rullr', 'rulrr'):
        answer(pg, x)
    pg.click('[data-act="next-task"]'); pg.wait_for_timeout(700)
    S(pg, 'c6_finish', True)
    pg.evaluate("location.hash='#report'")
    pg.wait_for_timeout(600); parent_unlock(pg); pg.wait_for_timeout(300)
    S(pg, 'd1_report', True)
    pg.evaluate("location.hash='#settings'")
    pg.wait_for_timeout(600); parent_unlock(pg)
    pg.wait_for_timeout(300)
    ev(pg, "document.querySelector('#v24-learning-policy')&&document.querySelector('#v24-learning-policy').scrollIntoView()")
    pg.wait_for_timeout(300)
    S(pg, 'd2_settings')
    print(t, 'errors:', errs)
    b.close()
    b, ctx, pg, errs = open_page(p, w, h, speech='none')
    pg.goto(URL)
    boot(pg)
    parent_unlock(pg)
    add_range(pg)
    start_session(pg, [['grandmother', 'listenSpell']])
    pg.wait_for_timeout(1800)
    ev(pg, 'render()')
    pg.wait_for_timeout(400)
    S(pg, 'c7_no_voice')
    pg.click('[data-p40="copy"]')
    pg.wait_for_timeout(400)
    S(pg, 'c8_copy')
    print(t, 'errors:', errs)
    b.close()


if __name__ == '__main__':
    sizes = sys.argv[1:] or ['390x844', '844x390', '320x568', '768x1024']
    with sync_playwright() as p:
        for s in sizes:
            w, h = map(int, s.split('x'))
            run_size(p, w, h)
