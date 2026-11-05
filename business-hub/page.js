(() => {
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
const WIDE = () => innerWidth >= 1100;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));

/* Typed section titles: one amber cursor that moves from title to title */
const cursor = document.createElement('i'); cursor.id = 'cursor'; cursor.setAttribute('aria-hidden', 'true');
const typedQueue = new Set();
function typeTitle(h) {
  if (h.dataset.done) return;
  h.dataset.done = '1';
  const text = h.dataset.text;
  if (REDUCE || window.__motionPaused) { h.textContent = text; h.appendChild(cursor); return; }
  let n = 0; h.textContent = ''; const t = document.createTextNode(''); h.append(t, cursor);
  cursor.classList.add('busy');
  const iv = setInterval(() => { if (window.__motionPaused || document.hidden) return; n++; t.nodeValue = text.slice(0, n); if (n >= text.length) { clearInterval(iv); cursor.classList.remove('busy'); } }, 32);
}
const titleIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { titleIO.unobserve(e.target); typeTitle(e.target); } }), { threshold: .9 });
$$('h2[data-type]').forEach(h => { h.dataset.text = h.textContent; h.setAttribute('aria-label', h.textContent); titleIO.observe(h); });

/* Hand-drawn lines */
function rng(seed) { let x = seed * 9301 + 49297; return () => (x = (x * 9301 + 49297) % 233280) / 233280 - .5; }
function sketch(points, seed, amp) { const r = rng(seed); return points.map(([x, y], i) => { const e = i === 0 || i === points.length - 1 ? 0 : amp; return `${i ? 'L' : 'M'}${(x + r() * e).toFixed(1)} ${(y + r() * e).toFixed(1)}`; }).join(''); }
function seg(a, b, n) { const out = []; for (let i = 0; i <= n; i++) out.push([a[0] + (b[0] - a[0]) * i / n, a[1] + (b[1] - a[1]) * i / n]); return out; }
function bez(p0, p1, p2, p3, n) { const out = []; for (let i = 0; i <= n; i++) { const t = i / n, u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t; out.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]); } return out; }
function bracket(r, mode, seed) {
  const h = 7, p = 3; let pts, mid, dir;
  if (mode === 'left') { const x = r.x - p; pts = [...seg([x + h, r.y], [x, r.y], 2), ...seg([x, r.y], [x, r.y + r.h], 8), ...seg([x, r.y + r.h], [x + h, r.y + r.h], 2)]; mid = [x, r.y + r.h / 2]; dir = [-1, 0]; }
  else if (mode === 'right') { const x = r.x + r.w + p; pts = [...seg([x - h, r.y], [x, r.y], 2), ...seg([x, r.y], [x, r.y + r.h], 8), ...seg([x, r.y + r.h], [x - h, r.y + r.h], 2)]; mid = [x, r.y + r.h / 2]; dir = [1, 0]; }
  else if (mode === 'top') { const y = r.y - p; pts = [...seg([r.x, y + h], [r.x, y], 2), ...seg([r.x, y], [r.x + r.w, y], 8), ...seg([r.x + r.w, y], [r.x + r.w, y + h], 2)]; mid = [r.x + r.w / 2, y]; dir = [0, -1]; }
  else { const y = r.y + r.h + p; pts = [...seg([r.x, y - h], [r.x, y], 2), ...seg([r.x, y], [r.x + r.w, y], 8), ...seg([r.x + r.w, y], [r.x + r.w, y - h], 2)]; mid = [r.x + r.w / 2, y]; dir = [0, 1]; }
  return { d: sketch(pts, seed, 1.5), mid, dir };
}
/* Draw one annotated window: labels in side columns, each joined to its target */
function drawAnnot(box, W, x, y, w, h, notes, target) {
  const svg = $('.lines', box), labels = $('.labels', box);
  svg.innerHTML = ''; labels.innerHTML = '';
  const gap = 24, nw = Math.min(218, x - gap - 2);
  labels.style.setProperty('--nw', nw + 'px');
  const groups = { L: notes.filter(n => n.side === 'L'), R: notes.filter(n => n.side === 'R') };
  const items = [];
  const makeLabel = n => {
    const el = document.createElement(n.href ? 'a' : 'div');
    if (n.href) { el.href = n.href; el.addEventListener('click', () => jump(n.href)); }
    el.innerHTML = `<b>${n.title}</b>${n.text}`;
    labels.appendChild(el);
    return el;
  };
  const stroke = (d, i) => { const p = document.createElementNS('http://www.w3.org/2000/svg', 'path'); p.setAttribute('d', d); p.setAttribute('pathLength', '1'); p.dataset.i = i; p.style.strokeDasharray = '1'; p.style.strokeDashoffset = box.dataset.drawn || REDUCE ? '0' : '1'; svg.appendChild(p); };
  const hover = (el, i, n) => {
    const on = v => $$(`path[data-i="${i}"]`, svg).forEach(p => p.classList.toggle('hot', v));
    el.addEventListener('pointerenter', () => { on(true); n.onHover && n.onHover(true); }); el.addEventListener('pointerleave', () => { on(false); n.onHover && n.onHover(false); });
  };
  // Rows above and below the window
  const rowW = Math.min(232, w * .3);
  ['T', 'B'].forEach(side => {
    const row = notes.filter(n => n.side === side).map(n => ({ n, r: target(n) })).filter(o => o.r).sort((a, c) => (a.r.x + a.r.w / 2) - (c.r.x + c.r.w / 2));
    let right = -1e9;
    row.forEach(o => {
      const cx = o.r.x + o.r.w / 2;
      o.left = Math.max(right + 14, Math.min(W - rowW, Math.max(0, cx - rowW / 2)));
      right = o.left + rowW;
    });
    // If the row ran off the right edge, slide it back
    const over = row.length ? row[row.length - 1].left + rowW - W : 0;
    if (over > 0) { let limit = W - rowW; for (let k = row.length - 1; k >= 0; k--) { row[k].left = Math.min(row[k].left, limit); limit = row[k].left - rowW - 14; } }
    row.forEach(o => {
      const i = notes.indexOf(o.n), el = makeLabel(o.n);
      el.className = 'note ' + (side === 'T' ? 'above' : 'below');
      el.style.width = rowW + 'px'; el.style.left = o.left + 'px';
      const lh = el.offsetHeight, ly = side === 'T' ? y - 22 - lh : y + h + 30;
      el.style.top = ly + 'px';
      const sx = o.left + rowW / 2, sy = side === 'T' ? ly + lh + 3 : ly - 3;
      const b = bracket(o.r, side === 'T' ? 'top' : 'bottom', i + 3), end = b.mid, k = Math.max(16, Math.abs(end[1] - sy) * .5);
      stroke(sketch(bez([sx, sy], [sx, sy + (side === 'T' ? k : -k)], [end[0], end[1] + (side === 'T' ? -k : k)], end, 14), i + 11, .8), i);
      stroke(b.d, i);
      hover(el, i, o.n);
    });
  });
  // Columns at the sides
  notes.forEach((n, i) => {
    if (n.side !== 'L' && n.side !== 'R') return;
    const r = target(n); if (!r) return;
    const col = groups[n.side], k = col.indexOf(n);
    const span = Math.max(0, h - 96), ly = y + (col.length === 1 ? span * .42 : k * span / (col.length - 1));
    const el = makeLabel(n);
    el.className = 'note ' + (n.side === 'L' ? 'left' : 'right');
    el.style.left = (n.side === 'L' ? x - gap - nw : x + w + gap) + 'px';
    el.style.top = ly + 'px';
    const lh = el.offsetHeight;
    const start = [n.side === 'L' ? x - gap + 8 : x + w + gap - 8, ly + Math.min(14, lh / 2)];
    const b = bracket(r, n.mode, i + 3), end = b.mid;
    const k1 = Math.max(46, Math.abs(end[0] - start[0]) * .42);
    const c1 = [start[0] + (n.side === 'L' ? k1 : -k1), start[1]], k2 = Math.max(26, (Math.abs(end[1] - start[1]) + Math.abs(end[0] - start[0])) * .3 + (n.lift || 0));
    const c2 = [end[0] + b.dir[0] * k2, end[1] + b.dir[1] * k2];
    stroke(sketch(bez(start, c1, c2, end, 22), i + 11, 1.1), i);
    stroke(b.d, i);
    hover(el, i, n);
  });
  const nb = Math.max(y + h, ...$$('.note', labels).map(e => e.offsetTop + e.offsetHeight));
  box.style.height = nb + 22 + 'px';
  return items;
}
function reveal(box) {
  if (box.dataset.drawn || REDUCE) return;
  box.dataset.drawn = '1';
  if (window.__motionPaused) {
    $$('.lines path', box).forEach(p => { p.style.strokeDashoffset = '0'; });
    return;
  }
  $$('.lines path', box).forEach((p, i) => p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: 640, delay: 80 + i * 46, easing: 'cubic-bezier(.65,0,.3,1)', fill: 'forwards' }));
}
const lineIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { lineIO.unobserve(e.target); reveal(e.target); } }), { threshold: .3 });

