/* R3.6 t04a - pure economy tests (node + vm, no browser): every game has its own price (1 to 4 coins).
 *
 *   WQ33_APP=/path/to/app/index.html node r36_tests/t04_econ.cjs
 *
 * Loads the arcade core script of the built page (WQArcade28, the wallet rules) into a vm and drives purchase / refund /
 * task / validate directly. Output follows the Checker convention: "PASS|FAIL [B] name | detail" and one SUMMARY line.
 * [B] checks are expected to fail on the R3.5 build, where every game cost 1 coin.
 */
const fs = require('fs'), path = require('path'), vm = require('vm');
const APP = path.resolve(process.env.WQ33_APP || path.join(__dirname, '../app/index.html'));
const html = fs.readFileSync(APP, 'utf8');
const m = html.match(/<script data-wq28="arcade-core">([\s\S]*?)<\/script>/);
const sandbox = { console, module: { exports: {} } }; sandbox.globalThis = sandbox; vm.createContext(sandbox);
vm.runInContext(m[1], sandbox);
const A = sandbox.module.exports;

const TITLE = 't04a game prices (economy rules)', rows = [], t0 = Date.now();
console.log(`# ${TITLE}  app=${APP}`);
function check(name, fn, base = false) {
  let ok = false, detail = '';
  try { const r = fn(); ok = r === true || (r && r.ok === true); detail = (r && r.detail) || ''; } catch (e) { ok = false; detail = 'threw: ' + String(e.message).slice(0, 120); }
  rows.push([name, ok, base]);
  console.log(`${ok ? 'PASS' : 'FAIL'}${base ? ' [B]' : ''} ${name}${detail !== '' ? ' | ' + detail : ''}`);
}
function throwsWith(fn, text) { try { fn(); } catch (e) { return String(e.message).includes(text) || { ok: false, detail: e.message }; } return { ok: false, detail: 'did not throw' }; }

const EXPECT = {
  'sky-rescue': 1, 'forest-dash': 1, 'moon-bells': 1, 'bounce-basket': 1, 'number-garden': 1, 'forest-band': 1,
  'drift-path': 2, 'meadow-cricket': 2, 'honey-delivery': 2, 'color-workshop': 2, 'forest-pong': 2, 'juice-lines': 2,
  'honeycomb-puzzle': 3, 'valley-race': 3, 'rolling-block': 3, 'block-studio': 3, 'star-rhythm': 3,
  'color-orbit': 4, 'garden-paths': 4, 'little-engineer': 4, 'sweet-studio': 4,
  'ruins-courier': 3, 'cloud-island': 3, 'star-patrol': 4, 'lighthouse-well': 4, 'harbor-volley': 2,
};
const open = (c) => { for (const id of A.ids) c.permissions[id] = 'open'; return c; };
const fresh = () => open(A.child());
const kids = [{ id: 'k1' }];

check('A1 there are 26 games and each has a price from 1 to 4', () => A.ids.length === 26 && A.catalog.every(g => Number.isInteger(g.cost) && g.cost >= 1 && g.cost <= 4), true);
check('A2 the price table is exactly the agreed one', () => { const bad = A.ids.filter(id => A.cost(id) !== EXPECT[id]); return { ok: !bad.length, detail: bad.join(',') }; }, true);
check('A3 all four prices are used and the dearer games are the harder / later ones (cost never falls as the unlock threshold rises within the original 21)', () => {
  const used = new Set(A.catalog.map(g => g.cost));
  const orig = A.catalog.slice(0, 21);
  let ok = [1, 2, 3, 4].every(n => used.has(n));
  for (let i = 1; i < orig.length; i++) if (orig[i].words > orig[i - 1].words && orig[i].cost < orig[i - 1].cost) ok = false;
  return { ok, detail: JSON.stringify([1, 2, 3, 4].map(n => A.catalog.filter(g => g.cost === n).length)) };
}, true);
check('A4 MAX_COST is 4 and an unknown id falls back to a price of 1 (never free, never above 4)', () => A.MAX_COST === 4 && A.cost('no-such-game') === 1, true);

