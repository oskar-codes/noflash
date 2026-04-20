/**
 * gallery.js
 *
 * Loads images from data.json and renders them into an auto-fill
 * grid with infinite scroll, a native <dialog> lightbox, and
 * label-based filtering with structured metadata.
 *
 * - Clicking an image  → opens the lightbox (click again to close)
 * - Clicking a label   → filters the grid by the original $var key
 * - "Show all" button  → clears the filter
 *
 * vars in data.json accept any of these shapes:
 *
 *   "$key": "Label"
 *   "$key": ["Label", "Plain description"]
 *   "$key": {
 *     "label":         "Display name",   // required
 *     "Client":        "Acme Studio",    // any fields you want
 *     "Location":      "London, UK",
 *     "Date":          "2023–2024",
 *     "Collaborators": "Jane Doe",
 *     "Type":          "Architecture"
 *     // … add or remove fields freely
 *   }
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
   * Normalise a var value into { label, meta }
   * where meta is an ordered array of { key, value } pairs
   * (everything except "label" in the object).
   */
  function parseVars(vars) {
    const out = {};
    for (const [key, value] of Object.entries(vars)) {
      if (typeof value === 'string') {
        out[key] = { label: value, meta: [] };
      } else if (Array.isArray(value)) {
        out[key] = { label: value[0] ?? '', meta: value[1] ? [{ key: '', value: value[1] }] : [] };
      } else if (typeof value === 'object' && value !== null) {
        const { label = '', ...rest } = value;
        out[key] = {
          label,
          meta: Object.entries(rest).map(([k, v]) => ({ key: k, value: v })),
        };
      }
    }
    return out;
  }

  function resolveVar(value) {
    if (typeof value === 'string' && value.startsWith('$') && value in resolvedVars) {
      return resolvedVars[value].label;
    }
    return value ?? '';
  }

  function resolvePost(post) {
    const rawLabel = post.label ?? '';
    const isVar    = typeof rawLabel === 'string' && rawLabel.startsWith('$') && rawLabel in resolvedVars;
    return {
      ...post,
      label:     isVar ? resolvedVars[rawLabel].label : rawLabel,
      filterKey: rawLabel,
      date:      resolveVar(post.date),
      alt:       resolveVar(post.alt),
    };
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
    activeFilter = null;
    rebuildGrid();
    filterBarElm.hidden     = true;
    filterDescElm.innerHTML = '';
  }

  function rebuildGrid() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
      statusElm.textContent = 'Loading…';
      const response = await fetch(dataFile);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();

      resolvedVars = parseVars(data.vars ?? {});
      const posts  = Array.isArray(data) ? data : (data.posts ?? []);
      allPosts     = shuffle(posts.map(resolvePost));

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
