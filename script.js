/* Reads data.js / data.json (same structure as the previous site) and adapts it to the layout.
   nav.title/description/links → header · site.* → bio, clients, contact
   projects[] → one slide each (entries without images are skipped)
   label → title · Type/Location/Date → short line · all other fields → long description
   images[] → media (.mp4/.webm/.mov urls become videos; empty url = placeholder)
   fit: "center" (default, centred on black) · "bleed" (full-bleed) · "1-1" / "1-2" … (two images side by side, widths in that ratio;
        an image with a pair fit takes the NEXT image in the list as its partner) — set per image, per project or in site; image > project > site. */
const META_SKIP = ['key', 'label', 'images', 'fit', 'listOnly', 'paragraph'];
const PAIR = /^(\d+)-(\d+)$/;                      // "1-1", "1-2", "2-1" … = two images side by side
const normFit = f => { f = String(f || ''); return PAIR.test(f) ? f : (f === 'bleed' || f === 'cover') ? 'bleed' : 'center'; };   // default: centered
const SHORT_FIELDS = ['label'];
/* Order: site.order = ["$ZM1", "$001", …]. Listed keys come first, in that order;
   everything else follows in the order of data.js. */
const makeRank = order => (key, n) => { const i = (order || []).indexOf(key); return i >= 0 ? i : (order || []).length + n; };

/* images[] → slides. A slide is { fit, items:[…] } — one item, or two for a pair fit. */
function buildSlides(e, S) {
  const item = im => ({
    type: /\.(mp4|webm|mov)(\?|$)/i.test(im.url || '') ? 'video' : 'image',
    src: im.url || '', alt: im.alt || e.label || '',
    ratio: (im.width && im.height) ? im.width / im.height : 1,
  });
  const slides = [], imgs = e.images;
  for (let i = 0; i < imgs.length; i++) {
    const fit = normFit(imgs[i].fit || e.fit || S.fit), pm = PAIR.exec(fit);
    if (pm && imgs[i + 1]) {
      slides.push({ fit, weights: [+pm[1], +pm[2]], items: [item(imgs[i]), item(imgs[i + 1])] });
      i++;                                          // the partner is consumed
    } else slides.push({ fit: pm ? 'center' : fit, items: [item(imgs[i])] });   // last image can't pair → centred
  }
  return slides;
}

/* "paragraph": a string (blank line = new paragraph) or an array of strings */
const paraHTML = p => !p ? '' : (Array.isArray(p) ? p : String(p).split(/\n\s*\n/)).map(t => `<p>${t}</p>`).join('');

/* URL slug: "slug" if given, else the Index ("810.03" → "810-03"), else the key without "$" */
const slugify = e => {
  const raw = String(e.slug || e.Index || e.key.replace('$', '')).trim().toLowerCase();
  return raw.replace(/\./g, '-').replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || e.key.replace(/[^a-z0-9]/gi, '').toLowerCase();
};

function adapt(data) {
  const nav = data.nav || {}, site = data.site || {};
  const S = {
    name: nav.title || '', nameUrl: nav.title_url,
    contacts: (nav.links || []).map(l => ({ label: l.label, href: l.url })),
    bio: [], clients: [], contact: { email: '', address: '', addressUrl: '#', jobs: '' },
    policies: { label: '', href: '#', copy: '' },
    ...site,
  };
  const rank = makeRank(S.order);
  const P = (data.projects || data).filter(e => e.key && !e.listOnly && e.images && e.images.length).map((e, n) => {
    const meta = Object.entries(e).filter(([k, v]) => !META_SKIP.includes(k) && v !== '');
    return {
      key: e.key,
      _rank: rank(e.key, n),
      slug: slugify(e),
      paragraph: paraHTML(e.paragraph),
      title: e.label || e.key.replace('$', ''),
      desc: SHORT_FIELDS.map(k => e[k]).filter(Boolean).join(', '),
      fullDesc: meta.map(([k, v]) => `${k}: ${v}`).join('<br>'),
      media: buildSlides(e, S),
    };
  }).sort((a, b) => a._rank - b._rank);
  const seen = new Set();                             // make every slug unique
  P.forEach(p => { let s = p.slug, k = 2; while (seen.has(s)) s = p.slug + '-' + k++; p.slug = s; seen.add(s); });
  return { S, P };
}

