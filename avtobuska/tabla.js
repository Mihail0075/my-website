/*
 * Информативна табла за заминувања — Автобуска станица Прилеп
 *
 * Параметри во адресата (опционално):
 *   ?redovi=12     – број на редови на таблата (стандардно: колку што собира екранот)
 *   ?jazik=mk|en   – фиксен јазик (стандардно: наизменично македонски / англиски)
 *   ?vreme=08:00   – симулирано време, за проба или демонстрација
 */
(() => {
  'use strict';

  const DATA = window.VOZEN_RED;
  const params = new URLSearchParams(location.search);
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  const LANG_SWITCH_MS = 8000;
  const REFRESH_MS = 5000;
  const ROUTES_REFRESH_MS = 30000;
  const KEEP_DEPARTED_MIN = 5;
  const FINAL_CALL_MIN = 5;
  const BOARDING_MIN = 15;
  const ON_TIME_MIN = 60;
  const FLAP_CHARS = 'АБВГДЕЖЗИКЛМНОПРСТУФЦШABCDEFGHKLMNOPRSTUVZ0123456789';

  // ---------- Јазик ----------

  const T = {
    mk: {
      departures: 'Заминувања', station: 'Автобуска станица Прилеп',
      colTime: 'Време', colDest: 'Дестинација',
      colCarrier: 'Превозник', colPlatform: 'Перон', colStatus: 'Статус',
      via: 'преку',
      tomorrow: 'утре',
      status: {
        scheduled: 'ЗАКАЖАН', ontime: 'НАВРЕМЕ', boarding: 'КАЧУВАЊЕ',
        final: 'ПОСЛЕДЕН ПОВИК', departed: 'ЗАМИНАТ', cancelled: 'ОТКАЖАН',
        delayed: n => `ДОЦНИ ${n} МИН`
      },
      days: ['недела', 'понеделник', 'вторник', 'среда', 'четврток', 'петок', 'сабота'],
      months: ['јануари', 'февруари', 'март', 'април', 'мај', 'јуни', 'јули',
        'август', 'септември', 'октомври', 'ноември', 'декември']
    },
    en: {
      departures: 'Departures', station: 'Prilep Bus Station',
      colTime: 'Time', colDest: 'Destination',
      colCarrier: 'Carrier', colPlatform: 'Platform', colStatus: 'Remarks',
      via: 'via',
      tomorrow: 'tomorrow',
      status: {
        scheduled: 'SCHEDULED', ontime: 'ON TIME', boarding: 'BOARDING',
        final: 'FINAL CALL', departed: 'DEPARTED', cancelled: 'CANCELLED',
        delayed: n => `DELAYED ${n} MIN`
      },
      days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      months: ['January', 'February', 'March', 'April', 'May', 'June', 'July',
        'August', 'September', 'October', 'November', 'December']
    }
  };

  const CYR_TO_LAT = {
    а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', ѓ: 'gj', е: 'e', ж: 'zh', з: 'z', ѕ: 'dz',
    и: 'i', ј: 'j', к: 'k', л: 'l', љ: 'lj', м: 'm', н: 'n', њ: 'nj', о: 'o', п: 'p',
    р: 'r', с: 's', т: 't', ќ: 'kj', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', џ: 'dzh', ш: 'sh'
  };

  function translit(text) {
    return Array.from(text, ch => {
      const lower = ch.toLowerCase();
      const lat = CYR_TO_LAT[lower];
      if (lat === undefined) return ch;
      return ch === lower ? lat : lat[0].toUpperCase() + lat.slice(1);
    }).join('');
  }

  // Клуч за пребарување: „Krusevo“, „Kruševo“, „krushevo“ и „Крушево“ се совпаѓаат.
  function searchKey(text) {
    return translit(text.toLowerCase())
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/([szcd])h/g, '$1')
      .replace(/([gk])j/g, '$1');
  }

  const lockedLang = T[params.get('jazik')] ? params.get('jazik') : null;
  let lang = lockedLang || 'mk';
  const tr = text => (lang === 'mk' ? text : translit(text));

  // ---------- Време ----------

  let offsetMs = 0;
  const simulated = /^(\d{1,2}):(\d{2})$/.exec(params.get('vreme') || '');
  if (simulated) {
    const target = new Date();
    target.setHours(+simulated[1], +simulated[2], 0, 0);
    offsetMs = target - Date.now();
  }
  const now = () => new Date(Date.now() + offsetMs);

  const pad = n => String(n).padStart(2, '0');
  const hhmm = date => `${pad(date.getHours())}:${pad(date.getMinutes())}`;
  const toMinutes = time => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };
  const isoDay = date => date.getDay() || 7;

  // ---------- Возен ред ----------

  const DAY_SETS = {
    daily: [1, 2, 3, 4, 5, 6, 7],
    weekdays: [1, 2, 3, 4, 5],
    'mon-sat': [1, 2, 3, 4, 5, 6],
    weekend: [6, 7],
    sat: [6],
    sun: [7]
  };
  const DAY_SHORT = ['пон', 'вто', 'сре', 'чет', 'пет', 'саб', 'нед'];
  // Како во официјалниот возен ред: без ознака = пон–саб, * = секој ден, и во недела.
  const DAY_LABELS = { daily: '*', weekdays: 'пон–пет', weekend: 'саб–нед', sat: 'саб', sun: 'само нед' };

  const daysOf = (dep, route) => dep.days || route.days || 'daily';
  const runsOn = (dep, route, day) => {
    const days = daysOf(dep, route);
    return (Array.isArray(days) ? days : DAY_SETS[days] || DAY_SETS.daily).includes(day);
  };
  const daysLabel = days =>
    Array.isArray(days) ? days.map(d => DAY_SHORT[d - 1]).join(', ') : DAY_LABELS[days] || '';

  const viaOf = (dep, route) => dep.via || route.via || '';
  const stopsOf = (dep, route) => viaOf(dep, route).split(',').map(s => s.trim()).filter(Boolean);
  const destName = route => (lang === 'mk' ? route.destination : route.en || translit(route.destination));

  DATA.routes.forEach(route => {
    route.departures.sort((a, b) => toMinutes(a.time) - toMinutes(b.time));
    route.departures.forEach(dep => {
      dep.carrierInfo = DATA.carriers[dep.carrier] || { name: dep.carrier, code: '??', color: '#555' };
    });
  });
  const hasPlatform = DATA.routes.some(route => route.platform);

  function departuresOn(date) {
    const day = isoDay(date);
    const list = [];
    DATA.routes.forEach(route => {
      route.departures.forEach(dep => {
        if (!runsOn(dep, route, day)) return;
        const at = new Date(date);
        at.setHours(0, toMinutes(dep.time), 0, 0);
        list.push({ at, route, dep });
      });
    });
    return list.sort((a, b) => a.at - b.at || a.route.destination.localeCompare(b.route.destination));
  }

  function upcoming(t, count) {
    const today = new Date(t);
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    const shown = d => d.at - t + (d.dep.delay || 0) * 60000 > -KEEP_DEPARTED_MIN * 60000;
    let list = departuresOn(today).filter(shown);
    if (list.length < count) {
      list = list.concat(departuresOn(tomorrow).map(d => ({ ...d, nextDay: true })));
    }
    return list.slice(0, count);
  }

  function statusOf(d, t) {
    if (d.dep.cancelled) return 'cancelled';
    const delay = d.dep.delay || 0;
    const minutes = (d.at - t) / 60000 + delay;
    if (minutes < 0) return 'departed';
    if (minutes <= FINAL_CALL_MIN) return 'final';
    if (minutes <= BOARDING_MIN) return 'boarding';
    if (delay) return 'delayed';
    return minutes <= ON_TIME_MIN ? 'ontime' : 'scheduled';
  }

  const statusText = (status, d) => {
    const label = T[lang].status[status];
    return typeof label === 'function' ? label(d.dep.delay) : label;
  };

  // ---------- Split-flap ----------

  function el(tag, className, attrs) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    Object.entries(attrs || {}).forEach(([k, v]) => node.setAttribute(k, v));
    return node;
  }

  function flapCell(className, width) {
    const cell = el('div', `cell ${className}`, { role: 'cell' });
    const label = el('span', 'sr-only');
    const flaps = el('span', 'flaps', { 'aria-hidden': 'true' });
    for (let i = 0; i < width; i++) {
      const flap = el('span', 'flap');
      flap.textContent = '\u00a0';
      flap.dataset.ch = ' ';
      flaps.appendChild(flap);
    }
    cell.append(label, flaps);
    cell.label = label;
    cell.flaps = flaps.children;
    return cell;
  }

  function paint(flap, ch) {
    flap.textContent = ch === ' ' ? '\u00a0' : ch;
  }

  function flipTo(flap, ch, index) {
    if (flap.dataset.ch === ch) return;
    flap.dataset.ch = ch;
    clearTimeout(flap.startTimer);
    clearInterval(flap.spinTimer);
    if (reducedMotion) {
      paint(flap, ch);
      return;
    }
    let spins = 2 + Math.floor(Math.random() * 5);
    flap.startTimer = setTimeout(() => {
      flap.spinTimer = setInterval(() => {
        const done = spins-- <= 0;
        paint(flap, done ? flap.dataset.ch : FLAP_CHARS[Math.floor(Math.random() * FLAP_CHARS.length)]);
        flap.classList.remove('flip');
        void flap.offsetWidth;
        flap.classList.add('flip');
        if (done) clearInterval(flap.spinTimer);
      }, 70);
    }, index * 30);
  }

  function setFlaps(cell, text) {
    cell.label.textContent = text.trim();
    const flaps = cell.flaps;
    const target = Array.from(text.toUpperCase());
    for (let i = 0; i < flaps.length; i++) flipTo(flaps[i], target[i] || ' ', i);
  }

  // ---------- Табла ----------

  // Ширина на колоните (во плочки) според најдолгиот текст на двата јазика.
  const widest = texts => Math.max(...texts.flatMap(text => [text.length, translit(text).length]));
  const destChars = Math.min(18, Math.max(10, widest(DATA.routes.map(r => r.destination)),
    widest(DATA.routes.map(r => r.en || ''))));
  const root = document.documentElement;
  root.style.setProperty('--dest-chars', destChars);
  root.style.setProperty('--platform-tiles', hasPlatform ? 2 : 0);
  root.classList.toggle('has-platform', hasPlatform);

  const boardView = document.getElementById('view-tabla');
  const boardHead = boardView.querySelector('.board-head');
  const rowsEl = document.getElementById('board-rows');
  let rows = [];

  function createRow() {
    const row = el('div', 'board-row', { role: 'row' });
    const time = flapCell('c-time', 5);
    const nextDay = el('span', 'next-day');
    time.appendChild(nextDay);

    const dest = flapCell('c-dest', destChars);
    const via = el('span', 'via');
    via.textContent = '\u00a0';
    dest.appendChild(via);

    const carrier = el('div', 'cell c-carrier', { role: 'cell' });
    const badge = el('span', 'badge');
    const carrierName = el('span', 'carrier-name');
    carrier.append(badge, carrierName);

    const platform = hasPlatform ? flapCell('c-platform', 2) : null;
    const status = el('div', 'cell c-status', { role: 'cell' });

    row.append(...[time, dest, carrier, platform, status].filter(Boolean));
    rowsEl.appendChild(row);
    return { row, time, nextDay, dest, via, badge, carrierName, platform, status };
  }

  function buildRows() {
    const requested = parseInt(params.get('redovi'), 10);
    rowsEl.replaceChildren();
    rows = [createRow()];
    let count = requested;
    if (!(count > 0)) {
      const available = boardView.clientHeight - boardHead.offsetHeight;
      count = Math.floor(available / rows[0].row.offsetHeight);
    }
    count = Math.min(30, Math.max(5, count || 10));
    while (rows.length < count) rows.push(createRow());
  }

  function renderBoard() {
    const t = now();
    const list = upcoming(t, rows.length);
    rows.forEach((r, i) => {
      const d = list[i];
      r.row.hidden = !d;
      if (!d) return;
      const status = statusOf(d, t);
      const carrier = d.dep.carrierInfo;

      setFlaps(r.time, d.dep.time);
      r.nextDay.textContent = d.nextDay ? T[lang].tomorrow : '';
      setFlaps(r.dest, destName(d.route));
      const via = viaOf(d.dep, d.route);
      r.via.textContent = via ? `${T[lang].via} ${tr(via)}` : '\u00a0';
      r.badge.textContent = tr(carrier.code);
      r.badge.style.background = carrier.color;
      r.carrierName.textContent = tr(carrier.name);
      if (r.platform) setFlaps(r.platform, String(d.route.platform || '').padStart(2, ' '));
      r.status.textContent = statusText(status, d);
      r.status.className = `cell c-status s-${status}`;
      r.row.className = `board-row is-${status}${d.nextDay ? ' is-next-day' : ''}`;
    });
  }

  function applyLabels() {
    document.querySelectorAll('[data-i18n]').forEach(node => {
      node.textContent = T[lang][node.dataset.i18n];
    });
  }

  // ---------- Часовник ----------

  const clockTime = document.getElementById('clock-time');
  const clockDate = document.getElementById('clock-date');

  function renderClock() {
    const t = now();
    clockTime.innerHTML = `${hhmm(t)}<span>:${pad(t.getSeconds())}</span>`;
    clockTime.dateTime = t.toISOString();
    const L = T[lang];
    const weekday = L.days[t.getDay()];
    clockDate.textContent =
      `${weekday[0].toUpperCase()}${weekday.slice(1)}, ${t.getDate()} ${L.months[t.getMonth()]} ${t.getFullYear()}`;
  }

  // ---------- Линии (целосен возен ред) ----------

  const routesEl = document.getElementById('routes');
  const routesDay = document.getElementById('routes-day');
  const searchInput = document.getElementById('route-search');

  function renderRoutes() {
    const t = now();
    const day = isoDay(t);
    const nowMin = t.getHours() * 60 + t.getMinutes();
    const query = searchKey(searchInput.value.trim());

    routesDay.textContent = `Денес е ${T.mk.days[t.getDay()]} — поаѓањата што не сообраќаат денес се затемнети.`;
    routesEl.replaceChildren();

    const matches = DATA.routes.filter(r => !query || searchKey([
      r.destination, r.en || '', ...r.departures.map(dep => viaOf(dep, r))
    ].join(' ')).includes(query));

    if (!matches.length) {
      const empty = el('p', 'routes-empty');
      empty.textContent = 'Нема линија за таа дестинација.';
      routesEl.appendChild(empty);
      return;
    }

    matches.forEach(route => {
      // Поаѓањата на линијата и автобусите на други линии што поминуваат низ оваа дестинација.
      const entries = [];
      DATA.routes.forEach(other => {
        other.departures.forEach(dep => {
          if (other === route) entries.push({ dep, route });
          else if (stopsOf(dep, other).includes(route.destination)) entries.push({ dep, route: other, through: true });
        });
      });
      entries.sort((a, b) => toMinutes(a.dep.time) - toMinutes(b.dep.time));

      const card = el('article', 'route-card');
      const head = el('header', 'route-head');
      const from = el('span', 'route-line');
      from.textContent = route.international ? 'Меѓународна линија' : 'Прилеп →';
      head.appendChild(from);
      if (route.platform) {
        const platform = el('span', 'route-platform');
        platform.textContent = `Перон ${route.platform}`;
        head.appendChild(platform);
      }

      const title = el('h2', 'route-dest');
      title.textContent = route.destination;
      const via = el('p', 'route-via');
      via.textContent = route.via ? `преку ${route.via}` : 'директна линија';

      const carriers = el('p', 'route-carriers');
      const seen = new Set();
      entries.forEach(({ dep }) => {
        if (seen.has(dep.carrier)) return;
        seen.add(dep.carrier);
        const c = dep.carrierInfo;
        const item = el('span', 'route-carrier');
        const badge = el('span', 'badge');
        badge.textContent = c.code;
        badge.style.background = c.color;
        item.append(badge, c.city ? `${c.name} (${c.city})` : c.name);
        carriers.appendChild(item);
      });

      const times = el('ul', 'times');
      let next = null;
      entries.forEach(({ dep, route: owner, through }) => {
        const chip = el('li', 'time-chip');
        const runs = runsOn(dep, owner, day);
        const mins = toMinutes(dep.time);
        if (!runs) chip.classList.add('is-off');
        else if (mins < nowMin) chip.classList.add('is-past');
        else if (!next) {
          chip.classList.add('is-next');
          next = dep;
        }
        chip.title = through ? `${dep.carrierInfo.name} · за ${owner.destination}` : dep.carrierInfo.name;
        chip.textContent = dep.time;
        const notes = [daysLabel(daysOf(dep, owner))];
        if (through) notes.push(`→ ${owner.destination}`);
        else if (dep.via) notes.push(`преку ${dep.via}`);
        notes.filter(Boolean).forEach(note => {
          const mark = el('small');
          mark.textContent = note;
          chip.appendChild(mark);
        });
        times.appendChild(chip);
      });

      const foot = el('p', 'route-next');
      if (next) {
        const diff = toMinutes(next.time) - nowMin;
        const inText = diff < 60 ? `за ${diff} мин` : `за ${Math.floor(diff / 60)} ч ${diff % 60} мин`;
        foot.innerHTML = `Следно поаѓање: <strong>${next.time}</strong> · ${inText}`;
      } else {
        foot.textContent = 'Нема повеќе поаѓања денес.';
        foot.classList.add('is-done');
      }

      card.append(head, title, via, carriers, times, foot);
      routesEl.appendChild(card);
    });
  }

  // ---------- Инфо лента ----------

  function renderTicker() {
    const track = document.getElementById('ticker-track');
    const messages = DATA.announcements.flatMap(a => [a.mk, a.en]);
    if (!DATA.verified) {
      messages.unshift(`Ориентациски возен ред — проверете ги термините на шалтер или на ${DATA.phone}`);
    }
    const text = messages.join('   ◆   ') + '   ◆   ';
    const copy = () => {
      const span = el('span');
      span.textContent = text;
      return span;
    };
    track.replaceChildren(copy(), copy());
    track.style.animationDuration = `${Math.round(text.length * 0.16)}s`;
  }

  // ---------- Прикази и контроли ----------

  const views = { tabla: boardView, linii: document.getElementById('view-linii') };
  let currentView = 'tabla';

  function showView() {
    currentView = location.hash === '#linii' ? 'linii' : 'tabla';
    Object.entries(views).forEach(([name, node]) => { node.hidden = name !== currentView; });
    document.querySelectorAll('.tab').forEach(tab => {
      if (tab.dataset.view === currentView) tab.setAttribute('aria-current', 'page');
      else tab.removeAttribute('aria-current');
    });
    if (currentView === 'linii') renderRoutes();
    else {
      buildRows();
      renderBoard();
    }
  }

  function toggleFullscreen() {
    if (document.fullscreenElement) document.exitFullscreen();
    else if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen();
  }

  document.getElementById('fullscreen').addEventListener('click', toggleFullscreen);
  document.addEventListener('keydown', e => {
    if ((e.key === 'f' || e.key === 'F') && e.target === document.body) toggleFullscreen();
  });
  searchInput.addEventListener('input', renderRoutes);
  addEventListener('hashchange', showView);

  let resizeTimer;
  addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (currentView === 'tabla') {
        buildRows();
        renderBoard();
      }
    }, 250);
  });

  applyLabels();
  renderClock();
  renderTicker();
  showView();

  // Со вчитување на фонтот се менува висината на редовите.
  if (document.fonts) {
    document.fonts.ready.then(() => {
      if (currentView === 'tabla') {
        buildRows();
        renderBoard();
      }
    });
  }

  setInterval(renderClock, 1000);
  setInterval(() => {
    if (currentView === 'tabla') renderBoard();
  }, REFRESH_MS);
  setInterval(() => {
    if (currentView === 'linii') renderRoutes();
  }, ROUTES_REFRESH_MS);

  if (!lockedLang) {
    setInterval(() => {
      lang = lang === 'mk' ? 'en' : 'mk';
      applyLabels();
      renderClock();
      if (currentView === 'tabla') renderBoard();
    }, LANG_SWITCH_MS);
  }
})();
