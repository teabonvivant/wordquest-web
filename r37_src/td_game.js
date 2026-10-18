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
  var BLOB_COL = ['#58d96b', '#a56bff', '#9aa48c', '#ff6a5a', '#e9eef7', '#e0a23a', '#9fb2e8', '#ffe9a8'];

  /* ------------------------------------------------------------------ difficulty + level curve (one place, exported for tests) */
  var DIFF = {
    speed: [0.72, 0.85, 1.0, 1.15, 1.3],              /* walking speed multiplier */
    hearts: [5, 5, 4, 3, 3],                          /* base hearts */
    interval: [1.35, 1.18, 1.0, 0.86, 0.74],          /* spawn spacing multiplier */
    capAdd: [-0.6, -0.3, 0, 0.4, 0.8],                /* extra simultaneous monsters */
    distract: [2, 3, 4, 0, 0],                        /* decoy letters on the small pad; 4-5 use the full QWERTY pad */
    hint: ['first', 'first', 'button', 'none', 'none']/* 1-2: first letter pre-filled (math: hint line shown); 3: hint button; 4-5: none */
  };
  function params(d, s) {
    d = clamp((d | 0) || 2, 1, 5); s = clamp(s | 0, 0, 9); var i = d - 1, sm = DIFF.speed[i];
    return {
      d: d, s: s, hearts: DIFF.hearts[i], speedMul: sm, cross: (44 - 2.2 * s) / sm,        /* seconds from spawn to base at normal speed */
      interval: (17 - 0.8 * s) * DIFF.interval[i], cap: clamp(Math.round(1 + s * 0.28 + DIFF.capAdd[i]), 1, 4),
      distract: DIFF.distract[i], qwerty: d >= 4, hint: DIFF.hint[i], prefill: DIFF.hint[i] === 'first'
    };
  }

  /* ------------------------------------------------------------------ small helpers */
  function isMath(it) { return !!it && (it.kind === 'math' || it.en == null); }
  function esc(s) { return GX.esc(s); }
  var GLOW = {};
  function glow(col, px) {                                /* pre-rendered radial glow sprite */
    var k = col + px, g = GLOW[k]; if (g) return g;
    var c = document.createElement('canvas'); c.width = c.height = px; var x = c.getContext('2d'), r = px / 2, gr = x.createRadialGradient(r, r, 0, r, r, r);
    gr.addColorStop(0, col); gr.addColorStop(.35, col + '99'); gr.addColorStop(1, col + '00'); x.fillStyle = gr; x.fillRect(0, 0, px, px); return (GLOW[k] = c);
  }
  function sylSegs(S, it) {                               /* syllable lengths that add up to the word, else 2-4 letter chunks */
    var en = it.en, raw = S.syl(it) || '', parts = raw.split(/[·‧•\-\s.]+/).filter(Boolean), tot = 0, i;
    if (parts.length >= 2) { for (i = 0; i < parts.length; i++) tot += parts[i].length; if (tot === en.replace(/[^A-Za-z]/g, '').length || tot === en.length) { var ends = [], run = 0; for (i = 0; i < parts.length; i++) { run += parts[i].length; ends.push(run); } return ends; } }
    var n = Math.max(2, Math.min(4, Math.round(en.length / 3))), out = []; for (i = 1; i <= n; i++) out.push(Math.round(en.length * i / n)); return out;
  }

  var CSS = '' +
    '.td-root{--td-fy:120px}' +
    '.td-hud{position:absolute;left:0;right:0;top:0;z-index:4;pointer-events:none}' +
    '.td-row{display:flex;align-items:center;gap:8px;padding:4px 8px 0 58px;height:48px;box-sizing:border-box}' +
    '.td-root .gx-hudbtn{left:8px;top:2px;pointer-events:auto}' +
    '.td-hearts{display:flex;gap:1px;color:#ff5d7a;filter:drop-shadow(0 1px 0 rgba(0,0,0,.5))}.td-hearts svg{width:19px;height:19px}.td-hearts .lost{color:#3a4180;opacity:.8}' +
    '.td-sp{flex:1}' +
    '.td-chip{display:inline-flex;align-items:center;gap:4px;height:30px;padding:0 10px;border-radius:999px;background:rgba(11,16,48,.62);border:1px solid rgba(255,255,255,.2);font-weight:900;font-size:15px;font-family:' + EFONT + ';color:' + C.text + '}' +
    '.td-chip svg{width:17px;height:17px}.td-chip.coin{color:' + GOLD + '}.td-chip.combo{transition:transform .12s}.td-chip.combo.pop{transform:scale(1.18)}.td-chip.hide{display:none}' +
    '.td-prog{display:flex;align-items:center;gap:8px;padding:0 12px;height:20px;font-size:13px;font-weight:700;color:' + C.muted + ';box-sizing:border-box}' +
    '.td-prog .lv{white-space:nowrap}.td-bar{flex:1;height:8px;border-radius:5px;background:rgba(255,255,255,.16);overflow:hidden;min-width:30px}.td-bar i{display:block;height:100%;width:0;background:linear-gradient(90deg,#3ee6d0,#ffc94a);transition:width .3s}' +
    '.td-ev{display:none;padding:1px 8px;border-radius:999px;background:rgba(255,201,74,.2);color:' + GOLD + ';border:1px solid rgba(255,201,74,.5);white-space:nowrap}.td-ev.on{display:inline-block}' +
    '.td-land .td-hud{display:flex;align-items:center;height:48px}.td-land .td-row{flex:0 0 auto;padding-right:0}.td-land .td-prog{flex:1;min-width:0;padding:0 10px 0 6px}' +
    '.td-q{position:absolute;z-index:3;display:flex;align-items:center;gap:10px;padding:6px 10px;box-sizing:border-box;border-radius:20px;background:linear-gradient(160deg,rgba(30,38,96,.94),rgba(18,24,68,.94));border:1px solid rgba(255,255,255,.2);box-shadow:0 8px 20px rgba(0,0,0,.4),inset 0 1px 0 rgba(255,255,255,.12);overflow:hidden}' +
    '.td-q.shake{animation:tdshake .22s}@keyframes tdshake{20%{transform:translateX(-5px)}50%{transform:translateX(5px)}80%{transform:translateX(-3px)}}' +
    '.td-q.boss{border-color:#ff9d4a;box-shadow:0 8px 20px rgba(0,0,0,.4),0 0 0 2px rgba(255,157,74,.5)}' +
    '.td-pic{flex:0 0 auto;width:56px;height:56px;display:flex;align-items:center;justify-content:center;font-size:44px;border-radius:16px;background:rgba(255,255,255,.08)}.td-pic img{max-width:100%;max-height:100%;object-fit:contain}' +
    '.td-main{flex:1;min-width:0;display:flex;flex-direction:column;justify-content:center;gap:4px;height:100%}' +
    '.td-txt{font-weight:900;line-height:1.28;color:' + C.text + ';overflow:hidden;flex:1 1 auto;min-height:0;display:flex;align-items:center;overflow-wrap:anywhere;word-break:break-word}' +
    '.td-txt span{display:block}' +
    '.td-ans{flex:0 0 auto;display:flex;align-items:center;gap:6px;min-height:34px;flex-wrap:nowrap;overflow:hidden}' +
    '.td-slots{display:flex;gap:3px;align-items:center;flex-wrap:nowrap}.td-seg{display:flex;gap:3px;padding:2px 3px;border-radius:9px;border:1.5px solid rgba(111,216,255,.5);background:rgba(111,216,255,.08)}.td-seg.done{border-color:rgba(62,230,160,.7);background:rgba(62,230,160,.12)}' +
    '.td-slots i{font-style:normal;display:flex;align-items:center;justify-content:center;width:var(--sw,28px);height:var(--sh,32px);border-radius:8px;background:rgba(255,255,255,.1);border-bottom:3px solid rgba(255,255,255,.28);font-family:' + EFONT + ';font-weight:900;font-size:var(--sf,20px);color:' + C.text + ';box-sizing:border-box}' +
    '.td-slots i.f{background:rgba(62,230,160,.2);border-bottom-color:#3ee6a0;color:#9bffd2}.td-slots i.p{background:rgba(255,201,74,.18);border-bottom-color:' + GOLD + ';color:#ffe29a}' +
    '.td-slots i.n{border-bottom-color:' + GOLD + ';animation:tdblink 1s infinite}.td-slots i.h{color:' + GOLD + ';background:rgba(255,201,74,.22);border-bottom-color:' + GOLD + '}' +
    '.td-slots i.sp{background:none;border:0;width:calc(var(--sw,28px)*.6);color:' + C.muted + '}' +
    '@keyframes tdblink{50%{background:rgba(255,201,74,.28)}}' +
    '.td-num{min-width:64px;height:34px;padding:0 12px;display:flex;align-items:center;border-radius:10px;background:rgba(255,255,255,.12);border-bottom:3px solid ' + GOLD + ';font-family:' + EFONT + ';font-weight:900;font-size:24px;color:#fff;box-sizing:border-box;letter-spacing:.04em}' +
    '.td-num u{display:inline-block;width:2px;height:22px;margin-left:2px;background:' + GOLD + ';animation:tdcaret 1s steps(1) infinite}@keyframes tdcaret{50%{opacity:0}}' +
    '.td-eq{font-weight:900;font-size:20px;color:' + C.muted + '}' +
    '.td-hint{font-size:13px;font-weight:700;color:' + C.muted + ';white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}' +
    '.td-tag{display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:999px;background:rgba(255,157,74,.22);border:1px solid rgba(255,157,74,.6);color:#ffc690;font-size:12px;font-weight:900;white-space:nowrap}' +
    '.td-q button{flex:0 0 auto;width:44px;height:44px;border-radius:50%;border:1px solid rgba(255,255,255,.26);background:rgba(255,255,255,.1);color:' + C.text + ';display:flex;align-items:center;justify-content:center;padding:0;cursor:pointer;touch-action:manipulation}' +
    '.td-q button:active{transform:translateY(1px)}.td-q button.td-hb{width:auto;border-radius:22px;padding:0 12px;gap:4px;font-size:14px;font-weight:900;color:' + GOLD + ';border-color:rgba(255,201,74,.5)}.td-q button.off{display:none}' +
    '.td-root .gx-okchip{top:calc(var(--td-fy) + 6px)}' +
    '.td-root .gx-prow.gx-scr{flex-wrap:wrap}.td-root .gx-pad.scr .gx-key{flex:0 1 46px;max-width:60px;min-width:44px}.td-root .gx-pad.scr .gx-key.bk{flex:0 1 62px;max-width:72px}' +
    '.td-root .gx-key.td-hl{box-shadow:0 0 0 3px ' + GOLD + ',0 0 14px rgba(255,201,74,.8);animation:tdblink .8s infinite}' +
    '.td-land .gx-pad.dig{display:grid;grid-template-columns:repeat(7,1fr);gap:5px;max-width:520px;left:auto;right:0;width:min(55%,520px)}.td-land .gx-pad.dig .gx-prow{display:contents}.td-land .gx-pad.dig .gx-key{max-width:none;height:40px}' +
    '.td-land .gx-pad.dig .gx-key.go{grid-column:span 2}' +
    '@media (prefers-reduced-motion:reduce){.td-q.shake,.td-slots i.n,.td-num u,.gx-key.td-hl{animation:none!important}}';

  /* ================================================================== start */
  function start(box, opts) {
    opts = opts || {};
    var lv = opts.level || null, items0 = opts.items || [];
    var subject = opts.subject || (items0[0] && isMath(items0[0]) ? 'math' : 'english'), math = subject === 'math';
    var diff = clamp((opts.difficulty | 0) || 2, 1, 5), sLv = lv ? clamp(lv.s | 0, 0, 9) : 4, isBossLevel = !!(lv && (lv.boss || lv.s === 9)) && opts.mode !== 'free';
    var P = params(diff, sLv), needFrac = items0.some(function (i) { return i.pad === 'frac'; });
    var base = (opts.assetBase || 'assets/r321/'), seed0 = opts.seed;
    var S, pad = null, ready = false, styleEl = null;

    /* ---------------- state */
    var enemies = [], proj = [], bolts = [], meteors = [], pend = [], target = null, state = 'intro', frozen = false, lost = false;
    var hearts = P.hearts, combo = 0, maxCombo = 0, coins = 0, score = 0, tier = 0, playT = 0, spawnT = 1, uid = 0, bossSpawned = false, bossAlive = false, bossWon = false, cd = 0, cdShown = 0, lastBeepT = 0, meteorT = 0, runN = 0;
    var ev = { meteor: 0, freeze: 0, slow: 0 }, rng = GX.rng((seed0 != null ? seed0 : Date.now()) + 77), baseHit = 0, turret = { y: 0, tgtY: 0, recoil: 0, pop: 0 };
    var L = { W: 0, H: 0, land: false, lanes: 3, laneH: 60, fy: 100, fh: 200, baseX: 60, spawnX: 400, endX: 70, es: 56, hudH: 70, qh: 88, qTop: 70, padH: 0, padOn: false };
    var stat = null, statOk = false, statSrc = '', padSig = '', hlKey = '', events = [];
    var el = {};                                       /* DOM refs */
    var lastHud = '';

    /* ---------------- shell */
    var cfg = {
      id: 'td', music: diff <= 2 ? 'calm' : 'drive',
      onRestart: function () { restart(); },
      onResize: function () { if (ready) layout(); },
      onResume: function () { if (pad) pad.disable(false); },
      onDestroy: function () { if (styleEl && styleEl.parentNode) styleEl.parentNode.removeChild(styleEl); }
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
    qbar.innerHTML = '<div class="td-pic" data-r="pic"></div><div class="td-main"><div class="td-txt" data-r="txt"></div><div class="td-ans" data-r="ans"></div></div><button type="button" class="td-hb off" data-r="hint" aria-label="提示">' + GX.ico('sparkle', 20) + '<span>提示</span></button><button type="button" data-r="say" aria-label="播放讀音">' + GX.ico('speaker', 24) + '</button>';
    root.appendChild(qbar);
    ['pic', 'txt', 'ans', 'hint', 'say'].forEach(function (k) { el['q' + k] = qbar.querySelector('[data-r="' + k + '"]'); });

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
      else pad.setKeys('abcdefghijklm'.split('').concat(['n']).slice(0, 14));
      h = Math.ceil(pad.height()); pad.el.style.minHeight = h + 'px'; padSig = ''; return h;
    }
    function layout() {
      var W = S.W, H = S.H, land = W > H * 1.15, pw, qw;
      root.classList.toggle('td-land', land); L.W = W; L.H = H; L.land = land;
      L.hudH = land ? 48 : 70;
      L.qh = math ? (land ? 84 : (H < 600 ? 104 : 118)) : (land ? 72 : (H < 600 ? 84 : 92));
      L.padOn = !!padWanted; pad.show(L.padOn); L.padH = L.padOn ? measurePad() : 0;
      if (L.padOn) { pad.el.style.left = ''; }
      L.qTop = L.hudH; qw = Math.min(W - 16, 700);
      qbar.style.left = Math.round((W - qw) / 2) + 'px'; qbar.style.width = qw + 'px'; qbar.style.top = L.qTop + 'px'; qbar.style.height = L.qh + 'px';
      L.fy = L.qTop + L.qh + 6; L.fh = H - L.padH - (L.padOn ? 4 : 10) - L.fy;
      L.lanes = (land && L.fh >= 300) ? 4 : 3; L.laneH = L.fh / L.lanes; L.es = clamp(L.laneH * 0.86, 34, 104);
      L.baseX = clamp(W * 0.17, 52, 130); L.spawnX = W + L.es * 0.6; L.endX = L.baseX + L.es * 0.3;
      root.style.setProperty('--td-fy', L.fy + 'px');
      var sw = clamp(Math.floor((qw - 130) / 12), 20, 34); qbar.style.setProperty('--sw', sw + 'px'); qbar.style.setProperty('--sh', Math.round(sw * 1.14) + 'px'); qbar.style.setProperty('--sf', Math.round(sw * .72) + 'px');
      turret.tgtY = laneY(1); turret.y = turret.y || turret.tgtY;
      statOk = false; buildStatic(); applyPad(true); renderQ(); hudUpdate(true);
    }
    function laneY(i) { return L.fy + L.laneH * (clamp(i, 0, L.lanes - 1) + 0.5); }
    function ex(e) { return L.endX + (L.spawnX - L.endX) * e.xn; }
    function eSize(e) { return L.es * (e.boss ? 1.55 : 1); }

    /* ---------------- static background layer (image + dark wash + lane strips + planet base), rebuilt on resize / when the bg image arrives */
    function buildStatic() {
      var W = L.W, H = L.H, d = S.dpr; if (!stat) stat = document.createElement('canvas');
      stat.width = Math.round(W * d); stat.height = Math.round(H * d); var g = stat.getContext('2d'); g.setTransform(d, 0, 0, d, 0, 0);
      statSrc = base + (L.land ? 'bg_td_land.webp' : 'bg_td_port.webp'); var im = GX.img(statSrc), i, y, gr;
      if (im.ok) {
        var iw = im.el.naturalWidth, ih = im.el.naturalHeight, sc = Math.max(W / iw, H / ih), dw = iw * sc, dh = ih * sc; g.drawImage(im.el, (W - dw) / 2, 0, dw, dh);
      } else {
        gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, '#120f3d'); gr.addColorStop(.5, '#2a1a63'); gr.addColorStop(1, '#162a4e'); g.fillStyle = gr; g.fillRect(0, 0, W, H);
        for (i = 0; i < 60; i++) { g.globalAlpha = .3 + (i % 5) * .12; g.fillStyle = '#fff'; g.fillRect((i * 97.3) % W, (i * 53.7) % (L.fy), 1.5, 1.5); } g.globalAlpha = 1;
        g.fillStyle = '#1e5a48'; g.beginPath(); g.ellipse(W * .5, L.fy + L.fh + 30, W * .8, L.fh * .55, 0, 0, 6.3); g.fill();
      }
      statOk = im.ok;
      g.fillStyle = 'rgba(8,10,40,.34)'; g.fillRect(0, 0, W, H);
      gr = g.createLinearGradient(0, 0, 0, L.fy); gr.addColorStop(0, 'rgba(8,10,40,.7)'); gr.addColorStop(1, 'rgba(8,10,40,.2)'); g.fillStyle = gr; g.fillRect(0, 0, W, L.fy);
      g.fillStyle = 'rgba(14,10,46,.5)'; g.fillRect(0, L.fy - 2, W, L.fh + 4);
      if (L.padOn) { gr = g.createLinearGradient(0, H - L.padH - 20, 0, H); gr.addColorStop(0, 'rgba(8,10,40,0)'); gr.addColorStop(1, 'rgba(8,10,40,.8)'); g.fillStyle = gr; g.fillRect(0, H - L.padH - 20, W, L.padH + 20); }
      for (i = 0; i < L.lanes; i++) {
        y = L.fy + i * L.laneH + 3; var h = L.laneH - 6;
        gr = g.createLinearGradient(0, y, 0, y + h); gr.addColorStop(0, 'rgba(140,110,230,.20)'); gr.addColorStop(.5, 'rgba(90,70,190,.26)'); gr.addColorStop(1, 'rgba(60,44,150,.20)');
        g.fillStyle = gr; GX.rrect(g, L.baseX - 6, y, W - L.baseX + 20, h, 16); g.fill();
        g.strokeStyle = 'rgba(255,201,74,.32)'; g.lineWidth = 1.5; g.stroke();
        g.strokeStyle = 'rgba(255,255,255,.07)'; g.lineWidth = 2; g.setLineDash([10, 14]); g.beginPath(); g.moveTo(L.baseX + 20, y + h / 2); g.lineTo(W, y + h / 2); g.stroke(); g.setLineDash([]);
      }
      /* planet base on the left: a large lit sphere peeking in, with a rim light */
      var pr = Math.max(L.fh * .85, 120), pcx = -pr * .45, pcy = L.fy + L.fh / 2;
      gr = g.createRadialGradient(pcx + pr * .55, pcy - pr * .3, pr * .1, pcx, pcy, pr); gr.addColorStop(0, '#6ce8d8'); gr.addColorStop(.45, '#3f68c9'); gr.addColorStop(1, '#251b66');
      g.fillStyle = gr; g.beginPath(); g.arc(pcx, pcy, pr, 0, 6.3); g.fill();
      g.strokeStyle = 'rgba(160,255,240,.55)'; g.lineWidth = 3; g.beginPath(); g.arc(pcx, pcy, pr, -.9, .9); g.stroke();
      gr = g.createLinearGradient(0, 0, L.baseX + 10, 0); gr.addColorStop(0, 'rgba(62,230,208,.0)'); gr.addColorStop(1, 'rgba(62,230,208,.22)'); g.fillStyle = gr; g.fillRect(0, L.fy, L.baseX + 10, L.fh);
    }

    /* ---------------- hud + question bar */
    function hudUpdate(force) {
      var pr = S.learn.progress(), tt = TIERS[tier], sig = [hearts, coins, combo, tier, pr.done, pr.total, ev.meteor > 0 ? 1 : 0, ev.freeze > 0 ? Math.ceil(ev.freeze) : 0, ev.slow > 0 ? 1 : 0, L.W].join('|');
      if (!force && sig === lastHud) return; var pop = sig !== lastHud && lastHud && combo > +lastHud.split('|')[2]; lastHud = sig;
      var h = ''; for (var i = 0; i < P.hearts; i++) h += '<span class="' + (i < hearts ? '' : 'lost') + '">' + GX.ico('heart', 19) + '</span>'; el.hearts.innerHTML = h;
      el.coinsB.textContent = coins; el.combo.classList.toggle('hide', combo < 2); el.comboB.textContent = '×' + combo; el.combo.style.color = tt.col;
      el.cico.innerHTML = GX.ico(tt.ico, 17); if (pop && !GX.reduced()) { el.combo.classList.add('pop'); S.later(function () { el.combo.classList.remove('pop'); }, 140); }
      el.lv.textContent = lv ? GX.levelText(lv) : '自由模式'; el.cnt.textContent = pr.done + '/' + pr.total; el.bar.style.width = (pr.total ? pr.done / pr.total * 100 : 0) + '%';
      var evs = []; if (ev.freeze > 0) evs.push('冰凍 ' + Math.ceil(ev.freeze) + 's'); if (ev.meteor > 0) evs.push('流星雨 ×2'); if (ev.slow > 0 && !ev.freeze) evs.push('減速');
      el.ev.textContent = evs.join(' '); el.ev.classList.toggle('on', evs.length > 0);
    }
    function curItem(e) { return e.items ? e.items[e.phase] : e.it; }
    function fitText(node, maxH) {
      var s = math ? (L.land ? 20 : 22) : 24, min = 14; node.style.fontSize = s + 'px';
      while (s > min && (node.scrollHeight > maxH + 1 || node.firstChild.offsetHeight > maxH + 1)) { s--; node.style.fontSize = s + 'px'; }
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
    function renderQ() {
      var e = target, it, inner;
      if (!e) {
        el.qpic.style.display = 'none'; el.qtxt.innerHTML = '<span style="color:' + C.muted + ';font-size:16px">' + (state === 'play' ? '字怪來襲！看清題目再作答' : '準備好！') + '</span>'; el.qans.innerHTML = ''; el.qsay.classList.add('off'); el.qhint.classList.add('off'); qbar.classList.remove('boss'); return;
      }
      it = curItem(e); qbar.classList.toggle('boss', !!e.boss);
      var tag = e.boss ? '<span class="td-tag">魔王' + (e.items ? ' ' + (e.phase + 1) + '/' + e.items.length : '') + '</span>' : '';
      if (isMath(it)) {
        el.qpic.style.display = 'none'; el.qtxt.innerHTML = '<span>' + esc(it.q) + '</span>'; el.qsay.classList.add('off');
        el.qans.innerHTML = '<span class="td-eq">＝</span><span class="td-num">' + esc(e.typed) + '<u></u></span>' + tag + (e.hintShown || P.hint === 'first' ? '<span class="td-hint">' + esc(it.hint || '') + '</span>' : '');
        fitText(el.qtxt, L.qh - 12 - 38);
      } else {
        el.qpic.style.display = ''; inner = it.img ? '<img src="' + esc(it.img) + '" alt="" draggable="false">' : (it.emoji ? '<span class="gx-emo">' + esc(it.emoji) + '</span>' : GX.ico('sparkle', 30));
        el.qpic.innerHTML = inner; el.qsay.classList.remove('off');
        el.qtxt.innerHTML = '<span>' + esc(it.zh) + '</span>' + (tag ? '' : ''); el.qtxt.firstChild.style.fontSize = '';
        el.qans.innerHTML = slotsHTML(e, it) + tag; fitText(el.qtxt, 34);
      }
      el.qhint.classList.toggle('off', P.hint !== 'button');
      var pw = L.W > 520 ? 56 : 48; el.qpic.style.width = el.qpic.style.height = (L.land ? 52 : pw) + 'px';
    }
    function bump() { if (GX.reduced()) return; qbar.classList.remove('shake'); void qbar.offsetWidth; qbar.classList.add('shake'); }

    /* ---------------- pad (touch) */
    function keysFor(e) {
      var it = curItem(e), en = it.en.toLowerCase().replace(/[^a-z]/g, ''), set = {}, ks = [], i, abc = 'abcdefghijklmnopqrstuvwxyz', r = GX.rng(GX.hash(it.id + '|' + diff));
      for (i = 0; i < en.length; i++) if (!set[en[i]]) { set[en[i]] = 1; ks.push(en[i]); }
      var pool = GX.shuffle(abc.split('').filter(function (c) { return !set[c]; }), r), n = Math.min(P.distract, Math.max(0, 13 - ks.length)); ks = ks.concat(pool.slice(0, n));
      return GX.shuffle(ks, r);
    }
    function applyPad(force) {
      if (!L.padOn) return; var e = target, mode, keys = null, sig;
      if (math) { var it = e ? curItem(e) : null; mode = it && it.pad === 'frac' ? 'frac' : (needFrac ? 'frac' : 'digits'); if (!e) mode = needFrac ? 'frac' : 'digits'; sig = mode; }
      else { mode = 'letters'; keys = (!P.qwerty && e) ? keysFor(e) : null; sig = 'L' + (keys ? keys.join('') : '*'); }
      if (!force && sig === padSig) return; padSig = sig; pad.setMode(mode, keys); pad.el.classList.toggle('td-frac', mode === 'frac'); hlKey = ''; padHL(e && !math ? e.hlKey : '');
    }
    function padHL(k) {
      var bs = pad.el.querySelectorAll('.gx-key.td-hl'); for (var i = 0; i < bs.length; i++) bs[i].classList.remove('td-hl');
      if (!k) { hlKey = ''; return; } var b = pad.el.querySelector('.gx-key[data-k="' + k + '"]'); if (b) b.classList.add('td-hl'); hlKey = k;
    }

    /* ---------------- enemies */
    function mkEnemy(it, o) {
      o = o || {}; var e = { uid: ++uid, it: it, items: o.items || null, phase: 0, lane: o.lane, xn: 1, spd: 0.92 + (GX.hash(it.id) % 17) / 100, age: 0, typed: '', pre: 0, errs: 0, hints: 0, marked: false, flash: 0, hit: 0, state: 'walk', dieT: 0, boomed: false, boss: !!o.boss, segEnds: null, ph: (GX.hash(it.id) % 628) / 100, warned: false, spoke: false, hl: false, hlKey: '', hintShown: false, spr: 1 + GX.hash(String(it.id)) % 8, fail: false, shield: 0, shieldMax: 0 };
      if (e.boss) { e.spr = 1 + GX.hash(String(it.id)) % 2; e.spd = 0.62; if (e.items) { e.shieldMax = e.shield = e.items.length; } else if (!isMath(it)) { e.segEnds = sylSegs(S, it); e.shieldMax = e.shield = e.segEnds.length; } }
      initTyped(e); return e;
    }
    function initTyped(e) {
      var it = curItem(e); e.typed = ''; e.pre = 0; e.hl = false; e.hlKey = '';
      if (!isMath(it)) { autoFill(e, it); if (P.prefill && !e.boss && e.typed.length === 0 && it.en.length > 1) { e.typed = it.en[0]; autoFill(e, it); e.pre = e.typed.length; } }
    }
    function autoFill(e, it) { var en = it.en; while (e.typed.length < en.length && !/[A-Za-z]/.test(en[e.typed.length])) e.typed += en[e.typed.length]; }
    function alive(e) { return e.state === 'walk'; }
    function aliveList() { return enemies.filter(alive); }
    function pickTarget() { var best = null; enemies.forEach(function (e) { if (alive(e) && (!best || e.xn < best.xn)) best = e; }); return best; }
    function setTarget(e, manual) {
      if (e === target) return; target = e; if (manual) S.sfx('tap');
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
    function enemyXY(e) { return { x: ex(e), y: laneY(e.lane) }; }

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
      var e = mkEnemy(it, { lane: lane }); enemies.push(e); events.push('spawn:' + it.id); S.sfx('pop'); var p = enemyXY(e); S.fx.burst(Math.min(L.W - 8, p.x - L.es * .4), p.y, { n: 6, colors: ['#b79bff', '#fff'], speed: 70, life: .4, size: 3, grav: 0 });
      if (!target) setTarget(e); return true;
    }
    function spawnBoss() {
      var it, items = null, k, q = S.learn.remaining(), lane = Math.min(L.lanes - 1, Math.floor(L.lanes / 2));
      if (math) {
        items = []; while (items.length < 2 && S.learn.remaining() > 0) { var t = S.learn.take(); if (t.rv) pend.push(t); else items.push(t); }
        if (!items.length) return false; it = items[0];
      } else {
        var bi = -1, bs = -1; for (k = 0; k < q; k++) { var c = S.learn.peek(k); if (c && !c.rv && !isMath(c)) { var sc = sylSegs(S, c).length * 100 + c.en.length; if (sc > bs) { bs = sc; bi = k; } } }
        if (bi < 0) return false; for (k = 0; k < bi; k++) pend.push(S.learn.take()); it = S.learn.take();
      }
      var e = mkEnemy(it, { boss: true, lane: lane, items: items }); enemies.push(e); bossSpawned = bossAlive = true;
      S.ui.banner('魔王來襲！', math ? '兩道難題，逐一擊破' : '逐個音節擊破護盾', 1700); S.sfx('boss'); S.fx.shake(5, .5); S.fx.flash('#ff7a3c', .25); cfg.music = 'boss'; S.audio.music('boss');
      events.push('boss:' + it.id); if (!target || !target.boss) setTarget(e); return true;
    }
    function trySpawn(dt) {
      spawnT -= dt; var act = aliveList().length, canMore = pend.length || S.learn.remaining() > 0;
      if (!canMore || bossAlive) return;
      if (act === 0 && spawnT > P.interval * 0.45) spawnT = P.interval * 0.45;
      if (spawnT > 0 || act >= P.cap) return;
      if (isBossLevel && !bossSpawned && coreLeft() <= 3) { if (act === 0 && spawnBoss()) spawnT = P.interval * .6; else if (act > 0) spawnT = .4; return; }
      if (spawnNormal()) spawnT = P.interval * (0.85 + rng() * 0.3);
    }

    /* ---------------- input */
    function press(k) {
      if (state !== 'play' || frozen || S.paused || S.ended) return;
      var e = target; if (!e || !alive(e)) { e = pickTarget(); if (!e) return; setTarget(e); }
      var it = curItem(e);
      if (isMath(it)) mathKey(e, it, k); else letterKey(e, it, k);
    }
    function letterKey(e, it, k) {
      if (k === '⌫') { if (e.typed.length > e.pre) { var back = e.typed.length - 1; while (back > e.pre && !/[A-Za-z]/.test(e.typed[back])) back--; e.typed = e.typed.slice(0, back); if (e.segEnds && e.typed.length < e.segEnds[0] && false) { /* */ } e.hl = false; renderQ(); S.sfx('tap'); } return; }
      if (k === '↵' || k.length !== 1 || !/[A-Za-z]/.test(k)) return;
      var en = it.en, i = e.typed.length, want = en[i]; if (want == null) return;
      if (k.toLowerCase() === want.toLowerCase()) {
        e.typed += want; autoFill(e, it); e.hl = false; e.hlKey = ''; padHL(''); pad.flash(k.toLowerCase(), 'ok'); S.sfx('key', { i: e.typed.replace(/[^A-Za-z]/g, '').length - 1 });
        var done = e.typed.length >= en.length, segBreak = false;
        if (e.segEnds && !done) { for (var s = 0; s < e.segEnds.length - 1; s++) if (e.typed.length === e.segEnds[s]) segBreak = true; }
        e.xn = Math.min(1.02, e.xn + (e.boss ? 0.006 : 0.014)); e.hit = 1; e.flash = 1;
        if (done) { renderQ(); solved(e, it); return; }
        if (segBreak) breakShield(e); else fireShot(e, false);
        renderQ();
      } else {
        wrongLetter(e, it, k);
      }
    }
    function wrongLetter(e, it, k) {
      e.errs++; combo = 0; tier = 0; S.sfx('keybad'); pad.flash(k.toLowerCase(), 'no'); bump(); var p = enemyXY(e); S.fx.burst(p.x, p.y, { n: 5, colors: ['#ff6b81', '#fff'], speed: 90, life: .35, size: 3, grav: 0 }); S.fx.text(p.x, p.y - eSize(e) * .5, '✕', { color: C.bad, size: 22 });
      events.push('wrongKey:' + k); if (e.errs >= 2) { markNotFirst(it); e.hl = true; e.hlKey = it.en[e.typed.length].toLowerCase(); padHL(e.hlKey); renderQ(); }
      turret.pop = 0; hudUpdate();
    }
    function markNotFirst(it) { var st = S.learn.stats[it.id]; if (st && st.firstOk === null) { st.firstOk = false; st.missed++; } }
    function mathKey(e, it, k) {
      if (k === '⌫') { if (e.typed) { e.typed = e.typed.slice(0, -1); renderQ(); S.sfx('tap'); } return; }
      if (k === '↵') { if (!e.typed) return; if (S.learn.judge(it, e.typed)) return solved(e, it); return wrongAnswer(e, it, e.typed); }
      if (!/^[0-9.\/\-]$/.test(k) || e.typed.length >= 12) return; e.typed += k; S.sfx('key', { i: e.typed.length }); pad.flash(k, 'ok'); renderQ();
      var st = S.learn.typing(it, e.typed);
      if (st === 'done') return solved(e, it);
      if (st === 'wrong') { var el0 = GX.norm(S.learn.expect(it)).length; if (it.pad !== 'frac' || e.typed.length >= el0 + 2) return wrongAnswer(e, it, e.typed); }
    }
    function useHint() {
      var e = target; if (!e || state !== 'play' || frozen || P.hint !== 'button') return; var it = curItem(e); e.hints++; markNotFirst(it); S.sfx('pop');
      if (isMath(it)) { e.hintShown = true; } else { e.hl = true; e.hlKey = it.en[e.typed.length] ? it.en[e.typed.length].toLowerCase() : ''; padHL(e.hlKey); }
      renderQ(); events.push('hint:' + it.id);
    }

    /* ---------------- shots and effects */
    function muzzle() { var ts = turret.size || 70; return { x: L.baseX * .5 + ts * .34, y: turret.y - ts * .04 }; }
    function fireShot(e, big, cb) {
      var m = muzzle(), T = TIERS[tier]; proj.push({ x: m.x, y: m.y, sx: m.x, sy: m.y, e: e, t: 0, dur: big ? .22 : .12, big: big, tier: tier, cb: cb || null });
      turret.recoil = 1; turret.tgtY = laneY(e.lane); S.fx.burst(m.x, m.y, { n: big ? 10 : 4, colors: [big ? T.col : '#ffe28a', '#fff'], speed: 130, life: .3, size: 3, angle: 0, spread: 1.2, grav: 0 }); S.sfx(big ? T.launch : 'shoot');
    }
    function impact(p) {
      var e = p.e, pos = enemyXY(e), T = TIERS[p.tier];
      if (!p.big) { S.sfx('hit'); S.fx.burst(pos.x, pos.y, { n: 6, colors: ['#ffe28a', '#fff'], speed: 100, life: .35, size: 3 }); S.fx.ring(pos.x, pos.y, { r0: 6, r1: eSize(e) * .5, life: .25, color: '#ffe28a', width: 3 }); return; }
      S.sfx(T.hit); S.fx.shake(p.tier === 0 ? 2 : 4, .22);
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
      e.shield = Math.max(0, e.shield - 1); var p = enemyXY(e); fireShot(e, false); S.sfx('zap'); S.sfx('power'); S.fx.ring(p.x, p.y, { r0: eSize(e) * .3, r1: eSize(e) * 1.1, life: .5, color: '#6fd8ff', width: 6 }); S.fx.burst(p.x, p.y, { n: 18, colors: ['#6fd8ff', '#e6faff', '#fff'], speed: 190, life: .6, size: 4, shape: 'star' }); S.fx.text(p.x, p.y - eSize(e) * .6, '護盾破！', { color: '#9be8ff', size: 22 });
      S.fx.shake(3, .2); events.push('shield:' + e.uid);
    }
    function addCoins(n, x, y) { var m = ev.meteor > 0 ? 2 : 1; n *= m; coins += n; S.fx.text(x, y, '+' + n + (m > 1 ? ' ×2' : ''), { color: GOLD, size: 22 }); S.sfx('coin'); }

    /* ---------------- answering */
    function solved(e, it) {
      var ms = e.age * 1000, out = S.learn.answer(it, true, ms), first = out && out.first && S.learn.stats[it.id].firstOk === true, pos = enemyXY(e), multi = !!e.items && e.phase < e.items.length - 1;
      combo++; maxCombo = Math.max(maxCombo, combo); var nt = 0, i; for (i = 0; i < COMBO_AT.length; i++) if (combo >= COMBO_AT[i]) nt = i; var up = nt > tier; tier = nt;
      score += Math.round((100 + (math ? String(it.a).length : it.en.length) * 12) * (1 + Math.min(1, combo * 0.1)));
      S.ui.ok(it); events.push('ok:' + it.id + (first ? ':first' : ''));
      var T = TIERS[tier]; S.sfx(first && combo >= 3 ? 'great' : 'good'); if (combo >= 2) S.sfx('combo', { n: combo });
      if (combo >= 2) S.fx.text(pos.x, pos.y - eSize(e) * .75, '連擊 ×' + combo, { color: T.col, size: 20 });
      if (up) { S.ui.banner(T.name + '升級！', '連擊 ×' + combo, 900); S.sfx('power'); turret.pop = 1; S.fx.ring(L.baseX * .5, turret.y, { r0: 10, r1: 90, life: .5, color: T.col, width: 5 }); S.fx.burst(L.baseX * .5, turret.y, { n: 18, colors: [T.col, '#fff'], speed: 160, life: .6, size: 4, shape: 'star' }); }
      if (multi) {                                       /* math boss: first question done, shield breaks, the next one appears */
        fireShot(e, true, null); e.shield = Math.max(0, e.shield - 1); S.fx.ring(pos.x, pos.y, { r0: eSize(e) * .3, r1: eSize(e) * 1.2, life: .5, color: '#6fd8ff', width: 6 }); S.sfx('zap'); S.sfx('power'); S.fx.text(pos.x, pos.y - eSize(e) * .6, '護盾破！', { color: '#9be8ff', size: 22 });
        e.phase++; initTyped(e); e.xn = Math.min(1.02, e.xn + .1); applyPad(); renderQ(); hudUpdate(); return;
      }
      e.state = 'dying'; e.dieT = 0; e.boomed = false; e.won = true; var tierNow = tier;
      if (e === target) target = null; var killedTier = tierNow;
      fireShot(e, true, function () {
        addCoins(e.boss ? 5 : 1, pos.x, pos.y - eSize(e) * .3); tierEffects(e, killedTier);
        if (e.boss) { bossAlive = false; bossWon = !e.fail; if (!e.fail) { S.ui.banner('魔王擊破！', '', 1500); S.fx.confetti(L.W, { n: 80 }); S.sfx('win'); S.fx.flash('#ffe9a8', .3); } cfg.music = diff <= 2 ? 'calm' : 'drive'; S.audio.music(cfg.music); }
        else if (first && (rng() < 0.22 || combo === 4 || combo === 9)) grantEvent(pos);
        S.fx.shake(e.boss ? 7 : 3, .3);
      });
      if (e.hintShown) e.hintShown = false;
      var nt2 = pickTarget(); if (nt2) setTarget(nt2); else { applyPad(); renderQ(); }
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
      if (kind === 'meteor') { ev.meteor = 6; S.ui.banner('流星雨！', '全場放慢・金幣 ×2', 1300); S.sfx('whoosh'); } else { ev.freeze = 3; S.ui.banner('冰凍！', '字怪停下 3 秒', 1200); S.sfx('shield'); S.fx.flash('#bfeaff', .25); }
      events.push('event:' + kind); hudUpdate(true);
    }
    function wrongAnswer(e, it, typed, why) {
      if (frozen || e.state !== 'walk') return; frozen = true; e.state = 'fail'; pad.disable(true); events.push('wrong:' + it.id + ':' + (why || 'typed'));
      var ms = e.age * 1000, out = S.learn.answer(it, false, ms), p = enemyXY(e); combo = 0; tier = 0; S.sfx('bad'); S.fx.burst(p.x, p.y, { n: 14, colors: ['#ff6b81', '#c3cbf7'], speed: 130, life: .6, size: 4 }); hudUpdate();
      if (why === 'base') { hearts = Math.max(0, hearts - 1); baseHit = 1; S.sfx('hit'); S.fx.shake(6, .35); S.fx.flash('#ff3c5a', .35); hudUpdate(true); }
      S.ui.learn(it, { typed: isMath(it) ? '' : (e.typed.length > e.pre ? e.typed : ''), onDone: function () {
        frozen = false; pad.disable(false);
        if (e.items && e.phase < e.items.length - 1) { e.fail = true; e.phase++; e.state = 'walk'; e.shield = Math.max(0, e.shield - 1); initTyped(e); e.xn = why === 'base' ? .85 : Math.max(e.xn, .6); if (target === e || !target) { applyPad(); renderQ(); } }
        else { e.state = 'gone'; if (e.boss) { e.fail = true; bossAlive = false; cfg.music = diff <= 2 ? 'calm' : 'drive'; S.audio.music(cfg.music); S.ui.banner('魔王逃走了', '', 1200); } S.fx.burst(p.x, p.y, { n: 8, colors: ['#c3cbf7'], speed: 60, life: .5, size: 3, grav: -40 }); }
        if (target === e) target = null; var nt = pickTarget(); if (nt) setTarget(nt); else { applyPad(); renderQ(); }
        if (hearts <= 0) lose(); hudUpdate(true);
      } });
    }
    function lose() { if (lost || S.ended) return; lost = true; state = 'lost'; S.finish({ cleared: false, score: score, maxCombo: maxCombo, seconds: playT }); }
    function win() { if (S.ended) return; state = 'won'; S.ui.banner('守住了！', '', 1400); S.finish({ cleared: true, score: score, maxCombo: maxCombo, seconds: playT }); }

    /* ---------------- update */
    function update(dt) {
      var i, e;
      turret.recoil = Math.max(0, turret.recoil - dt * 6); turret.pop = Math.max(0, turret.pop - dt * 3); baseHit = Math.max(0, baseHit - dt * 2.5); turret.y = lerp(turret.y, turret.tgtY, Math.min(1, dt * 12));
      for (i = proj.length - 1; i >= 0; i--) {
        var p = proj[i]; p.t += dt; var tp = (p.e && p.e.state !== 'gone') ? enemyXY(p.e) : { x: p.sx + 200, y: p.sy }, k = Math.min(1, p.t / p.dur);
        p.x = lerp(p.sx, tp.x, k); p.y = lerp(p.sy, tp.y, k); S.fx.trail(p.x, p.y, p.big ? TIERS[p.tier].col : '#ffe28a', p.big ? 5 : 3);
        if (k >= 1) { proj.splice(i, 1); impact(p); }
      }
      for (i = bolts.length - 1; i >= 0; i--) { bolts[i].t -= dt; if (bolts[i].t <= 0) bolts.splice(i, 1); }
      for (i = meteors.length - 1; i >= 0; i--) { var m = meteors[i]; m.x += m.vx * dt; m.y += m.vy * dt; if (m.y >= m.gy) { meteors.splice(i, 1); S.fx.ring(m.x, m.gy, { r0: 4, r1: 34, life: .35, color: '#ffb36b', width: 3 }); S.fx.burst(m.x, m.gy, { n: 8, colors: ['#ffb36b', '#fff'], speed: 120, life: .4, size: 3 }); if (S.t - lastBeepT > .35) { lastBeepT = S.t; S.sfx('hit'); } } }
      for (i = enemies.length - 1; i >= 0; i--) {
        e = enemies[i]; if (e.flash > 0) e.flash = Math.max(0, e.flash - dt * 5); if (e.hit > 0) e.hit = Math.max(0, e.hit - dt * 6);
        if (e.state === 'dying') { if (e.boomed) { e.dieT += dt; if (e.dieT > .55) { enemies.splice(i, 1); } } else { e.dieT += dt; if (e.dieT > .8) { e.boomed = true; e.dieT = 0; } } }
        else if (e.state === 'gone') enemies.splice(i, 1);
      }
      if (state === 'count') {
        cd -= dt; var n = Math.ceil(cd); if (n !== cdShown && n >= 1 && n <= 3) { cdShown = n; S.ui.banner(String(n), '', 800); S.sfx('tick'); }
        if (cd <= 0) { state = 'play'; S.ui.banner('出發！', '', 700); S.sfx('power'); S.audio.music(cfg.music); applyPad(true); renderQ(); }
        return;
      }
      if (state !== 'play' || frozen || S.ended) return;
      playT += dt;
      if (ev.meteor > 0) { ev.meteor -= dt; meteorT -= dt; if (meteorT <= 0 && !GX.reduced()) { meteorT = .16 + rng() * .18; var gx = L.baseX + rng() * (L.W - L.baseX); meteors.push({ x: gx + 120, y: L.fy - 30, vx: -420, vy: 520, gy: L.fy + rng() * L.fh * .95 + 4, len: 40 }); } }
      if (ev.freeze > 0) ev.freeze -= dt; if (ev.slow > 0) ev.slow -= dt;
      var sf = ev.freeze > 0 ? 0 : (ev.meteor > 0 ? .5 : 1) * (ev.slow > 0 ? .6 : 1), step = dt * sf / P.cross;
      trySpawn(dt);
      var laneSets = {}; enemies.forEach(function (q) { if (alive(q)) (laneSets[q.lane] = laneSets[q.lane] || []).push(q); });
      for (i = 0; i < L.lanes; i++) { var ls = laneSets[i]; if (!ls) continue; ls.sort(function (a, b) { return a.xn - b.xn; }); for (var j = 0; j < ls.length; j++) { var q = ls[j]; q.age += dt; q.xn -= step * q.spd; if (j > 0) { var gap = (L.es * (ls[j - 1].boss ? 1.1 : .95) + (q.boss ? L.es * .4 : 0)) / (L.spawnX - L.endX); if (q.xn < ls[j - 1].xn + gap) q.xn = ls[j - 1].xn + gap; } } }
      enemies.forEach(function (q) {
        if (!alive(q)) return; if (!q.warned && q.xn < .22) { q.warned = true; S.sfx('warn'); }
        if (q.xn <= 0 && !frozen) wrongAnswer(q, curItem(q), q.typed, 'base');
      });
      if (!target || !alive(target)) { var nt = pickTarget(); if (nt) setTarget(nt); }
      hudUpdate();
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
      var x = ex(e), y = laneY(e.lane), s = eSize(e), red = GX.reduced(), bob = red ? 0 : Math.abs(Math.sin(S.t * 5 + e.ph)) * s * .07, sq = 1 + e.hit * .14, sc = 1, al = 1, fz = ev.freeze > 0 && alive(e);
      if (e.state === 'dying' && e.boomed) { var k = e.dieT / .55; sc = 1 + k * .5; al = Math.max(0, 1 - k); } else if (e.state === 'fail') { sc = 1; }
      c.save(); c.globalAlpha = al;
      c.fillStyle = 'rgba(0,0,0,.28)'; c.beginPath(); c.ellipse(x, y + s * .36, s * .34, s * .09, 0, 0, 6.3); c.fill();
      if (e === target && alive(e)) {                  /* selection: gold ring on the ground + glow */
        var pr = 1 + Math.sin(S.t * 6) * .05; c.strokeStyle = GOLD; c.lineWidth = 3; c.beginPath(); c.ellipse(x, y + s * .34, s * .48 * pr, s * .15 * pr, 0, 0, 6.3); c.stroke();
        c.globalCompositeOperation = 'lighter'; c.globalAlpha = .35 * al; c.drawImage(glow('#ffc94a', 96), x - s * .65, y - s * .6, s * 1.3, s * 1.3); c.globalCompositeOperation = 'source-over'; c.globalAlpha = al;
      }
      if (e.boss && e.shield > 0) {                    /* shield layers */
        for (var q = 0; q < e.shield; q++) { c.strokeStyle = 'rgba(111,216,255,' + (.75 - q * .15) + ')'; c.lineWidth = 3; c.beginPath(); c.arc(x, y - bob, s * (.58 + q * .08) + Math.sin(S.t * 3 + q) * 2, 0, 6.3); c.stroke(); }
        c.fillStyle = 'rgba(111,216,255,.12)'; c.beginPath(); c.arc(x, y - bob, s * .58, 0, 6.3); c.fill();
      }
      c.translate(x, y - bob); c.scale(1 / sq * sc, sq * sc);
      var src = base + (e.boss ? 'td_boss_' : 'td_enemy_') + e.spr + '.webp';
      if (!GX.drawImg(c, src, 0, 0, s, s)) drawBlob(c, 0, 0, s, BLOB_COL[(e.spr - 1) % 8], S.t, 0);
      if (e.flash > 0.05) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = e.flash * .6 * al; if (!GX.drawImg(c, src, 0, 0, s, s)) { c.fillStyle = '#fff'; c.beginPath(); c.arc(0, 0, s * .3, 0, 6.3); c.fill(); } c.globalCompositeOperation = 'source-over'; c.globalAlpha = al; }
      if (fz) { c.globalCompositeOperation = 'lighter'; c.globalAlpha = .45 * al; c.fillStyle = '#6fd8ff'; GX.rrect(c, -s * .38, -s * .4, s * .76, s * .8, s * .2); c.fill(); c.globalCompositeOperation = 'source-over'; c.globalAlpha = al; c.strokeStyle = 'rgba(230,250,255,.9)'; c.lineWidth = 2; GX.rrect(c, -s * .38, -s * .4, s * .76, s * .8, s * .2); c.stroke(); }
      c.restore();
      if (alive(e) || e.state === 'dying') {            /* progress pips (tiny markers, no question text on the monster) */
        var it = curItem(e), n = isMath(it) ? String(it.a).length : it.en.replace(/[^A-Za-z]/g, '').length, done = isMath(it) ? e.typed.length : e.typed.replace(/[^A-Za-z]/g, '').length, pw = Math.min(7, Math.max(4, (s * .8) / Math.max(1, n))), tw = n * pw, px = x - tw / 2 + pw / 2, py = y + s * .5 + 4;
        c.globalAlpha = al; for (var z = 0; z < n; z++) { c.fillStyle = z < done ? GOLD : 'rgba(255,255,255,.35)'; c.beginPath(); c.arc(px + z * pw, py, Math.min(2.6, pw * .38), 0, 6.3); c.fill(); } c.globalAlpha = 1;
        if (e.xn < .22 && alive(e)) { c.fillStyle = '#ff5d7a'; c.globalAlpha = .6 + .4 * Math.sin(S.t * 14); c.beginPath(); c.arc(x, y - s * .6, 7, 0, 6.3); c.fill(); c.fillStyle = '#fff'; c.font = '900 11px ' + EFONT; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('!', x, y - s * .6 + 1); c.globalAlpha = 1; }
      }
    }
    function drawTurret(c) {
      var T = TIERS[tier], ts = clamp(L.laneH * 1.05, 54, Math.min(120, L.baseX * 1.25)), x = L.baseX * .5, y = turret.y, tp = target ? enemyXY(target) : { x: x + 100, y: y };
      turret.size = ts; var ang = clamp(Math.atan2(tp.y - y, tp.x - x), -.6, .6) * .5, sc = 1 + turret.pop * .25 - turret.recoil * .06;
      c.fillStyle = 'rgba(0,0,0,.3)'; c.beginPath(); c.ellipse(x, y + ts * .38, ts * .38, ts * .1, 0, 0, 6.3); c.fill();
      c.globalCompositeOperation = 'lighter'; c.globalAlpha = .4 + turret.recoil * .3; c.drawImage(glow(T.col, 96), x - ts * .7, y - ts * .7, ts * 1.4, ts * 1.4); c.globalCompositeOperation = 'source-over'; c.globalAlpha = 1;
      c.save(); c.translate(x - turret.recoil * 6, y); c.rotate(ang); c.scale(sc, sc);
      if (!GX.drawImg(c, base + T.img, 0, 0, ts, ts, { flip: true })) {
        c.fillStyle = '#5a3fbf'; GX.rrect(c, -ts * .3, ts * .05, ts * .6, ts * .3, 8); c.fill(); c.fillStyle = T.col; c.beginPath(); c.arc(0, -ts * .05, ts * .3, 0, 6.3); c.fill(); c.fillStyle = '#2b1d4a'; c.fillRect(0, -ts * .1, ts * .42, ts * .12);
      }
      c.restore();
    }
    function draw(c, W, H) {
      var i, sx = statSrc, e;
      if (!statOk && GX.img(sx).ok) { buildStatic(); }
      if (stat) c.drawImage(stat, 0, 0, W, H);
      if (target && alive(target) && state === 'play') { c.fillStyle = 'rgba(255,201,74,.07)'; c.fillRect(L.baseX, L.fy + target.lane * L.laneH + 3, W - L.baseX, L.laneH - 6); }
      /* base shield line */
      var bx = L.baseX, pul = .6 + Math.sin(S.t * 3) * .15; c.strokeStyle = baseHit > .01 ? 'rgba(255,80,110,' + (.5 + baseHit * .5) + ')' : 'rgba(110,255,230,' + pul * .8 + ')'; c.lineWidth = 3 + baseHit * 4; c.beginPath(); c.moveTo(bx, L.fy + 2); c.lineTo(bx, L.fy + L.fh - 2); c.stroke();
      c.globalCompositeOperation = 'lighter'; c.fillStyle = baseHit > .01 ? 'rgba(255,60,90,' + baseHit * .25 + ')' : 'rgba(80,230,210,.07)'; c.fillRect(0, L.fy, bx, L.fh); c.globalCompositeOperation = 'source-over';
      if (ev.freeze > 0) { c.fillStyle = 'rgba(150,220,255,.14)'; c.fillRect(0, L.fy, W, L.fh); }
      else if (ev.meteor > 0) { c.fillStyle = 'rgba(255,150,70,.08)'; c.fillRect(0, L.fy, W, L.fh); }
      drawTurret(c);
      var list = enemies.slice().sort(function (a, b) { return laneY(a.lane) - laneY(b.lane) || b.xn - a.xn; });
      for (i = 0; i < list.length; i++) drawEnemy(c, list[i]);
      for (i = 0; i < meteors.length; i++) { var m = meteors[i]; c.strokeStyle = 'rgba(255,200,120,.9)'; c.lineWidth = 3; c.beginPath(); c.moveTo(m.x, m.y); c.lineTo(m.x + 24, m.y - 31); c.stroke(); c.globalCompositeOperation = 'lighter'; c.drawImage(glow('#ff9d4a', 48), m.x - 14, m.y - 14, 28, 28); c.globalCompositeOperation = 'source-over'; }
      for (i = 0; i < proj.length; i++) { var p = proj[i], r = p.big ? 11 : 6, col = p.big ? TIERS[p.tier].col : '#ffe28a'; c.globalCompositeOperation = 'lighter'; c.drawImage(glow(col, 64), p.x - r * 2.4, p.y - r * 2.4, r * 4.8, r * 4.8); c.globalCompositeOperation = 'source-over'; c.fillStyle = '#fff'; c.beginPath(); c.arc(p.x, p.y, r * .5, 0, 6.3); c.fill(); }
      for (i = 0; i < bolts.length; i++) { var b = bolts[i]; c.globalAlpha = Math.min(1, b.t * 5); c.lineJoin = 'round'; c.strokeStyle = 'rgba(255,233,74,.9)'; c.lineWidth = 4; c.beginPath(); b.pts.forEach(function (q, k) { k ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y); }); c.stroke(); c.strokeStyle = '#fff'; c.lineWidth = 1.5; c.stroke(); c.globalAlpha = 1; }
    }

    /* ---------------- input wiring */
    S.keys({
      onChar: function (k) { if (frozen || state !== 'play') return; if (math) { if (/^[0-9.\/\-]$/.test(k)) press(k); } else if (/^[A-Za-z]$/.test(k)) press(k.toLowerCase()); },
      onBack: function () { if (!frozen && state === 'play') press('⌫'); },
      onEnter: function () { if (!frozen && state === 'play') press('↵'); },
      onSpace: function () { if (!frozen && state === 'play') cycleTarget(1); },
      onArrow: function (d) { if (frozen || state !== 'play') return; if (d === 'up') laneMove(-1); else if (d === 'down') laneMove(1); else cycleTarget(d === 'left' ? 1 : -1); }
    });
    S.on(cv, 'pointerdown', function (ev0) {
      if (state !== 'play' || frozen || S.paused) return; var r = cv.getBoundingClientRect(), x = ev0.clientX - r.left, y = ev0.clientY - r.top, best = null, bd = 1e9;
      aliveList().forEach(function (e) { var p = enemyXY(e), dx = p.x - x, dy = p.y - y, d = Math.sqrt(dx * dx + dy * dy), lim = Math.max(44, eSize(e) * .75); if (d < lim && d < bd) { bd = d; best = e; } });
      if (!best) { var ln = Math.floor((y - L.fy) / L.laneH); if (ln >= 0 && ln < L.lanes) aliveList().forEach(function (e) { if (e.lane === ln) { var d = Math.abs(ex(e) - x); if (d < bd) { bd = d; best = e; } } }); }
      if (best) setTarget(best, true);
    });

    /* ---------------- flow */
    function begin() {                                   /* after preview: countdown, then play */
      S.ui.close('preview'); state = 'count'; cd = 3.2; cdShown = 0; frozen = false; pad.disable(false);
    }
    function intro(skipHow) {
      state = 'intro'; renderQ();
      var go = function () { if (S.dead) return; S.ui.preview(S.learn.items, { onStart: function () { begin(); } }); };
      if (skipHow) go(); else S.ui.how('td', '字母砲台', [{ icon: '👀', text: '看題目' }, { icon: '⌨️', text: '拼對發炮' }, { icon: '🛡️', text: '守住基地' }], go);
    }
    function restart() {
      runN++; S.ui.closeAll(); S.paused = false; S.ended = false; S.result = null; S.fx.clear(); enemies = []; proj = []; bolts = []; meteors = []; pend = []; target = null; frozen = false; lost = false;
      hearts = P.hearts; combo = 0; maxCombo = 0; coins = 0; score = 0; tier = 0; playT = 0; spawnT = 1; bossSpawned = bossAlive = bossWon = false; ev.meteor = ev.freeze = ev.slow = 0; events = []; baseHit = 0; padSig = ''; lastHud = '';
      rng = GX.rng((seed0 != null ? seed0 : Date.now()) + 77 + runN);
      S.learn = GX.Learn({ items: opts.items, review: opts.review, subject: opts.subject, difficulty: opts.difficulty, mode: opts.mode, seed: seed0 != null ? seed0 + runN : undefined });
      cfg.music = diff <= 2 ? 'calm' : 'drive'; S.audio.stopMusic(); hudUpdate(true); applyPad(true); intro(true);
    }

    S.loop(update, draw);
    ready = true; layout(); intro(false);
    S.audio.music(cfg.music); S.audio.stopMusic();

    /* ---------------- debug / test hooks */
    function snap() {
      return {
        state: state, frozen: frozen, ended: !!S.ended, lost: lost, hearts: hearts, heartsMax: P.hearts, combo: combo, maxCombo: maxCombo, tier: tier, tierName: TIERS[tier].k, coins: coins, score: score, playT: playT,
        params: P, lanes: L.lanes, layout: { W: L.W, H: L.H, fy: L.fy, fh: L.fh, padH: L.padH, padOn: L.padOn, qh: L.qh, laneH: L.laneH, es: L.es, baseX: L.baseX, land: L.land },
        target: target ? target.uid : 0, events: events.slice(-60), ev: { meteor: ev.meteor, freeze: ev.freeze, slow: ev.slow }, boss: { level: isBossLevel, spawned: bossSpawned, alive: bossAlive, won: bossWon },
        pad: { mode: padSig, keys: pad ? Array.prototype.map.call(pad.el.querySelectorAll('.gx-key'), function (b) { return b.getAttribute('data-k'); }) : [], h: pad ? pad.height() : 0 },
        learn: { remaining: S.learn.remaining(), done: S.learn.done(), progress: S.learn.progress(), total: S.learn.total() }, pend: pend.length, projectiles: proj.length,
        enemies: enemies.map(function (e) { var it = curItem(e); return { uid: e.uid, id: it.id, lane: e.lane, xn: Math.round(e.xn * 1000) / 1000, typed: e.typed, errs: e.errs, state: e.state, boss: e.boss, shield: e.shield, phase: e.phase, segEnds: e.segEnds, answer: isMath(it) ? String(it.a) : it.en, math: isMath(it), hints: e.hints }; })
      };
    }
    function cmd(name, a) {
      var e = target;
      switch (name) {
        case 'begin': S.ui.closeAll(); frozen = false; pad.disable(false); if (state !== 'play') { state = 'play'; spawnT = 0.2; applyPad(true); renderQ(); } return true;
        case 'type': String(a).split('').forEach(function (ch) { press(ch); }); return true;
        case 'key': press(a); return true;
        case 'solve': if (!e) return false; { var it = curItem(e); String(isMath(it) ? it.a : it.en.slice(e.typed.length)).split('').forEach(function (ch) { if (!isMath(it) && !/[A-Za-z]/.test(ch)) return; press(isMath(it) ? ch : ch.toLowerCase()); }); } return true;
        case 'wrong': if (!e) return false; { var it2 = curItem(e); if (isMath(it2)) { var wr = String(it2.a) + '9'; for (var k = 0; k < wr.length && e.state === 'walk'; k++) press(wr[k]); } else { e.xn = 0; } } return true;
        case 'timeout': if (!e) return false; e.xn = 0; return true;
        case 'select': { var t = enemies.filter(function (q) { return q.uid === a; })[0]; if (t) setTarget(t, true); return !!t; }
        case 'event': startEvent(a); return true;
        case 'spawn': return spawnNormal();
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
    Object.defineProperty(H, '_debug', { get: snap }); H._step = function (n, dt) { S._step(n, dt); }; H._cmd = cmd; H._S = S;
    TD._last = H; return H;
  }

  var TD = { start: start, params: params, DIFF: DIFF, TIERS: TIERS, COMBO_AT: COMBO_AT, _last: null };
  Object.defineProperty(TD, '_debug', { get: function () { return TD._last ? TD._last._debug : null; } });
  TD._step = function (n, dt) { if (TD._last) TD._last._step(n, dt); };
  TD._cmd = function (a, b) { return TD._last ? TD._last._cmd(a, b) : null; };
  globalThis.WQ37TD = TD;
  if (typeof module !== 'undefined') module.exports = TD;
})();
