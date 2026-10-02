// Headless loader for the arcade engines of any build (WQ34_APP selects app/index.html).
// Loads the shared contract scripts plus every engine in a Node vm with a stub canvas.
const fs = require('fs'), path = require('path'), vm = require('vm');
const ROOT = path.resolve(__dirname, '..');
const APP = process.env.WQ34_APP || path.join(ROOT, 'app/index.html');
const html = fs.readFileSync(APP, 'utf8');
const tags = [...html.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/gi)].map(x => x[1]);
const noop = () => {};
const gradient = { addColorStop: noop };
const ctx = new Proxy({ canvas: { width: 800, height: 560 }, measureText: x => ({ width: String(x).length * 12 }),
  createLinearGradient: () => gradient, createRadialGradient: () => gradient },
  { get: (o, k) => (k in o ? o[k] : noop), set: (o, k, v) => ((o[k] = v), true) });
const store = new Map();
const sandbox = { console, performance: { now: () => 0 }, Date, Math, JSON, Set, Map, WeakMap, TextEncoder, TextDecoder,
  Uint8Array, ArrayBuffer, structuredClone, Buffer, setTimeout, clearTimeout,
  atob: s => Buffer.from(s, 'base64').toString('binary'), btoa: s => Buffer.from(s, 'binary').toString('base64'),
  matchMedia: () => ({ matches: false }), navigator: { maxTouchPoints: 0 },
  localStorage: { getItem: k => (store.has(k) ? store.get(k) : null), setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) } };
sandbox.window = sandbox; sandbox.globalThis = sandbox;
vm.createContext(sandbox);
for (const i of [6, 9, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23]) {
  vm.runInContext(tags[i], sandbox, { filename: 'app-script-' + i + '.js' });
}
vm.runInContext('globalThis.registry=WQGames;globalThis.core=WQCore', sandbox);
const IDS = sandbox.WQArcade28 ? sandbox.WQArcade28.ids : sandbox.registry.map(g => g.id);
function create(id, difficulty = 1, seed = 123, opts = {}) {
  const m = sandbox.registry.find(x => x.id === id);
  if (!m) throw Error('unknown game ' + id);
  const log = { result: null, tones: [], notes: [], tools: [], hint: '' };
  const api = { meta: m, ctx, seed, difficulty, preview: !!opts.preview, latency: opts.latency || 0,
    tools: t => { log.tools = t; }, hint: t => { log.hint = t; }, announce: t => log.notes.push(t), tone: (f, d) => log.tones.push([f, d]), music: noop,
    clock: () => 0, instrument: noop, complete: r => { log.result = r; }, getData: () => null, putData: noop,
    downloadJSON: noop, importJSON: noop };
  const g = new m.Class(api);
  Object.defineProperty(g, '__log', { enumerable: false, value: log });
  return g;
}
const snap = sandbox.WQArcadeSnapshot28;
function checkpoint(g) { const s = snap.capture(g); snap.verify(s); return s; }
module.exports = { ROOT, APP, sandbox, create, ctx, checkpoint, snap, IDS, tags, vm };
