"""R3.20 t28 - the shared arcade core (WQArcPlus) over all 26 arcade games, plus layout at four sizes.

    WQ33_APP=$PWD/app/index.html python3 r37_tests/t28_arcade_r320.py                  # all 26 games
    T28_IDS=sky-rescue,number-garden python3 r37_tests/t28_arcade_r320.py             # a subset
    T28_LAYOUT=0 ...                                                                  # skip the 4-size layout pass

Per game (desktop 1440x900, learning cards on): B1 HUD, B2 depth (waves, events, real multiplier), B3 learning moment (right and wrong path, card
timing, frozen game, no life lost), B4 sound, B5 effects / reduced motion, B6 result block, B7 no console / page errors over a >= 20 s play.
Then B8 save-and-continue (5 games), B9 extra life survives a28RulesTick (12 games), C layout at 360x640, 390x844, 844x390, 1440x900.
Results go to r37_evidence/r320/t28_results.json (pass / fail per check per game). The engine auto-pauses on any frame stall > 250 ms, so a
keep-alive presses 開始 again like a child would. Wording: this proves the shared layer, not that every game's play is deep (see docs/R3_20_game_audit.md)."""
import json, os, re, sys, time
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from arc_lib import *  # noqa: E402,F401,F403

OUT = R / 'r37_evidence' / 'r320'
OUT.mkdir(parents=True, exist_ok=True)
IDS = [i for i in os.environ.get('T28_IDS', '').split(',') if i] or ALL_IDS
LAYOUT = os.environ.get('T28_LAYOUT', '1') != '0'
RESULTS = {}
FAILS = []


def ok(gid, key, cond, msg=''):
    RESULTS.setdefault(gid, {})[key] = 'pass' if cond else 'fail'
    if not cond:
        FAILS.append(f'{gid} {key} {msg}')
        print(f'  FAIL {gid} {key} {msg}')
    return cond


TRACE = os.environ.get('T28_TRACE', '1') != '0'


def step(gid, name):
    if TRACE:
        print(f'    [{time.strftime("%H:%M:%S")}] {gid}: {name}', flush=True)


def chk_err(pg, gid, stage):
    r = J(pg, "JSON.stringify({r:pgReason,e:pgError})")
    bad = '"r":"error"' in r
    ok(gid, f'no_engine_error_after_{stage}', not bad, r[:300])
    return not bad


def J(pg, code):
    return pg.evaluate("(c)=>window.__r37(c)", code)


def dbg(pg):
    return J(pg, 'WQArcPlus._debug()')


def force(pg, kind, arg=None):
    return J(pg, f'WQArcPlus._force({json.dumps(kind)},{json.dumps(arg)})')


# R3.20: the four "lives = 3 - misses" games recompute lives every tick, so a test must add a real miss (not edit run.lives) to cost a life
MISS_JS = ("(()=>{const id=pgMeta.id;if(!['forest-pong','bounce-basket','meadow-cricket','star-rhythm'].includes(id))return 0;const v=wq34S(pgGame);v.forgive=(v.forgive||0)-1;return 1})()")   # one more miss, without touching schema-checked fields
PREP_MISS_JS = ("try{if(['forest-pong','bounce-basket','meadow-cricket','star-rhythm'].includes(pgMeta.id)){const v=wq34S(pgGame),r=a28Run();v.forgive=(v.forgive||0)+Math.max(0,3-(r&&r.lives!=null?r.lives:3))}else{WQArcPlus.addLife(pgGame);WQArcPlus.addLife(pgGame)}}catch(_){}")   # heal to exactly 3 lives: lives are capped at 3, a '+2' offset would hide the next miss, and with 1 life left the god top-up would hide it too
DBG_RUN_JS = 'JSON.stringify([a28Run()&&a28Run().lives,typeof wq34S==="function"&&wq34S(pgGame).forgive,WQArcPlus.stateOf(pgGame).lastLives])'
UNMISS_JS = ("(()=>{const v=wq34S(pgGame);if(v.forgive<0)v.forgive++;return 1})()")



# R3.20: stage 2 - bounce-basket's misses are shots minus real baskets (score minus the arcade bonus, F3), so the offset below uses the same number
def miss_games_drop(pg):
    """Miss-counted games (forest-pong, bounce-basket, meadow-cricket, star-rhythm): the engine's a28RulesTick sets lives = clamp(3 - misses) with
    misses = -forgive + base (base differs per game, and the multiplier tests inflate bounce-basket's score, which counts as hits). Set the offset so
    that exactly one miss is counted; returns the saved offset."""
    saved = J(pg, 'wq34S(pgGame).forgive||0')
    J(pg, "(()=>{const g=pgGame,id=pgMeta.id,base=id==='forest-pong'?g.ai:id==='bounce-basket'?g.shots-Math.floor((g.score-WQArcPlus.bonusOf(g))/3):id==='meadow-cricket'?g.round-g.hit:g.index-g.hits;wq34S(g).forgive=base-1;return 1})()")
    game_ticks(pg, 0.12)
    return saved


def miss_games_restore(pg, saved):
    J(pg, f'wq34S(pgGame).forgive={saved}')


def wait_game_t(pg, secs, cap=45, feed=False):
    """wait until the game clock advanced by `secs` (the clock only runs while the game plays)"""
    t0 = J(pg, 'pgGame.t'); end = time.time() + cap
    while time.time() < end:
        ensure_play(pg)   # the legacy engine pauses on a stalled frame; press 開始 again like a child would
        pg.wait_for_timeout(400)
        if feed:   # an idle player loses the lives of the action / sport games within seconds; top up so the clock keeps running
            J(pg, 'try{WQArcPlus.addLife(pgGame)}catch(_){}')
        if J(pg, 'pgGame.t') - t0 >= secs:
            return True
    return False


CONTRAST = r"""()=>{
 const lin=v=>{v/=255;return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4)};
 const L=c=>0.2126*lin(c[0])+0.7152*lin(c[1])+0.0722*lin(c[2]);
 const parse=s=>{const m=s&&s.match(/rgba?\(([^)]+)\)/);if(!m)return null;const p=m[1].split(',').map(x=>parseFloat(x));return [p[0],p[1],p[2],p.length>3?p[3]:1];};
 const over=(t,b)=>[t[0]*t[3]+b[0]*(1-t[3]),t[1]*t[3]+b[1]*(1-t[3]),t[2]*t[3]+b[2]*(1-t[3])];
 const out=[];
 for(const e of document.querySelectorAll('.ap-hud b,.ap-hud small,.ap-wave,.ap-hud .ap-score')){
   const r=e.getBoundingClientRect(),cs=getComputedStyle(e);if(r.width<2||r.height<2||cs.display==='none')continue;
   const fg=parse(cs.color);let bg=[24,30,80];
   const hud=document.querySelector('.ap-hud');const bgm=getComputedStyle(hud).backgroundImage.match(/rgba?\([^)]+\)/g);
   if(bgm){const c=parse(bgm[0]);bg=over(c,[11,16,48]);}
   const fgc=over(fg,bg),a=L(fgc),b=L(bg);
   out.push({t:(e.textContent||'').trim().slice(0,12),size:parseFloat(cs.fontSize),ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)});
 }
 return out;}"""


