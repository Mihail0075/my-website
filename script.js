/* ============================================================
   Автобуска Станица Прилеп — script.js
   ============================================================ */

/* ------------------------------------------------------------
   ПРЕВОДИ / TRANSLATIONS
   ------------------------------------------------------------ */
const I18N = {
  mk: {
    htmlTitle: "Автобуска Станица Прилеп",
    logoShort: "АС",
    logoCity: "Прилеп",
    navDest: "Дестинации",
    navSched: "Распоред",
    navInfo: "Информации",
    menuLabel: "Мени",
    langLabel: "Јазик",
    arrowLeft: "Скролај лево",
    arrowRight: "Скролај десно",
    scrollDown: "Скролај надолу",

    heroEyebrow: "Информатор за линиски превоз",
    heroKicker: "Автобуска станица",
    heroCity: "Прилеп",
    btnSchedule: "Види распоред",
    btnInfo: "Информации",
    btnTicket: "Купи билет онлајн",

    destEyebrow: "Дестинации",
    destTitle: "Каде патуваш денес?",
    destSub: "Пребарај или избери град за да го видиш распоредот на поаѓања.",
    departures: "поаѓања",

    schedEyebrow: "Распоред на поаѓања",
    schedNote: "Деновите на возење се наведени кај секоја линија. Распоредот е информативен — за точен термин на поаѓање јавете се на билетарата на 048 400 307 или 075 448 023.",
    schedNoteHoliday: "За време на празници распоредот може да отстапува — препорачуваме задолжителна потврда по телефон пред патувањето.",
    routeTo: "Прилеп → {city}",
    routeFrom: "{city} → Прилеп",
    dirOut: "Поаѓања од Прилеп",
    dirIn: "Поаѓања за Прилеп",
    intlTitle: "Меѓународни линии",
    lines: "линии",
    line: "линија",
    via: "преку:",
    direct: "директна линија",
    retPrefix: "повратен:",
    studentPrefix: "студентска:",
    /* кратки ознаки за компактниот ред „од Прилеп“ — валутата ја носи
       главната цена над нив, па тука не се повторува */
    retShort: "повратен",
    studentShort: "студ.",
    tagNext: "Следно поаѓање",
    tagPassed: "Поминато",
    localCarrier: "Прилепски превозник",
    empty: "Нема регистрирани поаѓања за оваа дестинација.",
    stopsLabel: "Истиот автобус вози и до",
    notToday: "Не вози денес",
    onlyToday: "Само денешни",
    allLines: "Сите линии",
    noneToday: "Денес нема поаѓања кон оваа дестинација.",

    nextDeparture: "Следно поаѓање",
    nextTomorrow: "Прво поаѓање утре",
    departingNow: "поаѓа сега",
    inMin: "за {n} мин",
    inHours: "за {h} ч и {m} мин",

    searchPlaceholder: "Пребарај град…",
    searchClear: "Исчисти",
    groupMain: "Главни дестинации",
    groupIntl: "Меѓународни",
    groupOther: "Останати дестинации",
    dayShort: ["пон", "вто", "сре", "чет", "пет", "саб", "нед"],
    noMatch: "Нема град со тоа име.",

    currency: "ден",
    student: "студ.",

    monSat: "пон – саб",
    monFri: "пон – пет",
    everyDay: "секој ден",
    everySat: "секоја сабота",
    wedSat: "среда и сабота",
    dayNames: ["недела", "понеделник", "вторник", "среда", "четврток", "петок", "сабота"],

    infoEyebrow: "Информации",
    infoTitle: "Автобуска Станица Прилеп",
    cardHours: "Работно време",
    hoursWeek: "пон – саб",
    hoursSun: "недела",
    cardLuggage: "Гардероб",
    luggageText: "Оставете го багажот на сигурно додека чекате или разгледувате.",
    cardShop: "Мини маркет и кафе",
    shopText: "Кафе, чај, топло чоколадо, пијалоци и слатки во самата станица.",
    cardEv: "Полнач за електрични возила",
    evText: "22 kW со европски приклучок",
    evPrice: "18 ден за kWh",
    cardTaxi: "Такси до аеродроми",
    taxiText: "Скопје, Солун, Тирана, Приштина, Софија и Белград.",
    ticketWarning: "Внимание: единствено порталот pelagonija.mk продава важечки билети за поаѓања од Прилеп. Уплатите преку други сајтови не се признаваат и не резервираат место во автобусот.",
    cardOffice: "Билетара",
    cardLocation: "Локација",
    locationAddr: "бул. „Гоце Делчев“ бр. 79",
    locationCity: "Прилеп",
    locationGo: "Отвори во Google Maps",
    cardPayment: "Плаќање",
    payCounter: "Билети на шалтер",
    payMethods: "Готовина и картичка",
    footerName: "Автобуска Станица Прилеп",
    footerCopy: "© {year} Автобуска Станица Прилеп · Информативен распоред",
  },

  en: {
    htmlTitle: "Prilep Bus Station",
    logoShort: "BS",
    logoCity: "Prilep",
    navDest: "Destinations",
    navSched: "Schedule",
    navInfo: "Information",
    menuLabel: "Menu",
    langLabel: "Language",
    arrowLeft: "Scroll left",
    arrowRight: "Scroll right",
    scrollDown: "Scroll down",

    heroEyebrow: "Bus line information",
    heroKicker: "Bus station",
    heroCity: "Prilep",
    btnSchedule: "View schedule",
    btnInfo: "Information",
    btnTicket: "Buy ticket online",

    destEyebrow: "Destinations",
    destTitle: "Where are you travelling today?",
    destSub: "Search or pick a city to see its departure times.",
    departures: "departures",

    schedEyebrow: "Departure schedule",
    schedNote: "Operating days are shown on each line. This schedule is informative — call the ticket office at 048 400 307 or 075 448 023 to confirm the exact departure time.",
    schedNoteHoliday: "During public holidays the schedule may change — we strongly recommend confirming by phone before you travel.",
    routeTo: "Prilep → {city}",
    routeFrom: "{city} → Prilep",
    dirOut: "Departures from Prilep",
    dirIn: "Departures to Prilep",
    intlTitle: "International lines",
    lines: "lines",
    line: "line",
    via: "via:",
    direct: "direct line",
    retPrefix: "return:",
    studentPrefix: "student:",
    retShort: "return",
    studentShort: "student",
    tagNext: "Next departure",
    tagPassed: "Departed",
    localCarrier: "Prilep carrier",
    empty: "No departures listed for this destination.",
    stopsLabel: "The same bus also serves",
    notToday: "Not running today",
    onlyToday: "Today only",
    allLines: "All lines",
    noneToday: "No departures to this destination today.",

    nextDeparture: "Next departure",
    nextTomorrow: "First departure tomorrow",
    departingNow: "departing now",
    inMin: "in {n} min",
    inHours: "in {h} h {m} min",

    searchPlaceholder: "Search for a city…",
    searchClear: "Clear",
    groupMain: "Main destinations",
    groupIntl: "International",
    groupOther: "Other destinations",
    dayShort: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    noMatch: "No city with that name.",

    currency: "MKD",
    student: "student",

    monSat: "Mon – Sat",
    monFri: "Mon – Fri",
    everyDay: "every day",
    everySat: "every Saturday",
    wedSat: "Wed and Sat",
    dayNames: ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"],

    infoEyebrow: "Information",
    infoTitle: "Prilep Bus Station",
    cardHours: "Opening hours",
    hoursWeek: "Mon – Sat",
    hoursSun: "Sunday",
    cardLuggage: "Luggage storage",
    luggageText: "Leave your bags safely while you wait or look around town.",
    cardShop: "Mini market and café",
    shopText: "Coffee, tea, hot chocolate, drinks and snacks inside the station.",
    cardEv: "EV charging point",
    evText: "22 kW with a European plug",
    evPrice: "18 MKD per kWh",
    cardTaxi: "Taxi to airports",
    taxiText: "Skopje, Thessaloniki, Tirana, Pristina, Sofia and Belgrade.",
    ticketWarning: "Please note: pelagonija.mk is the only portal selling valid tickets for departures from Prilep. Payments made through other sites are not recognised and reserve no seat on the bus.",
    cardOffice: "Ticket office",
    cardLocation: "Location",
    locationAddr: "Goce Delcev Blvd. no. 79",
    locationCity: "Prilep",
    locationGo: "Open in Google Maps",
    cardPayment: "Payment",
    payCounter: "Tickets at the counter",
    payMethods: "Cash and card",
    footerName: "Prilep Bus Station",
    footerCopy: "© {year} Prilep Bus Station · Informative schedule",
  },
};

