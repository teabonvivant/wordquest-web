// Behaviour checks for the R3.4 game fixes. Lines tagged [B] must PASS on R3.4 and FAIL on the R3.3 baseline
// (r34_tests/run_behaviour.py runs both builds and compares).  Every check is deterministic (seeded bots).
const L = require('./engine_lib.cjs');
const { create } = L, core = L.sandbox.WQCore;
const lines = [];
function check(tag, name, fn) {
  let ok = false, detail = '';
  try { const r = fn(); ok = r === true || (r && r.ok === true); detail = r && r.detail ? r.detail : ''; } catch (e) { detail = 'exception: ' + e.message; }
  const line = `${ok ? 'PASS' : 'FAIL'} ${tag ? '[B] ' : ''}${name}${detail ? ' :: ' + detail : ''}`;
  console.log(line); lines.push(line);
}
const step = (g, secs, each) => { const n = Math.round(secs * 60); for (let i = 0; i < n && !g.done; i++) { if (each) each(i / 60); g.tick(1 / 60); } };
const median = a => { const b = [...a].sort((x, y) => x - y); return b[b.length >> 1]; };

// ---- moon-bells -------------------------------------------------------------------------------------
function moonBot(g, secs, opts = {}) {
  let t = 0;
  for (let i = 0; i < secs * 60 && !g.done; i++) {
    const p = g.p;
    if (opts.away && g.t < 1.2) { g.target = 60; g.keys.clear(); }
    else {
      // aim for the first bell above the bunny that has not been used and is reachable
      const apex = p.vy < 0 ? p.y - p.vy * p.vy / 1520 : p.y; // highest point of the current hop
      const cand = g.bells.filter(b => b.y >= apex + 36 && b.y <= apex + 150).sort((a, b) => a.y - b.y)[0] || g.bells.filter(b => b.y >= apex + 36).sort((a, b) => a.y - b.y)[0];
      g.keys.clear(); g.target = cand ? cand.x : p.x;
    }
    g.tick(1 / 60); t += 1 / 60;
  }
  return t;
}
check(true, 'moon-bells: reaching the top bell ends the run as a climb win', () => {
  const g = create('moon-bells', 1, 7); moonBot(g, 140);
  return { ok: g.done && g.__log.result && g.__log.result.title === '登上月亮' && g.bells[g.bells.length - 1].used, detail: `done=${g.done} title=${g.__log.result && g.__log.result.title}` };
});
check(true, 'moon-bells: steering away from the first bell is rescued once (survives longer)', () => {
  const surv = [];
  for (const seed of [3, 4, 5, 6]) { const g = create('moon-bells', 2, seed); const t = moonBot(g, 30, { away: true }); surv.push(g.done ? t : 30); }
  const m = median(surv); return { ok: m > 4.5, detail: 'median survival ' + m.toFixed(1) + 's' };
});

// ---- drift-path ----------------------------------------------------------------------------------------
check(true, 'drift-path: first corner leaves at least 3 s before an idle car leaves the road', () => {
  const g = create('drift-path', 1, 9); step(g, 10); return { ok: g.done && g.t > 3, detail: `died at ${g.t.toFixed(2)}s` };
});
check(false, 'drift-path: a perfect bot completes the whole route', () => {
  const g = create('drift-path', 1, 9); let n = 1;
  for (let i = 0; i < 60 * 120 && !g.done; i++) {
    const node = g.nodes[n]; if (node) { const d = core.distance(g.pos, node); if (d < 4) { g.act('action'); n++; } }
    g.tick(1 / 60);
  }
  return { ok: g.done && g.__log.result.title === '路線完成', detail: g.__log.result && g.__log.result.title };
});

