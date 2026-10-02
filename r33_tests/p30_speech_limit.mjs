/** R3.3 p30 / WQ32-03: /api/speech limiter must claim its slot before the body is read.
 *
 * Real loopback sockets, a fake upstream (no network, no key, no billable request).
 *   WQ33_SERVER  server module under test (default: <repo>/server/local_server.mjs)
 * One line per check: `PASS name` / `FAIL name :: detail`. Exit code 1 on any FAIL.
 * Run against originals/R3_2/server/local_server.mjs to see the baseline fail the race / timeout checks.
 */
import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath, pathToFileURL} from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SERVER = path.resolve(process.env.WQ33_SERVER || path.join(ROOT, 'server/local_server.mjs'));
const {makeServer} = await import(pathToFileURL(SERVER).href);
const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'wq33-p30-speech-'));
await fs.writeFile(path.join(tmp, 'index.html'), '<p>fixture</p>');
const good = {text: 'apple', lang: 'en-GB', voice: 'en-GB-SoniaNeural', slow: false};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const rows = [];
const open = [];

/** Fake upstream: counts calls / peak concurrency / aborts. `slow(n)` gives the delay (ms) for the n-th call. */
function upstream({slow = () => 0, fail = () => false} = {}) {
  const st = {calls: 0, cur: 0, max: 0, aborted: 0, signalOk: true};
  const fetcher = async (url, opts) => {
    const n = ++st.calls;
    st.cur++; st.max = Math.max(st.max, st.cur);
    if (!(opts.signal && typeof opts.signal.addEventListener === 'function' && !opts.signal.aborted)) st.signalOk = false;
    let live = true;
    try {
      await new Promise((ok, bad) => {
        const t = setTimeout(ok, slow(n));
        opts.signal?.addEventListener('abort', () => { if (!live) return; clearTimeout(t); st.aborted++; bad(Object.assign(Error('aborted'), {name: 'AbortError'})); });
      });
      if (fail(n)) throw Error('SYNTHETIC upstream failure');
      return {ok: true, arrayBuffer: async () => new Uint8Array([1, 2, 3]).buffer};
    } finally { live = false; st.cur--; }
  };
  return {fetcher, st};
}

async function start(opts = {}) {
  const srv = makeServer({key: 'SYNTHETIC-KEY', region: 'eastasia', app: tmp, ...opts});
  await new Promise(r => srv.listen(0, '127.0.0.1', r));
  const o = {srv, port: srv.address().port};
  open.push(o);
  return o;
}
async function stop(o) { o.srv.closeAllConnections?.(); await new Promise(r => o.srv.close(r)); }

/**
 * One POST over its own socket.
 *  delay     ms to wait after the headers before sending the body (default 0 = immediately)
 *  never     send the headers only and never the body
 *  trickle   ms between single body bytes
 *  abortAt   ms after the headers: destroy the socket (partial = send half the body first)
 *  dropAfter send the whole body at once, then destroy the socket after this many ms (client leaves mid-upstream)
 *  timeout   client side give-up (resolves {timeout:true})
 */
