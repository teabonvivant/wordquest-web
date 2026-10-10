"""R3.10 s50 - dictation upload (#range-new): word-length filter (default 3+), basic-word switch, auto recognise after the photo is
chosen, one-row name/date, compact cards and a fixed action bar. CSS/JS are injected the same way as s10 (host closure, before the
render anchor); the R3.5 p40 layer stays untouched and is only wrapped from the outside."""

ANCHOR = '\ninstallMediaEvents();\nrender();'


def apply(s, ctx):
    once, src = ctx.once, ctx.src
    css = (src / 's50_dictation.css').read_text()
    js = (src / 's50_dictation.js').read_text()
    s = once(s, '</head>', '<style id="wq37-s50-css">\n' + css + '</style>\n</head>')
    s = once(s, ANCHOR, '\n' + js + ANCHOR)
    return s