/* Кирилица → латиница. Селата ги нема во ниту еден речник, па се
   пресликуваат буква по буква; исклучоците подолу ги фаќаат градовите
   што имаат утврдено име на англиски. */
const TRANSLIT = {
  "а": "a", "б": "b", "в": "v", "г": "g", "д": "d", "ѓ": "gj", "е": "e",
  "ж": "zh", "з": "z", "ѕ": "dz", "и": "i", "ј": "j", "к": "k", "л": "l",
  "љ": "lj", "м": "m", "н": "n", "њ": "nj", "о": "o", "п": "p", "р": "r",
  "с": "s", "т": "t", "ќ": "kj", "у": "u", "ф": "f", "х": "h", "ц": "c",
  "ч": "ch", "џ": "dj", "ш": "sh",
};

function translit(text) {
  let out = "";
  for (const ch of text) {
    const lower = ch.toLowerCase();
    const rep = TRANSLIT[lower];
    if (!rep) { out += ch; continue; }
    out += ch === lower ? rep : rep.charAt(0).toUpperCase() + rep.slice(1);
  }
  return out;
}

/* градови чие англиско име не е обична транслитерација */
const NAMES_EN = {
  "Белград": "Belgrade",
  "Софија": "Sofia",
  "Ниш": "Nis",
  "Ќустендил": "Kyustendil",
  "Виена": "Vienna",
  "Гразд": "Graz",
  "Прага": "Prague",
  "Минхен": "Munich",
  "Фрајбург": "Freiburg",
  "Стутгарт": "Stuttgart",
  "Карлсруе": "Karlsruhe",
  "Офенбург": "Offenburg",
  "БЕРЛИН": "Berlin",
  "ДРЕСДЕН": "Dresden",
  "ХАМБУРГ": "Hamburg",
  "ХАНОВЕР": "Hanover",
  "БУДИМПЕШТА": "Budapest",
  "БРАТИСЛАВА": "Bratislava",
  "БАРСЕЛОНА": "Barcelona",
};


