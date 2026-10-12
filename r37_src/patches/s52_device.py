"""R3.15 s52 - 記住這部裝置. Two injections: a few lines right after the host's SESSIONKEY (so the remembered sign-in is back in
sessionStorage before the first db load), and the tick / login / logout wrappers before the render anchor (after s50)."""

ANCHOR = '\ninstallMediaEvents();\nrender();'
SESSION_LINE = "const SESSIONKEY=WQ_TEST_MODE?'wordquest-v29-test-current-account':'wordquest-v10-current-account';"
EARLY = """
/* R3.15 s52: a sign-in the parent chose to keep on this device comes back in a new tab (never the parent unlock) */
const WQ52_DEV='wq52-device:'+SESSIONKEY;
(function(){try{
 if(sessionStorage.getItem(SESSIONKEY))return;
 const id=localStorage.getItem(WQ52_DEV)||'';
 if(id&&readAccounts().some(a=>a.id===id))sessionStorage.setItem(SESSIONKEY,id);
}catch(_){}})();"""


def apply(s, ctx):
    src = ctx.src
    css = (src / 's52_device.css').read_text()
    js = (src / 's52_device.js').read_text()
    assert '</script' not in js.lower() and '</style' not in css.lower()
    s = ctx.once(s, SESSION_LINE, SESSION_LINE + EARLY)
    s = ctx.once(s, '</head>', '<style id="wq37-s52-css">\n' + css + '</style>\n</head>')
    return ctx.once(s, ANCHOR, '\n' + js + ANCHOR)
