/*
 * Возен ред — Автобуска станица Прилеп
 * =====================================
 * Ова е единствената датотека што треба да се менува кога ќе се смени возниот ред.
 * Таблата (index.html) сама ги пресметува следните поаѓања и статусите.
 *
 * carriers (превозници): клуч → { name, code (кратенка од 2 букви), color }
 *
 * routes (линии), секоја линија има:
 *   line          – основен број на линијата (поаѓањата добиваат line+1, line+2 …)
 *   destination   – крајна дестинација
 *   via           – (опционално) преку кои места поминува
 *   platform      – перон од кој поаѓа автобусот
 *   international – (опционално) true за меѓународни линии
 *   days          – (опционално) денови за целата линија
 *   departures    – поаѓања: { time: "ЧЧ:ММ", carrier: клуч, days?, delay?, cancelled? }
 *
 * days:      "daily" (секој ден — стандардно), "weekdays" (пон–пет), "mon-sat" (пон–саб),
 *            "weekend" (саб–нед), "sat", "sun", или низа денови [1 = пон … 7 = нед].
 * delay:     доцнење во минути — на таблата се прикажува „ДОЦНИ“.
 * cancelled: true — на таблата се прикажува „ОТКАЖАН“.
 *
 * ВАЖНО за изворот на податоците:
 * Официјалниот сајт avtobuskaprilep.mk не беше достапен при изработката на таблата.
 * Бројот на поаѓања, првиот и последниот термин и превозниците по линија се земени од
 * јавни извори (balkanviator.com), а часовите за Крушево од објавениот возен ред на
 * Ѓоко Транс. Меѓутерминските часови, пероните и меѓународните линии се ориентациски.
 * Откако ќе се внесе официјалниот возен ред, поставете verified: true.
 */
