#!/usr/bin/env python3
"""p20 screenshots: lesson states at 390x844, 844x390, 320x568, 768x1024 -> /home/claude/audit_r35/r35/p20/ (or $P20_SHOT_DIR)."""
import os
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import p20_lib as L  # noqa: E402
from p20_lib import *  # noqa: E402,F401

OUT = Path(os.environ.get('P20_SHOT_DIR') or L.SHOTS)
OUT.mkdir(parents=True, exist_ok=True)
ONLY = set(sys.argv[1:])


def snap(pg, state, tag):
    pg.wait_for_timeout(350)
    pg.screenshot(path=str(OUT / f'{state}_{tag}.png'))


with sync_playwright() as p:
    for w, h, tag in L.VIEWPORTS:
        if ONLY and tag not in ONLY:
            continue
        b, ctx, pg, errs = open_page(p, w, h, touch=(w < 800))
        boot(pg, name='p20shots')
        # 1 study step
        start(pg, 'lesson')
        snap(pg, '01_study', tag)
        # 2 choice question + empty submit hint
        advance(pg, until_mode='meaning')
        pg.click('[data-l30="submit"]')
        snap(pg, '02_choice_empty', tag)
        # 3 wrong answer feedback
        answer(pg, False)
        pg.click('[data-l30="submit"]')
        snap(pg, '03_choice_wrong', tag)
        # 3b correct feedback on next question
        pg.click('[data-l30="next"]')
        answer(pg, True)
        pg.click('[data-l30="submit"]')
        snap(pg, '04_choice_right', tag)
        # 4 typed question, hint, wrong feedback
        advance(pg, until_mode='spell')
        pg.click('[data-l30="hint"]')
        snap(pg, '05_spell_hint', tag)
        pg.fill('#l30-answer', 'zzq')
        pg.click('[data-l30="submit"]')
        snap(pg, '06_spell_wrong', tag)
        # 5 menu open (next question)
        pg.click('[data-l30="next"]')
        try:
            pg.click('.p20-more summary', timeout=1500)
        except Exception:
            pass
        snap(pg, '07_menu_open', tag)
        try:
            pg.keyboard.press('Escape')
        except Exception:
            pass
        # 6 save failure
        pg.evaluate('__p40.failSave(true)')
        answer(pg, True)
        pg.click('[data-l30="submit"]')
        snap(pg, '08_save_fail', tag)
        pg.evaluate('__p40.failSave(false)')
        # 7 result page
        start(pg, 'meaning')
        for _ in range(4):
            answer(pg, False)
            pg.click('[data-l30="submit"]')
            pg.click('[data-l30="next"]')
            pg.wait_for_timeout(150)
        snap(pg, '09_result', tag)
        # 8 listen question
        start(pg, 'listenSpell')
        snap(pg, '10_listen', tag)
        # 9 tiles
        start(pg, 'tiles')
        snap(pg, '11_tiles', tag)
        # 10 l31 assembly lesson
        try:
            clear(pg)
            gs = pg.evaluate('__p40.l31Groups()')
            pg.evaluate(f'__p40.l31Start("{gs[0]["id"]}")')
            pg.wait_for_timeout(600)
            snap(pg, '12_l31', tag)
        except Exception as e:
            print('l31 shot failed', e)
        print(tag, 'errors:', errs)
        b.close()
print('done ->', OUT)
