"""R3.11 s56 - word-form labels, same-family fold and "already learned" on the dictation step-2 cards.
Goes after s50 (card grid, s50Apply) and s55 (s55Info / s55SameWord) in the same host closure, just before the render anchor."""

ANCHOR = '\ninstallMediaEvents();\nrender();'


def apply(s, ctx):
    src = ctx.src
    css = (src / 's56_morph_ui.css').read_text()
    js = (src / 's56_morph_ui.js').read_text()
    assert '</script' not in js.lower() and '</style' not in css.lower()
    s = ctx.once(s, '</head>', '<style id="wq37-s56-css">\n' + css + '</style>\n</head>')
    return ctx.once(s, ANCHOR, '\n' + js + ANCHOR)
