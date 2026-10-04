"""R3.5 copy check: what a child or parent actually reads must be free of engineering words, version numbers,
test passwords, simplified characters and colloquial Cantonese particles.

Walks the main screens (guest, child, practice, spelling classroom, arcade lobby and its intro card, parent pages, settings,
ranges, maths dialog incl. its shadow DOM) at 390x844 and collects every visible text node plus aria-label / title /
placeholder. [B] checks must fail on the R3.4 text (WQ33_APP points at the build under test).
"""
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE.parent / 'r33_tests'))
import wq33  # noqa: E402
from wq33 import APP, URL, new_page, register, unlock_parent, sync_playwright  # noqa: E402
from p40_lib import Checker  # noqa: E402

COLLECT = r"""()=>{
 const out=[];
 const walk=(root)=>{
  const tw=document.createTreeWalker(root,NodeFilter.SHOW_ELEMENT|NodeFilter.SHOW_TEXT);
  let n;
  while((n=tw.nextNode())){
   if(n.nodeType===3){const p=n.parentElement;if(!p||['SCRIPT','STYLE','NOSCRIPT'].includes(p.tagName))continue;
     const t=n.nodeValue.replace(/\s+/g,' ').trim();if(t)out.push(t);}
   else{for(const a of ['aria-label','title','placeholder']){const v=n.getAttribute&&n.getAttribute(a);if(v)out.push(v);}
     if(n.shadowRoot)walk(n.shadowRoot);}
  }};
 walk(document.body);return out;}"""

BANNED = [
    (r'R3\.\d', 'version number'), (r'\bV(28|30|31)\b', 'internal version'), (r'引擎', 'engine'), (r'補丁', 'patch'),
    (r'校對', 'proof-reading status'), (r'原站', 'original site'), (r'義項', 'jargon 義項'), (r'延後重溫', 'jargon'),
    (r'派幣', 'jargon 派幣'), (r'獨立串對', 'jargon'), (r'工程校對', 'engineering'), (r'驗收', 'acceptance'),
    (r'識別碼', 'jargon'), (r'Admin / 1234', 'test password'), (r'OCR loader', 'raw error'), (r'Failed to fetch', 'raw error'),
    (r'[词图换过没满备较设视频龙务买对话开关发现这们实时间动节机学习种应该边觉点]', 'simplified character'),
    (r'[嘅咗唔喺啲㗎囉]', 'colloquial particle'),
]

ROUTES = ['kid', 'practice', 'classroom', 'game', 'ranges', 'offline', 'settings', 'parent', 'children', 'reports']


def text_of(pg):
    return pg.evaluate(COLLECT)


# The one place a version number may show: the 「關於這個程式」 line on the parent's settings page (support needs it).
ABOUT_LINE = re.compile(r'^學霸星球 SmartQuest Planet R\d\.\d\.\d$')


def scan(texts):
    hits = []
    for t in texts:
        if ABOUT_LINE.match(t.strip()):
            continue
        for pat, why in BANNED:
            if re.search(pat, t):
                hits.append((why, t[:80]))
    return hits


def main():
    c = Checker('R3.5 copy: rendered text lint')
    allhits = {}
    with sync_playwright() as p:
        b, ctx, pg, errs = new_page(p, 390, 844, touch=True)
        pg.on('console', lambda m: errs.append('CONSOLE ' + m.text) if m.type == 'error' else None)
        pg.goto(URL)
        pg.wait_for_timeout(1200)
        texts = text_of(pg)
        allhits['guest-home'] = scan(texts)
        c.check('guest home has some text', len(texts) > 20, len(texts))
        pg.evaluate("location.hash='#login'")
        pg.wait_for_timeout(500)
        allhits['login'] = scan(text_of(pg))
        register(pg)
        for r in ROUTES:
            pg.evaluate(f"location.hash='#{r}'")
            pg.wait_for_timeout(700)
            unlock_parent(pg)
            allhits[r] = scan(text_of(pg))
        # arcade intro card
        pg.evaluate("location.hash='#game'")
        pg.wait_for_timeout(700)
        btn = pg.query_selector('[data-a28="intro"]')
        if btn:
            btn.click()
            pg.wait_for_timeout(600)
            allhits['intro'] = scan(text_of(pg))
        # maths dialog
        pg.evaluate("location.hash='#kid'")
        pg.wait_for_timeout(500)
        m = pg.query_selector('.p10-tile.math, #wqm-launch')
        if m:
            m.click()
            pg.wait_for_timeout(2500)
            allhits['maths'] = scan(text_of(pg))
        c.check('no page errors while walking the screens', not [e for e in errs if e.startswith('PAGEERR')], errs[:3])
        b.close()
    for k, v in allhits.items():
        c.check(f'{k}: no banned wording', not v, '; '.join(f'{w}:{t}' for w, t in v[:4]), base=True)
    print('SCREENS', ', '.join(allhits))
    sys.exit(c.finish())


if __name__ == '__main__':
    main()
