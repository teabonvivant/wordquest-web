/* 小二 · 5 units, all finished. See docs/奧數路線-20261022/單元撰寫指引.md. Numbers stay within 100 (week = 7, other rounds 2-7). */
(function () {
  'use strict';
  const { o, N, ri, pick, shuffle, name } = WQOly.helpers;
  const CA = '#3ee6d0', CB = '#ffc94a', CC = '#ff8fc7', CV = '#c6a2ff', CT = '#c3cbf7';
  const rep = (n, f) => Array.from({ length: n }, (_, i) => f(i));
  const svgOf = (w, h, body, label) => `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}">${body}</svg>`;
  const why = (...kv) => { const w = {}; kv.forEach(([k, t]) => { if (k !== undefined && k !== null && !Number.isNaN(k) && k >= 0 && !(k in w)) w[k] = t; }); return w; };
  const WD = ['一', '二', '三', '四', '五', '六', '日'];

  /* ---- p2-1 數列跳數 ----------------------------------------------------------------------------------------------------- */
  const art21 = `<svg viewBox="0 0 120 80"><path d="M10 52h100" stroke="#c3cbf7" stroke-width="3" stroke-linecap="round"/>${[0, 1, 2, 3, 4].map(i => `<path d="M${16 + i * 22} 46v12" stroke="#c3cbf7" stroke-width="2.4"/><text x="${16 + i * 22}" y="70" text-anchor="middle" font-size="11" font-weight="800" fill="#c3cbf7">${2 + i * 2}</text>`).join('')}${[0, 1, 2, 3].map(i => `<path d="M${16 + i * 22} 44Q${27 + i * 22} 20 ${38 + i * 22} 44" stroke="${['#3ee6d0', '#ffc94a', '#ff8fc7', '#c6a2ff'][i]}" stroke-width="3" fill="none" stroke-dasharray="1 6" stroke-linecap="round"/><text x="${27 + i * 22}" y="22" text-anchor="middle" font-size="12" font-weight="900" fill="${['#3ee6d0', '#ffc94a', '#ff8fc7', '#c6a2ff'][i]}">＋2</text>`).join('')}</svg>`;
  const g21 = {
    A: [
      /* next term, going up or down */
      (r, p) => {
        const d = N(r, p, 2, 5), n = ri(r, 4, 5), down = r() < .25, s = down ? N(r, p, d * (n + 1) + 1, 70) : N(r, p, 1, 30), sg = down ? -d : d;
        const t = rep(n, i => s + sg * i), ans = s + sg * n, last = t[n - 1];
        return o('seq-next', `${t.join('、')}、？`, ans, '看相鄰兩個數，差多少？', `每次${down ? '減' : '加'} ${d}：${last}${down ? '－' : '＋'}${d}＝${ans}。`, [last + (down ? -1 : 1), ans + 1, ans - 1, last + sg * 2], `${last}${down ? '-' : '+'}${d}`, [],
          { why: why([last + (down ? -1 : 1), `相鄰兩個數差 ${d}，不是 1。`], [last + sg * 2, `只${down ? '減' : '加'}一次 ${d}，不是兩次。`], [last, `${last} 是上一個數，要再${down ? '減' : '加'} ${d}。`]) });
      },
      /* one term hidden in the middle */
      (r, p) => {
        const d = N(r, p, 2, 5), n = ri(r, 5, 6), s = N(r, p, 1, 30), m = ri(r, 1, n - 2), t = rep(n, i => s + d * i), ans = t[m];
        return o('seq-gap', t.map((v, i) => i === m ? '？' : v).join('、'), ans, '看前後兩個數，差多少？', `每次加 ${d}：${t[m - 1]}＋${d}＝${ans}。`, [t[m - 1], t[m + 1], ans + 1, ans - 1, ans + d], `${t[m - 1]}+${d}`, [],
          { why: why([t[m - 1], `${t[m - 1]} 是空位前面的數，要再加 ${d}。`], [t[m + 1], `${t[m + 1]} 是空位後面的數，空位要少 ${d}。`], [ans + 1, `每次的差是 ${d}，不是 1。`]) });
      },
      /* a frog jumps k times */
      (r, p) => {
        const a = N(r, p, 0, 30), d = N(r, p, 2, 6), k = ri(r, 2, 6), ans = a + k * d;
        return o('seq-frog', `小青蛙從 ${a} 開始，每次跳 ${d} 格，跳 ${k} 次到哪裏？`, ans, `每次跳 ${d} 格，跳 ${k} 次。`, `${k} 次共跳 ${k}×${d}＝${k * d} 格；${a}＋${k * d}＝${ans}。`, [a + d * (k - 1), a + d * (k + 1), k * d, a + k], `${a}+${k}*${d}`, [],
          { why: why([a + d * (k - 1), `跳 ${k} 次要加 ${k} 次 ${d}，少加了一次。`], [k * d, `${k * d} 是跳過的格數，還要加上起點 ${a}。`], [a + d * (k + 1), `跳 ${k} 次就停，不要多加一次。`]) });
      }
    ],
    B: [
      /* the n-th term of a list that is only partly written */
      (r, p) => {
        const d = N(r, p, 2, 6), s = N(r, p, 1, 20), k = ri(r, 6, 12), t = rep(4, i => s + d * i), ans = s + d * (k - 1);
        return o('seq-nth', `${t.join('、')}……第 ${k} 個數是幾？`, ans, `每次加 ${d}。第 ${k} 個要加幾次？`, `第 1 個是 ${s}，到第 ${k} 個加了 ${k - 1} 次 ${d}：${s}＋${(k - 1) * d}＝${ans}。`, [s + d * k, s + d * (k - 2), (k - 1) * d, ans + 1], `${s}+${k - 1}*${d}`, [],
          { why: why([s + d * k, `第 ${k} 個只加了 ${k - 1} 次，因為第 1 個本來就在。`], [(k - 1) * d, `${(k - 1) * d} 是加上去的部分，還要加起點 ${s}。`], [s + d * (k - 2), `要加 ${k - 1} 次，不是 ${k - 2} 次。`]) });
      },
      /* two far-apart terms are given: find the step first */
      (r, p) => {
        const d = N(r, p, 2, 6), s = ri(r, 1, 10), i = ri(r, 2, 3), j = i + ri(r, 2, 3), k = j + ri(r, 1, 2), x = s + d * (i - 1), y = s + d * (j - 1), ans = s + d * (k - 1);
        return o('seq-two', `每次加同一個數：第 ${i} 個是 ${x}，第 ${j} 個是 ${y}。第 ${k} 個是幾？`, ans, `${y}－${x} 是幾次加出來的？`, `${j - i} 次加了 ${y - x}，每次加 ${d}；第 ${k} 個是 ${y}＋${(k - j) * d}＝${ans}。`, [y + d, y + (k - j) * (d + 1), y - x, ans + 1, ans - 1], `${y}+${k - j}*${d}`, [],
          { why: why([y - x, `${y - x} 是 ${j - i} 次加出來的，每次要除以 ${j - i}。`], [y + (k - j) * (d + 1), '每次加的數要算對：先除，再加。'], [y + d, `第 ${k} 個比第 ${j} 個多 ${k - j} 次，不是 1 次。`]) });
      },
      /* how many jumps to reach b */
      (r, p) => {
        const d = N(r, p, 2, 6), t = N(r, p, 3, 10), a = N(r, p, 0, 20), b = a + t * d;
        return o('seq-times', `小青蛙從 ${a} 開始，每次跳 ${d} 格。跳到 ${b} 要跳幾次？`, t, '先算要跳多少格。', `${b}－${a}＝${t * d} 格；每次 ${d} 格，${t * d}÷${d}＝${t} 次。`, [t * d, t + 1, t - 1, b / d | 0], `${t * d}/${d}`, [],
          { why: why([t * d, `${t * d} 是要跳的格數，每次跳 ${d} 格，還要除以 ${d}。`], [t + 1, '起點不用跳，跳的次數沒有多一次。'], [t - 1, `要跳到剛好是 ${b}，一次都不能少。`]) });
      }
    ]
  };
  const verify21 = q => {
    let m;
    if ((m = /^([\d、？]+)$/.exec(q.q))) {
      const tk = m[1].split('、'), idx = tk.indexOf('？'), kn = tk.map((x, i) => x === '？' ? null : [i, +x]).filter(Boolean), a = kn[0], z = kn[kn.length - 1];
      const d = (z[1] - a[1]) / (z[0] - a[0]); return String(a[1] + d * (idx - a[0]));
    }
    if ((m = /^小青蛙從 (\d+) 開始，每次跳 (\d+) 格，跳 (\d+) 次到哪裏？$/.exec(q.q))) { let x = +m[1]; for (let i = 0; i < +m[3]; i++) x += +m[2]; return String(x); }
    if ((m = /^([\d、]+)……第 (\d+) 個數是幾？$/.exec(q.q))) { const t = m[1].split('、').map(Number), d = t[1] - t[0]; let x = t[0]; for (let i = 1; i < +m[2]; i++) x += d; return String(x); }
    if ((m = /^每次加同一個數：第 (\d+) 個是 (\d+)，第 (\d+) 個是 (\d+)。第 (\d+) 個是幾？$/.exec(q.q))) {
      const i = +m[1], x = +m[2], j = +m[3], y = +m[4], k = +m[5];
      for (let d = 0; d < 40; d++) if (x + d * (j - i) === y) { let v = y; for (let n = j; n < k; n++) v += d; return String(v); }
      return 'none';
    }
    if ((m = /^小青蛙從 (\d+) 開始，每次跳 (\d+) 格。跳到 (\d+) 要跳幾次？$/.exec(q.q))) { let x = +m[1], c = 0; while (x < +m[3]) { x += +m[2]; c++; } return x === +m[3] ? String(c) : 'none'; }
    return null;
  };
  WQOly.register({
    id: 'p2-1', grade: 2, n: 1, title: '數列跳數', icon: '🐸',
    card: { motto: '找相鄰的差', example: '2、4、6、8、10', art: art21 },
    lesson: [
      { t: 'show', say: '青蛙每次跳 2 格：2、4、6、8……', scene: { w: 'numline', p: { min: 0, max: 12, start: 0, target: 8, steps: [2], hops: rep(4, () => ({ n: 2 })) }, still: true } },
      { t: 'predict', say: '2、4、6、8，每次都加 2。', ask: '下一個數是幾？', options: ['9', '10', '12'], answer: '10', scene: { w: 'numline', p: { min: 0, max: 12, start: 0, target: 10, steps: [2], hops: rep(5, () => ({ n: 2 })) }, still: true }, reveal: '8 再加 2，就是 10！' },
      { t: 'do', say: '按「＋3」，一次跳 3 格，跳到 15。', scene: { w: 'numline', p: { min: 0, max: 15, start: 0, target: 15, steps: [3] } } },
      { t: 'show', say: '看相鄰兩個數，差多少，就是跳多少。', scene: { w: 'numline', p: { min: 0, max: 30, start: 5, target: 25, steps: [5], hops: rep(4, () => ({ n: 5 })) }, still: true } },
      { t: 'do', say: '4、8、12……每次加 4，跳到 24。', scene: { w: 'numline', p: { min: 0, max: 24, start: 0, target: 24, steps: [4] } } },
      { t: 'try', say: '先看相鄰兩個數的差。', scene: { w: 'numline', p: { min: 0, max: 30, start: 5, target: 25, steps: [5], hops: rep(4, () => ({ n: 5 })) }, still: true },
        q: { stem: '5、10、15、20、？', options: ['22', '25', '30'], answer: '25', hint: '相鄰兩個數差 5。', why: { 22: '差是 5，不是 2。', 30: '20 只加一次 5，是 25。' } } },
      { t: 'card' }
    ],
    gens: g21, verify: verify21
  });

  /* ---- p2-2 巧算加減 ----------------------------------------------------------------------------------------------------- */
  const art22 = `<svg viewBox="0 0 120 80"><rect x="6" y="10" width="46" height="22" rx="6" fill="rgba(255,255,255,.1)" stroke="#3ee6d0" stroke-width="2"/><text x="29" y="21" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="900" fill="#3ee6d0">98</text><rect x="68" y="10" width="46" height="22" rx="6" fill="rgba(255,255,255,.1)" stroke="#ffc94a" stroke-width="2"/><text x="91" y="21" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="900" fill="#ffc94a">47</text><path d="M80 34Q66 48 40 36" stroke="#ff8fc7" stroke-width="2.4" fill="none" stroke-dasharray="3 3"/><text x="60" y="49" text-anchor="middle" font-size="11" font-weight="900" fill="#ff8fc7">借 2</text><rect x="10" y="56" width="100" height="18" rx="9" fill="#c6a2ff"/><text x="60" y="66" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="900" fill="#0b1030">100 ＋ 45</text></svg>`;
  const nz = (r, lo, hi) => { let v = ri(r, lo, hi); if (v % 10 === 0) v += v < hi ? 1 : -1; return v; };
  const g22 = {
    A: [
      /* add a number just below a ten: borrow to make the ten */
      (r, p) => {
        const u = N(r, p, 3, 9), e = ri(r, 1, 3), a = 10 * u - e, b = N(r, p, 12, 60), ans = a + b;
        return o('quick-add', `${a}＋${b}＝？先湊成整十。`, ans, `${a} 差 ${e} 就是 ${10 * u}。`, `${b} 分出 ${e}：${a}＋${e}＝${10 * u}；${10 * u}＋${b - e}＝${ans}。`, [ans + e, ans - e, ans + 2 * e, 10 * u + b], `${a}+${b}`, [],
          { why: why([ans + e, `借了 ${e} 給 ${a}，${b} 要少 ${e}，別忘了減。`], [ans - e, `${b} 只分出 ${e}，剩下 ${b - e}，不是再減一次。`], [10 * u + b, `${b} 分出了 ${e}，只剩 ${b - e}。`]) });
      },
      /* subtract a number just below a ten: take the ten, then give back */
      (r, p) => {
        const u = N(r, p, 2, 8), e = ri(r, 1, 3), b = 10 * u - e, a = ri(r, b + 6, 100), ans = a - b;
        return o('quick-sub', `${a}－${b}＝？先減整十，再補回。`, ans, `${b} 差 ${e} 就是 ${10 * u}。`, `先減 ${10 * u}：${a}－${10 * u}＝${a - 10 * u}；多減了 ${e}，加回來：${ans}。`, [a - 10 * u, a - 10 * u - e, ans + e, ans - e], `${a}-${b}`, [],
          { why: why([a - 10 * u, `減多了 ${e}，要補回 ${e}。`], [a - 10 * u - e, `多減的 ${e} 要加回來，不是再減。`], [ans + e, `補回 ${e} 之後就是答案，不用再加。`]) });
      },
      /* how many more to reach 100 */
      (r, p) => {
        const a = nz(r, N(r, p, 11, 89), 89), ans = 100 - a, oc = 10 - a % 10, tc = 9 - Math.floor(a / 10);
        return o('quick-comp', `${a}＋？＝100`, ans, `個位 ${a % 10} 要配 ${oc}，十位再配。`, `${a % 10}＋${oc}＝10；十位 ${Math.floor(a / 10)}＋${tc}＝9；合起來是 ${tc}${oc}，即 ${ans}。`, [ans + 10, ans - 10, tc * 10 + oc + 1, a], `100-${a}`, [],
          { why: why([ans + 10, '個位湊成 10 之後，十位只要配成 9，不是 10。'], [ans - 10, '十位要配成 9，別配少了。'], [a, `${a} 是已經有的，題目問還差多少。`]) });
      }
    ],
    B: [
      /* three numbers: two make a round number */
      (r, p) => {
        const T = r() < .5 ? 100 : 50, a = T === 100 ? nz(r, 11, 89) : nz(r, 11, 39), c = T - a, b = nz(r, 11, T === 100 ? 50 : 40), arr = shuffle(r, [a, b, c]), ans = b + T;
        return o('quick-pair', `${arr.join('＋')}＝？找出和是 ${T} 的一對。`, ans, `哪兩個加起來是 ${T}？`, `${a}＋${c}＝${T}；${T}＋${b}＝${ans}。`, [T, ans + 10, ans - 10, a + b, b + c], arr.join('+'), [],
          { why: why([T, `${T} 只是一對的和，還要加上剩下的 ${b}。`], [a + b, `${a}＋${b} 不是整十，要先找湊成 ${T} 的一對。`], [ans - 10, `${T}＋${b} 才是答案，十位別少算。`]) });
      },
      /* a + b - c where b and c are close */
      (r, p) => {
        const k = ri(r, 1, 9), c = N(r, p, 21, 70), b = c + k, a = ri(r, 10, 70), ans = a + k;
        return o('quick-addsub', `${a}＋${b}－${c}＝？`, ans, `${b} 和 ${c} 很接近。先算 ${b}－${c}。`, `${b}－${c}＝${k}；${a}＋${k}＝${ans}。`, [a + b + c, a + b, ans + 10, ans - 1, k], `${a}+${b}-${c}`, [],
          { why: why([a + b, `${a}＋${b} 之後還要減 ${c}。`], [a + b + c, '後面是「－」，要減去，不是加上。'], [k, `${k} 只是 ${b}－${c}，還要加上 ${a}。`]) });
      },
      /* four numbers: two pairs of round numbers */
      (r, p) => {
        const a = nz(r, 11, 89), c = 100 - a, b = nz(r, 11, 39), d = 50 - b, arr = shuffle(r, [a, b, c, d]);
        return o('quick-four', `${arr.join('＋')}＝？找出湊整的兩對。`, 150, '哪兩個和是 100？哪兩個和是 50？', `${a}＋${c}＝100；${b}＋${d}＝50；100＋50＝150。`, [100, 50, 140, 160, 120], arr.join('+'), [],
          { why: why([100, '只湊成一對，另一對（和是 50）也要加。'], [50, '只算了一對，還有和是 100 的一對。'], [140, '兩對的和是 100 和 50，不是 100 和 40。']) });
      }
    ]
  };
  const verify22 = q => {
    let m;
    if ((m = /^(\d+)＋？＝100$/.exec(q.q))) { for (let x = 0; x <= 100; x++) if (+m[1] + x === 100) return String(x); return 'none'; }
    if ((m = /^(\d+)＋(\d+)＋(\d+)＋(\d+)＝？/.exec(q.q))) return String(+m[1] + +m[2] + +m[3] + +m[4]);
    if ((m = /^(\d+)＋(\d+)＋(\d+)＝？/.exec(q.q))) return String(+m[1] + +m[2] + +m[3]);
    if ((m = /^(\d+)＋(\d+)－(\d+)＝？/.exec(q.q))) return String(+m[1] + +m[2] - +m[3]);
    if ((m = /^(\d+)＋(\d+)＝？/.exec(q.q))) return String(+m[1] + +m[2]);
    if ((m = /^(\d+)－(\d+)＝？/.exec(q.q))) return String(+m[1] - +m[2]);
    return null;
  };
  const ln = (lo, hi, start, target, steps, hops) => ({ w: 'numline', p: { min: lo, max: hi, start, target, steps, hops } });
  WQOly.register({
    id: 'p2-2', grade: 2, n: 2, title: '巧算加減', icon: '🧮',
    card: { motto: '湊整再補', example: '98＋47＝100＋45', art: art22 },
    lesson: [
      { t: 'show', say: '98＋47：先湊成 100，再加 45。', scene: Object.assign(ln(95, 150, 98, 145, [2, 45], [{ n: 2 }, { n: 45 }]), { still: true }) },
      { t: 'predict', say: '98 差一點點就是 100。', ask: '47 要先分出多少給 98？', options: ['1', '2', '3'], answer: '2', scene: Object.assign(ln(95, 150, 98, 145, [2, 45], [{ n: 2 }, { n: 45 }]), { still: true }), reveal: '98＋2＝100，47 還剩 45！' },
      { t: 'do', say: '按「＋2」湊成 100，再按「＋45」。', scene: ln(95, 150, 98, 145, [2, 45]) },
      { t: 'show', say: '36＋19：先加 20，再減多加的 1。', scene: Object.assign(ln(30, 60, 36, 55, [20], [{ n: 20 }, { n: -1 }]), { still: true }) },
      { t: 'do', say: '59＋26：先加 1 湊成 60，再加 25。', scene: ln(55, 90, 59, 85, [1, 25]) },
      { t: 'try', say: '先湊整十，再補回來。', scene: Object.assign(ln(45, 85, 48, 83, [2, 33], [{ n: 2 }, { n: 33 }]), { still: true }),
        q: { stem: '48＋35＝？', options: ['81', '83', '85'], answer: '83', hint: '48 加 2 是 50。', why: { 81: '35 分出 2 後剩 33，不是 31。', 85: '48 只加了 2，35 要少 2 才是 33。' } } },
      { t: 'card' }
    ],
    gens: g22, verify: verify22
  });

  /* ---- p2-3 間隔與植樹 --------------------------------------------------------------------------------------------------- */
  const art23 = `<svg viewBox="0 0 120 80"><path d="M12 44h96" stroke="#c3cbf7" stroke-width="3" stroke-linecap="round"/>${[0, 1, 2, 3, 4].map(i => `<text x="${14 + i * 23}" y="38" text-anchor="middle" dominant-baseline="central" font-size="17">🌳</text>`).join('')}${[0, 1, 2, 3].map(i => `<text x="${25.5 + i * 23}" y="58" text-anchor="middle" font-size="10" font-weight="800" fill="#ffc94a">${i + 1}</text>`).join('')}<rect x="14" y="62" width="92" height="16" rx="8" fill="#c6a2ff"/><text x="60" y="70.5" text-anchor="middle" dominant-baseline="central" font-size="11" font-weight="900" fill="#0b1030">4 段 ＝ 5 棵</text></svg>`;
  const roadSvg = (segs, d) => {
    if (segs > 12) return svgOf(240, 56, `<path d="M16 28h208" stroke="${CT}" stroke-width="4" stroke-linecap="round"/><text x="120" y="48" text-anchor="middle" font-size="12" font-weight="800" fill="${CB}">每隔 ${d} 米</text>`, `路，每隔 ${d} 米`);
    const x0 = 20, w = 200 / segs;
    return svgOf(240, 56, `<path d="M${x0 - 6} 24h212" stroke="${CT}" stroke-width="4" stroke-linecap="round"/>` + rep(segs + 1, i => `<path d="M${x0 + i * w} 16v16" stroke="${CB}" stroke-width="3"/>`).join('') + `<text x="120" y="48" text-anchor="middle" font-size="12" font-weight="800" fill="${CB}">每段 ${d} 米</text>`, `路分成 ${segs} 段`);
  };
  const D23 = [2, 3, 4, 5, 10];
  const OB23 = [['樹', '棵'], ['燈柱', '支'], ['旗', '面']];
  const g23 = {
    A: [
      /* both ends planted */
      (r, p) => {
        const d = pick(r, D23), segs = N(r, p, 3, Math.min(14, 100 / d | 0)), L = segs * d, ans = segs + 1;
        return o('plant-both', `路長 ${L} 米，每隔 ${d} 米種一棵樹，兩端都種。共種幾棵？`, ans, `先算有幾段：${L}÷${d}。`, `${L}÷${d}＝${segs} 段；兩端都種，棵數比段數多 1：${segs}＋1＝${ans}。`, [segs, segs + 2, segs - 1, L], `${L}/${d}+1`, [],
          { svg: roadSvg(segs, d), why: why([segs, `${segs} 是段數。兩端都種，棵數比段數多 1。`], [segs - 1, '兩端都種不是減 1，是加 1。'], [L, `${L} 是路長，要先除以 ${d} 才知道有幾段。`]) });
      },
      /* gaps between a row */
      (r, p) => {
        const n = N(r, p, 3, 20), ob = pick(r, OB23), ans = n - 1;
        return o('plant-gaps', `一排有 ${n} ${ob[1]}${ob[0]}，相鄰兩${ob[1]}之間算一個間隔。共有幾個間隔？`, ans, '畫一畫：兩個之間有一個間隔。', `${n} 個排成一行，間隔比${ob[0]}少 1：${n}－1＝${ans}。`, [n, n + 1, n - 2, 2 * n], `${n}-1`, [],
          { why: why([n, `${n} 是${ob[0]}的數目。間隔比${ob[0]}少 1。`], [n - 2, '只有最左和最右的外面沒有間隔，只少 1 個。']) });
      },
      /* length of a row */
      (r, p) => {
        const n = N(r, p, 4, 15), d = N(r, p, 2, 6), ans = (n - 1) * d;
        return o('plant-len', `一排 ${n} 棵樹，兩端都有樹，每隔 ${d} 米一棵。全長幾米？`, ans, '先算有幾個間隔。', `${n} 棵有 ${n - 1} 個間隔；${n - 1}×${d}＝${ans} 米。`, [n * d, (n - 2) * d, n - 1, ans + d], `${n - 1}*${d}`, [],
          { why: why([n * d, `間隔比樹少 1，是 ${n - 1} 個，不是 ${n} 個。`], [(n - 2) * d, `${n} 棵樹有 ${n - 1} 個間隔，不是 ${n - 2}。`], [n - 1, `${n - 1} 是間隔數，每個間隔 ${d} 米，還要乘。`]) });
      },
      /* a pond: a circle */
      (r, p) => {
        const d = pick(r, [2, 3, 4, 5]), segs = N(r, p, 4, Math.min(20, 100 / d | 0)), L = segs * d;
        return o('plant-circle', `池塘一圈長 ${L} 米，每隔 ${d} 米種一棵樹。共種幾棵？`, segs, '一圈沒有頭尾，想想最後一棵在哪裏。', `${L}÷${d}＝${segs}。圍成一圈，棵數＝段數。`, [segs + 1, segs - 1, L, segs + 2], `${L}/${d}`, [],
          { why: why([segs + 1, '圍成一圈沒有兩端，棵數不用加 1。'], [segs - 1, '一圈上每段的起點都有樹，不用減 1。'], [L, `${L} 是一圈的長度，要除以 ${d}。`]) });
      }
    ],
    B: [
      /* both ends left empty */
      (r, p) => {
        const d = pick(r, D23), segs = N(r, p, 4, Math.min(14, 100 / d | 0)), L = segs * d, ans = segs - 1;
        return o('plant-none', `路長 ${L} 米，每隔 ${d} 米放一盞燈，兩端都不放。共放幾盞？`, ans, `先算有幾段：${L}÷${d}。`, `${L}÷${d}＝${segs} 段；兩端都不放，燈比段數少 1：${segs}－1＝${ans}。`, [segs, segs + 1, segs - 2, L], `${L}/${d}-1`, [],
          { svg: roadSvg(segs, d), why: why([segs, `${segs} 是段數。兩端都不放，燈比段數少 1。`], [segs + 1, '兩端都放才是加 1，這題兩端不放。'], [L, `${L} 是路長，要先除以 ${d}。`]) });
      },
      /* plant again in the middle of every gap */
      (r, p) => {
        const n = N(r, p, 3, 12), ans = 2 * n - 1;
        return o('plant-mid', `一排 ${n} 棵樹，兩端都有。在每兩棵中間再種一棵，共有幾棵？`, ans, '先算有幾個間隔，就要種幾棵。', `${n} 棵有 ${n - 1} 個間隔，新種 ${n - 1} 棵；${n}＋${n - 1}＝${ans}。`, [2 * n, n + n + 1, n - 1, n + 1, ans + 2], `${n}+${n}-1`, [],
          { why: why([2 * n, `新種的是 ${n - 1} 棵（間隔數），不是 ${n} 棵。`], [n - 1, `${n - 1} 是新種的，原來的 ${n} 棵也要算。`], [ans + 2, '間隔比樹少 1，所以新種的比 n 少 1。']) });
      },
      /* how many more to plant */
      (r, p) => {
        const d = pick(r, D23), segs = N(r, p, 5, Math.min(14, 100 / d | 0)), L = segs * d, n = ri(r, 2, segs), ans = segs + 1 - n;
        return o('plant-miss', `路長 ${L} 米，每隔 ${d} 米種一棵，兩端都種。已種 ${n} 棵，還要種幾棵？`, ans, '先算一共要種幾棵。', `${L}÷${d}＋1＝${segs + 1} 棵；已種 ${n} 棵，${segs + 1}－${n}＝${ans}。`, [segs - n, segs + 2 - n, segs + 1, n], `${L}/${d}+1-${n}`, [],
          { why: why([segs - n, '一共要種的是段數加 1（兩端都種），別少算。'], [segs + 1, `${segs + 1} 是一共要種的，已種 ${n} 棵要減去。`], [segs + 2 - n, '一共是段數加 1，不用再多加。']) });
      }
    ]
  };
  const verify23 = q => {
    let m;
    const treesAt = (L, d, first, last) => { let c = 0; for (let x = 0; x <= L; x += d) if ((x > 0 || first) && (x < L || last)) c++; return c; };
    if ((m = /^路長 (\d+) 米，每隔 (\d+) 米種一棵樹，兩端都種。共種幾棵？$/.exec(q.q))) return String(treesAt(+m[1], +m[2], true, true));
    if ((m = /^一排有 (\d+) .+?，相鄰兩.之間算一個間隔。共有幾個間隔？$/.exec(q.q))) { let c = 0; for (let i = 1; i < +m[1]; i++) c++; return String(c); }
    if ((m = /^一排 (\d+) 棵樹，兩端都有樹，每隔 (\d+) 米一棵。全長幾米？$/.exec(q.q))) { let x = 0; for (let i = 1; i < +m[1]; i++) x += +m[2]; return String(x); }
    if ((m = /^池塘一圈長 (\d+) 米，每隔 (\d+) 米種一棵樹。共種幾棵？$/.exec(q.q))) { let c = 0; for (let x = 0; x < +m[1]; x += +m[2]) c++; return String(c); }
    if ((m = /^路長 (\d+) 米，每隔 (\d+) 米放一盞燈，兩端都不放。共放幾盞？$/.exec(q.q))) return String(treesAt(+m[1], +m[2], false, false));
    if ((m = /^一排 (\d+) 棵樹，兩端都有。在每兩棵中間再種一棵，共有幾棵？$/.exec(q.q))) { let c = 0; for (let i = 0; i < +m[1]; i++) { c++; if (i < +m[1] - 1) c++; } return String(c); }
    if ((m = /^路長 (\d+) 米，每隔 (\d+) 米種一棵，兩端都種。已種 (\d+) 棵，還要種幾棵？$/.exec(q.q))) return String(treesAt(+m[1], +m[2], true, true) - +m[3]);
    return null;
  };
  WQOly.register({
    id: 'p2-3', grade: 2, n: 3, title: '間隔與植樹', icon: '🌳',
    card: { motto: '棵數＝段數＋1', example: '4 段種 5 棵', art: art23 },
    lesson: [
      { t: 'show', say: '路分成 4 段，兩端都種：共種 5 棵。', scene: { w: 'rowplace', p: { segments: 4, ends: 'both', span: 5, unit: '米' }, still: true } },
      { t: 'predict', say: '一條路分成 4 段，兩端都要種。', ask: '要種幾棵樹？', options: ['4', '5', '6'], answer: '5', scene: { w: 'rowplace', p: { segments: 4, ends: 'both', span: 5, unit: '米' }, still: true }, reveal: '兩端都種，棵數比段數多 1！' },
      { t: 'do', say: '把樹苗拖到路上，每個圈放一棵。', scene: { w: 'rowplace', p: { segments: 4, ends: 'both', span: 5, unit: '米' } } },
      { t: 'show', say: '只種一端，另一端不種：棵數＝段數。', scene: { w: 'rowplace', p: { segments: 5, ends: 'one', span: 4, unit: '米' }, still: true } },
      { t: 'do', say: '圍成一圈，6 段種幾棵？放放看。', scene: { w: 'rowplace', p: { segments: 6, circle: true, span: 3, unit: '米' } } },
      { t: 'try', say: '想想兩端有沒有種。', scene: { w: 'rowplace', p: { segments: 6, ends: 'both', span: 4, unit: '米' }, still: true },
        q: { stem: '一條路分成 6 段，兩端都種樹。共種幾棵？', options: ['5', '6', '7'], answer: '7', hint: '兩端都種，要比段數多 1。', why: { 6: '6 是段數，兩端都種要加 1。', 5: '5 是兩端都不種的棵數。' } } },
      { t: 'card' }
    ],
    gens: g23, verify: verify23
  });

  /* ---- p2-4 數線段 ------------------------------------------------------------------------------------------------------- */
  const ALPH = 'ABCDEFGHJKLMNPQRSTUVWXYZ'.split('');
  const letters = (r, n) => shuffle(r, ALPH).slice(0, n).sort();
  const pointsSvg = L => { const n = L.length, w = 200 / (n - 1); return svgOf(240, 56, `<path d="M14 24h212" stroke="${CT}" stroke-width="4" stroke-linecap="round"/>` + L.map((c, i) => `<circle data-p="1" cx="${20 + i * w}" cy="24" r="6.5" fill="${CB}" stroke="#12998a" stroke-width="1.5"/><text x="${20 + i * w}" y="46" text-anchor="middle" font-size="13" font-weight="900" fill="${CA}">${c}</text>`).join(''), `直線上有 ${n} 個點`); };
  const tri = n => n * (n - 1) / 2;
  const stairs = n => ({ w: 'bars', p: { rows: rep(n - 1, i => ({ label: 'ABCDEFG'[i], segs: rep(n - 1 - i, j => ({ u: 1, c: 'abdgk'[i % 5], text: 'ABCDEFG'[i] + 'ABCDEFG'[i + 1 + j] })) })), braces: [{ from: 0, to: n - 2, label: `共 ${tri(n)}`, c: 't' }] }, still: true });
  const art24 = `<svg viewBox="0 0 120 80"><path d="M12 26h96" stroke="#c3cbf7" stroke-width="3" stroke-linecap="round"/>${[0, 1, 2, 3].map(i => `<circle cx="${18 + i * 28}" cy="26" r="5.5" fill="#ffc94a"/><text x="${18 + i * 28}" y="42" text-anchor="middle" font-size="10" font-weight="900" fill="#3ee6d0">${'ABCD'[i]}</text>`).join('')}<path d="M18 20Q74 -2 102 20" stroke="#ff8fc7" stroke-width="2" fill="none" stroke-dasharray="3 3"/><rect x="10" y="52" width="100" height="22" rx="11" fill="#c6a2ff"/><text x="60" y="63" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="900" fill="#0b1030">3 ＋ 2 ＋ 1 ＝ 6</text></svg>`;
  const g24 = {
    A: [
      /* all the segments among n points */
      (r, p) => {
        const n = N(r, p, 3, 7), L = letters(r, n), ans = tri(n);
        return o('seg-all', `線上有點 ${L.join('、')}，一共有幾條線段？`, ans, '逐點數：由第一點出發，再由第二點……', `${rep(n - 1, i => n - 1 - i).join('＋')}＝${ans} 條。`, [n - 1, n, n * (n - 1), ans - 1, ans + 1], rep(n - 1, i => n - 1 - i).join('+'), [],
          { svg: pointsSvg(L), why: why([n - 1, `${n - 1} 只是由一個點出發的，要逐點數。`], [n * (n - 1), '每條線段被數了兩次（A到B、B到A），要除以 2。'], [ans - 1, '逐點數時少了一條，由後面的點再核對。']) });
      },
      /* segments from one point */
      (r, p) => {
        const n = N(r, p, 3, 7), L = letters(r, n), X = pick(r, L), ans = n - 1;
        return o('seg-from', `線上有點 ${L.join('、')}。以 ${X} 為一端的線段有幾條？`, ans, `${X} 可以和其他每個點連成線段。`, `其他有 ${n - 1} 個點，所以有 ${ans} 條。`, [n, n + 1, n - 2, tri(n)], `${n}-1`, [],
          { svg: pointsSvg(L), why: why([n, `${X} 不能和自己連，要少 1。`], [tri(n), '這是全部線段，題目只問以' + X + '為一端的。']) });
      }
    ],
    B: [
      /* from the number of segments back to the number of points */
      (r, p) => {
        const n = N(r, p, 3, 7), s = tri(n), m = name(r);
        return o('seg-rev', `${m}在直線上畫了一些點，圖中共有 ${s} 條線段。有幾個點？`, n, '試試：3 個點有 3 條，4 個點有 6 條……', `${rep(n - 1, i => n - 1 - i).join('＋')}＝${s}，所以有 ${n} 個點。`, [n - 1, n + 1, s, n + 2], '', [],
          { why: why([n - 1, `${n - 1} 個點只有 ${tri(n - 1)} 條線段，不夠 ${s} 條。`], [n + 1, `${n + 1} 個點有 ${tri(n + 1)} 條線段，太多了。`], [s, `${s} 是線段數，題目問點數。`]) });
      },
      /* add one more point */
      (r, p) => {
        const n = N(r, p, 3, 7), L = letters(r, n), ans = n;
        return o('seg-add', `線上有點 ${L.join('、')}。再加一個點，會多幾條線段？`, ans, '新點要和原來的每個點連線。', `新點和原來 ${n} 個點各連一條，多 ${n} 條。`, [n - 1, n + 1, 1, tri(n + 1)], '', [],
          { svg: pointsSvg(L), why: why([n - 1, `新點可以和原來的 ${n} 個點連線，包括兩端。`], [1, '新點連出的不只一條，每個舊點都有一條。'], [tri(n + 1), `${tri(n + 1)} 是加點後的全部線段，題目問多出來的。`]) });
      },
      /* leave out the shortest ones */
      (r, p) => {
        const n = N(r, p, 4, 7), L = letters(r, n), ans = tri(n) - (n - 1);
        return o('seg-long', `線上有點 ${L.join('、')}。不算相鄰兩點的線段，有幾條？`, ans, '先算全部，再減去相鄰兩點的。', `全部 ${tri(n)} 條；相鄰兩點的有 ${n - 1} 條；${tri(n)}－${n - 1}＝${ans}。`, [tri(n), n - 1, ans + 1, ans - 1], `${tri(n)}-${n - 1}`, [],
          { svg: pointsSvg(L), why: why([tri(n), `${tri(n)} 是全部，還要減去相鄰兩點的 ${n - 1} 條。`], [n - 1, `${n - 1} 是相鄰兩點的，題目要的是其餘的。`], [ans + 1, '相鄰兩點的線段有 n－1 條，別少減。']) });
      }
    ]
  };
  const verify24 = q => {
    let m;
    const pairs = n => { let c = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) c++; return c; };
    const count = s => (s.match(/[A-Z]/g) || []).length;
    if ((m = /^線上有點 ([A-Z、]+)，一共有幾條線段？$/.exec(q.q))) return String(pairs(count(m[1])));
    if ((m = /^線上有點 ([A-Z、]+)。以 (.) 為一端的線段有幾條？$/.exec(q.q))) { const L = m[1].split('、'); return String(L.filter(x => x !== m[2]).length); }
    if ((m = /圖中共有 (\d+) 條線段。有幾個點？$/.exec(q.q))) { for (let n = 2; n < 30; n++) if (pairs(n) === +m[1]) return String(n); return 'none'; }
    if ((m = /^線上有點 ([A-Z、]+)。再加一個點，會多幾條線段？$/.exec(q.q))) return String(pairs(count(m[1]) + 1) - pairs(count(m[1])));
    if ((m = /^線上有點 ([A-Z、]+)。不算相鄰兩點的線段，有幾條？$/.exec(q.q))) { const n = count(m[1]); let c = 0; for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) c++; return String(c); }
    return null;
  };
  WQOly.register({
    id: 'p2-4', grade: 2, n: 4, title: '數線段', icon: '📐',
    card: { motto: '逐點出發不重複', example: '4 點：3＋2＋1＝6', art: art24 },
    lesson: [
      { t: 'show', say: '4 個點 A、B、C、D。由 A 出發有 3 條。', scene: stairs(4) },
      { t: 'predict', say: '由 A 出發數了 3 條。', ask: '再由 B 出發（不重複），有幾條？', options: ['1', '2', '3'], answer: '2', scene: stairs(4), reveal: 'B 只數 BC、BD，共 2 條！' },
      { t: 'do', say: '點像人，線段像握手：每兩點連一條。', scene: { w: 'dotgraph', p: { n: 4, faces: ['A', 'B', 'C', 'D'] } } },
      { t: 'show', say: '5 個點：4＋3＋2＋1＝10 條。', scene: stairs(5) },
      { t: 'do', say: '5 個點，連連看。要連幾條？', scene: { w: 'dotgraph', p: { n: 5, faces: ['A', 'B', 'C', 'D', 'E'] } } },
      { t: 'try', say: '逐點出發，不重複地數。', scene: stairs(5),
        q: { stem: '直線上有 5 個點，一共有幾條線段？', options: ['8', '10', '15'], answer: '10', hint: '4＋3＋2＋1。', why: { 8: '逐點數：4＋3＋2＋1，別漏了。', 15: '4＋3＋2＋1＝10，不是 15。' } } },
      { t: 'card' }
    ],
    gens: g24, verify: verify24
  });

  /* ---- p2-5 週期與星期 --------------------------------------------------------------------------------------------------- */
  const COLORS = ['紅', '藍', '黃', '綠', '白', '黑', '紫'];
  const art25 = `<svg viewBox="0 0 120 80">${rep(7, i => { const a = -Math.PI / 2 + i / 7 * Math.PI * 2; return `<circle cx="${60 + Math.cos(a) * 24}" cy="${34 + Math.sin(a) * 24}" r="9" fill="${i === 3 ? '#ffc94a' : '#1b2160'}" stroke="#3ee6d0" stroke-width="2"/><text x="${60 + Math.cos(a) * 24}" y="${35 + Math.sin(a) * 24}" text-anchor="middle" dominant-baseline="central" font-size="10" font-weight="900" fill="${i === 3 ? '#3b2600' : '#c3cbf7'}">${WD[i]}</text>`; }).join('')}<rect x="8" y="64" width="104" height="14" rx="7" fill="#c6a2ff"/><text x="60" y="71" text-anchor="middle" dominant-baseline="central" font-size="10" font-weight="900" fill="#0b1030">10 天＝1 輪又 3 天</text></svg>`;
  const wdAns = (x, k) => (x - 1 + k) % 7 + 1;
  const g25 = {
    A: [
      /* weekday after k days */
      (r, p) => {
        const x = ri(r, 1, 7), k = N(r, p, 8, 40), ans = wdAns(x, k);
        return o('cyc-week', `今天是星期${WD[x - 1]}，再過 ${k} 天是星期幾？（日＝7）`, ans, '7 天一輪，先看有幾輪、多幾天。', `${k}＝${Math.floor(k / 7)}×7＋${k % 7}；整輪不變，星期${WD[x - 1]}再過 ${k % 7} 天是星期${WD[ans - 1]}。`, [wdAns(x, k - 1), wdAns(x, k + 1), k % 7 || 7, Math.floor(k / 7) || 7, x], `(${x - 1}+${k})%7+1`, [],
          { why: why([wdAns(x, k - 1), '今天不算，要由明天起數。'], [wdAns(x, k + 1), '多數了一天，多出的天數要算準。'], [k % 7 === 0 ? undefined : k % 7, `${k % 7} 是多出的天數，還要由星期${WD[x - 1]}往後數。`], [Math.floor(k / 7), '這是幾個星期，題目問星期幾。']) });
      },
      /* position of the k-th bead in a round */
      (r, p) => {
        const per = ri(r, 2, 6), cs = shuffle(r, COLORS).slice(0, per), k = N(r, p, 7, 30), ans = (k - 1) % per + 1;
        return o('cyc-bead', `珠子按${cs.join('、')}重複排，第 ${k} 顆是一輪的第幾顆？`, ans, `一輪 ${per} 顆，先看有幾輪。`, `一輪 ${per} 顆；${k}÷${per}＝${Math.floor(k / per)} 餘 ${k % per}，${k % per ? `第 ${k} 顆是一輪的第 ${k % per} 顆` : `第 ${k} 顆是一輪的最後一顆（第 ${per} 顆）`}。`, [k % per, Math.floor(k / per), per, ans + 1, ans - 1], `${(k - 1) % per + 1}`, [],
          { why: why([k % per, `餘 0 表示剛好排完一輪，是第 ${per} 顆。`], [Math.floor(k / per), `${Math.floor(k / per)} 是排了幾輪，題目問一輪的第幾顆。`], [per, `${per} 是一輪有幾顆，不一定是第 ${k} 顆的位置。`]) });
      },
      /* complete rounds */
      (r, p) => {
        const per = ri(r, 2, 7), k = N(r, p, per * 2, 40), ans = Math.floor(k / per);
        return o('cyc-laps', `每輪 ${per} 顆珠子，共排了 ${k} 顆。排滿幾輪？`, ans, `${k} 裏面有幾個 ${per}？`, `${k}÷${per}＝${ans} 餘 ${k % per}，排滿 ${ans} 輪。`, [ans + 1, ans - 1, k % per, per, k - per], `${k - k % per}/${per}`, [],
          { why: why([ans + 1, `多出來的 ${k % per} 顆不夠一輪，不能算。`], [k % per, `${k % per} 是剩下的顆數，不是輪數。`], [ans - 1, `${k} 裏有 ${ans} 個 ${per}，別少算一輪。`]) });
      }
    ],
    B: [
      /* how many of one colour in k beads */
      (r, p) => {
        const per = ri(r, 3, 5), cs = shuffle(r, COLORS).slice(0, per), k = (() => { let v = N(r, p, 8, 30); if (v % per === 0) v++; return v; })(), j = ri(r, 0, per - 1), ans = Math.floor(k / per) + (j < k % per ? 1 : 0);
        return o('cyc-count', `珠子按${cs.join('、')}重複排，共 ${k} 顆。${cs[j]}色有幾顆？`, ans, '先看排滿幾輪，再看多出的珠子。', `${k}÷${per}＝${Math.floor(k / per)} 餘 ${k % per}；${cs[j]}色每輪 1 顆，多出的${j < k % per ? `裏有${cs[j]}色，再多 1 顆` : `裏沒有${cs[j]}色`}：${ans} 顆。`, [Math.floor(k / per), Math.floor(k / per) + 1, Math.floor(k / per) + (j < k % per ? 0 : 1) + 1, ans + 1, ans - 1], '', [],
          { why: why([ans === Math.floor(k / per) ? Math.floor(k / per) + 1 : Math.floor(k / per), j < k % per ? `排滿的輪數是 ${Math.floor(k / per)}，多出的珠子裏也有${cs[j]}色。` : `多出的 ${k % per} 顆裏沒有${cs[j]}色，不用再加。`], [k % per, `${k % per} 是多出的珠子數，不是${cs[j]}色的數目。`], [Math.floor(k / per) + 2, '多出的珠子最多再多 1 顆同色。']) });
      },
      /* the date: day 1 is given */
      (r, p) => {
        const x = ri(r, 1, 7), d = N(r, p, 8, 30), ans = wdAns(x, d - 1);
        return o('cyc-date', `這個月 1 日是星期${WD[x - 1]}，${d} 日是星期幾？（日＝7）`, ans, `1 日到 ${d} 日，過了 ${d - 1} 天。`, `過了 ${d}－1＝${d - 1} 天；星期${WD[x - 1]}再過 ${(d - 1) % 7} 天是星期${WD[ans - 1]}。`, [wdAns(x, d), wdAns(x, d - 2), x, (d - 1) % 7 || 7], `(${x - 1}+${d - 1})%7+1`, [],
          { why: why([wdAns(x, d), `1 日到 ${d} 日是過了 ${d - 1} 天，不是 ${d} 天。`], [wdAns(x, d - 2), `是過了 ${d - 1} 天，別少算一天。`], [x, '多數幾輪之後星期不一定回到原位，要數多出的天。']) });
      },
      /* every p days, which weekday is the n-th time */
      (r, p) => {
        const x = ri(r, 1, 7), pp = ri(r, 2, 7), n = ri(r, 3, 8), days = (n - 1) * pp, ans = wdAns(x, days);
        return o('cyc-after', `今天星期${WD[x - 1]}，每 ${pp} 天洗一次車，今天洗了。第 ${n} 次洗車是星期幾？（日＝7）`, ans, '今天是第 1 次，先算過了幾天。', `第 ${n} 次是過了 ${n - 1}×${pp}＝${days} 天；星期${WD[x - 1]}再過 ${days} 天是星期${WD[ans - 1]}。`, [wdAns(x, n * pp), wdAns(x, n), days % 7 || 7, x], `(${x - 1}+${days})%7+1`, [],
          { why: why([wdAns(x, n * pp), `今天已是第 1 次，到第 ${n} 次只隔 ${n - 1} 個 ${pp} 天。`], [wdAns(x, n), `每次隔 ${pp} 天，不是 1 天。`], [days % 7, `${days % 7} 是多出的天數，還要由星期${WD[x - 1]}往後數。`]) });
      },
      /* how many washes in the next k days */
      (r, p) => {
        const pp = ri(r, 2, 7), k = N(r, p, 3 * pp, 40), m = name(r), ans = Math.floor(k / pp);
        return o('cyc-wash', `${m}每 ${pp} 天洗一次車，今天洗了。接着 ${k} 天裏，還會洗幾次？`, ans, `${k} 天裏有幾個 ${pp} 天？`, `${k}÷${pp}＝${ans} 餘 ${k % pp}，還會洗 ${ans} 次。`, [ans + 1, ans - 1, k % pp, pp], `${k - k % pp}/${pp}`, [],
          { why: why([ans + 1, '今天洗的不算，餘下的天數不夠再洗。'], [k % pp, `${k % pp} 是剩下的天數，不是次數。`], [ans - 1, `${k} 天裏有 ${ans} 個 ${pp} 天，每個末尾都洗。`]) });
      }
    ]
  };
  const verify25 = q => {
    let m;
    const step = (x, k) => { for (let i = 0; i < k; i++) x = x === 7 ? 1 : x + 1; return x; };
    const wd = c => WD.indexOf(c) + 1;
    if ((m = /^今天是星期(.)，再過 (\d+) 天是星期幾？/.exec(q.q))) return String(step(wd(m[1]), +m[2]));
    if ((m = /^珠子按(.+)重複排，第 (\d+) 顆是一輪的第幾顆？$/.exec(q.q))) { const per = m[1].split('、').length; let c = 1; for (let i = 2; i <= +m[2]; i++) c = c === per ? 1 : c + 1; return String(c); }
    if ((m = /^每輪 (\d+) 顆珠子，共排了 (\d+) 顆。排滿幾輪？$/.exec(q.q))) { let left = +m[2], c = 0; while (left >= +m[1]) { left -= +m[1]; c++; } return String(c); }
    if ((m = /^珠子按(.+)重複排，共 (\d+) 顆。(.)色有幾顆？$/.exec(q.q))) { const cs = m[1].split('、'); let c = 0; for (let i = 0; i < +m[2]; i++) if (cs[i % cs.length] === m[3]) c++; return String(c); }
    if ((m = /^這個月 1 日是星期(.)，(\d+) 日是星期幾？/.exec(q.q))) { let x = wd(m[1]); for (let d = 1; d < +m[2]; d++) x = step(x, 1); return String(x); }
    if ((m = /^今天星期(.)，每 (\d+) 天洗一次車，今天洗了。第 (\d+) 次洗車是星期幾？/.exec(q.q))) { let x = wd(m[1]); for (let t = 1; t < +m[3]; t++) x = step(x, +m[2]); return String(x); }
    if ((m = /^.+?每 (\d+) 天洗一次車，今天洗了。接着 (\d+) 天裏，還會洗幾次？$/.exec(q.q))) { let c = 0; for (let d = 1; d <= +m[2]; d++) if (d % +m[1] === 0) c++; return String(c); }
    return null;
  };
  const wk = (steps, start) => ({ w: 'cycle', p: { n: 7, labels: WD, steps, start, unit: '天' } });
  WQOly.register({
    id: 'p2-5', grade: 2, n: 5, title: '週期與星期', icon: '📅',
    card: { motto: '找一輪幾個', example: '10 天＝1 輪又 3 天', art: art25 },
    lesson: [
      { t: 'show', say: '星期一到星期日是 7 天，一輪。', scene: Object.assign(wk(7, 0), { still: true }) },
      { t: 'predict', say: '今天星期三。', ask: '再過 7 天是星期幾？', options: ['星期二', '星期三', '星期四'], answer: '星期三', scene: Object.assign(wk(7, 2), { still: true }), reveal: '剛好一整輪，又回到星期三！' },
      { t: 'do', say: '今天星期三。按「＋1 天」走 10 天。', scene: wk(10, 2) },
      { t: 'show', say: '10 天＝1 輪又 3 天。多的 3 天才要數。', scene: Object.assign(wk(10, 2), { still: true }) },
      { t: 'do', say: '星期五起再過 12 天。按「一圈」更快！', scene: wk(12, 4) },
      { t: 'try', say: '一輪 7 天，先減去整輪。', scene: Object.assign(wk(9, 0), { still: true }),
        q: { stem: '今天星期一，再過 9 天是星期幾？（日＝7）', options: ['2', '3', '4'], answer: '3', hint: '9 天＝1 輪又 2 天。', why: { 2: '星期一過 2 天是星期三（3），不是星期二。', 4: '多數了一天，今天不算。' } } },
      { t: 'card' }
    ],
    gens: g25, verify: verify25
  });
})();
