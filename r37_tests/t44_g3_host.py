"""R3.21 t44 - host integration of the three learning games (字母砲台 td / 字母迷宮 mz / 字卡征途 cd): hub tiles, level maps (subject switch, 8 English / 6 maths worlds),
unlock rules, item hand-over (English unit words / WQ37Math items with working check()), review items, rewards (first pass, boss, 5 stars, no double pay),
wrong-bank and maths-miss feed (the learning loop), next/exit navigation, guests, destroy on leaving, one-screen layout at four sizes.
The game libraries are replaced by spies: the games themselves are covered by t41-t43."""
import json
import os
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from lib37 import *  # noqa: E402,F401,F403

C = Checker('t44')
SPY = "(()=>{window.__g3=[];window.__g3d=0;for(const [k,n] of [['td','WQ37TD'],['mz','WQ37Maze'],['cd','WQ37Card']])globalThis[n]={start(b,o){window.__g3.push({g:k,o});return {destroy(){window.__g3d++;}};}};})()"
LAST = "window.__g3[window.__g3.length-1].o"


def spy(pg):
    ev(pg, SPY)


def no_scroll(pg):
    return pg.evaluate("document.documentElement.scrollHeight<=innerHeight+1&&document.documentElement.scrollWidth<=innerWidth+1")


def nodes(pg):
    return pg.evaluate("[...document.querySelectorAll('.r37-node')].map(n=>n.classList.contains('lock')?'L':'o').join('')")


def per_item(pg, miss_ids=(), rv=False):
    return ev(pg, f"{LAST}.items.map(x=>({{id:x.id,rv:false,en:x.en||'',zh:x.zh||'',q:x.q||'',a:x.a||'',tries:1,firstOk:!{json.dumps(list(miss_ids))}.includes(x.id),ok:true,missed:{json.dumps(list(miss_ids))}.includes(x.id)?1:0,ms:900}}))")


def finish(pg, stars, passed, miss_ids=()):
    pi = per_item(pg, miss_ids)
    return pg.evaluate(f"(a)=>{LAST}.onFinish({{stars:a[0],passed:a[1],perItem:a[2]}})", [stars, passed, pi])