// ---- forest-pong --------------------------------------------------------------------------------------
check(true, 'forest-pong: an idle paddle no longer wins at 入門 (at most 1 of 8 seeds)', () => {
  let wins = 0; for (let s = 1; s <= 8; s++) { const g = create('forest-pong', 0, s); step(g, 90); if (g.us >= 5) wins++; } return { ok: wins <= 1, detail: wins + '/8 idle wins' };
});
check(true, 'forest-pong: a paddle that always returns the ball can still finish the match within 150 s (no endless stall)', () => {
  let done = 0; for (let s = 1; s <= 6; s++) { const g = create('forest-pong', 1, s); step(g, 150, () => { g.px = core.clamp(g.ball.x, 152, 648); }); if (g.done) done++; }
  return { ok: done >= 5, detail: done + '/6 matches ended' };
});

// ---- bounce-basket ----------------------------------------------------------------------------------------
check(true, 'bounce-basket: at least 18 of the first 100 charge lengths score at 標準', () => {
  let n = 0;
  for (let k = 1; k <= 100; k++) {
    const g = create('bounce-basket', 1, 1); g.key('action', true); step(g, k / 60); g.key('action', false);
    const before = g.score; for (let i = 0; i < 60 * 6 && g.flying; i++) g.tick(1 / 60); if (g.score > before) n++;
  }
  return { ok: n >= 18, detail: n + ' scoring lengths' };
});
check(true, 'bounce-basket: a tap near the ball (no drag) does not waste a shot', () => {
  const g = create('bounce-basket', 1, 1); g.pointer('down', { x: g.ball.x + 5, y: g.ball.y }); g.pointer('up', { x: g.ball.x + 5, y: g.ball.y }); return { ok: !g.flying && g.shots === 0 };
});
check(false, 'bounce-basket: a real drag still launches the ball', () => {
  const g = create('bounce-basket', 1, 1); g.pointer('down', { x: g.ball.x, y: g.ball.y }); g.pointer('move', { x: g.ball.x - 80, y: g.ball.y + 60 }); g.pointer('up', { x: g.ball.x - 80, y: g.ball.y + 60 }); return { ok: g.flying };
});

// ---- meadow-cricket ---------------------------------------------------------------------------------------
check(true, 'meadow-cricket: a late swing says it was late, an early swing says it was early', () => {
  const a = create('meadow-cricket', 1, 2); step(a, 1.5); a.ball.x = 330; a.act('action'); const early = a.notice;
  const b = create('meadow-cricket', 1, 2); step(b, 1.5); b.ball.x = 150; b.act('action'); const late = b.notice;
  return { ok: /早/.test(early) && /慢/.test(late), detail: early + ' | ' + late };
});

// ---- valley-race ------------------------------------------------------------------------------------------
function raceBot(g, secs) {
  let off = 0, t = 0;
  for (let i = 0; i < secs * 60 && !g.done; i++) {
    const a = g.car; let best = { d: Infinity, i: 0, t: 0 };
    for (let k = 0; k < g.path.length; k++) { const n = core.nearest(a, g.path[k], g.path[(k + 1) % g.path.length]); if (n.d < best.d) best = { ...n, i: k }; }
    const tgt = g.path[(best.i + 6) % g.path.length]; let da = Math.atan2(tgt.y - a.y, tgt.x - a.x) - a.a; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI;
    g.keys.clear(); if (da > 0.05) g.keys.add('right'); else if (da < -0.05) g.keys.add('left');
    if (best.d > [43, 37, 32][g.d]) off += 1 / 60;
    g.tick(1 / 60); t += 1 / 60; if (g.lap >= 3) break;
  }
  return { off, t, lap: g.lap };
}
check(true, 'valley-race: leaving the road slows the car less harshly (about 95 instead of 52 px/s after 2 s on the grass)', () => {
  const g = create('valley-race', 1, 5); const p0 = g.path[0], p1 = g.path[1]; g.car.x = p0.x + 62; g.car.y = p0.y; g.car.a = Math.atan2(p1.y - p0.y, p1.x - p0.x); g.car.v = 120;
  let minV = 1e9; for (let i = 0; i < 100; i++) { g.tick(1 / 60); if (i > 60) minV = Math.min(minV, g.car.v); } return { ok: minV > 80, detail: 'min speed ' + minV.toFixed(0) };
});
check(false, 'valley-race: a sloppy bot still finishes three laps', () => {
  const g = create('valley-race', 1, 5); let ks = null;
  for (let i = 0; i < 60 * 70 && !g.done && g.lap < 3; i++) { const a = g.car; let best = { d: Infinity, i: 0 }; for (let k = 0; k < g.path.length; k++) { const n = core.nearest(a, g.path[k], g.path[(k + 1) % g.path.length]); if (n.d < best.d) best = { ...n, i: k }; }
    if (i % 18 === 0) { const tgt = g.path[(best.i + 3) % g.path.length]; let da = Math.atan2(tgt.y - a.y, tgt.x - a.x) - a.a; while (da > Math.PI) da -= 2 * Math.PI; while (da < -Math.PI) da += 2 * Math.PI; ks = da > .2 ? 'right' : da < -.2 ? 'left' : null; }
    g.keys.clear(); if (ks) g.keys.add(ks); g.tick(1 / 60); }
  return { ok: g.lap >= 3, detail: 'laps ' + g.lap };
});