(async () => {
  let S, P;
  try {
    let raw = window.DATA;                       // data.js (works from file://)
    if (!raw) {                                  // fallback: data.json over http
      const res = await fetch('data.json');
      if (!res.ok) throw new Error('HTTP ' + res.status);
      raw = await res.json();
    }
    window.DATA = raw;
    ({ S, P } = adapt(raw));
  } catch (err) {
    document.body.style.opacity = 1;
    document.body.textContent = 'Could not load data.js — check that it sits next to index.html and is valid.';
    console.error(err); return;
  }
  const $  = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const pad = n => String(n).padStart(2, '0');
  const body = document.body;

  /* ── Viewport height var (mobile browsers) ───────────────── */
  const setH = () => (document.documentElement.style.setProperty('--h', innerHeight + 'px'));
  setH();
  addEventListener('resize', setH);
  addEventListener('orientationchange', () => setTimeout(setH, 50));

  /* ── Placeholder media ───────────────────────────────────── */
  const ph = (ratio, n) => {
    const w = 1200, h = Math.round(w / ratio), hue = (n * 53 + 210) % 360;
    return 'data:image/svg+xml;utf8,' + encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">` +
      `<stop offset="0" stop-color="hsl(${hue},25%,30%)"/><stop offset="1" stop-color="hsl(${hue + 50},35%,14%)"/></linearGradient></defs>` +
      `<rect width="100%" height="100%" fill="url(#g)"/></svg>`);
  };

  /* ── Build the DOM from projects.js ──────────────────────── */
  const arrow = '<svg viewBox="0 0 12 7" aria-hidden="true"><path d="M0 3h10L7.6.6 8.2 0 12 3.5 8.2 7l-.6-.6L10 4H0z"/></svg>';
  $('#slides').innerHTML = P.map((pr, pi) => `
    <div class="swiper-slide swiper inner-swiper" data-count="${pr.media.length}">
      <div class="swiper-wrapper">
        ${pr.media.map((sl, si) => {
          const el = (m, k) => {
            const w = 1200, h = Math.round(w / (m.ratio || 1));
            return m.type === 'video'
              ? `<video src="${m.src || ''}" muted loop playsinline preload="metadata"></video>`
              : `<img src="${m.src || ph(m.ratio || 1, pi * 7 + si * 2 + k)}" width="${w}" height="${h}" alt="${m.alt || pr.title}" draggable="false">`;
          };
          const inner = sl.items.length === 2
            ? `<div class="media-container pair">${sl.items.map((m, k) => `<div class="cell" style="--w:${sl.weights[k]}">${el(m, k)}</div>`).join('')}</div>`
            : `<div class="media-container">${el(sl.items[0], 0)}</div>`;
          return `<div class="swiper-slide fit-${sl.fit}">${inner}</div>`;
        }).join('')}
      </div>
      <div class="swiper-button-prev">${arrow}<span class="button-label">Prev</span></div>
      <div class="swiper-button-next"><span class="button-label">Next</span>${arrow}</div>
    </div>`).join('');

  $('#nmr').textContent = S.name;
  document.title = S.name;
  $('#contacts').innerHTML = S.contacts.map(c => `<a href="${c.href}" target="_blank" rel="noopener">${c.label}</a>`).join('<span class="sep">/</span>');
  $('#information-bio').innerHTML = S.bio.map(t => `<p>${t}</p>`).join('');
  $('#information-clients').innerHTML = S.clients.join('<br>');
  const c = S.contact;
  $('#information-contact').innerHTML =
    `<p>Contact:</p><p><a href="mailto:${c.email}">${c.email}</a></p>` +
    `<p><a href="${c.addressUrl}" target="_blank" rel="noopener">${c.address}</a></p>` +
    `<p>For portfolios and work applications<br>please refer to<br><a href="mailto:${c.jobs}">${c.jobs}</a></p>`;
  const pol = S.policies || {};
  const hasLink = pol.href && pol.href !== '#';
  $('#information-policies').innerHTML =
    (pol.label ? (hasLink ? `<a href="${pol.href}" target="_blank" rel="noopener">${pol.label}</a>` : `<span>${pol.label}</span>`) : '<span></span>') +
    `<span>${pol.copy || ''}</span>`;

  /* ── Swipers ─────────────────────────────────────────────── */
  const IS_TOUCH = matchMedia('(hover: none)').matches;
  const outerEl = $('.outer-swiper');
  const innerEls = $$('.inner-swiper');
  const pauseAll = () => $$('video').forEach(v => v.pause());
  const playActive = () => { const v = $('.inner-swiper.swiper-slide-active .swiper-slide-active video'); if (v) v.play().catch(() => {}); };

  const outer = new Swiper(outerEl, {
    direction: 'vertical', loop: false, speed: 300,
    mousewheel: { forceToAxis: true, sensitivity: 5, thresholdDelta: 25, thresholdTime: 25 },
    keyboard: { enabled: true, onlyInViewport: true },
    effect: 'fade', fadeEffect: { crossFade: false },
    allowTouchMove: IS_TOUCH,                       // swipe on touch devices only
    breakpoints: { 820: { speed: 650 } },
  });

  const inners = innerEls.map(el => new Swiper(el, {
    direction: 'horizontal', loop: false, speed: 500,
    mousewheel: { forceToAxis: true, sensitivity: 5, thresholdDelta: 25, thresholdTime: 25 },
    slidesPerView: 1, freeMode: { enabled: false },
    navigation: { nextEl: $('.swiper-button-next', el), prevEl: $('.swiper-button-prev', el) },
    allowTouchMove: IS_TOUCH,
    breakpoints: { 820: { speed: 400 } },
    on: {
      // On touch screens the Prev/Next buttons don't catch touches (they would block swiping),
      // so a tap on the left / right half steps back / forward instead.
      tap(sw, e) {
        if (!IS_TOUCH) return;
        const x = e.clientX ?? (e.changedTouches && e.changedTouches[0].clientX) ?? e.pageX;
        x < innerWidth / 2 ? sw.slidePrev() : sw.slideNext();
      },
      slideChangeTransitionStart(sw) { sw.el.classList.add('blura'); pauseAll(); },
      slideChangeTransitionEnd(sw)   { sw.el.classList.remove('blura'); updateCounter(); playActive(); },
    },
  }));

  /* ── Text updates ────────────────────────────────────────── */
  const updateCounter = () => {
    const sw = inners[outer.activeIndex];
    $('#counter').textContent = `[IMG ${pad(sw.activeIndex + 1)}/${pad(sw.slides.length)}]`;
  };
  function updateText() {
    const pr = P[outer.activeIndex];
    $('#project-title').textContent = pr.title;
    $('#project-counter').textContent = `${pad(outer.activeIndex + 1)}/${pad(P.length)}`;
    $('#description-content').innerHTML = pr.desc || '';
    $('#description-rest-inner').innerHTML = pr.fullDesc || '';
    $('#close-desc').style.display = (pr.fullDesc || pr.paragraph) ? '' : 'none';
    const pp = $('#project-paragraph');
    pp.innerHTML = pr.paragraph || ''; pp.classList.toggle('has', !!pr.paragraph);
    updateCounter();
  }
  updateText();

  /* deep link from the list page: index.html?project=$key */
  /* ── One URL per project: /018 (path mode) or /#018 (hash mode, works anywhere) ── */
  const BASE = (() => { const sc = $('script[src$="script.js"]'); return new URL(sc ? sc.src : location.href).pathname.replace(/[^/]*$/, ''); })();
  const PATH_MODE = /^https?:$/.test(location.protocol) && S.urlMode !== 'hash';
  const slugFromURL = () => {
    let rest = '';
    if (PATH_MODE && location.pathname.startsWith(BASE)) rest = decodeURIComponent(location.pathname.slice(BASE.length)).replace(/\/+$/, '').replace(/^index\.html$/i, '');
    return (rest || decodeURIComponent(location.hash.slice(1))).toLowerCase();
  };
  const setURL = i => {
    const url = PATH_MODE ? BASE + encodeURIComponent(P[i].slug) : '#' + P[i].slug;
    try { history.replaceState(null, '', url); } catch (_) {}
    document.title = `${P[i].title} — ${S.name}`;
  };
  const goToURL = instant => {
    const slug = slugFromURL(), i = P.findIndex(p => p.slug === slug);
    if (i >= 0) { instant ? outer.slideTo(i, 0) : outer.slideTo(i); if (instant) { updateText(); setURL(i); } }
    else if (slug && PATH_MODE) history.replaceState(null, '', BASE);   // unknown address → back to the root
  };
  const want = new URLSearchParams(location.search).get('project');            // legacy ?project=$key links
  const wantIdx = want ? P.findIndex(p => p.key === want) : -1;
  if (wantIdx > 0) { outer.slideTo(wantIdx, 0); updateText(); setURL(wantIdx); } else goToURL(true);
  addEventListener('popstate', () => goToURL(false));
  addEventListener('hashchange', () => goToURL(false));

  /* project → project: heavy blur + contrast, text hides, then returns */
  outer.on('slideChangeTransitionStart', () => {
    outerEl.classList.add('blura');
    $('#description-content').classList.add('hideopanew');
    $('#close-desc').classList.add('hideopanew');
    pauseAll();
  });
  outer.on('slideChangeTransitionEnd', () => {
    setTimeout(() => { outerEl.classList.remove('blura', 'infoed'); }, 200);
    updateText();
    setURL(outer.activeIndex);
    $('#description-content').classList.remove('hideopanew');
    $('#close-desc').classList.remove('hideopanew');
    playActive();
  });

  /* ── Left / right arrows drive the active project ────────── */
  addEventListener('keydown', e => {
    const sw = inners[outer.activeIndex];
    if (e.key === 'ArrowLeft') sw.slidePrev();
    else if (e.key === 'ArrowRight') sw.slideNext();
    else if (e.key === 'Escape') {
      if (body.classList.contains('desc-open')) setDesc(false);
      else if (openPanel) showPanel(null);
    }
  });
  $('#nmr').addEventListener('click', () => outer.slideTo(0));

  /* ── Description toggle: [more] opens; Esc or a click anywhere closes ── */
  /* the paragraph starts at the same height (and left edge) as "Clients + Collaborators" in Info */
  function placeParagraph() {
    const r = $('#description-label').getBoundingClientRect();
    const pp = $('#project-paragraph');
    pp.style.setProperty('--para-top', Math.min(Math.max(r.top, 64), innerHeight - 160) + 'px');
    pp.style.setProperty('--para-left', r.left + 'px');
  }
  function setDesc(open) {
    if (open) placeParagraph();
    body.classList.toggle('desc-open', open);
    $('#description-container').classList.toggle('show', open);
    const [more, x] = $$('#close-desc span');
    more.style.display = open ? 'none' : ''; x.style.display = open ? '' : 'none';
  }
  $('#close-desc').addEventListener('click', e => { e.stopPropagation(); setDesc(!body.classList.contains('desc-open')); });
  document.addEventListener('click', () => { if (body.classList.contains('desc-open')) setDesc(false); });

  /* ── Overlays: Info and List share one mechanism ─────────── */
  const panels = {
    info: { el: $('.information-slide:not(.list-slide)'), grid: $('#information-grid'), trigger: $('#info-trigger') },
    list: { el: $('.list-slide'),                          grid: $('#list-grid'),        trigger: $('#list-trigger') },
  };
  let openPanel = null;
  const label = (trigger, isOpen) => {
    const [a, b] = $$('span', trigger);
    a.style.display = isOpen ? 'none' : ''; b.style.display = isOpen ? '' : 'none';
  };
  function showPanel(name) {                       // name | null (close)
    const prev = openPanel;
    if (prev === name) return;
    if (prev) {                                    // fade the old one out
      const p = panels[prev];
      p.grid.classList.remove('unblu'); label(p.trigger, false);
      setTimeout(() => { if (openPanel !== prev) p.el.classList.remove('showi'); }, 300);
    }
    openPanel = name;
    document.dispatchEvent(new Event('showpanel'));
    if (name) {                                    // fade the new one in
      const p = panels[name];
      p.el.classList.add('showi'); label(p.trigger, true);
      setTimeout(() => { if (openPanel === name) p.grid.classList.add('unblu'); }, 300);
    }
    outerEl.classList.toggle('infoed', !!name);    // blur + contrast on the slideshow
    body.classList.toggle('info-open', !!name);
  }
  $('#info-trigger').addEventListener('click', () => showPanel(openPanel === 'info' ? null : 'info'));
  $('#list-trigger').addEventListener('click', () => showPanel(openPanel === 'list' ? null : 'list'));

  /* ── List table (columns: site.listColumns in data.js) ───── */
  const D = window.DATA;
  const COLS = S.listColumns || ['Label', 'Index', 'Location', 'Date', 'Initiators', 'Type'];
  // The list shows every project that has images, a label, or "listOnly": true. Projects without a slide are not clickable.
  const rank = makeRank(S.order);
  const rows = (D.projects || D).filter(e => e.key && (e.listOnly || (e.images && e.images.length) || e.label)).map((e, n) => ({
    idx: P.findIndex(p => p.key === e.key),          // -1 = no slide (no images)
    rank: rank(e.key, n),
    vals: COLS.map(c => c === 'Label' ? (e.label || e.key.replace('$', '')) : (e[c] || '')),
  }));
  const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } };
  let sort = { col: null, dir: null };
  // default order: site.order if given (then data.js order), otherwise random
  const defaultOrder = () => (S.order && S.order.length) ? rows.sort((a, b) => a.rank - b.rank) : shuffle(rows);
  defaultOrder();
  const thead = $('#vars-table thead'), tbody = $('#vars-table tbody');
  thead.innerHTML = '<tr>' + COLS.map((c, i) => `<th class="col-${c.toLowerCase()}" data-i="${i}">${c}</th>`).join('') + '</tr>';
  function renderList() {
    const list = [...rows];
    if (sort.dir) list.sort((a, b) => {
      const x = a.vals[sort.col], y = b.vals[sort.col];
      if (!x) return 1; if (!y) return -1;
      const r = x.localeCompare(y, undefined, { numeric: true });
      return sort.dir === 'asc' ? r : -r;
    });
    tbody.innerHTML = list.map(r => `<tr data-idx="${r.idx}"${r.idx < 0 ? ' class="nolink"' : ''}>` +
      r.vals.map((v, i) => `<td class="col-${COLS[i].toLowerCase()}${v ? '' : ' empty'}">${v || '—'}</td>`).join('') + '</tr>').join('');
  }
  thead.addEventListener('click', e => {
    const th = e.target.closest('th'); if (!th) return;
    const i = +th.dataset.i;
    if (sort.col !== i) sort = { col: i, dir: 'asc' };
    else if (sort.dir === 'asc') sort.dir = 'desc';
    else { sort = { col: null, dir: null }; defaultOrder(); }
    $$('th', thead).forEach(h => h.removeAttribute('data-sort'));
    if (sort.dir) th.dataset.sort = sort.dir;
    renderList();
  });
  tbody.addEventListener('click', e => {           // row → close list, go to that project
    const tr = e.target.closest('tr'); if (!tr || +tr.dataset.idx < 0) return;
    showPanel(null);
    outer.slideTo(+tr.dataset.idx);
  });
  renderList();

  /* ── Hover thumbnail: first image of the hovered project follows the cursor ── */
  const thumb = $('#list-thumb');
  if (matchMedia('(hover: hover)').matches) {
    let cx = 0, cy = 0, shownIdx = -1;
    const place = () => {
      const w = thumb.offsetWidth, h = thumb.offsetHeight, gap = 20, m = 8;
      let x = cx + gap, y = cy + gap;
      if (x + w > innerWidth - m)  x = cx - w - gap;
      if (y + h > innerHeight - m) y = innerHeight - h - m;
      thumb.style.transform = `translate(${Math.max(m, x)}px, ${Math.max(m, y)}px)`;
    };
    const hideThumb = () => { thumb.classList.remove('on'); shownIdx = -1; };
    const showThumb = idx => {
      if (idx === shownIdx) return;
      shownIdx = idx;
      const src = innerEls[idx].querySelector('.media-container img, .media-container video');
      if (!src) return hideThumb();
      const el = src.cloneNode(false);              // same file, already cached by the slideshow
      el.removeAttribute('class'); el.removeAttribute('width'); el.removeAttribute('height');
      if (el.tagName === 'VIDEO') { el.muted = true; el.autoplay = true; el.loop = true; el.setAttribute('playsinline', ''); }
      else el.addEventListener('load', place);
      thumb.replaceChildren(el);
      thumb.classList.add('on'); place();
    };
    tbody.addEventListener('mouseover', e => {
      const tr = e.target.closest('tr');
      if (!tr || +tr.dataset.idx < 0) return hideThumb();
      showThumb(+tr.dataset.idx);
    });
    tbody.addEventListener('mouseleave', hideThumb);
    $('.list-slide').addEventListener('mousemove', e => { cx = e.clientX; cy = e.clientY; if (shownIdx >= 0) place(); });
    $('.list-slide').addEventListener('scroll', hideThumb);
    document.addEventListener('showpanel', hideThumb);
  }

  /* ── Start: the first image goes through the same blur as a project change ──
     (.outer-swiper starts with .blura in the HTML; we reveal it once the first image is ready) */
  const firstImg = $('.inner-swiper.swiper-slide-active img');
  const ready = new Promise(res => {
    if (!firstImg || firstImg.complete) return res();
    firstImg.addEventListener('load', res); firstImg.addEventListener('error', res);
    setTimeout(res, 1500);                          // never wait longer than this
  });
  ready.then(() => requestAnimationFrame(() => {
    body.classList.add('intromob');                 // UI appears (still blurred)
    setTimeout(() => {
      outerEl.classList.remove('blura');            // …and sharpens over .5s
      $('#description-content').classList.remove('hideopanew');
      $('#close-desc').classList.remove('hideopanew');
      playActive();
      scheduleHint();
      showSwipeArrow();
    }, 250);
  }));

  /* ── "Scroll down for more": appears whenever the visitor has been idle for a while ── */
  const HINT_DELAY_FIRST = 8000;                      // ms of calm before the hint appears for the first time
  const HINT_DELAY_AFTER = 16000;                     // ms of calm once it has been seen AND the visitor has scrolled
  let hintSeen = false, understood = false;
  const hint = $('#scroll-hint');
  let hintTimer;
  if (matchMedia('(hover: none)').matches) $('#scroll-hint-text').textContent = 'Swipe up for more';
  function armHint() {                                // hide now, show again after HINT_DELAY of calm
    clearTimeout(hintTimer);
    hint.classList.remove('on');
    if (outer.activeIndex >= P.length - 1) return;    // last project: nothing more to scroll to
    hintTimer = setTimeout(() => {
      if (!openPanel && !body.classList.contains('desc-open')) { hint.classList.add('on'); hintSeen = true; }
    }, understood ? HINT_DELAY_AFTER : HINT_DELAY_FIRST);
  }
  function scheduleHint() { armHint(); }
  /* Touch screens: a down arrow from the start, until another project has been seen */
  const swipeArrow = $('#swipe-arrow');
  function showSwipeArrow() { if (IS_TOUCH && P.length > 1 && outer.activeIndex < P.length - 1 && swipeArrow) swipeArrow.classList.add('on'); }
  outer.on('slideChange', () => { if (swipeArrow) { swipeArrow.classList.remove('on'); setTimeout(() => swipeArrow.remove(), 600); } });

  outer.on('slideChange', () => {
    clearTimeout(hintTimer); hint.classList.remove('on');
    if (hintSeen) understood = true;                  // it was shown and they scrolled → they get it
  });
  outer.on('slideChangeTransitionEnd', armHint);
  inners.forEach(sw => sw.on('slideChange', armHint));  // browsing images also counts as activity
  document.addEventListener('showpanel', armHint);
  hint.addEventListener('click', () => outer.slideNext());
})();