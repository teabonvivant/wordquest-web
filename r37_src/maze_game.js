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
  var PSPEED = 4.4, FRIGHT = 6, BOOST = 3, INV = 2.4, GHOST_COL = ['#ff6b81', '#8e6bff', '#3ee6d0', '#ffc94a'];
  var STYLE_ON = false;
  function clamp(v, a, b) { return v < a ? a : v > b ? b : v; }
  var CSS = '.mz-dpad{position:absolute;z-index:5;width:168px;height:168px;opacity:.5;touch-action:none;display:none}.mz-dpad.on{display:block}.mz-dpad:active,.mz-dpad.hot{opacity:.85}' +
    '.mz-dpad button{position:absolute;width:56px;height:56px;border-radius:16px;border:1px solid rgba(255,255,255,.4);background:rgba(20,26,70,.78);color:#fff;display:flex;align-items:center;justify-content:center;padding:0;touch-action:none;cursor:pointer}' +
    '.mz-dpad button:active{background:rgba(70,80,170,.9)}.mz-dpad svg{width:26px;height:26px}' +
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
    var isMath = opts.subject === 'math', diff = clamp(opts.difficulty | 0 || 2, 1, 5), lv = opts.level || { w: 0, s: 0 }, boss = !!lv.boss, hasHint = diff === 3;
    var ch = opts.character || {}, G = null, L = null, S, base = null, qc = null, qDirty = true, qImgWait = null, dpadPref = null, dpadOn = false;
    var assetBase = opts.assetBase || 'assets/r321/';
    var rnd = GX.rng(1);
    function A(n) { return assetBase + n; }

    S = GX.shell(box, opts, { id: 'maze', music: boss ? 'boss' : (diff >= 4 ? 'drive' : 'calm'), onRestart: restart, onResize: onResize, onDestroy: function () { if (CUR && CUR.S === S) CUR = null; } });
    CUR = { S: S };
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
    var ARW = ['M6 15l6-6 6 6', 'M9 6l6 6-6 6', 'M6 9l6 6 6-6', 'M15 6l-6 6 6 6'], DPOS = [[56, 0], [112, 56], [56, 112], [0, 56]], DLBL = ['上', '右', '下', '左'];
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
        var strip = 50, qh = Math.max(66, Math.min(92, Math.round(H * .125))), bot = 56, avail = H - strip - qh - bot - 8;
        cell = Math.max(18, Math.floor(Math.min((W - 14) / cols, avail / rows, 72))); mw = cell * cols; mh = cell * rows; o.cell = cell; o.mx = Math.round((W - mw) / 2); o.my = strip + qh + 4;
        o.strip = strip; o.q = { x: 8, y: strip + 2, w: W - 16, h: qh - 4 };
        o.slots = { x: 8 + (hasHint ? 50 : 0), y: o.my + mh + 4, w: W - 16 - (hasHint ? 50 : 0), h: bot - 4 };
        o.pause = [6, 1]; o.dpadBtn = [54, 1]; o.speak = [W - 8 - 44, strip + 2 + (qh - 4 - 44) / 2]; o.hint = hasHint ? [6, o.my + mh + 6] : null;
        o.timer = { x: 8, y: strip - 6, w: W - 16, h: 5 }; o.heartsR = W - 6; o.heartsY = 18; o.hw = 11; o.scoreX = 106; o.scoreY = 3;
        var free = H - (o.my + mh + 4 + bot); o.dpadRoom = free >= 176;
        o.dpad = o.dpadRoom ? [W - 176, o.my + mh + bot + Math.max(0, (free - 176) / 2)] : [W - 176, o.my + mh - 172];
        o.mh = mh; o.mw = mw;
      } else {
        var side = 176; cell = Math.max(18, Math.floor(Math.min((H - 12) / rows, (W - 2 * side) / cols, 84))); mw = cell * cols; mh = cell * rows; o.cell = cell; o.mx = Math.round((W - mw) / 2); o.my = Math.round((H - mh) / 2);
        var lw = o.mx - 16, rx = o.mx + mw + 8, rw = W - rx - 8; o.mw = mw; o.mh = mh;
        o.pause = [8, 8]; o.heartsX = 60; o.heartsY = 30; o.hw = clamp((lw - 62) / (HEARTS[0] * 2.1), 8, 14); o.scoreX = 8; o.scoreY = 62; o.q = { x: 8, y: 106, w: lw, h: H - 114 };
        o.dpadBtn = [W - 52, 8]; o.timer = { x: rx, y: 58, w: rw, h: 6 }; o.slots = { x: rx, y: 74, w: rw, h: 88 }; o.hint = hasHint ? [rx, 168] : null;
        o.speak = [8 + (lw - 44) / 2, H - 8 - 52]; o.dpadRoom = true; o.dpad = [Math.round(rx + (rw - 168) / 2), H - 176];
      }
      return o;
    }
    function place(el, xy) { if (!el || !xy) return; el.style.left = Math.round(xy[0]) + 'px'; el.style.top = Math.round(xy[1]) + 'px'; }
    function onResize(w, h) {
      if (!G) return; var oldLand = L && L.land; L = computeLayout(w, h); G.baseNeed = true; qDirty = true;
      place(bPause, L.pause); place(bDpad, L.dpadBtn); place(bHint, L.hint); place(dpad, L.dpad); place(bSpeak, L.speak);
      if (dpadPref == null) setDpad(false); else setDpad(dpadPref === '1');
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
    function pickFree(minPlayer, existing) {
      var cand = cellsBy(function (c) { return !occupied(c) && G.M.bfs(G.player.b)[c] >= minPlayer; }); if (!cand.length) cand = cellsBy(function (c) { return !occupied(c); }); if (!cand.length) return -1;
      var best = -1, bs = -1, k;
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
      S.learn = GX.Learn({ items: opts.items, review: opts.review, subject: opts.subject, difficulty: opts.difficulty, mode: opts.mode, seed: opts.seed });
      S.ended = false; S.result = null; S.ui.closeAll(); qDirty = true;
      var hearts = HEARTS[diff - 1];
      G = { phase: 'idle', simT: 0, playT: 0, hold: false, hearts: hearts, maxHearts: hearts, score: 0, combo: 0, maxCombo: 0, mainDone: 0, condAfter: 0, condPlayed: 0, condClean: 0, hits: 0, wrongEats: 0,
        player: { a: 0, b: 0, p: 0, dir: -1, x: 0, y: 0 }, want: -1, wantT: 0, inv: 0, boost: 0, fright: 0, freeze: 0, chain: 0, wave: 'chase', waveT: 12, evT: 14, gap: null, warnT: 0, q: [], tiles: [], respawn: [], gems: [], orbs: [], portals: [], portalCd: 0, ghosts: [], rd: null, baseNeed: true, ghostsOff: false, flash: 0, hintBlink: 0, turned: false, stepN: 0, vig: 0, bossOrbT: 0, bgOk: false };
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
        for (i = 0; i < near && pool.length; i++) out.push(pool.pop());
        var rest = GX.shuffle(ALPHA.split('').filter(function (c) { return !used[c] && out.indexOf(c) < 0; }), rnd);
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
      var so = seqOf(it), rd = G.rd = { kind: 'word', item: it, seq: so.seq, disp: so.disp, i: 0, failed: false, hinted: false, t0: G.simT, limit: limitFor(so.seq.length), left: 0, hintT: 0, qText: isMath ? it.q : it.zh };
      rd.left = rd.limit; beginRound(); if (!isMath) S.later(function () { if (G && G.rd === rd && !S.paused) S.say(it); }, 350);
    }
    function startCond() {
      var cd = cond(lv.w | 0, lv.s | 0, rnd), seq = cd.tiles;
      var rd = G.rd = { kind: 'cond', cd: cd, seq: [], disp: [], i: 0, eaten: 0, need: cd.need, failed: false, t0: G.simT, limit: Math.max(26, 50 - diff * 4), left: 0, hintT: 0, qText: cd.q, item: null };
      rd.left = rd.limit; G.condPlayed++; beginRound(); S.ui.banner('條件吃！', cd.q, 1500); S.sfx('power');
    }
    function beginRound() {
      var rd = G.rd; G.phase = 'ready'; G.readyT = .8; G.tiles = []; G.tileAt = new Array(G.M.N); G.respawn = []; G.gems = []; rd.firstWrong = true;
      placeTiles(false); for (var k = 0; k < 2; k++) { var c = pickFree(2, G.gems); if (c >= 0) G.gems.push({ c: c, born: G.simT }); }
      qDirty = true; if (bHint) bHint.disabled = false; S.sfx('flip');
    }
    function placeTiles(keepProgress) {
      var rd = G.rd, list = [];
      if (rd.kind === 'word') {
        var need = rd.seq.slice(keepProgress ? rd.i : 0); need.forEach(function (c) { list.push({ ch: c, key: c, tgt: true }); });
        distractors(rd.seq, rd.item).forEach(function (c) { list.push({ ch: c, key: c, tgt: false }); });
      } else {
        rd.cd.tiles.filter(function (t) { return !(keepProgress && t.eaten); }).forEach(function (t) { list.push({ ch: t.text, key: t.text, tgt: t.tgt, why: t.why, ref: t }); });
      }
      list = GX.shuffle(list, rnd);
      list.forEach(function (t) { var c = pickFree(3, G.tiles); if (c < 0) return; t.c = c; t.born = G.simT; G.tiles.push(t); G.tileAt[c] = t; });
    }
    function nextRound() {
      if (S.ended || S.dead) return;
      if (isMath && G.mainDone > 0 && G.mainDone % 3 === 0 && G.condAfter !== G.mainDone && !S.learn.done()) { G.condAfter = G.mainDone; startCond(); return; }
      var it = S.learn.take(); if (!it) { win(); return; } startWord(it);
    }
    function failWord(why) {                                                    /* first mistake in a word round = "not first try" (item will come back) */
      var rd = G.rd; if (!rd || rd.kind !== 'word' || rd.failed) return; rd.failed = true; S.learn.answer(rd.item, false, (G.simT - rd.t0) * 1000);
    }
    function wrongEat(t, c) {
      var x = px(c % G.cols + .5), y = py(((c / G.cols) | 0) + .5), rd = G.rd;
      G.combo = 0; G.wrongEats++; G.boost = BOOST; S.sfx('bad'); S.sfx('keybad'); S.fx.burst(x, y, { colors: ['#ff6b81', '#ff9fb0', '#fff'], n: 14, speed: 160 }); S.fx.ring(x, y, { color: '#ff6b81', r1: L.cell * .8 }); S.fx.shake(3, .2);
      S.fx.text(x, y - L.cell * .4, t.why ? '✗ ' + t.why : '✗ 順序不對', { color: '#ff9fb0', size: Math.max(14, Math.round(L.cell * .4)), life: 1.1 });
      if (rd.kind === 'word') failWord(); else rd.failed = true;
      G.respawn.push({ at: G.simT + 1.2, t: t });
      if (G.bossG) G.bossG.orbs = 0;
    }
    function eatTile(t) {
      var rd = G.rd, c = t.c, x = px(c % G.cols + .5), y = py(((c / G.cols) | 0) + .5);
      G.tileAt[c] = null; G.tiles.splice(G.tiles.indexOf(t), 1);
      if (rd.kind === 'word') {
        if (t.key === rd.seq[rd.i]) {
          var slot = rd.disp.filter(function (d) { return !d.fixed; })[rd.i]; slot.filled = true; slot.ch = isMath ? t.ch : slot.ch; rd.i++;
          G.combo++; if (G.combo > G.maxCombo) G.maxCombo = G.combo; var mul = Math.min(4, 1 + Math.floor(G.combo / 4)); G.score += 10 * mul;
          S.sfx('eat', { i: rd.i - 1 }); S.sfx('key', { i: rd.i - 1 }); S.fx.burst(x, y, { colors: ['#ffc94a', '#fff', '#3ee6d0'], n: 14, speed: 150, shape: 'star' }); S.fx.ring(x, y, { r1: L.cell * .9 });
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
      S.learn.answer(it, true, ms); S.ui.ok(it); S.sfx('good'); if (!isMath) S.say(it);
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
        if (!rd.failed) failWord(); G.combo = 0; G.phase = 'card'; G.hold = true; G.tiles = []; G.tileAt = new Array(G.M.N); G.respawn = [];
        var typed = rd.disp.map(function (d) { return d.filled ? d.ch : ''; }).join('');
        S.ui.learn(rd.item, { typed: typed && typed.length < String(isMath ? rd.item.a : rd.item.en).length ? typed : '', onDone: function () { G.hold = false; if (G.hearts > 0) nextRound(); } });
      } else {
        G.phase = 'reveal'; G.combo = 0; S.ui.banner('時間到', '金光的才對', 1700);
        G.tiles.forEach(function (t) { t.reveal = t.tgt; }); later(2.2, function () { G.tiles = []; G.tileAt = new Array(G.M.N); G.respawn = []; nextRound(); });
      }
    }
    function win() {
      G.phase = 'end'; var rs = S.finish({ cleared: true, score: Math.round(G.score), maxCombo: G.maxCombo, seconds: G.playT }); G.result = rs; return rs;
    }
    function lose() { G.phase = 'end'; S.sfx('lose'); G.result = S.finish({ cleared: false, score: Math.round(G.score), maxCombo: G.maxCombo, seconds: G.playT }); }
    function later(sec, fn) { G.q.push({ t: G.simT + sec, fn: fn }); }
    function useHint() {
      if (!G || G.hold || S.paused || S.ended || !G.rd || G.phase !== 'play' || !hasHint) return;
      G.rd.hintT = 4; if (G.rd.kind === 'word') { G.rd.hinted = true; failWord(); } S.sfx('power'); S.fx.text(S.W / 2, L.my + 20, '提示（記為非首次）', { color: '#ffe9a8', size: 16, life: 1.2 });
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
      if (G.hearts <= 0) lose();
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
      var base = PSPEED * Math.min(.95, .62 + .05 * diff + .012 * (lv.s | 0)); if (g.boss) base *= .85; if (g.scared) base *= .6; if (g.stun > 0) base *= .25;
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
      if (G.phase === 'ready') { G.readyT -= h; if (G.readyT <= 0) G.phase = 'play'; return; }
      if (G.phase !== 'play' && G.phase !== 'reveal' && G.phase !== 'done') return;
      if (G.phase === 'play') { G.playT += h; G.rd.left -= h; if (G.rd.hintT > 0) G.rd.hintT -= h; }
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
          var t = G.respawn.splice(i, 1)[0].t, c = pickFree(3, G.tiles); if (c >= 0) { t.c = c; t.born = G.simT; G.tiles.push(t); G.tileAt[c] = t; S.fx.burst(px(c % G.cols + .5), py(((c / G.cols) | 0) + .5), { n: 6, speed: 70, colors: ['#8e9bff', '#fff'] }); }
        }
        if (G.rd.left <= 0) { timeout(); return; }
      }
      /* player */
      var P = G.player; if (G.phase === 'play') moveEnt(P, h, PSPEED, pChoose, pArrive); if (G.phase !== 'play' || !G) return;
      /* ghosts */
      if (G.ghostsOff) return;
      var near = 99;
      G.ghosts.forEach(function (g) {
        if (g.mode === 'home') { g.delay -= h; if (g.delay <= 0) g.mode = 'leave'; return; }
        if (G.freeze > 0) return;
        moveEnt(g, h, ghostSpeed(g), gChoose, function (e) { gArrive(e); }); if (g.mode === 'active' && !g.scared && g.stun <= 0) near = Math.min(near, G.M.bfs(P.b)[g.a === g.b ? g.a : g.b]);
      });
      if (near <= 3 && G.inv <= 0) { G.warnT -= h; G.vig = Math.min(1, G.vig + h * 3); if (G.warnT <= 0) { G.warnT = 3.5; S.sfx('warn'); } } else G.vig = Math.max(0, G.vig - h * 2);
      /* collisions */
      var pp = P; for (i = 0; i < G.ghosts.length; i++) {
        var g = G.ghosts[i]; if (g.mode === 'home') continue; var dx = g.x - pp.x, dy = g.y - pp.y, r = g.boss ? .75 : .55; if (dx * dx + dy * dy > r * r) continue;
        if (g.scared && !g.boss) { eatGhost(g); continue; }
        if (g.boss && g.stun > 0) { S.sfx('zap'); G.score += 1000; S.fx.text(px(g.x + .5), py(g.y + .5), '+1000', { color: '#8be9ff', size: 22, life: 1 }); S.fx.burst(px(g.x + .5), py(g.y + .5), { n: 36, shape: 'star', speed: 240 }); g.stun = 0; toHome(g, 10); continue; }
        if (g.mode !== 'active' || G.freeze > 0 || g.stun > 0 || G.inv > 0) continue;
        hitPlayer(); break;
      }
    }
    function upd(dt) {
      if (!G || S.dead || S.paused) return;
      if (!G.hold && !S.ended && L) { var rem = dt; while (rem > 1e-6 && G && !G.hold) { var h = Math.min(rem, .025); sim(h); rem -= h; } }
      if (G && G.flash > 0) G.flash -= dt;
      if (qImgWait && qImgWait.ok) { qImgWait = null; qDirty = true; }
    }

    /* ---------------- input ---------------- */
    function setDir(d) {
      if (!G || G.hold || S.paused || S.ended || G.phase === 'idle' || G.phase === 'end') return; var P = G.player;
      if (P.a !== P.b && P.dir >= 0 && d === ((P.dir + 2) & 3)) { var t = P.a; P.a = P.b; P.b = t; P.p = 1 - P.p; P.dir = d; G.want = -1; updPos(P); return; }
      G.want = d; G.wantT = G.simT;
    }
    var sw = null;
    S.on(S.canvas, 'pointerdown', function (e) { sw = { id: e.pointerId, x: e.clientX, y: e.clientY }; });
    S.on(window, 'pointermove', function (e) {
      if (!sw || e.pointerId !== sw.id) return; var dx = e.clientX - sw.x, dy = e.clientY - sw.y, a = Math.max(Math.abs(dx), Math.abs(dy));
      if (a >= 14) { setDir(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 1 : 3) : (dy > 0 ? 2 : 0)); sw.x = e.clientX; sw.y = e.clientY; }
    });
    S.on(window, 'pointerup', function () { sw = null; }); S.on(window, 'pointercancel', function () { sw = null; });
    S.keys({
      onArrow: function (k) { setDir({ up: 0, right: 1, down: 2, left: 3 }[k]); },
      onChar: function (k) { var m = { w: 0, d: 1, s: 2, a: 3 }[k.toLowerCase()]; if (m != null) setDir(m); },
      onSpace: function () { useHint(); }
    });

    /* ---------------- drawing ---------------- */
    function cellRect(c) { return [L.mx + (c % G.cols) * L.cell, L.my + ((c / G.cols) | 0) * L.cell]; }
    function buildBase() {
      var d = S.dpr, W = S.W, H = S.H; if (!base) base = document.createElement('canvas'); base.width = Math.round(W * d); base.height = Math.round(H * d);
      var c = base.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0);
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
      walls(); c.strokeStyle = 'rgba(108,125,255,.28)'; c.lineWidth = cs * .22; c.stroke();
      walls(); c.strokeStyle = '#8f9cff'; c.lineWidth = cs * .1; c.stroke();
      walls(); c.strokeStyle = '#dfe5ff'; c.lineWidth = cs * .035; c.stroke();
      if (G.gap) { var gcx = G.gap.c % G.cols, gcy = (G.gap.c / G.cols) | 0; c.strokeStyle = 'rgba(255,201,74,.5)'; c.lineWidth = 3; c.setLineDash([3, 5]); c.beginPath(); if (G.gap.d === 1) seg(gcx + 1, gcy + .15, gcx + 1, gcy + .85); else seg(gcx + .15, gcy + 1, gcx + .85, gcy + 1); c.stroke(); c.setLineDash([]); }
      G.baseNeed = false;
    }
    function drawGhostShape(c, x, y, r, col, scared, t, dir, alpha) {
      c.save(); c.globalAlpha = alpha; c.translate(x, y); c.fillStyle = scared ? '#5b78ff' : col;
      c.beginPath(); c.arc(0, -r * .1, r, Math.PI, 0); c.lineTo(r, r * .85);
      for (var i = 0; i < 4; i++) { var bx = r - (i + .5) * r / 2; c.quadraticCurveTo(bx + r / 4, r * (1.15 + .1 * Math.sin(t * 8 + i)), bx - r / 4 + (i === 3 ? 0 : 0), r * .85); }
      c.closePath(); c.fill(); c.fillStyle = '#fff'; var ex = dir === 1 ? r * .12 : dir === 3 ? -r * .12 : 0;
      c.beginPath(); c.arc(-r * .35, -r * .2, r * .27, 0, 6.3); c.arc(r * .35, -r * .2, r * .27, 0, 6.3); c.fill(); c.fillStyle = '#10163e';
      c.beginPath(); c.arc(-r * .35 + ex, -r * .18, r * .13, 0, 6.3); c.arc(r * .35 + ex, -r * .18, r * .13, 0, 6.3); c.fill(); c.restore();
    }
    function tileSprite(c, t, x, y, s, now) {
      var sc = Math.min(1, (G.simT - t.born) / .25), bob = Math.sin(now * 3 + t.c) * s * .02; sc = sc < 1 ? GX.ease.back(Math.max(0, sc)) : 1;
      var w = s * .8 * sc; if (w < 2) return; var hot = t.reveal || (G.rd && G.rd.kind === 'word' && ((G.rd.hintT > 0 || diff <= 2) && t.key === G.rd.seq[G.rd.i])) || (G.rd && G.rd.kind === 'cond' && G.rd.hintT > 0 && t.tgt);
      var blink = hot ? (.5 + .5 * Math.sin(now * 7)) : 0, tx = x - w / 2, ty = y - w / 2 + bob;
      if (hot) { c.globalAlpha = .35 + .45 * blink; c.fillStyle = '#ffc94a'; GX.rrect(c, tx - 4, ty - 4, w + 8, w + 8, w * .32); c.fill(); c.globalAlpha = 1; }
      var gr = c.createLinearGradient(0, ty, 0, ty + w); gr.addColorStop(0, hot ? '#6a6bd8' : '#5a68e0'); gr.addColorStop(1, hot ? '#3b3fa8' : '#323c9c');
      GX.rrect(c, tx, ty + 2, w, w, w * .26); c.fillStyle = 'rgba(0,0,0,.35)'; c.fill();
      GX.rrect(c, tx, ty, w, w, w * .26); c.fillStyle = gr; c.fill(); c.lineWidth = 2; c.strokeStyle = hot ? '#ffe9a8' : '#b4c0ff'; c.stroke();
      c.globalAlpha = .28; GX.rrect(c, tx + 3, ty + 3, w - 6, w * .38, w * .2); c.fillStyle = '#fff'; c.fill(); c.globalAlpha = 1;
      var txt = t.ch, len = txt.length, fs = Math.round(w * (len <= 1 ? .62 : len === 2 ? .5 : len === 3 ? .4 : len === 4 ? .33 : .28));
      var lb = GX.label(txt, { size: fs, weight: 900, fam: GX.EFONT, color: '#fff', stroke: 'rgba(14,18,70,.9)', strokeW: 2, dpr: S.dpr }); GX.drawLabel(c, lb, x, y + bob + 1);
    }
    function renderQ() {
      qDirty = false; var d = S.dpr, q = L.q; if (!qc) qc = document.createElement('canvas'); qc.width = Math.max(1, Math.round(q.w * d)); qc.height = Math.max(1, Math.round(q.h * d));
      var c = qc.getContext('2d'); c.setTransform(d, 0, 0, d, 0, 0); c.clearRect(0, 0, q.w, q.h);
      GX.rrect(c, 1, 1, q.w - 2, q.h - 2, 18); var gr = c.createLinearGradient(0, 0, 0, q.h); gr.addColorStop(0, 'rgba(34,42,106,.92)'); gr.addColorStop(1, 'rgba(18,24,68,.92)'); c.fillStyle = gr; c.fill(); c.strokeStyle = 'rgba(255,255,255,.2)'; c.lineWidth = 1.5; c.stroke();
      var rd = G.rd; if (!rd) return; c.textBaseline = 'middle';
      if (rd.kind === 'cond') {
        c.fillStyle = '#ffc94a'; GX.rrect(c, 10, 8, 64, 22, 11); c.fill(); c.fillStyle = '#3b2600'; c.font = '900 13px ' + GX.FONT; c.textAlign = 'center'; c.fillText('條件吃', 42, 19);
        var f = fitText(c, rd.qText, q.w - 24, q.h - 44, L.land ? 24 : 22, 14, 900, GX.FONT); c.fillStyle = '#fff'; c.font = '900 ' + f.size + 'px ' + GX.FONT; c.textAlign = 'center';
        var y0 = 34 + (q.h - 40 - f.lines.length * f.lh) / 2 + f.lh / 2; f.lines.forEach(function (ln, i) { c.fillText(ln, q.w / 2, y0 + i * f.lh); }); return;
      }
      if (isMath) {
        var f2 = fitText(c, rd.qText, q.w - 24, q.h - 12, L.land ? 24 : 22, 14, 800, GX.FONT); c.fillStyle = '#fff'; c.font = '800 ' + f2.size + 'px ' + GX.FONT; c.textAlign = 'center';
        var y1 = (q.h - f2.lines.length * f2.lh) / 2 + f2.lh / 2; f2.lines.forEach(function (ln, i) { c.fillText(ln, q.w / 2, y1 + i * f2.lh); }); return;
      }
      /* English: picture + Chinese meaning (speaker button is a DOM button) */
      var it = rd.item, ps = L.land ? Math.min(80, q.w - 30) : Math.min(q.h - 14, 64), picImg = it.img ? GX.img(it.img) : null, pcx, pcy, tw;
      if (L.land) { pcx = q.w / 2; pcy = 12 + ps / 2; } else { pcx = 10 + ps / 2; pcy = q.h / 2; }
      if (picImg && picImg.ok) { c.drawImage(picImg.el, pcx - ps / 2, pcy - ps / 2, ps, ps); } else if (picImg && !picImg.bad) qImgWait = picImg; else if (it.emoji) { var em = GX.emoji(it.emoji, Math.round(ps * .8), d); c.drawImage(em.c, pcx - em.s / 2, pcy - em.s / 2, em.s, em.s); }
      if (L.land) { var f3 = fitText(c, it.zh, q.w - 16, q.h - ps - 80, 30, 18, 900, GX.FONT); c.fillStyle = '#fff'; c.font = '900 ' + f3.size + 'px ' + GX.FONT; c.textAlign = 'center'; f3.lines.forEach(function (ln, i) { c.fillText(ln, q.w / 2, 12 + ps + 24 + i * f3.lh); }); }
      else { tw = q.w - ps - 20 - 56; var f4 = fitText(c, it.zh, tw, q.h - 12, 32, 18, 900, GX.FONT); c.fillStyle = '#fff'; c.font = '900 ' + f4.size + 'px ' + GX.FONT; c.textAlign = 'center'; var y2 = (q.h - f4.lines.length * f4.lh) / 2 + f4.lh / 2; f4.lines.forEach(function (ln, i) { c.fillText(ln, 10 + ps + 10 + tw / 2, y2 + i * f4.lh); }); }
    }
    function slotLayout() {
      var rd = G.rd; if (!rd || !rd.disp.length) return null; var n = rd.disp.length, R = L.slots, g = 4, sw = 36, per = n, rowsN = 1;
      if (n * (sw + g) - g > R.w) { sw = Math.floor((R.w + g) / n) - g; if (sw < 24) { per = Math.ceil(n / 2); rowsN = 2; sw = Math.min(36, Math.floor((R.w + g) / per) - g); } }
      if (L.land && rowsN === 1 && n > 4) { per = Math.ceil(n / 2); rowsN = 2; sw = Math.min(34, Math.floor((R.w + g) / per) - g); }
      sw = Math.max(16, sw); return { n: n, sw: sw, g: g, per: per, rows: rowsN };
    }
    function draw(c, W, H) {
      if (!G || !L) return; if (G.baseNeed || (!G.bgOk && GX.img(A(L.land ? 'bg_mz_land.webp' : 'bg_mz_port.webp')).ok)) buildBase();
      if (qDirty) renderQ();
      var now = S.t, cs = L.cell, rd = G.rd, i;
      c.drawImage(base, 0, 0, W, H); c.drawImage(qc, L.q.x, L.q.y, L.q.w, L.q.h);
      /* HUD */
      var hw = L.hw, hsp = hw * 2.1;
      for (i = 0; i < G.maxHearts; i++) {
        var hxp = L.land ? L.heartsX + i * hsp + hw : L.heartsR - (G.maxHearts - i) * hsp + hw, hyp = L.heartsY;
        heartPath(c, hxp, hyp, hw * .8); c.fillStyle = i < G.hearts ? '#ff5f7e' : 'rgba(255,255,255,.14)'; c.fill(); c.lineWidth = 1.5; c.strokeStyle = i < G.hearts ? '#ffd0d9' : 'rgba(255,255,255,.2)'; c.stroke();
      }
      var sc = GX.label('分數 ' + Math.round(G.score), { size: 15, weight: 900, color: '#ffe9a8', dpr: S.dpr, stroke: 'rgba(10,14,50,.8)', strokeW: 2 });
      c.drawImage(sc.c, L.scoreX, L.scoreY - 2, sc.w, sc.h);
      var prog = S.learn.progress(), pt = (isMath && rd && rd.kind === 'cond') ? '條件吃 ' + rd.eaten + '/' + rd.need : '第 ' + Math.min(prog.total, prog.done + 1) + ' / ' + prog.total + ' 字' + (isMath ? '' : ''),
        pl = GX.label(isMath && !(rd && rd.kind === 'cond') ? pt.replace(' 字', ' 題') : pt, { size: 12, weight: 800, color: '#c3cbf7', dpr: S.dpr });
      c.drawImage(pl.c, L.scoreX, L.scoreY + 22, pl.w, pl.h);
      if (G.combo >= 2) { var cb = GX.label('×' + Math.min(4, 1 + Math.floor(G.combo / 4)) + '  ' + G.combo + ' 連', { size: 13, weight: 900, color: '#ff9f43', dpr: S.dpr }); c.drawImage(cb.c, L.scoreX + pl.w + 6, L.scoreY + 21, cb.w, cb.h); }
      if (rd && G.phase !== 'idle') {
        var fr = clamp(rd.left / rd.limit, 0, 1), T = L.timer; c.fillStyle = 'rgba(255,255,255,.14)'; GX.rrect(c, T.x, T.y, T.w, T.h, T.h / 2); c.fill();
        c.fillStyle = fr < .25 ? '#ff6b81' : fr < .5 ? '#ffc94a' : '#3ee6a0'; if (fr > 0) { GX.rrect(c, T.x, T.y, Math.max(T.h, T.w * fr), T.h, T.h / 2); c.fill(); }
      }
      /* answer slots */
      var sl = slotLayout();
      if (sl) {
        var R = L.slots, perRow = sl.per, rowW = perRow * (sl.sw + sl.g) - sl.g, nextI = rd.disp.findIndex(function (d) { return !d.filled; });
        for (i = 0; i < sl.n; i++) {
          var rr = (i / perRow) | 0, cc = i % perRow, cnt = Math.min(perRow, sl.n - rr * perRow), rw2 = cnt * (sl.sw + sl.g) - sl.g, sx = R.x + (R.w - rw2) / 2 + cc * (sl.sw + sl.g), sy = R.y + (L.land ? 4 : (R.h - sl.sw) / 2) + rr * (sl.sw + sl.g), d = rd.disp[i];
          GX.rrect(c, sx, sy, sl.sw, sl.sw, sl.sw * .26); c.fillStyle = d.filled ? (d.fixed ? 'rgba(255,255,255,.08)' : 'rgba(62,230,160,.28)') : 'rgba(255,255,255,.1)'; c.fill();
          c.lineWidth = i === nextI ? 3 : 1.5; c.strokeStyle = i === nextI ? 'rgba(255,201,74,' + (.55 + .45 * Math.sin(now * 6)) + ')' : (d.filled && !d.fixed ? '#3ee6a0' : 'rgba(255,255,255,.28)'); c.stroke();
          if (d.filled) { var lbs = GX.label(d.ch, { size: Math.round(sl.sw * .66), weight: 900, fam: GX.EFONT, color: d.fixed ? '#c3cbf7' : '#fff', dpr: S.dpr }); GX.drawLabel(c, lbs, sx + sl.sw / 2, sy + sl.sw / 2); }
        }
      } else if (rd && rd.kind === 'cond') {
        var lb2 = GX.label('吃掉全部符合的方塊', { size: 14, weight: 800, color: '#c3cbf7', dpr: S.dpr }); GX.drawLabel(c, lb2, L.slots.x + L.slots.w / 2, L.slots.y + L.slots.h / 2 - (L.land ? 20 : 0));
      }
      /* specials */
      var oi, sp = Math.round(cs * .8);
      G.portals.forEach(function (p) { var x = px(p.c % G.cols + .5), y = py(((p.c / G.cols) | 0) + .5), cd = G.portalCd > 0; c.globalAlpha = cd ? .4 : 1; if (!GX.drawImg(c, A('mz_portal.webp'), x, y, cs * .95, cs * .95, { rot: now * (cd ? .5 : 2) })) { c.strokeStyle = '#8e6bff'; c.lineWidth = 3; for (var k = 0; k < 3; k++) { c.beginPath(); c.arc(x, y, cs * (.15 + k * .1) + Math.sin(now * 4 + k) * 2, 0, 6.3); c.stroke(); } } c.globalAlpha = 1; });
      G.orbs.forEach(function (o) { if (!o.alive) return; var x = px(o.c % G.cols + .5), y = py(((o.c / G.cols) | 0) + .5) + Math.sin(now * 3 + o.c) * 2; if (!GX.drawImg(c, A('mz_orb.webp'), x, y, cs * .8, cs * .8, null)) { var rg = c.createRadialGradient(x, y, 1, x, y, cs * .38); rg.addColorStop(0, '#fff'); rg.addColorStop(.5, '#6c8bff'); rg.addColorStop(1, 'rgba(108,139,255,0)'); c.fillStyle = rg; c.beginPath(); c.arc(x, y, cs * .4, 0, 6.3); c.fill(); } });
      G.gems.forEach(function (g) { var x = px(g.c % G.cols + .5), y = py(((g.c / G.cols) | 0) + .5) + Math.sin(now * 4 + g.c) * 2; if (!GX.drawImg(c, A('mz_gem.webp'), x, y, cs * .55, cs * .55, null)) { c.fillStyle = '#8be9ff'; c.beginPath(); c.moveTo(x, y - cs * .2); c.lineTo(x + cs * .16, y); c.lineTo(x, y + cs * .2); c.lineTo(x - cs * .16, y); c.closePath(); c.fill(); } });
      if (G.gap) { var gx2 = G.gap.c % G.cols, gy2 = (G.gap.c / G.cols) | 0, ex = G.gap.d === 1 ? gx2 + 1 : gx2 + .5, ey = G.gap.d === 1 ? gy2 + .5 : gy2 + 1; c.globalAlpha = .5 + .5 * Math.sin(now * 8); c.fillStyle = '#ffe9a8'; c.beginPath(); c.arc(px(ex), py(ey), cs * .09, 0, 6.3); c.fill(); c.globalAlpha = 1; }
      G.tiles.forEach(function (t) { tileSprite(c, t, px(t.c % G.cols + .5), py(((t.c / G.cols) | 0) + .5), cs, now); });
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
        if (G.freeze > 0) { c.globalAlpha = .35; c.fillStyle = '#bfe9ff'; c.beginPath(); c.arc(x, y, sz * .42, 0, 6.3); c.fill(); c.globalAlpha = 1; }
      });
      /* player */
      var P = G.player, x0 = px(P.x + .5), y0 = py(P.y + .5), ps2 = cs * .98, blink = G.inv > 0 && Math.floor(now * 10) % 2 === 0;
      if (!blink) {
        c.globalAlpha = .3; c.fillStyle = '#000'; c.beginPath(); c.ellipse(x0, y0 + ps2 * .38, ps2 * .3, ps2 * .09, 0, 0, 6.3); c.fill(); c.globalAlpha = 1;
        var by = y0 + Math.sin(now * 9) * (P.a !== P.b ? 2 : 1); if (!(ch.img && GX.drawImg(c, ch.img, x0, by, ps2, ps2, { flip: P.dir === 3 }))) { var em2 = GX.emoji(ch.icon || '🐼', Math.round(ps2 * .78), S.dpr); c.drawImage(em2.c, x0 - em2.s / 2, by - em2.s / 2, em2.s, em2.s); }
        if (G.inv > 0) { c.strokeStyle = 'rgba(255,233,168,.8)'; c.lineWidth = 2; c.beginPath(); c.arc(x0, y0, ps2 * .5, 0, 6.3); c.stroke(); }
      }
      if (G.vig > 0) { var vg = c.createRadialGradient(W / 2, H / 2, Math.min(W, H) * .35, W / 2, H / 2, Math.max(W, H) * .75); vg.addColorStop(0, 'rgba(255,60,90,0)'); vg.addColorStop(1, 'rgba(255,60,90,' + (.28 * G.vig * (.6 + .4 * Math.sin(now * 10))) + ')'); c.fillStyle = vg; c.fillRect(0, 0, W, H); }
      if (G.fright > 0) { c.fillStyle = 'rgba(108,139,255,' + (.06 + .02 * Math.sin(now * 6)) + ')'; c.fillRect(0, 0, W, H); }
      if (G.phase === 'ready') { var rl = GX.label(rd && rd.kind === 'cond' ? '準備！' : '準備…', { size: Math.round(cs * .8), weight: 900, color: '#fff', dpr: S.dpr, stroke: 'rgba(10,14,50,.9)', strokeW: 3 }); GX.drawLabel(c, rl, W / 2, L.my + cs * G.rows / 2, clamp(G.readyT / .4, 0, 1)); }
    }

    /* ---------------- flow ---------------- */
    function begin() {
      G.phase = 'idle'; S.audio.music(boss ? 'boss' : (diff >= 4 ? 'drive' : 'calm'));
      if (boss) { S.ui.banner('魔王關', '連吃 3 顆墨水，擊暈大魔王', 1500); S.sfx('boss'); }
      nextRound();
    }
    function restart() { newGame(); onResizeInit(); begin(); }
    function onResizeInit() { L = computeLayout(S.W, S.H); if (G && !G.M) { buildMaze(); G.tileAt = new Array(G.M.N); setupSpecials(); var P = G.player; P.a = P.b = G.spawn; updPos(P); makeGhosts(); } onResize(S.W, S.H); }
    L = computeLayout(S.W, S.H);
    newGame(); onResizeInit();
    var firstRun = true;
    S.loop(upd, draw);
    S.ui.how('maze', '字母迷宮', [{ icon: '👆', text: '滑動走位' }, { icon: '🔤', text: '按序吃字' }, { icon: '👻', text: '躲開幽靈' }], function () {
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
        maze: { open: Array.prototype.slice.call(G.M.open), N: G.M.N }, learnLeft: S.learn.remaining(), ended: !!S.ended, result: S.result || null, layout: { cell: L.cell, mx: L.mx, my: L.my, mw: L.mw, mh: L.mh, q: L.q, slots: L.slots, land: L.land }, holdOpen: S.ui.open('learn'),
        tileCount: G.tiles.length, dpadOn: dpadOn, ghostsOff: G.ghostsOff
      };
    };
    CUR.cmd = function (name, a) {
      var P = G.player;
      function stand(c) { P.a = P.b = c; P.p = 0; updPos(P); pArrive(P); }
      if (name === 'goto') { if (G.phase === 'ready') { G.phase = 'play'; } stand(a); return true; }
      if (name === 'ready') { if (G.phase === 'ready') G.phase = 'play'; return G.phase; }
      if (name === 'noGhosts') { G.ghostsOff = !!a; return true; }
      if (name === 'eatNext') { var rd = G.rd; if (G.phase === 'ready') G.phase = 'play'; var t = G.tiles.filter(function (x) { return rd.kind === 'word' ? x.key === rd.seq[rd.i] : x.tgt; })[0]; if (!t) return false; stand(t.c); return true; }
      if (name === 'eatWrong') { var rd2 = G.rd; if (G.phase === 'ready') G.phase = 'play'; var t2 = G.tiles.filter(function (x) { return rd2.kind === 'word' ? x.key !== rd2.seq[rd2.i] : !x.tgt; })[0]; if (!t2) return false; stand(t2.c); return true; }
      if (name === 'eatChar') { var t3 = G.tiles.filter(function (x) { return x.ch === a; })[0]; if (!t3) return false; stand(t3.c); return true; }
      if (name === 'left') { G.rd.left = a; return true; }
      if (name === 'hit') { hitPlayer(); return true; }
      if (name === 'orb') { var o = G.orbs.filter(function (x) { return x.alive; })[0]; if (!o) return false; stand(o.c); return true; }
      if (name === 'place') { var g = G.ghosts[a.i]; g.mode = a.mode || 'active'; g.a = g.b = a.c; g.p = 0; g.prev = a.prev == null ? -1 : a.prev; g.scared = !!a.scared; updPos(g); return true; }
      if (name === 'player') { P.a = P.b = a.c; P.p = 0; P.dir = a.dir == null ? -1 : a.dir; updPos(P); return true; }
      if (name === 'target') { return aiTarget(G.ghosts[a], true); }
      if (name === 'choose') { var gg = G.ghosts[a.i]; var sv = ERR[diff - 1]; ERR[diff - 1] = 0; var dd = gChoose(gg); ERR[diff - 1] = sv; return dd < 0 ? -1 : G.M.nb(gg.a, dd); }
      if (name === 'wave') { G.wave = a; return true; }
      if (name === 'gem') { return G.gems.map(function (x) { return x.c; }); }
      if (name === 'event') { pickEvent(); return G.gap ? { gap: G.gap.c } : { freeze: G.freeze }; }
      if (name === 'closeGap') { if (G.gap) G.gap.left = 0; return true; }
      if (name === 'dir') { setDir(a); return true; }
      if (name === 'hint') { useHint(); return true; }
      if (name === 'timeout') { G.rd.left = 0.001; return true; }
      return null;
    };
    CUR.step = function (n, dt) { S._step(n, dt); };
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
