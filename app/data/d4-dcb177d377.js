
/* 星際跑酷 Star Dash - side-view 3-lane runner vocabulary mini game (self-contained, no assets, one canvas). */
(function () {
  'use strict';
  var FONT = '"PingFang HK","Noto Sans HK","Microsoft JhengHei","WenQuanYi Zen Hei","Noto Sans CJK TC",system-ui,sans-serif';
  var EFONT = '"Arial Rounded MT Bold","Trebuchet MS","Noto Sans",Arial,sans-serif';
  var EMOJI = '"Noto Color Emoji","Apple Color Emoji","Segoe UI Emoji",sans-serif';
  var TWO_PI = Math.PI * 2;
  var DARK = '#2b1d4a', INK = '#0B1030', GOLD = '#FFC94A';
  var DOORC = [['#ff7eb3', '#e0357f'], ['#ffc83d', '#e8890c'], ['#4db8ff', '#2272e0']];
  var GAPSEC = [2.3, 2.0, 1.7, 1.4, 1.2];
  var OBSP = [0.5, 0.55, 0.65, 0.75, 0.85];
  var WARN = 640;
  var JD = 0.8, SLD = 0.7, JCLR = 0.3, BEAMT = 0.8, STORE = 'wq37-run-best';
  var FALLBACK = [{ en: 'sun', zh: '太陽', emoji: '☀️' }, { en: 'moon', zh: '月亮', emoji: '🌙' }, { en: 'star', zh: '星星', emoji: '⭐' }];

  var WORLDS = [
    { zh: '彩虹草原', sky: ['#5ec3ff', '#b5e8ff', '#effcff'], ground: ['#7bd36f', '#3f9f4d'], track: 'rgba(60,110,40,0.38)', edge: '#fff7c2', tuft: '#2f8f3f', obs: ['🪨', '🐌', '🦔', '🪵'], boss: '🐲', amb: 'petal', ambc: '#ffc6e0' },
    { zh: '迷霧森林', sky: ['#1f6a56', '#58b88a', '#c9efb8'], ground: ['#3c8a4f', '#1f5a36'], track: 'rgba(20,50,30,0.42)', edge: '#d8ffb0', tuft: '#16502f', obs: ['🍄', '🪵', '🐗', '🕸️'], boss: '🦖', amb: 'leaf', ambc: '#b8e65a' },
    { zh: '金沙沙漠', sky: ['#ff9a4d', '#ffcf80', '#fff0c4'], ground: ['#f4cd7e', '#d9a24a'], track: 'rgba(140,80,20,0.36)', edge: '#fffbe0', tuft: '#b97d2a', obs: ['🌵', '🪨', '🦂', '🏺'], boss: '🦂', amb: 'sand', ambc: '#fff3cf' },
    { zh: '火焰火山', sky: ['#2a1238', '#8a2f48', '#ff8a3d'], ground: ['#3a2430', '#1c0f1c'], track: 'rgba(0,0,0,0.42)', edge: '#ffb066', tuft: '#ff6a2a', obs: ['🪨', '🔥', '🌋', '♨️'], boss: '🐉', amb: 'ember', ambc: '#ff9d3d' },
    { zh: '星空宇宙', sky: ['#070722', '#241a5e', '#5a2d96'], ground: ['#2a1f66', '#120c36'], track: 'rgba(120,90,255,0.28)', edge: '#9ff6ff', tuft: '#7f6bff', obs: ['🛸', '☄️', '🪐', '🛰️'], boss: '👾', amb: 'star', ambc: '#ffffff' }
  ];

  /* five bosses: attack lists per phase. fall=rocks with warning marker, projL/projH=low/high projectiles, beamL/beamH=sweep (jump/slide), laser=lane beam */
  var BOSS = [
    { name: '草原龍王', a1: ['fall'], a2: ['fall2', 'projL'], fe: '🪨', pl: '🪨', ph: '🦅', col: '#7bd36f' },
    { name: '森林暴龍', a1: ['projL'], a2: ['projL2', 'projH'], fe: '🌳', pl: '🪵', ph: '🦇', col: '#58b88a' },
    { name: '沙漠蠍王', a1: ['beamL'], a2: ['beamH', 'beamL'], fe: '🌵', pl: '🦂', ph: '🦅', col: '#ffcf80' },
    { name: '火山炎龍', a1: ['laser'], a2: ['laser2', 'projH'], fe: '🌋', pl: '🔥', ph: '🔥', col: '#ff8a3d' },
    { name: '星空魔王', a1: ['beamH', 'fall'], a2: ['laser', 'beamL', 'fall2'], fe: '☄️', pl: '🛸', ph: '👾', col: '#b07bff' }
  ];
  var PU = { slow: { em: '⏳', dur: 6, col: '#7fd8ff', zh: '慢動作' }, x2: { em: '×2', dur: 8, col: '#ffd23f', zh: '雙倍分' }, shield: { em: '🛡️', dur: 12, col: '#9ff6ff', zh: '護盾' }, magnet: { em: '🧲', dur: 7, col: '#c8a0ff', zh: '磁力' }, revive: { em: '👼', dur: 0, col: '#7dff6a', zh: '復活' } };
  var PUK = ['slow', 'x2', 'shield', 'magnet', 'revive', 'x2', 'shield'];
  var MODES = { story: { id: 'story', zh: '闖關模式', icon: '🗺️' }, endless: { id: 'endless', zh: '無盡挑戰', icon: '♾️' } };
  function loadBest() { var b = { dist: 0, score: 0 }; try { var o = JSON.parse(localStorage.getItem(STORE) || 'null'); if (o) { b.dist = +o.dist || 0; b.score = +o.score || 0; } } catch (e) { /* */ } return b; }
  function saveBest(b) { try { localStorage.setItem(STORE, JSON.stringify(b)); } catch (e) { /* */ } }

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
  var LC_OK = { min: 0.8, max: 2.4 }, LC_BAD = { min: 2.0, max: Infinity, again: 2.6 };   /* R3.38: a wrong answer card waits for the child */
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
  var seedOverride = null;
  var API = { start: start, modes: MODES, getBest: loadBest };

  function start(container, opts) {
    if (current) { try { current.destroy(); } catch (e) { /* */ } }
    opts = opts || {};
    var doc = document, dead = false, exited = false;
    var words = (opts.words || []).filter(function (w) { return w && w.en && w.zh; });
    for (var fi = 0; words.length < 3 && fi < FALLBACK.length; fi++) words.push(FALLBACK[fi]);
    var endless = opts.mode === 'endless';
    var worldI = clamp(opts.world | 0, 0, 4), stageI = endless ? 0 : clamp(opts.stage | 0, 0, 2), diff = clamp(Math.round(opts.difficulty || 2), 1, 5);
    var ch = opts.character || { icon: '🐼', name: '熊貓', perk: '' }, perk = ch.perk || '';
    var icon = ch.icon || '🐼', W = WORLDS[worldI], B = BOSS[worldI];
    /* R3.18: collectible characters have a transparent full-body illustration (assets/r318/ch_<id>.webp); the emoji stays as the fallback */
    var chId = ch.id ? String(ch.id).replace(/[^a-zA-Z0-9_-]/g, '') : '', chSrc = chId ? (opts.assetBase || 'assets/r318/') + 'ch_' + chId + '.webp' : '', chImg = null, chDraws = 0;
    if (chSrc && typeof Image !== 'undefined') { chImg = new Image(); chImg.decoding = 'async'; chImg.src = chSrc; }
    function chReady() { return !!(chImg && chImg.complete && chImg.naturalWidth > 0); }
    /* R3.20: more, closer gates (was [6, 8, 10] gates ~16 s apart); see README_R3_20.md */
    var N = endless ? 1e9 : [10, 12, 14][stageI], isBoss = !endless && stageI === 2, bossMax = 4;
    var base = 240 + worldI * 22 + stageI * 18 + diff * 28;
    var startHearts = perk === 'heart' ? 4 : 3, maxHearts = 5;
    var sound = opts.sound !== false;
    var reduced = false;
    try { reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (e) { /* */ }
    var canSpeak = false;
    try { canSpeak = !!(sound && window.speechSynthesis && window.SpeechSynthesisUtterance); } catch (e) { canSpeak = false; }
    var trailCol; (function () { var s = 0; for (var i = 0; i < icon.length; i++) s += icon.charCodeAt(i) * (i + 3); trailCol = 'hsl(' + (s * 37 % 360) + ',95%,66%)'; })();
    var seedBase = seedOverride != null ? seedOverride : (Math.random() * 1e9) | 0;
    seedOverride = null;

    /* ----- DOM ----- */
    var styleEl = doc.createElement('style');
    var GLASS = 'linear-gradient(160deg,rgba(30,38,96,.94),rgba(18,24,68,.94))';
    styleEl.textContent =
      '.wq37r-root{--m:16px;position:relative;width:100%;height:100%;overflow:hidden;touch-action:none;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent;font-family:' + FONT + ';background:#0b1030}' +
      '.wq37r-root canvas{display:block;width:100%;height:100%}' +
      '.wq37r-safe{position:absolute;inset:0;visibility:hidden;pointer-events:none;padding:env(safe-area-inset-top) env(safe-area-inset-right) env(safe-area-inset-bottom) env(safe-area-inset-left)}' +
      '.wq37r-btn{position:absolute;border:1px solid rgba(255,255,255,.28);border-radius:50%;background:rgba(11,16,48,.7);color:#F4F6FF;font:800 14px/1 ' + FONT + ';display:none;flex-direction:column;align-items:center;justify-content:center;gap:2px;box-shadow:0 3px 0 rgba(0,0,0,.35);touch-action:none;cursor:pointer;padding:0;-webkit-backdrop-filter:blur(4px);backdrop-filter:blur(4px)}' +
      '.wq37r-btn svg{display:block;width:26px;height:26px;pointer-events:none}' +
      '.wq37r-btn i{font:800 14px/1 ' + FONT + ';font-style:normal}' +
      '.wq37r-btn:active{transform:translateY(2px);box-shadow:0 1px 0 rgba(0,0,0,.35)}' +
      '.wq37r-btn:focus-visible,.wq37r-b:focus-visible{outline:3px solid ' + GOLD + ';outline-offset:2px}' +
      '.wq37r-touch .wq37r-ctl{display:flex}' +
      /* thumb groups: left = lanes (up, down); right = jump, slide; dash sits above the right group (beside it on wide, short screens) */
      '.wq37r-up,.wq37r-down,.wq37r-dash,.wq37r-jump,.wq37r-slide{width:64px;height:64px;bottom:calc(var(--m) + env(safe-area-inset-bottom))}' +
      '.wq37r-up{left:calc(var(--m) + env(safe-area-inset-left))}.wq37r-down{left:calc(var(--m) + 76px + env(safe-area-inset-left))}' +
      '.wq37r-slide{right:calc(var(--m) + env(safe-area-inset-right))}.wq37r-jump{right:calc(var(--m) + 76px + env(safe-area-inset-right));background:' + GOLD + ';color:#3B2600;border:0;box-shadow:0 4px 0 #C48A00}' +
      '.wq37r-dash{right:calc(var(--m) + 38px + env(safe-area-inset-right));bottom:calc(var(--m) + 76px + env(safe-area-inset-bottom));border-color:#7fe3ff}' +
      '@media (max-height:500px){.wq37r-dash{bottom:calc(var(--m) + env(safe-area-inset-bottom));right:calc(var(--m) + 152px + env(safe-area-inset-right))}}' +
      '.wq37r-pause{display:flex;top:calc(var(--m) - 4px + env(safe-area-inset-top));right:calc(var(--m) - 4px + env(safe-area-inset-right));width:48px;height:48px}' +
      '.wq37r-pause svg{width:22px;height:22px}' +
      '.wq37r-say{position:absolute;display:none;background:transparent;border:0;padding:0;cursor:pointer;border-radius:18px;touch-action:none}' +
      '.wq37r-ov{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:rgba(11,16,48,.6);-webkit-backdrop-filter:blur(6px);backdrop-filter:blur(6px);z-index:5;padding:10px;box-sizing:border-box}' +
      '.wq37r-card{background:' + GLASS + ';border:1px solid rgba(255,255,255,.14);border-radius:20px;box-shadow:0 12px 32px rgba(0,0,0,.4);padding:16px 18px 18px;text-align:center;color:#F4F6FF;width:100%;max-width:340px;max-height:100%;overflow:auto;box-sizing:border-box}' +
      '.wq37r-big{height:112px;display:flex;align-items:flex-end;justify-content:center;font-size:72px;line-height:1.1;font-family:' + EMOJI + '}' +
      '.wq37r-big img{height:112px;width:auto;max-width:100%;object-fit:contain;filter:drop-shadow(0 6px 8px rgba(0,0,0,.35))}' +
      '.wq37r-t{font-size:22px;font-weight:900;margin:4px 0;color:#F4F6FF}.wq37r-s{font-size:14px;font-weight:700;color:#AEB8E8;margin:4px 0 8px}' +
      '.wq37r-keys{display:flex;gap:8px;justify-content:center;margin:8px 0 6px}' +
      '.wq37r-key{flex:1;background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.18);border-radius:14px;padding:8px 2px;font-size:14px;font-weight:700;color:#F4F6FF}' +
      '.wq37r-key svg{display:block;width:26px;height:26px;margin:0 auto 3px;color:' + GOLD + '}' +
      '.wq37r-goal{display:inline-block;margin:6px 0 2px;padding:3px 14px;border-radius:20px;background:rgba(255,201,74,.14);border:1px solid ' + GOLD + ';color:' + GOLD + ';font-size:14px;font-weight:800}' +
      '.wq37r-stars{font-size:40px;letter-spacing:4px;color:' + GOLD + ';text-shadow:0 2px 0 #0B1030}' +
      '.wq37r-rec{display:inline-block;font-size:18px;font-weight:900;color:' + GOLD + ';margin:4px 0;padding:3px 14px;border-radius:20px;border:1px solid ' + GOLD + ';background:rgba(255,201,74,.14)}' +
      '.wq37r-row{font-size:16px;margin:4px 0;font-weight:700;color:#F4F6FF}' +
      '.wq37r-b{display:block;width:100%;font:900 22px ' + FONT + ';color:#3B2600;background:' + GOLD + ';border:0;border-bottom:4px solid #C48A00;border-radius:16px;padding:8px 24px;margin:10px 0 0;cursor:pointer;min-height:56px;touch-action:manipulation}' +
      '.wq37r-b.alt{background:rgba(255,255,255,.08);color:#F4F6FF;border:1px solid rgba(255,255,255,.28);min-height:48px;font-size:18px}' +
      '.wq37r-b:active{transform:translateY(2px);border-bottom-width:2px}' +
      '@media (max-height:430px){.wq37r-card{padding:10px 14px 12px;max-width:520px}.wq37r-big{height:72px;font-size:52px}.wq37r-big img{height:72px}.wq37r-t{font-size:18px;margin:2px 0}.wq37r-keys{margin:4px 0}.wq37r-b{min-height:48px;margin-top:6px}}' +
      '@media (prefers-reduced-motion:reduce){.wq37r-b:active,.wq37r-btn:active{transform:none}}';
    doc.head.appendChild(styleEl);
    var root = doc.createElement('div'); root.className = 'wq37r-root';
    var canvas = doc.createElement('canvas'); root.appendChild(canvas);
    var c = canvas.getContext('2d');
    var SVGP = {
      up: '<path d="M5 15l7-7 7 7"/>', down: '<path d="M5 9l7 7 7-7"/>',
      jump: '<path d="M6 11l6-6 6 6M6 18l6-6 6 6"/>', slide: '<path d="M4 7h10M4 12h14M6 17h8" /><path d="M18 8l3 4-3 4" />',
      dash: '<path d="M13 3L5 13.5h6L10 21l9-11.5h-6.5z" fill="currentColor" stroke="none"/>', pause: '<rect x="6" y="5" width="4" height="14" rx="1.5" fill="currentColor" stroke="none"/><rect x="14" y="5" width="4" height="14" rx="1.5" fill="currentColor" stroke="none"/>',
      sound: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5z" fill="currentColor"/><path d="M15.5 9.2a4 4 0 0 1 0 5.6M18.2 6.6a8 8 0 0 1 0 10.8"/>'
    };
    function svg(n) { return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + SVGP[n] + '</svg>'; }
    function mkBtn(cls, ic, label, sub) {
      var b = doc.createElement('button'); b.type = 'button'; b.className = 'wq37r-btn ' + cls; b.setAttribute('aria-label', label);
      b.innerHTML = svg(ic) + (sub ? '<i>' + sub + '</i>' : '');
      root.appendChild(b); return b;
    }
    var upBtn = mkBtn('wq37r-ctl wq37r-up', 'up', '上一線', '上線'), downBtn = mkBtn('wq37r-ctl wq37r-down', 'down', '下一線', '下線'), dashBtn = mkBtn('wq37r-ctl wq37r-dash', 'dash', '衝刺', '衝刺');
    var jumpBtn = mkBtn('wq37r-ctl wq37r-jump', 'jump', '跳', '跳'), slideBtn = mkBtn('wq37r-ctl wq37r-slide', 'slide', '滑', '滑');
    var pauseBtn = mkBtn('wq37r-pause', 'pause', '暫停');
    var safeEl = doc.createElement('div'); safeEl.className = 'wq37r-safe'; root.appendChild(safeEl);
    var SAFE = { l: 0, r: 0, t: 0, b: 0 }, hudRec = null, hudLast = [];
    var sayBtn = doc.createElement('button'); sayBtn.type = 'button'; sayBtn.className = 'wq37r-say'; sayBtn.setAttribute('aria-label', '重播讀音'); root.appendChild(sayBtn);
    var overlay = null;
    container.appendChild(root);

    /* ----- game state ----- */
    var state = 'ready', touchMode = false;
    var cw = 320, chh = 180, dpr = 1, S = 1, L = { LW: 960, LH: 600 };
    var rng, trng, lrng, dist, scr, lane, vl, hearts, score, combo, maxCombo, correct, wrong, coins, heartsLost, shieldT;
    var obstacles, pickups, parts, floaters, toast, gate, genX, inv, dash, dashCd, magnet, slowT, x2T, shake, ts, bossStreak, bossOn, bossIn, bossDone, bossT, throwFlash;
    var jt, slideT, landT, slideBuf, patN, atks, atkT, atkN, bossHp, bossPhase, bossFlash, banner, scoreFrac, revive, reviveUsed, dodges, spokeN, sayShown = false, lastSpoken = '';
    var kSpawned = 0, gapK = 0, holdGate = false, prevGate, finishX, runTime, endT, cardShown, queue, lastWord, gateIdx, lastGateX, tAnim, trailT, lastResult, stagePassed, godMode, warnFlash, seedN = 0, bestRec = null;
    var quiet = false, amb = [], lines = [], rafId = 0, lastT = 0, avgMs = 0, ro = null, skyG = null, lastDashTxt = '';

    function resetGame() {
      rng = mulberry(seedBase + seedN * 7919); trng = mulberry((seedBase ^ 0x9e3779b9) + seedN); lrng = mulberry((seedBase ^ 0x51ed270b) + seedN * 31);
      lapses = 0; idleAsk = null; dist = 0; scr = scr || 0; lane = 1; vl = 1; hearts = startHearts; score = 0; combo = 0; maxCombo = 0; correct = 0; wrong = 0; coins = 0; heartsLost = 0;
      shieldT = perk === 'shield' ? 1e9 : 0; obstacles = []; pickups = []; parts = []; floaters = []; toast = null; gate = null; genX = 720;
      inv = 0; dash = 0; dashCd = 0; magnet = 0; slowT = 0; x2T = 0; shake = 0; ts = 1; bossStreak = 0; bossOn = false; bossIn = 0; bossDone = false; bossT = 0; throwFlash = 0;
      jt = 0; slideT = 0; landT = 0; slideBuf = 0; patN = 0; atks = []; atkT = 2; atkN = 0; bossHp = bossMax; bossPhase = 1; bossFlash = 0; banner = null; scoreFrac = 0;
      revive = false; reviveUsed = false; dodges = 0; spokeN = 0;
      finishX = 0; runTime = 0; endT = 0; cardShown = false; queue = []; lastWord = null; gateIdx = 0; lastGateX = 0; tAnim = 0; trailT = 0;
      holdGate = false; prevGate = null; lastResult = null; stagePassed = false; godMode = false; warnFlash = 0; bestRec = null;
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
    /* gate kinds: door (pick the right door), listen (door, word is spoken), spell (collect letters in order) */
    /* R3.20: gates are scheduled in run-seconds at the nominal speed (so the ramp does not squeeze them) and the
       slow-down zone is time based (about 1.6 s of travel at full speed, ~2.4 s once the slow-down bites). */
    function nomSpeed() { return base * (endless ? 1 + Math.min(0.8, dist / 36000) : 1 + 0.025 * Math.min(gateIdx, 10)) * (bossOn && !bossDone ? 1.1 : 1); }
    function inWarn(g) { return !!g && !g.judged && g.x - dist < g.wp; }
    function scheduleGate(first) {
      var boss = isBoss && gateIdx >= N - 3;
      var secs = first ? 4.5 + rng() * 2 : boss ? 3.5 + rng() * 1.3 : endless ? (5.2 + rng() * 1.4) * (1 - 0.15 * Math.min(1, dist / 36000)) : 5 + rng() * 1.5;
      var nv = nomSpeed(), gx = Math.max(lastGateX, dist) + secs * nv;
      var t = nextWord(), ds = pickDistractors(t), cl = (rng() * 3) | 0, di = 0, doors = [], kr = rng(), kind = 'door';
      if (!first && gateIdx > 0) { if (kr < 0.28 && /^[a-z]{2,7}$/i.test(t.en)) kind = 'spell'; else if (kr < 0.55) kind = 'listen'; }
      if (kind === 'spell') {
        gate = { kind: 'spell', wp: Math.max(450, nv * 1.6), x: gx, target: t, word: t.en.toLowerCase(), n: t.en.length, idx: 0, mis: 0, nx: gx, nextX: gx, cols: [], touched: false, judged: false, ok: false, reveal: 0, boss: boss };
      } else {
        for (var l = 0; l < 3; l++) doors.push(l === cl ? { lane: l, word: t.en, correct: true } : { lane: l, word: ds[di++].en, correct: false });
        gate = { kind: kind, wp: Math.max(450, nv * 1.6), x: gx, target: t, doors: doors, correctLane: cl, judged: false, ok: false, reveal: 0, boss: boss, spoken: false };
      }
      genX = Math.max(genX, lastGateX + 350); gapK = 0;
    }

    /* ----- audio / speech ----- */
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
      else if (k === 'jump') { tone(380, 760, 0.16, 'sine', 0.06); }
      else if (k === 'slide') { tone(520, 220, 0.18, 'triangle', 0.05); }
      else if (k === 'pu') { tone(500, 0, 0.08, 'square', 0.04); tone(750, 0, 0.08, 'square', 0.04, 0.07); tone(1000, 0, 0.14, 'square', 0.04, 0.14); }
      else if (k === 'boom') { tone(140, 40, 0.3, 'sawtooth', 0.09); }
      else if (k === 'win') { [523, 659, 784, 1046].forEach(function (f, i) { tone(f, 0, 0.22, 'triangle', 0.08, i * 0.13); }); }
      else if (k === 'lose') { tone(392, 0, 0.2, 'triangle', 0.07); tone(330, 0, 0.2, 'triangle', 0.07, 0.18); tone(262, 0, 0.4, 'triangle', 0.07, 0.36); }
    }
    function speak(w) {
      if (!canSpeak || dead) return;
      try { var ss = window.speechSynthesis; ss.cancel(); var u = new window.SpeechSynthesisUtterance(w); u.lang = 'en-US'; u.rate = 0.85; u.pitch = 1.1; ss.speak(u); spokeN++; lastSpoken = w; } catch (e) { /* */ }
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
      L = { LW: LW, LH: LH, portrait: portrait, K: Math.max(1, 1 / S) };   /* K keeps HUD text >= its css size on phones where the logical canvas is scaled down */
      var cs = getComputedStyle(safeEl);
      SAFE.l = parseFloat(cs.paddingLeft) || 0; SAFE.r = parseFloat(cs.paddingRight) || 0; SAFE.t = parseFloat(cs.paddingTop) || 0; SAFE.b = parseFloat(cs.paddingBottom) || 0;
      if (!portrait) {
        L.HUD = 84; var av = LH - L.HUD; L.gap = Math.min(112, av * 0.25); L.cy = L.HUD + av * 0.5 + 8; L.px = Math.min(LW * 0.2, 230);
        L.pn = { x: (LW - 400) / 2, y: 8, w: 400, h: 68 };
      } else {
        L.HUD = 206; var av2 = LH - L.HUD - 150; L.gap = Math.min(200, av2 * 0.27); L.cy = L.HUD + av2 * 0.5 + 12; L.px = LW * 0.25;
        L.pn = { x: 14, y: 86, w: LW - 28, h: 62 };
      }
      L.size = Math.min(L.gap * 0.72, 120); L.hor = L.cy - 1.5 * L.gap - 14; L.half = 1.5 * L.gap + 12;
      skyG = c.createLinearGradient(0, 0, 0, L.hor);
      skyG.addColorStop(0, W.sky[0]); skyG.addColorStop(0.6, W.sky[1]); skyG.addColorStop(1, W.sky[2]);
      L.groundG = c.createLinearGradient(0, L.hor, 0, LH); L.groundG.addColorStop(0, W.ground[0]); L.groundG.addColorStop(1, W.ground[1]);
      root.classList.toggle('wq37r-port', portrait);
      sayBtn.style.left = L.pn.x * S + 'px'; sayBtn.style.top = L.pn.y * S + 'px'; sayBtn.style.width = L.pn.w * S + 'px'; sayBtn.style.height = L.pn.h * S + 'px';
      if (!amb.length) for (var i = 0; i < 26; i++) amb.push({ x: Math.random() * 1000, y: Math.random() * 700, r: 1 + Math.random() * 3, ph: Math.random() * 6, v: 0.3 + Math.random() * 0.9 });
      if (!lines.length) for (i = 0; i < 12; i++) lines.push({ x: Math.random() * 1400, y: Math.random(), len: 70 + Math.random() * 110, v: 0.8 + Math.random() * 0.9 });
    }
    function kAt(sx) { return sx <= L.px ? 1 : 1 - 0.22 * Math.min(1.2, (sx - L.px) / (L.LW - L.px)); }
    function laneY(l, sx) { return L.cy + (l - 1) * L.gap * kAt(sx); }

    /* ----- overlays ----- */
    function h(tag, cls, text) { var e = doc.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
    function clearOverlay() { if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay); overlay = null; }
    function makeOverlay() { clearOverlay(); overlay = h('div', 'wq37r-ov'); var card = h('div', 'wq37r-card'); overlay.appendChild(card); root.appendChild(overlay); return card; }
    function btn(txt, cls, fn) { var b = h('button', 'wq37r-b ' + (cls || ''), txt); b.type = 'button'; b.addEventListener('click', function (e) { e.stopPropagation(); ensureAudio(); fn(); }); return b; }
    function plain(t) { try { return String(t).replace(/[\p{Extended_Pictographic}️‍]/gu, '').replace(/\s+/g, ' ').trim(); } catch (e) { return String(t); } }
    function keyTile(ic, txt) { var d = h('div', 'wq37r-key'); d.innerHTML = svg(ic); d.appendChild(doc.createTextNode(txt)); return d; }
    function showStart() {
      var card = makeOverlay(), big = h('div', 'wq37r-big');
      if (chSrc) {   /* illustration first; the emoji takes over when the file is missing */
        var im = doc.createElement('img'); im.alt = ch.name || ''; im.src = chSrc;
        im.addEventListener('error', function () { big.textContent = icon; });
        big.appendChild(im);
      } else big.textContent = icon;
      card.appendChild(big);
      card.appendChild(h('div', 'wq37r-t', plain(ch.name || '') + (perk ? ' · ' + ({ heart: '多一顆心', shield: '護盾', coin: '多一枚金幣' }[perk] || '') : '')));
      card.appendChild(h('div', 'wq37r-t', endless ? '無盡挑戰 · ' + W.zh : W.zh + ' · 第 ' + (stageI + 1) + ' 關' + (isBoss ? ' · ' + B.name : '')));
      if (endless) { var bb = loadBest(); card.appendChild(h('div', 'wq37r-goal', '最佳 ' + bb.dist + ' 米 · ' + bb.score + ' 分')); }
      else card.appendChild(h('div', 'wq37r-goal', isBoss ? N + ' 道門 · 打敗魔王' : '過 ' + N + ' 道門'));
      var keys = h('div', 'wq37r-keys');
      keys.appendChild(keyTile('jump', touchMode ? '上滑 跳' : '空白鍵 跳'));
      keys.appendChild(keyTile('slide', touchMode ? '下滑 滑' : 'Shift 滑'));
      keys.appendChild(keyTile('dash', touchMode ? '按鈕 衝刺' : 'Enter 衝刺'));
      card.appendChild(keys);
      card.appendChild(h('div', 'wq37r-s', touchMode ? '點一點轉線' : '↑↓ 轉線 · P 暫停'));
      card.appendChild(btn('開始', '', begin));
    }
    function showPause() {
      var card = makeOverlay(); card.appendChild(h('div', 'wq37r-t', '已暫停'));
      card.appendChild(btn('繼續', '', resume)); card.appendChild(btn('返回', 'alt', doExit));
    }
    function showResult() {
      cardShown = true; var r = lastResult, tot = r.correct + r.wrong, acc = tot ? Math.round(r.correct / tot * 100) : 0;
      var card = makeOverlay();
      card.appendChild(h('div', 'wq37r-t', r.mode === 'endless' ? '挑戰結束' : r.passed ? '過關！' : '再試一次'));
      if (r.newRecord) card.appendChild(h('div', 'wq37r-rec', '新紀錄！'));
      card.appendChild(h('div', 'wq37r-stars', '★★★★★'.slice(0, r.stars) + '☆☆☆☆☆'.slice(0, 5 - r.stars)));
      if (r.bossDefeated) card.appendChild(h('div', 'wq37r-row', '打敗了' + B.name + '！'));
      if (r.mode === 'endless') {
        card.appendChild(h('div', 'wq37r-row', '距離 ' + r.distance + ' 米　分數 ' + r.score));
        card.appendChild(h('div', 'wq37r-row', '最佳 ' + r.best.dist + ' 米 · ' + r.best.score + ' 分'));
      } else card.appendChild(h('div', 'wq37r-row', '分數 ' + r.score + '　' + r.seconds + ' 秒'));
      card.appendChild(h('div', 'wq37r-row', '準確率 ' + acc + '%　金幣 ' + r.coins));
      card.appendChild(btn('↻ 再玩', '', function () { if (opts.onAgain) opts.onAgain(replay); else replay(); })); card.appendChild(btn('返回', 'alt', doExit));
    }
    function doExit() { if (exited || dead) return; exited = true; try { if (opts.onExit) opts.onExit(); } catch (e) { console.error(e); } }

    /* ----- flow ----- */
    function begin() { if (state !== 'ready') return; clearOverlay(); state = 'play'; ensureAudio(); }
    function replay() { seedN++; clearOverlay(); resetGame(); state = 'play'; }
    function pause() { if (state !== 'play') return; state = 'paused'; showPause(); }
    function resume() { if (state !== 'paused') return; clearOverlay(); state = 'play'; lastT = 0; }
    function changeLane(d) {
      if (state !== 'play') return; var n = clamp(lane + d, 0, 2);
      if (gate) gate.steered = true; if (n !== lane) { lane = n; sfx('lane'); }
    }
    function setLane(n) { if (state !== 'play') return; n = clamp(n, 0, 2); if (gate) gate.steered = true; if (n !== lane) { lane = n; sfx('lane'); } }
    function jh() { if (jt <= 0) return 0; var u = jt / JD; return 4 * u * (1 - u); }
    function doJump() {
      if (state !== 'play' || jt > 0) return;
      slideT = 0; slideBuf = 0; jt = 1e-4; sfx('jump');
      for (var i = 0; i < (reduced ? 2 : 6); i++) addPart(L.px + (Math.random() - 0.5) * 30, laneY(vl, L.px) + L.size * 0.45, (Math.random() - 0.5) * 120, -20 - Math.random() * 40, 0.4, 4, '#fff', 'c');
    }
    function doSlide() {
      if (state !== 'play') return;
      if (jt > 0) { if (jt < JD * 0.5) jt = JD - jt; slideBuf = 0.35; return; }
      if (slideT > 0) return;
      slideT = SLD; sfx('slide');
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
    function floater(text, x, y, col, size) { if (floaters.length > 22) floaters.shift(); floaters.push({ text: text, x: x, y: y, t: 0, col: col || '#fff', size: size || 30 }); }
    function addScore(n) { n = x2T > 0 ? n * 2 : n; score += n; return n; }

    /* ----- gameplay ----- */
    function curSpeed() {
      var ramp = endless ? 1 + Math.min(0.8, dist / 36000) : 1 + 0.025 * Math.min(gateIdx, 10);
      return base * ramp * (dash > 0 ? 1.45 : 1) * (bossOn && !bossDone ? 1.1 : 1) * (slowT > 0 ? 0.65 : 1);
    }
    function kick(v) { shake = reduced ? 0 : Math.max(shake, v); }
    function loseHeart(kind) {
      if (shieldT > 0) { shieldT = 0; inv = 0.9; floater('🛡️ 擋住了！', L.px, laneY(vl, L.px) - 70, '#9ff6ff', 30); sfx('good'); burst(L.px, laneY(vl, L.px), 12, ['#9ff6ff', '#fff'], 260, 0.6, 's'); return false; }
      hearts--; heartsLost++; combo = 0; kick(0.55); inv = 1.2; sfx(kind === 'hit' ? 'hit' : 'bad');
      floater('💔', L.px, laneY(vl, L.px) - 70, '#fff', 40);
      if (hearts <= 0) {
        if (revive) {
          revive = false; reviveUsed = true; hearts = 2; inv = 2.4; sfx('win');
          banner = { t: 1.8, text: '👼 復活！', col: '#7dff6a' }; burst(L.px, laneY(vl, L.px), 24, ['#7dff6a', '#fff', '#ffe14d'], 300, 0.9, 's');
        } else endRun(false);
      }
      return true;
    }
    function hurt(ff) {
      if (ff || godMode || dash > 0 || inv > 0) return false;
      burst(L.px + 10, laneY(vl, L.px), 14, ['#fff', '#ffd27d'], 260, 0.5, 'c', 200); loseHeart('hit'); return true;
    }
    function bossGeom() {
      var size = Math.min(L.gap * 2.1, 240), e = 1 - Math.pow(1 - bossIn, 3);
      return { size: size, x: L.LW - size * 0.42 + (1 - e) * (size + 80), y: L.cy + Math.sin(tAnim * 2) * 14 };
    }
    function hitBoss() {
      var g = bossGeom(); bossHp = Math.max(0, bossHp - 1); bossFlash = 0.6;
      burst(g.x, g.y, 24, ['#fff', '#ffd23f', '#ff7eb3'], 340, 0.8, 's'); floater('💥 魔王 -1', g.x - 50, g.y - g.size * 0.6, '#ffd23f', 36); sfx('star');
      if (bossHp <= 0) {
        bossDone = true; bossT = 0; atks.length = 0; confetti(90); banner = { t: 2.8, text: '🎉 打敗魔王！', col: '#7dff6a' }; sfx('win');
        for (var i = obstacles.length - 1; i >= 0; i--) if (obstacles[i].proj) obstacles.splice(i, 1);
      } else if (bossPhase === 1 && bossHp <= bossMax / 2) {
        bossPhase = 2; atkT = 1.8; kick(0.4); banner = { t: 2.2, text: '⚠ 第二階段！更快！', col: '#ff6b6b' }; sfx('bad');
      }
    }
    function judgeGate(g) {
      g.judged = true; g.ok = lane === g.correctLane; g.reveal = 3;
      var pk = null, i;
      for (i = 0; i < g.doors.length; i++) if (g.doors[i].lane === lane) pk = { en: g.doors[i].word, zh: '' };
      if (pk) for (i = 0; i < words.length; i++) if (words[i].en === pk.en) pk.zh = words[i].zh;
      resolveGate(g, g.ok, g.x); lcShow(g.ok, g.target, pk);
    }
    /* ----- learning card: the run freezes so the child can see, hear and remember the answer ----- */
    var lcOn = lcEnabled(opts), lc = null;
    function lcShow(ok, w, picked) {
      if (!lcOn || !w || state !== 'play') return;
      var T = ok ? LC_OK : LC_BAD;
      state = 'learn'; toast = null; swId = null;
      var el = lcBuild(doc, ok, w, picked);
      lc = { ok: ok, w: w, t: 0, min: T.min, max: T.max, again: T.again || 0, el: el, bar: el.querySelector('.wqlc-bar i'), go: el.querySelector('[data-lc="go"]') };
      el.firstChild.addEventListener('pointerdown', function (e) { e.stopPropagation(); });
      el.querySelector('[data-lc="say"]').addEventListener('click', function (e) { e.stopPropagation(); ensureAudio(); if (lc) speak(lc.w.en); });
      lc.go.addEventListener('click', function (e) { e.stopPropagation(); lcDone(false); });
      root.appendChild(el);
      speak(w.en);
    }
    function lcTick(dt) {
      if (!lc) { state = 'play'; return; }
      var t0 = lc.t; lc.t += dt;
      if (lc.bar) lc.bar.style.width = Math.min(100, lc.t / (lc.ok ? lc.max : lc.min) * 100).toFixed(1) + '%';
      if (lc.t >= lc.min && lc.go.disabled) { lc.go.disabled = false; if (!touchMode) { try { lc.go.focus({ preventScroll: true }); } catch (e) { /* */ } } }
      if (lc.again && t0 < lc.again && lc.t >= lc.again) speak(lc.w.en);
      if (lc.t >= lc.max) lcDone(true);
    }
    function lcDone(force) {
      if (!lc || (!force && lc.t < lc.min)) return;
      if (lc.el.parentNode) lc.el.parentNode.removeChild(lc.el);
      lc = null;
      if (state === 'learn') { state = 'play'; lastT = 0; }
    }
    /* R3.38: a gate passed without touching a lane control is no answer; two in a row stop the run for one untimed question */
    var lapses = 0, idleAsk = null;
    function ev(k, x) { try { if (opts.onLearn) opts.onLearn(k, x); } catch (e) { /* */ } }
    function resolveGate(g, ok, endX) {
      gateIdx++; lastGateX = endX;
      var t = g.target, py = laneY(vl, L.px);
      if (ok) ev('ok'); else if (g.steered) ev('wrong'); else { lapses++; ev('lapse', { typed: false }); idleAsk = t; }
      if (ok) {
        correct++; combo++; maxCombo = Math.max(maxCombo, combo); var bonus = addScore(100 + 20 * Math.min(combo, 10) + (g.kind === 'spell' ? 40 : 0));
        if (g.boss) { bossStreak++; hitBoss(); }
        floater('+' + bonus, L.px, py - 70, '#ffe14d', 36); if (combo > 1) floater('連擊 ×' + combo, L.px + 20, py - 110, '#ff9ad0', 28);
        confetti(50); burst(L.px + 30, py, 18, ['#ffe14d', '#fff', '#7dff6a'], 300, 0.8, 's'); sfx('good');
        toast = { t: 2.4, text: '✔ ' + t.en + ' = ' + t.zh, ok: true };
      } else {
        wrong++; combo = 0; bossStreak = 0;
        toast = { t: 3, text: '答案：' + t.en + ' = ' + t.zh, ok: false };
        loseHeart('gate');
      }
      if (state !== 'play') return;
      if (isBoss && !bossOn && gateIdx >= N - 3) { bossOn = true; bossIn = 0; atkT = 2.4; banner = { t: 2.4, text: '👑 ' + B.name + '出現！', col: '#ffd23f' }; sfx('bad'); }
      prevGate = g;
      if (bossDone) { finishX = endX + 1000; gate = null; return; }
      if (!isBoss && !endless && gateIdx >= N) { finishX = endX + 900; gate = null; return; }
      gate = null; scheduleGate(false);
    }

    /* ----- spelling gate: columns of 3 letter bubbles; the next needed letter is always in exactly one lane ----- */
    function openCols(g) { var a = []; for (var i = 0; i < g.cols.length; i++) if (!g.cols[i].done) a.push(g.cols[i]); return a; }
    function decoy(g, need, col) {
      var pool = g.word.split(''), i, j, t, ch;
      for (i = pool.length - 1; i > 0; i--) { j = (lrng() * (i + 1)) | 0; t = pool[i]; pool[i] = pool[j]; pool[j] = t; }
      pool = pool.concat('etaoinsrhlcdumpfgbwyvk'.split(''));
      for (i = 0; i < pool.length; i++) { ch = pool[i]; if (ch !== need && col.tk[0].ch !== ch && col.tk[1].ch !== ch && col.tk[2].ch !== ch) return ch; }
      return 'z';
    }
    function spellRelabel(g) {
      var open = openCols(g), j, i, col, need, tk;
      for (j = 0; j < open.length; j++) {
        col = open[j]; need = g.word[g.idx + j];
        for (i = 0; i < 3; i++) { tk = col.tk[i]; tk.isC = i === col.cl; if (tk.isC) tk.ch = need; else if (!tk.ch || tk.ch === need) { tk.ch = ''; tk.ch = decoy(g, need, col); } }
      }
      g.nx = open.length ? open[0].x : g.nextX;
    }
    function spawnCol(g) {
      var col = { x: g.nextX, cl: (lrng() * 3) | 0, done: false, tk: [] }, l, tk;
      for (l = 0; l < 3; l++) { tk = { x: col.x, lane: l, ly: l, kind: 'letter', ch: '', isC: false, got: false, col: col }; col.tk.push(tk); pickups.push(tk); }
      g.cols.push(col); g.nextX += 250; spellRelabel(g);
    }
    function spellUpdate(g) {
      var open = openCols(g), i;
      for (i = 0; i < open.length; i++) if (open[i].x < dist - 70) { open[i].done = true; open[i].tk.forEach(function (t) { t.got = true; }); g.touched = true; spellMiss(g, open[i].x); if (g.judged) return; }
      open = openCols(g);
      var n = open.length;
      while (g.idx + n < g.n && g.nextX - dist < L.LW - L.px + 80) { spawnCol(g); n++; }
    }
    function spellMiss(g, x) {
      g.mis++; combo = 0; score = Math.max(0, score - 20); floater('✗ -20', L.px, laneY(vl, L.px) - 70, '#ff6b6b', 30); sfx('bad'); kick(0.2);
      if (g.mis >= 3) spellEnd(g, false, x); else spellRelabel(g);
    }
    function spellEnd(g, ok, x) {
      g.judged = true; g.ok = ok; g.reveal = 3;
      for (var i = 0; i < pickups.length; i++) if (pickups[i].kind === 'letter') pickups[i].got = true;
      resolveGate(g, ok, x); lcShow(ok, g.target, null);
    }
    function letterPick(p) {
      var g = gate, col = p.col;
      if (!g || g.kind !== 'spell' || g.judged || col.done) return;
      var y = laneY(lane, L.px); col.done = true; g.touched = true; col.tk.forEach(function (t) { t.got = true; });
      if (p.isC) {
        g.idx++; var s = addScore(20); floater(p.ch.toUpperCase() + ' ✓', L.px + 30, y - 60, '#7dff6a', 34); burst(L.px + 30, y, 12, ['#7dff6a', '#fff', '#ffe14d'], 240, 0.6, 's'); sfx('star');
        if (g.idx >= g.n) spellEnd(g, true, p.x);
      } else {
        floater(p.ch.toUpperCase() + ' ✗', L.px + 30, y - 60, '#ff6b6b', 34); spellMiss(g, p.x);
      }
    }

    /* ----- spawning ----- */
    function addPick(x, l, kind) { pickups.push({ x: x, lane: l, ly: l, kind: kind, got: false }); }
    function addObs(x, l, k) { if (k) kSpawned++; obstacles.push({ x: x, lane: l, k: k, e: k ? '' : W.obs[(rng() * W.obs.length) | 0], vx: 0, hit: false, spin: 0, av: false, paid: false }); }
    function spawnPattern() {
      var gap = GAPSEC[diff - 1] * base, r = rng(), i, l;
      if (!bossOn && (r < OBSP[diff - 1] || gapK === 0)) {
        var pn = patN++, k = 0, wide = false;
        if (gapK === 0 && pn > 2) { k = rng() < 0.55 ? 1 : 2; wide = rng() < 0.45; } else if (pn === 0) { k = 1; wide = true; } else if (pn === 2) { k = 2; wide = true; } else if (rng() < 0.5) { k = rng() < 0.55 ? 1 : 2; wide = rng() < 0.45; }
        if (k) {
          gapK++;
          var l0 = (rng() * 3) | 0, extra = 0;
          for (l = 0; l < 3; l++) if (wide || l === l0) addObs(genX, l, k);
          if (!wide && diff >= 3 && rng() < 0.3) { addObs(genX + 320, l0, 3 - k); extra = 320; }
          genX += gap * 1.1 + extra; return;
        }
        var n = (diff >= 3 && rng() < 0.3 + 0.1 * diff) ? 2 : 1, ls = [0, 1, 2], first = (rng() * 3) | 0;
        for (i = 0; i < n; i++) addObs(genX, ls.splice(i === 0 ? first : (rng() * ls.length) | 0, 1)[0], 0);
        genX += gap; return;
      }
      var kind = rng(), len = 0, pl = (rng() * 3) | 0;
      if (kind < 0.1 && hearts < maxHearts) { addPick(genX, pl, 'heart'); }
      else if (kind < 0.24 && dist > 1500) { var pk = PUK[(rng() * PUK.length) | 0]; if (pk === 'revive' && (revive || reviveUsed)) pk = 'slow'; addPick(genX, pl, pk); }
      else if (kind < 0.4) { addPick(genX, pl, 'star'); }
      else if (kind < 0.7) { for (i = 0; i < 5; i++) addPick(genX + i * 90, pl, 'coin'); len = 360; }
      else { var up = rng() < 0.5; for (i = 0; i < 5; i++) { var q = [0, 1, 2, 1, 0][i]; addPick(genX + i * 100, up ? q : 2 - q, 'coin'); } len = 400; }
      genX += Math.max(gap * 0.8, len + 260);
    }
    function ensure() {
      if (quiet) return;
      var limit = dist + (L.LW - L.px) + 500, stop = gate ? gate.x - (gate.wp + 150) : (finishX ? finishX - 500 : -1);
      var guard = 0;
      while (genX < Math.min(limit, stop) && guard++ < 40) spawnPattern();
    }

    /* ----- boss attacks ----- */
    function pickLane(ex) { var l, g = 0; do { l = (trng() * 3) | 0; } while (ex.indexOf(l) >= 0 && g++ < 20); return l; }
    function canAtk() {
      if (gate && (gate.kind === 'spell' ? gate.x - dist < gate.wp + 450 || gate.touched : gate.x - dist < gate.wp + 150)) return false;
      return dist - lastGateX > 350;
    }
    function launchAtk() {
      var list = bossPhase === 2 ? B.a2 : B.a1, type = list[atkN++ % list.length], w = bossPhase === 2 ? 0.75 : 1, warn = (1.35 - diff * 0.08) * w, ex = [], l, i, n;
      throwFlash = 0.5;
      if (type === 'fall' || type === 'fall2' || type === 'laser' || type === 'laser2') {
        n = type.slice(-1) === '2' ? 2 : 1;
        for (i = 0; i < n; i++) { l = i === 0 ? lane : pickLane(ex); ex.push(l); atks.push({ k: type.slice(0, 4) === 'fall' ? 'fall' : 'laser', lane: l, t: 0, warn: warn, dur: 0.6, done: false, hit: false }); }
      } else if (type === 'beamL' || type === 'beamH') {
        atks.push({ k: 'beam', hi: type === 'beamH', t: 0, warn: warn + 0.2, bx: L.LW + 40, done: false });
      } else {
        var hi = type === 'projH'; n = type === 'projL2' ? 2 : 1;
        for (i = 0; i < n; i++) { l = i === 0 ? lane : pickLane(ex); ex.push(l); obstacles.push({ x: dist + L.LW - L.px + 40, lane: l, k: hi ? 2 : 1, e: hi ? B.ph : B.pl, vx: -base * 0.5, proj: true, hit: false, spin: 1, av: false, paid: false }); }
      }
      sfx('lane');
    }
    function updAtks(sd, ff) {
      for (var i = atks.length - 1; i >= 0; i--) {
        var a = atks[i]; a.t += sd;
        if (a.k === 'fall') {
          if (!a.done && a.t >= a.warn) {
            a.done = true; burst(L.px, laneY(a.lane, L.px) + L.size * 0.3, 14, ['#fff', '#d9c7a0', B.col], 260, 0.6, 'c', 300); kick(0.25); sfx('boom');
            if (lane === a.lane) { hurt(ff); if (state !== 'play') return; }
          }
          if (a.t > a.warn + 0.55) atks.splice(i, 1);
        } else if (a.k === 'laser') {
          if (!a.done && a.t >= a.warn) { a.done = true; sfx('boom'); kick(0.15); }
          if (a.done && a.t < a.warn + a.dur && lane === a.lane && !a.hit) { a.hit = true; hurt(ff); if (state !== 'play') return; }
          if (a.t > a.warn + a.dur + 0.15) atks.splice(i, 1);
        } else {
          if (a.t >= a.warn) {
            a.bx = L.LW + 40 - (a.t - a.warn) / BEAMT * (L.LW + 80);
            if (!a.done && a.bx <= L.px + 24) {
              a.done = true;
              if (!(a.hi ? slideT > 0 : jh() > JCLR)) { hurt(ff); if (state !== 'play') return; }
              else if (!ff && !godMode) { var bs = addScore(30); dodges++; floater((a.hi ? '滑過！ +' : '跳過！ +') + bs, L.px + 30, laneY(vl, L.px) - 80, '#9ff6ff', 30); }
            }
            if (a.bx < -50) atks.splice(i, 1);
          }
        }
      }
    }
    function endRun(alive) {
      if (state !== 'play') return;
      var tot = correct + wrong, acc = tot ? correct / tot : 0, passed = alive && acc >= 0.5, stars, m = (dist / 50) | 0;
      if (endless) { passed = correct > 0; stars = m >= 800 ? 5 : m >= 500 ? 4 : m >= 250 ? 3 : m >= 100 ? 2 : 1; }
      else if (alive && tot > 0 && wrong === 0 && heartsLost === 0) stars = 5; else stars = acc >= 0.9 ? 4 : acc >= 0.75 ? 3 : acc >= 0.5 ? 2 : 1;
      lastResult = { score: score, correct: correct, wrong: wrong, coins: coins, seconds: Math.round(runTime * 10) / 10, stars: stars, passed: passed, world: worldI, stage: stageI,
        mode: endless ? 'endless' : 'story', distance: m, maxCombo: maxCombo, dodges: dodges, bossDefeated: bossDone, newRecord: false, lapses: lapses };
      if (endless) {
        var b = loadBest(), nr = m > b.dist || score > b.score;
        if (nr) { b.dist = Math.max(b.dist, m); b.score = Math.max(b.score, score); saveBest(b); }
        lastResult.best = { dist: b.dist, score: b.score }; lastResult.newRecord = nr;
      }
      stagePassed = passed; state = endless ? 'over' : passed ? 'won' : 'over'; endT = 0;
      atks.length = 0;
      if (passed || lastResult.newRecord) { confetti(120); sfx('win'); } else sfx('lose');
      try { if (opts.onFinish) opts.onFinish(lastResult); } catch (e) { console.error(e); }
    }
    function expire(v, dt, label) { if (v > 0) { v -= dt; if (v <= 0) { v = 0; floater(label, L.px, laneY(vl, L.px) - 90, '#fff', 24); } } return v; }

    function step(dt, ff) {
      if (state === 'play' && idleAsk) { var ia = idleAsk; idleAsk = null; if (opts.onIdle && opts.onIdle(root, ia, function () { state = 'play'; lastT = 0; })) { state = 'gate'; return; } }
      tAnim += dt;
      var i, o;
      if (state === 'play') {
        runTime += dt;
        if (inv > 0) inv -= dt; if (dash > 0) dash -= dt; if (dashCd > 0) dashCd -= dt;
        magnet = expire(magnet, dt, '🧲 結束'); slowT = expire(slowT, dt, '⏳ 結束'); x2T = expire(x2T, dt, '×2 結束');
        if (shieldT > 0 && shieldT < 1e8) shieldT = expire(shieldT, dt, '🛡️ 結束');
        var warn = inWarn(gate);
        ts += ((warn ? 0.6 : 1) - ts) * (1 - Math.exp(-dt / 0.5));   // R3.20: smooth ~0.5 s time constant (was dt*5)
        var sd = dt * ts, mv = curSpeed() * sd; dist += mv; scr += mv;
        if (endless) { scoreFrac += mv * 0.02; if (scoreFrac >= 1) { var ds = scoreFrac | 0; scoreFrac -= ds; score += ds; } }
        if (jt > 0) {
          jt += sd;
          if (jt >= JD) { jt = 0; landT = 0.2; if (!reduced) for (i = 0; i < 5; i++) addPart(L.px + (Math.random() - 0.5) * 30, laneY(vl, L.px) + L.size * 0.45, (Math.random() - 0.5) * 160, -30 - Math.random() * 40, 0.35, 4, '#fff', 'c'); if (slideBuf > 0) { slideBuf = 0; doSlide(); } }
        }
        if (slideT > 0) { slideT -= sd; if (!reduced && Math.random() < 0.5) addPart(L.px - 20, laneY(vl, L.px) + L.size * 0.45, -120 - Math.random() * 80, -10 - Math.random() * 30, 0.35, 4, '#fff', 'c'); }
        if (landT > 0) landT -= dt; if (slideBuf > 0) slideBuf -= dt;
        ensure();
        if (gate && !gate.judged) {
          if (gate.kind === 'spell') { spellUpdate(gate); if (state !== 'play') return; }
          else if (gate.kind === 'listen' && !gate.spoken && gate.x - dist < 1100) { gate.spoken = true; speak(gate.target.en); }
        }
        if (bossOn && !bossDone) {
          bossIn = Math.min(1, bossIn + dt * 0.8);
          if (bossIn > 0.9) { atkT -= sd; if (atkT <= 0 && canAtk()) { launchAtk(); atkT = (bossPhase === 2 ? 1.5 : 2.4) - diff * 0.1 + trng() * 0.6; } }
        }
        if (atks.length) { updAtks(sd, ff); if (state !== 'play') return; }
        for (i = obstacles.length - 1; i >= 0; i--) {
          o = obstacles[i]; if (o.vx) o.x += o.vx * sd; if (o.spin) o.spin += dt * 6;
          if (o.x < dist - 220) { obstacles.splice(i, 1); continue; }
          if (!o.hit && !ff && !godMode && o.lane === lane && Math.abs(o.x - dist) < (o.k ? 30 : 42)) {
            if (dash > 0) { o.hit = true; burst(L.px, laneY(lane, L.px), 10, ['#fff3a0', '#9ff6ff'], 240, 0.5, 's'); }
            else if ((o.k === 1 && jh() > JCLR) || (o.k === 2 && slideT > 0)) o.av = true;
            else if (inv <= 0) { o.hit = true; burst(L.px + 20, laneY(lane, L.px), 14, ['#fff', '#ffd27d'], 260, 0.5, 'c', 200); loseHeart('hit'); if (state !== 'play') return; }
          }
          if (o.av && !o.paid && o.x < dist - 36) { o.paid = true; dodges++; var bs = addScore(15); floater((o.k === 1 ? '跳過！ +' : '滑過！ +') + bs, L.px + 30, laneY(vl, L.px) - 80 - jh() * L.size, '#9ff6ff', 26); burst(L.px, laneY(vl, L.px) + L.size * 0.2, 6, ['#9ff6ff', '#fff'], 200, 0.4, 's'); }
        }
        for (i = pickups.length - 1; i >= 0; i--) {
          var p = pickups[i];
          if (p.x < dist - 220 || p.got) { pickups.splice(i, 1); continue; }
          if (p.ly === undefined) p.ly = p.lane;
          if (magnet > 0 && p.x - dist < 520 && p.x > dist - 40 && p.kind !== 'magnet' && p.kind !== 'letter') p.ly += (lane - p.ly) * Math.min(1, dt * 9);
          if (Math.abs(p.x - dist) < 46 && Math.abs(p.ly - lane) < 0.55) { collect(p); if (state !== 'play') return; }
        }
        if (gate && !gate.judged && gate.kind !== 'spell' && gate.x <= dist) { judgeGate(gate); if (state !== 'play') return; }
        if (finishX && dist >= finishX) endRun(true);
      } else if (state === 'won') {
        var m2 = base * 0.55 * dt; dist += m2; scr += m2; endT += dt; ts = 1; if (bossT > 0 || bossDone) bossT += dt;
        if (Math.random() < dt * 4 && !reduced) confetti(6);
      } else if (state === 'over') { endT += dt; }
      else if (state === 'ready') { scr += 55 * dt; }
      else if (state === 'learn') lcTick(dt);
      if (bossDone && state === 'play') bossT += dt;
      if (prevGate) prevGate.reveal -= dt;
      if (throwFlash > 0) throwFlash -= dt;
      if (bossFlash > 0) bossFlash -= dt;
      if (banner) { banner.t -= dt; if (banner.t <= 0) banner = null; }
      // visuals
      var dl = lane - vl; vl += dl * Math.min(1, dt * 14);
      if (state === 'play') {
        trailT -= dt;
        if (trailT <= 0) { trailT = reduced ? 0.09 : 0.03; var ty = laneY(vl, L.px) - jh() * L.size * 1.25; addPart(L.px - 26, ty + (Math.random() - 0.5) * 26, -90 - Math.random() * 60, (Math.random() - 0.5) * 40, 0.55, 3 + Math.random() * 4, trailCol, 's'); }
      }
      for (var k = parts.length - 1; k >= 0; k--) { var q = parts[k]; q.life -= dt; if (q.life <= 0) { parts.splice(k, 1); continue; } q.vy += q.g * dt; q.x += q.vx * dt; q.y += q.vy * dt; q.rot += q.vr * dt; }
      for (k = floaters.length - 1; k >= 0; k--) { floaters[k].t += dt; if (floaters[k].t > 1.3) floaters.splice(k, 1); }
      if (toast) { toast.t -= dt; if (toast.t <= 0) toast = null; }
      if (shake > 0) shake = Math.max(0, shake - dt * 1.6);
      warnFlash += dt;
      if (endT > 1.3 && !cardShown && (state === 'won' || state === 'over')) showResult();
    }
    function collect(p) {
      var y = laneY(lane, L.px), k = p.kind, s;
      p.got = true;
      if (k === 'letter') { letterPick(p); return; }
      if (k === 'coin') { coins++; s = addScore(perk === 'coin' ? 20 : 10); sfx('coin'); burst(L.px + 30, y, 5, ['#ffe14d', '#fff'], 160, 0.4, 's'); floater('+' + s, L.px + 30, y - 55, '#ffe14d', 20); }
      else if (k === 'star') { s = addScore(50); sfx('star'); burst(L.px + 30, y, 10, ['#fff27a', '#ffb400'], 220, 0.6, 's'); floater('+' + s, L.px + 30, y - 60, '#fff27a', 30); }
      else if (k === 'heart') { if (hearts < maxHearts) hearts++; else addScore(100); sfx('star'); floater('💖 +1', L.px + 30, y - 60, '#ff7eb3', 30); burst(L.px + 30, y, 10, ['#ff7eb3', '#fff'], 200, 0.6, 'c'); }
      else if (PU[k]) givePU(k);
    }
    function givePU(k) {
      var y = laneY(lane, L.px), d = PU[k];
      if (k === 'slow') slowT = d.dur; else if (k === 'x2') x2T = d.dur; else if (k === 'magnet') magnet = d.dur;
      else if (k === 'shield') { if (shieldT < 1e8) shieldT = d.dur; } else if (k === 'revive') revive = true;
      sfx('pu'); floater(d.em + ' ' + d.zh, L.px + 30, y - 70, d.col, 28); burst(L.px, y, 14, [d.col, '#fff'], 240, 0.6, 's');
    }

    /* ----- debug fast-forward ----- */
    function armedNow(lead) {
      var g = gate; if (!g || g.judged) return false;
      if (g.kind === 'spell' && g.touched) return false;
      return g.x - dist <= curSpeed() * ts * (1 / 60) + 1e-6 + (lead || 0) + (g.kind === 'spell' ? 60 : 0);   // spell: stop before the first letter column can be picked
    }
    function advance(lead) {
      lead = lead || 0;
      if (state === 'ready') begin();
      holdGate = false;
      var guard = 0, stepped = false;
      var startArmed = armedNow(lead);
      while (state === 'play' && guard++ < 400000) {
        if (gate && !gate.judged && armedNow(lead) && !(startArmed && !stepped)) break;
        step(1 / 60, true); stepped = true;
        if (!gate && !finishX && state === 'play') break;
      }
      if (state === 'play' && armedNow(0)) holdGate = true;
    }

    /* ----- rendering ----- */
    function outline(txt, x, y, size, fill, align, font, lw) {
      c.font = '800 ' + size + 'px ' + (font || FONT); c.textAlign = align || 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
      c.lineWidth = lw || Math.max(3, size * 0.16); c.strokeStyle = INK; c.strokeText(txt, x, y); c.fillStyle = fill; c.fillText(txt, x, y);
      if (hudRec && txt) { var tw = c.measureText(txt).width, ax = align === 'left' ? x : align === 'right' ? x - tw : x - tw / 2; hudRec.push({ t: txt, size: size * S, r: [ax * S, (y - size * 0.55) * S, (ax + tw) * S, (y + size * 0.55) * S] }); }
    }
    function emoji(ch2, x, y, size, rot, sx, sy) {
      c.save(); c.translate(x, y); if (rot) c.rotate(rot); if (sx !== undefined) c.scale(sx, sy);
      c.font = size + 'px ' + EMOJI; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = '#000'; c.fillText(ch2, 0, 0); c.restore();
    }
    /* the player: illustration when loaded, emoji otherwise (feet stay on the shadow, squash / stretch pivots at the centre like the emoji did) */
    function drawChar(x, y, s, rot, sx, sy) {
      if (!chReady()) { emoji(icon, x, y, s, rot, sx, sy); return; }
      var hgt = s * 1.3, wid = hgt * chImg.naturalWidth / chImg.naturalHeight;
      c.save(); c.translate(x, y - s * 0.19); if (rot) c.rotate(rot); c.scale(sx === undefined ? 1 : sx, sy === undefined ? 1 : sy);
      c.drawImage(chImg, -wid / 2, -hgt / 2, wid, hgt); c.restore(); chDraws++;
    }
    function shadow(x, y, w) { c.fillStyle = 'rgba(0,0,0,0.25)'; c.beginPath(); c.ellipse(x, y, w, w * 0.28, 0, 0, TWO_PI); c.fill(); }

    function drawSpeedLines() {
      var ratio = curSpeed() / base;
      if (reduced || state !== 'play' || (dash <= 0 && ratio < 1.3)) return;
      var LW = L.LW, span = LW + 300, a = clamp((ratio - 1.2) * 1.1, 0.12, 0.5);
      c.strokeStyle = '#fff'; c.globalAlpha = a; c.lineWidth = 3; c.lineCap = 'round'; c.beginPath();
      for (var i = 0; i < lines.length; i++) {
        var q = lines[i], x = ((q.x - scr * 2.2 * q.v) % span + span) % span - 150, y = L.hor + 20 + q.y * (L.LH - L.hor - 40);
        c.moveTo(x, y); c.lineTo(x + q.len * (dash > 0 ? 1.6 : 1), y);
      }
      c.stroke(); c.globalAlpha = 1;
    }
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
      drawSpeedLines();
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
      if (atks.length) drawAtks(false);
      // entities by lane
      for (var l = 0; l < 3; l++) {
        if (gate && gate.doors) drawDoor(gate, gate.doors[l]);
        if (prevGate && prevGate.doors && prevGate.reveal > 0) drawDoor(prevGate, prevGate.doors[l]);
        var list = [];
        for (i = 0; i < obstacles.length; i++) if (obstacles[i].lane === l && !obstacles[i].hit) list.push(obstacles[i]);
        for (i = 0; i < pickups.length; i++) if (Math.round(pickups[i].ly === undefined ? pickups[i].lane : pickups[i].ly) === l && !pickups[i].got) list.push(pickups[i]);
        list.sort(function (a, b) { return b.x - a.x; });
        for (i = 0; i < list.length; i++) { if (list[i].k !== undefined) drawObstacle(list[i]); else drawPickup(list[i]); }
        if (Math.round(vl) === l) drawPlayer();
      }
      if (atks.length) drawAtks(true);
    }
    function drawAmbient() {
      var LW = L.LW, LH = L.LH, kind = W.amb, t = tAnim;
      var n = reduced ? 8 : amb.length;
      for (var i = 0; i < n; i++) {
        var a = amb[i], x, y;
        if (kind === 'petal') { x = ((a.x * 1.1 - scr * 0.35 * a.v) % LW + LW) % LW; y = (a.y * 0.8 + t * 30 * a.v) % LH; c.fillStyle = W.ambc; c.globalAlpha = 0.8; c.beginPath(); c.ellipse(x, y, 5 + a.r, 3 + a.r * 0.5, t + a.ph, 0, TWO_PI); c.fill(); }
        else if (kind === 'leaf') { x = ((a.x * 1.1 - scr * 0.45 * a.v + Math.sin(t * 1.3 + a.ph) * 26) % LW + LW) % LW; y = (a.y * 0.9 + t * 38 * a.v) % LH; c.fillStyle = i % 3 ? W.ambc : '#e8a23c'; c.globalAlpha = 0.85; c.beginPath(); c.ellipse(x, y, 8 + a.r * 1.5, 3.5 + a.r * 0.5, Math.sin(t * 2 + a.ph) * 1.2, 0, TWO_PI); c.fill(); }
        else if (kind === 'sand') { x = ((a.x * 1.1 - scr * 1.2 * a.v) % LW + LW) % LW; y = L.hor + (a.y % (LH - L.hor)); c.strokeStyle = W.ambc; c.globalAlpha = 0.45; c.lineWidth = 2; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 26 + a.r * 6, y + 2); c.stroke(); }
        else if (kind === 'ember') { x = (a.x * 1.1 + Math.sin(t + a.ph) * 20 - scr * 0.2) % LW; x = (x + LW) % LW; y = LH - ((a.y * 0.9 + t * 60 * a.v) % LH); c.fillStyle = W.ambc; c.globalAlpha = 0.85; circ(c, x, y, a.r + 0.5); }
        else { x = ((a.x * 1.1 - scr * 0.5 * a.v) % LW + LW) % LW; y = (a.y * 0.85) % LH; c.fillStyle = '#fff'; c.globalAlpha = 0.35 + 0.5 * Math.abs(Math.sin(t * 2 + a.ph)); circ(c, x, y, a.r * 0.7); }
        c.globalAlpha = 1;
      }
      c.globalAlpha = 1;
    }
    function drawBoss() {
      var g = bossGeom(), size = g.size, x = g.x, y = g.y;
      var pulse = throwFlash > 0 ? 1 + throwFlash * 0.4 : 1, rot = Math.sin(tAnim * (bossPhase === 2 ? 3 : 1.5)) * 0.08, a = 1;
      if (bossFlash > 0 && !bossDone) x += Math.sin(tAnim * 60) * 8 * bossFlash;
      if (bossDone) { y -= bossT * 120; rot += bossT * 3; a = clamp(1.2 - bossT, 0, 1); size *= (1 - Math.min(0.5, bossT * 0.3)); if (a <= 0) return; }
      shadow(x, L.cy + size * 0.5, size * 0.4);
      if (bossPhase === 2 && !bossDone) glow(c, x, y, size * 0.85, 'rgba(255,60,40,1)', 0.4 + 0.2 * Math.sin(tAnim * 8));
      c.globalAlpha = a; c.shadowColor = 'rgba(30,10,60,0.85)'; c.shadowBlur = 14; emoji(bossDone ? '😵' : W.boss, x, y, size * pulse, rot); c.shadowBlur = 0; c.shadowColor = 'transparent'; c.globalAlpha = 1;
      if (bossFlash > 0 && !bossDone) glow(c, x, y, size * 0.7, 'rgba(255,255,255,1)', clamp(bossFlash * 1.2, 0, 0.7));
      if (bossDone) emoji('💫', x, y - size * 0.45, size * 0.3, bossT * 4);
      else {
        var pw = 22, px0 = x - bossMax * pw / 2, py0 = y - size * 0.62;
        for (var i = 0; i < bossMax; i++) { rr(c, px0 + i * pw + 2, py0, pw - 4, 12, 5); c.fillStyle = i < bossHp ? (bossPhase === 2 ? '#ff4d4d' : '#ff8a3d') : 'rgba(0,0,0,0.45)'; c.fill(); c.lineWidth = 2.5; c.strokeStyle = DARK; c.stroke(); }
      }
    }
    function drawAtks(top) {
      var i, a, ly, p, LW = L.LW;
      for (i = 0; i < atks.length; i++) {
        a = atks[i];
        if (a.k === 'fall') {
          ly = laneY(a.lane, L.px) + L.size * 0.3; p = clamp(a.t / a.warn, 0, 1);
          if (!top) {
            if (a.t < a.warn + 0.1) {
              var rd = L.size * (0.25 + 0.45 * p);
              c.fillStyle = 'rgba(255,40,40,' + (0.3 + 0.3 * Math.sin(a.t * 18)) + ')'; c.beginPath(); c.ellipse(L.px, ly, rd * 1.5, rd * 0.5, 0, 0, TWO_PI); c.fill();
              c.strokeStyle = '#fff'; c.lineWidth = 3; c.stroke();
              c.fillStyle = '#ff3b3b'; circ(c, L.px, ly - L.size * 0.5, L.size * 0.2); outline('!', L.px, ly - L.size * 0.5, L.size * 0.32, '#fff');
            }
          } else {
            var fp = clamp((a.t - (a.warn - 0.4)) / 0.4, 0, 1);
            if (fp > 0) { c.globalAlpha = a.t > a.warn ? clamp(1 - (a.t - a.warn) / 0.5, 0, 1) : 1; emoji(B.fe, L.px, -80 + (ly - L.size * 0.15 + 80) * fp * fp, L.size * 1.15, a.t * 5); c.globalAlpha = 1; }
          }
        } else if (a.k === 'laser') {
          if (top) continue;
          ly = laneY(a.lane, 0); var hh = L.gap * 0.42;
          if (a.t < a.warn) {
            c.fillStyle = 'rgba(255,50,50,' + (0.14 + 0.16 * Math.sin(a.t * 16)) + ')'; c.fillRect(0, ly - hh, LW, hh * 2);
            c.fillStyle = '#ff3b3b'; circ(c, LW - 70, ly, L.size * 0.2); outline('!', LW - 70, ly, L.size * 0.32, '#fff');
            c.fillStyle = '#ff3b3b'; circ(c, L.px, ly - L.size * 0.7, L.size * 0.16); outline('!', L.px, ly - L.size * 0.7, L.size * 0.26, '#fff');
          } else {
            var fa = clamp(1 - (a.t - a.warn - a.dur) / 0.15, 0, 1);
            glow(c, LW / 2, ly, LW * 0.6, B.col, 0.35 * fa); c.globalAlpha = fa; c.fillStyle = B.col; c.fillRect(0, ly - hh * 0.55, LW, hh * 1.1); c.fillStyle = '#fff'; c.fillRect(0, ly - hh * 0.22, LW, hh * 0.44); c.globalAlpha = 1;
          }
        } else if (a.k === 'beam') {
          if (a.t < a.warn) {
            if (top) continue;
            c.fillStyle = 'rgba(255,60,60,' + (0.2 + 0.2 * Math.sin(a.t * 16)) + ')'; c.fillRect(LW - 26, L.cy - L.half, 26, L.half * 2);
            var py = laneY(vl, L.px) - L.size * 1.55 - jh() * L.size;
            outline(a.hi ? '▼ 滑！' : '▲ 跳！', L.px + L.size * 1.1, py, L.size * 0.5, a.hi ? '#6adfff' : '#a8ff6a');
          } else if (!top) {
            var bx = a.bx;
            glow(c, bx, L.cy, L.half, a.hi ? 'rgba(106,223,255,1)' : 'rgba(255,140,60,1)', 0.4);
            for (var l = 0; l < 3; l++) {
              var yy = laneY(l, bx);
              if (a.hi) { c.fillStyle = '#6adfff'; rr(c, bx - 8, yy - L.size * 0.55, 16, L.size * 0.4, 6); c.fill(); c.fillStyle = '#fff'; rr(c, bx - 3, yy - L.size * 0.55, 6, L.size * 0.4, 3); c.fill(); }
              else { c.fillStyle = '#ff7a2a'; tri(c, bx - 24, yy + L.size * 0.45, bx, yy + L.size * 0.0, bx + 24, yy + L.size * 0.45); c.fillStyle = '#ffd23f'; tri(c, bx - 10, yy + L.size * 0.45, bx, yy + L.size * 0.2, bx + 10, yy + L.size * 0.45); }
            }
          }
        }
      }
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
    function cue(sx, y, kk, s) {
      if (sx > L.LW - 30 || sx < L.px - 20) return;
      var f = Math.max(20, s * 0.36) * (sx > L.px + 420 ? 0.85 : 1), bob = Math.sin(tAnim * 8) * 4 * (kk === 1 ? -1 : 1);
      outline(kk === 1 ? '▲跳' : '▼滑', sx, y + bob, f, kk === 1 ? '#a8ff6a' : '#6adfff');
    }
    function stripes(x, y, w, h2, c1, c2, n) {
      rr(c, x, y, w, h2, Math.min(6, h2 / 2)); c.fillStyle = c1; c.fill();
      c.save(); c.clip(); c.fillStyle = c2;
      for (var i = 0; i < n; i += 2) c.fillRect(x + i * w / n, y, w / n, h2);
      c.restore(); rr(c, x, y, w, h2, Math.min(6, h2 / 2)); c.lineWidth = 3; c.strokeStyle = DARK; c.stroke();
    }
    function drawObstacle(o) {
      var sx = L.px + o.x - dist; if (sx < -120 || sx > L.LW + 120) return;
      var k = kAt(sx), y = laneY(o.lane, sx), s = L.size * k, kk = o.k, gy = y + s * 0.45, w = s * 0.5;
      if (o.proj) {
        shadow(sx, gy, s * 0.4);
        if (kk === 1) { glow(c, sx, y + s * 0.2, s * 0.7, 'rgba(255,120,60,1)', 0.35); emoji(o.e, sx, y + s * 0.2, s * 0.8, o.spin * 2); cue(sx, y - s * 0.3, 1, s); }
        else { var fy = y - s * 0.42 + Math.sin(tAnim * 10 + o.x) * 4; glow(c, sx, fy, s * 0.7, 'rgba(255,120,60,1)', 0.4); emoji(o.e, sx, fy, s * 0.85, 0); cue(sx, y - s * 0.95, 2, s); }
        return;
      }
      if (kk === 1) {                       // low hurdle: jump over it
        shadow(sx, gy + 2, w * 1.1);
        c.fillStyle = '#f2ead8'; c.fillRect(sx - w, y + s * 0.15, s * 0.09, s * 0.3); c.fillRect(sx + w - s * 0.09, y + s * 0.15, s * 0.09, s * 0.3);
        c.lineWidth = 3; c.strokeStyle = DARK; c.strokeRect(sx - w, y + s * 0.15, s * 0.09, s * 0.3); c.strokeRect(sx + w - s * 0.09, y + s * 0.15, s * 0.09, s * 0.3);
        stripes(sx - w - 4, y + s * 0.15, w * 2 + 8, s * 0.12, '#fff', '#ff4d4d', 8); stripes(sx - w - 4, y + s * 0.31, w * 2 + 8, s * 0.12, '#ff4d4d', '#fff', 8);
        cue(sx, y - s * 0.15, 1, s);
      } else if (kk === 2) {                // high bar: slide under it
        shadow(sx, gy + 2, w * 1.1);
        c.fillStyle = '#6b5a8e'; c.fillRect(sx - w, y - s * 1.0, s * 0.09, s * 1.45); c.fillRect(sx + w - s * 0.09, y - s * 1.0, s * 0.09, s * 1.45);
        c.lineWidth = 3; c.strokeStyle = DARK; c.strokeRect(sx - w, y - s * 1.0, s * 0.09, s * 1.45); c.strokeRect(sx + w - s * 0.09, y - s * 1.0, s * 0.09, s * 1.45);
        stripes(sx - w - 4, y - s * 0.52, w * 2 + 8, s * 0.3, '#ffd23f', '#2b1d4a', 10);
        cue(sx, y - s * 1.2, 2, s);
      } else {
        shadow(sx, y + s * 0.42, s * 0.42);
        var rot = o.spin ? Math.sin(o.spin) * 0.5 : 0;
        if (o.spin) glow(c, sx, y, s * 0.8, 'rgba(255,120,60,1)', 0.35);
        emoji(o.e, sx, y, s, rot);
      }
    }
    function drawPickup(p) {
      var sx = L.px + p.x - dist; if (sx < -80 || sx > L.LW + 80) return;
      var k = kAt(sx), y = laneY(p.ly === undefined ? p.lane : p.ly, sx), s = L.size * k * 0.62, bob = Math.sin(tAnim * 4 + p.x * 0.05) * 5, kd = p.kind;
      if (kd === 'coin') {
        glow(c, sx, y + bob, s * 0.9, 'rgba(255,225,80,1)', 0.35);
        emoji('🪙', sx, y + bob, s, 0, Math.max(0.25, Math.abs(Math.cos(tAnim * 5 + p.x * 0.03))), 1);
      } else if (kd === 'letter') {
        var rd = L.size * k * 0.43, cols = DOORC[p.lane], gr = c.createLinearGradient(0, y - rd, 0, y + rd), cur = gate && gate.kind === 'spell' && p.col.x === gate.nx;
        gr.addColorStop(0, cols[0]); gr.addColorStop(1, cols[1]);
        if (cur) { c.strokeStyle = 'rgba(255,255,255,0.9)'; c.lineWidth = 4; c.setLineDash([8, 6]); c.beginPath(); c.arc(sx, y + bob, rd * (1.25 + 0.08 * Math.sin(tAnim * 8)), 0, TWO_PI); c.stroke(); c.setLineDash([]); }
        c.fillStyle = gr; c.beginPath(); c.arc(sx, y + bob, rd, 0, TWO_PI); c.fill(); c.lineWidth = 4 * k; c.strokeStyle = DARK; c.stroke();
        c.fillStyle = 'rgba(255,255,255,0.3)'; c.beginPath(); c.ellipse(sx - rd * 0.2, y + bob - rd * 0.45, rd * 0.5, rd * 0.25, 0, 0, TWO_PI); c.fill();
        outline(p.ch.toUpperCase(), sx, y + bob + 2, rd * 1.35, '#fff', 'center', EFONT);
      } else if (PU[kd]) {
        var d = PU[kd], r = s * 0.85;
        glow(c, sx, y + bob, r * 2, d.col, 0.55);
        c.fillStyle = 'rgba(255,255,255,0.92)'; c.beginPath(); c.arc(sx, y + bob, r, 0, TWO_PI); c.fill(); c.lineWidth = 5; c.strokeStyle = d.col; c.stroke();
        if (kd === 'x2') outline('×2', sx, y + bob, r * 1.0, '#ff9800', 'center', EFONT); else emoji(d.em, sx, y + bob, r * 1.2, 0);
      } else {
        glow(c, sx, y + bob, s * 1.3, kd === 'heart' ? 'rgba(255,120,180,1)' : 'rgba(255,240,100,1)', 0.5);
        emoji(kd === 'star' ? '⭐' : '💖', sx, y + bob, s * 1.25, Math.sin(tAnim * 3) * 0.15);
      }
    }
    function drawPlayer() {
      var gy = laneY(vl, L.px), s = L.size * 1.05, dl = lane - vl, run = tAnim * 14, hj = jh(), sl = slideT > 0;
      var stY, stX, rot = clamp(dl * 0.3, -0.35, 0.35), off = 0, lift = hj * L.size * 1.25;
      if (jt > 0) { var u = jt / JD; stY = u < 0.15 ? 1.3 : u < 0.5 ? 1.12 : 0.95; stX = 1 / stY; rot += u > 0.5 ? 0.12 : -0.08; }
      else if (landT > 0) { var lq = landT / 0.2; stY = 1 - 0.32 * lq; stX = 1 + 0.28 * lq; }
      else if (sl) { stY = 0.55; stX = 1.38; off = s * 0.1; rot = -0.15; }
      else { stY = 1 + Math.min(0.28, Math.abs(dl) * 0.4) + Math.sin(run) * 0.04; stX = 1 / stY + Math.cos(run) * 0.02; }
      var bob = (jt > 0 || sl) ? 0 : -Math.abs(Math.sin(run * 0.5)) * 7;
      var y = gy - lift + off + (1 - stY) * s * 0.4;
      shadow(L.px, gy + s * 0.46, s * 0.4 * (1 - hj * 0.35));
      if (magnet > 0) { c.strokeStyle = 'rgba(120,230,255,0.6)'; c.lineWidth = 4; c.beginPath(); c.arc(L.px, y, s * 0.8 + Math.sin(tAnim * 8) * 4, 0, TWO_PI); c.stroke(); }
      if (slowT > 0) { c.strokeStyle = 'rgba(127,216,255,0.55)'; c.lineWidth = 3; c.setLineDash([4, 8]); c.beginPath(); c.arc(L.px, y, s * 0.95, tAnim * 2, tAnim * 2 + TWO_PI); c.stroke(); c.setLineDash([]); }
      if (x2T > 0) glow(c, L.px, y, s * 1.0, 'rgba(255,210,63,1)', 0.35);
      /* two-beat run: lean forward and bounce on every step; the jump stretch / slide squash come from stY / stX above */
      if (chReady() && jt <= 0 && !sl && landT <= 0 && state === 'play') { var beat = Math.sin(run) > 0 ? 1 : -1; rot += 0.1 + beat * 0.035; }
      if (dash > 0) { for (var i = 1; i < 4; i++) { c.globalAlpha = 0.25 / i; drawChar(L.px - i * 34, y + bob, s, 0, stX, stY); } c.globalAlpha = 1; glow(c, L.px, y, s * 1.1, 'rgba(160,240,255,1)', 0.5); }
      if (state === 'over') c.globalAlpha = 0.85;
      if (inv > 0 && Math.floor(tAnim * 14) % 2 === 0 && state === 'play' && dash <= 0) c.globalAlpha = 0.35;
      drawChar(L.px, y + bob, s, rot, stX, stY);
      c.globalAlpha = 1;
      if (shieldT > 0) { c.strokeStyle = 'rgba(160,245,255,0.85)'; c.lineWidth = 5; c.fillStyle = 'rgba(160,245,255,0.18)'; c.beginPath(); c.arc(L.px, y + bob, s * 0.62, 0, TWO_PI); c.fill(); c.stroke(); }
      if (state === 'won') emoji('🎉', L.px + s * 0.5, y - s * 0.6, s * 0.5, Math.sin(tAnim * 8) * 0.3);
      // warning ring
      if (inWarn(gate) && state === 'play') {
        var ph = (tAnim * 1.6) % 1; c.strokeStyle = 'rgba(255,225,70,' + (0.9 - ph * 0.7) + ')'; c.lineWidth = 6; c.setLineDash([14, 10]);
        c.beginPath(); c.arc(L.px, gy, s * (0.7 + ph * 0.7), 0, TWO_PI); c.stroke(); c.setLineDash([]);
      }
    }
    function puIcon(i, kind, left, dur, nonum) {
      var d = PU[kind], x = 34 + i * 56, y = L.HUD + 84, r = 23, fr = dur > 0 ? clamp(left / dur, 0, 1) : 1;
      if (left < 2 && dur > 0 && Math.floor(tAnim * 6) % 2) c.globalAlpha = 0.5;
      c.fillStyle = 'rgba(25,12,60,0.7)'; circ(c, x, y, r + 3);
      c.strokeStyle = d.col; c.lineWidth = 5; c.beginPath(); c.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + TWO_PI * fr); c.stroke();
      if (kind === 'x2') outline('×2', x, y, 20, '#ffd23f', 'center', EFONT); else emoji(d.em, x, y, 26, 0);
      if (!nonum && dur > 0) outline(Math.ceil(left) + '', x + r * 0.8, y + r * 0.85, 15, '#fff', 'center', EFONT, 3);
      c.globalAlpha = 1;
    }
    function heartIcon(x, y, size, on) {
      var q = size / 2;
      c.save(); c.translate(x, y); c.beginPath();
      c.moveTo(0, q * 0.95); c.bezierCurveTo(-q * 1.6, -q * 0.1, -q * 0.75, -q * 1.15, 0, -q * 0.4); c.bezierCurveTo(q * 0.75, -q * 1.15, q * 1.6, -q * 0.1, 0, q * 0.95); c.closePath();
      c.fillStyle = on ? '#FF6B81' : 'rgba(255,255,255,0.16)'; c.fill();
      c.lineJoin = 'round'; c.lineWidth = Math.max(2, size * 0.09); c.strokeStyle = on ? INK : 'rgba(255,255,255,0.4)'; c.stroke();
      if (on) { c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.ellipse(-q * 0.5, -q * 0.3, q * 0.22, q * 0.14, -0.6, 0, TWO_PI); c.fill(); }
      c.restore();
    }
    function coinIcon(x, y, r) {
      c.fillStyle = '#FFC94A'; circ(c, x, y, r); c.lineWidth = Math.max(2, r * 0.2); c.strokeStyle = INK; c.beginPath(); c.arc(x, y, r, 0, TWO_PI); c.stroke();
      c.strokeStyle = '#C48A00'; c.lineWidth = Math.max(1.5, r * 0.15); c.beginPath(); c.arc(x, y, r * 0.58, 0, TWO_PI); c.stroke();
    }
    function textW(txt, size, font) { c.font = '800 ' + size + 'px ' + (font || FONT); return c.measureText(txt).width; }
    function drawHUD() {
      var LW = L.LW, P = L.portrait, i, hh = L.HUD, pn = L.pn, K = L.K;
      var lm = (16 + SAFE.l) / S, rtx = LW - (SAFE.r + 12 + 48 + 10) / S;   /* text keeps >= 16px from the left edge and clears the pause button */
      hudRec = [];
      c.fillStyle = 'rgba(11,16,48,0.72)'; rr(c, -20, -20, LW + 40, hh + 20, 22); c.fill();
      c.strokeStyle = 'rgba(255,255,255,0.18)'; c.lineWidth = 2; c.beginPath(); c.moveTo(0, hh); c.lineTo(LW, hh); c.stroke();
      var nh = Math.max(startHearts, hearts), hs = 26 * K, hy = (8 + SAFE.t) / S + hs / 2 + (P ? 8 : 0);
      for (i = 0; i < nh; i++) heartIcon(lm + hs / 2 + i * (hs + 6), hy, hs, i < hearts);
      var tot = N, shown = Math.min(gateIdx + 1, tot), g = gate && !gate.judged ? gate : null;
      rr(c, pn.x, pn.y, pn.w, pn.h, 18); c.fillStyle = 'rgba(11,16,48,0.78)'; c.fill(); c.lineWidth = gate && gate.boss ? 3 : 1.5; c.strokeStyle = gate && gate.boss ? GOLD : 'rgba(255,255,255,0.3)'; c.stroke();
      var t = g ? g.target : (!finishX && prevGate ? prevGate.target : null), zhl = t ? ((t.emoji ? t.emoji + ' ' : '') + t.zh) : '衝向終點！', fs, mw;
      if (g && g.kind === 'spell') {
        var n = g.n, bw = Math.min(36, (pn.w - 170) / n - 4), bx0 = pn.x + pn.w - 14 - n * (bw + 4) + 4, leftW = bx0 - pn.x - 14;
        fs = P ? 32 : 30; c.font = '800 ' + fs + 'px ' + FONT; mw = c.measureText(zhl).width; if (mw > leftW - 8) fs *= (leftW - 8) / mw;
        outline(zhl, pn.x + 10 + leftW / 2, pn.y + pn.h / 2 + 2, fs, GOLD, 'center', FONT, Math.max(4, fs * 0.16));
        for (i = 0; i < n; i++) {
          var cur = i === g.idx, bxx = bx0 + i * (bw + 4);
          rr(c, bxx, pn.y + pn.h / 2 - bw * 0.6, bw, bw * 1.2, 8); c.fillStyle = i < g.idx ? '#3fc96a' : cur ? '#ffe14d' : 'rgba(255,255,255,0.14)'; c.fill();
          c.lineWidth = cur ? 4 : 2; c.strokeStyle = i < g.idx || cur ? INK : 'rgba(255,255,255,0.4)'; c.stroke();
          if (i < g.idx) outline(g.word[i].toUpperCase(), bxx + bw / 2, pn.y + pn.h / 2 + 2, bw * 0.75, '#fff', 'center', EFONT, 3.5);
          else if (cur) { c.fillStyle = INK; c.fillRect(bxx + bw * 0.25, pn.y + pn.h / 2 + bw * 0.28 + Math.sin(tAnim * 8) * 2, bw * 0.5, 4); }
        }
      } else {
        var label = g && g.kind === 'listen' ? (canSpeak ? '聽一聽，選對的門' : zhl) : zhl;
        fs = P ? 36 : 34; c.font = '800 ' + fs + 'px ' + FONT; mw = c.measureText(label).width; if (mw > pn.w - 90) fs *= (pn.w - 90) / mw;
        outline(label, pn.x + pn.w / 2, pn.y + pn.h / 2 + 2, fs, GOLD, 'center', FONT, Math.max(4, fs * 0.16));
        if (g && g.kind === 'listen' && canSpeak) outline('點這裡重聽', pn.x + pn.w - 12, pn.y + pn.h - 12, 14 * K, '#fff', 'right', FONT, 3);
      }
      /* score 20px+, secondary lines 14px+ (css px) */
      var sz = 20 * K, sy = P ? hy : hh - 14 * K, scTxt = '分數 ' + score;
      outline(scTxt, P ? rtx : lm, sy, sz, x2T > 0 ? '#ffd23f' : '#fff', P ? 'right' : 'left');
      if (!P) { coinIcon(lm + textW(scTxt, sz) + 16 * K, sy, 9 * K); outline(coins + '', lm + textW(scTxt, sz) + 30 * K, sy, sz, GOLD, 'left'); }
      var info = '第 ' + shown + '/' + tot + ' 道門' + (combo > 1 ? '　連擊 ×' + combo : '');
      if (endless) info = ((dist / 50) | 0) + ' 米' + (combo > 1 ? '　連擊 ×' + combo : '');
      var showBar = !endless && !(bossOn), sm = 14 * K;
      if (bossOn) {
        var bwid = P ? LW - 2 * lm : 190 * K, bxp = P ? lm : rtx - bwid, byp = P ? 154 : 44, bh2 = P ? 26 : 24 * Math.min(K, 1.2), cw2 = (bwid - 8) / bossMax;
        rr(c, bxp, byp, bwid, bh2, 10); c.fillStyle = 'rgba(0,0,0,0.5)'; c.fill();
        for (i = 0; i < bossMax; i++) { rr(c, bxp + 4 + i * cw2 + 1, byp + 4, cw2 - 2, bh2 - 8, 6); c.fillStyle = i < bossHp ? (bossPhase === 2 ? '#ff4d4d' : '#ff9a3d') : 'rgba(255,255,255,0.12)'; c.fill(); }
        c.lineWidth = 3; c.strokeStyle = bossPhase === 2 ? '#ff6b6b' : '#fff'; rr(c, bxp, byp, bwid, bh2, 10); c.stroke();
        outline((bossDone ? '被打敗！' : B.name + (bossPhase === 2 ? ' 狂暴' : '')), bxp + bwid / 2, byp + bh2 / 2 + 1, Math.min(sm, bh2 * 0.75), '#fff', 'center', FONT, 4);
        if (!P) outline(bossDone ? '' : '答對 → 攻擊魔王', rtx, 26, sm, '#ffd23f', 'right');
      } else if (endless) {
        var bb = bestRec || (bestRec = loadBest());
        if (P) outline(info + '　最佳 ' + bb.dist + '米　金幣 ' + coins, LW / 2, hh - 14 * K, sm, '#fff'); else { outline(info, rtx, 26, sz, '#fff', 'right'); outline('最佳 ' + bb.dist + ' 米', rtx, 26 + 26 * K, sm, '#ffd23f', 'right'); }
      } else if (P) {
        rr(c, lm, hh - 38 * K, LW - 2 * lm, 10, 5); c.fillStyle = 'rgba(255,255,255,0.25)'; c.fill();
        rr(c, lm, hh - 38 * K, Math.max(10, (LW - 2 * lm) * Math.min(1, gateIdx / tot)), 10, 5); c.fillStyle = '#7dff6a'; c.fill();
        outline(info, lm + 0, hh - 14 * K, sm, '#fff', 'left');
        coinIcon(LW - lm - 9 * K - textW(coins + '', sm), hh - 14 * K, 8 * K); outline(coins + '', LW - lm, hh - 14 * K, sm, GOLD, 'right');
      } else {
        outline(info, rtx, 26, sz, '#fff', 'right');
        var bwl = 130 * Math.min(K, 1.3);
        rr(c, rtx - bwl, 26 + 22 * K, bwl, 12, 6); c.fillStyle = 'rgba(255,255,255,0.25)'; c.fill();
        rr(c, rtx - bwl, 26 + 22 * K, Math.max(12, bwl * Math.min(1, gateIdx / tot)), 12, 6); c.fillStyle = '#7dff6a'; c.fill();
      }
      hudLast = hudRec; hudRec = null;
      // power-up timers
      var ai = 0;
      if (slowT > 0) puIcon(ai++, 'slow', slowT, PU.slow.dur); if (x2T > 0) puIcon(ai++, 'x2', x2T, PU.x2.dur); if (magnet > 0) puIcon(ai++, 'magnet', magnet, PU.magnet.dur);
      if (shieldT > 0) puIcon(ai++, 'shield', shieldT > 1e8 ? 1 : shieldT, shieldT > 1e8 ? 0 : PU.shield.dur, shieldT > 1e8);
      if (revive) puIcon(ai++, 'revive', 1, 0, true);
      // dash meter + key legend (non-touch)
      if (!touchMode) {
        var dx = 18, dy = L.LH - 30, r = dashCd > 0 ? 1 - dashCd / 4 : 1;
        rr(c, dx, dy - 12, 150, 24, 12); c.fillStyle = 'rgba(25,12,60,0.6)'; c.fill();
        rr(c, dx + 3, dy - 9, Math.max(8, 144 * r), 18, 9); c.fillStyle = r >= 1 ? '#5be4ff' : '#9a8fc0'; c.fill();
        outline('⚡ Enter 衝刺', dx + 75, dy, 14, '#fff', 'center', FONT, 3);
        outline('↑↓ 轉線　空白鍵 跳　Shift 滑', dx + 165, dy, 14, '#fff', 'left', FONT, 3);
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
      if (shake > 0 && !reduced) c.translate((Math.random() - 0.5) * 18 * shake, (Math.random() - 0.5) * 18 * shake);
      drawScene(); drawParts();
      c.restore();
      if (inWarn(gate) && state === 'play') {
        var g = c.createRadialGradient(L.LW / 2, L.LH / 2, L.LH * 0.35, L.LW / 2, L.LH / 2, L.LH * 0.85);
        g.addColorStop(0, 'rgba(255,200,40,0)'); g.addColorStop(1, 'rgba(255,200,40,' + (0.12 + 0.1 * Math.sin(warnFlash * 8)) + ')'); c.fillStyle = g; c.fillRect(0, 0, L.LW, L.LH);
      }
      if (inv > 0.9 && !reduced) { c.fillStyle = 'rgba(255,60,60,' + (inv - 0.9) * 0.6 + ')'; c.fillRect(0, 0, L.LW, L.LH); }
      drawHUD();
      if (banner) {
        var ba = clamp(banner.t * 2, 0, 1), sc2 = 1 + (1 - clamp((2.4 - banner.t) * 4, 0, 1)) * 0.0;
        c.globalAlpha = ba; c.save(); c.translate(L.LW / 2, Math.max(L.HUD + 150, L.cy - L.half * 0.55)); c.scale(sc2, sc2); outline(banner.text, 0, 0, 44, banner.col, 'center', FONT, 8); c.restore(); c.globalAlpha = 1;
      }
      var want = state === 'play' && !!gate && !gate.judged && gate.kind === 'listen' && canSpeak;
      if (want !== sayShown) { sayShown = want; sayBtn.style.display = want ? 'block' : 'none'; }
      if (touchMode) {
        var txt = dashCd > 0 ? Math.ceil(dashCd) + '' : 'ok';
        if (txt !== lastDashTxt) { lastDashTxt = txt; dashBtn.querySelector('i').textContent = dashCd > 0 ? txt : '衝刺'; dashBtn.style.opacity = dashCd > 0 ? '0.55' : '1'; }
      }
    }

    /* ----- input ----- */
    function setTouch() { if (touchMode) return; touchMode = true; root.classList.add('wq37r-touch'); if (state === 'ready') showStart(); }
    function replaySay() { if (gate && !gate.judged && gate.kind === 'listen') speak(gate.target.en); }
    function onKey(e) {
      if (dead || !root.isConnected) return;
      var k = e.key, code = e.code;
      if (state === 'ready') { if (k === 'Enter' || k === ' ' || code === 'Space') { e.preventDefault(); e.stopPropagation(); begin(); } return; }
      if (k === 'p' || k === 'P' || k === 'Escape') { e.preventDefault(); if (state === 'play') pause(); else if (state === 'paused') resume(); return; }
      if (state === 'paused') { if (k === 'Enter' || k === ' ') { e.preventDefault(); resume(); } return; }
      if ((state === 'won' || state === 'over') && cardShown) { if (k === 'Enter') { e.preventDefault(); replay(); } return; }
      if (state === 'learn') {
        if ((k === 'Enter' || k === ' ' || code === 'Space') && !e.repeat) { e.preventDefault(); lcDone(false); }
        else if ((k === 'r' || k === 'R') && lc) speak(lc.w.en);
        else if (k.indexOf('Arrow') === 0) e.preventDefault();
        return;
      }
      if (state !== 'play') return;
      ensureAudio();
      if (k === 'ArrowUp' || k === 'w' || k === 'W') { e.preventDefault(); if (!e.repeat) changeLane(-1); }
      else if (k === 'ArrowDown' || k === 's' || k === 'S') { e.preventDefault(); if (!e.repeat) changeLane(1); }
      else if (k === ' ' || code === 'Space' || k === 'ArrowRight' || k === 'd' || k === 'D') { e.preventDefault(); if (!e.repeat) doJump(); }
      else if (k === 'Shift' || k === 'ArrowLeft' || k === 'c' || k === 'C' || k === 'a' || k === 'A') { e.preventDefault(); if (!e.repeat) doSlide(); }
      else if (k === 'Enter' || k === 'z' || k === 'Z') { e.preventDefault(); doDash(); }
      else if (k === 'r' || k === 'R') { replaySay(); }
    }
    var swId = null, swX = 0, swY = 0, sw0X = 0, sw0Y = 0, swT = 0, swAct = false;
    function onDown(e) {
      if (e.pointerType === 'touch') setTouch();
      ensureAudio();
      if (e.target && e.target.closest && e.target.closest('.wq37r-ov,.wq37r-btn,.wq37r-say,.wqlc')) return;
      swId = e.pointerId; swX = sw0X = e.clientX; swY = sw0Y = e.clientY; swT = performance.now(); swAct = false;
    }
    function onMove(e) {
      if (e.pointerId !== swId) return;
      var dy = e.clientY - swY, dx = e.clientX - swX;
      if (Math.abs(dy) > 28 && Math.abs(dy) > Math.abs(dx)) { if (dy < 0) doJump(); else doSlide(); swAct = true; swY = e.clientY; swX = e.clientX; }
    }
    function tapLane(cy2) {
      var r = canvas.getBoundingClientRect(); if (!r.height) return;
      var y = (cy2 - r.top) / r.height * L.LH;
      if (y < L.cy - L.half - L.gap * 0.3 || y > L.cy + L.half + L.gap * 0.3) return;
      setLane(Math.round(clamp((y - L.cy) / L.gap + 1, 0, 2)));
    }
    function onUp(e) {
      if (e.pointerId !== swId) return; swId = null;
      if (!swAct && state === 'play' && Math.abs(e.clientX - sw0X) < 16 && Math.abs(e.clientY - sw0Y) < 16 && performance.now() - swT < 500) tapLane(e.clientY);
    }
    function ctl(fn) { return function (e) { e.preventDefault(); e.stopPropagation(); if (e.pointerType === 'touch') setTouch(); ensureAudio(); if (state === 'learn') { if (fn === replaySay) { if (lc) speak(lc.w.en); } else lcDone(false); return; } fn(); }; }
    var onUpBtn = ctl(function () { changeLane(-1); }), onDownBtn = ctl(function () { changeLane(1); }), onDashBtn = ctl(doDash), onJumpBtn = ctl(doJump), onSlideBtn = ctl(doSlide), onSayBtn = ctl(replaySay);
    var onPauseBtn = ctl(function () { if (state === 'play') pause(); else if (state === 'paused') resume(); });
    function onVis() { if (doc.hidden) pause(); }
    var onResize = function () { if (!dead) layout(); };
    window.addEventListener('keydown', onKey, true);
    root.addEventListener('pointerdown', onDown);
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', function (e) { if (e.pointerId === swId) swId = null; });
    doc.addEventListener('visibilitychange', onVis);
    window.addEventListener('resize', onResize);
    upBtn.addEventListener('pointerdown', onUpBtn); downBtn.addEventListener('pointerdown', onDownBtn); dashBtn.addEventListener('pointerdown', onDashBtn);
    jumpBtn.addEventListener('pointerdown', onJumpBtn); slideBtn.addEventListener('pointerdown', onSlideBtn); sayBtn.addEventListener('pointerdown', onSayBtn);
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
      window.removeEventListener('resize', onResize);
      doc.removeEventListener('visibilitychange', onVis);
      if (ro) { try { ro.disconnect(); } catch (e) { /* */ } ro = null; }
      try { if (canSpeak) window.speechSynthesis.cancel(); } catch (e) { /* */ }
      try { if (actx) actx.close(); } catch (e) { /* */ }
      actx = null;
      if (root.parentNode) root.parentNode.removeChild(root);
      if (styleEl.parentNode) styleEl.parentNode.removeChild(styleEl);
      if (current === inst) current = null;
    }

    var inst = {
      destroy: destroy, pause: pause, resume: resume,
      _state: function () {
        var g = gate && !gate.judged ? gate : null, sp = null, rc = canvas.getBoundingClientRect();
        if (g && g.kind === 'spell') {
          var op = openCols(g), c0 = op[0];
          sp = { word: g.word, idx: g.idx, n: g.n, mis: g.mis, got: g.word.slice(0, g.idx), open: op.length, okLane: c0 ? c0.cl : null, badLane: c0 ? (c0.cl + 1) % 3 : null,
            letters: c0 ? c0.tk.map(function (t) { return t.ch; }) : [], needed: g.word[g.idx] };
        }
        return {
          state: state, lane: lane, hearts: hearts, score: score, combo: combo, gateIndex: gateIdx, gates: N, ts: ts, gateX: g ? g.x : null, runT: runTime, warnPx: g ? g.wp : null, effSpeed: curSpeed() * ts, obsK: obstacles.filter(function (o) { return o.k; }).length, kSpawned: kSpawned, obsXs: obstacles.map(function (o) { return o.x; }), distNow: dist,
          learn: lc ? { ok: lc.ok, word: lc.w.en, zh: lc.w.zh, t: lc.t, min: lc.min, max: lc.max, ready: lc.t >= lc.min } : null,
          correctWord: g && g.doors ? g.target.en : null, doors: g && g.doors ? g.doors.map(function (d) { return { lane: d.lane, word: d.word }; }) : [], gateKind: g ? g.kind : null, spell: sp,
          armed: armedNow(0), stagePassed: stagePassed, result: lastResult, boss: bossOn, bossStreak: bossStreak, coins: coins, correct: correct, wrong: wrong,
          bossHp: bossHp, bossMax: bossMax, bossPhase: bossPhase, bossDone: bossDone, attacks: atks.map(function (a) { return a.k; }), atkInfo: atks.map(function (a) { return { k: a.k, lane: a.lane, t: a.t, warn: a.warn, hi: !!a.hi }; }), bossName: B.name,
          dist: dist, shield: shieldT > 0, touch: touchMode, cardShown: cardShown, avgRenderMs: avgMs, dashCd: dashCd, speed: curSpeed(), finishX: finishX,
          obstacles: obstacles.length, pickups: pickups.length, bg: worldI, mode: endless ? 'endless' : 'story',
          airborne: jt > 0, jumpH: jh(), sliding: slideT > 0, shake: shake, reduced: reduced, dodges: dodges, banner: banner ? banner.text : null,
          pu: { slow: Math.max(0, slowT), x2: Math.max(0, x2T), magnet: Math.max(0, magnet), shield: shieldT > 1e8 ? -1 : Math.max(0, shieldT), revive: revive, reviveUsed: reviveUsed },
          canSpeak: canSpeak, spoke: spokeN, lastSpoken: lastSpoken, sayVisible: sayShown, ambient: W.amb, meters: (dist / 50) | 0,
          laneScreen: [0, 1, 2].map(function (l) { return rc.top + laneY(l, L.px) * S; }), px: rc.left + L.px * S,
          char: { id: chId, src: chSrc, loaded: chReady(), draws: chDraws },
          hud: { S: S, K: L.K, hud: hudLast.map(function (q) { return { t: q.t, size: q.size, r: q.r }; }), logicalHud: L.HUD * S, pn: [L.pn.x * S, L.pn.y * S, (L.pn.x + L.pn.w) * S, (L.pn.y + L.pn.h) * S] }
        };
      },
      _lane: function (n) { lane = clamp(n | 0, 0, 2); vl = lane; },
      _advance: advance,
      _hold: function (b) { holdGate = !!b; },
      _learnSkip: function () { lcDone(true); },
      _god: function (b) { godMode = !!b; },
      _jump: doJump, _slide: doSlide,
      _step: function (n, ff) { for (var i = 0; i < n && state === 'play'; i++) step(1 / 60, !!ff); },
      _spawn: function (k, l, ahead) { for (var i = 0; i < 3; i++) if (l === 'all' || l === i) addObs(dist + (ahead || 400), i, k); },
      _quiet: function (b) { quiet = !!b; if (quiet) { obstacles.length = 0; for (var i = pickups.length - 1; i >= 0; i--) if (pickups[i].kind !== 'letter') pickups.splice(i, 1); } },
      _give: givePU, _hearts: function (n) { hearts = n | 0; }, _score: function (n) { score = n | 0; },
      _bossForce: function () { if (isBoss && !bossOn) { bossOn = true; bossIn = 1; atkT = 0.1; } },
      _farGate: function () { if (gate) gate.x = dist + 1e7; },
      _gateAt: function (px) { if (gate) gate.x = dist + px; },   // R3.20: lets slow wall-clock tests keep the first gate away
      _speakGate: replaySay
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
  API._debugJump = function () { if (current) current._jump(); };
  API._debugSlide = function () { if (current) current._slide(); };
  API._debugStep = function (n, ff) { if (current) current._step(n, ff); };
  API._debugLearnSkip = function () { if (current) current._learnSkip(); };
  API._debugSpawn = function (k, l, ahead) { if (current) current._spawn(k, l, ahead); };
  API._debugQuiet = function (b) { if (current) current._quiet(b); };
  API._debugGive = function (k) { if (current) current._give(k); };
  API._debugHearts = function (n) { if (current) current._hearts(n); };
  API._debugScore = function (n) { if (current) current._score(n); };
  API._debugFarGate = function () { if (current) current._farGate(); };
  API._debugGateAt = function (px) { if (current) current._gateAt(px); };
  API._debugBoss = function () { if (current) current._bossForce(); };
  globalThis.WQ37Run = API;
})();

;
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
    /* R3.38: lapse = the question ran out with no answer given; the item still comes back and still is no first-try hit, but it is not recorded as a wrong answer */
    function emit(k, it, x) { try { if (o.onEvent) o.onEvent(k, x); } catch (e) { /* */ } }
    L.note = emit;
    L.answer = function (it, ok, ms, lapse) {
      var s = stats[it.id]; if (!s) return null; s.tries++; s.ms += ms || 0;
      if (lapse) { s.lapses = (s.lapses || 0) + 1; emit('lapse', it, { typed: lapse === 'typed' }); } else { emit(ok ? 'ok' : 'wrong', it); if (ok && s.tries > (s.lapses || 0) + 1) emit('fix', it); }
      if (s.firstOk === null) { s.firstOk = !!ok; if (!s.rv) { firstN++; if (ok) firstOkN++; } }
      var out = { ok: !!ok, first: s.tries === 1, requeued: false, item: it };
      if (ok) { s.ok = true; if (!s.rv) correctN++; return out; }
      s.missed++;
      if (!s.rv && s.requeued < maxRe) {   /* review and filler items never come back: a miss only opens the learning card */
        s.requeued++; var at = Math.min(queue.length, gapMin + Math.floor(rng() * (gapMax - gapMin + 1)) - 1);
        /* near the end of the level there may be fewer than 'gapMin' items left: fill the gap with already-solved items (revisit, never counted) so a miss is never asked again straight after its card */
        var need = Math.max(0, Math.min(2, gapMin) - queue.length), cand = items.filter(function (x) { return stats[x.id] && stats[x.id].ok && x.id !== it.id; }), f;
        while (need-- > 0 && cand.length) { f = cand.splice(Math.floor(rng() * cand.length), 1)[0]; fillN++; var fl = Object.assign({}, f, { id: 'fl' + fillN + ':' + f.id, rv: true }); stats[fl.id] = { id: fl.id, rv: true, item: fl, tries: 0, firstOk: null, ok: false, ms: 0, requeued: 0, missed: 0 }; queue.push(fl); }
        var back = it; if (it.alt) { back = Object.assign({}, it, it.alt, { alt: null }); s.item = back; }
        at = Math.min(queue.length, Math.max(at, Math.min(2, gapMin))); queue.splice(Math.max(0, at), 0, back); out.requeued = true;
      }
      return out;
    };
    /* the child used a hint on this item: it can no longer count as a first-try hit */
    L.assisted = function (it) { var s = stats[it.id]; if (!s || s.rv) return; if (s.firstOk === true) { firstOkN--; s.firstOk = false; } else if (s.firstOk === null) { s.firstOk = false; firstN++; } if (!s.hinted) emit('hint', it); s.hinted = true; };
    L.progress = function () { var okN = 0, k; for (k in stats) if (stats[k].ok && !stats[k].rv) okN++; return { done: okN, total: items.length, tries: Object.keys(stats).reduce(function (n, k) { return n + stats[k].tries; }, 0) }; };
    L.firstAcc = function () { return firstN ? firstOkN / firstN : 0; };
    L.accuracy = function () { var t = 0, ok = 0, k; for (k in stats) { if (stats[k].rv) continue; t += stats[k].tries; if (stats[k].ok) ok++; } return t ? ok / t : 0; };
    /* cleared:false (lost / quit) can never pass. Items never asked count as not first-try-correct. */
    /* R3.30 C-09: a level is passed at the parent's pass rate (o.passRate, the same one the 闖關 uses); without one it stays at 70% = 3 stars */
    L.passRate = o.passRate != null && isFinite(+o.passRate) && +o.passRate > 0 ? +o.passRate : .70;
    L.result = function (x) {
      x = x || {}; var cleared = x.cleared !== false, core = items.length, fa = core ? firstOkN / core : 0;
      var per = Object.keys(stats).map(function (k) { var s = stats[k], it = s.item; return { id: s.id, rv: s.rv, en: it.en || '', zh: it.zh || '', q: it.q || '', a: it.a != null ? String(it.a) : '', emoji: it.emoji || '', tries: s.tries, firstOk: s.firstOk === true, ok: s.ok, missed: s.missed, ms: Math.round(s.ms), lapses: s.lapses || 0, hinted: !!s.hinted, how: !s.tries ? 'none' : (s.lapses || 0) >= s.tries ? 'lapse' : s.hinted ? 'hint' : s.firstOk ? 'ok' : 'wrong' }; });
      var stars = cleared ? GX.starsOf(fa) : 1;
      return { stars: stars, passed: cleared && fa >= L.passRate - 1e-9, passRate: L.passRate, cleared: cleared, accuracy: Math.round(L.accuracy() * 1000) / 1000, firstTryAccuracy: Math.round(fa * 1000) / 1000, firstTryCorrect: firstOkN, total: core, score: x.score || 0, maxCombo: x.maxCombo || 0, seconds: Math.round(x.seconds || 0), difficulty: x.difficulty || o.difficulty || 1, mode: x.mode || o.mode || 'level', subject: o.subject || '', perItem: per, missed: per.filter(function (p) { return !p.rv && p.missed > 0 && p.how !== 'lapse'; }), lapses: per.filter(function (p) { return !p.rv && p.how === 'lapse'; }).length, hints: per.filter(function (p) { return !p.rv && p.hinted; }).length };
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
    S.learn = GX.Learn({ items: opts.items, review: opts.review, subject: opts.subject, difficulty: opts.difficulty, mode: opts.mode, seed: opts.seed, passRate: opts.passRate, onEvent: opts.onLearn });
    S.gate = function (it, resume) { return !!(opts.onIdle && opts.onIdle(root, it, resume)); };
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
      S.learn = GX.Learn({ items: opts.items, review: opts.review, subject: opts.subject, difficulty: opts.difficulty, mode: opts.mode, passRate: opts.passRate, onEvent: opts.onLearn });
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
      S.ui.pause({ muted: S.audio.muted(), music: S.audio.musicOn(), onMusic: function (v) { S.audio.setMusicOn(v); }, onResume: function () { S.closePause(); }, onRestart: function () { S.paused = false; var go = function () { if (cfg.onRestart) cfg.onRestart(); }; if (opts.onAgain) opts.onAgain(go); else go(); }, onMute: function (v) { S.audio.setMuted(v); }, onExit: function () { S.paused = false; if (opts.onExit) opts.onExit(); } });
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
      S.later(function () { S.ui.result(res, { coins: coins, canNext: !!opts.onNext && res.passed, onRetry: function () { S.ui.close('result'); var go = function () { if (cfg.onRestart) cfg.onRestart(); }; if (opts.onAgain) opts.onAgain(go); else go(); }, onNext: function () { if (opts.onNext) opts.onNext(); }, onExit: function () { if (opts.onExit) opts.onExit(); } }); }, res.passed ? 900 : 450);
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

;
/* WQ37TD - 字母砲台 (Letter Cannon). Tower-defence-style learning game for English spelling and mental arithmetic.
   Needs WQ37GX (gx_core.js). Items come from S.learn only; the game never makes up questions.
   Core loop: word-monsters walk from the right towards the planet base on 3 (4 on wide screens) lanes. The question of the SELECTED monster
   is shown only in the top bar (never on the monsters). English: type the word letter by letter (each right letter = small shot, the whole word = big
   shot). Math: type the number (auto-checked, enter confirms fractions). Wrong answer / monster reaching the base = learning card (world frozen >= 2 s)
   and the item comes back later via GX.Learn. Combo upgrades the cannon (normal > fire > ice > thunder). Boss: syllable shields (English) /
   two-step question (math). Power-ups (meteor shower, freeze) drop only from correctly answered monsters.
   API: WQ37TD.start(box, opts) -> { destroy, pause, resume, _debug, _step(n,dt), _cmd(name,arg) } */
(function () {
  'use strict';
  var GX = globalThis.WQ37GX;
  if (!GX) { throw new Error('WQ37TD needs WQ37GX (gx_core.js)'); }
  var FONT = GX.FONT, EFONT = GX.EFONT, C = GX.C, GOLD = C.gold, clamp = GX.clamp, lerp = GX.lerp;

  var TIERS = [
    { k: 'normal', img: 'td_base.webp', col: '#ffd35a', col2: '#fff3c4', launch: 'shoot', hit: 'hit', ico: 'flame', name: '普通炮' },
    { k: 'fire', img: 'td_cannon_fire.webp', col: '#ff7a3c', col2: '#ffd08a', launch: 'boom', hit: 'boom', ico: 'flame', name: '火炮' },
    { k: 'ice', img: 'td_cannon_ice.webp', col: '#6fd8ff', col2: '#e6faff', launch: 'shield', hit: 'hit', ico: 'sparkle', name: '冰炮' },
    { k: 'thunder', img: 'td_cannon_thunder.webp', col: '#ffe94a', col2: '#fffbd0', launch: 'zap', hit: 'zap', ico: 'bolt', name: '雷炮' }
  ];
  var COMBO_AT = [0, 3, 5, 8];                         /* combo needed for tier 0..3 */
  /* R3.28 tactics layer (plants-vs-zombies style): correct answers earn star energy, energy buys lane helpers; new monster kinds and waves
     unlock with the level. Helpers only buy time - a monster still has to be answered to be defeated. */
  var HELPERS = [
    { k: 'wall', name: '星盾牆', cost: 2, at: 1, img: 'td_h_wall.webp', col: '#9b8cff', tip: '擋住字怪 6 秒', key: '1' },
    { k: 'ice', name: '冰晶塔', cost: 3, at: 3, img: 'td_h_ice.webp', col: '#6fd8ff', tip: '整條路減慢 20 秒', key: '2' },
    { k: 'mine', name: '星爆雷', cost: 3, at: 5, img: 'td_h_mine.webp', col: '#ff9d4a', tip: '把字怪炸回去', key: '3' }
  ];
  var KINDS = {
    fast: { at: 2, name: '快腳怪', sub: '走得特別快，要快答', tag: '快腳' },
    armor: { at: 4, name: '盔甲怪', sub: '', tag: '盔甲' },
    listen: { at: 6, name: '聽音怪', sub: '不看中文，只聽讀音拼字', tag: '聽音' }
  };
  var WALL_HP = 6, ICE_T = 20, ENERGY_MAX = 9;
  function feat(s, d, math, classic) {
    var e = (s | 0) + ((d | 0) >= 4 ? 1 : 0), no = { lv: e, energy: false, guard: false, helpers: [], fast: false, armor: false, listen: false, waves: 1 };
    if (classic) return no;
    return { lv: e, energy: e >= 1, guard: e >= 1, helpers: HELPERS.filter(function (h) { return e >= h.at; }).map(function (h) { return h.k; }), fast: e >= 2, armor: e >= 4, listen: !math && e >= 6, waves: e >= 5 ? 3 : e >= 2 ? 2 : 1 };
  }
  var BLOB_COL = ['#58d96b','#a56bff', '#9aa48c', '#ff6a5a', '#e9eef7', '#e0a23a', '#9fb2e8', '#ffe9a8'];

  /* ------------------------------------------------------------------ difficulty + level curve (one place, exported for tests) */
  var DIFF = {
    speed: [0.72, 0.85, 1.0, 1.15, 1.3],              /* walking speed multiplier (shown in params for comparison; the real pace is `cross`) */
    cross: [1.12, 1.05, 1.0, 0.92, 0.85],             /* entry-to-base time multiplier: easy = slow monsters */
    hearts: [5, 5, 4, 3, 3],                          /* base hearts */
    cap: [2, 2, 3, 3, 4],                             /* monsters on screen at once (levels 1-2 of difficulty 4-5 start one lower) */
    distract: [2, 3, 4, 0, 0],                        /* decoy letters on the small pad; 4-5 use the full QWERTY pad */
    hint: ['first', 'first', 'button', 'none', 'none']/* 1-2: first letter pre-filled (math: hint line shown); 3: hint button; 4-5: none */
  };
  function params(d, s) {
    d = clamp((d | 0) || 2, 1, 5); s = clamp(s | 0, 0, 9); var i = d - 1, sm = DIFF.speed[i];
    var cross = clamp((27 - s * 0.9) * DIFF.cross[i], 16, 30);                 /* seconds from entering at the right edge to the base: 16-30 s, shorter with level and difficulty */
    var cap = clamp(DIFF.cap[i] - (d >= 4 && s < 2 ? 1 : 0), 1, 4);
    return {
      d: d, s: s, hearts: DIFF.hearts[i], speedMul: sm, cross: cross,
      interval: cross / (cap + 0.8), cap: cap,                                 /* spawn spacing so that `cap` monsters are strung along the lane */
      distract: DIFF.distract[i], qwerty: d >= 4, hint: DIFF.hint[i], prefill: DIFF.hint[i] === 'first'
    };
  }

  /* ------------------------------------------------------------------ small helpers */
  function isMath(it) { return !!it && (it.kind === 'math' || it.en == null); }
  function esc(s) { return GX.esc(s); }
  var GLOW = {};
  function glow(col, px) {                                /* pre-rendered radial glow sprite */
    var m = GLOW[col] || (GLOW[col] = {}), g = m[px]; if (g) return g;
    var c = document.createElement('canvas'); c.width = c.height = px; var x = c.getContext('2d'), r = px / 2, gr = x.createRadialGradient(r, r, 0, r, r, r);
    gr.addColorStop(0, col); gr.addColorStop(.35, col + '99'); gr.addColorStop(1, col + '00'); x.fillStyle = gr; x.fillRect(0, 0, px, px); return (m[px] = c);
  }
  var SPR = {}, SPRN = 0;
  function sprite(src, px, d) {                           /* pre-scaled copy (halving steps) so the per-frame draw is a 1:1 blit; crisper than a 256 -> 60 px downscale each frame */
    var im = GX.img(src); if (!im.ok) return null;
    var tw = Math.max(2, Math.round(px * d)), key = src + '|' + tw, hit = SPR[key]; if (hit) return hit;
    var el = im.el, cw = el.naturalWidth || tw, ch = el.naturalHeight || tw, ratio = ch / cw, cur = el, c, x;
    while (cw > tw * 2) { var nw = Math.ceil(cw / 2), nh = Math.ceil(ch / 2); c = document.createElement('canvas'); c.width = nw; c.height = nh; x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(cur, 0, 0, nw, nh); cur = c; cw = nw; ch = nh; }
    c = document.createElement('canvas'); c.width = tw; c.height = Math.max(2, Math.round(tw * ratio)); x = c.getContext('2d'); x.imageSmoothingQuality = 'high'; x.drawImage(cur, 0, 0, c.width, c.height);
    if (SPRN > 70) { SPR = {}; SPRN = 0; } SPRN++; return (SPR[key] = { c: c, r: ratio });
  }
  var SHADOW = null;
  function shadowSprite() {
    if (SHADOW) return SHADOW; var c = document.createElement('canvas'); c.width = 96; c.height = 24; var x = c.getContext('2d'); x.translate(48, 12); x.scale(1, .25);
    var g = x.createRadialGradient(0, 0, 0, 0, 0, 48); g.addColorStop(0, 'rgba(0,0,0,.55)'); g.addColorStop(.6, 'rgba(0,0,0,.28)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.beginPath(); x.arc(0, 0, 48, 0, 6.3); x.fill(); return (SHADOW = c);
  }
  var PIPS = {};
  function pipSprite(n, done, pw, d) {                    /* progress pips of one monster, rendered once per (n, done) */
    var key = n + '|' + done + '|' + pw + '|' + d, hit = PIPS[key]; if (hit) return hit;
    var w = Math.ceil(n * pw + 2), h = 10, c = document.createElement('canvas'); c.width = Math.ceil(w * d); c.height = h * d; var x = c.getContext('2d'); x.scale(d, d); var r = Math.min(2.6, pw * .38);
    for (var z = 0; z < n; z++) { x.fillStyle = z < done ? GOLD : 'rgba(255,255,255,.35)'; x.beginPath(); x.arc(1 + pw / 2 + z * pw, h / 2, r, 0, 6.3); x.fill(); }
    if (Object.keys(PIPS).length > 200) PIPS = {}; return (PIPS[key] = { c: c, w: w, h: h });
  }
  var VIG = {};
  function vigSprite(col) {                               /* soft edge glow (tier aura), 96x160 stretched over the screen */
    if (VIG[col]) return VIG[col]; var c = document.createElement('canvas'); c.width = 96; c.height = 160; var x = c.getContext('2d'), g = x.createRadialGradient(48, 80, 30, 48, 80, 100);
    g.addColorStop(0, col + '00'); g.addColorStop(.62, col + '00'); g.addColorStop(1, col + 'cc'); x.fillStyle = g; x.fillRect(0, 0, 96, 160); return (VIG[col] = c);
  }
  function sylSegs(S, it) {                               /* syllable ends as string indexes into it.en (non-letters never hide a break point), else 2-4 letter chunks */
    var en = it.en, raw = S.syl(it) || '', parts = raw.split(/[·‧•\-\s.]+/).map(function (p) { return p.replace(/[^A-Za-z]/g, '').length; }).filter(Boolean), tot = 0, i, L = [];
    for (i = 0; i < en.length; i++) if (/[A-Za-z]/.test(en[i])) L.push(i);
    if (L.length < 2) return [en.length];
    function endAt(k) { return L[Math.max(1, Math.min(L.length, k)) - 1] + 1; }
    for (i = 0; i < parts.length; i++) tot += parts[i];
    var ends = [], run = 0;
    if (parts.length >= 2 && tot === L.length) { for (i = 0; i < parts.length; i++) { run += parts[i]; ends.push(endAt(run)); } return ends; }
    var n = Math.max(2, Math.min(4, Math.round(L.length / 3)));
    for (i = 1; i <= n; i++) { var v = endAt(Math.round(L.length * i / n)); if (!ends.length || v > ends[ends.length - 1]) ends.push(v); }
    return ends;
  }
  function realSyl(S, it) {                               /* syllable ends only when the word really has >= 2 syllables; else null */
    var raw = S.syl(it) || '', parts = raw.split(/[·‧•\-\s.]+/).map(function (p) { return p.replace(/[^A-Za-z]/g, '').length; }).filter(Boolean), n = it.en.replace(/[^A-Za-z]/g, '').length, tot = 0, i;
    for (i = 0; i < parts.length; i++) tot += parts[i]; if (parts.length < 2 || tot !== n) return null; return sylSegs(S, it);
  }
  function half(k) { var c = k.charCodeAt(0); if (c >= 0xFF01 && c <= 0xFF5E) return String.fromCharCode(c - 65248); if (k === '／') return '/'; if (k === '．' || k === '。') return '.'; if (k === '－' || k === '−') return '-'; return k; }

  var CSS = '' +
    '.td-root{--td-fy:120px}' +
    '.td-hud{position:absolute;left:0;right:0;top:0;z-index:4;pointer-events:none}' +
    '.td-row{display:flex;align-items:center;gap:8px;padding:4px 8px 0 58px;height:48px;box-sizing:border-box}' +
    '.td-root .gx-hudbtn{left:8px;top:2px;pointer-events:auto}' +
    '.td-hearts{display:flex;gap:1px;color:#ff5d7a;filter:drop-shadow(0 1px 0 rgba(0,0,0,.5))}.td-hearts svg{width:var(--tdh,20px);height:var(--tdh,20px)}.td-hearts .lost{color:#3a4180;opacity:.8}' +
    '.td-sp{flex:1}' +
    '.td-chip{display:inline-flex;align-items:center;gap:4px;height:30px;padding:0 10px;border-radius:999px;background:rgba(11,16,48,.62);border:1px solid rgba(255,255,255,.2);font-weight:900;font-size:var(--tdcf,16px);font-family:' + EFONT + ';color:' + C.text + '}' +
    '.td-chip svg{width:calc(var(--tdcf,16px) + 2px);height:calc(var(--tdcf,16px) + 2px)}.td-chip.coin{color:' + GOLD + '}.td-chip.combo{transition:transform .12s}.td-chip.combo.pop{transform:scale(1.18)}.td-chip.hide{display:none}' +
    '.td-prog{display:flex;align-items:center;gap:8px;padding:0 12px;height:calc(var(--tdf,14px) + 8px);font-size:var(--tdf,14px);font-weight:700;color:' + C.muted + ';box-sizing:border-box}' +
    '.td-prog .lv{white-space:nowrap}.td-bar{flex:1;height:8px;border-radius:5px;background:rgba(255,255,255,.16);overflow:hidden;min-width:30px}.td-bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#3ee6d0,#ffc94a);transition:width .3s}' +
    '.td-ev{display:none;padding:1px 8px;border-radius:999px;background:rgba(255,201,74,.2);color:' + GOLD + ';border:1px solid rgba(255,201,74,.5);white-space:nowrap}.td-ev.on{display:inline-block}' +
    '.td-land .td-hud{right:auto}.td-compact .td-prog .lv{display:none}.td-compact .td-prog{height:14px}.td-compact .td-row{height:44px}' +
    '.td-q{position:absolute;z-index:3;display:grid;grid-template-columns:auto minmax(0,1fr) auto;grid-template-rows:minmax(0,1fr) auto;grid-template-areas:"pic txt btns" "ans ans ans";column-gap:10px;row-gap:4px;align-items:center;padding:6px 10px;box-sizing:border-box;border-radius:20px;background:linear-gradient(160deg,rgba(30,38,96,.94),rgba(18,24,68,.94));border:1px solid rgba(255,255,255,.2);box-shadow:0 8px 20px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.12);overflow:hidden}' +
    '.td-q.shake{animation:tdshake .22s}@keyframes tdshake{20%{transform:translateX(-5px)}50%{transform:translateX(5px)}80%{transform:translateX(-3px)}}' +
    '.td-q.boss{border-color:#ff9d4a;box-shadow:0 8px 20px rgba(0,0,0,.4),0 0 0 2px rgba(255,157,74,.5)}' +
    '.td-pic{grid-area:pic;width:var(--pic,48px);height:var(--pic,48px);display:flex;align-items:center;justify-content:center;font-size:38px;border-radius:14px;background:rgba(255,255,255,.08)}.td-pic img{max-width:100%;max-height:100%;object-fit:contain}.td-pic.none{display:none}' +
    '.td-btns{grid-area:btns;display:flex;gap:8px;align-items:center}' +
    '.td-txt{grid-area:txt;align-self:stretch;font-weight:900;line-height:1.22;color:' + C.text + ';overflow:hidden;min-height:0;min-width:0;display:flex;align-items:center;overflow-wrap:anywhere;word-break:break-word}' +
    '.td-txt span{display:block}' +
    '.td-ans{grid-area:ans;display:flex;align-items:center;gap:8px;min-height:34px;flex-wrap:nowrap;overflow:hidden;min-width:0}' +
    '.td-slots{display:flex;gap:3px;align-items:center;flex-wrap:nowrap}.td-seg{display:flex;gap:3px;padding:2px 3px;border-radius:9px;border:1.5px solid rgba(111,216,255,.5);background:rgba(111,216,255,.08)}.td-seg.done{border-color:rgba(62,230,160,.7);background:rgba(62,230,160,.12)}' +
    '.td-slots i{font-style:normal;display:flex;align-items:center;justify-content:center;width:var(--sw,28px);height:var(--sh,32px);border-radius:8px;background:rgba(255,255,255,.1);border-bottom:3px solid rgba(255,255,255,.28);font-family:' + EFONT + ';font-weight:900;font-size:var(--sf,20px);color:' + C.text + ';box-sizing:border-box}' +
    '.td-slots i.f{background:rgba(62,230,160,.2);border-bottom-color:#3ee6a0;color:#9bffd2}.td-slots i.p{background:rgba(255,201,74,.18);border-bottom-color:' + GOLD + ';color:#ffe29a}' +
    '.td-slots i.n{position:relative;border-bottom-color:' + GOLD + '}.td-slots i.n::after{content:"";position:absolute;inset:0;border-radius:8px;background:rgba(255,201,74,.3);opacity:0;animation:tdblink 1s infinite;will-change:opacity;pointer-events:none}.td-slots i.h{color:' + GOLD + ';background:rgba(255,201,74,.22);border-bottom-color:' + GOLD + '}' +
    '.td-slots i.sp{background:none;border:0;width:calc(var(--sw,28px)*.6);color:' + C.muted + '}' +
    '@keyframes tdblink{50%{opacity:1}}' +
    '.td-num{min-width:64px;height:34px;padding:0 12px;display:flex;align-items:center;border-radius:10px;background:rgba(255,255,255,.12);border-bottom:3px solid ' + GOLD + ';font-family:' + EFONT + ';font-weight:900;font-size:24px;color:#fff;box-sizing:border-box;letter-spacing:.04em}' +
    '.td-num u{display:inline-block;width:2px;height:22px;margin-left:2px;background:' + GOLD + ';animation:tdcaret 1s steps(1) infinite;will-change:opacity}@keyframes tdcaret{50%{opacity:0}}' +
    '.td-eq{font-weight:900;font-size:20px;color:' + C.muted + '}' +
    '.td-hint{font-size:13px;font-weight:700;color:' + C.muted + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}' +
    '.td-tag{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:999px;background:rgba(255,157,74,.22);border:1px solid rgba(255,157,74,.6);color:#ffc690;font-size:12px;font-weight:900;white-space:nowrap}' +
    '.td-q button{flex:0 0 auto;width:44px;height:44px;border-radius:50%;border:1px solid rgba(255,255,255,.26);background:rgba(255,255,255,.1);color:' + C.text + ';display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer;touch-action:manipulation}' +
    '.td-q button:active{transform:translateY(1px)}.td-q button.td-hb{width:auto;border-radius:22px;padding:0 12px;gap:4px;font-size:14px;font-weight:900;color:' + GOLD + ';border-color:rgba(255,201,74,.5)}.td-q button.off{display:none}' +
    '.td-root .gx-okchip{top:calc(var(--td-fy) + 6px)}.td-root .gx-banner{top:calc(var(--td-fy) + 6px)}.td-root .gx-banner b{font-size:clamp(18px,5.4vw,26px);padding:4px 18px;background:rgba(20,26,70,.8)}.td-root .gx-banner small{font-size:13px;margin-top:3px;text-shadow:0 1px 4px #000}.td-root .gx-pad{justify-content:center}' +
    '.td-root .gx-prow.gx-scr{flex-wrap:wrap}.td-root .gx-pad.scr .gx-key{flex:0 1 46px;max-width:60px;min-width:44px}.td-root .gx-pad.scr .gx-key.bk{flex:0 1 62px;max-width:72px}' +
    '.td-root .gx-key.td-hl{box-shadow:0 0 0 3px ' + GOLD + ',0 0 14px rgba(255,201,74,.8)}' +
    '.td-root .gx-pad{box-sizing:border-box}' +
    '.td-root .gx-pad.dig{display:grid;grid-template-columns:repeat(var(--tdc,5),1fr);gap:6px;align-content:center;justify-content:center;max-width:460px;margin:0 auto;padding-left:12px;padding-right:12px;left:0;right:0;width:100%}' +
    '.td-root .gx-pad.dig .gx-prow{display:contents}.td-root .gx-pad.dig .gx-key{max-width:none;height:46px;font-size:24px}.td-root .gx-pad.dig .gx-key.go{grid-column:span 2;font-size:17px}' +
    '.td-land .gx-pad.dig{--tdc:6;max-width:620px}.td-land .gx-pad.dig.td-frac{--tdc:8;max-width:700px}.td-land.td-compact .gx-pad.dig .gx-key{height:44px}' +
    '.td-land .td-q{grid-template-columns:auto minmax(0,1fr) minmax(0,max-content) auto;grid-template-rows:minmax(0,1fr);grid-template-areas:"pic txt ans btns"}.td-land .td-ans{max-width:58vw}' +
    '.td-tray{position:absolute;left:4px;z-index:3;width:48px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px}.td-tray.off{display:none}' +
    '.td-en{display:flex;flex-direction:column;align-items:center;justify-content:center;width:46px;height:40px;border-radius:14px;background:rgba(11,16,48,.72);border:1px solid rgba(255,201,74,.55);color:' + GOLD + ';font-family:' + EFONT + ';font-weight:900;font-size:17px;line-height:1;box-sizing:border-box;transition:transform .12s}.td-en svg{width:16px;height:16px}.td-en.pop{transform:scale(1.2)}.td-en.no{animation:tdshake .22s}' +
    '.td-hp{position:relative;width:48px;height:52px;padding:2px 0 0;border-radius:14px;border:1px solid rgba(255,255,255,.28);background:linear-gradient(160deg,rgba(40,48,120,.92),rgba(18,24,68,.92));display:flex;flex-direction:column;align-items:center;justify-content:flex-start;cursor:pointer;touch-action:manipulation;color:#fff;box-shadow:0 4px 10px rgba(0,0,0,.35)}' +
    '.td-hp img{width:32px;height:32px;object-fit:contain;pointer-events:none}.td-hp b{font-family:' + EFONT + ';font-size:13px;font-weight:900;color:' + GOLD + ';line-height:1;display:flex;align-items:center;gap:1px}.td-hp b svg{width:11px;height:11px}' +
    '.td-tray.sm{gap:3px}.td-tray.sm .td-en{height:30px;flex-direction:row;gap:2px;font-size:15px}.td-tray.sm .td-hp{height:46px}.td-tray.sm .td-hp img{width:26px;height:26px}' +
    '.td-hp kbd{position:absolute;right:2px;top:1px;font:800 10px ' + EFONT + ';color:rgba(255,255,255,.6)}.td-coarse .td-hp kbd{display:none}' +
    '.td-hp.poor{filter:saturate(.25) brightness(.7)}.td-hp.ready{border-color:' + GOLD + ';box-shadow:0 0 0 2px rgba(255,201,74,.35),0 4px 10px rgba(0,0,0,.35)}.td-hp:active{transform:translateY(1px)}.td-hp.new::after{content:"新";position:absolute;left:-4px;top:-6px;padding:1px 4px;border-radius:7px;background:#ff5fa2;color:#fff;font-size:10px;font-weight:900}' +
    '.td-tag.k-fast{background:rgba(255,201,74,.2);border-color:rgba(255,201,74,.6);color:#ffe29a}.td-tag.k-armor{background:rgba(160,190,230,.2);border-color:rgba(190,215,255,.6);color:#dbe8ff}.td-tag.k-listen{background:rgba(255,120,190,.2);border-color:rgba(255,140,200,.6);color:#ffc4e2}' +
    '.td-q button.td-pulse{border-color:' + GOLD + ';box-shadow:0 0 0 3px rgba(255,201,74,.35);animation:tdpulse 1.2s infinite}@keyframes tdpulse{50%{box-shadow:0 0 0 7px rgba(255,201,74,.12)}}' +
    '.td-listen{color:#ffc4e2;display:flex!important;align-items:center;gap:6px}.td-listen svg{width:1.1em;height:1.1em}' +
    '@media (prefers-reduced-motion:reduce){.td-q.shake,.td-slots i.n::after,.td-num u,.td-q button.td-pulse,.td-en.no{animation:none!important}}';

  /* ================================================================== start */
  function start(box, opts) {
    opts = opts || {};
    var lv = opts.level || null, items0 = opts.items || [];
    var subject = opts.subject || (items0[0] && isMath(items0[0]) ? 'math' : 'english'), math = subject === 'math';
    var diff = clamp((opts.difficulty | 0) || 2, 1, 5), sLv = lv ? clamp(lv.s | 0, 0, 9) : 4, isBossLevel = !!(lv && (lv.boss || lv.s === 9)) && opts.mode !== 'free';
    var P = params(diff, sLv), F = feat(sLv, diff, math, !!opts.classic), needFrac = items0.some(function (i) { return i.pad === 'frac'; });
    var maxKeys = Math.min(13, items0.reduce(function (m, i) { if (isMath(i)) return m; var u = {}, n = 0; i.en.toLowerCase().replace(/[^a-z]/g, '').split('').forEach(function (c) { if (!u[c]) { u[c] = 1; n++; } }); return Math.max(m, Math.min(13, n + DIFF.distract[clamp((opts.difficulty | 0) || 2, 1, 5) - 1])); }, 4));
    var base = (opts.assetBase || 'assets/r321/'), seed0 = opts.seed;
    var S, pad = null, ready = false, styleEl = null;

    /* ---------------- state */
    ['td_h_wall', 'td_h_ice', 'td_h_mine', 'td_h_guard', 'td_k_helmet', 'td_k_phones', 'td_base', 'td_cannon_fire', 'td_cannon_ice', 'td_cannon_thunder', 'td_boss_1', 'td_boss_2'].concat([1, 2, 3, 4, 5, 6, 7, 8].map(function (i) { return 'td_enemy_' + i; })).concat(['bg_td_land', 'bg_td_port']).forEach(function (n) { GX.img(base + n + '.webp'); });
    var enemies = [], proj = [], bolts = [], meteors = [], pend = [], target = null, state = 'intro', frozen = false, lost = false;
    var hearts = P.hearts, combo = 0, maxCombo = 0, coins = 0, score = 0, tier = 0, playT = 0, spawnT = 0.2, uid = 0, bossSpawned = false, bossAlive = false, bossWon = false, cd = 0, cdShown = 0, lastBeepT = 0, meteorT = 0, runN = 0;
    var ev = { meteor: 0, freeze: 0, slow: 0 }, rng = GX.rng((seed0 != null ? seed0 : Date.now()) + 77), baseHit = 0, turret = { y: 0, tgtY: 0, recoil: 0, pop: 0, flash: 0 }, slowT = 0, curLayer = 0, amb = { stars: [], fly: [], bok: [] };
    var energy = F.energy ? 2 : 0, helpers = [], guards = [], guardFx = [], wave = 0, waveBreak = 0, waveBounds = [], spawnedIds = {}, spawnedCore = 0, seenKind = {}, forceKind = null;
    var L = { lt: 100, pf: .6, W: 0, H: 0, land: false, lanes: 3, laneH: 60, fy: 100, fh: 200, baseX: 60, spawnX: 400, endX: 70, es: 56, hudH: 70, qh: 88, qTop: 70, padH: 0, padOn: false };
    var stat = null, statOk = false, statSrc = '', padSig = '', hlKey = '', events = [];
    var el = {};                                       /* DOM refs */
    var lastHud = '';

    /* ---------------- shell */
    var cfg = {
      id: 'td', music: diff <= 2 ? 'calm' : 'drive',
      onRestart: function () { restart(); },
      onResize: function (w, h) {
        if (!ready) return;
        if (w === L.W && h === L.H) { statOk = false; buildStatic(); return; }    /* only the canvas DPR changed (core's adaptive resolution): rebuild the offscreen background, keep everything else */
        layout();
      },
      onResume: function () { if (pad) pad.disable(false); },
      onDestroy: function () { try { S.ui.closeAll(); } catch (e) { /* */ } if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl); }
    };
    S = GX.shell(box, opts, cfg);
    var root = S.root, cv = S.canvas;
    root.classList.add('td-root');
    styleEl = document.createElement('style'); styleEl.setAttribute('data-td', ''); styleEl.textContent = CSS; document.head.appendChild(styleEl);

    /* ---------------- DOM: hud + question bar + pad */
    var hud = document.createElement('div'); hud.className = 'td-hud';
    hud.innerHTML = '<div class="td-row"><div class="td-hearts" data-r="hearts" aria-label="基地心數"></div><div class="td-sp"></div><span class="td-chip coin" data-r="coins" aria-label="金幣">' + GX.ico('coin', 17) + '<b>0</b></span><span class="td-chip combo hide" data-r="combo" aria-label="連擊"><span data-r="cico"></span><b>0</b></span></div>' +
      '<div class="td-prog"><span class="lv" data-r="lv"></span><span class="td-bar"><i data-r="bar"></i></span><span data-r="cnt">0/0</span><span class="td-ev" data-r="ev"></span></div>';
    root.appendChild(hud);
    var pauseBtn = document.createElement('button'); pauseBtn.type = 'button'; pauseBtn.className = 'gx-hudbtn'; pauseBtn.setAttribute('aria-label', '暫停'); pauseBtn.innerHTML = GX.ico('pause', 22);
    root.appendChild(pauseBtn); S.on(pauseBtn, 'click', function () { S.openPause(); });
    ['hearts', 'coins', 'combo', 'cico', 'lv', 'bar', 'cnt', 'ev'].forEach(function (k) { el[k] = hud.querySelector('[data-r="' + k + '"]'); });
    el.coinsB = el.coins.querySelector('b'); el.comboB = el.combo.querySelector('b');

    var qbar = document.createElement('div'); qbar.className = 'td-q'; qbar.setAttribute('aria-live', 'polite');
    qbar.innerHTML = '<div class="td-pic" data-r="pic"></div><div class="td-txt" data-r="txt"></div><div class="td-btns"><button type="button" class="td-hb off" data-r="hint" aria-label="提示">' + GX.ico('sparkle', 20) + '<span>提示</span></button><button type="button" data-r="say" aria-label="播放讀音">' + GX.ico('speaker', 24) + '</button></div><div class="td-ans" data-r="ans"></div>';
    root.appendChild(qbar);
    ['pic', 'txt', 'ans', 'hint', 'say'].forEach(function (k) { el['q' + k] = qbar.querySelector('[data-r="' + k + '"]'); });

    var tray = document.createElement('div'); tray.className = 'td-tray' + (F.energy ? '' : ' off'); tray.setAttribute('role', 'group'); tray.setAttribute('aria-label', '幫手');
    tray.innerHTML = '<div class="td-en" data-r="en" aria-label="星能">' + GX.ico('bolt', 16) + '<span>0</span></div>' + HELPERS.filter(function (h) { return F.helpers.indexOf(h.k) >= 0; }).map(function (h) {
      return '<button type="button" class="td-hp' + (h.at === F.lv ? ' new' : '') + '" data-h="' + h.k + '" aria-label="' + h.name + '（' + h.cost + ' 星能）：' + h.tip + '" title="' + h.name + '：' + h.tip + '"><img src="' + base + h.img + '" alt="" draggable="false"><b>' + GX.ico('bolt', 11) + h.cost + '</b><kbd>' + h.key + '</kbd></button>';
    }).join('');
    root.appendChild(tray); el.en = tray.querySelector('[data-r="en"]'); el.enN = el.en.querySelector('span');
    Array.prototype.forEach.call(tray.querySelectorAll('.td-hp'), function (b) { S.on(b, 'click', function () { b.classList.remove('new'); place(b.getAttribute('data-h')); }); });
    var padWanted = opts.pad === true || (opts.pad !== false && ((window.matchMedia && matchMedia('(pointer:coarse)').matches) || 'ontouchstart' in window));
    pad = GX.pad(root, {
      mode: math ? (needFrac ? 'frac' : 'digits') : 'letters', enter: math && needFrac,
      onKey: function (k) { press(k); }, onBack: function () { press('⌫'); }, onEnter: function () { press('↵'); }
    });
    S.on(el.qsay, 'click', function () { var e = target; if (e) { S.say(curItem(e)); S.sfx('tap'); } });
    S.on(el.qhint, 'click', function () { useHint(); });
    S.on(root, 'pointerdown', function (e) { if (e.pointerType === 'touch' && !padWanted) { padWanted = true; if (ready) layout(); } }, { passive: true });

    /* ---------------- layout */
    function measurePad() {
      var h;
      pad.show(true); pad.el.style.minHeight = '';
      if (math) pad.setMode(needFrac ? 'frac' : 'digits');
      else if (P.qwerty) pad.setKeys(null);
      else pad.setKeys('abcdefghijklmnopqrstuvwxyz'.split('').slice(0, maxKeys));
      h = Math.ceil(pad.height()); pad.el.style.minHeight = h + 'px'; padSig = ''; return h;
    }
    function layout() {
      var W = S.W, H = S.H, land = W > H * 1.15, comp = H < 480, qw, qLeft, band;
      root.classList.toggle('td-land', land); root.classList.toggle('td-compact', comp); L.W = W; L.H = H; L.land = land; L.comp = comp;
      L.big = W >= 1000 && H >= 700; L.qh = math ? (land ? (L.big ? 100 : 84) : (H < 700 ? 124 : 128)) : (land ? (comp ? 58 : (L.big ? 88 : 72)) : (H < 700 ? 98 : 108));
      L.padOn = !!padWanted; pad.show(L.padOn); L.padH = L.padOn ? measurePad() : 0;
      if (land) {
        var hw = clamp(W * 0.38, 290, 400); hud.style.width = hw + 'px'; L.hudH = comp ? 60 : 68; qLeft = hw + 10; qw = Math.min(W - qLeft - 8, L.big ? 860 : 720); qLeft += Math.round((W - qLeft - 8 - qw) / 2); L.qTop = 4; band = Math.max(L.hudH, L.qh + 8);
      } else { hud.style.width = ''; L.hudH = 70; qw = Math.min(W - 16, 700); qLeft = Math.round((W - qw) / 2); L.qTop = L.hudH; band = L.qTop + L.qh; }
      L.qw = qw; qbar.style.left = qLeft + 'px'; qbar.style.width = qw + 'px'; qbar.style.top = L.qTop + 'px'; qbar.style.height = L.qh + 'px';
      L.fy = band + (land ? 4 : 6); L.fh = H - L.padH - (L.padOn ? 4 : 10) - L.fy;
      L.lanes = (land && L.fh >= 250) ? 4 : 3; L.pf = land ? .54 : .61; L.laneH = Math.min(L.fh / L.lanes, land ? 150 : 132); L.lt = L.fy + Math.max(0, (L.fh - L.laneH * L.lanes) / 2);
      L.es = clamp(L.laneH * L.pf * 1.45, 34, 112);
      L.trayW = F.energy ? 52 : 0; L.baseX = L.trayW + clamp(W * 0.17, 52, 130); L.tx = L.trayW + (L.baseX - L.trayW) * .5; L.spawnX = W - L.es * 0.35; L.endX = L.baseX + L.es * 0.3;
      root.style.setProperty('--td-fy', L.fy + 'px'); var hf = W >= 700 ? clamp(Math.round(W / 85), 15, 21) : 14; root.style.setProperty('--tdf', hf + 'px'); root.style.setProperty('--tdh', (hf + 7) + 'px'); root.style.setProperty('--tdcf', (hf + 2) + 'px');
      turret.tgtY = laneY(target && alive(target) ? target.lane : 1); turret.y = turret.tgtY;
      root.classList.toggle('td-coarse', !!padWanted); tray.style.top = L.fy + 'px'; tray.style.height = L.fh + 'px'; tray.classList.toggle('sm', L.fh < 236); guards.length = L.lanes; for (var gi = 0; gi < L.lanes; gi++) if (guards[gi] == null) guards[gi] = F.guard;
      statOk = false; buildStatic(); buildAmbient(); applyPad(true); renderQ(); hudUpdate(true);
    }
    function laneY(i) { return L.lt + L.laneH * clamp(i, 0, L.lanes - 1) + L.laneH * L.pf * 0.5; }
    function ex(e) { return L.endX + (L.spawnX - L.endX) * e.xn; }
    function eSize(e) { return L.es * (e.boss ? 1.55 : 1); }

    /* ---------------- static background layer: sky + lane cells built by slicing the painted background (path crop + grass crop per lane),
       so any lane count / screen shape keeps the painted look. Falls back to drawn shapes when the image is missing. */
    var SLICE = {
      port: { file: 'bg_td_port.webp', sky: .535, path: [.665, .735], gap: [.735, .78], bottom: [.89, 1] },
      land: { file: 'bg_td_land.webp', sky: .435, path: [.61, .71], gap: [.715, .80], bottom: [.92, 1] }
    };
    function buildStatic() {
      var W = L.W, H = L.H, d = S.dpr; if (!stat) stat = document.createElement('canvas');
      stat.width = Math.round(W * d); stat.height = Math.round(H * d); var g = stat.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0);
      var sl = SLICE[L.land ? 'land' : 'port'], im = GX.img(base + sl.file), i, y, gr, lt = L.lt, ph = L.laneH * L.pf, gh = L.laneH - ph, lb = lt + L.lanes * L.laneH;
      statSrc = base + sl.file;
      if (im.ok) {
        var el0 = im.el, iw = el0.naturalWidth, ih = el0.naturalHeight, sch = W / iw;
        var skyEnd = sl.sky * ih, sh = Math.min(skyEnd, lt / sch), sy = skyEnd - sh;
        g.drawImage(el0, 0, sy, iw, sh, 0, 0, W, lt);
        for (i = 0; i < L.lanes; i++) {
          y = lt + i * L.laneH;
          g.drawImage(el0, 0, sl.path[0] * ih, iw, (sl.path[1] - sl.path[0]) * ih, 0, y, W, ph);
          g.drawImage(el0, 0, sl.gap[0] * ih, iw, (sl.gap[1] - sl.gap[0]) * ih, 0, y + ph, W, gh);
        }
        var bh = Math.min(H - lb, (sl.bottom[1] - sl.bottom[0]) * ih * sch); if (bh > 0) g.drawImage(el0, 0, sl.bottom[0] * ih, iw, (sl.bottom[1] - sl.bottom[0]) * ih, 0, lb, W, (sl.bottom[1] - sl.bottom[0]) * ih * sch);
        if (H - lb > bh) { gr = g.createLinearGradient(0, lb + bh - 2, 0, H); gr.addColorStop(0, '#0e0a34'); gr.addColorStop(1, '#0b1030'); g.fillStyle = gr; g.fillRect(0, lb + bh - 2, W, H - lb - bh + 2); }
      } else {
        gr = g.createLinearGradient(0, 0, 0, lt); gr.addColorStop(0, '#0d0b33'); gr.addColorStop(.7, '#2a1a63'); gr.addColorStop(1, '#4a2f8a'); g.fillStyle = gr; g.fillRect(0, 0, W, lt);
        for (i = 0; i < 70; i++) { g.globalAlpha = .3 + (i % 5) * .12; g.fillStyle = '#fff'; g.fillRect((i * 97.3) % W, (i * 53.7) % Math.max(1, lt), 1.5, 1.5); } g.globalAlpha = 1;
        g.fillStyle = '#16123f'; g.beginPath(); g.moveTo(0, lt); for (i = 0; i <= 8; i++) g.lineTo(W * i / 8, lt - 18 - (i % 3) * 14); g.lineTo(W, lt); g.fill();
        g.fillStyle = '#15502f'; g.fillRect(0, lt, W, H - lt);
        for (i = 0; i < L.lanes; i++) {
          y = lt + i * L.laneH; gr = g.createLinearGradient(0, y, 0, y + ph); gr.addColorStop(0, '#6b4f9e'); gr.addColorStop(1, '#4a3580'); g.fillStyle = gr; g.fillRect(0, y, W, ph);
          g.fillStyle = 'rgba(255,201,74,.55)'; g.fillRect(0, y, W, 2); g.fillRect(0, y + ph - 2, W, 2);
          for (var f = 0; f < W / 22; f++) { g.fillStyle = f % 3 ? '#ffd36a' : '#fff6c8'; g.beginPath(); g.arc((f * 37 + i * 11) % W, y + ph + 3 + ((f * 7) % Math.max(4, gh - 6)), 2, 0, 6.3); g.fill(); }
        }
        gr = g.createLinearGradient(0, lb, 0, H); gr.addColorStop(0, '#15502f'); gr.addColorStop(1, '#0b1030'); g.fillStyle = gr; g.fillRect(0, lb, W, H - lb);
      }
      statOk = im.ok;
      g.fillStyle = 'rgba(10,8,44,.22)'; g.fillRect(0, 0, W, H);                       /* gentle wash so sprites and HUD pop */
      gr = g.createLinearGradient(0, 0, 0, L.fy); gr.addColorStop(0, 'rgba(8,10,40,.78)'); gr.addColorStop(1, 'rgba(8,10,40,.0)'); g.fillStyle = gr; g.fillRect(0, 0, W, L.fy);
      if (L.padOn) { gr = g.createLinearGradient(0, H - L.padH - 24, 0, H); gr.addColorStop(0, 'rgba(8,10,40,0)'); gr.addColorStop(.5, 'rgba(8,10,40,.7)'); gr.addColorStop(1, 'rgba(8,10,40,.9)'); g.fillStyle = gr; g.fillRect(0, H - L.padH - 24, W, L.padH + 24); }
      /* planet base: a lit sphere peeking in at the left edge with a rim light and a glowing shield zone */
      var pr = Math.max(L.lanes * L.laneH * .5, 80), pcx = -pr * .58, pcy = lt + L.lanes * L.laneH / 2;
      gr = g.createRadialGradient(pcx + pr * .62, pcy - pr * .3, pr * .08, pcx, pcy, pr); gr.addColorStop(0, '#7af0e0'); gr.addColorStop(.4, '#3f6fd0'); gr.addColorStop(1, '#1f1760');
      g.save(); g.globalAlpha = .92; g.fillStyle = gr; g.beginPath(); g.arc(pcx, pcy, pr, 0, 6.3); g.fill(); g.restore();
      g.strokeStyle = 'rgba(160,255,240,.6)'; g.lineWidth = 3; g.beginPath(); g.arc(pcx, pcy, pr, -.85, .85); g.stroke();
      gr = g.createLinearGradient(0, 0, L.baseX + 10, 0); gr.addColorStop(0, 'rgba(62,230,208,.0)'); gr.addColorStop(1, 'rgba(62,230,208,.24)'); g.fillStyle = gr; g.fillRect(0, lt, L.baseX + 10, L.lanes * L.laneH);
    }

    /* ---------------- ambient parallax: three depths (twinkling stars drift slowest, fireflies mid, soft foreground bokeh fastest) made of cached glow sprites; static under reduced motion */
    function buildAmbient() {
      var r = GX.rng(4242), i, fh = L.lanes * L.laneH; amb.stars = []; amb.fly = []; amb.bok = [];
      for (i = 0; i < 16; i++) amb.stars.push({ x: r() * L.W, y: L.fy + r() * Math.max(10, L.lt - L.fy - 6), s: 6 + r() * 9, ph: r() * 6.3, v: 3 + r() * 3 });
      for (i = 0; i < 12; i++) amb.fly.push({ x: r() * L.W, y: L.lt + r() * fh, s: 9 + r() * 9, ph: r() * 6.3, v: 8 + r() * 10 });
      for (i = 0; i < 5; i++) amb.bok.push({ x: r() * L.W, y: L.lt + fh * (.15 + r() * .95), s: 40 + r() * 44, ph: r() * 6.3, v: 26 + r() * 20 });
    }
    function drawAmbient(c, W, front) {
      var red = GX.reduced(), t = red ? 0 : S.t, i, a, x, W2 = W + 80, g;
      c.globalCompositeOperation = 'lighter';
      if (!front) {
        g = glow('#cfe3ff', 32); for (i = 0; i < amb.stars.length; i++) { a = amb.stars[i]; x = (((a.x - t * a.v) % W2) + W2) % W2 - 40; c.globalAlpha = red ? .45 : .3 + .35 * Math.sin(S.t * 1.7 + a.ph); c.drawImage(g, x - a.s / 2, a.y - a.s / 2, a.s, a.s); }
        g = glow('#ffd36a', 32); for (i = 0; i < amb.fly.length; i++) { a = amb.fly[i]; x = (((a.x - t * a.v) % W2) + W2) % W2 - 40; c.globalAlpha = red ? .4 : .3 + .3 * Math.sin(S.t * 2.3 + a.ph); c.drawImage(g, x - a.s / 2, a.y + (red ? 0 : Math.sin(S.t * .9 + a.ph) * 9) - a.s / 2, a.s, a.s); }
      } else {
        g = glow('#ffe6a8', 64); for (i = 0; i < amb.bok.length; i++) { a = amb.bok[i]; x = (((a.x - t * a.v) % W2) + W2) % W2 - 40; c.globalAlpha = .06 + (red ? 0 : .035 * Math.sin(S.t * 1.1 + a.ph)); c.drawImage(g, x - a.s / 2, a.y - a.s / 2, a.s, a.s); }
      }
      c.globalAlpha = 1; c.globalCompositeOperation = 'source-over';
    }

    /* ---------------- banners never stack: later ones wait, the boss one replaces whatever is showing */
    var bannerFree = 0;
    function banner(text, sub, ms, urgent) {
      var now = performance.now(), at;
      if (urgent) { var old = root.querySelectorAll('.gx-banner'); for (var i = 0; i < old.length; i++) old[i].parentNode.removeChild(old[i]); at = now; }
      else at = Math.max(now, bannerFree);
      bannerFree = at + (ms || 1300) + 80;
      if (at - now < 20) S.ui.banner(text, sub, ms); else S.later(function () { S.ui.banner(text, sub, ms); }, at - now);
    }

    /* ---------------- hud + question bar */
    function hudUpdate(force) {
      var pr = S.learn.progress(), tt = TIERS[tier], sig = [hearts, coins, combo, tier, pr.done, pr.total, ev.meteor > 0 ? 1 : 0, ev.freeze > 0 ? Math.ceil(ev.freeze) : 0, ev.slow > 0 ? 1 : 0, L.W, energy, wave].join('|');
      if (!force && sig === lastHud) return; var pop = sig !== lastHud && lastHud && combo > +lastHud.split('|')[2]; lastHud = sig;
      var h = ''; for (var i = 0; i < P.hearts; i++) h += '<span class="' + (i < hearts ? '' : 'lost') + '">' + GX.ico('heart', 19) + '</span>'; el.hearts.innerHTML = h;
      el.coinsB.textContent = coins; el.combo.classList.toggle('hide', combo < 2); el.comboB.textContent = '×' + combo; el.combo.style.color = tt.col;
      el.cico.innerHTML = GX.ico(tt.ico, 17); if (pop && !GX.reduced()) { el.combo.classList.add('pop'); S.later(function () { el.combo.classList.remove('pop'); }, 140); }
      el.lv.textContent = (lv ? GX.levelText(lv) : '自由模式') + (F.waves > 1 ? ' · 第 ' + (wave + 1) + '/' + F.waves + ' 波' : '');
      if (F.energy) { el.enN.textContent = energy; Array.prototype.forEach.call(tray.querySelectorAll('.td-hp'), function (b) { var h = helperOf(b.getAttribute('data-h')); b.classList.toggle('poor', energy < h.cost); b.classList.toggle('ready', energy >= h.cost); }); } el.cnt.textContent = pr.done + '/' + pr.total; el.bar.style.width = (pr.total ? pr.done / pr.total * 100 : 0) + '%';
      var evs = []; if (ev.freeze > 0) evs.push('冰凍 ' + Math.ceil(ev.freeze) + 's'); if (ev.meteor > 0) evs.push('流星雨 ×2'); if (ev.slow > 0 && !ev.freeze) evs.push('減速');
      el.ev.textContent = evs.join(' '); el.ev.classList.toggle('on', evs.length > 0);
    }
    function curItem(e) { return e.items ? e.items[e.phase] : e.it; }
    function fitText(node) {                         /* shrink the question text (down to 14px) until it fits its cell */
      var maxH = node.clientHeight, sz = (math ? (L.land ? 20 : 22) : (L.land ? 24 : 28)) + (L.big ? 6 : 0), min = 14; node.style.fontSize = sz + 'px';
      while (sz > min && node.firstChild.offsetHeight > maxH + 1) { sz--; node.style.fontSize = sz + 'px'; }
    }
    function slotsHTML(e, it) {
      var en = it.en, t = e.typed.length, h = '', i, hi = e.hl, nextIdx = t, seg = e.segEnds, si = 0, open = false;
      function cell(i) {
        var ch = en[i], isL = /[A-Za-z]/.test(ch); if (!isL) return '<i class="sp">' + esc(ch === ' ' ? '' : ch) + '</i>';
        if (i < t) return '<i class="' + (i < e.pre ? 'p' : 'f') + '">' + esc(ch.toLowerCase()) + '</i>';
        if (i === nextIdx) return '<i class="n ' + (hi ? 'h' : '') + '">' + (hi ? esc(ch.toLowerCase()) : '') + '</i>';
        return '<i></i>';
      }
      for (i = 0; i < en.length; i++) {
        if (seg && !open) { open = true; h += '<span class="td-seg ' + (t >= seg[si] ? 'done' : '') + '">'; }
        h += cell(i);
        if (seg && i + 1 === seg[si]) { h += '</span>'; open = false; si++; }
      }
      if (open) h += '</span>'; return '<div class="td-slots">' + h + '</div>';
    }
    function tagHTML(e) { if (!e.boss && e.kind) return '<span class="td-tag k-' + e.kind + '">' + KINDS[e.kind].tag + (e.kind === 'armor' ? ' ' + (e.items ? e.items.map(function (_, i) { return i <= e.phase ? '●' : '○'; }).join('') : (e.armor > 0 ? '●○' : '●●')) : '') + '</span>'; return e.boss ? '<span class="td-tag">魔王' + (e.items ? ' 第 ' + (e.phase + 1) + ' 步 ' + e.items.map(function (_, i) { return i <= e.phase ? '●' : '○'; }).join('') : '') + '</span>' : ''; }
    function ansHTML(e, it) {
      if (isMath(it)) return '<span class="td-eq">＝</span><span class="td-num">' + esc(e.typed) + '<u></u></span>' + tagHTML(e) + (e.hintShown || P.hint === 'first' ? '<span class="td-hint">' + esc(it.hint || '') + '</span>' : '');
      return slotsHTML(e, it) + tagHTML(e);
    }
    function renderAns() {                           /* keystroke path: only the answer row changes (no layout-forcing text fit, no picture re-render) */
      var e = target; if (!e) return; el.qans.innerHTML = ansHTML(e, curItem(e));
    }
    function renderQ() {
      var e = target, it, inner, tag, n, avail, sw;
      if (!e) {
        el.qpic.classList.add('none'); el.qtxt.style.fontSize = ''; el.qtxt.innerHTML = '<span style="color:' + C.muted + ';font-size:16px">' + (state === 'play' ? '字怪來襲！看清題目再作答' : '準備好！') + '</span>'; el.qans.innerHTML = ''; el.qsay.classList.add('off'); el.qhint.classList.add('off'); qbar.classList.remove('boss'); return;
      }
      it = curItem(e); qbar.classList.toggle('boss', !!e.boss); el.qhint.classList.toggle('off', P.hint !== 'button'); el.qsay.classList.toggle('off', isMath(it)); var hide = isListen(e);
      el.qsay.classList.toggle('td-pulse', hide);
      tag = e.boss ? '<span class="td-tag">魔王' + (e.items ? ' 第 ' + (e.phase + 1) + ' 步 ' + e.items.map(function (_, i) { return i <= e.phase ? '●' : '○'; }).join('') : '') + '</span>' : '';
      qbar.style.setProperty('--pic', (L.land ? (L.comp ? 40 : 52) : 48) + 'px');
      if (isMath(it)) {
        el.qpic.classList.add('none'); el.qtxt.innerHTML = '<span>' + esc(it.q) + '</span>';
        el.qans.innerHTML = ansHTML(e, it);
      } else {
        el.qpic.classList.toggle('none', hide); inner = it.img ? '<img src="' + esc(it.img) + '" alt="" draggable="false">' : (it.emoji ? '<span class="gx-emo">' + esc(it.emoji) + '</span>' : GX.ico('sparkle', 30)); el.qpic.innerHTML = inner;
        el.qtxt.innerHTML = hide ? '<span class="td-listen">' + GX.ico('speaker', 22) + (e.kind === 'armor' ? '盔甲碎了！聽讀音再拼一次' : '聽讀音，拼出來') + '</span>' : '<span>' + esc(it.zh) + '</span>';
        n = it.en.length; avail = (L.land ? L.qw * .5 : L.qw - 24) - (e.boss || e.kind ? 76 : 0) - (e.segEnds ? e.segEnds.length * 10 : 0); sw = clamp(Math.floor((avail - 3 * (n - 1)) / n), 18, 36);
        qbar.style.setProperty('--sw', sw + 'px'); qbar.style.setProperty('--sh', Math.round(sw * 1.15) + 'px'); qbar.style.setProperty('--sf', Math.round(sw * .72) + 'px');
        el.qans.innerHTML = ansHTML(e, it);
      }
      fitText(el.qtxt);
    }
    function bump() { if (GX.reduced()) return; qbar.classList.remove('shake'); void qbar.offsetWidth; qbar.classList.add('shake'); }

    /* ---------------- pad (touch) */
    function keysFor(it) {
      var en = it.en.toLowerCase().replace(/[^a-z]/g, ''), set = {}, ks = [], i, abc = 'abcdefghijklmnopqrstuvwxyz', r = GX.rng(GX.hash(it.id + '|' + diff));
      for (i = 0; i < en.length; i++) if (!set[en[i]]) { set[en[i]] = 1; ks.push(en[i]); }
      var pool = GX.shuffle(abc.split('').filter(function (c) { return !set[c]; }), r), n = Math.min(P.distract, Math.max(0, 13 - ks.length)); ks = ks.concat(pool.slice(0, n));
      return GX.shuffle(ks, r);
    }
    function applyPad(force) {
      if (!L.padOn) return; var e = target, mode, keys = null, sig;
      if (math) { var it = e ? curItem(e) : null; mode = it && it.pad === 'frac' ? 'frac' : (needFrac ? 'frac' : 'digits'); if (!e) mode = needFrac ? 'frac' : 'digits'; sig = mode; }
      else { mode = 'letters'; var kit = e ? curItem(e) : (padSig ? null : (pend[0] || S.learn.peek(0))); if (!P.qwerty && !e && !kit) return; keys = (!P.qwerty && kit) ? keysFor(kit) : null; sig = 'L' + (keys ? keys.join('') : '*'); }
      if (!force && sig === padSig) return; padSig = sig; pad.setMode(mode, keys); pad.el.classList.toggle('td-frac', mode === 'frac'); hlKey = ''; padHL(e && !math ? e.hlKey : '');
    }
    function padHL(k) {
      var bs = pad.el.querySelectorAll('.gx-key.td-hl'); for (var i = 0; i < bs.length; i++) bs[i].classList.remove('td-hl');
      if (!k) { hlKey = ''; return; } var b = pad.el.querySelector('.gx-key[data-k="' + k + '"]'); if (b) b.classList.add('td-hl'); hlKey = k;
    }

    /* ---------------- enemies */
    function mkEnemy(it, o) {
      o = o || {}; var e = { uid: ++uid, it: it, items: o.items || null, phase: 0, lane: o.lane, xn: 1, spd: 0.92 + (GX.hash(it.id) % 17) / 100, age: 0, typed: '', pre: 0, errs: 0, hints: 0, marked: false, flash: 0, hit: 0, state: 'walk', dieT: 0, boomed: false, boss: !!o.boss, segEnds: null, ph: (GX.hash(it.id) % 628) / 100, warned: false, spoke: false, hl: false, hlKey: '', hintShown: false, spr: 1 + GX.hash(String(it.id)) % 8, fail: false, shield: 0, shieldMax: 0, enter: 0, kb: 0, kind: o.kind || '', armor: 0, hear: false, reveal: false, stun: 0, blocked: false };
      if (e.kind === 'fast') e.spd *= 1.55;
      if (e.kind === 'listen') e.hear = true;
      if (e.kind === 'armor' && !e.items) e.armor = 1;
      if (e.boss) { e.spr = 1 + GX.hash(String(it.id)) % 2; e.spd = 0.62; if (e.items) { e.shieldMax = e.shield = e.items.length; } else if (!isMath(it)) { var rs = realSyl(S, it); e.segEnds = rs; e.shieldMax = e.shield = rs ? rs.length : 1; } }
      initTyped(e); return e;
    }
    function initTyped(e) {
      var it = curItem(e); e.typed = ''; e.pre = 0; e.hl = false; e.hlKey = '';
      if (!isMath(it)) { autoFill(e, it); if (P.prefill && !e.boss && e.typed.length === 0 && it.en.length > 1) { e.typed = it.en[0]; autoFill(e, it); e.pre = e.typed.length; } }
    }
    function autoFill(e, it) { var en = it.en; while (e.typed.length < en.length && !/[A-Za-z]/.test(en[e.typed.length])) e.typed += en[e.typed.length]; }
    function alive(e) { return e.state === 'walk'; }
    function isListen(e) { return !!e && e.hear && !e.reveal && !isMath(curItem(e)); }
    function helperOf(k) { for (var i = 0; i < HELPERS.length; i++) if (HELPERS[i].k === k) return HELPERS[i]; return null; }
    function aliveList() { return enemies.filter(alive); }
    function pickTarget() { var best = null; enemies.forEach(function (e) { if (alive(e) && (!best || e.xn < best.xn)) best = e; }); return best; }
    var lockUntil = -1;                                   /* H1: after an automatic target change, taps/keys are ignored for 0.38 s */
    function setTarget(e, manual, lock) {
      if (e === target) return; target = e; if (lock) lockUntil = S.t + 0.38; if (manual) S.sfx('tap');
      if (e) { turret.tgtY = laneY(e.lane); if (!e.spoke && !math) { e.spoke = true; S.say(curItem(e)); } }
      applyPad(); renderQ(); padHL(e && !math ? e.hlKey : '');
    }
    function cycleTarget(dir) {
      var a = aliveList().sort(function (p, q) { return p.xn - q.xn; }); if (!a.length) return; var i = a.indexOf(target); setTarget(a[(i + (dir || 1) + a.length) % a.length], true);
    }
    function laneMove(dir) {
      var a = aliveList(); if (!a.length || !target) return; var ln = target.lane + dir, best = null;
      a.forEach(function (e) { if (e.lane === ln && (!best || e.xn < best.xn)) best = e; }); if (best) setTarget(best, true);
    }
    function enemyXY(e) { return { x: ex(e) + (e.enter < 1 ? (1 - GX.ease.out(e.enter)) * L.es * 0.9 : 0), y: laneY(e.lane) }; }

    /* ---------------- spawning */
    function coreLeft() { var n = pend.filter(function (i) { return !i.rv; }).length, k, q = S.learn.remaining(); for (k = 0; k < q; k++) { var i = S.learn.peek(k); if (i && !i.rv) n++; } return n; }
    function pickLane(boss) {
      var best = [], i, mx;
      for (i = 0; i < L.lanes; i++) { mx = 0; enemies.forEach(function (e) { if (e.lane === i && e.state !== 'gone') mx = Math.max(mx, e.boss ? 2 : e.xn); }); if (boss ? mx === 0 : mx <= 0.72) best.push({ i: i, mx: mx }); }
      if (!best.length) return -1; var mn = Math.min.apply(null, best.map(function (b) { return b.mx; })); best = best.filter(function (b) { return b.mx <= mn + 0.0001 || rng() < 0.35; });
      return best[Math.floor(rng() * best.length)].i;
    }
    function spawnNormal() {
      var lane = pickLane(false); if (lane < 0) { spawnT = 0.7; return false; }
      var it = pend.length ? pend.shift() : S.learn.take(); if (!it) return false;
      var kind = pickKind(it), items = null;
      if (kind === 'armor' && isMath(it)) {                                     /* math armour = two questions in a row; never a revisit/filler as the 2nd one */
        var nx = S.learn.peek(0); if (nx && !nx.rv && isMath(nx)) items = [it, S.learn.take()]; else kind = '';
      }
      var e = mkEnemy(it, { lane: lane, kind: kind, items: items }); enemies.push(e); countSpawn(it); if (items) countSpawn(items[1]);
      if (kind && !seenKind[kind]) { seenKind[kind] = 1; banner('新字怪：' + KINDS[kind].name, kind === 'armor' ? (math ? '要連答兩題' : '拼兩次：第二次只聽讀音') : KINDS[kind].sub, 1800); events.push('newkind:' + kind); } events.push('spawn:' + it.id); S.sfx('pop'); var p = enemyXY(e); S.fx.burst(Math.min(L.W - 8, p.x - L.es * .4), p.y, { n: 6, colors: ['#b79bff', '#fff'], speed: 70, life: .4, size: 3, grav: 0 });
      if (!target) setTarget(e); return true;
    }
    function spawnBoss() {
      var it, items = null, k, q = S.learn.remaining(), lane = Math.min(L.lanes - 1, Math.floor(L.lanes / 2));
      if (math) {
        items = []; while (items.length < 2 && S.learn.remaining() > 0) { var t = S.learn.take(); if (t.rv) pend.push(t); else items.push(t); }
        if (!items.length) return false; it = items[0];
      } else {
        var cand = [], c, sc; for (k = 0; k < q; k++) { c = S.learn.peek(k); if (c && !c.rv && !isMath(c)) { var rsy = realSyl(S, c); cand.push({ k: k, sc: (rsy ? rsy.length : 1) * 100 + c.en.length, syl: !!rsy }); } }
        if (!cand.length) return false; cand.sort(function (x, y) { return y.sc - x.sc; });
        var A = cand[0], B = null;
        if (!A.syl && cand.length > 1) B = cand[1];                              /* single-syllable boss: two rounds of spelling (two real items) instead of fake syllable shields */
        var ka = A.k, kb = B ? B.k : -1, got = {}, idx = 0, tk;
        while (idx <= Math.max(ka, kb)) { tk = S.learn.take(); if (idx === ka) got.a = tk; else if (idx === kb) got.b = tk; else pend.push(tk); idx++; }
        it = got.a; if (got.b) items = [got.a, got.b];
      }
      var e = mkEnemy(it, { boss: true, lane: lane, items: items }); enemies.push(e); bossSpawned = bossAlive = true; countSpawn(it); if (items) items.forEach(countSpawn);
      banner('魔王來襲！', items && items.length > 1 ? (math ? '兩步題：第 1 步 → 第 2 步' : '兩輪拼寫：第 1 步 → 第 2 步') : (math ? '破解難題' : '逐個音節擊破護盾'), 1700, true); S.sfx('boss'); S.fx.shake(5, .5); S.fx.flash('#ff7a3c', .25); cfg.music = 'boss'; S.audio.music('boss'); curLayer = 0;
      events.push('boss:' + it.id); if (!target || !target.boss) setTarget(e); return true;
    }
    function countSpawn(it) { if (it && !it.rv && !spawnedIds[it.id]) { spawnedIds[it.id] = 1; spawnedCore++; } }
    function pickKind(it) {
      if (!it || it.rv || forceKind === '') { forceKind = null; return ''; }
      if (forceKind) { var fk = forceKind; forceKind = null; return fk; }
      var c = [], k, r;
      if (F.fast && (isMath(it) ? String(it.a).length <= 3 : it.en.replace(/[^A-Za-z]/g, '').length <= 6)) c.push('fast');
      if (F.armor && !enemies.some(function (q) { return alive(q) && q.kind === 'armor'; })) c.push('armor');
      if (F.listen && !isMath(it) && it.en.replace(/[^A-Za-z]/g, '').length >= 3) c.push('listen');
      if (!c.length) return '';
      for (k = 0; k < c.length; k++) if (!seenKind[c[k]] && spawnedCore >= 1) return c[k];   /* every unlocked kind shows up at least once per level */
      r = rng(); return r < 0.42 ? c[Math.floor(rng() * c.length)] : '';
    }
    function waveCheck(dt, act) {                         /* true = hold spawning (between waves) */
      if (F.waves < 2) return false;
      if (waveBreak > 0) { waveBreak -= dt; if (waveBreak <= 0) { var last = wave === F.waves - 1; banner(last ? '最後一波！' : '第 ' + (wave + 1) + ' 波', last ? '字怪大軍來襲' : '', 1400, true); S.sfx(last ? 'boss' : 'power'); if (last) S.fx.shake(4, .4); events.push('wave:' + wave); hudUpdate(true); } return true; }
      if (!waveBounds.length) { var N = S.learn.total(); for (var w = 1; w < F.waves; w++) waveBounds.push(Math.max(1, Math.round(N * w / F.waves))); }
      if (wave < F.waves - 1 && spawnedCore >= waveBounds[wave]) {
        if (act > 0) return true;
        wave++; waveBreak = 2.6; addEnergy(1, L.W / 2, L.fy + L.fh * .45); banner('第 ' + wave + ' 波守住了！', F.energy ? '+1 星能・趁空檔放幫手' : '準備下一波', 1500); S.sfx('great'); events.push('waveclear:' + wave); return true;
      }
      return false;
    }
    function trySpawn(dt) {
      spawnT -= dt; var act = 0, front = 9, i, q, canMore = pend.length || S.learn.remaining() > 0;
      for (i = 0; i < enemies.length; i++) { q = enemies[i]; if (q.state === 'walk') { act++; if (q.xn < front) front = q.xn; } }
      if (!canMore || bossAlive) return;
      if (waveCheck(dt, act)) return;
      var lastWave = F.waves > 1 && wave === F.waves - 1, capN = Math.min(L.lanes + 1, P.cap + (lastWave ? 1 : 0));
      if (act === 0 && spawnT > 0.6) spawnT = 0.6;                              /* an empty field never waits */
      if (spawnT > 0 || act >= capN) return;
      if (act >= 2 && front < 0.5) { spawnT = 0.5; return; }                    /* the front monster is already half way and still unanswered: give the child room */
      if (isBossLevel && !bossSpawned && coreLeft() <= 3) { if (act === 0 && spawnBoss()) spawnT = P.interval * .6; else if (act > 0) spawnT = .4; return; }
      if (spawnNormal()) spawnT = P.interval * (lastWave ? .8 : 1) * (0.85 + rng() * 0.3);
    }

    /* ---------------- input */
    function press(k) {
      if (state !== 'play' || frozen || S.paused || S.ended || S.t < lockUntil) return;
      var e = target; if (!e || !alive(e)) { e = pickTarget(); if (!e) return; setTarget(e); }
      var it = curItem(e);
      if (isMath(it)) mathKey(e, it, k); else letterKey(e, it, k);
    }
    function letterKey(e, it, k) {
      if (k === '⌫') { if (e.typed.length > e.pre) { var back = e.typed.length - 1; while (back > e.pre && !/[A-Za-z]/.test(e.typed[back])) back--; e.typed = e.typed.slice(0, back); if (e.segEnds && e.typed.length < e.segEnds[0] && false) { /* */ } e.hl = false; renderAns(); S.sfx('tap'); } return; }
      if (k === '↵' || k.length !== 1 || !/[A-Za-z]/.test(k)) return;
      var en = it.en, i = e.typed.length, want = en[i]; if (want == null) return;
      if (k.toLowerCase() === want.toLowerCase()) {
        var before = e.typed.length; e.typed += want; autoFill(e, it); e.hl = false; e.hlKey = ''; padHL(''); pad.flash(k.toLowerCase(), 'ok'); S.sfx('key', { i: e.typed.replace(/[^A-Za-z]/g, '').length - 1 });
        var done = e.typed.length >= en.length, segBreak = false;
        if (e.segEnds && !done) { for (var s = 0; s < e.segEnds.length - 1; s++) if (before < e.segEnds[s] && e.segEnds[s] <= e.typed.length) segBreak = true; }
        e.xn = Math.min(1.02, e.xn + (e.boss ? 0.006 : 0.014)); e.hit = 1; e.flash = 1; e.kb = 1;
        if (done && e.armor > 0) { armorBreak(e, it); return; }
        if (done) { renderQ(); solved(e, it); return; }
        if (segBreak) breakShield(e); else fireShot(e, false);
        renderAns();
      } else {
        wrongLetter(e, it, k);
      }
    }
    function wrongLetter(e, it, k) {
      e.errs++; var st = S.learn.stats[it.id]; if (st) st.letterErrs = (st.letterErrs || 0) + 1;
      combo = 0; tier = 0; S.sfx('keybad'); pad.flash(k.toLowerCase(), 'no'); bump(); var p = enemyXY(e); S.fx.burst(p.x, p.y, { n: 5, colors: ['#ff6b81', '#fff'], speed: 90, life: .35, size: 3, grav: 0 }); ftext(p.x, p.y - eSize(e) * .5, '✕', { color: C.bad, size: 22 });
      events.push('wrongKey:' + k); turret.pop = 0; hudUpdate();
      if (isListen(e) && e.errs < 2) { e.reveal = true; renderQ(); }   /* listen monster: the first slip shows the Chinese meaning */
      if (e.errs >= 2) { wrongAnswer(e, it, e.typed, 'letters'); }   /* B3: the 2nd wrong letter on one monster = a wrong answer (learning card, requeue). One typo is free but recorded in errs / stats.letterErrs */
    }
    function markNotFirst(it) { S.learn.assisted(it); }
    function formCheck(e, it, typed) {                    /* H3: right value, wrong written form -> hint once, clear the input, no penalty */
      if (typeof it.detail !== 'function') return false; var d; try { d = it.detail(typed); } catch (x) { return false; }
      if (d && !d.ok && d.why === 'form') { e.typed = ''; banner(d.msg || '數值對了，請按題目要求的寫法作答', '', 2200); renderQ(); S.sfx('tap'); events.push('form:' + it.id); return true; } return false;
    }
    function commit(e, it) { if (S.learn.judge(it, e.typed)) return solved(e, it); if (formCheck(e, it, e.typed)) return; return wrongAnswer(e, it, e.typed); }
    function mathKey(e, it, k) {
      var frac = it.pad === 'frac';
      if (k === '⌫') { if (frac) { S.sfx('keybad'); return; } if (e.typed) { e.typed = e.typed.slice(0, -1); renderAns(); S.sfx('tap'); } return; }   /* M3: fractions/decimals are final - no erasing and retrying */
      if (k === '↵') { if (!e.typed) return; return commit(e, it); }
      if (!/^[0-9.\/\-]$/.test(k) || e.typed.length >= 12) return; e.typed += k; S.sfx('key', { i: e.typed.length }); pad.flash(k, 'ok'); renderAns();
      var st = S.learn.typing(it, e.typed);
      if (st === 'done') return solved(e, it);
      if (st === 'wrong') { if (formCheck(e, it, e.typed)) return; if (!frac || e.typed.length >= GX.norm(S.learn.expect(it)).length + 2) return commit(e, it); }
    }
    function useHint() {
      var e = target; if (!e || state !== 'play' || frozen || P.hint !== 'button') return; var it = curItem(e); e.hints++; markNotFirst(it); S.sfx('pop');
      if (isListen(e)) e.reveal = true;
      if (isMath(it)) { e.hintShown = true; } else { e.hl = true; e.hlKey = it.en[e.typed.length] ? it.en[e.typed.length].toLowerCase() : ''; padHL(e.hlKey); }
      renderQ(); events.push('hint:' + it.id);
    }

    /* ---------------- shots and effects */
    function muzzle() { var ts = turret.size || 70; return { x: L.tx + ts * .34, y: turret.y - ts * .04 }; }
    function fireShot(e, big, cb) {
      var m = muzzle(), T = TIERS[tier]; proj.push({ x: m.x, y: m.y, sx: m.x, sy: m.y, e: e, t: 0, dur: big ? .22 : .12, big: big, tier: tier, cb: cb || null });
      turret.recoil = 1; turret.flash = big ? 1 : .6; turret.tgtY = laneY(e.lane); S.fx.burst(m.x, m.y, { n: big ? 10 : 4, colors: [big ? T.col : '#ffe28a', '#fff'], speed: 130, life: .3, size: 3, angle: 0, spread: 1.2, grav: 0 }); S.sfx(big ? T.launch : 'shoot');
    }
    function impact(p) {
      var e = p.e, pos = enemyXY(e), T = TIERS[p.tier];
      if (!p.big) {                                     /* small shot: sparks grow with the combo (tier colour, stars from x5) */
        var cm = Math.min(combo, 10), tc = TIERS[tier];
        S.sfx('hit'); S.fx.burst(pos.x, pos.y, { n: 6 + cm, colors: cm >= 3 ? [tc.col, tc.col2, '#fff'] : ['#ffe28a', '#fff'], speed: 100 + cm * 10, life: .35 + cm * .02, size: 3, shape: cm >= 5 ? 'star' : 'c' });
        S.fx.ring(pos.x, pos.y, { r0: 6, r1: eSize(e) * (.5 + cm * .02), life: .25, color: cm >= 3 ? tc.col : '#ffe28a', width: 3 }); return;
      }
      S.sfx(T.hit); S.sfx('kill', { t: p.tier }); S.fx.shake(p.tier === 0 ? 2 : 4, .22);
      S.fx.burst(pos.x, pos.y - eSize(e) * .1, { n: 10, colors: ['#ffffff', T.col2], speed: 90, life: 1, size: 3, shape: 'star', grav: -110, drag: .96 });   /* little soul wisps drift up */
      if (p.tier === 0) { S.fx.burst(pos.x, pos.y, { n: 18, colors: [GOLD, '#fff', '#ffe9a8'], speed: 190, life: .6, size: 4, shape: 'star' }); S.fx.ring(pos.x, pos.y, { r0: 8, r1: eSize(e) * .9, life: .4, color: GOLD, width: 4 }); }
      else if (p.tier === 1) { S.fx.burst(pos.x, pos.y, { n: 26, colors: ['#ff7a3c', '#ffd08a', '#ff3c2a'], speed: 210, life: .75, size: 5, grav: -80 }); S.fx.ring(pos.x, pos.y, { r0: 8, r1: eSize(e) * 1.3, life: .5, color: '#ff7a3c', width: 6 }); S.fx.flash('#ff7a3c', .14); }
      else if (p.tier === 2) { S.fx.burst(pos.x, pos.y, { n: 24, colors: ['#6fd8ff', '#e6faff', '#a6ecff'], speed: 180, life: .8, size: 4, shape: 'star', grav: 60 }); S.fx.ring(pos.x, pos.y, { r0: 8, r1: eSize(e) * 1.5, life: .55, color: '#6fd8ff', width: 5 }); S.fx.flash('#6fd8ff', .14); }
      else { S.fx.burst(pos.x, pos.y, { n: 24, colors: ['#ffe94a', '#fffbd0', '#fff'], speed: 230, life: .6, size: 3, shape: 'line' }); S.fx.ring(pos.x, pos.y, { r0: 8, r1: eSize(e) * 1.4, life: .45, color: '#ffe94a', width: 5 }); S.fx.flash('#ffe94a', .2); }
      if (p.cb) p.cb(); e.boomed = true; e.dieT = 0;
    }
    function bolt(x1, y1, x2, y2) {
      var pts = [{ x: x1, y: y1 }], n = 6, i; for (i = 1; i < n; i++) pts.push({ x: lerp(x1, x2, i / n) + (rng() - .5) * 26, y: lerp(y1, y2, i / n) + (rng() - .5) * 26 }); pts.push({ x: x2, y: y2 }); bolts.push({ pts: pts, t: .28 });
    }
    function breakShield(e) {
      e.shield = Math.max(0, e.shield - 1); var p = enemyXY(e); fireShot(e, false); S.sfx('shieldbreak'); S.sfx('zap'); S.fx.ring(p.x, p.y, { r0: eSize(e) * .3, r1: eSize(e) * 1.1, life: .5, color: '#6fd8ff', width: 6 }); S.fx.burst(p.x, p.y, { n: 18, colors: ['#6fd8ff', '#e6faff', '#fff'], speed: 190, life: .6, size: 4, shape: 'star' }); ftext(p.x, p.y - eSize(e) * .6, '護盾破！', { color: '#9be8ff', size: 22 });
      S.fx.shake(3, .2); events.push('shield:' + e.uid);
    }
    function ftext(x, y, str, o) {                       /* floaters stay inside the screen */
      var sz = (o && o.size) || 22, hw = sz * String(str).length * 0.4 + 10, fx = clamp(x, hw, L.W - hw), fy = Math.max(L.fy + sz, y); lastFloat = { x: fx, y: fy, hw: hw }; S.fx.text(fx, fy, str, o);
    }
    function addEnergy(n, x, y) {
      if (!F.energy || n <= 0) return; var was = energy; energy = Math.min(ENERGY_MAX, energy + n); if (energy === was) return;
      ftext(x, y, '+' + (energy - was) + '⚡', { color: '#9be8ff', size: 20 }); events.push('energy:' + energy);
      if (!GX.reduced()) { el.en.classList.remove('pop'); void el.en.offsetWidth; el.en.classList.add('pop'); S.later(function () { el.en.classList.remove('pop'); }, 160); } hudUpdate(true);
    }
    function placeLane() {                                /* helpers go on the lane of the selected monster, else the most threatened lane */
      if (target && alive(target)) return target.lane; var b = pickTarget(); return b ? b.lane : Math.min(L.lanes - 1, 1);
    }
    function place(k, laneArg) {
      var h = helperOf(k); if (!h || !F.energy || F.helpers.indexOf(k) < 0 || state !== 'play' || frozen || S.paused || S.ended) return false;
      var lane = laneArg != null ? laneArg : placeLane();
      if (energy < h.cost) { S.sfx('keybad'); el.en.classList.remove('no'); void el.en.offsetWidth; el.en.classList.add('no'); banner('星能不足', '答對字怪就有星能', 1100); events.push('poor:' + k); return false; }
      if (helpers.some(function (q) { return q.k === k && q.lane === lane; })) { S.sfx('keybad'); banner('這條路已有' + h.name, '', 1000); events.push('dup:' + k); return false; }
      energy -= h.cost; var x = { k: k, lane: lane, xn: k === 'wall' ? .2 : k === 'mine' ? .42 : .04, hp: WALL_HP, t: ICE_T, pop: 1 }; helpers.push(x);
      var p = { x: ex(x), y: laneY(lane) }; S.sfx(k === 'ice' ? 'freezeon' : k === 'mine' ? 'pop' : 'shield'); S.fx.ring(p.x, p.y, { r0: 6, r1: L.es, life: .45, color: h.col, width: 4 }); S.fx.burst(p.x, p.y, { n: 14, colors: [h.col, '#fff'], speed: 120, life: .5, size: 3, shape: 'star' });
      events.push('place:' + k + ':' + lane); hudUpdate(true); return true;
    }
    function helmetFx(e) {
      var p = enemyXY(e); S.sfx('shieldbreak'); S.fx.burst(p.x, p.y - eSize(e) * .35, { n: 16, colors: ['#dbe8ff', '#9fb2e8', '#fff'], speed: 170, life: .6, size: 4, grav: 260 }); S.fx.ring(p.x, p.y, { r0: 8, r1: eSize(e), life: .4, color: '#dbe8ff', width: 4 }); S.fx.shake(2, .15); e.xn = Math.min(1.02, e.xn + .1); e.kb = 1;
    }
    function armorBreak(e, it) {                          /* English armour: the first full spelling breaks the helmet, then the same word again from the sound only */
      e.armor = 0; e.hear = true; e.reveal = false; e.errs = 0; e.typed = ''; e.pre = 0; autoFill(e, it); e.hl = false; e.hlKey = ''; padHL('');
      fireShot(e, false); helmetFx(e); ftext(enemyXY(e).x, enemyXY(e).y - eSize(e) * .9, '盔甲碎了！', { color: '#dbe8ff', size: 22 }); events.push('armor:' + e.uid);
      S.later(function () { if (alive(e)) S.say(it); }, 350); renderQ();
    }
    function launchGuard(lane) {                          /* one rescue ship per lane: the base keeps its heart and the lane is pushed back */
      guardFx.push({ lane: lane, t: 0 }); S.sfx('whoosh'); S.sfx('power'); S.fx.flash('#6fffe0', .18); ftext(L.baseX + 60, laneY(lane) - L.es * .5, '護路飛船出動！', { color: '#9bffe9', size: 20 }); events.push('guard:' + lane);
      enemies.forEach(function (q) { if (alive(q) && q.lane === lane) { q.xn = Math.min(1.02, q.xn + .35); q.stun = .8; q.flash = 1; } });
    }
    function helpersUpdate(dt) {
      for (var i = helpers.length - 1; i >= 0; i--) {
        var h = helpers[i]; h.pop = Math.max(0, h.pop - dt * 3);
        if (h.k === 'ice') { h.t -= dt; if (h.t <= 0) { helpers.splice(i, 1); events.push('expire:ice:' + h.lane); } continue; }
        if (h.k === 'wall') { var hit = false; enemies.forEach(function (q) { if (alive(q) && q.lane === h.lane && q.blocked) hit = true; }); if (hit) { h.hp -= dt; h.shake = 1; if (S.t - (h.chew || 0) > .5) { h.chew = S.t; S.sfx('hit'); var p0 = { x: ex(h), y: laneY(h.lane) }; S.fx.burst(p0.x + L.es * .2, p0.y, { n: 4, colors: ['#9b8cff', '#fff'], speed: 70, life: .3, size: 3 }); } } else h.shake = 0;
          if (h.hp <= 0) { var p1 = { x: ex(h), y: laneY(h.lane) }; helpers.splice(i, 1); S.sfx('shieldbreak'); S.fx.burst(p1.x, p1.y, { n: 18, colors: ['#9b8cff', '#d9d2ff', '#fff'], speed: 160, life: .6, size: 4, grav: 200 }); events.push('break:wall:' + h.lane); } continue; }
        if (h.k === 'mine') {
          var trig = enemies.some(function (q) { return alive(q) && q.lane === h.lane && q.xn <= h.xn; });
          if (trig) { var p2 = { x: ex(h), y: laneY(h.lane) }; helpers.splice(i, 1); S.sfx('boom'); S.fx.shake(5, .3); S.fx.flash('#ff9d4a', .2); S.fx.ring(p2.x, p2.y, { r0: 8, r1: L.es * 2.2, life: .5, color: '#ff9d4a', width: 7 }); S.fx.burst(p2.x, p2.y, { n: 30, colors: ['#ff9d4a', '#ffd08a', '#fff'], speed: 240, life: .7, size: 5, shape: 'star' });
            enemies.forEach(function (q) { if (alive(q) && q.lane === h.lane && q.xn < h.xn + .3) { q.xn = Math.min(1.02, q.xn + .32); q.stun = 1.2; q.flash = 1; q.kb = 1; } }); ftext(p2.x, p2.y - L.es * .6, '星爆！', { color: '#ffc690', size: 22 }); events.push('boom:' + h.lane); }
        }
      }
    }
    function laneMul(lane) { for (var i = 0; i < helpers.length; i++) if (helpers[i].k === 'ice' && helpers[i].lane === lane) return .5; return 1; }
    function wallOf(lane) { for (var i = 0; i < helpers.length; i++) if (helpers[i].k === 'wall' && helpers[i].lane === lane) return helpers[i]; return null; }
    function addCoins(n, x, y) { var m = ev.meteor > 0 ? 2 : 1; n *= m; coins += n; ftext(x, y, '+' + n + (m > 1 ? ' ×2' : ''), { color: GOLD, size: 22 }); S.sfx('coin'); }

    /* ---------------- answering */
    function solved(e, it) {
      var ms = e.age * 1000, out = S.learn.answer(it, true, ms), first = out && out.first && S.learn.stats[it.id].firstOk === true, pos = enemyXY(e), multi = !!e.items && e.phase < e.items.length - 1;
      combo++; maxCombo = Math.max(maxCombo, combo); var nt = 0, i; for (i = 0; i < COMBO_AT.length; i++) if (combo >= COMBO_AT[i]) nt = i; var up = nt > tier; tier = nt;
      score += Math.round((100 + (math ? String(it.a).length : it.en.length) * 12) * (1 + Math.min(1, combo * 0.1)));
      var lbot = L.lt + L.lanes * L.laneH, strip = L.fy + L.fh - lbot; S.ui.ok(it, { top: strip >= 62 ? lbot + Math.round((strip - 54) / 2) : Math.max(L.fy + 4, lbot - 54) }); events.push('ok:' + it.id + (first ? ':first' : ''));
      var T = TIERS[tier]; S.sfx(first && combo >= 3 ? 'great' : 'good'); if (combo >= 2) S.sfx('streak', { n: combo });
      if (combo >= 2) ftext(pos.x, pos.y - eSize(e) * .75, '連擊 ×' + combo, { color: T.col, size: 20 });
      if (up) { banner(T.name + '升級！', '連擊 ×' + combo, 900); S.sfx('tierup', { t: nt }); turret.pop = 1; S.fx.ring(L.tx, turret.y, { r0: 10, r1: 90, life: .5, color: T.col, width: 5 }); S.fx.burst(L.tx, turret.y, { n: 18, colors: [T.col, '#fff'], speed: 160, life: .6, size: 4, shape: 'star' }); }
      if (multi) {                                       /* math boss: first question done, shield breaks, the next one appears */
        fireShot(e, true, null); e.shield = Math.max(0, e.shield - 1); S.fx.ring(pos.x, pos.y, { r0: eSize(e) * .3, r1: eSize(e) * 1.2, life: .5, color: '#6fd8ff', width: 6 }); S.sfx('shieldbreak'); S.sfx('zap'); ftext(pos.x, pos.y - eSize(e) * .6, '護盾破！', { color: '#9be8ff', size: 22 });
        e.phase++; initTyped(e); if (e.kind === 'armor' && !e.boss) { ftext(pos.x, pos.y - eSize(e) * .9, '盔甲碎了！', { color: '#dbe8ff', size: 22 }); helmetFx(e); } else banner('第 ' + (e.phase + 1) + ' 步', '', 1000); e.xn = Math.min(1.02, e.xn + .1); applyPad(); renderQ(); hudUpdate(); return;
      }
      e.state = 'dying'; e.dieT = 0; e.boomed = false; e.won = true; var tierNow = tier;
      if (e === target) target = null; var killedTier = tierNow;
      fireShot(e, true, function () {
        addCoins(e.boss ? 5 : 1, pos.x, pos.y - eSize(e) * .3); tierEffects(e, killedTier); if (F.energy && !it.rv) addEnergy(e.boss ? 3 : (first ? 2 : 1), pos.x, pos.y - eSize(e) * .75);
        if (e.boss) { bossAlive = false; bossWon = !e.fail; if (!e.fail) { banner('魔王擊破！', '', 1500); S.fx.confetti(L.W, { n: 80 }); S.sfx('bossdie'); S.fx.flash('#ffe9a8', .3); slowT = .8; for (var rr = 0; rr < 3; rr++) S.fx.ring(pos.x, pos.y, { r0: 10, r1: eSize(e) * (1.2 + rr * .5), life: .5 + rr * .15, color: rr % 2 ? '#fff' : GOLD, width: 6 - rr }); } cfg.music = diff <= 2 ? 'calm' : 'drive'; S.audio.music(cfg.music); curLayer = 0; }
        else if (first && (rng() < 0.22 || combo === 4 || combo === 9)) grantEvent(pos);
        S.fx.shake(e.boss ? 7 : 3, .3);
      });
      if (e.hintShown) e.hintShown = false;
      var nt2 = pickTarget(); if (nt2) setTarget(nt2, false, true); else { applyPad(); renderQ(); }
      hudUpdate();
    }
    function tierEffects(e, t) {
      var p = enemyXY(e), others = aliveList();
      if (t === 2) { ev.slow = 2.2; others.forEach(function (o) { var q = enemyXY(o); S.fx.burst(q.x, q.y, { n: 5, colors: ['#6fd8ff', '#fff'], speed: 60, life: .5, size: 3, grav: 20 }); }); }
      else if (t === 3) { others.forEach(function (o) { var q = enemyXY(o); bolt(p.x, p.y, q.x, q.y); o.xn = Math.min(1.02, o.xn + .08); o.flash = 1; S.fx.burst(q.x, q.y, { n: 6, colors: ['#ffe94a', '#fff'], speed: 90, life: .3, size: 3 }); }); }
      else if (t === 1) { others.forEach(function (o) { var q = enemyXY(o); if (Math.abs(q.x - p.x) < L.es * 3 && Math.abs(q.y - p.y) < L.laneH * 1.1) { S.fx.burst(q.x, q.y, { n: 6, colors: ['#ff7a3c', '#ffd08a'], speed: 90, life: .45, size: 3, grav: -60 }); o.flash = 1; } }); }
    }
    function grantEvent(pos) {
      if (ev.meteor > 0 || ev.freeze > 0) return; var kind = rng() < 0.5 ? 'meteor' : 'freeze'; startEvent(kind, pos);
    }
    function startEvent(kind, pos) {
      pos = pos || { x: L.W / 2, y: L.fy + L.fh / 2 }; S.sfx('power'); S.fx.ring(pos.x, pos.y, { r0: 10, r1: 110, life: .6, color: kind === 'meteor' ? '#ff9d4a' : '#6fd8ff', width: 6 });
      if (kind === 'meteor') { ev.meteor = 6; banner('流星雨！', '全場放慢・金幣 ×2', 1300); S.sfx('whoosh'); } else { ev.freeze = 3; banner('冰凍！', '字怪停下 3 秒', 1200); S.sfx('freezeon'); S.fx.flash('#bfeaff', .25); }
      events.push('event:' + kind); hudUpdate(true);
    }
    function wrongAnswer(e, it, typed, why) {
      if (frozen || e.state !== 'walk') return; frozen = true; e.state = 'fail'; pad.disable(true); events.push('wrong:' + it.id + ':' + (why || 'typed'));
      var typedAny = e.typed.length > e.pre, lapse = why === 'base' ? (typedAny ? 'typed' : true) : false;   /* R3.38: a monster reaching the base means no answer was given, not a wrong answer */
      if (it.rv && lapse) S.learn.note('lapse', it, { typed: typedAny });
      var ms = e.age * 1000, out = it.rv ? null : S.learn.answer(it, false, ms, lapse), p = enemyXY(e);   /* revisit/filler items (rv) never requeue: gx_core would chain endless fillers */ combo = 0; tier = 0; S.sfx('bad'); S.fx.burst(p.x, p.y, { n: 14, colors: ['#ff6b81', '#c3cbf7'], speed: 130, life: .6, size: 4 }); hudUpdate();
      if (why === 'base' && guards[e.lane]) { guards[e.lane] = false; launchGuard(e.lane); }
      else if (why === 'base') { hearts = Math.max(0, hearts - 1); baseHit = 1; S.sfx('basehit'); S.fx.shake(6, .35); S.fx.flash('#ff3c5a', .35); hudUpdate(true); }
      var after;
      S.ui.learn(it, { typed: isMath(it) ? '' : (e.typed.length > e.pre ? e.typed : ''), onDone: function () { if (lapse === true && hearts > 0 && S.gate(it, after)) return; after(); } });
      after = function () {
        frozen = false; pad.disable(false);
        if (e.items && e.phase < e.items.length - 1) { pend = e.items.slice(e.phase + 1).concat(pend); }   /* two-step boss: step 2 only appears after step 1 is right; otherwise it comes back later as a normal monster */
        { e.state = 'gone'; if (e.boss) { e.fail = true; bossAlive = false; cfg.music = diff <= 2 ? 'calm' : 'drive'; S.audio.music(cfg.music); curLayer = 0; banner('魔王逃走了', '', 1200); } S.fx.burst(p.x, p.y, { n: 8, colors: ['#c3cbf7'], speed: 60, life: .5, size: 3, grav: -40 }); }
        if (target === e) target = null; var nt = pickTarget(); if (nt) setTarget(nt, false, true); else { applyPad(); renderQ(); }
        if (hearts <= 0) lose(); hudUpdate(true);
      };
    }
    function musicLayer() {                              /* music intensity follows the fight: boss = kick, boss near the base / last shield = hats + echo; drive tiers add the kick */
      var n = 0, b = null; if (bossAlive) { b = enemies.filter(function (q) { return q.boss && alive(q); })[0]; n = b && (b.shield <= 1 || b.xn < .5) ? 2 : 1; } else if (tier >= 2) n = 1;
      if (n !== curLayer) { curLayer = n; try { S.audio.layer(n); } catch (x) { /* */ } events.push('layer:' + n); }
    }
    function lose() { if (lost || S.ended) return; lost = true; state = 'lost'; S.finish({ cleared: false, score: score, maxCombo: maxCombo, seconds: playT }); }
    function win() { if (S.ended) return; state = 'won'; banner('守住了！', '', 1400); [0, 280, 560].forEach(function (d, i) { S.later(function () { var bx = L.W * (.25 + i * .25), by = L.fy + L.fh * (.3 + (i % 2) * .15); S.fx.burst(bx, by, { n: 28, colors: [GOLD, '#fff', '#3ee6d0', '#ff5fa2'], speed: 220, life: .9, size: 4, shape: 'star' }); S.fx.ring(bx, by, { r0: 8, r1: 90, life: .5, color: GOLD, width: 4 }); S.sfx('coin'); }, d); }); S.finish({ cleared: true, score: score, maxCombo: maxCombo, seconds: playT }); }

    /* ---------------- update */
    var lastFloat = null, laneBuf = [[], [], [], []], drawList = [], hudAcc = 0, byXn = function (a, b) { return a.xn - b.xn; }, byDraw = function (a, b) { return a.lane - b.lane || b.xn - a.xn; };
    var manual = !!opts.manual, stepping = false;   /* test hook: with opts.manual the real-time loop idles and only G._step advances the game */
    function update(dt) {
      if (manual && !stepping) return;
      var i, e;
      if (slowT > 0) { slowT -= dt; if (!GX.reduced()) dt *= .3; }          /* boss kill: brief slow motion */
      turret.flash = Math.max(0, turret.flash - dt * 7); turret.recoil = Math.max(0, turret.recoil - dt * 6); turret.pop = Math.max(0, turret.pop - dt * 3); baseHit = Math.max(0, baseHit - dt * 2.5); turret.y = lerp(turret.y, turret.tgtY, Math.min(1, dt * 12));
      for (i = proj.length - 1; i >= 0; i--) {
        var p = proj[i]; p.t += dt; var tp = (p.e && p.e.state !== 'gone') ? enemyXY(p.e) : { x: p.sx + 200, y: p.sy }, k = Math.min(1, p.t / p.dur);
        p.x = lerp(p.sx, tp.x, k); p.y = lerp(p.sy, tp.y, k); S.fx.trail(p.x, p.y, p.big ? TIERS[p.tier].col : '#ffe28a', p.big ? 5 : 3);
        if (k >= 1) { proj.splice(i, 1); impact(p); }
      }
      for (i = bolts.length - 1; i >= 0; i--) { bolts[i].t -= dt; if (bolts[i].t <= 0) bolts.splice(i, 1); }
      for (i = guardFx.length - 1; i >= 0; i--) { var gf = guardFx[i]; gf.t += dt; if (!GX.reduced()) S.fx.trail(L.baseX + (L.W - L.baseX) * Math.min(1, gf.t / .9), laneY(gf.lane), '#6fffe0', 5); if (gf.t > .9) guardFx.splice(i, 1); }
      for (i = meteors.length - 1; i >= 0; i--) { var m = meteors[i]; m.x += m.vx * dt; m.y += m.vy * dt; if (m.y >= m.gy) { meteors.splice(i, 1); S.fx.ring(m.x, m.gy, { r0: 4, r1: 34, life: .35, color: '#ffb36b', width: 3 }); S.fx.burst(m.x, m.gy, { n: 8, colors: ['#ffb36b', '#fff'], speed: 120, life: .4, size: 3 }); if (S.t - lastBeepT > .35) { lastBeepT = S.t; S.sfx('hit'); } } }
      for (i = enemies.length - 1; i >= 0; i--) {
        e = enemies[i]; if (e.enter < 1) e.enter = Math.min(1, e.enter + dt / 0.8); if (e.flash > 0) e.flash = Math.max(0, e.flash - dt * 5); if (e.hit > 0) e.hit = Math.max(0, e.hit - dt * 6); if (e.kb > 0) e.kb = Math.max(0, e.kb - dt * 7);
        if (e.state === 'dying') { if (e.boomed) { e.dieT += dt; if (e.dieT > .55) { enemies.splice(i, 1); } } else { e.dieT += dt; if (e.dieT > .8) { e.boomed = true; e.dieT = 0; } } }
        else if (e.state === 'gone') enemies.splice(i, 1);
      }
      if (state === 'count') {
        cd -= dt; var n = Math.ceil(cd); if (n !== cdShown && n >= 1 && n <= 3) { cdShown = n; S.sfx('tick'); }
        if (cd <= 0) { state = 'play'; banner('出發！', '', 700); HELPERS.forEach(function (h) { if (F.energy && h.at === F.lv) banner('新幫手：' + h.name, h.tip + '・按左邊放到路上', 1900); }); S.sfx('power'); S.audio.music(cfg.music); curLayer = 0; applyPad(true); renderQ(); }
        return;
      }
      if (state !== 'play' || frozen || S.ended) return;
      playT += dt;
      if (ev.meteor > 0) { ev.meteor -= dt; meteorT -= dt; if (meteorT <= 0 && !GX.reduced()) { meteorT = .16 + rng() * .18; var gx = L.baseX + rng() * (L.W - L.baseX); meteors.push({ x: gx + 120, y: L.fy - 30, vx: -420, vy: 520, gy: L.fy + rng() * L.fh * .95 + 4, len: 40 }); } }
      if (ev.freeze > 0) ev.freeze -= dt; if (ev.slow > 0) ev.slow -= dt;
      var sf = ev.freeze > 0 ? 0 : (ev.meteor > 0 ? .5 : 1) * (ev.slow > 0 ? .6 : 1), step = dt * sf / P.cross;
      trySpawn(dt); helpersUpdate(dt);
      for (i = 0; i < 4; i++) laneBuf[i].length = 0;
      for (i = 0; i < enemies.length; i++) if (enemies[i].state === 'walk') laneBuf[enemies[i].lane].push(enemies[i]);
      for (i = 0; i < L.lanes; i++) { var ls = laneBuf[i]; if (!ls.length) continue; if (ls.length > 1) ls.sort(byXn); var lm = laneMul(i), wl = wallOf(i), wgap = L.es * .7 / (L.spawnX - L.endX); for (var j = 0; j < ls.length; j++) { var q = ls[j]; q.age += dt; q.blocked = false; if (q.stun > 0) q.stun -= dt; else q.xn -= step * q.spd * lm; if (wl && q.xn < wl.xn + wgap && q.xn > wl.xn - wgap) { q.xn = wl.xn + wgap; q.blocked = true; } if (j > 0) { var gap = (L.es * (ls[j - 1].boss ? 1.1 : .95) + (q.boss ? L.es * .4 : 0)) / (L.spawnX - L.endX); if (q.xn < ls[j - 1].xn + gap) q.xn = ls[j - 1].xn + gap; } } }
      enemies.forEach(function (q) {
        if (!alive(q)) return; if (!q.warned && q.xn < .22) { q.warned = true; S.sfx('warn'); }
        if (q.xn <= 0 && !frozen) wrongAnswer(q, curItem(q), q.typed, 'base');
      });
      if (!target || !alive(target)) { var nt = pickTarget(); if (nt) setTarget(nt, false, !!target); }
      hudAcc += dt; if (hudAcc > 0.2) { hudAcc = 0; hudUpdate(); musicLayer(); }
      if (!frozen && S.learn.done() && !pend.length && enemies.length === 0 && !bossAlive && !S.ended) win();
    }

    /* ---------------- draw */
    function drawBlob(c, x, y, s, col, t, flash) {
      var gr = c.createRadialGradient(x - s * .15, y - s * .2, s * .05, x, y, s * .5); gr.addColorStop(0, '#fff'); gr.addColorStop(.25, col); gr.addColorStop(1, '#2b1d4a');
      c.fillStyle = gr; c.beginPath(); c.ellipse(x, y, s * .4, s * .36, 0, 0, 6.3); c.fill();
      c.fillStyle = '#fff'; c.beginPath(); c.arc(x - s * .13, y - s * .06, s * .09, 0, 6.3); c.arc(x + s * .13, y - s * .06, s * .09, 0, 6.3); c.fill();
      c.fillStyle = '#2b1d4a'; c.beginPath(); c.arc(x - s * .12, y - s * .05, s * .045, 0, 6.3); c.arc(x + s * .14, y - s * .05, s * .045, 0, 6.3); c.fill();
      c.strokeStyle = '#2b1d4a'; c.lineWidth = 2; c.beginPath(); c.arc(x, y + s * .06, s * .09, .2, 2.9); c.stroke();
    }
    function drawEnemy(c, e) {
      var pos = enemyXY(e), x = pos.x + e.kb * L.es * .14, y = pos.y, s = eSize(e), red = GX.reduced(), fz = ev.freeze > 0 && alive(e), d = S.dpr, ph = S.t * (e.boss ? 3.2 : 6.2) + e.ph;
      var bob = (red || fz) ? 0 : Math.abs(Math.sin(ph)) * s * .07, sway = (red || fz || !alive(e)) ? 0 : Math.sin(ph) * .05, sq = 1 + e.hit * .14 + ((red || fz || !alive(e)) ? 0 : Math.cos(ph * 2) * .025), sc = 1, al = e.enter < 1 ? Math.min(1, e.enter * 2.2) : 1, up = 0, rot = sway;
      if (e.state === 'dying' && e.boomed) { var k = e.dieT / .55; sc = 1 + k * .35; al = Math.max(0, 1 - k * k); rot = k * .45 * (e.uid % 2 ? 1 : -1); up = k * s * .3; }
      c.save(); c.globalAlpha = al;
      var sh = shadowSprite(), sw = s * .86 * (1 - bob / s * .6); c.globalAlpha = al * .9; c.drawImage(sh, x - sw / 2, y + s * .3, sw, sw * .25); c.globalAlpha = al;
      if (e === target && alive(e)) {                  /* selection: gold ring on the ground + glow */
        var pr = 1 + Math.sin(S.t * 6) * .05; c.strokeStyle = GOLD; c.lineWidth = 3; c.beginPath(); c.ellipse(x, y + s * .34, s * .48 * pr, s * .15 * pr, 0, 0, 6.3); c.stroke();
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = .35 * al; c.drawImage(glow('#ffc94a', 96), x - s * .65, y - s * .6, s * 1.3, s * 1.3); c.globalCompositeOperation = 'source-over'; c.globalAlpha = al;
      }
      if (e.boss && alive(e)) {                        /* menacing pulse behind the boss */
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = (.28 + (red ? 0 : .12 * Math.sin(S.t * 4))) * al; c.drawImage(glow('#ff7a3c', 96), x - s * .8, y - s * .75, s * 1.6, s * 1.6); c.globalCompositeOperation = 'source-over'; c.globalAlpha = al;
      }
      if (e.boss && e.shield > 0) {                    /* shield layers: counter-rotating dashed rings, one per remaining shield */
        for (var q = 0; q < e.shield; q++) { var rr = s * (.58 + q * .08) + (red ? 0 : Math.sin(S.t * 3 + q) * 2); c.strokeStyle = 'rgba(111,216,255,' + (.8 - q * .15) + ')'; c.lineWidth = 3; c.setLineDash([rr * .9, rr * .35]); c.lineDashOffset = red ? 0 : (q % 2 ? 1 : -1) * S.t * 30; c.beginPath(); c.arc(x, y - bob, rr, 0, 6.3); c.stroke(); }
        c.setLineDash([]); c.fillStyle = 'rgba(111,216,255,.12)'; c.beginPath(); c.arc(x, y - bob, s * .58, 0, 6.3); c.fill();
      }
      c.translate(x, y - bob - up); c.rotate(rot); c.scale(1 / sq * sc, sq * sc);
      var src = base + (e.boss ? 'td_boss_' : 'td_enemy_') + e.spr + '.webp', sp = sprite(src, s, d);
      if (sp) c.drawImage(sp.c, -s / 2, -s / 2, s, s * sp.r); else drawBlob(c, 0, 0, s, BLOB_COL[(e.spr - 1) % 8], S.t, 0);
      if (e.kind || e.stun > 0) drawKind(c, e, s);
      if (e.flash > 0.05) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = e.flash * .6 * al; if (sp) c.drawImage(sp.c, -s / 2, -s / 2, s, s * sp.r); else { c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, s * .3, 0, 6.3); c.fill(); } c.globalCompositeOperation = 'source-over'; c.globalAlpha = al; }
      if (fz) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = .45 * al; c.fillStyle = '#6fd8ff'; GX.rrect(c, -s * .38, -s * .4, s * .76, s * .8, s * .2); c.fill(); c.globalCompositeOperation = 'source-over'; c.globalAlpha = al; c.strokeStyle = 'rgba(230,250,255,.9)'; c.lineWidth = 2; GX.rrect(c, -s * .38, -s * .4, s * .76, s * .8, s * .2); c.stroke(); }
      c.restore();
      if ((alive(e) || e.state === 'dying') && !isMath(curItem(e))) {            /* progress pips (English only: math never shows the answer length) (tiny markers, no question text on the monster) */
        var it = curItem(e), n = it.en.replace(/[^A-Za-z]/g, '').length, done = e.typed.replace(/[^A-Za-z]/g, '').length, pw = Math.min(7, Math.max(4, (s * .8) / Math.max(1, n))), ps = pipSprite(n, done, pw, d);
        c.globalAlpha = al; c.drawImage(ps.c, x - ps.w / 2, y + s * .5 - 1, ps.w, ps.h); c.globalAlpha = 1;
        if (e.xn < .22 && alive(e)) { c.fillStyle = '#ff5d7a'; c.globalAlpha = .6 + .4 * Math.sin(S.t * 14); c.beginPath(); c.arc(x, y - s * .6, 7, 0, 6.3); c.fill(); c.fillStyle = '#fff'; c.font = '900 11px ' + EFONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('!', x, y - s * .6 + 1); c.globalAlpha = 1; }
      } else if (e.xn < .22 && alive(e)) { c.fillStyle = '#ff5d7a'; c.globalAlpha = .6 + .4 * Math.sin(S.t * 14); c.beginPath(); c.arc(x, y - s * .6, 7, 0, 6.3); c.fill(); c.fillStyle = '#fff'; c.font = '900 11px ' + EFONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('!', x, y - s * .6 + 1); c.globalAlpha = 1; }
    }
    function drawHelpers(c, W) {
      var i, h, x, y, s, sp, red = GX.reduced(), d = S.dpr;
      for (i = 0; i < helpers.length; i++) { h = helpers[i]; if (h.k !== 'ice') continue; var a = Math.min(1, h.t / 3); c.fillStyle = 'rgba(111,216,255,' + (.13 * a) + ')'; c.fillRect(L.baseX, L.lt + h.lane * L.laneH, W - L.baseX, L.laneH * L.pf); c.strokeStyle = 'rgba(200,245,255,' + (.35 * a) + ')'; c.lineWidth = 1.5; c.strokeRect(L.baseX, L.lt + h.lane * L.laneH + 1, W - L.baseX, L.laneH * L.pf - 2); }
      for (i = 0; i < L.lanes; i++) if (guards[i]) {                        /* parked rescue ships, one per lane */
        x = L.baseX - L.es * .08; y = laneY(i) + L.laneH * L.pf * .32; s = clamp(L.es * .55, 24, 54); sp = sprite(base + 'td_h_guard.webp', s, d);
        if (sp) c.drawImage(sp.c, x - s / 2, y - s * sp.r / 2 + (red ? 0 : Math.sin(S.t * 2 + i) * 1.5), s, s * sp.r); else { c.fillStyle = '#6fffe0'; c.beginPath(); c.moveTo(x + s * .4, y); c.lineTo(x - s * .3, y - s * .2); c.lineTo(x - s * .3, y + s * .2); c.fill(); }
      }
      for (i = 0; i < guardFx.length; i++) { var gf = guardFx[i], k = Math.min(1, gf.t / .9); x = L.baseX + (W - L.baseX + 60) * GX.ease.out(k); y = laneY(gf.lane); s = clamp(L.es * .8, 30, 70); sp = sprite(base + 'td_h_guard.webp', s, d); c.globalCompositeOperation = 'lighter'; c.globalAlpha = .6; c.drawImage(glow('#6fffe0', 96), x - s, y - s, s * 2, s * 2); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; if (sp) c.drawImage(sp.c, x - s / 2, y - s * sp.r / 2, s, s * sp.r); }
      for (i = 0; i < helpers.length; i++) {
        h = helpers[i]; var hp = helperOf(h.k); s = clamp(L.es * (h.k === 'ice' ? .85 : .95), 30, 96) * (1 + h.pop * .25); x = ex(h) + (h.shake && !red ? Math.sin(S.t * 40) * 1.5 : 0); y = laneY(h.lane);
        c.globalAlpha = .85; c.drawImage(shadowSprite(), x - s * .42, y + s * .28, s * .84, s * .2); c.globalAlpha = 1;
        if (h.k === 'mine' && !red) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = .25 + .2 * Math.sin(S.t * 6); c.drawImage(glow('#ff9d4a', 96), x - s * .7, y - s * .7, s * 1.4, s * 1.4); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; }
        sp = sprite(base + hp.img, s, d);
        if (sp) c.drawImage(sp.c, x - s / 2, y - s * sp.r * .55, s, s * sp.r); else { c.fillStyle = hp.col; GX.rrect(c, x - s * .3, y - s * .4, s * .6, s * .7, 8); c.fill(); }
        if (h.k === 'wall') { var bw = s * .7, f = Math.max(0, h.hp / WALL_HP); c.fillStyle = 'rgba(0,0,0,.45)'; GX.rrect(c, x - bw / 2, y - s * .62, bw, 6, 3); c.fill(); c.fillStyle = f > .35 ? '#9be8ff' : '#ff6b81'; GX.rrect(c, x - bw / 2, y - s * .62, bw * f, 6, 3); c.fill(); }
        if (h.k === 'ice') { var iw = s * .7, fi = Math.max(0, h.t / ICE_T); c.fillStyle = 'rgba(0,0,0,.45)'; GX.rrect(c, x - iw / 2, y - s * .62, iw, 5, 3); c.fill(); c.fillStyle = '#6fd8ff'; GX.rrect(c, x - iw / 2, y - s * .62, iw * fi, 5, 3); c.fill(); }
      }
    }
    function drawKind(c, e, s) {                          /* drawn inside the monster's local transform */
      var sp, red = GX.reduced();
      if (e.kind === 'armor' && (e.armor > 0 || (e.items && e.phase === 0))) { var hs = s * .62; sp = sprite(base + 'td_k_helmet.webp', hs, S.dpr); if (sp) c.drawImage(sp.c, -hs / 2, -s * .62, hs, hs * sp.r); else { c.fillStyle = '#9fb2e8'; c.beginPath(); c.arc(0, -s * .2, s * .3, Math.PI, 0); c.fill(); c.strokeStyle = GOLD; c.lineWidth = 3; c.stroke(); } }
      if (e.hear && !isMath(curItem(e))) { var ps = s * .56; sp = sprite(base + 'td_k_phones.webp', ps, S.dpr); if (sp) c.drawImage(sp.c, -ps / 2, -s * .56, ps, ps * sp.r); else { c.strokeStyle = '#ff8cc8'; c.lineWidth = 4; c.beginPath(); c.arc(0, -s * .05, s * .34, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); } if (!red && alive(e)) { c.strokeStyle = 'rgba(255,196,226,.8)'; c.lineWidth = 2; for (var w = 0; w < 2; w++) { var rr = s * (.42 + w * .1 + ((S.t * .6) % .1)); c.beginPath(); c.arc(0, -s * .1, rr, -.5, .5); c.stroke(); } } }
      if (e.kind === 'fast' && alive(e) && !red) { c.strokeStyle = 'rgba(255,226,154,.8)'; c.lineWidth = 3; c.lineCap = 'round'; for (var z = 0; z < 3; z++) { var yy = -s * .15 + z * s * .15, ln = s * (.25 + ((S.t * 3 + z * .37) % 1) * .2); c.beginPath(); c.moveTo(s * .42, yy); c.lineTo(s * .42 + ln, yy); c.stroke(); } }
      if (e.stun > 0 && alive(e)) { for (var q = 0; q < 3; q++) { var an = S.t * 5 + q * 2.1; c.fillStyle = '#ffe29a'; c.beginPath(); c.arc(Math.cos(an) * s * .28, -s * .52 + Math.sin(an) * s * .06, 3.5, 0, 6.3); c.fill(); } }
    }
    function drawTurret(c) {
      var T = TIERS[tier], ts = clamp(L.laneH * 1.05, 54, Math.min(120, (L.baseX - L.trayW) * 1.25)), x = L.tx, red = GX.reduced(), y = turret.y + (red ? 0 : Math.sin(S.t * 2.2) * 1.5), tp = target ? enemyXY(target) : { x: x + 100, y: y }, d = S.dpr;
      turret.size = ts; var ang = clamp(Math.atan2(tp.y - y, tp.x - x), -.6, .6) * .5, sc = 1 + turret.pop * .25 - turret.recoil * .06, frac = 0;
      if (target && alive(target)) { var ti = curItem(target), tot = isMath(ti) ? String(ti.a).length : ti.en.replace(/[^A-Za-z]/g, '').length; frac = tot ? Math.min(1, (isMath(ti) ? target.typed.length : target.typed.replace(/[^A-Za-z]/g, '').length) / tot) : 0; }
      c.globalAlpha = .9; c.drawImage(shadowSprite(), x - ts * .45, y + ts * .3, ts * .9, ts * .22); c.globalAlpha = 1;
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = .32 + frac * .35 + turret.recoil * .25; var gs = ts * (1.4 + frac * .35); c.drawImage(glow(T.col, 96), x - gs / 2, y - gs / 2, gs, gs); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;   /* charge glow grows with the letters typed */
      c.save(); c.translate(x - turret.recoil * 6, y); c.rotate(ang); c.scale(-sc, sc);
      var sp = sprite(base + T.img, ts, d);
      if (sp) c.drawImage(sp.c, -ts / 2, -ts / 2, ts, ts * sp.r);
      else { c.fillStyle = '#5a3fbf'; GX.rrect(c, -ts * .3, ts * .05, ts * .6, ts * .3, 8); c.fill(); c.fillStyle = T.col; c.beginPath(); c.arc(0, -ts * .05, ts * .3, 0, 6.3); c.fill(); c.fillStyle = '#2b1d4a'; c.fillRect(-ts * .42, -ts * .1, ts * .42, ts * .12); }
      c.restore();
      if (turret.flash > .02) { var m = muzzle(), fs = ts * (.35 + turret.flash * .45); c.globalCompositeOperation = 'lighter'; c.globalAlpha = Math.min(.8, turret.flash * .8); c.drawImage(glow('#fff3c4', 64), m.x - fs / 2, m.y - fs / 2, fs, fs); c.globalAlpha = Math.min(.6, turret.flash * .6); c.drawImage(glow(T.col, 96), m.x - fs, m.y - fs, fs * 2, fs * 2); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; }
    }
    function draw(c, W, H) {
      if (manual && !stepping) return;
      var i, e, sx = statSrc;
      if (!statOk && GX.img(sx).ok) { buildStatic(); }
      if (stat) c.drawImage(stat, 0, 0, W, H);
      drawAmbient(c, W, false);
      if (target && alive(target) && state === 'play') { c.fillStyle = 'rgba(255,201,74,.07)'; c.fillRect(L.baseX, L.lt + target.lane * L.laneH, W - L.baseX, L.laneH * L.pf); }
      if (state === 'play') for (i = 0; i < enemies.length; i++) { e = enemies[i]; if (e.state === 'walk' && e.xn < .22) { c.fillStyle = 'rgba(255,60,90,' + (.08 + (GX.reduced() ? .04 : .06 * Math.sin(S.t * 9))) + ')'; c.fillRect(L.baseX, L.lt + e.lane * L.laneH, W - L.baseX, L.laneH * L.pf); } }   /* danger: a lane glows red when a monster is close to the base */
      /* base shield line */
      var bx = L.baseX, pul = .6 + Math.sin(S.t * 3) * .15; c.strokeStyle = baseHit > .01 ? 'rgba(255,80,110,' + (.5 + baseHit * .5) + ')' : 'rgba(110,255,230,' + pul * .8 + ')'; c.lineWidth = 3 + baseHit * 4; c.beginPath(); c.moveTo(bx, L.lt); c.lineTo(bx, L.lt + L.lanes * L.laneH); c.stroke();
      if (baseHit > .01) { c.globalCompositeOperation = 'lighter'; c.fillStyle = 'rgba(255,60,90,' + baseHit * .25 + ')'; c.fillRect(0, L.lt, bx, L.lanes * L.laneH); c.globalCompositeOperation = 'source-over'; }
      if (ev.freeze > 0) { c.fillStyle = 'rgba(150,220,255,.14)'; c.fillRect(0, L.fy, W, L.fh); }
      else if (ev.meteor > 0) { c.fillStyle = 'rgba(255,150,70,.08)'; c.fillRect(0, L.fy, W, L.fh); }
      drawHelpers(c, W);
      drawTurret(c);
      var list = drawList; list.length = 0; for (i = 0; i < enemies.length; i++) list.push(enemies[i]); if (list.length > 1) list.sort(byDraw);
      for (i = 0; i < list.length; i++) drawEnemy(c, list[i]);
      for (i = 0; i < meteors.length; i++) { var m = meteors[i]; c.strokeStyle = 'rgba(255,200,120,.9)'; c.lineWidth = 3; c.beginPath(); c.moveTo(m.x, m.y); c.lineTo(m.x + 24, m.y - 31); c.stroke(); c.globalCompositeOperation = 'lighter'; c.drawImage(glow('#ff9d4a', 48), m.x - 14, m.y - 14, 28, 28); c.globalCompositeOperation = 'source-over'; }
      for (i = 0; i < proj.length; i++) { var p = proj[i], r = p.big ? 11 : 6, col = p.big ? TIERS[p.tier].col : '#ffe28a'; c.globalCompositeOperation = 'lighter'; c.drawImage(glow(col, 64), p.x - r * 2.4, p.y - r * 2.4, r * 4.8, r * 4.8); c.globalCompositeOperation = 'source-over'; c.fillStyle = '#fff'; c.beginPath(); c.arc(p.x, p.y, r * .5, 0, 6.3); c.fill(); }
      for (i = 0; i < bolts.length; i++) { var b = bolts[i]; c.globalAlpha = Math.min(1, b.t * 5); c.lineJoin = 'round'; c.strokeStyle = 'rgba(255,233,74,.9)'; c.lineWidth = 4; c.beginPath(); b.pts.forEach(function (q, k) { k ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y); }); c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.stroke(); c.globalAlpha = 1; }
      drawAmbient(c, W, true);
      if (tier > 0 && state === 'play') { c.globalCompositeOperation = 'lighter'; c.globalAlpha = .16 + tier * .05 + (GX.reduced() ? 0 : .05 * Math.sin(S.t * 3)); c.drawImage(vigSprite(TIERS[tier].col), 0, 0, W, H); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1; }
      if (state === 'count' && cdShown >= 1) {          /* big countdown numeral, popped in on every tick */
        var fr = 1 - (cd - (cdShown - 1)), pop = GX.reduced() ? 1 : .6 + GX.ease.back(Math.min(1, fr * 3)) * .5, lb = GX.label(String(cdShown), { size: 110, weight: 900, fam: EFONT, color: '#ffe29a', stroke: '#2b1d4a', strokeW: 8, dpr: 2 });
        c.globalAlpha = fr > .75 ? Math.max(0, (1 - fr) / .25) : 1; c.drawImage(lb.c, W / 2 - lb.w * pop / 2, L.fy + L.fh * .42 - lb.h * pop / 2, lb.w * pop, lb.h * pop); c.globalAlpha = 1;
      }
    }

    /* ---------------- input wiring */
    S.keys({
      onChar: function (k, ke) { if (frozen || state !== 'play' || (ke && ke.repeat)) return; k = half(k); if (math) { if (/^[0-9.\/\-]$/.test(k)) press(k); } else if (/^[A-Za-z]$/.test(k)) press(k.toLowerCase()); },
      onBack: function () { if (!frozen && state === 'play') press('⌫'); },
      onEnter: function () { if (!frozen && state === 'play') press('↵'); },
      onSpace: function () { if (!frozen && state === 'play') cycleTarget(1); },
      onArrow: function (d) { if (frozen || state !== 'play') return; if (d === 'up') laneMove(-1); else if (d === 'down') laneMove(1); else cycleTarget(d === 'left' ? 1 : -1); }
    });
    var imeShown = false;
    S.on(window, 'keydown', function (ke) {                 /* helpers: 1/2/3 (math: Shift+1/2/3, digits are answers) */
      var m = /^Digit([1-3])$/.exec(ke.code || ''); if (!m || !F.energy || ke.repeat || (math && !ke.shiftKey)) return; var h = HELPERS[+m[1] - 1]; if (F.helpers.indexOf(h.k) < 0) return;
      ke.preventDefault(); ke.stopPropagation(); place(h.k);
    }, true);
    S.on(window, 'keydown', function (ke) { if ((ke.key === 'Process' || ke.isComposing) && state === 'play' && !frozen && !imeShown) { imeShown = true; banner('請切換英文輸入', '', 2200); events.push('ime'); } });
    S.on(cv, 'pointerdown', function (ev0) {
      if (state !== 'play' || frozen || S.paused) return; var r = cv.getBoundingClientRect(), x = ev0.clientX - r.left, y = ev0.clientY - r.top, best = null, bd = 1e9;
      aliveList().forEach(function (e) { var p = enemyXY(e), dx = p.x - x, dy = p.y - y, d = Math.sqrt(dx * dx + dy * dy), lim = Math.max(44, eSize(e) * .75); if (d < lim && d < bd) { bd = d; best = e; } });
      if (!best) { var ln = Math.floor((y - L.lt) / L.laneH); if (ln >= 0 && ln < L.lanes) aliveList().forEach(function (e) { if (e.lane === ln) { var d = Math.abs(ex(e) - x); if (d < bd) { bd = d; best = e; } } }); }
      if (best) setTarget(best, true);
    });

    /* ---------------- flow */
    function begin() {                                   /* after preview: countdown, then play */
      S.ui.close('preview'); try { S.audio.warm(); } catch (e0) { /* */ } state = 'count'; cd = 3.2; cdShown = 0; frozen = false; pad.disable(false);
    }
    function intro(skipHow) {
      state = 'intro'; renderQ();
      var go = function () { if (S.dead) return; S.ui.preview(S.learn.items, { onStart: function () { begin(); } }); };
      var tips = [{ icon: '👀', text: '看題目' }, padWanted ? { icon: '👆', text: math ? '點數字作答' : '點字母拼字' } : { icon: '⌨️', text: math ? '用鍵盤打數字' : '用鍵盤打字' }];
      if (F.energy) tips.push({ icon: '⚡', text: '答對得星能・放幫手' }); tips.push({ icon: '🛡️', text: '守住基地' });
      if (skipHow) go(); else S.ui.how('td', '字母砲台', tips, go);
    }
    function restart() {
      runN++; S.ui.closeAll(); S.paused = false; S.ended = false; S.result = null; S.fx.clear(); enemies = []; proj = []; bolts = []; meteors = []; pend = []; target = null; frozen = false; lost = false;
      energy = F.energy ? 2 : 0; helpers = []; guardFx = []; for (var gi = 0; gi < guards.length; gi++) guards[gi] = F.guard; wave = 0; waveBreak = 0; waveBounds = []; spawnedIds = {}; spawnedCore = 0; seenKind = {}; forceKind = null;
      hearts = P.hearts; combo = 0; maxCombo = 0; coins = 0; score = 0; tier = 0; playT = 0; spawnT = 0.2; bossSpawned = bossAlive = bossWon = false; ev.meteor = ev.freeze = ev.slow = 0; events = []; baseHit = 0; padSig = ''; lastHud = '';
      rng = GX.rng((seed0 != null ? seed0 : Date.now()) + 77 + runN);
      S.newLearn(); lockUntil = -1;
      cfg.music = diff <= 2 ? 'calm' : 'drive'; S.audio.stopMusic(); hudUpdate(true); applyPad(true); renderQ(); begin();      /* replay: no preview deck again, just the countdown */
    }

    S.loop(update, draw);
    ready = true; layout(); intro(false);
    
    /* ---------------- debug / test hooks */
    function snap() {
      return {
        state: state, frozen: frozen, ended: !!S.ended, lost: lost, hearts: hearts, heartsMax: P.hearts, combo: combo, maxCombo: maxCombo, tier: tier, tierName: TIERS[tier].k, coins: coins, score: score, playT: playT,
        params: P, feat: F, energy: energy, wave: wave, waves: F.waves, waveBreak: waveBreak, guards: guards.slice(), helpers: helpers.map(function (h) { return { k: h.k, lane: h.lane, xn: h.xn, hp: Math.round(h.hp * 100) / 100, t: Math.round(h.t * 100) / 100 }; }), spawnedCore: spawnedCore,
        tray: F.energy ? tray.getBoundingClientRect().toJSON() : null, lanes: L.lanes, layout: { W: L.W, H: L.H, fy: L.fy, fh: L.fh, padH: L.padH, padOn: L.padOn, qh: L.qh, laneH: L.laneH, es: L.es, baseX: L.baseX, land: L.land },
        target: target ? target.uid : 0, events: events.slice(),
        ui: { learn: S.ui.open('learn'), preview: S.ui.open('preview'), how: S.ui.open('how'), pause: S.ui.open('pause'), result: S.ui.open('result') }, music: S.audio.state().music, ev: { meteor: ev.meteor, freeze: ev.freeze, slow: ev.slow }, boss: { level: isBossLevel, spawned: bossSpawned, alive: bossAlive, won: bossWon },
        cache: { sprites: SPRN, pips: Object.keys(PIPS).length }, layer: curLayer, slowT: slowT, pad: { mode: padSig, keys: pad ? Array.prototype.map.call(pad.el.querySelectorAll('.gx-key'), function (b) { return b.getAttribute('data-k'); }) : [], h: pad ? pad.height() : 0 },
        learn: { remaining: S.learn.remaining(), done: S.learn.done(), progress: S.learn.progress(), total: S.learn.total() }, pend: pend.length, projectiles: proj.length,
        enemies: enemies.map(function (e) { var it = curItem(e); return { uid: e.uid, id: it.id, lane: e.lane, xn: Math.round(e.xn * 1000) / 1000, typed: e.typed, errs: e.errs, state: e.state, boss: e.boss, shield: e.shield, phase: e.phase, segEnds: e.segEnds, hl: e.hl, pre: e.pre, hintShown: e.hintShown, kind: e.kind, armor: e.armor, hear: e.hear, reveal: e.reveal, stun: Math.round(e.stun * 100) / 100, blocked: e.blocked, items: e.items ? e.items.length : 0, answer: isMath(it) ? String(it.a) : it.en, math: isMath(it), hints: e.hints }; })
      };
    }
    function cmd(name, a) {
      var e = target;
      switch (name) {
        case 'begin': S.ui.closeAll(); frozen = false; pad.disable(false); if (state !== 'play') { state = 'play'; spawnT = 0.2; applyPad(true); renderQ(); } return true;
        case 'type': String(a).split('').forEach(function (ch) { press(ch); }); return true;
        case 'key': press(a); return true;
        case 'solve': if (!e) return false; { var it = curItem(e); String(isMath(it) ? it.a : it.en.slice(e.typed.length)).split('').forEach(function (ch) { if (!isMath(it) && !/[A-Za-z]/.test(ch)) return; press(isMath(it) ? ch : ch.toLowerCase()); }); } return true;
        case 'wrong': if (!e) return false; { var it2 = curItem(e); if (isMath(it2)) { var wd = String(it2.a)[0] === '9' ? '8' : '9'; for (var k = 0; k < 9 && e.state === 'walk'; k++) press(wd); if (e.state === 'walk') press('↵'); } else { e.xn = 0; } } return true;
        case 'timeout': if (!e) return false; e.xn = 0; return true;
        case 'select': { var t = enemies.filter(function (q) { return q.uid === a; })[0]; if (t) setTarget(t, true); return !!t; }
        case 'peek': { var pi = S.learn.items[a]; if (!pi) return false; var pe = mkEnemy(pi, { lane: a % L.lanes }); pe.xn = 0.6; enemies.push(pe); setTarget(pe); return true; }
        case 'mkboss': { var be = mkEnemy(a, { boss: true, lane: 1 }); enemies.push(be); bossSpawned = bossAlive = true; setTarget(be); return be.uid; }
        case 'float': ftext(a[0], a[1], a[2] || '連擊 ×9', { size: 20 }); return lastFloat;
        case 'okchip': { var oc = document.querySelector('.gx-okchip'); return oc ? oc.getBoundingClientRect().toJSON() : null; }
        case 'event': startEvent(a); return true;
        case 'spawn': return spawnNormal();
        case 'energy': energy = a; hudUpdate(true); return true;
        case 'place': return place(a && a.k ? a.k : a, a && a.lane != null ? a.lane : null);
        case 'kind': forceKind = a; return true;
        case 'qview': return { txt: el.qtxt.textContent, pic: !el.qpic.classList.contains('none'), pulse: el.qsay.classList.contains('td-pulse'), tag: (qbar.querySelector('.td-tag') || {}).textContent || '' };
        case 'hearts': hearts = a; hudUpdate(true); return true;
        case 'combo': combo = a; maxCombo = Math.max(maxCombo, a); for (var i2 = 0; i2 < COMBO_AT.length; i2++) if (combo >= COMBO_AT[i2]) tier = i2; hudUpdate(true); return true;
        case 'hint': useHint(); return true;
        case 'screen': return { qbar: qbar.getBoundingClientRect().toJSON(), pad: pad.el.getBoundingClientRect().toJSON(), hud: hud.getBoundingClientRect().toJSON() };
        case 'qtext': return { txt: el.qtxt.textContent, size: parseFloat(el.qtxt.firstChild && el.qtxt.firstChild.style.fontSize || getComputedStyle(el.qtxt).fontSize), scroll: el.qtxt.scrollHeight, client: el.qtxt.clientHeight, ans: el.qans.textContent };
        case 'enemyXY': { var tg = enemies.filter(function (q) { return q.uid === a; })[0] || target; return tg ? enemyXY(tg) : null; }
      }
      return null;
    }
    var H = S.handle();
    Object.defineProperty(H, '_debug', { get: snap }); H._step = function (n, dt) { stepping = true; try { S._step(n, dt); } finally { stepping = false; } }; H._cmd = cmd; H._S = S;
    TD._last = H; return H;
  }

  var TD = { feat: feat, HELPERS: HELPERS, KINDS: KINDS, _sylSegs: function (syl, en) { return sylSegs({ syl: function () { return syl; } }, { en: en }); }, start: start, params: params, DIFF: DIFF, TIERS: TIERS, COMBO_AT: COMBO_AT, _last: null };
  Object.defineProperty(TD, '_debug', { get: function () { return TD._last ? TD._last._debug : null; } });
  TD._step = function (n, dt) { if (TD._last) TD._last._step(n, dt); };
  TD._cmd = function (a, b) { return TD._last ? TD._last._cmd(a, b) : null; };
  globalThis.WQ37TD = TD;
  if (typeof module !== 'undefined') module.exports = TD;
})();

;
/* WQ37Maze - 字母迷宮 (R3.21). Eat letters / digits in order inside a maze while three kinds of ink sprites hunt you.
   English: hear + see the meaning, eat the letters of the word in spelling order (sequence memory, b/d m/n p/q u/n traps).
   Math:    eat the digits of the answer in order ('/' '.' tiles for fractions / decimals); every ~3rd round is a "condition" round
            (odd/even, multiples, equivalent fractions, decimals vs a number, equal ratios) judged by the game.
   Uses WQ37GX for audio / fx / ui / Learn / shell. Learning rules (first-try stars, 2 s learn card, requeue) all come from GX.Learn.
   Condition rounds are NOT items of S.learn (GX.Learn only knows its own items): they keep their own score and never touch the stars.
   Public: WQ37Maze.start(box, opts) -> {destroy, pause, resume};  _debug (getter), _step(n, dt), _cmd(name, arg), _genMaze(cols, rows, seed). */
(function () {
  'use strict';
  var GX = globalThis.WQ37GX;
  var DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
  var CONF = { b: 'd', d: 'b', m: 'n', n: 'mu', p: 'q', q: 'p', u: 'n' };          /* look-alike letters (b/d, m/n, p/q, u/n) */
  var ALPHA = 'abcdefghijklmnopqrstuvwxyz';
  var HEARTS = [5, 5, 4, 3, 3], ERR = [.30, .22, .14, .07, .03], BASE_T = [70, 55, 44, 36, 30], NDIS = [3, 4, 6, 7, 8], NDIS_M = [3, 4, 5, 6, 7];
  var PSPEED = 4.4, FRIGHT = 6, BOOST = 3, INV = 3, STALL = 20, IDLE1 = 45, GHOST_COL = ['#ff6b81', '#8e6bff', '#3ee6d0', '#ffc94a'];
  var STYLE_ON = false;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  var CSS = '.mz-dpad{position:absolute;z-index:5;width:168px;height:116px;opacity:.7;touch-action:none;display:none}.mz-dpad.on{display:block}.mz-dpad:active,.mz-dpad.hot{opacity:.85}' +
    '.mz-dpad button{position:absolute;width:56px;height:56px;border-radius:16px;border:1px solid rgba(255,255,255,.4);background:rgba(20,26,70,.78);color:#fff;display:flex;align-items:center;justify-content:center;padding:0;touch-action:none;cursor:pointer}' +
    '.mz-dpad button:active{background:rgba(70,80,170,.9)}.mz-dpad svg{width:26px;height:26px}' +
    '.mz-vig{position:absolute;inset:0;z-index:2;pointer-events:none;opacity:0;background:radial-gradient(ellipse at 50% 50%,rgba(255,60,90,0) 55%,rgba(255,60,90,.34) 100%)}.mz-fr{position:absolute;inset:0;z-index:2;pointer-events:none;opacity:0;background:rgba(108,139,255,.09)}' +
    '.gx-root .gx-hudbtn{-webkit-backdrop-filter:none;backdrop-filter:none;background:rgba(11,16,48,.82)}' +
    '.gx-hudbtn.mz-on{border-color:#ffc94a;color:#ffc94a}.gx-hudbtn.mz-hint{border-color:#ffc94a;color:#ffc94a;background:rgba(60,44,0,.7)}.gx-hudbtn.mz-hint[disabled]{opacity:.4}';
  function injectCss() { if (STYLE_ON) return; STYLE_ON = true; var s = document.createElement('style'); s.setAttribute('data-wq37', 'mz'); s.textContent = CSS; document.head.appendChild(s); }

  /* ------------------------------------------------------------------ maze generation: spanning tree + extra loops + no dead ends */
  function genMaze(cols, rows, seed) {
    var N = cols * rows, rnd = GX.rng(seed), open = new Uint8Array(N * 4), M = { cols: cols, rows: rows, N: N, open: open, ver: 0 }, cache = {}, c, d, i;
    M.nb = function (c0, d0) { var x = c0 % cols + DX[d0], y = ((c0 / cols) | 0) + DY[d0]; return (x < 0 || y < 0 || x >= cols || y >= rows) ? -1 : y * cols + x; };
    function link(c0, d0) { var n = M.nb(c0, d0); if (n < 0) return false; open[c0 * 4 + d0] = 1; open[n * 4 + ((d0 + 2) & 3)] = 1; return true; }
    M.link = link; M.unlink = function (c0, d0) { var n = M.nb(c0, d0); if (n < 0) return; open[c0 * 4 + d0] = 0; open[n * 4 + ((d0 + 2) & 3)] = 0; };
    M.deg = function (c0) { return open[c0 * 4] + open[c0 * 4 + 1] + open[c0 * 4 + 2] + open[c0 * 4 + 3]; };
    var seen = new Uint8Array(N), st = [0]; seen[0] = 1;
    while (st.length) {
      c = st[st.length - 1]; var ds = [];
      for (d = 0; d < 4; d++) { var n0 = M.nb(c, d); if (n0 >= 0 && !seen[n0]) ds.push(d); }
      if (!ds.length) { st.pop(); continue; }
      d = ds[(rnd() * ds.length) | 0]; var n1 = M.nb(c, d); link(c, d); seen[n1] = 1; st.push(n1);
    }
    var walls = [];
    for (c = 0; c < N; c++) for (d = 1; d <= 2; d++) if (M.nb(c, d) >= 0 && !open[c * 4 + d]) walls.push([c, d]);
    walls = GX.shuffle(walls, rnd); var extra = Math.round(walls.length * .28);
    for (i = 0; i < extra; i++) link(walls[i][0], walls[i][1]);
    var order = GX.shuffle(Array.apply(null, { length: N }).map(function (_, k) { return k; }), rnd);
    order.forEach(function (c0) {
      if (M.deg(c0) >= 2) return; var cand = [];
      for (var k = 0; k < 4; k++) { var nn = M.nb(c0, k); if (nn >= 0 && !open[c0 * 4 + k]) cand.push([k, M.deg(nn)]); }
      cand.sort(function (a, b) { return a[1] - b[1]; }); if (cand.length) link(c0, cand[0][0]);
    });
    /* BFS distance table from a cell over open edges (cached until an edge changes) */
    M.bfs = function (src) {
      var h = cache[src]; if (h && h.v === M.ver) return h.d;
      var dist = new Int16Array(N).fill(-1), q = new Int16Array(N), qh = 0, qt = 0, k; dist[src] = 0; q[qt++] = src;
      while (qh < qt) { var cu = q[qh++]; for (k = 0; k < 4; k++) if (open[cu * 4 + k]) { var nx = M.nb(cu, k); if (dist[nx] < 0) { dist[nx] = dist[cu] + 1; q[qt++] = nx; } } }
      cache[src] = { v: M.ver, d: dist }; return dist;
    };
    M.touch = function () { M.ver++; };
    return M;
  }

  /* ------------------------------------------------------------------ condition rounds (math only): generated and judged by the game */
  function cond(w, s, rnd) {
    var T = [], used = {}, i, q, why, explain, v;
    function add(text, tgt, y) { if (used[text]) return false; used[text] = 1; T.push({ text: String(text), tgt: !!tgt, why: y }); return true; }
    function pickN(arr, n) { return GX.shuffle(arr, rnd).slice(0, n); }
    var big = s | 0;
    if (w <= 0) {                                                       /* 小一二：單數／雙數 */
      var odd = rnd() < .5, hi = 20 + big * 2, nums = [];
      for (i = 1; i <= hi; i++) nums.push(i);
      pickN(nums.filter(function (n) { return (n % 2 === 1) === odd; }), 5).forEach(function (n) { add(n, true, n + (odd ? ' 是單數' : ' 是雙數')); });
      pickN(nums.filter(function (n) { return (n % 2 === 1) !== odd; }), 8).forEach(function (n) { add(n, false, n + (odd ? ' 是雙數' : ' 是單數')); });
      q = '吃掉所有「' + (odd ? '單數' : '雙數') + '」'; explain = odd ? '單數：個位是 1、3、5、7、9' : '雙數：個位是 0、2、4、6、8';
    } else if (w === 1 || w === 2) {                                    /* 小二：2、5 的倍數；小三：3、4 的倍數 */
      var m = w === 1 ? (rnd() < .5 ? 2 : 5) : (rnd() < .5 ? 3 : 4), hi2 = 30 + big * 2, all = [];
      for (i = 2; i <= hi2; i++) all.push(i);
      pickN(all.filter(function (n) { return n % m === 0; }), 5).forEach(function (n) { add(n, true, n + ' 是 ' + m + ' 的倍數'); });
      var non = all.filter(function (n) { return n % m !== 0; }), near = non.filter(function (n) { return n % m === 1 || n % m === m - 1; });
      pickN(near, 5).concat(pickN(non, 6)).forEach(function (n) { if (T.filter(function (t) { return !t.tgt; }).length < 8) add(n, false, n + ' 不是 ' + m + ' 的倍數'); });
      q = '吃掉所有「' + m + ' 的倍數」'; explain = m + ' 的倍數：' + m + '、' + (m * 2) + '、' + (m * 3) + '、' + (m * 4) + '…';
    } else if (w === 3) {                                               /* 小四：等值分數 */
      var bases = [[1, 2], [1, 3], [2, 3], [3, 4], [1, 4], [2, 5], [3, 5]], b = bases[(rnd() * bases.length) | 0], ks = pickN([2, 3, 4, 5, 6], 4), bt = b[0] + '/' + b[1];
      ks.forEach(function (k) { add(b[0] * k + '/' + b[1] * k, true, b[0] * k + '/' + b[1] * k + ' = ' + bt); });
      var tries = 0;
      while (T.filter(function (t) { return !t.tgt; }).length < 8 && tries++ < 80) {
        var k2 = 2 + ((rnd() * 4) | 0), nn = b[0] * k2 + (rnd() < .5 ? 1 : -1) * (1 + ((rnd() * 2) | 0)), dd = b[1] * k2 + (rnd() < .3 ? 1 : 0);
        if (nn < 1 || nn >= dd || nn * b[1] === dd * b[0]) continue; add(nn + '/' + dd, false, nn + '/' + dd + ' ≠ ' + bt);
      }
      q = '吃掉所有和 ' + bt + ' 相等的分數'; explain = '分子分母同乘同一個數，分數的大小不變';
    } else if (w === 4) {                                               /* 小五：大於／小於某數的小數 */
      var th = [0.5, 0.3, 0.8, 1.5, 2.5, 0.75][(rnd() * 6) | 0], gt = rnd() < .5, tt = String(th), cnt = 0;
      var fmt = function (x) { return String(Math.round(x * 100) / 100); };
      tries = 0;
      while ((cnt < 11) && tries++ < 200) {
        var off = Math.round((rnd() * 1.1 + .04) * 100) / 100, val = rnd() < .5 ? th + off : th - off; val = Math.round(val * 100) / 100; if (val <= 0 || Math.abs(val - th) < .009) continue;
        var vt = fmt(val), isT = gt ? val > th : val < th, nT = T.filter(function (t) { return t.tgt; }).length;
        if (isT && nT >= 5) continue; if (!isT && T.length - nT >= 6) continue;
        if (add(vt, isT, vt + (val > th ? ' 大於 ' : ' 小於 ') + tt)) cnt++;
      }
      q = '吃掉所有' + (gt ? '大於' : '小於') + ' ' + tt + ' 的小數'; explain = '先比整數部分，再比十分位、百分位';
    } else {                                                            /* 小六：等值比 */
      var rb = [[1, 2], [2, 3], [3, 4], [1, 3], [2, 5], [3, 5], [3, 2], [4, 3]], r = rb[(rnd() * rb.length) | 0], rt = r[0] + ':' + r[1];
      pickN([2, 3, 4, 5, 6], 4).forEach(function (k) { add(r[0] * k + ':' + r[1] * k, true, r[0] * k + ':' + r[1] * k + ' = ' + rt); });
      add(r[1] + ':' + r[0], false, r[1] + ':' + r[0] + ' 前後倒轉了');
      tries = 0;
      while (T.filter(function (t) { return !t.tgt; }).length < 8 && tries++ < 80) {
        var k3 = 2 + ((rnd() * 4) | 0), x1 = r[0] * k3 + (rnd() < .5 ? 1 : 0), x2 = r[1] * k3 + (rnd() < .5 ? 1 : -1); if (x1 < 1 || x2 < 1 || x1 * r[1] === x2 * r[0]) continue;
        add(x1 + ':' + x2, false, x1 + ':' + x2 + ' ≠ ' + rt);
      }
      q = '吃掉所有和 ' + rt + ' 相等的比'; explain = '前項、後項同乘（或同除）一個數，比不變';
    }
    return { q: q, tiles: T, explain: explain, need: T.filter(function (t) { return t.tgt; }).length };
  }

  /* ------------------------------------------------------------------ text helpers (canvas) */
  function tokens(s) { return String(s).match(/[A-Za-z0-9.:\/%'+\-×÷＝=]+|[\s\S]/g) || []; }
  function wrap(ctx, text, maxW) {
    var lines = [], cur = '', tk = tokens(text);
    tk.forEach(function (t) { var tst = cur + t; if (ctx.measureText(tst).width > maxW && cur) { lines.push(cur.replace(/\s+$/, '')); cur = t.replace(/^\s+/, ''); } else cur = tst; });
    if (cur) lines.push(cur); return lines;
  }
  function fitText(ctx, text, maxW, maxH, start, min, weight, fam) {
    for (var sz = start; sz >= min; sz--) { ctx.font = weight + ' ' + sz + 'px ' + fam; var ls = wrap(ctx, text, maxW), lh = Math.round(sz * 1.3); if (ls.length * lh <= maxH || sz === min) return { size: sz, lines: ls, lh: lh }; }
  }
  function heartPath(c, x, y, s) { c.beginPath(); c.moveTo(x, y + s * .8); c.bezierCurveTo(x - s * 1.3, y - s * .1, x - s * .7, y - s * 1.0, x, y - s * .35); c.bezierCurveTo(x + s * .7, y - s * 1.0, x + s * 1.3, y - s * .1, x, y + s * .8); c.closePath(); }

  /* ------------------------------------------------------------------ the game */
  var CUR = null;
  function start(box, opts) {
    injectCss(); opts = opts || {};
    var isMath = opts.subject === 'math', diff = clamp(opts.difficulty | 0 || 2, 1, 5), lv = opts.level || { w: 0, s: 0 }, boss = !!lv.boss, hasHint = diff <= 3, firstGame = true;
    var ch = opts.character || {}, G = null, L = null, S, bcv = null, hcv = null, vigEl = null, frEl = null, qImgWait = null, dpadPref = null, dpadOn = false;
    var assetBase = opts.assetBase || 'assets/r321/';
    var isTouchDev = false; try { isTouchDev = (navigator.maxTouchPoints | 0) > 0 || !!(window.matchMedia && window.matchMedia('(pointer:coarse)').matches); } catch (e) { /* */ }
    var rnd = GX.rng(1);
    function A(n) { return assetBase + n; }
    /* decode every picture up front (while the how-to / preview cards are on screen) so the first game frames do not stall */
    ['mz_ghost_1', 'mz_ghost_2', 'mz_ghost_3', 'mz_ghost_4', 'mz_ghost_scared', 'mz_orb', 'mz_portal', 'mz_gem', 'bg_mz_land', 'bg_mz_port'].forEach(function (n) { var r = GX.img(A(n + '.webp')); if (r.el && r.el.decode) r.el.decode().catch(function () { /* missing picture: drawn shapes are used */ }); });
    if (ch.img) { var cr = GX.img(ch.img); if (cr.el && cr.el.decode) cr.el.decode().catch(function () { /* */ }); }

    S = GX.shell(box, opts, { id: 'maze', music: boss ? 'boss' : (diff >= 4 ? 'drive' : 'calm'), onRestart: restart, onResize: onResize, onDestroy: function (s2) { try { s2.ui.closeAll(); } catch (e) { /* */ } if (CUR && CUR.S === S) CUR = null; } });
    CUR = { S: S };
    var fxDraw = S.fx.draw; S.fx.draw = function (c, W, H) { fxDraw(c, W, H); if (G && L && G.M) drawPlayer(c); };
    vigEl = document.createElement('div'); vigEl.className = 'mz-vig'; frEl = document.createElement('div'); frEl.className = 'mz-fr'; S.root.appendChild(vigEl); S.root.appendChild(frEl);
    bcv = document.createElement('canvas'); bcv.className = 'gx-cv'; bcv.style.pointerEvents = 'none'; S.root.insertBefore(bcv, S.canvas); hcv = document.createElement('canvas'); hcv.className = 'gx-cv'; hcv.style.pointerEvents = 'none'; S.root.insertBefore(hcv, S.canvas);
    try { dpadPref = localStorage.getItem('wq37-mz-dpad'); } catch (e) { dpadPref = null; }

    /* ---------------- DOM buttons ---------------- */
    function mkBtn(cls, icon, label, fn) {
      var b = document.createElement('button'); b.type = 'button'; b.className = 'gx-hudbtn ' + cls; b.setAttribute('aria-label', label); b.innerHTML = GX.ico(icon, 24); S.on(b, 'click', function () { fn(); }); S.root.appendChild(b); return b;
    }
    var bPause = mkBtn('mz-pause', 'pause', '暫停', function () { S.openPause(); });
    var bSpeak = mkBtn('mz-speak', 'speaker', '再聽一次', function () { if (G && G.rd && G.rd.item && !isMath) { S.say(G.rd.item); S.sfx('tap'); } });
    var bDpad = mkBtn('mz-dpadbtn', 'arrows', '方向鍵', function () { setDpad(!dpadOn, true); });
    var bHint = hasHint ? mkBtn('mz-hint', 'sparkle', '提示', function () { useHint(); }) : null;
    if (isMath) bSpeak.style.display = 'none';
    var dpad = document.createElement('div'); dpad.className = 'mz-dpad';
    var ARW = ['M6 15l6-6 6 6', 'M9 6l6 6-6 6', 'M6 9l6 6 6-6', 'M15 6l-6 6 6 6'], DPOS = [[56, 0], [112, 60], [56, 60], [0, 60]], DLBL = ['上', '右', '下', '左'];
    DPOS.forEach(function (p, d) {
      var b = document.createElement('button'); b.type = 'button'; b.setAttribute('aria-label', DLBL[d]); b.style.left = p[0] + 'px'; b.style.top = p[1] + 'px';
      b.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="' + ARW[d] + '"/></svg>';
      S.on(b, 'pointerdown', function (e) { e.preventDefault(); e.stopPropagation(); dpad.classList.add('hot'); setDir(d); }); S.on(b, 'pointerup', function () { dpad.classList.remove('hot'); }); S.on(b, 'contextmenu', function (e) { e.preventDefault(); });
      dpad.appendChild(b);
    });
    S.root.appendChild(dpad);
    function setDpad(v, save) { dpadOn = !!v; dpad.classList.toggle('on', dpadOn); bDpad.classList.toggle('mz-on', dpadOn); if (save) { try { localStorage.setItem('wq37-mz-dpad', v ? '1' : '0'); } catch (e) { /* */ } } }

    /* ---------------- layout ---------------- */
    function computeLayout(W, H) {
      var land = W > H * 1.1, cols = land ? 11 : 9, rows = land ? 9 : 11, o = { W: W, H: H, land: land, cols: cols, rows: rows }, cell, mw, mh;
      if (!land) {
        var strip = 50, qh = Math.max(66, Math.min(84, Math.round(H * .115))), bot = 52, avail = H - strip - qh - bot - 20;
        cell = Math.max(18, Math.floor(Math.min((W - 14) / cols, avail / rows, 72))); mw = cell * cols; mh = cell * rows; o.cell = cell; o.mx = Math.round((W - mw) / 2); o.my = strip + qh + 14;
        o.strip = strip; o.q = { x: 8, y: strip + 2, w: W - 16, h: qh - 4 };
        o.slots = { x: 8 + (hasHint ? 50 : 0), y: o.my + mh + 4, w: W - 16 - (hasHint ? 50 : 0), h: bot - 4 };
        o.ui = clamp(cell / 50, 1, 1.5); o.uh = 1; o.pause = [6, 1]; o.dpadBtn = [54, 1]; o.speak = [W - 8 - 44, strip + 2 + (qh - 4 - 44) / 2]; o.hint = hasHint ? [6, o.my + mh + 6] : null;
        o.timer = { x: 8, y: strip + qh + 1, w: W - 16, h: 9 }; o.heartsR = W - 6; o.heartsY = 18; o.hw = 11; o.scoreX = 106; o.scoreY = 3;
        var free = H - (o.my + mh + 4 + bot); o.dpadRoom = free >= 124;
        o.dpad = o.dpadRoom ? [Math.round((W - 168) / 2), o.my + mh + bot + 2 + Math.max(0, Math.round((free - 124) / 2))] : [W - 176, o.my + mh - 120];
        o.mh = mh; o.mw = mw;
      } else {
        var side = 176; cell = Math.max(18, Math.floor(Math.min((H - 12) / rows, (W - 2 * side) / cols, 84))); mw = cell * cols; mh = cell * rows; o.cell = cell; o.mx = Math.round((W - mw) / 2); o.my = Math.round((H - mh) / 2);
        var lw = o.mx - 16, rx = o.mx + mw + 8, rw = W - rx - 8; o.mw = mw; o.mh = mh; o.ui = clamp(cell / 46, 1, 1.7); o.uh = o.ui;
        o.pause = [8, 8]; o.heartsX = 60; o.heartsY = 30; o.hw = clamp((lw - 62) / (HEARTS[0] * 2.1), 8, 14 * o.ui); o.scoreX = 8; o.scoreY = 62; o.q = { x: 8, y: Math.round(62 + 44 * o.ui), w: lw, h: H - Math.round(62 + 44 * o.ui) - 8 };
        o.dpadBtn = [W - 52, 8]; o.timer = { x: rx, y: 56, w: rw, h: Math.max(10, Math.round(8 * o.ui)) }; o.slots = { x: rx, y: 74, w: rw, h: Math.round(88 * o.ui) }; o.hint = hasHint ? [rx, 74 + Math.round(88 * o.ui) + 6] : null;
        o.speak = [8 + (lw - 44) / 2, H - 8 - 52]; o.dpadRoom = true; o.dpad = [Math.round(rx + (rw - 168) / 2), H - 124];
      }
      return o;
    }
    function place(el, xy) { if (!el || !xy) return; el.style.left = Math.round(xy[0]) + 'px'; el.style.top = Math.round(xy[1]) + 'px'; }
    function onResize(w, h) {
      if (!G) return; var oldLand = L && L.land; L = computeLayout(w, h); G.baseNeed = true; G.layN++;
      place(bPause, L.pause); place(bDpad, L.dpadBtn); place(bHint, L.hint); place(dpad, L.dpad); place(bSpeak, L.speak);
      if (dpadPref == null) setDpad(isTouchDev && L.dpadRoom); else setDpad(dpadPref === '1');
      if (L.land !== oldLand && oldLand != null && G.M) rebuildWorld();
    }

    /* ---------------- world ---------------- */
    function buildMaze() {
      var seed = ((lv.w | 0) * 131 + (lv.s | 0) * 17 + 7 + (L.land ? 0 : 1000)) >>> 0;
      G.land = L.land; G.cols = L.cols; G.rows = L.rows; G.M = genMaze(L.cols, L.rows, seed); G.home = (L.rows >> 1) * L.cols + (L.cols >> 1); G.spawn = (L.rows - 1) * L.cols + (L.cols >> 1);
      G.homeDist = G.M.bfs(G.home);
    }
    function cellsBy(fn) { var out = []; for (var c = 0; c < G.M.N; c++) if (fn(c)) out.push(c); return out; }
    function occupied(c) { return G.tileAt[c] || c === G.home || c === G.spawn || G.portals.some(function (p) { return p.c === c; }) || G.orbs.some(function (o) { return o.c === c; }) || G.gems.some(function (g) { return g.c === c; }); }
    function manh(a, b) { var cl = G.cols; return Math.abs(a % cl - b % cl) + Math.abs(((a / cl) | 0) - ((b / cl) | 0)); }
    /* a tile may only go where the other tiles never wall the child in: all non-tile cells stay connected and every tile keeps a free neighbour,
       so every target can always be reached without stepping on another tile (no forced wrong eats) */
    function tileOk(c, tiles) {
      var M = G.M, N = M.N, bl = new Uint8Array(N), i, d, nb = 0, all = [c];
      for (i = 0; i < tiles.length; i++) { bl[tiles[i].c] = 1; all.push(tiles[i].c); } bl[c] = 1;
      for (i = 0; i < G.portals.length; i++) if (!bl[G.portals[i].c]) bl[G.portals[i].c] = 2;      /* portals are never part of a needed route either */
      for (i = 0; i < all.length; i++) { var free = false; for (d = 0; d < 4; d++) if (M.open[all[i] * 4 + d] && !bl[M.nb(all[i], d)]) free = true; if (!free) return false; }
      var total = 0, st = -1; for (i = 0; i < N; i++) if (!bl[i]) { total++; if (st < 0) st = i; }
      if (G.player && !bl[G.player.b]) st = G.player.b;
      var seen = new Uint8Array(N), q = [st], n = 1; seen[st] = 1;
      while (q.length) { var cu = q.pop(); for (d = 0; d < 4; d++) if (M.open[cu * 4 + d]) { var x = M.nb(cu, d); if (!bl[x] && !seen[x]) { seen[x] = 1; n++; q.push(x); } } }
      return n === total;
    }
    function pickFree(minPlayer, existing, mode) {                  /* mode 'strict' = tile rule must hold (null when impossible), 'prefer' = fall back to any free cell */
      var cand = cellsBy(function (c) { return !occupied(c) && G.M.bfs(G.player.b)[c] >= minPlayer; }); if (!cand.length) cand = cellsBy(function (c) { return !occupied(c); }); if (!cand.length) return -1;
      var best = -1, bs = -1, k, okN = 0;
      if (mode) { cand = GX.shuffle(cand, rnd); var good = []; for (k = 0; k < cand.length && good.length < 12; k++) if (tileOk(cand[k], existing)) good.push(cand[k]); if (!good.length) { if (mode === 'strict') return -1; } else cand = good; }
      for (k = 0; k < 14; k++) {
        var c = cand[(rnd() * cand.length) | 0], md = 99; for (var j = 0; j < existing.length; j++) md = Math.min(md, manh(c, existing[j].c));
        if (md > bs) { bs = md; best = c; }
      }
      return best;
    }
    function setupSpecials() {
      var cl = G.cols, rw = G.rows, corners = [0, cl - 1, (rw - 1) * cl, rw * cl - 1].filter(function (c) { return c !== G.spawn; });
      corners = GX.shuffle(corners, rnd); G.orbs = []; var no = boss ? 3 : 2;
      for (var i = 0; i < no; i++) G.orbs.push({ c: corners[i % corners.length], alive: true, respawn: 0 });
      /* portal pair: mid-edge cells far apart over the maze */
      var P1 = (rw >> 1) * cl + 0, P2 = (rw >> 1) * cl + (cl - 1);
      if (G.land === false) { P1 = (rw >> 2) * cl; P2 = (rw - 1 - (rw >> 2)) * cl + (cl - 1); }
      if (G.M.bfs(P1)[P2] < 6) { P2 = (rw - 1) * cl + (cl >> 1) - 2; }
      G.portals = [{ c: P1, to: 1 }, { c: P2, to: 0 }]; G.portalCd = 0;
    }
    function rebuildWorld() {                                                   /* orientation flipped: new maze, same round progress */
      buildMaze(); setupSpecials(); G.gems = []; var P = G.player; P.a = P.b = G.spawn; P.p = 0; P.dir = -1; G.want = -1; updPos(P);
      G.ghosts.forEach(function (g, i) { toHome(g, 1.2 + i * 1.2); }); G.tiles = []; G.tileAt = new Array(G.M.N); G.respawn = []; if (G.rd) placeTiles(true); G.baseNeed = true;
    }

    function newGame() {
      if (firstGame) firstGame = false; else S.newLearn();
      S.ended = false; S.result = null; S.ui.closeAll(); if (G && G.idleOv && G.idleOv.parentNode) G.idleOv.parentNode.removeChild(G.idleOv); S.paused = false;
      var hearts = HEARTS[diff - 1];
      G = { phase: 'idle', simT: 0, playT: 0, hold: false, hearts: hearts, maxHearts: hearts, score: 0, combo: 0, maxCombo: 0, mainDone: 0, condAfter: 0, condPlayed: 0, condClean: 0, hits: 0, wrongEats: 0,
        player: { a: 0, b: 0, p: 0, dir: -1, x: 0, y: 0 }, want: -1, wantT: 0, inv: 0, boost: 0, fright: 0, freeze: 0, chain: 0, wave: 'chase', waveT: 12, evT: 14, gap: null, warnT: 0, q: [], tiles: [], respawn: [], gems: [], orbs: [], portals: [], portalCd: 0, ghosts: [], rd: null, baseNeed: true, rdN: 0, layN: 0, idleT: 0, near: 99, hudSig: '', ghostsOff: false, flash: 0, hintBlink: 0, turned: false, stepN: 0, vig: 0, bossOrbT: 0, bgOk: false, trP: [], trG: [], flyers: [], tickT: 99 };
      rnd = GX.rng(((lv.w | 0) * 977 + (lv.s | 0) * 31 + diff * 7 + 11) >>> 0);
      G.tileAt = [];
      if (L) {
        buildMaze(); G.tileAt = new Array(G.M.N); setupSpecials(); var P = G.player; P.a = P.b = G.spawn; updPos(P); makeGhosts();
      }
    }
    function makeGhosts() {
      var types = ['chase', 'ambush', 'patrol', 'ambush'], n = Math.min(4, 2 + (diff >= 3 ? 1 : 0) + ((lv.s | 0) >= 4 ? 1 : 0) + (diff >= 5 ? 1 : 0)), cl = G.cols, rw = G.rows, i;
      var corners = [cl - 1, 0, rw * cl - 1, (rw - 1) * cl], wpq = [(rw >> 2) * cl + (cl >> 2), (rw >> 2) * cl + (cl - 1 - (cl >> 2)), (rw - 1 - (rw >> 2)) * cl + (cl - 1 - (cl >> 2)), (rw - 1 - (rw >> 2)) * cl + (cl >> 2)];
      G.ghosts = [];
      for (i = 0; i < n; i++) {
        var g = { idx: i, type: types[i], a: G.home, b: G.home, p: 0, dir: -1, prev: -1, x: 0, y: 0, mode: 'home', delay: (1.5 + i * 2.4) * (1.25 - .1 * diff), scared: false, stun: 0, boss: false, corner: corners[i], wp: [], wpi: 0, img: A('mz_ghost_' + (i + 1) + '.webp'), col: GHOST_COL[i] };
        for (var k = 0; k < 4; k++) g.wp.push(wpq[(k + i) % 4]);
        updPos(g); G.ghosts.push(g);
      }
      if (boss) {
        var bg = { idx: 4, type: 'chase', a: G.home, b: G.home, p: 0, dir: -1, prev: -1, x: 0, y: 0, mode: 'home', delay: 5, scared: false, stun: 0, boss: true, orbs: 0, corner: G.spawn, wp: [], wpi: 0, img: A('mz_ghost_4.webp'), col: '#c06bff' };
        updPos(bg); G.ghosts.push(bg); G.bossG = bg;
      }
    }
    function toHome(g, delay) { g.a = g.b = G.home; g.p = 0; g.mode = 'home'; g.delay = delay; g.scared = false; g.prev = -1; g.dir = -1; updPos(g); }
    function updPos(e) { var cl = G.cols, ax = e.a % cl, ay = (e.a / cl) | 0, bx = e.b % cl, by = (e.b / cl) | 0; e.x = ax + (bx - ax) * e.p; e.y = ay + (by - ay) * e.p; }

    /* ---------------- rounds ---------------- */
    function limitFor(len) { return BASE_T[diff - 1] + 3 * len + (lv.s === 9 ? 6 : 0); }
    function seqOf(it) {
      var raw = isMath ? GX.norm(it.a) : String(it.en), disp = [], seq = [];
      for (var i = 0; i < raw.length; i++) { var chh = raw[i], isTile = isMath ? true : /[\p{L}\p{N}]/u.test(chh); if (isTile) { seq.push(isMath ? chh : chh.toLowerCase()); disp.push({ ch: chh, fixed: false, filled: false }); } else disp.push({ ch: chh, fixed: true, filled: true }); }
      return { seq: seq, disp: disp };
    }
    function distractors(seq, it) {
      var out = [], nD = isMath ? NDIS_M[diff - 1] : NDIS[diff - 1], near = diff >= 4 ? (diff === 4 ? 2 : 3) : 0, i, used = {};
      seq.forEach(function (c) { used[c] = 1; });
      if (!isMath) {
        var pool = []; seq.forEach(function (c) { (CONF[c] || '').split('').forEach(function (x) { pool.push(x); }); }); pool = GX.shuffle(pool, rnd);
        var nearN = pool.length ? (diff >= 5 ? near : Math.min(near, pool.length)) : 0;
        for (i = 0; i < nearN; i++) out.push(pool[i % pool.length]);
        var look = {}; seq.forEach(function (c) { (CONF[c] || '').split('').forEach(function (x) { look[x] = 1; }); });
        var rest = GX.shuffle(ALPHA.split('').filter(function (c) { return !used[c] && out.indexOf(c) < 0 && (near > 0 || !look[c]); }), rnd);
        while (out.length < nD && rest.length) out.push(rest.pop());
      } else {
        var dg = []; seq.forEach(function (c) { if (/\d/.test(c)) { var v = +c; dg.push(String((v + 1) % 10)); dg.push(String((v + 9) % 10)); } }); dg = GX.shuffle(dg, rnd);
        for (i = 0; i < near && dg.length; i++) out.push(dg.pop());
        if (it.pad === 'frac' && diff >= 3) { ['.', '/'].forEach(function (c) { if (!used[c] && out.length < nD - 1) out.push(c); }); }
        var rd2 = GX.shuffle('0123456789'.split('').filter(function (c) { return !used[c] && out.indexOf(c) < 0; }), rnd);
        while (out.length < nD && rd2.length) out.push(rd2.pop());
        while (out.length < nD) out.push(String((rnd() * 10) | 0));
      }
      return out;
    }
    function startWord(it) {
      var so = seqOf(it), rd = G.rd = { kind: 'word', item: it, seq: so.seq, disp: so.disp, i: 0, failed: false, hinted: false, t0: G.simT, limit: limitFor(so.seq.length), left: 0, hintT: 0, think: false, assisted: false, lastProg: 0, stallT: 0, inputN: 0, qText: isMath ? it.q : it.zh };
      rd.left = rd.limit; beginRound(); if (!isMath) S.later(function () { if (G && G.rd === rd && !S.paused) S.say(it); }, 350);
    }
    function startCond() {
      var cd = cond(lv.w | 0, lv.s | 0, rnd), seq = cd.tiles;
      var rd = G.rd = { kind: 'cond', cd: cd, seq: [], disp: [], i: 0, eaten: 0, need: cd.need, failed: false, t0: G.simT, limit: Math.max(26, 50 - diff * 4), left: 0, hintT: 0, qText: cd.q, item: null };
      rd.left = rd.limit; G.condPlayed++; beginRound(); S.ui.banner('條件吃！', cd.q, 1500); S.sfx('power');
    }
    function beginRound() {
      var rd = G.rd; rd.lastProg = G.simT + .8; G.phase = 'ready'; G.readyT = .8;
      if (!G.anyRound || (lv.w === 0 && (lv.s | 0) <= 2)) G.calmT = 12; G.anyRound = true; if (G.helpGlow && rd.kind === 'word') { rd.autoHelp = true; assist(rd); } G.tiles = []; G.tileAt = new Array(G.M.N); G.respawn = []; G.gems = []; rd.firstWrong = true;
      placeTiles(false); for (var k = 0; k < 2; k++) { var c = pickFree(2, G.gems); if (c >= 0) G.gems.push({ c: c, born: G.simT }); }
      G.baseNeed = true; G.rdN++; if (bHint) bHint.disabled = false; S.sfx('flip');
    }
    function placeTiles(keepProgress) {
      var rd = G.rd, list = [];
      if (rd.kind === 'word') {
        var need = rd.seq.slice(keepProgress ? rd.i : 0); need.forEach(function (c) { list.push({ ch: c, key: c, tgt: true }); });
        distractors(rd.seq, rd.item).forEach(function (c) { list.push({ ch: c, key: c, tgt: false }); });
      } else {
        rd.cd.tiles.filter(function (t) { return !(keepProgress && t.eaten); }).forEach(function (t) { list.push({ ch: t.text, key: t.text, tgt: t.tgt, why: t.why, ref: t }); });
      }
      list = GX.shuffle(list, rnd).sort(function (a, b) { return (b.tgt ? 1 : 0) - (a.tgt ? 1 : 0); });
      list.forEach(function (t) { var c = pickFree(3, G.tiles, t.tgt ? 'prefer' : 'strict'); if (c < 0) return; t.c = c; t.born = G.simT; G.tiles.push(t); G.tileAt[c] = t; tileLabel(t, L.cell); });
      if (rd.disp) rd.disp.forEach(function (d) { GX.label(d.ch, { size: Math.round(slotSize() * .66), weight: 900, fam: GX.EFONT, color: d.fixed ? '#c3cbf7' : '#fff', dpr: S.dpr }); });
    }
    function nextRound() {
      if (S.ended || S.dead) return;
      if (isMath && G.mainDone > 0 && G.mainDone % 3 === 0 && G.condAfter !== G.mainDone && !S.learn.done()) { G.condAfter = G.mainDone; startCond(); return; }
      var it = S.learn.take(); if (!it) { win(); return; } startWord(it);
    }
    function failWord(lapse) {                                                    /* first mistake in a word round = "not first try" (item will come back) */
      var rd = G.rd; if (!rd || rd.kind !== 'word' || rd.failed) return; rd.failed = true; S.learn.answer(rd.item, false, (G.simT - rd.t0) * 1000, lapse);
    }
    function assist(rd) {                                                         /* a hint was used: this word can no longer count as a first-try hit (but still completes normally) */
      if (!rd || rd.kind !== 'word' || rd.assisted) return; rd.assisted = true; rd.hinted = true; S.learn.assisted(rd.item);
    }
    function roundFail(typed, lapse) {                                                   /* stop the world, show the learn card (>= 2 s), then go on with the next item */
      var rd = G.rd; if (!rd.failed) failWord(lapse); G.combo = 0; G.phase = 'card'; G.hold = true; G.tiles = []; G.tileAt = new Array(G.M.N); G.respawn = []; G.gems = [];
      S.ui.learn(rd.item, { typed: typed || '', onDone: function () { G.hold = false; nextRound(); } });
    }
    function wrongEat(t, c) {
      var x = px(c % G.cols + .5), y = py(((c / G.cols) | 0) + .5), rd = G.rd;
      G.combo = 0; G.wrongEats++; G.boost = BOOST; S.sfx('bad'); S.sfx('keybad'); S.fx.burst(x, y, { colors: ['#ff6b81', '#ff9fb0', '#fff'], n: 14, speed: 160 }); S.fx.ring(x, y, { color: '#ff6b81', r1: L.cell * .8 }); S.fx.shake(3, .2);
      if (G.bossG) G.bossG.orbs = 0;
      if (rd.kind === 'word') {
        var pre = rd.disp.map(function (d) { return d.filled ? d.ch : ''; }).join(''); G.phase = 'card';
        roundFail(pre + t.ch); return;
      }
      S.fx.text(x, y - L.cell * .4, t.why ? '✗ ' + t.why : '✗ 不符合', { color: '#ff9fb0', size: Math.max(14, Math.round(L.cell * .4)), life: 1.1 });
      rd.failed = true; G.respawn.push({ at: G.simT + 1.2, t: t });
    }
    function eatTile(t) {
      var rd = G.rd, c = t.c, x = px(c % G.cols + .5), y = py(((c / G.cols) | 0) + .5);
      G.tileAt[c] = null; G.tiles.splice(G.tiles.indexOf(t), 1);
      if (rd.kind === 'word') {
        if (t.key === rd.seq[rd.i]) {
          var slot = rd.disp.filter(function (d) { return !d.fixed; })[rd.i]; slot.filled = true; slot.ch = isMath ? t.ch : slot.ch; rd.i++; rd.lastProg = G.simT; rd.think = false; rd.stallT = 0;
          G.combo++; if (G.combo > G.maxCombo) G.maxCombo = G.combo; var mul = Math.min(4, 1 + Math.floor(G.combo / 4)); G.score += 10 * mul;
          flyLetter(t, rd, slot); S.sfx('eat', { i: rd.i - 1 }); S.sfx('key', { i: rd.i - 1 }); S.fx.burst(x, y, { colors: ['#ffc94a', '#fff', '#3ee6d0'], n: 14, speed: 150, shape: 'star' }); S.fx.ring(x, y, { r1: L.cell * .9 });
          S.fx.text(x, y - L.cell * .35, '+' + 10 * mul, { color: '#ffe9a8', size: Math.max(14, Math.round(L.cell * .38)), life: .8 });
          if (G.combo >= 4 && G.combo % 4 === 0) { S.sfx('combo', { n: G.combo / 4 }); S.fx.text(x, y - L.cell * .9, '×' + mul + ' 連擊', { color: '#ff9f43', size: Math.max(16, Math.round(L.cell * .46)), life: 1 }); }
          if (rd.i >= rd.seq.length) completeWord();
        } else wrongEat(t, c);
      } else {
        if (t.tgt) {
          rd.eaten++; t.ref.eaten = true; G.combo++; if (G.combo > G.maxCombo) G.maxCombo = G.combo; var m2 = Math.min(4, 1 + Math.floor(G.combo / 4)); G.score += 15 * m2;
          S.sfx('eat', { i: rd.eaten }); S.sfx('key', { i: rd.eaten }); S.fx.burst(x, y, { colors: ['#3ee6a0', '#fff', '#ffc94a'], n: 14, speed: 150, shape: 'star' }); S.fx.ring(x, y, { color: '#3ee6a0', r1: L.cell * .9 });
          S.fx.text(x, y - L.cell * .35, '+' + 15 * m2, { color: '#b8ffe0', size: Math.max(14, Math.round(L.cell * .38)), life: .8 });
          if (rd.eaten >= rd.need) completeCond();
        } else wrongEat(t, c);
      }
    }
    function completeWord() {
      var rd = G.rd, it = rd.item, ms = (G.simT - rd.t0) * 1000; G.phase = 'done'; G.score += 50 + Math.max(0, Math.round(rd.left)); G.mainDone++;
      G.toStreak = 0; G.awayStreak = 0; G.helpGlow = false; S.learn.answer(it, true, ms); S.ui.ok(it, { top: L.my + 6 }); S.sfx('good'); if (!isMath) S.say(it);
      var cx = px(G.cols / 2), cy = py(G.rows / 2); S.fx.burst(cx, cy, { n: 40, speed: 260, shape: 'star', colors: ['#ffc94a', '#fff', '#3ee6d0', '#ff5fa2'], life: .9 }); S.fx.confetti(S.W, { n: 26 });
      G.tiles.forEach(function (t) { S.fx.burst(px(t.c % G.cols + .5), py(((t.c / G.cols) | 0) + .5), { n: 4, speed: 80 }); }); G.tiles = []; G.tileAt = new Array(G.M.N); G.respawn = []; G.gems = [];
      later(1.05, nextRound);
    }
    function completeCond() {
      var rd = G.rd; G.phase = 'done'; G.score += 80; if (!rd.failed) G.condClean++; S.sfx('great'); S.fx.confetti(S.W, { n: 40 }); S.ui.banner('全中！', rd.cd.explain, 1500);
      G.tiles = []; G.tileAt = new Array(G.M.N); G.respawn = []; G.gems = []; later(1.4, nextRound);
    }
    function timeout() {
      var rd = G.rd; if (!rd) return; S.sfx('lose'); S.fx.flash('#ff6b81', .25);
      if (rd.kind === 'word') {
        var typed = rd.disp.map(function (d) { return d.filled ? d.ch : ''; }).join('');
        var away = (rd.inputN | 0) === 0; G.toStreak = (G.toStreak | 0) + 1; G.awayStreak = away ? (G.awayStreak | 0) + 1 : 0;
        if (away) S.learn.note('lapse', rd.item, { typed: false });
        if (G.awayStreak >= 2) { G.tiles = []; G.tileAt = new Array(G.M.N); G.respawn = []; G.gems = []; G.phase = 'card'; G.hold = true; if (S.gate(rd.item, function () { G.hold = false; G.awayStreak = 1; G.toStreak = 0; nextRound(); })) return; G.hold = false; }
        if (G.awayStreak >= 2 || G.toStreak >= 4) { awayEnd(); return; }
        if (away) { G.combo = 0; G.phase = 'reveal'; G.tiles = []; G.tileAt = new Array(G.M.N); G.respawn = []; G.gems = []; S.ui.banner('還在嗎？', '這個字先跳過', 1400); later(1.5, nextRound); return; }
        if (G.toStreak >= 3 && !G.helpGlow) { G.helpGlow = true; S.ui.banner('慢慢來', '接下來每個字會亮燈幫你', 2200); }
        roundFail(typed && typed.length < String(isMath ? rd.item.a : rd.item.en).length ? typed : '', 'typed');
      } else {
        G.phase = 'reveal'; G.combo = 0; S.ui.banner('時間到', '金光的才對', 1700);
        G.tiles.forEach(function (t) { t.reveal = t.tgt; }); later(2.2, function () { G.tiles = []; G.tileAt = new Array(G.M.N); G.respawn = []; nextRound(); });
      }
    }
    function win() {                                                              /* exit show: the portals flare, rings sweep the maze, then the result card */
      G.phase = 'end'; G.portals.forEach(function (p, i) { var x = px(p.c % G.cols + .5), y = py(((p.c / G.cols) | 0) + .5); S.sfx('portal'); S.fx.burst(x, y, { n: 26, colors: ['#8e6bff', '#3ee6d0', '#fff', '#ffc94a'], speed: 220, shape: 'star' }); for (var k = 0; k < 3; k++) S.fx.ring(x, y, { color: k % 2 ? '#3ee6d0' : '#8e6bff', r1: L.cell * (2.2 + k * 1.4), life: .5 + k * .15 }); });
      G.exitT = S.t; var rs = S.finish({ cleared: true, score: Math.round(G.score), maxCombo: G.maxCombo, seconds: G.playT }); G.result = rs; return rs;
    }
    function later(sec, fn) { G.q.push({ t: G.simT + sec, fn: fn }); }
    function useHint() {
      if (!G || G.hold || S.paused || S.ended || !G.rd || G.phase !== 'play' || !hasHint) return;
      touchInput(); G.rd.hintT = 4; assist(G.rd); S.sfx('power'); S.fx.text(S.W / 2, L.my + 20, '提示：這個字不計首次答對', { color: '#ffe9a8', size: 16, life: 1.4 });
    }
    /* glow rules: only the FIRST letter of a word glows (English, difficulty 1-2); anything later needs the hint button or 12 s without progress (both cancel the first-try credit) */
    function isHot(t) {
      var rd = G.rd; if (!rd) return false; if (t.reveal) return true;
      if (rd.kind === 'cond') return rd.hintT > 0 && t.tgt;
      if (t.key !== rd.seq[rd.i]) return false;
      return rd.hintT > 0 || rd.autoHelp || (rd.i === 0 && diff <= 2 && !isMath);
    }
    /* ---------------- idle ("still there?") ---------------- */
    function showIdle() {
      if (G.idleOv || S.paused || S.ended) return; var el = document.createElement('div'); el.className = 'gx-ov'; el.setAttribute('role', 'dialog'); G.idleAt = performance.now();
      el.innerHTML = '<div class="gx-card" style="max-width:300px"><h1>還在嗎？</h1><div class="gx-sub">按任何一個鍵或點一下，繼續玩</div><div class="gx-row"><button type="button" class="gx-btn" data-r="back">繼續</button></div></div>';
      S.root.appendChild(el); G.idleOv = el; S.paused = true; S.on(el, 'pointerup', function () { if (performance.now() - G.idleAt > 380) closeIdle(); });
      G.idleMusic = S.later(function () { if (G && G.idleOv) { S.audio.stopMusic(); G.idleQuiet = true; } }, 45000);
    }
    function closeIdle() {
      if (!G || !G.idleOv) return; if (performance.now() - G.idleAt < 380) return; var el = G.idleOv; G.idleOv = null; if (el.parentNode) el.parentNode.removeChild(el); S.clearLater(G.idleMusic);
      S.paused = false; G.idleT = 0; if (G.idleQuiet) { G.idleQuiet = false; S.audio.music(boss ? 'boss' : (diff >= 4 ? 'drive' : 'calm')); }
    }
    function awayEnd() {                                                         /* the child has gone away: stop politely, no wrong-answer records, 1 star, not passed */
      G.phase = 'end'; S.ui.banner('先休息一下', '之後再試！', 2200); G.result = S.finish({ cleared: false, score: Math.round(G.score), maxCombo: G.maxCombo, seconds: G.playT });
    }

    /* ---------------- movement ---------------- */
    function px(cx) { return L.mx + cx * L.cell; }
    function py(cy) { return L.my + cy * L.cell; }
    function moveEnt(e, dt, speed, choose, arrive) {
      var rem = speed * dt, guard = 0;
      while (rem > 1e-6 && guard++ < 10) {
        if (e.a === e.b) { var nd = choose(e); if (nd < 0) { e.p = 0; break; } e.dir = nd; e.b = G.M.nb(e.a, nd); e.p = 0; }
        var need = 1 - e.p;
        if (rem >= need) { rem -= need; e.prev = e.a; e.a = e.b; e.p = 0; arrive(e); } else { e.p += rem; rem = 0; }
      }
      updPos(e);
    }
    function pChoose(e) {
      var M = G.M, c = e.a;
      if (G.want >= 0 && G.simT - G.wantT < 1.2 && M.open[c * 4 + G.want]) { var d = G.want; G.want = -1; if (e.dir >= 0 && d !== e.dir) G.turned = true; return d; }
      if (e.dir >= 0 && M.open[c * 4 + e.dir]) return e.dir; return -1;
    }
    function pArrive(e) {
      var c = e.a, t = G.tileAt[c], x = px(c % G.cols + .5), y = py(((c / G.cols) | 0) + .5);
      S.sfx('step'); if (G.turned) { G.turned = false; S.fx.shake(1.4, .07); }
      if ((G.stepN++ & 1) === 0) S.fx.trail(x, y + L.cell * .25, 'rgba(255,255,255,.7)', 2.5);
      var gi, gm; for (gi = 0; gi < G.gems.length; gi++) if (G.gems[gi].c === c) { gm = G.gems.splice(gi, 1)[0]; G.score += 50; S.sfx('coin'); S.fx.burst(x, y, { n: 12, colors: ['#8be9ff', '#fff', '#c9a8ff'], speed: 130, shape: 'star' }); S.fx.text(x, y - L.cell * .3, '+50', { color: '#8be9ff', size: Math.max(14, L.cell * .36), life: .8 }); break; }
      for (gi = 0; gi < G.orbs.length; gi++) if (G.orbs[gi].c === c && G.orbs[gi].alive) eatOrb(G.orbs[gi], x, y);
      if (G.portalCd <= 0) for (gi = 0; gi < 2; gi++) if (G.portals[gi].c === c) {
        var dest = G.portals[G.portals[gi].to].c; S.sfx('portal'); S.fx.burst(x, y, { n: 18, colors: ['#8e6bff', '#3ee6d0', '#fff'], speed: 160 }); S.fx.ring(x, y, { color: '#8e6bff', r1: L.cell });
        e.a = e.b = dest; e.p = 0; e.prev = -1; G.portalCd = 5; updPos(e); var dx2 = px(dest % G.cols + .5), dy2 = py(((dest / G.cols) | 0) + .5); S.fx.burst(dx2, dy2, { n: 18, colors: ['#3ee6d0', '#8e6bff', '#fff'], speed: 160 }); S.fx.ring(dx2, dy2, { color: '#3ee6d0', r1: L.cell }); break;
      }
      if (t && G.rd && (G.phase === 'play')) eatTile(t);
    }
    function eatOrb(o, x, y) {
      o.alive = false; o.respawn = boss ? 9 : 24; S.sfx('power'); S.fx.burst(x, y, { n: 26, colors: ['#8be9ff', '#6c8bff', '#fff'], speed: 200, shape: 'star' }); S.fx.ring(x, y, { color: '#8be9ff', r1: L.cell * 1.6 }); S.fx.flash('#6c8bff', .18);
      G.fright = FRIGHT; G.chain = 0; G.ghosts.forEach(function (g) { if (!g.boss && g.mode !== 'home') g.scared = true; });
      var bg = G.bossG; if (bg) { bg.orbs++; G.bossOrbT = 20; S.fx.text(x, y - L.cell * .6, '墨水 ' + bg.orbs + '/3', { color: '#8be9ff', size: 18, life: 1 }); if (bg.orbs >= 3) { bg.orbs = 0; bg.stun = 8; bg.mode = bg.mode === 'home' ? 'leave' : bg.mode; S.sfx('zap'); S.ui.banner('大魔王暈了！', '快去追！', 1200); S.fx.shake(5, .3); } }
    }
    function eatGhost(g) {
      var x = px(g.x + .5), y = py(g.y + .5), pts = 200 * Math.pow(2, Math.min(3, G.chain++)); G.score += pts; S.sfx('zap'); S.sfx('coin'); S.fx.burst(x, y, { n: 30, colors: ['#8be9ff', '#fff', g.col], speed: 220, shape: 'star' }); S.fx.text(x, y - L.cell * .5, '+' + pts, { color: '#8be9ff', size: Math.max(16, L.cell * .5), life: 1 }); S.fx.shake(2.5, .15);
      toHome(g, 3);
    }
    function hitPlayer() {
      G.hearts--; G.hits++; G.inv = INV; G.boost = 0; var P = G.player, x = px(P.x + .5), y = py(P.y + .5);
      S.sfx('hit'); S.sfx('ghost'); S.fx.burst(x, y, { n: 24, colors: ['#ff6b81', '#fff', '#ffc94a'], speed: 220 }); S.fx.flash('#ff6b81', .35); S.fx.shake(6, .35); S.fx.text(x, y - L.cell * .6, '哎呀！', { color: '#ff9fb0', size: 22, life: 1 });
      if (G.bossG) G.bossG.orbs = 0;
      P.a = P.b = G.spawn; P.p = 0; P.dir = -1; G.want = -1; updPos(P); G.ghosts.forEach(function (g, i) { toHome(g, 1.2 + i * 1.1 + (g.boss ? 3 : 0)); }); G.fright = 0;
      if (G.hearts <= 0) {                                                     /* never ends the level: a short rest, hearts back, learning result untouched */
        G.hearts = Math.min(G.maxHearts, diff <= 2 ? 3 : 2); G.rests = (G.rests | 0) + 1; G.combo = 0; G.inv = INV + 1.5;
        S.sfx('heal'); S.ui.banner('休息一下', '補回愛心，繼續加油！', 1600); S.fx.burst(S.W / 2, S.H / 2, { n: 30, colors: ['#ff9fb0', '#fff', '#ffc94a'], shape: 'star', speed: 200 });
      }
    }

    /* ghost AI: chase = player cell; ambush = a few cells ahead of the player; patrol = walks its waypoints and only bites when you are near */
    function ahead(pc, dir, k) { var c = pc; if (dir < 0) return c; for (var i = 0; i < k; i++) { if (!G.M.open[c * 4 + dir]) break; c = G.M.nb(c, dir); } return c; }
    function aiTarget(g, peek) {
      var P = G.player, pc = P.a === P.b ? P.a : P.b;
      if (g.mode === 'leave') return pc;
      if (G.wave === 'scatter' && g.type !== 'patrol' && !g.boss) return g.corner;
      if (g.type === 'ambush') return ahead(pc, P.dir, 4);
      if (g.type === 'patrol') { if (G.M.bfs(g.a)[pc] <= 3) return pc; if (g.a === g.wp[g.wpi] && !peek) g.wpi = (g.wpi + 1) % g.wp.length; return g.wp[g.wpi]; }
      return pc;
    }
    function gChoose(g) {
      var M = G.M, c = g.a, ds = [], d, k;
      for (d = 0; d < 4; d++) if (M.open[c * 4 + d]) ds.push(d);
      if (!ds.length) return -1;
      var cand = ds.filter(function (dd) { return M.nb(c, dd) !== g.prev; }); if (!cand.length) cand = ds;
      var pc = G.player.a === G.player.b ? G.player.a : G.player.b, best = [], bv;
      if (g.scared) { var dp = M.bfs(pc); bv = -1; cand.forEach(function (dd) { var v = dp[M.nb(c, dd)]; if (v > bv) { bv = v; best = [dd]; } else if (v === bv) best.push(dd); }); return best[(rnd() * best.length) | 0]; }
      if (!g.boss && rnd() < ERR[diff - 1] && g.mode === 'active') return cand[(rnd() * cand.length) | 0];
      var tg = aiTarget(g), dt = M.bfs(tg); bv = 1e9;
      for (k = 0; k < cand.length; k++) { var v2 = dt[M.nb(c, cand[k])]; if (v2 < bv) { bv = v2; best = [cand[k]]; } else if (v2 === bv) best.push(cand[k]); }
      return best[(rnd() * best.length) | 0];
    }
    function gArrive(g) { if (g.mode === 'leave' && G.homeDist[g.a] >= 2) g.mode = 'active'; }
    function ghostSpeed(g) {
      var base = PSPEED * (diff <= 3 ? clamp(.45 + .03 * (diff - 1) + .008 * (lv.s | 0), .45, .6) : Math.min(.95, .62 + .05 * diff + .012 * (lv.s | 0))); if (g.boss) base *= .85; if (g.scared) base *= .6; if (g.stun > 0) base *= .25;
      if (G.boost > 0 && !g.scared) base *= 1.3; return base;
    }

    /* ---------------- events ---------------- */
    function pickEvent() {
      var kinds = ['gap', 'freeze']; var k = kinds[(rnd() * 2) | 0]; if (k === 'freeze' && !G.ghosts.some(function (g) { return g.mode === 'active'; })) k = 'gap';
      if (k === 'freeze') { G.freeze = 3; S.sfx('shield'); S.ui.banner('幽靈暫停！', '3 秒', 1000); G.ghosts.forEach(function (g) { S.fx.burst(px(g.x + .5), py(g.y + .5), { n: 10, colors: ['#bfe9ff', '#fff'], speed: 90 }); }); return; }
      var M = G.M, cand = [], c, d;
      for (c = 0; c < M.N; c++) for (d = 1; d <= 2; d++) { var n = M.nb(c, d); if (n >= 0 && !M.open[c * 4 + d] && M.bfs(c)[n] >= 5) cand.push([c, d, n]); }
      if (!cand.length) return; var e = cand[(rnd() * cand.length) | 0]; M.link(e[0], e[1]); M.touch(); G.gap = { c: e[0], d: e[1], n: e[2], left: 9 }; G.baseNeed = true; S.sfx('whoosh'); S.ui.banner('牆壁打開了！', '近路 9 秒', 1100);
    }
    function closeGap() {
      var g = G.gap; if (!g) return; var busy = [G.player].concat(G.ghosts).some(function (e) { return e.a !== e.b && ((e.a === g.c && e.b === g.n) || (e.a === g.n && e.b === g.c)); });
      if (busy) return; G.M.unlink(g.c, g.d); G.M.touch(); G.gap = null; G.baseNeed = true; S.sfx('tap');
    }

    /* ---------------- simulation ---------------- */
    function sim(h) {
      var i; G.simT += h;
      for (i = G.q.length - 1; i >= 0; i--) if (G.q[i].t <= G.simT) { var it = G.q.splice(i, 1)[0]; it.fn(); if (!G) return; }
      if (G.phase === 'ready') { G.readyT -= h; if (G.readyT <= 0) { G.phase = 'play'; G.countdown = false; } return; }
      if (G.phase !== 'play' && G.phase !== 'reveal' && G.phase !== 'done') return;
      if (G.phase === 'play') { G.playT += h; G.rd.left -= h; var tk = Math.ceil(G.rd.left); if (G.rd.left > 0 && G.rd.left <= 5 && tk !== G.tickT) { G.tickT = tk; S.sfx('tick'); } else if (G.rd.left > 5) G.tickT = 99; if (G.rd.hintT > 0) G.rd.hintT -= h; var r0 = G.rd; if (r0.kind === 'word' && diff <= 3 && !r0.think) {                       /* stall = standing still with no ghost within 4 cells (running away or exploring never counts) */
          if (G.player.a === G.player.b && (G.near == null || G.near > 4)) r0.stallT += h;
          if (r0.stallT >= STALL) { r0.think = true; assist(r0); G.arrowT = 0; S.sfx('power'); S.fx.text(S.W / 2, L.my + 20, '想一想…', { color: '#ffe9a8', size: 18, life: 1.4 }); }
        }
        G.idleT += h; if (G.idleT >= IDLE1 && !G.idleOv) showIdle(); if (G.phase !== 'play') return; }
      /* timers */
      if (G.inv > 0) G.inv -= h; if (G.boost > 0) G.boost -= h; if (G.freeze > 0) G.freeze -= h; if (G.portalCd > 0) G.portalCd -= h;
      if (G.fright > 0) { G.fright -= h; if (G.fright <= 0) { G.ghosts.forEach(function (g) { g.scared = false; }); G.chain = 0; } }
      G.orbs.forEach(function (o) { if (!o.alive) { o.respawn -= h; if (o.respawn <= 0) { o.alive = true; } } });
      if (G.bossG) { G.bossOrbT -= h; if (G.bossOrbT <= 0) G.bossG.orbs = 0; if (G.bossG.stun > 0) G.bossG.stun -= h; }
      if (G.phase === 'play') {
        G.waveT -= h; if (G.waveT <= 0) { G.wave = G.wave === 'chase' ? 'scatter' : 'chase'; G.waveT = G.wave === 'chase' ? 14 : Math.max(3, 9 - diff); }
        G.evT -= h; if (G.evT <= 0) { G.evT = 18 + ((rnd() * 12) | 0); pickEvent(); }
        if (G.gap) { G.gap.left -= h; if (G.gap.left <= 0) closeGap(); }
        for (i = G.respawn.length - 1; i >= 0; i--) if (G.respawn[i].at <= G.simT) {
          var t = G.respawn.splice(i, 1)[0].t, c = pickFree(3, G.tiles, 'prefer'); if (c >= 0) { t.c = c; t.born = G.simT; G.tiles.push(t); G.tileAt[c] = t; S.fx.burst(px(c % G.cols + .5), py(((c / G.cols) | 0) + .5), { n: 6, speed: 70, colors: ['#8e9bff', '#fff'] }); }
        }
        if (G.rd.left <= 0) { timeout(); return; }
      }
      /* player */
      var P = G.player; if (G.phase === 'play') moveEnt(P, h, PSPEED, pChoose, pArrive); if (G.phase !== 'play' || !G) return;
      /* ghosts */
      if (G.ghostsOff) return;
      if (G.calmT > 0) { G.calmT -= h; G.near = 99; G.vig = Math.max(0, G.vig - h * 2); return; }            /* novice calm: the ink sprites sleep for the first seconds */
      var near = 99; G.near = 99;
      G.ghosts.forEach(function (g) {
        if (g.mode === 'home') { g.delay -= h; if (g.delay <= 0) g.mode = 'leave'; return; }
        if (G.freeze > 0) return;
        moveEnt(g, h, ghostSpeed(g), gChoose, function (e) { gArrive(e); }); if (g.mode === 'active' && !g.scared && g.stun <= 0) near = Math.min(near, G.M.bfs(P.b)[g.a === g.b ? g.a : g.b]);
      });
      G.near = near;
      if (near <= 3 && G.inv <= 0) { G.warnT -= h; G.vig = Math.min(1, G.vig + h * 3); if (G.warnT <= 0) { G.warnT = 3.5; S.sfx('warn'); } } else G.vig = Math.max(0, G.vig - h * 2);
      /* collisions */
      var pp = P; for (i = 0; i < G.ghosts.length; i++) {
        if (G.calmT > 0) break;
        var g = G.ghosts[i]; if (g.mode === 'home') continue; var dx = g.x - pp.x, dy = g.y - pp.y, r = g.boss ? .75 : .55; if (dx * dx + dy * dy > r * r) continue;
        if (g.scared && !g.boss) { eatGhost(g); continue; }
        if (g.boss && g.stun > 0) { S.sfx('zap'); G.score += 1000; S.fx.text(px(g.x + .5), py(g.y + .5), '+1000', { color: '#8be9ff', size: 22, life: 1 }); S.fx.burst(px(g.x + .5), py(g.y + .5), { n: 36, shape: 'star', speed: 240 }); g.stun = 0; toHome(g, 10); continue; }
        if (g.mode !== 'active' || G.freeze > 0 || g.stun > 0 || G.inv > 0) continue;
        hitPlayer(); break;
      }
    }
    function upd(dt) {
      if (!G || S.dead || S.paused) return; if (G.manual && !G.stepping) return;   /* tests: only _step() advances the world */
      if (!G.hold && !S.ended && L) { var rem = dt; while (rem > 1e-6 && G && !G.hold) { var h = Math.min(rem, .025); sim(h); rem -= h; } }
      if (G && G.flash > 0) G.flash -= dt;
      if (qImgWait && qImgWait.ok) { qImgWait = null; G.baseNeed = true; }
    }

    /* ---------------- input ---------------- */
    function touchInput() { if (!G) return; G.idleT = 0; if (G.rd) G.rd.inputN = (G.rd.inputN | 0) + 1; }
    function setDir(d) {
      if (!G || G.hold || S.paused || S.ended || G.phase === 'idle' || G.phase === 'end') return; var P = G.player; touchInput();
      /* cornering tolerance: a turn asked a moment too late (still < 0.35 cell past the junction) is taken at that junction */
      if (P.a !== P.b && P.dir >= 0 && d !== P.dir && d !== ((P.dir + 2) & 3) && P.p < .35 && G.M.open[P.a * 4 + d] && !G.M.open[P.b * 4 + d]) { P.b = G.M.nb(P.a, d); P.dir = d; P.p = 0; G.want = -1; updPos(P); return; }
      if (P.a !== P.b && P.dir >= 0 && d === ((P.dir + 2) & 3)) { var t = P.a; P.a = P.b; P.b = t; P.p = 1 - P.p; P.dir = d; G.want = -1; updPos(P); return; }
      G.want = d; G.wantT = G.simT;
    }
    var sw = null;
    S.on(S.canvas, 'pointerdown', function (e) { touchInput(); sw = { id: e.pointerId, x: e.clientX, y: e.clientY }; });
    S.on(window, 'pointermove', function (e) {
      if (!sw || e.pointerId !== sw.id) return; var dx = e.clientX - sw.x, dy = e.clientY - sw.y, a = Math.max(Math.abs(dx), Math.abs(dy));
      if (a >= 14) { setDir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0)); sw.x = e.clientX; sw.y = e.clientY; }
    });
    S.on(window, 'pointerup', function () { sw = null; }); S.on(window, 'pointercancel', function () { sw = null; });
    S.keys({
      onArrow: function (k) { setDir({ up: 0, right: 1, down: 2, left: 3 }[k]); },
      onChar: function (k) { var m = { w: 0, d: 1, s: 2, a: 3 }[k.toLowerCase()]; if (m != null) setDir(m); },
      onSpace: function () { useHint(); },
      onEsc: function () { if (G && G.idleOv) closeIdle(); else if (S.paused) S.closePause(); else S.openPause(); }
    });
    S.on(window, 'keydown', function () { if (G && G.idleOv) closeIdle(); else touchInput(); });

    /* ---------------- drawing ---------------- */
    function cellRect(c) { return [L.mx + (c % G.cols) * L.cell, L.my + ((c / G.cols) | 0) * L.cell]; }
    function buildBase() {
      var d = S.dpr, W = S.W, H = S.H; bcv.width = Math.round(W * d); bcv.height = Math.round(H * d);
      var c = bcv.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0);
      var bg = GX.img(A(L.land ? 'bg_mz_land.webp' : 'bg_mz_port.webp')); G.bgOk = bg.ok;
      var gr = c.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#171d58'); gr.addColorStop(1, '#0b1030'); c.fillStyle = gr; c.fillRect(0, 0, W, H);
      if (bg.ok) { var iw = bg.el.naturalWidth, ih = bg.el.naturalHeight, sc = Math.max(W / iw, H / ih); c.drawImage(bg.el, (W - iw * sc) / 2, (H - ih * sc) / 2, iw * sc, ih * sc); }
      c.fillStyle = 'rgba(8,10,40,.58)'; c.fillRect(0, 0, W, H);
      var cs = L.cell, mx = L.mx, my = L.my, mw = cs * G.cols, mh = cs * G.rows, M = G.M, x, y, k;
      GX.rrect(c, mx - 8, my - 8, mw + 16, mh + 16, cs * .35); c.fillStyle = 'rgba(10,14,52,.72)'; c.fill(); c.strokeStyle = 'rgba(160,175,255,.22)'; c.lineWidth = 1; c.stroke();
      for (y = 0; y < G.rows; y++) for (x = 0; x < G.cols; x++) { GX.rrect(c, mx + x * cs + 2, my + y * cs + 2, cs - 4, cs - 4, cs * .2); c.fillStyle = (x + y) % 2 ? 'rgba(50,62,150,.34)' : 'rgba(36,46,120,.34)'; c.fill(); }
      /* nest marker */
      var hx = mx + (G.home % G.cols + .5) * cs, hy = my + (((G.home / G.cols) | 0) + .5) * cs, rg = c.createRadialGradient(hx, hy, 2, hx, hy, cs * .8); rg.addColorStop(0, 'rgba(190,120,255,.5)'); rg.addColorStop(1, 'rgba(190,120,255,0)'); c.fillStyle = rg; c.fillRect(hx - cs, hy - cs, cs * 2, cs * 2);
      c.strokeStyle = 'rgba(200,150,255,.55)'; c.lineWidth = 2; c.setLineDash([4, 4]); c.beginPath(); c.arc(hx, hy, cs * .38, 0, 6.3); c.stroke(); c.setLineDash([]);
      /* walls */
      function seg(x0, y0, x1, y1) { c.moveTo(mx + x0 * cs, my + y0 * cs); c.lineTo(mx + x1 * cs, my + y1 * cs); }
      function walls() {
        c.beginPath();
        for (var cc = 0; cc < M.N; cc++) {
          var cx0 = cc % G.cols, cy0 = (cc / G.cols) | 0;
          if (!M.open[cc * 4 + 1]) seg(cx0 + 1, cy0, cx0 + 1, cy0 + 1); if (!M.open[cc * 4 + 2]) seg(cx0, cy0 + 1, cx0 + 1, cy0 + 1);
          if (cy0 === 0) seg(cx0, 0, cx0 + 1, 0); if (cx0 === 0) seg(0, cy0, 0, cy0 + 1);
        }
      }
      c.lineCap = 'round'; c.lineJoin = 'round';
      walls(); c.strokeStyle = 'rgba(108,125,255,.26)'; c.lineWidth = cs * .26; c.stroke();                      /* soft outer glow */
      c.save(); c.translate(0, cs * .035); walls(); c.strokeStyle = 'rgba(4,6,28,.75)'; c.lineWidth = cs * .17; c.stroke(); c.restore();   /* drop shadow */
      walls(); c.strokeStyle = stonePattern(c); c.lineWidth = cs * .14; c.stroke();                               /* speckled stone body */
      walls(); c.strokeStyle = 'rgba(168,182,255,.9)'; c.lineWidth = cs * .045; c.stroke();                       /* lit edge */
      c.save(); c.translate(0, -cs * .02); walls(); c.strokeStyle = 'rgba(255,255,255,.75)'; c.lineWidth = cs * .018; c.stroke(); c.restore();   /* top highlight */
      if (G.gap) { var gcx = G.gap.c % G.cols, gcy = (G.gap.c / G.cols) | 0; c.strokeStyle = 'rgba(255,201,74,.5)'; c.lineWidth = 3; c.setLineDash([3, 5]); c.beginPath(); if (G.gap.d === 1) seg(gcx + 1, gcy + .15, gcx + 1, gcy + .85); else seg(gcx + .15, gcy + 1, gcx + .85, gcy + 1); c.stroke(); c.setLineDash([]); }
      G.baseNeed = false; renderQ(c);
    }
    var STONE = null;
    function stonePattern(c) {                                                    /* 64px speckled indigo stone, made once and reused for every wall rebuild */
      if (STONE) return STONE; var pc = document.createElement('canvas'); pc.width = pc.height = 64; var x = pc.getContext('2d'), r = GX.rng(99), i;
      var gr = x.createLinearGradient(0, 0, 64, 64); gr.addColorStop(0, '#4b57b8'); gr.addColorStop(.5, '#38428f'); gr.addColorStop(1, '#4651ab'); x.fillStyle = gr; x.fillRect(0, 0, 64, 64);
      for (i = 0; i < 70; i++) { x.fillStyle = r() < .5 ? 'rgba(10,14,60,.35)' : 'rgba(190,200,255,.22)'; x.fillRect((r() * 64) | 0, (r() * 64) | 0, 1 + ((r() * 3) | 0), 1 + ((r() * 2) | 0)); }
      STONE = c.createPattern(pc, 'repeat'); return STONE;
    }
    /* afterimage trails: player = golden comet tail, ghosts = ink wisps in their own colour (positions sampled every 40 ms into a small ring; skipped for reduced motion) */
    function sampleTrail(buf, x, y, now) { var l = buf[buf.length - 1]; if (l && now - l.t < .04) return; buf.push({ x: x, y: y, t: now }); if (buf.length > 7) buf.shift(); }
    function drawTrailBuf(c, buf, col, r0, now) {
      for (var i = 0; i < buf.length; i++) { var a = 1 - (now - buf[i].t) / .3; if (a <= 0) continue; c.globalAlpha = a * .38; c.fillStyle = col; c.beginPath(); c.arc(buf[i].x, buf[i].y, r0 * (.45 + .55 * a), 0, 6.3); c.fill(); }
      c.globalAlpha = 1;
    }
    function drawTrails(c, now, cs) {
      if (GX.reduced()) return; var P = G.player, moving = P.a !== P.b && G.phase === 'play';
      if (moving) sampleTrail(G.trP, px(P.x + .5), py(P.y + .5), now); drawTrailBuf(c, G.trP, '#ffc94a', cs * .3, now);
      if (G.ghostsOff) return;
      G.ghosts.forEach(function (g, gi) { if (g.mode === 'home') return; var b = G.trG[gi] || (G.trG[gi] = []); if (G.freeze <= 0 && g.a !== g.b) sampleTrail(b, px(g.x + .5), py(g.y + .5), now); drawTrailBuf(c, b, g.scared ? '#6c8bff' : g.col, cs * (g.boss ? .42 : .3), now); });
    }
    function flyLetter(t, rd, slot) {                                             /* the eaten tile flies into its slot, so the child sees where the letter went */
      var idx = rd.disp.indexOf(slot), sr = G.slotRects && G.slotRects[idx]; if (!sr || GX.reduced()) return;
      slot.fly = true; G.flyers.push({ t: t, x0: px(t.c % G.cols + .5), y0: py(((t.c / G.cols) | 0) + .5), x1: sr[0] + sr[2] / 2, y1: sr[1] + sr[2] / 2, s1: sr[2] / (L.cell * .8), t0: S.t, dur: .32, slot: slot });
    }
    function drawFlyers(c, now) {
      for (var i = G.flyers.length - 1; i >= 0; i--) {
        var f = G.flyers[i], k = (now - f.t0) / f.dur; if (k >= 1) { f.slot.fly = false; G.hudSig = ''; G.flyers.splice(i, 1); continue; } if (k < 0) k = 0;
        var e = GX.ease.out(k), sp = tileSpr(f.t, false, L.cell), sc = 1 + (f.s1 - 1) * e, x = f.x0 + (f.x1 - f.x0) * e, y = f.y0 + (f.y1 - f.y0) * e - Math.sin(k * Math.PI) * L.cell * .6;
        c.globalAlpha = 1; c.drawImage(sp.c, x - sp.w * sc / 2, y - sp.sz * sc / 2, sp.w * sc, sp.h * sc);
      }
    }
    function drawGhostShape(c, x, y, r, col, scared, t, dir, alpha) {
      c.save(); c.globalAlpha = alpha; c.translate(x, y); c.fillStyle = scared ? '#5b78ff' : col;
      c.beginPath(); c.arc(0, -r * .1, r, Math.PI, 0); c.lineTo(r, r * .85);
      for (var i = 0; i < 4; i++) { var bx = r - (i + .5) * r / 2; c.quadraticCurveTo(bx + r / 4, r * (1.15 + .1 * Math.sin(t * 8 + i)), bx - r / 4 + (i === 3 ? 0 : 0), r * .85); }
      c.closePath(); c.fill(); c.fillStyle = '#fff'; var ex = dir === 1 ? r * .12 : dir === 3 ? -r * .12 : 0;
      c.beginPath(); c.arc(-r * .35, -r * .2, r * .27, 0, 6.3); c.arc(r * .35, -r * .2, r * .27, 0, 6.3); c.fill(); c.fillStyle = '#10163e';
      c.beginPath(); c.arc(-r * .35 + ex, -r * .18, r * .13, 0, 6.3); c.arc(r * .35 + ex, -r * .18, r * .13, 0, 6.3); c.fill(); c.restore();
    }
    function tileLabel(t, s) {
      var len = t.ch.length, fs = Math.round(s * .8 * (len <= 1 ? .62 : len === 2 ? .5 : len === 3 ? .4 : len === 4 ? .33 : .28));
      return GX.label(t.ch, { size: fs, weight: 900, fam: GX.EFONT, color: '#fff', stroke: 'rgba(14,18,70,.9)', strokeW: 2, dpr: S.dpr });
    }
    var TSP = {}, TSN = 0;
    function tileSpr(t, hot, cs) {
      var d = S.dpr, k = t.ch + '|' + (hot ? 1 : 0) + '|' + cs + '|' + d, h = TSP[k]; if (h) return h;
      if (TSN > 300) { TSP = {}; TSN = 0; } TSN++;
      var w = Math.round(cs * .8), pad = 8, sz = w + pad * 2, cv = document.createElement('canvas'); cv.width = Math.ceil(sz * d); cv.height = Math.ceil((sz + 4) * d); var c = cv.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0);
      var tx = pad, ty = pad, gr = c.createLinearGradient(0, ty, 0, ty + w); gr.addColorStop(0, hot ? '#6a6bd8' : '#5a68e0'); gr.addColorStop(1, hot ? '#3b3fa8' : '#323c9c');
      GX.rrect(c, tx, ty + 2, w, w, w * .26); c.fillStyle = 'rgba(0,0,0,.35)'; c.fill();
      GX.rrect(c, tx, ty, w, w, w * .26); c.fillStyle = gr; c.fill(); c.lineWidth = 2; c.strokeStyle = hot ? '#ffe9a8' : '#b4c0ff'; c.stroke();
      c.globalAlpha = .28; GX.rrect(c, tx + 3, ty + 3, w - 6, w * .38, w * .2); c.fillStyle = '#fff'; c.fill(); c.globalAlpha = 1;
      var lb = tileLabel(t, cs); c.drawImage(lb.c, sz / 2 - lb.w / 2, ty + w / 2 + 1 - lb.h / 2, lb.w, lb.h);
      h = { c: cv, w: cv.width / d, h: cv.height / d, sz: sz }; TSP[k] = h; return h;
    }
    var GLOW = null;
    function glowSpr(cs) {
      var d = S.dpr; if (GLOW && GLOW.k === cs + '|' + d) return GLOW; var w = Math.round(cs * .8) + 16, cv = document.createElement('canvas'); cv.width = Math.ceil(w * d); cv.height = Math.ceil(w * d); var c = cv.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0);
      GX.rrect(c, 4, 4, w - 8, w - 8, (w - 8) * .32); c.fillStyle = '#ffc94a'; c.fill(); GLOW = { k: cs + '|' + d, c: cv, w: w }; return GLOW;
    }
    function tileSprite(c, t, x, y, s, now) {
      var sc = Math.min(1, (G.simT - t.born) / .25), bob = Math.sin(now * 3 + t.c) * s * .02; sc = sc < 1 ? GX.ease.back(Math.max(0, sc)) : 1; if (sc < .05) return;
      var hot = isHot(t);
      if (hot) { var gl = glowSpr(s), gw = gl.w * sc; c.globalAlpha = .3 + .45 * (.5 + .5 * Math.sin(now * 7)); c.drawImage(gl.c, x - gw / 2, y + bob - gw / 2, gw, gw); c.globalAlpha = 1; }
      var sp = tileSpr(t, hot, s), k = sc; c.drawImage(sp.c, x - sp.w * k / 2, y + bob - sp.sz * k / 2, sp.w * k, sp.h * k);
    }
    function renderQ(c) {
      var d = S.dpr, q = L.q; c.save(); c.translate(q.x, q.y); try { renderQ2(c, d, q); } finally { c.restore(); }
    }
    function renderQ2(c, d, q) {
      GX.rrect(c, 1, 1, q.w - 2, q.h - 2, 18); var gr = c.createLinearGradient(0, 0, 0, q.h); gr.addColorStop(0, 'rgba(34,42,106,.92)'); gr.addColorStop(1, 'rgba(18,24,68,.92)'); c.fillStyle = gr; c.fill(); c.strokeStyle = 'rgba(255,255,255,.2)'; c.lineWidth = 1.5; c.stroke();
      var rd = G.rd; if (!rd) return; c.textBaseline = 'middle';
      if (rd.kind === 'cond') {
        c.fillStyle = '#ffc94a'; GX.rrect(c, 10, 8, 64, 22, 11); c.fill(); c.fillStyle = '#3b2600'; c.font = '900 13px ' + GX.FONT; c.textAlign = 'center'; c.fillText('條件吃', 42, 19);
        var f = fitText(c, rd.qText, q.w - 24, q.h - 44, Math.round((L.land ? 24 : 22) * L.ui), 14, 900, GX.FONT); c.fillStyle = '#fff'; c.font = '900 ' + f.size + 'px ' + GX.FONT; c.textAlign = 'center';
        var y0 = 34 + (q.h - 40 - f.lines.length * f.lh) / 2 + f.lh / 2; f.lines.forEach(function (ln, i) { c.fillText(ln, q.w / 2, y0 + i * f.lh); }); return;
      }
      if (isMath) {
        var f2 = fitText(c, rd.qText, q.w - 24, q.h - 12, Math.round((L.land ? 24 : 22) * L.ui), 14, 800, GX.FONT); c.fillStyle = '#fff'; c.font = '800 ' + f2.size + 'px ' + GX.FONT; c.textAlign = 'center';
        var y1 = (q.h - f2.lines.length * f2.lh) / 2 + f2.lh / 2; f2.lines.forEach(function (ln, i) { c.fillText(ln, q.w / 2, y1 + i * f2.lh); }); return;
      }
      /* English: picture + Chinese meaning (speaker button is a DOM button) */
      var it = rd.item, ps = L.land ? Math.min(Math.round(80 * L.ui), q.w - 30) : Math.min(q.h - 14, Math.round(64 * L.ui)), picImg = it.img ? GX.img(it.img) : null, pcx, pcy, tw;
      if (L.land) { pcx = q.w / 2; pcy = 12 + ps / 2; } else { pcx = 10 + ps / 2; pcy = q.h / 2; }
      if (picImg && picImg.ok) { c.drawImage(picImg.el, pcx - ps / 2, pcy - ps / 2, ps, ps); } else if (picImg && !picImg.bad) qImgWait = picImg; else if (it.emoji) { var em = GX.emoji(it.emoji, Math.round(ps * .8), d); c.drawImage(em.c, pcx - em.s / 2, pcy - em.s / 2, em.s, em.s); }
      if (L.land) { var f3 = fitText(c, it.zh, q.w - 16, q.h - ps - 80, Math.round(30 * L.ui), 18, 900, GX.FONT); c.fillStyle = '#fff'; c.font = '900 ' + f3.size + 'px ' + GX.FONT; c.textAlign = 'center'; f3.lines.forEach(function (ln, i) { c.fillText(ln, q.w / 2, 12 + ps + 24 * L.ui + i * f3.lh); }); }
      else { tw = q.w - ps - 20 - 56; var f4 = fitText(c, it.zh, tw, q.h - 12, Math.round(32 * L.ui), 18, 900, GX.FONT); c.fillStyle = '#fff'; c.font = '900 ' + f4.size + 'px ' + GX.FONT; c.textAlign = 'center'; var y2 = (q.h - f4.lines.length * f4.lh) / 2 + f4.lh / 2; f4.lines.forEach(function (ln, i) { c.fillText(ln, 10 + ps + 10 + tw / 2, y2 + i * f4.lh); }); }
    }
    function slotSize() { var sl = slotLayout(); return sl ? sl.sw : 30; }
    function slotLayout() {
      var rd = G.rd; if (!rd || !rd.disp.length) return null; var n = rd.disp.length, R = L.slots, g = 4, sw = Math.round(36 * L.ui), per = n, rowsN = 1;
      if (n * (sw + g) - g > R.w) { sw = Math.floor((R.w + g) / n) - g; if (sw < 24) { per = Math.ceil(n / 2); rowsN = 2; sw = Math.min(Math.round(36 * L.ui), Math.floor((R.w + g) / per) - g); } }
      if (L.land && rowsN === 1 && n > 4) { per = Math.ceil(n / 2); rowsN = 2; sw = Math.min(Math.round(40 * L.ui), Math.floor((R.w + g) / per) - g); }
      sw = Math.max(16, sw); return { n: n, sw: sw, g: g, per: per, rows: rowsN };
    }
    function drawHud() {
      var d = S.dpr, W = S.W, H = S.H, rd = G.rd, i; if (hcv.width !== Math.round(W * d) || hcv.height !== Math.round(H * d)) { hcv.width = Math.round(W * d); hcv.height = Math.round(H * d); }
      var c = hcv.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, W, H);
      var hw = L.hw, hsp = hw * 2.1;
      for (i = 0; i < G.maxHearts; i++) {
        var hxp = L.land ? L.heartsX + i * hsp + hw : L.heartsR - (G.maxHearts - i) * hsp + hw, hyp = L.heartsY;
        heartPath(c, hxp, hyp, hw * .8); c.fillStyle = i < G.hearts ? '#ff5f7e' : 'rgba(255,255,255,.14)'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = i < G.hearts ? '#ffd0d9' : 'rgba(255,255,255,.2)'; c.stroke();
      }
      var uh = L.uh, sc = GX.label('分數 ' + Math.round(G.score), { size: Math.round(15 * uh), weight: 900, color: '#ffe9a8', dpr: d, stroke: 'rgba(10,14,50,.8)', strokeW: 2 });
      c.drawImage(sc.c, L.scoreX, L.scoreY - 2, sc.w, sc.h);
      var prog = S.learn.progress(), isC = rd && rd.kind === 'cond', pt = isC ? '條件吃 ' + rd.eaten + '/' + rd.need : '第 ' + Math.min(prog.total, prog.done + 1) + ' / ' + prog.total + (isMath ? ' 題' : ' 字'), pl = GX.label(pt, { size: Math.round(12 * uh), weight: 800, color: '#c3cbf7', dpr: d });
      c.drawImage(pl.c, L.scoreX, L.scoreY + 22 * uh, pl.w, pl.h);
      if (G.combo >= 2) { var cb = GX.label('×' + Math.min(4, 1 + Math.floor(G.combo / 4)) + '  ' + G.combo + ' 連', { size: Math.round(13 * uh), weight: 900, color: '#ff9f43', dpr: d }); c.drawImage(cb.c, L.scoreX + pl.w + 6, L.scoreY + 21 * uh, cb.w, cb.h); }
      var sl = slotLayout(); G.slotRects = null;
      if (sl && rd) {
        var R = L.slots, perRow = sl.per, rects = [];
        for (i = 0; i < sl.n; i++) {
          var rr = (i / perRow) | 0, cc = i % perRow, cnt = Math.min(perRow, sl.n - rr * perRow), rw2 = cnt * (sl.sw + sl.g) - sl.g, sx = R.x + (R.w - rw2) / 2 + cc * (sl.sw + sl.g), sy = R.y + (L.land ? 4 : (R.h - sl.sw) / 2) + rr * (sl.sw + sl.g), dd = rd.disp[i];
          rects.push([sx, sy, sl.sw]); GX.rrect(c, sx, sy, sl.sw, sl.sw, sl.sw * .26); c.fillStyle = dd.filled ? (dd.fixed ? 'rgba(255,255,255,.08)' : 'rgba(62,230,160,.28)') : 'rgba(255,255,255,.1)'; c.fill();
          c.lineWidth = 1.5; c.strokeStyle = dd.filled && !dd.fixed ? '#3ee6a0' : 'rgba(255,255,255,.28)'; c.stroke();
          if (dd.filled && !dd.fly) { var lbs = GX.label(dd.ch, { size: Math.round(sl.sw * .66), weight: 900, fam: GX.EFONT, color: dd.fixed ? '#c3cbf7' : '#fff', dpr: d }); GX.drawLabel(c, lbs, sx + sl.sw / 2, sy + sl.sw / 2); }
        }
        G.slotRects = rects;
      } else if (rd && rd.kind === 'cond') {
        var lb2 = GX.label('吃掉全部符合的方塊', { size: 14, weight: 800, color: '#c3cbf7', dpr: d }); GX.drawLabel(c, lb2, L.slots.x + L.slots.w / 2, L.slots.y + L.slots.h / 2 - (L.land ? 20 : 0));
      }
    }
    function arrowDir() {                                                          /* first step of the shortest way to the nearest needed tile (the "think" pulse shows only this direction) */
      var rd = G.rd, M = G.M, pc = G.player.b, dist = M.bfs(pc), best = -1, bd = 1e9, i, d;
      for (i = 0; i < G.tiles.length; i++) { var t = G.tiles[i]; if (t.key === rd.seq[rd.i] && dist[t.c] >= 0 && dist[t.c] < bd) { bd = dist[t.c]; best = t.c; } }
      if (best < 0) return -1; var d2 = M.bfs(best), bv = 1e9, bdir = -1;
      for (d = 0; d < 4; d++) if (M.open[pc * 4 + d]) { var n = M.nb(pc, d); if (d2[n] >= 0 && d2[n] < bv) { bv = d2[n]; bdir = d; } }
      return bdir;
    }
    function drawArrow(c, now) {
      var rd = G.rd; if (!rd || rd.kind !== 'word' || !rd.think || G.phase !== 'play') { G.arrowD = -1; return; }
      if (now >= (G.arrowT || 0)) { G.arrowD = arrowDir(); G.arrowT = now + .5; } if (G.arrowD < 0) return;
      var P = G.player, cs = L.cell, x0 = px(P.x + .5), y0 = py(P.y + .5), d = G.arrowD, dx = DX[d], dy = DY[d], pul = .5 + .5 * Math.sin(now * 6);
      for (var k = 0; k < 3; k++) { var off = cs * (.75 + k * .32), ax = x0 + dx * off, ay = y0 + dy * off; c.globalAlpha = (.55 - k * .15) * (.5 + .5 * pul); c.strokeStyle = '#ffe9a8'; c.lineWidth = Math.max(3, cs * .1); c.lineCap = 'round';
        c.beginPath(); c.moveTo(ax - dy * cs * .22 - dx * cs * .12, ay + dx * cs * .22 - dy * cs * .12); c.lineTo(ax + dx * cs * .12, ay + dy * cs * .12); c.lineTo(ax + dy * cs * .22 - dx * cs * .12, ay - dx * cs * .22 - dy * cs * .12); c.stroke(); }
      c.globalAlpha = 1;
    }
    function drawPlayer(c) {                                                     /* drawn after the particles so the child's character is never hidden */
      var now = S.t, cs = L.cell, P = G.player, x0 = px(P.x + .5), y0 = py(P.y + .5), ps2 = cs * .98, blink = G.inv > 0 && Math.floor(now * 10) % 2 === 0;
      if (blink) return;
      c.globalAlpha = .3; c.fillStyle = '#000'; c.beginPath(); c.ellipse(x0, y0 + ps2 * .38, ps2 * .3, ps2 * .09, 0, 0, 6.3); c.fill(); c.globalAlpha = 1;
      c.strokeStyle = 'rgba(255,201,74,.95)'; c.lineWidth = Math.max(2, cs * .06); c.beginPath(); c.arc(x0, y0, ps2 * .5, 0, 6.3); c.stroke();
      var by = y0 + Math.sin(now * 9) * (P.a !== P.b ? 2 : 1); if (!(ch.img && GX.drawImg(c, ch.img, x0, by, ps2, ps2, { flip: P.dir === 3 }))) { var em2 = GX.emoji(ch.icon || '🐼', Math.round(ps2 * .78), S.dpr); c.drawImage(em2.c, x0 - em2.s / 2, by - em2.s / 2, em2.s, em2.s); }
    }
    function draw(c, W, H) {
      if (!G || !L) return; if (G.baseNeed || (!G.bgOk && GX.img(A(L.land ? 'bg_mz_land.webp' : 'bg_mz_port.webp')).ok)) buildBase();
      var tr = c.getTransform(), tx = tr.e / S.dpr, ty = tr.f / S.dpr; if (tx !== G.sx || ty !== G.sy) { G.sx = tx; G.sy = ty; bcv.style.transform = hcv.style.transform = (tx || ty) ? 'translate(' + tx + 'px,' + ty + 'px)' : ''; }
      c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.clearRect(0, 0, c.canvas.width, c.canvas.height); c.restore();
      var now = S.t, cs = L.cell, rd = G.rd, i;
      /* HUD: static parts live on their own layer, redrawn only when a number changes */
      var sig = G.hearts + '|' + Math.round(G.score) + '|' + G.combo + '|' + G.mainDone + '|' + (rd ? (rd.kind === 'word' ? rd.i : rd.eaten) : '') + '|' + G.rdN + '|' + G.layN + '|' + S.dpr;
      if (sig !== G.hudSig) { G.hudSig = sig; drawHud(); }
      if (rd && G.phase !== 'idle') {
        var fr = clamp(rd.left / rd.limit, 0, 1), T = L.timer; c.fillStyle = 'rgba(255,255,255,.16)'; GX.rrect(c, T.x, T.y, T.w, T.h, T.h / 2); c.fill();
        var tcol = fr < .15 ? '#ff4d6a' : fr < .3 ? '#ff9f43' : '#3ee6a0'; if (fr < .15 && !GX.reduced()) c.globalAlpha = .65 + .35 * Math.sin(now * 12);
        c.fillStyle = tcol; if (fr > 0) { GX.rrect(c, T.x, T.y, Math.max(T.h, T.w * fr), T.h, T.h / 2); c.fill(); } c.globalAlpha = 1;
        if (G.slotRects && rd.kind === 'word') { var ni = rd.disp.findIndex(function (d) { return !d.filled; }), sr = ni >= 0 ? G.slotRects[ni] : null; if (sr) { GX.rrect(c, sr[0], sr[1], sr[2], sr[2], sr[2] * .26); c.lineWidth = 3; c.strokeStyle = 'rgba(255,201,74,' + (.55 + .45 * Math.sin(now * 6)) + ')'; c.stroke(); } }
      }
      /* specials */
      var oi, sp = Math.round(cs * .8);
      G.portals.forEach(function (p) { var x = px(p.c % G.cols + .5), y = py(((p.c / G.cols) | 0) + .5), cd = G.portalCd > 0; c.globalAlpha = cd ? .4 : 1; if (!GX.drawImg(c, A('mz_portal.webp'), x, y, cs * .95, cs * .95, { rot: now * (cd ? .5 : 2) })) { c.strokeStyle = '#8e6bff'; c.lineWidth = 3; for (var k = 0; k < 3; k++) { c.beginPath(); c.arc(x, y, cs * (.15 + k * .1) + Math.sin(now * 4 + k) * 2, 0, 6.3); c.stroke(); } } c.globalAlpha = 1; });
      G.orbs.forEach(function (o) { if (!o.alive) return; var x = px(o.c % G.cols + .5), y = py(((o.c / G.cols) | 0) + .5) + Math.sin(now * 3 + o.c) * 2; if (!GX.drawImg(c, A('mz_orb.webp'), x, y, cs * .8, cs * .8, null)) { var rg = c.createRadialGradient(x, y, 1, x, y, cs * .38); rg.addColorStop(0, '#fff'); rg.addColorStop(.5, '#6c8bff'); rg.addColorStop(1, 'rgba(108,139,255,0)'); c.fillStyle = rg; c.beginPath(); c.arc(x, y, cs * .4, 0, 6.3); c.fill(); } });
      G.gems.forEach(function (g) { var x = px(g.c % G.cols + .5), y = py(((g.c / G.cols) | 0) + .5) + Math.sin(now * 4 + g.c) * 2; if (!GX.drawImg(c, A('mz_gem.webp'), x, y, cs * .55, cs * .55, null)) { c.fillStyle = '#8be9ff'; c.beginPath(); c.moveTo(x, y - cs * .2); c.lineTo(x + cs * .16, y); c.lineTo(x, y + cs * .2); c.lineTo(x - cs * .16, y); c.closePath(); c.fill(); } });
      if (G.gap) { var gx2 = G.gap.c % G.cols, gy2 = (G.gap.c / G.cols) | 0, ex = G.gap.d === 1 ? gx2 + 1 : gx2 + .5, ey = G.gap.d === 1 ? gy2 + .5 : gy2 + 1; c.globalAlpha = .5 + .5 * Math.sin(now * 8); c.fillStyle = '#ffe9a8'; c.beginPath(); c.arc(px(ex), py(ey), cs * .09, 0, 6.3); c.fill(); c.globalAlpha = 1; }
      G.tiles.forEach(function (t) { tileSprite(c, t, px(t.c % G.cols + .5), py(((t.c / G.cols) | 0) + .5), cs, now); });
      drawArrow(c, now); drawTrails(c, now, cs);
      /* ghosts */
      if (!G.ghostsOff) G.ghosts.forEach(function (g, gi) {
        var x = px(g.x + .5), y = py(g.y + .5) + Math.sin(now * 5 + gi) * cs * .04, sz = cs * (g.boss ? 1.5 : 1.02), al = g.mode === 'home' ? .55 : 1, scared = g.scared, src = scared ? A('mz_ghost_scared.webp') : g.img;
        if (g.mode === 'home') { x += (gi - 1.5) * cs * .12; }
        if (scared && G.fright < 1.6 && Math.floor(now * 8) % 2 === 0) src = g.img;
        if (G.freeze > 0) al = .75;
        if (g.boss) { c.strokeStyle = 'rgba(192,107,255,' + (.5 + .3 * Math.sin(now * 4)) + ')'; c.lineWidth = 3; c.beginPath(); c.arc(x, y, sz * .55, 0, 6.3); c.stroke(); }
        if (!GX.drawImg(c, src, x, y, sz, sz, { alpha: al, flip: g.dir === 3 })) drawGhostShape(c, x, y, sz * .4, g.col, scared, now, g.dir, al);
        if (g.stun > 0) { for (var k = 0; k < 3; k++) { var an = now * 4 + k * 2.1; c.fillStyle = '#ffe9a8'; c.beginPath(); c.arc(x + Math.cos(an) * sz * .4, y - sz * .5 + Math.sin(an) * 4, 3, 0, 6.3); c.fill(); } }
        if (g.boss) { for (var q2 = 0; q2 < 3; q2++) { c.fillStyle = q2 < g.orbs ? '#8be9ff' : 'rgba(255,255,255,.2)'; c.beginPath(); c.arc(x + (q2 - 1) * 10, y - sz * .62, 4, 0, 6.3); c.fill(); } }
        if (G.calmT > 0 && g.mode !== 'home') { var zz = GX.label('z z', { size: Math.max(12, Math.round(cs * .3)), weight: 900, color: '#bfe9ff', dpr: S.dpr, stroke: 'rgba(10,14,50,.8)', strokeW: 2 }); GX.drawLabel(c, zz, x + sz * .3, y - sz * .55 + Math.sin(now * 3) * 2); }
        if (G.freeze > 0) { c.globalAlpha = .35; c.fillStyle = '#bfe9ff'; c.beginPath(); c.arc(x, y, sz * .42, 0, 6.3); c.fill(); c.globalAlpha = 1; }
      });
      drawFlyers(c, now);
      var vo = G.vig > 0 ? Math.round(G.vig * (.6 + .4 * Math.sin(now * 10)) * 20) / 20 : 0; if (vo !== G.vo) { G.vo = vo; vigEl.style.opacity = vo; }
      var fo = G.fright > 0 ? 1 : 0; if (fo !== G.fo) { G.fo = fo; frEl.style.opacity = fo; }
      if (G.phase === 'ready') { var rl = GX.label(G.countdown ? String(Math.max(1, Math.ceil(G.readyT / .8))) : (rd && rd.kind === 'cond' ? '準備！' : '準備…'), { size: Math.round(cs * .8), weight: 900, color: '#fff', dpr: S.dpr, stroke: 'rgba(10,14,50,.9)', strokeW: 3 }); GX.drawLabel(c, rl, W / 2, L.my + cs * G.rows / 2, G.countdown ? 1 : clamp(G.readyT / .4, 0, 1)); }
    }

    /* ---------------- flow ---------------- */
    function begin(cd) {
      G.phase = 'idle'; S.audio.music(boss ? 'boss' : (diff >= 4 ? 'drive' : 'calm'));
      if (boss) { S.ui.banner('魔王關', '連吃 3 顆墨水，擊暈大魔王', 1500); S.sfx('boss'); }
      nextRound();
      if (cd && G.phase === 'ready') { G.countdown = true; G.readyT = 2.4; G.rd.lastProg = G.simT + 2.4; }
    }
    function restart() { newGame(); onResizeInit(); begin(true); }
    function onResizeInit() { L = computeLayout(S.W, S.H); if (G && !G.M) { buildMaze(); G.tileAt = new Array(G.M.N); setupSpecials(); var P = G.player; P.a = P.b = G.spawn; updPos(P); makeGhosts(); } onResize(S.W, S.H); }
    L = computeLayout(S.W, S.H);
    newGame(); onResizeInit();
    var firstRun = true;
    S.loop(upd, draw);
    S.ui.how('maze', '字母迷宮', [{ icon: isTouchDev ? '👆' : '⌨️', text: isTouchDev ? '滑動走位' : '方向鍵走位' }, { icon: '🔤', text: '按序吃字' }, { icon: '👻', text: '躲開幽靈' }], function () {
      S.ui.preview(S.learn.items, { onStart: function () { begin(); } });
    });
    CUR.dbg = function () {
      var rd = G.rd, P = G.player;
      return {
        phase: G.phase, hold: G.hold, cols: G.cols, rows: G.rows, land: G.land, hearts: G.hearts, score: G.score, combo: G.combo, maxCombo: G.maxCombo, mainDone: G.mainDone, condPlayed: G.condPlayed, condClean: G.condClean, wrongEats: G.wrongEats, hits: G.hits,
        player: { a: P.a, b: P.b, p: P.p, dir: P.dir, x: P.x, y: P.y }, spawn: G.spawn, home: G.home, inv: G.inv, boost: G.boost, fright: G.fright, freeze: G.freeze, wave: G.wave, simT: G.simT, playT: G.playT,
        rd: rd && { kind: rd.kind, i: rd.i, seq: rd.seq.slice(), need: rd.need, eaten: rd.eaten, left: rd.left, limit: rd.limit, failed: rd.failed, hinted: rd.hinted, item: rd.item && { id: rd.item.id, en: rd.item.en, q: rd.item.q, a: rd.item.a }, q: rd.qText, cond: rd.cd && { q: rd.cd.q, tiles: rd.cd.tiles.map(function (t) { return { text: t.text, tgt: t.tgt }; }) } },
        tiles: G.tiles.map(function (t) { return { c: t.c, ch: t.ch, tgt: t.tgt }; }), respawn: G.respawn.length, gems: G.gems.length, orbs: G.orbs.map(function (o) { return { c: o.c, alive: o.alive }; }), portals: G.portals.map(function (p) { return p.c; }), portalCd: G.portalCd,
        ghosts: G.ghosts.map(function (g) { return { idx: g.idx, type: g.type, mode: g.mode, a: g.a, b: g.b, p: g.p, x: g.x, y: g.y, scared: g.scared, stun: g.stun, boss: g.boss, delay: g.delay, orbs: g.orbs, target: g.mode === 'home' ? -1 : aiTarget(g, true), speed: ghostSpeed(g) }; }),
        maze: { open: Array.prototype.slice.call(G.M.open), N: G.M.N }, learnLeft: S.learn.remaining(), ended: !!S.ended, result: S.result || null, layout: { timer: L.timer, cell: L.cell, mx: L.mx, my: L.my, mw: L.mw, mh: L.mh, q: L.q, slots: L.slots, land: L.land }, holdOpen: S.ui.open('learn'),
        rests: G.rests | 0, calmT: G.calmT | 0, idleOv: !!G.idleOv, paused: !!S.paused, awayStreak: G.awayStreak | 0, stallT: rd ? rd.stallT : 0, arrow: G.arrowD == null ? -1 : G.arrowD, toStreak: G.toStreak | 0, helpGlow: !!G.helpGlow, readyT: G.readyT, countdown: !!G.countdown, glow: G.tiles.filter(isHot).map(function (t) { return t.c; }), think: rd ? !!rd.think : false, assisted: rd ? !!rd.assisted : false, tileCount: G.tiles.length, flyers: G.flyers.length, tickT: G.tickT, dpadOn: dpadOn, ghostsOff: G.ghostsOff
      };
    };
    CUR.cmd = function (name, a) {
      var P = G.player;
      function stand(c) { P.a = P.b = c; P.p = 0; updPos(P); pArrive(P); }
      if (name === 'goto') { if (G.phase === 'ready') { G.phase = 'play'; } stand(a); return true; }
      if (name === 'ready') { if (G.phase === 'ready') G.phase = 'play'; G.calmT = 0; return G.phase; }
      if (name === 'calm') { G.calmT = a; return true; }
      if (name === 'noGhosts') { G.ghostsOff = !!a; return true; }
      if (name === 'eatNext') { var rd = G.rd; if (G.phase === 'ready') G.phase = 'play'; var t = G.tiles.filter(function (x) { return rd.kind === 'word' ? x.key === rd.seq[rd.i] : x.tgt; })[0]; if (!t) return false; stand(t.c); return true; }
      if (name === 'eatWrong') { var rd2 = G.rd; if (G.phase === 'ready') G.phase = 'play'; var t2 = G.tiles.filter(function (x) { return rd2.kind === 'word' ? x.key !== rd2.seq[rd2.i] : !x.tgt; })[0]; if (!t2) return false; stand(t2.c); return true; }
      if (name === 'eatChar') { var t3 = G.tiles.filter(function (x) { return x.ch === a; })[0]; if (!t3) return false; stand(t3.c); return true; }
      if (name === 'left') { G.rd.left = a; G.rd.inputN = Math.max(1, G.rd.inputN | 0); return true; }
      if (name === 'leftAway') { G.rd.left = a; return true; }
      if (name === 'closeIdle') { if (G.idleOv) { G.idleAt = 0; closeIdle(); } return true; }
      if (name === 'idle') { G.idleT = a; return true; }
      if (name === 'hit') { hitPlayer(); return true; }
      if (name === 'orb') { var o = G.orbs.filter(function (x) { return x.alive; })[0]; if (!o) return false; stand(o.c); return true; }
      if (name === 'place') { var g = G.ghosts[a.i]; g.mode = a.mode || 'active'; g.a = g.b = a.c; g.p = 0; g.prev = a.prev == null ? -1 : a.prev; g.scared = !!a.scared; updPos(g); return true; }
      if (name === 'player') { P.a = P.b = a.c; P.p = 0; P.dir = a.dir == null ? -1 : a.dir; updPos(P); return true; }
      if (name === 'target') { return aiTarget(G.ghosts[a], true); }
      if (name === 'choose') { var gg = G.ghosts[a.i]; var sv = ERR[diff - 1]; ERR[diff - 1] = 0; var dd = gChoose(gg); ERR[diff - 1] = sv; return dd < 0 ? -1 : G.M.nb(gg.a, dd); }
      if (name === 'skipCard') { if (!G.hold) return false; S.ui.close('learn'); G.hold = false; nextRound(); return true; }
      if (name === 'manual') { G.manual = !!a; return true; }
      if (name === 'inv') { G.inv = a; return true; }
      if (name === 'wave') { G.wave = a; return true; }
      if (name === 'gem') { return G.gems.map(function (x) { return x.c; }); }
      if (name === 'event') { pickEvent(); return G.gap ? { gap: G.gap.c } : { freeze: G.freeze }; }
      if (name === 'closeGap') { if (G.gap) G.gap.left = 0; return true; }
      if (name === 'dir') { setDir(a); return true; }
      if (name === 'hint') { useHint(); return true; }
      if (name === 'timeout') { G.rd.left = 0.001; return true; }
      return null;
    };
    CUR.step = function (n, dt) { G.stepping = true; try { S._step(n, dt); } finally { G.stepping = false; } };
    var handle = S.handle(); handle._S = S;
    return handle;
  }

  var API = {
    start: start, version: '1.0', _genMaze: genMaze, _cond: function (w, s, seed) { return cond(w, s, GX.rng(seed)); }, CONF: CONF,
    _step: function (n, dt) { if (CUR) CUR.step(n || 1, dt); },
    _cmd: function (name, a) { return CUR ? CUR.cmd(name, a) : null; }
  };
  Object.defineProperty(API, '_debug', { get: function () { return CUR ? CUR.dbg() : null; } });
  globalThis.WQ37Maze = API;
  if (typeof module !== 'undefined') module.exports = API;
})();

;
/* 字卡征途 WQ37Card - turn-based card battle on top of WQ37GX (R3.21).
   One level = one battle. Deck = the level's learning items (+ up to 2 review items, no stars). Every card must be SOLVED (spell / calculate) before it takes effect;
   a wrong answer breaks the card, shows the 2 s learn card and the item comes back through GX.Learn's requeue. The monster has one WEAKNESS computed from item data
   (English: syllables / length / first letter - Maths: odd / even / bigger / smaller / operation / decimal / fraction): attacks that hit it do x2.
   Public: WQ37Card.start(box, opts) -> { destroy, pause, resume }   test hooks: _debug (getter), _step(n, dt), _cmd(name, arg)                              */
(function () {
  'use strict';
  var GX = globalThis.WQ37GX;
  var clamp = GX.clamp, esc = GX.esc, hash = GX.hash, ico = GX.ico, FONT = GX.FONT, EFONT = GX.EFONT;
  var cur = null;
  var ICO2 = {
    sword: '<path d="M21 3h-6.2L8 9.8l6.2 6.2L21 9.2z" fill="currentColor" stroke="none"/><path d="M5.8 12.2l6 6M3.2 20.8l3.6-3.6" stroke-width="2.4"/><path d="M12.6 8l3.4 3.4" stroke="rgba(0,0,0,.35)" stroke-width="1.5"/>'
  };
  function ico2(n, size) { if (ICO2[n]) return '<svg viewBox="0 0 24 24" width="' + (size || 24) + '" height="' + (size || 24) + '" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + ICO2[n] + '</svg>'; return ico(n, size); }
  var MON = [
    { img: 'cd_mon_1.webp', name: '布丁怪', hue: 330 }, { img: 'cd_mon_2.webp', name: '烈焰小狐', hue: 24 }, { img: 'cd_mon_3.webp', name: '冰晶企鵝', hue: 200 },
    { img: 'cd_mon_4.webp', name: '閃電雲團', hue: 50 }, { img: 'cd_mon_5.webp', name: '青苔石靈', hue: 110 }, { img: 'cd_mon_6.webp', name: '星夜貓頭鷹', hue: 270 }];
  var BOSS = [{ img: 'cd_boss_1.webp', name: '守關金龍', hue: 170 }, { img: 'cd_boss_2.webp', name: '星河巨鯨', hue: 240 }];
  var TY = {
    atk: { ic: 'sword', col: '#ff6a6a', name: '攻擊', frame: 'cd_frame_atk.webp' }, def: { ic: 'shield', col: '#58aaff', name: '護盾', frame: 'cd_frame_def.webp' },
    heal: { ic: 'heart', col: '#3ee6a0', name: '治療', frame: 'cd_frame_heal.webp' }, draw: { ic: 'sparkle', col: '#c595ff', name: '抽牌', frame: 'cd_frame_draw.webp' }
  };
  var PATTERN = ['atk', 'def', 'atk', 'heal', 'atk', 'draw', 'def', 'atk', 'heal', 'atk', 'def', 'draw'];
  var EVO = { atk: 3, def: 3, heal: 2, draw: 0 };
  var DF = { hpMul: [0.8, 0.9, 1, 1.12, 1.25], atkAdd: [-1, 0, 1, 2, 3], pHp: [52, 48, 44, 40, 36], distract: [2, 3, 4, 0, 0] };
  var HAND_MAX = 7, MAX_EN = 3, WEAK = {
    syl1: ['1 音節', 'syl'], syl2: ['2 音節', 'syl'], syl3: ['3 音節以上', 'syl'], long: ['字母多於 ', 'len'], short: ['字母不多於 ', 'len'], vowel: ['元音開頭', 'ltr'], cons: ['輔音開頭', 'ltr'],
    odd: ['單數', 'num'], even: ['雙數', 'num'], big: ['大於 ', 'num'], small: ['不大於 ', 'num'], add: ['加法題', 'op'], sub: ['減法題', 'op'], mul: ['乘法題', 'op'], div: ['除法題', 'op'], dec: ['小數答案', 'num'], frac: ['分數答案', 'num']
  };

  /* ------------------------------------------------------------------ pure helpers (item features) */
  function isMath(it) { return !!it && (it.kind === 'math' || (it.a != null && it.en == null)); }
  function estSyl(w) {
    var n = 0; String(w || '').toLowerCase().split(/[^a-z]+/).forEach(function (p) {
      if (!p) return; var m = p.match(/[aeiouy]+/g), k = m ? m.length : 1; if (k > 1 && /[^aeiouy]e$/.test(p) && !/[^aeiouy]le$/.test(p)) k--; n += Math.max(1, k);
    }); return Math.max(1, n);
  }
  function numOf(a) {
    var s = GX.norm(a), m;
    if ((m = /^(-?\d+(?:\.\d+)?)\/(\d+(?:\.\d+)?)$/.exec(s))) return parseFloat(m[1]) / parseFloat(m[2]); var v = parseFloat(s); return isFinite(v) && /^-?\d*\.?\d+$/.test(s) ? v : NaN;
  }
  function featOf(S, it) {
    if (it._f) return it._f;
    var f;
    if (isMath(it)) {
      var q = String(it.q || ''), a = GX.norm(it.a), v = numOf(it.a);
      f = { math: true, v: v, int: isFinite(v) && Math.floor(v) === v, dec: /\./.test(a), frac: /\//.test(a), add: /[＋+]/.test(q), sub: /[－−\-]/.test(q), mul: /[×x*]/.test(q), div: /[÷]/.test(q) };
    } else {
      var en = String(it.en || ''), letters = en.toLowerCase().replace(/[^a-z]/g, ''), sy = S.syl(it), syl = sy && sy.indexOf('·') >= 0 ? sy.split('·').length : (sy && sy.toLowerCase().replace(/[^a-z]/g, '') === letters && letters.length <= 5 ? Math.max(1, estSyl(en)) : estSyl(en));
      f = { math: false, len: letters.length, syl: syl, vowel: /^[aeiou]/.test(letters), first: letters.charAt(0), last: letters.charAt(letters.length - 1) };
    }
    it._f = f; return f;
  }
  function weakHit(kind, f, T) {
    if (kind.indexOf('end:') === 0) return !f.math && f.last === kind.slice(4); if (kind.indexOf('start:') === 0) return !f.math && f.first === kind.slice(6);
    switch (kind) {
      case 'syl1': return !f.math && f.syl === 1; case 'syl2': return !f.math && f.syl === 2; case 'syl3': return !f.math && f.syl >= 3;
      case 'long': return !f.math && f.len > T; case 'short': return !f.math && f.len <= T; case 'vowel': return !f.math && f.vowel; case 'cons': return !f.math && !f.vowel;
      case 'odd': return !!f.math && f.int && Math.abs(f.v) % 2 === 1; case 'even': return !!f.math && f.int && f.v % 2 === 0;
      case 'big': return !!f.math && isFinite(f.v) && f.v > T; case 'small': return !!f.math && isFinite(f.v) && f.v <= T;
      case 'add': return !!f.math && f.add && !f.sub && !f.mul && !f.div; case 'sub': return !!f.math && f.sub && !f.add && !f.mul && !f.div;
      case 'mul': return !!f.math && f.mul; case 'div': return !!f.math && f.div; case 'dec': return !!f.math && f.dec; case 'frac': return !!f.math && f.frac;
    } return false;
  }
  function weakLabel(w) { if (w.kind.indexOf('end:') === 0) return '結尾字母 ' + w.kind.slice(4).toUpperCase(); if (w.kind.indexOf('start:') === 0) return '開頭字母 ' + w.kind.slice(6).toUpperCase(); var b = WEAK[w.kind] || ['?', '']; return b[0] + (w.kind === 'big' || w.kind === 'small' || w.kind === 'long' || w.kind === 'short' ? w.T : ''); }
  function costOf0(it, f) {
    if (!f.math) return f.len <= 4 ? 1 : f.len <= 7 ? 2 : 3;
    var q = String(it.q || ''), nums = q.match(/\d+(?:\.\d+)?/g) || [], sc = Math.max(0, nums.length - 1) + (nums.some(function (n) { return parseFloat(n) >= 100; }) ? 1 : 0) + (q.length > 20 ? 1 : 0) + (/[.%\/]/.test(q + it.a) ? 1 : 0) + (GX.norm(it.a).length >= 4 ? 1 : 0);
    return sc <= 1 ? 1 : sc <= 3 ? 2 : 3;
  }
  function basePower(type, cost, f) {
    if (type === 'draw') return 2;
    if (!f.math) { var L = Math.max(2, f.len); return type === 'atk' ? L : type === 'def' ? Math.ceil(L * 1.1) + 1 : Math.ceil(L / 2) + 1; }
    var tier = cost - 1; return type === 'atk' ? [4, 7, 11][tier] : type === 'def' ? [4, 7, 10][tier] : [3, 5, 8][tier];
  }

  /* ------------------------------------------------------------------ CSS */
  var CSSDONE = false;
  function injectCss() {
    if (CSSDONE && document.querySelector('style[data-wq37="card"]')) return; CSSDONE = true;
    var G = '#ffc94a';
    var css = '' +
      '.cd-ui{position:absolute;inset:0;z-index:2;pointer-events:none;overflow:hidden;font-family:' + FONT + '}.cd-ui button{pointer-events:auto;font-family:' + FONT + '}' +
      '.cd-ui [hidden]{display:none!important}' +
      '.cd-ui .gx-hudbtn{position:absolute;left:8px;top:8px;pointer-events:auto}' +
      '.cd-title{position:absolute;left:58px;top:8px;height:44px;display:flex;align-items:center;gap:8px;font-size:14px;font-weight:800;color:#f4f6ff;text-shadow:0 1px 4px rgba(0,0,0,.7)}' +
      '.cd-title .t{background:rgba(11,16,48,.55);border:1px solid rgba(255,255,255,.2);border-radius:999px;padding:6px 12px;white-space:nowrap}.cd-title .tn{color:' + G + '}' +
      '.cd-piles{position:absolute;right:8px;top:8px;height:44px;display:flex;align-items:center;gap:6px}' +
      '.cd-pile{display:flex;align-items:center;gap:5px;background:rgba(11,16,48,.6);border:1px solid rgba(255,255,255,.22);border-radius:12px;height:34px;padding:0 9px;font-size:15px;font-weight:900;color:#fff}.cd-pile svg{width:16px;height:16px}' +
      '.cd-pile .bk{width:16px;height:22px;border-radius:3px;background:linear-gradient(135deg,#3b2a86,#1b1250);border:1.5px solid ' + G + '}' +
      '.cd-minfo{position:absolute;display:flex;flex-direction:column;align-items:center;gap:5px;pointer-events:none;transform:translateX(-50%)}' +
      '.cd-mname{font-size:15px;font-weight:900;color:#fff;text-shadow:0 2px 6px rgba(0,0,0,.8);display:flex;align-items:center;gap:6px;line-height:1}.cd-mname em{font-style:normal;font-size:12px;background:' + G + ';color:#3b2600;border-radius:8px;padding:2px 7px}.cd-mname em.tn{background:rgba(11,16,48,.7);color:' + G + ';border:1px solid ' + G + '}' +
      '.cd-bar{position:relative;height:16px;border-radius:9px;background:rgba(8,10,34,.82);border:1.5px solid rgba(255,255,255,.35);overflow:hidden;box-shadow:0 2px 6px rgba(0,0,0,.4)}' +
      '.cd-bar i{position:absolute;left:0;top:0;bottom:0;width:100%;border-radius:8px}.cd-bar i{transform-origin:0 50%;will-change:transform}.cd-bar .lag{background:rgba(255,255,255,.75);transition:transform .7s .25s ease-out}.cd-bar .fr{transition:transform .22s ease-out}' +
      '.cd-bar.mon .fr{background:linear-gradient(180deg,#ff7a7a,#d03c4c)}.cd-bar.me .fr{background:linear-gradient(180deg,#5af0b0,#1fae7a)}' +
      '.cd-bar b{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:900;color:#fff;text-shadow:0 1px 2px #000;letter-spacing:.02em}' +
      '.cd-chips{display:flex;gap:6px;align-items:center;justify-content:center;flex-wrap:nowrap}' +
      '.cd-chip{display:inline-flex;align-items:center;gap:5px;height:30px;padding:0 10px;border-radius:999px;font-size:14px;font-weight:900;white-space:nowrap;background:rgba(11,16,48,.78);border:2px solid rgba(255,255,255,.3);color:#fff;box-shadow:0 2px 6px rgba(0,0,0,.4)}' +
      '.cd-chip svg{width:17px;height:17px}.cd-chip small{font-size:11px;opacity:.85;font-weight:700}' +
      '.cd-chip.int{border-color:#ff6a6a}.cd-chip.int.def{border-color:#58aaff}.cd-chip.int.stun{border-color:#c595ff}.cd-chip.int.safe{border-color:#3ee6a0}.cd-chip.int svg{color:#ff6a6a}.cd-chip.int.def svg{color:#58aaff}' +
      '.cd-chip.wk{border-color:' + G + ';color:' + G + ';animation:cdpulse 1.8s ease-in-out infinite}.cd-chip.blk{border-color:#58aaff;color:#9fd0ff}' +
      '@keyframes cdpulse{0%,100%{opacity:1}50%{opacity:.7}}.cd-chip.wk,.cd-card .hit,.cd-hit2,.cd-end.pulse{will-change:opacity}.cd-chip.wk{box-shadow:0 0 12px rgba(255,201,74,.55)}' +
      '.cd-me{position:absolute;display:flex;align-items:center;gap:8px;pointer-events:none}' +
      '.cd-av{flex:0 0 auto;width:46px;height:46px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#3a44a0,#1b2160);border:2px solid ' + G + ';display:flex;align-items:center;justify-content:center;overflow:hidden;font-size:28px;box-shadow:0 3px 8px rgba(0,0,0,.5)}.cd-av img{width:100%;height:100%;object-fit:cover}' +
      '.cd-av.hurt{animation:cdshake .3s}@keyframes cdshake{0%,100%{transform:none}25%{transform:translateX(-5px)}75%{transform:translateX(5px)}}' +
      '.cd-mecol{display:flex;flex-direction:column;gap:5px;flex:1;min-width:0}.cd-merow{display:flex;align-items:center;gap:6px}.cd-merow .cd-bar{flex:1;min-width:60px;max-width:300px}' +
      '.cd-sh{display:inline-flex;align-items:center;gap:3px;height:24px;padding:0 8px;border-radius:999px;background:rgba(88,170,255,.25);border:1.5px solid #58aaff;color:#cfe6ff;font-size:13px;font-weight:900}.cd-sh svg{width:14px;height:14px}.cd-sh[hidden]{display:none}' +
      '.cd-en{display:flex;gap:5px;align-items:center}.cd-orb{width:22px;height:22px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff6c9,' + G + ' 45%,#d98a00);border:2px solid #fff3c0;box-shadow:0 0 8px rgba(255,201,74,.8);transition:all .2s}.cd-orb.off{background:#262c70;border-color:#4a53a8;box-shadow:none;opacity:.7}' +
      '.cd-en span{font-size:12px;color:#c3cbf7;font-weight:800;margin-left:2px}' +
      '.cd-end{position:absolute;white-space:nowrap;min-width:96px;height:52px;padding:0 14px;border-radius:16px;border:0;background:linear-gradient(180deg,#ffd866,#e6a800);color:#3b2600;font-size:16px;font-weight:900;box-shadow:0 4px 0 #b97f00,0 6px 12px rgba(0,0,0,.4);display:flex;align-items:center;justify-content:center;gap:6px;cursor:pointer;touch-action:manipulation;pointer-events:auto}' +
      '.cd-end:active{transform:translateY(2px);box-shadow:0 2px 0 #b97f00}.cd-end[disabled]{opacity:.5;filter:grayscale(.5);box-shadow:none}.cd-end.pulse{animation:cdpulse 1s ease-in-out infinite}.cd-end svg{width:20px;height:20px}' +
      '.cd-hand{position:absolute;left:0;top:0;width:100%;height:100%;pointer-events:none}' +
      '.cd-card{position:absolute;padding:0;border:0;background:transparent;cursor:pointer;pointer-events:auto;touch-action:manipulation;color:#f4f6ff;transform-origin:50% 100%;transition:left .22s cubic-bezier(.23,1,.32,1),top .22s cubic-bezier(.23,1,.32,1),transform .22s cubic-bezier(.23,1,.32,1),opacity .25s,filter .2s;-webkit-tap-highlight-color:transparent;text-align:center}' +
      '.cd-card .fr{position:absolute;inset:0;background-size:100% 100%;background-repeat:no-repeat;z-index:2;pointer-events:none}.cd-card .bgf{position:absolute;inset:3% 4%;border-radius:9%;background:linear-gradient(170deg,#262e78,#161b4c);z-index:0}' +
      '.cd-noimg .cd-card .fr{border:3px solid ' + G + ';border-radius:12%;box-shadow:inset 0 0 0 2px rgba(0,0,0,.4)}' +
      '.cd-card.ty-atk .bgf{background:linear-gradient(170deg,#4a2342,#1d1440)}.cd-card.ty-def .bgf{background:linear-gradient(170deg,#1f3b7c,#14204f)}.cd-card.ty-heal .bgf{background:linear-gradient(170deg,#1b5a5a,#12304a)}.cd-card.ty-draw .bgf{background:linear-gradient(170deg,#43308f,#201552)}' +
      '.cd-card .in{position:absolute;left:12%;right:12%;top:13%;bottom:17%;z-index:1;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:calc(var(--u)*2);overflow:hidden}' +
      '.cd-card .art{font-size:calc(var(--u)*34);line-height:1.05;height:calc(var(--u)*38);display:flex;align-items:center;justify-content:center}.cd-card .art img{max-height:100%;max-width:100%;object-fit:contain}' +
      '.cd-card .zh{font-size:max(11px,calc(var(--u)*15));font-weight:900;line-height:1.1;text-shadow:0 1px 3px rgba(0,0,0,.7);max-width:100%;overflow:hidden;white-space:nowrap}' +
      '.cd-card .bx{display:flex;gap:2px;justify-content:center;max-width:100%}.cd-card .bx s{display:block;height:calc(var(--u)*7);min-height:5px;flex:1 1 0;max-width:calc(var(--u)*11);border-radius:2px;border:1.5px solid rgba(255,255,255,.55);background:rgba(255,255,255,.1)}' +
      '.cd-card .q{font-family:' + EFONT + ';font-weight:900;line-height:1.25;word-break:break-all;display:-webkit-box;-webkit-box-orient:vertical;-webkit-line-clamp:4;overflow:hidden;text-shadow:0 1px 3px rgba(0,0,0,.7)}' +
      '.cd-card .cost{position:absolute;left:-3%;top:-3%;width:calc(var(--u)*25);height:calc(var(--u)*25);border-radius:50%;z-index:4;background:radial-gradient(circle at 35% 30%,#7e8cff,#2b36a8);border:2px solid ' + G + ';display:flex;align-items:center;justify-content:center;font-size:max(13px,calc(var(--u)*15));font-weight:900;font-family:' + EFONT + ';color:#fff;box-shadow:0 2px 6px rgba(0,0,0,.5)}' +
      '.cd-card .cost.free{background:radial-gradient(circle at 35% 30%,#fff6c9,#e6a800);color:#3b2600}' +
      '.cd-card .pow{position:absolute;left:50%;bottom:5%;transform:translateX(-50%);z-index:4;display:flex;align-items:center;gap:3px;height:calc(var(--u)*20);padding:0 calc(var(--u)*8);border-radius:999px;background:rgba(8,10,34,.9);border:1.5px solid currentColor;font-size:max(12px,calc(var(--u)*13));font-weight:900;font-family:' + EFONT + ';white-space:nowrap}.cd-card .pow svg{width:calc(var(--u)*12);height:calc(var(--u)*12);min-width:11px;min-height:11px}' +
      '.cd-card .hit{position:absolute;right:-4%;top:-3%;z-index:4;min-width:calc(var(--u)*26);height:calc(var(--u)*26);border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff3a8,#ff9d00);color:#4a2b00;font-weight:900;font-size:max(11px,calc(var(--u)*12));display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 0 12px rgba(255,170,0,.9);animation:cdpulse 1.2s infinite}' +
      '.cd-card .pips{position:absolute;left:0;right:0;bottom:calc(var(--u)*21);display:flex;justify-content:center;gap:3px;z-index:3}.cd-card .pips s{display:block;width:calc(var(--u)*6);height:calc(var(--u)*6);min-width:5px;min-height:5px;border-radius:50%;background:rgba(255,255,255,.22)}.cd-card .pips s.on{background:' + G + ';box-shadow:0 0 5px ' + G + '}' +
      '.cd-card .rv{position:absolute;right:8%;bottom:20%;z-index:4;font-size:11px;color:#9fd0ff;display:none}.cd-card.rvc .rv{display:block}.cd-card.rvc .rv svg{width:13px;height:13px}' +
      '.cd-card.evo .fr{filter:drop-shadow(0 0 6px ' + G + ');animation:cdevo 1.6s ease-in-out infinite}@keyframes cdevo{0%,100%{opacity:1}50%{opacity:.78}}' +
      '.cd-card.dim{filter:grayscale(.7) brightness(.62)}.cd-card.sel{z-index:40!important}.cd-card.foc{filter:drop-shadow(0 0 10px rgba(255,255,255,.8))}' +
      '.cd-card.no{animation:cdshake .3s}.cd-card.fly{pointer-events:none;z-index:60!important;transition:left .3s cubic-bezier(.5,0,.8,.4),top .3s cubic-bezier(.5,0,.8,.4),transform .3s,opacity .26s .06s}' +
      '.cd-card.brk{pointer-events:none;z-index:60!important;animation:cdbreak .6s ease-in forwards}@keyframes cdbreak{0%{transform:scale(1.1)}15%{transform:scale(1.1) rotate(-6deg);filter:brightness(2) saturate(2) hue-rotate(-30deg)}30%{transform:scale(1.1) rotate(5deg)}100%{transform:translateY(80px) rotate(18deg) scale(.7);opacity:0;filter:grayscale(1) brightness(.5)}}' +
      '.cd-card .bk{position:absolute;inset:0;z-index:6;pointer-events:none;background:linear-gradient(135deg,#3b2a86,#1b1250);border-radius:8%;animation:cdbk .34s ease-in forwards;animation-delay:var(--bd,0s)}@keyframes cdbk{0%{transform:scaleX(1)}99%{transform:scaleX(0);opacity:1}100%{transform:scaleX(0);opacity:0}}' +
      '.cd-card .ar{display:none}' +
      '@media (hover:hover){.cd-card:not(.fly):not(.brk):hover{z-index:30!important;transform:translateY(-16px) scale(1.07)!important}}' +
      '.cd-sheet{position:absolute;z-index:5;left:0;right:0;bottom:0;background:linear-gradient(180deg,#181e54,#0c1034);border-top:2px solid ' + G + ';border-radius:22px 22px 0 0;padding:10px 12px max(10px,env(safe-area-inset-bottom));pointer-events:auto;box-shadow:0 -10px 30px rgba(0,0,0,.5);animation:cdsheet .22s cubic-bezier(.23,1,.32,1);display:flex;flex-direction:column;gap:8px;box-sizing:border-box;touch-action:manipulation}' +
      '@keyframes cdsheet{from{transform:translateY(40px);opacity:0}to{transform:none;opacity:1}}.cd-sheet.out{animation:cdsheetout .22s ease-in forwards;pointer-events:none}@keyframes cdsheetout{to{transform:translateY(24px);opacity:0}}' +
      '.cd-sh-head{display:flex;align-items:center;gap:8px;min-height:44px}.cd-sh-head .sp{flex:1}' +
      '.cd-badge{display:inline-flex;align-items:center;gap:5px;height:34px;padding:0 12px;border-radius:999px;background:rgba(255,255,255,.1);border:2px solid currentColor;font-weight:900;font-size:17px;font-family:' + EFONT + '}.cd-badge svg{width:19px;height:19px}' +
      '.cd-hit2{display:inline-flex;align-items:center;height:30px;padding:0 10px;border-radius:999px;background:linear-gradient(180deg,#fff3a8,#ff9d00);color:#4a2b00;font-size:14px;font-weight:900;animation:cdpulse 1.2s infinite}' +
      '.cd-cost2{font-size:17px;font-weight:900;color:#ffe08a;white-space:nowrap;display:inline-flex;align-items:center;gap:2px;font-family:' + EFONT + '}.cd-sheet .cd-hintbtn{min-height:44px;min-width:44px;width:44px;padding:0;border-radius:14px}.cd-sheet .cd-hintbtn svg{flex:0 0 auto}' +
      '.cd-sheet .cd-x{min-height:44px;min-width:64px;padding:0 14px;font-size:15px;border-radius:14px}' +
      '.cd-timer{height:8px;border-radius:5px;background:rgba(255,255,255,.14);overflow:hidden}.cd-timer i{display:block;transform-origin:0 50%;will-change:transform;height:100%;width:100%;background:linear-gradient(90deg,#3ee6a0,#ffc94a,#ff6b81);background-size:300% 100%;border-radius:5px}' +
      '.cd-prompt{display:flex;align-items:center;justify-content:center;gap:12px;min-height:56px;text-align:center}.cd-prompt .pic{font-size:46px;line-height:1;flex:0 0 auto}.cd-prompt .pic img{height:56px;max-width:84px;object-fit:contain}' +
      '.cd-prompt .zh{font-size:clamp(22px,6.5vw,30px);font-weight:900}.cd-prompt .mq{padding-top:6px;font-family:' + EFONT + ';font-weight:900;font-size:clamp(20px,6vw,28px);line-height:1.25;overflow-wrap:anywhere}' +
      '.cd-prompt .sp2{width:44px;height:44px;min-height:44px;min-width:44px;padding:0;border-radius:50%;flex:0 0 auto}' +
      '.cd-slots{display:flex;gap:5px;justify-content:center;flex-wrap:wrap;min-height:44px}.cd-slot{width:var(--sw,34px);height:46px;border-radius:10px;background:rgba(255,255,255,.1);border:2px solid rgba(255,255,255,.35);display:flex;align-items:center;justify-content:center;font-family:' + EFONT + ';font-size:26px;font-weight:900;color:#fff;box-sizing:border-box}' +
      '.cd-slot.cur{border-color:' + G + ';box-shadow:0 0 10px rgba(255,201,74,.6)}.cd-slot.fx{background:none;border-color:transparent;color:#c3cbf7;width:16px}.cd-slot.lk{background:rgba(255,201,74,.18);border-color:' + G + '}' +
      '.cd-slots.ok .cd-slot{background:#14865c;border-color:#7bf2c5}.cd-slots.no .cd-slot{background:#8d2a40;border-color:#ff9fb0}' +
      '.cd-ans{min-width:150px;max-width:100%;height:50px;border-radius:12px;background:rgba(255,255,255,.1);border:2px solid ' + G + ';display:flex;align-items:center;justify-content:center;padding:0 14px;font-family:' + EFONT + ';font-size:28px;font-weight:900;color:#fff;letter-spacing:.04em;box-sizing:border-box}.cd-ans.ph{color:rgba(255,255,255,.35)}' +
      '.cd-slots.ok .cd-ans{background:#14865c;border-color:#7bf2c5}.cd-slots.no .cd-ans{background:#8d2a40;border-color:#ff9fb0}' +
      '.cd-hintrow{display:flex;gap:8px;align-items:center;justify-content:center;min-height:0}.cd-hintrow .gx-btn{min-height:44px;font-size:15px;padding:0 14px}.cd-hint{font-size:15px;color:#ffe08a;text-align:center;line-height:1.35}' +
      '.cd-sheet .gx-pad{position:static;background:none;padding:2px 0 0;gap:5px;left:auto;right:auto;bottom:auto}.cd-sheet .gx-pad.scr .gx-prow{flex-wrap:wrap;max-width:none;justify-content:center}' +
      '.cd-sheet .gx-pad.scr .gx-key{flex:0 0 calc((100% - (var(--kpr,7) - 1) * 5px) / var(--kpr,7));max-width:none;height:48px;font-size:26px}' +
      '.cd-sheet .gx-pad:not(.scr):not(.dig) .gx-key{height:48px}.cd-sheet .gx-pad.dig .gx-key{height:var(--dkh,46px);max-width:110px}.cd-sheet .gx-pad.dig .gx-prow{max-width:380px}.cd-sheet .gx-pad.dig .gx-prow:nth-child(1){flex-wrap:wrap;justify-content:center}.cd-sheet .gx-pad.dig .gx-prow:nth-child(1) .gx-key{flex:0 0 calc((100% - 20px) / 5);max-width:none}.cd-sheet .gx-pad.dig .gx-prow:nth-child(2) .gx-key{max-width:none}' +
      '.cd-kb{display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;font-size:16px;font-weight:900;color:#ffe08a;text-align:center}.cd-kb .gx-emo{font-size:22px}.cd-sheet .cd-kb .gx-btn{min-height:44px;padding:0 18px;font-size:16px}.cd-sheet.kbd .cd-slot.cur,.cd-sheet.kbd .cd-ans{animation:cdcur 1s steps(2,jump-none) infinite}@keyframes cdcur{50%{border-color:#fff}}.cd-fin{text-align:center;font-size:16px;font-weight:900;color:' + G + ';letter-spacing:.04em}' +
      /* landscape */
      '.cd-land .cd-sheet{left:50%;right:0;top:0;bottom:0;border-radius:0 0 0 22px;border-top:0;border-left:2px solid ' + G + ';padding:8px 12px 8px;overflow:auto;gap:5px;animation-name:cdsheetl}@keyframes cdsheetl{from{transform:translateX(40px);opacity:0}to{transform:none;opacity:1}}' +
      '.cd-land .cd-prompt{min-height:44px}.cd-land .cd-prompt .pic{font-size:34px}.cd-land .cd-prompt .pic img{height:42px}.cd-land .cd-prompt .zh{font-size:22px}.cd-land .cd-prompt .mq{font-size:20px}' +
      '.cd-land .cd-slot{height:38px;font-size:22px}.cd-land .cd-ans{height:42px;font-size:24px}.cd-land .cd-sheet .gx-pad.scr .gx-key{height:44px;font-size:22px}.cd-land .cd-sheet .gx-pad:not(.scr):not(.dig) .gx-key{height:44px}.cd-land .cd-sheet .gx-pad{gap:4px;padding-top:0}' +
      '.cd-land .cd-sh-head{min-height:44px}.cd-land .cd-timer{height:6px}.cd-land .cd-sheet{gap:4px}.cd-land .cd-x{min-height:44px}' +
      '.cd-land .cd-minfo{gap:3px}.cd-compact .cd-title .t{padding:5px 9px;font-size:13px}' +
      '.cd-desk .cd-minfo{transform:translateX(-50%) scale(1.3);transform-origin:50% 0}.cd-desk .cd-me{transform:scale(1.18);transform-origin:0 50%}.cd-desk .cd-end{transform:scale(1.18);transform-origin:100% 50%}.cd-desk .cd-end:active{transform:scale(1.18) translateY(2px)}.cd-desk .cd-sheet{font-size:112%}' +
      '.cd-combo{position:absolute;right:10px;top:54px;display:flex;align-items:center;gap:5px;height:32px;padding:0 12px;border-radius:999px;font-size:17px;font-weight:900;color:#3b2600;background:linear-gradient(180deg,#ffe08a,#ffb400);border:2px solid #fff3c0;box-shadow:0 0 14px rgba(255,190,40,.7),0 3px 6px rgba(0,0,0,.4);transform-origin:100% 50%;white-space:nowrap;font-family:' + EFONT + '}.cd-combo small{font-size:12px;font-weight:800;opacity:.85}' +
      '.cd-combo.pop{animation:cdpop .32s cubic-bezier(.2,1.6,.4,1)}@keyframes cdpop{0%{transform:scale(.6)}60%{transform:scale(1.25)}100%{transform:scale(1)}}.cd-combo.hot{background:linear-gradient(180deg,#ffb0d0,#ff5f9a);box-shadow:0 0 18px rgba(255,95,154,.85),0 3px 6px rgba(0,0,0,.4);color:#fff}' +
      '.cd-av.shd{border-color:#7fc0ff;box-shadow:0 0 0 3px rgba(88,170,255,.45),0 0 16px rgba(88,170,255,.9)}.cd-av.low{border-color:#ff6a6a;animation:cdlow 1s ease-in-out infinite}@keyframes cdlow{0%,100%{box-shadow:0 0 0 0 rgba(255,80,100,.0),0 3px 8px rgba(0,0,0,.5)}50%{box-shadow:0 0 0 5px rgba(255,80,100,.45),0 3px 8px rgba(0,0,0,.5)}}.cd-av.heal{animation:cdheal .6s ease-out}@keyframes cdheal{0%{box-shadow:0 0 0 0 rgba(62,230,160,.9)}100%{box-shadow:0 0 0 18px rgba(62,230,160,0)}}' +
      '.cd-card.evo::after{content:"";position:absolute;inset:3% 4%;z-index:3;pointer-events:none;border-radius:9%;background:linear-gradient(115deg,transparent 35%,rgba(255,240,180,.55) 50%,transparent 65%);background-size:250% 100%;animation:cdsheen 2.6s ease-in-out infinite}@keyframes cdsheen{0%{background-position:120% 0}60%,100%{background-position:-60% 0}}' +
      '.cd-rm .cd-card{transition-duration:.12s}' +
      '@media (prefers-reduced-motion:reduce){.cd-combo.pop,.cd-av.low,.cd-av.heal,.cd-card.evo::after,.cd-card.evo .fr,.cd-chip.wk,.cd-hit2,.cd-card .hit,.cd-end.pulse{animation:none!important}.cd-sheet{animation:none}}';
    var st = document.createElement('style'); st.setAttribute('data-wq37', 'card'); st.textContent = css; document.head.appendChild(st);
  }

  /* ------------------------------------------------------------------ the game */
  function start(box, opts) {
    injectCss(); opts = opts || {};
    var diff = clamp((opts.difficulty | 0) || 2, 1, 5), lvl = opts.level || { w: 0, s: 0 }, boss = !!lvl.boss, sIdx = lvl.s | 0;
    var S, G, lay = { cw: 90, ch: 128 }, ready = false, sheet = null, pad = null, ui, el = {}, rng, evRng, handEls = [], backUrl = '';
    var restarts = 0, seed0 = hash('card|' + (lvl.w | 0) + '|' + sIdx + '|' + (opts.subject || '') + '|' + diff);
    var mathMode = opts.subject === 'math' || (opts.items && opts.items[0] && isMath(opts.items[0]));

    S = GX.shell(box, opts, {
      id: 'card', music: boss ? 'boss' : (diff >= 4 ? 'drive' : 'calm'), onRestart: restart, onResize: function () { if (ready) relayout(); },
      onResume: function () { if (G) G.lockUntil = G.clock + 0.1; }, onDestroy: function () { try { S.ui.closeAll(); } catch (e) { /* */ } if (pad) { pad.destroy(); pad = null; } if (cur === api) cur = null; }
    });
    var A = S.assetBase;
    var sfxLog = [], sfx0 = S.sfx; S.sfx = function (n, o2) { sfxLog.push(n); if (sfxLog.length > 120) sfxLog.shift(); sfx0(n, o2); }; /* last sounds, for tests */
    backUrl = A + 'cd_back.webp';
    S.root.classList.toggle('cd-rm', GX.reduced());
    function isTouch() { return S.touch || (typeof matchMedia === 'function' && matchMedia('(pointer:coarse)').matches) || (navigator.maxTouchPoints > 0); }

    /* ---------------- deck / weakness / state */
    function newState() {
      var core = S.learn.items, all = core.concat(S.learn.stats ? Object.keys(S.learn.stats).filter(function (k) { return S.learn.stats[k].rv; }).map(function (k) { return S.learn.stats[k].item; }) : []);
      var ranked = all.slice().sort(function (a, b) { return hash(a.id + '|' + (a.en || a.q)) - hash(b.id + '|' + (b.en || b.q)); }), meta = {};
      ranked.forEach(function (it, i) { var f = featOf(S, it), ty = PATTERN[i % PATTERN.length], cost = costOf0(it, f); if (ty === 'draw') cost = Math.max(1, cost - 1); meta[it.id] = { type: ty, cost: cost, base: basePower(ty, cost, f), f: f }; });
      var st = {
        meta: meta, core: core, phase: 'intro', turn: 0, clock: 0, tl: [], lockUntil: 0, energy: MAX_EN, hp: 0, maxHp: 0, shield: 0, hand: [], discard: [], recycle: [], uid: 0, cast: null, focus: -1,
        combo: 0, maxCombo: 0, score: 0, evo: {}, okN: {}, mon: null, monIdx: 0, intents: [], intent: null, event: null, events: 0, fin: null, wrongFirst: false, ended: false, hintUsed: {}, flights: [], spent: 0, deckSize: all.length
      };
      return st;
    }
    function pickWeak(exclude, salt) {
      var core = G.core, math = isMath(core[0]), kinds = math ? ['odd', 'even', 'big', 'small', 'add', 'sub', 'mul', 'div', 'dec', 'frac'] : ['syl1', 'syl2', 'syl3', 'long', 'short', 'vowel', 'cons'];
      var vals = core.map(function (it) { var f = featOf(S, it); return f.math ? f.v : f.len; }).filter(function (v) { return isFinite(v); }).sort(function (a, b) { return a - b; }), T = vals.length ? (vals.every(function (v) { return Math.floor(v) === v; }) ? Math.floor(vals[Math.floor((vals.length - 1) / 2)]) : Math.round(vals[Math.floor((vals.length - 1) / 2)] * 100) / 100) : 0, n = core.length, best = [], bs = 1e9;
      if (!math) { var seenE = {}, seenS = {}; core.forEach(function (it) { var f = featOf(S, it); if (f.last) seenE[f.last] = 1; if (f.first) seenS[f.first] = 1; }); Object.keys(seenE).sort().forEach(function (l) { kinds.push('end:' + l); }); Object.keys(seenS).sort().forEach(function (l) { kinds.push('start:' + l); }); }
      kinds.forEach(function (k) {
        if (exclude && exclude.indexOf(k) >= 0) return; var c = core.filter(function (it) { return weakHit(k, featOf(S, it), T); }).length; if (c < 1) return;
        var sc = Math.abs(c - n * 0.4) + (c < 2 ? 3 : 0) + (c > n - 2 ? 3 : 0) + (k.indexOf(':') > 0 ? 0.5 : 0); if (sc < bs - 1e-9) { bs = sc; best = [k]; } else if (Math.abs(sc - bs) < 1e-9) best.push(k);
      });
      if (!best.length) best = [math ? 'even' : 'cons'];
      var k2 = best[(hash('w' + salt + '|' + seed0)) % best.length]; return { kind: k2, T: T, label: weakLabel({ kind: k2, T: T }), icon: (WEAK[k2] || [0, ''])[1] };
    }
    function mkMon(idx) {
      var bossM = boss ? BOSS[idx] : MON[hash('m|' + (lvl.w | 0) + '|' + sIdx) % MON.length], n = Math.max(4, G.core.length);
      var base = (boss ? 20 + 2.6 * sIdx : 34 + 4 * sIdx) * DF.hpMul[diff - 1] * Math.pow(n / 8, 0.6), hp = Math.round(base * (boss ? (idx === 0 ? 1 : 1.35) : 1));
      var w = pickWeak(idx ? [G.mon.weak.kind] : null, idx);
      return { img: bossM.img, name: bossM.name, hue: bossM.hue, hp: hp, max: hp, shown: hp, block: 0, weak: w, atk: Math.max(3, Math.round(3 + sIdx * 0.55 + DF.atkAdd[diff - 1] + (idx ? 1.5 : 0))), phase: idx + 1, hitT: 0, lunge: 0, dieT: 0, dying: false, dizzy: false, flash: 0, bornT: 0 };
    }
    function genIntent(turn) {
      var m = G.mon, r = hash('i|' + seed0 + '|' + m.phase + '|' + turn), k = (r + turn) % 5, pat = boss ? ['a', 'a', 'd', 'H', 'a'] : ['a', 'd', 'a', 'a', 'H'], p = turn <= 1 ? 'a' : pat[(turn + (r % 3)) % 5];
      var n = m.atk + (r % 3) - 1; if (turn <= 1) n = Math.max(2, Math.round(m.atk * 0.7)); if (p === 'H') n = Math.round(m.atk * 1.6); if (turn > 8) n += (turn - 8) * 2;
      if (p === 'd') return { kind: 'def', n: Math.max(4, Math.round(m.atk * 1.1) + 1) }; void k; return { kind: 'atk', n: Math.max(2, n), heavy: p === 'H' };
    }

    /* ---------------- DOM */
    function buildUi() {
      ui = document.createElement('div'); ui.className = 'cd-ui'; S.root.appendChild(ui);
      ui.innerHTML = '<button type="button" class="gx-hudbtn cd-pause" aria-label="暫停">' + ico('pause', 22) + '</button><div class="cd-title"><span class="t" data-r="lv"></span></div>' +
        '<div class="cd-piles"><span class="cd-pile" aria-label="抽牌堆"><i class="bk"></i><b data-r="dn">0</b></span><span class="cd-pile" aria-label="棄牌堆">' + ico('replay', 16) + '<b data-r="xn">0</b></span></div>' +
        '<div class="cd-minfo" data-r="minfo"><div class="cd-mname"><span data-r="mname"></span><em data-r="mph"></em><em class="tn" data-r="turn"></em></div><div class="cd-bar mon"><i class="lag" data-r="mlag"></i><i class="fr" data-r="mfr"></i><b data-r="mhp"></b></div><div class="cd-chips"><span class="cd-chip int" data-r="int"></span><span class="cd-chip wk" data-r="wk"></span><span class="cd-chip blk" data-r="blk" hidden></span></div></div>' +
        '<div class="cd-me" data-r="me"><div class="cd-av" data-r="av"></div><div class="cd-mecol"><div class="cd-merow"><div class="cd-bar me"><i class="lag" data-r="plag"></i><i class="fr" data-r="pfr"></i><b data-r="php"></b></div><span class="cd-sh" data-r="psh" hidden>' + ico('shield', 14) + '<b data-r="pshn">0</b></span></div><div class="cd-en" data-r="en" aria-label="能量"></div></div></div>' +
        '<div class="cd-combo" data-r="combo" hidden></div><div class="cd-hand" data-r="hand"></div><button type="button" class="cd-end" data-r="end" aria-label="結束回合"><span>結束回合</span>' + ico('next', 20) + '</button>';
      var q = function (r) { return ui.querySelector('[data-r="' + r + '"]'); };
      ['lv', 'turn', 'dn', 'xn', 'minfo', 'mname', 'mph', 'mlag', 'mfr', 'mhp', 'int', 'wk', 'blk', 'me', 'av', 'plag', 'pfr', 'php', 'psh', 'pshn', 'en', 'hand', 'end', 'combo'].forEach(function (r) { el[r] = q(r); });
      el.pause = ui.querySelector('.cd-pause'); el.pause.onclick = function () { S.openPause(); };
      el.end.onclick = function () { endTurn(); };
      el.en.innerHTML = '<i class="cd-orb"></i><i class="cd-orb"></i><i class="cd-orb"></i><span></span>';
      var ch = opts.character || {}; if (ch.img) { var im = document.createElement('img'); im.src = ch.img; im.alt = ''; im.draggable = false; im.onerror = function () { el.av.textContent = ch.icon || '🐼'; }; el.av.appendChild(im); } else el.av.innerHTML = '<span class="gx-emo">' + esc(ch.icon || '🐼') + '</span>';
      el.lv.textContent = GX.levelText(lvl);
      var testImg = new Image(); testImg.onerror = function () { S.root.classList.add('cd-noimg'); }; testImg.src = A + 'cd_frame_atk.webp'; el.frameTest = testImg;
    }
    var tpl = {};
    function cardTpl(t) { /* one parsed card per type, cloned for every deal: far cheaper than parsing HTML + SVG for each card */
      if (!tpl[t]) { var ty = TY[t], b = document.createElement('button'); b.type = 'button'; b.className = 'cd-card ty-' + t;
        b.innerHTML = '<i class="bgf"></i><i class="fr" style="background-image:url(' + A + ty.frame + ')"></i><div class="in"></div><i class="cost" data-r="cost"></i><b class="pow" data-r="pow" style="color:' + ty.col + '">' + ico2(ty.ic, 12) + '<span></span></b><i class="hit" data-r="hit" hidden>×2</i><span class="pips"><s></s><s></s><s></s></span><i class="rv">' + ico('replay', 13) + '</i><i class="bk" style="background-image:url(' + backUrl + '),linear-gradient(135deg,#3b2a86,#1b1250);background-size:100% 100%"></i>'; tpl[t] = b; }
      return tpl[t].cloneNode(true);
    }
    function cardEl(c) {
      var it = c.item, m = c.meta, ty = TY[m.type], math = isMath(it), f = m.f, b = cardTpl(m.type); if (it.rv) b.className += ' rvc'; b.setAttribute('data-uid', c.uid);
      var art;
      if (math && String(it.q).length > 20) art = '<div class="art"><span class="gx-emo">📖</span></div><div class="zh">應用題</div>';
      else if (math) { var n = String(it.q).length; art = '<div class="q" style="font-size:max(11px,calc(var(--u)*' + (n <= 9 ? 17 : n <= 14 ? 14 : n <= 22 ? 12 : 10.5) + '))">' + esc(it.q) + '</div>'; }
      else { var bx = ''; for (var i = 0; i < f.len; i++) bx += '<s></s>'; art = '<div class="art">' + (it.img ? '<img src="' + esc(it.img) + '" alt="" draggable="false">' : '<span class="gx-emo">' + esc(it.emoji || '🔤') + '</span>') + '</div><div class="zh">' + esc(it.zh) + '</div><div class="bx">' + bx + '</div>'; }
      b.firstChild.nextSibling.nextSibling.innerHTML = art;
      b.onclick = function () { var i = G.hand.indexOf(c); if (i >= 0) selectCard(i); };
      b.onfocus = function () { var i = G.hand.indexOf(c); if (i >= 0) G.focus = i; };
      return b;
    }
    function powerOf(c) { return c.meta.base + (G.evo[c.item.id] ? EVO[c.meta.type] : 0); }
    function costOf(c) { return c.free ? 0 : c.meta.cost; }
    function isHit(c) { return c.meta.type === 'atk' && !!G.mon && weakHit(G.mon.weak.kind, c.meta.f, G.mon.weak.T); }
    function showHint() { return diff <= 3; }
    function syncCard(c) {
      if (!c.el) return; var e = c.el, id = c.item.id, ty = c.meta.type, evo = !!G.evo[id], n = Math.min(3, G.okN[id] || 0), cost = costOf(c), pw = powerOf(c);
      e.querySelector('[data-r="cost"]').textContent = cost; e.querySelector('[data-r="cost"]').classList.toggle('free', !!c.free);
      e.querySelector('[data-r="pow"] span').textContent = (ty === 'draw' ? '+' + (2 + (evo ? 1 : 0)) : pw) + (evo ? '★' : ''); if (evo) e.classList.add('evo'); else e.classList.remove('evo');
      var pips = e.querySelectorAll('.pips s'); for (var i = 0; i < 3; i++) pips[i].classList.toggle('on', i < (evo ? 3 : n));
      var hit = e.querySelector('[data-r="hit"]'), h = isHit(c) && showHint(); hit.hidden = !h; hit.setAttribute('aria-label', '命中弱點');
      e.classList.toggle('dim', cost > G.energy); e.setAttribute('aria-label', (isMath(c.item) ? '算式卡 ' + c.item.q : '單詞卡 ' + c.item.zh) + '，' + TY[ty].name + ' ' + (ty === 'draw' ? '抽牌' : pw) + '，費用 ' + cost + (h ? '，命中弱點' : '') + (evo ? '，進化' : ''));
    }
    function syncHand() { G.hand.forEach(syncCard); }

    /* ---------------- layout */
    function relayout() {
      if (!ready) return; var W = S.W, H = S.H, side = W > H * 1.15 && H < 560; lay.land = side; lay.desk = W > H * 1.15 && H >= 560; S.root.classList.toggle('cd-land', side); S.root.classList.toggle('cd-desk', lay.desk); S.root.classList.toggle('cd-compact', !!S.compact);
      var casting = !!G.cast, sheetH = sheet ? sheet.offsetHeight : 0, colW = Math.min(W, lay.desk ? 760 : 900), colX = (W - colW) / 2;
      if (side) {
        lay.ch = clamp(Math.round(H * 0.3), 84, 128); lay.cw = Math.round(lay.ch * 0.7); lay.endW = 112; lay.endH = 52;
        lay.meW = clamp(Math.round(W * 0.27), 190, 250); lay.meX = 8; lay.meY = H - 8 - 56; lay.meH = 56; lay.endX = W - lay.endW - 8; lay.endY = H - 8 - lay.endH;
        lay.hx0 = lay.meW + 20; lay.hx1 = lay.endX - 10; lay.hb = H - 12;
        var zoneW = casting ? W * 0.5 : W; lay.mx = zoneW / 2; lay.top = casting ? 50 : 8; lay.bot = (casting ? H - 76 : H - lay.ch - 14); lay.infoH = 58;
      } else {
        lay.ch = clamp(Math.round(H * (lay.desk ? 0.24 : 0.2)), 100, lay.desk ? 210 : 152); lay.cw = Math.round(lay.ch * 0.7); lay.endW = 112; lay.endH = 52; lay.meW = lay.desk ? 340 : colW - lay.endW - 24; lay.meX = colX + 8; lay.meH = 58;
        lay.hb = H - 14; lay.meY = lay.hb - lay.ch - (lay.desk ? 16 : 4) - lay.meH; lay.endX = colX + colW - lay.endW - 8; lay.endY = lay.meY + 3; lay.hx0 = (lay.desk ? (W - Math.min(W - 40, 920)) / 2 : 20); lay.hx1 = W - lay.hx0;
        lay.mx = W / 2; lay.top = lay.desk ? 60 : 52; lay.bot = casting ? Math.min(lay.meY - 4, H - sheetH - 6) : lay.meY - 6; lay.infoH = lay.desk ? 108 : 80;
      }
      var areaH = Math.max(60, lay.bot - lay.top - lay.infoH), size = Math.min(areaH * 0.95, side ? (casting ? W * 0.3 : W * 0.34) : Math.min(W * 0.78, lay.desk ? 420 : 340), lay.desk ? 420 : 340); if (areaH < 90) size = Math.max(70, areaH);
      lay.msize = size; lay.my = lay.top + lay.infoH + areaH; /* feet y */ lay.mcy = lay.my - size / 2;
      if (casting && !side) { lay.my = Math.max(lay.top + lay.infoH + 70, lay.bot); lay.mcy = lay.my - size / 2; }
      el.minfo.style.left = lay.mx + 'px'; el.minfo.style.top = Math.max(lay.top, Math.round(lay.my - size - lay.infoH - 2)) + 'px'; el.minfo.style.width = Math.min(W - 16, 300) + 'px';
      el.minfo.firstChild.nextSibling.style.width = Math.min(W - 40, 250) + 'px';
      el.me.style.left = lay.meX + 'px'; el.me.style.top = lay.meY + 'px'; el.me.style.width = lay.meW + 'px'; el.me.style.height = lay.meH + 'px';
      el.end.style.left = lay.endX + 'px'; el.end.style.top = lay.endY + 'px'; el.end.style.width = lay.endW + 'px';
      el.hand.style.visibility = casting ? 'hidden' : ''; el.end.style.visibility = casting && side ? 'hidden' : '';
      lay.deckX = 6; lay.deckY = H - 20; lay.discX = W - 60; lay.discY = H - 20; layoutHand();
      if (sheet) {
        sheet.style.setProperty('--kpr', side ? 8 : 7); if (!sheet._shrunk) sheet.style.setProperty('--dkh', side ? '44px' : (H < 700 ? '44px' : '46px')); sheet.style.paddingLeft = sheet.style.paddingRight = (W < 400 && !side) ? '8px' : '';
        if (!side) { var sw = Math.min(W, 760), sx = (W - sw) / 2; sheet.style.left = sx + 'px'; sheet.style.right = sx + 'px'; if (lay.desk) sheet.style.bottom = '10px', sheet.style.borderRadius = '22px', sheet.style.border = '2px solid #ffc94a'; } else { sheet.style.left = ''; sheet.style.right = ''; }
      }
      lay.pcx = lay.meX + 23; lay.pcy = lay.meY + 23;
    }
    function layoutHand() {
      var n = G.hand.length, span = lay.hx1 - lay.hx0, cw = Math.min(lay.cw, Math.floor(span / (0.8 * Math.max(n, 5) + 0.2))), ch = Math.round(cw / 0.7), step;
      if (n > 1) { step = Math.min(cw * 0.86, (span - cw) / (n - 1)); if (step < 46) { cw = Math.max(54, span - 46 * (n - 1)); ch = Math.round(cw / 0.7); step = Math.min(cw * 0.86, (span - cw) / (n - 1)); } } else step = 0;
      var total = step * (n - 1) + cw, left = lay.hx0 + (span - total) / 2, mid = (n - 1) / 2, rotK = n > 1 ? clamp(16 / n, 1.2, 3.2) : 0;
      el.hand.style.setProperty('--u', (cw / 100) + 'px'); lay.cwE = cw; lay.chE = ch;
      G.hand.forEach(function (c, i) {
        var e = c.el; if (!e || c.flying) return; var off = i - mid, ty = Math.pow(Math.abs(off), 2) * (lay.land ? 1.2 : 2.2), sel = G.cast && G.cast.card === c;
        e.style.width = cw + 'px'; e.style.height = ch + 'px'; e.style.left = (left + i * step) + 'px'; e.style.top = (lay.hb - ch + ty) + 'px';
        e.style.transform = sel ? 'translateY(-' + Math.round(ch * 0.2) + 'px) scale(1.08)' : 'rotate(' + (off * rotK).toFixed(2) + 'deg)'; e.style.zIndex = sel ? 40 : (i + 1); e.classList.toggle('sel', !!sel); e.classList.toggle('foc', G.focus === i && !sel && !isTouch());
        c.px = left + i * step + cw / 2; c.py = lay.hb - ch / 2;
      });
    }

    /* ---------------- hud refresh */
    function hud() {
      if (!ready) return; var m = G.mon;
      el.turn.textContent = G.turn ? '回合 ' + G.turn : ''; el.turn.style.display = G.turn ? '' : 'none';
      el.dn.textContent = drawN(); el.xn.textContent = G.discard.length;
      el.mname.textContent = m.name; el.mph.textContent = boss ? '第 ' + m.phase + ' 階段' : ''; el.mph.style.display = boss ? '' : 'none';
      el.mhp.textContent = Math.max(0, m.hp) + ' / ' + m.max; el.mfr.style.transform = 'scaleX(' + clamp(m.hp / m.max, 0, 1) + ')'; el.mlag.style.transform = 'scaleX(' + clamp(m.hp / m.max, 0, 1) + ')';
      el.php.textContent = G.hp + ' / ' + G.maxHp; el.pfr.style.transform = 'scaleX(' + clamp(G.hp / G.maxHp, 0, 1) + ')'; el.plag.style.transform = 'scaleX(' + clamp(G.hp / G.maxHp, 0, 1) + ')';
      el.psh.hidden = G.shield <= 0; el.pshn.textContent = G.shield;
      var orbs = el.en.querySelectorAll('.cd-orb'); for (var i = 0; i < orbs.length; i++) orbs[i].classList.toggle('off', i >= G.energy); el.en.lastChild.textContent = '能量 ' + G.energy + '/' + MAX_EN;
      /* intent */
      var it = G.intent, ie = el.int, h;
      if (!it || G.phase === 'finisher' || G.phase === 'ended' || m.dizzy) { ie.style.display = 'none'; } else {
        ie.style.display = ''; ie.className = 'cd-chip int' + (it.kind === 'def' ? ' def' : it.kind === 'stun' ? ' stun' : '');
        if (it.kind === 'atk') { var net = Math.max(0, it.n - G.shield); if (G.shield >= it.n) ie.classList.add('safe'); h = ico2('sword', 17) + '<span>' + it.n + '</span>' + (G.shield > 0 ? '<small>→ ' + net + '</small>' : ''); ie.setAttribute('aria-label', '下回合攻擊 ' + it.n + (G.shield ? '，扣護盾後 ' + net : '')); }
        else if (it.kind === 'def') { h = ico('shield', 17) + '<span>' + it.n + '</span>'; ie.setAttribute('aria-label', '下回合護盾 ' + it.n); } else { h = '<span class="gx-emo">💤</span><span>睡著了</span>'; ie.setAttribute('aria-label', '怪物睡著，下回合不行動'); }
        ie.innerHTML = h;
      }
      el.wk.style.display = (G.phase === 'finisher' || G.phase === 'ended' || m.dizzy) ? 'none' : ''; el.wk.innerHTML = '<span class="gx-emo">🎯</span><span>' + esc(m.weak.label) + '</span><small>×2</small>'; el.wk.setAttribute('aria-label', '弱點：' + m.weak.label + '，傷害雙倍');
      el.blk.hidden = !(m.block > 0); el.blk.innerHTML = ico('shield', 17) + '<span>' + m.block + '</span>';
      el.end.disabled = G.phase !== 'player' || !!G.cast; var any = G.hand.some(function (c) { return costOf(c) <= G.energy; }); el.end.classList.toggle('pulse', G.phase === 'player' && !G.cast && !any);
      el.av.classList.toggle('shd', G.shield > 0); el.av.classList.toggle('low', G.hp > 0 && G.hp / G.maxHp <= 0.3 && !G.ended);
      if (G.combo >= 2) { el.combo.hidden = false; el.combo.innerHTML = '<span class="gx-emo">🔥</span><span>連擊 ×' + G.combo + '</span>' + (G.combo >= 2 ? '<small>+' + Math.min(50, G.combo * 10) + '%</small>' : ''); el.combo.classList.toggle('hot', G.combo >= 5); if (G.combo !== G.shownCombo) { el.combo.classList.remove('pop'); void el.combo.offsetWidth; el.combo.classList.add('pop'); } } else el.combo.hidden = true;
      G.shownCombo = G.combo;
      syncHand();
    }
    function drawN() { return S.learn.remaining() + G.recycle.length; }

    /* ---------------- timeline (game clock; frozen while overlays that stop the world are open) */
    function after(sec, fn) { G.tl.push({ t: G.clock + sec, fn: fn }); G.tl.sort(function (a, b) { return a.t - b.t; }); }
    function blocked() { return S.ui.open('learn') || S.ui.open('preview') || S.ui.open('how'); }
    function runTl() { while (G.tl.length && G.tl[0].t <= G.clock) { var x = G.tl.shift(); try { x.fn(); } catch (e) { if (typeof console !== 'undefined') console.error(e); } } }

    /* ---------------- drawing pile */
    function recycleNow() {
      if (!G.discard.length) return false; var seen = {}, inHand = {}, q = 0, p; G.hand.forEach(function (c) { inHand[c.item.id] = 1; }); while ((p = S.learn.peek(q++))) seen[p.id] = 1; G.recycle.forEach(function (c) { seen[c.item.id] = 1; });
      var keep = []; G.discard.forEach(function (c) { if (!seen[c.item.id] && !inHand[c.item.id]) { seen[c.item.id] = 1; keep.push(c.item); } }); G.discard = [];
      GX.shuffle(keep, rng).forEach(function (it) { G.recycle.push({ item: it }); }); if (keep.length) { S.sfx('whoosh'); S.fx.text(lay.discX, lay.deckY - 40, '重洗牌庫', { size: 16, color: '#9fd0ff' }); } return keep.length > 0;
    }
    function takeItem() {
      var it = S.learn.take(); if (it) return it; if (!G.recycle.length) recycleNow(); var r = G.recycle.shift(); return r ? r.item : null;
    }
    function mkCard(it) { var c = { uid: ++G.uid, item: it, meta: G.meta[it.id] }; if (!c.meta) { var f = featOf(S, it), ty = 'atk', cost = costOf0(it, f); c.meta = G.meta[it.id] = { type: ty, cost: cost, base: basePower(ty, cost, f), f: f }; } return c; }
    function drawCards(n, stagger, quiet) {
      var got = 0, i;
      for (i = 0; i < n; i++) {
        if (G.hand.length >= HAND_MAX) { S.fx.text(S.W / 2, lay.hb - lay.ch - 30, '手牌已滿', { size: 16, color: '#ffe08a' }); break; }
        var it = takeItem(); if (!it) break; var c = mkCard(it); G.hand.push(c); got++;
        if (ready) { S.sfx('deal', { delay: i * 0.07 }); mountCard(c, i, stagger); }
      }
      if (ready && !quiet) { layoutHand(); hud(); } return got;
    }
    /* the card DOM is built one card per 45 ms (not five in one frame): the logic hand is complete at once, only the picture arrives in steps */
    function mountCard(c, i, stagger) {
      var run = function () {
        if (S.dead || G.hand.indexOf(c) < 0 || c.el) return;
        c.el = cardEl(c); c.el.style.setProperty('--bd', '0.05s'); c.el.style.left = lay.deckX + 'px'; c.el.style.top = lay.deckY + 'px'; c.el.style.opacity = '0'; c.el.style.transform = 'scale(.4) rotate(-20deg)'; c.el.style.width = lay.cwE + 'px'; c.el.style.height = lay.chE + 'px'; el.hand.appendChild(c.el);
        void c.el.offsetWidth; c.el.style.opacity = ''; layoutHand(); syncCard(c);
        S.later(function () { var b = c.el && c.el.querySelector('.bk'); if (b && b.parentNode) b.parentNode.removeChild(b); }, 450);
      };
      if (stagger && i > 0) S.later(run, i * 45); else run();
    }

    /* ---------------- turn flow */
    function startTurn() {
      if (G.ended) return; G.turn++; G.phase = 'player'; G.energy = MAX_EN; G.shield = 0; G.mon.block = G.mon.block; G.lockUntil = G.clock + 0.25;
      G.intent = genIntent(G.turn); G.event = null;
      drawCards(5, true, true);
      if (G.turn >= 2 && !G.forceNoEvent && (G.forceEvent || hash('ev|' + seed0 + '|' + G.turn) % 100 < 32)) rollEvent(G.forceEvent); G.forceEvent = null;
      G.focus = G.hand.length ? 0 : -1; S.ui.banner(G.turn === 1 ? (boss ? '魔王來襲！' : '戰鬥開始！') : '第 ' + G.turn + ' 回合', G.turn > 8 ? '怪物狂暴中…' : '', 900);
      S.sfx('flip'); if (G.hp / G.maxHp <= 0.3) { S.later(function () { S.sfx('step'); S.sfx('warn'); }, 450); S.fx.text(lay.pcx + 40, lay.pcy - 26, '快撐不住了！用護盾', { color: '#ff9aa8', size: 15, life: 1.4 }); } relayout(); hud();
    }
    function rollEvent(force) {
      var names = ['free', 'stun', 'bless'], ev = force || names[hash('evk|' + seed0 + '|' + G.turn) % 3]; G.event = ev; G.events++;
      if (ev === 'free' && G.hand.length) { var c = G.hand[hash('evc|' + seed0 + '|' + G.turn) % G.hand.length]; c.free = true; S.later(function () { S.ui.banner('幸運星', '一張牌免費！', 1200); S.sfx('coin'); }, 700); }
      else if (ev === 'stun') { G.intent = { kind: 'stun', n: 0 }; S.later(function () { S.ui.banner('怪物睡著了', '這回合安全', 1200); S.sfx('portal'); }, 700); }
      else { G.hp = Math.min(G.maxHp, G.hp + 4); S.later(function () { S.ui.banner('暖光祝福', '回復 4 點', 1200); S.sfx('heal'); S.fx.text(lay.pcx + 40, lay.pcy - 10, '+4', { color: '#3ee6a0', size: 24 }); }, 700); }
    }
    function endTurn(force) {
      if (G.ended || G.phase !== 'player' || (G.cast && !force)) return false; if (!force && blocked()) return false;
      G.phase = 'enemy'; S.sfx('whoosh'); G.focus = -1;
      G.hand.forEach(function (c, i) { G.discard.push(c); if (c.el) flyEl(c, lay.discX, lay.discY, 0.0 + i * 0.03, true); }); G.hand = []; G.cast = null; hud();
      after(0.55, monsterAct); return true;
    }
    function monsterAct() {
      if (G.ended) return; var m = G.mon, it = G.intent || { kind: 'atk', n: m.atk }; m.block = 0;
      if (it.kind === 'stun') { S.fx.text(lay.mx, lay.mcy - lay.msize * 0.4, 'Zzz', { size: 26, color: '#c595ff' }); after(0.8, startTurn); hud(); return; }
      if (it.kind === 'def') { m.block += it.n; S.sfx('shield'); S.fx.ring(lay.mx, lay.mcy, { r1: lay.msize * 0.7, color: '#58aaff', width: 5 }); S.fx.text(lay.mx, lay.mcy - lay.msize * 0.45, '+' + it.n + ' 護盾', { color: '#9fd0ff', size: 24 }); hud(); after(0.9, startTurn); return; }
      m.lunge = 1; S.sfx('warn');
      after(0.28, function () {
        if (G.ended) return; var dmg = it.n, ab = Math.min(G.shield, dmg), rest = dmg - ab; G.shield -= ab; G.hp = Math.max(0, G.hp - rest);
        S.sfx(rest > 0 ? 'boom' : 'shield'); if (rest > 0) { S.sfx('hit'); if (ab > 0) S.later(function () { S.sfx('shield'); }, 90); } S.fx.shake(rest > 0 ? (rest >= 8 ? 8 : 6) : 3, .3); if (rest > 0) { S.fx.flash('#ff4060', .3); el.av.classList.remove('hurt'); void el.av.offsetWidth; el.av.classList.add('hurt'); }
        S.fx.burst(lay.pcx + 20, lay.pcy, { n: rest > 0 ? 16 : 8, colors: rest > 0 ? ['#ff6a6a', '#fff', '#ffc94a'] : ['#58aaff', '#fff'], speed: 160 });
        S.fx.text(lay.pcx + 30, lay.pcy - 24, rest > 0 ? '-' + rest : '擋住！', { color: rest > 0 ? '#ff7a8a' : '#9fd0ff', size: 28 }); if (ab > 0 && rest > 0) S.fx.text(lay.pcx + 30, lay.pcy - 54, '擋 ' + ab, { color: '#9fd0ff', size: 18 });
        hud(); if (G.hp <= 0) { defeat(); return; } after(0.8, startTurn);
      });
    }
    function defeat() {
      if (G.ended) return; G.ended = true; G.phase = 'ended'; S.sfx('lose'); S.fx.flash('#ff4060', .4); G.cast && closeSheet(false); G.cast = null; hud();
      after(0.8, function () { S.finish({ cleared: false, score: G.score, maxCombo: G.maxCombo, seconds: S.t }); });
    }
    function victory() {
      if (G.ended) return; G.ended = true; G.phase = 'ended'; var m = G.mon; m.dizzy = false; G.cast && closeSheet(true); G.cast = null;
      after(0.3, function () { m.dying = true; m.dieT = 0.001; S.sfx('boom'); S.fx.shake(6, .3); S.sfx(boss ? 'bossdie' : 'kill', { t: 1 }); S.fx.burst(lay.mx, lay.mcy, { n: 40, speed: 260, colors: ['#ffc94a', '#fff', '#ff5fa2', '#3ee6d0'], shape: 'star', size: 6 }); S.fx.ring(lay.mx, lay.mcy, { r1: lay.msize, color: '#ffc94a', width: 6 }); S.fx.ring(lay.mx, lay.mcy, { r1: lay.msize * 1.5, color: '#ffffff', width: 3, life: .7 }); S.fx.confetti(S.W, { n: boss ? 80 : 40 }); if (boss) S.later(function () { S.fx.burst(lay.mx, lay.mcy, { n: 30, speed: 300, colors: ['#c595ff', '#ffc94a', '#fff'], shape: 'star', size: 7 }); }, 260); });
      hud(); after(1.3, function () { S.finish({ cleared: true, score: G.score, maxCombo: G.maxCombo, seconds: S.t }); });
    }
    function onMonsterDown() {
      var m = G.mon;
      if (boss && m.phase === 1) {
        G.phase = 'transition'; S.sfx('boss'); S.fx.shake(8, .5); S.fx.flash('#ffffff', .5); S.fx.burst(lay.mx, lay.mcy, { n: 36, speed: 240, shape: 'star', colors: ['#ffc94a', '#fff', '#c595ff'], size: 6 });
        after(0.5, function () { var nm = mkMon(1); G.mon = nm; G.monIdx = 1; nm.bornT = 1; G.intent = genIntent(G.turn); G.phase = G.cast ? 'player' : 'player'; S.ui.banner('第二階段！', '弱點換了：' + nm.weak.label, 1800); hud(); relayout(); });
        G.phase = 'transition'; return;
      }
      if (S.learn.progress().done >= S.learn.total()) { victory(); return; }
      /* last strike: the unanswered items must still be answered */
      m.dizzy = true; G.phase = 'finisher'; G.hand.forEach(function (c, i) { if (c.el) flyEl(c, lay.discX, lay.discY, i * 0.03, true); G.discard.push(c); }); G.hand = []; G.cast = null;
      S.ui.banner('最後一擊！', '把餘下的題目答完', 1500); S.sfx('power'); hud(); relayout(); after(1.0, nextFinisher);
    }
    function finList() { return G.core.filter(function (it) { return !S.learn.stats[it.id].ok; }); }
    function nextFinisher() {
      if (G.ended || G.cast) return; var list = finList(); if (!list.length) { victory(); return; }
      var f = G.fin || (G.fin = { total: list.length, left: list.length, last: null, cool: 0, k: 0 }); f.left = list.length;
      /* after a miss, ask 1-2 already solved items first (revisit), so the missed word is never asked straight after its learn card */
      if (f.cool > 0) {
        var solved = G.core.filter(function (it) { return S.learn.stats[it.id].ok && it.id !== f.last; });
        if (solved.length) { f.cool--; var fl = solved[(f.k++) % solved.length]; openCast(null, fl, true); return; }
        f.cool = 0; if (!f.breathed) { f.breathed = true; S.ui.banner('深呼吸，再試一次', '', 1500); after(1.5, nextFinisher); return; }
      }
      var it = list[(f.last === list[0].id && list.length > 1) ? 1 : 0]; f.last = it.id; f.breathed = false; openCast(null, it);
    }

    /* ---------------- card flight / effects */
    function flyEl(c, x, y, delay, fade) {
      var e = c.el; if (!e) return; c.flying = true; var r = e.getBoundingClientRect(), rr = S.root.getBoundingClientRect(), sx = r.left - rr.left, sy = r.top - rr.top;
      e.classList.add('fly'); e.style.transitionDelay = (delay || 0) + 's'; e.style.left = (x - r.width / 2) + 'px'; e.style.top = (y - r.height / 2) + 'px'; e.style.transform = 'scale(.35) rotate(' + (x > sx ? 20 : -20) + 'deg)'; e.style.opacity = fade ? '0' : '0.02';
      G.flights.push({ x0: sx + r.width / 2, y0: sy + r.height / 2, x1: x, y1: y, t: -(delay || 0), col: TY[c.meta.type].col });
      S.later(function () { if (e.parentNode) e.parentNode.removeChild(e); }, 450 + (delay || 0) * 1000); c.el = null;
    }
    function monCenter() { return { x: lay.mx, y: lay.mcy }; }
    function calcEffect(c) {
      var ty = c.meta.type, evo = !!G.evo[c.item.id], base = powerOf(c), hit = isHit(c), cm = 1 + 0.1 * Math.min(5, Math.max(0, G.combo)), v;
      if (ty === 'draw') return { type: ty, base: 2, hit: false, cm: 1, evo: evo, value: 2 + (evo ? 1 : 0) };
      v = Math.max(1, Math.round(base * (ty === 'atk' && hit ? 2 : 1) * cm)); return { type: ty, base: base, hit: hit, cm: cm, evo: evo, value: v };
    }
    function applyEffect(c, eff) {
      var m = G.mon, mc = monCenter(), ty = eff.type;
      if (ty === 'atk') {
        flyEl(c, mc.x, mc.y, 0, true); S.sfx('shoot');
        var ab0 = Math.min(m.block, eff.value), rest0 = eff.value - ab0; m.block -= ab0; m.hp = Math.max(0, m.hp - rest0); eff.dealt = rest0; eff.blocked = ab0; /* logic is immediate; the hit visuals land with the card */
        S.later(function () {
          var ab = eff.blocked, rest = eff.dealt; m.hitT = 1; m.flash = 1;
          S.sfx(eff.hit ? 'boom' : 'hit'); if (eff.hit) S.sfx('zap'); S.fx.shake(eff.hit ? 7 : 3, .25); S.fx.flash(eff.hit ? '#fff3a8' : '#ffffff', eff.hit ? .32 : .16);
          S.fx.burst(mc.x, mc.y, { n: eff.hit ? 26 : 12, colors: eff.hit ? ['#ffc94a', '#fff', '#ff9d00'] : ['#fff', '#ff9a9a'], speed: eff.hit ? 260 : 190, shape: eff.hit ? 'star' : 'c', size: eff.hit ? 6 : 4 }); S.fx.ring(mc.x, mc.y, { r1: lay.msize * (eff.hit ? 0.7 : 0.5), color: eff.hit ? '#ffc94a' : '#ffffff' });
          S.fx.text(mc.x, mc.y - lay.msize * 0.15, rest > 0 || !ab ? '-' + rest : '擋住', { color: eff.hit ? '#ffd35a' : '#ffffff', size: eff.hit ? 38 : 30 });
          if (ab > 0) S.fx.text(mc.x + 40, mc.y - lay.msize * 0.3, '護盾 -' + ab, { color: '#9fd0ff', size: 16 }); if (eff.hit) S.fx.text(mc.x, mc.y - lay.msize * 0.42, '弱點 ×2！', { color: '#fff3a8', size: 22, life: 1.1 });
          hud();
        }, 280);
        if (m.hp <= 0 && !m.dying) { onMonsterDown(); }
      } else if (ty === 'def') {
        flyEl(c, lay.pcx, lay.pcy, 0, true); S.sfx('pop'); G.shield += eff.value; S.later(function () { S.sfx('shield'); S.fx.ring(lay.pcx, lay.pcy, { r1: 56, color: '#58aaff', width: 5 }); S.fx.burst(lay.pcx, lay.pcy, { n: 14, colors: ['#58aaff', '#cfe6ff'], speed: 120 }); S.fx.text(lay.pcx + 34, lay.pcy - 26, '+' + eff.value + ' 護盾', { color: '#9fd0ff', size: 22 }); hud(); }, 260);
      } else if (ty === 'heal') {
        flyEl(c, lay.pcx, lay.pcy, 0, true); S.sfx('pop'); var before = G.hp; G.hp = Math.min(G.maxHp, G.hp + eff.value); eff.dealt = G.hp - before; S.later(function () { S.sfx('heal'); el.av.classList.remove('heal'); void el.av.offsetWidth; el.av.classList.add('heal'); S.fx.ring(lay.pcx, lay.pcy, { r1: 44, color: '#3ee6a0', width: 4 }); S.fx.burst(lay.pcx, lay.pcy, { n: 16, colors: ['#3ee6a0', '#fff', '#a8ffd8'], speed: 110, grav: -60 }); S.fx.text(lay.pcx + 34, lay.pcy - 26, '+' + eff.dealt, { color: '#5af0b0', size: 26 }); hud(); }, 260);
      } else {
        flyEl(c, S.W / 2, lay.hb - lay.ch * 1.3, 0, true); S.later(function () { S.sfx('power'); S.fx.burst(S.W / 2, lay.hb - lay.ch, { n: 16, colors: ['#c595ff', '#fff', '#ffc94a'], shape: 'star', size: 5 }); }, 220);
        if (eff.evo) G.energy = Math.min(MAX_EN, G.energy + 1); drawCards(eff.value, true); S.fx.text(S.W / 2, lay.hb - lay.ch * 1.6, '抽 ' + eff.value + ' 張', { color: '#d9b8ff', size: 22 });
      }
    }

    /* ---------------- casting (solve first) */
    function distractors(en, n) {
      var have = {}, out = [], abc = 'abcdefghijklmnopqrstuvwxyz'.split(''), r = GX.rng(hash('d|' + en + '|' + seed0)); en.toLowerCase().split('').forEach(function (ch) { have[ch] = 1; });
      var conf = { b: 'd', d: 'b', p: 'q', q: 'p', m: 'n', n: 'm', u: 'v', v: 'u' }; Object.keys(have).forEach(function (ch) { var c = conf[ch]; if (c && !have[c] && out.length < n && diff >= 2) { out.push(c); have[c] = 1; } });
      var pool = GX.shuffle(abc.filter(function (ch) { return !have[ch]; }), r); while (out.length < n && pool.length) out.push(pool.shift()); return out;
    }
    function openCast(card, finItem, filler) {
      var it = finItem || card.item, math = isMath(it), cs = { card: card, item: it, math: math, fin: !!finItem, filler: !!filler, buf: '', locked: 0, hinted: false, t: 0, done: false, hintShown: false };
      var cm = card ? card.meta.cost : (G.meta[it.id] ? G.meta[it.id].cost : 2), f = featOf(S, it);
      if (!math) {
        cs.target = String(it.en); cs.slotsN = cs.target.replace(/[^A-Za-z]/g, '').length; cs.len = f.len;
        if (diff <= 2 && cs.slotsN > 1) { cs.buf = cs.target.replace(/[^A-Za-z]/g, '').charAt(0).toLowerCase(); cs.locked = 1; }
        if (diff >= 4) cs.limit = (diff === 4 ? 7 + 0.8 * cs.slotsN : 5 + 0.6 * cs.slotsN);
      } else { cs.limit = diff <= 3 ? 15 + cm * 10 : (diff === 4 ? 12 + cm * 9 : 9 + cm * 6.5); }
      cs.left = cs.limit || 0; G.cast = cs; if (card) G.focus = G.hand.indexOf(card);
      buildSheet(cs); S.sfx('card'); S.sfx('flip'); if (card && card.px != null) { S.fx.ring(card.px, card.py - lay.chE * 0.3, { r0: 8, r1: 50, color: TY[card.meta.type].col, life: .3, width: 3 }); S.fx.burst(card.px, card.py - lay.chE * 0.3, { n: 6, colors: [TY[card.meta.type].col, '#fff'], speed: 90, life: .35 }); }
      if (!math) S.later(function () { if (G.cast === cs && !cs.done) S.say(it); }, 120); hud();
    }
    function slotsHTML(cs) {
      if (cs.math) return '<div class="cd-ans ph" data-r="ans">?</div>';
      var n = cs.target.length, sw = clamp(Math.floor((S.W - 28 - (n - 1) * 5) / Math.max(1, n)), 22, 38), h = '', k = 0;
      for (var i = 0; i < n; i++) { var ch = cs.target.charAt(i), isL = /[A-Za-z]/.test(ch); h += isL ? '<span class="cd-slot" data-i="' + k++ + '" style="--sw:' + sw + 'px"></span>' : '<span class="cd-slot fx">' + (ch === ' ' ? '' : esc(ch)) + '</span>'; }
      return h;
    }
    function buildSheet(cs) {
      closeSheet(null, true); var it = cs.item, ty = cs.card ? cs.card.meta.type : 'atk', T = TY[ty], math = cs.math, eff = cs.card ? calcEffect(cs.card) : null;
      sheet = document.createElement('div'); sheet.className = 'cd-sheet'; sheet.setAttribute('role', 'dialog'); sheet.setAttribute('aria-label', '解題出牌');
      var hb = diff === 3 ? '<button type="button" class="gx-btn ghost cd-hintbtn" data-r="hint" aria-label="提示">' + ico('sparkle', 22) + '</button>' : '';
      var head = cs.card ? '<span class="cd-badge" style="color:' + T.col + '">' + ico2(T.ic, 19) + '<span>' + (ty === 'draw' ? '+' + eff.value : eff.base) + '</span></span>' + (eff.hit && showHint() ? '<span class="cd-hit2">弱點 ×2</span>' : '') + '<span class="cd-cost2" aria-label="耗能 ' + costOf(cs.card) + '"><span class="gx-emo">⚡</span>' + costOf(cs.card) + '</span><span class="sp"></span>' + hb + '<button type="button" class="gx-btn ghost cd-x" data-r="x">取消</button>' : '<span class="cd-fin" data-r="fin"></span><span class="sp"></span>' + hb;
      var prompt = math ? '<div class="mq">' + esc(it.q) + '</div>' : '<div class="pic">' + (it.img ? '<img src="' + esc(it.img) + '" alt="" draggable="false">' : '<span class="gx-emo">' + esc(it.emoji || '🔤') + '</span>') + '</div><div class="zh">' + esc(it.zh) + '</div><button type="button" class="gx-btn ghost sp2" data-r="say" aria-label="播放讀音">' + ico('speaker', 22) + '</button>';
      sheet.innerHTML = '<div class="cd-sh-head">' + head + '</div>' + (cs.limit ? '<div class="cd-timer" aria-label="剩餘時間"><i data-r="tm"></i></div>' : '') + '<div class="cd-prompt">' + prompt + '</div><div class="cd-slots" data-r="slots">' + slotsHTML(cs) + '</div><div class="cd-hintrow" data-r="hr"></div>' + ((isTouch() || S.touch) ? '' : '<div class="cd-kb" data-r="kb"><span class="gx-emo">⌨</span><span>' + (math ? '用鍵盤打字，按 Enter 確定' : '用鍵盤打字') + '</span>' + (math ? '<button type="button" class="gx-btn" data-r="go">確定</button>' : '') + '</div>');
      if (!(isTouch() || S.touch)) sheet.classList.add('kbd');
      S.root.appendChild(sheet); var q = function (r) { return sheet.querySelector('[data-r="' + r + '"]'); }; cs.q = q;
      if (q('go')) q('go').onclick = function () { submitText(); }; if (q('x')) q('x').onclick = function () { cancelCast(); }; if (q('say')) q('say').onclick = function () { S.say(it); S.sfx('tap'); };
      if (cs.fin) q('fin').textContent = cs.filler ? '先溫習一下' : '最後一擊 ' + (G.fin.total - G.fin.left + 1) + ' / ' + G.fin.total;
      /* hint */
      var hr = q('hr');
      if (math && diff <= 2 && it.hint) { hr.innerHTML = '<div class="cd-hint">' + esc(it.hint) + '</div>'; cs.hintShown = true; }
      if (q('hint')) q('hint').onclick = function () { useHint(); };
      if (!hr.innerHTML) hr.style.display = 'none';
      /* pad */
      var pm = math ? (it.pad === 'frac' ? 'frac' : 'digits') : 'letters';
      if (pad) { pad.destroy(); pad = null; }
      if (isTouch() || S.touch) {
        pad = GX.pad(sheet, { mode: pm, enter: math, onKey: function (k) { typeChar(k, true); }, onBack: function () { backspace(); }, onEnter: function () { submitText(); } });
        if (!math && diff <= 3) { var letters = cs.target.toLowerCase().replace(/[^a-z]/g, '').split(''), ds = distractors(cs.target.toLowerCase().replace(/[^a-z]/g, ''), DF.distract[diff - 1]); pad.setKeys(GX.shuffle(letters.concat(ds), GX.rng(hash('k|' + it.id + '|' + seed0)))); }
        else if (!math) pad.setKeys(null);
      }
      refreshSlots(); relayout(); fitPrompt();
      if (cs.limit) updateTimer();
    }
    /* the whole question must be readable without scrolling: shrink the type (then the keys) until the sheet fits */
    function fitPrompt() {
      if (!sheet) return; var mq = sheet.querySelector('.mq'); if (!mq) return; var side = lay.land, fs = side ? 20 : 26, lim, over;
      mq.style.maxHeight = 'none'; mq.style.overflow = 'visible';
      over = function () { return side ? sheet.scrollHeight > sheet.clientHeight + 1 : sheet.offsetHeight > S.H - lay.top - lay.infoH - 64; };
      for (; fs >= 11; fs--) { mq.style.fontSize = fs + 'px'; if (!over()) break; }
      if (over()) { sheet._shrunk = true; if (!side) sheet.style.setProperty('--dkh', '36px'); for (fs = 11; fs >= 10 && over(); fs--) mq.style.fontSize = fs + 'px'; }
      lim = null; if (!side) relayout();
    }
    function refreshSlots() {
      var cs = G.cast; if (!cs || !sheet) return;
      if (cs.math) { var a = sheet.querySelector('[data-r="ans"]'); a.textContent = cs.buf || '?'; a.classList.toggle('ph', !cs.buf); return; }
      var slots = sheet.querySelectorAll('.cd-slot:not(.fx)'); for (var i = 0; i < slots.length; i++) { slots[i].textContent = (cs.buf.charAt(i) || '').toUpperCase(); slots[i].classList.toggle('cur', i === cs.buf.length); slots[i].classList.toggle('lk', i < cs.locked); }
    }
    function composeText(cs) { if (cs.math) return cs.buf; var k = 0, out = ''; for (var i = 0; i < cs.target.length; i++) { var ch = cs.target.charAt(i); if (/[A-Za-z]/.test(ch)) out += cs.buf.charAt(k++) || ''; else out += ch; } return out; }
    function typeChar(k, fromPad) {
      var cs = G.cast; if (!cs || cs.done || S.paused) return false; k = String(k);
      if (cs.math) { if (!/^[0-9.\/\-]$/.test(k) || cs.buf.length >= 12) return false; cs.buf += k; S.sfx('key', { i: cs.buf.length }); refreshSlots(); return true; }
      if (!/^[a-zA-Z]$/.test(k) || cs.buf.length >= cs.slotsN) return false; cs.buf += k.toLowerCase(); S.sfx('key', { i: cs.buf.length }); if (pad && fromPad) pad.flash(k.toLowerCase(), 'ok'); refreshSlots();
      if (cs.buf.length >= cs.slotsN) submitText(); return true;
    }
    function backspace() { var cs = G.cast; if (!cs || cs.done) return false; if (cs.buf.length <= cs.locked) return false; cs.buf = cs.buf.slice(0, -1); S.sfx('tap'); refreshSlots(); return true; }
    function submitText() {
      var cs = G.cast; if (!cs || cs.done) return false; if (cs.math && !cs.buf) return false; if (!cs.math && cs.buf.length < cs.slotsN) return false;
      var txt = composeText(cs);
      if (cs.math && typeof cs.item.detail === 'function') {
        var det = null; try { det = cs.item.detail(txt); } catch (e) { det = null; }
        if (det && !det.ok && det.why === 'empty') return false;
        if (det && !det.ok && det.why === 'form') { /* right value, wrong way of writing it: no penalty, say so, let the child rewrite */
          cs.buf = ''; refreshSlots(); S.sfx('tap'); var hrr = sheet && sheet.querySelector('[data-r="hr"]'); if (hrr) { hrr.style.display = ''; hrr.innerHTML = '<div class="cd-hint form">' + esc(det.msg || '數值對了，請換個寫法') + '</div>'; relayout(); fitPrompt(); }
          S.fx.text(S.W / 2, S.H * 0.3, '數值對了！', { color: '#3ee6a0', size: 24 }); return true;
        }
        if (det) { answerCast(!!det.ok, txt); return true; }
      }
      answerCast(S.learn.judge(cs.item, txt), txt); return true;
    }
    function markNonFirst(it) { if (S.learn.assisted) S.learn.assisted(it); }
    function useHint() {
      var cs = G.cast; if (!cs || cs.done || cs.hintShown && cs.math) return false; cs.hinted = true; G.hintUsed[cs.item.id] = 1; markNonFirst(cs.item); S.sfx('power');
      if (cs.math) { var h = cs.item.hint || ('答案有 ' + GX.norm(cs.item.a).length + ' 個字'); var hrr = sheet.querySelector('[data-r="hr"]'); hrr.style.display = ''; hrr.innerHTML = '<div class="cd-hint">' + esc(h) + '</div>'; cs.hintShown = true; var hb2 = sheet.querySelector('[data-r="hint"]'); if (hb2) hb2.disabled = true; }
      else { var t = cs.target.replace(/[^A-Za-z]/g, '').toLowerCase(); if (cs.buf !== t.slice(0, cs.buf.length) || cs.buf.length >= cs.slotsN - 1) cs.buf = t.charAt(0); else cs.buf = t.slice(0, cs.buf.length + 1); cs.locked = Math.max(cs.locked, cs.buf.length); refreshSlots(); var hbn = sheet.querySelector('[data-r="hint"]'); if (hbn) hbn.disabled = true; }
      relayout(); return true;
    }
    function updateTimer() { var cs = G.cast; if (!cs || !cs.limit || !sheet) return; var t = sheet.querySelector('[data-r="tm"]'); if (t) t.style.transform = 'scaleX(' + clamp(cs.left / cs.limit, 0, 1) + ')'; }
    function closeSheet(ok, instant) {
      if (pad) { pad.destroy(); pad = null; } if (!sheet) return; var sh = sheet; sheet = null; if (instant) { if (sh.parentNode) sh.parentNode.removeChild(sh); return; }
      var sl = sh.querySelector('[data-r="slots"]'); if (sl && ok !== null) sl.classList.add(ok ? 'ok' : 'no'); sh.classList.add('out'); S.later(function () { if (sh.parentNode) sh.parentNode.removeChild(sh); }, 230);
    }
    function cancelCast() {
      var cs = G.cast; if (!cs || cs.fin) return false; G.cast = null; closeSheet(null); S.sfx('tap'); relayout(); hud(); return true;
    }
    function removeFromHand(c) { var i = G.hand.indexOf(c); if (i >= 0) G.hand.splice(i, 1); }
    function answerCast(ok, typed) {
      var cs = G.cast; if (!cs || cs.done) return; cs.done = true; var it = cs.item, ms = Math.round(cs.t * 1000), card = cs.card; G.cast = null;
      if (cs.hinted) markNonFirst(it);
      if (cs.fin) { closeSheet(ok); return finAnswer(it, ok, typed, ms, cs.filler); }
      closeSheet(ok); relayout(); removeFromHand(card); G.energy = Math.max(0, G.energy - costOf(card)); G.spent += costOf(card); G.focus = Math.min(G.focus, G.hand.length - 1);
      var out = S.learn.answer(it, !!ok, ms), eff = null;
      if (ok) {
        eff = calcEffect(card); G.combo++; G.maxCombo = Math.max(G.maxCombo, G.combo); G.okN[it.id] = (G.okN[it.id] || 0) + 1; G.score += (eff.hit ? 150 : 100) + G.combo * 10; G.discard.push(card);
        S.sfx(eff.hit ? 'great' : 'good'); if (G.combo >= 2) S.sfx('combo', { n: G.combo }); S.ui.ok(it, { ms: 900, top: Math.round(lay.mcy - 24) });
        if (G.combo === 3 || G.combo === 5 || G.combo === 8 || (G.combo > 8 && G.combo % 5 === 0)) { var cmb = G.combo; S.later(function () { S.sfx('streak', { n: cmb }); S.sfx('coin'); S.fx.ring(S.W / 2, lay.mcy, { r1: lay.msize * 0.9, color: cmb >= 5 ? '#ff5fa2' : '#ffc94a', width: 5, life: .6 }); S.fx.burst(S.W / 2, lay.mcy, { n: 10 + cmb * 2, shape: 'star', colors: ['#ffc94a', '#fff', '#ff5fa2'], size: 6, speed: 220 }); S.fx.text(S.W / 2, lay.mcy + lay.msize * 0.32, cmb >= 8 ? '連擊爆發！' : cmb >= 5 ? '超強連擊！' : '連擊！', { color: '#fff3a8', size: 28, life: 1.1 }); }, 380); }
        var wasEvo = !!G.evo[it.id]; if (!wasEvo && G.okN[it.id] >= 3) { G.evo[it.id] = true; S.later(function () { S.sfx('power'); S.fx.text(S.W / 2, S.H * 0.5, '★ 進化！', { color: '#ffd35a', size: 30, life: 1.2 }); S.fx.burst(S.W / 2, S.H * 0.55, { n: 24, shape: 'star', colors: ['#ffc94a', '#fff'], size: 6 }); }, 500); }
        applyEffect(card, eff); G.lockUntil = G.clock + 0.3; layoutHand(); hud();
      } else {
        G.combo = 0; if (card.el) { card.el.classList.add('brk'); var be = card.el; S.later(function () { if (be.parentNode) be.parentNode.removeChild(be); }, 650); card.el = null; } G.discard.push({ item: it, meta: card.meta, broken: true, uid: card.uid });
        S.sfx('bad'); S.fx.shake(3, .2); S.fx.flash('#ff4060', .18); S.fx.text(S.W / 2, S.H * 0.45, '牌破損了…', { color: '#ff8a9a', size: 26 });
        if (opts.character && opts.character.perk === 'shield' && !G.wrongFirst) { G.wrongFirst = true; G.energy = Math.min(MAX_EN, G.energy + costOf(card)); S.fx.text(S.W / 2, S.H * 0.52, (opts.character.name||'角色')+'守護：能量退還', { color: '#9fd0ff', size: 16 }); }
        G.phase = 'player'; layoutHand(); hud(); S.ui.learn(it, { typed: !isMath(it) ? typed : '', onDone: function () { G.lockUntil = G.clock + 0.2; hud(); } });
        void out;
      }
    }
    function finAnswer(it, ok, typed, ms, filler) {
      var out = S.learn.answer(it, !!ok, ms), mc = monCenter(), f = G.fin;
      if (filler) { /* revisit of a solved item: no blow, still a real question */
        if (ok) { G.okN[it.id] = (G.okN[it.id] || 0) + 1; S.sfx('good'); S.ui.ok(it, { ms: 900, top: Math.round(lay.mcy - 24) }); after(0.7, nextFinisher); }
        else { G.combo = 0; S.sfx('bad'); S.fx.flash('#ff4060', .18); S.ui.learn(it, { typed: !isMath(it) ? typed : '', onDone: function () { after(0.15, nextFinisher); } }); }
        hud(); return;
      }
      if (ok) {
        G.combo++; G.maxCombo = Math.max(G.maxCombo, G.combo); G.okN[it.id] = (G.okN[it.id] || 0) + 1; G.score += 100 + G.combo * 10; S.sfx('great'); S.ui.ok(it, { ms: 900, top: Math.round(lay.mcy - 24) }); S.sfx('boom'); S.fx.shake(4, .2); S.fx.burst(mc.x, mc.y, { n: 18, colors: ['#ffc94a', '#fff'], shape: 'star', size: 5 }); S.fx.text(mc.x, mc.y - 10, '最後一擊！', { color: '#ffd35a', size: 26 });
        G.mon.hitT = 1; G.mon.flash = 1; f.left = finList().length; if (!f.left) { victory(); return; } after(0.8, nextFinisher);
      } else {
        G.combo = 0; S.sfx('bad'); S.fx.flash('#ff4060', .18); f.left = finList().length; f.cool = 2; S.ui.learn(it, { typed: !isMath(it) ? typed : '', onDone: function () { after(0.15, nextFinisher); } });
      } void out; hud();
    }
    function selectCard(i, force) {
      if (!force && (G.phase !== 'player' || G.cast || blocked() || G.ended || S.paused || G.clock < G.lockUntil || S.ui.open('result') || S.ui.open('pause'))) return false;
      if (G.phase !== 'player' || G.cast || G.ended) return false; var c = G.hand[i]; if (!c) return false;
      if (costOf(c) > G.energy) { if (c.el) { c.el.classList.remove('no'); void c.el.offsetWidth; c.el.classList.add('no'); } S.sfx('keybad'); S.fx.text(S.W / 2, lay.meY - 10, '能量不足', { color: '#ffe08a', size: 18 }); return false; }
      openCast(c); return true;
    }

    /* ---------------- update / draw */
    function update(dt) {
      if (!ready) return; var m = G.mon;
      m.hitT = Math.max(0, m.hitT - dt * 3); m.lunge = Math.max(0, m.lunge - dt * 2.4); m.flash = Math.max(0, m.flash - dt * 4); m.bornT = Math.max(0, m.bornT - dt * 1.5); if (m.dying && m.dieT > 0) m.dieT = Math.min(1, m.dieT + dt * 1.1);
      m.shown += (m.hp - m.shown) * Math.min(1, dt * 8);
      var i, f; for (i = G.flights.length - 1; i >= 0; i--) { f = G.flights[i]; f.t += dt; if (f.t > 0) { var k = Math.min(1, f.t / 0.3); S.fx.trail(f.x0 + (f.x1 - f.x0) * k, f.y0 + (f.y1 - f.y0) * k, f.col, 4); } if (f.t > 0.32) G.flights.splice(i, 1); }
      if (blocked() || S.ui.open('pause')) return;
      G.clock += dt; runTl();
      var cs = G.cast; if (cs && !cs.done) { cs.t += dt; if (cs.limit) { var before = Math.ceil(cs.left); cs.left -= dt; updateTimer(); if (cs.left <= 3 && Math.ceil(cs.left) !== before && cs.left > 0) S.sfx('tick'); if (cs.left <= 0) { var txt = composeText(cs); cs.left = 0; S.fx.text(S.W / 2, S.H * 0.3, '時間到！', { color: '#ff8a9a', size: 28 }); answerCast(false, txt); } } }
    }
    var bgCache = null, bgKey = '';
    /* the backdrop lives on its own canvas behind the game canvas and is repainted only when the size, DPR or art changes (not every frame) */
    var bgcv = null, bgDone = '';
    function paintBg(W, H) {
      if (!bgcv) { bgcv = document.createElement('canvas'); bgcv.className = 'gx-cv'; bgcv.style.pointerEvents = 'none'; S.root.insertBefore(bgcv, S.canvas); }
      var land = W > H * 1.15, im = GX.img(A + (land ? 'bg_cd_land.webp' : 'bg_cd_port.webp')), key = W + '|' + H + '|' + S.dpr + '|' + (land ? 1 : 0) + '|' + (im.ok ? 1 : 0);
      if (key === bgDone) return; bgDone = key; bgcv.width = Math.round(W * S.dpr); bgcv.height = Math.round(H * S.dpr); bgcv.getContext('2d').drawImage(bgFor(W, H), 0, 0); bgCache = null; bgKey = '';
    }
    function bgFor(W, H) {
      var land = W > H * 1.15, src = A + (land ? 'bg_cd_land.webp' : 'bg_cd_port.webp'), im = GX.img(src), key = src + '|' + W + '|' + H + '|' + S.dpr + '|' + (im.ok ? 1 : 0);
      if (bgCache && bgKey === key) return bgCache; var c = document.createElement('canvas'); c.width = Math.round(W * S.dpr); c.height = Math.round(H * S.dpr); var x = c.getContext('2d'); x.scale(S.dpr, S.dpr);
      if (im.ok) { var iw = im.el.naturalWidth, ih = im.el.naturalHeight, sc = Math.max(W / iw, H / ih); x.drawImage(im.el, (W - iw * sc) / 2, (H - ih * sc) / 2, iw * sc, ih * sc); }
      else { var g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#2a2f7a'); g.addColorStop(.6, '#3b2f86'); g.addColorStop(1, '#14204f'); x.fillStyle = g; x.fillRect(0, 0, W, H); var r = GX.rng(7); x.fillStyle = 'rgba(255,255,255,.7)'; for (var i = 0; i < 60; i++) { x.globalAlpha = .3 + r() * .6; x.beginPath(); x.arc(r() * W, r() * H * .8, .6 + r() * 1.6, 0, 6.3); x.fill(); } x.globalAlpha = 1; x.fillStyle = 'rgba(40,160,120,.5)'; x.beginPath(); x.ellipse(W / 2, H * .62, W * .9, H * .12, 0, 0, 6.3); x.fill(); }
      var v = x.createLinearGradient(0, H * .4, 0, H); v.addColorStop(0, 'rgba(8,10,34,0)'); v.addColorStop(1, 'rgba(8,10,34,.82)'); x.fillStyle = v; x.fillRect(0, 0, W, H);
      var v2 = x.createLinearGradient(0, 0, 0, H * .18); v2.addColorStop(0, 'rgba(8,10,34,.55)'); v2.addColorStop(1, 'rgba(8,10,34,0)'); x.fillStyle = v2; x.fillRect(0, 0, W, H * .18);
      bgCache = c; bgKey = key; return c;
    }
    function draw(c, W, H) {
      c.clearRect(0, 0, W, H); if (!ready) return; paintBg(W, H); var m = G.mon, t = S.t, s = lay.msize;
      var ph = (m.hue || 0) * 0.05, breath = Math.sin(t * 2.1 + ph), bob = Math.sin(t * 2.3 + ph) * s * 0.015, sx = (1 + 0.1 * m.hitT * Math.sin(m.hitT * 9)) * (1 - 0.012 * breath), sy = (1 - 0.14 * m.hitT) * (1 + 0.02 * breath), recoil = m.hitT * s * 0.06 * Math.sin(m.hitT * 6), sway = GX.reduced() ? 0 : Math.sin(t * 1.3 + ph) * 0.025, lg = m.lunge, alpha = 1, rot = 0, born = m.bornT;
      if (m.dying) { alpha = 1 - m.dieT; rot = m.dieT * 0.5; sx *= 1 + m.dieT * 0.25; sy *= 1 + m.dieT * 0.25; }
      /* aura: boss glow, or a red warning glow while a heavy blow is being charged */
      if (!m.dying) { var heavy = G.intent && G.intent.kind === 'atk' && G.intent.heavy && G.phase === 'player' && !m.dizzy; if (boss || heavy) { var ag = c.createRadialGradient(lay.mx, lay.mcy, s * 0.1, lay.mx, lay.mcy, s * 0.75), pu = 0.5 + 0.5 * Math.sin(t * (heavy ? 6 : 2)); c.save(); c.globalAlpha = (heavy ? 0.28 : 0.2) + pu * 0.12; ag.addColorStop(0, heavy ? 'rgba(255,70,70,.9)' : 'hsla(' + m.hue + ',90%,65%,.9)'); ag.addColorStop(1, 'rgba(0,0,0,0)'); c.fillStyle = ag; c.fillRect(lay.mx - s * 0.8, lay.mcy - s * 0.8, s * 1.6, s * 1.6); c.restore(); } }
      /* shadow */
      c.save(); c.globalAlpha = 0.35 * alpha; c.fillStyle = '#000'; c.beginPath(); c.ellipse(lay.mx, lay.my + 4, s * 0.42, s * 0.07, 0, 0, 6.3); c.fill(); c.restore();
      /* monster */
      c.save(); c.translate(lay.mx + recoil + (m.dizzy ? Math.sin(t * 24) * 2 : 0), lay.my + bob + lg * (lay.land ? s * 0.12 : s * 0.22)); c.rotate(rot + sway); c.scale(sx * (1 + lg * 0.18) * (1 + born * 0.4), sy * (1 + lg * 0.18) * (1 + born * 0.4)); c.globalAlpha = alpha * (m.dizzy ? 0.88 : 1);
      var im = GX.img(A + m.img); if (im.ok) { c.drawImage(im.el, -s / 2, -s, s, s); if (m.flash > 0.01) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = alpha * m.flash * 0.7; c.drawImage(im.el, -s / 2, -s, s, s); c.globalCompositeOperation = 'source-over'; } } else drawBlob(c, s, m, t);
      c.restore();
      if (m.block > 0 && !m.dying) { c.save(); c.globalAlpha = 0.55 + Math.sin(t * 4) * 0.1; c.strokeStyle = '#7fc0ff'; c.lineWidth = 4; c.beginPath(); c.ellipse(lay.mx, lay.mcy, s * 0.54, s * 0.5, 0, 0, 6.3); c.stroke(); c.fillStyle = 'rgba(100,170,255,.14)'; c.fill(); c.restore(); }
      if (m.dizzy && !m.dying) { var e = GX.emoji('⭐', 20, S.dpr); for (var i = 0; i < 3; i++) { var a = t * 3 + i * 2.1; c.drawImage(e.c, lay.mx + Math.cos(a) * s * 0.32 - e.s / 2, lay.my - s * 0.98 + Math.sin(a) * 6 - e.s / 2, e.s, e.s); } }
      if (G.intent && G.intent.kind === 'stun' && !m.dying) { var z = GX.emoji('💤', 26, S.dpr); c.drawImage(z.c, lay.mx + s * 0.22, lay.my - s * 1.0 + Math.sin(t * 2) * 4, z.s, z.s); }
    }
    function drawBlob(c, s, m, t) {
      var g = c.createRadialGradient(-s * .1, -s * .55, s * .05, 0, -s * .4, s * .5); g.addColorStop(0, 'hsl(' + m.hue + ',85%,75%)'); g.addColorStop(1, 'hsl(' + m.hue + ',70%,45%)'); c.fillStyle = g;
      c.beginPath(); c.ellipse(0, -s * .38, s * .42, s * .36, 0, 0, 6.3); c.fill(); c.fillStyle = '#fff'; c.beginPath(); c.arc(-s * .14, -s * .46, s * .09, 0, 6.3); c.arc(s * .14, -s * .46, s * .09, 0, 6.3); c.fill(); c.fillStyle = '#2b1d4a'; c.beginPath(); c.arc(-s * .13 + Math.sin(t) * 2, -s * .45, s * .045, 0, 6.3); c.arc(s * .15 + Math.sin(t) * 2, -s * .45, s * .045, 0, 6.3); c.fill();
      c.strokeStyle = '#2b1d4a'; c.lineWidth = 3; c.beginPath(); c.arc(0, -s * .32, s * .08, 0.15 * Math.PI, 0.85 * Math.PI); c.stroke();
      if (boss) { c.fillStyle = '#ffc94a'; c.beginPath(); c.moveTo(-s * .2, -s * .7); c.lineTo(-s * .12, -s * .84); c.lineTo(0, -s * .72); c.lineTo(s * .12, -s * .84); c.lineTo(s * .2, -s * .7); c.closePath(); c.fill(); }
    }

    /* ---------------- begin / restart */
    function begin(first) {
      G.hp = G.maxHp = DF.pHp[diff - 1] + ((opts.character && opts.character.perk === 'heart') ? 8 : 0); G.mon = mkMon(0); G.phase = 'player'; ready = true; relayout();
      if (!first) { el.hand.innerHTML = ''; } G.t0 = performance.now();
      if (cfgMusic()) S.audio.music(cfgMusic()); startTurn(); prewarm();
    }
    /* decode art and parse card templates while the child reads the first turn, so the first deal / cast / second boss phase never hitches */
    function prewarm() {
      S.later(function () { ['atk', 'def', 'heal', 'draw'].forEach(function (t) { cardTpl(t); GX.img(A + TY[t].frame); }); GX.img(backUrl); if (boss) BOSS.forEach(function (b) { GX.img(A + b.img); }); }, 300);
    }
    function cfgMusic() { return boss ? 'boss' : (diff >= 4 ? 'drive' : 'calm'); }
    function intro() {
      S.ui.how('card', '字卡征途', [{ icon: '🃏', text: (isTouch() || S.touch) ? '點牌→答題' : '點牌→打字' }, { icon: '🎯', text: '打中加倍' }, { icon: '⚡', text: '怪物下一步' }], function () {
        if (!S.learn.items.length) { begin(true); return; }
        S.ui.preview(S.learn.items, { onStart: function () { begin(true); } });
      });
    }
    function restart() {
      S.ui.closeAll(); if (pad) { pad.destroy(); pad = null; } if (sheet && sheet.parentNode) sheet.parentNode.removeChild(sheet); sheet = null; S.fx.clear();
      var prevQ = (opts.items || []).map(function (it) { return it.q; }).filter(Boolean), oreg = opts.regen;
      if (typeof oreg === 'function') opts.regen = function () { return oreg({ avoid: prevQ }); };
      try { S.newLearn(); } finally { if (oreg) opts.regen = oreg; } restarts++;
      S.ended = false; S.paused = false; S.t = 0; (opts.items || []).forEach(function (it) { delete it._f; }); (opts.review || []).forEach(function (it) { delete it._f; });
      ready = false; G = newState(); rng = GX.rng(seed0 ^ 0x9e37); el.hand.innerHTML = ''; handEls = []; begin(false);
    }

    /* ---------------- input */
    function halfWidth(k) { k = String(k).replace(/[！-～]/g, function (c) { return String.fromCharCode(c.charCodeAt(0) - 65248); }); return k.length === 1 ? k : GX.norm(k).charAt(0) || k; }
    var imeWarned = false;
    S.on(window, 'keydown', function (e) { if (!ready || !G || !G.cast || uiBlocked()) return; if ((e.key === 'Process' || e.keyCode === 229 || e.isComposing) && !imeWarned) { imeWarned = true; S.ui.banner('請切換英文輸入', '輸入法開着，按鍵不能用', 2200); S.sfx('keybad'); } });
    function uiBlocked() { return S.ui.open('learn') || S.ui.open('preview') || S.ui.open('how') || S.ui.open('result') || S.ui.open('pause') || S.paused || (G && G.ended); }
    S.keys({
      onChar: function (k) {
        if (!ready || uiBlocked()) return; k = halfWidth(k); if (G.cast) { typeChar(k); return; }
        if (/^[1-7]$/.test(k)) selectCard(+k - 1); else if (k === 'e' || k === 'E') endTurn();
      },
      onBack: function () { if (!ready || uiBlocked()) return; if (G.cast) backspace(); },
      onEnter: function () { if (!ready || uiBlocked()) return; if (G.cast) submitText(); else if (G.phase === 'player' && G.focus >= 0) selectCard(G.focus); },
      onSpace: function () { if (!ready || uiBlocked()) return; if (!G.cast && G.phase === 'player' && G.focus >= 0) selectCard(G.focus); },
      onArrow: function (d) { if (!ready || uiBlocked() || G.cast || !G.hand.length) return; if (d === 'left') G.focus = (G.focus + G.hand.length - 1) % G.hand.length; else if (d === 'right') G.focus = (G.focus + 1) % G.hand.length; else return; layoutHand(); var c = G.hand[G.focus]; if (c && c.el) c.el.focus({ preventScroll: true }); },
      onEsc: function () { if (!ready) return; if (G.cast && !G.cast.fin && !S.paused && !uiBlocked()) cancelCast(); else S.paused ? S.closePause() : S.openPause(); }
    });

    /* ---------------- boot */
    G = newState(); rng = GX.rng(seed0 ^ 0x9e37); buildUi(); S.loop(update, draw);
    S.on(S.root, 'pointerdown', function (e) { if (e.pointerType === 'touch') S.touch = true; }, { passive: true });
    intro();

    var api = S.handle();
    api._debug = function () { return snapshot(); };
    function snapshot() {
      if (!G) return null; var m = G.mon, cs = G.cast;
      return {
        music: S.audio.state().music, phase: G.phase, turn: G.turn, energy: G.energy, maxEnergy: MAX_EN, hp: G.hp, maxHp: G.maxHp, shield: G.shield, combo: G.combo, maxCombo: G.maxCombo, score: G.score, difficulty: diff, subject: opts.subject, boss: boss, ended: !!G.ended, event: G.event, intent: G.intent ? { kind: G.intent.kind, n: G.intent.n } : null,
        hand: G.hand.map(function (c) { return { uid: c.uid, id: c.item.id, type: c.meta.type, cost: costOf(c), baseCost: c.meta.cost, power: powerOf(c), hit: isHit(c), evo: !!G.evo[c.item.id], free: !!c.free, rv: !!c.item.rv }; }),
        drawN: ready ? drawN() : 0, discardN: G.discard.length, recycleN: G.recycle.length, learnOpen: S.ui.open('learn'), previewOpen: S.ui.open('preview'), howOpen: S.ui.open('how'),
        mon: m ? { name: m.name, hp: m.hp, max: m.max, block: m.block, phase: m.phase, weak: { kind: m.weak.kind, label: m.weak.label, T: m.weak.T }, dizzy: m.dizzy, dying: m.dying, atk: m.atk } : null,
        cast: cs ? { filler: !!cs.filler, item: cs.item.id, card: cs.card ? cs.card.uid : null, fin: cs.fin, buf: cs.buf, limit: cs.limit || 0, left: cs.left, hinted: cs.hinted, locked: cs.locked, keys: pad ? Array.prototype.map.call(pad.el.querySelectorAll('.gx-key'), function (b) { return b.getAttribute('data-k'); }) : [] } : null,
        queue: (function () { var o = [], k, x; for (k = 0; k < 12; k++) { x = S.learn.peek(k); if (!x) break; o.push(x.id); } return o; })(), stats: (function () { var o = {}; Object.keys(S.learn.stats).forEach(function (k) { var t = S.learn.stats[k]; o[k] = { tries: t.tries, firstOk: t.firstOk, ok: t.ok, missed: t.missed, requeued: t.requeued, rv: t.rv }; }); return o; })(), evo: Object.assign({}, G.evo), okN: Object.assign({}, G.okN), fin: G.fin ? { left: G.fin.left, total: G.fin.total } : null, progress: S.learn.progress(), remaining: S.learn.remaining(), result: S.result || null, layout: { cw: lay.cwE, ch: lay.chE, land: !!lay.land, mx: lay.mx, mcy: lay.mcy, msize: lay.msize, hb: lay.hb, meY: lay.meY }, spent: G.spent, events: G.events, sfx: sfxLog.slice(), comboChip: el.combo && !el.combo.hidden ? el.combo.textContent : '', avClass: el.av ? el.av.className : ''
      };
    }
    function flush(max) { var n = 0; while (G.tl.length && n++ < (max || 200)) { G.clock = Math.max(G.clock, G.tl[0].t); runTl(); } }
    function findAndTake(id) {
      var h = G.hand.filter(function (c) { return c.item.id === id; })[0]; if (h) return h; var k, it;
      for (k = 0; k < G.discard.length; k++) if (G.discard[k].item.id === id) { it = G.discard.splice(k, 1)[0].item; return injectCard(it); }
      for (k = 0; k < G.recycle.length; k++) if (G.recycle[k].item.id === id) { it = G.recycle.splice(k, 1)[0].item; return injectCard(it); }
      var stash = [], x; while ((x = S.learn.take())) { if (x.id === id) { it = x; break; } stash.push(x); } stash.forEach(function (y) { G.recycle.push({ item: y }); }); if (it) return injectCard(it); return null;
    }
    function injectCard(it) { var c = mkCard(it); G.hand.push(c); c.el = cardEl(c); el.hand.appendChild(c.el); var b = c.el.querySelector('.bk'); if (b) b.parentNode.removeChild(b); return c; }
    api._cmd = function (name, arg) {
      switch (name) {
        case 'snapshot': return snapshot();
        case 'select': return selectCard(arg | 0, true);
        case 'type': { var ok = true; String(arg).split('').forEach(function (ch) { if (G.cast) ok = typeChar(ch) && ok; }); return ok; }
        case 'submit': return submitText();
        case 'back': return backspace();
        case 'cancel': return cancelCast();
        case 'hint': return useHint();
        case 'end': return endTurn(!!(arg && arg.force));
        case 'flush': flush(arg); relayout(); hud(); return snapshot();
        case 'hand': { var keep = []; (arg || []).forEach(function (id) { var c = findAndTake(id); if (c) keep.push(c); });
          G.hand.forEach(function (c) { if (keep.indexOf(c) < 0) { if (c.el && c.el.parentNode) c.el.parentNode.removeChild(c.el); G.recycle.push({ item: c.item }); } }); G.hand = keep; layoutHand(); hud(); return snapshot(); }
        case 'mon': { var m = G.mon; arg = arg || {}; if (arg.hp != null) { m.hp = arg.hp; if (arg.max == null && arg.hp > m.max) m.max = arg.hp; } if (arg.max != null) m.max = arg.max; if (arg.block != null) m.block = arg.block; if (arg.weak) { var T = arg.weak.T != null ? arg.weak.T : m.weak.T; m.weak = { kind: arg.weak.kind, T: T, label: weakLabel({ kind: arg.weak.kind, T: T }), icon: (WEAK[arg.weak.kind] || [0, ''])[1] }; }
          if (arg.atk != null) m.atk = arg.atk; if (arg.intent) G.intent = { kind: arg.intent.kind, n: arg.intent.n || 0 }; if (arg.shown) m.shown = m.hp; hud(); return snapshot(); }
        case 'player': { arg = arg || {}; if (arg.hp != null) G.hp = arg.hp; if (arg.maxHp != null) G.maxHp = arg.maxHp; if (arg.shield != null) G.shield = arg.shield; if (arg.energy != null) G.energy = Math.min(arg.energy, 99); hud(); return snapshot(); }
        case 'event': G.forceEvent = arg || 'free'; return true;
        case 'noevent': G.forceNoEvent = arg !== false; return true;
        case 'evo': G.okN[arg.id] = arg.n; if (arg.n >= 3) G.evo[arg.id] = true; hud(); return snapshot();
        case 'weakHit': { var it2 = G.core.concat(Object.keys(S.learn.stats).map(function (k) { return S.learn.stats[k].item; })).filter(function (x) { return x.id === arg.id; })[0]; return weakHit(arg.kind, featOf(S, it2), arg.T); }
        case 'feat': { var it3 = S.learn.stats[arg].item; return featOf(S, it3); }
        case 'meta': return G.meta[arg] ? { type: G.meta[arg].type, cost: G.meta[arg].cost, base: G.meta[arg].base } : null;
        case 'meta-all': return Object.keys(G.meta).map(function (k) { var x = G.meta[k]; return { id: k, type: x.type, cost: x.cost, base: x.base }; });
        case 'effect': { var c2 = G.hand[arg | 0]; return c2 ? calcEffect(c2) : null; }
        case 'tick': update(arg || 1 / 60); return true;
        case 'expire': { var cs2 = G.cast; if (cs2 && cs2.limit) { cs2.left = 0.0001; } return !!cs2; }
        case 'setT': if (G.cast) G.cast.t = arg; return true;
        case 'kill': { G.mon.hp = 0; onMonsterDown(); return snapshot(); }
        case 'giveup': G.hp = 0; defeat(); return true;
      }
      return undefined;
    };
    api._step = function (n, dt) { S._step(n, dt); };
    cur = api; return api;
  }

  globalThis.WQ37Card = {
    start: start,
    get _debug() { return cur ? cur._debug() : null; },
    _step: function (n, dt) { if (cur) cur._step(n, dt); }, _cmd: function (name, arg) { return cur ? cur._cmd(name, arg) : undefined; },
    _feat: function (S, it) { return featOf(S, it); }
  };
})();

;
/* WQOly core (R3.23): registry of the 30 奧數路線 units + pure helpers for unit generators. No DOM, no Math.random, loads in Node and in the app.
   A unit is registered with WQOly.register({id:'p1-2', grade:1, n:2, title, icon, card:{motto,example,art}, cover, lesson:[...], gens:{A:[fn],B:[fn]}, verify?}).
   Generators are pure (r,p)=>WQOly.o(skill, stem, answer, hint, explain, wrongs, calc, accept, {why,svg,form}) with r = seeded rng and p = {s,diff,stage}.
   p.s (0..1) scales NUMBER SIZE only: use WQOly.N(r,p,lo,hi) for a number that grows with the parent difficulty / stage. */
(function (root) {
  'use strict';
  const mb = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  const hs = (...xs) => { let h = 2166136261; for (const x of xs) { for (const c of String(x)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); h = Math.imul(h ^ 35, 16777619); } return h >>> 0; };
  const ri = (r, a, b) => a + Math.floor(r() * (b - a + 1));
  const pick = (r, a) => a[Math.floor(r() * a.length)];
  const shuffle = (r, a) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  /* a number between lo and hi that grows with p.s (0 = lo end, 1 = whole range) */
  const N = (r, p, lo, hi) => { if (hi <= lo) return lo; const sp = hi - lo, t = Math.min(hi, lo + Math.max(2, Math.round(sp * p.s))), b = Math.min(t, lo + Math.round(sp * p.s * .5)); return ri(r, b, t); };
  const gcd = (a, b) => b ? gcd(b, a % b) : a;
  const fmt = x => String(Math.round(x * 1e6) / 1e6);
  const CN = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十'];
  /* names carry a pronoun so a girl's name never gets 「他」 */
  const P = (n, p) => ({ n, p, toString() { return n; } });
  const NAMES = [P('小明', '他'), P('小美', '她'), P('阿強', '他'), P('小欣', '她'), P('家豪', '他'), P('詩婷', '她')];
  const name = r => pick(r, NAMES);
  /* o(skill, stem, answer, hint, explain, wrongs, calc, accept, extra) - extra: a form string ('dec'|'simplest') or {form, why, svg}
     why: {'<wrong answer>': '一句錯因提示'}  (the wrong answers a child really gives; they are always offered as options in 選擇題)
     svg: '<svg ...>' small figure shown above the stem */
  const o = (sk, q, a, h, e, w, calc, acc, extra) => {
    const x = (typeof extra === 'string') ? { form: extra } : (extra || {});
    return { sk, q, a: String(a), h, e, w: w || [], calc, acc: acc || [], form: x.form || null, why: x.why || null, svg: x.svg || '' };
  };
  const GRADES = [
    { n: 1, name: '小一', icon: '🌱', hue: 150, theme: '數數與湊十' },
    { n: 2, name: '小二', icon: '🌿', hue: 190, theme: '跳數與植樹' },
    { n: 3, name: '小三', icon: '🌳', hue: 215, theme: '和差與搭配' },
    { n: 4, name: '小四', icon: '🔥', hue: 272, theme: '雞兔與高斯' },
    { n: 5, name: '小五', icon: '🚀', hue: 322, theme: '餘數與抽屜' },
    { n: 6, name: '小六', icon: '👑', hue: 28, theme: '比與工程' }
  ];
  const units = {}, order = [];
  const LV = ['A', 'B'];
  /* register: throws on a malformed unit so a typo is caught by the Node test, never by a child */
  function register(u) {
    const bad = m => { throw new Error('WQOly.register ' + (u && u.id) + ': ' + m); };
    if (!u || !/^p[1-6]-[1-5]$/.test(u.id)) bad('id must look like p1-2');
    if (u.grade !== +u.id[1] || u.n !== +u.id[3]) bad('grade/n do not match id');
    if (!u.title || !u.icon) bad('title and icon are required');
    if (!u.card || !u.card.motto || !u.card.example) bad('card.motto and card.example are required');
    if (!Array.isArray(u.lesson) || u.lesson.length < 2) bad('lesson needs cards');
    for (const l of LV) if (!u.gens || !Array.isArray(u.gens[l]) || !u.gens[l].length) bad('gens.' + l + ' needs at least one generator');
    if (units[u.id] && !units[u.id].draft && u.draft) bad('a final unit may not be replaced by a draft');
    u.cover = u.cover || 'assets/r323/' + u.id + '.webp';
    if (!units[u.id]) order.push(u.id);
    units[u.id] = u;
    order.sort();
    return u;
  }
  const unitsOf = g => order.map(id => units[id]).filter(u => u.grade === g);
  /* stub: a walkable placeholder (draft:true) - a short lesson, generators borrowed from the old olympiad templates (WQ37Math.legacy) or given directly.
     spec: {id,title,icon,motto,example, legacy:{A:[[w,i]...],B:[[w,i]...], s:0.5}, gens?:{A,B}} */
  function stub(spec) {
    const m = /^p(\d)-(\d)$/.exec(spec.id);
    const lg = spec.legacy || {}, k = lg.s || 1;
    const borrow = list => (list || []).map(([w, i]) => (r, p) => {
      const M = root.WQ37Math;
      if (!M || !M.legacy) throw new Error('WQ37Math.legacy is not loaded');
      return M.legacy(w, i)(r, { s: Math.min(1, .3 + p.s * k * .7), diff: p.diff, stage: p.stage });
    });
    const gens = spec.gens || { A: borrow(lg.A), B: borrow(lg.B) };
    return {
      id: spec.id, grade: +m[1], n: +m[2], title: spec.title, icon: spec.icon, draft: true,
      card: { motto: spec.motto, example: spec.example, art: spec.art || '' },
      lesson: spec.lesson || [
        { t: 'show', say: '這一課：' + spec.motto + '。', scene: { w: 'banner', p: { icon: spec.icon, title: spec.title, motto: spec.motto, example: spec.example } } },
        { t: 'card' }
      ],
      gens
    };
  }
  /* the question shape the level engine sees, built directly from one generator call (used by the Node tests and the lesson `try` cards) */
  function sample(id, level, seed, diff) {
    const u = units[id]; if (!u) throw new Error('no unit ' + id);
    const r = mb(hs('oly-sample', id, level, seed, diff || 1)), g = u.gens[level];
    return pick(r, g)(r, { s: Math.min(1, .1 + .8 * ((diff || 1) - 1) / 4), diff: diff || 1, stage: 0 });
  }
  const WQOly = { grades: GRADES, units, order, register, unitsOf, stub, sample, unit: id => units[id] || null, levels: LV,
    helpers: { mb, hs, ri, pick, shuffle, N, gcd, fmt, o, name, NAMES, CN, rng: seed => mb(seed >>> 0) }, mb, hs, ri, pick, shuffle, N, gcd, fmt, o, name, CN, version: '1.0' };
  root.WQOly = WQOly;
  if (typeof module !== 'undefined') module.exports = WQOly;
})(typeof globalThis !== 'undefined' ? globalThis : this);

;
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

;
/* 小一 · 5 units, all finished (p1-2 湊十 is the reference unit). See docs/奧數路線-20261022/單元撰寫指引.md. */
(function () {
  'use strict';
  const { o, N, ri, pick, shuffle, name } = WQOly.helpers;

  /* ---- p1-2 湊十 --------------------------------------------------------------------------------------------------------- */
  /* small picture of two ten-frames: a aqua counters on the left, b gold counters on the right */
  const frame = (x, n, col, dark) => {
    let s = `<rect x="${x}" y="8" width="74" height="30" rx="5" fill="rgba(255,255,255,.08)" stroke="${col}" stroke-width="1.6"/><path d="M${x} 23h74M${x + 14.8} 8v30M${x + 29.6} 8v30M${x + 44.4} 8v30M${x + 59.2} 8v30" stroke="rgba(255,255,255,.25)" stroke-width="1"/>`;
    for (let i = 0; i < n; i++) s += `<circle cx="${x + 7.4 + (i % 5) * 14.8}" cy="${15.5 + Math.floor(i / 5) * 15}" r="5.2" fill="${col}" stroke="${dark}" stroke-width="1"/>`;
    return s;
  };
  const tenSvg = (a, b) => `<svg viewBox="0 0 170 46" role="img" aria-label="左邊 ${a} 個，右邊 ${b} 個">${frame(2, a, '#3ee6d0', '#12998a')}${frame(94, b, '#ffc94a', '#c48a00')}<text x="85" y="27" text-anchor="middle" font-size="18" font-weight="900" fill="#f4f6ff">＋</text></svg>`;
  const art12 = `<svg viewBox="0 0 120 80"><rect x="6" y="10" width="52" height="22" rx="4" fill="rgba(255,255,255,.1)" stroke="#3ee6d0" stroke-width="2"/><rect x="62" y="10" width="52" height="22" rx="4" fill="rgba(255,255,255,.1)" stroke="#ffc94a" stroke-width="2"/>${[0, 1, 2, 3, 4, 5, 6, 7].map(i => `<circle cx="${14 + (i % 5) * 9.5}" cy="${17 + Math.floor(i / 5) * 10}" r="3.6" fill="#3ee6d0"/>`).join('')}${[0, 1, 2, 3, 4].map(i => `<circle cx="${70 + i * 9.5}" cy="21" r="3.6" fill="#ffc94a"/>`).join('')}<path d="M88 34Q80 46 40 40" stroke="#ff8fc7" stroke-width="2.4" fill="none" stroke-dasharray="3 3"/><rect x="14" y="52" width="92" height="20" rx="10" fill="#c6a2ff"/><text x="60" y="63" text-anchor="middle" dominant-baseline="central" font-size="15" font-weight="900" fill="#0b1030">10 ＋ 3</text></svg>`;

  const g12 = {
    A: [
      /* a + b with a < 10: make ten first */
      (r, p) => {
        const a = N(r, p, 6, 9), b = N(r, p, Math.max(2, 11 - a), 9), need = 10 - a, rest = b - need, s = a + b;
        return o('add10', `${a}＋${b}＝？先湊成 10。`, s, `${a} 要加 ${need} 才是 10。`,
          `先湊十：${a}＋${need}＝10，${b} 分成 ${need} 和 ${rest}；再算 10＋${rest}＝${s}。`, [s - 1, s + 1, 10 + need, 10 + b - 1], `${a}+${b}`, [],
          { svg: tenSvg(a, b), why: { [s - 1]: `${b} 分成 ${need} 和 ${rest}，剩下是 ${rest}，別數少了。`, [10 + need]: `${need} 是拿去湊十的，剩下的是 ${rest}，要再加。` } });
      },
      /* how many more to make ten */
      (r, p) => {
        const a = N(r, p, 1, 9), s = 10 - a;
        return o('need10', `${a} 再加幾個就是 10？`, s, `想想 10 比 ${a} 多多少。`, `${a}＋${s}＝10，所以要再加 ${s} 個。`, [a, s + 1, s - 1 > 0 ? s - 1 : s + 2, 10 + a], `10-${a}`, [],
          { svg: tenSvg(a, 0).replace(/<text.*?<\/text>/, ''), why: { [a]: `${a} 是已經有的，要問還差幾個。` } });
      },
      /* a story */
      (r, p) => {
        const m = name(r), a = N(r, p, 6, 9), b = N(r, p, Math.max(2, 11 - a), 9), need = 10 - a, s = a + b, it = pick(r, [['糖', '粒'], ['貼紙', '張'], ['卡片', '張']]);
        return o('story10', `${m}有 ${a} ${it[1]}${it[0]}，又得 ${b} ${it[1]}，共有幾${it[1]}？`, s, `先把 ${a} 湊成 10。`,
          `先拿 ${need} 湊成 10，${b} 還剩 ${b - need}；10＋${b - need}＝${s}。`, [s - 1, s + 1, a + b - 2, 10 + need], `${a}+${b}`, [],
          { svg: tenSvg(a, b), why: { [s - 1]: `先湊十，再加剩下的 ${b - need}，別數少了。` } });
      }
    ],
    B: [
      /* three numbers: spot the pair that makes ten (the extra step) */
      (r, p) => {
        const x = N(r, p, 1, 9), e = N(r, p, 2, 9), arr = shuffle(r, [x, 10 - x, e]), s = 10 + e;
        return o('three10', `${arr.join('＋')}＝？找出湊成 10 的一對。`, s, '哪兩個加起來是 10？', `${x}＋${10 - x}＝10，再加 ${e}：10＋${e}＝${s}。`, [s - 1, s + 1, 10, x + e], `${arr.join('+')}`, [],
          { why: { 10: `10 只是其中一對的和，還要加上 ${e}。`, [s - 1]: `先找湊成 10 的一對，再加剩下的 ${e}，別數少了。` } });
      },
      /* a missing addend: needs two moves (to ten, then the rest) */
      (r, p) => {
        const a = N(r, p, 6, 9), T = a + N(r, p, Math.max(3, 11 - a), 9), need = 10 - a, rest = T - 10, s = need + rest;
        return o('miss10', `${a}＋？＝${T}。？是多少？`, s, `先看 ${a} 湊成 10 要加多少。`, `${a}＋${need}＝10，再加 ${rest} 才是 ${T}；${need}＋${rest}＝${s}。`, [need, rest, s + 1, T - a + 1], `${T}-${a}`, [],
          { svg: tenSvg(a, 0).replace(/<text.*?<\/text>/, ''), why: { [need]: `${need} 只是湊成 10 用的，之後還要再加 ${rest}。`, [rest]: `${rest} 只是 10 之後的部分，湊十用的 ${need} 也要加。` } });
      },
      /* R3.31 variety: three kids, two of the amounts make ten */
      (r, p) => {
        const x = N(r, p, 1, 9), e = N(r, p, 2, 9), arr = shuffle(r, [x, 10 - x, e]), ns = shuffle(r, WQOly.helpers.NAMES).slice(0, 3), it = pick(r, [['糖', '粒'], ['貼紙', '張'], ['卡片', '張'], ['波子', '粒'], ['橡皮', '個'], ['書籤', '張']]), s = 10 + e;
        return o('three10', `${ns[0]}有 ${arr[0]} ${it[1]}，${ns[1]}有 ${arr[1]} ${it[1]}，${ns[2]}有 ${arr[2]} ${it[1]}。共有幾${it[1]}？`, s, '哪兩個數加起來是 10？先加那兩個。',
          `${x}＋${10 - x}＝10，再加 ${e}：10＋${e}＝${s}。`, [s - 1, s + 1, 10, x + e], arr.join('+'), [],
          { why: { 10: `10 只是其中兩人的和，還要加上 ${e}。`, [s - 1]: `先找湊成 10 的兩個數，再加 ${e}，別數少了。` } });
      },
      /* R3.31 variety: fill the blank on the other side of the equals sign */
      (r, p) => {
        const a = N(r, p, 6, 9), b = N(r, p, Math.max(3, 11 - a), 9), need = 10 - a, rest = a + b - 10, form = r() < .5;
        return o('miss10', form ? `${a}＋${b}＝10＋？。？是多少？` : `10＋？＝${a}＋${b}。？是多少？`, rest, `${a} 差 ${need} 湊成 10，${b} 拿走 ${need} 還剩多少？`,
          `${b} 分成 ${need} 和 ${rest}；${a}＋${need}＝10，再加 ${rest}，所以 ${a}＋${b}＝10＋${rest}。`, [need, rest + 1, rest - 1 > 0 ? rest - 1 : rest + 2, a + b], `${a}+${b}-10`, [],
          { svg: tenSvg(a, b), why: { [need]: `${need} 是拿去湊成 10 的，10 後面還剩 ${rest}。`, [a + b]: `${a + b} 是全部，10 後面只是超出 10 的部分。` } });
      },
      /* R3.31 variety: how much more than ten */
      (r, p) => {
        const a = N(r, p, 6, 9), b = N(r, p, Math.max(3, 11 - a), 9), need = 10 - a, rest = a + b - 10, form = r() < .5;
        return o('miss10', form ? `${a}＋${b} 比 10 多多少？先湊成 10。` : `${b}＋${a} 比 10 多多少？先湊成 10。`, rest, `先算 ${a}＋${b}，再和 10 比。`,
          `${a}＋${need}＝10，${b} 分成 ${need} 和 ${rest}，所以多出 ${rest}。`, [need, rest + 1, a + b, rest - 1 > 0 ? rest - 1 : rest + 2], `${a}+${b}-10`, [],
          { svg: tenSvg(a, b), why: { [a + b]: `${a + b} 是全部的數目，問的是比 10 多出來的部分。`, [need]: `${need} 是湊成 10 用的，多出來的是 ${rest}。` } });
      },
      /* R3.31 variety: a story, how many more to get */
      (r, p) => {
        const m = name(r), a = N(r, p, 6, 9), b = N(r, p, Math.max(3, 11 - a), 9), T = a + b, it = pick(r, [['糖', '粒'], ['貼紙', '張'], ['卡片', '張'], ['波子', '粒'], ['橡皮', '個'], ['書籤', '張']]);
        return o('miss10', `${m}有 ${a} ${it[1]}${it[0]}，想有 ${T} ${it[1]}，還要再得幾${it[1]}？`, b, `先湊成 10，再看 ${T} 比 10 多多少。`,
          `${a}＋？＝${T}；${a} 再加 ${10 - a} 是 10，10 再加 ${T - 10} 是 ${T}；${10 - a}＋${T - 10}＝${b}。`, [10 - a, T - 10, b + 1, T], `${T}-${a}`, [],
          { svg: tenSvg(a, 0).replace(/<text.*?<\/text>/, ''), why: { [10 - a]: `${10 - a} 只是湊成 10 用的，之後還要再加 ${T - 10}。`, [T]: `${T} 是想有的總數，問的是還要再得多少。` } });
      }
    ]
  };
  /* independent recomputation from the stem text (used by test_oly_units.cjs) */
  const verify12 = q => {
    let m;
    if ((m = /^(\d+)＋(\d+)＝10＋？/.exec(q.q)) || (m = /^10＋？＝(\d+)＋(\d+)/.exec(q.q))) return String(+m[1] + +m[2] - 10);
    if ((m = /^(\d+)＋(\d+) 比 10 多多少/.exec(q.q))) return String(+m[1] + +m[2] - 10);
    if ((m = /^..有 (\d+) .+，..有 (\d+) .+，..有 (\d+) .+。共有幾/.exec(q.q))) return String(+m[1] + +m[2] + +m[3]);
    if ((m = /^..有 (\d+) .+，想有 (\d+) .+，還要再得幾/.exec(q.q))) return String(m[2] - m[1]);
    if ((m = /^(\d+)＋(\d+)＝？/.exec(q.q))) return String(+m[1] + +m[2]);
    if ((m = /^(\d+) 再加幾個就是 10？/.exec(q.q))) return String(10 - m[1]);
    if ((m = /有 (\d+) .{1,2}.*又得 (\d+) /.exec(q.q))) return String(+m[1] + +m[2]);
    if ((m = /^(\d+)＋(\d+)＋(\d+)＝？/.exec(q.q))) return String(+m[1] + +m[2] + +m[3]);
    if ((m = /^(\d+)＋？＝(\d+)/.exec(q.q))) return String(m[2] - m[1]);
    return null;
  };

  WQOly.register({
    id: 'p1-2', grade: 1, n: 2, title: '湊十', icon: '🔟',
    card: { motto: '先湊成 10', example: '8＋5＝10＋3＝13', art: art12 },
    lesson: [
      { t: 'show', say: '8＋5 不好數。先湊成 10 就容易！', scene: { w: 'tenframe', p: { a: 8, b: 5 } } },
      { t: 'predict', say: '8 要湊成 10。', ask: '要從右邊拿幾個過去？', options: ['1', '2', '3'], answer: '2', scene: { w: 'tenframe', p: { a: 8, b: 5 }, still: true }, reveal: '8 差 2 就是 10，拿 2 個過去！' },
      { t: 'do', say: '把右邊的點拖去左框，湊滿 10。', scene: { w: 'tenframe', p: { a: 8, b: 5 } } },
      { t: 'show', say: '9 只差 1。拿 1 個過去，剩 5 個。', scene: { w: 'tenframe', p: { a: 9, b: 6 } } },
      { t: 'do', say: '再試一次：7＋6。拖幾個過去？', scene: { w: 'tenframe', p: { a: 7, b: 6 } } },
      { t: 'try', say: '6＋8，先湊十再加剩下的。', scene: { w: 'tenframe', p: { a: 6, b: 8 }, still: true },
        q: { stem: '6＋8＝？', options: ['12', '13', '14'], answer: '14', hint: '6 差 4 才是 10。', why: { 12: '6 差 4 才是 10，不是差 2。', 13: '8 分成 4 和 4，剩下 4，不是 3。' } } },
      { t: 'card' }
    ],
    gens: g12, verify: verify12
  });

  /* ================================================================================================================================
     Shared little helpers for the finished units below (pictures are plain svg strings; answers are always numbers)
     ================================================================================================================================ */
  const NAMES = WQOly.helpers.NAMES;
  const CA = '#3ee6d0', CB = '#ffc94a', CC = '#ff8fc7', CV = '#c6a2ff', CT = '#c3cbf7';
  const rep = (n, f) => Array.from({ length: n }, (_, i) => f(i));
  const svgOf = (w, h, body, label) => `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}">${body}</svg>`;
  /* why-map that skips keys which are not usable numbers */
  const why = (...kv) => { const w = {}; kv.forEach(([k, t]) => { if (k !== undefined && k !== null && !Number.isNaN(k) && k >= 0 && !(k in w)) w[k] = t; }); return w; };
  /* smallest period q such that every known entry agrees with the others in its residue class (null = unknown) */
  const minPeriod = t => {
    for (let q = 1; q <= t.length; q++) {
      const seen = {}; let ok = true;
      t.forEach((v, i) => { if (v == null) return; const k = i % q; if (k in seen && seen[k] !== v) ok = false; seen[k] = v; });
      if (ok) return { q, seen };
    }
    return null;
  };
  const svgKinds = q => [...String(q.svg || '').matchAll(/data-k="(\w)"/g)].map(m => m[1]);
  const svgGroups = q => [...String(q.svg || '').matchAll(/data-g="(\w+)"/g)].map(m => m[1]);

  /* ---- p1-1 找規律 ------------------------------------------------------------------------------------------------------- */
  const KIND = { a: ['圓形', CA], b: ['方塊', CB], c: ['三角形', CC] };
  const KNAME = { 圓形: 'a', 方塊: 'b', 三角形: 'c' };
  const shape = (k, x, y, s) => k === 'a' ? `<circle data-k="a" cx="${x}" cy="${y}" r="${s}" fill="${CA}"/>`
    : k === 'b' ? `<rect data-k="b" x="${x - s}" y="${y - s}" width="${2 * s}" height="${2 * s}" rx="2" fill="${CB}"/>`
      : `<path data-k="c" d="M${x} ${y - s - 1}L${x + s + 1} ${y + s}L${x - s - 1} ${y + s}z" fill="${CC}"/>`;
  const shapeRow = seq => { const n = seq.length, sp = Math.min(26, 224 / n); return svgOf(240, 40, seq.map((k, i) => shape(k, 120 + (i - (n - 1) / 2) * sp, 20, 8)).join(''), `${n} 個圖形排成一行`); };
  const unitOf = (r, per, pool) => {
    for (let g = 0; g < 60; g++) { const u = rep(per, () => pick(r, pool)); if (!u.every(v => v === u[0])) return u; }
    return per === 2 ? [pool[0], pool[1]] : [pool[0], pool[0], pool[1]];
  };
  const digits = (r, p) => rep(N(r, p, 4, 9), i => i + 1);
  const art11 = `<svg viewBox="0 0 120 80">${[0, 1, 2, 3, 4].map(i => shape(i % 2 ? 'b' : 'a', 18 + i * 21, 26, 8)).join('')}<rect x="92" y="14" width="22" height="24" rx="6" fill="none" stroke="#ff8fc7" stroke-width="2" stroke-dasharray="4 3"/><text x="103" y="27" text-anchor="middle" dominant-baseline="central" font-size="16" font-weight="900" fill="#ff8fc7">?</text><path d="M18 44q42 14 84 0" stroke="#c6a2ff" stroke-width="2.4" fill="none" stroke-dasharray="3 3"/><rect x="14" y="54" width="92" height="20" rx="10" fill="#c6a2ff"/><text x="60" y="65" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="900" fill="#0b1030">一輪 ＋ 一輪</text></svg>`;
  const g11 = {
    A: [
      /* the next number of a repeating list */
      (r, p) => {
        const per = ri(r, 2, 3), u = unitOf(r, per, digits(r, p)), n = 2 * per + ri(r, 1, per - 1), t = rep(n, i => u[i % per]), ans = u[n % per], last = t[n - 1];
        const other = u.find(v => v !== ans && v !== last);
        return o('pat-next', `${t.join('、')}、？`, ans, '先找出一輪是哪幾個。', `一輪是 ${u.join('、')}，接着是 ${ans}。`, [last, ...u, ans + 1, ans + 2, ans - 1], '', [],
          { why: why([last, `${last} 是上一個。照一輪的次序，接着是 ${ans}。`], [other, `一輪是 ${u.join('、')}，${last} 後面是 ${ans}。`], [ans + 1, '數字只會重複一輪裏的，不會變成新的數。']) });
      },
      /* one number is missing in the middle */
      (r, p) => {
        const per = ri(r, 2, 3), u = unitOf(r, per, digits(r, p)), n = 2 * per + ri(r, 1, 2), m = ri(r, per, n - 2), t = rep(n, i => u[i % per]), ans = u[m % per];
        const shown = t.map((v, i) => i === m ? '？' : v).join('、'), near = t[m - 1];
        return o('pat-gap', shown, ans, '先看一輪是哪幾個。', `一輪是 ${u.join('、')}，空位是 ${ans}。`, [near, t[m + 1], ...u, ans + 1, ans - 1], '', [],
          { why: why([near, `${near} 是空位前面那個。照次序，空位是 ${ans}。`], [t[m + 1], `${t[m + 1]} 是空位後面那個。要看前面一輪。`], [ans + 1, '空位的數在前面已經出現過了。']) });
      },
      /* count one kind of shape in a repeating row */
      (r, p) => {
        const per = ri(r, 2, 3), u = unitOf(r, per, ['a', 'b', 'c']), n = 2 * per + ri(r, 0, per), seq = rep(n, i => u[i % per]), K = pick(r, u), c = seq.filter(x => x === K).length, nm = KIND[K][0];
        return o('pat-shape', `下面 ${n} 個圖形，有幾個${nm}？`, c, `一輪有 ${per} 個，數一輪裏有幾個${nm}。`, `一輪是 ${u.map(x => KIND[x][0]).join('、')}；${n} 個圖形裏，${nm}有 ${c} 個。`, [c - 1, c + 1, c + 2, n - c], '', [],
          { svg: shapeRow(seq), why: why([c - 1, '漏了一個，沿着規律一個一個數。'], [c + 1, '多數了一個，看清楚是哪種圖形。'], [n - c, `${n - c} 是其他圖形的數目，題目問的是${nm}。`]) });
      }
    ],
    B: [
      /* a term far beyond the ones shown: find the round, then carry on */
      (r, p) => {
        const per = ri(r, 2, 3), u = unitOf(r, per, digits(r, p)), n = 2 * per + 1, k = n + ri(r, 2, 6), t = rep(n, i => u[i % per]), ans = u[(k - 1) % per];
        return o('pat-far', `${t.join('、')}。第 ${k} 個是幾？`, ans, '先找出一輪，再一輪一輪數下去。', `一輪是 ${u.join('、')}（${per} 個）；第 ${k} 個是一輪裏的第 ${(k - 1) % per + 1} 個，就是 ${ans}。`, [t[n - 1], u[n % per], u[k % per], ...u, ans + 1], '', [],
          { why: why([u[n % per], `這是第 ${n + 1} 個。要一直排到第 ${k} 個。`], [u[k % per], `數多了一個。第 ${k} 個是一輪裏的第 ${(k - 1) % per + 1} 個。`], [t[n - 1], `${t[n - 1]} 是最後寫出的一個，不是第 ${k} 個。`]) });
      },
      /* a longer row is drawn only in part: extend it and count */
      (r, p) => {
        const per = ri(r, 2, 3), u = unitOf(r, per, ['a', 'b', 'c']), n = 2 * per + 1, L = ri(r, 9, 15), K = pick(r, u), nm = KIND[K][0];
        const shown = rep(n, i => u[i % per]), all = rep(L, i => u[i % per]), c = all.filter(x => x === K).length, c0 = shown.filter(x => x === K).length;
        return o('pat-count', `圖形照規律排到 ${L} 個，${nm}有幾個？`, c, `先找出一輪，再排到 ${L} 個。`, `一輪是 ${u.map(x => KIND[x][0]).join('、')}；排到 ${L} 個，${nm}有 ${c} 個。`, [c0, c - 1, c + 1, L - c], '', [],
          { svg: shapeRow(shown), why: why([c0, `圖上只畫了 ${n} 個，要照規律排到 ${L} 個才數。`], [c - 1, '漏了一個，一輪一輪地數。'], [c + 1, `排到第 ${L} 個就停，別多排。`]) });
      }
    ]
  };
  const verify11 = q => {
    let m;
    if ((m = /^([\d、？]+)$/.exec(q.q))) {
      const toks = m[1].split('、'), idx = toks.indexOf('？'), t = toks.map(x => x === '？' ? null : +x), pr = minPeriod(t);
      return pr && (idx % pr.q) in pr.seen ? String(pr.seen[idx % pr.q]) : 'none';
    }
    if ((m = /^([\d、]+)。第 (\d+) 個是幾？$/.exec(q.q))) {
      const t = m[1].split('、').map(Number), pr = minPeriod(t), k = +m[2];
      return pr ? String(pr.seen[(k - 1) % pr.q]) : 'none';
    }
    if ((m = /^下面 (\d+) 個圖形，有幾個(.+?)？$/.exec(q.q))) { const s = svgKinds(q), k = KNAME[m[2]]; return s.length === +m[1] ? String(s.filter(x => x === k).length) : 'none'; }
    if ((m = /^圖形照規律排到 (\d+) 個，(.+?)有幾個？$/.exec(q.q))) {
      const s = svgKinds(q), pr = minPeriod(s), k = KNAME[m[2]]; let c = 0;
      for (let i = 0; i < +m[1]; i++) if (pr.seen[i % pr.q] === k) c++;
      return String(c);
    }
    return null;
  };

  WQOly.register({
    id: 'p1-1', grade: 1, n: 1, title: '找規律', icon: '🧱',
    card: { motto: '找出重複的一組', example: '🔴🔵🔴🔵🔴 → 🔵', art: art11 },
    lesson: [
      { t: 'show', say: '紅、藍、紅、藍……一直重複！', scene: { w: 'cycle', p: { n: 2, labels: ['🔴', '🔵'], nth: 7, unit: '個' }, still: true } },
      { t: 'predict', say: '紅、藍、紅、藍、紅、藍……', ask: '下一個是什麼顏色？', options: ['紅', '藍'], answer: '紅', scene: { w: 'cycle', p: { n: 2, labels: ['🔴', '🔵'], nth: 7, unit: '個' }, still: true }, reveal: '一紅一藍是一輪，下一輪又由紅開始！' },
      { t: 'do', say: '按「＋1 個」，數到第 7 個，看停在哪。', scene: { w: 'cycle', p: { n: 2, labels: ['🔴', '🔵'], nth: 7, unit: '個' } } },
      { t: 'show', say: '紅、藍、藍是一輪，每輪 3 個。', scene: { w: 'cycle', p: { n: 3, labels: ['🔴', '🔵', '🔵'], nth: 6, unit: '個' }, still: true } },
      { t: 'do', say: '這一輪有 3 個。數到第 10 個，停在哪？', scene: { w: 'cycle', p: { n: 3, labels: ['🔴', '🔵', '🟡'], nth: 10, unit: '個' } } },
      { t: 'try', say: '先找出一輪，再答。', scene: { w: 'cycle', p: { n: 3, labels: ['1', '2', '3'], nth: 8, unit: '個' }, still: true },
        q: { stem: '1、2、3、1、2、3、1、？', options: ['2', '3', '4'], answer: '2', hint: '一輪是 1、2、3。', why: { 3: '3 是上一輪的尾。1 後面是 2。', 4: '4 沒有出現過，數字只會重複。' } } },
      { t: 'card' }
    ],
    gens: g11, verify: verify11
  });

  /* ---- p1-3 有次序地數（只數同一大小；B 最多兩組）------------------------------------------------------------------------- */
  const COLS = [['紅色', '#ff6b81'], ['金色', '#ffc94a'], ['青色', '#3ee6d0'], ['紫色', '#c6a2ff'], ['藍色', '#7cc8ff']];
  const OBJS = [['糖', '粒'], ['波子', '粒'], ['鈕扣', '粒'], ['貼紙', '張']];
  const dot = (g, x, y, col, ring) => `<circle data-g="${g}" cx="${x}" cy="${y}" r="9" fill="${col}" stroke="${ring || 'rgba(11,16,48,.45)'}" stroke-width="${ring ? 3.2 : 1.5}"/>`;
  const spots = (r, n, cols, rowsN, x0, y0, dx, dy) => {
    const cells = []; for (let c = 0; c < cols; c++) for (let k = 0; k < rowsN; k++) cells.push([c, k]);
    return shuffle(r, cells).slice(0, n).map(([c, k]) => [x0 + c * dx + ri(r, -3, 3), y0 + k * dy + ri(r, -3, 3)]);
  };
  const scatterSvg = (r, n, col, label) => svgOf(240, 110, spots(r, n, 8, 3, 24, 22, 28, 33).map(([x, y]) => dot('i', x, y, col)).join(''), label);
  const art13 = `<svg viewBox="0 0 120 80">${[[20, 20], [46, 14], [72, 22], [98, 16], [30, 44], [58, 40], [86, 46]].map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="8" fill="${i < 4 ? '#3ee6d0' : '#ffc94a'}"/><text x="${x}" y="${y + 1}" text-anchor="middle" dominant-baseline="central" font-size="10" font-weight="900" fill="#0b1030">${i + 1}</text>`).join('')}<rect x="14" y="56" width="92" height="18" rx="9" fill="#c6a2ff"/><text x="60" y="66" text-anchor="middle" dominant-baseline="central" font-size="12" font-weight="900" fill="#0b1030">點一個，數一個</text></svg>`;
  const g13 = {
    A: [
      /* count one scattered group */
      (r, p) => {
        const m = name(r), ob = pick(r, OBJS), co = pick(r, COLS), n = N(r, p, 4, 18);
        return o('cnt-all', `${m}有${co[0]}${ob[0]}，數一數有幾${ob[1]}？`, n, '一個一個數，數過的記住。', `一個一個點著數，不漏不重，共 ${n} ${ob[1]}。`, [n - 1, n + 1, n - 2, n + 2], '', [],
          { svg: scatterSvg(r, n, co[1], `散開的${n}${ob[1]}${ob[0]}`), why: why([n - 1, `漏數了一${ob[1]}。邊數邊用手指點著。`], [n + 1, `有一${ob[1]}數了兩次。數過的要記住。`]) });
      },
      /* some are already counted (ringed): count the rest and put them together */
      (r, p) => {
        const m = name(r), ob = pick(r, OBJS), co = pick(r, COLS), a = N(r, p, 2, 10), b = ri(r, 1, Math.min(8, 18 - a)), n = a + b;
        const pts = spots(r, n, 8, 3, 24, 22, 28, 33);
        return o('cnt-split', `${m}數${ob[0]}，圈了的是數過的 ${a} ${ob[1]}。共有幾${ob[1]}？`, n, '再數沒有圈的，然後合起來。', `沒圈的有 ${b} ${ob[1]}；${a}＋${b}＝${n}。`, [a, b, n - 1, n + 1], `${a}+${b}`, [],
          { svg: svgOf(240, 110, pts.map(([x, y], i) => i < a ? dot('c', x, y, co[1], '#fff') : dot('u', x, y, co[1])).join(''), `圈了 ${a} 個，沒圈 ${b} 個`), why: why([a, '圈了的是數過的，還要加上沒圈的。'], [b, '沒圈的只是一部分，圈了的也要算進去。'], [n - 1, '合起來時漏了一個，再數一次。']) });
      },
      /* a row: how many are to the right of the ringed one */
      (r, p) => {
        const m = name(r), ob = pick(r, OBJS), co = pick(r, COLS), n = N(r, p, 5, 12), k = ri(r, 2, n - 2), sp = Math.min(22, 220 / n), ans = n - k;
        const body = rep(n, i => dot(i === k - 1 ? 'h' : 'i', 120 + (i - (n - 1) / 2) * sp, 40, co[1], i === k - 1 ? '#fff' : '')).join('');
        return o('cnt-ord', `${m}把${ob[0]}排成一行，圈了的是由左數第 ${k} ${ob[1]}。右邊還有幾${ob[1]}？`, ans, '圈了的那一個不算在右邊。', `圈了的是第 ${k} ${ob[1]}，一共 ${n} ${ob[1]}；${n}－${k}＝${ans}。`, [ans + 1, ans - 1, k - 1, n], `${n}-${k}`, [],
          { svg: svgOf(240, 80, body, `一行 ${n} 個，圈了第 ${k} 個`), why: why([ans + 1, '圈了的那一個不算在右邊，少數一個。'], [k - 1, '這是圈了的左邊，題目問右邊。'], [n, `${n} 是全部，右邊要減去左邊和圈了的。`]) });
      }
    ],
    B: [
      /* two boxes: count each, then put together */
      (r, p) => {
        const m = name(r), ob = pick(r, OBJS), co = pick(r, COLS), a = N(r, p, 2, 9), b = N(r, p, 2, Math.min(9, 18 - a)), n = a + b;
        const box = (x, k, g) => `<rect x="${x}" y="6" width="112" height="98" rx="12" fill="rgba(255,255,255,.07)" stroke="${CT}" stroke-width="2"/>` + spots(r, k, 4, 3, x + 18, 28, 26, 30).map(([px, py]) => dot(g, px, py, co[1])).join('');
        return o('cnt-two', `${m}有兩盒${co[0]}${ob[0]}。一共有幾${ob[1]}？`, n, '先數左盒，再數右盒，然後合起來。', `左盒 ${a} ${ob[1]}，右盒 ${b} ${ob[1]}；${a}＋${b}＝${n}。`, [a, b, n - 1, n + 1, Math.abs(a - b)], `${a}+${b}`, [],
          { svg: svgOf(240, 110, box(4, a, 'l') + box(124, b, 'r'), `左盒 ${a}，右盒 ${b}`), why: why([a, '只數了一盒，還有另一盒。'], [b, '只數了一盒，還有另一盒。'], [Math.abs(a - b), '兩盒要合起來（加），不是比較（減）。'], [n - 1, '合起來時少數了一個，再核對一次。']) });
      },
      /* two equal rows: count one row, then both */
      (r, p) => {
        const m = name(r), ob = pick(r, OBJS), co = pick(r, COLS), a = N(r, p, 3, 9), n = 2 * a, sp = Math.min(24, 216 / a);
        const row = (y, g) => rep(a, i => dot(g, 120 + (i - (a - 1) / 2) * sp, y, co[1])).join('');
        return o('cnt-rows', `${m}把${co[0]}${ob[0]}排成兩行，每行一樣多。共有幾${ob[1]}？`, n, '先數一行，再數第二行。', `每行 ${a} ${ob[1]}；${a}＋${a}＝${n}。`, [a, n - 1, n + 1, a + 1], `${a}+${a}`, [],
          { svg: svgOf(240, 100, row(30, 'r') + row(72, 's'), `兩行，每行 ${a} 個`), why: why([a, '這只是一行，有兩行要合起來。'], [n - 1, '少數了一個，一行一行再核對。'], [n + 1, '多數了一個，兩行之間沒有多的。']) });
      },
      /* two kinds of colour mixed: count each and compare */
      (r, p) => {
        const m = name(r), ob = pick(r, OBJS), b = N(r, p, 2, 7), a = b + ri(r, 1, Math.min(4, 9 - b)), n = a + b, pts = spots(r, n, 8, 3, 24, 22, 28, 33), d = a - b;
        return o('cnt-diff', `${m}的盤上有金色和青色的${ob[0]}。金色比青色多幾${ob[1]}？`, d, '先數金色，再數青色，然後比較。', `金色 ${a} ${ob[1]}，青色 ${b} ${ob[1]}；${a}－${b}＝${d}。`, [a, b, n, d + 1, d - 1], `${a}-${b}`, [],
          { svg: svgOf(240, 110, pts.map(([x, y], i) => i < a ? dot('g', x, y, CB) : dot('q', x, y, CA)).join(''), `金色 ${a}，青色 ${b}`), why: why([a, `${a} 是金色的數目，題目問相差多少。`], [n, '一共的數目是相加，「多幾」是相減。'], [d + 1, '兩邊都數清楚再減，別多算一個。']) });
      }
    ]
  };
  const verify13 = q => {
    const g = svgGroups(q), cnt = k => g.filter(x => x === k).length;
    let m;
    if (/數一數有幾.？$/.test(q.q)) return String(g.length);
    if ((m = /圈了的是數過的 (\d+) /.exec(q.q))) return cnt('c') === +m[1] ? String(cnt('c') + cnt('u')) : 'none';
    if (/由左數第 (\d+) .。右邊還有幾/.test(q.q)) return String(g.length - 1 - g.indexOf('h'));
    if (/^.+有兩盒.+。一共有幾/.test(q.q)) return String(cnt('l') + cnt('r'));
    if (/排成兩行，每行一樣多/.test(q.q)) return cnt('r') === cnt('s') ? String(cnt('r') + cnt('s')) : 'none';
    if (/金色比青色多幾/.test(q.q)) return String(cnt('g') - cnt('q'));
    return null;
  };

  WQOly.register({
    id: 'p1-3', grade: 1, n: 3, title: '有次序地數', icon: '👆',
    card: { motto: '一個一個數，不漏不重', example: '點一個，數一個', art: art13 },
    lesson: [
      { t: 'show', say: '一個一個搬，一邊搬一邊數。不漏不重！', scene: { w: 'tenframe', p: { a: 0, b: 10 }, still: true } },
      { t: 'predict', say: '已經數了 3 個，還有 2 個沒數。', ask: '一共有幾個？', options: ['4', '5', '6'], answer: '5', scene: { w: 'tenframe', p: { a: 3, b: 2 }, still: true }, reveal: '數過的 3 個，加沒數的 2 個，共 5 個！' },
      { t: 'do', say: '把右邊的點一個一個拖去左框，邊拖邊數。', scene: { w: 'tenframe', p: { a: 0, b: 10 } } },
      { t: 'show', say: '數數像跳格：每跳一格，數一個。', scene: { w: 'numline', p: { min: 0, max: 8, start: 0, target: 6, steps: [1], hops: rep(6, () => ({ n: 1 })) }, still: true } },
      { t: 'do', say: '按「＋1」，一下數一個，數到 7。', scene: { w: 'numline', p: { min: 0, max: 10, start: 0, target: 7, steps: [1] } } },
      { t: 'try', say: '用手指一個一個點著數。', q: { stem: '🍎🍎🍎🍎🍎🍎🍎 有幾個？', options: ['6', '7', '8'], answer: '7', hint: '每個只點一次。', why: { 6: '漏數了一個，再慢慢數一次。', 8: '有一個數了兩次，數過的要記住。' } } },
      { t: 'card' }
    ],
    gens: g13, verify: verify13
  });

  /* ---- p1-4 排隊問題 ------------------------------------------------------------------------------------------------------ */
  const queueSvg = (n, marks, label) => {
    const sp = Math.min(20, 200 / n), x0 = 120 - (n - 1) / 2 * sp;
    return svgOf(240, 60, rep(n, i => { const g = marks[i] || 'p', col = g === 'p' ? CA : (g === 'me' ? CC : CB), x = x0 + i * sp; return `<circle data-g="${g}" cx="${x}" cy="24" r="6.4" fill="${col}"/><path d="M${x - 8} 46v-4a8 8 0 0 1 16 0v4z" fill="${col}" opacity=".85"/>`; }).join('') + `<text x="6" y="56" font-size="11" font-weight="800" fill="${CT}">前</text><text x="234" y="56" text-anchor="end" font-size="11" font-weight="800" fill="${CT}">後</text>`, label);
  };
  const art14 = `<svg viewBox="0 0 120 80">${rep(8, i => `<circle cx="${14 + i * 13}" cy="24" r="5" fill="${i === 3 ? '#ff8fc7' : i < 3 ? '#3ee6d0' : '#ffc94a'}"/><path d="M${14 + i * 13 - 6} 38a6 6 0 0 1 12 0z" fill="${i === 3 ? '#ff8fc7' : i < 3 ? '#3ee6d0' : '#ffc94a'}"/>`).join('')}<rect x="10" y="50" width="100" height="22" rx="11" fill="#c6a2ff"/><text x="60" y="61" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="900" fill="#0b1030">3 ＋ 1 ＋ 4 ＝ 8</text></svg>`;
  const twoNames = r => { const s = shuffle(r, NAMES); return [s[0], s[1]]; };
  const g14 = {
    A: [
      /* in front + behind + the person */
      (r, p) => {
        const m = name(r), a = N(r, p, 1, 8), b = N(r, p, 1, 8), n = a + b + 1;
        return o('q-around', `${m}前面有 ${a} 人，後面有 ${b} 人。隊伍共有幾人？`, n, `別忘了${m}自己。`, `前面 ${a} 人，後面 ${b} 人，再加${m}自己：${a}＋${b}＋1＝${n}。`, [a + b, n + 1, a + b + 2, a, b], `${a}+${b}+1`, [],
          { svg: queueSvg(n, { [a]: 'me' }, `前面 ${a} 人，後面 ${b} 人`), why: why([a + b, `${m}自己也是隊伍裏的一個人，要加上。`], [n + 1, `${m}只算一次，加 1 就夠了。`]) });
      },
      /* rank + behind */
      (r, p) => {
        const m = name(r), k = N(r, p, 2, 9), b = N(r, p, 1, 8), n = k + b;
        return o('q-rank', `${m}排第 ${k} 個，後面有 ${b} 人。共有幾人？`, n, `排第 ${k}，前面有 ${k - 1} 人。`, `前面 ${k - 1} 人，${m}自己 1 人，後面 ${b} 人；${k - 1}＋1＋${b}＝${n}。`, [n + 1, n - 1, b, k], `${k}+${b}`, [],
          { svg: queueSvg(n, { [k - 1]: 'me' }, `排第 ${k}，後面 ${b} 人`), why: why([n + 1, `排第 ${k} 個已經包括${m}自己，不用再加 1。`], [n - 1, `前面 ${k - 1} 人，還有${m}自己，要加回來。`], [b, '這只是後面的人，前面的也要算。']) });
      },
      /* how many in front */
      (r, p) => {
        const m = name(r), k = N(r, p, 2, 12), ans = k - 1;
        return o('q-front', `${m}排第 ${k} 個。前面有幾人？`, ans, `第 ${k} 個包括${m}自己。`, `排第 ${k}，前面的人數比 ${k} 少 1：${k}－1＝${ans}。`, [k, ans - 1, ans + 2, k + 1], `${k}-1`, [],
          { svg: queueSvg(k, { [k - 1]: 'me' }, `排第 ${k}`), why: why([k, `第 ${k} 個包括${m}自己，前面少一個。`], [ans - 1, '前面的人要全部數，只扣掉自己一個。']) });
      }
    ],
    B: [
      /* k-th from the front and j-th from the back: the person is counted twice */
      (r, p) => {
        const m = name(r), k = N(r, p, 2, 9), j = N(r, p, 2, 9), n = k + j - 1;
        return o('q-both', `${m}從前面數是第 ${k} 個，從後面數是第 ${j} 個。共有幾人？`, n, `${m}被數了兩次。`, `${k}＋${j}把${m}數了兩次，要減 1：${k}＋${j}－1＝${n}。`, [k + j, k + j - 2, k, j, n + 2], `${k}+${j}-1`, [],
          { why: why([k + j, `${m}被數了兩次（前面數一次，後面數一次），要減 1。`], [k + j - 2, '只重複了一個人，減 1 就夠了。'], [Math.max(k, j), '前面和後面的人合起來才是全部。']) });
      },
      /* two people in a queue: how many between them */
      (r, p) => {
        const [m1, m2] = twoNames(r), k = N(r, p, 1, 7), j = k + ri(r, 2, N(r, p, 3, 8)), ans = j - k - 1;
        return o('q-between', `${m1}排第 ${k} 個，${m2}排第 ${j} 個。中間有幾人？`, ans, '中間不包括這兩人。', `${j}－${k}＝${j - k}，其中包括${m2}，要再減 1：${ans}。`, [j - k, ans + 1, ans - 1, j, k], `${j}-${k}-1`, [],
          { svg: queueSvg(j, { [k - 1]: 'me', [j - 1]: 'm2' }, `${m1}排第 ${k}，${m2}排第 ${j}`), why: why([j - k, `${j}－${k} 連${m2}也數進去了，中間不包括這兩人。`], [ans - 1, '中間的人全部都要數，別減多了。'], [ans + 2, '兩個人的位置都不能數進中間。']) });
      },
      /* people leave / join behind: first find the whole queue */
      (r, p) => {
        const m = name(r), a = N(r, p, 1, 6), b = N(r, p, 3, 8), leave = r() < .5, d = leave ? ri(r, 1, b - 1) : ri(r, 1, Math.min(4, 17 - (a + b + 1))), t = a + 1 + b, n = leave ? t - d : t + d;
        const act = leave ? `後面走了 ${d} 人，剩幾人？` : `後面又來 ${d} 人，共幾人？`;
        return o('q-change', `${m}前面 ${a} 人，後面 ${b} 人。${act}`, n, '先算出本來共有幾人。', `本來 ${a}＋${b}＋1＝${t} 人；${leave ? `走了 ${d} 人，${t}－${d}` : `又來 ${d} 人，${t}＋${d}`}＝${n}。`, [t, a + b + (leave ? -d : d), n + 1, n - 1, leave ? t + d : t - d], `${a}+${b}+1${leave ? '-' : '+'}${d}`, [],
          { why: why([t, `${t} 是本來的人數，還要${leave ? '減去走了的' : '加上來了的'}。`], [a + b + (leave ? -d : d), `別忘了${m}自己。`], [leave ? t + d : t - d, leave ? '走了是減，不是加。' : '來了是加，不是減。']) });
      }
    ]
  };
  const verify14 = q => {
    let m;
    const build = (front, back, extra) => front + 1 + back + (extra || 0);
    if ((m = /^.+?前面有 (\d+) 人，後面有 (\d+) 人。隊伍共有幾人？$/.exec(q.q))) return String(build(+m[1], +m[2]));
    if ((m = /^.+?排第 (\d+) 個，後面有 (\d+) 人。共有幾人？$/.exec(q.q))) { let c = 0; for (let i = 1; i <= +m[1] + +m[2]; i++) c++; return String(c); }
    if ((m = /^.+?排第 (\d+) 個。前面有幾人？$/.exec(q.q))) { let c = 0; for (let i = 1; i < +m[1]; i++) c++; return String(c); }
    if ((m = /^.+?從前面數是第 (\d+) 個，從後面數是第 (\d+) 個。共有幾人？$/.exec(q.q))) { for (let n = 1; n < 60; n++) if (n - +m[1] + 1 === +m[2]) return String(n); return 'none'; }
    if ((m = /^.+?排第 (\d+) 個，.+?排第 (\d+) 個。中間有幾人？$/.exec(q.q))) { let c = 0; for (let i = +m[1] + 1; i < +m[2]; i++) c++; return String(c); }
    if ((m = /^.+?前面 (\d+) 人，後面 (\d+) 人。後面(走了|又來) (\d+) 人，(?:剩|共)幾人？$/.exec(q.q))) { let n = 0; for (let i = 0; i < +m[1]; i++) n++; n++; for (let i = 0; i < +m[2]; i++) n++; for (let i = 0; i < +m[4]; i++) n += m[3] === '走了' ? -1 : 1; return String(n); }
    return null;
  };

  WQOly.register({
    id: 'p1-4', grade: 1, n: 4, title: '排隊問題', icon: '🚶',
    card: { motto: '前＋後＋自己', example: '前 3 後 4 共 8 人', art: art14 },
    lesson: [
      { t: 'show', say: '小明前面 3 人，後面 4 人。還有小明自己！', scene: { w: 'bars', p: { rows: [{ label: '隊', segs: [{ u: 3, c: 'a', text: '前 3' }, { u: 1, c: 'd', text: '我' }, { u: 4, c: 'b', text: '後 4' }] }], braces: [{ from: 0, to: 0, label: '共 8', c: 't' }] }, still: true } },
      { t: 'predict', say: '前面 3 人，後面 4 人，再加自己。', ask: '隊伍一共有幾人？', options: ['7', '8', '9'], answer: '8', scene: { w: 'bars', p: { rows: [{ label: '隊', segs: [{ u: 3, c: 'a', text: '前 3' }, { u: 1, c: 'd', text: '我' }, { u: 4, c: 'b', text: '後 4' }] }], braces: [{ from: 0, to: 0, label: '共 ?', c: 't' }] }, still: true }, reveal: '3＋1＋4＝8。別漏了自己！' },
      { t: 'do', say: '拖金色那段，令後面有 4 人。', scene: { w: 'bars', p: { rows: [{ label: '隊', segs: [{ u: 3, c: 'a', text: '前 3' }, { u: 1, c: 'd', text: '我' }, { u: 1, c: 'b', edit: true, target: 4, start: 1, min: 1, max: 8 }] }], braces: [{ from: 0, to: 0, label: '共 8 人', c: 't' }] } } },
      { t: 'show', say: '排第 4 個，前面只有 3 人。', scene: { w: 'bars', p: { rows: [{ label: '隊', segs: [{ u: 3, c: 'a', text: '前 3' }, { u: 1, c: 'd', text: '第 4' }] }], braces: [{ from: 0, to: 0, label: '共 4', c: 't' }] }, still: true } },
      { t: 'do', say: '拖青色那段：前面 5 人，我排第 6。', scene: { w: 'bars', p: { rows: [{ label: '隊', segs: [{ u: 1, c: 'a', edit: true, target: 5, start: 1, min: 1, max: 8 }, { u: 1, c: 'd', text: '我' }] }], braces: [{ from: 0, to: 0, label: '第 6', c: 't' }] } } },
      { t: 'try', say: '前、後、自己，一個都不漏。', scene: { w: 'bars', p: { rows: [{ label: '隊', segs: [{ u: 4, c: 'a', text: '前 4' }, { u: 1, c: 'd', text: '我' }, { u: 2, c: 'b', text: '後 2' }] }], braces: [{ from: 0, to: 0, label: '共 ?', c: 't' }] }, still: true },
        q: { stem: '小美前面有 4 人，後面有 2 人。共有幾人？', options: ['6', '7', '8'], answer: '7', hint: '加上小美自己。', why: { 6: '4＋2 沒有數小美自己。', 8: '小美只算一次，不是兩次。' } } },
      { t: 'card' }
    ],
    gens: g14, verify: verify14
  });

  /* ---- p1-5 比較推理 ------------------------------------------------------------------------------------------------------ */
  const art15 = `<svg viewBox="0 0 120 80">${[[22, 44, 26, '#3ee6d0'], [60, 30, 40, '#ffc94a'], [98, 14, 56, '#c6a2ff']].map(([x, y, h, c]) => `<rect x="${x - 12}" y="${y + 20}" width="24" height="${h}" rx="6" fill="${c}"/>`).join('')}<path d="M34 50l14-8M72 36l14-8" stroke="#ff8fc7" stroke-width="2.4" stroke-linecap="round"/><text x="22" y="14" text-anchor="middle" font-size="12" font-weight="900" fill="#c3cbf7">丙</text><text x="60" y="14" text-anchor="middle" font-size="12" font-weight="900" fill="#c3cbf7">乙</text><text x="98" y="14" text-anchor="middle" font-size="12" font-weight="900" fill="#c3cbf7">甲</text></svg>`;
  const barPair = (a, b, la, lb, diffLabel, hideTop) => {
    const u = Math.min(11, 200 / Math.max(a, b)), x0 = 36;
    return svgOf(240, 76, `<text x="6" y="22" font-size="12" font-weight="800" fill="${CT}">${la}</text><rect x="${x0}" y="10" width="${a * u}" height="22" rx="6" fill="${CA}"/><text x="${x0 + a * u / 2}" y="22" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="900" fill="#0b1030">${hideTop ? '?' : a}</text>`
      + `<text x="6" y="56" font-size="12" font-weight="800" fill="${CT}">${lb}</text><rect x="${x0}" y="44" width="${b * u}" height="22" rx="6" fill="${CB}"/><rect x="${x0 + b * u}" y="44" width="${(a - b) * u}" height="22" rx="6" fill="none" stroke="${CC}" stroke-width="2.4" stroke-dasharray="5 4"/>`
      + `<text x="${x0 + b * u + (a - b) * u / 2}" y="56" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="900" fill="${CC}">${diffLabel}</text>`, `${la}比${lb}多`);
  };
  /* "X 比 Y 高" or "Y 比 X 矮" - X is the taller */
  const cmpText = (r, tall, short) => r() < .5 ? `${tall}比${short}高。` : `${short}比${tall}矮。`;
  const g15 = {
    A: [
      /* three people in a chain, clues shuffled */
      (r, p) => {
        const ns = shuffle(r, NAMES).slice(0, 3), cl = shuffle(r, [cmpText(r, ns[0], ns[1]), cmpText(r, ns[1], ns[2])]), w = ri(r, 0, 2), fromTall = r() < .5;
        const ans = fromTall ? w + 1 : 3 - w;
        return o('cmp-chain3', `${cl.join('')}${fromTall ? '由高數起' : '由矮數起'}，${ns[w]}排第幾？`, ans, '先排出誰最高、誰最矮。', `高矮是：${ns[0]}、${ns[1]}、${ns[2]}（高→矮）；${fromTall ? '由高' : '由矮'}數起，${ns[w]}排第 ${ans}。`, [1, 2, 3, 4].filter(x => x !== ans), '', [],
          { why: why([4 - ans, '看清楚是由高數起，還是由矮數起。'], [ans === 1 ? 2 : ans - 1, '先把三個人由高到矮排出來，再數。'], [ans + 1, '只看一句話不夠，兩句要連起來。']) });
      },
      /* sweets: X has a, X has d more than Y; Y has? */
      (r, p) => {
        const [m1, m2] = twoNames(r), a = N(r, p, 7, 18), d = ri(r, 1, Math.min(6, a - 2)), b = a - d;
        return o('cmp-less', `${m1}有 ${a} 粒糖，比${m2}多 ${d} 粒。${m2}有幾粒？`, b, `${m1}多，所以${m2}比較少。`, `多 ${d} 粒就是差 ${d} 粒；${a}－${d}＝${b}。`, [a + d, d, b + 1, b - 1], `${a}-${d}`, [],
          { svg: barPair(a, b, m1.n, m2.n, `多 ${d}`), why: why([a + d, `${m1}比較多，${m2}要比 ${a} 少，用減。`], [d, `${d} 是相差，不是${m2}的粒數。`]) });
      },
      /* sweets: Y has b, X has d more than Y; X has? */
      (r, p) => {
        const [m1, m2] = twoNames(r), b = N(r, p, 3, 12), d = ri(r, 1, Math.min(6, 18 - b)), a = b + d;
        return o('cmp-more', `${m1}有 ${b} 粒糖，${m2}比${m1}多 ${d} 粒。${m2}有幾粒？`, a, `${m2}比較多。`, `${m2}多 ${d} 粒；${b}＋${d}＝${a}。`, [b - d > 0 ? b - d : b + 2, d, a + 1, a - 1], `${b}+${d}`, [],
          { svg: barPair(a, b, m2.n, m1.n, `多 ${d}`, true), why: why([b - d, `${m2}比較多，要比 ${b} 多，用加。`], [d, `${d} 是多出的，${m1}的 ${b} 粒也要算進去。`]) });
      }
    ],
    B: [
      /* four things in a chain with clues out of order */
      (r, p) => {
        const L = shuffle(r, ['甲', '乙', '丙', '丁']), cl = shuffle(r, [0, 1, 2].map(i => cmpText(r, L[i], L[i + 1]))), w = ri(r, 0, 3);
        return o('cmp-chain4', `${cl.join('')}由高數起，${L[w]}排第幾？`, w + 1, '先把四個由高到矮排好。', `高→矮是：${L.join('、')}；${L[w]}排第 ${w + 1}。`, [1, 2, 3, 4].filter(x => x !== w + 1), '', [],
          { why: why([4 - w, '看清楚是由高數起，不是由矮數起。'], [w === 0 ? 2 : w, '三句話要連起來排，不能只看一句。'], [w + 2, '排位要由高的一端開始數。']) });
      },
      /* two steps: X has d1 more than Y, Y has d2 more than Z */
      (r, p) => {
        const d1 = ri(r, 1, 5), d2 = ri(r, 1, 5), c = N(r, p, 2, 8), v = { 甲: c + d1 + d2, 乙: c + d2, 丙: c }, up = r() < .6, ask = up ? '甲' : '丙', given = up ? '丙' : '甲';
        const mid = v.乙, ans = v[ask];
        return o('cmp-two', `甲比乙多 ${d1} 粒，乙比丙多 ${d2} 粒。${given}有 ${v[given]}，${ask}有幾粒？`, ans, '先找出乙有幾粒。', up ? `乙：${c}＋${d2}＝${mid}；甲：${mid}＋${d1}＝${ans}。` : `乙：${v.甲}－${d1}＝${mid}；丙：${mid}－${d2}＝${ans}。`,
          [mid, up ? c + d1 : v.甲 - d1 - d2 + d2, ans + 1, ans - 1, up ? c + d1 + d2 + 1 : v.甲 + d1 + d2], up ? `${c}+${d2}+${d1}` : `${v.甲}-${d1}-${d2}`, [],
          { why: why([mid, `${mid} 是乙的粒數，題目問${ask}。`], [up ? c + d1 : v.甲 - d1, up ? '甲比乙多，乙又比丙多，兩個差都要加。' : '丙比乙少，乙又比甲少，兩個差都要減。'], [up ? c + d1 + d2 + 1 : v.甲 + d1, '一步一步算，不要多加或少減。']) });
      }
    ]
  };
  const verify15 = q => {
    let m;
    const rank = (clauses, who, fromTall) => {
      const names = new Set(); const gt = []; // gt: [taller, shorter]
      clauses.forEach(s => { const mm = /^(.+?)比(.+?)(高|矮)$/.exec(s); if (!mm) throw new Error('bad ' + s); names.add(mm[1]); names.add(mm[2]); gt.push(mm[3] === '高' ? [mm[1], mm[2]] : [mm[2], mm[1]]); });
      const all = [...names], beats = {}; all.forEach(a => { beats[a] = new Set(); });
      gt.forEach(([a, b]) => beats[a].add(b));
      for (let k = 0; k < all.length; k++) all.forEach(a => [...beats[a]].forEach(b => beats[b].forEach(c => beats[a].add(c))));
      const taller = all.filter(a => beats[a].has(who)).length, shorter = beats[who].size;
      return fromTall ? taller + 1 : shorter + 1;
    };
    if ((m = /^(.+。)(由高數起|由矮數起)，(.+?)排第幾？$/.exec(q.q))) return String(rank(m[1].split('。').filter(Boolean), m[3], m[2] === '由高數起'));
    if ((m = /^(.+?)有 (\d+) 粒糖，比(.+?)多 (\d+) 粒。(.+?)有幾粒？$/.exec(q.q))) { for (let b = 0; b < 40; b++) if (b + +m[4] === +m[2]) return String(b); return 'none'; }
    if ((m = /^(.+?)有 (\d+) 粒糖，(.+?)比(.+?)多 (\d+) 粒。(.+?)有幾粒？$/.exec(q.q))) { for (let a = 0; a < 40; a++) if (a - +m[5] === +m[2]) return String(a); return 'none'; }
    if ((m = /^甲比乙多 (\d+) 粒，乙比丙多 (\d+) 粒。(.)有 (\d+)，(.)有幾粒？$/.exec(q.q))) {
      const d1 = +m[1], d2 = +m[2];
      for (let c = 0; c < 60; c++) { const v = { 丙: c, 乙: c + d2, 甲: c + d2 + d1 }; if (v[m[3]] === +m[4]) return String(v[m[5]]); }
      return 'none';
    }
    return null;
  };

  WQOly.register({
    id: 'p1-5', grade: 1, n: 5, title: '比較推理', icon: '📏',
    card: { motto: '由已知推到未知', example: '甲比乙高，乙比丙高', art: art15 },
    lesson: [
      { t: 'show', say: '小明比小美高，小美比小欣高。', scene: { w: 'sortcards', p: { cards: [{ id: 'c', label: '小欣', emoji: '👧', h: 80 }, { id: 'b', label: '小美', emoji: '🧒', h: 110 }, { id: 'a', label: '小明', emoji: '👦', h: 140 }], order: ['c', 'b', 'a'], start: ['a', 'c', 'b'], axis: '矮 → 高' }, still: true } },
      { t: 'predict', say: '小明比小美高。小美比小欣高。', ask: '誰最高？', options: ['小明', '小美', '小欣'], answer: '小明', scene: { w: 'sortcards', p: { cards: [{ id: 'c', label: '小欣', emoji: '👧', h: 80, hide: true }, { id: 'b', label: '小美', emoji: '🧒', h: 110, hide: true }, { id: 'a', label: '小明', emoji: '👦', h: 140, hide: true }], order: ['c', 'b', 'a'], start: ['a', 'c', 'b'], axis: '矮 → 高' }, still: true }, reveal: '小明比小美高，小美又比小欣高。小明最高！' },
      { t: 'do', say: '小明比小美高，小美比小欣高。排排看！', scene: { w: 'sortcards', p: { cards: [{ id: 'c', label: '小欣', emoji: '👧', h: 80, hide: true }, { id: 'b', label: '小美', emoji: '🧒', h: 110, hide: true }, { id: 'a', label: '小明', emoji: '👦', h: 140, hide: true }], order: ['c', 'b', 'a'], start: ['b', 'a', 'c'], axis: '矮 → 高' } } },
      { t: 'show', say: '甲比乙高，乙比丙高，所以甲比丙高。', scene: { w: 'sortcards', p: { cards: [{ id: 'z', label: '丙', emoji: '🐥', h: 70 }, { id: 'y', label: '乙', emoji: '🐰', h: 105 }, { id: 'x', label: '甲', emoji: '🐻', h: 140 }], order: ['z', 'y', 'x'], start: ['x', 'z', 'y'], axis: '矮 → 高' }, still: true } },
      { t: 'do', say: '甲比乙高，乙比丙高，丙比丁高。', scene: { w: 'sortcards', p: { cards: [{ id: 'd', label: '丁', emoji: '🐥', h: 60, hide: true }, { id: 'c', label: '丙', emoji: '🐱', h: 90, hide: true }, { id: 'b', label: '乙', emoji: '🐰', h: 120, hide: true }, { id: 'a', label: '甲', emoji: '🐻', h: 150, hide: true }], order: ['d', 'c', 'b', 'a'], start: ['b', 'd', 'a', 'c'], axis: '矮 → 高' } } },
      { t: 'try', say: '先排好，再數第幾。', q: { stem: '小明比小美高，小美比小欣高。由高數起，小欣排第幾？', options: ['1', '2', '3'], answer: '3', hint: '先排出誰最高、誰最矮。', why: { 1: '第 1 是最高的，小明才最高。', 2: '第 2 是小美，小欣比小美矮。' } } },
      { t: 'card' }
    ],
    gens: g15, verify: verify15
  });
})();

;
/* 小二 · 5 units, all finished. See docs/奧數路線-20261022/單元撰寫指引.md. Numbers stay within 100 (week = 7, other rounds 2-7). */
/* ---- g2_segs（小二 p2-4 數線段專用教具）：直線上 n 點，逐對點選／拖拉畫線段，重複不計，畫齊 n(n-1)/2 條達標。
   p: {n:3-6, labels?:['A','B',..]}  鍵盤：Tab 到點、Enter 選第一點再 Enter 選第二點。 ----------------------------------------------- */
if (typeof WQOlyWidgets !== 'undefined') (function () {
  'use strict';
  const { el, txt, fit, burst, runner, drag, keys, sbtn, place, C } = WQOlyWidgets;
  const sfx = (api, n) => { try { api && api.sfx && api.sfx(n); } catch (_) { /* */ } };
  const changed = api => { try { api.onChange && api.onChange(); } catch (_) { /* */ } };
  const COL = [C.aqua, C.gold, C.pink, C.violet, C.green];
  WQOlyWidgets.make('g2_segs', { mount(host, p, api) {
    const n = Math.max(3, Math.min(6, p.n || 4)), total = n * (n - 1) / 2, inter = p.mode !== 'show';
    const L = (p.labels && p.labels.length >= n ? p.labels : 'ABCDEF'.split('')).slice(0, n);
    const run = runner(api); let svg, W, H, pts, links, sel, cnt, note, g1, ly, areaH, timers = [], rub = null, chipRows, solved;
    const later = (f, ms) => { const t = setTimeout(f, ms); timers.push(t); };
    const key = (i, j) => (i < j ? i + '-' + j : j + '-' + i);
    function build() {
      run.cancel(); timers.forEach(clearTimeout); timers = []; links = new Map(); sel = null; solved = false;
      ({ svg, W, H } = fit(host));
      svg.setAttribute('aria-label', `直線上有 ${n} 個點，每兩點連成一條線段`);
      chipRows = Math.ceil(total / 8); const chipH = chipRows * 27, top = 62;
      let line = Math.min(H - 10 - chipH - 46, top + 170);
      const extra = Math.max(0, H - 10 - top - ((line - top) + 46 + chipH));
      ly = line + extra / 2; areaH = ly - top;
      const dx = (W - 80) / (n - 1);
      cnt = txt(svg, W / 2, 28, '', { size: 26, fill: C.text });
      note = txt(svg, W / 2, 52, '', { size: 18, fill: C.muted, weight: 700 });
      el('line', { x1: 24, y1: ly, x2: W - 24, y2: ly, stroke: C.muted, 'stroke-width': 5, 'stroke-linecap': 'round' }, svg);
      g1 = el('g', {}, svg);
      pts = [];
      for (let i = 0; i < n; i++) {
        const x = 40 + i * dx, g = el('g', { class: 'r80-chip', role: inter ? 'button' : 'img', 'aria-label': `點 ${L[i]}` }, svg);
        el('circle', { r: 30, fill: 'rgba(0,0,0,0)' }, g);
        const ring = el('circle', { r: 20, fill: 'none', stroke: C.gold, 'stroke-width': 4, opacity: 0 }, g);
        el('circle', { r: 12, fill: C.gold, stroke: C.goldD, 'stroke-width': 3 }, g);
        txt(g, 0, 36, L[i], { size: 22, fill: C.aqua, weight: 900 });
        place(g, x, ly); const d = { i, x, g, ring }; pts.push(d);
        if (inter) {
          drag(g, svg, {
            start(pt) { const prev = sel; sel = d; sync(); rub = el('line', { x1: x, y1: ly - 14, x2: x, y2: ly - 14, stroke: C.gold, 'stroke-width': 4, 'stroke-linecap': 'round', 'stroke-dasharray': '2 8', 'pointer-events': 'none' }, svg); return { prev }; },
            move(pt) { rub && (rub.setAttribute('x2', pt.x), rub.setAttribute('y2', Math.min(pt.y, ly - 14))); },
            end(pt, ctx, e, moved) { rub && rub.remove(); rub = null; if (!moved) return; const t = pts.find(o => o !== d && Math.hypot(pt.x - o.x, pt.y - ly) < Math.min(36, dx * .5)); sel = null; if (t) link(d, t); else sync(); },
            tap(ctx) { rub && rub.remove(); rub = null; sel = ctx.prev; choose(d); }
          });
          keys(g, { act: () => choose(d) });
        }
      }
      /* chips: one per drawn segment */
      const cy0 = ly + 56; svg.__cy0 = cy0;
      sync(); upd();
    }
    function sync() { pts.forEach(d => d.ring.setAttribute('opacity', d === sel ? 1 : 0)); }
    function upd() {
      cnt.textContent = `已數 ${links.size} 條` + (solved ? ' ✓' : ''); cnt.setAttribute('fill', solved ? C.gold : C.text);
      if (solved) { note.textContent = Array.from({ length: n - 1 }, (_, i) => n - 1 - i).join('＋') + `＝${total} 條`; note.setAttribute('fill', C.gold); }
    }
    function say(s) { if (solved) return; note.textContent = s; note.setAttribute('fill', C.bad); later(() => { if (!solved && note.textContent === s) note.textContent = ''; }, 1400); }
    function choose(d) {
      if (!sel) { sel = d; sfx(api, 'tap'); sync(); return; }
      if (sel === d) { sel = null; sync(); return; }
      const a = sel; sel = null; link(a, d);
    }
    function link(a, b) {
      if (a.i > b.i) { const t = a; a = b; b = t; }
      const k = key(a.i, b.i);
      if (links.has(k)) { sfx(api, 'bad'); sync(); say(`${L[a.i]}${L[b.i]} 已經數過了`); return; }
      const s = b.i - a.i, h = 16 + (areaH - 30) * (s / (n - 1)), col = COL[a.i % COL.length], y = ly - 16;
      const path = el('path', { d: `M${a.x} ${y} Q${(a.x + b.x) / 2} ${y - 2 * h} ${b.x} ${y}`, fill: 'none', stroke: col, 'stroke-width': 4.5, 'stroke-linecap': 'round', opacity: .95 }, g1);
      if (!api.reduced) { const len = path.getTotalLength ? path.getTotalLength() : 200; path.style.strokeDasharray = len; path.style.strokeDashoffset = len; path.getBoundingClientRect(); path.style.transition = 'stroke-dashoffset .28s ease-out'; path.style.strokeDashoffset = 0; }
      const fl = el('line', { x1: a.x, y1: ly, x2: b.x, y2: ly, stroke: C.pink, 'stroke-width': 11, 'stroke-linecap': 'round', opacity: .75, 'pointer-events': 'none' }, svg);
      if (api.reduced) fl.remove(); else later(() => fl.remove(), 650);
      const idx = links.size, cw = 42, per = 8, row = Math.floor(idx / per), inRow = Math.min(per, total - row * per), col0 = idx % per;
      const cx = W / 2 - (inRow * (cw + 2)) / 2 + col0 * (cw + 2) + cw / 2, cy = svg.__cy0 + row * 27;
      const g = el('g', {}, svg); el('rect', { x: cx - cw / 2, y: cy - 11, width: cw, height: 22, rx: 11, fill: col }, g); txt(g, cx, cy + 1, L[a.i] + L[b.i], { size: 14, fill: C.ink, weight: 900 });
      links.set(k, { path, g }); sfx(api, 'pop'); sync();
      if (links.size === total) { solved = true; sfx(api, 'good'); burst(svg, W / 2, ly - 30, api); }
      upd(); changed(api);
    }
    build();
    return {
      check: () => links.size === total,
      reset() { build(); changed(api); },
      destroy() { run.destroy(); timers.forEach(clearTimeout); },
      async demo() {
        build(); if (!(await run.sleep(350))) return false;
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { link(pts[i], pts[j]); if (!(await run.sleep(420))) return false; }
        changed(api); return true;
      }
    };
  } });
})();

(function () {
  'use strict';
  const { o, N, ri, pick, shuffle, name } = WQOly.helpers;
  const CA = '#3ee6d0', CB = '#ffc94a', CC = '#ff8fc7', CV = '#c6a2ff', CT = '#c3cbf7';
  const rep = (n, f) => Array.from({ length: n }, (_, i) => f(i));
  const svgOf = (w, h, body, label) => `<svg viewBox="0 0 ${w} ${h}" role="img" aria-label="${label}">${body}</svg>`;
  const why = (...kv) => { const w = {}; kv.forEach(([k, t]) => { if (k !== undefined && k !== null && !Number.isNaN(k) && k >= 0 && !(k in w)) w[k] = t; }); return w; };
  const WD = ['一', '二', '三', '四', '五', '六', '日'];

  /* ---- p2-1 數列跳數 ----------------------------------------------------------------------------------------------------- */
  const art21 = `<svg viewBox="0 0 120 80"><path d="M10 52h100" stroke="#c3cbf7" stroke-width="3" stroke-linecap="round"/>${[0, 1, 2, 3, 4].map(i => `<path d="M${16 + i * 22} 46v12" stroke="#c3cbf7" stroke-width="2.4"/><text x="${16 + i * 22}" y="70" text-anchor="middle" font-size="11" font-weight="800" fill="#c3cbf7">${2 + i * 2}</text>`).join('')}${[0, 1, 2, 3].map(i => `<path d="M${16 + i * 22} 44Q${27 + i * 22} 20 ${38 + i * 22} 44" stroke="${['#3ee6d0', '#ffc94a', '#ff8fc7', '#c6a2ff'][i]}" stroke-width="3" fill="none" stroke-dasharray="1 6" stroke-linecap="round"/><text x="${27 + i * 22}" y="22" text-anchor="middle" font-size="12" font-weight="900" fill="${['#3ee6d0', '#ffc94a', '#ff8fc7', '#c6a2ff'][i]}">＋2</text>`).join('')}</svg>`;
  const g21 = {
    A: [
      /* next term, going up or down */
      (r, p) => {
        const d = N(r, p, 2, 5), n = ri(r, 4, 5), down = r() < .25, s = down ? N(r, p, d * (n + 1) + 1, 70) : N(r, p, 1, 30), sg = down ? -d : d;
        const t = rep(n, i => s + sg * i), ans = s + sg * n, last = t[n - 1];
        return o('seq-next', `${t.join('、')}、？`, ans, '看相鄰兩個數，差多少？', `每次${down ? '減' : '加'} ${d}：${last}${down ? '－' : '＋'}${d}＝${ans}。`, [last + (down ? -1 : 1), ans + 1, ans - 1, last + sg * 2], `${last}${down ? '-' : '+'}${d}`, [],
          { why: why([last + (down ? -1 : 1), `相鄰兩個數差 ${d}，不是 1。`], [last + sg * 2, `只${down ? '減' : '加'}一次 ${d}，不是兩次。`], [last, `${last} 是上一個數，要再${down ? '減' : '加'} ${d}。`]) });
      },
      /* one term hidden in the middle */
      (r, p) => {
        const d = N(r, p, 2, 5), n = ri(r, 5, 6), s = N(r, p, 1, 30), m = ri(r, 1, n - 2), t = rep(n, i => s + d * i), ans = t[m];
        return o('seq-gap', t.map((v, i) => i === m ? '？' : v).join('、'), ans, '看前後兩個數，差多少？', `每次加 ${d}：${t[m - 1]}＋${d}＝${ans}。`, [t[m - 1], t[m + 1], ans + 1, ans - 1, ans + d], `${t[m - 1]}+${d}`, [],
          { why: why([t[m - 1], `${t[m - 1]} 是空位前面的數，要再加 ${d}。`], [t[m + 1], `${t[m + 1]} 是空位後面的數，空位要少 ${d}。`], [ans + 1, `每次的差是 ${d}，不是 1。`]) });
      },
      /* a frog jumps k times */
      (r, p) => {
        const a = N(r, p, 0, 30), d = N(r, p, 2, 6), k = ri(r, 2, 6), ans = a + k * d;
        return o('seq-frog', `小青蛙從 ${a} 開始，每次跳 ${d} 格，跳 ${k} 次到哪裏？`, ans, `每次跳 ${d} 格，跳 ${k} 次。`, `${k} 次共跳 ${k}×${d}＝${k * d} 格；${a}＋${k * d}＝${ans}。`, [a + d * (k - 1), a + d * (k + 1), k * d, a + k], `${a}+${k}*${d}`, [],
          { why: why([a + d * (k - 1), `跳 ${k} 次要加 ${k} 次 ${d}，少加了一次。`], [k * d, `${k * d} 是跳過的格數，還要加上起點 ${a}。`], [a + d * (k + 1), `跳 ${k} 次就停，不要多加一次。`]) });
      }
    ],
    B: [
      /* the n-th term of a list that is only partly written */
      (r, p) => {
        const d = N(r, p, 2, 6), s = N(r, p, 1, 20), k = ri(r, 6, 12), t = rep(4, i => s + d * i), ans = s + d * (k - 1);
        return o('seq-nth', `${t.join('、')}……第 ${k} 個數是幾？`, ans, `每次加 ${d}。第 ${k} 個要加幾次？`, `第 1 個是 ${s}，到第 ${k} 個加了 ${k - 1} 次 ${d}：${s}＋${(k - 1) * d}＝${ans}。`, [s + d * k, s + d * (k - 2), (k - 1) * d, ans + 1], `${s}+${k - 1}*${d}`, [],
          { why: why([s + d * k, `第 ${k} 個只加了 ${k - 1} 次，因為第 1 個本來就在。`], [(k - 1) * d, `${(k - 1) * d} 是加上去的部分，還要加起點 ${s}。`], [s + d * (k - 2), `要加 ${k - 1} 次，不是 ${k - 2} 次。`]) });
      },
      /* two far-apart terms are given: find the step first */
      (r, p) => {
        const d = N(r, p, 2, 6), s = ri(r, 1, 10), i = ri(r, 2, 3), j = i + ri(r, 2, 3), k = j + ri(r, 1, 2), x = s + d * (i - 1), y = s + d * (j - 1), ans = s + d * (k - 1);
        return o('seq-two', `每次加同一個數：第 ${i} 個是 ${x}，第 ${j} 個是 ${y}。第 ${k} 個是幾？`, ans, `${y}－${x} 是幾次加出來的？`, `${j - i} 次加了 ${y - x}，每次加 ${d}；第 ${k} 個是 ${y}＋${(k - j) * d}＝${ans}。`, [y + d, y + (k - j) * (d + 1), y - x, ans + 1, ans - 1], `${y}+${k - j}*${d}`, [],
          { why: why([y - x, `${y - x} 是 ${j - i} 次加出來的，每次要除以 ${j - i}。`], [y + (k - j) * (d + 1), '每次加的數要算對：先除，再加。'], [y + d, `第 ${k} 個比第 ${j} 個多 ${k - j} 次，不是 1 次。`]) });
      },
      /* how many jumps to reach b */
      (r, p) => {
        const d = N(r, p, 2, 6), t = N(r, p, 3, 10), a = N(r, p, 0, 20), b = a + t * d;
        return o('seq-times', `小青蛙從 ${a} 開始，每次跳 ${d} 格。跳到 ${b} 要跳幾次？`, t, '先算要跳多少格。', `${b}－${a}＝${t * d} 格；每次 ${d} 格，${t * d}÷${d}＝${t} 次。`, [t * d, t + 1, t - 1, b / d | 0], `${t * d}/${d}`, [],
          { why: why([t * d, `${t * d} 是要跳的格數，每次跳 ${d} 格，還要除以 ${d}。`], [t + 1, '起點不用跳，跳的次數沒有多一次。'], [t - 1, `要跳到剛好是 ${b}，一次都不能少。`]) });
      }
    ]
  };
  const verify21 = q => {
    let m;
    if ((m = /^([\d、？]+)$/.exec(q.q))) {
      const tk = m[1].split('、'), idx = tk.indexOf('？'), kn = tk.map((x, i) => x === '？' ? null : [i, +x]).filter(Boolean), a = kn[0], z = kn[kn.length - 1];
      const d = (z[1] - a[1]) / (z[0] - a[0]); return String(a[1] + d * (idx - a[0]));
    }
    if ((m = /^小青蛙從 (\d+) 開始，每次跳 (\d+) 格，跳 (\d+) 次到哪裏？$/.exec(q.q))) { let x = +m[1]; for (let i = 0; i < +m[3]; i++) x += +m[2]; return String(x); }
    if ((m = /^([\d、]+)……第 (\d+) 個數是幾？$/.exec(q.q))) { const t = m[1].split('、').map(Number), d = t[1] - t[0]; let x = t[0]; for (let i = 1; i < +m[2]; i++) x += d; return String(x); }
    if ((m = /^每次加同一個數：第 (\d+) 個是 (\d+)，第 (\d+) 個是 (\d+)。第 (\d+) 個是幾？$/.exec(q.q))) {
      const i = +m[1], x = +m[2], j = +m[3], y = +m[4], k = +m[5];
      for (let d = 0; d < 40; d++) if (x + d * (j - i) === y) { let v = y; for (let n = j; n < k; n++) v += d; return String(v); }
      return 'none';
    }
    if ((m = /^小青蛙從 (\d+) 開始，每次跳 (\d+) 格。跳到 (\d+) 要跳幾次？$/.exec(q.q))) { let x = +m[1], c = 0; while (x < +m[3]) { x += +m[2]; c++; } return x === +m[3] ? String(c) : 'none'; }
    return null;
  };
  WQOly.register({
    id: 'p2-1', grade: 2, n: 1, title: '數列跳數', icon: '🐸',
    card: { motto: '找相鄰的差', example: '2、4、6、8、10', art: art21 },
    lesson: [
      { t: 'show', say: '青蛙每次跳 2 格：2、4、6、8……', scene: { w: 'numline', p: { min: 0, max: 12, start: 0, target: 8, steps: [2], hops: rep(4, () => ({ n: 2 })) }, still: true } },
      { t: 'predict', say: '2、4、6、8，每次都加 2。', ask: '下一個數是幾？', options: ['9', '10', '12'], answer: '10', scene: { w: 'numline', p: { min: 0, max: 12, start: 0, target: 10, steps: [2], hops: rep(5, () => ({ n: 2 })) }, still: true }, reveal: '8 再加 2，就是 10！' },
      { t: 'do', say: '按「＋3」，一次跳 3 格，跳到 15。', scene: { w: 'numline', p: { min: 0, max: 15, start: 0, target: 15, steps: [3] } } },
      { t: 'show', say: '看相鄰兩個數，差多少，就是跳多少。', scene: { w: 'numline', p: { min: 0, max: 30, start: 5, target: 25, steps: [5], hops: rep(4, () => ({ n: 5 })) }, still: true } },
      { t: 'do', say: '4、8、12……每次加 4，跳到 24。', scene: { w: 'numline', p: { min: 0, max: 24, start: 0, target: 24, steps: [4] } } },
      { t: 'try', say: '先看相鄰兩個數的差。', scene: { w: 'numline', p: { min: 0, max: 30, start: 5, target: 25, steps: [5], hops: rep(4, () => ({ n: 5 })) }, still: true },
        q: { stem: '5、10、15、20、？', options: ['22', '25', '30'], answer: '25', hint: '相鄰兩個數差 5。', why: { 22: '差是 5，不是 2。', 30: '20 只加一次 5，是 25。' } } },
      { t: 'card' }
    ],
    gens: g21, verify: verify21
  });

  /* ---- p2-2 巧算加減 ----------------------------------------------------------------------------------------------------- */
  const art22 = `<svg viewBox="0 0 120 80"><rect x="6" y="10" width="46" height="22" rx="6" fill="rgba(255,255,255,.1)" stroke="#3ee6d0" stroke-width="2"/><text x="29" y="21" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="900" fill="#3ee6d0">98</text><rect x="68" y="10" width="46" height="22" rx="6" fill="rgba(255,255,255,.1)" stroke="#ffc94a" stroke-width="2"/><text x="91" y="21" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="900" fill="#ffc94a">47</text><path d="M80 34Q66 48 40 36" stroke="#ff8fc7" stroke-width="2.4" fill="none" stroke-dasharray="3 3"/><text x="60" y="49" text-anchor="middle" font-size="11" font-weight="900" fill="#ff8fc7">借 2</text><rect x="10" y="56" width="100" height="18" rx="9" fill="#c6a2ff"/><text x="60" y="66" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="900" fill="#0b1030">100 ＋ 45</text></svg>`;
  const nz = (r, lo, hi) => { let v = ri(r, lo, hi); if (v % 10 === 0) v += v < hi ? 1 : -1; return v; };
  const g22 = {
    A: [
      /* add a number just below a ten: borrow to make the ten */
      (r, p) => {
        const u = N(r, p, 3, 9), e = ri(r, 1, 3), a = 10 * u - e, b = N(r, p, 12, 60), ans = a + b;
        return o('quick-add', `${a}＋${b}＝？先湊成整十。`, ans, `${a} 差 ${e} 就是 ${10 * u}。`, `${b} 分出 ${e}：${a}＋${e}＝${10 * u}；${10 * u}＋${b - e}＝${ans}。`, [ans + e, ans - e, ans + 2 * e, 10 * u + b], `${a}+${b}`, [],
          { why: why([ans + e, `借了 ${e} 給 ${a}，${b} 要少 ${e}，別忘了減。`], [ans - e, `${b} 只分出 ${e}，剩下 ${b - e}，不是再減一次。`], [10 * u + b, `${b} 分出了 ${e}，只剩 ${b - e}。`]) });
      },
      /* subtract a number just below a ten: take the ten, then give back */
      (r, p) => {
        const u = N(r, p, 2, 8), e = ri(r, 1, 3), b = 10 * u - e, a = ri(r, b + 6, 100), ans = a - b;
        return o('quick-sub', `${a}－${b}＝？先減整十，再補回。`, ans, `${b} 差 ${e} 就是 ${10 * u}。`, `先減 ${10 * u}：${a}－${10 * u}＝${a - 10 * u}；多減了 ${e}，加回來：${ans}。`, [a - 10 * u, a - 10 * u - e, ans + e, ans - e], `${a}-${b}`, [],
          { why: why([a - 10 * u, `減多了 ${e}，要補回 ${e}。`], [a - 10 * u - e, `多減的 ${e} 要加回來，不是再減。`], [ans + e, `補回 ${e} 之後就是答案，不用再加。`]) });
      },
      /* how many more to reach 100 */
      (r, p) => {
        const a = nz(r, N(r, p, 11, 89), 89), ans = 100 - a, oc = 10 - a % 10, tc = 9 - Math.floor(a / 10);
        return o('quick-comp', `${a}＋？＝100`, ans, `個位 ${a % 10} 要配 ${oc}，十位再配。`, `${a % 10}＋${oc}＝10；十位 ${Math.floor(a / 10)}＋${tc}＝9；合起來是 ${tc}${oc}，即 ${ans}。`, [ans + 10, ans - 10, tc * 10 + oc + 1, a], `100-${a}`, [],
          { why: why([ans + 10, '個位湊成 10 之後，十位只要配成 9，不是 10。'], [ans - 10, '十位要配成 9，別配少了。'], [a, `${a} 是已經有的，題目問還差多少。`]) });
      }
    ],
    B: [
      /* three numbers: two make a round number */
      (r, p) => {
        const T = r() < .5 ? 100 : 50, a = T === 100 ? nz(r, 11, 89) : nz(r, 11, 39), c = T - a, b = nz(r, 11, T === 100 ? 50 : 40), arr = shuffle(r, [a, b, c]), ans = b + T;
        return o('quick-pair', `${arr.join('＋')}＝？找出和是 ${T} 的一對。`, ans, `哪兩個加起來是 ${T}？`, `${a}＋${c}＝${T}；${T}＋${b}＝${ans}。`, [T, ans + 10, ans - 10, a + b, b + c], arr.join('+'), [],
          { why: why([T, `${T} 只是一對的和，還要加上剩下的 ${b}。`], [a + b, `${a}＋${b} 不是整十，要先找湊成 ${T} 的一對。`], [ans - 10, `${T}＋${b} 才是答案，十位別少算。`]) });
      },
      /* a + b - c where b and c are close */
      (r, p) => {
        const k = ri(r, 1, 9), c = N(r, p, 21, 70), b = c + k, a = ri(r, 10, 70), ans = a + k;
        return o('quick-addsub', `${a}＋${b}－${c}＝？`, ans, `${b} 和 ${c} 很接近。先算 ${b}－${c}。`, `${b}－${c}＝${k}；${a}＋${k}＝${ans}。`, [a + b + c, a + b, ans + 10, ans - 1, k], `${a}+${b}-${c}`, [],
          { why: why([a + b, `${a}＋${b} 之後還要減 ${c}。`], [a + b + c, '後面是「－」，要減去，不是加上。'], [k, `${k} 只是 ${b}－${c}，還要加上 ${a}。`]) });
      },
      /* four numbers: two pairs of round numbers */
      (r, p) => {
        const a = nz(r, 11, 89), c = 100 - a, b = nz(r, 11, 39), d = 50 - b, arr = shuffle(r, [a, b, c, d]);
        return o('quick-four', `${arr.join('＋')}＝？找出湊整的兩對。`, 150, '哪兩個和是 100？哪兩個和是 50？', `${a}＋${c}＝100；${b}＋${d}＝50；100＋50＝150。`, [100, 50, 140, 160, 120], arr.join('+'), [],
          { why: why([100, '只湊成一對，另一對（和是 50）也要加。'], [50, '只算了一對，還有和是 100 的一對。'], [140, '兩對的和是 100 和 50，不是 100 和 40。']) });
      }
    ]
  };
  const verify22 = q => {
    let m;
    if ((m = /^(\d+)＋？＝100$/.exec(q.q))) { for (let x = 0; x <= 100; x++) if (+m[1] + x === 100) return String(x); return 'none'; }
    if ((m = /^(\d+)＋(\d+)＋(\d+)＋(\d+)＝？/.exec(q.q))) return String(+m[1] + +m[2] + +m[3] + +m[4]);
    if ((m = /^(\d+)＋(\d+)＋(\d+)＝？/.exec(q.q))) return String(+m[1] + +m[2] + +m[3]);
    if ((m = /^(\d+)＋(\d+)－(\d+)＝？/.exec(q.q))) return String(+m[1] + +m[2] - +m[3]);
    if ((m = /^(\d+)＋(\d+)＝？/.exec(q.q))) return String(+m[1] + +m[2]);
    if ((m = /^(\d+)－(\d+)＝？/.exec(q.q))) return String(+m[1] - +m[2]);
    return null;
  };
  const ln = (lo, hi, start, target, steps, hops) => ({ w: 'numline', p: { min: lo, max: hi, start, target, steps, hops } });
  WQOly.register({
    id: 'p2-2', grade: 2, n: 2, title: '巧算加減', icon: '🧮',
    card: { motto: '湊整再補', example: '98＋47＝100＋45', art: art22 },
    lesson: [
      { t: 'show', say: '98＋47：先湊成 100，再加 45。', scene: Object.assign(ln(95, 150, 98, 145, [2, 45], [{ n: 2 }, { n: 45 }]), { still: true }) },
      { t: 'predict', say: '98 差一點點就是 100。', ask: '47 要先分出多少給 98？', options: ['1', '2', '3'], answer: '2', scene: Object.assign(ln(95, 150, 98, 145, [2, 45], [{ n: 2 }, { n: 45 }]), { still: true }), reveal: '98＋2＝100，47 還剩 45！' },
      { t: 'do', say: '按「＋2」湊成 100，再按「＋45」。', scene: ln(95, 150, 98, 145, [2, 45]) },
      { t: 'show', say: '36＋19：先加 20，再減多加的 1。', scene: Object.assign(ln(30, 60, 36, 55, [20], [{ n: 20 }, { n: -1 }]), { still: true }) },
      { t: 'do', say: '59＋26：先加 1 湊成 60，再加 25。', scene: ln(55, 90, 59, 85, [1, 25]) },
      { t: 'try', say: '先湊整十，再補回來。', scene: Object.assign(ln(45, 85, 48, 83, [2, 33], [{ n: 2 }, { n: 33 }]), { still: true }),
        q: { stem: '48＋35＝？', options: ['81', '83', '85'], answer: '83', hint: '48 加 2 是 50。', why: { 81: '35 分出 2 後剩 33，不是 31。', 85: '48 只加了 2，35 要少 2 才是 33。' } } },
      { t: 'card' }
    ],
    gens: g22, verify: verify22
  });

  /* ---- p2-3 間隔與植樹 --------------------------------------------------------------------------------------------------- */
  const art23 = `<svg viewBox="0 0 120 80"><path d="M12 44h96" stroke="#c3cbf7" stroke-width="3" stroke-linecap="round"/>${[0, 1, 2, 3, 4].map(i => `<text x="${14 + i * 23}" y="38" text-anchor="middle" dominant-baseline="central" font-size="17">🌳</text>`).join('')}${[0, 1, 2, 3].map(i => `<text x="${25.5 + i * 23}" y="58" text-anchor="middle" font-size="10" font-weight="800" fill="#ffc94a">${i + 1}</text>`).join('')}<rect x="14" y="62" width="92" height="16" rx="8" fill="#c6a2ff"/><text x="60" y="70.5" text-anchor="middle" dominant-baseline="central" font-size="11" font-weight="900" fill="#0b1030">4 段 ＝ 5 棵</text></svg>`;
  const roadSvg = (segs, d) => {
    if (segs > 12) return svgOf(240, 56, `<path d="M16 28h208" stroke="${CT}" stroke-width="4" stroke-linecap="round"/><text x="120" y="48" text-anchor="middle" font-size="12" font-weight="800" fill="${CB}">每隔 ${d} 米</text>`, `路，每隔 ${d} 米`);
    const x0 = 20, w = 200 / segs;
    return svgOf(240, 56, `<path d="M${x0 - 6} 24h212" stroke="${CT}" stroke-width="4" stroke-linecap="round"/>` + rep(segs + 1, i => `<path d="M${x0 + i * w} 16v16" stroke="${CB}" stroke-width="3"/>`).join('') + `<text x="120" y="48" text-anchor="middle" font-size="12" font-weight="800" fill="${CB}">每段 ${d} 米</text>`, `路分成 ${segs} 段`);
  };
  const D23 = [2, 3, 4, 5, 10];
  const OB23 = [['樹', '棵'], ['燈柱', '支'], ['旗', '面']];
  const g23 = {
    A: [
      /* both ends planted */
      (r, p) => {
        const d = pick(r, D23), segs = N(r, p, 3, Math.min(14, 100 / d | 0)), L = segs * d, ans = segs + 1;
        return o('plant-both', `路長 ${L} 米，每隔 ${d} 米種一棵樹，兩端都種。共種幾棵？`, ans, `先算有幾段：${L}÷${d}。`, `${L}÷${d}＝${segs} 段；兩端都種，棵數比段數多 1：${segs}＋1＝${ans}。`, [segs, segs + 2, segs - 1, L], `${L}/${d}+1`, [],
          { svg: roadSvg(segs, d), why: why([segs, `${segs} 是段數。兩端都種，棵數比段數多 1。`], [segs - 1, '兩端都種不是減 1，是加 1。'], [L, `${L} 是路長，要先除以 ${d} 才知道有幾段。`]) });
      },
      /* gaps between a row */
      (r, p) => {
        const n = N(r, p, 3, 20), ob = pick(r, OB23), ans = n - 1;
        return o('plant-gaps', `一排有 ${n} ${ob[1]}${ob[0]}，相鄰兩${ob[1]}之間算一個間隔。共有幾個間隔？`, ans, '畫一畫：兩個之間有一個間隔。', `${n} 個排成一行，間隔比${ob[0]}少 1：${n}－1＝${ans}。`, [n, n + 1, n - 2, 2 * n], `${n}-1`, [],
          { why: why([n, `${n} 是${ob[0]}的數目。間隔比${ob[0]}少 1。`], [n - 2, '只有最左和最右的外面沒有間隔，只少 1 個。']) });
      },
      /* length of a row */
      (r, p) => {
        const n = N(r, p, 4, 15), d = N(r, p, 2, 6), ans = (n - 1) * d;
        return o('plant-len', `一排 ${n} 棵樹，兩端都有樹，每隔 ${d} 米一棵。全長幾米？`, ans, '先算有幾個間隔。', `${n} 棵有 ${n - 1} 個間隔；${n - 1}×${d}＝${ans} 米。`, [n * d, (n - 2) * d, n - 1, ans + d], `${n - 1}*${d}`, [],
          { why: why([n * d, `間隔比樹少 1，是 ${n - 1} 個，不是 ${n} 個。`], [(n - 2) * d, `${n} 棵樹有 ${n - 1} 個間隔，不是 ${n - 2}。`], [n - 1, `${n - 1} 是間隔數，每個間隔 ${d} 米，還要乘。`]) });
      },
      /* a pond: a circle */
      (r, p) => {
        const d = pick(r, [2, 3, 4, 5]), segs = N(r, p, 4, Math.min(20, 100 / d | 0)), L = segs * d;
        return o('plant-circle', `池塘一圈長 ${L} 米，每隔 ${d} 米種一棵樹。共種幾棵？`, segs, '一圈沒有頭尾，想想最後一棵在哪裏。', `${L}÷${d}＝${segs}。圍成一圈，棵數＝段數。`, [segs + 1, segs - 1, L, segs + 2], `${L}/${d}`, [],
          { why: why([segs + 1, '圍成一圈沒有兩端，棵數不用加 1。'], [segs - 1, '一圈上每段的起點都有樹，不用減 1。'], [L, `${L} 是一圈的長度，要除以 ${d}。`]) });
      },
      /* R3.31 variety: other objects and verbs, both ends */
      (r, p) => {
        const it = pick(r, [['種', '棵', '樹'], ['插', '面', '旗'], ['放', '盞', '燈'], ['掛', '串', '燈籠'], ['擺', '盆', '花']]), d = pick(r, D23), segs = N(r, p, 3, Math.min(14, 100 / d | 0)), L = segs * d, ans = segs + 1;
        return o('plant-both', `路長 ${L} 米，每隔 ${d} 米${it[0]}一${it[1]}${it[2]}，兩端都${it[0]}。共幾${it[1]}？`, ans, `先算有幾段：${L}÷${d}。`, `${L}÷${d}＝${segs} 段；兩端都${it[0]}，${it[2]}比段數多 1：${segs}＋1＝${ans}。`, [segs, segs + 2, segs - 1, L], `${L}/${d}+1`, [],
          { svg: roadSvg(segs, d), why: why([segs, `${segs} 是段數。兩端都${it[0]}，要比段數多 1。`], [segs - 1, '兩端都有不是減 1，是加 1。'], [L, `${L} 是路長，要先除以 ${d} 才知道有幾段。`]) });
      },
      /* R3.31 variety: a fence story */
      (r, p) => {
        const m = name(r), it = pick(r, [['盆', '花'], ['支', '旗'], ['個', '膠樽'], ['盞', '小燈']]), d = pick(r, D23), segs = N(r, p, 3, Math.min(14, 100 / d | 0)), L = segs * d, ans = segs + 1;
        return o('plant-both', `${m}沿着 ${L} 米長的圍欄，每隔 ${d} 米放一${it[0]}${it[1]}，頭尾都放。要幾${it[0]}？`, ans, `先算圍欄分成幾段：${L}÷${d}。`, `${L}÷${d}＝${segs} 段；頭尾都放，要 ${segs}＋1＝${ans}${it[0]}。`, [segs, segs + 2, segs - 1, L], `${L}/${d}+1`, [],
          { svg: roadSvg(segs, d), why: why([segs, `${segs} 是段數。頭尾都放，要比段數多 1。`], [segs - 1, '頭尾都放不是減 1，是加 1。'], [L, `${L} 是圍欄的長度，要先除以 ${d}。`]) });
      },
      /* R3.31 variety: find the distance from the number planted */
      (r, p) => {
        const d = pick(r, D23), segs = N(r, p, 3, Math.min(14, 100 / d | 0)), L = segs * d, n = segs + 1, it = pick(r, [['種', '棵樹'], ['放', '盞燈'], ['插', '面旗']]);
        return o('plant-len', `路長 ${L} 米，兩端都${it[0]}，共${it[0]}了 ${n} ${it[1]}。每隔幾米一${it[1][0]}？`, d, `${n} 件有幾段？先減 1。`, `${n} ${it[1]}有 ${n}－1＝${segs} 段；${L}÷${segs}＝${d} 米。`, [Math.round(L / n) || 1, L / (segs + 2) | 0 || 1, segs, L], `${L}/(${n}-1)`, [],
          { svg: roadSvg(segs, '？'), why: why([segs, `${segs} 是段數，每段多長要用 ${L} 除。`], [L, `${L} 是全長，不是每段的長度。`]) });
      },
      /* R3.31 variety: one end only */
      (r, p) => {
        const it = pick(r, [['種', '棵', '樹'], ['放', '盞', '燈'], ['插', '面', '旗']]), d = pick(r, D23), segs = N(r, p, 3, Math.min(14, 100 / d | 0)), L = segs * d;
        return o('plant-both', `路長 ${L} 米，每隔 ${d} 米${it[0]}一${it[1]}${it[2]}，只${it[0]}一端。共幾${it[1]}？`, segs, `先算有幾段：${L}÷${d}。`, `${L}÷${d}＝${segs} 段；只${it[0]}一端，每段有一${it[1]}，共 ${segs} ${it[1]}。`, [segs + 1, segs - 1, L, segs + 2], `${L}/${d}`, [],
          { svg: roadSvg(segs, d), why: why([segs + 1, '兩端都有才加 1，只種一端就等於段數。'], [segs - 1, '只種一端，棵數等於段數，不用減 1。'], [L, `${L} 是路長，要先除以 ${d}。`]) });
      },
      /* R3.31 variety: children in a line */
      (r, p) => {
        const n = N(r, p, 4, 15), d = N(r, p, 2, 6), ans = (n - 1) * d, who = pick(r, [['同學', '位'], ['小朋友', '位'], ['隊員', '位']]);
        return o('plant-len', `${n} ${who[1]}${who[0]}排成一行，兩端都有人，相隔都是 ${d} 米。頭尾相距幾米？`, ans, '先算有幾個間隔。', `${n} 人有 ${n - 1} 個間隔；${n - 1}×${d}＝${ans} 米。`, [n * d, (n - 2) * d, n - 1, ans + d], `${n - 1}*${d}`, [],
          { why: why([n * d, `間隔比人少 1，是 ${n - 1} 個，不是 ${n} 個。`], [(n - 2) * d, `${n} 人有 ${n - 1} 個間隔，不是 ${n - 2}。`], [n - 1, `${n - 1} 是間隔數，每個間隔 ${d} 米，還要乘。`]) });
      }
    ],
    B: [
      /* both ends left empty */
      (r, p) => {
        const d = pick(r, D23), segs = N(r, p, 4, Math.min(14, 100 / d | 0)), L = segs * d, ans = segs - 1;
        return o('plant-none', `路長 ${L} 米，每隔 ${d} 米放一盞燈，兩端都不放。共放幾盞？`, ans, `先算有幾段：${L}÷${d}。`, `${L}÷${d}＝${segs} 段；兩端都不放，燈比段數少 1：${segs}－1＝${ans}。`, [segs, segs + 1, segs - 2, L], `${L}/${d}-1`, [],
          { svg: roadSvg(segs, d), why: why([segs, `${segs} 是段數。兩端都不放，燈比段數少 1。`], [segs + 1, '兩端都放才是加 1，這題兩端不放。'], [L, `${L} 是路長，要先除以 ${d}。`]) });
      },
      /* plant again in the middle of every gap */
      (r, p) => {
        const n = N(r, p, 3, 12), ans = 2 * n - 1;
        return o('plant-mid', `一排 ${n} 棵樹，兩端都有。在每兩棵中間再種一棵，共有幾棵？`, ans, '先算有幾個間隔，就要種幾棵。', `${n} 棵有 ${n - 1} 個間隔，新種 ${n - 1} 棵；${n}＋${n - 1}＝${ans}。`, [2 * n, n + n + 1, n - 1, n + 1, ans + 2], `${n}+${n}-1`, [],
          { why: why([2 * n, `新種的是 ${n - 1} 棵（間隔數），不是 ${n} 棵。`], [n - 1, `${n - 1} 是新種的，原來的 ${n} 棵也要算。`], [ans + 2, '間隔比樹少 1，所以新種的比 n 少 1。']) });
      },
      /* how many more to plant */
      (r, p) => {
        const d = pick(r, D23), segs = N(r, p, 5, Math.min(14, 100 / d | 0)), L = segs * d, n = ri(r, 2, segs), ans = segs + 1 - n;
        return o('plant-miss', `路長 ${L} 米，每隔 ${d} 米種一棵，兩端都種。已種 ${n} 棵，還要種幾棵？`, ans, '先算一共要種幾棵。', `${L}÷${d}＋1＝${segs + 1} 棵；已種 ${n} 棵，${segs + 1}－${n}＝${ans}。`, [segs - n, segs + 2 - n, segs + 1, n], `${L}/${d}+1-${n}`, [],
          { why: why([segs - n, '一共要種的是段數加 1（兩端都種），別少算。'], [segs + 1, `${segs + 1} 是一共要種的，已種 ${n} 棵要減去。`], [segs + 2 - n, '一共是段數加 1，不用再多加。']) });
      }
    ]
  };
  const verify23 = q => {
    let m;
    const treesAt = (L, d, first, last) => { let c = 0; for (let x = 0; x <= L; x += d) if ((x > 0 || first) && (x < L || last)) c++; return c; };
    if ((m = /^路長 (\d+) 米，每隔 (\d+) 米種一棵樹，兩端都種。共種幾棵？$/.exec(q.q))) return String(treesAt(+m[1], +m[2], true, true));
    if ((m = /^一排有 (\d+) .+?，相鄰兩.之間算一個間隔。共有幾個間隔？$/.exec(q.q))) { let c = 0; for (let i = 1; i < +m[1]; i++) c++; return String(c); }
    if ((m = /^一排 (\d+) 棵樹，兩端都有樹，每隔 (\d+) 米一棵。全長幾米？$/.exec(q.q))) { let x = 0; for (let i = 1; i < +m[1]; i++) x += +m[2]; return String(x); }
    if ((m = /^路長 (\d+) 米，每隔 (\d+) 米.一.{1,4}，兩端都.。共幾/.exec(q.q))) return String(treesAt(+m[1], +m[2], true, true));
    if ((m = /^..沿着 (\d+) 米長的圍欄，每隔 (\d+) 米放一.+，頭尾都放。要幾/.exec(q.q))) return String(treesAt(+m[1], +m[2], true, true));
    if ((m = /^路長 (\d+) 米，兩端都.，共.了 (\d+) .{2}。每隔幾米一.？$/.exec(q.q))) return String(+m[1] / (+m[2] - 1));
    if ((m = /^路長 (\d+) 米，每隔 (\d+) 米.一.{1,4}，只.一端。共幾/.exec(q.q))) { let c = 0; for (let x = 0; x < +m[1]; x += +m[2]) c++; return String(c); }
    if ((m = /^(\d+) .{1,5}排成一行，兩端都有人，相隔都是 (\d+) 米。頭尾相距幾米？$/.exec(q.q))) { let x = 0; for (let i = 1; i < +m[1]; i++) x += +m[2]; return String(x); }
    if ((m = /^池塘一圈長 (\d+) 米，每隔 (\d+) 米種一棵樹。共種幾棵？$/.exec(q.q))) { let c = 0; for (let x = 0; x < +m[1]; x += +m[2]) c++; return String(c); }
    if ((m = /^路長 (\d+) 米，每隔 (\d+) 米放一盞燈，兩端都不放。共放幾盞？$/.exec(q.q))) return String(treesAt(+m[1], +m[2], false, false));
    if ((m = /^一排 (\d+) 棵樹，兩端都有。在每兩棵中間再種一棵，共有幾棵？$/.exec(q.q))) { let c = 0; for (let i = 0; i < +m[1]; i++) { c++; if (i < +m[1] - 1) c++; } return String(c); }
    if ((m = /^路長 (\d+) 米，每隔 (\d+) 米種一棵，兩端都種。已種 (\d+) 棵，還要種幾棵？$/.exec(q.q))) return String(treesAt(+m[1], +m[2], true, true) - +m[3]);
    return null;
  };
  WQOly.register({
    id: 'p2-3', grade: 2, n: 3, title: '間隔與植樹', icon: '🌳',
    card: { motto: '棵數＝段數＋1', example: '4 段種 5 棵', art: art23 },
    lesson: [
      { t: 'show', say: '路分成 4 段，每段 5 米，兩端都要種樹。', scene: { w: 'rowplace', p: { segments: 4, ends: 'both', span: 5, unit: '米' }, still: true } },
      { t: 'predict', say: '一條路分成 4 段，兩端都要種。', ask: '要種幾棵樹？', options: ['4', '5', '6'], answer: '5', scene: { w: 'rowplace', p: { segments: 4, ends: 'both', span: 5, unit: '米' }, still: true }, reveal: '兩端都種，棵數比段數多 1！' },
      { t: 'do', say: '把樹苗拖到路上，每個圈放一棵。', scene: { w: 'rowplace', p: { segments: 4, ends: 'both', span: 5, unit: '米' } } },
      { t: 'show', say: '只種一端，另一端不種：棵數＝段數。', scene: { w: 'rowplace', p: { segments: 5, ends: 'one', span: 4, unit: '米' }, still: true } },
      { t: 'do', say: '圍成一圈，6 段種幾棵？放放看。', scene: { w: 'rowplace', p: { segments: 6, circle: true, span: 3, unit: '米' } } },
      { t: 'try', say: '想想兩端有沒有種。', scene: { w: 'rowplace', p: { segments: 6, ends: 'both', span: 4, unit: '米' }, still: true },
        q: { stem: '一條路分成 6 段，兩端都種樹。共種幾棵？', options: ['5', '6', '7'], answer: '7', hint: '兩端都種，要比段數多 1。', why: { 6: '6 是段數，兩端都種要加 1。', 5: '5 是兩端都不種的棵數。' } } },
      { t: 'card' }
    ],
    gens: g23, verify: verify23
  });

  /* ---- p2-4 數線段 ------------------------------------------------------------------------------------------------------- */
  const ALPH = 'ABCDEFGHJKLMNPQRSTUVWXYZ'.split('');
  const letters = (r, n) => shuffle(r, ALPH).slice(0, n).sort();
  const pointsSvg = L => { const n = L.length, w = 200 / (n - 1); return svgOf(240, 56, `<path d="M14 24h212" stroke="${CT}" stroke-width="4" stroke-linecap="round"/>` + L.map((c, i) => `<circle data-p="1" cx="${20 + i * w}" cy="24" r="6.5" fill="${CB}" stroke="#12998a" stroke-width="1.5"/><text x="${20 + i * w}" y="46" text-anchor="middle" font-size="13" font-weight="900" fill="${CA}">${c}</text>`).join(''), `直線上有 ${n} 個點`); };
  const tri = n => n * (n - 1) / 2;
  const stairs = n => ({ w: 'bars', p: { rows: rep(n - 1, i => ({ label: 'ABCDEFG'[i], segs: rep(n - 1 - i, j => ({ u: 1, c: 'abdgk'[i % 5], text: 'ABCDEFG'[i] + 'ABCDEFG'[i + 1 + j] })) })), braces: [{ from: 0, to: n - 2, label: `共 ${tri(n)}`, c: 't' }] }, still: true });
  const art24 = `<svg viewBox="0 0 120 80"><path d="M12 26h96" stroke="#c3cbf7" stroke-width="3" stroke-linecap="round"/>${[0, 1, 2, 3].map(i => `<circle cx="${18 + i * 28}" cy="26" r="5.5" fill="#ffc94a"/><text x="${18 + i * 28}" y="42" text-anchor="middle" font-size="10" font-weight="900" fill="#3ee6d0">${'ABCD'[i]}</text>`).join('')}<path d="M18 20Q74 -2 102 20" stroke="#ff8fc7" stroke-width="2" fill="none" stroke-dasharray="3 3"/><rect x="10" y="52" width="100" height="22" rx="11" fill="#c6a2ff"/><text x="60" y="63" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="900" fill="#0b1030">3 ＋ 2 ＋ 1 ＝ 6</text></svg>`;
  const g24 = {
    A: [
      /* all the segments among n points */
      (r, p) => {
        const n = N(r, p, 3, 7), L = letters(r, n), ans = tri(n);
        return o('seg-all', `線上有點 ${L.join('、')}，一共有幾條線段？`, ans, '逐點數：由第一點出發，再由第二點……', `${rep(n - 1, i => n - 1 - i).join('＋')}＝${ans} 條。`, [n - 1, n, n * (n - 1), ans - 1, ans + 1], rep(n - 1, i => n - 1 - i).join('+'), [],
          { svg: pointsSvg(L), why: why([n - 1, `${n - 1} 只是由一個點出發的，要逐點數。`], [n * (n - 1), '每條線段被數了兩次（A到B、B到A），要除以 2。'], [ans - 1, '逐點數時少了一條，由後面的點再核對。']) });
      },
      /* segments from one point */
      (r, p) => {
        const n = N(r, p, 3, 7), L = letters(r, n), X = pick(r, L), ans = n - 1;
        return o('seg-from', `線上有點 ${L.join('、')}。以 ${X} 為一端的線段有幾條？`, ans, `${X} 可以和其他每個點連成線段。`, `其他有 ${n - 1} 個點，所以有 ${ans} 條。`, [n, n + 1, n - 2, tri(n)], `${n}-1`, [],
          { svg: pointsSvg(L), why: why([n, `${X} 不能和自己連，要少 1。`], [tri(n), '這是全部線段，題目只問以' + X + '為一端的。']) });
      }
    ],
    B: [
      /* from the number of segments back to the number of points */
      (r, p) => {
        const n = N(r, p, 3, 7), s = tri(n), m = name(r);
        return o('seg-rev', `${m}在直線上畫了一些點，圖中共有 ${s} 條線段。有幾個點？`, n, '試試：3 個點有 3 條，4 個點有 6 條……', `${rep(n - 1, i => n - 1 - i).join('＋')}＝${s}，所以有 ${n} 個點。`, [n - 1, n + 1, s, n + 2], '', [],
          { why: why([n - 1, `${n - 1} 個點只有 ${tri(n - 1)} 條線段，不夠 ${s} 條。`], [n + 1, `${n + 1} 個點有 ${tri(n + 1)} 條線段，太多了。`], [s, `${s} 是線段數，題目問點數。`]) });
      },
      /* add one more point */
      (r, p) => {
        const n = N(r, p, 3, 7), L = letters(r, n), ans = n;
        return o('seg-add', `線上有點 ${L.join('、')}。再加一個點，會多幾條線段？`, ans, '新點要和原來的每個點連線。', `新點和原來 ${n} 個點各連一條，多 ${n} 條。`, [n - 1, n + 1, 1, tri(n + 1)], '', [],
          { svg: pointsSvg(L), why: why([n - 1, `新點可以和原來的 ${n} 個點連線，包括兩端。`], [1, '新點連出的不只一條，每個舊點都有一條。'], [tri(n + 1), `${tri(n + 1)} 是加點後的全部線段，題目問多出來的。`]) });
      },
      /* leave out the shortest ones */
      (r, p) => {
        const n = N(r, p, 4, 7), L = letters(r, n), ans = tri(n) - (n - 1);
        return o('seg-long', `線上有點 ${L.join('、')}。不算相鄰兩點的線段，有幾條？`, ans, '先算全部，再減去相鄰兩點的。', `全部 ${tri(n)} 條；相鄰兩點的有 ${n - 1} 條；${tri(n)}－${n - 1}＝${ans}。`, [tri(n), n - 1, ans + 1, ans - 1], `${tri(n)}-${n - 1}`, [],
          { svg: pointsSvg(L), why: why([tri(n), `${tri(n)} 是全部，還要減去相鄰兩點的 ${n - 1} 條。`], [n - 1, `${n - 1} 是相鄰兩點的，題目要的是其餘的。`], [ans + 1, '相鄰兩點的線段有 n－1 條，別少減。']) });
      }
    ]
  };
  const verify24 = q => {
    let m;
    const pairs = n => { let c = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) c++; return c; };
    const count = s => (s.match(/[A-Z]/g) || []).length;
    if ((m = /^線上有點 ([A-Z、]+)，一共有幾條線段？$/.exec(q.q))) return String(pairs(count(m[1])));
    if ((m = /^線上有點 ([A-Z、]+)。以 (.) 為一端的線段有幾條？$/.exec(q.q))) { const L = m[1].split('、'); return String(L.filter(x => x !== m[2]).length); }
    if ((m = /圖中共有 (\d+) 條線段。有幾個點？$/.exec(q.q))) { for (let n = 2; n < 30; n++) if (pairs(n) === +m[1]) return String(n); return 'none'; }
    if ((m = /^線上有點 ([A-Z、]+)。再加一個點，會多幾條線段？$/.exec(q.q))) return String(pairs(count(m[1]) + 1) - pairs(count(m[1])));
    if ((m = /^線上有點 ([A-Z、]+)。不算相鄰兩點的線段，有幾條？$/.exec(q.q))) { const n = count(m[1]); let c = 0; for (let i = 0; i < n; i++) for (let j = i + 2; j < n; j++) c++; return String(c); }
    return null;
  };
  WQOly.register({
    id: 'p2-4', grade: 2, n: 4, title: '數線段', icon: '📐',
    card: { motto: '逐點出發不重複', example: '4 點：3＋2＋1＝6', art: art24 },
    lesson: [
      { t: 'show', say: '4 個點 A、B、C、D。由 A 出發有 3 條。', scene: stairs(4) },
      { t: 'predict', say: '由 A 出發數了 3 條。', ask: '再由 B 出發（不重複），有幾條？', options: ['1', '2', '3'], answer: '2', scene: stairs(4), reveal: 'B 只數 BC、BD，共 2 條！' },
      { t: 'do', say: '逐對點選兩個點，連成線段。', scene: { w: 'g2_segs', p: { n: 4 } } },
      { t: 'show', say: '5 個點：4＋3＋2＋1＝10 條。', scene: stairs(5) },
      { t: 'do', say: '5 個點，逐對連線。要連幾條？', scene: { w: 'g2_segs', p: { n: 5 } } },
      { t: 'try', say: '逐點出發，不重複地數。', scene: stairs(5),
        q: { stem: '直線上有 5 個點，一共有幾條線段？', options: ['8', '10', '15'], answer: '10', hint: '4＋3＋2＋1。', why: { 8: '逐點數：4＋3＋2＋1，別漏了。', 15: '4＋3＋2＋1＝10，不是 15。' } } },
      { t: 'card' }
    ],
    gens: g24, verify: verify24
  });

  /* ---- p2-5 週期與星期 --------------------------------------------------------------------------------------------------- */
  const COLORS = ['紅', '藍', '黃', '綠', '白', '黑', '紫'];
  const art25 = `<svg viewBox="0 0 120 80">${rep(7, i => { const a = -Math.PI / 2 + i / 7 * Math.PI * 2; return `<circle cx="${60 + Math.cos(a) * 24}" cy="${34 + Math.sin(a) * 24}" r="9" fill="${i === 3 ? '#ffc94a' : '#1b2160'}" stroke="#3ee6d0" stroke-width="2"/><text x="${60 + Math.cos(a) * 24}" y="${35 + Math.sin(a) * 24}" text-anchor="middle" dominant-baseline="central" font-size="10" font-weight="900" fill="${i === 3 ? '#3b2600' : '#c3cbf7'}">${WD[i]}</text>`; }).join('')}<rect x="8" y="64" width="104" height="14" rx="7" fill="#c6a2ff"/><text x="60" y="71" text-anchor="middle" dominant-baseline="central" font-size="10" font-weight="900" fill="#0b1030">10 天＝1 輪又 3 天</text></svg>`;
  const wdAns = (x, k) => (x - 1 + k) % 7 + 1;
  const g25 = {
    A: [
      /* weekday after k days */
      (r, p) => {
        const x = ri(r, 1, 7), k = N(r, p, 8, 40), ans = wdAns(x, k);
        return o('cyc-week', `今天是星期${WD[x - 1]}，再過 ${k} 天是星期幾？（星期日算 7）`, ans, '7 天一輪，先看有幾輪、多幾天。', `${k}＝${Math.floor(k / 7)}×7＋${k % 7}；整輪不變，星期${WD[x - 1]}再過 ${k % 7} 天是星期${WD[ans - 1]}。`, [wdAns(x, k - 1), wdAns(x, k + 1), k % 7 || 7, Math.floor(k / 7) || 7, x], `(${x - 1}+${k})%7+1`, [],
          { why: why([wdAns(x, k - 1), '今天不算，要由明天起數。'], [wdAns(x, k + 1), '多數了一天，多出的天數要算準。'], [k % 7 === 0 ? undefined : k % 7, `${k % 7} 是多出的天數，還要由星期${WD[x - 1]}往後數。`], [Math.floor(k / 7), '這是幾個星期，題目問星期幾。']) });
      },
      /* position of the k-th bead in a round */
      (r, p) => {
        const per = ri(r, 2, 6), cs = shuffle(r, COLORS).slice(0, per), k = N(r, p, 7, 30), ans = (k - 1) % per + 1;
        return o('cyc-bead', `珠子按${cs.join('、')}重複排，第 ${k} 顆是一輪的第幾顆？`, ans, `一輪 ${per} 顆，先看有幾輪。`, `一輪 ${per} 顆；${k}÷${per}＝${Math.floor(k / per)} 餘 ${k % per}，${k % per ? `第 ${k} 顆是一輪的第 ${k % per} 顆` : `第 ${k} 顆是一輪的最後一顆（第 ${per} 顆）`}。`, [k % per, Math.floor(k / per), per, ans + 1, ans - 1], `${(k - 1) % per + 1}`, [],
          { why: why([k % per, `餘 0 表示剛好排完一輪，是第 ${per} 顆。`], [Math.floor(k / per), `${Math.floor(k / per)} 是排了幾輪，題目問一輪的第幾顆。`], [per, `${per} 是一輪有幾顆，不一定是第 ${k} 顆的位置。`]) });
      },
      /* complete rounds */
      (r, p) => {
        const per = ri(r, 2, 7), k = N(r, p, per * 2, 40), ans = Math.floor(k / per);
        return o('cyc-laps', `每輪 ${per} 顆珠子，共排了 ${k} 顆。排滿幾輪？`, ans, `${k} 裏面有幾個 ${per}？`, `${k}÷${per}＝${ans} 餘 ${k % per}，排滿 ${ans} 輪。`, [ans + 1, ans - 1, k % per, per, k - per], `${k - k % per}/${per}`, [],
          { why: why([ans + 1, `多出來的 ${k % per} 顆不夠一輪，不能算。`], [k % per, `${k % per} 是剩下的顆數，不是輪數。`], [ans - 1, `${k} 裏有 ${ans} 個 ${per}，別少算一輪。`]) });
      }
    ],
    B: [
      /* how many of one colour in k beads */
      (r, p) => {
        const per = ri(r, 3, 5), cs = shuffle(r, COLORS).slice(0, per), k = (() => { let v = N(r, p, 8, 30); if (v % per === 0) v++; return v; })(), j = ri(r, 0, per - 1), ans = Math.floor(k / per) + (j < k % per ? 1 : 0);
        return o('cyc-count', `珠子按${cs.join('、')}重複排，共 ${k} 顆。${cs[j]}色有幾顆？`, ans, '先看排滿幾輪，再看多出的珠子。', `${k}÷${per}＝${Math.floor(k / per)} 餘 ${k % per}；${cs[j]}色每輪 1 顆，多出的${j < k % per ? `裏有${cs[j]}色，再多 1 顆` : `裏沒有${cs[j]}色`}：${ans} 顆。`, [Math.floor(k / per), Math.floor(k / per) + 1, Math.floor(k / per) + (j < k % per ? 0 : 1) + 1, ans + 1, ans - 1], '', [],
          { why: why([ans === Math.floor(k / per) ? Math.floor(k / per) + 1 : Math.floor(k / per), j < k % per ? `排滿的輪數是 ${Math.floor(k / per)}，多出的珠子裏也有${cs[j]}色。` : `多出的 ${k % per} 顆裏沒有${cs[j]}色，不用再加。`], [k % per, `${k % per} 是多出的珠子數，不是${cs[j]}色的數目。`], [Math.floor(k / per) + 2, '多出的珠子最多再多 1 顆同色。']) });
      },
      /* the date: day 1 is given */
      (r, p) => {
        const x = ri(r, 1, 7), d = N(r, p, 8, 30), ans = wdAns(x, d - 1);
        return o('cyc-date', `這個月 1 日是星期${WD[x - 1]}，${d} 日是星期幾？（星期日算 7）`, ans, `1 日到 ${d} 日，過了 ${d - 1} 天。`, `過了 ${d}－1＝${d - 1} 天，即 ${Math.floor((d - 1) / 7)} 個星期${(d - 1) % 7 ? `又 ${(d - 1) % 7} 天；星期${WD[x - 1]}再數 ${(d - 1) % 7} 天是星期${WD[ans - 1]}` : `，剛好整星期，仍是星期${WD[ans - 1]}`}。`, [wdAns(x, d), wdAns(x, d - 2), x, (d - 1) % 7 || 7], `(${x - 1}+${d - 1})%7+1`, [],
          { why: why([wdAns(x, d), `1 日到 ${d} 日是過了 ${d - 1} 天，不是 ${d} 天。`], [wdAns(x, d - 2), `是過了 ${d - 1} 天，別少算一天。`], [x, '多數幾輪之後星期不一定回到原位，要數多出的天。']) });
      },
      /* every p days, which weekday is the n-th time */
      (r, p) => {
        const x = ri(r, 1, 7), pp = ri(r, 2, 7), n = ri(r, 3, 8), days = (n - 1) * pp, ans = wdAns(x, days);
        return o('cyc-after', `今天星期${WD[x - 1]}，每 ${pp} 天洗一次車，今天洗了。第 ${n} 次是星期幾？（星期日算 7）`, ans, '今天是第 1 次，先算過了幾天。', `第 ${n} 次是過了 ${n - 1}×${pp}＝${days} 天；星期${WD[x - 1]}再過 ${days} 天是星期${WD[ans - 1]}。`, [wdAns(x, n * pp), wdAns(x, n), days % 7 || 7, x], `(${x - 1}+${days})%7+1`, [],
          { why: why([wdAns(x, n * pp), `今天已是第 1 次，到第 ${n} 次只隔 ${n - 1} 個 ${pp} 天。`], [wdAns(x, n), `每次隔 ${pp} 天，不是 1 天。`], [days % 7, `${days % 7} 是多出的天數，還要由星期${WD[x - 1]}往後數。`]) });
      },
      /* how many washes in the next k days */
      (r, p) => {
        const pp = ri(r, 2, 7), k = N(r, p, 3 * pp, 40), m = name(r), ans = Math.floor(k / pp);
        return o('cyc-wash', `${m}每 ${pp} 天洗一次車，今天洗了。接着 ${k} 天裏，還會洗幾次？`, ans, `${k} 天裏有幾個 ${pp} 天？`, `${k}÷${pp}＝${ans} 餘 ${k % pp}，還會洗 ${ans} 次。`, [ans + 1, ans - 1, k % pp, pp], `${k - k % pp}/${pp}`, [],
          { why: why([ans + 1, '今天洗的不算，餘下的天數不夠再洗。'], [k % pp, `${k % pp} 是剩下的天數，不是次數。`], [ans - 1, `${k} 天裏有 ${ans} 個 ${pp} 天，每個末尾都洗。`]) });
      }
    ]
  };
  const verify25 = q => {
    let m;
    const step = (x, k) => { for (let i = 0; i < k; i++) x = x === 7 ? 1 : x + 1; return x; };
    const wd = c => WD.indexOf(c) + 1;
    if ((m = /^今天是星期(.)，再過 (\d+) 天是星期幾？/.exec(q.q))) return String(step(wd(m[1]), +m[2]));
    if ((m = /^珠子按(.+)重複排，第 (\d+) 顆是一輪的第幾顆？$/.exec(q.q))) { const per = m[1].split('、').length; let c = 1; for (let i = 2; i <= +m[2]; i++) c = c === per ? 1 : c + 1; return String(c); }
    if ((m = /^每輪 (\d+) 顆珠子，共排了 (\d+) 顆。排滿幾輪？$/.exec(q.q))) { let left = +m[2], c = 0; while (left >= +m[1]) { left -= +m[1]; c++; } return String(c); }
    if ((m = /^珠子按(.+)重複排，共 (\d+) 顆。(.)色有幾顆？$/.exec(q.q))) { const cs = m[1].split('、'); let c = 0; for (let i = 0; i < +m[2]; i++) if (cs[i % cs.length] === m[3]) c++; return String(c); }
    if ((m = /^這個月 1 日是星期(.)，(\d+) 日是星期幾？/.exec(q.q))) { let x = wd(m[1]); for (let d = 1; d < +m[2]; d++) x = step(x, 1); return String(x); }
    if ((m = /^今天星期(.)，每 (\d+) 天洗一次車，今天洗了。第 (\d+) 次(?:洗車)?是星期幾？/.exec(q.q))) { let x = wd(m[1]); for (let t = 1; t < +m[3]; t++) x = step(x, +m[2]); return String(x); }
    if ((m = /^.+?每 (\d+) 天洗一次車，今天洗了。接着 (\d+) 天裏，還會洗幾次？$/.exec(q.q))) { let c = 0; for (let d = 1; d <= +m[2]; d++) if (d % +m[1] === 0) c++; return String(c); }
    return null;
  };
  const wk = (steps, start) => ({ w: 'cycle', p: { n: 7, labels: WD, steps, start, unit: '天' } });
  WQOly.register({
    id: 'p2-5', grade: 2, n: 5, title: '週期與星期', icon: '📅',
    card: { motto: '找一輪幾個', example: '10 天＝1 輪又 3 天', art: art25 },
    lesson: [
      { t: 'show', say: '星期一到星期日是 7 天，一輪。', scene: Object.assign(wk(7, 0), { still: true }) },
      { t: 'predict', say: '今天星期三。', ask: '再過 7 天是星期幾？', options: ['星期二', '星期三', '星期四'], answer: '星期三', scene: Object.assign(wk(7, 2), { still: true }), reveal: '剛好一整輪，又回到星期三！' },
      { t: 'do', say: '今天星期三。按「＋1 天」走 10 天。', scene: wk(10, 2) },
      { t: 'show', say: '10 天＝1 輪又 3 天。多的 3 天才要數。', scene: Object.assign(wk(10, 2), { still: true }) },
      { t: 'do', say: '星期五起再過 12 天。按「一圈」更快！', scene: wk(12, 4) },
      { t: 'try', say: '一輪 7 天，先減去整輪。', scene: Object.assign(wk(9, 0), { still: true }),
        q: { stem: '今天星期一，再過 9 天是星期幾？（星期日算 7）', options: ['2', '3', '4'], answer: '3', hint: '9 天＝1 輪又 2 天。', why: { 2: '星期一過 2 天是星期三（3），不是星期二。', 4: '多數了一天，今天不算。' } } },
      { t: 'card' }
    ],
    gens: g25, verify: verify25
  });
})();

;
/* 小三 · 5 完成版單元（g34）：和差、和倍差倍、年齡、搭配與樹形圖、乘法巧算（p3-5 只做二、三位數×一位數的位值拆分）。
   使用現成教具（bars / array），另有專用教具 g3_tree（搭配樹形圖，見檔首）。數字範圍依 docs/奧數路線-20261022/年級對照研究.md 的小三一節。 */
/* ---- g3_tree（小三 p3-4 搭配與樹形圖專用教具）：左邊 a 件上衣，點上衣長出 b 條褲的分枝；點分枝完成一個搭配，右邊計數。
   p: {a:2-4, b:2-4, tops?:[emoji..], bottoms?:[emoji..]}  達標＝a×b 個搭配全做齊。鍵盤：Tab 到上衣／分枝，Enter 展開／完成。 -------- */
if (typeof WQOlyWidgets !== 'undefined') (function () {
  'use strict';
  const { el, txt, fit, burst, runner, keys, sbtn, place, C } = WQOlyWidgets;
  const sfx = (api, n) => { try { api && api.sfx && api.sfx(n); } catch (_) { /* */ } };
  const changed = api => { try { api.onChange && api.onChange(); } catch (_) { /* */ } };
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  WQOlyWidgets.make('g3_tree', { mount(host, p, api) {
    const a = clamp(p.a || 2, 2, 4), b = clamp(p.b || 3, 2, 4), total = a * b, inter = p.mode !== 'show';
    const TOPS = p.tops || ['👕', '👔', '🧥', '👚'], BOT = p.bottoms || ['👖', '🩳', '👖', '🩳'];
    const run = runner(api); let svg, W, H, cols, count, big, sub, eq, solved;
    function build() {
      run.cancel(); solved = false; cols = []; count = 0;
      ({ svg, W, H } = fit(host));
      svg.setAttribute('aria-label', `${a} 件上衣、${b} 條褲的搭配樹形圖`);
      const cw = (W - 78) / a, bw = Math.min(cw, 100), LH = clamp((H - 78 - 10) / b - 4, 26, 56), x00 = 6, oy = Math.max(0, (H - (78 + b * (LH + 4)) - 12) / 2);
      for (let i = 0; i < a; i++) {
        const bx = x00 + i * cw + (cw - bw) / 2, col = { i, bx, open: false, leaves: [], lines: null, done: 0 };
        const g = el('g', { class: 'r80-chip', role: inter ? 'button' : 'img', 'aria-label': `第 ${i + 1} 件上衣` }, svg);
        el('rect', { x: 0, y: 4, width: 56, height: 50, rx: 16, fill: 'rgba(0,0,0,.28)' }, g);
        col.rect = el('rect', { x: 0, y: 0, width: 56, height: 50, rx: 16, fill: C.card2, stroke: C.aqua, 'stroke-width': 3.5 }, g);
        txt(g, 28, 26, TOPS[i % TOPS.length], { size: 30, emoji: true });
        col.chk = txt(g, 50, 6, '✓', { size: 18, fill: C.green, weight: 900, opacity: 0 });
        place(g, bx, 14 + oy); col.g = g; col.top = { y: 64 + oy };
        col.leafY = k => oy + 76 + k * (LH + 4) + LH / 2; col.oy = oy; col.ES = Math.min(22, (bw - 28) * .3, LH * .5); col.LH = LH; col.LW = bw - 28;
        cols.push(col);
        if (inter) {
          g.style.cursor = 'pointer'; g.addEventListener('click', e => { e.preventDefault(); expand(col, true); }); keys(g, { act: () => expand(col, true) });
        }
      }
      /* right side counter */
      const cx = W - 36;
      txt(svg, cx, H * .5 - 50, '已搭', { size: 16, fill: C.muted, weight: 800 });
      big = txt(svg, cx, H * .5 - 14, '0', { size: 40, fill: C.violet, weight: 900 });
      sub = txt(svg, cx, H * .5 + 22, `共 ${total} 套`, { size: 16, fill: C.muted, weight: 800 });
      eq = txt(svg, cx, H * .5 + 48, '', { size: 18, fill: C.gold, weight: 900 });
      if (!inter) cols.forEach(c => expand(c, false));
    }
    function expand(col, user) {
      if (col.open) return; col.open = true; if (user) sfx(api, 'pop');
      const x = col.bx + 14, gl = el('g', {}, svg); col.lines = gl;
      const yEnd = col.leafY(b - 1);
      el('line', { x1: x, y1: 64 + col.oy, x2: x, y2: yEnd, stroke: C.muted, 'stroke-width': 3, 'stroke-linecap': 'round' }, gl);
      for (let k = 0; k < b; k++) {
        const y = col.leafY(k); el('line', { x1: x, y1: y, x2: col.bx + 28, y2: y, stroke: C.muted, 'stroke-width': 3, 'stroke-linecap': 'round' }, gl);
        const g = el('g', { class: 'r80-chip', role: inter ? 'button' : 'img', 'aria-label': `第 ${col.i + 1} 件上衣配第 ${k + 1} 條褲` }, svg);
        const w = col.LW, h = col.LH;
        const r = el('rect', { x: 0, y: -h / 2, width: w, height: h, rx: Math.min(14, h / 2), fill: 'rgba(255,200,74,.12)', stroke: C.gold, 'stroke-width': 3, 'stroke-dasharray': '6 4' }, g);
        const t1 = txt(g, w / 2 - w * .2, 1, BOT[k % BOT.length], { size: col.ES, emoji: true, opacity: .75 });
        const t2 = txt(g, w / 2 + w * .22, 1, String(k + 1), { size: Math.min(18, h * .45), fill: C.gold, weight: 900 });
        const t3 = txt(g, w / 2 - w * .22, 1, TOPS[col.i % TOPS.length], { size: col.ES, emoji: true, opacity: 0 });
        const leaf = { g, r, t1, t2, t3, done: false };
        place(g, col.bx + 28, y); col.leaves.push(leaf);
        if (inter) { g.style.cursor = 'pointer'; g.addEventListener('click', e => { e.preventDefault(); finish(col, leaf, true); }); keys(g, { act: () => finish(col, leaf, true) }); }
        if (!api.reduced && user) { g.setAttribute('opacity', 0); run.sleep(80 * k).then(ok => ok && run.tween(240, t => { g.setAttribute('opacity', t); place(g, col.bx + 28 - 14 * (1 - t), y); })); }
      }
      col.rect.setAttribute('stroke', C.gold);
      if (!api.reduced && user) { gl.setAttribute('opacity', 0); run.tween(240, t => gl.setAttribute('opacity', t)); }
      changed(api);
    }
    function finish(col, leaf, user) {
      if (leaf.done || solved) return; leaf.done = true; col.done++; count++;
      const k = col.leaves.indexOf(leaf), h = col.LH, w = col.LW;
      const tint = [[C.violet, C.violetD], [C.pink, '#c84f8a'], [C.blue, '#2e7fb8'], [C.green, '#2f9d63']][k % 4]; leaf.r.setAttribute('fill', tint[0]); leaf.r.setAttribute('stroke', tint[1]); leaf.r.removeAttribute('stroke-dasharray');
      leaf.t1.setAttribute('x', w / 2 + w * .22); leaf.t1.setAttribute('opacity', 1); leaf.t3.setAttribute('x', w / 2 - w * .22); leaf.t3.setAttribute('opacity', 1);
      leaf.t1.textContent = BOT[k % BOT.length]; leaf.t2.textContent = '';
      if (!api.reduced) run.tween(260, t => place(leaf.g, col.bx + 28, col.leafY(k), 1 + .12 * Math.sin(t * Math.PI)));
      if (col.done === b) { col.chk.setAttribute('opacity', 1); col.rect.setAttribute('stroke', C.green); }
      big.textContent = String(count); sfx(api, 'pop');
      if (count === total) { solved = true; big.setAttribute('fill', C.gold); eq.textContent = `${a}×${b}`; sfx(api, 'good'); burst(svg, W - 36, H * .5 - 14, api, 10); }
      changed(api);
    }
    build();
    return {
      check: () => count === total,
      reset() { build(); changed(api); },
      destroy() { run.destroy(); },
      async demo() {
        build(); if (!(await run.sleep(350))) return false;
        for (const col of cols) {
          expand(col, true); if (!(await run.sleep(420))) return false;
          for (const lf of col.leaves) { finish(col, lf, false); if (!(await run.sleep(260))) return false; }
        }
        changed(api); return true;
      }
    };
  } });
})();

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
    { label: '小明', segs: [solid(6, 'a', '6'), { u: 1, c: 'b', edit: true, target: n, start: 1, min: 1, max: 6, text: '年' }] },
    { label: '爸爸', segs: [solid(6, 'a', ''), dashed(20, '差 20'), { u: 1, c: 'b', edit: true, target: n, start: 1, min: 1, max: 6, text: '年' }] }
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
      },
      /* R3.31 variety: more two-layer settings */
      (r, p) => {
        const a = ri(r, 2, 4), b = ri(r, 2, 4), ans = a * b, T = [
          `${a} 種麵包、${b} 種餡料，各選一種做三文治。共有幾款？`,
          `${a} 款書包、${b} 款水壺，各買一個成一套。共有幾種買法？`,
          `${a} 個主角、${b} 個配角，每次各選一位拍照。共有幾種組合？`,
          `${a} 種顏色的氣球、${b} 種形狀的氣球，顏色和形狀各選一種。共有幾款？`,
          `${a} 款蛋糕、${b} 款飲品，各選一款做下午茶。共有幾種配搭？`,
          `${a} 隻小熊、${b} 頂帽，每隻小熊戴一頂帽。共有幾種打扮？`,
          `${a} 條路由學校去公園，${b} 條路由公園去圖書館。學校到圖書館有幾種走法？`,
          `${a} 種冰淇淋味道、${b} 種甜筒，各選一種。共有幾款？`,
          `${a} 條裙、${b} 對鞋，各選一件配成一套。共有幾款配搭？`,
          `${a} 款手機殼、${b} 款掛飾，各選一款。共有幾種配法？`
        ];
        const w = wy(ans, [[a + b, '加錯了：每一種都要和另一邊每一種配。'], [Math.max(a, b), '那只是其中一種的配法，其他的也要配。'], [a * b + a, `${a}×${b} 就夠了，不用再加 ${a}。`]]);
        return o('tree-two', T[ri(r, 0, T.length - 1)], ans, '畫樹形圖：第一層有幾枝？每枝再分幾枝？',
          `第一層 ${a} 枝，每枝再分 ${b} 枝：${a}×${b}＝${ans}。`, ks(w), `${a}*${b}`, [], { why: w, svg: treeSvg(a, b) });
      },
      /* R3.31 variety: find one side from the total */
      (r, p) => {
        const a = ri(r, 2, 4), b = ri(r, 2, 4), th = [['蛋糕', '飲品'], ['書包', '水壺'], ['麵包', '餡料'], ['帽', '圍巾']][ri(r, 0, 3)], ans = b;
        const w = wy(ans, [[a * b, `那是總共的款數，題目問${th[1]}的數目。`], [a + b, '不是相加，是每一款都配每一款。'], [a * b - a, `${a * b} 減 ${a} 不是答案，要除以 ${a}。`]]);
        return o('tree-back', `有 ${a} 款${th[0]}和一些${th[1]}，各選一款，共有 ${a * b} 種配搭。有幾款${th[1]}？`, ans, `每款${th[0]}配幾款${th[1]}，總共才 ${a * b} 種？`,
          `每款${th[0]}有 ${a * b}÷${a}＝${b} 種配法，所以有 ${b} 款${th[1]}。`, ks(w), `${a * b}/${a}`, [], { why: w, svg: treeSvg(a, b) });
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
      },
      /* R3.31 variety: more three-layer settings */
      (r, p) => {
        const a = ri(r, 2, 3), b = ri(r, 2, 3), c = ri(r, 2, 3), ans = a * b * c, T = [
          `${a} 種麵包、${b} 種餡料、${c} 種醬汁，各選一種做三文治。共有幾款？`,
          `${a} 款蛋糕、${b} 款飲品、${c} 款水果，各選一款做下午茶。共有幾種配搭？`,
          `${a} 條裙、${b} 對鞋、${c} 個髮夾，各選一件。共有幾款配搭？`,
          `${a} 種顏色、${b} 種形狀、${c} 種大小的氣球，各選一種。共有幾款氣球？`,
          `${a} 款書包、${b} 款水壺、${c} 款文具盒，各買一個成一套。共有幾種買法？`,
          `${a} 個故事、${b} 首歌、${c} 個遊戲，表演時各選一個。共有幾種節目？`,
          `${a} 條路由家去車站，${b} 條由車站去碼頭，${c} 條由碼頭去島上。家到島上有幾種走法？`,
          `${a} 種冰淇淋味道、${b} 種甜筒、${c} 種配料，各選一種。共有幾款？`
        ];
        const w = wy(ans, [[a * b, '還有第三層，每款再往下分。'], [a + b + c, '加錯了，每一層都要乘。'], [a * b + c, `${a}×${b} 之後還要乘 ${c}。`]]);
        return o('tree-three', T[ri(r, 0, T.length - 1)], ans, '一層一層乘：先算前兩層，再乘第三層。',
          `${a}×${b}＝${a * b}，再 ${a * b}×${c}＝${ans}。`, ks(w), `${a}*${b}*${c}`, [], { why: w });
      },
      /* R3.31 variety: same-colour limit with other things */
      (r, p) => {
        const a = ri(r, 3, 4), b = ri(r, 3, 4), m = ri(r, 1, 3), th = [['襪', '鞋'], ['杯', '碟'], ['傘', '雨衣'], ['蛋糕', '蠟燭'], ['書包', '水壺']][ri(r, 0, 4)], ans = a * b - m;
        const w = wy(ans, [[a * b, '同色的配搭要去掉。'], [a + b, '加錯了，每件都要和每件配。'], [a * b - 2 * m, `同色的只有 ${m} 款，不是 ${2 * m} 款。`]]);
        return o('tree-limit', `${th[0]}有 ${a} 種顏色，${th[1]}有 ${b} 種顏色，其中 ${m} 種顏色兩邊都有。同色不配，有幾款？`, ans, '先全部配，再去掉同色的。',
          `全部配有 ${a}×${b}＝${a * b} 款，同色 ${m} 款不要：${a * b}－${m}＝${ans}。`, ks(w), `${a}*${b}-${m}`, [], { why: w });
      },
      /* R3.31 variety: find the last layer from the total */
      (r, p) => {
        const a = ri(r, 2, 3), b = ri(r, 2, 3), c = ri(r, 2, 3), th = [['上衣', '褲', '帽'], ['麵包', '餡料', '醬汁'], ['蛋糕', '飲品', '水果']][ri(r, 0, 2)], ans = c;
        const w = wy(ans, [[a * b * c, `那是總共的款數，題目問${th[2]}的數目。`], [a * b, '那是前兩層的款數，要看總共是它的幾倍。'], [a + b, '不是相加，每一層都是相乘。']]);
        return o('tree-three', `${a} 種${th[0]}、${b} 種${th[1]}和一些${th[2]}，各選一種，共有 ${a * b * c} 款。有幾種${th[2]}？`, ans, `前兩層有 ${a}×${b} 款，再問總數是它的幾倍。`,
          `前兩層有 ${a}×${b}＝${a * b} 款，${a * b * c}÷${a * b}＝${c}，所以有 ${c} 種${th[2]}。`, ks(w), `${a * b * c}/${a * b}`, [], { why: w });
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
    if ((m = /^(\d+) 種.+、(\d+) 種.+和一些.+，各選一種，共有 (\d+) 款。有幾種/.exec(q.q))) { for (let c = 1; c <= 20; c++) if (+m[1] * +m[2] * c === +m[3]) return String(c); return 'none'; }
    if ((m = /^有 (\d+) 款.+和一些.+，各選一款，共有 (\d+) 種配搭。有幾款/.exec(q.q))) { for (let b = 1; b <= 20; b++) if (+m[1] * b === +m[2]) return String(b); return 'none'; }
    if ((m = /^(.+)有 (\d+) 種顏色，(.+)有 (\d+) 種顏色，其中 (\d+) 種顏色兩邊都有。同色不配/.exec(q.q))) { const a = +m[2], b = +m[4], k = +m[5]; let c = 0; for (let i = 0; i < a; i++) for (let j = 0; j < b; j++) if (!(i < k && j < k && i === j)) c++; return String(c); }
    if ((m = /^有 (\d+) (件上衣和一些褲|款麵和一些湯).+共有 (\d+) [款種]配搭/.exec(q.q))) { const a = +m[1], T = +m[3]; for (let b = 1; b <= 20; b++) if (a * b === T) return String(b); return 'none'; }
    if ((m = /^(上衣|帽)有 (\d+) 種顏色，(?:褲|圍巾)有 (\d+) 種顏色，其中 (\d+) 種/.exec(q.q))) { const a = +m[2], b = +m[3], k = +m[4]; let c = 0; for (let i = 0; i < a; i++) for (let j = 0; j < b; j++) if (!(i < k && j < k && i === j)) c++; return String(c); }
    if ((m = /^(\d+)[^\d]+(\d+)[^\d]+(\d+)[^\d]+$/.exec(q.q))) { let c = 0; for (let i = 0; i < +m[1]; i++) for (let j = 0; j < +m[2]; j++) for (let k = 0; k < +m[3]; k++) c++; return String(c); }
    if ((m = /^(\d+)[^\d]+(\d+)[^\d]+$/.exec(q.q))) { let c = 0; for (let i = 0; i < +m[1]; i++) for (let j = 0; j < +m[2]; j++) c++; return String(c); }
    return null;
  };
  const shirt = (n, c, edit, text) => ({ label: c, segs: [{ u: 1, rep: n, c: edit ? 'a' : 'a', text: text || '褲' }] });
  const pantsRow = (label, col, edit, rep = 3, text = '褲') => ({ label, segs: edit ? [{ u: 1, rep: 1, c: col, edit: true, target: edit, min: 1, max: 5, text }] : [...Array.from({ length: rep }, () => ({ u: 1, rep: 1, c: col, text }))] });
  WQOly.register({
    id: 'p3-4', grade: 3, n: 4, title: '搭配與樹形圖', icon: '👕',
    card: { motto: '一層一層分支', example: '2 件上衣 3 條褲：6 款', art: art34 },
    lesson: [
      { t: 'show', say: '有 2 件上衣、3 條褲。像樹一樣一層層分枝。', scene: { w: 'bars', p: { rows: [pantsRow('紅', 'a'), pantsRow('藍', 'b')] }, still: true } },
      { t: 'predict', say: '上衣和褲各選一件來穿。', ask: '一共有幾款配搭？', options: ['5', '6', '8'], answer: '6', scene: { w: 'bars', p: { rows: [pantsRow('紅', 'a'), pantsRow('藍', 'b')], braces: [{ from: 0, to: 1, label: '共 ? 款', c: 't' }] }, still: true }, reveal: '每件上衣配 3 款，3＋3＝6，就是 2×3。' },
      { t: 'do', say: '點上衣長出褲，再逐條點，完成搭配。', scene: { w: 'g3_tree', p: { a: 2, b: 3 } } },
      { t: 'show', say: '每枝都分 3 枝，2 枝就是 2×3＝6 款。', scene: { w: 'bars', p: { rows: [pantsRow('紅', 'a'), pantsRow('藍', 'b')], braces: [{ from: 0, to: 1, label: '2×3＝6', c: 't' }] }, still: true } },
      { t: 'predict', say: '再多 2 頂帽子。每款再配帽。', ask: '一共有幾款？', options: ['8', '10', '12'], answer: '12', scene: { w: 'bars', p: { rows: [pantsRow('紅', 'a'), pantsRow('藍', 'b')], braces: [{ from: 0, to: 1, label: '6 款', c: 't' }] }, still: true }, reveal: '6 款每款配 2 頂帽：6×2＝12。' },
      { t: 'do', say: '3 件上衣、2 條褲。做齊所有搭配。', scene: { w: 'g3_tree', p: { a: 3, b: 2 } } },
      { t: 'try', say: '一層一層分，答答看。', scene: { w: 'bars', p: { rows: [pantsRow('麵甲', 'a', 0, 4, '湯'), pantsRow('麵乙', 'b', 0, 4, '湯'), pantsRow('麵丙', 'g', 0, 4, '湯')] }, still: true },
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

;
/* 小四 · 5 units. p4-1 雞兔同籠 is the reference unit; p4-2 至 p4-5（g34）使用現成教具 pairing / numline / rowplace / dotgraph / bars，沒有新增工具。 */
(function () {
  'use strict';
  const { o, N, ri, pick, name } = WQOly.helpers;
  const COL = { a: '#3ee6d0', b: '#ffc94a', d: '#ff8fc7', t: '#c6a2ff' };
  const solid = (u, c, text) => ({ u, c, text });
  const ks = w => Object.keys(w).map(Number);
  /* why-table: drops keys that equal the answer, are not positive whole numbers, or repeat */
  const wy = (ans, list) => { const w = {}; for (const [k, v] of list) { if (Number.isInteger(k) && k > 0 && String(k) !== String(ans) && !(k in w)) w[k] = v; } return w; };
  /* tiny bar-model picture. rows: [{l, p:[[units, colourKey, text, dashed?], ...]}] */
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

  /* ---- p4-1 雞兔同籠 ----------------------------------------------------------------------------------------------------- */
  const cage = (H, F, e1, e2, lbl) => {
    const per = H > 10 ? Math.ceil(H / 2) : H, rows = Math.ceil(H / per), d = Math.min(26, 150 / per);
    let s = '';
    for (let i = 0; i < H; i++) { const r = Math.floor(i / per), c = i % per, n = r === rows - 1 ? H - r * per : per, x = 85 + (c - (n - 1) / 2) * d, y = 17 + r * 28; s += `<circle cx="${x}" cy="${y}" r="${d * .42}" fill="#1b2160" stroke="#3ee6d0" stroke-width="1.8"/><text x="${x}" y="${y + 1}" text-anchor="middle" dominant-baseline="central" font-size="${d * .5}" font-weight="900" fill="#c3cbf7">?</text>`; }
    return `<svg viewBox="0 0 170 ${rows * 28 + 22}" role="img" aria-label="${lbl || `${H} 隻頭，${F} 隻腳`}">${s}<text x="85" y="${rows * 28 + 13}" text-anchor="middle" font-size="12" font-weight="900" fill="#ffc94a">${lbl || `${H} 隻頭 · ${F} 隻腳`}</text></svg>`;
  };
  const art41 = '<svg viewBox="0 0 120 80"><g font-size="22" text-anchor="middle" dominant-baseline="central"><text x="20" y="20">🐔</text><text x="46" y="20">🐔</text><text x="72" y="20">🐰</text><text x="98" y="20">🐰</text></g><path d="M20 34v10M46 34v10" stroke="#3ee6d0" stroke-width="3" stroke-linecap="round"/><path d="M72 34v10M98 34v10" stroke="#ffc94a" stroke-width="3" stroke-linecap="round"/><rect x="10" y="52" width="100" height="20" rx="10" fill="#ff8fc7"/><text x="60" y="63" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="900" fill="#0b1030">先當全是雞</text></svg>';
  const TH = [{ n1: '雞', n2: '兔', l1: 2, l2: 4, part: '腳', u: '隻', at: '籠裏' }, { n1: '單車', n2: '三輪車', l1: 2, l2: 3, part: '輪', u: '輛', at: '車房裏' }];
  const g41 = {
    A: [
      /* heads + legs, assume all of the first kind then swap */
      (r, p) => {
        const th = r() < .7 ? TH[0] : TH[1], H = N(r, p, 4, 15), t = ri(r, 1, H - 1), c = H - t, F = th.l1 * c + th.l2 * t, ask2 = r() < .5, D = F - th.l1 * H, dl = th.l2 - th.l1, ans = ask2 ? t : c;
        const pp = th.part === '腳' ? '隻腳' : '個輪';
        return o('cr-basic', `${th.at}有${th.n1}和${th.n2}共 ${H} ${th.u}，共 ${F} ${pp}。${ask2 ? th.n2 : th.n1}有幾${th.u}？`, ans,
          `先假設全部是${th.n1}。`, `假設 ${H} ${th.u}全是${th.n1}：${H}×${th.l1}＝${th.l1 * H}，少了 ${D} ${th.part === '腳' ? '隻腳' : '個輪'}；每換 1 ${th.u}多 ${dl}，${D}÷${dl}＝${t}，所以${th.n2} ${t} ${th.u}、${th.n1} ${c} ${th.u}。`,
          [ask2 ? c : t, D, F - H, ans + 1], `${ask2 ? D + '/' + dl : H + '-' + D + '/' + dl}`, [],
          { svg: cage(H, F), why: { [ask2 ? c : t]: `你算出的是${ask2 ? th.n1 : th.n2}的數目，題目問${ask2 ? th.n2 : th.n1}。`, [D]: `${D} 是比全${th.n1}多出的${th.part}，還要除以 ${dl}。` } });
      }
    ],
    B: [
      /* "rabbits are d more than chickens": take away the extra rabbits' legs first, then 1 chicken + 1 rabbit = 6 legs */
      (r, p) => {
        const d = ri(r, 1, 3), c = N(r, p, 2, 8), t = c + d, F = 2 * c + 4 * t, ask = r() < .5;
        return o('cr-diff', `雞和兔共有 ${F} 隻腳，兔比雞多 ${d} 隻。${ask ? '雞' : '兔'}有幾隻？`, ask ? c : t, `先拿走多出來的 ${d} 隻兔。`,
          `先拿走多出的 ${d} 隻兔（${4 * d} 隻腳），剩 ${F - 4 * d} 隻腳；雞和兔一樣多，每 1 雞 1 兔有 6 隻腳：${F - 4 * d}÷6＝${c}，雞 ${c} 隻，兔 ${c}＋${d}＝${t} 隻。`,
          [ask ? t : c, F - 4 * d, F / 6 | 0, (ask ? c : t) + 1], '', [],
          { why: { [ask ? t : c]: `你算出的是${ask ? '兔' : '雞'}的隻數，題目問${ask ? '雞' : '兔'}。`, [F - 4 * d]: `這是剩下的腳數，還要每 6 隻腳（1 雞 1 兔）分一組。` } });
      },
      /* "legs are x fewer than 4 times the heads": assume all rabbits */
      (r, p) => {
        const H = N(r, p, 5, 20), c = ri(r, 1, H - 1), x = 2 * c;
        return o('cr-fourx', `雞和兔共 ${H} 隻，腳數比頭數的 4 倍少 ${x} 隻。雞有幾隻？`, c, `先假設全部是兔。`,
          `頭數的 4 倍：${H}×4＝${4 * H}，就是全部是兔的腳數；少了 ${x} 隻腳，每隻雞少 2 隻，${x}÷2＝${c} 隻雞。`,
          [H - c, x, 4 * H, c + 1], `${x}/2`, [],
          { why: { [H - c]: `你算出的是兔的隻數，題目問雞。`, [x]: `${x} 是少了的腳數，每隻雞少 2 隻腳，還要除以 2。` } });
      }
    ]
  };

  /* ---- R3.31 variety: extra settings for 雞兔同籠 (new generators only; the ones above are untouched) ---- */
  TH.push(
    { n1: '鴨', n2: '羊', l1: 2, l2: 4, part: '腳', u: '隻', at: '農場裏' },
    { n1: '蜻蜓', n2: '蜘蛛', l1: 6, l2: 8, part: '腳', u: '隻', at: '花園裏' },
    { n1: '電單車', n2: '汽車', l1: 2, l2: 4, part: '輪', u: '輛', at: '停車場裏' },
    { n1: '小鳥', n2: '小狗', l1: 2, l2: 4, part: '腳', u: '隻', at: '公園裏' });
  const ppOf = th => th.part === '腳' ? '隻腳' : '個輪';
  const lblOf = (th, H, F) => `${H} ${th.part === '腳' ? '隻頭' : '輛車'} · ${F} ${ppOf(th)}`;
  const COIN = [[1, 2], [2, 5], [1, 5], [5, 10], [2, 10]];
  const BOAT = [[5, 3], [6, 4], [8, 4], [6, 3], [7, 4], [10, 6], [4, 2], [9, 5]];
  g41.A.push(
    /* same method, new animals and vehicles */
    (r, p) => {
      const th = pick(r, TH.slice(2)), H = N(r, p, 4, 15), t = ri(r, 1, H - 1), c = H - t, F = th.l1 * c + th.l2 * t, ask2 = r() < .5, D = F - th.l1 * H, dl = th.l2 - th.l1, ans = ask2 ? t : c, pp = ppOf(th);
      return o('cr-basic', `${th.at}有${th.n1}和${th.n2}共 ${H} ${th.u}，共 ${F} ${pp}。${ask2 ? th.n2 : th.n1}有幾${th.u}？`, ans,
        `先假設全部是${th.n1}。`, `假設 ${H} ${th.u}全是${th.n1}：${H}×${th.l1}＝${th.l1 * H}，少了 ${D} ${pp}；每換 1 ${th.u}多 ${dl}，${D}÷${dl}＝${t}，所以${th.n2} ${t} ${th.u}、${th.n1} ${c} ${th.u}。`,
        [ask2 ? c : t, D, F - H, ans + 1], `${ask2 ? D + '/' + dl : H + '-' + D + '/' + dl}`, [],
        { svg: cage(H, F, 0, 0, lblOf(th, H, F)), why: { [ask2 ? c : t]: `你算出的是${ask2 ? th.n1 : th.n2}的數目，題目問${ask2 ? th.n2 : th.n1}。`, [D]: `${D} 是比全${th.n1}多出的${th.part}，還要除以 ${dl}。` } });
    },
    /* same method, told by a named child */
    (r, p) => {
      const th = pick(r, TH.slice(1)), who = name(r), H = N(r, p, 4, 15), t = ri(r, 1, H - 1), c = H - t, F = th.l1 * c + th.l2 * t, ask2 = r() < .5, D = F - th.l1 * H, dl = th.l2 - th.l1, ans = ask2 ? t : c, pp = ppOf(th);
      return o('cr-basic', `${who}在${th.at}數到${th.n1}和${th.n2}共 ${H} ${th.u}，共 ${F} ${pp}。${ask2 ? th.n2 : th.n1}有幾${th.u}？`, ans,
        `先假設全部是${th.n1}。`, `假設 ${H} ${th.u}全是${th.n1}：${H}×${th.l1}＝${th.l1 * H}，少了 ${D} ${pp}；每換 1 ${th.u}多 ${dl}，${D}÷${dl}＝${t}，所以${th.n2} ${t} ${th.u}、${th.n1} ${c} ${th.u}。`,
        [ask2 ? c : t, D, F - H, ans + 1], `${ask2 ? D + '/' + dl : H + '-' + D + '/' + dl}`, [],
        { svg: cage(H, F, 0, 0, lblOf(th, H, F)), why: { [ask2 ? c : t]: `你算出的是${ask2 ? th.n1 : th.n2}的數目，題目問${ask2 ? th.n2 : th.n1}。`, [D]: `${D} 是比全${th.n1}多出的${th.part}，還要除以 ${dl}。` } });
    },
    /* first step only: assume all of one kind */
    (r, p) => {
      const th = pick(r, TH), H = N(r, p, 4, 15), t = ri(r, 1, H - 1), c = H - t, F = th.l1 * c + th.l2 * t, D = F - th.l1 * H, pp = ppOf(th), ask1 = r() < .5, ans = ask1 ? th.l1 * H : D;
      const head = `${th.at}有${th.n1}和${th.n2}共 ${H} ${th.u}，共 ${F} ${pp}。`;
      return o('cr-assume', head + (ask1 ? `若全是${th.n1}，會有幾${pp}？` : `若全當作${th.n1}來算，實際比它多出幾${pp}？`), ans,
        `全是${th.n1}時，每${th.u}有 ${th.l1} ${th.part === '腳' ? '隻腳' : '個輪'}。`,
        ask1 ? `全是${th.n1}：${H}×${th.l1}＝${ans} ${pp}。` : `全是${th.n1}有 ${H}×${th.l1}＝${th.l1 * H} ${pp}；實際 ${F}，多出 ${F}－${th.l1 * H}＝${D} ${pp}。`,
        [ask1 ? F : th.l1 * H, ask1 ? D : F, H * th.l2, ans + 1], ask1 ? `${H}*${th.l1}` : `${F}-${H}*${th.l1}`, [],
        { svg: cage(H, F, 0, 0, lblOf(th, H, F)), why: { [ask1 ? F : th.l1 * H]: ask1 ? `${F} 是實際的${th.part}數，題目問的是全當作${th.n1}。` : `${th.l1 * H} 是全當作${th.n1}的${th.part}數，還要和實際的 ${F} 比較。`, [H * th.l2]: `那是全當作${th.n2}的${th.part}數。` } });
    });
  g41.B.push(
    /* test score: right + wrong */
    (r, p) => {
      const a = pick(r, [3, 4, 5]), b = ri(r, 1, 2), H = N(r, p, 6, 16), w = ri(r, 1, Math.floor(H / 2)), S = a * (H - w) - b * w, who = name(r), askR = r() < .5, D = a * H - S, ans = askR ? H - w : w;
      return o('cr-score', `一份試卷共 ${H} 題，答對一題得 ${a} 分，答錯一題扣 ${b} 分。${who}全部作答，得 ${S} 分，答${askR ? '對' : '錯'}幾題？`, ans,
        '先假設全部答對。', `全對有 ${H}×${a}＝${a * H} 分，比實際多 ${a * H}－${S}＝${D} 分；錯 1 題少 ${a}＋${b}＝${a + b} 分，${D}÷${a + b}＝${w}，所以答錯 ${w} 題、答對 ${H - w} 題。`,
        [askR ? w : H - w, D, a * H, ans + 1], askR ? `${H}-${D}/${a + b}` : `${D}/${a + b}`, [],
        { why: { [askR ? w : H - w]: `你算出的是答${askR ? '錯' : '對'}的題數，題目問答${askR ? '對' : '錯'}。`, [D]: `${D} 是比全對少了的分數，每錯一題少 ${a + b} 分，還要除。` } });
    },
    /* legs of rabbits minus legs of chickens */
    (r, p) => {
      const H = N(r, p, 5, 18), t = ri(r, Math.floor(H / 3) + 1, H - 1), c = H - t, d = 4 * t - 2 * c, askR = r() < .5, ans = askR ? t : c, X = d + 2 * H;
      return o('cr-legdiff', `雞和兔共 ${H} 隻，兔的腳比雞的腳多 ${d} 隻。${askR ? '兔' : '雞'}有幾隻？`, ans,
        '先假設全部是雞，看看兔腳比雞腳少多少。', `全是雞時，${H} 隻共 ${2 * H} 隻腳，兔腳比雞腳少 ${2 * H}；實際多 ${d}，要增加 ${d}＋${2 * H}＝${X}；每把 1 隻雞換成兔，差距增加 4＋2＝6，${X}÷6＝${t}，所以兔 ${t} 隻、雞 ${c} 隻。`,
        [askR ? c : t, X, d, ans + 1], askR ? `${X}/6` : `${H}-${X}/6`, [],
        { why: { [askR ? c : t]: `你算出的是${askR ? '雞' : '兔'}的隻數，題目問${askR ? '兔' : '雞'}。`, [X]: `${X} 是要增加的差距，每換一隻差距增加 6，還要除以 6。` } });
    },
    /* coins instead of animals */
    (r, p) => {
      const [a, b] = pick(r, COIN), H = N(r, p, 4, 12), t = ri(r, 1, H - 1), c = H - t, V = a * c + b * t, ask2 = r() < .5, D = V - a * H, dl = b - a, who = name(r), ans = ask2 ? t : c;
      return o('cr-coin', `${who}的錢包有 ${a} 元和 ${b} 元硬幣共 ${H} 枚，共 ${V} 元。${ask2 ? b : a} 元硬幣有幾枚？`, ans,
        `先假設全部是 ${a} 元硬幣。`, `假設 ${H} 枚全是 ${a} 元：${H}×${a}＝${a * H} 元，少了 ${D} 元；每換 1 枚多 ${dl} 元，${D}÷${dl}＝${t}，所以 ${b} 元硬幣 ${t} 枚、${a} 元硬幣 ${c} 枚。`,
        [ask2 ? c : t, D, V - H, ans + 1], `${ask2 ? D + '/' + dl : H + '-' + D + '/' + dl}`, [],
        { svg: cage(H, V, 0, 0, `${H} 枚 · ${V} 元`), why: { [ask2 ? c : t]: `你算出的是 ${ask2 ? a : b} 元硬幣的枚數，題目問 ${ask2 ? b : a} 元。`, [D]: `${D} 是比全部 ${a} 元多出的錢，還要除以 ${dl}。` } });
    },
    /* coins: how much money is in one kind */
    (r, p) => {
      const [a, b] = pick(r, COIN), H = N(r, p, 4, 12), t = ri(r, 1, H - 1), c = H - t, V = a * c + b * t, D = V - a * H, dl = b - a, who = name(r), askB = r() < .5, x = askB ? b : a, n = askB ? t : c, val = n * x;
      return o('cr-coinval', `${who}的錢包有 ${a} 元和 ${b} 元硬幣共 ${H} 枚，共 ${V} 元。${x} 元硬幣共值多少元？`, val,
        `先求 ${x} 元硬幣有幾枚。`, `假設全是 ${a} 元：${H}×${a}＝${a * H} 元，少了 ${D} 元；每換 1 枚多 ${dl} 元，${D}÷${dl}＝${t} 枚 ${b} 元、${c} 枚 ${a} 元；${x} 元硬幣有 ${n} 枚，${n}×${x}＝${val} 元。`,
        [n, askB ? c * a : t * b, V, val + x], `${n}*${x}`, [],
        { svg: cage(H, V, 0, 0, `${H} 枚 · ${V} 元`), why: { [n]: `${n} 是 ${x} 元硬幣的枚數，題目問它們共值多少元。`, [askB ? c * a : t * b]: `你算的是另一種硬幣共值的錢。` } });
    },
    /* boats: big boat holds more people */
    (r, p) => {
      const [a, b] = pick(r, BOAT), H = N(r, p, 4, 12), t = ri(r, 1, H - 1), c = H - t, V = a * t + b * c, D = V - b * H, dl = a - b, who = name(r), askBig = r() < .5, ans = askBig ? t : c;
      return o('cr-boat', `${who}一家租船，大船坐 ${a} 人，小船坐 ${b} 人。共租 ${H} 條船，剛好坐滿 ${V} 人。${askBig ? '大' : '小'}船租了幾條？`, ans,
        '先假設全部是小船。', `假設全是小船：${H}×${b}＝${b * H} 人，少了 ${D} 人；每把 1 條小船換成大船多坐 ${dl} 人，${D}÷${dl}＝${t}，所以大船 ${t} 條、小船 ${c} 條。`,
        [askBig ? c : t, D, V - H, ans + 1], askBig ? `${D}/${dl}` : `${H}-${D}/${dl}`, [],
        { svg: cage(H, V, 0, 0, `${H} 條船 · ${V} 人`), why: { [askBig ? c : t]: `你算出的是${askBig ? '小' : '大'}船的條數，題目問${askBig ? '大' : '小'}船。`, [D]: `${D} 是比全小船少坐的人，每換一條多坐 ${dl} 人，還要除以 ${dl}。` } });
    });

  /* independent recomputation: brute force over every possible split */
  const verify41 = q => {
    let m;
    if ((m = /有(.+?)和(.+?)共 (\d+) .，共 (\d+) .+。(.+?)有幾/.exec(q.q))) {
      const H = +m[3], F = +m[4], th = TH.find(t => t.n1 === m[1]);
      for (let t = 0; t <= H; t++) if (th.l1 * (H - t) + th.l2 * t === F) return String(m[5] === th.n2 ? t : H - t);
      return 'none';
    }
    if ((m = /共有 (\d+) 隻腳，兔比雞多 (\d+) 隻。(.)有幾/.exec(q.q))) {
      const F = +m[1], d = +m[2];
      for (let c = 0; c <= 80; c++) if (2 * c + 4 * (c + d) === F) return String(m[3] === '雞' ? c : c + d);
      return 'none';
    }
    if ((m = /共 (\d+) 隻，腳數比頭數的 4 倍少 (\d+) 隻/.exec(q.q))) {
      const H = +m[1], x = +m[2];
      for (let c = 0; c <= H; c++) if (2 * c + 4 * (H - c) === 4 * H - x) return String(c);
      return 'none';
    }
    return null;
  };


  const verify41b = q => {
    let m;
    if ((m = /^\S+的錢包有 (\d+) 元和 (\d+) 元硬幣共 (\d+) 枚，共 (\d+) 元。(\d+) 元硬幣有幾枚/.exec(q.q))) {
      const a = +m[1], b = +m[2], H = +m[3], V = +m[4];
      for (let t = 0; t <= H; t++) if (a * (H - t) + b * t === V) return String(+m[5] === b ? t : H - t);
      return 'none';
    }
    if ((m = /^\S+的錢包有 (\d+) 元和 (\d+) 元硬幣共 (\d+) 枚，共 (\d+) 元。(\d+) 元硬幣共值多少元/.exec(q.q))) {
      const a = +m[1], b = +m[2], H = +m[3], V = +m[4];
      for (let t = 0; t <= H; t++) if (a * (H - t) + b * t === V) return String((+m[5] === b ? t : H - t) * +m[5]);
      return 'none';
    }
    if ((m = /^\S+在(.+?)數到(.+?)和(.+?)共 (\d+) .，共 (\d+) .+。(.+?)有幾/.exec(q.q))) {
      const th = TH.find(t => t.n1 === m[2]), H = +m[4], F = +m[5];
      for (let t = 0; t <= H; t++) if (th.l1 * (H - t) + th.l2 * t === F) return String(m[6] === th.n2 ? t : H - t);
      return 'none';
    }
    if ((m = /^(.+)有(.+?)和(.+?)共 (\d+) .，共 (\d+) .+。若全是(.+?)，會有幾/.exec(q.q))) { const th = TH.find(t => t.n1 === m[2]); return String(th.l1 * +m[4]); }
    if ((m = /^(.+)有(.+?)和(.+?)共 (\d+) .，共 (\d+) .+。若全當作(.+?)來算，實際比它多出幾/.exec(q.q))) { const th = TH.find(t => t.n1 === m[2]); return String(+m[5] - th.l1 * +m[4]); }
    if ((m = /^一份試卷共 (\d+) 題，答對一題得 (\d+) 分，答錯一題扣 (\d+) 分。\S+全部作答，得 (\d+) 分，答(.)幾題/.exec(q.q))) {
      const H = +m[1];
      for (let w = 0; w <= H; w++) if ((+m[2]) * (H - w) - (+m[3]) * w === +m[4]) return String(m[5] === '對' ? H - w : w);
      return 'none';
    }
    if ((m = /^雞和兔共 (\d+) 隻，兔的腳比雞的腳多 (\d+) 隻。(.)有幾隻/.exec(q.q))) {
      const H = +m[1];
      for (let c = 0; c <= H; c++) if (4 * (H - c) - 2 * c === +m[2]) return String(m[3] === '兔' ? H - c : c);
      return 'none';
    }
    if ((m = /^\S+一家租船，大船坐 (\d+) 人，小船坐 (\d+) 人。共租 (\d+) 條船，剛好坐滿 (\d+) 人。(.)船租了幾條/.exec(q.q))) {
      const H = +m[3];
      for (let t = 0; t <= H; t++) if ((+m[1]) * t + (+m[2]) * (H - t) === +m[4]) return String(m[5] === '大' ? t : H - t);
      return 'none';
    }
    return verify41(q);
  };

  WQOly.register({
    id: 'p4-1', grade: 4, n: 1, title: '雞兔同籠', icon: '🐔',
    card: { motto: '先假設全是雞', example: '8 頭 26 腳：兔 5 隻', art: art41 },
    lesson: [
      { t: 'show', say: '共 8 隻頭、26 隻腳。雞兔各幾隻？', scene: { w: 'swap', p: { heads: 8, legs: 26 }, still: true } },
      { t: 'show', say: '先假設全部是雞。8 隻雞只有 16 隻腳。', scene: { w: 'swap', p: { heads: 8, legs: 26 }, still: true } },
      { t: 'predict', say: '把 1 隻雞換成兔。', ask: '腳會多幾隻？', options: ['1', '2', '3'], answer: '2', scene: { w: 'swap', p: { heads: 8, legs: 26 }, still: true }, reveal: '兔 4 腳、雞 2 腳，每換一隻多 2 隻腳！' },
      { t: 'do', say: '點一點，把雞換成兔，換到腳數剛好 26。', scene: { w: 'swap', p: { heads: 8, legs: 26 } } },
      { t: 'show', say: '差 10 隻腳，每換一隻多 2 隻。10÷2＝5，兔有 5 隻。', scene: { w: 'swap', p: { heads: 8, legs: 26, pre: 5 }, still: true } },
      { t: 'do', say: '再試一次：5 隻頭、14 隻腳。', scene: { w: 'swap', p: { heads: 5, legs: 14 } } },
      { t: 'try', say: '用剛才的方法，答答看。', scene: { w: 'swap', p: { heads: 7, legs: 20 }, still: true },
        q: { stem: '雞和兔共 7 隻，共 20 隻腳。兔有幾隻？', options: ['3', '4', '6'], answer: '3', hint: '先假設 7 隻全是雞。', why: { 6: '6 是多出來的腳數，每換一隻多 2 隻，還要除以 2。', 4: '4 是雞的隻數，題目問兔。' } } },
      { t: 'card' }
    ],
    gens: g41, verify: verify41b
  });


  /* ======================================================================= p4-2 高斯求和 ===================================== */
  const art42 = '<svg viewBox="0 0 120 80"><g font-size="13" font-weight="900" text-anchor="middle" dominant-baseline="central"><circle cx="16" cy="38" r="9" fill="#3ee6d0"/><circle cx="38" cy="38" r="9" fill="#3ee6d0"/><circle cx="82" cy="38" r="9" fill="#ffc94a"/><circle cx="104" cy="38" r="9" fill="#ffc94a"/><g fill="#0b1030"><text x="16" y="38">1</text><text x="38" y="38">2</text><text x="82" y="38">9</text><text x="104" y="38">10</text></g></g><path d="M16 28Q60 -4 104 28M38 28Q60 8 82 28" stroke="#c6a2ff" stroke-width="2.4" fill="none"/><rect x="14" y="56" width="92" height="20" rx="10" fill="#ff8fc7"/><text x="60" y="66" text-anchor="middle" dominant-baseline="central" font-size="13" font-weight="900" fill="#0b1030">頭尾配對</text></svg>';
  const g42 = {
    A: [
      (r, p) => {
        const n = N(r, p, 6, 100), ans = n * (n + 1) / 2;
        const w = wy(ans, [[n * (n + 1), `${n}＋1 是每對的和，對數只有一半，要除以 2。`], [n % 2 === 0 ? n / 2 * n : (n - 1) / 2 * (n + 1), n % 2 === 0 ? `每對是 ${n + 1}，不是 ${n}。` : '單數個數會剩下中間一個數，別漏掉。'], [n + 1, '那只是一對的和，還有很多對。']]);
        return o('gs-basic', `1＋2＋3＋…＋${n}＝？`, ans, '頭尾配對：1 配最後一個。', `每對 1＋${n}＝${n + 1}，有 ${n}÷2 對：${n + 1}×${n}÷2＝${ans}。`, ks(w), `${n}*(${n}+1)/2`, [], { why: w });
      },
      (r, p) => {
        const n = N(r, p, 5, 20), ans = n * (n + 1) / 2;
        const w = wy(ans, [[n * (n + 1), '每塊磚被算了兩次，要除以 2。'], [n * n, `最後一級是 ${n} 塊，但前面各級比它少。`], [n * (n - 1) / 2, `漏了第 ${n} 級的 ${n} 塊。`]]);
        return o('gs-stairs', `樓梯第 1 級 1 塊磚，第 2 級 2 塊磚，…，第 ${n} 級 ${n} 塊磚。共幾塊？`, ans, '把 1 到最後一級的數加起來。', `1＋2＋…＋${n}＝(1＋${n})×${n}÷2＝${ans}。`, ks(w), `${n}*(${n}+1)/2`, [], { why: w });
      },
      (r, p) => {
        const n = 2 * N(r, p, 3, 50), ans = n / 2;
        const w = wy(ans, [[n, '兩個數配成一對，不是一個數一對。'], [n + 1, '那是每對的和，不是對數。']]);
        return o('gs-pairs', `1 到 ${n}，頭尾配對（1 配 ${n}），共配成幾對？`, ans, '兩個數一對。', `${n} 個數，每 2 個一對：${n}÷2＝${ans} 對。`, ks(w), `${n}/2`, [], { why: w });
      }
    ],
    B: [
      (r, p) => {
        const d = ri(r, 2, 3), a = ri(r, 1, 5), n = N(r, p, 6, 20), L = a + (n - 1) * d, ans = (a + L) * n / 2;
        const half = (a + L) * (n - 1);
        const w = wy(ans, [[(a + L) * n, `首尾和 ${a + L} 乘項數 ${n} 後，還要除以 2。`], [half % 2 === 0 ? half / 2 : 0, '項數不是 (末−首)÷差，還要加 1。'], [L, `${L} 只是最後一個數。`]]);
        return o('gs-step', `${a}＋${a + d}＋${a + 2 * d}＋…＋${L}＝？`, ans, '先數有幾個數。', `項數 (${L}－${a})÷${d}＋1＝${n}；${a}＋${L}＝${a + L}；${a + L}×${n}÷2＝${ans}。`, ks(w), `(${a}+${L})*${n}/2`, [], { why: w });
      },
      (r, p) => {
        const d = ri(r, 2, 3), a = ri(r, 1, 5), n = N(r, p, 6, 30), L = a + (n - 1) * d;
        const w = wy(n, [[n - 1, '像植樹：數字的個數比間隔數多 1。'], [Number.isInteger(L / d) ? L / d : 0, `${L}÷${d} 不是個數，要看從 ${a} 開始。`], [L - a, `${L}－${a} 是一共跳了多遠，不是幾個數。`]]);
        return o('gs-count', `${a}、${a + d}、${a + 2 * d}、…、${L}，一共有幾個數？`, n, '每次加幾？從頭跳到尾跳了幾次？', `跳了 (${L}－${a})÷${d}＝${n - 1} 次，數字有 ${n - 1}＋1＝${n} 個。`, ks(w), `(${L}-${a})/${d}+1`, [], { why: w });
      },
      (r, p) => {
        const C = pick(r, ['小明', '小美', '阿強', '小欣']), a = ri(r, 2, 6), d = ri(r, 2, 3), n = N(r, p, 5, 12), L = a + (n - 1) * d, ans = (a + L) * n / 2;
        const w = wy(ans, [[(a + L) * n, '首尾和乘天數後，還要除以 2。'], [L, `${L} 只是最後一天讀的頁數。`], [a * n, '每天讀的頁數不一樣，不是 ' + a + ' 頁。']]);
        return o('gs-story', `${C}第 1 天讀 ${a} 頁，之後每天多讀 ${d} 頁，共讀 ${n} 天。一共讀了幾頁？`, ans, '先算最後一天讀幾頁。', `最後一天 ${a}＋${n - 1}×${d}＝${L} 頁；(${a}＋${L})×${n}÷2＝${ans}。`, ks(w), `(${a}+${L})*${n}/2`, [], { why: w });
      }
    ]
  };
  const verify42 = q => {
    let m;
    if ((m = /^1＋2＋3＋…＋(\d+)＝？/.exec(q.q))) { let s = 0; for (let i = 1; i <= +m[1]; i++) s += i; return String(s); }
    if ((m = /^樓梯第 1 級 1 塊磚.+第 (\d+) 級/.exec(q.q))) { let s = 0; for (let i = 1; i <= +m[1]; i++) s += i; return String(s); }
    if ((m = /^1 到 (\d+)，頭尾配對/.exec(q.q))) { let a = 1, b = +m[1], c = 0; while (a < b) { a++; b--; c++; } return String(c); }
    if ((m = /^(\d+)＋(\d+)＋(\d+)＋…＋(\d+)＝？/.exec(q.q))) { const d = +m[2] - +m[1]; let s = 0; for (let x = +m[1]; x <= +m[4]; x += d) s += x; return String(s); }
    if ((m = /^(\d+)、(\d+)、(\d+)、…、(\d+)，一共有幾個數/.exec(q.q))) { const d = +m[2] - +m[1]; let c = 0; for (let x = +m[1]; x <= +m[4]; x += d) c++; return String(c); }
    if ((m = /^\S+第 1 天讀 (\d+) 頁，之後每天多讀 (\d+) 頁，共讀 (\d+) 天/.exec(q.q))) { let s = 0, day = +m[1]; for (let i = 0; i < +m[3]; i++) { s += day; day += +m[2]; } return String(s); }
    return null;
  };

  /* ---- R3.31 variety: extra settings for 高斯求和 (level A) ---- */
  const tri = n => n * (n + 1) / 2;
  const ACT2 = [['存', '元', '存了'], ['摺', '隻紙鶴', '摺了'], ['讀', '頁書', '讀了'], ['跳', '下繩', '跳了'], ['做', '道題', '做了']];
  const OBJ2 = [['杯子', '個'], ['罐頭', '罐'], ['橙', '個'], ['積木', '塊'], ['汽水瓶', '支'], ['波', '個']];
  const pyrSvg = n => {
    const d = Math.min(16, 200 / n), rr = d * .38, h = n * d * .86 + 12; let sv = '';
    for (let i = 1; i <= n; i++) for (let j = 0; j < i; j++) sv += `<circle cx="${120 + (j - (i - 1) / 2) * d}" cy="${8 + (i - 1) * d * .86}" r="${rr}" fill="#3ee6d0"/>`;
    return `<svg viewBox="0 0 240 ${h}" role="img" aria-label="三角形，最上層 1 個，最下層 ${n} 個">${sv}</svg>`;
  };
  g42.A.push(
    /* 1+2+...+n told as a daily habit */
    (r, p) => {
      const C = name(r), [v, u, v2] = pick(r, ACT2), n = N(r, p, 4, 15), ans = tri(n);
      const w = wy(ans, [[n * (n + 1), `每天的數目不同，不是每對乘一次；(1＋${n})×${n} 還要除以 2。`], [n * n, `每天不是都${v} ${n} ${u}，前面幾天少一些。`], [tri(n - 1), `漏了第 ${n} 天的 ${n} ${u}。`]]);
      return o('gs-save', `${C}第 1 天${v} 1 ${u}，第 2 天${v} 2 ${u}，…，第 ${n} 天${v} ${n} ${u}。一共${v2}多少${u}？`, ans, '把 1 到最後一天的數加起來。',
        `1＋2＋…＋${n}＝(1＋${n})×${n}÷2＝${ans}。`, ks(w), `${n}*(${n}+1)/2`, [], { why: w });
    },
    /* one pair only */
    (r, p) => {
      const C = name(r), n = N(r, p, 5, 60), k = Math.floor(r() * 3), ans = n + 1;
      const q = k === 0 ? `1＋2＋3＋…＋${n}，頭尾配對（1 配 ${n}），每對的和是多少？` : k === 1 ? `把 1 到 ${n} 這些數頭尾配對，每一對的和是多少？` : `${C}想算 1＋2＋…＋${n}。先把第一個數和最後一個數配成一對，這一對的和是多少？`;
      const w = wy(ans, [[n, `${n} 只是最後一個數，要加上配對的 1。`], [tri(n), '那是全部加起來的和，這裏只問一對。'], [n - 1, `1 要和 ${n} 相加，不是相減。`]]);
      return o('gs-pairsum', q, ans, '頭尾兩個數相加。', `1＋${n}＝${ans}，每一對的和都是 ${ans}。`, ks(w), `${n}+1`, [], { why: w });
    },
    /* a run that does not start at 1 */
    (r, p) => {
      const C = name(r), a = ri(r, 2, N(r, p, 3, 12)), k = N(r, p, 4, 10), b = a + k - 1, ans = (a + b) * k / 2, form = r() < .5;
      const q = form ? `${a}＋${a + 1}＋${a + 2}＋…＋${b}＝？` : `${C}從 ${a} 開始，依次加 ${a + 1}、${a + 2}…，一直加到 ${b}。和是多少？`;
      const w = wy(ans, [[(a + b) * k, '首尾和乘個數後，還要除以 2。'], [k, '那只是有幾個數。'], [tri(b), `這是從 1 開始加到 ${b}，這裏要從 ${a} 開始。`], [(a + b) * (k - 1) / 2, `${b}－${a} 不是個數，從 ${a} 到 ${b} 共 ${k} 個數。`]]);
      return o('gs-range', q, ans, '先數有幾個數。', `共 ${b}－${a}＋1＝${k} 個數；${a}＋${b}＝${a + b}；${a + b}×${k}÷2＝${ans}。`, ks(w), `(${a}+${b})*${k}/2`, [], { why: w });
    },
    /* how many numbers (both ends counted) */
    (r, p) => {
      const C = name(r), a = ri(r, 2, N(r, p, 3, 15)), k = N(r, p, 4, 14), b = a + k - 1, f = Math.floor(r() * 3);
      const q = f === 0 ? `${a} 到 ${b}（包括 ${a} 和 ${b}），共有幾個數？` : f === 1 ? `${C}由第 ${a} 頁讀到第 ${b} 頁（兩頁都讀），共讀了幾頁？` : `門牌由 ${a} 號到 ${b} 號，每個號碼都有一間屋，共有幾間屋？`;
      const w = wy(k, [[b - a, `${b}－${a} 是間隔數，頭尾都要算，還要加 1。`], [b, `${b} 只是最後一個數，不是個數。`], [b - a + 2, '多加了一個，頭尾只加 1 次。']]);
      return o('gs-num', q, k, '頭尾都要算進去。', `${b}－${a}＝${k - 1}，頭尾都算，再加 1：${k - 1}＋1＝${k}。`, ks(w), `${b}-${a}+1`, [], { why: w });
    },
    /* find the last number */
    (r, p) => {
      const C = name(r), n = N(r, p, 4, 14), T = tri(n), f = r() < .5;
      const q = f ? `從 1 起連續整數相加：1＋2＋3＋…，和是 ${T} 時，最後加的數是多少？` : `${C}從 1 開始連續加，加到某個數時和是 ${T}。最後加的數是多少？`;
      const w = wy(n, [[n + 1, `${n}×${n + 1} 中較小的是 ${n}，那才是最後加的數。`], [n - 1, `加到 ${n - 1} 的和只有 ${tri(n - 1)}。`], [T / 2 % 1 === 0 ? T / 2 : 0, '和的一半不是最後一個數。']]);
      return o('gs-back', q, n, '和的 2 倍＝最後一個數×(最後一個數＋1)。', `和的 2 倍是 ${2 * T}＝${n}×${n + 1}，所以最後加的數是 ${n}。`, ks(w), '', [], { why: w });
    },
    /* write it backwards and add the two rows */
    (r, p) => {
      const C = name(r), n = N(r, p, 4, 20), ans = n * (n + 1);
      const w = wy(ans, [[tri(n), '那是原來的和，這裏問的是兩行合共。'], [n + 1, '那是一列的和，還有 ' + n + ' 列。'], [n * n, `每一列是 1＋${n}＝${n + 1}，不是 ${n}。`]]);
      return o('gs-double', `${C}把 1＋2＋…＋${n} 倒過來寫成 ${n}＋…＋2＋1，再上下相加。兩行的總和是多少？`, ans, '上下對齊，每一列的和是多少？',
        `每一列 1＋${n}＝${n + 1}，共 ${n} 列：${n + 1}×${n}＝${ans}，這是原來和的 2 倍。`, ks(w), `${n}*(${n}+1)`, [], { why: w });
    },
    /* triangle stack */
    (r, p) => {
      const [ob, cl] = pick(r, OBJ2), n = N(r, p, 4, 14), ans = tri(n);
      const w = wy(ans, [[n * (n + 1), '每個被算了兩次，要除以 2。'], [n * n, `最上層只有 1 ${cl}，不是每層 ${n} ${cl}。`], [tri(n - 1), `漏了最下層的 ${n} ${cl}。`]]);
      return o('gs-pyramid', `把${ob}疊成三角形：最上層 1 ${cl}，第 2 層 2 ${cl}，…，最下層 ${n} ${cl}。共用幾${cl}？`, ans, '每層的數目加起來。',
        `1＋2＋…＋${n}＝(1＋${n})×${n}÷2＝${ans}。`, ks(w), `${n}*(${n}+1)/2`, [], { why: w, svg: pyrSvg(n) });
    });
  const verify42b = q => {
    let m;
    if ((m = /^\S+第 1 天. 1 .+?，第 2 天. 2 .+?，…，第 (\d+) 天/.exec(q.q))) return String(tri(+m[1]));
    if ((m = /^1＋2＋3＋…＋(\d+)，頭尾配對（1 配 \d+），每對的和/.exec(q.q)) || (m = /^把 1 到 (\d+) 這些數頭尾配對/.exec(q.q)) || (m = /^\S+想算 1＋2＋…＋(\d+)。先把第一個數/.exec(q.q))) return String(+m[1] + 1);
    if ((m = /^\S+從 (\d+) 開始，依次加 .+一直加到 (\d+)。和是多少/.exec(q.q))) { let s = 0; for (let x = +m[1]; x <= +m[2]; x++) s += x; return String(s); }
    if ((m = /^(\d+) 到 (\d+)（包括/.exec(q.q)) || (m = /^\S+由第 (\d+) 頁讀到第 (\d+) 頁（兩頁都讀）/.exec(q.q)) || (m = /^門牌由 (\d+) 號到 (\d+) 號，/.exec(q.q))) { let c = 0; for (let x = +m[1]; x <= +m[2]; x++) c++; return String(c); }
    if ((m = /^從 1 起連續整數相加：1＋2＋3＋…，和是 (\d+) 時/.exec(q.q)) || (m = /^\S+從 1 開始連續加，加到某個數時和是 (\d+)。/.exec(q.q))) { let s = 0; for (let x = 1; x <= 300; x++) { s += x; if (s === +m[1]) return String(x); } return 'none'; }
    if ((m = /^\S+把 1＋2＋…＋(\d+) 倒過來寫成/.exec(q.q))) { let s = 0; for (let x = 1; x <= +m[1]; x++) s += x; return String(2 * s); }
    if ((m = /^把.+疊成三角形：最上層 1 .+最下層 (\d+) .。共用幾/.exec(q.q))) { let s = 0; for (let x = 1; x <= +m[1]; x++) s += x; return String(s); }
    return verify42(q);
  };

  WQOly.register({
    id: 'p4-2', grade: 4, n: 2, title: '高斯求和', icon: '➕',
    card: { motto: '頭尾配對', example: '1＋…＋10＝11×5', art: art42 },
    lesson: [
      { t: 'show', say: '1＋2＋3＋…＋10。一個一個加太慢了！', scene: { w: 'pairing', p: { n: 10 } } },
      { t: 'predict', say: '把最小的 1 和最大的 10 配成一對。', ask: '1＋10 是多少？', options: ['10', '11', '12'], answer: '11', scene: { w: 'pairing', p: { n: 10 }, still: true }, reveal: '1＋10＝11！' },
      { t: 'do', say: '2 和 9 呢？一對一對配，每對都是 11。', scene: { w: 'pairing', p: { n: 10 } } },
      { t: 'show', say: '一共 5 對，每對 11。11×5＝55。', scene: { w: 'pairing', p: { n: 10 } } },
      { t: 'predict', say: '1 加到 8，也頭尾配對。', ask: '一共配成幾對？', options: ['3', '4', '8'], answer: '4', scene: { w: 'pairing', p: { n: 8 }, still: true }, reveal: '8 個數，兩個一對，4 對。每對 9。' },
      { t: 'do', say: '2＋4＋6＋…＋12：先數有幾個數。', scene: { w: 'numline', p: { min: 0, max: 12, start: 2, target: 12, steps: [2], hops: Array.from({ length: 5 }, () => ({ n: 2 })) } } },
      { t: 'try', say: '用頭尾配對，答答看。', scene: { w: 'pairing', p: { n: 20 }, still: true },
        q: { stem: '1＋2＋3＋…＋20＝？', options: ['190', '210', '420'], answer: '210', hint: '每對 21，共 10 對。', why: { 420: '420 是還沒除以 2。', 190: '每對是 1＋20＝21，不是 19。' } } },
      { t: 'card' }
    ],
    gens: g42, verify: verify42b
  });

  /* ======================================================================= p4-3 植樹進階 ===================================== */
  const D3 = [2, 3, 4, 5, 6, 8, 10];
  const roadSvg = (segs, mode) => {
    let s = '';
    if (mode === 'circle') {
      const R = 34, cx = 120, cy = 44;
      s = `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#c3cbf7" stroke-width="3"/>`;
      for (let i = 0; i < segs; i++) { const a = -Math.PI / 2 + i / segs * 2 * Math.PI; s += `<circle cx="${cx + Math.cos(a) * R}" cy="${cy + Math.sin(a) * R}" r="${segs > 14 ? 3 : 4.5}" fill="#7ee3a1"/>`; }
      return `<svg viewBox="0 0 240 90" role="img" aria-label="環形路">${s}</svg>`;
    }
    const x0 = 14, x1 = 226, dx = (x1 - x0) / segs, first = mode === 'none' ? 1 : 0, last = mode === 'both' ? segs : segs - (mode === 'one' ? 1 : 1);
    s = `<line x1="${x0}" y1="40" x2="${x1}" y2="40" stroke="#c3cbf7" stroke-width="3" stroke-linecap="round"/>`;
    for (let i = 0; i <= segs; i++) s += `<line x1="${x0 + i * dx}" y1="34" x2="${x0 + i * dx}" y2="46" stroke="#c3cbf7" stroke-width="1.5"/>`;
    const lo = mode === 'none' ? 1 : 0, hi = mode === 'both' ? segs : segs - 1;
    for (let i = lo; i <= hi; i++) s += `<circle cx="${x0 + i * dx}" cy="26" r="${segs > 14 ? 3 : 4.5}" fill="#7ee3a1"/>`;
    return `<svg viewBox="0 0 240 70" role="img" aria-label="一條路">${s}</svg>`;
  };
  const art43 = '<svg viewBox="0 0 120 80"><circle cx="60" cy="30" r="22" fill="none" stroke="#c3cbf7" stroke-width="3"/><g fill="#7ee3a1"><circle cx="60" cy="8" r="5"/><circle cx="81" cy="22" r="5"/><circle cx="73" cy="47" r="5"/><circle cx="47" cy="47" r="5"/><circle cx="39" cy="22" r="5"/></g><rect x="14" y="58" width="92" height="18" rx="9" fill="#ff8fc7"/><text x="60" y="68" text-anchor="middle" dominant-baseline="central" font-size="12" font-weight="900" fill="#0b1030">圍圈：棵數＝段數</text></svg>';
  const seg43 = (r, p, lo) => { const d = pick(r, D3), s = N(r, p, lo || 4, 20); return [d, s, d * s]; };
  const g43 = {
    A: [
      (r, p) => {
        const [d, s, L] = seg43(r, p), ans = s + 1;
        const w = wy(ans, [[s, '兩端都種，棵數要比段數多 1。'], [s - 1, '那是兩端都不種的算法。']]);
        return o('tp-both', `一條 ${L} 米長的路，每隔 ${d} 米種一棵樹，兩端都種。共種幾棵？`, ans, '先算有幾段，再看兩端。', `${L}÷${d}＝${s} 段；兩端都種，${s}＋1＝${ans} 棵。`, ks(w), `${L}/${d}+1`, [], { why: w, svg: roadSvg(Math.min(s, 20), 'both') });
      },
      (r, p) => {
        const [d, s, L] = seg43(r, p), ans = s;
        const w = wy(ans, [[s + 1, '只種一端，棵數和段數一樣多。'], [s - 1, '一端有種，不用減 1。']]);
        return o('tp-one', `一條 ${L} 米長的路，每隔 ${d} 米種一棵樹，只種一端，另一端不種。共種幾棵？`, ans, '一端種、一端不種，一段配一棵。', `${L}÷${d}＝${s} 段；只種一端，棵數＝段數＝${ans}。`, ks(w), `${L}/${d}`, [], { why: w, svg: roadSvg(Math.min(s, 20), 'one') });
      },
      (r, p) => {
        const d = pick(r, D3), s = N(r, p, 4, 20), n = s + 1, ans = s * d;
        const w = wy(ans, [[n * d, `${n} 棵只有 ${n - 1} 段，要先減 1。`], [(n + 1) * d, '棵數比段數多 1，要減，不是加。']]);
        return o('tp-back', `一條路兩端都種樹，共種 ${n} 棵，相鄰兩棵相隔 ${d} 米。路長多少米？`, ans, '先算有幾段。', `${n} 棵有 ${n}－1＝${s} 段；${s}×${d}＝${ans} 米。`, ks(w), `(${n}-1)*${d}`, [], { why: w, svg: roadSvg(Math.min(s, 20), 'both') });
      }
    ],
    B: [
      (r, p) => {
        const [d, s, L] = seg43(r, p), ans = s;
        const w = wy(ans, [[s + 1, '環形首尾相連，棵數＝段數，不用加 1。'], [s - 1, '環形沒有兩端，不用減 1。']]);
        return o('tp-ring', `環形池塘邊長 ${L} 米，每隔 ${d} 米種一棵樹。共種幾棵？`, ans, '圍成一圈，起點和終點是同一處。', `${L}÷${d}＝${s} 段；環形的棵數＝段數＝${ans}。`, ks(w), `${L}/${d}`, [], { why: w, svg: roadSvg(Math.min(s, 20), 'circle') });
      },
      (r, p) => {
        const [d, s, L] = seg43(r, p, 4), ans = 2 * (s + 1);
        const w = wy(ans, [[s + 1, '兩旁都要種，要乘 2。'], [2 * s, '兩端都種，每旁還要加 1。']]);
        return o('tp-sides', `一條 ${L} 米長的路，兩旁每隔 ${d} 米各種一棵，兩端都種。共種幾棵？`, ans, '先算一旁，再算兩旁。', `${L}÷${d}＝${s} 段；一旁 ${s}＋1＝${s + 1} 棵；兩旁 ${s + 1}×2＝${ans} 棵。`, ks(w), `(${L}/${d}+1)*2`, [], { why: w, svg: roadSvg(Math.min(s, 20), 'both') });
      },
      (r, p) => {
        const [d, s, L] = seg43(r, p, 5), ans = s - 1;
        const w = wy(ans, [[s, '兩端都不種，棵數比段數少 1。'], [s + 1, '那是兩端都種的算法。']]);
        return o('tp-none', `一條 ${L} 米長的路，兩端都不種，每隔 ${d} 米種一棵樹。共種幾棵？`, ans, '兩端的位置不種。', `${L}÷${d}＝${s} 段；兩端都不種，${s}－1＝${ans} 棵。`, ks(w), `${L}/${d}-1`, [], { why: w, svg: roadSvg(Math.min(s, 20), 'none') });
      },
      (r, p) => {
        const d = pick(r, D3), n = N(r, p, 5, 20), ans = n * d;
        const w = wy(ans, [[(n - 1) * d, '環形的段數就是棵數，不用減 1。'], [(n + 1) * d, '環形的段數不用加 1。']]);
        return o('tp-ringback', `圓形花圃種了 ${n} 棵樹，相鄰兩棵相隔 ${d} 米。花圃周長多少米？`, ans, '環形：有幾棵就有幾段。', `${n} 棵就是 ${n} 段；${n}×${d}＝${ans} 米。`, ks(w), `${n}*${d}`, [], { why: w, svg: roadSvg(Math.min(n, 20), 'circle') });
      }
    ]
  };
  const verify43 = q => {
    let m;
    if ((m = /^一條 (\d+) 米長的路，每隔 (\d+) 米種一棵樹，兩端都種/.exec(q.q))) { let c = 0; for (let x = 0; x <= +m[1]; x += +m[2]) c++; return String(c); }
    if ((m = /^一條 (\d+) 米長的路，每隔 (\d+) 米種一棵樹，只種一端/.exec(q.q))) { let c = 0; for (let x = 0; x < +m[1]; x += +m[2]) c++; return String(c); }
    if ((m = /^一條路兩端都種樹，共種 (\d+) 棵，相鄰兩棵相隔 (\d+) 米/.exec(q.q))) { return String((+m[1] - 1) * +m[2]); }
    if ((m = /^環形池塘邊長 (\d+) 米，每隔 (\d+) 米種一棵樹/.exec(q.q))) { let c = 0; for (let x = 0; x < +m[1]; x += +m[2]) c++; return String(c); }
    if ((m = /^一條 (\d+) 米長的路，兩旁每隔 (\d+) 米各種一棵，兩端都種/.exec(q.q))) { let c = 0; for (let x = 0; x <= +m[1]; x += +m[2]) c += 2; return String(c); }
    if ((m = /^一條 (\d+) 米長的路，兩端都不種，每隔 (\d+) 米種一棵樹/.exec(q.q))) { let c = 0; for (let x = +m[2]; x < +m[1]; x += +m[2]) c++; return String(c); }
    if ((m = /^圓形花圃種了 (\d+) 棵樹，相鄰兩棵相隔 (\d+) 米/.exec(q.q))) { let t = 0; for (let i = 0; i < +m[1]; i++) t += +m[2]; return String(t); }
    return null;
  };

  /* ---- R3.31 variety: extra settings for 植樹進階 ---- */
  const CX3 = [['走廊', '擺', '個', '花盆'], ['公園小路', '放', '張', '長椅'], ['馬路', '裝', '盞', '路燈'], ['橋', '插', '面', '旗'], ['校園小徑', '放', '個', '垃圾桶']];
  const RING3 = ['環形跑道', '圓形花圃邊', '環湖小路', '圓形廣場邊', '圓形池塘邊'];
  g43.A.push(
    /* new settings, ends both / one */
    (r, p) => {
      const [road, v, cl, ob] = pick(r, CX3), [d, s, L] = seg43(r, p), both = r() < .5, ans = both ? s + 1 : s;
      const w = both ? wy(ans, [[s, '兩端都有，個數要比段數多 1。'], [s - 1, '那是兩端都沒有的算法。']]) : wy(ans, [[s + 1, '只有一端有，個數和段數一樣多。'], [s - 1, '一端有，不用減 1。']]);
      return o(both ? 'tp-both' : 'tp-one', `${L} 米長的${road}，每隔 ${d} 米${v}一${cl}${ob}，${both ? `兩端都${v}` : `只在一端${v}，另一端不${v}`}。共要${v}幾${cl}？`, ans, '先算有幾段，再看兩端。',
        both ? `${L}÷${d}＝${s} 段；兩端都有，${s}＋1＝${ans} ${cl}。` : `${L}÷${d}＝${s} 段；只有一端，${cl}數＝段數＝${ans}。`, ks(w), both ? `${L}/${d}+1` : `${L}/${d}`, [], { why: w, svg: roadSvg(Math.min(s, 20), both ? 'both' : 'one') });
    },
    /* find the gap */
    (r, p) => {
      const [road, v, cl, ob] = pick(r, CX3), d = pick(r, D3), s = N(r, p, 3, 20), n = s + 1, L = d * s;
      const w = wy(d, [[L % n === 0 ? L / n : 0, `兩端都有，間隔比${cl}數少 1，要除以 ${s}，不是 ${n}。`], [s, '間隔數不是答案，路長要除以間隔數。']]);
      return o('tp-gap', `${L} 米長的${road}，兩端都${v}${ob}，共${v}了 ${n} ${cl}，相鄰兩${cl}相隔幾米？`, d, `${n} ${cl}有幾個間隔？`,
        `${n} ${cl}有 ${n}－1＝${s} 個間隔；${L}÷${s}＝${d} 米。`, ks(w), `${L}/(${n}-1)`, [], { why: w, svg: roadSvg(Math.min(s, 20), 'both') });
    },
    /* how many gaps */
    (r, p) => {
      const [road, v, cl, ob] = pick(r, CX3), n = N(r, p, 5, 21), s = n - 1;
      const w = wy(s, [[n, '兩端都有，間隔比個數少 1。'], [n + 1, '間隔數不會比個數多。'], [n - 2, '兩端都有，只減 1。']]);
      return o('tp-seg', `${road}旁${v}了 ${n} ${cl}${ob}（兩端都有），共有幾個間隔？`, s, '像手指和指縫：頭尾都有，間隔少 1。',
        `${n} ${cl}，頭尾都有，間隔數＝${n}－1＝${s}。`, ks(w), `${n}-1`, [], { why: w, svg: roadSvg(Math.min(s, 20), 'both') });
    });
  g43.B.push(
    /* ring, new settings */
    (r, p) => {
      const th = pick(r, RING3), [, v, cl, ob] = pick(r, CX3), [d, s, L] = seg43(r, p), ans = s;
      const w = wy(ans, [[s + 1, '環形首尾相連，個數＝段數，不用加 1。'], [s - 1, '環形沒有兩端，不用減 1。']]);
      return o('tp-ring', `${th}一圈長 ${L} 米，每隔 ${d} 米${v}一${cl}${ob}。共要${v}幾${cl}？`, ans, '圍成一圈，起點和終點是同一處。',
        `${L}÷${d}＝${s} 段；環形的${cl}數＝段數＝${ans}。`, ks(w), `${L}/${d}`, [], { why: w, svg: roadSvg(Math.min(s, 20), 'circle') });
    },
    /* ring, find the gap */
    (r, p) => {
      const th = pick(r, RING3), [, v, cl, ob] = pick(r, CX3), d = pick(r, D3), n = N(r, p, 4, 20), L = d * n;
      const w = wy(d, [[L % (n - 1) === 0 ? L / (n - 1) : 0, '環形的間隔數就是個數，不用減 1。'], [L % (n + 1) === 0 ? L / (n + 1) : 0, '環形的間隔數就是個數，不用加 1。']]);
      return o('tp-ringgap', `${th}一圈長 ${L} 米，${v}了 ${n} ${cl}${ob}，相鄰兩${cl}相隔幾米？`, d, '環形：有幾個就有幾個間隔。',
        `${n} ${cl}就是 ${n} 個間隔；${L}÷${n}＝${d} 米。`, ks(w), `${L}/${n}`, [], { why: w, svg: roadSvg(Math.min(n, 20), 'circle') });
    },
    /* both sides, new settings */
    (r, p) => {
      const [road, v, cl, ob] = pick(r, CX3), [d, s, L] = seg43(r, p, 4), ans = 2 * (s + 1);
      const w = wy(ans, [[s + 1, '兩旁都要，要乘 2。'], [2 * s, '兩端都有，每旁還要加 1。']]);
      return o('tp-sides', `${L} 米長的${road}，兩旁每隔 ${d} 米各${v}一${cl}${ob}，兩端都${v}。共要${v}幾${cl}？`, ans, '先算一旁，再算兩旁。',
        `${L}÷${d}＝${s} 段；一旁 ${s}＋1＝${s + 1} ${cl}；兩旁 ${s + 1}×2＝${ans} ${cl}。`, ks(w), `(${L}/${d}+1)*2`, [], { why: w, svg: roadSvg(Math.min(s, 20), 'both') });
    });
  const verify43b = q => {
    let m;
    if ((m = /^(\d+) 米長的.+，每隔 (\d+) 米.一.+，兩端都.。共要.幾/.exec(q.q))) { let c = 0; for (let x = 0; x <= +m[1]; x += +m[2]) c++; return String(c); }
    if ((m = /^(\d+) 米長的.+，每隔 (\d+) 米.一.+，只在一端.，另一端不.。共要.幾/.exec(q.q))) { let c = 0; for (let x = 0; x < +m[1]; x += +m[2]) c++; return String(c); }
    if ((m = /^(\d+) 米長的.+，兩端都.+，共.了 (\d+) .，相鄰兩.相隔幾米/.exec(q.q))) { for (let d = 1; d <= +m[1]; d++) if (d * (+m[2] - 1) === +m[1]) return String(d); return 'none'; }
    if ((m = /^.+旁.了 (\d+) .+（兩端都有），共有幾個間隔/.exec(q.q))) return String(+m[1] - 1);
    if ((m = /^.+一圈長 (\d+) 米，每隔 (\d+) 米.一.+。共要.幾/.exec(q.q))) { let c = 0; for (let x = 0; x < +m[1]; x += +m[2]) c++; return String(c); }
    if ((m = /^.+一圈長 (\d+) 米，.了 (\d+) .+，相鄰兩.相隔幾米/.exec(q.q))) { for (let d = 1; d <= +m[1]; d++) if (d * +m[2] === +m[1]) return String(d); return 'none'; }
    if ((m = /^(\d+) 米長的.+，兩旁每隔 (\d+) 米各.一.+，兩端都.。共要.幾/.exec(q.q))) { let c = 0; for (let x = 0; x <= +m[1]; x += +m[2]) c += 2; return String(c); }
    return verify43(q);
  };

  WQOly.register({
    id: 'p4-3', grade: 4, n: 3, title: '植樹進階', icon: '🌳',
    card: { motto: '看兩端、看圍圈', example: '圍圈：棵數＝段數', art: art43 },
    lesson: [
      { t: 'show', say: '20 米長的路，每 5 米種一棵，兩端都種。', scene: { w: 'rowplace', p: { segments: 4, ends: 'both', span: 5, unit: '米' } } },
      { t: 'predict', say: '路分成 4 段。', ask: '兩端都種，共種幾棵？', options: ['4', '5', '6'], answer: '5', scene: { w: 'rowplace', p: { segments: 4, ends: 'both', span: 5, unit: '米' }, still: true }, reveal: '兩端都種，棵數比段數多 1。' },
      { t: 'do', say: '把樹種滿每個位置。', scene: { w: 'rowplace', p: { segments: 4, ends: 'both', span: 5, unit: '米' } } },
      { t: 'do', say: '這次一端不種，看看要幾棵。', scene: { w: 'rowplace', p: { segments: 4, ends: 'one', span: 5, unit: '米' } } },
      { t: 'predict', say: '環形的路，分成 6 段。', ask: '要種幾棵？', options: ['5', '6', '7'], answer: '6', scene: { w: 'rowplace', p: { segments: 6, circle: true, span: 5, unit: '米' }, still: true }, reveal: '首尾相連，棵數＝段數！' },
      { t: 'do', say: '把樹種滿這圈路。', scene: { w: 'rowplace', p: { segments: 6, circle: true, span: 5, unit: '米' } } },
      { t: 'try', say: '先看兩端，再算。', scene: { w: 'rowplace', p: { segments: 5, ends: 'both', span: 6, unit: '米' }, still: true },
        q: { stem: '30 米長的路，每隔 6 米種一棵，兩端都種。共種幾棵？', options: ['5', '6', '7'], answer: '6', hint: '先算有幾段，兩端都種要加 1。', why: { 5: '30÷6＝5 是段數，兩端都種還要加 1。', 7: '7 加多了，段數是 5，棵數是 5＋1。' } } },
      { t: 'card' }
    ],
    gens: g43, verify: verify43b
  });

  /* ======================================================================= p4-4 握手與組合 =================================== */
  const c2 = n => n * (n - 1) / 2;
  const art44 = '<svg viewBox="0 0 120 80"><g stroke="#c6a2ff" stroke-width="2"><path d="M60 8L22 34M60 8L98 34M60 8L38 58M60 8L82 58M22 34L98 34M22 34L38 58M22 34L82 58M98 34L38 58M98 34L82 58M38 58L82 58" fill="none" opacity=".55"/></g><g fill="#3ee6d0"><circle cx="60" cy="8" r="6"/><circle cx="22" cy="34" r="6"/><circle cx="98" cy="34" r="6"/><circle cx="38" cy="58" r="6"/><circle cx="82" cy="58" r="6"/></g><rect x="14" y="62" width="92" height="16" rx="8" fill="#ff8fc7"/><text x="60" y="70" text-anchor="middle" dominant-baseline="central" font-size="11" font-weight="900" fill="#0b1030">5×4÷2＝10</text></svg>';
  const g44 = {
    A: [
      (r, p) => {
        const n = N(r, p, 3, 10), ans = c2(n);
        const w = wy(ans, [[n * (n - 1), '每次握手被算了兩次，要除以 2。'], [n * n, '不用和自己握手，每人只和另外的人握。'], [c2(n + 1), '人數多算了一個。']]);
        return o('hs-hand', `${n} 個人見面，每兩個人握手一次。共握手幾次？`, ans, '每人要和幾個人握手？', `每人握 ${n - 1} 次，${n}×${n - 1}＝${n * (n - 1)}；每次算了兩遍，÷2＝${ans}。`, ks(w), `${n}*(${n}-1)/2`, [], { why: w });
      },
      (r, p) => {
        const n = N(r, p, 3, 10), ans = c2(n);
        const w = wy(ans, [[n * (n - 1), '每場比賽被算了兩次，要除以 2。'], [n - 1, '那只是其中一隊要踢的場數。'], [n * n, '一隊不會和自己踢。']]);
        return o('hs-league', `${n} 隊足球隊作單循環賽，每兩隊賽一場。共賽幾場？`, ans, '每隊要踢幾場？', `每隊踢 ${n - 1} 場，${n}×${n - 1}＝${n * (n - 1)}；每場算了兩遍，÷2＝${ans}。`, ks(w), `${n}*(${n}-1)/2`, [], { why: w });
      },
      (r, p) => {
        const n = N(r, p, 3, 10), ans = c2(n);
        const w = wy(ans, [[n * (n - 1), '每條線被算了兩次，要除以 2。'], [n * (n - 1) / 2 + n, '點不能連自己，不用加 ' + n + '。'], [n, '每個點都連好幾條線。']]);
        return o('hs-line', `紙上畫 ${n} 個點，任何三點不在同一直線。每兩點連一條線，共連幾條？`, ans, '每個點連到其他幾個點？', `每點連 ${n - 1} 條，${n}×${n - 1}＝${n * (n - 1)}；每條算了兩遍，÷2＝${ans}。`, ks(w), `${n}*(${n}-1)/2`, [], { why: w });
      },
      (r, p) => {
        const n = N(r, p, 3, 10), T = c2(n);
        const w = wy(n, [[T, '那是握手的次數，題目問人數。'], [n - 1, '少數了一個人。'], [n + 1, '多數了一個人。']]);
        return o('hs-back', `一班同學互相握手一次，共握了 ${T} 次。有幾位同學？`, n, '試試 3、4、5……人各握幾次。', `${n} 人握 ${n}×${n - 1}÷2＝${T} 次，所以有 ${n} 位同學。`, ks(w), '', [], { why: w });
      }
    ],
    B: [
      (r, p) => {
        const a = N(r, p, 3, 6), b = ri(r, 3, 6), ans = c2(a) + c2(b);
        const w = wy(ans, [[c2(a + b), '男女之間不握手，要分開算。'], [a * b, '男女之間不握手。'], [c2(a)+ b, '女生之間也要用「人數×(人數−1)÷2」。']]);
        return o('hs-groups', `${a} 位男生和 ${b} 位女生。男生之間、女生之間各自握手一次，男女之間不握手。共握手幾次？`, ans, '男生和女生分開算，再加起來。', `男生 ${a}×${a - 1}÷2＝${c2(a)}；女生 ${b}×${b - 1}÷2＝${c2(b)}；${c2(a)}＋${c2(b)}＝${ans}。`, ks(w), `${a}*(${a}-1)/2+${b}*(${b}-1)/2`, [], { why: w });
      },
      (r, p) => {
        const n = N(r, p, 3, 9), ans = c2(n) + n;
        const w = wy(ans, [[c2(n), `新來的人還要和 ${n} 個人握手。`], [n, `那只是新來的人握的 ${n} 次。`], [c2(n + 1) * 2, '每次握手不用算兩遍。']]);
        return o('hs-extra', `${n} 個人互相握手一次後，又來了 1 個人，他和每人握手一次。現在一共握手幾次？`, ans, '先算原來的，再算新來的。', `原來 ${n}×${n - 1}÷2＝${c2(n)} 次；新來的握 ${n} 次；${c2(n)}＋${n}＝${ans}。`, ks(w), `${n}*(${n}-1)/2+${n}`, [], { why: w });
      },
      (r, p) => {
        const a = ri(r, 2, 4), b = N(r, p, 3, 8), ans = a * b + c2(a);
        const w = wy(ans, [[a * b, '老師之間也互相握手。'], [c2(a + b), '同學之間不握手。'], [a * b + a, '老師之間是 ' + a + '×' + (a - 1) + '÷2，不是 ' + a + '。']]);
        return o('hs-mix', `${a} 位老師和 ${b} 位同學。每位老師和每位同學握手一次，老師之間也互相握手一次。共握手幾次？`, ans, '分兩部分：老師和同學、老師和老師。', `老師和同學 ${a}×${b}＝${a * b}；老師之間 ${a}×${a - 1}÷2＝${c2(a)}；${a * b}＋${c2(a)}＝${ans}。`, ks(w), `${a}*${b}+${a}*(${a}-1)/2`, [], { why: w });
      }
    ]
  };
  const verify44 = q => {
    let m;
    const h = n => { let c = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) c++; return c; };
    if ((m = /^(\d+) 個人見面，每兩個人握手一次/.exec(q.q)) || (m = /^(\d+) 隊足球隊作單循環賽/.exec(q.q)) || (m = /^紙上畫 (\d+) 個點/.exec(q.q))) return String(h(+m[1]));
    if ((m = /^一班同學互相握手一次，共握了 (\d+) 次/.exec(q.q))) { for (let n = 2; n <= 60; n++) if (h(n) === +m[1]) return String(n); return 'none'; }
    if ((m = /^(\d+) 位男生和 (\d+) 位女生。/.exec(q.q))) return String(h(+m[1]) + h(+m[2]));
    if ((m = /^(\d+) 個人互相握手一次後，又來了 1 個人/.exec(q.q))) return String(h(+m[1] + 1));
    if ((m = /^(\d+) 位老師和 (\d+) 位同學。/.exec(q.q))) { let c = h(+m[1]); for (let i = 0; i < +m[1]; i++) for (let j = 0; j < +m[2]; j++) c++; return String(c); }
    return null;
  };

  /* ---- R3.31 variety: extra settings for 握手與組合 ---- */
  const CX4 = [['同學', '握手'], ['朋友', '碰杯'], ['小朋友', '擊掌'], ['鄰居', '打招呼'], ['乒乓球選手', '比賽'], ['象棋選手', '對弈'], ['隊員', '擊掌']];
  const LK4 = [['村莊', '路', '修', '條', '個'], ['小島', '橋', '建', '座', '個'], ['城市', '鐵路', '鋪', '條', '個'], ['學校', '電話線', '拉', '條', '間'], ['營地', '小徑', '開', '條', '個']];
  const GP4 = [['大人', '小孩'], ['教練', '球員'], ['老師', '家長'], ['廚師', '侍應'], ['醫生', '護士'], ['紅隊', '藍隊']];
  const ACT4 = ['握手', '碰杯', '擊掌'];
  const ptsSvg = (n, mode) => {
    let sv = '';
    if (mode === 'line') {
      sv = '<line x1="12" y1="26" x2="228" y2="26" stroke="#c3cbf7" stroke-width="2.4" stroke-linecap="round"/>';
      for (let i = 0; i < n; i++) sv += `<circle cx="${22 + i * (196 / Math.max(1, n - 1))}" cy="26" r="5" fill="#3ee6d0"/>`;
      return `<svg viewBox="0 0 240 52" role="img" aria-label="直線上有 ${n} 個點">${sv}</svg>`;
    }
    for (let i = 0; i < n; i++) { const a = -Math.PI / 2 + i / n * 2 * Math.PI; sv += `<circle cx="${120 + Math.cos(a) * 34}" cy="${46 + Math.sin(a) * 34}" r="5" fill="#3ee6d0"/>`; }
    return `<svg viewBox="0 0 240 92" role="img" aria-label="${n} 個點">${sv}</svg>`;
  };
  g44.A.push(
    /* the same handshake idea in other settings */
    (r, p) => {
      const n = N(r, p, 3, 10), ans = c2(n), [w, a] = pick(r, CX4);
      const wr = wy(ans, [[n * (n - 1), '每一次被算了兩次，要除以 2。'], [n * n, '一位不會和自己' + a + '。'], [c2(n + 1), '人數多算了一個。']]);
      return o('hs-hand', `${n} 位${w}，每兩位${a}一次。共${a}幾次？`, ans, '每位要和幾位' + a + '？', `每位${a} ${n - 1} 次，${n}×${n - 1}＝${n * (n - 1)}；每次算了兩遍，÷2＝${ans}。`, ks(wr), `${n}*(${n}-1)/2`, [], { why: wr });
    },
    /* links between places */
    (r, p) => {
      const n = N(r, p, 3, 10), ans = c2(n), [pl, lk, vb, cl, pc] = pick(r, LK4);
      const wr = wy(ans, [[n * (n - 1), '每條被算了兩次，要除以 2。'], [n - 1, '那只是從一個地方出發要連的數目。'], [n, '每個地方都連好幾條。']]);
      return o('hs-link', `${n} ${pc}${pl}，每兩${pc}${pl}之間${vb}一${cl}${lk}。共要${vb}幾${cl}？`, ans, '每個地方要連到幾個地方？', `每個連 ${n - 1} ${cl}，${n}×${n - 1}＝${n * (n - 1)}；每${cl}算了兩遍，÷2＝${ans}。`, ks(wr), `${n}*(${n}-1)/2`, [], { why: wr, svg: ptsSvg(n, 'circle') });
    },
    /* points and segments */
    (r, p) => {
      const n = N(r, p, 3, 10), ans = c2(n), k = Math.floor(r() * 3);
      const q = k === 0 ? `直線上有 ${n} 個點，以任意兩點為端點，共可得到幾條線段？` : k === 1 ? `圓周上有 ${n} 個點，每兩點連一條線段，共可連幾條？` : `一條直線上有 ${n} 個點，圖中共有幾條線段（長短都算）？`;
      const wr = wy(ans, [[n * (n - 1), '每條線段被算了兩次，要除以 2。'], [n - 1, '那只是相鄰兩點之間的線段。'], [n, '線段比點多得多。']]);
      return o('hs-seg', q, ans, '每個點可以和其他幾個點連成線段？', `每點連 ${n - 1} 條，${n}×${n - 1}＝${n * (n - 1)}；每條算了兩遍，÷2＝${ans}。`, ks(wr), `${n}*(${n}-1)/2`, [], { why: wr, svg: ptsSvg(n, k === 1 ? 'circle' : 'line') });
    },
    /* back to the number of people */
    (r, p) => {
      const n = N(r, p, 3, 10), T = c2(n), [w, a] = pick(r, CX4);
      const wr = wy(n, [[T, '那是次數，題目問人數。'], [n - 1, '少數了一位。'], [n + 1, '多數了一位。']]);
      return o('hs-back', `有些${w}，每兩位${a}一次，共${a}了 ${T} 次。有幾位${w}？`, n, '試試 3、4、5……位各' + a + '幾次。', `${n} 位${a} ${n}×${n - 1}÷2＝${T} 次，所以有 ${n} 位。`, ks(wr), '', [], { why: wr });
    },
    /* each person */
    (r, p) => {
      const n = N(r, p, 3, 10), [w, a] = pick(r, CX4), ans = n - 1;
      const wr = wy(ans, [[n, '一位不會和自己' + a + '。'], [c2(n), '那是全部人合共的次數。'], [n - 2, '只扣掉自己，不用再扣。']]);
      return o('hs-each', `${n} 位${w}互相${a}一次。每位要${a}幾次？`, ans, '不用和自己' + a + '。', `除了自己，還有 ${n}－1＝${ans} 位，所以每位要${a} ${ans} 次。`, ks(wr), `${n}-1`, [], { why: wr });
    },
    /* add everybody's count */
    (r, p) => {
      const n = N(r, p, 3, 10), [w, a] = pick(r, CX4), ans = n * (n - 1);
      const wr = wy(ans, [[c2(n), '這是實際的次數，題目問的是把大家的次數加起來。'], [n - 1, '那只是一位的次數。'], [n * n, '每位只和其他的人' + a + '。']]);
      return o('hs-double', `${n} 位${w}互相${a}一次，每位各${a}了 ${n - 1} 次。把大家的次數全加起來是多少？`, ans, '每位 ' + (n - 1) + ' 次，有 ' + n + ' 位。', `${n}×${n - 1}＝${ans}。每一次被兩個人各算了一次，所以實際次數是 ${ans}÷2＝${ans / 2}。`, ks(wr), `${n}*(${n}-1)`, [], { why: wr });
    });
  g44.B.push(
    /* two groups, within-group only */
    (r, p) => {
      const a = N(r, p, 3, 6), b = ri(r, 3, 6), [g1, g2] = pick(r, GP4), ac = pick(r, ACT4), ans = c2(a) + c2(b);
      const wr = wy(ans, [[c2(a + b), g1 + '和' + g2 + '之間不' + ac + '，要分開算。'], [a * b, g1 + '和' + g2 + '之間不' + ac + '。'], [c2(a) + b, g2 + '之間也要用「人數×(人數−1)÷2」。']]);
      return o('hs-groups', `${a} 位${g1}和 ${b} 位${g2}。${g1}之間、${g2}之間各自${ac}一次，${g1}和${g2}之間不${ac}。共${ac}幾次？`, ans, g1 + '和' + g2 + '分開算，再加起來。',
        `${g1} ${a}×${a - 1}÷2＝${c2(a)}；${g2} ${b}×${b - 1}÷2＝${c2(b)}；${c2(a)}＋${c2(b)}＝${ans}。`, ks(wr), `${a}*(${a}-1)/2+${b}*(${b}-1)/2`, [], { why: wr });
    },
    /* two groups, across + one group inside */
    (r, p) => {
      const a = ri(r, 2, 4), b = N(r, p, 3, 8), [g1, g2] = pick(r, GP4), ac = pick(r, ACT4), ans = a * b + c2(a);
      const wr = wy(ans, [[a * b, g1 + '之間也互相' + ac + '。'], [c2(a + b), g2 + '之間不' + ac + '。'], [a * b + a, g1 + '之間是 ' + a + '×' + (a - 1) + '÷2，不是 ' + a + '。']]);
      return o('hs-mix', `${a} 位${g1}和 ${b} 位${g2}。每位${g1}和每位${g2}${ac}一次，${g1}之間也互相${ac}一次。共${ac}幾次？`, ans, '分兩部分：不同組之間、' + g1 + '之間。',
        `${g1}和${g2} ${a}×${b}＝${a * b}；${g1}之間 ${a}×${a - 1}÷2＝${c2(a)}；${a * b}＋${c2(a)}＝${ans}。`, ks(wr), `${a}*${b}+${a}*(${a}-1)/2`, [], { why: wr });
    },
    /* how many more times after k newcomers */
    (r, p) => {
      const n = N(r, p, 3, 9), k = ri(r, 1, 2), [w, a] = pick(r, CX4), ans = c2(n + k) - c2(n);
      const wr = wy(ans, [[c2(n + k), '那是加入後的總次數，要減去原來的。'], [k * n, k > 1 ? '新來的人彼此之間也要' + a + '。' : '再想想新來的人要和幾位' + a + '。'], [n, '新來的人要和所有人' + a + '，包括其他新來的人。']]);
      return o('hs-more', `${n} 位${w}互相${a}一次。再多 ${k} 位${w}加入，也和所有人各${a}一次，共增加多少次？`, ans, '加入後的次數減去原來的次數。',
        `原來 ${n}×${n - 1}÷2＝${c2(n)} 次；加入後 ${n + k} 位共 ${n + k}×${n + k - 1}÷2＝${c2(n + k)} 次；${c2(n + k)}－${c2(n)}＝${ans} 次。`, ks(wr), `${n + k}*(${n + k}-1)/2-${n}*(${n}-1)/2`, [], { why: wr });
    },
    /* some people did not come */
    (r, p) => {
      const n = N(r, p, 4, 10), k = ri(r, 1, 2), [w, a] = pick(r, CX4), m = n - k, ans = c2(m);
      const wr = wy(ans, [[c2(n), '沒來的人不能' + a + '，要用實際來的人數。'], [m, '那是來了多少位，不是次數。'], [c2(n) - k, '少了的次數不是只減 ' + k + '，要重新算。']]);
      return o('hs-absent', `${n} 位${w}本來要互相${a}一次，有 ${k} 位沒有來。實際共${a}幾次？`, ans, '先算實際來了幾位。', `來了 ${n}－${k}＝${m} 位；${m}×${m - 1}÷2＝${ans} 次。`, ks(wr), `(${n}-${k})*(${n}-${k}-1)/2`, [], { why: wr });
    },
    /* every pair twice (home and away, or two directions) */
    (r, p) => {
      const n = N(r, p, 3, 10), ans = n * (n - 1), k = Math.floor(r() * 4), sp = pick(r, ['足球', '籃球', '排球', '乒乓球']);
      const q = k === 0 ? `${n} 隊${sp}隊作雙循環賽，每兩隊互相作客各賽一場。共賽幾場？` : k === 1 ? `${n} 位同學互相送卡片，每人送給其他每位同學各一張。共送出幾張卡片？` : k === 2 ? `${n} 位朋友的群組，每人向其他每位朋友各傳一則短訊。共傳了幾則短訊？` : `${n} 位小朋友交換禮物，每人送給其他每位各一份。共送出幾份禮物？`;
      const wr = wy(ans, [[c2(n), '每兩個之間有兩個方向（兩場、兩張），不用除以 2。'], [n - 1, '那只是一位的數目。'], [n * n, '一位不會送給自己。']]);
      return o('hs-dbl', q, ans, '每個方向都要算一次。', `每位對其他 ${n - 1} 位各一次，${n}×${n - 1}＝${ans}；兩個方向各算，不用除以 2。`, ks(wr), `${n}*(${n}-1)`, [], { why: wr });
    });
  const verify44b = q => {
    let m;
    const h = n => { let c = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) c++; return c; };
    if ((m = /^(\d+) 位[^和，。]+，每兩位.+一次。共.+幾次？$/.exec(q.q))) return String(h(+m[1]));
    if ((m = /^(\d+) [個間].+，每兩[個間].+之間.一.+。共要.幾/.exec(q.q))) return String(h(+m[1]));
    if ((m = /^(?:直線上有|圓周上有|一條直線上有) (\d+) 個點/.exec(q.q))) return String(h(+m[1]));
    if ((m = /^有些.+，每兩位.+一次，共.+了 (\d+) 次。有幾位/.exec(q.q))) { for (let n = 2; n <= 60; n++) if (h(n) === +m[1]) return String(n); return 'none'; }
    if ((m = /^(\d+) 位[^和，。]+互相.+一次。每位要.+幾次？$/.exec(q.q))) return String(+m[1] - 1);
    if ((m = /^(\d+) 位[^和，。]+互相.+一次，每位各.+了 (\d+) 次。把大家/.exec(q.q))) return String(+m[1] * +m[2]);
    if ((m = /^(\d+) 位(.+)和 (\d+) 位(.+)。每位\2和每位\4.+一次，\2之間也互相/.exec(q.q))) { let c = h(+m[1]); for (let i = 0; i < +m[1]; i++) for (let j = 0; j < +m[3]; j++) c++; return String(c); }
    if ((m = /^(\d+) 位(.+)和 (\d+) 位(.+)。\2之間、\4之間各自.+一次，.+不.+。共.+幾次/.exec(q.q))) return String(h(+m[1]) + h(+m[3]));
    if ((m = /^(\d+) 位.+互相.+一次。再多 (\d+) 位.+加入，也和所有人各.+一次，共增加多少次/.exec(q.q))) return String(h(+m[1] + +m[2]) - h(+m[1]));
    if ((m = /^(\d+) 位.+本來要互相.+一次，有 (\d+) 位沒有來。實際共/.exec(q.q))) return String(h(+m[1] - +m[2]));
    if ((m = /^(\d+) 隊.+隊作雙循環賽，每兩隊互相作客各賽一場/.exec(q.q)) || (m = /^(\d+) 位同學互相送卡片，每人送給其他每位同學各一張/.exec(q.q)) || (m = /^(\d+) 位朋友的群組，每人向其他每位朋友各傳一則短訊/.exec(q.q)) || (m = /^(\d+) 位小朋友交換禮物，每人送給其他每位各一份/.exec(q.q))) return String(2 * h(+m[1]));
    return verify44(q);
  };

  WQOly.register({
    id: 'p4-4', grade: 4, n: 4, title: '握手與組合', icon: '🤝',
    card: { motto: '每人握手再除 2', example: '5 人：5×4÷2＝10', art: art44 },
    lesson: [
      { t: 'show', say: '4 個人見面，每兩個人握手一次。', scene: { w: 'dotgraph', p: { n: 4 } } },
      { t: 'predict', say: '想一想：一個人要握手。', ask: '他要和幾個人握手？', options: ['3', '4', '5'], answer: '3', scene: { w: 'dotgraph', p: { n: 4 }, still: true }, reveal: '不用和自己握手，所以是 3 個人。' },
      { t: 'do', say: '連一連，每對人握手一次。', scene: { w: 'dotgraph', p: { n: 4 } } },
      { t: 'predict', say: '4 個人各握 3 次，4×3＝12。', ask: '12 裏，每次握手被數了幾次？', options: ['1', '2', '4'], answer: '2', scene: { w: 'dotgraph', p: { n: 4 }, still: true }, reveal: '一次握手有兩個人，被數兩次，所以要 ÷2。' },
      { t: 'do', say: '5 個人：連滿所有的線。', scene: { w: 'dotgraph', p: { n: 5 } } },
      { t: 'show', say: '5×4＝20，÷2＝10 次。', scene: { w: 'dotgraph', p: { n: 5 } } },
      { t: 'try', say: '用同一個方法，答答看。', scene: { w: 'dotgraph', p: { n: 6 }, still: true },
        q: { stem: '6 個人見面，每兩個人握手一次。共握手幾次？', options: ['15', '30', '36'], answer: '15', hint: '每人握 5 次，別忘了 ÷2。', why: { 30: '30 是 6×5，每次握手被算了兩次。', 36: '6×6 多算了和自己握手。' } } },
      { t: 'card' }
    ],
    gens: g44, verify: verify44b
  });

  /* ======================================================================= p4-5 盈虧問題 ===================================== */
  const IT5 = [['糖', '粒'], ['貼紙', '張'], ['書籤', '張'], ['彈珠', '粒']];
  const art45 = '<svg viewBox="0 0 120 80"><rect x="8" y="8" width="64" height="20" rx="5" fill="#3ee6d0"/><rect x="72" y="8" width="30" height="20" rx="5" fill="none" stroke="#ff8fc7" stroke-width="2.4" stroke-dasharray="5 4"/><rect x="8" y="34" width="64" height="20" rx="5" fill="#ffc94a"/><rect x="72" y="34" width="20" height="20" rx="5" fill="none" stroke="#ff8fc7" stroke-width="2.4" stroke-dasharray="5 4"/><rect x="14" y="60" width="92" height="16" rx="8" fill="#ff8fc7"/><text x="60" y="68" text-anchor="middle" dominant-baseline="central" font-size="11" font-weight="900" fill="#0b1030">差 ÷ 每人差</text></svg>';
  /* a: per-person amount (first plan), g: extra per person in the second plan; n people */
  const mk5 = (r, p) => { const n = N(r, p, 3, 12), g = ri(r, 1, 3), a = ri(r, 1, 10 - g); return { n, g, a, b: a + g }; };
  const g45 = {
    A: [
      (r, p) => {
        const { n, g, a, b } = mk5(r, p), x = ri(r, 1, g * n - 1), y = g * n - x, [it, u] = pick(r, IT5), alt = Math.abs(x - y) / g;
        const w = wy(n, [[x + y, '那是兩種分法相差的總數，還要除以每人相差的數目。'], [Number.isInteger(alt) ? alt : 0, '一多一少，要把兩個數加起來，不是相減。']]);
        return o('lw-basic', `把一些${it}分給小朋友。每人分 ${a} ${u}，多 ${x} ${u}；每人分 ${b} ${u}，少 ${y} ${u}。有幾位小朋友？`, n, '兩種分法一共差多少？每人差多少？',
          `一多一少，相差 ${x}＋${y}＝${x + y}；每人差 ${b}－${a}＝${g}；${x + y}÷${g}＝${n} 位。`, ks(w), `(${x}+${y})/(${b}-${a})`, [],
          { why: w, svg: bsvg([{ l: `每${a}`, p: [[a * n, 'a', `每人${a}`], [x, 'd', `多${x}`]] }, { l: `每${b}`, p: [[b * n - y, 'b', `每人${b}`], [y, 'd', `少${y}`, 1]] }]) });
      },
      (r, p) => {
        const { n, g, a, b } = mk5(r, p), x = g * n, [it, u] = pick(r, IT5);
        const w = wy(n, [[x, `${x} 是多出來的${it}數目，還要除以每人相差的數目。`], [x * g, '要除以每人相差的，不是乘。']]);
        return o('lw-exact', `把一些${it}分給小朋友。每人分 ${a} ${u}，多 ${x} ${u}；每人分 ${b} ${u}，剛好分完。有幾位小朋友？`, n, '多分幾次才剛好用完多出來的？',
          `每人多分 ${b}－${a}＝${g}，多出的 ${x} 要分完：${x}÷${g}＝${n} 位。`, ks(w), `${x}/${b - a}`, [],
          { why: w, svg: bsvg([{ l: `每${a}`, p: [[a * n, 'a', `每人${a}`], [x, 'd', `多${x}`]] }, { l: `每${b}`, p: [[b * n, 'b', `每人${b}`]] }]) });
      }
    ],
    B: [
      /* both surplus: subtract */
      (r, p) => {
        const { n, g, a, b } = mk5(r, p), y = ri(r, 1, 10), x = y + g * n, [it, u] = pick(r, IT5);
        const w = wy(n, [[x - y, `${x}－${y}＝${x - y} 是相差的總數，還要除以每人相差的數目。`], [(x + y) % g === 0 ? (x + y) / g : 0, '兩次都多，要相減，不是相加。']]);
        return o('lw-both', `把一些${it}分給小朋友。每人分 ${a} ${u}，多 ${x} ${u}；每人分 ${b} ${u}，也多 ${y} ${u}。有幾位小朋友？`, n, '兩次都有剩，差距是兩個剩數的差。',
          `都多：${x}－${y}＝${x - y}；每人差 ${g}；${x - y}÷${g}＝${n} 位。`, ks(w), `(${x}-${y})/${b - a}`, [],
          { why: w, svg: bsvg([{ l: `每${a}`, p: [[a * n, 'a', `每人${a}`], [x, 'd', `多${x}`]] }, { l: `每${b}`, p: [[b * n, 'b', `每人${b}`], [y, 'd', `多${y}`]] }]) });
      },
      /* both deficit: subtract */
      (r, p) => {
        const { n, g, a, b } = mk5(r, p), x = ri(r, 1, 10), y = x + g * n, [it, u] = pick(r, IT5);
        const w = wy(n, [[y - x, `${y}－${x}＝${y - x} 是相差的總數，還要除以每人相差的數目。`], [(x + y) % g === 0 ? (x + y) / g : 0, '兩次都少，要相減，不是相加。']]);
        return o('lw-short', `把一些${it}分給小朋友。每人分 ${a} ${u}，少 ${x} ${u}；每人分 ${b} ${u}，也少 ${y} ${u}。有幾位小朋友？`, n, '兩次都不夠，差距是兩個缺數的差。',
          `都少：${y}－${x}＝${y - x}；每人差 ${g}；${y - x}÷${g}＝${n} 位。`, ks(w), `(${y}-${x})/${b - a}`, [], { why: w });
      },
      /* ask the total: one extra step after the number of children */
      (r, p) => {
        const { n, g, a, b } = mk5(r, p), x = ri(r, 1, g * n - 1), y = g * n - x, [it, u] = pick(r, IT5), tot = a * n + x;
        const w = wy(tot, [[n, '那是小朋友的人數，題目問' + it + '一共有幾' + u + '。'], [b * n, `每人 ${b} ${u}還少 ${y} ${u}，這不是${it}的數目。`], [a * n, `每人 ${a} ${u}之後還多 ${x} ${u}。`]]);
        return o('lw-total', `把一些${it}分給小朋友。每人分 ${a} ${u}，多 ${x} ${u}；每人分 ${b} ${u}，少 ${y} ${u}。${it}一共有幾${u}？`, tot, '先求有幾位小朋友。',
          `${x}＋${y}＝${x + y}，÷${g}＝${n} 位；${it}共 ${a}×${n}＋${x}＝${tot} ${u}。`, ks(w), `${a}*(${x}+${y})/${b - a}+${x}`, [],
          { why: w, svg: bsvg([{ l: `每${a}`, p: [[a * n, 'a', `每人${a}`], [x, 'd', `多${x}`]] }, { l: `每${b}`, p: [[b * n - y, 'b', `每人${b}`], [y, 'd', `少${y}`, 1]] }]) });
      }
    ]
  };
  const verify45 = q => {
    let m;
    if ((m = /^把一些.+分給小朋友。每人分 (\d+) .，多 (\d+) .；每人分 (\d+) .，少 (\d+) .。(有幾位小朋友|.+一共有幾.)？$/.exec(q.q))) {
      const a = +m[1], x = +m[2], b = +m[3], y = +m[4];
      for (let n = 1; n <= 200; n++) if (a * n + x === b * n - y) return String(/有幾位/.test(m[5]) ? n : a * n + x);
      return 'none';
    }
    if ((m = /^把一些.+分給小朋友。每人分 (\d+) .，多 (\d+) .；每人分 (\d+) .，剛好分完/.exec(q.q))) { for (let n = 1; n <= 200; n++) if (+m[1] * n + +m[2] === +m[3] * n) return String(n); return 'none'; }
    if ((m = /^把一些.+分給小朋友。每人分 (\d+) .，多 (\d+) .；每人分 (\d+) .，也多 (\d+) ./.exec(q.q))) { for (let n = 1; n <= 200; n++) if (+m[1] * n + +m[2] === +m[3] * n + +m[4]) return String(n); return 'none'; }
    if ((m = /^把一些.+分給小朋友。每人分 (\d+) .，少 (\d+) .；每人分 (\d+) .，也少 (\d+) ./.exec(q.q))) { for (let n = 1; n <= 200; n++) if (+m[1] * n - +m[2] === +m[3] * n - +m[4]) return String(n); return 'none'; }
    return null;
  };
  const sc45a = { w: 'bars', p: { rows: [{ label: '每5', segs: [{ u: 5, rep: 5, c: 'a' }, solid(6, 'd', '多6')] }, { label: '每7', segs: [{ u: 7, rep: 4, c: 'b' }, solid(3, 'b', '3'), { u: 4, c: 'd', dashed: true, text: '少4' }] }] } };
  const gap10 = { rows: [{ label: '差', segs: [solid(10, 't', '10')] }, { label: '份', segs: [{ u: 2, rep: 1, c: 'd', edit: true, target: 5, min: 1, max: 7 }] }] };
  WQOly.register({
    id: 'p4-5', grade: 4, n: 5, title: '盈虧問題', icon: '🍬',
    card: { motto: '差÷每人差', example: '多 6、少 4：差 10', art: art45 },
    lesson: [
      { t: 'show', say: '每人分 5 粒，多 6 粒。每人分 7 粒，少 4 粒。', scene: Object.assign({ still: true }, sc45a) },
      { t: 'show', say: '兩種分法，一共差 6＋4＝10 粒。', scene: { w: 'bars', p: { rows: [{ label: '多', segs: [solid(6, 'd', '6'), solid(4, 'b', '4')] }, { label: '差', segs: [solid(10, 't', '10')] }] }, still: true } },
      { t: 'predict', say: '每人多分 2 粒，一共多用 10 粒。', ask: '有幾位小朋友？', options: ['2', '5', '10'], answer: '5', scene: { w: 'bars', p: gap10, still: true }, reveal: '10 粒裏有 5 個 2，所以有 5 位。' },
      { t: 'do', say: '把「2」拉到和 10 一樣長。', scene: { w: 'bars', p: gap10 } },
      { t: 'show', say: '5 位小朋友。糖有 5×5＋6＝31 粒。', scene: Object.assign({ still: true }, sc45a) },
      { t: 'do', say: '每人分 3 粒多 8，分 5 粒多 2。8－2＝6，每人差 2，拉到一樣長。', scene: { w: 'bars', p: { rows: [{ label: '差', segs: [solid(6, 't', '6')] }, { label: '份', segs: [{ u: 2, rep: 1, c: 'd', edit: true, target: 3, min: 1, max: 5 }] }] } } },
      { t: 'try', say: '一多一少，把兩個數加起來。', scene: { w: 'bars', p: { rows: [{ label: '差', segs: [solid(8, 't', '8')] }, { label: '份', segs: [{ u: 2, rep: 1, c: 'd', edit: true, target: 4, min: 1, max: 5 }] }] }, still: true },
        q: { stem: '每人分 4 粒，多 6 粒；每人分 6 粒，少 2 粒。有幾位小朋友？', options: ['2', '4', '8'], answer: '4', hint: '6＋2 是相差的總數，每人差 2。', why: { 8: '8 是相差的總數，還要除以每人差的 2。', 2: '一多一少要相加，不是相減。' } } },
      { t: 'card' }
    ],
    gens: g45, verify: verify45
  });
})();

;
/* 小五 · 5 units (finished). p5-4 = 真假推理, p5-5 = 容斥原理 (two circles only), per 設計書「研究後修訂」.
   Tools: cycle, bars, sortcards + the dedicated g5_venn (defined at the top of this file). */
/* ---- g5_venn（小五 p5-5 容斥專用教具）：兩個重疊圓圈（青＝A、金＝B、重疊＝粉紅），把人物卡拖入「只 A／兩樣都／只 B／都不是」。
   p: {aName:'跳繩', bName:'游泳', cards:[{e:'🧒', n:'小明', zone:'a'|'ab'|'b'|'n'}…]}  達標＝全部卡放對；放錯會彈回。
   鍵盤：卡片聚焦後按 1–4 放進對應區（1 只A、2 兩樣都、3 只B、4 都不是）；或點選卡片再點區域／下方按鈕。
   mode 'show' 且 p.formula !== false：不出卡盤，示範 A＋B－重疊＝合共。 ---------------------------------------------------------------- */
if (typeof WQOlyWidgets !== 'undefined') (function () {
  'use strict';
  const { el, txt, fit, burst, runner, drag, keys, place, toPt, C } = WQOlyWidgets;
  const sfx = (api, n) => { try { api && api.sfx && api.sfx(n); } catch (_) { /* */ } };
  const changed = api => { try { api.onChange && api.onChange(); } catch (_) { /* */ } };
  const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
  const easeBack = t => { const c = 1.9; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); };
  const ZONES = ['a', 'ab', 'b', 'n'];
  const ZC = { a: [C.aqua, C.aquaD], ab: [C.pink, C.pinkD], b: [C.gold, C.goldD], n: [C.violet, C.violetD] };
  const DEF = [['🧒', '小明', 'a'], ['👧', '小美', 'ab'], ['🧑', '阿強', 'b'], ['👩', '家欣', 'a'], ['🧔', '大偉', 'ab'], ['👦', '阿傑', 'n'], ['👴', '爺爺', 'b'], ['👵', '嫲嫲', 'a']];
  let uid = 0;
  WQOlyWidgets.make('g5_venn', { mount(host, p, api) {
    const show = p.mode === 'show', aN = p.aName || '跳繩', bN = p.bName || '游泳', id = 'gv' + (++uid);
    const raw = (p.cards && p.cards.length ? p.cards : DEF.map(d => ({ e: d[0], n: d[1], zone: d[2] }))).slice(0, 12);
    const run = runner(api); const names = { a: '只' + aN, ab: '兩樣都', b: '只' + bN, n: '都不是' };
    const cntOf = z => raw.filter(c => c.zone === z).length;
    const A = cntOf('a') + cntOf('ab'), B = cntOf('b') + cntOf('ab'), AB = cntOf('ab'), T = A + B - AB;
    let trayR, svg, W, H, cards, tokens, sel, geo, legend, msg, solved, chips, timers = [], trayG, tray, slots, shown;
    const later = (f, ms) => { const t = setTimeout(f, ms); timers.push(t); };
    function zoneAt(pt) {
      const dA = Math.hypot(pt.x - geo.cA, pt.y - geo.cy) <= geo.r, dB = Math.hypot(pt.x - geo.cB, pt.y - geo.cy) <= geo.r;
      if (dA && dB) return 'ab'; if (dA) return 'a'; if (dB) return 'b';
      return pt.x >= geo.vx && pt.x <= geo.vx + geo.vw && pt.y >= geo.vy && pt.y <= geo.vy + geo.vh ? 'n' : null;
    }
    function slotList(z) {
      const m = 11 * geo.ts, g = geo, out = [];
      const ok = (x, y) => {
        const a = Math.hypot(x - g.cA, y - g.cy), b = Math.hypot(x - g.cB, y - g.cy);
        if (z === 'a') return a < g.r - m && b > g.r + m * .6;
        if (z === 'b') return b < g.r - m && a > g.r + m * .6;
        if (z === 'ab') return a < g.r - m * .8 && b < g.r - m * .8;
        return a > g.r + m * .7 && b > g.r + m * .7 && x > g.vx + 16 && x < g.vx + g.vw - 16 && y > g.vy + (g.side ? 16 : 34) && y < g.vy + g.vh - 16 && !(g.side ? (x < g.vx + 74 && y > g.vy + g.vh - 36) : (Math.abs(x - (g.vx + g.vw / 2)) < 34 && y > g.vy + g.vh - 36));
      };
      for (let y = g.vy + 30; y < g.vy + g.vh; y += 13) for (let x = g.vx + 12; x < g.vx + g.vw; x += 13) if (ok(x, y)) out.push([x, y]);
      /* greedy pick: spacing 27, start near the zone's visual centre */
      const c = z === 'a' ? [g.cA - g.r * .4, g.cy] : z === 'b' ? [g.cB + g.r * .4, g.cy] : z === 'ab' ? [(g.cA + g.cB) / 2, g.cy] : [g.vx + g.vw - 34, g.vy + g.vh - 34];
      out.sort((p1, p2) => Math.hypot(p1[0] - c[0], p1[1] - c[1]) - Math.hypot(p2[0] - c[0], p2[1] - c[1]));
      let pick = [];
      for (const f of [1, .88, .76, .66]) { pick = []; for (const q of out) { if (pick.every(r => Math.hypot(r[0] - q[0], r[1] - q[1]) >= 24 * geo.ts * f)) pick.push(q); } if (pick.length >= cntOf(z)) break; }
      let k = 0; while (pick.length < 14) { pick.push([c[0] + (k % 3 - 1) * 20 * geo.ts, c[1] + (Math.floor(k / 3) - 1) * 20 * geo.ts]); k++; }
      return pick;
    }
    function build() {
      run.cancel(); timers.forEach(clearTimeout); timers = []; solved = false; sel = null; cards = []; tokens = []; chips = null; shown = {};
      ({ svg, W, H } = fit(host));
      svg.setAttribute('aria-label', `兩個圈圈：${aN}和${bN}，重疊的是兩樣都愛`);
      const legendH = show ? 0 : 52, fH = show ? 60 : 0;
      const free = H - 16 - legendH - (show ? 0 : 12) - fH - (show ? 6 : 0), n = raw.length;
      let vx = 8, vy = 8, vw = W - 16, vh, horiz = false, tx, ty, tw, th;
      if (show) vh = free;
      else {
        const trayW = W - 16, perRow = Math.max(1, Math.floor(trayW / 63)), need = Math.ceil(n / perRow) * 73 + 4, trayH = Math.min(need, free * .5);
        vh = free - trayH - 6;
        if (vh < 150) { horiz = true; vw = Math.round(W * .62); vh = free; tx = vx + vw + 8; ty = vy; tw = W - 8 - tx; th = free; }
        else { tx = 8; ty = vy + vh + 6; tw = trayW; th = trayH; }
      }
      const need = 16 + 19 * Math.max(aN.length, bN.length), rTop = Math.min((vh - 64) / 2, vw / 2.85 - 4), rSide = Math.min((vh - 16) / 2, (vw - 2 * need) / 2.85), side = rSide >= Math.max(30, rTop * 1.12);
      const r = Math.max(30, side ? rSide : rTop), cy = side ? vy + vh / 2 : vy + 34 + r, mid = vx + vw / 2;
      geo = { vx, vy, vw, vh, r, cy, side, cA: mid - r * .425, cB: mid + r * .425, ts: clamp(r / 62, .8, 1.5) };
      /* frame = 都不是 */
      el('rect', { x: vx, y: vy, width: vw, height: vh, rx: 16, fill: 'rgba(255,255,255,.05)', stroke: C.line, 'stroke-width': 2.5, 'stroke-dasharray': '7 6' }, svg);
      if (side) txt(svg, vx + 14, vy + vh - 15, '都不是', { size: 14, fill: C.muted, weight: 800, anchor: 'start' }); else txt(svg, mid, vy + vh - 13, '都不是', { size: 14, fill: C.muted, weight: 800 });
      const defs = el('defs', {}, svg), cp = el('clipPath', { id: id + 'c' }, defs); el('circle', { cx: geo.cA, cy, r }, cp);
      el('circle', { cx: geo.cA, cy, r, fill: C.aqua, 'fill-opacity': .2, stroke: C.aqua, 'stroke-width': 3.5 }, svg);
      el('circle', { cx: geo.cB, cy, r, fill: C.gold, 'fill-opacity': .2, stroke: C.gold, 'stroke-width': 3.5 }, svg);
      el('circle', { cx: geo.cB, cy, r, fill: C.pink, 'fill-opacity': .42, 'clip-path': `url(#${id}c)` }, svg);
      el('circle', { cx: geo.cA, cy, r, fill: 'none', stroke: C.aqua, 'stroke-width': 3.5 }, svg);
      if (side) { txt(svg, geo.cA - r - 8, cy, aN, { size: 19, fill: C.aqua, weight: 900, anchor: 'end' }); txt(svg, geo.cB + r + 8, cy, bN, { size: 19, fill: C.gold, weight: 900, anchor: 'start' }); }
      else { txt(svg, geo.cA - r * .4, vy + 19, aN, { size: 19, fill: C.aqua, weight: 900 }); txt(svg, geo.cB + r * .4, vy + 19, bN, { size: 19, fill: C.gold, weight: 900 }); }
      slots = {}; ZONES.forEach(z => { slots[z] = slotList(z); });
      /* legend (also big tap targets) */
      legend = {};
      if (!show) {
        const lw = (W - 16 - 18) / 4, ly = H - 8 - 52;
        ZONES.forEach((z, k) => {
          const g = el('g', { class: 'r80-sb', role: 'button', 'aria-label': `${k + 1} ${names[z]}` }, svg), x = 8 + k * (lw + 6);
          const rc = el('rect', { x, y: ly, width: lw, height: 52, rx: 14, fill: C.card2, stroke: ZC[z][0], 'stroke-width': 3 }, g);
          txt(g, x + lw / 2, ly + 16, `${k + 1} ${names[z]}`, { size: 15, fill: ZC[z][0], weight: 900 });
          const ct = txt(g, x + lw / 2, ly + 38, '0', { size: 22, fill: C.text, weight: 900 });
          g.style.cursor = 'pointer'; g.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); if (sel) attempt(sel, z, true); });
          keys(g, { act: () => { if (sel) attempt(sel, z, true); } });
          legend[z] = { rc, ct };
        });
        msg = txt(svg, W / 2, H - 8 - 52 - 9, '', { size: 16, fill: C.bad, weight: 800 });
        /* tap a region of the picture to drop the selected card there */
        svg.addEventListener('click', ev => { if (!sel || solved) return; const z = zoneAt(toPt(svg, ev)); if (z) attempt(sel, z, true); });
      }
      trayR = { x: tx, y: ty, w: tw, h: th };
      /* tray + cards */
      trayG = el('g', {}, svg);
      if (!show) {
        let best = null;
        for (let cols = 1; cols <= 7; cols++) { const rows = Math.ceil(n / cols), s = Math.min(1, (tw / cols - 3) / 60, (th / rows - 3) / 70); if (!best || s > best.s + 1e-6) best = { cols, rows, s }; }
        const { cols, rows, s } = best, pw = tw / cols, ph = Math.min(th / rows, 76);
        const y0 = ty + (th - ph * rows) / 2;
        raw.forEach((c, i) => {
          const o = { ...c, i, s, x: tx + pw * (i % cols) + pw / 2, y: y0 + ph * Math.floor(i / cols) + ph / 2, placed: false };
          o.hx = o.x; o.hy = o.y; makeCard(o); cards.push(o);
        });
      } else {
        raw.forEach((c, i) => { const o = { ...c, i }; tokens.push(addToken(o, false)); shown[i] = true; });
        drawChips(tx = 8, ty = vy + vh + 6 + 0, vw);
      }
      counts();
    }
    function makeCard(o) {
      const g = el('g', { class: 'r80-chip', role: 'button', 'aria-label': `${o.n}：${o.zone === 'a' ? '只' + aN : o.zone === 'b' ? '只' + bN : o.zone === 'ab' ? '兩樣都' : '都不是'}？按 1 至 4 放區` }, svg);
      o.g = g;
      const inner = el('g', {}, g);
      el('rect', { x: -30, y: -31, width: 60, height: 70, rx: 14, fill: 'rgba(0,0,0,.28)' }, inner);
      o.body = el('rect', { x: -30, y: -35, width: 60, height: 70, rx: 14, fill: C.card2, stroke: C.line, 'stroke-width': 2.5 }, inner);
      txt(inner, 0, -19, o.e, { size: 26, emoji: true });
      txt(inner, 0, 3, o.n || '', { size: 13, fill: C.text, weight: 800 });
      const has = { a: o.zone === 'a' || o.zone === 'ab', b: o.zone === 'b' || o.zone === 'ab' };
      [['a', -15, C.aqua, aN], ['b', 15, C.gold, bN]].forEach(([k, x, col, nm]) => {
        el('rect', { x: x - 13, y: 12, width: 26, height: 18, rx: 9, fill: has[k] ? col : 'none', stroke: has[k] ? col : C.muted, 'stroke-width': 1.8, 'stroke-dasharray': has[k] ? null : '3 3', opacity: has[k] ? 1 : .6 }, inner);
        txt(inner, x, 21.5, nm[0], { size: 13, fill: has[k] ? C.ink : C.muted, weight: 900, opacity: has[k] ? 1 : .7 });
      });
      place(g, o.x, o.y, o.s);
      let ox = 0, oy = 0;
      drag(g, svg, {
        start(pt) { if (solved || o.placed) return false; svg.appendChild(g); ox = pt.x - o.x; oy = pt.y - o.y; g.classList.add('lift'); return {}; },
        move(pt) { o.x = pt.x - ox; o.y = pt.y - oy; place(g, o.x, o.y, o.s * 1.12); const z = zoneAt({ x: o.x, y: o.y }); hot(z); },
        async end(pt, ctx, e, moved) { g.classList.remove('lift'); hot(null); if (!moved) return; attempt(o, zoneAt({ x: o.x, y: o.y }), false); },
        tap() { g.classList.remove('lift'); select(o); }
      });
      g.setAttribute('tabindex', '0');
      g.addEventListener('keydown', e => {
        if (e.key >= '1' && e.key <= '4') { e.preventDefault(); attempt(o, ZONES[+e.key - 1], true); }
        else if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); select(o); }
      });
    }
    function hot(z) { for (const k in legend) legend[k].rc.setAttribute('stroke-width', k === z ? 7 : 3); }
    function select(o) {
      if (solved || o.placed) return; sel = sel === o ? null : o; sfx(api, 'tap');
      cards.forEach(c => c.body && c.body.setAttribute('stroke', c === sel ? C.gold : C.line)); cards.forEach(c => c.body && c.body.setAttribute('stroke-width', c === sel ? 5 : 2.5));
    }
    function say(s) { if (!msg) return; msg.textContent = s; later(() => { if (msg.textContent === s) msg.textContent = ''; }, 1500); }
    function addToken(o, pop) {
      const k = tokens.filter(t => t.z === o.zone).length, [x, y] = slots[o.zone][k] || slots[o.zone][0];
      const g = el('g', { 'pointer-events': 'none' }, svg); el('circle', { r: 12 * geo.ts, fill: C.card2, stroke: ZC[o.zone][0], 'stroke-width': 2.5 }, g); txt(g, 0, 1, o.e, { size: 15 * geo.ts, emoji: true });
      place(g, x, y); const t = { g, x, y, z: o.zone, o };
      if (pop && !api.reduced) run.tween(260, v => place(g, x, y, Math.max(.01, v)), easeBack);
      return t;
    }
    async function attempt(o, z, snap) {
      if (solved || o.placed || o.busy) return;
      if (!z) { await goHome(o); return; }
      if (z !== o.zone) {
        sfx(api, 'bad'); say(`${o.n} 不屬於「${names[z]}」，再看看圈圈`);
        o.busy = true; const x0 = o.x;
        if (!api.reduced) await run.tween(260, t => place(o.g, x0 + Math.sin(t * Math.PI * 4) * 7 * (1 - t), o.y, o.s)); 
        o.busy = false; await goHome(o); return;
      }
      o.placed = true; o.busy = true; sel = null; cards.forEach(c => { c.body.setAttribute('stroke', C.line); c.body.setAttribute('stroke-width', 2.5); });
      const k = tokens.filter(t => t.z === z).length, [sx, sy] = slots[z][k] || slots[z][0], x0 = o.x, y0 = o.y; svg.appendChild(o.g);
      await run.tween(300, t => { o.x = x0 + (sx - x0) * t; o.y = y0 + (sy - y0) * t - Math.sin(t * Math.PI) * 14; place(o.g, o.x, o.y, o.s + (.42 - o.s) * t); });
      o.g.remove(); o.busy = false; tokens.push(addToken(o, true)); sfx(api, 'pop'); counts();
      if (cards.every(c => c.placed)) win(); changed(api);
    }
    async function goHome(o) { const x0 = o.x, y0 = o.y; o.busy = true; await run.tween(220, t => { o.x = x0 + (o.hx - x0) * t; o.y = y0 + (o.hy - y0) * t; place(o.g, o.x, o.y, o.s); }); o.busy = false; o.x = o.hx; o.y = o.hy; place(o.g, o.x, o.y, o.s); }
    function counts() { if (show) return; ZONES.forEach(z => { legend[z].ct.textContent = String(tokens.filter(t => t.z === z).length); }); }
    function win() {
      solved = true; sfx(api, 'good'); burst(svg, (geo.cA + geo.cB) / 2, geo.cy, api);
      const g = el('g', {}, trayG), cx = trayR.x + trayR.w / 2, cyT = trayR.y + trayR.h / 2;
      txt(g, cx, cyT - 28, `${aN}＋${bN}－重疊`, { size: 14, fill: C.muted, weight: 800 });
      txt(g, cx, cyT, `${A} ＋ ${B} － ${AB}`, { size: 20, fill: C.text, weight: 900 });
      txt(g, cx, cyT + 30, `＝ ${T}`, { size: 30, fill: C.gold, weight: 900 });
    }
    function drawChips(x, y, w) {
      const items = [[aN, A, C.aqua], [bN, B, C.gold], ['重疊', AB, C.pink], ['合共', T, C.violet]], ops = ['＋', '－', '＝'], cw = Math.min(78, (w - 3 * 20) / 4), tot = cw * 4 + 60, x0 = x + (w - tot) / 2;
      chips = [];
      items.forEach((it, i) => {
        const cx = x0 + i * (cw + 20) + cw / 2, cyc = y + 28, g = el('g', {}, svg);
        const rc = el('rect', { x: cx - cw / 2, y: cyc - 26, width: cw, height: 54, rx: 14, fill: C.card2, stroke: it[2], 'stroke-width': 3 }, g);
        const lab = txt(g, cx, cyc - 11, it[0], { size: 14, fill: it[2], weight: 900 });
        const num = txt(g, cx, cyc + 12, '？', { size: 24, fill: C.muted, weight: 900 });
        chips.push({ rc, num, lab, v: it[1], col: it[2] });
        if (i < 3) txt(svg, cx + cw / 2 + 10, cyc + 1, ops[i], { size: 24, fill: C.text, weight: 900 });
      });
    }
    function light(i) { const c = chips[i]; c.num.textContent = String(c.v); c.num.setAttribute('fill', C.text); c.rc.setAttribute('fill', c.col); c.rc.setAttribute('fill-opacity', .85); c.num.setAttribute('fill', C.ink); c.lab.setAttribute('fill', C.ink); sfx(api, 'pop'); }
    build();
    return {
      check: () => show ? !!(chips && chips.every(c => c.num.textContent !== '？')) : cards.every(c => c.placed),
      reset() { build(); changed(api); },
      destroy() { run.destroy(); timers.forEach(clearTimeout); },
      async demo() {
        build(); if (!(await run.sleep(350))) return false;
        if (show) {
          tokens.forEach(t => t.g.remove()); tokens = [];
          const put = async zs => { for (const o of raw.map((c, i) => ({ ...c, i })).filter(c => zs.includes(c.zone))) { tokens.push(addToken(o, true)); sfx(api, 'pop'); if (!(await run.sleep(170))) return false; } return true; };
          if (!(await put(['a', 'ab']))) return false; light(0); if (!(await run.sleep(350))) return false;
          if (!(await put(['b']))) return false; light(1); if (!(await run.sleep(350))) return false;
          light(2); tokens.filter(t => t.z === 'ab').forEach(t => t.g.firstChild.setAttribute('stroke-width', 5)); if (!(await run.sleep(450))) return false;
          if (!(await put(['n']))) return false; light(3); sfx(api, 'good'); burst(svg, (geo.cA + geo.cB) / 2, geo.cy, api); changed(api); return true;
        }
        for (const o of cards) { if (o.placed) continue; svg.appendChild(o.g); await attempt(o, o.zone, true); if (!(await run.sleep(180))) return false; }
        changed(api); return true;
      }
    };
  } });
})();

(function () {
  'use strict';
  const { o, N, ri, pick, shuffle } = WQOly.helpers;
  /* o() + keep only sensible non-negative whole-number wrong answers / why keys (a negative count is never a child's wrong answer) */
  const O = (...a) => { const q = o(...a); if (q.why) { const w = {}; for (const k in q.why) if (/^\d+$/.test(k)) w[k] = q.why[k]; q.why = w; } q.w = q.w.filter(v => typeof v !== 'number' || (isFinite(v) && v >= 0)); return q; };

  /* ---- small svg helpers ------------------------------------------------------------------------------------------------ */
  const AQ = '#3ee6d0', GO = '#ffc94a', TX = '#c3cbf7', PK = '#ff8fc7', VI = '#c6a2ff', BG = '#1b2160';
  const text = (x, y, s, sz, col, extra) => `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="${sz || 14}" font-weight="900" fill="${col || TX}"${extra || ''}>${s}</text>`;
  /* k labelled dots around a ring (people passing a ball, last-digit wheel) */
  const ring = (labels, hl, aria) => {
    const k = labels.length, R = k > 6 ? 40 : 36, rr = k > 6 ? 12 : 14; let s = '';
    for (let i = 0; i < k; i++) {
      const a = -Math.PI / 2 + i / k * Math.PI * 2, x = 120 + Math.cos(a) * R * 1.35, y = 55 + Math.sin(a) * R;
      s += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${rr}" fill="${i === hl ? GO : BG}" stroke="${AQ}" stroke-width="2"/>${text(x.toFixed(1), (y + 1).toFixed(1), labels[i], 14, i === hl ? '#3b2600' : TX)}`;
    }
    return `<svg viewBox="0 0 240 110" role="img" aria-label="${aria}">${s}</svg>`;
  };
  /* a repeating strip of small boxes */
  const strip = (arr, times) => {
    const all = []; for (let t = 0; t < times; t++) all.push(...arr);
    const w = Math.min(19, 210 / all.length); let s = '';
    all.forEach((v, i) => { const x = 14 + i * w; s += `<rect x="${x.toFixed(1)}" y="38" width="${(w - 2).toFixed(1)}" height="30" rx="5" fill="${i < arr.length ? 'rgba(62,230,208,.25)' : BG}" stroke="${i < arr.length ? AQ : GO}" stroke-width="1.6"/>${text((x + (w - 2) / 2).toFixed(1), 54, v, 14)}`; });
    return `<svg viewBox="0 0 240 110" role="img" aria-label="重複排列：${arr.join('、')}">${s}${text(226, 53, '…', 18, GO)}</svg>`;
  };
  const CH = ['', '一', '二', '三', '四', '五', '六', '日'];
  const weekSvg = wd => { let s = ''; for (let i = 1; i <= 7; i++) { const x = 20 + (i - 1) * 30; s += `<rect x="${x - 12}" y="38" width="26" height="32" rx="6" fill="${i === wd ? GO : BG}" stroke="${AQ}" stroke-width="1.6"/>${text(x + 1, 54, CH[i], 15, i === wd ? '#3b2600' : TX)}`; } return `<svg viewBox="0 0 240 110" role="img" aria-label="一星期七日，今天星期${CH[wd]}">${s}${text(120, 18, '今天', 12, GO)}</svg>`; };
  const lampSvg = (a, b) => `<svg viewBox="0 0 240 110" role="img" aria-label="紅燈每 ${a} 秒亮，綠燈每 ${b} 秒亮"><circle cx="64" cy="40" r="20" fill="#e5484d" stroke="#fff" stroke-width="2" opacity=".9"/><circle cx="176" cy="40" r="20" fill="#3fb950" stroke="#fff" stroke-width="2" opacity=".9"/>${text(64, 82, '每 ' + a + ' 秒', 15, '#ff9aa2')}${text(176, 82, '每 ' + b + ' 秒', 15, '#8ee8a0')}</svg>`;

  /* ============================================================================================================================ */
  /* ---- p5-1 餘數與週期 ---------------------------------------------------------------------------------------------------- */
  const art51 = '<svg viewBox="0 0 120 80"><circle cx="60" cy="38" r="26" fill="none" stroke="#3ee6d0" stroke-width="3" stroke-dasharray="3 6"/><g font-size="13" font-weight="900" fill="#c3cbf7" text-anchor="middle" dominant-baseline="central"><circle cx="60" cy="12" r="9" fill="#ffc94a"/><text x="60" y="12" fill="#3b2600">1</text><text x="85" y="30">2</text><text x="76" y="62">3</text><text x="44" y="62">4</text><text x="35" y="30">5</text></g><rect x="20" y="66" width="80" height="12" rx="6" fill="#ff8fc7"/><text x="60" y="72" text-anchor="middle" dominant-baseline="central" font-size="10" font-weight="900" fill="#0b1030">17÷5＝3 餘 2</text></svg>';
  const g51 = {
    A: [
      /* a repeating pattern: which number is the n-th? */
      (r, p) => {
        const k = ri(r, 3, 6), pat = shuffle(r, [1, 2, 3, 4, 5, 6, 7, 8, 9]).slice(0, k), n = N(r, p, 8, 150), rem = n % k, ans = pat[(n - 1) % k];
        return O('cyc-seq', `${pat.join('、')}、${pat.join('、')}……一直排下去，第 ${n} 個數是幾？`, ans, `${k} 個一輪，先看有幾整輪。`,
          `${n}÷${k}＝${Math.floor(n / k)} 餘 ${rem}。${rem ? `第 ${n} 個就是這一輪的第 ${rem} 個：${ans}。` : `餘 0 就是一輪的最後一個：${ans}。`}`,
          [pat[rem % k], rem, Math.floor(n / k), pat[(n + k - 2) % k]], '', [],
          { svg: strip(pat, 2), why: { [pat[rem % k]]: '餘數是位置：餘 1 是第 1 個，餘 0 是一輪的最後一個。', [rem]: `餘數 ${rem} 只是位置，要看那個位置上的數。`, [Math.floor(n / k)]: '這是整輪的數目，不是第幾個數。' } });
      },
      /* position inside a round */
      (r, p) => {
        const k = ri(r, 3, 9), n = N(r, p, k + 2, 150), rem = n % k, ans = rem === 0 ? k : rem;
        return O('cyc-pos', `一串珠子每 ${k} 粒為一輪，不斷重複。第 ${n} 粒是那一輪的第幾粒？`, ans, '用除法看餘數。',
          `${n}÷${k}＝${Math.floor(n / k)} 餘 ${rem}。${rem ? `餘 ${rem}，是第 ${rem} 粒。` : `餘 0，剛好是一輪的最後一粒：第 ${k} 粒。`}`,
          [rem === 0 ? 0 : rem + 1, Math.floor(n / k), ans - 1 || ans + 2, k + 1], '', [],
          { svg: ring(Array.from({ length: k }, (_, i) => i + 1), -1, `${k} 粒一輪`), why: { 0: `餘 0 不是第 0 粒，是一輪的最後一粒：第 ${k} 粒。`, [Math.floor(n / k)]: '這是整輪的數目，不是那一輪的第幾粒。', [rem + 1]: '餘 ' + rem + ' 就是第 ' + rem + ' 粒，不用再加 1。' } });
      },
      /* passing a ball round a circle */
      (r, p) => {
        const k = ri(r, 3, 8), n = N(r, p, k + 2, 80), rem = n % k, ans = rem + 1;
        return O('cyc-ball', `${k} 人圍成一圈傳球，從 1 號開始傳 ${n} 次。球在幾號手上？`, ans, '整圈傳回 1 號，只看餘下的次數。',
          `${n}÷${k}＝${Math.floor(n / k)} 餘 ${rem}。傳完整圈回到 1 號，再傳 ${rem} 次，球在 ${ans} 號。`,
          [rem, Math.floor(n / k), ans + 1 > k ? 1 : ans + 1, k], '', [],
          { svg: ring(Array.from({ length: k }, (_, i) => i + 1), 0, `${k} 人圍成一圈，球在 1 號`), why: { [rem]: `餘 ${rem} 是再傳的次數，球要由 1 號再傳 ${rem} 次，到 ${ans} 號。`, [Math.floor(n / k)]: '這是傳了幾整圈，不是球在幾號。' } });
      }
    ],
    B: [
      /* weekday after n days */
      (r, p) => {
        const wd = ri(r, 1, 7), n = N(r, p, 15, 400), rem = n % 7, ans = (wd - 1 + n) % 7 + 1;
        return O('cyc-week', `今天是星期${CH[wd]}。再過 ${n} 日是星期幾？（星期日算 7）`, ans, '一星期 7 日，先看餘下幾日。',
          `${n}÷7＝${Math.floor(n / 7)} 餘 ${rem}。整星期不變，由星期${CH[wd]}再數 ${rem} 日：星期${CH[ans]}，答 ${ans}。`,
          [wd, rem, Math.floor(n / 7), ans % 7 + 1], '', [],
          { svg: weekSvg(wd), why: { [wd]: rem ? `${wd} 是今天，還要再往後數 ${rem} 日。` : '剛好整星期，星期不變，所以答案和今天一樣。', [rem]: `${rem} 只是多出的日數，要由今天往後數。`, [Math.floor(n / 7)]: '這是過了幾個整星期，不是星期幾。' } });
      },
      /* two flashing lamps: least common multiple */
      (r, p) => {
        let a, b, L; for (let i = 0; i < 80; i++) { a = ri(r, 2, 8); b = ri(r, 3, 12); L = a * b / WQOly.gcd(a, b); if (a < b && L <= 72 && L > b) break; }
        if (!(a < b && L > b)) { a = 4; b = 6; L = 12; }
        return O('cyc-lcm', `紅燈每 ${a} 秒亮一次，綠燈每 ${b} 秒亮一次。同時亮後，最少再過幾秒又同時亮？`, L, `找 ${a} 和 ${b} 的最小公倍數。`,
          `${a} 的倍數：${[1, 2, 3, 4].map(k => a * k).join('、')}……；${b} 的倍數：${[1, 2, 3, 4].map(k => b * k).join('、')}……。第一個相同的是 ${L}。`,
          [a * b, a + b, b, L + a], '', [],
          { svg: lampSvg(a, b), why: { [a * b]: `${a} 和 ${b} 有公因數，不用乘到 ${a * b} 那麼大。`, [a + b]: '相加不是共同倍數，要找兩個數都能整除的最小數。', [b]: `${b} 秒時紅燈未必亮，要兩邊都亮才算。` } });
      },
      /* the k-th time they flash together */
      (r, p) => {
        let a, b, L, k; for (let i = 0; i < 80; i++) { a = ri(r, 2, 6); b = ri(r, 3, 10); k = ri(r, 2, 4); L = a * b / WQOly.gcd(a, b); if (a < b && L > b && L * k <= 200) break; }
        if (!(a < b && L > b)) { a = 3; b = 4; L = 12; k = 2; }
        return O('cyc-lcm-k', `紅燈每 ${a} 秒亮、綠燈每 ${b} 秒亮。同時亮後，第 ${k} 次再同時亮，是幾秒後？`, L * k, '先找每隔幾秒同時亮一次。',
          `${a} 和 ${b} 的最小公倍數是 ${L}，每 ${L} 秒同時亮一次。第 ${k} 次：${L}×${k}＝${L * k} 秒。`,
          [L, a * b * k, L * (k - 1), L * k + L], '', [],
          { svg: lampSvg(a, b), why: { [L]: `${L} 秒是第一次同時亮，題目問第 ${k} 次。`, [a * b * k]: `${a}×${b} 不一定是最小公倍數，應先找最小的共同倍數 ${L}。` } });
      }
    ]
  };
  const verify51 = q => {
    let m;
    if ((m = /^([\d、]+)……一直排下去，第 (\d+) 個數是幾？/.exec(q.q))) {
      const d = m[1].split('、'), pat = d.slice(0, d.length / 2), n = +m[2], seq = [];
      while (seq.length < n) seq.push(...pat);
      return seq[n - 1];
    }
    if ((m = /每 (\d+) 粒為一輪，不斷重複。第 (\d+) 粒/.exec(q.q))) { const k = +m[1], n = +m[2]; let pos = 0; for (let i = 0; i < n; i++) pos = pos % k + 1; return String(pos); }
    if ((m = /^(\d+) 人圍成一圈傳球，從 1 號開始傳 (\d+) 次/.exec(q.q))) { const k = +m[1]; let at = 1; for (let i = 0; i < +m[2]; i++) at = at % k + 1; return String(at); }
    if ((m = /^今天是星期(.)。再過 (\d+) 日/.exec(q.q))) { let d = CH.indexOf(m[1]); for (let i = 0; i < +m[2]; i++) d = d % 7 + 1; return String(d); }
    if ((m = /^紅燈每 (\d+) 秒亮一次，綠燈每 (\d+) 秒亮一次/.exec(q.q))) { for (let t = 1; t < 5000; t++) if (t % m[1] === 0 && t % m[2] === 0) return String(t); }
    if ((m = /^紅燈每 (\d+) 秒亮、綠燈每 (\d+) 秒亮。同時亮後，第 (\d+) 次/.exec(q.q))) { let c = 0; for (let t = 1; t < 5000; t++) if (t % m[1] === 0 && t % m[2] === 0 && ++c === +m[3]) return String(t); }
    return null;
  };
  WQOly.register({
    id: 'p5-1', grade: 5, n: 1, title: '餘數與週期', icon: '⏰',
    card: { motto: '看餘數取位置', example: '17÷5＝3 餘 2', art: art51 },
    lesson: [
      { t: 'show', say: '5 人圍成一圈傳球。從 1 號開始，傳 17 次。', scene: { w: 'cycle', p: { n: 5, steps: 17, unit: '次', verb: '傳' }, still: true } },
      { t: 'predict', say: '球傳來傳去，繞了好幾圈。', ask: '球最後在幾號手上？', options: ['2', '3', '4'], answer: '3', scene: { w: 'cycle', p: { n: 5, steps: 17, unit: '次', verb: '傳' }, still: true }, reveal: '3 整圈是 15 次。再傳 2 次，球到 3 號。' },
      { t: 'do', say: '按「一圈」走 3 圈，再按「＋1」走 2 次。', scene: { w: 'cycle', p: { n: 5, steps: 17, unit: '次', verb: '傳' } } },
      { t: 'show', say: '17÷5＝3 餘 2。整圈不用看，只看餘數。', scene: { w: 'cycle', p: { n: 5, steps: 17, unit: '次', verb: '傳' }, still: true } },
      { t: 'predict', say: '這次傳 15 次。', ask: '球最後在幾號手上？', options: ['1', '5', '2'], answer: '1', scene: { w: 'cycle', p: { n: 5, steps: 15, unit: '次', verb: '傳' }, still: true }, reveal: '15÷5＝3 餘 0。剛好整圈，球回到 1 號。' },
      { t: 'do', say: '6 人圍圈，傳 20 次。先走整圈，再走餘下的。', scene: { w: 'cycle', p: { n: 6, steps: 20, unit: '次', verb: '傳' } } },
      { t: 'try', say: '用餘數來答。', scene: { w: 'cycle', p: { n: 4, steps: 11, unit: '次', verb: '傳' }, still: true },
        q: { stem: '4 人圍圈傳球，從 1 號傳 11 次，球在幾號手上？', options: ['3', '4', '2'], answer: '4', hint: '11÷4＝2 餘 3。', why: { 3: '餘 3 是再傳的次數，球要由 1 號再傳 3 次，到 4 號。', 2: '2 是傳了幾整圈，不是球在幾號。' } } },
      { t: 'card' }
    ],
    gens: g51, verify: verify51
  });

  /* ---- p5-2 個位循環 ---------------------------------------------------------------------------------------------------- */
  const CYC = { 2: [2, 4, 8, 6], 3: [3, 9, 7, 1], 7: [7, 9, 3, 1], 8: [8, 4, 2, 6], 9: [9, 1] };
  const BASES = [2, 3, 7, 8, 9];
  const dig = (b, n) => CYC[b][(n - 1) % CYC[b].length];
  const prod = (b, n) => Array(3).fill(b).join('×') + '×…×' + b + `（共 ${n} 個）`;
  const art52 = '<svg viewBox="0 0 120 80"><g font-size="15" font-weight="900" text-anchor="middle" dominant-baseline="central" fill="#c3cbf7"><circle cx="30" cy="30" r="13" fill="#1b2160" stroke="#3ee6d0" stroke-width="2"/><text x="30" y="30">3</text><circle cx="62" cy="30" r="13" fill="#1b2160" stroke="#3ee6d0" stroke-width="2"/><text x="62" y="30">9</text><circle cx="94" cy="30" r="13" fill="#1b2160" stroke="#3ee6d0" stroke-width="2"/><text x="94" y="30">7</text><circle cx="62" cy="60" r="13" fill="#ffc94a" stroke="#c48a00" stroke-width="2"/><text x="62" y="60" fill="#3b2600">1</text></g><path d="M48 60H30V44M94 44V60H76" fill="none" stroke="#ff8fc7" stroke-width="2" stroke-dasharray="3 3"/></svg>';
  const cycSvg = b => ring(CYC[b], -1, `${b} 連乘，個位依次是 ${CYC[b].join('、')}`);
  const g52 = {
    A: [
      (r, p) => {
        const b = pick(r, BASES), n = N(r, p, 5, 100), L = CYC[b], m = L.length, rem = n % m, ans = dig(b, n);
        return O('last-digit', `${b}×${b}×…×${b}（共 ${n} 個），個位是幾？`, ans, `個位 ${L.join('、')} 一直輪流出現。`,
          `個位依次是 ${L.join('、')}，${m} 個一輪。${n}÷${m}＝${Math.floor(n / m)} 餘 ${rem}，${rem ? `取每輪第 ${rem} 個` : '餘 0 取每輪最後一個'}：${ans}。`,
          [L[rem % m], b, L[(rem + 1) % m], L[(rem + m - 1) % m]], '', [],
          { svg: cycSvg(b), why: { [L[rem % m]]: '餘數 ' + rem + (rem ? ' 是第 ' + rem + ' 個' : ' 是 0，要取一輪最後一個') + '，不要多走一格。', [b]: `${b} 是第 1 個個位，要看第 ${rem || m} 個。` } });
      },
      (r, p) => {
        const b = pick(r, BASES), n = N(r, p, 4, 60), L = CYC[b], ans = dig(b, n + 1), d = dig(b, n);
        return O('last-next', `${b}×${b}×…×${b}（共 ${n} 個），個位是 ${d}。再多乘一個 ${b}，個位是幾？`, ans, '看循環裏下一個是什麼。',
          `個位依次是 ${L.join('、')}。${d} 後面是 ${ans}，所以再乘一個 ${b}，個位是 ${ans}。`,
          [d, b, L[(L.indexOf(d) + 2) % L.length], d * b % 10 === ans ? (ans + 1) % 10 : d * b % 10], '', [],
          { svg: cycSvg(b), why: { [d]: `${d} 是現在的個位，再乘一個 ${b} 後會變。`, [b]: `${b} 是乘上去的數，要看新的個位。` } });
      },
      (r, p) => {
        const b = pick(r, BASES), L = CYC[b], m = L.length, j = ri(r, 0, m - 1), t = N(r, p, 2, 12), d = L[j], n = j + 1 + (t - 1) * m;
        return O('last-nth', `${b}×${b}×…×${b} 的個位，第 ${t} 次變成 ${d}。共乘了幾個 ${b}？`, n, '先數一輪有幾個。',
          `個位 ${L.join('、')}，${m} 個一輪。${d} 第一次在第 ${j + 1} 個，之後每隔 ${m} 個再出現：${j + 1}＋${m}×${t - 1}＝${n}。`,
          [m * t, j + 1 + m * t, n - m, n + 1], `${j + 1}+${m}*${t - 1}`, [],
          { svg: cycSvg(b), why: { [m * t]: `${d} 第一次不一定在每輪最後，第一次在第 ${j + 1} 個。`, [n - m]: `再數一輪，${d} 要出現 ${t} 次，才是第 ${t} 次。` } });
      }
    ],
    B: [
      (r, p) => {
        const b = pick(r, BASES), n = N(r, p, 5, 100), c = ri(r, 3, 99), d = dig(b, n), ans = (d + c) % 10;
        return O('last-add', `${b}×${b}×…×${b}（共 ${n} 個）＋ ${c} 的個位是幾？`, ans, '先求連乘的個位，再加上去。',
          `連乘的個位是 ${d}；${c} 的個位是 ${c % 10}。${d}＋${c % 10}＝${d + c % 10}，個位是 ${ans}。`,
          [d, c % 10, (d + c % 10 + 1) % 10, (d * (c % 10)) % 10], '', [],
          { svg: cycSvg(b), why: { [d]: `${d} 只是連乘的個位，還要加上 ${c} 的個位 ${c % 10}。`, [(d * (c % 10)) % 10]: '這題是相加，不是相乘。' } });
      },
      (r, p) => {
        const b1 = pick(r, BASES); let b2 = pick(r, BASES); if (b2 === b1) b2 = BASES[(BASES.indexOf(b1) + 1) % 5];
        const n1 = N(r, p, 5, 80), n2 = N(r, p, 5, 80), d1 = dig(b1, n1), d2 = dig(b2, n2), ans = (d1 + d2) % 10;
        return O('last-two', `${b1}×…×${b1}（共 ${n1} 個）＋ ${b2}×…×${b2}（共 ${n2} 個），和的個位是幾？`, ans, '兩串連乘各求個位，再相加。',
          `第一串個位 ${d1}，第二串個位 ${d2}。${d1}＋${d2}＝${d1 + d2}，個位是 ${ans}。`,
          [d1, d2, (d1 + d2 + 1) % 10, (d1 * d2) % 10], '', [],
          { svg: ring([b1 + '…', b2 + '…'], -1, '兩串連乘'), why: { [d1]: `${d1} 只是第一串的個位，還要加第二串的 ${d2}。`, [(d1 * d2) % 10]: '兩串是相加，不是相乘。' } });
      },
      (r, p) => {
        const b1 = pick(r, BASES); let b2 = pick(r, BASES); if (b2 === b1) b2 = BASES[(BASES.indexOf(b1) + 2) % 5];
        const n1 = N(r, p, 5, 80), n2 = N(r, p, 5, 80), d1 = dig(b1, n1), d2 = dig(b2, n2), ans = (d1 * d2) % 10;
        return O('last-mul', `${b1}×…×${b1}（共 ${n1} 個）乘 ${b2}×…×${b2}（共 ${n2} 個），積的個位是幾？`, ans, '先求兩串的個位，再相乘取個位。',
          `第一串個位 ${d1}，第二串個位 ${d2}。${d1}×${d2}＝${d1 * d2}，個位是 ${ans}。`,
          [d1, d2, (d1 + d2) % 10, d1 * d2], `${d1 * d2}%10`, [],
          { svg: ring([b1 + '…', b2 + '…'], -1, '兩串連乘'), why: { [(d1 + d2) % 10]: '兩串要相乘，不是相加。', [d1 * d2]: `${d1 * d2} 不是個位，只取個位那一位。` } });
      }
    ]
  };
  const verify52 = q => {
    let m;
    const lastOf = (b, n) => String((BigInt(b) ** BigInt(n)) % 10n);
    if ((m = /^(\d)×\d×…×\d（共 (\d+) 個），個位是幾？/.exec(q.q))) return lastOf(m[1], m[2]);
    if ((m = /^(\d)×\d×…×\d（共 (\d+) 個），個位是 (\d)。再多乘一個/.exec(q.q))) return lastOf(m[1], +m[2] + 1);
    if ((m = /^(\d)×\d×…×\d 的個位，第 (\d+) 次變成 (\d)。/.exec(q.q))) { let c = 0; for (let n = 1; n < 5000; n++) if (lastOf(m[1], n) === m[3] && ++c === +m[2]) return String(n); }
    if ((m = /^(\d)×\d×…×\d（共 (\d+) 個）＋ (\d+) 的個位是幾？/.exec(q.q))) return String((+lastOf(m[1], m[2]) + +m[3]) % 10);
    if ((m = /^(\d)×…×\d（共 (\d+) 個）＋ (\d)×…×\d（共 (\d+) 個），和的個位/.exec(q.q))) return String((+lastOf(m[1], m[2]) + +lastOf(m[3], m[4])) % 10);
    if ((m = /^(\d)×…×\d（共 (\d+) 個）乘 (\d)×…×\d（共 (\d+) 個），積的個位/.exec(q.q))) return String((+lastOf(m[1], m[2]) * +lastOf(m[3], m[4])) % 10);
    return null;
  };
  WQOly.register({
    id: 'p5-2', grade: 5, n: 2, title: '個位循環', icon: '🔁',
    card: { motto: '只看個位', example: '3、9、7、1 一輪', art: art52 },
    lesson: [
      { t: 'show', say: '3×3×3×3…，個位會轉圈：3、9、7、1。', scene: { w: 'cycle', p: { n: 4, labels: [3, 9, 7, 1], nth: 4, unit: '個' }, still: true } },
      { t: 'predict', say: '5 個 3 相乘，是 243。', ask: '那 6 個 3 相乘，個位是幾？', options: ['3', '7', '9'], answer: '9', scene: { w: 'cycle', p: { n: 4, labels: [3, 9, 7, 1], nth: 6, unit: '個' }, still: true }, reveal: '個位轉到 1 後回到 3，再到 9。6 個 3 的個位是 9。' },
      { t: 'do', say: '走到第 10 個 3。一圈是 4 個，先按「一圈」。', scene: { w: 'cycle', p: { n: 4, labels: [3, 9, 7, 1], nth: 10, unit: '個', div: true } } },
      { t: 'show', say: '10÷4＝2 餘 2。個位是每輪第 2 個：9。', scene: { w: 'cycle', p: { n: 4, labels: [3, 9, 7, 1], nth: 10, unit: '個', div: true }, still: true } },
      { t: 'predict', say: '8 個 3 相乘。', ask: '8÷4 餘 0，個位是幾？', options: ['3', '1', '9'], answer: '1', scene: { w: 'cycle', p: { n: 4, labels: [3, 9, 7, 1], nth: 8, unit: '個', div: true }, still: true }, reveal: '餘 0 就是一輪的最後一個：1。' },
      { t: 'do', say: '2 的個位是 2、4、8、6。走到第 7 個 2。', scene: { w: 'cycle', p: { n: 4, labels: [2, 4, 8, 6], nth: 7, unit: '個', div: true } } },
      { t: 'try', say: '換成 7 試試。', scene: { w: 'cycle', p: { n: 4, labels: [7, 9, 3, 1], nth: 10, unit: '個', div: true }, still: true },
        q: { stem: '7×7×…×7（共 10 個），個位是幾？', options: ['9', '1', '3'], answer: '9', hint: '7 的個位是 7、9、3、1。', why: { 1: '1 是一輪最後一個，這題餘 2，取第 2 個。', 3: '3 是第 3 個，餘 2 只走到第 2 個。' } } },
      { t: 'card' }
    ],
    gens: g52, verify: verify52
  });

  /* ---- p5-3 抽屜原理 ---------------------------------------------------------------------------------------------------- */
  const art53 = '<svg viewBox="0 0 120 80"><g fill="none" stroke="#3ee6d0" stroke-width="2.4"><rect x="12" y="34" width="44" height="26" rx="5"/><rect x="64" y="34" width="44" height="26" rx="5"/></g><g font-size="14" text-anchor="middle" dominant-baseline="central"><text x="26" y="47">🍎</text><text x="42" y="47">🍎</text><text x="78" y="47">🍎</text><text x="94" y="47">🍎</text><text x="60" y="14">🍎</text></g><rect x="22" y="64" width="76" height="13" rx="6" fill="#ff8fc7"/><text x="60" y="70.5" text-anchor="middle" dominant-baseline="central" font-size="10" font-weight="900" fill="#0b1030">一定有盒 ≥ 3</text></svg>';
  const boxSvg = (n, m, it) => { const w = Math.min(46, 220 / m - 6); let s = ''; for (let i = 0; i < m; i++) { const x = 120 + (i - (m - 1) / 2) * (w + 6) - w / 2; s += `<rect x="${x.toFixed(1)}" y="50" width="${w.toFixed(1)}" height="34" rx="6" fill="rgba(255,255,255,.07)" stroke="${AQ}" stroke-width="2"/>`; } return `<svg viewBox="0 0 240 110" role="img" aria-label="${n} 個${it}，${m} 個盒">${s}${text(120, 20, n + ' 個' + it + ' → ' + m + ' 個盒', 15, GO)}</svg>`; };
  const ballSvg = (cols, k) => { let s = ''; const cc = ['#e5484d', '#ffc94a', '#4aa3ff', '#3fb950', '#ffffff']; cols.forEach((c, i) => { const x = 120 + (i - (cols.length - 1) / 2) * 38; s += `<circle cx="${x}" cy="46" r="14" fill="${cc[i]}" stroke="#0b1030" stroke-width="2"/>`; }); return `<svg viewBox="0 0 240 110" role="img" aria-label="${cols.join('、')}球">${s}${text(120, 84, cols.join(' ') + ' 球', 14, TX)}${text(120, 16, '要 ' + k + ' 個同色', 13, GO)}</svg>`; };
  const COL = ['紅', '黃', '藍', '綠', '白'];
  const g53 = {
    A: [
      (r, p) => {
        const m = ri(r, 2, 6), n = m * ri(r, 1, 6) + ri(r, 1, m - 1) + (r() < .15 ? m : 0), itc = pick(r, [['蘋果', '個'], ['糖', '粒'], ['橙', '個'], ['書', '本']]), it = itc[0], cl = itc[1], s = Math.ceil(n / m), fl = Math.floor(n / m);
        return O('drawer', `把 ${n} ${cl}${it}放進 ${m} 個盒子，最少有一個盒子有幾${cl}？`, s, '先平均分，再看餘下的。',
          `${n}÷${m}＝${fl} 餘 ${n % m}。餘下的要多放一個，所以最少有一盒有 ${fl}＋1＝${s} 個。`,
          [fl, s + 1, n - m, m], '', [], { svg: boxSvg(n, m, it), why: { [fl]: '平均分後還有剩，總有一個盒要多放一個，所以要加 1。', [s + 1]: '餘下的只要多放一個，不用再多加。', [n - m]: '不是拿總數減盒數，要用除法平均分。' } });
      },
      (r, p) => {
        const days = pick(r, [['星期', 7], ['月份', 12]]), n = days[1] === 7 ? N(r, p, 8, 40) : N(r, p, 13, 40), s = Math.ceil(n / days[1]), fl = Math.floor(n / days[1]);
        return O('drawer-cal', `${n} 位同學。每人的出生${days[0] === '星期' ? '日都在星期一至星期日的其中一天' : '月份都在一月至十二月的其中一個'}。最少有幾人在同一個${days[0] === '星期' ? '星期幾' : '月'}出生？`, s, `把 ${days[1]} 個${days[0] === '星期' ? '星期幾' : '月'}當成盒子。`,
          `${n}÷${days[1]}＝${fl} 餘 ${n % days[1]}。${n % days[1] ? `餘下的要多一人：${fl}＋1＝${s}。` : `剛好平均分，最少 ${s} 人。`}`,
          [fl, s + 1, days[1], n - days[1]], '', [], { svg: boxSvg(n, Math.min(days[1], 7), '同學'), why: { [fl]: '還有餘下的人，總有一天（月）要多一人。', [days[1]]: `${days[1]} 是盒子的數目，不是人數。` } });
      }
    ],
    B: [
      (r, p) => {
        const c = N(r, p, 2, 5), k = ri(r, 2, 4), x = ri(r, 6, 15), s = c * (k - 1) + 1, col = COL.slice(0, c);
        return O('drawer-worst', `袋裏有${col.join('、')}球各 ${x} 個。最少取幾個，才一定有 ${k} 個同色？`, s, '想最壞的情況。',
          `最壞：每種顏色都取 ${k - 1} 個，共 ${c}×${k - 1}＝${c * (k - 1)} 個。再取 1 個就一定有 ${k} 個同色：${s}。`,
          [c * (k - 1), s + 1, c * k, k], `${c}*${k - 1}+1`, [], { svg: ballSvg(col, k), why: { [c * (k - 1)]: '這是最壞情況取到的個數，再多取 1 個才一定成功。', [c * k]: `每色取 ${k} 個已經有 ${k} 個同色了，最壞是每色 ${k - 1} 個。` } });
      },
      /* one colour has fewer balls than k-1 */
      (r, p) => {
        const c = N(r, p, 3, 4), k = ri(r, 3, 4), few = ri(r, 1, k - 2), col = COL.slice(0, c), cnt = col.map((_, i) => i === 0 ? few : ri(r, k + 1, 12)), s = cnt.reduce((t, v) => t + Math.min(v, k - 1), 0) + 1;
        return O('drawer-few', `袋裏有${col.map((cc, i) => cc + ' ' + cnt[i] + ' 個').join('、')}的球。最少取幾個，才一定有 ${k} 個同色？`, s, '數量少的顏色，最壞時全部取走。',
          `最壞：${col[0]}球全取（${few} 個），其他每色取 ${k - 1} 個：${few}＋${(c - 1)}×${k - 1}＝${s - 1}。再取 1 個：${s}。`,
          [s - 1, c * (k - 1) + 1, s + 1, c * (k - 1)], '', [], { svg: ballSvg(col, k), why: { [c * (k - 1) + 1]: `${col[0]}球只有 ${few} 個，最壞時取不到 ${k - 1} 個，要全取再算。`, [s - 1]: '這是最壞情況取到的個數，再多取 1 個才一定成功。' } });
      },
      (r, p) => {
        const m = N(r, p, 2, 6), k = ri(r, 2, 6), s = m * (k - 1) + 1, itc = pick(r, [['蘋果', '個'], ['糖', '粒'], ['橙', '個']]), it = itc[0], cl = itc[1];
        return O('drawer-need', `要把${it}放進 ${m} 個盒子，最少要有幾${cl}${it}，才一定有盒子放到 ${k} ${cl}或以上？`, s, '先想每盒都只放 ' + (k - 1) + ' 個。',
          `每盒放 ${k - 1} 個，共 ${m}×${k - 1}＝${m * (k - 1)} 個，還沒有盒到 ${k} 個。再多 1 個：${s}。`,
          [m * (k - 1), m * k, s + 1, k], `${m}*${k - 1}+1`, [], { svg: boxSvg(s, m, it), why: { [m * (k - 1)]: '這是每盒都未到標準的最多個數，再多 1 個才一定成功。', [m * k]: `每盒放 ${k} 個已經到標準了，最壞是每盒 ${k - 1} 個。` } });
      }
    ]
  };
  const verify53 = q => {
    let m;
    if ((m = /^把 (\d+) .+放進 (\d+) 個盒子，最少有一個盒子/.exec(q.q))) { const n = +m[1], k = +m[2]; for (let x = 1; ; x++) if (x * k >= n) return String(x); }
    if ((m = /^(\d+) 位同學。每人的出生.+最少有幾人在同一個(?:星期幾|月)出生/.exec(q.q))) { const n = +m[1], k = /出生月份/.test(q.q) ? 12 : 7; for (let x = 1; ; x++) if (x * k >= n) return String(x); }
    if ((m = /^袋裏有(.+)球各 \d+ 個。最少取幾個，才一定有 (\d+) 個同色/.exec(q.q))) { const c = m[1].split('、').length, k = +m[2]; let worst = 0; for (let i = 0; i < c; i++) worst += k - 1; return String(worst + 1); }
    if ((m = /^袋裏有(.+)的球。最少取幾個，才一定有 (\d+) 個同色/.exec(q.q))) { const k = +m[2], cnt = [...m[1].matchAll(/[^\d、 ]+ (\d+) 個/g)].map(x => +x[1]); let worst = 0; for (const v of cnt) worst += v < k ? v : k - 1; return String(worst + 1); }
    if ((m = /^要把.+放進 (\d+) 個盒子，最少要有幾.+，才一定有盒子放到 (\d+) .或以上/.exec(q.q))) return String((+m[1]) * (m[2] - 1) + 1);
    return null;
  };
  WQOly.register({
    id: 'p5-3', grade: 5, n: 3, title: '抽屜原理', icon: '🗄️',
    card: { motto: '想最壞情況', example: '5 個放 2 盒：至少 3 個', art: art53 },
    lesson: [
      { t: 'show', say: '5 粒糖放進 2 個盒。最少有一盒有幾粒？', scene: { w: 'cycle', p: { n: 2, labels: ['甲', '乙'], nth: 5, unit: '粒', div: true }, still: true } },
      { t: 'predict', say: '輪流派糖：甲、乙、甲、乙……', ask: '派完 5 粒，最多的盒有幾粒？', options: ['2', '3', '4'], answer: '3', scene: { w: 'cycle', p: { n: 2, labels: ['甲', '乙'], nth: 5, unit: '粒', div: true }, still: true }, reveal: '甲 3 粒、乙 2 粒。最少有一盒有 3 粒！' },
      { t: 'do', say: '按「＋1 粒」輪流派，派到第 5 粒。', scene: { w: 'cycle', p: { n: 2, labels: ['甲', '乙'], nth: 5, unit: '粒', div: true } } },
      { t: 'show', say: '5÷2＝2 餘 1。餘下的 1 粒，要多放進一盒。', scene: { w: 'cycle', p: { n: 2, labels: ['甲', '乙'], nth: 5, unit: '粒', div: true }, still: true } },
      { t: 'predict', say: '紅、黃、藍球各有很多。取 3 個。', ask: '一定有 2 個同色嗎？', options: ['一定', '不一定'], answer: '不一定', scene: { w: 'cycle', p: { n: 3, labels: ['紅', '黃', '藍'], nth: 3, unit: '個' }, still: true }, reveal: '可能紅、黃、藍各 1 個。要取 4 個才一定。' },
      { t: 'do', say: '先每色取 1 個，再取第 4 個。', scene: { w: 'cycle', p: { n: 3, labels: ['紅', '黃', '藍'], nth: 4, unit: '個' } } },
      { t: 'try', say: '用除法加 1 來答。', scene: { w: 'cycle', p: { n: 5, nth: 11, unit: '個', div: true }, still: true },
        q: { stem: '把 11 個蘋果放進 5 個盒子，最少有一個盒子有幾個？', options: ['2', '3', '4'], answer: '3', hint: '11÷5＝2 餘 1。', why: { 2: '平均分後還有餘下的 1 個，要多放一盒，所以是 3。', 4: '餘下只有 1 個，多放一個就夠了。' } } },
      { t: 'card' }
    ],
    gens: g53, verify: verify53
  });

  /* ---- p5-4 真假推理 ---------------------------------------------------------------------------------------------------- */
  const art54 = '<svg viewBox="0 0 120 80"><g font-size="22" text-anchor="middle" dominant-baseline="central"><text x="26" y="24">🧒</text><text x="60" y="24">👧</text><text x="94" y="24">🧑</text></g><g font-size="11" font-weight="900" text-anchor="middle" dominant-baseline="central"><rect x="10" y="40" width="32" height="14" rx="7" fill="#3ee6d0"/><text x="26" y="47" fill="#0b1030">真</text><rect x="44" y="40" width="32" height="14" rx="7" fill="#ff8fc7"/><text x="60" y="47" fill="#0b1030">假</text><rect x="78" y="40" width="32" height="14" rx="7" fill="#3ee6d0"/><text x="94" y="47" fill="#0b1030">真</text></g><rect x="10" y="62" width="100" height="14" rx="7" fill="#ffc94a"/><text x="60" y="69" text-anchor="middle" dominant-baseline="central" font-size="10" font-weight="900" fill="#3b2600">假設一個，再檢查</text></svg>';
  const EVENTS = ['打破杯', '偷吃糖', '弄污牆', '踢爛球'];
  const sayText = (s, i) => s.t === 'is' ? `是${s.j}號` : (s.j === i ? '不是我' : `不是${s.j}號`);
  const trueCount = (st, c) => st.reduce((t, s) => t + ((s.t === 'is' ? c === s.j : c !== s.j) ? 1 : 0), 0);
  /* a random culprit puzzle with exactly one consistent culprit */
  const culprit = (r, n, t) => {
    for (let tries = 0; tries < 600; tries++) {
      const st = []; for (let i = 1; i <= n; i++) { if (r() < .55) { let j; do { j = ri(r, 1, n); } while (j === i); st.push({ t: 'is', j }); } else st.push({ t: 'not', j: ri(r, 1, n) }); }
      const ok = []; for (let c = 1; c <= n; c++) if (trueCount(st, c) === t) ok.push(c);
      if (ok.length === 1 && new Set(st.map(s => s.t + s.j)).size >= n - 1) return { st, c: ok[0] };
    }
    return { st: [{ t: 'not', j: 1 }, { t: 'is', j: 1 }, { t: 'is', j: 2 }], c: 1 };
  };
  const faces = n => { let s = ''; const em = ['🧒', '👧', '🧑', '👩', '👦']; for (let i = 0; i < n; i++) { const x = 120 + (i - (n - 1) / 2) * 42; s += `<circle cx="${x}" cy="42" r="17" fill="${BG}" stroke="${AQ}" stroke-width="2"/>${text(x, 43, em[i % 5], 20, TX, ' font-family="Noto Color Emoji,Apple Color Emoji,sans-serif"')}${text(x, 74, (i + 1) + '號', 13, GO)}`; } return `<svg viewBox="0 0 240 110" role="img" aria-label="${n} 位同學">${s}</svg>`; };
  const mkCulprit = (sk, n, t, cond) => (r, p) => {
    const ev = pick(r, EVENTS), { st, c } = culprit(r, n, t);
    const list = []; for (let w = 1; w <= n; w++) list.push(`${w}號${trueCount(st, w)}人`);
    const why = {}; for (let w = 1; w <= n; w++) if (w !== c) why[w] = `若是 ${w} 號，說真話的有 ${trueCount(st, w)} 人，不合條件。`;
    return O(sk, `${n} 位同學中有 1 人${ev}，${cond}。${st.map((s, i) => `${i + 1}號：${sayText(s, i + 1)}。`).join('')}${ev}的是幾號？`, c, '逐個假設是犯人，數數說真話的有幾人。',
      `逐個假設：${list.join('、')}說真話。只有 ${c} 號剛好是 ${t} 人說真話，所以是 ${c} 號。`,
      Object.keys(why).map(Number).concat([c % n + 1]), '', [], { svg: faces(n), why });
  };
  const g54 = {
    A: [
      mkCulprit('tf-liar3', 3, 2, '只有 1 人說謊'),
      mkCulprit('tf-true4', 4, 1, '只有 1 人說真話'),
      (r, p) => {
        const n = N(r, p, 3, 5), v = shuffle(r, Array.from({ length: n }, (_, i) => i + 1));
        return O('tf-liars', `${n} 人各說一句。${v.map((k, i) => `${i + 1}號說有${k}人說謊；`).join('')}到底有幾人說謊？`, n - 1, '每句話的數字都不同，最多一句是真的。',
          `數字都不同，最多 1 句真話，所以至少 ${n - 1} 人說謊。說「${n - 1}人」的人說真話，剛好對：${n - 1} 人。`,
          [n, n - 2 || 1, 1, n + 1].filter(x => x !== n - 1), '', [],
          { svg: faces(n), why: { [n]: `若 ${n} 人全說謊，說「${n} 人說謊」的人就說真話了，矛盾。`, [n - 2 || 1]: `說謊 ${n - 2 || 1} 人就有更多人說真話，但每句數字都不同。` } });
      }
    ],
    B: [
      mkCulprit('tf-two-true', 4, 2, '剛好 2 人說真話'),
      /* statements about each other: how many liars? */
      (r, p) => {
        const NM = ['甲', '乙', '丙'];
        for (let tries = 0; tries < 800; tries++) {
          const st = NM.map((_, i) => { const oth = NM.map((_, j) => j).filter(j => j !== i), k = ri(r, 0, 4);
            if (k <= 1) return { k: 's', j: pick(r, oth), v: k === 0 };
            if (k === 2) return { k: 'd', v: false };
            if (k === 3) return { k: 'd', v: true };
            return { k: 'o' }; });
          const sols = [];
          for (let m = 0; m < 8; m++) {
            const tv = [m & 1, m >> 1 & 1, m >> 2 & 1].map(Boolean);
            const ok = st.every((s, i) => { const oth = [0, 1, 2].filter(j => j !== i); let val;
              if (s.k === 's') val = tv[s.j] === s.v; else if (s.k === 'd') val = oth.every(j => tv[j] === s.v); else val = oth.filter(j => !tv[j]).length === 1;
              return val === tv[i]; });
            if (ok) sols.push(tv);
          }
          if (sols.length === 1) {
            const liars = sols[0].filter(x => !x).length, lines = st.map((s, i) => { const oth = NM.filter((_, j) => j !== i);
              const body = s.k === 's' ? `${NM[s.j]}${s.v ? '說真話' : '說謊'}` : s.k === 'd' ? `${oth[0]}和${oth[1]}都${s.v ? '說真話' : '說謊'}` : `${oth[0]}、${oth[1]}中有一人說謊`;
              return `${NM[i]}：「${body}」`; });
            const why = {}; for (let c = 0; c <= 3; c++) if (c !== liars) why[c] = `假設說謊 ${c} 人，總有一句話對不上。`;
            return O('tf-chain', `甲乙丙各說一句。${lines.join('，')}。說謊的有幾人？`, liars, '假設甲說真話，推下去看有沒有矛盾。',
              `逐個假設甲乙丙是真是假，只有說謊 ${liars} 人，三句話才互相配合。`, Object.keys(why).map(Number), '', [], { svg: faces(3).replace(/(\d)號/g, (m0, d) => NM[d - 1]), why });
          }
        }
        return O('tf-chain', '甲乙丙各說一句。甲：「乙說謊」，乙：「丙說謊」，丙：「甲和乙都說謊」。說謊的有幾人？', 2, '', '', [0, 1, 3], '', [], { svg: faces(3), why: { 0: '總有一句對不上。', 1: '總有一句對不上。' } });
      }
    ]
  };
  const parseTF = q => {
    const m0 = /^(\d) 位同學中有 1 人(.+?)，(只有 1 人說謊|只有 1 人說真話|剛好 2 人說真話)。(.+)的是幾號？$/.exec(q.q); if (!m0) return null;
    const n = +m0[1], tt = m0[3] === '只有 1 人說謊' ? n - 1 : m0[3] === '只有 1 人說真話' ? 1 : 2, body = m0[2] ? q.q.slice(q.q.indexOf('。') + 1) : '';
    const st = [...body.matchAll(/(\d)號：(不是我|不是(\d)號|是(\d)號)。/g)].map(x => ({ i: +x[1], neg: x[2].startsWith('不是'), j: x[2] === '不是我' ? +x[1] : +(x[3] || x[4]) }));
    if (st.length !== n) return null;
    const hits = []; for (let c = 1; c <= n; c++) { let cnt = 0; for (const s of st) if (s.neg ? c !== s.j : c === s.j) cnt++; if (cnt === tt) hits.push(c); }
    return hits.length === 1 ? String(hits[0]) : 'none';
  };
  const verify54 = q => {
    let m;
    if (/位同學中有 1 人/.test(q.q)) return parseTF(q);
    if ((m = /^(\d) 人各說一句。((?:\d號說有\d人說謊；)+)到底/.exec(q.q))) {
      const n = +m[1], vals = [...m[2].matchAll(/說有(\d)人說謊/g)].map(x => +x[1]);
      for (let L = 0; L <= n; L++) { const truth = vals.filter(v => v === L).length; if (n - L === truth) return String(L); }
      return 'none';
    }
    if ((m = /^甲乙丙各說一句。(.+)。說謊的有幾人？$/.exec(q.q))) {
      const parts = [...m[1].matchAll(/(甲|乙|丙)：「([^」]+)」/g)].map(x => ({ who: '甲乙丙'.indexOf(x[1]), s: x[2] })), sols = [];
      for (let mask = 0; mask < 8; mask++) {
        const tv = [0, 1, 2].map(i => !!(mask >> i & 1));
        const ok = parts.every(pt => { const s = pt.s; let val; let mm;
          if ((mm = /^(.)說(真話|謊)$/.exec(s))) val = tv['甲乙丙'.indexOf(mm[1])] === (mm[2] === '真話');
          else if ((mm = /^(.)和(.)都說(真話|謊)$/.exec(s))) val = tv['甲乙丙'.indexOf(mm[1])] === (mm[3] === '真話') && tv['甲乙丙'.indexOf(mm[2])] === (mm[3] === '真話');
          else if ((mm = /^(.)、(.)中有一人說謊$/.exec(s))) val = (tv['甲乙丙'.indexOf(mm[1])] ? 0 : 1) + (tv['甲乙丙'.indexOf(mm[2])] ? 0 : 1) === 1;
          else return false;
          return val === tv[pt.who]; });
        if (ok) sols.push(tv.filter(x => !x).length);
      }
      return sols.length === 1 ? String(sols[0]) : 'none';
    }
    return null;
  };
  const PUZ = [{ id: 'a', label: '甲', emoji: '🧒' }, { id: 'b', label: '乙', emoji: '👧' }, { id: 'c', label: '丙', emoji: '🧑' }];
  WQOly.register({
    id: 'p5-4', grade: 5, n: 4, title: '真假推理', icon: '🕵️',
    card: { motto: '假設一個再檢查', example: '假設他說真話，再對照', art: art54 },
    lesson: [
      { t: 'show', say: '3 人中有 1 人偷吃糖。只有 1 人說謊。', scene: { w: 'sortcards', p: { cards: PUZ, order: ['a', 'c', 'b'], start: ['a', 'b', 'c'] }, still: true } },
      { t: 'show', say: '甲說不是我，乙說是甲，丙說是乙。', scene: { w: 'sortcards', p: { cards: PUZ, order: ['a', 'c', 'b'], start: ['a', 'b', 'c'] }, still: true } },
      { t: 'predict', say: '先假設是甲偷吃。', ask: '這樣有幾人說真話？', options: ['1', '2', '3'], answer: '1', scene: { w: 'sortcards', p: { cards: PUZ, order: ['b', 'a', 'c'], start: ['a', 'b', 'c'] }, still: true }, reveal: '只有乙說真話，排到最左。題目要 2 人說真話，不是甲。' },
      { t: 'do', say: '找出說謊的人，排到最右邊。其他人按甲、丙次序。', scene: { w: 'sortcards', p: { cards: PUZ, order: ['a', 'c', 'b'], start: ['b', 'a', 'c'] } } },
      { t: 'show', say: '假設乙偷吃：甲、丙說真話，乙說謊。剛好 1 人說謊！', scene: { w: 'sortcards', p: { cards: PUZ, order: ['a', 'c', 'b'], start: ['a', 'c', 'b'] }, still: true } },
      { t: 'try', say: '用同一方法。', scene: { w: 'sortcards', p: { cards: PUZ, order: ['a', 'b', 'c'] }, still: true },
        q: { stem: '3 人中 1 人打破杯，只有 1 人說謊。甲：是乙。乙：不是我。丙：是甲。誰打破杯？', options: ['甲', '乙', '丙'], answer: '甲', hint: '逐個假設是犯人，數說謊的有幾人。', why: { 乙: '若是乙，甲說真話、乙和丙說謊，有 2 人說謊。', 丙: '若是丙，甲和丙說謊，有 2 人說謊。' } } },
      { t: 'card' }
    ],
    gens: g54, verify: verify54
  });

  /* ---- p5-5 容斥原理 (two circles only) ----------------------------------------------------------------------------------- */
  const art55 = '<svg viewBox="0 0 120 80"><circle cx="46" cy="36" r="26" fill="rgba(62,230,208,.3)" stroke="#3ee6d0" stroke-width="2.4"/><circle cx="74" cy="36" r="26" fill="rgba(255,201,74,.3)" stroke="#ffc94a" stroke-width="2.4"/><text x="60" y="37" text-anchor="middle" dominant-baseline="central" font-size="14" font-weight="900" fill="#fff">5</text><rect x="14" y="66" width="92" height="12" rx="6" fill="#ff8fc7"/><text x="60" y="72" text-anchor="middle" dominant-baseline="central" font-size="10" font-weight="900" fill="#0b1030">12＋9－5＝16</text></svg>';
  /* two overlapping circles: la / lb are the circle totals, mid the overlap, q the thing to find */
  const venn = (la, na, lb, nb, mid, q) => `<svg viewBox="0 0 240 110" role="img" aria-label="兩個圈：${la}${na}人，${lb}${nb}人，重疊${mid}人"><circle cx="96" cy="58" r="40" fill="rgba(62,230,208,.22)" stroke="${AQ}" stroke-width="2.4"/><circle cx="144" cy="58" r="40" fill="rgba(255,201,74,.22)" stroke="${GO}" stroke-width="2.4"/>${text(70, 58, '', 16)}${text(120, 58, mid, 20, '#fff')}${text(62, 12, la + ' ' + na, 13, AQ)}${text(178, 12, lb + ' ' + nb, 13, GO)}${q ? text(120, 104, q, 13, PK) : ''}</svg>`;
  const g55 = {
    A: [
      (r, p) => {
        const a = N(r, p, 8, 30), b = N(r, p, 8, 30), c = ri(r, 2, Math.min(a, b) - 2), s = a + b - c;
        return O('venn', `班裏 ${a} 人愛跳繩，${b} 人愛游泳，其中 ${c} 人兩樣都愛。至少愛一樣的有幾人？`, s, '兩樣都愛的人被數了兩次。',
          `${a}＋${b}＝${a + b}，兩樣都愛的 ${c} 人被數了兩次，減去一次：${a + b}－${c}＝${s}。`, [a + b, s + c, s - 1, a - c + b - c], `${a}+${b}-${c}`, [],
          { svg: venn('跳繩', a, '游泳', b, c, '至少愛一樣：？'), why: { [a + b]: `兩樣都愛的 ${c} 人被數了兩次，要減去一次。`, [a - c + b - c]: `只愛一樣的 ${a - c + b - c} 人還要加上兩樣都愛的 ${c} 人。` } });
      },
      (r, p) => {
        const a = N(r, p, 8, 30), b = N(r, p, 8, 30), c = ri(r, 2, Math.min(a, b) - 2), s = a + b - c;
        return O('venn-both', `${a} 人愛跳繩，${b} 人愛游泳，至少愛一樣的共 ${s} 人。兩樣都愛的有幾人？`, c, '加起來比總人數多出的，就是重疊。',
          `${a}＋${b}＝${a + b}，比 ${s} 多 ${a + b - s}，多出的就是被數了兩次的人：${c} 人。`, [s - a, a + b + s, a + b, c + 1], `${a}+${b}-${s}`, [],
          { svg: venn('跳繩', a, '游泳', b, '？', '至少愛一樣：' + s), why: { [a + b]: `${a + b} 是兩個圈的人數相加，還要減去總人數 ${s}。`, [s - a]: `${s - a} 是只愛游泳的人，不是兩樣都愛。` } });
      },
      (r, p) => {
        const a = N(r, p, 10, 40), c = ri(r, 2, a - 3), b = ri(r, c + 2, Math.min(40, c + 25)), it = pick(r, [['蘋果', '橙'], ['貓', '狗']]), nm = pick(r, ['跳繩', '游泳']);
        return O('venn-only', `${a} 人愛${nm}，其中 ${c} 人也愛畫畫。只愛${nm}的有幾人？`, a - c, `愛${nm}的人裏，有些也愛畫畫。`,
          `${a} 人愛${nm}，其中 ${c} 人也愛畫畫，只愛${nm}的是 ${a}－${c}＝${a - c} 人。`, [a, a + c, c, a - c - 1], `${a}-${c}`, [],
          { svg: venn(nm, a, '畫畫', '？', c, '只愛' + nm + '：？'), why: { [a]: `${a} 人裏包括也愛畫畫的 ${c} 人，要減去。`, [c]: `${c} 人是兩樣都愛的，不是只愛${nm}。` } });
      }
    ],
    B: [
      (r, p) => {
        const a = N(r, p, 8, 26), b = N(r, p, 8, 26), c = ri(r, 2, Math.min(a, b) - 2), u = a + b - c, T = u + ri(r, 2, Math.min(12, 60 - u));
        return O('venn-none', `全班 ${T} 人，${a} 人愛跳繩，${b} 人愛游泳，${c} 人兩樣都愛。兩樣都不愛的有幾人？`, T - u, '先求至少愛一樣的人數。',
          `至少愛一樣：${a}＋${b}－${c}＝${u}。兩樣都不愛：${T}－${u}＝${T - u}。`, [u, T - a - b, T - u + c, T - u - 1], `${T}-(${a}+${b}-${c})`, [],
          { svg: venn('跳繩', a, '游泳', b, c, '全班 ' + T + '，兩樣都不愛：？'), why: { [u]: `${u} 是至少愛一樣的人數，還要用全班人數減去。`, [T - a - b]: `兩樣都愛的 ${c} 人被減了兩次，要補回來。` } });
      },
      (r, p) => {
        const a = N(r, p, 8, 26), b = N(r, p, 8, 26), c = ri(r, 2, Math.min(a, b) - 2), u = a + b - c, z = ri(r, 2, Math.min(10, 60 - u)), T = u + z;
        return O('venn-total', `全班 ${T} 人，${z} 人兩樣都不愛。${a} 人愛跳繩，${b} 人愛游泳。兩樣都愛的有幾人？`, c, '先求至少愛一樣的人數。',
          `至少愛一樣：${T}－${z}＝${u}。${a}＋${b}＝${a + b}，比 ${u} 多 ${c}，兩樣都愛的有 ${c} 人。`, [u, a + b - T, a + b, c + 1], `${a}+${b}-(${T}-${z})`, [],
          { svg: venn('跳繩', a, '游泳', b, '？', '全班 ' + T + '，都不愛 ' + z), why: { [u]: `${u} 是至少愛一樣的人數，還要用 ${a}＋${b} 去減。`, [a + b - T]: `要先減去兩樣都不愛的 ${z} 人，再算重疊。` } });
      },
      (r, p) => {
        const a = N(r, p, 8, 30), b = N(r, p, 8, 30), c = ri(r, 2, Math.min(a, b) - 2), s = a + b - 2 * c;
        return O('venn-one', `${a} 人愛跳繩，${b} 人愛游泳，${c} 人兩樣都愛。只愛一樣的有幾人？`, s, '把兩樣都愛的人從兩邊都拿走。',
          `只愛跳繩：${a}－${c}＝${a - c}；只愛游泳：${b}－${c}＝${b - c}。合共 ${a - c}＋${b - c}＝${s}。`, [a + b - c, a + b, s + c, s - c], `${a}+${b}-2*${c}`, [],
          { svg: venn('跳繩', a, '游泳', b, c, '只愛一樣：？'), why: { [a + b - c]: `${a + b - c} 包括兩樣都愛的 ${c} 人，只愛一樣不應包括他們。`, [a + b]: `兩樣都愛的 ${c} 人被數了兩次，而且他們不是只愛一樣。` } });
      }
    ]
  };
  const verify55 = q => {
    let m;
    if ((m = /^班裏 (\d+) 人愛跳繩，(\d+) 人愛游泳，其中 (\d+) 人兩樣都愛/.exec(q.q))) { const A = new Set(), B = new Set(); for (let i = 0; i < +m[1]; i++) A.add(i); for (let i = 0; i < +m[2]; i++) B.add(i < +m[3] ? i : 1000 + i); return String(new Set([...A, ...B]).size); }
    if ((m = /^(\d+) 人愛跳繩，(\d+) 人愛游泳，至少愛一樣的共 (\d+) 人/.exec(q.q))) { for (let c = 0; c <= +m[1]; c++) if (m[1] - c + (m[2] - c) + c === +m[3]) return String(c); return 'none'; }
    if ((m = /^(\d+) 人愛(跳繩|游泳)，其中 (\d+) 人也愛畫畫。只愛/.exec(q.q))) return String(m[1] - m[3]);
    if ((m = /^全班 (\d+) 人，(\d+) 人愛跳繩，(\d+) 人愛游泳，(\d+) 人兩樣都愛/.exec(q.q))) { const only1 = m[2] - m[4], only2 = m[3] - m[4]; return String(m[1] - (only1 + only2 + +m[4])); }
    if ((m = /^全班 (\d+) 人，(\d+) 人兩樣都不愛。(\d+) 人愛跳繩，(\d+) 人愛游泳/.exec(q.q))) { const u = m[1] - m[2]; for (let c = 0; c <= u; c++) if ((m[3] - c) + (m[4] - c) + c === u) return String(c); return 'none'; }
    if ((m = /^(\d+) 人愛跳繩，(\d+) 人愛游泳，(\d+) 人兩樣都愛。只愛一樣/.exec(q.q))) return String((m[1] - m[3]) + (m[2] - m[3]));
    return null;
  };
  /* bars as a "Venn on a number line": the overlap sits under both circles */
  const VCARDS = [{ e: '🧒', n: '小明', zone: 'a' }, { e: '👧', n: '小美', zone: 'a' }, { e: '🧑', n: '阿強', zone: 'a' }, { e: '👩', n: '家欣', zone: 'ab' }, { e: '🧔', n: '大偉', zone: 'ab' }, { e: '👦', n: '阿傑', zone: 'ab' }, { e: '👴', n: '爺爺', zone: 'ab' }, { e: '👵', n: '嫲嫲', zone: 'ab' }, { e: '🧓', n: '婆婆', zone: 'b' }, { e: '👨', n: '叔叔', zone: 'b' }];
  const VB = (a, b, c) => [
    { label: '跳繩', segs: [{ u: a - c, c: 'a', text: '只跳' }, { u: c, c: 'd', text: '都愛' }] },
    { label: '游泳', segs: [{ u: a - c, c: 'a', dashed: true, text: '' }, { u: c, c: 'd', text: '都愛' }, { u: b - c, c: 'b', text: '只游' }] }
  ];
  WQOly.register({
    id: 'p5-5', grade: 5, n: 5, title: '容斥原理', icon: '⭕',
    card: { motto: '重疊要減一次', example: '12＋9－5＝16', art: art55 },
    lesson: [
      { t: 'show', say: '8 人愛跳繩，7 人愛游泳，5 人兩樣都愛。', scene: { w: 'bars', p: { rows: VB(8, 7, 5) } } },
      { t: 'predict', say: '粉紅色的 5 人，兩邊都數到。', ask: '至少愛一樣的有幾人？', options: ['15', '10', '12'], answer: '10', scene: { w: 'bars', p: { rows: VB(8, 7, 5).concat([{ label: '合共', segs: [{ u: 10, c: 't', text: '？' }] }]) }, still: true }, reveal: '粉紅的 5 人數了兩次。15－5＝10。' },
      { t: 'do', say: '把每個人拖進正確的區。', scene: { w: 'g5_venn', p: { aName: '跳繩', bName: '游泳', cards: VCARDS } } },
      { t: 'show', say: '跳繩 8，游泳 7，粉紅色數了兩次。', scene: { w: 'g5_venn', p: { aName: '跳繩', bName: '游泳', cards: VCARDS, formula: true } } },
      { t: 'show', say: '8＋7－5＝10。重疊的人要減一次。', scene: { w: 'bars', p: { rows: VB(8, 7, 5).concat([{ label: '合共', segs: [{ u: 10, c: 't', text: '10 人' }] }]) }, still: true } },
      { t: 'predict', say: '全班 13 人。', ask: '兩樣都不愛的有幾人？', options: ['3', '5', '2'], answer: '3', scene: { w: 'bars', p: { rows: VB(8, 7, 5).concat([{ label: '全班', segs: [{ u: 10, c: 't', text: '10 人' }, { u: 3, c: 'd', dashed: true, text: '？' }] }]) }, still: true }, reveal: '至少愛一樣的有 10 人。13－10＝3，有 3 人都不愛。' },
      { t: 'try', say: '用同一方法。', scene: { w: 'bars', p: { rows: VB(11, 9, 4) }, still: true },
        q: { stem: '11 人愛跳繩，9 人愛游泳，4 人兩樣都愛。至少愛一樣的有幾人？', options: ['16', '20', '12'], answer: '16', hint: '11＋9 之後，重疊的 4 人要減去一次。', why: { 20: '兩樣都愛的 4 人被數了兩次，要減去一次。', 12: '減去兩次太多了，只減一次。' } } },
      { t: 'card' }
    ],
    gens: g55, verify: verify55
  });
})();

;
/* 小六 · 5 units (finished). p6-2 = 按份數分配 (no ratio colon), p6-4 = 相遇與追及 (first card teaches 速度＝路程÷時間), per 設計書「研究後修訂」.
   Tools: only the existing ones (bars, cycle) - no new widget, so the unit test's widget list stays valid. */
(function () {
  'use strict';
  const { o, N, ri, pick, shuffle } = WQOly.helpers;
  const gcd = WQOly.gcd;
  /* o() + keep only whole-number (or fraction) wrong answers / why keys that make sense (never a negative count) */
  const O = (...a) => { const q = o(...a); if (q.why) { const w = {}; for (const k in q.why) if (/^\d+(\/\d+)?$/.test(k)) w[k] = q.why[k]; q.why = w; } q.w = q.w.filter(v => typeof v !== 'number' || (isFinite(v) && v >= 0)); return q; };
  const frac = (p, q) => { const g = gcd(p, q); p /= g; q /= g; return q === 1 ? String(p) : p + '/' + q; };

  /* ---- svg helpers ------------------------------------------------------------------------------------------------------ */
  const AQ = '#3ee6d0', GO = '#ffc94a', TX = '#c3cbf7', PK = '#ff8fc7', VI = '#c6a2ff', BG = '#1b2160';
  const text = (x, y, s, sz, col) => `<text x="${x}" y="${y}" text-anchor="middle" dominant-baseline="central" font-size="${sz || 14}" font-weight="900" fill="${col || TX}">${s}</text>`;
  /* a bar split into cells (份); parts: [{n, name, col}] */
  const partBar = (parts, title) => {
    const tot = parts.reduce((s, p) => s + p.n, 0), cw = Math.min(30, 208 / tot); let x = 120 - tot * cw / 2, s = '';
    parts.forEach(p => {
      for (let i = 0; i < p.n; i++) s += `<rect x="${(x + i * cw).toFixed(1)}" y="38" width="${cw.toFixed(1)}" height="30" fill="${p.col}" fill-opacity=".3" stroke="${p.col}" stroke-width="1.8"/>`;
      s += text((x + p.n * cw / 2).toFixed(1), 53, p.n + ' 份', 13, '#fff') + text((x + p.n * cw / 2).toFixed(1), 84, p.name, 14, p.col); x += p.n * cw;
    });
    return `<svg viewBox="0 0 240 110" role="img" aria-label="${parts.map(p => p.name + p.n + ' 份').join('，')}">${s}${text(120, 16, title || '', 14, GO)}</svg>`;
  };
  const PC = [AQ, GO, PK];
  /* consecutive pieces 1/(k×(k+1)), k = a..b, lying between 1/(b+1) and 1/a on a bar of length 1 */
  const fracBar = (a, b) => {
    const X = v => 20 + 200 * v; let s = `<rect x="20" y="40" width="200" height="30" rx="4" fill="none" stroke="${TX}" stroke-width="1.6" opacity=".7"/>`;
    for (let k = b; k >= a; k--) s += `<rect x="${X(1 / (k + 1)).toFixed(1)}" y="40" width="${(X(1 / k) - X(1 / (k + 1))).toFixed(1)}" height="30" fill="${(b - k) % 2 ? GO : AQ}" fill-opacity=".55" stroke="#0b1030" stroke-width="1"/>`;
    return `<svg viewBox="0 0 240 110" role="img" aria-label="長度 1 的長條上，1/(${a}×${a + 1}) 到 1/(${b}×${b + 1}) 接成一段">${s}${text(X(1 / (b + 1)).toFixed(1), 88, '1/' + (b + 1), 13, AQ)}${text(X(1 / a).toFixed(1), 88, a === 1 ? '1' : '1/' + a, 13, GO)}${text((X(1 / (b + 1)) + X(1 / a)) / 2, 22, '和 ＝ ？', 15, PK)}</svg>`;
  };
  const formSvg = (l1, l2) => `<svg viewBox="0 0 240 110" role="img" aria-label="${l1} ${l2 || ''}">${text(120, 40, l1, 17, TX)}${l2 ? text(120, 74, l2, 17, GO) : ''}</svg>`;
  const workSvg = (a, b, nm) => {
    const row = (n, y, col, lab) => { const w = 150 / n; let s = ''; for (let i = 0; i < n; i++) s += `<rect x="${(70 + i * w).toFixed(1)}" y="${y}" width="${w.toFixed(1)}" height="24" fill="${col}" fill-opacity=".3" stroke="${col}" stroke-width="1.6"/>`; return s + text(34, y + 12, lab, 14, col); };
    return `<svg viewBox="0 0 240 110" role="img" aria-label="甲 ${a} 日完成，乙 ${b} 日完成">${row(a, 22, AQ, nm[0])}${row(b, 62, GO, nm[1])}${text(120, 98, '每一格是 1 日的工作', 12, TX)}</svg>`;
  };
  const road = (kind, Dtxt, a, b) => {
    const person = (x, col, lab, dir) => `<circle cx="${x}" cy="60" r="12" fill="${col}"/>${text(x, 60, lab, 13, '#0b1030')}<path d="M${x + dir * 16} 60h${dir * 22}m${-dir * 6} -5l${dir * 6} 5l${-dir * 6} 5" stroke="${col}" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
    let s = `<path d="M18 78H222" stroke="${TX}" stroke-width="3" stroke-linecap="round" opacity=".6"/>`;
    if (kind === 'meet') s += person(36, AQ, '甲', 1) + person(204, GO, '乙', -1) + text(120, 30, Dtxt, 16, PK) + `<path d="M36 40V46M204 40V46M36 43H204" stroke="${PK}" stroke-width="1.8" fill="none"/>` + text(60, 98, '每分 ' + a + ' 米', 12, AQ) + text(180, 98, '每分 ' + b + ' 米', 12, GO);
    else s += person(124, GO, '乙', 1) + person(40, AQ, '甲', 1) + text(82, 30, Dtxt, 16, PK) + `<path d="M40 40V46M124 40V46M40 43H124" stroke="${PK}" stroke-width="1.8" fill="none"/>` + text(60, 98, '甲每分 ' + a + ' 米', 12, AQ) + text(180, 98, '乙每分 ' + b + ' 米', 12, GO);
    return `<svg viewBox="0 0 240 110" role="img" aria-label="${kind === 'meet' ? '兩人面對面走' : '兩人同向而行'}">${s}</svg>`;
  };
  /* an n×n×n cube seen from a corner, 3 faces gridded */
  const iso = n => {
    const s = 96 / (2 * n), c = Math.cos(Math.PI / 6) * s, h = s / 2, ox = 120, oy = 7, P = (i, j, k) => [ox + (i - j) * c, oy + (i + j) * h + k * s];
    const poly = (pts, f) => `<polygon points="${pts.map(p => p[0].toFixed(1) + ',' + p[1].toFixed(1)).join(' ')}" fill="${f}" stroke="#0b1030" stroke-width="1.2"/>`;
    let g = '';
    for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) g += poly([P(i, j, 0), P(i + 1, j, 0), P(i + 1, j + 1, 0), P(i, j + 1, 0)], '#ffd877');
    for (let i = 0; i < n; i++) for (let k = 0; k < n; k++) g += poly([P(i, n, k), P(i + 1, n, k), P(i + 1, n, k + 1), P(i, n, k + 1)], '#e3a92b');
    for (let j = 0; j < n; j++) for (let k = 0; k < n; k++) g += poly([P(n, j, k), P(n, j + 1, k), P(n, j + 1, k + 1), P(n, j, k + 1)], '#b97f10');
    return `<svg viewBox="0 0 240 110" role="img" aria-label="${n}×${n}×${n} 的正方體，外面塗了色">${g}</svg>`;
  };
  const netSvg = (belt, ti, top, bi, bot, hl) => {
    const cw = 30, x0 = 120 - 2 * cw; let s = '';
    const cell = (x, y, v, on) => `<rect x="${x}" y="${y}" width="${cw}" height="${cw}" fill="${on ? GO : BG}" stroke="${AQ}" stroke-width="2"/>${text(x + cw / 2, y + cw / 2 + 1, v, 17, on ? '#3b2600' : TX)}`;
    belt.forEach((v, i) => { s += cell(x0 + i * cw, 40, v, v === hl); });
    s += cell(x0 + ti * cw, 10, top, top === hl) + cell(x0 + bi * cw, 70, bot, bot === hl);
    return `<svg viewBox="0 0 240 110" role="img" aria-label="正方體展開圖：橫排 ${belt.join('、')}，上面 ${top}，下面 ${bot}">${s}</svg>`;
  };

  /* ============================================================================================================================ */
  /* ---- p6-1 分數巧算 ----------------------------------------------------------------------------------------------------- */
  const art61 = '<svg viewBox="0 0 120 80"><rect x="10" y="12" width="100" height="24" rx="4" fill="none" stroke="#c3cbf7" stroke-width="1.6" opacity=".7"/><rect x="60" y="12" width="50" height="24" fill="#3ee6d0" fill-opacity=".55"/><rect x="43" y="12" width="17" height="24" fill="#ffc94a" fill-opacity=".55"/><rect x="30" y="12" width="13" height="24" fill="#3ee6d0" fill-opacity=".55"/><rect x="14" y="48" width="92" height="22" rx="11" fill="#ff8fc7"/><text x="60" y="59" text-anchor="middle" dominant-baseline="central" font-size="11" font-weight="900" fill="#0b1030">1/k－1/(k+1)</text></svg>';
  const termsOf = (x, g, last) => { const t = []; for (let a = x; a <= last; a += g) t.push([a, a + g]); return t; };
  const sumFrac = t => { let num = 0, den = 1; for (const [a, b] of t) { const d = a * b, l = den / gcd(den, d) * d; num = num * (l / den) + l / d; den = l; } const g = gcd(num, den); return [num / g, den / g]; };
  const g61 = {
    A: [
      (r, p) => {
        const n = N(r, p, 3, 9), s = frac(n, n + 1), sf = pick(r, ['＝？', '的和是多少？']);
        return O('frac-split', `1/(1×2)＋1/(2×3)＋…＋1/(${n}×${n + 1})${sf}`, s, '每一項拆成兩個分數相減。', `1/(k×(k+1))＝1/k－1/(k+1)，中間全部抵消，只剩 1－1/${n + 1}＝${s}。`,
          [frac(n + 1, n + 2), frac(n - 1, n), `1/${n + 1}`, frac(n, n + 2)], '', [], { form: 'simplest', svg: fracBar(1, n), why: { [`1/${n + 1}`]: `抵消後剩下 1 和最後一項，要相減：1－1/${n + 1}。`, [frac(n + 1, n + 2)]: `最後一項是 1/(${n}×${n + 1})，分母到 ${n + 1}，不是 ${n + 2}。` } });
      },
      (r, p) => {
        const a = ri(r, 2, 5), b = ri(r, a + 2, 9), [sn, sd] = sumFrac(termsOf(a, 1, b)), s = frac(sn, sd);
        return O('frac-mid', `1/(${a}×${a + 1})＋1/(${a + 1}×${a + 2})＋…＋1/(${b}×${b + 1})＝？`, s, '拆開後，首尾剩下兩個分數。', `1/${a}－1/${b + 1}＝${b + 1}/${a * (b + 1)}－${a}/${a * (b + 1)}＝${s}。`,
          [`1/${a}`, `1/${b + 1}`, frac(b - a + 1, b + 1), frac(b - a, a * b)], '', [], { form: 'simplest', svg: fracBar(a, b), why: { [`1/${a}`]: `這項是 1/${a} 的開頭，還要減去最後剩下的 1/${b + 1}。`, [`1/${b + 1}`]: `只是剩下的尾巴，要用 1/${a} 去減。` } });
      },
      (r, p) => {
        const a = N(r, p, 2, 13), q = r() < .5;
        return q ? O('frac-diff', `1/${a}－1/${a + 1}＝？`, frac(1, a * (a + 1)), '通分母：分母是兩個分母相乘。', `1/${a}－1/${a + 1}＝${a + 1}/${a * (a + 1)}－${a}/${a * (a + 1)}＝1/${a * (a + 1)}。`,
          [`1/${a}`, `1/${a + 1}`, `1/${2 * a + 1}`, `2/${a * (a + 1)}`], '', [], { form: 'simplest', svg: formSvg(`1/${a}－1/${a + 1}`, `＝ 1/(${a}×${a + 1})`), why: { [`1/${2 * a + 1}`]: '分母不能直接相減或相加，要先通分母。', [`1/${a}`]: '還要減去 1/' + (a + 1) + '，不是只剩第一個。' } })
          : O('frac-find', `1/(${a}×${a + 1})＝1/${a}－1/？。？是多少？`, a + 1, '拆成兩個分數相減。', `1/(${a}×${a + 1})＝1/${a}－1/${a + 1}，所以？是 ${a + 1}。`,
            [a, a + 2, a * (a + 1), 1], '', [], { svg: formSvg(`1/(${a}×${a + 1})`, `＝ 1/${a} － 1/？`), why: { [a]: `${a} 是前一個分母，要減去的是下一個：${a + 1}。`, [a * (a + 1)]: '乘出來的是分母，拆開後是兩個相鄰的數。' } });
      },
      /* R3.31 variety: start anywhere, other wordings */
      (r, p) => {
        const a = ri(r, 1, 5), b = ri(r, a + 2, 9), [sn, sd] = sumFrac(termsOf(a, 1, b)), s = frac(sn, sd), pre = pick(r, ['計算：', '求值：', '算一算：', '求和：']);
        const wr = [...new Set([`1/${a}`, `1/${b + 1}`, frac(b - a + 1, b + 1), frac(b - a, a * b), frac(b + 1, b + 2), frac(b - 1, b)])].filter(x => x !== s).slice(0, 4);
        return O('frac-mid', `${pre}1/(${a}×${a + 1})＋1/(${a + 1}×${a + 2})＋…＋1/(${b}×${b + 1})＝？`, s, '每一項拆成兩個分數相減，中間會抵消。', `1/${a}－1/${b + 1}＝${frac(b + 1 - a, a * (b + 1))}；中間的分數全部抵消，只剩首尾：${s}。`,
          wr, '', [], { form: 'simplest', svg: fracBar(a, b), why: Object.fromEntries([[`1/${a}`, `這是開頭的分數，還要減去最後剩下的 1/${b + 1}。`], [`1/${b + 1}`, `這只是尾巴，要用 1/${a} 去減。`]].filter(([k]) => wr.includes(k))) });
      },
      /* R3.31 variety: a story with the pieces 1/2, 1/6, 1/12 ... */
      (r, p) => {
        const n = ri(r, 3, 5), sc = pick(r, [['一本書，', '看'], ['一條繩，', '剪'], ['一堆沙，', '運走'], ['一池水，', '排走']]), days = ['第一日', '第二日', '第三日', '第四日', '第五日'].slice(0, n), s = frac(n, n + 1);
        const wr = [...new Set([frac(n - 1, n), frac(n + 1, n + 2), `1/${n * (n + 1)}`, frac(n, n + 2)])].filter(x => x !== s);
        return O('frac-split', `${sc[0]}${days.map((d, i) => `${d}${sc[1]} 1/${(i + 1) * (i + 2)}`).join('，')}。共${sc[1]}了全部的幾分之幾？`, s, '每一份都是 1/(k×(k+1))，拆開看看。',
          `1/2＝1/(1×2)，1/6＝1/(2×3)……拆開後中間抵消，剩 1－1/${n + 1}＝${s}。`, wr, '', [], { form: 'simplest', svg: fracBar(1, n), why: { [`1/${n * (n + 1)}`]: '這只是最後一日的份量，共計要全部加起來。', [frac(n - 1, n)]: `共有 ${n} 日，要加到第 ${n} 日。` } });
      },
      /* R3.31 variety: the denominators already multiplied out */
      (r, p) => {
        const n = ri(r, 4, 10), pre = pick(r, ['計算：', '求值：', '算一算：', '求和：']), s = frac(n, n + 1);
        const wr = [...new Set([frac(n - 1, n), frac(n + 1, n + 2), `1/${n + 1}`, frac(n, n + 2)])].filter(x => x !== s);
        return O('frac-split', `${pre}1/2＋1/6＋1/12＋…＋1/${n * (n + 1)}＝？`, s, `先想：2＝1×2，6＝2×3，12＝3×4……最後 ${n * (n + 1)}＝${n}×${n + 1}。`,
          `分母是 1×2、2×3、3×4……${n}×${n + 1}；拆開抵消，剩 1－1/${n + 1}＝${s}。`, wr, '', [], { form: 'simplest', svg: fracBar(1, n), why: { [`1/${n + 1}`]: `抵消後剩 1 和最後一項，要用 1 去減 1/${n + 1}。`, [frac(n + 1, n + 2)]: `最後一項是 ${n}×${n + 1}，分母到 ${n + 1}，不是 ${n + 2}。` } });
      },
      /* R3.31 variety: how many terms */
      (r, p) => {
        const n = ri(r, 3, 9), t = r() < .5;
        const wr = [...new Set([n + 1, n - 1, n + 2, n * (n + 1)])].filter(x => x !== n);
        return O('frac-mid', t ? `1/(1×2)＋1/(2×3)＋1/(3×4)＋…，一直加下去，和是 ${n}/${n + 1}。一共加了幾項？` : `從 1/(1×2) 開始，按 1/(2×3)、1/(3×4) 的規律加下去，和是 ${n}/${n + 1}。共有幾項？`, n, '先想：加到第 k 項，和是 k/(k+1)。', `加到第 k 項，和是 1－1/(k+1)＝k/(k+1)，所以 k＝${n}，共 ${n} 項。`, wr, '', [], { why: { [n + 1]: `${n + 1} 是分母，分子 ${n} 才是項數。`, [n - 1]: `和是 ${n}/${n + 1}，項數是 ${n}，不是少一項。` } });
      },
      /* R3.31 variety: split a unit fraction */
      (r, p) => {
        const a = ri(r, 2, 13), t = r() < .5, d = a * (a + 1);
        const ans = t ? a + 1 : a, wr = [...new Set(t ? [a, a + 2, d, 1] : [a + 1, a - 1, d, 1])].filter(x => x !== ans);
        return O('frac-find', t ? `1/${d}＝1/${a}－1/？。？是多少？` : `1/${d}＝1/？－1/${a + 1}。？是多少？`, ans, '想想：分母是兩個相鄰的數相乘。', `${d}＝${a}×${a + 1}，所以 1/${d}＝1/${a}－1/${a + 1}，？是 ${ans}。`, wr, '', [], { svg: formSvg(`1/${d}`, `＝ 1/${a} － 1/${a + 1}`), why: t ? { [a]: `${a} 是前一個分母，要減去的是下一個：${a + 1}。`, [d]: '乘出來的是分母，拆開後是兩個相鄰的數。' } : { [a + 1]: `${a + 1} 是減去的那個，？要填前一個：${a}。`, [d]: '乘出來的是分母，拆開後是兩個相鄰的數。' } });
      }
    ],
    B: [
      (r, p) => {
        const m = N(r, p, 3, 9), g = pick(r, [2, 3]), last = 1 + (m - 1) * g, s = frac(m, 1 + m * g);
        return O('frac-gap', `1/(1×${1 + g})＋1/(${1 + g}×${1 + 2 * g})＋…＋1/(${last}×${last + g})＝？`, s, `每項拆開後要乘 1/${g}。`, `每項＝(1/左－1/右)÷${g}，中間抵消，剩 (1－1/${last + g})÷${g}＝${s}。`,
          [frac(last + g - 1, last + g), frac(m, 1 + m * g + 1), frac(m + 1, 1 + m * g), `1/${last + g}`], '', [], { form: 'simplest', svg: formSvg(`1/(1×${1 + g})＝(1－1/${1 + g})÷${g}`, '每項都要除以 ' + g), why: { [frac(last + g - 1, last + g)]: `抵消後剩 1－1/${last + g}，還要除以 ${g}。`, [`1/${last + g}`]: `這只是剩下的尾巴，要用 1 去減再除以 ${g}。` } });
      },
      (r, p) => {
        const s0 = ri(r, 2, 6), g = pick(r, [2, 3]), m = N(r, p, 3, 8), last = s0 + (m - 1) * g, [sn, sd] = sumFrac(termsOf(s0, g, last).map(([a, b]) => [a, b])), ans = frac(sn, sd);
        return O('frac-gap-mid', `1/(${s0}×${s0 + g})＋1/(${s0 + g}×${s0 + 2 * g})＋…＋1/(${last}×${last + g})＝？`, ans, `先拆成相減，最後除以 ${g}。`, `和＝(1/${s0}－1/${last + g})÷${g}，通分母算出 ${frac(sn * g, sd)}，再除以 ${g}：${ans}。`,
          [frac(sn * g, sd), `1/${s0}`, frac(sn, sd * g), frac(sn + 1, sd)], '', [], { form: 'simplest', svg: formSvg(`1/${s0}－1/${last + g}`, '再除以 ' + g), why: { [frac(sn * g, sd)]: `這是不除以 ${g} 的值，要記得除以 ${g}。`, [`1/${s0}`]: '這只是開頭的分數，還要減去尾巴再除。' } });
      },
      (r, p) => {
        const n = N(r, p, 3, 9);
        return O('frac-times', `（1/(1×2)＋1/(2×3)＋…＋1/(${n}×${n + 1})）×${n + 1}＝？`, n, '括號內先拆開抵消。', `括號內＝${n}/${n + 1}；${n}/${n + 1}×${n + 1}＝${n}。`,
          [n + 1, n - 1, 1, n * (n + 1)], '', [], { svg: fracBar(1, n), why: { [n + 1]: `括號內是 ${n}/${n + 1}，乘 ${n + 1} 後分母消去，剩分子 ${n}。`, [1]: `括號內不是 1，是 1－1/${n + 1}。` } });
      },
      /* R3.31 variety: gap sums, start anywhere, other wordings */
      (r, p) => {
        const s0 = ri(r, 1, 6), g = pick(r, [2, 3]), m = ri(r, 3, 6), last = s0 + (m - 1) * g, [sn, sd] = sumFrac(termsOf(s0, g, last)), ans = frac(sn, sd), pre = pick(r, ['計算：', '求值：', '算一算：']);
        const wr = [...new Set([frac(sn * g, sd), `1/${s0}`, frac(sn, sd * g), frac(sn + 1, sd)])].filter(x => x !== ans);
        return O('frac-gap-mid', `${pre}1/(${s0}×${s0 + g})＋1/(${s0 + g}×${s0 + 2 * g})＋…＋1/(${last}×${last + g})＝？`, ans, `每項分母相差 ${g}，拆開後要除以 ${g}。`, `和＝(1/${s0}－1/${last + g})÷${g}，括號內是 ${frac(sn * g, sd)}，再除以 ${g}：${ans}。`,
          wr, '', [], { form: 'simplest', svg: formSvg(`1/${s0}－1/${last + g}`, '再除以 ' + g), why: Object.fromEntries([[frac(sn * g, sd), `這是不除以 ${g} 的值，要記得除以 ${g}。`], [`1/${s0}`, '這只是開頭的分數，還要減去尾巴再除。']].filter(([k]) => wr.includes(k))) });
      },
      /* R3.31 variety: multiply the gap sum back by the gap */
      (r, p) => {
        const s0 = ri(r, 1, 5), g = pick(r, [2, 3, 4]), m = ri(r, 3, 5), last = s0 + (m - 1) * g, ans = frac(last + g - s0, s0 * (last + g)), [sn, sd] = sumFrac(termsOf(s0, g, last));
        const wr = [...new Set([frac(sn, sd), `1/${s0}`, `1/${last + g}`, frac(last + g - s0, last + g)])].filter(x => x !== ans);
        return O('frac-times', `（1/(${s0}×${s0 + g})＋1/(${s0 + g}×${s0 + 2 * g})＋…＋1/(${last}×${last + g})）×${g}＝？`, ans, `括號內每項拆開後要除以 ${g}，再乘 ${g} 就抵消。`, `括號內＝(1/${s0}－1/${last + g})÷${g}；再乘 ${g}，剩 1/${s0}－1/${last + g}＝${ans}。`,
          wr, '', [], { form: 'simplest', svg: formSvg(`1/${s0}－1/${last + g}`, '括號內除以 ' + g + '，再乘 ' + g), why: Object.fromEntries([[frac(sn, sd), `這是括號內的值，還要乘 ${g}。`], [`1/${s0}`, '這只是開頭，還要減去尾巴。']].filter(([k]) => wr.includes(k))) });
      },
      /* R3.31 variety: numerator equals the gap */
      (r, p) => {
        const s0 = ri(r, 1, 5), g = pick(r, [2, 3]), m = ri(r, 3, 6), last = s0 + (m - 1) * g, ans = frac(last + g - s0, s0 * (last + g));
        const wr = [...new Set([`1/${s0}`, `1/${last + g}`, frac(last + g - s0, last + g), frac(last - s0, s0 * last)])].filter(x => x !== ans);
        return O('frac-gap', `${g}/(${s0}×${s0 + g})＋${g}/(${s0 + g}×${s0 + 2 * g})＋…＋${g}/(${last}×${last + g})＝？`, ans, `分子剛好是分母兩個數的差，每項可拆成兩個分數相減。`, `${g}/(${s0}×${s0 + g})＝1/${s0}－1/${s0 + g}，其餘各項同理；中間抵消，剩 1/${s0}－1/${last + g}＝${ans}。`,
          wr, '', [], { form: 'simplest', svg: formSvg(`${g}/(${s0}×${s0 + g})＝1/${s0}－1/${s0 + g}`, '分子＝兩數的差'), why: Object.fromEntries([[`1/${s0}`, '這只是開頭，還要減去尾巴。'], [`1/${last + g}`, `這是尾巴，要用 1/${s0} 去減。`]].filter(([k]) => wr.includes(k))) });
      },
      /* R3.31 variety: split with a gap */
      (r, p) => {
        const a = ri(r, 1, 9), g = pick(r, [2, 3, 4]), ans = a + g;
        const wr = [...new Set([a + 1, a * (a + g), g, a + 2 * g])].filter(x => x !== ans);
        return O('frac-gap', `1/(${a}×${a + g})＝(1/${a}－1/？)÷${g}。？是多少？`, ans, `分母兩個數相差 ${g}，括號內要減去哪一個？`, `1/${a}－1/${a + g}＝${g}/(${a}×${a + g})，除以 ${g} 就是 1/(${a}×${a + g})，所以？是 ${ans}。`,
          wr, '', [], { svg: formSvg(`1/(${a}×${a + g})`, `＝(1/${a}－1/？)÷${g}`), why: Object.fromEntries([[a + 1, '分母是 ' + a + ' 和 ' + (a + g) + ' 相乘，要填後面那個。'], [a * (a + g), '乘出來的是分母，括號內要填一個數。']].filter(([k]) => wr.includes(k))) });
      }
    ]
  };
  const verify61 = q => {
    let m;
    const ts = [...q.q.matchAll(/1\/\((\d+)×(\d+)\)/g)].map(x => [+x[1], +x[2]]);
    const addF = ds => { let n = 0, d = 1; for (const [a, b] of ds) { const l = d / gcd(d, b) * b; n = n * (l / d) + a * (l / b); d = l; } const g = gcd(n, d); return frac(n / g, d / g); };
    if ((m = /^(?:計算：|求值：|算一算：|求和：)1\/2＋1\/6＋1\/12＋…＋1\/(\d+)＝？$/.exec(q.q))) { const d = +m[1]; for (let n = 1; n <= 60; n++) if (n * (n + 1) === d) return frac(n, n + 1); return 'none'; }
    if (/幾項？$/.test(q.q) && (m = /和是 (\d+)\/(\d+)。/.exec(q.q))) return +m[2] === +m[1] + 1 ? m[1] : 'none';
    if ((m = /第一日.{1,3} 1\/2，第二日/.exec(q.q))) return addF([...q.q.matchAll(/ 1\/(\d+)/g)].map(x => [1, +x[1]]));
    if ((m = /^1\/(\d+)＝1\/(\d+)－1\/？。/.exec(q.q))) { const d = +m[1], x = +m[2]; return d * x % (d - x) === 0 ? String(d * x / (d - x)) : 'none'; }
    if ((m = /^1\/(\d+)＝1\/？－1\/(\d+)。/.exec(q.q))) { const d = +m[1], y = +m[2]; return d * y % (d + y) === 0 ? String(d * y / (d + y)) : 'none'; }
    if ((m = /^1\/\((\d+)×(\d+)\)＝\(1\/(\d+)－1\/？\)÷(\d+)。/.exec(q.q))) return (+m[2] - +m[1] === +m[4] && +m[3] === +m[1]) ? m[2] : 'none';
    if ((m = /^(\d+)\/\((\d+)×(\d+)\)＋/.exec(q.q)) && +m[1] > 1) {
      const all = [...q.q.matchAll(/(\d+)\/\((\d+)×(\d+)\)/g)].map(x => [+x[1], +x[2], +x[3]]); const g = all[0][2 + 0 - 1 + 1] - all[0][1];
      let x0 = all[0][1]; const last = all[all.length - 1][1]; const ds = []; for (let a = x0; a <= last; a += g) ds.push([g, a * (a + g)]); return addF(ds);
    }
    if (/^1\/\d+－1\/\d+＝？/.test(q.q) && (m = /^1\/(\d+)－1\/(\d+)＝？/.exec(q.q))) { const a = +m[1], b = +m[2]; return frac(b - a, a * b); }
    if ((m = /^1\/\((\d+)×(\d+)\)＝1\/\d+－1\/？/.exec(q.q))) return String(+m[2]);
    if (ts.length >= 3) {
      const x0 = ts[0][0], g = ts[0][1] - ts[0][0], last = ts[ts.length - 1][0];
      const [sn, sd] = sumFrac(termsOf(x0, g, last)); const mul = /）×(\d+)＝？/.exec(q.q);
      return mul ? frac(sn * +mul[1], sd) : frac(sn, sd);
    }
    return null;
  };
  const R61 = rows => ({ rows });
  WQOly.register({
    id: 'p6-1', grade: 6, n: 1, title: '分數巧算', icon: '🍕',
    card: { motto: '拆成兩個相減', example: '1/(1×2)＝1－1/2', art: art61 },
    lesson: [
      { t: 'show', say: '1/(1×2)＝1/2。也就是 1 減去 1/2。', scene: { w: 'bars', p: R61([{ label: '1', segs: [{ u: 2, c: 't', text: '1' }] }, { label: '', segs: [{ u: 1, c: 'a', text: '1/2' }, { u: 1, c: 'd', text: '1/2' }] }]) } },
      { t: 'predict', say: '1/(2×3) 也可以拆成相減。', ask: '它等於哪一個？', options: ['1/2－1/3', '1/2＋1/3', '1/3－1/4'], answer: '1/2－1/3', scene: { w: 'bars', p: R61([{ label: '1/2', segs: [{ u: 3, c: 't', text: '1/2' }] }, { label: '1/3', segs: [{ u: 2, c: 'a', text: '1/3' }, { u: 1, c: 'd', text: '1/6' }] }]), still: true }, reveal: '1/2－1/3＝3/6－2/6＝1/6。剛好是 1/(2×3)。' },
      { t: 'show', say: '每項都能拆：1/(3×4)＝1/3－1/4。', scene: { w: 'bars', p: R61([{ label: '1/3', segs: [{ u: 4, c: 't', text: '1/3' }] }, { label: '1/4', segs: [{ u: 3, c: 'a', text: '1/4' }, { u: 1, c: 'd', text: '' }] }]) } },
      { t: 'do', say: '全長是 1（6 份）。拉到兩項的總和。', scene: { w: 'bars', p: R61([{ label: '兩項', segs: [{ u: 3, c: 'a', text: '1/2' }, { u: 1, c: 'b', text: '1/6' }, { u: 2, c: 'd', dashed: true, text: '1/3' }] }, { label: '和', segs: [{ u: 1, c: 't', edit: true, start: 6, target: 4, min: 1, max: 6 }] }]) } },
      { t: 'show', say: '兩項拆開：(1－1/2)＋(1/2－1/3)。中間的 1/2 抵消，剩 2/3。', scene: { w: 'bars', p: R61([{ label: '兩項', segs: [{ u: 3, c: 'a', text: '1/2' }, { u: 1, c: 'b', text: '1/6' }, { u: 2, c: 'd', dashed: true, text: '1/3' }] }, { label: '和', segs: [{ u: 4, c: 't', text: '2/3' }] }]), still: true } },
      { t: 'try', say: '多一項，一樣的方法。', scene: { w: 'bars', p: R61([{ label: '1/5', segs: [{ u: 5, c: 't', text: '1/5' }] }]), still: true },
        q: { stem: '1/(1×2)＋1/(2×3)＋1/(3×4)＋1/(4×5)＝？', options: ['3/4', '4/5', '5/6'], answer: '4/5', hint: '剩下 1－1/5。', why: { '3/4': '這是三項的和，漏了第四項。', '5/6': '多算了一項，最後的分母是 5。' } } },
      { t: 'card' }
    ],
    gens: g61, verify: verify61
  });

  /* ---- p6-2 按份數分配 ---------------------------------------------------------------------------------------------------- */
  const art62 = '<svg viewBox="0 0 120 80"><g stroke-width="2"><rect x="10" y="12" width="20" height="24" fill="#3ee6d0" fill-opacity=".3" stroke="#3ee6d0"/><rect x="30" y="12" width="20" height="24" fill="#3ee6d0" fill-opacity=".3" stroke="#3ee6d0"/><rect x="50" y="12" width="20" height="24" fill="#3ee6d0" fill-opacity=".3" stroke="#3ee6d0"/><rect x="70" y="12" width="20" height="24" fill="#ffc94a" fill-opacity=".3" stroke="#ffc94a"/><rect x="90" y="12" width="20" height="24" fill="#ffc94a" fill-opacity=".3" stroke="#ffc94a"/></g><rect x="10" y="46" width="100" height="22" rx="11" fill="#ff8fc7"/><text x="60" y="57" text-anchor="middle" dominant-baseline="central" font-size="11" font-weight="900" fill="#0b1030">先求一份是多少</text></svg>';
  const SETS = [['紅珠', '藍珠', '粒'], ['甲', '乙', '元'], ['哥哥', '妹妹', '元']];
  const g62 = {
    A: [
      (r, p) => {
        const [X, Y, cl] = pick(r, SETS); let a, b; do { a = ri(r, 1, 5); b = ri(r, 1, 5); } while (a === b);
        const k = N(r, p, 2, 12), T = (a + b) * k, x = r() < .5, pa = x ? a : b, nm = x ? X : Y, ot = x ? Y : X;
        return O('parts', `${X}和${Y}按 ${a} 份對 ${b} 份分，共 ${T} ${cl}，${nm}有幾${cl}？`, k * pa, '先求一份是多少。', `共 ${a}＋${b}＝${a + b} 份，一份 ${T}÷${a + b}＝${k}；${nm} ${pa} 份：${k}×${pa}＝${k * pa}。`,
          [k * (a + b - pa), k, T - k, k * pa + k], `${T}/${a + b}*${pa}`, [], { svg: partBar([{ n: a, name: X, col: AQ }, { n: b, name: Y, col: GO }], '共 ' + T + ' ' + cl), why: { [k * (a + b - pa)]: `你算的是${ot}，題目問${nm}。`, [k]: '這是一份的數目，還要乘份數。' } });
      },
      (r, p) => {
        let a, b, c; do { a = ri(r, 1, 4); b = ri(r, 1, 4); c = ri(r, 1, 4); } while ((a === b && b === c) || a + b + c > 10);
        const k = N(r, p, 2, 12), T = (a + b + c) * k, i = ri(r, 0, 2), ps = [a, b, c], nm = '甲乙丙'[i];
        return O('parts3', `甲、乙、丙按 ${a} 份、${b} 份、${c} 份分，共 ${T} 元，${nm}有幾元？`, k * ps[i], '先算一共有幾份。', `共 ${a}＋${b}＋${c}＝${a + b + c} 份，一份 ${T}÷${a + b + c}＝${k}；${nm} ${ps[i]} 份：${k}×${ps[i]}＝${k * ps[i]}。`,
          [k, k * ps[(i + 1) % 3], T - k * ps[i], k * ps[i] + k], `${T}/${a + b + c}*${ps[i]}`, [], { svg: partBar([{ n: a, name: '甲', col: AQ }, { n: b, name: '乙', col: GO }, { n: c, name: '丙', col: PK }], '共 ' + T + ' 元'), why: { [k]: '這是一份的數目，還要乘份數。', [k * ps[(i + 1) % 3]]: `你算的是${'甲乙丙'[(i + 1) % 3]}，題目問${nm}。` } });
      },
      (r, p) => {
        const [X, Y, cl] = pick(r, SETS); let a, b; do { a = ri(r, 1, 5); b = ri(r, 1, 5); } while (a === b);
        const k = N(r, p, 2, 12), x = a * k;
        return O('parts-known', `${X}和${Y}按 ${a} 份對 ${b} 份分，${X}有 ${x} ${cl}，${Y}有幾${cl}？`, k * b, `先由${X}的${cl}數求一份。`, `${X} ${a} 份是 ${x}，一份 ${x}÷${a}＝${k}；${Y} ${b} 份：${k}×${b}＝${k * b}。`,
          [x, k, k * (a + b), x + k * b], `${x}/${a}*${b}`, [], { svg: partBar([{ n: a, name: X + ' ' + x, col: AQ }, { n: b, name: Y + ' ？', col: GO }], X + ' ' + a + ' 份＝' + x), why: { [x]: `${x} 是${X}的${cl}數，題目問${Y}。`, [k]: '這是一份的數目，還要乘份數。' } });
      }
    ],
    B: [
      (r, p) => {
        const a = ri(r, 2, 5), b = ri(r, 1, a - 1), k = N(r, p, 2, 12), x = a * k;
        return O('parts-total', `甲和乙按 ${a} 份對 ${b} 份分，甲有 ${x} 粒，兩人共有幾粒？`, (a + b) * k, '先由甲的粒數求一份。', `甲 ${a} 份是 ${x}，一份 ${x}÷${a}＝${k}；共 ${a}＋${b}＝${a + b} 份：${k}×${a + b}＝${(a + b) * k}。`,
          [b * k, x + b, k, (a + b) * k - k], `${x}/${a}*(${a}+${b})`, [], { svg: partBar([{ n: a, name: '甲 ' + x, col: AQ }, { n: b, name: '乙', col: GO }], '共 ？ 粒'), why: { [b * k]: `${b * k} 只是乙的粒數，還要加上甲的。`, [k]: '這是一份的數目，還要乘全部的份數。' } });
      },
      (r, p) => {
        const a = ri(r, 2, 6), b = ri(r, 1, a - 1), k = N(r, p, 2, 10), d = (a - b) * k;
        return O('parts-diff', `甲和乙按 ${a} 份對 ${b} 份分錢，甲比乙多 ${d} 元，兩人共有幾元？`, (a + b) * k, '多的錢是幾份？', `甲比乙多 ${a}－${b}＝${a - b} 份，一份 ${d}÷${a - b}＝${k} 元；共 ${a + b} 份：${k}×${a + b}＝${(a + b) * k}。`,
          [d, k, a * k, (a + b) * k + k], `${d}/${a - b}*${a + b}`, [], { svg: partBar([{ n: a, name: '甲', col: AQ }, { n: b, name: '乙', col: GO }], '甲比乙多 ' + d + ' 元'), why: { [d]: `${d} 是多出的錢，要先除以多出的份數 ${a - b}，再乘全部份數。`, [a * k]: `${a * k} 只是甲的錢，還要加上乙的。` } });
      },
      (r, p) => {
        let a, b, c, d, k, T, m; const pool = [];
        for (let i = 0; i < 400; i++) { a = ri(r, 1, 5); b = ri(r, 1, 5); c = ri(r, 1, 4); d = ri(r, 1, 4); if (a === b || c === d) continue; const need = (c + d) / gcd(a, c + d); const kk = need * ri(r, 1, 8); if ((a + b) * kk <= 120 && kk >= 2) { k = kk; T = (a + b) * k; m = a * k / (c + d); if (m >= 1 && Number.isInteger(m)) break; } }
        if (!(m >= 1 && Number.isInteger(m))) { a = 3; b = 2; c = 1; d = 2; k = 6; T = 30; m = 6; }
        const A1 = a * k;
        return O('parts-two', `把 ${T} 粒糖按 ${a} 份對 ${b} 份分給甲乙。甲的糖再按 ${c} 份對 ${d} 份分給丙丁。丁有幾粒？`, d * m, '先求甲有幾粒，再分一次。', `共 ${a + b} 份，一份 ${T}÷${a + b}＝${k}，甲有 ${k}×${a}＝${A1} 粒。再分 ${c + d} 份，一份 ${A1}÷${c + d}＝${m}，丁：${m}×${d}＝${d * m}。`,
          [A1, m, c * m, b * k], `${T}/${a + b}*${a}/${c + d}*${d}`, [], { svg: partBar([{ n: a, name: '甲', col: AQ }, { n: b, name: '乙', col: GO }], '共 ' + T + ' 粒'), why: { [A1]: `${A1} 是甲的糖，還要再分給丙丁。`, [m]: '這是第二次分配中一份的數目，丁有 ' + d + ' 份。' } });
      }
    ]
  };
  const verify62 = q => {
    let m;
    if ((m = /^甲和乙按 (\d+) 份對 (\d+) 份分，甲有 (\d+) 粒，兩人共有/.exec(q.q))) { const a = +m[1], b = +m[2], x = +m[3]; for (let k = 1; k <= x; k++) if (a * k === x) return String((a + b) * k); return 'none'; }
    if ((m = /^(.+?)和(.+?)按 (\d+) 份對 (\d+) 份分，共 (\d+) (.)，(.+?)有幾/.exec(q.q))) {
      const a = +m[3], b = +m[4], T = +m[5]; for (let k = 1; k <= T; k++) if ((a + b) * k === T) return String(k * (m[7] === m[1] ? a : b)); return 'none';
    }
    if ((m = /^甲、乙、丙按 (\d+) 份、(\d+) 份、(\d+) 份分，共 (\d+) 元，(.)有/.exec(q.q))) {
      const ps = [+m[1], +m[2], +m[3]], T = +m[4], i = '甲乙丙'.indexOf(m[5]); for (let k = 1; k <= T; k++) if ((ps[0] + ps[1] + ps[2]) * k === T) return String(k * ps[i]); return 'none';
    }
    if ((m = /^(.+?)和(.+?)按 (\d+) 份對 (\d+) 份分，(.+?)有 (\d+) .，(.+?)有幾/.exec(q.q))) {
      const a = +m[3], b = +m[4], x = +m[6]; for (let k = 1; k <= x; k++) if (a * k === x) return String(k * b); return 'none';
    }
    if ((m = /^甲和乙按 (\d+) 份對 (\d+) 份分錢，甲比乙多 (\d+) 元/.exec(q.q))) { const a = +m[1], b = +m[2], d = +m[3]; for (let k = 1; k <= d; k++) if ((a - b) * k === d) return String((a + b) * k); return 'none'; }
    if ((m = /^把 (\d+) 粒糖按 (\d+) 份對 (\d+) 份分給甲乙。甲的糖再按 (\d+) 份對 (\d+) 份分給丙丁/.exec(q.q))) {
      const T = +m[1], a = +m[2], b = +m[3], c = +m[4], d = +m[5]; for (let k = 1; k <= T; k++) if ((a + b) * k === T) { const A1 = a * k; for (let u = 1; u <= A1; u++) if ((c + d) * u === A1) return String(d * u); } return 'none';
    }
    return null;
  };
  WQOly.register({
    id: 'p6-2', grade: 6, n: 2, title: '按份數分配', icon: '🍰',
    card: { motto: '先求一份', example: '3 份對 2 份，共 20：一份 4', art: art62 },
    lesson: [
      { t: 'show', say: '紅珠 3 份、藍珠 2 份，共 20 粒。', scene: { w: 'bars', p: { rows: [{ label: '紅', segs: [{ c: 'a', u: 1, rep: 3 }] }, { label: '藍', segs: [{ c: 'b', u: 1, rep: 2 }] }], braces: [{ from: 0, to: 1, label: '20 粒', c: 'd' }] } } },
      { t: 'show', say: '一共 3＋2＝5 份。20÷5＝4，一份是 4 粒。', scene: { w: 'bars', p: { rows: [{ label: '紅', segs: [{ c: 'a', u: 1, rep: 3 }] }, { label: '藍', segs: [{ c: 'b', u: 1, rep: 2 }] }, { label: '共', segs: [{ c: 't', u: 1, rep: 5 }] }], braces: [{ from: 0, to: 1, label: '20 粒', c: 'd' }] }, still: true } },
      { t: 'predict', say: '一份是 4 粒。', ask: '紅珠有幾粒？', options: ['8', '12', '15'], answer: '12', scene: { w: 'bars', p: { rows: [{ label: '紅', segs: [{ c: 'a', u: 1, rep: 3 }] }, { label: '藍', segs: [{ c: 'b', u: 1, rep: 2 }] }] }, still: true }, reveal: '紅珠 3 份。3×4＝12 粒。' },
      { t: 'do', say: '把 20 粒切成 3 份對 2 份。拉到紅珠的 3 份。', scene: { w: 'array', p: { cols: 5, rows: 4, cut: 3, start: 5 } } },
      { t: 'do', say: '甲 3 份是 12 粒。拉出乙的 2 份。', scene: { w: 'bars', p: { rows: [{ label: '甲', segs: [{ c: 'a', u: 4, rep: 3, text: '12 粒' }] }, { label: '乙', segs: [{ c: 'b', u: 4, rep: 1, edit: true, target: 2, min: 1, max: 3 }] }] } } },
      { t: 'try', say: '先求一份，再乘份數。', scene: { w: 'bars', p: { rows: [{ label: '紅', segs: [{ c: 'a', u: 1, rep: 2 }] }, { label: '藍', segs: [{ c: 'b', u: 1, rep: 3 }] }] }, still: true },
        q: { stem: '紅珠和藍珠按 2 份對 3 份分，共 30 粒。藍珠有幾粒？', options: ['12', '6', '18'], answer: '18', hint: '30÷(2＋3)＝6。', why: { 12: '12 是紅珠的粒數，題目問藍珠。', 6: '6 是一份的數目，藍珠有 3 份。' } } },
      { t: 'card' }
    ],
    gens: g62, verify: verify62
  });

  /* ---- p6-3 工程問題 ---------------------------------------------------------------------------------------------------- */
  const art63 = '<svg viewBox="0 0 120 80"><rect x="10" y="10" width="100" height="14" rx="3" fill="none" stroke="#c3cbf7" stroke-width="1.6"/><rect x="10" y="10" width="66" height="14" rx="3" fill="#3ee6d0" fill-opacity=".5"/><rect x="10" y="30" width="100" height="14" rx="3" fill="none" stroke="#c3cbf7" stroke-width="1.6"/><rect x="10" y="30" width="33" height="14" rx="3" fill="#ffc94a" fill-opacity=".5"/><rect x="10" y="52" width="100" height="22" rx="11" fill="#ff8fc7"/><text x="60" y="63" text-anchor="middle" dominant-baseline="central" font-size="11" font-weight="900" fill="#0b1030">全部看成 1</text></svg>';
  const PAIRS = [[3, 6, 2], [4, 12, 3], [6, 12, 4], [4, 4, 2], [6, 6, 3], [12, 12, 6], [2, 2, 1], [12, 6, 4], [12, 4, 3], [6, 3, 2]];
  const lcm = (a, b) => a / gcd(a, b) * b;
  const DRAIN = [], TRIO = [], RELAY = [], DONE = [];
  for (let a = 2; a <= 12; a++) for (let b = a + 1; b <= 24; b++) if ((a * b) % (b - a) === 0 && a * b / (b - a) <= 24) DRAIN.push([a, b, a * b / (b - a)]);
  [2, 3, 4, 6, 8, 12, 24].forEach((a, i, V) => V.slice(i).forEach((b, j) => V.slice(i + j).forEach(c => { const L = lcm(lcm(a, b), c), q = L / (L / a + L / b + L / c); if (Number.isInteger(q) && q >= 1 && q <= 12) TRIO.push([a, b, c, q]); })));
  [4, 5, 6, 8, 10, 12].forEach(a => [3, 4, 6, 8, 10, 12, 15, 20].forEach(b => { for (let d = 1; d < a; d++) { const x = (a - d) * b / a; if (Number.isInteger(x) && x >= 1) RELAY.push([a, b, d, x]); } }));
  [2, 3, 4, 5, 6, 8, 10, 12].forEach(a => [2, 3, 4, 5, 6, 8, 10, 12].forEach(b => { if (a !== b) for (let d = 1; d * (a + b) < a * b; d++) DONE.push([a, b, d]); }));
  const g63 = {
    A: [
      (r, p) => {
        const [a, b, t] = pick(r, PAIRS), w = pick(r, ['獨做', '單獨做']);
        return O('work', `甲${w} ${a} 日完成，乙${w} ${b} 日完成。兩人合做，幾日完成？`, t, '把全部工作看成幾份。', `全部看成 ${lcm(a, b)} 份：甲每日做 ${lcm(a, b) / a} 份，乙每日做 ${lcm(a, b) / b} 份，合共 ${lcm(a, b) / a + lcm(a, b) / b} 份；${lcm(a, b)}÷${lcm(a, b) / a + lcm(a, b) / b}＝${t} 日。`,
          [a + b, Math.max(a, b), Math.min(a, b), t + 1], `${a}*${b}/(${a}+${b})`, [], { svg: workSvg(a, b, ['甲', '乙']), why: { [a + b]: '日數不能直接相加，要先求每日各做多少。', [Math.max(a, b)]: '合做一定比單獨做快，日數比較少。' } });
      },
      (r, p) => {
        const [a, b, t] = pick(r, PAIRS);
        return O('work-pipe', `水池有甲、乙兩根水管。單開甲管 ${a} 小時注滿，單開乙管 ${b} 小時注滿。兩管齊開，幾小時注滿？`, t, '把整池水看成幾份。', `整池看成 ${lcm(a, b)} 份：甲管每小時注 ${lcm(a, b) / a} 份，乙管注 ${lcm(a, b) / b} 份，合共 ${lcm(a, b) / a + lcm(a, b) / b} 份；${lcm(a, b)}÷${lcm(a, b) / a + lcm(a, b) / b}＝${t} 小時。`,
          [a + b, Math.max(a, b), Math.min(a, b), t + 1], `${a}*${b}/(${a}+${b})`, [], { svg: workSvg(a, b, ['甲管', '乙管']), why: { [a + b]: '時間不能直接相加，要先求每小時各注多少。', [Math.min(a, b)]: '兩管齊開，一定比最快的一根還要快。' } });
      },
      (r, p) => {
        const a = ri(r, 3, 12), d = ri(r, 2, a - 1), s = frac(d, a);
        return O('work-part', `一項工程，甲獨做 ${a} 日完成。甲做了 ${d} 日，完成了全部的幾分之幾？`, s, '甲每日做全部的幾分之一？', `甲每日做 1/${a}，做了 ${d} 日：${d}×1/${a}＝${s}。`,
          [`1/${a}`, frac(a - d, a), frac(d, a + 1), frac(a, d)], '', [], { form: 'simplest', svg: workSvg(a, d, ['全部', '做了']).replace('每一格是 1 日的工作', '每一格是 1 日的工作'), why: { [`1/${a}`]: '這是一日做的，做了好幾日，要乘日數。', [frac(a - d, a)]: '這是還沒有做的部分，題目問做了的。' } });
      }
    ],
    B: [
      (r, p) => {
        for (let i = 0; i < 100; i++) {
          const [a, b] = pick(r, PAIRS), d = ri(r, 1, 3), left = b * (1 - d * (1 / a + 1 / b)), L = Math.round(left);
          if (Math.abs(left - L) < 1e-9 && L > 0 && L <= 12) return O('work-leave', `甲獨做 ${a} 日，乙獨做 ${b} 日。兩人合做 ${d} 日後甲離開，乙再做幾日完成？`, L, '先求合做 ' + d + ' 日完成了多少。', `全部看成 ${lcm(a, b)} 份：合做每日 ${lcm(a, b) / a + lcm(a, b) / b} 份，${d} 日做了 ${d * (lcm(a, b) / a + lcm(a, b) / b)} 份，餘下 ${lcm(a, b) - d * (lcm(a, b) / a + lcm(a, b) / b)} 份；乙每日 ${lcm(a, b) / b} 份，要 ${L} 日。`,
            [b - d, L + 1, d, b], '', [], { svg: workSvg(a, b, ['甲', '乙']), why: { [b - d]: '乙不是全程單獨做，合做時甲也做了一部分。', [b]: '乙合做那幾日也做了工作，不用整個 ' + b + ' 日。' } });
        }
        return O('work-leave', '甲獨做 6 日，乙獨做 12 日。兩人合做 2 日後甲離開，乙再做幾日完成？', 6, '先求合做 2 日完成了多少。', '合做 2 日完成 1/2，餘下 1/2，乙每日 1/12，要 6 日。', [4, 8, 2, 12], '', [], { svg: workSvg(6, 12, ['甲', '乙']), why: { 4: '乙不是全程單獨做，合做時甲也做了一部分。', 12: '乙合做那幾日也做了工作。' } });
      },
      (r, p) => {
        const [a, b, t] = pick(r, PAIRS.filter(x => x[0] !== x[1] || x[0] > 2));
        return O('work-find', `甲獨做 ${a} 日完成。甲乙合做 ${t} 日完成。乙獨做幾日完成？`, b, '先求乙每日做多少。', `合做每日 1/${t}，甲每日 1/${a}，乙每日 1/${t}－1/${a}＝${frac(a - t, a * t)}，乙獨做要 ${b} 日。`,
          [t, a + t, a - t, a * t], '', [], { svg: workSvg(a, t, ['甲', '合做']), why: { [t]: `${t} 日是合做的日數，乙獨做要比合做慢。`, [a - t]: `日數不能直接相減，要看每日做多少。` } });
      },
      (r, p) => {
        for (let i = 0; i < 200; i++) {
          const [a, b, t] = pick(r, PAIRS.filter(x => x[0] > 2)), d = ri(r, 1, a - 1), days = (a - d) * t / a;
          if (Number.isInteger(days) && days >= 1) return O('work-head', `甲獨做 ${a} 日完成，乙獨做 ${b} 日完成。甲先獨做 ${d} 日，乙才加入合做，再做幾日完成？`, days, `先求甲做了 ${d} 日，餘下多少。`, `全部看成 ${lcm(a, b)} 份：甲每日 ${lcm(a, b) / a} 份，先做 ${d} 日共 ${d * lcm(a, b) / a} 份，餘下 ${lcm(a, b) - d * lcm(a, b) / a} 份；合做每日 ${lcm(a, b) / a + lcm(a, b) / b} 份，${lcm(a, b) - d * lcm(a, b) / a}÷${lcm(a, b) / a + lcm(a, b) / b}＝${days} 日。`,
            [d, t, days + 1, a - d], '', [], { svg: workSvg(a, b, ['甲', '乙']), why: { [t]: `${t} 日是由頭合做的日數，甲先做了一部分，合做會少些。`, [a - d]: `${a - d} 是甲餘下的日數，乙加入後兩人合做更快。` } });
        }
        return O('work-head', '甲獨做 6 日完成，乙獨做 12 日完成。甲先獨做 3 日，乙才加入合做，再做幾日完成？', 2, '', '甲做 3 日完成 1/2，餘下 1/2，合做每日 1/4，要 2 日。', [3, 4, 1, 6], '', [], { svg: workSvg(6, 12, ['甲', '乙']), why: { 4: '甲先做了一部分，合做會少些。', 3: '這是甲先做的日數。' } });
      },
      /* R3.31 variety: fill pipe against drain pipe */
      (r, p) => {
        const [a, b, t] = pick(r, DRAIN), ob = pick(r, ['水池', '水缸', '浴缸', '魚缸']), L = lcm(a, b);
        const wr = [...new Set([b - a, a + b, a * b, Math.max(a, b) - t])].filter(x => x !== t && x > 0);
        return O('work-drain', `${ob}有一根進水管和一根排水管。單開進水管 ${a} 小時注滿，單開排水管 ${b} 小時排完。兩管齊開，幾小時注滿？`, t, '把整個' + ob + '看成幾份，進水是加，排水是減。', `整個看成 ${L} 份：進水每小時 ${L / a} 份，排水每小時 ${L / b} 份，每小時淨進 ${L / a - L / b} 份；${L}÷${L / a - L / b}＝${t} 小時。`,
          wr, `${a}*${b}/(${b}-${a})`, [], { svg: workSvg(a, b, ['進', '排']), why: Object.fromEntries([[b - a, '時間不能直接相減，要看每小時進、排各多少份。'], [a + b, '排水是把水放走，要減，不是加。']].filter(([k]) => wr.includes(k))) });
      },
      /* R3.31 variety: three workers together */
      (r, p) => {
        const [a, b, c, t] = pick(r, TRIO), th = pick(r, ['一幅牆要油漆', '一批貨要搬運', '一塊草地要修剪', '一份工作要完成']), L = lcm(lcm(a, b), c);
        const wr = [...new Set([a + b + c, Math.min(a, b, c), t + 1, Math.max(t - 1, 1)])].filter(x => x !== t);
        return O('work-three', `${th}：甲獨做 ${a} 日，乙獨做 ${b} 日，丙獨做 ${c} 日。三人合做，幾日完成？`, t, '把全部看成幾份，三人每日各做幾份？', `全部看成 ${L} 份：三人每日做 ${L / a}、${L / b}、${L / c} 份，合共 ${L / a + L / b + L / c} 份；${L}÷${L / a + L / b + L / c}＝${t} 日。`,
          wr, `1/(1/${a}+1/${b}+1/${c})`, [], { svg: workSvg(a, b, ['甲', '乙']).replace('每一格是 1 日的工作', '丙也一起做'), why: Object.fromEntries([[a + b + c, '日數不能直接相加，要先求每日各做多少。'], [Math.min(a, b, c), '三人合做一定比最快的一個還要快。']].filter(([k]) => wr.includes(k))) });
      },
      /* R3.31 variety: relay */
      (r, p) => {
        const c = pick(r, RELAY), [a, b, d, days] = c;
        const wr = [...new Set([a - d, b - d, d, b])].filter(x => x !== days && x > 0);
        return O('work-relay', `甲獨做 ${a} 日完成，乙獨做 ${b} 日完成。甲先做了 ${d} 日，其餘由乙接手做完。乙要做幾日？`, days, `先求甲做了 ${d} 日，餘下多少。`, `甲做了 ${d}/${a}，餘下 ${frac(a - d, a)}；乙每日做 1/${b}，要 ${frac(a - d, a)}×${b}＝${days} 日。`,
          wr, `(${a}-${d})/${a}*${b}`, [], { svg: workSvg(a, b, ['甲', '乙']), why: Object.fromEntries([[a - d, '那是甲餘下的日數，乙的速度不同，要看餘下幾分之幾。'], [b, '乙只做餘下的一部分，不用整個 ' + b + ' 日。']].filter(([k]) => wr.includes(k))) });
      },
      /* R3.31 variety: how much is done after working together */
      (r, p) => {
        const [a, b, d] = pick(r, DONE), ans = frac(d * (a + b), a * b);
        const wr = [...new Set([frac(d, a), frac(d, b), frac(d * (a + b), a + b + 1), frac(a * b - d * (a + b), a * b)])].filter(x => x !== ans);
        return O('work-done', `甲獨做 ${a} 日完成，乙獨做 ${b} 日完成。兩人合做 ${d} 日，完成了全部的幾分之幾？`, ans, '兩人每日各做全部的幾分之一？先加起來。', `甲每日 1/${a}，乙每日 1/${b}，合做每日 ${frac(a + b, a * b)}；${d} 日：${d}×${frac(a + b, a * b)}＝${ans}。`,
          wr, '', [], { form: 'simplest', svg: workSvg(a, b, ['甲', '乙']), why: Object.fromEntries([[frac(d, a), '這只是甲做的，乙也有做。'], [frac(a * b - d * (a + b), a * b), '這是還沒有做完的部分，題目問做了的。']].filter(([k]) => wr.includes(k))) });
      },
      /* R3.31 variety: find the second machine */
      (r, p) => {
        const [a, b, t] = pick(r, PAIRS.filter(x => x[0] !== x[1] || x[0] > 2)), th = pick(r, [['抽水機', '抽', '魚塘', '小時'], ['印刷機', '印', '一批傳單', '小時'], ['割草機', '割', '一塊草地', '小時'], ['噴漆機', '噴', '一幅牆', '小時']]);
        const wr = [...new Set([t, a + t, Math.abs(a - t), a * t])].filter(x => x !== b);
        return O('work-find', `甲${th[0]}單獨${th[1]}${th[2]}要 ${a} ${th[3]}。甲、乙兩部一起${th[1]}要 ${t} ${th[3]}。乙單獨${th[1]}要幾${th[3]}？`, b, '先求乙每' + th[3] + '做多少。', `合做每${th[3]} 1/${t}，甲每${th[3]} 1/${a}，乙每${th[3]} 1/${t}－1/${a}＝${frac(a - t, a * t)}，乙獨做要 ${b} ${th[3]}。`,
          wr, '', [], { svg: workSvg(a, t, ['甲', '合做']), why: Object.fromEntries([[t, `${t} 是合做的時間，乙獨做要比合做慢。`], [Math.abs(a - t), '時間不能直接相減，要看每次做多少。']].filter(([k]) => wr.includes(k))) });
      }
    ]
  };
  const verify63 = q => {
    let m;
    const F = (n, d) => [n, d];
    if ((m = /^甲獨做 (\d+) 日完成，乙獨做 (\d+) 日完成。兩人合做 (\d+) 日，完成了全部/.exec(q.q))) { const a = +m[1], b = +m[2], d = +m[3]; return frac(d * (a + b), a * b); }
    if ((m = /^甲(?:單獨|獨)做 (\d+) 日完成，乙(?:單獨|獨)做 (\d+) 日完成。兩人合做/.exec(q.q)) || (m = /^水池有甲、乙兩根水管。單開甲管 (\d+) 小時注滿，單開乙管 (\d+) 小時注滿/.exec(q.q))) {
      const a = +m[1], b = +m[2]; for (let t = 1; t <= 400; t++) if (t / a + t / b >= 1 - 1e-12) return String(t); return 'none';
    }
    if ((m = /^.{2,3}有一根進水管和一根排水管。單開進水管 (\d+) 小時注滿，單開排水管 (\d+) 小時排完/.exec(q.q))) { const a = +m[1], b = +m[2]; for (let t = 1; t <= 400; t++) if (Math.abs(t / a - t / b - 1) < 1e-9) return String(t); return 'none'; }
    if ((m = /^.+：甲獨做 (\d+) 日，乙獨做 (\d+) 日，丙獨做 (\d+) 日。三人合做/.exec(q.q))) { for (let t = 1; t <= 400; t++) if (Math.abs(t / +m[1] + t / +m[2] + t / +m[3] - 1) < 1e-9) return String(t); return 'none'; }
    if ((m = /^甲獨做 (\d+) 日完成，乙獨做 (\d+) 日完成。甲先做了 (\d+) 日，其餘由乙接手/.exec(q.q))) { for (let t = 1; t <= 400; t++) if (Math.abs(+m[3] / +m[1] + t / +m[2] - 1) < 1e-9) return String(t); return 'none'; }
    if ((m = /^甲.{2,3}單獨.{1,2}.+要 (\d+) 小時。甲、乙兩部一起.{1,2}要 (\d+) 小時。乙單獨/.exec(q.q))) { const a = +m[1], t = +m[2]; for (let b = 1; b <= 400; b++) if (Math.abs(t / a + t / b - 1) < 1e-9) return String(b); return 'none'; }
    if ((m = /^一項工程，甲獨做 (\d+) 日完成。甲做了 (\d+) 日/.exec(q.q))) return frac(+m[2], +m[1]);
    if ((m = /^甲獨做 (\d+) 日，乙獨做 (\d+) 日。兩人合做 (\d+) 日後甲離開/.exec(q.q))) {
      const a = +m[1], b = +m[2], d = +m[3]; for (let t = 1; t <= 400; t++) if (Math.abs(d / a + d / b + t / b - 1) < 1e-9) return String(t); return 'none';
    }
    if ((m = /^甲獨做 (\d+) 日完成。甲乙合做 (\d+) 日完成。乙獨做/.exec(q.q))) {
      const a = +m[1], t = +m[2]; for (let b = 1; b <= 400; b++) if (Math.abs(t / a + t / b - 1) < 1e-9) return String(b); return 'none';
    }
    if ((m = /^甲獨做 (\d+) 日完成，乙獨做 (\d+) 日完成。甲先獨做 (\d+) 日，乙才加入/.exec(q.q))) {
      const a = +m[1], b = +m[2], d = +m[3]; for (let t = 1; t <= 400; t++) if (Math.abs(d / a + t / a + t / b - 1) < 1e-9) return String(t); return 'none';
    }
    return null;
  };
  WQOly.register({
    id: 'p6-3', grade: 6, n: 3, title: '工程問題', icon: '🏗️',
    card: { motto: '把全部看成 1', example: '甲 3 日、乙 6 日：合做 2 日', art: art63 },
    lesson: [
      { t: 'show', say: '甲獨做 3 日，乙獨做 6 日。合做幾日？', scene: { w: 'bars', p: { rows: [{ label: '全部', segs: [{ u: 6, c: 't', text: '全部 ＝ 1' }] }, { label: '甲', segs: [{ u: 2, c: 'a', rep: 3, text: '3 日' }] }, { label: '乙', segs: [{ u: 1, c: 'b', rep: 6, text: '6 日' }] }] }, still: true } },
      { t: 'show', say: '把全部看成 6 份。', scene: { w: 'bars', p: { rows: [{ label: '全部', segs: [{ u: 6, c: 't', text: '6 份' }] }, { label: '甲', segs: [{ u: 2, c: 'a', text: '2 份' }] }, { label: '乙', segs: [{ u: 1, c: 'b', text: '1 份' }] }] }, still: true } },
      { t: 'predict', say: '甲每日做 2 份，乙每日做 1 份。', ask: '兩人合做，每日做幾份？', options: ['2', '3', '6'], answer: '3', scene: { w: 'bars', p: { rows: [{ label: '甲', segs: [{ u: 2, c: 'a', text: '2 份' }] }, { label: '乙', segs: [{ u: 1, c: 'b', text: '1 份' }] }, { label: '合做', segs: [{ u: 3, c: 't', text: '？' }] }] }, still: true }, reveal: '2＋1＝3 份。兩人每日做 3 份。' },
      { t: 'do', say: '每一格是 1 日。拉出合做的日數，剛好 6 份。', scene: { w: 'bars', p: { rows: [{ label: '全部', segs: [{ u: 6, c: 't', text: '全部 6 份' }, { u: 3, c: 'd', dashed: true, text: '' }] }, { label: '合做', segs: [{ u: 3, c: 'a', rep: 1, edit: true, target: 2, min: 1, max: 3, text: '合做' }] }] } } },
      { t: 'show', say: '全部 6 份，每日 3 份。6÷3＝2 日。', scene: { w: 'bars', p: { rows: [{ label: '全部', segs: [{ u: 6, c: 't', text: '6 份' }] }, { label: '合做', segs: [{ u: 3, c: 'a', rep: 2, text: '2 日' }] }] }, still: true } },
      { t: 'do', say: '再試一次：甲 4 日、乙 12 日。全部看成 12 份。', scene: { w: 'bars', p: { rows: [{ label: '全部', segs: [{ u: 12, c: 't', text: '全部 12 份' }, { u: 4, c: 'd', dashed: true, text: '' }] }, { label: '合做', segs: [{ u: 4, c: 'a', rep: 1, edit: true, target: 3, min: 1, max: 4, text: '合做' }] }] } } },
      { t: 'try', say: '先看每日各做多少份。', scene: { w: 'bars', p: { rows: [{ label: '全部', segs: [{ u: 6, c: 't', text: '6 份' }] }, { label: '甲', segs: [{ u: 1, c: 'a', rep: 6, text: '6 日' }] }, { label: '乙', segs: [{ u: 2, c: 'b', rep: 3, text: '3 日' }] }] }, still: true },
        q: { stem: '甲獨做 6 日完成，乙獨做 3 日完成。兩人合做，幾日完成？', options: ['2', '4', '9'], answer: '2', hint: '全部看成 6 份：甲每日 1 份，乙每日 2 份。', why: { 9: '日數不能直接相加，要看每日各做多少。', 4: '合做每日 3 份，6÷3 才是日數。' } } },
      { t: 'card' }
    ],
    gens: g63, verify: verify63
  });

  /* ---- p6-4 相遇與追及 (first card teaches speed) ---------------------------------------------------------------------- */
  const art64 = '<svg viewBox="0 0 120 80"><circle cx="20" cy="30" r="9" fill="#3ee6d0"/><circle cx="100" cy="30" r="9" fill="#ffc94a"/><path d="M32 30h24m-5 -5l5 5l-5 5M88 30h-24m5 -5l-5 5l5 5" stroke="#c3cbf7" stroke-width="2.4" fill="none" stroke-linecap="round" stroke-linejoin="round"/><rect x="10" y="50" width="100" height="22" rx="11" fill="#ff8fc7"/><text x="60" y="61" text-anchor="middle" dominant-baseline="central" font-size="11" font-weight="900" fill="#0b1030">路程÷速度和</text></svg>';
  const sp = (r, p, lo, hi) => 5 * N(r, p, lo / 5, hi / 5);
  const g64 = {
    A: [
      (r, p) => {
        const a = sp(r, p, 30, 60), b = sp(r, p, 20, 40), t = ri(r, 2, 6), D = (a + b) * t;
        return O('meet', `甲乙相距 ${D} 米，甲每分走 ${a} 米，乙每分走 ${b} 米，面對面走，幾分鐘相遇？`, t, '兩人每分共走多少米？', `每分共走 ${a}＋${b}＝${a + b} 米；${D}÷${a + b}＝${t} 分鐘。`,
          [t + 1, t - 1 || 3, Math.floor(D / a), a + b], `${D}/(${a}+${b})`, [], { svg: road('meet', D + ' 米', a, b), why: { [a + b]: `${a + b} 是每分共走的米數，要用路程除以它。`, [Math.floor(D / a)]: '兩人一起走，不是只有甲一個人走。' } });
      },
      (r, p) => {
        const a = sp(r, p, 30, 60), b = sp(r, p, 20, 40), t = ri(r, 2, 6);
        return O('meet-dist', `甲每分走 ${a} 米，乙每分走 ${b} 米，兩人從兩地面對面走，${t} 分鐘後相遇。兩地相距幾米？`, (a + b) * t, '先求每分共走多少米。', `每分共走 ${a}＋${b}＝${a + b} 米；${a + b}×${t}＝${(a + b) * t} 米。`,
          [a + b, a * t, b * t, (a + b) * t + a], `(${a}+${b})*${t}`, [], { svg: road('meet', '？ 米', a, b), why: { [a + b]: `${a + b} 是每分共走的米數，還要乘 ${t} 分鐘。`, [a * t]: `${a * t} 只是甲走的路，還要加上乙走的。` } });
      },
      (r, p) => {
        const a = sp(r, p, 30, 60), b = sp(r, p, 20, 40), t = ri(r, 2, 6), D = (a + b) * t;
        return O('meet-speed', `兩地相距 ${D} 米，甲乙面對面走，${t} 分鐘後相遇。甲每分走 ${a} 米，乙每分走幾米？`, b, '先求兩人每分共走多少米。', `每分共走 ${D}÷${t}＝${a + b} 米；乙每分 ${a + b}－${a}＝${b} 米。`,
          [a + b, D / t - 2 * a > 0 ? D / t - 2 * a : b + 5, a, D / a | 0], `${D}/${t}-${a}`, [], { svg: road('meet', D + ' 米', a, '？'), why: { [a + b]: `${a + b} 是兩人每分共走的米數，還要減去甲的。`, [a]: `${a} 是甲的速度，題目問乙。` } });
      }
    ],
    B: [
      (r, p) => {
        const b = sp(r, p, 30, 60), a = b + 5 * ri(r, 1, 6), t = ri(r, 2, 8), D = (a - b) * t;
        return O('chase', `乙在甲前面 ${D} 米，甲每分走 ${a} 米，乙每分走 ${b} 米，同向而行，甲幾分鐘追上乙？`, t, '甲每分比乙多走多少米？', `每分追近 ${a}－${b}＝${a - b} 米；${D}÷${a - b}＝${t} 分鐘。`,
          [t + 1, Math.floor(D / a), a - b, t * 2], `${D}/(${a}-${b})`, [], { svg: road('chase', D + ' 米', a, b), why: { [a - b]: `${a - b} 是每分追近的米數，還要用路程除以它。`, [Math.floor(D / a)]: '乙也在走，不是甲一個人走完這段路。' } });
      },
      (r, p) => {
        let a, b, m, g;
        for (let i = 0; i < 300; i++) { b = 5 * ri(r, 4, 12); a = b + 5 * ri(r, 1, 6); g = a - b; const need = g / gcd(b, g); m = need * ri(r, 1, 3); if (m >= 2 && m <= 8 && b * m <= 600) break; }
        if (!(m >= 2)) { a = 60; b = 40; m = 4; g = 20; }
        const D = b * m, t = D / g;
        return O('chase-start', `乙先走 ${m} 分鐘，甲才出發追。乙每分走 ${b} 米，甲每分走 ${a} 米。甲走幾分鐘追上乙？`, t, `先求甲出發時，乙已走了多遠。`, `乙先走 ${b}×${m}＝${D} 米；甲每分追近 ${a}－${b}＝${g} 米；${D}÷${g}＝${t} 分鐘。`,
          [m, D, g, t + m], `${b}*${m}/(${a}-${b})`, [], { svg: road('chase', '先走 ' + D + ' 米', a, b), why: { [D]: `${D} 米是乙先走的路，還要除以每分追近的米數。`, [t + m]: '題目問甲走了幾分鐘，不用加上乙先走的時間。' } });
      },
      (r, p) => {
        const b = sp(r, p, 30, 60), a = b + 5 * ri(r, 1, 6), t = ri(r, 2, 8);
        return O('chase-dist', `甲在乙後面，甲每分走 ${a} 米，乙每分走 ${b} 米，同向而行，${t} 分鐘後追上。開始時兩人相距幾米？`, (a - b) * t, '甲每分追近多少米？', `每分追近 ${a}－${b}＝${a - b} 米；${a - b}×${t}＝${(a - b) * t} 米。`,
          [a - b, a * t, (a + b) * t, b * t], `(${a}-${b})*${t}`, [], { svg: road('chase', '？ 米', a, b), why: { [a - b]: `${a - b} 是每分追近的米數，還要乘 ${t} 分鐘。`, [(a + b) * t]: '同向而行，要用速度差，不是速度和。' } });
      },
      (r, p) => {
        let a, b, t, ans;
        for (let i = 0; i < 300; i++) { a = sp(r, p, 30, 60); b = sp(r, p, 20, 40); t = ri(r, 2, 6); if ((b * t) % a === 0 && b * t / a >= 1 && a !== b) break; }
        if ((b * t) % a !== 0) { a = 60; b = 40; t = 3; }
        ans = b * t / a;
        return O('meet-after', `甲乙面對面走，${t} 分鐘後相遇。甲每分走 ${a} 米，乙每分走 ${b} 米。相遇後，甲再走幾分鐘到乙出發的地方？`, ans, '乙走過的路，甲還沒有走。', `乙走了 ${b}×${t}＝${b * t} 米，這是甲還要走的路；${b * t}÷${a}＝${ans} 分鐘。`,
          [t, b * t, (a + b) * t / a | 0, ans + 1], `${b}*${t}/${a}`, [], { svg: road('meet', '相遇後', a, b), why: { [t]: `${t} 分鐘是相遇前走的時間，相遇後甲要走乙走過的路。`, [b * t]: `${b * t} 米是路程，還要除以甲的速度。` } });
      }
    ]
  };
  const verify64 = q => {
    let m;
    if ((m = /^甲乙相距 (\d+) 米，甲每分走 (\d+) 米，乙每分走 (\d+) 米，面對面走/.exec(q.q))) { for (let t = 1; t <= 500; t++) if (t * (+m[2]) + t * (+m[3]) === +m[1]) return String(t); return 'none'; }
    if ((m = /^甲每分走 (\d+) 米，乙每分走 (\d+) 米，兩人從兩地面對面走，(\d+) 分鐘後相遇/.exec(q.q))) { let d = 0; for (let i = 0; i < +m[3]; i++) d += +m[1] + +m[2]; return String(d); }
    if ((m = /^兩地相距 (\d+) 米，甲乙面對面走，(\d+) 分鐘後相遇。甲每分走 (\d+) 米/.exec(q.q))) { for (let b = 1; b <= 300; b++) if ((+m[3] + b) * +m[2] === +m[1]) return String(b); return 'none'; }
    if ((m = /^乙在甲前面 (\d+) 米，甲每分走 (\d+) 米，乙每分走 (\d+) 米，同向/.exec(q.q))) { for (let t = 1; t <= 500; t++) if (t * (+m[2]) - t * (+m[3]) === +m[1]) return String(t); return 'none'; }
    if ((m = /^乙先走 (\d+) 分鐘，甲才出發追。乙每分走 (\d+) 米，甲每分走 (\d+) 米/.exec(q.q))) { for (let t = 1; t <= 500; t++) if (t * (+m[3]) === (t + +m[1]) * (+m[2])) return String(t); return 'none'; }
    if ((m = /^甲在乙後面，甲每分走 (\d+) 米，乙每分走 (\d+) 米，同向而行，(\d+) 分鐘後追上/.exec(q.q))) { for (let D = 1; D <= 5000; D++) if (D + (+m[3]) * (+m[2]) === (+m[3]) * (+m[1])) return String(D); return 'none'; }
    if ((m = /^甲乙面對面走，(\d+) 分鐘後相遇。甲每分走 (\d+) 米，乙每分走 (\d+) 米。相遇後/.exec(q.q))) { const rest = +m[3] * +m[1]; for (let t = 1; t <= 500; t++) if (t * (+m[2]) === rest) return String(t); return 'none'; }
    return null;
  };
  WQOly.register({
    id: 'p6-4', grade: 6, n: 4, title: '相遇與追及', icon: '🏃',
    card: { motto: '速度和、速度差', example: '相遇：路程÷速度和', art: art64 },
    lesson: [
      { t: 'show', say: '速度＝路程÷時間。每分走 60 米，5 分走 300 米。', scene: { w: 'bars', p: { rows: [{ label: '路程', segs: [{ u: 30, c: 't', text: '300 米' }] }, { label: '每分', segs: [{ u: 6, c: 'a', rep: 5, text: '60 米 × 5 分' }] }] }, still: true } },
      { t: 'do', say: '每一格是 1 分鐘，走 60 米。拉到走完 300 米。', scene: { w: 'bars', p: { rows: [{ label: '路程', segs: [{ u: 30, c: 't', text: '300 米' }, { u: 6, c: 'd', dashed: true, text: '' }] }, { label: '每分', segs: [{ u: 6, c: 'a', rep: 1, edit: true, target: 5, min: 1, max: 6, text: '每分 60 米' }] }] } } },
      { t: 'predict', say: '相距 300 米，面對面走。甲每分 60 米，乙每分 40 米。', ask: '兩人每分共走多少米？', options: ['20', '60', '100'], answer: '100', scene: { w: 'bars', p: { rows: [{ label: '路程', segs: [{ u: 15, c: 't', text: '300 米' }] }, { label: '甲', segs: [{ u: 3, c: 'a', rep: 3, text: '3 分' }] }, { label: '乙', segs: [{ u: 9, c: 'b', rep: 1, dashed: true, text: '' }, { u: 2, c: 'b', rep: 3, text: '3 分' }] }] }, still: true }, reveal: '60＋40＝100 米。兩人每分共走 100 米。' },
      { t: 'do', say: '兩人每分共走 100 米。拉到剛好走完 300 米。', scene: { w: 'bars', p: { rows: [{ label: '路程', segs: [{ u: 15, c: 't', text: '300 米' }, { u: 5, c: 'd', dashed: true, text: '' }] }, { label: '共走', segs: [{ u: 5, c: 'g', rep: 1, edit: true, target: 3, min: 1, max: 4, text: '每分 100 米' }] }] } } },
      { t: 'show', say: '相遇：路程÷速度和。300÷100＝3 分鐘。', scene: { w: 'bars', p: { rows: [{ label: '路程', segs: [{ u: 15, c: 't', text: '300 米' }] }, { label: '甲', segs: [{ u: 3, c: 'a', rep: 3, text: '3 分' }] }, { label: '乙', segs: [{ u: 9, c: 'b', rep: 1, dashed: true, text: '' }, { u: 2, c: 'b', rep: 3, text: '3 分' }] }] }, still: true } },
      { t: 'predict', say: '乙在甲前面，同向而行。甲每分 60 米，乙每分 40 米。', ask: '甲每分追近乙多少米？', options: ['20', '100', '60'], answer: '20', scene: { w: 'bars', p: { rows: [{ label: '甲', segs: [{ u: 3, c: 'a', text: '60' }] }, { label: '乙', segs: [{ u: 2, c: 'b', text: '40' }, { u: 1, c: 'd', text: '20' }] }] }, still: true }, reveal: '60－40＝20 米。追及：路程÷速度差。' },
      { t: 'try', say: '相遇，用速度和。', scene: { w: 'bars', p: { rows: [{ label: '路程', segs: [{ u: 20, c: 't', text: '400 米' }] }, { label: '共走', segs: [{ u: 5, c: 'g', rep: 4, text: '每分 100 米' }] }] }, still: true },
        q: { stem: '甲乙相距 400 米，面對面走。甲每分走 70 米，乙每分走 30 米，幾分鐘相遇？', options: ['4', '100', '6'], answer: '4', hint: '每分共走 70＋30＝100 米。', why: { 100: '100 是每分共走的米數，要用 400 去除。', 6: '6 不是 400 除以速度和。' } } },
      { t: 'card' }
    ],
    gens: g64, verify: verify64
  });

  /* ---- p6-5 立體與展開圖 -------------------------------------------------------------------------------------------------- */
  const art65 = '<svg viewBox="0 0 120 80"><polygon points="60,6 92,22 60,38 28,22" fill="#ffd877" stroke="#0b1030" stroke-width="1.5"/><polygon points="28,22 60,38 60,70 28,54" fill="#e3a92b" stroke="#0b1030" stroke-width="1.5"/><polygon points="92,22 60,38 60,70 92,54" fill="#b97f10" stroke="#0b1030" stroke-width="1.5"/><circle cx="60" cy="40" r="7" fill="#ff8fc7"/></svg>';
  const IT = ['積木', '木塊', '魔方'];
  /* the net: a belt of 4 squares in a row, one square above and one below. Fold it by rolling a cube over the squares (independent of the formula used by the generator) */
  const foldOpp = (belt, ti, top, bi, bot) => {
    const cells = [], at = new Map();
    belt.forEach((v, i) => { cells.push({ x: i, y: 0, v }); }); cells.push({ x: ti, y: -1, v: top }); cells.push({ x: bi, y: 1, v: bot });
    cells.forEach(c => at.set(c.x + ',' + c.y, c));
    const face = {}, seen = new Set(), roll = (o2, dx, dy) => { const [B, T, Nn, S, E, Wf] = o2; if (dx === 1) return [E, Wf, Nn, S, T, B]; if (dx === -1) return [Wf, E, Nn, S, B, T]; if (dy === -1) return [Nn, S, T, B, E, Wf]; return [S, Nn, B, T, E, Wf]; };
    const q = [{ c: cells[0], o: ['B', 'T', 'N', 'S', 'E', 'W'] }]; seen.add('0,0'); face[cells[0].v] = 'B';
    while (q.length) {
      const { c, o: oo } = q.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, -1], [0, 1]]) { const k = (c.x + dx) + ',' + (c.y + dy), nx = at.get(k); if (!nx || seen.has(k)) continue; seen.add(k); const no = roll(oo, dx, dy); face[nx.v] = no[0]; q.push({ c: nx, o: no }); }
    }
    const opp = { B: 'T', T: 'B', N: 'S', S: 'N', E: 'W', W: 'E' }, res = {}; for (const v in face) for (const w in face) if (face[w] === opp[face[v]]) res[v] = +w;
    return res;
  };
  const makeNet = r => { const nums = shuffle(r, [1, 2, 3, 4, 5, 6]), belt = nums.slice(0, 4), ti = ri(r, 0, 3), bi = ri(r, 0, 3); return { belt, ti, bi, top: nums[4], bot: nums[5] }; };
  const netText = n => `展開圖橫排四格 ${n.belt.join('、')}，${n.top} 在 ${n.belt[n.ti]} 上面，${n.bot} 在 ${n.belt[n.bi]} 下面。`;
  const g65 = {
    A: [
      (r, p) => {
        const n = pick(r, [3, 4]), k = pick(r, [['一面', 1], ['兩面', 2], ['三面', 3], ['沒有']]), it = pick(r, IT), c = { 1: 6 * (n - 2) ** 2, 2: 12 * (n - 2), 3: 8 }, s = k[1] ? c[k[1]] : (n - 2) ** 3;
        return O('cube', `把 ${n}×${n}×${n} 的${it}外面全部塗色，再切成 ${n ** 3} 個小正方體。${k[1] ? `${k[0]}有色的` : '沒有塗色的'}有幾個？`, s, '想想它們在大正方體的哪個位置。',
          `${k[1] === 3 ? '三面有色的在 8 個角。' : k[1] === 2 ? `兩面有色的在 12 條邊，每條 ${n - 2} 個：12×${n - 2}。` : k[1] === 1 ? `一面有色的在 6 個面的中間，每面 ${n - 2}×${n - 2} 個。` : `沒有塗色的在最中間，${n - 2}×${n - 2}×${n - 2} 個。`}答案 ${s}。`,
          [8, 12, 6 * (n - 2) ** 2, 12 * (n - 2), (n - 2) ** 3, n ** 3].filter(x => x !== s), '', [], { svg: iso(n), why: { 8: '8 是三面有色的角塊。', 12: n === 3 ? '12 是 3×3×3 兩面有色的邊塊。' : '12 是 12 條邊的條數，每條還有 ' + (n - 2) + ' 個。', [n ** 3]: `${n ** 3} 是全部的小正方體，題目問其中一類。` } });
      },
      (r, p) => {
        const n = (b0 => b0)(pick(r, [1, 2, 3])), nt = makeNet(r), q = pick(r, [...nt.belt, nt.top, nt.bot]), opp = foldOpp(nt.belt, nt.ti, nt.top, nt.bi, nt.bot);
        const pos = nt.belt.indexOf(q), ans = pos >= 0 ? nt.belt[(pos + 2) % 4] : q === nt.top ? nt.bot : nt.top;
        return O('net-opp', `${netText(nt)}摺成正方體，${q} 的對面是幾？`, ans, '橫排四格會圍成一圈，對面隔一格。',
          pos >= 0 ? `橫排四格圍成一圈，${q} 的對面隔一格：${ans}。` : `上面和下面兩格是正方體的上蓋和底，互相對面：${ans}。`,
          [nt.belt[(pos + 1 + 4) % 4] || nt.top, nt.belt[(pos + 3) % 4] || nt.bot, nt.top === q ? nt.belt[0] : nt.top, q + 1 > 6 ? 1 : q + 1].filter(x => x !== ans),
          '', [], { svg: netSvg(nt.belt, nt.ti, nt.top, nt.bi, nt.bot, q), why: { [pos >= 0 ? nt.belt[(pos + 1) % 4] : nt.belt[0]]: pos >= 0 ? `${nt.belt[(pos + 1) % 4]} 在 ${q} 旁邊，是鄰面，不是對面。` : `${nt.belt[0]} 在側面，不是上下對面。`, [pos >= 0 ? nt.belt[(pos + 3) % 4] : nt.belt[1]]: pos >= 0 ? `${nt.belt[(pos + 3) % 4]} 也在 ${q} 旁邊，是鄰面。` : `${nt.belt[1]} 在側面，不是上下對面。` } });
      }
    ],
    B: [
      (r, p) => {
        const n = pick(r, [3, 4]), it = pick(r, IT), j = ri(r, 0, 2), tot = n ** 3 - (n - 2) ** 3, c = { 0: tot, 1: 6 * (n - 2) ** 2 + 12 * (n - 2), 2: 12 * (n - 2) + 8 };
        const txt = ['至少一面有色的', '一面或兩面有色的', '兩面或三面有色的'][j];
        return O('cube2', `把 ${n}×${n}×${n} 的${it}外面全部塗色，再切成 ${n ** 3} 個小正方體。${txt}有幾個？`, c[j], '分開數每一種，再加起來。',
          j === 0 ? `全部 ${n ** 3} 個，沒有塗色的 ${(n - 2) ** 3} 個：${n ** 3}－${(n - 2) ** 3}＝${tot}。` : j === 1 ? `一面 6×${(n - 2) ** 2}＝${6 * (n - 2) ** 2}，兩面 12×${n - 2}＝${12 * (n - 2)}，加起來 ${c[1]}。` : `兩面 12×${n - 2}＝${12 * (n - 2)}，三面 8，加起來 ${c[2]}。`,
          [6 * (n - 2) ** 2, 12 * (n - 2), 8, n ** 3, c[j] + 8, c[j] - 6].filter(x => x !== c[j]), '', [], { svg: iso(n), why: { [n ** 3]: `${n ** 3} 是全部的小正方體，要減去不合條件的。`, [j === 0 ? (n - 2) ** 3 : 8]: j === 0 ? '這是沒有塗色的，題目問有塗色的。' : '8 只是三面有色的，題目問兩類。' } });
      },
      (r, p) => {
        const n = pick(r, [2, 3, 4]), it = pick(r, IT);
        return O('cube-faces', `把 ${n}×${n}×${n} 的${it}外面全部塗色，再切成 ${n ** 3} 個小正方體。所有小正方體上，塗了色的面共有幾個？`, 6 * n * n, '大正方體的外面一共有幾個小方格？', `大正方體有 6 個面，每面 ${n}×${n}＝${n * n} 個小方格：6×${n * n}＝${6 * n * n}。`,
          [n ** 3, 6 * n, 3 * n * n, 8 * 3 + 12 * (n - 2) * 2], `6*${n}*${n}`, [], { svg: iso(n), why: { [n ** 3]: '這是小正方體的個數，題目問塗了色的面。', [6 * n]: `每個面有 ${n}×${n} 個小方格，不是 ${n} 個。` } });
      },
      (r, p) => {
        const nt = makeNet(r), pr = shuffle(r, [...nt.belt, nt.top, nt.bot]).slice(0, 2), opp = foldOpp(nt.belt, nt.ti, nt.top, nt.bi, nt.bot), ans = opp[pr[0]] + opp[pr[1]];
        return O('net-sum', `${netText(nt)}摺成正方體，${pr[0]} 和 ${pr[1]} 的對面，兩數加起來是多少？`, ans, '先分別找出兩個數的對面。', `${pr[0]} 的對面是 ${opp[pr[0]]}，${pr[1]} 的對面是 ${opp[pr[1]]}。${opp[pr[0]]}＋${opp[pr[1]]}＝${ans}。`,
          [pr[0] + pr[1], opp[pr[0]], opp[pr[1]], ans + 1], '', [], { svg: netSvg(nt.belt, nt.ti, nt.top, nt.bi, nt.bot, 0), why: { [pr[0] + pr[1]]: `${pr[0]}＋${pr[1]} 是原來兩個數的和，題目要的是它們的對面。`, [opp[pr[0]]]: `${opp[pr[0]]} 只是 ${pr[0]} 的對面，還要加上另一個。` } });
      }
    ]
  };
  const verify65 = q => {
    let m;
    if ((m = /^把 (\d)×\d×\d 的.+切成 \d+ 個小正方體。(.+)有幾個/.exec(q.q))) {
      const n = +m[1]; const f = { '一面有色的': 6 * (n - 2) ** 2, '兩面有色的': 12 * (n - 2), '三面有色的': 8, '沒有塗色的': (n - 2) ** 3, '至少一面有色的': n ** 3 - (n - 2) ** 3, '一面或兩面有色的': 6 * (n - 2) ** 2 + 12 * (n - 2), '兩面或三面有色的': 12 * (n - 2) + 8 }[m[2]];
      if (f != null) return String(f);
    }
    if ((m = /^把 (\d)×\d×\d 的.+切成 \d+ 個小正方體。所有小正方體上，塗了色的面共有幾個？/.exec(q.q))) {
      const n = +m[1]; let faces = 0; for (let x = 0; x < n; x++) for (let y = 0; y < n; y++) for (let z = 0; z < n; z++) for (const [dx, dy, dz] of [[1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1]]) { const X = x + dx, Y = y + dy, Z = z + dz; if (X < 0 || Y < 0 || Z < 0 || X >= n || Y >= n || Z >= n) faces++; } return String(faces);
    }
    if ((m = /^展開圖橫排四格 (\d)、(\d)、(\d)、(\d)，(\d) 在 (\d) 上面，(\d) 在 (\d) 下面。摺成正方體，(.+)$/.exec(q.q))) {
      const belt = [+m[1], +m[2], +m[3], +m[4]], top = +m[5], bot = +m[7], ti = belt.indexOf(+m[6]), bi = belt.indexOf(+m[8]), opp = foldOpp(belt, ti, top, bi, bot), tail = m[9];
      let t;
      if ((t = /^(\d) 的對面是幾？$/.exec(tail))) return String(opp[+t[1]]);
      if ((t = /^(\d) 和 (\d) 的對面，兩數加起來是多少？$/.exec(tail))) return String(opp[+t[1]] + opp[+t[2]]);
    }
    return null;
  };
  WQOly.register({
    id: 'p6-5', grade: 6, n: 5, title: '立體與展開圖', icon: '🧊',
    card: { motto: '摺起來想', example: '3×3×3：1 個在最中間', art: art65 },
    lesson: [
      { t: 'show', say: '3×3×3 積木外面塗色，切成 27 塊。', scene: { w: 'bars', p: { rows: [{ label: '全部', segs: [{ u: 27, c: 't', text: '27 塊' }] }] }, still: true } },
      { t: 'predict', say: '正方體有 8 個角。', ask: '三面有色的小塊在哪裏？', options: ['8 個角', '12 條邊', '6 個面'], answer: '8 個角', scene: { w: 'bars', p: { rows: [{ label: '全部', segs: [{ u: 27, c: 't', text: '27 塊' }] }, { label: '三面', segs: [{ u: 8, c: 'd', text: '8' }] }] }, still: true }, reveal: '每個角碰到 3 個面。三面有色的有 8 個。' },
      { t: 'show', say: '兩面在 12 條邊的中間，共 12 個。一面在 6 個面的中間，共 6 個。', scene: { w: 'bars', p: { rows: [{ label: '全部', segs: [{ u: 27, c: 't', text: '27 塊' }] }, { label: '分類', segs: [{ u: 8, c: 'd', text: '三面 8' }, { u: 12, c: 'b', text: '兩面 12' }, { u: 6, c: 'g', text: '一面 6' }] }] }, still: true } },
      { t: 'do', say: '27 減去 8、12、6。拉出沒有塗色的小塊。', scene: { w: 'bars', p: { rows: [{ label: '全部', segs: [{ u: 27, c: 't', text: '27 塊' }] }, { label: '分類', segs: [{ u: 8, c: 'd', text: '8' }, { u: 12, c: 'b', text: '12' }, { u: 6, c: 'g', text: '6' }, { u: 1, c: 'a', edit: true, start: 5, target: 1, min: 1, max: 6 }] }] } } },
      { t: 'do', say: '展開圖橫排四格，圍成一圈。從 2 走 2 步，找 2 的對面。', scene: { w: 'cycle', p: { n: 4, labels: [2, 5, 1, 4], steps: 2, unit: '步' } } },
      { t: 'try', say: '想想它們在哪個位置。', scene: { w: 'bars', p: { rows: [{ label: '全部', segs: [{ u: 27, c: 't', text: '27 塊' }] }, { label: '一面', segs: [{ u: 6, c: 'g', text: '？' }] }] }, still: true },
        q: { stem: '把 3×3×3 的積木外面全部塗色，再切成 27 個小正方體。一面有色的有幾個？', options: ['6', '8', '12'], answer: '6', hint: '一面有色的在 6 個面的中間。', why: { 8: '8 是三面有色的角塊。', 12: '12 是兩面有色的邊塊。' } } },
      { t: 'try', say: '用「對面隔一格」。',
        q: { svg: netSvg([2, 5, 1, 4], 1, 3, 2, 6, 2), stem: '展開圖橫排四格 2、5、1、4，3 在 5 上面，6 在 1 下面。摺成正方體，2 的對面是幾？', options: ['1', '5', '4'], answer: '1', hint: '橫排四格圍成一圈，對面隔一格。', why: { 5: '5 在 2 的旁邊，是鄰面。', 4: '4 也在 2 的旁邊（圍成一圈後相連）。' } } },
      { t: 'card' }
    ],
    gens: g65, verify: verify65
  });
})();

;
