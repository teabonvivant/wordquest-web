"""p30 play view on touch devices, 26 games (S2-03 tap targets, S2-06 touch-only help text).

    WQ33_APP=<build> python3 r35_tests/p30_play.py

For every game the suite opens the READY card and then the running game on a phone (390x844 portrait, 844x390 landscape) and scans the
visible page and any open dialog for (a) interactive elements smaller than 44 px and (b) key names (方向鍵, Space, Q／E, ...).
The on-screen arrow keys of the touch pad (.a28-touch-key) are buttons, not instructions, so their arrow glyphs are allowed;
a right arrow alone is also allowed (the sweet-studio order line reads 抹茶 → 草莓).
A desktop run (pointer: fine) proves that the keyboard text is still there for people with a keyboard.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from p30_lib import (Checker, IDS, SHOTS, TAG, URL, boot_account, open_page, start_game, st, sync_playwright)

SCAN = r"""()=>{
 const out={small:[],kb:[]};
 const vis=e=>{const r=e.getBoundingClientRect();if(r.width<=0||r.height<=0)return false;
  for(let a=e;a;a=a.parentElement){const cs=getComputedStyle(a);if(cs.display==='none'||cs.visibility==='hidden')return false;
   if(a.tagName==='DETAILS'&&!a.open&&!(e.closest('summary')&&e.closest('summary').parentElement===a))return false;}return true;};
 const roots=[document.querySelector('#app'),...document.querySelectorAll('dialog[open]')].filter(Boolean);
 const kb=/方向鍵|WASD|W A S D|Space|空白鍵|鍵盤|Shift|Esc|滑鼠|Backspace|[←↑↓]|\bQ E\b|按 [0-9A-Z]|Enter|\bTab\b/;
 for(const root of roots){
  for(const e of root.querySelectorAll('a[href],button,summary,input:not([type=hidden]),select,[role=button]')){
   if(!vis(e))continue;const r=e.getBoundingClientRect();
   if(r.height<43.5||r.width<43.5)out.small.push(((e.innerText||e.getAttribute('aria-label')||e.tagName).trim().slice(0,14))+' '+Math.round(r.width)+'x'+Math.round(r.height));}
  for(const e of root.querySelectorAll('*')){
   if(e.closest('.a28-touch-key,.a28-touch-controls'))continue;
   const own=[...e.childNodes].filter(n=>n.nodeType===3).map(n=>n.nodeValue).join('').trim();
   if(!own||!vis(e))continue;
   if(kb.test(own))out.kb.push(own.slice(0,40));}
 }
 return out;}"""


def scan_games(p, w, h, touch):
    b, ctx, pg, errs = open_page(p, w, h, touch=touch)
    pg.goto(URL)
    pg.wait_for_timeout(1000)
    boot_account(pg, coins=60)
    small, kb = [], []
    for gid in IDS:
        pg.evaluate('__p40.reset(60)')
        pg.wait_for_selector('[data-cabinet]', timeout=10000)
        start_game(pg, gid, play=False)
        pg.wait_for_timeout(700)
        r1 = pg.evaluate(SCAN)
        pg.locator('[data-a28="play"]').click()
        pg.wait_for_function('__p40.state().playing', timeout=10000)
        pg.wait_for_timeout(900)
        r2 = pg.evaluate(SCAN)
        if gid == 'ruins-courier':
            pg.screenshot(path=str(SHOTS / f'play_ruins-courier_{w}x{h}_{TAG}.png'))
        for state, r in (('ready', r1), ('play', r2)):
            small += [(gid, state, x) for x in r['small']]
            kb += [(gid, state, x) for x in r['kb']]
    return b, pg, errs, small, kb


def uniq(rows):
    seen = {}
    for g, s, x in rows:
        seen.setdefault(x, []).append(g + ':' + s)
    return [(k, len(v), v[0]) for k, v in sorted(seen.items(), key=lambda kv: -len(kv[1]))]


def main():
    C = Checker('p30 play view, touch targets and touch-only text, 26 games')
    with sync_playwright() as p:
        for name, (w, h) in (('portrait 390x844', (390, 844)), ('landscape 844x390', (844, 390))):
            b, pg, errs, small, kb = scan_games(p, w, h, True)
            print(f'  {name}: small targets {len(small)} -> {uniq(small)[:6]}')
            print(f'  {name}: key names {len(kb)} -> {uniq(kb)[:6]}')
            C.check(f'S2-03 {name}: every tap target in the ready card and in the running game is >= 44px (26 games)', not small, uniq(small)[:4], base=True)
            C.check(f'S2-06 {name}: no key name is visible on a phone, ready card or running game (26 games)', not kb, uniq(kb)[:4],
                    base=name.startswith('portrait'))  # landscape hides the line, so it is a guard there
            C.check(f'{name}: no console errors', not errs, errs[:3])
            b.close()
        # desktop keeps the keyboard sentence under the canvas (regression guard: only touch devices change)
        b, ctx, pg, errs = open_page(p, 1280, 800, touch=False)
        pg.goto(URL)
        pg.wait_for_timeout(1000)
        boot_account(pg, coins=60)
        start_game(pg, 'sky-rescue', play=True)
        pg.wait_for_timeout(800)
        hint = pg.inner_text('#pg-hint')
        C.check('desktop (pointer: fine) still shows the keyboard sentence under the canvas', '方向鍵' in hint or 'WASD' in hint, hint)
        C.check('desktop: no console errors', not errs, errs[:3])
        b.close()
    return C.finish()


if __name__ == '__main__':
    sys.exit(main())
