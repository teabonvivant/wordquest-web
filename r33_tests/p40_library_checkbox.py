"""p40 / N13b - word library "只看有圖片" checkbox must be a normal checkbox, not a 150x48 white box.

    WQ33_APP=<index.html> python3 r33_tests/p40_library_checkbox.py [--shots DIR]

Real Chromium at a phone width (390, touch) and a desktop width (1280). `[B]` checks fail on the frozen R3.2 base.
"""
import re
import sys
import traceback
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from p40_lib import Checker, open_page, boot_account, sync_playwright  # noqa: E402

SHOTS = None
if '--shots' in sys.argv:
    SHOTS = Path(sys.argv[sys.argv.index('--shots') + 1])
    SHOTS.mkdir(parents=True, exist_ok=True)

C = Checker('p40 library checkbox (N13b)')

GEOM = """(()=>{
  const cb=document.querySelector('#l30-pics'),lab=cb&&cb.closest('label'),q=document.querySelector('#l30-word-q'),btn=document.querySelector('#l30-word-search button[type=submit]'),
        form=document.querySelector('#l30-word-search');
  if(!cb||!lab||!q||!btn||!form)return null;
  const r=e=>{const b=e.getBoundingClientRect();return {x:Math.round(b.x*10)/10,y:Math.round(b.y*10)/10,w:Math.round(b.width*10)/10,h:Math.round(b.height*10)/10};};
  const cs=getComputedStyle(cb),ls=getComputedStyle(lab);
  const range=document.createRange();range.selectNodeContents(lab);const tr=[...range.getClientRects()].map(b=>({y:b.y,h:b.height,w:b.width})).filter(b=>b.w>0);
  return {cb:r(cb),lab:r(lab),q:r(q),btn:r(btn),form:r(form),
    appearance:cs.appearance,accent:cs.accentColor,minW:cs.minWidth,minH:cs.minHeight,bg:cs.backgroundColor,border:cs.borderTopWidth,radius:cs.borderTopLeftRadius,
    labDisplay:ls.display,checked:cb.checked,textRects:tr,
    scrollW:document.documentElement.scrollWidth,innerW:innerWidth,hash:location.hash};
})()"""


def geom(pg):
    return pg.evaluate(GEOM)


def goto_library(pg, query=''):
    pg.evaluate("location.hash='#library%s'" % query)
    pg.wait_for_selector('#l30-pics', timeout=10000)
    pg.wait_for_timeout(250)


def found_count(pg):
    t = pg.evaluate("(document.querySelector('.l30-muted[role=status]')||{}).textContent||''")
    m = re.search(r'找到\s*(\d+)', t)
    return int(m.group(1)) if m else None


def shot(pg, name, clip_form=False):
    if not SHOTS:
        return
    if clip_form:
        pg.locator('#l30-word-search').screenshot(path=str(SHOTS / name))
    else:
        pg.screenshot(path=str(SHOTS / name))