def b1_hud(pg, gid):
    r = pg.evaluate("""()=>{const vp=document.querySelector('.a28-viewport'),h=vp&&vp.querySelector(':scope>.ap-hud');if(!h)return null;
      const hr=h.getBoundingClientRect(),vr=vp.getBoundingClientRect();
      const cvr=document.querySelector('#pg-canvas').getBoundingClientRect();
      return {inside:hr.top>=vr.top-1&&hr.bottom<=vr.bottom+1&&hr.left>=vr.left-1&&hr.right<=vr.right+1,
       score:!!h.querySelector('.ap-score b')&&/\\d/.test(h.querySelector('.ap-score b').textContent),
       hearts:h.querySelectorAll('.ap-lives i:not(.sh) svg').length,mult:!!h.querySelector('.ap-mult b')&&/×\\d/.test(h.querySelector('.ap-mult b').textContent),
       prog:!!h.querySelector('.ap-prog'),aboveCanvas:hr.bottom<=cvr.top+2,vis:hr.width>0&&hr.height>0}}""")
    ok(gid, 'B1_hud_present', bool(r and r['inside'] and r['vis']), str(r))
    if r:
        ok(gid, 'B1_four_items', r['score'] and r['hearts'] >= 1 and r['mult'] and r['prog'], str(r))
    cr = pg.evaluate(CONTRAST)
    low = [c for c in cr if c['ratio'] < 4.5 or c['size'] < 14 and c['t'] and not c['t'].startswith('×') or c['size'] < 13]
    ok(gid, 'B1_contrast_font', bool(cr) and not [c for c in cr if c['ratio'] < 4.5] and not [c for c in cr if c['size'] < 14], str(low[:3]))
    # the canvas HUD helpers of the 8 A28 / R2 games draw nothing on the live game
    if gid in ('sky-rescue', 'forest-dash', 'sweet-studio', 'ruins-courier', 'cloud-island', 'star-patrol', 'lighthouse-well', 'harbor-volley'):
        n = J(pg, """(()=>{const g=pgGame,c=g.c;let n=0;const keep={};for(const m of ['fill','fillRect','fillText','stroke','strokeRect']){keep[m]=c[m];c[m]=function(){n++;return keep[m].apply(this,arguments);};}
          try{ if(['sky-rescue','forest-dash','sweet-studio'].includes(g.meta.id)) A28.hud(c,3,'標題','進度'); else R2.hud(g,'標題','進度'); }catch(e){n=-999;}
          for(const m in keep)c[m]=keep[m];return n;})()""")
        ok(gid, 'B1_no_canvas_hud', n == 0, f'canvas HUD still drew {n} ops')


BADGE_GAMES = []


def lum_rgb(c):
    f = lambda v: (v / 255 / 12.92) if v / 255 <= .03928 else (((v / 255 + .055) / 1.055) ** 2.4)
    return .2126 * f(c[0]) + .7152 * f(c[1]) + .0722 * f(c[2])


def h_checks(pg, gid):
    """R3.20 H1 one set of lives / score on screen, H2 the HUD shows exactly what the engine has (21 samples over 10 s), H3 canvas labels are dark glass"""
    pg.add_script_tag(path=str(PROBE))
    r = probe(pg, 'play')
    ok(gid, 'H1_single_stats', r['dupStats'] == 0 and bool(r['hud']), f"dup {r['dupWhere']} hud {r['hud'] and r['hud']['score']}")
    bad = []
    for i in range(21):
        ensure_play(pg)
        v = J(pg, "(()=>{const g=pgGame,d=WQArcPlus._debug();const L=typeof g.health==='number'?g.health:(pgFree?null:(a28Run()||{}).lives);return JSON.stringify({h:d&&d.hudShown,L:(L==null?null:L),sc:Math.floor(g.score||0)})})()")
        v = json.loads(v)
        hs = v['h'] or {}
        exp_l = None if v['L'] is None else min(5, max(0, int(v['L'])))
        if hs.get('score') != v['sc'] or hs.get('lives') != exp_l:
            bad.append((i, hs, v['L'], v['sc']))
        pg.wait_for_timeout(500)
    ok(gid, 'H2_hud_equals_engine', not bad, str(bad[:3]))
    # H3: the labels the D-art games print through D.badge / D.message
    seen = []
    for _ in range(14):
        seen += dbg(pg)['canvasHud']
        if seen: break
        pg.wait_for_timeout(150)
    if seen: BADGE_GAMES.append(gid)
    whyb = []
    for e in seen:
        m = re.match(r'rgba\((\d+),(\d+),(\d+)', e['fill'].replace(' ', ''))
        fill = [int(m.group(i)) for i in (1, 2, 3)]
        ink = [244, 246, 255] if e['color'].upper() == '#F4F6FF' else [0, 0, 0]
        l1, l2 = lum_rgb(ink), lum_rgb(fill)
        cr = (max(l1, l2) + .05) / (min(l1, l2) + .05)
        px = J(pg, f"(()=>{{const p=pgGame.c.getImageData({e['x'] + 4},{e['y'] + e['h'] // 2},1,1).data;return [p[0],p[1],p[2]]}})()")
        if cr < 4.5 or lum_rgb(px) > .10:
            whyb.append((e['kind'], e['text'][:10], round(cr, 1), px))
    ok(gid, 'H3_canvas_badges_dark', not whyb, str(whyb[:2]))