/* Section 1: the live dashboard, where a click jumps to the section that shows it */
const DASH_NOTES = [
  { sel: '.dash-search-wrap', side: 'L', mode: 'left', title: 'Search', text: 'Documents, clients and numbers from one box.' },
  { sel: '.dash-row.cols-4', side: 'L', mode: 'left', title: 'Create new', text: 'A separate editor for each of the four documents.', href: '#documents' },
  { sel: '#dashFocus', side: 'L', mode: 'left', title: 'Needs attention', text: 'Bids to decide, missing costs, unsent documents, orders to invoice and unpaid invoices.', href: '#order' },
  { sel: '#dashThemeToggle', side: 'R', mode: 'top', lift: 30, title: 'Light or dark', text: 'Click it in the window. This is the real animation.' },
  { sel: '#dashControlBtn', side: 'R', mode: 'top', lift: 12, title: 'Control Room', text: 'People, roles, permissions and the activity log.', href: '#server' },
  { sel: '#dashInsightsCard', side: 'R', mode: 'right', title: 'Insights', text: 'Bid outcomes and document totals, with full reports behind them.', href: '#insights' },
  { sel: '#dashOpenAutofill', side: 'R', mode: 'bottom', title: 'Master Data', text: 'One record for every item and client.', href: '#master' },
];
const INJECT = `<style>.bh-link{cursor:pointer!important}.bh-link:hover{outline:3px solid #E8890C;outline-offset:2px;border-radius:12px}</style><script>
(()=>{const MAP=[['.dash-card[data-doc=quote]','#doc-quote'],['.dash-card[data-doc=po]','#doc-po'],['.dash-card[data-doc=dn]','#doc-dn'],['.dash-card[data-doc=inv]','#doc-inv'],
['.dash-na-card.is-decide','#order'],['.dash-na-card.is-unsubmitted','#order'],['.dash-na-card.is-deliver','#order'],['.dash-na-card.is-unpaid','#attachments'],['.dash-na-card.is-uncosted','#insights'],['#dashFocusViewAll','#order'],
['#dashOpenAutofill','#master'],['#dashInsightsCard','#insights'],['#dashOpenInsights','#insights'],['#dashControlBtn','#server'],['#dashRecycleBtn','#server'],['#dashLogoutBtn','#server'],['#dashSettingsBtn','#server'],['#dashPersonalBtn','#server']];
MAP.forEach(([s])=>document.querySelectorAll(s).forEach(e=>e.classList.add('bh-link')));
window.addEventListener('click',e=>{if(e.target.closest('#dashThemeToggle'))return;for(const [s,h] of MAP){if(e.target.closest(s)){window.parent.postMessage({bhJump:h},'*');break}}},true);
})();<\/script>`;
const dashBox = $('#dashAnnot'), dashFrame = $('#dashFrame');
let dashLoaded = false, dashWin = null;
function loadDash() {
  if (dashLoaded || !WIDE()) return;
  dashLoaded = true;
  const s = document.createElement('script');
  s.src = '../hero/dash-live.js';
  s.onload = () => { dashFrame.srcdoc = window.DASH_LIVE.replace('</body>', INJECT + '</body>'); };
  document.head.appendChild(s);
}
function layoutDash() {
  if (!WIDE()) return;
  const W = dashBox.clientWidth, side = Math.min(238, W * .17), w = W - side * 2, barH = 34, h = w / 1.6 + barH;
  const win = $('.win', dashBox);
  win.style.left = side + 'px'; win.style.top = '46px'; win.style.width = w + 'px'; win.style.height = h + 'px';
  const sc = w / 1600, vp = $('.vp', dashBox); vp.style.height = (w / 1.6) + 'px';
  dashFrame.style.transform = `scale(${sc})`;
  const sample = $('.sample', dashBox); sample.style.left = side + 'px'; sample.style.top = (46 + h + 8) + 'px';
  const f = dashFrame.contentWindow;
  const target = n => { if (!f || !f.dashTargets) return null; const t = f.dashTargets(n.sel); if (!t) return null; return { x: side + t.x * sc, y: 46 + barH + t.y * sc, w: t.w * sc, h: t.h * sc }; };
  if (f && f.dashTargets) {
    drawAnnot(dashBox, W, side, 46, w, h, DASH_NOTES, target);
    lineIO.observe(dashBox);
  } else dashBox.style.height = (46 + h + 40) + 'px';
}
addEventListener('message', e => {
  const d = e.data || {};
  if (d.dashReady) { layoutDash(); setTimeout(layoutDash, 600); }
  if (d.bhJump) jump(d.bhJump);
  if (d.insightsReady) { insH = d.insightsReady; layoutIns(); }
});
const backBtn = $('#back');
function jump(hash) {
  const t = $(hash); if (!t) return;
  backBtn.hidden = false;
  t.scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth', block: 'start' });
  try { history.replaceState(null, '', hash); } catch (e) {}
}
backBtn.addEventListener('click', e => { e.preventDefault(); backBtn.hidden = true; $('#dashboard').scrollIntoView({ behavior: REDUCE ? 'auto' : 'smooth' }); });

