"""p30 lobby / cards / intro dialog / touch-versus-keyboard text (S1-05, S2-03, S2-04, S2-05, S2-06, S2-18, S2-22, S3-04, S3-05).

Run against the new build and against `--base-only`:
    WQ33_APP=/tmp/p30_new/app/index.html  python3 r35_tests/p30_lobby.py
    WQ33_APP=/tmp/p30_base/app/index.html python3 r35_tests/p30_lobby.py
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from p30_lib import (Checker, IDS, KEYBOARD_WORDS, SHOTS, SHOWN, TAG, URL, boot_account, close_intro, goto_lobby, measure, minmax,
                     open_intro, open_page, st, sync_playwright, visible_text)
import re

TOUCH_WORDS = re.compile(r'手指|輕按|輕觸|滑動|拖動|拖住|向.{0,3}滑|劃過')
EARN = '去賺金幣：做一個小練習'


def sel_first(pg, js_sels):
    return pg.evaluate("(s)=>{for(const q of s){const e=document.querySelector(q);if(e)return e}return null}", js_sels) is not None


def tap_scan(pg, scope='#app'):
    """Interactive elements smaller than 44 px (width or height) inside scope."""
    return pg.evaluate("""(scope)=>{
      const root=document.querySelector(scope)||document.body, out=[];
      const vis=e=>{const r=e.getBoundingClientRect();if(r.width<=0||r.height<=0)return false;
        for(let a=e;a;a=a.parentElement){const cs=getComputedStyle(a);if(cs.display==='none'||cs.visibility==='hidden')return false;}return true;};
      for(const e of root.querySelectorAll('a[href],button,summary,input:not([type=hidden]),select,[role=button]')){
        if(!vis(e))continue;const r=e.getBoundingClientRect();
        if(r.height<43.5||r.width<43.5)out.push((e.innerText||e.getAttribute('aria-label')||e.tagName).trim().slice(0,16)+' '+Math.round(r.width)+'x'+Math.round(r.height));}
      return out;}""", scope)


def main():
    C = Checker('p30 lobby, cards, intro dialog, touch/keyboard text')
    with sync_playwright() as p:
        # =============================================================== A. fresh account, 0 coins, phone 390x844
        b, ctx, pg, errs = open_page(p, 390, 844, touch=True)
        pg.goto(URL)
        pg.wait_for_timeout(1000)
        boot_account(pg, coins=None)
        C.check('fresh account really has 0 coins', st(pg)['stars'] == 0, st(pg)['stars'])
        goto_lobby(pg, open_locked=False)
        pg.screenshot(path=str(SHOTS / ('lobby_0coin_390_' + TAG + '.png')))

        big = pg.evaluate("""(()=>{const e=document.querySelector('.p30-wallet strong')||document.querySelector('.a28-wallet strong');
          if(!e)return null;const r=e.getBoundingClientRect();return {fs:parseFloat(getComputedStyle(e).fontSize),top:r.top}})()""")
        C.check('S2-05 big coin count at the top (>= 48px, in the first screen)', bool(big) and big['fs'] >= 48 and big['top'] < 420, big, base=True)
        body = pg.inner_text('body')
        C.check('S1-05 slogan at 0 coins: 做練習，賺金幣，就可以玩', '做練習，賺金幣，就可以玩' in body, '', base=True)
        eb = pg.evaluate("""(t)=>{const e=[...document.querySelectorAll('#app button,#app a')].find(x=>x.innerText.trim()===t);
          if(!e)return null;const r=e.getBoundingClientRect();return {h:r.height,w:r.width,dis:!!e.disabled,l30:e.dataset.l30||'',tag:e.tagName}}""", EARN)
        C.check('S1-05 primary button 去賺金幣：做一個小練習 is enabled, >= 48px high, full width',
                bool(eb) and not eb['dis'] and eb['h'] >= 48 and eb['w'] >= 390 * 0.8, eb, base=True)
        C.check('S1-05 note under it: 做完 1 組練習得 1 枚金幣', '做完 1 組練習得 1 枚金幣' in body, '', base=True)
        vis_cab = pg.evaluate("(()=>{" + SHOWN + "return [...document.querySelectorAll('[data-cabinet]')].filter(shown).map(e=>e.dataset.cabinet)})()")
        C.check('S2-05 main list shows only the 3 playable games (locked ones are folded)', len(vis_cab) == 3, vis_cab, base=True)
        fold = pg.evaluate("""(()=>{const d=document.querySelector('details.p30-locked');
          return d?{open:d.open,sum:d.querySelector('summary').innerText.replace(/\\s+/g,' '),n:d.querySelectorAll('[data-cabinet]').length}:null})()""")
        C.check('S2-05 locked games sit in a collapsed 還沒開放 section with 做練習解鎖',
                bool(fold) and not fold['open'] and '還沒開放' in fold['sum'] and '做練習解鎖' in fold['sum'] and fold['n'] == 2, fold, base=True)
        cols = pg.evaluate("(()=>{" + SHOWN + "return [...document.querySelectorAll('[data-cabinet]')].filter(shown).map(e=>{const r=e.getBoundingClientRect();return [Math.round(r.left),Math.round(r.width)]})})()")
        C.check('S2-05 single column on a phone (same left edge, >= 85% of the width)',
                len({c[0] for c in cols}) == 1 and all(c[1] >= 390 * 0.85 for c in cols), cols, base=True)
        hid = pg.evaluate("(()=>{" + SHOWN + """const q=s=>{const e=document.querySelector(s);return !e||!shown(e)};
          return {strip:q('.a28-status-strip'),ward:q('.a28-wardrobe'),rules:q('details.a28-rules > summary'),rec:q('details.r2-records > summary')}})()""")
        C.check('S2-05 stats, costume, rules, records are collapsed by default', all(hid.values()), hid, base=True)
        pg.evaluate("document.querySelector('details.p30-more')&&(document.querySelector('details.p30-more').open=true)")
        pg.wait_for_timeout(300)
        shown = pg.evaluate("(()=>{" + SHOWN + """const q=s=>{const e=document.querySelector(s);return !!e&&shown(e)};
          return {strip:q('.a28-status-strip'),ward:q('.a28-wardrobe'),rules:q('details.a28-rules > summary'),rec:q('details.r2-records > summary'),parent:q('a[href="#game-settings"]')}})()""")
        C.check('S2-05 the folded section holds stats, costume, rules, records and the parent link', all(shown.values()), shown)
        pg.evaluate("document.querySelector('details.p30-more')&&(document.querySelector('details.p30-more').open=false)")
        cardtxt = pg.evaluate("(()=>{" + SHOWN + """const c=[...document.querySelectorAll('[data-cabinet]')].filter(shown);
          return c.map(e=>({btn:e.querySelector('[data-a28="intro"]').innerText.replace(/\\s+/g,' ').trim(),t:e.innerText}))})()""")
        C.check('S2-22 card button 看玩法 with the note 玩一次 1 枚金幣',
                bool(cardtxt) and all(c['btn'].endswith('看玩法') and '玩一次 1 枚金幣' in c['t'] for c in cardtxt), cardtxt[:1], base=True)
        one_btn = pg.evaluate("(()=>{" + SHOWN + "return [...document.querySelectorAll('[data-cabinet]')].filter(shown).map(e=>e.querySelectorAll('button').length)})()")
        C.check('S2-05 each playable card has exactly one button', all(n == 1 for n in one_btn), one_btn)
        # intro at 0 coins, for an unlocked game
        open_intro(pg, 'ruins-courier')
        pg.screenshot(path=str(SHOTS / ('intro_0coin_390_' + TAG + '.png')))
        dtxt = pg.inner_text('#pg-dialog')
        C.check('S1-05 intro says 已解鎖。玩一次要 1 枚金幣，你現在有 0 枚。', '已解鎖。玩一次要 1 枚金幣，你現在有 0 枚。' in dtxt, '', base=True)
        dis = pg.evaluate("[...document.querySelectorAll('#pg-dialog button:disabled')].map(b=>b.innerText.trim())")
        C.check('S1-05 no dead disabled button in the intro at 0 coins', len(dis) == 0, dis, base=True)
        C.check('S1-05 the intro offers 去賺金幣：做一個小練習 and its note', EARN in dtxt and '做完 1 組練習得 1 枚金幣' in dtxt, '', base=True)
        close_intro(pg)
        # earn button wiring (does not change the coin policy)
        pg.evaluate("window.scrollTo(0,0)")
        loc = pg.locator('[data-p30="earn"]')
        if loc.count():
            loc.first.click()
            pg.wait_for_function("location.hash.startsWith('#learning')", timeout=8000)
            pg.wait_for_timeout(500)
            C.check('S1-05 the earn button starts today\'s lesson (route learning, a session exists)',
                    pg.evaluate("!!__p40.l30()") and pg.evaluate("location.hash.startsWith('#learning')"), pg.evaluate('location.hash'), base=True)
            C.check('S1-05 coin policy untouched: still 0 coins after starting the lesson', st(pg)['stars'] == 0, st(pg)['stars'])
        else:
            C.check('S1-05 the earn button starts today\'s lesson (route learning, a session exists)', False, 'no earn button', base=True)
            C.check('S1-05 coin policy untouched: still 0 coins after starting the lesson', st(pg)['stars'] == 0, st(pg)['stars'])
        # locked game intro at 0 coins
        pg.evaluate("location.hash='#game'")
        goto_lobby(pg, open_locked=True)
        open_intro(pg, 'star-patrol')
        dtxt = pg.inner_text('#pg-dialog')
        dis = pg.evaluate("[...document.querySelectorAll('#pg-dialog button:disabled')].length")
        C.check('S1-05 locked game intro: says why and offers 做練習解鎖', '還沒開放' in dtxt and '做練習解鎖' in dtxt and dis == 0, dtxt[-120:], base=True)
        close_intro(pg)
        C.check('no console errors (0-coin lobby and intro)', not errs, errs[:3])

        # =============================================================== B. 60 coins: lobby scan over all 26 cards
        pg.evaluate('__p40.reset(60)')
        goto_lobby(pg, filt='全部', open_locked=True)
        n_cab = pg.evaluate("document.querySelectorAll('[data-cabinet]').length")
        C.check('全部 shows all 26 cabinets', n_cab == 26, n_cab)
        pg.screenshot(path=str(SHOTS / ('lobby_all_390_' + TAG + '.png')))
        desc = measure(pg, ['.p30-desc', '.a28-cabinet:not(.p30-card) .a28-cabinet-body > p'])
        badge = measure(pg, ['.p30-badge', '.a28-state'])
        buddy = measure(pg, ['.wq32-cabinet-buddy span'])
        label = measure(pg, ['.p30-note', '.a28-cabinet:not(.p30-card) .a28-cabinet-body > small'])
        allt = measure(pg, ['[data-cabinet] *'])
        names = measure(pg, ['[data-cabinet] h3'])
        print('  numbers  (min..max over the cards)  new vs base are in the two runs of this suite')
        for nm, rows in (('description', desc), ('state badge', badge), ('buddy line', buddy), ('status label', label), ('all card text', allt)):
            print(f'  [{nm}] n={len(rows)} font {minmax(rows, "fs")} contrast {minmax(rows, "ratio")}')
        C.check('S2-04 26 card descriptions measured', len(desc) == 26, len(desc))
        C.check('S2-04 card description >= 14px', desc and min(r['fs'] for r in desc) >= 14, minmax(desc, 'fs'), base=True)
        C.check('S2-04 card description contrast >= 4.5:1 on its background (all 26)', desc and min(r['ratio'] for r in desc) >= 4.5, minmax(desc, 'ratio'), base=True)
        C.check('S2-04 已開放 is a solid badge with contrast >= 4.5:1 (all)', badge and min(r['ratio'] for r in badge) >= 4.5 and min(r['fs'] for r in badge) >= 14, (minmax(badge, 'ratio'), minmax(badge, 'fs')), base=True)
        C.check('S2-04 陪你看玩法 line >= 14px and >= 4.5:1 (all)', buddy and min(r['fs'] for r in buddy) >= 14 and min(r['ratio'] for r in buddy) >= 4.5, (minmax(buddy, 'fs'), minmax(buddy, 'ratio')), base=True)
        C.check('S2-04 smallest text on any card is 14px', allt and min(r['fs'] for r in allt) >= 14, minmax(allt, 'fs'), base=True)
        C.check('S2-04 every text on a card has contrast >= 4.5:1 (card names are large text)', allt and min(r['ratio'] for r in allt) >= 4.5, minmax(allt, 'ratio'), base=True)
        small = tap_scan(pg)
        print('  tap targets under 44px in the lobby:', len(small), small[:6])
        C.check('S2-03 every tap target in the lobby is >= 44px', not small, small[:6], base=True)
        # back to top
        pg.evaluate("window.scrollTo(0,2400)")
        pg.wait_for_timeout(500)
        tb = pg.evaluate("""(()=>{const e=document.getElementById('p30-top');if(!e)return null;const r=e.getBoundingClientRect();
          return {vis:e.offsetParent!==null||getComputedStyle(e).display!=='none',w:r.width,h:r.height,t:e.innerText.trim(),y:Math.round(scrollY)}})()""")
        C.check('S2-18 回到頂部 shows on the long lobby, >= 48px', bool(tb) and tb['vis'] and tb['h'] >= 48 and tb['w'] >= 48 and tb['t'] == '回到頂部', tb, base=True)
        if tb:
            pg.locator('#p30-top').click()
            pg.wait_for_function('scrollY<20', timeout=4000)
            C.check('S2-18 回到頂部 scrolls to the top', pg.evaluate('scrollY') < 20, pg.evaluate('scrollY'), base=True)
            pg.wait_for_timeout(300)
            top_vis = pg.evaluate("(()=>{const e=document.getElementById('p30-top');return !!e&&getComputedStyle(e).display!=='none'})()")
            C.check('S2-18 the button hides again at the top', not top_vis, top_vis, base=True)
        else:
            C.check('S2-18 回到頂部 scrolls to the top', False, 'no button', base=True)
            C.check('S2-18 the button hides again at the top', False, 'no button', base=True)

        # =============================================================== C. intro dialog, 26 games, phone (touch-only text)
        phone_bad, phone_n, close_bad, cap_bad, buy_bad, font_bad, kb_old = [], 0, [], [], [], [], []
        gm = pg.evaluate("window.WQ35A&&window.WQ35A.GM")
        pg.evaluate('__p40.reset(60)')
        goto_lobby(pg, filt='全部', open_locked=True)
        for gid in IDS:
            open_intro(pg, gid)
            info = pg.evaluate("""()=>{const d=document.querySelector('#pg-dialog');
              const how=d.querySelector('.p30-how');const old=d.querySelector('.a28-dialog-content > p');
              const cl=d.querySelector('[data-a28="close"]');const cr=cl.getBoundingClientRect(),cs=getComputedStyle(cl);
              const cap=d.querySelector('.a28-preview > span');
              const buy=d.querySelector('[data-a28="buy"]');
              const before=buy&&buy.parentElement.querySelector('.p30-before');
              return {how:how?how.innerText.trim():null, oldp:old?old.innerText.trim():null,
               close:{w:cr.width,h:cr.height,bw:parseFloat(cs.borderTopWidth),t:cl.innerText.replace(/\\s+/g,'')},
               cap:cap?cap.innerText.trim():null, buy:buy?buy.innerText.replace(/\\s+/g,' ').trim():null,
               before:before?before.innerText.trim():null, beforeFirst:!!(before&&before.nextElementSibling===buy)}}""")
            phone_n += 1
            want = gm[gid]['t'] if gm else None
            if info['how'] != want or KEYBOARD_WORDS.search(info['how'] or '') or not info['how']:
                phone_bad.append((gid, info['how']))
            if info['oldp'] and KEYBOARD_WORDS.search(info['oldp']) and not info['how']:
                kb_old.append(gid)
            c = info['close']
            if not (c['w'] >= 47.5 and c['h'] >= 47.5 and c['bw'] >= 2 and '✕' in c['t'] and '關閉' in c['t']):
                close_bad.append((gid, c))
            if info['cap'] != '試玩預覽・不扣幣・不能操作':
                cap_bad.append((gid, info['cap']))
            if not (info['buy'] and info['buy'].endswith('用 1 枚金幣開始') and info['before'] == '按下去才會扣 1 枚金幣' and info['beforeFirst']):
                buy_bad.append((gid, info['buy'], info['before']))
            dm = measure(pg, ['#pg-dialog .a28-dialog-content *', '#pg-dialog .a28-dialog-top *'])
            if dm and min(r['fs'] for r in dm) < 14:
                font_bad.append((gid, minmax(dm, 'fs')))
            if gid in ('ruins-courier', 'forest-band'):
                pg.screenshot(path=str(SHOTS / f'intro_{gid}_390_{"new" if gm else "base"}.png'))
            close_intro(pg)
        old_kb = [gid for gid in IDS if gid in kb_old]
        print(f'  base wording: {len(old_kb)} of 26 intro paragraphs hold keyboard words on a phone' if not gm else '')
        C.check('S2-06 phone intro: the first line is the touch sentence of the game, no key names (26/26)', not phone_bad and phone_n == 26, phone_bad[:3], base=True)
        C.check('S3-04 intro 關閉 is a bordered 48x48+ button with ✕ and the word (26/26)', not close_bad, close_bad[:2], base=True)
        C.check('S3-05 preview caption 試玩預覽・不扣幣・不能操作 (26/26)', not cap_bad, cap_bad[:2], base=True)
        C.check('S2-22 intro main button 用 1 枚金幣開始 with 按下去才會扣 1 枚金幣 right above it (26/26)', not buy_bad, buy_bad[:2], base=True)
        C.check('S2-04 intro dialog text >= 14px (26/26)', not font_bad, font_bad[:2], base=True)
        C.check('no console errors (phone intro loop)', not errs, errs[:3])
        b.close()

        # =============================================================== D. desktop (pointer: fine): keyboard sentence only
        b, ctx, pg, errs = open_page(p, 1280, 800, touch=False)
        pg.goto(URL)
        pg.wait_for_timeout(1000)
        boot_account(pg, coins=60)
        goto_lobby(pg, filt='全部', open_locked=True)
        pg.screenshot(path=str(SHOTS / ('lobby_all_1280_' + TAG + '.png')))
        fine_bad, fine_n = [], 0
        for gid in IDS:
            open_intro(pg, gid)
            how = visible_text(pg, '#pg-dialog .p30-how')
            fine_n += 1
            if not gm or how != gm[gid]['k'] or TOUCH_WORDS.search(how or ''):
                fine_bad.append((gid, how))
            close_intro(pg)
        C.check('S2-06 desktop intro: the first line is the keyboard / mouse sentence, no finger words (26/26)', not fine_bad and fine_n == 26, fine_bad[:3], base=True)
        cols = pg.evaluate("(()=>{" + SHOWN + "const r=[...document.querySelectorAll('[data-cabinet]')].filter(shown).slice(0,9).map(e=>Math.round(e.getBoundingClientRect().left));return [...new Set(r)].length})()")
        C.check('desktop lobby uses several columns', cols >= 3, cols)
        C.check('no console errors (desktop)', not errs, errs[:3])
        b.close()
    return C.finish()


if __name__ == '__main__':
    sys.exit(main())
