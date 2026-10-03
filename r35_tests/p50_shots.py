"""R3.5 p50 screenshots of the maths screens at 390x844, 844x390, 320x568 and 768x1024.

    WQ33_APP=/path/to/index.html python3 r35_tests/p50_shots.py [prefix]

Writes /home/claude/audit_r35/r35/p50/<prefix><viewport>_<screen>.png (prefix defaults to "").
Use prefix "base_" with the R3.4 build to get the before pictures.
"""
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import p50_browser as T  # noqa: E402
from wq33 import new_page, register, unlock_parent, sync_playwright  # noqa: E402

OUT = Path('/home/claude/audit_r35/r35/p50')
OUT.mkdir(parents=True, exist_ok=True)
VIEWPORTS = [(390, 844, 'p390'), (844, 390, 'l844'), (320, 568, 's320'), (768, 1024, 't768')]


def shot(pg, name, prefix, tag):
    T.top(pg)
    pg.screenshot(path=str(OUT / f'{prefix}{tag}_{name}.png'))


def main():
    prefix = sys.argv[1] if len(sys.argv) > 1 else ''
    with sync_playwright() as p:
        for w, h, tag in VIEWPORTS:
            b, ctx, pg, errs = new_page(p, w, h, touch=True)
            pg.on('console', lambda m: errs.append('CONSOLE ' + m.text) if m.type == 'error' else None)
            pg.on('dialog', lambda d: d.accept())
            T.register(pg, 'p50shot', '小明', grade='6')
            T.click_maths_entry(pg)
            pg.wait_for_timeout(1200)
            shot(pg, 'home', prefix, tag)
            T.act(pg, 'nav:normal', 600)
            T.act(pg, 'grade:6', 500)
            shot(pg, 'catalog', prefix, tag)
            T.act(pg, 'nav:olympiad', 600)
            shot(pg, 'tower', prefix, tag)
            T.act(pg, 'nav:tools', 600)
            T.act(pg, 'selecttool:place', 500)
            shot(pg, 'tools_place', prefix, tag)
            # explore stage, then a question, then a wrong decimal answer
            T.act(pg, 'nav:normal', 500)
            T.act(pg, 'lesson:6N3.R3', 1100)
            shot(pg, 'lesson_intro', prefix, tag)
            T.act(pg, 'nextstage', 600)
            shot(pg, 'lesson_explore', prefix, tag)
            T.act(pg, 'nextstage', 500)
            T.act(pg, 'nextstage', 500)
            shot(pg, 'question', prefix, tag)
            T.S(pg, '#answer').first.fill('12345')
            T.act(pg, 'submit', 700)
            pg.evaluate("(()=>{const r=document.querySelector('#wqm-app-host').shadowRoot.querySelector('.feedback');if(r)r.scrollIntoView({block:'center'});})()")
            pg.wait_for_timeout(200)
            pg.screenshot(path=str(OUT / f'{prefix}{tag}_wrong_decimal.png'))
            T.act(pg, 'nextq', 600)
            T.S(pg, '#answer').first.fill('abc')
            T.act(pg, 'submit', 500)
            pg.screenshot(path=str(OUT / f'{prefix}{tag}_bad_input.png'))
            T.leave_lesson(pg)
            T.act(pg, 'nav:home', 400)
            shot(pg, 'after_leave', prefix, tag)
            # parent gate -> maths progress page
            T.act(pg, 'nav:parent', 900)
            pg.screenshot(path=str(OUT / f'{prefix}{tag}_parent_gate.png'))
            unlock_parent(pg)
            pg.wait_for_timeout(900)
            shot(pg, 'parent_top', prefix, tag)
            pg.evaluate("(()=>{const d=document.querySelector('#wqm-dialog');if(d)d.scrollTop=d.scrollHeight;})()")
            pg.wait_for_timeout(200)
            pg.screenshot(path=str(OUT / f'{prefix}{tag}_parent_bottom.png'))
            print(tag, 'errors:', errs)
            b.close()


if __name__ == '__main__':
    main()
