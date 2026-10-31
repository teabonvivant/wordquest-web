"""R3.30 t61 - the R3.29 leftovers, one business-logic check per fix (what the child / parent sees, not that a function returned something).

  1  奧數講解卡：進頁自動示範不先說出後面預測／問答卡的答案；預測卡答了才示範；結論卡照樣自動播
  2  默書結果：未合格時主按鈕是「再試第 N 級」，升級只在合格時是主按鈕
  3  金幣每日上限（規則頁寫出 10 枚、實際發幣照上限、任務獎勵不計）／字母遊戲用家長合格率過關／學習計劃晶片按地圖位置而非 U56
  4  外觀：轉盤指針不蓋住目標格、街機說明頁空心星對比 ≥ 3:1、無圖詞卡是首字母卡、桌面遊戲星「遊戲街機」字不被星球圖蓋住
  6  service worker 快取名跟 RELEASE（build_r37.py）
  7  奧數錯題圖只由 r37NoteWrong 一處寫入

  WQ33_APP=<app/index.html> python3 r37_tests/t61_r330.py       (screenshots: _team_runs/r330/shots/t61/<phone|desktop>/)"""
import re
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib37 import *  # noqa: E402,F401,F403
from wq33 import unlock_parent  # noqa: E402

C = Checker('t61')
R = Path(__file__).resolve().parent.parent
OUT = R / '_team_runs/r330/shots/t61'


def txt(pg, sel='#app'):
    return pg.evaluate("(s)=>document.querySelector(s)?.innerText||''", sel)


def wtxt(pg):
    return pg.evaluate("document.querySelector('.r80-wbox')?.textContent||''")


def shot(pg, tag, name):
    d = OUT / tag
    d.mkdir(parents=True, exist_ok=True)
    pg.screenshot(path=str(d / (name + '.png')), full_page=False)


def lum(hexc):
    h = hexc.lstrip('#')
    ch = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    ch = [c / 12.92 if c <= .03928 else ((c + .055) / 1.055) ** 2.4 for c in ch]
    return .2126 * ch[0] + .7152 * ch[1] + .0722 * ch[2]


def contrast(a, b):
    la, lb = lum(a), lum(b)
    return (max(la, lb) + .05) / (min(la, lb) + .05)


def rgb_hex(s):
    m = re.findall(r'[\d.]+', s)
    return '#%02x%02x%02x' % tuple(int(float(x)) for x in m[:3])


def play_all(pg, correct=True):
    for _ in range(80):
        ph = ev(pg, 'r37P.phase')
        if ph in ('learn', 'example'):
            pg.click('[data-r37="learn-go"]'); pg.wait_for_timeout(150)
            continue
        if ph != 'quiz':
            break
        q = ev(pg, 'r37P.qs[r37P.i]')
        if q['mode'] == 'mcq':
            pg.evaluate("([a,ok])=>[...document.querySelectorAll('.r37-opt')].find(b=>ok?b.dataset.v===a:b.dataset.v!==a).click()", [q['answer'], correct])
        else:
            pg.fill('#r37-in', q['answer'] if correct else '99999'); pg.keyboard.press('Enter')
        pg.wait_for_timeout(900 if correct else 300)
        if not correct and ev(pg, 'r37P&&r37P.phase') == 'quiz' and pg.query_selector('[data-r37="next"]'):
            ev(pg, 'r37P.fb&&(r37P.fb.lock=0)')
            pg.click('[data-r37="next"]'); pg.wait_for_timeout(200)


def dz_level(pg, correct):
    """run dictation level 1 of group 1 to its result page; every answer right or every answer wrong"""
    go(pg, '#dz', 600)
    ev(pg, "r37DzStart(0,1,true)")
    pg.wait_for_timeout(400)
    for _ in range(12):
        if ev(pg, "r37P&&r37P.phase") != 'quiz':
            break
        ev(pg, "(()=>{const q=r37P.qs[r37P.i];const bad=(q.options||[]).find(o=>o!==q.answer)||'zzz';r37Answer(%s);})()" % ('q.answer' if correct else 'bad'))
        pg.wait_for_timeout(120)
        ev(pg, "r37Next()")
        pg.wait_for_timeout(120)
    pg.wait_for_timeout(500)