with sync_playwright() as p:
    for label, w, h, touch in [('phone 390', 390, 844, True), ('desktop 1280', 1280, 900, False)]:
        b, ctx, pg, errs = open_page(p, w=w, h=h, touch=touch)
        try:
            boot_account(pg, coins=None)
            goto_library(pg)
            g = geom(pg)
            C.check(f'{label}: library search form found', bool(g), g)
            if not g:
                continue
            cb, lab = g['cb'], g['lab']
            C.check(f'{label}: checkbox is a normal-size box (24x24), not 150x48', cb['w'] == 24 and cb['h'] == 24, cb, base=True)
            C.check(f'{label}: checkbox is not dressed as a text input (no white fill, no 12px radius)',
                    g['bg'] != 'rgb(255, 255, 255)' and g['radius'] in ('0px', '2px', '3px'), f"bg={g['bg']} radius={g['radius']} border={g['border']} appearance={g['appearance']}",
                    base=True)
            C.check(f'{label}: checkbox has no input-style padding box (min size 24)', g['minW'] in ('24px',) and g['minH'] in ('24px',),
                    f"{g['minW']} {g['minH']}", base=True)
            C.check(f'{label}: checkbox takes the page accent colour', g['accent'] != 'auto', g['accent'], base=True)
            C.check(f'{label}: label is a single 48 px row (hit area, text beside the box)', 44 <= lab['h'] <= 52, lab, base=True)
            texts = g['textRects']
            # range rects: the box itself (replaced element) first, the label text last
            same_row = len(texts) >= 2 and abs((texts[-1]['y'] + texts[-1]['h'] / 2) - (cb['y'] + cb['h'] / 2)) < 8
            C.check(f'{label}: label text sits on the same row as the box', same_row, f'{texts} box={cb}', base=True)
            C.check(f'{label}: no horizontal scroll', g['scrollW'] <= g['innerW'], f"{g['scrollW']}>{g['innerW']}")
            if w <= 520:
                C.check(f'{label}: the search box has its own full-width row above the checkbox',
                        g['q']['w'] >= g['form']['w'] - 2 and g['lab']['y'] >= g['q']['y'] + g['q']['h'] - 1, f"q={g['q']} lab={g['lab']}")
                C.check(f'{label}: checkbox, label and search button share the next row',
                        abs(g['btn']['y'] - g['lab']['y']) < 8, f"btn={g['btn']} lab={g['lab']}")
            else:
                C.check(f'{label}: everything fits one row', max(g['q']['y'], g['lab']['y'], g['btn']['y']) - min(g['q']['y'], g['lab']['y'], g['btn']['y']) < 10,
                        f"q={g['q']['y']} lab={g['lab']['y']} btn={g['btn']['y']}")
            shot(pg, f'library_{w}_default.png', clip_form=True)

            total = found_count(pg)
            # --- mouse on the box
            pg.locator('#l30-pics').click()
            C.check(f'{label}: clicking the box checks it', pg.evaluate("document.querySelector('#l30-pics').checked"))
            # --- keyboard: focus + Space toggles back
            pg.locator('#l30-pics').focus()
            pg.keyboard.press('Space')
            C.check(f'{label}: Space on the focused box unchecks it', not pg.evaluate("document.querySelector('#l30-pics').checked"))
            pg.keyboard.press('Space')
            C.check(f'{label}: Space on the focused box checks it again', pg.evaluate("document.querySelector('#l30-pics').checked"))
            shot(pg, f'library_{w}_checked_focus.png', clip_form=True)
            pg.locator('#l30-pics').click()   # unchecked
            # --- label text (right end of the label) toggles too
            lb = pg.evaluate("(()=>{const r=document.querySelector('#l30-pics').closest('label').getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};})()")
            pg.mouse.click(lb['x'] + lb['w'] - 6, lb['y'] + lb['h'] / 2)
            C.check(f'{label}: clicking the label text (right end) checks it', pg.evaluate("document.querySelector('#l30-pics').checked"),
                    lb)
            # --- submit with the box checked
            pg.locator('#l30-word-search button[type=submit]').click()
            pg.wait_for_timeout(600)
            g2 = geom(pg)
            n_pics = found_count(pg)
            C.check(f'{label}: submit keeps pics=1 in the address', 'pics=1' in pg.evaluate('location.hash'), pg.evaluate('location.hash'))
            C.check(f'{label}: only words with pictures are listed (fewer than before)', total and n_pics and n_pics < total, f'{total} -> {n_pics}')
            C.check(f'{label}: after the re-render the box is checked and still 24x24', bool(g2) and g2['checked'] and g2['cb']['w'] == 24 and g2['cb']['h'] == 24,
                    g2 and g2['cb'], base=True)
            shot(pg, f'library_{w}_after_submit.png')
            # --- uncheck and submit again
            pg.locator('#l30-pics').click()
            pg.locator('#l30-word-search button[type=submit]').click()
            pg.wait_for_timeout(600)
            C.check(f'{label}: unchecking and submitting gives pics=0 and the full list again',
                    'pics=0' in pg.evaluate('location.hash') and found_count(pg) == total, f'{pg.evaluate("location.hash")} {found_count(pg)}')
            # --- keyboard-only submit with Enter in the search box keeps working
            pg.fill('#l30-word-q', 'cat')
            pg.keyboard.press('Enter')
            pg.wait_for_timeout(500)
            C.check(f'{label}: Enter in the search box still searches', 'q=cat' in pg.evaluate('location.hash'), pg.evaluate('location.hash'))
            # --- the pictures-only box survives a text search and paging query
            goto_library(pg, '?q=&pics=1')
            g3 = geom(pg)
            C.check(f'{label}: opening ?pics=1 shows the box checked at normal size', bool(g3) and g3['checked'] and g3['cb']['w'] == 24, g3 and g3['cb'], base=True)

            # --- other L30 / L31 search forms are untouched
            pg.evaluate("location.hash='#classroom'")
            pg.wait_for_selector('#l30-unit-q', timeout=8000)
            pg.wait_for_timeout(200)
            u = pg.evaluate("""(()=>{const q=document.querySelector('#l30-unit-q'),s=document.querySelector('#l30-track'),cs=getComputedStyle(q);
              const r=q.getBoundingClientRect();return {minW:cs.minWidth,minH:cs.minHeight,h:Math.round(r.height),checkboxes:document.querySelectorAll('#l30-unit-search input[type=checkbox]').length,
              selectH:Math.round(s.getBoundingClientRect().height)};})()""")
            C.check(f'{label}: unit search keeps its own input rules (min-width 150, 48 px high, select present)',
                    u['minW'] == '150px' and u['minH'] == '48px' and u['h'] >= 48 and u['selectH'] >= 44 and u['checkboxes'] == 0, u)
            pg.evaluate("location.hash='#assembly'")
            pg.wait_for_selector('#l31-q', timeout=8000)
            pg.wait_for_timeout(200)
            u2 = pg.evaluate("""(()=>{const q=document.querySelector('#l31-q'),cs=getComputedStyle(q),r=q.getBoundingClientRect();
              return {minW:cs.minWidth,h:Math.round(r.height),scrollW:document.documentElement.scrollWidth,innerW:innerWidth};})()""")
            C.check(f'{label}: workshop search keeps its own input rules, no horizontal scroll',
                    u2['minW'] == '150px' and u2['h'] >= 48 and u2['scrollW'] <= u2['innerW'], u2)
            C.check(f'{label}: no page errors', not errs, errs)
        except Exception:  # noqa: BLE001
            traceback.print_exc()
            C.check(f'{label}: suite ran to the end without an exception', False, traceback.format_exc().splitlines()[-1][:200])
        finally:
            b.close()

sys.exit(C.finish())
