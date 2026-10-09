/* 字母獵場 Word Blaster - raycast FPS vocabulary mini game (self-contained, no assets). */
(function () {
  'use strict';
  var FONT = '"PingFang HK","Noto Sans HK","Microsoft JhengHei","WenQuanYi Zen Hei","Noto Sans CJK TC",system-ui,sans-serif';
  var EFONT = '"Arial Rounded MT Bold","Trebuchet MS","Noto Sans",Arial,sans-serif';
  var EMOJI = '"Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif';
  var MW = 16, MH = 16;
  var MAPF = new Uint8Array(MW * MH);
  var BESTKEY = 'wq37-fps-best';

  var TWO_PI = Math.PI * 2;
  var COLORS = ['#ff5fa2', '#ffae00', '#17c3a8', '#8e6bff', '#2fa8ff'];
  var DARK = '#2b1d4a';
  var DIFF = {
    speed: [0.30, 0.45, 0.60, 0.80, 1.00],
    bugMax: [1, 1, 2, 3, 4],
    bugSpeed: [0.35, 0.5, 0.75, 1.0, 1.25],
    bugFirst: [30, 22, 12, 8, 5],
    bugEvery: [30, 22, 14, 10, 7],
    spitMax: [1, 1, 2, 2, 3],
    spitFirst: [34, 24, 15, 11, 8],
    spitEvery: [34, 26, 20, 15, 11],
    spitFire: [5.6, 4.7, 3.9, 3.3, 2.8],
    projSpeed: [1.6, 1.8, 2.0, 2.2, 2.4],
    timer: [0, 0, 30, 26, 22]
  };
  var QT = ['zh', 'listen', 'pic'];
  var OFF1 = [0], OFF3 = [-0.14, 0, 0.14];

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
  function rm(arr, i) { arr[i] = arr[arr.length - 1]; arr.pop(); }
  function easeBack(u) { var c1 = 2.70158; return 1 + c1 * Math.pow(u - 1, 3) + 1.70158 * Math.pow(u - 1, 2); }
  function multOf(c) { return c >= 6 ? 3 : c >= 3 ? 2 : 1; }
  function loadBest() { try { return parseInt(localStorage.getItem(BESTKEY), 10) || 0; } catch (e) { return 0; } }
  function saveBest(v) { try { localStorage.setItem(BESTKEY, String(v)); } catch (e) { /* */ } }
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

  /* ---------- arenas: layouts + procedural palettes ---------- */
  function ang2(x, y) { return Math.abs((x & 31) - 16) + Math.abs((y & 31) - 16); }
  var ARENAS = [
    {
      name: '星空基地', en: 'Space Base', fog: [38, 30, 92], sky: '#1b1450',
      map: ['2222222222222222', '1000000000000001', '1003300000033001', '1003000000003001', '1000044000044001', '1000000000000001', '1000500000050001', '1000000000000001',
        '1000000000000001', '1000500000050001', '1000044000044001', '1003000000003001', '1003300000033001', '1000000000000001', '1000000000000001', '2222222222222222'],
      walls: [null,
        function (x, y) { var n = hash(x, y) * 12; if ((y & 31) < 2 || (x & 31) < 2) return [40, 46, 100]; if (y % 32 > 27 || y % 32 < 4 && y % 32 > 1) return (x & 7) < 6 ? [90, 245, 255] : [40, 120, 160]; return [100 + n, 112 + n, 176 + n * 0.6]; },
        function (x, y) { var s = ((x + y) >> 3) & 1, n = hash(x, y) * 10; return s ? [255, 200 + n, 40] : [48, 48, 84]; },
        function (x, y) { var d = Math.sqrt(Math.pow((x & 31) - 16, 2) + Math.pow((y & 31) - 16, 2)), n = hash(x, y) * 10; if ((x & 31) < 2 || (y & 31) < 2) return [20, 30, 80]; if (d < 4.5) return [255, 225, 255]; if (d > 7 && d < 10) return [255, 90, 200]; return [50 + n, 66 + n, 160]; },
        function (x, y) { var tx = x & 31, ty = y & 31, n = hash(x, y) * 8; if (tx < 2 || ty < 2) return [90, 20, 100]; if ((x & 7) < 3 && ty > 6 && ty < 26) return [70, 20, 80]; return [175 + n, 70 + n, 175 + n]; },
        function (x, y) { var gx = x >> 3, gy = y >> 3, h = hash(gx, gy), n = hash(x, y) * 8; if (h > 0.55 && (((x & 7) === 3 && h > 0.75) || ((y & 7) === 3 && h <= 0.75))) return (x & 7) === 3 && (y & 7) === 3 ? [255, 255, 255] : [120, 255, 230]; return [20 + n, 105 + n, 112 + n]; }],
      floor: function (x, y) { var chk = ((x >> 5) + (y >> 5)) & 1, n = hash(x, y) * 8; if ((x & 31) < 2 || (y & 31) < 2) return [70, 205, 245]; return chk ? [52 + n, 56 + n, 124] : [40 + n, 44 + n, 100]; },
      ceil: function (x, y) { var h = hash(x * 3, y * 7), v = Math.sin(x * 0.2) + Math.cos(y * 0.15); if (h > 0.985) return [255, 255, 255]; if (h > 0.96) return [150, 170, 255]; return [16 + (v > 0.8 ? 26 : 0), 14, 54 + (v > 0.8 ? 30 : 0)]; }
    },
    {
      name: '叢林遺跡', en: 'Jungle Ruins', fog: [186, 228, 164], sky: '#8fd07a',
      map: ['2222222222222222', '1000000000000001', '1022000000002201', '1020000000000201', '1000030000300001', '1000000000000001', '1000440000440001', '1000400000040001',
        '1000000000000001', '1000030000300001', '1002000000002001', '1002200000022001', '1000000000000001', '1000440000440001', '1000000000000001', '2222222222222222'],
      walls: [null,
        function (x, y) { var row = y >> 4, ox = (row & 1) ? 16 : 0, bx = (x + ox) & 31, v = hash(row * 7 + ((x + ox) >> 5), 5) * 30 - 15, n = hash(x, y) * 12; if ((y & 15) < 2 || bx < 2) return [58, 70, 48]; if (hash(x >> 2, y >> 2) > 0.72) return [70 + n, 132 + n, 50]; return [128 + v + n, 130 + v + n, 106 + v]; },
        function (x, y) { var l = hash(x >> 2, y >> 2), n = hash(x, y) * 14; return l > 0.5 ? [58 + n, 152 + n, 62] : [26 + n, 96 + n, 46]; },
        function (x, y) { var p = x >> 4, h = hash(p, 9), n = hash(x, y) * 10; if ((x & 15) < 2) return [68, 38, 20]; return [150 + h * 24 + n - ((y + p * 9) % 17 < 2 ? 25 : 0), 96 + h * 16 + n * 0.6, 52]; },
        function (x, y) { var tx = x & 31, ty = y & 31, a = ang2(x, y), n = hash(x, y) * 10; if (tx < 2 || ty < 2) return [120, 98, 56]; if ((a > 8 && a < 11) || a < 3) return [112, 90, 50]; return [205 + n, 184 + n, 124 + n]; },
        function (x, y) { var vx = 32 + Math.sin(y * 0.15) * 12, n = hash(x, y) * 10; if (Math.abs(x - vx) < 2.5 || Math.abs(x - vx - 4 + Math.sin(y * 0.3) * 3) < 1.2) return [50 + n, 150 + n, 55]; if (hash(x, y) > 0.995) return [255, 120, 170]; return [112 + n, 118 + n, 96]; }],
      floor: function (x, y) { var chk = ((x >> 5) + (y >> 5)) & 1, n = hash(x, y) * 14; if ((x & 31) < 1 || (y & 31) < 1) return [62, 104, 42]; if (hash(x, y) > 0.992) return [255, 230, 90]; return chk ? [98 + n, 152 + n, 64] : [80 + n, 128 + n, 52]; },
      ceil: function (x, y) { var l = hash(x >> 2, y >> 2), n = hash(x, y) * 10; if (hash(x >> 3, y >> 3) > 0.86) return [225, 255, 160]; return l > 0.5 ? [44 + n, 126 + n, 58] : [28 + n, 94 + n, 46]; }
    },
    {
      name: '冰晶洞穴', en: 'Crystal Ice Cave', fog: [176, 216, 250], sky: '#bfe6ff',
      map: ['2222222222222222', '1100000000000011', '1000000000000001', '1000550000550001', '1000500000050001', '1000000000000001', '1000000000000001', '1000000000330001',
        '1003300000330001', '1000000000000001', '1050000000000501', '1055000000005501', '1000000000000001', '1000000000000001', '1100000000000011', '2222222222222222'],
      walls: [null,
        function (x, y) { var tx = x & 31, ty = y & 31, g = ty * 1.4, n = hash(x, y) * 8; if (tx < 2 || ty < 2) return [232, 248, 255]; if ((x * 2 + y) % 41 < 2 && hash(x >> 3, y >> 3) > 0.55) return [255, 255, 255]; return [118 + g * 0.5 + n, 196 + g * 0.5 + n, 250]; },
        function (x, y) { var n = hash(x, y) * 12; if (hash(x, y) > 0.985) return [255, 255, 255]; return [58 + n + (((y >> 3) & 1) ? 12 : 0), 82 + n, 158 + n]; },
        function (x, y) { var row = y >> 4, ox = (row & 1) ? 16 : 0, bx = (x + ox) & 31, n = hash(x, y) * 10; if ((y & 15) < 2 || bx < 2) return [168, 196, 228]; return [232 + n * 0.3, 244, 255]; },
        function (x, y) { var tx = x & 31, ty = y & 31; if (tx < 2 || ty < 2 || Math.abs(tx - ty) < 2) return [255, 255, 255]; return tx < ty ? [110, 236, 236] : [66, 186, 224]; },
        function (x, y) { var a = ang2(x, y), n = hash(x, y) * 8; if ((x & 31) < 2 || (y & 31) < 2) return [226, 214, 255]; return a < 6 ? [226 + n, 210, 255] : a < 13 ? [178 + n, 160 + n, 252] : [130 + n, 112 + n, 232]; }],
      floor: function (x, y) { var chk = ((x >> 5) + (y >> 5)) & 1, n = hash(x, y) * 8; if ((x & 31) < 1 || (y & 31) < 1) return [214, 240, 255]; if ((x * 3 + y * 2) % 53 < 1) return [255, 255, 255]; return chk ? [168 + n, 220 + n, 250] : [152 + n, 206 + n, 244]; },
      ceil: function (x, y) { var len = 14 - Math.abs((x & 15) - 8) * 1.7, n = hash(x, y) * 8; if ((y & 31) < len) return [214, 240, 255]; return [44 + n, 74 + n, 150 + n]; }
    }
  ];
  function setArena(i) { var m = ARENAS[i].map; for (var y = 0; y < MH; y++) for (var x = 0; x < MW; x++) MAPF[y * MW + x] = m[y].charCodeAt(x) - 48; }
  setArena(0);

  /* ---------- procedural textures (per arena, built lazily) ---------- */
  function pack(r, g, b) { return (255 << 24) | (clamp(b | 0, 0, 255) << 16) | (clamp(g | 0, 0, 255) << 8) | clamp(r | 0, 0, 255); }
  var TEXS = [];
  function buildTextures(ai) {
    if (TEXS[ai]) return TEXS[ai];
    var A = ARENAS[ai], FOG = A.fog, fns = A.walls, TEX = { wall: [], floor: [], ceil: [] };
    var t, lvl, i, x, y, base, arr, k, c;
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
    for (y = 0; y < 64; y++) for (x = 0; x < 64; x++) { fb[y * 64 + x] = A.floor(x, y); cb[y * 64 + x] = A.ceil(x, y); }
    for (lvl = 0; lvl < 16; lvl++) {
      k = lvl / 15 * 0.72;
      var fa = new Uint32Array(4096), ca = new Uint32Array(4096);
      for (i = 0; i < 4096; i++) {
        c = fb[i]; fa[i] = pack(c[0] * (1 - k) + FOG[0] * k, c[1] * (1 - k) + FOG[1] * k, c[2] * (1 - k) + FOG[2] * k);
        c = cb[i]; ca[i] = pack(c[0] * (1 - k) + FOG[0] * k, c[1] * (1 - k) + FOG[1] * k, c[2] * (1 - k) + FOG[2] * k);
      }
      TEX.floor[lvl] = fa; TEX.ceil[lvl] = ca;
    }
    TEXS[ai] = TEX;
    return TEX;
  }

  /* ---------- CSS ---------- */
  var CSS = '.wq37-root{position:relative;width:100%;height:100%;overflow:hidden;background:#8fd3ff;user-select:none;-webkit-user-select:none;touch-action:none;font-family:' + FONT + ';-webkit-tap-highlight-color:transparent}' +
    '.wq37-root canvas{position:absolute;left:0;top:0;width:100%;height:100%;touch-action:none;display:block}' +
    '.wq37-btn{position:absolute;border:3px solid #2b1d4a;border-radius:50%;background:rgba(255,255,255,.88);color:#2b1d4a;font-weight:800;display:flex;align-items:center;justify-content:center;touch-action:none;cursor:pointer;box-shadow:0 4px 0 rgba(43,29,74,.35);font-family:' + FONT + ';padding:0}' +
    '.wq37-fire{right:18px;bottom:22px;width:92px;height:92px;font-size:44px;background:rgba(255,95,162,.92);display:none}' +
    '.wq37-pause{right:8px;top:8px;width:56px;height:56px;font-size:24px}' +
    '.wq37-say{right:8px;top:72px;width:56px;height:56px;font-size:26px;background:rgba(255,227,106,.95);display:none}' +
    '.wq37-say.on{display:flex}' +
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
    '.wq37-rec{display:inline-block;margin:4px 0;padding:4px 16px;border-radius:30px;background:#ffe36a;border:3px solid #2b1d4a;color:#d81b60;font:900 22px ' + EFONT + ';animation:wq37pop .7s ease-in-out infinite alternate}' +
    '@keyframes wq37pop{from{transform:scale(1) rotate(-3deg)}to{transform:scale(1.12) rotate(3deg)}}' +
    '@media (prefers-reduced-motion:reduce){.wq37-rec{animation:none}}' +
    '.wq37-stat{display:flex;gap:8px;justify-content:center;margin:8px 0}.wq37-stat div{flex:1;background:#fff0b8;border:2px solid #ffae00;border-radius:12px;padding:6px 2px;font-weight:800;font-size:20px}.wq37-stat span{display:block;font-size:13px;font-weight:700}';

  var current = null;

  function start(container, opts) {
    opts = opts || {};
    var words = (opts.words || []).filter(function (w) { return w && w.en; });
    if (words.length < 4) throw new Error('WQ37FPS: need at least 4 words');
    var diff = clamp(Math.round(opts.difficulty || 1), 1, 5), di = diff - 1;
    var totalRounds = Math.max(1, opts.rounds | 0 || 10);
    var soundOn = opts.sound !== false;
    var bossOn = opts.boss !== false;
    var reduceMotion = false;
    try { reduceMotion = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { /* */ }

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
    var sayBtn = document.createElement('button'); sayBtn.className = 'wq37-btn wq37-say'; sayBtn.setAttribute('aria-label', '再聽一次'); sayBtn.textContent = '🔊';
    var joy = document.createElement('div'); joy.className = 'wq37-joy'; var knob = document.createElement('div'); knob.className = 'wq37-knob'; joy.appendChild(knob);
    fireBtn.style.fontFamily = pauseBtn.style.fontFamily = sayBtn.style.fontFamily = EMOJI;
    root.appendChild(joy); root.appendChild(fireBtn); root.appendChild(pauseBtn); root.appendChild(sayBtn);
    var ovEl = null;

    /* game state */
    var P = { x: 7.5, y: 12.5, a: -Math.PI / 2 };
    var G = {};
    var keys = {};
    var targets = [], bugs = [], spits = [], projs = [], pickups = [], parts = [], floaters = [], trails = [];
    var order = [], cur = null, arenaIdx = 0, LW = {};
    var jx = 0, jy = 0, joyId = null, joyOx = 0, joyOy = 0, lookId = null, lookX = 0;
    var touchMode = false, dragging = false, lockDenied = false, wasLocked = false;
    var shake = 0, flash = 0, flashCol = '255,60,90', hint = null, gunBob = 0, recoil = 0, cool = 0, muzzle = 0, hitM = 0;
    var avgMs = 0, introA = 0, resultShown = false, overT = 0, lastResult = null, finishedCalled = false;
    var ro = null, sayShown = false;
    var PJ = { x: 0, y: 0, depth: 0, size: 0 };
    var SP = [], SL = [], sn = 0, MZ = { x: 0, y: 0 };
    function cmpDepth(a, b) { return b.d - a.d; }

    function waveOf(r) { return Math.min(2, Math.floor((r - 1) * 3 / totalRounds)); }
    function resetGame() {
      G = { score: 0, correct: 0, wrong: 0, hearts: 3, hpLost: 0, combo: 0, maxCombo: 0, round: 1, playTime: 0, shield: false, triple: 0, freezeW: 0, freezeT: 0, slow: 0, invul: 0,
        bugTimer: DIFF.bugFirst[di], spitTimer: DIFF.spitFirst[di], pickTimer: rand(10, 15), roundT: 0, roundMax: 0, won: false, wave: -1, qtype: 'zh', qT: 0, sayT: 0, sayRep: 0,
        boss: null, bossBeaten: false, banner: null, calm: false, confT: 0, respawn: [], best: loadBest() };
      P.x = 7.5; P.y = 12.5; P.a = -Math.PI / 2;
      bugs.length = 0; spits.length = 0; projs.length = 0; pickups.length = 0; parts.length = 0; floaters.length = 0; trails.length = 0; targets.length = 0;
      order = [];
      var pool = [], last = -1;
      while (order.length < totalRounds) {
        if (!pool.length) { pool = shuffle(words.map(function (_, i) { return i; })); if (pool[pool.length - 1] === last) pool.reverse(); }
        last = pool.pop(); order.push(last);
      }
      resultShown = false; finishedCalled = false; lastResult = null; overT = 0; hint = null; shake = 0; flash = 0;
      startRound(true);
    }
    function enterArena(w, first) {
      G.wave = w; arenaIdx = w; setArena(w); buildTextures(w);
      P.x = 7.5; P.y = 12.5; P.a = -Math.PI / 2;
      bugs.length = 0; spits.length = 0; projs.length = 0; pickups.length = 0; G.respawn.length = 0;
      G.bugTimer = Math.max(6, DIFF.bugFirst[di] * (first ? 1 : 0.6)); G.spitTimer = Math.max(8, DIFF.spitFirst[di] * (first ? 1 : 0.7));
      G.banner = { t: 2.6, max: 2.6, text: '第 ' + (w + 1) + ' 波', sub: ARENAS[w].name + ' · ' + ARENAS[w].en, boss: false };
      if (!first) { flash = 0.7; flashCol = '255,255,255'; SFX.wave(); }
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
    function canHear() { return soundOn && typeof window.speechSynthesis !== 'undefined' && typeof window.SpeechSynthesisUtterance !== 'undefined'; }
    function pickQType(c, round) {
      var t = QT[(round - 1) % 3];
      if (t === 'pic' && !(c.emoji || c.zh)) t = 'zh';
      return t;
    }
    function startRound(first) {
      var w = waveOf(G.round);
      if (w !== G.wave) enterArena(w, first);
      var c = words[order[G.round - 1]];
      cur = c; G.qtype = pickQType(c, G.round); G.qT = 0; G.sayRep = 0;
      G.sayT = G.qtype === 'listen' ? (G.banner && G.banner.t > 0.5 ? 1.5 : 0.9) : 0;
      var ds = pickDistractors(c, 3), list = shuffle([c].concat(ds));
      targets.length = 0;
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
      if (G.boss) { addLetter(false); return; }
      var alive = targets.map(function (t) { return t.w; });
      var c = words.filter(function (w) { return w !== cur && alive.indexOf(w) < 0 && w.en.toLowerCase() !== cur.en.toLowerCase(); });
      if (!c.length) return;
      var w = c[(Math.random() * c.length) | 0];
      var used = {}; targets.forEach(function (t) { used[t.col] = 1; });
      var col = 0; while (used[col] && col < 4) col++;
      targets.push(makeTarget(w, P.a, 1.0, col, false));
      targets[targets.length - 1].age = 0;
    }

    /* ----- boss: spell the word letter by letter ----- */
    function letterW(L) { return LW[L] || (LW[L] = { en: L }); }
    function startBoss() {
      var c = words.filter(function (w) { return /^[A-Za-z]{3,7}$/.test(w.en); });
      if (!c.length) c = words.filter(function (w) { return /[A-Za-z]/.test(w.en); });
      if (!c.length) c = words;
      var w = c[(Math.random() * c.length) | 0];
      var L = w.en.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 8).split('');
      cur = w; G.qtype = 'zh'; G.roundT = G.roundMax = 0; G.sayT = 0;
      G.boss = { w: w, letters: L, idx: 0, hp: L.length, max: L.length, x: 7.5, y: 5.6, t: 0, hit: 0, atk: 0, appear: 0, dead: false, reveal: false };
      P.x = 7.5; P.y = 12.5; P.a = -Math.PI / 2;
      bugs.length = 0; spits.length = 0; projs.length = 0; pickups.length = 0; G.respawn.length = 0;
      G.bugTimer = Math.max(8, DIFF.bugFirst[di]); G.spitTimer = Math.max(10, DIFF.spitFirst[di] * 0.8);
      G.banner = { t: 3, max: 3, text: 'BOSS 字母怪獸', sub: '依次射出字母,拼出「' + (w.zh || w.en) + '」', boss: true };
      flash = 0.7; flashCol = '255,80,80'; SFX.roar();
      targets.length = 0; spawnLetters(true);
    }
    function addLetter(first) {
      var B = G.boss, need = B.letters[B.idx], have = {}, i;
      for (i = 0; i < targets.length; i++) have[targets[i].w.en] = 1;
      var L;
      if (Math.random() < 0.5) { var pool = B.letters.filter(function (l) { return l !== need && !have[l]; }); L = pool.length ? pool[(Math.random() * pool.length) | 0] : null; }
      for (i = 0; !L && i < 40; i++) { var c = String.fromCharCode(65 + ((Math.random() * 26) | 0)); if (c !== need && !have[c]) L = c; }
      if (!L) return;
      var used = {}; targets.forEach(function (t) { used[t.col] = 1; });
      var col = 0; while (used[col] && col < 4) col++;
      var t = makeTarget(letterW(L), P.a, 1.0, col, false); t.age = first ? -1.4 : 0;
      targets.push(t);
    }
    function spawnLetters(first) {
      var B = G.boss, need = B.letters[B.idx], list = [need], have = {}, n = diff >= 4 ? 5 : 4, i;
      have[need] = 1;
      var rest = shuffle(B.letters.filter(function (l, k) { return l !== need && B.letters.indexOf(l) === k; }));
      for (i = 0; i < rest.length && list.length < 3; i++) if (!have[rest[i]]) { have[rest[i]] = 1; list.push(rest[i]); }
      while (list.length < n) { var c = String.fromCharCode(65 + ((Math.random() * 26) | 0)); if (!have[c]) { have[c] = 1; list.push(c); } }
      shuffle(list); targets.length = 0;
      for (i = 0; i < list.length; i++) {
        var a = P.a + (-0.95 + 1.9 * (i + 0.5) / list.length) * Math.atan(PL) + rand(-0.04, 0.04);
        var t = makeTarget(letterW(list[i]), a, 0.0001, i, list[i] === need);
        t.age = first ? -1.4 - i * 0.12 : 0; targets.push(t);
      }
    }
    function hitLetter(t) {
      var B = G.boss;
      G.combo++; G.maxCombo = Math.max(G.maxCombo, G.combo); G.correct++;
      var m = multOf(G.combo), pts = 150 * m; G.score += pts;
      B.idx++; B.hp--; B.hit = 0.55; B.reveal = false;
      floater('+' + pts, cw / 2, ch * 0.62, '#ffe36a', 34);
      var pr = project(B.x, B.y, 0.95, PJ); if (pr) floater('-1 HP', pr.x, pr.y, '#ff8aa8', 36);
      burst(t.x, t.y, 0.55, 26, ['#ffe36a', '#ff5fa2', '#7fe3ff', '#ffffff'], 1.3);
      burst(B.x, B.y, 1.0, 26, ['#ff8aa8', '#ffe36a', '#fff'], 1.6);
      SFX.good(); SFX.boom(); hitM = 0.2; flash = 0.2; flashCol = '255,235,120';
      if (!reduceMotion) shake = Math.max(shake, 0.2);
      if (B.hp <= 0) { bossDefeated(); return; }
      spawnLetters(false);
    }
    function bossCounter() {
      var B = G.boss;
      B.atk = 0.9; B.reveal = true; G.combo = 0;
      hint = { text: '怪獸反擊!要射字母「' + B.letters[B.idx] + '」', t: 2.4 };
      flash = 0.5; flashCol = '255,60,90'; SFX.roar();
      loseHeart('boss');
    }
    function bossDefeated() {
      var B = G.boss; B.dead = true; B.hp = 0; G.bossBeaten = true; G.score += 500 * multOf(Math.max(1, G.combo)); targets.length = 0;
      floater('打敗怪獸!', cw / 2, ch * 0.45, '#ffe36a', 44);
      burst(B.x, B.y, 1.0, 90, ['#ffe36a', '#ff5fa2', '#7fe3ff', '#fff', '#8e6bff'], 2.2);
      G.confT = 2.4; G.banner = { t: 2.6, max: 2.6, text: '勝利!', sub: '字母怪獸被打敗了', boss: false };
      finish(true);
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
      spit: function () { tone(300, 0.2, 'sawtooth', 0.07, 600); },
      freeze: function () { tone(1500, 0.25, 'sine', 0.08, 500); },
      boom: function () { tone(120, 0.3, 'square', 0.14, 40); },
      roar: function () { tone(180, 0.5, 'sawtooth', 0.14, 70); },
      wave: function () { tone(440, 0.12, 'triangle', 0.14); tone(660, 0.12, 'triangle', 0.14, 0, 0.1); tone(880, 0.25, 'triangle', 0.14, 0, 0.2); },
      end: function () { tone(392, 0.15, 'triangle', 0.18); tone(523, 0.15, 'triangle', 0.18, 0, 0.15); tone(659, 0.15, 'triangle', 0.18, 0, 0.3); tone(784, 0.35, 'triangle', 0.18, 0, 0.45); }
    };
    function speak(text) {
      if (!canHear() || !gestured) return;
      try { var sy = window.speechSynthesis; sy.cancel(); var u = new window.SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = 0.85; sy.speak(u); } catch (e) { /* */ }
    }

    /* ----- effects ----- */
    function burst(x, y, z, n, cols, sp) {
      for (var i = 0; i < n; i++) {
        if (parts.length > 260) break;
        var a = rand(0, TWO_PI), v = rand(0.5, 1.8) * (sp || 1);
        parts.push({ x: x, y: y, z: z, vx: Math.cos(a) * v, vy: Math.sin(a) * v, vz: rand(0.2, 1.8), life: rand(0.5, 1.0), max: 1, col: cols[(Math.random() * cols.length) | 0], r: rand(3, 7) });
      }
    }
    function floater(text, x, y, col, size) { if (floaters.length > 12) floaters.shift(); floaters.push({ text: text, x: x, y: y, t: 0, col: col || '#fff', size: size || 26 }); }
    function loseHeart(reason) {
      if (G.shield) { G.shield = false; floater('護盾!', cw / 2, ch * 0.45, '#7fe3ff', 34); tone(500, 0.2, 'sine', 0.12, 250); return false; }
      G.hearts--; G.hpLost++; G.combo = 0; if (!reduceMotion) shake = 0.45; flash = 0.4; flashCol = '255,60,90';
      if (G.hearts <= 0) finish(false);
      return true;
    }

    /* ----- firing ----- */
    function targetAngle(o) { return Math.atan2(o.y - P.y, o.x - P.x); }
    function rayHit(ang) {
      var best = null, bestScore = 1e9, list = [], i;
      for (i = 0; i < targets.length; i++) list.push([targets[i], 'target', 0.55]);
      for (i = 0; i < bugs.length; i++) list.push([bugs[i], 'bug', 0.4]);
      for (i = 0; i < spits.length; i++) list.push([spits[i], 'spit', 0.45]);
      for (i = 0; i < projs.length; i++) list.push([projs[i], 'proj', 0.3]);
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
      recoil = 1; muzzle = 0.14; SFX.shoot();
      var offs = G.triple > 0 ? OFF3 : OFF1, hits = [], i, tc = G.freezeW > 0 ? '#c9f3ff' : G.triple > 0 ? '#ffd23f' : '#7fe3ff';
      for (i = 0; i < offs.length; i++) {
        var ang = P.a + (offset || 0) + offs[i], h = rayHit(ang);
        var endD = h ? h.d : Math.min(rayDist(P.x, P.y, ang, 12), 12);
        if (trails.length < 8) trails.push({ x: P.x + Math.cos(ang) * endD, y: P.y + Math.sin(ang) * endD, t: 0, c: tc });
        if (h && hits.every(function (q) { return q.o !== h.o; })) hits.push(h);
      }
      if (G.freezeW > 0) {
        if (G.freezeT <= 0 && (bugs.length || spits.length || projs.length)) floater('冰凍!', cw / 2, ch * 0.4, '#bfefff', 36);
        G.freezeT = 3; SFX.freeze();
      }
      var corr = null, wrongs = [];
      if (hits.length) hitM = 0.18;
      hits.forEach(function (h) {
        if (h.kind === 'target') { if (h.o.correct) corr = h; else wrongs.push(h); }
        else if (h.kind === 'bug') hitBug(h.o);
        else if (h.kind === 'spit') hitSpit(h.o);
        else if (h.kind === 'proj') hitProj(h.o);
        else collect(h.o);
      });
      if (state !== 'play') return;
      if (corr) { if (G.boss) hitLetter(corr.o); else hitCorrect(corr.o); }
      else if (wrongs.length) {
        wrongs.forEach(popWrong);
        G.wrong++; G.combo = 0;
        if (G.boss) bossCounter(); else { loseHeart('wrong'); SFX.bad(); }
      }
    }
    function hitCorrect(t) {
      var bonus = G.roundMax ? Math.round(40 * clamp(G.roundT / G.roundMax, 0, 1)) : 0;
      G.combo++; G.maxCombo = Math.max(G.maxCombo, G.combo);
      var m = multOf(G.combo), pts = (100 + 10 * Math.min(G.combo - 1, 5) + bonus) * m;
      G.score += pts; G.correct++;
      var pr = project(t.x, t.y, 0.55, PJ);
      floater('+' + pts, pr ? pr.x : cw / 2, pr ? pr.y : ch / 2, '#ffe36a', 34);
      burst(t.x, t.y, 0.55, 34, ['#ffe36a', '#ff5fa2', '#7fe3ff', '#ffffff', '#8e6bff'], 1.3);
      targets.forEach(function (o) { if (o !== t) burst(o.x, o.y, 0.55, 8, [COLORS[o.col], '#fff'], 0.8); });
      SFX.good(); flash = 0.25; flashCol = '255,235,120'; speak(cur.en);
      if (m > 1) floater('分數 x' + m + '!', cw / 2, ch * 0.4, m > 2 ? '#ff5fa2' : '#ffb347', 34);
      if (G.combo >= 3) floater('連擊 x' + G.combo + '!', cw / 2, ch * 0.34, '#ff9ad0', 34);
      if (G.round >= totalRounds) { targets.length = 0; if (bossOn) startBoss(); else finish(true); return; }
      G.round++; startRound(false);
    }
    function popWrong(h) {
      var t = h.o, i = targets.indexOf(t);
      if (i >= 0) targets.splice(i, 1);
      burst(t.x, t.y, 0.55, 16, [COLORS[t.col], '#fff'], 1);
      if (!G.boss) hint = { text: '「' + t.w.en + '」＝ ' + (t.w.zh || ''), t: 2.2 };
      G.respawn.push(2.2);
    }
    function hitBug(b) {
      var i = bugs.indexOf(b); if (i >= 0) bugs.splice(i, 1);
      G.score += 50; burst(b.x, b.y, 0.3, 20, ['#9be564', '#ffe36a', '#fff'], 1.1); SFX.bug();
      var pr = project(b.x, b.y, 0.3, PJ); floater('+50', pr ? pr.x : cw / 2, pr ? pr.y : ch / 2, '#b6f26b', 28);
    }
    function hitSpit(s) {
      var i = spits.indexOf(s); if (i >= 0) spits.splice(i, 1);
      G.score += 80; burst(s.x, s.y, 0.4, 26, ['#c9a0ff', '#ff9a3c', '#fff'], 1.2); SFX.bug();
      var pr = project(s.x, s.y, 0.4, PJ); floater('+80', pr ? pr.x : cw / 2, pr ? pr.y : ch / 2, '#d9b8ff', 30);
    }
    function hitProj(p) {
      var i = projs.indexOf(p); if (i >= 0) projs.splice(i, 1);
      G.score += 10; burst(p.x, p.y, 0.45, 12, ['#ffb347', '#fff'], 0.9); SFX.bug();
    }
    function collect(p) {
      var i = pickups.indexOf(p); if (i >= 0) pickups.splice(i, 1);
      var msg = '';
      if (p.type === 'slow') { G.slow = 7; msg = '慢動作!'; }
      else if (p.type === 'triple') { G.triple = 12; msg = '散射彈!'; }
      else if (p.type === 'freeze') { G.freezeW = 12; msg = '冰凍彈! 開火凍住怪物'; }
      else if (p.type === 'shield') { G.shield = true; msg = '護盾!'; }
      else { G.hearts = Math.min(3, G.hearts + 1); msg = '+1 心'; }
      burst(p.x, p.y, 0.5, 20, ['#fff', '#ffe36a', '#7fe3ff'], 1);
      floater(msg, cw / 2, ch * 0.4, '#fff', 36); SFX.pick();
    }
    function fireProj(sx, sy, sp) {
      var dx = P.x - sx, dy = P.y - sy, d = Math.sqrt(dx * dx + dy * dy) || 1;
      projs.push({ x: sx, y: sy, vx: dx / d * sp, vy: dy / d * sp, life: 8, ph: rand(0, 6) });
    }

    /* ----- projection ----- */
    function project(wx, wy, z, out) {
      var dx = wx - P.x, dy = wy - P.y, c = Math.cos(P.a), s = Math.sin(P.a);
      var depth = dx * c + dy * s, lat = -dx * s + dy * c;
      if (depth < 0.15) return null;
      out = out || {};
      out.x = (RW / 2 + F * lat / depth) * S; out.y = (RH / 2 - F * (z - 0.5) / depth) * S; out.depth = depth; out.size = F / depth * S;
      return out;
    }

    /* ----- update ----- */
    function moveEntity(o, dt, r) {
      var nx = o.x + o.vx * dt, ny = o.y + o.vy * dt;
      if (isFree(nx, o.y, r)) o.x = nx; else o.vx = -o.vx;
      if (isFree(o.x, ny, r)) o.y = ny; else o.vy = -o.vy;
    }
    function updateEnemies(dt, sf) {
      var fz = G.freezeT > 0, i, d, dx, dy;
      /* bugs */
      G.bugTimer -= dt;
      var bugCap = DIFF.bugMax[di] + (G.wave >= 2 && di >= 2 ? 1 : 0);
      if (G.bugTimer <= 0 && bugs.length < bugCap && !G.calm) {
        var bp = spawnPos(0, TWO_PI, 5, 9);
        bugs.push({ x: bp.x, y: bp.y, vx: 0, vy: 0, ph: rand(0, 6) });
        G.bugTimer = DIFF.bugEvery[di];
      } else if (G.bugTimer <= 0) G.bugTimer = 3;
      for (i = bugs.length - 1; i >= 0; i--) {
        if (fz) break;
        var b = bugs[i]; dx = P.x - b.x; dy = P.y - b.y; d = Math.sqrt(dx * dx + dy * dy) || 1;
        var bs = DIFF.bugSpeed[di] * sf, wob = Math.sin(G.playTime * 3 + b.ph) * 0.5;
        b.vx = (dx / d + -dy / d * wob) * bs; b.vy = (dy / d + dx / d * wob) * bs;
        var nx = b.x + b.vx * dt, ny = b.y + b.vy * dt;
        if (isFree(nx, b.y, 0.25)) b.x = nx; if (isFree(b.x, ny, 0.25)) b.y = ny;
        if (d < 0.6 && G.invul <= 0) {
          rm(bugs, i); G.invul = 1.5; burst(b.x, b.y, 0.3, 12, ['#ffe36a', '#ff6a6a'], 1); SFX.zap();
          flash = 0.35; flashCol = '255,230,60'; floater('呀! 被電到', cw / 2, ch * 0.42, '#fff', 32);
          loseHeart('bug'); if (state !== 'play') return;
        }
      }
      /* spitters: keep distance, strafe, telegraph then fire a slow dodgeable orb */
      G.spitTimer -= dt;
      var spCap = DIFF.spitMax[di] + (G.wave >= 2 ? 1 : 0);
      if (G.spitTimer <= 0 && spits.length < spCap && !G.calm) {
        var sp0 = spawnPos(0, TWO_PI, 6, 10);
        spits.push({ x: sp0.x, y: sp0.y, vx: 0, vy: 0, ph: rand(0, 6), fireT: rand(2.2, 3.6), warn: 0, dir: Math.random() < 0.5 ? 1 : -1, dirT: rand(2, 4) });
        G.spitTimer = DIFF.spitEvery[di];
      } else if (G.spitTimer <= 0) G.spitTimer = 4;
      for (i = spits.length - 1; i >= 0; i--) {
        if (fz) break;
        var s = spits[i]; dx = P.x - s.x; dy = P.y - s.y; d = Math.sqrt(dx * dx + dy * dy) || 1;
        var ux = dx / d, uy = dy / d, want = d < 4.5 ? -1 : d > 7.5 ? 1 : 0;
        s.dirT -= dt; if (s.dirT <= 0) { s.dir = -s.dir; s.dirT = rand(2, 4); }
        var svx = (ux * want * 0.8 - uy * s.dir * 0.5) * sf, svy = (uy * want * 0.8 + ux * s.dir * 0.5) * sf;
        var sx = s.x + svx * dt, sy = s.y + svy * dt;
        if (isFree(sx, s.y, 0.35)) s.x = sx; else s.dir = -s.dir; if (isFree(s.x, sy, 0.35)) s.y = sy; else s.dir = -s.dir;
        s.fireT -= dt * sf; s.warn = s.fireT < 0.8 && s.fireT > 0 ? 1 - s.fireT / 0.8 : 0;
        if (s.fireT <= 0) {
          if (d < 11 && rayDist(s.x, s.y, Math.atan2(dy, dx), d + 0.5) >= d - 0.3) { fireProj(s.x, s.y, DIFF.projSpeed[di]); SFX.spit(); s.fireT = DIFF.spitFire[di] * rand(0.9, 1.2); }
          else s.fireT = 0.6;
        }
      }
      for (i = projs.length - 1; i >= 0; i--) {
        var pj = projs[i]; pj.life -= dt;
        if (pj.life <= 0) { rm(projs, i); continue; }
        if (fz) continue;
        pj.x += pj.vx * dt * sf; pj.y += pj.vy * dt * sf;
        if (!isFree(pj.x, pj.y, 0.05)) { burst(pj.x, pj.y, 0.45, 6, ['#ffb347', '#fff'], 0.6); rm(projs, i); continue; }
        dx = pj.x - P.x; dy = pj.y - P.y;
        if (dx * dx + dy * dy < 0.25 && G.invul <= 0) {
          rm(projs, i); G.invul = 1.2; burst(pj.x, pj.y, 0.45, 16, ['#ffb347', '#ff5a3c', '#fff'], 1.1); SFX.zap();
          flash = 0.4; flashCol = '255,140,40'; floater('被火球打中!', cw / 2, ch * 0.42, '#fff', 32);
          loseHeart('proj'); if (state !== 'play') return;
        }
      }
    }
    function update(dt) {
      var playing = state === 'play';
      var sf = G.slow > 0 ? 0.45 : 1;
      if (state === 'intro') { P.a += dt * 0.25; }
      if (state === 'paused') return;
      if (playing) {
        G.playTime += dt; G.qT += dt;
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
        G.slow = Math.max(0, G.slow - dt); G.triple = Math.max(0, G.triple - dt); G.invul = Math.max(0, G.invul - dt); G.freezeW = Math.max(0, G.freezeW - dt);
        if (G.roundMax) G.roundT = Math.max(0, G.roundT - dt * sf);
        /* listen question: speak (and repeat) */
        if (G.qtype === 'listen' && !G.boss) {
          if (G.sayT > 0) { G.sayT -= dt; if (G.sayT <= 0) { speak(cur.en); G.sayRep = 9; } }
          else if (G.sayRep > 0) { G.sayRep -= dt; if (G.sayRep <= 0) { speak(cur.en); G.sayRep = 9; } }
        }
        updateEnemies(dt, sf);
        if (state !== 'play') return;
        G.freezeT = Math.max(0, G.freezeT - dt);
        /* pickups */
        G.pickTimer -= dt;
        if (G.pickTimer <= 0) {
          G.pickTimer = rand(12, 18);
          if (!pickups.length && !G.calm) {
            var types = ['slow', 'triple', 'shield', 'freeze', 'freeze', 'triple']; if (G.hearts < 3) types.push('heart', 'heart');
            var pp = spawnPos(P.a, 1.2, 3, 6);
            pickups.push({ x: pp.x, y: pp.y, type: types[(Math.random() * types.length) | 0], ph: rand(0, 6), life: 16 });
          }
        }
        for (var k = pickups.length - 1; k >= 0; k--) {
          var pk = pickups[k]; pk.life -= dt;
          var pdx = pk.x - P.x, pdy = pk.y - P.y;
          if (pdx * pdx + pdy * pdy < 0.5) collect(pk); else if (pk.life <= 0) rm(pickups, k);
        }
        /* delayed distractor respawn */
        for (var q = G.respawn.length - 1; q >= 0; q--) { G.respawn[q] -= dt; if (G.respawn[q] <= 0) { G.respawn.splice(q, 1); respawnDistractor(); } }
        /* boss */
        var B = G.boss;
        if (B && !B.dead) {
          B.t += dt; B.appear = Math.min(1, B.appear + dt / 1.2); B.hit = Math.max(0, B.hit - dt); B.atk = Math.max(0, B.atk - dt);
          if (G.freezeT <= 0) B.x = 7.5 + Math.sin(B.t * 0.6) * 1.4;
        }
      }
      /* confetti after boss */
      if (G.confT > 0) { G.confT -= dt; if (((G.confT * 12) | 0) !== (((G.confT + dt) * 12) | 0)) burst(P.x + Math.cos(P.a) * rand(2, 5), P.y + Math.sin(P.a) * rand(2, 5) + rand(-1, 1), 1.6, 10, ['#ffe36a', '#ff5fa2', '#7fe3ff', '#fff', '#8e6bff', '#17c3a8'], 0.8); }
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
        if (playing && t.correct) { /* never leave the answer stuck behind a wall for long */
          t.hidT = (t.hidT || 0) + dt;
          if (t.hidT > 0.3) {
            var hdx = t.x - P.x, hdy = t.y - P.y, hd = Math.sqrt(hdx * hdx + hdy * hdy);
            if (rayDist(P.x, P.y, Math.atan2(hdy, hdx), hd + 1) < hd - 0.4) { t.hidN = (t.hidN || 0) + t.hidT; } else t.hidN = 0;
            t.hidT = 0;
            if (t.hidN > 3) { var np = spawnPos(P.a, 0.7, 3.4, 5.8); t.x = np.x; t.y = np.y; t.age = 0; t.hidN = 0; burst(t.x, t.y, 0.55, 10, [COLORS[t.col], '#fff'], 0.8); }
          }
        }
      }
      /* particles etc. */
      for (var pi = parts.length - 1; pi >= 0; pi--) {
        var p = parts[pi]; p.life -= dt;
        if (p.life <= 0) { rm(parts, pi); continue; }
        p.vz -= 3 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z = Math.max(0, p.z + p.vz * dt);
      }
      for (var fi = floaters.length - 1; fi >= 0; fi--) { floaters[fi].t += dt; if (floaters[fi].t > 1.2) floaters.splice(fi, 1); }
      for (var ti = trails.length - 1; ti >= 0; ti--) { trails[ti].t += dt; if (trails[ti].t > 0.22) rm(trails, ti); }
      shake = Math.max(0, shake - dt); flash = Math.max(0, flash - dt); recoil = Math.max(0, recoil - dt * 6); muzzle = Math.max(0, muzzle - dt); hitM = Math.max(0, hitM - dt);
      if (hint) { hint.t -= dt; if (hint.t <= 0) hint = null; }
      if (G.banner) { G.banner.t -= dt; if (G.banner.t <= 0) G.banner = null; }
      var shown = playing && G.qtype === 'listen' && !G.boss && canHear();
      if (shown !== sayShown) { sayShown = shown; sayBtn.classList.toggle('on', shown); }
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
      G.won = win; state = 'over'; overT = G.bossBeaten ? 2.2 : 1.1; SFX.end();
      if (document.pointerLockElement) { try { document.exitPointerLock(); } catch (e) { /* */ } }
      keys = {}; jx = jy = 0; sayBtn.classList.remove('on'); sayShown = false;
      var prev = loadBest(), isRec = G.score > prev && prev > 0, best = Math.max(prev, G.score);
      if (G.score > prev) saveBest(G.score);
      G.best = best;
      lastResult = { score: G.score, correct: G.correct, wrong: G.wrong, rounds: 0, seconds: Math.round(G.playTime), stars: stars(), maxCombo: G.maxCombo, best: best, newRecord: isRec, bossBeaten: G.bossBeaten };
      lastResult.rounds = Math.min(G.correct, totalRounds);
      if (win && !G.bossBeaten) burst(P.x + Math.cos(P.a) * 3, P.y + Math.sin(P.a) * 3, 0.6, 60, ['#ffe36a', '#ff5fa2', '#7fe3ff', '#fff'], 1.8);
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
      var kb = '<div class="wq37-li"><div class="wq37-ic">' + k('W') + k('A') + k('S') + k('D') + '</div>移動 / 閃避</div>' +
        '<div class="wq37-li"><div class="wq37-ic">' + k('←') + k('→') + '</div>轉向</div>' +
        '<div class="wq37-li"><div class="wq37-ic">' + k('空白') + '</div>開火 / 點擊</div>';
      var tc = '<div class="wq37-li"><div class="wq37-ic">🕹️</div>移動 / 閃避</div><div class="wq37-li"><div class="wq37-ic">👆</div>轉向</div><div class="wq37-li"><div class="wq37-ic">🔫</div>開火</div>';
      showOv('<h1>字母獵場 Word Blaster</h1><div style="font-size:15px;font-weight:700">射中正確英文字泡泡!</div>' +
        '<div class="wq37-legend">' + (touchMode ? tc : kb) + '<div class="wq37-li"><div class="wq37-ic">❤️❤️❤️</div>3 粒心</div></div>' +
        '<div style="font-size:13px;font-weight:700;line-height:1.5">❄ 冰凍彈 · ✦ 散射彈 · 閃開紫色噴射怪的火球<br>三個場景之後 · 打敗字母怪獸!' + (touchMode ? '' : ' · ' + k('R') + ' 再聽一次') + '</div>' +
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
      showOv('<h2>' + (G.bossBeaten ? '🎉 打敗字母怪獸!' : G.won ? '好叻!全部完成' : '再接再厲!') + '</h2><div class="wq37-stars">' + st + '</div>' +
        (r.newRecord ? '<div class="wq37-rec">🏆 NEW RECORD! 新紀錄</div>' : '') +
        '<div class="wq37-stat"><div><span>分數</span>' + r.score + '</div><div><span>最高分</span>' + r.best + '</div><div><span>準確度</span>' + acc + '%</div><div><span>最高連擊</span>' + r.maxCombo + '</div></div>' +
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
    function replay() { if (state === 'play' && cur && !G.boss) speak(cur.en); }
    function onKeyDown(e) {
      gestured = true;
      var c = e.code;
      if (state === 'intro' && (c === 'Enter' || c === 'Space')) { e.preventDefault(); beginPlay(); return; }
      if (state === 'over' && resultShown && c === 'Enter') { e.preventDefault(); beginPlay(); return; }
      if (state === 'paused' && (c === 'Enter' || c === 'KeyP' || c === 'Escape')) { e.preventDefault(); resume(); return; }
      if (state !== 'play') return;
      if (c === 'KeyP' || c === 'Escape') { e.preventDefault(); pause(); return; }
      if (c === 'KeyR' && !e.repeat) { replay(); return; }
      if (GAMEKEYS[c]) {
        e.preventDefault();
        if ((c === 'Space' || c === 'ControlLeft' || c === 'ControlRight') && !e.repeat) { if (cool <= 0) { cool = 0.22; fire(0); } }
        else keys[c] = true;
      }
    }
    function onKeyUp(e) { keys[e.code] = false; }
    function setTouch() { if (!touchMode) { touchMode = true; root.classList.add('wq37-touch'); } }
    function updateKnob(x, y) { knob.style.transform = 'translate(' + x + 'px,' + y + 'px)'; }
    function onFireBtn(e) {
      e.preventDefault(); e.stopPropagation(); gestured = true;
      if (e.pointerType === 'touch') setTouch();
      if (state === 'play' && cool <= 0) { cool = 0.2; fire(0); }
    }
    function onSayBtn(e) { e.preventDefault(); e.stopPropagation(); gestured = true; if (e.pointerType === 'touch') setTouch(); replay(); }
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
    sayBtn.addEventListener('pointerdown', onSayBtn);
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
      var tx = buildTextures(arenaIdx), W = RW, H = RH, half = H >> 1;
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
    function flake(x, y, r) {
      ctx.lineCap = 'round';
      for (var pass = 0; pass < 2; pass++) {
        ctx.strokeStyle = pass ? '#5bd0ff' : DARK; ctx.lineWidth = pass ? 2.4 : 5;
        ctx.beginPath();
        for (var i = 0; i < 3; i++) { var a = i * Math.PI / 3; ctx.moveTo(x - Math.cos(a) * r, y - Math.sin(a) * r); ctx.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
        ctx.stroke();
      }
    }
    function icon(type, x, y, r) {
      if (type === 'heart') { heart(x, y, r * 0.8, '#ff4d7d'); return; }
      if (type === 'triple') { star(x, y, r, '#ffe36a'); return; }
      if (type === 'freeze') { flake(x, y, r); return; }
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
    function iceOver(cx, cy, r) {
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, TWO_PI); ctx.fillStyle = 'rgba(170,230,255,.55)'; ctx.fill();
      ctx.lineWidth = Math.max(2, r * 0.08); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - r * 0.5, cy - r * 0.6); ctx.lineTo(cx - r * 0.1, cy - r * 0.2); ctx.moveTo(cx + r * 0.4, cy + r * 0.2); ctx.lineTo(cx + r * 0.7, cy + r * 0.6); ctx.stroke();
    }
    function drawBubble(t, pr) {
      var sc = t.age < 0 ? 0 : t.age < 0.4 ? easeBack(t.age / 0.4) : 1;
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
      var w = t.w, fs, tw, maxW;
      if (G.qtype === 'pic' && !G.boss && (w.emoji || w.zh)) {
        var em = w.emoji || '', zh = w.zh || '';
        if (em) {
          ctx.beginPath(); ctx.arc(cx, cy - (zh ? r * 0.1 : 0), r * (zh ? 0.58 : 0.7), 0, TWO_PI); ctx.fillStyle = 'rgba(255,255,255,.85)'; ctx.fill();
          fs = clamp(r * (zh ? 0.78 : 1.05), 14, 80); ctx.font = fs + 'px ' + EMOJI; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000';
          ctx.fillText(em, cx, cy - (zh ? r * 0.08 : 0) + fs * 0.05);
        }
        if (zh) {
          fs = em ? clamp(r * 0.36, 11, 26) : clamp(r * 0.62, 14, 44); ctx.font = '800 ' + fs + 'px ' + FONT; tw = ctx.measureText(zh).width; maxW = r * 1.7;
          if (tw > maxW) fs = Math.max(10, fs * maxW / tw);
          outlineText(zh, cx, cy + (em ? r * 0.68 : r * 0.05), fs, '#fff', 'center', FONT);
        }
        return;
      }
      var txt = w.en; fs = G.boss ? clamp(r * 1.15, 18, 90) : clamp(r * 0.62, 14, 46);
      ctx.font = '800 ' + fs + 'px ' + EFONT;
      tw = ctx.measureText(txt).width; maxW = r * 1.95;
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
      if (G.freezeT > 0) iceOver(cx, cy, r * 1.25);
    }
    function drawSpit(s, pr) {
      var r = pr.size * 0.36, cx = pr.x, cy = pr.y + pr.size * 0.08 + Math.sin(G.playTime * 3 + s.ph) * r * 0.08, w = s.warn;
      ctx.fillStyle = 'rgba(40,40,90,0.2)'; ctx.beginPath(); ctx.ellipse(pr.x, (RH / 2 + F * 0.5 / pr.depth) * S, r * 0.95, r * 0.2, 0, 0, TWO_PI); ctx.fill();
      ctx.strokeStyle = DARK; ctx.lineWidth = Math.max(2, r * 0.1); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.9); ctx.lineTo(cx + Math.sin(G.playTime * 4 + s.ph) * r * 0.2, cy - r * 1.6); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + Math.sin(G.playTime * 4 + s.ph) * r * 0.2, cy - r * 1.65, r * 0.16, 0, TWO_PI); ctx.fillStyle = w > 0 ? '#ff5a3c' : '#ffe36a'; ctx.fill(); ctx.stroke();
      var g = ctx.createRadialGradient(cx - r * 0.3, cy - r * 0.4, r * 0.1, cx, cy, r * (1 + w * 0.12));
      g.addColorStop(0, w > 0 ? '#ffd0a0' : '#e5ccff'); g.addColorStop(1, w > 0 ? '#ff7a3c' : '#8a55e0');
      ctx.beginPath(); ctx.arc(cx, cy, r * (1 + w * 0.12), 0, TWO_PI); ctx.fillStyle = g; ctx.fill(); ctx.stroke();
      var ex = Math.sin(G.playTime * 1.7 + s.ph) * r * 0.12;
      ctx.beginPath(); ctx.arc(cx, cy - r * 0.18, r * 0.42, 0, TWO_PI); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = Math.max(1.5, r * 0.07); ctx.stroke();
      ctx.beginPath(); ctx.arc(cx + ex, cy - r * 0.12, r * 0.2, 0, TWO_PI); ctx.fillStyle = w > 0 ? '#e02020' : DARK; ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.45, r * 0.34, r * (0.12 + w * 0.2), 0, 0, TWO_PI); ctx.fillStyle = w > 0 ? '#ffd23f' : DARK; ctx.fill(); ctx.stroke();
      if (w > 0) { ctx.beginPath(); ctx.arc(cx, cy + r * 0.45, r * 0.3 * w, 0, TWO_PI); ctx.fillStyle = 'rgba(255,200,60,.85)'; ctx.fill(); outlineText('!', cx, cy - r * 2.1, Math.max(18, r * 0.9), '#ffe36a'); }
      if (G.freezeT > 0) iceOver(cx, cy, r * 1.3);
    }
    function drawProj(p, pr) {
      var r = Math.max(8, pr.size * 0.15), cx = pr.x, cy = pr.y, pul = 1 + Math.sin(G.playTime * 14 + p.ph) * 0.12;
      var g = ctx.createRadialGradient(cx, cy, r * 0.3, cx, cy, r * 2.3);
      g.addColorStop(0, 'rgba(255,190,70,.85)'); g.addColorStop(1, 'rgba(255,90,40,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r * 2.3, 0, TWO_PI); ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, r * pul, 0, TWO_PI); ctx.fillStyle = '#ff6a2c'; ctx.fill(); ctx.lineWidth = Math.max(2.5, r * 0.22); ctx.strokeStyle = DARK; ctx.stroke();
      ctx.beginPath(); ctx.arc(cx - r * 0.2, cy - r * 0.2, r * 0.45 * pul, 0, TWO_PI); ctx.fillStyle = '#ffe9a0'; ctx.fill();
      if (G.freezeT > 0) iceOver(cx, cy, r * 1.4);
    }
    function drawPickup(p, pr) {
      var r = pr.size * 0.3, cx = pr.x, cy = pr.y - Math.sin(G.playTime * 3 + p.ph) * 0.08 * pr.size;
      var g = ctx.createRadialGradient(cx, cy, r * 0.2, cx, cy, r * 1.7);
      g.addColorStop(0, 'rgba(255,255,160,.9)'); g.addColorStop(1, 'rgba(255,255,160,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r * 1.7, 0, TWO_PI); ctx.fill();
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, TWO_PI); ctx.fillStyle = '#fffbe0'; ctx.fill(); ctx.lineWidth = Math.max(2, r * 0.1); ctx.strokeStyle = DARK; ctx.stroke();
      icon(p.type, cx, cy, r * 0.65);
    }
    function drawBoss(B, pr) {
      var ap = B.appear, grow = ap < 1 ? easeBack(ap) : 1, r = pr.size * 1.15 * Math.max(0.05, grow) * (1 + B.atk * 0.12), cx = pr.x, cy = pr.y + Math.sin(B.t * 2) * r * 0.03;
      var atk = B.atk > 0;
      ctx.fillStyle = 'rgba(40,20,80,0.25)'; ctx.beginPath(); ctx.ellipse(pr.x, (RH / 2 + F * 0.5 / pr.depth) * S, r * 1.1, r * 0.2, 0, 0, TWO_PI); ctx.fill();
      ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, r * 0.05); ctx.strokeStyle = DARK;
      var side, g;
      for (side = -1; side <= 1; side += 2) { /* horns + arms */
        ctx.beginPath(); ctx.moveTo(cx + side * r * 0.5, cy - r * 0.75); ctx.lineTo(cx + side * r * 0.85, cy - r * 1.4); ctx.lineTo(cx + side * r * 0.12, cy - r * 0.95); ctx.closePath(); ctx.fillStyle = '#ffe36a'; ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx + side * r * 1.0, cy + r * 0.25 + Math.sin(B.t * 3 + side) * r * 0.05, r * 0.26, 0, TWO_PI); ctx.fillStyle = atk ? '#e0405a' : '#8a55e0'; ctx.fill(); ctx.stroke();
      }
      g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.45, r * 0.1, cx, cy, r);
      g.addColorStop(0, atk ? '#ffb0b0' : '#e0c4ff'); g.addColorStop(1, atk ? '#d02a4a' : '#7a45d8');
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, TWO_PI); ctx.fillStyle = g; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.5, r * 0.6, r * 0.35, 0, 0, TWO_PI); ctx.fillStyle = 'rgba(255,255,255,.22)'; ctx.fill();
      var look = Math.sin(B.t * 1.3) * r * 0.06;
      for (side = -1; side <= 1; side += 2) {
        ctx.beginPath(); ctx.arc(cx + side * r * 0.36, cy - r * 0.22, r * 0.27, 0, TWO_PI); ctx.fillStyle = '#fff'; ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.arc(cx + side * r * 0.36 + look, cy - r * 0.18, r * 0.12, 0, TWO_PI); ctx.fillStyle = atk ? '#e02020' : DARK; ctx.fill();
        ctx.beginPath(); ctx.moveTo(cx + side * r * 0.68, cy - r * 0.6); ctx.lineTo(cx + side * r * 0.08, cy - r * 0.4); ctx.lineWidth = Math.max(4, r * 0.08); ctx.stroke(); ctx.lineWidth = Math.max(3, r * 0.05);
      }
      var mo = atk ? 0.34 : 0.2 + Math.sin(B.t * 2.4) * 0.03;
      ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.38, r * 0.42, r * mo, 0, 0, TWO_PI); ctx.fillStyle = '#3a0f3f'; ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#fff';
      for (side = -2; side <= 2; side++) { ctx.beginPath(); ctx.moveTo(cx + side * r * 0.14 - r * 0.07, cy + r * 0.38 - r * mo * 0.95); ctx.lineTo(cx + side * r * 0.14 + r * 0.07, cy + r * 0.38 - r * mo * 0.95); ctx.lineTo(cx + side * r * 0.14, cy + r * 0.38 - r * mo * 0.3); ctx.closePath(); ctx.fill(); }
      if (B.hit > 0) { ctx.globalAlpha = Math.min(0.8, B.hit * 1.6); ctx.beginPath(); ctx.arc(cx, cy, r * 1.05, 0, TWO_PI); ctx.fillStyle = '#fff'; ctx.fill(); ctx.globalAlpha = 1; }
      if (G.freezeT > 0) iceOver(cx, cy, r * 1.1);
    }
    function drawGun() {
      var g = clamp(Math.min(cw * 0.55, ch * 0.5), 120, 340), x = cw * 0.5 + g * 0.05, y = ch + g * 0.04 + recoil * g * 0.07;
      var bob = Math.sin(gunBob) * g * 0.015; x += Math.cos(gunBob * 0.5) * g * 0.015; y += Math.abs(bob);
      var tipY = y - g * 0.7, frz = G.freezeW > 0, trp = G.triple > 0;
      ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(3, g * 0.018); ctx.strokeStyle = DARK;
      var grd = ctx.createLinearGradient(x - g * 0.3, 0, x + g * 0.3, 0);
      if (frz) { grd.addColorStop(0, '#d8f4ff'); grd.addColorStop(0.5, '#7fd6ff'); grd.addColorStop(1, '#3a9be0'); }
      else if (trp) { grd.addColorStop(0, '#ffe9a0'); grd.addColorStop(0.5, '#ffb347'); grd.addColorStop(1, '#e07a1c'); }
      else { grd.addColorStop(0, '#ff9ad0'); grd.addColorStop(0.5, '#ff5fa2'); grd.addColorStop(1, '#d93d84'); }
      ctx.beginPath(); ctx.moveTo(x - g * 0.32, y); ctx.lineTo(x - g * 0.13, tipY); ctx.lineTo(x + g * 0.13, tipY); ctx.lineTo(x + g * 0.32, y); ctx.closePath(); ctx.fillStyle = grd; ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.7)';
      for (var i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(x - g * 0.12 + (i % 2) * g * 0.2, y - g * (0.12 + i * 0.13), g * 0.02, 0, TWO_PI); ctx.fill(); }
      ctx.beginPath(); ctx.arc(x + g * 0.24, y - g * 0.3, g * 0.13, 0, TWO_PI); ctx.fillStyle = 'rgba(160,230,255,.95)'; ctx.fill(); ctx.stroke();
      if (frz) flake(x + g * 0.24, y - g * 0.3, g * 0.08); else star(x + g * 0.24, y - g * 0.3, g * 0.07, '#ffe36a');
      ctx.beginPath(); ctx.ellipse(x, tipY, g * 0.18, g * 0.07, 0, 0, TWO_PI); ctx.fillStyle = '#ffd23f'; ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x, tipY, g * 0.1, g * 0.04, 0, 0, TWO_PI); ctx.fillStyle = '#7a3b8f'; ctx.fill(); ctx.stroke();
      var pul = 0.06 + Math.sin(G.playTime * 6) * 0.008 + recoil * 0.05, gg = ctx.createRadialGradient(x, tipY - g * 0.02, 1, x, tipY - g * 0.02, g * (pul + 0.04));
      gg.addColorStop(0, 'rgba(255,255,255,1)'); gg.addColorStop(0.5, frz ? 'rgba(190,240,255,.9)' : 'rgba(120,230,255,.9)'); gg.addColorStop(1, 'rgba(120,230,255,0)');
      ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(x, tipY - g * 0.02, g * (pul + 0.04), 0, TWO_PI); ctx.fill();
      if (muzzle > 0) { /* muzzle flash */
        var mu = muzzle / 0.14, mr = g * (0.14 + 0.16 * mu), my = tipY - g * 0.05;
        var mg = ctx.createRadialGradient(x, my, 1, x, my, mr); mg.addColorStop(0, 'rgba(255,255,255,1)'); mg.addColorStop(0.4, 'rgba(255,240,140,.9)'); mg.addColorStop(1, 'rgba(255,160,60,0)');
        ctx.fillStyle = mg; ctx.beginPath(); ctx.arc(x, my, mr, 0, TWO_PI); ctx.fill();
        ctx.beginPath();
        for (var si = 0; si < 12; si++) { var sa = -Math.PI / 2 + si * Math.PI / 6 + 0.2, sr = si & 1 ? mr * 0.35 : mr * 0.95; ctx.lineTo(x + Math.cos(sa) * sr, my + Math.sin(sa) * sr); }
        ctx.closePath(); ctx.fillStyle = 'rgba(255,255,255,.9)'; ctx.fill();
      }
      MZ.x = x; MZ.y = tipY;
      return MZ;
    }
    function drawTrails(mz) {
      for (var i = 0; i < trails.length; i++) {
        var t = trails[i], u = t.t / 0.22, pr = project(t.x, t.y, 0.5, PJ), ex = pr ? pr.x : cw / 2, ey = pr ? pr.y : ch * 0.4;
        var hx = mz.x + (ex - mz.x) * Math.min(1, u * 1.6), hy = mz.y + (ey - mz.y) * Math.min(1, u * 1.6);
        var tx = mz.x + (ex - mz.x) * Math.max(0, u * 1.6 - 0.5), ty = mz.y + (ey - mz.y) * Math.max(0, u * 1.6 - 0.5);
        ctx.globalAlpha = 1 - u; ctx.lineCap = 'round';
        ctx.strokeStyle = t.c; ctx.lineWidth = 8; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(hx, hy); ctx.stroke();
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#4fb8ff'; ctx.lineWidth = 2;
        for (var k = 0; k < 3; k++) { var q = clamp(u * 1.6 - k * 0.1, 0, 1), bx = mz.x + (ex - mz.x) * q, by = mz.y + (ey - mz.y) * q, br = (14 - k * 3) * (1 - q * 0.6); ctx.globalAlpha = (1 - u) * 0.8; ctx.beginPath(); ctx.arc(bx, by, Math.max(2, br), 0, TWO_PI); ctx.stroke(); }
        ctx.globalAlpha = 1;
      }
    }
    function addSpr(k, o, wx, wy, z, hwK) {
      var e = SP[sn]; if (!e) e = SP[sn] = { d: 0, k: 0, o: null, hw: 0, pr: { x: 0, y: 0, depth: 0, size: 0 } };
      if (!project(wx, wy, z, e.pr)) return;
      e.d = e.pr.depth; e.k = k; e.o = o; e.hw = hwK ? e.pr.size * hwK : 8; SL[sn] = e; sn++;
    }
    function render() {
      renderWorld();
      var sx = 0, sy = 0;
      if (shake > 0 && !reduceMotion) { sx = (Math.random() - 0.5) * 18 * shake / 0.45; sy = (Math.random() - 0.5) * 12 * shake / 0.45; }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = ARENAS[arenaIdx].sky; ctx.fillRect(0, 0, cw, ch);
      ctx.save(); ctx.translate(sx, sy);
      ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(rc, 0, 0, cw, ch);
      /* sprites */
      var i, it;
      sn = 0;
      for (i = 0; i < targets.length; i++) if (targets[i].age >= 0) addSpr(0, targets[i], targets[i].x, targets[i].y, 0.52, 0.5);
      for (i = 0; i < bugs.length; i++) addSpr(1, bugs[i], bugs[i].x, bugs[i].y, 0.3, 0.5);
      for (i = 0; i < spits.length; i++) addSpr(4, spits[i], spits[i].x, spits[i].y, 0.4, 0.55);
      for (i = 0; i < projs.length; i++) addSpr(5, projs[i], projs[i].x, projs[i].y, 0.45, 0.25);
      for (i = 0; i < pickups.length; i++) addSpr(2, pickups[i], pickups[i].x, pickups[i].y, 0.55, 0.4);
      if (G.boss && !G.boss.dead) addSpr(6, G.boss, G.boss.x, G.boss.y, 1.0, 1.2);
      for (i = 0; i < parts.length; i++) addSpr(3, parts[i], parts[i].x, parts[i].y, 0.1 + parts[i].z, 0);
      SL.length = sn; SL.sort(cmpDepth);
      for (i = 0; i < sn; i++) {
        it = SL[i];
        if (it.k === 3) { /* particles: cheap single-column occlusion test */
          if (zb[clamp((it.pr.x / S) | 0, 0, RW - 1)] < it.d) continue;
          ctx.globalAlpha = clamp(it.o.life * 2, 0, 1); ctx.fillStyle = it.o.col; ctx.beginPath(); ctx.arc(it.pr.x, it.pr.y, Math.max(1.5, it.o.r * it.pr.size / 120 * 3), 0, TWO_PI); ctx.fill(); ctx.globalAlpha = 1;
          continue;
        }
        ctx.save();
        if (clipRuns(it.d, (it.pr.x - it.hw) / S, (it.pr.x + it.hw) / S)) {
          if (it.k === 0) drawBubble(it.o, it.pr);
          else if (it.k === 1) drawBug(it.o, it.pr);
          else if (it.k === 2) drawPickup(it.o, it.pr);
          else if (it.k === 4) drawSpit(it.o, it.pr);
          else if (it.k === 5) drawProj(it.o, it.pr);
          else drawBoss(it.o, it.pr);
        }
        ctx.restore();
      }
      var mz = MZ; mz.x = cw / 2; mz.y = ch * 0.8;
      if (state === 'play' || state === 'paused' || state === 'over') {
        mz = drawGun();
        drawTrails(mz);
      }
      ctx.restore();
      if (flash > 0) { ctx.fillStyle = 'rgba(' + flashCol + ',' + (flash * 0.8) + ')'; ctx.fillRect(0, 0, cw, ch); }
      if (G.freezeT > 0 && state === 'play') { ctx.fillStyle = 'rgba(150,220,255,' + (0.12 + 0.05 * Math.sin(G.playTime * 6)) + ')'; ctx.fillRect(0, 0, cw, ch); }
      drawHud();
    }
    function chip(x, y, u, type, label, frac) {
      var w = 78 * u, h = 24 * u;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(x, y, w, h, h / 2) : ctx.rect(x, y, w, h);
      ctx.fillStyle = frac < 0.2 && ((G.playTime * 6) | 0) % 2 ? 'rgba(255,200,200,.95)' : 'rgba(255,255,255,.9)'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = DARK; ctx.stroke();
      icon(type, x + 13 * u, y + h / 2, 9 * u);
      ctx.font = '800 ' + 13 * u + 'px ' + FONT; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = DARK; ctx.fillText(label, x + 26 * u, y + h / 2 + 1);
      ctx.fillStyle = '#7be37b'; if (frac < 0.3) ctx.fillStyle = '#ffb347';
      ctx.fillRect(x + 26 * u, y + h - 5 * u, 46 * u * clamp(frac, 0, 1), 3 * u);
    }
    function drawPrompt(emo, txt, fnt, u, py) {
      var ph = 46 * u;
      ctx.font = '800 ' + 26 * u + 'px ' + fnt; var zw = ctx.measureText(txt).width;
      ctx.font = (30 * u) + 'px ' + EMOJI; var ew = emo ? ctx.measureText(emo).width + 8 * u : 0;
      var pw = Math.min(cw - 16, zw + ew + 36 * u), px0 = cw / 2 - pw / 2;
      ctx.beginPath(); ctx.roundRect ? ctx.roundRect(px0, py, pw, ph, ph / 2) : ctx.rect(px0, py, pw, ph);
      ctx.fillStyle = 'rgba(255,255,255,.94)'; ctx.fill(); ctx.lineWidth = 3.5; ctx.strokeStyle = '#ff5fa2'; ctx.stroke();
      var sx0 = cw / 2 - (zw + ew) / 2;
      if (emo) { ctx.font = (30 * u) + 'px ' + EMOJI; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = '#000'; ctx.fillText(emo, sx0, py + ph / 2 + 2 * u); }
      ctx.font = '800 ' + 26 * u + 'px ' + fnt; ctx.textAlign = 'left'; ctx.textBaseline = 'middle'; ctx.fillStyle = DARK; ctx.fillText(txt, sx0 + ew, py + ph / 2 + 1);
      return py + ph + 8 * u;
    }
    function drawHud() {
      if (!G.hearts && state === 'intro') return;
      var u = clamp(Math.min(cw, ch * 1.15) / 400, 0.85, 1.55), i;
      /* crosshair */
      if (state === 'play') {
        var cx = cw / 2, cy = ch / 2, hm = hitM > 0 ? 1 + hitM * 2 : 1;
        ctx.lineWidth = 3; ctx.strokeStyle = DARK; ctx.beginPath(); ctx.arc(cx, cy, 13 * u * hm, 0, TWO_PI); ctx.stroke();
        ctx.lineWidth = 1.8; ctx.strokeStyle = hitM > 0 ? '#ffe36a' : '#fff'; ctx.stroke();
        ctx.fillStyle = '#ffe36a'; ctx.beginPath(); ctx.arc(cx, cy, 2.5 * u, 0, TWO_PI); ctx.fill();
      }
      if (state === 'intro') return;
      /* hearts */
      for (i = 0; i < 3; i++) heart(14 * u + 13 * u + i * 30 * u, 12 * u + 14 * u, 12 * u, i < G.hearts ? '#ff4d7d' : 'rgba(255,255,255,.55)');
      /* active weapon / power-up chips with timers */
      var ix = 14 * u, iy = 43 * u;
      if (G.freezeW > 0) { chip(ix, iy, u, 'freeze', '冰凍 ' + Math.ceil(G.freezeW) + 's', G.freezeW / 12); ix += 82 * u; }
      if (G.triple > 0) { chip(ix, iy, u, 'triple', '散射 ' + Math.ceil(G.triple) + 's', G.triple / 12); ix += 82 * u; }
      if (G.slow > 0) { chip(ix, iy, u, 'slow', '慢動作 ' + Math.ceil(G.slow) + 's', G.slow / 7); ix += 82 * u; }
      if (G.shield) { icon('shield', 14 * u + 3 * 30 * u + 22 * u, 26 * u, 12 * u); }
      if (G.freezeT > 0) outlineText('怪物冰凍中 ' + G.freezeT.toFixed(1), cw / 2, ch - 24 * u, 17 * u, '#bfefff');
      /* round + wave + score (right aligned left of pause button) */
      var rx = cw - 70;
      outlineText(G.boss ? 'BOSS!' : '第 ' + Math.min(G.round, totalRounds) + '/' + totalRounds + ' 題', rx, 18 * u, 16 * u, G.boss ? '#ff8aa8' : '#fff', 'right');
      outlineText(G.score + ' 分', rx, 38 * u, 17 * u, '#ffe36a', 'right');
      outlineText(G.boss ? ARENAS[arenaIdx].name : '第' + (G.wave + 1) + '波 ' + ARENAS[arenaIdx].name, rx, 56 * u, 12 * u, '#fff', 'right');
      outlineText('最高 ' + Math.max(G.best || 0, G.score), rx, 72 * u, 12 * u, '#ffd9a0', 'right');
      /* prompt */
      if (cur) {
        var py = 66 * u, by, B = G.boss, tx = cur.zh || cur.en;
        if (B) by = drawPrompt(cur.emoji || '', tx, FONT, u, py);
        else if (G.qtype === 'listen' && canHear() && G.qT < 7) by = drawPrompt('🔊', '聽一聽!', FONT, u, py);
        else if (G.qtype === 'pic') by = drawPrompt('🎯', cur.en, EFONT, u, py);
        else by = drawPrompt(cur.emoji || '', tx, FONT, u, py);
        if (B) {
          var bw = Math.min(cw * 0.6, 300 * u), bx = cw / 2 - bw / 2, bf = B.hp / B.max;
          ctx.fillStyle = 'rgba(43,29,74,.7)'; ctx.fillRect(bx - 3, by - 3, bw + 6, 16 * u + 6);
          ctx.fillStyle = bf > 0.4 ? '#ff6a8a' : '#ffb347'; ctx.fillRect(bx, by, bw * bf, 16 * u);
          ctx.strokeStyle = 'rgba(43,29,74,.8)'; ctx.lineWidth = 2; ctx.beginPath();
          for (i = 1; i < B.max; i++) { ctx.moveTo(bx + bw * i / B.max, by); ctx.lineTo(bx + bw * i / B.max, by + 16 * u); }
          ctx.stroke();
          outlineText('字母怪獸 ' + B.hp + '/' + B.max, cw / 2, by + 8 * u, 12 * u, '#fff');
          by += 26 * u;
          var n = B.letters.length, bs = Math.min(34 * u, (cw - 24) / n - 6 * u), gap = 6 * u, rw = n * bs + (n - 1) * gap, lx = cw / 2 - rw / 2;
          for (i = 0; i < n; i++) {
            var done = i < B.idx, isCur = i === B.idx, bxx = lx + i * (bs + gap), pulse = isCur ? 1 + Math.sin(G.playTime * 8) * 0.06 : 1;
            ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bxx, by, bs, bs * 1.15 * pulse, 7 * u) : ctx.rect(bxx, by, bs, bs * 1.15);
            ctx.fillStyle = done ? '#7be37b' : isCur ? '#ffe36a' : 'rgba(255,255,255,.8)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = DARK; ctx.stroke();
            outlineText(done ? B.letters[i] : isCur && B.reveal ? B.letters[i] : isCur ? '?' : '_', bxx + bs / 2, by + bs * 0.6, bs * 0.7, done || isCur ? '#fff' : '#cfc6e6', 'center', EFONT);
          }
          by += bs * 1.15 + 6 * u;
        } else {
          var cap = G.qtype === 'listen' ? '聽發音,射出英文字' : G.qtype === 'pic' ? '射出相配的圖' : '射出英文字';
          outlineText(cap, cw / 2, by + 6 * u, 13 * u, '#fff'); by += 18 * u;
          if (G.roundMax) {
            var tw = Math.min(cw * 0.55, 260 * u), tbx = cw / 2 - tw / 2, fr = G.roundT / G.roundMax;
            ctx.fillStyle = 'rgba(43,29,74,.55)'; ctx.fillRect(tbx - 2, by - 2, tw + 4, 10 * u + 4);
            ctx.fillStyle = fr > 0.3 ? '#7be37b' : '#ffb347'; ctx.fillRect(tbx, by, tw * fr, 10 * u);
            by += 18 * u;
          }
        }
        if (G.combo >= 2) {
          var mu = multOf(G.combo);
          outlineText('連擊 x' + G.combo + (mu > 1 ? '   分數 ×' + mu : ''), cw / 2, by + 10 * u, (18 + (mu - 1) * 3) * u, mu > 2 ? '#ff5fa2' : mu > 1 ? '#ffb347' : '#ff9ad0');
        }
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
        /* incoming orb warning */
        for (i = 0; i < projs.length; i++) {
          var pj = projs[i], pa = normAng(Math.atan2(pj.y - P.y, pj.x - P.x) - P.a), pd = Math.hypot(pj.x - P.x, pj.y - P.y);
          if (pd < 4 && Math.abs(pa) > Math.atan(PL) * 0.95) outlineText('!', pa > 0 ? cw - 18 * u : 18 * u, ch * 0.62, 30 * u, '#ff7a3c');
        }
      }
      /* hint + floaters */
      if (hint) outlineText(hint.text, cw / 2, ch * 0.3, Math.min(30 * u, cw / (hint.text.length * 0.75 + 2)), '#fff');
      for (i = 0; i < floaters.length; i++) {
        var f = floaters[i]; ctx.globalAlpha = clamp(1.4 - f.t, 0, 1);
        outlineText(f.text, f.x, f.y - f.t * 50, f.size * Math.min(1.4, u), f.col); ctx.globalAlpha = 1;
      }
      /* wave / boss title banner */
      if (G.banner) {
        var bn = G.banner, al = clamp(Math.min(bn.t * 3, (bn.max - bn.t) * 5), 0, 1), sc = bn.max - bn.t < 0.3 ? easeBack((bn.max - bn.t) / 0.3) : 1, by0 = ch * 0.34;
        ctx.globalAlpha = al; ctx.fillStyle = bn.boss ? 'rgba(160,20,50,.75)' : 'rgba(43,29,74,.68)'; ctx.fillRect(0, by0 - 40 * u, cw, 82 * u);
        outlineText(bn.text, cw / 2, by0 - 10 * u, Math.min(40 * u, cw / (bn.text.length * 0.7 + 1)) * sc, bn.boss ? '#ffe36a' : '#7fe3ff');
        outlineText(bn.sub, cw / 2, by0 + 26 * u, Math.min(19 * u, cw / (bn.sub.length * 0.8 + 2)), '#fff');
        ctx.globalAlpha = 1;
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
      try { if (canHear()) window.speechSynthesis.cancel(); } catch (e) { /* */ }
      try { if (actx) { actx.close(); } } catch (e) { /* */ }
      actx = null;
      if (root.parentNode) root.parentNode.removeChild(root);
      if (styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
      if (current === inst) current = null;
    }

    /* debug / test hooks */
    function ahead(d) { return { x: P.x + Math.cos(P.a) * d, y: P.y + Math.sin(P.a) * d }; }
    function cmd(name, a, b) {
      var p;
      switch (name) {
        case 'goto': G.round = clamp(a | 0, 1, totalRounds); G.boss = null; startRound(false); return true;
        case 'boss': startBoss(); return true;
        case 'clear': bugs.length = 0; spits.length = 0; projs.length = 0; pickups.length = 0; return true;
        case 'calm': G.calm = !!a; if (a) { bugs.length = 0; spits.length = 0; projs.length = 0; pickups.length = 0; } return true;
        case 'bug': p = ahead(a || 3); bugs.push({ x: p.x, y: p.y, vx: 0, vy: 0, ph: 0 }); return true;
        case 'spitter': p = ahead(a || 5); spits.push({ x: p.x, y: p.y, vx: 0, vy: 0, ph: 0, fireT: b || 1, warn: 0, dir: 1, dirT: 3 }); return true;
        case 'proj': p = ahead(a || 3); fireProj(p.x, p.y, DIFF.projSpeed[di]); return true;
        case 'freeze': G.freezeT = 3; return true;
        case 'weapon': if (a === 'triple') G.triple = 12; else G.freezeW = 12; return true;
        case 'pickup': p = ahead(a ? 2 : 2); pickups.push({ x: p.x, y: p.y, type: a || 'freeze', ph: 0, life: 20 }); return true;
        case 'place': P.x = a; P.y = b; return true;
        case 'score': G.score = a | 0; return true;
        case 'shield': G.shield = !!a; return true;
      }
      return false;
    }
    var inst = {
      destroy: destroy, pause: pause, resume: resume,
      _state: function () {
        var B = G.boss, i, en = [];
        for (i = 0; i < bugs.length; i++) en.push({ k: 'bug', x: bugs[i].x, y: bugs[i].y });
        for (i = 0; i < spits.length; i++) en.push({ k: 'spit', x: spits[i].x, y: spits[i].y });
        for (i = 0; i < projs.length; i++) en.push({ k: 'proj', x: projs[i].x, y: projs[i].y });
        return {
          round: G.round, hearts: G.hearts, score: G.score, correctWord: B ? B.letters[B.idx] : cur ? cur.en : null, state: state, combo: G.combo, correct: G.correct, wrong: G.wrong, shield: G.shield,
          player: { x: P.x, y: P.y, a: P.a }, bugs: bugs.length, spitters: spits.length, projectiles: projs.length, enemies: en, result: lastResult, resultShown: resultShown, avgRenderMs: avgMs, touch: touchMode,
          arena: arenaIdx, arenaName: ARENAS[arenaIdx].name, wave: G.wave + 1, qtype: G.qtype, totalRounds: totalRounds, freezeT: G.freezeT, freezeW: G.freezeW, triple: G.triple,
          mult: multOf(G.combo), best: G.best, shake: shake, reduceMotion: reduceMotion, bannerText: G.banner ? G.banner.text : null, sayVisible: sayShown, pickups: pickups.length, particles: parts.length,
          boss: B ? { hp: B.hp, max: B.max, idx: B.idx, word: B.letters.join(''), dead: B.dead, zh: B.w.zh } : null,
          targets: targets.map(function (t) { var h = rayHit(targetAngle(t)); return { word: t.w.en, angle: normAng(targetAngle(t) - P.a), dist: Math.hypot(t.x - P.x, t.y - P.y), clear: !!(h && h.o === t), emoji: t.w.emoji || '' }; })
        };
      },
      _fire: function (off) { fire(off || 0); },
      _turnTo: function (i) { var t = targets[i]; if (t) P.a = targetAngle(t); },
      _cmd: cmd
    };
    current = inst;
    resetGame(); showIntro();
    lastT = performance.now(); rafId = requestAnimationFrame(frame);
    var pre = 1, preT = function () { if (dead || pre > 2) return; buildTextures(pre++); setTimeout(preT, 700); };
    setTimeout(preT, 900);
    return inst;
  }

  var API = { start: start };
  Object.defineProperty(API, '_debug', { get: function () { return current ? current._state() : null; } });
  API._debugFire = function (off) { if (current) current._fire(off || 0); };
  API._debugTurnTo = function (i) { if (current) current._turnTo(i); };
  API._cmd = function (name, a, b) { return current ? current._cmd(name, a, b) : null; };
  globalThis.WQ37FPS = API;
})();
