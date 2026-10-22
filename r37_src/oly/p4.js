/* 小四 · 5 units. p4-1 雞兔同籠 is a finished reference unit; the others are drafts (stubs). */
(function () {
  'use strict';
  const { o, N, ri, pick } = WQOly.helpers;

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

  /* ---- drafts (stubs) ------------------------------------------------------------------------------------------------- */
  WQOly.register(WQOly.stub({ id: 'p4-2', title: '高斯求和', icon: '➕', motto: '頭尾配對', example: '1＋…＋10＝11×5', legacy: { A: [[1, 1]], B: [[1, 2]], s: .6 } }));
  WQOly.register(WQOly.stub({ id: 'p4-3', title: '植樹進階', icon: '🌳', motto: '看兩端、看圍圈', example: '圍圈：棵數＝段數', legacy: { A: [[2, 2]], B: [[2, 3]], s: .7 } }));
  WQOly.register(WQOly.stub({ id: 'p4-4', title: '握手與組合', icon: '🤝', motto: '每人握手再除 2', example: '5 人：5×4÷2＝10', legacy: { A: [[4, 1]], B: [[4, 4]], s: .5 } }));
  WQOly.register(WQOly.stub({ id: 'p4-5', title: '盈虧問題', icon: '🍬', motto: '差÷每人差', example: '多 6、少 4：差 10', legacy: { A: [[5, 2]], B: [[5, 2]], s: .6 } }));
})();