// ---- forest-band ------------------------------------------------------------------------------------------
check(true, 'forest-band: the ensemble plays from the first second (not in the lobby preview)', () => {
  const g = create('forest-band', 1, 1), p = create('forest-band', 1, 1, { preview: true }); return { ok: g.playing === true && p.playing === false };
});

// ---- star-rhythm ------------------------------------------------------------------------------------------
function rhythmRun(d, lat, sd, seed, opts = {}) {
  const g = create('star-rhythm', d, seed, { latency: opts.startLat || 0 }); let s = seed * 977;
  const rnd = () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296), gauss = () => (rnd() + rnd() + rnd() + rnd() - 2) * 1.7;
  const taps = []; const per = g.period;
  if (!opts.noCount) for (let k = 2; k <= 4; k++) taps.push(k * per + (lat + gauss() * sd) / 1000);
  for (let k = 5; k < 5 + 32; k++) taps.push(k * per + (lat + gauss() * sd) / 1000);
  if (opts.mash) { taps.length = 0; for (let t = 0.3; t < 30; t += 1 / opts.mash) taps.push(t); }
  taps.sort((a, b) => a - b); let ti = 0;
  for (let i = 0; i < 60 * 40 && !g.done; i++) { while (ti < taps.length && taps[ti] <= g.t + 1e-9) { g.act('action'); ti++; } g.tick(1 / 60); }
  return g;
}
check(true, 'star-rhythm: a phone with 150 ms input delay is calibrated from the count-in taps and passes (>=26 of 32 beats)', () => {
  let ok = 0; for (const seed of [1, 2, 3, 4, 5]) { const g = rhythmRun(1, 150, 35, seed); if (g.hits >= 26 && g.index >= 32) ok++; } return { ok: ok >= 4, detail: ok + '/5 runs' };
});
check(false, 'star-rhythm: a player with no extra delay is not harmed by calibration', () => {
  let ok = 0; for (const seed of [1, 2, 3, 4, 5]) { const g = rhythmRun(1, 0, 35, seed); if (g.hits >= 28 && g.index >= 32) ok++; } return { ok: ok >= 4, detail: ok + '/5 runs' };
});
check(true, 'star-rhythm: mashing the button at 6 taps per second no longer passes', () => {
  const g = rhythmRun(1, 0, 0, 3, { mash: 6, noCount: true }); const misses = g.index - g.hits; return { ok: misses >= 3, detail: `hits ${g.hits}/${g.index} beats` };
});
check(true, 'star-rhythm: idle player survives past beat 5 (first three beats are free)', () => {
  const g = create('star-rhythm', 1, 1); for (let i = 0; i < 60 * 30 && g.index - g.hits < 3; i++) g.tick(1 / 60); return { ok: g.t > 5.2, detail: `third miss at ${g.t.toFixed(1)}s` };
});

