/* 小三 · 5 units, all drafts (stubs). p3-5 only splits place values (2-3 digit × 1 digit), per 年級對照研究.md. */
(function () {
  'use strict';
  const { o, N, ri, pick, name } = WQOly.helpers;
  WQOly.register(WQOly.stub({ id: 'p3-1', title: '和差問題', icon: '⚖️', motto: '和減差再平分', example: '和 10、差 4：大 7 小 3', legacy: { A: [[3, 0]], B: [[3, 6]], s: .5 } }));
  WQOly.register(WQOly.stub({ id: 'p3-2', title: '和倍、差倍', icon: '🍰', motto: '先找 1 份', example: '和 12、2 倍：1 份是 4', legacy: { A: [[3, 1]], B: [[3, 2]], s: .5 } }));
  WQOly.register(WQOly.stub({ id: 'p3-3', title: '年齡問題', icon: '🎂', motto: '年齡差不會變', example: '爸比我大 30 歲，永遠', legacy: { A: [[3, 3]], B: [[3, 3]], s: .5 } }));
  WQOly.register(WQOly.stub({ id: 'p3-4', title: '搭配與樹形圖', icon: '👕', motto: '一層一層分支', example: '2 件上衣 3 條褲：6 款', legacy: { A: [[4, 2]], B: [[4, 4]], s: .3 } }));
  const split = {
    A: [(r, p) => {
      const t = N(r, p, 2, 9), u = ri(r, 1, 9), b = ri(r, 3, 9), a = t * 10 + u, s = a * b;
      return o('split', `${a}×${b}＝？拆成 ${t * 10} 和 ${u}。`, s, `${a} 拆成 ${t * 10}＋${u}。`, `${a}×${b}＝${t * 10}×${b}＋${u}×${b}＝${t * 10 * b}＋${u * b}＝${s}。`, [t * 10 * b + u, s - 10, s + 10, t * b + u * b], `${a}*${b}`, [],
        { why: { [t * 10 * b + u]: `${u} 也要乘 ${b}，不是直接加。` } });
    }],
    B: [(r, p) => {
      const h = ri(r, 1, 5), t = ri(r, 1, 9), u = ri(r, 1, 9), b = ri(r, 3, 9), a = h * 100 + t * 10 + u, s = a * b;
      return o('split3', `${a}×${b}＝？按百位、十位、個位拆開乘。`, s, `${a} 拆成 ${h * 100}＋${t * 10}＋${u}。`, `${h * 100}×${b}＋${t * 10}×${b}＋${u}×${b}＝${h * 100 * b}＋${t * 10 * b}＋${u * b}＝${s}。`, [s - 10, s + 10, s - 100, h * 100 * b + t * 10 * b + u], `${a}*${b}`, [],
        { why: { [h * 100 * b + t * 10 * b + u]: `個位的 ${u} 也要乘 ${b}。` } });
    }]
  };
  WQOly.register({ id: 'p3-5', grade: 3, n: 5, title: '乘法巧算', icon: '✂️', draft: true, card: { motto: '拆開再乘', example: '23×4＝20×4＋3×4' },
    lesson: [{ t: 'show', say: '這一課：拆開再乘。', scene: { w: 'banner', p: { icon: '✂️', title: '乘法巧算', motto: '拆開再乘', example: '23×4＝20×4＋3×4' } } }, { t: 'card' }], gens: split,
    verify: q => { const m = /^(\d+)×(\d+)＝/.exec(q.q); return m ? String(m[1] * m[2]) : null; } });
})();
