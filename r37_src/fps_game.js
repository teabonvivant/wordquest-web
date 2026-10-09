/* 字母獵場 Word Blaster - raycast FPS vocabulary mini game (self-contained, no assets). */
(function () {
  'use strict';
  var FONT = '"PingFang HK","Noto Sans HK","Microsoft JhengHei","WenQuanYi Zen Hei","Noto Sans CJK TC",system-ui,sans-serif';
  var EFONT = '"Arial Rounded MT Bold","Trebuchet MS","Noto Sans",Arial,sans-serif';
  var EMOJI = '"Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif';
  var MW = 16, MH = 16;
  var MAP = [
    '2222222222222222',
    '1000000000000001',
    '1000000000000001',
    '1003300000044001',
    '1003000000004001',
    '1000000220000001',
    '1000000220000001',
    '1000000000000001',
    '1000000000000001',
    '1000220000330001',
    '1000200000030001',
    '1000000000000001',
    '1004400000000001',
    '1004000005500001',
    '1000000000000001',
    '2222222222222222'
  ].map(function (r) { return r.split('').map(Number); });
  var MAPF = new Uint8Array(MW * MH);
  for (var yy = 0; yy < MH; yy++) for (var xx = 0; xx < MW; xx++) MAPF[yy * MW + xx] = MAP[yy][xx];

  var TWO_PI = Math.PI * 2;
  var COLORS = ['#ff5fa2', '#ffae00', '#17c3a8', '#8e6bff', '#2fa8ff'];
  var DARK = '#2b1d4a';
  var DIFF = {
    speed: [0.30, 0.45, 0.60, 0.80, 1.00],
    bugMax: [1, 1, 2, 3, 4],
    bugSpeed: [0.35, 0.5, 0.75, 1.0, 1.25],
    bugFirst: [30, 22, 12, 8, 5],
    bugEvery: [30, 22, 14, 10, 7],
    timer: [0, 0, 30, 26, 22]
  };

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function rand(a, b) { return a + Math.random() * (b - a); }
  function normAng(a) { a = a % TWO_PI; if (a > Math.PI) a -= TWO_PI; if (a < -Math.PI) a += TWO_PI; return a; }
  function hash(x, y) { var h = (x * 374761393 + y * 668265263) | 0; h = (h ^ (h >>> 13)) * 1274126177 | 0; return ((h ^ (h >>> 16)) & 255) / 255; }
  function lev(a, b) {
    a = a.toLowerCase(); b = b.toLowerCase();
    var p = [], i, j;
    for (j = 0; j <= b.length; j++) p[j] = j;
    for (i = 1; i <= a.length; i++) {
      var prev = p[0]; p[0] = i;
      for (j = 1; j <= b.length; j++) {
        var t = p[j];
        p[j] = Math.min(p[j] + 1, p[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1));
        prev = t;
      }
    }
    return p[b.length];
  }
  function shuffle(a) { for (var i = a.length - 1; i > 0; i--) { var j = (Math.random() * (i + 1)) | 0, t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function isFree(x, y, r) {
    var xs = [x - r, x + r], ys = [y - r, y + r];
    for (var i = 0; i < 2; i++) for (var j = 0; j < 2; j++) {
      var cx = xs[i] | 0, cy = ys[j] | 0;
      if (xs[i] < 0 || ys[j] < 0 || cx >= MW || cy >= MH || MAPF[cy * MW + cx]) return false;
    }
    return true;
  }
  /* distance from (ox,oy) along angle to first wall */
  function rayDist(ox, oy, ang, maxD) {
    var rdx = Math.cos(ang), rdy = Math.sin(ang);
    var mx = ox | 0, my = oy | 0;
    var ddx = rdx === 0 ? 1e30 : Math.abs(1 / rdx), ddy = rdy === 0 ? 1e30 : Math.abs(1 / rdy);
    var sx = rdx < 0 ? -1 : 1, sy = rdy < 0 ? -1 : 1;
    var sdx = rdx < 0 ? (ox - mx) * ddx : (mx + 1 - ox) * ddx;
    var sdy = rdy < 0 ? (oy - my) * ddy : (my + 1 - oy) * ddy;
    var d = 0;
    for (var i = 0; i < 48; i++) {
      if (sdx < sdy) { d = sdx; sdx += ddx; mx += sx; } else { d = sdy; sdy += ddy; my += sy; }
      if (mx < 0 || my < 0 || mx >= MW || my >= MH || MAPF[my * MW + mx]) return d;
      if (d > maxD) return maxD;
    }
    return d;
  }

  /* ---------- procedural textures ---------- */
  function pack(r, g, b) { return (255 << 24) | (clamp(b | 0, 0, 255) << 16) | (clamp(g | 0, 0, 255) << 8) | clamp(r | 0, 0, 255); }
  var FOG = [195, 232, 255];
  var TEX = null;
  function buildTextures() {
    if (TEX) return TEX;
    var fns = [
      null,
      function (x, y) { // pink brick
        var row = y >> 4, ox = (row & 1) ? 16 : 0, bx = (x + ox) & 63;
        if ((y & 15) < 2 || (bx & 31) < 2) return [255, 238, 244];
        var id = row * 7 + ((x + ox) >> 5), v = hash(id, 3) * 36 - 18, n = hash(x, y) * 14 - 7;
        var hl = (y & 15) === 2 ? 22 : 0;
        return [250 + v * 0.2 + hl, 130 + v + n + hl, 165 + v * 0.7 + n + hl];
      },
      function (x, y) { // blue tiles with yellow diamonds
        var tx = x & 31, ty = y & 31;
        if (tx < 2 || ty < 2) return [235, 248, 255];
        if (Math.abs(tx - 16) + Math.abs(ty - 16) < 4) return [255, 220, 70];
        var g = ty * 1.6, n = hash(x, y) * 10;
        return [55 + g * 0.5 + n, 160 + g * 0.8 + n, 255];
      },
      function (x, y) { // yellow stripes
        var s = ((x + y) >> 3) & 1, n = hash(x, y) * 10;
        return s ? [255, 214 + n, 60] : [255, 246, 205 - n];
      },
      function (x, y) { // mint dots
        var tx = (x & 31) - 16, ty = (y & 31) - 16, n = hash(x, y) * 8;
        if ((x & 31) < 2 || (y & 31) < 2) return [70, 185, 150];
        if (tx * tx + ty * ty < 42) return [235, 255, 245];
        return [105 + n, 225 + n, 190];
      },
      function (x, y) { // lavender zigzag
        var v = (y + Math.abs((x & 31) - 16)) & 15, n = hash(x, y) * 10;
        return v < 4 ? [225 + n, 212, 255] : [160 + n, 140 + n, 250];
      }
    ];
    TEX = { wall: [], floor: [], ceil: [] };
    var t, lvl, i, x, y, base, arr, k, r, g, b, c;
    for (t = 1; t <= 5; t++) {
      base = [];
      for (x = 0; x < 64; x++) for (y = 0; y < 64; y++) base[x * 64 + y] = fns[t](x, y);
      TEX.wall[t] = [];
      for (var side = 0; side < 2; side++) for (lvl = 0; lvl < 16; lvl++) {
        k = lvl / 15 * 0.62; var dm = side ? 0.8 : 1.0;
        arr = new Uint32Array(4096);
        for (i = 0; i < 4096; i++) {
          c = base[i];
          arr[i] = pack(c[0] * dm * (1 - k) + FOG[0] * k, c[1] * dm * (1 - k) + FOG[1] * k, c[2] * dm * (1 - k) + FOG[2] * k);
        }
        TEX.wall[t][side * 16 + lvl] = arr;
      }
    }
    var fb = [], cb = [];
    for (y = 0; y < 64; y++) for (x = 0; x < 64; x++) {
      var chk = ((x >> 5) + (y >> 5)) & 1, edge = (x & 31) === 0 || (y & 31) === 0, n = hash(x, y) * 10;
      fb[y * 64 + x] = edge ? [255, 250, 235] : chk ? [255, 236 + n * 0.5, 185] : [255, 170 + n, 205];
      var cedge = (x & 15) === 0 || (y & 15) === 0;
      cb[y * 64 + x] = cedge ? [255, 255, 255] : chk ? [175, 225, 255] : [205, 240, 255];
    }
    for (lvl = 0; lvl < 16; lvl++) {
      k = lvl / 15 * 0.72;
      var fa = new Uint32Array(4096), ca = new Uint32Array(4096);
      for (i = 0; i < 4096; i++) {
        c = fb[i]; fa[i] = pack(c[0] * (1 - k) + FOG[0] * k, c[1] * (1 - k) + FOG[1] * k, c[2] * (1 - k) + FOG[2] * k);
        c = cb[i]; ca[i] = pack(c[0] * (1 - k) + FOG[0] * k, c[1] * (1 - k) + FOG[1] * k, c[2] * (1 - k) + FOG[2] * k);
      }
      TEX.floor[lvl] = fa; TEX.ceil[lvl] = ca;
    }
    return TEX;
  }

  /* ---------- CSS ---------- */
  var CSS = '.wq37-root{position:relative;width:100%;height:100%;overflow:hidden;background:#8fd3ff;user-select:none;-webkit-user-select:none;touch-action:none;font-family:' + FONT + ';-webkit-tap-highlight-color:transparent}' +
    '.wq37-root canvas{position:absolute;left:0;top:0;width:100%;height:100%;touch-action:none;display:block}' +
    '.wq37-btn{position:absolute;border:3px solid #2b1d4a;border-radius:50%;background:rgba(255,255,255,.88);color:#2b1d4a;font-weight:800;display:flex;align-items:center;justify-content:center;touch-action:none;cursor:pointer;box-shadow:0 4px 0 rgba(43,29,74,.35);font-family:' + FONT + ';padding:0}' +
    '.wq37-fire{right:18px;bottom:22px;width:92px;height:92px;font-size:44px;background:rgba(255,95,162,.92);display:none}' +
    '.wq37-pause{right:8px;top:8px;width:56px;height:56px;font-size:24px}' +
    '.wq37-joy{position:absolute;left:24px;bottom:30px;width:128px;height:128px;border-radius:50%;background:rgba(255,255,255,.28);border:3px solid rgba(255,255,255,.8);display:none;touch-action:none;pointer-events:none}' +
    '.wq37-knob{position:absolute;left:34px;top:34px;width:60px;height:60px;border-radius:50%;background:rgba(255,255,255,.9);border:3px solid #2b1d4a}' +
    '.wq37-touch .wq37-fire,.wq37-touch .wq37-joy{display:flex}' +
    '.wq37-ov{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(40,60,120,.45);z-index:5;padding:10px;box-sizing:border-box}' +
    '.wq37-card{background:#fffaf0;border:4px solid #2b1d4a;border-radius:24px;padding:16px 18px;max-width:560px;width:100%;max-height:100%;overflow:auto;box-sizing:border-box;text-align:center;color:#2b1d4a;box-shadow:0 8px 0 rgba(43,29,74,.35)}' +
    '.wq37-card h1{margin:0 0 6px;font-size:28px;color:#ff3d8b;text-shadow:2px 2px 0 #ffe36a}' +
    '.wq37-card h2{margin:0 0 8px;font-size:26px}' +
    '.wq37-legend{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:8px 0}' +
    '.wq37-li{flex:1 1 90px;background:#e6f5ff;border:2px solid #2fa8ff;border-radius:14px;padding:6px 4px;font-size:14px;font-weight:700}' +
    '.wq37-ic{font-size:30px;line-height:1.2;font-family:' + EMOJI + ',' + FONT + '}' +
    '.wq37-key{display:inline-block;min-width:24px;padding:2px 6px;margin:1px;border:2px solid #2b1d4a;border-bottom-width:4px;border-radius:7px;background:#fff;font:800 16px ' + EFONT + '}' +
    '.wq37-go{margin-top:10px;font-size:26px;font-weight:800;color:#fff;background:#ff3d8b;border:4px solid #2b1d4a;border-radius:40px;padding:10px 40px;min-height:56px;cursor:pointer;box-shadow:0 5px 0 #2b1d4a;font-family:' + FONT + '}' +
    '.wq37-go.alt{background:#2fa8ff;margin-left:8px}' +
    '.wq37-stars{font-size:46px;letter-spacing:4px;color:#ffc400;text-shadow:0 3px 0 #2b1d4a}' +
    '.wq37-stars i{font-style:normal;color:#d8d2c4;text-shadow:none}' +
    '.wq37-stat{display:flex;gap:8px;justify-content:center;margin:8px 0}.wq37-stat div{flex:1;background:#fff0b8;border:2px solid #ffae00;border-radius:12px;padding:6px 2px;font-weight:800;font-size:20px}.wq37-stat span{display:block;font-size:13px;font-weight:700}';

  var current = null;

  function start(container, opts) {
    opts = opts || {};
    var words = (opts.words || []).filter(function (w) { return w && w.en; });
    if (words.length < 4) throw new Error('WQ37FPS: need at least 4 words');
    var diff = clamp(Math.round(opts.difficulty || 1), 1, 5), di = diff - 1;
    var totalRounds = Math.max(1, opts.rounds | 0 || 10);
    var soundOn = opts.sound !== false;

    var dead = false, state = 'intro', rafId = 0, lastT = 0;
    var styleEl = document.createElement('style'); styleEl.textContent = CSS; styleEl.setAttribute('data-wq37', '1');
    var root = document.createElement('div'); root.className = 'wq37-root';
    var canvas = document.createElement('canvas'); root.appendChild(canvas);
    var ctx = canvas.getContext('2d');
    var rc = document.createElement('canvas'), rctx = rc.getContext('2d');
    var img = null, buf = null, zb = null;
    var cw = 320, ch = 180, dpr = 1, RW = 480, RH = 270, F = 360, PL = 0.66, S = 1;
    container.appendChild(styleEl); container.appendChild(root);

    /* touch UI */
    var fireBtn = document.createElement('button'); fireBtn.className = 'wq37-btn wq37-fire'; fireBtn.setAttribute('aria-label', '開火'); fireBtn.textContent = '🔫';
    var pauseBtn = document.createElement('button'); pauseBtn.className = 'wq37-btn wq37-pause'; pauseBtn.setAttribute('aria-label', '暫停'); pauseBtn.textContent = '⏸';
    var joy = document.createElement('div'); joy.className = 'wq37-joy'; var knob = document.createElement('div'); knob.className = 'wq37-knob'; joy.appendChild(knob);
    fireBtn.style.fontFamily = pauseBtn.style.fontFamily = EMOJI;
    root.appendChild(joy); root.appendChild(fireBtn); root.appendChild(pauseBtn);
    var ovEl = null;

    /* game state */
    var P = { x: 7.5, y: 12.5, a: -Math.PI / 2 };
    var G = {};
    var keys = {};
    var targets = [], bugs = [], pickups = [], parts = [], floaters = [], trails = [];
    var order = [], cur = null;
    var jx = 0, jy = 0, joyId = null, joyOx = 0, joyOy = 0, lookId = null, lookX = 0;
    var touchMode = false, dragging = false, lockDenied = false, wasLocked = false;
    var shake = 0, flash = 0, flashCol = '255,60,90', hint = null, gunBob = 0, recoil = 0, cool = 0;
    var avgMs = 0, introA = 0, resultShown = false, overT = 0, lastResult = null, finishedCalled = false;
    var ro = null;

    function resetGame() {
      G = { score: 0, correct: 0, wrong: 0, hearts: 3, hpLost: 0, combo: 0, maxCombo: 0, round: 1, playTime: 0, shield: false, triple: 0, slow: 0, invul: 0, bugTimer: DIFF.bugFirst[di], pickTimer: rand(12, 18), roundT: 0, won: false };
      P.x = 7.5; P.y = 12.5; P.a = -Math.PI / 2;
      bugs = []; pickups = []; parts = []; floaters = []; trails = [];
      order = [];
      var pool = [], last = -1;
      while (order.length < totalRounds) {
        if (!pool.length) { pool = shuffle(words.map(function (_, i) { return i; })); if (pool[pool.length - 1] === last) pool.reverse(); }
        last = pool.pop(); order.push(last);
      }
      resultShown = false; finishedCalled = false; lastResult = null; overT = 0; hint = null;
      startRound(true);
    }

    /* ----- spawning ----- */
    function spawnPos(a0, spread, dmin, dmax) {
      for (var i = 0; i < 60; i++) {
        var a = a0 + (spread >= TWO_PI ? rand(0, TWO_PI) : rand(-spread, spread)), d = rand(dmin, dmax);
        var x = P.x + Math.cos(a) * d, y = P.y + Math.sin(a) * d;
        if (isFree(x, y, 0.5) && rayDist(P.x, P.y, a, d + 1) > d + 0.5) return { x: x, y: y };
      }
      for (var k = 0; k < 64; k++) {
        var aa = k / 64 * TWO_PI, dd = 2.5;
        if (rayDist(P.x, P.y, aa, 4) > dd + 0.6) return { x: P.x + Math.cos(aa) * dd, y: P.y + Math.sin(aa) * dd };
      }
      return { x: P.x, y: P.y - 0.1 };
    }
    function makeTarget(w, a0, spread, idx, isCorrect) {
      var p = spawnPos(a0, spread, 3.6, 6.8), ang = rand(0, TWO_PI), sp = DIFF.speed[di];
      return { w: w, x: p.x, y: p.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, ph: rand(0, 6.28), col: idx % COLORS.length, age: 0, correct: isCorrect };
    }
    function pickDistractors(c, n) {
      var cand = words.filter(function (w) { return w.en.toLowerCase() !== c.en.toLowerCase(); });
      if (diff >= 4) cand.sort(function (a, b) { return lev(a.en, c.en) + Math.random() * 0.9 - (lev(b.en, c.en) + Math.random() * 0.9); });
      else shuffle(cand);
      return cand.slice(0, n);
    }
    function startRound(first) {
      var c = words[order[G.round - 1]];
      cur = c;
      var ds = pickDistractors(c, 3), list = shuffle([c].concat(ds));
      targets = [];
      for (var i = 0; i < list.length; i++) {
        var a = P.a + (-0.95 + 1.9 * (i + 0.5) / list.length) * Math.atan(PL) + rand(-0.04, 0.04);
        var t = makeTarget(list[i], a, 0.0001, i, list[i] === c);
        t.age = first ? 1 : 0;
        targets.push(t);
      }
      G.roundT = DIFF.timer[di];
      G.roundMax = DIFF.timer[di];
    }
    function respawnDistractor() {
      var alive = targets.map(function (t) { return t.w; });
      var c = words.filter(function (w) { return w !== cur && alive.indexOf(w) < 0 && w.en.toLowerCase() !== cur.en.toLowerCase(); });
      if (!c.length) return;
      var w = c[(Math.random() * c.length) | 0];
      var used = {}; targets.forEach(function (t) { used[t.col] = 1; });
      var col = 0; while (used[col] && col < 4) col++;
      targets.push(makeTarget(w, P.a, 1.0, col, false));
      targets[targets.length - 1].age = 0;
    }

    /* ----- audio ----- */
    var actx = null, gestured = false;
    function audio() {
      if (!soundOn || dead || !gestured) return null;
      try {
        if (!actx) { var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null; actx = new AC(); }
        if (actx.state === 'suspended') actx.resume().catch(function () {});
        return actx;
      } catch (e) { return null; }
    }
    function tone(f, d, type, vol, slide, delay) {
      try {
        var a = audio(); if (!a) return;
        var t0 = a.currentTime + (delay || 0), o = a.createOscillator(), g = a.createGain();
        o.type = type || 'sine'; o.frequency.setValueAtTime(f, t0);
        if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, slide), t0 + d);
        g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(vol || 0.15, t0 + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
        o.connect(g); g.connect(a.destination); o.start(t0); o.stop(t0 + d + 0.02);
      } catch (e) { /* ignore */ }
    }
    var SFX = {
      shoot: function () { tone(700, 0.14, 'sine', 0.12, 1400); },
      good: function () { tone(523, 0.12, 'triangle', 0.18); tone(659, 0.12, 'triangle', 0.18, 0, 0.09); tone(784, 0.2, 'triangle', 0.18, 0, 0.18); },
      bad: function () { tone(220, 0.3, 'sawtooth', 0.12, 110); },
      pick: function () { tone(880, 0.1, 'square', 0.08); tone(1320, 0.15, 'square', 0.08, 0, 0.08); },
      zap: function () { tone(160, 0.25, 'square', 0.12, 60); },
      bug: function () { tone(400, 0.12, 'square', 0.1, 900); },
      end: function () { tone(392, 0.15, 'triangle', 0.18); tone(523, 0.15, 'triangle', 0.18, 0, 0.15); tone(659, 0.15, 'triangle', 0.18, 0, 0.3); tone(784, 0.35, 'triangle', 0.18, 0, 0.45); }
    };

    /* ----- effects ----- */
    function burst(x, y, z, n, cols, sp) {
      for (var i = 0; i < n; i++) {
        var a = rand(0, TWO_PI), v = rand(0.5, 1.8) * (sp || 1);
        parts.push({ x: x, y: y, z: z, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: rand(0.2, 1.8), life: rand(0.5, 1.0), max: 1, col: cols[(Math.random() * cols.length) | 0], r: rand(3, 7) });
      }
    }
    function floater(text, x, y, col, size) { floaters.push({ text: text, x: x, y: y, t: 0, col: col || '#fff', size: size || 26 }); }
    function loseHeart(reason) {
      if (G.shield) { G.shield = false; floater('護盾!', cw / 2, ch * 0.45, '#7fe3ff', 34); tone(500, 0.2, 'sine', 0.12, 250); return false; }
      G.hearts--; G.hpLost++; G.combo = 0; shake = 0.45; flash = 0.4; flashCol = '255,60,90';
      if (G.hearts <= 0) finish(false);
      return true;
    }

    /* ----- firing ----- */
    function targetAngle(o) { return Math.atan2(o.y - P.y, o.x - P.x); }
    function rayHit(ang) {
      var best = null, bestScore = 1e9, list = [], i;
      for (i = 0; i < targets.length; i++) list.push([targets[i], 'target', 0.55]);
      for (i = 0; i < bugs.length; i++) list.push([bugs[i], 'bug', 0.4]);
      for (i = 0; i < pickups.length; i++) list.push([pickups[i], 'pick', 0.4]);
      for (i = 0; i < list.length; i++) {
        var o = list[i][0];
        if (o.age !== undefined && o.age < 0) continue;
        var dx = o.x - P.x, dy = o.y - P.y, d = Math.sqrt(dx * dx + dy * dy);
        if (d < 0.1) continue;
        var diffA = Math.abs(normAng(Math.atan2(dy, dx) - ang));
        var tol = Math.max(0.105, Math.atan(list[i][2] / d));
        if (diffA > tol) continue;
        if (rayDist(P.x, P.y, Math.atan2(dy, dx), d + 1) < d - 0.4) continue;
        var sc = diffA / tol + d * 0.001;
        if (sc < bestScore) { bestScore = sc; best = { o: o, kind: list[i][1], d: d }; }
      }
      return best;
    }
    function fire(offset) {
      if (state !== 'play') return;
      recoil = 1; SFX.shoot();
      var offs = G.triple > 0 ? [-0.14, 0, 0.14] : [0], hits = [], i;
      for (i = 0; i < offs.length; i++) {
        var ang = P.a + (offset || 0) + offs[i], h = rayHit(ang);
        var endD = h ? h.d : Math.min(rayDist(P.x, P.y, ang, 12), 12);
        trails.push({ x: P.x + Math.cos(ang) * endD, y: P.y + Math.sin(ang) * endD, t: 0 });
        if (h && hits.every(function (q) { return q.o !== h.o; })) hits.push(h);
      }
      var corr = null, wrongs = [];
      hits.forEach(function (h) {
        if (h.kind === 'target') { if (h.o.correct) corr = h; else wrongs.push(h); }
        else if (h.kind === 'bug') hitBug(h.o);
        else collect(h.o);
      });
      if (corr) hitCorrect(corr.o);
      else if (wrongs.length) {
        wrongs.forEach(popWrong);
        G.wrong++; loseHeart('wrong'); SFX.bad();
      }
    }
    function hitCorrect(t) {
      var bonus = G.roundMax ? Math.round(40 * clamp(G.roundT / G.roundMax, 0, 1)) : 0;
      G.combo++; G.maxCombo = Math.max(G.maxCombo, G.combo);
      var pts = 100 + 20 * Math.min(G.combo - 1, 5) + bonus;
      G.score += pts; G.correct++;
      var pr = project(t.x, t.y, 0.55);
      floater('+' + pts, pr ? pr.x : cw / 2, pr ? pr.y : ch / 2, '#ffe36a', 34);
      burst(t.x, t.y, 0.55, 34, ['#ffe36a', '#ff5fa2', '#7fe3ff', '#ffffff', '#8e6bff'], 1.3);
      targets.forEach(function (o) { if (o !== t) burst(o.x, o.y, 0.55, 8, [COLORS[o.col], '#fff'], 0.8); });
      SFX.good(); flash = 0.25; flashCol = '255,235,120';
      if (G.combo >= 3) floater('連擊 x' + G.combo + '!', cw / 2, ch * 0.34, '#ff9ad0', 34);
      if (G.round >= totalRounds) { targets = []; finish(true); return; }
      G.round++; startRound(false);
    }
    function popWrong(h) {
      var t = h.o, i = targets.indexOf(t);
      if (i >= 0) targets.splice(i, 1);
      burst(t.x, t.y, 0.55, 16, [COLORS[t.col], '#fff'], 1);
      hint = { text: '「' + t.w.en + '」＝ ' + (t.w.zh || ''), t: 2.2 };
      G.respawn = (G.respawn || []);
      G.respawn.push(2.2);
    }
    function hitBug(b) {
      var i = bugs.indexOf(b); if (i >= 0) bugs.splice(i, 1);
      G.score += 50; burst(b.x, b.y, 0.3, 20, ['#9be564', '#ffe36a', '#fff'], 1.1); SFX.bug();
      var pr = project(b.x, b.y, 0.3); floater('+50', pr ? pr.x : cw / 2, pr ? pr.y : ch / 2, '#b6f26b', 28);
    }
    function collect(p) {
      var i = pickups.indexOf(p); if (i >= 0) pickups.splice(i, 1);
      var msg = '';
      if (p.type === 'slow') { G.slow = 7; msg = '慢動作!'; }
      else if (p.type === 'triple') { G.triple = 12; msg = '三連發!'; }
      else if (p.type === 'shield') { G.shield = true; msg = '護盾!'; }
      else { G.hearts = Math.min(3, G.hearts + 1); msg = '+1 心'; }
      burst(p.x, p.y, 0.5, 20, ['#fff', '#ffe36a', '#7fe3ff'], 1);
      floater(msg, cw / 2, ch * 0.4, '#fff', 36); SFX.pick();
    }

    /* ----- projection ----- */
    function project(wx, wy, z) {
      var dx = wx - P.x, dy = wy - P.y, c = Math.cos(P.a), s = Math.sin(P.a);
      var depth = dx * c + dy * s, lat = -dx * s + dy * c;
      if (depth < 0.15) return null;
      return { x: (RW / 2 + F * lat / depth) * S, y: (RH / 2 - F * (z - 0.5) / depth) * S, depth: depth, size: F / depth * S };
    }

    /* ----- update ----- */
    function moveEntity(o, dt, r) {
      var nx = o.x + o.vx * dt, ny = o.y + o.vy * dt;
      if (isFree(nx, o.y, r)) o.x = nx; else o.vx = -o.vx;
      if (isFree(o.x, ny, r)) o.y = ny; else o.vy = -o.vy;
    }
    function update(dt) {
      var playing = state === 'play';
      var sf = G.slow > 0 ? 0.45 : 1;
      if (state === 'intro') { P.a += dt * 0.25; }
      if (state === 'paused' || (state === 'over' && false)) return;
      if (playing) {
        G.playTime += dt;
        cool -= dt;
        var turn = ((keys.ArrowRight || keys.KeyE) ? 1 : 0) - ((keys.ArrowLeft || keys.KeyQ) ? 1 : 0);
        P.a += turn * 2.3 * dt;
        var ky = ((keys.KeyW || keys.ArrowUp) ? 1 : 0) - ((keys.KeyS || keys.ArrowDown) ? 1 : 0) - jy;
        var kx = ((keys.KeyD) ? 1 : 0) - ((keys.KeyA) ? 1 : 0) + jx;
        var l = Math.sqrt(kx * kx + ky * ky); if (l > 1) { kx /= l; ky /= l; }
        if (kx || ky) {
          var sp = 2.6 * dt, c = Math.cos(P.a), s = Math.sin(P.a);
          var vx = (c * ky - s * kx) * sp, vy = (s * ky + c * kx) * sp;
          if (isFree(P.x + vx, P.y, 0.25)) P.x += vx;
          if (isFree(P.x, P.y + vy, 0.25)) P.y += vy;
          gunBob += dt * 9;
        }
        G.slow = Math.max(0, G.slow - dt); G.triple = Math.max(0, G.triple - dt); G.invul = Math.max(0, G.invul - dt);
        if (G.roundMax) G.roundT = Math.max(0, G.roundT - dt * sf);
        /* bugs */
        G.bugTimer -= dt;
        if (G.bugTimer <= 0 && bugs.length < DIFF.bugMax[di]) {
          var bp = spawnPos(0, TWO_PI, 5, 9);
          bugs.push({ x: bp.x, y: bp.y, vx: 0, vy: 0, ph: rand(0, 6) });
          G.bugTimer = DIFF.bugEvery[di];
        } else if (G.bugTimer <= 0) G.bugTimer = 3;
        for (var i = bugs.length - 1; i >= 0; i--) {
          var b = bugs[i], dx = P.x - b.x, dy = P.y - b.y, d = Math.sqrt(dx * dx + dy * dy) || 1;
          var bs = DIFF.bugSpeed[di] * sf, wob = Math.sin(G.playTime * 3 + b.ph) * 0.5;
          b.vx = (dx / d + -dy / d * wob) * bs; b.vy = (dy / d + dx / d * wob) * bs;
          var nx = b.x + b.vx * dt, ny = b.y + b.vy * dt;
          if (isFree(nx, b.y, 0.25)) b.x = nx; if (isFree(b.x, ny, 0.25)) b.y = ny;
          if (d < 0.6 && G.invul <= 0) {
            bugs.splice(i, 1); G.invul = 1.5; burst(b.x, b.y, 0.3, 12, ['#ffe36a', '#ff6a6a'], 1); SFX.zap();
            flash = 0.35; flashCol = '255,230,60'; floater('呀! 被電到', cw / 2, ch * 0.42, '#fff', 32);
            loseHeart('bug'); if (state !== 'play') return;
          }
        }
        /* pickups */
        G.pickTimer -= dt;
        if (G.pickTimer <= 0) {
          G.pickTimer = rand(14, 22);
          if (!pickups.length) {
            var types = ['slow', 'triple', 'shield']; if (G.hearts < 3) types.push('heart', 'heart');
            var pp = spawnPos(P.a, 1.2, 3, 6);
            pickups.push({ x: pp.x, y: pp.y, type: types[(Math.random() * types.length) | 0], ph: rand(0, 6), life: 16 });
          }
        }
        for (var k = pickups.length - 1; k >= 0; k--) {
          var pk = pickups[k]; pk.life -= dt;
          var pdx = pk.x - P.x, pdy = pk.y - P.y;
          if (pdx * pdx + pdy * pdy < 0.5) collect(pk); else if (pk.life <= 0) pickups.splice(k, 1);
        }
        /* delayed distractor respawn */
        if (G.respawn) {
          for (var q = G.respawn.length - 1; q >= 0; q--) { G.respawn[q] -= dt; if (G.respawn[q] <= 0) { G.respawn.splice(q, 1); respawnDistractor(); } }
        }
      }
      /* targets drift (also during intro/over) */
      var ts = DIFF.speed[di] * sf;
      for (var m = 0; m < targets.length; m++) {
        var t = targets[m]; t.age += dt;
        if (t.age < 0) continue;
        var a = Math.atan2(t.vy, t.vx) + Math.sin(t.ph + t.age * 0.7) * dt * 0.8;
        t.vx = Math.cos(a) * ts; t.vy = Math.sin(a) * ts;
        var tdx = t.x - P.x, tdy = t.y - P.y, td = Math.sqrt(tdx * tdx + tdy * tdy) || 1;
        if (td < 2.4) { t.vx += tdx / td * 0.8; t.vy += tdy / td * 0.8; }
        if (td > 8) { t.vx -= tdx / td * 0.6; t.vy -= tdy / td * 0.6; }
        for (var n = 0; n < targets.length; n++) {
          if (n === m) continue; var o = targets[n], ox = t.x - o.x, oy = t.y - o.y, od = Math.sqrt(ox * ox + oy * oy);
          if (od < 1.4 && od > 0.001) { t.vx += ox / od * 0.4; t.vy += oy / od * 0.4; }
        }
        moveEntity(t, dt, 0.5);
      }
      /* particles etc. */
      for (var pi = parts.length - 1; pi >= 0; pi--) {
        var p = parts[pi]; p.life -= dt;
        if (p.life <= 0) { parts.splice(pi, 1); continue; }
        p.vz -= 3 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z = Math.max(0, p.z + p.vz * dt);
      }
      for (var fi = floaters.length - 1; fi >= 0; fi--) { floaters[fi].t += dt; if (floaters[fi].t > 1.2) floaters.splice(fi, 1); }
      for (var ti = trails.length - 1; ti >= 0; ti--) { trails[ti].t += dt; if (trails[ti].t > 0.22) trails.splice(ti, 1); }
      shake = Math.max(0, shake - dt); flash = Math.max(0, flash - dt); recoil = Math.max(0, recoil - dt * 6);
      if (hint) { hint.t -= dt; if (hint.t <= 0) hint = null; }
      if (state === 'over') {
        overT -= dt;
        if (overT <= 0 && !resultShown) showResult();
      }
    }

    /* ----- finish ----- */
    function stars() {
      var n = G.correct + G.wrong;
      if (G.won && G.wrong === 0 && G.hpLost === 0) return 5;
      var acc = n ? G.correct / n : 0;
      return acc >= 0.9 ? 4 : acc >= 0.75 ? 3 : acc >= 0.5 ? 2 : 1;
    }
    function finish(win) {
      if (state === 'over') return;
      G.won = win; state = 'over'; overT = 1.1; SFX.end();
      if (document.pointerLockElement) { try { document.exitPointerLock(); } catch (e) { /* */ } }
      keys = {}; jx = jy = 0;
      lastResult = { score: G.score, correct: G.correct, wrong: G.wrong, rounds: G.correct, seconds: Math.round(G.playTime), stars: stars(), maxCombo: G.maxCombo };
      if (win) burst(P.x + Math.cos(P.a) * 3, P.y + Math.sin(P.a) * 3, 0.6, 60, ['#ffe36a', '#ff5fa2', '#7fe3ff', '#fff'], 1.8);
      if (!finishedCalled) {
        finishedCalled = true;
        try { if (opts.onFinish) opts.onFinish(Object.assign({}, lastResult)); } catch (e) { console.error(e); }
      }
    }

    /* ----- DOM overlays ----- */
    function clearOv() { if (ovEl && ovEl.parentNode) ovEl.parentNode.removeChild(ovEl); ovEl = null; }
    function showOv(html, handlers) {
      clearOv();
      ovEl = document.createElement('div'); ovEl.className = 'wq37-ov'; ovEl.innerHTML = '<div class="wq37-card">' + html + '</div>';
      ovEl.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
      root.appendChild(ovEl);
      Object.keys(handlers || {}).forEach(function (k) {
        var el = ovEl.querySelector('[data-act="' + k + '"]');
        if (el) el.addEventListener('click', function (e) { e.stopPropagation(); gestured = true; handlers[k](); });
      });
      var b = ovEl.querySelector('button'); if (b) { try { b.focus({ preventScroll: true }); } catch (e) { /* */ } }
    }
    function showIntro() {
      var k = function (t) { return '<span class="wq37-key">' + t + '</span>'; };
      var kb = '<div class="wq37-li"><div class="wq37-ic">' + k('W') + k('A') + k('S') + k('D') + '</div>移動</div>' +
        '<div class="wq37-li"><div class="wq37-ic">' + k('←') + k('→') + '</div>轉向</div>' +
        '<div class="wq37-li"><div class="wq37-ic">' + k('空白') + '</div>開火 / 點擊</div>';
      var tc = '<div class="wq37-li"><div class="wq37-ic">🕹️</div>移動</div><div class="wq37-li"><div class="wq37-ic">👆</div>轉向</div><div class="wq37-li"><div class="wq37-ic">🔫</div>開火</div>';
      showOv('<h1>字母獵場 Word Blaster</h1><div style="font-size:15px;font-weight:700">射中正確英文字泡泡!</div>' +
        '<div class="wq37-legend">' + (touchMode ? tc : kb) + '<div class="wq37-li"><div class="wq37-ic">❤️❤️❤️</div>3 粒心</div></div>' +
        '<button class="wq37-go" data-act="go">開始</button>', { go: beginPlay });
    }
    function beginPlay() {
      gestured = true; audio(); clearOv(); resetGame(); state = 'play'; tone(660, 0.1, 'triangle', 0.12, 990);
    }
    function showPause() {
      showOv('<h2>已暫停</h2><button class="wq37-go" data-act="res">繼續</button>', { res: function () { resume(); } });
    }
    function showResult() {
      resultShown = true; var r = lastResult, n = r.correct + r.wrong, acc = n ? Math.round(100 * r.correct / n) : 0, st = '';
      for (var i = 1; i <= 5; i++) st += i <= r.stars ? '★' : '<i>★</i>';
      showOv('<h2>' + (G.won ? '好叻!全部完成' : '再接再厲!') + '</h2><div class="wq37-stars">' + st + '</div>' +
        '<div class="wq37-stat"><div><span>分數</span>' + r.score + '</div><div><span>準確度</span>' + acc + '%</div><div><span>最高連擊</span>' + r.maxCombo + '</div></div>' +
        '<button class="wq37-go" data-act="again">再玩一次</button><button class="wq37-go alt" data-act="back">返回</button>',
        { again: function () { beginPlay(); }, back: function () {
          if (!finishedCalled && lastResult) { finishedCalled = true; try { if (opts.onFinish) opts.onFinish(Object.assign({}, lastResult)); } catch (e) { console.error(e); } }
          try { if (opts.onExit) opts.onExit(); } catch (e) { console.error(e); }
        } });
    }
    function pause() {
      if (state !== 'play') return;
      state = 'paused'; keys = {}; jx = jy = 0; joyId = lookId = null; updateKnob(0, 0);
      if (document.pointerLockElement) { try { document.exitPointerLock(); } catch (e) { /* */ } }
      showPause();
    }
    function resume() { if (state !== 'paused') return; clearOv(); state = 'play'; lastT = performance.now(); }

    /* ----- input ----- */
    var GAMEKEYS = { KeyW: 1, KeyA: 1, KeyS: 1, KeyD: 1, KeyQ: 1, KeyE: 1, ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1, Space: 1, ControlLeft: 1, ControlRight: 1 };
    function onKeyDown(e) {
      gestured = true;
      var c = e.code;
      if (state === 'intro' && (c === 'Enter' || c === 'Space')) { e.preventDefault(); beginPlay(); return; }
      if (state === 'over' && resultShown && c === 'Enter') { e.preventDefault(); beginPlay(); return; }
      if (state === 'paused' && (c === 'Enter' || c === 'KeyP' || c === 'Escape')) { e.preventDefault(); resume(); return; }
      if (state !== 'play') return;
      if (c === 'KeyP' || c === 'Escape') { e.preventDefault(); pause(); return; }
      if (GAMEKEYS[c]) {
        e.preventDefault();
        if ((c === 'Space' || c === 'ControlLeft' || c === 'ControlRight') && !e.repeat) { if (cool <= 0) { cool = 0.22; fire(0); } }
        else keys[c] = true;
      }
    }
    function onKeyUp(e) { keys[e.code] = false; }
    function setTouch() { if (!touchMode) { touchMode = true; root.classList.add('wq37-touch'); } }
    function updateKnob(x, y) { knob.style.transform = 'translate(' + x + 'px,' + y + 'px)'; }
    function inRect(el, e) { var r = el.getBoundingClientRect(); return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom; }
    function onFireBtn(e) {
      e.preventDefault(); e.stopPropagation(); gestured = true;
      if (e.pointerType === 'touch') setTouch();
      if (state === 'play' && cool <= 0) { cool = 0.2; fire(0); }
    }
    function onRootDown(e) {
      gestured = true;
      if (e.pointerType === 'touch') setTouch();
      if (state !== 'play') return;
      var rect = root.getBoundingClientRect(), lx = e.clientX - rect.left, ly = e.clientY - rect.top;
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        try { root.setPointerCapture(e.pointerId); } catch (er) { /* */ }
        if (lx < rect.width * 0.5 && joyId === null) {
          joyId = e.pointerId; joyOx = lx; joyOy = ly;
          joy.style.left = clamp(lx - 64, 4, rect.width - 132) + 'px'; joy.style.bottom = 'auto';
          joy.style.top = clamp(ly - 64, 4, rect.height - 132) + 'px'; joyOx = clamp(lx - 64, 4, rect.width - 132) + 64; joyOy = clamp(ly - 64, 4, rect.height - 132) + 64;
          joy.style.display = 'flex';
        } else if (lx >= rect.width * 0.5 && lookId === null) { lookId = e.pointerId; lookX = e.clientX; }
      } else {
        if (e.button !== 0) return;
        dragging = true; lookX = e.clientX;
        if (!document.pointerLockElement && !lockDenied && root.requestPointerLock) {
          try { var pr = root.requestPointerLock(); if (pr && pr.catch) pr.catch(function () { lockDenied = true; }); } catch (er) { lockDenied = true; }
        }
        if (cool <= 0) { cool = 0.2; fire(0); }
      }
    }
    function onMove(e) {
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        if (e.pointerId === joyId) {
          var rect = root.getBoundingClientRect(), dx = e.clientX - rect.left - joyOx, dy = e.clientY - rect.top - joyOy, l = Math.sqrt(dx * dx + dy * dy), m = 56;
          if (l > m) { dx = dx / l * m; dy = dy / l * m; }
          jx = dx / m; jy = -dy / m; if (Math.abs(jx) < 0.12) jx = 0; if (Math.abs(jy) < 0.12) jy = 0;
          updateKnob(dx, dy);
        } else if (e.pointerId === lookId) { P.a += (e.clientX - lookX) * 0.008; lookX = e.clientX; }
      } else if (state === 'play') {
        if (document.pointerLockElement) P.a += (e.movementX || 0) * 0.0028;
        else if (dragging && (e.buttons & 1)) P.a += (e.clientX - lookX) * 0.006;
        lookX = e.clientX;
      }
    }
    function onUp(e) {
      if (e.pointerId === joyId) { joyId = null; jx = jy = 0; updateKnob(0, 0); joy.style.left = '24px'; joy.style.top = 'auto'; joy.style.bottom = '30px'; }
      if (e.pointerId === lookId) lookId = null;
      if (e.pointerType === 'mouse') dragging = false;
    }
    function onLockChange() {
      var locked = !!document.pointerLockElement;
      if (wasLocked && !locked && state === 'play') pause();
      wasLocked = locked;
    }
    function onLockErr() { lockDenied = true; }
    function onVis() { if (document.hidden) pause(); }
    function onCtx(e) { e.preventDefault(); }
    function onPauseBtn(e) { e.preventDefault(); e.stopPropagation(); gestured = true; if (e.pointerType === 'touch') setTouch(); if (state === 'play') pause(); else if (state === 'paused') resume(); }

    window.addEventListener('keydown', onKeyDown, true);
    window.addEventListener('keyup', onKeyUp, true);
    root.addEventListener('pointerdown', onRootDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    root.addEventListener('contextmenu', onCtx);
    document.addEventListener('pointerlockchange', onLockChange);
    document.addEventListener('pointerlockerror', onLockErr);
    document.addEventListener('visibilitychange', onVis);
    fireBtn.addEventListener('pointerdown', onFireBtn);
    pauseBtn.addEventListener('pointerdown', onPauseBtn);
    try { if (window.matchMedia && window.matchMedia('(pointer:coarse)').matches) setTouch(); } catch (e) { /* */ }

    /* ----- layout ----- */
    function layout() {
      cw = container.clientWidth || 320; ch = container.clientHeight || 180;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
      var asp = cw / ch;
      if (asp >= 1) { RH = 270; RW = clamp(Math.round(270 * asp), 300, 560); PL = 0.66; }
      else { RW = 270; RH = Math.min(600, Math.round(270 / asp)); PL = 0.5; }
      RH &= ~1;
      F = RW / (2 * PL); S = cw / RW;
      rc.width = RW; rc.height = RH;
      img = rctx.createImageData(RW, RH); buf = new Uint32Array(img.data.buffer); zb = new Float32Array(RW);
      var fs = clamp(Math.min(cw, ch * 1.3) / 420, 0.8, 1.2);
      fireBtn.style.width = fireBtn.style.height = Math.round(clamp(92 * fs, 72, 110)) + 'px';
    }
    layout();
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(function () { if (!dead) layout(); }); ro.observe(container); }
    var onResize = function () { if (!dead) layout(); };
    window.addEventListener('resize', onResize);

    /* ----- rendering ----- */
    function renderWorld() {
      var tx = buildTextures(), W = RW, H = RH, half = H >> 1;
      var px = P.x, py = P.y, dx = Math.cos(P.a), dy = Math.sin(P.a), plx = -dy * PL, ply = dx * PL;
      var y, x;
      for (y = 0; y < half; y++) {
        var p = half - y - 0.5, rd = 0.5 * F / p;
        var lvl = Math.min(15, (rd / 14 * 15) | 0), ft = tx.floor[lvl], ct = tx.ceil[lvl];
        var stx = rd * 2 * plx / W, sty = rd * 2 * ply / W;
        var fx = px + rd * (dx - plx), fy = py + rd * (dy - ply);
        var o1 = y * W, o2 = (H - 1 - y) * W;
        for (x = 0; x < W; x++) {
          var ix = ((fx * 32) | 0) & 63, iy = ((fy * 32) | 0) & 63, k = (iy << 6) + ix;
          buf[o1 + x] = ct[k]; buf[o2 + x] = ft[k];
          fx += stx; fy += sty;
        }
      }
      for (x = 0; x < W; x++) {
        var cam = 2 * x / W - 1, rdx = dx + plx * cam, rdy = dy + ply * cam;
        var mx = px | 0, my = py | 0;
        var ddx = rdx === 0 ? 1e30 : Math.abs(1 / rdx), ddy = rdy === 0 ? 1e30 : Math.abs(1 / rdy);
        var stepx = rdx < 0 ? -1 : 1, stepy = rdy < 0 ? -1 : 1;
        var sdx = rdx < 0 ? (px - mx) * ddx : (mx + 1 - px) * ddx, sdy = rdy < 0 ? (py - my) * ddy : (my + 1 - py) * ddy;
        var side = 0, type = 1;
        for (var i = 0; i < 48; i++) {
          if (sdx < sdy) { sdx += ddx; mx += stepx; side = 0; } else { sdy += ddy; my += stepy; side = 1; }
          if (mx < 0 || my < 0 || mx >= MW || my >= MH) { type = 2; break; }
          var cell = MAPF[my * MW + mx]; if (cell) { type = cell; break; }
        }
        var perp = side === 0 ? sdx - ddx : sdy - ddy; if (perp < 0.05) perp = 0.05;
        zb[x] = perp;
        var wx = side === 0 ? py + perp * rdy : px + perp * rdx; wx -= Math.floor(wx);
        var texX = (wx * 64) | 0; if ((side === 0 && rdx > 0) || (side === 1 && rdy < 0)) texX = 63 - texX;
        var lh = F / perp, y0 = Math.max(0, (half - lh / 2) | 0), y1 = Math.min(H - 1, (half + lh / 2) | 0);
        var step = 64 / lh, tp = (y0 - half + lh / 2) * step;
        var tex = tx.wall[type][side * 16 + Math.min(15, (perp / 14 * 15) | 0)], base = texX << 6;
        for (y = y0; y <= y1; y++) { buf[y * W + x] = tex[base + (tp & 63)]; tp += step; }
      }
      rctx.putImageData(img, 0, 0);
    }
    function outlineText(t, x, y, size, fill, align, font) {
      ctx.font = '800 ' + size + 'px ' + (font || FONT); ctx.textAlign = align || 'center'; ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, size * 0.24); ctx.strokeStyle = DARK; ctx.strokeText(t, x, y);
      ctx.fillStyle = fill || '#fff'; ctx.fillText(t, x, y);
    }
    function heart(x, y, s, fill) {
      ctx.beginPath(); ctx.moveTo(x, y + s * 0.9);
      ctx.bezierCurveTo(x - s * 1.3, y - s * 0.1, x - s * 0.6, y - s * 1.0, x, y - s * 0.35);
      ctx.bezierCurveTo(x + s * 0.6, y - s * 1.0, x + s * 1.3, y - s * 0.1, x, y + s * 0.9);
      ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = DARK; ctx.stroke();
    }
    function star(x, y, r, fill) {
      ctx.beginPath();
      for (var i = 0; i < 10; i++) { var rr = i & 1 ? r * 0.45 : r, a = -Math.PI / 2 + i * Math.PI / 5; ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
      ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = DARK; ctx.stroke();
    }
    function icon(type, x, y, r) {
      if (type === 'heart') { heart(x, y, r * 0.8, '#ff4d7d'); return; }
      if (type === 'triple') { star(x, y, r, '#ffe36a'); return; }
      if (type === 'shield') {
        ctx.beginPath(); ctx.moveTo(x - r * 0.8, y - r * 0.8); ctx.lineTo(x + r * 0.8, y - r * 0.8); ctx.lineTo(x + r * 0.8, y + r * 0.1);
        ctx.quadraticCurveTo(x + r * 0.7, y + r * 0.8, x, y + r); ctx.quadraticCurveTo(x - r * 0.7, y + r * 0.8, x - r * 0.8, y + r * 0.1); ctx.closePath();
        ctx.fillStyle = '#5bd0ff'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = DARK; ctx.stroke(); return;
      }
      ctx.beginPath(); ctx.arc(x, y, r * 0.85, 0, TWO_PI); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 2; ctx.strokeStyle = DARK; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y - r * 0.55); ctx.lineTo(x, y); ctx.lineTo(x + r * 0.4, y + r * 0.25); ctx.lineWidth = 2.5; ctx.stroke();
    }
    function clipRuns(depth, xa, xb) {
      var a = Math.max(0, xa | 0), b = Math.min(RW - 1, xb | 0), all = true, c;
      if (b < a) return false;
      for (c = a; c <= b; c++) if (zb[c] < depth) { all = false; break; }
      if (all) return true;
      ctx.beginPath(); var runStart = -1, any = false;
      for (c = a; c <= b + 1; c++) {
        var vis = c <= b && zb[c] >= depth;
        if (vis && runStart < 0) runStart = c;
        if (!vis && runStart >= 0) { ctx.rect(runStart * S, 0, (c - runStart) * S, ch); runStart = -1; any = true; }
      }
      if (!any) return false;
      ctx.clip(); return true;
    }
    function drawBubble(t, pr) {
      var sc = t.age < 0 ? 0 : t.age < 0.4 ? (function (u) { var c1 = 1.70158 + 1; return 1 + c1 * Math.pow(u - 1, 3) + 1.70158 * Math.pow(u - 1, 2); })(t.age / 0.4) : 1;
      if (sc <= 0.01) return;
      var r = pr.size * 0.42 * sc, cx = pr.x, cy = pr.y - Math.sin(t.age * 2.2 + t.ph) * 0.1 * pr.size;
      var col = COLORS[t.col];
      ctx.fillStyle = 'rgba(40,40,90,0.16)'; ctx.beginPath(); ctx.ellipse(pr.x, (RH / 2 + F * 0.5 / pr.depth) * S, r * 0.75, r * 0.2, 0, 0, TWO_PI); ctx.fill();
      var g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.25, col); g.addColorStop(1, col);
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, TWO_PI); ctx.globalAlpha = 0.95; ctx.fillStyle = g; ctx.fill(); ctx.globalAlpha = 1;
      ctx.lineWidth = Math.max(2, r * 0.07); ctx.strokeStyle = DARK; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx, cy, r * 0.88, 0, TWO_PI); ctx.lineWidth = Math.max(1.5, r * 0.05); ctx.strokeStyle = 'rgba(255,255,255,.85)'; ctx.stroke();
      ctx.beginPath(); ctx.ellipse(cx - r * 0.42, cy - r * 0.5, r * 0.2, r * 0.11, -0.7, 0, TWO_PI); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fill();
      var txt = t.w.en, fs = clamp(r * 0.62, 14, 46);
      ctx.font = '800 ' + fs + 'px ' + EFONT;
      var tw = ctx.measureText(txt).width, maxW = r * 1.95;
      if (tw > maxW) fs = Math.max(11, fs * maxW / tw);
      outlineText(txt, cx, cy + r * 0.05, fs, '#fff', 'center', EFONT);
    }
    function drawBug(b, pr) {
      var r = pr.size * 0.32, cx = pr.x, cy = pr.y + pr.size * 0.2 - Math.abs(Math.sin(G.playTime * 8 + b.ph)) * r * 0.25;
      ctx.fillStyle = 'rgba(40,40,90,0.18)'; ctx.beginPath(); ctx.ellipse(pr.x, (RH / 2 + F * 0.5 / pr.depth) * S, r * 0.9, r * 0.2, 0, 0, TWO_PI); ctx.fill();
      ctx.strokeStyle = DARK; ctx.lineWidth = Math.max(2, r * 0.1); ctx.lineCap = 'round';
      for (var i = -1; i <= 1; i += 2) {
        ctx.beginPath(); ctx.moveTo(cx + i * r * 0.5, cy - r * 0.8); ctx.lineTo(cx + i * r * 0.8, cy - r * 1.4); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx + i * r * 0.8, cy - r * 1.4, r * 0.14, 0, TWO_PI); ctx.fillStyle = '#ffe36a'; ctx.fill();
        for (var j = 0; j < 3; j++) { ctx.beginPath(); ctx.moveTo(cx + i * r * 0.7, cy + r * (0.1 + j * 0.3)); ctx.lineTo(cx + i * r * 1.2, cy + r * (0.3 + j * 0.3)); ctx.stroke(); }
      }
      var g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.4, r * 0.1, cx, cy, r);
      g.addColorStop(0, '#d9ff9a'); g.addColorStop(1, '#6fcf3d');
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, TWO_PI); ctx.fillStyle = g; ctx.fill(); ctx.stroke();
      for (var e = -1; e <= 1; e += 2) {
        ctx.beginPath(); ctx.arc(cx + e * r * 0.38, cy - r * 0.15, r * 0.3, 0, TWO_PI); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = Math.max(1.5, r * 0.07); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx + e * r * 0.38, cy - r * 0.1, r * 0.13, 0, TWO_PI); ctx.fillStyle = DARK; ctx.fill();
      }
      ctx.beginPath(); ctx.arc(cx, cy + r * 0.3, r * 0.3, 0.15 * Math.PI, 0.85 * Math.PI); ctx.lineWidth = Math.max(1.5, r * 0.08); ctx.stroke();
    }
    function drawPickup(p, pr) {
      var r = pr.size * 0.3, cx = pr.x, cy = pr.y - Math.sin(G.playTime * 3 + p.ph) * 0.08 * pr.size;
      var g = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.7);
      g.addColorStop(0, 'rgba(255,255,160,.9)'); g.addColorStop(1, 'rgba(255,255,160,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r * 1.7, 0, TWO_PI); ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, TWO_PI); ctx.fillStyle = '#fffbe0'; ctx.fill(); ctx.lineWidth = Math.max(2, r * 0.1); ctx.strokeStyle = DARK; ctx.stroke();
      icon(p.type, cx, cy, r * 0.65);
    }
    function drawGun() {
      var g = clamp(Math.min(cw * 0.55, ch * 0.5), 120, 340), x = cw * 0.5 + g * 0.05, y = ch + g * 0.04 + recoil * g * 0.07;
      var bob = Math.sin(gunBob) * g * 0.015; x += Math.cos(gunBob * 0.5) * g * 0.015; y += Math.abs(bob);
      var tipY = y - g * 0.7;
      ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, g * 0.018); ctx.strokeStyle = DARK;
      var grd = ctx.createLinearGradient(x - g * 0.3, 0, x + g * 0.3, 0); grd.addColorStop(0, '#ff9ad0'); grd.addColorStop(0.5, '#ff5fa2'); grd.addColorStop(1, '#d93d84');
      ctx.beginPath(); ctx.moveTo(x - g * 0.32, y); ctx.lineTo(x - g * 0.13, tipY); ctx.lineTo(x + g * 0.13, tipY); ctx.lineTo(x + g * 0.32, y); ctx.closePath(); ctx.fillStyle = grd; ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      for (var i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(x - g * 0.12 + (i % 2) * g * 0.2, y - g * (0.12 + i * 0.13), g * 0.02, 0, TWO_PI); ctx.fill(); }
      ctx.beginPath(); ctx.arc(x + g * 0.24, y - g * 0.3, g * 0.13, 0, TWO_PI); ctx.fillStyle = 'rgba(160,230,255,.95)'; ctx.fill(); ctx.stroke();
      star(x + g * 0.24, y - g * 0.3, g * 0.07, '#ffe36a');
      ctx.beginPath(); ctx.ellipse(x, tipY, g * 0.18, g * 0.07, 0, 0, TWO_PI); ctx.fillStyle = '#ffd23f'; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x, tipY, g * 0.1, g * 0.04, 0, 0, TWO_PI); ctx.fillStyle = '#7a3b8f'; ctx.fill();
      var pul = 0.06 + Math.sin(G.playTime * 6) * 0.008 + recoil * 0.05, gg = ctx.createRadialGradient(x, tipY - g * 0.02, 1, x, tipY - g * 0.02, g * (pul + 0.04));
      gg.addColorStop(0, 'rgba(255,255,255,1)'); gg.addColorStop(0.5, 'rgba(120,230,255,.9)'); gg.addColorStop(1, 'rgba(120,230,255,0)');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x, tipY - g * 0.02, g * (pul + 0.04), 0, TWO_PI); ctx.fill();
      return { x: x, y: tipY };
    }
    function drawTrails(mz) {
      for (var i = 0; i < trails.length; i++) {
        var t = trails[i], u = t.t / 0.22, pr = project(t.x, t.y, 0.5), ex = pr ? pr.x : cw / 2, ey = pr ? pr.y : ch * 0.4;
        var hx = mz.x + (ex - mz.x) * Math.min(1, u * 1.6), hy = mz.y + (ey - mz.y) * Math.min(1, u * 1.6);
        var tx = mz.x + (ex - mz.x) * Math.max(0, u * 1.6 - 0.5), ty = mz.y + (ey - mz.y) * Math.max(0, u * 1.6 - 0.5);
        ctx.globalAlpha = 1 - u; ctx.lineCap = 'round';
        ctx.strokeStyle = '#7fe3ff'; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#4fb8ff'; ctx.lineWidth = 2;
        for (var k = 0; k < 3; k++) { var q = clamp(u * 1.6 - k * 0.1, 0, 1), bx = mz.x + (ex - mz.x) * q, by = mz.y + (ey - mz.y) * q, br = (14 - k * 3) * (1 - q * 0.6); ctx.globalAlpha = (1 - u) * 0.8; ctx.beginPath(); ctx.arc(bx, by, Math.max(2, br), 0, TWO_PI); ctx.stroke(); }
        ctx.globalAlpha = 1;
      }
    }
    function render() {
      renderWorld();
      var sx = 0, sy = 0;
      if (shake > 0) { sx = (Math.random() - 0.5) * 18 * shake / 0.45; sy = (Math.random() - 0.5) * 12 * shake / 0.45; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#bfe8ff'; ctx.fillRect(0, 0, cw, ch);
      ctx.save(); ctx.translate(sx, sy);
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(rc, 0, 0, cw, ch);
      /* sprites */
      var list = [], i, o, pr;
      for (i = 0; i < targets.length; i++) { o = targets[i]; if (o.age < 0) continue; pr = project(o.x, o.y, 0.52); if (pr) list.push({ d: pr.depth, k: 0, o: o, pr: pr, hw: pr.size * 0.5 }); }
      for (i = 0; i < bugs.length; i++) { o = bugs[i]; pr = project(o.x, o.y, 0.3); if (pr) list.push({ d: pr.depth, k: 1, o: o, pr: pr, hw: pr.size * 0.5 }); }
      for (i = 0; i < pickups.length; i++) { o = pickups[i]; pr = project(o.x, o.y, 0.55); if (pr) list.push({ d: pr.depth, k: 2, o: o, pr: pr, hw: pr.size * 0.4 }); }
      for (i = 0; i < parts.length; i++) { o = parts[i]; pr = project(o.x, o.y, 0.1 + o.z); if (pr) list.push({ d: pr.depth, k: 3, o: o, pr: pr, hw: 8 }); }
      list.sort(function (a, b) { return b.d - a.d; });
      for (i = 0; i < list.length; i++) {
        var it = list[i];
        ctx.save();
        if (clipRuns(it.d, (it.pr.x - it.hw) / S, (it.pr.x + it.hw) / S)) {
          if (it.k === 0) drawBubble(it.o, it.pr);
          else if (it.k === 1) drawBug(it.o, it.pr);
          else if (it.k === 2) drawPickup(it.o, it.pr);
          else { ctx.globalAlpha = clamp(it.o.life * 2, 0, 1); ctx.fillStyle = it.o.col; ctx.beginPath(); ctx.arc(it.pr.x, it.pr.y, Math.max(1.5, it.o.r * it.pr.size / 120 * 3), 0, TWO_PI); ctx.fill(); }
        }
        ctx.restore();
      }
      var mz = { x: cw / 2, y: ch * 0.8 };
      if (state === 'play' || state === 'paused' || state === 'over') {
        mz = drawGun();
        drawTrails(mz);
      }
      ctx.restore();
      if (flash > 0) { ctx.fillStyle = 'rgba(' + flashCol + ',' + (flash * 0.8) + ')'; ctx.fillRect(0, 0, cw, ch); }
      drawHud();
    }
    function drawHud() {
      if (!G.hearts && state === 'intro') return;
      var u = clamp(Math.min(cw, ch * 1.15) / 400, 0.85, 1.55), i;
      /* crosshair */
      if (state === 'play') {
        var cx = cw / 2, cy = ch / 2;
        ctx.lineWidth = 3; ctx.strokeStyle = DARK; ctx.beginPath(); ctx.arc(cx, cy, 13 * u, 0, TWO_PI); ctx.stroke();
        ctx.lineWidth = 1.8; ctx.strokeStyle = '#fff'; ctx.stroke();
        ctx.fillStyle = '#ffe36a'; ctx.beginPath(); ctx.arc(cx, cy, 2.5 * u, 0, TWO_PI); ctx.fill();
      }
      if (state === 'intro') return;
      /* hearts + power-ups */
      for (i = 0; i < 3; i++) heart(14 * u + 13 * u + i * 30 * u, 12 * u + 14 * u, 12 * u, i < G.hearts ? '#ff4d7d' : 'rgba(255,255,255,.55)');
      var ix = 14 * u + 3 * 30 * u + 8 * u;
      if (G.shield) { icon('shield', ix + 12 * u, 26 * u, 12 * u); ix += 30 * u; }
      if (G.triple > 0) { icon('triple', ix + 12 * u, 26 * u, 13 * u); ix += 30 * u; }
      if (G.slow > 0) { icon('slow', ix + 12 * u, 26 * u, 13 * u); ix += 30 * u; }
      /* round + score (right aligned left of pause button) */
      var rx = cw - 70;
      outlineText('第 ' + Math.min(G.round, totalRounds) + '/' + totalRounds + ' 題', rx, 18 * u, 16 * u, '#fff', 'right');
      outlineText(G.score + ' 分', rx, 38 * u, 17 * u, '#ffe36a', 'right');
      /* prompt */
      if (cur) {
        var py = 52 * u + 14 * u, ph = 46 * u, emo = cur.emoji || '';
        ctx.font = '800 ' + 26 * u + 'px ' + FONT; var zw = ctx.measureText(cur.zh || '').width;
        ctx.font = (30 * u) + 'px ' + EMOJI; var ew = emo ? ctx.measureText(emo).width + 8 * u : 0;
        var pw = Math.min(cw - 16, zw + ew + 36 * u), px0 = cw / 2 - pw / 2;
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(px0, py, pw, ph, ph / 2) : ctx.rect(px0, py, pw, ph);
        ctx.fillStyle = 'rgba(255,255,255,.94)'; ctx.fill(); ctx.lineWidth = 3.5; ctx.strokeStyle = '#ff5fa2'; ctx.stroke();
        var sx0 = cw / 2 - (zw + ew) / 2;
        if (emo) { ctx.font = (30 * u) + 'px ' + EMOJI; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText(emo, sx0, py + ph / 2 + 2 * u); }
        ctx.font = '800 ' + 26 * u + 'px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = DARK; ctx.fillText(cur.zh || '', sx0 + ew, py + ph / 2 + 1);
        var by = py + ph + 8 * u;
        if (G.roundMax) {
          var bw = Math.min(cw * 0.55, 260 * u), fr = G.roundT / G.roundMax, bx = cw / 2 - bw / 2;
          ctx.fillStyle = 'rgba(43,29,74,.55)'; ctx.fillRect(bx - 2, by - 2, bw + 4, 10 * u + 4);
          ctx.fillStyle = fr > 0.3 ? '#7be37b' : '#ffb347'; ctx.fillRect(bx, by, bw * fr, 10 * u);
          by += 18 * u;
        }
        if (G.combo >= 2) outlineText('連擊 x' + G.combo, cw / 2, by + 10 * u, 18 * u, '#ff9ad0');
      }
      /* offscreen arrow to correct target */
      if (state === 'play') {
        for (i = 0; i < targets.length; i++) {
          var t = targets[i]; if (!t.correct) continue;
          var rel = normAng(targetAngle(t) - P.a);
          if (Math.abs(rel) > Math.atan(PL) * 0.95) {
            var dirR = rel > 0, ax = dirR ? cw - 30 * u : 30 * u, ay = ch * 0.5;
            ctx.beginPath(); ctx.moveTo(ax + (dirR ? 18 : -18) * u, ay); ctx.lineTo(ax - (dirR ? 12 : -12) * u, ay - 20 * u); ctx.lineTo(ax - (dirR ? 12 : -12) * u, ay + 20 * u); ctx.closePath();
            ctx.fillStyle = '#ffe36a'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = DARK; ctx.stroke();
          }
        }
      }
      /* hint + floaters */
      if (hint) outlineText(hint.text, cw / 2, ch * 0.3, Math.min(30 * u, cw / (hint.text.length * 0.75 + 2)), '#fff');
      for (i = 0; i < floaters.length; i++) {
        var f = floaters[i]; ctx.globalAlpha = clamp(1.4 - f.t, 0, 1);
        outlineText(f.text, f.x, f.y - f.t * 50, f.size * Math.min(1.4, u), f.col); ctx.globalAlpha = 1;
      }
    }

    /* ----- main loop ----- */
    function frame(now) {
      if (dead) return;
      rafId = requestAnimationFrame(frame);
      var dt = Math.min(0.05, Math.max(0, (now - (lastT || now)) / 1000)); lastT = now;
      var t0 = performance.now();
      try { update(dt); render(); } catch (e) { console.error(e); }
      avgMs = avgMs * 0.95 + (performance.now() - t0) * 0.05;
    }

    function destroy() {
      if (dead) return; dead = true;
      cancelAnimationFrame(rafId);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('resize', onResize);
      document.removeEventListener('pointerlockchange', onLockChange);
      document.removeEventListener('pointerlockerror', onLockErr);
      document.removeEventListener('visibilitychange', onVis);
      if (ro) { try { ro.disconnect(); } catch (e) { /* */ } }
      try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) { /* */ }
      try { if (actx) { actx.close(); } } catch (e) { /* */ }
      actx = null;
      if (root.parentNode) root.parentNode.removeChild(root);
      if (styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
      if (current === inst) current = null;
    }

    var inst = {
      destroy: destroy, pause: pause, resume: resume,
      _state: function () {
        return {
          round: G.round, hearts: G.hearts, score: G.score, correctWord: cur ? cur.en : null, state: state, combo: G.combo, correct: G.correct, wrong: G.wrong, shield: G.shield,
          player: { x: P.x, y: P.y, a: P.a }, bugs: bugs.length, result: lastResult, resultShown: resultShown, avgRenderMs: avgMs, touch: touchMode,
          targets: targets.map(function (t) { var h = rayHit(targetAngle(t)); return { word: t.w.en, angle: normAng(targetAngle(t) - P.a), dist: Math.hypot(t.x - P.x, t.y - P.y), clear: !!(h && h.o === t) }; })
        };
      },
      _fire: function (off) { fire(off || 0); },
      _turnTo: function (i) { var t = targets[i]; if (t) P.a = targetAngle(t); }
    };
    current = inst;
    resetGame(); showIntro();
    lastT = performance.now(); rafId = requestAnimationFrame(frame);
    return inst;
  }

  var API = { start: start };
  Object.defineProperty(API, '_debug', { get: function () { return current ? current._state() : null; } });
  API._debugFire = function (off) { if (current) current._fire(off || 0); };
  API._debugTurnTo = function (i) { if (current) current._turnTo(i); };
  globalThis.WQ37FPS = API;
})();
