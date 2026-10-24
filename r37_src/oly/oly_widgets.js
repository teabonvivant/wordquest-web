/* WQOlyWidgets (R3.23): reusable, touch + mouse + keyboard lesson tools for the 奧數路線. SVG only, no dependencies, no voice.
   WQOlyWidgets.mount(name, el, params, api) -> {check():bool, demo():Promise, reset(), destroy()}
     params.mode  'do' (interactive, the default) | 'show' (a picture that only plays demo())
     api          {reduced?:bool, sfx?(name), onChange?()}   reduced = prefers-reduced-motion (demo jumps to the final state)
   Every tool: drag by pointer (touch + mouse), a keyboard way to do the same thing (Tab / Enter / arrow keys), and 示範 = demo().
   Colour code (same everywhere): aqua = first part, gold = second part, violet = total, pink = difference / the thing to find. */
(function (root) {
  'use strict';
  const NS = 'http://www.w3.org/2000/svg';
  const C = { gold: '#ffc94a', goldD: '#c48a00', aqua: '#3ee6d0', aquaD: '#12998a', pink: '#ff8fc7', pinkD: '#c84f8a', blue: '#7cc8ff', violet: '#c6a2ff', violetD: '#7d55c7', green: '#7ee3a1', ink: '#0b1030', card: '#141a46', card2: '#1b2160', text: '#f4f6ff', muted: '#c3cbf7', bad: '#ff6b81', line: 'rgba(255,255,255,.28)' };
  const PART = { a: [C.aqua, C.aquaD], b: [C.gold, C.goldD], t: [C.violet, C.violetD], d: [C.pink, C.pinkD], g: [C.green, '#2f9d63'], k: [C.blue, '#2e7fb8'] };
  const FONT = 'ui-rounded,"SF Pro Rounded",system-ui,-apple-system,"PingFang HK","Noto Sans TC","Microsoft JhengHei",sans-serif';
  const EMOJI = '"Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif';
  const list = {};
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const easeOut = t => 1 - Math.pow(1 - t, 3);
  const easeIO = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  const easeBack = t => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };

  /* ---------------------------------------------------------------- svg helpers */
  function el(tag, attrs, parent, text) {
    const e = document.createElementNS(NS, tag);
    if (attrs) for (const k in attrs) if (attrs[k] !== undefined && attrs[k] !== null) e.setAttribute(k, attrs[k]);
    if (text !== undefined) e.textContent = text;
    if (parent) parent.appendChild(e);
    return e;
  }
  function txt(parent, x, y, s, o) {
    o = o || {};
    return el('text', { x, y, 'text-anchor': o.anchor || 'middle', 'dominant-baseline': o.base || 'central', 'font-size': o.size || 20, 'font-weight': o.weight || 800, fill: o.fill || C.text,
      'font-family': o.emoji ? EMOJI : FONT, 'pointer-events': 'none', opacity: o.opacity, class: o.cls }, parent, s);
  }
  function fit(host) {
    host.innerHTML = '';
    host.classList.add('r80-w');
    const r = host.getBoundingClientRect(), cw = r.width || 360, ch = r.height || 360;
    const W = 400, H = clamp(Math.round(W * ch / cw), 250, 620);
    const svg = el('svg', { viewBox: `0 0 ${W} ${H}`, preserveAspectRatio: 'xMidYMid meet', class: 'r80-svg', role: 'group', focusable: 'false' }, host);
    svg.style.width = '100%'; svg.style.height = '100%'; svg.style.display = 'block'; svg.style.touchAction = 'none';
    return { svg, W, H };
  }
  function toPt(svg, ev) {
    const m = svg.getScreenCTM();
    if (!m) return { x: ev.clientX, y: ev.clientY };
    const p = new DOMPoint(ev.clientX, ev.clientY).matrixTransform(m.inverse());
    return { x: p.x, y: p.y };
  }
  const place = (g, x, y, s) => g.setAttribute('transform', `translate(${x.toFixed(2)} ${y.toFixed(2)})${s !== undefined && s !== 1 ? ` scale(${s})` : ''}`);
  /* pointer drag (touch + mouse). o.start(pt,ev) -> ctx | false ; o.move(pt,ctx,ev) ; o.end(pt,ctx,ev,moved) ; a press that did not move is o.tap(ctx) */
  function drag(target, svg, o) {
    target.style.touchAction = 'none';
    target.addEventListener('pointerdown', ev => {
      if (ev.button > 0 || target.__busy) return;
      const pt = toPt(svg, ev), ctx = o.start ? o.start(pt, ev) : {};
      if (ctx === false) return;
      ev.preventDefault();
      try { target.setPointerCapture(ev.pointerId); } catch (_) { /* */ }
      const p0 = pt; let moved = false;
      const mv = e2 => { const q = toPt(svg, e2); if (!moved && Math.hypot(q.x - p0.x, q.y - p0.y) < 4) return; moved = true; o.move && o.move(q, ctx, e2); };
      const up = e2 => {
        target.removeEventListener('pointermove', mv); target.removeEventListener('pointerup', up); target.removeEventListener('pointercancel', up);
        try { target.releasePointerCapture(ev.pointerId); } catch (_) { /* */ }
        const q = toPt(svg, e2);
        if (!moved && e2.type !== 'pointercancel') { if (o.tap) o.tap(ctx, q); else o.end && o.end(q, ctx, e2, false); } else o.end && o.end(q, ctx, e2, true);
      };
      target.addEventListener('pointermove', mv); target.addEventListener('pointerup', up); target.addEventListener('pointercancel', up);
    });
  }
  /* keyboard: Enter / Space act like a tap; arrows map to o.arrow(dx,dy) */
  function keys(target, o) {
    target.setAttribute('tabindex', '0');
    target.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); o.act && o.act(e); }
      else if (o.arrow) {
        const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key];
        if (d) { e.preventDefault(); o.arrow(d[0], d[1], e); }
      }
    });
  }
  /* a pill button inside the svg (min 56 units high = 46px on a phone) */
  function sbtn(parent, o) {
    const g = el('g', { class: 'r80-sb' + (o.cls ? ' ' + o.cls : ''), role: 'button', 'aria-label': o.aria || o.label }, parent);
    const w = o.w || 96, h = o.h || 56;
    el('rect', { x: o.x - w / 2, y: o.y - h / 2 + 4, width: w, height: h, rx: h / 2, fill: o.shade || C.goldD, opacity: .9 }, g);
    const r = el('rect', { x: o.x - w / 2, y: o.y - h / 2, width: w, height: h, rx: h / 2, fill: o.fill || C.gold, class: 'r80-sbr' }, g);
    txt(g, o.x, o.y + 1, o.label, { size: o.size || 22, fill: o.ink || '#3b2600', weight: 900 });
    g.style.cursor = 'pointer';
    keys(g, { act: () => o.onClick && o.onClick() });
    g.addEventListener('click', e => { e.preventDefault(); o.onClick && o.onClick(); });
    g.__rect = r;
    return g;
  }
  /* animation runner: cancellable tweens (reset / destroy stops everything) */
  function runner(api) {
    let tok = 0, dead = false;
    const R = {
      get reduced() { return !!(api && api.reduced); },
      cancel() { tok++; },
      destroy() { dead = true; tok++; },
      sleep(ms) { const t = tok; return new Promise(res => setTimeout(() => res(t === tok && !dead), R.reduced ? 0 : ms)); },
      tween(ms, fn, ease) {
        const t = tok, ez = ease || easeOut;
        if (R.reduced || ms <= 0) { fn(1); return Promise.resolve(t === tok && !dead); }
        return new Promise(res => {
          const s = performance.now();
          (function f(now) {
            if (t !== tok || dead) { res(false); return; }
            const k = clamp((now - s) / ms, 0, 1); fn(ez(k));
            if (k < 1) requestAnimationFrame(f); else res(true);
          })(s);
        });
      },
      get token() { return tok; }
    };
    return R;
  }
  function sfx(api, n) { try { api && api.sfx && api.sfx(n); } catch (_) { /* */ } }
  /* a handful of stars + dots flying out of (x, y); under reduced motion only a still ring */
  function burst(svg, x, y, api, n) {
    const g = el('g', { 'pointer-events': 'none' }, svg);
    if (api && api.reduced) { const ring = el('circle', { cx: x, cy: y, r: 26, fill: 'none', stroke: C.gold, 'stroke-width': 4, opacity: .9 }, g); setTimeout(() => ring.remove(), 900); setTimeout(() => g.remove(), 950); return; }
    const cols = [C.gold, C.aqua, C.pink, C.violet, '#fff'], ps = [];
    for (let i = 0; i < (n || 14); i++) {
      const an = i / (n || 14) * Math.PI * 2 + Math.random() * .4, sp = 38 + Math.random() * 46;
      const e = i % 3 === 0 ? el('path', { d: 'M0-7 2-2 7-2 3 1 4.5 7 0 3.5-4.5 7-3 1-7-2-2-2z', fill: cols[i % cols.length] }, g) : el('circle', { r: 2.6 + Math.random() * 2.4, fill: cols[i % cols.length] }, g);
      ps.push({ e, dx: Math.cos(an) * sp, dy: Math.sin(an) * sp - 10 });
    }
    const s = performance.now();
    (function f(now) {
      const k = clamp((now - s) / 750, 0, 1), z = easeOut(k);
      ps.forEach(p => { p.e.setAttribute('transform', `translate(${x + p.dx * z} ${y + p.dy * z + 26 * k * k}) scale(${1 - k * .5})`); p.e.setAttribute('opacity', 1 - k * k); });
      if (k < 1) requestAnimationFrame(f); else g.remove();
    })(s);
  }
  function make(name, def) { list[name] = def; }
  function mount(name, host, params, api) {
    const d = list[name];
    if (!d) throw new Error('WQOlyWidgets: unknown widget ' + name);
    api = api || {};
    if (api.reduced === undefined) { try { api.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (_) { api.reduced = false; } }
    const inst = d.mount(host, params || {}, api);
    inst.name = name;
    return inst;
  }
  const changed = api => { try { api.onChange && api.onChange(); } catch (_) { /* */ } };

  /* ================================================================ tenframe: drag counters between two ten-frames, make-10 merge */
  make('tenframe', { mount(host, p, api) {
    const a0 = p.a == null ? 8 : p.a, b0 = p.b == null ? 5 : p.b, T = 10, inter = p.mode !== 'show';
    const run = runner(api); let svg, W, H, solved = false, cs = [], occ, fr, cell, fw, fh, eq, cntA, cntB, rod = null;
    function build() {
      run.cancel(); solved = false; rod = null;
      ({ svg, W, H } = fit(host));
      svg.setAttribute('aria-label', `十格框：左框 ${a0} 粒，右框 ${b0} 粒`);
      const stack = H >= 400; cell = stack ? Math.min(54, (H - 160) / 4) : 34; fw = cell * 5; fh = cell * 2; const top0 = Math.max(10, (H - (4 * cell + 150)) / 2 + 4);
      fr = stack ? { A: { x: (W - fw) / 2, y: top0 }, B: { x: (W - fw) / 2, y: top0 + fh + 78 } } : { A: { x: W / 2 - fw - 12, y: H * .22 }, B: { x: W / 2 + 12, y: H * .22 } };
      for (const k of 'AB') {
        const f = fr[k];
        el('rect', { x: f.x - 6, y: f.y - 6, width: fw + 12, height: fh + 12, rx: 14, fill: 'rgba(255,255,255,.07)', stroke: k === 'A' ? C.aqua : C.gold, 'stroke-width': 2.5, class: 'r80-frame-' + k }, svg);
        for (let i = 1; i < 5; i++) el('line', { x1: f.x + i * cell, y1: f.y, x2: f.x + i * cell, y2: f.y + fh, stroke: C.line, 'stroke-width': 1.5 }, svg);
        el('line', { x1: f.x, y1: f.y + cell, x2: f.x + fw, y2: f.y + cell, stroke: C.line, 'stroke-width': 1.5 }, svg);
      }
      cntA = txt(svg, fr.A.x + fw / 2, fr.A.y + fh + 24, '', { size: 22, fill: C.aqua });
      cntB = txt(svg, fr.B.x + fw / 2, fr.B.y + fh + 24, '', { size: 22, fill: C.gold });
      eq = txt(svg, W / 2, stack ? fr.B.y + fh + 66 : fr.A.y + fh + 66, '', { size: 24, fill: C.text });
      occ = { A: Array(10).fill(null), B: Array(10).fill(null) }; cs = [];
      const mk = (k, n, col) => { for (let i = 0; i < n; i++) { const c = { k, i, home: k, col }; c.g = el('g', { class: 'r80-chip', role: inter ? 'button' : 'img', 'aria-label': `${k === 'A' ? '左' : '右'}框的點` }, svg); el('circle', { r: cell * .37 + 3, fill: 'rgba(0,0,0,.25)', cy: 3 }, c.g); el('circle', { r: cell * .37, fill: col[0], stroke: col[1], 'stroke-width': 3 }, c.g); el('circle', { r: cell * .11, cx: -cell * .13, cy: -cell * .14, fill: '#fff', opacity: .6 }, c.g); occ[k][i] = c; cs.push(c); put(c, k, i); } };
      mk('A', a0, PART.a); mk('B', b0, PART.b);
      if (inter) cs.forEach(wire);
      count();
    }
    const sx = (k, i) => fr[k].x + (i % 5) * cell + cell / 2, sy = (k, i) => fr[k].y + Math.floor(i / 5) * cell + cell / 2;
    function put(c, k, i) { c.k = k; c.i = i; occ[k][i] = c; place(c.g, sx(k, i), sy(k, i)); }
    function free(k) { for (let i = 0; i < 10; i++) if (!occ[k][i]) return i; return -1; }
    function nAt(k) { return occ[k].filter(Boolean).length; }
    function count() {
      cntA.textContent = nAt('A') + ' 粒'; cntB.textContent = nAt('B') + ' 粒';
      if (!solved) { const need = T - nAt('A'); eq.textContent = need > 0 ? `左框還差 ${need} 粒` : ''; eq.setAttribute('fill', C.muted); }
    }
    async function moveTo(c, k, i, ms) {
      occ[c.k][c.i] = null; occ[k][i] = c; const x0 = c.x == null ? sx(c.k, c.i) : c.x, y0 = c.y == null ? sy(c.k, c.i) : c.y; c.k = k; c.i = i;
      const x1 = sx(k, i), y1 = sy(k, i);
      await run.tween(ms == null ? 260 : ms, t => { c.x = x0 + (x1 - x0) * t; c.y = y0 + (y1 - y0) * t - Math.sin(t * Math.PI) * 14; place(c.g, c.x, c.y); }, easeIO);
      c.x = x1; c.y = y1; place(c.g, x1, y1); return true;
    }
    function wire(c) {
      let ox = 0, oy = 0;
      drag(c.g, svg, {
        start(pt) { if (solved) return false; svg.appendChild(c.g); c.g.classList.add('lift'); const x = sx(c.k, c.i), y = sy(c.k, c.i); ox = pt.x - x; oy = pt.y - y; return {}; },
        move(pt) { c.x = pt.x - ox; c.y = pt.y - oy; place(c.g, c.x, c.y, 1.12); },
        async end(pt) {
          c.g.classList.remove('lift'); let best = null, bd = cell * .95;
          for (const k of 'AB') for (let i = 0; i < 10; i++) { if (occ[k][i] && occ[k][i] !== c) continue; const d = Math.hypot(pt.x - ox - sx(k, i), pt.y - oy - sy(k, i)); if (d < bd) { bd = d; best = [k, i]; } }
          if (!best) best = [c.k, c.i];
          await moveTo(c, best[0], best[1], 160); sfx(api, best[0] === c.k && best[1] === c.i ? 'tap' : 'pop'); after();
        },
        tap() { toggle(c); }
      });
      keys(c.g, { act: () => toggle(c) });
    }
    function toggle(c) {
      if (solved) return; const to = c.k === 'A' ? 'B' : 'A', i = free(to); if (i < 0) return;
      moveTo(c, to, i, 220).then(() => { sfx(api, 'pop'); after(); });
    }
    function after() { count(); if (!solved && nAt('A') >= T) win(); changed(api); }
    async function win() {
      solved = true; cs.forEach(c => { c.g.style.pointerEvents = 'none'; c.g.removeAttribute('tabindex'); });
      const f = fr.A, cx = f.x + fw / 2, cy = f.y + fh / 2, A = cs.filter(c => c.k === 'A');
      sfx(api, 'good');
      await run.tween(520, t => A.forEach(c => place(c.g, sx('A', c.i) + (cx - sx('A', c.i)) * t, sy('A', c.i) + (cy - sy('A', c.i)) * t, 1 - .55 * t)), easeIO);
      A.forEach(c => { c.g.style.display = 'none'; });
      rod = el('g', { class: 'r80-rod' }, svg);
      const rw = fw - 4, rh = cell * 1.5;
      el('rect', { x: cx - rw / 2, y: cy - rh / 2 + 4, width: rw, height: rh, rx: 16, fill: PART.t[1] }, rod);
      el('rect', { x: cx - rw / 2, y: cy - rh / 2, width: rw, height: rh, rx: 16, fill: PART.t[0] }, rod);
      for (let i = 1; i < 10; i++) el('line', { x1: cx - rw / 2 + rw * i / 10, y1: cy - rh / 2 + 8, x2: cx - rw / 2 + rw * i / 10, y2: cy + rh / 2 - 8, stroke: 'rgba(255,255,255,.35)', 'stroke-width': 1.5 }, rod);
      txt(rod, cx, cy, '10', { size: 34, fill: C.ink, weight: 900 });
      await run.tween(260, t => rod.setAttribute('opacity', t) || rod.setAttribute('transform', `translate(${cx} ${cy}) scale(${.6 + .4 * t}) translate(${-cx} ${-cy})`), easeBack);
      burst(svg, cx, cy, api);
      const rest = nAt('B');
      eq.textContent = `${a0} ＋ ${b0} ＝ 10 ＋ ${rest} ＝ ${a0 + b0}`; eq.setAttribute('fill', C.gold);
      changed(api);
    }
    build();
    return {
      check: () => solved,
      reset() { build(); changed(api); },
      destroy() { run.destroy(); },
      async demo() {
        build(); await run.sleep(350);
        const need = T - a0;
        for (let n = 0; n < need; n++) {
          const c = cs.find(x => x.k === 'B' && x.home === 'B' && !x.done); if (!c) break; c.done = true;
          const i = free('A'); if (i < 0) break; svg.appendChild(c.g);
          if (!(await moveTo(c, 'A', i, 520))) return false; sfx(api, 'pop'); count(); await run.sleep(120);
        }
        if (nAt('A') >= T && !solved) { await win(); }
        changed(api); return true;
      }
    };
  } });

  /* ================================================================ numline: a frog hops along a number line */
  make('numline', { mount(host, p, api) {
    const lo = p.min == null ? 0 : p.min, hi = p.max == null ? 20 : p.max, start = p.start == null ? 0 : p.start, target = p.target, steps = p.steps || [1, 2, 5], inter = p.mode !== 'show';
    const run = runner(api); let svg, W, H, pos, trail, frog, readout, x0, dx, ly, hops, done = false;
    const X = v => x0 + (v - lo) * dx;
    function build() {
      run.cancel(); done = false; hops = [];
      ({ svg, W, H } = fit(host));
      svg.setAttribute('aria-label', `數線：由 ${start}${target != null ? ' 去 ' + target : ''}`);
      x0 = 30; dx = (W - 60) / (hi - lo); ly = Math.round(H * (inter ? .46 : .55));
      el('line', { x1: X(lo) - 10, y1: ly, x2: X(hi) + 10, y2: ly, stroke: C.muted, 'stroke-width': 4, 'stroke-linecap': 'round' }, svg);
      const lw = Math.max(String(lo).length, String(hi).length) * 10 + 10, need = lw / dx, every = [1, 2, 5, 10, 20, 25, 50, 100, 200, 250, 500, 1000].find(e => e >= need) || 1000, mk = [start, target].filter(v => v != null), near = v => mk.some(m => m !== v && Math.abs(m - v) * dx < lw);
      let lastMark = null;
      for (let v = lo; v <= hi; v++) {
        const big = v % every === 0, mark = v === target || v === start;
        el('line', { x1: X(v), y1: ly - (big || mark ? 9 : 5), x2: X(v), y2: ly + (big || mark ? 9 : 5), stroke: C.muted, 'stroke-width': big || mark ? 3 : 2 }, svg);
        if (big && !mark && !near(v)) txt(svg, X(v), ly + 26, v, { size: 16, fill: C.muted, weight: 700 });
        if (mark) { const low = (every === 1 && v === target) || (lastMark != null && (v - lastMark) * dx < lw); lastMark = v; txt(svg, X(v), ly + (low ? 50 : 26), v, { size: 17, fill: v === target ? C.pink : C.aqua, weight: 900 }); }
      }
      if (target != null) { el('circle', { cx: X(target), cy: ly, r: 11, fill: 'none', stroke: C.pink, 'stroke-width': 3, 'stroke-dasharray': '4 4' }, svg); txt(svg, X(target), ly - 40, '⭐', { size: 22, emoji: true }); }
      trail = el('g', {}, svg);
      frog = el('g', { class: 'r80-frog', role: 'slider', 'aria-label': '小青蛙', 'aria-valuemin': lo, 'aria-valuemax': hi }, svg);
      el('circle', { cx: 0, cy: -4, r: 26, fill: 'rgba(0,0,0,0)' }, frog); el('ellipse', { cx: 0, cy: 14, rx: 15, ry: 5, fill: 'rgba(0,0,0,.3)' }, frog);
      txt(frog, 0, -6, '🐸', { size: 40, emoji: true });
      readout = txt(svg, W / 2, Math.max(36, ly - 120), '', { size: 26, fill: C.text });
      pos = start; setFrog(pos);
      if (inter) {
        let ox = 0, from = start;
        drag(frog, svg, { start(pt) { if (done) return false; svg.appendChild(frog); from = pos; ox = pt.x - X(pos); return {}; }, move(pt) { const v = clamp(Math.round(lo + (pt.x - ox - x0) / dx), lo, hi); pos = v; setFrog(v, true); }, end() { if (pos !== from) { addHop(from, pos); } sfx(api, 'pop'); judge(); } });
        keys(frog, { arrow: dxk => { if (!done) hopBy(dxk); }, act: () => { } });
        const bw = 78, nb = steps.length, gap = 12, tot = nb * bw + (nb - 1) * gap + 70;
        let bx = (W - tot) / 2 + bw / 2; const by = Math.min(H - 44, ly + 100);
        steps.forEach(s => { sbtn(svg, { x: bx, y: by, w: bw, label: '＋' + s, onClick: () => hopBy(s), aria: `向前跳 ${s} 格` }); bx += bw + gap; });
        sbtn(svg, { x: bx + 4, y: by, w: 62, label: '↺', fill: PART.k[0], shade: PART.k[1], ink: C.ink, onClick: () => { build(); changed(api); }, aria: '重來' });
      }
      note();
    }
    function setFrog(v, live) { place(frog, X(v), ly - 22 - (live ? 8 : 0)); frog.setAttribute('aria-valuenow', v); note(); }
    function note() { if (!readout) return; readout.textContent = hops.length ? [start, ...hops.map(h => h.to)].join(' → ') : String(pos); readout.setAttribute('fill', done ? C.gold : C.text); }
    function addHop(from, to) {
      hops.push({ from, to }); const i = hops.length - 1, col = [C.aqua, C.gold, C.pink, C.violet][i % 4], xa = X(from), xb = X(to), h = Math.min(70, 22 + Math.abs(xb - xa) * .35);
      const g = el('g', {}, trail);
      el('path', { d: `M${xa} ${ly - 8} Q${(xa + xb) / 2} ${ly - 8 - h * 1.6} ${xb} ${ly - 8}`, fill: 'none', stroke: col, 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-dasharray': '1 9' }, g);
      txt(g, (xa + xb) / 2, ly - 8 - h * .8 - 12, (to >= from ? '＋' : '－') + Math.abs(to - from), { size: 20, fill: col, weight: 900 });
      note();
    }
    async function hopBy(n) {
      if (done || frog.__hop) return; const to = clamp(pos + n, lo, hi); if (to === pos) return; frog.__hop = true; const from = pos;
      await run.tween(300, t => { const x = X(from) + (X(to) - X(from)) * t; place(frog, x, ly - 22 - Math.sin(t * Math.PI) * 40); }, easeIO);
      frog.__hop = false; pos = to; setFrog(to); addHop(from, to); sfx(api, 'pop'); judge();
    }
    function judge() { if (target != null && pos === target && !done) { done = true; sfx(api, 'good'); burst(svg, X(pos), ly - 30, api); note(); } changed(api); }
    build();
    return {
      check: () => target == null ? hops.length > 0 : pos === target,
      reset() { build(); changed(api); }, destroy() { run.destroy(); },
      async demo() {
        build(); await run.sleep(300);
        const plan = p.hops || (target != null ? [{ n: target - start }] : [{ n: steps[0] }]);
        for (const h of plan) { if (!(await demoHop(h.n))) return false; await run.sleep(150); }
        done = target != null && pos === target; if (done) { sfx(api, 'good'); burst(svg, X(pos), ly - 30, api); note(); } changed(api); return true;
      }
    };
    async function demoHop(n) {
      const to = clamp(pos + n, lo, hi), from = pos; if (to === from) return true;
      const ok = await run.tween(520, t => { const x = X(from) + (X(to) - X(from)) * t; place(frog, x, ly - 22 - Math.sin(t * Math.PI) * 46); }, easeIO);
      if (!ok) return false; pos = to; setFrog(to); addHop(from, to); sfx(api, 'pop'); return true;
    }
  } });

  /* ================================================================ bars: bar model with draggable parts, braces for total / difference */
  make('bars', { mount(host, p, api) {
    const rowsD = p.rows || [], braces = p.braces || [], inter = p.mode !== 'show', pad = 14, labW = 52;
    const run = runner(api); let svg, W, H, rows, ux, rh = 46, gap = 26, y0, solved = false;
    function build() {
      run.cancel(); solved = false;
      ({ svg, W, H } = fit(host));
      svg.setAttribute('aria-label', '棒形圖');
      const segU = r => r.segs.reduce((s, g) => s + (g.rep || 1) * g.u, 0);
      rows = rowsD.map(r => ({ label: r.label, segs: r.segs.map(s => Object.assign({}, s, { u0: s.u, rep0: s.rep, u: s.edit && s.start != null ? s.start : s.u, rep: s.rep })) }));
      const maxU = Math.max(...rows.map(r => r.segs.reduce((s, g) => s + (g.max ? Math.max(g.max, (g.rep || 1) * g.u) : (g.rep || 1) * g.u), 0)), 4);
      ux = Math.min(46, (W - pad * 2 - labW - (braces.length ? 96 : 24)) / maxU);
      const totalH = rows.length * rh + (rows.length - 1) * gap; y0 = Math.max(40, (H - totalH) / 2 - (inter ? 28 : 6));
      rows.forEach((r, ri) => {
        r.y = y0 + ri * (rh + gap);
        txt(svg, pad + labW / 2, r.y + rh / 2, r.label || '', { size: 22, fill: C.text });
        r.segs.forEach((s, si) => {
          const col = PART[s.c || 'a'] || PART.a;
          s.g = el('g', {}, svg); s.rect = el('rect', { rx: 8, height: rh, y: r.y, fill: s.dashed ? 'none' : col[0], stroke: s.dashed ? col[0] : col[1], 'stroke-width': s.dashed ? 3 : 2.5, 'stroke-dasharray': s.dashed ? '7 6' : null }, s.g);
          s.div = el('path', { stroke: s.dashed ? col[0] : col[1], 'stroke-width': 1.6, opacity: .55, fill: 'none' }, s.g);
          s.label = txt(s.g, 0, r.y + rh / 2, '', { size: 22, fill: s.dashed ? col[0] : C.ink, weight: 900 });
          if (s.edit && inter) {
            s.h = el('g', { class: 'r80-handle', role: 'slider', 'aria-label': `${r.label || ''}的長度`, 'aria-valuemin': s.min || 1, 'aria-valuemax': s.max || 12 }, svg);
            el('circle', { r: 17, fill: C.gold, stroke: C.goldD, 'stroke-width': 3 }, s.h); el('path', { d: 'M-5-6-9 0-5 6M5-6 9 0 5 6', stroke: '#3b2600', 'stroke-width': 2.6, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, s.h);
            wire(r, s);
          }
        });
      });
      braces.forEach(b => { b.p = el('path', { fill: 'none', stroke: PART[b.c || 'd'][0], 'stroke-width': 3.5, 'stroke-linecap': 'round' }, svg); b.t = txt(svg, 0, 0, b.label, { size: 20, fill: PART[b.c || 'd'][0], anchor: 'start' }); });
      layout(); judge(false);
    }
    const unitsOf = s => s.rep ? s.u * s.rep : s.u;
    function layout() {
      rows.forEach(r => {
        let x = pad + labW + 4, prevH = false;
        r.segs.forEach(s => {
          const w = unitsOf(s) * ux; s.x = x; s.w = w; s.rect.setAttribute('x', x); s.rect.setAttribute('width', Math.max(0, w));
          let d = ''; const cnt = unitsOf(s), step = s.rep ? s.u * ux : ux; for (let i = 1; i < (s.rep || cnt); i++) d += `M${x + i * step} ${r.y + 6}V${r.y + rh - 6}`; s.div.setAttribute('d', d);
          const shown = s.text !== undefined ? s.text : (s.rep ? s.rep + ' 份' : unitsOf(s)); s.label.textContent = s.edit && s.text === undefined ? (s.rep ? s.rep + ' 份' : s.u) : shown; const inL = prevH ? 17 : 0, inR = s.h ? 17 : 0, avail = w - inL - inR - 8; let fs = 22; s.label.setAttribute('font-size', fs); let tw = 0; try { tw = s.label.getBBox().width; } catch (e) { tw = String(s.label.textContent).length * 20; }
          if (tw > avail) { fs = 16; s.label.setAttribute('font-size', fs); tw = tw * 16 / 22; }
          const out = tw > avail; s.label.setAttribute('y', out ? r.y - 12 : r.y + rh / 2);
          s.label.setAttribute('fill', out ? (s.dashed ? (PART[s.c || 'a'] || PART.a)[0] : C.text) : (s.dashed ? (PART[s.c || 'a'] || PART.a)[0] : C.ink));
          s.label.setAttribute('x', out ? x + w / 2 : x + inL + (w - inL - inR) / 2); prevH = !!s.h;
          if (s.h) place(s.h, x + w, r.y + rh / 2);
          x += w;
        });
        r.end = x;
      });
      braces.forEach(b => {
        const r0 = rows[b.from], r1 = rows[b.to == null ? b.from : b.to], x = Math.max(...rows.map(r => r.end)) + 22, ya = r0.y, yb = r1.y + rh, m = (ya + yb) / 2;
        b.p.setAttribute('d', `M${x - 8} ${ya}Q${x} ${ya} ${x} ${ya + 8}V${m - 8}Q${x} ${m} ${x + 8} ${m}Q${x} ${m} ${x} ${m + 8}V${yb - 8}Q${x} ${yb} ${x - 8} ${yb}`);
        b.t.setAttribute('x', x + 14); b.t.setAttribute('y', m); b.t.setAttribute('font-size', 19);
      });
    }
    function wire(r, s) {
      const key = s.rep ? 'rep' : 'u', mn = s.min || 1, mx = s.max || 12; let x0 = 0;
      const setv = v => { v = clamp(v, mn, mx); if (v === s[key]) return; s[key] = v; layout(); sfx(api, 'tick'); judge(true); };
      drag(s.h, svg, { start() { if (solved) return false; x0 = s.x; return {}; }, move(pt) { const un = s.rep ? s.u * ux : ux; setv(Math.round((pt.x - x0) / un)); }, end() { sfx(api, 'pop'); } });
      keys(s.h, { arrow: dxk => { if (!solved) setv(s[key] + dxk); } });
      s.h.setAttribute('aria-valuenow', s[key]);
    }
    function judge(user) {
      let ok = true, any = false;
      rows.forEach(r => r.segs.forEach(s => { if (s.edit) { any = true; const key = s.rep ? 'rep' : 'u'; if (s.h) s.h.setAttribute('aria-valuenow', s[key]); if (s.target != null && s[key] !== s.target) ok = false; } }));
      if (any && ok && !solved && user) { solved = true; sfx(api, 'good'); const s = rows.flatMap(r => r.segs).find(z => z.edit); burst(svg, s.x + s.w, rows[0].y + rh / 2, api); rows.forEach(r => r.segs.forEach(z => { if (z.h) z.h.style.pointerEvents = 'none'; })); }
      if (user) changed(api);
    }
    build();
    return {
      check: () => { let any = false, ok = true; rows.forEach(r => r.segs.forEach(s => { if (s.edit) { any = true; const key = s.rep ? 'rep' : 'u'; if (s[key] !== s.target) ok = false; } })); return any ? ok : true; },
      reset() { build(); changed(api); }, destroy() { run.destroy(); },
      async demo() {
        build(); await run.sleep(300);
        const eds = rows.flatMap(r => r.segs).filter(s => s.edit);
        if (!eds.length) {
          for (const s of rows.flatMap(r => r.segs)) { s.rect.setAttribute('opacity', .35); }
          for (const s of rows.flatMap(r => r.segs)) { const ok = await run.tween(260, t => s.rect.setAttribute('opacity', .35 + .65 * t)); if (!ok) return false; sfx(api, 'tick'); }
          changed(api); return true;
        }
        for (const s of eds) { const key = s.rep ? 'rep' : 'u'; while (s[key] !== s.target) { s[key] += s[key] < s.target ? 1 : -1; layout(); sfx(api, 'tick'); if (!(await run.sleep(230))) return false; } }
        solved = true; sfx(api, 'good'); const s0 = eds[0]; burst(svg, s0.x + s0.w, rows[0].y + rh / 2, api); changed(api); return true;
      }
    };
  } });

  /* ================================================================ array: a rectangle of cells cut by a draggable line (split a factor) */
  make('array', { mount(host, p, api) {
    const cols = p.cols || 12, rowsN = p.rows || 7, goal = p.cut, inter = p.mode !== 'show', run = runner(api);
    let svg, W, H, cut, cells, line, hdl, t1, t2, tt, solved, cs, gx, gy;
    function build() {
      run.cancel(); solved = false; cut = p.start == null ? cols : p.start;
      ({ svg, W, H } = fit(host));
      svg.setAttribute('aria-label', `${cols} 乘 ${rowsN} 的格子`);
      cs = Math.min(40, (W - 60) / cols, (H - 165) / rowsN); gx = (W - cs * cols) / 2; gy = Math.max(30, (H - cs * rowsN - 130) / 2);
      cells = [];
      for (let r = 0; r < rowsN; r++) for (let c = 0; c < cols; c++) cells.push({ c, e: el('rect', { x: gx + c * cs + 1.5, y: gy + r * cs + 1.5, width: cs - 3, height: cs - 3, rx: 5 }, svg) });
      txt(svg, gx - 4, gy + cs * rowsN / 2, rowsN, { size: 22, fill: C.muted, anchor: 'end' });
      line = el('line', { y1: gy - 12, y2: gy + cs * rowsN + 12, stroke: C.text, 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-dasharray': '2 7' }, svg);
      hdl = el('g', { class: 'r80-handle', role: 'slider', 'aria-label': '切開的位置', 'aria-valuemin': 0, 'aria-valuemax': cols }, svg);
      el('circle', { r: 19, fill: C.gold, stroke: C.goldD, 'stroke-width': 3 }, hdl); el('path', { d: 'M-5-6-9 0-5 6M5-6 9 0 5 6', stroke: '#3b2600', 'stroke-width': 2.8, fill: 'none', 'stroke-linecap': 'round', 'stroke-linejoin': 'round' }, hdl);
      const ty = gy + cs * rowsN + 58;
      t1 = txt(svg, W * .25, ty, '', { size: 24, fill: C.aqua }); t2 = txt(svg, W * .75, ty, '', { size: 24, fill: C.gold }); tt = txt(svg, W / 2, ty + 42, '', { size: 26, fill: C.text });
      if (inter) {
        drag(hdl, svg, { start() { return solved ? false : {}; }, move(pt) { setCut(clamp(Math.round((pt.x - gx) / cs), 0, cols)); }, end() { sfx(api, 'pop'); } });
        keys(hdl, { arrow: d => { if (!solved) setCut(clamp(cut + d, 0, cols)); } });
      } else hdl.style.display = 'none';
      draw();
    }
    function setCut(v) { if (v === cut) return; cut = v; sfx(api, 'tick'); draw(); if (goal != null && cut === goal && !solved) { solved = true; sfx(api, 'good'); burst(svg, gx + cut * cs, gy + cs * rowsN / 2, api); } changed(api); }
    function draw() {
      cells.forEach(k => { const L = k.c < cut; k.e.setAttribute('fill', L ? C.aqua : C.gold); k.e.setAttribute('opacity', cut === cols || cut === 0 ? .9 : .95); });
      const x = gx + cut * cs; line.setAttribute('x1', x); line.setAttribute('x2', x); place(hdl, x, gy + cs * rowsN + 18); hdl.setAttribute('aria-valuenow', cut);
      const a = cut, b = cols - cut;
      t1.textContent = a && b ? `${a}×${rowsN}＝${a * rowsN}` : ''; t2.textContent = a && b ? `${b}×${rowsN}＝${b * rowsN}` : '';
      tt.textContent = a && b ? `${a * rowsN}＋${b * rowsN}＝${cols * rowsN}` : `${cols}×${rowsN}＝${cols * rowsN}`;
      tt.setAttribute('fill', solved ? C.gold : C.text);
    }
    build();
    return {
      check: () => goal == null ? cut !== cols : cut === goal,
      reset() { build(); changed(api); }, destroy() { run.destroy(); },
      async demo() {
        build(); await run.sleep(400); const to = goal == null ? Math.floor(cols / 2) : goal, from = cut;
        const ok = await run.tween(900, t => { const v = Math.round(from + (to - from) * t); if (v !== cut) { cut = v; draw(); } }, easeIO); if (!ok) return false;
        cut = to; draw(); solved = true; sfx(api, 'good'); burst(svg, gx + cut * cs, gy + cs * rowsN / 2, api); changed(api); return true;
      }
    };
  } });

  /* ================================================================ pairing: Gauss - pair the first with the last, every pair has the same sum */
  make('pairing', { mount(host, p, api) {
    const n = p.n || 10, S = n + 1, inter = p.mode !== 'show', run = runner(api);
    let svg, W, H, chips, pairs, sel, eq, ly, cw, x0, arcs;
    function build() {
      run.cancel(); sel = null; pairs = 0;
      ({ svg, W, H } = fit(host)); svg.setAttribute('aria-label', `1 加到 ${n}，頭尾配對`);
      cw = Math.min(46, (W - 24) / n); x0 = (W - cw * n) / 2 + cw / 2; ly = Math.round(H * .62); arcs = el('g', {}, svg); chips = [];
      for (let i = 1; i <= n; i++) {
        const g = el('g', { class: 'r80-chip', role: inter ? 'button' : 'img', 'aria-label': String(i) }, svg), x = x0 + (i - 1) * cw;
        const r = Math.min(20, cw * .45);
        el('circle', { r, cy: 3, fill: 'rgba(0,0,0,.28)' }, g); const c = el('circle', { r, fill: i <= n / 2 ? C.aqua : C.gold, stroke: i <= n / 2 ? C.aquaD : C.goldD, 'stroke-width': 3 }, g);
        txt(g, 0, 1, i, { size: cw < 34 ? 16 : 20, fill: C.ink, weight: 900 }); place(g, x, ly);
        const ch = { i, g, c, x, paired: false }; chips.push(ch);
        if (inter) {
          drag(g, svg, { start() { svg.appendChild(g); g.classList.add('lift'); return {}; }, move(pt) { place(g, pt.x, pt.y, 1.12); }, end(pt) {
            g.classList.remove('lift'); place(g, x, ly);
            const t = chips.find(o => o !== ch && !o.paired && !ch.paired && Math.hypot(pt.x - o.x, pt.y - ly) < cw * .9); if (t) tryPair(ch, t); }, tap() { choose(ch); } });
          keys(g, { act: () => choose(ch) });
        }
      }
      eq = txt(svg, W / 2, 26, '', { size: 28, fill: C.text });
      sync();
    }
    function sync() { chips.forEach(c => { c.c.setAttribute('stroke-width', c === sel ? 5 : 3); c.g.style.opacity = c.paired ? .95 : 1; c.c.setAttribute('stroke', c === sel ? '#fff' : (c.i <= n / 2 ? C.aquaD : C.goldD)); }); }
    function choose(ch) {
      if (ch.paired) return;
      if (!sel) { sel = ch; sfx(api, 'tap'); sync(); return; }
      if (sel === ch) { sel = null; sync(); return; }
      const a = sel; sel = null; tryPair(a, ch);
    }
    function tryPair(a, b) {
      if (a.i + b.i === S) { drawPair(a, b, true); }
      else { sfx(api, 'bad'); [a, b].forEach(c => c.g.animate && !api.reduced && c.g.animate([{ transform: `translate(${c.x - 5}px,${ly}px)` }, { transform: `translate(${c.x + 5}px,${ly}px)` }, { transform: `translate(${c.x}px,${ly}px)` }], { duration: 180 })); const m = txt(svg, W / 2, ly + 62, `${a.i}＋${b.i}＝${a.i + b.i}，不是 ${S}`, { size: 20, fill: C.bad }); setTimeout(() => m.remove(), 1400); sync(); }
    }
    function drawPair(a, b, user) {
      a.paired = b.paired = true; pairs++; sfx(api, 'good'); sync();
      const lo = Math.min(a.x, b.x), hi = Math.max(a.x, b.x), hp = 24 + (hi - lo) / (W - 40) * Math.max(40, ly - 120), g = el('g', {}, arcs);
      const col = [C.violet, C.pink, C.aqua, C.gold, C.green][(pairs - 1) % 5];
      const path = el('path', { d: `M${lo} ${ly - 24}Q${(lo + hi) / 2} ${ly - 24 - hp * 2} ${hi} ${ly - 24}`, fill: 'none', stroke: col, 'stroke-width': 4, 'stroke-linecap': 'round' }, g);
      const t = txt(g, (lo + hi) / 2, ly - 24 - hp - 13, S, { size: 22, fill: col, weight: 900 });
      if (!api.reduced) { const L = path.getTotalLength ? path.getTotalLength() : 200; path.style.strokeDasharray = L; path.style.strokeDashoffset = L; path.getBoundingClientRect(); path.style.transition = 'stroke-dashoffset .35s ease-out'; path.style.strokeDashoffset = 0; t.setAttribute('opacity', 0); setTimeout(() => t.setAttribute('opacity', 1), 260); }
      if (pairs === n / 2) { eq.textContent = `${S} × ${n / 2} ＝ ${S * n / 2}`; eq.setAttribute('fill', C.gold); setTimeout(() => burst(svg, W / 2, ly - 90, api), 200); }
      else eq.textContent = `已配 ${pairs} 對，每對都是 ${S}`;
      if (user) changed(api);
    }
    build();
    return {
      check: () => pairs === n / 2,
      reset() { build(); changed(api); }, destroy() { run.destroy(); },
      async demo() {
        build(); await run.sleep(350);
        for (let i = 1; i <= n / 2; i++) { const a = chips[i - 1], b = chips[n - i]; const ok = await run.tween(260, t => { place(a.g, a.x, ly - 14 * t); place(b.g, b.x, ly - 14 * t); }); if (!ok) return false; place(a.g, a.x, ly); place(b.g, b.x, ly); drawPair(a, b, false); if (!(await run.sleep(i === n / 2 ? 100 : 420))) return false; }
        changed(api); return true;
      }
    };
  } });

  /* ================================================================ rowplace: put trees / people on points along a road (line or circle) */
  make('rowplace', { mount(host, p, api) {
    const segs = p.segments || 4, ends = p.ends || 'both', circle = !!p.circle, span = p.span, unit = p.unit || '米', item = p.item || '🌳', inter = p.mode !== 'show', run = runner(api);
    let svg, W, H, slots, trayItems, msg, ly, cx, cy, R;
    const nSlots = circle ? segs : ends === 'both' ? segs + 1 : ends === 'none' ? segs - 1 : segs;
    function build() {
      run.cancel();
      ({ svg, W, H } = fit(host)); svg.setAttribute('aria-label', circle ? `圍成一圈的路，分成 ${segs} 段` : `一條路，分成 ${segs} 段`);
      slots = []; trayItems = [];
      const pts = [];
      if (circle) { cx = W / 2; R = Math.min(W * .32, H * .26); cy = Math.round(H * .4); el('circle', { cx, cy, r: R, fill: 'none', stroke: C.muted, 'stroke-width': 5, 'stroke-dasharray': '2 0' }, svg); for (let i = 0; i < segs; i++) { const a = -Math.PI / 2 + i / segs * Math.PI * 2; pts.push([cx + Math.cos(a) * R, cy + Math.sin(a) * R]); } if (span) txt(svg, cx, cy, `每段 ${span}${unit}`, { size: 20, fill: C.muted }); }
      else {
        ly = Math.round(H * .42); const x0 = 34, x1 = W - 34, d = (x1 - x0) / segs;
        el('line', { x1: x0 - 10, y1: ly, x2: x1 + 10, y2: ly, stroke: C.muted, 'stroke-width': 6, 'stroke-linecap': 'round' }, svg);
        for (let i = 0; i <= segs; i++) { el('line', { x1: x0 + i * d, y1: ly - 8, x2: x0 + i * d, y2: ly + 8, stroke: C.muted, 'stroke-width': 3 }, svg); if (i < segs) { txt(svg, x0 + i * d + d / 2, ly + 30, span ? `${span}${unit}` : '1 段', { size: 17, fill: C.muted, weight: 700 }); } }
        const first = ends === 'both' || ends === 'one' ? 0 : 1, last = ends === 'both' ? segs : ends === 'one' ? segs - 1 : segs - 1;
        for (let i = first; i <= last; i++) pts.push([x0 + i * d, ly]);
        if (ends !== 'both') { const xe = ends === 'one' ? x1 : null; if (xe) txt(svg, xe, ly - 30, '✕', { size: 22, fill: C.bad }); if (ends === 'none') { txt(svg, x0, ly - 30, '✕', { size: 22, fill: C.bad }); txt(svg, x1, ly - 30, '✕', { size: 22, fill: C.bad }); } }
      }
      pts.forEach((pt, i) => {
        const g = el('g', { class: 'r80-slot', role: inter ? 'button' : 'img', 'aria-label': `第 ${i + 1} 個位置` }, svg);
        el('circle', { r: 21, fill: 'rgba(255,255,255,.08)', stroke: C.gold, 'stroke-width': 2.5, 'stroke-dasharray': '5 5' }, g); place(g, pt[0], pt[1] - (circle ? 0 : 26));
        slots.push({ g, x: pt[0], y: pt[1] - (circle ? 0 : 26), item: null });
        if (inter) { keys(g, { act: () => putNext(i) }); g.addEventListener('click', () => { if (!g.__drag) putNext(i); }); }
      });
      const ty = H - 54, tw = Math.min(50, (W - 40) / nSlots);
      for (let i = 0; i < nSlots; i++) {
        const g = el('g', { class: 'r80-chip', role: inter ? 'button' : 'img', 'aria-label': '放進路上' }, svg), x = W / 2 + (i - (nSlots - 1) / 2) * tw;
        el('circle', { r: Math.max(22, tw * .5), fill: 'rgba(0,0,0,0)' }, g); txt(g, 0, 0, item, { size: Math.min(36, tw * .8), emoji: true }); place(g, x, ty); const t = { g, x, y: ty, used: false, slot: null }; trayItems.push(t);
        if (inter) {
          drag(g, svg, { start() { if (t.used) return false; svg.appendChild(g); g.classList.add('lift'); return {}; }, move(pt) { place(g, pt.x, pt.y, 1.15); }, async end(pt) { g.classList.remove('lift'); let b = null, bd = 40; slots.forEach((s, k) => { if (s.item) return; const d = Math.hypot(pt.x - s.x, pt.y - s.y); if (d < bd) { bd = d; b = k; } }); if (b == null) place(g, t.x, t.y); else await putIn(t, b, 120); }, tap() { putNext(); } });
          keys(g, { act: () => putNext() });
        }
      }
      msg = txt(svg, W / 2, circle ? Math.round(H * .4 + R + 54) : Math.round(H * .62), '', { size: 24, fill: C.text });
      refresh();
    }
    function refresh() { const k = slots.filter(s => s.item).length; if (k < nSlots) msg.textContent = `還有 ${nSlots - k} 個位置`; msg.setAttribute('fill', C.muted); }
    async function putIn(t, k, ms) {
      if (t.used || slots[k].item) return; t.used = true; slots[k].item = t; t.slot = k; const s = slots[k], from = t.g.getAttribute('transform').match(/-?[\d.]+/g).map(Number);
      s.g.querySelector('circle').setAttribute('stroke', C.aqua);
      await run.tween(ms == null ? 260 : ms, u => place(t.g, from[0] + (s.x - from[0]) * u, from[1] + (s.y - from[1]) * u - Math.sin(u * Math.PI) * 16), easeIO);
      place(t.g, s.x, s.y); sfx(api, 'pop'); refresh();
      if (slots.every(z => z.item)) done(); changed(api);
    }
    function putNext(k) { const t = trayItems.find(z => !z.used); if (!t) return; if (k == null || slots[k].item) k = slots.findIndex(z => !z.item); if (k >= 0) putIn(t, k); }
    function done() {
      sfx(api, 'good'); burst(svg, W / 2, circle ? cy : ly - 30, api);
      msg.textContent = circle ? `${segs} 段，${nSlots} 棵：棵數＝段數` : `${segs} 段，${nSlots} 棵：${ends === 'both' ? '棵數＝段數＋1' : ends === 'none' ? '棵數＝段數－1' : '棵數＝段數'}`; msg.setAttribute('fill', C.gold);
    }
    build();
    return {
      check: () => slots.every(s => s.item), reset() { build(); changed(api); }, destroy() { run.destroy(); },
      async demo() { build(); await run.sleep(350); for (let k = 0; k < slots.length; k++) { if (!trayItems[k]) break; svg.appendChild(trayItems[k].g); await putIn(trayItems[k], k, 360); if (!(await run.sleep(120))) return false; } changed(api); return true; }
    };
  } });

  /* ================================================================ dotgraph: people on a circle, link every pair once (handshakes) */
  make('dotgraph', { mount(host, p, api) {
    const n = p.n || 5, total = n * (n - 1) / 2, inter = p.mode !== 'show', run = runner(api), faces = p.faces || ['🧒', '👧', '🧑', '👩', '🧔', '👦', '👴', '👵'];
    let svg, W, H, dots, links, cnt, sel, cx, cy, R, g1, eq;
    function build() {
      run.cancel(); sel = null; links = new Map();
      ({ svg, W, H } = fit(host)); svg.setAttribute('aria-label', `${n} 個人，每兩個人握手一次`);
      R = Math.min(W * .3, H * .27); cx = W / 2; cy = Math.round(H * .46); g1 = el('g', {}, svg); dots = [];
      for (let i = 0; i < n; i++) {
        const a = -Math.PI / 2 + i / n * Math.PI * 2, x = cx + Math.cos(a) * R, y = cy + Math.sin(a) * R;
        const g = el('g', { class: 'r80-chip', role: inter ? 'button' : 'img', 'aria-label': `第 ${i + 1} 個人` }, svg);
        el('circle', { r: 27, cy: 3, fill: 'rgba(0,0,0,.28)' }, g); const c = el('circle', { r: 27, fill: C.card2, stroke: C.aqua, 'stroke-width': 3.5 }, g); txt(g, 0, 1, faces[i % faces.length], { size: 30, emoji: true }); place(g, x, y);
        const d = { i, x, y, g, c }; dots.push(d);
        if (inter) {
          drag(g, svg, { start(pt) { d.c.setAttribute('stroke', C.gold); rub = el('line', { x1: x, y1: y, x2: x, y2: y, stroke: C.gold, 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-dasharray': '2 8', 'pointer-events': 'none' }, svg); return {}; },
            move(pt) { rub.setAttribute('x2', pt.x); rub.setAttribute('y2', pt.y); },
            end(pt, ctx, e, moved) { rub && rub.remove(); rub = null; if (!moved) return; const t = dots.find(o => o !== d && Math.hypot(pt.x - o.x, pt.y - o.y) < 34); sel = null; if (t) link(d, t, true); else sync(); },
            tap() { rub && rub.remove(); rub = null; choose(d); } });
          keys(g, { act: () => choose(d) });
        }
      }
      cnt = txt(svg, W / 2, 30, '', { size: 26, fill: C.text }); eq = txt(svg, W / 2, H - 34, '', { size: 22, fill: C.muted }); sync(); upd();
    }
    let rub = null;
    function choose(d) { if (!sel) { sel = d; sfx(api, 'tap'); sync(); return; } if (sel === d) { sel = null; sync(); return; } const a = sel; sel = null; link(a, d, true); }
    function sync() { dots.forEach(d => { d.c.setAttribute('stroke', d === sel ? C.gold : C.aqua); d.c.setAttribute('stroke-width', d === sel ? 6 : 3.5); }); }
    function link(a, b, user) {
      const k = Math.min(a.i, b.i) + '-' + Math.max(a.i, b.i);
      if (links.has(k)) { sfx(api, 'bad'); sync(); const m = txt(svg, W / 2, H - 66, '這兩個人已經握過手了', { size: 20, fill: C.bad }); setTimeout(() => m.remove(), 1200); return; }
      const l = el('line', { x1: a.x, y1: a.y, x2: b.x, y2: b.y, stroke: [C.violet, C.pink, C.gold, C.aqua, C.green][links.size % 5], 'stroke-width': 4, 'stroke-linecap': 'round', opacity: .9 }, g1); links.set(k, l);
      if (!api.reduced) { const L = Math.hypot(a.x - b.x, a.y - b.y); l.style.strokeDasharray = L; l.style.strokeDashoffset = L; l.getBoundingClientRect(); l.style.transition = 'stroke-dashoffset .25s ease-out'; l.style.strokeDashoffset = 0; }
      sfx(api, 'pop'); sync(); upd(); if (links.size === total) { sfx(api, 'good'); burst(svg, cx, cy, api); } if (user) changed(api);
    }
    function upd() { cnt.textContent = `握手 ${links.size} 次`; cnt.setAttribute('fill', links.size === total ? C.gold : C.text); eq.textContent = links.size === total ? `${n} 人 × ${n - 1} 次 ÷ 2 ＝ ${total} 次` : `共 ${total} 對`; eq.setAttribute('fill', links.size === total ? C.gold : C.muted); if (links.size !== total) eq.textContent = ''; }
    build();
    return {
      check: () => links.size === total, reset() { build(); changed(api); }, destroy() { run.destroy(); },
      async demo() { build(); await run.sleep(350); for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { dots[i].c.setAttribute('stroke', C.gold); if (!(await run.sleep(n > 6 ? 130 : 260))) return false; link(dots[i], dots[j], false); dots[i].c.setAttribute('stroke', C.aqua); } changed(api); return true; }
    };
  } });

  /* ================================================================ cycle: a wheel of n positions (weekdays, remainders, last digits) */
  make('cycle', { mount(host, p, api) {
    const n = p.n || 7, labels = p.labels || Array.from({ length: n }, (_, i) => i + 1), startI = p.start || 0, unit = p.unit || '步', inter = p.mode !== 'show', run = runner(api);
    /* two ways to say the same wheel: moves (p.steps: "走 N 步", the pointer leaves the start) or ordinal (p.nth: "第 N 個", the start counts as the 1st, so N-1 moves).
       p.verb = the verb for moves ("走", "傳"); p.div shows the lesson's division line (N÷n＝q 餘 r) for ordinal wheels */
    const nth = p.nth != null, goal = nth ? p.nth - 1 : p.steps, verb = p.verb || '走', div = !!p.div;
    let svg, W, H, cx, cy, R, cellR, steps, tok, cnt, laps, dots, dragA = null, done;
    const ang = i => -Math.PI / 2 + i / n * Math.PI * 2, posOf = () => (startI + steps) % n;
    function build() {
      run.cancel(); steps = 0; done = false;
      ({ svg, W, H } = fit(host)); svg.setAttribute('aria-label', `${n} 格的轉盤`);
      R = Math.max(46, Math.min(W * .32, (H - (inter ? 150 : 96)) / 2)); cx = W / 2; cy = inter ? Math.round(R + 52) : Math.round(H / 2 + 8); dots = [];
      el('circle', { cx, cy, r: R + 30, fill: 'rgba(255,255,255,.05)', stroke: C.line, 'stroke-width': 2 }, svg);
      cellR = Math.min(26, R * 2 * Math.PI / n / 2.3);
      for (let i = 0; i < n; i++) {
        const x = cx + Math.cos(ang(i)) * R, y = cy + Math.sin(ang(i)) * R, g = el('g', {}, svg);
        const c = el('circle', { cx: x, cy: y, r: cellR, fill: C.card2, stroke: i === startI ? C.aqua : C.line, 'stroke-width': i === startI ? 4 : 2.5 }, g); txt(g, x, y + 1, labels[i % labels.length], { size: labels[i % labels.length].toString().length > 1 ? 16 : 20, fill: C.text }); dots.push({ c, x, y, t: g.lastChild });
      }
      tok = el('g', { class: 'r80-tok', role: 'slider', 'aria-label': '指針', 'aria-valuemin': 0 }, svg);
      /* R3.30: the pointer sits just inside the ring and points out at its cell (it used to sit on the cell and hide the colour / number the child is asked about) */
      el('circle', { r: 28, fill: 'rgba(0,0,0,0)' }, tok); /* >= 44px touch target around the 22px pointer even when the widget is scaled down to fit */
      el('circle', { r: 11, cy: 2, fill: 'rgba(0,0,0,.3)' }, tok); el('circle', { r: 11, fill: C.gold, stroke: C.goldD, 'stroke-width': 3 }, tok); el('path', { d: 'M-5 -3 L5 -3 L0 6 Z', fill: '#3b2600' }, tok);
      cnt = txt(svg, cx, cy - 8, '', { size: 36, fill: C.text, weight: 900 }); laps = txt(svg, cx, 16, '', { size: 18, fill: C.muted, weight: 800 });
      if (inter) {
        drag(tok, svg, { start(pt) { dragA = Math.atan2(pt.y - cy, pt.x - cx); return {}; }, move(pt) {
          const a = Math.atan2(pt.y - cy, pt.x - cx), da = a - dragA; let d = Math.round((((da + Math.PI) % (Math.PI * 2) + Math.PI * 2) % (Math.PI * 2) - Math.PI) / (Math.PI * 2 / n));
          if (d !== 0) { dragA += d * Math.PI * 2 / n; stepBy(d, true); } } , end() { sfx(api, 'pop'); } });
        keys(tok, { arrow: d => stepBy(d > 0 ? 1 : -1) });
        const by = Math.min(H - 30, cy + R + 70);
        sbtn(svg, { x: W / 2 - 108, y: by, w: 104, label: `＋1 ${unit}`, onClick: () => stepBy(1), aria: `前進一${unit}` });
        sbtn(svg, { x: W / 2 + 22, y: by, w: 120, label: `＋${n} 一圈`, onClick: () => stepBy(n), fill: PART.k[0], shade: PART.k[1], ink: C.ink, aria: `前進一整圈（${n} ${unit}）` });
        sbtn(svg, { x: W / 2 + 128, y: by, w: 56, label: '↺', fill: '#fff', shade: '#9aa', ink: C.ink, onClick: () => { build(); changed(api); }, aria: '重來' });
      }
      show(false);
    }
    const lapOf = k => k < n ? `${k} ${unit}` : (k % n ? `${Math.floor(k / n)} 圈又 ${k % n} ${unit}` : `${Math.floor(k / n)} 圈`);
    const stopAt = () => `停在「${labels[posOf() % labels.length]}」`;
    function lapText() {
      if (nth) {
        const k = steps + 1, tail = div ? `${k}÷${n}＝${Math.floor(k / n)} 餘 ${k % n}` : '';
        if (done) return div ? `${tail}，${stopAt()}` : `第 ${k} 個，${stopAt()}`;
        return div ? tail : (goal != null ? `目標：第 ${goal + 1} 個` : '');
      }
      if (done) return `${lapOf(goal)}：${stopAt()}`;
      return steps ? lapOf(steps) : (goal != null ? `目標：${verb} ${goal} ${unit}` : '');
    }
    function show() {
      const i = posOf(), a = ang(i), rr = Math.max(8, R - cellR - 16); tok.setAttribute('transform', `translate(${(cx + Math.cos(a) * rr).toFixed(2)} ${(cy + Math.sin(a) * rr).toFixed(2)}) rotate(${(a * 180 / Math.PI - 90).toFixed(1)})`); tok.setAttribute('aria-valuenow', steps); tok.setAttribute('aria-valuemax', goal == null ? 999 : goal);
      cnt.textContent = nth ? steps + 1 : (steps ? steps : ''); laps.textContent = lapText(); laps.setAttribute('fill', done ? C.gold : C.muted);
      dots.forEach((d, k) => { d.c.setAttribute('fill', k === i ? C.gold : C.card2); d.t.setAttribute('fill', k === i ? '#3b2600' : C.text); d.c.setAttribute('stroke', k === i ? C.goldD : k === startI ? C.aqua : C.line); });
      cnt.setAttribute('fill', done ? C.gold : (goal != null && steps > goal ? C.bad : C.text));
    }
    function stepBy(d, live) {
      if (done) return; const to = Math.max(0, steps + d); if (to === steps) return;
      if (goal != null && to > goal + n) return; steps = to; show(); sfx(api, d >= n ? 'pop' : 'tick');
      if (goal != null && steps === goal) { done = true; show(); sfx(api, 'good'); burst(svg, dots[posOf()].x, dots[posOf()].y, api); }
      changed(api);
    }
    build();
    return {
      check: () => goal == null ? steps > 0 : steps === goal, reset() { build(); changed(api); }, destroy() { run.destroy(); },
      async demo() {
        build(); await run.sleep(350); const g = goal == null ? n + 2 : goal, laps_ = Math.floor(g / n);
        for (let k = 0; k < laps_; k++) { const from = steps, ok = await run.tween(650, t => { steps = from + Math.round(n * t); show(); }, easeIO); if (!ok) return false; steps = from + n; sfx(api, 'pop'); show(); await run.sleep(160); }
        for (let k = 0; k < g % n; k++) { steps++; show(); sfx(api, 'tick'); if (!(await run.sleep(300))) return false; }
        if (goal != null) { done = true; show(); sfx(api, 'good'); burst(svg, dots[posOf()].x, dots[posOf()].y, api); }
        changed(api); return true;
      }
    };
  } });

  /* ================================================================ sortcards: drag cards into the right order */
  make('sortcards', { mount(host, p, api) {
    const cards = p.cards || [], want = p.order || cards.map(c => c.id), inter = p.mode !== 'show', axis = p.axis || '', run = runner(api);
    let svg, W, H, cur, els, cw, ch, y0, st;
    function build() {
      run.cancel(); ({ svg, W, H } = fit(host)); svg.setAttribute('aria-label', '排一排');
      const n = cards.length; cw = Math.min(96, (W - 28) / n - 6); ch = Math.min(190, Math.max(112, H * .42)); y0 = Math.round(H * .4 + 10);
      cur = (p.start || cards.map(c => c.id)).slice(); els = {};
      if (axis) { el('line', { x1: 30, y1: y0 + ch / 2 + 28, x2: W - 40, y2: y0 + ch / 2 + 28, stroke: C.muted, 'stroke-width': 3, 'marker-end': 'url(#r80ah)' }, svg); const d = el('defs', {}, svg); const m = el('marker', { id: 'r80ah', markerWidth: 8, markerHeight: 8, refX: 6, refY: 4, orient: 'auto' }, d); el('path', { d: 'M0 0 8 4 0 8z', fill: C.muted }, m); txt(svg, W / 2, y0 + ch / 2 + 52, axis, { size: 19, fill: C.muted }); }
      cards.forEach(c => {
        const g = el('g', { class: 'r80-chip', role: inter ? 'button' : 'img', 'aria-label': c.label + (inter ? '（左右鍵移動）' : '') }, svg);
        const hmax = Math.max(...cards.map(k => k.h || 0), 1), bh = c.h != null ? Math.max(6, c.h / hmax * (ch - 112)) : 0;
        el('rect', { x: -cw / 2, y: -ch / 2 + 4, width: cw, height: ch, rx: 14, fill: 'rgba(0,0,0,.3)' }, g); el('rect', { x: -cw / 2, y: -ch / 2, width: cw, height: ch, rx: 14, fill: c.color || C.card2, stroke: C.aqua, 'stroke-width': 3 }, g);
        if (c.emoji) txt(g, 0, -ch / 2 + 34, c.emoji, { size: Math.min(44, cw * .6), emoji: true });
        txt(g, 0, ch / 2 - 26, c.label, { size: 20, fill: C.text, weight: 900 });
        if (c.h != null && !c.hide) el('rect', { x: -cw * .22, y: ch / 2 - 50 - bh, width: cw * .44, height: bh, rx: 7, fill: C.gold, opacity: .85 }, g);
        els[c.id] = { g, x: 0 };
        if (inter) {
          let ox = 0;
          drag(g, svg, { start(pt) { st = els[c.id]; svg.appendChild(g); g.classList.add('lift'); ox = pt.x - st.x; return {}; }, move(pt) { st.x = pt.x - ox; place(g, st.x, y0 - 14, 1.06); const k = clamp(Math.round((st.x - slotX(0)) / (cw + 8)), 0, n - 1), at = cur.indexOf(c.id); if (k !== at) { cur.splice(at, 1); cur.splice(k, 0, c.id); layout(c.id); sfx(api, 'tick'); } },
            end() { g.classList.remove('lift'); layout(); sfx(api, 'pop'); judge(); } });
          keys(g, { arrow: d => { const at = cur.indexOf(c.id), k = clamp(at + d, 0, n - 1); if (k !== at) { cur.splice(at, 1); cur.splice(k, 0, c.id); layout(); sfx(api, 'tick'); judge(); g.focus(); } } });
        }
      });
      layout(null, true);
    }
    const slotX = k => W / 2 + (k - (cards.length - 1) / 2) * (cw + 8);
    function layout(skip, instant) { cur.forEach((id, k) => { const e = els[id]; if (id === skip) return; e.x = slotX(k); place(e.g, e.x, y0); e.g.querySelector('rect:nth-of-type(2)').setAttribute('stroke', ok() ? C.gold : C.aqua); }); }
    const ok = () => cur.length === want.length && cur.every((v, i) => v === want[i]);
    let was = false;
    function judge() { const o = ok(); if (o && !was) { sfx(api, 'good'); burst(svg, W / 2, y0, api); layout(); } was = o; changed(api); }
    build();
    return {
      check: () => ok(), reset() { was = false; build(); changed(api); }, destroy() { run.destroy(); },
      async demo() {
        was = false; build(); await run.sleep(400);
        for (let guard = 0; guard < 30 && !ok(); guard++) {
          const k = cur.findIndex((v, i) => v !== want[i]), from = cur.indexOf(want[k]); cur.splice(from, 1); cur.splice(k, 0, want[k]);
          const e = els[want[k]], x1 = slotX(k), x0_ = e.x; svg.appendChild(e.g);
          const good = await run.tween(420, t => { e.x = x0_ + (x1 - x0_) * t; place(e.g, e.x, y0 - 22 * Math.sin(t * Math.PI)); }, easeIO); if (!good) return false;
          layout(); sfx(api, 'pop'); await run.sleep(150);
        }
        judge(); return true;
      }
    };
  } });

  /* ================================================================ swap: assume everything is one animal, swap them one by one and watch the legs (雞兔同籠) */
  make('swap', { mount(host, p, api) {
    const heads = p.heads || 8, legsT = p.legs || 26, A = p.a || { name: '雞', legs: 2, emoji: '🐔' }, B = p.b || { name: '兔', legs: 4, emoji: '🐰' }, inter = p.mode !== 'show', run = runner(api);
    let svg, W, H, an, legsTxt, tbl, diffTxt, hint, solved, perRow, cell, gy;
    const dl = B.legs - A.legs;
    function build() {
      run.cancel(); solved = false; ({ svg, W, H } = fit(host)); svg.setAttribute('aria-label', `${heads} 隻動物，共 ${legsT} 隻腳`);
      perRow = heads <= 6 || H < 330 ? heads : Math.ceil(heads / 2); const rowsN = Math.ceil(heads / perRow); cell = Math.max(34, Math.min(76, (W - 28) / perRow, (H - 18 - 16 - 108 - 34 - 12) / rowsN - 6)); gy = Math.max(26, (H - (18 + rowsN * (cell + 6) + 16 + 108 + 34)) / 2 + 18);
      an = []; txt(svg, W / 2, gy - 14, `${heads} 隻頭 · 共 ${legsT} 隻腳`, { size: 22, fill: C.muted });
      for (let i = 0; i < heads; i++) {
        const r = Math.floor(i / perRow), c = i % perRow, rowLen = r === rowsN - 1 ? heads - r * perRow : perRow, x = W / 2 + (c - (rowLen - 1) / 2) * cell, y = gy + 8 + cell / 2 + r * (cell + 6);
        const g = el('g', { class: 'r80-chip', role: inter ? 'button' : 'img', 'aria-label': `${A.name}（按一下換成${B.name}）` }, svg);
        el('circle', { r: cell * .43, fill: C.card2, stroke: C.aqua, 'stroke-width': 3 }, g); const e = txt(g, 0, 2, A.emoji, { size: cell * .6, emoji: true }); place(g, x, y);
        const a = { g, e, b: false, x, y, ring: g.firstChild }; an.push(a);
        if (inter) {
          drag(g, svg, { start() { svg.appendChild(g); g.classList.add('lift'); return {}; }, move(pt) { place(g, pt.x, pt.y, 1.1); }, end(pt) { g.classList.remove('lift'); place(g, a.x, a.y); if (pt.y > gy + 8 + rowsN * (cell + 6)) setB(a, !a.b, true); }, tap() { setB(a, !a.b, true); } });
          keys(g, { act: () => setB(a, !a.b, true) });
        }
      }
      const ty = gy + 8 + rowsN * (cell + 6) + 8, tw = W - 40;
      el('rect', { x: 20, y: ty, width: tw, height: 108, rx: 16, fill: 'rgba(255,255,255,.06)', stroke: C.line, 'stroke-width': 2 }, svg);
      tbl = { a: txt(svg, 34, ty + 24, '', { size: 21, anchor: 'start', fill: C.aqua }), b: txt(svg, 34, ty + 54, '', { size: 21, anchor: 'start', fill: C.gold }), s: txt(svg, 34, ty + 84, '', { size: 23, anchor: 'start', fill: C.text }) };
      legsTxt = tbl.s; diffTxt = txt(svg, W - 34, ty + 84, '', { size: 21, anchor: 'end', fill: C.pink });
      hint = txt(svg, W / 2, ty + 108 + 16, inter ? `點一隻換成${B.name}，看腳數變化` : '', { size: 19, fill: C.muted });
      for (let i = 0; i < (p.pre || 0) && i < heads; i++) { const z = an[i]; z.b = true; z.e.textContent = B.emoji; z.ring.setAttribute('stroke', C.gold); }
      upd();
      if (p.pre && legsNow() === legsT) { solved = true; hint.textContent = `${B.name} ${nB()} 隻、${A.name} ${heads - nB()} 隻`; hint.setAttribute('fill', C.gold); }
    }
    const nB = () => an.filter(a => a.b).length, legsNow = () => heads * A.legs + nB() * dl;
    function setB(a, v, user) {
      if (solved && user) return; a.b = v; a.e.textContent = v ? B.emoji : A.emoji; a.ring.setAttribute('stroke', v ? C.gold : C.aqua);
      if (!api.reduced) a.g.animate && a.g.animate([{ transform: `translate(${a.x}px,${a.y}px) scale(1.25)` }, { transform: `translate(${a.x}px,${a.y}px) scale(1)` }], { duration: 220, easing: 'ease-out' });
      sfx(api, 'pop'); upd(); if (user) { if (legsNow() === legsT && !solved) { solved = true; sfx(api, 'good'); burst(svg, W / 2, a.y, api); an.forEach(z => { z.g.style.pointerEvents = 'none'; }); hint.textContent = `${B.name} ${nB()} 隻、${A.name} ${heads - nB()} 隻`; hint.setAttribute('fill', C.gold); } changed(api); }
    }
    function upd() {
      const b = nB(), l = legsNow();
      tbl.a.textContent = `${A.name} ${heads - b} 隻 × ${A.legs} 腳 ＝ ${(heads - b) * A.legs}`; tbl.b.textContent = `${B.name} ${b} 隻 × ${B.legs} 腳 ＝ ${b * B.legs}`; tbl.s.textContent = `腳數 ${l}`;
      const d = legsT - l; diffTxt.textContent = d === 0 ? '剛好！' : d > 0 ? `還差 ${d} 腳` : `多了 ${-d} 腳`; diffTxt.setAttribute('fill', d === 0 ? C.gold : d > 0 ? C.pink : C.bad); tbl.s.setAttribute('fill', d === 0 ? C.gold : C.text);
    }
    build();
    return {
      check: () => legsNow() === legsT, reset() { build(); changed(api); }, destroy() { run.destroy(); },
      async demo() {
        build(); await run.sleep(500); const need = (legsT - heads * A.legs) / dl;
        for (let i = 0; i < need; i++) { setB(an[i], true, false); if (!(await run.sleep(560))) return false; }
        if (legsNow() === legsT) { solved = true; sfx(api, 'good'); burst(svg, W / 2, an[0].y, api); hint.textContent = `${B.name} ${nB()} 隻、${A.name} ${heads - nB()} 隻`; hint.setAttribute('fill', C.gold); }
        changed(api); return true;
      }
    };
  } });

  /* ================================================================ banner: a title picture for draft units (no interaction) */
  make('banner', { mount(host, p, api) {
    const { svg, W, H } = fit(host); svg.setAttribute('aria-label', p.title || '');
    txt(svg, W / 2, H * .3, p.icon || '⭐', { size: 96, emoji: true }); txt(svg, W / 2, H * .5, p.title || '', { size: 34, fill: C.text, weight: 900 });
    txt(svg, W / 2, H * .6, p.motto || '', { size: 24, fill: C.gold }); if (p.example) txt(svg, W / 2, H * .7, p.example, { size: 20, fill: C.muted, weight: 700 });
    return { check: () => true, reset() { }, demo: async () => true, destroy() { } };
  } });

  root.WQOlyWidgets = { mount, list, C, PART, fit, el, txt, burst, runner, drag, keys, sbtn, toPt, place, make, version: '1.0' };
})(typeof globalThis !== 'undefined' ? globalThis : this);
