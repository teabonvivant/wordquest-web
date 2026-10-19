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
      '.cd-card .hit{position:absolute;left:1%;top:calc(var(--u)*26);z-index:4;min-width:calc(var(--u)*26);height:calc(var(--u)*26);border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff3a8,#ff9d00);color:#4a2b00;font-weight:900;font-size:max(11px,calc(var(--u)*12));display:flex;align-items:center;justify-content:center;border:2px solid #fff;box-shadow:0 0 12px rgba(255,170,0,.9);animation:cdpulse 1.2s infinite}' +
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
      '.cd-rm .cd-card{transition-duration:.12s}' +
      '@media (prefers-reduced-motion:reduce){.cd-card.evo .fr,.cd-chip.wk,.cd-hit2,.cd-card .hit,.cd-end.pulse{animation:none!important}.cd-sheet{animation:none}}';
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
        '<div class="cd-hand" data-r="hand"></div><button type="button" class="cd-end" data-r="end" aria-label="結束回合"><span>結束回合</span>' + ico('next', 20) + '</button>';
      var q = function (r) { return ui.querySelector('[data-r="' + r + '"]'); };
      ['lv', 'turn', 'dn', 'xn', 'minfo', 'mname', 'mph', 'mlag', 'mfr', 'mhp', 'int', 'wk', 'blk', 'me', 'av', 'plag', 'pfr', 'php', 'psh', 'pshn', 'en', 'hand', 'end'].forEach(function (r) { el[r] = q(r); });
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
        lay.hb = H - 14; lay.meY = lay.hb - lay.ch - (lay.desk ? 16 : 4) - lay.meH; lay.endX = colX + colW - lay.endW - 8; lay.endY = lay.meY + 3; lay.hx0 = (lay.desk ? (W - Math.min(W - 40, 920)) / 2 : 14); lay.hx1 = W - lay.hx0;
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
      S.sfx('flip'); relayout(); hud();
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
        S.sfx(rest > 0 ? 'boom' : 'shield'); S.fx.shake(rest > 0 ? 7 : 3, .3); if (rest > 0) { S.fx.flash('#ff4060', .3); el.av.classList.remove('hurt'); void el.av.offsetWidth; el.av.classList.add('hurt'); }
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
      after(0.3, function () { m.dying = true; m.dieT = 0.001; S.sfx('boom'); S.fx.shake(6, .3); S.fx.burst(lay.mx, lay.mcy, { n: 40, speed: 260, colors: ['#ffc94a', '#fff', '#ff5fa2', '#3ee6d0'], shape: 'star', size: 6 }); S.fx.ring(lay.mx, lay.mcy, { r1: lay.msize, color: '#ffc94a', width: 6 }); });
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
        flyEl(c, mc.x, mc.y, 0, true);
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
        flyEl(c, lay.pcx, lay.pcy, 0, true); G.shield += eff.value; S.later(function () { S.sfx('shield'); S.fx.ring(lay.pcx, lay.pcy, { r1: 56, color: '#58aaff', width: 5 }); S.fx.burst(lay.pcx, lay.pcy, { n: 14, colors: ['#58aaff', '#cfe6ff'], speed: 120 }); S.fx.text(lay.pcx + 34, lay.pcy - 26, '+' + eff.value + ' 護盾', { color: '#9fd0ff', size: 22 }); hud(); }, 260);
      } else if (ty === 'heal') {
        flyEl(c, lay.pcx, lay.pcy, 0, true); var before = G.hp; G.hp = Math.min(G.maxHp, G.hp + eff.value); eff.dealt = G.hp - before; S.later(function () { S.sfx('heal'); S.fx.burst(lay.pcx, lay.pcy, { n: 16, colors: ['#3ee6a0', '#fff', '#a8ffd8'], speed: 110, grav: -60 }); S.fx.text(lay.pcx + 34, lay.pcy - 26, '+' + eff.dealt, { color: '#5af0b0', size: 26 }); hud(); }, 260);
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
        if (G.combo >= 3) S.fx.text(S.W / 2, lay.hb - lay.ch * 1.2, '連擊 ×' + G.combo + (G.combo > 1 ? '  +' + Math.round((eff.cm - 1) * 100) + '%' : ''), { color: '#ffc94a', size: 20 });
        var wasEvo = !!G.evo[it.id]; if (!wasEvo && G.okN[it.id] >= 3) { G.evo[it.id] = true; S.later(function () { S.sfx('power'); S.fx.text(S.W / 2, S.H * 0.5, '★ 進化！', { color: '#ffd35a', size: 30, life: 1.2 }); S.fx.burst(S.W / 2, S.H * 0.55, { n: 24, shape: 'star', colors: ['#ffc94a', '#fff'], size: 6 }); }, 500); }
        applyEffect(card, eff); G.lockUntil = G.clock + 0.3; layoutHand(); hud();
      } else {
        G.combo = 0; if (card.el) { card.el.classList.add('brk'); var be = card.el; S.later(function () { if (be.parentNode) be.parentNode.removeChild(be); }, 650); card.el = null; } G.discard.push({ item: it, meta: card.meta, broken: true, uid: card.uid });
        S.sfx('bad'); S.fx.shake(3, .2); S.fx.flash('#ff4060', .18); S.fx.text(S.W / 2, S.H * 0.45, '牌破損了…', { color: '#ff8a9a', size: 26 });
        if (opts.character && opts.character.perk === 'shield' && !G.wrongFirst) { G.wrongFirst = true; G.energy = Math.min(MAX_EN, G.energy + costOf(card)); S.fx.text(S.W / 2, S.H * 0.52, '小兔守護：能量退還', { color: '#9fd0ff', size: 16 }); }
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
      var bob = Math.sin(t * 2.3) * s * 0.015, sx = 1 + 0.1 * m.hitT * Math.sin(m.hitT * 9), sy = 1 - 0.14 * m.hitT, lg = m.lunge, alpha = 1, rot = 0, born = m.bornT;
      if (m.dying) { alpha = 1 - m.dieT; rot = m.dieT * 0.5; sx *= 1 + m.dieT * 0.25; sy *= 1 + m.dieT * 0.25; }
      /* shadow */
      c.save(); c.globalAlpha = 0.35 * alpha; c.fillStyle = '#000'; c.beginPath(); c.ellipse(lay.mx, lay.my + 4, s * 0.42, s * 0.07, 0, 0, 6.3); c.fill(); c.restore();
      /* monster */
      c.save(); c.translate(lay.mx + (m.dizzy ? Math.sin(t * 24) * 2 : 0), lay.my + bob + lg * (lay.land ? s * 0.12 : s * 0.22)); c.rotate(rot); c.scale(sx * (1 + lg * 0.18) * (1 + born * 0.4), sy * (1 + lg * 0.18) * (1 + born * 0.4)); c.globalAlpha = alpha * (m.dizzy ? 0.88 : 1);
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
      if (cfgMusic()) S.audio.music(cfgMusic()); startTurn();
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
        queue: (function () { var o = [], k, x; for (k = 0; k < 12; k++) { x = S.learn.peek(k); if (!x) break; o.push(x.id); } return o; })(), stats: (function () { var o = {}; Object.keys(S.learn.stats).forEach(function (k) { var t = S.learn.stats[k]; o[k] = { tries: t.tries, firstOk: t.firstOk, ok: t.ok, missed: t.missed, requeued: t.requeued, rv: t.rv }; }); return o; })(), evo: Object.assign({}, G.evo), okN: Object.assign({}, G.okN), fin: G.fin ? { left: G.fin.left, total: G.fin.total } : null, progress: S.learn.progress(), remaining: S.learn.remaining(), result: S.result || null, layout: { cw: lay.cwE, ch: lay.chE, land: !!lay.land, mx: lay.mx, mcy: lay.mcy, msize: lay.msize, hb: lay.hb, meY: lay.meY }, spent: G.spent, events: G.events
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
