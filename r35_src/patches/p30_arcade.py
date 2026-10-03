"""R3.5 p30 - arcade (遊戲街機): lobby, game cards, 看玩法 dialog, ready / result card, touch / keyboard help.

Issues handled: S1-05, S1-06, S2-03, S2-04, S2-05, S2-06, S2-18, S2-22, S3-04, S3-05, S3-10, and the arcade part of the copy report
(landscape progress line, dock captions, motion switch, 粒星 / 個金幣 wording).

Design rules
  * No source string of R3.3 / R3.4 is edited. All behaviour sits in r35_src/p30_arcade.js, a host-closure block that wraps
    gameView / pgIntro / pgOverlay / pgAttach / pgRenderTools / r2AudioPanel / render and reshapes their output. The R3.4 strings in
    fx.js, touch.js and p20_engines.py therefore stay exactly once in the file for the later copy pass (p90).
  * Parts of the old lobby that only MOVE (status strip, classmates, wardrobe, rules, records, notices, filter chips) are taken
    from the old html at run time, so a later wording change reaches them.
  * Strings written by this module are new strings that the copy CSV does not contain (checked by the first check of r35_tests/p30_misc.py).
  * On touch devices the engines' key-name hint under the canvas (#pg-hint) is replaced by the touch sentence of the game (MutationObserver).

Patched pieces
  * </head>                                    + <style id="wq35-p30-css">
  * "\\ninstallMediaEvents();\\nrender();"        + host block (anchor text kept)
"""
from pathlib import Path

ANCHOR = '\ninstallMediaEvents();\nrender();'


def apply(s, ctx):
    css = (ctx.src / 'p30_arcade.css').read_text(encoding='utf-8')
    js = (ctx.src / 'p30_arcade.js').read_text(encoding='utf-8')
    assert '</script' not in js.lower() and '</style' not in css.lower()
    s = ctx.once(s, '</head>', '<style id="wq35-p30-css">\n' + css + '</style>\n</head>')
    s = ctx.once(s, ANCHOR, '\n' + js + ANCHOR)
    ctx.evidence['p30'] = {'css_bytes': len(css.encode()), 'js_bytes': len(js.encode())}
    return s