/* Section 2: the four editors, one picture each */
const R = (x, y, w, h) => ({ x, y, w, h });
const DOCS = [
  { id: 'doc-quote', img: 'quote', title: 'Quotation', notes: [
    { r: R(170, 68, 490, 46), side: 'T', title: 'Four types', text: 'Materials, equipment, manpower and service, each with its own columns and terms.' },
    { r: R(1008, 168, 170, 58), side: 'T', title: 'Payment details', text: 'The account comes from the client record, and can be shown or hidden on the print.' },
    { r: R(39, 168, 150, 34), side: 'L', mode: 'left', title: 'Automatic numbers', text: 'Each number carries the type and the client, like QUT-MT-CEDAR-345.' },
    { r: R(1228, 270, 362, 110), side: 'R', mode: 'right', title: 'Document records', text: 'Every saved document by month, type and client, next to the editor.' },
    { r: R(752, 884, 207, 112), side: 'B', title: 'Pictures on the line', text: 'Paste, drop or search a picture for each item. It prints on the quotation.' },
    { r: R(958, 884, 186, 112), side: 'B', title: 'Private cost and profit', text: 'Cost and profit sit beside each line and never reach the printed page.' },
  ] },
  { id: 'doc-po', img: 'po', title: 'Purchase order', notes: [
    { r: R(250, 12, 237, 38), side: 'T', title: 'Make DN, Make invoice', text: 'One click starts the next document. Arabic items come back in English from Master Data.' },
    { r: R(573, 12, 105, 38), side: 'T', title: 'Workflow', text: "Shows the order's delivery notes and invoices together." },
    { r: R(118, 240, 122, 640), side: 'L', mode: 'left', title: 'Pictures', text: 'Paste, drop or double-click to add a picture to a line.' },
    { r: R(1228, 288, 358, 84), side: 'R', mode: 'right', title: 'Status on every order', text: 'Open, delivered, invoiced and paid update as the linked documents are saved.' },
    { r: R(640, 800, 540, 90), side: 'B', title: 'Written in Arabic', text: 'Right to left, on its own print design. Long lists run over as many pages as they need.' },
  ] },
  { id: 'doc-dn', img: 'dn', title: 'Delivery note', notes: [
    { r: R(348, 12, 129, 38), side: 'T', title: 'Make invoice', text: 'One line for the whole delivery note, or every item copied across.' },
    { r: R(563, 12, 123, 38), side: 'T', title: 'Signed copy', text: 'The copy the client signed attaches here.' },
    { r: R(951, 12, 104, 38), side: 'T', title: 'Prices on or off', text: 'The same note can print with prices or without them.' },
    { r: R(25, 240, 470, 300), side: 'L', mode: 'left', title: 'Filled from the order', text: 'Items, units and prices arrive from the purchase order and Master Data.' },
    { r: R(1228, 444, 358, 96), side: 'R', mode: 'right', title: 'Signature status', text: 'Each delivery note shows whether the client has signed it yet.' },
    { r: R(24, 648, 1160, 58), side: 'B', title: 'Cost, sell, profit, margin', text: 'Totals for the whole document, kept off the printed page.' },
  ] },
  { id: 'doc-inv', img: 'inv', title: 'Invoice', notes: [
    { r: R(428, 12, 127, 38), side: 'T', title: 'Attachments', text: 'Supporting files and the client-signed copy, in one window.', href: '#attachments' },
    { r: R(858, 174, 140, 34), side: 'T', title: 'Payment account', text: 'Set per client, with billing in dollars or dinars.' },
    { r: R(118, 724, 160, 30), side: 'L', mode: 'left', title: 'Withholding tax', text: 'A line on the invoice that can be switched on or off.' },
    { r: R(1412, 520, 172, 30), side: 'R', mode: 'right', title: 'Paid and submitted', text: 'Two separate steps, marked straight from the list.' },
  ] },
];
const docsEl = $('#docs');
DOCS.forEach(d => {
  const a = document.createElement('article'); a.className = 'doc'; a.id = d.id;
  a.innerHTML = `<h3>${d.title}</h3><div class="annot"><svg class="lines" aria-hidden="true"></svg><div class="labels"></div><div class="pic" data-zoom-src="../assets/${d.img}.webp"><img src="../assets/${d.img}.webp" alt="${d.title} editor with sample data" loading="lazy"></div><div class="sample">Sample data</div></div>
  <img class="flat-pic" src="../assets/${d.img}.webp" width="2200" height="1375" alt="${d.title} editor with sample data" loading="lazy" data-zoom><ul class="notes-list">${d.notes.map(n => `<li><b>${n.title}</b>${n.text}</li>`).join('')}</ul>`;
  docsEl.appendChild(a); d.box = $('.annot', a); lineIO.observe(d.box);
});
function layoutDocs() {
  if (!WIDE()) return;
  DOCS.forEach(d => {
    const W = d.box.clientWidth, side = Math.min(232, W * .17), w = W - side * 2, h = w / 1.6, pic = $('.pic', d.box), sc = w / 1600;
    const top = d.notes.some(n => n.side === 'T') ? 112 : 14;
    pic.style.left = side + 'px'; pic.style.top = top + 'px'; pic.style.width = w + 'px'; pic.style.height = h + 'px';
    const sample = $('.sample', d.box); sample.style.left = side + 'px'; sample.style.top = (top + h + 8) + 'px';
    drawAnnot(d.box, W, side, top, w, h, d.notes, n => ({ x: side + n.r.x * sc, y: top + n.r.y * sc, w: n.r.w * sc, h: n.r.h * sc }));
  });
}