// ---- honey-delivery ---------------------------------------------------------------------------------------
function honeyRun(d, level, plan) { // plan: [[frame, 'left'|'right'], ...]
  const g = create('honey-delivery', d, 1); g.level = level; g.load();
  for (let i = 0; i < 60 * 9 && !g.done && !g.failed; i++) { for (const [f, k] of plan) if (f === i) g.tool(k); g.tick(1 / 60); }
  return g.done && g.__log.result && !g.failed;
}
check(true, 'honey-delivery: cutting every rope on the first frame no longer wins (at most 3 of 24 level/difficulty combos)', () => {
  let w = 0; for (let d = 0; d < 3; d++) for (let lv = 1; lv <= 8; lv++) if (honeyRun(d, lv, [[0, 'left'], [0, 'right']])) w++; return { ok: w <= 3, detail: w + '/24' };
});
check(false, 'honey-delivery: every level can be won by choosing the cut order and moment (24 of 24 combos)', () => {
  let w = 0, bad = [];
  for (let d = 0; d < 3; d++) for (let lv = 1; lv <= 8; lv++) {
    let ok = false;
    for (const order of [['left', 'right'], ['right', 'left']]) for (let t1 = 0; t1 <= 60 && !ok; t1 += 20) for (let t2 = t1; t2 <= 300 && !ok; t2 += 2) ok = honeyRun(d, lv, [[t1, order[0]], [t2, order[1]]]);
    if (ok) w++; else bad.push(`d${d}L${lv}`);
  }
  return { ok: w === 24, detail: w + '/24 ' + bad.join(' ') };
});
check(true, 'honey-delivery: the cup is not under the candy any more (levels need a swing)', () => {
  let off = 0; for (let d = 0; d < 3; d++) for (let lv = 1; lv <= 8; lv++) { const g = create('honey-delivery', d, 1); g.level = lv; g.load(); if (Math.abs(g.target.x - g.candy.x) >= 100) off++; } return { ok: off === 24, detail: off + '/24 off-axis' };
});

// ---- rolling-block ----------------------------------------------------------------------------------------
check(true, 'rolling-block: later islands need clearly longer solutions than the first three (ramp >= +3 moves) at every difficulty', () => {
  const out = []; let ok = true;
  for (let d = 0; d < 3; d++) {
    const len = lv => { const g = create('rolling-block', d, 1); g.level = lv; g.load(); const s = core.blockSolve(g.board.tiles, g.p, g.board.goal); if (!s) throw Error('unsolvable d' + d + ' L' + lv); return s.length; };
    const early = [1, 2, 3].map(len), late = [8, 9, 10].map(len), m = a => a.reduce((x, y) => x + y, 0) / a.length;
    out.push(`d${d} ${m(early).toFixed(1)}->${m(late).toFixed(1)}`); if (m(late) < m(early) + 3) ok = false;
  }
  return { ok, detail: out.join(' ') };
});
check(false, 'rolling-block: all 30 boards are solvable', () => {
  for (let d = 0; d < 3; d++) for (let lv = 1; lv <= 10; lv++) { const g = create('rolling-block', d, 1); g.level = lv; g.load(); if (!core.blockSolve(g.board.tiles, g.p, g.board.goal)) return false; } return true;
});
check(true, 'rolling-block: swiping the canvas rolls the block', () => {
  const g = create('rolling-block', 1, 1); const before = JSON.stringify(g.p); const dirs = ['right', 'left', 'up', 'down']; let moved = false;
  for (const dir of dirs) { const d = { right: [60, 0], left: [-60, 0], up: [0, -60], down: [0, 60] }[dir]; g.pointer('down', { x: 300, y: 300 }); g.pointer('up', { x: 300 + d[0], y: 300 + d[1] }); if (JSON.stringify(g.p) !== before) { moved = true; break; } }
  return { ok: moved };
});

