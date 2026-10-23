"""R3.28 s90 - answer feedback in the teaching pages (默書星 / 英文課堂 / 字詞工房): readable ink on the pale cards, wrong = red + x, right = green + tick,
a headline (答對了 / 再想想) and the wrong sound on every wrong try. CSS goes into <head>, JS into the host closure after s80 (file-name order).
The R3.5 sources (r35_src, r3_src/base) are already baked into the R3.6 base text, so this layer is where their pages are changed."""

ANCHOR = '\ninstallMediaEvents();\nrender();'


def apply(s, ctx):
    src = ctx.src
    css = (src / 's90_feedback.css').read_text()
    js = (src / 's90_feedback.js').read_text()
    assert '</script' not in js.lower() and '</style' not in css.lower()
    s = ctx.once(s, '</head>', '<style id="wq37-s90-css">\n' + css + '</style>\n</head>')
    return ctx.once(s, ANCHOR, '\n' + js + ANCHOR)