/* Section 3: order to paid, with the steps in step with the video */
const STEPS = [
  ['Purchase order', 0, 'The order is written in Arabic.'],
  ['Delivery note', 4.15, 'Make DN fills an English delivery note from Master Data.'],
  ['Signed copy', 8.77, "The copy the client signed attaches to the delivery note."],
  ['Invoice', 15.88, 'Make invoice copies the items across, ready to save.'],
  ['Linked', 26.36, 'Workflow shows the order, delivery note and invoice together.'],
  ['Paid', 31.23, 'Marking it paid asks for the signed invoice, and the record shows both.'],
];
const video = $('#orderVideo');
if (WIDE()) video.preload = 'metadata';
const stepsEl = $('#steps'), stepText = $('#stepText'), playBtn = $('#orderPlay');
STEPS.forEach(([name, t], i) => {
  const li = document.createElement('li');
  li.innerHTML = `<button type="button">${name}<i></i></button>`;
  li.firstChild.addEventListener('click', () => { video.currentTime = t + .02; video.play().catch(() => {}); userPaused = false; paintPlay(); });
  stepsEl.appendChild(li);
});
const stepBtns = $$('#steps button');
let userPaused = false, stepNow = -1;
function paintStep() {
  const t = video.currentTime, dur = video.duration || 40;
  let i = 0; for (let k = 0; k < STEPS.length; k++) if (t >= STEPS[k][1]) i = k;
  if (i !== stepNow) { stepNow = i; stepBtns.forEach((b, k) => { if (k === i) b.setAttribute('aria-current', 'step'); else { b.removeAttribute('aria-current'); b.style.setProperty('--p', 0); } }); stepText.textContent = STEPS[i][2]; }
  const end = i + 1 < STEPS.length ? STEPS[i + 1][1] : dur;
  stepBtns[i].style.setProperty('--p', clamp((t - STEPS[i][1]) / (end - STEPS[i][1])).toFixed(3));
}
video.addEventListener('timeupdate', paintStep); video.addEventListener('seeked', paintStep);
video.addEventListener('ended', () => { setTimeout(() => { if (!userPaused && !window.__motionPaused && !document.hidden && video.dataset.visible === 'true') { video.currentTime = 0; video.play().catch(() => {}); } }, 1800); });
function paintPlay() { const p = video.paused; playBtn.setAttribute('aria-label', p ? 'Play' : 'Pause'); playBtn.firstChild.innerHTML = p ? '<path d="M7 4l13 8-13 8z"/>' : '<path d="M8 5v14M16 5v14"/>'; }
video.addEventListener('play', paintPlay); video.addEventListener('pause', paintPlay);
playBtn.addEventListener('click', () => { if (video.paused) { userPaused = false; video.play().catch(() => {}); } else { userPaused = true; video.pause(); } });
paintStep(); paintPlay();

