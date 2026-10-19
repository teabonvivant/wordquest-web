"""Evidence screenshots for 字母砲台: python3 r37_tests/gx_fixture/td_shots.py  -> r37_evidence/r321/td/<size>_<subject>_<state>.png
States: how, preview, play (3 monsters, one half typed), fx (kill shot in flight with fire/ice/thunder), learn (wrong-answer card), boss, result."""
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).parent))
from lib import open_game, sync_playwright, R  # noqa: E402

import os
OUT = R / 'r37_evidence' / os.environ.get('TD_SHOT_DIR', 'r321/td'); OUT.mkdir(parents=True, exist_ok=True)
SIZES = [(390, 844, 'p390'), (360, 640, 'p360'), (844, 390, 'l844'), (1440, 900, 'd1440'), (768, 1024, 't768')]
CASES = [('english', 0, 2, 2, 'en'), ('english', 3, 9, 3, 'enboss'), ('math', 3, 4, 3, 'ma'), ('math', 4, 6, 2, 'mafrac'), ('math', 5, 9, 4, 'maboss')]


def run(sel=None):
    with sync_playwright() as p:
        for (w, h, tag) in SIZES:
            if sel and tag not in sel: continue
            for (subj, wd, s, d, name) in CASES:
                touch = w < 1000
                b, pg, errs = open_game(p, 'td_game.js', 'WQ37TD', subj, wd, s, d, size=(w, h), touch=touch, reduced=False, seed=7, manual=True)
                pg.evaluate("()=>localStorage.clear()")
                pg.evaluate("()=>{G.destroy();STARTGAME('WQ37TD','%s',%d,%d,%d,{seed:7,manual:true})}" % (subj, wd, s, d))
                pg.wait_for_timeout(300); pg.evaluate("()=>G._step(1)")
                if name in ('en', 'ma'):
                    pg.screenshot(path=str(OUT / f'{tag}_{name}_how.png'))
                    pg.evaluate("()=>{G._S.ui.closeAll();G._S.ui.preview(G._S.learn.items,{onStart:()=>{}})}"); pg.wait_for_timeout(200)
                    pg.screenshot(path=str(OUT / f'{tag}_{name}_preview.png'))
                pg.evaluate("()=>{G._S.ui.closeAll();G._cmd('begin')}")
                if 'boss' in name:
                    pg.evaluate("()=>AP && 0") if False else None
                    pg.evaluate("""()=>{let it=0;while(it++<30000&&!G._debug.boss.alive){const d=G._debug;if(d.frozen||d.ended)break;if(d.state!=='play'){G._step(10);continue}
                       const t=d.enemies.find(e=>e.uid===d.target&&e.state==='walk');if(t)G._cmd('solve');G._step(6)}}""")
                    pg.evaluate("()=>G._step(500)")
                else:
                    pg.evaluate("()=>{G._cmd('spawn');G._step(500);G._cmd('spawn');G._step(300);G._cmd('spawn');G._step(200)}")
                    # half-type the target
                    pg.evaluate("()=>{const e=G._debug.enemies.find(x=>x.uid===G._debug.target);if(e){const a=e.answer;G._cmd('type',e.math?a.slice(0,Math.max(1,a.length-1)):a.slice(e.typed.length,e.typed.length+2))}}")
                pg.evaluate("()=>G._step(2)"); pg.wait_for_timeout(120)
                pg.screenshot(path=str(OUT / f'{tag}_{name}_play.png'))
                if name in ('en', 'ma'):
                    for tn, combo in (('fire', 3), ('ice', 5), ('thunder', 8)):
                        pg.evaluate("(c)=>{const t=G._debug.enemies.find(e=>e.state==='walk'&&!e.typed);if(t)G._cmd('select',t.uid);G._cmd('combo',c-1);G._cmd('solve');G._step(14)}", combo); pg.wait_for_timeout(60)
                        pg.screenshot(path=str(OUT / f'{tag}_{name}_fx_{tn}.png'))
                        pg.evaluate("()=>G._step(60)")
                    pg.evaluate("()=>{G._cmd('event','meteor');G._step(40)}"); pg.screenshot(path=str(OUT / f'{tag}_{name}_meteor.png'))
                    pg.evaluate("()=>{G._cmd('event','freeze');G._step(20)}"); pg.screenshot(path=str(OUT / f'{tag}_{name}_freeze.png'))
                    pg.evaluate("()=>{G._cmd('spawn');G._step(60);G._cmd('wrong');G._step(2)}"); pg.wait_for_timeout(400)
                    pg.screenshot(path=str(OUT / f'{tag}_{name}_learn.png'))
                    pg.evaluate("()=>{window.__off=2300;FF&&0}") if False else None
                    pg.wait_for_timeout(1900)
                    pg.click('.gx-learn [data-r="ok"]'); pg.evaluate("()=>{G._cmd('hearts',99);G._S.ui.closeAll()}")
                    pg.evaluate("""()=>{let it=0;while(it++<40000&&!G._debug.ended){const d=G._debug;if(d.frozen)break;if(d.state!=='play'){G._step(10);continue}
                       const t=d.enemies.find(e=>e.uid===d.target&&e.state==='walk');if(t)G._cmd('solve');G._step(6)}}""")
                    pg.wait_for_timeout(1800); pg.screenshot(path=str(OUT / f'{tag}_{name}_result.png'))
                print(w, h, name, 'errors:', errs)
                b.close()


if __name__ == '__main__':
    run(sys.argv[1:])
