'use strict';
/* R3.3 p20 pure-logic tests (no browser): rescue decision table, journal status, tombstone, orphan keys, dialog-gate predicate.
 * One line per check: "PASS <name>" / "FAIL <name> :: <reason>"; exit code 1 when anything fails. */
const path = require('node:path'), assert = require('node:assert/strict'), fs = require('node:fs'), vm = require('node:vm');
const P = require(path.resolve(__dirname, '../r33_src/p20_family_pure.js'));
let n = 0, bad = 0;
function test(name, fn) {
  n++;
  try { fn(); console.log('PASS ' + name); }
  catch (e) { bad++; console.log('FAIL ' + name + ' :: ' + String(e.message).split('\n')[0].slice(0, 200)); }
}

/* ---- rescue decision table ---- */
test('no marker -> mode none (nothing to rescue), any journal state', () => {
  for (const j of ['ok', 'missing', 'invalid', 'error']) for (const m of [null, undefined, '']) assert.equal(P.rescueDecision(m, j).mode, 'none');
});
test('prepared + missing journal -> rescue (journal-missing)', () => assert.deepEqual(
  (({ mode, reason }) => ({ mode, reason }))(P.rescueDecision('prepared', 'missing')), { mode: 'rescue', reason: 'journal-missing' }));
test('prepared + invalid journal -> rescue (journal-invalid)', () => assert.deepEqual(
  (({ mode, reason }) => ({ mode, reason }))(P.rescueDecision('prepared', 'invalid')), { mode: 'rescue', reason: 'journal-invalid' }));
test('prepared + valid journal -> refuse, recover first', () => {
  const d = P.rescueDecision('prepared', 'ok');
  assert.equal(d.mode, 'refuse-recover'); assert(d.message.includes('恢復中斷交易'));
});
test('committed / rolled-back never rescue, whatever the journal says', () => {
  for (const m of ['committed', 'rolled-back']) for (const j of ['ok', 'missing', 'invalid']) assert.equal(P.rescueDecision(m, j).mode, 'refuse-recover');
});
test('unknown marker value -> rescue (marker-unknown) for any readable journal', () => {
  for (const j of ['ok', 'missing', 'invalid']) assert.deepEqual((({ mode, reason }) => ({ mode, reason }))(P.rescueDecision('weird', j)), { mode: 'rescue', reason: 'marker-unknown' });
});
test('unreadable journal store always refuses (any marker), with an explanation', () => {
  for (const m of ['prepared', 'committed', 'rolled-back', 'weird']) { const d = P.rescueDecision(m, 'error'); assert.equal(d.mode, 'refuse-error'); assert(d.message.length > 20); }
});
test('unknown journal state is treated as unreadable (fail closed)', () => assert.equal(P.rescueDecision('prepared', 'what').mode, 'refuse-error'));
test('journalStatus: missing / ok / invalid', () => {
  assert.equal(P.journalStatus(undefined, () => {}), 'missing');
  assert.equal(P.journalStatus(null, () => {}), 'missing');
  assert.equal(P.journalStatus({ a: 1 }, () => {}), 'ok');
  assert.equal(P.journalStatus({ a: 1 }, () => { throw Error('x'); }), 'invalid');
});
test('rescueGuide: texts per kind, empty for none', () => {
  assert.equal(P.rescueGuide(P.rescueDecision(null, 'ok')).kind, 'none');
  const m = P.rescueGuide(P.rescueDecision('prepared', 'missing'));
  assert.equal(m.kind, 'rescue'); assert(m.title.includes('找不到復原日誌') && m.text.includes('還原家庭備份'));
  assert(P.rescueGuide(P.rescueDecision('prepared', 'invalid')).title.includes('損壞'));
  assert(P.rescueGuide(P.rescueDecision('weird', 'ok')).title.includes('內容不明'));
  assert.equal(P.rescueGuide(P.rescueDecision('prepared', 'ok')).kind, 'recover');
  assert.equal(P.rescueGuide(P.rescueDecision('prepared', 'error')).kind, 'error');
});
test('rescueExportCheck blocks empty, broken and child-less data, accepts a valid one', () => {
  const ok = x => { if (!x || typeof x !== 'object') throw Error('bad'); };
  assert.equal(P.rescueExportCheck(null, ok).ok, false);
  assert.equal(P.rescueExportCheck('', ok).ok, false);
  assert.equal(P.rescueExportCheck('{broken', ok).ok, false);
  assert.equal(P.rescueExportCheck('{"children":[]}', ok).ok, false);
  assert.equal(P.rescueExportCheck('{"children":[{"id":"c"}]}', () => { throw Error('invalid'); }).ok, false);
  assert.equal(P.rescueExportCheck('{"children":[{"id":"c"}]}', ok).ok, true);
});

