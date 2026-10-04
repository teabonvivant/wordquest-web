"""p30 lobby and intro in the states a child can meet besides the happy path (S1-05 any disabled button shows a reason).

    WQ33_APP=<build> python3 r35_tests/p30_states.py

* guest (not logged in): no wallet, one clear line, the intro leads to login.
* this round's 5 plays are used up (coins left): the lobby and the intro say so and offer a small practice, no dead button.
* a game blocked by the parent: the intro says why, no dead button.
* 768x1024 and 320x568: the lobby stays one tidy column / grid without horizontal scroll.
* the intro's main button is on screen without scrolling on phones in portrait and landscape (button bar hides no text in landscape).
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from p30_lib import (Checker, IDS, SHOTS, SHOWN, TAG, URL, boot_account, close_intro, goto_lobby, open_intro, open_page30, st, sync_playwright)

EARN = '去賺金幣：做一個小練習'


INTRO_JS = """()=>{const d=document.querySelector('#pg-dialog');if(!d)return {btn:false};const dr=d.getBoundingClientRect();
  const b=d.querySelector('[data-a28="buy"]')||d.querySelector('.p30-actions .btn');if(!b)return {btn:false};
  const r=b.getBoundingClientRect(),act=d.querySelector('.p30-actions'),ar=act?act.getBoundingClientRect():null;
  let tb=0;for(const e of d.querySelectorAll('.p30-how,.p30-goal,.a28-preview-progress')){const q=e.getBoundingClientRect();if(q.height>0)tb=Math.max(tb,q.bottom);}
  return {btn:true,btnTop:r.top,btnBottom:r.bottom,dlgTop:dr.top,dlgBottom:dr.bottom,vh:innerHeight,actTop:ar?ar.top:null,textBottom:tb};}"""


def dead_buttons(pg, scope):
    return pg.evaluate("""(scope)=>[...document.querySelectorAll(scope+' button:disabled, '+scope+' [aria-disabled="true"]')].map(b=>(b.innerText||'').trim())""", scope)


def no_hscroll(pg):
    return pg.evaluate("document.documentElement.scrollWidth<=innerWidth+1")


def main():
    C = Checker('p30 lobby and intro states')
    with sync_playwright() as p:
        # ===================================================================== guest
        b, ctx, pg, errs = open_page30(p, 390, 844, touch=True)
        pg.goto(URL)
        pg.wait_for_timeout(1500)
        pg.evaluate("location.hash='#game'")
        pg.wait_for_selector('[data-cabinet]', state='attached', timeout=15000)
        pg.wait_for_timeout(2000)
        pg.screenshot(path=str(SHOTS / f'state_guest_390_{TAG}.png'))
        body = pg.inner_text('#app')
        C.check('guest: the lobby says 先看玩法。登入後才能玩。', '先看玩法。登入後才能玩。' in body, body[:80], base=True)
        C.check('guest: no coin counter is shown (a guest has no coins to count)', pg.evaluate("!document.querySelector('.p30-wallet')") and '我的金幣' not in body, '', base=True)
        n_btn = pg.evaluate("(()=>{" + SHOWN + "return [...document.querySelectorAll('[data-cabinet]')].filter(shown).map(e=>e.querySelector('[data-a28=\"intro\"]').innerText.trim())})()")
        C.check('guest: every card button reads 看玩法', bool(n_btn) and all(t.endswith('看玩法') for t in n_btn), n_btn[:3], base=True)
        open_intro(pg, 'ruins-courier')
        dt = pg.inner_text('#pg-dialog')
        login = pg.evaluate("!!document.querySelector('#pg-dialog a[href=\"#login\"]')")
        C.check('guest intro: a login link, no dead button', login and not dead_buttons(pg, '#pg-dialog'), (login, dead_buttons(pg, '#pg-dialog')))
        C.check('guest intro: keeps the preview caption and the how line', '試玩預覽・不扣幣・不能操作' in dt and pg.evaluate("!!document.querySelector('#pg-dialog .p30-how')"), dt[:120], base=True)
        pg.screenshot(path=str(SHOTS / f'state_guest_intro_390_{TAG}.png'))
        C.check('guest: no console errors', not errs, errs[:3])
        b.close()

        # ===================================================================== round used up + blocked game
        b, ctx, pg, errs = open_page30(p, 390, 844, touch=True)
        pg.goto(URL)
        pg.wait_for_timeout(1000)
        boot_account(pg, coins=60)
        pg.evaluate('__p30.used(5)')
        goto_lobby(pg, filt='全部', open_locked=False)
        pg.screenshot(path=str(SHOTS / f'state_round5_390_{TAG}.png'))
        body = pg.inner_text('#app')
        C.check('round used up: the lobby says why and what to do', '這一輪的 5 局玩完了' in body and '做練習，就能玩下一輪' in body, '', base=True)
        eb = pg.evaluate("""(t)=>{const e=[...document.querySelectorAll('#app button,#app a')].find(x=>x.innerText.trim()===t);return e?{h:e.getBoundingClientRect().height,dis:!!e.disabled}:null}""", EARN)
        C.check('round used up: the lobby offers 去賺金幣：做一個小練習 (enabled, >= 48px)', bool(eb) and not eb['dis'] and eb['h'] >= 48, eb, base=True)
        open_intro(pg, 'ruins-courier')
        dt = pg.inner_text('#pg-dialog')
        C.check('round used up: the intro says so, offers the practice, no dead button',
                '這一輪的 5 局玩完了' in dt and EARN in dt and not dead_buttons(pg, '#pg-dialog'), (dt[-160:], dead_buttons(pg, '#pg-dialog')), base=True)
        pg.screenshot(path=str(SHOTS / f'state_round5_intro_390_{TAG}.png'))
        close_intro(pg)
        pg.evaluate('__p30.used(0)')
        pg.evaluate("__p30.block('ruins-courier')")
        goto_lobby(pg, filt='全部', open_locked=True)
        open_intro(pg, 'ruins-courier')
        dt = pg.inner_text('#pg-dialog')
        C.check('blocked by the parent: the intro has no dead button', not dead_buttons(pg, '#pg-dialog'), (dt[-160:], dead_buttons(pg, '#pg-dialog')))
        pg.screenshot(path=str(SHOTS / f'state_blocked_intro_390_{TAG}.png'))
        close_intro(pg)
        C.check('no console errors (round used up, blocked)', not errs, errs[:3])
        b.close()

        # ===================================================================== other screen sizes
        for w, h in ((768, 1024), (320, 568)):
            b, ctx, pg, errs = open_page30(p, w, h, touch=(w < 700))
            pg.goto(URL)
            pg.wait_for_timeout(1000)
            boot_account(pg, coins=60)
            goto_lobby(pg, filt='全部', open_locked=True)
            pg.screenshot(path=str(SHOTS / f'lobby_all_{w}_{TAG}.png'))
            cols = pg.evaluate("(()=>{" + SHOWN + "const r=[...document.querySelectorAll('[data-cabinet]')].filter(shown).slice(0,12).map(e=>Math.round(e.getBoundingClientRect().left));return [...new Set(r)].length})()")
            C.check(f'{w}x{h}: the lobby has no horizontal scroll', no_hscroll(pg), pg.evaluate('document.documentElement.scrollWidth'))
            if w == 320:
                C.check('320x568: one column', cols == 1, cols, base=True)
                small = pg.evaluate("""()=>{const out=[];for(const e of document.querySelectorAll('#app a[href],#app button,#app summary')){const r=e.getBoundingClientRect();if(r.width<=0||r.height<=0)continue;
                  let ok=true;for(let a=e;a;a=a.parentElement){const cs=getComputedStyle(a);if(cs.display==='none'||cs.visibility==='hidden'||(a.tagName==='DETAILS'&&!a.open&&!(e.closest('summary')&&e.closest('summary').parentElement===a))){ok=false;break;}}
                  if(ok&&(r.height<43.5||r.width<43.5))out.push((e.innerText||'').trim().slice(0,12)+' '+Math.round(r.width)+'x'+Math.round(r.height));}return out;}""")
                C.check('320x568: every tap target in the lobby is >= 44px', not small, small[:4], base=True)
            else:
                C.check('768x1024: several columns of cards', cols >= 2, cols)
            C.check(f'{w}x{h}: no console errors', not errs, errs[:3])
            b.close()
        # ===================================================================== intro: the main button is on screen without scrolling
        for w, h, games, overlap in ((844, 390, IDS, True), (667, 375, IDS, True), (568, 320, IDS[:8], False), (390, 844, IDS[:8], False), (320, 568, IDS, False)):
            b, ctx, pg, errs = open_page30(p, w, h, touch=True)
            pg.goto(URL)
            pg.wait_for_timeout(1000)
            boot_account(pg, coins=60)
            goto_lobby(pg, filt='全部', open_locked=True)
            bad = []
            for gid in games:
                open_intro(pg, gid)
                r = pg.evaluate(INTRO_JS)
                if not r['btn']:
                    bad.append((gid, 'no main button'))
                elif r['btnTop'] < r['dlgTop'] - 0.5 or r['btnBottom'] > r['dlgBottom'] + 0.5 or r['btnBottom'] > r['vh'] + 0.5:
                    bad.append((gid, 'button off screen', round(r['btnTop']), round(r['btnBottom']), round(r['dlgBottom']), r['vh']))
                elif overlap and r['actTop'] is not None and r['textBottom'] > r['actTop'] + 1:
                    bad.append((gid, 'button bar covers the text', round(r['textBottom']), round(r['actTop'])))
                close_intro(pg)
            C.check(f'{w}x{h}: the intro main button is fully on screen without scrolling' + (' and covers no text' if overlap else '') + f' ({len(games)} games)', not bad, bad[:3],
                    base=(w != 390))  # a tall phone has room for it even on the old dialog
            C.check(f'{w}x{h}: no console errors (intro loop)', not errs, errs[:3])
            b.close()
    return C.finish()


if __name__ == '__main__':
    sys.exit(main())
