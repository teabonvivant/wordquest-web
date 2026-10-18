/* t40: WQ37GX.Learn business logic (node, no DOM): first-try stars, requeue gap/limit, review exclusion, typing states. Run: node r37_tests/t40_gx_learn.js */
const assert = require('assert');
global.window = undefined;
const GX = require('../r37_src/gx_core.js');
let n = 0; const ok = (c, m) => { assert(c, m); n++; };
const W = (en, zh) => ({ kind: 'word', en, zh });
const items8 = ['cat', 'dog', 'sun', 'map', 'pen', 'cup', 'hat', 'bus'].map((e, i) => W(e, '字' + i));

// stars by first-try accuracy
ok(GX.starsOf(1) === 5 && GX.starsOf(.95) === 5 && GX.starsOf(.949) === 4 && GX.starsOf(.85) === 4 && GX.starsOf(.70) === 3 && GX.starsOf(.69) === 2 && GX.starsOf(.5) === 2 && GX.starsOf(.49) === 1, 'star thresholds');

// all first-try correct => 5 stars, passed
let L = GX.Learn({ items: items8, seed: 1 });
let it; while ((it = L.take())) L.answer(it, true, 1000);
let r = L.result({ seconds: 60, maxCombo: 8 });
ok(r.stars === 5 && r.passed && r.firstTryAccuracy === 1 && r.missed.length === 0 && r.total === 8, 'perfect run');

// 6/8 first-try (75%) => 3 stars (pass); the 2 misses are requeued and answered right the second time => still 75%, not 100%
L = GX.Learn({ items: items8, seed: 2 }); let k = 0;
while ((it = L.take())) { const first = L.stats[it.id].tries === 0; L.answer(it, !(first && k++ < 2), 800); }
r = L.result({});
ok(r.firstTryCorrect === 6 && r.stars === 3 && r.passed, 'requeued retries do not rescue first-try accuracy: ' + r.stars);
ok(r.missed.length === 2 && r.missed.every(m => m.ok && m.tries === 2), 'missed items listed and eventually answered');

// 5/8 = 62.5% => 2 stars, not passed
L = GX.Learn({ items: items8, seed: 3 }); k = 0;
while ((it = L.take())) { const first = L.stats[it.id].tries === 0; L.answer(it, !(first && k++ < 3), 800); }
r = L.result({}); ok(r.stars === 2 && !r.passed, '62.5% fails the level');

// requeue: wrong answer returns 2-4 items later, at most twice, then is dropped
L = GX.Learn({ items: items8, seed: 4 }); const a = L.take(); const before = L.remaining();
let o1 = L.answer(a, false, 500); ok(o1.requeued && L.remaining() === before + 1, 'wrong item re-enters the queue');
let pos = -1; for (let i = 0; i < 8; i++) if (L.peek(i) === a) { pos = i; break; } ok(pos >= 1 && pos <= 3, 'comes back 2-4 items later (index ' + pos + ')');
L = GX.Learn({ items: [W('cat', '貓'), W('dog', '狗'), W('sun', '日'), W('map', '圖'), W('pen', '筆')], seed: 5 }); const c = L.take();
ok(L.answer(c, false).requeued, '1st miss requeued'); let again = null; for (let i = 0; i < 6; i++) if (L.peek(i) === c) again = i; ok(again !== null, 'present');
// pull it out and miss twice more
const rm = () => { for (let i = 0; i < 8; i++) { if (L.peek(i) === c) { const arr = []; let x; while ((x = L.take())) { if (x === c) { return x; } arr.push(x); } } } return null; };
let guard = 0; let tk; while (L.stats[c.id].requeued < 2 && guard++ < 20) { tk = L.take(); L.answer(tk, tk === c ? false : true); }
const third = L.answer(c, false); ok(third.requeued === false && L.stats[c.id].requeued === 2, 'max 2 requeues then the item is dropped');

// review items never count towards stars / first-try / totals
L = GX.Learn({ items: items8, review: [W('old1', '舊1'), W('old2', '舊2')], seed: 6 }); let sawRv = 0;
while ((it = L.take())) { if (it.rv) { sawRv++; L.answer(it, false); L.answer(it, false); L.answer(it, false); } else L.answer(it, true); }
r = L.result({}); ok(sawRv >= 2 && r.stars === 5 && r.total === 8 && r.firstTryAccuracy === 1 && r.missed.length === 0, 'review misses are excluded from stars and the miss list');

// cleared:false can never pass; quitting early with answers right gives 1 star
L = GX.Learn({ items: items8, seed: 7 }); L.answer(L.take(), true); r = L.result({ cleared: false }); ok(!r.passed && r.stars === 1, 'lost/quit run cannot pass');
// unanswered items count as not first-try correct
L = GX.Learn({ items: items8, seed: 8 }); for (let i = 0; i < 4; i++) L.answer(L.take(), true); r = L.result({}); ok(r.firstTryAccuracy === .5 && r.stars === 2, 'unasked items count against first-try accuracy');

// typing states: word prefix / done / wrong; math via host check and canonical prefix
const cat = W('cat', '貓'); L = GX.Learn({ items: [cat] });
ok(L.typing(cat, 'c') === 'partial' && L.typing(cat, 'ca') === 'partial' && L.typing(cat, 'cat') === 'done' && L.typing(cat, 'Cat') === 'done' && L.typing(cat, 'cx') === 'wrong' && L.typing(cat, 'cats') === 'wrong', 'word typing states');
const m = { kind: 'math', q: '7×8', a: '56', check: s => GX.norm(s) === '56' || GX.norm(s) === '56.0' };
ok(L.typing(m, '5') === 'partial' && L.typing(m, '56') === 'done' && L.typing(m, '６') === 'wrong' && L.typing(m, '57') === 'wrong', 'math typing states (full-width digits are normalised by the host check)');
const fr = { kind: 'math', q: '1/2+1/4', a: '3/4', check: s => GX.norm(s) === '3/4' }; ok(L.typing(fr, '3') === 'partial' && L.typing(fr, '3/') === 'partial' && L.typing(fr, '3/4') === 'done' && L.typing(fr, '３／４') === 'done', 'fraction typing, full-width slash');
ok(L.judge(cat, ' CAT ') && !L.judge(cat, 'dog'), 'judge trims and ignores case');
console.log('t40_gx_learn: ' + n + '/' + n + ' passed');
