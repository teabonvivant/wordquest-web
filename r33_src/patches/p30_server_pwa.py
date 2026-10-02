"""R3.3 p30 - local server + PWA stop-gap (WQ32-03, WQ32-04, static caching).

Patched pieces (every anchor is unique in the frozen R3.2 files; ctx.once / _span enforce it):

WQ32-03  server/local_server.mjs  /api/speech limiter
  * The 429 check and the slot claim (`active++`, `hits.push`) now happen in ONE synchronous step, right after
    the header / origin / key checks and before the request body is read. A client that flushes headers and
    sends the body later can no longer park unlimited upstream calls.
  * The body is read with events and a total deadline (default 10 s, option `bodyTimeoutMs` for tests) -> 408.
    The 10 KB cap is kept (413). 408 / 413 carry `Connection: close` so a half-sent body cannot keep the socket.
  * The slot is released only in a `finally` after the upstream call really settled, so upstream concurrency can
    never exceed 2. A client disconnect aborts the upstream call (AbortController); the 18 s upstream timeout is
    a plain timer (no AbortSignal.any / AbortSignal.timeout needed).
  * Requests that fail before the upstream call (bad JSON, too large, timeout, aborted) give their 60-per-10-min
    count back, exactly as before when only validated requests were counted.

WQ32-04  app/index.html + app/sw.js + new app/manifest.webmanifest + app/icons/*.png
  * `checkShell` / `prepareShell` rewritten (the `if(true){toast(...)}` stub is gone). http(s)+secure context:
    register sw.js -> wait for `ready` (also watches a failing install, 45 s cap) -> require an ACTIVE
    registration and `index.html` inside a `wordquest-r3-shell-<scope>-*` cache -> only then `shellReady=true`.
    Any failure sets shellReady=false and shows the reason. file: mode keeps the "keep this HTML file" wording.
    (The old checkShell looked for `wordquest-v13-shell-...`, a name the worker never used.)
  * sw.js: only the `activate` listener changes - it deletes OLD shell caches of this scope
    (`wordquest-r3-shell-<scope>-*` != current SHELL). OCR caches, `wordquest-r3-config` and other scopes stay.
    The version string is NOT touched (the builder core swaps -3.2.0' -> -3.3.0').
  * head: <link rel=manifest> and apple-touch-icon after the head </title>. (theme-color already exists.)
  * manifest (zh-HK, standalone, #fff8ed / #bf4d25) and an original orange "W" icon, 192 + 512 (512 also maskable).

Static files  server/local_server.mjs
  * ETag (size+mtime+ctime, one per content-encoding), If-None-Match -> 304 (weak tags, lists and * accepted),
    Accept-Encoding br / gzip (q-values honoured) for html, js, json, svg, webmanifest >= 1 KB, results cached in
    memory per file signature (cap 96 MB, oldest evicted), async zlib, `Vary: Accept-Encoding`. The CLI pre-warms
    index.html in the background (option `prewarm`, only passed by the CLI entry point).
  * Cache-Control: no-cache, nosniff, X-Frame-Options, path / symlink / Host / Origin checks are unchanged.
"""

# ---------------------------------------------------------------------------------------------------------------
# helpers


def _span(s, a, b, new, ctx):
    """Replace the text from the unique anchor `a` through the end of the unique anchor `b` with `new`."""
    ctx.once(s, a, a)  # raises unless `a` occurs exactly once
    ctx.once(s, b, b)
    i = s.index(a)
    j = s.index(b) + len(b)
    if j <= i:
        raise ValueError('span end precedes start: ' + a[:60])
    return s[:i] + new + s[j:]


# ---------------------------------------------------------------------------------------------------------------
# index.html

HEAD_LINKS = ('</title>\n<link rel="manifest" href="manifest.webmanifest">\n'
              '<link rel="apple-touch-icon" href="icons/icon-192.png">\n<style>\n:root{')