// ---- purchase ------------------------------------------------------------------------------------------------------------
check('B1 buying each game takes exactly its price and writes a -price ledger line', () => {
  const bad = [];
  for (const id of A.ids) {
    const c = fresh(), after = A.purchase(c, 20, { id: 'r_' + id, game: id, now: 1000 });
    const e = c.ledger.at(-1);
    if (after !== 20 - EXPECT[id] || e.kind !== 'spend' || e.amount !== -EXPECT[id] || c.batch.used !== 1) bad.push(id);
  }
  return { ok: !bad.length, detail: bad.join(',') };
}, true);
check('B2 with exactly the price in the wallet the game can be bought and the balance goes to 0', () => A.ids.every(id => { const c = fresh(); return A.purchase(c, EXPECT[id], { id: 'x', game: id, now: 1 }) === 0; }), true);
check('B3 one coin short: refused, the message names the price, and nothing changed', () => {
  const bad = [];
  for (const id of A.ids) {
    const c = fresh();
    let msg = '';
    try { A.purchase(c, EXPECT[id] - 1, { id: 'y', game: id, now: 1 }); } catch (e) { msg = e.message; }
    if (!msg.includes('這款要 ' + EXPECT[id] + ' 枚') || c.batch.used !== 0 || c.ledger.length !== 0 || c.run !== null) bad.push(id);
  }
  return { ok: !bad.length, detail: bad.join(',') };
}, true);
check('B4 a 1-coin game stays possible with 1 coin, a 4-coin game is not possible with 3', () => {
  const a = fresh(), b = fresh();
  A.purchase(a, 1, { id: 'a', game: 'sky-rescue', now: 1 });
  return throwsWith(() => A.purchase(b, 3, { id: 'b', game: 'color-orbit', now: 1 }), '金幣不夠');
}, true);
check('B5 the same receipt cannot be used twice (no double charge)', () => {
  const c = fresh(); A.purchase(c, 10, { id: 'dup', game: 'drift-path', now: 1 }); A.close(c);
  return throwsWith(() => A.purchase(c, 10, { id: 'dup', game: 'drift-path', now: 2 }), '已經記錄');
});
check('B6 a locked game cannot be bought even with enough coins', () => throwsWith(() => A.purchase(A.child(), 50, { id: 'l', game: 'color-orbit', now: 1 }), '還沒解鎖'));

// ---- refund --------------------------------------------------------------------------------------------------------------
check('C1 cancelling an unstarted round gives back exactly what it cost, for every game', () => {
  const bad = [];
  for (const id of A.ids) {
    const c = fresh(), after = A.purchase(c, 10, { id: 'r', game: id, now: 1 }), back = A.refund(c, after, 'r', 2);
    const e = c.ledger.at(-1);
    if (back !== 10 || e.kind !== 'refund' || e.amount !== EXPECT[id] || c.batch.used !== 0) bad.push(id);
  }
  return { ok: !bad.length, detail: bad.join(',') };
}, true);
check('C2 a round that has started cannot be cancelled', () => { const c = fresh(); const b = A.purchase(c, 10, { id: 'r', game: 'forest-pong', now: 1 }); A.start(c); return throwsWith(() => A.refund(c, b, 'r', 2), '還沒開始'); });
check('C3 a full wallet cannot take a refund that would pass the limit', () => {
  const c = fresh(); A.purchase(c, 10, { id: 'r', game: 'color-orbit', now: 1 });
  return throwsWith(() => A.refund(c, A.MAX_BALANCE - 1, 'r', 2), '金幣已滿');
}, true);

// ---- a round of five plays -----------------------------------------------------------------------------------------------
check('D1 five plays per round whatever they cost; the sixth is refused with a message about plays, not coins', () => {
  const c = fresh(); let bal = 100;
  for (let i = 0; i < 5; i++) { bal = A.purchase(c, bal, { id: 'p' + i, game: i % 2 ? 'drift-path' : 'sky-rescue', now: 10 + i }); A.start(c); A.close(c); }
  return throwsWith(() => A.purchase(c, bal, { id: 'p5', game: 'sky-rescue', now: 20 }), '5 局');
}, true);
check('D2 the coins spent in a round of five add up to the sum of their prices', () => {
  const c = fresh(), order = ['sky-rescue', 'drift-path', 'valley-race', 'color-orbit', 'harbor-volley']; let bal = 50;
  for (let i = 0; i < 5; i++) { bal = A.purchase(c, bal, { id: 'q' + i, game: order[i], now: 10 + i }); A.close(c); }
  return { ok: bal === 50 - (1 + 2 + 3 + 4 + 2), detail: String(bal) };
}, true);

