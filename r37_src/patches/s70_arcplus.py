"""R3.20 s70 - arcade enhancement core (WQArcPlus) over the 26 arcade games.
CSS and JS go into the host closure just before the render anchor, after s60 (patch files apply in file-name order). Two small anchors in the
R3.6 text: r2Fit leaves room for the HUD and the dock, and a28RulesTick lets a "forgiven miss" (supply / in-game shield) survive the
`lives = 3 - misses` recomputation of the four miss-counting games (R3.20 B9)."""

ANCHOR = '\ninstallMediaEvents();\nrender();'


def apply(s, ctx):
    src = ctx.src
    css = (src / 's70_arcplus.css').read_text()
    js = (src / 's70_arcplus.js').read_text() + '\n' + (src / 's71_arcgames.js').read_text() + '\n' + (src / 's72_arcplay.js').read_text()
    assert '</script' not in js.lower() and '</style' not in css.lower()
    s = ctx.once(s, 'const w=v.clientWidth,h=v.clientHeight,scale=Math.min(w/800,h/560);',
                 "const w=v.clientWidth,h=v.clientHeight-(typeof WQArcPlus!=='undefined'?WQArcPlus.reserve(v):0),scale=Math.min(w/800,h/560);")
    s = ctx.once(s, "const misses=pgMeta.id==='forest-pong'?g.ai:", "const misses=-(wq34S(g).forgive||0)+(pgMeta.id==='forest-pong'?g.ai:")
    s = ctx.once(s, ":g.index-g.hits;", ":g.index-g.hits);")
    # R3.20 stage 2 (F3): bounce-basket counts real baskets (score minus the arcade bonus), not score/3 - a coin rain or a right answer is not a basket
    RS = "(g.score-(typeof WQArcPlus!=='undefined'?WQArcPlus.bonusOf(g):0))"
    s = ctx.once(s, "g.shots-Math.floor(g.score/3)", "g.shots-Math.floor(" + RS + "/3)")
    s = ctx.once(s, "g.shots-g.score/3<3", "g.shots-" + RS + "/3<3")
    # R3.20 stage 2 (F2): the moving hoop of the arcade layer is applied inside the engine's own update (judging and drawing use the same hoop)
    s = ctx.once(s, "this.hoop.x=590+(this.d===2?Math.sin(this.t*.6)*50:0);this.hoop.y=225+(this.d===1?Math.sin(this.t*.5)*25:0);",
                 "this.hoop.x=590+(this.d===2?Math.sin(this.t*.6)*50:0)+(wq34S(this).hx||0);this.hoop.y=225+(this.d===1?Math.sin(this.t*.5)*25:0)+(wq34S(this).hy||0);")
    s = ctx.once(s, '</head>', '<style id="wq37-s70-css">\n' + css + '</style>\n</head>')
    return ctx.once(s, ANCHOR, '\n' + js + ANCHOR)