SHELL_JS = r"""// R3.3 p30: offline shell. Registers sw.js and only reports "ready" after the cache really holds index.html.
function wqP30ShellScope(){return new URL('./',location.href);}
async function wqP30ShellCached(){const scope=wqP30ShellScope(),reg=await navigator.serviceWorker.getRegistration(scope.href);if(!reg||!reg.active)return false;const prefix='wordquest-r3-shell-'+encodeURIComponent(scope.pathname)+'-',index=new URL('index.html',scope).href;for(const name of await caches.keys()){if(!name.startsWith(prefix))continue;const hit=await(await caches.open(name)).match(index);if(hit&&hit.ok)return true;}return false;}
async function checkShell(){if(location.protocol==='file:'){shellReady=true;swState='已下載 HTML；相片 OCR 元件不包含在單檔內';return;}if(!('serviceWorker'in navigator)||!window.isSecureContext||!window.caches){shellReady=false;swState='PWA 離線開啟需要 HTTPS 或 localhost';return;}try{shellReady=await wqP30ShellCached();swState=shellReady?'離線網頁已存妥':'網頁仍未存妥';}catch(_){shellReady=false;swState='未能檢查離線網頁';}}
function wqP30WaitActive(reg,ms){return new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error('離線服務逾時')),ms);const ok=()=>{clearTimeout(timer);resolve();},bad=e=>{clearTimeout(timer);reject(e);};const first=!reg.active,w=reg.installing;if(w&&first){const chk=()=>{if(w.state==='redundant')bad(Error('離線元件安裝失敗'));};w.addEventListener('statechange',chk);chk();}
 // After ready, also let a still-installing update and the activate step (old-cache cleanup, clients.claim) finish.
 const settle=n=>{if(!n||n.state==='activated'||n.state==='redundant')return ok();const chk=()=>{if(n.state==='activated'||n.state==='redundant')ok();};n.addEventListener('statechange',chk);chk();};
 navigator.serviceWorker.ready.then(()=>{const n=reg.installing;if(n&&n.state==='installing'){const chk=()=>{if(n.state!=='installing'){n.removeEventListener('statechange',chk);settle(reg.active);}};n.addEventListener('statechange',chk);}else settle(reg.active);},bad);});}
let wqP30ShellBusy=false;
async function prepareShell(){if(wqP30ShellBusy)return;if(location.protocol==='file:'){await checkShell();mediaMessage='你正使用已下載的 HTML 檔案，請保留這個檔案；單檔不能註冊離線網頁。';renderOfflineContents();return;}if(!('serviceWorker'in navigator)||!window.isSecureContext||!window.caches){shellReady=false;swState='PWA 離線開啟需要 HTTPS 或 localhost';mediaMessage='請用 HTTPS 或 localhost 開啟，才能準備離線網頁。';renderOfflineContents();return;}if(!navigator.onLine){mediaMessage='請連線後準備網頁。';renderOfflineContents();return;}
 wqP30ShellBusy=true;try{mediaMessage='正在準備離線網頁…';renderOfflineContents();const scope=wqP30ShellScope(),reg=await navigator.serviceWorker.register(new URL('sw.js',scope),{scope:scope.pathname});await wqP30WaitActive(reg,45000);shellReady=await wqP30ShellCached();if(!shellReady)throw Error('快取內找不到網頁');swState='離線網頁已存妥';mediaMessage='網頁已儲存，可離線重新開啟。';}
 catch(e){shellReady=false;swState='未能準備離線網頁';mediaMessage='未能準備離線網頁（'+String(e&&e.message||'未知原因').slice(0,80)+'）。請用 HTTPS 或 localhost 開啟並保持連線，再按一次。';}
 finally{wqP30ShellBusy=false;}renderOfflineContents();}
"""

SW_ACTIVATE_OLD = "self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));"
SW_ACTIVATE_NEW = (
    "// R3.3 p30: drop OLD shell caches of this scope only (never OCR, config or other scopes), then take control.\n"
    "self.addEventListener('activate',e=>e.waitUntil((async()=>{try{const pre='wordquest-r3-shell-'+encodeURIComponent(BASE.pathname)+'-';"
    "for(const k of await caches.keys())if(k.startsWith(pre)&&k!==SHELL)await caches.delete(k);}catch(_){}await self.clients.claim();})()));"
)


def apply(s, ctx):
    s = ctx.once(s, '</title>\n<style>\n:root{', HEAD_LINKS)
    s = _span(s, 'async function checkShell(){', 'renderOfflineContents();}\nasync function storageInfo(',
              SHELL_JS + 'async function storageInfo(', ctx)
    return s


def apply_sw(s, ctx):
    return ctx.once(s, SW_ACTIVATE_OLD, SW_ACTIVATE_NEW)


# ---------------------------------------------------------------------------------------------------------------
# server

