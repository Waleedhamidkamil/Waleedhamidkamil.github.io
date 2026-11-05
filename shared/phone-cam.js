/* What the phone layouts share: a window with a camera over a real app screen, sketched notes, real icon frames, and decks that step
   through features one at a time. A desktop screen is unreadable when shrunk to a phone, so the camera goes to the part that matters.
   Only transforms and opacity move. Used by proto/main/phone-tour.js and proto/business-hub/phone.js. */
window.PhoneCam = (() => {
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const span = (v, a, b) => clamp((v - a) / (b - a));
  const soft = t => t * t * t * (t * (t * 6 - 15) + 10);
  const lerp = (a, b, t) => a + (b - a) * t;
  const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NS = 'http://www.w3.org/2000/svg';
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const R = (x, y, w, h) => ({ x, y, w, h });

  /* Camera maths. A state is { s, x, y }: the scale and where the screen's top-left corner lands in the window. */
  function fit(r, vw, vh, world = { w: 1600, h: 1000 }, o = {}) {
    const pad = o.pad == null ? 14 : o.pad;
    const fitS = Math.min((vw - pad * 2) / r.w, (vh - pad * 2) / r.h);
    // Never smaller than the window: an upright window over a wide screen shows part of it, and never empty bands
    const s = Math.max(vw / world.w, vh / world.h, Math.min(o.max || 1.05, fitS));
    const ww = world.w * s, wh = world.h * s;
    let x = vw / 2 - (r.x + r.w / 2) * s, y = vh / 2 - (r.y + r.h / 2) * s;
    x = ww >= vw ? clamp(x, vw - ww, 0) : (vw - ww) / 2;
    y = wh >= vh ? clamp(y, vh - wh, 0) : (vh - wh) / 2;
    return { s, x, y };
  }
  // Through the focal point and the log of the zoom, so a long move doesn't swing wide
  function mix(a, b, t, vw, vh) {
    if (t <= 0) return a;
    if (t >= 1) return b;
    const cax = (vw / 2 - a.x) / a.s, cay = (vh / 2 - a.y) / a.s, cbx = (vw / 2 - b.x) / b.s, cby = (vh / 2 - b.y) / b.s;
    const s = Math.exp(lerp(Math.log(a.s), Math.log(b.s), t)), cx = lerp(cax, cbx, t), cy = lerp(cay, cby, t);
    return { s, x: vw / 2 - cx * s, y: vh / 2 - cy * s };
  }
  const css = st => `translate3d(${st.x.toFixed(2)}px,${st.y.toFixed(2)}px,0) scale(${st.s.toFixed(4)})`;

  /* A camera that follows a video: keys are [time, x, y, w, h], and it holds on each one, then moves to the next */
  function keyState(keys, t, vw, vh, world, move = .9) {
    let i = 0;
    while (i < keys.length - 1 && t >= keys[i + 1][0]) i++;
    const k = keys[i], st = fit(R(k[1], k[2], k[3], k[4]), vw, vh, world);
    const n = keys[i + 1];
    if (!n) return st;
    const left = n[0] - t;
    if (left > move) return st;
    return mix(st, fit(R(n[1], n[2], n[3], n[4]), vw, vh, world), soft(1 - left / move), vw, vh);
  }

  /* Hand-drawn lines, the same family as the notes on the desktop pages */
  function rng(seed) { let x = seed * 9301 + 49297; return () => (x = (x * 9301 + 49297) % 233280) / 233280 - .5; }
  function jitter(points, seed, amp) { const r = rng(seed); return points.map(([x, y], i) => { const e = i === 0 || i === points.length - 1 ? 0 : amp; return `${i ? 'L' : 'M'}${(x + r() * e).toFixed(1)} ${(y + r() * e).toFixed(1)}`; }).join(''); }
  function seg(a, b, n) { const o = []; for (let i = 0; i <= n; i++) o.push([lerp(a[0], b[0], i / n), lerp(a[1], b[1], i / n)]); return o; }
  function bez(p0, p1, p2, p3, n) { const o = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t; o.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]); } return o; }
  // A bracket along one side of a rectangle, and a line from its middle to a point: the "[ with a line" that explains what it is
  function bracket(r, side, seed, to) {
    const h = 8, p = 3; let pts, mid, dir;
    if (side === 'bottom') { const y = r.y + r.h + p; pts = [...seg([r.x, y - h], [r.x, y], 2), ...seg([r.x, y], [r.x + r.w, y], 10), ...seg([r.x + r.w, y], [r.x + r.w, y - h], 2)]; mid = [r.x + r.w / 2, y]; dir = [0, 1]; }
    else if (side === 'top') { const y = r.y - p; pts = [...seg([r.x, y + h], [r.x, y], 2), ...seg([r.x, y], [r.x + r.w, y], 10), ...seg([r.x + r.w, y], [r.x + r.w, y + h], 2)]; mid = [r.x + r.w / 2, y]; dir = [0, -1]; }
    else if (side === 'left') { const x = r.x - p; pts = [...seg([x + h, r.y], [x, r.y], 2), ...seg([x, r.y], [x, r.y + r.h], 10), ...seg([x, r.y + r.h], [x + h, r.y + r.h], 2)]; mid = [x, r.y + r.h / 2]; dir = [-1, 0]; }
    else { const x = r.x + r.w + p; pts = [...seg([x - h, r.y], [x, r.y], 2), ...seg([x, r.y], [x, r.y + r.h], 10), ...seg([x, r.y + r.h], [x - h, r.y + r.h], 2)]; mid = [x, r.y + r.h / 2]; dir = [1, 0]; }
    const out = [jitter(pts, seed, 1.4)];
    if (to) {
      const k = Math.max(18, Math.hypot(to[0] - mid[0], to[1] - mid[1]) * .42);
      out.push(jitter(bez(mid, [mid[0] + dir[0] * k, mid[1] + dir[1] * k], [to[0], to[1] - k * .8], to, 16), seed + 9, .9));
    }
    return out;
  }
  class Notes {
    constructor(svg) { this.svg = svg; this.paths = []; this.anims = []; }
    set(ds) {
      this.stop();
      this.svg.textContent = '';
      this.paths = [];
      ds.forEach(d => ['halo', 'ink'].forEach(c => {
        const p = document.createElementNS(NS, 'path');
        p.setAttribute('d', d); p.setAttribute('class', c); p.setAttribute('pathLength', '1');
        p.style.strokeDasharray = '1'; p.style.strokeDashoffset = '1';
        this.svg.appendChild(p); this.paths.push(p);
      }));
      this.at = -1;
    }
    // By scroll: 0 is not drawn, 1 is fully drawn
    progress(v) {
      if (v === this.at) return;
      this.at = v;
      const off = String(1 - v);
      this.paths.forEach(p => { p.style.strokeDashoffset = off; });
    }
    // By time
    draw(delay = 120) {
      if (REDUCE || window.__motionPaused) { this.progress(1); return; }
      this.paths.forEach((p, i) => {
        const a = p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 560, delay: delay + (i >> 1) * 300, easing: 'cubic-bezier(.65,0,.3,1)', fill: 'both' });
        this.anims.push(a);
      });
    }
    stop() { this.anims.forEach(a => a.cancel()); this.anims = []; }
    clear() { this.stop(); this.svg.textContent = ''; this.paths = []; this.at = -1; }
  }
  // A rectangle of the screen as it lands in the window, kept inside it
  function onScreen(r, st, vw, vh, top = 0) {
    const x0 = clamp(st.x + r.x * st.s, 7, vw - 20), y0 = clamp(st.y + r.y * st.s, 7, vh - 20);
    const x1 = clamp(st.x + (r.x + r.w) * st.s, x0 + 12, vw - 7), y1 = clamp(st.y + (r.y + r.h) * st.s, y0 + 12, vh - 7);
    return { x: x0, y: y0 + top, w: x1 - x0, h: y1 - y0 };
  }

  /* The real app icons, as frames laid over the picture. Each tile covers the same spot in the screenshot, and shows only while it plays. */
  const ICONS = () => window.PHONE_ICONS || { icons: {}, frames: 0 };
  function addIcons(world, names, base = '../assets/phone/') {
    const I = ICONS(), out = {};
    names.forEach(n => {
      const c = I.icons[n];
      if (!c) return;
      const tile = el('i', 'cam-ico');
      Object.assign(tile.style, { left: c.x + 'px', top: c.y + 'px', width: c.w + 'px', height: c.h + 'px' });
      const strip = el('b');
      const cell = c.cw / I.scale;
      Object.assign(strip.style, { width: cell * I.frames + 'px', height: c.h + 'px', backgroundSize: `${cell * I.frames}px auto`, backgroundPosition: `0 ${-c.row / I.scale}px` });
      strip.dataset.art = `url(${base}icons.webp)`;
      tile.appendChild(strip);
      world.appendChild(tile);
      out[n] = { tile, strip, cell };
    });
    return out;
  }
  // Hand a scene its frames once somebody is near it
  function wakeArt(root) { root.querySelectorAll('[data-art]').forEach(e => { e.style.backgroundImage = e.dataset.art; e.removeAttribute('data-art'); }); }
  function playIcons(set, names, gap = 160) {
    if (REDUCE || window.__motionPaused) return;
    const I = ICONS();
    names.forEach((n, i) => {
      const it = set[n];
      if (!it || it.a) return;
      const delay = i * gap;
      const a = it.strip.animate([{ transform: 'translate3d(0,0,0)' }, { transform: `translate3d(${-it.cell * (I.frames - 1)}px,0,0)` }], { duration: 1100, delay, easing: `steps(${I.frames - 1})`, fill: 'none' });
      it.a = a;
      setTimeout(() => { it.tile.style.visibility = 'visible'; }, delay);
      a.onfinish = a.oncancel = () => { it.tile.style.visibility = ''; it.a = null; };
    });
  }

  /* The window: a title bar, a camera view with layers in it, and a sheet for the notes */
  function makeWindow(host, o = {}) {
    const root = el('div', 'pwin');
    if (o.hue) root.style.setProperty('--h', o.hue);
    root.innerHTML = `<div class="pbar"><span class="pbar-t">${o.title || 'Business Hub'}</span><span class="pbar-tag">Sample data</span></div><div class="cam"></div><svg class="cam-notes" aria-hidden="true"></svg>`;
    host.appendChild(root);
    return { root, bar: root.firstChild, vp: root.querySelector('.cam'), notes: new Notes(root.querySelector('.cam-notes')) };
  }
  function addLayer(vp, world = { w: 1600, h: 1000 }) {
    const layer = el('div', 'cam-layer'), w = el('div', 'cam-world');
    w.style.width = world.w + 'px'; w.style.height = world.h + 'px';
    layer.appendChild(w); vp.appendChild(layer);
    return { layer, world: w, size: world };
  }
  const SVG = {
    play: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l13 8-13 8z"/></svg>',
    pause: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 5v14M16 5v14"/></svg>',
    expand: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/></svg>',
  };

  /* A theme switch from real frames of the app's own switch: sun to moon */
  function themeSwitch(bar, onChange, base = '../assets/phone/') {
    const T = ICONS().theme;
    if (!T) return null;
    const h = 22, w = h * T.w / T.h, btn = el('button', 'pbar-theme');
    btn.type = 'button'; btn.setAttribute('aria-pressed', 'false'); btn.setAttribute('aria-label', 'Switch this window to dark');
    const strip = el('b');
    Object.assign(strip.style, { width: w * T.frames + 'px', height: h + 'px', backgroundSize: '100% 100%' });
    strip.dataset.art = `url(${base}theme.webp)`;
    const box = el('i'); box.style.width = w + 'px'; box.style.height = h + 'px'; box.appendChild(strip); btn.appendChild(box);
    bar.insertBefore(btn, bar.querySelector('.pbar-tag').nextSibling);
    let dark = false, x = 0, anim = null;
    btn.addEventListener('click', () => {
      dark = !dark;
      btn.setAttribute('aria-pressed', String(dark));
      btn.setAttribute('aria-label', dark ? 'Switch this window to light' : 'Switch this window to dark');
      const to = dark ? -w * (T.frames - 1) : 0;
      if (anim) anim.cancel();
      if (REDUCE || window.__motionPaused) { strip.style.transform = `translate3d(${to}px,0,0)`; x = to; }
      else {
        const frames = Math.round(Math.abs(to - x) / w) || 1;
        anim = strip.animate([{ transform: `translate3d(${x}px,0,0)` }, { transform: `translate3d(${to}px,0,0)` }], { duration: 850, easing: `steps(${frames})`, fill: 'forwards' });
        x = to;
      }
      onChange(dark);
    });
    return btn;
  }

  /* A deck: one window, one caption, and a row of steps like a story. It runs by itself while on screen, and any touch hands control over.
     stops: { screen, rect, side, title, text, href, link, tab, icons }
     screens: { key: { src, world?, dark? } }  tabs: [{ label, hue }] */
  class Deck {
    constructor(host, o) {
      this.o = o; this.stops = o.stops; this.i = -1; this.auto = o.auto !== false; this.visible = false; this.layers = {}; this.tab = -1;
      const scene = this.root = el('div', 'pscene');
      if (o.hue) scene.style.setProperty('--h', o.hue);
      if (o.tabs) {
        this.tabsEl = el('div', 'ptabs'); this.tabsEl.setAttribute('role', 'group'); this.tabsEl.setAttribute('aria-label', o.tabsLabel || 'Choose');
        o.tabs.forEach((t, k) => {
          const b = el('button', '', `<span>${t.label}</span>`); b.type = 'button'; b.style.setProperty('--h', t.hue || 'var(--h)');
          b.addEventListener('click', () => { this.user(); this.go(this.stops.findIndex(s => s.tab === k)); });
          this.tabsEl.appendChild(b);
        });
        scene.appendChild(this.tabsEl);
      }
      this.win = makeWindow(scene, { hue: o.hue, title: o.title });
      this.rail = el('ol', 'prail'); scene.appendChild(this.rail);
      this.cap = el('div', 'pcap', `<h3></h3><p></p>${o.noLinks ? '' : '<a class="pgo" hidden></a>'}`); scene.appendChild(this.cap);
      this.capT = this.cap.querySelector('h3'); this.capP = this.cap.querySelector('p'); this.capA = this.cap.querySelector('a');
      // Everything the deck will say, for people who don't see it move
      const list = el('ul', 'sr'); this.stops.forEach(s => list.appendChild(el('li', '', `${s.title}: ${s.text}`))); scene.appendChild(list);
      if (o.expand) this.addExpand();
      if (o.dark) themeSwitch(this.win.bar, d => this.setDark(d));
      host.appendChild(scene);
      this.bindSwipe();
      this.io = new IntersectionObserver(es => { const v = es[0].isIntersecting; if (v === this.visible) return; this.visible = v; if (v && !this.seen) this.first(); if (v) this.auto = o.auto !== false; this.tick(); }, { threshold: .45 });
      this.io.observe(this.win.root);
      addEventListener('motionchange', () => this.tick());
      document.addEventListener('visibilitychange', () => this.tick());
      this.measure();
      this.go(0, { instant: true });
    }
    first() { this.seen = true; wakeArt(this.root); this.playStop(); this.drawNote(); }
    measure() { this.vw = this.win.vp.clientWidth; this.vh = this.win.vp.clientHeight; }
    layer(key) {
      if (this.layers[key]) return this.layers[key];
      const sc = this.o.screens[key], l = addLayer(this.win.vp, sc.world);
      const img = el('img'); img.alt = sc.alt || ''; img.decoding = 'async'; img.loading = 'lazy'; img.draggable = false; img.src = sc.src;
      l.world.appendChild(img);
      if (sc.dark) { l.darkImg = el('img', 'cam-dark'); l.darkImg.alt = ''; l.darkImg.decoding = 'async'; l.darkImg.draggable = false; l.world.appendChild(l.darkImg); l.darkSrc = sc.dark; }
      if (sc.icons) l.icons = addIcons(l.world, sc.icons);
      l.layer.style.visibility = 'hidden';
      return this.layers[key] = l;
    }
    setDark(on) {
      const l = this.layers[this.stops[this.i].screen];
      if (!l || !l.darkImg) return;
      if (on && !l.darkImg.src) l.darkImg.src = l.darkSrc;
      l.darkImg.classList.toggle('on', on);
      this.win.vp.classList.toggle('dark', on);
      this.win.root.classList.toggle('dark', on);
      if (l.icons) Object.values(l.icons).forEach(it => { it.tile.hidden = on; });
    }
    state(s) { const l = this.layers[s.screen]; return fit(s.rect, this.vw, this.vh, l.size, s.fit); }
    go(i, opt = {}) {
      if (i < 0 || i >= this.stops.length) return;
      const s = this.stops[i], prev = this.stops[this.i], l = this.layer(s.screen), changed = !prev || prev.screen !== s.screen, st = this.state(s);
      this.i = i;
      if (s.tab != null && s.tab !== this.tab) this.setTab(s.tab);
      if (this.railFor !== s.tab || !this.segs) this.buildRail(s.tab);
      if (changed) {
        Object.values(this.layers).forEach(x => { if (x !== l) x.layer.style.zIndex = 1; });
        l.layer.style.zIndex = 2;
        l.world.style.transition = 'none';
        l.world.style.transform = css(st);
        l.layer.style.visibility = '';
        if (prev && !opt.instant && !REDUCE && !window.__motionPaused) {
          const old = this.layers[prev.screen];
          const a = l.layer.animate([{ transform: 'translate3d(0,100%,0)' }, { transform: 'translate3d(0,0,0)' }], { duration: 560, easing: 'cubic-bezier(.22,.8,.2,1)' });
          a.onfinish = () => { if (this.layers[this.stops[this.i].screen] !== old) old.layer.style.visibility = 'hidden'; };
        } else if (prev) this.layers[prev.screen].layer.style.visibility = 'hidden';
      } else if (opt.instant || REDUCE || window.__motionPaused) {
        l.world.style.transition = 'none'; l.world.style.transform = css(st);
      } else {
        l.world.style.transition = 'transform 860ms cubic-bezier(.3,.7,.15,1)';
        l.world.style.transform = css(st);
      }
      this.cur = st;
      this.paintCap(s, !opt.instant);
      this.paintRail();
      this.win.notes.clear();
      if (this.seen) { this.drawNote(changed ? 460 : 720); this.playStop(changed ? 460 : 620); }
      this.tick();
      if (this.o.onStop) this.o.onStop(s, i);
      // The next picture is ready before it is needed
      const n = this.stops[i + 1]; if (n && this.visible) this.layer(n.screen);
    }
    drawNote(delay = 200) {
      const s = this.stops[this.i], w = this.win;
      w.notes.clear();
      if (!s.side) return;
      const top = w.vp.offsetTop, r = onScreen(s.rect, this.cur, this.vw, this.vh, top);
      // A line down to the caption only when it stays short. A long one across the screen would just be in the way.
      const end = w.root.clientHeight + 6, mid = s.side === 'bottom' ? r.y + r.h : r.y;
      w.notes.set(bracket(r, s.side, this.i + 3, s.side === 'bottom' && end - mid < this.vh * .42 ? [Math.min(this.vw * .16, 54), end] : null));
      w.notes.draw(delay);
    }
    playStop(delay = 300) {
      const s = this.stops[this.i], l = this.layers[s.screen];
      if (!s.icons || !l || !l.icons) return;
      setTimeout(() => { if (this.stops[this.i] === s) playIcons(l.icons, s.icons); }, delay);
    }
    setTab(k) {
      this.tab = k;
      [...this.tabsEl.children].forEach((b, j) => { b.setAttribute('aria-pressed', String(j === k)); if (j === k) { this.root.style.setProperty('--h', this.o.tabs[k].hue); this.win.root.style.setProperty('--h', this.o.tabs[k].hue); b.scrollIntoView && this.tabsEl.scrollTo({ left: b.offsetLeft - (this.tabsEl.clientWidth - b.offsetWidth) / 2, behavior: REDUCE ? 'auto' : 'smooth' }); } });
    }
    buildRail(tab) {
      this.railFor = tab;
      this.rail.textContent = '';
      this.segs = [];
      this.stops.forEach((s, k) => {
        if (s.tab !== tab) return;
        const li = el('li', '', `<button type="button" aria-label="${s.title}"><i></i></button>`);
        li.firstChild.addEventListener('click', () => { this.user(); this.go(k); });
        this.rail.appendChild(li);
        this.segs.push({ k, btn: li.firstChild, bar: li.firstChild.firstChild });
      });
    }
    paintRail() {
      this.segs.forEach(g => {
        const on = g.k === this.i;
        g.btn.toggleAttribute('data-on', on);
        if (on) g.btn.setAttribute('aria-current', 'step'); else g.btn.removeAttribute('aria-current');
        g.bar.getAnimations().forEach(a => a.cancel());
        g.bar.style.transform = `scaleX(${g.k < this.i ? 1 : 0})`;
      });
    }
    paintCap(s, animate) {
      this.capT.textContent = s.title || '';
      this.capP.textContent = s.text;
      if (this.capA) { if (s.href) { this.capA.hidden = false; this.capA.href = s.href; this.capA.textContent = s.link; } else this.capA.hidden = true; }
      if (animate && !REDUCE && !window.__motionPaused) this.cap.animate([{ opacity: 0, transform: 'translate3d(0,6px,0)' }, { opacity: 1, transform: 'none' }], { duration: 300, easing: 'cubic-bezier(.22,.8,.2,1)' });
    }
    user() { this.auto = false; this.tick(); }
    // The current step fills while it is on show, and the fill runs the deck
    tick() {
      const seg = this.segs && this.segs.find(g => g.k === this.i);
      if (!seg) return;
      const run = this.auto && this.visible && !window.__motionPaused && !document.hidden && !REDUCE;
      if (!run) {
        if (this.fill) { if (this.auto) this.fill.pause(); else { this.fill.cancel(); this.fill = null; seg.bar.style.transform = 'scaleX(1)'; } }
        else if (!this.auto) seg.bar.style.transform = 'scaleX(1)';
        return;
      }
      if (this.fill && this.fillFor === this.i) { this.fill.play(); return; }
      if (this.fill) this.fill.cancel();
      const text = this.stops[this.i].text.length, ms = clamp(1600 + text * 34, 3000, 6400);
      this.fillFor = this.i;
      this.fill = seg.bar.animate([{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: ms, easing: 'linear', fill: 'forwards' });
      this.fill.onfinish = () => { this.fill = null; this.next(); };
    }
    next() {
      if (this.fill) { this.fill.cancel(); this.fill = null; }
      this.go(this.i + 1 < this.stops.length ? this.i + 1 : 0);
    }
    prev() {
      if (this.fill) { this.fill.cancel(); this.fill = null; }
      this.go(this.i > 0 ? this.i - 1 : this.stops.length - 1);
    }
    bindSwipe() {
      const vp = this.win.vp; let d = null;
      const world = () => this.layers[this.stops[this.i].screen].world;
      vp.addEventListener('pointerdown', e => { if (e.button > 0) return; d = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId, dx: 0 }; });
      vp.addEventListener('pointermove', e => {
        if (!d || e.pointerId !== d.id) return;
        d.dx = e.clientX - d.x;
        if (!d.drag && Math.abs(d.dx) > 8 && Math.abs(d.dx) > Math.abs(e.clientY - d.y)) { d.drag = true; try { vp.setPointerCapture(e.pointerId); } catch (x) {} }
        if (d.drag) { world().style.transition = 'none'; world().style.transform = css({ s: this.cur.s, x: this.cur.x + d.dx * .28, y: this.cur.y }); }
      });
      const up = e => {
        if (!d || e.pointerId !== d.id) return;
        const q = d; d = null;
        const dt = performance.now() - q.t, fast = Math.abs(q.dx) / Math.max(1, dt) > .35;
        if (q.drag && e.type === 'pointerup' && (Math.abs(q.dx) > 44 || fast)) { this.user(); q.dx < 0 ? this.next() : this.prev(); return; }
        if (q.drag) { world().style.transition = 'transform 260ms cubic-bezier(.22,.8,.2,1)'; world().style.transform = css(this.cur); return; }
        // A plain tap: the right part goes on, the left part goes back
        if (e.type === 'pointerup' && dt < 450 && Math.abs(q.dx) < 8) { this.user(); const r = vp.getBoundingClientRect(); e.clientX - r.left < r.width * .28 ? this.prev() : this.next(); }
      };
      vp.addEventListener('pointerup', up);
      vp.addEventListener('pointercancel', up);
    }
    addExpand() {
      const b = el('button', 'pbar-btn', SVG.expand); b.type = 'button'; b.setAttribute('aria-label', 'See the whole screen');
      b.addEventListener('click', () => { this.user(); const sc = this.o.screens[this.stops[this.i].screen]; window.__phoneZoom && window.__phoneZoom(sc.full || sc.src, sc.alt || ''); });
      this.win.bar.appendChild(b);
    }
    resize() { this.measure(); const s = this.stops[this.i], l = this.layers[s.screen]; this.cur = this.state(s); l.world.style.transition = 'none'; l.world.style.transform = css(this.cur); if (this.seen) this.drawNote(0); }
  }

  /* A video in a window: the camera follows the action, the caption follows the time, and the steps seek. Plays only on screen. */
  class Reel {
    constructor(host, o) {
      this.o = o; this.steps = o.steps; this.visible = false; this.now = -1; this.userPaused = false;
      const scene = this.root = el('div', 'pscene');
      if (o.hue) scene.style.setProperty('--h', o.hue);
      this.win = makeWindow(scene, { hue: o.hue, title: o.title });
      const l = addLayer(this.win.vp); this.world = l.world; this.size = l.size;
      const v = this.video = el('video'); v.muted = true; v.playsInline = true; v.setAttribute('playsinline', ''); v.preload = 'none'; v.poster = o.poster; v.setAttribute('aria-label', o.label); if (o.loop) v.loop = true;
      v.innerHTML = `<source src="${o.src}" type="video/mp4">`;
      this.world.appendChild(v);
      this.btn = el('button', 'pbar-btn', SVG.pause); this.btn.type = 'button';
      this.btn.addEventListener('click', () => { if (v.paused) { this.userPaused = false; this.play(); } else { this.userPaused = true; v.pause(); } });
      this.win.bar.appendChild(this.btn);
      this.rail = el('ol', 'prail'); scene.appendChild(this.rail);
      this.segs = this.steps.map((s, k) => {
        const li = el('li', '', `<button type="button" aria-label="${s.name}"><i></i></button>`);
        li.firstChild.addEventListener('click', () => { this.userPaused = false; try { v.currentTime = s.t + .02; } catch (x) {} this.play(); });
        this.rail.appendChild(li);
        return { btn: li.firstChild, bar: li.firstChild.firstChild };
      });
      this.cap = el('div', 'pcap', '<h3></h3><p></p>'); scene.appendChild(this.cap);
      this.capT = this.cap.querySelector('h3'); this.capP = this.cap.querySelector('p');
      const list = el('ul', 'sr'); this.steps.forEach(s => list.appendChild(el('li', '', `${s.name}: ${s.text}`))); scene.appendChild(list);
      host.appendChild(scene);
      const paint = () => { this.btn.innerHTML = v.paused ? SVG.play : SVG.pause; this.btn.setAttribute('aria-label', v.paused ? 'Play' : 'Pause'); };
      v.addEventListener('play', () => { paint(); this.loop(); }); v.addEventListener('pause', paint); paint();
      ['seeked', 'loadeddata'].forEach(n => v.addEventListener(n, () => this.paint()));
      v.addEventListener('ended', () => { setTimeout(() => { if (this.visible && !this.userPaused && !window.__motionPaused && !document.hidden) { v.currentTime = 0; this.play(); } }, 1600); });
      this.bindSwipe();
      this.io = new IntersectionObserver(es => { this.visible = es[0].isIntersecting; this.sync(); }, { threshold: .4 });
      this.io.observe(this.win.root);
      addEventListener('motionchange', () => this.sync());
      document.addEventListener('visibilitychange', () => this.sync());
      this.measure(); this.paint();
    }
    play() { if (REDUCE || window.__motionPaused || document.hidden) return; this.video.preload = 'auto'; const p = this.video.play(); p && p.catch(() => {}); this.loop(); }
    sync() {
      if (this.visible && !this.userPaused && !window.__motionPaused && !document.hidden && !REDUCE) this.play();
      else this.video.pause();
      this.loop();
    }
    loop() { if (this.raf || !this.visible) return; const f = () => { this.raf = 0; this.paint(); if (this.visible && !this.video.paused) this.raf = requestAnimationFrame(f); }; this.raf = requestAnimationFrame(f); }
    measure() { this.vw = this.win.vp.clientWidth; this.vh = this.win.vp.clientHeight; }
    paint() {
      const t = this.video.currentTime, dur = this.video.duration || this.o.duration, k = this.steps.reduce((a, s, j) => (t >= s.t ? j : a), 0);
      const st = keyState(this.o.keys, t, this.vw, this.vh, this.size);
      this.world.style.transform = css(st);
      if (k !== this.now) {
        this.now = k;
        const s = this.steps[k];
        this.capT.textContent = s.name; this.capP.textContent = s.text;
        if (!REDUCE && !window.__motionPaused) this.cap.animate([{ opacity: 0, transform: 'translate3d(0,6px,0)' }, { opacity: 1, transform: 'none' }], { duration: 280, easing: 'cubic-bezier(.22,.8,.2,1)' });
        this.segs.forEach((g, j) => { g.btn.toggleAttribute('data-on', j === k); if (j === k) g.btn.setAttribute('aria-current', 'step'); else g.btn.removeAttribute('aria-current'); g.bar.style.transform = `scaleX(${j < k ? 1 : 0})`; });
      }
      const end = k + 1 < this.steps.length ? this.steps[k + 1].t : dur;
      this.segs[k].bar.style.transform = `scaleX(${clamp((t - this.steps[k].t) / (end - this.steps[k].t)).toFixed(3)})`;
    }
    bindSwipe() {
      const vp = this.win.vp; let d = null;
      vp.addEventListener('pointerdown', e => { if (e.button > 0) return; d = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId }; });
      const seek = n => { const s = this.steps[clamp(n, 0, this.steps.length - 1)]; try { this.video.currentTime = s.t + .02; } catch (x) {} this.userPaused = false; this.play(); };
      vp.addEventListener('pointerup', e => {
        if (!d || e.pointerId !== d.id) return;
        const dx = e.clientX - d.x, dy = e.clientY - d.y, dt = performance.now() - d.t; d = null;
        if (Math.abs(dx) > 44 && Math.abs(dx) > Math.abs(dy)) { seek(this.now + (dx < 0 ? 1 : -1)); return; }
        if (dt < 450 && Math.abs(dx) < 8 && Math.abs(dy) < 8) { if (this.video.paused) { this.userPaused = false; this.play(); } else { this.userPaused = true; this.video.pause(); } }
      });
      vp.addEventListener('pointercancel', () => { d = null; });
    }
    resize() { this.measure(); this.paint(); }
  }

  return { clamp, span, soft, lerp, R, fit, mix, css, keyState, bracket, onScreen, Notes, addIcons, playIcons, wakeArt, makeWindow, addLayer, themeSwitch, Deck, Reel, el, REDUCE };
})();
