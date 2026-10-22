'use strict';
/* R3.23 奧數路線 unit test (Node): every registered unit x level A/B x difficulty 1-5 x 200 seeds, built through WQ37Math.make('olympiad', ...) exactly as the level engine does.
   Checks: answer recomputed independently (unit.verify, where given), no duplicate stems, distractors differ from the answer, why-keys differ from the answer and are offered as options,
   calc strings agree, stem length per grade (final units), lesson-card rules (final units strict, drafts only structure), widgets exist, motto length, B differs from A. */
const path = require('path'), fs = require('fs');
const root = path.join(__dirname, '..');
const M = require(path.join(root, 'r37_src', 'levels_math.js'));
const O = globalThis.WQOly;
let n = 0; const fails = []; const warn = [];
const ok = (c, m) => { n++; if (!c) { fails.push(m); if (fails.length < 40) console.error('FAIL: ' + m); } };
const ev = s => { const t = s.match(/\d+\.?\d*|[-+*\/%()]/g); let i = 0; if (t.join('') !== s.replace(/\s/g, '')) throw new Error('bad expr ' + s);
  const E = () => { let v = T(); while (t[i] === '+' || t[i] === '-') { const o = t[i++], w = T(); v = o === '+' ? v + w : v - w; } return v; };
  const T = () => { let v = F(); while (t[i] === '*' || t[i] === '/' || t[i] === '%') { const o = t[i++], w = F(); v = o === '*' ? v * w : o === '/' ? v / w : v % w; } return v; };
  const F = () => { if (t[i] === '(') { i++; const v = E(); i++; return v; } return parseFloat(t[i++]); }; return E(); };