def run(p, w, h, touch, tag):
    b, ctx, pg, errs = open_page(p, w, h, touch)
    register(pg, 'r330' + tag, '小明')

    # ================================================================ 1  奧數講解卡：自動示範不洩漏答案
    # p1-1 找規律: card 1 (show) and card 2 (predict) are the same wheel, answer 紅 -> the demo of card 1 would end on 「第 7 個，停在 🔴」
    go(pg, '#oly/1/1/learn?c=1', 2200)
    t = wtxt(pg)
    C.ok('停在' not in t and '目標' in t, f'{tag} 1: card 1 (same wheel as the question after it) does not demonstrate on entry: {t!r}')
    btn = pg.query_selector('[data-r80="replay"]')
    C.ok(btn is not None and '看示範' in btn.inner_text(), f'{tag} 1: card 1 offers 看示範 (replay appears only after it has played)')
    shot(pg, tag, 'b1_card1_held')
    btn.click(); pg.wait_for_timeout(5500)
    C.ok('停在' in wtxt(pg), f'{tag} 1: 看示範 plays it on request: {wtxt(pg)[:60]!r}')
    go(pg, '#oly/1/1/learn?c=2', 1800)
    C.ok('停在' not in wtxt(pg), f'{tag} 1: predict card shows no answer before the child answers: {wtxt(pg)[:60]!r}')
    shot(pg, tag, 'b1_card2_before')
    pg.evaluate("[...document.querySelectorAll('.r80-opt')].find(b=>b.textContent.trim()==='紅').click()"); pg.wait_for_timeout(5500)
    C.ok('停在' in wtxt(pg) and pg.query_selector('.r80-res.ok') is not None, f'{tag} 1: after answering, the predict card demonstrates and confirms: {wtxt(pg)[:60]!r}')
    shot(pg, tag, 'b1_card2_after')
    go(pg, '#oly/1/1/learn?c=4', 1500); pg.wait_for_timeout(4500)
    C.ok('停在' in wtxt(pg) and pg.query_selector('[data-r80="replay"] b').inner_text() == '重播', f'{tag} 1: a conclusion card (different wheel, no question about it) still plays on entry and says 重播: {wtxt(pg)[:60]!r}')
    shot(pg, tag, 'b1_card4_auto')
    d = ev(pg, """(()=>{const out={held:0,auto:0,leak:0,say:''};for(const id of WQOly.order){const u=WQOly.units[id];u.lesson.forEach((c,i)=>{if(c.t!=='show'||!c.scene)return;
        const sp=r80Spoils(u,i);sp?out.held++:out.auto++;
        const later=u.lesson.slice(i+1).some(x=>(x.t==='predict'||x.t==='try')&&x.scene&&x.scene.w===c.scene.w&&JSON.stringify(x.scene.p)===JSON.stringify(c.scene.p));
        if(later&&!sp)out.leak++;});}
        out.say=WQOly.units['p2-3'].lesson[0].say;return out;})()""")
    C.ok(d['leak'] == 0 and d['held'] >= 15 and d['auto'] >= 40, f'{tag} 1: over all 30 units no show card plays on entry when a later question uses the same picture ({d})')
    C.ok('共種' not in d['say'] and '5 棵' not in d['say'], f'{tag} 1: p2-3 card 1 text no longer states the answer of the question after it: {d["say"]!r}')

    # ---- 4d 轉盤指針不蓋住目標格
    go(pg, '#oly/1/1/learn?c=3', 1500)
    g = pg.evaluate("""()=>{const tok=[...document.querySelectorAll('.r80-tok circle')].pop().getBoundingClientRect();
        const cell=[...document.querySelectorAll('.r80-wbox svg text')].find(t=>t.textContent==='🔴').getBoundingClientRect();
        const ov=!(tok.right<=cell.left||tok.left>=cell.right||tok.bottom<=cell.top||tok.top>=cell.bottom);
        return {ov,tok:[tok.left,tok.top,tok.width],cell:[cell.left,cell.top,cell.width],hit:document.querySelector('.r80-tok').getBoundingClientRect().width}}""")
    C.ok(not g['ov'], f'{tag} 4: wheel pointer does not cover the label of the cell it points at {g}')
    C.ok(g['hit'] >= 44 - 1, f'{tag} 4: the pointer keeps a >= 44px touch target ({g["hit"]:.0f}px)')
    shot(pg, tag, 'b4_wheel')

    # ================================================================ 2  默書結果：未合格時主按鈕不是「第 2 級」
    dz_level(pg, False)
    r = ev(pg, "r37P&&r37P.result")
    C.ok(r and r['passed'] is False and r['correct'] == 0, f'{tag} 2: all-wrong level 1 is not passed ({r and (r["correct"], r["passed"])})')
    go_btns = pg.evaluate("[...document.querySelectorAll('.r37-ra .r37-go')].map(b=>[b.dataset.r37,b.querySelector('b').innerText.trim()])")
    C.ok(go_btns == [['retry', '再試第 1 級']], f'{tag} 2: the only main (gold) button below the pass line is 再試第 1 級: {go_btns}')
    sec = pg.evaluate("[...document.querySelectorAll('.r37-ra .r37-sec')].map(b=>[b.dataset.r37,b.querySelector('b').innerText.trim()])")
    C.ok(['dz-go', '重溫字卡'] in sec and ['dz-next', '第 2 級'] in sec, f'{tag} 2: 重溫字卡 and a quiet 第 2 級 are still there: {sec}')
    shot(pg, tag, 'b2_dz_fail')
    pg.click('.r37-ra .r37-go'); pg.wait_for_timeout(500)
    C.ok(ev(pg, "r37P.kind==='dz'&&r37P.dz.lvl===1&&r37P.phase==='quiz'&&r37P.i===0"), f'{tag} 2: the main button starts level 1 again')
    dz_level(pg, True)
    r = ev(pg, "r37P&&r37P.result")
    C.ok(r and r['passed'] is True, f'{tag} 2: all-right level 1 is passed')
    go_btns = pg.evaluate("[...document.querySelectorAll('.r37-ra .r37-go')].map(b=>[b.dataset.r37,b.querySelector('b').innerText.trim()])")
    C.ok(go_btns == [['dz-next', '第 2 級']], f'{tag} 2: after a pass the main button is 第 2 級: {go_btns}')
    C.ok(pg.query_selector('.r37-ra [data-r37="retry"]') is not None and 'r37-sec' in pg.get_attribute('.r37-ra [data-r37="retry"]', 'class'), f'{tag} 2: 再玩 stays a quiet button after a pass')
    shot(pg, tag, 'b2_dz_pass')

    # ================================================================ 3  金幣每日上限
    ev(pg, "(()=>{const o=r37Get();o.day.cn=0;r37Save();})()")
    w0 = ev(pg, "r37Coins()")
    n1 = ev(pg, "r37AddCoins(3)")
    n2 = ev(pg, "r37AddCoins(9)")
    n3 = ev(pg, "r37AddCoins(2)")
    cap = ev(pg, "R37_COIN_CAP")
    C.ok(cap == 10 and n1 == 3 and n2 == 7 and n3 == 0, f'{tag} 3: daily cap {cap}: paid 3, then 7 of 9 asked, then nothing ({n1},{n2},{n3})')
    C.ok(ev(pg, "r37Coins()") == w0 + 10 and ev(pg, "r37CoinToday()") == 10, f'{tag} 3: wallet rose by exactly the cap ({ev(pg, "r37Coins()") - w0})')
    m = ev(pg, "r37AddCoins(2,true)")
    C.ok(m == 2 and ev(pg, "r37Coins()") == w0 + 12 and ev(pg, "r37CoinToday()") == 10, f'{tag} 3: a 每日任務 reward is outside the cap and not counted in it')
    fp = ev(pg, "r37FpsPay(0,3,{stars:5,passed:true})")
    gp = ev(pg, "r37G3Pay('td','english',0,3,{stars:5,passed:true,perItem:[]},[])")
    C.ok(fp == 0 and gp == 0 and ev(pg, "r37Coins()") == w0 + 12, f'{tag} 3: 字母獵場 / 字母砲台 level coins stop at the cap too ({fp},{gp})')
    # a level result says why there is no coin
    ev(pg, "r37StartLevel('math',0,0)"); pg.wait_for_timeout(300)
    play_all(pg, True)
    r = ev(pg, "r37P.result")
    C.ok(r['stars'] == 5 and r['coins'] == 0 and r['capped'] is True and '金幣已達上限' in txt(pg), f'{tag} 3: a 5-star level at the cap pays 0 and the result page says so ({r["stars"]},{r["coins"]},{r["capped"]})')
    shot(pg, tag, 'b3_capped_result')
    pg.click('[data-r37="exit"]'); pg.wait_for_timeout(300)
    # a new Hong Kong day resets the count
    ev(pg, "(()=>{r37Get().day.d='2000-01-01';})()")
    C.ok(ev(pg, "r37CoinToday()") == 0 and ev(pg, "r37AddCoins(4)") == 4, f'{tag} 3: after midnight the cap starts again')
    # the rules page says the same
    go(pg, '#game-settings', 700); unlock_parent(pg); pg.wait_for_timeout(500)
    pg.evaluate("document.querySelectorAll('details').forEach(d=>d.open=true)")
    t = txt(pg)
    C.ok('每日上限' in t and re.search(r'每日合共最多 10 枚', t) and re.search(r'今日已得 4 枚', t) and '不計在上限內' in t, f'{tag} 3: the rules page states the cap (10), today\'s count (4) and that missions are outside it')
    C.ok('每日最多 3 次' in t and '每日最多 2 次' in t and '頭目' not in t, f'{tag} 3: the older per-source limits (3 quick tests, 2 hunts) are still stated, one name 魔王關')
    pg.evaluate("(()=>{const d=document.querySelector('.s60-rules');if(d){d.open=true;d.scrollIntoView({block:'start'});}})()"); pg.wait_for_timeout(300)
    shot(pg, tag, 'b3_coin_rules')

    # ---- 3 學習計劃晶片：按地圖位置（世界·第 N 關、已過關）而不是 U56
    ev(pg, "(()=>{const o=r37Get();o.lv['english:0:0']={best:5,passed:true};r37Save();})()")
    go(pg, '#learning-plan', 600); unlock_parent(pg); pg.wait_for_timeout(700)
    chips = pg.evaluate("[...document.querySelectorAll('.s60-chip')].map(c=>({v:c.dataset.v,t:c.innerText.replace(/\\n/g,' | '),a:c.getAttribute('aria-label')||''}))")
    c56 = [c for c in chips if c['v'] == 'U56'][0]
    wname = ev(pg, "(()=>{const a=r37UnitAt('U56');return R37_TRACKS.english.worlds[a.w].name+' · 第 '+(a.s+1)+' 關'})()")
    C.ok(len(chips) == 80 and not any(re.match(r'^[UT]\d\d\b', c['t']) for c in chips), f'{tag} 3: 80 chips and none starts with its internal code ({chips[55]})')
    C.ok(wname in c56['t'] and '常見不按預期讀音的詞' in c56['t'], f'{tag} 3: the U56 chip names the lesson and where it sits on the map: {c56["t"]!r} (expected {wname})')
    c0 = [c for c in chips if c['v'] == 'U01'][0]
    C.ok('✓' in c0['t'] and c0['a'].endswith('已過關') and '✓' not in c56['t'] and '已過關' not in c56['a'], f'{tag} 3: a passed level is marked ✓ / 已過關 on its chip only ({c0["t"]!r}, {c0["a"]!r})')
    pg.click('.s60-chip[data-v="U05"]')
    C.ok(pg.evaluate("document.querySelector('#l30-plan-unit').value") == 'U05', f'{tag} 3: tapping a chip still selects that unit')
    shot(pg, tag, 'b3_plan_chips')

    # ================================================================ 4  外觀
    # 4a hollow stars on the arcade intro card: >= 3:1 against the card
    go(pg, '#game', 1500)
    pg.evaluate("document.querySelector('[data-a28=intro]').click()"); pg.wait_for_timeout(900)
    cs = pg.evaluate("""()=>{const i=document.querySelector('#pg-dialog .arx-stars i:not(.on)');if(!i)return null;const d=document.querySelector('#pg-dialog .a28-overlaycard')||document.querySelector('#pg-dialog');
        return {star:getComputedStyle(i).color,bg:getComputedStyle(d).backgroundColor,bgi:getComputedStyle(d).backgroundImage.slice(0,120)}}""")
    ratio = contrast(rgb_hex(cs['star']), '#141a46') if cs else 0
    C.ok(cs is not None and ratio >= 3.0, f'{tag} 4: arcade intro hollow stars {cs and cs["star"]} on the dark card = {ratio:.2f}:1 (>= 3:1)')
    shot(pg, tag, 'b4_arcade_intro')
    pg.keyboard.press('Escape'); pg.wait_for_timeout(300)
    pg.evaluate("(()=>{const x=document.querySelector('#pg-dialog');if(x&&x.open)x.close();})()")
    # 4c picture-less word cards show the first letter on a colour tile
    go(pg, '#kid', 300)
    go(pg, '#unit?id=U13', 1200)
    na = pg.evaluate("[...document.querySelectorAll('.l30-noart')].map(e=>({t:e.textContent,k:e.dataset.k,bg:getComputedStyle(e).backgroundColor,c:getComputedStyle(e).color,w:e.getBoundingClientRect().width}))")
    word = pg.evaluate("[...document.querySelectorAll('.l30-word')].filter(w=>w.querySelector('.l30-noart')).map(w=>[w.querySelector('strong').textContent,w.querySelector('.l30-noart').textContent])")
    C.ok(len(na) >= 1 and all(re.fullmatch(r'([A-Z])([a-z])', e[1]) and e[1][0].lower() == e[0][0].lower() for e in word) and not any('Aa' == e['t'] and w[0][0] != 'a' for e, w in zip(na, word)), f'{tag} 4: picture-less cards show their own first letter, not a generic Aa ({word})')
    C.ok(all(re.match(r'^[0-7]$', c['k'] or '') and c['bg'] != 'rgba(0, 0, 0, 0)' and c['w'] >= 40 for c in na), f'{tag} 4: each tile has a colour slot, a filled background and is at least 40px wide ({[(c["k"], c["bg"], round(c["w"])) for c in na]})')
    pal = ['#2F6FD6', '#7B4BC9', '#C23B7A', '#C4491F', '#1A7A63', '#23778F', '#8A5A12', '#5B6AD0']
    C.ok(all(contrast('#ffffff', c) >= 4.5 for c in pal), f'{tag} 4: white letters on every tile colour >= 4.5:1 (min {min(contrast("#ffffff", c) for c in pal):.2f}:1)')
    shot(pg, tag, 'b4_initial_cards')
    # 4b the locked unit button is short enough for a phone
    ovf = pg.evaluate("[...document.querySelectorAll('.r37-ulv')].map(b=>[b.scrollWidth>b.clientWidth+1,b.innerText.trim()])")
    C.ok(all(not o[0] for o in ovf), f'{tag} 4: the 闖關 button on a locked unit does not overflow ({ovf})')
    # 4a games hub: on a wide screen the planet picture stays clear of the tile's label
    go(pg, '#p/games', 1200)
    gm = pg.evaluate("""()=>{const t=document.querySelector('.r37-tile.gold');if(!t)return null;const l=t.querySelector('.r37-tn').getBoundingClientRect(),p=t.querySelector('.r37-tpl');if(!p)return {noplanet:true};const r=p.getBoundingClientRect();
        return {ov:!(r.right<=l.left||r.left>=l.right||r.bottom<=l.top||r.top>=l.bottom),label:[l.left,l.top,l.right,l.bottom],planet:[r.left,r.top,r.right,r.bottom]}}""")
    C.ok(gm is not None and not gm.get('ov'), f'{tag} 4: 遊戲街機 label is not covered by the planet picture {gm}')
    shot(pg, tag, 'b4_games_hub')

    # ================================================================ 7  奧數錯題圖：一處寫入、同題一筆
    go(pg, '#oly/1/1/learn?c=99', 600)
    ev(pg, "(()=>{r37Get().miss=[];})()")
    q = {'mq': {'skill': 'p1-1:a', 'q': '下面的圖形有多少個？', 'svg': '<svg id="x"></svg>'}, 'answer': '3'}
    ev(pg, "r37NoteWrong({track:'olympiad',w:0,s:0},%s,'9')" % __import__('json').dumps(q, ensure_ascii=False))
    ms = ev(pg, "r37Get().miss")
    C.ok(len(ms) == 1 and ms[0]['svg'] == '<svg id="x"></svg>' and ms[0]['q'] == q['mq']['q'], f'{tag} 7: one wrong answer = one record, figure included ({len(ms)} record, svg {ms[0].get("svg") if ms else None!r})')
    C.ok('noteWrong=r37NoteWrong' not in pg.content() and ev(pg, "r37NoteWrong.toString().includes('svg')"), f'{tag} 7: no wrapper around r37NoteWrong any more; the svg is written inside it')
    big = '<svg>' + 'x' * 6100 + '</svg>'
    q2 = {'mq': {'skill': 'p1-1:a', 'q': '很大的圖', 'svg': big}, 'answer': '1'}
    ev(pg, "r37NoteWrong({track:'olympiad',w:0,s:0},%s,'9')" % __import__('json').dumps(q2, ensure_ascii=False))
    C.ok(ev(pg, "r37Get().miss.length") == 2 and ev(pg, "r37Get().miss[1].svg") is None, f'{tag} 7: a figure over the 6000-character limit is not stored (single limit, no second writer bypassing it)')

    # ================================================================ 6  service worker 快取名
    pg2 = pg
    sw = (R / 'app/sw.js').read_text()
    rel = re.search(r"^RELEASE = '([^']+)'", (R / 'tools/build_r37.py').read_text(), re.M).group(1)
    m = re.search(r"SHELL='wordquest-r3-shell-'\+encodeURIComponent\(BASE\.pathname\)\+'-([^']+)'", sw)
    C.ok(m and m.group(1).startswith(rel + '-') and re.fullmatch(re.escape(rel) + r'-[0-9a-f]{8}', m.group(1)) and '-3.20' not in sw, f'{tag} 6: sw.js cache suffix follows RELEASE {rel}: {m and m.group(1)}')
    C.ok("k!==SHELL" in sw and "pre=" in sw, f'{tag} 6: activate drops every older cache of this scope (so the old -3.20 one goes)')
    C.ok(not errs, f'{tag}: no console / page errors {errs[:2]}')
    b.close()


