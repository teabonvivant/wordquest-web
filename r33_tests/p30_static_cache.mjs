/** R3.3 p30 / static files: ETag, If-None-Match -> 304, br / gzip, HEAD, and the protections that must not change.
 *
 *   WQ33_SERVER   server module under test (default: <repo>/server/local_server.mjs)
 *   WQ33_APP_DIR  directory holding the real index.html for the transfer-size checks (default: <repo>/app)
 * Real loopback sockets, raw (undecoded) response bytes. One line per check: `PASS name` / `FAIL name :: detail`.
 * Run against originals/R3_2 (server + app dir) to see the baseline fail the caching checks.
 */
import http from 'node:http';
import zlib from 'node:zlib';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SERVER = path.resolve(process.env.WQ33_SERVER || path.join(ROOT, 'server/local_server.mjs'));
const REAL_APP = path.resolve(process.env.WQ33_APP_DIR || path.join(ROOT, 'app'));
const {makeServer} = await import(pathToFileURL(SERVER).href);
const sha = b => crypto.createHash('sha256').update(b).digest('hex');
const rows = [];
const open = [];

// Count real compressions (the server calls zlib.* at request time, so wrapping the shared module object works).
const zcalls = {br: 0, gzip: 0};
const origBr = zlib.brotliCompress, origGz = zlib.gzip;
zlib.brotliCompress = (...a) => { zcalls.br++; return origBr.apply(zlib, a); };
zlib.gzip = (...a) => { zcalls.gzip++; return origGz.apply(zlib, a); };

// ---- fixtures -----------------------------------------------------------------------------------------------
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'wq33-p30-static-'));
const app = path.join(tmp, 'app');
await fs.mkdir(app);
const words = 'WordQuest apple banana cherry 英文默書 數學練習 function const return await '.split(' ');
const text = (n, seed = 1) => { let x = seed, out = ''; while (out.length < n) { x = (x * 1103515245 + 12345) & 0x7fffffff; out += words[x % words.length] + ' '; } return out.slice(0, n); };
const rnd = n => crypto.randomBytes(n);
const files = {
  'index.html': '<!doctype html><p>' + text(300000, 1) + '</p>',
  'big.js': '/* js */' + text(200000, 2),
  'data.json': JSON.stringify({rows: text(50000, 3).split(' ')}),
  'icon.svg': '<svg xmlns="http://www.w3.org/2000/svg">' + '<path d="M0 0L10 10"/>'.repeat(200) + '</svg>',
  'app.webmanifest': JSON.stringify({name: 'x', note: text(3000, 4)}),
  'tiny.webmanifest': '{"name":"x"}',
  'small.json': '{"a":1}',
  'pic.png': rnd(50000), 'pic.webp': rnd(20000), 'core.wasm': Buffer.concat([Buffer.from([0, 97, 115, 109]), rnd(60000)]), 'data.gz': rnd(20000),
};
for (const [n, c] of Object.entries(files)) await fs.writeFile(path.join(app, n), c);
const outside = path.join(tmp, 'outside.txt');
await fs.writeFile(outside, 'private');
await fs.symlink(outside, path.join(app, 'link.txt'));

async function start(dir) {
  const srv = makeServer({app: dir});
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const o = {srv, port: srv.address().port};
  open.push(o);
  return o;
}
/** Raw GET/HEAD: body is NOT decoded. */
function get(port, p, {method = 'GET', headers = {}} = {}) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const req = http.request({host: '127.0.0.1', port, method, path: p, agent: false, headers: {host: '127.0.0.1:' + port, ...headers}}, res => {
      const bufs = []; res.on('data', d => bufs.push(d));
      res.on('end', () => resolve({status: res.statusCode, headers: res.headers, body: Buffer.concat(bufs), ms: Date.now() - t0}));
    });
    req.on('error', reject);
    req.end();
  });
}
const dec = r => r.headers['content-encoding'] === 'br' ? zlib.brotliDecompressSync(r.body) : r.headers['content-encoding'] === 'gzip' ? zlib.gunzipSync(r.body) : r.body;
async function test(name, fn) {
  try { const d = await fn(); rows.push({name, pass: true}); console.log('PASS ' + name + (d ? ' :: ' + d : '')); }
  catch (e) { rows.push({name, pass: false}); console.log('FAIL ' + name + ' :: ' + String(e.message || e).split('\n')[0]); }
}
function check(cond, msg) { if (!cond) throw Error(msg); }
const mb = n => (n / 1048576).toFixed(2) + ' MB';

