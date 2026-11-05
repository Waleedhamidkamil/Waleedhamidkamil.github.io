/* Wheel scrolling that glides, so every scroll-driven scene moves evenly.
   Touch, keyboard and the scrollbar stay native. It does nothing with reduced motion. */
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches || !matchMedia('(hover: hover) and (pointer: fine)').matches) return;
  const TAU = 120;
  let target = 0, pos = 0, running = false, last = 0;
  const limit = () => document.documentElement.scrollHeight - innerHeight;
  function frame(now) {
    if (!running) return;
    const dt = Math.min(48, Math.max(0, now - last)); last = now;
    pos += (target - pos) * (1 - Math.exp(-dt / TAU));
    if (Math.abs(target - pos) < .4) { pos = target; running = false; }
    scrollTo({ top: pos, behavior: 'instant' });
    if (running) requestAnimationFrame(frame);
  }
  // A box with its own scrollbar keeps the wheel until it reaches its end
  function scrollsInside(e) {
    let el = e.target;
    if (!el || el.nodeType !== 1) return false;
    const doc = el.ownerDocument, view = doc.defaultView;
    for (; el && el !== doc.body && el !== doc.documentElement; el = el.parentElement) {
      if (el.scrollHeight <= el.clientHeight + 1) continue;
      const o = view.getComputedStyle(el).overflowY;
      if (o !== 'auto' && o !== 'scroll') continue;
      if (e.deltaY < 0 ? el.scrollTop > 0 : el.scrollTop + el.clientHeight < el.scrollHeight - 1) return true;
    }
    return false;
  }
  function onWheel(e) {
    if (e.ctrlKey || e.metaKey || e.defaultPrevented || !e.deltaY) return;
    if (document.querySelector('dialog[open]') || scrollsInside(e)) return;
    e.preventDefault();
    const unit = e.deltaMode === 1 ? 40 : e.deltaMode === 2 ? innerHeight : 1;
    if (!running) pos = target = scrollY;
    target = Math.max(0, Math.min(limit(), target + e.deltaY * unit));
    if (!running) { running = true; last = performance.now(); requestAnimationFrame(frame); }
  }
  const stop = () => { running = false; };
  addEventListener('wheel', onWheel, { passive: false });
  addEventListener('pointerdown', stop, true);
  addEventListener('keydown', stop, true);
  // A wheel turned over a live window arrives in that window, not here
  const hook = f => { try { f.contentWindow.addEventListener('wheel', onWheel, { passive: false }); } catch (e) {} };
  document.addEventListener('load', e => { if (e.target.tagName === 'IFRAME') hook(e.target); }, true);
  document.querySelectorAll('iframe').forEach(hook);
})();
