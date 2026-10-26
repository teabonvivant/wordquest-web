"""R3.7 s10 - planet shell: CSS, core/ui/wiring JS (inside the host closure) and the two stand-alone libraries (maths generator, FPS game)."""
from pathlib import Path

HOST_SCRIPT = '<script data-wq28="host">'
ANCHOR = '\ninstallMediaEvents();\nrender();'


def apply(s, ctx):
    once, src = ctx.once, ctx.src
    css = (src / 's10_shell.css').read_text() + '\n' + (src / 's22_dz.css').read_text() + '\n' + (src / 's27_teach.css').read_text() + '\n' + (src / 's35_arcade.css').read_text() + '\n' + (src / 's36_g3.css').read_text()
    js = '\n'.join((src / f).read_text() for f in ('s10_core.js', 's15_art.js', 's20_ui.js', 's22_dz.js', 's25_fx.js', 's30_wiring.js', 's35_arcade.js'))
    libs = ''
    # tools/build_math_m1.py insists on exactly 43 original <script> blocks, so the R3.21 game libraries ride inside the runner-game block
    groups = ((('levels_math_x_w12.js', 'levels_math_x_w34.js', 'levels_math_x_w56.js', 'levels_math.js'), 'levels-math'), ('fps_game.js', 'fps-game'), (('runner_game.js', 'gx_core.js', 'td_game.js', 'maze_game.js', 'card_game.js'), 'runner-game'))
    for names, tag in groups:
        body = ''
        for name in ((names,) if isinstance(names, str) else names):
            p = src / name
            if p.exists():
                t = p.read_text()
                assert '</script' not in t.lower(), name
                body += t + '\n;\n'
        if body:
            libs += f'<script data-wq37="{tag}">\n{body}</script>\n'
    s = once(s, '</head>', '<style id="wq37-shell-css">\n' + css + '</style>\n</head>')
    s = once(s, HOST_SCRIPT, libs + HOST_SCRIPT)
    s = once(s, ANCHOR, '\n' + js + ANCHOR)
    return s