/* ------------------------------------------------------------
   ЛИНИИ — се градат од data.js (официјалниот возен ред)
   Секое поаѓање станува објект за полесно читање подолу.
   ------------------------------------------------------------ */
function buildRoutes(src) {
  const out = {};
  Object.entries(src).forEach(([city, list]) => {
    /* stud/retStud (студентска цена) и direct се дополнителни,
       необврзувачки членови на низата — stud/retStud постојат само кај
       линиите со посебна студентска тарифа (засега само Роман – Скопје);
       direct=true значи дека линијата не застанува никаде по пат */
    out[city] = list.map(([time, ci, price, ret, days, stud, retStud, direct]) => {
      /* ci = -1 означува дека превозникот сè уште не е познат */
      const carrier = ci >= 0 ? CARRIERS[ci] : "";
      return {
        time,
        carrier,
        price,
        ret,
        days,
        stud,
        retStud,
        direct,
        local: LOCAL_CARRIERS.has(carrier),
      };
    });
  });
  return out;
}

const ROUTES_OUT = buildRoutes(DEST);
const ROUTES_IN = buildRoutes(INBOUND);
/* страната секогаш се отвора на поаѓања ОД Прилеп */
let direction = "out";
let ROUTES = ROUTES_OUT;

const CITY_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;
const GLOBE_ICON = `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>`;
const STAR_ICON = `<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m12 2 2.9 6.26 6.85.72-5.1 4.6 1.43 6.72L12 16.9 5.92 20.3l1.43-6.72-5.1-4.6 6.85-.72z"/></svg>`;
const INTL_SET = new Set(GROUPS.intl);

/* ------------------------------------------------------------
   Јазик
   ------------------------------------------------------------ */
let lang = localStorage.getItem("lang") === "en" ? "en" : "mk";
const t = (key) => I18N[lang][key];

/* име на град/место на тековниот јазик */
function placeName(mkName) {
  if (lang === "mk") return mkName;
  return NAMES_EN[mkName] || translit(mkName);
}

function carrierName(mkName) {
  if (lang === "mk") return mkName;
  return mkName; /* имињата на превозниците се сопствени и не се преведуваат */
}

function priceText(trip) {
  return trip.price ? `${trip.price} ${t("currency")}` : "";
}

function returnText(trip) {
  return trip.ret ? `${t("retPrefix")} ${trip.ret} ${t("currency")}` : "";
}

function studentText(trip) {
  if (!trip.stud) return "";
  const single = `${t("studentPrefix")} ${trip.stud} ${t("currency")}`;
  const ret = trip.retStud ? ` / ${trip.retStud} ${t("currency")}` : "";
  return single + ret;
}

/* Компактна споредна линија за редот „од Прилеп“: без повторена валута
   (главната цена веднаш над неа ја носи) и без долги наслови, за да
   зоната за цена не го стиска името на превозникот. */
function priceSubText(trip) {
  const parts = [];
  if (trip.ret) parts.push(`${t("retShort")} ${trip.ret}`);
  if (trip.stud) {
    parts.push(`${t("studentShort")} ${trip.stud}${trip.retStud ? `/${trip.retStud}` : ""}`);
  }
  return parts.join(" · ");
}