def b2_depth(pg, gid):
    d0 = dbg(pg)
    force(pg, 'phase', 2)
    d = dbg(pg)
    # R3.20: stage 2 - a game whose play already reached wave 2 by itself (moon-bells climbs 34 % within seconds) has shown its banner at that moment; forcing it again cannot show one
    ok(gid, 'B2_phase2', d['phase'] >= 2 and (d0['phase'] >= 2 or (d['banner'] is not None and d['banner']['t'] <= 1.0)), str(d['banner']))
    force(pg, 'phase', 3); pg.wait_for_timeout(250)
    d = dbg(pg)
    ok(gid, 'B2_phase3', d['phase'] == 3, str(d['phase']))
    force(pg, 'event', 'rain'); force(pg, 'event', 'double'); force(pg, 'event', 'magnet'); pg.wait_for_timeout(200)
    kinds = {e['k'] for e in dbg(pg)['events']}
    ok(gid, 'B2_two_events', len(kinds) >= 2, str(kinds))
    # multiplier: same plain score jump at combo 0 (x1), 2 -> 3 (x2) and 5 -> 6 (x3); the engine thr is lowered below the jump
    res = []
    for combo in (0, 2, 5):
        force(pg, 'combo', combo)
        J(pg, 'WQArcPlus.stateOf(pgGame).x2=0')
        b0 = dbg(pg)['bonus']
        h0 = dbg(pg)['hits']; force(pg, 'score', 200)
        for _ in range(40):
            game_ticks(pg, 0.05)
            if dbg(pg)['hits'] > h0: break
        res.append(dbg(pg)['bonus'] - b0)   # extra points the multiplier added on top of the plain +200 jump
    mult_ok = res[0] <= 100 and res[1] >= 190 and res[2] >= 380 and res[2] > res[1]
    ok(gid, 'B2_multiplier_in_score', mult_ok, f'multiplier extras at combo 0 / 3 / 6 (plain jump +200): {res}')
    force(pg, 'combo', 7)
    # a life loss resets the combo (health games: real loss; others: the run counter drops by one for a moment)
    has_health = J(pg, "typeof pgGame.health==='number'")
    if has_health:
        J(pg, 'pgGame.health=Math.max(2,pgGame.health)')
        J(pg, 'WQArcPlus.stateOf(pgGame).shield=false')
        game_ticks(pg, 0.1)   # R3.20: stage 2 - let the core see the topped-up hearts first (a lose in the same instant was invisible to it when the idle run had already lost one)
        force(pg, 'lose')
    else:
        J(pg, PREP_MISS_JS); game_ticks(pg, 0.1)   # lives = 3 so the god top-up does not mask the drop
        if J(pg, MISS_JS):
            saved = miss_games_drop(pg)
        else:
            saved = None
            J(pg, "(()=>{const r=a28Run();window.__l0=r.lives;r.lives-=1;return 1})()")
    game_ticks(pg, 0.35)
    d = dbg(pg)
    if not has_health:
        if saved is not None:
            miss_games_restore(pg, saved)
        J(pg, "(()=>{const r=a28Run();if(r&&window.__l0!=null)r.lives=window.__l0;return 1})()")
    ok(gid, 'B2_miss_resets_combo', d['combo'] == 0 or d['shield'] is False and d['combo'] <= 1, f"combo {d['combo']} shield {d['shield']} run {J(pg, DBG_RUN_JS)}")


PLAY13 = ['sky-rescue', 'forest-dash', 'moon-bells', 'drift-path', 'valley-race', 'ruins-courier', 'cloud-island', 'star-patrol', 'lighthouse-well',
          'bounce-basket', 'forest-pong', 'meadow-cricket', 'harbor-volley']   # R3.20 stage 2: their answer is a gameplay action (t31 proves the real path); t28 keeps the card rules and uses the forced answer


def b3_learn(pg, gid, via='chip'):
    play = gid in PLAY13
    force(pg, 'combo', 0)
    s = dbg(pg)
    # make sure we start from a clean slate: close any open card / question
    J(pg, "(()=>{const s=WQArcPlus.stateOf(pgGame);if(s.card){s.card.t=99;}return 1})()"); pg.wait_for_timeout(150)
    started = force(pg, 'learn'); pg.wait_for_timeout(250)
    d = dbg(pg)
    ok(gid, 'B3_question_opens', bool(d['q']), str(d['q'])[:80])   # (a crystal may already be open from the natural schedule)
    if not d['q']:
        return
    ok(gid, 'B3_three_options', len(d['q']['opts']) == 3 and sum(1 for o in d['q']['opts'] if o['ok']) == 1, str(d['q']['opts']))
    if play:   # R3.20: stage 2 - no option buttons, a 3-item legend of >= 14 px
        leg = pg.evaluate("({opts:document.querySelectorAll('.ap-opt').length,fs:[...document.querySelectorAll('.ap-leg')].map(e=>parseFloat(getComputedStyle(e).fontSize))})")
        ok(gid, 'B3_chips_big', leg['opts'] == 0 and len(leg['fs']) == 3 and all(f >= 14 for f in leg['fs']), str(leg))   # R3.20: was 'option buttons >= 44 px'
    else:
        chips = pg.evaluate("[...document.querySelectorAll('.ap-opt')].map(b=>{const r=b.getBoundingClientRect();return [r.width,r.height]})")
        ok(gid, 'B3_chips_big', len(chips) == 3 and all(w >= 44 and h >= 44 for w, h in chips), str(chips))
    # --- wrong path
    lives0 = dbg(pg)['cfg']['lives']; sc0 = J(pg, 'pgGame.score'); t0 = J(pg, 'pgGame.t')
    wrong_i = next(i for i, o in enumerate(d['q']['opts']) if not o['ok'])
    if play:
        force(pg, 'answer', False)   # R3.20: stage 2 - the real action path is t31's; here the card rules are what is checked
    else:
        pg.locator('.ap-opt').nth(wrong_i).click()
    d = dbg(pg)
    card = d['card']
    first_locked = bool(card) and card['disabled'] == (card['t'] < card['min']) and card['t'] < 2.0   # first look: the button is locked while the card is younger than 2 s
    pg.wait_for_timeout(500)
    ok(gid, 'B3_wrong_card', bool(card) and not card['ok'], str(card))
    txt = pg.evaluate("(document.querySelector('.ap-card')||{}).textContent||''")
    ok(gid, 'B3_wrong_shows_answer', bool(txt) and ('=' in txt or re.search(r'[A-Za-z]{2}', txt)) and 'ap-' not in txt, txt[:50])
    ok(gid, 'B3_frozen', d['frozen'], '')
    t1 = J(pg, 'pgGame.t'); sc1 = J(pg, 'pgGame.score')
    pg.wait_for_timeout(900)
    t2 = J(pg, 'pgGame.t'); sc2 = J(pg, 'pgGame.score')
    ok(gid, 'B3_wrong_freezes_t_score', abs(t2 - t1) < 1e-6 and sc2 == sc1, f't {t1}->{t2} score {sc1}->{sc2}')
    ok(gid, 'B3_wrong_no_life_lost', dbg(pg)['cfg']['lives'] == lives0, f'{lives0}->{dbg(pg)["cfg"]["lives"]}')
    # button locked for >= 2 s of card time
    ok(gid, 'B3_wrong_locked_before_2s', first_locked and (card or {}).get('min', 0) >= 2, str(card))
    deadline = time.time() + 30
    while time.time() < deadline and dbg(pg)['card'] and dbg(pg)['card']['disabled']:
        card_ticks(pg, 0.3)
    pg.locator('.ap-go').click(); pg.wait_for_timeout(300)
    d = dbg(pg)
    ok(gid, 'B3_wrong_card_ms>=2000', d['learn']['lastCardMs'] >= 2000, str(d['learn']['lastCardMs']))
    ok(gid, 'B3_unfrozen_after', not d['frozen'], '')
    # --- right path
    J(pg, "WQArcPlus.stateOf(pgGame).nextQ=0"); started = force(pg, 'learn'); pg.wait_for_timeout(250)
    d = dbg(pg)
    if not d['q']:
        ok(gid, 'B3_right_path', False, 'no second question'); return
    right_i = next(i for i, o in enumerate(d['q']['opts']) if o['ok'])
    if play:
        force(pg, 'answer', True)   # R3.20: stage 2 (see above)
    elif via == 'tap':
        # tap the crystal on the canvas
        box = pg.evaluate("(()=>{const r=document.querySelector('#pg-canvas').getBoundingClientRect();return [r.left,r.top,r.width,r.height]})()")
        o = d['q']['opts'][right_i]
        T = J(pg, 'pgGame.t')
        by = o['y'] + (0 if d['reduced'] else 0)
        pg.mouse.click(box[0] + o['x'] / 800 * box[2], box[1] + by / 560 * box[3])
    else:
        pg.locator('.ap-opt').nth(right_i).click()
    pg.wait_for_timeout(300)
    d = dbg(pg)
    ok(gid, 'B3_right_card_ok', bool(d['card']) and d['card']['ok'], str(d['card']))
    ok(gid, 'B3_right_power', any(e['k'] in ('shield', 'double', 'bonus', 'play-reward') for e in d['events']), str([e['k'] for e in d['events']][-4:]))   # R3.20: stage 2 - a play game's own reward is logged as 'play-reward'
    deadline = time.time() + 30
    while time.time() < deadline and dbg(pg)['card']:
        card_ticks(pg, 0.3)
    d = dbg(pg)
    ms = d['learn']['lastCardMs']
    ok(gid, 'B3_right_card_2.4s', 2200 <= ms <= 2800 and d['card'] is None, str(ms))
    ok(gid, 'B3_counts', d['learn']['ok'] >= 1 and d['learn']['bad'] >= 1, str(d['learn']))
    # games with a screen position collect the crystal by touching it with the player
    if d['cfg']['pos'] and not play:   # R3.20: the 13 play games are covered by t31 (the answer is the game action itself)
        J(pg, "WQArcPlus.stateOf(pgGame).nextQ=0"); force(pg, 'learn'); pg.wait_for_timeout(200)
        q = dbg(pg)['q']
        if q:
            o = next(o for o in q['opts'] if o['ok']); n0 = dbg(pg)['learn']['ok']
            J(pg, f"(()=>{{const g=pgGame;g.p.x={o['x']};g.p.y={o['y']};return 1}})()")
            for _ in range(25):
                game_ticks(pg, 0.05)
                if dbg(pg)['learn']['ok'] > n0: break
            ok(gid, 'B3_touch_collect', dbg(pg)['learn']['ok'] > n0, str(dbg(pg)['learn']))
            J(pg, "(()=>{const s=WQArcPlus.stateOf(pgGame);s.card&&(s.card.t=99);return 1})()")