/* Videos play only while they are on screen, and never with reduced motion */
const vidIO = new IntersectionObserver(es => es.forEach(e => {
  const v = e.target;
  v.dataset.visible = String(e.isIntersecting);
  if (e.isIntersecting && !REDUCE && !window.__motionPaused && !document.hidden && !(v === video && userPaused)) { v.preload = 'auto'; v.play().catch(() => {}); } else if (!e.isIntersecting || window.__motionPaused) v.pause();
}), { threshold: .45 });
[video, ...$$('video[data-autoplay]')].forEach(v => vidIO.observe(v));
addEventListener('motionchange', () => {
  [video, ...$$('video[data-autoplay]')].forEach(v => {
    if (!window.__motionPaused && !REDUCE && !document.hidden && v.dataset.visible === 'true' && !(v === video && userPaused)) v.play().catch(() => {});
    else v.pause();
  });
});

/* Section 7: the real Insights page, panned by the scroll */
const insTrack = $('#insTrack'), insFrame = $('#insFrame'), insBox = $('#insFrameBox'), insBar = $('#insBar');
let insLoaded = false, insH = 3195, insScale = 1, insSpan = 0, insNow = 0;
function loadIns() {
  if (insLoaded || !WIDE()) return;
  insLoaded = true;
  const s = document.createElement('script');
  s.src = 'insights-live.js';
  s.onload = () => { insFrame.srcdoc = window.INSIGHTS_LIVE; };
  document.head.appendChild(s);
}
function layoutIns() {
  if (!WIDE()) return;
  const bw = insBox.clientWidth, bh = insBox.clientHeight;
  insScale = bw / 1600; insFrame.style.height = insH + 'px';
  insSpan = Math.max(0, insH * insScale - bh);
  insTrack.style.height = (innerHeight + insSpan * 1.05) + 'px';
}
function paintIns() {
  if (!WIDE() || !insLoaded) return;
  const r = insTrack.getBoundingClientRect(), range = r.height - innerHeight;
  const p = range > 0 ? clamp(-r.top / range) : 0;
  insNow += (p - insNow) * .16;
  insFrame.style.transform = `translateY(${-insNow * insSpan}px) scale(${insScale})`;
  insBar.style.transform = `scaleX(${insNow.toFixed(4)})`;
  const f = insFrame.contentWindow;
  if (f && f.revealTo && r.top < innerHeight * .7) f.revealTo((insNow * insSpan + insBox.clientHeight * .92) / insScale);
}

