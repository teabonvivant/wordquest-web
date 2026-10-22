/* 小一 · 5 units, all finished (p1-2 湊十 is the reference unit). See docs/奧數路線-20261022/單元撰寫指引.md. */
(function () {
  'use strict';
  const { o, N, ri, pick, shuffle, name } = WQOly.helpers;

  /* ---- p1-2 湊十 --------------------------------------------------------------------------------------------------------- */
  /* small picture of two ten-frames: a aqua counters on the left, b gold counters on the right */
  const frame = (x, n, col, dark) => {
    let s = `<rect x="${x}" y="8" width="74" height="30" rx="5" fill="rgba(255,255,255,.08)" stroke="${col}" stroke-width="1.6"/><path d="M${x} 23h74M${x + 14.8} 8v30M${x + 29.6} 8v30M${x + 44.4} 8v30M${x + 59.2} 8v30" stroke="rgba(255,255,255,.25)" stroke-width="1"/>`;
    for (let i = 0; i < n; i++) s += `<circle cx="${x + 7.4 + (i % 5) * 14.8}" cy="${15.5 + Math.floor(i / 5) * 15}" r="5.2" fill="${col}" stroke="${dark}" stroke-width="1"/>`;
    return s;
  };
  const tenSvg = (a, b) => `<svg viewBox="0 0 170 46" role="img" aria-label="左邊 ${a} 個，右邊 ${b} 個">${frame(2, a, '#3ee6d0', '#12998a')}${frame(94, b, '#ffc94a', '#c48a00')}<text x="85" y="27" text-anchor="middle" font-size="18" font-weight="900" fill="#f4f6ff">＋</text></svg>`;
  const art12 = `<svg viewBox="0 0 120 80"><rect x="6" y="10" width="52" height="22" rx="4" fill="rgba(255,255,255,.1)" stroke="#3ee6d0" stroke-width="2"/><rect x="62" y="10" width="52" height="22" rx="4" fill="rgba(255,255,255,.1)" stroke="#ffc94a" stroke-width="2"/>${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<circle cx="${14 + (i % 5) * 9.5}" cy="${17 + Math.floor(i / 5) * 10}" r="3.6" fill="#3ee6d0"/>`).join('')}${[0, 1, 2, 3, 4].map(i => `<circle cx="${70 + i * 9.5}" cy="21" r="3.6" fill="#ffc94a"/>`).join('')}<path d="M88 34Q80 46 40 40" stroke="#ff8fc7" stroke-width="2.4" fill="none" stroke-dasharray="3 3"/><rect x="14" y="52" width="92" height="20" rx="10" fill="#c6a2ff"/><text x="60" y="63" text-anchor="middle" dominant-baseline="central" font-size="15" font-weight="900" fill="#0b1030">10 ＋ 3</text></svg>`;

  const g12 = {
    A: [
      /* a + b with a < 10: make ten first */
      (r, p) => {
        const a = N(r, p, 6, 9), b = N(r, p, Math.max(2, 11 - a), 9), need = 10 - a, rest = b - need, s = a + b;
        return o('add10', `${a}＋${b}＝？先湊成 10。`, s, `${a} 要加 ${need} 才是 10。`,
          `先湊十：${a}＋${need}＝10，${b} 分成 ${need} 和 ${rest}；再算 10＋${rest}＝${s}。`, [s - 1, s + 1, 10 + need, 10 + b - 1], `${a}+${b}`, [],
          { svg: tenSvg(a, b), why: { [s - 1]: `${b} 分成 ${need} 和 ${rest}，剩下是 ${rest}，別數少了。`, [10 + need]: `${need} 是拿去湊十的，剩下的是 ${rest}，要再加。` } });
      },
      /* how many more to make ten */
      (r, p) => {
        const a = N(r, p, 1, 9), s = 10 - a;
        return o('need10', `${a} 再加幾個就是 10？`, s, `想想 10 比 ${a} 多多少。`, `${a}＋${s}＝10，所以要再加 ${s} 個。`, [a, s + 1, s - 1 > 0 ? s - 1 : s + 2, 10 + a], `10-${a}`, [],
          { svg: tenSvg(a, 0).replace(/<text.*?<\/text>/, ''), why: { [a]: `${a} 是已經有的，要問還差幾個。` } });
      },
      /* a story */
      (r, p) => {
        const m = name(r), a = N(r, p, 6, 9), b = N(r, p, Math.max(2, 11 - a), 9), need = 10 - a, s = a + b, it = pick(r, [['糖', '粒'], ['貼紙', '張'], ['卡片', '張']]);
        return o('story10', `${m}有 ${a} ${it[1]}${it[0]}，又得 ${b} ${it[1]}，共有幾${it[1]}？`, s, `先把 ${a} 湊成 10。`,
          `先拿 ${need} 湊成 10，${b} 還剩 ${b - need}；10＋${b - need}＝${s}。`, [s - 1, s + 1, a + b - 2, 10 + need], `${a}+${b}`, [],
          { svg: tenSvg(a, b), why: { [s - 1]: `先湊十，再加剩下的 ${b - need}，別數少了。` } });
      }
    ],
    B: [
      /* three numbers: spot the pair that makes ten (the extra step) */
      (r, p) => {
        const x = N(r, p, 1, 9), e = N(r, p, 2, 9), arr = shuffle(r, [x, 10 - x, e]), s = 10 + e;
        return o('three10', `${arr.join('＋')}＝？找出湊成 10 的一對。`, s, '哪兩個加起來是 10？', `${x}＋${10 - x}＝10，再加 ${e}：10＋${e}＝${s}。`, [s - 1, s + 1, 10, x + e], `${arr.join('+')}`, [],
          { why: { 10: `10 只是其中一對的和，還要加上 ${e}。`, [s - 1]: `先找湊成 10 的一對，再加剩下的 ${e}，別數少了。` } });
      },
      /* a missing addend: needs two moves (to ten, then the rest) */
      (r, p) => {
        const a = N(r, p, 6, 9), T = a + N(r, p, Math.max(3, 11 - a), 9), need = 10 - a, rest = T - 10, s = need + rest;
        return o('miss10', `${a}＋？＝${T}。？是多少？`, s, `先看 ${a} 湊成 10 要加多少。`, `${a}＋${need}＝10，再加 ${rest} 才是 ${T}；${need}＋${rest}＝${s}。`, [need, rest, s + 1, T - a + 1], `${T}-${a}`, [],
          { svg: tenSvg(a, 0).replace(/<text.*?<\/text>/, ''), why: { [need]: `${need} 只是湊成 10 用的，之後還要再加 ${rest}。`, [rest]: `${rest} 只是 10 之後的部分，湊十用的 ${need} 也要加。` } });
      }
    ]
  };
  /* independent recomputation from the stem text (used by test_oly_units.cjs) */
  const verify12 = q => {
    let m;
    if ((m = /^(\d+)＋(\d+)＝？/.exec(q.q))) return String(+m[1] + +m[2]);
    if ((m = /^(\d+) 再加幾個就是 10？/.exec(q.q))) return String(10 - m[1]);
    if ((m = /有 (\d+) .{1,2}.*又得 (\d+) /.exec(q.q))) return String(+m[1] + +m[2]);
    if ((m = /^(\d+)＋(\d+)＋(\d+)＝？/.exec(q.q))) return String(+m[1] + +m[2] + +m[3]);
    if ((m = /^(\d+)＋？＝(\d+)/.exec(q.q))) return String(m[2] - m[1]);
    return null;
  };

  WQOly.register({
    id: 'p1-2', grade: 1, n: 2, title: '湊十', icon: '🔟',
    card: { motto: '先湊成 10', example: '8＋5＝10＋3＝13', art: art12 },
    lesson: [
      { t: 'show', say: '8＋5 不好數。先湊成 10 就容易！', scene: { w: 'tenframe', p: { a: 8, b: 5 } } },
      { t: 'predict', say: '8 要湊成 10。', ask: '要從右邊拿幾個過去？', options: ['1', '2', '3'], answer: '2', scene: { w: 'tenframe', p: { a: 8, b: 5 }, still: true }, reveal: '8 差 2 就是 10，拿 2 個過去！' },
      { t: 'do', say: '把右邊的點拖去左框，湊滿 10。', scene: { w: 'tenframe', p: { a: 8, b: 5 } } },
      { t: 'show', say: '9 只差 1。拿 1 個過去，剩 5 個。', scene: { w: 'tenframe', p: { a: 9, b: 6 } } },
      { t: 'do', say: '再試一次：7＋6。拖幾個過去？', scene: { w: 'tenframe', p: { a: 7, b: 6 } } },
      { t: 'try', say: '6＋8，先湊十再加剩下的。', scene: { w: 'tenframe', p: { a: 6, b: 8 }, still: true },
        q: { stem: '6＋8＝？', options: ['12', '13', '14'], answer: '14', hint: '6 差 4 才是 10。', why: { 12: '6 差 4 才是 10，不是差 2。', 13: '8 分成 4 和 4，剩下 4，不是 3。' } } },
      { t: 'card' }
    ],
    gens: g12, verify: verify12
  });

  /* ================================================================================================================================
     Shared little helpers for the finished units below (pictures are plain svg strings; answers are always numbers)
     ================================================================================================================================ */
  const NAMES = WQOly.helpers.NAMES;
  const CA = '#3ee6d0', CB = '#ffc94a', CC = '#ff8fc7', CV = '#c6a2ff', CT = '#c3cbf7';
  const rep = (n, f) => Array.from({ length: n }, (_, i) => f(i));
  const svgOf = (w, h, body, label) => `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}">${body}</svg>`;
  /* why-map that skips keys which are not usable numbers */
  const why = (...kv) => { const w = {}; kv.forEach(([k, t]) => { if (k !== undefined && k !== null && !Number.isNaN(k) && k >= 0 && !(k in w)) w[k] = t; }); return w; };
  /* smallest period q such that every known entry agrees with the others in its residue class (null = unknown) */
  const minPeriod = t => {
    for (let q = 1; q <= t.length; q++) {
      const seen = {}; let ok = true;
      t.forEach((v, i) => { if (v == null) return; const k = i % q; if (k in seen && seen[k] !== v) ok = false; seen[k] = v; });
      if (ok) return { q, seen };
    }
    return null;
  };
  const svgKinds = q => [...String(q.svg || '').matchAll(/data-k="(\w)"/g)].map(m => m[1]);
  const svgGroups = q => [...String(q.svg || '').matchAll(/data-g="(\w+)"/g)].map(m => m[1]);

  /* ---- p1-1 找規律 ------------------------------------------------------------------------------------------------------- */
  const KIND = { a: ['圓形', CA], b: ['方塊', CB], c: ['三角形', CC] };
  const KNAME = { 圓形: 'a', 方塊: 'b', 三角形: 'c' };
  const shape = (k, x, y, s) => k === 'a' ? `<circle data-k="a" cx="${x}" cy="${y}" r="${s}" fill="${CA}"/>`
    : k === 'b' ? `<rect data-k="b" x="${x - s}" y="${y - s}" width="${2 * s}" height="${2 * s}" rx="2" fill="${CB}"/>`
      : `<path data-k="c" d="M${x} ${y - s - 1}L${x + s + 1} ${y + s}L${x - s - 1} ${y + s}z" fill="${CC}"/>`;
  const shapeRow = seq => { const n = seq.length, sp = Math.min(26, 224 / n); return svgOf(240, 40, seq.map((k, i) => shape(k, 120 + (i - (n - 1) / 2) * sp, 20, 8)).join(''), `${n} 個圖形排成一行`); };
  const unitOf = (r, per, pool) => {
    for (let g = 0; g < 60; g++) { const u = rep(per, () => pick(r, pool)); if (!u.every(v => v === u[0])) return u; }
    return per === 2 ? [pool[0], pool[1]] : [pool[0], pool[0], pool[1]];
  };
  const digits = (r, p) => rep(N(r, p, 4, 9), i => i + 1);
  const art11 = `<svg viewBox="0 0 120 80">${[0, 1, 2, 3, 4].map(i => shape(i % 2 ? 'b' : 'a', 18 + i * 21, 26, 8)).join('')}<rect x="92" y="14" width="22" height="24" rx="6" fill="none" stroke="#ff8fc7" stroke-width="2" stroke-dasharray="4 3"/><text x="103" y="27" text-anchor="middle" dominant-baseline="central" font-size="16" font-weight="900" fill="#ff8fc7">?</text><path d="M18 44q42 14 84 0" stroke="#c6a2ff" stroke-width="2.4" fill="none" stroke-dasharray="3 3"/><rect x="14" y="54" width="92" height="20" rx="10" fill="#c6a2ff"/><text x="60" y="65" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="900" fill="#0b1030">一輪 ＋ 一輪</text></svg>`;
  const g11 = {
    A: [
      /* the next number of a repeating list */
      (r, p) => {
        const per = ri(r, 2, 3), u = unitOf(r, per, digits(r, p)), n = 2 * per + ri(r, 1, per - 1), t = rep(n, i => u[i % per]), ans = u[n % per], last = t[n - 1];
        const other = u.find(v => v !== ans && v !== last);
        return o('pat-next', `${t.join('、')}、？`, ans, '先找出一輪是哪幾個。', `一輪是 ${u.join('、')}，接着是 ${ans}。`, [last, ...u, ans + 1, ans + 2, ans - 1], '', [],
          { why: why([last, `${last} 是上一個。照一輪的次序，接着是 ${ans}。`], [other, `一輪是 ${u.join('、')}，${last} 後面是 ${ans}。`], [ans + 1, '數字只會重複一輪裏的，不會變成新的數。']) });
      },
      /* one number is missing in the middle */
      (r, p) => {
        const per = ri(r, 2, 3), u = unitOf(r, per, digits(r, p)), n = 2 * per + ri(r, 1, 2), m = ri(r, per, n - 2), t = rep(n, i => u[i % per]), ans = u[m % per];
        const shown = t.map((v, i) => i === m ? '？' : v).join('、'), near = t[m - 1];
        return o('pat-gap', shown, ans, '先看一輪是哪幾個。', `一輪是 ${u.join('、')}，空位是 ${ans}。`, [near, t[m + 1], ...u, ans + 1, ans - 1], '', [],
          { why: why([near, `${near} 是空位前面那個。照次序，空位是 ${ans}。`], [t[m + 1], `${t[m + 1]} 是空位後面那個。要看前面一輪。`], [ans + 1, '空位的數在前面已經出現過了。']) });
      },
      /* count one kind of shape in a repeating row */
      (r, p) => {
        const per = ri(r, 2, 3), u = unitOf(r, per, ['a', 'b', 'c']), n = 2 * per + ri(r, 0, per), seq = rep(n, i => u[i % per]), K = pick(r, u), c = seq.filter(x => x === K).length, nm = KIND[K][0];
        return o('pat-shape', `下面 ${n} 個圖形，有幾個${nm}？`, c, `一輪有 ${per} 個，數一輪裏有幾個${nm}。`, `一輪是 ${u.map(x => KIND[x][0]).join('、')}；${n} 個圖形裏，${nm}有 ${c} 個。`, [c - 1, c + 1, c + 2, n - c], '', [],
          { svg: shapeRow(seq), why: why([c - 1, '漏了一個，沿着規律一個一個數。'], [c + 1, '多數了一個，看清楚是哪種圖形。'], [n - c, `${n - c} 是其他圖形的數目，題目問的是${nm}。`]) });
      }
    ],
    B: [
      /* a term far beyond the ones shown: find the round, then carry on */
      (r, p) => {
        const per = ri(r, 2, 3), u = unitOf(r, per, digits(r, p)), n = 2 * per + 1, k = n + ri(r, 2, 6), t = rep(n, i => u[i % per]), ans = u[(k - 1) % per];
        return o('pat-far', `${t.join('、')}。第 ${k} 個是幾？`, ans, '先找出一輪，再一輪一輪數下去。', `一輪是 ${u.join('、')}（${per} 個）；第 ${k} 個是一輪裏的第 ${(k - 1) % per + 1} 個，就是 ${ans}。`, [t[n - 1], u[n % per], u[k % per], ...u, ans + 1], '', [],
          { why: why([u[n % per], `這是第 ${n + 1} 個。要一直排到第 ${k} 個。`], [u[k % per], `數多了一個。第 ${k} 個是一輪裏的第 ${(k - 1) % per + 1} 個。`], [t[n - 1], `${t[n - 1]} 是最後寫出的一個，不是第 ${k} 個。`]) });
      },
      /* a longer row is drawn only in part: extend it and count */
      (r, p) => {
        const per = ri(r, 2, 3), u = unitOf(r, per, ['a', 'b', 'c']), n = 2 * per + 1, L = ri(r, 9, 15), K = pick(r, u), nm = KIND[K][0];
        const shown = rep(n, i => u[i % per]), all = rep(L, i => u[i % per]), c = all.filter(x => x === K).length, c0 = shown.filter(x => x === K).length;
        return o('pat-count', `圖形照規律排到 ${L} 個，${nm}有幾個？`, c, `先找出一輪，再排到 ${L} 個。`, `一輪是 ${u.map(x => KIND[x][0]).join('、')}；排到 ${L} 個，${nm}有 ${c} 個。`, [c0, c - 1, c + 1, L - c], '', [],
          { svg: shapeRow(shown), why: why([c0, `圖上只畫了 ${n} 個，要照規律排到 ${L} 個才數。`], [c - 1, '漏了一個，一輪一輪地數。'], [c + 1, `排到第 ${L} 個就停，別多排。`]) });
      }
    ]
  };
  const verify11 = q => {
    let m;
    if ((m = /^([\d、？]+)$/.exec(q.q))) {
      const toks = m[1].split('、'), idx = toks.indexOf('？'), t = toks.map(x => x === '？' ? null : +x), pr = minPeriod(t);
      return pr && (idx % pr.q) in pr.seen ? String(pr.seen[idx % pr.q]) : 'none';
    }
    if ((m = /^([\d、]+)。第 (\d+) 個是幾？$/.exec(q.q))) {
      const t = m[1].split('、').map(Number), pr = minPeriod(t), k = +m[2];
      return pr ? String(pr.seen[(k - 1) % pr.q]) : 'none';
    }
    if ((m = /^下面 (\d+) 個圖形，有幾個(.+?)？$/.exec(q.q))) { const s = svgKinds(q), k = KNAME[m[2]]; return s.length === +m[1] ? String(s.filter(x => x === k).length) : 'none'; }
    if ((m = /^圖形照規律排到 (\d+) 個，(.+?)有幾個？$/.exec(q.q))) {
      const s = svgKinds(q), pr = minPeriod(s), k = KNAME[m[2]]; let c = 0;
      for (let i = 0; i < +m[1]; i++) if (pr.seen[i % pr.q] === k) c++;
      return String(c);
    }
    return null;
  };

  WQOly.register({
    id: 'p1-1', grade: 1, n: 1, title: '找規律', icon: '🧱',
    card: { motto: '找出重複的一組', example: '🔴🔵🔴🔵🔴 → 🔵', art: art11 },
    lesson: [
      { t: 'show', say: '紅、藍、紅、藍……一直重複！', scene: { w: 'cycle', p: { n: 2, labels: ['🔴', '🔵'], steps: 7, unit: '個' }, still: true } },
      { t: 'predict', say: '紅、藍、紅、藍、紅、藍……', ask: '下一個是什麼顏色？', options: ['紅', '藍'], answer: '紅', scene: { w: 'cycle', p: { n: 2, labels: ['🔴', '🔵'], steps: 7, unit: '個' }, still: true }, reveal: '一紅一藍是一輪，下一輪又由紅開始！' },
      { t: 'do', say: '按「＋1 個」，走 7 步，看停在哪。', scene: { w: 'cycle', p: { n: 2, labels: ['🔴', '🔵'], steps: 7, unit: '個' } } },
      { t: 'show', say: '紅、藍、藍是一輪，每輪 3 個。', scene: { w: 'cycle', p: { n: 3, labels: ['🔴', '🔵', '🔵'], steps: 8, unit: '個' }, still: true } },
      { t: 'do', say: '這一輪有 3 個。走 10 步，停在哪？', scene: { w: 'cycle', p: { n: 3, labels: ['🔴', '🔵', '🟡'], steps: 10, unit: '個' } } },
      { t: 'try', say: '先找出一輪，再答。', scene: { w: 'cycle', p: { n: 3, labels: ['1', '2', '3'], steps: 7, unit: '個' }, still: true },
        q: { stem: '1、2、3、1、2、3、1、？', options: ['2', '3', '4'], answer: '2', hint: '一輪是 1、2、3。', why: { 3: '3 是上一輪的尾。1 後面是 2。', 4: '4 沒有出現過，數字只會重複。' } } },
      { t: 'card' }
    ],
    gens: g11, verify: verify11
  });

  /* ---- p1-3 有次序地數（只數同一大小；B 最多兩組）------------------------------------------------------------------------- */
  const COLS = [['紅色', '#ff6b81'], ['金色', '#ffc94a'], ['青色', '#3ee6d0'], ['紫色', '#c6a2ff'], ['藍色', '#7cc8ff']];
  const OBJS = [['糖', '粒'], ['波子', '粒'], ['鈕扣', '粒'], ['貼紙', '張']];
  const dot = (g, x, y, col, ring) => `<circle data-g="${g}" cx="${x}" cy="${y}" r="9" fill="${col}" stroke="${ring || 'rgba(11,16,48,.45)'}" stroke-width="${ring ? 3.2 : 1.5}"/>`;
  const spots = (r, n, cols, rowsN, x0, y0, dx, dy) => {
    const cells = []; for (let c = 0; c < cols; c++) for (let k = 0; k < rowsN; k++) cells.push([c, k]);
    return shuffle(r, cells).slice(0, n).map(([c, k]) => [x0 + c * dx + ri(r, -3, 3), y0 + k * dy + ri(r, -3, 3)]);
  };
  const scatterSvg = (r, n, col, label) => svgOf(240, 110, spots(r, n, 8, 3, 24, 22, 28, 33).map(([x, y]) => dot('i', x, y, col)).join(''), label);
  const art13 = `<svg viewBox="0 0 120 80">${[[20, 20], [46, 14], [72, 22], [98, 16], [30, 44], [58, 40], [86, 46]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="8" fill="${i < 4 ? '#3ee6d0' : '#ffc94a'}"/><text x="${x}" y="${y + 1}" text-anchor="middle" dominant-baseline="central" font-size="10" font-weight="900" fill="#0b1030">${i + 1}</text>`).join('')}<rect x="14" y="56" width="92" height="18" rx="9" fill="#c6a2ff"/><text x="60" y="66" text-anchor="middle" dominant-baseline="central" font-size="12" font-weight="900" fill="#0b1030">點一個，數一個</text></svg>`;
  const g13 = {
    A: [
      /* count one scattered group */
      (r, p) => {
        const m = name(r), ob = pick(r, OBJS), co = pick(r, COLS), n = N(r, p, 4, 18);
        return o('cnt-all', `${m}有${co[0]}${ob[0]}，數一數有幾${ob[1]}？`, n, '一個一個數，數過的記住。', `一個一個點著數，不漏不重，共 ${n} ${ob[1]}。`, [n - 1, n + 1, n - 2, n + 2], '', [],
          { svg: scatterSvg(r, n, co[1], `散開的${n}${ob[1]}${ob[0]}`), why: why([n - 1, `漏數了一${ob[1]}。邊數邊用手指點著。`], [n + 1, `有一${ob[1]}數了兩次。數過的要記住。`]) });
      },
      /* some are already counted (ringed): count the rest and put them together */
      (r, p) => {
        const m = name(r), ob = pick(r, OBJS), co = pick(r, COLS), a = N(r, p, 2, 10), b = ri(r, 1, Math.min(8, 18 - a)), n = a + b;
        const pts = spots(r, n, 8, 3, 24, 22, 28, 33);
        return o('cnt-split', `${m}數${ob[0]}，圈了的是數過的 ${a} ${ob[1]}。共有幾${ob[1]}？`, n, '再數沒有圈的，然後合起來。', `沒圈的有 ${b} ${ob[1]}；${a}＋${b}＝${n}。`, [a, b, n - 1, n + 1], `${a}+${b}`, [],
          { svg: svgOf(240, 110, pts.map(([x, y], i) => i < a ? dot('c', x, y, co[1], '#fff') : dot('u', x, y, co[1])).join(''), `圈了 ${a} 個，沒圈 ${b} 個`), why: why([a, '圈了的是數過的，還要加上沒圈的。'], [b, '沒圈的只是一部分，圈了的也要算進去。'], [n - 1, '合起來時漏了一個，再數一次。']) });
      },
      /* a row: how many are to the right of the ringed one */
      (r, p) => {
        const m = name(r), ob = pick(r, OBJS), co = pick(r, COLS), n = N(r, p, 5, 12), k = ri(r, 2, n - 2), sp = Math.min(22, 220 / n), ans = n - k;
        const body = rep(n, i => dot(i === k - 1 ? 'h' : 'i', 120 + (i - (n - 1) / 2) * sp, 40, co[1], i === k - 1 ? '#fff' : '')).join('');
        return o('cnt-ord', `${m}把${ob[0]}排成一行，圈了的是由左數第 ${k} ${ob[1]}。右邊還有幾${ob[1]}？`, ans, '圈了的那一個不算在右邊。', `圈了的是第 ${k} ${ob[1]}，一共 ${n} ${ob[1]}；${n}－${k}＝${ans}。`, [ans + 1, ans - 1, k - 1, n], `${n}-${k}`, [],
          { svg: svgOf(240, 80, body, `一行 ${n} 個，圈了第 ${k} 個`), why: why([ans + 1, '圈了的那一個不算在右邊，少數一個。'], [k - 1, '這是圈了的左邊，題目問右邊。'], [n, `${n} 是全部，右邊要減去左邊和圈了的。`]) });
      }
    ],
    B: [
      /* two boxes: count each, then put together */
      (r, p) => {
        const m = name(r), ob = pick(r, OBJS), co = pick(r, COLS), a = N(r, p, 2, 9), b = N(r, p, 2, Math.min(9, 18 - a)), n = a + b;
        const box = (x, k, g) => `<rect x="${x}" y="6" width="112" height="98" rx="12" fill="rgba(255,255,255,.07)" stroke="${CT}" stroke-width="2"/>` + spots(r, k, 4, 3, x + 18, 28, 26, 30).map(([px, py]) => dot(g, px, py, co[1])).join('');
        return o('cnt-two', `${m}有兩盒${co[0]}${ob[0]}。一共有幾${ob[1]}？`, n, '先數左盒，再數右盒，然後合起來。', `左盒 ${a} ${ob[1]}，右盒 ${b} ${ob[1]}；${a}＋${b}＝${n}。`, [a, b, n - 1, n + 1, Math.abs(a - b)], `${a}+${b}`, [],
          { svg: svgOf(240, 110, box(4, a, 'l') + box(124, b, 'r'), `左盒 ${a}，右盒 ${b}`), why: why([a, '只數了一盒，還有另一盒。'], [b, '只數了一盒，還有另一盒。'], [Math.abs(a - b), '兩盒要合起來（加），不是比較（減）。'], [n - 1, '合起來時少數了一個，再核對一次。']) });
      },
      /* two equal rows: count one row, then both */
      (r, p) => {
        const m = name(r), ob = pick(r, OBJS), co = pick(r, COLS), a = N(r, p, 3, 9), n = 2 * a, sp = Math.min(24, 216 / a);
        const row = (y, g) => rep(a, i => dot(g, 120 + (i - (a - 1) / 2) * sp, y, co[1])).join('');
        return o('cnt-rows', `${m}把${co[0]}${ob[0]}排成兩行，每行一樣多。共有幾${ob[1]}？`, n, '先數一行，再數第二行。', `每行 ${a} ${ob[1]}；${a}＋${a}＝${n}。`, [a, n - 1, n + 1, a + 1], `${a}+${a}`, [],
          { svg: svgOf(240, 100, row(30, 'r') + row(72, 's'), `兩行，每行 ${a} 個`), why: why([a, '這只是一行，有兩行要合起來。'], [n - 1, '少數了一個，一行一行再核對。'], [n + 1, '多數了一個，兩行之間沒有多的。']) });
      },
      /* two kinds of colour mixed: count each and compare */
      (r, p) => {
        const m = name(r), ob = pick(r, OBJS), b = N(r, p, 2, 7), a = b + ri(r, 1, Math.min(4, 9 - b)), n = a + b, pts = spots(r, n, 8, 3, 24, 22, 28, 33), d = a - b;
        return o('cnt-diff', `${m}的盤上有金色和青色的${ob[0]}。金色比青色多幾${ob[1]}？`, d, '先數金色，再數青色，然後比較。', `金色 ${a} ${ob[1]}，青色 ${b} ${ob[1]}；${a}－${b}＝${d}。`, [a, b, n, d + 1, d - 1], `${a}-${b}`, [],
          { svg: svgOf(240, 110, pts.map(([x, y], i) => i < a ? dot('g', x, y, CB) : dot('q', x, y, CA)).join(''), `金色 ${a}，青色 ${b}`), why: why([a, `${a} 是金色的數目，題目問相差多少。`], [n, '一共的數目是相加，「多幾」是相減。'], [d + 1, '兩邊都數清楚再減，別多算一個。']) });
      }
    ]
  };
  const verify13 = q => {
    const g = svgGroups(q), cnt = k => g.filter(x => x === k).length;
    let m;
    if (/數一數有幾.？$/.test(q.q)) return String(g.length);
    if ((m = /圈了的是數過的 (\d+) /.exec(q.q))) return cnt('c') === +m[1] ? String(cnt('c') + cnt('u')) : 'none';
    if (/由左數第 (\d+) .。右邊還有幾/.test(q.q)) return String(g.length - 1 - g.indexOf('h'));
    if (/^.+有兩盒.+。一共有幾/.test(q.q)) return String(cnt('l') + cnt('r'));
    if (/排成兩行，每行一樣多/.test(q.q)) return cnt('r') === cnt('s') ? String(cnt('r') + cnt('s')) : 'none';
    if (/金色比青色多幾/.test(q.q)) return String(cnt('g') - cnt('q'));
    return null;
  };

  WQOly.register({
    id: 'p1-3', grade: 1, n: 3, title: '有次序地數', icon: '👆',
    card: { motto: '一個一個數，不漏不重', example: '點一個，數一個', art: art13 },
    lesson: [
      { t: 'show', say: '一個一個搬，一邊搬一邊數。不漏不重！', scene: { w: 'tenframe', p: { a: 0, b: 10 }, still: true } },
      { t: 'predict', say: '已經數了 3 個，還有 2 個沒數。', ask: '一共有幾個？', options: ['4', '5', '6'], answer: '5', scene: { w: 'tenframe', p: { a: 3, b: 2 }, still: true }, reveal: '數過的 3 個，加沒數的 2 個，共 5 個！' },
      { t: 'do', say: '把右邊的點一個一個拖去左框，邊拖邊數。', scene: { w: 'tenframe', p: { a: 0, b: 10 } } },
      { t: 'show', say: '數數像跳格：每跳一格，數一個。', scene: { w: 'numline', p: { min: 0, max: 8, start: 0, target: 6, steps: [1], hops: rep(6, () => ({ n: 1 })) }, still: true } },
      { t: 'do', say: '按「＋1」，一下數一個，數到 7。', scene: { w: 'numline', p: { min: 0, max: 10, start: 0, target: 7, steps: [1] } } },
      { t: 'try', say: '用手指一個一個點著數。', q: { stem: '🍎🍎🍎🍎🍎🍎🍎 有幾個？', options: ['6', '7', '8'], answer: '7', hint: '每個只點一次。', why: { 6: '漏數了一個，再慢慢數一次。', 8: '有一個數了兩次，數過的要記住。' } } },
      { t: 'card' }
    ],
    gens: g13, verify: verify13
  });

  /* ---- p1-4 排隊問題 ------------------------------------------------------------------------------------------------------ */
  const queueSvg = (n, marks, label) => {
    const sp = Math.min(20, 200 / n), x0 = 120 - (n - 1) / 2 * sp;
    return svgOf(240, 60, rep(n, i => { const g = marks[i] || 'p', col = g === 'p' ? CA : (g === 'me' ? CC : CB), x = x0 + i * sp; return `<circle data-g="${g}" cx="${x}" cy="24" r="6.4" fill="${col}"/><path d="M${x - 8} 46v-4a8 8 0 0 1 16 0v4z" fill="${col}" opacity=".85"/>`; }).join('') + `<text x="6" y="56" font-size="11" font-weight="800" fill="${CT}">前</text><text x="234" y="56" text-anchor="end" font-size="11" font-weight="800" fill="${CT}">後</text>`, label);
  };
  const art14 = `<svg viewBox="0 0 120 80">${rep(8, i => `<circle cx="${14 + i * 13}" cy="24" r="5" fill="${i === 3 ? '#ff8fc7' : i < 3 ? '#3ee6d0' : '#ffc94a'}"/><path d="M${14 + i * 13 - 6} 38a6 6 0 0 1 12 0z" fill="${i === 3 ? '#ff8fc7' : i < 3 ? '#3ee6d0' : '#ffc94a'}"/>`).join('')}<rect x="10" y="50" width="100" height="22" rx="11" fill="#c6a2ff"/><text x="60" y="61" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="900" fill="#0b1030">3 ＋ 1 ＋ 4 ＝ 8</text></svg>`;
  const twoNames = r => { const s = shuffle(r, NAMES); return [s[0], s[1]]; };
  const g14 = {
    A: [
      /* in front + behind + the person */
      (r, p) => {
        const m = name(r), a = N(r, p, 1, 8), b = N(r, p, 1, 8), n = a + b + 1;
        return o('q-around', `${m}前面有 ${a} 人，後面有 ${b} 人。隊伍共有幾人？`, n, `別忘了${m}自己。`, `前面 ${a} 人，後面 ${b} 人，再加${m}自己：${a}＋${b}＋1＝${n}。`, [a + b, n + 1, a + b + 2, a, b], `${a}+${b}+1`, [],
          { svg: queueSvg(n, { [a]: 'me' }, `前面 ${a} 人，後面 ${b} 人`), why: why([a + b, `${m}自己也是隊伍裏的一個人，要加上。`], [n + 1, `${m}只算一次，加 1 就夠了。`]) });
      },
      /* rank + behind */
      (r, p) => {
        const m = name(r), k = N(r, p, 2, 9), b = N(r, p, 1, 8), n = k + b;
        return o('q-rank', `${m}排第 ${k} 個，後面有 ${b} 人。共有幾人？`, n, `排第 ${k}，前面有 ${k - 1} 人。`, `前面 ${k - 1} 人，${m}自己 1 人，後面 ${b} 人；${k - 1}＋1＋${b}＝${n}。`, [n + 1, n - 1, b, k], `${k}+${b}`, [],
          { svg: queueSvg(n, { [k - 1]: 'me' }, `排第 ${k}，後面 ${b} 人`), why: why([n + 1, `排第 ${k} 個已經包括${m}自己，不用再加 1。`], [n - 1, `前面 ${k - 1} 人，還有${m}自己，要加回來。`], [b, '這只是後面的人，前面的也要算。']) });
      },
      /* how many in front */
      (r, p) => {
        const m = name(r), k = N(r, p, 2, 12), ans = k - 1;
        return o('q-front', `${m}排第 ${k} 個。前面有幾人？`, ans, `第 ${k} 個包括${m}自己。`, `排第 ${k}，前面的人數比 ${k} 少 1：${k}－1＝${ans}。`, [k, ans - 1, ans + 2, k + 1], `${k}-1`, [],
          { svg: queueSvg(k, { [k - 1]: 'me' }, `排第 ${k}`), why: why([k, `第 ${k} 個包括${m}自己，前面少一個。`], [ans - 1, '前面的人要全部數，只扣掉自己一個。']) });
      }
    ],
    B: [
      /* k-th from the front and j-th from the back: the person is counted twice */
      (r, p) => {
        const m = name(r), k = N(r, p, 2, 9), j = N(r, p, 2, 9), n = k + j - 1;
        return o('q-both', `${m}從前面數是第 ${k} 個，從後面數是第 ${j} 個。共有幾人？`, n, `${m}被數了兩次。`, `${k}＋${j}把${m}數了兩次，要減 1：${k}＋${j}－1＝${n}。`, [k + j, k + j - 2, k, j, n + 2], `${k}+${j}-1`, [],
          { why: why([k + j, `${m}被數了兩次（前面數一次，後面數一次），要減 1。`], [k + j - 2, '只重複了一個人，減 1 就夠了。'], [Math.max(k, j), '前面和後面的人合起來才是全部。']) });
      },
      /* two people in a queue: how many between them */
      (r, p) => {
        const [m1, m2] = twoNames(r), k = N(r, p, 1, 7), j = k + ri(r, 2, N(r, p, 3, 8)), ans = j - k - 1;
        return o('q-between', `${m1}排第 ${k} 個，${m2}排第 ${j} 個。中間有幾人？`, ans, '中間不包括這兩人。', `${j}－${k}＝${j - k}，其中包括${m2}，要再減 1：${ans}。`, [j - k, ans + 1, ans - 1, j, k], `${j}-${k}-1`, [],
          { svg: queueSvg(j, { [k - 1]: 'me', [j - 1]: 'm2' }, `${m1}排第 ${k}，${m2}排第 ${j}`), why: why([j - k, `${j}－${k} 連${m2}也數進去了，中間不包括這兩人。`], [ans - 1, '中間的人全部都要數，別減多了。'], [ans + 2, '兩個人的位置都不能數進中間。']) });
      },
      /* people leave / join behind: first find the whole queue */
      (r, p) => {
        const m = name(r), a = N(r, p, 1, 6), b = N(r, p, 3, 8), leave = r() < .5, d = leave ? ri(r, 1, b - 1) : ri(r, 1, Math.min(4, 17 - (a + b + 1))), t = a + 1 + b, n = leave ? t - d : t + d;
        const act = leave ? `後面走了 ${d} 人，剩幾人？` : `後面又來 ${d} 人，共幾人？`;
        return o('q-change', `${m}前面 ${a} 人，後面 ${b} 人。${act}`, n, '先算出本來共有幾人。', `本來 ${a}＋${b}＋1＝${t} 人；${leave ? `走了 ${d} 人，${t}－${d}` : `又來 ${d} 人，${t}＋${d}`}＝${n}。`, [t, a + b + (leave ? -d : d), n + 1, n - 1, leave ? t + d : t - d], `${a}+${b}+1${leave ? '-' : '+'}${d}`, [],
          { why: why([t, `${t} 是本來的人數，還要${leave ? '減去走了的' : '加上來了的'}。`], [a + b + (leave ? -d : d), `別忘了${m}自己。`], [leave ? t + d : t - d, leave ? '走了是減，不是加。' : '來了是加，不是減。']) });
      }
    ]
  };
  const verify14 = q => {
    let m;
    const build = (front, back, extra) => front + 1 + back + (extra || 0);
    if ((m = /^.+?前面有 (\d+) 人，後面有 (\d+) 人。隊伍共有幾人？$/.exec(q.q))) return String(build(+m[1], +m[2]));
    if ((m = /^.+?排第 (\d+) 個，後面有 (\d+) 人。共有幾人？$/.exec(q.q))) { let c = 0; for (let i = 1; i <= +m[1] + +m[2]; i++) c++; return String(c); }
    if ((m = /^.+?排第 (\d+) 個。前面有幾人？$/.exec(q.q))) { let c = 0; for (let i = 1; i < +m[1]; i++) c++; return String(c); }
    if ((m = /^.+?從前面數是第 (\d+) 個，從後面數是第 (\d+) 個。共有幾人？$/.exec(q.q))) { for (let n = 1; n < 60; n++) if (n - +m[1] + 1 === +m[2]) return String(n); return 'none'; }
    if ((m = /^.+?排第 (\d+) 個，.+?排第 (\d+) 個。中間有幾人？$/.exec(q.q))) { let c = 0; for (let i = +m[1] + 1; i < +m[2]; i++) c++; return String(c); }
    if ((m = /^.+?前面 (\d+) 人，後面 (\d+) 人。後面(走了|又來) (\d+) 人，(?:剩|共)幾人？$/.exec(q.q))) { let n = 0; for (let i = 0; i < +m[1]; i++) n++; n++; for (let i = 0; i < +m[2]; i++) n++; for (let i = 0; i < +m[4]; i++) n += m[3] === '走了' ? -1 : 1; return String(n); }
    return null;
  };

  WQOly.register({
    id: 'p1-4', grade: 1, n: 4, title: '排隊問題', icon: '🚶',
    card: { motto: '前＋後＋自己', example: '前 3 後 4 共 8 人', art: art14 },
    lesson: [
      { t: 'show', say: '小明前面 3 人，後面 4 人。還有小明自己！', scene: { w: 'bars', p: { rows: [{ label: '隊', segs: [{ u: 3, c: 'a', text: '前 3' }, { u: 1, c: 'd', text: '我' }, { u: 4, c: 'b', text: '後 4' }] }], braces: [{ from: 0, to: 0, label: '共 8', c: 't' }] }, still: true } },
      { t: 'predict', say: '前面 3 人，後面 4 人，再加自己。', ask: '隊伍一共有幾人？', options: ['7', '8', '9'], answer: '8', scene: { w: 'bars', p: { rows: [{ label: '隊', segs: [{ u: 3, c: 'a', text: '前 3' }, { u: 1, c: 'd', text: '我' }, { u: 4, c: 'b', text: '後 4' }] }], braces: [{ from: 0, to: 0, label: '共 ?', c: 't' }] }, still: true }, reveal: '3＋1＋4＝8。別漏了自己！' },
      { t: 'do', say: '拖金色那段，令後面有 4 人。', scene: { w: 'bars', p: { rows: [{ label: '隊', segs: [{ u: 3, c: 'a', text: '前 3' }, { u: 1, c: 'd', text: '我' }, { u: 1, c: 'b', edit: true, target: 4, start: 1, min: 1, max: 8 }] }], braces: [{ from: 0, to: 0, label: '共 8 人', c: 't' }] } } },
      { t: 'show', say: '排第 4 個，前面只有 3 人。', scene: { w: 'bars', p: { rows: [{ label: '隊', segs: [{ u: 3, c: 'a', text: '前 3' }, { u: 1, c: 'd', text: '第 4' }] }], braces: [{ from: 0, to: 0, label: '共 4', c: 't' }] }, still: true } },
      { t: 'do', say: '拖青色那段：前面 5 人，我排第 6。', scene: { w: 'bars', p: { rows: [{ label: '隊', segs: [{ u: 1, c: 'a', edit: true, target: 5, start: 1, min: 1, max: 8 }, { u: 1, c: 'd', text: '我' }] }], braces: [{ from: 0, to: 0, label: '第 6', c: 't' }] } } },
      { t: 'try', say: '前、後、自己，一個都不漏。', scene: { w: 'bars', p: { rows: [{ label: '隊', segs: [{ u: 4, c: 'a', text: '前 4' }, { u: 1, c: 'd', text: '我' }, { u: 2, c: 'b', text: '後 2' }] }], braces: [{ from: 0, to: 0, label: '共 ?', c: 't' }] }, still: true },
        q: { stem: '小美前面有 4 人，後面有 2 人。共有幾人？', options: ['6', '7', '8'], answer: '7', hint: '加上小美自己。', why: { 6: '4＋2 沒有數小美自己。', 8: '小美只算一次，不是兩次。' } } },
      { t: 'card' }
    ],
    gens: g14, verify: verify14
  });

  /* ---- p1-5 比較推理 ------------------------------------------------------------------------------------------------------ */
  const art15 = `<svg viewBox="0 0 120 80">${[[22, 44, 26, '#3ee6d0'], [60, 30, 40, '#ffc94a'], [98, 14, 56, '#c6a2ff']].map(([x, y, h, c]) => `<rect x="${x - 12}" y="${y + 20}" width="24" height="${h}" rx="6" fill="${c}"/>`).join('')}<path d="M34 50l14-8M72 36l14-8" stroke="#ff8fc7" stroke-width="2.4" stroke-linecap="round"/><text x="22" y="14" text-anchor="middle" font-size="12" font-weight="900" fill="#c3cbf7">丙</text><text x="60" y="14" text-anchor="middle" font-size="12" font-weight="900" fill="#c3cbf7">乙</text><text x="98" y="14" text-anchor="middle" font-size="12" font-weight="900" fill="#c3cbf7">甲</text></svg>`;
  const barPair = (a, b, la, lb, diffLabel, hideTop) => {
    const u = Math.min(11, 200 / Math.max(a, b)), x0 = 36;
    return svgOf(240, 76, `<text x="6" y="22" font-size="12" font-weight="800" fill="${CT}">${la}</text><rect x="${x0}" y="10" width="${a * u}" height="22" rx="6" fill="${CA}"/><text x="${x0 + a * u / 2}" y="22" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="900" fill="#0b1030">${hideTop ? '?' : a}</text>`
      + `<text x="6" y="56" font-size="12" font-weight="800" fill="${CT}">${lb}</text><rect x="${x0}" y="44" width="${b * u}" height="22" rx="6" fill="${CB}"/><rect x="${x0 + b * u}" y="44" width="${(a - b) * u}" height="22" rx="6" fill="none" stroke="${CC}" stroke-width="2.4" stroke-dasharray="5 4"/>`
      + `<text x="${x0 + b * u + (a - b) * u / 2}" y="56" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="900" fill="${CC}">${diffLabel}</text>`, `${la}比${lb}多`);
  };
  /* "X 比 Y 高" or "Y 比 X 矮" - X is the taller */
  const cmpText = (r, tall, short) => r() < .5 ? `${tall}比${short}高。` : `${short}比${tall}矮。`;
  const g15 = {
    A: [
      /* three people in a chain, clues shuffled */
      (r, p) => {
        const ns = shuffle(r, NAMES).slice(0, 3), cl = shuffle(r, [cmpText(r, ns[0], ns[1]), cmpText(r, ns[1], ns[2])]), w = ri(r, 0, 2), fromTall = r() < .5;
        const ans = fromTall ? w + 1 : 3 - w;
        return o('cmp-chain3', `${cl.join('')}${fromTall ? '由高數起' : '由矮數起'}，${ns[w]}排第幾？`, ans, '先排出誰最高、誰最矮。', `高矮是：${ns[0]}、${ns[1]}、${ns[2]}（高→矮）；${fromTall ? '由高' : '由矮'}數起，${ns[w]}排第 ${ans}。`, [1, 2, 3, 4].filter(x => x !== ans), '', [],
          { why: why([4 - ans, '看清楚是由高數起，還是由矮數起。'], [ans === 1 ? 2 : ans - 1, '先把三個人由高到矮排出來，再數。'], [ans + 1, '只看一句話不夠，兩句要連起來。']) });
      },
      /* sweets: X has a, X has d more than Y; Y has? */
      (r, p) => {
        const [m1, m2] = twoNames(r), a = N(r, p, 7, 18), d = ri(r, 1, Math.min(6, a - 2)), b = a - d;
        return o('cmp-less', `${m1}有 ${a} 粒糖，比${m2}多 ${d} 粒。${m2}有幾粒？`, b, `${m1}多，所以${m2}比較少。`, `多 ${d} 粒就是差 ${d} 粒；${a}－${d}＝${b}。`, [a + d, d, b + 1, b - 1], `${a}-${d}`, [],
          { svg: barPair(a, b, m1.n, m2.n, `多 ${d}`), why: why([a + d, `${m1}比較多，${m2}要比 ${a} 少，用減。`], [d, `${d} 是相差，不是${m2}的粒數。`]) });
      },
      /* sweets: Y has b, X has d more than Y; X has? */
      (r, p) => {
        const [m1, m2] = twoNames(r), b = N(r, p, 3, 12), d = ri(r, 1, Math.min(6, 18 - b)), a = b + d;
        return o('cmp-more', `${m1}有 ${b} 粒糖，${m2}比${m1}多 ${d} 粒。${m2}有幾粒？`, a, `${m2}比較多。`, `${m2}多 ${d} 粒；${b}＋${d}＝${a}。`, [b - d > 0 ? b - d : b + 2, d, a + 1, a - 1], `${b}+${d}`, [],
          { svg: barPair(a, b, m2.n, m1.n, `多 ${d}`, true), why: why([b - d, `${m2}比較多，要比 ${b} 多，用加。`], [d, `${d} 是多出的，${m1}的 ${b} 粒也要算進去。`]) });
      }
    ],
    B: [
      /* four things in a chain with clues out of order */
      (r, p) => {
        const L = shuffle(r, ['甲', '乙', '丙', '丁']), cl = shuffle(r, [0, 1, 2].map(i => cmpText(r, L[i], L[i + 1]))), w = ri(r, 0, 3);
        return o('cmp-chain4', `${cl.join('')}由高數起，${L[w]}排第幾？`, w + 1, '先把四個由高到矮排好。', `高→矮是：${L.join('、')}；${L[w]}排第 ${w + 1}。`, [1, 2, 3, 4].filter(x => x !== w + 1), '', [],
          { why: why([4 - w, '看清楚是由高數起，不是由矮數起。'], [w === 0 ? 2 : w, '三句話要連起來排，不能只看一句。'], [w + 2, '排位要由高的一端開始數。']) });
      },
      /* two steps: X has d1 more than Y, Y has d2 more than Z */
      (r, p) => {
        const d1 = ri(r, 1, 5), d2 = ri(r, 1, 5), c = N(r, p, 2, 8), v = { 甲: c + d1 + d2, 乙: c + d2, 丙: c }, up = r() < .6, ask = up ? '甲' : '丙', given = up ? '丙' : '甲';
        const mid = v.乙, ans = v[ask];
        return o('cmp-two', `甲比乙多 ${d1} 粒，乙比丙多 ${d2} 粒。${given}有 ${v[given]}，${ask}有幾粒？`, ans, '先找出乙有幾粒。', up ? `乙：${c}＋${d2}＝${mid}；甲：${mid}＋${d1}＝${ans}。` : `乙：${v.甲}－${d1}＝${mid}；丙：${mid}－${d2}＝${ans}。`,
          [mid, up ? c + d1 : v.甲 - d1 - d2 + d2, ans + 1, ans - 1, up ? c + d1 + d2 + 1 : v.甲 + d1 + d2], up ? `${c}+${d2}+${d1}` : `${v.甲}-${d1}-${d2}`, [],
          { why: why([mid, `${mid} 是乙的粒數，題目問${ask}。`], [up ? c + d1 : v.甲 - d1, up ? '甲比乙多，乙又比丙多，兩個差都要加。' : '丙比乙少，乙又比甲少，兩個差都要減。'], [up ? c + d1 + d2 + 1 : v.甲 + d1, '一步一步算，不要多加或少減。']) });
      }
    ]
  };
  const verify15 = q => {
    let m;
    const rank = (clauses, who, fromTall) => {
      const names = new Set(); const gt = []; // gt: [taller, shorter]
      clauses.forEach(s => { const mm = /^(.+?)比(.+?)(高|矮)$/.exec(s); if (!mm) throw new Error('bad ' + s); names.add(mm[1]); names.add(mm[2]); gt.push(mm[3] === '高' ? [mm[1], mm[2]] : [mm[2], mm[1]]); });
      const all = [...names], beats = {}; all.forEach(a => { beats[a] = new Set(); });
      gt.forEach(([a, b]) => beats[a].add(b));
      for (let k = 0; k < all.length; k++) all.forEach(a => [...beats[a]].forEach(b => beats[b].forEach(c => beats[a].add(c))));
      const taller = all.filter(a => beats[a].has(who)).length, shorter = beats[who].size;
      return fromTall ? taller + 1 : shorter + 1;
    };
    if ((m = /^(.+。)(由高數起|由矮數起)，(.+?)排第幾？$/.exec(q.q))) return String(rank(m[1].split('。').filter(Boolean), m[3], m[2] === '由高數起'));
    if ((m = /^(.+?)有 (\d+) 粒糖，比(.+?)多 (\d+) 粒。(.+?)有幾粒？$/.exec(q.q))) { for (let b = 0; b < 40; b++) if (b + +m[4] === +m[2]) return String(b); return 'none'; }
    if ((m = /^(.+?)有 (\d+) 粒糖，(.+?)比(.+?)多 (\d+) 粒。(.+?)有幾粒？$/.exec(q.q))) { for (let a = 0; a < 40; a++) if (a - +m[5] === +m[2]) return String(a); return 'none'; }
    if ((m = /^甲比乙多 (\d+) 粒，乙比丙多 (\d+) 粒。(.)有 (\d+)，(.)有幾粒？$/.exec(q.q))) {
      const d1 = +m[1], d2 = +m[2];
      for (let c = 0; c < 60; c++) { const v = { 丙: c, 乙: c + d2, 甲: c + d2 + d1 }; if (v[m[3]] === +m[4]) return String(v[m[5]]); }
      return 'none';
    }
    return null;
  };

  WQOly.register({
    id: 'p1-5', grade: 1, n: 5, title: '比較推理', icon: '📏',
    card: { motto: '由已知推到未知', example: '甲比乙高，乙比丙高', art: art15 },
    lesson: [
      { t: 'show', say: '小明比小美高，小美比小欣高。', scene: { w: 'sortcards', p: { cards: [{ id: 'c', label: '小欣', emoji: '👧', h: 80 }, { id: 'b', label: '小美', emoji: '🧒', h: 110 }, { id: 'a', label: '小明', emoji: '👦', h: 140 }], order: ['c', 'b', 'a'], start: ['a', 'c', 'b'], axis: '矮 → 高' }, still: true } },
      { t: 'predict', say: '小明比小美高。小美比小欣高。', ask: '誰最高？', options: ['小明', '小美', '小欣'], answer: '小明', scene: { w: 'sortcards', p: { cards: [{ id: 'c', label: '小欣', emoji: '👧', h: 80, hide: true }, { id: 'b', label: '小美', emoji: '🧒', h: 110, hide: true }, { id: 'a', label: '小明', emoji: '👦', h: 140, hide: true }], order: ['c', 'b', 'a'], start: ['a', 'c', 'b'], axis: '矮 → 高' }, still: true }, reveal: '小明比小美高，小美又比小欣高。小明最高！' },
      { t: 'do', say: '小明比小美高，小美比小欣高。排排看！', scene: { w: 'sortcards', p: { cards: [{ id: 'c', label: '小欣', emoji: '👧', h: 80, hide: true }, { id: 'b', label: '小美', emoji: '🧒', h: 110, hide: true }, { id: 'a', label: '小明', emoji: '👦', h: 140, hide: true }], order: ['c', 'b', 'a'], start: ['b', 'a', 'c'], axis: '矮 → 高' } } },
      { t: 'show', say: '甲比乙高，乙比丙高，所以甲比丙高。', scene: { w: 'sortcards', p: { cards: [{ id: 'z', label: '丙', emoji: '🐥', h: 70 }, { id: 'y', label: '乙', emoji: '🐰', h: 105 }, { id: 'x', label: '甲', emoji: '🐻', h: 140 }], order: ['z', 'y', 'x'], start: ['x', 'z', 'y'], axis: '矮 → 高' }, still: true } },
      { t: 'do', say: '甲比乙高，乙比丙高，丙比丁高。', scene: { w: 'sortcards', p: { cards: [{ id: 'd', label: '丁', emoji: '🐥', h: 60, hide: true }, { id: 'c', label: '丙', emoji: '🐱', h: 90, hide: true }, { id: 'b', label: '乙', emoji: '🐰', h: 120, hide: true }, { id: 'a', label: '甲', emoji: '🐻', h: 150, hide: true }], order: ['d', 'c', 'b', 'a'], start: ['b', 'd', 'a', 'c'], axis: '矮 → 高' } } },
      { t: 'try', say: '先排好，再數第幾。', q: { stem: '小明比小美高，小美比小欣高。由高數起，小欣排第幾？', options: ['1', '2', '3'], answer: '3', hint: '先排出誰最高、誰最矮。', why: { 1: '第 1 是最高的，小明才最高。', 2: '第 2 是小美，小欣比小美矮。' } } },
      { t: 'card' }
    ],
    gens: g15, verify: verify15
  });
})();