def b4_sfx(pg, gid):
    # count the oscillators that really get created (pgAudio.tone returns early, creating none, when sound is off)
    J(pg, """(()=>{if(window.__tc)return 1;window.__tc={n:0,calls:0};const c=pgAudio.ctx,oo=c.createOscillator.bind(c);c.createOscillator=function(){window.__tc.n++;return oo();};const o=pgAudio.tone.bind(pgAudio);pgAudio.tone=function(...a){window.__tc.calls++;return o(...a);};return 1})()""")
    n0 = J(pg, 'window.__tc.n')
    force(pg, 'combo', 3); force(pg, 'score', 50); pg.wait_for_timeout(300)      # good + combo
    force(pg, 'shield'); J(pg, 'WQArcPlus._force("event","double")')                   # event
    J(pg, "(()=>{const s=WQArcPlus.stateOf(pgGame);s.card&&(s.card.t=99);return 1})()")
    force(pg, 'clear')                                                                    # clear
    # bad: wrong crystal answer, power: right crystal answer
    for right in (False, True):
        J(pg, "WQArcPlus.stateOf(pgGame).nextQ=0;WQArcPlus.stateOf(pgGame).card&&(WQArcPlus.stateOf(pgGame).card.t=99)"); pg.wait_for_timeout(200)
        force(pg, 'learn'); pg.wait_for_timeout(150); force(pg, 'answer', right); pg.wait_for_timeout(200)
        J(pg, "(()=>{const s=WQArcPlus.stateOf(pgGame);s.card&&(s.card.t=99);return 1})()"); pg.wait_for_timeout(150)
    d = dbg(pg)
    kinds = {x['k'] for x in d['sfxLog']}
    miss = {'good', 'bad', 'combo', 'power', 'clear'} - kinds
    ok(gid, 'B4_five_kinds', not miss, f'missing {miss}')
    n1 = J(pg, 'window.__tc.n')
    ok(gid, 'B4_via_pgAudio_tone', n1 > n0 and any(x['n'] > 0 for x in d['sfxLog']), f'oscillators {n0}->{n1}')
    # muted: no node at all
    J(pg, 'db.settings.sfxEnabled=false'); n2 = J(pg, 'window.__tc.n'); t_mute = J(pg, 'performance.now()/1000')
    force(pg, 'combo', 3); force(pg, 'score', 50); force(pg, 'clear'); force(pg, 'event', 'rain'); pg.wait_for_timeout(300)
    J(pg, "WQArcPlus.stateOf(pgGame).nextQ=0"); force(pg, 'learn'); pg.wait_for_timeout(150); force(pg, 'answer', False); pg.wait_for_timeout(150)
    J(pg, "(()=>{const s=WQArcPlus.stateOf(pgGame);s.card&&(s.card.t=99);return 1})()")
    n3 = J(pg, 'window.__tc.n')
    ok(gid, 'B4_muted_zero_nodes', n3 == n2 and all(x['n'] == 0 for x in dbg(pg)['sfxLog'] if x['t'] >= t_mute), f'oscillators {n2}->{n3}')
    J(pg, 'db.settings.sfxEnabled=true')


def b5_fx(pg, gid):
    p0 = dbg(pg)['parts']
    force(pg, 'burst', 30); pg.wait_for_timeout(60)
    ok(gid, 'B5_particles', dbg(pg)['parts'] > 0 or dbg(pg)['floats'] > 0, '')
    force(pg, 'combo', 1); force(pg, 'score', 40); pg.wait_for_timeout(120)
    d = dbg(pg)
    ok(gid, 'B5_float_on_score', d['floats'] >= 1 or d['parts'] > 0, f"floats {d['floats']} parts {d['parts']}")
    has_health = J(pg, "typeof pgGame.health==='number'")
    J(pg, 'WQArcPlus.stateOf(pgGame).shield=false;WQArcPlus.stateOf(pgGame).shakeMax=0')
    if has_health:
        # R3.20 r2: up to 3 tries - lighthouse-well failed this check in 2 of 3 runs when the lost life fell in the invulnerability / respawn window of its own tick
        for _try in range(3):
            J(pg, 'pgGame.health=Math.max(2,pgGame.health)'); force(pg, 'lose'); game_ticks(pg, 0.3)
            if dbg(pg)['shakePeak'] > 0:
                break
            game_ticks(pg, 0.6)
    else:
        J(pg, PREP_MISS_JS); game_ticks(pg, 0.1)
        if J(pg, MISS_JS):
            saved = miss_games_drop(pg); game_ticks(pg, 0.35); miss_games_restore(pg, saved)
        else:
            J(pg, "(()=>{const r=a28Run();window.__l0=r.lives;r.lives-=1;return 1})()"); game_ticks(pg, 0.35)
            J(pg, "(()=>{const r=a28Run();r.lives=window.__l0;return 1})()")
    mx = dbg(pg)['shakePeak']
    ok(gid, 'B5_shake_on_miss', mx > 0, f'shake peak {mx}')
    ok(gid, 'B5_shake_cap', mx <= 8, str(mx))
    pg.emulate_media(reduced_motion='reduce'); pg.wait_for_timeout(150)
    force(pg, 'burst', 30)
    if has_health:
        J(pg, 'pgGame.health=Math.max(2,pgGame.health)'); force(pg, 'lose')
    game_ticks(pg, 1.3)   # particles from before the switch fade out (<= 0.9 s of game time)
    d = dbg(pg); sh = d['shake']; fl = d['flash']; parts = d['parts']
    ok(gid, 'B5_reduced_motion_no_shake_flash', d['reduced'] and sh == 0 and fl == 0 and parts <= 6, f'{d["reduced"]} {sh} {fl} {parts}')
    pg.emulate_media(reduced_motion='no-preference')


