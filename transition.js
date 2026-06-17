/**
 * transition.js
 *
 * Intercepts internal link clicks, fetches the target page,
 * swaps only the <main> content, and updates the URL —
 * leaving the nav rendered and visible throughout.
 *
 * Include this script on every page, after nav.js.
 */

const Transition = (() => {

  // Pages excluded from swapping — do a full navigation instead
  const FULL_LOAD_PAGES = ['grid.html'];

  // (VarsList init is handled by the inline script in index-list.html)

  /** Dynamically load a script. If already loaded, re-executes it. */
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      // Remove existing tag so the script re-executes on revisit
      const existing = document.querySelector(`script[src="${src}"]`);
      if (existing) existing.remove();

      const s = document.createElement('script');
      s.src = src;
      s.onload  = resolve;
      s.onerror = reject;
      document.head.appendChild(s);
    });
  }

  function currentPage() {
    return window.location.pathname.split('/').pop() || 'index.html';
  }

  /** Fetch a page and return its <main>, <title>, and body scripts */
  async function fetchPage(url) {
    const response = await fetch(url);
    const html     = await response.text();
    const doc      = new DOMParser().parseFromString(html, 'text/html');

    // Collect scripts from <body> that aren't already loaded infrastructure
    const SKIP = ['nav.js', 'transition.js'];
    const scripts = [...doc.querySelectorAll('body script')].map(s => ({
      src:  s.src  ? new URL(s.src).pathname.split('/').pop() : null,
      text: s.textContent,
    })).filter(s => !SKIP.includes(s.src));

    return {
      main:    doc.querySelector('main'),
      title:   doc.querySelector('title')?.textContent ?? '',
      scripts,
    };
  }

  /** Update aria-current on nav links to reflect the new page */
  function updateNav(pageName) {
    document.querySelectorAll('.nav-list-link').forEach(a => {
      const linkPage = a.getAttribute('href').split('/').pop();
      if (linkPage === pageName) {
        a.setAttribute('aria-current', 'page');
      } else {
        a.removeAttribute('aria-current');
      }
    });
  }

  async function navigate(url) {
    const mainEl = document.querySelector('main');
    if (!mainEl) return;

    try {
      // Fade out
      mainEl.style.transition = 'opacity 0.15s';
      mainEl.style.opacity    = '0';

      const { main: newMain, title, scripts } = await fetchPage(url);
      if (!newMain) return;

      // Swap content
      mainEl.innerHTML  = newMain.innerHTML;
      mainEl.className  = newMain.className;
      document.title    = title;

      // Hide filter bar if navigating away from a filtered grid view
      const filterBar = document.querySelector('.filter-bar');
      if (filterBar) filterBar.hidden = true;

      // Execute page-level scripts from the fetched page (outside <main>)
      for (const { src, text } of scripts) {
        const s = document.createElement('script');
        if (src) {
          // Only load external scripts not already present
          if (!document.querySelector(`script[src="${src}"]`)) {
            await new Promise((res, rej) => {
              s.src = src; s.onload = res; s.onerror = rej;
              document.head.appendChild(s);
            });
          }
        } else if (text) {
          s.textContent = text;
          document.head.appendChild(s);
        }
      }

      // Update URL and nav
      history.pushState({}, title, url);
      const pageName = url.split('/').pop() || 'index.html';
      updateNav(pageName);

      // Re-position fixed blur layers (header height may have changed)
      if (typeof window.positionBlurLayers === 'function') window.positionBlurLayers();

      // Fade in
      mainEl.style.opacity = '1';

      // Scroll to top
      window.scrollTo({ top: 0 });

    } catch (err) {
      // Fall back to normal navigation on error
      window.location.href = url;
    }
  }

  function handleClick(e) {
    const a = e.target.closest('a');
    if (!a) return;

    const href = a.getAttribute('href');
    if (!href) return;

    const isRelative  = !href.startsWith('http') && !href.startsWith('//');
    const isExternal  = a.target === '_blank';
    const isAnchor    = href.startsWith('#');
    const hasModifier = e.metaKey || e.ctrlKey || e.shiftKey || e.altKey;

    if (!isRelative || isExternal || isAnchor || hasModifier) return;

    const target   = new URL(href, window.location.href);
    const pageName = target.pathname.split('/').pop() || 'index.html';

    // Let complex pages load normally
    if (FULL_LOAD_PAGES.includes(pageName)) return;

    // Same page — do nothing
    if (pageName === currentPage()) return;

    e.preventDefault();
    navigate(pageName + target.search);
  }

  function handlePopState() {
    const url = window.location.pathname.split('/').pop() || 'index.html'
      + window.location.search;
    navigate(url);
  }

  function init() {
    document.addEventListener('click', handleClick);
    window.addEventListener('popstate', handlePopState);
  }

  return { init, navigate };

})();

document.addEventListener('DOMContentLoaded', () => Transition.init());