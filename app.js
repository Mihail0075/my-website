/* ============================================
   DATA
============================================ */
const ROUTES = [
  {
    id: 'skopje',
    mk: 'Скопје', en: 'Skopje',
    times: ['06:00','07:30','09:00','10:30','12:00','13:30','15:00','16:30','18:00','19:30'],
    dur: { mk: '2 часа', en: '2h' },
    price: 450,
  },
  {
    id: 'bitola',
    mk: 'Битола', en: 'Bitola',
    times: ['06:30','08:00','10:00','12:00','14:00','16:00','18:00','20:00'],
    dur: { mk: '45 мин', en: '45 min' },
    price: 120,
  },
  {
    id: 'ohrid',
    mk: 'Охрид', en: 'Ohrid',
    times: ['07:00','10:00','14:00','17:00'],
    dur: { mk: '2.5 часа', en: '2.5h' },
    price: 350,
  },
  {
    id: 'veles',
    mk: 'Велес', en: 'Veles',
    times: ['08:30','12:30','16:30'],
    dur: { mk: '1.5 часа', en: '1.5h' },
    price: 250,
  },
  {
    id: 'kicevo',
    mk: 'Кичево', en: 'Kičevo',
    times: ['09:00','14:30'],
    dur: { mk: '2 часа', en: '2h' },
    price: 280,
  },
  {
    id: 'kavadarci',
    mk: 'Кавадарци', en: 'Kavadarci',
    times: ['07:30','11:00','15:30'],
    dur: { mk: '1 час', en: '1h' },
    price: 180,
  },
];

/* ============================================
   STATE
============================================ */
let currentLang = 'mk';
let currentFilter = 'all';

/* ============================================
   LANGUAGE
============================================ */
function setLang(l) {
  currentLang = l;

  document.querySelectorAll('[data-mk]').forEach(el => {
    const val = el.dataset[l];
    if (val !== undefined) el.innerHTML = val;
  });

  document.querySelectorAll('.lang-opt').forEach(opt => {
    opt.classList.toggle('active', opt.dataset.lang === l);
  });

  document.documentElement.lang = l === 'mk' ? 'mk' : 'en';

  renderFilters();
  renderSchedule(currentFilter);
  renderPrices();
  updateTicker();
}

/* ============================================
   NEXT DEPARTURE
============================================ */
function getNextDep() {
  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();
  let bestDiff = Infinity;
  let bestTime = null;
  let bestRoute = null;

  ROUTES.forEach(route => {
    route.times.forEach(t => {
      const [h, m] = t.split(':').map(Number);
      const diff = (h * 60 + m) - nowMin;
      if (diff > 0 && diff < bestDiff) {
        bestDiff = diff;
        bestTime = t;
        bestRoute = route;
      }
    });
  });

  return bestRoute ? { time: bestTime, route: bestRoute, diffMin: bestDiff } : null;
}

function updateTicker() {
  const el = document.getElementById('ticker-value');
  if (!el) return;
  const dep = getNextDep();
  if (!dep) {
    el.textContent = currentLang === 'mk' ? 'Нема повеќе поласки денес' : 'No more departures today';
    return;
  }
  const h = Math.floor(dep.diffMin / 60);
  const m = dep.diffMin % 60;
  const inStr = currentLang === 'mk'
    ? `за ${h > 0 ? h + 'ч ' : ''}${m}мин`
    : `in ${h > 0 ? h + 'h ' : ''}${m}min`;
  el.textContent = `${dep.time} → ${dep.route[currentLang]} (${inStr})`;
}

/* ============================================
   SCHEDULE
============================================ */
function renderFilters() {
  const cont = document.getElementById('schedule-filters');
  if (!cont) return;

  const defs = [{ id: 'all', mk: 'Сите', en: 'All' }, ...ROUTES];

  cont.innerHTML = defs.map(r =>
    `<button class="filter-btn${r.id === currentFilter ? ' active' : ''}" data-filter="${r.id}" data-mk="${r.mk}" data-en="${r.en}">${r[currentLang]}</button>`
  ).join('');

  cont.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      cont.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderSchedule(btn.dataset.filter);
    });
  });
}