const S = await start(app);
const AE = ae => ({'accept-encoding': ae});

// ---- validators ---------------------------------------------------------------------------------------------
await test('GET carries a strong ETag', async () => {
  const r = await get(S.port, '/big.js');
  check(r.status === 200 && /^"[^"]+"$/.test(r.headers.etag || ''), 'etag=' + r.headers.etag);
});
await test('ETag is stable across requests and changes when the file changes', async () => {
  const a = (await get(S.port, '/data.json')).headers.etag, b = (await get(S.port, '/data.json')).headers.etag;
  await fs.writeFile(path.join(app, 'extra.json'), '{"v":1}'); const e1 = (await get(S.port, '/extra.json')).headers.etag;
  await new Promise(r => setTimeout(r, 20)); await fs.writeFile(path.join(app, 'extra.json'), '{"v":22}'); const e2 = (await get(S.port, '/extra.json')).headers.etag;
  check(a && a === b, 'unstable ' + a + ' vs ' + b); check(e1 && e2 && e1 !== e2, 'unchanged after edit ' + e1 + ' / ' + e2);
});
await test('If-None-Match with the current ETag -> 304, empty body', async () => {
  const etag = ((await get(S.port, '/big.js')).headers.etag || '"missing"');
  const r = await get(S.port, '/big.js', {headers: {'if-none-match': etag}});
  check(r.status === 304 && r.body.length === 0 && r.headers.etag === etag, `status ${r.status}, body ${r.body.length}`);
});
await test('304 keeps Cache-Control: no-cache, nosniff and X-Frame-Options', async () => {
  const etag = ((await get(S.port, '/big.js')).headers.etag || '"missing"');
  const h = (await get(S.port, '/big.js', {headers: {'if-none-match': etag}})).headers;
  check(h['cache-control'] === 'no-cache' && h['x-content-type-options'] === 'nosniff' && h['x-frame-options'] === 'DENY', JSON.stringify(h));
});
await test('weak validator and a list of tags still match (If-None-Match: "x", W/"etag")', async () => {
  const etag = ((await get(S.port, '/big.js')).headers.etag || '"missing"');
  const a = await get(S.port, '/big.js', {headers: {'if-none-match': 'W/' + etag}});
  const b = await get(S.port, '/big.js', {headers: {'if-none-match': '"nope", W/' + etag}});
  check(a.status === 304 && b.status === 304, `weak ${a.status}, list ${b.status}`);
});
await test('If-None-Match: * -> 304', async () => {
  check((await get(S.port, '/big.js', {headers: {'if-none-match': '*'}})).status === 304, 'not 304');
});
await test('non-matching If-None-Match -> 200 with the full body', async () => {
  const r = await get(S.port, '/big.js', {headers: {'if-none-match': '"stale"'}});
  check(r.status === 200 && r.body.equals(await fs.readFile(path.join(app, 'big.js'))), 'status ' + r.status);
});