// ---- earning is unchanged ------------------------------------------------------------------------------------------------
check('E1 earning is unchanged: 1 coin per distinct task, +1 on the third, 4 tasks pay, never more than 5 a day', () => {
  const c = fresh(); let bal = 0; const paid = [];
  for (let i = 0; i < 7; i++) { const r = A.task(c, bal, { key: 'task' + i, day: '2026-10-04', startedAt: 1000 + i, completedAt: 2000 + i, valid: true }); bal = r.balance; paid.push(r.award); }
  return { ok: JSON.stringify(paid) === '[1,1,2,1,0,0,0]' && bal === 5, detail: JSON.stringify(paid) };
});
check('E2 an invalid (not full-marks) task pays nothing and is not recorded as done', () => {
  const c = fresh(); const r = A.task(c, 3, { key: 'bad', day: '2026-10-04', startedAt: 1, completedAt: 2, valid: false });
  return r.award === 0 && r.balance === 3 && !(c.days['2026-10-04'] && c.days['2026-10-04'].keys.includes('bad'));
});
check('E3 the same task twice in a day pays once', () => {
  const c = fresh(); const a = A.task(c, 0, { key: 'same', day: '2026-10-04', startedAt: 1, completedAt: 2, valid: true }), b = A.task(c, a.balance, { key: 'same', day: '2026-10-04', startedAt: 3, completedAt: 4, valid: true });
  return a.award === 1 && b.award === 0 && b.duplicate === true;
});

// ---- saved data ----------------------------------------------------------------------------------------------------------
function state(c) { const s = A.initial(kids); s.children.k1 = c; return JSON.parse(JSON.stringify(s)); }
check('F1 a saved wallet with spends of 1, 2, 3 and 4 coins and a refund passes validate()', () => {
  const c = fresh(); let bal = 30;
  bal = A.purchase(c, bal, { id: 's1', game: 'sky-rescue', now: 1 }); A.close(c);
  bal = A.purchase(c, bal, { id: 's2', game: 'drift-path', now: 2 }); A.close(c);
  bal = A.purchase(c, bal, { id: 's3', game: 'valley-race', now: 3 }); A.close(c);
  bal = A.purchase(c, bal, { id: 's4', game: 'color-orbit', now: 4 });
  bal = A.refund(c, bal, 's4', 5);
  const out = A.validate(state(c), kids);
  return { ok: JSON.stringify(out.children.k1.ledger.map(e => e.amount)) === '[-1,-2,-3,-4,4]' && bal === 30 - 6, detail: JSON.stringify(out.children.k1.ledger.map(e => e.amount)) };
}, true);
check('F2 a wallet saved by R3.5 (every spend -1) still loads', () => {
  const c = fresh(); c.ledger.push({ id: 'old1', kind: 'spend', amount: -1, at: 1, note: 'drift-path' }, { id: 'refund_old1', kind: 'refund', amount: 1, at: 2, note: 'x' }, { id: 'old2', kind: 'spend', amount: -1, at: 3, note: 'color-orbit' });
  c.batch.used = 2;
  const out = A.validate(state(c), kids);
  return out.children.k1.ledger.length === 3;
});
check('F3 a spend of 5 coins, 0 coins or a refund of 5 is rejected as corrupt', () => {
  const mk = (kind, amount) => { const c = fresh(); c.ledger.push({ id: 'z', kind, amount, at: 1, note: 'x' }); return state(c); };
  const bad = [['spend', -5], ['spend', 0], ['refund', 5], ['refund', 0]].filter(([k, a]) => { try { A.validate(mk(k, a), kids); return true; } catch (e) { return false; } });
  return { ok: !bad.length, detail: JSON.stringify(bad) };
});
check('F4 positive "spend" lines (a way to mint coins) are rejected', () => { const c = fresh(); c.ledger.push({ id: 'z', kind: 'spend', amount: 3, at: 1, note: 'x' }); return throwsWith(() => A.validate(state(c), kids), '每一局'); });

console.log(`SUMMARY ${TITLE}: ${rows.filter(r => r[1]).length}/${rows.length} passed; failed [B] (expected on R3.5 base) = ${rows.filter(r => !r[1] && r[2]).length}; failed other = ${rows.filter(r => !r[1] && !r[2]).length}; ${Math.round((Date.now() - t0) / 1000)}s`);
process.exit(rows.every(r => r[1]) ? 0 : 1);
