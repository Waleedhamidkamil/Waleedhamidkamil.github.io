/* The Business Hub tour on phones and small windows. It stays pinned for three screens of scrolling and runs in one upright window:
   the camera goes to the part of the screen each caption talks about, a sketched bracket marks it, the real icons play, and each new screen rises into the window.
   Everything is scrubbed by the scroll, except the recordings, whose camera follows their time. main.js drives this. */
window.__phoneTour = (() => {
  const P = window.PhoneCam, root = document.getElementById('pTour');
  if (!P || !root) return null;
  const { R, fit, mix, css, keyState, bracket, onScreen, soft, span, clamp, addIcons, playIcons, wakeArt, makeWindow, addLayer, themeSwitch, el } = P;
  const ICON = {
    dash: '<rect x="4" y="4" width="7" height="7" rx="1.5"/><rect x="13" y="4" width="7" height="7" rx="1.5"/><rect x="4" y="13" width="7" height="7" rx="1.5"/><rect x="13" y="13" width="7" height="7" rx="1.5"/>',
    link: '<path d="M10 14a4 4 0 0 0 6 .4l3-3a4 4 0 0 0-5.7-5.7l-1.2 1.2"/><path d="M14 10a4 4 0 0 0-6-.4l-3 3a4 4 0 0 0 5.7 5.7l1.2-1.2"/>',
    master: '<ellipse cx="12" cy="6" rx="7.5" ry="3"/><path d="M4.5 6v12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6"/><path d="M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3"/>',
    control: '<path d="M5 21v-7M5 10V3M12 21v-9M12 8V3M19 21v-5M19 12V3M2 14h6M9 8h6M16 16h6"/>',
  };
  const CH = [
    { name: 'Dashboard', hue: 'var(--dash)', icon: ICON.dash, stop: 0 },
    { name: 'Linked documents', hue: 'var(--link)', icon: ICON.link, stop: 4 },
    { name: 'Master Data', hue: 'var(--master)', icon: ICON.master, stop: 5 },
    { name: 'Control Room', hue: 'var(--control)', icon: ICON.control, stop: 6 },
  ];
  const CONTROL = 'Each person works in a separate session with their own permissions. The server logs activity, refuses what a role may not do, and keeps permanent deletion behind its own permission.';
  const STOPS = [
    { ch: 0, screen: 'dash', rect: R(0, 0, 800, 1000), text: 'The order-to-invoice system I designed and built for my office. It links every quotation, purchase order, delivery note and invoice, and runs for the whole team on one server.' },
    { ch: 0, screen: 'dash', rect: R(32, 482, 500, 420), side: 'bottom', title: 'Dashboard', text: "One screen for the day's work: bids to decide, costs to enter, documents to submit, deliveries to invoice and payments to collect." },
    { ch: 0, screen: 'dash', rect: R(32, 338, 770, 136), to: R(800, 338, 770, 136), side: 'bottom', title: 'Create new', text: 'Quotation, purchase order, delivery note and invoice, each with its own editor.', icons: ['quote', 'po', 'dn', 'inv'] },
    { ch: 0, screen: 'dash', rect: R(1028, 482, 540, 410), side: 'bottom', title: 'Insights', text: 'Bid outcomes and document totals for the month, with full reports behind them.' },
    { ch: 1, screen: 'linking', title: 'Linked documents', text: 'A purchase order written in Arabic becomes an English delivery note and invoice, filled from Master Data. Each document stays linked to the next.' },
    { ch: 2, screen: 'master', title: 'Master Data', text: 'One record per item and per client, in English and Arabic. Documents fill from these records, and a review screen flags duplicates and bad entries.' },
    { ch: 3, screen: 'control', rect: R(175, 200, 620, 150), to: R(790, 200, 620, 150), side: 'bottom', title: 'Control Room', text: CONTROL },
    { ch: 3, screen: 'control', rect: R(830, 490, 570, 330), side: 'bottom', title: 'Control Room', text: CONTROL },
  ];
  const SCREENS = {
    dash: { image: () => window.DASH || '../assets/hero-dashboard.webp', icons: ['quote', 'po', 'dn', 'inv'] },
    // Time, then the part of the screen to look at. Held until the next one.
    linking: { video: 'linking', keys: [[0, 560, 160, 600, 520], [1.5, 60, 150, 700, 450], [3.2, 400, 560, 700, 400], [5.9, 60, 180, 700, 500], [8.05, 176, 333, 620, 323], [9.2, 790, 333, 620, 323], [10.3, 60, 180, 700, 500]] },
    master: { video: 'master', keys: [[0, 170, 250, 640, 560], [2.9, 840, 90, 640, 420], [5, 170, 250, 640, 560], [7.1, 530, 90, 530, 560], [10.4, 20, 170, 760, 620]] },
    control: { image: () => '../assets/control-room.webp' },
  };
  const N = STOPS.length;

  let win = null, vw = 1, vh = 1, built = false, cap, capT, capP, capC, rail, chips = [], layers = {}, states = [], notes, vp, frameEl, cur = -1, capNow = -1, chNow = -1, noteFor = -1, played = -1, typer = 0, washes = [], live = true;
  const ready = () => built && win;
  let themeBtn = null, darkOn = false, awake = false, screenNow = 'dash';
  const paintDark = () => { const d = darkOn && screenNow === 'dash'; vp.classList.toggle('dark', d); frameEl.classList.toggle('dark', d); };

  function build() {
    if (built) return;
    built = true;
    const box = makeWindow(root, { hue: CH[0].hue });
    frameEl = box.root; frameEl.id = 'pWin'; vp = box.vp; notes = box.notes;
    Object.keys(SCREENS).forEach(k => {
      const sc = SCREENS[k], l = layers[k] = addLayer(vp);
      l.sc = sc;
      l.layer.style.visibility = 'hidden';
      if (sc.video) {
        const v = el('video'); v.muted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.loop = true; v.preload = 'none';
        v.setAttribute('aria-label', (k === 'linking' ? 'Linked documents' : 'Master Data') + ' screen recording, sample data');
        v.innerHTML = `<source src="../assets/${sc.video}.mp4" type="video/mp4">`;
        l.world.appendChild(v); l.video = v;
      } else {
        const i = el('img'); i.alt = k === 'dash' ? 'Business Hub dashboard, sample data' : 'Control Room screen, sample data'; i.decoding = 'async'; i.draggable = false;
        l.world.appendChild(i); l.img = i;
        if (k === 'dash') {
          i.src = sc.image();
          l.dark = el('img', 'cam-dark'); l.dark.alt = ''; l.dark.decoding = 'async'; l.dark.draggable = false; l.world.appendChild(l.dark);
          l.icons = addIcons(l.world, sc.icons);
        }
      }
      if (k !== 'dash') l.layer.style.zIndex = 2;
    });
    layers.dash.layer.style.visibility = '';
    themeBtn = themeSwitch(box.bar, on => {
      const l = layers.dash;
      if (on && !l.dark.src) l.dark.src = '../assets/phone/dash-dark.webp';
      l.dark.classList.toggle('on', on);
      darkOn = on;
      paintDark();
      Object.values(l.icons).forEach(it => { it.tile.hidden = on; });
    });
    // A dim sheet over the screen a new one is rising over
    root.insertAdjacentHTML('beforeend', '<div id="pCap" aria-live="off"><h3><span></span><i class="cur" aria-hidden="true"></i></h3><p></p></div><div id="pRail"><ol aria-label="Tour chapters"></ol><a id="pExplore" href="../business-hub/index.html" aria-label="Explore Business Hub">Explore <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a></div>');
    cap = root.querySelector('#pCap'); capT = cap.querySelector('h3 span'); capC = cap.querySelector('h3'); capP = cap.querySelector('p'); rail = root.querySelector('#pRail');
    const list = rail.querySelector('ol');
    chips = CH.map((c, i) => {
      const li = el('li', '', `<button type="button" aria-label="${c.name}"><svg viewBox="0 0 24 24" aria-hidden="true">${c.icon}</svg><i class="bar"></i></button>`);
      li.style.setProperty('--h', c.hue);
      li.firstChild.addEventListener('click', () => jump(c.stop));
      list.appendChild(li);
      return li.firstChild;
    });
    const sr = el('ul', 'sr'); STOPS.forEach(s => sr.appendChild(el('li', '', (s.title ? s.title + ': ' : '') + s.text))); root.appendChild(sr);
  }
  function jump(i) {
    const stage = document.getElementById('stage'), H = document.getElementById('pin').clientHeight, len = stage.offsetHeight - H - window.__pmHero * H;
    scrollTo({ top: stage.offsetTop + window.__pmHero * H + len * ((i + .08) / N), behavior: 'smooth' });
  }
  function layout(w, visibleH, opts = {}) {
    build();
    win = w; washes = opts.washes || washes;
    const land = innerWidth > visibleH * 1.2, W = innerWidth, gut = Math.max(16, W * .04);
    Object.assign(frameEl.style, { left: w.x + 'px', top: w.y + 'px', width: w.w + 'px', height: w.h + 'px' });
    vw = w.w; vh = w.h - 30;
    if (land) {
      const x = w.x + w.w + 16, cw = W - x - 14, title = document.getElementById('head');
      title.style.left = (x - 16) + 'px';
      Object.assign(cap.style, { left: x + 'px', width: cw + 'px', top: (w.y + 40) + 'px' });
      Object.assign(rail.style, { left: x + 'px', width: cw + 'px', top: (visibleH - 52) + 'px' });
    } else {
      document.getElementById('head').style.left = '';
      const x = w.x;
      Object.assign(cap.style, { left: x + 'px', width: w.w + 'px', top: (w.y + w.h + 10) + 'px' });
      Object.assign(rail.style, { left: x + 'px', width: w.w + 'px', top: (visibleH - 50) + 'px' });
    }
    states = STOPS.map(s => s.rect ? fit(s.rect, vw, vh) : null);
    STOPS.forEach((s, i) => { if (s.to) s.toState = fit(s.to, vw, vh); });
    // The first view must match what the hero painted in the window
    states[0] = { s: Math.max(vw / 1600, vh / 1000), x: 0, y: 0 };
    noteFor = -1; cur = -1; capNow = -1;
    Object.values(layers).forEach(l => { l.done = null; });
  }
  function warm(l) {
    if (l.warm) return;
    l.warm = true;
    if (l.img && !l.img.src) { l.img.src = l.sc.image(); if (l.img.decode) l.img.decode().catch(() => {}); }
    if (l.video) { l.video.poster = `../assets/${l.sc.video}.jpg`; l.video.preload = 'metadata'; }
  }
  function setCap(i) {
    if (i === capNow) return;
    const s = STOPS[i], before = capNow >= 0 ? STOPS[capNow] : null;
    capNow = i;
    capP.textContent = s.text;
    if (!before || before.title !== s.title) typeTitle(s.title || '');
    if (!P.REDUCE && !window.__motionPaused && (!before || before.text !== s.text)) capP.animate([{ opacity: 0, transform: 'translate3d(0,6px,0)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.22,.8,.2,1)' });
  }
  function typeTitle(t) {
    clearInterval(typer);
    capC.hidden = !t;
    if (!t) { capT.textContent = ''; return; }
    if (window.__motionPaused) { capT.textContent = t; capC.classList.remove('typing'); return; }
    let n = 0;
    capC.classList.add('typing'); capT.textContent = '';
    typer = setInterval(() => {
      if (window.__motionPaused || document.hidden) return;
      capT.textContent = t.slice(0, ++n);
      if (n >= t.length) { clearInterval(typer); capC.classList.remove('typing'); }
    }, 34);
  }
  function setChapter(k, q) {
    if (k !== chNow) {
      chNow = k;
      frameEl.style.setProperty('--h', CH[k].hue);
      chips.forEach((b, j) => { if (j === k) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current'); });
    }
    chips.forEach((b, j) => {
      const c = CH[j], end = j + 1 < CH.length ? CH[j + 1].stop : N, v = clamp((q - c.stop) / (end - c.stop));
      if (b._v !== v) { b._v = v; b.lastChild.style.transform = `scaleX(${v.toFixed(3)})`; }
    });
  }
  function drawNote(i, st) {
    const s = STOPS[i];
    if (noteFor === i) return;
    noteFor = i;
    if (!s.side) { notes.clear(); return; }
    const box = onScreen(s.to || s.rect, st, vw, vh, 30);
    const end = win.h + 8, short = s.side === 'bottom' && end - (box.y + box.h) < vh * .42;
    notes.set(bracket(box, s.side, i + 3, short && innerWidth < (win.h + 120) * 1.2 ? [Math.min(vw * .16, 54), end] : null));
  }
  function paint(T, p, dt) {
    if (!ready()) return;
    // Frames load at the first scroll, not with the page
    if (!awake && p > .004) { awake = true; wakeArt(root); }
    const on = p >= .425;
    if (on !== live) { live = on; root.classList.toggle('on', on); frameEl.inert = !on; if (!on) playAll(false); }
    if (!on) return;
    cap.style.opacity = span(p, .49, .57); rail.style.opacity = span(p, .52, .6);
    const q = T * N, i = Math.min(N - 1, Math.floor(q)), l = q - i, s = STOPS[i], n = STOPS[i + 1];
    const same = n && n.screen === s.screen;
    // Layers: this stop's screen, and the next one rising over it
    const e = n && !same ? soft(span(l, .62, 1)) : 0;
    Object.entries(layers).forEach(([k, L]) => {
      const show = k === s.screen || (e > 0 && k === n.screen);
      if (show !== L.shown) { L.shown = show; L.layer.style.visibility = show ? '' : 'hidden'; if (L.video) { if (!show) L.video.pause(); } }
      if (show && k === (n && n.screen) && !same) L.layer.style.transform = `translate3d(0,${((1 - e) * 100).toFixed(2)}%,0)`;
      else if (show && k === s.screen) L.layer.style.transform = 'none';
    });
    // Have the next screens ready well before they arrive
    STOPS.forEach((st, k) => { if (q > k - 1.4) warm(layers[st.screen]); });
    // The camera
    const L = layers[s.screen];
    let st = states[i];
    if (s.rect) {
      if (s.to) st = mix(states[i], s.toState, soft(span(l, .08, .5)), vw, vh);
      const after = s.to ? s.toState : states[i];
      if (same && n.rect) st = l < .62 ? st : mix(after, states[i + 1], soft(span(l, .62, 1)), vw, vh);
      L.world.style.transform = css(st);
    }
    Object.entries(layers).forEach(([k, X]) => {
      if (!X.shown || !X.video) return;
      const t = X.video.currentTime || 0;
      X.world.style.transform = css(keyState(X.sc.keys, t, vw, vh, { w: 1600, h: 1000 }));
    });
    if (e > 0 && n.rect) layers[n.screen].world.style.transform = css(states[i + 1]);
    // Recordings play only while they own the window
    Object.entries(layers).forEach(([k, X]) => {
      if (!X.video) return;
      const want = X.shown && (k === s.screen ? l < .95 : e > .35) && !window.__motionPaused && !document.hidden;
      if (want && X.video.paused) { X.video.preload = 'auto'; try { if (X.video.readyState > 0 && k !== X.was) X.video.currentTime = 0; } catch (x) {} const r = X.video.play(); r && r.catch(() => {}); X.was = k; }
      else if (!want && !X.video.paused) { X.video.pause(); X.was = null; }
    });
    // The note: drawn while the camera holds, lifted before it moves
    if (s.side) {
      drawNote(i, s.to ? s.toState : states[i]);
      const a = s.to ? .46 : .06, last = i === N - 1;
      notes.progress(soft(span(l, a, a + .18)) * (last ? 1 : 1 - soft(span(l, .56, .63))));
    } else if (noteFor !== i) { noteFor = i; notes.clear(); }
    // Icons play once on arrival
    if (s.icons && L.icons && l > (s.to ? .1 : .05) && played !== i) { played = i; playIcons(L.icons, s.icons, 190); }
    if (!s.icons && played !== -1 && l < .9) played = -1;
    setCap(n && l > .8 ? i + 1 : i);
    const shown = n && l > .8 ? n.ch : s.ch;
    setChapter(shown, q);
    const scr = n && l > .8 ? n.screen : s.screen;
    if (scr !== screenNow) { screenNow = scr; paintDark(); if (themeBtn) themeBtn.hidden = scr !== 'dash'; }
    // Colour behind the window
    washes.forEach((w, k) => {
      const v = !n || n.ch === s.ch ? (k === s.ch ? 1 : 0) : k === s.ch ? 1 - e : k === n.ch ? e : 0;
      if (w._v !== v) { w._v = v; w.style.opacity = v; }
    });
    cur = shown;
  }
  function playAll(on) { Object.values(layers).forEach(X => { if (X.video && !on) { X.video.pause(); X.was = null; } }); }
  function reset() {
    live = true; root.classList.remove('on'); cur = -1; chNow = -1; capNow = -1; noteFor = -1;
    playAll(false);
    washes.forEach(w => { w._v = 0; w.style.opacity = 0; });
  }
  addEventListener('motionchange', () => { if (window.__motionPaused) playAll(false); });
  return { layout, paint, park: () => playAll(false), reset, chapter: () => cur, playing: () => Object.values(layers).filter(X => X.video && !X.video.paused).length, stops: N, jump, built: () => built };
})();
