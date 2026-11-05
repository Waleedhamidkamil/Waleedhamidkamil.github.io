/* Direct visits use the hero's own D. Only the covered handoff changes scroll position,
   so the tour and course pile never race past. User input always returns control. */
(() => {
  const root = document.documentElement;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const clamp = v => Math.max(0, Math.min(1, v));
  const soft = t => t * t * (3 - 2 * t);
  const css = document.createElement('style');
  css.textContent = `
#pageCover{position:fixed;inset:0;z-index:19;background:#080B11;opacity:0;visibility:hidden;pointer-events:none}
html.navigating{scroll-behavior:auto}
.navigating #pageCover{visibility:visible;will-change:opacity}
.navigating #toTop{opacity:0;visibility:hidden;pointer-events:none}
@media print{#pageCover{display:none}}`;
  document.head.append(css);
  const cover = document.createElement('div');
  cover.id = 'pageCover'; cover.setAttribute('aria-hidden', 'true');
  document.body.append(cover);
  let task = null;
  const jump = y => scrollTo({ top: y, behavior: 'instant' });
  const stopWheel = () => window.__stopScroll && window.__stopScroll();
  const position = el => el ? scrollY + el.getBoundingClientRect().top : 0;
  function focus(el) {
    if (!el) return;
    if (!el.matches('a,button,[tabindex]')) el.tabIndex = -1;
    el.focus({ preventScroll: true });
  }
  function finish(q) {
    if (task !== q) return;
    if (q.driving) q.hero.travel(null);
    task = null;
    cover.style.opacity = 0;
    root.classList.remove('navigating');
    window.__toTopUpdate && window.__toTopUpdate();
  }
  function cancel(align = true) {
    const q = task;
    if (!q) return;
    cancelAnimationFrame(q.raf);
    q.resolve && q.resolve(false);
    // If interrupted inside the D, native scrolling continues at that exact point.
    if (q.driving && align) {
      const stage = document.getElementById('stage'), pin = document.getElementById('pin');
      jump(stage.offsetTop + q.hero.prog() * pin.clientHeight * window.__heroScreens());
    }
    finish(q);
  }
  function tween(q, ms, draw) {
    return new Promise(resolve => {
      const start = performance.now();
      q.resolve = resolve;
      const frame = now => {
        if (task !== q) return resolve(false);
        const t = clamp((now - start) / ms);
        draw(t);
        if (t < 1) q.raf = requestAnimationFrame(frame);
        else { q.resolve = null; resolve(true); }
      };
      draw(0);
      q.raf = requestAnimationFrame(frame);
    });
  }
  // Two frames let the hero, tour and intersections settle behind the opaque cover.
  const settle = q => tween(q, 34, () => {});
  function historyFor(el) {
    const hash = el ? '#' + el.id : '';
    if (location.hash !== hash) history.pushState(null, '', location.pathname + location.search + hash);
  }
  async function go(el, keyboard = false) {
    // Retarget a second link from the current D view, keeping the departure history intact.
    const progress = task && task.driving ? task.hero.prog() : null;
    cancel(false); stopWheel();
    const hero = window.__hero, home = !el;
    const focusTarget = home ? document.querySelector('nav a') : el.querySelector('h2') || el;
    // Keyboard navigation and reduced motion stay immediate, with focus at the destination.
    if (reduce.matches || keyboard) {
      historyFor(el); jump(position(el)); focus(focusTarget); return;
    }
    const q = task = { hero, driving: false, raf: 0, resolve: null };
    const canUseD = hero && hero.travel && hero.hole();
    const from = progress === null ? hero && hero.prog() : progress;
    const throughD = canUseD && (home || from < .42 && document.getElementById('pin').getBoundingClientRect().top >= -1);
    const duration = window.__isPhone && window.__isPhone() ? 850 : 1050;
    root.classList.add('navigating');
    if (throughD && !home) {
      q.driving = true;
      if (!await tween(q, duration, t => {
        hero.travel(from + (.42 - from) * t);
        cover.style.opacity = soft(clamp((t - .76) / .24));
      })) return;
    } else if (!await tween(q, 180, t => { cover.style.opacity = soft(t); })) return;
    // No intermediate scroll positions are painted.
    if (throughD && home) { q.driving = true; hero.travel(.42); }
    historyFor(el);
    jump(position(el));
    if (q.driving && !home) { hero.travel(null); q.driving = false; }
    if (!await settle(q)) return;
    if (throughD && home) {
      if (!await tween(q, duration, t => {
        hero.travel(.42 * (1 - t));
        cover.style.opacity = 1 - soft(clamp(t / .24));
      })) return;
    } else if (!await tween(q, 280, t => { cover.style.opacity = 1 - soft(t); })) return;
    finish(q);
  }
  document.querySelectorAll('#nav a[href="#certificates"],#nav a[href="#contact"]').forEach(a => {
    a.addEventListener('click', e => {
      if (e.button || e.ctrlKey || e.metaKey || e.shiftKey || e.altKey) return;
      const el = document.querySelector(a.getAttribute('href'));
      if (el) { e.preventDefault(); go(el, e.detail === 0); }
    });
  });
  const inputs = ['wheel', 'touchstart', 'touchmove', 'pointerdown', 'pointercancel', 'keydown'];
  function input(e) {
    // A new section link replaces the current journey in its click handler.
    if ((e.type === 'pointerdown' || e.type === 'touchstart') && e.target.closest?.('#nav a[href="#certificates"],#nav a[href="#contact"]')) return;
    cancel();
  }
  inputs.forEach(type => addEventListener(type, input, { passive: true, capture: true }));
  // Events inside a live dashboard do not bubble to its parent document.
  const hooked = new WeakSet();
  function hook(frame) {
    try {
      const doc = frame.contentDocument;
      if (!doc || hooked.has(doc)) return;
      hooked.add(doc);
      inputs.forEach(type => doc.defaultView.addEventListener(type, input, { passive: true, capture: true }));
    } catch (_) { /* External frames keep their own controls. */ }
  }
  document.querySelectorAll('iframe').forEach(hook);
  document.addEventListener('load', e => { if (e.target.tagName === 'IFRAME') hook(e.target); }, true);
  addEventListener('resize', () => cancel());
  addEventListener('pagehide', () => cancel());
  addEventListener('popstate', () => cancel(false));
  document.addEventListener('visibilitychange', () => { if (document.hidden) cancel(); });
  reduce.addEventListener('change', () => cancel());
  window.__pageNavigation = { toTop: keyboard => go(null, keyboard), cancel: () => cancel() };
})();
