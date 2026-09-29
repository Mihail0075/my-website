/*
 * Возен ред — Автобуска станица Прилеп
 * =====================================
 * Ова е единствената датотека што треба да се менува кога ќе се смени возниот ред.
 * Таблата (index.html) сама ги пресметува следните поаѓања и статусите.
 *
 * Извор: официјален возен ред на Автобуска станица Прилеп.
 * Во официјалниот возен ред поаѓањата означени со * сообраќаат и во недела;
 * овде тоа е запишано како days: 'daily', а поаѓањата без ознака како 'mon-sat'.
 *
 * carriers (превозници): клуч → { name, city, code (кратенка од 2 букви), color }
 *
 * routes (линии), секоја линија има:
 *   destination   – крајна дестинација
 *   en            – (опционално) име на англиски, ако се разликува од латиничното пишување
 *   via           – (опционално) преку кои места поминува
 *   platform      – (опционално) перон; ако се внесе, на таблата се појавува колона „Перон“
 *   international – (опционално) true за меѓународни линии
 *   days          – (опционално) денови за сите поаѓања на линијата
 *   departures    – поаѓања: { time: "ЧЧ:ММ", carrier: клуч, days?, via?, delay?, cancelled? }
 *
 * days:      "daily" (секој ден — стандардно), "weekdays" (пон–пет), "mon-sat" (пон–саб),
 *            "weekend" (саб–нед), "sat", "sun", или низа денови [1 = пон … 7 = нед].
 * via:       кај поаѓање — ако тој автобус оди по друга релација од линијата.
 * delay:     доцнење во минути — на таблата се прикажува „ДОЦНИ“.
 * cancelled: true — на таблата се прикажува „ОТКАЖАН“.
 */