with sync_playwright() as p:
    # ================================================================ family account, phone
    b, ctx, pg, errs = open_page(p, 390, 844, True)
    register(pg, 'r37g3host', '小明')
    spy(pg)
    ev(pg, 'r37Get().wrong=[];r37Get().miss=[]')
    go(pg, '#p/games', 500)
    for g, name in (('td', '字母砲台'), ('mz', '字母迷宮'), ('cd', '字卡征途')):
        C.ok(pg.evaluate(f"(()=>{{const a=document.querySelector('a.r37-tile[href=\"#lv/{g}\"]');return !!a&&a.textContent.includes('{name}')}})()"), f'games hub: {name} tile opens #lv/{g}')
    C.ok(pg.evaluate("!!document.querySelector('a.r37-tile[href=\"#lv/fps\"]')&&!!document.querySelector('a.r37-tile[href=\"#lv/runner\"]')"), 'games hub keeps 字母獵場 and 星際跑酷')

    # ---------------------------------------------------------------- map: English
    go(pg, '#lv/td', 500)
    C.ok(pg.evaluate("document.querySelectorAll('.r37-wtab').length") == 8, 'td map (English): 8 world tabs')
    C.ok(pg.evaluate("document.querySelector('.r37-wtitle h1').textContent") == '字母砲台', 'td map: title is the game name')
    C.ok(pg.evaluate("document.querySelectorAll('.r37-node').length") == 10 and pg.evaluate("document.querySelectorAll('.r37-node.boss').length") == 1, 'td map: 10 nodes, node 10 is the boss')
    C.ok(nodes(pg) == 'oLLLLLLLLL', f'fresh child: only the first node is open: {nodes(pg)}')
    C.ok(pg.evaluate("document.querySelector('.r37-node.cur').dataset.s") == '0', 'the open first node is the current one')
    C.ok(pg.evaluate("document.querySelector('.r37-gsub .on').textContent.trim()") == '英文', 'English is the default subject')
    titles = pg.evaluate("[...document.querySelectorAll('.r37-node .r37-nu')].map(s=>s.textContent)")
    C.ok(titles == ev(pg, "Array.from({length:10},(_,s)=>LIB30.units.get(r37UnitId(0,s)).title)"), 'English nodes carry the unit titles')

    # unlock rules: previous level of the same game+subject, or the matching English unit passed
    ev(pg, "(()=>{const o=r37Get();o.lv['td-en:0:0']={best:3,passed:true,at:'x'};r37Save();})();render()")
    C.ok(nodes(pg) == 'ooLLLLLLLL', f'td-en 0:0 passed opens 0:1: {nodes(pg)}')
    ev(pg, "(()=>{const o=r37Get();o.lv['english:0:4']={best:3,passed:true,at:'x'};r37Save();})();render()")
    C.ok(nodes(pg) == 'ooLLoLLLLL', f'a passed English unit (0:4) opens the same level in td: {nodes(pg)}')
    C.ok(ev(pg, "r37G3Open('mz','english',0,4)") is True and ev(pg, "r37G3Open('mz','english',0,2)") is False, 'unlocks are per game: mz-en 0:4 opens via the English unit, 0:2 stays locked')
    C.ok(ev(pg, "r37G3Open('td','math',0,0)") is True and ev(pg, "r37G3Open('td','math',0,1)") is False and ev(pg, "r37G3Open('td','math',0,0)&&r37G3Open('td','english',0,1)") is True, 'subjects are separate tracks (td-ma 0:1 is locked while td-en 0:1 is open)')
    ev(pg, "(()=>{const o=r37Get();for(let s=0;s<10;s++)o.lv['td-en:0:'+s]={best:3,passed:true,at:'x'};r37Save();})();render()")
    C.ok(ev(pg, "r37G3Open('td','english',1,0)") is True and ev(pg, "r37G3WorldOpen('td','english',1)") is True and ev(pg, "r37G3WorldOpen('td','english',2)") is False, 'clearing the boss opens the next world only')
    C.ok(pg.evaluate("document.querySelectorAll('.r37-wtab:not([disabled])').length") == 2, 'tabs: world 1 and world 2 are open')

    # ---------------------------------------------------------------- map: maths
    pg.click('.r37-gsub button[data-subj="math"]'); pg.wait_for_timeout(400)
    C.ok(pg.evaluate("document.querySelectorAll('.r37-wtab').length") == 6, 'td map (maths): 6 world tabs')
    C.ok('小一二' in pg.evaluate("document.querySelector('.r37-wtitle small').textContent"), 'maths world 1 is labelled with its grade 小一二')
    C.ok(pg.evaluate("document.querySelector('.r37-gsub .on').dataset.subj") == 'math' and pg.evaluate("document.querySelector('.r37-gsub button[data-subj=\"math\"]').getAttribute('aria-pressed')") == 'true', 'subject switch is pressed on maths')
    C.ok(nodes(pg) == 'oLLLLLLLLL', f'maths track is independent: only the first node is open: {nodes(pg)}')
    ev(pg, "(()=>{const o=r37Get();o.lv['math:0:1']={best:3,passed:true,at:'x'};r37Save();})();render()")
    C.ok(nodes(pg) == 'oLLLLLLLLL' or nodes(pg)[1] == 'o', 'a passed maths level opens the same level in td-ma')
    C.ok(nodes(pg)[1] == 'o', f'maths level 0:1 passed opens td-ma 0:1: {nodes(pg)}')

    # ---------------------------------------------------------------- start a level: items hand-over
    go(pg, '#lv/td', 300); pg.click('.r37-gsub button[data-subj="english"]'); pg.wait_for_timeout(300)
    pg.click('.r37-node[data-s="0"]'); pg.wait_for_timeout(500)
    C.ok(ev(pg, 'location.hash') == '#g3/play' and pg.evaluate("!!document.querySelector('#r37-g3-box')") and pg.evaluate("document.body.classList.contains('r37-playing')"), 'node opens the full-screen #g3/play box')
    o = pg.evaluate(f"(()=>{{const o={LAST};return {{subj:o.subject,n:o.items.length,boss:o.level.boss,s:o.level.s,w:o.level.w,grade:o.level.grade,diff:o.difficulty,mode:o.mode,i0:o.items[0],rv:o.review.length,nx:typeof o.onNext,fin:typeof o.onFinish,ex:typeof o.onExit,sy:typeof o.syllables,assets:o.assetBase,ch:o.character&&o.character.id,seed:typeof o.seed}}}})()")
    ws = ev(pg, "r37EnStage(0,0).map(x=>x.en)")
    C.ok(o['subj'] == 'english' and o['n'] == 8 and pg.evaluate(f"{LAST}.items.map(x=>x.en)") == ws, f'English level 0:0 passes exactly the unit words ({o["n"]})')
    C.ok(o['i0']['kind'] == 'word' and o['i0']['zh'] and o['i0']['id'].startswith('e:'), f'English item carries kind/zh/id {o["i0"]}')
    C.ok(o['diff'] == ev(pg, "r37DiffN('english')") and o['mode'] == 'level' and o['grade'] == ev(pg, "R37_TRACKS.english.worlds[0].name") and not o['boss'], f'difficulty follows the parent English setting; grade label = the map world name (R3.29 C-16) {o["grade"]}')
    C.ok(o['rv'] == 0, 'level 0:0 has no review items')
    C.ok(o['nx'] == 'function' and o['fin'] == 'function' and o['ex'] == 'function' and o['sy'] == 'function' and o['assets'] == 'assets/r321/' and o['ch'] == 'panda', 'opts carry onNext/onFinish/onExit/syllables/assetBase/character')

    # ---------------------------------------------------------------- rewards
    c0 = ev(pg, 'r37Coins()')
    r = finish(pg, 4, True)
    e = ev(pg, "r37Get().lv['td-en:0:0']")
    C.ok(r == 0 and ev(pg, 'r37Coins()') == c0, f'first pass is worth 1 coin only for NEW levels: td-en 0:0 was already passed in this test -> coin {r}')
    ev(pg, "(()=>{const o=r37Get();delete o.lv['td-en:0:0'];r37Save();})()")
    r = finish(pg, 4, True)
    C.ok(r == 1 and ev(pg, 'r37Coins()') == c0 + 1, f'first pass of a level pays 1 coin ({r})')
    r = finish(pg, 5, True)
    C.ok(r == 1 and ev(pg, "r37Get().lv['td-en:0:0'].five") is True, f'first 5 stars pays +1 more ({r})')
    r = finish(pg, 5, True); r2 = finish(pg, 2, False)
    C.ok(r == 0 and r2 == 0, 'replays never pay again')
    e = ev(pg, "r37Get().lv['td-en:0:0']")
    C.ok(e['best'] == 5 and e['passed'] is True and e['at'], f'a worse replay keeps best and passed {e}')
    C.ok(ev(pg, "JSON.parse(localStorage.getItem(r37Key())).lv['td-en:0:0'].best") == 5, 'entry is persisted for the child')
    C.ok(ev(pg, "r37TrackProgress('english').done") == ev(pg, "[0,1,2,3,4,5,6,7].reduce((a,w)=>a+r37WorldDone('english',w),0)"), 'game entries do not count as English lesson progress')
    # failed run: no pass, no coin
    ev(pg, "(()=>{const o=r37Get();delete o.lv['td-en:0:1'];r37Save();})()")
    ev(pg, "r37G3Pay('td','english',0,1,{stars:2,passed:false,perItem:[]},[])")
    C.ok(not ev(pg, "r37Get().lv['td-en:0:1'].passed") and ev(pg, "r37Get().lv['td-en:0:1'].best") == 2, 'stars below 3: entry saved, not passed')
    # boss level pays 3
    ev(pg, "(()=>{const o=r37Get();for(let s=0;s<9;s++)o.lv['cd-en:0:'+s]={best:3,passed:true,at:'x'};r37Save();})()")
    c1 = ev(pg, 'r37Coins()'); r = ev(pg, "r37G3Pay('cd','english',0,9,{stars:3,passed:true,perItem:[]},[])")
    C.ok(r == 3 and ev(pg, 'r37Coins()') == c1 + 3, f'boss level first pass pays 1 + 2 = 3 ({r})')

    # ---------------------------------------------------------------- learning loop: wrong bank + daily counters
    ev(pg, 'r37Get().wrong=[];r37Get().miss=[]')
    pg.evaluate("location.hash='#lv/mz'"); pg.wait_for_timeout(300)
    pg.click('.r37-node[data-s="0"]'); pg.wait_for_timeout(500)
    ids = ev(pg, f"{LAST}.items.map(x=>x.id)")
    en0 = ev(pg, f"{LAST}.items[0].en")
    d0 = ev(pg, 'r37Get().day.correct'); e0 = ev(pg, 'r37Get().day.enok')
    finish(pg, 3, True, miss_ids=[ids[0]])
    w = ev(pg, 'r37Get().wrong')
    C.ok(len(w) == 1 and w[0]['en'] == en0 and w[0]['n'] == 1 and w[0]['zh'], f'a first-try miss goes into the wrong bank {w}')
    C.ok(ev(pg, 'r37Get().day.correct') == d0 + 7 and ev(pg, 'r37Get().day.enok') == e0 + 7, 'first-try hits (7) count for the daily missions')
    finish(pg, 3, True, miss_ids=[ids[0]])
    C.ok(ev(pg, 'r37Get().wrong')[0]['n'] == 2, 'missing it again raises its count')
    ev(pg, "r37Get().wrong[0].n=1")
    finish(pg, 5, True)
    C.ok(len(ev(pg, 'r37Get().wrong')) == 0, 'a first-try hit clears a word that was missed only once')

    # ---------------------------------------------------------------- review items (spaced review)
    ev(pg, "(()=>{const o=r37Get();for(let s=0;s<3;s++)o.lv['cd-en:0:'+s]={best:3,passed:true,at:'x'};r37Save();})()")
    ev(pg, "(r37Mem._gw=r37Mem._gw||{})['cd-en']=0"); pg.evaluate("location.hash='#lv/cd'"); pg.wait_for_timeout(300)
    pg.click('.r37-node[data-s="3"]'); pg.wait_for_timeout(500)
    rv = pg.evaluate(f"({LAST}.review||[]).map(x=>x.en)"); cur = pg.evaluate(f"{LAST}.items.map(x=>x.en)")
    C.ok(len(rv) == 2 and not set(rv) & set(cur) and set(rv) <= set(ev(pg, "r37EnStage(0,2).map(x=>x.en)")), f'level 4 gets 2 review words from the previous level, none duplicated {rv}')
    ev(pg, "r37Get().wrong=[{en:'zebra',zh:'斑馬',w:0,s:1,at:Date.now(),n:3}]")
    pg.evaluate("location.hash='#lv/cd'"); pg.wait_for_timeout(300); pg.click('.r37-node[data-s="3"]'); pg.wait_for_timeout(500)
    rv = pg.evaluate(f"({LAST}.review||[]).map(x=>x.en)")
    C.ok(rv[0] == 'zebra', f'a word in the wrong bank is the first review word {rv}')

    # ---------------------------------------------------------------- next / exit / leaving
    n0 = ev(pg, 'window.__g3.length')
    pg.evaluate(f"{LAST}.onNext()"); pg.wait_for_timeout(300)
    C.ok(ev(pg, 'window.__g3.length') == n0 + 1 and ev(pg, f"{LAST}.level.s") == 4, 'onNext starts the next level (s 3 -> 4) when it is open')
    d = ev(pg, 'window.__g3d')
    pg.evaluate(f"{LAST}.onExit()"); pg.wait_for_timeout(400)
    C.ok(ev(pg, 'location.hash') == '#lv/cd' and ev(pg, 'window.__g3d') > d, 'exit returns to the map and destroys the game')
    pg.click('.r37-node[data-s="1"]'); pg.wait_for_timeout(400); d = ev(pg, 'window.__g3d')
    go(pg, '#p/games', 300)
    C.ok(ev(pg, 'window.__g3d') == d + 1, 'leaving #g3/play by any route destroys the game once')
    go(pg, '#g3/play', 300); ev(pg, "r37G3Sel=null"); go(pg, '#kid', 300); go(pg, '#g3/play', 400)
    C.ok(ev(pg, 'location.hash') == '#p/games', '#g3/play without a selection falls back to the games star')

    # ---------------------------------------------------------------- maths hand-over
    go(pg, '#lv/mz', 300); pg.click('.r37-gsub button[data-subj="math"]'); pg.wait_for_timeout(300)
    pg.click('.r37-node[data-s="0"]'); pg.wait_for_timeout(500)
    m = pg.evaluate(f"(()=>{{const o={LAST};return {{subj:o.subject,n:o.items.length,grade:o.level.grade,diff:o.difficulty,rv:o.review.length,it:o.items.map(x=>({{kind:x.kind,q:!!x.q,a:x.a,pad:x.pad,hasCheck:typeof x.check==='function',okRight:x.check(x.a),okWrong:x.check('99999.7'),sk:x.skill,id:x.id}}))}}}})()")
    C.ok(m['subj'] == 'math' and m['n'] == 8 and m['grade'] == '小一二' and m['diff'] == ev(pg, "r37DiffN('math')"), f'maths level: 8 items, grade 小一二, difficulty follows the maths setting')
    C.ok(all(x['kind'] == 'math' and x['q'] and x['hasCheck'] and x['okRight'] and not x['okWrong'] and x['pad'] in ('digits', 'frac') for x in m['it']), 'every maths item has q, a, pad and a check() that accepts its answer and rejects a wrong one')
    C.ok(len({x['id'] for x in m['it']}) == 8, 'maths item ids are unique')
    # same level, different seeds -> different questions; same seed -> same questions
    a1 = ev(pg, "r37G3Items('math',2,3,3,111).map(x=>x.q).join('|')"); a2 = ev(pg, "r37G3Items('math',2,3,3,111).map(x=>x.q).join('|')"); a3 = ev(pg, "r37G3Items('math',2,3,3,222).map(x=>x.q).join('|')")
    C.ok(a1 == a2 and a1 != a3, 'maths items are deterministic per seed and vary between plays')
    fr = ev(pg, "r37G3Items('math',3,5,3,7).filter(x=>x.pad==='frac').length"); C.ok(fr >= 1, f'grade 4 level 6 contains fraction/decimal items using the frac pad ({fr})')
    # maths first-try miss -> maths mistake list with the skill
    ev(pg, 'r37Get().miss=[]'); mid = m['it'][0]['id']; e1 = ev(pg, 'r37Get().day.enok')
    finish(pg, 3, True, miss_ids=[mid])
    mm = ev(pg, 'r37Get().miss')
    C.ok(len(mm) == 1 and mm[0]['t'] == 'math' and mm[0]['q'] and mm[0]['sk'] is not None and mm[0]['w'] == 0, f'a maths first-try miss is recorded like a quiz miss {mm}')
    C.ok(ev(pg, 'r37Get().day.enok') == e1, 'maths hits do not count as English answers (enok unchanged)')

    # ---------------------------------------------------------------- three games share the tracks scheme
    for g in ('td', 'mz', 'cd'):
        go(pg, f'#lv/{g}', 300)
        C.ok(pg.evaluate("document.querySelector('.r37-g3').dataset.g") == g, f'{g}: map is rendered for that game')
    # Admin / guest
    ev(pg, "window.__au=adminUnlocks;adminUnlocks=()=>true;render()")
    C.ok(nodes(pg) == 'oooooooooo' and ev(pg, "r37G3WorldOpen('cd','english',7)") is True, 'Admin unlock opens every level and world')
    ev(pg, "adminUnlocks=window.__au;render()")
    C.ok(not errs or all('olympiad' in e or 'ERR_FAILED' in e for e in errs), f'no console errors {errs[:2]}')
    b.close()

    # ================================================================ layout at four sizes (hub + maps, English + maths)
    for (w, h, tag, touch) in [(390, 844, 'phone', True), (360, 640, 'small', True), (844, 390, 'land', True), (1440, 900, 'desk', False)]:
        b, ctx, pg, errs = open_page(p, w, h, touch)
        register(pg, 'r37g3lay' + tag, '小明'); spy(pg)
        go(pg, '#p/games', 500)
        C.ok(no_scroll(pg), f'{tag}: games hub fits one screen')
        C.ok(pg.evaluate("""(()=>{const t=[...document.querySelectorAll('.r37-tiles .r37-tile')];const q=document.querySelector('.r37-quests');const qb=q?q.getBoundingClientRect():null;
          return t.length===7&&t.every(x=>{const r=x.getBoundingClientRect();return r.width>40&&r.height>36&&r.right<=innerWidth+1&&r.bottom<=(qb?qb.top+2:innerHeight)&&r.left>=-1})})()"""), f'{tag}: 7 tiles are fully visible and clear of the quest card')
        C.ok(pg.evaluate("[...document.querySelectorAll('.r37-tiles .r37-tn')].every(x=>x.scrollWidth<=x.clientWidth+1&&x.getBoundingClientRect().right<=x.closest('.r37-tile').getBoundingClientRect().right+1)"), f'{tag}: tile labels are not cut')
        for g in ('td', 'mz', 'cd'):
            for subj in ('english', 'math'):
                go(pg, f'#lv/{g}', 200); ev(pg, f"(r37Mem._gs=r37Mem._gs||{{}}).{g}='{subj}';render()"); pg.wait_for_timeout(300)
                head_ok = pg.evaluate("""(()=>{const t=document.querySelector('.r37-wtitle');const r=t.getBoundingClientRect();const kids=[...t.querySelectorAll('.r37-gsub,.r37-wic,h1')];
                  return r.right<=innerWidth+1&&r.left>=-1&&kids.every(k=>{const q=k.getBoundingClientRect();return q.right<=innerWidth+1&&q.left>=-1&&q.width>0})})()""")
                C.ok(head_ok, f'{tag} {g} {subj}: map header (title + subject switch) stays inside the screen')
                C.ok(pg.evaluate("document.documentElement.scrollWidth<=innerWidth+1"), f'{tag} {g} {subj}: no sideways scroll')
        pg.screenshot(path=str(SHOTS / f't44_{tag}.png'))
        b.close()
C.done()