def b6_result(pg, gid):
    d = dbg(pg)
    force(pg, 'god', False)
    J(pg, "(()=>{a28Fail=window.__f0;const P=window.__P;if(window.__e0)P.end=window.__e0;else delete P.end;if(window.__n0)P.next=window.__n0;else delete P.next;return 1})()")
    J(pg, "pgGame.end('測試結束','測試')")
    pg.wait_for_selector('#pg-overlay .a28-overlaycard', timeout=15000)
    pg.wait_for_timeout(500)
    r = pg.evaluate("""()=>{const c=document.querySelector('#pg-overlay .a28-overlaycard');if(!c)return null;const res=c.querySelector('.ap-res'),arx=c.querySelector('.arx-res');
      return {ap:!!res,rs:res?res.querySelectorAll('.ap-rs span').length:0,li:res?res.querySelectorAll('.ap-rl li').length:0,arx:!!arx,stars:arx?arx.querySelectorAll('.arx-stars i').length:0,
       txt:c.textContent,bad:res?[...res.querySelectorAll('li.bad')].map(l=>l.textContent):[]}}""")
    ok(gid, 'B6_result_block', bool(r and r['ap'] and r['rs'] == 3 and r['li'] >= 1), str(r)[:120])
    ok(gid, 'B6_stars_and_s35', bool(r and r['arx'] and r['stars'] == 3), '')
    ok(gid, 'B6_t09_strings', bool(r) and any(k in r['txt'] for k in ('首次紀錄', '新紀錄', '上次最佳', '再 ', '三顆星全部達成', '連擊 ×')), (r or {}).get('txt', '')[:80])
    ok(gid, 'B6_wrong_word_with_spelling', bool(r) and (not r['bad'] or all(('=' in b or '×' in b or '+' in b or '-' in b or '÷' in b) for b in r['bad'])), str(r and r['bad']))


def run_game(p, gid):
    t0 = time.time()
    b, ctx, pg, errs = new_session(p, 1440, 900, False, learn=True)
    keepalive(pg)
    try:
        start_game(pg, gid)
        # keep the run alive while the forced checks run (an idle plane / candy would otherwise end the game on its own)
        # (class-level stubs: an instance property would be rejected by the snapshot schema at the next checkpoint)
        J(pg, "(()=>{window.__f0=a28Fail;a28Fail=function(){};const P=Object.getPrototypeOf(pgGame);window.__P=P;window.__e0=Object.prototype.hasOwnProperty.call(P,'end')?P.end:null;window.__n0=Object.prototype.hasOwnProperty.call(P,'next')?P.next:null;P.end=function(){};P.next=function(){};return 1})()")
        force(pg, 'god')
        if gid in PLAY13:   # R3.20: stage 2 - an idle player 'answers' a lane / gate target by standing in it (a wrong card freezes the game); the forced run asks its own questions
            J(pg, "WQArcPlus.stateOf(pgGame).nextQ=1e9")
        pg.wait_for_timeout(2500)
        d = dbg(pg)
        ok(gid, 'core_mounted', bool(d and d['id'] == gid), str(d)[:80])
        # B7 + B3 natural: let it play for >= 22 s of game time; a first crystal must have shown up by itself
        step(gid, 'b1_hud')
        b1_hud(pg, gid)
        chk_err(pg, gid, 'b1_hud')
        step(gid, 'b2_depth')
        b2_depth(pg, gid)
        chk_err(pg, gid, 'b2_depth')
        d = dbg(pg)
        step(gid, 'b3_learn')
        b3_learn(pg, gid, via='tap' if not d['cfg']['pos'] and not J(pg, '!!WQArcPlus.cfg[pgMeta.id].dockOnly') else 'chip')   # dock-only games (boards, puzzles) answer in the dock so nothing covers the board
        chk_err(pg, gid, 'b3_learn')
        step(gid, 'b4_sfx')
        b4_sfx(pg, gid)
        chk_err(pg, gid, 'b4_sfx')
        step(gid, 'b5_fx')
        b5_fx(pg, gid)
        chk_err(pg, gid, 'b5_fx')
        step(gid, 'b6_result')
        b6_result(pg, gid)
        ok(gid, 'B7_no_errors', not errs, str(errs[:3]))
        b.close()
        # R3.20 H checks: their own fresh run (10 s of sampling would otherwise eat the first 10 s of a short game such as the 32-beat rhythm game)
        b, ctx, pg, errs = new_session(p, 1440, 900, False, learn=True)
        keepalive(pg)
        step(gid, 'h_checks')
        start_game(pg, gid)
        # same keep-alive stubs as the forced run above (an idle player is knocked out of the miss-counting games within seconds; the check is about the HUD, not the ending)
        J(pg, "(()=>{window.__f0=a28Fail;a28Fail=function(){};const P=Object.getPrototypeOf(pgGame);P.end=function(){};P.next=function(){};return 1})()")
        force(pg, 'god')
        pg.wait_for_timeout(1500)
        h_checks(pg, gid)
        b.close()
        # natural pass: a fresh run, no forcing; a crystal must appear by itself within first+3 s of game time, and >= 20 s of play must stay error free
        b, ctx, pg, errs = new_session(p, 1440, 900, False, learn=True)
        keepalive(pg)
        start_game(pg, gid)
        # R3.20: an idle player is knocked out by most action games within 3-8 s, before the first crystal. So this check is two-part: the first crystal is
        # scheduled in time (<= first + 0.5 s of game time), and it really shows up by itself if the run lives that long (god mode keeps lives >= 1).
        force(pg, 'god')
        n0 = dbg(pg)
        first = 9 if d['cat'] in ('動作', '運動') else 16
        sched_ok = bool(n0) and n0['nextQ'] <= first + 0.5
        wait_game_t(pg, first + 4, cap=60, feed=True)
        n = dbg(pg)
        alive = J(pg, 'pgGame.t') >= first + 3 and not J(pg, 'pgGame.done')
        ok(gid, 'B3_natural_moment', sched_ok and (not alive or n['learn']['asked'] >= 1 or bool(n['q'])), f"scheduled in {n0 and n0['nextQ']} s, asked {n and n['learn']['asked']} at t={J(pg, 'pgGame.t')} alive={alive}")
        wait_game_t(pg, 22 - first - 4 if first + 4 < 22 else 1, cap=90, feed=True)
        ok(gid, 'B7_natural_no_errors', not errs, str(errs[:3]))
    except Exception as e:
        ok(gid, 'exception', False, repr(e)[:300])
        try:
            pg.screenshot(path=str(OUT / f't28_fail_{gid}.png'))
        except Exception:
            pass
    finally:
        b.close()
    print(f'  {gid}: {sum(1 for v in RESULTS[gid].values() if v=="pass")}/{len(RESULTS[gid])} ({time.time()-t0:.0f}s)')


