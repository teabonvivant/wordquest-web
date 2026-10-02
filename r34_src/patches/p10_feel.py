"""R3.4 p10 - arcade feel layer (WQFX), ready/result cards, result jingles.

Anchors (all unique in the R3.3 text):
  * </head>                                  + <style id="wq34-fx-css">
  * "\\ninstallMediaEvents();\\nrender();"      + r34_src/fx.js (host closure code; the anchor text itself is kept)
  * pgTick draw line                          + one guarded WQFX.frame() call
See r34_src/fx.js for the design rules (never add own properties to a game instance, overlay canvas only).
"""

TICK_OLD = "pgGame.draw();a28DrawCursor();a28HUD();pgAcc+=elapsed;"
TICK_NEW = "pgGame.draw();a28DrawCursor();a28HUD();try{WQFX.frame(elapsed/1000);}catch(_){}pgAcc+=elapsed;"


def apply(s, ctx):
    once = ctx.once
    css = (ctx.src / 'fx.css').read_text()
    js = (ctx.src / 'fx.js').read_text()
    s = once(s, '</head>', '<style id="wq34-fx-css">\n' + css + '</style>\n</head>')
    anchor = '\ninstallMediaEvents();\nrender();'
    s = once(s, anchor, '\n' + js + anchor)
    s = once(s, TICK_OLD, TICK_NEW)
    return s
