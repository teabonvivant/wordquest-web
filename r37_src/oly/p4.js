/* 小四 · 5 units. p4-1 雞兔同籠 is the reference unit; p4-2 至 p4-5（g34）使用現成教具 pairing / numline / rowplace / dotgraph / bars，沒有新增工具。 */
(function () {
  'use strict';
  const { o, N, ri, pick } = WQOly.helpers;
  const COL = { a: '#3ee6d0', b: '#ffc94a', d: '#ff8fc7', t: '#c6a2ff' };
  const solid = (u, c, text) => ({ u, c, text });
  const ks = w => Object.keys(w).map(Number);
  /* why-table: drops keys that equal the answer, are not positive whole numbers, or repeat */
  const wy = (ans, list) => { const w = {}; for (const [k, v] of list) { if (Number.isInteger(k) && k > 0 && String(k) !== String(ans) && !(k in w)) w[k] = v; } return w; };
  /* tiny bar-model picture. rows: [{l, p:[[units, colourKey, text, dashed?], ...]}] */
  const bsvg = (rows, note) => {
    const max = Math.max(...rows.map(r => r.p.reduce((s, x) => s + x[0], 0))), sx = 168 / max, H = rows.length * 32 + 6 + (note ? 20 : 0);
    let s = '';
    rows.forEach((r, i) => {
      const y = 4 + i * 32; let x = 40;
      s += `<text x="34" y="${y + 13}" text-anchor="end" dominant-baseline="central" font-size="13" font-weight="800" fill="#c3cbf7">${r.l}</text>`;
      r.p.forEach(([u, c, t, dash]) => {
        const w = u * sx, col = COL[c];
        s += `<rect x="${x}" y="${y}" width="${w}" height="26" rx="5" fill="${dash ? 'none' : col}" stroke="${col}" stroke-width="2"${dash ? ' stroke-dasharray="5 4"' : ''}/>`;
        if (t) s += `<text x="${x + w / 2}" y="${y + 14}" text-anchor="middle" dominant-baseline="central" font-size="12" font-weight="900" fill="${dash ? col : '#0b1030'}">${t}</text>`;
        x += w;
      });
    });
    if (note) s += `<text x="120" y="${H - 8}" text-anchor="middle" font-size="12" font-weight="900" fill="#ffc94a">${note}</text>`;
    return `<svg viewBox="0 0 240 ${H}" role="img" aria-label="${note || '棒形圖'}">${s}</svg>`;
  };

  /* ---- p4-1 雞兔同籠 ----------------------------------------------------------------------------------------------------- */
  const cage = (H, F, e1, e2) => {
    const per = H > 10 ? Math.ceil(H / 2) : H, rows = Math.ceil(H / per), d = Math.min(26, 150 / per);
    let s = '';
    for (let i = 0; i < H; i++) { const r = Math.floor(i / per), c = i % per, n = r === rows - 1 ? H - r * per : per, x = 85 + (c - (n - 1) / 2) * d, y = 17 + r * 28; s += `<circle cx="${x}" cy="${y}" r="${d * .42}" fill="#1b2160" stroke="#3ee6d0" stroke-width="1.8"/><text x="${x}" y="${y + 1}" text-anchor="middle" dominant-baseline="central" font-size="${d * .5}" font-weight="900" fill="#c3cbf7">?</text>`; }
    return `<svg viewBox="0 0 170 ${rows * 28 + 22}" role="img" aria-label="${H} 隻頭，${F} 隻腳">${s}<text x="85" y="${rows * 28 + 13}" text-anchor="middle" font-size="12" font-weight="900" fill="#ffc94a">${H} 隻頭 · ${F} 隻腳</text></svg>`;
  };
  const art41 = '<svg viewBox="0 0 120 80"><g font-size="22" text-anchor="middle" dominant-baseline="central"><text x="20" y="20">🐔</text><text x="46" y="20">🐔</text><text x="72" y="20">🐰</text><text x="98" y="20">🐰</text></g><path d="M20 34v10M46 34v10" stroke="#3ee6d0" stroke-width="3" stroke-linecap="round"/><path d="M72 34v10M98 34v10" stroke="#ffc94a" stroke-width="3" stroke-linecap="round"/><rect x="10" y="52" width="100" height="20" rx="10" fill="#ff8fc7"/><text x="60" y="63" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="900" fill="#0b1030">先當全是雞</text></svg>';
  const TH = [{ n1: '雞', n2: '兔', l1: 2, l2: 4, part: '腳', u: '隻', at: '籠裏' }, { n1: '單車', n2: '三輪車', l1: 2, l2: 3, part: '輪', u: '輛', at: '車房裏' }];
  const g41 = {
    A: [
      /* heads + legs, assume all of the first kind then swap */
      (r, p) => {
        const th = r() < .7 ? TH[0] : TH[1], H = N(r, p, 4, 15), t = ri(r, 1, H - 1), c = H - t, F = th.l1 * c + th.l2 * t, ask2 = r() < .5, D = F - th.l1 * H, dl = th.l2 - th.l1, ans = ask2 ? t : c;
        const pp = th.part === '腳' ? '隻腳' : '個輪';
        return o('cr-basic', `${th.at}有${th.n1}和${th.n2}共 ${H} ${th.u}，共 ${F} ${pp}。${ask2 ? th.n2 : th.n1}有幾${th.u}？`, ans,
          `先假設全部是${th.n1}。`, `假設 ${H} ${th.u}全是${th.n1}：${H}×${th.l1}＝${th.l1 * H}，少了 ${D} ${th.part === '腳' ? '隻腳' : '個輪'}；每換 1 ${th.u}多 ${dl}，${D}÷${dl}＝${t}，所以${th.n2} ${t} ${th.u}、${th.n1} ${c} ${th.u}。`,
          [ask2 ? c : t, D, F - H, ans + 1], `${ask2 ? D + '/' + dl : H + '-' + D + '/' + dl}`, [],
          { svg: cage(H, F), why: { [ask2 ? c : t]: `你算出的是${ask2 ? th.n1 : th.n2}的數目，題目問${ask2 ? th.n2 : th.n1}。`, [D]: `${D} 是比全${th.n1}多出的${th.part}，還要除以 ${dl}。` } });
      }
    ],
    B: [
      /* "rabbits are d more than chickens": take away the extra rabbits' legs first, then 1 chicken + 1 rabbit = 6 legs */
      (r, p) => {
        const d = ri(r, 1, 3), c = N(r, p, 2, 8), t = c + d, F = 2 * c + 4 * t, ask = r() < .5;
        return o('cr-diff', `雞和兔共有 ${F} 隻腳，兔比雞多 ${d} 隻。${ask ? '雞' : '兔'}有幾隻？`, ask ? c : t, `先拿走多出來的 ${d} 隻兔。`,
          `先拿走多出的 ${d} 隻兔（${4 * d} 隻腳），剩 ${F - 4 * d} 隻腳；雞和兔一樣多，每 1 雞 1 兔有 6 隻腳：${F - 4 * d}÷6＝${c}，雞 ${c} 隻，兔 ${c}＋${d}＝${t} 隻。`,
          [ask ? t : c, F - 4 * d, F / 6 | 0, (ask ? c : t) + 1], '', [],
          { why: { [ask ? t : c]: `你算出的是${ask ? '兔' : '雞'}的隻數，題目問${ask ? '雞' : '兔'}。`, [F - 4 * d]: `這是剩下的腳數，還要每 6 隻腳（1 雞 1 兔）分一組。` } });
      },
      /* "legs are x fewer than 4 times the heads": assume all rabbits */
      (r, p) => {
        const H = N(r, p, 5, 20), c = ri(r, 1, H - 1), x = 2 * c;
        return o('cr-fourx', `雞和兔共 ${H} 隻，腳數比頭數的 4 倍少 ${x} 隻。雞有幾隻？`, c, `先假設全部是兔。`,
          `頭數的 4 倍：${H}×4＝${4 * H}，就是全部是兔的腳數；少了 ${x} 隻腳，每隻雞少 2 隻，${x}÷2＝${c} 隻雞。`,
          [H - c, x, 4 * H, c + 1], `${x}/2`, [],
          { why: { [H - c]: `你算出的是兔的隻數，題目問雞。`, [x]: `${x} 是少了的腳數，每隻雞少 2 隻腳，還要除以 2。` } });
      }
    ]
  };
  /* independent recomputation: brute force over every possible split */
  const verify41 = q => {
    let m;
    if ((m = /有(.+?)和(.+?)共 (\d+) .，共 (\d+) .+。(.+?)有幾/.exec(q.q))) {
      const H = +m[3], F = +m[4], th = TH.find(t => t.n1 === m[1]);
      for (let t = 0; t <= H; t++) if (th.l1 * (H - t) + th.l2 * t === F) return String(m[5] === th.n2 ? t : H - t);
      return 'none';
    }
    if ((m = /共有 (\d+) 隻腳，兔比雞多 (\d+) 隻。(.)有幾/.exec(q.q))) {
      const F = +m[1], d = +m[2];
      for (let c = 0; c <= 80; c++) if (2 * c + 4 * (c + d) === F) return String(m[3] === '雞' ? c : c + d);
      return 'none';
    }
    if ((m = /共 (\d+) 隻，腳數比頭數的 4 倍少 (\d+) 隻/.exec(q.q))) {
      const H = +m[1], x = +m[2];
      for (let c = 0; c <= H; c++) if (2 * c + 4 * (H - c) === 4 * H - x) return String(c);
      return 'none';
    }
    return null;
  };

  WQOly.register({
    id: 'p4-1', grade: 4, n: 1, title: '雞兔同籠', icon: '🐔',
    card: { motto: '先假設全是雞', example: '8 頭 26 腳：兔 5 隻', art: art41 },
    lesson: [
      { t: 'show', say: '共 8 隻頭、26 隻腳。雞兔各幾隻？', scene: { w: 'swap', p: { heads: 8, legs: 26 }, still: true } },
      { t: 'show', say: '先假設全部是雞。8 隻雞只有 16 隻腳。', scene: { w: 'swap', p: { heads: 8, legs: 26 }, still: true } },
      { t: 'predict', say: '把 1 隻雞換成兔。', ask: '腳會多幾隻？', options: ['1', '2', '3'], answer: '2', scene: { w: 'swap', p: { heads: 8, legs: 26 }, still: true }, reveal: '兔 4 腳、雞 2 腳，每換一隻多 2 隻腳！' },
      { t: 'do', say: '點一點，把雞換成兔，換到腳數剛好 26。', scene: { w: 'swap', p: { heads: 8, legs: 26 } } },
      { t: 'show', say: '差 10 隻腳，每換一隻多 2 隻。10÷2＝5，兔有 5 隻。', scene: { w: 'swap', p: { heads: 8, legs: 26, pre: 5 }, still: true } },
      { t: 'do', say: '再試一次：5 隻頭、14 隻腳。', scene: { w: 'swap', p: { heads: 5, legs: 14 } } },
      { t: 'try', say: '用剛才的方法，答答看。', scene: { w: 'swap', p: { heads: 7, legs: 20 }, still: true },
        q: { stem: '雞和兔共 7 隻，共 20 隻腳。兔有幾隻？', options: ['3', '4', '6'], answer: '3', hint: '先假設 7 隻全是雞。', why: { 6: '6 是多出來的腳數，每換一隻多 2 隻，還要除以 2。', 4: '4 是雞的隻數，題目問兔。' } } },
      { t: 'card' }
    ],
    gens: g41, verify: verify41
  });


  /* ======================================================================= p4-2 高斯求和 ===================================== */
  const art42 = '<svg viewBox="0 0 120 80"><g font-size="13" font-weight="900" text-anchor="middle" dominant-baseline="central"><circle cx="16" cy="38" r="9" fill="#3ee6d0"/><circle cx="38" cy="38" r="9" fill="#3ee6d0"/><circle cx="82" cy="38" r="9" fill="#ffc94a"/><circle cx="104" cy="38" r="9" fill="#ffc94a"/><g fill="#0b1030"><text x="16" y="38">1</text><text x="38" y="38">2</text><text x="82" y="38">9</text><text x="104" y="38">10</text></g></g><path d="M16 28Q60 -4 104 28M38 28Q60 8 82 28" stroke="#c6a2ff" stroke-width="2.4" fill="none"/><rect x="14" y="56" width="92" height="20" rx="10" fill="#ff8fc7"/><text x="60" y="66" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="900" fill="#0b1030">頭尾配對</text></svg>';
  const g42 = {
    A: [
      (r, p) => {
        const n = N(r, p, 6, 100), ans = n * (n + 1) / 2;
        const w = wy(ans, [[n * (n + 1), `${n}＋1 是每對的和，對數只有一半，要除以 2。`], [n % 2 === 0 ? n / 2 * n : (n - 1) / 2 * (n + 1), n % 2 === 0 ? `每對是 ${n + 1}，不是 ${n}。` : '單數個數會剩下中間一個數，別漏掉。'], [n + 1, '那只是一對的和，還有很多對。']]);
        return o('gs-basic', `1＋2＋3＋…＋${n}＝？`, ans, '頭尾配對：1 配最後一個。', `每對 1＋${n}＝${n + 1}，有 ${n}÷2 對：${n + 1}×${n}÷2＝${ans}。`, ks(w), `${n}*(${n}+1)/2`, [], { why: w });
      },
      (r, p) => {
        const n = N(r, p, 5, 20), ans = n * (n + 1) / 2;
        const w = wy(ans, [[n * (n + 1), '每塊磚被算了兩次，要除以 2。'], [n * n, `最後一級是 ${n} 塊，但前面各級比它少。`], [n * (n - 1) / 2, `漏了第 ${n} 級的 ${n} 塊。`]]);
        return o('gs-stairs', `樓梯第 1 級 1 塊磚，第 2 級 2 塊磚，…，第 ${n} 級 ${n} 塊磚。共幾塊？`, ans, '把 1 到最後一級的數加起來。', `1＋2＋…＋${n}＝(1＋${n})×${n}÷2＝${ans}。`, ks(w), `${n}*(${n}+1)/2`, [], { why: w });
      },
      (r, p) => {
        const n = 2 * N(r, p, 3, 50), ans = n / 2;
        const w = wy(ans, [[n, '兩個數配成一對，不是一個數一對。'], [n + 1, '那是每對的和，不是對數。']]);
        return o('gs-pairs', `1 到 ${n}，頭尾配對（1 配 ${n}），共配成幾對？`, ans, '兩個數一對。', `${n} 個數，每 2 個一對：${n}÷2＝${ans} 對。`, ks(w), `${n}/2`, [], { why: w });
      }
    ],
    B: [
      (r, p) => {
        const d = ri(r, 2, 3), a = ri(r, 1, 5), n = N(r, p, 6, 20), L = a + (n - 1) * d, ans = (a + L) * n / 2;
        const half = (a + L) * (n - 1);
        const w = wy(ans, [[(a + L) * n, `首尾和 ${a + L} 乘項數 ${n} 後，還要除以 2。`], [half % 2 === 0 ? half / 2 : 0, '項數不是 (末−首)÷差，還要加 1。'], [L, `${L} 只是最後一個數。`]]);
        return o('gs-step', `${a}＋${a + d}＋${a + 2 * d}＋…＋${L}＝？`, ans, '先數有幾個數。', `項數 (${L}－${a})÷${d}＋1＝${n}；${a}＋${L}＝${a + L}；${a + L}×${n}÷2＝${ans}。`, ks(w), `(${a}+${L})*${n}/2`, [], { why: w });
      },
      (r, p) => {
        const d = ri(r, 2, 3), a = ri(r, 1, 5), n = N(r, p, 6, 30), L = a + (n - 1) * d;
        const w = wy(n, [[n - 1, '像植樹：數字的個數比間隔數多 1。'], [Number.isInteger(L / d) ? L / d : 0, `${L}÷${d} 不是個數，要看從 ${a} 開始。`], [L - a, `${L}－${a} 是一共跳了多遠，不是幾個數。`]]);
        return o('gs-count', `${a}、${a + d}、${a + 2 * d}、…、${L}，一共有幾個數？`, n, '每次加幾？從頭跳到尾跳了幾次？', `跳了 (${L}－${a})÷${d}＝${n - 1} 次，數字有 ${n - 1}＋1＝${n} 個。`, ks(w), `(${L}-${a})/${d}+1`, [], { why: w });
      },
      (r, p) => {
        const C = pick(r, ['小明', '小美', '阿強', '小欣']), a = ri(r, 2, 6), d = ri(r, 2, 3), n = N(r, p, 5, 12), L = a + (n - 1) * d, ans = (a + L) * n / 2;
        const w = wy(ans, [[(a + L) * n, '首尾和乘天數後，還要除以 2。'], [L, `${L} 只是最後一天讀的頁數。`], [a * n, '每天讀的頁數不一樣，不是 ' + a + ' 頁。']]);
        return o('gs-story', `${C}第 1 天讀 ${a} 頁，之後每天多讀 ${d} 頁，共讀 ${n} 天。一共讀了幾頁？`, ans, '先算最後一天讀幾頁。', `最後一天 ${a}＋${n - 1}×${d}＝${L} 頁；(${a}＋${L})×${n}÷2＝${ans}。`, ks(w), `(${a}+${L})*${n}/2`, [], { why: w });
      }
    ]
  };
  const verify42 = q => {
    let m;
    if ((m = /^1＋2＋3＋…＋(\d+)＝？/.exec(q.q))) { let s = 0; for (let i = 1; i <= +m[1]; i++) s += i; return String(s); }
    if ((m = /^樓梯第 1 級 1 塊磚.+第 (\d+) 級/.exec(q.q))) { let s = 0; for (let i = 1; i <= +m[1]; i++) s += i; return String(s); }
    if ((m = /^1 到 (\d+)，頭尾配對/.exec(q.q))) { let a = 1, b = +m[1], c = 0; while (a < b) { a++; b--; c++; } return String(c); }
    if ((m = /^(\d+)＋(\d+)＋(\d+)＋…＋(\d+)＝？/.exec(q.q))) { const d = +m[2] - +m[1]; let s = 0; for (let x = +m[1]; x <= +m[4]; x += d) s += x; return String(s); }
    if ((m = /^(\d+)、(\d+)、(\d+)、…、(\d+)，一共有幾個數/.exec(q.q))) { const d = +m[2] - +m[1]; let c = 0; for (let x = +m[1]; x <= +m[4]; x += d) c++; return String(c); }
    if ((m = /^\S+第 1 天讀 (\d+) 頁，之後每天多讀 (\d+) 頁，共讀 (\d+) 天/.exec(q.q))) { let s = 0, day = +m[1]; for (let i = 0; i < +m[3]; i++) { s += day; day += +m[2]; } return String(s); }
    return null;
  };
  WQOly.register({
    id: 'p4-2', grade: 4, n: 2, title: '高斯求和', icon: '➕',
    card: { motto: '頭尾配對', example: '1＋…＋10＝11×5', art: art42 },
    lesson: [
      { t: 'show', say: '1＋2＋3＋…＋10。一個一個加太慢了！', scene: { w: 'pairing', p: { n: 10 } } },
      { t: 'predict', say: '把最小的 1 和最大的 10 配成一對。', ask: '1＋10 是多少？', options: ['10', '11', '12'], answer: '11', scene: { w: 'pairing', p: { n: 10 }, still: true }, reveal: '1＋10＝11！' },
      { t: 'do', say: '2 和 9 呢？一對一對配，每對都是 11。', scene: { w: 'pairing', p: { n: 10 } } },
      { t: 'show', say: '一共 5 對，每對 11。11×5＝55。', scene: { w: 'pairing', p: { n: 10 } } },
      { t: 'predict', say: '1 加到 8，也頭尾配對。', ask: '一共配成幾對？', options: ['3', '4', '8'], answer: '4', scene: { w: 'pairing', p: { n: 8 }, still: true }, reveal: '8 個數，兩個一對，4 對。每對 9。' },
      { t: 'do', say: '2＋4＋6＋…＋12：先數有幾個數。', scene: { w: 'numline', p: { min: 0, max: 12, start: 2, target: 12, steps: [2], hops: Array.from({ length: 5 }, () => ({ n: 2 })) } } },
      { t: 'try', say: '用頭尾配對，答答看。', scene: { w: 'pairing', p: { n: 20 }, still: true },
        q: { stem: '1＋2＋3＋…＋20＝？', options: ['190', '210', '420'], answer: '210', hint: '每對 21，共 10 對。', why: { 420: '420 是還沒除以 2。', 190: '每對是 1＋20＝21，不是 19。' } } },
      { t: 'card' }
    ],
    gens: g42, verify: verify42
  });

  /* ======================================================================= p4-3 植樹進階 ===================================== */
  const D3 = [2, 3, 4, 5, 6, 8, 10];
  const roadSvg = (segs, mode) => {
    let s = '';
    if (mode === 'circle') {
      const R = 34, cx = 120, cy = 44;
      s = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#c3cbf7" stroke-width="3"/>`;
      for (let i = 0; i < segs; i++) { const a = -Math.PI / 2 + i / segs * 2 * Math.PI; s += `<circle cx="${cx + Math.cos(a) * R}" cy="${cy + Math.sin(a) * R}" r="${segs > 14 ? 3 : 4.5}" fill="#7ee3a1"/>`; }
      return `<svg viewBox="0 0 240 90" role="img" aria-label="環形路">${s}</svg>`;
    }
    const x0 = 14, x1 = 226, dx = (x1 - x0) / segs, first = mode === 'none' ? 1 : 0, last = mode === 'both' ? segs : segs - (mode === 'one' ? 1 : 1);
    s = `<line x1="${x0}" y1="40" x2="${x1}" y2="40" stroke="#c3cbf7" stroke-width="3" stroke-linecap="round"/>`;
    for (let i = 0; i <= segs; i++) s += `<line x1="${x0 + i * dx}" y1="34" x2="${x0 + i * dx}" y2="46" stroke="#c3cbf7" stroke-width="1.5"/>`;
    const lo = mode === 'none' ? 1 : 0, hi = mode === 'both' ? segs : segs - 1;
    for (let i = lo; i <= hi; i++) s += `<circle cx="${x0 + i * dx}" cy="26" r="${segs > 14 ? 3 : 4.5}" fill="#7ee3a1"/>`;
    return `<svg viewBox="0 0 240 70" role="img" aria-label="一條路">${s}</svg>`;
  };
  const art43 = '<svg viewBox="0 0 120 80"><circle cx="60" cy="30" r="22" fill="none" stroke="#c3cbf7" stroke-width="3"/><g fill="#7ee3a1"><circle cx="60" cy="8" r="5"/><circle cx="81" cy="22" r="5"/><circle cx="73" cy="47" r="5"/><circle cx="47" cy="47" r="5"/><circle cx="39" cy="22" r="5"/></g><rect x="14" y="58" width="92" height="18" rx="9" fill="#ff8fc7"/><text x="60" y="68" text-anchor="middle" dominant-baseline="central" font-size="12" font-weight="900" fill="#0b1030">圍圈：棵數＝段數</text></svg>';
  const seg43 = (r, p, lo) => { const d = pick(r, D3), s = N(r, p, lo || 4, 20); return [d, s, d * s]; };
  const g43 = {
    A: [
      (r, p) => {
        const [d, s, L] = seg43(r, p), ans = s + 1;
        const w = wy(ans, [[s, '兩端都種，棵數要比段數多 1。'], [s - 1, '那是兩端都不種的算法。']]);
        return o('tp-both', `一條 ${L} 米長的路，每隔 ${d} 米種一棵樹，兩端都種。共種幾棵？`, ans, '先算有幾段，再看兩端。', `${L}÷${d}＝${s} 段；兩端都種，${s}＋1＝${ans} 棵。`, ks(w), `${L}/${d}+1`, [], { why: w, svg: roadSvg(Math.min(s, 20), 'both') });
      },
      (r, p) => {
        const [d, s, L] = seg43(r, p), ans = s;
        const w = wy(ans, [[s + 1, '只種一端，棵數和段數一樣多。'], [s - 1, '一端有種，不用減 1。']]);
        return o('tp-one', `一條 ${L} 米長的路，每隔 ${d} 米種一棵樹，只種一端，另一端不種。共種幾棵？`, ans, '一端種、一端不種，一段配一棵。', `${L}÷${d}＝${s} 段；只種一端，棵數＝段數＝${ans}。`, ks(w), `${L}/${d}`, [], { why: w, svg: roadSvg(Math.min(s, 20), 'one') });
      },
      (r, p) => {
        const d = pick(r, D3), s = N(r, p, 4, 20), n = s + 1, ans = s * d;
        const w = wy(ans, [[n * d, `${n} 棵只有 ${n - 1} 段，要先減 1。`], [(n + 1) * d, '棵數比段數多 1，要減，不是加。']]);
        return o('tp-back', `一條路兩端都種樹，共種 ${n} 棵，相鄰兩棵相隔 ${d} 米。路長多少米？`, ans, '先算有幾段。', `${n} 棵有 ${n}－1＝${s} 段；${s}×${d}＝${ans} 米。`, ks(w), `(${n}-1)*${d}`, [], { why: w, svg: roadSvg(Math.min(s, 20), 'both') });
      }
    ],
    B: [
      (r, p) => {
        const [d, s, L] = seg43(r, p), ans = s;
        const w = wy(ans, [[s + 1, '環形首尾相連，棵數＝段數，不用加 1。'], [s - 1, '環形沒有兩端，不用減 1。']]);
        return o('tp-ring', `環形池塘邊長 ${L} 米，每隔 ${d} 米種一棵樹。共種幾棵？`, ans, '圍成一圈，起點和終點是同一處。', `${L}÷${d}＝${s} 段；環形的棵數＝段數＝${ans}。`, ks(w), `${L}/${d}`, [], { why: w, svg: roadSvg(Math.min(s, 20), 'circle') });
      },
      (r, p) => {
        const [d, s, L] = seg43(r, p, 4), ans = 2 * (s + 1);
        const w = wy(ans, [[s + 1, '兩旁都要種，要乘 2。'], [2 * s, '兩端都種，每旁還要加 1。']]);
        return o('tp-sides', `一條 ${L} 米長的路，兩旁每隔 ${d} 米各種一棵，兩端都種。共種幾棵？`, ans, '先算一旁，再算兩旁。', `${L}÷${d}＝${s} 段；一旁 ${s}＋1＝${s + 1} 棵；兩旁 ${s + 1}×2＝${ans} 棵。`, ks(w), `(${L}/${d}+1)*2`, [], { why: w, svg: roadSvg(Math.min(s, 20), 'both') });
      },
      (r, p) => {
        const [d, s, L] = seg43(r, p, 5), ans = s - 1;
        const w = wy(ans, [[s, '兩端都不種，棵數比段數少 1。'], [s + 1, '那是兩端都種的算法。']]);
        return o('tp-none', `一條 ${L} 米長的路，兩端都不種，每隔 ${d} 米種一棵樹。共種幾棵？`, ans, '兩端的位置不種。', `${L}÷${d}＝${s} 段；兩端都不種，${s}－1＝${ans} 棵。`, ks(w), `${L}/${d}-1`, [], { why: w, svg: roadSvg(Math.min(s, 20), 'none') });
      },
      (r, p) => {
        const d = pick(r, D3), n = N(r, p, 5, 20), ans = n * d;
        const w = wy(ans, [[(n - 1) * d, '環形的段數就是棵數，不用減 1。'], [(n + 1) * d, '環形的段數不用加 1。']]);
        return o('tp-ringback', `圓形花圃種了 ${n} 棵樹，相鄰兩棵相隔 ${d} 米。花圃周長多少米？`, ans, '環形：有幾棵就有幾段。', `${n} 棵就是 ${n} 段；${n}×${d}＝${ans} 米。`, ks(w), `${n}*${d}`, [], { why: w, svg: roadSvg(Math.min(n, 20), 'circle') });
      }
    ]
  };
  const verify43 = q => {
    let m;
    if ((m = /^一條 (\d+) 米長的路，每隔 (\d+) 米種一棵樹，兩端都種/.exec(q.q))) { let c = 0; for (let x = 0; x <= +m[1]; x += +m[2]) c++; return String(c); }
    if ((m = /^一條 (\d+) 米長的路，每隔 (\d+) 米種一棵樹，只種一端/.exec(q.q))) { let c = 0; for (let x = 0; x < +m[1]; x += +m[2]) c++; return String(c); }
    if ((m = /^一條路兩端都種樹，共種 (\d+) 棵，相鄰兩棵相隔 (\d+) 米/.exec(q.q))) { return String((+m[1] - 1) * +m[2]); }
    if ((m = /^環形池塘邊長 (\d+) 米，每隔 (\d+) 米種一棵樹/.exec(q.q))) { let c = 0; for (let x = 0; x < +m[1]; x += +m[2]) c++; return String(c); }
    if ((m = /^一條 (\d+) 米長的路，兩旁每隔 (\d+) 米各種一棵，兩端都種/.exec(q.q))) { let c = 0; for (let x = 0; x <= +m[1]; x += +m[2]) c += 2; return String(c); }
    if ((m = /^一條 (\d+) 米長的路，兩端都不種，每隔 (\d+) 米種一棵樹/.exec(q.q))) { let c = 0; for (let x = +m[2]; x < +m[1]; x += +m[2]) c++; return String(c); }
    if ((m = /^圓形花圃種了 (\d+) 棵樹，相鄰兩棵相隔 (\d+) 米/.exec(q.q))) { let t = 0; for (let i = 0; i < +m[1]; i++) t += +m[2]; return String(t); }
    return null;
  };
  WQOly.register({
    id: 'p4-3', grade: 4, n: 3, title: '植樹進階', icon: '🌳',
    card: { motto: '看兩端、看圍圈', example: '圍圈：棵數＝段數', art: art43 },
    lesson: [
      { t: 'show', say: '20 米長的路，每 5 米種一棵，兩端都種。', scene: { w: 'rowplace', p: { segments: 4, ends: 'both', span: 5, unit: '米' } } },
      { t: 'predict', say: '路分成 4 段。', ask: '兩端都種，共種幾棵？', options: ['4', '5', '6'], answer: '5', scene: { w: 'rowplace', p: { segments: 4, ends: 'both', span: 5, unit: '米' }, still: true }, reveal: '兩端都種，棵數比段數多 1。' },
      { t: 'do', say: '把樹種滿每個位置。', scene: { w: 'rowplace', p: { segments: 4, ends: 'both', span: 5, unit: '米' } } },
      { t: 'do', say: '這次一端不種，看看要幾棵。', scene: { w: 'rowplace', p: { segments: 4, ends: 'one', span: 5, unit: '米' } } },
      { t: 'predict', say: '環形的路，分成 6 段。', ask: '要種幾棵？', options: ['5', '6', '7'], answer: '6', scene: { w: 'rowplace', p: { segments: 6, circle: true, span: 5, unit: '米' }, still: true }, reveal: '首尾相連，棵數＝段數！' },
      { t: 'do', say: '把樹種滿這圈路。', scene: { w: 'rowplace', p: { segments: 6, circle: true, span: 5, unit: '米' } } },
      { t: 'try', say: '先看兩端，再算。', scene: { w: 'rowplace', p: { segments: 5, ends: 'both', span: 6, unit: '米' }, still: true },
        q: { stem: '30 米長的路，每隔 6 米種一棵，兩端都種。共種幾棵？', options: ['5', '6', '7'], answer: '6', hint: '先算有幾段，兩端都種要加 1。', why: { 5: '30÷6＝5 是段數，兩端都種還要加 1。', 7: '7 加多了，段數是 5，棵數是 5＋1。' } } },
      { t: 'card' }
    ],
    gens: g43, verify: verify43
  });

  /* ======================================================================= p4-4 握手與組合 =================================== */
  const c2 = n => n * (n - 1) / 2;
  const art44 = '<svg viewBox="0 0 120 80"><g stroke="#c6a2ff" stroke-width="2"><path d="M60 8L22 34M60 8L98 34M60 8L38 58M60 8L82 58M22 34L98 34M22 34L38 58M22 34L82 58M98 34L38 58M98 34L82 58M38 58L82 58" fill="none" opacity=".55"/></g><g fill="#3ee6d0"><circle cx="60" cy="8" r="6"/><circle cx="22" cy="34" r="6"/><circle cx="98" cy="34" r="6"/><circle cx="38" cy="58" r="6"/><circle cx="82" cy="58" r="6"/></g><rect x="14" y="62" width="92" height="16" rx="8" fill="#ff8fc7"/><text x="60" y="70" text-anchor="middle" dominant-baseline="central" font-size="11" font-weight="900" fill="#0b1030">5×4÷2＝10</text></svg>';
  const g44 = {
    A: [
      (r, p) => {
        const n = N(r, p, 3, 10), ans = c2(n);
        const w = wy(ans, [[n * (n - 1), '每次握手被算了兩次，要除以 2。'], [n * n, '不用和自己握手，每人只和另外的人握。'], [c2(n + 1), '人數多算了一個。']]);
        return o('hs-hand', `${n} 個人見面，每兩個人握手一次。共握手幾次？`, ans, '每人要和幾個人握手？', `每人握 ${n - 1} 次，${n}×${n - 1}＝${n * (n - 1)}；每次算了兩遍，÷2＝${ans}。`, ks(w), `${n}*(${n}-1)/2`, [], { why: w });
      },
      (r, p) => {
        const n = N(r, p, 3, 10), ans = c2(n);
        const w = wy(ans, [[n * (n - 1), '每場比賽被算了兩次，要除以 2。'], [n - 1, '那只是其中一隊要踢的場數。'], [n * n, '一隊不會和自己踢。']]);
        return o('hs-league', `${n} 隊足球隊作單循環賽，每兩隊賽一場。共賽幾場？`, ans, '每隊要踢幾場？', `每隊踢 ${n - 1} 場，${n}×${n - 1}＝${n * (n - 1)}；每場算了兩遍，÷2＝${ans}。`, ks(w), `${n}*(${n}-1)/2`, [], { why: w });
      },
      (r, p) => {
        const n = N(r, p, 3, 10), ans = c2(n);
        const w = wy(ans, [[n * (n - 1), '每條線被算了兩次，要除以 2。'], [n * (n - 1) / 2 + n, '點不能連自己，不用加 ' + n + '。'], [n, '每個點都連好幾條線。']]);
        return o('hs-line', `紙上畫 ${n} 個點，任何三點不在同一直線。每兩點連一條線，共連幾條？`, ans, '每個點連到其他幾個點？', `每點連 ${n - 1} 條，${n}×${n - 1}＝${n * (n - 1)}；每條算了兩遍，÷2＝${ans}。`, ks(w), `${n}*(${n}-1)/2`, [], { why: w });
      },
      (r, p) => {
        const n = N(r, p, 3, 10), T = c2(n);
        const w = wy(n, [[T, '那是握手的次數，題目問人數。'], [n - 1, '少數了一個人。'], [n + 1, '多數了一個人。']]);
        return o('hs-back', `一班同學互相握手一次，共握了 ${T} 次。有幾位同學？`, n, '試試 3、4、5……人各握幾次。', `${n} 人握 ${n}×${n - 1}÷2＝${T} 次，所以有 ${n} 位同學。`, ks(w), '', [], { why: w });
      }
    ],
    B: [
      (r, p) => {
        const a = N(r, p, 3, 6), b = ri(r, 3, 6), ans = c2(a) + c2(b);
        const w = wy(ans, [[c2(a + b), '男女之間不握手，要分開算。'], [a * b, '男女之間不握手。'], [c2(a)+ b, '女生之間也要用「人數×(人數−1)÷2」。']]);
        return o('hs-groups', `${a} 位男生和 ${b} 位女生。男生之間、女生之間各自握手一次，男女之間不握手。共握手幾次？`, ans, '男生和女生分開算，再加起來。', `男生 ${a}×${a - 1}÷2＝${c2(a)}；女生 ${b}×${b - 1}÷2＝${c2(b)}；${c2(a)}＋${c2(b)}＝${ans}。`, ks(w), `${a}*(${a}-1)/2+${b}*(${b}-1)/2`, [], { why: w });
      },
      (r, p) => {
        const n = N(r, p, 3, 9), ans = c2(n) + n;
        const w = wy(ans, [[c2(n), `新來的人還要和 ${n} 個人握手。`], [n, `那只是新來的人握的 ${n} 次。`], [c2(n + 1) * 2, '每次握手不用算兩遍。']]);
        return o('hs-extra', `${n} 個人互相握手一次後，又來了 1 個人，他和每人握手一次。現在一共握手幾次？`, ans, '先算原來的，再算新來的。', `原來 ${n}×${n - 1}÷2＝${c2(n)} 次；新來的握 ${n} 次；${c2(n)}＋${n}＝${ans}。`, ks(w), `${n}*(${n}-1)/2+${n}`, [], { why: w });
      },
      (r, p) => {
        const a = ri(r, 2, 4), b = N(r, p, 3, 8), ans = a * b + c2(a);
        const w = wy(ans, [[a * b, '老師之間也互相握手。'], [c2(a + b), '同學之間不握手。'], [a * b + a, '老師之間是 ' + a + '×' + (a - 1) + '÷2，不是 ' + a + '。']]);
        return o('hs-mix', `${a} 位老師和 ${b} 位同學。每位老師和每位同學握手一次，老師之間也互相握手一次。共握手幾次？`, ans, '分兩部分：老師和同學、老師和老師。', `老師和同學 ${a}×${b}＝${a * b}；老師之間 ${a}×${a - 1}÷2＝${c2(a)}；${a * b}＋${c2(a)}＝${ans}。`, ks(w), `${a}*${b}+${a}*(${a}-1)/2`, [], { why: w });
      }
    ]
  };
  const verify44 = q => {
    let m;
    const h = n => { let c = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) c++; return c; };
    if ((m = /^(\d+) 個人見面，每兩個人握手一次/.exec(q.q)) || (m = /^(\d+) 隊足球隊作單循環賽/.exec(q.q)) || (m = /^紙上畫 (\d+) 個點/.exec(q.q))) return String(h(+m[1]));
    if ((m = /^一班同學互相握手一次，共握了 (\d+) 次/.exec(q.q))) { for (let n = 2; n <= 60; n++) if (h(n) === +m[1]) return String(n); return 'none'; }
    if ((m = /^(\d+) 位男生和 (\d+) 位女生。/.exec(q.q))) return String(h(+m[1]) + h(+m[2]));
    if ((m = /^(\d+) 個人互相握手一次後，又來了 1 個人/.exec(q.q))) return String(h(+m[1] + 1));
    if ((m = /^(\d+) 位老師和 (\d+) 位同學。/.exec(q.q))) { let c = h(+m[1]); for (let i = 0; i < +m[1]; i++) for (let j = 0; j < +m[2]; j++) c++; return String(c); }
    return null;
  };
  WQOly.register({
    id: 'p4-4', grade: 4, n: 4, title: '握手與組合', icon: '🤝',
    card: { motto: '每人握手再除 2', example: '5 人：5×4÷2＝10', art: art44 },
    lesson: [
      { t: 'show', say: '4 個人見面，每兩個人握手一次。', scene: { w: 'dotgraph', p: { n: 4 } } },
      { t: 'predict', say: '想一想：一個人要握手。', ask: '他要和幾個人握手？', options: ['3', '4', '5'], answer: '3', scene: { w: 'dotgraph', p: { n: 4 }, still: true }, reveal: '不用和自己握手，所以是 3 個人。' },
      { t: 'do', say: '連一連，每對人握手一次。', scene: { w: 'dotgraph', p: { n: 4 } } },
      { t: 'predict', say: '4 個人各握 3 次，4×3＝12。', ask: '12 裏，每次握手被數了幾次？', options: ['1', '2', '4'], answer: '2', scene: { w: 'dotgraph', p: { n: 4 }, still: true }, reveal: '一次握手有兩個人，被數兩次，所以要 ÷2。' },
      { t: 'do', say: '5 個人：連滿所有的線。', scene: { w: 'dotgraph', p: { n: 5 } } },
      { t: 'show', say: '5×4＝20，÷2＝10 次。', scene: { w: 'dotgraph', p: { n: 5 } } },
      { t: 'try', say: '用同一個方法，答答看。', scene: { w: 'dotgraph', p: { n: 6 }, still: true },
        q: { stem: '6 個人見面，每兩個人握手一次。共握手幾次？', options: ['15', '30', '36'], answer: '15', hint: '每人握 5 次，別忘了 ÷2。', why: { 30: '30 是 6×5，每次握手被算了兩次。', 36: '6×6 多算了和自己握手。' } } },
      { t: 'card' }
    ],
    gens: g44, verify: verify44
  });

  /* ======================================================================= p4-5 盈虧問題 ===================================== */
  const IT5 = [['糖', '粒'], ['貼紙', '張'], ['書籤', '張'], ['彈珠', '粒']];
  const art45 = '<svg viewBox="0 0 120 80"><rect x="8" y="8" width="64" height="20" rx="5" fill="#3ee6d0"/><rect x="72" y="8" width="30" height="20" rx="5" fill="none" stroke="#ff8fc7" stroke-width="2.4" stroke-dasharray="5 4"/><rect x="8" y="34" width="64" height="20" rx="5" fill="#ffc94a"/><rect x="72" y="34" width="20" height="20" rx="5" fill="none" stroke="#ff8fc7" stroke-width="2.4" stroke-dasharray="5 4"/><rect x="14" y="60" width="92" height="16" rx="8" fill="#ff8fc7"/><text x="60" y="68" text-anchor="middle" dominant-baseline="central" font-size="11" font-weight="900" fill="#0b1030">差 ÷ 每人差</text></svg>';
  /* a: per-person amount (first plan), g: extra per person in the second plan; n people */
  const mk5 = (r, p) => { const n = N(r, p, 3, 12), g = ri(r, 1, 3), a = ri(r, 1, 10 - g); return { n, g, a, b: a + g }; };
  const g45 = {
    A: [
      (r, p) => {
        const { n, g, a, b } = mk5(r, p), x = ri(r, 1, g * n - 1), y = g * n - x, [it, u] = pick(r, IT5), alt = Math.abs(x - y) / g;
        const w = wy(n, [[x + y, '那是兩種分法相差的總數，還要除以每人相差的數目。'], [Number.isInteger(alt) ? alt : 0, '一多一少，要把兩個數加起來，不是相減。']]);
        return o('lw-basic', `把一些${it}分給小朋友。每人分 ${a} ${u}，多 ${x} ${u}；每人分 ${b} ${u}，少 ${y} ${u}。有幾位小朋友？`, n, '兩種分法一共差多少？每人差多少？',
          `一多一少，相差 ${x}＋${y}＝${x + y}；每人差 ${b}－${a}＝${g}；${x + y}÷${g}＝${n} 位。`, ks(w), `(${x}+${y})/(${b}-${a})`, [],
          { why: w, svg: bsvg([{ l: `每${a}`, p: [[a * n, 'a', `每人${a}`], [x, 'd', `多${x}`]] }, { l: `每${b}`, p: [[b * n - y, 'b', `每人${b}`], [y, 'd', `少${y}`, 1]] }]) });
      },
      (r, p) => {
        const { n, g, a, b } = mk5(r, p), x = g * n, [it, u] = pick(r, IT5);
        const w = wy(n, [[x, `${x} 是多出來的${it}數目，還要除以每人相差的數目。`], [x * g, '要除以每人相差的，不是乘。']]);
        return o('lw-exact', `把一些${it}分給小朋友。每人分 ${a} ${u}，多 ${x} ${u}；每人分 ${b} ${u}，剛好分完。有幾位小朋友？`, n, '多分幾次才剛好用完多出來的？',
          `每人多分 ${b}－${a}＝${g}，多出的 ${x} 要分完：${x}÷${g}＝${n} 位。`, ks(w), `${x}/${b - a}`, [],
          { why: w, svg: bsvg([{ l: `每${a}`, p: [[a * n, 'a', `每人${a}`], [x, 'd', `多${x}`]] }, { l: `每${b}`, p: [[b * n, 'b', `每人${b}`]] }]) });
      }
    ],
    B: [
      /* both surplus: subtract */
      (r, p) => {
        const { n, g, a, b } = mk5(r, p), y = ri(r, 1, 10), x = y + g * n, [it, u] = pick(r, IT5);
        const w = wy(n, [[x - y, `${x}－${y}＝${x - y} 是相差的總數，還要除以每人相差的數目。`], [(x + y) % g === 0 ? (x + y) / g : 0, '兩次都多，要相減，不是相加。']]);
        return o('lw-both', `把一些${it}分給小朋友。每人分 ${a} ${u}，多 ${x} ${u}；每人分 ${b} ${u}，也多 ${y} ${u}。有幾位小朋友？`, n, '兩次都有剩，差距是兩個剩數的差。',
          `都多：${x}－${y}＝${x - y}；每人差 ${g}；${x - y}÷${g}＝${n} 位。`, ks(w), `(${x}-${y})/${b - a}`, [],
          { why: w, svg: bsvg([{ l: `每${a}`, p: [[a * n, 'a', `每人${a}`], [x, 'd', `多${x}`]] }, { l: `每${b}`, p: [[b * n, 'b', `每人${b}`], [y, 'd', `多${y}`]] }]) });
      },
      /* both deficit: subtract */
      (r, p) => {
        const { n, g, a, b } = mk5(r, p), x = ri(r, 1, 10), y = x + g * n, [it, u] = pick(r, IT5);
        const w = wy(n, [[y - x, `${y}－${x}＝${y - x} 是相差的總數，還要除以每人相差的數目。`], [(x + y) % g === 0 ? (x + y) / g : 0, '兩次都少，要相減，不是相加。']]);
        return o('lw-short', `把一些${it}分給小朋友。每人分 ${a} ${u}，少 ${x} ${u}；每人分 ${b} ${u}，也少 ${y} ${u}。有幾位小朋友？`, n, '兩次都不夠，差距是兩個缺數的差。',
          `都少：${y}－${x}＝${y - x}；每人差 ${g}；${y - x}÷${g}＝${n} 位。`, ks(w), `(${y}-${x})/${b - a}`, [], { why: w });
      },
      /* ask the total: one extra step after the number of children */
      (r, p) => {
        const { n, g, a, b } = mk5(r, p), x = ri(r, 1, g * n - 1), y = g * n - x, [it, u] = pick(r, IT5), tot = a * n + x;
        const w = wy(tot, [[n, '那是小朋友的人數，題目問' + it + '一共有幾' + u + '。'], [b * n, `每人 ${b} ${u}還少 ${y} ${u}，這不是${it}的數目。`], [a * n, `每人 ${a} ${u}之後還多 ${x} ${u}。`]]);
        return o('lw-total', `把一些${it}分給小朋友。每人分 ${a} ${u}，多 ${x} ${u}；每人分 ${b} ${u}，少 ${y} ${u}。${it}一共有幾${u}？`, tot, '先求有幾位小朋友。',
          `${x}＋${y}＝${x + y}，÷${g}＝${n} 位；${it}共 ${a}×${n}＋${x}＝${tot} ${u}。`, ks(w), `${a}*(${x}+${y})/${b - a}+${x}`, [],
          { why: w, svg: bsvg([{ l: `每${a}`, p: [[a * n, 'a', `每人${a}`], [x, 'd', `多${x}`]] }, { l: `每${b}`, p: [[b * n - y, 'b', `每人${b}`], [y, 'd', `少${y}`, 1]] }]) });
      }
    ]
  };
  const verify45 = q => {
    let m;
    if ((m = /^把一些.+分給小朋友。每人分 (\d+) .，多 (\d+) .；每人分 (\d+) .，少 (\d+) .。(有幾位小朋友|.+一共有幾.)？$/.exec(q.q))) {
      const a = +m[1], x = +m[2], b = +m[3], y = +m[4];
      for (let n = 1; n <= 200; n++) if (a * n + x === b * n - y) return String(/有幾位/.test(m[5]) ? n : a * n + x);
      return 'none';
    }
    if ((m = /^把一些.+分給小朋友。每人分 (\d+) .，多 (\d+) .；每人分 (\d+) .，剛好分完/.exec(q.q))) { for (let n = 1; n <= 200; n++) if (+m[1] * n + +m[2] === +m[3] * n) return String(n); return 'none'; }
    if ((m = /^把一些.+分給小朋友。每人分 (\d+) .，多 (\d+) .；每人分 (\d+) .，也多 (\d+) ./.exec(q.q))) { for (let n = 1; n <= 200; n++) if (+m[1] * n + +m[2] === +m[3] * n + +m[4]) return String(n); return 'none'; }
    if ((m = /^把一些.+分給小朋友。每人分 (\d+) .，少 (\d+) .；每人分 (\d+) .，也少 (\d+) ./.exec(q.q))) { for (let n = 1; n <= 200; n++) if (+m[1] * n - +m[2] === +m[3] * n - +m[4]) return String(n); return 'none'; }
    return null;
  };
  const sc45a = { w: 'bars', p: { rows: [{ label: '每5', segs: [{ u: 5, rep: 5, c: 'a' }, solid(6, 'd', '多6')] }, { label: '每7', segs: [{ u: 7, rep: 4, c: 'b' }, solid(3, 'b', '3'), { u: 4, c: 'd', dashed: true, text: '少4' }] }] } };
  const gap10 = { rows: [{ label: '差', segs: [solid(10, 't', '10')] }, { label: '份', segs: [{ u: 2, rep: 1, c: 'd', edit: true, target: 5, min: 1, max: 7 }] }] };
  WQOly.register({
    id: 'p4-5', grade: 4, n: 5, title: '盈虧問題', icon: '🍬',
    card: { motto: '差÷每人差', example: '多 6、少 4：差 10', art: art45 },
    lesson: [
      { t: 'show', say: '每人分 5 粒，多 6 粒。每人分 7 粒，少 4 粒。', scene: Object.assign({ still: true }, sc45a) },
      { t: 'show', say: '兩種分法，一共差 6＋4＝10 粒。', scene: { w: 'bars', p: { rows: [{ label: '多', segs: [solid(6, 'd', '6'), solid(4, 'b', '4')] }, { label: '差', segs: [solid(10, 't', '10')] }] }, still: true } },
      { t: 'predict', say: '每人多分 2 粒，一共多用 10 粒。', ask: '有幾位小朋友？', options: ['2', '5', '10'], answer: '5', scene: { w: 'bars', p: gap10, still: true }, reveal: '10 粒裏有 5 個 2，所以有 5 位。' },
      { t: 'do', say: '把「2」拉到和 10 一樣長。', scene: { w: 'bars', p: gap10 } },
      { t: 'show', say: '5 位小朋友。糖有 5×5＋6＝31 粒。', scene: Object.assign({ still: true }, sc45a) },
      { t: 'do', say: '每人分 3 粒多 8，分 5 粒多 2。8－2＝6，每人差 2，拉到一樣長。', scene: { w: 'bars', p: { rows: [{ label: '差', segs: [solid(6, 't', '6')] }, { label: '份', segs: [{ u: 2, rep: 1, c: 'd', edit: true, target: 3, min: 1, max: 5 }] }] } } },
      { t: 'try', say: '一多一少，把兩個數加起來。', scene: { w: 'bars', p: { rows: [{ label: '差', segs: [solid(8, 't', '8')] }, { label: '份', segs: [{ u: 2, rep: 1, c: 'd', edit: true, target: 4, min: 1, max: 5 }] }] }, still: true },
        q: { stem: '每人分 4 粒，多 6 粒；每人分 6 粒，少 2 粒。有幾位小朋友？', options: ['2', '4', '8'], answer: '4', hint: '6＋2 是相差的總數，每人差 2。', why: { 8: '8 是相差的總數，還要除以每人差的 2。', 2: '一多一少要相加，不是相減。' } } },
      { t: 'card' }
    ],
    gens: g45, verify: verify45
  });
})();
