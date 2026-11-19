/* THE ORANGE FREQUENCY — film.js
 * Every pixel is a pure function of the playhead t. OneTake's window.OM (lib/motion.js) supplies the moves;
 * this file is the adapter: HyperFrames "hf-seek" (and the GSAP root timeline as fallback) -> draw(t).  */
(function () {
  'use strict';
  const OM = window.OM, C = window.CUES;
  const { ease, seg, lerp, clamp, spring } = OM;
  const W = 1920, H = 1080, TAU = Math.PI * 2;
  const $ = id => document.getElementById(id);
  const rg = OM.rng(11);

  // ───────────────────────── helpers ─────────────────────────
  function show(el, on) { const d = on ? 'block' : 'none'; if (el._d !== d) { el.style.display = d; el._d = d; } }
  function put(el, x, y, o) {
    o = o || {}; const s = o.s == null ? 1 : o.s;
    el.style.transform = 'translate(' + x + 'px,' + y + 'px) translate(-50%,-50%) rotate(' + (o.r || 0) + 'rad) scale(' + s * (o.sx == null ? 1 : o.sx) + ',' + s * (o.sy == null ? 1 : o.sy) + ')';
    if (o.o !== undefined) el.style.opacity = o.o;
    if (o.b !== undefined) el.style.filter = o.b > 0.1 ? 'blur(' + o.b.toFixed(1) + 'px)' : 'none';
  }
  function box(el, x, y, w, h, r) { const s = el.style; s.left = x + 'px'; s.top = y + 'px'; s.width = w + 'px'; s.height = h + 'px'; if (r != null) s.borderRadius = r + 'px'; }
  const camMat = (el, cam, depth) => { el.style.transform = 'matrix(' + OM.view(cam, { depth: depth || 0 }).join(',') + ')'; };
  const pt = (cam, x, y) => { const m = OM.view(cam); return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]]; };
  function irisClip(el, t, t0, t1, cx, cy, curve) {
    const k = (curve || ease.expoOut)(seg(t, t0, t1)), far = Math.hypot(Math.max(cx, W - cx), Math.max(cy, H - cy)) + 6, r = far * k;
    el.style.clipPath = 'circle(' + r.toFixed(1) + 'px at ' + cx + 'px ' + cy + 'px)'; return r;
  }
  const irisRing = $('irisRing');
  function ringAt(cx, cy, r, on) {
    if (!on || r < 2) { show(irisRing, false); return; } show(irisRing, true);
    const s = irisRing.style; s.left = (cx - r) + 'px'; s.top = (cy - r) + 'px'; s.width = (2 * r) + 'px'; s.height = (2 * r) + 'px';
  }
  const win = (t, a, b) => t >= a && t < b;
  const sub = (v, a, b) => seg(v, a, b);

  // ───────────────────────── build-time DOM ─────────────────────────
  function buildRays(svg, key) {
    let h = '<g id="' + key + '">'; for (let i = 0; i < 24; i++) {
      const a = i / 24 * TAU + 0.08 * rg(), r0 = 500 + rg() * 40, r1 = r0 + 55 + rg() * 85;
      h += '<line x1="' + (960 + Math.cos(a) * r0).toFixed(1) + '" y1="' + (540 + Math.sin(a) * r0).toFixed(1) + '" x2="' + (960 + Math.cos(a) * r1).toFixed(1) + '" y2="' + (540 + Math.sin(a) * r1).toFixed(1) + '" stroke="#220402" stroke-width="10" stroke-linecap="round"/>';
    } svg.innerHTML = h + '</g>';
  }
  buildRays($('rays'), 'rg2'); buildRays($('rays4'), 'rg4');
  const rays2 = $('rg2'), rays4 = $('rg4');
  const raySet = (g, rot, s, o) => { g.setAttribute('transform', 'translate(960 540) rotate(' + rot + ') scale(' + s + ') translate(-960 -540)'); g.setAttribute('opacity', o); };

  const ICON = {
    food: '<svg viewBox="0 0 48 48" width="48" height="48"><circle cx="26" cy="26" r="13" fill="#FF5A00"/><circle cx="26" cy="26" r="8" fill="#F4EDE3"/><path d="M8 7v13M12 7v13M16 7v13M12 20v21" stroke="#220402" stroke-width="3.2" fill="none" stroke-linecap="round"/></svg>',
    mart: '<svg viewBox="0 0 48 48" width="48" height="48"><path d="M6 18h36l-4 20H10z" fill="#FF5A00"/><path d="M16 18l6-10M32 18l-6-10" stroke="#220402" stroke-width="3.2" stroke-linecap="round"/><path d="M18 24v9M24 24v9M30 24v9" stroke="#F4EDE3" stroke-width="3" stroke-linecap="round"/></svg>',
    groc: '<svg viewBox="0 0 48 48" width="48" height="48"><circle cx="24" cy="28" r="14" fill="#FF5A00"/><path d="M24 14c0-5 3-8 8-8-1 5-3 8-8 8z" fill="#220402"/></svg>',
    pharm: '<svg viewBox="0 0 48 48" width="48" height="48"><rect x="8" y="8" width="32" height="32" rx="9" fill="#FF5A00"/><path d="M24 15v18M15 24h18" stroke="#F4EDE3" stroke-width="5" stroke-linecap="round"/></svg>',
    dine: '<svg viewBox="0 0 48 48" width="48" height="48"><path d="M7 14h34v6a4 4 0 000 8v6H7v-6a4 4 0 000-8z" fill="#FF5A00"/><path d="M19 18v12M25 18v12M31 18v12" stroke="#F4EDE3" stroke-width="3" stroke-linecap="round" stroke-dasharray="3 5"/></svg>'
  };
  const TILES = [['المطاعم', 'food', ''], ['طلبات مارت', 'mart', 'سريع'], ['البقالة', 'groc', ''], ['صيدليات', 'pharm', ''], ['DineOut', 'dine', 'جديد']];
  $('tiles').innerHTML = TILES.map((d, i) => '<div id="tile' + i + '" class="tile" style="left:' + (332 - i * 100) + 'px"><div class="ib">' + ICON[d[1]] + '</div>' + (d[2] ? '<div class="badge">' + d[2] + '</div>' : '') + '<div class="tl">' + d[0] + '</div></div>').join('');
  $('steam').innerHTML = Array.from({ length: 7 }, (_, i) => '<div class="steam" id="st' + i + '"></div>').join('');
  $('s7steam').innerHTML = Array.from({ length: 6 }, (_, i) => '<div class="steam" id="sx' + i + '"></div>').join('');
  $('orbit').innerHTML = '<circle id="or1" cx="960" cy="540" r="468" fill="none" stroke="#FF5A00" stroke-width="12" stroke-linecap="round"/><circle id="or2" cx="960" cy="540" r="500" fill="none" stroke="#F4EDE3" stroke-width="3" stroke-linecap="round" opacity=".6"/>';
  const or1 = $('or1'), or2 = $('or2');
  // S4 burst chips (macro crops of the real photography)
  const CHIPS = [['pizza_box_hands', '24% 44%', '320%'], ['poke_bowl', '38% 36%', '300%'], ['grocery_flatlay', '30% 28%', '300%'], ['poke_bowl', '65% 66%', '280%'], ['pizza_box_hands', '15% 70%', '300%'], ['grocery_flatlay', '62% 45%', '300%'], ['poke_bowl', '20% 62%', '280%'], ['pizza_box_hands', '52% 34%', '300%'], ['grocery_flatlay', '48% 70%', '300%'], ['poke_bowl', '80% 25%', '300%']];
  $('chips').innerHTML = CHIPS.map((c, i) => '<div id="cp' + i + '" class="chipf" style="background-image:url(assets/img/' + c[0] + '.jpg);background-position:' + c[1] + ';background-size:' + c[2] + '"></div>').join('');

  // S5 worlds
  const WPOS = [[0, 0], [2300, 0], [2300, 1300], [0, 1300]];
  const S5 = [
    { bg: '#220402', html: '<div class="abs" style="left:1000px;top:380px;width:1040px;height:1040px;border-radius:50%;background:url(assets/img/pizza_box_hands.jpg) 30% 45%/cover;box-shadow:0 0 0 14px #FF5A00,0 60px 120px rgba(0,0,0,.5)"></div><div id="w0p" class="ph3" style="left:250px;top:150px;transform:rotate(-5deg)"><img src="assets/img/ui_ar_home.jpg"></div><div id="w0t" class="ttl" style="right:110px;top:110px;font-size:230px;color:#F4EDE3">المطاعم</div><div id="w0s" class="sub" style="right:118px;top:370px;font-size:46px;color:#FF5A00">كل المطاعم اللي بتحبها</div>' },
    { bg: '#FFC72C', html: '<div class="abs" style="left:90px;top:80px;width:780px;height:920px;border-radius:60px;background:url(assets/img/grocery_flatlay.jpg) 50% 70%/cover;box-shadow:0 40px 90px rgba(34,4,2,.35)"></div><div id="w1p" class="ph3" style="left:520px;top:220px;width:400px;transform:rotate(4deg)"><img src="assets/img/ui_ar_mart.jpg"></div><div id="w1t" class="ttl" style="right:100px;top:140px;font-size:168px;color:#220402">طلبات مارت</div><div id="w1s" class="sub" style="right:108px;top:370px;font-size:46px;color:#220402">أساسياتك اليومية،<br>توصلك في أي وقت</div>' },
    { bg: '#F4EDE3', html: '<div class="abs" style="left:-300px;top:-300px;width:1300px;height:1300px;border-radius:50%;background:#FF5A00"></div><div id="w2p" class="ph3" style="left:300px;top:130px;width:460px;transform:rotate(-3deg)"><img src="assets/img/ui_ar_fruitveg.jpg"></div><div id="w2t" class="ttl" style="right:100px;top:190px;font-size:160px;line-height:1.15;color:#220402">الفواكه<br>والخضروات</div><div id="w2s" class="sub" style="right:108px;top:560px;font-size:46px;color:#220402">كل اللي بيتك محتاجه</div>' },
    { bg: '#EBE8FD', html: '<div class="abs" style="left:-200px;top:660px;width:2400px;height:700px;background:#7B3FE4;transform:rotate(-7deg)"></div><div id="w3p" class="ph3" style="left:260px;top:90px;width:470px;transform:rotate(3deg)"><img src="assets/img/ui_ar_pro_stores.jpg"></div><div id="w3t" class="ttl" style="right:110px;top:160px;font-size:260px;color:#7B3FE4">ال pro</div><div id="w3s" class="sub" style="right:118px;top:470px;font-size:56px;color:#220402">توصيل مجاني<br>ومزايا حصرية</div>' }
  ];
  $('s5w').innerHTML = S5.map((w, i) => '<div id="wd' + i + '" class="wd" style="left:' + WPOS[i][0] + 'px;top:' + WPOS[i][1] + 'px;background:' + w.bg + '">' + w.html + '</div>').join('');

  // S6 city
  const ROUTE = [[-1200, 1600], [-1200, 800], [-400, 800], [-400, 0], [800, 0], [800, -800], [1600, -800], [1600, -1600]];
  const RAD = 170;
  let d = 'M' + ROUTE[0].join(' ');
  for (let i = 1; i < ROUTE.length - 1; i++) {
    const a = ROUTE[i - 1], b = ROUTE[i], c = ROUTE[i + 1];
    const u = [Math.sign(b[0] - a[0]), Math.sign(b[1] - a[1])], v = [Math.sign(c[0] - b[0]), Math.sign(c[1] - b[1])];
    d += ' L' + (b[0] - u[0] * RAD) + ' ' + (b[1] - u[1] * RAD) + ' Q' + b[0] + ' ' + b[1] + ' ' + (b[0] + v[0] * RAD) + ' ' + (b[1] + v[1] * RAD);
  }
  d += ' L' + ROUTE[ROUTE.length - 1].join(' ');
  const distToRoute = (x, y) => { let m = 1e9; for (let i = 0; i < ROUTE.length - 1; i++) { const a = ROUTE[i], b = ROUTE[i + 1]; const px = clamp(x, Math.min(a[0], b[0]), Math.max(a[0], b[0])), py = clamp(y, Math.min(a[1], b[1]), Math.max(a[1], b[1])); m = Math.min(m, Math.hypot(x - px, y - py)); } return m; };
  let roads = ''; for (let k = -2000; k <= 2000; k += 400) { roads += '<line x1="' + k + '" y1="-2400" x2="' + k + '" y2="2400" stroke="#2b1710" stroke-width="130"/><line x1="-2400" y1="' + k + '" x2="2400" y2="' + k + '" stroke="#2b1710" stroke-width="130"/>'; }
  let dash = ''; for (let k = -2000; k <= 2000; k += 400) { dash += '<line x1="' + k + '" y1="-2400" x2="' + k + '" y2="2400" stroke="#6b4a36" stroke-width="5" stroke-dasharray="40 50"/><line x1="-2400" y1="' + k + '" x2="2400" y2="' + k + '" stroke="#6b4a36" stroke-width="5" stroke-dasharray="40 50"/>'; }
  const city = $('city');
  let html = '<div class="abs" style="left:-2400px;top:-2400px;width:4800px;height:4800px;background:#1b0d08"></div><svg class="abs" style="left:-2400px;top:-2400px" width="4800" height="4800" viewBox="-2400 -2400 4800 4800">' + roads + dash +
    '<path id="routeBase" d="' + d + '" fill="none" stroke="rgba(255,90,0,.22)" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path id="routeGlow" d="' + d + '" fill="none" stroke="#FF5A00" stroke-opacity=".35" stroke-width="64" stroke-linecap="round" stroke-linejoin="round"/>' +
    '<path id="routeLine" d="' + d + '" fill="none" stroke="#FF5A00" stroke-width="30" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const SAND = ['#d8b48c', '#c99b6c', '#e6c9a3', '#b98558', '#d0a67a', '#a8714a'];
  const wall = (w, h, tx, ty, rz, bg, extra) => '<div class="bf" style="left:0;top:' + (-h) + 'px;width:' + w + 'px;height:' + h + 'px;transform-origin:0 100%;transform:translate(' + tx + 'px,' + ty + 'px) rotateZ(' + rz + 'deg) rotateX(-90deg);background:' + bg + ';' + (extra || '') + '"></div>';
  let nb = 0;
  for (let i = -5; i < 5; i++) for (let j = -5; j < 5; j++) {
    const cx = i * 400 + 200, cy = j * 400 + 200;
    if (distToRoute(cx, cy) > 1000) continue;
    const n = 1 + (rg() > 0.55 ? 1 : 0);
    for (let q = 0; q < n; q++) {
      const w = 130 + rg() * 90, dd = 130 + rg() * 90, h = 100 + rg() * 360 * (1 - Math.min(0.6, distToRoute(cx, cy) / 1600));
      const x = cx - 130 + (q ? 80 : -30) + rg() * 30, y = cy - 130 + (q ? 80 : -30) + rg() * 30;
      const col = SAND[Math.floor(rg() * SAND.length)];
      const win = 'background-image:repeating-linear-gradient(0deg,rgba(255,214,150,.55) 0 7px,transparent 7px 26px),repeating-linear-gradient(90deg,transparent 0 16px,rgba(34,4,2,.28) 16px 26px)';
      html += '<div class="bld" style="left:' + x.toFixed(0) + 'px;top:' + y.toFixed(0) + 'px;width:' + w.toFixed(0) + 'px;height:' + dd.toFixed(0) + 'px">' +
        '<div class="bf" style="left:0;top:0;width:' + w.toFixed(0) + 'px;height:' + dd.toFixed(0) + 'px;background:' + col + ';transform:translateZ(' + h.toFixed(0) + 'px)"></div>' +
        wall(w, h, 0, dd, 0, col, win + ';filter:brightness(.82)') + wall(dd, h, w, dd, -90, col, win + ';filter:brightness(.55)') + wall(w, h, w, 0, 180, col, 'filter:brightness(.5)') + wall(dd, h, 0, 0, 90, col, 'filter:brightness(.7)') + '</div>'; nb++;
    }
  }
  // landmark silhouettes (domes + minarets) as crossed standing planes
  const MOSQUE = 'data:image/svg+xml;utf8,' + encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 600"><g fill="#3b1a0f"><rect x="60" y="300" width="280" height="300"/><path d="M110 300a90 90 0 01180 0z"/><rect x="195" y="170" width="10" height="40"/><rect x="20" y="130" width="36" height="470"/><path d="M20 130l18-70 18 70z"/><rect x="344" y="130" width="36" height="470"/><path d="M344 130l18-70 18 70z"/></g><g fill="#ffcf8a"><circle cx="38" cy="200" r="6"/><circle cx="362" cy="200" r="6"/><rect x="110" y="380" width="14" height="30" rx="7"/><rect x="190" y="380" width="14" height="30" rx="7"/><rect x="270" y="380" width="14" height="30" rx="7"/></g></svg>');
  [[-1650, 1300, 20], [-900, 1180, -15], [200, 380, 30], [1250, -400, -20], [2050, -1250, 10], [-100, -520, 0], [1150, -1250, 45], [-1700, 200, 70]].forEach(m => {
    const wd = 460, ht = 690; html += '<div class="bld" style="left:' + m[0] + 'px;top:' + m[1] + 'px;width:0;height:0;transform:rotateZ(' + m[2] + 'deg)">' +
      '<div class="bf" style="left:' + (-wd / 2) + 'px;top:' + (-ht) + 'px;width:' + wd + 'px;height:' + ht + 'px;transform-origin:50% 100%;transform:rotateX(-90deg);background:url(\'' + MOSQUE + '\') center/100% 100%;backface-visibility:visible"></div>' +
      '<div class="bf" style="left:' + (-wd / 2) + 'px;top:' + (-ht) + 'px;width:' + wd + 'px;height:' + ht + 'px;transform-origin:50% 100%;transform:rotateZ(90deg) rotateX(-90deg);background:url(\'' + MOSQUE + '\') center/100% 100%;backface-visibility:visible"></div></div>';
  });
  // head + beam + destination
  html += '<div id="dest" class="abs" style="left:' + (ROUTE[ROUTE.length - 1][0] - 110) + 'px;top:' + (ROUTE[ROUTE.length - 1][1] - 110) + 'px;width:220px;height:220px;border-radius:50%;border:12px solid #FF5A00;transform:translateZ(2px);box-shadow:0 0 80px #FF5A00"></div>' +
    '<div id="head" class="bld" style="left:0;top:0;width:0;height:0"><div class="abs" style="left:-46px;top:-46px;width:92px;height:92px;border-radius:50%;background:#FF5A00;box-shadow:0 0 0 14px rgba(255,90,0,.35),0 0 70px 30px rgba(255,90,0,.7);transform:translateZ(6px)"></div>' +
    '<div class="bf" style="left:-30px;top:-520px;width:60px;height:520px;transform-origin:50% 100%;transform:rotateX(-90deg);background:linear-gradient(to top,rgba(255,150,70,.95),rgba(255,90,0,0));backface-visibility:visible"></div>' +
    '<div class="bf" style="left:-30px;top:-520px;width:60px;height:520px;transform-origin:50% 100%;transform:rotateZ(90deg) rotateX(-90deg);background:linear-gradient(to top,rgba(255,150,70,.95),rgba(255,90,0,0));backface-visibility:visible"></div></div>';
  city.innerHTML = html;
  const routeLine = $('routeLine'), routeGlow = $('routeGlow'), LEN = routeLine.getTotalLength();
  const NS = 800, TAB = []; for (let i = 0; i <= NS; i++) { const p = routeLine.getPointAtLength(LEN * i / NS); TAB.push([p.x, p.y]); }
  const posAt = u => { const f = clamp(u, 0, 1) * NS, i = Math.min(NS - 1, Math.floor(f)), k = f - i; return [lerp(TAB[i][0], TAB[i + 1][0], k), lerp(TAB[i][1], TAB[i + 1][1], k)]; };
  const headAt = u => { const a = posAt(u - 0.012), b = posAt(u + 0.012); return Math.atan2(b[1] - a[1], b[0] - a[0]); };
  routeLine.style.strokeDasharray = LEN + ' ' + LEN; routeGlow.style.strokeDasharray = LEN + ' ' + LEN;
  $('streaks').innerHTML = Array.from({ length: 14 }, (_, i) => '<div id="sk' + i + '" class="abs" style="left:' + Math.round(rg() * 1900) + 'px;top:0;width:3px;height:' + (140 + Math.round(rg() * 200)) + 'px;background:linear-gradient(to bottom,transparent,rgba(255,236,210,.55),transparent)"></div>').join('');
  const P_ = t => { const k = seg(t, 41.6, 50.4); return 0.45 * k + 0.55 * ease.cubicInOut(k); };

  // ───────────────────────── scenes ─────────────────────────
  const cursor = $('cursor');
  function drawCursor(t, cam, knots, clicks, t0, t1) {
    if (!win(t, t0, t1)) { show(cursor, false); return false; }
    const c = OM.cursor(t, knots, clicks), p = pt(cam, c.x, c.y);
    const a = Math.min(sub(t, t0, t0 + 0.25), 1 - sub(t, t1 - 0.3, t1));
    show(cursor, true); cursor.style.opacity = a; cursor.style.transform = 'translate(' + p[0] + 'px,' + p[1] + 'px) scale(' + (c.s * 1.0) + ')'; return true;
  }
  const S1CAM = [{ t: 0, x: 960, y: 540, zoom: 1.1 }, { t: 2.0, x: 960, y: 540, zoom: 1.0, curve: ease.cubicOut }, { t: 3.0, x: 960, y: 540, zoom: 1.0 }, { t: 4.5, x: 834, y: 437, zoom: 20, curve: ease.quintInOut }];
  function s1(t) {
    const on = t < 5.05; show($('s1'), on); if (!on) return;
    const sh = OM.shake(t, C.impact1, { amp: 16 }), sh2 = OM.shake(t, C.emerge, { amp: 12, seed: 4 });
    const cm = OM.camera(t, S1CAM); cm.x += sh.x + sh2.x; cm.y += sh.y + sh2.y; cm.rot += sh.rot + sh2.rot;
    camMat($('s1w'), cm, 0);
    // pulse: heartbeat dot -> icon
    const hb = [0.3, 0.9, 1.5].reduce((a, b) => a + (t > b ? Math.exp(-(t - b) * 9) : 0), 0);
    const k = t < C.emerge ? 0 : spring(t - C.emerge, 0.6, 15);
    const size = t < C.emerge ? 10 + 16 * hb : lerp(26, 420, Math.min(1.12, k));
    const icon = $('icon'); icon.style.width = size + 'px'; icon.style.height = size + 'px';
    icon.style.borderRadius = lerp(50, 22.4, clamp(k * 1.4)) + '%'; put(icon, 960, 500 + (t < C.emerge ? 0 : (1 - clamp(k)) * 30), { o: t < C.blip ? 0 : 1 });
    icon.style.boxShadow = '0 40px 120px rgba(255,90,0,' + (0.45 * sub(t, 2, 2.6)) + '),0 0 ' + (40 + 120 * hb) + 'px rgba(255,90,0,.9)';
    [0.3, 0.9, 1.5].forEach((b, i) => { const q = ease.expoOut(seg(t, b, b + 1.4)); put($('r' + i), 960, 500, { s: q * 0.9 + 0.01, o: t < b ? 0 : (1 - q) * 0.7 }); });
    const gk = sub(t, 1.0, 2.6); put($('glow'), 960, 500, { s: 0.4 + 0.7 * ease.expoOut(gk) + 0.03 * Math.sin(t * 4), o: gk * 0.95 });
    $('floorp').style.opacity = sub(t, 1.0, 2.8) * 0.9; $('floor').style.backgroundPosition = '0 ' + (t * 90).toFixed(1) + 'px';
    // Arabic line, own depth layer so the dive flings it past
    const tw = $('s1tw'); camMat(tw, cm, -0.3);
    const words = $('s1t').children; let any = false;
    for (let i = 0; i < words.length; i++) { const w = OM.wordRise(t, 2.3 + i * 0.16, { dist: 60, omega: 18 }); const lo = OM.liftOut(t, 3.55 + i * 0.03, { dur: 0.35, dist: 0, blur: 14, grow: 0.25 }); words[i].style.opacity = w.op * lo.op; words[i].style.transform = 'translateY(' + (-w.y) + 'px) scale(' + w.s + ')'; words[i].style.filter = lo.blur > .2 ? 'blur(' + lo.blur + 'px)' : 'none'; }
    put($('s1t'), 960, 800, { o: 1 });
  }

  const MAIN = [
    { t: 5.0, x: 960, y: 540, zoom: 0.78 }, { t: 6.3, x: 960, y: 540, zoom: 1.0, curve: ease.cubicOut },
    { t: 7.1, x: 960, y: 330, zoom: 1.9, curve: ease.smoother }, { t: 9.0, x: 960, y: 330, zoom: 1.9 },
    { t: 9.9, x: 1010, y: 440, zoom: 1.6, curve: ease.smoother }, { t: 10.5, x: 1010, y: 440, zoom: 1.6 },
    { t: 11.4, x: 960, y: 540, zoom: 1.12, curve: ease.cubicInOut }, { t: 12.5, x: 960, y: 540, zoom: 1.0, rot: 0.0 },
    { t: 13.0, x: 960, y: 540, zoom: 1.0 },
    { t: 14.6, x: 930, y: 520, zoom: 1.1, rot: -0.07, curve: ease.cubicInOut }, { t: 16.5, x: 990, y: 560, zoom: 1.08, rot: 0.05, curve: ease.cubicInOut },
    { t: 17.0, x: 960, y: 540, zoom: 1.0, rot: 0.0, curve: ease.cubicInOut }, { t: 18.3, x: 940, y: 560, zoom: 1.12, rot: 0.08, curve: ease.cubicInOut },
    { t: 20.4, x: 980, y: 520, zoom: 1.06, rot: -0.06, curve: ease.cubicInOut }, { t: 22.0, x: 960, y: 540, zoom: 0.95, rot: 0, curve: ease.cubicInOut }
  ];
  const TILE0 = { x: 742 + 332, y: 82 + 276, w: 92, h: 112, r: 24 }, CARD = { x: 752, y: 300, w: 416, h: 420, r: 30 }, CIRC = { x: 550, y: 130, w: 820, h: 820, r: 410 };
  const CUR2 = [{ t: 6.2, x: 1560, y: 880 }, { t: 7.25, x: 985, y: 246 }, { t: 9.7, x: 985, y: 250 }, { t: 10.4, x: 1128, y: 436 }, { t: 11.3, x: 1330, y: 720 }, { t: 12.1, x: 1700, y: 960 }];
  const WHEEL_R = 1250, SPACING = 1.15;
  let cam1 = null;
  function s2(t) {
    const on = t >= 4.9 && t < 13.75; show($('s2'), on);
    const cam = OM.camera(t, MAIN); const sh = OM.shake(t, 5.0, { amp: 8 }); cam.x += sh.x; cam.y += sh.y; cam1 = cam;
    if (on) {
      camMat($('s2w'), cam, 0);
      const rk = spring(t - 5.0, 0.55, 13); raySet(rays2, t * 2.5, 0.5 + 0.5 * Math.min(1.1, rk), clamp(rk * 2) * (1 - sub(t, 12.2, 13.0)));
      const k = spring(t - 5.2, 0.58, 15), ph = $('phoneP');
      put(ph, 960, 540 + (1 - Math.min(k, 1.2)) * 520, { s: 0.72 + 0.28 * k, o: clamp(k * 3) * (1 - sub(t, 12.2, 13.2)) });
      $('phone').style.transform = 'rotateY(' + ((1 - k) * -26) + 'deg) rotateX(' + ((1 - k) * 16) + 'deg)';
      // search
      const tp = OM.typeOn(t, 7.5, 'بيتزا', { cps: 5 }); $('tx').textContent = tp.str; $('ph').style.opacity = t > 7.5 ? 0 : 1;
      const foc = sub(t, 7.45, 7.6) * (1 - sub(t, 8.9, 9.1)); $('sbar').style.borderColor = 'rgba(255,90,0,' + foc + ')';
      const pr = OM.press(t, 7.5, { depth: 0.04 }); $('sbar').style.transform = 'scale(' + pr.s + ')';
      // tiles bounce in turn, then the chosen one leaves the grid
      for (let i = 0; i < 5; i++) {
        const im = OM.impact(t, 9.0 + i * 0.12, { decay: 7, omega: 24, sqx: 0.2, sqy: 0.2 }); const dim = i === 0 ? 0 : 0.7 * spring(t - 10.5, 0.8, 16);
        const el = $('tile' + i); el.style.transform = 'scale(' + (1 + (t > 9 + i * 0.12 ? (im.r > 0 ? 0.0 : 0) : 0) + 0.0) + ') translateY(' + (-Math.max(0, im.r) * 20 * (t < 10.5 ? 1 : 0)) + 'px)'; el.style.opacity = (i === 0 && t >= 10.5) ? 0 : 1 - dim;
      }
      $('ban').style.opacity = 1 - 0.8 * sub(t, 10.5, 11.2);
    }
    // the card -> plate: one shape that never cuts (lives above S2 and S3)
    const plOn = win(t, 10.5, 22.1); show($('pl'), plOn);
    if (plOn) drawPlates(t, cam);
    // cursor
    drawCursor(t, cam, CUR2, C.clicks.slice(0, 2), 6.2, 12.1);
  }

  function drawPlates(t, cam) {
    const p0 = $('p0'), p1 = $('p1'), img0 = p0.firstElementChild, img1 = p1.firstElementChild;
    camMat($('plw'), cam, 0);
    let x, y, w, h, r, rot = 0, sc = 1;
    if (t < 11.4) { const m = OM.morphRect(t, 10.5, 11.4, TILE0, CARD, { curve: ease.expoOut }); ({ x, y, w, h, r } = m); }
    else if (t < 12.2) { x = CARD.x; y = CARD.y; w = CARD.w; h = CARD.h; r = CARD.r; }
    else { const m = OM.morphRect(t, 12.2, 13.1, CARD, CIRC, { curve: ease.expoInOut }); ({ x, y, w, h, r } = m); }
    const wk = t < 16.9 ? 0 : spring(t - 16.95, 0.8, 12), wr = -SPACING * wk;
    const a0 = wr, a1 = SPACING + wr;
    let cx = x + w / 2, cy = y + h / 2;
    if (t >= 13.1) { cx = 960 + WHEEL_R * Math.sin(a0); cy = 540 + WHEEL_R - WHEEL_R * Math.cos(a0); rot = a0; sc = 1 - 0.12 * Math.abs(a0); }
    box(p0, -w / 2, -h / 2, w, h, r);
    p0.style.transform = 'translate(' + cx + 'px,' + cy + 'px) rotate(' + rot + 'rad) scale(' + sc + ')';
    // pizza macro: spin + dive onto the pepperoni, then ease out
    const mk = ease.cubicInOut(sub(t, 14.3, 15.6)) * (1 - ease.cubicInOut(sub(t, 15.9, 16.8)));
    const s0 = 1 + 1.3 * mk, spin = t < 13.1 ? 0 : (t - 13.1) * 0.28;
    const q = [0.28, 0.46], size = Math.max(w, 1);
    img0.style.transform = 'rotate(' + spin + 'rad) translate(' + (-(q[0] - 0.5) * size * s0 * mk) + 'px,' + (-(q[1] - 0.5) * h * s0 * mk) + 'px) scale(' + s0 + ')';
    $('p0l').style.opacity = t < 12.2 ? 1 - sub(t, 12.0, 12.4) : 0; $('p0l').style.display = t < 12.6 ? 'block' : 'none';
    p0.style.opacity = t < 10.5 ? 0 : 1;
    // bowl on the same wheel
    const bx = 960 + WHEEL_R * Math.sin(a1), by = 540 + WHEEL_R - WHEEL_R * Math.cos(a1);
    box(p1, -410, -410, 820, 820, 410); p1.style.transform = 'translate(' + bx + 'px,' + by + 'px) rotate(' + a1 + 'rad) scale(' + (1 - 0.12 * Math.abs(a1)) + ')'; p1.style.display = t >= 13.1 ? 'block' : 'none';
    const mk1 = ease.cubicInOut(sub(t, 18.2, 19.3)) * (1 - ease.cubicInOut(sub(t, 19.8, 20.8))), s1_ = 1 + 1.25 * mk1, q1 = [0.42, 0.33];
    img1.style.transform = 'rotate(' + (-(t - 17) * 0.22) + 'rad) translate(' + (-(q1[0] - 0.5) * 820 * s1_ * mk1) + 'px,' + (-(q1[1] - 0.5) * 820 * s1_ * mk1) + 'px) scale(' + s1_ + ')';
    // orange frequency orbiting the plate
    const ro = sub(t, 13.0, 13.6) * (1 - sub(t, 21.0, 21.6)), L = TAU * 468;
    or1.setAttribute('stroke-dasharray', (L * 0.34) + ' ' + (L * 0.66)); or1.setAttribute('stroke-dashoffset', (-t * 520).toFixed(1)); or1.setAttribute('opacity', ro);
    const L2 = TAU * 500; or2.setAttribute('stroke-dasharray', (L2 * 0.12) + ' ' + (L2 * 0.88)); or2.setAttribute('stroke-dashoffset', (t * 380).toFixed(1)); or2.setAttribute('opacity', ro * 0.7);
    // steam
    for (let i = 0; i < 7; i++) {
      const f = ((t * 0.32 + i * 0.151) % 1), vis = (win(t, 13.6, 16.9) || win(t, 17.5, 20.8)) ? 1 : 0;
      const el = $('st' + i), base = i % 2 ? 760 : 700; const sz = 120 + (i % 3) * 40;
      el.style.width = sz + 'px'; el.style.height = sz * 1.5 + 'px';
      el.style.transform = 'translate(' + (960 - 240 + i * 80 + Math.sin(t * 1.3 + i) * 26) + 'px,' + (base - f * 520) + 'px)';
      el.style.opacity = vis * 0.2 * Math.sin(Math.PI * f) * (1 - sub(t, 20.4, 21)); }
    // S3 ground + typography
    const gOn = win(t, 12.6, 22.1); show($('s3'), gOn); show($('ktw'), gOn);
    if (gOn) {
      irisClip($('s3'), t, 12.6, 13.7, 960, 540, ease.expoInOut); camMat($('s3w'), cam, 0.5);
      $('bw1').style.transform = 'translateX(' + (-300 - (t - 13) * 80) + 'px)'; $('bw2').style.transform = 'translateX(' + (-1100 + (t - 13) * 80) + 'px)';
      $('s3w').style.opacity = 1;
      const ktw = $('ktw'); show(ktw, true); camMat(ktw, cam, 0.6);
      [['kt1', 13.7, 16.5], ['kt2', 17.5, 20.7]].forEach(k => { const spans = $(k[0]).querySelectorAll('span,em'); spans.forEach((s, i) => { const w = OM.wordRise(t, k[1] + i * 0.19, { dist: 50, omega: 18 }), lo = OM.liftOut(t, k[2] + i * 0.04, { dur: 0.3, dist: -40, blur: 10 }); s.style.opacity = w.op * lo.op; s.style.transform = 'translateY(' + (-w.y + lo.dy) + 'px) scale(' + w.s + ')'; s.style.filter = lo.blur > .2 ? 'blur(' + lo.blur + 'px)' : 'none'; }); });
    }
    
  }

  // ───────── S4 THE ORDER ─────────
  const S4CAM = [
    { t: 21.9, x: 960, y: 540, zoom: 0.82, rot: 0.07 }, { t: 22.8, x: 960, y: 620, zoom: 1.2, rot: 0, curve: ease.expoOut },
    { t: 25.4, x: 960, y: 700, zoom: 1.25, curve: ease.smoother }, { t: 26.4, x: 960, y: 700, zoom: 1.2, curve: ease.smoother },
    { t: 27.3, x: 960, y: 840, zoom: 1.95, curve: ease.cubicInOut }, { t: 28.2, x: 960, y: 600, zoom: 0.95, rot: 0.0, curve: ease.expoInOut },
    { t: 30.0, x: 960, y: 540, zoom: 0.9, rot: -0.05, curve: ease.cubicInOut }, { t: 31.0, x: 960, y: 540, zoom: 1.0, rot: 0.0, curve: ease.cubicInOut }
  ];
  const CUR4 = [{ t: 22.5, x: 1500, y: 900 }, { t: 23.4, x: 797, y: 548 }, { t: 24.4, x: 797, y: 686 }, { t: 25.4, x: 985, y: 951 }, { t: 26.9, x: 1120, y: 760 }, { t: 27.4, x: 985, y: 944 }, { t: 28.3, x: 1400, y: 300 }];
  const CPOP = [28.3, 28.7, 29.1, 29.45, 29.75, 30.0, 30.25, 30.5, 30.65, 30.8];
  function s4(t) {
    const on = t >= 21.4 && t < 31.5; show($('s4'), on); if (!on) return;
    irisClip($('s4'), t, 21.4, 22.05, 960, 540, ease.expoInOut);
    const cam = OM.camera(t, S4CAM); const sh = OM.shake(t, 27.5, { amp: 10 }); cam.x += sh.x; cam.y += sh.y; camMat($('s4w'), cam, 0);
    const rk = spring(t - 22.0, 0.6, 12); raySet(rays4, -t * 3, 0.6 + 0.4 * Math.min(rk, 1.1) + 0.12 * Math.max(0, OM.ring(t - 27.5, 6, 20)), 1 - sub(t, 28.0, 28.6));
    const ph = $('phone2P'), pin = spring(t - 22.1, 0.7, 13);
    const out = sub(t, 27.7, 28.5); put(ph, 960, 540 + (1 - Math.min(pin, 1.1)) * 380 + 900 * ease.expoIn(out), { s: 0.8 + 0.2 * pin, o: clamp(pin * 3) * (1 - out) });
    $('phone2').style.transform = 'rotateY(' + ((1 - pin) * 18) + 'deg) rotateX(' + ((1 - pin) * 10) + 'deg)';
    // + presses and flying thumbs
    [[23.5, 'pl0', 'fly0', { x: 1104, y: 512 }], [24.5, 'pl1', 'fly1', { x: 1104, y: 650 }]].forEach((a, i) => {
      const pr = OM.press(t, a[0], { depth: 0.22 }); $(a[1]).style.transform = 'scale(' + pr.s + ')'; $(a[1]).style.background = pr.active ? '#FF5A00' : '#fff'; $(a[1]).style.color = pr.active ? '#fff' : '#FF5A00';
      const f = $(a[2]), hp = OM.hop(t, a[0] + 0.05, a[0] + 0.6, a[3], { x: 960, y: 944 }, { height: 170, curve: ease.cubicInOut });
      const vis = win(t, a[0] + 0.05, a[0] + 0.62) && t < 27.6; show(f, vis);
      if (vis) { f.style.transform = 'translate(' + (hp.x - 32) + 'px,' + (hp.y - 32) + 'px) scale(' + lerp(1.4, 0.45, hp.k) + ') rotate(' + (hp.k * 0.5) + 'rad)'; }
    });
    const bb = OM.popIn(t, 24.05, { rise: 60, omega: 16 }), bi = OM.impact(t, 25.05, { decay: 8, omega: 24, sqx: 0.06, sqy: 0.12 }), bi1 = OM.impact(t, 24.15, { decay: 8, omega: 24, sqx: 0.06, sqy: 0.12 });
    const bsheet = sub(t, 25.5, 26.4);
    const bbar = $('bbar'); bbar.style.opacity = bb.op * (1 - clamp(bsheet * 3)); bbar.style.transform = 'translateY(' + bb.dy + 'px) scale(' + (bi.sx * bi1.sx) + ',' + (bi.sy * bi1.sy) + ')'; $('bcnt').textContent = t >= 25.05 ? '2' : '1';
    const pr = OM.press(t, 25.5, { depth: 0.07 });
    // sheet morphs up out of the basket bar
    const sk = ease.expoOut(bsheet), sheet = $('sheet'); sheet.style.opacity = bsheet > 0 ? 1 : 0; sheet.style.transform = 'translateY(' + ((1 - sk) * 600) + 'px) scale(' + lerp(0.92, 1, sk) + ')';
    const rows = sheet.children; for (let i = 1; i < rows.length - 1; i++) { const p = OM.popIn(t, 26.0 + i * 0.12, { rise: 30, omega: 17 }); rows[i].style.opacity = p.op; rows[i].style.transform = 'translateY(' + p.dy + 'px)'; }
    const cf = OM.press(t, 27.5, { depth: 0.1 }), cfe = $('conf'); cfe.style.transform = 'scale(' + cf.s + ')'; cfe.style.background = cf.active ? '#220402' : '#FF5A00'; cfe.style.opacity = rows.length && bsheet > 0 ? Math.max(OM.popIn(t, 26.5, { rise: 20 }).op, 0) : 0;
    // confirm -> status circle: the button becomes an orb that pulses out
    const ok = $('okc'), mk = ease.expoOut(sub(t, 27.65, 28.35)), vis = t >= 27.65 && t < 31.1; show(ok, vis);
    if (vis) {
      const shrink = 1 - ease.expoIn(sub(t, 30.6, 31.0));
      put(ok, 960, lerp(944, 540, mk), { s: lerp(0.33, 1, mk) * shrink * (1 + 0.1 * Math.max(0, OM.ring(t - 28.35, 7, 24))) });
      $('okp').setAttribute('stroke-dashoffset', 170 * (1 - sub(t, 28.3, 28.75)));
    }
    // ten macro chips burst from the orb on the beat, then converge
    for (let i = 0; i < 10; i++) {
      const el = $('cp' + i), a = i / 10 * TAU + 0.3, rad = 400 + (i % 3) * 90, tx = 960 + Math.cos(a) * rad * 1.2, ty = 540 + Math.sin(a) * rad * 0.75;
      const k = t < CPOP[i] ? 0 : spring(t - CPOP[i], 0.58, 15), cv = ease.expoIn(sub(t, 30.45 + i * 0.015, 30.95));
      const x = lerp(960, tx, Math.min(k, 1.15)), y = lerp(540, ty, Math.min(k, 1.15)), px = lerp(x, 960, cv), py = lerp(y, 540, cv);
      const sc = (0.2 + 0.8 * clamp(k)) * (1 - cv * 0.85) * (0.8 + 0.25 * (i % 3) / 2); el.style.opacity = k > 0 ? 1 - cv * 0.2 : 0;
      el.style.transform = 'translate(' + (px - 75) + 'px,' + (py - 75) + 'px) rotate(' + ((1 - Math.min(k, 1)) * 1.4 + (i % 2 ? 0.1 : -0.1) + cv * 2) + 'rad) scale(' + sc + ')'; }
    // iris into the worlds
        drawCursor(t, cam, CUR4, C.clicks.slice(2), 22.5, 28.3);
  }

  // ───────── S5 WORLDS ─────────
  const ARR = [32.0, 34.5, 36.9, 38.9], CS = [[960, 540], [3260, 540], [3260, 1840], [960, 1840]];
  const S5CAM = [
    { t: 31.0, x: 2110, y: 1190, zoom: 0.36 }, { t: 32.0, x: 960, y: 540, zoom: 1.0, curve: ease.expoInOut },
    { t: 33.9, x: 960, y: 540, zoom: 1.05, curve: ease.smoother },
    { t: 34.15, x: 2110, y: 540, zoom: 0.62, rot: 0.06, curve: ease.expoIn }, { t: 34.5, x: 3260, y: 540, zoom: 1.0, rot: 0.0, curve: ease.expoOut },
    { t: 36.4, x: 3260, y: 540, zoom: 1.05, curve: ease.smoother },
    { t: 36.65, x: 3260, y: 1190, zoom: 0.62, rot: -0.06, curve: ease.expoIn }, { t: 36.9, x: 3260, y: 1840, zoom: 1.0, rot: 0.0, curve: ease.expoOut },
    { t: 38.4, x: 3260, y: 1840, zoom: 1.05, curve: ease.smoother },
    { t: 38.65, x: 2110, y: 1840, zoom: 0.62, rot: 0.06, curve: ease.expoIn }, { t: 38.9, x: 960, y: 1840, zoom: 1.0, rot: 0.0, curve: ease.expoOut },
    { t: 40.2, x: 960, y: 1840, zoom: 1.04, curve: ease.smoother }, { t: 41.1, x: 960, y: 1840, zoom: 0.05, rot: 0.3, curve: ease.expoIn }
  ];
  function s5(t) {
    const on = t >= 30.7 && t < 41.4; show($('s5'), on); if (!on) return;
    irisClip($('s5'), t, 30.75, 31.4, 960, 540, ease.expoInOut);
    const cam = OM.camera(t, S5CAM); camMat($('s5w'), cam, 0);
    for (let i = 0; i < 4; i++) {
      const k = Math.min(1.1, spring(t - 31.0 - i * 0.07, 0.8, 11)), el = $('wd' + i);
      const ox = (2110 - (WPOS[i][0] + 960)) * (1 - k), oy = (1190 - (WPOS[i][1] + 540)) * (1 - k);
      el.style.transform = 'translate(' + ox + 'px,' + oy + 'px) scale(' + lerp(0.05, 1, k) + ') rotate(' + ((1 - k) * 0.8) + 'rad)';
      const a = ARR[i];
      const pT = OM.popIn(t, a - 0.05, { rise: 70, omega: 15 }), pS = OM.popIn(t, a + 0.18, { rise: 50, omega: 15 }), pP = spring(t - (a - 0.1), 0.62, 13);
      const T = $('w' + i + 't'), S = $('w' + i + 's'), Ph = $('w' + i + 'p');
      T.style.opacity = i === 0 && t < 32.2 ? 0 : pT.op; T.style.transform = 'translateY(' + (-pT.dy * -1) + 'px) scale(' + pT.s + ')'; T.style.transformOrigin = '100% 50%';
      S.style.opacity = pS.op; S.style.transform = 'translateY(' + pS.dy + 'px)';
      const rotBase = [-5, 4, -3, 3][i]; Ph.style.opacity = clamp(pP * 3); Ph.style.transform = 'translateY(' + ((1 - Math.min(pP, 1.1)) * 600) + 'px) rotate(' + (rotBase + (1 - pP) * 12) + 'deg)';
    }
  }

  // ───────── S6 JOURNEY ─────────
  let yawS = 0;
  function s6(t) {
    const on = t >= 40.5 && t < 51.4; show($('s6'), on); if (!on) { show($('s6cov'), false); return; }
    irisClip($('s6'), t, 40.55, 41.2, 960, 540, ease.expoOut);
    const u = P_(t), uCam = P_(t - 0.42), hp = posAt(u), cp = posAt(uCam);
    const hd = headAt(P_(t - 0.7)), yaw = -Math.PI / 2 - hd; // lagging heading
    const spd = (P_(t + 0.05) - P_(t - 0.05)) / 0.1 * LEN / 700;
    const tilt = 60 - 6 * clamp(spd) + 3 * Math.sin(t * 0.9), dz = 40 + 180 * clamp(spd) + 260 * sub(t, 49.8, 50.6);
    $('plane').style.transform = 'translateZ(' + dz.toFixed(1) + 'px) rotateX(' + tilt.toFixed(2) + 'deg) rotateZ(' + yaw.toFixed(4) + 'rad) translate(' + (-cp[0]).toFixed(1) + 'px,' + (-cp[1]).toFixed(1) + 'px)';
    $('head').style.transform = 'translate(' + hp[0].toFixed(1) + 'px,' + hp[1].toFixed(1) + 'px)';
    routeLine.style.strokeDashoffset = LEN * (1 - u); routeGlow.style.strokeDashoffset = LEN * (1 - u);
    const dp = 1 + 0.15 * Math.sin(t * 5); $('dest').style.transform = 'translateZ(2px) scale(' + dp + ')'; $('dest').style.opacity = sub(t, 41, 42);
    // status card
    const trk = $('trk'), tin = OM.popIn(t, 41.6, { rise: -40, omega: 14 }); trk.style.opacity = tin.op * (1 - sub(t, 50.4, 50.9)); trk.style.transform = 'translateY(' + (-tin.dy * 0.8) + 'px) scale(' + tin.s + ')';
    let cnt = -1; for (let i = 0; i < 4; i++) { const tk = OM.tick(t, C.ticks[i]), d = $('stp' + i).firstElementChild; d.style.background = tk.on ? '#FF5A00' : '#ddd2c6'; d.style.transform = 'scale(' + (tk.on ? tk.s : 1) + ')'; if (tk.on) cnt = i; }
    $('trkfill').style.width = (cnt < 0 ? 0 : (cnt / 3) * 408 * ease.expoOut(sub(t, C.ticks[Math.max(cnt, 0)], C.ticks[Math.max(cnt, 0)] + 0.6)) + (cnt > 0 ? ((cnt - 1) / 3) * 408 * (1 - ease.expoOut(sub(t, C.ticks[cnt], C.ticks[cnt] + 0.6))) : 0)) + 'px';
    for (let i = 0; i < 14; i++) { const el = $('sk' + i), f = ((t * (0.9 + 0.2 * (i % 3)) + i * 0.137) % 1); el.style.opacity = clamp(spd) * 0.7; el.style.transform = 'translateY(' + (-300 + f * 1500) + 'px)'; }
    // dive into the head: the pulse swallows the screen
    const cv = $('s6cov'), dk = ease.expoIn(sub(t, 50.35, 51.0)); show(cv, t >= 50.35);
    if (t >= 50.35) put(cv, 960, 640, { s: 0.01 + dk * 16, o: 1 });
  }

  // ───────── S7 ARRIVAL ─────────
  const S7CAM = [{ t: 51.0, x: 960, y: 540, zoom: 1.0 }, { t: 55.6, x: 960, y: 520, zoom: 1.0, curve: ease.smoother }, { t: 57.0, x: 960, y: 520, zoom: 1.07, curve: ease.cubicInOut }];
  function s7(t) {
    const on = t >= 50.9 && t < 57.4; show($('s7'), on); if (!on) return;
    const cam = OM.camera(t, S7CAM), sh = OM.shake(t, C.boxOpen, { amp: 7 }); cam.x += sh.x; cam.y += sh.y; camMat($('s7w'), cam, 0);
    const body = $('pkBody'), lid = $('pkLid'), hero = $('hero');
    const mk = OM.morphRect(t, 51.0, 52.0, { x: 0, y: 0, w: W, h: H, r: 0 }, { x: 750, y: 520, w: 420, h: 300, r: 26 }, { curve: ease.expoInOut });
    const drop = Math.pow(sub(t, 53.6, 54.7), 3), imp = OM.impact(t, 52.02, { decay: 8, omega: 24, sqx: 0.05, sqy: 0.08 });
    box(body, mk.x, mk.y, mk.w, mk.h, mk.r); body.style.transform = 'translateY(' + (drop * 760) + 'px) scale(' + imp.sx + ',' + imp.sy + ')'; body.style.transformOrigin = '50% 100%';
    body.firstElementChild.style.opacity = sub(t, 51.8, 52.1);
    const lo = spring(t - C.boxOpen, 0.58, 14), ls = t < C.boxOpen ? 1 : 1 - 2.05 * Math.min(lo, 1.1);
    box(lid, 738, 420, 444, 102, 18); lid.style.transformOrigin = '50% 0'; lid.style.transform = 'translateY(' + (drop * 760) + 'px) scaleY(' + ls + ')'; lid.style.background = ls < 0 ? '#a63500' : '#FF6A14'; lid.style.opacity = sub(t, 51.85, 52.1);
    // beam of warm light as the box opens
    const bm = ease.expoOut(sub(t, C.boxOpen, C.boxOpen + 0.5)) * (1 - 0.5 * sub(t, 54.5, 56)); $('beam').style.opacity = bm; $('beam').style.transform = 'translateY(' + (-sub(t, 53.8, 55) * 40) + 'px) scaleY(' + (0.5 + 0.7 * bm) + ')';
    // the plate rises out of the box
    const rise = spring(t - C.boxOpen - 0.1, 0.7, 11), grow = ease.expoInOut(sub(t, 53.3, 54.6));
    const D = lerp(260, 540, Math.min(rise, 1.05)) + 300 * grow, cy = lerp(640, 440, Math.min(rise, 1.05)) + 60 * grow, cx = 960 + (t > 55.6 ? 0 : 0);
    const push = 1 + 0.05 * sub(t, 54.6, 57.0);
    box(hero, cx - D / 2, cy - D / 2, D, D, D / 2); hero.style.opacity = t < C.boxOpen + 0.05 ? 0 : 1; hero.style.transform = 'scale(' + push + ')';
    hero.firstElementChild.style.transform = 'scale(1.18) rotate(' + ((t - 52.6) * 0.1) + 'rad)'; hero.style.boxShadow = '0 0 ' + (60 + 160 * bm) + 'px rgba(255,140,60,' + (0.35 * bm) + '),0 80px 140px rgba(0,0,0,.6)';
    for (let i = 0; i < 6; i++) { const f = ((t * 0.3 + i * 0.17) % 1), el = $('sx' + i), sz = 110 + (i % 3) * 40; el.style.width = sz + 'px'; el.style.height = sz * 1.4 + 'px'; el.style.transform = 'translate(' + (cx - 200 + i * 70 + Math.sin(t * 1.2 + i * 2) * 20) + 'px,' + (cy - D * 0.2 - f * 460) + 'px)'; el.style.opacity = (t > 53.2 ? 1 : 0) * 0.18 * Math.sin(Math.PI * f) * (1 - sub(t, 56.2, 56.8)); }
    // Arabic: she arrived
    const ar = $('arr'), aw = OM.wordRise(t, 54.1, { dist: 70, omega: 16 }), lo2 = sub(t, 56.3, 56.8); ar.style.opacity = aw.op * (1 - lo2); ar.style.left = '1420px'; ar.style.top = '430px'; ar.style.transform = 'translateY(' + (-aw.y) + 'px) scale(' + aw.s + ')';
    // converging pulses before the final hit
    $('s7w').style.filter = 'none';
  }

  // ───────── S8 FINAL ─────────
  const S8CAM = [{ t: 56.9, x: 960, y: 540, zoom: 1.0 }, { t: 57.9, x: 960, y: 540, zoom: 1.0, curve: ease.cubicOut }, { t: 60, x: 960, y: 545, zoom: 1.045, curve: ease.smoother }];
  function s8(t) {
    const on = t >= 56.3; show($('s8'), on); if (!on) { show($('conv'), false); return; }
    const cam = OM.camera(t, S8CAM), sh = OM.shake(t, C.final, { amp: 18, decay: 7 }); cam.x += sh.x; cam.y += sh.y; cam.rot += sh.rot; camMat($('s8w'), cam, 0);
    // converge rings (screen-space, from S7 into the hit)
    const cvg = $('conv'); show(cvg, t >= 56.2 && t < 57.05);
    if (cvg.children.length === 0) cvg.innerHTML = Array.from({ length: 6 }, (_, i) => '<div class="c" id="cv' + i + '" style="width:2000px;height:2000px;border-radius:50%;border:' + (6 + (i % 3) * 4) + 'px solid #FF5A00"></div>').join('');
    for (let i = 0; i < 6; i++) { const k = ease.expoIn(sub(t, 56.2 + i * 0.1, 57.0)); put($('cv' + i), 960, 540, { s: lerp(1, 0.0, k), o: t < 56.2 + i * 0.1 ? 0 : 0.9 * (1 - 0.3 * k) }); }
    // flash cover shrinks into the icon
    const cov = $('s8cover'), a = ease.expoOut(sub(t, 57.0, 57.2)), m = OM.morphRect(t, 57.25, 57.95, { x: 0, y: 0, w: W, h: H, r: 0 }, { x: 810, y: 130, w: 300, h: 300, r: 67 }, { curve: ease.expoInOut });
    if (t < 57.0) { cov.style.opacity = 0; } else { cov.style.opacity = 1; if (t < 57.25) box(cov, 0, 0, W, H, 0); else box(cov, m.x, m.y, m.w, m.h, m.r); }
    cov.style.clipPath = t < 57.25 ? 'circle(' + (Math.hypot(960, 540) * a) + 'px at 960px 540px)' : 'none';
    const ic = $('s8icon'), imp = OM.impact(t, 57.95, { decay: 7, omega: 22, sqx: 0.08, sqy: 0.1 });
    box(ic, 810, 130, 300, 300, 67); ic.style.opacity = t >= 57.7 ? 1 : 0; ic.style.transformOrigin = '50% 100%'; ic.style.transform = 'scale(' + imp.sx + ',' + imp.sy + ')'; ic.style.boxShadow = '0 30px 80px rgba(255,90,0,.35)';
    const wm = $('s8wm'), wk = OM.popIn(t, 58.15, { rise: 40, omega: 15 }); wm.style.left = '770px'; wm.style.top = '470px'; wm.style.opacity = wk.op; wm.style.transform = 'translateY(' + wk.dy + 'px) scale(' + wk.s + ')';
    const ft = $('s8t'); ft.style.left = '0'; ft.style.width = '1920px'; ft.style.textAlign = 'center'; ft.style.top = '690px';
    ft.querySelectorAll('span').forEach((s, i) => { const w = OM.wordRise(t, 58.55 + i * 0.17, { dist: 60, omega: 17 }); s.style.opacity = w.op; s.style.transform = 'translateY(' + (-w.y) + 'px) scale(' + w.s + ')'; });
    $('s8u').style.display = 'none';
  }

  // ───────── master ─────────
  function draw(t) {
    t = Math.max(0, Math.min(59.999, t || 0));
    s1(t); s2(t); s4(t); s5(t); s6(t); s7(t); s8(t);
    // the orange edge of whichever iris is opening — owned here so it is a pure function of t
    const far = Math.hypot(960, 540) + 6; let rr = 0;
    [[21.4, 22.05, ease.expoInOut], [30.75, 31.4, ease.expoInOut], [40.55, 41.2, ease.expoOut]].forEach(w => { if (t >= w[0] && t < w[1] + 0.04) rr = far * w[2](seg(t, w[0], w[1])); });
    ringAt(960, 540, rr + 6, rr > 4 && rr < far - 20);
    // z-order is DOM order; cursor above all
    const f = Math.floor(t * 30); $('grain').style.transform = 'translate(' + ((f * 37) % 40) + 'px,' + ((f * 23) % 40) + 'px)';
    $('vig').style.opacity = t > 56.9 ? 0.25 : 1;
  }
  // add the converge layer once (rings contracting into the final hit)
  (function () { const d = document.createElement('div'); d.id = 'conv'; d.className = 'abs'; d.style.cssText = 'left:0;top:0;width:1920px;height:1080px;display:none;z-index:2'; document.getElementById('s7').appendChild(d); })();
  // S6 cover lives in s6
  (function () { const d = document.createElement('div'); d.id = 's6cov'; d.className = 'c'; d.style.cssText = 'width:200px;height:200px;border-radius:50%;background:#FF5A00;display:none'; document.getElementById('s6').appendChild(d); })();

  // ───────── HyperFrames adapter ─────────
  window.__timelines = window.__timelines || {};
  const tl = gsap.timeline({ paused: true });
  tl.to({ p: 0 }, { p: 1, duration: 60, ease: 'none', onUpdate: function () { draw(tl.time()); } }, 0);
  window.__timelines['talabat-orange-frequency'] = tl;
  window.addEventListener('hf-seek', e => { const tt = e && e.detail && typeof e.detail.time === 'number' ? e.detail.time : tl.time(); draw(tt); });
  window.__draw = draw;
  draw(0);
})();
if (location.hash.indexOf('#dbg') === 0) { try { window.__draw(parseFloat(location.hash.slice(4))); var q=document.getElementById('wd0'),r=q.getBoundingClientRect(),s5=document.getElementById('s5'); document.title = 'OK ' + JSON.stringify([s5.style.display,s5.style.clipPath,document.getElementById('s5w').style.transform,q.style.transform,r.x,r.y,r.width,r.height,getComputedStyle(q).display,q.children.length]); } catch (e) { document.title = 'ERR ' + e.message + ' @ ' + (e.stack || '').split('\n')[1]; } }