function renderSchedule(filter) {
  currentFilter = filter;
  const body = document.getElementById('schedule-body');
  if (!body) return;

  const now = new Date();
  const nowMin = now.getHours() * 60 + now.getMinutes();

  // Find next bus globally (for badge)
  let nextKey = null;
  let nextDiff = Infinity;
  ROUTES.forEach(r => {
    r.times.forEach(t => {
      const [h, m] = t.split(':').map(Number);
      const diff = (h * 60 + m) - nowMin;
      if (diff > 0 && diff < nextDiff) { nextDiff = diff; nextKey = `${r.id}-${t}`; }
    });
  });

  // Build flat rows
  const rows = [];
  ROUTES.forEach(r => {
    if (filter !== 'all' && r.id !== filter) return;
    r.times.forEach(t => rows.push({ r, t }));
  });
  rows.sort((a, b) => a.t.localeCompare(b.t));

  body.innerHTML = '';
  const nextLabel = currentLang === 'mk' ? 'Следен' : 'Next';
  const badge = `<span class="next-badge">${nextLabel}</span>`;

  rows.forEach(({ r, t }, i) => {
    const key = `${r.id}-${t}`;
    const isNext = key === nextKey;
    const [h, m] = t.split(':').map(Number);
    const isPast = (h * 60 + m) <= nowMin;

    const row = document.createElement('div');
    row.className = 'schedule-row' + (isNext ? ' next-bus' : '') + (isPast ? ' past' : '');

    row.innerHTML =
      `<span class="row-dest">${r[currentLang]}${isNext ? badge : ''}</span>` +
      `<span class="row-time">${t}</span>` +
      `<span class="row-dur">${r.dur[currentLang]}</span>` +
      `<span class="row-price">${r.price} МКД</span>`;

    body.appendChild(row);
    setTimeout(() => row.classList.add('visible'), i * 30 + 40);
  });
}

/* ============================================
   PRICES
============================================ */
function renderPrices() {
  const grid = document.getElementById('price-grid');
  if (!grid) return;

  const wayLabel = currentLang === 'mk' ? 'едно патување' : 'one way';
  const durLabel  = currentLang === 'mk' ? 'времетраење'  : 'duration';

  grid.innerHTML = ROUTES.map((r, i) =>
    `<div class="price-card reveal" style="transition-delay:${i * 55}ms">
      <div class="price-dest">${r[currentLang]}</div>
      <div class="price-dur">${r.dur[currentLang]} ${durLabel}</div>
      <div class="price-amount">${r.price}</div>
      <div class="price-unit">МКД / ${wayLabel}</div>
    </div>`
  ).join('');

  grid.querySelectorAll('.reveal').forEach(el => observer.observe(el));
}

/* ============================================
   SCROLL REVEAL
============================================ */
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) { e.target.classList.add('is-visible'); observer.unobserve(e.target); }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -30px 0px' });

/* ============================================
   NAV
============================================ */
function initNav() {
  const nav    = document.getElementById('nav');
  const burger = document.getElementById('nav-burger');
  const links  = document.getElementById('nav-links');

  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 30);
  }, { passive: true });

  burger.addEventListener('click', () => {
    const open = burger.classList.toggle('open');
    links.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', String(open));
  });

  links.querySelectorAll('a').forEach(a => {
    a.addEventListener('click', () => {
      burger.classList.remove('open');
      links.classList.remove('open');
      burger.setAttribute('aria-expanded', 'false');
    });
  });
}

/* ============================================
   CONTACT FORM
============================================ */
function initForm() {
  const form    = document.getElementById('contact-form');
  const success = document.getElementById('form-success');
  if (!form) return;

  form.addEventListener('submit', e => {
    e.preventDefault();
    success.textContent = currentLang === 'mk'
      ? 'Благодариме! Ќе ви одговориме наскоро.'
      : "Thank you! We'll get back to you soon.";
    form.reset();
    setTimeout(() => { success.textContent = ''; }, 5000);
  });
}

/* ============================================
   INIT
============================================ */
document.addEventListener('DOMContentLoaded', () => {
  document.querySelectorAll('.reveal').forEach(el => observer.observe(el));

  initNav();
  initForm();

  document.getElementById('lang-toggle').addEventListener('click', () => {
    setLang(currentLang === 'mk' ? 'en' : 'mk');
  });

  renderFilters();
  renderSchedule('all');
  renderPrices();
  updateTicker();

  setInterval(updateTicker, 60_000);
});
