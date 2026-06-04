/**
 * nav.js
 *
 * Fetches nav config from data.json and prepends the site nav
 * into any element with class="site-header", preserving any
 * existing children (e.g. the filter-bar on grid.html).
 */

async function renderNav(dataFile = 'data.json') {
  const header = document.querySelector('.site-header');
  if (!header) return;

  try {
    const response = await fetch(dataFile);
    const data     = await response.json();
    const nav      = data.nav ?? {};

    const currentPage = window.location.pathname.split('/').pop() || 'index.html';

    const navEl = document.createElement('nav');
    navEl.className = 'site-nav';
    navEl.innerHTML = `
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

    // Prepend so existing children (e.g. .filter-bar) are preserved
    header.prepend(navEl);

  } catch (err) {
    console.error('[Nav] Could not load nav from data file:', err);
  }
}

document.addEventListener('DOMContentLoaded', () => renderNav());