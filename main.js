/* The main page after the hero: the live dashboard moves aside, the tour runs in the same window, then certificates and contact. */
(() => {
const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
const REDUCE = matchMedia('(prefers-reduced-motion: reduce)').matches;
const FINE = !REDUCE && matchMedia('(hover: hover) and (pointer: fine)').matches;
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const span = (v, a, b) => clamp((v - a) / (b - a));
const smooth = t => t * t * (3 - 2 * t);
// Softer than smooth at both ends, so nothing starts or stops abruptly
const soft = t => t * t * t * (t * (t * 6 - 15) + 10);
const lerp = (a, b, t) => a + (b - a) * t;
// Plain cards only for reduced motion. Phones and small windows get their own tour (phone-tour.js).
const isFlat = () => REDUCE;
const isPm = () => !REDUCE && (innerWidth < 1000 || innerHeight < 620);
const isCourseFlat = () => REDUCE;
// With no mouse a tap opens a badge's details, and the link to verify it is in there
const TAPS = !FINE && !REDUCE;
window.__pmHero = 1.2;
const HUB = '../business-hub/index.html';
const HERO_SCREENS = 5.2;
// Where the chapters start on the pinned tour, and how wide a change between chapters is, in chapters
const START = .19, EDGE = .11;

const stage = $('#stage'), pin = $('#pin'), live = $('#live'), frame = $('#dashFrame'), head = $('#head'), join = $('#join'), jl = $('#jl'), jr = $('#jr');
const notes = $('#notes'), labels = $('#labels'), sample = $('#sample'), side = $('#tSide'), navEl = $('#tNav'), cardsEl = $('#tCards'), washEl = $('#tWash'), fade = $('#tFade');

const CHAPTERS = [
  { title: 'Dashboard', hue: 'var(--dash)', icon: '<rect x="4" y="4" width="7" height="7" rx="1.5" pathLength="1"/><rect x="13" y="4" width="7" height="7" rx="1.5" pathLength="1"/><rect x="4" y="13" width="7" height="7" rx="1.5" pathLength="1"/><rect x="13" y="13" width="7" height="7" rx="1.5" pathLength="1"/>',
    text: "One screen for the day's work: bids to decide, costs to enter, documents to submit, deliveries to invoice and payments to collect.", more: 'This is the real screen. Click any part to read how it works.' },
  { title: 'Linked documents', hue: 'var(--link)', video: 'linking', icon: '<path d="M10 14a4 4 0 0 0 6 .4l3-3a4 4 0 0 0-5.7-5.7l-1.2 1.2" pathLength="1"/><path d="M14 10a4 4 0 0 0-6-.4l-3 3a4 4 0 0 0 5.7 5.7l1.2-1.2" pathLength="1"/>',
    text: 'A purchase order written in Arabic becomes an English delivery note and invoice, filled from Master Data. Each document stays linked to the next.' },
  { title: 'Master Data', hue: 'var(--master)', video: 'master', still: 'master-items.webp', icon: '<ellipse cx="12" cy="6" rx="7.5" ry="3" pathLength="1"/><path d="M4.5 6v12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3V6" pathLength="1"/><path d="M4.5 12c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3" pathLength="1"/>',
    text: 'One record per item and per client, in English and Arabic. Documents fill from these records, and a review screen flags duplicates and bad entries.' },
  { title: 'Control Room', hue: 'var(--control)', image: 'control-room', zoom: 1.26, origin: '50% 74%', icon: '<path d="M5 21v-7M5 10V3M12 21v-9M12 8V3M19 21v-5M19 12V3M2 14h6M9 8h6M16 16h6" pathLength="1"/>',
    text: 'Each person works in a separate session with their own permissions. The server logs activity, refuses what a role may not do, and keeps permanent deletion behind its own permission.' },
];
const N = CHAPTERS.length;
// What each part of the dashboard opens on the Business Hub page
const LINKS = [['.dash-card[data-doc=quote]', '#doc-quote'], ['.dash-card[data-doc=po]', '#doc-po'], ['.dash-card[data-doc=dn]', '#doc-dn'], ['.dash-card[data-doc=inv]', '#doc-inv'],
  ['.dash-na-card.is-decide', '#order'], ['.dash-na-card.is-unsubmitted', '#order'], ['.dash-na-card.is-deliver', '#order'], ['.dash-na-card.is-unpaid', '#attachments'], ['.dash-na-card.is-uncosted', '#insights'], ['#dashFocusViewAll', '#order'],
  ['#dashOpenAutofill', '#master'], ['#dashInsightsCard', '#insights'], ['#dashOpenInsights', '#insights'], ['#dashControlBtn', '#server'], ['#dashRecycleBtn', '#server'], ['#dashLogoutBtn', '#server'], ['#dashSettingsBtn', '#server'], ['#dashPersonalBtn', '#server']];
const NOTE_LINKS = { 'Create new': '#documents', 'Needs attention': '#order', Server: '#server', 'Log out': '#server', Insights: '#insights', 'Master Data': '#master' };
const go = hash => { location.href = HUB + hash; };

function wireDashboard() {
  const f = frame.contentWindow, doc = frame.contentDocument;
  if (!f || !doc || !f.dashTargets || f.__bhWired) return;
  f.__bhWired = true;
  const st = doc.createElement('style');
  st.textContent = '.bh-link{cursor:pointer!important}.bh-link:hover{outline:3px solid #E8890C;outline-offset:2px;border-radius:12px}';
  doc.head.appendChild(st);
  LINKS.forEach(([s]) => doc.querySelectorAll(s).forEach(e => e.classList.add('bh-link')));
  f.addEventListener('click', e => {
    if (e.target.closest('#dashThemeToggle')) return;
    for (const [s, h] of LINKS) if (e.target.closest(s)) { go(h); break; }
  }, true);
}
new MutationObserver(() => {
  $$('.note', labels).forEach(el => {
    if (el.dataset.seen) return;
    el.dataset.seen = '1';
    const t = $('b', el) && $('b', el).textContent, h = NOTE_LINKS[t];
    if (!h) return;
    el.classList.add('linked');
    const link = document.createElement('a'); link.href = HUB + h;
    link.append(...el.childNodes); el.appendChild(link);
  });
}).observe(labels, { childList: true });

/* Build the chapters */
const dim = document.createElement('div'); dim.id = 'tDim'; live.appendChild(dim);
CHAPTERS.forEach((c, i) => {
  const li = document.createElement('li');
  li.style.setProperty('--h', c.hue);
  li.innerHTML = `<button type="button"><svg viewBox="0 0 24 24" aria-hidden="true">${c.icon}</svg><span>${c.title}</span><i class="bar"></i></button>`;
  li.firstChild.addEventListener('click', () => goChapter(i));
  navEl.appendChild(li);
  c.btn = li.firstChild;
  c.wash = document.createElement('i'); c.wash.style.setProperty('--h', c.hue); washEl.appendChild(c.wash);
  if (c.video || c.image) {
    const fig = document.createElement('figure');
    fig.className = 'tm'; fig.style.zIndex = i * 2;
    fig.innerHTML = c.video
      ? `<video muted playsinline loop preload="none" data-poster="../assets/${c.video}.jpg" aria-label="${c.title} screen recording, sample data"><source src="../assets/${c.video}.mp4" type="video/mp4"></video>`
      : `<img data-src="../assets/${c.image}.webp" alt="${c.title} screen, sample data" decoding="async">`;
    live.appendChild(fig);
    c.fig = fig; c.el = $('video', fig); c.img = $('img', fig); c.media = c.el || c.img;
    if (c.origin) c.media.style.transformOrigin = c.origin;
  }
  const card = document.createElement('div');
  card.className = 'tcard'; card.style.setProperty('--h', c.hue);
  card.innerHTML = `<h3><span class="t">${c.title}</span><i class="cur" aria-hidden="true"></i></h3><p>${c.text}${c.more ? ' ' + c.more : ''}</p>`;
  cardsEl.appendChild(card);
  c.card = card; c.titleEl = $('.t', card); c.vis = false; c.o = c.w = -1; c.typed = false;
});
const tag = document.createElement('div'); tag.id = 'tTag'; tag.setAttribute('aria-hidden', 'true'); tag.textContent = 'Sample data'; live.appendChild(tag);
const rows = [$('.what', side), ...$$('li', navEl), $('#tExplore')];

/* The tour as plain cards where it can't be pinned */
let flatBuilt = false;
function buildFlat() {
  if (flatBuilt) return;
  flatBuilt = true;
  const list = $('#tourFlatList');
  CHAPTERS.forEach(c => {
    // With reduced motion the hero already shows the dashboard as a picture
    if (REDUCE && !c.video && !c.image) return;
    const a = document.createElement('article');
    a.style.setProperty('--h', c.hue);
    const name = c.video || (c.image ? null : 'dashboard');
    // These videos may never play here, so the picture before them has to show the right screen
    a.innerHTML = `<h3>${c.title}</h3><p>${c.text}</p><figure>${name
      ? `<video muted playsinline loop preload="none"${REDUCE ? ' controls' : ''} poster="../assets/${c.still || name + '.jpg'}" aria-label="${c.title} screen recording, sample data"><source src="../assets/${name}.mp4" type="video/mp4"></video>`
      : `<img src="../assets/${c.image}.webp" alt="${c.title} screen, sample data" loading="lazy">`}</figure>`;
    list.appendChild(a);
  });
  if (REDUCE) return;
  const io = new IntersectionObserver(es => es.forEach(e => {
    e.target.dataset.visible = String(e.isIntersecting);
    e.isIntersecting && !window.__motionPaused && !document.hidden ? e.target.play().catch(() => {}) : e.target.pause();
  }), { threshold: .5 });
  $$('video', list).forEach(v => io.observe(v));
}

/* The pinned part */
let flat = false, pm = false, tourFor = null, laid = false, T = 0, lastT = -1, qNow = 0, current = -1, played = false, geo = null, notesHidden = false, sideDone = false, headDone = false;
// The tour tells the hero how much of each drawn note to keep: all of it until the tour starts, then they retract, last one first
window.__noteKeep = (n, count) => { const a = (count - 1 - n) * .0018; return 1 - soft(span(T, a, a + .018)); };
// The notes reach the bottom corner at the hero's end, so the back-to-top button waits until the tour has started
window.__toTopWait = () => pm ? scrollY < stage.offsetTop + stage.offsetHeight - pin.clientHeight * .55 : !flat && T < .03;
function layout() {
  flat = isFlat(); pm = isPm();
  document.documentElement.classList.toggle('flat', flat);
  $('#navHub').href = flat ? '#tourFlat' : '#business-hub';
  if (flat) { buildFlat(); backToHero(); geo = null; return; }
  if (pm) { backToHero(); geo = null; tourFor = null; return; }
  if (window.__phoneTour) window.__phoneTour.reset();
  const hero = window.__hero, win = hero && hero.win();
  if (!win || !win.w) return;
  const W = pin.clientWidth, H = pin.clientHeight, gut = clamp(W * .028, 16, 44), sideW = clamp(W * .21, 250, 320), top = 76, bottom = 36, bar = win.bar;
  const fw = Math.min(W - sideW - gut * 3, (H - top - bottom - bar) * 1.6), fh = fw / 1.6 + bar;
  // On very wide screens the column and the window stay together, centred
  const lead = Math.max(gut, (W - sideW - gut - fw) / 2);
  // Title: from the centre to the head of the side column
  const fs = parseFloat(getComputedStyle(join).fontSize), gapPx = fs * .3, titleW = jl.offsetWidth + gapPx + jr.offsetWidth, left = (W - titleW) / 2;
  const s = Math.min(30 / fs, sideW / titleW);
  join.style.transformOrigin = `${left - 16}px 0`;
  const titleH = join.offsetHeight * s;
  // The window is laid out once at its largest size. Everything after this is a transform, so nothing reflows while it moves.
  Object.assign(live.style, { left: 0, top: 0, width: fw + 'px', height: fh + 'px' });
  frame.style.transform = `scale(${fw / 1600})`;
  geo = { win, bar, s, k0: win.w / fw, dx: lead - left, dy: top - head.offsetTop, rect: { x: lead + sideW + gut, y: top + (H - top - bottom - fh) / 2, w: fw, h: fh } };
  Object.assign(side.style, { left: lead + 'px', top: (top + titleH + 8) + 'px', width: sideW + 'px', height: (H - top - titleH - 8 - bottom) + 'px' });
  CHAPTERS.forEach(c => {
    c.card.style.left = lead + 'px';
    c.card.style.width = (sideW + gut + 44) + 'px';
    c.card.style.bottom = (bottom + 62) + 'px';
    if (c.fig) c.fig.style.top = bar + 'px';
  });
  laid = true; lastT = -1; sideDone = headDone = false;
  paint();
}
// A window made too small for the tour goes back to the hero's own layout
function backToHero() {
  T = 0; lastT = -1; current = -1; played = false; notesHidden = false; sideDone = headDone = false;
  window.__noWin = window.__glRest = false; live.inert = false;
  if (window.__hero) window.__hero.redraw();
  CHAPTERS.forEach(c => {
    if (c.el) c.el.pause();
    if (c.fig) { c.fig.style.visibility = c.fig.style.transform = ''; c.vis = false; }
    c.card.classList.remove('on'); c.card.style.opacity = c.card.style.visibility = c.card.style.transform = ''; c.o = c.w = -1; c.typed = false;
    c.btn.removeAttribute('aria-current'); c.wash.style.opacity = 0;
  });
  fade.style.opacity = 0;
  rows.forEach(el => { el.style.opacity = el.style.transform = ''; });
  head.classList.remove('tourmode'); sample.classList.remove('tourmode'); labels.classList.remove('off'); live.classList.remove('tourwin', 'inapp');
  join.style.transform = live.style.transform = frame.style.pointerEvents = notes.style.visibility = labels.style.opacity = labels.style.visibility = side.style.visibility = tag.style.opacity = jl.style.willChange = jr.style.willChange = '';
}
function goChapter(i) {
  const H = pin.clientHeight, tour = stage.offsetHeight - H - HERO_SCREENS * H;
  const p = START + (1 - START) * (i + EDGE + .05) / N;
  scrollTo({ top: stage.offsetTop + HERO_SCREENS * H + tour * p, behavior: REDUCE ? 'auto' : 'smooth' });
}
// Entering the tour from navigation also puts keyboard focus in its chapter controls.
$('#navHub').addEventListener('click', e => {
  if (e.detail || flat || pm) return;
  e.preventDefault(); goChapter(0);
  let tries = 0;
  const focus = () => {
    if (getComputedStyle(side).visibility === 'visible' && +getComputedStyle(CHAPTERS[0].btn.parentElement).opacity > .95) {
      CHAPTERS[0].btn.focus({ preventScroll: true }); return;
    }
    if (++tries < 180) requestAnimationFrame(focus);
  };
  requestAnimationFrame(focus);
});
function typeTitle(c) {
  clearInterval(c.typer);
  if (window.__motionPaused || REDUCE) { c.titleEl.textContent = c.title; return; }
  let n = 0;
  c.card.classList.add('typing'); c.titleEl.textContent = '';
  c.typer = setInterval(() => {
    if (window.__motionPaused || document.hidden) return;
    n++; c.titleEl.textContent = c.title.slice(0, n);
    if (n >= c.title.length) { clearInterval(c.typer); c.card.classList.remove('typing'); }
  }, 34);
}
// Get a chapter's picture or first video frame ready ahead of time, so its arrival doesn't stall the scroll
function warm(c) {
  if (c.warmed) return;
  c.warmed = true;
  if (c.img) {
    c.img.src = c.img.dataset.src;
    if (c.img.decode) c.img.decode().catch(() => {});
    return;
  }
  if (!c.el) return;
  c.el.poster = c.el.dataset.poster;
  c.el.preload = 'auto';
  c.el.addEventListener('loadeddata', () => {
    if (window.__motionPaused || document.hidden) return;
    const p = c.el.play();
    p && p.then(() => { if (!c.vis) { c.el.pause(); try { c.el.currentTime = 0; } catch (x) {} } }).catch(() => {});
  }, { once: true });
  c.el.load();
}
function setFocus(i, q) {
  if (i !== current) {
    CHAPTERS.forEach((c, k) => {
      const on = k === i;
      if (on) c.btn.setAttribute('aria-current', 'step'); else { c.btn.removeAttribute('aria-current'); c.btn.style.setProperty('--p', 0); }
      c.card.classList.toggle('on', on);
    });
    live.classList.toggle('inapp', i > 0);
    current = i;
  }
  CHAPTERS[i].btn.style.setProperty('--p', (T < START ? 0 : clamp(q - i)).toFixed(3));
}
// What depends on the hero, not on the tour
function syncHero() {
  const hero = window.__hero, p = hero.prog(), ready = hero.ready();
  document.documentElement.classList.toggle('hero-away', p > .06);
  const takeover = T > 0 || (ready && p > .46);
  if (takeover !== !!window.__noWin) { window.__noWin = takeover; hero.redraw(); }
  window.__glRest = p >= .995;
  // The notes exist only at the end of the hero. Anywhere else they are out of sight and out of the tab order.
  const noNotes = T > .036 || p < .6;
  if (noNotes !== notesHidden) { notesHidden = noNotes; notes.style.visibility = labels.style.visibility = noNotes ? 'hidden' : ''; }
  live.classList.toggle('tourwin', T > 0 && !ready);
  // Out of sight means out of reach too, for the keyboard and screen readers
  const away = !live.classList.contains('on') && !live.classList.contains('tourwin');
  if (live.inert !== away) live.inert = away;
  if (p > .85) warm(CHAPTERS[1]);
  wireDashboard();
}
function paint() {
  const { win, rect, bar, s, k0, dx, dy } = geo;
  // 1. The notes retract into their brackets (the hero draws them, see __noteKeep)
  labels.classList.toggle('off', T > .012);
  if (T <= .06 || !headDone) {
    head.classList.toggle('tourmode', T > 0);
    const d = soft(span(T, 0, .05));
    head.style.setProperty('--d', 1 - d);
    head.style.setProperty('--dy', -d * 10 + 'px');
    sample.classList.toggle('tourmode', T > .012);
    tag.style.opacity = span(T, .005, .04);
    jl.style.willChange = jr.style.willChange = T > 0 ? 'auto' : '';
    headDone = T > .06;
    if (window.__toTopUpdate) window.__toTopUpdate();
  }
  // 2. The window moves aside and grows, and the title goes to the side column
  const m = soft(span(T, .02, .165)), k = lerp(k0, 1, m);
  live.style.transform = `translate3d(${lerp(win.x, rect.x, m).toFixed(2)}px,${lerp(win.y + bar * (1 - k0), rect.y, m).toFixed(2)}px,0) scale(${k.toFixed(5)})`;
  const t = soft(span(T, .015, .145));
  join.style.transform = t > 0 ? `translate(${(dx * t).toFixed(2)}px,${(dy * t).toFixed(2)}px) scale(${(1 + (s - 1) * t).toFixed(4)})` : '';
  if (T < .2 || !sideDone) {
    rows.forEach((el, i) => {
      const a = .085 + i * .007, o = soft(span(T, a, a + .05));
      el.style.opacity = o;
      el.style.transform = o < 1 ? `translateX(${((1 - o) * -18).toFixed(1)}px)` : '';
    });
    side.style.visibility = T > .085 ? 'visible' : 'hidden';
    sideDone = T >= .2;
  }
  // 3. The chapters: each new screen rises into the window as you scroll, its caption and its light change with it
  const q = clamp((T - START) / (1 - START)) * N, focus = Math.min(N - 1, Math.floor(q));
  qNow = q;
  const inn = i => i === 0 ? 1 : soft(span(q, i - EDGE, i + EDGE));
  let dimO = 0;
  CHAPTERS.forEach((c, i) => {
    const e = inn(i), next = i < N - 1 ? inn(i + 1) : 0;
    if (c.fig) {
      const vis = e > 0 && next < 1;
      if (vis !== c.vis) {
        c.vis = vis;
        c.fig.style.visibility = vis ? 'visible' : 'hidden';
        if (c.el) {
          if (vis && !window.__motionPaused && !document.hidden) { try { c.el.currentTime = 0; } catch (x) {} const p = c.el.play(); p && p.catch(() => {}); }
          else c.el.pause();
        }
      }
      if (vis) {
        c.fig.style.transform = e < 1 ? `translate3d(0,${((1 - e) * 100).toFixed(2)}%,0)` : 'none';
        const l = clamp(q - i);
        c.media.style.transform = `scale(${(c.zoom ? 1 + (c.zoom - 1) * smooth(clamp((l - .1) / .75)) : 1 + .02 * l).toFixed(4)})`;
      }
      if (e > 0 && e < 1) { dimO = e * .45; dim.style.zIndex = i * 2 - 1; }
    }
    const on = i === 0 ? soft(span(T, .12, .175)) : span(e, .5, 1), off = span(next, 0, .5), o = on * (1 - off);
    if (o !== c.o) {
      c.o = o;
      c.card.style.opacity = o;
      c.card.style.visibility = o > 0 ? 'visible' : 'hidden';
      c.card.style.transform = `translate3d(0,${((1 - on) * 12 - off * 8).toFixed(1)}px,0)`;
    }
    if (o <= 0) c.typed = false;
    else if (!c.typed) { c.typed = true; typeTitle(c); }
    const w = (i === 0 ? soft(span(T, .03, .17)) : e) * (1 - next);
    if (w !== c.w) { c.w = w; c.wash.style.opacity = w; }
    if (i && q > i - 1.6 && T > 0) warm(c);
  });
  dim.style.opacity = dimO;
  fade.style.opacity = span(T, .86, 1);
  setFocus(focus, q);
  frame.style.pointerEvents = q < .9 ? '' : 'none';
  if (T >= START && q < 1 && !played) { played = true; const f = frame.contentWindow; if (f && f.playAllIcons && !window.__motionPaused) f.playAllIcons(); }
  if (T < .05 || q >= 1) played = false;
}
// The phone's tour: the same scroll, with a shorter run through the D and its own window
function phoneFrame(dt) {
  const hero = window.__hero, tour = window.__phoneTour;
  if (!hero || !hero.win || !tour) return;
  const w = hero.win();
  if (!w || !w.w) return;
  if (tourFor !== w) { tourFor = w; tour.layout(w, hero.vh(), { washes: CHAPTERS.map(c => c.wash) }); }
  const H = pin.clientHeight, r = stage.getBoundingClientRect(), len = stage.offsetHeight - H - window.__pmHero * H;
  const raw = len > 0 ? clamp((-r.top - window.__pmHero * H) / len) : 0;
  if (Math.abs(raw - T) > .35) T = raw;
  else { T += (raw - T) * (1 - Math.exp(-dt / 70)); if (Math.abs(raw - T) < .0002) T = raw; }
  const p = hero.prog();
  document.documentElement.classList.toggle('hero-away', p > .06);
  const takeover = p > .43;
  if (takeover !== !!window.__noWin) { window.__noWin = takeover; hero.redraw(); }
  fade.style.opacity = span(T, .86, 1);
  if (r.bottom > -H * .2) { tour.paint(T, p, dt); current = tour.chapter(); }
  else tour.park();
}
let lastNow = 0, lastScroll = -1, lastHero = -1, lastReady = false, lastLiveOn = false, lastRaw = 0;
(function loop(now) {
  now = now || performance.now();
  const dt = Math.min(50, now - (lastNow || now)); lastNow = now;
  if (pm) phoneFrame(dt);
  else if (!flat) {
    const hero = window.__hero;
    if (!laid || (geo && hero && geo.win !== hero.win())) layout();
    if (laid) {
      const hp = hero.prog(), ready = hero.ready(), liveOn = live.classList.contains('on');
      // The hero may reveal its live window one frame after a covered jump reaches its endpoint.
      if (scrollY === lastScroll && hp === lastHero && ready === lastReady && liveOn === lastLiveOn && T === lastRaw) {
        requestAnimationFrame(loop); return;
      }
      lastScroll = scrollY; lastHero = hp; lastReady = ready; lastLiveOn = liveOn;
      const H = pin.clientHeight, r = stage.getBoundingClientRect(), tour = stage.offsetHeight - H - HERO_SCREENS * H;
      const raw = tour > 0 ? clamp((-r.top - HERO_SCREENS * H) / tour) : 0;
      lastRaw = raw;
      // A long jump, such as dragging the scrollbar, lands at once instead of racing through everything in between.
      // This runs off screen too, so that a jump past the tour also stops its videos.
      if (Math.abs(raw - T) > .35) T = raw;
      else {
        T += (raw - T) * (1 - Math.exp(-dt / 70));
        if (Math.abs(raw - T) < .0002) T = raw;
      }
      if (r.bottom > -H) syncHero();
      if (T !== lastT) { lastT = T; paint(); }
    }
  }
  requestAnimationFrame(loop);
})();
let rt = 0, sizedW = innerWidth, sizedH = innerHeight;
addEventListener('resize', () => {
  // The address bar sliding away on a phone changes nothing that was laid out
  if (isPm() && pm && innerWidth === sizedW && Math.abs(innerHeight - sizedH) < 170) return;
  sizedW = innerWidth; sizedH = innerHeight;
  laid = false; clearTimeout(rt); rt = setTimeout(layout, 120);
});
document.fonts.ready.then(() => { laid = false; });
layout();

/* The line under the headline: it types a statement, holds it, deletes it and moves to the next. The hero's cursor moves down to it. */
const rot = { lines: [] };
(() => {
  const proof = $('#proof');
  if (!proof || REDUCE) return;
  rot.lines = [...proof.children].map(s => s.textContent);
  const sr = document.createElement('span'); sr.className = 'sr'; sr.textContent = rot.lines.join('. ') + '.';
  const text = document.createElement('span'); text.id = 'rotText'; text.setAttribute('aria-hidden', 'true');
  const cur = document.createElement('i'); cur.id = 'rotCur'; cur.setAttribute('aria-hidden', 'true');
  proof.textContent = ''; proof.classList.add('rot'); proof.append(sr, text, cur);
  let i = 0, n = 0, deleting = false;
  function step() {
    const hero = window.__hero;
    if (window.__motionPaused || document.hidden || (hero && hero.prog() > .06)) { setTimeout(step, 400); return; }
    const line = rot.lines[i];
    cur.classList.add('busy');
    if (!deleting) {
      text.textContent = line.slice(0, ++n);
      if (n >= line.length) { deleting = true; cur.classList.remove('busy'); setTimeout(step, 2300); return; }
      setTimeout(step, 30 + Math.random() * 34);
      return;
    }
    text.textContent = line.slice(0, --n);
    if (n <= 0) { deleting = false; i = (i + 1) % rot.lines.length; cur.classList.remove('busy'); setTimeout(step, 320); return; }
    setTimeout(step, 16);
  }
  const wait = new MutationObserver(() => {
    if (!proof.classList.contains('on')) return;
    wait.disconnect();
    setTimeout(() => { $('#cursor').style.visibility = 'hidden'; step(); }, 420);
  });
  wait.observe(proof, { attributes: true, attributeFilter: ['class'] });
})();

/* Contact: the sheet gets signed when it comes into view. Without this script, or with reduced motion, it simply stays signed. */
let signed = REDUCE;
(() => {
  const sheet = $('#sheet'), pens = $$('#sig .wr');
  if (!sheet || REDUCE || !pens.length || !sheet.animate) { signed = true; return; }
  pens.forEach(p => { p.style.strokeDasharray = '1'; p.style.strokeDashoffset = '1'; });
  const io = new IntersectionObserver(es => {
    if (!es[0].isIntersecting) return;
    io.disconnect();
    if (window.__motionPaused) {
      pens.forEach(p => { p.style.strokeDashoffset = '0'; });
      signed = true; return;
    }
    const lens = pens.map(p => +p.dataset.len), total = lens.reduce((a, b) => a + b, 0);
    let at = 350, lastStroke;
    pens.forEach((p, i) => {
      const ms = lens[i] / total * 1900;
      lastStroke = p.animate([{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: ms, delay: at, easing: 'cubic-bezier(.35,.05,.6,.95)', fill: 'forwards' });
      at += ms + 70;
    });
    lastStroke.onfinish = () => { signed = true; };
  }, { threshold: .4 });
  io.observe(sheet);
})();

/* Typed titles with one cursor */
const cursor = document.createElement('i'); cursor.id = 'cCursor'; cursor.setAttribute('aria-hidden', 'true');
const io = new IntersectionObserver(es => es.forEach(e => {
  if (!e.isIntersecting) return;
  io.unobserve(e.target);
  const h = e.target, text = h.dataset.text;
  if (REDUCE || window.__motionPaused) { h.textContent = text; h.appendChild(cursor); return; }
  let n = 0; h.textContent = ''; const t = document.createTextNode(''); h.append(t, cursor); cursor.classList.add('busy');
  const iv = setInterval(() => { if (window.__motionPaused || document.hidden) return; n++; t.nodeValue = text.slice(0, n); if (n >= text.length) { clearInterval(iv); cursor.classList.remove('busy'); } }, 34);
}), { threshold: .9 });
$$('.cs h2[data-type]').forEach(h => { h.dataset.text = h.textContent; h.setAttribute('aria-label', h.textContent); io.observe(h); });

/* Lightbox */
const box = $('#lightbox'), boxImg = $('img', box);
$$('[data-zoom]').forEach(b => b.addEventListener('click', () => { boxImg.src = b.dataset.zoom; boxImg.alt = $('img', b).alt; box.showModal(); }));
$('button', box).addEventListener('click', () => box.close());
box.addEventListener('click', e => { if (e.target === box) box.close(); });

/* The 14 course badges: a pile that deals into a grid */
const cTrack = $('#cTrack'), cPin = $('#cPin'), cCards = $('#cCards'), cCopy = $('#cCopy'), cNow = $('#cNow'), cBloom = $('#cBloom'), cEdge = $('#cEdge');
const cGo = $('#cGo'), edgeS4 = $('.e.s4', cEdge), edgeAriba = $('.e.ariba', cEdge), edgeLights = $$('i', cEdge);
const COLS = 5, ROT = [-5, 4, -8, 6, -3, 8, -6, 3, -9, 5, -2, 7, -4, 2];
const JIT = [[0, 0], [34, -22], [-38, 18], [46, 26], [-28, -34], [18, 40], [-48, 4], [38, -8], [-14, 30], [26, 34], [-34, -16], [52, -24], [-22, 44], [10, -40]];
const HUE = { 'S/4HANA': 'var(--hue-s4)', Ariba: 'var(--hue-ariba)' };
const cards = (window.COURSES || []).map((c, i) => {
  const pair = document.createElement('div'); pair.className = 'pair';
  const a = document.createElement('a'); a.className = 'badge'; a.href = c.verify; a.target = '_blank'; a.rel = 'noopener';
  a.style.setProperty('--h', HUE[c.group]);
  a.setAttribute('aria-label', `${c.title}, ${c.level} level, ${c.date}. Verify on SAP Learning.`);
  a.innerHTML = `<img src="../assets/certs/${c.img}.webp" alt="" loading="lazy"><i class="sheen"></i>`;
  const cap = document.createElement('div'); cap.className = 'cap'; cap.id = `course-${i}`;
  cap.textContent = `${c.level}, ${c.date}. ${c.covered}`;
  a.setAttribute('aria-describedby', cap.id);
  pair.append(a, cap); cCards.appendChild(pair);
  const enter = () => setHot(i);
  if (TAPS) {
    // First tap: its details, with the link to verify. The keyboard still follows the link at once.
    a.addEventListener('click', e => { if (!e.detail) return; e.preventDefault(); setHot(hot === i ? -1 : i); });
    a.addEventListener('focus', () => { if (a.matches(':focus-visible')) enter(); });
  } else {
    a.addEventListener('pointerenter', enter); a.addEventListener('focus', enter);
    a.addEventListener('pointerleave', () => setHot(-1)); a.addEventListener('blur', () => setHot(-1));
  }
  return { c, a, pair, i, k: 0, sheen: $('.sheen', a), reach: null };
});
let cGeo = [], cProg = 0, hot = -1, group = '', edgesFor = '', lightO = 0;
const ptr = { x: 0, y: 0, tx: 0, ty: 0, on: 0, want: 0 };
if (FINE) {
  cPin.addEventListener('pointermove', e => {
    if (e.pointerType === 'touch') return;
    const r = cPin.getBoundingClientRect();
    ptr.tx = e.clientX - r.left; ptr.ty = e.clientY - r.top;
    if (!ptr.want && ptr.on < .05) { ptr.x = ptr.tx; ptr.y = ptr.ty; }
    ptr.want = 1;
  });
  cPin.addEventListener('pointerleave', () => { ptr.want = 0; });
}
function idle() {
  const n = group ? cards.filter(x => x.c.group === group).length : cards.length;
  $('b', cNow).textContent = group ? `${n} courses in SAP ${group}` : 'Every badge can be checked';
  $('small', cNow).textContent = '';
  $('span', cNow).textContent = TAPS ? 'Tap a badge to read its course details and verify it on SAP Learning.' : 'Focus on a badge to read its course details. Open it to verify it on SAP Learning.';
  cGo.hidden = true;
  cNow.style.removeProperty('--h');
}
function setHot(i) {
  if (hot === i) return;
  hot = i;
  cards.forEach(x => x.a.classList.toggle('hot', x.i === i));
  if (i < 0) { idle(); return; }
  const c = cards[i].c;
  $('b', cNow).textContent = c.title;
  $('small', cNow).textContent = `${c.level} level / ${c.date}`;
  $('span', cNow).textContent = c.covered;
  if (TAPS) { cGo.href = c.verify; cGo.hidden = false; }
  cNow.style.setProperty('--h', HUE[c.group]);
  cBloom.style.setProperty('--h', HUE[c.group]);
}
function showEdges() {
  edgeS4.style.opacity = group === 'Ariba' ? 0 : 1;
  edgeAriba.style.opacity = group === 'S/4HANA' ? 0 : 1;
}
$$('#cChips button').forEach(b => b.addEventListener('click', () => {
  group = b.dataset.g;
  $$('#cChips button').forEach(x => x.setAttribute('aria-pressed', x === b ? 'true' : 'false'));
  cards.forEach(x => {
    const off = !!group && x.c.group !== group;
    x.a.classList.toggle('off', off); x.pair.classList.toggle('off', off);
    x.a.inert = off; x.a.tabIndex = off || (!isCourseFlat() && !x.reach) ? -1 : 0;
  });
  showEdges();
  if (hot >= 0 && group && cards[hot].c.group !== group) setHot(-1); else if (hot < 0) idle();
}));
// The edges that catch the light, drawn once as masks: the light moves behind them without any repainting
function buildEdges() {
  const W = cPin.clientWidth, H = cPin.clientHeight, key = W + 'x' + H;
  if (edgesFor === key) return;
  edgesFor = key;
  const d = Math.min(2, devicePixelRatio || 1);
  [['S/4HANA', edgeS4], ['Ariba', edgeAriba]].forEach(([name, el]) => {
    const c = document.createElement('canvas'); c.width = W * d; c.height = H * d;
    const x = c.getContext('2d'); x.scale(d, d); x.strokeStyle = '#fff'; x.lineWidth = 1.7;
    cards.filter(k => k.c.group === name).forEach(k => {
      const g = cGeo[k.i], r = Math.max(3, 10 * g.scale);
      x.beginPath(); x.roundRect(g.ex + .6, g.ey + .6, g.tw - 1.2, g.tw - 1.2, r); x.stroke();
    });
    const url = `url(${c.toDataURL('image/png')})`;
    el.style.webkitMaskImage = url; el.style.maskImage = url;
  });
}
function light(dt) {
  if (!FINE) return;
  const a = 1 - Math.exp(-dt / 70), b = 1 - Math.exp(-dt / 140);
  ptr.x += (ptr.tx - ptr.x) * a; ptr.y += (ptr.ty - ptr.y) * a; ptr.on += (ptr.want - ptr.on) * b;
  const o = ptr.on * span(cProg, .74, .86);
  if (o < .002 && lightO < .002) return;
  lightO = o;
  buildEdges();
  cBloom.style.opacity = o.toFixed(3);
  cBloom.style.transform = `translate3d(${(ptr.x - 280).toFixed(1)}px,${(ptr.y - 280).toFixed(1)}px,0)`;
  cEdge.style.opacity = o.toFixed(3);
  edgeLights.forEach(l => { l.style.transform = `translate3d(${(ptr.x - 260).toFixed(1)}px,${(ptr.y - 260).toFixed(1)}px,0)`; });
}
function cLayout() {
  document.documentElement.classList.toggle('course-flat', isCourseFlat());
  if (isCourseFlat()) {
    cards.forEach(x => { x.a.tabIndex = x.a.inert ? -1 : 0; x.a.style.pointerEvents = ''; x.reach = null; });
    return;
  }
  const r = cPin.getBoundingClientRect(), W = r.width, H = r.height, gut = Math.max(16, W * .03);
  const small = W < 1000 || innerHeight < 620, VH = small && window.__svh ? Math.min(H, window.__svh()) : H, side = small && W > VH * 1.2;
  let areaX = gut, areaW, top, areaH, cols = COLS, gap;
  const copy = cCopy.getBoundingClientRect();
  if (small && !side) { areaW = W - gut * 2; top = copy.bottom - r.top + 12; areaH = VH - top - 14; gap = Math.max(8, W * .022); }
  else if (small) { areaX = copy.right - r.left + gut; areaW = W - areaX - gut; top = 12; areaH = VH - 24; gap = 8; }
  else { const right = copy.width + gut * 2; areaW = W - right - gut; top = 74; areaH = H - top - 26; gap = Math.max(10, W * .0095); }
  // On a small screen, the number of columns that makes the badges largest
  const size = n => { const m = Math.ceil(cards.length / n); return Math.min((areaW - gap * (n - 1)) / n, (areaH - gap * (m - 1)) / m); };
  if (small) { cols = 2; [3, 4, 5, 6, 7].forEach(n => { if (size(n) > size(cols)) cols = n; }); }
  const rows_ = Math.ceil(cards.length / cols), tw = size(cols);
  const gw = tw * cols + gap * (cols - 1), gh = tw * rows_ + gap * (rows_ - 1);
  const gx = areaX + (areaW - gw) / 2, gy = top + (areaH - gh) / 2;
  const pw = Math.min(areaW * (small ? .62 : .52), areaH * .68), px = areaX + (areaW - pw) / 2, py = small ? top + (areaH - pw) / 2 : (H - pw) / 2 + 12;
  const spread = small ? pw / 420 : 1;
  cGeo = cards.map((x, i) => {
    const scale = tw / pw;
    x.a.style.width = pw + 'px'; x.a.style.height = pw + 'px';
    x.a.style.setProperty('--u', (1 / scale).toFixed(3) + 'px');
    return { sx: px + JIT[i][0] * spread, sy: py + JIT[i][1] * spread, ex: gx + (i % cols) * (tw + gap), ey: gy + Math.floor(i / cols) * (tw + gap), scale, tw, pw, rot: ROT[i] };
  });
  edgesFor = '';
  cRender(16);
}
function cRender(dt) {
  if (isCourseFlat() || !cGeo.length) return;
  const deal = clamp((cProg - .05) / .74), n = cards.length, step = .04, a = 1 - Math.exp(-dt / 90);
  cards.forEach((x, i) => {
    const g = cGeo[i], local = smooth(clamp((deal - i * step) / (1 - step * (n - 1)))), lit = hot === i && local >= 1;
    x.k += ((lit ? 1 : 0) - x.k) * a;
    if (x.k < .002) x.k = lit ? x.k : 0;
    const lift = Math.sin(local * Math.PI) * -28, sc = 1 + (g.scale - 1) * local, up = 1 + .05 * x.k, grow = g.tw * (up - 1) / 2;
    let tf = `translate(${(g.sx + (g.ex - g.sx) * local - grow).toFixed(2)}px,${(g.sy + (g.ey - g.sy) * local + lift - grow).toFixed(2)}px) rotate(${(g.rot * (1 - local)).toFixed(2)}deg) scale(${(sc * up).toFixed(5)})`;
    if (x.k > 0 && FINE && ptr.want) {
      // The badge under the pointer leans towards it, and a soft highlight follows
      const nx = clamp((ptr.x - g.ex) / g.tw) * 2 - 1, ny = clamp((ptr.y - g.ey) / g.tw) * 2 - 1, c = g.pw / 2, sz = g.pw * 1.5;
      tf += ` translate(${c}px,${c}px) perspective(${(g.pw * 2.6).toFixed(0)}px) rotateX(${(-ny * 7 * x.k).toFixed(2)}deg) rotateY(${(nx * 7 * x.k).toFixed(2)}deg) translate(${-c}px,${-c}px)`;
      x.sheen.style.transform = `translate3d(${((ptr.x - g.ex) / g.scale - sz / 2).toFixed(1)}px,${((ptr.y - g.ey) / g.scale - sz / 2).toFixed(1)}px,0)`;
    }
    x.a.style.transform = tf;
    x.a.style.zIndex = x.k > 0 ? 60 : (local > 0 && local < 1 ? 30 : 20 - i);
    const ready = local >= 1;
    if (ready !== x.reach) { x.reach = ready; x.a.style.pointerEvents = ready ? 'auto' : 'none'; x.a.tabIndex = ready && !x.a.inert ? 0 : -1; }
  });
  const inGrid = cProg > .7, small = innerWidth < 1000 || innerHeight < 620;
  cNow.classList.toggle('on', small ? inGrid && hot >= 0 : inGrid);
  if (TAPS && !inGrid && hot >= 0) setHot(-1);
}
idle();
showEdges();
cLayout();
// Tab out of the filters must reach the courses without requiring a scroll gesture.
const courseFilters = $('#cChips');
courseFilters.addEventListener('keydown', e => {
  if (e.key !== 'Tab' || e.shiftKey || e.target !== courseFilters.lastElementChild || isCourseFlat()) return;
  const r = cTrack.getBoundingClientRect();
  cProg = 1; cRender(16);
  scrollTo({ top: scrollY + r.top + Math.max(0, r.height - innerHeight), behavior: 'instant' });
});
let cSizedW = innerWidth, cSizedH = innerHeight;
addEventListener('resize', () => {
  if (TAPS && innerWidth === cSizedW && Math.abs(innerHeight - cSizedH) < 170) return;
  cSizedW = innerWidth; cSizedH = innerHeight;
  cLayout();
});
// Tapping away closes a badge's details
if (TAPS) document.addEventListener('click', e => { if (hot >= 0 && !e.target.closest('.badge,#cNow')) setHot(-1); });
/* One colour owns each part of the page, and they melt into each other on scroll */
const contactEl = $('#contact'), tintC = $('.t-course'), tintK = $('.t-contact');
let tC = -1, tK = -1;
const certEl = $('#certificates'), toTop = $('#toTop');
let ringNow = '';
function tints(H) {
  const ct = cTrack.getBoundingClientRect().top, kt = contactEl.getBoundingClientRect().top;
  const c = smooth(span(H * .85 - ct, 0, H * .7)), k = smooth(span(H * .9 - kt, 0, H * .7));
  if (c !== tC) { tC = c; tintC.style.opacity = c; }
  if (k !== tK) { tK = k; tintK.style.opacity = k; }
  // The back-to-top ring takes the colour of the part of the page you are in
  const mid = H * .5;
  const hue = kt < mid ? 'var(--amber)' : ct < mid ? '#FF6FB5' : certEl.getBoundingClientRect().top < mid ? 'var(--dash)' : T > .03 && current >= 0 ? CHAPTERS[current].hue : 'var(--sky)';
  if (toTop && hue !== ringNow) { ringNow = hue; toTop.style.setProperty('--ring', hue); }
}
let cLast = 0, cScroll = -1, cHeight = -1;
(function cLoop(now) {
  now = now || performance.now();
  const dt = Math.min(50, now - (cLast || now)); cLast = now;
  const H = innerHeight, flatNow = isCourseFlat();
  if (!flatNow && cGeo.length) {
    const r = cTrack.getBoundingClientRect(), range = r.height - H;
    if (r.top < H && r.bottom > 0) {
      const target = clamp(-r.top / range);
      const moving = cProg !== target || cards.some(x => Math.abs(x.k - (x.i === hot ? 1 : 0)) > .002) ||
        Math.abs(ptr.x - ptr.tx) > .1 || Math.abs(ptr.y - ptr.ty) > .1 || Math.abs(ptr.on - ptr.want) > .002;
      cProg += (target - cProg) * (1 - Math.exp(-dt / 80));
      if (Math.abs(target - cProg) < .0003) cProg = target;
      if (moving) { light(dt); cRender(dt); }
    }
  } else if (!flatNow) cLayout();
  if (scrollY !== cScroll || H !== cHeight) { cScroll = scrollY; cHeight = H; tints(H); }
  requestAnimationFrame(cLoop);
})();
addEventListener('motionchange', () => {
  CHAPTERS.forEach(c => {
    if (c.el) {
      if (!window.__motionPaused && c.vis && !document.hidden) c.el.play().catch(() => {});
      else c.el.pause();
    }
  });
  $$('#tourFlatList video').forEach(v => {
    if (!window.__motionPaused && v.dataset.visible === 'true' && !REDUCE && !document.hidden) v.play().catch(() => {});
    else v.pause();
  });
});
window.__main = { flat: () => flat || pm, pm: () => pm, T: () => T, q: () => qNow, chapter: () => current, playing: () => CHAPTERS.map(c => c.el ? !c.el.paused : null), wired: () => { const f = frame.contentWindow; return !!(f && f.__bhWired); }, goChapter, lines: () => rot.lines, light: () => lightO, signed: () => signed };
})();
