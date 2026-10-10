"""R3.13 s60 - legacy pages: one top bar, no teacher cards, short copy, responsive fit at 390 / 820 / 1180 / 1440 px.
CSS and JS go into the host closure just before the render anchor, after s50/s55/s56 (patch files are applied in file-name order),
so r37Wrap / render / the wrapped legacy views are the final versions. No product logic is changed; only containers, copy and layout."""

ANCHOR = '\ninstallMediaEvents();\nrender();'


def apply(s, ctx):
    src = ctx.src
    css = (src / 's60_legacy.css').read_text()
    js = (src / 's60_legacy.js').read_text()
    assert '</script' not in js.lower() and '</style' not in css.lower()
    s = ctx.once(s, '</head>', '<style id="wq37-s60-css">\n' + css + '</style>\n</head>')
    return ctx.once(s, ANCHOR, '\n' + js + ANCHOR)
