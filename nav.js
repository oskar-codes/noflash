/**
 * nav.js
 *
 * Fetches nav config from data.json and prepends the site nav
 * into any element with class="site-header", preserving any
 * existing children (e.g. the filter-bar on grid.html).
 *
 * Uses sessionStorage to cache the rendered nav HTML so that
 * full-page reloads (e.g. grid.html) show the nav instantly
 * with no visible flash.
 */

async function renderNav(dataFile = 'data.json') {
  const header = document.querySelector('.site-header');
  if (!header) return;

  const CACHE_KEY = 'nav-html-cache';
  const currentPage = window.location.pathname.split('/').pop() || 'index.html';

  function buildNavHTML(nav) {
    return `
      <h1 class="site-title">
        <a class="site-title-link" href="${nav.title_url ?? '/'}">${nav.title ?? ''}</a>
      </h1>
      ${nav.description ? `<p class="site-description">${nav.description}</p>` : ''}
      <ul class="nav-list">
        ${(nav.links ?? []).map(link => {
          const linkPage  = link.url.split('/').pop();
          const isCurrent = currentPage === linkPage;
          return `<li class="nav-list-item">
            <a class="nav-list-link" href="${link.url}"${isCurrent ? ' aria-current="page"' : ''}>${link.label}</a>
          </li>`;
        }).join('')}
      </ul>
    `;
  }

  function positionBlurLayers() {
    const header = document.querySelector('.site-header');
    if (!header) return;
    const h = header.getBoundingClientRect().height;

    let el = document.querySelector('.blur-zone');
    if (!el) {
      el = document.createElement('div');
      el.className = 'blur-zone';
      document.body.appendChild(el);
    }

    el.style.cssText = `
      position: fixed;
      inset-inline: 0;
      top: 0px;
      height: 200px;
      pointer-events: none;
      z-index: 9;
      background: color-mix(in srgb, var(--color-surface) 20%, transparent);
      mix-blend-mode: hard-light;
      backdrop-filter: blur(var(--main-blur));
      -webkit-backdrop-filter: blur(var(--main-blur));
      mask-image: linear-gradient(to bottom, black 80%, transparent 100%);
      -webkit-mask-image: linear-gradient(to bottom, black 80%, transparent 100%);
    `;
  }

  window.positionBlurLayers = positionBlurLayers;

  function injectNav(innerHTML) {
    // Remove any previously injected nav (avoid duplicates on re-init)
    const existing = header.querySelector('.site-nav');
    if (existing) existing.remove();

    const navEl = document.createElement('nav');
    navEl.className = 'site-nav';
    navEl.innerHTML = innerHTML;
    header.prepend(navEl);
  }

  // Apply cached nav immediately (eliminates flash on full-page loads)
  const cached = sessionStorage.getItem(CACHE_KEY);
  if (cached) {
    try {
      const { navHTML } = JSON.parse(cached);
      injectNav(navHTML);
      // Still update aria-current for this page
      header.querySelectorAll('.nav-list-link').forEach(a => {
        const linkPage = a.getAttribute('href').split('/').pop();
        if (linkPage === currentPage) {
          a.setAttribute('aria-current', 'page');
        } else {
          a.removeAttribute('aria-current');
        }
      });
    } catch (_) { /* ignore stale cache */ }
  }

  // Fetch fresh data and re-render (updates cache for next load)
  try {
    const response = await fetch(dataFile);
    const data     = await response.json();
    const nav      = data.nav ?? {};

    const navHTML = buildNavHTML(nav);

    // Cache the nav structure (without aria-current — applied per-page above)
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ navHTML }));

    injectNav(navHTML);

    // Re-apply aria-current after fresh render
    header.querySelectorAll('.nav-list-link').forEach(a => {
      const linkPage = a.getAttribute('href').split('/').pop();
      if (linkPage === currentPage) {
        a.setAttribute('aria-current', 'page');
      } else {
        a.removeAttribute('aria-current');
      }
    });

  } catch (err) {
    console.error('[Nav] Could not load nav from data file:', err);
  }

  positionBlurLayers();
}

document.addEventListener('DOMContentLoaded', () => renderNav());