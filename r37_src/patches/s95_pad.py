"""R3.31 s95 - tile answers instead of typing: WQPad (wq_pad.js, generic) plus the host resolvers (s95_pad.js). Goes into the host closure after s90 (file-name order)."""

ANCHOR = '\ninstallMediaEvents();\nrender();'


def apply(s, ctx):
    src = ctx.src
    js = (src / 'wq_pad.js').read_text() + '\n' + (src / 's95_pad.js').read_text()
    assert '</script' not in js.lower()
    return ctx.once(s, ANCHOR, '\n' + js + ANCHOR)
