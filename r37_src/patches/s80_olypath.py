"""R3.23 s80 - 奧數路線 (小一至小六 x 5 units): registry + lesson tools bundled with the stand-alone libraries, UI (hub, grade maps, lesson player, strategy cards,
wrong book) in the host closure after the arcade layer. The level engine (s10_core / s20_ui / s30_wiring) hooks in by name, see the R3.23 comments there."""
ANCHOR = '\ninstallMediaEvents();\nrender();'
RUNNER_OPEN = '<script data-wq37="runner-game">\n'
OLY_FILES = ('oly_core.js', 'oly_widgets.js', 'p1.js', 'p2.js', 'p3.js', 'p4.js', 'p5.js', 'p6.js')


def apply(s, ctx):
    src = ctx.src
    # the build tool insists on a fixed number of <script> blocks, so the oly libraries ride inside the runner-game block (like the R3.21 game libraries)
    body = ''
    for name in OLY_FILES:
        t = (src / 'oly' / name).read_text()
        assert '</script' not in t.lower(), name
        body += t + '\n;\n'
    i = s.index(RUNNER_OPEN)
    j = s.index('</script>', i)
    s = s[:j] + body + s[j:]
    css = (src / 's80_oly.css').read_text()
    js = (src / 's80_oly.js').read_text()
    assert '</script' not in js.lower() and '</style' not in css.lower()
    s = ctx.once(s, '</head>', '<style id="wq37-s80-css">\n' + css + '</style>\n</head>')
    return ctx.once(s, ANCHOR, '\n' + js + ANCHOR)
