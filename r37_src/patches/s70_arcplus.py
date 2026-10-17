"""R3.20 s70 - arcade enhancement core (WQArcPlus) over the 26 arcade games.
CSS and JS go into the host closure just before the render anchor, after s60 (patch files apply in file-name order). Two small anchors in the
R3.6 text: r2Fit leaves room for the HUD and the dock, and a28RulesTick lets a "forgiven miss" (supply / in-game shield) survive the
`lives = 3 - misses` recomputation of the four miss-counting games (R3.20 B9)."""

ANCHOR = '\ninstallMediaEvents();\nrender();'


def apply(s, ctx):
    src = ctx.src
    css = (src / 's70_arcplus.css').read_text()
    js = (src / 's70_arcplus.js').read_text() + '\n' + (src / 's71_arcgames.js').read_text()
    assert '</script' not in js.lower() and '</style' not in css.lower()
    s = ctx.once(s, 'const w=v.clientWidth,h=v.clientHeight,scale=Math.min(w/800,h/560);',
                 "const w=v.clientWidth,h=v.clientHeight-(typeof WQArcPlus!=='undefined'?WQArcPlus.reserve(v):0),scale=Math.min(w/800,h/560);")
    s = ctx.once(s, "const misses=pgMeta.id==='forest-pong'?g.ai:", "const misses=-(wq34S(g).forgive||0)+(pgMeta.id==='forest-pong'?g.ai:")
    s = ctx.once(s, ":g.index-g.hits;", ":g.index-g.hits);")
    s = ctx.once(s, '</head>', '<style id="wq37-s70-css">\n' + css + '</style>\n</head>')
    return ctx.once(s, ANCHOR, '\n' + js + ANCHOR)
