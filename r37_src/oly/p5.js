/* 小五 · 5 units, all drafts (stubs). p5-4 = 真假推理, p5-5 = 容斥原理 (two circles only), per 設計書「研究後修訂」. */
(function () {
  'use strict';
  const { o, N, ri, pick, name } = WQOly.helpers;
  WQOly.register(WQOly.stub({ id: 'p5-1', title: '餘數與週期', icon: '⏰', motto: '看餘數取位置', example: '17÷7＝2 餘 3', legacy: { A: [[5, 0]], B: [[5, 1]], s: .6 } }));
  WQOly.register(WQOly.stub({ id: 'p5-2', title: '個位循環', icon: '🔁', motto: '只看個位', example: '3、9、7、1 一輪', legacy: { A: [[5, 6]], B: [[5, 6]], s: .6 } }));
  const drawer = {
    A: [(r, p) => { const m = N(r, p, 2, 6), k = ri(r, 1, 5), n = m * k + ri(r, 1, m - 1 || 1), s = Math.ceil(n / m);
      return o('drawer', `把 ${n} 個蘋果放進 ${m} 個盒子，最少有一個盒子有幾個？`, s, '先平均分，再看剩下的。', `${n}÷${m}＝${Math.floor(n / m)} 餘 ${n % m}，餘下的要多放一個，所以最少有一個盒有 ${s} 個。`, [Math.floor(n / m), s + 1, n - m, m], `ceil(${n}/${m})`.replace(/.*/, ''), [], { why: { [Math.floor(n / m)]: '平均分後還有剩，總有一個盒要多放一個。' } }); }],
    B: [(r, p) => { const c = N(r, p, 2, 5), k = ri(r, 2, 3), x = ri(r, 6, 15), s = c * (k - 1) + 1, col = ['紅', '黃', '藍', '綠', '白'].slice(0, c);
      return o('drawer-worst', `袋裏有${col.join('、')}球各 ${x} 個。最少取幾個，才一定有 ${k} 個同色？`, s, '想最壞的情況。', `最壞：每種顏色都取 ${k - 1} 個，共 ${c}×${k - 1}＝${c * (k - 1)} 個；再取 1 個就一定有 ${k} 個同色，所以是 ${s}。`, [c * (k - 1), s + 1, c * k, k], '', [], { why: { [c * (k - 1)]: '這是最壞情況取到的個數，再多取 1 個才一定成功。' } }); }]
  };
  WQOly.register({ id: 'p5-3', grade: 5, n: 3, title: '抽屜原理', icon: '🗄️', draft: true, card: { motto: '想最壞情況', example: '5 個放 2 盒：至少 3 個' },
    lesson: [{ t: 'show', say: '這一課：想最壞情況。', scene: { w: 'banner', p: { icon: '🗄️', title: '抽屜原理', motto: '想最壞情況', example: '5 個放 2 盒：至少 3 個' } } }, { t: 'card' }], gens: drawer,
    verify: q => { let m; if ((m = /把 (\d+) 個蘋果放進 (\d+) 個盒子/.exec(q.q))) return String(Math.ceil(m[1] / m[2])); if ((m = /袋裏有(.+)球各 \d+ 個.*一定有 (\d+) 個同色/.exec(q.q))) { const c = m[1].split('、').length; return String(c * (m[2] - 1) + 1); } return null; } });
  WQOly.register(WQOly.stub({ id: 'p5-4', title: '真假推理', icon: '🕵️', motto: '假設一個再檢查', example: '假設他說真話，再對照', legacy: { A: [[2, 4]], B: [[2, 4]], s: .6 } }));
  const inc = {
    A: [(r, p) => { const a = N(r, p, 8, 30), b = N(r, p, 8, 30), c = ri(r, 2, Math.min(a, b) - 1), s = a + b - c;
      return o('venn', `班裏 ${a} 人愛跳繩，${b} 人愛游泳，其中 ${c} 人兩樣都愛。至少愛一樣的有幾人？`, s, '兩樣都愛的人被數了兩次。', `${a}＋${b}＝${a + b}，兩樣都愛的 ${c} 人被數了兩次，減去一次：${a + b}－${c}＝${s}。`, [a + b, s + c, s - 1, a - c + b - c], `${a}+${b}-${c}`, [], { why: { [a + b]: `兩樣都愛的 ${c} 人被數了兩次，要減去一次。` } }); }],
    B: [(r, p) => { const a = N(r, p, 8, 30), b = N(r, p, 8, 30), c = ri(r, 2, Math.min(a, b) - 1), u = a + b - c, N0 = u + ri(r, 2, 12);
      return o('venn-none', `全班 ${N0} 人，${a} 人愛跳繩，${b} 人愛游泳，${c} 人兩樣都愛。兩樣都不愛的有幾人？`, N0 - u, '先求至少愛一樣的人數。', `至少愛一樣：${a}＋${b}－${c}＝${u}；兩樣都不愛：${N0}－${u}＝${N0 - u}。`, [u, N0 - a - b, N0 - u + c, N0 - u - 1], `${N0}-(${a}+${b}-${c})`, [], { why: { [u]: `${u} 是至少愛一樣的人數，還要用全班人數減去。`, [N0 - a - b]: `兩樣都愛的 ${c} 人被減了兩次，要補回來。` } }); }]
  };
  WQOly.register({ id: 'p5-5', grade: 5, n: 5, title: '容斥原理', icon: '⭕', draft: true, card: { motto: '重疊要減一次', example: '12＋9－5＝16' },
    lesson: [{ t: 'show', say: '這一課：重疊要減一次。', scene: { w: 'banner', p: { icon: '⭕', title: '容斥原理', motto: '重疊要減一次', example: '12＋9－5＝16' } } }, { t: 'card' }], gens: inc,
    verify: q => { let m; if ((m = /(\d+) 人愛跳繩，(\d+) 人愛游泳，其中 (\d+) 人兩樣都愛/.exec(q.q))) return String(+m[1] + +m[2] - +m[3]); if ((m = /全班 (\d+) 人，(\d+) 人愛跳繩，(\d+) 人愛游泳，(\d+) 人兩樣都愛/.exec(q.q))) return String(m[1] - (+m[2] + +m[3] - +m[4])); return null; } });
})();
