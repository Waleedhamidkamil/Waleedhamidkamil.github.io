/* Hangs the ID badge in the hero. Wide windows get the 3D card, loaded only there. Phones and small windows get proto/badge/phone-card.js.
   Additive only: if anything here fails, the hero simply has no badge. */
(() => {
  const pin = document.getElementById('pin'), lead = document.getElementById('lead'), head = document.getElementById('head');
  if (!pin || !lead) return;
  const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const NARROW = () => innerWidth < 1000 || innerHeight < 620;
  // Anything held in the hand gets the card made of plain images: it has the same kind of graphics chip as a phone
  const PLAIN = () => NARROW() || matchMedia('(pointer: coarse)').matches;
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const span = (v, a, b) => clamp((v - a) / (b - a), 0, 1);
  const soft = t => t * t * t * (t * (t * 6 - 15) + 10);
  const load = src => new Promise((ok, no) => { const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = no; document.head.appendChild(s); });

  const wrap = document.createElement('div');
  wrap.id = 'badgeWrap';
  wrap.innerHTML = '<p class="sr">ID card: Waleed Hamid Kamil. ERP specialist, SAP S/4HANA and SAP Ariba. Born 22 July 1996. Basra, Iraq. The back has public contact details and a QR code that opens WhatsApp at +9647804482013.</p><button type="button" id="badgeFlip">Flip the ID card</button>';
  pin.insertBefore(wrap, head);

  // The right edge of the text as it really wraps, not the width of its box
  function textRight(box) {
    let right = box.right;
    ['typed', 'todo'].forEach(id => {
      const el = document.getElementById(id);
      if (!el || !el.firstChild) return;
      const r = document.createRange();
      r.selectNodeContents(el);
      for (const c of r.getClientRects()) right = Math.max(right, c.right);
    });
    return right;
  }
  // Where the card hangs for this window. Null when there is no room for it.
  function place(W, H) {
    const hero = window.__hero, box = hero.nameBox();
    const nav = document.getElementById('nav').getBoundingClientRect();
    const ratio = 2.25 / 1.6;
    if (NARROW()) {
      const VH = hero.vh ? hero.vh() : H;
      if (VH > W * 1.05) {
        // Upright screen: big and centred, a little below the nav, with the name and text under it
        const top = nav.bottom + 12, avail = box.top - 14 - top;
        const cardHeight = Math.min(avail, W * .76 * ratio, VH * .58);
        if (cardHeight < 150) return null;
        return { cardHeight, anchorX: W / 2, cardTop: top + (avail - cardHeight) * .62, top: true };
      }
      // Sideways: beside the text
      const left = textRight(box) + 22, right = W - 18, zone = right - left;
      if (zone < 130) return null;
      const room = VH - nav.bottom - 18, cardHeight = Math.min(room, zone * .9 * ratio);
      if (cardHeight < 150) return null;
      return { cardHeight, left, anchorX: left + zone / 2, cardTop: nav.bottom + 10 + (room - cardHeight) * .5, top: true };
    }
    const left = textRight(box) + Math.max(32, W * .03), right = W - Math.max(24, W * .03), zone = right - left;
    if (zone >= 200) {
      const cardWidth = Math.min(zone * .82, 400, (H * .54) / ratio), cardHeight = cardWidth * ratio;
      return { cardHeight, left, anchorX: left + zone / 2, cardTop: clamp((H - cardHeight) * .6, nav.bottom + 70, H - cardHeight - 28) };
    }
    return null;
  }

  let spot = null, badge = null, mode = '', looping = false, sizedW = 0, sizedH = 0;
  const frostNav = () => document.body.classList.toggle('badge-top', !!spot && spot.top);
  const measure = () => {
    spot = place(pin.clientWidth, pin.clientHeight);
    const proof = document.getElementById('proof');
    if (REDUCE && proof && spot && spot.left) proof.style.maxWidth = (spot.left - proof.getBoundingClientRect().left - 16) + 'px';
    return spot;
  };
  const frame = (w, h) => measure() || { cardHeight: h * .4, anchorX: w * .8, cardTop: h * .2 };
  function afterMount() {
    window.__heroBadge = badge;
    badge.setPaused(!!window.__motionPaused);
    wrap.hidden = !spot;
    frostNav();
    badge.ready.then(() => {
      // The card swings in while the headline types. Coming back to a page already scrolled, it just hangs there.
      const atTop = window.__hero.prog() < .02 && !REDUCE && !window.__motionPaused;
      setTimeout(() => badge && badge.play(atTop), atTop ? 500 : 0);
      if (!REDUCE && !looping) { looping = true; follow(); }
    });
  }
  async function mountDesktop() {
    mode = 'desktop';
    wrap.classList.remove('dom');
    if (!window.HeroBadge) {
      try { await load('../badge/badge-art.js'); await load('../badge/badge.js'); } catch (e) { return; }
    }
    if (!window.HeroBadge || !window.BADGE_ART || mode !== 'desktop') return;
    const A = window.BADGE_ART;
    badge = window.HeroBadge.mount(wrap, { front: A.front, back: A.back, strap: A.strap, foilMask: A.mask, frame });
    window.__heroBadge = badge;
    if (!badge) { staticCard(); return; }
    afterMount();
  }
  function mountPhone() {
    mode = 'phone';
    wrap.classList.add('dom');
    if (!window.PhoneCard) return;
    badge = window.PhoneCard.mount(wrap, { frame });
    afterMount();
  }
  function mountWhenSized() {
    const hero = window.__hero;
    if (!hero || !hero.nameBox || !hero.win().w) { setTimeout(mountWhenSized, 60); return; }
    measure();
    sizedW = innerWidth; sizedH = innerHeight;
    PLAIN() ? mountPhone() : mountDesktop();
  }
  // Rotating a tablet can cross from one kind of card to the other
  addEventListener('resize', () => {
    // The address bar sliding away on a phone changes nothing here
    if (NARROW() && innerWidth === sizedW && Math.abs(innerHeight - sizedH) < 170) return;
    sizedW = innerWidth; sizedH = innerHeight;
    const want = PLAIN() ? 'phone' : 'desktop';
    if (want !== mode && mode) {
      if (badge && badge.dispose) badge.dispose();
      badge = null;
      wrap.querySelectorAll('.still-part').forEach(e => e.remove());
      wrap.classList.remove('still');
      setTimeout(mountWhenSized, 160);
      return;
    }
    setTimeout(() => {
      measure();
      wrap.hidden = !spot;
      frostNav();
      if (badge && badge.resize) badge.resize();
    }, 160);
  });
  document.getElementById('badgeFlip').addEventListener('click', () => badge && badge.flip());
  addEventListener('motionchange', () => badge && badge.setPaused(!!window.__motionPaused));
  // Scrolling on pulls the card up and out of the scene; the physics do the rest
  let on = true;
  function follow() {
    const p = window.__hero.prog();
    if (badge) {
      badge.setLift(soft(span(p, .0015, .05)));
      const want = p < .085 && !!spot;
      if (want !== on) { on = want; badge.setActive(on); }
    }
    requestAnimationFrame(follow);
  }
  // No WebGL: the same card, hanging still
  function staticCard() {
    const flipBtn = document.getElementById('badgeFlip');
    if (flipBtn) flipBtn.hidden = true;
    if (!spot) return;
    const A = window.BADGE_ART;
    wrap.classList.add('still');
    const w = spot.cardHeight * 1.6 / 2.25;
    const strap = document.createElement('i');
    strap.className = 'still-part';
    strap.style.cssText = `left:${spot.anchorX - w * .07}px;width:${w * .14}px;height:${spot.cardTop + 6}px`;
    const img = document.createElement('img');
    img.className = 'still-part';
    img.alt = '';
    img.src = A.front;
    img.style.cssText = `left:${spot.anchorX - w / 2}px;top:${spot.cardTop}px;width:${w}px;height:${spot.cardHeight}px`;
    wrap.append(strap, img);
  }
  mountWhenSized();
})();