/* ---- tombstone ---- */
test('tombstone round trip keeps order and drops duplicates / junk', () => {
  const raw = P.serializeTombstone(['a', 'b', 'a', '', 5, null, 'c']);
  assert.deepEqual(JSON.parse(raw), { v: 1, ids: ['a', 'b', 'c'] });
  assert.deepEqual(P.parseTombstone(raw), ['a', 'b', 'c']);
});
test('parseTombstone tolerates absent, damaged, wrong-version values', () => {
  for (const x of [null, undefined, '', '{', '[]', '{"v":2,"ids":["a"]}', '{"v":1,"ids":"a"}', 7]) assert.deepEqual(P.parseTombstone(x), []);
});
test('tombstone cap keeps the newest 8000 ids', () => {
  const many = Array.from({ length: 8100 }, (_, i) => 'w' + i), out = P.parseTombstone(P.serializeTombstone(many));
  assert.equal(out.length, P.TOMB_MAX); assert.equal(out[0], 'w100'); assert.equal(out.at(-1), 'w8099');
});
test('mergeTombstone / subtractTombstone', () => {
  assert.deepEqual(P.mergeTombstone(['a', 'b'], ['b', 'c']), ['a', 'b', 'c']);
  assert.deepEqual(P.subtractTombstone(['a', 'b', 'c'], ['b']), ['a', 'c']);
  assert.deepEqual(P.mergeTombstone(null, ['x']), ['x']);
});
test('tombKey is per owner', () => assert.equal(P.tombKey('u_1'), 'wq-r3-media-gc:u_1'));

/* ---- media keys ---- */
test('mediaKind: image/note only, audio and junk never', () => {
  assert.equal(P.mediaKind('image:w_1:apple'), 'image'); assert.equal(P.mediaKind('note:w_1:apple'), 'note');
  for (const k of ['audio:en-GB:apple', 'x', '', null, undefined, 5, 'imagex:w:t']) assert.equal(P.mediaKind(k), null);
});
test('orphan detection: live id keeps the row, unknown id marks it orphan', () => {
  const live = new Set(['w_1']);
  assert.equal(P.isOrphanMediaKey('image:w_1:apple', live), false);
  assert.equal(P.isOrphanMediaKey('note:w_1:apple', live), false);
  assert.equal(P.isOrphanMediaKey('image:w_9:apple', live), true);
  assert.equal(P.isOrphanMediaKey('note:w_9:apple', live), true);
});
test('orphan detection never touches audio, unknown formats or malformed keys', () => {
  const live = new Set();
  for (const k of ['audio:en-GB:apple', 'audio:en-GB:image:w_1:x', 'test-custom-picture', 'image:nocolon', 'image:', 'note:', 5, null]) assert.equal(P.isOrphanMediaKey(k, live), false, String(k));
});
test('ids and text may contain colons: any prefix that is a live id counts', () => {
  assert.equal(P.isOrphanMediaKey('image:a:b:text with: colons', new Set(['a:b'])), false);
  assert.equal(P.isOrphanMediaKey('image:a:b:text', new Set(['a'])), false);
  assert.equal(P.isOrphanMediaKey('image:a:b:text', new Set(['zzz'])), true);
});
test('liveMediaRows filters orphans, keeps audio and unknown rows', () => {
  const rows = [{ key: 'image:w1:a' }, { key: 'note:w1:a' }, { key: 'image:gone:a' }, { key: 'note:gone:a' }, { key: 'audio:en-GB:a' }, { key: 'weird' }, {}];
  assert.deepEqual(P.liveMediaRows(rows, [{ id: 'w1' }]).map(r => r.key), ['image:w1:a', 'note:w1:a', 'audio:en-GB:a', 'weird', undefined]);
  assert.equal(P.liveMediaRows(null, null).length, 0);
});
test('gcMatch deletes only tombstoned ids and never a live one', () => {
  const tomb = new Set(['d1', 'both']), live = new Set(['l1', 'both']);
  assert.equal(P.gcMatch('image:d1:t', tomb, live), true);
  assert.equal(P.gcMatch('note:d1:t', tomb, live), true);
  assert.equal(P.gcMatch('image:l1:t', tomb, live), false);
  assert.equal(P.gcMatch('image:both:t', tomb, live), false);
  assert.equal(P.gcMatch('image:other:t', tomb, live), false);
  assert.equal(P.gcMatch('audio:en-GB:d1', tomb, live), false);
  assert.equal(P.gcMatch('image:d1', tomb, live), false);
});

