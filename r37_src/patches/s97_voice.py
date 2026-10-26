"""R3.31 s97 - recorded British voice shim (s97_voice.js) and cache-first offline rule for assets/voice in the service worker. Goes into the host closure after s95 (file-name order)."""

ANCHOR = '\ninstallMediaEvents();\nrender();'
SW_ANCHOR = " if(u.pathname===new URL('index.html',BASE).pathname"


def apply(s, ctx):
    js = (ctx.src / 's97_voice.js').read_text()
    assert '</script' not in js.lower()
    return ctx.once(s, ANCHOR, '\n' + js + ANCHOR)


def apply_sw(sw, ctx):
    rule = (" if(/\\/assets\\/voice\\/[^/]+\\/[^/]+\\.(?:mp3|json)$/.test(u.pathname)){e.respondWith((async()=>{const c=await caches.open(SHELL),hit=await c.match(req,{ignoreSearch:true});if(hit)return hit;const r=await fetch(req);if(r.ok)await c.put(req,r.clone());return r;})());return;}\n")
    return ctx.once(sw, SW_ANCHOR, rule + SW_ANCHOR)
