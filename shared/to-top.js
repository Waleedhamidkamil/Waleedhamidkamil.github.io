/* Back to top: appears once you have scrolled away. Drawn like the site's sketched lines, and its ring shows how far down the page you are.
   A click rewinds the page. Any wheel, touch or key stops the rewind. With reduced motion it jumps. */
(() => {
  const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const soft = t => t * t * t * (t * (t * 6 - 15) + 10);
  const rng = s => { let x = s * 9301 + 49297; return () => (x = (x * 9301 + 49297) % 233280) / 233280 - .5; };
  const sketch = (pts, seed, amp) => { const r = rng(seed); return pts.map(([x, y], i) => `${i ? 'L' : 'M'}${(x + r() * amp).toFixed(2)} ${(y + r() * amp).toFixed(2)}`).join(''); };
  const circle = [];
  for (let i = 0; i <= 56; i++) { const a = -Math.PI / 2 + i / 56 * Math.PI * 2; circle.push([24 + 20.5 * Math.cos(a), 24 + 20.5 * Math.sin(a)]); }
  const ringPath = sketch(circle, 5, .55);
  const css = document.createElement('style');
  css.textContent = `
#toTop{position:fixed;z-index:40;right:max(16px,min(2vw,28px),env(safe-area-inset-right));bottom:max(16px,min(2.6vh,28px),env(safe-area-inset-bottom));width:52px;height:52px;padding:0;border:0;border-radius:50%;background:rgba(16,21,30,.74);color:#EDF1F6;cursor:pointer;-webkit-backdrop-filter:blur(16px) saturate(170%);backdrop-filter:blur(16px) saturate(170%);box-shadow:inset 0 1px 0 rgba(255,255,255,.22),0 10px 30px rgba(0,0,0,.4);
 visibility:hidden;opacity:0;transform:translateY(10px) scale(.92);transition:opacity 180ms ease,transform 180ms ease,visibility 0s linear 180ms}
#toTop.in{visibility:visible;opacity:1;transform:none;transition:opacity 320ms ease,transform 460ms cubic-bezier(.16,1,.3,1),visibility 0s}
#toTop:active{transform:scale(.94);transition-duration:100ms}
#toTop svg{position:absolute;inset:0;width:100%;height:100%;overflow:visible;fill:none;stroke-linecap:round;stroke-linejoin:round}
#toTop .track{stroke:rgba(237,241,246,.18);stroke-width:1.1}
#toTop .ring{stroke:var(--ring,#F2B14C);stroke-width:1.9;stroke-dasharray:1;transition:stroke 300ms ease}
#toTop .arrow{stroke:currentColor;stroke-width:2;transition:transform 160ms cubic-bezier(.16,1,.3,1)}
#toTop .arrow path{stroke-dasharray:1;stroke-dashoffset:1;transition:stroke-dashoffset 0s linear 200ms}
#toTop.in .arrow path{stroke-dashoffset:0;transition:stroke-dashoffset 420ms ease-out 140ms}
#toTop.in .arrow path+path{transition-delay:380ms}
#toTop .tip{position:absolute;right:calc(100% + 10px);top:50%;margin-top:-16px;height:32px;padding:0 12px;display:flex;align-items:center;border-radius:999px;background:rgba(16,21,30,.86);box-shadow:inset 0 0 0 1px rgba(237,241,246,.16);font:500 14px/1 "Archivo",Arial,sans-serif;white-space:nowrap;opacity:0;transform:translateX(6px);pointer-events:none;transition:opacity 150ms ease,transform 200ms cubic-bezier(.16,1,.3,1)}
#toTop:focus-visible .tip{opacity:1;transform:none}
@media (hover:hover) and (pointer:fine){#toTop:hover .tip{opacity:1;transform:none}#toTop:hover .arrow{transform:translateY(-2px)}#toTop:hover .track{stroke:rgba(237,241,246,.34)}}
@media (prefers-reduced-motion:reduce){#toTop,#toTop.in,#toTop .arrow path,#toTop.in .arrow path,#toTop .tip{transition:none}}
@media (prefers-reduced-transparency:reduce){#toTop{background:#10151E;-webkit-backdrop-filter:none;backdrop-filter:none}}
@media print{#toTop{display:none}}`;
  document.head.appendChild(css);
  const btn = document.createElement('button');
  btn.id = 'toTop'; btn.type = 'button'; btn.setAttribute('aria-label', 'Back to top');
  btn.innerHTML = `<svg viewBox="0 0 48 48" aria-hidden="true"><path class="track" d="${ringPath}"/><path class="ring" d="${ringPath}" pathLength="1"/><g class="arrow"><path pathLength="1" d="${sketch([[24, 33.5], [24.2, 28], [23.9, 22], [24, 15.5]], 3, .22)}"/><path pathLength="1" d="${sketch([[17.2, 22], [20.6, 18.6], [24, 15.2], [27.4, 18.7], [30.8, 22]], 8, .2)}"/></g></svg><span class="tip" aria-hidden="true">Back to top</span>`;
  document.body.appendChild(btn);
  const ring = btn.querySelector('.ring');

  let shown = false, queued = false, raf = 0, lastY = scrollY, goingUp = false;
  // On a touch screen it would sit over what is being read, so it comes when you scroll back, and at the end of the page
  const touch = matchMedia('(pointer: coarse)').matches || innerWidth < 760;
  function update() {
    queued = false;
    const y = scrollY, max = document.documentElement.scrollHeight - innerHeight;
    ring.style.strokeDashoffset = (1 - Math.min(1, max > 0 ? y / max : 0)).toFixed(4);
    if (Math.abs(y - lastY) > 6) { goingUp = y < lastY; lastY = y; }
    // A page can hold the button back while something else needs that corner (window.__toTopWait)
    const on = y > innerHeight * 1.2 && !(window.__toTopWait && window.__toTopWait()) && (!touch || goingUp || y > max - 60);
    if (on !== shown) { shown = on; btn.classList.toggle('in', on); }
  }
  const later = window.__toTopUpdate = () => { if (!queued) { queued = true; requestAnimationFrame(update); } };
  addEventListener('scroll', later, { passive: true });
  addEventListener('resize', later);
  update();

  const stop = () => { if (raf) { cancelAnimationFrame(raf); raf = 0; } };
  ['wheel', 'touchstart', 'keydown'].forEach(ev => addEventListener(ev, stop, { passive: true, capture: true }));
  addEventListener('pointerdown', e => { if (!btn.contains(e.target)) stop(); }, { passive: true, capture: true });
  btn.addEventListener('click', e => {
    const from = scrollY;
    // By keyboard, focus goes back to the top with the page
    if (e.detail === 0) { const first = document.querySelector('nav a'); if (first) first.focus({ preventScroll: true }); }
    if (from <= 0) return;
    if (REDUCE) { scrollTo({ top: 0, behavior: 'instant' }); return; }
    stop();
    const ms = Math.min(2000, 650 + from * .06), t0 = performance.now();
    const step = now => {
      const k = Math.min(1, Math.max(0, (now - t0) / ms));
      scrollTo({ top: from * (1 - soft(k)), behavior: 'instant' });
      raf = k < 1 ? requestAnimationFrame(step) : 0;
    };
    raf = requestAnimationFrame(step);
  });
})();