// ---- content negotiation ------------------------------------------------------------------------------------
await test('Accept-Encoding: br -> Content-Encoding br, Vary, body decodes to the original bytes', async () => {
  const r = await get(S.port, '/index.html', {headers: AE('br')});
  check(r.headers['content-encoding'] === 'br', 'content-encoding=' + r.headers['content-encoding']);
  check(/accept-encoding/i.test(r.headers.vary || ''), 'vary=' + r.headers.vary);
  check(r.body.length < Buffer.byteLength(files['index.html']) / 3 && Number(r.headers['content-length']) === r.body.length, `len ${r.body.length}`);
  check(dec(r).equals(Buffer.from(files['index.html'])), 'decoded bytes differ');
});
await test('Accept-Encoding: gzip -> Content-Encoding gzip, body decodes to the original bytes', async () => {
  const r = await get(S.port, '/index.html', {headers: AE('gzip, deflate')});
  check(r.headers['content-encoding'] === 'gzip', 'content-encoding=' + r.headers['content-encoding']);
  check(dec(r).equals(Buffer.from(files['index.html'])), 'decoded bytes differ');
});
await test('negotiation table: br wins ties, q-values and q=0 respected, unknown codings fall back to identity', async () => {
  const want = [['gzip, deflate, br', 'br'], ['gzip;q=1, br;q=0.5', 'gzip'], ['br;q=0, gzip', 'gzip'], ['*', 'br'], ['gzip;q=0, br;q=0', undefined],
    ['identity', undefined], ['deflate', undefined], ['br;q=0, *;q=0.2', 'gzip']];
  const bad = [];
  for (const [ae, enc] of want) { const r = await get(S.port, '/big.js', {headers: AE(ae)}); if (r.headers['content-encoding'] !== enc) bad.push(`${ae} -> ${r.headers['content-encoding']} (want ${enc})`); }
  check(!bad.length, bad.join('; '));
});
await test('no Accept-Encoding -> identity bytes, still Vary for compressible types', async () => {
  const r = await get(S.port, '/index.html');
  check(!r.headers['content-encoding'] && r.body.equals(Buffer.from(files['index.html'])), 'got encoding ' + r.headers['content-encoding']);
  check(/accept-encoding/i.test(r.headers.vary || ''), 'vary=' + r.headers.vary);
});
await test('each coding has its own ETag; a br ETag does not validate the identity variant', async () => {
  const id = (await get(S.port, '/index.html')).headers.etag, br = (await get(S.port, '/index.html', {headers: AE('br')})).headers.etag, gz = (await get(S.port, '/index.html', {headers: AE('gzip')})).headers.etag;
  check(id && br && gz && new Set([id, br, gz]).size === 3, [id, br, gz].join(' | '));
  const r = await get(S.port, '/index.html', {headers: {'if-none-match': br}});
  check(r.status === 200, 'identity request with a br tag answered ' + r.status);
  const r2 = await get(S.port, '/index.html', {headers: {...AE('br'), 'if-none-match': br}});
  check(r2.status === 304, 'br request with its own tag answered ' + r2.status);
});
await test('compressible types: js, json, svg and webmanifest (>= 1 KB) are compressed; webmanifest MIME is manifest+json', async () => {
  const bad = [];
  for (const [f, mime] of [['big.js', 'text/javascript; charset=utf-8'], ['data.json', 'application/json'], ['icon.svg', 'image/svg+xml'], ['app.webmanifest', 'application/manifest+json']]) {
    const r = await get(S.port, '/' + f, {headers: AE('br')});
    if (r.headers['content-encoding'] !== 'br') bad.push(f + ' not br'); else if (!dec(r).equals(Buffer.from(files[f]))) bad.push(f + ' decode differs');
    if (r.headers['content-type'] !== mime) bad.push(`${f} type ${r.headers['content-type']}`);
  }
  check(!bad.length, bad.join('; '));
});
await test('files under 1 KB are not compressed (tiny webmanifest, small json)', async () => {
  for (const f of ['tiny.webmanifest', 'small.json']) { const r = await get(S.port, '/' + f, {headers: AE('br, gzip')}); check(!r.headers['content-encoding'] && r.body.equals(Buffer.from(files[f])), f + ' encoded ' + r.headers['content-encoding']); }
});
await test('png, webp, wasm and .gz are never compressed; wasm keeps its MIME type', async () => {
  for (const f of ['pic.png', 'pic.webp', 'core.wasm', 'data.gz']) { const r = await get(S.port, '/' + f, {headers: AE('br, gzip')}); check(!r.headers['content-encoding'] && r.body.equals(Buffer.from(files[f])), f + ' encoded ' + r.headers['content-encoding']); }
  check((await get(S.port, '/core.wasm')).headers['content-type'] === 'application/wasm', 'wasm MIME');
});

