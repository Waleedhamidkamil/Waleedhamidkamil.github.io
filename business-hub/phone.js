/* The Business Hub page on phones and tablets: each part is one scene that fits a screen, with one window, one caption and a row of steps.
   The camera shows the feature at a size that can be read, instead of a whole desktop screen shrunk down. Text comes one line at a time.
   Reduced motion keeps the plain page. Desktop is untouched. */
(() => {
  const P = window.PhoneCam, B = window.__bh;
  if (!P || !B || P.REDUCE) return;
  const { R, Deck, Reel, el } = P;
  const $ = (s, r = document) => r.querySelector(s), $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const isPm = () => innerWidth < 1100;
  const A = '../assets/';
  let built = false;
  const parts = [];

  function host(sectionId, after) {
    const box = el('div', 'pm-only'), sec = document.getElementById(sectionId);
    const ref = after && $(after, sec);
    if (ref) ref.after(box); else sec.appendChild(box);
    return box;
  }
  const linked = deck => {
    deck.cap.addEventListener('click', e => { const a = e.target.closest('a'); if (a && a.getAttribute('href').startsWith('#')) { e.preventDefault(); B.jump(a.getAttribute('href')); } });
    return deck;
  };

  function title() {
    // BUSINESS from the left and HUB from the right, as on the main page
    const h = $('#top h1');
    h.setAttribute('aria-label', h.textContent);
    h.innerHTML = '<span aria-hidden="true">BUSINESS</span> <span aria-hidden="true">HUB</span>';
    const [a, b] = h.children;
    if (window.__motionPaused) return;
    const go = (e, x) => e.animate([{ transform: `translate3d(${x}vw,0,0)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 900, easing: 'cubic-bezier(.16,1,.3,1)' });
    go(a, -70); go(b, 70);
    $('#top p').animate([{ opacity: 0, transform: 'translate3d(0,8px,0)' }, { opacity: 1, transform: 'none' }], { duration: 500, delay: 420, easing: 'ease-out', fill: 'backwards' });
  }

  function dashboard() {
    const dash = { src: window.DASH_PICTURE || `${A}hero-dashboard.webp`, dark: `${A}phone/dash-dark.webp`, icons: ['quote', 'po', 'dn', 'inv', 'control', 'logout', 'trash', 'settings', 'autofill', 'lpo'], alt: 'Business Hub dashboard with sample data' };
    parts.push(linked(new Deck(host('dashboard', '.head'), {
      hue: 'var(--dash)', dark: true, expand: true,
      screens: { dash },
      stops: [
        { screen: 'dash', rect: R(32, 482, 500, 420), side: 'bottom', title: 'Needs attention', text: 'Bids to decide, missing costs, unsent documents, orders to invoice and unpaid invoices.', href: '#order', link: 'See one order, start to finish' },
        { screen: 'dash', rect: R(32, 338, 770, 136), side: 'bottom', title: 'Create new', text: 'A separate editor for each of the four documents.', href: '#documents', link: 'See the editors', icons: ['quote', 'po'] },
        { screen: 'dash', rect: R(800, 338, 770, 136), side: 'bottom', title: 'Create new', text: 'Quotation, purchase order, delivery note and invoice, each with its own editor.', href: '#documents', link: 'See the editors', icons: ['dn', 'inv'] },
        { screen: 'dash', rect: R(1028, 482, 540, 410), side: 'bottom', title: 'Insights', text: 'Bid outcomes and document totals, with full reports behind them.', href: '#insights', link: 'See Insights' },
        { screen: 'dash', rect: R(1028, 905, 540, 90), side: 'top', title: 'Master Data', text: 'One record for every item and client.', href: '#master', link: 'See Master Data', icons: ['autofill', 'lpo'] },
        { screen: 'dash', rect: R(1180, 8, 400, 74), side: 'bottom', title: 'Control Room', text: 'People, roles, permissions and the activity log.', href: '#server', link: 'See the server', icons: ['control', 'logout', 'trash', 'settings'] },
        { screen: 'dash', rect: R(32, 8, 740, 74), side: 'bottom', title: 'Search', text: 'Documents, clients and numbers from one box.' },
      ],
    })));
  }

  function documents() {
    const hues = { 'doc-quote': '#7FA6F5', 'doc-po': '#CFCB62', 'doc-dn': '#34D1BC', 'doc-inv': '#5BB7F0' };
    const tabs = [], stops = [], screens = {};
    B.DOCS.forEach((d, k) => {
      tabs.push({ label: d.title, hue: hues[d.id] });
      screens[d.img] = { src: `${A}${d.img}.webp`, alt: `${d.title} editor with sample data` };
      d.notes.forEach(n => {
        stops.push({ screen: d.img, tab: k, rect: n.r, side: n.r.y > 760 ? 'top' : 'bottom', title: n.title, text: n.text, href: n.href, link: n.href ? 'See it' : '' });
      });
    });
    parts.push(linked(new Deck(host('documents', '.head'), { hue: hues['doc-quote'], tabs, tabsLabel: 'Documents', stops, screens, expand: true })));
  }

  function order() {
    parts.push(new Reel(host('order', '.head'), {
      hue: 'var(--link)', src: `${A}order-to-paid.mp4`, poster: `${A}order-to-paid.jpg`, duration: 40.5, label: 'Screen recording of one purchase order going from order to paid, sample data',
      steps: B.STEPS.map(([name, t, text]) => ({ name, t, text })),
      keys: [[0, 520, 150, 620, 500], [2.7, 0, 0, 640, 470], [4.5, 40, 130, 640, 460], [6.2, 400, 560, 640, 420], [7.6, 0, 0, 640, 400], [9.6, 484, 284, 616, 432], [12.3, 480, 196, 620, 600], [16.4, 1040, 250, 560, 400], [17.8, 528, 284, 520, 432], [20.8, 40, 130, 640, 460], [22.6, 30, 140, 640, 520], [25, 400, 620, 640, 380], [27.9, 172, 332, 620, 332], [29.2, 790, 332, 620, 332], [30.5, 30, 140, 640, 520], [32.2, 88, 60, 640, 560], [38.2, 1040, 240, 560, 340]],
    }));
  }

  function attachments() {
    parts.push(new Reel(host('attachments', '.head'), {
      hue: 'var(--attach)', src: `${A}attachments.mp4`, poster: `${A}attachments.jpg`, duration: 14.6, loop: true, label: 'Screen recording of the invoice attachments window, sample data',
      steps: [
        { name: 'One window', t: 0, text: 'Supporting files, such as timesheets and gate passes, sit with the client-signed copy in one window on the invoice.' },
        { name: 'Paid and signed', t: 8.6, text: 'Paid and signed are separate states.' },
        { name: 'Export', t: 11.8, text: 'An export combines only the files you tick, in the order shown, and the originals stay unchanged.' },
      ],
      keys: [[0, 200, 0, 640, 520], [3.6, 100, 90, 640, 500], [5.2, 100, 280, 640, 420], [8.6, 100, 90, 640, 560], [11.6, 100, 330, 640, 330], [13.2, 100, 680, 640, 220]],
    }));
  }

  function master() {
    const box = host('master', '.head');
    const tabs = el('div', 'ptabs'); tabs.setAttribute('role', 'group'); tabs.setAttribute('aria-label', 'Master Data');
    tabs.innerHTML = '<button type="button" aria-pressed="true">Materials</button><button type="button" aria-pressed="false">Clients</button>';
    box.appendChild(tabs);
    const a = el('div'), b = el('div');
    box.append(a, b);
    const reel = new Reel(a, {
      hue: 'var(--master)', src: `${A}master.mp4`, poster: `${A}master.jpg`, duration: 13.2, loop: true, label: 'Screen recording of the materials catalogue and its review screen, sample data',
      steps: [
        { name: 'Materials', t: 0, text: 'One record per item: name, description and unit in English and Arabic, with price and cost.' },
        { name: 'Arabic to English', t: 2.9, text: "A purchase order's Arabic lines find their English side here." },
        { name: 'Review', t: 7.1, text: "The review screen flags items stored twice, items that can't be told apart, and dates typed into descriptions." },
        { name: 'Your decision', t: 10.4, text: 'Nothing changes until someone confirms it.' },
      ],
      keys: [[0, 170, 250, 640, 560], [2.9, 840, 90, 640, 420], [5, 170, 250, 640, 560], [7.1, 530, 90, 530, 560], [10.4, 20, 170, 760, 620]],
    });
    let deck = null;
    parts.push(reel);
    [...tabs.children].forEach((btn, k) => btn.addEventListener('click', () => {
      [...tabs.children].forEach((x, j) => x.setAttribute('aria-pressed', String(j === k)));
      a.hidden = k !== 0; b.hidden = k !== 1;
      if (k === 1 && !deck) {
        deck = new Deck(b, {
          hue: 'var(--master)', expand: true,
          screens: { clients: { src: `${A}master-clients.webp`, alt: 'Client record screen with sample data' } },
          stops: [
            { screen: 'clients', rect: R(10, 220, 510, 700), side: 'bottom', title: 'One record per client', text: 'Shared across companies.' },
            { screen: 'clients', rect: R(520, 370, 1030, 150), side: 'bottom', title: 'Names', text: 'Legal and Arabic names.' },
            { screen: 'clients', rect: R(1020, 560, 530, 110), side: 'bottom', title: 'Tax and registration', text: 'Tax and registration numbers.' },
            { screen: 'clients', rect: R(520, 740, 1030, 240), side: 'top', title: 'Contacts', text: 'Contacts, payment terms and the default receiving account.' },
            { screen: 'clients', rect: R(520, 230, 1030, 140), side: 'bottom', title: 'Fills new documents', text: 'Picking a client on a new document fills in the address and payment details from this record.' },
          ],
        });
        parts.push(deck);
      }
      if (deck && k === 1) { deck.measure(); deck.go(deck.i, { instant: true }); deck.first(); }
      if (k === 0) reel.measure();
    }));
    b.hidden = true;
  }

  function insights() {
    const I = window.PHONE_ICONS || {}, world = { w: 1600, h: I.insightsH || 3195 };
    parts.push(new Deck(host('insights', '#insTrack'), {
      hue: 'var(--insight)', expand: true, title: 'Insights',
      screens: { all: { src: `${A}phone/insights-tall.webp`, world, alt: 'Insights page with sample data' } },
      stops: [
        { screen: 'all', rect: R(170, 130, 720, 130), side: 'bottom', title: 'By client', text: 'A year of work, by client and by month.' },
        { screen: 'all', rect: R(170, 320, 640, 300), side: 'bottom', title: 'Headline', text: 'Charged, spent, profit, margin, money awaiting payment and win rate.' },
        { screen: 'all', rect: R(170, 684, 1250, 352), side: 'bottom', title: 'Money over time', text: 'Charged, spent and what is left, month by month.' },
        { screen: 'all', rect: R(170, 1060, 620, 290), side: 'bottom', title: 'Margin trend', text: 'Profit against charged, per month.' },
        { screen: 'all', rect: R(170, 1419, 620, 360), side: 'bottom', title: 'Clients', text: 'Who pays, what it costs, what we keep.' },
        { screen: 'all', rect: R(170, 1812, 1250, 460), side: 'bottom', title: 'Every client', text: 'Each client on one row. The charts are the real ones, drawn from the sample data.' },
      ],
    }));
    const t = document.getElementById('h-ins');
    if (t && t.parentNode.closest('#insTrack')) {
      // The heading normally sits in the pinned desktop column
      const head = el('div', 'head pm-only', `<h2 data-phone>${t.dataset.text || 'Insights'}</h2>`);
      document.getElementById('insights').insertBefore(head, document.getElementById('insights').firstChild);
    }
  }

  function server() {
    // Roles switch with a soft change of picture, and the permissions are one compact list
    const img = $('#roleImg');
    $('#roles').addEventListener('click', e => {
      if (!e.target.closest('button') || window.__motionPaused) return;
      img.animate([{ opacity: .2, transform: 'translate3d(0,8px,0)' }, { opacity: 1, transform: 'none' }], { duration: 340, easing: 'cubic-bezier(.22,.8,.2,1)' });
    });
    // Nobody needs six pictures on the way in. Load them once this part is close.
    const io = new IntersectionObserver(es => { if (es[0].isIntersecting) { io.disconnect(); ['manager', 'accountant', 'procurement', 'storekeeper', 'viewer'].forEach(k => { const i = new Image(); i.src = `${A}role-${k}.webp`; }); } }, { rootMargin: '600px 0px' });
    io.observe($('#server'));
  }

  function reveal() {
    if (window.__motionPaused) return;
    const io = new IntersectionObserver(es => es.forEach(e => {
      if (!e.isIntersecting) return;
      io.unobserve(e.target);
      e.target.animate([{ opacity: 0, transform: 'translate3d(0,26px,0) scale(.985)' }, { opacity: 1, transform: 'none' }], { duration: 640, easing: 'cubic-bezier(.16,1,.3,1)' });
    }), { threshold: .12 });
    $$('.pscene .pwin, .role-view .frame').forEach(w => io.observe(w));
  }

  function build() {
    if (built) return;
    built = true;
    title();
    dashboard();
    documents();
    order();
    attachments();
    master();
    insights();
    server();
    reveal();
    addEventListener('resize', () => { clearTimeout(build.t); build.t = setTimeout(() => parts.forEach(p => { if (p.root && p.root.offsetParent) p.resize(); }), 180); });
  }
  if (isPm()) build();
  addEventListener('resize', () => { if (isPm()) build(); });
  window.__bhPhone = { built: () => built, parts: () => parts };
})();