function stopPriceText(stop) {
  if (!stop.price) return "—";
  let s = `${stop.price} ${t("currency")}`;
  if (stop.ret) s += ` · ${t("retPrefix")} ${stop.ret} ${t("currency")}`;
  return s;
}

/* Другите места до кои стигнува истото поаѓање (ист час, ист превозник) */
function alongTheWay(trip, city) {
  const out = [];
  if (!trip.carrier) return out; // без превозник не може да се спои „истиот автобус“
  Object.entries(ROUTES).forEach(([dest, list]) => {
    if (dest === city) return;
    const same = list.find((o) => o.time === trip.time && o.carrier === trip.carrier);
    if (same) out.push({ name: dest, price: same.price, ret: same.ret });
  });
  return out.sort((a, b) => a.price - b.price);
}

const mainTrack = document.getElementById("mainTrack");
const intlTrack = document.getElementById("intlTrack");
const otherTrack = document.getElementById("otherTrack");
const groupMain = document.getElementById("groupMain");
const groupIntl = document.getElementById("groupIntl");
const groupOther = document.getElementById("groupOther");
const citiesEmpty = document.getElementById("citiesEmpty");
const citySearch = document.getElementById("citySearch");
const citySearchClear = document.getElementById("citySearchClear");
const scheduleList = document.getElementById("scheduleList");
const scheduleCity = document.getElementById("scheduleCity");
const lineCount = document.getElementById("lineCount");

/* GROUPS.other го носи редоследот по големина; сè што случајно недостига
   таму се додава на крајот за да не испадне некоја дестинација од листата */
const grouped = new Set([...GROUPS.main, ...GROUPS.intl, ...GROUPS.other]);
let cities = [];
let mainCities = [];
let intlCities = [];
let otherCities = [];
let activeCity = "";

function refreshCityLists() {
  cities = Object.keys(ROUTES);
  mainCities = GROUPS.main.filter((c) => ROUTES[c]);
  intlCities = GROUPS.intl.filter((c) => ROUTES[c]);
  otherCities = [
    ...GROUPS.other.filter((c) => ROUTES[c]),
    ...cities.filter((c) => !grouped.has(c)),
  ];
  if (!ROUTES[activeCity]) activeCity = mainCities[0] || cities[0] || "";
}
refreshCityLists();

function setDirection(next) {
  if (next === direction) return;
  direction = next;
  ROUTES = next === "in" ? ROUTES_IN : ROUTES_OUT;
  activeCity = "";
  refreshCityLists();
  document.querySelectorAll(".dir-btn").forEach((btn) => {
    const on = btn.dataset.dir === direction;
    btn.classList.toggle("is-active", on);
    btn.setAttribute("aria-pressed", String(on));
  });
  renderCities();
  renderSchedule();
}

document.querySelectorAll(".dir-btn").forEach((btn) => {
  btn.addEventListener("click", () => setDirection(btn.dataset.dir));
});
let query = "";

/* ------------------------------------------------------------
   Денови на возење — маска: 1=пон 2=вто 4=сре 8=чет 16=пет 32=саб 64=нед
   ------------------------------------------------------------ */
/* Date.getDay(): 0 = недела … 6 = сабота */
function dayBit(jsDay) {
  return jsDay === 0 ? 6 : jsDay - 1;
}

function runsOn(trip, jsDay) {
  return ((trip.days >> dayBit(jsDay)) & 1) === 1;
}

function daysLabel(mask) {
  if (mask === 127) return t("everyDay");
  if (mask === 63) return t("monSat");
  if (mask === 31) return t("monFri");
  const short = t("dayShort");
  const on = [];
  for (let i = 0; i < 7; i++) if ((mask >> i) & 1) on.push(short[i]);
  return on.join(", ");
}

function toMinutes(time) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function nowMinutes() {
  const now = new Date();
  return now.getHours() * 60 + now.getMinutes();
}

/* ------------------------------------------------------------
   Градови — хоризонтален скрол + пребарување
   ------------------------------------------------------------ */
function matchesQuery(city) {
  if (!query) return true;
  return `${city} ${NAMES_EN[city] || ""} ${translit(city)}`.toLowerCase().includes(query);
}

function cityCard(city) {
  const isIntl = INTL_SET.has(city);
  const card = document.createElement("button");
  card.className =
    "city-card" +
    (isIntl ? " city-card--intl" : "") +
    (city === activeCity ? " is-active" : "");
  card.type = "button";
  card.dataset.city = city;
  card.innerHTML = `
    <span class="city-card__icon">${isIntl ? GLOBE_ICON : CITY_ICON}</span>
    <span class="city-card__name">${placeName(city)}</span>
    <span class="city-card__count">${ROUTES[city].length} ${t("departures")}</span>
  `;
  card.addEventListener("click", () => selectCity(city, card));
  return card;
}

