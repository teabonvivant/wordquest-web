/* t71 (node): R3.43 G02 / G03 / G05 in WQ37GX.Learn. A follow-up question never replaces the question that was missed; running out of time is no answer.
   Run: node r37_tests/t71_gx_r343.js */
const assert = require('assert');
global.window = undefined;
const GX = require('../r37_src/gx_core.js');
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const M = (i, q, a, alt) => ({ id: 'm' + i, kind: 'math', q, a, skill: 'sk' + i, alt: alt ? { q: alt[0], a: alt[1], skill: 'sk' + i } : undefined });
const items = [M(0, '9＋3＝？', '12', ['17－12＝？', '5']), M(1, '2＋2＝？', '4'), M(2, '5＋1＝？', '6'), M(3, '8－3＝？', '5'), M(4, '7＋1＝？', '8')];

/* deterministic: walk the queue, answer m0 wrong the first time, then apply `then` to the follow-up */
function level(then) {
  const L = GX.Learn({ items: items.map(x => Object.assign({}, x)), seed: 7 }), seen = [];
  let it, missed = false;
  while ((it = L.take())) {
    seen.push(it);
    if (it.id === 'm0' && !missed) { it._f = { v: 12 }; missed = true; L.answer(it, false, 100); if (then === 'not-yet') return { L, seen }; continue; }
    if (it.id === 'm0') { if (then === 'asked-no-answer') return { L, seen, follow: it }; L.answer(it, then === 'right', 100); continue; }
    L.answer(it, true, 100);
  }
  return { L, seen };
}
for (const then of ['not-yet', 'asked-no-answer', 'right', 'wrong']) {
  const { L } = level(then), r = L.result({}), p = r.perItem.find(x => x.id === 'm0');
  ok(p.q === '9＋3＝？' && p.a === '12', then + ': the result keeps the question that was really missed, got ' + p.q + '=' + p.a);
  ok(r.missed.some(x => x.id === 'm0' && x.q === '9＋3＝？'), then + ': 要再記一記 lists the missed question');
  ok(p.skill === 'sk0', then + ': the skill travels with the snapshot (saved by the host)');
  ok(!p.alt || (p.alt.q === '17－12＝？' && p.alt.a === '5'), then + ': the follow-up is linked as alt, not written over the miss');
}
{ const { follow } = level('asked-no-answer');
  ok(follow && follow.q === '17－12＝？' && follow.a === '5', 'the follow-up question is asked');
  ok(follow._f === undefined, 'G05: the follow-up does not carry the cached features (_f) of the missed answer 12'); }

// G03: lapse is not a wrong answer: it emits 'lapse', never 'wrong'
{ const ev = []; const L = GX.Learn({ items: items.map(x => Object.assign({}, x)), seed: 3, onEvent: (k) => ev.push(k) });
  const it = L.take(); L.answer(it, false, 25000, true); L.answer(L.take(), false, 25000, 'typed');
  ok(ev[0] === 'lapse' && ev[1] === 'lapse' && !ev.includes('wrong') && !ev.includes('ok'), 'a blank or half-typed timeout is reported as lapse: ' + ev.join(','));
  const r = L.result({}); ok(r.missed.every(m => m.how !== 'lapse'), 'a lapse is not listed as a wrong answer'); }

console.log('t71_gx_r343: ' + n + '/' + n + ' passed');
