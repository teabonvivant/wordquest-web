/* 小六 · 5 units (finished). p6-2 = 按份數分配 (no ratio colon), p6-4 = 相遇與追及 (first card teaches 速度＝路程÷時間), per 設計書「研究後修訂」.
   Tools: only the existing ones (bars, cycle) - no new widget, so the unit test's widget list stays valid. */
(function () {
  'use strict';
  const { o, N, ri, pick, shuffle } = WQOly.helpers;
  const gcd = WQOly.gcd;
  /* o() + keep only whole-number (or fraction) wrong answers / why keys that make sense (never a negative count) */
  const O = (...a) => { const q = o(...a); if (q.why) { const w = {}; for (const k in q.why) if (/^\d+(\/\d+)?$/.test(k)) w[k] = q.why[k]; q.why = w; } q.w = q.w.filter(v => typeof v !== 'number' || (isFinite(v) && v >= 0)); return q; };
  const frac = (p, q) => { const g = gcd(p, q); p /= g; q /= g; return q === 1 ? String(p) : p + '/' + q; };

  /* ---- svg helpers ------------------------------------------------------------------------------------------------------ */
  const AQ = '#3ee6d0', GO = '#ffc94a', TX = '#c3cbf7', PK = '#ff8fc7', VI = '#c6a2ff', BG = '#1b2160';
  const text = (x, y, s, sz, col) => `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="${sz || 14}" font-weight="900" fill="${col || TX}">${s}</text>`;
  /* a bar split into cells (份); parts: [{n, name, col}] */
  const partBar = (parts, title) => {
    const tot = parts.reduce((s, p) => s + p.n, 0), cw = Math.min(30, 208 / tot); let x = 120 - tot * cw / 2, s = '';
    parts.forEach(p => {
      for (let i = 0; i < p.n; i++) s += `<rect x="${(x + i * cw).toFixed(1)}" y="38" width="${cw.toFixed(1)}" height="30" fill="${p.col}" fill-opacity=".3" stroke="${p.col}" stroke-width="1.8"/>`;
      s += text((x + p.n * cw / 2).toFixed(1), 53, p.n + ' 份', 13, '#fff') + text((x + p.n * cw / 2).toFixed(1), 84, p.name, 14, p.col); x += p.n * cw;
    });
    return `<svg viewBox="0 0 240 110" role="img" aria-label="${parts.map(p => p.name + p.n + ' 份').join('，')}">${s}${text(120, 16, title || '', 14, GO)}</svg>`;
  };
  const PC = [AQ, GO, PK];
  /* consecutive pieces 1/(k×(k+1)), k = a..b, lying between 1/(b+1) and 1/a on a bar of length 1 */
  const fracBar = (a, b) => {
    const X = v => 20 + 200 * v; let s = `<rect x="20" y="40" width="200" height="30" rx="4" fill="none" stroke="${TX}" stroke-width="1.6" opacity=".7"/>`;
    for (let k = b; k >= a; k--) s += `<rect x="${X(1 / (k + 1)).toFixed(1)}" y="40" width="${(X(1 / k) - X(1 / (k + 1))).toFixed(1)}" height="30" fill="${(b - k) % 2 ? GO : AQ}" fill-opacity=".55" stroke="#0b1030" stroke-width="1"/>`;
    return `<svg viewBox="0 0 240 110" role="img" aria-label="長度 1 的長條上，1/(${a}×${a + 1}) 到 1/(${b}×${b + 1}) 接成一段">${s}${text(X(1 / (b + 1)).toFixed(1), 88, '1/' + (b + 1), 13, AQ)}${text(X(1 / a).toFixed(1), 88, a === 1 ? '1' : '1/' + a, 13, GO)}${text((X(1 / (b + 1)) + X(1 / a)) / 2, 22, '和 ＝ ？', 15, PK)}</svg>`;
  };
  const formSvg = (l1, l2) => `<svg viewBox="0 0 240 110" role="img" aria-label="${l1} ${l2 || ''}">${text(120, 40, l1, 17, TX)}${l2 ? text(120, 74, l2, 17, GO) : ''}</svg>`;
  const workSvg = (a, b, nm) => {
    const row = (n, y, col, lab) => { const w = 150 / n; let s = ''; for (let i = 0; i < n; i++) s += `<rect x="${(70 + i * w).toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="24" fill="${col}" fill-opacity=".3" stroke="${col}" stroke-width="1.6"/>`; return s + text(34, y + 12, lab, 14, col); };
    return `<svg viewBox="0 0 240 110" role="img" aria-label="甲 ${a} 日完成，乙 ${b} 日完成">${row(a, 22, AQ, nm[0])}${row(b, 62, GO, nm[1])}${text(120, 98, '每一格是 1 日的工作', 12, TX)}</svg>`;
  };
  const road = (kind, Dtxt, a, b) => {
    const person = (x, col, lab, dir) => `<circle cx="${x}" cy="60" r="12" fill="${col}"/>${text(x, 60, lab, 13, '#0b1030')}<path d="M${x + dir * 16} 60h${dir * 22}m${-dir * 6} -5l${dir * 6} 5l${-dir * 6} 5" stroke="${col}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    let s = `<path d="M18 78H222" stroke="${TX}" stroke-width="3" stroke-linecap="round" opacity=".6"/>`;
    if (kind === 'meet') s += person(36, AQ, '甲', 1) + person(204, GO, '乙', -1) + text(120, 30, Dtxt, 16, PK) + `<path d="M36 40V46M204 40V46M36 43H204" stroke="${PK}" stroke-width="1.8" fill="none"/>` + text(60, 98, '每分 ' + a + ' 米', 12, AQ) + text(180, 98, '每分 ' + b + ' 米', 12, GO);
    else s += person(124, GO, '乙', 1) + person(40, AQ, '甲', 1) + text(82, 30, Dtxt, 16, PK) + `<path d="M40 40V46M124 40V46M40 43H124" stroke="${PK}" stroke-width="1.8" fill="none"/>` + text(60, 98, '甲每分 ' + a + ' 米', 12, AQ) + text(180, 98, '乙每分 ' + b + ' 米', 12, GO);
    return `<svg viewBox="0 0 240 110" role="img" aria-label="${kind === 'meet' ? '兩人面對面走' : '兩人同向而行'}">${s}</svg>`;
  };
  /* an n×n×n cube seen from a corner, 3 faces gridded */
  const iso = n => {
    const s = 96 / (2 * n), c = Math.cos(Math.PI / 6) * s, h = s / 2, ox = 120, oy = 7, P = (i, j, k) => [ox + (i - j) * c, oy + (i + j) * h + k * s];
    const poly = (pts, f) => `<polygon points="${pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}" fill="${f}" stroke="#0b1030" stroke-width="1.2"/>`;
    let g = '';
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) g += poly([P(i, j, 0), P(i + 1, j, 0), P(i + 1, j + 1, 0), P(i, j + 1, 0)], '#ffd877');
    for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) g += poly([P(i, n, k), P(i + 1, n, k), P(i + 1, n, k + 1), P(i, n, k + 1)], '#e3a92b');
    for (let j = 0; j < n; j++) for (let k = 0; k < n; k++) g += poly([P(n, j, k), P(n, j + 1, k), P(n, j + 1, k + 1), P(n, j, k + 1)], '#b97f10');
    return `<svg viewBox="0 0 240 110" role="img" aria-label="${n}×${n}×${n} 的正方體，外面塗了色">${g}</svg>`;
  };
  const netSvg = (belt, ti, top, bi, bot, hl) => {
    const cw = 30, x0 = 120 - 2 * cw; let s = '';
    const cell = (x, y, v, on) => `<rect x="${x}" y="${y}" width="${cw}" height="${cw}" fill="${on ? GO : BG}" stroke="${AQ}" stroke-width="2"/>${text(x + cw / 2, y + cw / 2 + 1, v, 17, on ? '#3b2600' : TX)}`;
    belt.forEach((v, i) => { s += cell(x0 + i * cw, 40, v, v === hl); });
    s += cell(x0 + ti * cw, 10, top, top === hl) + cell(x0 + bi * cw, 70, bot, bot === hl);
    return `<svg viewBox="0 0 240 110" role="img" aria-label="正方體展開圖：橫排 ${belt.join('、')}，上面 ${top}，下面 ${bot}">${s}</svg>`;
  };

  /* ============================================================================================================================ */
  /* ---- p6-1 分數巧算 ----------------------------------------------------------------------------------------------------- */
  const art61 = '<svg viewBox="0 0 120 80"><rect x="10" y="12" width="100" height="24" rx="4" fill="none" stroke="#c3cbf7" stroke-width="1.6" opacity=".7"/><rect x="60" y="12" width="50" height="24" fill="#3ee6d0" fill-opacity=".55"/><rect x="43" y="12" width="17" height="24" fill="#ffc94a" fill-opacity=".55"/><rect x="30" y="12" width="13" height="24" fill="#3ee6d0" fill-opacity=".55"/><rect x="14" y="48" width="92" height="22" rx="11" fill="#ff8fc7"/><text x="60" y="59" text-anchor="middle" dominant-baseline="central" font-size="11" font-weight="900" fill="#0b1030">1/k－1/(k+1)</text></svg>';
  const termsOf = (x, g, last) => { const t = []; for (let a = x; a <= last; a += g) t.push([a, a + g]); return t; };
  const sumFrac = t => { let num = 0, den = 1; for (const [a, b] of t) { const d = a * b, l = den / gcd(den, d) * d; num = num * (l / den) + l / d; den = l; } const g = gcd(num, den); return [num / g, den / g]; };
  const g61 = {
    A: [
      (r, p) => {
        const n = N(r, p, 3, 9), s = frac(n, n + 1), sf = pick(r, ['＝？', '的和是多少？']);
        return O('frac-split', `1/(1×2)＋1/(2×3)＋…＋1/(${n}×${n + 1})${sf}`, s, '每一項拆成兩個分數相減。', `1/(k×(k+1))＝1/k－1/(k+1)，中間全部抵消，只剩 1－1/${n + 1}＝${s}。`,
          [frac(n + 1, n + 2), frac(n - 1, n), `1/${n + 1}`, frac(n, n + 2)], '', [], { form: 'simplest', svg: fracBar(1, n), why: { [`1/${n + 1}`]: `抵消後剩下 1 和最後一項，要相減：1－1/${n + 1}。`, [frac(n + 1, n + 2)]: `最後一項是 1/(${n}×${n + 1})，分母到 ${n + 1}，不是 ${n + 2}。` } });
      },
      (r, p) => {
        const a = ri(r, 2, 5), b = ri(r, a + 2, 9), [sn, sd] = sumFrac(termsOf(a, 1, b)), s = frac(sn, sd);
        return O('frac-mid', `1/(${a}×${a + 1})＋1/(${a + 1}×${a + 2})＋…＋1/(${b}×${b + 1})＝？`, s, '拆開後，首尾剩下兩個分數。', `1/${a}－1/${b + 1}＝${b + 1}/${a * (b + 1)}－${a}/${a * (b + 1)}＝${s}。`,
          [`1/${a}`, `1/${b + 1}`, frac(b - a + 1, b + 1), frac(b - a, a * b)], '', [], { form: 'simplest', svg: fracBar(a, b), why: { [`1/${a}`]: `這項是 1/${a} 的開頭，還要減去最後剩下的 1/${b + 1}。`, [`1/${b + 1}`]: `只是剩下的尾巴，要用 1/${a} 去減。` } });
      },
      (r, p) => {
        const a = N(r, p, 2, 13), q = r() < .5;
        return q ? O('frac-diff', `1/${a}－1/${a + 1}＝？`, frac(1, a * (a + 1)), '通分母：分母是兩個分母相乘。', `1/${a}－1/${a + 1}＝${a + 1}/${a * (a + 1)}－${a}/${a * (a + 1)}＝1/${a * (a + 1)}。`,
          [`1/${a}`, `1/${a + 1}`, `1/${2 * a + 1}`, `2/${a * (a + 1)}`], '', [], { form: 'simplest', svg: formSvg(`1/${a}－1/${a + 1}`, `＝ 1/(${a}×${a + 1})`), why: { [`1/${2 * a + 1}`]: '分母不能直接相減或相加，要先通分母。', [`1/${a}`]: '還要減去 1/' + (a + 1) + '，不是只剩第一個。' } })
          : O('frac-find', `1/(${a}×${a + 1})＝1/${a}－1/？。？是多少？`, a + 1, '拆成兩個分數相減。', `1/(${a}×${a + 1})＝1/${a}－1/${a + 1}，所以？是 ${a + 1}。`,
            [a, a + 2, a * (a + 1), 1], '', [], { svg: formSvg(`1/(${a}×${a + 1})`, `＝ 1/${a} － 1/？`), why: { [a]: `${a} 是前一個分母，要減去的是下一個：${a + 1}。`, [a * (a + 1)]: '乘出來的是分母，拆開後是兩個相鄰的數。' } });
      }
    ],
    B: [
      (r, p) => {
        const m = N(r, p, 3, 9), g = pick(r, [2, 3]), last = 1 + (m - 1) * g, s = frac(m, 1 + m * g);
        return O('frac-gap', `1/(1×${1 + g})＋1/(${1 + g}×${1 + 2 * g})＋…＋1/(${last}×${last + g})＝？`, s, `每項拆開後要乘 1/${g}。`, `每項＝(1/左－1/右)÷${g}，中間抵消，剩 (1－1/${last + g})÷${g}＝${s}。`,
          [frac(last + g - 1, last + g), frac(m, 1 + m * g + 1), frac(m + 1, 1 + m * g), `1/${last + g}`], '', [], { form: 'simplest', svg: formSvg(`1/(1×${1 + g})＝(1－1/${1 + g})÷${g}`, '每項都要除以 ' + g), why: { [frac(last + g - 1, last + g)]: `抵消後剩 1－1/${last + g}，還要除以 ${g}。`, [`1/${last + g}`]: `這只是剩下的尾巴，要用 1 去減再除以 ${g}。` } });
      },
      (r, p) => {
        const s0 = ri(r, 2, 6), g = pick(r, [2, 3]), m = N(r, p, 3, 8), last = s0 + (m - 1) * g, [sn, sd] = sumFrac(termsOf(s0, g, last).map(([a, b]) => [a, b])), ans = frac(sn, sd);
        return O('frac-gap-mid', `1/(${s0}×${s0 + g})＋1/(${s0 + g}×${s0 + 2 * g})＋…＋1/(${last}×${last + g})＝？`, ans, `先拆成相減，最後除以 ${g}。`, `和＝(1/${s0}－1/${last + g})÷${g}，通分母算出 ${frac(sn * g, sd)}，再除以 ${g}：${ans}。`,
          [frac(sn * g, sd), `1/${s0}`, frac(sn, sd * g), frac(sn + 1, sd)], '', [], { form: 'simplest', svg: formSvg(`1/${s0}－1/${last + g}`, '再除以 ' + g), why: { [frac(sn * g, sd)]: `這是不除以 ${g} 的值，要記得除以 ${g}。`, [`1/${s0}`]: '這只是開頭的分數，還要減去尾巴再除。' } });
      },
      (r, p) => {
        const n = N(r, p, 3, 9);
        return O('frac-times', `（1/(1×2)＋1/(2×3)＋…＋1/(${n}×${n + 1})）×${n + 1}＝？`, n, '括號內先拆開抵消。', `括號內＝${n}/${n + 1}；${n}/${n + 1}×${n + 1}＝${n}。`,
          [n + 1, n - 1, 1, n * (n + 1)], '', [], { svg: fracBar(1, n), why: { [n + 1]: `括號內是 ${n}/${n + 1}，乘 ${n + 1} 後分母消去，剩分子 ${n}。`, [1]: `括號內不是 1，是 1－1/${n + 1}。` } });
      }
    ]
  };
  const verify61 = q => {
    let m;
    const ts = [...q.q.matchAll(/1\/\((\d+)×(\d+)\)/g)].map(x => [+x[1], +x[2]]);
    if (/^1\/\d+－1\/\d+＝？/.test(q.q) && (m = /^1\/(\d+)－1\/(\d+)＝？/.exec(q.q))) { const a = +m[1], b = +m[2]; return frac(b - a, a * b); }
    if ((m = /^1\/\((\d+)×(\d+)\)＝1\/\d+－1\/？/.exec(q.q))) return String(+m[2]);
    if (ts.length >= 3) {
      const x0 = ts[0][0], g = ts[0][1] - ts[0][0], last = ts[ts.length - 1][0];
      const [sn, sd] = sumFrac(termsOf(x0, g, last)); const mul = /）×(\d+)＝？/.exec(q.q);
      return mul ? frac(sn * +mul[1], sd) : frac(sn, sd);
    }
    return null;
  };
  const R61 = rows => ({ rows });
  WQOly.register({
    id: 'p6-1', grade: 6, n: 1, title: '分數巧算', icon: '🍕',
    card: { motto: '拆成兩個相減', example: '1/(1×2)＝1－1/2', art: art61 },
    lesson: [
      { t: 'show', say: '1/(1×2)＝1/2。也就是 1 減去 1/2。', scene: { w: 'bars', p: R61([{ label: '1', segs: [{ u: 2, c: 't', text: '1' }] }, { label: '', segs: [{ u: 1, c: 'a', text: '1/2' }, { u: 1, c: 'd', text: '1/2' }] }]) } },
      { t: 'predict', say: '1/(2×3) 也可以拆成相減。', ask: '它等於哪一個？', options: ['1/2－1/3', '1/2＋1/3', '1/3－1/4'], answer: '1/2－1/3', scene: { w: 'bars', p: R61([{ label: '1/2', segs: [{ u: 3, c: 't', text: '1/2' }] }, { label: '1/3', segs: [{ u: 2, c: 'a', text: '1/3' }, { u: 1, c: 'd', text: '1/6' }] }]), still: true }, reveal: '1/2－1/3＝3/6－2/6＝1/6。剛好是 1/(2×3)。' },
      { t: 'show', say: '每項都能拆：1/(3×4)＝1/3－1/4。', scene: { w: 'bars', p: R61([{ label: '1/3', segs: [{ u: 4, c: 't', text: '1/3' }] }, { label: '1/4', segs: [{ u: 3, c: 'a', text: '1/4' }, { u: 1, c: 'd', text: '' }] }]) } },
      { t: 'do', say: '全長是 1（6 份）。拉到兩項的總和。', scene: { w: 'bars', p: R61([{ label: '兩項', segs: [{ u: 3, c: 'a', text: '1/2' }, { u: 1, c: 'b', text: '1/6' }, { u: 2, c: 'd', dashed: true, text: '1/3' }] }, { label: '和', segs: [{ u: 1, c: 't', edit: true, start: 6, target: 4, min: 1, max: 6 }] }]) } },
      { t: 'show', say: '兩項拆開：(1－1/2)＋(1/2－1/3)。中間的 1/2 抵消，剩 2/3。', scene: { w: 'bars', p: R61([{ label: '兩項', segs: [{ u: 3, c: 'a', text: '1/2' }, { u: 1, c: 'b', text: '1/6' }, { u: 2, c: 'd', dashed: true, text: '1/3' }] }, { label: '和', segs: [{ u: 4, c: 't', text: '2/3' }] }]), still: true } },
      { t: 'try', say: '多一項，一樣的方法。', scene: { w: 'bars', p: R61([{ label: '1/5', segs: [{ u: 5, c: 't', text: '1/5' }] }]), still: true },
        q: { stem: '1/(1×2)＋1/(2×3)＋1/(3×4)＋1/(4×5)＝？', options: ['3/4', '4/5', '5/6'], answer: '4/5', hint: '剩下 1－1/5。', why: { '3/4': '這是三項的和，漏了第四項。', '5/6': '多算了一項，最後的分母是 5。' } } },
      { t: 'card' }
    ],
    gens: g61, verify: verify61
  });

  /* ---- p6-2 按份數分配 ---------------------------------------------------------------------------------------------------- */
  const art62 = '<svg viewBox="0 0 120 80"><g stroke-width="2"><rect x="10" y="12" width="20" height="24" fill="#3ee6d0" fill-opacity=".3" stroke="#3ee6d0"/><rect x="30" y="12" width="20" height="24" fill="#3ee6d0" fill-opacity=".3" stroke="#3ee6d0"/><rect x="50" y="12" width="20" height="24" fill="#3ee6d0" fill-opacity=".3" stroke="#3ee6d0"/><rect x="70" y="12" width="20" height="24" fill="#ffc94a" fill-opacity=".3" stroke="#ffc94a"/><rect x="90" y="12" width="20" height="24" fill="#ffc94a" fill-opacity=".3" stroke="#ffc94a"/></g><rect x="10" y="46" width="100" height="22" rx="11" fill="#ff8fc7"/><text x="60" y="57" text-anchor="middle" dominant-baseline="central" font-size="11" font-weight="900" fill="#0b1030">先求一份是多少</text></svg>';
  const SETS = [['紅珠', '藍珠', '粒'], ['甲', '乙', '元'], ['哥哥', '妹妹', '元']];
  const g62 = {
    A: [
      (r, p) => {
        const [X, Y, cl] = pick(r, SETS); let a, b; do { a = ri(r, 1, 5); b = ri(r, 1, 5); } while (a === b);
        const k = N(r, p, 2, 12), T = (a + b) * k, x = r() < .5, pa = x ? a : b, nm = x ? X : Y, ot = x ? Y : X;
        return O('parts', `${X}和${Y}按 ${a} 份對 ${b} 份分，共 ${T} ${cl}，${nm}有幾${cl}？`, k * pa, '先求一份是多少。', `共 ${a}＋${b}＝${a + b} 份，一份 ${T}÷${a + b}＝${k}；${nm} ${pa} 份：${k}×${pa}＝${k * pa}。`,
          [k * (a + b - pa), k, T - k, k * pa + k], `${T}/${a + b}*${pa}`, [], { svg: partBar([{ n: a, name: X, col: AQ }, { n: b, name: Y, col: GO }], '共 ' + T + ' ' + cl), why: { [k * (a + b - pa)]: `你算的是${ot}，題目問${nm}。`, [k]: '這是一份的數目，還要乘份數。' } });
      },
      (r, p) => {
        let a, b, c; do { a = ri(r, 1, 4); b = ri(r, 1, 4); c = ri(r, 1, 4); } while ((a === b && b === c) || a + b + c > 10);
        const k = N(r, p, 2, 12), T = (a + b + c) * k, i = ri(r, 0, 2), ps = [a, b, c], nm = '甲乙丙'[i];
        return O('parts3', `甲、乙、丙按 ${a} 份、${b} 份、${c} 份分，共 ${T} 元，${nm}有幾元？`, k * ps[i], '先算一共有幾份。', `共 ${a}＋${b}＋${c}＝${a + b + c} 份，一份 ${T}÷${a + b + c}＝${k}；${nm} ${ps[i]} 份：${k}×${ps[i]}＝${k * ps[i]}。`,
          [k, k * ps[(i + 1) % 3], T - k * ps[i], k * ps[i] + k], `${T}/${a + b + c}*${ps[i]}`, [], { svg: partBar([{ n: a, name: '甲', col: AQ }, { n: b, name: '乙', col: GO }, { n: c, name: '丙', col: PK }], '共 ' + T + ' 元'), why: { [k]: '這是一份的數目，還要乘份數。', [k * ps[(i + 1) % 3]]: `你算的是${'甲乙丙'[(i + 1) % 3]}，題目問${nm}。` } });
      },
      (r, p) => {
        const [X, Y, cl] = pick(r, SETS); let a, b; do { a = ri(r, 1, 5); b = ri(r, 1, 5); } while (a === b);
        const k = N(r, p, 2, 12), x = a * k;
        return O('parts-known', `${X}和${Y}按 ${a} 份對 ${b} 份分，${X}有 ${x} ${cl}，${Y}有幾${cl}？`, k * b, `先由${X}的${cl}數求一份。`, `${X} ${a} 份是 ${x}，一份 ${x}÷${a}＝${k}；${Y} ${b} 份：${k}×${b}＝${k * b}。`,
          [x, k, k * (a + b), x + k * b], `${x}/${a}*${b}`, [], { svg: partBar([{ n: a, name: X + ' ' + x, col: AQ }, { n: b, name: Y + ' ？', col: GO }], X + ' ' + a + ' 份＝' + x), why: { [x]: `${x} 是${X}的${cl}數，題目問${Y}。`, [k]: '這是一份的數目，還要乘份數。' } });
      }
    ],
    B: [
      (r, p) => {
        const a = ri(r, 2, 5), b = ri(r, 1, a - 1), k = N(r, p, 2, 12), x = a * k;
        return O('parts-total', `甲和乙按 ${a} 份對 ${b} 份分，甲有 ${x} 粒，兩人共有幾粒？`, (a + b) * k, '先由甲的粒數求一份。', `甲 ${a} 份是 ${x}，一份 ${x}÷${a}＝${k}；共 ${a}＋${b}＝${a + b} 份：${k}×${a + b}＝${(a + b) * k}。`,
          [b * k, x + b, k, (a + b) * k - k], `${x}/${a}*(${a}+${b})`, [], { svg: partBar([{ n: a, name: '甲 ' + x, col: AQ }, { n: b, name: '乙', col: GO }], '共 ？ 粒'), why: { [b * k]: `${b * k} 只是乙的粒數，還要加上甲的。`, [k]: '這是一份的數目，還要乘全部的份數。' } });
      },
      (r, p) => {
        const a = ri(r, 2, 6), b = ri(r, 1, a - 1), k = N(r, p, 2, 10), d = (a - b) * k;
        return O('parts-diff', `甲和乙按 ${a} 份對 ${b} 份分錢，甲比乙多 ${d} 元，兩人共有幾元？`, (a + b) * k, '多的錢是幾份？', `甲比乙多 ${a}－${b}＝${a - b} 份，一份 ${d}÷${a - b}＝${k} 元；共 ${a + b} 份：${k}×${a + b}＝${(a + b) * k}。`,
          [d, k, a * k, (a + b) * k + k], `${d}/${a - b}*${a + b}`, [], { svg: partBar([{ n: a, name: '甲', col: AQ }, { n: b, name: '乙', col: GO }], '甲比乙多 ' + d + ' 元'), why: { [d]: `${d} 是多出的錢，要先除以多出的份數 ${a - b}，再乘全部份數。`, [a * k]: `${a * k} 只是甲的錢，還要加上乙的。` } });
      },
      (r, p) => {
        let a, b, c, d, k, T, m; const pool = [];
        for (let i = 0; i < 400; i++) { a = ri(r, 1, 5); b = ri(r, 1, 5); c = ri(r, 1, 4); d = ri(r, 1, 4); if (a === b || c === d) continue; const need = (c + d) / gcd(a, c + d); const kk = need * ri(r, 1, 8); if ((a + b) * kk <= 120 && kk >= 2) { k = kk; T = (a + b) * k; m = a * k / (c + d); if (m >= 1 && Number.isInteger(m)) break; } }
        if (!(m >= 1 && Number.isInteger(m))) { a = 3; b = 2; c = 1; d = 2; k = 6; T = 30; m = 6; }
        const A1 = a * k;
        return O('parts-two', `把 ${T} 粒糖按 ${a} 份對 ${b} 份分給甲乙。甲的糖再按 ${c} 份對 ${d} 份分給丙丁。丁有幾粒？`, d * m, '先求甲有幾粒，再分一次。', `共 ${a + b} 份，一份 ${T}÷${a + b}＝${k}，甲有 ${k}×${a}＝${A1} 粒。再分 ${c + d} 份，一份 ${A1}÷${c + d}＝${m}，丁：${m}×${d}＝${d * m}。`,
          [A1, m, c * m, b * k], `${T}/${a + b}*${a}/${c + d}*${d}`, [], { svg: partBar([{ n: a, name: '甲', col: AQ }, { n: b, name: '乙', col: GO }], '共 ' + T + ' 粒'), why: { [A1]: `${A1} 是甲的糖，還要再分給丙丁。`, [m]: '這是第二次分配中一份的數目，丁有 ' + d + ' 份。' } });
      }
    ]
  };
  const verify62 = q => {
    let m;
    if ((m = /^甲和乙按 (\d+) 份對 (\d+) 份分，甲有 (\d+) 粒，兩人共有/.exec(q.q))) { const a = +m[1], b = +m[2], x = +m[3]; for (let k = 1; k <= x; k++) if (a * k === x) return String((a + b) * k); return 'none'; }
    if ((m = /^(.+?)和(.+?)按 (\d+) 份對 (\d+) 份分，共 (\d+) (.)，(.+?)有幾/.exec(q.q))) {
      const a = +m[3], b = +m[4], T = +m[5]; for (let k = 1; k <= T; k++) if ((a + b) * k === T) return String(k * (m[7] === m[1] ? a : b)); return 'none';
    }
    if ((m = /^甲、乙、丙按 (\d+) 份、(\d+) 份、(\d+) 份分，共 (\d+) 元，(.)有/.exec(q.q))) {
      const ps = [+m[1], +m[2], +m[3]], T = +m[4], i = '甲乙丙'.indexOf(m[5]); for (let k = 1; k <= T; k++) if ((ps[0] + ps[1] + ps[2]) * k === T) return String(k * ps[i]); return 'none';
    }
    if ((m = /^(.+?)和(.+?)按 (\d+) 份對 (\d+) 份分，(.+?)有 (\d+) .，(.+?)有幾/.exec(q.q))) {
      const a = +m[3], b = +m[4], x = +m[6]; for (let k = 1; k <= x; k++) if (a * k === x) return String(k * b); return 'none';
    }
    if ((m = /^甲和乙按 (\d+) 份對 (\d+) 份分錢，甲比乙多 (\d+) 元/.exec(q.q))) { const a = +m[1], b = +m[2], d = +m[3]; for (let k = 1; k <= d; k++) if ((a - b) * k === d) return String((a + b) * k); return 'none'; }
    if ((m = /^把 (\d+) 粒糖按 (\d+) 份對 (\d+) 份分給甲乙。甲的糖再按 (\d+) 份對 (\d+) 份分給丙丁/.exec(q.q))) {
      const T = +m[1], a = +m[2], b = +m[3], c = +m[4], d = +m[5]; for (let k = 1; k <= T; k++) if ((a + b) * k === T) { const A1 = a * k; for (let u = 1; u <= A1; u++) if ((c + d) * u === A1) return String(d * u); } return 'none';
    }
    return null;
  };
  WQOly.register({
    id: 'p6-2', grade: 6, n: 2, title: '按份數分配', icon: '🍰',
    card: { motto: '先求一份', example: '3 份對 2 份，共 20：一份 4', art: art62 },
    lesson: [
      { t: 'show', say: '紅珠 3 份、藍珠 2 份，共 20 粒。', scene: { w: 'bars', p: { rows: [{ label: '紅', segs: [{ c: 'a', u: 1, rep: 3 }] }, { label: '藍', segs: [{ c: 'b', u: 1, rep: 2 }] }], braces: [{ from: 0, to: 1, label: '20 粒', c: 'd' }] } } },
      { t: 'show', say: '一共 3＋2＝5 份。20÷5＝4，一份是 4 粒。', scene: { w: 'bars', p: { rows: [{ label: '紅', segs: [{ c: 'a', u: 1, rep: 3 }] }, { label: '藍', segs: [{ c: 'b', u: 1, rep: 2 }] }, { label: '共', segs: [{ c: 't', u: 1, rep: 5 }] }], braces: [{ from: 0, to: 1, label: '20 粒', c: 'd' }] }, still: true } },
      { t: 'predict', say: '一份是 4 粒。', ask: '紅珠有幾粒？', options: ['8', '12', '15'], answer: '12', scene: { w: 'bars', p: { rows: [{ label: '紅', segs: [{ c: 'a', u: 1, rep: 3 }] }, { label: '藍', segs: [{ c: 'b', u: 1, rep: 2 }] }] }, still: true }, reveal: '紅珠 3 份。3×4＝12 粒。' },
      { t: 'do', say: '把 20 粒切成 3 份對 2 份。拉到紅珠的 3 份。', scene: { w: 'array', p: { cols: 5, rows: 4, cut: 3, start: 5 } } },
      { t: 'do', say: '甲 3 份是 12 粒。拉出乙的 2 份。', scene: { w: 'bars', p: { rows: [{ label: '甲', segs: [{ c: 'a', u: 4, rep: 3, text: '12 粒' }] }, { label: '乙', segs: [{ c: 'b', u: 4, rep: 1, edit: true, target: 2, min: 1, max: 3 }] }] } } },
      { t: 'try', say: '先求一份，再乘份數。', scene: { w: 'bars', p: { rows: [{ label: '紅', segs: [{ c: 'a', u: 1, rep: 2 }] }, { label: '藍', segs: [{ c: 'b', u: 1, rep: 3 }] }] }, still: true },
        q: { stem: '紅珠和藍珠按 2 份對 3 份分，共 30 粒。藍珠有幾粒？', options: ['12', '6', '18'], answer: '18', hint: '30÷(2＋3)＝6。', why: { 12: '12 是紅珠的粒數，題目問藍珠。', 6: '6 是一份的數目，藍珠有 3 份。' } } },
      { t: 'card' }
    ],
    gens: g62, verify: verify62
  });

  /* ---- p6-3 工程問題 ---------------------------------------------------------------------------------------------------- */
  const art63 = '<svg viewBox="0 0 120 80"><rect x="10" y="10" width="100" height="14" rx="3" fill="none" stroke="#c3cbf7" stroke-width="1.6"/><rect x="10" y="10" width="66" height="14" rx="3" fill="#3ee6d0" fill-opacity=".5"/><rect x="10" y="30" width="100" height="14" rx="3" fill="none" stroke="#c3cbf7" stroke-width="1.6"/><rect x="10" y="30" width="33" height="14" rx="3" fill="#ffc94a" fill-opacity=".5"/><rect x="10" y="52" width="100" height="22" rx="11" fill="#ff8fc7"/><text x="60" y="63" text-anchor="middle" dominant-baseline="central" font-size="11" font-weight="900" fill="#0b1030">全部看成 1</text></svg>';
  const PAIRS = [[3, 6, 2], [4, 12, 3], [6, 12, 4], [4, 4, 2], [6, 6, 3], [12, 12, 6], [2, 2, 1], [12, 6, 4], [12, 4, 3], [6, 3, 2]];
  const lcm = (a, b) => a / gcd(a, b) * b;
  const g63 = {
    A: [
      (r, p) => {
        const [a, b, t] = pick(r, PAIRS), w = pick(r, ['獨做', '單獨做']);
        return O('work', `甲${w} ${a} 日完成，乙${w} ${b} 日完成。兩人合做，幾日完成？`, t, '把全部工作看成幾份。', `全部看成 ${lcm(a, b)} 份：甲每日做 ${lcm(a, b) / a} 份，乙每日做 ${lcm(a, b) / b} 份，合共 ${lcm(a, b) / a + lcm(a, b) / b} 份；${lcm(a, b)}÷${lcm(a, b) / a + lcm(a, b) / b}＝${t} 日。`,
          [a + b, Math.max(a, b), Math.min(a, b), t + 1], `${a}*${b}/(${a}+${b})`, [], { svg: workSvg(a, b, ['甲', '乙']), why: { [a + b]: '日數不能直接相加，要先求每日各做多少。', [Math.max(a, b)]: '合做一定比單獨做快，日數比較少。' } });
      },
      (r, p) => {
        const [a, b, t] = pick(r, PAIRS);
        return O('work-pipe', `水池有甲、乙兩根水管。單開甲管 ${a} 小時注滿，單開乙管 ${b} 小時注滿。兩管齊開，幾小時注滿？`, t, '把整池水看成幾份。', `整池看成 ${lcm(a, b)} 份：甲管每小時注 ${lcm(a, b) / a} 份，乙管注 ${lcm(a, b) / b} 份，合共 ${lcm(a, b) / a + lcm(a, b) / b} 份；${lcm(a, b)}÷${lcm(a, b) / a + lcm(a, b) / b}＝${t} 小時。`,
          [a + b, Math.max(a, b), Math.min(a, b), t + 1], `${a}*${b}/(${a}+${b})`, [], { svg: workSvg(a, b, ['甲管', '乙管']), why: { [a + b]: '時間不能直接相加，要先求每小時各注多少。', [Math.min(a, b)]: '兩管齊開，一定比最快的一根還要快。' } });
      },
      (r, p) => {
        const a = ri(r, 3, 12), d = ri(r, 2, a - 1), s = frac(d, a);
        return O('work-part', `一項工程，甲獨做 ${a} 日完成。甲做了 ${d} 日，完成了全部的幾分之幾？`, s, '甲每日做全部的幾分之一？', `甲每日做 1/${a}，做了 ${d} 日：${d}×1/${a}＝${s}。`,
          [`1/${a}`, frac(a - d, a), frac(d, a + 1), frac(a, d)], '', [], { form: 'simplest', svg: workSvg(a, d, ['全部', '做了']).replace('每一格是 1 日的工作', '每一格是 1 日的工作'), why: { [`1/${a}`]: '這是一日做的，做了好幾日，要乘日數。', [frac(a - d, a)]: '這是還沒有做的部分，題目問做了的。' } });
      }
    ],
    B: [
      (r, p) => {
        for (let i = 0; i < 100; i++) {
          const [a, b] = pick(r, PAIRS), d = ri(r, 1, 3), left = b * (1 - d * (1 / a + 1 / b)), L = Math.round(left);
          if (Math.abs(left - L) < 1e-9 && L > 0 && L <= 12) return O('work-leave', `甲獨做 ${a} 日，乙獨做 ${b} 日。兩人合做 ${d} 日後甲離開，乙再做幾日完成？`, L, '先求合做 ' + d + ' 日完成了多少。', `全部看成 ${lcm(a, b)} 份：合做每日 ${lcm(a, b) / a + lcm(a, b) / b} 份，${d} 日做了 ${d * (lcm(a, b) / a + lcm(a, b) / b)} 份，餘下 ${lcm(a, b) - d * (lcm(a, b) / a + lcm(a, b) / b)} 份；乙每日 ${lcm(a, b) / b} 份，要 ${L} 日。`,
            [b - d, L + 1, d, b], '', [], { svg: workSvg(a, b, ['甲', '乙']), why: { [b - d]: '乙不是全程單獨做，合做時甲也做了一部分。', [b]: '乙合做那幾日也做了工作，不用整個 ' + b + ' 日。' } });
        }
        return O('work-leave', '甲獨做 6 日，乙獨做 12 日。兩人合做 2 日後甲離開，乙再做幾日完成？', 6, '先求合做 2 日完成了多少。', '合做 2 日完成 1/2，餘下 1/2，乙每日 1/12，要 6 日。', [4, 8, 2, 12], '', [], { svg: workSvg(6, 12, ['甲', '乙']), why: { 4: '乙不是全程單獨做，合做時甲也做了一部分。', 12: '乙合做那幾日也做了工作。' } });
      },
      (r, p) => {
        const [a, b, t] = pick(r, PAIRS.filter(x => x[0] !== x[1] || x[0] > 2));
        return O('work-find', `甲獨做 ${a} 日完成。甲乙合做 ${t} 日完成。乙獨做幾日完成？`, b, '先求乙每日做多少。', `合做每日 1/${t}，甲每日 1/${a}，乙每日 1/${t}－1/${a}＝${frac(a - t, a * t)}，乙獨做要 ${b} 日。`,
          [t, a + t, a - t, a * t], '', [], { svg: workSvg(a, t, ['甲', '合做']), why: { [t]: `${t} 日是合做的日數，乙獨做要比合做慢。`, [a - t]: `日數不能直接相減，要看每日做多少。` } });
      },
      (r, p) => {
        for (let i = 0; i < 200; i++) {
          const [a, b, t] = pick(r, PAIRS.filter(x => x[0] > 2)), d = ri(r, 1, a - 1), days = (a - d) * t / a;
          if (Number.isInteger(days) && days >= 1) return O('work-head', `甲獨做 ${a} 日完成，乙獨做 ${b} 日完成。甲先獨做 ${d} 日，乙才加入合做，再做幾日完成？`, days, `先求甲做了 ${d} 日，餘下多少。`, `全部看成 ${lcm(a, b)} 份：甲每日 ${lcm(a, b) / a} 份，先做 ${d} 日共 ${d * lcm(a, b) / a} 份，餘下 ${lcm(a, b) - d * lcm(a, b) / a} 份；合做每日 ${lcm(a, b) / a + lcm(a, b) / b} 份，${lcm(a, b) - d * lcm(a, b) / a}÷${lcm(a, b) / a + lcm(a, b) / b}＝${days} 日。`,
            [d, t, days + 1, a - d], '', [], { svg: workSvg(a, b, ['甲', '乙']), why: { [t]: `${t} 日是由頭合做的日數，甲先做了一部分，合做會少些。`, [a - d]: `${a - d} 是甲餘下的日數，乙加入後兩人合做更快。` } });
        }
        return O('work-head', '甲獨做 6 日完成，乙獨做 12 日完成。甲先獨做 3 日，乙才加入合做，再做幾日完成？', 2, '', '甲做 3 日完成 1/2，餘下 1/2，合做每日 1/4，要 2 日。', [3, 4, 1, 6], '', [], { svg: workSvg(6, 12, ['甲', '乙']), why: { 4: '甲先做了一部分，合做會少些。', 3: '這是甲先做的日數。' } });
      }
    ]
  };
  const verify63 = q => {
    let m;
    const F = (n, d) => [n, d];
    if ((m = /^甲(?:單獨|獨)做 (\d+) 日完成，乙(?:單獨|獨)做 (\d+) 日完成。兩人合做/.exec(q.q)) || (m = /^水池有甲、乙兩根水管。單開甲管 (\d+) 小時注滿，單開乙管 (\d+) 小時注滿/.exec(q.q))) {
      const a = +m[1], b = +m[2]; for (let t = 1; t <= 400; t++) if (t / a + t / b >= 1 - 1e-12) return String(t); return 'none';
    }
    if ((m = /^一項工程，甲獨做 (\d+) 日完成。甲做了 (\d+) 日/.exec(q.q))) return frac(+m[2], +m[1]);
    if ((m = /^甲獨做 (\d+) 日，乙獨做 (\d+) 日。兩人合做 (\d+) 日後甲離開/.exec(q.q))) {
      const a = +m[1], b = +m[2], d = +m[3]; for (let t = 1; t <= 400; t++) if (Math.abs(d / a + d / b + t / b - 1) < 1e-9) return String(t); return 'none';
    }
    if ((m = /^甲獨做 (\d+) 日完成。甲乙合做 (\d+) 日完成。乙獨做/.exec(q.q))) {
      const a = +m[1], t = +m[2]; for (let b = 1; b <= 400; b++) if (Math.abs(t / a + t / b - 1) < 1e-9) return String(b); return 'none';
    }
    if ((m = /^甲獨做 (\d+) 日完成，乙獨做 (\d+) 日完成。甲先獨做 (\d+) 日，乙才加入/.exec(q.q))) {
      const a = +m[1], b = +m[2], d = +m[3]; for (let t = 1; t <= 400; t++) if (Math.abs(d / a + t / a + t / b - 1) < 1e-9) return String(t); return 'none';
    }
    return null;
  };
  WQOly.register({
    id: 'p6-3', grade: 6, n: 3, title: '工程問題', icon: '🏗️',
    card: { motto: '把全部看成 1', example: '甲 3 日、乙 6 日：合做 2 日', art: art63 },
    lesson: [
      { t: 'show', say: '甲獨做 3 日，乙獨做 6 日。合做幾日？', scene: { w: 'bars', p: { rows: [{ label: '全部', segs: [{ u: 6, c: 't', text: '全部 ＝ 1' }] }, { label: '甲', segs: [{ u: 2, c: 'a', rep: 3, text: '3 日' }] }, { label: '乙', segs: [{ u: 1, c: 'b', rep: 6, text: '6 日' }] }] }, still: true } },
      { t: 'show', say: '把全部看成 6 份。', scene: { w: 'bars', p: { rows: [{ label: '全部', segs: [{ u: 6, c: 't', text: '6 份' }] }, { label: '甲', segs: [{ u: 2, c: 'a', text: '2 份' }] }, { label: '乙', segs: [{ u: 1, c: 'b', text: '1 份' }] }] }, still: true } },
      { t: 'predict', say: '甲每日做 2 份，乙每日做 1 份。', ask: '兩人合做，每日做幾份？', options: ['2', '3', '6'], answer: '3', scene: { w: 'bars', p: { rows: [{ label: '甲', segs: [{ u: 2, c: 'a', text: '2 份' }] }, { label: '乙', segs: [{ u: 1, c: 'b', text: '1 份' }] }, { label: '合做', segs: [{ u: 3, c: 't', text: '？' }] }] }, still: true }, reveal: '2＋1＝3 份。兩人每日做 3 份。' },
      { t: 'do', say: '每一格是 1 日。拉出合做的日數，剛好 6 份。', scene: { w: 'bars', p: { rows: [{ label: '全部', segs: [{ u: 6, c: 't', text: '全部 6 份' }, { u: 3, c: 'd', dashed: true, text: '' }] }, { label: '合做', segs: [{ u: 3, c: 'a', rep: 1, edit: true, target: 2, min: 1, max: 3, text: '合做' }] }] } } },
      { t: 'show', say: '全部 6 份，每日 3 份。6÷3＝2 日。', scene: { w: 'bars', p: { rows: [{ label: '全部', segs: [{ u: 6, c: 't', text: '6 份' }] }, { label: '合做', segs: [{ u: 3, c: 'a', rep: 2, text: '2 日' }] }] }, still: true } },
      { t: 'do', say: '再試一次：甲 4 日、乙 12 日。全部看成 12 份。', scene: { w: 'bars', p: { rows: [{ label: '全部', segs: [{ u: 12, c: 't', text: '全部 12 份' }, { u: 4, c: 'd', dashed: true, text: '' }] }, { label: '合做', segs: [{ u: 4, c: 'a', rep: 1, edit: true, target: 3, min: 1, max: 4, text: '合做' }] }] } } },
      { t: 'try', say: '先看每日各做多少份。', scene: { w: 'bars', p: { rows: [{ label: '全部', segs: [{ u: 6, c: 't', text: '6 份' }] }, { label: '甲', segs: [{ u: 1, c: 'a', rep: 6, text: '6 日' }] }, { label: '乙', segs: [{ u: 2, c: 'b', rep: 3, text: '3 日' }] }] }, still: true },
        q: { stem: '甲獨做 6 日完成，乙獨做 3 日完成。兩人合做，幾日完成？', options: ['2', '4', '9'], answer: '2', hint: '全部看成 6 份：甲每日 1 份，乙每日 2 份。', why: { 9: '日數不能直接相加，要看每日各做多少。', 4: '合做每日 3 份，6÷3 才是日數。' } } },
      { t: 'card' }
    ],
    gens: g63, verify: verify63
  });

  /* ---- p6-4 相遇與追及 (first card teaches speed) ---------------------------------------------------------------------- */
  const art64 = '<svg viewBox="0 0 120 80"><circle cx="20" cy="30" r="9" fill="#3ee6d0"/><circle cx="100" cy="30" r="9" fill="#ffc94a"/><path d="M32 30h24m-5 -5l5 5l-5 5M88 30h-24m5 -5l-5 5l5 5" stroke="#c3cbf7" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><rect x="10" y="50" width="100" height="22" rx="11" fill="#ff8fc7"/><text x="60" y="61" text-anchor="middle" dominant-baseline="central" font-size="11" font-weight="900" fill="#0b1030">路程÷速度和</text></svg>';
  const sp = (r, p, lo, hi) => 5 * N(r, p, lo / 5, hi / 5);
  const g64 = {
    A: [
      (r, p) => {
        const a = sp(r, p, 30, 60), b = sp(r, p, 20, 40), t = ri(r, 2, 6), D = (a + b) * t;
        return O('meet', `甲乙相距 ${D} 米，甲每分走 ${a} 米，乙每分走 ${b} 米，面對面走，幾分鐘相遇？`, t, '兩人每分共走多少米？', `每分共走 ${a}＋${b}＝${a + b} 米；${D}÷${a + b}＝${t} 分鐘。`,
          [t + 1, t - 1 || 3, Math.floor(D / a), a + b], `${D}/(${a}+${b})`, [], { svg: road('meet', D + ' 米', a, b), why: { [a + b]: `${a + b} 是每分共走的米數，要用路程除以它。`, [Math.floor(D / a)]: '兩人一起走，不是只有甲一個人走。' } });
      },
      (r, p) => {
        const a = sp(r, p, 30, 60), b = sp(r, p, 20, 40), t = ri(r, 2, 6);
        return O('meet-dist', `甲每分走 ${a} 米，乙每分走 ${b} 米，兩人從兩地面對面走，${t} 分鐘後相遇。兩地相距幾米？`, (a + b) * t, '先求每分共走多少米。', `每分共走 ${a}＋${b}＝${a + b} 米；${a + b}×${t}＝${(a + b) * t} 米。`,
          [a + b, a * t, b * t, (a + b) * t + a], `(${a}+${b})*${t}`, [], { svg: road('meet', '？ 米', a, b), why: { [a + b]: `${a + b} 是每分共走的米數，還要乘 ${t} 分鐘。`, [a * t]: `${a * t} 只是甲走的路，還要加上乙走的。` } });
      },
      (r, p) => {
        const a = sp(r, p, 30, 60), b = sp(r, p, 20, 40), t = ri(r, 2, 6), D = (a + b) * t;
        return O('meet-speed', `兩地相距 ${D} 米，甲乙面對面走，${t} 分鐘後相遇。甲每分走 ${a} 米，乙每分走幾米？`, b, '先求兩人每分共走多少米。', `每分共走 ${D}÷${t}＝${a + b} 米；乙每分 ${a + b}－${a}＝${b} 米。`,
          [a + b, D / t - 2 * a > 0 ? D / t - 2 * a : b + 5, a, D / a | 0], `${D}/${t}-${a}`, [], { svg: road('meet', D + ' 米', a, '？'), why: { [a + b]: `${a + b} 是兩人每分共走的米數，還要減去甲的。`, [a]: `${a} 是甲的速度，題目問乙。` } });
      }
    ],
    B: [
      (r, p) => {
        const b = sp(r, p, 30, 60), a = b + 5 * ri(r, 1, 6), t = ri(r, 2, 8), D = (a - b) * t;
        return O('chase', `乙在甲前面 ${D} 米，甲每分走 ${a} 米，乙每分走 ${b} 米，同向而行，甲幾分鐘追上乙？`, t, '甲每分比乙多走多少米？', `每分追近 ${a}－${b}＝${a - b} 米；${D}÷${a - b}＝${t} 分鐘。`,
          [t + 1, Math.floor(D / a), a - b, t * 2], `${D}/(${a}-${b})`, [], { svg: road('chase', D + ' 米', a, b), why: { [a - b]: `${a - b} 是每分追近的米數，還要用路程除以它。`, [Math.floor(D / a)]: '乙也在走，不是甲一個人走完這段路。' } });
      },
      (r, p) => {
        let a, b, m, g;
        for (let i = 0; i < 300; i++) { b = 5 * ri(r, 4, 12); a = b + 5 * ri(r, 1, 6); g = a - b; const need = g / gcd(b, g); m = need * ri(r, 1, 3); if (m >= 2 && m <= 8 && b * m <= 600) break; }
        if (!(m >= 2)) { a = 60; b = 40; m = 4; g = 20; }
        const D = b * m, t = D / g;
        return O('chase-start', `乙先走 ${m} 分鐘，甲才出發追。乙每分走 ${b} 米，甲每分走 ${a} 米。甲走幾分鐘追上乙？`, t, `先求甲出發時，乙已走了多遠。`, `乙先走 ${b}×${m}＝${D} 米；甲每分追近 ${a}－${b}＝${g} 米；${D}÷${g}＝${t} 分鐘。`,
          [m, D, g, t + m], `${b}*${m}/(${a}-${b})`, [], { svg: road('chase', '先走 ' + D + ' 米', a, b), why: { [D]: `${D} 米是乙先走的路，還要除以每分追近的米數。`, [t + m]: '題目問甲走了幾分鐘，不用加上乙先走的時間。' } });
      },
      (r, p) => {
        const b = sp(r, p, 30, 60), a = b + 5 * ri(r, 1, 6), t = ri(r, 2, 8);
        return O('chase-dist', `甲在乙後面，甲每分走 ${a} 米，乙每分走 ${b} 米，同向而行，${t} 分鐘後追上。開始時兩人相距幾米？`, (a - b) * t, '甲每分追近多少米？', `每分追近 ${a}－${b}＝${a - b} 米；${a - b}×${t}＝${(a - b) * t} 米。`,
          [a - b, a * t, (a + b) * t, b * t], `(${a}-${b})*${t}`, [], { svg: road('chase', '？ 米', a, b), why: { [a - b]: `${a - b} 是每分追近的米數，還要乘 ${t} 分鐘。`, [(a + b) * t]: '同向而行，要用速度差，不是速度和。' } });
      },
      (r, p) => {
        let a, b, t, ans;
        for (let i = 0; i < 300; i++) { a = sp(r, p, 30, 60); b = sp(r, p, 20, 40); t = ri(r, 2, 6); if ((b * t) % a === 0 && b * t / a >= 1 && a !== b) break; }
        if ((b * t) % a !== 0) { a = 60; b = 40; t = 3; }
        ans = b * t / a;
        return O('meet-after', `甲乙面對面走，${t} 分鐘後相遇。甲每分走 ${a} 米，乙每分走 ${b} 米。相遇後，甲再走幾分鐘到乙出發的地方？`, ans, '乙走過的路，甲還沒有走。', `乙走了 ${b}×${t}＝${b * t} 米，這是甲還要走的路；${b * t}÷${a}＝${ans} 分鐘。`,
          [t, b * t, (a + b) * t / a | 0, ans + 1], `${b}*${t}/${a}`, [], { svg: road('meet', '相遇後', a, b), why: { [t]: `${t} 分鐘是相遇前走的時間，相遇後甲要走乙走過的路。`, [b * t]: `${b * t} 米是路程，還要除以甲的速度。` } });
      }
    ]
  };
  const verify64 = q => {
    let m;
    if ((m = /^甲乙相距 (\d+) 米，甲每分走 (\d+) 米，乙每分走 (\d+) 米，面對面走/.exec(q.q))) { for (let t = 1; t <= 500; t++) if (t * (+m[2]) + t * (+m[3]) === +m[1]) return String(t); return 'none'; }
    if ((m = /^甲每分走 (\d+) 米，乙每分走 (\d+) 米，兩人從兩地面對面走，(\d+) 分鐘後相遇/.exec(q.q))) { let d = 0; for (let i = 0; i < +m[3]; i++) d += +m[1] + +m[2]; return String(d); }
    if ((m = /^兩地相距 (\d+) 米，甲乙面對面走，(\d+) 分鐘後相遇。甲每分走 (\d+) 米/.exec(q.q))) { for (let b = 1; b <= 300; b++) if ((+m[3] + b) * +m[2] === +m[1]) return String(b); return 'none'; }
    if ((m = /^乙在甲前面 (\d+) 米，甲每分走 (\d+) 米，乙每分走 (\d+) 米，同向/.exec(q.q))) { for (let t = 1; t <= 500; t++) if (t * (+m[2]) - t * (+m[3]) === +m[1]) return String(t); return 'none'; }
    if ((m = /^乙先走 (\d+) 分鐘，甲才出發追。乙每分走 (\d+) 米，甲每分走 (\d+) 米/.exec(q.q))) { for (let t = 1; t <= 500; t++) if (t * (+m[3]) === (t + +m[1]) * (+m[2])) return String(t); return 'none'; }
    if ((m = /^甲在乙後面，甲每分走 (\d+) 米，乙每分走 (\d+) 米，同向而行，(\d+) 分鐘後追上/.exec(q.q))) { for (let D = 1; D <= 5000; D++) if (D + (+m[3]) * (+m[2]) === (+m[3]) * (+m[1])) return String(D); return 'none'; }
    if ((m = /^甲乙面對面走，(\d+) 分鐘後相遇。甲每分走 (\d+) 米，乙每分走 (\d+) 米。相遇後/.exec(q.q))) { const rest = +m[3] * +m[1]; for (let t = 1; t <= 500; t++) if (t * (+m[2]) === rest) return String(t); return 'none'; }
    return null;
  };
  WQOly.register({
    id: 'p6-4', grade: 6, n: 4, title: '相遇與追及', icon: '🏃',
    card: { motto: '速度和、速度差', example: '相遇：路程÷速度和', art: art64 },
    lesson: [
      { t: 'show', say: '速度＝路程÷時間。每分走 60 米，5 分走 300 米。', scene: { w: 'bars', p: { rows: [{ label: '路程', segs: [{ u: 30, c: 't', text: '300 米' }] }, { label: '每分', segs: [{ u: 6, c: 'a', rep: 5, text: '60 米 × 5 分' }] }] }, still: true } },
      { t: 'do', say: '每一格是 1 分鐘，走 60 米。拉到走完 300 米。', scene: { w: 'bars', p: { rows: [{ label: '路程', segs: [{ u: 30, c: 't', text: '300 米' }, { u: 6, c: 'd', dashed: true, text: '' }] }, { label: '每分', segs: [{ u: 6, c: 'a', rep: 1, edit: true, target: 5, min: 1, max: 6, text: '每分 60 米' }] }] } } },
      { t: 'predict', say: '相距 300 米，面對面走。甲每分 60 米，乙每分 40 米。', ask: '兩人每分共走多少米？', options: ['20', '60', '100'], answer: '100', scene: { w: 'bars', p: { rows: [{ label: '路程', segs: [{ u: 15, c: 't', text: '300 米' }] }, { label: '甲', segs: [{ u: 3, c: 'a', rep: 3, text: '3 分' }] }, { label: '乙', segs: [{ u: 9, c: 'b', rep: 1, dashed: true, text: '' }, { u: 2, c: 'b', rep: 3, text: '3 分' }] }] }, still: true }, reveal: '60＋40＝100 米。兩人每分共走 100 米。' },
      { t: 'do', say: '兩人每分共走 100 米。拉到剛好走完 300 米。', scene: { w: 'bars', p: { rows: [{ label: '路程', segs: [{ u: 15, c: 't', text: '300 米' }, { u: 5, c: 'd', dashed: true, text: '' }] }, { label: '共走', segs: [{ u: 5, c: 'g', rep: 1, edit: true, target: 3, min: 1, max: 4, text: '每分 100 米' }] }] } } },
      { t: 'show', say: '相遇：路程÷速度和。300÷100＝3 分鐘。', scene: { w: 'bars', p: { rows: [{ label: '路程', segs: [{ u: 15, c: 't', text: '300 米' }] }, { label: '甲', segs: [{ u: 3, c: 'a', rep: 3, text: '3 分' }] }, { label: '乙', segs: [{ u: 9, c: 'b', rep: 1, dashed: true, text: '' }, { u: 2, c: 'b', rep: 3, text: '3 分' }] }] }, still: true } },
      { t: 'predict', say: '乙在甲前面，同向而行。甲每分 60 米，乙每分 40 米。', ask: '甲每分追近乙多少米？', options: ['20', '100', '60'], answer: '20', scene: { w: 'bars', p: { rows: [{ label: '甲', segs: [{ u: 3, c: 'a', text: '60' }] }, { label: '乙', segs: [{ u: 2, c: 'b', text: '40' }, { u: 1, c: 'd', text: '20' }] }] }, still: true }, reveal: '60－40＝20 米。追及：路程÷速度差。' },
      { t: 'try', say: '相遇，用速度和。', scene: { w: 'bars', p: { rows: [{ label: '路程', segs: [{ u: 20, c: 't', text: '400 米' }] }, { label: '共走', segs: [{ u: 5, c: 'g', rep: 4, text: '每分 100 米' }] }] }, still: true },
        q: { stem: '甲乙相距 400 米，面對面走。甲每分走 70 米，乙每分走 30 米，幾分鐘相遇？', options: ['4', '100', '6'], answer: '4', hint: '每分共走 70＋30＝100 米。', why: { 100: '100 是每分共走的米數，要用 400 去除。', 6: '6 不是 400 除以速度和。' } } },
      { t: 'card' }
    ],
    gens: g64, verify: verify64
  });

  /* ---- p6-5 立體與展開圖 -------------------------------------------------------------------------------------------------- */
  const art65 = '<svg viewBox="0 0 120 80"><polygon points="60,6 92,22 60,38 28,22" fill="#ffd877" stroke="#0b1030" stroke-width="1.5"/><polygon points="28,22 60,38 60,70 28,54" fill="#e3a92b" stroke="#0b1030" stroke-width="1.5"/><polygon points="92,22 60,38 60,70 92,54" fill="#b97f10" stroke="#0b1030" stroke-width="1.5"/><circle cx="60" cy="40" r="7" fill="#ff8fc7"/></svg>';
  const IT = ['積木', '木塊', '魔方'];
  /* the net: a belt of 4 squares in a row, one square above and one below. Fold it by rolling a cube over the squares (independent of the formula used by the generator) */
  const foldOpp = (belt, ti, top, bi, bot) => {
    const cells = [], at = new Map();
    belt.forEach((v, i) => { cells.push({ x: i, y: 0, v }); }); cells.push({ x: ti, y: -1, v: top }); cells.push({ x: bi, y: 1, v: bot });
    cells.forEach(c => at.set(c.x + ',' + c.y, c));
    const face = {}, seen = new Set(), roll = (o2, dx, dy) => { const [B, T, Nn, S, E, Wf] = o2; if (dx === 1) return [E, Wf, Nn, S, T, B]; if (dx === -1) return [Wf, E, Nn, S, B, T]; if (dy === -1) return [Nn, S, T, B, E, Wf]; return [S, Nn, B, T, E, Wf]; };
    const q = [{ c: cells[0], o: ['B', 'T', 'N', 'S', 'E', 'W'] }]; seen.add('0,0'); face[cells[0].v] = 'B';
    while (q.length) {
      const { c, o: oo } = q.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, -1], [0, 1]]) { const k = (c.x + dx) + ',' + (c.y + dy), nx = at.get(k); if (!nx || seen.has(k)) continue; seen.add(k); const no = roll(oo, dx, dy); face[nx.v] = no[0]; q.push({ c: nx, o: no }); }
    }
    const opp = { B: 'T', T: 'B', N: 'S', S: 'N', E: 'W', W: 'E' }, res = {}; for (const v in face) for (const w in face) if (face[w] === opp[face[v]]) res[v] = +w;
    return res;
  };
  const makeNet = r => { const nums = shuffle(r, [1, 2, 3, 4, 5, 6]), belt = nums.slice(0, 4), ti = ri(r, 0, 3), bi = ri(r, 0, 3); return { belt, ti, bi, top: nums[4], bot: nums[5] }; };
  const netText = n => `展開圖橫排四格 ${n.belt.join('、')}，${n.top} 在 ${n.belt[n.ti]} 上面，${n.bot} 在 ${n.belt[n.bi]} 下面。`;
  const g65 = {
    A: [
      (r, p) => {
        const n = pick(r, [3, 4]), k = pick(r, [['一面', 1], ['兩面', 2], ['三面', 3], ['沒有']]), it = pick(r, IT), c = { 1: 6 * (n - 2) ** 2, 2: 12 * (n - 2), 3: 8 }, s = k[1] ? c[k[1]] : (n - 2) ** 3;
        return O('cube', `把 ${n}×${n}×${n} 的${it}外面全部塗色，再切成 ${n ** 3} 個小正方體。${k[1] ? `${k[0]}有色的` : '沒有塗色的'}有幾個？`, s, '想想它們在大正方體的哪個位置。',
          `${k[1] === 3 ? '三面有色的在 8 個角。' : k[1] === 2 ? `兩面有色的在 12 條邊，每條 ${n - 2} 個：12×${n - 2}。` : k[1] === 1 ? `一面有色的在 6 個面的中間，每面 ${n - 2}×${n - 2} 個。` : `沒有塗色的在最中間，${n - 2}×${n - 2}×${n - 2} 個。`}答案 ${s}。`,
          [8, 12, 6 * (n - 2) ** 2, 12 * (n - 2), (n - 2) ** 3, n ** 3].filter(x => x !== s), '', [], { svg: iso(n), why: { 8: '8 是三面有色的角塊。', 12: n === 3 ? '12 是 3×3×3 兩面有色的邊塊。' : '12 是 12 條邊的條數，每條還有 ' + (n - 2) + ' 個。', [n ** 3]: `${n ** 3} 是全部的小正方體，題目問其中一類。` } });
      },
      (r, p) => {
        const n = (b0 => b0)(pick(r, [1, 2, 3])), nt = makeNet(r), q = pick(r, [...nt.belt, nt.top, nt.bot]), opp = foldOpp(nt.belt, nt.ti, nt.top, nt.bi, nt.bot);
        const pos = nt.belt.indexOf(q), ans = pos >= 0 ? nt.belt[(pos + 2) % 4] : q === nt.top ? nt.bot : nt.top;
        return O('net-opp', `${netText(nt)}摺成正方體，${q} 的對面是幾？`, ans, '橫排四格會圍成一圈，對面隔一格。',
          pos >= 0 ? `橫排四格圍成一圈，${q} 的對面隔一格：${ans}。` : `上面和下面兩格是正方體的上蓋和底，互相對面：${ans}。`,
          [nt.belt[(pos + 1 + 4) % 4] || nt.top, nt.belt[(pos + 3) % 4] || nt.bot, nt.top === q ? nt.belt[0] : nt.top, q + 1 > 6 ? 1 : q + 1].filter(x => x !== ans),
          '', [], { svg: netSvg(nt.belt, nt.ti, nt.top, nt.bi, nt.bot, q), why: { [pos >= 0 ? nt.belt[(pos + 1) % 4] : nt.belt[0]]: pos >= 0 ? `${nt.belt[(pos + 1) % 4]} 在 ${q} 旁邊，是鄰面，不是對面。` : `${nt.belt[0]} 在側面，不是上下對面。`, [pos >= 0 ? nt.belt[(pos + 3) % 4] : nt.belt[1]]: pos >= 0 ? `${nt.belt[(pos + 3) % 4]} 也在 ${q} 旁邊，是鄰面。` : `${nt.belt[1]} 在側面，不是上下對面。` } });
      }
    ],
    B: [
      (r, p) => {
        const n = pick(r, [3, 4]), it = pick(r, IT), j = ri(r, 0, 2), tot = n ** 3 - (n - 2) ** 3, c = { 0: tot, 1: 6 * (n - 2) ** 2 + 12 * (n - 2), 2: 12 * (n - 2) + 8 };
        const txt = ['至少一面有色的', '一面或兩面有色的', '兩面或三面有色的'][j];
        return O('cube2', `把 ${n}×${n}×${n} 的${it}外面全部塗色，再切成 ${n ** 3} 個小正方體。${txt}有幾個？`, c[j], '分開數每一種，再加起來。',
          j === 0 ? `全部 ${n ** 3} 個，沒有塗色的 ${(n - 2) ** 3} 個：${n ** 3}－${(n - 2) ** 3}＝${tot}。` : j === 1 ? `一面 6×${(n - 2) ** 2}＝${6 * (n - 2) ** 2}，兩面 12×${n - 2}＝${12 * (n - 2)}，加起來 ${c[1]}。` : `兩面 12×${n - 2}＝${12 * (n - 2)}，三面 8，加起來 ${c[2]}。`,
          [6 * (n - 2) ** 2, 12 * (n - 2), 8, n ** 3, c[j] + 8, c[j] - 6].filter(x => x !== c[j]), '', [], { svg: iso(n), why: { [n ** 3]: `${n ** 3} 是全部的小正方體，要減去不合條件的。`, [j === 0 ? (n - 2) ** 3 : 8]: j === 0 ? '這是沒有塗色的，題目問有塗色的。' : '8 只是三面有色的，題目問兩類。' } });
      },
      (r, p) => {
        const n = pick(r, [2, 3, 4]), it = pick(r, IT);
        return O('cube-faces', `把 ${n}×${n}×${n} 的${it}外面全部塗色，再切成 ${n ** 3} 個小正方體。所有小正方體上，塗了色的面共有幾個？`, 6 * n * n, '大正方體的外面一共有幾個小方格？', `大正方體有 6 個面，每面 ${n}×${n}＝${n * n} 個小方格：6×${n * n}＝${6 * n * n}。`,
          [n ** 3, 6 * n, 3 * n * n, 8 * 3 + 12 * (n - 2) * 2], `6*${n}*${n}`, [], { svg: iso(n), why: { [n ** 3]: '這是小正方體的個數，題目問塗了色的面。', [6 * n]: `每個面有 ${n}×${n} 個小方格，不是 ${n} 個。` } });
      },
      (r, p) => {
        const nt = makeNet(r), pr = shuffle(r, [...nt.belt, nt.top, nt.bot]).slice(0, 2), opp = foldOpp(nt.belt, nt.ti, nt.top, nt.bi, nt.bot), ans = opp[pr[0]] + opp[pr[1]];
        return O('net-sum', `${netText(nt)}摺成正方體，${pr[0]} 和 ${pr[1]} 的對面，兩數加起來是多少？`, ans, '先分別找出兩個數的對面。', `${pr[0]} 的對面是 ${opp[pr[0]]}，${pr[1]} 的對面是 ${opp[pr[1]]}。${opp[pr[0]]}＋${opp[pr[1]]}＝${ans}。`,
          [pr[0] + pr[1], opp[pr[0]], opp[pr[1]], ans + 1], '', [], { svg: netSvg(nt.belt, nt.ti, nt.top, nt.bi, nt.bot, 0), why: { [pr[0] + pr[1]]: `${pr[0]}＋${pr[1]} 是原來兩個數的和，題目要的是它們的對面。`, [opp[pr[0]]]: `${opp[pr[0]]} 只是 ${pr[0]} 的對面，還要加上另一個。` } });
      }
    ]
  };
  const verify65 = q => {
    let m;
    if ((m = /^把 (\d)×\d×\d 的.+切成 \d+ 個小正方體。(.+)有幾個/.exec(q.q))) {
      const n = +m[1]; const f = { '一面有色的': 6 * (n - 2) ** 2, '兩面有色的': 12 * (n - 2), '三面有色的': 8, '沒有塗色的': (n - 2) ** 3, '至少一面有色的': n ** 3 - (n - 2) ** 3, '一面或兩面有色的': 6 * (n - 2) ** 2 + 12 * (n - 2), '兩面或三面有色的': 12 * (n - 2) + 8 }[m[2]];
      if (f != null) return String(f);
    }
    if ((m = /^把 (\d)×\d×\d 的.+切成 \d+ 個小正方體。所有小正方體上，塗了色的面共有幾個？/.exec(q.q))) {
      const n = +m[1]; let faces = 0; for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) for (let z = 0; z < n; z++) for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) { const X = x + dx, Y = y + dy, Z = z + dz; if (X < 0 || Y < 0 || Z < 0 || X >= n || Y >= n || Z >= n) faces++; } return String(faces);
    }
    if ((m = /^展開圖橫排四格 (\d)、(\d)、(\d)、(\d)，(\d) 在 (\d) 上面，(\d) 在 (\d) 下面。摺成正方體，(.+)$/.exec(q.q))) {
      const belt = [+m[1], +m[2], +m[3], +m[4]], top = +m[5], bot = +m[7], ti = belt.indexOf(+m[6]), bi = belt.indexOf(+m[8]), opp = foldOpp(belt, ti, top, bi, bot), tail = m[9];
      let t;
      if ((t = /^(\d) 的對面是幾？$/.exec(tail))) return String(opp[+t[1]]);
      if ((t = /^(\d) 和 (\d) 的對面，兩數加起來是多少？$/.exec(tail))) return String(opp[+t[1]] + opp[+t[2]]);
    }
    return null;
  };
  WQOly.register({
    id: 'p6-5', grade: 6, n: 5, title: '立體與展開圖', icon: '🧊',
    card: { motto: '摺起來想', example: '3×3×3：1 個在最中間', art: art65 },
    lesson: [
      { t: 'show', say: '3×3×3 積木外面塗色，切成 27 塊。', scene: { w: 'bars', p: { rows: [{ label: '全部', segs: [{ u: 27, c: 't', text: '27 塊' }] }] }, still: true } },
      { t: 'predict', say: '正方體有 8 個角。', ask: '三面有色的小塊在哪裏？', options: ['8 個角', '12 條邊', '6 個面'], answer: '8 個角', scene: { w: 'bars', p: { rows: [{ label: '全部', segs: [{ u: 27, c: 't', text: '27 塊' }] }, { label: '三面', segs: [{ u: 8, c: 'd', text: '8' }] }] }, still: true }, reveal: '每個角碰到 3 個面。三面有色的有 8 個。' },
      { t: 'show', say: '兩面在 12 條邊的中間，共 12 個。一面在 6 個面的中間，共 6 個。', scene: { w: 'bars', p: { rows: [{ label: '全部', segs: [{ u: 27, c: 't', text: '27 塊' }] }, { label: '分類', segs: [{ u: 8, c: 'd', text: '三面 8' }, { u: 12, c: 'b', text: '兩面 12' }, { u: 6, c: 'g', text: '一面 6' }] }] }, still: true } },
      { t: 'do', say: '27 減去 8、12、6。拉出沒有塗色的小塊。', scene: { w: 'bars', p: { rows: [{ label: '全部', segs: [{ u: 27, c: 't', text: '27 塊' }] }, { label: '分類', segs: [{ u: 8, c: 'd', text: '8' }, { u: 12, c: 'b', text: '12' }, { u: 6, c: 'g', text: '6' }, { u: 1, c: 'a', edit: true, start: 5, target: 1, min: 1, max: 6 }] }] } } },
      { t: 'do', say: '展開圖橫排四格，圍成一圈。從 2 走 2 步，找 2 的對面。', scene: { w: 'cycle', p: { n: 4, labels: [2, 5, 1, 4], steps: 2, unit: '步' } } },
      { t: 'try', say: '想想它們在哪個位置。', scene: { w: 'bars', p: { rows: [{ label: '全部', segs: [{ u: 27, c: 't', text: '27 塊' }] }, { label: '一面', segs: [{ u: 6, c: 'g', text: '？' }] }] }, still: true },
        q: { stem: '把 3×3×3 的積木外面全部塗色，再切成 27 個小正方體。一面有色的有幾個？', options: ['6', '8', '12'], answer: '6', hint: '一面有色的在 6 個面的中間。', why: { 8: '8 是三面有色的角塊。', 12: '12 是兩面有色的邊塊。' } } },
      { t: 'try', say: '用「對面隔一格」。',
        q: { svg: netSvg([2, 5, 1, 4], 1, 3, 2, 6, 2), stem: '展開圖橫排四格 2、5、1、4，3 在 5 上面，6 在 1 下面。摺成正方體，2 的對面是幾？', options: ['1', '5', '4'], answer: '1', hint: '橫排四格圍成一圈，對面隔一格。', why: { 5: '5 在 2 的旁邊，是鄰面。', 4: '4 也在 2 的旁邊（圍成一圈後相連）。' } } },
      { t: 'card' }
    ],
    gens: g65, verify: verify65
  });
})();