def b8_save_continue(p, ids):
    for gid in ids:
        b, ctx, pg, errs = new_session(p, 1440, 900, False, learn=True)
        keepalive(pg)
        try:
            start_game(pg, gid)
            J(pg, "(()=>{window.__f0=a28Fail;a28Fail=function(){};const P=Object.getPrototypeOf(pgGame);window.__P=P;window.__e0=Object.prototype.hasOwnProperty.call(P,'end')?P.end:null;window.__n0=Object.prototype.hasOwnProperty.call(P,'next')?P.next:null;P.end=function(){};P.next=function(){};return 1})()")
            force(pg, 'god'); pg.wait_for_timeout(2500)   # an idle run must not end before it is saved (R3.20 test aid)
            force(pg, 'god', False)
            J(pg, "(()=>{a28Fail=window.__f0;const P=window.__P;if(window.__e0)P.end=window.__e0;else delete P.end;if(window.__n0)P.next=window.__n0;else delete P.next;return 1})()")
            J(pg, 'window.__apNoKeep=true')
            J(pg, 'pgPause()'); pg.wait_for_timeout(600)
            ok(gid, 'B8_paused_saved', J(pg, 'pgPlaying===false'), '')
            J(pg, "(()=>{const c=a28Child();return !!c.run&&!!c.run.snapshot})()")
            keys_before = J(pg, 'Object.keys(pgGame).sort().join(",")')
            J(pg, "a28Resume()"); pg.wait_for_timeout(1500)
            J(pg, 'window.__apNoKeep=false')
            for i in range(5):
                J(pg, 'pgPlay()'); pg.wait_for_timeout(900)
                if J(pg, 'pgPlaying===true'):
                    break
            pg.wait_for_timeout(1200)
            d = dbg(pg)
            ok(gid, 'B8_resumes_hud_ok', bool(d) and J(pg, "!!document.querySelector('.ap-hud .ap-score b')") and J(pg, 'pgPlaying===true'), str(d)[:60] if d else 'no debug')
            keys_after = J(pg, 'Object.keys(pgGame).sort().join(",")')
            ok(gid, 'B8_no_new_instance_keys', keys_before == keys_after, '')
            ok(gid, 'B8_no_errors', not errs, str(errs[:2]))
        except Exception as e:
            ok(gid, 'B8_exception', False, repr(e)[:200])
        finally:
            b.close()


def b9_extra_life(p):
    """B9: the supply-shield life (WQArcPlus.addLife, called by s35) must survive a28RulesTick in the 12 games that recompute lives each frame."""
    twelve = ['forest-pong', 'bounce-basket', 'meadow-cricket', 'star-rhythm', 'sky-rescue', 'forest-dash', 'sweet-studio', 'ruins-courier', 'cloud-island', 'star-patrol', 'lighthouse-well', 'harbor-volley']
    b, ctx, pg, errs = new_session(p, 1440, 900, False, learn=True)
    keepalive(pg)
    for gid in twelve:
        try:
            start_game(pg, gid); pg.wait_for_timeout(1500)
            J(pg, 'window.__apNoKeep=true')
            # R3.20 r2: measured inside ONE synchronous evaluate (set the miss counter, run the rules tick, read; addLife; again) so a ball that happens to be missed
            # between two frames cannot change the lives (meadow-cricket flaked 2 -> 2 and 1 -> 3 with separate waits)
            res = J(pg, """(()=>{const g=pgGame;
 if(typeof g.health==='number'){g.health=2;a28RulesTick(.016);const a=a28Run().lives;WQArcPlus.addLife(g);a28RulesTick(.016);return [a,a28Run().lives];}
 const m={'forest-pong':()=>{g.ai=1;},'bounce-basket':()=>{g.shots=Math.floor((g.score-WQArcPlus.bonusOf(g))/3)+1;},'meadow-cricket':()=>{g.round=g.hit+1;},'star-rhythm':()=>{g.index=g.hits+1;}};
 m[g.meta.id]();a28RulesTick(.016);const a=a28Run().lives;WQArcPlus.addLife(g);m[g.meta.id]();a28RulesTick(.016);return [a,a28Run().lives];})()""")
            l2, l3 = res
            ok(gid, 'B9_extra_life_survives', l2 == 2 and l3 == 3, f'lives {l2} -> {l3}')
        except Exception as e:
            ok(gid, 'B9_exception', False, repr(e)[:200])
        finally:
            J(pg, 'window.__apNoKeep=false')
    ok('_global', 'B9_errors', not errs, str(errs[:2]))
    b.close()


def b5_css(p):
    b, ctx, pg, errs = new_session(p, 1440, 900, False)
    css = J(pg, "document.getElementById('wq37-s70-css').textContent")
    bad = []
    for m in re.finditer(r'(transition|animation)\s*:([^;}]*)', css):
        body = m.group(2)
        if 'infinite' in body:
            bad.append(('infinite', body)); continue
        for t in re.findall(r'(\d*\.?\d+)(ms|s)\b', body):
            v = float(t[0]) * (1 if t[1] == 'ms' else 1000)
            if v > 300:
                bad.append((v, body))
    ok('_global', 'B5_css_durations_le_300ms', not bad, str(bad[:3]))
    b.close()


PROBE = Path(__file__).resolve().parent / 'arc_probe.js'
SIZES4 = [(360, 640, 'small'), (390, 844, 'phone'), (844, 390, 'land'), (1440, 900, 'desk')]


def probe(pg, state):
    """R3.20: the ONE ruler (r37_tests/arc_probe.js), shared with r320_capture.py and the acceptance run."""
    pg.evaluate('window.scrollTo(0,0)')
    return pg.evaluate("(s)=>window.__arcProbe({state:s})", state)