SERVER_HELPERS = r"""// R3.3 p30: bounded body reader. Resolves a Buffer; rejects {status:413|408|499}. Keeps draining after a reject.
function readBody(req,limit,ms){return new Promise((resolve,reject)=>{const chunks=[];let bytes=0,done=false;const fin=(err,val)=>{if(done)return;done=true;clearTimeout(timer);req.off('data',onData);req.off('end',onEnd);req.off('close',onClose);req.off('error',onErr);err?reject(err):resolve(val);};
 const onData=part=>{bytes+=part.length;if(bytes>limit)return fin(Object.assign(Error('Body too large'),{status:413}));chunks.push(Buffer.from(part));};const onEnd=()=>fin(null,Buffer.concat(chunks));const onClose=()=>fin(Object.assign(Error('Request closed'),{status:499}));const onErr=e=>fin(Object.assign(e||Error('Request error'),{status:499}));
 const timer=setTimeout(()=>fin(Object.assign(Error('Body timeout'),{status:408})),ms);req.on('data',onData);req.on('end',onEnd);req.on('close',onClose);req.on('error',onErr);});}
// R3.3 p30: static-file compression helpers.
const ZTYPES=/^(text\/html|text\/javascript|application\/json|image\/svg\+xml|application\/manifest\+json)\b/,ZMIN=1024,ZMAXFILE=67108864,ZCAP=100663296;
function pickEncoding(header,type,size){if(!header||size<ZMIN||size>ZMAXFILE||!ZTYPES.test(type))return '';const q=new Map();for(const part of String(header).split(',')){const [name,...ps]=part.trim().toLowerCase().split(';');const n=name.trim();if(!n)continue;let v=1;for(const p of ps){const m=/^\s*q\s*=\s*([0-9.]+)\s*$/.exec(p);if(m)v=Number(m[1]);}q.set(n,Number.isFinite(v)?v:0);}const get=e=>q.has(e)?q.get(e):(q.has('*')?q.get('*'):0),b=get('br'),g=get('gzip');if(b<=0&&g<=0)return '';return b>=g?'br':'gzip';}
function etagMatches(header,etag){if(!header)return false;return String(header).split(',').some(t=>{t=t.trim();return t==='*'||t.replace(/^W\//,'')===etag;});}
export function makeServer({key=process.env.AZURE_SPEECH_KEY,region=process.env.AZURE_SPEECH_REGION,fetcher=fetch,app=APP,bodyTimeoutMs=10000,prewarm=false}={}){let active=0,hits=[],zc=new Map(),zbytes=0;
 const sigOf=st=>st.size.toString(36)+'-'+Math.floor(st.mtimeMs).toString(36)+'-'+Math.floor(st.ctimeMs).toString(36);
 const zget=(real,sig,enc)=>{const k=real+'\0'+enc,old=zc.get(k);if(old&&old.sig===sig)return old.p;if(old){zc.delete(k);zbytes-=old.size;}const ent={sig,size:0,p:null};ent.p=(async()=>{const raw=await fs.readFile(real);const out=await new Promise((ok,bad)=>{const cb=(e,b)=>e?bad(e):ok(b);if(enc==='br')zlib.brotliCompress(raw,{params:{[zlib.constants.BROTLI_PARAM_QUALITY]:6,[zlib.constants.BROTLI_PARAM_SIZE_HINT]:raw.length}},cb);else zlib.gzip(raw,{level:6},cb);});if(zc.get(k)===ent){ent.size=out.length;zbytes+=out.length;for(const [k2,e2] of zc){if(zbytes<=ZCAP)break;if(k2!==k&&e2.size){zc.delete(k2);zbytes-=e2.size;}}}return out;})();ent.p.catch(()=>{if(zc.get(k)===ent)zc.delete(k);});zc.set(k,ent);return ent.p;};"""

SERVER_SEND_OLD = ("const send=(res,code,data,type='application/json')=>{res.writeHead(code,{'Content-Type':type,"
                   "'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer'});")
SERVER_SEND_NEW = ("const send=(res,code,data,type='application/json',extra={})=>{res.writeHead(code,{'Content-Type':type,"
                   "'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'no-referrer',...extra});")

SPEECH_OLD_A = "hits=hits.filter(t=>t>Date.now()-600000);"
SPEECH_OLD_B = "active++;hits.push(Date.now());try{const upstream=await fetcher("
SPEECH_NEW = r"""const now=Date.now();hits=hits.filter(t=>t>now-600000);if(hits.length>=60||active>=2)return send(res,429,{error:'Local speech limit reached'});
 // R3.3 p30: claim the slot synchronously (no await since the check), before any body byte is read.
 active++;hits.push(now);let freed=false,refunded=false;const free=()=>{if(!freed){freed=true;active--;}},refund=()=>{if(!refunded){refunded=true;const i=hits.indexOf(now);if(i>=0)hits.splice(i,1);}};const ac=new AbortController();if(typeof res.on==='function')res.on('close',()=>ac.abort());
 try{let raw;try{raw=await readBody(req,10000,bodyTimeoutMs);}catch(e){refund();if(e&&e.status===413)return send(res,413,{error:'Body too large'},undefined,{Connection:'close'});if(e&&e.status===408)return send(res,408,{error:'Request body timeout'},undefined,{Connection:'close'});return;}
 let ssml;try{ssml=speechBody(JSON.parse(raw.toString('utf8')));}catch(_){refund();return send(res,400,{error:'Invalid speech request'});}
 const timer=setTimeout(()=>ac.abort(),18000);try{const upstream=await fetcher("""