// ---- juice-lines ------------------------------------------------------------------------------------------
function jlRun(d, level, line, secs = 40) {
  const g = create('juice-lines', d, 1); g.level = level; g.load();
  if (line) { const pts = line(g); g.pointer('down', pts[0]); for (const p of pts.slice(1)) g.pointer('move', p); g.pointer('up', pts[pts.length - 1]); }
  g.tool('pour'); step(g, secs); return g;
}
const ramp = g => { const sg = g.cup.x < g.emitter.x ? 1 : -1, a = { x: g.emitter.x + sg * 35, y: 140 }, b = { x: g.cup.x + sg * 45, y: 420 }, n = 40; return Array.from({ length: n + 1 }, (_, i) => ({ x: a.x + (b.x - a.x) * i / n, y: a.y + (b.y - a.y) * i / n })); };
check(false, 'juice-lines: a straight ramp from the pipe to the cup wins every level at every difficulty (24 of 24)', () => {
  let w = 0, bad = []; for (let d = 0; d < 3; d++) for (let lv = 1; lv <= 8; lv++) { const g = jlRun(d, lv, ramp, 60); if (g.caught >= g.required) w++; else bad.push(`d${d}L${lv}:${g.caught}/${g.required}`); } return { ok: w === 24, detail: w + '/24 ' + bad.join(' ') };
});
check(true, 'juice-lines: water is limited, so pouring with no line stops once the supply is used', () => {
  const g = jlRun(1, 1, null, 40); return { ok: g.pouring === false && g.caught < g.required };
});
check(true, 'juice-lines: levels use eight different cup positions', () => {
  const xs = new Set(); for (let lv = 1; lv <= 8; lv++) { const g = create('juice-lines', 1, 1); g.level = lv; g.load(); xs.add(g.cup.x); } return { ok: xs.size >= 7, detail: xs.size + ' positions' };
});
check(true, 'juice-lines: the water refill button is a free tool (id refill)', () => {
  const g = create('juice-lines', 1, 1); return { ok: g.__log.tools.some(t => t.id === 'refill') && !g.__log.tools.some(t => t.id === 'reset') };
});

// ---- color-workshop ---------------------------------------------------------------------------------------
check(true, 'color-workshop: the white-ball button is free (id whiten) and paint buttons show the English colour', () => {
  const g = create('color-workshop', 1, 1); const t = g.__log.tools; return { ok: t.some(x => x.id === 'whiten') && !t.some(x => x.id === 'reset') && t.some(x => /coral/.test(x.label)) };
});

// ---- little-engineer --------------------------------------------------------------------------------------
check(true, 'little-engineer: a stuck default frame returns to the design view by itself (no endless limbo)', () => {
  const g = create('little-engineer', 1, 1); g.tool('run'); step(g, 40); return { ok: g.running === false && !g.done, detail: `running=${g.running} t=${g.simT.toFixed(1)}` };
});
check(false, 'little-engineer: the preset frame still crosses the hill', () => {
  const g = create('little-engineer', 1, 1); g.tool('preset'); g.tool('run'); step(g, 40); return { ok: g.done && g.__log.result && /越過小丘/.test(g.__log.result.text) };
});
check(true, 'little-engineer: a fast-forward tool exists and makes the run quicker', () => {
  const a = create('little-engineer', 1, 1); a.tool('preset'); a.tool('run'); step(a, 40); const ta = a.t;
  const b = create('little-engineer', 1, 1); b.tool('preset'); b.tool('run'); b.tool('ff'); step(b, 40); return { ok: b.t < ta * 0.6 && b.__log.tools.some(t => t.id === 'ff'), detail: `${ta.toFixed(1)}s vs ${b.t.toFixed(1)}s of real time` };
});