def problems(r, hud_dup=False):
    """what the probe reports as wrong on one screen"""
    bad = []
    if r.get('hscroll'): bad.append('hscroll')
    if r.get('vscroll'): bad.append(f"vscroll {r['sy']}>{r['H']}")
    if r.get('outside'): bad.append('outside ' + ','.join(f"{o['el']}[{o['l']:.0f},{o['t']:.0f}-{o['r']:.0f},{o['b']:.0f}]" for o in r['outside'][:3]))
    if r.get('clipped'): bad.append('clipped ' + ','.join(o['txt'] for o in r['clipped'][:3]))
    if r.get('innerScroll'): bad.append('innerScroll ' + str(r['innerScroll'][:2]))
    if r.get('lowText'): bad.append('lowText ' + ','.join(f"{o['txt']}({o['contrast']})" for o in r['lowText'][:3]))   # R3.20 r2: plain text readable too
    if hud_dup and r.get('dupStats'): bad.append('dupStats ' + ','.join(r['dupWhere'][:2]))
    # R3.20 r3: elements may not sit on top of each other - button/button, button/text, a button whose centre is covered, two lines of the result card,
    # a label with < 4 px of air inside its button, a button flush with the window edge (the r2 acceptance run found these by hand; the ruler now sees them)
    ov = r.get('overlaps') or {}
    for k in ('bb', 'bt', 'cov', 'card', 'pad', 'edge'):
        if ov.get(k): bad.append(f"overlap-{k} " + ';'.join('/'.join(map(str, x)) for x in ov[k][:3]))
    return bad


def probe_reverse_control(p):
    """R3.20 C5: prove the ruler can see a problem - an artificial 2000 px block must be reported as scroll + outside, a dark-on-dark button as low contrast"""
    b, ctx, pg, errs = new_session(p, 390, 844, True, learn=True)
    keepalive(pg)
    try:
        start_game(pg, 'sky-rescue'); pg.add_script_tag(path=str(PROBE)); pg.wait_for_timeout(1800)
        base = probe(pg, 'ctl')
        ok('_global', 'C5_control_clean_page_is_clean', not problems(base), str(problems(base)))
        pg.evaluate("(()=>{const d=document.createElement('div');d.id='__ctl';d.style.cssText='height:2000px;width:50px;background:red';document.querySelector('.a28-play').appendChild(d)})()")
        r = probe(pg, 'ctl')
        ok('_global', 'C5_control_sees_overflow', bool(r['vscroll']) and bool(r['outside']), f"vscroll {r['vscroll']} outside {len(r['outside'])}")
        pg.evaluate("document.getElementById('__ctl').remove()")
        pg.evaluate("(()=>{const k=document.querySelector('.a28-touch-key');k.dataset.ctl=k.getAttribute('style')||'';k.style.cssText+=';color:#111!important;background:#151515!important;border:0'})()")
        r = probe(pg, 'ctl')
        ok('_global', 'C5_control_sees_low_contrast', any(x['contrast'] < 4.5 for x in r['buttons']), str([x['contrast'] for x in r['buttons']][:5]))
        pg.evaluate("(()=>{const k=document.querySelector('.a28-touch-key');k.style.cssText=k.dataset.ctl||''})()")
        pg.evaluate("(()=>{const h=document.querySelector('.ap-score');h.style.cssText='width:10px;overflow:hidden;white-space:nowrap'})()")
        r = probe(pg, 'ctl')
        ok('_global', 'C5_control_sees_clipped_text', bool(r['clipped']), str(r['clipped'][:1]))
        # R3.20 r3: two keys put on top of each other must be reported as an overlap and as a covered button centre
        pg.evaluate("(()=>{const h=document.querySelector('.ap-score');h.style.cssText=''})()")
        pg.evaluate("(()=>{const ks=[...document.querySelectorAll('.a28-touch-key')].filter(e=>e.offsetParent);const a=ks[0],b=ks[1];const r=a.getBoundingClientRect();b.style.cssText+=';position:fixed;width:44px;left:'+(r.left+r.width/2-22)+'px;top:'+(r.top+6)+'px;z-index:99'})()")
        r = probe(pg, 'ctl')
        ok('_global', 'C5_control_sees_overlap', bool(r['overlaps']['bb']) and bool(r['overlaps']['cov']), str(r['overlaps']['bb'][:1]) + str(r['overlaps']['cov'][:1]))
    except Exception as e:
        ok('_global', 'C5_control_exception', False, repr(e)[:200])
    finally:
        b.close()


RESULT_JS = """()=>{const card=document.querySelector('#pg-overlay .a28-overlaycard');const t=card?card.textContent:'';
 const nums=[...t.matchAll(/連擊\\s*×\\s*(\\d+)/g)].map(m=>+m[1]);
 let c=null;try{c=WQ_ARC_COMBO()}catch(e){}
 return {nums,txt:t.slice(0,60),stars:card?card.querySelectorAll('.arx-stars i').length:0,
  go:[...(card?card.querySelectorAll('button'):[])].map(b=>{const r=b.getBoundingClientRect();return {t:b.textContent.trim().slice(0,12),b:r.bottom,w:r.width,h:r.height}}),
  fs:[...(card?card.querySelectorAll('*'):[])].filter(e=>e.children.length===0&&(e.textContent||'').trim()).map(e=>parseFloat(getComputedStyle(e).fontSize)),
  cardBottom:card?card.getBoundingClientRect().bottom:null,H:innerHeight}}""".replace('WQ_ARC_COMBO()', "window.__r37('(WQArc._combo()||{}).max')")