function renderCities() {
  const fill = (trackEl, list) => {
    trackEl.innerHTML = "";
    const visible = list.filter(matchesQuery);
    visible.forEach((city) => trackEl.appendChild(cityCard(city)));
    return visible.length;
  };
  const counts = [
    [groupMain, fill(mainTrack, mainCities)],
    [groupIntl, fill(intlTrack, intlCities)],
    [groupOther, fill(otherTrack, otherCities)],
  ];
  counts.forEach(([group, n]) => { group.hidden = n === 0; });
  citiesEmpty.hidden = counts.some(([, n]) => n > 0);
  updateArrows();
}

/* заедничко јадро: го поставува активниот град и го исцртува распоредот.
   Враќа true само ако навистина се смени градот (за да не се повторува
   непотребно renderSchedule кога веќе сме на таа дестинација). */
function activateCity(city, card) {
  if (city === activeCity) return false;
  activeCity = city;
  document.querySelectorAll(".city-card").forEach((c) => c.classList.remove("is-active"));
  if (!card) card = document.querySelector(`.city-card[data-city="${cssEscapeCity(city)}"]`);
  if (card) card.classList.add("is-active");
  renderSchedule();
  return true;
}

function cssEscapeCity(city) {
  return window.CSS && CSS.escape ? CSS.escape(city) : city.replace(/"/g, '\\"');
}

function selectCity(city, card) {
  activateCity(city, card);
  card.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
}

/* го носи посетителот од копчето „Следно поаѓање“ право до линиите на
   тој град — исто како да кликнал на неговата картичка (пример: Кичево) */
function goToNextDepartureCity() {
  const next = findNextDeparture();
  if (!next) return;
  /* следното поаѓање е секогаш од Прилеп — ако е избрана спротивната
     насока, се враќа на неа за да се гледа вистинската дестинација */
  if (direction !== "out") setDirection("out");
  /* пребарувањето можеби ја крие бараната картичка — се чисти за да се
     најде и активира */
  if (query) {
    citySearch.value = "";
    query = "";
    citySearchClear.hidden = true;
    renderCities();
  }
  activateCity(next.city);
  const card = document.querySelector(`.city-card[data-city="${cssEscapeCity(next.city)}"]`);
  if (card) card.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" });
  /* скролува право до редот означен „Следно поаѓање“, не само до врвот
     на распоредот — таму често се наоѓа неколку редови подолу. Чекањето
     на следната рамка гарантира дека распоредот (по евентуалната промена
     на насока/град) веќе е целосно исцртан пред да се смета позицијата. */
  requestAnimationFrame(() => {
    const nextTripRow = scheduleList.querySelector(".trip--next");
    if (nextTripRow) {
      nextTripRow.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      document.getElementById("raspored").scrollIntoView({ behavior: "smooth" });
    }
  });
}

citySearch.addEventListener("input", () => {
  query = citySearch.value.trim().toLowerCase();
  citySearchClear.hidden = !query;
  renderCities();
});

citySearchClear.addEventListener("click", () => {
  citySearch.value = "";
  query = "";
  citySearchClear.hidden = true;
  renderCities();
  citySearch.focus();
});


function renderSchedule() {
  const today = new Date().getDay();
  const nowMin = nowMinutes();
  /* секогаш се прикажуваат сите линии кон дестинацијата */
  const trips = [...ROUTES[activeCity]].sort((a, b) => toMinutes(a.time) - toMinutes(b.time));
  /* но „следно поаѓање“ се бара само меѓу линиите што навистина возат денес */
  const next = trips.find((trip) => runsOn(trip, today) && toMinutes(trip.time) >= nowMin);

  scheduleCity.textContent = t(direction === "in" ? "routeFrom" : "routeTo").replace("{city}", placeName(activeCity));
  lineCount.textContent = `${trips.length} ${trips.length === 1 ? t("line") : t("lines")}`;
  scheduleList.innerHTML = "";

  if (!trips.length) {
    scheduleList.innerHTML = `<p class="schedule__empty">${t("empty")}</p>`;
    return;
  }

  trips.forEach((trip, i) => {
    const runsToday = runsOn(trip, today);
    const isNext = trip === next;
    const passed = runsToday && toMinutes(trip.time) < nowMin;
    const el = document.createElement("div");
    el.className =
      "trip" +
      (direction === "out" ? " trip--out" : "") +
      (trip.local ? " trip--local" : "") +
      (isNext ? " trip--next" : "") +
      (!runsToday ? " trip--off" : "") +
      (passed ? " is-passed" : "");
    el.style.setProperty("--d", `${i * 0.06}s`);

    const days = daysLabel(trip.days);
    /* зелено = вози секој ден, сино = вози само определени денови */
    const daysClass = !runsToday
      ? " trip__days--off"
      : trip.days === 127 ? " trip__days--sun"
      : " trip__days--note";
    const dest = placeName(activeCity);
    const price = priceText(trip);
    const ret = returnText(trip);
    const student = studentText(trip);
    const stops = alongTheWay(trip, activeCity);
    /* во насока „за Прилеп“ деновите се кријат — освен кај прилепскиот
       превозник (Роман од Скопје), каде остануваат како што се */
    const showDays = direction === "out" || trip.local;

    const statusTags = `
      ${isNext ? `<span class="trip__tag trip__tag--next">${t("tagNext")}</span>` : ""}
      ${passed ? `<span class="trip__tag trip__tag--passed">${t("tagPassed")}</span>` : ""}
      ${!runsToday ? `<span class="trip__tag trip__tag--off">${t("notToday")}</span>` : ""}
    `;

    /* „од Прилеп“ — четири зони на иста линија: час · превозник · цена ·
       статус. Секоја зона има точно по два реда (наслов + ситни детали),
       за да сите редови се еднакво високи и без празен простор.
       Споредните цени одат во ЕДНА линија, не една под друга — така
       редот останува низок.
       „за Прилеп“ останува непроменето — град + евентуални денови,
       цена никогаш не се прикажува таму. */
    const priceSub = priceSubText(trip);
    /* копчето за попатни станици е во истата линија со ознаките — така не
       троши цел ред за себе; отворената листа паѓа под целиот ред */
    const stopsToggle = showDays && stops.length ? `
      <button type="button" class="trip__stops-toggle" aria-expanded="false">
        <svg class="trip__stops-chevron" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
        ${t("stopsLabel")} (${stops.length})
      </button>
    ` : "";
    const head = direction === "out" ? `
      <div class="trip__time">${trip.time}${trip.local ? `<span class="trip__sun" aria-hidden="true">★</span>` : ""}</div>
      <div class="trip__main">
        <div class="trip__carriername">${carrierName(trip.carrier)}</div>
        <div class="trip__metaline">
          <span class="trip__days${daysClass}">${days}</span>
          ${trip.direct ? `<span class="trip__via">${t("direct")}</span>` : ""}
          ${direction === "out" ? stopsToggle : ""}
        </div>
      </div>
      ${price ? `<div class="trip__price">${price}${priceSub ? `<span class="trip__pricesub">${priceSub}</span>` : ""}</div>` : ""}
      <div class="trip__status">${statusTags}</div>
    ` : `
      <div class="trip__time">${trip.time}${trip.local ? `<span class="trip__sun" aria-hidden="true">★</span>` : ""}</div>
      <div class="trip__route">
        <div class="trip__dest">
          ${dest}
          ${showDays ? `<span class="trip__days${daysClass}">${days}</span>` : ""}
        </div>
      </div>
      <div class="trip__right">
        ${price ? `<div class="trip__price">${price}${ret ? `<span>${ret}</span>` : ""}${student ? `<span>${student}</span>` : ""}</div>` : ""}
        <div class="trip__meta">
          <div class="trip__carrier">${trip.carrier ? `${carrierName(trip.carrier)}${trip.local ? `<span class="trip__local">${STAR_ICON} ${t("localCarrier")}</span>` : ""}` : ""}</div>
          <div class="trip__status">${statusTags}</div>
        </div>
      </div>
    `;

    const stopsList = showDays && stops.length ? `
      <div class="trip__stops-list" hidden>
        ${stops.map((stop) => `
          <div class="trip__stop">
            <span class="trip__stop-name">${placeName(stop.name)}</span>
            <span class="trip__stop-price">${stopPriceText(stop)}</span>
          </div>
        `).join("")}
      </div>
    ` : "";

    /* „од Прилеп“: копчето е во линијата со ознаките, па тука оди само
       листата. „за Прилеп“ ја задржува старата обвивка со копче. */
    el.innerHTML = head + (direction === "out"
      ? stopsList
      : (showDays && stops.length ? `
        <div class="trip__stops">
          ${stopsToggle}
          ${stopsList}
        </div>
      ` : ""));
    scheduleList.appendChild(el);
  });
}

/* отворање/затворање на попатните станици */
scheduleList.addEventListener("click", (e) => {
  const toggle = e.target.closest(".trip__stops-toggle");
  if (!toggle) return;
  /* кај „од Прилеп“ копчето е во линијата со ознаките, а листата е
     подолу во истиот ред — затоа се бара во целата картичка, не како
     непосреден сосед */
  const list = toggle.closest(".trip").querySelector(".trip__stops-list");
  if (!list) return;
  const open = toggle.getAttribute("aria-expanded") === "true";
  toggle.setAttribute("aria-expanded", String(!open));
  toggle.classList.toggle("is-open", !open);
  list.hidden = open;
});

/* ------------------------------------------------------------
   Примена на јазикот врз статичниот текст
   ------------------------------------------------------------ */
function applyLanguage() {
  document.documentElement.lang = lang;
  document.title = t("htmlTitle");

  document.querySelectorAll("[data-i18n]").forEach((el) => {
    const key = el.dataset.i18n;
    const value = t(key);
    if (value === undefined) return;
    el.textContent = key === "footerCopy"
      ? value.replace("{year}", new Date().getFullYear())
      : value;
  });

  document.querySelectorAll("[data-i18n-aria]").forEach((el) => {
    const value = t(el.dataset.i18nAria);
    if (value !== undefined) el.setAttribute("aria-label", value);
  });

  document.querySelectorAll("[data-i18n-placeholder]").forEach((el) => {
    const value = t(el.dataset.i18nPlaceholder);
    if (value !== undefined) el.placeholder = value;
  });

  document.querySelectorAll(".nav__lang-btn").forEach((btn) => {
    const active = btn.dataset.lang === lang;
    btn.classList.toggle("is-active", active);
    btn.setAttribute("aria-pressed", String(active));
  });

  renderCities();
  renderSchedule();
  renderHeroNext();
  updateArrows();
}

function setLanguage(next) {
  if (next === lang) return;
  lang = next;
  localStorage.setItem("lang", lang);
  applyLanguage();
}

document.querySelectorAll(".nav__lang-btn").forEach((btn) => {
  btn.addEventListener("click", () => setLanguage(btn.dataset.lang));
});

/* ------------------------------------------------------------
   Стрелки + drag за хоризонталниот скрол
   ------------------------------------------------------------ */
document.querySelectorAll(".cities__arrow").forEach((btn) => {
  btn.addEventListener("click", () => {
    const trackEl = document.getElementById(btn.dataset.track);
    const dir = btn.classList.contains("cities__arrow--left") ? -1 : 1;
    trackEl.scrollBy({ left: dir * 420, behavior: "smooth" });
  });
});

function updateArrows() {
  document.querySelectorAll(".cities__arrow").forEach((btn) => {
    const trackEl = document.getElementById(btn.dataset.track);
    if (!trackEl) return;
    const max = trackEl.scrollWidth - trackEl.clientWidth - 4;
    const isLeft = btn.classList.contains("cities__arrow--left");
    btn.classList.toggle("is-hidden", isLeft ? trackEl.scrollLeft <= 4 : trackEl.scrollLeft >= max);
  });
}
window.addEventListener("resize", updateArrows);

[mainTrack, intlTrack, otherTrack].forEach((trackEl) => {
  trackEl.addEventListener("scroll", updateArrows, { passive: true });

  let isDown = false, startX = 0, startScroll = 0, dragged = false;
  trackEl.addEventListener("pointerdown", (e) => {
    /* на touch уреди работи нативниот скрол — custom drag е само за глушец */
    if (e.pointerType !== "mouse") return;
    isDown = true;
    dragged = false;
    startX = e.clientX;
    startScroll = trackEl.scrollLeft;
    trackEl.classList.add("is-dragging");
  });
  window.addEventListener("pointermove", (e) => {
    if (!isDown) return;
    const dx = e.clientX - startX;
    if (Math.abs(dx) > 6) dragged = true;
    trackEl.scrollLeft = startScroll - dx;
  });
  window.addEventListener("pointerup", () => {
    isDown = false;
    trackEl.classList.remove("is-dragging");
  });
  /* спречи click по drag */
  trackEl.addEventListener("click", (e) => {
    if (dragged) { e.stopPropagation(); e.preventDefault(); dragged = false; }
  }, true);
});

/* ------------------------------------------------------------
   Navbar при скрол
   ------------------------------------------------------------ */
const nav = document.getElementById("nav");
window.addEventListener("scroll", () => {
  nav.classList.toggle("is-scrolled", window.scrollY > 40);
}, { passive: true });

/* ------------------------------------------------------------
   Hero parallax + fade при скрол
   ------------------------------------------------------------ */
const heroBg = document.querySelector(".hero__bg");
const heroContent = document.querySelector(".hero__content");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let parallaxTicking = false;

function updateParallax() {
  parallaxTicking = false;
  const y = window.scrollY;
  if (y > window.innerHeight) return; // hero не е видлив
  /* позадината се движи побавно од скролот (parallax) */
  heroBg.style.setProperty("--par", `${y * 0.35}px`);
  /* содржината избледува и се лизга нагоре — на телефон само благо,
     инаку остава празен простор под себе на малиот екран */
  const p = Math.min(y / (window.innerHeight * 0.7), 1);
  heroContent.style.opacity = String(1 - p);
  const shift = window.innerWidth <= 760 ? 0.05 : 0.18;
  heroContent.style.transform = `translateY(${-y * shift}px)`;
}

if (!reducedMotion) {
  window.addEventListener("scroll", () => {
    if (!parallaxTicking) {
      parallaxTicking = true;
      requestAnimationFrame(updateParallax);
    }
  }, { passive: true });
}

/* ------------------------------------------------------------
   Мобилно мени (hamburger)
   ------------------------------------------------------------ */
const burger = document.getElementById("navBurger");
const mobileMenu = document.getElementById("navMobile");

function toggleMenu(open) {
  const isOpen = open ?? !mobileMenu.classList.contains("is-open");
  mobileMenu.classList.toggle("is-open", isOpen);
  burger.classList.toggle("is-open", isOpen);
  burger.setAttribute("aria-expanded", String(isOpen));
  if (isOpen) nav.classList.add("is-scrolled");
  else nav.classList.toggle("is-scrolled", window.scrollY > 40);
}

burger.addEventListener("click", () => toggleMenu());
mobileMenu.querySelectorAll("a").forEach((a) =>
  a.addEventListener("click", () => toggleMenu(false))
);
document.addEventListener("click", (e) => {
  if (mobileMenu.classList.contains("is-open") && !nav.contains(e.target)) toggleMenu(false);
});

/* ------------------------------------------------------------
   Reveal анимации (IntersectionObserver)
   ------------------------------------------------------------ */
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add("is-visible");
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.15 });