STATIC_START = "const stat=await fs.stat(real);"
STATIC_END = "res.end(req.method==='HEAD'?undefined:await fs.readFile(real));"
STATIC_NEW = r"""const stat=await fs.stat(real);if(!stat.isFile())return send(res,404,{error:'File not found'});const type={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.wasm':'application/wasm','.gz':'application/gzip','.png':'image/png','.webp':'image/webp','.svg':'image/svg+xml'}[path.extname(real)]||'application/octet-stream';
 // R3.3 p30: ETag + If-None-Match + br/gzip for compressible types (cached in memory per file signature).
 const sig=sigOf(stat),enc=pickEncoding(req.headers['accept-encoding'],type,stat.size),etag='"'+sig+(enc?'-'+enc:'')+'"',vary=ZTYPES.test(type)?{'Vary':'Accept-Encoding'}:{};
 if(etagMatches(req.headers['if-none-match'],etag)){res.writeHead(304,{'ETag':etag,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY',...vary});return res.end();}
 let body,len=stat.size;if(enc){body=await zget(real,sig,enc);len=body.length;}else if(req.method!=='HEAD'){body=await fs.readFile(real);len=body.length;}
 res.writeHead(200,{'Content-Type':type,'Content-Length':len,'Cache-Control':'no-cache','X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','ETag':etag,...vary,...(enc?{'Content-Encoding':enc}:{})});res.end(req.method==='HEAD'?undefined:body);"""

TAIL_OLD = "else res.end();}});\n}"
TAIL_NEW = r"""else res.end();}});
 if(prewarm)server.once('listening',()=>{void(async()=>{try{const real=await fs.realpath(path.join(app,'index.html')),sig=sigOf(await fs.stat(real));await zget(real,sig,'br');await zget(real,sig,'gzip');}catch(_){}})();});
 return server;
}"""


def apply_server(s, ctx):
    once = ctx.once
    s = once(s, "import http from 'node:http';", "import http from 'node:http';import zlib from 'node:zlib';")
    s = _span(s, 'export function makeServer({', 'fetcher=fetch,app=APP}={}){let active=0,hits=[];', SERVER_HELPERS, ctx)
    s = once(s, SERVER_SEND_OLD, SERVER_SEND_NEW)
    s = _span(s, SPEECH_OLD_A, SPEECH_OLD_B, SPEECH_NEW, ctx)
    s = once(s, 'signal:AbortSignal.timeout(18000)', 'signal:ac.signal')
    s = once(s, 'finally{active--;}}', 'finally{clearTimeout(timer);}}finally{free();}}')
    s = _span(s, STATIC_START, STATIC_END, STATIC_NEW, ctx)
    s = once(s, 'return http.createServer(async(req,res)=>{try{', 'const server=http.createServer(async(req,res)=>{try{')
    s = once(s, TAIL_OLD, TAIL_NEW)
    s = once(s, 'makeServer().listen(', 'makeServer({prewarm:true}).listen(')
    return s


# ---------------------------------------------------------------------------------------------------------------
# new files

MANIFEST = """{
  "name": "WordQuest",
  "short_name": "WordQuest",
  "description": "WordQuest 英文默書與數學練習",
  "lang": "zh-HK",
  "dir": "ltr",
  "start_url": "./index.html",
  "scope": "./",
  "display": "standalone",
  "background_color": "#fff8ed",
  "theme_color": "#bf4d25",
  "categories": ["education"],
  "icons": [
    {"src": "icons/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any"},
    {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any"},
    {"src": "icons/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable"}
  ]
}
"""


def _icon_png(size):
    """Original icon: orange field, white rounded "W" built from polylines (no font, no brand/character).

    The W stays inside the central 60% so the same artwork also works as a maskable icon.
    """
    import io
    from PIL import Image, ImageDraw  # imported lazily: only the build needs Pillow
    big = 2048
    k = big / 512.0
    img = Image.new('RGB', (big, big), (0xbf, 0x4d, 0x25))
    d = ImageDraw.Draw(img)
    pts = [(126, 150), (196, 372), (256, 236), (316, 372), (386, 150)]
    w = 46
    pts = [(x * k, y * k) for x, y in pts]
    d.line(pts, fill=(255, 255, 255), width=int(w * k), joint='curve')
    r = w * k / 2
    for x, y in (pts[0], pts[-1], pts[1], pts[3]):  # round caps / joints
        d.ellipse((x - r, y - r, x + r, y + r), fill=(255, 255, 255))
    out = img.resize((size, size), Image.LANCZOS)
    buf = io.BytesIO()
    out.save(buf, 'PNG', optimize=True)
    return buf.getvalue()


def extra_files(ctx):
    return {
        'app/manifest.webmanifest': MANIFEST,
        'app/icons/icon-192.png': _icon_png(192),
        'app/icons/icon-512.png': _icon_png(512),
    }
