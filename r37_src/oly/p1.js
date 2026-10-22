/* 小一 · 5 units. p1-2 湊十 is a finished reference unit; the others are drafts (stubs) to be written to the same standard (see docs/奧數路線-20261022/單元撰寫指引.md). */
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

  /* ---- drafts (stubs): the same registry entry, to be replaced by a full unit file ------------------------------------ */
  WQOly.register(WQOly.stub({ id: 'p1-1', title: '找規律', icon: '🧱', motto: '看一組重複的', example: '🔴🔵🔴🔵🔴？', legacy: { A: [[0, 0]], B: [[0, 6]], s: .3 } }));
  WQOly.register(WQOly.stub({ id: 'p1-3', title: '有次序地數', icon: '👆', motto: '不漏不重地數', example: '一個一個點著數', legacy: { A: [[4, 3]], B: [[4, 3]], s: .15 } }));
  WQOly.register(WQOly.stub({ id: 'p1-4', title: '排隊問題', icon: '🚶', motto: '畫出來再數', example: '前 3 後 4 共 8 人', legacy: { A: [[2, 0]], B: [[2, 1]], s: .3 } }));
  WQOly.register(WQOly.stub({ id: 'p1-5', title: '比較推理', icon: '📏', motto: '由已知推到未知', example: '甲比乙高，乙比丙高', legacy: { A: [[2, 5]], B: [[2, 5]], s: .3 } }));
})();
