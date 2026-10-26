/* 小四 · 5 units. p4-1 雞兔同籠 is the reference unit; p4-2 至 p4-5（g34）使用現成教具 pairing / numline / rowplace / dotgraph / bars，沒有新增工具。 */
(function () {
  'use strict';
  const { o, N, ri, pick, name } = WQOly.helpers;
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
  const cage = (H, F, e1, e2, lbl) => {
    const per = H > 10 ? Math.ceil(H / 2) : H, rows = Math.ceil(H / per), d = Math.min(26, 150 / per);
    let s = '';
    for (let i = 0; i < H; i++) { const r = Math.floor(i / per), c = i % per, n = r === rows - 1 ? H - r * per : per, x = 85 + (c - (n - 1) / 2) * d, y = 17 + r * 28; s += `<circle cx="${x}" cy="${y}" r="${d * .42}" fill="#1b2160" stroke="#3ee6d0" stroke-width="1.8"/><text x="${x}" y="${y + 1}" text-anchor="middle" dominant-baseline="central" font-size="${d * .5}" font-weight="900" fill="#c3cbf7">?</text>`; }
    return `<svg viewBox="0 0 170 ${rows * 28 + 22}" role="img" aria-label="${lbl || `${H} 隻頭，${F} 隻腳`}">${s}<text x="85" y="${rows * 28 + 13}" text-anchor="middle" font-size="12" font-weight="900" fill="#ffc94a">${lbl || `${H} 隻頭 · ${F} 隻腳`}</text></svg>`;
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

  /* ---- R3.31 variety: extra settings for 雞兔同籠 (new generators only; the ones above are untouched) ---- */
  TH.push(
    { n1: '鴨', n2: '羊', l1: 2, l2: 4, part: '腳', u: '隻', at: '農場裏' },
    { n1: '蜻蜓', n2: '蜘蛛', l1: 6, l2: 8, part: '腳', u: '隻', at: '花園裏' },
    { n1: '電單車', n2: '汽車', l1: 2, l2: 4, part: '輪', u: '輛', at: '停車場裏' },
    { n1: '小鳥', n2: '小狗', l1: 2, l2: 4, part: '腳', u: '隻', at: '公園裏' });
  const ppOf = th => th.part === '腳' ? '隻腳' : '個輪';
  const lblOf = (th, H, F) => `${H} ${th.part === '腳' ? '隻頭' : '輛車'} · ${F} ${ppOf(th)}`;
  const COIN = [[1, 2], [2, 5], [1, 5], [5, 10], [2, 10]];
  const BOAT = [[5, 3], [6, 4], [8, 4], [6, 3], [7, 4], [10, 6], [4, 2], [9, 5]];
  g41.A.push(
    /* same method, new animals and vehicles */
    (r, p) => {
      const th = pick(r, TH.slice(2)), H = N(r, p, 4, 15), t = ri(r, 1, H - 1), c = H - t, F = th.l1 * c + th.l2 * t, ask2 = r() < .5, D = F - th.l1 * H, dl = th.l2 - th.l1, ans = ask2 ? t : c, pp = ppOf(th);
      return o('cr-basic', `${th.at}有${th.n1}和${th.n2}共 ${H} ${th.u}，共 ${F} ${pp}。${ask2 ? th.n2 : th.n1}有幾${th.u}？`, ans,
        `先假設全部是${th.n1}。`, `假設 ${H} ${th.u}全是${th.n1}：${H}×${th.l1}＝${th.l1 * H}，少了 ${D} ${pp}；每換 1 ${th.u}多 ${dl}，${D}÷${dl}＝${t}，所以${th.n2} ${t} ${th.u}、${th.n1} ${c} ${th.u}。`,
        [ask2 ? c : t, D, F - H, ans + 1], `${ask2 ? D + '/' + dl : H + '-' + D + '/' + dl}`, [],
        { svg: cage(H, F, 0, 0, lblOf(th, H, F)), why: { [ask2 ? c : t]: `你算出的是${ask2 ? th.n1 : th.n2}的數目，題目問${ask2 ? th.n2 : th.n1}。`, [D]: `${D} 是比全${th.n1}多出的${th.part}，還要除以 ${dl}。` } });
    },
    /* same method, told by a named child */
    (r, p) => {
      const th = pick(r, TH.slice(1)), who = name(r), H = N(r, p, 4, 15), t = ri(r, 1, H - 1), c = H - t, F = th.l1 * c + th.l2 * t, ask2 = r() < .5, D = F - th.l1 * H, dl = th.l2 - th.l1, ans = ask2 ? t : c, pp = ppOf(th);
      return o('cr-basic', `${who}在${th.at}數到${th.n1}和${th.n2}共 ${H} ${th.u}，共 ${F} ${pp}。${ask2 ? th.n2 : th.n1}有幾${th.u}？`, ans,
        `先假設全部是${th.n1}。`, `假設 ${H} ${th.u}全是${th.n1}：${H}×${th.l1}＝${th.l1 * H}，少了 ${D} ${pp}；每換 1 ${th.u}多 ${dl}，${D}÷${dl}＝${t}，所以${th.n2} ${t} ${th.u}、${th.n1} ${c} ${th.u}。`,
        [ask2 ? c : t, D, F - H, ans + 1], `${ask2 ? D + '/' + dl : H + '-' + D + '/' + dl}`, [],
        { svg: cage(H, F, 0, 0, lblOf(th, H, F)), why: { [ask2 ? c : t]: `你算出的是${ask2 ? th.n1 : th.n2}的數目，題目問${ask2 ? th.n2 : th.n1}。`, [D]: `${D} 是比全${th.n1}多出的${th.part}，還要除以 ${dl}。` } });
    },
    /* first step only: assume all of one kind */
    (r, p) => {
      const th = pick(r, TH), H = N(r, p, 4, 15), t = ri(r, 1, H - 1), c = H - t, F = th.l1 * c + th.l2 * t, D = F - th.l1 * H, pp = ppOf(th), ask1 = r() < .5, ans = ask1 ? th.l1 * H : D;
      const head = `${th.at}有${th.n1}和${th.n2}共 ${H} ${th.u}，共 ${F} ${pp}。`;
      return o('cr-assume', head + (ask1 ? `若全是${th.n1}，會有幾${pp}？` : `若全當作${th.n1}來算，實際比它多出幾${pp}？`), ans,
        `全是${th.n1}時，每${th.u}有 ${th.l1} ${th.part === '腳' ? '隻腳' : '個輪'}。`,
        ask1 ? `全是${th.n1}：${H}×${th.l1}＝${ans} ${pp}。` : `全是${th.n1}有 ${H}×${th.l1}＝${th.l1 * H} ${pp}；實際 ${F}，多出 ${F}－${th.l1 * H}＝${D} ${pp}。`,
        [ask1 ? F : th.l1 * H, ask1 ? D : F, H * th.l2, ans + 1], ask1 ? `${H}*${th.l1}` : `${F}-${H}*${th.l1}`, [],
        { svg: cage(H, F, 0, 0, lblOf(th, H, F)), why: { [ask1 ? F : th.l1 * H]: ask1 ? `${F} 是實際的${th.part}數，題目問的是全當作${th.n1}。` : `${th.l1 * H} 是全當作${th.n1}的${th.part}數，還要和實際的 ${F} 比較。`, [H * th.l2]: `那是全當作${th.n2}的${th.part}數。` } });
    });
  g41.B.push(
    /* test score: right + wrong */
    (r, p) => {
      const a = pick(r, [3, 4, 5]), b = ri(r, 1, 2), H = N(r, p, 6, 16), w = ri(r, 1, Math.floor(H / 2)), S = a * (H - w) - b * w, who = name(r), askR = r() < .5, D = a * H - S, ans = askR ? H - w : w;
      return o('cr-score', `一份試卷共 ${H} 題，答對一題得 ${a} 分，答錯一題扣 ${b} 分。${who}全部作答，得 ${S} 分，答${askR ? '對' : '錯'}幾題？`, ans,
        '先假設全部答對。', `全對有 ${H}×${a}＝${a * H} 分，比實際多 ${a * H}－${S}＝${D} 分；錯 1 題少 ${a}＋${b}＝${a + b} 分，${D}÷${a + b}＝${w}，所以答錯 ${w} 題、答對 ${H - w} 題。`,
        [askR ? w : H - w, D, a * H, ans + 1], askR ? `${H}-${D}/${a + b}` : `${D}/${a + b}`, [],
        { why: { [askR ? w : H - w]: `你算出的是答${askR ? '錯' : '對'}的題數，題目問答${askR ? '對' : '錯'}。`, [D]: `${D} 是比全對少了的分數，每錯一題少 ${a + b} 分，還要除。` } });
    },
    /* legs of rabbits minus legs of chickens */
    (r, p) => {
      const H = N(r, p, 5, 18), t = ri(r, Math.floor(H / 3) + 1, H - 1), c = H - t, d = 4 * t - 2 * c, askR = r() < .5, ans = askR ? t : c, X = d + 2 * H;
      return o('cr-legdiff', `雞和兔共 ${H} 隻，兔的腳比雞的腳多 ${d} 隻。${askR ? '兔' : '雞'}有幾隻？`, ans,
        '先假設全部是雞，看看兔腳比雞腳少多少。', `全是雞時，${H} 隻共 ${2 * H} 隻腳，兔腳比雞腳少 ${2 * H}；實際多 ${d}，要增加 ${d}＋${2 * H}＝${X}；每把 1 隻雞換成兔，差距增加 4＋2＝6，${X}÷6＝${t}，所以兔 ${t} 隻、雞 ${c} 隻。`,
        [askR ? c : t, X, d, ans + 1], askR ? `${X}/6` : `${H}-${X}/6`, [],
        { why: { [askR ? c : t]: `你算出的是${askR ? '雞' : '兔'}的隻數，題目問${askR ? '兔' : '雞'}。`, [X]: `${X} 是要增加的差距，每換一隻差距增加 6，還要除以 6。` } });
    },
    /* coins instead of animals */
    (r, p) => {
      const [a, b] = pick(r, COIN), H = N(r, p, 4, 12), t = ri(r, 1, H - 1), c = H - t, V = a * c + b * t, ask2 = r() < .5, D = V - a * H, dl = b - a, who = name(r), ans = ask2 ? t : c;
      return o('cr-coin', `${who}的錢包有 ${a} 元和 ${b} 元硬幣共 ${H} 枚，共 ${V} 元。${ask2 ? b : a} 元硬幣有幾枚？`, ans,
        `先假設全部是 ${a} 元硬幣。`, `假設 ${H} 枚全是 ${a} 元：${H}×${a}＝${a * H} 元，少了 ${D} 元；每換 1 枚多 ${dl} 元，${D}÷${dl}＝${t}，所以 ${b} 元硬幣 ${t} 枚、${a} 元硬幣 ${c} 枚。`,
        [ask2 ? c : t, D, V - H, ans + 1], `${ask2 ? D + '/' + dl : H + '-' + D + '/' + dl}`, [],
        { svg: cage(H, V, 0, 0, `${H} 枚 · ${V} 元`), why: { [ask2 ? c : t]: `你算出的是 ${ask2 ? a : b} 元硬幣的枚數，題目問 ${ask2 ? b : a} 元。`, [D]: `${D} 是比全部 ${a} 元多出的錢，還要除以 ${dl}。` } });
    },
    /* coins: how much money is in one kind */
    (r, p) => {
      const [a, b] = pick(r, COIN), H = N(r, p, 4, 12), t = ri(r, 1, H - 1), c = H - t, V = a * c + b * t, D = V - a * H, dl = b - a, who = name(r), askB = r() < .5, x = askB ? b : a, n = askB ? t : c, val = n * x;
      return o('cr-coinval', `${who}的錢包有 ${a} 元和 ${b} 元硬幣共 ${H} 枚，共 ${V} 元。${x} 元硬幣共值多少元？`, val,
        `先求 ${x} 元硬幣有幾枚。`, `假設全是 ${a} 元：${H}×${a}＝${a * H} 元，少了 ${D} 元；每換 1 枚多 ${dl} 元，${D}÷${dl}＝${t} 枚 ${b} 元、${c} 枚 ${a} 元；${x} 元硬幣有 ${n} 枚，${n}×${x}＝${val} 元。`,
        [n, askB ? c * a : t * b, V, val + x], `${n}*${x}`, [],
        { svg: cage(H, V, 0, 0, `${H} 枚 · ${V} 元`), why: { [n]: `${n} 是 ${x} 元硬幣的枚數，題目問它們共值多少元。`, [askB ? c * a : t * b]: `你算的是另一種硬幣共值的錢。` } });
    },
    /* boats: big boat holds more people */
    (r, p) => {
      const [a, b] = pick(r, BOAT), H = N(r, p, 4, 12), t = ri(r, 1, H - 1), c = H - t, V = a * t + b * c, D = V - b * H, dl = a - b, who = name(r), askBig = r() < .5, ans = askBig ? t : c;
      return o('cr-boat', `${who}一家租船，大船坐 ${a} 人，小船坐 ${b} 人。共租 ${H} 條船，剛好坐滿 ${V} 人。${askBig ? '大' : '小'}船租了幾條？`, ans,
        '先假設全部是小船。', `假設全是小船：${H}×${b}＝${b * H} 人，少了 ${D} 人；每把 1 條小船換成大船多坐 ${dl} 人，${D}÷${dl}＝${t}，所以大船 ${t} 條、小船 ${c} 條。`,
        [askBig ? c : t, D, V - H, ans + 1], askBig ? `${D}/${dl}` : `${H}-${D}/${dl}`, [],
        { svg: cage(H, V, 0, 0, `${H} 條船 · ${V} 人`), why: { [askBig ? c : t]: `你算出的是${askBig ? '小' : '大'}船的條數，題目問${askBig ? '大' : '小'}船。`, [D]: `${D} 是比全小船少坐的人，每換一條多坐 ${dl} 人，還要除以 ${dl}。` } });
    });

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


  const verify41b = q => {
    let m;
    if ((m = /^\S+的錢包有 (\d+) 元和 (\d+) 元硬幣共 (\d+) 枚，共 (\d+) 元。(\d+) 元硬幣有幾枚/.exec(q.q))) {
      const a = +m[1], b = +m[2], H = +m[3], V = +m[4];
      for (let t = 0; t <= H; t++) if (a * (H - t) + b * t === V) return String(+m[5] === b ? t : H - t);
      return 'none';
    }
    if ((m = /^\S+的錢包有 (\d+) 元和 (\d+) 元硬幣共 (\d+) 枚，共 (\d+) 元。(\d+) 元硬幣共值多少元/.exec(q.q))) {
      const a = +m[1], b = +m[2], H = +m[3], V = +m[4];
      for (let t = 0; t <= H; t++) if (a * (H - t) + b * t === V) return String((+m[5] === b ? t : H - t) * +m[5]);
      return 'none';
    }
    if ((m = /^\S+在(.+?)數到(.+?)和(.+?)共 (\d+) .，共 (\d+) .+。(.+?)有幾/.exec(q.q))) {
      const th = TH.find(t => t.n1 === m[2]), H = +m[4], F = +m[5];
      for (let t = 0; t <= H; t++) if (th.l1 * (H - t) + th.l2 * t === F) return String(m[6] === th.n2 ? t : H - t);
      return 'none';
    }
    if ((m = /^(.+)有(.+?)和(.+?)共 (\d+) .，共 (\d+) .+。若全是(.+?)，會有幾/.exec(q.q))) { const th = TH.find(t => t.n1 === m[2]); return String(th.l1 * +m[4]); }
    if ((m = /^(.+)有(.+?)和(.+?)共 (\d+) .，共 (\d+) .+。若全當作(.+?)來算，實際比它多出幾/.exec(q.q))) { const th = TH.find(t => t.n1 === m[2]); return String(+m[5] - th.l1 * +m[4]); }
    if ((m = /^一份試卷共 (\d+) 題，答對一題得 (\d+) 分，答錯一題扣 (\d+) 分。\S+全部作答，得 (\d+) 分，答(.)幾題/.exec(q.q))) {
      const H = +m[1];
      for (let w = 0; w <= H; w++) if ((+m[2]) * (H - w) - (+m[3]) * w === +m[4]) return String(m[5] === '對' ? H - w : w);
      return 'none';
    }
    if ((m = /^雞和兔共 (\d+) 隻，兔的腳比雞的腳多 (\d+) 隻。(.)有幾隻/.exec(q.q))) {
      const H = +m[1];
      for (let c = 0; c <= H; c++) if (4 * (H - c) - 2 * c === +m[2]) return String(m[3] === '兔' ? H - c : c);
      return 'none';
    }
    if ((m = /^\S+一家租船，大船坐 (\d+) 人，小船坐 (\d+) 人。共租 (\d+) 條船，剛好坐滿 (\d+) 人。(.)船租了幾條/.exec(q.q))) {
      const H = +m[3];
      for (let t = 0; t <= H; t++) if ((+m[1]) * t + (+m[2]) * (H - t) === +m[4]) return String(m[5] === '大' ? t : H - t);
      return 'none';
    }
    return verify41(q);
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
    gens: g41, verify: verify41b
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

  /* ---- R3.31 variety: extra settings for 高斯求和 (level A) ---- */
  const tri = n => n * (n + 1) / 2;
  const ACT2 = [['存', '元', '存了'], ['摺', '隻紙鶴', '摺了'], ['讀', '頁書', '讀了'], ['跳', '下繩', '跳了'], ['做', '道題', '做了']];
  const OBJ2 = [['杯子', '個'], ['罐頭', '罐'], ['橙', '個'], ['積木', '塊'], ['汽水瓶', '支'], ['波', '個']];
  const pyrSvg = n => {
    const d = Math.min(16, 200 / n), rr = d * .38, h = n * d * .86 + 12; let sv = '';
    for (let i = 1; i <= n; i++) for (let j = 0; j < i; j++) sv += `<circle cx="${120 + (j - (i - 1) / 2) * d}" cy="${8 + (i - 1) * d * .86}" r="${rr}" fill="#3ee6d0"/>`;
    return `<svg viewBox="0 0 240 ${h}" role="img" aria-label="三角形，最上層 1 個，最下層 ${n} 個">${sv}</svg>`;
  };
  g42.A.push(
    /* 1+2+...+n told as a daily habit */
    (r, p) => {
      const C = name(r), [v, u, v2] = pick(r, ACT2), n = N(r, p, 4, 15), ans = tri(n);
      const w = wy(ans, [[n * (n + 1), `每天的數目不同，不是每對乘一次；(1＋${n})×${n} 還要除以 2。`], [n * n, `每天不是都${v} ${n} ${u}，前面幾天少一些。`], [tri(n - 1), `漏了第 ${n} 天的 ${n} ${u}。`]]);
      return o('gs-save', `${C}第 1 天${v} 1 ${u}，第 2 天${v} 2 ${u}，…，第 ${n} 天${v} ${n} ${u}。一共${v2}多少${u}？`, ans, '把 1 到最後一天的數加起來。',
        `1＋2＋…＋${n}＝(1＋${n})×${n}÷2＝${ans}。`, ks(w), `${n}*(${n}+1)/2`, [], { why: w });
    },
    /* one pair only */
    (r, p) => {
      const C = name(r), n = N(r, p, 5, 60), k = Math.floor(r() * 3), ans = n + 1;
      const q = k === 0 ? `1＋2＋3＋…＋${n}，頭尾配對（1 配 ${n}），每對的和是多少？` : k === 1 ? `把 1 到 ${n} 這些數頭尾配對，每一對的和是多少？` : `${C}想算 1＋2＋…＋${n}。先把第一個數和最後一個數配成一對，這一對的和是多少？`;
      const w = wy(ans, [[n, `${n} 只是最後一個數，要加上配對的 1。`], [tri(n), '那是全部加起來的和，這裏只問一對。'], [n - 1, `1 要和 ${n} 相加，不是相減。`]]);
      return o('gs-pairsum', q, ans, '頭尾兩個數相加。', `1＋${n}＝${ans}，每一對的和都是 ${ans}。`, ks(w), `${n}+1`, [], { why: w });
    },
    /* a run that does not start at 1 */
    (r, p) => {
      const C = name(r), a = ri(r, 2, N(r, p, 3, 12)), k = N(r, p, 4, 10), b = a + k - 1, ans = (a + b) * k / 2, form = r() < .5;
      const q = form ? `${a}＋${a + 1}＋${a + 2}＋…＋${b}＝？` : `${C}從 ${a} 開始，依次加 ${a + 1}、${a + 2}…，一直加到 ${b}。和是多少？`;
      const w = wy(ans, [[(a + b) * k, '首尾和乘個數後，還要除以 2。'], [k, '那只是有幾個數。'], [tri(b), `這是從 1 開始加到 ${b}，這裏要從 ${a} 開始。`], [(a + b) * (k - 1) / 2, `${b}－${a} 不是個數，從 ${a} 到 ${b} 共 ${k} 個數。`]]);
      return o('gs-range', q, ans, '先數有幾個數。', `共 ${b}－${a}＋1＝${k} 個數；${a}＋${b}＝${a + b}；${a + b}×${k}÷2＝${ans}。`, ks(w), `(${a}+${b})*${k}/2`, [], { why: w });
    },
    /* how many numbers (both ends counted) */
    (r, p) => {
      const C = name(r), a = ri(r, 2, N(r, p, 3, 15)), k = N(r, p, 4, 14), b = a + k - 1, f = Math.floor(r() * 3);
      const q = f === 0 ? `${a} 到 ${b}（包括 ${a} 和 ${b}），共有幾個數？` : f === 1 ? `${C}由第 ${a} 頁讀到第 ${b} 頁（兩頁都讀），共讀了幾頁？` : `門牌由 ${a} 號到 ${b} 號，每個號碼都有一間屋，共有幾間屋？`;
      const w = wy(k, [[b - a, `${b}－${a} 是間隔數，頭尾都要算，還要加 1。`], [b, `${b} 只是最後一個數，不是個數。`], [b - a + 2, '多加了一個，頭尾只加 1 次。']]);
      return o('gs-num', q, k, '頭尾都要算進去。', `${b}－${a}＝${k - 1}，頭尾都算，再加 1：${k - 1}＋1＝${k}。`, ks(w), `${b}-${a}+1`, [], { why: w });
    },
    /* find the last number */
    (r, p) => {
      const C = name(r), n = N(r, p, 4, 14), T = tri(n), f = r() < .5;
      const q = f ? `從 1 起連續整數相加：1＋2＋3＋…，和是 ${T} 時，最後加的數是多少？` : `${C}從 1 開始連續加，加到某個數時和是 ${T}。最後加的數是多少？`;
      const w = wy(n, [[n + 1, `${n}×${n + 1} 中較小的是 ${n}，那才是最後加的數。`], [n - 1, `加到 ${n - 1} 的和只有 ${tri(n - 1)}。`], [T / 2 % 1 === 0 ? T / 2 : 0, '和的一半不是最後一個數。']]);
      return o('gs-back', q, n, '和的 2 倍＝最後一個數×(最後一個數＋1)。', `和的 2 倍是 ${2 * T}＝${n}×${n + 1}，所以最後加的數是 ${n}。`, ks(w), '', [], { why: w });
    },
    /* write it backwards and add the two rows */
    (r, p) => {
      const C = name(r), n = N(r, p, 4, 20), ans = n * (n + 1);
      const w = wy(ans, [[tri(n), '那是原來的和，這裏問的是兩行合共。'], [n + 1, '那是一列的和，還有 ' + n + ' 列。'], [n * n, `每一列是 1＋${n}＝${n + 1}，不是 ${n}。`]]);
      return o('gs-double', `${C}把 1＋2＋…＋${n} 倒過來寫成 ${n}＋…＋2＋1，再上下相加。兩行的總和是多少？`, ans, '上下對齊，每一列的和是多少？',
        `每一列 1＋${n}＝${n + 1}，共 ${n} 列：${n + 1}×${n}＝${ans}，這是原來和的 2 倍。`, ks(w), `${n}*(${n}+1)`, [], { why: w });
    },
    /* triangle stack */
    (r, p) => {
      const [ob, cl] = pick(r, OBJ2), n = N(r, p, 4, 14), ans = tri(n);
      const w = wy(ans, [[n * (n + 1), '每個被算了兩次，要除以 2。'], [n * n, `最上層只有 1 ${cl}，不是每層 ${n} ${cl}。`], [tri(n - 1), `漏了最下層的 ${n} ${cl}。`]]);
      return o('gs-pyramid', `把${ob}疊成三角形：最上層 1 ${cl}，第 2 層 2 ${cl}，…，最下層 ${n} ${cl}。共用幾${cl}？`, ans, '每層的數目加起來。',
        `1＋2＋…＋${n}＝(1＋${n})×${n}÷2＝${ans}。`, ks(w), `${n}*(${n}+1)/2`, [], { why: w, svg: pyrSvg(n) });
    });
  const verify42b = q => {
    let m;
    if ((m = /^\S+第 1 天. 1 .+?，第 2 天. 2 .+?，…，第 (\d+) 天/.exec(q.q))) return String(tri(+m[1]));
    if ((m = /^1＋2＋3＋…＋(\d+)，頭尾配對（1 配 \d+），每對的和/.exec(q.q)) || (m = /^把 1 到 (\d+) 這些數頭尾配對/.exec(q.q)) || (m = /^\S+想算 1＋2＋…＋(\d+)。先把第一個數/.exec(q.q))) return String(+m[1] + 1);
    if ((m = /^\S+從 (\d+) 開始，依次加 .+一直加到 (\d+)。和是多少/.exec(q.q))) { let s = 0; for (let x = +m[1]; x <= +m[2]; x++) s += x; return String(s); }
    if ((m = /^(\d+) 到 (\d+)（包括/.exec(q.q)) || (m = /^\S+由第 (\d+) 頁讀到第 (\d+) 頁（兩頁都讀）/.exec(q.q)) || (m = /^門牌由 (\d+) 號到 (\d+) 號，/.exec(q.q))) { let c = 0; for (let x = +m[1]; x <= +m[2]; x++) c++; return String(c); }
    if ((m = /^從 1 起連續整數相加：1＋2＋3＋…，和是 (\d+) 時/.exec(q.q)) || (m = /^\S+從 1 開始連續加，加到某個數時和是 (\d+)。/.exec(q.q))) { let s = 0; for (let x = 1; x <= 300; x++) { s += x; if (s === +m[1]) return String(x); } return 'none'; }
    if ((m = /^\S+把 1＋2＋…＋(\d+) 倒過來寫成/.exec(q.q))) { let s = 0; for (let x = 1; x <= +m[1]; x++) s += x; return String(2 * s); }
    if ((m = /^把.+疊成三角形：最上層 1 .+最下層 (\d+) .。共用幾/.exec(q.q))) { let s = 0; for (let x = 1; x <= +m[1]; x++) s += x; return String(s); }
    return verify42(q);
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
    gens: g42, verify: verify42b
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

  /* ---- R3.31 variety: extra settings for 植樹進階 ---- */
  const CX3 = [['走廊', '擺', '個', '花盆'], ['公園小路', '放', '張', '長椅'], ['馬路', '裝', '盞', '路燈'], ['橋', '插', '面', '旗'], ['校園小徑', '放', '個', '垃圾桶']];
  const RING3 = ['環形跑道', '圓形花圃邊', '環湖小路', '圓形廣場邊', '圓形池塘邊'];
  g43.A.push(
    /* new settings, ends both / one */
    (r, p) => {
      const [road, v, cl, ob] = pick(r, CX3), [d, s, L] = seg43(r, p), both = r() < .5, ans = both ? s + 1 : s;
      const w = both ? wy(ans, [[s, '兩端都有，個數要比段數多 1。'], [s - 1, '那是兩端都沒有的算法。']]) : wy(ans, [[s + 1, '只有一端有，個數和段數一樣多。'], [s - 1, '一端有，不用減 1。']]);
      return o(both ? 'tp-both' : 'tp-one', `${L} 米長的${road}，每隔 ${d} 米${v}一${cl}${ob}，${both ? `兩端都${v}` : `只在一端${v}，另一端不${v}`}。共要${v}幾${cl}？`, ans, '先算有幾段，再看兩端。',
        both ? `${L}÷${d}＝${s} 段；兩端都有，${s}＋1＝${ans} ${cl}。` : `${L}÷${d}＝${s} 段；只有一端，${cl}數＝段數＝${ans}。`, ks(w), both ? `${L}/${d}+1` : `${L}/${d}`, [], { why: w, svg: roadSvg(Math.min(s, 20), both ? 'both' : 'one') });
    },
    /* find the gap */
    (r, p) => {
      const [road, v, cl, ob] = pick(r, CX3), d = pick(r, D3), s = N(r, p, 3, 20), n = s + 1, L = d * s;
      const w = wy(d, [[L % n === 0 ? L / n : 0, `兩端都有，間隔比${cl}數少 1，要除以 ${s}，不是 ${n}。`], [s, '間隔數不是答案，路長要除以間隔數。']]);
      return o('tp-gap', `${L} 米長的${road}，兩端都${v}${ob}，共${v}了 ${n} ${cl}，相鄰兩${cl}相隔幾米？`, d, `${n} ${cl}有幾個間隔？`,
        `${n} ${cl}有 ${n}－1＝${s} 個間隔；${L}÷${s}＝${d} 米。`, ks(w), `${L}/(${n}-1)`, [], { why: w, svg: roadSvg(Math.min(s, 20), 'both') });
    },
    /* how many gaps */
    (r, p) => {
      const [road, v, cl, ob] = pick(r, CX3), n = N(r, p, 5, 21), s = n - 1;
      const w = wy(s, [[n, '兩端都有，間隔比個數少 1。'], [n + 1, '間隔數不會比個數多。'], [n - 2, '兩端都有，只減 1。']]);
      return o('tp-seg', `${road}旁${v}了 ${n} ${cl}${ob}（兩端都有），共有幾個間隔？`, s, '像手指和指縫：頭尾都有，間隔少 1。',
        `${n} ${cl}，頭尾都有，間隔數＝${n}－1＝${s}。`, ks(w), `${n}-1`, [], { why: w, svg: roadSvg(Math.min(s, 20), 'both') });
    });
  g43.B.push(
    /* ring, new settings */
    (r, p) => {
      const th = pick(r, RING3), [, v, cl, ob] = pick(r, CX3), [d, s, L] = seg43(r, p), ans = s;
      const w = wy(ans, [[s + 1, '環形首尾相連，個數＝段數，不用加 1。'], [s - 1, '環形沒有兩端，不用減 1。']]);
      return o('tp-ring', `${th}一圈長 ${L} 米，每隔 ${d} 米${v}一${cl}${ob}。共要${v}幾${cl}？`, ans, '圍成一圈，起點和終點是同一處。',
        `${L}÷${d}＝${s} 段；環形的${cl}數＝段數＝${ans}。`, ks(w), `${L}/${d}`, [], { why: w, svg: roadSvg(Math.min(s, 20), 'circle') });
    },
    /* ring, find the gap */
    (r, p) => {
      const th = pick(r, RING3), [, v, cl, ob] = pick(r, CX3), d = pick(r, D3), n = N(r, p, 4, 20), L = d * n;
      const w = wy(d, [[L % (n - 1) === 0 ? L / (n - 1) : 0, '環形的間隔數就是個數，不用減 1。'], [L % (n + 1) === 0 ? L / (n + 1) : 0, '環形的間隔數就是個數，不用加 1。']]);
      return o('tp-ringgap', `${th}一圈長 ${L} 米，${v}了 ${n} ${cl}${ob}，相鄰兩${cl}相隔幾米？`, d, '環形：有幾個就有幾個間隔。',
        `${n} ${cl}就是 ${n} 個間隔；${L}÷${n}＝${d} 米。`, ks(w), `${L}/${n}`, [], { why: w, svg: roadSvg(Math.min(n, 20), 'circle') });
    },
    /* both sides, new settings */
    (r, p) => {
      const [road, v, cl, ob] = pick(r, CX3), [d, s, L] = seg43(r, p, 4), ans = 2 * (s + 1);
      const w = wy(ans, [[s + 1, '兩旁都要，要乘 2。'], [2 * s, '兩端都有，每旁還要加 1。']]);
      return o('tp-sides', `${L} 米長的${road}，兩旁每隔 ${d} 米各${v}一${cl}${ob}，兩端都${v}。共要${v}幾${cl}？`, ans, '先算一旁，再算兩旁。',
        `${L}÷${d}＝${s} 段；一旁 ${s}＋1＝${s + 1} ${cl}；兩旁 ${s + 1}×2＝${ans} ${cl}。`, ks(w), `(${L}/${d}+1)*2`, [], { why: w, svg: roadSvg(Math.min(s, 20), 'both') });
    });
  const verify43b = q => {
    let m;
    if ((m = /^(\d+) 米長的.+，每隔 (\d+) 米.一.+，兩端都.。共要.幾/.exec(q.q))) { let c = 0; for (let x = 0; x <= +m[1]; x += +m[2]) c++; return String(c); }
    if ((m = /^(\d+) 米長的.+，每隔 (\d+) 米.一.+，只在一端.，另一端不.。共要.幾/.exec(q.q))) { let c = 0; for (let x = 0; x < +m[1]; x += +m[2]) c++; return String(c); }
    if ((m = /^(\d+) 米長的.+，兩端都.+，共.了 (\d+) .，相鄰兩.相隔幾米/.exec(q.q))) { for (let d = 1; d <= +m[1]; d++) if (d * (+m[2] - 1) === +m[1]) return String(d); return 'none'; }
    if ((m = /^.+旁.了 (\d+) .+（兩端都有），共有幾個間隔/.exec(q.q))) return String(+m[1] - 1);
    if ((m = /^.+一圈長 (\d+) 米，每隔 (\d+) 米.一.+。共要.幾/.exec(q.q))) { let c = 0; for (let x = 0; x < +m[1]; x += +m[2]) c++; return String(c); }
    if ((m = /^.+一圈長 (\d+) 米，.了 (\d+) .+，相鄰兩.相隔幾米/.exec(q.q))) { for (let d = 1; d <= +m[1]; d++) if (d * +m[2] === +m[1]) return String(d); return 'none'; }
    if ((m = /^(\d+) 米長的.+，兩旁每隔 (\d+) 米各.一.+，兩端都.。共要.幾/.exec(q.q))) { let c = 0; for (let x = 0; x <= +m[1]; x += +m[2]) c += 2; return String(c); }
    return verify43(q);
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
    gens: g43, verify: verify43b
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

  /* ---- R3.31 variety: extra settings for 握手與組合 ---- */
  const CX4 = [['同學', '握手'], ['朋友', '碰杯'], ['小朋友', '擊掌'], ['鄰居', '打招呼'], ['乒乓球選手', '比賽'], ['象棋選手', '對弈'], ['隊員', '擊掌']];
  const LK4 = [['村莊', '路', '修', '條', '個'], ['小島', '橋', '建', '座', '個'], ['城市', '鐵路', '鋪', '條', '個'], ['學校', '電話線', '拉', '條', '間'], ['營地', '小徑', '開', '條', '個']];
  const GP4 = [['大人', '小孩'], ['教練', '球員'], ['老師', '家長'], ['廚師', '侍應'], ['醫生', '護士'], ['紅隊', '藍隊']];
  const ACT4 = ['握手', '碰杯', '擊掌'];
  const ptsSvg = (n, mode) => {
    let sv = '';
    if (mode === 'line') {
      sv = '<line x1="12" y1="26" x2="228" y2="26" stroke="#c3cbf7" stroke-width="2.4" stroke-linecap="round"/>';
      for (let i = 0; i < n; i++) sv += `<circle cx="${22 + i * (196 / Math.max(1, n - 1))}" cy="26" r="5" fill="#3ee6d0"/>`;
      return `<svg viewBox="0 0 240 52" role="img" aria-label="直線上有 ${n} 個點">${sv}</svg>`;
    }
    for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i / n * 2 * Math.PI; sv += `<circle cx="${120 + Math.cos(a) * 34}" cy="${46 + Math.sin(a) * 34}" r="5" fill="#3ee6d0"/>`; }
    return `<svg viewBox="0 0 240 92" role="img" aria-label="${n} 個點">${sv}</svg>`;
  };
  g44.A.push(
    /* the same handshake idea in other settings */
    (r, p) => {
      const n = N(r, p, 3, 10), ans = c2(n), [w, a] = pick(r, CX4);
      const wr = wy(ans, [[n * (n - 1), '每一次被算了兩次，要除以 2。'], [n * n, '一位不會和自己' + a + '。'], [c2(n + 1), '人數多算了一個。']]);
      return o('hs-hand', `${n} 位${w}，每兩位${a}一次。共${a}幾次？`, ans, '每位要和幾位' + a + '？', `每位${a} ${n - 1} 次，${n}×${n - 1}＝${n * (n - 1)}；每次算了兩遍，÷2＝${ans}。`, ks(wr), `${n}*(${n}-1)/2`, [], { why: wr });
    },
    /* links between places */
    (r, p) => {
      const n = N(r, p, 3, 10), ans = c2(n), [pl, lk, vb, cl, pc] = pick(r, LK4);
      const wr = wy(ans, [[n * (n - 1), '每條被算了兩次，要除以 2。'], [n - 1, '那只是從一個地方出發要連的數目。'], [n, '每個地方都連好幾條。']]);
      return o('hs-link', `${n} ${pc}${pl}，每兩${pc}${pl}之間${vb}一${cl}${lk}。共要${vb}幾${cl}？`, ans, '每個地方要連到幾個地方？', `每個連 ${n - 1} ${cl}，${n}×${n - 1}＝${n * (n - 1)}；每${cl}算了兩遍，÷2＝${ans}。`, ks(wr), `${n}*(${n}-1)/2`, [], { why: wr, svg: ptsSvg(n, 'circle') });
    },
    /* points and segments */
    (r, p) => {
      const n = N(r, p, 3, 10), ans = c2(n), k = Math.floor(r() * 3);
      const q = k === 0 ? `直線上有 ${n} 個點，以任意兩點為端點，共可得到幾條線段？` : k === 1 ? `圓周上有 ${n} 個點，每兩點連一條線段，共可連幾條？` : `一條直線上有 ${n} 個點，圖中共有幾條線段（長短都算）？`;
      const wr = wy(ans, [[n * (n - 1), '每條線段被算了兩次，要除以 2。'], [n - 1, '那只是相鄰兩點之間的線段。'], [n, '線段比點多得多。']]);
      return o('hs-seg', q, ans, '每個點可以和其他幾個點連成線段？', `每點連 ${n - 1} 條，${n}×${n - 1}＝${n * (n - 1)}；每條算了兩遍，÷2＝${ans}。`, ks(wr), `${n}*(${n}-1)/2`, [], { why: wr, svg: ptsSvg(n, k === 1 ? 'circle' : 'line') });
    },
    /* back to the number of people */
    (r, p) => {
      const n = N(r, p, 3, 10), T = c2(n), [w, a] = pick(r, CX4);
      const wr = wy(n, [[T, '那是次數，題目問人數。'], [n - 1, '少數了一位。'], [n + 1, '多數了一位。']]);
      return o('hs-back', `有些${w}，每兩位${a}一次，共${a}了 ${T} 次。有幾位${w}？`, n, '試試 3、4、5……位各' + a + '幾次。', `${n} 位${a} ${n}×${n - 1}÷2＝${T} 次，所以有 ${n} 位。`, ks(wr), '', [], { why: wr });
    },
    /* each person */
    (r, p) => {
      const n = N(r, p, 3, 10), [w, a] = pick(r, CX4), ans = n - 1;
      const wr = wy(ans, [[n, '一位不會和自己' + a + '。'], [c2(n), '那是全部人合共的次數。'], [n - 2, '只扣掉自己，不用再扣。']]);
      return o('hs-each', `${n} 位${w}互相${a}一次。每位要${a}幾次？`, ans, '不用和自己' + a + '。', `除了自己，還有 ${n}－1＝${ans} 位，所以每位要${a} ${ans} 次。`, ks(wr), `${n}-1`, [], { why: wr });
    },
    /* add everybody's count */
    (r, p) => {
      const n = N(r, p, 3, 10), [w, a] = pick(r, CX4), ans = n * (n - 1);
      const wr = wy(ans, [[c2(n), '這是實際的次數，題目問的是把大家的次數加起來。'], [n - 1, '那只是一位的次數。'], [n * n, '每位只和其他的人' + a + '。']]);
      return o('hs-double', `${n} 位${w}互相${a}一次，每位各${a}了 ${n - 1} 次。把大家的次數全加起來是多少？`, ans, '每位 ' + (n - 1) + ' 次，有 ' + n + ' 位。', `${n}×${n - 1}＝${ans}。每一次被兩個人各算了一次，所以實際次數是 ${ans}÷2＝${ans / 2}。`, ks(wr), `${n}*(${n}-1)`, [], { why: wr });
    });
  g44.B.push(
    /* two groups, within-group only */
    (r, p) => {
      const a = N(r, p, 3, 6), b = ri(r, 3, 6), [g1, g2] = pick(r, GP4), ac = pick(r, ACT4), ans = c2(a) + c2(b);
      const wr = wy(ans, [[c2(a + b), g1 + '和' + g2 + '之間不' + ac + '，要分開算。'], [a * b, g1 + '和' + g2 + '之間不' + ac + '。'], [c2(a) + b, g2 + '之間也要用「人數×(人數−1)÷2」。']]);
      return o('hs-groups', `${a} 位${g1}和 ${b} 位${g2}。${g1}之間、${g2}之間各自${ac}一次，${g1}和${g2}之間不${ac}。共${ac}幾次？`, ans, g1 + '和' + g2 + '分開算，再加起來。',
        `${g1} ${a}×${a - 1}÷2＝${c2(a)}；${g2} ${b}×${b - 1}÷2＝${c2(b)}；${c2(a)}＋${c2(b)}＝${ans}。`, ks(wr), `${a}*(${a}-1)/2+${b}*(${b}-1)/2`, [], { why: wr });
    },
    /* two groups, across + one group inside */
    (r, p) => {
      const a = ri(r, 2, 4), b = N(r, p, 3, 8), [g1, g2] = pick(r, GP4), ac = pick(r, ACT4), ans = a * b + c2(a);
      const wr = wy(ans, [[a * b, g1 + '之間也互相' + ac + '。'], [c2(a + b), g2 + '之間不' + ac + '。'], [a * b + a, g1 + '之間是 ' + a + '×' + (a - 1) + '÷2，不是 ' + a + '。']]);
      return o('hs-mix', `${a} 位${g1}和 ${b} 位${g2}。每位${g1}和每位${g2}${ac}一次，${g1}之間也互相${ac}一次。共${ac}幾次？`, ans, '分兩部分：不同組之間、' + g1 + '之間。',
        `${g1}和${g2} ${a}×${b}＝${a * b}；${g1}之間 ${a}×${a - 1}÷2＝${c2(a)}；${a * b}＋${c2(a)}＝${ans}。`, ks(wr), `${a}*${b}+${a}*(${a}-1)/2`, [], { why: wr });
    },
    /* how many more times after k newcomers */
    (r, p) => {
      const n = N(r, p, 3, 9), k = ri(r, 1, 2), [w, a] = pick(r, CX4), ans = c2(n + k) - c2(n);
      const wr = wy(ans, [[c2(n + k), '那是加入後的總次數，要減去原來的。'], [k * n, k > 1 ? '新來的人彼此之間也要' + a + '。' : '再想想新來的人要和幾位' + a + '。'], [n, '新來的人要和所有人' + a + '，包括其他新來的人。']]);
      return o('hs-more', `${n} 位${w}互相${a}一次。再多 ${k} 位${w}加入，也和所有人各${a}一次，共增加多少次？`, ans, '加入後的次數減去原來的次數。',
        `原來 ${n}×${n - 1}÷2＝${c2(n)} 次；加入後 ${n + k} 位共 ${n + k}×${n + k - 1}÷2＝${c2(n + k)} 次；${c2(n + k)}－${c2(n)}＝${ans} 次。`, ks(wr), `${n + k}*(${n + k}-1)/2-${n}*(${n}-1)/2`, [], { why: wr });
    },
    /* some people did not come */
    (r, p) => {
      const n = N(r, p, 4, 10), k = ri(r, 1, 2), [w, a] = pick(r, CX4), m = n - k, ans = c2(m);
      const wr = wy(ans, [[c2(n), '沒來的人不能' + a + '，要用實際來的人數。'], [m, '那是來了多少位，不是次數。'], [c2(n) - k, '少了的次數不是只減 ' + k + '，要重新算。']]);
      return o('hs-absent', `${n} 位${w}本來要互相${a}一次，有 ${k} 位沒有來。實際共${a}幾次？`, ans, '先算實際來了幾位。', `來了 ${n}－${k}＝${m} 位；${m}×${m - 1}÷2＝${ans} 次。`, ks(wr), `(${n}-${k})*(${n}-${k}-1)/2`, [], { why: wr });
    },
    /* every pair twice (home and away, or two directions) */
    (r, p) => {
      const n = N(r, p, 3, 10), ans = n * (n - 1), k = Math.floor(r() * 4), sp = pick(r, ['足球', '籃球', '排球', '乒乓球']);
      const q = k === 0 ? `${n} 隊${sp}隊作雙循環賽，每兩隊互相作客各賽一場。共賽幾場？` : k === 1 ? `${n} 位同學互相送卡片，每人送給其他每位同學各一張。共送出幾張卡片？` : k === 2 ? `${n} 位朋友的群組，每人向其他每位朋友各傳一則短訊。共傳了幾則短訊？` : `${n} 位小朋友交換禮物，每人送給其他每位各一份。共送出幾份禮物？`;
      const wr = wy(ans, [[c2(n), '每兩個之間有兩個方向（兩場、兩張），不用除以 2。'], [n - 1, '那只是一位的數目。'], [n * n, '一位不會送給自己。']]);
      return o('hs-dbl', q, ans, '每個方向都要算一次。', `每位對其他 ${n - 1} 位各一次，${n}×${n - 1}＝${ans}；兩個方向各算，不用除以 2。`, ks(wr), `${n}*(${n}-1)`, [], { why: wr });
    });
  const verify44b = q => {
    let m;
    const h = n => { let c = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) c++; return c; };
    if ((m = /^(\d+) 位[^和，。]+，每兩位.+一次。共.+幾次？$/.exec(q.q))) return String(h(+m[1]));
    if ((m = /^(\d+) [個間].+，每兩[個間].+之間.一.+。共要.幾/.exec(q.q))) return String(h(+m[1]));
    if ((m = /^(?:直線上有|圓周上有|一條直線上有) (\d+) 個點/.exec(q.q))) return String(h(+m[1]));
    if ((m = /^有些.+，每兩位.+一次，共.+了 (\d+) 次。有幾位/.exec(q.q))) { for (let n = 2; n <= 60; n++) if (h(n) === +m[1]) return String(n); return 'none'; }
    if ((m = /^(\d+) 位[^和，。]+互相.+一次。每位要.+幾次？$/.exec(q.q))) return String(+m[1] - 1);
    if ((m = /^(\d+) 位[^和，。]+互相.+一次，每位各.+了 (\d+) 次。把大家/.exec(q.q))) return String(+m[1] * +m[2]);
    if ((m = /^(\d+) 位(.+)和 (\d+) 位(.+)。每位\2和每位\4.+一次，\2之間也互相/.exec(q.q))) { let c = h(+m[1]); for (let i = 0; i < +m[1]; i++) for (let j = 0; j < +m[3]; j++) c++; return String(c); }
    if ((m = /^(\d+) 位(.+)和 (\d+) 位(.+)。\2之間、\4之間各自.+一次，.+不.+。共.+幾次/.exec(q.q))) return String(h(+m[1]) + h(+m[3]));
    if ((m = /^(\d+) 位.+互相.+一次。再多 (\d+) 位.+加入，也和所有人各.+一次，共增加多少次/.exec(q.q))) return String(h(+m[1] + +m[2]) - h(+m[1]));
    if ((m = /^(\d+) 位.+本來要互相.+一次，有 (\d+) 位沒有來。實際共/.exec(q.q))) return String(h(+m[1] - +m[2]));
    if ((m = /^(\d+) 隊.+隊作雙循環賽，每兩隊互相作客各賽一場/.exec(q.q)) || (m = /^(\d+) 位同學互相送卡片，每人送給其他每位同學各一張/.exec(q.q)) || (m = /^(\d+) 位朋友的群組，每人向其他每位朋友各傳一則短訊/.exec(q.q)) || (m = /^(\d+) 位小朋友交換禮物，每人送給其他每位各一份/.exec(q.q))) return String(2 * h(+m[1]));
    return verify44(q);
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
    gens: g44, verify: verify44b
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
