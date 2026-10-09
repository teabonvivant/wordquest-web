"""R3.7 s10 - planet shell: CSS, core/ui/wiring JS (inside the host closure) and the two stand-alone libraries (maths generator, FPS game)."""
from pathlib import Path

HOST_SCRIPT = '<script data-wq28="host">'
ANCHOR = '\ninstallMediaEvents();\nrender();'


def apply(s, ctx):
    once, src = ctx.once, ctx.src
    css = (src / 's10_shell.css').read_text()
    js = '\n'.join((src / f).read_text() for f in ('s10_core.js', 's15_art.js', 's20_ui.js', 's30_wiring.js'))
    libs = ''
    for name, tag in (('levels_math.js', 'levels-math'), ('fps_game.js', 'fps-game'), ('runner_game.js', 'runner-game')):
        p = src / name
        if p.exists():
            body = p.read_text()
            assert '</script' not in body.lower(), name
            libs += f'<script data-wq37="{tag}">\n{body}\n</script>\n'
    s = once(s, '</head>', '<style id="wq37-shell-css">\n' + css + '</style>\n</head>')
    s = once(s, HOST_SCRIPT, libs + HOST_SCRIPT)
    s = once(s, ANCHOR, '\n' + js + ANCHOR)
    return s