// ---- HEAD, headers, cache -----------------------------------------------------------------------------------
await test('HEAD (identity): Content-Length = file size, no body, same ETag as GET', async () => {
  const g = await get(S.port, '/index.html'), h = await get(S.port, '/index.html', {method: 'HEAD'});
  check(h.status === 200 && h.body.length === 0 && Number(h.headers['content-length']) === Buffer.byteLength(files['index.html']) && !!g.headers.etag && h.headers.etag === g.headers.etag, `len ${h.headers['content-length']}`);
});
await test('HEAD (br): same Content-Length, Content-Encoding and ETag as the GET, no body', async () => {
  const g = await get(S.port, '/index.html', {headers: AE('br')}), h = await get(S.port, '/index.html', {method: 'HEAD', headers: AE('br')});
  check(h.body.length === 0 && h.headers['content-encoding'] === 'br' && h.headers['content-length'] === String(g.body.length) && h.headers.etag === g.headers.etag, `head len ${h.headers['content-length']} enc ${h.headers['content-encoding']} vs get ${g.body.length}`);
});
await test('HEAD with a matching If-None-Match -> 304', async () => {
  const etag = ((await get(S.port, '/index.html', {headers: AE('br')})).headers.etag || '"missing"');
  const r = await get(S.port, '/index.html', {method: 'HEAD', headers: {...AE('br'), 'if-none-match': etag}});
  check(r.status === 304, 'status ' + r.status);
});
await test('Cache-Control: no-cache, nosniff and X-Frame-Options kept on identity and br responses', async () => {
  for (const ae of [undefined, 'br']) { const h = (await get(S.port, '/index.html', {headers: ae ? AE(ae) : {}})).headers; check(h['cache-control'] === 'no-cache' && h['x-content-type-options'] === 'nosniff' && h['x-frame-options'] === 'DENY', `${ae}: ${h['cache-control']}/${h['x-content-type-options']}/${h['x-frame-options']}`); }
});
await test('compressed copy is cached per file: 4 parallel cold br requests compress once, later requests never recompress', async () => {
  await fs.writeFile(path.join(app, 'cold.js'), '/* cold */' + text(150000, 9));
  const before = zcalls.br;
  const rs = await Promise.all([1, 2, 3, 4].map(() => get(S.port, '/cold.js', {headers: AE('br')})));
  await get(S.port, '/cold.js', {headers: AE('br')});
  check(zcalls.br - before === 1, 'brotli calls ' + (zcalls.br - before));
  check(rs.every(r => r.body.equals(rs[0].body) && dec(r).length > 100000), 'bodies differ');
});
await test('cache follows the file: a rewritten file is served (and tagged) fresh, not from the stale copy', async () => {
  const f = path.join(app, 'live.js');
  await fs.writeFile(f, '/* v1 */' + text(5000, 5)); const a = await get(S.port, '/live.js', {headers: AE('br')});
  await new Promise(r => setTimeout(r, 25)); await fs.writeFile(f, '/* v2 */' + text(5000, 6)); const b = await get(S.port, '/live.js', {headers: AE('br')});
  check(a.headers.etag !== b.headers.etag && dec(b).toString().startsWith('/* v2 */') && dec(a).toString().startsWith('/* v1 */'), 'stale content or tag');
});

