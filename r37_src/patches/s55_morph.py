"""R3.10 s55 - word forms: WQMorph (pure module, s55_morph.js) plus its wiring (s55_hook.js).
Both go into the host closure just before the render anchor, after s50 (patch files are applied in file-name order), so
v20Dictionary / V20 / saveRange / save / imageFor are all the final versions. No CSS."""

ANCHOR = '\ninstallMediaEvents();\nrender();'


def apply(s, ctx):
    src = ctx.src
    js = (src / 's55_morph.js').read_text() + '\n' + (src / 's55_hook.js').read_text()
    assert '</script' not in js.lower()
    return ctx.once(s, ANCHOR, '\n' + js + ANCHOR)
