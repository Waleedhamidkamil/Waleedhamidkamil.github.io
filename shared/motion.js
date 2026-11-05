/* One control for automatic motion on either page. Scrolling and explicit media controls stay available. */
(() => {
  const nav = document.getElementById('nav');
  if (!nav) return;
  let paused = false;
  try { paused = sessionStorage.getItem('portfolio-motion-paused') === 'true'; } catch (_) {}
  const button = document.createElement('a');
  button.id = 'motionToggle'; button.href = '#motion'; button.setAttribute('role', 'button');
  nav.appendChild(button);
  const visibleMedia = new Set();
  const heldAnimations = new Set();
  const io = new IntersectionObserver(entries => entries.forEach(entry => {
    if (entry.isIntersecting) visibleMedia.add(entry.target); else visibleMedia.delete(entry.target);
  }), { threshold: .45 });
  const watched = new WeakSet();
  const cursorIO = new IntersectionObserver(entries => entries.forEach(entry => {
    entry.target.style.animationPlayState = entry.isIntersecting ? '' : 'paused';
  }));
  function media() {
    document.querySelectorAll('video').forEach(video => {
      if (watched.has(video)) return;
      watched.add(video); io.observe(video);
    });
    document.querySelectorAll('#cursor,#rotCur,#cCursor,.cur').forEach(cursor => {
      if (!watched.has(cursor)) { watched.add(cursor); cursorIO.observe(cursor); }
    });
  }
  new MutationObserver(media).observe(document.body, { childList: true, subtree: true });
  media();
  function frames() {
    document.querySelectorAll('iframe').forEach(frame => {
      try {
        const w = frame.contentWindow, doc = frame.contentDocument;
        if (!doc) return;
        doc.documentElement.classList.toggle('motion-paused', paused);
        if (w.lottie) paused ? w.lottie.freeze() : w.lottie.unfreeze();
        if (paused) doc.getAnimations().forEach(animation => animation.pause());
        else doc.getAnimations().forEach(animation => animation.play());
      } catch (_) {}
    });
  }
  function apply() {
    window.__motionPaused = paused;
    document.documentElement.classList.toggle('motion-paused', paused);
    button.setAttribute('aria-pressed', String(paused));
    button.setAttribute('aria-label', paused ? 'Resume automatic motion' : 'Pause automatic motion');
    button.title = paused ? 'Resume automatic motion' : 'Pause automatic motion';
    button.innerHTML = paused
      ? '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4l14 8-14 8z"/></svg>'
      : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h4v16H6zM14 4h4v16h-4z"/></svg>';
    if (paused) {
      document.getAnimations().forEach(animation => {
        if (animation.playState === 'running') { heldAnimations.add(animation); animation.pause(); }
      });
      document.querySelectorAll('video').forEach(video => {
        video.dataset.resumeMotion = String(!video.paused);
        video.pause();
      });
    } else {
      heldAnimations.forEach(animation => { if (animation.playState === 'paused') animation.play(); });
      heldAnimations.clear();
      visibleMedia.forEach(video => {
        if (video.dataset.resumeMotion === 'true') video.play().catch(() => {});
      });
    }
    frames();
    dispatchEvent(new CustomEvent('motionchange', { detail: { paused } }));
    try { sessionStorage.setItem('portfolio-motion-paused', String(paused)); } catch (_) {}
  }
  button.addEventListener('click', event => { event.preventDefault(); paused = !paused; apply(); });
  button.addEventListener('keydown', event => {
    if (event.key === ' ') { event.preventDefault(); button.click(); }
  });
  document.addEventListener('load', event => { if (event.target.tagName === 'IFRAME') frames(); }, true);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) document.querySelectorAll('video').forEach(video => {
      video.dataset.resumeVisibility = String(!video.paused); video.pause();
    });
    else if (!paused) visibleMedia.forEach(video => {
      if (video.dataset.resumeVisibility === 'true') video.play().catch(() => {});
    });
  });
  apply();
})();