// ---- protections that must not change -----------------------------------------------------------------------
await test('path traversal, dot files, backslash, NUL and bad escapes are still refused (403 / 403 / 403 / 403 / 400)', async () => {
  const want = [['/%2e%2e%2fouter.txt', 403], ['/.env', 403], ['/%5csecret', 403], ['/%00', 403], ['/%GG', 400], ['/app/%2e%2e%2foriginals/R3_1/app/index.html', 403]];
  const bad = [];
  for (const [p, code] of want) { const r = await get(S.port, p); if (r.status !== code) bad.push(`${p} -> ${r.status}`); }
  check(!bad.length, bad.join('; '));
});
await test('symlink pointing outside the app directory is still refused (403); unknown file 404', async () => {
  const a = await get(S.port, '/link.txt'), b = await get(S.port, '/nothing.js');
  check(a.status === 403 && b.status === 404, `${a.status}/${b.status}`);
});
await test('Host check unchanged: a foreign Host header gets 403 and no ETag', async () => {
  const r = await get(S.port, '/index.html', {headers: {host: 'evil.example'}});
  check(r.status === 403 && !r.headers.etag, 'status ' + r.status);
});
await test('methods unchanged: POST to a static file is 405; /app alias and / serve index.html', async () => {
  const p = await get(S.port, '/index.html', {method: 'POST'}), a = await get(S.port, '/app/'), b = await get(S.port, '/');
  check(p.status === 405 && a.status === 200 && b.status === 200 && a.body.equals(b.body), `${p.status}/${a.status}/${b.status}`);
});
await test('Origin / header checks unchanged on /api/speech (cross-origin 403, no key -> 503)', async () => {
  const post = (h) => new Promise((resolve, reject) => { const q = http.request({host: '127.0.0.1', port: S.port, method: 'POST', path: '/api/speech', agent: false, headers: {host: '127.0.0.1:' + S.port, 'content-type': 'application/json', 'x-wordquest-speech': '1', ...h}}, r => { r.resume(); r.on('end', () => resolve(r.statusCode)); }); q.on('error', reject); q.end('{}'); });
  const x = await post({origin: 'https://evil.example'}), y = await post({origin: 'http://127.0.0.1:' + S.port});
  check(x === 403 && y === 503, `${x}/${y}`);
});

// ---- the real 12 MB single-file app -------------------------------------------------------------------------
const real = await start(REAL_APP);
const realBytes = await fs.readFile(path.join(REAL_APP, 'index.html'));
const realSha = sha(realBytes);
let brLen = 0, gzLen = 0;
await test('real index.html over br: transfer under 7 MB and byte-identical after decoding', async () => {
  const cold = await get(real.port, '/app/index.html', {headers: AE('br')});
  const warm = await get(real.port, '/app/index.html', {headers: AE('br')});
  check(cold.headers['content-encoding'] === 'br', 'not br (' + mb(realBytes.length) + ' sent as is)');
  check(cold.body.length < 7 * 1048576, 'transfer ' + mb(cold.body.length));
  check(sha(dec(cold)) === realSha && warm.body.equals(cold.body), 'decoded sha differs');
  brLen = cold.body.length;
  return `${realBytes.length} -> ${brLen} bytes (${(100 * brLen / realBytes.length).toFixed(1)}%), cold ${cold.ms} ms, warm ${warm.ms} ms`;
});
await test('real index.html over gzip: transfer under 7 MB and byte-identical after decoding', async () => {
  const r = await get(real.port, '/app/index.html', {headers: AE('gzip')});
  gzLen = r.body.length;
  check(r.headers['content-encoding'] === 'gzip', 'not gzip');
  check(gzLen < 7 * 1048576, 'transfer ' + mb(gzLen));
  check(sha(dec(r)) === realSha, 'decoded sha differs');
  return `${realBytes.length} -> ${gzLen} bytes (${(100 * gzLen / realBytes.length).toFixed(1)}%)`;
});
await test('real index.html: second request with If-None-Match -> 304 with an empty body', async () => {
  const first = await get(real.port, '/app/index.html', {headers: AE('br')});
  const r = await get(real.port, '/app/index.html', {headers: {...AE('br'), 'if-none-match': first.headers.etag || '"missing"'}});
  check(r.status === 304 && r.body.length === 0, `status ${r.status}, body ${r.body.length}`);
  return `304 in ${r.ms} ms`;
});
await test('real index.html: HEAD Content-Length equals the br GET length', async () => {
  const h = await get(real.port, '/app/index.html', {method: 'HEAD', headers: AE('br')});
  check(h.body.length === 0 && Number(h.headers['content-length']) === brLen && brLen > 0, `head ${h.headers['content-length']} vs get ${brLen}`);
});

for (const o of open) { try { o.srv.closeAllConnections?.(); o.srv.close(); } catch (_) {} }
await fs.rm(tmp, {recursive: true, force: true});
const failed = rows.filter(r => !r.pass).length;
console.log(`TOTAL ${rows.length} PASS ${rows.length - failed} FAIL ${failed} (server: ${path.relative(ROOT, SERVER) || SERVER})`);
process.exit(failed ? 1 : 0);