def layout_pass(p, ids, sizes):
    for (w, h, label) in sizes:
        touch = w < 900 or h < 500
        b, ctx, pg, errs = new_session(p, w, h, touch, learn=True)
        keepalive(pg)
        for gid in ids:
            try:
                start_game(pg, gid)
                pg.add_script_tag(path=str(PROBE))
                pg.wait_for_timeout(2200)
                ensure_play(pg)
                # ---- play
                r = probe(pg, 'play')
                bad = problems(r, hud_dup=(label in ('phone', 'desk')))
                ok(gid, f'C2_{label}_play_fits', not bad, '; '.join(bad))
                touch_keys = [k for k in r['buttons'] if k['touch']]
                if label == 'phone':
                    cv = r['canvas']; vp = r['vp']
                    ok(gid, 'C3_phone_canvas_width', cv['w'] >= w - 12, f"canvas {cv['w']} vs {w - 12}")
                    ok(gid, 'C3_phone_play_zone', vp['h'] >= 380, f"play zone {vp['h']}")
                    ok(gid, 'C3_phone_keys_under_canvas', all(k['b'] <= h + 1 for k in touch_keys) and all(k['b'] - k['h'] >= cv['b'] - 1 for k in touch_keys), str([(k['b'], cv['b']) for k in touch_keys][:3]))
                if label == 'small':
                    ok(gid, 'C3_small_canvas_ge_280', r['canvas']['w'] >= 280, f"canvas {r['canvas']['w']} (listed in docs/R3_20_game_audit.md when < 348)")
                    ok(gid, 'C3_small_head_visible', J(pg, "document.querySelector('.a28-playhead').getBoundingClientRect().top")>= -0.5, '')
                if label == 'desk':
                    ok(gid, 'C3_desk_canvas_height_ge_480', r['canvas']['h'] >= 480, f"canvas {r['canvas']['h']}")
                if touch:
                    tools = [x for x in r['buttons'] if x['el'].startswith('button.btn') and not x['disabled'] and x['h'] > 0 and x['w'] > 0 and x['b'] <= h + 1 and not x['touch']]
                    small = [k for k in touch_keys if not (k['w'] >= 44 and k['h'] >= 44 and (k['h'] >= 56 or not k['key'] == 'action'))]
                    ok(gid, f'C4_{label}_touch_size', not small, str([(k['txt'], k['w'], k['h']) for k in small][:3]))
                    # R3.20 r3: the game's own tool buttons (forest-band's beat keys 1-10 were 27 px wide and nothing checked them) must be >= 44 x 44 too
                    narrow = [x for x in tools if x['w'] < 44 or x['h'] < 44]
                    ok(gid, f'C4_{label}_tool_size', not narrow, str([(x['txt'], x['w'], x['h']) for x in narrow][:3]))
                lowc = [x for x in r['buttons'] if not x['disabled'] and (x['contrast'] < 4.5 or x['lines'] > 1)]
                ok(gid, f'K1_{label}_buttons_readable', not lowc, str([(x['txt'], x['contrast'], x['lines']) for x in lowc][:3]))
                # ---- a big score must not clip the HUD (land / small / phone)
                if label in ('small', 'land'):
                    J(pg, 'WQArcPlus._force("score",99999-(pgGame.score|0))'); pg.wait_for_timeout(400)
                    r9 = probe(pg, 'play-99999')
                    bad9 = problems(r9)
                    ok(gid, f'C2_{label}_score_99999', not bad9 and (r9['hud'] is None or r9['hud']['score'] >= 99999), '; '.join(bad9) + str(r9['hud']))
                # ---- learning card open
                force(pg, 'learn'); pg.wait_for_timeout(700)
                rl = probe(pg, 'learn')
                bl = problems(rl)
                ok(gid, f'C2_{label}_learn_fits', not bl, '; '.join(bl))
                lowl = [x for x in rl['buttons'] if not x['disabled'] and (x['contrast'] < 4.5 or x['lines'] > 1)]
                ok(gid, f'K1_{label}_learn_buttons', not lowl, str([(x['txt'], x['contrast'], x['lines']) for x in lowl][:3]))
                # ---- result card (a combo is set first so "連擊 ×N" is meaningful)
                force(pg, 'god', False)
                force(pg, 'combo', 4)
                J(pg, "pgGame.end('測試結束','測試')")
                try:
                    pg.wait_for_selector('#pg-overlay .a28-overlaycard', timeout=15000)
                except Exception:
                    pass
                pg.wait_for_timeout(900)
                rr = probe(pg, 'result')
                br = problems(rr)
                ok(gid, f'C2_{label}_result_fits', not br, '; '.join(br))
                lowr = [x for x in rr['buttons'] if not x['disabled'] and (x['contrast'] < 4.5 or x['lines'] > 1)]
                ok(gid, f'K1_{label}_result_buttons', not lowr, str([(x['txt'], x['contrast'], x['lines']) for x in lowr][:3]))
                rj = pg.evaluate(RESULT_JS)
                mc = J(pg, 'WQArcPlus._debug().maxCombo'); cmax = J(pg, '(WQArc._combo()||{}).max')
                ok(gid, f'R1_{label}_result_card', not rr['innerScroll'] and not rr['outside'] and not rr['vscroll'] and rj['cardBottom'] is not None and rj['cardBottom'] <= rj['H'] and len(rj['go']) >= 1 and all(g['b'] <= rj['H'] for g in rj['go']) and rj['stars'] == 3 and min(rj['fs'] or [14]) >= 12,
                   f"innerScroll {rr['innerScroll']} outside {len(rr['outside'])} cardBottom {rj['cardBottom']} buttons {rj['go']} stars {rj['stars']} min font {min(rj['fs'] or [0])}")
                ok(gid, f'R1_{label}_combo_number', rj['nums'] and set(rj['nums']) == {mc} and mc == cmax and mc >= 4, f"card {rj['nums']} maxCombo {mc} WQArc._combo().max {cmax}")
                if label == 'phone' or label == 'desk':
                    force(pg, 'learn'); pg.wait_for_timeout(500)
                    ok(gid, f'R1_{label}_no_learn_card_after_result', J(pg, '!WQArcPlus._debug().q&&!WQArcPlus._debug().card') and J(pg, "!!document.querySelector('#pg-overlay .a28-overlaycard')"), '')
            except Exception as e:
                ok(gid, f'C_{label}_exception', False, repr(e)[:160])
        ok('_global', f'C_{label}_errors', not [e for e in errs if 'ERR_FILE_NOT_FOUND' not in e], str(errs[:2]))
        b.close()


def main():
    t0 = time.time()
    with sync_playwright() as p:
        LO = os.environ.get('T28_LAYOUT_ONLY') == '1'   # re-run just the C layout checks (the B checks are slow)
        for gid in ([] if LO else IDS):
            run_game(p, gid)
            (OUT / 't28_results_partial.json').write_text(json.dumps(RESULTS, ensure_ascii=False, indent=1))   # a long run must not lose finished games
        if not LO:
            b5_css(p)
            if len(IDS) == len(ALL_IDS):
                ok('_global', 'H3_badge_games_ge_12', len(BADGE_GAMES) >= 12, f'{len(BADGE_GAMES)} games drew a D.badge / D.message label: {BADGE_GAMES}')
        if LO:
            pass
        elif len(IDS) == len(ALL_IDS):
            b8_save_continue(p, ['sky-rescue', 'harbor-volley', 'cloud-island', 'number-garden', 'sweet-studio'])
            b9_extra_life(p)
        else:
            b8_save_continue(p, IDS[:1])
        if LAYOUT:
            sizes = [(360, 640, 'small'), (390, 844, 'phone'), (844, 390, 'land'), (1440, 900, 'desk')]
            layout_pass(p, IDS, sizes)
            probe_reverse_control(p)   # R3.20: 768x1024 is only photographed (r320_capture.py), not judged, so it is not in this pass
    if BADGE_GAMES:
        (OUT / ('t28_badges.json' if len(IDS) == len(ALL_IDS) else 't28_badges_subset.json')).write_text(json.dumps(sorted(BADGE_GAMES)))   # which games drew a D.badge / D.message label (for docs/R3_20_game_audit.md)
    outp = OUT / (os.environ.get('T28_OUT') or ('t28_results.json' if len(IDS) == len(ALL_IDS) else 't28_results_subset.json'))
    outp.write_text(json.dumps(RESULTS, ensure_ascii=False, indent=1))
    npass = sum(1 for g in RESULTS.values() for v in g.values() if v == 'pass'); ntot = sum(len(g) for g in RESULTS.values())
    print(f't28: {npass}/{ntot} checks passed in {time.time()-t0:.0f}s; {len(FAILS)} failures')
    for f in FAILS[:60]:
        print('  -', f[:240])
    sys.exit(1 if FAILS else 0)


if __name__ == '__main__':
    main()
