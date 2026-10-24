/* WQ37GX - shared core of the three R3.21 learning games (字母砲台 td_game, 字母迷宮 maze_game, 字卡征途 card_game).
   Self-contained, no network, no external files except optional images from opts.assetBase (missing images degrade to drawn shapes).
   Parts:  GX.audio(on)            WebAudio synth: sfx(name, o) + music(theme)
           GX.fx(opts)             particles, rings, floaters, shake, flash (reduced-motion aware)
           GX.pad(root, o)         on-screen letter / digit / fraction keypad (touch) - physical keyboard via S.keys()
           GX.Learn(o)             item queue, requeue of misses, per-item stats, star rating, report (pure logic, node-testable)
           GX.ui(root, S)          preview deck, learn card, result card, pause menu, how-to card, banner
           GX.shell(box, opts, c)  root + canvas + DPR fit + loop + tracked timers/listeners + destroy; the one thing a game builds on
           GX.label / GX.img       cached canvas text labels / cached images
   Every game gets the same learning rules from here: first-try stars, 2 s wrong-answer card, requeue 2-4 items later (max 2x). */
(function () {
  'use strict';
  var FONT = '"PingFang HK","Noto Sans HK","Microsoft JhengHei","WenQuanYi Zen Hei","Noto Sans CJK TC",system-ui,sans-serif';
  var EFONT = '"Arial Rounded MT Bold","Trebuchet MS","Noto Sans",Arial,sans-serif';
  var EMOJI = '"Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif';
  var GOLD = '#ffc94a', GOLD_D = '#c48a00', GOLD_INK = '#3b2600', INK = '#0b1030', CARD = '#141a46', CARD2 = '#1b2160', TEXT = '#f4f6ff', MUTED = '#c3cbf7',
      GOOD = '#3ee6a0', BAD = '#ff6b81', AURORA = '#3ee6d0';
  var HOLD_WRONG_MS = 2000, HOLD_OK_MS = 900;

  var GX = { FONT: FONT, EFONT: EFONT, EMOJI: EMOJI, C: { gold: GOLD, goldD: GOLD_D, ink: INK, card: CARD, card2: CARD2, text: TEXT, muted: MUTED, good: GOOD, bad: BAD, aurora: AURORA } };

  /* ------------------------------------------------------------------ small utils */
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function rngOf(seed) { var a = (seed >>> 0) || 1; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function hash(str) { var h = 2166136261; str = String(str); for (var i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
  function shuffle(arr, rng) { var a = arr.slice(), i, j, t; rng = rng || Math.random; for (i = a.length - 1; i > 0; i--) { j = Math.floor(rng() * (i + 1)); t = a[i]; a[i] = a[j]; a[j] = t; } return a; }
  function pick(arr, rng) { return arr[Math.floor((rng || Math.random)() * arr.length)]; }
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function reduced() { try { return !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { return false; } }
  var ease = {
    out: function (t) { return 1 - Math.pow(1 - t, 3); }, inOut: function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; },
    back: function (t) { var c = 1.70158; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); }, bounce: function (t) { var n = 7.5625, d = 2.75; if (t < 1 / d) return n * t * t; if (t < 2 / d) return n * (t -= 1.5 / d) * t + .75; if (t < 2.5 / d) return n * (t -= 2.25 / d) * t + .9375; return n * (t -= 2.625 / d) * t + .984375; }
  };
  function rrect(c, x, y, w, h, r) { r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  Object.assign(GX, { clamp: clamp, lerp: lerp, rng: rngOf, hash: hash, shuffle: shuffle, pick: pick, esc: esc, reduced: reduced, ease: ease, rrect: rrect });

  /* ------------------------------------------------------------------ icons (24 grid, 2px, round caps; same family as the app shell) */
  var ICO_P = {
    pause: '<rect x="6" y="5" width="4" height="14" rx="1.5" fill="currentColor"/><rect x="14" y="5" width="4" height="14" rx="1.5" fill="currentColor"/>',
    play: '<path d="M8 5.5v13l11-6.5z" fill="currentColor"/>',
    speaker: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor"/><path d="M15.5 9.2a4 4 0 0 1 0 5.6M18.2 6.6a8 8 0 0 1 0 10.8" fill="none"/>',
    mute: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor"/><path d="M16 9.5l5 5M21 9.5l-5 5" fill="none"/>',
    star: '<path d="M12 3.2l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z" fill="currentColor"/>',
    heart: '<path d="M12 20s-7.5-4.5-7.5-10.2A4.2 4.2 0 0 1 12 7.4a4.2 4.2 0 0 1 7.5 2.4C19.5 15.5 12 20 12 20z" fill="currentColor"/>',
    flame: '<path d="M12 3c.8 4 5 5.3 5 10.2a5 5 0 0 1-10 0c0-2 1-3.4 2.2-4.4 0 2 .8 3 1.8 3 .4-3-.6-5.4 1-8.8z" fill="currentColor"/>',
    bolt: '<path d="M13 2.5L5 13.5h6l-1 8 8-11h-6z" fill="currentColor"/>',
    coin: '<circle cx="12" cy="12" r="9" fill="currentColor" stroke="none"/><path d="M12 7.5v9M9.5 10c0-1 1-1.6 2.5-1.6s2.5.6 2.5 1.6-1 1.5-2.5 1.9c-1.5.4-2.5.9-2.5 1.9s1 1.6 2.5 1.6 2.5-.6 2.5-1.6" stroke="#3B2600" stroke-width="1.6" fill="none"/>',
    check: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', cross: '<path d="M6 6l12 12M18 6L6 18"/>',
    replay: '<path d="M4 12a8 8 0 1 0 2.6-5.9M4 4v4.5h4.5"/>', home: '<path d="M3.5 11L12 4l8.5 7M6 9.5V20h12V9.5"/>', next: '<path d="M5 5.5v13l8-6.5zM14 5.5v13l8-6.5z" fill="currentColor"/>',
    shield: '<path d="M12 3l7 2.5v6c0 4.5-3 8-7 9.5-4-1.5-7-5-7-9.5v-6z" fill="currentColor"/>',
    sword: '<path d="M14.5 4.5L20 4l-.5 5.5L9 20l-5-5zM8 12l4 4M4 20l3-3"/>',
    sparkle: '<path d="M12 3l1.8 6.2L20 11l-6.2 1.8L12 19l-1.8-6.2L4 11l6.2-1.8z" fill="currentColor"/>',
    back: '<path d="M10 7l-5 5 5 5M5 12h14"/>', book: '<path d="M4 5h6a2 2 0 0 1 2 2v12a2 2 0 0 0-2-2H4zM20 5h-6a2 2 0 0 0-2 2v12a2 2 0 0 1 2-2h6z"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>', hand: '<path d="M8 12V6.5a1.5 1.5 0 0 1 3 0V11m0-1.5a1.5 1.5 0 0 1 3 0V12m0-1.5a1.5 1.5 0 0 1 3 0V15c0 3-2 5-5 5-2.5 0-4-1.2-5.2-3.2L4 13.5a1.4 1.4 0 0 1 2.4-1.4z"/>',
    key: '<rect x="3" y="6" width="18" height="12" rx="2.5"/><path d="M7 10h.01M11 10h.01M15 10h.01M8 14h8"/>', arrows: '<path d="M12 4v16M4 12h16M9 7l3-3 3 3M9 17l3 3 3-3M7 9l-3 3 3 3M17 9l3 3-3 3"/>'
  };
  function ico(n, size) { return '<svg viewBox="0 0 24 24" width="' + (size || 24) + '" height="' + (size || 24) + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICO_P[n] || '') + '</svg>'; }
  GX.ico = ico;

  /* ------------------------------------------------------------------ cached labels and images (rasterise once, blit per frame) */
  var LBL = new Map();
  GX.label = function (text, o) {
    o = o || {}; var size = o.size || 20, weight = o.weight || 800, fam = o.fam || FONT, dpr = o.dpr || 1, col = o.color || '#fff', sk = o.stroke || '', sw = o.strokeW || 0;
    var key = [text, size, weight, fam, dpr, col, sk, sw].join('|'), hit = LBL.get(key);
    if (hit) return hit;
    var m = document.createElement('canvas').getContext('2d'); m.font = weight + ' ' + size + 'px ' + fam;
    var w = Math.ceil(m.measureText(text).width) + sw * 2 + 4, h = Math.ceil(size * 1.4) + sw * 2;
    var c = document.createElement('canvas'); c.width = Math.max(1, Math.ceil(w * dpr)); c.height = Math.max(1, Math.ceil(h * dpr));
    var x = c.getContext('2d'); x.scale(dpr, dpr); x.font = weight + ' ' + size + 'px ' + fam; x.textAlign = 'center'; x.textBaseline = 'middle';
    if (sw) { x.lineJoin = 'round'; x.lineWidth = sw * 2; x.strokeStyle = sk; x.strokeText(text, w / 2, h / 2 + 1); }
    x.fillStyle = col; x.fillText(text, w / 2, h / 2 + 1);
    var r = { c: c, w: w, h: h }; if (LBL.size > 500) LBL.clear(); LBL.set(key, r); return r;
  };
  GX.drawLabel = function (ctx, lb, x, y, a) { if (a != null) ctx.globalAlpha = a; ctx.drawImage(lb.c, x - lb.w / 2, y - lb.h / 2, lb.w, lb.h); if (a != null) ctx.globalAlpha = 1; };
  var IMG = {};
  GX.img = function (src) {
    if (!src) return { ok: false, el: null };
    var r = IMG[src]; if (r) return r;
    var el = new Image(); r = IMG[src] = { ok: false, el: el, bad: false }; el.onload = function () { r.ok = true; }; el.onerror = function () { r.bad = true; };
    el.decoding = 'async'; el.src = src; return r;
  };
  GX.drawImg = function (ctx, src, x, y, w, h, o) {
    var r = GX.img(src); if (!r.ok) return false; o = o || {};
    ctx.save(); ctx.translate(x, y); if (o.rot) ctx.rotate(o.rot); if (o.flip) ctx.scale(-1, 1); if (o.alpha != null) ctx.globalAlpha = o.alpha;
    ctx.drawImage(r.el, -w / 2, -h / 2, w, h); ctx.restore(); return true;
  };
  var emoCache = {};
  GX.emoji = function (ch, px, dpr) {
    var key = ch + '|' + px + '|' + (dpr || 1), c = emoCache[key]; if (c) return c;
    c = document.createElement('canvas'); var d = dpr || 1, s = Math.ceil(px * 1.35); c.width = c.height = Math.ceil(s * d);
    var x = c.getContext('2d'); x.scale(d, d); x.font = px + 'px ' + EMOJI; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(ch, s / 2, s / 2 + px * .06);
    c = { c: c, s: s }; emoCache[key] = c; return c;
  };

  /* ------------------------------------------------------------------ audio (one shared AudioContext for the page; each game gets its own master gain) */
  var SHARED = null, ctxCount = 0, MUTEKEY = 'wq37-gx-mute', MUSKEY = 'wq37-gx-nomusic';
  function ctxGet() {
    if (!SHARED) { var C = window.AudioContext || window.webkitAudioContext; if (!C) return null; try { SHARED = new C(); ctxCount++; } catch (e) { return null; } }
    if (SHARED.state === 'suspended') { try { SHARED.resume(); } catch (e) { /* */ } }
    return SHARED;
  }
  function loadMute() { try { return localStorage.getItem(MUTEKEY) === '1'; } catch (e) { return false; } }
  function saveMute(v) { try { localStorage.setItem(MUTEKEY, v ? '1' : '0'); } catch (e) { /* */ } }
  var PENTA = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24];
  function hz(semi, base) { return (base || 261.63) * Math.pow(2, semi / 12); }
  GX.audio = function (soundOn) {
    var enabled = soundOn !== false, muted = loadMute(), master = null, mt = 0, mtheme = null, stepN = 0, dead = false, noiseBuf = null, lastSfx = {}, layerN = 0;
    var API = {};
    function ac() { if (dead || !enabled) return null; var c = ctxGet(); if (!c) return null; if (!master) { master = c.createGain(); master.gain.value = muted ? 0 : 0.8; master.connect(c.destination); } return c; }
    function tone(c, f, dur, type, vol, o) {
      o = o || {}; var t0 = c.currentTime + (o.delay || 0), osc = c.createOscillator(), g = c.createGain();
      osc.type = type || 'sine'; osc.frequency.setValueAtTime(f, t0); if (o.slide) osc.frequency.exponentialRampToValueAtTime(Math.max(20, f * o.slide), t0 + dur);
      g.gain.setValueAtTime(0.0001, t0); g.gain.exponentialRampToValueAtTime(Math.max(.0002, vol), t0 + Math.min(.015, dur / 3)); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur);
      osc.connect(g); g.connect(o.dest || master); osc.start(t0); osc.stop(t0 + dur + .03);
    }
    function noise(c, dur, vol, f0, f1, o) {
      o = o || {}; if (!noiseBuf) { noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate); var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
      var t0 = c.currentTime + (o.delay || 0), s = c.createBufferSource(), fl = c.createBiquadFilter(), g = c.createGain();
      s.buffer = noiseBuf; s.loop = true; fl.type = o.type || 'lowpass'; fl.frequency.setValueAtTime(f0, t0); if (f1) fl.frequency.exponentialRampToValueAtTime(f1, t0 + dur);
      g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(.0001, t0 + dur); s.connect(fl); fl.connect(g); g.connect(master); s.start(t0); s.stop(t0 + dur + .03);
    }
    var R = {
      key: function (c, o) { var n = PENTA[(o.i || 0) % PENTA.length]; tone(c, hz(n), .13, 'triangle', .16); tone(c, hz(n + 12), .09, 'sine', .05, { delay: .01 }); },
      keybad: function (c) { tone(c, 150, .16, 'square', .1, { slide: .6 }); },
      tap: function (c) { tone(c, 520, .05, 'sine', .08); },
      good: function (c) { [0, 4, 7, 12].forEach(function (n, i) { tone(c, hz(n + 7), .18, 'triangle', .15, { delay: i * .06 }); }); },
      great: function (c) { [0, 4, 7, 12, 16].forEach(function (n, i) { tone(c, hz(n + 12), .2, 'triangle', .15, { delay: i * .055 }); tone(c, hz(n), .2, 'sine', .07, { delay: i * .055 }); }); },
      bad: function (c) { tone(c, 220, .3, 'sawtooth', .1, { slide: .5 }); tone(c, 165, .34, 'square', .06, { slide: .55, delay: .05 }); },
      boom: function (c) { noise(c, .5, .5, 900, 60); tone(c, 110, .4, 'sine', .3, { slide: .3 }); },
      hit: function (c) { noise(c, .12, .3, 2600, 400); tone(c, 240, .09, 'square', .1, { slide: .5 }); },
      zap: function (c) { tone(c, 900, .22, 'sawtooth', .1, { slide: .25 }); noise(c, .18, .15, 5000, 800, { type: 'highpass' }); },
      shoot: function (c) { tone(c, 640, .16, 'triangle', .14, { slide: .35 }); noise(c, .08, .12, 4000, 1500, { type: 'highpass' }); },
      coin: function (c) { tone(c, hz(19, 261.63), .07, 'square', .08); tone(c, hz(24, 261.63), .22, 'square', .08, { delay: .07 }); },
      combo: function (c, o) { var n = Math.min(10, o.n || 1); tone(c, hz(n * 2 + 7), .14, 'triangle', .14); tone(c, hz(n * 2 + 14), .2, 'sine', .08, { delay: .05 }); },
      win: function (c) { [0, 4, 7, 12, 7, 12, 16, 19].forEach(function (n, i) { tone(c, hz(n + 5), .26, 'triangle', .16, { delay: i * .1 }); tone(c, hz(n - 7), .26, 'sine', .08, { delay: i * .1 }); }); },
      lose: function (c) { [7, 5, 2, 0].forEach(function (n, i) { tone(c, hz(n), .34, 'sine', .15, { delay: i * .16, slide: .96 }); }); },
      pop: function (c) { tone(c, 700, .08, 'sine', .12, { slide: 1.8 }); },
      whoosh: function (c) { noise(c, .28, .22, 300, 4200, { type: 'bandpass' }); },
      card: function (c) { noise(c, .07, .16, 7000, 2500, { type: 'highpass' }); tone(c, 880, .05, 'triangle', .05); },
      deal: function (c, o) { noise(c, .06, .14, 6000, 3000, { type: 'highpass', delay: o.delay }); },
      heal: function (c) { [0, 4, 7, 11].forEach(function (n, i) { tone(c, hz(n + 12), .2, 'sine', .12, { delay: i * .07 }); }); },
      shield: function (c) { tone(c, 330, .28, 'triangle', .13, { slide: 1.8 }); tone(c, 495, .28, 'sine', .08, { slide: 1.4, delay: .04 }); },
      power: function (c) { [0, 5, 9, 12, 17].forEach(function (n, i) { tone(c, hz(n + 7), .12, 'square', .09, { delay: i * .05 }); }); },
      warn: function (c) { tone(c, 300, .14, 'square', .1); tone(c, 300, .14, 'square', .1, { delay: .2 }); },
      tick: function (c) { tone(c, 1000, .03, 'square', .05); },
      step: function (c) { tone(c, 180, .04, 'triangle', .05); },
      portal: function (c) { tone(c, 300, .35, 'sine', .12, { slide: 3 }); tone(c, 450, .35, 'triangle', .07, { slide: 2.5 }); },
      eat: function (c, o) { var n = PENTA[(o.i || 0) % PENTA.length]; tone(c, hz(n + 5), .1, 'square', .09); },
      ghost: function (c) { tone(c, 90, .3, 'sawtooth', .08, { slide: 1.6 }); },
      boss: function (c) { tone(c, 82, .8, 'sawtooth', .16, { slide: .8 }); tone(c, 123, .8, 'square', .08, { slide: .8, delay: .05 }); noise(c, .6, .2, 400, 100); },
      flip: function (c) { noise(c, .09, .14, 5000, 1800, { type: 'highpass' }); tone(c, 600, .06, 'sine', .06, { slide: 1.5 }); },
      /* R3.22 additions (layered action sounds; used by the tower-defence game, harmless for the others) */
      kill: function (c, o) { var t = o.t || 0; tone(c, hz(7 + t * 3), .1, 'sine', .2, { slide: 2.4 }); tone(c, hz(19 + t * 3), .16, 'triangle', .07, { delay: .05 }); noise(c, .14, .16, 3800, 600); tone(c, hz(-5), .18, 'sine', .16, { slide: .5 }); },
      tierup: function (c, o) {
        var t = o.t || 1;
        if (t === 1) { noise(c, .4, .3, 600, 3000, { type: 'bandpass' }); [0, 4, 7, 12].forEach(function (n, i) { tone(c, hz(n), .2, 'square', .08, { delay: i * .06 }); }); tone(c, hz(-12), .4, 'sawtooth', .1, { slide: 1.8 }); }
        else if (t === 2) { [12, 19, 24, 28].forEach(function (n, i) { tone(c, hz(n), .5, 'sine', .11, { delay: i * .08 }); tone(c, hz(n + .08), .5, 'sine', .06, { delay: i * .08 }); }); noise(c, .3, .1, 7000, 3000, { type: 'highpass' }); }
        else { tone(c, 900, .25, 'sawtooth', .1, { slide: .2 }); noise(c, .35, .22, 6000, 500, { type: 'highpass' }); [0, 7, 12, 16, 19].forEach(function (n, i) { tone(c, hz(n + 5), .24, 'square', .08, { delay: .1 + i * .05 }); }); }
      },
      basehit: function (c) { tone(c, 78, .45, 'sine', .42, { slide: .45 }); noise(c, .32, .34, 700, 70); tone(c, 330, .12, 'square', .09); tone(c, 247, .18, 'square', .09, { delay: .13 }); },
      shieldbreak: function (c) { noise(c, .22, .22, 9000, 2500, { type: 'highpass' }); tone(c, 2400, .2, 'triangle', .08, { slide: .4 }); tone(c, 1800, .26, 'sine', .07, { slide: .5, delay: .03 }); tone(c, hz(12), .22, 'triangle', .1, { delay: .08 }); },
      streak: function (c, o) { var n = Math.max(1, o.n || 1), i = n % PENTA.length, oct = Math.min(2, Math.floor(n / PENTA.length)) * 12, f = hz(PENTA[i] + 7 + oct); tone(c, f, .15, 'triangle', .13); tone(c, f * 2, .22, 'sine', .07, { delay: .04 }); if (n >= 5) tone(c, f * 3, .12, 'sine', .04, { delay: .08 }); if (n >= 10) tone(c, f * 4, .1, 'triangle', .03, { delay: .12 }); },
      freezeon: function (c) { noise(c, .3, .2, 8000, 2000, { type: 'highpass' }); [24, 19, 16, 12].forEach(function (n, i) { tone(c, hz(n), .3, 'sine', .09, { delay: i * .06 }); }); },
      bossdie: function (c) { noise(c, .7, .45, 1800, 50); tone(c, 140, .8, 'sawtooth', .16, { slide: .2 }); [0, 4, 7, 12, 16, 19, 24].forEach(function (n, i) { tone(c, hz(n + 7), .3, 'triangle', .12, { delay: .25 + i * .07 }); }); }
    };
    API.names = function () { return Object.keys(R); };
    API.sfx = function (name, o) {
      o = o || {}; var c = ac(); if (!c || muted || !R[name]) return;
      var now = c.currentTime; if (lastSfx[name] && now - lastSfx[name] < .025) return; lastSfx[name] = now;
      try { R[name](c, o); } catch (e) { /* */ }
    };
    /* music: a soft arpeggio + bass loop, scheduled 90 ms at a time; themes differ in scale, tempo and mood */
    var THEMES = {
      calm: { bpm: 96, root: -5, scale: [0, 2, 4, 7, 9], bass: [0, 0, 7, 5], vol: .045 },
      drive: { bpm: 124, root: -2, scale: [0, 3, 5, 7, 10], bass: [0, 0, 5, 3], vol: .05 },
      boss: { bpm: 138, root: -7, scale: [0, 1, 4, 5, 7, 8], bass: [0, 0, 1, 0], vol: .055 },
      dream: { bpm: 84, root: 0, scale: [0, 4, 7, 9, 11], bass: [0, 5, 7, 4], vol: .04 }
    };
    function musTick() {
      var c = ac(); if (!c || muted || !mtheme) return; var T = THEMES[mtheme] || THEMES.calm, beat = 60 / T.bpm / 2;
      var guard = c.currentTime + .16; if (!API._next || API._next < c.currentTime) API._next = c.currentTime + .05;
      while (API._next < guard) {
        var t = API._next - c.currentTime, k = stepN++, bar = Math.floor(k / 8) % T.bass.length;
        if (k % 2 === 0) { var s = T.scale[(k * 3 + (k >> 2)) % T.scale.length]; tone(c, hz(T.root + s + 12), beat * 1.6, 'triangle', T.vol, { delay: Math.max(0, t) }); }
        if (k % 4 === 0) tone(c, hz(T.root + T.bass[bar] - 12), beat * 3.4, 'sine', T.vol * 1.4, { delay: Math.max(0, t) });
        if (mtheme === 'boss' || mtheme === 'drive') { if (k % 2 === 1) noise(c, .04, T.vol * 1.2, 7000, 4000, { type: 'highpass', delay: Math.max(0, t) }); }
        if (layerN >= 1 && (mtheme === 'boss' || mtheme === 'drive')) {       /* R3.22 intensity layers (kick, then 16th hats + a high echo voice); default 0 = unchanged */
          if (k % 4 === 0) tone(c, 62, .16, 'sine', T.vol * 2.6, { delay: Math.max(0, t), slide: .45 });
          if (layerN >= 2) { noise(c, .025, T.vol * .9, 9000, 6000, { type: 'highpass', delay: Math.max(0, t) + beat / 2 }); if (k % 2 === 1) tone(c, hz(T.root + T.scale[(k * 2 + 1) % T.scale.length] + 24), beat * .8, 'sine', T.vol * .7, { delay: Math.max(0, t) }); }
        }
        API._next += beat;
      }
    }
    API.layer = function (n) { layerN = n | 0; };
    API.warm = function () { var c = ac(); if (c && !noiseBuf) { noiseBuf = c.createBuffer(1, c.sampleRate, c.sampleRate); var d = noiseBuf.getChannelData(0); for (var i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; } };
    API.music = function (theme) {
      if (dead) return; mtheme = theme || 'calm'; API._next = 0; stepN = 0; layerN = 0;
      if (!mt && enabled && API.musicOn()) mt = setInterval(musTick, 80);
    };
    API.setMusicOn = function (v) { try { localStorage.setItem(MUSKEY, v ? '0' : '1'); } catch (e) { /* */ } if (!v) { if (mt) { clearInterval(mt); mt = 0; } } else if (mtheme && enabled && !mt && !dead) mt = setInterval(musTick, 80); };
    API.musicOn = function () { try { return localStorage.getItem(MUSKEY) !== '1'; } catch (e) { return true; } };
    API.stopMusic = function () { mtheme = null; if (mt) { clearInterval(mt); mt = 0; } };
    API.setMuted = function (v) { muted = !!v; saveMute(muted); if (master) master.gain.value = muted ? 0 : .8; };
    API.muted = function () { return muted; };
    API.unlock = function () { ac(); };
    API.destroy = function () { dead = true; API.stopMusic(); if (master) { try { master.disconnect(); } catch (e) { /* */ } master = null; } };
    API.state = function () { return { enabled: enabled, muted: muted, ctx: SHARED ? SHARED.state : 'none', music: mtheme }; };
    return API;
  };
  GX._contexts = function () { return ctxCount; };

  /* ------------------------------------------------------------------ fx: particles, rings, floaters, shake, flash */
  GX.fx = function (o) {
    o = o || {}; var P = [], R = [], T = [], shakeM = 0, shakeT = 0, flashA = 0, flashC = '#fff', red = o.reduced != null ? o.reduced : reduced(), MAXP = 360, F = {};
    F.setReduced = function (v) { red = !!v; };
    F.burst = function (x, y, p) {
      p = p || {}; var n = Math.round((p.n || 12) * (red ? .35 : 1)), cols = p.colors || [GOLD, '#fff', AURORA], sp = p.speed || 150, life = p.life || .6, size = p.size || 4, ang = p.angle || 0, spread = p.spread == null ? Math.PI * 2 : p.spread;
      for (var i = 0; i < n && P.length < MAXP; i++) {
        var a = ang + (Math.random() - .5) * spread, v = sp * (.35 + Math.random() * .75);
        P.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: p.grav == null ? 260 : p.grav, d: p.drag == null ? .9 : p.drag, life: life * (.7 + Math.random() * .6), max: life, size: size * (.6 + Math.random() * .8), col: cols[(Math.random() * cols.length) | 0], shape: p.shape || 'c', rot: Math.random() * 6, vr: (Math.random() - .5) * 10 });
      }
    };
    F.trail = function (x, y, col, size) { if (red || P.length >= MAXP) return; P.push({ x: x, y: y, vx: (Math.random() - .5) * 14, vy: (Math.random() - .5) * 14, g: 0, d: .9, life: .35, max: .35, size: size || 3, col: col || GOLD, shape: 'c', rot: 0, vr: 0 }); };
    F.ring = function (x, y, p) { p = p || {}; R.push({ x: x, y: y, r0: p.r0 || 6, r1: p.r1 || 70, life: p.life || .45, max: p.life || .45, col: p.color || GOLD, w: p.width || 4 }); };
    F.text = function (x, y, str, p) { p = p || {}; T.push({ x: x, y: y, str: String(str), col: p.color || '#fff', size: p.size || 22, life: p.life || .9, max: p.life || .9, rise: p.rise == null ? 46 : p.rise, sk: p.stroke || 'rgba(11,16,48,.9)', pop: p.pop !== false }); if (T.length > 24) T.shift(); };
    F.confetti = function (w, p) { p = p || {}; var n = Math.round((p.n || 70) * (red ? .3 : 1)), cols = p.colors || [GOLD, '#ff5fa2', AURORA, '#8e6bff', '#2fa8ff', '#fff']; for (var i = 0; i < n && P.length < MAXP + 80; i++) P.push({ x: Math.random() * w, y: -10 - Math.random() * 60, vx: (Math.random() - .5) * 80, vy: 80 + Math.random() * 140, g: 120, d: .995, life: 2 + Math.random(), max: 3, size: 5 + Math.random() * 4, col: cols[(Math.random() * cols.length) | 0], shape: 's', rot: Math.random() * 6, vr: (Math.random() - .5) * 12 }); };
    F.shake = function (m, dur) { if (red) return; shakeM = Math.max(shakeM, Math.min(8, m)); shakeT = Math.max(shakeT, dur || .25); };
    F.flash = function (col, a) { flashC = col || '#fff'; flashA = Math.max(flashA, red ? (a || .35) * .4 : (a || .35)); };
    F.update = function (dt) {
      var i, p; for (i = P.length - 1; i >= 0; i--) { p = P[i]; p.life -= dt; if (p.life <= 0) { P.splice(i, 1); continue; } p.vy += p.g * dt; p.vx *= Math.pow(p.d, dt * 60); p.vy *= Math.pow(p.d, dt * 60); p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; }
      for (i = R.length - 1; i >= 0; i--) { R[i].life -= dt; if (R[i].life <= 0) R.splice(i, 1); }
      for (i = T.length - 1; i >= 0; i--) { T[i].life -= dt; if (T[i].life <= 0) T.splice(i, 1); }
      if (shakeT > 0) { shakeT -= dt; if (shakeT <= 0) shakeM = 0; } flashA = Math.max(0, flashA - dt * 2.2);
    };
    F.begin = function (c) { if (shakeT > 0 && shakeM) { c.save(); c.translate((Math.random() - .5) * shakeM * 2, (Math.random() - .5) * shakeM * 2); return true; } return false; };
    F.end = function (c, was) { if (was) c.restore(); };
    function star(c, s) { c.beginPath(); for (var k = 0; k < 10; k++) { var r = k % 2 ? s * .45 : s; c.lineTo(Math.cos(k * Math.PI / 5 - Math.PI / 2) * r, Math.sin(k * Math.PI / 5 - Math.PI / 2) * r); } c.closePath(); c.fill(); }
    F.draw = function (c, W, H) {
      var i, p, t;
      for (i = 0; i < P.length; i++) {
        p = P[i]; t = p.life / p.max; c.globalAlpha = Math.min(1, t * 1.6); c.fillStyle = p.col;
        if (p.shape === 'c') { c.beginPath(); c.arc(p.x, p.y, p.size * (.4 + t * .6), 0, 6.3); c.fill(); }
        else if (p.shape === 's') { c.save(); c.translate(p.x, p.y); c.rotate(p.rot); c.fillRect(-p.size / 2, -p.size / 3, p.size, p.size * .66); c.restore(); }
        else if (p.shape === 'star') { c.save(); c.translate(p.x, p.y); c.rotate(p.rot); star(c, p.size * (.5 + t * .8)); c.restore(); }
        else { c.save(); c.translate(p.x, p.y); c.rotate(Math.atan2(p.vy, p.vx)); c.fillRect(-p.size * 1.6, -p.size * .25, p.size * 3.2, p.size * .5); c.restore(); }
      }
      for (i = 0; i < R.length; i++) { p = R[i]; t = 1 - p.life / p.max; c.globalAlpha = (1 - t) * .9; c.strokeStyle = p.col; c.lineWidth = p.w * (1 - t * .6); c.beginPath(); c.arc(p.x, p.y, lerp(p.r0, p.r1, ease.out(t)), 0, 6.3); c.stroke(); }
      for (i = 0; i < T.length; i++) {
        p = T[i]; t = 1 - p.life / p.max; var sc = p.pop ? (t < .18 ? .6 + ease.back(t / .18) * .55 : 1.15 - Math.min(.15, (t - .18))) : 1;
        c.globalAlpha = t > .7 ? (1 - t) / .3 : 1;
        if (!p.lb) p.lb = GX.label(p.str, { size: p.size, weight: 900, fam: FONT, color: p.col, stroke: p.sk, strokeW: Math.max(3, p.size * .22) / 2, dpr: 2 });   /* rasterised once per floater (cached by text), blitted + scaled per frame */
        c.drawImage(p.lb.c, p.x - p.lb.w * sc / 2, p.y - p.rise * ease.out(t) - p.lb.h * sc / 2, p.lb.w * sc, p.lb.h * sc);
      }
      c.globalAlpha = 1;
      if (flashA > .01) { c.globalAlpha = Math.min(.6, flashA); c.fillStyle = flashC; c.fillRect(0, 0, W, H); c.globalAlpha = 1; }
    };
    F.clear = function () { P.length = R.length = T.length = 0; shakeT = 0; flashA = 0; };
    F.count = function () { return P.length + R.length + T.length; };
    return F;
  };

  /* ------------------------------------------------------------------ Learn: the shared learning logic (pure; no DOM) */
  GX.starsOf = function (firstAcc) { return firstAcc >= .95 ? 5 : firstAcc >= .85 ? 4 : firstAcc >= .70 ? 3 : firstAcc >= .50 ? 2 : 1; };
  function norm(s) { return String(s == null ? '' : s).replace(/[０-９]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 65248); }).replace(/[／]/g, '/').replace(/[．。]/g, '.').replace(/[\s　]+/g, ''); }
  GX.Learn = function (o) {
    o = o || {}; var rng = rngOf(o.seed != null ? o.seed : (Date.now() & 0xfffff)), gapMin = o.gapMin || 2, gapMax = o.gapMax || 4, maxRe = o.maxRequeue == null ? 2 : o.maxRequeue, L = {};
    var items = (o.items || []).map(function (it, i) { return Object.assign({ id: it.id != null ? it.id : 'i' + i }, it); });
    var review = (o.review || []).slice(0, 2).map(function (it, i) { return Object.assign({ id: 'rv' + (it.id != null ? it.id : i), rv: true }, it); });
    var fillN = 0, queue = shuffle(items, rng), stats = {}, asked = 0, correctN = 0, firstOkN = 0, firstN = 0, seen = {};
    /* review items are slipped in after the 2nd and 5th core item and never count towards the stars */
    review.forEach(function (r, i) { queue.splice(Math.min(queue.length, 2 + i * 3), 0, r); });
    items.concat(review).forEach(function (it) { stats[it.id] = { id: it.id, rv: !!it.rv, item: it, tries: 0, firstOk: null, ok: false, ms: 0, requeued: 0, missed: 0 }; });
    L.items = items; L.stats = stats;
    L.total = function () { return items.length; };
    L.remaining = function () { return queue.length; };
    L.done = function () { return queue.length === 0; };
    L.next = function () { return queue.length ? queue[0] : null; };
    L.take = function () { return queue.shift() || null; };
    L.peek = function (k) { return queue[k || 0] || null; };
    /* word: case-insensitive equal; math: the host's check(input) */
    L.judge = function (it, input) {
      if (it.kind === 'math' || (it.a != null && it.en == null)) { if (typeof it.check === 'function') { try { return !!it.check(String(input)); } catch (e) { return false; } } return norm(input) === norm(it.a); }
      return String(input).trim().toLowerCase() === String(it.en).trim().toLowerCase();
    };
    L.expect = function (it) { return it.kind === 'math' || (it.a != null && it.en == null) ? String(it.a) : String(it.en); };
    /* typing state of a half-typed answer: 'done' | 'partial' (still a prefix of the answer) | 'wrong' */
    L.typing = function (it, input) {
      if (L.judge(it, input)) return 'done'; var e = L.expect(it), a = it.kind === 'math' || it.en == null ? norm(input) : String(input).toLowerCase(), b = it.kind === 'math' || it.en == null ? norm(e) : e.toLowerCase();
      return a.length < b.length && b.indexOf(a) === 0 ? 'partial' : 'wrong';
    };
    /* record one answer (ok:boolean). Wrong: the item comes back 2-4 items later, at most twice. Right: counts as done. */
    L.answer = function (it, ok, ms) {
      var s = stats[it.id]; if (!s) return null; s.tries++; s.ms += ms || 0;
      if (s.firstOk === null) { s.firstOk = !!ok; if (!s.rv) { firstN++; if (ok) firstOkN++; } }
      var out = { ok: !!ok, first: s.tries === 1, requeued: false, item: it };
      if (ok) { s.ok = true; if (!s.rv) correctN++; return out; }
      s.missed++;
      if (!s.rv && s.requeued < maxRe) {   /* review and filler items never come back: a miss only opens the learning card */
        s.requeued++; var at = Math.min(queue.length, gapMin + Math.floor(rng() * (gapMax - gapMin + 1)) - 1);
        /* near the end of the level there may be fewer than 'gapMin' items left: fill the gap with already-solved items (revisit, never counted) so a miss is never asked again straight after its card */
        var need = Math.max(0, Math.min(2, gapMin) - queue.length), cand = items.filter(function (x) { return stats[x.id] && stats[x.id].ok && x.id !== it.id; }), f;
        while (need-- > 0 && cand.length) { f = cand.splice(Math.floor(rng() * cand.length), 1)[0]; fillN++; var fl = Object.assign({}, f, { id: 'fl' + fillN + ':' + f.id, rv: true }); stats[fl.id] = { id: fl.id, rv: true, item: fl, tries: 0, firstOk: null, ok: false, ms: 0, requeued: 0, missed: 0 }; queue.push(fl); }
        at = Math.min(queue.length, Math.max(at, Math.min(2, gapMin))); queue.splice(Math.max(0, at), 0, it); out.requeued = true;
      }
      return out;
    };
    /* the child used a hint on this item: it can no longer count as a first-try hit */
    L.assisted = function (it) { var s = stats[it.id]; if (!s || s.rv) return; if (s.firstOk === true) { firstOkN--; s.firstOk = false; } else if (s.firstOk === null) { s.firstOk = false; firstN++; } s.hinted = true; };
    L.progress = function () { var okN = 0, k; for (k in stats) if (stats[k].ok && !stats[k].rv) okN++; return { done: okN, total: items.length, tries: Object.keys(stats).reduce(function (n, k) { return n + stats[k].tries; }, 0) }; };
    L.firstAcc = function () { return firstN ? firstOkN / firstN : 0; };
    L.accuracy = function () { var t = 0, ok = 0, k; for (k in stats) { if (stats[k].rv) continue; t += stats[k].tries; if (stats[k].ok) ok++; } return t ? ok / t : 0; };
    /* cleared:false (lost / quit) can never pass. Items never asked count as not first-try-correct. */
    /* R3.30 C-09: a level is passed at the parent's pass rate (o.passRate, the same one the 闖關 uses); without one it stays at 70% = 3 stars */
    L.passRate = o.passRate != null && isFinite(+o.passRate) && +o.passRate > 0 ? +o.passRate : .70;
    L.result = function (x) {
      x = x || {}; var cleared = x.cleared !== false, core = items.length, fa = core ? firstOkN / core : 0;
      var per = Object.keys(stats).map(function (k) { var s = stats[k], it = s.item; return { id: s.id, rv: s.rv, en: it.en || '', zh: it.zh || '', q: it.q || '', a: it.a != null ? String(it.a) : '', emoji: it.emoji || '', tries: s.tries, firstOk: s.firstOk === true, ok: s.ok, missed: s.missed, ms: Math.round(s.ms) }; });
      var stars = cleared ? GX.starsOf(fa) : 1;
      return { stars: stars, passed: cleared && fa >= L.passRate - 1e-9, passRate: L.passRate, cleared: cleared, accuracy: Math.round(L.accuracy() * 1000) / 1000, firstTryAccuracy: Math.round(fa * 1000) / 1000, firstTryCorrect: firstOkN, total: core, score: x.score || 0, maxCombo: x.maxCombo || 0, seconds: Math.round(x.seconds || 0), difficulty: x.difficulty || o.difficulty || 1, mode: x.mode || o.mode || 'level', subject: o.subject || '', perItem: per, missed: per.filter(function (p) { return !p.rv && p.missed > 0; }) };
    };
    return L;
  };
  GX.norm = norm;

  /* ------------------------------------------------------------------ keypad (touch). Physical keyboard goes through shell.keys() */
  GX.pad = function (root, o) {
    o = o || {}; var P = {}, el = document.createElement('div'), mode = o.mode || 'letters', keys = null, off = false;
    el.className = 'gx-pad'; el.setAttribute('role', 'group'); el.setAttribute('aria-label', mode === 'letters' ? '字母鍵盤' : '數字鍵盤'); root.appendChild(el);
    var QW = [['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'], ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'], ['z', 'x', 'c', 'v', 'b', 'n', 'm']];
    function btn(k, label, cls) { return '<button type="button" class="gx-key ' + (cls || '') + '" data-k="' + esc(k) + '" aria-label="' + esc(label || k) + '">' + (label || esc(k)) + '</button>'; }
    function build() {
      var h = '';
      if (mode === 'digits' || mode === 'frac') {
        var rows = [['1', '2', '3'], ['4', '5', '6'], ['7', '8', '9']];
        h = '<div class="gx-prow gx-dig">' + rows.map(function (r) { return r.map(function (k) { return btn(k); }).join(''); }).join('') + '</div><div class="gx-prow gx-dig">' + (mode === 'frac' ? btn('/', '／', 'alt') + btn('.', '．', 'alt') : btn('-', '−', 'alt')) + btn('0') + btn('⌫', ico('back', 22), 'bk') + '</div>' + (o.enter ? '<div class="gx-prow gx-dig">' + btn('↵', ico('check', 24) + '<span>確定</span>', 'go') + '</div>' : '');
      } else if (keys) {
        h = '<div class="gx-prow gx-scr">' + keys.map(function (k) { return btn(k); }).join('') + btn('⌫', ico('back', 22), 'bk') + '</div>';
      } else {
        h = QW.map(function (r, i) { return '<div class="gx-prow">' + r.map(function (k) { return btn(k); }).join('') + (i === 2 ? btn('⌫', ico('back', 22), 'bk') : '') + '</div>'; }).join('');
      }
      el.innerHTML = h; el.classList.toggle('scr', !!keys && mode === 'letters'); el.classList.toggle('dig', mode !== 'letters');
    }
    function fire(k) {
      if (off) return; if (k === '⌫') { if (o.onBack) o.onBack(); return; } if (k === '↵') { if (o.onEnter) o.onEnter(); return; } if (o.onKey) o.onKey(k);
    }
    el.addEventListener('pointerdown', function (e) {
      var b = e.target.closest && e.target.closest('.gx-key'); if (!b || !el.contains(b)) return; e.preventDefault(); b.classList.add('dn'); fire(b.getAttribute('data-k'));
      setTimeout(function () { b.classList.remove('dn'); }, 90);
    });
    el.addEventListener('contextmenu', function (e) { e.preventDefault(); });
    P.el = el;
    P.setMode = function (m, kk) { mode = m; keys = kk || null; build(); };
    P.setKeys = function (list) { keys = list && list.length ? list.slice() : null; build(); };
    P.flash = function (k, kind) { var b = el.querySelector('.gx-key[data-k="' + (k === '"' ? '\\"' : k) + '"]'); if (!b) return; b.classList.remove('ok', 'no'); void b.offsetWidth; b.classList.add(kind === 'ok' ? 'ok' : 'no'); setTimeout(function () { b.classList.remove('ok', 'no'); }, 260); };
    P.disable = function (v) { off = !!v; el.classList.toggle('off', off); };
    P.show = function (v) { el.style.display = v === false ? 'none' : ''; };
    P.height = function () { return el.style.display === 'none' ? 0 : el.getBoundingClientRect().height; };
    P.destroy = function () { if (el.parentNode) el.parentNode.removeChild(el); };
    build(); return P;
  };

  /* ------------------------------------------------------------------ shared CSS (all classes gx-, injected once) */
  var CSS = '' +
    '.gx-root{position:relative;width:100%;height:100%;overflow:hidden;background:' + INK + ';color:' + TEXT + ';font-family:' + FONT + ';user-select:none;-webkit-user-select:none;touch-action:none;-webkit-tap-highlight-color:transparent}' +
    '.gx-root canvas.gx-cv{position:absolute;left:0;top:0;width:100%;height:100%;display:block;touch-action:none}' +
    '.gx-root button{font-family:' + FONT + ';-webkit-tap-highlight-color:transparent}' +
    '.gx-hudbtn{position:absolute;z-index:4;width:44px;height:44px;border-radius:50%;border:1px solid rgba(255,255,255,.28);background:rgba(11,16,48,.6);color:' + TEXT + ';display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer;box-shadow:0 3px 0 rgba(0,0,0,.35);-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)}' +
    '.gx-hudbtn:active{transform:translateY(2px);box-shadow:0 1px 0 rgba(0,0,0,.35)}' +
    '.gx-hudbtn:focus-visible,.gx-btn:focus-visible,.gx-key:focus-visible{outline:3px solid ' + GOLD + ';outline-offset:2px}' +
    '.gx-ov{position:absolute;inset:0;z-index:8;display:flex;align-items:center;justify-content:center;background:rgba(7,10,38,.66);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);padding:10px;box-sizing:border-box;touch-action:manipulation;animation:gxfade .18s ease-out}' +
    '.gx-ov.clear{background:rgba(7,10,38,.45);-webkit-backdrop-filter:none;backdrop-filter:none}' +
    '@keyframes gxfade{from{opacity:0}to{opacity:1}}@keyframes gxpop{from{transform:scale(.9);opacity:0}to{transform:scale(1);opacity:1}}' +
    '.gx-card{background:linear-gradient(160deg,rgba(30,38,96,.97),rgba(18,24,68,.97));border:1px solid rgba(255,255,255,.16);border-radius:24px;padding:18px 18px 20px;max-width:380px;width:100%;max-height:100%;overflow:auto;box-sizing:border-box;text-align:center;box-shadow:0 14px 36px rgba(0,0,0,.5),inset 0 1px 0 rgba(255,255,255,.12);animation:gxpop .22s cubic-bezier(.23,1,.32,1)}' +
    '.gx-card h1{margin:0 0 6px;font-size:24px;font-weight:900;line-height:1.25;overflow-wrap:anywhere}' +
    '.gx-sub{color:' + MUTED + ';font-size:14px;margin:2px 0 10px}' +
    '.gx-sub.gx-need{color:#FFD36E;font-size:16px;font-weight:800}' +
    '.gx-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:48px;min-width:48px;padding:0 20px;border-radius:999px;border:0;background:' + GOLD + ';color:' + GOLD_INK + ';font-size:17px;font-weight:900;cursor:pointer;box-shadow:0 4px 0 ' + GOLD_D + ';touch-action:manipulation}' +
    '.gx-btn:active{transform:translateY(2px);box-shadow:0 2px 0 ' + GOLD_D + '}.gx-btn[disabled]{opacity:.45;box-shadow:none;transform:none;cursor:default}' +
    '.gx-btn.ghost{background:rgba(255,255,255,.1);color:' + TEXT + ';border:1px solid rgba(255,255,255,.22);box-shadow:0 3px 0 rgba(0,0,0,.3)}' +
    '.gx-row{display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:12px}' +
    '.gx-big{font-family:' + EFONT + ';font-weight:900;letter-spacing:.02em;line-height:1.1;overflow-wrap:anywhere}' +
    '.gx-emo{font-family:' + EMOJI + ';line-height:1}' +
    '.gx-syl{color:' + GOLD + ';font-family:' + EFONT + ';font-weight:800;letter-spacing:.08em}' +
    '.gx-learn .big{font-size:clamp(40px,12vw,60px);color:' + GOOD + ';margin:2px 0 6px}.gx-learn .zh{font-size:20px;font-weight:800}.gx-learn .eg{font-size:16px;color:' + MUTED + ';margin-top:6px;line-height:1.5}' +
    '.gx-learn .lab{font-size:13px;color:' + MUTED + ';letter-spacing:.14em}.gx-learn .pic{font-size:52px;margin:2px 0}.gx-learn .pic img{max-height:84px;max-width:100%;object-fit:contain}' +
    '.gx-learn .you{font-size:15px;color:' + BAD + ';margin:2px 0 0;text-decoration:line-through;text-decoration-thickness:2px}' +
    '.gx-hold{position:relative;overflow:hidden}.gx-hold i{position:absolute;left:0;top:0;bottom:0;background:rgba(255,255,255,.32);width:0;transition:none}' +
    '.gx-hold span{position:relative}' +
    '.gx-okchip{position:absolute;left:50%;top:14%;transform:translateX(-50%);z-index:7;display:flex;align-items:center;gap:10px;background:rgba(20,26,70,.92);border:2px solid ' + GOOD + ';color:' + TEXT + ';padding:10px 18px;border-radius:999px;box-shadow:0 6px 18px rgba(0,0,0,.4);pointer-events:none;animation:gxpop .18s ease-out;max-width:92%}' +
    '.gx-okchip b{font-family:' + EFONT + ';font-size:24px;color:' + GOOD + '}.gx-okchip em{font-style:normal;font-size:16px}' +
    '.gx-stars{display:flex;justify-content:center;gap:6px;margin:6px 0 8px}.gx-stars svg{width:44px;height:44px;color:#3a4180;filter:none}' +
    '.gx-stars svg.on{color:' + GOLD + ';filter:drop-shadow(0 0 8px rgba(255,201,74,.7));animation:gxstar .5s cubic-bezier(.23,1,.32,1) both}' +
    '@keyframes gxstar{from{transform:scale(.2) rotate(-40deg);opacity:0}to{transform:none;opacity:1}}' +
    '.gx-chips{display:flex;gap:8px;justify-content:center;flex-wrap:wrap;margin:6px 0}.gx-chip{display:inline-flex;align-items:center;gap:5px;padding:6px 11px;border-radius:999px;background:rgba(255,255,255,.1);border:1px solid rgba(255,255,255,.16);font-size:15px;font-weight:800}' +
    '.gx-chip svg{width:18px;height:18px}.gx-chip.coin{background:rgba(255,201,74,.18);border-color:rgba(255,201,74,.5);color:' + GOLD + '}.gx-chip.bad{border-color:rgba(255,107,129,.5)}' +
    '.gx-miss{display:flex;gap:6px;flex-wrap:wrap;justify-content:center;max-height:min(22vh,150px);overflow:auto;margin:6px 0;padding:2px}.gx-miss span{background:rgba(255,107,129,.14);border:1px solid rgba(255,107,129,.45);border-radius:12px;padding:4px 10px;font-size:15px;font-weight:800;line-height:1.3}' +
    '.gx-miss small{display:block;font-size:12px;color:' + MUTED + ';font-weight:600}' +
    '.gx-res .gx-row{position:sticky;bottom:-20px;padding:8px 0 2px;background:linear-gradient(180deg,rgba(18,24,68,0),rgba(18,24,68,.96) 30%)}.gx-rep{margin:4px 0 0;text-align:left}.gx-rep summary{cursor:pointer;color:' + MUTED + ';font-size:14px;font-weight:700;list-style:none;text-align:center;padding:6px;min-height:32px}.gx-rep summary::-webkit-details-marker{display:none}.gx-rep[open] summary{color:' + TEXT + '}' +
    '.gx-replist{max-height:min(26vh,190px);overflow:auto;display:flex;flex-direction:column;gap:3px}.gx-replist .r{display:grid;grid-template-columns:22px minmax(0,1fr) auto auto;gap:6px;align-items:center;font-size:14px;padding:3px 6px;border-radius:10px;background:rgba(255,255,255,.06)}' +
    '.gx-replist .r i{display:grid;place-items:center}.gx-replist .r.g i{color:' + GOOD + '}.gx-replist .r.y i{color:' + GOLD + '}.gx-replist .r.b i{color:' + BAD + '}.gx-replist b{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.gx-replist em{font-style:normal;color:' + MUTED + ';font-size:13px;white-space:nowrap}.gx-replist u{text-decoration:none;color:' + MUTED + ';font-size:12px}' +
    '.gx-pv{max-width:340px}.gx-pv .face{min-height:196px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:4px;border-radius:20px;background:rgba(255,255,255,.07);border:1px solid rgba(255,255,255,.14);padding:10px 8px;cursor:pointer}' +
    '.gx-pv .face .pic{font-size:64px}.gx-pv .face .pic img{height:84px;max-width:100%;object-fit:contain}.gx-pv .face .en{font-size:clamp(34px,10vw,44px)}.gx-pv .face .zh{font-size:22px;font-weight:800}.gx-pv .face .eg{font-size:14px;color:' + MUTED + ';padding:0 6px}' +
    '.gx-dots{display:flex;gap:6px;justify-content:center;margin:10px 0 2px}.gx-dots i{width:8px;height:8px;border-radius:50%;background:rgba(255,255,255,.25)}.gx-dots i.on{background:' + GOLD + ';width:20px;border-radius:5px}' +
    '.gx-how .steps{display:flex;gap:8px;align-items:stretch;justify-content:center;margin:10px 0}.gx-how .st{flex:1;background:rgba(255,255,255,.08);border-radius:16px;padding:10px 4px;min-width:0}.gx-how .st .i{font-size:34px;margin-bottom:4px;display:block}.gx-how .st b{font-size:14px;font-weight:800;display:block;line-height:1.35}' +
    '@keyframes gxbob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}.gx-how .st .i{animation:gxbob 1.2s ease-in-out infinite}.gx-how .st:nth-child(2) .i{animation-delay:.2s}.gx-how .st:nth-child(3) .i{animation-delay:.4s}.gx-how .st{position:relative}.gx-how .st+.st::before{content:"›";position:absolute;left:-8px;top:30%;color:'+GOLD+';font-size:22px;font-weight:900}' +
    '.gx-banner{position:absolute;left:0;right:0;top:34%;z-index:6;text-align:center;pointer-events:none;animation:gxpop .22s cubic-bezier(.23,1,.32,1)}.gx-banner b{display:inline-block;font-size:clamp(26px,8vw,40px);font-weight:900;padding:6px 22px;border-radius:999px;background:rgba(20,26,70,.9);border:2px solid ' + GOLD + ';box-shadow:0 8px 24px rgba(0,0,0,.45)}.gx-banner small{display:block;margin-top:6px;font-size:15px;color:' + MUTED + '}' +
    '.gx-pad{position:absolute;left:0;right:0;bottom:0;z-index:3;display:flex;flex-direction:column;align-items:center;gap:6px;padding:8px 8px max(10px,env(safe-area-inset-bottom));background:linear-gradient(180deg,rgba(11,16,48,0) 0,rgba(11,16,48,.72) 24%,rgba(11,16,48,.92) 100%);touch-action:manipulation}' +
    '.gx-pad.off{opacity:.55;pointer-events:none}' +
    '.gx-prow{display:flex;gap:5px;justify-content:center;width:100%;max-width:560px}.gx-key{flex:1 1 0;min-width:0;max-width:56px;height:48px;border-radius:12px;border:1px solid rgba(255,255,255,.22);background:linear-gradient(180deg,#2a3282,#1b2160);color:' + TEXT + ';font-family:' + EFONT + ';font-size:22px;font-weight:800;display:flex;align-items:center;justify-content:center;gap:4px;padding:0;cursor:pointer;box-shadow:0 3px 0 rgba(0,0,0,.4);touch-action:manipulation}' +
    '.gx-key.dn{transform:translateY(2px);box-shadow:0 1px 0 rgba(0,0,0,.4);background:linear-gradient(180deg,#3a44a0,#2a3282)}.gx-key.ok{background:linear-gradient(180deg,#1fae7a,#12865d);border-color:#7bf2c5}.gx-key.no{background:linear-gradient(180deg,#d6405c,#a52a42);border-color:#ff9fb0}' +
    '.gx-key.bk{max-width:72px;flex:1.5 1 0;background:linear-gradient(180deg,#44306e,#2d1f52)}.gx-key.go{max-width:none;background:linear-gradient(180deg,' + GOLD + ',#e6a800);color:' + GOLD_INK + ';font-family:' + FONT + ';font-size:18px}.gx-key.alt{background:linear-gradient(180deg,#26567a,#1a3d5a)}' +
    '.gx-pad.scr .gx-key{max-width:60px;height:54px;font-size:26px}.gx-pad.dig{padding-left:14px;padding-right:14px}.gx-pad.dig .gx-prow{max-width:300px}.gx-pad.dig .gx-key{max-width:92px;height:50px;font-size:24px}' +
    '@media (max-height:480px){.gx-key{height:44px;font-size:19px}.gx-pad.scr .gx-key{height:44px;font-size:21px}.gx-pad.dig .gx-key{height:44px}.gx-pad{gap:4px;padding-top:4px}.gx-card{padding:12px 14px 14px}.gx-stars svg{width:34px;height:34px}.gx-learn .big{font-size:40px}.gx-learn .pic{font-size:30px}.gx-learn .pic img{max-height:44px}.gx-pv .face{min-height:130px}.gx-pv .face .pic{font-size:44px}.gx-pv .face .pic img{height:56px}}' +
    '@media (prefers-reduced-motion:reduce){.gx-how .st .i{animation:none!important}.gx-ov,.gx-card,.gx-banner,.gx-okchip,.gx-stars svg.on{animation:none!important}}';
  var cssDone = false;
  function injectCss() { if (cssDone) return; cssDone = true; var s = document.createElement('style'); s.setAttribute('data-wq37', 'gx'); s.textContent = CSS; document.head.appendChild(s); }

  /* ------------------------------------------------------------------ shell: root + canvas + fit + loop + tracked timers/listeners + ui */
  GX.shell = function (box, opts, cfg) {
    injectCss(); opts = opts || {}; cfg = cfg || {};
    var S = { opts: opts, cfg: cfg, dead: false, paused: false, touch: false, W: 320, H: 480, dpr: 1, t: 0, assetBase: opts.assetBase || 'assets/r321/' };
    var root = S.root = document.createElement('div'); root.className = 'gx-root'; root.setAttribute('data-gx', cfg.id || '');
    var cv = S.canvas = document.createElement('canvas'); cv.className = 'gx-cv'; root.appendChild(cv); var ctx = S.ctx = cv.getContext('2d');
    box.appendChild(root);
    var timers = [], intervals = [], listeners = [], rafId = 0, last = 0, upd = null, drw = null, ro = null, offKeys = null;
    S.fx = GX.fx(); S.audio = GX.audio(opts.sound !== false);
    S.on = function (el, type, fn, o) { el.addEventListener(type, fn, o); listeners.push([el, type, fn, o]); return fn; };
    S.later = function (fn, ms) { var id = setTimeout(function () { var i = timers.indexOf(id); if (i >= 0) timers.splice(i, 1); if (!S.dead) fn(); }, ms); timers.push(id); return id; };
    S.every = function (fn, ms) { var id = setInterval(function () { if (!S.dead && !S.paused) fn(); }, ms); intervals.push(id); return id; };
    S.clearLater = function (id) { clearTimeout(id); var i = timers.indexOf(id); if (i >= 0) timers.splice(i, 1); };
    S.sfx = function (n, o2) { S.audio.sfx(n, o2); };
    S.learn = GX.Learn({ items: opts.items, review: opts.review, subject: opts.subject, difficulty: opts.difficulty, mode: opts.mode, seed: opts.seed, passRate: opts.passRate });
    S.syl = function (it) { try { if (typeof opts.syllables === 'function' && it && it.en) return String(opts.syllables(it.en) || ''); } catch (e) { /* */ } return it && it.syl ? it.syl : ''; };
    S.speak = function (text, lang) {
      if (!text || S.audio.muted() || opts.sound === false) return;
      try { if (typeof opts.speak === 'function') { opts.speak(text, lang || 'en-US'); return; } } catch (e) { /* */ }
      try { var u = new SpeechSynthesisUtterance(text); u.lang = lang || 'en-US'; u.rate = .85; speechSynthesis.cancel(); speechSynthesis.speak(u); } catch (e) { /* */ }
    };
    /* a fresh Learn for 'play again': maths gets new questions from the host (opts.regen), English replays the same words */
    S.newLearn = function () {
      var r = null; try { if (typeof opts.regen === 'function') r = opts.regen(); } catch (e) { /* */ }
      if (r && r.items && r.items.length >= 4) { opts.items = r.items; if (r.review) opts.review = r.review; }
      S.learn = GX.Learn({ items: opts.items, review: opts.review, subject: opts.subject, difficulty: opts.difficulty, mode: opts.mode, passRate: opts.passRate });
      return S.learn;
    };
    S.say = function (it) { if (it && it.en) S.speak(it.en, 'en-US'); };
    function fit() {
      var r = box.getBoundingClientRect(), w = Math.max(160, Math.round(r.width || root.clientWidth || 320)), h = Math.max(160, Math.round(r.height || root.clientHeight || 480)), d = Math.min(window.devicePixelRatio || 1, 2, S.dprCap || 2);
      if (w === S.W && h === S.H && d === S.dpr && cv.width) return; S.W = w; S.H = h; S.dpr = d; cv.width = Math.round(w * d); cv.height = Math.round(h * d);
      ctx.setTransform(d, 0, 0, d, 0, 0); S.compact = h < 480 || w < 340; S.landscape = w > h * 1.15; if (cfg.onResize) cfg.onResize(w, h, S);
    }
    S.fit = fit; fit();
    try { ro = new ResizeObserver(fit); ro.observe(box); } catch (e) { S.on(window, 'resize', fit); }
    S.on(root, 'pointerdown', function (e) { if (e.pointerType === 'touch') S.touch = true; S.audio.unlock(); }, { passive: true });
    S.on(window, 'keydown', function () { S.audio.unlock(); }, { passive: true });
    S.on(document, 'visibilitychange', function () { if (document.hidden && !S.dead && !S.ended && cfg.autoPause !== false && !S.paused) S.openPause(); });
    S.loop = function (u, d) { upd = u; drw = d; if (!rafId) { last = 0; rafId = requestAnimationFrame(frame); } };
    function frame(ts) {
      rafId = 0; if (S.dead) return; rafId = requestAnimationFrame(frame);
      if (!last) last = ts; var dt = Math.min(.05, (ts - last) / 1000); last = ts; S.frameMs = (S.frameMs || 0) * .95 + dt * 1000 * .05;
      if (!S.paused) { S._slow = (S.frameMs > 24 && !document.hidden) ? (S._slow || 0) + 1 : Math.max(0, (S._slow || 0) - 2); if (S._slow > 90 && S.dpr > 1 && !cfg.fixedDpr) { S._slow = 0; S.dprCap = Math.max(1, S.dpr - .25); S.dpr = 0; fit(); } }
      if (S.paused) return; S.t += dt; S.fx.update(dt);
      if (upd) upd(dt); var sh = S.fx.begin(ctx); if (drw) drw(ctx, S.W, S.H); S.fx.draw(ctx, S.W, S.H); S.fx.end(ctx, sh);
    }
    S._step = function (n, dt) { dt = dt || 1 / 60; for (var i = 0; i < n && !S.dead; i++) { S.t += dt; S.fx.update(dt); if (upd) upd(dt); } if (drw) { drw(ctx, S.W, S.H); S.fx.draw(ctx, S.W, S.H); } };
    /* physical keyboard: letters, digits, - . /, Backspace, Enter, Escape, arrows, space */
    S.keys = function (h) {
      if (offKeys) offKeys(); h = h || {};
      function kd(e) {
        if (S.dead || e.metaKey || e.ctrlKey || e.altKey) return; var k = e.key, used = true;
        if (S.paused && k !== 'Escape') return;
        if (k === 'Escape') { if (h.onEsc) h.onEsc(e); else S.paused ? S.closePause() : S.openPause(); }
        else if (k === 'Backspace') { if (h.onBack) h.onBack(e); else used = false; } else if (k === 'Enter') { if (h.onEnter) h.onEnter(e); else used = false; }
        else if (k.indexOf('Arrow') === 0) { if (h.onArrow) h.onArrow(k.slice(5).toLowerCase(), e); else used = false; }
        else if (k === ' ') { if (h.onSpace) h.onSpace(e); else used = false; }
        else if (k.length === 1) { if (h.onChar) h.onChar(k, e); else used = false; } else used = false;
        if (used) e.preventDefault();
      }
      window.addEventListener('keydown', kd); offKeys = function () { window.removeEventListener('keydown', kd); offKeys = null; };
    };
    S.ui = GX.ui(root, S);
    S.openPause = function () {
      if (S.dead || S.paused || S.ended) return; S.paused = true; S.audio.stopMusic();
      S.ui.pause({ muted: S.audio.muted(), music: S.audio.musicOn(), onMusic: function (v) { S.audio.setMusicOn(v); }, onResume: function () { S.closePause(); }, onRestart: function () { S.paused = false; if (cfg.onRestart) cfg.onRestart(); }, onMute: function (v) { S.audio.setMuted(v); }, onExit: function () { S.paused = false; if (opts.onExit) opts.onExit(); } });
    };
    S.closePause = function () { if (!S.paused) return; S.paused = false; S.ui.close('pause'); last = 0; if (cfg.music) S.audio.music(cfg.music); if (cfg.onResume) cfg.onResume(); };
    S.pause = S.openPause; S.resume = S.closePause;
    /* finish: ask Learn for the report, play the fanfare, hand it to the host (coins) and show the result card; only once */
    S.finish = function (x) {
      if (S.ended || S.dead) return null; S.ended = true; S.audio.stopMusic();
      var res = S.learn.result(Object.assign({ difficulty: opts.difficulty, mode: opts.mode }, x || {})); res.game = cfg.id || ''; res.level = opts.level ? { w: opts.level.w, s: opts.level.s } : null;
      var coins = 0; try { if (typeof opts.onFinish === 'function') coins = Number(opts.onFinish(JSON.parse(JSON.stringify(res)))) || 0; } catch (e) { /* */ }
      res.coins = coins; S.result = res;
      S.sfx(res.passed ? 'win' : 'lose'); if (res.passed) { S.fx.confetti(S.W, { n: 90 }); S.fx.flash('#ffe9a8', .3); }
      S.later(function () { S.ui.result(res, { coins: coins, canNext: !!opts.onNext && res.passed, onRetry: function () { S.ui.close('result'); if (cfg.onRestart) cfg.onRestart(); }, onNext: function () { if (opts.onNext) opts.onNext(); }, onExit: function () { if (opts.onExit) opts.onExit(); } }); }, res.passed ? 900 : 450);
      return res;
    };
    S.destroy = function () {
      if (S.dead) return; S.dead = true; try { S.ui.closeAll(); } catch (e) { /* */ } if (rafId) cancelAnimationFrame(rafId); rafId = 0; timers.forEach(clearTimeout); intervals.forEach(clearInterval); timers = []; intervals = [];
      listeners.forEach(function (l) { l[0].removeEventListener(l[1], l[2], l[3]); }); listeners = []; if (offKeys) offKeys(); if (ro) { try { ro.disconnect(); } catch (e) { /* */ } } S.audio.destroy(); S.fx.clear();
      try { speechSynthesis.cancel(); } catch (e) { /* */ } if (cfg.onDestroy) { try { cfg.onDestroy(S); } catch (e) { /* */ } } if (root.parentNode) root.parentNode.removeChild(root);
    };
    S.handle = function () { return { destroy: S.destroy, pause: S.openPause, resume: S.closePause }; };
    return S;
  };

  /* ------------------------------------------------------------------ ui: overlays inside the game root */
  GX.ui = function (root, S) {
    var U = {}, ovs = {}, okChip = null;
    function ov(name, html, cls, onKey) {
      U.close(name); var el = document.createElement('div'); el.className = 'gx-ov ' + (cls || ''); if (name !== 'learn') { el.style.pointerEvents = 'none'; setTimeout(function () { el.style.pointerEvents = ''; }, 380); } el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.innerHTML = html; root.appendChild(el); ovs[name] = { el: el, onKey: onKey }; return el;
    }
    U.close = function (name) { var o = ovs[name]; if (!o) return; if (o.timer) clearInterval(o.timer); if (o.el.parentNode) o.el.parentNode.removeChild(o.el); if (o.off) o.off(); delete ovs[name]; };
    U.closeAll = function () { Object.keys(ovs).forEach(U.close); };
    U.open = function (name) { return !!ovs[name]; };
    function kbd(name, fn) { var t0 = performance.now(); var h = function (e) { if (S.dead || (name !== 'learn' && performance.now() - t0 < 380)) return; fn(e); }; window.addEventListener('keydown', h); ovs[name].off = function () { window.removeEventListener('keydown', h); }; }
    function sylOf(it) { return S.syl(it); }
    function picOf(it) { if (it.img) return '<img src="' + esc(it.img) + '" alt="" draggable="false">'; return it.emoji ? '<span class="gx-emo">' + esc(it.emoji) + '</span>' : ''; }

    /* preview deck: the 8 items of the level, one card each (picture, word with syllables, Chinese, example); tap the card to hear it */
    U.preview = function (items, o) {
      o = o || {}; var i = 0, math = items[0] && (items[0].kind === 'math' || items[0].en == null);
      var el = ov('preview', '<div class="gx-card gx-pv"><div class="gx-sub" data-r="n"></div><div class="face" role="button" tabindex="0" aria-label="播放讀音" data-r="face"></div><div class="gx-dots" data-r="dots"></div><div class="gx-row"><button type="button" class="gx-btn ghost" data-r="prev" aria-label="上一張">' + ico('back', 22) + '</button><button type="button" class="gx-btn" data-r="go">' + ico('play', 22) + '<span data-r="gol">開始</span></button><button type="button" class="gx-btn ghost" data-r="nx" aria-label="下一張" style="transform:scaleX(-1)">' + ico('back', 22) + '</button></div></div>', 'pv');
      var q = function (r) { return el.querySelector('[data-r="' + r + '"]'); };
      function show() {
        var it = items[i], sy = sylOf(it); q('n').textContent = (i + 1) + ' / ' + items.length;
        q('face').innerHTML = math ? '<div class="gx-big" style="font-size:clamp(28px,8vw,38px)">' + esc(it.q) + '</div><div class="gx-big" style="font-size:44px;color:' + GOOD + '">' + esc(it.a) + '</div>' + (it.hint ? '<div class="eg">' + esc(it.hint) + '</div>' : '') : '<div class="pic">' + picOf(it) + '</div><div class="gx-big en">' + esc(it.en) + '</div>' + (sy && sy !== it.en ? '<div class="gx-syl">' + esc(sy) + '</div>' : '') + '<div class="zh">' + esc(it.zh) + '</div>' + (it.ex ? '<div class="eg">' + esc(it.ex) + '</div>' : '');
        q('dots').innerHTML = items.map(function (_, k) { return '<i class="' + (k === i ? 'on' : '') + '"></i>'; }).join(''); S.sfx('flip'); if (!math) S.say(it);
      }
      function go(d) { i = (i + d + items.length) % items.length; show(); }
      q('prev').onclick = function () { go(-1); }; q('nx').onclick = function () { go(1); };
      q('face').onclick = function () { if (!math) S.say(items[i]); S.sfx('tap'); };
      var startX = null; el.addEventListener('pointerdown', function (e) { startX = e.clientX; }); el.addEventListener('pointerup', function (e) { if (startX != null && Math.abs(e.clientX - startX) > 50) go(e.clientX < startX ? 1 : -1); startX = null; });
      q('go').onclick = function () { U.close('preview'); if (o.onStart) o.onStart(); };
      kbd('preview', function (e) { if (e.key === 'ArrowRight') go(1); else if (e.key === 'ArrowLeft') go(-1); else if (e.key === 'Enter') { e.preventDefault(); q('go').click(); } });
      show(); q('go').focus({ preventScroll: true }); return el;
    };

    /* wrong-answer card: stops the world, shows the right answer big, reads it twice, and cannot be dismissed before holdMs */
    U.learn = function (it, o) {
      o = o || {}; var hold = o.holdMs || HOLD_WRONG_MS, math = it.kind === 'math' || it.en == null, sy = sylOf(it), t0 = performance.now(), done = false;
      var body = math
        ? '<div class="lab">正確答案</div><div class="zh" style="margin:6px 0">' + esc(it.q) + '</div><div class="gx-big big">' + esc(it.a) + '</div>' + (it.explain ? '<div class="eg">' + esc(it.explain) + '</div>' : '')
        : '<div class="lab">正確答案</div><div class="pic">' + picOf(it) + '</div><div class="gx-big big">' + esc(it.en) + '</div>' + (sy && sy !== it.en ? '<div class="gx-syl">' + esc(sy) + '</div>' : '') + '<div class="zh">' + esc(it.zh) + '</div>' + (o.typed ? '<div class="you">' + esc(o.typed) + '</div>' : '') + (it.ex ? '<div class="eg">' + esc(it.ex) + '</div>' : '');
      var el = ov('learn', '<div class="gx-card gx-learn">' + body + '<div class="gx-row"><button type="button" class="gx-btn gx-hold" data-r="ok" disabled><i></i><span>繼續</span></button>' + (math ? '' : '<button type="button" class="gx-btn ghost" data-r="say" aria-label="再聽一次">' + ico('speaker', 22) + '</button>') + '</div></div>');
      var btn = el.querySelector('[data-r="ok"]'), bar = btn.querySelector('i');
      function fin() { if (done || performance.now() - t0 < hold) return; done = true; U.close('learn'); if (o.onDone) o.onDone(); }
      btn.onclick = fin; var sb = el.querySelector('[data-r="say"]'); if (sb) sb.onclick = function () { S.say(it); };
      var tm = setInterval(function () { var p = Math.min(1, (performance.now() - t0) / hold); bar.style.width = (p * 100) + '%'; if (p >= 1) { btn.disabled = false; btn.firstElementChild.style.width = '0'; btn.lastChild.textContent = '繼續'; clearInterval(tm); } }, 50);
      ovs.learn.timer = tm; kbd('learn', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fin(); } });
      if (!math) { S.say(it); S.later(function () { if (ovs.learn) S.say(it); }, 1100); } btn.focus({ preventScroll: true }); return el;
    };
    /* right-answer chip: non-blocking, about 0.9 s */
    U.ok = function (it, o) {
      o = o || {}; if (okChip && okChip.parentNode) okChip.parentNode.removeChild(okChip); var math = it.kind === 'math' || it.en == null, sy = sylOf(it);
      var el = document.createElement('div'); el.className = 'gx-okchip'; if (o.top != null) el.style.top = typeof o.top === 'number' ? o.top + 'px' : o.top; if (o.bottom != null) { el.style.top = 'auto'; el.style.bottom = typeof o.bottom === 'number' ? o.bottom + 'px' : o.bottom; } el.innerHTML = ico('check', 22) + (math ? '<b>' + esc(it.a) + '</b>' : '<b>' + esc(it.en) + '</b>' + (sy && sy !== it.en ? '<em class="gx-syl">' + esc(sy) + '</em>' : '') + '<em>' + esc(it.zh) + '</em>'); root.appendChild(el); okChip = el;
      S.later(function () { if (el.parentNode) el.parentNode.removeChild(el); if (okChip === el) okChip = null; }, o.ms || HOLD_OK_MS);
    };
    function short(q) { q = String(q || '').replace(/（[^）]*）/g, ''); return q.length > 18 ? q.slice(0, 17) + '…' : q; }
    U.result = function (res, o) {
      o = o || {}; var miss = (res.missed || []).slice(0, 8), more = (res.missed || []).length - miss.length;
      var stars = [1, 2, 3, 4, 5].map(function (k) { return '<span style="display:contents">' + ico('star', 44).replace('<svg ', '<svg class="' + (k <= res.stars ? 'on' : '') + '" style="animation-delay:' + (k * .12) + 's" ') + '</span>'; }).join('');
      var el = ov('result', '<div class="gx-card gx-res"><h1>' + (res.passed ? (res.stars >= 5 ? '太棒了！' : '過關！') : (res.cleared ? '再試一次' : '再接再厲')) + '</h1><div class="gx-stars" aria-label="' + res.stars + ' 星">' + stars + '</div>'
        + (res.cleared && !res.passed && res.passRate ? '<div class="gx-sub gx-need">要一次答對 ' + Math.round(res.passRate * 100) + '% 才過關</div>' : '') + '<div class="gx-chips"><span class="gx-chip">' + ico('check', 18) + Math.round(res.firstTryAccuracy * 100) + '% 一次答對</span><span class="gx-chip">' + ico('flame', 18) + res.maxCombo + ' 連擊</span><span class="gx-chip">' + ico('clock', 18) + res.seconds + ' 秒</span>' + (o.coins ? '<span class="gx-chip coin">' + ico('coin', 18) + '+' + o.coins + '</span>' : '') + '</div>'
        + (miss.length ? '<div class="gx-sub" style="margin-bottom:2px">要再記一記</div><div class="gx-miss">' + miss.map(function (m) { return '<span>' + esc(m.en || short(m.q) + ' = ' + m.a) + (m.en && m.zh ? '<small>' + esc(m.zh) + '</small>' : '') + '</span>'; }).join('') + (more > 0 ? '<span>+' + more + '</span>' : '') + '</div>' : (res.firstTryAccuracy >= 1 ? '<div class="gx-sub">全部一次答對！</div>' : '<div class="gx-sub">下次會更好</div>'))
        + '<details class="gx-rep"><summary>逐項報告</summary><div class="gx-replist">' + (res.perItem || []).filter(function (p) { return !p.rv; }).map(function (p) { return '<div class="r ' + (p.firstOk ? 'g' : p.ok ? 'y' : 'b') + '"><i>' + (p.firstOk ? ico('check', 16) : p.ok ? ico('replay', 16) : ico('cross', 16)) + '</i><b>' + esc(p.en || short(p.q)) + '</b><em>' + esc(p.en ? p.zh : '= ' + p.a) + '</em><u>' + (p.ms ? Math.max(1, Math.round(p.ms / 1000)) + ' 秒' : '') + '</u></div>'; }).join('') + '</div></details>'
        + '<div class="gx-row"><button type="button" class="gx-btn ghost" data-r="back" aria-label="返回">' + ico('home', 22) + '</button><button type="button" class="gx-btn ghost" data-r="again">' + ico('replay', 22) + '<span>再玩</span></button>' + (o.canNext ? '<button type="button" class="gx-btn" data-r="next"><span>下一關</span>' + ico('next', 22) + '</button>' : '') + '</div></div>');
      var q = function (r) { return el.querySelector('[data-r="' + r + '"]'); };
      q('back').onclick = function () { if (o.onExit) o.onExit(); }; q('again').onclick = function () { if (o.onRetry) o.onRetry(); }; if (q('next')) q('next').onclick = function () { if (o.onNext) o.onNext(); };
      var first = q('next') || q('again'); if (first) first.focus({ preventScroll: true }); kbd('result', function (e) { if (e.key === 'Enter') { e.preventDefault(); (q('next') || q('again')).click(); } });
    };
    U.pause = function (o) {
      var el = ov('pause', '<div class="gx-card" style="max-width:300px"><h1>暫停</h1><div class="gx-row" style="flex-direction:column;align-items:stretch"><button type="button" class="gx-btn" data-r="res">' + ico('play', 22) + '<span>繼續</span></button><button type="button" class="gx-btn ghost" data-r="mute">' + ico(o.muted ? 'mute' : 'speaker', 22) + '<span data-r="ml">' + (o.muted ? '開聲音' : '關聲音') + '</span></button><button type="button" class="gx-btn ghost" data-r="mus">' + ico('sparkle', 22) + '<span>' + (o.music === false ? '開音樂' : '關音樂') + '</span></button><button type="button" class="gx-btn ghost" data-r="re">' + ico('replay', 22) + '<span>重來</span></button><button type="button" class="gx-btn ghost" data-r="ex">' + ico('home', 22) + '<span>離開</span></button></div></div>');
      var q = function (r) { return el.querySelector('[data-r="' + r + '"]'); }, m = !!o.muted;
      q('res').onclick = function () { U.close('pause'); if (o.onResume) o.onResume(); }; q('mute').onclick = function () { m = !m; if (o.onMute) o.onMute(m); q('mute').innerHTML = ico(m ? 'mute' : 'speaker', 22) + '<span>' + (m ? '開聲音' : '關聲音') + '</span>'; };
      var mu = o.music !== false; q('mus').onclick = function () { mu = !mu; if (o.onMusic) o.onMusic(mu); q('mus').innerHTML = ico('sparkle', 22) + '<span>' + (mu ? '關音樂' : '開音樂') + '</span>'; };
      q('re').onclick = function () { U.close('pause'); if (o.onRestart) o.onRestart(); }; q('ex').onclick = function () { U.close('pause'); if (o.onExit) o.onExit(); };
      kbd('pause', function (e) { if (e.key === 'Enter') { e.preventDefault(); q('res').click(); } }); q('res').focus({ preventScroll: true });
    };
    /* first-time how-to: at most three icon cards with a few words each; remembered per game */
    U.howSeen = function (id) { try { return localStorage.getItem('wq37-gx-how-' + id) === '1'; } catch (e) { return false; } };
    U.how = function (id, title, frames, onDone, force) {
      if (!force && U.howSeen(id)) { onDone(); return false; }
      var el = ov('how', '<div class="gx-card gx-how"><h1>' + esc(title) + '</h1><div class="steps">' + frames.map(function (f) { return '<div class="st"><span class="i gx-emo">' + esc(f.icon) + '</span><b>' + esc(f.text) + '</b></div>'; }).join('') + '</div><div class="gx-row"><button type="button" class="gx-btn" data-r="ok">' + ico('play', 22) + '<span>知道了</span></button></div></div>');
      el.querySelector('[data-r="ok"]').onclick = function () { try { localStorage.setItem('wq37-gx-how-' + id, '1'); } catch (e) { /* */ } U.close('how'); onDone(); }; kbd('how', function (e) { if (e.key === 'Enter') { e.preventDefault(); el.querySelector('[data-r="ok"]').click(); } }); el.querySelector('[data-r="ok"]').focus({ preventScroll: true }); return true;
    };
    U.banner = function (text, sub, ms) {
      var el = document.createElement('div'); el.className = 'gx-banner'; el.innerHTML = '<b>' + esc(text) + '</b>' + (sub ? '<small>' + esc(sub) + '</small>' : ''); root.appendChild(el);
      S.later(function () { if (el.parentNode) el.parentNode.removeChild(el); }, ms || 1300); return el;
    };
    return U;
  };

  /* shared level title chip for HUDs: "第 3 關 · 小三" */
  GX.levelText = function (lv) { if (!lv) return ''; return (lv.boss ? '魔王關' : '第 ' + ((lv.s | 0) + 1) + ' 關') + (lv.grade ? ' · ' + lv.grade : ''); };
  GX.HOLD_WRONG_MS = HOLD_WRONG_MS; GX.HOLD_OK_MS = HOLD_OK_MS;
  globalThis.WQ37GX = GX;
  if (typeof module !== 'undefined') module.exports = GX;
})();
