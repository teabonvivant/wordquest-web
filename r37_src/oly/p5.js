/* 小五 · 5 units (finished). p5-4 = 真假推理, p5-5 = 容斥原理 (two circles only), per 設計書「研究後修訂」.
   Tools: only the existing ones (cycle, bars, sortcards) - no new widget, so the unit test's widget list stays valid. */
(function () {
  'use strict';
  const { o, N, ri, pick, shuffle } = WQOly.helpers;
  /* o() + keep only sensible non-negative whole-number wrong answers / why keys (a negative count is never a child's wrong answer) */
  const O = (...a) => { const q = o(...a); if (q.why) { const w = {}; for (const k in q.why) if (/^\d+$/.test(k)) w[k] = q.why[k]; q.why = w; } q.w = q.w.filter(v => typeof v !== 'number' || (isFinite(v) && v >= 0)); return q; };

  /* ---- small svg helpers ------------------------------------------------------------------------------------------------ */
  const AQ = '#3ee6d0', GO = '#ffc94a', TX = '#c3cbf7', PK = '#ff8fc7', VI = '#c6a2ff', BG = '#1b2160';
  const text = (x, y, s, sz, col, extra) => `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="${sz || 14}" font-weight="900" fill="${col || TX}"${extra || ''}>${s}</text>`;
  /* k labelled dots around a ring (people passing a ball, last-digit wheel) */
  const ring = (labels, hl, aria) => {
    const k = labels.length, R = k > 6 ? 40 : 36, rr = k > 6 ? 12 : 14; let s = '';
    for (let i = 0; i < k; i++) {
      const a = -Math.PI / 2 + i / k * Math.PI * 2, x = 120 + Math.cos(a) * R * 1.35, y = 55 + Math.sin(a) * R;
      s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rr}" fill="${i === hl ? GO : BG}" stroke="${AQ}" stroke-width="2"/>${text(x.toFixed(1), (y + 1).toFixed(1), labels[i], 14, i === hl ? '#3b2600' : TX)}`;
    }
    return `<svg viewBox="0 0 240 110" role="img" aria-label="${aria}">${s}</svg>`;
  };
  /* a repeating strip of small boxes */
  const strip = (arr, times) => {
    const all = []; for (let t = 0; t < times; t++) all.push(...arr);
    const w = Math.min(19, 210 / all.length); let s = '';
    all.forEach((v, i) => { const x = 14 + i * w; s += `<rect x="${x.toFixed(1)}" y="38" width="${(w - 2).toFixed(1)}" height="30" rx="5" fill="${i < arr.length ? 'rgba(62,230,208,.25)' : BG}" stroke="${i < arr.length ? AQ : GO}" stroke-width="1.6"/>${text((x + (w - 2) / 2).toFixed(1), 54, v, 14)}`; });
    return `<svg viewBox="0 0 240 110" role="img" aria-label="重複排列：${arr.join('、')}">${s}${text(226, 53, '…', 18, GO)}</svg>`;
  };
  const CH = ['', '一', '二', '三', '四', '五', '六', '日'];
  const weekSvg = wd => { let s = ''; for (let i = 1; i <= 7; i++) { const x = 20 + (i - 1) * 30; s += `<rect x="${x - 12}" y="38" width="26" height="32" rx="6" fill="${i === wd ? GO : BG}" stroke="${AQ}" stroke-width="1.6"/>${text(x + 1, 54, CH[i], 15, i === wd ? '#3b2600' : TX)}`; } return `<svg viewBox="0 0 240 110" role="img" aria-label="一星期七日，今天星期${CH[wd]}">${s}${text(120, 18, '今天', 12, GO)}</svg>`; };
  const lampSvg = (a, b) => `<svg viewBox="0 0 240 110" role="img" aria-label="紅燈每 ${a} 秒亮，綠燈每 ${b} 秒亮"><circle cx="64" cy="40" r="20" fill="#e5484d" stroke="#fff" stroke-width="2" opacity=".9"/><circle cx="176" cy="40" r="20" fill="#3fb950" stroke="#fff" stroke-width="2" opacity=".9"/>${text(64, 82, '每 ' + a + ' 秒', 15, '#ff9aa2')}${text(176, 82, '每 ' + b + ' 秒', 15, '#8ee8a0')}</svg>`;

  /* ============================================================================================================================ */
  /* ---- p5-1 餘數與週期 ---------------------------------------------------------------------------------------------------- */
  const art51 = '<svg viewBox="0 0 120 80"><circle cx="60" cy="38" r="26" fill="none" stroke="#3ee6d0" stroke-width="3" stroke-dasharray="3 6"/><g font-size="13" font-weight="900" fill="#c3cbf7" text-anchor="middle" dominant-baseline="central"><circle cx="60" cy="12" r="9" fill="#ffc94a"/><text x="60" y="12" fill="#3b2600">1</text><text x="85" y="30">2</text><text x="76" y="62">3</text><text x="44" y="62">4</text><text x="35" y="30">5</text></g><rect x="20" y="66" width="80" height="12" rx="6" fill="#ff8fc7"/><text x="60" y="72" text-anchor="middle" dominant-baseline="central" font-size="10" font-weight="900" fill="#0b1030">17÷5＝3 餘 2</text></svg>';
  const g51 = {
    A: [
      /* a repeating pattern: which number is the n-th? */
      (r, p) => {
        const k = ri(r, 3, 6), pat = shuffle(r, [1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, k), n = N(r, p, 8, 150), rem = n % k, ans = pat[(n - 1) % k];
        return O('cyc-seq', `${pat.join('、')}、${pat.join('、')}……一直排下去，第 ${n} 個數是幾？`, ans, `${k} 個一輪，先看有幾整輪。`,
          `${n}÷${k}＝${Math.floor(n / k)} 餘 ${rem}。${rem ? `第 ${n} 個就是這一輪的第 ${rem} 個：${ans}。` : `餘 0 就是一輪的最後一個：${ans}。`}`,
          [pat[rem % k], rem, Math.floor(n / k), pat[(n + k - 2) % k]], '', [],
          { svg: strip(pat, 2), why: { [pat[rem % k]]: '餘數是位置：餘 1 是第 1 個，餘 0 是一輪的最後一個。', [rem]: `餘數 ${rem} 只是位置，要看那個位置上的數。`, [Math.floor(n / k)]: '這是整輪的數目，不是第幾個數。' } });
      },
      /* position inside a round */
      (r, p) => {
        const k = ri(r, 3, 9), n = N(r, p, k + 2, 150), rem = n % k, ans = rem === 0 ? k : rem;
        return O('cyc-pos', `一串珠子每 ${k} 粒為一輪，不斷重複。第 ${n} 粒是那一輪的第幾粒？`, ans, '用除法看餘數。',
          `${n}÷${k}＝${Math.floor(n / k)} 餘 ${rem}。${rem ? `餘 ${rem}，是第 ${rem} 粒。` : `餘 0，剛好是一輪的最後一粒：第 ${k} 粒。`}`,
          [rem === 0 ? 0 : rem + 1, Math.floor(n / k), ans - 1 || ans + 2, k + 1], '', [],
          { svg: ring(Array.from({ length: k }, (_, i) => i + 1), -1, `${k} 粒一輪`), why: { 0: `餘 0 不是第 0 粒，是一輪的最後一粒：第 ${k} 粒。`, [Math.floor(n / k)]: '這是整輪的數目，不是那一輪的第幾粒。', [rem + 1]: '餘 ' + rem + ' 就是第 ' + rem + ' 粒，不用再加 1。' } });
      },
      /* passing a ball round a circle */
      (r, p) => {
        const k = ri(r, 3, 8), n = N(r, p, k + 2, 80), rem = n % k, ans = rem + 1;
        return O('cyc-ball', `${k} 人圍成一圈傳球，從 1 號開始傳 ${n} 次。球在幾號手上？`, ans, '整圈傳回 1 號，只看餘下的次數。',
          `${n}÷${k}＝${Math.floor(n / k)} 餘 ${rem}。傳完整圈回到 1 號，再傳 ${rem} 次，球在 ${ans} 號。`,
          [rem, Math.floor(n / k), ans + 1 > k ? 1 : ans + 1, k], '', [],
          { svg: ring(Array.from({ length: k }, (_, i) => i + 1), 0, `${k} 人圍成一圈，球在 1 號`), why: { [rem]: `餘 ${rem} 是再傳的次數，球要由 1 號再傳 ${rem} 次，到 ${ans} 號。`, [Math.floor(n / k)]: '這是傳了幾整圈，不是球在幾號。' } });
      }
    ],
    B: [
      /* weekday after n days */
      (r, p) => {
        const wd = ri(r, 1, 7), n = N(r, p, 15, 400), rem = n % 7, ans = (wd - 1 + n) % 7 + 1;
        return O('cyc-week', `今天是星期${CH[wd]}。再過 ${n} 日是星期幾？（答數字，星期日算 7）`, ans, '一星期 7 日，先看餘下幾日。',
          `${n}÷7＝${Math.floor(n / 7)} 餘 ${rem}。整星期不變，由星期${CH[wd]}再數 ${rem} 日：星期${CH[ans]}，答 ${ans}。`,
          [wd, rem, Math.floor(n / 7), ans % 7 + 1], '', [],
          { svg: weekSvg(wd), why: { [wd]: rem ? `${wd} 是今天，還要再往後數 ${rem} 日。` : '剛好整星期，星期不變，所以答案和今天一樣。', [rem]: `${rem} 只是多出的日數，要由今天往後數。`, [Math.floor(n / 7)]: '這是過了幾個整星期，不是星期幾。' } });
      },
      /* two flashing lamps: least common multiple */
      (r, p) => {
        let a, b, L; for (let i = 0; i < 80; i++) { a = ri(r, 2, 8); b = ri(r, 3, 12); L = a * b / WQOly.gcd(a, b); if (a < b && L <= 72 && L > b) break; }
        if (!(a < b && L > b)) { a = 4; b = 6; L = 12; }
        return O('cyc-lcm', `紅燈每 ${a} 秒亮一次，綠燈每 ${b} 秒亮一次。同時亮後，最少再過幾秒又同時亮？`, L, `找 ${a} 和 ${b} 的最小公倍數。`,
          `${a} 的倍數：${[1, 2, 3, 4].map(k => a * k).join('、')}……；${b} 的倍數：${[1, 2, 3, 4].map(k => b * k).join('、')}……。第一個相同的是 ${L}。`,
          [a * b, a + b, b, L + a], '', [],
          { svg: lampSvg(a, b), why: { [a * b]: `${a} 和 ${b} 有公因數，不用乘到 ${a * b} 那麼大。`, [a + b]: '相加不是共同倍數，要找兩個數都能整除的最小數。', [b]: `${b} 秒時紅燈未必亮，要兩邊都亮才算。` } });
      },
      /* the k-th time they flash together */
      (r, p) => {
        let a, b, L, k; for (let i = 0; i < 80; i++) { a = ri(r, 2, 6); b = ri(r, 3, 10); k = ri(r, 2, 4); L = a * b / WQOly.gcd(a, b); if (a < b && L > b && L * k <= 200) break; }
        if (!(a < b && L > b)) { a = 3; b = 4; L = 12; k = 2; }
        return O('cyc-lcm-k', `紅燈每 ${a} 秒亮、綠燈每 ${b} 秒亮。同時亮後，第 ${k} 次再同時亮，是幾秒後？`, L * k, '先找每隔幾秒同時亮一次。',
          `${a} 和 ${b} 的最小公倍數是 ${L}，每 ${L} 秒同時亮一次。第 ${k} 次：${L}×${k}＝${L * k} 秒。`,
          [L, a * b * k, L * (k - 1), L * k + L], '', [],
          { svg: lampSvg(a, b), why: { [L]: `${L} 秒是第一次同時亮，題目問第 ${k} 次。`, [a * b * k]: `${a}×${b} 不一定是最小公倍數，應先找最小的共同倍數 ${L}。` } });
      }
    ]
  };
  const verify51 = q => {
    let m;
    if ((m = /^([\d、]+)……一直排下去，第 (\d+) 個數是幾？/.exec(q.q))) {
      const d = m[1].split('、'), pat = d.slice(0, d.length / 2), n = +m[2], seq = [];
      while (seq.length < n) seq.push(...pat);
      return seq[n - 1];
    }
    if ((m = /每 (\d+) 粒為一輪，不斷重複。第 (\d+) 粒/.exec(q.q))) { const k = +m[1], n = +m[2]; let pos = 0; for (let i = 0; i < n; i++) pos = pos % k + 1; return String(pos); }
    if ((m = /^(\d+) 人圍成一圈傳球，從 1 號開始傳 (\d+) 次/.exec(q.q))) { const k = +m[1]; let at = 1; for (let i = 0; i < +m[2]; i++) at = at % k + 1; return String(at); }
    if ((m = /^今天是星期(.)。再過 (\d+) 日/.exec(q.q))) { let d = CH.indexOf(m[1]); for (let i = 0; i < +m[2]; i++) d = d % 7 + 1; return String(d); }
    if ((m = /^紅燈每 (\d+) 秒亮一次，綠燈每 (\d+) 秒亮一次/.exec(q.q))) { for (let t = 1; t < 5000; t++) if (t % m[1] === 0 && t % m[2] === 0) return String(t); }
    if ((m = /^紅燈每 (\d+) 秒亮、綠燈每 (\d+) 秒亮。同時亮後，第 (\d+) 次/.exec(q.q))) { let c = 0; for (let t = 1; t < 5000; t++) if (t % m[1] === 0 && t % m[2] === 0 && ++c === +m[3]) return String(t); }
    return null;
  };
  WQOly.register({
    id: 'p5-1', grade: 5, n: 1, title: '餘數與週期', icon: '⏰',
    card: { motto: '看餘數取位置', example: '17÷5＝3 餘 2', art: art51 },
    lesson: [
      { t: 'show', say: '5 人圍成一圈傳球。從 1 號開始，傳 17 次。', scene: { w: 'cycle', p: { n: 5, steps: 17, unit: '次' }, still: true } },
      { t: 'predict', say: '球傳來傳去，繞了好幾圈。', ask: '球最後在幾號手上？', options: ['2', '3', '4'], answer: '3', scene: { w: 'cycle', p: { n: 5, steps: 17, unit: '次' }, still: true }, reveal: '3 整圈是 15 次。再傳 2 次，球到 3 號。' },
      { t: 'do', say: '按「一圈」走 3 圈，再按「＋1」走 2 次。', scene: { w: 'cycle', p: { n: 5, steps: 17, unit: '次' } } },
      { t: 'show', say: '17÷5＝3 餘 2。整圈不用看，只看餘數。', scene: { w: 'cycle', p: { n: 5, steps: 17, unit: '次' }, still: true } },
      { t: 'predict', say: '這次傳 15 次。', ask: '球最後在幾號手上？', options: ['1', '5', '2'], answer: '1', scene: { w: 'cycle', p: { n: 5, steps: 15, unit: '次' }, still: true }, reveal: '15÷5＝3 餘 0。剛好整圈，球回到 1 號。' },
      { t: 'do', say: '6 人圍圈，傳 20 次。先走整圈，再走餘下的。', scene: { w: 'cycle', p: { n: 6, steps: 20, unit: '次' } } },
      { t: 'try', say: '用餘數來答。', scene: { w: 'cycle', p: { n: 4, steps: 11, unit: '次' }, still: true },
        q: { stem: '4 人圍圈傳球，從 1 號傳 11 次，球在幾號手上？', options: ['3', '4', '2'], answer: '4', hint: '11÷4＝2 餘 3。', why: { 3: '餘 3 是再傳的次數，球要由 1 號再傳 3 次，到 4 號。', 2: '2 是傳了幾整圈，不是球在幾號。' } } },
      { t: 'card' }
    ],
    gens: g51, verify: verify51
  });

  /* ---- p5-2 個位循環 ---------------------------------------------------------------------------------------------------- */
  const CYC = { 2: [2, 4, 8, 6], 3: [3, 9, 7, 1], 7: [7, 9, 3, 1], 8: [8, 4, 2, 6], 9: [9, 1] };
  const BASES = [2, 3, 7, 8, 9];
  const dig = (b, n) => CYC[b][(n - 1) % CYC[b].length];
  const prod = (b, n) => Array(3).fill(b).join('×') + '×…×' + b + `（共 ${n} 個）`;
  const art52 = '<svg viewBox="0 0 120 80"><g font-size="15" font-weight="900" text-anchor="middle" dominant-baseline="central" fill="#c3cbf7"><circle cx="30" cy="30" r="13" fill="#1b2160" stroke="#3ee6d0" stroke-width="2"/><text x="30" y="30">3</text><circle cx="62" cy="30" r="13" fill="#1b2160" stroke="#3ee6d0" stroke-width="2"/><text x="62" y="30">9</text><circle cx="94" cy="30" r="13" fill="#1b2160" stroke="#3ee6d0" stroke-width="2"/><text x="94" y="30">7</text><circle cx="62" cy="60" r="13" fill="#ffc94a" stroke="#c48a00" stroke-width="2"/><text x="62" y="60" fill="#3b2600">1</text></g><path d="M48 60H30V44M94 44V60H76" fill="none" stroke="#ff8fc7" stroke-width="2" stroke-dasharray="3 3"/></svg>';
  const cycSvg = b => ring(CYC[b], -1, `${b} 連乘，個位依次是 ${CYC[b].join('、')}`);
  const g52 = {
    A: [
      (r, p) => {
        const b = pick(r, BASES), n = N(r, p, 5, 100), L = CYC[b], m = L.length, rem = n % m, ans = dig(b, n);
        return O('last-digit', `${b}×${b}×…×${b}（共 ${n} 個），個位是幾？`, ans, `個位 ${L.join('、')} 一直輪流出現。`,
          `個位依次是 ${L.join('、')}，${m} 個一輪。${n}÷${m}＝${Math.floor(n / m)} 餘 ${rem}，${rem ? `取每輪第 ${rem} 個` : '餘 0 取每輪最後一個'}：${ans}。`,
          [L[rem % m], b, L[(rem + 1) % m], L[(rem + m - 1) % m]], '', [],
          { svg: cycSvg(b), why: { [L[rem % m]]: '餘數 ' + rem + (rem ? ' 是第 ' + rem + ' 個' : ' 是 0，要取一輪最後一個') + '，不要多走一格。', [b]: `${b} 是第 1 個個位，要看第 ${rem || m} 個。` } });
      },
      (r, p) => {
        const b = pick(r, BASES), n = N(r, p, 4, 60), L = CYC[b], ans = dig(b, n + 1), d = dig(b, n);
        return O('last-next', `${b}×${b}×…×${b}（共 ${n} 個），個位是 ${d}。再多乘一個 ${b}，個位是幾？`, ans, '看循環裏下一個是什麼。',
          `個位依次是 ${L.join('、')}。${d} 後面是 ${ans}，所以再乘一個 ${b}，個位是 ${ans}。`,
          [d, b, L[(L.indexOf(d) + 2) % L.length], d * b % 10 === ans ? (ans + 1) % 10 : d * b % 10], '', [],
          { svg: cycSvg(b), why: { [d]: `${d} 是現在的個位，再乘一個 ${b} 後會變。`, [b]: `${b} 是乘上去的數，要看新的個位。` } });
      },
      (r, p) => {
        const b = pick(r, BASES), L = CYC[b], m = L.length, j = ri(r, 0, m - 1), t = N(r, p, 2, 12), d = L[j], n = j + 1 + (t - 1) * m;
        return O('last-nth', `${b}×${b}×…×${b} 的個位，第 ${t} 次變成 ${d}。共乘了幾個 ${b}？`, n, '先數一輪有幾個。',
          `個位 ${L.join('、')}，${m} 個一輪。${d} 第一次在第 ${j + 1} 個，之後每隔 ${m} 個再出現：${j + 1}＋${m}×${t - 1}＝${n}。`,
          [m * t, j + 1 + m * t, n - m, n + 1], `${j + 1}+${m}*${t - 1}`, [],
          { svg: cycSvg(b), why: { [m * t]: `${d} 第一次不一定在每輪最後，第一次在第 ${j + 1} 個。`, [n - m]: `再數一輪，${d} 要出現 ${t} 次，才是第 ${t} 次。` } });
      }
    ],
    B: [
      (r, p) => {
        const b = pick(r, BASES), n = N(r, p, 5, 100), c = ri(r, 3, 99), d = dig(b, n), ans = (d + c) % 10;
        return O('last-add', `${b}×${b}×…×${b}（共 ${n} 個）＋ ${c} 的個位是幾？`, ans, '先求連乘的個位，再加上去。',
          `連乘的個位是 ${d}；${c} 的個位是 ${c % 10}。${d}＋${c % 10}＝${d + c % 10}，個位是 ${ans}。`,
          [d, c % 10, (d + c % 10 + 1) % 10, (d * (c % 10)) % 10], '', [],
          { svg: cycSvg(b), why: { [d]: `${d} 只是連乘的個位，還要加上 ${c} 的個位 ${c % 10}。`, [(d * (c % 10)) % 10]: '這題是相加，不是相乘。' } });
      },
      (r, p) => {
        const b1 = pick(r, BASES); let b2 = pick(r, BASES); if (b2 === b1) b2 = BASES[(BASES.indexOf(b1) + 1) % 5];
        const n1 = N(r, p, 5, 80), n2 = N(r, p, 5, 80), d1 = dig(b1, n1), d2 = dig(b2, n2), ans = (d1 + d2) % 10;
        return O('last-two', `${b1}×…×${b1}（共 ${n1} 個）＋ ${b2}×…×${b2}（共 ${n2} 個），和的個位是幾？`, ans, '兩串連乘各求個位，再相加。',
          `第一串個位 ${d1}，第二串個位 ${d2}。${d1}＋${d2}＝${d1 + d2}，個位是 ${ans}。`,
          [d1, d2, (d1 + d2 + 1) % 10, (d1 * d2) % 10], '', [],
          { svg: ring([b1 + '…', b2 + '…'], -1, '兩串連乘'), why: { [d1]: `${d1} 只是第一串的個位，還要加第二串的 ${d2}。`, [(d1 * d2) % 10]: '兩串是相加，不是相乘。' } });
      },
      (r, p) => {
        const b1 = pick(r, BASES); let b2 = pick(r, BASES); if (b2 === b1) b2 = BASES[(BASES.indexOf(b1) + 2) % 5];
        const n1 = N(r, p, 5, 80), n2 = N(r, p, 5, 80), d1 = dig(b1, n1), d2 = dig(b2, n2), ans = (d1 * d2) % 10;
        return O('last-mul', `${b1}×…×${b1}（共 ${n1} 個）乘 ${b2}×…×${b2}（共 ${n2} 個），積的個位是幾？`, ans, '先求兩串的個位，再相乘取個位。',
          `第一串個位 ${d1}，第二串個位 ${d2}。${d1}×${d2}＝${d1 * d2}，個位是 ${ans}。`,
          [d1, d2, (d1 + d2) % 10, d1 * d2], `${d1 * d2}%10`, [],
          { svg: ring([b1 + '…', b2 + '…'], -1, '兩串連乘'), why: { [(d1 + d2) % 10]: '兩串要相乘，不是相加。', [d1 * d2]: `${d1 * d2} 不是個位，只取個位那一位。` } });
      }
    ]
  };
  const verify52 = q => {
    let m;
    const lastOf = (b, n) => String((BigInt(b) ** BigInt(n)) % 10n);
    if ((m = /^(\d)×\d×…×\d（共 (\d+) 個），個位是幾？/.exec(q.q))) return lastOf(m[1], m[2]);
    if ((m = /^(\d)×\d×…×\d（共 (\d+) 個），個位是 (\d)。再多乘一個/.exec(q.q))) return lastOf(m[1], +m[2] + 1);
    if ((m = /^(\d)×\d×…×\d 的個位，第 (\d+) 次變成 (\d)。/.exec(q.q))) { let c = 0; for (let n = 1; n < 5000; n++) if (lastOf(m[1], n) === m[3] && ++c === +m[2]) return String(n); }
    if ((m = /^(\d)×\d×…×\d（共 (\d+) 個）＋ (\d+) 的個位是幾？/.exec(q.q))) return String((+lastOf(m[1], m[2]) + +m[3]) % 10);
    if ((m = /^(\d)×…×\d（共 (\d+) 個）＋ (\d)×…×\d（共 (\d+) 個），和的個位/.exec(q.q))) return String((+lastOf(m[1], m[2]) + +lastOf(m[3], m[4])) % 10);
    if ((m = /^(\d)×…×\d（共 (\d+) 個）乘 (\d)×…×\d（共 (\d+) 個），積的個位/.exec(q.q))) return String((+lastOf(m[1], m[2]) * +lastOf(m[3], m[4])) % 10);
    return null;
  };
  WQOly.register({
    id: 'p5-2', grade: 5, n: 2, title: '個位循環', icon: '🔁',
    card: { motto: '只看個位', example: '3、9、7、1 一輪', art: art52 },
    lesson: [
      { t: 'show', say: '3×3×3×3…，個位會轉圈：3、9、7、1。', scene: { w: 'cycle', p: { n: 4, labels: [3, 9, 7, 1], steps: 3, unit: '個' }, still: true } },
      { t: 'predict', say: '5 個 3 相乘，是 243。', ask: '那 6 個 3 相乘，個位是幾？', options: ['3', '7', '9'], answer: '9', scene: { w: 'cycle', p: { n: 4, labels: [3, 9, 7, 1], steps: 5, unit: '個' }, still: true }, reveal: '個位轉到 1 後回到 3，再到 9。6 個 3 的個位是 9。' },
      { t: 'do', say: '走到第 10 個 3。一圈是 4 個，先按「一圈」。', scene: { w: 'cycle', p: { n: 4, labels: [3, 9, 7, 1], steps: 9, unit: '個' } } },
      { t: 'show', say: '10÷4＝2 餘 2。個位是每輪第 2 個：9。', scene: { w: 'cycle', p: { n: 4, labels: [3, 9, 7, 1], steps: 9, unit: '個' }, still: true } },
      { t: 'predict', say: '8 個 3 相乘。', ask: '8÷4 餘 0，個位是幾？', options: ['3', '1', '9'], answer: '1', scene: { w: 'cycle', p: { n: 4, labels: [3, 9, 7, 1], steps: 7, unit: '個' }, still: true }, reveal: '餘 0 就是一輪的最後一個：1。' },
      { t: 'do', say: '2 的個位是 2、4、8、6。走到第 7 個 2。', scene: { w: 'cycle', p: { n: 4, labels: [2, 4, 8, 6], steps: 6, unit: '個' } } },
      { t: 'try', say: '換成 7 試試。', scene: { w: 'cycle', p: { n: 4, labels: [7, 9, 3, 1], steps: 9, unit: '個' }, still: true },
        q: { stem: '7×7×…×7（共 10 個），個位是幾？', options: ['9', '1', '3'], answer: '9', hint: '7 的個位是 7、9、3、1。', why: { 1: '1 是一輪最後一個，這題餘 2，取第 2 個。', 3: '3 是第 3 個，餘 2 只走到第 2 個。' } } },
      { t: 'card' }
    ],
    gens: g52, verify: verify52
  });

  /* ---- p5-3 抽屜原理 ---------------------------------------------------------------------------------------------------- */
  const art53 = '<svg viewBox="0 0 120 80"><g fill="none" stroke="#3ee6d0" stroke-width="2.4"><rect x="12" y="34" width="44" height="26" rx="5"/><rect x="64" y="34" width="44" height="26" rx="5"/></g><g font-size="14" text-anchor="middle" dominant-baseline="central"><text x="26" y="47">🍎</text><text x="42" y="47">🍎</text><text x="78" y="47">🍎</text><text x="94" y="47">🍎</text><text x="60" y="14">🍎</text></g><rect x="22" y="64" width="76" height="13" rx="6" fill="#ff8fc7"/><text x="60" y="70.5" text-anchor="middle" dominant-baseline="central" font-size="10" font-weight="900" fill="#0b1030">一定有盒 ≥ 3</text></svg>';
  const boxSvg = (n, m, it) => { const w = Math.min(46, 220 / m - 6); let s = ''; for (let i = 0; i < m; i++) { const x = 120 + (i - (m - 1) / 2) * (w + 6) - w / 2; s += `<rect x="${x.toFixed(1)}" y="50" width="${w.toFixed(1)}" height="34" rx="6" fill="rgba(255,255,255,.07)" stroke="${AQ}" stroke-width="2"/>`; } return `<svg viewBox="0 0 240 110" role="img" aria-label="${n} 個${it}，${m} 個盒">${s}${text(120, 20, n + ' 個' + it + ' → ' + m + ' 個盒', 15, GO)}</svg>`; };
  const ballSvg = (cols, k) => { let s = ''; const cc = ['#e5484d', '#ffc94a', '#4aa3ff', '#3fb950', '#ffffff']; cols.forEach((c, i) => { const x = 120 + (i - (cols.length - 1) / 2) * 38; s += `<circle cx="${x}" cy="46" r="14" fill="${cc[i]}" stroke="#0b1030" stroke-width="2"/>`; }); return `<svg viewBox="0 0 240 110" role="img" aria-label="${cols.join('、')}球">${s}${text(120, 84, cols.join(' ') + ' 球', 14, TX)}${text(120, 16, '要 ' + k + ' 個同色', 13, GO)}</svg>`; };
  const COL = ['紅', '黃', '藍', '綠', '白'];
  const g53 = {
    A: [
      (r, p) => {
        const m = ri(r, 2, 6), n = m * ri(r, 1, 6) + ri(r, 1, m - 1) + (r() < .15 ? m - 1 : 0), itc = pick(r, [['蘋果', '個'], ['糖', '粒'], ['橙', '個'], ['書', '本']]), it = itc[0], cl = itc[1], s = Math.ceil(n / m), fl = Math.floor(n / m);
        return O('drawer', `把 ${n} ${cl}${it}放進 ${m} 個盒子，最少有一個盒子有幾${cl}？`, s, '先平均分，再看餘下的。',
          `${n}÷${m}＝${fl} 餘 ${n % m}。餘下的要多放一個，所以最少有一盒有 ${fl}＋1＝${s} 個。`,
          [fl, s + 1, n - m, m], '', [], { svg: boxSvg(n, m, it), why: { [fl]: '平均分後還有剩，總有一個盒要多放一個，所以要加 1。', [s + 1]: '餘下的只要多放一個，不用再多加。', [n - m]: '不是拿總數減盒數，要用除法平均分。' } });
      },
      (r, p) => {
        const days = pick(r, [['星期', 7], ['月份', 12]]), n = days[1] === 7 ? N(r, p, 8, 40) : N(r, p, 13, 40), s = Math.ceil(n / days[1]), fl = Math.floor(n / days[1]);
        return O('drawer-cal', `${n} 位同學，每人在一年中某個${days[0] === '星期' ? '星期幾' : '月'}出生。最少有幾人同${days[0] === '星期' ? '一個星期幾' : '月'}出生？`, s, `把 ${days[1]} 個${days[0] === '星期' ? '星期幾' : '月'}當成盒子。`,
          `${n}÷${days[1]}＝${fl} 餘 ${n % days[1]}。${n % days[1] ? `餘下的要多一人：${fl}＋1＝${s}。` : `剛好平均分，最少 ${s} 人。`}`,
          [fl, s + 1, days[1], n - days[1]], '', [], { svg: boxSvg(n, Math.min(days[1], 7), '同學'), why: { [fl]: '還有餘下的人，總有一天（月）要多一人。', [days[1]]: `${days[1]} 是盒子的數目，不是人數。` } });
      }
    ],
    B: [
      (r, p) => {
        const c = N(r, p, 2, 5), k = ri(r, 2, 4), x = ri(r, 6, 15), s = c * (k - 1) + 1, col = COL.slice(0, c);
        return O('drawer-worst', `袋裏有${col.join('、')}球各 ${x} 個。最少取幾個，才一定有 ${k} 個同色？`, s, '想最壞的情況。',
          `最壞：每種顏色都取 ${k - 1} 個，共 ${c}×${k - 1}＝${c * (k - 1)} 個。再取 1 個就一定有 ${k} 個同色：${s}。`,
          [c * (k - 1), s + 1, c * k, k], `${c}*${k - 1}+1`, [], { svg: ballSvg(col, k), why: { [c * (k - 1)]: '這是最壞情況取到的個數，再多取 1 個才一定成功。', [c * k]: `每色取 ${k} 個已經有 ${k} 個同色了，最壞是每色 ${k - 1} 個。` } });
      },
      /* one colour has fewer balls than k-1 */
      (r, p) => {
        const c = N(r, p, 3, 4), k = ri(r, 3, 4), few = ri(r, 1, k - 2), col = COL.slice(0, c), cnt = col.map((_, i) => i === 0 ? few : ri(r, k + 1, 12)), s = cnt.reduce((t, v) => t + Math.min(v, k - 1), 0) + 1;
        return O('drawer-few', `袋裏有${col.map((cc, i) => cc + cnt[i] + '個').join('、')}的球。最少取幾個，才一定有 ${k} 個同色？`, s, '數量少的顏色，最壞時全部取走。',
          `最壞：${col[0]}球全取（${few} 個），其他每色取 ${k - 1} 個：${few}＋${(c - 1)}×${k - 1}＝${s - 1}。再取 1 個：${s}。`,
          [s - 1, c * (k - 1) + 1, s + 1, c * (k - 1)], '', [], { svg: ballSvg(col, k), why: { [c * (k - 1) + 1]: `${col[0]}球只有 ${few} 個，最壞時取不到 ${k - 1} 個，要全取再算。`, [s - 1]: '這是最壞情況取到的個數，再多取 1 個才一定成功。' } });
      },
      (r, p) => {
        const m = N(r, p, 2, 6), k = ri(r, 2, 6), s = m * (k - 1) + 1, itc = pick(r, [['蘋果', '個'], ['糖', '粒'], ['橙', '個']]), it = itc[0], cl = itc[1];
        return O('drawer-need', `要把${it}放進 ${m} 個盒子，最少要有幾${cl}${it}，才一定有盒子放到 ${k} ${cl}或以上？`, s, '先想每盒都只放 ' + (k - 1) + ' 個。',
          `每盒放 ${k - 1} 個，共 ${m}×${k - 1}＝${m * (k - 1)} 個，還沒有盒到 ${k} 個。再多 1 個：${s}。`,
          [m * (k - 1), m * k, s + 1, k], `${m}*${k - 1}+1`, [], { svg: boxSvg(s, m, it), why: { [m * (k - 1)]: '這是每盒都未到標準的最多個數，再多 1 個才一定成功。', [m * k]: `每盒放 ${k} 個已經到標準了，最壞是每盒 ${k - 1} 個。` } });
      }
    ]
  };
  const verify53 = q => {
    let m;
    if ((m = /^把 (\d+) .+放進 (\d+) 個盒子，最少有一個盒子/.exec(q.q))) { const n = +m[1], k = +m[2]; for (let x = 1; ; x++) if (x * k >= n) return String(x); }
    if ((m = /^(\d+) 位同學，每人在一年中某個(?:星期幾|月)出生。最少有幾人同/.exec(q.q))) { const n = +m[1], k = /月/.test(q.q.slice(0, 22)) ? 12 : 7; for (let x = 1; ; x++) if (x * k >= n) return String(x); }
    if ((m = /^袋裏有(.+)球各 \d+ 個。最少取幾個，才一定有 (\d+) 個同色/.exec(q.q))) { const c = m[1].split('、').length, k = +m[2]; let worst = 0; for (let i = 0; i < c; i++) worst += k - 1; return String(worst + 1); }
    if ((m = /^袋裏有(.+)的球。最少取幾個，才一定有 (\d+) 個同色/.exec(q.q))) { const k = +m[2], cnt = [...m[1].matchAll(/[^\d、]+(\d+)個/g)].map(x => +x[1]); let worst = 0; for (const v of cnt) worst += v < k ? v : k - 1; return String(worst + 1); }
    if ((m = /^要把.+放進 (\d+) 個盒子，最少要有幾.+，才一定有盒子放到 (\d+) .或以上/.exec(q.q))) return String((+m[1]) * (m[2] - 1) + 1);
    return null;
  };
  WQOly.register({
    id: 'p5-3', grade: 5, n: 3, title: '抽屜原理', icon: '🗄️',
    card: { motto: '想最壞情況', example: '5 個放 2 盒：至少 3 個', art: art53 },
    lesson: [
      { t: 'show', say: '5 粒糖放進 2 個盒。最少有一盒有幾粒？', scene: { w: 'cycle', p: { n: 2, labels: ['甲', '乙'], steps: 5, unit: '粒' }, still: true } },
      { t: 'predict', say: '輪流派糖：甲、乙、甲、乙……', ask: '派完 5 粒，最多的盒有幾粒？', options: ['2', '3', '4'], answer: '3', scene: { w: 'cycle', p: { n: 2, labels: ['甲', '乙'], steps: 5, unit: '粒' }, still: true }, reveal: '甲 3 粒、乙 2 粒。最少有一盒有 3 粒！' },
      { t: 'do', say: '按「＋1 粒」輪流派，派到第 5 粒。', scene: { w: 'cycle', p: { n: 2, labels: ['甲', '乙'], steps: 5, unit: '粒' } } },
      { t: 'show', say: '5÷2＝2 餘 1。餘下的 1 粒，要多放進一盒。', scene: { w: 'cycle', p: { n: 2, labels: ['甲', '乙'], steps: 5, unit: '粒' }, still: true } },
      { t: 'predict', say: '紅、黃、藍球各有很多。取 3 個。', ask: '一定有 2 個同色嗎？', options: ['一定', '不一定'], answer: '不一定', scene: { w: 'cycle', p: { n: 3, labels: ['紅', '黃', '藍'], steps: 3, unit: '個' }, still: true }, reveal: '可能紅、黃、藍各 1 個。要取 4 個才一定。' },
      { t: 'do', say: '先每色取 1 個，再取第 4 個。', scene: { w: 'cycle', p: { n: 3, labels: ['紅', '黃', '藍'], steps: 4, unit: '個' } } },
      { t: 'try', say: '用除法加 1 來答。', scene: { w: 'cycle', p: { n: 5, steps: 11, unit: '個' }, still: true },
        q: { stem: '把 11 個蘋果放進 5 個盒子，最少有一個盒子有幾個？', options: ['2', '3', '4'], answer: '3', hint: '11÷5＝2 餘 1。', why: { 2: '平均分後還有餘下的 1 個，要多放一盒，所以是 3。', 4: '餘下只有 1 個，多放一個就夠了。' } } },
      { t: 'card' }
    ],
    gens: g53, verify: verify53
  });

  /* ---- p5-4 真假推理 ---------------------------------------------------------------------------------------------------- */
  const art54 = '<svg viewBox="0 0 120 80"><g font-size="22" text-anchor="middle" dominant-baseline="central"><text x="26" y="24">🧒</text><text x="60" y="24">👧</text><text x="94" y="24">🧑</text></g><g font-size="11" font-weight="900" text-anchor="middle" dominant-baseline="central"><rect x="10" y="40" width="32" height="14" rx="7" fill="#3ee6d0"/><text x="26" y="47" fill="#0b1030">真</text><rect x="44" y="40" width="32" height="14" rx="7" fill="#ff8fc7"/><text x="60" y="47" fill="#0b1030">假</text><rect x="78" y="40" width="32" height="14" rx="7" fill="#3ee6d0"/><text x="94" y="47" fill="#0b1030">真</text></g><rect x="10" y="62" width="100" height="14" rx="7" fill="#ffc94a"/><text x="60" y="69" text-anchor="middle" dominant-baseline="central" font-size="10" font-weight="900" fill="#3b2600">假設一個，再檢查</text></svg>';
  const EVENTS = ['打破杯', '偷吃糖', '弄污牆', '踢爛球'];
  const sayText = (s, i) => s.t === 'is' ? `是${s.j}號` : (s.j === i ? '不是我' : `不是${s.j}號`);
  const trueCount = (st, c) => st.reduce((t, s) => t + ((s.t === 'is' ? c === s.j : c !== s.j) ? 1 : 0), 0);
  /* a random culprit puzzle with exactly one consistent culprit */
  const culprit = (r, n, t) => {
    for (let tries = 0; tries < 600; tries++) {
      const st = []; for (let i = 1; i <= n; i++) { if (r() < .55) { let j; do { j = ri(r, 1, n); } while (j === i); st.push({ t: 'is', j }); } else st.push({ t: 'not', j: ri(r, 1, n) }); }
      const ok = []; for (let c = 1; c <= n; c++) if (trueCount(st, c) === t) ok.push(c);
      if (ok.length === 1 && new Set(st.map(s => s.t + s.j)).size >= n - 1) return { st, c: ok[0] };
    }
    return { st: [{ t: 'not', j: 1 }, { t: 'is', j: 1 }, { t: 'is', j: 2 }], c: 1 };
  };
  const faces = n => { let s = ''; const em = ['🧒', '👧', '🧑', '👩', '👦']; for (let i = 0; i < n; i++) { const x = 120 + (i - (n - 1) / 2) * 42; s += `<circle cx="${x}" cy="42" r="17" fill="${BG}" stroke="${AQ}" stroke-width="2"/>${text(x, 43, em[i % 5], 20, TX, ' font-family="Noto Color Emoji,Apple Color Emoji,sans-serif"')}${text(x, 74, (i + 1) + '號', 13, GO)}`; } return `<svg viewBox="0 0 240 110" role="img" aria-label="${n} 位同學">${s}</svg>`; };
  const mkCulprit = (sk, n, t, cond) => (r, p) => {
    const ev = pick(r, EVENTS), { st, c } = culprit(r, n, t);
    const list = []; for (let w = 1; w <= n; w++) list.push(`${w}號${trueCount(st, w)}人`);
    const why = {}; for (let w = 1; w <= n; w++) if (w !== c) why[w] = `若是 ${w} 號，說真話的有 ${trueCount(st, w)} 人，不合條件。`;
    return O(sk, `${n} 位同學中有 1 人${ev}，${cond}。${st.map((s, i) => `${i + 1}號：${sayText(s, i + 1)}。`).join('')}${ev}的是幾號？`, c, '逐個假設是犯人，數數說真話的有幾人。',
      `逐個假設：${list.join('、')}說真話。只有 ${c} 號剛好是 ${t} 人說真話，所以是 ${c} 號。`,
      Object.keys(why).map(Number).concat([c % n + 1]), '', [], { svg: faces(n), why });
  };
  const g54 = {
    A: [
      mkCulprit('tf-liar3', 3, 2, '只有 1 人說謊'),
      mkCulprit('tf-true4', 4, 1, '只有 1 人說真話'),
      (r, p) => {
        const n = N(r, p, 3, 5), v = shuffle(r, Array.from({ length: n }, (_, i) => i + 1));
        return O('tf-liars', `${n} 人各說一句。${v.map((k, i) => `${i + 1}號說有${k}人說謊；`).join('')}到底有幾人說謊？`, n - 1, '每句話的數字都不同，最多一句是真的。',
          `數字都不同，最多 1 句真話，所以至少 ${n - 1} 人說謊。說「${n - 1}人」的人說真話，剛好對：${n - 1} 人。`,
          [n, n - 2 || 1, 1, n + 1].filter(x => x !== n - 1), '', [],
          { svg: faces(n), why: { [n]: `若 ${n} 人全說謊，說「${n} 人說謊」的人就說真話了，矛盾。`, [n - 2 || 1]: `說謊 ${n - 2 || 1} 人就有更多人說真話，但每句數字都不同。` } });
      }
    ],
    B: [
      mkCulprit('tf-two-true', 4, 2, '剛好 2 人說真話'),
      /* statements about each other: how many liars? */
      (r, p) => {
        const NM = ['甲', '乙', '丙'];
        for (let tries = 0; tries < 800; tries++) {
          const st = NM.map((_, i) => { const oth = NM.map((_, j) => j).filter(j => j !== i), k = ri(r, 0, 4);
            if (k <= 1) return { k: 's', j: pick(r, oth), v: k === 0 };
            if (k === 2) return { k: 'd', v: false };
            if (k === 3) return { k: 'd', v: true };
            return { k: 'o' }; });
          const sols = [];
          for (let m = 0; m < 8; m++) {
            const tv = [m & 1, m >> 1 & 1, m >> 2 & 1].map(Boolean);
            const ok = st.every((s, i) => { const oth = [0, 1, 2].filter(j => j !== i); let val;
              if (s.k === 's') val = tv[s.j] === s.v; else if (s.k === 'd') val = oth.every(j => tv[j] === s.v); else val = oth.filter(j => !tv[j]).length === 1;
              return val === tv[i]; });
            if (ok) sols.push(tv);
          }
          if (sols.length === 1) {
            const liars = sols[0].filter(x => !x).length, lines = st.map((s, i) => { const oth = NM.filter((_, j) => j !== i);
              const body = s.k === 's' ? `${NM[s.j]}${s.v ? '說真話' : '說謊'}` : s.k === 'd' ? `${oth[0]}和${oth[1]}都${s.v ? '說真話' : '說謊'}` : `${oth[0]}、${oth[1]}中有一人說謊`;
              return `${NM[i]}：「${body}」`; });
            const why = {}; for (let c = 0; c <= 3; c++) if (c !== liars) why[c] = `假設說謊 ${c} 人，總有一句話對不上。`;
            return O('tf-chain', `甲乙丙各說一句。${lines.join('，')}。說謊的有幾人？`, liars, '假設甲說真話，推下去看有沒有矛盾。',
              `逐個假設甲乙丙是真是假，只有說謊 ${liars} 人，三句話才互相配合。`, Object.keys(why).map(Number), '', [], { svg: faces(3).replace(/(\d)號/g, (m0, d) => NM[d - 1]), why });
          }
        }
        return O('tf-chain', '甲乙丙各說一句。甲：「乙說謊」，乙：「丙說謊」，丙：「甲和乙都說謊」。說謊的有幾人？', 2, '', '', [0, 1, 3], '', [], { svg: faces(3), why: { 0: '總有一句對不上。', 1: '總有一句對不上。' } });
      }
    ]
  };
  const parseTF = q => {
    const m0 = /^(\d) 位同學中有 1 人(.+?)，(只有 1 人說謊|只有 1 人說真話|剛好 2 人說真話)。(.+)的是幾號？$/.exec(q.q); if (!m0) return null;
    const n = +m0[1], tt = m0[3] === '只有 1 人說謊' ? n - 1 : m0[3] === '只有 1 人說真話' ? 1 : 2, body = m0[2] ? q.q.slice(q.q.indexOf('。') + 1) : '';
    const st = [...body.matchAll(/(\d)號：(不是我|不是(\d)號|是(\d)號)。/g)].map(x => ({ i: +x[1], neg: x[2].startsWith('不是'), j: x[2] === '不是我' ? +x[1] : +(x[3] || x[4]) }));
    if (st.length !== n) return null;
    const hits = []; for (let c = 1; c <= n; c++) { let cnt = 0; for (const s of st) if (s.neg ? c !== s.j : c === s.j) cnt++; if (cnt === tt) hits.push(c); }
    return hits.length === 1 ? String(hits[0]) : 'none';
  };
  const verify54 = q => {
    let m;
    if (/位同學中有 1 人/.test(q.q)) return parseTF(q);
    if ((m = /^(\d) 人各說一句。((?:\d號說有\d人說謊；)+)到底/.exec(q.q))) {
      const n = +m[1], vals = [...m[2].matchAll(/說有(\d)人說謊/g)].map(x => +x[1]);
      for (let L = 0; L <= n; L++) { const truth = vals.filter(v => v === L).length; if (n - L === truth) return String(L); }
      return 'none';
    }
    if ((m = /^甲乙丙各說一句。(.+)。說謊的有幾人？$/.exec(q.q))) {
      const parts = [...m[1].matchAll(/(甲|乙|丙)：「([^」]+)」/g)].map(x => ({ who: '甲乙丙'.indexOf(x[1]), s: x[2] })), sols = [];
      for (let mask = 0; mask < 8; mask++) {
        const tv = [0, 1, 2].map(i => !!(mask >> i & 1));
        const ok = parts.every(pt => { const s = pt.s; let val; let mm;
          if ((mm = /^(.)說(真話|謊)$/.exec(s))) val = tv['甲乙丙'.indexOf(mm[1])] === (mm[2] === '真話');
          else if ((mm = /^(.)和(.)都說(真話|謊)$/.exec(s))) val = tv['甲乙丙'.indexOf(mm[1])] === (mm[3] === '真話') && tv['甲乙丙'.indexOf(mm[2])] === (mm[3] === '真話');
          else if ((mm = /^(.)、(.)中有一人說謊$/.exec(s))) val = (tv['甲乙丙'.indexOf(mm[1])] ? 0 : 1) + (tv['甲乙丙'.indexOf(mm[2])] ? 0 : 1) === 1;
          else return false;
          return val === tv[pt.who]; });
        if (ok) sols.push(tv.filter(x => !x).length);
      }
      return sols.length === 1 ? String(sols[0]) : 'none';
    }
    return null;
  };
  const PUZ = [{ id: 'a', label: '甲', emoji: '🧒' }, { id: 'b', label: '乙', emoji: '👧' }, { id: 'c', label: '丙', emoji: '🧑' }];
  WQOly.register({
    id: 'p5-4', grade: 5, n: 4, title: '真假推理', icon: '🕵️',
    card: { motto: '假設一個再檢查', example: '假設他說真話，再對照', art: art54 },
    lesson: [
      { t: 'show', say: '3 人中有 1 人偷吃糖。只有 1 人說謊。', scene: { w: 'sortcards', p: { cards: PUZ, order: ['a', 'c', 'b'], start: ['a', 'b', 'c'] }, still: true } },
      { t: 'show', say: '甲說不是我，乙說是甲，丙說是乙。', scene: { w: 'sortcards', p: { cards: PUZ, order: ['a', 'c', 'b'], start: ['a', 'b', 'c'] }, still: true } },
      { t: 'predict', say: '先假設是甲偷吃。', ask: '這樣有幾人說真話？', options: ['1', '2', '3'], answer: '1', scene: { w: 'sortcards', p: { cards: PUZ, order: ['b', 'a', 'c'], start: ['a', 'b', 'c'] }, still: true }, reveal: '只有乙說真話，排到最左。題目要 2 人說真話，不是甲。' },
      { t: 'do', say: '找出說謊的人，排到最右邊。其他人按甲、丙次序。', scene: { w: 'sortcards', p: { cards: PUZ, order: ['a', 'c', 'b'], start: ['b', 'a', 'c'] } } },
      { t: 'show', say: '假設乙偷吃：甲、丙說真話，乙說謊。剛好 1 人說謊！', scene: { w: 'sortcards', p: { cards: PUZ, order: ['a', 'c', 'b'], start: ['a', 'c', 'b'] }, still: true } },
      { t: 'try', say: '用同一方法。', scene: { w: 'sortcards', p: { cards: PUZ, order: ['a', 'b', 'c'] }, still: true },
        q: { stem: '3 人中 1 人打破杯，只有 1 人說謊。甲：是乙。乙：不是我。丙：是甲。誰打破杯？', options: ['甲', '乙', '丙'], answer: '甲', hint: '逐個假設是犯人，數說謊的有幾人。', why: { 乙: '若是乙，甲說真話、乙和丙說謊，有 2 人說謊。', 丙: '若是丙，甲和丙說謊，有 2 人說謊。' } } },
      { t: 'card' }
    ],
    gens: g54, verify: verify54
  });

  /* ---- p5-5 容斥原理 (two circles only) ----------------------------------------------------------------------------------- */
  const art55 = '<svg viewBox="0 0 120 80"><circle cx="46" cy="36" r="26" fill="rgba(62,230,208,.3)" stroke="#3ee6d0" stroke-width="2.4"/><circle cx="74" cy="36" r="26" fill="rgba(255,201,74,.3)" stroke="#ffc94a" stroke-width="2.4"/><text x="60" y="37" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="900" fill="#fff">5</text><rect x="14" y="66" width="92" height="12" rx="6" fill="#ff8fc7"/><text x="60" y="72" text-anchor="middle" dominant-baseline="central" font-size="10" font-weight="900" fill="#0b1030">12＋9－5＝16</text></svg>';
  /* two overlapping circles: la / lb are the circle totals, mid the overlap, q the thing to find */
  const venn = (la, na, lb, nb, mid, q) => `<svg viewBox="0 0 240 110" role="img" aria-label="兩個圈：${la}${na}人，${lb}${nb}人，重疊${mid}人"><circle cx="96" cy="58" r="40" fill="rgba(62,230,208,.22)" stroke="${AQ}" stroke-width="2.4"/><circle cx="144" cy="58" r="40" fill="rgba(255,201,74,.22)" stroke="${GO}" stroke-width="2.4"/>${text(70, 58, '', 16)}${text(120, 58, mid, 20, '#fff')}${text(62, 12, la + ' ' + na, 13, AQ)}${text(178, 12, lb + ' ' + nb, 13, GO)}${q ? text(120, 104, q, 13, PK) : ''}</svg>`;
  const g55 = {
    A: [
      (r, p) => {
        const a = N(r, p, 8, 30), b = N(r, p, 8, 30), c = ri(r, 2, Math.min(a, b) - 2), s = a + b - c;
        return O('venn', `班裏 ${a} 人愛跳繩，${b} 人愛游泳，其中 ${c} 人兩樣都愛。至少愛一樣的有幾人？`, s, '兩樣都愛的人被數了兩次。',
          `${a}＋${b}＝${a + b}，兩樣都愛的 ${c} 人被數了兩次，減去一次：${a + b}－${c}＝${s}。`, [a + b, s + c, s - 1, a - c + b - c], `${a}+${b}-${c}`, [],
          { svg: venn('跳繩', a, '游泳', b, c, '至少愛一樣：？'), why: { [a + b]: `兩樣都愛的 ${c} 人被數了兩次，要減去一次。`, [a - c + b - c]: `只愛一樣的 ${a - c + b - c} 人還要加上兩樣都愛的 ${c} 人。` } });
      },
      (r, p) => {
        const a = N(r, p, 8, 30), b = N(r, p, 8, 30), c = ri(r, 2, Math.min(a, b) - 2), s = a + b - c;
        return O('venn-both', `${a} 人愛跳繩，${b} 人愛游泳，至少愛一樣的共 ${s} 人。兩樣都愛的有幾人？`, c, '加起來比總人數多出的，就是重疊。',
          `${a}＋${b}＝${a + b}，比 ${s} 多 ${a + b - s}，多出的就是被數了兩次的人：${c} 人。`, [s - a, a + b + s, a + b, c + 1], `${a}+${b}-${s}`, [],
          { svg: venn('跳繩', a, '游泳', b, '？', '至少愛一樣：' + s), why: { [a + b]: `${a + b} 是兩個圈的人數相加，還要減去總人數 ${s}。`, [s - a]: `${s - a} 是只愛游泳的人，不是兩樣都愛。` } });
      },
      (r, p) => {
        const a = N(r, p, 10, 40), c = ri(r, 2, a - 3), b = ri(r, c + 2, Math.min(40, c + 25)), it = pick(r, [['蘋果', '橙'], ['貓', '狗']]), nm = pick(r, ['跳繩', '游泳']);
        return O('venn-only', `${a} 人愛${nm}，其中 ${c} 人也愛畫畫。只愛${nm}的有幾人？`, a - c, `愛${nm}的人裏，有些也愛畫畫。`,
          `${a} 人愛${nm}，其中 ${c} 人也愛畫畫，只愛${nm}的是 ${a}－${c}＝${a - c} 人。`, [a, a + c, c, a - c - 1], `${a}-${c}`, [],
          { svg: venn(nm, a, '畫畫', '？', c, '只愛' + nm + '：？'), why: { [a]: `${a} 人裏包括也愛畫畫的 ${c} 人，要減去。`, [c]: `${c} 人是兩樣都愛的，不是只愛${nm}。` } });
      }
    ],
    B: [
      (r, p) => {
        const a = N(r, p, 8, 26), b = N(r, p, 8, 26), c = ri(r, 2, Math.min(a, b) - 2), u = a + b - c, T = u + ri(r, 2, Math.min(12, 60 - u));
        return O('venn-none', `全班 ${T} 人，${a} 人愛跳繩，${b} 人愛游泳，${c} 人兩樣都愛。兩樣都不愛的有幾人？`, T - u, '先求至少愛一樣的人數。',
          `至少愛一樣：${a}＋${b}－${c}＝${u}。兩樣都不愛：${T}－${u}＝${T - u}。`, [u, T - a - b, T - u + c, T - u - 1], `${T}-(${a}+${b}-${c})`, [],
          { svg: venn('跳繩', a, '游泳', b, c, '全班 ' + T + '，兩樣都不愛：？'), why: { [u]: `${u} 是至少愛一樣的人數，還要用全班人數減去。`, [T - a - b]: `兩樣都愛的 ${c} 人被減了兩次，要補回來。` } });
      },
      (r, p) => {
        const a = N(r, p, 8, 26), b = N(r, p, 8, 26), c = ri(r, 2, Math.min(a, b) - 2), u = a + b - c, z = ri(r, 2, Math.min(10, 60 - u)), T = u + z;
        return O('venn-total', `全班 ${T} 人，${z} 人兩樣都不愛。${a} 人愛跳繩，${b} 人愛游泳。兩樣都愛的有幾人？`, c, '先求至少愛一樣的人數。',
          `至少愛一樣：${T}－${z}＝${u}。${a}＋${b}＝${a + b}，比 ${u} 多 ${c}，兩樣都愛的有 ${c} 人。`, [u, a + b - T, a + b, c + 1], `${a}+${b}-(${T}-${z})`, [],
          { svg: venn('跳繩', a, '游泳', b, '？', '全班 ' + T + '，都不愛 ' + z), why: { [u]: `${u} 是至少愛一樣的人數，還要用 ${a}＋${b} 去減。`, [a + b - T]: `要先減去兩樣都不愛的 ${z} 人，再算重疊。` } });
      },
      (r, p) => {
        const a = N(r, p, 8, 30), b = N(r, p, 8, 30), c = ri(r, 2, Math.min(a, b) - 2), s = a + b - 2 * c;
        return O('venn-one', `${a} 人愛跳繩，${b} 人愛游泳，${c} 人兩樣都愛。只愛一樣的有幾人？`, s, '把兩樣都愛的人從兩邊都拿走。',
          `只愛跳繩：${a}－${c}＝${a - c}；只愛游泳：${b}－${c}＝${b - c}。合共 ${a - c}＋${b - c}＝${s}。`, [a + b - c, a + b, s + c, s - c], `${a}+${b}-2*${c}`, [],
          { svg: venn('跳繩', a, '游泳', b, c, '只愛一樣：？'), why: { [a + b - c]: `${a + b - c} 包括兩樣都愛的 ${c} 人，只愛一樣不應包括他們。`, [a + b]: `兩樣都愛的 ${c} 人被數了兩次，而且他們不是只愛一樣。` } });
      }
    ]
  };
  const verify55 = q => {
    let m;
    if ((m = /^班裏 (\d+) 人愛跳繩，(\d+) 人愛游泳，其中 (\d+) 人兩樣都愛/.exec(q.q))) { const A = new Set(), B = new Set(); for (let i = 0; i < +m[1]; i++) A.add(i); for (let i = 0; i < +m[2]; i++) B.add(i < +m[3] ? i : 1000 + i); return String(new Set([...A, ...B]).size); }
    if ((m = /^(\d+) 人愛跳繩，(\d+) 人愛游泳，至少愛一樣的共 (\d+) 人/.exec(q.q))) { for (let c = 0; c <= +m[1]; c++) if (m[1] - c + (m[2] - c) + c === +m[3]) return String(c); return 'none'; }
    if ((m = /^(\d+) 人愛(跳繩|游泳)，其中 (\d+) 人也愛畫畫。只愛/.exec(q.q))) return String(m[1] - m[3]);
    if ((m = /^全班 (\d+) 人，(\d+) 人愛跳繩，(\d+) 人愛游泳，(\d+) 人兩樣都愛/.exec(q.q))) { const only1 = m[2] - m[4], only2 = m[3] - m[4]; return String(m[1] - (only1 + only2 + +m[4])); }
    if ((m = /^全班 (\d+) 人，(\d+) 人兩樣都不愛。(\d+) 人愛跳繩，(\d+) 人愛游泳/.exec(q.q))) { const u = m[1] - m[2]; for (let c = 0; c <= u; c++) if ((m[3] - c) + (m[4] - c) + c === u) return String(c); return 'none'; }
    if ((m = /^(\d+) 人愛跳繩，(\d+) 人愛游泳，(\d+) 人兩樣都愛。只愛一樣/.exec(q.q))) return String((m[1] - m[3]) + (m[2] - m[3]));
    return null;
  };
  /* bars as a "Venn on a number line": the overlap sits under both circles */
  const VB = (a, b, c) => [
    { label: '跳繩', segs: [{ u: a - c, c: 'a', text: '只跳' }, { u: c, c: 'd', text: '都愛' }] },
    { label: '游泳', segs: [{ u: a - c, c: 'a', dashed: true, text: '' }, { u: c, c: 'd', text: '都愛' }, { u: b - c, c: 'b', text: '只游' }] }
  ];
  WQOly.register({
    id: 'p5-5', grade: 5, n: 5, title: '容斥原理', icon: '⭕',
    card: { motto: '重疊要減一次', example: '12＋9－5＝16', art: art55 },
    lesson: [
      { t: 'show', say: '8 人愛跳繩，7 人愛游泳，5 人兩樣都愛。', scene: { w: 'bars', p: { rows: VB(8, 7, 5) } } },
      { t: 'predict', say: '粉紅色的 5 人，兩邊都數到。', ask: '至少愛一樣的有幾人？', options: ['15', '10', '12'], answer: '10', scene: { w: 'bars', p: { rows: VB(8, 7, 5).concat([{ label: '合共', segs: [{ u: 10, c: 't', text: '？' }] }]) }, still: true }, reveal: '粉紅的 5 人數了兩次。15－5＝10。' },
      { t: 'do', say: '拉動把手，把粉紅色的人只數一次。', scene: { w: 'bars', p: { rows: VB(8, 7, 5).concat([{ label: '合共', segs: [{ u: 15, c: 't', edit: true, target: 10, min: 1, max: 15 }] }]) } } },
      { t: 'show', say: '8＋7－5＝10。重疊的人要減一次。', scene: { w: 'bars', p: { rows: VB(8, 7, 5).concat([{ label: '合共', segs: [{ u: 10, c: 't', text: '10 人' }] }]) }, still: true } },
      { t: 'predict', say: '全班 13 人。', ask: '兩樣都不愛的有幾人？', options: ['3', '5', '2'], answer: '3', scene: { w: 'bars', p: { rows: VB(8, 7, 5).concat([{ label: '全班', segs: [{ u: 10, c: 't', text: '10 人' }, { u: 3, c: 'd', dashed: true, text: '？' }] }]) }, still: true }, reveal: '至少愛一樣的有 10 人。13－10＝3，有 3 人都不愛。' },
      { t: 'try', say: '用同一方法。', scene: { w: 'bars', p: { rows: VB(11, 9, 4) }, still: true },
        q: { stem: '11 人愛跳繩，9 人愛游泳，4 人兩樣都愛。至少愛一樣的有幾人？', options: ['16', '20', '12'], answer: '16', hint: '11＋9 之後，重疊的 4 人要減去一次。', why: { 20: '兩樣都愛的 4 人被數了兩次，要減去一次。', 12: '減去兩次太多了，只減一次。' } } },
      { t: 'card' }
    ],
    gens: g55, verify: verify55
  });
})();
