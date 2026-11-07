/* Portfolio alerts. The notification topic and credentials stay on the server. */
(() => {
  'use strict';
  if (window.top !== window) return;
  const script = document.currentScript;
  const endpoint = script?.dataset.endpoint;
  if (!endpoint) return;
  const OWNER = 'wh-alerts-owner', VISIT = 'wh-alerts-visit';
  const url = new URL(location.href);
  let owner, visit;
  try {
    const choice = url.searchParams.get('alerts');
    if (choice === 'off' || choice === 'on') {
      if (choice === 'off') localStorage.setItem(OWNER,'1');
      else localStorage.removeItem(OWNER);
      url.searchParams.delete('alerts');
      history.replaceState(history.state,'',url);
    }
    owner = localStorage.getItem(OWNER);
    visit = JSON.parse(localStorage.getItem(VISIT) || 'null');
  } catch { /* Storage can be disabled; the server still limits alerts. */ }
  if (owner || navigator.globalPrivacyControl === true) return;
  let sent = false, timer;
  const source = document.referrer;
  function send() {
    if (sent || document.hidden) return;
    sent = true;
    const now = Date.now();
    try {visit = JSON.parse(localStorage.getItem(VISIT) || 'null');} catch {}
    const current = visit && typeof visit.id === 'string' && Number.isFinite(visit.last) && now - visit.last < 30 * 60000;
    const session = current ? visit.id : crypto.randomUUID();
    try {localStorage.setItem(VISIT,JSON.stringify({id:session,last:now}));} catch {}
    // An existing session already alerted on this page or the other public page.
    if (current) return;
    fetch(endpoint, {
      method:'POST', credentials:'omit', referrerPolicy:'no-referrer', keepalive:true,
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({session,page:location.pathname,source})
    }).catch(() => {});
  }
  function schedule() {
    clearTimeout(timer);
    if (!document.hidden && !sent) timer = setTimeout(send,2000);
  }
  document.addEventListener('visibilitychange',schedule);
  schedule();
})();