def run_gx_fps():
    """3 / C-09: the letter games pass at the parent's pass rate (not "3 stars = pass")"""
    import json
    import test_fps as F  # noqa: E402  (writes /tmp/fps_test_page.html from r37_src/fps_game.js)
    from playwright.sync_api import sync_playwright as sp
    with sp() as pw:
        for rate, label in ((None, 'default'), (0.9, 'parent 90%'), (0.6, 'parent 60%')):
            b, p, errs = F.new_page(pw, False)
            extra = {} if rate is None else {'passRate': rate}
            p.evaluate("([x])=>boot(1,6,x)", [extra]); p.wait_for_timeout(500)
            p.evaluate("WQ37FPS._cmd('finish',8,2)")   # won, 8 right 2 wrong = 80% accuracy -> 3 stars
            p.wait_for_function("window.finished!==null", timeout=10000)
            r = p.evaluate("window.finished")
            want = {'default': True, 'parent 90%': False, 'parent 60%': True}[label]
            C.ok(r['stars'] == 3 and r['passed'] is want, f'C-09 字母獵場 at 80% accuracy ({label}): 3 stars, passed={r["passed"]} (expected {want})')
            if label == 'parent 90%':
                p.wait_for_selector('.wq37-need', state='attached', timeout=30000)
                t = p.evaluate("document.querySelector('.wq37-need')?.textContent||''")
                C.ok('90%' in t and '才過關' in t, f'C-09 字母獵場 result card says what is needed: {t!r}')
            b.close()
    # the three letter games (GX.Learn): 6 of 8 first try = 75%
    gx = Path(__file__).resolve().parent.parent / 'r37_src/gx_core.js'
    import subprocess
    js = r"""
global.window=undefined;const GX=require(%s);
const W=(en,zh)=>({kind:'word',en,zh});
const items8=['cat','dog','sun','map','pen','cup','hat','bus'].map((e,i)=>W(e,'字'+i));
function run(passRate){const L=GX.Learn({items:items8,seed:2,passRate});let k=0,it;while((it=L.take())){const first=L.stats[it.id].tries===0;L.answer(it,!(first&&k++<2),800);}return L.result({});}
console.log(JSON.stringify([run(undefined),run(0.9),run(0.6)].map(r=>({stars:r.stars,passed:r.passed,rate:r.passRate,fa:r.firstTryAccuracy}))));
""" % json.dumps(str(gx))
    out = subprocess.run(['node', '-e', js], capture_output=True, text=True, timeout=60)
    line = (out.stdout.strip().splitlines() or [''])[-1]
    try:
        rs = json.loads(line)
        C.ok(rs[0]['stars'] == 3 and rs[0]['passed'] is True and rs[1]['passed'] is False and rs[2]['passed'] is True and rs[1]['rate'] == .9, f'C-09 字母砲台 / 字母迷宮 / 字卡征途 (GX.Learn) 75% first try: 3 stars; passes at default and 60%, not at the parent\'s 90% {rs}')
    except Exception:
        C.ok(False, f'C-09 GX.Learn node probe failed: {out.stdout[-200:]} {out.stderr[-300:]}')


if __name__ == '__main__':
    with sync_playwright() as p:
        run(p, 390, 844, True, 'phone')
        run(p, 1440, 900, False, 'desktop')
    run_gx_fps()
    C.done()
