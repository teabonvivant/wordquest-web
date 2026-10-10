/* 字母獵場 Word Blaster - raycast FPS vocabulary mini game (self-contained, no assets).
   R3.9 engine: adaptive internal resolution, cached sprites/labels, 64px lit procedural textures, per-arena sky,
   WebAudio synth (SFX + music), FX layer, difficulty tiers, level mode. Everything is procedural: no files, no network. */
(function () {
  'use strict';
  var FONT = '"PingFang HK","Noto Sans HK","Microsoft JhengHei","WenQuanYi Zen Hei","Noto Sans CJK TC",system-ui,sans-serif';
  var EFONT = '"Arial Rounded MT Bold","Trebuchet MS","Noto Sans",Arial,sans-serif';
  var EMOJI = '"Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif';
  var MW = 16, MH = 16;
  var MAPF = new Uint8Array(MW * MH);
  var BESTKEY = 'wq37-fps-best', MUTEKEY = 'wq37-fps-mute', SENSKEY = 'wq37-fps-sens';

  var TWO_PI = Math.PI * 2;
  var COLORS = ['#ff5fa2', '#ffae00', '#17c3a8', '#8e6bff', '#2fa8ff'];
  var COLORS_D = ['#c92a74', '#c47a00', '#0b8a76', '#5a38cc', '#1572c4'];
  var COLORS_RGB = ['255,95,162', '255,174,0', '23,195,168', '142,107,255', '47,168,255'];
  var DARK = '#2b1d4a';
  var FLASH_COL = ['#ff3c5a', '#ffeb78', '#ffffff', '#ff5050', '#ffe63c', '#ff8c28'];   /* 0 hurt 1 good 2 wave 3 boss 4 bug 5 orb */
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
    timer: [0, 0, 30, 26, 22],
    nDist: [2, 3, 3, 4, 5],                    /* distractor words next to the answer */
    simNoise: [0, 0, 0, 1.0, 0.35],            /* tier 4+: pick distractors by edit distance (smaller = more similar) */
    aim: [1.0, 0.8, 0.5, 0.3, 0.15],           /* aim-assist strength */
    aimRange: [0.12, 0.10, 0.075, 0.055, 0.04],/* aim-assist cone (rad) */
    hint: [1, 1, 0, 0, 0]                      /* answer bubble pulses after 4s */
  };
  var TIERS = [
    { ic: '🌱', name: '輕鬆', sub: '慢慢來', desc: '不限時 · 有提示 · 干擾字少' },
    { ic: '🙂', name: '簡單', sub: '輕鬆玩', desc: '不限時 · 有提示' },
    { ic: '⭐', name: '標準', sub: '剛剛好', desc: '限時 30 秒 · 快答有加分' },
    { ic: '🔥', name: '進階', sub: '有啲挑戰', desc: '限時 · 干擾字多 · 字形相近' },
    { ic: '👑', name: '高手', sub: '極速挑戰', desc: '最快 · 最多相近干擾字' }
  ];
  var QT = ['zh', 'listen', 'pic'];
  var OFF1 = [0], OFF3 = [-0.14, 0, 0.14];
  var BUCKETS = [18, 25, 34, 46, 62, 84, 114, 152, 200, 260];   /* sprite radius buckets (css px) */
  var NB = BUCKETS.length;
  var SCALES = [0.6, 0.7, 0.8, 0.9, 1.0, 1.125, 1.25];
  var PCAP = 300;

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
  function loadMute() { try { return localStorage.getItem(MUTEKEY) === '1'; } catch (e) { return false; } }
  function saveMute(m) { try { localStorage.setItem(MUTEKEY, m ? '1' : '0'); } catch (e) { /* */ } }
  function loadSens() { try { var v = parseFloat(localStorage.getItem(SENSKEY)); return v >= 0.4 && v <= 2.5 ? v : 1; } catch (e) { return 1; } }
  function saveSens(v) { try { localStorage.setItem(SENSKEY, String(v)); } catch (e) { /* */ } }
  function solid(cx, cy) { return cx < 0 || cy < 0 || cx >= MW || cy >= MH || MAPF[cy * MW + cx] !== 0; }
  function isFree(x, y, r) {
    var x0 = Math.floor(x - r), x1 = Math.floor(x + r), y0 = Math.floor(y - r), y1 = Math.floor(y + r);
    return !(solid(x0, y0) || solid(x1, y0) || solid(x0, y1) || solid(x1, y1));
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

  /* ---------- procedural texture toolkit (64x64, tileable) ---------- */
  function tn(x, y, s, seed) {   /* smooth tileable value noise, cell size s (4/8/16/32) */
    var n = 64 / s, fx = x / s, fy = y / s, ix = Math.floor(fx), iy = Math.floor(fy), ux = fx - ix, uy = fy - iy, sd = (seed | 0) * 31 + 7;
    ux = ux * ux * (3 - 2 * ux); uy = uy * uy * (3 - 2 * uy);
    var x0 = ix % n, x1 = (ix + 1) % n, y0 = iy % n, y1 = (iy + 1) % n;
    var a = hash(x0 + sd, y0), b = hash(x1 + sd, y0), c = hash(x0 + sd, y1), d = hash(x1 + sd, y1);
    return a + (b - a) * ux + (c - a) * uy + (a - b - c + d) * ux * uy;
  }
  function bev(u, v, w, h) {   /* panel bevel: + lit top/left, - shaded bottom/right */
    if (u < 1.5 || v < 1.5) return 26;
    if (u > w - 2.5 || v > h - 2.5) return -30;
    return 0;
  }
  function mix(a, b, t) { return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]; }
  function add(c, d) { return [c[0] + d, c[1] + d, c[2] + d]; }
  function circ(x, y, cx, cy) { var dx = x - cx, dy = y - cy; return Math.sqrt(dx * dx + dy * dy); }

  var ARENAS = [
    {
      name: '星空基地', en: 'Space Base', fog: [38, 30, 92], sky: '#1b1450', music: 0,
      map: ['2222222222222222', '1000000000000001', '1003300000033001', '1003000000003001', '1000044000044001', '1000000000000001', '1000500000050001', '1000000000000001',
        '1000000000000001', '1000500000050001', '1000044000044001', '1003000000003001', '1003300000033001', '1000000000000001', '1000000000000001', '2222222222222222'],
      walls: [null,
        function (x, y) {   /* steel panel + cyan neon strip + rivets */
          var u = x & 31, v = y & 31, n = tn(x, y, 4, 1) * 16 + hash(x, y) * 8, b = 92 + n;
          var c = [b, b + 10, b + 70];
          var bv = bev(u, v, 32, 32); c = add(c, bv);
          if (u < 1 || v < 1) return [26, 30, 70];
          if (v >= 13 && v <= 16) {
            if (v === 14 || v === 15) return (x & 15) < 13 ? [150, 255, 255] : [60, 150, 190];
            return [40, 140, 190];
          }
          if ((u === 4 || u === 27) && (v === 5 || v === 26)) return [190, 200, 240];
          if ((u === 5 || u === 28) && (v === 6 || v === 27)) return [30, 36, 80];
          if (v > 20 && (u & 3) === 0 && v < 28) return add(c, -22);
          return c;
        },
        function (x, y) {   /* hazard stripes in a bolted frame */
          var u = x & 31, v = y & 31, n = hash(x, y) * 10, s = ((x + y) >> 3) & 1;
          if (u < 3 || v < 3 || u > 28 || v > 28) { var f = 82 + n; return add([f, f + 8, f + 52], bev(u, v, 32, 32)); }
          if ((u === 5 || u === 26) && (v === 5 || v === 26)) return [210, 215, 245];
          return s ? [255, 196 + n, 36] : [40 + n * 0.5, 42 + n * 0.5, 74];
        },
        function (x, y) {   /* porthole */
          var d = circ(x, y, 32, 32), n = hash(x, y) * 10, a = Math.atan2(y - 32, x - 32);
          if (d < 17) {
            var t = clamp((y - 15) / 34, 0, 1), c = mix([36, 70, 160], [150, 215, 255], t * 0.8);
            if (Math.abs((x - 32) + (y - 32) * 0.9 + 6) < 3 && d > 6) c = add(c, 60);
            if (hash(x * 3, y * 5) > 0.985) c = [255, 255, 255];
            return c;
          }
          if (d < 21.5) { var l = 190 + 40 * Math.cos(a - 2.3); return [l, l + 4, l + 30]; }
          if (d < 23) return [24, 30, 70];
          var u = x & 31, v = y & 31, b = 60 + tn(x, y, 8, 3) * 20 + n;
          if (u < 1 || v < 1) return [20, 28, 76];
          return add([b - 6, b + 6, b + 100], bev(u, v, 32, 32) * 0.5);
        },
        function (x, y) {   /* purple vent slats */
          var u = x & 63, v = y & 7, n = hash(x, y) * 10;
          if (u < 3 || u > 60) return [90 + n, 26, 100];
          if ((y & 31) < 2) return [70, 20, 80];
          if (v < 5) return [170 + n + (v === 0 ? 40 : 0) - (v === 4 ? 40 : 0), 66 + n, 172 + n];
          return [30, 10, 44];
        },
        function (x, y) {   /* circuit board */
          var gx = x >> 3, gy = y >> 3, h = hash(gx, gy), n = hash(x, y) * 8, u = x & 7, v = y & 7;
          if (h > 0.82 && u > 0 && u < 7 && v > 0 && v < 7) return u === 1 || u === 6 ? [150, 160, 170] : [24 + n, 36 + n, 52];
          if (h > 0.5 && (((x & 7) === 3 && h > 0.7) || ((y & 7) === 3 && h <= 0.7))) return (x & 7) === 3 && (y & 7) === 3 ? [255, 255, 255] : [120, 255, 230];
          if (u === 3 && v === 3 && h > 0.3) return [200, 255, 245];
          return [20 + n, 100 + n + tn(x, y, 8, 5) * 12, 108 + n];
        }],
      floor: function (x, y) {
        var u = x & 31, v = y & 31, chk = ((x >> 5) + (y >> 5)) & 1, n = hash(x, y) * 8 + tn(x, y, 8, 2) * 10;
        if (u < 1 || v < 1) return [70, 205, 245];
        if (u === 1 || v === 1) return [30, 70, 130];
        if ((u === 5 || u === 26) && (v === 5 || v === 26)) return [120, 130, 190];
        return add(chk ? [52 + n, 56 + n, 124] : [40 + n, 44 + n, 100], bev(u, v, 32, 32) * 0.4);
      },
      ceil: function (x, y) {   /* beams + star windows (holes show the sky) */
        var u = x & 31, v = y & 31, h = hash(x >> 5, y >> 5);
        if (u < 3 || v < 3) return add([58, 62, 116], bev(u, v, 32, 3) * 0.3 + hash(x, y) * 8);
        if (h > 0.78) return [205 + hash(x, y) * 20, 225, 255];
        if (u > 14 && u < 17 || v > 14 && v < 17) return [44, 48, 96];
        return null;
      }
    },
    {
      name: '叢林遺跡', en: 'Jungle Ruins', fog: [186, 228, 164], sky: '#8fd07a', music: 1,
      map: ['2222222222222222', '1000000000000001', '1022000000002201', '1020000000000201', '1000030000300001', '1000000000000001', '1000440000440001', '1000400000040001',
        '1000000000000001', '1000030000300001', '1002000000002001', '1002200000022001', '1000000000000001', '1000440000440001', '1000000000000001', '2222222222222222'],
      walls: [null,
        function (x, y) {   /* mossy stone bricks */
          var row = y >> 4, ox = (row & 1) ? 16 : 0, bx = (x + ox) & 31, by = y & 15, v = hash(row * 7 + ((x + ox) >> 5), 5) * 34 - 17, n = hash(x, y) * 12 + tn(x, y, 4, 4) * 10;
          if (by < 2 || bx < 2) return [54, 66, 46];
          var c = [124 + v + n, 126 + v + n, 104 + v + n * 0.5];
          if (bx < 3 || by < 3) c = add(c, 20); else if (bx > 29 || by > 13) c = add(c, -22);
          if (tn(x, y, 8, 6) > 0.62 + (y > 40 ? -0.1 : 0)) c = mix(c, [64, 130, 48], 0.75);
          if (hash(x >> 1, y >> 1) > 0.97) c = add(c, -40);
          return c;
        },
        function (x, y) {   /* hedge leaves */
          var l = tn(x, y, 4, 7) * 0.7 + tn(x, y, 8, 8) * 0.5, n = hash(x, y) * 14, e = ((x * 3 + y * 5) % 13);
          var c = mix([22, 84, 42], [74, 176, 74], clamp(l - 0.15, 0, 1));
          if (e < 1) c = add(c, 36);
          if (hash(x >> 2, y >> 2) > 0.93) c = [20, 70, 36];
          return add(c, n - 6);
        },
        function (x, y) {   /* wooden planks */
          var p = x >> 4, h = hash(p, 9), u = x & 15, n = hash(x, y) * 10;
          if (u < 1) return [58, 32, 16];
          if (u === 15) return [180, 120, 70];
          var g = Math.sin(y * 0.35 + tn(x, y, 16, p) * 8) * 10;
          var c = [150 + h * 26 + n + g, 96 + h * 16 + n * 0.6 + g * 0.6, 54 + g * 0.3];
          var kx = 8 + (p * 23 % 40), ky = 12 + (p * 37 % 36);
          if (circ(x % 16 + p * 16, y, p * 16 + 8, ky) < 4.5 && hash(p, 3) > 0.35) c = add(c, -38);
          return c;
        },
        function (x, y) {   /* carved sandstone */
          var u = x & 63, v = y & 63, d = circ(x, y, 32, 32), n = hash(x, y) * 10 + tn(x, y, 8, 9) * 14;
          if (u < 2 || v < 2) return [112, 90, 50];
          if (u > 61 || v > 61) return [130, 108, 66];
          var c = [205 + n, 184 + n, 124 + n];
          if (d < 7) c = [180 + n, 150 + n, 90]; else if (d > 17 && d < 21) c = [150 + n, 124 + n, 72];
          else if (d >= 7 && d < 17) { var a = Math.atan2(y - 32, x - 32); if (Math.abs(Math.sin(a * 6)) > 0.93) c = [160 + n, 134 + n, 80]; }
          if (d < 7 && d > 5 || d > 20 && d < 21.5) c = add(c, 28);
          return c;
        },
        function (x, y) {   /* vines + flowers on stone */
          var n = hash(x, y) * 10, vx = 32 + Math.sin(y * 0.15) * 14, vx2 = 12 + Math.sin(y * 0.22 + 2) * 6, c = [110 + n, 116 + n, 96 + n * 0.8];
          if (tn(x, y, 8, 11) > 0.7) c = add(c, -18);
          if (Math.abs(x - vx) < 2.6 || Math.abs(x - vx2) < 1.6 || Math.abs(x - vx2 - 42) < 1.6) c = [46 + n, 140 + n, 52];
          else if (Math.abs(x - vx - 5 * Math.sin(y * 0.4)) < 1.2) c = [60 + n, 170 + n, 60];
          var fx = (x + 5) % 21, fy = (y + 3) % 19;
          if (hash(x / 21 | 0, y / 19 | 0) > 0.6) { var fd = circ(fx, fy, 10, 9); if (fd < 1.8) return [255, 220, 70]; if (fd < 4) return [255, 120, 170]; }
          return c;
        }],
      floor: function (x, y) {
        var u = x & 31, v = y & 31, chk = ((x >> 5) + (y >> 5)) & 1, n = hash(x, y) * 14 + tn(x, y, 8, 12) * 20;
        if (u < 1 || v < 1) return [60, 98, 42];
        if (chk) return [96 + n, 150 + n, 62];
        var c = [136 + n * 0.6, 126 + n * 0.5, 88 + n * 0.4];   /* flagstone */
        if (u < 3 || v < 3) c = add(c, 16);
        if (hash(x, y) > 0.994) return [255, 230, 90];
        return c;
      },
      ceil: function (x, y) {   /* leaf canopy with gaps */
        var l = tn(x, y, 8, 13) * 0.6 + tn(x, y, 4, 14) * 0.5;
        if (l < 0.34) return null;
        var c = mix([26, 90, 44], [70, 170, 70], clamp(l - 0.3, 0, 1));
        if (hash(x >> 1, y >> 1) > 0.94) c = add(c, 40);
        return c;
      }
    },
    {
      name: '冰晶洞穴', en: 'Crystal Ice Cave', fog: [176, 216, 250], sky: '#bfe6ff', music: 2,
      map: ['2222222222222222', '1100000000000011', '1000000000000001', '1000550000550001', '1000500000050001', '1000000000000001', '1000000000000001', '1000000000330001',
        '1003300000330001', '1000000000000001', '1050000000000501', '1055000000005501', '1000000000000001', '1000000000000001', '1100000000000011', '2222222222222222'],
      walls: [null,
        function (x, y) {   /* ice blocks */
          var u = x & 31, v = y & 31, g = (y & 31) * 1.2, n = hash(x, y) * 8 + tn(x, y, 8, 15) * 14;
          if (u < 2 || v < 2) return [236, 250, 255];
          if (u > 29 || v > 29) return [96, 150, 214];
          if ((x * 2 + y) % 41 < 2 && hash(x >> 3, y >> 3) > 0.55) return [255, 255, 255];
          var c = [112 + g * 0.5 + n, 192 + g * 0.5 + n, 250];
          if (Math.abs(((x * 5 + y * 3) % 47) - 20) < 1 && hash(x >> 4, y >> 4) > 0.5) c = add(c, 45);
          return c;
        },
        function (x, y) {   /* frosted rock */
          var n = hash(x, y) * 14 + tn(x, y, 4, 16) * 16, st = ((y >> 3) & 1) ? 12 : 0;
          if (hash(x, y) > 0.982) return [255, 255, 255];
          var c = [54 + n + st, 78 + n + st, 150 + n];
          if (tn(x, y, 8, 17) > 0.7) c = mix(c, [200, 228, 255], 0.5);
          return c;
        },
        function (x, y) {   /* snow bricks */
          var row = y >> 4, ox = (row & 1) ? 16 : 0, bx = (x + ox) & 31, by = y & 15, n = hash(x, y) * 10 + tn(x, y, 8, 18) * 12;
          if (by < 2 || bx < 2) return [150, 180, 214];
          var c = [226 + n * 0.4, 240 + n * 0.3, 255];
          if (by > 12 || bx > 29) c = add(c, -18);
          return c;
        },
        function (x, y) {   /* crystal facets */
          var tx = x & 31, ty = y & 31, n = hash(x, y) * 8;
          if (tx < 2 || ty < 2 || Math.abs(tx - ty) < 2 || Math.abs(tx + ty - 31) < 1) return [255, 255, 255];
          var c = tx < ty ? [100 + n, 232 + n, 236] : [60 + n, 180 + n, 224];
          if (tx + ty > 31) c = add(c, -22);
          if (hash(x * 7, y * 3) > 0.99) c = [255, 255, 255];
          return c;
        },
        function (x, y) {   /* amethyst */
          var a = Math.abs((x & 31) - 16) + Math.abs((y & 31) - 16), n = hash(x, y) * 8;
          if ((x & 31) < 2 || (y & 31) < 2) return [226, 214, 255];
          var c = a < 6 ? [226 + n, 210, 255] : a < 13 ? [176 + n, 158 + n, 252] : [128 + n, 108 + n, 232];
          if (a === 6 || a === 13) c = [250, 240, 255];
          return c;
        }],
      floor: function (x, y) {
        var u = x & 31, v = y & 31, chk = ((x >> 5) + (y >> 5)) & 1, n = hash(x, y) * 8 + tn(x, y, 8, 19) * 12;
        if (u < 1 || v < 1) return [220, 242, 255];
        if ((x * 3 + y * 2) % 53 < 1) return [255, 255, 255];
        var c = chk ? [162 + n, 216 + n, 250] : [146 + n, 202 + n, 244];
        if (Math.abs(((x + y) % 37) - 8) < 1) c = add(c, 22);
        return c;
      },
      ceil: function (x, y) {   /* icicles + skylights */
        var len = 14 - Math.abs((x & 15) - 8) * 1.7, n = hash(x, y) * 8;
        if (tn(x, y, 16, 20) < 0.3) return null;
        if ((y & 31) < len) return [214 + n, 240, 255];
        return [44 + n, 74 + n, 150 + n];
      }
    }
  ];
  function setArena(i) { var m = ARENAS[i].map; for (var y = 0; y < MH; y++) for (var x = 0; x < MW; x++) MAPF[y * MW + x] = m[y].charCodeAt(x) - 48; }
  setArena(0);

  /* ---------- textures: bases are built once per arena (lazily, per type); fog/light levels are built on first use ---------- */
  function pack(r, g, b) { return (255 << 24) | (clamp(b | 0, 0, 255) << 16) | (clamp(g | 0, 0, 255) << 8) | clamp(r | 0, 0, 255); }
  function mkTex(ai) { return { ai: ai, wall: [null, null, null, null, null, null], wallP: [0, 0, 0, 0, 0, 0], wallLv: [null, [], [], [], [], []], floorB: null, ceilB: null, ceilHole: null, fcP: 0, lvP: 0, floorLv: [], ceilLv: [] }; }
  var TEXS = [];
  function texOf(ai) { return TEXS[ai] || (TEXS[ai] = mkTex(ai)); }
  /* bases are baked in row slices (idle time) so no single task pays for a whole 64x64 texture */
  function bakeWall(T, t, rows) {
    var st = T.wallP[t];
    if (st >= 64) return true;
    var b = T.wall[t] || (T.wall[t] = new Uint8Array(4096 * 3)), fn = ARENAS[T.ai].walls[t], end = Math.min(64, st + rows), x, y, c, o;
    for (y = st; y < end; y++) for (x = 0; x < 64; x++) { c = fn(x, y); o = (y * 64 + x) * 3; b[o] = clamp(c[0], 0, 255); b[o + 1] = clamp(c[1], 0, 255); b[o + 2] = clamp(c[2], 0, 255); }
    T.wallP[t] = end;
    return end >= 64;
  }
  function ensureWall(T, t) { if (T.wallP[t] < 64) bakeWall(T, t, 64); return T.wall[t]; }
  function bakeFC(T, rows) {
    var st = T.fcP;
    if (st >= 64) return true;
    var A = ARENAS[T.ai], f = T.floorB || (T.floorB = new Uint8Array(4096 * 3)), c2 = T.ceilB || (T.ceilB = new Uint8Array(4096 * 3)), hole = T.ceilHole || (T.ceilHole = new Uint8Array(4096));
    var end = Math.min(64, st + rows), x, y, c, o;
    for (y = st; y < end; y++) for (x = 0; x < 64; x++) {
      o = (y * 64 + x) * 3;
      c = A.floor(x, y); f[o] = clamp(c[0], 0, 255); f[o + 1] = clamp(c[1], 0, 255); f[o + 2] = clamp(c[2], 0, 255);
      c = A.ceil(x, y);
      if (!c) hole[y * 64 + x] = 1; else { c2[o] = clamp(c[0], 0, 255); c2[o + 1] = clamp(c[1], 0, 255); c2[o + 2] = clamp(c[2], 0, 255); }
    }
    T.fcP = end;
    return end >= 64;
  }
  function ensureFC(T) { if (T.fcP < 64) bakeFC(T, 64); }
  /* light + fog per distance level: base*light*(1-k) + fog*k never exceeds 255, so no clamping is needed */
  function wallLevel(T, t, side, lvl) {
    var key = side * 16 + lvl, arr = T.wallLv[t][key];
    if (arr) return arr;
    var base = ensureWall(T, t), FOG = ARENAS[T.ai].fog, u = lvl / 15, k = u * 0.62, m = (side ? 0.8 : 1.0) * (1 - 0.3 * u) * (1 - k);
    var fr = FOG[0] * k, fg = FOG[1] * k, fb = FOG[2] * k, i, o = 0;
    arr = new Uint32Array(4096);
    for (i = 0; i < 4096; i++, o += 3) arr[i] = (0xFF000000 | (((base[o + 2] * m + fb) | 0) << 16) | (((base[o + 1] * m + fg) | 0) << 8) | ((base[o] * m + fr) | 0)) >>> 0;
    return (T.wallLv[t][key] = arr);
  }
  function floorLevel(T, lvl) {
    var arr = T.floorLv[lvl];
    if (arr) return arr;
    ensureFC(T);
    var FOG = ARENAS[T.ai].fog, u = lvl / 15, k = u * 0.72, m = (1 - 0.22 * u) * (1 - k), b = T.floorB, fr = FOG[0] * k, fg = FOG[1] * k, fb = FOG[2] * k, i, o = 0;
    arr = new Uint32Array(4096);
    for (i = 0; i < 4096; i++, o += 3) arr[i] = (0xFF000000 | (((b[o + 2] * m + fb) | 0) << 16) | (((b[o + 1] * m + fg) | 0) << 8) | ((b[o] * m + fr) | 0)) >>> 0;
    return (T.floorLv[lvl] = arr);
  }
  function ceilLevel(T, lvl) {
    var arr = T.ceilLv[lvl];
    if (arr) return arr;
    ensureFC(T);
    var FOG = ARENAS[T.ai].fog, u = lvl / 15, k = u * 0.72, m = (0.86 - 0.2 * u) * (1 - k), b = T.ceilB, h = T.ceilHole, fr = FOG[0] * k, fg = FOG[1] * k, fb = FOG[2] * k, i, o = 0;
    arr = new Uint32Array(4096);
    for (i = 0; i < 4096; i++, o += 3) arr[i] = h[i] ? 0 : (0xFF000000 | (((b[o + 2] * m + fb) | 0) << 16) | (((b[o + 1] * m + fg) | 0) << 8) | ((b[o] * m + fr) | 0)) >>> 0;
    return (T.ceilLv[lvl] = arr);
  }
  /* idle pre-bake of every light level (5 walls x 2 sides x 16 + floor 16 + ceiling 16), one table per call */
  function bakeLevelStep(T) {
    var i = T.lvP;
    if (i >= 192) return false;
    T.lvP = i + 1;
    if (i < 160) { var t = 1 + ((i / 32) | 0), r = i % 32; wallLevel(T, t, r >> 4, r & 15); }
    else if (i < 176) floorLevel(T, i - 160);
    else ceilLevel(T, i - 176);
    return true;
  }

  /* ---------- CSS ---------- */
  var CSS = '.wq37-root{position:relative;width:100%;height:100%;overflow:hidden;background:#8fd3ff;user-select:none;-webkit-user-select:none;touch-action:none;font-family:' + FONT + ';-webkit-tap-highlight-color:transparent}' +
    '.wq37-root canvas{position:absolute;left:0;top:0;width:100%;height:100%;touch-action:none;display:block}' +
    '.wq37-btn{position:absolute;border:3px solid #2b1d4a;border-radius:50%;background:rgba(255,255,255,.88);color:#2b1d4a;font-weight:800;display:flex;align-items:center;justify-content:center;touch-action:none;cursor:pointer;box-shadow:0 4px 0 rgba(43,29,74,.35);font-family:' + FONT + ';padding:0}' +
    '.wq37-fire{right:18px;bottom:22px;width:92px;height:92px;font-size:44px;background:rgba(255,95,162,.92);display:none}' +
    '.wq37-pause{right:8px;top:8px;width:56px;height:56px;font-size:24px}' +
    '.wq37-say{right:8px;top:72px;width:56px;height:56px;font-size:26px;background:rgba(255,227,106,.95);display:none}' +
    '.wq37-say.on{display:flex}' +
    '.wq37-mute{right:8px;top:136px;width:48px;height:48px;font-size:22px;background:rgba(255,255,255,.8)}' +
    '.wq37-mute.off{opacity:.75}' +
    '.wq37-intro .wq37-pause,.wq37-intro .wq37-say,.wq37-intro .wq37-fire,.wq37-intro .wq37-joy{display:none!important}' +
    '.wq37-joy{position:absolute;left:24px;bottom:30px;width:128px;height:128px;border-radius:50%;background:rgba(255,255,255,.28);border:3px solid rgba(255,255,255,.8);display:none;touch-action:none;pointer-events:none}' +
    '.wq37-knob{position:absolute;left:34px;top:34px;width:60px;height:60px;border-radius:50%;background:rgba(255,255,255,.9);border:3px solid #2b1d4a}' +
    '.wq37-touch .wq37-fire,.wq37-touch .wq37-joy{display:flex}' +
    '.wq37-ov{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(40,60,120,.45);z-index:5;padding:10px;box-sizing:border-box}' +
    '.wq37-card{background:#fffaf0;border:4px solid #2b1d4a;border-radius:24px;padding:16px 18px;max-width:560px;width:100%;max-height:100%;overflow:auto;box-sizing:border-box;text-align:center;color:#2b1d4a;box-shadow:0 8px 0 rgba(43,29,74,.35)}' +
    '.wq37-card h1{margin:0 0 6px;font-size:28px;color:#ff3d8b;text-shadow:2px 2px 0 #ffe36a;line-height:1.2;overflow-wrap:anywhere}' +
    '.wq37-card h2{margin:0 0 8px;font-size:26px}' +
    '.wq37-legend{display:flex;flex-wrap:wrap;gap:8px;justify-content:center;margin:8px 0}' +
    '.wq37-li{flex:1 1 auto;background:#e6f5ff;border:2px solid #2fa8ff;border-radius:14px;padding:6px 4px;font-size:14px;font-weight:700}' +
    '.wq37-ic{font-size:30px;line-height:1.2;font-family:' + EMOJI + ',' + FONT + ';white-space:nowrap}' +
    '.wq37-key{display:inline-block;min-width:24px;padding:2px 6px;margin:1px;border:2px solid #2b1d4a;border-bottom-width:4px;border-radius:7px;background:#fff;font:800 16px ' + EFONT + '}' +
    '.wq37-tiers{display:grid;grid-template-columns:repeat(5,1fr);gap:6px;margin:10px 0 6px}' +
    '.wq37-tier{min-height:68px;border:3px solid #2b1d4a;border-radius:16px;background:#fff;color:#2b1d4a;font:800 15px ' + FONT + ';display:flex;flex-direction:column;align-items:center;justify-content:center;padding:4px 2px;cursor:pointer;box-shadow:0 3px 0 rgba(43,29,74,.35);touch-action:manipulation}' +
    '.wq37-tier .tic{font-size:26px;line-height:1.15;font-family:' + EMOJI + ',' + FONT + '}' +
    '.wq37-tier .tnum{font:900 11px ' + EFONT + ';opacity:.6;line-height:1}' +
    '.wq37-tier.on{background:#ffe36a;border-color:#ff3d8b;transform:translateY(-2px);box-shadow:0 5px 0 #ff3d8b}' +
    '.wq37-tdesc{min-height:40px;font-size:15px;font-weight:800;line-height:1.35}' +
    '.wq37-tdesc small{display:block;font-size:13px;font-weight:700;opacity:.75}' +
    '.wq37-go{margin-top:10px;font-size:26px;font-weight:800;color:#fff;background:#ff3d8b;border:4px solid #2b1d4a;border-radius:40px;padding:10px 40px;min-height:56px;cursor:pointer;box-shadow:0 5px 0 #2b1d4a;font-family:' + FONT + ';touch-action:manipulation}' +
    '.wq37-go.alt{background:#2fa8ff;margin-left:8px}' +
    '.wq37-go.next{background:#17c3a8;display:block;margin:10px auto 0}' +
    '.wq37-go.small{font-size:20px;padding:8px 24px;min-height:48px}' +
    '.wq37-stars{font-size:46px;letter-spacing:4px;color:#ffc400;text-shadow:0 3px 0 #2b1d4a}' +
    '.wq37-stars i{font-style:normal;color:#d8d2c4;text-shadow:none}' +
    '.wq37-rec{display:inline-block;margin:4px 0;padding:4px 16px;border-radius:30px;background:#ffe36a;border:3px solid #2b1d4a;color:#d81b60;font:900 22px ' + EFONT + ';animation:wq37pop .7s ease-in-out infinite alternate}' +
    '@keyframes wq37pop{from{transform:scale(1) rotate(-3deg)}to{transform:scale(1.12) rotate(3deg)}}' +
    '@media (prefers-reduced-motion:reduce){.wq37-rec{animation:none}.wq37-tier.on{transform:none}}' +
    '.wq37-stat{display:flex;gap:8px;justify-content:center;margin:8px 0}.wq37-stat div{flex:1;background:#fff0b8;border:2px solid #ffae00;border-radius:12px;padding:6px 2px;font-weight:800;font-size:20px}.wq37-stat span{display:block;font-size:13px;font-weight:700}' +
    '.wq37-words{display:flex;flex-wrap:wrap;gap:5px;justify-content:center;margin:6px 0}.wq37-words span{padding:3px 9px;border-radius:14px;font:800 14px ' + EFONT + ';background:#d8f6e4;border:2px solid #17c3a8}.wq37-words span.bad{background:#ffe0e6;border-color:#ff5f7e}' +
    '.wq37-opt{display:flex;align-items:center;justify-content:center;gap:10px;margin:10px 0;font-size:16px;font-weight:800}' +
    '.wq37-opt input{width:150px;height:32px}' +
    '.wq37-mutebig{min-height:56px;min-width:56px;font-size:28px;border:4px solid #2b1d4a;border-radius:40px;background:#fff;cursor:pointer;box-shadow:0 4px 0 #2b1d4a;font-family:' + EMOJI + ',' + FONT + ';padding:4px 20px;touch-action:manipulation}' +
    '.wq37-coin{display:inline-block;margin:4px 0;padding:2px 14px;border-radius:30px;background:#fff6c8;border:3px solid #ffae00;font:900 20px ' + EFONT + '}';

  /* ---------- learning card: shared look with the other R3.7 game (fps_game.js / runner_game.js keep identical copies) ---------- */
  var LC_F = '"PingFang HK","Noto Sans HK","Microsoft JhengHei","WenQuanYi Zen Hei","Noto Sans CJK TC",system-ui,sans-serif';
  var LC_E = '"Arial Rounded MT Bold","Trebuchet MS","Noto Sans",Arial,sans-serif';
  var LC_M = '"Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif';
  var LC_CSS =
    '.wqlc-ov{position:absolute;inset:0;z-index:6;display:flex;align-items:center;justify-content:center;padding:10px;box-sizing:border-box;background:rgba(20,14,50,.55)}' +
    '.wqlc{width:min(520px,94%);max-height:100%;overflow:auto;box-sizing:border-box;background:#fffaf0;border:5px solid #2b1d4a;border-radius:28px;box-shadow:0 10px 0 rgba(43,29,74,.4);text-align:center;color:#2b1d4a;font-family:' + LC_F + ';animation:wqlcIn .24s cubic-bezier(.2,.9,.3,1.25)}' +
    '.wqlc.bad{animation:wqlcIn .24s cubic-bezier(.2,.9,.3,1.25),wqlcNo .42s .24s ease-in-out}' +
    '.wqlc-hd{padding:8px 12px;font-weight:900;font-size:clamp(22px,5.5vmin,34px);color:#fff;text-shadow:0 2px 0 rgba(0,0,0,.25)}' +
    '.wqlc.ok .wqlc-hd{background:#17b978}.wqlc.bad .wqlc-hd{background:#f0434f}' +
    '.wqlc-bd{padding:clamp(6px,2.4vmin,18px) 14px clamp(8px,2.6vmin,18px);display:flex;flex-direction:column;align-items:center;gap:clamp(4px,1.2vmin,10px)}' +
    '.wqlc-pic{font-size:clamp(46px,14vmin,104px);line-height:1.05;font-family:' + LC_M + '}' +
    '.wqlc-ans{display:flex;flex-direction:column;align-items:center;padding:4px 24px 6px;border-radius:22px;background:#e3fbef;border:4px solid #17b978;max-width:100%;box-sizing:border-box}' +
    '.wqlc-en{font:900 clamp(40px,12vmin,84px)/1.08 ' + LC_E + ';letter-spacing:1px;overflow-wrap:anywhere;color:#0d7a4f}' +
    '.wqlc-zh{font-weight:900;font-size:clamp(22px,6vmin,38px);line-height:1.2}' +
    '.wqlc-you{font-weight:800;font-size:clamp(15px,3.8vmin,20px);color:#b3202e;background:#ffe3e6;border:2px dashed #f0434f;border-radius:14px;padding:3px 12px}' +
    '.wqlc-you s{font-family:' + LC_E + ';text-decoration-thickness:3px}' +
    '.wqlc-row{display:flex;gap:12px;justify-content:center;align-items:center}' +
    '.wqlc-say{width:56px;height:56px;border-radius:50%;border:4px solid #2b1d4a;background:#fff;font-size:26px;cursor:pointer;box-shadow:0 4px 0 #2b1d4a;font-family:' + LC_M + ';touch-action:manipulation;padding:0}' +
    '.wqlc-go{min-height:56px;padding:8px 28px;border-radius:40px;border:4px solid #2b1d4a;background:#f0434f;color:#fff;font:900 22px ' + LC_F + ';cursor:pointer;box-shadow:0 5px 0 #2b1d4a;touch-action:manipulation}' +
    '.wqlc.ok .wqlc-go{background:#17b978}' +
    '.wqlc-go:disabled{opacity:.45;cursor:default;box-shadow:0 2px 0 #2b1d4a}' +
    '.wqlc-go:focus-visible,.wqlc-say:focus-visible{outline:4px solid #2fa8ff;outline-offset:3px}' +
    '.wqlc-bar{height:8px;background:rgba(43,29,74,.12)}.wqlc-bar i{display:block;height:100%;width:0;background:#ffc93c}' +
    '@keyframes wqlcIn{from{transform:scale(.6);opacity:0}to{transform:none;opacity:1}}' +
    '@keyframes wqlcNo{0%,100%{transform:none}25%{transform:translateX(-10px)}75%{transform:translateX(10px)}}' +
    '@media (prefers-reduced-motion:reduce){.wqlc,.wqlc.bad{animation:none}}';
  var LC_OK = { min: 0.8, max: 2.4 }, LC_BAD = { min: 2.0, max: 8, again: 2.6 };
  function lcEsc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  /* tests switch the card off with localStorage 'wq37-nolearn'='1'; hosts can pass opts.learnCard=false */
  function lcEnabled(o) { if (o && o.learnCard === false) return false; try { return localStorage.getItem('wq37-nolearn') !== '1'; } catch (e) { return true; } }
  function lcBuild(doc, ok, w, picked) {
    if (!doc.getElementById('wqlc-css')) { var st = doc.createElement('style'); st.id = 'wqlc-css'; st.textContent = LC_CSS; (doc.head || doc.documentElement).appendChild(st); }
    var ov = doc.createElement('div'); ov.className = 'wqlc-ov';
    ov.innerHTML = '<div class="wqlc ' + (ok ? 'ok' : 'bad') + '" role="alertdialog" aria-live="assertive" aria-label="' + (ok ? '答對了' : '正確答案') + '">' +
      '<div class="wqlc-hd">' + (ok ? '✔ 答對了！' : '✘ 正確答案是') + '</div><div class="wqlc-bd">' +
      '<div class="wqlc-pic" aria-hidden="true">' + lcEsc(w.emoji || '🔤') + '</div>' +
      '<div class="wqlc-ans"><span class="wqlc-en" lang="en">' + lcEsc(w.en) + '</span>' + (w.zh ? '<span class="wqlc-zh">' + lcEsc(w.zh) + '</span>' : '') + '</div>' +
      (!ok && picked ? '<div class="wqlc-you">你選了 <s lang="en">' + lcEsc(picked.en) + '</s>' + (picked.zh ? ' ＝ ' + lcEsc(picked.zh) : '') + '</div>' : '') +
      '<div class="wqlc-row"><button type="button" class="wqlc-say" data-lc="say" aria-label="再聽一次">🔊</button>' +
      '<button type="button" class="wqlc-go" data-lc="go"' + (ok ? '' : ' disabled') + '>' + (ok ? '繼續 ▶' : '記住了 ▶') + '</button></div>' +
      '</div><div class="wqlc-bar" aria-hidden="true"><i></i></div></div>';
    return ov;
  }

  var current = null;
  var ctxCount = 0;   /* live AudioContexts created by this module (debug / leak test) */

  function start(container, opts) {
    opts = opts || {};
    var words = (opts.words || []).filter(function (w) { return w && w.en; }).map(function (w, i) {
      return { en: String(w.en), zh: w.zh ? String(w.zh) : '', emoji: w.emoji ? String(w.emoji) : '', i: i, _l: [], _g: null };
    });
    if (words.length < 4) throw new Error('WQ37FPS: need at least 4 words');
    var mode = opts.mode === 'level' ? 'level' : 'free';
    var tier = clamp(Math.round(opts.difficulty || 1), 1, 5), di = tier - 1;
    var lockDiff = !!opts.lockDifficulty;
    var baseRounds = Math.max(1, (opts.rounds | 0) || (mode === 'level' ? words.length : 10));
    var totalRounds = baseRounds;
    var title = opts.title ? String(opts.title) : '字母獵場 Word Blaster';
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
    var img = null, buf = null, zb = null, ST = 0;
    var cw = 320, ch = 180, dpr = 1, RW0 = 480, RH0 = 270, RW = 480, RH = 270, F = 360, PL = 0.66, S = 1, scale = 1, hudU = 1;
    container.appendChild(styleEl); container.appendChild(root);

    /* touch / HUD buttons */
    function mkBtn(cls, label, text) { var b = document.createElement('button'); b.className = 'wq37-btn ' + cls; b.setAttribute('aria-label', label); b.textContent = text; b.style.fontFamily = EMOJI; return b; }
    var fireBtn = mkBtn('wq37-fire', '開火', '🔫'), pauseBtn = mkBtn('wq37-pause', '暫停', '⏸'), sayBtn = mkBtn('wq37-say', '再聽一次', '🔊');
    var muteBtn = soundOn ? mkBtn('wq37-mute', '聲音', '🔊') : null;
    var joy = document.createElement('div'); joy.className = 'wq37-joy'; var knob = document.createElement('div'); knob.className = 'wq37-knob'; joy.appendChild(knob);
    root.appendChild(joy); root.appendChild(fireBtn); root.appendChild(pauseBtn); root.appendChild(sayBtn); if (muteBtn) root.appendChild(muteBtn);
    var ovEl = null;

    /* game state */
    var P = { x: 7.5, y: 12.5, a: -Math.PI / 2 };
    var G = {};
    var keys = {};
    var targets = [], bugs = [], spits = [], projs = [], pickups = [], trails = [], floaters = [], smokes = [];
    var order = [], cur = null, arenaIdx = 0, LW = {}, PW = [];
    var jx = 0, jy = 0, joyId = null, joyOx = 0, joyOy = 0, lookId = null, lookX = 0, lookPend = 0;
    var touchMode = false, dragging = false, lockDenied = false, wasLocked = false;
    var shake = 0, flash = 0, flashCi = 0, hint = null, gunBob = 0, recoil = 0, cool = 0, muzzle = 0, hitM = 0, dmgV = 0, comboT = 0, comboM = 1, stepAcc = 0, turnV = 0, sens = loadSens();
    var avgMs = 0, introA = 0, resultShown = false, overT = 0, lastResult = null, finishedCalled = false;
    var ro = null, sayShown = false, muted = loadMute(), timers = [], hinting = false, aimLock = 0;
    var PJ = { x: 0, y: 0, depth: 0, size: 0 };
    var SP = [], SL = [], sn = 0, MZ = { x: 0, y: 0 };
    var FRAME = 0, hudK = {}, dtS = 1 / 60, uiState = '';

    /* ---------- label / sprite caches (all text and emoji are rasterised once, never per frame) ---------- */
    var measC = document.createElement('canvas').getContext('2d');
    function mkCv(w, h) {
      var c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w * dpr)); c.height = Math.max(1, Math.ceil(h * dpr));
      c.getContext('2d').scale(dpr, dpr); return c;
    }
    var LBL = {}, lblN = 0, FSZ = [10, 12, 14, 16, 18, 20, 22, 26, 30, 36, 44, 54, 66, 80, 100];
    function fszIdx(s) { for (var i = 0; i < FSZ.length; i++) if (s <= FSZ[i] * 1.06) return i; return FSZ.length - 1; }
    /* kind: 0 zh outlined, 1 en outlined, 2 emoji, 3 zh plain, 4 en plain */
    function label(txt, kind, size, fill) {
      var si = fszIdx(size), key = kind + '|' + si + '|' + fill + '|' + txt, e = LBL[key];
      if (e) return e;
      if (lblN > 600) { LBL = {}; lblN = 0; }
      var fs = FSZ[si], font = (kind === 2 ? fs + 'px ' + EMOJI : '800 ' + fs + 'px ' + (kind === 1 || kind === 4 ? EFONT : FONT));
      measC.font = font;
      var lw = kind < 2 ? Math.max(3, fs * 0.24) : 0, tw = measC.measureText(txt).width, w = tw + lw + 6, h = fs * 1.45 + lw;
      var c = mkCv(w, h), g = c.getContext('2d');
      g.font = font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
      if (kind < 2) { g.lineWidth = lw; g.strokeStyle = DARK; g.strokeText(txt, w / 2, h / 2 + fs * 0.04); }
      g.fillStyle = kind === 2 ? '#000' : fill || '#fff'; g.fillText(txt, w / 2, h / 2 + fs * 0.04);
      e = { c: c, w: w, h: h, fs: fs, tw: tw };
      LBL[key] = e; lblN++;
      return e;
    }
    function mkHL(kind, fill) { return { t: null, e: null, kind: kind, fill: fill, size: 0 }; }
    function hlSet(hl, txt, size) {
      size = Math.round(size);
      if (hl.t !== txt || hl.size !== size) { hl.t = txt; hl.size = size; hl.e = label(txt, hl.kind, size, hl.fill); }
    }
    function hlDraw(hl, x, y, al, alpha) {
      var e = hl.e; if (!e) return;
      var k = hl.size / e.fs, w = e.w * k, h = e.h * k;
      if (alpha !== undefined && alpha < 1) ctx.globalAlpha = alpha;
      ctx.drawImage(e.c, al === 1 ? x - 3 * k : al === 2 ? x - w + 3 * k : x - w / 2, y - h / 2, w, h);
      if (alpha !== undefined && alpha < 1) ctx.globalAlpha = 1;
    }
    function drawLbl(e, x, y, size, al) {
      var k = size / e.fs, w = e.w * k, h = e.h * k;
      ctx.drawImage(e.c, al === 1 ? x - 3 * k : al === 2 ? x - w + 3 * k : x - w / 2, y - h / 2, w, h);
    }
    function bucketOf(r) { for (var i = 0; i < NB; i++) if (r <= BUCKETS[i] * 1.12) return i; return NB - 1; }
    function mkSpr(R, padK) {
      var pad = Math.ceil(R * padK) + 3, sz = 2 * (R + pad), c = mkCv(sz, sz);
      return { c: c, g: c.getContext('2d'), sz: sz, hs: sz / 2, R: R };
    }
    function drawSpr(e, x, y, r, sx, sy) {
      var k = r / e.R, w = e.sz * k * sx, h = e.sz * k * sy;
      ctx.drawImage(e.c, x - w / 2, y - h / 2, w, h);
    }
    function outlineG(g, t, x, y, size, fill, font) {
      g.font = '800 ' + size + 'px ' + font; g.textAlign = 'center'; g.textBaseline = 'middle'; g.lineJoin = 'round';
      g.lineWidth = Math.max(3, size * 0.24); g.strokeStyle = DARK; g.strokeText(t, x, y); g.fillStyle = fill || '#fff'; g.fillText(t, x, y);
    }

    /* bubble body (per colour & radius bucket), bubble label (per word, mode & bucket) */
    var BODY = [];
    function genBody(col, R) {
      var s = mkSpr(R, 0.3), g = s.g, c = s.hs;
      var hg = g.createRadialGradient(c, c, R * 0.85, c, c, s.hs);
      hg.addColorStop(0, 'rgba(' + COLORS_RGB[col] + ',.5)'); hg.addColorStop(1, 'rgba(' + COLORS_RGB[col] + ',0)');
      g.fillStyle = hg; g.beginPath(); g.arc(c, c, s.hs, 0, TWO_PI); g.fill();
      var gr = g.createRadialGradient(c - R * 0.35, c - R * 0.4, R * 0.1, c, c, R);
      gr.addColorStop(0, '#ffffff'); gr.addColorStop(0.26, COLORS[col]); gr.addColorStop(1, COLORS_D[col]);
      g.beginPath(); g.arc(c, c, R, 0, TWO_PI); g.fillStyle = gr; g.fill();
      g.lineWidth = Math.max(2, R * 0.07); g.strokeStyle = DARK; g.stroke();
      g.beginPath(); g.arc(c, c, R * 0.88, 0, TWO_PI); g.lineWidth = Math.max(1.5, R * 0.05); g.strokeStyle = 'rgba(255,255,255,.85)'; g.stroke();
      g.beginPath(); g.arc(c, c, R * 0.8, 0.15 * Math.PI, 0.85 * Math.PI); g.lineWidth = Math.max(1.5, R * 0.05); g.strokeStyle = 'rgba(255,255,255,.35)'; g.stroke();
      g.beginPath(); g.ellipse(c - R * 0.42, c - R * 0.5, R * 0.2, R * 0.11, -0.7, 0, TWO_PI); g.fillStyle = 'rgba(255,255,255,.92)'; g.fill();
      return s;
    }
    /* sprites are generated off the frame path: a missing size bucket borrows the nearest ready one while a queued job builds it */
    var GENQ = [], genT = 0;
    function genKick() { if (!genT && !dead) genT = setTimeout(genRun, 6); }
    function genRun() {
      genT = 0; if (dead) return;
      var j = GENQ.shift();
      if (j && !j.arr[j.k]) j.arr[j.k] = j.gen(j.b);
      if (GENQ.length) genKick();
    }
    function warm(arr, k, b, gen) { if (arr[k] === undefined) { arr[k] = 0; GENQ.push({ arr: arr, k: k, b: b, gen: gen }); genKick(); } }
    function lazyGet(arr, k, lo, b, gen) {
      var e = arr[k];
      if (e) return e;
      if (e === undefined) { arr[k] = 0; GENQ.unshift({ arr: arr, k: k, b: b, gen: gen }); genKick(); }
      for (var d = 1; d < NB; d++) {
        var c = b + d < NB ? arr[lo + b + d] : 0; if (c) return c;
        c = b - d >= 0 ? arr[lo + b - d] : 0; if (c) return c;
      }
      e = gen(b); arr[k] = e; return e;
    }
    var genBodyFn = [];
    function bodyGen(col) { return genBodyFn[col] || (genBodyFn[col] = function (bb) { return genBody(col, BUCKETS[bb]); }); }
    function bodySpr(col, b) { return lazyGet(BODY, col * NB + b, col * NB, b, bodyGen(col)); }
    function genLabel(w, md, R) {   /* md 0 = English word, 1 = picture (emoji + zh), 2 = single boss letter */
      var W = Math.ceil(R * 2.1), H = Math.ceil(R * 2.1), c = mkCv(W, H), g = c.getContext('2d'), fs, tw, maxW;
      var cx = W / 2, cy = H / 2;
      if (md === 1) {
        var em = w.emoji || '', zh = w.zh || '';
        if (em) {
          g.beginPath(); g.arc(cx, cy - (zh ? R * 0.1 : 0), R * (zh ? 0.58 : 0.7), 0, TWO_PI); g.fillStyle = 'rgba(255,255,255,.88)'; g.fill();
          fs = clamp(R * (zh ? 0.78 : 1.05), 14, 160); g.font = fs + 'px ' + EMOJI; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#000';
          g.fillText(em, cx, cy - (zh ? R * 0.08 : 0) + fs * 0.05);
        }
        if (zh) {
          fs = em ? clamp(R * 0.36, 11, 60) : clamp(R * 0.62, 14, 100); g.font = '800 ' + fs + 'px ' + FONT; tw = g.measureText(zh).width; maxW = R * 1.7;
          if (tw > maxW) fs = Math.max(10, fs * maxW / tw);
          outlineG(g, zh, cx, cy + (em ? R * 0.68 : R * 0.05), fs, '#fff', FONT);
        }
      } else {
        fs = md === 2 ? clamp(R * 1.15, 18, 200) : clamp(R * 0.6, 14, 120);
        g.font = '800 ' + fs + 'px ' + EFONT; tw = g.measureText(w.en).width; maxW = R * 1.85;
        if (tw > maxW) fs = Math.max(11, fs * maxW / tw);
        outlineG(g, w.en, cx, cy + R * 0.05, fs, '#fff', EFONT);
      }
      return { c: c, sz: W, R: R };
    }
    function labelGen(w, md) { var m = w._g || (w._g = []); return m[md] || (m[md] = function (bb) { return genLabel(w, md, BUCKETS[bb]); }); }
    function wordLabel(w, md, b) { return lazyGet(w._l, md * NB + b, md * NB, b, labelGen(w, md)); }

    /* shared soft sprites */
    var SOFT = {};
    function softSpr(name, fn, R) {
      var e = SOFT[name];
      if (!e) { e = SOFT[name] = mkSpr(R, 0.1); fn(e.g, e.hs, R); }
      return e;
    }
    function shadowSpr() { return softSpr('shadow', function (g, c, R) { var gr = g.createRadialGradient(c, c, 0, c, c, R); gr.addColorStop(0, 'rgba(25,20,70,.5)'); gr.addColorStop(0.6, 'rgba(25,20,70,.25)'); gr.addColorStop(1, 'rgba(25,20,70,0)'); g.fillStyle = gr; g.beginPath(); g.arc(c, c, R, 0, TWO_PI); g.fill(); }, 48); }
    function glowSpr() { return softSpr('glow', function (g, c, R) { var gr = g.createRadialGradient(c, c, R * 0.4, c, c, R); gr.addColorStop(0, 'rgba(255,240,120,.9)'); gr.addColorStop(0.55, 'rgba(255,230,90,.45)'); gr.addColorStop(1, 'rgba(255,230,90,0)'); g.fillStyle = gr; g.beginPath(); g.arc(c, c, R, 0, TWO_PI); g.fill(); }, 64); }
    var PUFFN = ['puff0', 'puff1', 'puff2'];
    function puffSpr(n) {
      return softSpr(PUFFN[n], function (g, c, R) {
        var rgb = n === 0 ? '255,70,90' : n === 1 ? '255,255,255' : '255,230,120';
        var gr = g.createRadialGradient(c, c, 0, c, c, R); gr.addColorStop(0, 'rgba(' + rgb + ',.95)'); gr.addColorStop(0.5, 'rgba(' + rgb + ',.5)'); gr.addColorStop(1, 'rgba(' + rgb + ',0)');
        g.fillStyle = gr; g.beginPath(); g.arc(c, c, R, 0, TWO_PI); g.fill();
      }, 40);
    }
    function ringSpr() { return softSpr('ring', function (g, c, R) { g.beginPath(); g.arc(c, c, R * 0.82, 0, TWO_PI); g.lineWidth = R * 0.14; g.strokeStyle = 'rgba(255,255,255,.95)'; g.stroke(); g.beginPath(); g.arc(c, c, R * 0.82, 0, TWO_PI); g.lineWidth = R * 0.34; g.strokeStyle = 'rgba(255,235,120,.35)'; g.stroke(); }, 64); }
    function sparkSpr() { return softSpr('spark', function (g, c, R) { var gr = g.createRadialGradient(c, c, 0, c, c, R); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.35, 'rgba(255,225,110,.9)'); gr.addColorStop(1, 'rgba(255,170,60,0)'); g.fillStyle = gr; g.beginPath(); g.arc(c, c, R, 0, TWO_PI); g.fill(); }, 20); }
    function coinSpr() {
      return softSpr('coin', function (g, c, R) {
        g.beginPath(); g.arc(c, c, R * 0.8, 0, TWO_PI); g.fillStyle = '#ffc400'; g.fill(); g.lineWidth = R * 0.12; g.strokeStyle = DARK; g.stroke();
        g.beginPath(); g.arc(c, c, R * 0.52, 0, TWO_PI); g.lineWidth = R * 0.1; g.strokeStyle = '#ffe98a'; g.stroke();
        g.beginPath(); g.ellipse(c - R * 0.25, c - R * 0.3, R * 0.14, R * 0.07, -0.7, 0, TWO_PI); g.fillStyle = 'rgba(255,255,255,.9)'; g.fill();
      }, 24);
    }
    function lightSpr() { return softSpr('light', function (g, c, R) { var gr = g.createRadialGradient(c, c, 0, c, c, R); gr.addColorStop(0, 'rgba(255,230,160,1)'); gr.addColorStop(0.4, 'rgba(255,190,100,.5)'); gr.addColorStop(1, 'rgba(255,160,60,0)'); g.fillStyle = gr; g.beginPath(); g.arc(c, c, R, 0, TWO_PI); g.fill(); }, 128); }
    function smokeSpr() { return softSpr('smoke', function (g, c, R) { var gr = g.createRadialGradient(c, c, 0, c, c, R); gr.addColorStop(0, 'rgba(255,255,255,.75)'); gr.addColorStop(0.6, 'rgba(235,240,255,.35)'); gr.addColorStop(1, 'rgba(235,240,255,0)'); g.fillStyle = gr; g.beginPath(); g.arc(c, c, R, 0, TWO_PI); g.fill(); }, 32); }

    /* enemy sprites: small sets of pre-rendered frames per radius bucket */
    var SPR_BUG = [], SPR_SPIT = [], SPR_BOSS = [], SPR_ORB = [], SPR_PICK = [], SPR_HEART = [];
    function eyeG(g, x, y, r, blink, pupil, look) {
      if (blink) { g.beginPath(); g.moveTo(x - r, y); g.quadraticCurveTo(x, y + r * 0.5, x + r, y); g.lineWidth = Math.max(2, r * 0.3); g.strokeStyle = DARK; g.lineCap = 'round'; g.stroke(); return; }
      g.beginPath(); g.arc(x, y, r, 0, TWO_PI); g.fillStyle = '#fff'; g.fill(); g.lineWidth = Math.max(1.5, r * 0.24); g.strokeStyle = DARK; g.stroke();
      g.beginPath(); g.arc(x + (look || 0), y + r * 0.2, r * 0.45, 0, TWO_PI); g.fillStyle = pupil || DARK; g.fill();
      g.beginPath(); g.arc(x + (look || 0) - r * 0.15, y, r * 0.15, 0, TWO_PI); g.fillStyle = '#fff'; g.fill();
    }
    function genBug(frame, blink, R) {
      var s = mkSpr(R, 0.55), g = s.g, c = s.hs, i, j, r = R;
      g.strokeStyle = DARK; g.lineWidth = Math.max(2, r * 0.1); g.lineCap = 'round'; g.lineJoin = 'round';
      for (i = -1; i <= 1; i += 2) {
        g.beginPath(); g.moveTo(c + i * r * 0.5, c - r * 0.8); g.lineTo(c + i * r * 0.8, c - r * 1.4); g.stroke();
        g.beginPath(); g.arc(c + i * r * 0.8, c - r * 1.4, r * 0.16, 0, TWO_PI); g.fillStyle = '#ffe36a'; g.fill(); g.stroke();
        for (j = 0; j < 3; j++) { var o = frame ? (j % 2 ? 0.14 : -0.1) : (j % 2 ? -0.1 : 0.14); g.beginPath(); g.moveTo(c + i * r * 0.7, c + r * (0.1 + j * 0.3)); g.lineTo(c + i * r * 1.2, c + r * (0.3 + j * 0.3 + o)); g.stroke(); }
      }
      var gr = g.createRadialGradient(c - r * 0.3, c - r * 0.4, r * 0.1, c, c, r); gr.addColorStop(0, '#e4ffaa'); gr.addColorStop(1, '#5fc030');
      g.beginPath(); g.arc(c, c, r, 0, TWO_PI); g.fillStyle = gr; g.fill(); g.stroke();
      g.beginPath(); g.ellipse(c, c + r * 0.55, r * 0.7, r * 0.3, 0, 0, Math.PI); g.fillStyle = 'rgba(40,110,20,.25)'; g.fill();
      g.beginPath(); g.arc(c - r * 0.1, c - r * 0.55, r * 0.17, 0, TWO_PI); g.arc(c + r * 0.3, c - r * 0.62, r * 0.1, 0, TWO_PI); g.fillStyle = 'rgba(255,255,255,.55)'; g.fill();
      eyeG(g, c - r * 0.38, c - r * 0.15, r * 0.3, blink); eyeG(g, c + r * 0.38, c - r * 0.15, r * 0.3, blink);
      g.beginPath(); g.arc(c, c + r * 0.3, r * 0.3, 0.15 * Math.PI, 0.85 * Math.PI); g.lineWidth = Math.max(1.5, r * 0.08); g.strokeStyle = DARK; g.stroke();
      return s;
    }
    function genSpit(warn, blink, R) {
      var s = mkSpr(R, 0.8), g = s.g, c = s.hs, r = R;
      g.strokeStyle = DARK; g.lineWidth = Math.max(2, r * 0.1); g.lineCap = 'round'; g.lineJoin = 'round';
      g.beginPath(); g.moveTo(c, c - r * 0.9); g.lineTo(c, c - r * 1.6); g.stroke();
      g.beginPath(); g.arc(c, c - r * 1.65, r * 0.17, 0, TWO_PI); g.fillStyle = warn ? '#ff5a3c' : '#ffe36a'; g.fill(); g.stroke();
      var gr = g.createRadialGradient(c - r * 0.3, c - r * 0.4, r * 0.1, c, c, r); gr.addColorStop(0, warn ? '#ffd0a0' : '#e5ccff'); gr.addColorStop(1, warn ? '#ff7a3c' : '#8a55e0');
      g.beginPath(); g.arc(c, c, r, 0, TWO_PI); g.fillStyle = gr; g.fill(); g.stroke();
      for (var i = -1; i <= 1; i += 2) { g.beginPath(); g.arc(c + i * r * 0.78, c + r * 0.52, r * 0.2, 0, TWO_PI); g.fillStyle = warn ? '#ff9a3c' : '#a678f0'; g.fill(); g.stroke(); }
      if (blink) { eyeG(g, c, c - r * 0.18, r * 0.42, true); }
      else { eyeG(g, c, c - r * 0.18, r * 0.42, false, warn ? '#e02020' : DARK, 0); }
      g.beginPath(); g.ellipse(c, c + r * 0.45, r * 0.34, r * (warn ? 0.3 : 0.12), 0, 0, TWO_PI); g.fillStyle = warn ? '#ffd23f' : DARK; g.fill(); g.lineWidth = Math.max(1.5, r * 0.07); g.stroke();
      return s;
    }
    function genOrb(R) {
      var s = mkSpr(R, 1.3), g = s.g, c = s.hs, r = R;
      var gr = g.createRadialGradient(c, c, r * 0.3, c, c, r * 2.3); gr.addColorStop(0, 'rgba(255,190,70,.85)'); gr.addColorStop(1, 'rgba(255,90,40,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(c, c, r * 2.3, 0, TWO_PI); g.fill();
      g.beginPath(); g.arc(c, c, r, 0, TWO_PI); g.fillStyle = '#ff6a2c'; g.fill(); g.lineWidth = Math.max(2.5, r * 0.22); g.strokeStyle = DARK; g.stroke();
      g.beginPath(); g.arc(c - r * 0.2, c - r * 0.2, r * 0.45, 0, TWO_PI); g.fillStyle = '#ffe9a0'; g.fill();
      return s;
    }
    function genBoss(atk, blink, mouth, R) {
      var s = mkSpr(R, 0.5), g = s.g, c = s.hs, r = R, side, mo = mouth === 0 ? 0.14 : mouth === 1 ? 0.2 : 0.34;
      g.lineJoin = 'round'; g.lineWidth = Math.max(3, r * 0.05); g.strokeStyle = DARK;
      for (side = -1; side <= 1; side += 2) {
        g.beginPath(); g.moveTo(c + side * r * 0.5, c - r * 0.75); g.lineTo(c + side * r * 0.85, c - r * 1.4); g.lineTo(c + side * r * 0.12, c - r * 0.95); g.closePath(); g.fillStyle = '#ffe36a'; g.fill(); g.stroke();
        g.beginPath(); g.arc(c + side * r * 1.0, c + r * 0.25, r * 0.26, 0, TWO_PI); g.fillStyle = atk ? '#e0405a' : '#8a55e0'; g.fill(); g.stroke();
      }
      var gr = g.createRadialGradient(c - r * 0.35, c - r * 0.45, r * 0.1, c, c, r); gr.addColorStop(0, atk ? '#ffb0b0' : '#e0c4ff'); gr.addColorStop(1, atk ? '#d02a4a' : '#7a45d8');
      g.beginPath(); g.arc(c, c, r, 0, TWO_PI); g.fillStyle = gr; g.fill(); g.stroke();
      g.beginPath(); g.ellipse(c, c + r * 0.5, r * 0.6, r * 0.35, 0, 0, TWO_PI); g.fillStyle = 'rgba(255,255,255,.22)'; g.fill();
      for (side = -1; side <= 1; side += 2) {
        eyeG(g, c + side * r * 0.36, c - r * 0.22, r * 0.27, blink, atk ? '#e02020' : DARK, side * r * 0.04);
        g.beginPath(); g.moveTo(c + side * r * 0.68, c - r * 0.6); g.lineTo(c + side * r * 0.08, c - r * 0.4); g.lineWidth = Math.max(4, r * 0.08); g.stroke(); g.lineWidth = Math.max(3, r * 0.05);
      }
      g.beginPath(); g.ellipse(c, c + r * 0.38, r * 0.42, r * mo, 0, 0, TWO_PI); g.fillStyle = '#3a0f3f'; g.fill(); g.stroke();
      g.fillStyle = '#fff';
      for (side = -2; side <= 2; side++) { g.beginPath(); g.moveTo(c + side * r * 0.14 - r * 0.07, c + r * 0.38 - r * mo * 0.95); g.lineTo(c + side * r * 0.14 + r * 0.07, c + r * 0.38 - r * mo * 0.95); g.lineTo(c + side * r * 0.14, c + r * 0.38 - r * mo * 0.3); g.closePath(); g.fill(); }
      return s;
    }
    var PICK_TYPES = ['slow', 'triple', 'shield', 'freeze', 'heart'];
    function genPick(ti, R) {
      var s = mkSpr(R, 0.9), g = s.g, c = s.hs, r = R, type = PICK_TYPES[ti];
      var gr = g.createRadialGradient(c, c, r * 0.2, c, c, r * 1.7); gr.addColorStop(0, 'rgba(255,255,160,.9)'); gr.addColorStop(1, 'rgba(255,255,160,0)');
      g.fillStyle = gr; g.beginPath(); g.arc(c, c, r * 1.7, 0, TWO_PI); g.fill();
      g.beginPath(); g.arc(c, c, r, 0, TWO_PI); g.fillStyle = '#fffbe0'; g.fill(); g.lineWidth = Math.max(2, r * 0.1); g.strokeStyle = DARK; g.stroke();
      iconG(g, type, c, c, r * 0.65);
      return s;
    }
    function heartG(g, x, y, s, fill) {
      g.beginPath(); g.moveTo(x, y + s * 0.9);
      g.bezierCurveTo(x - s * 1.3, y - s * 0.1, x - s * 0.6, y - s * 1.0, x, y - s * 0.35);
      g.bezierCurveTo(x + s * 0.6, y - s * 1.0, x + s * 1.3, y - s * 0.1, x, y + s * 0.9);
      g.closePath(); g.fillStyle = fill; g.fill(); g.lineWidth = Math.max(2, s * 0.2); g.strokeStyle = DARK; g.stroke();
    }
    function starG(g, x, y, r, fill) {
      g.beginPath();
      for (var i = 0; i < 10; i++) { var rr = i & 1 ? r * 0.45 : r, a = -Math.PI / 2 + i * Math.PI / 5; g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
      g.closePath(); g.fillStyle = fill; g.fill(); g.lineWidth = Math.max(1.5, r * 0.15); g.strokeStyle = DARK; g.stroke();
    }
    function flakeG(g, x, y, r) {
      g.lineCap = 'round';
      for (var pass = 0; pass < 2; pass++) {
        g.strokeStyle = pass ? '#5bd0ff' : DARK; g.lineWidth = pass ? Math.max(2, r * 0.3) : Math.max(3.5, r * 0.62);
        g.beginPath();
        for (var i = 0; i < 3; i++) { var a = i * Math.PI / 3; g.moveTo(x - Math.cos(a) * r, y - Math.sin(a) * r); g.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r); }
        g.stroke();
      }
    }
    function iconG(g, type, x, y, r) {
      if (type === 'heart') { heartG(g, x, y, r * 0.8, '#ff4d7d'); return; }
      if (type === 'triple') { starG(g, x, y, r, '#ffe36a'); return; }
      if (type === 'freeze') { flakeG(g, x, y, r); return; }
      if (type === 'shield') {
        g.beginPath(); g.moveTo(x - r * 0.8, y - r * 0.8); g.lineTo(x + r * 0.8, y - r * 0.8); g.lineTo(x + r * 0.8, y + r * 0.1);
        g.quadraticCurveTo(x + r * 0.7, y + r * 0.8, x, y + r); g.quadraticCurveTo(x - r * 0.7, y + r * 0.8, x - r * 0.8, y + r * 0.1); g.closePath();
        g.fillStyle = '#5bd0ff'; g.fill(); g.lineWidth = Math.max(2, r * 0.15); g.strokeStyle = DARK; g.stroke(); return;
      }
      g.beginPath(); g.arc(x, y, r * 0.85, 0, TWO_PI); g.fillStyle = '#fff'; g.fill(); g.lineWidth = Math.max(2, r * 0.15); g.strokeStyle = DARK; g.stroke();
      g.beginPath(); g.moveTo(x, y - r * 0.55); g.lineTo(x, y); g.lineTo(x + r * 0.4, y + r * 0.25); g.lineWidth = Math.max(2.5, r * 0.18); g.stroke();
    }
    var ICONS = {}, HEARTS = [null, null], heartSz = -1;
    function iconSpr(type, size) {   /* HUD icons at a given css size, cached */
      var e = ICONS[type];
      if (!e || e.R !== size) { e = ICONS[type] = mkSpr(size, 0.1); iconG(e.g, type, e.hs, e.hs, size); }
      return e;
    }
    function heartSpr(full, size) {
      if (heartSz !== size) { heartSz = size; HEARTS[0] = HEARTS[1] = null; }
      var i = full ? 1 : 0, e = HEARTS[i];
      if (!e) { e = HEARTS[i] = mkSpr(size * 1.1, 0.1); heartG(e.g, e.hs, e.hs, size, full ? '#ff4d7d' : 'rgba(255,255,255,.55)'); }
      return e;
    }
    function iceOver(cx, cy, r) {
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, TWO_PI); ctx.fillStyle = 'rgba(170,230,255,.55)'; ctx.fill();
      ctx.lineWidth = Math.max(2, r * 0.08); ctx.strokeStyle = 'rgba(255,255,255,.9)'; ctx.stroke();
      ctx.beginPath(); ctx.moveTo(cx - r * 0.5, cy - r * 0.6); ctx.lineTo(cx - r * 0.1, cy - r * 0.2); ctx.moveTo(cx + r * 0.4, cy + r * 0.2); ctx.lineTo(cx + r * 0.7, cy + r * 0.6); ctx.stroke();
    }

    function resetCaches() {   /* after a devicePixelRatio change: every raster cache is stale */
      LBL = {}; lblN = 0; BODY.length = 0; SOFT = {}; ICONS = {}; HEARTS[0] = HEARTS[1] = null; heartSz = -1; GENQ.length = 0; SPR_BUG.length = 0; SPR_SPIT.length = 0; SPR_BOSS.length = 0; SPR_ORB.length = 0; SPR_PICK.length = 0;
      for (var i = 0; i < words.length; i++) words[i]._l.length = 0;
      for (var k in LW) if (LW.hasOwnProperty(k)) LW[k]._l.length = 0;
      promptSig = -1; skyKey = ''; gunSpr.length = 0; vigSpr = null;
    }
    var promptSig = -1, skyKey = '', gunSpr = [], vigSpr = null;

    /* ---------- audio: one AudioContext, master compressor, synth SFX + a light per-arena music loop ---------- */
    var gestured = false, A = null, busS = null, busM = null, comp = null, master = null, nbuf = null, voices = 0, VMAX = 12;
    var MUS_VOL = 0.17, speakUntil = 0, ducked = false, musNext = 0, musStep = 0, musTimer = 0, musLead = null, musArena = -1, stepDist = 0;
    var PENTA = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.7, 1318.5];
    var MUSIC = [
      { bpm: 92, root: 55.0, sc: [0, 3, 5, 7, 10], bass: [0, 0, 3, 2], wave: 'triangle' },
      { bpm: 112, root: 65.4, sc: [0, 2, 4, 7, 9], bass: [0, 3, 4, 3], wave: 'triangle' },
      { bpm: 84, root: 73.4, sc: [0, 2, 4, 6, 9], bass: [0, 4, 2, 3], wave: 'sine' }
    ];
    function ensureAudio() {
      if (A || !soundOn || dead) return A;
      try {
        var AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
        A = new AC(); ctxCount++;
        comp = A.createDynamicsCompressor(); comp.threshold.value = -20; comp.knee.value = 24; comp.ratio.value = 6; comp.attack.value = 0.004; comp.release.value = 0.2;
        master = A.createGain(); master.gain.value = muted ? 0 : 0.9;
        busS = A.createGain(); busM = A.createGain(); busM.gain.value = MUS_VOL;
        busS.connect(comp); busM.connect(comp); comp.connect(master); master.connect(A.destination);
        /* gentle echo on the music bus only */
        var dl = A.createDelay(0.6), fb = A.createGain(), wet = A.createGain();
        dl.delayTime.value = 0.27; fb.gain.value = 0.28; wet.gain.value = 0.35; busM.connect(dl); dl.connect(fb); fb.connect(dl); dl.connect(wet); wet.connect(comp);
        nbuf = A.createBuffer(1, A.sampleRate, A.sampleRate); var d = nbuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      } catch (e) { A = null; }
      return A;
    }
    function gesture() {
      gestured = true;
      if (!soundOn || dead) return;
      var a = ensureAudio();
      if (a && a.state === 'suspended') { try { var pr = a.resume(); if (pr && pr.catch) pr.catch(function () {}); } catch (e) { /* */ } }
    }
    function live() { return A && !muted && A.state === 'running' && !dead; }
    function mkPan(p, dest) {
      if (p && A.createStereoPanner) { var n = A.createStereoPanner(); n.pan.value = clamp(p, -1, 1); n.connect(dest); return n; }
      return dest;
    }
    /* one oscillator voice: type, start freq, end freq, start time, duration, volume, pan, destination, lowpass cutoff */
    function vOsc(type, f0, f1, t0, dur, vol, pan, dest, lp) {
      if (voices >= VMAX) return;
      var o = A.createOscillator(), g = A.createGain(), pn = mkPan(pan, dest || busS), f = null;
      o.type = type; o.frequency.setValueAtTime(f0, t0);
      if (f1 && f1 !== f0) o.frequency.exponentialRampToValueAtTime(Math.max(20, f1), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + Math.min(0.012, dur * 0.3)); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      if (lp) { f = A.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; o.connect(f); f.connect(g); } else o.connect(g);
      g.connect(pn);
      voices++;
      o.onended = function () { voices--; try { o.disconnect(); g.disconnect(); if (f) f.disconnect(); if (pn !== (dest || busS)) pn.disconnect(); } catch (e) { /* */ } };
      o.start(t0); o.stop(t0 + dur + 0.03);
    }
    /* filtered noise burst: filter type, start/end cutoff */
    function vNoise(t0, dur, vol, ftype, f0, f1, q, pan) {
      if (voices >= VMAX) return;
      var s = A.createBufferSource(), g = A.createGain(), f = A.createBiquadFilter(), pn = mkPan(pan, busS);
      s.buffer = nbuf; f.type = ftype; f.Q.value = q || 0.8; f.frequency.setValueAtTime(f0, t0);
      if (f1 && f1 !== f0) f.frequency.exponentialRampToValueAtTime(Math.max(40, f1), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(0.0002, vol), t0 + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      s.connect(f); f.connect(g); g.connect(pn);
      voices++;
      s.onended = function () { voices--; try { s.disconnect(); f.disconnect(); g.disconnect(); if (pn !== busS) pn.disconnect(); } catch (e) { /* */ } };
      s.start(t0, Math.random() * 0.5, dur + 0.03);
    }
    function panOf(wx, wy) { var rel = normAng(Math.atan2(wy - P.y, wx - P.x) - P.a); return clamp(Math.sin(rel) * 1.2, -1, 1); }
    var SFX = {
      shoot: function (fr) {
        if (!live()) return; var t = A.currentTime;
        vNoise(t, 0.09, 0.2, 'highpass', 3200, 700, 0.7, 0);
        vOsc('sine', 560, 110, t, 0.17, 0.3, 0, busS);
        vOsc('square', 1900, 380, t, 0.04, 0.07, 0, busS);
        if (fr) vOsc('sine', 2200, 1500, t, 0.2, 0.05, 0, busS);
      },
      good: function (combo, pan) {
        if (!live()) return; var t = A.currentTime, i = clamp((combo | 0) - 1, 0, 6);
        vNoise(t, 0.2, 0.15, 'highpass', 4200, 2600, 1.2, pan);
        for (var k = 0; k < 4; k++) vOsc('sine', 2400 + Math.random() * 2600, 0, t + k * 0.035, 0.1 + Math.random() * 0.06, 0.05, pan, busS);
        vOsc('triangle', PENTA[i], 0, t + 0.04, 0.16, 0.2, pan, busS);
        vOsc('triangle', PENTA[Math.min(7, i + 2)], 0, t + 0.13, 0.22, 0.18, pan, busS);
      },
      combo: function (n) {
        if (!live()) return; var t = A.currentTime, i = clamp(n - 2, 0, 7);
        vOsc('triangle', PENTA[i], 0, t + 0.28, 0.18, 0.16, 0, busS); vOsc('sine', PENTA[i] * 2, 0, t + 0.28, 0.14, 0.07, 0, busS);
      },
      bad: function (pan) {   /* gentle: low soft 'bonk', never harsh */
        if (!live()) return; var t = A.currentTime;
        vOsc('sine', 262, 175, t, 0.26, 0.2, pan, busS, 900); vOsc('triangle', 196, 131, t + 0.04, 0.24, 0.1, pan, busS, 700);
      },
      pick: function () {
        if (!live()) return; var t = A.currentTime;
        for (var k = 0; k < 5; k++) vOsc('sine', PENTA[2 + k] * (k > 3 ? 1 : 1), 0, t + k * 0.055, 0.14, 0.1, 0, busS);
      },
      zap: function () {
        if (!live()) return; var t = A.currentTime;
        vOsc('sawtooth', 210, 70, t, 0.26, 0.13, 0, busS, 900); vNoise(t, 0.18, 0.12, 'lowpass', 1400, 300, 0.7, 0);
      },
      bug: function (pan) {
        if (!live()) return; var t = A.currentTime;
        vOsc('sine', 380, 880, t, 0.1, 0.16, pan, busS); vNoise(t, 0.08, 0.1, 'bandpass', 1800, 900, 1.5, pan);
      },
      spit: function (pan) { if (!live()) return; vOsc('triangle', 300, 620, A.currentTime, 0.2, 0.08, pan, busS); },
      freeze: function () {
        if (!live()) return; var t = A.currentTime;
        vOsc('sine', 1600, 500, t, 0.25, 0.08, 0, busS); vOsc('sine', 2400, 1800, t + 0.04, 0.2, 0.05, 0, busS);
      },
      boom: function () {
        if (!live()) return; var t = A.currentTime;
        vOsc('sine', 100, 38, t, 0.34, 0.32, 0, busS); vNoise(t, 0.25, 0.18, 'lowpass', 900, 150, 0.7, 0);
      },
      roar: function () {
        if (!live()) return; var t = A.currentTime;
        vOsc('sawtooth', 150, 52, t, 0.65, 0.15, 0, busS, 700); vOsc('sawtooth', 158, 56, t, 0.65, 0.1, 0, busS, 600); vNoise(t, 0.5, 0.12, 'lowpass', 1200, 200, 0.8, 0);
      },
      charge: function () {
        if (!live()) return; var t = A.currentTime;
        vOsc('sawtooth', 70, 420, t, 0.55, 0.1, 0, busS, 1200); vOsc('square', 140, 840, t, 0.55, 0.04, 0, busS, 1500);
      },
      wave: function () {
        if (!live()) return; var t = A.currentTime;
        vOsc('triangle', PENTA[0], 0, t, 0.14, 0.15, 0, busS); vOsc('triangle', PENTA[2], 0, t + 0.1, 0.14, 0.15, 0, busS); vOsc('triangle', PENTA[4], 0, t + 0.2, 0.28, 0.16, 0, busS);
      },
      end: function (win) {
        if (!live()) return; var t = A.currentTime;
        if (win) { for (var k = 0; k < 5; k++) vOsc('triangle', PENTA[[0, 2, 3, 5, 7][k]], 0, t + k * 0.13, 0.3, 0.17, 0, busS); }
        else { vOsc('triangle', 392, 0, t, 0.2, 0.15, 0, busS); vOsc('triangle', 330, 0, t + 0.18, 0.2, 0.15, 0, busS); vOsc('sine', 262, 196, t + 0.36, 0.4, 0.16, 0, busS); }
      },
      step: function () {
        if (!live()) return; var t = A.currentTime;
        vNoise(t, 0.04, 0.045, 'lowpass', 520 + Math.random() * 160, 260, 0.7, 0);
      },
      start: function () { if (!live()) return; var t = A.currentTime; vOsc('triangle', 660, 990, t, 0.1, 0.12, 0, busS); },
      click: function () { if (!live()) return; vOsc('sine', 880, 0, A.currentTime, 0.05, 0.1, 0, busS); }
    };
    function shatterSfx(pan) { SFX.good(G.combo, pan); }
    /* music: look-ahead step sequencer, started/stopped from update() */
    function musGen(ai) {
      var m = MUSIC[ai], seed = ai * 977 + 13, arr = [], i;
      function r() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
      for (i = 0; i < 32; i++) arr.push(i % 2 === 0 && r() < 0.7 || r() < 0.18 ? ((r() * m.sc.length) | 0) + (r() < 0.35 ? m.sc.length : 0) : -1);
      return arr;
    }
    function musTick() {
      if (dead || !A) return;
      if (!live() || state !== 'play') { musNext = 0; return; }
      var ai = G.boss ? 0 : arenaIdx, m = MUSIC[ai % MUSIC.length], sd = 60 / (m.bpm * (G.boss ? 1.3 : 1)) / 2, now = A.currentTime;
      if (musArena !== ai) { musArena = ai; musLead = musGen(ai); musStep = 0; }
      if (!musNext || musNext < now - 0.5) musNext = now + 0.06;
      while (musNext < now + 0.35) {
        if (voices < 8) {
          var st = musStep & 31, t = musNext;
          if (st % 4 === 0) { var bd = m.bass[(st >> 3) & 3]; vOsc(G.boss ? 'sawtooth' : m.wave, m.root * 2 * Math.pow(2, m.sc[bd % m.sc.length] / 12), 0, t, sd * 3.2, 0.22, 0, busM, 420); }
          if (G.boss && st % 4 === 0) vOsc('sine', 120, 42, t, 0.14, 0.3, 0, busM);
          var ln = musLead[st];
          if (ln >= 0) { var oct = ln >= m.sc.length ? 8 : 4; vOsc('sine', m.root * oct * Math.pow(2, m.sc[ln % m.sc.length] / 12), 0, t, sd * 1.8, 0.13, 0, busM); }
        }
        musNext += sd; musStep++;
      }
    }
    function duck(on) {
      if (!A || on === ducked) return; ducked = on;
      var t = A.currentTime;
      try { busM.gain.setTargetAtTime(MUS_VOL * (on ? 0.3 : 1), t, 0.08); busS.gain.setTargetAtTime(on ? 0.5 : 1, t, 0.05); } catch (e) { /* */ }
    }
    function setMuted(m) {
      muted = !!m; saveMute(muted);
      if (A) { try { master.gain.setTargetAtTime(muted ? 0 : 0.9, A.currentTime, 0.03); } catch (e) { /* */ } }
      if (muted) { try { if (canHear()) window.speechSynthesis.cancel(); } catch (e) { /* */ } }
      syncMuteUi();
    }
    function syncMuteUi() {
      if (muteBtn) { muteBtn.textContent = muted ? '🔇' : '🔊'; muteBtn.classList.toggle('off', muted); muteBtn.setAttribute('aria-pressed', muted ? 'true' : 'false'); }
      if (ovEl) { var mb = ovEl.querySelector('[data-act="mute"]'); if (mb) mb.textContent = muted ? '🔇' : '🔊'; }
    }
    function canHear() { return soundOn && typeof window.speechSynthesis !== 'undefined' && typeof window.SpeechSynthesisUtterance !== 'undefined'; }
    /* force = explicit replay tap: it speaks even when the game sounds are muted */
    function speak(text, force) {
      if (!canHear() || !gestured || (muted && !force)) return;
      try {
        var sy = window.speechSynthesis; sy.cancel(); var u = new window.SpeechSynthesisUtterance(text); u.lang = 'en-US'; u.rate = 0.85;
        u.onend = u.onerror = function () { speakUntil = 0; };
        speakUntil = performance.now() + 900 + 130 * text.length; duck(true);
        sy.speak(u);
      } catch (e) { /* */ }
    }

    /* ---------- particles (fixed pool) ---------- */
    var PP = [], pHead = 0, pi0;
    for (pi0 = 0; pi0 < PCAP; pi0++) PP.push({ life: 0, max: 1, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, r: 3, col: '#fff', kind: 0, spr: null, rot: 0, vr: 0, g: 3, gl: 0 });
    function pAlloc() {
      for (var i = 0; i < PCAP; i++) { var p = PP[(pHead + i) % PCAP]; if (p.life <= 0) { pHead = (pHead + i + 1) % PCAP; return p; } }
      return null;
    }
    function pBudget(n) { return reduceMotion ? Math.max(1, Math.ceil(n * 0.35)) : n; }
    function burst(x, y, z, n, cols, sp) {
      n = pBudget(n);
      for (var i = 0; i < n; i++) {
        var p = pAlloc(); if (!p) break;
        var a = rand(0, TWO_PI), v = rand(0.5, 1.8) * (sp || 1);
        p.x = x; p.y = y; p.z = z; p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v; p.vz = rand(0.2, 1.8); p.life = rand(0.5, 1.0); p.max = 1;
        p.col = cols[(Math.random() * cols.length) | 0]; p.r = rand(3, 7); p.kind = 0; p.spr = null; p.g = 3; p.rot = 0; p.vr = 0;
      }
    }
    function sparks(x, y, z, n, sp) {   /* short-lived impact sparks (no persistent decals) */
      n = pBudget(n);
      for (var i = 0; i < n; i++) {
        var p = pAlloc(); if (!p) break;
        var a = rand(0, TWO_PI), v = rand(0.4, 1.4) * (sp || 1);
        p.x = x; p.y = y; p.z = z; p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v; p.vz = rand(0.3, 1.4); p.life = rand(0.18, 0.34); p.max = 0.34;
        p.col = '#fff'; p.r = rand(2, 4); p.kind = 3; p.spr = null; p.g = 4; p.rot = 0; p.vr = 0;
      }
    }
    function fxSprite(kind, x, y, z, life, r, vz, n) {   /* kind 2 = soft puff / ring sprite, n = which */
      var p = pAlloc(); if (!p) return;
      p.x = x; p.y = y; p.z = z; p.vx = 0; p.vy = 0; p.vz = vz || 0; p.life = life; p.max = life; p.r = r; p.kind = kind; p.gl = n || 0; p.g = 0; p.spr = null; p.rot = 0; p.vr = 0;
    }
    function shatterLetters(t) {
      var en = t.w.en, n = Math.min(en.length, 9), cols = ['#ffe36a', '#ff9ad0', '#7fe3ff', '#ffffff'], i;
      for (i = 0; i < n; i++) {
        var p = pAlloc(); if (!p) break;
        var a = TWO_PI * i / n + rand(-0.3, 0.3), v = rand(0.9, 1.6);
        p.x = t.x; p.y = t.y; p.z = 0.55; p.vx = Math.cos(a) * v; p.vy = Math.sin(a) * v; p.vz = rand(1.2, 2.4); p.life = rand(0.8, 1.1); p.max = 1.1;
        p.kind = 1; p.spr = label(en.charAt(i).toUpperCase(), 1, 34, cols[i % 4]); p.r = 1; p.g = 3.2; p.rot = rand(-0.6, 0.6); p.vr = rand(-5, 5);
      }
    }
    function floater(text, x, y, col, size, coin) {
      var f = null, i;
      for (i = 0; i < floaters.length; i++) if (floaters[i].t >= 1.2) { f = floaters[i]; break; }
      if (!f) { if (floaters.length >= 14) return; f = { e: null, x: 0, y: 0, t: 0, size: 0, coin: false }; floaters.push(f); }
      f.e = label(text, 0, size || 26, col || '#fff'); f.x = x; f.y = y; f.t = 0; f.size = size || 26; f.coin = !!coin;
    }

    /* ---------- round / question flow ---------- */
    function waveOf(r) { return Math.min(2, Math.floor((r - 1) * 3 / baseRounds)); }
    function resetGame() {
      di = tier - 1;
      G = { score: 0, correct: 0, wrong: 0, hearts: 3, hpLost: 0, combo: 0, maxCombo: 0, round: 1, playTime: 0, shield: false, triple: 0, freezeW: 0, freezeT: 0, slow: 0, invul: 0,
        bugTimer: DIFF.bugFirst[di], spitTimer: DIFF.spitFirst[di], pickTimer: rand(10, 15), roundT: 0, roundMax: 0, won: false, wave: -1, qtype: 'zh', qT: 0, sayT: 0, sayRep: 0,
        boss: null, bossBeaten: false, banner: null, calm: false, confT: 0, respawn: [], best: loadBest(), coins: 0, requeued: 0, missInRound: 0 };
      totalRounds = baseRounds;
      P.x = 7.5; P.y = 12.5; P.a = -Math.PI / 2; turnV = 0; lookPend = 0; comboM = 1; hudK = {};
      bugs.length = 0; spits.length = 0; projs.length = 0; pickups.length = 0; floaters.length = 0; trails.length = 0; targets.length = 0; smokes.length = 0;
      for (var i = 0; i < PCAP; i++) PP[i].life = 0;
      order = []; PW = [];
      for (i = 0; i < words.length; i++) PW.push({ en: words[i].en, asked: false, done: false, ok: false, tries: 0, miss: 0, requeued: false });
      var pool = [], last = -1;
      while (order.length < baseRounds) {
        if (!pool.length) { pool = shuffle(words.map(function (_, i) { return i; })); if (pool[pool.length - 1] === last) pool.reverse(); }
        last = pool.pop(); order.push(last);
      }
      resultShown = false; finishedCalled = false; lastResult = null; overT = 0; hint = null; shake = 0; flash = 0; dmgV = 0; comboT = 0; hinting = false; promptSig = -1;
      startRound(true);
    }
    function enterArena(w, first) {
      G.wave = w; arenaIdx = w; setArena(w); texOf(w); skyKey = '';
      P.x = 7.5; P.y = 12.5; P.a = -Math.PI / 2;
      bugs.length = 0; spits.length = 0; projs.length = 0; pickups.length = 0; G.respawn.length = 0;
      G.bugTimer = Math.max(6, DIFF.bugFirst[di] * (first ? 1 : 0.6)); G.spitTimer = Math.max(8, DIFF.spitFirst[di] * (first ? 1 : 0.7));
      G.banner = { t: 2.6, max: 2.6, text: '第 ' + (w + 1) + ' 波', sub: ARENAS[w].name + ' · ' + ARENAS[w].en, boss: false, e1: null, e2: null };
      if (!first) { setFlash(2, 0.7); SFX.wave(); }
    }
    function setFlash(ci, v) { if (reduceMotion) return; flashCi = ci; flash = Math.max(flash, v); }

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
      return { w: w, x: p.x, y: p.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, ph: rand(0, 6.28), col: idx % COLORS.length, age: 0, correct: isCorrect, hidT: 0, hidN: 0 };
    }
    function pickDistractors(c, n) {
      var cand = words.filter(function (w) { return w.en.toLowerCase() !== c.en.toLowerCase(); });
      if (DIFF.simNoise[di] > 0) {
        var nz = DIFF.simNoise[di], sc = {};
        cand.forEach(function (w) { sc[w.i] = lev(w.en, c.en) + Math.random() * nz; });
        cand.sort(function (a, b) { return sc[a.i] - sc[b.i]; });
      } else shuffle(cand);
      return cand.slice(0, Math.min(n, cand.length));
    }
    function pickQType(c, round) {
      var t = QT[(round - 1) % 3];
      if (t === 'pic' && !(c.emoji || c.zh)) t = 'zh';
      return t;
    }
    function startRound(first) {
      var w = waveOf(G.round);
      if (w !== G.wave) enterArena(w, first);
      var c = words[order[G.round - 1]];
      cur = c; G.qtype = pickQType(c, G.round); G.qT = 0; G.sayRep = 0; G.missInRound = 0; hinting = false; promptSig = -1;
      PW[c.i].asked = true;
      G.sayT = G.qtype === 'listen' ? (G.banner && G.banner.t > 0.5 ? 1.5 : 0.9) : 0;
      var ds = pickDistractors(c, DIFF.nDist[di]), list = shuffle([c].concat(ds));
      targets.length = 0;
      for (var i = 0; i < list.length; i++) {
        var a = P.a + (-0.95 + 1.9 * (i + 0.5) / list.length) * Math.atan(PL) + rand(-0.04, 0.04);
        var t = makeTarget(list[i], a, 0.0001, i, list[i] === c);
        t.age = first ? 1 : 0;
        targets.push(t);
      }
      G.roundT = DIFF.timer[di];
      G.roundMax = DIFF.timer[di];
      warmRound();
    }
    function respawnDistractor() {
      if (G.boss) { addLetter(false); return; }
      var alive = targets.map(function (t) { return t.w; });
      var c = words.filter(function (w) { return w !== cur && alive.indexOf(w) < 0 && w.en.toLowerCase() !== cur.en.toLowerCase(); });
      if (!c.length) return;
      var w = c[(Math.random() * c.length) | 0];
      var used = {}; targets.forEach(function (t) { used[t.col] = 1; });
      var col = 0; while (used[col] && col < 4) col++;
      var t = makeTarget(w, P.a, 1.0, col, false); t.age = 0; targets.push(t);
    }

    /* ----- boss: spell the word letter by letter ----- */
    function letterW(L) { return LW[L] || (LW[L] = { en: L, zh: '', emoji: '', i: -1, _l: [] }); }
    function startBoss() {
      var c = words.filter(function (w) { return /^[A-Za-z]{3,7}$/.test(w.en); });
      if (!c.length) c = words.filter(function (w) { return /[A-Za-z]/.test(w.en); });
      if (!c.length) c = words;
      var w = c[(Math.random() * c.length) | 0];
      var L = w.en.replace(/[^A-Za-z]/g, '').toUpperCase().slice(0, 8).split('');
      cur = w; G.qtype = 'zh'; G.roundT = G.roundMax = 0; G.sayT = 0; hinting = false; promptSig = -1;
      G.boss = { w: w, letters: L, idx: 0, hp: L.length, max: L.length, x: 7.5, y: 5.6, t: 0, hit: 0, atk: 0, appear: 0, dead: false, reveal: false, blink: 0 };
      P.x = 7.5; P.y = 12.5; P.a = -Math.PI / 2;
      bugs.length = 0; spits.length = 0; projs.length = 0; pickups.length = 0; G.respawn.length = 0;
      G.bugTimer = Math.max(8, DIFF.bugFirst[di]); G.spitTimer = Math.max(10, DIFF.spitFirst[di] * 0.8);
      G.banner = { t: 3, max: 3, text: 'BOSS 字母怪獸', sub: '依次射出字母,拼出「' + (w.zh || w.en) + '」', boss: true, e1: null, e2: null };
      setFlash(3, 0.7); SFX.roar(); SFX.charge();
      targets.length = 0; spawnLetters(true); warmRound();
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
      var B = G.boss, need = B.letters[B.idx], list = [need], have = {}, n = tier >= 4 ? 5 : 4, i;
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
      floater('+' + pts, cw / 2, ch * 0.62, '#ffe36a', 34, true);
      var pr = project(B.x, B.y, 0.95, PJ); if (pr) floater('-1 HP', pr.x, pr.y, '#ff8aa8', 36);
      burst(t.x, t.y, 0.55, 26, ['#ffe36a', '#ff5fa2', '#7fe3ff', '#ffffff'], 1.3);
      burst(B.x, B.y, 1.0, 26, ['#ff8aa8', '#ffe36a', '#fff'], 1.6);
      shatterLetters(t); fxSprite(2, t.x, t.y, 0.55, 0.35, 1.4, 0, 3);
      SFX.good(G.combo, panOf(t.x, t.y)); SFX.boom(); hitM = 0.2; setFlash(1, 0.2); comboFx(m);
      if (!reduceMotion) shake = Math.max(shake, 0.2);
      if (B.hp <= 0) { bossDefeated(); return; }
      spawnLetters(false);
    }
    function bossCounter() {
      var B = G.boss;
      B.atk = 0.9; B.reveal = true; G.combo = 0;
      hint = { text: '怪獸反擊!要射字母「' + B.letters[B.idx] + '」', t: 2.4, e: null };
      setFlash(0, 0.5); SFX.roar();
      loseHeart('boss');
    }
    function bossDefeated() {
      var B = G.boss; B.dead = true; B.hp = 0; G.bossBeaten = true; G.score += 500 * multOf(Math.max(1, G.combo)); targets.length = 0;
      floater('打敗怪獸!', cw / 2, ch * 0.62, '#ffe36a', 44);
      burst(B.x, B.y, 1.0, 120, ['#ffe36a', '#ff5fa2', '#7fe3ff', '#fff', '#8e6bff'], 2.4);
      fxSprite(2, B.x, B.y, 0.9, 0.7, 5.5, 0, 3); fxSprite(2, B.x, B.y, 0.9, 0.5, 3.2, 0, 2); sparks(B.x, B.y, 0.9, 30, 2);
      setFlash(2, 0.45); SFX.boom();
      G.confT = 2.4; G.banner = { t: 2.6, max: 2.6, text: '勝利!', sub: '字母怪獸被打敗了', boss: false, e1: null, e2: null };
      finish(true);
    }
    function comboFx(m) {
      if (m > comboM) { comboT = 1.1; SFX.combo(G.combo); }
      comboM = m;
    }
    function loseHeart(reason) {
      if (G.shield) { G.shield = false; floater('護盾!', cw / 2, ch * 0.45, '#7fe3ff', 34); SFX.freeze(); return false; }
      G.hearts--; G.hpLost++; G.combo = 0; comboM = 1; if (!reduceMotion) shake = 0.45; setFlash(0, 0.4); dmgV = 0.7;
      if (G.hearts <= 0) finish(false);
      return true;
    }

    /* ----- firing ----- */
    function targetAngle(o) { return Math.atan2(o.y - P.y, o.x - P.x); }
    var HIT = { o: null, kind: '', d: 0 }, hitBest = 0;
    function consider(o, kind, rad, ang) {
      if (o.age !== undefined && o.age < 0) return;
      var dx = o.x - P.x, dy = o.y - P.y, d = Math.sqrt(dx * dx + dy * dy);
      if (d < 0.1) return;
      var a2 = Math.atan2(dy, dx), diffA = Math.abs(normAng(a2 - ang)), tol = Math.max(0.105, Math.atan(rad / d));
      if (diffA > tol) return;
      if (rayDist(P.x, P.y, a2, d + 1) < d - 0.4) return;
      var sc = diffA / tol + d * 0.001;
      if (sc < hitBest) { hitBest = sc; HIT.o = o; HIT.kind = kind; HIT.d = d; }
    }
    function rayHit(ang) {
      var i; hitBest = 1e9; HIT.o = null;
      for (i = 0; i < targets.length; i++) consider(targets[i], 'target', 0.55, ang);
      for (i = 0; i < bugs.length; i++) consider(bugs[i], 'bug', 0.4, ang);
      for (i = 0; i < spits.length; i++) consider(spits[i], 'spit', 0.45, ang);
      for (i = 0; i < projs.length; i++) consider(projs[i], 'proj', 0.3, ang);
      for (i = 0; i < pickups.length; i++) consider(pickups[i], 'pick', 0.4, ang);
      return HIT.o ? HIT : null;
    }
    var HITS = [{ o: null, kind: '', d: 0 }, { o: null, kind: '', d: 0 }, { o: null, kind: '', d: 0 }], nHits = 0;
    function fire(offset) {
      if (state !== 'play') return;
      recoil = 1; muzzle = 0.14; SFX.shoot(G.freezeW > 0);
      addSmoke();
      var offs = G.triple > 0 ? OFF3 : OFF1, i, j, tc = G.freezeW > 0 ? '#c9f3ff' : G.triple > 0 ? '#ffd23f' : '#7fe3ff';
      nHits = 0;
      for (i = 0; i < offs.length; i++) {
        var ang = P.a + (offset || 0) + offs[i], h = rayHit(ang);
        var endD = h ? h.d : Math.min(rayDist(P.x, P.y, ang, 12), 12);
        var ex = P.x + Math.cos(ang) * endD, ey = P.y + Math.sin(ang) * endD;
        if (trails.length < 8) trails.push({ x: ex, y: ey, t: 0, c: tc });
        if (!h) { if (endD < 11.5) sparks(P.x + Math.cos(ang) * (endD - 0.08), P.y + Math.sin(ang) * (endD - 0.08), 0.5, 6, 1); }
        else {
          var dup = false;
          for (j = 0; j < nHits; j++) if (HITS[j].o === h.o) dup = true;
          if (!dup && nHits < 3) { HITS[nHits].o = h.o; HITS[nHits].kind = h.kind; HITS[nHits].d = h.d; nHits++; }
        }
      }
      if (G.freezeW > 0) {
        if (G.freezeT <= 0 && (bugs.length || spits.length || projs.length)) floater('冰凍!', cw / 2, ch * 0.4, '#bfefff', 36);
        G.freezeT = 3; SFX.freeze();
      }
      var corr = null, nWrong = 0, wrong0 = null;
      if (nHits) hitM = 0.18;
      /* snapshot, because the handlers below may re-enter rayHit */
      var hs = [], hk = [];
      for (i = 0; i < nHits; i++) { hs.push(HITS[i].o); hk.push(HITS[i].kind); }
      for (i = 0; i < hs.length; i++) {
        var o = hs[i], kd = hk[i];
        if (kd === 'target') { if (o.correct) corr = o; else { nWrong++; if (!wrong0) wrong0 = []; wrong0.push(o); } }
        else if (kd === 'bug') hitBug(o);
        else if (kd === 'spit') hitSpit(o);
        else if (kd === 'proj') hitProj(o);
        else collect(o);
      }
      if (state !== 'play') return;
      if (corr) { if (G.boss) hitLetter(corr); else hitCorrect(corr); }
      else if (nWrong) {
        for (i = 0; i < wrong0.length; i++) popWrong(wrong0[i]);
        G.wrong++; G.combo = 0; comboM = 1;
        if (!G.boss) wrongPick();
        if (G.boss) bossCounter(); else { loseHeart('wrong'); SFX.bad(panOf(wrong0[0].x, wrong0[0].y)); lcShow(false, cur, wrong0[0].w); }
      }
    }
    function wrongPick() {   /* bookkeeping for the word that was asked */
      var rec = PW[cur.i]; rec.tries++; rec.miss++; G.missInRound++;
      if (mode === 'level' && !rec.requeued) { rec.requeued = true; order.push(cur.i); totalRounds++; G.requeued++; }
    }
    function hitCorrect(t) {
      var bonus = G.roundMax ? Math.round(40 * clamp(G.roundT / G.roundMax, 0, 1)) : 0, lw = cur;
      G.combo++; G.maxCombo = Math.max(G.maxCombo, G.combo);
      var m = multOf(G.combo), pts = (100 + 10 * Math.min(G.combo - 1, 5) + bonus) * m;
      G.score += pts; G.correct++;
      var rec = PW[cur.i]; rec.tries++; if (!rec.done) { rec.done = true; rec.ok = rec.miss === 0; }
      var pr = project(t.x, t.y, 0.55, PJ);
      floater('+' + pts, pr ? pr.x : cw / 2, pr ? pr.y : ch / 2, '#ffe36a', 34, true);
      burst(t.x, t.y, 0.55, 30, ['#ffe36a', '#ff5fa2', '#7fe3ff', '#ffffff', '#8e6bff'], 1.3);
      shatterLetters(t); sparks(t.x, t.y, 0.55, 14, 1.6); fxSprite(2, t.x, t.y, 0.55, 0.4, 1.3, 0, 3);
      var i, o; for (i = 0; i < targets.length; i++) { o = targets[i]; if (o !== t) burst(o.x, o.y, 0.55, 6, [COLORS[o.col], '#fff'], 0.8); }
      shatterSfx(panOf(t.x, t.y)); setFlash(1, 0.22); speak(cur.en);
      if (m > 1) floater('分數 x' + m + '!', cw / 2, ch * 0.4, m > 2 ? '#ff5fa2' : '#ffb347', 34);
      if (G.combo >= 3) floater('連擊 x' + G.combo + '!', cw / 2, ch * 0.34, '#ff9ad0', 34);
      comboFx(m);
      if (G.round >= totalRounds) { targets.length = 0; if (bossOn) startBoss(); else finish(true); return; }
      G.round++; startRound(false);
      lcShow(true, lw, null);
    }
    function popWrong(t) {
      var i = targets.indexOf(t);
      if (i >= 0) targets.splice(i, 1);
      burst(t.x, t.y, 0.55, 12, ['#ff5a6e', '#ff9aa8', '#fff'], 0.9);
      fxSprite(2, t.x, t.y, 0.55, 0.45, 1.2, 0.2, 0);
      if (!G.boss) hint = { text: '「' + t.w.en + '」＝ ' + (t.w.zh || ''), t: 2.2, e: null };
      G.respawn.push(2.2);
    }
    function hitBug(b) {
      var i = bugs.indexOf(b); if (i >= 0) bugs.splice(i, 1);
      G.score += 50; burst(b.x, b.y, 0.3, 20, ['#9be564', '#ffe36a', '#fff'], 1.1); SFX.bug(panOf(b.x, b.y)); sparks(b.x, b.y, 0.3, 8, 1);
      var pr = project(b.x, b.y, 0.3, PJ); floater('+50', pr ? pr.x : cw / 2, pr ? pr.y : ch / 2, '#b6f26b', 28);
    }
    function hitSpit(s) {
      var i = spits.indexOf(s); if (i >= 0) spits.splice(i, 1);
      G.score += 80; burst(s.x, s.y, 0.4, 26, ['#c9a0ff', '#ff9a3c', '#fff'], 1.2); SFX.bug(panOf(s.x, s.y)); sparks(s.x, s.y, 0.4, 8, 1);
      var pr = project(s.x, s.y, 0.4, PJ); floater('+80', pr ? pr.x : cw / 2, pr ? pr.y : ch / 2, '#d9b8ff', 30);
    }
    function hitProj(p) {
      var i = projs.indexOf(p); if (i >= 0) projs.splice(i, 1);
      G.score += 10; burst(p.x, p.y, 0.45, 12, ['#ffb347', '#fff'], 0.9); SFX.bug(panOf(p.x, p.y));
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
    function addSmoke() {
      if (reduceMotion) return;
      for (var i = 0; i < smokes.length; i++) if (smokes[i].t >= 0.7) { smokes[i].t = 0; smokes[i].dx = rand(-8, 8); return; }
      if (smokes.length < 5) smokes.push({ t: 0, dx: rand(-8, 8) });
    }

    /* ----- projection ----- */
    function project(wx, wy, z, out) {
      var dx = wx - P.x, dy = wy - P.y, c = Math.cos(P.a), s = Math.sin(P.a);
      var depth = dx * c + dy * s, lat = -dx * s + dy * c;
      if (depth < 0.15) return null;
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
          setFlash(4, 0.35); floater('呀! 被電到', cw / 2, ch * 0.42, '#fff', 32);
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
        var wasW = s.warn > 0;
        s.fireT -= dt * sf; s.warn = s.fireT < 0.8 && s.fireT > 0 ? 1 - s.fireT / 0.8 : 0;
        if (s.warn > 0 && !wasW) SFX.spit(panOf(s.x, s.y));
        if (s.fireT <= 0) {
          if (d < 11 && rayDist(s.x, s.y, Math.atan2(dy, dx), d + 0.5) >= d - 0.3) { fireProj(s.x, s.y, DIFF.projSpeed[di]); s.fireT = DIFF.spitFire[di] * rand(0.9, 1.2); }
          else s.fireT = 0.6;
        }
      }
      for (i = projs.length - 1; i >= 0; i--) {
        var pj = projs[i]; pj.life -= dt;
        if (pj.life <= 0) { rm(projs, i); continue; }
        if (fz) continue;
        pj.x += pj.vx * dt * sf; pj.y += pj.vy * dt * sf;
        if (!isFree(pj.x, pj.y, 0.05)) { burst(pj.x, pj.y, 0.45, 6, ['#ffb347', '#fff'], 0.6); sparks(pj.x, pj.y, 0.45, 4, 1); rm(projs, i); continue; }
        dx = pj.x - P.x; dy = pj.y - P.y;
        if (dx * dx + dy * dy < 0.25 && G.invul <= 0) {
          rm(projs, i); G.invul = 1.2; burst(pj.x, pj.y, 0.45, 16, ['#ffb347', '#ff5a3c', '#fff'], 1.1); SFX.zap();
          setFlash(5, 0.4); floater('被火球打中!', cw / 2, ch * 0.42, '#fff', 32);
          loseHeart('proj'); if (state !== 'play') return;
        }
      }
    }
    function nearestWordAngle() {   /* aim assist: nearest visible answer/distractor bubble within the cone */
      var best = 1e9, rel = 0, range = DIFF.aimRange[di];
      for (var i = 0; i < targets.length; i++) {
        var t = targets[i]; if (t.age < 0.3) continue;
        var dx = t.x - P.x, dy = t.y - P.y, r = normAng(Math.atan2(dy, dx) - P.a), ar = r < 0 ? -r : r;
        if (ar < range && ar < best) {
          var d = Math.sqrt(dx * dx + dy * dy);
          if (rayDist(P.x, P.y, Math.atan2(dy, dx), d + 1) < d - 0.4) continue;
          best = ar; rel = r;
        }
      }
      return best < 1e8 ? rel : null;
    }
    function updatePlayer(dt) {
      var tk = ((keys.ArrowRight || keys.KeyE) ? 1 : 0) - ((keys.ArrowLeft || keys.KeyQ) ? 1 : 0), want = tk * 2.3, acc = 16 * dt;
      turnV += clamp(want - turnV, -acc, acc);
      var da = turnV * dt;
      if (lookPend !== 0) { var take = lookPend * (1 - Math.exp(-dt * 28)); lookPend -= take; da += take; if (Math.abs(lookPend) < 1e-4) lookPend = 0; }
      /* aim assist: gentle pull toward the nearest word, weaker while actively turning */
      var rel = nearestWordAngle();
      if (rel !== null && (G.boss ? DIFF.aim[di] * 0.6 : DIFF.aim[di]) > 0) {
        var act = clamp(Math.abs(turnV) / 1.2 + Math.abs(lookPend) * 8, 0, 1);
        da += rel * (1 - Math.exp(-dt * 2.4 * DIFF.aim[di])) * (1 - act * 0.85);
      }
      P.a += da;
      var ky = ((keys.KeyW || keys.ArrowUp) ? 1 : 0) - ((keys.KeyS || keys.ArrowDown) ? 1 : 0) - jy;
      var kx = ((keys.KeyD) ? 1 : 0) - ((keys.KeyA) ? 1 : 0) + jx;
      var l = Math.sqrt(kx * kx + ky * ky); if (l > 1) { kx /= l; ky /= l; }
      if (kx || ky) {
        var sp = 2.6 * dt, c = Math.cos(P.a), s = Math.sin(P.a);
        var vx = (c * ky - s * kx) * sp, vy = (s * ky + c * kx) * sp, ox = P.x, oy = P.y;
        if (isFree(P.x + vx, P.y, 0.25)) P.x += vx;
        if (isFree(P.x, P.y + vy, 0.25)) P.y += vy;
        gunBob += dt * 9;
        stepDist += Math.sqrt((P.x - ox) * (P.x - ox) + (P.y - oy) * (P.y - oy));
        if (stepDist > 0.62) { stepDist = 0; SFX.step(); }
      }
    }
    function update(dt, camDt) {
      var playing = state === 'play';
      var sf = G.slow > 0 ? 0.45 : 1;
      if (state === 'intro') { P.a += dt * 0.25; }
      if (state === 'paused') return;
      if (state === 'learn') lcTick(dt);
      if (speakUntil && performance.now() > speakUntil) speakUntil = 0;
      if (!speakUntil && ducked) duck(false);
      if (playing) {
        G.playTime += dt; G.qT += dt;
        cool -= dt;
        updatePlayer(camDt);
        G.slow = Math.max(0, G.slow - dt); G.triple = Math.max(0, G.triple - dt); G.invul = Math.max(0, G.invul - dt); G.freezeW = Math.max(0, G.freezeW - dt);
        if (G.roundMax) G.roundT = Math.max(0, G.roundT - dt * sf);
        /* gentle hint on the low tiers: the answer bubble pulses after 4s */
        hinting = !!(DIFF.hint[di] && !G.boss && G.qT > 4);
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
          t.hidT += dt;
          if (t.hidT > 0.3) {
            var hdx = t.x - P.x, hdy = t.y - P.y, hd = Math.sqrt(hdx * hdx + hdy * hdy);
            if (rayDist(P.x, P.y, Math.atan2(hdy, hdx), hd + 1) < hd - 0.4) { t.hidN += t.hidT; } else t.hidN = 0;
            t.hidT = 0;
            if (t.hidN > 3) { var np = spawnPos(P.a, 0.7, 3.4, 5.8); t.x = np.x; t.y = np.y; t.age = 0; t.hidN = 0; burst(t.x, t.y, 0.55, 10, [COLORS[t.col], '#fff'], 0.8); }
          }
        }
      }
      /* particles */
      for (var pi = 0; pi < PCAP; pi++) {
        var p = PP[pi]; if (p.life <= 0) continue;
        p.life -= dt;
        if (p.life <= 0) continue;
        if (p.kind === 2) { p.z += p.vz * dt; continue; }
        p.vz -= p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.z = Math.max(0, p.z + p.vz * dt); p.rot += p.vr * dt;
        if (p.z <= 0 && p.vz < 0) p.vz = -p.vz * 0.35;
      }
      for (var fi = 0; fi < floaters.length; fi++) if (floaters[fi].t < 1.2) floaters[fi].t += dt;
      for (var ti = trails.length - 1; ti >= 0; ti--) { trails[ti].t += dt; if (trails[ti].t > 0.22) rm(trails, ti); }
      for (var si = 0; si < smokes.length; si++) if (smokes[si].t < 0.7) smokes[si].t += dt;
      shake = Math.max(0, shake - dt); flash = Math.max(0, flash - dt); recoil = Math.max(0, recoil - dt * 6); muzzle = Math.max(0, muzzle - dt); hitM = Math.max(0, hitM - dt);
      dmgV = Math.max(0, dmgV - dt); comboT = Math.max(0, comboT - dt);
      if (hint) { hint.t -= dt; if (hint.t <= 0) hint = null; }
      if (G.banner) { G.banner.t -= dt; if (G.banner.t <= 0) G.banner = null; }
      if (G.boss) G.boss.blink = (G.playTime * 0.9) % 3.2;
      if (state !== uiState) { uiState = state; root.classList.toggle('wq37-intro', state === 'intro'); }
      var shown = playing && !!cur && canHear();
      if (shown !== sayShown) { sayShown = shown; sayBtn.classList.toggle('on', shown); }
      if (state === 'over') {
        overT -= dt;
        if (overT <= 0 && !resultShown) showResult();
      }
    }

    /* ----- finish ----- */
    function accuracyNow() { var n = G.correct + G.wrong; return n ? G.correct / n : 0; }
    function stars() {
      var acc = accuracyNow(), s;
      if (G.won && G.wrong === 0 && G.hpLost === 0) return 5;
      s = acc >= 0.9 ? 4 : acc >= 0.75 ? 3 : acc >= 0.5 ? 2 : 1;
      return G.won ? s : Math.min(s, 2);   /* running out of hearts never counts as a pass */
    }
    function perWord() {
      var out = [], i;
      for (i = 0; i < PW.length; i++) {
        var r = PW[i];
        if (!r.asked && mode !== 'level') continue;
        out.push({ en: r.en, ok: r.ok, tries: r.tries, solved: r.done });
      }
      return out;
    }
    function finish(win) {
      if (state === 'over') return;
      G.won = win; state = 'over'; overT = G.bossBeaten ? 2.2 : 1.1; SFX.end(win);
      if (document.pointerLockElement) { try { document.exitPointerLock(); } catch (e) { /* */ } }
      keys = {}; jx = jy = 0; sayBtn.classList.remove('on'); sayShown = false;
      var prev = loadBest(), isRec = G.score > prev && prev > 0, best = Math.max(prev, G.score);
      if (G.score > prev) saveBest(G.score);
      G.best = best;
      var st = stars(), pw = perWord(), asked = 0, first = 0, i;
      for (i = 0; i < PW.length; i++) if (PW[i].asked) { asked++; if (PW[i].ok) first++; }
      lastResult = { score: G.score, correct: G.correct, wrong: G.wrong, rounds: Math.min(G.correct, totalRounds), seconds: Math.round(G.playTime), stars: st, maxCombo: G.maxCombo,
        best: best, newRecord: isRec, bossBeaten: G.bossBeaten, passed: st >= 3, accuracy: Math.round(accuracyNow() * 1000) / 1000,
        firstTryAccuracy: asked ? Math.round(first / asked * 1000) / 1000 : 0, difficulty: tier, mode: mode, perWord: pw };
      if (win && !G.bossBeaten) { burst(P.x + Math.cos(P.a) * 3, P.y + Math.sin(P.a) * 3, 0.6, 60, ['#ffe36a', '#ff5fa2', '#7fe3ff', '#fff'], 1.8); }
      if (!finishedCalled) { finishedCalled = true; callFinish(); }
    }
    function callFinish() {
      try {
        var r = opts.onFinish ? opts.onFinish(JSON.parse(JSON.stringify(lastResult))) : 0;
        if (typeof r === 'number' && r > 0) G.coins = r;
      } catch (e) { console.error(e); }
    }

    /* ---------- DOM overlays ---------- */
    function clearOv() { if (ovEl && ovEl.parentNode) ovEl.parentNode.removeChild(ovEl); ovEl = null; }
    function showOv(html, handlers) {
      clearOv();
      ovEl = document.createElement('div'); ovEl.className = 'wq37-ov'; ovEl.innerHTML = '<div class="wq37-card">' + html + '</div>';
      ovEl.addEventListener('pointerdown', function (e) { e.stopPropagation(); gesture(); });
      root.appendChild(ovEl);
      Object.keys(handlers || {}).forEach(function (k) {
        var el = ovEl.querySelector('[data-act="' + k + '"]');
        if (el) el.addEventListener('click', function (e) { e.stopPropagation(); gesture(); handlers[k](); });
      });
      var b = ovEl.querySelector('.wq37-go') || ovEl.querySelector('button'); if (b) { try { b.focus({ preventScroll: true }); } catch (e) { /* */ } }
    }
    var lcOn = lcEnabled(opts), lc = null;
    function lcShow(ok, w, picked) {
      if (!lcOn || !w || state !== 'play' || G.boss) return;
      var T = ok ? LC_OK : LC_BAD;
      state = 'learn'; hint = null; keys = {}; jx = jy = 0; joyId = lookId = null; lookPend = 0; turnV = 0; dragging = false; updateKnob(0, 0);
      var el = lcBuild(document, ok, w, picked);
      lc = { ok: ok, w: w, t: 0, min: T.min, max: T.max, again: T.again || 0, el: el, bar: el.querySelector('.wqlc-bar i'), go: el.querySelector('[data-lc="go"]') };
      el.addEventListener('pointerdown', function (e) { e.stopPropagation(); gesture(); });
      el.querySelector('[data-lc="say"]').addEventListener('click', function (e) { e.stopPropagation(); if (lc) speak(lc.w.en, true); });
      lc.go.addEventListener('click', function (e) { e.stopPropagation(); lcDone(false); });
      root.appendChild(el);
      if (!ok) speak(w.en);
    }
    function lcTick(dt) {
      if (!lc) { state = 'play'; return; }
      var t0 = lc.t; lc.t += dt;
      if (lc.bar) lc.bar.style.width = Math.min(100, lc.t / lc.max * 100).toFixed(1) + '%';
      if (lc.t >= lc.min && lc.go.disabled) { lc.go.disabled = false; if (!touchMode) { try { lc.go.focus({ preventScroll: true }); } catch (e) { /* */ } } }
      if (lc.again && t0 < lc.again && lc.t >= lc.again) speak(lc.w.en);
      if (lc.t >= lc.max) lcDone(true);
    }
    function lcDone(force) {
      if (!lc || (!force && lc.t < lc.min)) return;
      if (lc.el.parentNode) lc.el.parentNode.removeChild(lc.el);
      lc = null; keys = {};
      if (state === 'learn') { state = 'play'; lastT = 0; cool = 0.3; }
    }
    function setTier(n, fromUi) {
      n = clamp(n | 0, 1, 5);
      if (lockDiff || state !== 'intro') return;
      if (n !== tier) { tier = n; di = n - 1; resetGame(); if (fromUi) SFX.click(); }
      if (!ovEl) return;
      var bs = ovEl.querySelectorAll('[data-tier]'), i;
      for (i = 0; i < bs.length; i++) { var on = (i + 1) === tier; bs[i].classList.toggle('on', on); bs[i].setAttribute('aria-pressed', on ? 'true' : 'false'); }
      var d = ovEl.querySelector('[data-role="tdesc"]'), T = TIERS[tier - 1];
      if (d) d.innerHTML = T.ic + ' ' + T.name + ' · ' + T.sub + '<small>' + T.desc + '</small>';
    }
    function showIntro() {
      var k = function (t) { return '<span class="wq37-key">' + t + '</span>'; };
      var kb = '<div class="wq37-li"><div class="wq37-ic">' + k('W') + k('A') + k('S') + k('D') + '</div>移動</div>' +
        '<div class="wq37-li"><div class="wq37-ic">' + k('←') + k('→') + '</div>轉向</div>' +
        '<div class="wq37-li"><div class="wq37-ic">' + k('空白') + '</div>開火</div>';
      var tc = '<div class="wq37-li"><div class="wq37-ic">🕹️</div>移動</div><div class="wq37-li"><div class="wq37-ic">👆</div>轉向</div><div class="wq37-li"><div class="wq37-ic">🔫</div>開火</div>';
      var tiers = '';
      if (!lockDiff) {
        tiers = '<div class="wq37-tiers" role="group" aria-label="難度">';
        for (var i = 0; i < 5; i++) tiers += '<button class="wq37-tier" data-tier="' + (i + 1) + '" aria-pressed="false"><span class="tic">' + TIERS[i].ic + '</span><span>' + TIERS[i].name + '</span><span class="tnum">' + (i + 1) + '</span></button>';
        tiers += '</div><div class="wq37-tdesc" data-role="tdesc"></div>';
      }
      showOv('<h1>' + escHtml(title) + '</h1><div style="font-size:15px;font-weight:700">射中正確英文字泡泡!</div>' +
        '<div class="wq37-legend">' + (touchMode ? tc : kb) + '<div class="wq37-li"><div class="wq37-ic">❤️❤️❤️</div>3 粒心</div></div>' +
        tiers + '<button class="wq37-go" data-act="go">開始</button>', { go: beginPlay });
      if (!lockDiff) {
        var bs = ovEl.querySelectorAll('[data-tier]');
        for (var j = 0; j < bs.length; j++) (function (n) { bs[n].addEventListener('click', function (e) { e.stopPropagation(); gesture(); setTier(n + 1, true); }); })(j);
        setTier(tier, false);
      }
    }
    function escHtml(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
    function beginPlay() {
      gesture(); clearOv(); resetGame(); state = 'play'; musNext = 0; SFX.start();
    }
    function showPause() {
      var h = '<h2>已暫停</h2>';
      if (soundOn) h += '<div class="wq37-opt"><button class="wq37-mutebig" data-act="mute" aria-label="聲音">' + (muted ? '🔇' : '🔊') + '</button></div>';
      if (!touchMode) h += '<div class="wq37-opt"><span>🖱️</span><input type="range" min="40" max="250" value="' + Math.round(sens * 100) + '" data-role="sens" aria-label="滑鼠靈敏度"></div>';
      h += '<button class="wq37-go" data-act="res">繼續</button>';
      showOv(h, { res: function () { resume(); }, mute: function () { setMuted(!muted); } });
      var sl = ovEl.querySelector('[data-role="sens"]');
      if (sl) sl.addEventListener('input', function () { sens = clamp(sl.value / 100, 0.4, 2.5); saveSens(sens); });
    }
    function showResult() {
      resultShown = true; var r = lastResult, acc = Math.round(100 * r.accuracy), st = '', i;
      for (i = 1; i <= 5; i++) st += i <= r.stars ? '★' : '<i>★</i>';
      var head = G.bossBeaten ? '🎉 打敗字母怪獸!' : G.won ? (r.passed ? '好叻!全部完成' : '完成了!再準啲更好') : '再接再厲!';
      var wd = '';
      if (mode === 'level' && r.perWord.length) {
        wd = '<div class="wq37-words">';
        for (i = 0; i < r.perWord.length; i++) wd += '<span class="' + (r.perWord[i].ok ? 'ok' : 'bad') + '">' + (r.perWord[i].ok ? '✓ ' : '✗ ') + escHtml(r.perWord[i].en) + '</span>';
        wd += '</div>';
      }
      var go = '';
      if (typeof opts.onNext === 'function' && r.passed) go = '<button class="wq37-go next" data-act="next">▶ 下一關</button>';
      showOv('<h2>' + head + '</h2><div class="wq37-stars">' + st + '</div>' +
        (r.newRecord ? '<div class="wq37-rec">🏆 NEW RECORD! 新紀錄</div>' : '') + (G.coins ? '<div class="wq37-coin">🪙 +' + G.coins + '</div>' : '') +
        '<div class="wq37-stat"><div><span>分數</span>' + r.score + '</div><div><span>最高分</span>' + r.best + '</div><div><span>準確度</span>' + acc + '%</div><div><span>最高連擊</span>' + r.maxCombo + '</div></div>' + wd + go +
        '<div><button class="wq37-go' + (go ? ' small' : '') + '" data-act="again">↻ 再玩一次</button><button class="wq37-go alt' + (go ? ' small' : '') + '" data-act="back">返回</button></div>',
        { again: function () { beginPlay(); },
          next: function () { try { if (opts.onNext) opts.onNext(); } catch (e) { console.error(e); } },
          back: function () {
            if (!finishedCalled && lastResult) { finishedCalled = true; callFinish(); }
            try { if (opts.onExit) opts.onExit(); } catch (e) { console.error(e); }
          } });
    }
    function pause() {
      if (state !== 'play') return;
      state = 'paused'; keys = {}; jx = jy = 0; joyId = lookId = null; lookPend = 0; turnV = 0; updateKnob(0, 0);
      if (document.pointerLockElement) { try { document.exitPointerLock(); } catch (e) { /* */ } }
      try { if (canHear()) window.speechSynthesis.cancel(); } catch (e) { /* */ }
      showPause();
    }
    function resume() { if (state !== 'paused') return; clearOv(); state = 'play'; lastT = 0; musNext = 0; }

    /* ---------- input ---------- */
    var GAMEKEYS = { KeyW: 1, KeyA: 1, KeyS: 1, KeyD: 1, KeyQ: 1, KeyE: 1, ArrowUp: 1, ArrowDown: 1, ArrowLeft: 1, ArrowRight: 1, Space: 1, ControlLeft: 1, ControlRight: 1 };
    function replay() { if (state === 'play' && cur) speak(cur.en, true); }
    function onKeyDown(e) {
      gesture();
      var c = e.code;
      if (state === 'intro') {
        if (c === 'Enter' || c === 'Space') { e.preventDefault(); beginPlay(); return; }
        var dm = /^(Digit|Numpad)([1-5])$/.exec(c);
        if (dm) { e.preventDefault(); setTier(+dm[2], true); return; }
        if (c === 'ArrowRight' || c === 'ArrowUp') { e.preventDefault(); setTier(tier + 1, true); return; }
        if (c === 'ArrowLeft' || c === 'ArrowDown') { e.preventDefault(); setTier(tier - 1, true); return; }
        return;
      }
      if (c === 'KeyM' && soundOn && !e.repeat) { setMuted(!muted); return; }
      if (state === 'over' && resultShown && c === 'Enter') { e.preventDefault(); beginPlay(); return; }
      if (state === 'paused' && (c === 'Enter' || c === 'KeyP' || c === 'Escape')) { e.preventDefault(); resume(); return; }
      if (state === 'learn') {
        if ((c === 'Enter' || c === 'NumpadEnter' || c === 'Space') && !e.repeat) { e.preventDefault(); lcDone(false); }
        else if (c === 'KeyR' && !e.repeat && lc) speak(lc.w.en, true);
        else if (GAMEKEYS[c]) e.preventDefault();
        return;
      }
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
    function setTouch() { if (!touchMode) { touchMode = true; root.classList.add('wq37-touch'); if (scaleIdx > SCALE_TOUCH_MAX) { scaleIdx = SCALE_TOUCH_MAX; applyScale(SCALES[scaleIdx]); } } }
    function updateKnob(x, y) { knob.style.transform = 'translate(' + x + 'px,' + y + 'px)'; }
    function onFireBtn(e) {
      e.preventDefault(); e.stopPropagation(); gesture();
      if (e.pointerType === 'touch') setTouch();
      if (state === 'learn') { lcDone(false); return; }
      if (state === 'play' && cool <= 0) { cool = 0.2; fire(0); }
    }
    function onSayBtn(e) { e.preventDefault(); e.stopPropagation(); gesture(); if (e.pointerType === 'touch') setTouch(); replay(); }
    function onMuteBtn(e) { e.preventDefault(); e.stopPropagation(); gesture(); if (e.pointerType === 'touch') setTouch(); setMuted(!muted); }
    function onRootDown(e) {
      gesture();
      if (e.pointerType === 'touch') setTouch();
      if (state === 'learn') { lcDone(false); return; }
      if (state !== 'play') return;
      var rect = root.getBoundingClientRect(), lx = e.clientX - rect.left, ly = e.clientY - rect.top;
      if (e.pointerType === 'touch' || e.pointerType === 'pen') {
        try { root.setPointerCapture(e.pointerId); } catch (er) { /* */ }
        if (lx < rect.width * 0.5 && joyId === null) {
          joyId = e.pointerId;
          var jl = clamp(lx - 64, 4, rect.width - 132), jt = clamp(ly - 64, 4, rect.height - 132);
          joy.style.left = jl + 'px'; joy.style.bottom = 'auto'; joy.style.top = jt + 'px'; joyOx = jl + 64; joyOy = jt + 64;
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
        } else if (e.pointerId === lookId) { lookPend += (e.clientX - lookX) * 0.0085 * sens; lookX = e.clientX; }
      } else if (state === 'play') {
        if (document.pointerLockElement) P.a += clamp(e.movementX || 0, -220, 220) * 0.0028 * sens;
        else if (dragging && (e.buttons & 1)) lookPend += (e.clientX - lookX) * 0.006 * sens;
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
    function onVis() { if (document.hidden) { pause(); lastT = 0; } }
    function onCtx(e) { e.preventDefault(); }
    function onPauseBtn(e) { e.preventDefault(); e.stopPropagation(); gesture(); if (e.pointerType === 'touch') setTouch(); if (state === 'play') pause(); else if (state === 'paused') resume(); }

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
    if (muteBtn) muteBtn.addEventListener('pointerdown', onMuteBtn);
    try { if (window.matchMedia && window.matchMedia('(pointer:coarse)').matches) setTouch(); } catch (e) { /* */ }

    /* ---------- layout + adaptive internal resolution ---------- */
    var SCALE_TOUCH_MAX = 4, scaleIdx = 4, scaleT = 0, lastDownT = -1e9, costEma = 0, layoutDone = false;
    var FT = new Float32Array(120), FTI = 0, FTN = 0, IVL = new Float32Array(120);
    function applyScale(sc) {
      scale = sc;
      RW = Math.max(160, Math.round(RW0 * sc)); RH = Math.max(90, Math.round(RH0 * sc)) & ~1;
      F = RW / (2 * PL); S = cw / RW;
    }
    function layout() {
      var ncw = container.clientWidth || 320, nch = container.clientHeight || 180, ndpr = Math.min(window.devicePixelRatio || 1, 2);
      cw = ncw; ch = nch;
      if (ndpr !== dpr) { dpr = ndpr; if (layoutDone) resetCaches(); }
      canvas.width = Math.round(cw * dpr); canvas.height = Math.round(ch * dpr);
      var asp = cw / ch;
      if (asp >= 1) { RH0 = 270; RW0 = clamp(Math.round(270 * asp), 300, 560); PL = 0.66; }
      else { RW0 = 270; RH0 = Math.min(600, Math.round(270 / asp)); PL = 0.5; }
      RH0 &= ~1;
      var mw = Math.ceil(RW0 * 1.25) + 2, mh = Math.ceil(RH0 * 1.25) + 2;
      if (!img || img.width !== mw || img.height !== mh) {
        rc.width = mw; rc.height = mh; img = rctx.createImageData(mw, mh); buf = new Uint32Array(img.data.buffer); zb = new Float32Array(mw); ST = mw;
      }
      applyScale(SCALES[scaleIdx]);
      hudU = clamp(Math.min(cw, ch * 1.15) / 400, 0.85, 1.55);
      var fs = clamp(Math.min(cw, ch * 1.3) / 420, 0.8, 1.2);
      fireBtn.style.width = fireBtn.style.height = Math.round(clamp(92 * fs, 72, 110)) + 'px';
      promptSig = -1; skyKey = ''; vigSpr = null; layoutDone = true;
    }
    layout();
    if (typeof ResizeObserver !== 'undefined') { ro = new ResizeObserver(function () { if (!dead) layout(); }); ro.observe(container); }
    var onResize = function () { if (!dead) layout(); };
    window.addEventListener('resize', onResize);
    function adaptScale(now) {
      if (now - scaleT < 1500 || state === 'paused' || FTN < 30) return;
      var maxIdx = touchMode ? SCALE_TOUCH_MAX : SCALES.length - 1, press = costEma;
      if (press > 7.0 && scaleIdx > 0) { scaleIdx--; lastDownT = now; }
      else if (scaleIdx < maxIdx && now - lastDownT > 5000) {
        var ratio = SCALES[scaleIdx + 1] / SCALES[scaleIdx];
        if (press * ratio * ratio < 4.2) scaleIdx++; else return;
      } else return;
      scaleT = now; applyScale(SCALES[scaleIdx]);
    }
    function stats() {
      var n = Math.min(FTN, 120), a = [], i, sum = 0, mx = 0, isum = 0;
      for (i = 0; i < n; i++) { a.push(FT[i]); sum += FT[i]; if (FT[i] > mx) mx = FT[i]; isum += IVL[i]; }
      a.sort(function (x, y) { return x - y; });
      return { avg: n ? sum / n : 0, p95: n ? a[Math.min(n - 1, Math.floor(n * 0.95))] : 0, max: mx, scale: scale, RW: RW, RH: RH, frames: n, fps: isum > 0 ? n / (isum / 1000) : 0 };
    }

    /* ---------- world rendering ---------- */
    function dark50(c) { return 0xFF000000 | ((c >> 1) & 0x7F7F7F); }
    function dark75(c) { return 0xFF000000 | (((c >> 1) & 0x7F7F7F) + ((c >> 2) & 0x3F3F3F)); }
    function renderWorld() {
      var T = texOf(arenaIdx), W = RW, H = RH, half = H >> 1, st = ST;
      var px = P.x, py = P.y, dx = Math.cos(P.a), dy = Math.sin(P.a), plx = -dy * PL, ply = dx * PL;
      var y, x, lvl, ft, ct, k, i, idx;
      for (y = 0; y < half; y++) {
        var p = half - y - 0.5, rd = 0.5 * F / p;
        lvl = (rd / 14 * 15) | 0; if (lvl > 15) lvl = 15;
        ft = T.floorLv[lvl] || floorLevel(T, lvl); ct = T.ceilLv[lvl] || ceilLevel(T, lvl);
        var stx = rd * 2 * plx / W, sty = rd * 2 * ply / W;
        var fx = (px + rd * (dx - plx)) * 32, fy = (py + rd * (dy - ply)) * 32, sx = stx * 32, sy = sty * 32;
        var o1 = y * st, o2 = (H - 1 - y) * st;
        for (x = 0; x < W; x++) {
          k = (((fy | 0) & 63) << 6) + ((fx | 0) & 63);
          buf[o1 + x] = ct[k]; buf[o2 + x] = ft[k];
          fx += sx; fy += sy;
        }
      }
      for (x = 0; x < W; x++) {
        var cam = 2 * x / W - 1, rdx = dx + plx * cam, rdy = dy + ply * cam;
        var mx = px | 0, my = py | 0;
        var ddx = rdx === 0 ? 1e30 : Math.abs(1 / rdx), ddy = rdy === 0 ? 1e30 : Math.abs(1 / rdy);
        var stepx = rdx < 0 ? -1 : 1, stepy = rdy < 0 ? -1 : 1;
        var sdx = rdx < 0 ? (px - mx) * ddx : (mx + 1 - px) * ddx, sdy = rdy < 0 ? (py - my) * ddy : (my + 1 - py) * ddy;
        var side = 0, type = 1;
        for (i = 0; i < 48; i++) {
          if (sdx < sdy) { sdx += ddx; mx += stepx; side = 0; } else { sdy += ddy; my += stepy; side = 1; }
          if (mx < 0 || my < 0 || mx >= MW || my >= MH) { type = 2; break; }
          var cell = MAPF[my * MW + mx]; if (cell) { type = cell; break; }
        }
        var perp = side === 0 ? sdx - ddx : sdy - ddy; if (perp < 0.05) perp = 0.05;
        zb[x] = perp;
        var wx = side === 0 ? py + perp * rdy : px + perp * rdx; wx -= Math.floor(wx);
        var texX = (wx * 64) | 0; if ((side === 0 && rdx > 0) || (side === 1 && rdy < 0)) texX = 63 - texX;
        var lh = F / perp, rt = half - lh / 2, rb = half + lh / 2, y0 = Math.max(0, rt | 0), y1 = Math.min(H - 1, rb | 0);
        var step = 64 / lh, tp = (y0 - half + lh / 2) * step;
        lvl = (perp / 14 * 15) | 0; if (lvl > 15) lvl = 15;
        var lk = side * 16 + lvl, tex = T.wallLv[type][lk] || wallLevel(T, type, side, lvl), base = texX << 6;
        for (y = y0; y <= y1; y++) { buf[y * st + x] = tex[base + (tp & 63)]; tp += step; }
        /* ambient occlusion where the wall meets the floor / ceiling */
        var na = ((lh * 0.045) | 0) + 1, ys, yy, c;
        if (rb <= H - 1) {
          ys = Math.max(y0, y1 - na * 2 + 1);
          for (yy = ys; yy <= y1; yy++) { idx = yy * st + x; c = buf[idx]; buf[idx] = yy > y1 - na ? dark50(c) : dark75(c); }
          var fe = Math.min(H - 1, y1 + na * 2);
          for (yy = y1 + 1; yy <= fe; yy++) { idx = yy * st + x; c = buf[idx]; buf[idx] = dark75(c); }
        }
        if (rt >= 1) {
          var te = Math.min(y1, y0 + na - 1);
          for (yy = y0; yy <= te; yy++) { idx = yy * st + x; buf[idx] = dark75(buf[idx]); }
          var ce = Math.max(0, y0 - na);
          for (yy = y0 - 1; yy >= ce; yy--) { idx = yy * st + x; c = buf[idx]; if (c !== 0) buf[idx] = dark75(c); }
        }
      }
      rctx.putImageData(img, 0, 0, 0, 0, W, H);
    }

    /* per-arena sky: gradient + parallax star / cloud layers (pre-rendered tiles, scrolled by yaw) */
    var SKY = { bg: null, l1: null, l2: null, tw: 0, h: 0 };
    var skyAi = -1, skyW = 0, skyH = 0, skyD = 0;
    function cloudG(g, x, y, r, a) {
      for (var i = 0; i < 6; i++) {
        var cx = x + (i - 2.5) * r * 0.55, cy = y + Math.sin(i * 2.1) * r * 0.18, rr = r * (0.55 + 0.25 * Math.sin(i * 1.7 + 1));
        var gr = g.createRadialGradient(cx, cy, 0, cx, cy, rr); gr.addColorStop(0, 'rgba(255,255,255,' + a + ')'); gr.addColorStop(1, 'rgba(255,255,255,0)');
        g.fillStyle = gr; g.beginPath(); g.arc(cx, cy, rr, 0, TWO_PI); g.fill();
      }
    }
    function buildSky() {
      var ai = arenaIdx, h = Math.ceil(ch * 0.56), tw = Math.max(900, Math.ceil(cw * 1.4)), i, g, seed = ai * 131 + 7;
      function r() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
      var fog = ARENAS[ai].fog, fogC = 'rgb(' + fog[0] + ',' + fog[1] + ',' + fog[2] + ')';
      SKY.bg = mkCv(cw, h); g = SKY.bg.getContext('2d');
      var gr = g.createLinearGradient(0, 0, 0, h);
      if (ai === 0) { gr.addColorStop(0, '#04021a'); gr.addColorStop(0.55, '#1a1060'); gr.addColorStop(1, fogC); }
      else if (ai === 1) { gr.addColorStop(0, '#3fa8f5'); gr.addColorStop(0.6, '#a6e6ff'); gr.addColorStop(1, fogC); }
      else { gr.addColorStop(0, '#08224f'); gr.addColorStop(0.5, '#2a78bd'); gr.addColorStop(1, fogC); }
      g.fillStyle = gr; g.fillRect(0, 0, cw, h);
      if (ai === 0) {   /* nebula glows */
        for (i = 0; i < 3; i++) { var nx = cw * (0.2 + 0.3 * i), ny = h * (0.3 + 0.15 * (i % 2)), nr = cw * 0.35; var ng = g.createRadialGradient(nx, ny, 0, nx, ny, nr); ng.addColorStop(0, i % 2 ? 'rgba(255,90,200,.28)' : 'rgba(80,200,255,.24)'); ng.addColorStop(1, 'rgba(0,0,0,0)'); g.fillStyle = ng; g.fillRect(0, 0, cw, h); }
      } else if (ai === 1) {   /* sun */
        var sg = g.createRadialGradient(cw * 0.78, h * 0.28, 0, cw * 0.78, h * 0.28, cw * 0.18); sg.addColorStop(0, 'rgba(255,250,200,1)'); sg.addColorStop(0.25, 'rgba(255,240,150,.8)'); sg.addColorStop(1, 'rgba(255,240,150,0)');
        g.fillStyle = sg; g.fillRect(0, 0, cw, h);
      }
      SKY.l1 = mkCv(tw, h); g = SKY.l1.getContext('2d');
      if (ai === 0) {
        for (i = 0; i < Math.round(tw / 8); i++) { var sx = r() * tw, sy = r() * h * 0.92, sr = 0.5 + r() * 1.2; g.globalAlpha = 0.35 + r() * 0.65; g.fillStyle = r() < 0.2 ? '#bfe4ff' : '#ffffff'; g.beginPath(); g.arc(sx, sy, sr, 0, TWO_PI); g.fill(); }
        g.globalAlpha = 1;
      } else if (ai === 1) {
        for (i = 0; i < 5; i++) cloudG(g, r() * tw, h * (0.12 + r() * 0.45), 26 + r() * 22, 0.5);
      } else {   /* aurora ribbons */
        for (i = 0; i < 3; i++) {
          var base = h * (0.18 + i * 0.1), col = i === 1 ? '150,120,255' : '90,255,190';
          for (var x = 0; x < tw; x += 6) {
            var yy = base + Math.sin(x / tw * TWO_PI * (2 + i) + i) * h * 0.08, ag = g.createLinearGradient(0, yy - h * 0.1, 0, yy + h * 0.12);
            ag.addColorStop(0, 'rgba(' + col + ',0)'); ag.addColorStop(0.5, 'rgba(' + col + ',.22)'); ag.addColorStop(1, 'rgba(' + col + ',0)');
            g.fillStyle = ag; g.fillRect(x, yy - h * 0.1, 6, h * 0.22);
          }
        }
      }
      SKY.l2 = mkCv(tw, h); g = SKY.l2.getContext('2d');
      if (ai === 0) {   /* ringed planet + bright stars */
        var pxp = tw * 0.3, pyp = h * 0.32, pr = Math.min(cw, 700) * 0.07;
        var pg = g.createRadialGradient(pxp - pr * 0.3, pyp - pr * 0.3, pr * 0.1, pxp, pyp, pr); pg.addColorStop(0, '#ffd9a0'); pg.addColorStop(1, '#b0507a');
        g.fillStyle = pg; g.beginPath(); g.arc(pxp, pyp, pr, 0, TWO_PI); g.fill();
        g.strokeStyle = 'rgba(255,230,200,.8)'; g.lineWidth = pr * 0.12; g.beginPath(); g.ellipse(pxp, pyp, pr * 1.7, pr * 0.42, -0.35, 0, TWO_PI); g.stroke();
        for (i = 0; i < 18; i++) { var bx = r() * tw, by = r() * h * 0.8, bg = g.createRadialGradient(bx, by, 0, bx, by, 6); bg.addColorStop(0, 'rgba(255,255,255,1)'); bg.addColorStop(1, 'rgba(255,255,255,0)'); g.fillStyle = bg; g.beginPath(); g.arc(bx, by, 6, 0, TWO_PI); g.fill(); }
      } else if (ai === 1) {
        for (i = 0; i < 4; i++) cloudG(g, r() * tw, h * (0.2 + r() * 0.5), 46 + r() * 30, 0.7);
      } else {
        for (i = 0; i < 3; i++) cloudG(g, r() * tw, h * (0.25 + r() * 0.5), 44 + r() * 28, 0.35);
        for (i = 0; i < 40; i++) { g.globalAlpha = 0.5 + r() * 0.5; g.fillStyle = '#fff'; g.beginPath(); g.arc(r() * tw, r() * h, 0.8 + r() * 1.4, 0, TWO_PI); g.fill(); }
        g.globalAlpha = 1;
      }
      SKY.tw = tw; SKY.h = h; skyAi = ai; skyW = cw; skyH = ch; skyD = dpr; skyKey = 'ok';
    }
    function drawSky(drift) {
      if (skyKey === '' || skyAi !== arenaIdx || skyW !== cw || skyH !== ch || skyD !== dpr) buildSky();
      var fs = cw / (2 * PL), tw = SKY.tw, h = SKY.h;
      ctx.drawImage(SKY.bg, 0, 0, cw, h);
      var o1 = -(P.a * fs * 0.55), o2 = -(P.a * fs * 1.0) - drift, x0;
      x0 = ((o1 % tw) + tw) % tw - tw; ctx.drawImage(SKY.l1, x0, 0, tw, h); ctx.drawImage(SKY.l1, x0 + tw, 0, tw, h);
      x0 = ((o2 % tw) + tw) % tw - tw; ctx.drawImage(SKY.l2, x0, 0, tw, h); ctx.drawImage(SKY.l2, x0 + tw, 0, tw, h);
    }

    /* ---------- sprite rendering ---------- */
    function visState(depth, xa, xb) {   /* 0 hidden, 1 fully visible, 2 partly occluded */
      var a = Math.max(0, xa | 0), b = Math.min(RW - 1, xb | 0), c, vis = 0, hid = 0;
      if (b < a) return 0;
      for (c = a; c <= b; c++) { if (zb[c] < depth) hid++; else vis++; }
      return vis === 0 ? 0 : hid === 0 ? 1 : 2;
    }
    function clipRuns(depth, xa, xb) {
      var a = Math.max(0, xa | 0), b = Math.min(RW - 1, xb | 0), c;
      ctx.beginPath(); var runStart = -1;
      for (c = a; c <= b + 1; c++) {
        var vis = c <= b && zb[c] >= depth;
        if (vis && runStart < 0) runStart = c;
        if (!vis && runStart >= 0) { ctx.rect(runStart * S, 0, (c - runStart) * S, ch); runStart = -1; }
      }
      ctx.clip();
    }
    function groundY(depth) { return (RH / 2 + F * 0.5 / depth) * S; }
    var GBUG = [], GSPIT = [], GBOSS = [], GPICK = [], gOrb = null;
    function bugSpr(fr, bl, bk) { var v = fr * 2 + bl; return lazyGet(SPR_BUG, v * NB + bk, v * NB, bk, GBUG[v] || (GBUG[v] = function (bb) { return genBug(fr, bl, BUCKETS[bb]); })); }
    function spitSpr(w, bl, bk) { var v = w * 2 + bl; return lazyGet(SPR_SPIT, v * NB + bk, v * NB, bk, GSPIT[v] || (GSPIT[v] = function (bb) { return genSpit(w, bl, BUCKETS[bb]); })); }
    function bossSpr(atk, bl, mo, bk) { var v = (atk * 2 + bl) * 3 + mo; return lazyGet(SPR_BOSS, v * NB + bk, v * NB, bk, GBOSS[v] || (GBOSS[v] = function (bb) { return genBoss(atk, bl, mo, BUCKETS[bb]); })); }
    function orbSpr(bk) { return lazyGet(SPR_ORB, bk, 0, bk, gOrb || (gOrb = function (bb) { return genOrb(BUCKETS[bb]); })); }
    function pickSpr(ti, bk) { return lazyGet(SPR_PICK, ti * NB + bk, ti * NB, bk, GPICK[ti] || (GPICK[ti] = function (bb) { return genPick(ti, BUCKETS[bb]); })); }
    function warmRound() {   /* queue the bubble sprites a new question will need, for the sizes bubbles normally take */
      var fl = cw / (2 * PL), lo = bucketOf(fl / 8 * 0.42), hi = bucketOf(fl / 2.4 * 0.42), b, c, i;
      for (b = lo; b <= hi; b++) for (c = 0; c < 5; c++) warm(BODY, c * NB + b, b, bodyGen(c));
      var md = G.boss ? 2 : G.qtype === 'pic' ? 1 : 0;
      for (i = 0; i < targets.length; i++) { var w = targets[i].w; for (b = lo; b <= hi; b++) warm(w._l, md * NB + b, b, labelGen(w, md)); }
    }
    var BANGN = ['bangY', 'bangO'];
    function bang(n) { var k = BANGN[n]; return SOFT[k] || (SOFT[k] = label('!', 0, 36, n ? '#ff7a3c' : '#ffe36a')); }
    function blinkAt(ph, speed) { return ((G.playTime * speed + ph * 1.7) % 3.3) < 0.13 ? 1 : 0; }
    function pickIdx(type) { for (var i = 0; i < 5; i++) if (PICK_TYPES[i] === type) return i; return 0; }

    function drawBubble(t, pr) {
      var sc = t.age < 0 ? 0 : t.age < 0.4 ? easeBack(t.age / 0.4) : 1;
      if (sc <= 0.01) return;
      var pulse = 0, hintOn = t.correct && hinting;
      if (hintOn) pulse = 0.5 + 0.5 * Math.sin(G.playTime * 5);
      var r = pr.size * 0.42 * sc * (1 + pulse * 0.06), cx = pr.x, cy = pr.y - Math.sin(t.age * 2.2 + t.ph) * 0.1 * pr.size, b = bucketOf(r);
      drawSpr(shadowSpr(), cx, groundY(pr.depth), r * 0.8, 1, 0.3);
      if (hintOn) drawSpr(glowSpr(), cx, cy, r * (1.45 + 0.2 * pulse), 1, 1);
      var br = 1 + 0.025 * Math.sin(G.playTime * 3 + t.ph);
      drawSpr(bodySpr(t.col, b), cx, cy, r, br, 1 / br);
      var w = t.w, md = G.boss ? 2 : (G.qtype === 'pic' && (w.emoji || w.zh)) ? 1 : 0, lab = wordLabel(w, md, b), ls = lab.sz * r / lab.R;
      ctx.drawImage(lab.c, cx - ls / 2, cy - ls / 2, ls, ls);
    }
    function drawBug(b, pr) {
      var r = pr.size * 0.32, bk = bucketOf(r), cy = pr.y + pr.size * 0.2 - Math.abs(Math.sin(G.playTime * 8 + b.ph)) * r * 0.25;
      drawSpr(shadowSpr(), pr.x, groundY(pr.depth), r * 0.95, 1, 0.3);
      var fr = (((G.playTime * 7 + b.ph) | 0) & 1), sq = 1 + Math.sin(G.playTime * 8 + b.ph) * 0.05;
      drawSpr(bugSpr(fr, blinkAt(b.ph, 1), bk), pr.x, cy, r, sq, 1 / sq);
      if (G.freezeT > 0) iceOver(pr.x, cy, r * 1.25);
    }
    function drawSpit(s, pr) {
      var r = pr.size * 0.36, bk = bucketOf(r), w = s.warn, cy = pr.y + pr.size * 0.08 + Math.sin(G.playTime * 3 + s.ph) * r * 0.08;
      drawSpr(shadowSpr(), pr.x, groundY(pr.depth), r * 0.95, 1, 0.3);
      var sq = 1 + w * 0.12 + Math.sin(G.playTime * 4 + s.ph) * 0.03;
      drawSpr(spitSpr(w > 0 ? 1 : 0, blinkAt(s.ph, 0.8), bk), pr.x, cy, r, sq, 1 / sq);
      if (w > 0) {
        ctx.globalAlpha = 0.85; ctx.beginPath(); ctx.arc(pr.x, cy + r * 0.45, r * 0.3 * w, 0, TWO_PI); ctx.fillStyle = '#ffc83c'; ctx.fill(); ctx.globalAlpha = 1;
        drawLbl(bang(0), pr.x, cy - r * 2.1, Math.max(18, r * 0.9), 0);
      }
      if (G.freezeT > 0) iceOver(pr.x, cy, r * 1.3);
    }
    function drawProj(p, pr) {
      var r = Math.max(8, pr.size * 0.15) * (1 + Math.sin(G.playTime * 14 + p.ph) * 0.12), bk = bucketOf(r);
      drawSpr(orbSpr(bk), pr.x, pr.y, r, 1, 1);
      if (G.freezeT > 0) iceOver(pr.x, pr.y, r * 1.4);
    }
    function drawPickup(p, pr) {
      var r = pr.size * 0.3, cy = pr.y - Math.sin(G.playTime * 3 + p.ph) * 0.08 * pr.size;
      drawSpr(pickSpr(pickIdx(p.type), bucketOf(r)), pr.x, cy, r, 1, 1);
    }
    function drawBoss(B, pr) {
      var ap = B.appear, grow = ap < 1 ? easeBack(ap) : 1, r = pr.size * 1.15 * Math.max(0.05, grow) * (1 + B.atk * 0.12), cx = pr.x, cy = pr.y + Math.sin(B.t * 2) * r * 0.03;
      var atk = B.atk > 0 ? 1 : 0, bk = bucketOf(r), mo = atk ? 2 : ((B.t * 1.2) % 2 > 1 ? 1 : 0), sq = B.hit > 0 ? Math.sin(B.hit * 36) * 0.1 * Math.min(1, B.hit * 3) : 0;
      drawSpr(shadowSpr(), pr.x, groundY(pr.depth), r * 1.1, 1, 0.22);
      drawSpr(bossSpr(atk, B.blink < 0.14 ? 1 : 0, mo, bk), cx, cy, r, 1 + sq, 1 - sq);
      if (B.hit > 0) { ctx.globalAlpha = Math.min(0.7, B.hit * 1.4); ctx.beginPath(); ctx.arc(cx, cy, r * 1.0, 0, TWO_PI); ctx.fillStyle = '#fff'; ctx.fill(); ctx.globalAlpha = 1; }
      if (G.freezeT > 0) iceOver(cx, cy, r * 1.1);
    }
    function drawParticle(it, x, y, size) {
      var p = it.o, u = p.life / p.max, a;
      if (p.kind === 0) {
        ctx.globalAlpha = clamp(p.life * 2, 0, 1); ctx.fillStyle = p.col; ctx.beginPath(); ctx.arc(x, y, clamp(p.r * size / 200, 1.5, 15), 0, TWO_PI); ctx.fill(); ctx.globalAlpha = 1;
      } else if (p.kind === 1) {   /* flying letter */
        var e = p.spr, fs = clamp(size * 0.26, 12, 64);
        ctx.globalAlpha = clamp(p.life * 3, 0, 1);
        ctx.save(); ctx.translate(x, y); ctx.rotate(p.rot); ctx.drawImage(e.c, -e.w * fs / e.fs / 2, -e.h * fs / e.fs / 2, e.w * fs / e.fs, e.h * fs / e.fs); ctx.restore();
        ctx.globalAlpha = 1;
      } else if (p.kind === 2) {   /* puff / ring */
        a = u; var gr = 1 + (1 - u) * 1.6, rr = size * 0.3 * p.r * gr;
        ctx.globalAlpha = clamp(a, 0, 1) * 0.9;
        drawSpr(p.gl === 3 ? ringSpr() : puffSpr(p.gl), x, y, rr, 1, 1);
        ctx.globalAlpha = 1;
      } else {   /* spark */
        ctx.globalAlpha = clamp(u * 1.5, 0, 1); var sr = Math.max(3, p.r * size / 120 * 4);
        drawSpr(sparkSpr(), x, y, sr, 1, 1); ctx.globalAlpha = 1;
      }
    }
    function addSpr(k, o, wx, wy, z, hwK) {
      var e = SP[sn]; if (!e) e = SP[sn] = { d: 0, k: 0, o: null, hw: 0, pr: { x: 0, y: 0, depth: 0, size: 0 } };
      if (!project(wx, wy, z, e.pr)) return;
      e.d = e.pr.depth; e.k = k; e.o = o; e.hw = hwK ? e.pr.size * hwK : 8; SL[sn] = e; sn++;
    }

    /* gun view-model: pre-rendered per power-up variant and size, then bobbed / kicked per frame */
    function gunFor(variant, g) {
      var gi = (g / 16) | 0, key = variant * 48 + gi, e = gunSpr[key];
      if (e) return e;
      var w = Math.ceil(g * 0.9), h = Math.ceil(g * 0.98), c = mkCv(w, h), q = c.getContext('2d'), x = w / 2, y = h - 3, tipY = y - g * 0.7, i;
      q.lineJoin = 'round'; q.lineWidth = Math.max(3, g * 0.018); q.strokeStyle = DARK;
      var grd = q.createLinearGradient(x - g * 0.3, 0, x + g * 0.3, 0);
      if (variant === 1) { grd.addColorStop(0, '#e6f8ff'); grd.addColorStop(0.45, '#7fd6ff'); grd.addColorStop(1, '#2f86d0'); }
      else if (variant === 2) { grd.addColorStop(0, '#fff0b8'); grd.addColorStop(0.45, '#ffb347'); grd.addColorStop(1, '#d9680f'); }
      else { grd.addColorStop(0, '#ffb8de'); grd.addColorStop(0.45, '#ff5fa2'); grd.addColorStop(1, '#c42f78'); }
      q.beginPath(); q.moveTo(x - g * 0.32, y); q.lineTo(x - g * 0.13, tipY); q.lineTo(x + g * 0.13, tipY); q.lineTo(x + g * 0.32, y); q.closePath(); q.fillStyle = grd; q.fill(); q.stroke();
      q.fillStyle = 'rgba(255,255,255,.35)'; q.beginPath(); q.moveTo(x - g * 0.26, y - g * 0.04); q.lineTo(x - g * 0.1, tipY + g * 0.04); q.lineTo(x - g * 0.05, tipY + g * 0.04); q.lineTo(x - g * 0.17, y - g * 0.04); q.closePath(); q.fill();
      q.fillStyle = 'rgba(0,0,0,.12)'; q.beginPath(); q.moveTo(x + g * 0.2, y); q.lineTo(x + g * 0.1, tipY); q.lineTo(x + g * 0.13, tipY); q.lineTo(x + g * 0.32, y); q.closePath(); q.fill();
      q.strokeStyle = 'rgba(43,29,74,.5)'; q.lineWidth = Math.max(2, g * 0.012);
      for (i = 1; i <= 3; i++) { var by = y - g * (0.14 + i * 0.14), bw = g * (0.31 - i * 0.045); q.beginPath(); q.moveTo(x - bw, by); q.lineTo(x + bw, by); q.stroke(); }
      q.fillStyle = 'rgba(255,255,255,.75)';
      for (i = 0; i < 4; i++) { q.beginPath(); q.arc(x - g * 0.12 + (i % 2) * g * 0.2, y - g * (0.12 + i * 0.13), g * 0.02, 0, TWO_PI); q.fill(); }
      q.strokeStyle = DARK; q.lineWidth = Math.max(3, g * 0.018);
      q.beginPath(); q.arc(x + g * 0.24, y - g * 0.3, g * 0.13, 0, TWO_PI); q.fillStyle = 'rgba(160,230,255,.95)'; q.fill(); q.stroke();
      if (variant === 1) flakeG(q, x + g * 0.24, y - g * 0.3, g * 0.08); else starG(q, x + g * 0.24, y - g * 0.3, g * 0.07, '#ffe36a');
      q.beginPath(); q.ellipse(x, tipY, g * 0.18, g * 0.07, 0, 0, TWO_PI); q.fillStyle = '#ffd23f'; q.fill(); q.stroke();
      q.beginPath(); q.ellipse(x, tipY, g * 0.1, g * 0.04, 0, 0, TWO_PI); q.fillStyle = '#7a3b8f'; q.fill(); q.stroke();
      var gg = q.createRadialGradient(x, tipY - g * 0.02, 1, x, tipY - g * 0.02, g * 0.1);
      gg.addColorStop(0, 'rgba(255,255,255,1)'); gg.addColorStop(0.5, variant === 1 ? 'rgba(190,240,255,.9)' : 'rgba(120,230,255,.9)'); gg.addColorStop(1, 'rgba(120,230,255,0)');
      q.fillStyle = gg; q.beginPath(); q.arc(x, tipY - g * 0.02, g * 0.1, 0, TWO_PI); q.fill();
      e = gunSpr[key] = { c: c, w: w, h: h, ox: x, oy: y, tip: y - tipY };
      return e;
    }
    function flashSpr() {
      return softSpr('flash', function (g, c, R) {
        var mg = g.createRadialGradient(c, c, 1, c, c, R); mg.addColorStop(0, 'rgba(255,255,255,1)'); mg.addColorStop(0.4, 'rgba(255,240,140,.9)'); mg.addColorStop(1, 'rgba(255,160,60,0)');
        g.fillStyle = mg; g.beginPath(); g.arc(c, c, R, 0, TWO_PI); g.fill();
        g.beginPath();
        for (var si = 0; si < 12; si++) { var sa = -Math.PI / 2 + si * Math.PI / 6 + 0.2, sr = si & 1 ? R * 0.35 : R * 0.95; g.lineTo(c + Math.cos(sa) * sr, c + Math.sin(sa) * sr); }
        g.closePath(); g.fillStyle = 'rgba(255,255,255,.9)'; g.fill();
      }, 64);
    }
    function drawGun() {
      var g = clamp(Math.min(cw * 0.55, ch * 0.5), 120, 340), v = G.freezeW > 0 ? 1 : G.triple > 0 ? 2 : 0, e = gunFor(v, g);
      var moving = (keys.KeyW || keys.KeyS || keys.KeyA || keys.KeyD || keys.ArrowUp || keys.ArrowDown || jx || jy) ? 1 : 0;
      var bobx = Math.cos(gunBob * 0.5) * g * 0.02 * moving, boby = Math.abs(Math.sin(gunBob)) * g * 0.02 * moving, idle = Math.sin(G.playTime * 1.8) * g * 0.004;
      var x = cw * 0.5 + g * 0.05 + bobx, y = ch + g * 0.04 + recoil * g * 0.08 + boby + idle, tilt = recoil * 0.05;
      ctx.save(); ctx.translate(x, y); ctx.rotate(-tilt);
      ctx.drawImage(e.c, -e.ox, -e.oy, e.w, e.h);
      ctx.restore();
      var tx = x + Math.sin(tilt) * e.tip, ty = y - Math.cos(tilt) * e.tip;
      MZ.x = tx; MZ.y = ty;
      if (muzzle > 0) {   /* muzzle flash */
        var mu = muzzle / 0.14, mr = g * (0.14 + 0.16 * mu);
        drawSpr(flashSpr(), tx, ty - g * 0.05, mr, 1, 1);
      }
      /* smoke puffs from the muzzle */
      var sm = smokeSpr();
      for (var i = 0; i < smokes.length; i++) {
        var s = smokes[i]; if (s.t >= 0.7) continue;
        var u = s.t / 0.7; ctx.globalAlpha = (1 - u) * 0.6;
        drawSpr(sm, tx + s.dx * (1 + u * 2), ty - g * 0.06 - u * g * 0.28, g * (0.05 + u * 0.1), 1, 1);
      }
      ctx.globalAlpha = 1;
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
        ctx.strokeStyle = '#4fb8ff'; ctx.lineWidth = 2;
        for (var k = 0; k < 3; k++) { var q = clamp(u * 1.6 - k * 0.1, 0, 1), bx = mz.x + (ex - mz.x) * q, by = mz.y + (ey - mz.y) * q, br = (14 - k * 3) * (1 - q * 0.6); ctx.globalAlpha = (1 - u) * 0.8; ctx.beginPath(); ctx.arc(bx, by, Math.max(2, br), 0, TWO_PI); ctx.stroke(); }
        ctx.globalAlpha = 1;
      }
    }
    function vignette() {
      if (vigSpr) return vigSpr;
      var c = document.createElement('canvas'); c.width = 192; c.height = 108; var g = c.getContext('2d');
      var gr = g.createRadialGradient(96, 54, 20, 96, 54, 112); gr.addColorStop(0, 'rgba(255,30,60,0)'); gr.addColorStop(0.55, 'rgba(255,30,60,.12)'); gr.addColorStop(1, 'rgba(230,0,40,.85)');
      g.fillStyle = gr; g.fillRect(0, 0, 192, 108);
      return (vigSpr = c);
    }

    /* ---------- HUD (every text is a cached label; HUD canvas pixels are dpr-crisp) ---------- */
    var HL = { round: mkHL(0, '#fff'), score: mkHL(0, '#ffe36a'), wave: mkHL(0, '#fff'), best: mkHL(0, '#ffd9a0'), frz: mkHL(0, '#bfefff'), cap: mkHL(0, '#fff'), combo: mkHL(0, '#ff9ad0'),
      hint: mkHL(0, '#fff'), chip0: mkHL(3, DARK), chip1: mkHL(3, DARK), chip2: mkHL(3, DARK), bossHp: mkHL(0, '#fff'), bossTag: mkHL(0, '#ff8aa8'), comboBig: mkHL(0, '#ffe36a') };
    var SLOT = [], PROMPT = { c: null, w: 0, h: 0 }, CHIPS = [HL.chip0, HL.chip1, HL.chip2], chipK = [0, 0, 0];
    for (var si0 = 0; si0 < 8; si0++) SLOT.push([mkHL(1, '#fff'), mkHL(1, '#cfc6e6')]);
    function genPrompt(emo, txt, fkind, u) {
      var fs = 26 * u, es = 30 * u, ph = 46 * u;
      measC.font = '800 ' + fs + 'px ' + (fkind ? EFONT : FONT); var zw = measC.measureText(txt).width;
      measC.font = es + 'px ' + EMOJI; var ew = emo ? measC.measureText(emo).width + 8 * u : 0;
      var pw = Math.min(cw - 16, zw + ew + 36 * u), c = mkCv(pw + 8, ph + 8), g = c.getContext('2d'), px0 = 4, py = 4;
      g.beginPath(); if (g.roundRect) g.roundRect(px0, py, pw, ph, ph / 2); else g.rect(px0, py, pw, ph);
      g.fillStyle = 'rgba(255,255,255,.94)'; g.fill(); g.lineWidth = 3.5; g.strokeStyle = '#ff5fa2'; g.stroke();
      var sx0 = px0 + pw / 2 - (zw + ew) / 2;
      g.textBaseline = 'middle'; g.textAlign = 'left';
      if (emo) { g.font = es + 'px ' + EMOJI; g.fillStyle = '#000'; g.fillText(emo, sx0, py + ph / 2 + 2 * u); }
      g.font = '800 ' + fs + 'px ' + (fkind ? EFONT : FONT); g.fillStyle = DARK; g.fillText(txt, sx0 + ew, py + ph / 2 + 1);
      PROMPT.c = c; PROMPT.w = pw + 8; PROMPT.h = ph + 8;
    }
    function chip(i, x, y, u, type, secs, frac) {
      var w = 78 * u, h = 24 * u, hl = CHIPS[i];
      ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(x, y, w, h, h / 2); else ctx.rect(x, y, w, h);
      ctx.fillStyle = frac < 0.2 && ((G.playTime * 6) | 0) % 2 ? 'rgba(255,200,200,.95)' : 'rgba(255,255,255,.9)'; ctx.fill(); ctx.lineWidth = 2.5; ctx.strokeStyle = DARK; ctx.stroke();
      var ic = iconSpr(type, Math.round(9 * u)); drawSpr(ic, x + 13 * u, y + h / 2, ic.R, 1, 1);
      var nm = type === 'freeze' ? '冰凍 ' : type === 'triple' ? '散射 ' : '慢動作 ';
      var key = secs * 8 + (type === 'freeze' ? 1 : type === 'triple' ? 2 : 3);
      if (chipK[i] !== key) { chipK[i] = key; hlSet(hl, nm + secs + 's', 13 * u); }
      hlDraw(hl, x + 26 * u, y + h / 2 + 1, 1);
      ctx.fillStyle = '#7be37b'; if (frac < 0.3) ctx.fillStyle = '#ffb347';
      ctx.fillRect(x + 26 * u, y + h - 5 * u, 46 * u * clamp(frac, 0, 1), 3 * u);
    }
    function drawHud() {
      if (!G.hearts && state === 'intro') return;
      var u = hudU, i, cwh = cw / 2;
      /* crosshair */
      if (state === 'play') {
        var cx = cwh, cy = ch / 2, hm = hitM > 0 ? 1 + hitM * 2 : 1;
        ctx.lineWidth = 3; ctx.strokeStyle = DARK; ctx.beginPath(); ctx.arc(cx, cy, 13 * u * hm, 0, TWO_PI); ctx.stroke();
        ctx.lineWidth = 1.8; ctx.strokeStyle = hitM > 0 ? '#ffe36a' : '#fff'; ctx.stroke();
        ctx.fillStyle = '#ffe36a'; ctx.beginPath(); ctx.arc(cx, cy, 2.5 * u, 0, TWO_PI); ctx.fill();
      }
      if (state === 'intro') return;
      /* hearts */
      var hs = Math.round(12 * u);
      for (i = 0; i < 3; i++) { var he = heartSpr(i < G.hearts, hs); drawSpr(he, 27 * u + i * 30 * u, 26 * u, he.R, 1, 1); }
      /* active weapon / power-up chips with timers */
      var ix = 14 * u, iy = 43 * u, ci = 0;
      if (G.freezeW > 0) { chip(ci++, ix, iy, u, 'freeze', Math.ceil(G.freezeW), G.freezeW / 12); ix += 82 * u; }
      if (G.triple > 0) { chip(ci++, ix, iy, u, 'triple', Math.ceil(G.triple), G.triple / 12); ix += 82 * u; }
      if (G.slow > 0) { chip(ci++, ix, iy, u, 'slow', Math.ceil(G.slow), G.slow / 7); ix += 82 * u; }
      if (G.shield) { var sh = iconSpr('shield', Math.round(12 * u)); drawSpr(sh, 14 * u + 3 * 30 * u + 22 * u, 26 * u, sh.R, 1, 1); }
      if (G.freezeT > 0) {
        var fk = Math.round(G.freezeT * 10); if (hudK.frz !== fk) { hudK.frz = fk; hlSet(HL.frz, '怪物冰凍中 ' + (fk / 10).toFixed(1), 17 * u); }
        hlDraw(HL.frz, cwh, ch - 24 * u, 0);
      }
      /* round + wave + score (right aligned left of the pause button) */
      var rx = cw - 70, k;
      if (G.boss) { hlSet(HL.bossTag, 'BOSS!', 16 * u); hlDraw(HL.bossTag, rx, 18 * u, 2); }
      else {
        k = Math.min(G.round, totalRounds) * 1000 + totalRounds;
        if (hudK.round !== k) { hudK.round = k; hlSet(HL.round, '第 ' + Math.min(G.round, totalRounds) + '/' + totalRounds + ' 題', 16 * u); }
        hlDraw(HL.round, rx, 18 * u, 2);
      }
      if (hudK.score !== G.score) { hudK.score = G.score; hlSet(HL.score, G.score + ' 分', 17 * u); }
      hlDraw(HL.score, rx, 38 * u, 2);
      k = (G.boss ? 100 : G.wave) + 1;
      if (hudK.wave !== k) { hudK.wave = k; hlSet(HL.wave, G.boss ? ARENAS[arenaIdx].name : '第' + (G.wave + 1) + '波 ' + ARENAS[arenaIdx].name, 12 * u); }
      hlDraw(HL.wave, rx, 56 * u, 2);
      k = Math.max(G.best || 0, G.score);
      if (hudK.best !== k) { hudK.best = k; hlSet(HL.best, '最高 ' + k, 12 * u); }
      hlDraw(HL.best, rx, 72 * u, 2);
      /* prompt */
      if (cur) {
        var py = (cw < 520 ? 86 : 66) * u, by, B = G.boss, listen = G.qtype === 'listen' && canHear() && G.qT < 7, qi = G.qtype === 'listen' ? 1 : G.qtype === 'pic' ? 2 : 0;
        var sig = ((B ? 3 : qi) * 64 + cur.i + 1) * 4 + (listen && !B ? 1 : 0);
        if (promptSig !== sig) {
          promptSig = sig;
          if (B) genPrompt(cur.emoji || '', cur.zh || cur.en, 0, u);
          else if (listen) genPrompt('🔊', '聽一聽!', 0, u);
          else if (G.qtype === 'pic') genPrompt('🎯', cur.en, 1, u);
          else genPrompt(cur.emoji || '', cur.zh || cur.en, 0, u);
        }
        ctx.drawImage(PROMPT.c, cwh - PROMPT.w / 2, py - 4, PROMPT.w, PROMPT.h);
        by = py + 46 * u + 8 * u;
        if (B) {
          var bw = Math.min(cw * 0.6, 300 * u), bx = cwh - bw / 2, bf = B.hp / B.max;
          ctx.fillStyle = 'rgba(43,29,74,.7)'; ctx.fillRect(bx - 3, by - 3, bw + 6, 16 * u + 6);
          ctx.fillStyle = bf > 0.4 ? '#ff6a8a' : '#ffb347'; ctx.fillRect(bx, by, bw * bf, 16 * u);
          ctx.strokeStyle = 'rgba(43,29,74,.8)'; ctx.lineWidth = 2; ctx.beginPath();
          for (i = 1; i < B.max; i++) { ctx.moveTo(bx + bw * i / B.max, by); ctx.lineTo(bx + bw * i / B.max, by + 16 * u); }
          ctx.stroke();
          k = B.hp * 100 + B.max; if (hudK.bhp !== k) { hudK.bhp = k; hlSet(HL.bossHp, '字母怪獸 ' + B.hp + '/' + B.max, 12 * u); }
          hlDraw(HL.bossHp, cwh, by + 8 * u, 0);
          by += 26 * u;
          var n = B.letters.length, bs = Math.min(34 * u, (cw - 24) / n - 6 * u), gap = 6 * u, rw = n * bs + (n - 1) * gap, lx = cwh - rw / 2;
          for (i = 0; i < n; i++) {
            var done = i < B.idx, isCur = i === B.idx, bxx = lx + i * (bs + gap), pulse = isCur ? 1 + Math.sin(G.playTime * 8) * 0.06 : 1;
            ctx.beginPath(); if (ctx.roundRect) ctx.roundRect(bxx, by, bs, bs * 1.15 * pulse, 7 * u); else ctx.rect(bxx, by, bs, bs * 1.15);
            ctx.fillStyle = done ? '#7be37b' : isCur ? '#ffe36a' : 'rgba(255,255,255,.8)'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = DARK; ctx.stroke();
            var ch1 = done ? B.letters[i] : isCur && B.reveal ? B.letters[i] : isCur ? '?' : '_', sl = SLOT[i][done || isCur ? 0 : 1];
            hlSet(sl, ch1, bs * 0.7); hlDraw(sl, bxx + bs / 2, by + bs * 0.6, 0);
          }
          by += bs * 1.15 + 6 * u;
        } else {
          k = (G.qtype === 'listen' ? 1 : G.qtype === 'pic' ? 2 : 0) + 1;
          if (hudK.cap !== k) { hudK.cap = k; hlSet(HL.cap, G.qtype === 'listen' ? '聽發音,射出英文字' : G.qtype === 'pic' ? '射出相配的圖' : '射出英文字', 13 * u); }
          hlDraw(HL.cap, cwh, by + 6 * u, 0); by += 18 * u;
          if (G.roundMax) {
            var tw = Math.min(cw * 0.55, 260 * u), tbx = cwh - tw / 2, fr = G.roundT / G.roundMax;
            ctx.fillStyle = 'rgba(43,29,74,.55)'; ctx.fillRect(tbx - 2, by - 2, tw + 4, 10 * u + 4);
            ctx.fillStyle = fr > 0.3 ? '#7be37b' : '#ffb347'; ctx.fillRect(tbx, by, tw * fr, 10 * u);
            by += 18 * u;
          }
        }
        if (G.combo >= 2) {
          var mu = multOf(G.combo);
          k = G.combo * 10 + mu; if (hudK.combo !== k) { hudK.combo = k; HL.combo.fill = mu > 2 ? '#ff5fa2' : mu > 1 ? '#ffb347' : '#ff9ad0'; HL.combo.t = null; hlSet(HL.combo, '連擊 x' + G.combo + (mu > 1 ? '   分數 ×' + mu : ''), (18 + (mu - 1) * 3) * u); }
          hlDraw(HL.combo, cwh, by + 10 * u, 0);
        }
      }
      if (state === 'play') {
        /* offscreen arrow to the correct target, incoming orb warning */
        for (i = 0; i < targets.length; i++) {
          var t = targets[i]; if (!t.correct) continue;
          var rel = normAng(targetAngle(t) - P.a);
          if (Math.abs(rel) > Math.atan(PL) * 0.95) {
            var dirR = rel > 0, ax = dirR ? cw - 30 * u : 30 * u, ay = ch * 0.5;
            ctx.beginPath(); ctx.moveTo(ax + (dirR ? 18 : -18) * u, ay); ctx.lineTo(ax - (dirR ? 12 : -12) * u, ay - 20 * u); ctx.lineTo(ax - (dirR ? 12 : -12) * u, ay + 20 * u); ctx.closePath();
            ctx.fillStyle = '#ffe36a'; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = DARK; ctx.stroke();
          }
        }
        for (i = 0; i < projs.length; i++) {
          var pj = projs[i], pa = normAng(Math.atan2(pj.y - P.y, pj.x - P.x) - P.a), pd = Math.hypot(pj.x - P.x, pj.y - P.y);
          if (pd < 4 && Math.abs(pa) > Math.atan(PL) * 0.95) drawLbl(bang(1), pa > 0 ? cw - 18 * u : 18 * u, ch * 0.62, 30 * u, 0);
        }
      }
      /* hint + floaters */
      if (hint) {
        if (!hint.e) hint.e = label(hint.text, 0, Math.min(30 * u, cw / (hint.text.length * 0.75 + 2)), '#fff');
        drawLbl(hint.e, cwh, ch * 0.3, hint.e.fs, 0);
      }
      for (i = 0; i < floaters.length; i++) {
        var f = floaters[i]; if (f.t >= 1.2) continue;
        var fsz = f.size * Math.min(1.4, u), fy = f.y - f.t * 50;
        ctx.globalAlpha = clamp(1.4 - f.t, 0, 1);
        drawLbl(f.e, f.x, fy, fsz, 0);
        if (f.coin) { var cs = coinSpr(); drawSpr(cs, f.x - f.e.w * fsz / f.e.fs / 2 - fsz * 0.5, fy, fsz * 0.55, 1, 1); }
        ctx.globalAlpha = 1;
      }
      /* combo x2 / x3 flash banner */
      if (comboT > 0 && comboM > 1) {
        var cs2 = comboM > 2 ? 'x3 暴擊連擊!' : 'x2 連擊!';
        if (hudK.cb !== comboM) { hudK.cb = comboM; HL.comboBig.fill = comboM > 2 ? '#ff5fa2' : '#ffe36a'; HL.comboBig.t = null; hlSet(HL.comboBig, cs2, 44 * u); }
        var cu = 1.1 - comboT, pop = cu < 0.25 ? easeBack(cu / 0.25) : 1;
        ctx.globalAlpha = clamp(comboT * 3, 0, 1);
        var ce = HL.comboBig.e; if (ce) { var kk = HL.comboBig.size / ce.fs * pop; ctx.drawImage(ce.c, cwh - ce.w * kk / 2, ch * 0.5 - ce.h * kk / 2 - ch * 0.12, ce.w * kk, ce.h * kk); }
        ctx.globalAlpha = 1;
      }
      /* wave / boss title banner */
      if (G.banner) {
        var bn = G.banner, al = clamp(Math.min(bn.t * 3, (bn.max - bn.t) * 5), 0, 1), sc = bn.max - bn.t < 0.3 ? easeBack((bn.max - bn.t) / 0.3) : 1, by0 = ch * 0.34;
        if (!bn.e1) { bn.e1 = label(bn.text, 0, Math.min(40 * u, cw / (bn.text.length * 0.7 + 1)), bn.boss ? '#ffe36a' : '#7fe3ff'); bn.e2 = label(bn.sub, 0, Math.min(19 * u, cw / (bn.sub.length * 0.8 + 2)), '#fff'); }
        ctx.globalAlpha = al; ctx.fillStyle = bn.boss ? 'rgba(160,20,50,.75)' : 'rgba(43,29,74,.68)'; ctx.fillRect(0, by0 - 40 * u, cw, 82 * u);
        drawLbl(bn.e1, cwh, by0 - 10 * u, bn.e1.fs * sc, 0);
        drawLbl(bn.e2, cwh, by0 + 26 * u, bn.e2.fs, 0);
        ctx.globalAlpha = 1;
      }
    }

    /* ---------- frame ---------- */
    function render() {
      FRAME++;
      renderWorld();
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.imageSmoothingEnabled = true;
      var sx = 0, sy = 0, m = 0, i, it, drift = reduceMotion ? 0 : G.playTime * 7;
      if (shake > 0 && !reduceMotion) { sx = (Math.random() - 0.5) * 18 * shake / 0.45; sy = (Math.random() - 0.5) * 12 * shake / 0.45; m = 10; }
      drawSky(drift);
      ctx.save(); ctx.translate(sx, sy);
      ctx.drawImage(rc, 0, 0, RW, RH, -m, -m, cw + 2 * m, ch + 2 * m);
      /* sprites, far to near */
      sn = 0;
      for (i = 0; i < targets.length; i++) if (targets[i].age >= 0) addSpr(0, targets[i], targets[i].x, targets[i].y, 0.52, 0.5);
      for (i = 0; i < bugs.length; i++) addSpr(1, bugs[i], bugs[i].x, bugs[i].y, 0.3, 0.5);
      for (i = 0; i < spits.length; i++) addSpr(4, spits[i], spits[i].x, spits[i].y, 0.4, 0.55);
      for (i = 0; i < projs.length; i++) addSpr(5, projs[i], projs[i].x, projs[i].y, 0.45, 0.25);
      for (i = 0; i < pickups.length; i++) addSpr(2, pickups[i], pickups[i].x, pickups[i].y, 0.55, 0.4);
      if (G.boss && !G.boss.dead) addSpr(6, G.boss, G.boss.x, G.boss.y, 1.0, 1.2);
      for (i = 0; i < PCAP; i++) { var pp = PP[i]; if (pp.life > 0) addSpr(3, pp, pp.x, pp.y, 0.1 + pp.z, 0); }
      for (i = 1; i < sn; i++) {   /* insertion sort, far first (list is nearly sorted frame to frame) */
        var cur0 = SL[i], j = i - 1;
        while (j >= 0 && SL[j].d < cur0.d) { SL[j + 1] = SL[j]; j--; }
        SL[j + 1] = cur0;
      }
      for (i = 0; i < sn; i++) {
        it = SL[i];
        if (it.k === 3) {   /* particles: single-column occlusion test */
          if (zb[clamp((it.pr.x / S) | 0, 0, RW - 1)] < it.d) continue;
          drawParticle(it, it.pr.x, it.pr.y, it.pr.size);
          continue;
        }
        var vs = visState(it.d, (it.pr.x - it.hw) / S, (it.pr.x + it.hw) / S);
        if (vs === 0) continue;
        if (vs === 2) { ctx.save(); clipRuns(it.d, (it.pr.x - it.hw) / S, (it.pr.x + it.hw) / S); }
        if (it.k === 0) drawBubble(it.o, it.pr);
        else if (it.k === 1) drawBug(it.o, it.pr);
        else if (it.k === 2) drawPickup(it.o, it.pr);
        else if (it.k === 4) drawSpit(it.o, it.pr);
        else if (it.k === 5) drawProj(it.o, it.pr);
        else drawBoss(it.o, it.pr);
        if (vs === 2) ctx.restore();
      }
      var mz = MZ; mz.x = cw / 2; mz.y = ch * 0.8;
      if (state === 'play' || state === 'paused' || state === 'over') { mz = drawGun(); drawTrails(mz); }
      ctx.restore();
      /* muzzle flash lights the scene */
      if (muzzle > 0 && !reduceMotion) {
        ctx.globalCompositeOperation = 'lighter'; ctx.globalAlpha = muzzle / 0.14 * 0.45;
        drawSpr(lightSpr(), mz.x, mz.y, Math.max(cw, ch) * 0.55, 1, 1);
        ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      }
      if (flash > 0) { ctx.globalAlpha = Math.min(0.8, flash * 0.8); ctx.fillStyle = FLASH_COL[flashCi]; ctx.fillRect(0, 0, cw, ch); ctx.globalAlpha = 1; }
      if (G.freezeT > 0 && state === 'play') { ctx.globalAlpha = 0.12 + 0.05 * Math.sin(G.playTime * 6); ctx.fillStyle = '#96dcff'; ctx.fillRect(0, 0, cw, ch); ctx.globalAlpha = 1; }
      /* damage vignette (static when reduced motion), low-health warning */
      var va = dmgV > 0 ? Math.min(1, dmgV / 0.7) * 0.9 : 0;
      if (state === 'play' && G.hearts === 1) va = Math.max(va, reduceMotion ? 0.18 : 0.14 + 0.08 * Math.sin(G.playTime * 4));
      if (va > 0) { ctx.globalAlpha = va; ctx.drawImage(vignette(), 0, 0, cw, ch); ctx.globalAlpha = 1; }
      drawHud();
    }
    function frame(now) {
      if (dead) return;
      rafId = requestAnimationFrame(frame);
      var raw = lastT ? (now - lastT) / 1000 : 1 / 60; lastT = now;
      if (!(raw > 0)) raw = 1 / 60;
      if (raw > 0.3) { raw = 1 / 60; dtS = 1 / 60; }   /* tab was in the background: drop the backlog */
      var dt = Math.min(0.05, raw);
      dtS += (dt - dtS) * 0.2;
      var t0 = performance.now(), steps = dt > 0.025 ? 2 : 1, hstep = dt / steps, cam = Math.min(0.05, dtS) / steps;
      try {
        for (var s = 0; s < steps; s++) update(hstep, cam);
        render();
      } catch (e) { console.error(e); }
      var cost = performance.now() - t0;
      FT[FTI] = cost; IVL[FTI] = raw * 1000; FTI = (FTI + 1) % 120; FTN++;
      costEma = FTN < 3 ? cost : costEma + (Math.min(cost, 25) - costEma) * 0.08;
      avgMs = avgMs * 0.95 + cost * 0.05;
      adaptScale(now);
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
      if (genT) { clearTimeout(genT); genT = 0; } GENQ.length = 0;
      for (var i = 0; i < timers.length; i++) { clearTimeout(timers[i]); clearInterval(timers[i]); }
      timers.length = 0;
      try { if (document.pointerLockElement) document.exitPointerLock(); } catch (e) { /* */ }
      try { if (canHear()) window.speechSynthesis.cancel(); } catch (e) { /* */ }
      try { if (A) { var a = A; A = null; ctxCount--; var pr = a.close(); if (pr && pr.catch) pr.catch(function () {}); } } catch (e) { /* */ }
      if (root.parentNode) root.parentNode.removeChild(root);
      if (styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
      img = buf = zb = null; rc.width = rc.height = 1; LBL = {}; BODY.length = 0; SOFT = {};
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
        case 'pickup': p = ahead(2); pickups.push({ x: p.x, y: p.y, type: a || 'freeze', ph: 0, life: 20 }); return true;
        case 'place': P.x = a; P.y = b; return true;
        case 'score': G.score = a | 0; return true;
        case 'learnskip': lcDone(true); return true;
        case 'shield': G.shield = !!a; return true;
        case 'turn': P.a += a; return true;
        case 'scale': scaleIdx = clamp(a | 0, 0, SCALES.length - 1); scaleT = performance.now() + 1e6; applyScale(SCALES[scaleIdx]); return true;
      }
      return false;
    }
    var inst = {
      destroy: destroy, pause: pause, resume: resume, stats: stats,
      _state: function () {
        var B = G.boss, i, en = [];
        for (i = 0; i < bugs.length; i++) en.push({ k: 'bug', x: bugs[i].x, y: bugs[i].y });
        for (i = 0; i < spits.length; i++) en.push({ k: 'spit', x: spits[i].x, y: spits[i].y });
        for (i = 0; i < projs.length; i++) en.push({ k: 'proj', x: projs[i].x, y: projs[i].y });
        var pl = 0; for (i = 0; i < PCAP; i++) if (PP[i].life > 0) pl++;
        return {
          round: G.round, hearts: G.hearts, score: G.score, correctWord: B ? B.letters[B.idx] : cur ? cur.en : null, state: state, combo: G.combo, correct: G.correct, wrong: G.wrong, shield: G.shield,
          player: { x: P.x, y: P.y, a: P.a }, bugs: bugs.length, spitters: spits.length, projectiles: projs.length, enemies: en, result: lastResult, resultShown: resultShown, avgRenderMs: avgMs, touch: touchMode,
          arena: arenaIdx, arenaName: ARENAS[arenaIdx].name, wave: G.wave + 1, qtype: G.qtype, totalRounds: totalRounds, freezeT: G.freezeT, freezeW: G.freezeW, triple: G.triple,
          mult: multOf(G.combo), best: G.best, shake: shake, flash: flash, reduceMotion: reduceMotion, bannerText: G.banner ? G.banner.text : null, sayVisible: sayShown, pickups: pickups.length, particles: pl,
          ducked: ducked, tier: tier, difficulty: tier, mode: mode, distractors: DIFF.nDist[di], hinting: hinting, muted: muted, scale: scale, RW: RW, RH: RH, voices: voices, audio: A ? A.state : null,
          learn: lc ? { ok: lc.ok, word: lc.w.en, zh: lc.w.zh, t: lc.t, min: lc.min, max: lc.max, ready: lc.t >= lc.min } : null, missInRound: G.missInRound, requeued: G.requeued, perWord: perWord(), timer: G.roundMax,
          boss: B ? { hp: B.hp, max: B.max, idx: B.idx, word: B.letters.join(''), dead: B.dead, zh: B.w.zh } : null,
          targets: targets.map(function (t) { var h = rayHit(targetAngle(t)); return { word: t.w.en, angle: normAng(targetAngle(t) - P.a), dist: Math.hypot(t.x - P.x, t.y - P.y), clear: !!(h && h.o === t), emoji: t.w.emoji || '', correct: t.correct }; })
        };
      },
      _fire: function (off) { fire(off || 0); },
      _turnTo: function (i) { var t = targets[i]; if (t) P.a = targetAngle(t); },
      _cmd: cmd
    };
    current = inst;
    /* arena 0 is baked up front (bases + every light level); the other arenas are baked in small idle slices, so no frame builds a table */
    (function () {
      var T0 = texOf(0), t; for (t = 1; t <= 5; t++) ensureWall(T0, t); ensureFC(T0);
      while (bakeLevelStep(T0)) { /* all 192 tables */ }
      var jobs = [], ai;
      for (ai = 1; ai < ARENAS.length; ai++) (function (a) {
        var T = texOf(a), q;
        for (q = 1; q <= 5; q++) (function (qq) { jobs.push(function () { bakeWall(T, qq, 64); }); })(q);
        jobs.push(function () { bakeFC(T, 64); });
        for (q = 0; q < 12; q++) jobs.push(function () { for (var z = 0; z < 16; z++) bakeLevelStep(T); });
      })(ai);
      var step = function () { if (dead) return; var j = jobs.shift(); if (j) { j(); timers.push(setTimeout(step, 30)); } };
      timers.push(setTimeout(step, 300));
    })();
    resetGame(); showIntro(); syncMuteUi();
    (function () {   /* JIT / branch warm-up: a few full renders around the circle before the first visible frame */
      var a0 = P.a, k;
      for (k = 0; k < 10; k++) { P.a = a0 + k * 0.63; render(); }
      P.a = a0; FRAME = 0;
    })();
    if (soundOn) timers.push(setInterval(musTick, 90));
    lastT = 0; rafId = requestAnimationFrame(frame);
    return inst;
  }

  var API = { start: start };
  Object.defineProperty(API, '_debug', { get: function () { return current ? current._state() : null; } });
  API._debugFire = function (off) { if (current) current._fire(off || 0); };
  API._debugTurnTo = function (i) { if (current) current._turnTo(i); };
  API._cmd = function (name, a, b) { return current ? current._cmd(name, a, b) : null; };
  API.stats = function () { return current ? current.stats() : null; };
  API._audioContexts = function () { return ctxCount; };
  globalThis.WQ37FPS = API;
})();