window.VOZEN_RED = {
  verified: true,
  updated: '2026-09-29',
  phone: '048 400 307',

  carriers: {
    ROMAN:      { name: 'Роман',            city: 'Прилеп',   code: 'РО', color: '#6a1b9a' },
    TRANSKOP:   { name: 'Транскоп',         city: 'Битола',   code: 'ТК', color: '#c62828' },
    GALEB:      { name: 'Галеб',            city: 'Охрид',    code: 'ГЛ', color: '#1565c0' },
    EKSTRABUS:  { name: 'Екстра Бус',       city: 'Кавадарци', code: 'ЕК', color: '#bf360c' },
    STREKS:     { name: 'Струмица Експрес', city: 'Струмица', code: 'СЕ', color: '#4527a0' },
    AVTOATOM:   { name: 'Авто Атом',        city: 'Кочани',   code: 'АА', color: '#00838f' },
    MAKTRAVEL:  { name: 'Мак Травел',       city: 'Прилеп',   code: 'МА', color: '#2e7d32' },
    METROTRANS: { name: 'Метро Транс',      city: 'Прилеп',   code: 'МТ', color: '#ad1457' },
    RAMATURS:   { name: 'Рама Турс',        city: 'Прилеп',   code: 'РТ', color: '#5d4037' },
    GJOKO:      { name: 'Ѓоко Транс',       city: 'Крушево',  code: 'ЃТ', color: '#00695c' },
    CIBUK:      { name: 'Чибук Травел',     city: 'Прилеп',   code: 'ЧТ', color: '#455a64' },
    EUROBUS:    { name: 'Еуро Бус',         city: 'Струга',   code: 'ЕБ', color: '#283593' },
    EUROLINES:  { name: 'Еуро Линес',       city: 'Струга',   code: 'ЕЛ', color: '#827717' },
    IDOTURS:    { name: 'Идо Турс',         city: 'Тетово',   code: 'ИТ', color: '#0277bd' },
    SOLO:       { name: 'Соло Рајзен',      city: '',         code: 'СР', color: '#558b2f' }
  },

  routes: [
    // ---------- Автобуски линии низ Македонија ----------
    {
      destination: 'Скопје',
      via: 'Велес',
      days: 'mon-sat',
      departures: [
        { time: '05:30', carrier: 'ROMAN' },
        { time: '05:40', carrier: 'TRANSKOP' },
        { time: '06:30', carrier: 'ROMAN' },
        { time: '07:15', carrier: 'TRANSKOP', days: 'daily' },
        { time: '09:10', carrier: 'TRANSKOP', days: 'daily' },
        { time: '09:30', carrier: 'ROMAN' },
        { time: '11:45', carrier: 'TRANSKOP' },
        { time: '14:30', carrier: 'ROMAN' },
        { time: '15:15', carrier: 'TRANSKOP', days: 'daily' },
        { time: '17:15', carrier: 'TRANSKOP', days: 'daily' },
        { time: '18:15', carrier: 'GALEB', via: 'Кавадарци, Велес' },
        { time: '18:30', carrier: 'ROMAN', days: 'sun' }
      ]
    },
    {
      destination: 'Битола',
      days: 'mon-sat',
      departures: [
        { time: '06:15', carrier: 'TRANSKOP', days: 'weekdays' },
        { time: '09:00', carrier: 'STREKS', days: 'daily' },
        { time: '11:30', carrier: 'TRANSKOP' },
        { time: '16:00', carrier: 'TRANSKOP', days: 'daily' },
        { time: '17:55', carrier: 'TRANSKOP', days: 'daily' },
        { time: '19:30', carrier: 'TRANSKOP' },
        { time: '21:30', carrier: 'TRANSKOP', days: 'daily' },
        { time: '23:15', carrier: 'TRANSKOP', days: 'daily' }
      ]
    },
    {
      // Во возниот ред овие поаѓања се наведени и кај Прилеп – Битола (исти автобуси),
      // па на таблата се прикажуваат еднаш, како „Охрид преку Битола, Ресен“.
      destination: 'Охрид',
      via: 'Битола, Ресен',
      days: 'mon-sat',
      departures: [
        { time: '08:20', carrier: 'EKSTRABUS' },
        { time: '08:40', carrier: 'GALEB', days: 'daily' },
        { time: '09:40', carrier: 'AVTOATOM', days: 'daily' },
        { time: '17:40', carrier: 'GALEB', days: 'daily' }
      ]
    },
    {
      destination: 'Струмица',
      via: 'Кавадарци, Неготино, Валандово',
      days: 'mon-sat',
      departures: [
        { time: '06:00', carrier: 'MAKTRAVEL' },
        { time: '15:00', carrier: 'STREKS', days: 'daily' }
      ]
    },
    {
      destination: 'Кочани',
      via: 'Велес, Штип',
      days: 'mon-sat',
      departures: [
        { time: '08:40', carrier: 'GALEB', days: 'daily' },
        { time: '15:40', carrier: 'AVTOATOM', days: 'daily' }
      ]
    },
    {
      destination: 'Кичево',
      via: 'Македонски Брод',
      days: 'mon-sat',
      departures: [
        { time: '07:30', carrier: 'METROTRANS' },
        { time: '09:00', carrier: 'METROTRANS', days: 'daily' },
        { time: '11:20', carrier: 'RAMATURS' },
        { time: '13:15', carrier: 'METROTRANS' },
        { time: '15:55', carrier: 'RAMATURS' },
        { time: '16:45', carrier: 'METROTRANS', days: 'daily' }
      ]
    },
    {
      destination: 'Крушево',
      days: 'mon-sat',
      departures: [
        { time: '07:25', carrier: 'GJOKO' },
        { time: '09:35', carrier: 'GJOKO', days: 'daily' },
        { time: '11:40', carrier: 'GJOKO' },
        { time: '14:45', carrier: 'GJOKO', days: 'daily' },
        { time: '16:40', carrier: 'GJOKO' },
        { time: '19:30', carrier: 'GJOKO', days: 'daily' }
      ]
    },

    // ---------- Меѓународни автобуски линии ----------
    {
      destination: 'Прага',
      en: 'Prague',
      international: true,
      departures: [{ time: '05:00', carrier: 'CIBUK', days: [5] }]
    },
    {
      destination: 'Виена',
      en: 'Vienna',
      international: true,
      departures: [{ time: '19:40', carrier: 'EUROBUS', days: [6] }]
    },
    {
      destination: 'Софија',
      en: 'Sofia',
      international: true,
      departures: [{ time: '05:40', carrier: 'TRANSKOP' }]
    },
    {
      destination: 'Белград',
      en: 'Belgrade',
      via: 'Ниш, Лесковац, Врање, Јагодина',
      international: true,
      departures: [{ time: '18:00', carrier: 'GALEB' }]
    },
    {
      destination: 'Фрајбург',
      en: 'Freiburg',
      international: true,
      departures: [{ time: '06:30', carrier: 'EUROLINES', days: [3, 6] }]
    },
    {
      destination: 'Брејтенау',
      en: 'Brejtenau',
      international: true,
      departures: [{ time: '05:30', carrier: 'IDOTURS', days: [3, 6] }]
    },
    {
      destination: 'Лозана',
      en: 'Lausanne',
      international: true,
      departures: [{ time: '06:30', carrier: 'SOLO', days: [3, 6] }]
    }
  ],

  announcements: [
    {
      mk: 'Информации за возниот ред: 048 400 307',
      en: 'Timetable information: +389 48 400 307'
    },
    {
      mk: 'Билети на шалтер и онлајн на www.pelagonija.mk',
      en: 'Tickets at the counter and online at www.pelagonija.mk'
    },
    {
      mk: 'Работно време на станицата: секој ден 05:00–21:30, недела 05:30–21:30',
      en: 'Station opening hours: daily 05:00–21:30, Sunday 05:30–21:30'
    }
  ]
};