window.VOZEN_RED = {
  verified: false,
  updated: '2026-09-29',
  phone: '048 400 307',

  carriers: {
    GALEB:       { name: 'Галеб',               code: 'ГЛ', color: '#1565c0' },
    TRANSKOP:    { name: 'Транскоп',            code: 'ТК', color: '#c62828' },
    OPAL:        { name: 'Опал Ком',            code: 'ОК', color: '#6a1b9a' },
    PELAGONIJA:  { name: 'Пелагонија Транс',    code: 'ПТ', color: '#2e7d32' },
    SKORPION:    { name: 'Скорпион М-К',        code: 'СК', color: '#bf360c' },
    AVTOATOM:    { name: 'Авто Атом',           code: 'АА', color: '#00838f' },
    SAMVEL:      { name: 'Сам Вел Компани',     code: 'СВ', color: '#ad1457' },
    STREKS:      { name: 'Струмица Експрес',    code: 'СЕ', color: '#4527a0' },
    TRANSBALKAN: { name: 'Трансбалкан',         code: 'ТБ', color: '#455a64' },
    CRESOVO:     { name: 'Црешово Топче Транс', code: 'ЦТ', color: '#6d4c41' },
    GJOKO:       { name: 'Ѓоко Транс',          code: 'ЃТ', color: '#00695c' },
    UNITOURS:    { name: 'Уни Турс',            code: 'УТ', color: '#283593' },
    FLIXBUS:     { name: 'FlixBus',             code: 'ФБ', color: '#4e8a00' }
  },

  routes: [
    {
      // 19 поаѓања, 05:30–19:40 (balkanviator.com)
      line: 100,
      destination: 'Скопје',
      via: 'Велес',
      platform: 1,
      departures: [
        { time: '05:30', carrier: 'TRANSKOP' },
        { time: '06:00', carrier: 'PELAGONIJA' },
        { time: '06:30', carrier: 'GALEB' },
        { time: '07:00', carrier: 'TRANSKOP' },
        { time: '07:30', carrier: 'OPAL' },
        { time: '08:15', carrier: 'GALEB' },
        { time: '09:00', carrier: 'TRANSKOP' },
        { time: '09:45', carrier: 'SKORPION' },
        { time: '10:30', carrier: 'PELAGONIJA' },
        { time: '11:15', carrier: 'GALEB' },
        { time: '12:00', carrier: 'TRANSKOP' },
        { time: '13:00', carrier: 'OPAL' },
        { time: '13:45', carrier: 'GALEB' },
        { time: '14:30', carrier: 'TRANSKOP' },
        { time: '15:15', carrier: 'PELAGONIJA' },
        { time: '16:00', carrier: 'GALEB' },
        { time: '17:00', carrier: 'TRANSKOP' },
        { time: '18:15', carrier: 'SKORPION' },
        { time: '19:40', carrier: 'GALEB' }
      ]
    },
    {
      // 26 поаѓања, 04:30–23:44 (balkanviator.com)
      line: 200,
      destination: 'Битола',
      platform: 2,
      departures: [
        { time: '04:30', carrier: 'CRESOVO' },
        { time: '05:45', carrier: 'TRANSKOP' },
        { time: '06:20', carrier: 'GALEB' },
        { time: '06:50', carrier: 'AVTOATOM' },
        { time: '07:20', carrier: 'TRANSKOP' },
        { time: '07:50', carrier: 'OPAL' },
        { time: '08:30', carrier: 'SAMVEL' },
        { time: '09:00', carrier: 'GALEB' },
        { time: '09:40', carrier: 'TRANSKOP' },
        { time: '10:15', carrier: 'TRANSBALKAN' },
        { time: '10:50', carrier: 'GALEB' },
        { time: '11:30', carrier: 'TRANSKOP' },
        { time: '12:10', carrier: 'STREKS' },
        { time: '12:45', carrier: 'OPAL' },
        { time: '13:20', carrier: 'GALEB' },
        { time: '14:00', carrier: 'TRANSKOP' },
        { time: '14:40', carrier: 'AVTOATOM' },
        { time: '15:15', carrier: 'GALEB' },
        { time: '15:50', carrier: 'TRANSKOP' },
        { time: '16:30', carrier: 'SAMVEL' },
        { time: '17:10', carrier: 'OPAL' },
        { time: '17:50', carrier: 'TRANSKOP' },
        { time: '18:40', carrier: 'GALEB' },
        { time: '19:30', carrier: 'TRANSBALKAN' },
        { time: '21:15', carrier: 'TRANSKOP' },
        { time: '23:44', carrier: 'GALEB' }
      ]
    },
    {
      // 10 поаѓања, 06:00–20:30 во обратна насока (balkanviator.com)
      line: 300,
      destination: 'Охрид',
      via: 'Битола, Ресен',
      platform: 3,
      departures: [
        { time: '06:00', carrier: 'AVTOATOM' },
        { time: '07:30', carrier: 'GALEB' },
        { time: '09:00', carrier: 'SAMVEL' },
        { time: '10:30', carrier: 'UNITOURS' },
        { time: '12:00', carrier: 'GALEB' },
        { time: '13:30', carrier: 'AVTOATOM' },
        { time: '15:00', carrier: 'SAMVEL' },
        { time: '16:30', carrier: 'GALEB' },
        { time: '18:00', carrier: 'UNITOURS' },
        { time: '20:00', carrier: 'GALEB' }
      ]
    },
    {
      // Возен ред на Ѓоко Транс: 6 поаѓања работни денови, 3 во недела
      line: 400,
      destination: 'Крушево',
      platform: 4,
      departures: [
        { time: '06:25', carrier: 'GJOKO', days: 'mon-sat' },
        { time: '08:40', carrier: 'GJOKO', days: 'mon-sat' },
        { time: '09:35', carrier: 'GJOKO', days: 'sun' },
        { time: '10:20', carrier: 'GJOKO', days: 'mon-sat' },
        { time: '12:30', carrier: 'GJOKO', days: 'mon-sat' },
        { time: '15:20', carrier: 'GJOKO' },
        { time: '17:30', carrier: 'GJOKO', days: 'mon-sat' },
        { time: '19:30', carrier: 'GJOKO', days: 'sun' }
      ]
    },
    {
      // 6 поаѓања, 07:00–16:45 (balkanviator.com)
      line: 500,
      destination: 'Кичево',
      via: 'Македонски Брод',
      platform: 5,
      departures: [
        { time: '07:00', carrier: 'PELAGONIJA' },
        { time: '09:15', carrier: 'PELAGONIJA' },
        { time: '11:30', carrier: 'GALEB' },
        { time: '13:00', carrier: 'PELAGONIJA' },
        { time: '15:00', carrier: 'GALEB' },
        { time: '16:45', carrier: 'PELAGONIJA' }
      ]
    },
    {
      // 6 поаѓања, 06:00–21:00 (balkanviator.com)
      line: 600,
      destination: 'Кавадарци',
      via: 'Плетвар',
      platform: 6,
      departures: [
        { time: '06:00', carrier: 'OPAL' },
        { time: '08:30', carrier: 'OPAL' },
        { time: '11:00', carrier: 'TRANSBALKAN' },
        { time: '14:00', carrier: 'OPAL' },
        { time: '17:00', carrier: 'TRANSBALKAN' },
        { time: '21:00', carrier: 'OPAL' }
      ]
    },
    {
      // Прилеп – Штип: 4 поаѓања, 08:50–19:48 (balkanviator.com);
      // првото и последното продолжуваат до Струмица (линија 750)
      line: 700,
      destination: 'Штип',
      via: 'Велес',
      platform: 7,
      departures: [
        { time: '12:15', carrier: 'TRANSBALKAN' },
        { time: '15:30', carrier: 'TRANSBALKAN' }
      ]
    },
    {
      line: 750,
      destination: 'Струмица',
      via: 'Велес, Штип',
      platform: 7,
      departures: [
        { time: '08:50', carrier: 'STREKS' },
        { time: '19:48', carrier: 'STREKS' }
      ]
    },
    {
      line: 900,
      destination: 'Белград',
      via: 'Скопје, Ниш',
      platform: 8,
      international: true,
      departures: [
        { time: '20:30', carrier: 'FLIXBUS' }
      ]
    },
    {
      line: 950,
      destination: 'Виена',
      via: 'Скопје, Белград',
      platform: 8,
      international: true,
      departures: [
        { time: '16:30', carrier: 'FLIXBUS', days: [2, 4, 6] }
      ]
    }
  ],

  announcements: [
    {
      mk: 'Билети се купуваат на шалтер и на електронските киосци во станицата',
      en: 'Tickets are available at the counter and at the self-service kiosks'
    },
    {
      mk: 'Качувањето почнува 15 минути пред поаѓање — проверете го перонот',
      en: 'Boarding starts 15 minutes before departure — please check your platform'
    },
    {
      mk: 'Информации за возниот ред: 048 400 307',
      en: 'Timetable information: +389 48 400 307'
    }
  ]
};
