/* The same dashboard picture on every screen. Load its interactive version only where it fits. */
(() => {
  window.DASH = '../assets/hero-dashboard.webp';
  // Browsers treat separate file:// images as opaque origins and refuse them as WebGL textures.
  // Keep the original embedded picture for double-click previews; hosted pages use the image file.
  window.__dashboardImageReady = location.protocol === 'file:' ? new Promise(resolve => {
    const image = document.createElement('script');
    image.src = '../hero/dashboard-data.js';
    image.onload = resolve;
    image.onerror = resolve;
    document.head.appendChild(image);
  }) : Promise.resolve();
  let pending = false;
  function load() {
    if (pending || window.DASH_LIVE || innerWidth < 1000 || innerHeight < 620 ||
        matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    pending = true;
    const script = document.createElement('script');
    script.src = '../hero/dash-live.js';
    script.onload = () => dispatchEvent(new Event('dashboardready'));
    script.onerror = () => { pending = false; script.remove(); };
    document.head.appendChild(script);
  }
  addEventListener('resize', load);
  load();
})();