function post(port, o = {}) {
  return new Promise(resolve => {
    const t0 = Date.now();
    const body = o.raw ?? JSON.stringify(o.body ?? good);
    let settled = false;
    const fin = v => { if (!settled) { settled = true; resolve({...v, ms: Date.now() - t0}); } };
    const req = http.request({host: '127.0.0.1', port, method: 'POST', path: '/api/speech', agent: false, headers: {
      host: '127.0.0.1:' + port, origin: 'http://127.0.0.1:' + port, 'x-wordquest-speech': '1',
      'content-type': 'application/json', 'content-length': Buffer.byteLength(body)}}, res => {
      const bufs = []; res.on('data', d => bufs.push(d)); res.on('end', () => fin({status: res.statusCode, headers: res.headers, text: Buffer.concat(bufs).toString('latin1')}));
      res.on('error', e => fin({status: res.statusCode, error: e.code}));
    });
    req.on('error', e => fin({error: e.code || e.message}));
    if (o.timeout) setTimeout(() => { fin({timeout: true}); req.destroy(); }, o.timeout);
    req.flushHeaders();
    const bytes = Buffer.from(body);
    if (o.never) return;
    if (o.dropAfter !== undefined) {
      req.write(bytes);
      setTimeout(() => { req.destroy(); fin({aborted: true}); }, o.dropAfter);
      return;
    }
    if (o.abortAt !== undefined) {
      setTimeout(() => { if (o.partial) req.write(bytes.subarray(0, Math.floor(bytes.length / 2))); setTimeout(() => { req.destroy(); fin({aborted: true}); }, 30); }, o.abortAt);
      return;
    }
    if (o.trickle) {
      let i = 0;
      const tick = () => { if (settled || i >= bytes.length) return; req.write(bytes.subarray(i, i + 1)); i++; setTimeout(tick, o.trickle); };
      tick();
      return;
    }
    if (o.delay) setTimeout(() => req.end(bytes), o.delay); else req.end(bytes);
  });
}
const count = (rs, code) => rs.filter(r => r.status === code).length;
async function test(name, fn) {
  try { const d = await fn(); rows.push({name, pass: true}); console.log('PASS ' + name + (d ? ' :: ' + d : '')); }
  catch (e) { rows.push({name, pass: false}); console.log('FAIL ' + name + ' :: ' + String(e.message || e).split('\n')[0]); }
}
function check(cond, msg) { if (!cond) throw Error(msg); }

// The default-timeout check takes ~10 s; start it first and report it in order at the end.
const defaultTimeout = (async () => {
  const s = await start({fetcher: upstream().fetcher});
  const r = await post(s.port, {never: true, timeout: 14000});
  await stop(s);
  return r;
})();

// The 18 s upstream cap check takes ~18 s of real time; it also runs in the background and is reported at the end.
const upstreamCap = (async () => {
  const up = upstream({slow: n => (n === 1 ? 26000 : 0)}), s = await start({fetcher: up.fetcher});
  const r = await post(s.port, {timeout: 24000});
  const r2 = await post(s.port, {timeout: 3000});
  await stop(s);
  return {r, r2, up};
})();

await test('race: 8 requests that flush headers first and send the body after 200 ms -> 2 reach upstream, 6 get 429', async () => {
  const up = upstream({slow: () => 400}), s = await start({fetcher: up.fetcher});
  const rs = await Promise.all(Array.from({length: 8}, () => post(s.port, {delay: 200, timeout: 4000})));
  await stop(s);
  const detail = `200x${count(rs, 200)} 429x${count(rs, 429)} upstream calls=${up.st.calls} peak concurrency=${up.st.max}`;
  check(up.st.max <= 2 && count(rs, 200) === 2 && count(rs, 429) === 6, detail);
  return detail;
});

await test('4 deferred-body requests: upstream concurrency never above 2, split 2x200 / 2x429', async () => {
  const up = upstream({slow: () => 300}), s = await start({fetcher: up.fetcher});
  const rs = await Promise.all(Array.from({length: 4}, () => post(s.port, {delay: 150, timeout: 4000})));
  await stop(s);
  const detail = `200x${count(rs, 200)} 429x${count(rs, 429)} peak=${up.st.max}`;
  check(up.st.max <= 2 && count(rs, 200) === 2 && count(rs, 429) === 2, detail);
  return detail;
});

await test('regression: immediate burst of 6 requests, slow upstream -> peak concurrency 2, 4 get 429', async () => {
  const up = upstream({slow: () => 300}), s = await start({fetcher: up.fetcher});
  const rs = await Promise.all(Array.from({length: 6}, () => post(s.port, {timeout: 4000})));
  await stop(s);
  const detail = `200x${count(rs, 200)} 429x${count(rs, 429)} peak=${up.st.max}`;
  check(up.st.max <= 2 && count(rs, 200) === 2 && count(rs, 429) === 4, detail);
  return detail;
});