const LIM = { 1: 30, 2: 40, 3: 55, 4: 65, 5: 75, 6: 85 };
const widgetsSrc = fs.readFileSync(path.join(root, 'r37_src/oly/oly_widgets.js'), 'utf8');
const WIDGETS = new Set([...widgetsSrc.matchAll(/make\('(\w+)'/g)].map(m => m[1]));
ok(O.order.length === 30, '30 units registered, got ' + O.order.length);
ok(M.worlds('olympiad').length === 6, '6 grade worlds');
const sentences = t => String(t || '').split(/[。！？]/).map(x => x.trim()).filter(Boolean);
const whyHit = {};
let questions = 0;
for (const id of O.order) {
  const U = O.units[id], g = U.grade - 1;
  ok(U.card.motto.length <= 14, `${id} motto ≤ 14 chars: ${U.card.motto}`);
  ok(U.card.example.length > 0, id + ' card example');
  U.lesson.forEach((c, i) => {
    const tag = `${id} card ${i + 1} (${c.t})`;
    ok(['show', 'predict', 'do', 'try', 'card'].includes(c.t), tag + ' type');
    for (const f of ['say', 'ask', 'reveal']) if (c[f]) { const ss = sentences(c[f]); ok(ss.length <= 2, `${tag} ${f} ≤ 2 sentences`); ss.forEach(s => ok(s.length <= 22 || U.draft, `${tag} ${f} sentence ≤ 22 chars: ${s}`)); }
    if (c.scene) { ok(WIDGETS.has(c.scene.w), `${tag} widget ${c.scene.w} exists`); }
    if (c.t === 'predict') { ok(c.options && c.options.includes(c.answer) && c.reveal, tag + ' predict needs options/answer/reveal'); ok(c.scene, tag + ' predict scene'); }
    if (c.t === 'do') ok(c.scene && c.say, tag + ' do needs scene + say');
    if (c.t === 'try') { const q = c.q; ok(q && q.stem && q.answer, tag + ' try q'); if (q.options) { ok(q.options.includes(q.answer), tag + ' answer in options'); ok(new Set(q.options).size === q.options.length, tag + ' options distinct'); Object.keys(q.why || {}).forEach(k => { ok(k !== q.answer, tag + ' why key = answer'); ok(q.options.includes(k), tag + ' why key not an option: ' + k); }); } }
  });
  if (!U.draft) {
    ok(U.lesson.length >= 5 && U.lesson.length <= 8, `${id} lesson has 5-8 cards (${U.lesson.length})`);
    for (const t of ['predict', 'do', 'try']) ok(U.lesson.some(c => c.t === t), `${id} lesson has a ${t}`);
    ok(U.lesson[U.lesson.length - 1].t === 'card', id + ' ends with the card');
    ok(typeof U.verify === 'function', id + ' provides verify()');
    const sa = new Set(); for (const s of [0, 1, 2, 3, 4, 5]) for (const q of M.make('olympiad', g, 2 * (U.n - 1), 8, 3, 40 + s)) sa.add(q.skill);
    const sb = new Set(); for (const s of [0, 1, 2, 3, 4, 5]) for (const q of M.make('olympiad', g, 2 * (U.n - 1) + 1, 8, 3, 40 + s)) sb.add(q.skill);
    ok([...sb].every(x => !sa.has(x)), `${id} level B uses its own (extra-step) skills, not level A's`);
  }
  for (const lv of [0, 1]) {
    const si = 2 * (U.n - 1) + lv;
    for (let diff = 1; diff <= 5; diff++) for (let seed = 1; seed <= 200; seed++) {
      const nq = Math.max([6, 8, 8, 10, 12][diff - 1], si === 9 ? 10 : 0); // the engine's question count (r37MathQuestions)
      const qs = M.make('olympiad', g, si, nq, diff, seed * 977 + diff);
      ok(qs.length === nq, `${id}${'AB'[lv]} d${diff} s${seed} length`);
      const stems = new Set();
      qs.forEach((q, k) => {
        questions++;
        const tg = `${id}${'AB'[lv]} d${diff} s${seed} k${k} "${q.q}"`;
        ok(q.unit === id && q.level === 'AB'[lv], tg + ' unit/level');
        ok(q.mode === (k % 2 ? 'fill' : 'mcq'), tg + ' mode');
        ok(!stems.has(q.q), tg + ' duplicate stem'); stems.add(q.q);
        ok(q.hint && q.explain && q.skill.startsWith(id + ':'), tg + ' fields/skill');
        ok(q.lesson === 'oly:' + id && M.skillLesson(q.skill) === 'oly:' + id, tg + ' lesson link');
        ok(M.check(q, q.answer), tg + ' check answer');
        ok(/^[0-9.\/]+$/.test(q.answer), tg + ' answer charset ' + q.answer);
        if (/^\d+$/.test(q.answer)) ok(+q.answer >= 0 && +q.answer <= (U.draft ? 1e6 : 5000), tg + ' answer range ' + q.answer);
        if (U.verify) { const v = U.verify(q); ok(v !== null, tg + ' verify could not parse the stem'); if (v !== null) ok(v === q.answer, `${tg} verify ${v} vs answer ${q.answer}`); }
        if (!U.draft) ok(q.q.length <= LIM[U.grade], `${tg} stem length ${q.q.length} > ${LIM[U.grade]}`);
        if (q.calc) { const v = ev(q.calc.expr), a = q.answer.includes('/') ? q.answer.split('/').reduce((x, y) => x / y) : +q.answer; ok(Math.abs(v - a) < 1e-6, `${tg} calc ${q.calc.expr}=${v} vs ${q.answer}`); }
        if (q.mode === 'mcq') {
          ok(q.options.length === 4 && new Set(q.options).size === 4 && q.options.filter(o => o === q.answer).length === 1, tg + ' options');
          q.options.forEach(o => { if (o !== q.answer) ok(!M.check(q, o), tg + ' distractor equals answer ' + o); });
        }
        if (q.why) {
          for (const k2 of Object.keys(q.why)) { ok(k2 !== q.answer && !M.check(q, k2), `${tg} why-key equals the answer: ${k2}`); ok(typeof q.why[k2] === 'string' && q.why[k2].length > 4, tg + ' why text'); (whyHit[id] = whyHit[id] || new Set()).add(k2 + '@' + q.skill); }
          if (q.mode === 'mcq') for (const k2 of Object.keys(q.why).slice(0, 3)) ok(q.options.includes(k2), `${tg} why-key ${k2} missing from options`);
        }
        ok(q.ex && q.ex.q && q.ex.answer, tg + ' example');
        ok(!q.svg || /^<svg[\s>]/.test(q.svg), tg + ' svg shape');
      });
    }
  }
}
for (const id of O.order) { const U = O.units[id]; const kinds = new Set([...(whyHit[id] || [])].map(x => x.split('@')[1])); if (!U.draft) ok(kinds.size >= 2 || (whyHit[id] || new Set()).size >= 2, `${id} at least 2 distinct why hints triggered`); else if (!(whyHit[id] && whyHit[id].size)) warn.push(id + ' (draft) has no why hints'); }
console.log(`test_oly_units: ${questions} questions built, ${n - fails.length}/${n} checks passed${warn.length ? '; ' + warn.length + ' drafts without why: ' + warn.join(',') : ''}`);
if (fails.length) { console.error(fails.length + ' failures'); process.exit(1); }