// ---- number-garden ----------------------------------------------------------------------------------------
check(true, 'number-garden: a simple corner strategy reaches the 入門 target in at least 40 of 100 games', () => {
  let win = 0;
  for (let s = 1; s <= 100; s++) {
    const g = create('number-garden', 0, s); let t = 0;
    while (!g.done && t < 3000) { const order = ['left', 'down', 'right', 'up']; let moved = false; for (const k of order) { const m = core.mergeBoard(g.board, k); if (m.changed) { g.act(k); moved = true; break; } } if (!moved) break; t++; }
    if (g.won) win++;
  }
  return { ok: win >= 40, detail: win + '/100' };
});
check(true, 'number-garden: reaching 64 shows the doubling sum', () => {
  const g = create('number-garden', 0, 1); g.board = [[32, 32, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0], [0, 0, 0, 0]]; g.act('left'); return { ok: /64 = 32 \+ 32/.test(g.notice), detail: g.notice };
});

// ---- color-orbit / block-studio ---------------------------------------------------------------------------
check(true, 'color-orbit: a fast greedy matcher is eventually beaten (dies within 600 s in at least 3 of 5 seeds)', () => {
  let died = 0;
  for (const seed of [1, 2, 3, 4, 5]) {
    const g = create('color-orbit', 1, seed); let acc = 0;
    for (let i = 0; i < 600 * 60 && !g.done; i++) {
      acc += 1 / 60; if (acc >= .45) { acc = 0; const need = (g.drop.side - g.rotation + 6) % 6; // choose the rotation whose stack top has the same colour (or the shortest stack)
        let best = 0, bs = -1e9; for (let r = 0; r < 6; r++) { const s = (g.drop.side - r + 6) % 6, st = g.stacks[s], top = st[st.length - 1], sc = (top === g.drop.color ? 50 : 0) - st.length * 3 - Math.min((r - g.rotation + 6) % 6, (g.rotation - r + 6) % 6); if (sc > bs) { bs = sc; best = r; } }
        if (g.rotation !== best) g.act(((best - g.rotation + 6) % 6) <= 3 ? 'right' : 'left'); }
      g.tick(1 / 60);
    }
    if (g.done) died++;
  }
  return { ok: died >= 3, detail: died + '/5 died' };
});
check(true, 'color-orbit: tapping the left or right half of the canvas rotates the ring', () => {
  const g = create('color-orbit', 1, 1); g.pointer('down', { x: 600, y: 300 }); const a = g.rotation; g.pointer('down', { x: 100, y: 300 }); return { ok: a === 1 && g.rotation === 0 };
});
check(true, 'block-studio: fall speed keeps rising after 30 cleared lines', () => {
  const g = create('block-studio', 1, 1); g.lines = 40; const y0 = g.y; step(g, 0.5); return { ok: g.y - y0 >= 3, detail: 'rows ' + (g.y - y0) };
});

// ---- honeycomb / garden-paths -----------------------------------------------------------------------------
check(true, 'honeycomb-puzzle: at least 98% of deals on a 55%-full board have two placeable pieces', () => {
  let good = 0, n = 0;
  for (let s = 1; s <= 300; s++) { const g = create('honeycomb-puzzle', 1, s); g.occupied.clear(); for (const c of g.cells) if (g.r() < 0.55) g.occupied.set(core.hexKey(c.q, c.r), '#ccc'); g.refill(); let fit = 0;
    for (const p of g.stock) { if (!p) continue; let sh = p.shape, f = false; for (let t = 0; t < 6 && !f; t++) { f = g.cells.some(c => core.hexFit(sh, c.q, c.r, g.valid, g.occupied)); sh = core.hexRotate(sh); } if (f) fit++; } n++; if (fit >= 2) good++; }
  return { ok: good / n >= 0.98, detail: (100 * good / n).toFixed(1) + '%' };
});
check(true, 'garden-paths: challenge level has no spare tile swap; the look-ahead draws without changing the game', () => {
  const g = create('garden-paths', 2, 1); const before = JSON.stringify([...g.placed]) + JSON.stringify(g.path) + g.rot; g.draw(); g.draw(); const after = JSON.stringify([...g.placed]) + JSON.stringify(g.path) + g.rot; return { ok: g.swapped === true && before === after };
});

