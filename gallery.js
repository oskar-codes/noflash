/**
 * gallery.js
 *
 * Loads images from data.json and renders them into an auto-fill
 * grid with infinite scroll, a native <dialog> lightbox, and
 * label-based filtering.
 *
 * - Clicking an image  → opens the lightbox
 * - Clicking a label   → filters the grid by the original $var key,
 *                        not the resolved string — so two vars that
 *                        happen to share a display value still filter
 *                        independently.
 * - "Show all" button  → clears the filter
 *
 * Usage:  Gallery.init({ dataFile: 'data.json' });
 */

const Gallery = (() => {

  /* ── State ────────────────────────────────────────────── */
  let allPosts     = [];
  let activeFilter = null;  // $varKey string, or null for unfiltered

  const PAGE_SIZE = 15;

  /* ── DOM refs ─────────────────────────────────────────── */
  let gridElm     = null;
  let sentinelElm = null;
  let statusElm   = null;
  let resetBtnElm = null;
  let observer    = null;

  /* ── Variable resolution ──────────────────────────────── */

  function resolveVar(value, vars) {
    if (typeof value === 'string' && value.startsWith('$') && value in vars) {
      return vars[value];
    }
    return value ?? '';
  }

  /**
   * Resolve a post, keeping the original $varKey as `filterKey`
   * so filtering is always by var identity, not display string.
   *
   * If label is a plain string (no $), filterKey === label,
   * so plain strings still filter correctly among themselves.
   */
  function resolvePost(post, vars) {
    const rawLabel = post.label ?? '';
    const isVar    = typeof rawLabel === 'string' && rawLabel.startsWith('$') && rawLabel in vars;

    return {
      ...post,
      label:     resolveVar(rawLabel, vars),   // display string
      filterKey: isVar ? rawLabel : rawLabel,  // $varName if a var, else the plain string
      date:      resolveVar(post.date, vars),
      alt:       resolveVar(post.alt,  vars),
    };
  }

  /* ── Shuffle ──────────────────────────────────────────── */

  /** Fisher-Yates shuffle — returns a new randomised array. */
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
    resetBtnElm.hidden = false;
  }

  function clearFilter() {
    activeFilter = null;
    rebuildGrid();
    resetBtnElm.hidden = true;
  }

  function rebuildGrid() {
    if (observer) observer.disconnect();
    gridElm.innerHTML = '';
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

      // Image — clicking opens the lightbox
      const img = document.createElement('img');
      img.className = 'card-img';
      img.src       = post.url;
      img.width     = post.width;
      img.height    = post.height;
      img.loading   = 'lazy';
      img.alt       = post.alt || '';

      const meta = document.createElement('div');
      meta.className = 'card-meta';

      // Label — clicking filters by filterKey, displays resolved string
      const labelSpan = document.createElement('span');
      labelSpan.className            = 'card-label';
      labelSpan.textContent          = post.label || '';
      labelSpan.dataset.filterKey    = post.filterKey; // $varName or plain string

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
          statusElm.textContent = !activeFilter ? 'End of posts' : '';
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

    function close() {
      dialog.close();
    }

    gridElm.addEventListener('click', (e) => {
      // Image clicks → lightbox
      const img = e.target.closest('.card-img');
      if (img) { open(img); return; }

      // Label clicks → filter by $varKey
      const label = e.target.closest('.card-label');
      if (label && label.dataset.filterKey) {
        applyFilter(label.dataset.filterKey);
      }
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
    gridElm     = document.querySelector('.index-list');
    sentinelElm = document.querySelector('.index-sentinel');
    statusElm   = document.querySelector('.index-status');
    resetBtnElm = document.querySelector('.filter-reset');

    resetBtnElm.addEventListener('click', clearFilter);

    try {
      statusElm.textContent = 'Loading…';
      const response = await fetch(dataFile);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      const vars  = data.vars ?? {};
      const posts = Array.isArray(data) ? data : (data.posts ?? []);
      allPosts = shuffle(posts.map(post => resolvePost(post, vars)));

    } catch (err) {
      console.error('[Gallery] Could not load data file:', err);
      statusElm.textContent = 'Could not load images.';
      return;
    }

    setupLightbox();
    renderBatch(allPosts, 0);
    setupObserver(allPosts);
  }

  return { init };

})();
