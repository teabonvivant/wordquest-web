/* 小三 · 5 完成版單元（g34）：和差、和倍差倍、年齡、搭配與樹形圖、乘法巧算（p3-5 只做二、三位數×一位數的位值拆分）。
   全部使用現成教具（bars / array），沒有新增工具。數字範圍依 docs/奧數路線-20261022/年級對照研究.md 的小三一節。 */
(function () {
  'use strict';
  const { o, N, ri, pick, shuffle } = WQOly.helpers;

  /* ---- shared helpers ---------------------------------------------------------------------------------------------------- */
  const COL = { a: '#3ee6d0', b: '#ffc94a', d: '#ff8fc7', t: '#c6a2ff' };
  /* tiny bar-model picture. rows: [{l:'label', p:[[units, colourKey, text, dashed?], ...]}], note: caption under the bars */
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
  /* why-table: drops keys that equal the answer, are not positive whole numbers, or repeat */
  const wy = (ans, list) => { const w = {}; for (const [k, v] of list) { if (Number.isInteger(k) && k > 0 && String(k) !== String(ans) && !(k in w)) w[k] = v; } return w; };
  const ks = w => Object.keys(w).map(Number);
  const sums = (...a) => a.reduce((x, y) => x + y, 0);
  const PR3 = [['哥哥', '弟弟'], ['姐姐', '妹妹'], ['小明', '小美']];
  const IT = [['糖', '粒'], ['貼紙', '張'], ['卡片', '張']];
  const solid = (u, c, text) => ({ u, c, text });
  const dashed = (u, text) => ({ u, c: 'd', dashed: true, text });

  /* ======================================================================= p3-1 和差問題 ===================================== */
  const art31 = '<svg viewBox="0 0 120 80"><rect x="12" y="10" width="40" height="18" rx="5" fill="#3ee6d0"/><rect x="12" y="34" width="40" height="18" rx="5" fill="#3ee6d0"/><rect x="52" y="34" width="38" height="18" rx="5" fill="none" stroke="#ff8fc7" stroke-width="2.4" stroke-dasharray="5 4"/><rect x="14" y="58" width="92" height="18" rx="9" fill="#ff8fc7"/><text x="60" y="68" text-anchor="middle" dominant-baseline="central" font-size="12" font-weight="900" fill="#0b1030">和減差，再平分</text></svg>';
  const g31 = {
    A: [
      (r, p) => {
        const [X, Y] = pick(r, PR3), [it, u] = pick(r, IT), s = N(r, p, 2, 30), D = N(r, p, 2, 24), S = 2 * s + D, big = r() < .5, ans = big ? s + D : s;
        const w = wy(ans, [[big ? s : s + D, big ? '那是少的一個，題目問多的。' : '那是多的一個，題目問少的。'], [S - D, `${S}－${D} 是兩份一樣多的，還要平分。`], [S / 2, '兩人不一樣多，不是各分一半。']]);
        return o('sd-obj', `${X}和${Y}共有 ${S} ${u}${it}，${X}比${Y}多 ${D} ${u}。${big ? X : Y}有幾${u}？`, ans, '先拿走多出來的，剩下的兩人一樣多。',
          `${S}－${D}＝${S - D}，${S - D}÷2＝${s}（${Y}）${big ? `；${s}＋${D}＝${s + D}（${X}）` : ''}。`, ks(w), big ? `(${S}-${D})/2+${D}` : `(${S}-${D})/2`, [],
          { svg: bsvg([{ l: Y, p: [[s, 'a', '?']] }, { l: X, p: [[s, 'a', '?'], [D, 'd', `多 ${D}`, 1]] }], `共 ${S}`), why: w });
      },
      (r, p) => {
        const s = N(r, p, 3, 30), D = N(r, p, 2, 24), S = 2 * s + D, long = r() < .5, ans = long ? s + D : s;
        const w = wy(ans, [[long ? s : s + D, long ? '那是短繩，題目問長繩。' : '那是長繩，題目問短繩。'], [S - D, `${S}－${D} 是兩條短繩的長度，還要平分。`]]);
        return o('sd-rope', `兩條繩共長 ${S} 厘米，長繩比短繩長 ${D} 厘米。${long ? '長' : '短'}繩長多少厘米？`, ans, '長繩剪去多出的一段，兩條就一樣長。',
          `${S}－${D}＝${S - D}，${S - D}÷2＝${s}（短繩）${long ? `；${s}＋${D}＝${s + D}（長繩）` : ''}。`, ks(w), long ? `(${S}-${D})/2+${D}` : `(${S}-${D})/2`, [],
          { svg: bsvg([{ l: '短', p: [[s, 'a', '?']] }, { l: '長', p: [[s, 'a', '?'], [D, 'd', `多 ${D}`, 1]] }], `共 ${S}`), why: w });
      },
      (r, p) => {
        const s = N(r, p, 3, 30), D = N(r, p, 2, 24), S = 2 * s + D, big = r() < .5, ans = big ? s + D : s;
        const w = wy(ans, [[big ? s : s + D, big ? '那是小數，題目問大數。' : '那是大數，題目問小數。'], [S - D, '拿走差之後有兩份，還要平分。']]);
        return o('sd-num', `兩個數的和是 ${S}，差是 ${D}。${big ? '大' : '小'}數是多少？`, ans, '和減去差，剩下兩個一樣的數。',
          `${S}－${D}＝${S - D}，${S - D}÷2＝${s}（小數）${big ? `；${s}＋${D}＝${s + D}（大數）` : ''}。`, ks(w), big ? `(${S}-${D})/2+${D}` : `(${S}-${D})/2`, [], { why: w });
      }
    ],
    B: [
      /* one more step: "gives k and then equal" hides the difference (2k) */
      (r, p) => {
        const [X, Y] = pick(r, PR3), h = N(r, p, 6, 60), k = N(r, p, 2, Math.min(15, h - 1)), S = 2 * h, askX = r() < .5, ans = askX ? h + k : h - k;
        const w = wy(ans, [[h, `${h} 是兩人一樣多時各有的，${askX ? X + '原來多' : Y + '原來少'}了 ${k}。`], [askX ? h - k : h + k, `方向弄反了：${X}給出，${X}原來比較多。`]]);
        return o('sd-give', `${X}和${Y}共有 ${S} 粒糖。${X}給${Y} ${k} 粒後，兩人一樣多。${askX ? X : Y}原來有幾粒？`, ans, `給出 ${k} 粒後一樣多，原來差 ${2 * k} 粒。`,
          `一樣多時各有 ${S}÷2＝${h} 粒；${askX ? `${X}原來 ${h}＋${k}＝${h + k}` : `${Y}原來 ${h}－${k}＝${h - k}`} 粒。`, ks(w), askX ? `${S}/2+${k}` : `${S}/2-${k}`, [],
          { svg: bsvg([{ l: Y, p: [[h, 'a', '?']] }, { l: X, p: [[h, 'a', '?']] }], `給後一樣多，共 ${S}`), why: w });
      },
      /* one more step: after getting e more, the difference is D+e */
      (r, p) => {
        const [X, Y] = pick(r, PR3), y = N(r, p, 5, 50), D = N(r, p, 2, 20), e = N(r, p, 2, 15), x = y + D, S = x + y + e, askX = r() < .5, ans = askX ? x : y;
        const w = wy(ans, [[askX ? y : x, `那是${askX ? Y : X}的，題目問${askX ? X : Y}。`], [S - e - D, `${S - e}－${D}＝${S - e - D} 是兩份，還要平分。`], [(S - e) / 2, '兩人不一樣多，不是各分一半。']]);
        return o('sd-gain', `${X}比${Y}多 ${D} 粒糖。${X}再得 ${e} 粒後，兩人共有 ${S} 粒。${askX ? X : Y}原來有幾粒？`, ans, `先算${X}再得之前，兩人共有幾粒。`,
          `再得之前共 ${S}－${e}＝${S - e} 粒；${S - e}－${D}＝${S - e - D}，÷2＝${y}（${Y}）${askX ? `；${y}＋${D}＝${x}（${X}）` : ''}。`, ks(w), askX ? `(${S}-${e}-${D})/2+${D}` : `(${S}-${e}-${D})/2`, [],
          { svg: bsvg([{ l: Y, p: [[y, 'a', '?']] }, { l: X, p: [[y, 'a', '?'], [D, 'd', `多 ${D}`, 1], [e, 'b', `+${e}`]] }], `之後共 ${S}`), why: w });
      },
      /* two more steps: after giving k, X is still d more */
      (r, p) => {
        const [X, Y] = pick(r, PR3), y0 = N(r, p, 5, 50), d = N(r, p, 2, 12), k = N(r, p, 2, 12), x0 = y0 + d + 2 * k, S = x0 + y0, askX = r() < .5, ans = askX ? x0 : y0;
        const xb = x0 - k, yb = y0 + k;
        const w = wy(ans, [[askX ? xb : yb, `那是給出之後的${askX ? X : Y}，題目問原來。`], [askX ? y0 : x0, `那是${askX ? Y : X}的，題目問${askX ? X : Y}。`], [askX ? yb : xb, '給出之後的數，還要把給出的加回去或減掉。']]);
        return o('sd-give2', `${X}和${Y}共有 ${S} 粒糖。${X}給${Y} ${k} 粒後，${X}仍比${Y}多 ${d} 粒。${askX ? X : Y}原來有幾粒？`, ans, `先求給出之後，兩人各有幾粒。`,
          `給後${X}多 ${d}：(${S}－${d})÷2＝${yb}（${Y}後），${X}後 ${xb}；${askX ? `${X}原來 ${xb}＋${k}＝${x0}` : `${Y}原來 ${yb}－${k}＝${y0}`} 粒。`, ks(w), askX ? `(${S}-${d})/2+${d}+${k}` : `(${S}-${d})/2-${k}`, [], { why: w });
      }
    ]
  };
  const verify31 = q => {
    let m;
    if ((m = /^(.+?)和(.+?)共有 (\d+) [^，]+，\1比\2多 (\d+) .。(.+?)有幾/.exec(q.q))) { const S = +m[3], D = +m[4]; for (let x = 0; x <= S; x++) if (x - (S - x) === D) return String(m[5] === m[1] ? x : S - x); return 'none'; }
    if ((m = /^兩條繩共長 (\d+) 厘米，長繩比短繩長 (\d+) 厘米。(.)繩/.exec(q.q))) { const S = +m[1], D = +m[2]; for (let x = 0; x <= S; x++) if (x - (S - x) === D) return String(m[3] === '長' ? x : S - x); return 'none'; }
    if ((m = /^兩個數的和是 (\d+)，差是 (\d+)。(.)數/.exec(q.q))) { const S = +m[1], D = +m[2]; for (let x = 0; x <= S; x++) if (x - (S - x) === D) return String(m[3] === '大' ? x : S - x); return 'none'; }
    if ((m = /^(.+?)和(.+?)共有 (\d+) 粒糖。\1給\2 (\d+) 粒後，兩人一樣多。(.+?)原來/.exec(q.q))) { const S = +m[3], k = +m[4]; for (let x = 0; x <= S; x++) if (x - k === S - x + k) return String(m[5] === m[1] ? x : S - x); return 'none'; }
    if ((m = /^(.+?)比(.+?)多 (\d+) 粒糖。\1再得 (\d+) 粒後，兩人共有 (\d+) 粒。(.+?)原來/.exec(q.q))) { const D = +m[3], e = +m[4], S = +m[5]; for (let y = 0; y <= S; y++) if ((y + D + e) + y === S) return String(m[6] === m[1] ? y + D : y); return 'none'; }
    if ((m = /^(.+?)和(.+?)共有 (\d+) 粒糖。\1給\2 (\d+) 粒後，\1仍比\2多 (\d+) 粒。(.+?)原來/.exec(q.q))) { const S = +m[3], k = +m[4], d = +m[5]; for (let x = 0; x <= S; x++) if ((x - k) - (S - x + k) === d) return String(m[6] === m[1] ? x : S - x); return 'none'; }
    return null;
  };
  WQOly.register({
    id: 'p3-1', grade: 3, n: 1, title: '和差問題', icon: '⚖️',
    card: { motto: '和減差再平分', example: '和 10 差 4：大 7 小 3', art: art31 },
    lesson: [
      { t: 'show', say: '哥哥和弟弟共 10 粒糖。哥哥多 4 粒。', scene: { w: 'bars', p: { rows: [{ label: '弟', segs: [solid(3, 'a', '?')] }, { label: '哥', segs: [solid(3, 'a', '?'), dashed(4, '多 4')] }], braces: [{ from: 0, to: 1, label: '共 10', c: 't' }] }, still: true } },
      { t: 'predict', say: '先拿走哥哥多出的 4 粒。', ask: '兩人一共剩下幾粒？', options: ['4', '6', '10'], answer: '6', scene: { w: 'bars', p: { rows: [{ label: '弟', segs: [solid(3, 'a', '?')] }, { label: '哥', segs: [solid(3, 'a', '?'), dashed(4, '多 4')] }], braces: [{ from: 0, to: 1, label: '共 10', c: 't' }] }, still: true }, reveal: '10－4＝6。剩下的兩人一樣多！' },
      { t: 'do', say: '拉長兩條，直到兩人一樣多。', scene: { w: 'bars', p: { rows: [{ label: '弟', segs: [{ u: 1, c: 'a', edit: true, target: 3, start: 1, min: 1, max: 8 }] }, { label: '哥', segs: [{ u: 1, c: 'a', edit: true, target: 3, start: 1, min: 1, max: 8 }, dashed(4, '多 4')] }], braces: [{ from: 0, to: 1, label: '共 10', c: 't' }] } } },
      { t: 'show', say: '6÷2＝3，弟弟 3 粒。哥哥 3＋4＝7 粒。', scene: { w: 'bars', p: { rows: [{ label: '弟', segs: [solid(3, 'a', '3')] }, { label: '哥', segs: [solid(3, 'a', '3'), dashed(4, '4')] }], braces: [{ from: 0, to: 1, label: '共 10', c: 't' }] }, still: true } },
      { t: 'do', say: '再試一次：共 12 粒，哥哥多 6 粒。', scene: { w: 'bars', p: { rows: [{ label: '弟', segs: [{ u: 1, c: 'a', edit: true, target: 3, start: 1, min: 1, max: 9 }] }, { label: '哥', segs: [{ u: 1, c: 'a', edit: true, target: 3, start: 1, min: 1, max: 9 }, dashed(6, '多 6')] }], braces: [{ from: 0, to: 1, label: '共 12', c: 't' }] } } },
      { t: 'try', say: '用同一個方法，答答看。', scene: { w: 'bars', p: { rows: [{ label: '弟', segs: [solid(5, 'a', '?')] }, { label: '哥', segs: [solid(5, 'a', '?'), dashed(4, '多 4')] }], braces: [{ from: 0, to: 1, label: '共 14', c: 't' }] }, still: true },
        q: { stem: '兩人共有 14 粒糖，哥哥比弟弟多 4 粒。弟弟有幾粒？', options: ['5', '7', '9'], answer: '5', hint: '先拿走多出的 4 粒，再平分。', why: { 7: '14 的一半是 7，但兩人不一樣多。', 9: '9 是哥哥的粒數，題目問弟弟。' } } },
      { t: 'card' }
    ],
    gens: g31, verify: verify31
  });

  /* ======================================================================= p3-2 和倍、差倍 =================================== */
  const art32 = '<svg viewBox="0 0 120 80"><rect x="10" y="10" width="26" height="18" rx="5" fill="#3ee6d0"/><g fill="#ffc94a"><rect x="10" y="34" width="26" height="18" rx="5"/><rect x="38" y="34" width="26" height="18" rx="5"/></g><text x="23" y="19" text-anchor="middle" dominant-baseline="central" font-size="12" font-weight="900" fill="#0b1030">1份</text><rect x="14" y="58" width="92" height="18" rx="9" fill="#ff8fc7"/><text x="60" y="68" text-anchor="middle" dominant-baseline="central" font-size="12" font-weight="900" fill="#0b1030">先找 1 份</text></svg>';
  const rowsK = (u, k, lbl) => [{ l: lbl[0], p: [[1, 'a', '1份']] }, { l: lbl[1], p: [[k, 'b', `${k}份`]] }];
  const g32 = {
    A: [
      (r, p) => {
        const [X, Y] = pick(r, PR3), k = ri(r, 2, 8), u = N(r, p, 2, 12), S = (k + 1) * u, big = r() < .5, ans = big ? k * u : u;
        const w = wy(ans, [[big ? u : k * u, big ? '那是 1 份，大的有好幾份。' : '那是大的，題目問小的。'], [S, `${S} 是兩人加起來的。`], [S % k === 0 ? S / k : 0, `一共是 ${k}＋1＝${k + 1} 份，不是 ${k} 份。`]]);
        return o('mul-sum', `${X}和${Y}共有 ${S} 粒糖，${X}是${Y}的 ${k} 倍。${big ? X : Y}有幾粒？`, ans, `${Y}是 1 份，${X}是 ${k} 份，一共幾份？`,
          `一共 1＋${k}＝${k + 1} 份；${S}÷${k + 1}＝${u}（${Y}）${big ? `；${u}×${k}＝${k * u}（${X}）` : ''}。`, ks(w), big ? `${S}/${k + 1}*${k}` : `${S}/${k + 1}`, [],
          { svg: bsvg([{ l: Y, p: [[1, 'a', '1份']] }, { l: X, p: [[k, 'b', `${k}份`]] }], `共 ${S}`), why: w });
      },
      (r, p) => {
        const [X, Y] = pick(r, PR3), k = ri(r, 2, 8), u = N(r, p, 2, 12), D = (k - 1) * u, big = r() < .5, ans = big ? k * u : u;
        const w = wy(ans, [[big ? u : k * u, big ? '那是 1 份，大的有好幾份。' : '那是大的，題目問小的。'], [D, `${D} 是 ${k - 1} 份，不是 1 份。`], [D % k === 0 ? D / k : 0, `差是 ${k}－1＝${k - 1} 份，不是 ${k} 份。`]]);
        return o('mul-diff', `${X}比${Y}多 ${D} 粒糖，${X}是${Y}的 ${k} 倍。${big ? X : Y}有幾粒？`, ans, `${X}比${Y}多幾份？`,
          `多 ${k}－1＝${k - 1} 份；${D}÷${k - 1}＝${u}（${Y}）${big ? `；${u}×${k}＝${k * u}（${X}）` : ''}。`, ks(w), big ? `${D}/${k - 1}*${k}` : `${D}/${k - 1}`, [],
          { svg: bsvg([{ l: Y, p: [[1, 'a', '1份']] }, { l: X, p: [[1, 'a', '1份'], [k - 1, 'd', `差 ${D}`, 1]] }]), why: w });
      },
      (r, p) => {
        const k = ri(r, 2, 8), u = N(r, p, 3, 12), S = (k + 1) * u, ans = u;
        const w = wy(ans, [[k * u, '那是長的一段，題目問短的。'], [S, '那是整條繩的長度。'], [S % k === 0 ? S / k : 0, `一共是 ${k + 1} 份，不是 ${k} 份。`]]);
        return o('mul-rope', `一條繩長 ${S} 厘米，剪成兩段。長的是短的 ${k} 倍，短的長多少厘米？`, ans, '短的是 1 份，長的是幾份？',
          `一共 1＋${k}＝${k + 1} 份；${S}÷${k + 1}＝${u} 厘米。`, ks(w), `${S}/${k + 1}`, [],
          { svg: bsvg([{ l: '短', p: [[1, 'a', '1份']] }, { l: '長', p: [[k, 'b', `${k}份`]] }], `共 ${S}`), why: w });
      }
    ],
    B: [
      /* three quantities: 丙 = 1 份, 乙 = a 份, 甲 = a×b 份 */
      (r, p) => {
        const a = ri(r, 2, 3), b = ri(r, 2, 3), parts = 1 + a + a * b, u = N(r, p, 2, Math.floor(120 / parts)), S = parts * u, which = ri(r, 0, 2), nm = ['丙', '乙', '甲'][which], vals = [u, a * u, a * b * u], ans = vals[which];
        const others = vals.filter((_, i) => i !== which);
        const w = wy(ans, [[others[0], `那是${['丙', '乙', '甲'].filter((_, i) => i !== which)[0]}的粒數，題目問${nm}。`], [others[1], `那是${['丙', '乙', '甲'].filter((_, i) => i !== which)[1]}的粒數，題目問${nm}。`]]);
        return o('mul-three', `三人共有 ${S} 粒糖，乙是丙的 ${a} 倍，甲是乙的 ${b} 倍。${nm}有幾粒？`, ans, '把丙當 1 份，乙和甲各是幾份？',
          `丙 1 份，乙 ${a} 份，甲 ${a}×${b}＝${a * b} 份，共 ${parts} 份；${S}÷${parts}＝${u}（丙）；${nm}＝${ans}。`, ks(w), which === 0 ? `${S}/${parts}` : `${S}/${parts}*${which === 1 ? a : a * b}`, [],
          { svg: bsvg([{ l: '丙', p: [[1, 'a', '1份']] }, { l: '乙', p: [[a, 'b', `${a}份`]] }, { l: '甲', p: [[a * b, 't', `${a * b}份`]] }], `共 ${S}`), why: w });
      },
      /* find 1 份 from the difference first, then the total */
      (r, p) => {
        const [X, Y] = pick(r, PR3), k = ri(r, 2, 6), u = N(r, p, 2, 15), D = (k - 1) * u, ans = (k + 1) * u;
        const w = wy(ans, [[D, `${D} 只是差，總數還要加上較小的一份。`], [u, '那是 1 份，兩人一共有好幾份。'], [k * u, `那是${X}的，兩人一共還要加${Y}的。`]]);
        return o('mul-total', `${X}比${Y}多 ${D} 粒糖，${X}是${Y}的 ${k} 倍。兩人一共有幾粒？`, ans, '先用差求出 1 份是多少。',
          `差是 ${k}－1＝${k - 1} 份；${D}÷${k - 1}＝${u}（1 份）；共 ${k}＋1＝${k + 1} 份，${u}×${k + 1}＝${ans}。`, ks(w), `${D}/${k - 1}*${k + 1}`, [],
          { svg: bsvg([{ l: Y, p: [[1, 'a', '1份']] }, { l: X, p: [[1, 'a', '1份'], [k - 1, 'd', `差 ${D}`, 1]] }]), why: w });
      },
      /* find 1 份 from the sum first, then the difference */
      (r, p) => {
        const [X, Y] = pick(r, PR3), k = ri(r, 3, 8), u = N(r, p, 2, 12), S = (k + 1) * u, ans = (k - 1) * u;
        const w = wy(ans, [[u, `那是 ${Y}的粒數，差還要用 ${k}－1 份來算。`], [k * u, `那是${X}的粒數，題目問多出幾粒。`], [S, '那是兩人加起來的。']]);
        return o('mul-gap', `${X}和${Y}共有 ${S} 粒糖，${X}是${Y}的 ${k} 倍。${X}比${Y}多幾粒？`, ans, '先求 1 份，再看多了幾份。',
          `共 ${k + 1} 份，${S}÷${k + 1}＝${u}；多 ${k}－1＝${k - 1} 份，${u}×${k - 1}＝${ans}。`, ks(w), `${S}/${k + 1}*${k - 1}`, [],
          { svg: bsvg([{ l: Y, p: [[1, 'a', '1份']] }, { l: X, p: [[k, 'b', `${k}份`]] }], `共 ${S}`), why: w });
      }
    ]
  };
  const verify32 = q => {
    let m;
    if ((m = /^(.+?)比(.+?)多 (\d+) 粒糖，\1是\2的 (\d+) 倍。兩人一共/.exec(q.q))) { const D = +m[3], k = +m[4]; for (let y = 1; y <= D; y++) if (k * y - y === D) return String(k * y + y); return 'none'; }
    if ((m = /^(.+?)和(.+?)共有 (\d+) 粒糖，\1是\2的 (\d+) 倍。(.+?)有幾粒/.exec(q.q))) { const S = +m[3], k = +m[4]; for (let y = 1; y <= S; y++) if (y + k * y === S) return String(m[5] === m[1] ? k * y : y); return 'none'; }
    if ((m = /^(.+?)比(.+?)多 (\d+) 粒糖，\1是\2的 (\d+) 倍。(.+?)有幾粒/.exec(q.q))) { const D = +m[3], k = +m[4]; for (let y = 1; y <= D; y++) if (k * y - y === D) return String(m[5] === m[1] ? k * y : y); return 'none'; }
    if ((m = /^一條繩長 (\d+) 厘米，剪成兩段。長的是短的 (\d+) 倍/.exec(q.q))) { const S = +m[1], k = +m[2]; for (let y = 1; y <= S; y++) if (y * (k + 1) === S) return String(y); return 'none'; }
    if ((m = /^三人共有 (\d+) 粒糖，乙是丙的 (\d+) 倍，甲是乙的 (\d+) 倍。(.)有幾粒/.exec(q.q))) { const S = +m[1], a = +m[2], b = +m[3]; for (let c = 1; c <= S; c++) { const yi = a * c, ja = b * yi; if (c + yi + ja === S) return String({ 丙: c, 乙: yi, 甲: ja }[m[4]]); } return 'none'; }
    if ((m = /^(.+?)和(.+?)共有 (\d+) 粒糖，\1是\2的 (\d+) 倍。\1比\2多幾粒/.exec(q.q))) { const S = +m[3], k = +m[4]; for (let y = 1; y <= S; y++) if (y + k * y === S) return String(k * y - y); return 'none'; }
    return null;
  };
  const bars32 = (rows, extra) => ({ w: 'bars', p: Object.assign({ rows }, extra || {}) });
  WQOly.register({
    id: 'p3-2', grade: 3, n: 2, title: '和倍、差倍', icon: '🍰',
    card: { motto: '先找 1 份', example: '和 12、2 倍：1 份是 4', art: art32 },
    lesson: [
      { t: 'show', say: '哥哥的糖是弟弟的 2 倍。兩人共 12 粒。', scene: Object.assign(bars32([{ label: '弟', segs: [solid(1, 'a', '1份')] }, { label: '哥', segs: [solid(2, 'b', '2份')] }], { braces: [{ from: 0, to: 1, label: '共 12', c: 't' }] }), { still: true }) },
      { t: 'predict', say: '把弟弟的糖當成 1 份。', ask: '兩人一共有幾份？', options: ['2', '3', '12'], answer: '3', scene: Object.assign(bars32([{ label: '弟', segs: [solid(1, 'a', '1份')] }, { label: '哥', segs: [solid(2, 'b', '2份')] }], { braces: [{ from: 0, to: 1, label: '共 12', c: 't' }] }), { still: true }), reveal: '弟 1 份，哥 2 份，一共 3 份。' },
      { t: 'show', say: '3 份是 12 粒。12÷3＝4，1 份是 4 粒。', scene: Object.assign(bars32([{ label: '弟', segs: [solid(4, 'a', '4')] }, { label: '哥', segs: [{ u: 4, c: 'b', text: '4', rep: 2 }] }], { braces: [{ from: 0, to: 1, label: '共 12', c: 't' }] }), { still: true }) },
      { t: 'do', say: '1 份是 4。拉到 3 份，剛好 12 粒。', scene: bars32([{ label: '共', segs: [{ u: 12, c: 't', text: '12' }] }, { label: '份', segs: [{ u: 4, rep: 1, c: 'a', edit: true, target: 3, min: 1, max: 5 }] }]) },
      { t: 'show', say: '哥哥比弟弟多 6 粒，是弟弟的 3 倍。', scene: Object.assign(bars32([{ label: '弟', segs: [solid(3, 'a', '1份')] }, { label: '哥', segs: [solid(3, 'a', '1份'), dashed(6, '多 6')] }]), { still: true }) },
      { t: 'do', say: '哥哥多 2 份＝6 粒，1 份是 3。拉到 3 份。', scene: bars32([{ label: '弟', segs: [{ u: 3, rep: 1, c: 'a', text: '1份' }] }, { label: '哥', segs: [{ u: 3, rep: 1, c: 'b', edit: true, target: 3, min: 1, max: 5 }] }]) },
      { t: 'try', say: '先找 1 份，再算。', scene: Object.assign(bars32([{ label: '弟', segs: [solid(1, 'a', '1份')] }, { label: '哥', segs: [solid(3, 'b', '3份')] }], { braces: [{ from: 0, to: 1, label: '共 20', c: 't' }] }), { still: true }),
        q: { stem: '兩人共有 20 粒糖，哥哥是弟弟的 3 倍。弟弟有幾粒？', options: ['5', '10', '15'], answer: '5', hint: '一共幾份？20 粒分成這麼多份。', why: { 15: '15 是哥哥的，題目問弟弟。', 10: '10 是把 20 平分，兩人不一樣多。' } } },
      { t: 'card' }
    ],
    gens: g32, verify: verify32
  });

  /* ======================================================================= p3-3 年齡問題 ===================================== */
  const art33 = '<svg viewBox="0 0 120 80"><g font-size="22" text-anchor="middle" dominant-baseline="central"><text x="28" y="22">🧒</text><text x="92" y="22">👨</text></g><path d="M28 36v22M92 36v22" stroke="#3ee6d0" stroke-width="3" stroke-dasharray="3 4"/><path d="M28 47H92" stroke="#ff8fc7" stroke-width="3"/><rect x="14" y="58" width="92" height="18" rx="9" fill="#ff8fc7"/><text x="60" y="68" text-anchor="middle" dominant-baseline="central" font-size="12" font-weight="900" fill="#0b1030">年齡差不變</text></svg>';
  const PAR = ['媽媽', '爸爸'], KID = ['小明', '小美', '阿強', '小欣'];
  const g33 = {
    A: [
      (r, p) => {
        const P = pick(r, PAR), C = pick(r, KID), c = N(r, p, 4, 14), df = N(r, p, 20, 36), M = c + df, n = N(r, p, 3, 20);
        const w = wy(df, [[df + n, `年齡差不會變，不用再加 ${n} 年。`], [df - n, `年齡差不會變，不用減 ${n} 年。`], [M, `${M} 是${P}今年的歲數。`]]);
        return o('age-diff', `今年${P} ${M} 歲，${C} ${c} 歲。${n} 年後，${P}比${C}大幾歲？`, df, '兩個人每年都長大 1 歲。',
          `${n} 年後兩人都多 ${n} 歲，差不變：${M}－${c}＝${df}。`, ks(w), `${M}-${c}`, [],
          { svg: bsvg([{ l: C, p: [[c, 'a', `${c}`], [n, 'b', `+${n}`]] }, { l: P, p: [[c, 'a', ''], [df, 'd', `差 ${df}`, 1], [n, 'b', `+${n}`]] }]), why: w });
      },
      (r, p) => {
        const P = pick(r, PAR), C = pick(r, KID), c = N(r, p, 4, 14), df = N(r, p, 20, 34), n = N(r, p, 3, 20), ans = c + df + n;
        const w = wy(ans, [[c + df, `還要加上這 ${n} 年。`], [c + n, `那是${C}的年齡，題目問${P}。`], [df + n, '還要加上小朋友今年的歲數。']]);
        return o('age-after', `${C}今年 ${c} 歲，${P}比${C}大 ${df} 歲。${n} 年後，${P}幾歲？`, ans, `先算${P}今年幾歲。`,
          `${P}今年 ${c}＋${df}＝${c + df} 歲，${n} 年後 ${c + df}＋${n}＝${ans} 歲。`, ks(w), `${c}+${df}+${n}`, [], { why: w });
      },
      (r, p) => {
        const b = N(r, p, 3, 12), g = N(r, p, 3, 12), a = b + g, A = N(r, p, a + 2, a + 22), ans = A - g;
        const w = wy(ans, [[A + g, `年齡差是 ${g}，妹妹比姐姐小，不是大。`], [g, `${g} 是年齡差，不是妹妹今年的歲數。`], [A - a, '要用姐姐今年的歲數減去年齡差。']]);
        return o('age-back', `姐姐 ${a} 歲時，妹妹 ${b} 歲。姐姐今年 ${A} 歲，妹妹今年幾歲？`, ans, '姐姐比妹妹大幾歲？',
          `年齡差 ${a}－${b}＝${g} 歲不變；妹妹今年 ${A}－${g}＝${ans} 歲。`, ks(w), `${A}-${a}+${b}`, [],
          { svg: bsvg([{ l: '妹', p: [[b, 'a', `${b}`]] }, { l: '姐', p: [[b, 'a', ''], [g, 'd', `差 ${g}`, 1]] }]), why: w });
      }
    ],
    B: [
      /* years later P is k times C: difference = (k-1) parts */
      (r, p) => {
        const P = pick(r, PAR), C = pick(r, KID), k = ri(r, 2, 4), n = N(r, p, 2, 12), u = ri(r, n + 1, Math.min(15, Math.floor(58 / k) + n)), c = u - n, M = k * u - n;
        const w = wy(n, [[u, `${u} 是${C}那時的歲數，題目問幾年後。`], [M - c, '那是兩人的年齡差，不是年數。']]);
        return o('age-times', `今年${P} ${M} 歲，${C} ${c} 歲。幾年後${P}的年齡是${C}的 ${k} 倍？`, n, '年齡差不變，找出 1 份是幾歲。',
          `差 ${M}－${c}＝${M - c}，是 ${k}－1＝${k - 1} 份，1 份是 ${u} 歲；${u}－${c}＝${n} 年。`, ks(w), `${M - c}/${k - 1}-${c}`, [],
          { svg: bsvg([{ l: C, p: [[1, 'a', '1份']] }, { l: P, p: [[1, 'a', '1份'], [k - 1, 'd', `差 ${M - c}`, 1]] }]), why: w });
      },
      (r, p) => {
        const P = pick(r, PAR), C = pick(r, KID), k = ri(r, 2, 4), n = N(r, p, 2, 12), u = ri(r, n + 1, Math.min(15, Math.floor(58 / k))), c = u - n, df = (k - 1) * u;
        const w = wy(c, [[u, `${u} 是 ${n} 年後的歲數，要減去 ${n}。`], [u + n, `要減去 ${n} 年，不是加。`], [df, '那是年齡差，不是歲數。']]);
        return o('age-solve', `今年${P}比${C}大 ${df} 歲。${n} 年後${P}是${C}的 ${k} 倍，${C}今年幾歲？`, c, `差 ${df} 是幾份？`,
          `差是 ${k - 1} 份，${df}÷${k - 1}＝${u}（${n} 年後${C}的歲數）；今年 ${u}－${n}＝${c} 歲。`, ks(w), `${df}/${k - 1}-${n}`, [],
          { why: w });
      },
      /* years ago P was k times C */
      (r, p) => {
        const P = pick(r, PAR), C = pick(r, KID), k = ri(r, 2, 4), n = N(r, p, 2, 12), u = ri(r, 3, Math.min(14, Math.floor(50 / k))), df = (k - 1) * u, ans = k * u + n;
        const w = wy(ans, [[k * u, `${k * u} 是 ${n} 年前的歲數，要再加 ${n} 年。`], [u + n, `那是${C}今年的歲數，題目問${P}。`], [df, '那是年齡差。']]);
        return o('age-ago', `${n} 年前，${P}的年齡是${C}的 ${k} 倍，${P}比${C}大 ${df} 歲。${P}今年幾歲？`, ans, `先求 ${n} 年前${C}幾歲。`,
          `差是 ${k - 1} 份，${df}÷${k - 1}＝${u}（${C}那時）；${P}那時 ${u}×${k}＝${k * u}，今年 ${k * u}＋${n}＝${ans} 歲。`, ks(w), `${df}/${k - 1}*${k}+${n}`, [], { why: w });
      }
    ]
  };
  const verify33 = q => {
    let m;
    if ((m = /^今年(\S+?) (\d+) 歲，(\S+?) (\d+) 歲。(\d+) 年後，.+?比.+?大幾歲/.exec(q.q))) { const n = +m[5]; return String((+m[2] + n) - (+m[4] + n)); }
    if ((m = /^(\S+?)今年 (\d+) 歲，(\S+?)比\1大 (\d+) 歲。(\d+) 年後，.+?幾歲/.exec(q.q))) { let a = +m[2] + +m[4]; for (let i = 0; i < +m[5]; i++) a++; return String(a); }
    if ((m = /^姐姐 (\d+) 歲時，妹妹 (\d+) 歲。姐姐今年 (\d+) 歲/.exec(q.q))) { let s = +m[2], j = +m[1]; while (j < +m[3]) { j++; s++; } return String(s); }
    if ((m = /^今年\S+? (\d+) 歲，\S+? (\d+) 歲。幾年後.+的年齡是.+的 (\d+) 倍/.exec(q.q))) { const M = +m[1], c = +m[2], k = +m[3]; for (let n = 1; n <= 80; n++) if (M + n === k * (c + n)) return String(n); return 'none'; }
    if ((m = /^今年\S+?比\S+?大 (\d+) 歲。(\d+) 年後\S+?是\S+?的 (\d+) 倍，/.exec(q.q))) { const df = +m[1], n = +m[2], k = +m[3]; for (let c = 1; c <= 80; c++) if (c + df + n === k * (c + n)) return String(c); return 'none'; }
    if ((m = /^(\d+) 年前，\S+?的年齡是\S+?的 (\d+) 倍，\S+?比\S+?大 (\d+) 歲。/.exec(q.q))) { const n = +m[1], k = +m[2], df = +m[3]; for (let c0 = 1; c0 <= 80; c0++) if (c0 + df === k * c0) return String(c0 + df + n); return 'none'; }
    return null;
  };
  const ageBars = (n, withTimes) => [
    { label: '小明', segs: [solid(6, 'a', '6'), { u: 1, c: 'b', edit: true, target: n, start: 1, min: 1, max: 6 }] },
    { label: '爸爸', segs: [solid(6, 'a', ''), dashed(20, '差 20'), { u: 1, c: 'b', edit: true, target: n, start: 1, min: 1, max: 6 }] }
  ];
  WQOly.register({
    id: 'p3-3', grade: 3, n: 3, title: '年齡問題', icon: '🎂',
    card: { motto: '年齡差不會變', example: '爸比我大 30 歲，永遠', art: art33 },
    lesson: [
      { t: 'show', say: '小明 6 歲，爸爸 26 歲。爸爸大 20 歲。', scene: { w: 'bars', p: { rows: [{ label: '小明', segs: [solid(6, 'a', '6')] }, { label: '爸爸', segs: [solid(6, 'a', ''), dashed(20, '差 20')] }] }, still: true } },
      { t: 'predict', say: '5 年後，兩人都長大 5 歲。', ask: '爸爸比小明大幾歲？', options: ['15', '20', '25'], answer: '20', scene: { w: 'bars', p: { rows: [{ label: '小明', segs: [solid(6, 'a', '6'), solid(3, 'b', '+5')] }, { label: '爸爸', segs: [solid(6, 'a', ''), dashed(20, '差 20'), solid(3, 'b', '+5')] }] }, still: true }, reveal: '兩人同時多 5 歲，差還是 20！' },
      { t: 'do', say: '把兩條「年」都拉到 5，看差有沒有變。', scene: { w: 'bars', p: { rows: ageBars(5) } } },
      { t: 'show', say: '年齡差永遠不變。', scene: { w: 'bars', p: { rows: [{ label: '小明', segs: [solid(6, 'a', '6'), solid(5, 'b', '5')] }, { label: '爸爸', segs: [solid(6, 'a', ''), dashed(20, '差 20'), solid(5, 'b', '5')] }] }, still: true } },
      { t: 'show', say: '爸爸是小明的 3 倍時，差是 2 份。2 份＝20，1 份＝10。', scene: { w: 'bars', p: { rows: [{ label: '小明', segs: [solid(10, 'a', '1份')] }, { label: '爸爸', segs: [solid(10, 'a', '1份'), dashed(20, '差 20')] }] }, still: true } },
      { t: 'do', say: '小明 10 歲時，爸爸是 3 份。拉到 3 份。', scene: { w: 'bars', p: { rows: [{ label: '小明', segs: [{ u: 10, rep: 1, c: 'a', text: '1份' }] }, { label: '爸爸', segs: [{ u: 10, rep: 1, c: 'b', edit: true, target: 3, min: 1, max: 4 }] }] } } },
      { t: 'try', say: '想一想：小明要幾年後才 10 歲？', scene: { w: 'bars', p: { rows: [{ label: '小明', segs: [solid(6, 'a', '6'), solid(4, 'b', '?')] }, { label: '爸爸', segs: [solid(6, 'a', ''), dashed(20, '差 20'), solid(4, 'b', '?')] }] }, still: true },
        q: { stem: '小明現在 6 歲。幾年後他 10 歲？', options: ['4', '10', '16'], answer: '4', hint: '10 歲減去現在的 6 歲。', why: { 16: '16 是加錯了，要用 10 減 6。', 10: '10 是那時的歲數，不是年數。' } } },
      { t: 'card' }
    ],
    gens: g33, verify: verify33
  });

  /* ======================================================================= p3-4 搭配與樹形圖 ================================= */
  const art34 = '<svg viewBox="0 0 120 80"><g stroke="#c3cbf7" stroke-width="2" fill="none"><path d="M60 8V16M60 16L28 30M60 16L92 30M28 30L14 44M28 30L42 44M92 30L78 44M92 30L106 44"/></g><g fill="#3ee6d0"><circle cx="60" cy="8" r="5"/><circle cx="28" cy="30" r="5"/><circle cx="92" cy="30" r="5"/></g><g fill="#ffc94a"><circle cx="14" cy="44" r="4"/><circle cx="42" cy="44" r="4"/><circle cx="78" cy="44" r="4"/><circle cx="106" cy="44" r="4"/></g><rect x="14" y="58" width="92" height="18" rx="9" fill="#ff8fc7"/><text x="60" y="68" text-anchor="middle" dominant-baseline="central" font-size="12" font-weight="900" fill="#0b1030">一層一層分支</text></svg>';
  const TH2 = [
    (a, b) => `${a} 件上衣、${b} 條褲，上衣和褲各選一件。共有幾款配搭？`,
    (a, b) => `${a} 款麵、${b} 款湯，各選一款成一碗。共有幾種配搭？`,
    (a, b) => `${a} 條路由甲村去乙村，${b} 條路由乙村去丙村。甲到丙共有幾種走法？`,
    (a, b) => `${a} 種飯、${b} 種飲品，各選一種成一個套餐。共有幾種套餐？`
  ];
  const TH3 = [
    (a, b, c) => `${a} 件上衣、${b} 條褲、${c} 頂帽，各選一件。共有幾款配搭？`,
    (a, b, c) => `${a} 種飯、${b} 種小食、${c} 種飲品，各選一種。共有幾種套餐？`,
    (a, b, c) => `${a} 條路由甲到乙，${b} 條由乙到丙，${c} 條由丙到丁。甲到丁有幾種走法？`
  ];
  const g34 = {
    A: [
      (r, p) => {
        const a = ri(r, 2, 4), b = ri(r, 2, 4), t = ri(r, 0, TH2.length - 1), ans = a * b;
        const w = wy(ans, [[a + b, '加錯了：每一種都要和另一邊每一種配。'], [Math.max(a, b), '那只是其中一種的配法，其他的也要配。']]);
        return o('tree-two', TH2[t](a, b), ans, '畫樹形圖：第一層有幾枝？每枝再分幾枝？',
          `第一層 ${a} 枝，每枝再分 ${b} 枝：${a}×${b}＝${ans}。`, ks(w), `${a}*${b}`, [], { why: w, svg: treeSvg(a, b) });
      },
      (r, p) => {
        const a = ri(r, 2, 4), b = ri(r, 2, 4), t = r() < .5, ans = b;
        const w = wy(ans, [[a * b, '那是總共的款數，題目問褲的數目。'], [a + b, '不是相加，是每件上衣都配每條褲。']]);
        return o('tree-back', t ? `有 ${a} 件上衣和一些褲，各選一件，共有 ${a * b} 款配搭。有幾條褲？` : `有 ${a} 款麵和一些湯，各選一款，共有 ${a * b} 種配搭。有幾款湯？`, ans, '每件上衣配幾條褲，總共才 ' + (a * b) + ' 款？',
          `每${t ? '件上衣' : '款麵'}有 ${a * b}÷${a}＝${b} 種配法，所以有 ${b} ${t ? '條褲' : '款湯'}。`, ks(w), `${a * b}/${a}`, [], { why: w, svg: treeSvg(a, b) });
      }
    ],
    B: [
      /* three layers */
      (r, p) => {
        const a = ri(r, 2, 3), b = ri(r, 2, 3), c = ri(r, 2, 3), t = ri(r, 0, TH3.length - 1), ans = a * b * c;
        const w = wy(ans, [[a * b, '還有第三層，每款再往下分。'], [a + b + c, '加錯了，每一層都要乘。'], [a * b + c, `${a}×${b} 之後還要乘 ${c}。`]]);
        return o('tree-three', TH3[t](a, b, c), ans, '一層一層乘：先算前兩層，再乘第三層。',
          `${a}×${b}＝${a * b}，再 ${a * b}×${c}＝${ans}。`, ks(w), `${a}*${b}*${c}`, [], { why: w });
      },
      /* second layer limited by the first: same colour not allowed */
      (r, p) => {
        const a = ri(r, 3, 4), b = ri(r, 3, 4), m = ri(r, 1, 3), t = r() < .5, ans = a * b - m;
        const w = wy(ans, [[a * b, '同色的配搭要去掉。'], [a + b, '加錯了，每件都要和每條配。'], [a * b - 2 * m, `同色的只有 ${m} 款，不是 ${2 * m} 款。`]]);
        return o('tree-limit', t ? `上衣有 ${a} 種顏色，褲有 ${b} 種顏色，其中 ${m} 種顏色兩邊都有。同色不配，有幾款？` : `帽有 ${a} 種顏色，圍巾有 ${b} 種顏色，其中 ${m} 種兩邊都有。同色不配，有幾款？`, ans, '先全部配，再去掉同色的。',
          `全部配有 ${a}×${b}＝${a * b} 款，同色 ${m} 款不要：${a * b}－${m}＝${ans}。`, ks(w), `${a}*${b}-${m}`, [], { why: w });
      }
    ]
  };
  /* tiny tree picture: a tops on the first layer, b branches each */
  function treeSvg(a, b) {
    const W = 230, y0 = 10, y1 = 44, y2 = 82, total = a * b, dx = Math.min(22, 200 / total);
    let s = '';
    for (let i = 0; i < a; i++) {
      const cx = 15 + (i * b + (b - 1) / 2) * dx + dx / 2 + ((W - 30 - total * dx) / 2);
      s += `<path d="M${W / 2} ${y0 + 6}L${cx} ${y1 - 6}" stroke="#c3cbf7" stroke-width="2"/><circle cx="${cx}" cy="${y1}" r="6" fill="#3ee6d0"/>`;
      for (let j = 0; j < b; j++) { const x = 15 + (i * b + j) * dx + dx / 2 + ((W - 30 - total * dx) / 2); s += `<path d="M${cx} ${y1 + 6}L${x} ${y2 - 5}" stroke="#c3cbf7" stroke-width="2"/><circle cx="${x}" cy="${y2}" r="${Math.min(5, dx / 2 - 1)}" fill="#ffc94a"/>`; }
    }
    return `<svg viewBox="0 0 ${W} 94" role="img" aria-label="樹形圖：${a} 枝，每枝 ${b} 枝"><circle cx="${W / 2}" cy="${y0}" r="6" fill="#c6a2ff"/>${s}</svg>`;
  }
  const verify34 = q => {
    let m;
    if ((m = /^有 (\d+) (件上衣和一些褲|款麵和一些湯).+共有 (\d+) [款種]配搭/.exec(q.q))) { const a = +m[1], T = +m[3]; for (let b = 1; b <= 20; b++) if (a * b === T) return String(b); return 'none'; }
    if ((m = /^(上衣|帽)有 (\d+) 種顏色，(?:褲|圍巾)有 (\d+) 種顏色，其中 (\d+) 種/.exec(q.q))) { const a = +m[2], b = +m[3], k = +m[4]; let c = 0; for (let i = 0; i < a; i++) for (let j = 0; j < b; j++) if (!(i < k && j < k && i === j)) c++; return String(c); }
    if ((m = /^(\d+)[^\d]+(\d+)[^\d]+(\d+)[^\d]+$/.exec(q.q))) { let c = 0; for (let i = 0; i < +m[1]; i++) for (let j = 0; j < +m[2]; j++) for (let k = 0; k < +m[3]; k++) c++; return String(c); }
    if ((m = /^(\d+)[^\d]+(\d+)[^\d]+$/.exec(q.q))) { let c = 0; for (let i = 0; i < +m[1]; i++) for (let j = 0; j < +m[2]; j++) c++; return String(c); }
    return null;
  };
  const shirt = (n, c, edit, text) => ({ label: c, segs: [{ u: 1, rep: n, c: edit ? 'a' : 'a', text: text || '褲' }] });
  const pantsRow = (label, col, edit) => ({ label, segs: [edit ? { u: 1, rep: 1, c: col, edit: true, target: edit, min: 1, max: 5, text: '褲' } : { u: 1, rep: 3, c: col, text: '褲' }] });
  WQOly.register({
    id: 'p3-4', grade: 3, n: 4, title: '搭配與樹形圖', icon: '👕',
    card: { motto: '一層一層分支', example: '2 件上衣 3 條褲：6 款', art: art34 },
    lesson: [
      { t: 'show', say: '有 2 件上衣、3 條褲。像樹一樣一層層分枝。', scene: { w: 'bars', p: { rows: [pantsRow('紅', 'a'), pantsRow('藍', 'b')] }, still: true } },
      { t: 'predict', say: '上衣和褲各選一件來穿。', ask: '一共有幾款配搭？', options: ['5', '6', '8'], answer: '6', scene: { w: 'bars', p: { rows: [pantsRow('紅', 'a'), pantsRow('藍', 'b')], braces: [{ from: 0, to: 1, label: '共 ? 款', c: 't' }] }, still: true }, reveal: '每件上衣配 3 款，3＋3＝6，就是 2×3。' },
      { t: 'do', say: '紅上衣和藍上衣，都拉到 3 條褲。', scene: { w: 'bars', p: { rows: [pantsRow('紅', 'a', 3), pantsRow('藍', 'b', 3)], braces: [{ from: 0, to: 1, label: '共 6 款', c: 't' }] } } },
      { t: 'show', say: '每枝都分 3 枝，2 枝就是 2×3＝6 款。', scene: { w: 'bars', p: { rows: [pantsRow('紅', 'a'), pantsRow('藍', 'b')], braces: [{ from: 0, to: 1, label: '2×3＝6', c: 't' }] }, still: true } },
      { t: 'predict', say: '再多 2 頂帽子。每款再配帽。', ask: '一共有幾款？', options: ['8', '10', '12'], answer: '12', scene: { w: 'bars', p: { rows: [pantsRow('紅', 'a'), pantsRow('藍', 'b')], braces: [{ from: 0, to: 1, label: '6 款', c: 't' }] }, still: true }, reveal: '6 款每款配 2 頂帽：6×2＝12。' },
      { t: 'do', say: '3 件上衣、2 條褲。每件拉到 2 條褲。', scene: { w: 'bars', p: { rows: [pantsRow('紅', 'a', 2), pantsRow('黃', 'b', 2), pantsRow('藍', 't', 2)], braces: [{ from: 0, to: 2, label: '共 6 款', c: 't' }] } } },
      { t: 'try', say: '一層一層分，答答看。', scene: { w: 'bars', p: { rows: [pantsRow('甲', 'a'), pantsRow('乙', 'b'), pantsRow('丙', 'g')] }, still: true },
        q: { stem: '3 款麵、4 款湯，各選一款。共有幾種配搭？', options: ['7', '12', '16'], answer: '12', hint: '每款麵都能配 4 款湯。', why: { 7: '7 是加出來的，每款麵都要配每款湯。', 16: '16 是 4×4，麵只有 3 款。' } } },
      { t: 'card' }
    ],
    gens: g34, verify: verify34
  });

  /* ======================================================================= p3-5 乘法巧算（位值拆分） ========================= */
  const art35 = '<svg viewBox="0 0 120 80"><g fill="#3ee6d0"><rect x="8" y="8" width="66" height="34" rx="4"/></g><g fill="#ffc94a"><rect x="78" y="8" width="26" height="34" rx="4"/></g><text x="41" y="25" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="900" fill="#0b1030">20×4</text><text x="91" y="25" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="900" fill="#0b1030">3×4</text><rect x="14" y="52" width="92" height="20" rx="10" fill="#ff8fc7"/><text x="60" y="63" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="900" fill="#0b1030">拆開再乘</text></svg>';
  const g35 = {
    A: [
      (r, p) => {
        const t = N(r, p, 2, 9), u = ri(r, 1, 9), b = ri(r, 3, 9), a = t * 10 + u, s = a * b, t0 = t * 10;
        const w = wy(s, [[t0 * b + u, `${u} 也要乘 ${b}，不是直接加。`], [t * b + u * b, `${t} 是 ${t0}，要乘 10 才對。`], [t0 * b, `${u}×${b} 也要加上。`]]);
        return o('sp-two', `${a}×${b}＝？拆成 ${t0} 和 ${u} 來乘。`, s, `${a} 拆成 ${t0}＋${u}。`, `${t0}×${b}＝${t0 * b}，${u}×${b}＝${u * b}；${t0 * b}＋${u * b}＝${s}。`, ks(w), `${a}*${b}`, [], { why: w });
      },
      (r, p) => {
        const t = N(r, p, 2, 9), u = ri(r, 1, 9), b = ri(r, 3, 9), a = t * 10 + u, s = a * b;
        const w = wy(s, [[t * 10 * b + u, `${u} 也要乘 ${b}。`], [t * 10 * b, `個位的 ${u}×${b} 也要加上。`], [t * b + u * b, `${t} 其實是 ${t * 10}。`]]);
        return o('sp-story', `每盒有 ${a} 粒糖，${b} 盒共有幾粒？`, s, `${a} 粒拆成 ${t * 10} 粒和 ${u} 粒。`, `${a}×${b}＝${t * 10}×${b}＋${u}×${b}＝${t * 10 * b}＋${u * b}＝${s}。`, ks(w), `${a}*${b}`, [], { why: w });
      },
      (r, p) => {
        const t = N(r, p, 2, 9), u = ri(r, 2, 9), b = ri(r, 3, 9), a = t * 10 + u, s1 = t * 10 * b, ans = u * b;
        const w = wy(ans, [[s1, `${s1} 是十位那一份，這裏問個位那一份。`], [u + b, '個位要相乘，不是相加。'], [a * b, '那是整個答案，這裏只問個位的一份。']]);
        return o('sp-part', `${a}×${b}＝${s1}＋？，？是多少？`, ans, `${a} 拆成 ${t * 10}＋${u}，十位那份已經是 ${s1}。`, `個位那份：${u}×${b}＝${ans}；${s1}＋${ans}＝${a * b}。`, ks(w), `${u}*${b}`, [], { why: w });
      }
    ],
    B: [
      (r, p) => {
        const b = ri(r, 3, 9), hmax = Math.min(9, Math.floor((4900 / b - 100) / 100)), h = N(r, p, 1, hmax), t = ri(r, 1, 9), u = ri(r, 1, 9), a = h * 100 + t * 10 + u, s = a * b;
        const w = wy(s, [[h * 100 * b + t * 10 * b + u, `個位的 ${u} 也要乘 ${b}。`], [h * b + t * b + u * b, `百位和十位要當成 ${h * 100} 和 ${t * 10}。`], [h * 100 * b + u * b, `十位的 ${t * 10}×${b} 不能漏掉。`]]);
        return o('sp-three', `${a}×${b}＝？按百位、十位、個位拆開乘。`, s, `${a} 拆成 ${h * 100}＋${t * 10}＋${u}。`,
          `${h * 100}×${b}＋${t * 10}×${b}＋${u}×${b}＝${h * 100 * b}＋${t * 10 * b}＋${u * b}＝${s}。`, ks(w), `${a}*${b}`, [], { why: w });
      },
      (r, p) => {
        const b = ri(r, 3, 9), hmax = Math.min(9, Math.floor((4900 / b - 100) / 100)), h = N(r, p, 1, hmax), u = ri(r, 1, 9), a = h * 100 + u, s = a * b;
        const w = wy(s, [[h * 100 * b + u, `${u} 也要乘 ${b}。`], [h * b + u * b, `${h} 其實是 ${h * 100}。`], [h * 100 * b, `個位的 ${u}×${b} 也要加。`], [h * 10 * b + u * b, '百位是 100，不是 10。']]);
        return o('sp-zero', `每箱有 ${a} 個蛋，${b} 箱共有幾個？`, s, `${a} 的十位是 0，拆成 ${h * 100}＋${u}。`, `${a}×${b}＝${h * 100}×${b}＋${u}×${b}＝${h * 100 * b}＋${u * b}＝${s}。`, ks(w), `${a}*${b}`, [], { why: w });
      },
      (r, p) => {
        const b = ri(r, 3, 9), hmax = Math.min(8, Math.floor((4900 / b - 100) / 100)), h = N(r, p, 1, hmax), t = ri(r, 1, 9), u = ri(r, 1, 9), a = h * 100 + t * 10 + u, c = ri(r, 2, 9), s = a * b + c;
        const w = wy(s, [[a * b, `最後還要加上 ${c}。`], [h * 100 * b + t * 10 * b + u + c, `個位的 ${u} 也要乘 ${b}。`], [a + b + c, '不是相加，是先把 ' + a + ' 乘 ' + b + '。']]);
        return o('sp-plus', `每袋有 ${a} 粒珠，${b} 袋再加 ${c} 粒，共有幾粒？`, s, `先算 ${a}×${b}，拆成百、十、個。`,
          `${h * 100}×${b}＋${t * 10}×${b}＋${u}×${b}＝${a * b}；${a * b}＋${c}＝${s}。`, ks(w), `${a}*${b}+${c}`, [], { why: w });
      }
    ]
  };
  const verify35 = q => {
    let m;
    if ((m = /^(\d+)×(\d+)＝？/.exec(q.q))) { let s = 0; for (let i = 0; i < +m[2]; i++) s += +m[1]; return String(s); }
    if ((m = /^(\d+)×(\d+)＝(\d+)＋？/.exec(q.q))) { let s = 0; for (let i = 0; i < +m[2]; i++) s += +m[1]; return String(s - +m[3]); }
    if ((m = /^每盒有 (\d+) 粒糖，(\d+) 盒/.exec(q.q)) || (m = /^每箱有 (\d+) 個蛋，(\d+) 箱/.exec(q.q))) { let s = 0; for (let i = 0; i < +m[2]; i++) s += +m[1]; return String(s); }
    if ((m = /^每袋有 (\d+) 粒珠，(\d+) 袋再加 (\d+) 粒/.exec(q.q))) { let s = +m[3]; for (let i = 0; i < +m[2]; i++) s += +m[1]; return String(s); }
    return null;
  };
  WQOly.register({
    id: 'p3-5', grade: 3, n: 5, title: '乘法巧算', icon: '✂️',
    card: { motto: '拆開再乘', example: '23×4＝20×4＋3×4', art: art35 },
    lesson: [
      { t: 'show', say: '23×4 不好一口氣算。把 23 拆開來！', scene: { w: 'array', p: { cols: 23, rows: 4, cut: 20 }, still: true } },
      { t: 'predict', say: '把 23 拆成 20 和 3。', ask: '20×4 是多少？', options: ['60', '80', '100'], answer: '80', scene: { w: 'array', p: { cols: 23, rows: 4, cut: 20 }, still: true }, reveal: '2 個十乘 4 是 8 個十，就是 80。' },
      { t: 'do', say: '拖動切線，把 23 切成 20 和 3。', scene: { w: 'array', p: { cols: 23, rows: 4, cut: 20 } } },
      { t: 'show', say: '20×4＝80，3×4＝12。80＋12＝92。', scene: { w: 'array', p: { cols: 23, rows: 4, cut: 20, start: 20 }, still: true } },
      { t: 'do', say: '再試一次：14×6。切成 10 和 4。', scene: { w: 'array', p: { cols: 14, rows: 6, cut: 10 } } },
      { t: 'show', say: '三位數也一樣：按百、十、個拆開，每份都乘。', scene: { w: 'bars', p: { rows: [{ label: '321', segs: [solid(3, 'a', '300'), solid(2, 'b', '20'), solid(1, 'd', '1')] }, { label: '×3', segs: [solid(3, 'a', '900'), solid(2, 'b', '60'), solid(1, 'd', '3')] }], braces: [{ from: 1, to: 1, label: '963', c: 't' }] }, still: true } },
      { t: 'try', say: '拆成十位和個位，答答看。', scene: { w: 'array', p: { cols: 32, rows: 5, cut: 30 }, still: true },
        q: { stem: '32×5＝？', options: ['152', '155', '160'], answer: '160', hint: '30×5 和 2×5 各是多少？', why: { 155: '2 也要乘 5，2×5＝10，不是 5。', 152: '2 也要乘 5，2×5＝10，不是 2。' } } },
      { t: 'card' }
    ],
    gens: g35, verify: verify35
  });
})();