// ---- s21 / s22 --------------------------------------------------------------------------------------------
check(true, 'sky-rescue: a plane parked in the bottom corner no longer survives 60 s', () => {
  const g = create('sky-rescue', 1, 3); g.key('down', true); g.key('left', true); step(g, 60); return { ok: g.health < 3, detail: 'health ' + g.health };
});
check(true, 'sky-rescue: the first bird is within reach in under 2.5 s', () => {
  const g = create('sky-rescue', 2, 3); let first = null; for (let i = 0; i < 60 * 6 && first === null; i++) { g.tick(1 / 60); const b = g.items.find(o => o.kind === 'bird' && o.x < 330); if (b) first = g.t; } return { ok: first !== null && first < 2.5, detail: 'bird near plane at ' + (first && first.toFixed(1)) };
});
check(true, 'forest-dash: dodging by lane alone no longer finishes the run in most seeds (at most 2 of 6)', () => {
  let fin = 0;
  for (let s = 1; s <= 6; s++) {
    const g = create('forest-dash', 1, s);
    for (let i = 0; i < 60 * 90 && !g.done; i++) {
      const ahead = g.rows.filter(o => o.z > 0.07 && o.z < 0.6 && o.kind !== 'gem'); const bad = new Set(ahead.map(o => o.lane));
      if (bad.has(g.lane)) { const free = [0, 1, 2].filter(l => !bad.has(l)).sort((a, b) => Math.abs(a - g.lane) - Math.abs(b - g.lane))[0]; if (free !== undefined) g.act(free > g.lane ? 'right' : 'left'); }
      g.tick(1 / 60);
    }
    if (g.distance >= 1500) fin++;
  }
  return { ok: fin <= 2, detail: fin + '/6 finished' };
});
check(true, 'sweet-studio: serving with an empty cup is free and the canvas tubs take taps', () => {
  const g = create('sweet-studio', 1, 1); const h = g.health; g.tool('serve'); const free = g.health === h; g.pointer('down', { x: 77, y: 453 }); return { ok: free && g.cup.length === 1, detail: `health ${h}->${g.health} cup ${g.cup.length}` };
});
check(true, 'cloud-island: a held direction survives a respawn', () => {
  const g = create('cloud-island', 1, 1); step(g, 0.5); g.key('right', true); g.respawn(); return { ok: g.keys.has('right') };
});
check(true, 'ruins-courier: the first obstacle is later than before (idle player first loses a heart after 4.5 s)', () => {
  const g = create('ruins-courier', 1, 1); let hit = null; for (let i = 0; i < 60 * 20 && hit === null; i++) { g.tick(1 / 60); if (g.health < 3) hit = g.t; } return { ok: hit !== null && hit > 4.5, detail: 'first hit ' + (hit && hit.toFixed(1)) };
});
check(true, 'lighthouse-well: the first twelve platforms contain no spikes', () => {
  const g = create('lighthouse-well', 1, 1); step(g, 3); const first = (g.floors || g.platforms || []).filter(f => f.id < 12 && f.kind === 'hazard'); return { ok: (g.floors || g.platforms) !== undefined && first.length === 0, detail: 'platforms ' + (g.floors || g.platforms || []).length };
});

console.log(`${lines.some(l => l.startsWith('FAIL') && !l.includes('[B]')) ? 'FAIL' : 'PASS'} behaviour summary: ${lines.filter(l => l.startsWith('PASS')).length} pass / ${lines.filter(l => l.startsWith('FAIL')).length} fail`);