/* Section 8: roles, from the app's real permission table */
const ROLE_NAMES = { admin: 'Admin', manager: 'Manager', accountant: 'Accountant', procurement: 'Procurement', storekeeper: 'Storekeeper', viewer: 'Viewer' };
const rolesEl = $('#roles'), matrixEl = $('#matrix'), roleImg = $('#roleImg');
const SHOW = new Set(['create_documents', 'delete_documents', 'purge_recycle_bin', 'sign_documents', 'area_quotations', 'area_purchase_orders', 'area_delivery_notes', 'area_invoices', 'area_clients', 'area_master_data', 'area_insights', 'edit_master_data', 'change_settings', 'manage_people', 'view_activity']);
matrixEl.innerHTML = window.PERMS.groups.map(([g, rows]) => { const shown = rows.filter(r => SHOW.has(r[0])); return shown.length ? `<div><h4>${g}</h4><ul>${shown.map(r => `<li data-k="${r[0]}" title="${r[2].replace(/"/g, '&quot;')}"><svg viewBox="0 0 24 24" aria-hidden="true"></svg><span>${r[1].replace(/ recycled documents/, '')}</span></li>`).join('')}</ul></div>` : ''; }).join('');
Object.keys(ROLE_NAMES).forEach(k => {
  const b = document.createElement('button'); b.type = 'button'; b.setAttribute('role', 'tab'); b.textContent = ROLE_NAMES[k]; b.dataset.role = k;
  b.addEventListener('click', () => setRole(k)); rolesEl.appendChild(b);
});
function setRole(k) {
  $$('#roles button').forEach(b => b.setAttribute('aria-selected', b.dataset.role === k ? 'true' : 'false'));
  const perms = window.PERMS.roles[k];
  $$('#matrix li').forEach(li => { const on = !!perms[li.dataset.k]; li.classList.toggle('yes', on); $('svg', li).innerHTML = on ? '<path d="M5 12.5l4.5 4.5L19 7.5"/>' : '<path d="M7 12h10"/>'; const lab = $('span', li).textContent; li.setAttribute('aria-label', lab + (on ? ': allowed' : ': not allowed')); });
  roleImg.src = `../assets/role-${k}.webp`; roleImg.alt = `Dashboard as a ${ROLE_NAMES[k]} sees it, sample data`;
}
setRole('admin');
if (WIDE()) Object.keys(ROLE_NAMES).forEach(k => { const i = new Image(); i.src = `../assets/role-${k}.webp`; });