document.querySelectorAll(".reveal, .reveal-up").forEach((el) => observer.observe(el));

/* ------------------------------------------------------------
   Следно поаѓање во hero — се пресметува во живо
   ------------------------------------------------------------ */
const heroNext = document.getElementById("heroNext");
const heroNextLabel = document.getElementById("heroNextLabel");
const heroNextTime = document.getElementById("heroNextTime");
const heroNextCity = document.getElementById("heroNextCity");
const heroNextMeta = document.getElementById("heroNextMeta");

/* Се гледаат само главните дестинации — истиот автобус се појавува и кај
   попатните станици, па инаку би се прикажала меѓустаница наместо крајната цел. */
function findNextDeparture() {
  const now = new Date();
  const nowMin = nowMinutes();
  const today = now.getDay();
  let best = null;

  const consider = (city, trip, day, isTomorrow) => {
    if (!runsOn(trip, day)) return;
    const mins = toMinutes(trip.time);
    if (!isTomorrow && mins < nowMin) return;
    const wait = isTomorrow ? mins + 1440 - nowMin : mins - nowMin;
    if (!best || wait < best.wait) best = { city, trip, wait, isTomorrow };
  };

  GROUPS.main.filter((c) => ROUTES_OUT[c]).forEach((city) =>
    ROUTES_OUT[city].forEach((trip) => consider(city, trip, today, false))
  );
  if (!best) {
    const tomorrow = (today + 1) % 7;
    GROUPS.main.filter((c) => ROUTES_OUT[c]).forEach((city) =>
      ROUTES_OUT[city].forEach((trip) => consider(city, trip, tomorrow, true))
    );
  }
  return best;
}

function waitText(wait) {
  if (wait <= 0) return t("departingNow");
  if (wait < 60) return t("inMin").replace("{n}", wait);
  return t("inHours").replace("{h}", Math.floor(wait / 60)).replace("{m}", wait % 60);
}

function renderHeroNext() {
  const next = findNextDeparture();
  if (!next) {
    heroNext.hidden = true;
    return;
  }
  heroNext.hidden = false;
  heroNextLabel.textContent = next.isTomorrow ? t("nextTomorrow") : t("nextDeparture");
  heroNextTime.textContent = next.trip.time;
  heroNextCity.textContent = placeName(next.city);
  heroNextMeta.textContent = next.isTomorrow
    ? carrierName(next.trip.carrier)
    : `${carrierName(next.trip.carrier)} · ${waitText(next.wait)}`;
}

/* клик на картичката „Следно поаѓање“ отвора директно на линиите за тој град */
heroNext.addEventListener("click", (e) => {
  e.preventDefault();
  goToNextDepartureCity();
});

/* освежување секоја минута, за да не застари одбројувањето */
setInterval(() => {
  renderHeroNext();
  renderSchedule();
}, 60000);

/* ------------------------------------------------------------
   Иницијализација
   ------------------------------------------------------------ */
applyLanguage();
