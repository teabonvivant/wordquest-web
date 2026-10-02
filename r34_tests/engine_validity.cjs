// Random-play checkpoint test: every game x difficulty x seed is played with random key mashing and random
// pointer input; every 1.5 simulated seconds the game is captured and verified exactly like the host does.
const L = require('./engine_lib.cjs');
const KEYS = ['left', 'right', 'up', 'down', 'action', 'hold', 'x', 'undo', 'digit1', 'digit2', 'digit3', 'digit4'];
function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
let fail = 0, pass = 0;
const seconds = Number(process.env.SECS || 60);
for (const id of L.IDS) {
  for (const d of [0, 1, 2]) {
    for (const seed of [11, 4242]) {
      const rnd = rng(seed * 31 + d);
      let err = null, ended = false;
      try {
        const g = L.create(id, d, seed);
        const tools = [];
        let t = 0, nextCp = 1.5, held = new Set();
        while (t < seconds && !g.done) {
          if (rnd() < 0.12) { const k = KEYS[Math.floor(rnd() * KEYS.length)]; if (held.has(k)) { held.delete(k); g.key(k, false); } else { held.add(k); g.key(k, true); } }
          if (rnd() < 0.06) { const p = { x: rnd() * 800, y: rnd() * 560 }; g.pointer('down', p); g.pointer('move', { x: p.x + rnd() * 80 - 40, y: p.y + rnd() * 80 - 40 }); g.pointer('up', p); }
          g.tick(1 / 60); g.draw(); t += 1 / 60;
          if (t >= nextCp) { nextCp += 1.5; L.checkpoint(g); }
        }
        L.checkpoint(g); ended = g.done;
      } catch (e) { err = e; }
      if (err) { fail++; console.log(`FAIL validity ${id} d${d} seed${seed}: ${err.message}`); } else pass++;
    }
  }
}
console.log(`${fail ? 'FAIL' : 'PASS'} validity: ${pass} runs ok, ${fail} failed (${L.IDS.length} games x 3 difficulties x 2 seeds, ${seconds}s random play each)`);
process.exit(fail ? 1 : 0);