/* Lightbox */
const box = $('#lightbox'), boxImg = $('img', box);
function zoom(src, alt) { boxImg.src = src; boxImg.alt = alt || ''; box.showModal(); }
window.__phoneZoom = zoom;
document.addEventListener('click', e => {
  const t = e.target.closest('[data-zoom],[data-zoom-src]'); if (!t) return;
  const img = t.tagName === 'IMG' ? t : $('img', t); zoom(t.dataset.zoomSrc || img.src, img.alt);
});
$('button', box).addEventListener('click', () => box.close());
box.addEventListener('click', e => { if (e.target === box) box.close(); });

/* Nav state */
const links = $$('#nav a[href^="#"]');
const navEl = $('#nav');
const navIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { links.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + e.target.id)); if (e.target.id === 'dashboard') backBtn.hidden = true;
  // Where the nav doesn't fit, it keeps the current section in view
  const on = links.find(a => a.classList.contains('on'));
  if (on && navEl.scrollWidth > navEl.clientWidth) navEl.scrollTo({ left: on.offsetLeft - (navEl.clientWidth - on.offsetWidth) / 2, behavior: REDUCE ? 'auto' : 'smooth' });
} }), { rootMargin: '-45% 0px -50% 0px' });
$$('main section').forEach(s => navIO.observe(s));

/* Load the two live pages when they get close, not with the page */
const nearIO = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) { nearIO.unobserve(e.target); e.target === dashBox ? loadDash() : loadIns(); } }), { rootMargin: '900px 0px' });
if (WIDE()) { nearIO.observe(dashBox); nearIO.observe(insTrack); }

function layoutAll() { layoutDash(); layoutDocs(); layoutIns(); }
let rt = 0; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(layoutAll, 140); });
document.fonts && document.fonts.ready.then(layoutAll);
layoutAll();
(function loop() { paintIns(); requestAnimationFrame(loop); })();
window.__bh = { DOCS, STEPS, dashReady: () => !!(dashFrame.contentWindow && dashFrame.contentWindow.dashTargets), insReady: () => !!(insFrame.contentWindow && insFrame.contentWindow.revealTo), notes: () => $$('#dashAnnot .note').length, step: () => stepNow, jump };
})();
