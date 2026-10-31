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
