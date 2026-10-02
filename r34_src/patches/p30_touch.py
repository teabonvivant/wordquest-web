"""R3.4 p30 - phone play layer: canvas gestures, split key docks, landscape layout, orientation helper.

Needs p10 (WQFX ring / haptic are used when present; the ready card reads WQ34G hints).
Anchors (all unique in the R3.3 text, and unchanged by p10 / p20):
  * </head>                                  + <style id="wq34-touch-css">
  * "\\ninstallMediaEvents();\\nrender();"      + r34_src/touch.js (host closure code; the anchor text itself is kept)
"""


def apply(s, ctx):
    once = ctx.once
    css = (ctx.src / 'touch.css').read_text()
    js = (ctx.src / 'touch.js').read_text()
    s = once(s, '</head>', '<style id="wq34-touch-css">\n' + css + '</style>\n</head>')
    anchor = '\ninstallMediaEvents();\nrender();'
    s = once(s, anchor, '\n' + js + anchor)
    return s