await test('malformed JSON x5 leaves no slot behind (two valid requests still run together)', async () => {
  const up = upstream({slow: () => 150}), s = await start({fetcher: up.fetcher});
  for (let i = 0; i < 5; i++) check((await post(s.port, {raw: '{', timeout: 3000})).status === 400, 'bad JSON should be 400');
  const rs = await Promise.all([post(s.port, {timeout: 3000}), post(s.port, {timeout: 3000})]);
  await stop(s);
  check(rs.every(r => r.status === 200), 'statuses ' + rs.map(r => r.status));
});

await test('aborted connections (headers only / half a body) leave no slot behind', async () => {
  const up = upstream({slow: () => 100}), s = await start({fetcher: up.fetcher});
  for (let i = 0; i < 3; i++) { await post(s.port, {abortAt: 20, partial: i % 2 === 1}); await sleep(80); }
  const rs = await Promise.all([post(s.port, {timeout: 3000}), post(s.port, {timeout: 3000})]);
  await stop(s);
  check(rs.every(r => r.status === 200), 'statuses ' + rs.map(r => r.status));
});

await test('body never sent: 408 after the (shortened) body deadline, with Connection: close', async () => {
  const s = await start({fetcher: upstream().fetcher, bodyTimeoutMs: 300});
  const r = await post(s.port, {never: true, timeout: 2500});
  await stop(s);
  const detail = r.timeout ? 'no response within 2.5 s' : `status ${r.status} after ${r.ms} ms`;
  check(r.status === 408 && r.ms >= 250 && r.ms < 2000, detail);
  check(/close/i.test(r.headers.connection || ''), 'Connection header was ' + r.headers.connection);
  return detail;
});

await test('slow trickle (1 byte / 80 ms) hits the total deadline, not an idle timer', async () => {
  const s = await start({fetcher: upstream().fetcher, bodyTimeoutMs: 600});
  const r = await post(s.port, {trickle: 80, timeout: 3000});
  await stop(s);
  const detail = r.timeout ? 'no response within 3 s' : `status ${r.status} after ${r.ms} ms`;
  check(r.status === 408 && r.ms >= 500 && r.ms < 2000, detail);
  return detail;
});

await test('after two stalled bodies time out (408), both slots are free again', async () => {
  const up = upstream({slow: () => 100}), s = await start({fetcher: up.fetcher, bodyTimeoutMs: 300});
  const stalled = await Promise.all([post(s.port, {never: true, timeout: 2500}), post(s.port, {never: true, timeout: 2500})]);
  const rs = await Promise.all([post(s.port, {timeout: 3000}), post(s.port, {timeout: 3000})]);
  await stop(s);
  check(stalled.every(r => r.status === 408), 'stalled statuses ' + stalled.map(r => r.status || 'none'));
  check(rs.every(r => r.status === 200), 'later statuses ' + rs.map(r => r.status));
});

await test('client disconnect during the upstream call aborts it and frees the slot at once', async () => {
  const up = upstream({slow: n => (n <= 2 ? 1500 : 0)}), s = await start({fetcher: up.fetcher});
  const gone = [post(s.port, {dropAfter: 250}), post(s.port, {dropAfter: 250})]; // body is sent at once; the drop lands mid-upstream
  await Promise.all(gone); await sleep(150);
  const r = await post(s.port, {timeout: 1000});
  await stop(s);
  const detail = `upstream aborted=${up.st.aborted}, follow-up status ${r.status || 'none'}`;
  check(up.st.aborted === 2 && r.status === 200, detail);
  return detail;
});

