/**
 * gallery.js
 *
 * Loads images from data.json and renders them into an auto-fill
 * grid with infinite scroll, a native <dialog> lightbox, and
 * label-based filtering with structured metadata.
 *
 * - Clicking an image  → opens the lightbox (click again to close)
 * - Clicking a label   → filters the grid by the project key
 * - "Show all" button  → clears the filter (or returns to index-list)
 *
 * Each project entry in data.json looks like:
 * {
 *   "key":          "$myProject",   // unique $key used for filtering
 *   "label":        "My Project",   // display name shown under images
 *   "Location":     "Oslo, Norway", // any metadata fields (optional)
 *   "Date":         "2024",
 *   "Type":         "Photography",
 *   "images": [
 *     { "url": "…", "width": 900, "height": 1200, "date": "18 April 2026", "alt": "…" }
 *   ]
 * }
 *
 * Usage:  Gallery.init({ dataFile: 'data.json' });
 */

const Gallery = (() => {

  /* ── State ────────────────────────────────────────────── */
  let allPosts     = [];
  let resolvedVars = {};
  let activeFilter = null;

  const PAGE_SIZE = 15;

  /* ── DOM refs ─────────────────────────────────────────── */
  let gridElm       = null;
  let sentinelElm   = null;
  let statusElm     = null;
  let filterBarElm  = null;
  let resetBtnElm   = null;
  let filterDescElm = null;
  let observer      = null;

  /* ── Variable resolution ──────────────────────────────── */

  /**
   * Parse the new flat array format into:
   *   resolvedVars: { $key → { label, meta: [{key, value}] } }
   *   posts:        [ { url, width, height, date, alt, label, filterKey } ]
   */
  function parseData(data) {
    const vars  = {};
    const posts = [];

    for (const entry of data) {
      const { key, label, images = [], ...metaFields } = entry;

      // Build meta array from all fields except key, label, images
      const meta = Object.entries(metaFields)
        .filter(([, v]) => v !== '')   // skip empty fields
        .map(([k, v]) => ({ key: k, value: v }));

      if (key) {
        vars[key] = { label: label || '', meta };
      }

      for (const img of images) {
        posts.push({
          url:       img.url,
          width:     img.width,
          height:    img.height,
          date:      img.date  || '',
          alt:       img.alt   || '',
          label:     key ? (vars[key]?.label || '') : (label || ''),
          filterKey: key || label || '',
        });
      }
    }

    return { vars, posts };
  }

  /* ── Scroll ───────────────────────────────────────────── */

  /**
   * Scroll the page to the top over `duration` milliseconds
   * using an ease-in-out curve.
   * @param {number} duration — ms, default 1800
   */
  function smoothScrollToTop(duration = 1800) {
    const start     = window.scrollY;
    if (start === 0) return;
    const startTime = performance.now();

    function easeInOut(t) {
      return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
    }

    function step(now) {
      const elapsed  = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      window.scrollTo(0, start * (1 - easeInOut(progress)));
      if (progress < 1) requestAnimationFrame(step);
    }

    requestAnimationFrame(step);
  }

  /* ── Shuffle ──────────────────────────────────────────── */

  function shuffle(arr) {
    const a = [...arr];
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  /* ── Filtering ────────────────────────────────────────── */

  function filteredPosts() {
    if (!activeFilter) return allPosts;
    return allPosts.filter(p => p.filterKey === activeFilter);
  }

  function applyFilter(filterKey) {
    activeFilter = filterKey;
    rebuildGrid();

    const varEntry = resolvedVars[filterKey];
    filterDescElm.innerHTML = '';

    if (varEntry?.meta?.length) {
      varEntry.meta.forEach(({ key, value }) => {
        const line = document.createElement('span');
        line.className = 'filter-meta-line';
        if (key) {
          const keySpan = document.createElement('span');
          keySpan.className   = 'filter-meta-key';
          keySpan.textContent = key + ': ';
          line.appendChild(keySpan);
        }
        line.appendChild(document.createTextNode(value));
        filterDescElm.appendChild(line);
      });
    }

    filterBarElm.hidden = false;
  }

  function clearFilter() {
    // If we arrived from the list page, go back there
    const params = new URLSearchParams(window.location.search);
    if (params.get('from') === 'list') {
      window.location.href = 'index-list.html';
      return;
    }
    activeFilter = null;
    rebuildGrid();
    filterBarElm.hidden     = true;
    filterDescElm.innerHTML = '';
  }

  function rebuildGrid() {
    smoothScrollToTop(1800);
    if (observer) observer.disconnect();
    gridElm.innerHTML     = '';
    statusElm.textContent = '';

    const posts = filteredPosts();
    if (!posts.length) {
      statusElm.textContent = 'No images found.';
      return;
    }

    renderBatch(posts, 0);
    setupObserver(posts);
  }

  /* ── Render ───────────────────────────────────────────── */

  function renderBatch(posts, offset) {
    const batch = posts.slice(offset, offset + PAGE_SIZE);
    if (!batch.length) return offset;

    const frag = document.createDocumentFragment();

    batch.forEach((post) => {
      const format = post.width / post.height;

      const card = document.createElement('div');
      card.className = 'card-item';
      card.style.setProperty('--format', String(format));

      const img = document.createElement('img');
      img.className = 'card-img';
      img.src       = post.url;
      img.width     = post.width;
      img.height    = post.height;
      img.loading   = 'lazy';
      img.alt       = post.alt || '';

      const meta = document.createElement('div');
      meta.className = 'card-meta';

      const labelSpan = document.createElement('span');
      labelSpan.className         = 'card-label';
      labelSpan.textContent       = post.label || '';
      labelSpan.dataset.filterKey = post.filterKey;

      const dateSpan = document.createElement('span');
      dateSpan.className   = 'card-date';
      dateSpan.textContent = post.date || '';

      meta.append(labelSpan, dateSpan);
      card.append(img, meta);
      frag.append(card);
    });

    gridElm.append(frag);
    return offset + batch.length;
  }

  /* ── Infinite scroll ──────────────────────────────────── */

  function setupObserver(posts) {
    let rendered = Math.min(posts.length, PAGE_SIZE);
    if (rendered >= posts.length) return;

    observer = new IntersectionObserver(
      (entries, obs) => {
        if (!entries[0].isIntersecting) return;
        obs.unobserve(entries[0].target);
        rendered = renderBatch(posts, rendered);
        if (rendered >= posts.length) {
          obs.disconnect();
          statusElm.textContent = !activeFilter ? 'NF 2026' : '';
        } else {
          obs.observe(entries[0].target);
        }
      },
      { rootMargin: '0px 0px 400px 0px', threshold: 0 }
    );

    observer.observe(sentinelElm);
  }

  /* ── Lightbox ─────────────────────────────────────────── */

  function setupLightbox() {
    const dialog = document.querySelector('.lightbox');
    const imgElm = document.querySelector('.lightbox-img');

    function open(img) {
      imgElm.src    = img.src;
      imgElm.width  = img.width;
      imgElm.height = img.height;
      imgElm.alt    = img.alt;
      dialog.showModal();
    }

    function close() { dialog.close(); }

    gridElm.addEventListener('click', (e) => {
      const img = e.target.closest('.card-img');
      if (img) { open(img); return; }

      const label = e.target.closest('.card-label');
      if (label?.dataset.filterKey) applyFilter(label.dataset.filterKey);
    });

    dialog.addEventListener('click', (e) => {
      if (e.target === imgElm || e.target === dialog) close();
    });

    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close(); }
    });
  }

  /* ── Public API ───────────────────────────────────────── */

  async function init({ dataFile = 'data.json' } = {}) {
    gridElm       = document.querySelector('.index-list');
    sentinelElm   = document.querySelector('.index-sentinel');
    statusElm     = document.querySelector('.index-status');
    filterBarElm  = document.querySelector('.filter-bar');
    resetBtnElm   = document.querySelector('.filter-reset');
    filterDescElm = document.querySelector('.filter-description');

    resetBtnElm.addEventListener('click', clearFilter);

    try {
      statusElm.textContent = 'NF 2026';
      const response = await fetch(dataFile);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      const { vars, posts } = parseData(data.projects ?? data);
      resolvedVars = vars;
      allPosts     = shuffle(posts);

    } catch (err) {
      console.error('[Gallery] Could not load data file:', err);
      statusElm.textContent = 'Could not load images.';
      return;
    }

    setupLightbox();

    // If a filter is in the URL, apply it directly — skip rendering all posts first
    const urlFilter = new URLSearchParams(window.location.search).get('filter');
    if (urlFilter && urlFilter in resolvedVars) {
      activeFilter = urlFilter;

      // Show metadata panel without triggering scroll
      const varEntry = resolvedVars[urlFilter];
      filterDescElm.innerHTML = '';
      if (varEntry?.meta?.length) {
        varEntry.meta.forEach(({ key, value }) => {
          const line = document.createElement('span');
          line.className = 'filter-meta-line';
          if (key) {
            const keySpan = document.createElement('span');
            keySpan.className   = 'filter-meta-key';
            keySpan.textContent = key + ': ';
            line.appendChild(keySpan);
          }
          line.appendChild(document.createTextNode(value));
          filterDescElm.appendChild(line);
        });
      }
      filterBarElm.hidden = false;

      const posts = filteredPosts();
      renderBatch(posts, 0);
      setupObserver(posts);
    } else {
      renderBatch(allPosts, 0);
      setupObserver(allPosts);
    }
  }

  return { init };

})();