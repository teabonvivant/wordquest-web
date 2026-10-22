/* WQOly core (R3.23): registry of the 30 奧數路線 units + pure helpers for unit generators. No DOM, no Math.random, loads in Node and in the app.
   A unit is registered with WQOly.register({id:'p1-2', grade:1, n:2, title, icon, card:{motto,example,art}, cover, lesson:[...], gens:{A:[fn],B:[fn]}, verify?}).
   Generators are pure (r,p)=>WQOly.o(skill, stem, answer, hint, explain, wrongs, calc, accept, {why,svg,form}) with r = seeded rng and p = {s,diff,stage}.
   p.s (0..1) scales NUMBER SIZE only: use WQOly.N(r,p,lo,hi) for a number that grows with the parent difficulty / stage. */
(function (root) {
  'use strict';
  const mb = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const hs = (...xs) => { let h = 2166136261; for (const x of xs) { for (const c of String(x)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); h = Math.imul(h ^ 35, 16777619); } return h >>> 0; };
  const ri = (r, a, b) => a + Math.floor(r() * (b - a + 1));
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  const shuffle = (r, a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  /* a number between lo and hi that grows with p.s (0 = lo end, 1 = whole range) */
  const N = (r, p, lo, hi) => { if (hi <= lo) return lo; const sp = hi - lo, t = Math.min(hi, lo + Math.max(2, Math.round(sp * p.s))), b = Math.min(t, lo + Math.round(sp * p.s * .5)); return ri(r, b, t); };
  const gcd = (a, b) => b ? gcd(b, a % b) : a;
  const fmt = x => String(Math.round(x * 1e6) / 1e6);
  const CN = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  /* names carry a pronoun so a girl's name never gets 「他」 */
  const P = (n, p) => ({ n, p, toString() { return n; } });
  const NAMES = [P('小明', '他'), P('小美', '她'), P('阿強', '他'), P('小欣', '她'), P('家豪', '他'), P('詩婷', '她')];
  const name = r => pick(r, NAMES);
  /* o(skill, stem, answer, hint, explain, wrongs, calc, accept, extra) - extra: a form string ('dec'|'simplest') or {form, why, svg}
     why: {'<wrong answer>': '一句錯因提示'}  (the wrong answers a child really gives; they are always offered as options in 選擇題)
     svg: '<svg ...>' small figure shown above the stem */
  const o = (sk, q, a, h, e, w, calc, acc, extra) => {
    const x = (typeof extra === 'string') ? { form: extra } : (extra || {});
    return { sk, q, a: String(a), h, e, w: w || [], calc, acc: acc || [], form: x.form || null, why: x.why || null, svg: x.svg || '' };
  };
  const GRADES = [
    { n: 1, name: '小一', icon: '🌱', hue: 150, theme: '數數與湊十' },
    { n: 2, name: '小二', icon: '🌿', hue: 190, theme: '跳數與植樹' },
    { n: 3, name: '小三', icon: '🌳', hue: 215, theme: '和差與搭配' },
    { n: 4, name: '小四', icon: '🔥', hue: 272, theme: '雞兔與高斯' },
    { n: 5, name: '小五', icon: '🚀', hue: 322, theme: '餘數、抽屜、追及' },
    { n: 6, name: '小六', icon: '👑', hue: 28, theme: '比與工程' }
  ];
  const units = {}, order = [];
  const LV = ['A', 'B'];
  /* register: throws on a malformed unit so a typo is caught by the Node test, never by a child */
  function register(u) {
    const bad = m => { throw new Error('WQOly.register ' + (u && u.id) + ': ' + m); };
    if (!u || !/^p[1-6]-[1-5]$/.test(u.id)) bad('id must look like p1-2');
    if (u.grade !== +u.id[1] || u.n !== +u.id[3]) bad('grade/n do not match id');
    if (!u.title || !u.icon) bad('title and icon are required');
    if (!u.card || !u.card.motto || !u.card.example) bad('card.motto and card.example are required');
    if (!Array.isArray(u.lesson) || u.lesson.length < 2) bad('lesson needs cards');
    for (const l of LV) if (!u.gens || !Array.isArray(u.gens[l]) || !u.gens[l].length) bad('gens.' + l + ' needs at least one generator');
    if (units[u.id] && !units[u.id].draft && u.draft) bad('a final unit may not be replaced by a draft');
    u.cover = u.cover || 'assets/r323/' + u.id + '.webp';
    if (!units[u.id]) order.push(u.id);
    units[u.id] = u;
    order.sort();
    return u;
  }
  const unitsOf = g => order.map(id => units[id]).filter(u => u.grade === g);
  /* stub: a walkable placeholder (draft:true) - a short lesson, generators borrowed from the old olympiad templates (WQ37Math.legacy) or given directly.
     spec: {id,title,icon,motto,example, legacy:{A:[[w,i]...],B:[[w,i]...], s:0.5}, gens?:{A,B}} */
  function stub(spec) {
    const m = /^p(\d)-(\d)$/.exec(spec.id);
    const lg = spec.legacy || {}, k = lg.s || 1;
    const borrow = list => (list || []).map(([w, i]) => (r, p) => {
      const M = root.WQ37Math;
      if (!M || !M.legacy) throw new Error('WQ37Math.legacy is not loaded');
      return M.legacy(w, i)(r, { s: Math.min(1, .3 + p.s * k * .7), diff: p.diff, stage: p.stage });
    });
    const gens = spec.gens || { A: borrow(lg.A), B: borrow(lg.B) };
    return {
      id: spec.id, grade: +m[1], n: +m[2], title: spec.title, icon: spec.icon, draft: true,
      card: { motto: spec.motto, example: spec.example, art: spec.art || '' },
      lesson: spec.lesson || [
        { t: 'show', say: '這一課：' + spec.motto + '。', scene: { w: 'banner', p: { icon: spec.icon, title: spec.title, motto: spec.motto, example: spec.example } } },
        { t: 'card' }
      ],
      gens
    };
  }
  /* the question shape the level engine sees, built directly from one generator call (used by the Node tests and the lesson `try` cards) */
  function sample(id, level, seed, diff) {
    const u = units[id]; if (!u) throw new Error('no unit ' + id);
    const r = mb(hs('oly-sample', id, level, seed, diff || 1)), g = u.gens[level];
    return pick(r, g)(r, { s: Math.min(1, .1 + .8 * ((diff || 1) - 1) / 4), diff: diff || 1, stage: 0 });
  }
  const WQOly = { grades: GRADES, units, order, register, unitsOf, stub, sample, unit: id => units[id] || null, levels: LV,
    helpers: { mb, hs, ri, pick, shuffle, N, gcd, fmt, o, name, NAMES, CN, rng: seed => mb(seed >>> 0) }, mb, hs, ri, pick, shuffle, N, gcd, fmt, o, name, CN, version: '1.0' };
  root.WQOly = WQOly;
  if (typeof module !== 'undefined') module.exports = WQOly;
})(typeof globalThis !== 'undefined' ? globalThis : this);