await test('upstream exception x5 (502) leaves no slot behind', async () => {
  const up = upstream({fail: n => n <= 5}), s = await start({fetcher: up.fetcher});
  for (let i = 0; i < 5; i++) check((await post(s.port, {timeout: 3000})).status === 502, 'expected 502');
  const rs = await Promise.all([post(s.port, {timeout: 3000}), post(s.port, {timeout: 3000})]);
  await stop(s);
  check(rs.every(r => r.status === 200), 'statuses ' + rs.map(r => r.status));
});

await test('upstream call receives a live AbortSignal (18 s cap kept)', async () => {
  const up = upstream(), s = await start({fetcher: up.fetcher});
  const r = await post(s.port, {timeout: 3000});
  await stop(s);
  check(r.status === 200 && up.st.signalOk, `status ${r.status}, signalOk=${up.st.signalOk}`);
});

await test('over 10 KB body: 413 is delivered over a real socket and the slot is freed', async () => {
  const up = upstream({slow: () => 50}), s = await start({fetcher: up.fetcher});
  const big = await post(s.port, {raw: JSON.stringify({text: 'x'.repeat(20000)}), timeout: 3000});
  const rs = await Promise.all([post(s.port, {timeout: 3000}), post(s.port, {timeout: 3000})]);
  await stop(s);
  check(big.status === 413, 'big body status ' + (big.status || big.error || 'none'));
  check(rs.every(r => r.status === 200), 'later statuses ' + rs.map(r => r.status));
});

await test('quota: 60 requests / 10 minutes still enforced (61st is 429)', async () => {
  const up = upstream(), s = await start({fetcher: up.fetcher});
  let ok = 0;
  for (let i = 0; i < 60; i++) if ((await post(s.port, {timeout: 3000})).status === 200) ok++;
  const last = await post(s.port, {timeout: 3000});
  await stop(s);
  check(ok === 60 && last.status === 429, `ok=${ok}, 61st=${last.status}`);
});

await test('quota: requests that fail before upstream (bad JSON, 413, 408) do not use up the 60', async () => {
  const up = upstream(), s = await start({fetcher: up.fetcher, bodyTimeoutMs: 200});
  for (let i = 0; i < 5; i++) await post(s.port, {raw: '{', timeout: 3000});
  await post(s.port, {raw: JSON.stringify({text: 'x'.repeat(20000)}), timeout: 3000});
  await post(s.port, {never: true, timeout: 2000});
  let ok = 0;
  for (let i = 0; i < 60; i++) if ((await post(s.port, {timeout: 3000})).status === 200) ok++;
  const last = await post(s.port, {timeout: 3000});
  await stop(s);
  check(ok === 60 && last.status === 429, `ok=${ok}, 61st=${last.status}`);
});

await test('upstream hung for 26 s is cut at ~18 s (502), the call is aborted and the slot is freed', async () => {
  const {r, r2, up} = await upstreamCap;
  const detail = `hung call -> ${r.timeout ? 'no response in 24 s' : r.status} after ${r.ms} ms, aborted=${up.st.aborted}, next request ${r2.status}`;
  check(r.status === 502 && r.ms >= 17000 && r.ms <= 20500 && up.st.aborted === 1 && r2.status === 200, detail);
  return detail;
});

await test('default body deadline is 10 s (408 between 9 s and 12.5 s)', async () => {
  const r = await defaultTimeout;
  const detail = r.timeout ? 'no response within 14 s' : `status ${r.status} after ${r.ms} ms`;
  check(r.status === 408 && r.ms >= 9000 && r.ms <= 12500, detail);
  return detail;
});

for (const o of open) { try { o.srv.closeAllConnections?.(); o.srv.close(); } catch (_) {} }
await fs.rm(tmp, {recursive: true, force: true});
const failed = rows.filter(r => !r.pass).length;
console.log(`TOTAL ${rows.length} PASS ${rows.length - failed} FAIL ${failed} (server: ${path.relative(ROOT, SERVER) || SERVER})`);
process.exit(failed ? 1 : 0);
