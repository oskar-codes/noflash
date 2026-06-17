/**
 * vars-list.js
 *
 * Builds and manages the project index table on index-list.html.
 * Exposed as window.initVarsList() so transition.js can call it
 * after a page swap.
 */

const GALLERY_PAGE = 'grid.html';
const DATA_FILE    = 'data.json';
const COLUMN_ORDER = ['Label', 'Index', 'Location', 'Date', 'Initiators', 'Type'];

let sortState  = { colIndex: null, direction: null };
let rows       = [];
let allColumns = [];
let thead;

async function initVarsList() {
  // Reset state on re-init
  rows       = [];
  allColumns = [];
  sortState  = { colIndex: null, direction: null };

  // Clear any previous table content
  const table = document.getElementById('vars-table');
  if (!table) return;
  table.querySelectorAll('colgroup, thead').forEach(el => el.remove());
  document.getElementById('vars-tbody').innerHTML = '';

  const response = await fetch(DATA_FILE);
  const data     = await response.json();

  // Parse projects
  const vars = {};
  for (const entry of (data.projects ?? data)) {
    if (!entry.key || !entry.images?.length) continue;
    const { key, label, images, ...metaFields } = entry;
    vars[key] = { label, ...metaFields };
  }

  // Strict column allowlist
  const metaKeys = COLUMN_ORDER.filter(k => k !== 'Label');
  allColumns = ['Label', ...metaKeys];

  // Colgroup
  const colgroup = document.createElement('colgroup');
  allColumns.forEach(key => {
    const col = document.createElement('col');
    col.className = 'col-' + key.toLowerCase();
    colgroup.appendChild(col);
  });
  table.prepend(colgroup);

  // Header
  thead = document.createElement('thead');
  const headerRow = document.createElement('tr');
  allColumns.forEach((key, colIndex) => {
    const th = document.createElement('th');
    th.textContent = key;
    th.className   = 'col-' + key.toLowerCase();
    th.addEventListener('click', () => handleHeaderClick(colIndex, th));
    headerRow.appendChild(th);
  });
  thead.appendChild(headerRow);
  table.prepend(thead);

  // Rows
  const tbody = document.getElementById('vars-tbody');
  for (const [varKey, value] of Object.entries(vars)) {
    const { label = '', ...meta } = value;

    const tr = document.createElement('tr');
    tr.addEventListener('click', () => {
      window.location.href = `${GALLERY_PAGE}?filter=${encodeURIComponent(varKey)}&from=list`;
    });

    const labelTd = document.createElement('td');
    labelTd.className   = 'label-cell col-label';
    labelTd.textContent = label;
    tr.appendChild(labelTd);

    metaKeys.forEach(key => {
      const td = document.createElement('td');
      td.className = 'col-' + key.toLowerCase();
      if (meta[key]) {
        td.textContent = meta[key];
      } else {
        td.textContent = 'N/A';
        td.classList.add('empty-cell');
      }
      tr.appendChild(td);
    });

    tbody.appendChild(tr);
    rows.push({ label, meta, tr });
  }

  // Shuffle default order
  for (let i = rows.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [rows[i], rows[j]] = [rows[j], rows[i]];
  }
  renderRows();
}

function handleHeaderClick(colIndex, th) {
  if (sortState.colIndex !== colIndex) {
    sortState = { colIndex, direction: 'asc' };
  } else if (sortState.direction === 'asc') {
    sortState.direction = 'desc';
  } else if (sortState.direction === 'desc') {
    sortState = { colIndex: null, direction: null };
    for (let i = rows.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [rows[i], rows[j]] = [rows[j], rows[i]];
    }
  }
  thead.querySelectorAll('th').forEach(h => h.removeAttribute('data-sort'));
  if (sortState.direction) th.setAttribute('data-sort', sortState.direction);
  renderRows();
}

function getCellValue(row, colIndex) {
  const key = allColumns[colIndex];
  if (key === 'Label') return row.label.toLowerCase();
  return (row.meta[key] ?? '').toLowerCase();
}

function renderRows() {
  const tbody = document.getElementById('vars-tbody');
  let sorted  = [...rows];
  if (sortState.direction) {
    sorted.sort((a, b) => {
      const av = getCellValue(a, sortState.colIndex);
      const bv = getCellValue(b, sortState.colIndex);
      if (!av || av === '—') return 1;
      if (!bv || bv === '—') return -1;
      const cmp = av.localeCompare(bv);
      return sortState.direction === 'asc' ? cmp : -cmp;
    });
  }
  sorted.forEach(row => tbody.appendChild(row.tr));
}

window.initVarsList = initVarsList;
// initVarsList is called by transition.js (LIST_PAGES) or directly from index-list.html