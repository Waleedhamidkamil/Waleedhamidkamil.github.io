/* The ID card on phones and small windows: the same card as images on plain layers, with its own small physics.
   There is no WebGL here, so a phone's graphics chip can't draw depth or shader errors on it, and the page saves 1.3 MB of script and art.
   The face turns with a plain perspective transform, one side at a time. Same controls as the 3D card: drag, tap to flip, keyboard, pause, reduced motion. */
window.PhoneCard = (() => {
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const PATH = '../assets/phone/';
  const WHATSAPP = 'https://wa.me/9647804482013';
  const RATIO = 2.25 / 1.6;
  const SLOT = 81 / 1406;
  const NODES = 7;
  const GRAVITY = 2400;
  const STEP = 1 / 120;

  function mount(wrap, o) {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const I = window.PHONE_ICONS || {};
    const foil = I.foil || { l: .63, t: .318, w: .156, h: .11 }, qr = I.qr || { l: .05, t: .23, w: .9, h: .31 };

    const box = document.createElement('div');
    box.className = 'bc';
    box.innerHTML = `<i class="bc-shadow"></i><div class="bc-strap"></div>
      <div class="bc-body">
        <div class="bc-tilt">
          <img class="bc-edge" src="${PATH}card-shape.webp" alt="" draggable="false">
          <img class="bc-front" fetchpriority="high" decoding="async" src="${PATH}card-front.webp" alt="" draggable="false">
          <div class="bc-foil" style="left:${foil.l * 100}%;top:${foil.t * 100}%;width:${foil.w * 100}%;height:${foil.h * 100}%"><i></i></div>
          <div class="bc-back"><img fetchpriority="low" decoding="async" src="${PATH}card-back.webp" alt="" draggable="false"><a class="bc-wa" href="${WHATSAPP}" target="_blank" rel="noopener" aria-label="Chat on WhatsApp" tabindex="-1" style="left:${qr.l * 100}%;top:${qr.t * 100}%;width:${qr.w * 100}%;height:${qr.h * 100}%"></a></div>
          <div class="bc-sheen"><i></i></div>
        </div>
        <svg class="bc-hook" viewBox="0 0 60 96" aria-hidden="true"><defs><linearGradient id="bcMetal" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stop-color="#7f858f"/><stop offset=".34" stop-color="#f3f5f8"/><stop offset=".62" stop-color="#bfc4cc"/><stop offset="1" stop-color="#777c85"/></linearGradient></defs>
          <rect x="3" y="0" width="54" height="24" rx="5" fill="url(#bcMetal)"/><rect x="3" y="20" width="54" height="1.4" fill="rgba(0,0,0,.26)"/>
          <circle cx="30" cy="30" r="6.5" fill="none" stroke="url(#bcMetal)" stroke-width="3"/>
          <rect x="21.2" y="35" width="17.6" height="52" rx="8.8" fill="none" stroke="url(#bcMetal)" stroke-width="3.4"/>
          <rect x="36" y="50" width="5.6" height="15" rx="2.2" fill="url(#bcMetal)"/></svg>
      </div>`;
    wrap.appendChild(box);
    const $ = s => box.querySelector(s);
    const strapBox = $('.bc-strap'), body = $('.bc-body'), tilt = $('.bc-tilt'), front = $('.bc-front'), back = $('.bc-back'), sheen = $('.bc-sheen i'), foilLight = $('.bc-foil i'), shadow = $('.bc-shadow'), edge = $('.bc-edge'), link = $('.bc-wa'), hook = $('.bc-hook');
    const segs = Array.from({ length: NODES }, () => { const s = document.createElement('i'); strapBox.appendChild(s); return s; });

    // The world: a chain of points from above the screen to the clamp, and the card turning about the clamp
    const nodes = Array.from({ length: NODES + 1 }, () => ({ x: 0, y: 0, px: 0, py: 0 }));
    let view = { w: 1, h: 1 }, spot = null, cardW = 1, cardH = 1, strapW = 1, segLen = 1, arm = 1, hookH = 1, slotDrop = 1;
    let th = 0, om = 0, yaw = 0, yv = 0, turn = 0, lift = 0, ax = 0, ayBase = -40;
    let time = 0, acc = 0, last = 0, raf = 0, flipTime = 0, nextFlip = 0, frontHold = true, backHold = false, spinning = false;
    let grab = null, press = null, active = true, paused = !!window.__motionPaused, started = false, alive = true;
    let sx = 0, lastVx = 0, showingBack = false, calm = 0;
    let backDecoded = false, pendingFlip = false;

    function configure() {
      view = { w: Math.max(1, wrap.clientWidth), h: Math.max(1, wrap.clientHeight) };
      spot = o.frame(view.w, view.h);
      if (!spot) return;
      cardH = spot.cardHeight; cardW = cardH / RATIO;
      strapW = Math.max(16, cardW * .135);
      hookH = cardH * .135;
      slotDrop = hookH * (87 / 96);
      // Where the clamp's top must hang so that the slot sits on the hook and the card's top edge lands on cardTop
      const hangY = spot.cardTop + cardH * SLOT - slotDrop;
      ax = spot.anchorX;
      ayBase = -Math.max(30, cardH * .1);
      segLen = Math.max(6, (hangY - ayBase) / NODES);
      arm = slotDrop - cardH * SLOT + cardH / 2;
      const w = Math.round(cardW), h = Math.round(cardH);
      Object.assign(tilt.style, { width: w + 'px', height: h + 'px', left: -w / 2 + 'px', top: -h / 2 + 'px' });
      Object.assign(hook.style, { width: strapW * 1.16 + 'px', height: hookH + 'px', left: -strapW * .58 + 'px', top: -arm + 'px' });
      Object.assign(shadow.style, { width: w * 1.18 + 'px', height: h * 1.08 + 'px', marginLeft: -w * .59 + 'px', marginTop: -h * .54 + 'px' });
      const tile = strapW * (739 / 132);
      segs.forEach((s, i) => {
        s.style.width = strapW + 'px'; s.style.height = segLen + 1.5 + 'px';
        s.style.backgroundSize = `100% ${tile}px`;
        s.style.backgroundPosition = `0 ${-(i * segLen) % tile}px`;
      });
    }
    function place(intro) {
      const anchor = { x: ax, y: ayBase };
      nodes.forEach((n, i) => {
        if (intro) { n.x = anchor.x + i * segLen * .96; n.y = anchor.y + i * 5; }
        else { n.x = anchor.x; n.y = anchor.y + i * segLen; }
        n.px = n.x; n.py = n.y;
      });
      th = intro ? -1.25 : 0; om = 0; yaw = turn; yv = 0; sx = nodes[NODES].x; lastVx = 0; calm = 0;
    }
    function solve(h) {
      const G = GRAVITY, breeze = reduced ? 0 : (Math.sin(time * .53) * .7 + Math.sin(time * 1.31 + 1.7) * .3) * 22;
      const ay = ayBase - lift * view.h * 1.5;
      nodes[0].x = ax; nodes[0].y = ay; nodes[0].px = ax; nodes[0].py = ay;
      for (let i = 1; i <= NODES; i++) {
        const n = nodes[i], vx = (n.x - n.px) * .985, vy = (n.y - n.py) * .985;
        n.px = n.x; n.py = n.y;
        n.x += vx + breeze * h * h;
        n.y += vy + G * h * h;
      }
      const end = nodes[NODES];
      if (grab) {
        // The clamp is drawn towards where the card is held, softly: the card leads and the strap follows
        const k = 1 - Math.exp(-h * 22);
        end.x += (grab.x - end.x) * k;
        if (grab.free) end.y += (grab.y - grab.dy - end.y) * k;
      }
      for (let it = 0; it < 7; it++) {
        for (let i = 0; i < NODES; i++) {
          const a = nodes[i], b = nodes[i + 1];
          let dx = b.x - a.x, dy = b.y - a.y;
          const d = Math.hypot(dx, dy) || 1e-4, diff = (d - segLen) / d;
          // A strap only pulls; it doesn't push
          if (diff <= 0) continue;
          const wa = i === 0 ? 0 : 1, wb = i + 1 === NODES ? .22 : 1, w = wa + wb;
          dx *= diff; dy *= diff;
          a.x += dx * wa / w; a.y += dy * wa / w;
          b.x -= dx * wb / w; b.y -= dy * wb / w;
        }
      }
      // The card swings about the clamp. A sideways jerk of the clamp sets it going.
      const vx = (end.x - sx) / h, accel = clamp((vx - lastVx) / h, -9000, 9000);
      sx = end.x; lastVx = vx;
      const l = arm;
      let wanted = 0;
      if (grab) wanted = clamp((grab.x0 - grab.x) / cardW * .55, -.5, .5);
      const force = -(G / l) * Math.sin(th - wanted) - (accel / l) * Math.cos(th) * .4 - 2.1 * om + breeze * .009;
      om += force * h; th += om * h;
      // The turn: a sprung twist, like the strap unwinding
      const k = 30, c = 4.2;
      yv += (k * (turn - yaw) - c * yv) * h;
      yaw += yv * h;
      time += h;
    }
    function draw() {
      const end = nodes[NODES];
      for (let i = 0; i < NODES; i++) {
        const a = nodes[i], b = nodes[i + 1], ang = Math.atan2(b.x - a.x, b.y - a.y), len = Math.hypot(b.x - a.x, b.y - a.y) / segLen;
        segs[i].style.transform = `translate3d(${(a.x - strapW / 2).toFixed(2)}px,${a.y.toFixed(2)}px,0) rotate(${(-ang).toFixed(4)}rad) scaleY(${len.toFixed(3)})`;
      }
      const cx = end.x + Math.sin(-th) * arm, cy = end.y + Math.cos(th) * arm;
      body.style.transform = `translate3d(${end.x.toFixed(2)}px,${end.y.toFixed(2)}px,0) rotate(${th.toFixed(4)}rad) translate3d(0,${arm.toFixed(2)}px,0)`;
      // A gentle lean at rest, so the card never looks pasted on
      const lean = reduced ? 0 : Math.sin(time * .71) * .075 + Math.sin(time * .29 + 1) * .05;
      const a = yaw + lean, cos = Math.cos(a), sin = Math.sin(a), isBack = cos < 0;
      tilt.style.transform = `perspective(${(cardH * 2.8).toFixed(0)}px) rotateY(${a.toFixed(4)}rad) rotateX(${(clamp(om * .012, -.05, .05)).toFixed(4)}rad)`;
      edge.style.transform = `translate3d(${(sin * cardW * .017).toFixed(2)}px,0,0)`;
      if (isBack !== showingBack) {
        showingBack = isBack;
        front.style.visibility = isBack ? 'hidden' : ''; back.style.visibility = isBack ? 'visible' : 'hidden';
        foilLight.parentNode.style.visibility = isBack ? 'hidden' : '';
        link.tabIndex = isBack ? 0 : -1;
      }
      // Light slides across as the card turns; the foil runs through its colours faster
      const slide = (sin * 1.5 + th * 1.2) * .5;
      sheen.style.transform = `translate3d(${(clamp(slide, -1.2, 1.2) * cardW * .9).toFixed(1)}px,0,0)`;
      foilLight.style.transform = `translate3d(${((.5 + sin * 1.8 + th * 2.4) * -33.3).toFixed(2)}%,0,0)`;
      shadow.style.transform = `translate3d(${(cx + th * 18 + 8).toFixed(1)}px,${(cy + cardH * .06).toFixed(1)}px,0) scaleX(${(.3 + .7 * Math.abs(cos)).toFixed(3)})`;
    }
    function autoFlip(rawDt) {
      flipTime += rawDt;
      if (reduced || grab || o.autoFlip === false) return;
      const readable = Math.abs(yaw - turn) < Math.PI * .15;
      if (spinning && readable) {
        if (backHold) { backHold = false; nextFlip = flipTime + 8; }
        else if (flipTime >= nextFlip) { spinning = false; frontHold = true; flip(5.5); }
      } else if (!spinning && turn === 0 && readable) {
        if (frontHold) { frontHold = false; nextFlip = flipTime + 8 + Math.random() * 4; }
        else if (flipTime >= nextFlip) { flip(5.5); spinning = turn !== 0; backHold = spinning; }
      }
    }
    function flip(spin = 9) {
      if (turn === 0 && !backDecoded) return;
      const dir = turn > 0 ? -1 : 1;
      turn = turn === 0 ? Math.PI * dir : 0;
      yv += spin * dir;
      if (reduced || paused) { yaw = turn; yv = 0; draw(); return; }
      start();
    }
    function manualFlip() {
      spinning = false; frontHold = true; backHold = false;
      if (turn === 0 && !backDecoded) { pendingFlip = !pendingFlip; return; }
      pendingFlip = false;
      flip();
    }
    function tick(now) {
      raf = 0;
      if (!alive || !started || paused || !active || document.hidden) return;
      const raw = Math.max(0, (now - last) / 1000);
      last = now;
      autoFlip(raw);
      acc = Math.min(acc + Math.min(raw, 1 / 20), 1 / 15);
      while (acc >= STEP) { solve(STEP); acc -= STEP; }
      draw();
      raf = requestAnimationFrame(tick);
    }
    function start() {
      if (raf || !alive || !started || paused || !active || document.hidden || reduced) return;
      last = performance.now();
      raf = requestAnimationFrame(tick);
    }

    // Touch: a tap flips, a sideways drag swings the card, and a drag up or down is left to the page, so the card never traps the scroll
    tilt.addEventListener('pointerdown', e => {
      if (e.button > 0 || e.target === link) return;
      const end = nodes[NODES];
      grab = { id: e.pointerId, x: end.x, y: e.clientY, x0: end.x, dx: e.clientX - end.x, dy: e.clientY - end.y, free: e.pointerType !== 'touch' };
      press = { x: e.clientX, y: e.clientY, t: performance.now() };
      spinning = false; frontHold = true; backHold = false;
      try { tilt.setPointerCapture(e.pointerId); } catch (x) {}
      start();
    });
    tilt.addEventListener('pointermove', e => {
      if (!grab || e.pointerId !== grab.id) return;
      grab.x = e.clientX - grab.dx; grab.y = e.clientY;
      if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > 8) press = null;
    });
    const release = e => {
      if (!grab || e.pointerId !== grab.id) return;
      grab = null;
      if (press && e.type === 'pointerup' && performance.now() - press.t < 450) manualFlip();
      press = null;
      start();
    };
    tilt.addEventListener('pointerup', release);
    tilt.addEventListener('pointercancel', release);
    tilt.addEventListener('dragstart', e => e.preventDefault());
    link.addEventListener('click', e => { if (!showingBack) e.preventDefault(); });

    document.addEventListener('visibilitychange', () => { if (!document.hidden) start(); });
    configure();
    if (spot) place(false);
    back.style.visibility = 'hidden';
    if (spot) draw();
    box.style.visibility = 'hidden';
    box.hidden = true;

    const decode = i => i.decode ? i.decode().catch(() => {}) : Promise.resolve();
    // The front can enter as soon as it is painted. A slow hidden back never holds it up.
    const ready = decode(front);
    const backImage = $('.bc-back img');
    decode(backImage).then(() => {
      backDecoded = backImage.naturalWidth > 0;
      if (alive && backDecoded && pendingFlip) { pendingFlip = false; manualFlip(); }
    });
    return {
      ready,
      canvas: tilt,
      play(withIntro = true) {
        if (started || !spot) return;
        started = true;
        place(withIntro && !reduced);
        box.hidden = !active;
        box.style.visibility = active ? '' : 'hidden';
        draw();
        start();
      },
      setLift(v) { if (v !== lift) { lift = v; start(); } },
      setActive(v) { active = v; box.hidden = !v || !started; box.style.visibility = v && started ? '' : 'hidden'; if (v) start(); else if (raf) { cancelAnimationFrame(raf); raf = 0; grab = null; } },
      setPaused(v) { paused = v; if (paused && raf) { cancelAnimationFrame(raf); raf = 0; grab = null; } else if (!paused) start(); },
      flip: manualFlip,
      resize() { configure(); if (spot) { place(false); if (started) draw(); } },
      state: () => ({ x: nodes[NODES].x, y: nodes[NODES].y, twist: yaw, turn, grab: !!grab, ratio: 1, started, active, calm }),
      screenBox() {
        const end = nodes[NODES], cx = end.x + Math.sin(-th) * arm, cy = end.y + Math.cos(th) * arm;
        return { x: cx, y: cy, height: cardH };
      },
      dispose() { alive = false; cancelAnimationFrame(raf); box.remove(); }
    };
  }
  return { mount };
})();