/* ---- dialog gate predicate (N11) ---- */
test('needsParentGate: parent actions, admin, pg save-settings', () => {
  const pa = new Set(['save-range', 'delete-child']);
  assert.equal(P.needsParentGate({ act: 'save-range' }, pa), true);
  assert.equal(P.needsParentGate({ act: 'delete-child' }, pa), true);
  assert.equal(P.needsParentGate({ act: 'logout' }, pa), false);
  assert.equal(P.needsParentGate({ admin: '' }, pa), true);
  assert.equal(P.needsParentGate({ pg: 'save-settings' }, pa), true);
  assert.equal(P.needsParentGate({ pg: 'buy' }, pa), false);
  assert.equal(P.needsParentGate(null, pa), false);
  assert.equal(P.needsParentGate({}, pa), false);
});
test('needsParentGate: data-r3 / data-r32 only inside the family dialog, and not for close/family/daily', () => {
  const pa = new Set();
  for (const a of P.R3_GATED) { assert.equal(P.needsParentGate({ r3: a, inR3Dialog: true }, pa), true, a); assert.equal(P.needsParentGate({ r3: a, inR3Dialog: false }, pa), false, a); }
  for (const a of ['close', 'family', 'daily', 'download-report']) assert.equal(P.needsParentGate({ r3: a, inR3Dialog: true }, pa), false, a);
  assert.equal(P.needsParentGate({ r32: 'health', inR3Dialog: true }, pa), true);
  assert.equal(P.needsParentGate({ r32: 'report', inR3Dialog: true }, pa), true);
  assert.equal(P.needsParentGate({ r32: 'health', inR3Dialog: false }, pa), false);
});

/* ---- module shape / embedding ---- */
test('exports are frozen and the file declares the global WQP20 for the browser', () => {
  assert(Object.isFrozen(P));
  const sandbox = { globalThis: null }; sandbox.globalThis = sandbox; vm.createContext(sandbox);
  vm.runInContext(fs.readFileSync(path.resolve(__dirname, '../r33_src/p20_family_pure.js'), 'utf8'), sandbox);
  assert.equal(typeof sandbox.WQP20.rescueDecision, 'function');
});
test('pure file contains no storage, DOM or IndexedDB access', () => {
  const src = fs.readFileSync(path.resolve(__dirname, '../r33_src/p20_family_pure.js'), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
  for (const w of ['localStorage', 'sessionStorage', 'indexedDB', 'document.', 'window.', 'navigator.']) assert(!src.includes(w), w);
});

console.log('# TOTAL ' + n + ' checks, ' + (n - bad) + ' pass, ' + bad + ' fail');
process.exit(bad ? 1 : 0);
