/* 星際跑酷 Star Dash - side-view 3-lane runner vocabulary mini game (self-contained, no assets, one canvas). */
(function () {
  'use strict';
  var FONT = '"PingFang HK","Noto Sans HK","Microsoft JhengHei","WenQuanYi Zen Hei","Noto Sans CJK TC",system-ui,sans-serif';
  var EFONT = '"Arial Rounded MT Bold","Trebuchet MS","Noto Sans",Arial,sans-serif';
  var EMOJI = '"Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif';
  var TWO_PI = Math.PI * 2;
  var DARK = '#2b1d4a';
  var DOORC = [['#ff7eb3', '#e0357f'], ['#ffc83d', '#e8890c'], ['#4db8ff', '#2272e0']];
  var GAPSEC = [2.3, 2.0, 1.7, 1.4, 1.2];
  var OBSP = [0.5, 0.55, 0.65, 0.75, 0.85];
  var WARN = 640;
  var FALLBACK = [{ en: 'sun', zh: '太陽', emoji: '☀️' }, { en: 'moon', zh: '月亮', emoji: '🌙' }, { en: 'star', zh: '星星', emoji: '⭐' }];

  var WORLDS = [
    { zh: '草原', sky: ['#5ec3ff', '#b5e8ff', '#effcff'], ground: ['#7bd36f', '#3f9f4d'], track: 'rgba(60,110,40,0.38)', edge: '#fff7c2', tuft: '#2f8f3f', obs: ['🪨', '🐌', '🦔', '🪵'], boss: '🐲', amb: 'petal', ambc: '#ffc6e0' },
    { zh: '森林', sky: ['#1f6a56', '#58b88a', '#c9efb8'], ground: ['#3c8a4f', '#1f5a36'], track: 'rgba(20,50,30,0.42)', edge: '#d8ffb0', tuft: '#16502f', obs: ['🍄', '🪵', '🐗', '🕸️'], boss: '🦖', amb: 'firefly', ambc: '#fff27a' },
    { zh: '沙漠', sky: ['#ff9a4d', '#ffcf80', '#fff0c4'], ground: ['#f4cd7e', '#d9a24a'], track: 'rgba(140,80,20,0.36)', edge: '#fffbe0', tuft: '#b97d2a', obs: ['🌵', '🪨', '🦂', '🏺'], boss: '🦂', amb: 'dust', ambc: '#fff3cf' },
    { zh: '火山', sky: ['#2a1238', '#8a2f48', '#ff8a3d'], ground: ['#3a2430', '#1c0f1c'], track: 'rgba(0,0,0,0.42)', edge: '#ffb066', tuft: '#ff6a2a', obs: ['🪨', '🔥', '🌋', '♨️'], boss: '🐉', amb: 'ember', ambc: '#ff9d3d' },
    { zh: '星空', sky: ['#070722', '#241a5e', '#5a2d96'], ground: ['#2a1f66', '#120c36'], track: 'rgba(120,90,255,0.28)', edge: '#9ff6ff', tuft: '#7f6bff', obs: ['🛸', '☄️', '🪐', '🛰️'], boss: '👾', amb: 'star', ambc: '#ffffff' }
  ];

  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function mulberry(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hsh(i, k) { var h = Math.sin(i * 127.1 + k * 311.7) * 43758.5453; return h - Math.floor(h); }
  function lev(a, b) {
    a = a.toLowerCase(); b = b.toLowerCase();
    var p = [], i, j;
    for (j = 0; j <= b.length; j++) p[j] = j;
    for (i = 1; i <= a.length; i++) {
      var prev = p[0]; p[0] = i;
      for (j = 1; j <= b.length; j++) { var t = p[j]; p[j] = Math.min(p[j] + 1, p[j - 1] + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1)); prev = t; }
    }
    return p[b.length];
  }
  function rr(c, x, y, w, h, r) {
    r = Math.min(r, w / 2, h / 2);
    c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r);
    c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath();
  }
  function circ(c, x, y, r) { c.beginPath(); c.arc(x, y, r, 0, TWO_PI); c.fill(); }
  function tri(c, x1, y1, x2, y2, x3, y3) { c.beginPath(); c.moveTo(x1, y1); c.lineTo(x2, y2); c.lineTo(x3, y3); c.closePath(); c.fill(); }
  function wave(c, L, col, base, amp, wl, off, ph, amp2) {
    c.fillStyle = col; c.beginPath(); c.moveTo(0, base + 600);
    for (var x = 0; x <= L.LW + 16; x += 16) {
      var a = (x + off) / wl * TWO_PI + ph;
      c.lineTo(x, base - amp * (0.5 + 0.5 * Math.sin(a)) - (amp2 || 0) * (0.5 + 0.5 * Math.sin(a * 2.3 + 1.7)));
    }
    c.lineTo(L.LW + 16, base + 600); c.closePath(); c.fill();
  }
  function rep(L, off, period, fn) {
    var i0 = Math.floor((off - 160) / period), i1 = Math.ceil((off + L.LW + 160) / period);
    for (var i = i0; i <= i1; i++) fn(i * period - off, i, hsh(i, 1), hsh(i, 2), hsh(i, 3));
  }
  function glow(c, x, y, r, col, a) {
    var g = c.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, col); g.addColorStop(1, 'rgba(255,255,255,0)');
    c.globalAlpha = a; c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); c.globalAlpha = 1;
  }

  /* ---------- per-world parallax backgrounds (drawn above the horizon) ---------- */
  var BG = [
    function meadow(c, L, d, t) {
      var hor = L.hor;
      glow(c, L.LW * 0.8, hor - 100, 120, 'rgba(255,248,180,1)', 0.8); c.fillStyle = '#fff6b0'; circ(c, L.LW * 0.8, hor - 100, 40);
      c.fillStyle = 'rgba(255,255,255,0.9)';
      rep(L, d * 0.03, 320, function (x, i, a, b) { var y = hor - 140 - b * 60, s = 0.8 + a * 0.6; circ(c, x, y, 22 * s); circ(c, x + 24 * s, y + 6, 18 * s); circ(c, x - 24 * s, y + 8, 16 * s); });
      wave(c, L, '#a7e8aa', hor - 6, 80, 640, d * 0.08, 1, 30);
      wave(c, L, '#72d07e', hor, 52, 380, d * 0.2, 3, 18);
      rep(L, d * 0.42, 190, function (x, i, a, b) {
        if (a < 0.4) return; var h = 54 + b * 44;
        c.fillStyle = '#8a5a3a'; c.fillRect(x - 5, hor - h * 0.5, 10, h * 0.5 + 6);
        c.fillStyle = i % 2 ? '#3fb457' : '#2f9e4a'; circ(c, x, hor - h * 0.62, h * 0.42); circ(c, x - h * 0.3, hor - h * 0.42, h * 0.28); circ(c, x + h * 0.3, hor - h * 0.42, h * 0.28);
      });
    },
    function forest(c, L, d, t) {
      var hor = L.hor;
      c.fillStyle = 'rgba(255,255,220,0.10)';
      for (var k = 0; k < 4; k++) { var rx = ((k * 330 - d * 0.03) % (L.LW + 300) + L.LW + 300) % (L.LW + 300) - 150; c.beginPath(); c.moveTo(rx, 0); c.lineTo(rx + 70, 0); c.lineTo(rx + 20, hor); c.lineTo(rx - 110, hor); c.closePath(); c.fill(); }
      rep(L, d * 0.1, 70, function (x, i, a, b) { var h = 120 + b * 70; c.fillStyle = '#2a8c63'; tri(c, x - 32, hor, x, hor - h, x + 32, hor); });
      rep(L, d * 0.24, 112, function (x, i, a, b) { var h = 100 + b * 60; c.fillStyle = '#17684a'; tri(c, x - 42, hor, x, hor - h, x + 42, hor); tri(c, x - 34, hor - h * 0.4, x, hor - h * 1.12, x + 34, hor - h * 0.4); });
      rep(L, d * 0.48, 250, function (x, i, a, b) {
        c.fillStyle = '#5b3b24'; c.fillRect(x - 14, hor - 150, 28, 162); c.fillStyle = '#3aa86a'; circ(c, x - 20, hor - 8, 26); circ(c, x + 18, hor - 4, 22);
        if (b > 0.5) { c.fillStyle = '#ff6b6b'; circ(c, x + 6, hor - 12, 5); }
      });
    },
    function desert(c, L, d, t) {
      var hor = L.hor;
      glow(c, L.LW * 0.25, hor - 80, 170, 'rgba(255,240,170,1)', 0.8); c.fillStyle = '#fff3b0'; circ(c, L.LW * 0.25, hor - 80, 52);
      wave(c, L, '#f6c777', hor - 10, 60, 720, d * 0.06, 0.5, 20);
      rep(L, d * 0.12, 560, function (x, i, a, b) { if (a < 0.35) return; var w = 90 + b * 60; c.fillStyle = '#d6974a'; tri(c, x - w, hor, x, hor - w * 1.05, x + w, hor); c.fillStyle = '#b87a35'; tri(c, x, hor - w * 1.05, x + w, hor, x + w * 0.25, hor); });
      wave(c, L, '#ebb260', hor, 46, 430, d * 0.2, 2, 14);
      rep(L, d * 0.46, 290, function (x, i, a, b) {
        if (a < 0.3) return; var h = 70 + b * 40; c.fillStyle = '#3d9a58';
        rr(c, x - 7, hor - h, 14, h + 8, 7); c.fill(); rr(c, x - 24, hor - h * 0.7, 12, h * 0.4, 6); c.fill(); rr(c, x - 24, hor - h * 0.45, 22, 10, 5); c.fill();
        rr(c, x + 12, hor - h * 0.85, 12, h * 0.4, 6); c.fill(); rr(c, x + 2, hor - h * 0.55, 22, 10, 5); c.fill();
      });
    },
    function volcano(c, L, d, t) {
      var hor = L.hor, g = c.createLinearGradient(0, hor - 160, 0, hor);
      g.addColorStop(0, 'rgba(255,120,40,0)'); g.addColorStop(1, 'rgba(255,150,60,0.55)'); c.fillStyle = g; c.fillRect(0, hor - 160, L.LW, 160);
      rep(L, d * 0.06, 520, function (x, i, a, b) {
        var h = 130 + b * 50; c.fillStyle = '#3e1c40'; c.beginPath(); c.moveTo(x - 190, hor); c.lineTo(x - 36, hor - h); c.lineTo(x + 36, hor - h); c.lineTo(x + 190, hor); c.closePath(); c.fill();
        c.fillStyle = '#ff6a2a'; c.beginPath(); c.moveTo(x - 36, hor - h); c.lineTo(x + 36, hor - h); c.lineTo(x + 24, hor - h + 12); c.lineTo(x - 24, hor - h + 12); c.closePath(); c.fill();
        glow(c, x, hor - h, 60, 'rgba(255,170,60,1)', 0.7);
        c.fillStyle = 'rgba(120,100,120,0.5)'; for (var s = 0; s < 4; s++) { var ph = ((t * 0.3 + s * 0.25 + a) % 1); circ(c, x + Math.sin(ph * 6 + s) * 14, hor - h - ph * 90, 12 + ph * 20); }
      });
      rep(L, d * 0.22, 130, function (x, i, a, b) { var h = 40 + b * 55; c.fillStyle = '#26112e'; tri(c, x - 50, hor, x - 8, hor - h, x + 50, hor); });
      wave(c, L, '#1c0d22', hor + 2, 26, 280, d * 0.34, 1, 8);
    },
    function space(c, L, d, t) {
      var hor = L.hor;
      rep(L, d * 0.5 * 0.04, 150, function (x, i, a, b) { glow(c, x, b * hor, 160, i % 2 ? 'rgba(255,90,200,1)' : 'rgba(80,200,255,1)', 0.18); });
      [[0.02, 46, 1], [0.05, 70, 1.5], [0.1, 110, 2]].forEach(function (cfg, li) {
        rep(L, d * cfg[0], cfg[1], function (x, i, a, b) { c.globalAlpha = 0.4 + 0.6 * Math.abs(Math.sin(t * 2 + i * 1.7 + li)); c.fillStyle = '#fff'; circ(c, x + a * 30, b * (hor - 6), cfg[2] * (0.6 + a)); }); c.globalAlpha = 1;
      });
      rep(L, d * 0.07, 900, function (x, i, a, b) {
        if (a < 0.45) return; var y = hor - 120 - b * 40, r = 46 + a * 34, g = c.createRadialGradient(x - r * 0.3, y - r * 0.3, 2, x, y, r);
        g.addColorStop(0, i % 2 ? '#ffd27d' : '#9be7ff'); g.addColorStop(1, i % 2 ? '#e0643a' : '#5b6bff'); c.fillStyle = g; circ(c, x, y, r);
        c.strokeStyle = 'rgba(255,255,255,0.55)'; c.lineWidth = 5; c.beginPath(); c.ellipse(x, y, r * 1.6, r * 0.38, -0.35, 0, TWO_PI); c.stroke();
      });
      wave(c, L, '#40318a', hor, 38, 520, d * 0.2, 1, 10);
      rep(L, d * 0.5, 220, function (x, i, a, b) { var h = 36 + b * 50; c.fillStyle = i % 2 ? '#7ff0ff' : '#ff8be6'; tri(c, x - 14, hor + 4, x, hor - h, x + 14, hor + 4); c.fillStyle = 'rgba(255,255,255,0.45)'; tri(c, x - 4, hor + 4, x, hor - h, x + 2, hor + 4); });
    }
  ];

  /* ---------- module state ---------- */
  var current = null;
  var seedOverride = null;
  var API = { start: start };

  function start(container, opts) {
    if (current) { try { current.destroy(); } catch (e) { /* */ } }
    opts = opts || {};
    var doc = document, dead = false, exited = false;
    var words = (opts.words || []).filter(function (w) { return w && w.en && w.zh; });
    for (var fi = 0; words.length < 3 && fi < FALLBACK.length; fi++) words.push(FALLBACK[fi]);
    var worldI = clamp(opts.world | 0, 0, 4), stageI = clamp(opts.stage | 0, 0, 2), diff = clamp(Math.round(opts.difficulty || 2), 1, 5);
    var ch = opts.character || { icon: '🐼', name: '熊貓', perk: '' }, perk = ch.perk || '';
    var icon = ch.icon || '🐼', W = WORLDS[worldI];
    var N = [6, 8, 10][stageI], isBoss = stageI === 2;
    var base = 240 + worldI * 22 + stageI * 18 + diff * 28;
    var startHearts = perk === 'heart' ? 4 : 3, maxHearts = 5;
    var sound = opts.sound !== false;
    var reduced = false;
    try { reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { /* */ }
    var trailCol; (function () { var s = 0; for (var i = 0; i < icon.length; i++) s += icon.charCodeAt(i) * (i + 3); trailCol = 'hsl(' + (s * 37 % 360) + ',95%,66%)'; })();
    var seedBase = seedOverride != null ? seedOverride : (Math.random() * 1e9) | 0;
    seedOverride = null;

    /* ----- DOM ----- */
    var styleEl = doc.createElement('style');
    styleEl.textContent =
      '.wq37r-root{position:relative;width:100%;height:100%;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;font-family:' + FONT + ';background:#222}' +
      '.wq37r-root canvas{display:block;width:100%;height:100%}' +
      '.wq37r-btn{position:absolute;border:3px solid ' + DARK + ';border-radius:50%;background:linear-gradient(#ffe27a,#ffab2e);color:' + DARK + ';font:700 26px/1 ' + FONT + ';display:none;align-items:center;justify-content:center;box-shadow:0 4px 0 ' + DARK + ';touch-action:none;cursor:pointer;padding:0}' +
      '.wq37r-btn:active{transform:translateY(3px);box-shadow:0 1px 0 ' + DARK + '}' +
      '.wq37r-touch .wq37r-ctl{display:flex}' +
      '.wq37r-up,.wq37r-down,.wq37r-dash{width:64px;height:64px;bottom:12px}' +
      '.wq37r-up{right:90px}.wq37r-down{right:14px}.wq37r-dash{left:14px;background:linear-gradient(#a8f0ff,#3db6ff)}' +
      '.wq37r-pause{display:flex;top:8px;right:8px;width:46px;height:46px;font-size:20px;background:linear-gradient(#fff,#e6dcff)}' +
      '.wq37r-ov{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(25,12,60,0.5);z-index:5}' +
      '.wq37r-card{background:#fffaf0;border:4px solid ' + DARK + ';border-radius:26px;box-shadow:0 8px 0 ' + DARK + ';padding:20px 26px;text-align:center;color:' + DARK + ';max-width:86%;min-width:230px}' +
      '.wq37r-big{font-size:84px;line-height:1.1;font-family:' + EMOJI + '}' +
      '.wq37r-t{font-size:26px;font-weight:800;margin:4px 0}.wq37r-s{font-size:15px;opacity:.75;margin:4px 0 12px}' +
      '.wq37r-stars{font-size:40px;letter-spacing:4px;color:#ffb400;text-shadow:0 2px 0 ' + DARK + '}' +
      '.wq37r-row{font-size:18px;margin:4px 0;font-weight:700}' +
      '.wq37r-b{font:800 22px ' + FONT + ';color:#fff;background:linear-gradient(#ff8fb8,#e8407c);border:3px solid ' + DARK + ';border-radius:16px;padding:10px 24px;margin:8px 6px 0;box-shadow:0 4px 0 ' + DARK + ';cursor:pointer;min-height:48px}' +
      '.wq37r-b.alt{background:linear-gradient(#9ae0ff,#3a9bf0)}' +
      '.wq37r-b:active{transform:translateY(3px);box-shadow:0 1px 0 ' + DARK + '}';
    doc.head.appendChild(styleEl);
    var root = doc.createElement('div'); root.className = 'wq37r-root';
    var canvas = doc.createElement('canvas'); root.appendChild(canvas);
    var c = canvas.getContext('2d');
    function mkBtn(cls, txt, label) { var b = doc.createElement('button'); b.type = 'button'; b.className = 'wq37r-btn ' + cls; b.textContent = txt; b.setAttribute('aria-label', label); root.appendChild(b); return b; }
    var upBtn = mkBtn('wq37r-ctl wq37r-up', '▲', '上'), downBtn = mkBtn('wq37r-ctl wq37r-down', '▼', '下'), dashBtn = mkBtn('wq37r-ctl wq37r-dash', '⚡', '衝刺');
    var pauseBtn = mkBtn('wq37r-pause', '⏸', '暫停');
    var overlay = null;
    container.appendChild(root);

    /* ----- game state ----- */
    var state = 'ready', touchMode = false;
    var cw = 320, chh = 180, dpr = 1, S = 1, L = { LW: 960, LH: 600 };
    var rng, trng, dist, scr, lane, vl, hearts, score, combo, maxCombo, correct, wrong, coins, heartsLost, shieldLeft;
    var obstacles, pickups, parts, floaters, toast, gate, genX, inv, dash, dashCd, magnet, shake, ts, bossStreak, bossOn, bossIn, bossDone, bossT, bossThrow;
    var holdGate = false, prevGate, finishX, runTime, endT, cardShown, queue, lastWord, gateIdx, lastGateX, tAnim, trailT, lastResult, stagePassed, godMode, warnFlash, seedN = 0, throwFlash;
    var amb = [], rafId = 0, lastT = 0, avgMs = 0, ro = null, skyG = null, lastDashTxt = '';

    function resetGame() {
      rng = mulberry(seedBase + seedN * 7919); trng = mulberry((seedBase ^ 0x9e3779b9) + seedN);
      dist = 0; scr = scr || 0; lane = 1; vl = 1; hearts = startHearts; score = 0; combo = 0; maxCombo = 0; correct = 0; wrong = 0; coins = 0; heartsLost = 0;
      shieldLeft = perk === 'shield'; obstacles = []; pickups = []; parts = []; floaters = []; toast = null; gate = null; genX = 720;
      inv = 0; dash = 0; dashCd = 0; magnet = 0; shake = 0; ts = 1; bossStreak = 0; bossOn = false; bossIn = 0; bossDone = false; bossT = 0; bossThrow = 2.2;
      finishX = 0; runTime = 0; endT = 0; cardShown = false; queue = []; lastWord = null; gateIdx = 0; lastGateX = 0; tAnim = 0; trailT = 0;
      holdGate = false; prevGate = null; lastResult = null; stagePassed = false; godMode = false; warnFlash = 0; throwFlash = 0;
      scheduleGate(true);
    }

    function nextWord() {
      if (!queue.length) {
        queue = words.slice();
        for (var i = queue.length - 1; i > 0; i--) { var j = (rng() * (i + 1)) | 0, t = queue[i]; queue[i] = queue[j]; queue[j] = t; }
        if (lastWord && queue[queue.length - 1] === lastWord && queue.length > 1) { var tt = queue[0]; queue[0] = queue[queue.length - 1]; queue[queue.length - 1] = tt; }
      }
      lastWord = queue.pop(); return lastWord;
    }
    function pickDistractors(t) {
      var others = words.filter(function (w) { return w.en.toLowerCase() !== t.en.toLowerCase(); });
      var seen = {}, uniq = [];
      others.forEach(function (w) { var k = w.en.toLowerCase(); if (!seen[k]) { seen[k] = 1; uniq.push(w); } });
      var sc = uniq.map(function (w) {
        var s = diff >= 4 ? lev(w.en, t.en) - (w.en[0].toLowerCase() === t.en[0].toLowerCase() ? 0.6 : 0) + Math.abs(w.en.length - t.en.length) * 0.3 : rng() * 5 + (w.en[0].toLowerCase() === t.en[0].toLowerCase() ? 3 : 0);
        return { w: w, s: s + rng() * 0.4 };
      });
      sc.sort(function (a, b) { return a.s - b.s; });
      return [sc[0].w, sc[1].w];
    }
    function scheduleGate(first) {
      var boss = isBoss && gateIdx >= N - 3;
      var secs = first ? 9 + rng() * 3 : boss ? 5.5 + rng() * 1.5 : 12 + rng() * 6;
      var gx = Math.max(lastGateX, dist) + secs * base;
      var t = nextWord(), ds = pickDistractors(t), cl = (rng() * 3) | 0, di = 0, doors = [];
      for (var l = 0; l < 3; l++) doors.push(l === cl ? { lane: l, word: t.en, correct: true } : { lane: l, word: ds[di++].en, correct: false });
      gate = { x: gx, target: t, doors: doors, correctLane: cl, judged: false, ok: false, reveal: 0, boss: boss };
      genX = Math.max(genX, lastGateX + 700);
    }

    /* ----- audio ----- */
    var actx = null;
    function ensureAudio() {
      if (!sound || actx || dead) return;
      try { var AC = window.AudioContext || window.webkitAudioContext; if (AC) actx = new AC(); } catch (e) { actx = null; }
      try { if (actx && actx.state === 'suspended') actx.resume(); } catch (e) { /* */ }
    }
    function tone(f1, f2, dur, type, vol, delay) {
      if (!sound || !actx) return;
      try {
        var t0 = actx.currentTime + (delay || 0), o = actx.createOscillator(), g = actx.createGain();
        o.type = type || 'sine'; o.frequency.setValueAtTime(f1, t0);
        if (f2) o.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
        g.gain.setValueAtTime(vol || 0.07, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0 + dur + 0.03);
      } catch (e) { /* */ }
    }
    function sfx(k) {
      if (k === 'coin') { tone(880, 1320, 0.09, 'square', 0.04); }
      else if (k === 'star') { tone(660, 0, 0.1, 'triangle', 0.07); tone(990, 0, 0.14, 'triangle', 0.07, 0.07); }
      else if (k === 'hit') { tone(220, 70, 0.28, 'sawtooth', 0.08); }
      else if (k === 'good') { tone(523, 0, 0.12, 'triangle', 0.08); tone(659, 0, 0.12, 'triangle', 0.08, 0.1); tone(784, 0, 0.2, 'triangle', 0.08, 0.2); }
      else if (k === 'bad') { tone(300, 150, 0.35, 'square', 0.05); }
      else if (k === 'dash') { tone(300, 900, 0.25, 'sine', 0.07); }
      else if (k === 'lane') { tone(520, 640, 0.05, 'sine', 0.025); }
      else if (k === 'win') { [523, 659, 784, 1046].forEach(function (f, i) { tone(f, 0, 0.22, 'triangle', 0.08, i * 0.13); }); }
      else if (k === 'lose') { tone(392, 0, 0.2, 'triangle', 0.07); tone(330, 0, 0.2, 'triangle', 0.07, 0.18); tone(262, 0, 0.4, 'triangle', 0.07, 0.36); }
    }

    /* ----- layout ----- */
    function layout() {
      cw = container.clientWidth || 320; chh = container.clientHeight || 180;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(cw * dpr)); canvas.height = Math.max(1, Math.round(chh * dpr));
      var asp = cw / chh, portrait = asp < 1.1, LW, LH, minH;
      if (!portrait) { LW = 960; minH = 520; } else { LW = 540; minH = 760; }
      S = cw / LW; LH = chh / S;
      if (LH < minH) { S = chh / minH; LW = cw / S; LH = minH; }
      L = { LW: LW, LH: LH, portrait: portrait };
      if (!portrait) {
        L.HUD = 84; var av = LH - L.HUD; L.gap = Math.min(112, av * 0.25); L.cy = L.HUD + av * 0.5 + 8; L.px = Math.min(LW * 0.2, 230);
      } else {
        L.HUD = 176; var av2 = LH - L.HUD - 130; L.gap = Math.min(200, av2 * 0.27); L.cy = L.HUD + av2 * 0.5 + 12; L.px = LW * 0.25;
      }
      L.size = Math.min(L.gap * 0.72, 120); L.hor = L.cy - 1.5 * L.gap - 14; L.half = 1.5 * L.gap + 12;
      skyG = c.createLinearGradient(0, 0, 0, L.hor);
      skyG.addColorStop(0, W.sky[0]); skyG.addColorStop(0.6, W.sky[1]); skyG.addColorStop(1, W.sky[2]);
      L.groundG = c.createLinearGradient(0, L.hor, 0, LH); L.groundG.addColorStop(0, W.ground[0]); L.groundG.addColorStop(1, W.ground[1]);
      root.classList.toggle('wq37r-port', portrait);
      if (!amb.length) for (var i = 0; i < 26; i++) amb.push({ x: Math.random() * 1000, y: Math.random() * 700, r: 1 + Math.random() * 3, ph: Math.random() * 6, v: 0.3 + Math.random() * 0.9 });
    }
    function kAt(sx) { return sx <= L.px ? 1 : 1 - 0.22 * Math.min(1.2, (sx - L.px) / (L.LW - L.px)); }
    function laneY(l, sx) { return L.cy + (l - 1) * L.gap * kAt(sx); }

    /* ----- overlays ----- */
    function h(tag, cls, text) { var e = doc.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
    function clearOverlay() { if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay); overlay = null; }
    function makeOverlay() { clearOverlay(); overlay = h('div', 'wq37r-ov'); var card = h('div', 'wq37r-card'); overlay.appendChild(card); root.appendChild(overlay); return card; }
    function btn(txt, cls, fn) { var b = h('button', 'wq37r-b ' + (cls || ''), txt); b.type = 'button'; b.addEventListener('click', function (e) { e.stopPropagation(); ensureAudio(); fn(); }); return b; }
    function showStart() {
      var card = makeOverlay();
      card.appendChild(h('div', 'wq37r-big', icon));
      card.appendChild(h('div', 'wq37r-t', (ch.name || '') + (perk ? ' ' + ({ heart: '❤️', shield: '🛡️', coin: '🪙' }[perk] || '') : '')));
      card.appendChild(h('div', 'wq37r-t', W.zh + ' · 第' + (stageI + 1) + '關' + (isBoss ? ' 👑' : '')));
      card.appendChild(h('div', 'wq37r-s', touchMode ? '上下滑動轉線 · ⚡ 衝刺' : '↑ ↓ 轉線 · 空白鍵 衝刺 · P 暫停'));
      card.appendChild(btn('開始', '', begin));
    }
    function showPause() {
      var card = makeOverlay(); card.appendChild(h('div', 'wq37r-t', '已暫停'));
      card.appendChild(btn('繼續', '', resume)); card.appendChild(btn('返回', 'alt', doExit));
    }
    function showResult() {
      cardShown = true; var r = lastResult, tot = r.correct + r.wrong, acc = tot ? Math.round(r.correct / tot * 100) : 0;
      var card = makeOverlay();
      card.appendChild(h('div', 'wq37r-t', r.passed ? '🎉 過關！' : '💪 再試一次'));
      card.appendChild(h('div', 'wq37r-stars', '★★★★★'.slice(0, r.stars) + '☆☆☆☆☆'.slice(0, 5 - r.stars)));
      card.appendChild(h('div', 'wq37r-row', '準確率 ' + acc + '%　🪙 ' + r.coins));
      card.appendChild(h('div', 'wq37r-row', '分數 ' + r.score + '　' + r.seconds + ' 秒'));
      card.appendChild(btn('↻ 再玩', '', replay)); card.appendChild(btn('返回', 'alt', doExit));
    }
    function doExit() { if (exited || dead) return; exited = true; try { if (opts.onExit) opts.onExit(); } catch (e) { console.error(e); } }

    /* ----- flow ----- */
    function begin() { if (state !== 'ready') return; clearOverlay(); state = 'play'; ensureAudio(); }
    function replay() { seedN++; clearOverlay(); resetGame(); state = 'play'; }
    function pause() { if (state !== 'play') return; state = 'paused'; showPause(); }
    function resume() { if (state !== 'paused') return; clearOverlay(); state = 'play'; lastT = 0; }
    function changeLane(d) {
      if (state !== 'play') return; var n = clamp(lane + d, 0, 2);
      if (n !== lane) { lane = n; sfx('lane'); }
    }
    function doDash() {
      if (state !== 'play' || dashCd > 0) return;
      dash = 0.6; dashCd = 4; sfx('dash');
      for (var i = 0; i < (reduced ? 4 : 14); i++) addPart(L.px - 20, laneY(vl, L.px), -200 - Math.random() * 200, (Math.random() - 0.5) * 120, 0.5, 5, '#fff', 's');
    }

    /* ----- particles / floaters ----- */
    function addPart(x, y, vx, vy, life, size, col, type, g) {
      if (parts.length > 320) return;
      parts.push({ x: x, y: y, vx: vx, vy: vy, life: life, max: life, size: size, col: col, type: type || 'c', g: g || 0, rot: Math.random() * 6, vr: (Math.random() - 0.5) * 10 });
    }
    function burst(x, y, n, cols, sp, life, type, g) {
      n = reduced ? Math.ceil(n / 3) : n;
      for (var i = 0; i < n; i++) { var a = Math.random() * TWO_PI, s = sp * (0.3 + Math.random() * 0.8); addPart(x, y, Math.cos(a) * s, Math.sin(a) * s - sp * 0.3, life * (0.6 + Math.random() * 0.6), 4 + Math.random() * 5, cols[(Math.random() * cols.length) | 0], type, g); }
    }
    var CONF = ['#ff5fa2', '#ffd23f', '#3fd0ff', '#7dff6a', '#b07bff', '#ff8a3d'];
    function confetti(n) {
      n = reduced ? Math.ceil(n / 4) : n;
      for (var i = 0; i < n; i++) addPart(Math.random() * L.LW, L.HUD + 10 + Math.random() * 60, (Math.random() - 0.5) * 160, 60 + Math.random() * 200, 1.8 + Math.random(), 7 + Math.random() * 5, CONF[(Math.random() * CONF.length) | 0], 'r', 380);
    }
    function floater(text, x, y, col, size) { floaters.push({ text: text, x: x, y: y, t: 0, col: col || '#fff', size: size || 30 }); }

    /* ----- gameplay ----- */
    function curSpeed() { return base * (1 + 0.025 * Math.min(gateIdx, 10)) * (dash > 0 ? 1.45 : 1) * (bossOn && !bossDone ? 1.1 : 1); }
    function loseHeart(kind) {
      if (shieldLeft) { shieldLeft = false; inv = 0.9; floater('🛡️ 擋住了！', L.px, laneY(vl, L.px) - 70, '#9ff6ff', 30); sfx('good'); burst(L.px, laneY(vl, L.px), 12, ['#9ff6ff', '#fff'], 260, 0.6, 's'); return false; }
      hearts--; heartsLost++; combo = 0; shake = reduced ? 0.15 : 0.55; inv = 1.2; sfx(kind === 'hit' ? 'hit' : 'bad');
      floater('💔', L.px, laneY(vl, L.px) - 70, '#fff', 40);
      if (hearts <= 0) endRun(false);
      return true;
    }
    function judgeGate(g) {
      g.judged = true; g.ok = lane === g.correctLane; g.reveal = 3; gateIdx++; lastGateX = g.x;
      var t = g.target, py = laneY(vl, L.px);
      if (g.ok) {
        correct++; combo++; maxCombo = Math.max(maxCombo, combo); var bonus = 100 + 20 * Math.min(combo, 10); score += bonus;
        if (g.boss) bossStreak++;
        floater('+' + bonus, L.px, py - 70, '#ffe14d', 36); if (combo > 1) floater('連擊 ×' + combo, L.px + 20, py - 110, '#ff9ad0', 28);
        confetti(50); sfx('good');
        toast = { t: 2.4, text: '✔ ' + t.en + ' = ' + t.zh, ok: true };
      } else {
        wrong++; combo = 0; bossStreak = 0;
        toast = { t: 3, text: '答案：' + t.en + ' = ' + t.zh, ok: false };
        loseHeart('gate');
      }
      if (state !== 'play') return;
      if (isBoss && !bossOn && gateIdx >= N - 3) { bossOn = true; bossIn = 0; }
      prevGate = g;
      if (isBoss && bossOn && bossStreak >= 3) { bossDone = true; bossT = 0; confetti(90); finishX = g.x + 1000; gate = null; return; }
      if (!isBoss && gateIdx >= N) { finishX = g.x + 900; gate = null; return; }
      gate = null; scheduleGate(false);
    }
    function addPick(x, l, kind) { pickups.push({ x: x, lane: l, ly: l, kind: kind, got: false }); }
    function spawnPattern() {
      var gap = GAPSEC[diff - 1] * base, r = rng(), i;
      if (!bossOn && r < OBSP[diff - 1]) {
        var n = (diff >= 3 && rng() < 0.3 + 0.1 * diff) ? 2 : 1, ls = [0, 1, 2], first = (rng() * 3) | 0;
        for (i = 0; i < n; i++) {
          var l = ls.splice(i === 0 ? first : (rng() * ls.length) | 0, 1)[0];
          obstacles.push({ x: genX, lane: l, e: W.obs[(rng() * W.obs.length) | 0], vx: 0, hit: false, spin: 0 });
        }
        genX += gap; return;
      }
      var kind = rng(), len = 0;
      if (kind < 0.12 && hearts < maxHearts) { addPick(genX, (rng() * 3) | 0, 'heart'); }
      else if (kind < 0.2) { addPick(genX, (rng() * 3) | 0, 'magnet'); }
      else if (kind < 0.4) { addPick(genX, (rng() * 3) | 0, 'star'); }
      else if (kind < 0.7) { var ll = (rng() * 3) | 0; for (i = 0; i < 5; i++) addPick(genX + i * 90, ll, 'coin'); len = 360; }
      else { var up = rng() < 0.5; for (i = 0; i < 5; i++) { var q = [0, 1, 2, 1, 0][i]; addPick(genX + i * 100, up ? q : 2 - q, 'coin'); } len = 400; }
      genX += Math.max(gap * 0.8, len + 260);
    }
    function ensure() {
      var limit = dist + (L.LW - L.px) + 500, stop = gate ? gate.x - 900 : (finishX ? finishX - 500 : -1);
      var guard = 0;
      while (genX < Math.min(limit, stop) && guard++ < 40) spawnPattern();
    }
    function bossThrowObs() {
      var lastOK = (!gate || gate.x - dist > 1100) && (dist - lastGateX > 600);
      if (!lastOK) return;
      var l = (trng() * 3) | 0;
      obstacles.push({ x: dist + L.LW - L.px + 40, lane: l, e: W.obs[(trng() * W.obs.length) | 0], vx: -base * 0.45, hit: false, spin: 1 });
      throwFlash = 0.4; sfx('lane');
    }
    function endRun(alive) {
      if (state !== 'play') return;
      var tot = correct + wrong, acc = tot ? correct / tot : 0, passed = alive && acc >= 0.5, stars;
      if (alive && tot > 0 && wrong === 0 && heartsLost === 0) stars = 5; else stars = acc >= 0.9 ? 4 : acc >= 0.75 ? 3 : acc >= 0.5 ? 2 : 1;
      lastResult = { score: score, correct: correct, wrong: wrong, coins: coins, seconds: Math.round(runTime * 10) / 10, stars: stars, passed: passed, world: worldI, stage: stageI };
      stagePassed = passed; state = passed ? 'won' : 'over'; endT = 0;
      if (passed) { confetti(120); sfx('win'); } else sfx('lose');
      try { if (opts.onFinish) opts.onFinish(lastResult); } catch (e) { console.error(e); }
    }

    function step(dt, ff) {
      tAnim += dt;
      if (state === 'play') {
        runTime += dt;
        if (inv > 0) inv -= dt; if (dash > 0) dash -= dt; if (dashCd > 0) dashCd -= dt; if (magnet > 0) magnet -= dt;
        var warn = gate && !gate.judged && gate.x - dist < WARN;
        ts += ((warn ? 0.62 : 1) - ts) * Math.min(1, dt * 5);
        var sd = dt * ts, mv = curSpeed() * sd; dist += mv; scr += mv;
        ensure();
        if (bossOn && !bossDone) { bossIn = Math.min(1, bossIn + dt * 0.8); bossThrow -= dt; if (bossThrow <= 0 && bossIn > 0.9) { bossThrow = Math.max(0.9, 1.8 - diff * 0.14) + trng() * 0.5; bossThrowObs(); } }
        var i, o;
        for (i = obstacles.length - 1; i >= 0; i--) {
          o = obstacles[i]; if (o.vx) o.x += o.vx * sd; if (o.spin) o.spin += dt * 6;
          if (o.x < dist - 220) { obstacles.splice(i, 1); continue; }
          if (!o.hit && Math.abs(o.x - dist) < 42 && o.lane === lane && !ff && !godMode) {
            if (dash > 0) { o.hit = true; burst(L.px, laneY(lane, L.px), 10, ['#fff3a0', '#9ff6ff'], 240, 0.5, 's'); }
            else if (inv <= 0) { o.hit = true; burst(L.px + 20, laneY(lane, L.px), 14, ['#fff', '#ffd27d'], 260, 0.5, 'c', 200); loseHeart('hit'); if (state !== 'play') return; }
          }
        }
        for (i = pickups.length - 1; i >= 0; i--) {
          var p = pickups[i];
          if (p.x < dist - 220 || p.got) { if (p.x < dist - 220 || p.got) pickups.splice(i, 1); continue; }
          if (p.ly === undefined) p.ly = p.lane;
          if (magnet > 0 && p.x - dist < 520 && p.x > dist - 40 && p.kind !== 'magnet') p.ly += (lane - p.ly) * Math.min(1, dt * 9);
          if (Math.abs(p.x - dist) < 46 && Math.abs(p.ly - lane) < 0.55) collect(p);
        }
        if (gate && !gate.judged && gate.x <= dist) { judgeGate(gate); if (state !== 'play') return; }
        if (finishX && dist >= finishX) endRun(true);
      } else if (state === 'won') {
        var m2 = base * 0.55 * dt; dist += m2; scr += m2; endT += dt; ts = 1; if (bossT > 0 || bossDone) bossT += dt;
        if (Math.random() < dt * 4 && !reduced) confetti(6);
      } else if (state === 'over') { endT += dt; }
      else if (state === 'ready') { scr += 55 * dt; }
      if (bossDone && state === 'play') bossT += dt;
      if (bossOn && !bossDone && bossT === 0) { /* bob only */ }
      if (prevGate) prevGate.reveal -= dt;
      if (throwFlash > 0) throwFlash -= dt;
      // visuals
      var dl = lane - vl; vl += dl * Math.min(1, dt * 14);
      if (state === 'play') {
        trailT -= dt;
        if (trailT <= 0) { trailT = reduced ? 0.09 : 0.03; var ty = laneY(vl, L.px); addPart(L.px - 26, ty + (Math.random() - 0.5) * 26, -90 - Math.random() * 60, (Math.random() - 0.5) * 40, 0.55, 3 + Math.random() * 4, trailCol, 's'); }
      }
      for (var k = parts.length - 1; k >= 0; k--) { var q = parts[k]; q.life -= dt; if (q.life <= 0) { parts.splice(k, 1); continue; } q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.vr * dt; }
      for (k = floaters.length - 1; k >= 0; k--) { floaters[k].t += dt; if (floaters[k].t > 1.3) floaters.splice(k, 1); }
      if (toast) { toast.t -= dt; if (toast.t <= 0) toast = null; }
      if (shake > 0) shake = Math.max(0, shake - dt * 1.6);
      warnFlash += dt;
      if (endT > 1.3 && !cardShown && (state === 'won' || state === 'over')) showResult();
    }
    function collect(p) {
      p.got = true; var y = laneY(lane, L.px);
      if (p.kind === 'coin') { coins++; score += perk === 'coin' ? 20 : 10; sfx('coin'); burst(L.px + 30, y, 5, ['#ffe14d', '#fff'], 160, 0.4, 's'); if (perk === 'coin') floater('×2', L.px + 30, y - 60, '#ffe14d', 22); }
      else if (p.kind === 'star') { score += 50; sfx('star'); burst(L.px + 30, y, 10, ['#fff27a', '#ffb400'], 220, 0.6, 's'); floater('+50', L.px + 30, y - 60, '#fff27a', 30); }
      else if (p.kind === 'heart') { if (hearts < maxHearts) hearts++; else score += 100; sfx('star'); floater('💖 +1', L.px + 30, y - 60, '#ff7eb3', 30); burst(L.px + 30, y, 10, ['#ff7eb3', '#fff'], 200, 0.6, 'c'); }
      else if (p.kind === 'magnet') { magnet = 6; sfx('star'); floater('🧲 磁力', L.px + 30, y - 60, '#9ff6ff', 28); }
    }

    /* ----- debug fast-forward ----- */
    function advance(lead) {
      lead = lead || 0;
      if (state === 'ready') begin();
      holdGate = false;
      var guard = 0, stepped = false;
      function armed() { if (!gate || gate.judged) return false; return gate.x - dist <= curSpeed() * ts * (1 / 60) + 1e-6 + lead; }
      var startArmed = armed();
      while (state === 'play' && guard++ < 400000) {
        if (gate && !gate.judged && armed() && !(startArmed && !stepped)) break;
        step(1 / 60, true); stepped = true;
        if (!gate && !finishX && state === 'play') break;
      }
      if (state === 'play' && armed()) holdGate = true;
    }

    /* ----- rendering ----- */
    function outline(txt, x, y, size, fill, align, font, lw) {
      c.font = '800 ' + size + 'px ' + (font || FONT); c.textAlign = align || 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
      c.lineWidth = lw || Math.max(3, size * 0.16); c.strokeStyle = DARK; c.strokeText(txt, x, y); c.fillStyle = fill; c.fillText(txt, x, y);
    }
    function emoji(ch2, x, y, size, rot, sx, sy) {
      c.save(); c.translate(x, y); if (rot) c.rotate(rot); if (sx !== undefined) c.scale(sx, sy);
      c.font = size + 'px ' + EMOJI; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#000'; c.fillText(ch2, 0, 0); c.restore();
    }
    function shadow(x, y, w) { c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(x, y, w, w * 0.28, 0, 0, TWO_PI); c.fill(); }

    function drawScene() {
      var LW = L.LW, LH = L.LH, hor = L.hor, i;
      c.fillStyle = skyG; c.fillRect(0, 0, LW, hor + 1);
      BG[worldI](c, L, scr, tAnim);
      c.fillStyle = L.groundG; c.fillRect(0, hor, LW, LH - hor + 2);
      // ground tufts
      c.strokeStyle = W.tuft; c.lineWidth = 3; c.lineCap = 'round'; c.globalAlpha = 0.55;
      for (var r = 0; r < 6; r++) {
        var y = hor + (LH - hor) * (r + 0.6) / 6.4, period = 80 + r * 12, off = scr * (0.5 + 0.16 * r), sc = 0.6 + r * 0.14;
        rep(L, off, period, function (x, ii, a, b) {
          var yy = y + (b - 0.5) * 14, xx = x + a * 30;
          if (worldI === 4) { c.beginPath(); c.moveTo(xx, yy); c.lineTo(xx - 26 * sc, yy + 12 * sc); c.stroke(); }
          else { c.beginPath(); c.moveTo(xx - 6 * sc, yy); c.lineTo(xx - 3 * sc, yy - 9 * sc); c.moveTo(xx, yy); c.lineTo(xx, yy - 12 * sc); c.moveTo(xx + 6 * sc, yy); c.lineTo(xx + 3 * sc, yy - 8 * sc); c.stroke(); }
        });
      }
      c.globalAlpha = 1;
      // track strip
      var cy = L.cy, hl = L.half, hr = L.half * kAt(LW);
      c.fillStyle = W.track; c.beginPath(); c.moveTo(0, cy - hl); c.lineTo(LW, cy - hr); c.lineTo(LW, cy + hr); c.lineTo(0, cy + hl); c.closePath(); c.fill();
      // current lane glow
      var kx = kAt(LW), lg = L.gap * 0.5;
      c.fillStyle = 'rgba(255,255,255,0.11)'; c.beginPath(); c.moveTo(0, cy + (vl - 1) * L.gap - lg); c.lineTo(LW, cy + (vl - 1) * L.gap * kx - lg * kx); c.lineTo(LW, cy + (vl - 1) * L.gap * kx + lg * kx); c.lineTo(0, cy + (vl - 1) * L.gap + lg); c.closePath(); c.fill();
      c.strokeStyle = W.edge; c.lineWidth = 5; c.globalAlpha = 0.9;
      c.beginPath(); c.moveTo(0, cy - hl); c.lineTo(LW, cy - hr); c.moveTo(0, cy + hl); c.lineTo(LW, cy + hr); c.stroke();
      c.lineWidth = 3; c.globalAlpha = 0.65; c.setLineDash([]);
      for (var dv = -1; dv <= 1; dv += 2) {
        var o0 = ((scr * 1) % 80 + 80) % 80;
        for (var xx = -o0; xx < LW; xx += 80) {
          var x1 = Math.max(0, xx), x2 = Math.min(LW, xx + 40); if (x2 <= x1) continue;
          c.beginPath(); c.moveTo(x1, cy + dv * L.gap * 0.5 * kAt(x1)); c.lineTo(x2, cy + dv * L.gap * 0.5 * kAt(x2)); c.stroke();
        }
      }
      c.globalAlpha = 1;
      // finish line
      if (finishX) {
        var fx = L.px + finishX - dist;
        if (fx > -60 && fx < LW + 60) {
          var fk = kAt(fx);
          for (i = 0; i < 12; i++) { c.fillStyle = (i % 2) ? '#fff' : '#222'; c.fillRect(fx - 14, cy - hl * fk + i * (2 * hl * fk / 12), 28, 2 * hl * fk / 12); c.fillStyle = (i % 2) ? '#222' : '#fff'; c.fillRect(fx + 14, cy - hl * fk + i * (2 * hl * fk / 12), 28, 2 * hl * fk / 12); }
          outline('🏁', fx + 10, cy - hl * fk - 28, 46 * fk, '#fff', 'center', EMOJI);
        }
      }
      drawAmbient();
      // boss (behind entities)
      if (bossOn) drawBoss();
      // entities by lane
      for (var l = 0; l < 3; l++) {
        if (gate) drawDoor(gate, gate.doors[l]);
        if (prevGate && prevGate.reveal > 0) drawDoor(prevGate, prevGate.doors[l]);
        var list = [];
        for (i = 0; i < obstacles.length; i++) if (obstacles[i].lane === l && !obstacles[i].hit) list.push(obstacles[i]);
        for (i = 0; i < pickups.length; i++) if (Math.round(pickups[i].ly === undefined ? pickups[i].lane : pickups[i].ly) === l && !pickups[i].got) list.push(pickups[i]);
        list.sort(function (a, b) { return b.x - a.x; });
        for (i = 0; i < list.length; i++) { if (list[i].e) drawObstacle(list[i]); else drawPickup(list[i]); }
        if (Math.round(vl) === l) drawPlayer();
      }
    }
    function drawAmbient() {
      var LW = L.LW, LH = L.LH, kind = W.amb, t = tAnim;
      var n = reduced ? 8 : amb.length;
      for (var i = 0; i < n; i++) {
        var a = amb[i], x, y;
        if (kind === 'petal') { x = ((a.x * 1.1 - scr * 0.35 * a.v) % LW + LW) % LW; y = (a.y * 0.8 + t * 30 * a.v) % LH; c.fillStyle = W.ambc; c.globalAlpha = 0.8; c.beginPath(); c.ellipse(x, y, 5 + a.r, 3 + a.r * 0.5, t + a.ph, 0, TWO_PI); c.fill(); }
        else if (kind === 'firefly') { x = (a.x * 1.1 + Math.sin(t * 0.6 + a.ph) * 40) % LW; y = L.hor + (a.y % (LH - L.hor)) * 0.9 + Math.cos(t * 0.8 + a.ph) * 20; glow(c, x, y, 14 + a.r * 2, 'rgba(255,245,120,1)', 0.45 + 0.45 * Math.sin(t * 3 + a.ph)); continue; }
        else if (kind === 'dust') { x = ((a.x * 1.1 - scr * 1.2 * a.v) % LW + LW) % LW; y = L.hor + (a.y % (LH - L.hor)); c.strokeStyle = W.ambc; c.globalAlpha = 0.45; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 26 + a.r * 6, y + 2); c.stroke(); }
        else if (kind === 'ember') { x = (a.x * 1.1 + Math.sin(t + a.ph) * 20 - scr * 0.2) % LW; x = (x + LW) % LW; y = LH - ((a.y * 0.9 + t * 60 * a.v) % LH); c.fillStyle = W.ambc; c.globalAlpha = 0.85; circ(c, x, y, a.r + 0.5); }
        else { x = ((a.x * 1.1 - scr * 0.5 * a.v) % LW + LW) % LW; y = (a.y * 0.85) % LH; c.fillStyle = '#fff'; c.globalAlpha = 0.35 + 0.5 * Math.abs(Math.sin(t * 2 + a.ph)); circ(c, x, y, a.r * 0.7); }
        c.globalAlpha = 1;
      }
      c.globalAlpha = 1;
    }
    function drawBoss() {
      var e = 1 - Math.pow(1 - bossIn, 3), size = Math.min(L.gap * 2.1, 240), x = L.LW - size * 0.42 + (1 - e) * (size + 80), y = L.cy + Math.sin(tAnim * 2) * 14;
      var pulse = throwFlash > 0 ? 1 + throwFlash * 0.4 : 1, rot = Math.sin(tAnim * 1.5) * 0.08, a = 1;
      if (bossDone) { y -= bossT * 120; rot += bossT * 3; a = clamp(1.2 - bossT, 0, 1); size *= (1 - Math.min(0.5, bossT * 0.3)); if (a <= 0) return; }
      shadow(x, L.cy + size * 0.5, size * 0.4);
      c.globalAlpha = a; c.shadowColor = 'rgba(30,10,60,0.85)'; c.shadowBlur = 14; emoji(bossDone ? '😵' : W.boss, x, y, size * pulse, rot); c.shadowBlur = 0; c.shadowColor = 'transparent'; c.globalAlpha = 1;
      if (bossDone) emoji('💫', x, y - size * 0.45, size * 0.3, bossT * 4);
    }
    function drawDoor(g, d) {
      var sx = L.px + g.x - dist; if (sx < -200 || sx > L.LW + 260) return;
      var k = kAt(sx), y = laneY(d.lane, sx), dw = Math.min(L.gap * 1.55, 232) * k, dh = L.gap * 0.94 * k, cols = DOORC[d.lane];
      var judged = g.judged, isC = d.correct, flash = judged && isC;
      c.save();
      if (judged && !isC) c.globalAlpha = 0.5;
      if (flash) { glow(c, sx, y, dw * 0.9, 'rgba(255,240,120,1)', 0.6 + 0.4 * Math.sin(g.reveal * 14)); }
      var gr = c.createLinearGradient(0, y - dh / 2, 0, y + dh / 2); gr.addColorStop(0, cols[0]); gr.addColorStop(1, cols[1]);
      rr(c, sx - dw / 2, y - dh / 2, dw, dh, 18 * k); c.fillStyle = gr; c.fill();
      c.lineWidth = 5 * k; c.strokeStyle = flash ? '#ffe14d' : DARK; c.stroke();
      rr(c, sx - dw / 2 + 7 * k, y - dh / 2 + 6 * k, dw - 14 * k, dh * 0.3, 10 * k); c.fillStyle = 'rgba(255,255,255,0.28)'; c.fill();
      var fs = 36 * k, maxW = dw - 26 * k; c.font = '800 ' + fs + 'px ' + EFONT;
      var m = c.measureText(d.word).width; if (m > maxW) fs *= maxW / m;
      outline(d.word, sx, y + 2 * k, fs, '#fff', 'center', EFONT, Math.max(3, fs * 0.17));
      c.restore();
      if (judged && isC && g.reveal > 0) {
        var zh = g.target.zh; outline((g.target.emoji || '') + ' ' + zh, sx, y - dh / 2 - 16 * k, 24 * k, '#ffe14d');
      }
    }
    function drawObstacle(o) {
      var sx = L.px + o.x - dist; if (sx < -120 || sx > L.LW + 120) return;
      var k = kAt(sx), y = laneY(o.lane, sx), s = L.size * k;
      shadow(sx, y + s * 0.42, s * 0.42);
      var rot = o.spin ? Math.sin(o.spin) * 0.5 : 0;
      if (o.spin) glow(c, sx, y, s * 0.8, 'rgba(255,120,60,1)', 0.35);
      emoji(o.e, sx, y, s, rot);
    }
    function drawPickup(p) {
      var sx = L.px + p.x - dist; if (sx < -80 || sx > L.LW + 80) return;
      var k = kAt(sx), y = laneY(p.ly === undefined ? p.lane : p.ly, sx), s = L.size * k * 0.62, bob = Math.sin(tAnim * 4 + p.x * 0.05) * 5;
      if (p.kind === 'coin') {
        glow(c, sx, y + bob, s * 0.9, 'rgba(255,225,80,1)', 0.35);
        emoji('🪙', sx, y + bob, s, 0, Math.max(0.25, Math.abs(Math.cos(tAnim * 5 + p.x * 0.03))), 1);
      } else {
        glow(c, sx, y + bob, s * 1.3, p.kind === 'heart' ? 'rgba(255,120,180,1)' : p.kind === 'magnet' ? 'rgba(120,230,255,1)' : 'rgba(255,240,100,1)', 0.5);
        emoji(p.kind === 'star' ? '⭐' : p.kind === 'heart' ? '💖' : '🧲', sx, y + bob, s * 1.25, Math.sin(tAnim * 3) * 0.15);
      }
    }
    function drawPlayer() {
      var y = laneY(vl, L.px), s = L.size * 1.05, dl = lane - vl, run = tAnim * 14;
      var stY = 1 + Math.min(0.28, Math.abs(dl) * 0.4) + Math.sin(run) * 0.04, stX = 1 / stY + Math.cos(run) * 0.02;
      var bob = -Math.abs(Math.sin(run * 0.5)) * 7;
      shadow(L.px, y + s * 0.46, s * 0.4 * (1 + bob * 0.01));
      if (magnet > 0) { c.strokeStyle = 'rgba(120,230,255,0.6)'; c.lineWidth = 4; c.beginPath(); c.arc(L.px, y, s * 0.8 + Math.sin(tAnim * 8) * 4, 0, TWO_PI); c.stroke(); }
      if (dash > 0) { for (var i = 1; i < 4; i++) { c.globalAlpha = 0.25 / i; emoji(icon, L.px - i * 34, y + bob, s, 0, stX, stY); } c.globalAlpha = 1; glow(c, L.px, y, s * 1.1, 'rgba(160,240,255,1)', 0.5); }
      if (state === 'over') c.globalAlpha = 0.85;
      if (inv > 0 && Math.floor(tAnim * 14) % 2 === 0 && state === 'play' && dash <= 0) c.globalAlpha = 0.35;
      emoji(icon, L.px, y + bob, s, clamp(dl * 0.3, -0.35, 0.35), stX, stY);
      c.globalAlpha = 1;
      if (shieldLeft) { c.strokeStyle = 'rgba(160,245,255,0.85)'; c.lineWidth = 5; c.fillStyle = 'rgba(160,245,255,0.18)'; c.beginPath(); c.arc(L.px, y + bob, s * 0.62, 0, TWO_PI); c.fill(); c.stroke(); }
      if (state === 'won') emoji('🎉', L.px + s * 0.5, y - s * 0.6, s * 0.5, Math.sin(tAnim * 8) * 0.3);
      // warning ring
      if (gate && !gate.judged && gate.x - dist < WARN && state === 'play') {
        var ph = (tAnim * 1.6) % 1; c.strokeStyle = 'rgba(255,225,70,' + (0.9 - ph * 0.7) + ')'; c.lineWidth = 6; c.setLineDash([14, 10]);
        c.beginPath(); c.arc(L.px, y, s * (0.7 + ph * 0.7), 0, TWO_PI); c.stroke(); c.setLineDash([]);
      }
    }
    function drawHUD() {
      var LW = L.LW, P = L.portrait, i, hh = L.HUD;
      c.fillStyle = 'rgba(25,12,60,0.62)'; rr(c, -20, -20, LW + 40, hh + 20, 22); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.35)'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, hh); c.lineTo(LW, hh); c.stroke();
      var nh = Math.max(startHearts, hearts), hs = P ? 34 : 30;
      for (i = 0; i < nh; i++) emoji(i < hearts ? '❤️' : '🖤', 24 + i * (hs + 4), P ? 30 : 26, hs);
      var tot = N, shown = Math.min(gateIdx + 1, tot);
      var pw = P ? LW - 28 : 440, px0 = P ? 14 : (LW - 440) / 2, py0 = P ? 78 : 8, ph2 = P ? 62 : 68;
      rr(c, px0, py0, pw, ph2, 18); c.fillStyle = 'rgba(255,252,240,0.96)'; c.fill(); c.lineWidth = 4; c.strokeStyle = gate && gate.boss ? '#ffb400' : DARK; c.stroke();
      var t = gate && !gate.judged ? gate.target : (!finishX && prevGate ? prevGate.target : null);
      var label = t ? ((t.emoji ? t.emoji + ' ' : '') + t.zh) : '🏁 衝向終點！';
      var fs = P ? 36 : 34; c.font = '800 ' + fs + 'px ' + FONT; var mw = c.measureText(label).width; if (mw > pw - 90) fs *= (pw - 90) / mw;
      outline(label, px0 + pw / 2, py0 + ph2 / 2 + 2, fs, '#fff', 'center', FONT, Math.max(4, fs * 0.16));
      if (!t) { /* finish */ }
      outline('分數 ' + score, P ? LW - 80 : 18, P ? 30 : 64, P ? 26 : 22, '#fff', P ? 'right' : 'left');
      if (!P) outline('🪙 ' + coins, 18 + 150, 64, 22, '#ffe14d', 'left');
      var info = '第 ' + shown + '/' + tot + ' 道門' + (combo > 1 ? '　連擊 ×' + combo : '');
      if (bossOn && !bossDone) info = '👑 連續答對 ' + bossStreak + '/3';
      if (bossDone) info = '👑 打敗魔王！';
      if (P) {
        rr(c, 14, 150, LW - 28, 10, 5); c.fillStyle = 'rgba(255,255,255,0.25)'; c.fill();
        rr(c, 14, 150, Math.max(10, (LW - 28) * Math.min(1, gateIdx / tot)), 10, 5); c.fillStyle = '#7dff6a'; c.fill();
        outline(info + '　🪙 ' + coins, LW / 2, 169, 18, '#fff');
      } else {
        outline(info, LW - 74, 26, 20, '#fff', 'right'); outline(combo > 1 ? '' : '', LW - 74, 60, 20, '#fff', 'right');
        rr(c, LW - 214, 52, 130, 12, 6); c.fillStyle = 'rgba(255,255,255,0.25)'; c.fill();
        rr(c, LW - 214, 52, Math.max(12, 130 * Math.min(1, gateIdx / tot)), 12, 6); c.fillStyle = '#7dff6a'; c.fill();
      }
      // dash meter (non-touch)
      if (!touchMode) {
        var dx = 18, dy = L.LH - 30, r = dashCd > 0 ? 1 - dashCd / 4 : 1;
        rr(c, dx, dy - 12, 150, 24, 12); c.fillStyle = 'rgba(25,12,60,0.6)'; c.fill();
        rr(c, dx + 3, dy - 9, Math.max(8, 144 * r), 18, 9); c.fillStyle = r >= 1 ? '#5be4ff' : '#9a8fc0'; c.fill();
        outline('⚡ 空白鍵衝刺', dx + 75, dy, 14, '#fff', 'center', FONT, 3);
      }
      // toast
      if (toast) {
        var ty = hh + 30, tw = Math.min(LW - 30, 440), a2 = clamp(toast.t * 2, 0, 1);
        c.globalAlpha = a2; rr(c, (LW - tw) / 2, ty - 24, tw, 48, 24); c.fillStyle = toast.ok ? '#3fc96a' : '#ff6b6b'; c.fill(); c.lineWidth = 4; c.strokeStyle = DARK; c.stroke();
        var tf = 24; c.font = '800 ' + tf + 'px ' + FONT; var tm = c.measureText(toast.text).width; if (tm > tw - 30) tf *= (tw - 30) / tm;
        outline(toast.text, LW / 2, ty, tf, '#fff'); c.globalAlpha = 1;
      }
    }
    function drawParts() {
      for (var i = 0; i < parts.length; i++) {
        var q = parts[i], a = clamp(q.life / q.max * 1.5, 0, 1); c.globalAlpha = a; c.fillStyle = q.col;
        if (q.type === 'r') { c.save(); c.translate(q.x, q.y); c.rotate(q.rot); c.fillRect(-q.size / 2, -q.size / 3, q.size, q.size * 0.6); c.restore(); }
        else if (q.type === 's') { c.save(); c.translate(q.x, q.y); c.rotate(q.rot); var s = q.size * (0.5 + a * 0.6); c.beginPath(); c.moveTo(0, -s); c.lineTo(s * 0.3, -s * 0.3); c.lineTo(s, 0); c.lineTo(s * 0.3, s * 0.3); c.lineTo(0, s); c.lineTo(-s * 0.3, s * 0.3); c.lineTo(-s, 0); c.lineTo(-s * 0.3, -s * 0.3); c.closePath(); c.fill(); c.restore(); }
        else circ(c, q.x, q.y, q.size * 0.5);
      }
      c.globalAlpha = 1;
      for (i = 0; i < floaters.length; i++) { var f = floaters[i]; c.globalAlpha = clamp(1.4 - f.t, 0, 1); outline(f.text, f.x, f.y - f.t * 50, f.size, f.col); }
      c.globalAlpha = 1;
    }
    function render() {
      c.setTransform(dpr * S, 0, 0, dpr * S, 0, 0);
      c.save();
      if (shake > 0) c.translate((Math.random() - 0.5) * 18 * shake, (Math.random() - 0.5) * 18 * shake);
      drawScene(); drawParts();
      c.restore();
      if (gate && !gate.judged && gate.x - dist < WARN && state === 'play') {
        var g = c.createRadialGradient(L.LW / 2, L.LH / 2, L.LH * 0.35, L.LW / 2, L.LH / 2, L.LH * 0.85);
        g.addColorStop(0, 'rgba(255,200,40,0)'); g.addColorStop(1, 'rgba(255,200,40,' + (0.12 + 0.1 * Math.sin(warnFlash * 8)) + ')'); c.fillStyle = g; c.fillRect(0, 0, L.LW, L.LH);
      }
      if (inv > 0.9 && !reduced) { c.fillStyle = 'rgba(255,60,60,' + (inv - 0.9) * 0.6 + ')'; c.fillRect(0, 0, L.LW, L.LH); }
      drawHUD();
      if (touchMode) {
        var txt = dashCd > 0 ? Math.ceil(dashCd) + '' : '⚡';
        if (txt !== lastDashTxt) { lastDashTxt = txt; dashBtn.textContent = txt; dashBtn.style.opacity = dashCd > 0 ? '0.55' : '1'; }
      }
    }

    /* ----- input ----- */
    function setTouch() { if (touchMode) return; touchMode = true; root.classList.add('wq37r-touch'); if (state === 'ready') showStart(); }
    function onKey(e) {
      if (dead || !root.isConnected) return;
      var k = e.key, code = e.code;
      if (state === 'ready') { if (k === 'Enter' || k === ' ' || code === 'Space') { e.preventDefault(); e.stopPropagation(); begin(); } return; }
      if (k === 'p' || k === 'P' || k === 'Escape') { e.preventDefault(); if (state === 'play') pause(); else if (state === 'paused') resume(); return; }
      if (state === 'paused') { if (k === 'Enter' || k === ' ') { e.preventDefault(); resume(); } return; }
      if ((state === 'won' || state === 'over') && cardShown) { if (k === 'Enter') { e.preventDefault(); replay(); } return; }
      if (state !== 'play') return;
      ensureAudio();
      if (k === 'ArrowUp' || k === 'w' || k === 'W') { e.preventDefault(); if (!e.repeat) changeLane(-1); }
      else if (k === 'ArrowDown' || k === 's' || k === 'S') { e.preventDefault(); if (!e.repeat) changeLane(1); }
      else if (k === ' ' || code === 'Space' || k === 'Enter') { e.preventDefault(); doDash(); }
    }
    var swId = null, swX = 0, swY = 0;
    function onDown(e) {
      if (e.pointerType === 'touch') setTouch();
      ensureAudio();
      if (e.target && e.target.closest && e.target.closest('.wq37r-ov,.wq37r-btn')) return;
      swId = e.pointerId; swX = e.clientX; swY = e.clientY;
    }
    function onMove(e) {
      if (e.pointerId !== swId) return;
      var dy = e.clientY - swY, dx = e.clientX - swX;
      if (Math.abs(dy) > 28 && Math.abs(dy) > Math.abs(dx)) { changeLane(dy < 0 ? -1 : 1); swY = e.clientY; swX = e.clientX; }
    }
    function onUp(e) { if (e.pointerId === swId) swId = null; }
    function ctl(fn) { return function (e) { e.preventDefault(); e.stopPropagation(); if (e.pointerType === 'touch') setTouch(); ensureAudio(); fn(); }; }
    var onUpBtn = ctl(function () { changeLane(-1); }), onDownBtn = ctl(function () { changeLane(1); }), onDashBtn = ctl(doDash);
    var onPauseBtn = ctl(function () { if (state === 'play') pause(); else if (state === 'paused') resume(); });
    function onVis() { if (doc.hidden) pause(); }
    var onResize = function () { if (!dead) layout(); };
    window.addEventListener('keydown', onKey, true);
    root.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
    doc.addEventListener('visibilitychange', onVis);
    window.addEventListener('resize', onResize);
    upBtn.addEventListener('pointerdown', onUpBtn); downBtn.addEventListener('pointerdown', onDownBtn); dashBtn.addEventListener('pointerdown', onDashBtn);
    pauseBtn.addEventListener('pointerdown', onPauseBtn);
    try { if ((window.matchMedia && window.matchMedia('(pointer:coarse)').matches) || (navigator.maxTouchPoints > 0)) touchMode = true; } catch (e) { /* */ }
    if (touchMode) root.classList.add('wq37r-touch');
    layout();
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(function () { if (!dead) layout(); }); ro.observe(container); }

    function frame(now) {
      if (dead) return;
      rafId = requestAnimationFrame(frame);
      var dt = Math.min(0.05, Math.max(0, (now - (lastT || now)) / 1000)); lastT = now;
      var t0 = performance.now();
      try { if (holdGate && state === 'play') tAnim += dt; else step(dt, false); render(); } catch (e) { console.error(e); }
      avgMs = avgMs * 0.95 + (performance.now() - t0) * 0.05;
    }

    function destroy() {
      if (dead) return; dead = true;
      try { cancelAnimationFrame(rafId); } catch (e) { /* */ }
      window.removeEventListener('keydown', onKey, true);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
      window.removeEventListener('pointercancel', onUp);
      window.removeEventListener('resize', onResize);
      doc.removeEventListener('visibilitychange', onVis);
      if (ro) { try { ro.disconnect(); } catch (e) { /* */ } ro = null; }
      try { if (actx) actx.close(); } catch (e) { /* */ }
      actx = null;
      if (root.parentNode) root.parentNode.removeChild(root);
      if (styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
      if (current === inst) current = null;
    }

    var inst = {
      destroy: destroy, pause: pause, resume: resume,
      _state: function () {
        var g = gate && !gate.judged ? gate : null;
        return {
          state: state, lane: lane, hearts: hearts, score: score, combo: combo, gateIndex: gateIdx, gates: N,
          correctWord: g ? g.target.en : null, doors: g ? g.doors.map(function (d) { return { lane: d.lane, word: d.word }; }) : [],
          armed: !!(g && g.x - dist <= curSpeed() * ts / 60 + 1e-6), stagePassed: stagePassed, result: lastResult, boss: bossOn, bossStreak: bossStreak, coins: coins, correct: correct, wrong: wrong,
          dist: dist, shield: shieldLeft, touch: touchMode, cardShown: cardShown, avgRenderMs: avgMs, dashCd: dashCd, speed: curSpeed(), finishX: finishX,
          obstacles: obstacles.length, pickups: pickups.length, bg: worldI
        };
      },
      _lane: function (n) { lane = clamp(n | 0, 0, 2); vl = lane; },
      _advance: advance,
      _hold: function (b) { holdGate = !!b; },
      _god: function (b) { godMode = !!b; }
    };
    current = inst;
    resetGame(); showStart();
    lastT = performance.now(); rafId = requestAnimationFrame(frame);
    return inst;
  }

  Object.defineProperty(API, '_debug', { get: function () { return current ? current._state() : null; } });
  API._debugLane = function (n) { if (current) current._lane(n); };
  API._debugAdvanceToGate = function (lead) { if (current) current._advance(lead); };
  API._debugSeed = function (n) { seedOverride = n | 0; };
  API._debugHold = function (b) { if (current) current._hold(b); };
  API._debugGod = function (b) { if (current) current._god(b); };
  globalThis.WQ37Run = API;
})();
