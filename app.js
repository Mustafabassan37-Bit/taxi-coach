'use strict';

/* ---------- Daten ---------- */

const KEY = 'taxicoach.v1';

const DEFAULTS = {
  settings: {
    goal: 200,            // Tagesziel Umsatz in Euro
    share: 100,           // mein Anteil am Umsatz in Prozent (Angestellte z. B. 40–50)
    aiModel: 'opus',      // 'opus' = beste Qualität, 'haiku' = sparsam
    tariffMode: 'koeln',  // 'koeln' = amtlicher Kölner Tarif, 'custom' = eigene Werte unten
    tariff: { base: 4.9, km1: 2.9, km1Until: 0, km2: 2.9, waitPerHour: 36, large: 6 },
    places: ['Hauptbahnhof', 'Bf Messe/Deutz', 'Flughafen', 'Altstadt/Heumarkt', 'Ringe', 'Zülpicher Str.',
      'Ehrenfeld', 'Südstadt', 'Lanxess Arena', 'Koelnmesse', 'Uniklinik', 'Stadion', 'Hotel']
  },
  shifts: [],   // { id, start, end }
  rides: [],    // { id, shiftId, t, amount, tip, pay, place, src }
  costs: [],    // { id, t, amount, kind }
  waits: [],    // { id, t, place, min } – am Halteplatz gewartet und ohne Fahrgast weggefahren
  stand: null,  // { name, since } – hier stehe ich gerade
  trip: null,   // { place, wait, start } – laufende Fahrt ab einem Halteplatz
  check: { day: '', done: {} },
  last: { pay: 'Bar', src: 'Halteplatz' }
};

const OLD_PLACES = ['Hauptbahnhof', 'Flughafen', 'Innenstadt', 'Krankenhaus', 'Hotel', 'Kneipenviertel'];

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return merge(JSON.parse(raw));
  } catch (e) { /* kaputte oder gesperrte Daten: mit leerem Stand starten */ }
  return JSON.parse(JSON.stringify(DEFAULTS));
}

function merge(d) {
  const base = JSON.parse(JSON.stringify(DEFAULTS));
  const s = Object.assign(base, d);
  const ds = d.settings || {};
  s.settings = Object.assign({}, DEFAULTS.settings, ds);
  s.settings.tariff = Object.assign({}, DEFAULTS.settings.tariff, ds.tariff || {});
  // Umstellung älterer Stände auf Köln: Beispieltarif und Beispielorte ersetzen, eigene Eingaben behalten
  if (!ds.tariffMode) {
    if (ds.tariffIsExample === false) {
      s.settings.tariffMode = 'custom';
      if (!ds.tariff || ds.tariff.large == null) s.settings.tariff.large = 0;
    } else {
      s.settings.tariffMode = 'koeln';
      s.settings.tariff = Object.assign({}, DEFAULTS.settings.tariff);
    }
  }
  if (Array.isArray(ds.places) && ds.places.join('|') === OLD_PLACES.join('|')) s.settings.places = DEFAULTS.settings.places.slice();
  delete s.settings.tariffIsExample;
  ['shifts', 'rides', 'costs', 'waits'].forEach(k => { if (!Array.isArray(s[k])) s[k] = []; });
  if (!s.check || typeof s.check !== 'object') s.check = { day: '', done: {} };
  s.last = Object.assign({}, DEFAULTS.last, d.last || {});
  return s;
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(S)); }
  catch (e) { toast('Speichern nicht möglich – Speicher voll oder gesperrt'); }
}

let S = load();
let tab = 'heute';
let period = 'woche';

// Halteplätze aus halteplaetze.js: [Kanal, Nr., Name, Zone, Lage, Plätze, Rufsäule, Zeiten, Hinweis]
// Kanal 5 = Sonderplätze aus der Liste der Stadt (Hauptbahnhof, Flughafen, Messe, Veranstaltungsorte).
// Kartenpositionen (aus OpenStreetMap ermittelt) stehen als zweite Liste in derselben Datei.
const GEO = window.HALTEPLAETZE_GEO || [];
// Umfeld je Platz (aus OpenStreetMap gezählt): [[Anzahl je Art in der Reihenfolge von UMFELD_ARTEN], [auffällige Namen]]
const UMFELD = window.HALTEPLAETZE_UMFELD || [];
const UMFELD_ARTEN = ['bahnhof', 'hotel', 'klinik', 'bahnbetrieb', 'event', 'nacht', 'restaurant', 'buero',
  'versicherung', 'industrie', 'pflege', 'arzt', 'einkauf', 'uni'];
const HP = (window.HALTEPLAETZE || []).map((a, i) => ({
  ch: a[0], nr: a[1], name: a[2], zone: a[3], lage: a[4], n: a[5], rs: !!a[6], hrs: a[7] || '', note: a[8] || '', pos: GEO[i] || null,
  env: UMFELD[i] ? Object.fromEntries(UMFELD_ARTEN.map((k, j) => [k, UMFELD[i][0][j] || 0])) : null,
  envNames: UMFELD[i] ? UMFELD[i][1] || [] : []
}));
let hpNear = false;
const CHANNELS = { 1: 'Süd und West', 2: 'Nord und Ehrenfeld', 3: 'Rechtsrheinisch', 4: 'Innenstadt', 5: 'Sonderplätze' };
const chLabel = c => c === 5 ? 'Sonderplatz' : 'Kanal ' + c;
let hpQuery = '';
let hpChan = 0;

/* ---------- Helfer ---------- */

const $ = (sel, root = document) => root.querySelector(sel);
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const eurFmt = new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' });
const eur = n => eurFmt.format(n || 0);
const eur0 = n => Math.round(n || 0) + ' €';
const num = v => { const n = parseFloat(String(v == null ? '' : v).replace(',', '.')); return isFinite(n) ? n : 0; };
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const sum = (arr, k) => arr.reduce((a, x) => a + (x[k] || 0), 0);
const pad = n => String(n).padStart(2, '0');
const hhmm = t => { const d = new Date(t); return pad(d.getHours()) + ':' + pad(d.getMinutes()); };
const dayKey = t => { const d = new Date(t); return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()); };
const DAYS = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const DAYS_LONG = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];
const dow = t => (new Date(t).getDay() + 6) % 7; // Montag = 0

function dur(ms) {
  const m = Math.max(0, Math.floor(ms / 60000));
  const h = Math.floor(m / 60);
  return h > 0 ? h + ' Std ' + (m % 60) + ' Min' : m + ' Min';
}

function activeShift() { return S.shifts.find(s => !s.end) || null; }

let toastTimer = null;
function toast(msg) {
  const el = $('#toast');
  el.textContent = msg;
  el.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.hidden = true; }, 2600);
}

function openSheet(html) {
  $('#sheetBody').innerHTML = html;
  $('#sheet').hidden = false;
  const first = $('#sheetBody [autofocus]');
  if (first) first.focus();
}
function closeSheet() { $('#sheet').hidden = true; $('#sheetBody').innerHTML = ''; }
const sheetOpen = () => !$('#sheet').hidden;

/* ---------- Auswertung ---------- */

function periodStart(p, now = Date.now()) {
  const d = new Date(now);
  d.setHours(0, 0, 0, 0);
  if (p === 'heute') return d.getTime();
  if (p === 'woche') { d.setDate(d.getDate() - dow(now)); return d.getTime(); }
  if (p === 'monat') { d.setDate(1); return d.getTime(); }
  return 0;
}

// Gearbeitete Stunden im Zeitraum (laufende Schicht zählt bis jetzt)
function workedHours(from, to) {
  let ms = 0;
  for (const s of S.shifts) {
    const a = Math.max(s.start, from);
    const b = Math.min(s.end || to, to);
    if (b > a) ms += b - a;
  }
  return ms / 36e5;
}

function summary(from, to = Date.now()) {
  const rides = S.rides.filter(r => r.t >= from && r.t <= to);
  const costs = S.costs.filter(c => c.t >= from && c.t <= to);
  const rev = sum(rides, 'amount');
  const tips = sum(rides, 'tip');
  const hours = workedHours(from, to);
  const costSum = sum(costs, 'amount');
  return {
    rides, costs, rev, tips, hours, costSum,
    count: rides.length,
    avg: rides.length ? rev / rides.length : 0,
    perHour: hours > 0.05 ? rev / hours : 0,
    mine: rev * (S.settings.share / 100) + tips - costSum
  };
}

// Umsatz pro gearbeiteter Stunde je Wochentag und 3-Stunden-Block
function heatmap() {
  const worked = DAYS.map(() => new Array(8).fill(0));
  const rev = DAYS.map(() => new Array(8).fill(0));
  const now = Date.now();
  for (const s of S.shifts) {
    let t = s.start;
    const end = s.end || now;
    let guard = 0;
    while (t < end && guard++ < 2000) {
      const d = new Date(t);
      const block = Math.floor(d.getHours() / 3);
      const next = new Date(t);
      next.setHours(block * 3 + 3, 0, 0, 0);
      const stop = Math.min(end, next.getTime());
      if (stop <= t) break;
      worked[dow(t)][block] += stop - t;
      t = stop;
    }
  }
  for (const r of S.rides) rev[dow(r.t)][Math.floor(new Date(r.t).getHours() / 3)] += r.amount;
  let max = 0;
  const cells = DAYS.map((_, d) => worked[d].map((ms, b) => {
    if (ms < 30 * 60000) return null; // unter 30 Minuten: nicht aussagekräftig
    const v = rev[d][b] / (ms / 36e5);
    if (v > max) max = v;
    return v;
  }));
  return { cells, max };
}

function byPlace(rides) {
  const m = new Map();
  for (const r of rides) {
    const k = r.place || 'Ohne Ort';
    const o = m.get(k) || { place: k, count: 0, rev: 0 };
    o.count++; o.rev += r.amount;
    m.set(k, o);
  }
  return [...m.values()].sort((a, b) => b.rev - a.rev);
}

/* ---------- Coach: allgemeine Regeln nach Tageszeit ---------- */

function slotAdvice(now = Date.now()) {
  const d = dow(now);           // 0 = Mo … 6 = So
  const h = new Date(now).getHours();
  const weekendNight = (d === 5 || d === 6) && h < 5;   // Nacht Fr→Sa, Sa→So
  const goingOut = (d === 4 || d === 5) && h >= 20;      // Fr-/Sa-Abend

  if (weekendNight) return {
    title: 'Wochenend-Nacht – stärkste Zeit der Woche',
    places: ['Ringe (Friesenplatz, Rudolfplatz)', 'Zülpicher Straße', 'Altstadt / Heumarkt'],
    text: 'Viele kurze Fahrten hintereinander. Nach dem Absetzen direkt zurück zu den Ringen oder nach Ehrenfeld, nicht am Zielort warten.'
  };
  if (goingOut) return {
    title: 'Ausgeh-Abend',
    places: ['Altstadt / Heumarkt', 'Belgisches Viertel und Ringe', 'Lanxess Arena (bei Veranstaltung)'],
    text: 'Schau nach, wann Konzerte in der Lanxess Arena oder Spiele im Stadion enden – 10 Minuten vorher dort stehen.'
  };
  if (d === 6) {
    if (h < 12) return {
      title: 'Sonntagmorgen',
      places: ['Ringe / Zülpicher Straße (Heimfahrten)', 'Hauptbahnhof', 'Flughafen Köln/Bonn'],
      text: 'Bis etwa 8 Uhr letzte Heimfahrten aus dem Nachtleben, danach Reisende.'
    };
    return {
      title: 'Sonntag ab Mittag',
      places: ['Hauptbahnhof', 'Bahnhof Messe/Deutz', 'Flughafen Köln/Bonn'],
      text: 'Rückreise-Tag: Wochenend-Gäste fahren heim, Pendler und Messegäste kommen am Abend an.'
    };
  }
  if (h < 4) return {
    title: 'Nacht unter der Woche – ruhig',
    places: ['Hauptbahnhof (späte Züge)', 'Uniklinik / Notaufnahmen', 'Hotels am Dom und in Deutz'],
    text: 'Wenig Laufkundschaft. Funk und Vermittlungs-App anlassen und zentral stehen.'
  };
  if (h < 9) return {
    title: 'Frühschicht',
    places: ['Hotels (Dom, Deutz, Messe)', 'Flughafen Köln/Bonn', 'Hauptbahnhof'],
    text: 'Geschäftsreisende und Flughafenfahrten – lange, gut bezahlte Touren. Vorbestellungen sind jetzt am wertvollsten.'
  };
  if (h < 12) return {
    title: 'Vormittag – eher ruhig',
    places: ['Uniklinik (Lindenthal)', 'Krankenhäuser und Arztpraxen', 'Hauptbahnhof'],
    text: 'Arzt- und Krankenfahrten sind planbar. Frag Fahrgäste, ob sie auch eine Rückfahrt brauchen.'
  };
  if (h < 16) return {
    title: 'Mittag',
    places: ['Hauptbahnhof', 'Innenstadt (Neumarkt, Schildergasse)', 'Bahnhof Messe/Deutz'],
    text: 'Schwächere Stunden: gute Zeit für Pause, Tanken und Auto sauber machen.'
  };
  if (h < 20) return {
    title: 'Feierabend-Verkehr',
    places: ['Hauptbahnhof', 'Bahnhof Messe/Deutz', 'Koelnmesse (an Messetagen)'],
    text: 'Pendler, ankommende Reisende und Messegäste. Bei Regen ist die Innenstadt jetzt besonders stark.'
  };
  return {
    title: 'Abend',
    places: ['Altstadt / Heumarkt', 'Hotels', 'Hauptbahnhof (späte Züge)'],
    text: 'Unter der Woche ruhiger als am Wochenende – Standplätze mit Hotels und Gastronomie bevorzugen.'
  };
}

// Ostersonntag (gregorianischer Kalender) – daraus ergeben sich die Karnevalstage
function easter(y) {
  const a = y % 19, b = Math.floor(y / 100), c = y % 100, d = Math.floor(b / 4), e = b % 4;
  const f = Math.floor((b + 8) / 25), g = Math.floor((b - f + 1) / 3), h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4), k = c % 4, l = (32 + 2 * e + 2 * i - h - k) % 7, m = Math.floor((a + 11 * h + 22 * l) / 451);
  const n = h + l - 7 * m + 114;
  return new Date(y, Math.floor(n / 31) - 1, (n % 31) + 1);
}

// Kölner Besonderheiten im Jahreslauf
function seasonHint(now = Date.now()) {
  const n = new Date(now), m = n.getMonth() + 1, day = n.getDate();
  const e = easter(n.getFullYear());
  const off = k => { const x = new Date(e); x.setDate(x.getDate() + k); return x.getTime(); };
  if (now >= off(-52) && now < off(-46)) return {   // Weiberfastnacht bis Veilchendienstag
    title: 'Straßenkarneval',
    text: 'Sehr viele Fahrten rund um Altstadt, Zülpicher Straße und Südstadt. Achte auf Straßensperrungen und plane Umwege ein.'
  };
  if (m === 11 && day === 11) return {
    title: 'Elfter im Elften',
    text: 'Sessionseröffnung: ab mittags sehr viel los rund um Heumarkt, Altstadt und Zülpicher Straße. Sperrungen beachten.'
  };
  if ((m === 11 && day >= 23) || (m === 12 && day <= 23)) return {
    title: 'Weihnachtsmarkt-Zeit',
    text: 'Abends viele Fahrgäste an den Weihnachtsmärkten: Dom, Heumarkt / Alter Markt, Neumarkt und Rudolfplatz. Dazu Weihnachtsfeiern – Restaurants und Hotels im Blick behalten.'
  };
  return null;
}

// Eigene beste Orte zur aktuellen Zeit (gleicher Tagestyp, gleiche Uhrzeit ± 2 Stunden)
function myBestPlaces(now = Date.now()) {
  const h = new Date(now).getHours();
  const weekend = t => { const d = dow(t), hr = new Date(t).getHours(); return d === 5 || d === 6 || (d === 4 && hr >= 18); };
  const wk = weekend(now);
  const near = S.rides.filter(r => {
    const diff = Math.abs(new Date(r.t).getHours() - h);
    return Math.min(diff, 24 - diff) <= 2 && weekend(r.t) === wk && r.place;
  });
  if (near.length >= 5) return { scope: 'um diese Uhrzeit', list: byPlace(near).slice(0, 3), n: near.length };
  const all = S.rides.filter(r => r.place);
  if (all.length >= 5) return { scope: 'insgesamt', list: byPlace(all).slice(0, 3), n: all.length };
  return { scope: '', list: [], n: S.rides.length };
}

/* ---------- Ansicht: Heute ---------- */

const CHECK = [
  'Wechselgeld dabei (Scheine und Münzen)',
  'Kartenleser geladen und getestet',
  'Tank / Akku voll genug',
  'Auto innen und außen sauber',
  'Handy geladen, Ladekabel dabei',
  'Funk / Vermittlungs-App angemeldet',
  'Quittungsblock und Stift',
  'Wasser und etwas zu essen'
];

function checklistCard() {
  const today = dayKey(Date.now());
  if (S.check.day !== today) { S.check = { day: today, done: {} }; }
  const doneCount = CHECK.filter((_, i) => S.check.done[i]).length;
  return `<section class="card">
    <h2>Vor der Schicht <span class="muted small">${doneCount} von ${CHECK.length}</span></h2>
    ${CHECK.map((c, i) => `<label class="check ${S.check.done[i] ? 'done' : ''}">
      <input type="checkbox" data-check="${i}" ${S.check.done[i] ? 'checked' : ''}><span>${esc(c)}</span>
    </label>`).join('')}
  </section>`;
}

function viewToday() {
  const sh = activeShift();
  const now = Date.now();

  if (!sh) {
    const last = S.shifts.filter(s => s.end).sort((a, b) => b.end - a.end)[0];
    let lastCard = '';
    if (last) {
      const rides = S.rides.filter(r => r.shiftId === last.id);
      const rev = sum(rides, 'amount');
      const hrs = (last.end - last.start) / 36e5;
      lastCard = `<section class="card">
        <h2>Letzte Schicht <span class="muted small">${DAYS[dow(last.start)]} ${hhmm(last.start)}–${hhmm(last.end)}</span></h2>
        <table class="t">
          <tr><td>Umsatz</td><td><b>${eur(rev)}</b></td></tr>
          <tr><td>Trinkgeld</td><td>${eur(sum(rides, 'tip'))}</td></tr>
          <tr><td>Fahrten</td><td>${rides.length}</td></tr>
          <tr><td>Umsatz pro Stunde</td><td>${hrs > 0.05 ? eur(rev / hrs) : '–'}</td></tr>
        </table>
      </section>`;
    }
    const intro = S.shifts.length ? '' : `<section class="card hint">
      <h2>So funktioniert es</h2>
      <p>1. Tippe auf <b>Schicht starten</b>, wenn du losfährst.</p>
      <p>2. Trage nach <b>jeder Fahrt</b> den Betrag und den Einstiegsort ein – das dauert 5 Sekunden.</p>
      <p>3. Der <b>Coach</b> zeigt dir danach, wo und wann du am meisten verdienst.</p>
    </section>`;
    return `<section class="card center">
        <p class="muted">Keine Schicht aktiv</p>
        <button class="btn primary big" data-act="shiftStart">Schicht starten</button>
      </section>${intro}${checklistCard()}${lastCard}`;
  }

  const rides = S.rides.filter(r => r.shiftId === sh.id).sort((a, b) => b.t - a.t);
  const rev = sum(rides, 'amount');
  const tips = sum(rides, 'tip');
  const hrs = (now - sh.start) / 36e5;
  const perH = hrs > 0.05 ? rev / hrs : 0;
  const goal = S.settings.goal;
  const pct = goal > 0 ? Math.min(100, rev / goal * 100) : 0;
  const idleSince = S.stand ? S.stand.since : (rides[0] ? rides[0].t : sh.start);
  const idleMin = Math.floor((now - idleSince) / 60000);
  const mins = t => Math.max(0, Math.floor((now - t) / 60000));

  // Drei Zustände: Fahrt läuft / stehe am Halteplatz / frei
  let actionBlock;
  if (S.trip) {
    actionBlock = `<section class="card hint good">
        <h2>Fahrt läuft seit ${mins(S.trip.start)} Min</h2>
        <p>Ab <b>${esc(S.trip.place)}</b> · gewartet ${S.trip.wait} Min</p>
        <div class="stack">
          <button class="btn primary big" data-act="tripEnd">Fahrt beenden – Preis eintragen</button>
          <button class="btn ghost" data-act="tripCancel">Fahrt verwerfen</button>
        </div></section>`;
  } else if (S.stand) {
    actionBlock = `<section class="card hint">
        <h2>Du stehst an: ${esc(S.stand.name)}</h2>
        <p>Seit ${mins(S.stand.since)} Min</p>
        <div class="stack">
          <button class="btn primary big" data-act="tripStart">Fahrgast eingestiegen</button>
          <div class="row"><button class="btn" data-act="standPick">Platz wechseln</button>
          <button class="btn" data-act="standLeave">Platz verlassen</button></div>
        </div></section>`;
  } else {
    actionBlock = `<div class="stack" style="margin-bottom:14px">
        <button class="btn primary big" data-act="standPick">📍 Ich stehe an einem Halteplatz</button>
        <button class="btn" data-act="rideNew">＋ Fahrt ohne Halteplatz eintragen</button></div>`;
  }

  let goalLine = '';
  if (goal > 0) {
    if (rev >= goal) goalLine = 'Tagesziel erreicht – alles ab jetzt ist Bonus.';
    else if (perH > 0) goalLine = `Noch ${eur(goal - rev)} – bei diesem Tempo in ca. ${dur((goal - rev) / perH * 36e5)}.`;
    else goalLine = `Noch ${eur(goal - rev)} bis zum Tagesziel.`;
  }

  const adv = slotAdvice(now);
  const idleCard = S.trip ? '' : idleMin >= 20
    ? `<section class="card hint warn"><h2>Seit ${idleMin} Minuten keine Fahrt</h2>
        <p>Wechsle den Standort. Jetzt gut: <b>${esc(adv.places[0])}</b> oder <b>${esc(adv.places[1])}</b>.</p></section>`
    : `<section class="card hint"><h2>Tipp für jetzt: ${esc(adv.title)}</h2>
        <p>${esc(adv.places.join(' · '))}</p></section>`;

  return `<div class="kpis">
      <div class="kpi big">
        <div class="label">Umsatz diese Schicht</div>
        <div class="value">${eur(rev)}</div>
        ${goal > 0 ? `<div class="bar ${rev >= goal ? 'done' : ''}"><i style="width:${pct.toFixed(1)}%"></i></div>
        <div class="muted small">${esc(goalLine)}</div>` : ''}
      </div>
      <div class="kpi"><div class="label">Pro Stunde</div><div class="value">${perH ? eur0(perH) : '–'}</div></div>
      <div class="kpi"><div class="label">Fahrten</div><div class="value">${rides.length}</div></div>
      <div class="kpi"><div class="label">Trinkgeld</div><div class="value">${eur0(tips)}</div></div>
      <div class="kpi"><div class="label">Schichtdauer</div><div class="value" style="font-size:20px">${dur(now - sh.start)}</div></div>
    </div>
    ${actionBlock}
    ${idleCard}
    <section class="card">
      <h2>Fahrten dieser Schicht</h2>
      ${rides.length ? `<ul class="list">${rides.map(r => `<li>
          <div class="grow"><div>${esc(r.place || 'Ohne Ort')}</div>
            <div class="sub">${hhmm(r.t)} · ${esc(r.pay)} · ${esc(r.src)}${r.wait != null ? ' · gewartet ' + r.wait + ' Min' : ''}</div></div>
          <div class="amt">${eur(r.amount)}${r.tip ? `<div class="sub">+ ${eur(r.tip)}</div>` : ''}</div>
          <button class="x" data-act="rideDel" data-id="${r.id}" aria-label="Fahrt löschen">✕</button>
        </li>`).join('')}</ul>` : '<p class="muted">Noch keine Fahrt eingetragen.</p>'}
    </section>
    <button class="btn danger" data-act="shiftEnd">Schicht beenden</button>`;
}

function rideForm(trip) {
  const pays = ['Bar', 'Karte', 'App'];
  const srcs = ['Halteplatz', 'Winker', 'Funk', 'App', 'Stammkunde'];
  const lastSrc = trip ? 'Halteplatz' : S.last.src;
  const names = [...new Set(HP.map(p => p.name))];
  const placeBlock = trip
    ? `<p>Einstieg: <b>${esc(trip.place)}</b> · gewartet ${trip.wait} Min · Fahrt ${Math.max(0, Math.round((Date.now() - trip.start) / 60000))} Min</p>`
    : `<span class="muted small">Wo ist der Fahrgast eingestiegen?</span>
      <div class="chips">${S.settings.places.map(p => `<label class="chip"><input type="radio" name="place" value="${esc(p)}"><span>${esc(p)}</span></label>`).join('')}</div>
      <label class="f"><span>Anderer Ort oder Halteplatz – tippen zum Suchen (wird gemerkt)</span>
        <input name="placeNew" type="text" maxlength="40" list="hpNames"></label>
      <datalist id="hpNames">${names.map(n => `<option value="${esc(n)}">`).join('')}</datalist>`;
  return `<h2>${trip ? 'Fahrt beenden' : 'Fahrt eintragen'}</h2>
    <form data-form="ride" data-trip="${trip ? 1 : 0}" autocomplete="off">
      <label class="f"><span>Fahrpreis in Euro</span>
        <input class="money" name="amount" type="text" inputmode="decimal" placeholder="0,00" autofocus required></label>
      <label class="f"><span>Trinkgeld in Euro (freiwillig)</span>
        <input name="tip" type="text" inputmode="decimal" placeholder="0,00"></label>
      <span class="muted small">Bezahlt mit</span>
      <div class="seg">${pays.map(p => `<label class="chip"><input type="radio" name="pay" value="${p}" ${S.last.pay === p ? 'checked' : ''}><span>${p}</span></label>`).join('')}</div>
      ${placeBlock}
      <span class="muted small">Wie kam die Fahrt?</span>
      <div class="chips">${srcs.map(p => `<label class="chip"><input type="radio" name="src" value="${p}" ${lastSrc === p ? 'checked' : ''}><span>${p}</span></label>`).join('')}</div>
      <div class="row">
        <button type="button" class="btn ghost" data-act="sheetClose">Abbrechen</button>
        <button type="submit" class="btn primary">Speichern</button>
      </div>
    </form>`;
}

/* ---------- Ansicht: Coach ---------- */

const TIPS = [
  'Trage jede Fahrt sofort ein. Nur so lernt die App, wo und wann du am meisten verdienst.',
  'Steh nie länger als 20 bis 30 Minuten ohne Fahrt am selben Platz – wechsle den Standort.',
  'Lass Funk und Vermittlungs-App immer an. Mehr Kanäle bedeuten weniger Leerlauf.',
  'Baue Stammkunden auf: Visitenkarte mitgeben und Vorbestellungen annehmen (Flughafen, Arzt, Dialyse).',
  'Biete immer Kartenzahlung an. Viele Fahrgäste haben kein Bargeld dabei.',
  'Freundlich sein, sauberes Auto, beim Gepäck helfen – das bringt das meiste Trinkgeld.',
  'Prüfe jeden Tag: Was läuft in der Lanxess Arena, auf der Koelnmesse und im RheinEnergieStadion? Das Ende einer Veranstaltung bringt viele Fahrten auf einmal.',
  'Regen, Kälte und Ausfälle bei KVB oder Bahn erhöhen die Nachfrage. An solchen Tagen lohnt es sich, länger zu fahren.',
  'Lege Pause und Tanken in deine schwachen Stunden (siehe Tabelle „Deine starken Zeiten“).',
  'Lehne kurze Fahrten nicht ab. Im Pflichtfahrgebiet musst du befördern – und viele kurze Fahrten bringen oft mehr pro Stunde als langes Warten.',
  'Das Kölner Pflichtfahrgebiet ist groß: Es reicht unter anderem bis Bonn, Düsseldorf, Leverkusen und in den Rhein-Erft-Kreis. Das sind lange Fahrten zum vollen Tarif.',
  'Bei mehr als 4 Fahrgästen oder bestelltem Großraumtaxi gilt der erhöhte Grundpreis (siehe Rechner).',
  'Liegt das Ziel außerhalb des Pflichtfahrgebiets, musst du den Fahrgast vor der Abfahrt darauf hinweisen und den Preis für die ganze Strecke vereinbaren.',
  'Du musst laut Tarif nicht länger als 15 Minuten auf einen Fahrgast warten.',
  'Fahre den kürzesten Weg, außer der Fahrgast wünscht einen anderen. Im Zweifel kurz fragen.',
  'Biete immer eine Quittung an.',
  'Bediene das Handy nur im Stand.'
];

function viewCoach() {
  const now = Date.now();
  const adv = slotAdvice(now);
  const best = myBestPlaces(now);
  const hm = heatmap();
  const season = seasonHint(now);

  const bestCard = best.list.length
    ? `<section class="card hint good">
        <h2>Deine besten Orte ${esc(best.scope)}</h2>
        <ul class="list">${best.list.map((p, i) => `<li>
          <span class="rank">${i + 1}</span>
          <div class="grow"><div>${esc(p.place)}</div><div class="sub">${p.count} Fahrten · Ø ${eur(p.rev / p.count)}</div></div>
          <div class="amt">${eur(p.rev)}</div></li>`).join('')}</ul>
        <p class="muted small">Aus ${best.n} eigenen Fahrten berechnet.</p>
      </section>`
    : `<section class="card">
        <h2>Deine besten Orte</h2>
        <p class="muted">Noch zu wenig Daten (${best.n} von 5 Fahrten). Trage jede Fahrt mit Einstiegsort ein – dann zeigt dir die App hier deine stärksten Plätze.</p>
      </section>`;

  const blocks = ['0', '3', '6', '9', '12', '15', '18', '21'];
  const anyHeat = hm.max > 0;
  const heat = `<div class="heat">
      <div></div>${blocks.map(b => `<div class="h">${b}</div>`).join('')}
      ${DAYS.map((d, i) => `<div class="r">${d}</div>` + hm.cells[i].map(v => {
        if (v == null) return '<div class="c empty">·</div>';
        const a = hm.max > 0 ? 0.25 + 0.75 * (v / hm.max) : 0.25;
        return `<div class="c" style="background:rgba(255,204,0,${a.toFixed(2)})">${Math.round(v)}</div>`;
      }).join('')).join('')}
    </div>`;

  return `${aiCard()}
    <section class="card hint">
      <h2>Jetzt: ${DAYS_LONG[dow(now)]}, ${hhmm(now)} Uhr</h2>
      <p><b>${esc(adv.title)}</b></p>
      <ul class="list">${adv.places.map((p, i) => `<li><span class="rank">${i + 1}</span><div class="grow">${esc(p)}</div></li>`).join('')}</ul>
      <p class="small">${esc(adv.text)}</p>
      <p class="muted small">Allgemeine Erfahrungswerte. Deine eigenen Zahlen unten sind genauer, sobald genug Fahrten eingetragen sind.</p>
    </section>
    ${season ? `<section class="card hint warn"><h2>Gerade in Köln: ${esc(season.title)}</h2><p>${esc(season.text)}</p></section>` : ''}
    ${potentialCard(now)}
    ${standCard(now)}
    ${sourceCard()}
    ${bestCard}
    <section class="card">
      <h2>Deine starken Zeiten</h2>
      <p class="muted small">Umsatz pro gearbeiteter Stunde in Euro – nach Wochentag und Uhrzeit (Beginn des 3-Stunden-Blocks). Je heller, desto besser.</p>
      ${heat}
      ${anyHeat ? '' : '<p class="muted small" style="margin-top:10px">Die Tabelle füllt sich mit jeder Schicht.</p>'}
    </section>
    <section class="card">
      <h2>${TIPS.length} Regeln für mehr Umsatz in Köln</h2>
      <ol class="tips">${TIPS.map(t => `<li>${esc(t)}</li>`).join('')}</ol>
    </section>`;
}

/* ---------- Eigener Standort (GPS) ---------- */

// Der Standort bleibt im Arbeitsspeicher dieses Geräts: Er wird nicht gespeichert und nirgendwohin gesendet.
let myPos = null; // { lat, lon, acc, t }

function distM(a, b) {
  const R = 6371000, rad = x => x * Math.PI / 180;
  const dLat = rad(b[0] - a[0]), dLon = rad(b[1] - a[1]);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a[0])) * Math.cos(rad(b[0])) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const fmtDist = m => m < 1000 ? Math.round(m / 10) * 10 + ' m' : (m / 1000).toFixed(1).replace('.', ',') + ' km';
const posFresh = () => !!myPos && Date.now() - myPos.t < 10 * 60000;

function locate() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) return reject(new Error('Dieses Gerät kann keinen Standort liefern.'));
    navigator.geolocation.getCurrentPosition(
      p => { myPos = { lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy, t: Date.now() }; resolve(myPos); },
      e => reject(new Error(e.code === 1 ? 'Standort nicht erlaubt. Bitte im Handy für diese App freigeben.'
        : e.code === 3 ? 'Der Standort hat zu lange gedauert. Bitte noch einmal versuchen.'
        : 'Der Standort ist gerade nicht verfügbar.')),
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 30000 });
  });
}

function nearby(limit) {
  if (!myPos) return [];
  const me = [myPos.lat, myPos.lon];
  return HP.filter(p => p.pos).map(p => ({ p, d: distM(me, p.pos) })).sort((a, b) => a.d - b.d).slice(0, limit);
}

// Manche Plätze gelten nur zu bestimmten Zeiten, z. B. „6–22“ oder über Mitternacht „22–6“
function hpOpenNow(p, now = Date.now()) {
  if (!p.hrs) return true;
  const [a, b] = p.hrs.split('–').map(Number);
  const h = new Date(now).getHours();
  return a < b ? h >= a && h < b : h >= a || h < b;
}

/* ---------- Umfeld und geschätztes Potenzial (aus Kartendaten, keine Messung) ---------- */

// Gewicht je Art und Tageszeit: [Nacht 0–4, Früh 4–9, Vormittag 9–12, Mittag 12–16, Feierabend 16–20, Abend 20–24].
// „frei“ gilt an freien Tagen bzw. in Ausgeh-Nächten, „satt“ = ab so vielen Einrichtungen zählt mehr kaum noch.
// Das sind Erfahrungs-Annahmen, keine gemessenen Umsätze – eigene Messungen sind immer genauer.
const POTENZIAL = {
  bahnhof:      { label: ['Bahnhof', 'Bahnhöfe'],             tag: [1.5, 2.5, 2, 2, 3, 2.5],     frei: [2, 1.5, 2, 2, 2.5, 2.5],     satt: 2 },
  hotel:        { label: ['Hotel', 'Hotels'],                 tag: [0.5, 3, 1.5, 1, 2, 2],       frei: [1, 2, 2, 1, 1.5, 2],         satt: 8 },
  klinik:       { label: ['Klinik', 'Kliniken'],              tag: [1, 1.5, 3, 2.5, 2, 1],       frei: [1, 1, 2, 2, 1.5, 1],         satt: 2 },
  bahnbetrieb:  { label: ['Bahn-Betrieb', 'Bahn-Betriebe'],   tag: [2, 2, 1, 1, 1.5, 1.5],       frei: [2, 1.5, 1, 1, 1, 1.5],       satt: 2 },
  event:        { label: ['Veranstaltungsort', 'Veranstaltungsorte'], tag: [0.5, 0, 0.3, 0.5, 1, 3], frei: [1, 0, 0.5, 1, 1.5, 3],   satt: 4, party: true },
  nacht:        { label: ['Lokal', 'Lokale'],                 tag: [1.5, 0, 0, 0.2, 0.5, 2],     frei: [4, 0.5, 0, 0.3, 1, 3],       satt: 25, party: true },
  restaurant:   { label: ['Restaurant', 'Restaurants'],       tag: [0.2, 0, 0.2, 0.7, 0.5, 1.5], frei: [0.5, 0, 0.3, 1, 1, 2],       satt: 30, party: true },
  buero:        { label: ['Büro', 'Büros'],                   tag: [0, 1, 1.5, 1.5, 2.5, 0.5],   frei: [0, 0, 0.2, 0.2, 0.2, 0],     satt: 40 },
  versicherung: { label: ['Versicherung', 'Versicherungen'],  tag: [0, 0.5, 1, 1, 1.5, 0.2],     frei: [0, 0, 0, 0, 0, 0],           satt: 3 },
  industrie:    { label: ['Betrieb', 'Betriebe'],             tag: [0.3, 1, 0.5, 1, 1, 0.7],     frei: [0.2, 0.3, 0.2, 0.3, 0.3, 0.3], satt: 3 },
  pflege:       { label: ['Pflegeheim', 'Pflegeheime'],       tag: [0, 0.5, 1.5, 1.5, 0.5, 0],   frei: [0, 0.3, 1, 1, 0.5, 0],       satt: 2 },
  arzt:         { label: ['Arztpraxis', 'Arztpraxen'],        tag: [0, 0.5, 2, 1.5, 1, 0],       frei: [0, 0, 0.2, 0.2, 0, 0],       satt: 15 },
  einkauf:      { label: ['Einkaufszentrum', 'Einkaufszentren'], tag: [0, 0, 1, 1.5, 1.5, 0.3],  frei: [0, 0, 1.5, 2, 1.5, 0.3],     satt: 2 },
  uni:          { label: ['Hochschule', 'Hochschulen'],       tag: [0, 0.3, 0.5, 0.5, 0.5, 0.2], frei: [0, 0, 0, 0, 0, 0],           satt: 2 }
};
const HAS_UMFELD = HP.some(p => p.env);

// Große Verkehrsknoten: Das Zählen von Einrichtungen unterschätzt sie, weil ein Fernbahnhof oder
// ein Flughafen nur „eine“ Einrichtung ist, aber den ganzen Tag Reisende mit Gepäck bringt.
const HUBS = {
  'Hauptbahnhof': { label: 'Fernbahnhof', tag: [2, 3, 3, 2.5, 3.5, 3], frei: [2.5, 2, 2.5, 3, 3.5, 3] },
  'Breslauer Platz': { label: 'Fernbahnhof', tag: [1.5, 2.5, 2.5, 2, 3, 2.5], frei: [2, 1.5, 2, 2.5, 3, 2.5] },
  'Deutz Bhf': { label: 'Fernbahnhof', tag: [1.5, 2.5, 2.5, 2, 3, 2.5], frei: [1.5, 1.5, 2, 2.5, 3, 2] },
  'Flughafen': { label: 'Flughafen', tag: [0.3, 5.5, 3.5, 3.5, 4, 3], frei: [0.3, 5, 4, 4, 4, 3] }
};

function potential(p, now = Date.now()) {
  if (!p.env) return null;
  const d = dow(now), h = new Date(now).getHours();
  const slot = h < 4 ? 0 : h < 9 ? 1 : h < 12 ? 2 : h < 16 ? 3 : h < 20 ? 4 : 5;
  const freeDay = d >= 5;                                                   // Samstag, Sonntag
  const partyTime = ((d === 5 || d === 6) && h < 5) || ((d === 4 || d === 5) && h >= 20);
  const parts = [];
  let score = 0;
  for (const k of UMFELD_ARTEN) {
    const n = p.env[k];
    if (!n) continue;
    const def = POTENZIAL[k];
    const wgt = (def.party ? partyTime : freeDay) ? def.frei[slot] : def.tag[slot];
    const v = wgt * Math.min(1, Math.sqrt(n / def.satt));
    if (v > 0) { score += v; parts.push({ k, v, label: def.label[n === 1 ? 0 : 1] }); }
  }
  const hub = HUBS[p.name];
  if (hub) {
    const v = freeDay ? hub.frei[slot] : hub.tag[slot];
    if (v > 0) { score += v; parts.push({ k: 'hub', v, label: hub.label }); }
  }
  parts.sort((a, b) => b.v - a.v);
  return { score, why: parts.slice(0, 2).map(x => x.label) };
}

// Kurzbeschreibung des Umfelds, wichtigste Arten zuerst
function envLine(p, max = 5) {
  if (!p.env) return '';
  return UMFELD_ARTEN.filter(k => p.env[k] > 0).slice(0, max)
    .map(k => p.env[k] === 1 ? POTENZIAL[k].label[0] : `${p.env[k]} ${POTENZIAL[k].label[1]}`).join(' · ');
}

// Plätze „nur bei Veranstaltungen/Bedarf“ fehlen hier: Ob gerade etwas stattfindet, weiß die App nicht.
function potentialRanking(now, list, limit) {
  return list.filter(p => p.env && !p.note && hpOpenNow(p, now)).map(p => ({ p, pot: potential(p, now) }))
    .filter(x => x.pot.score > 0).sort((a, b) => b.pot.score - a.pot.score).slice(0, limit);
}

function potentialCard(now) {
  if (!HAS_UMFELD) return '';
  const me = posFresh() ? [myPos.lat, myPos.lon] : null;
  const row = (x, i) => `<tr><td>${i + 1}. ${esc(x.p.name)}</td><td>${esc(x.pot.why.join(', '))}</td>
    <td>${me && x.p.pos ? fmtDist(distM(me, x.p.pos)) : ''}</td></tr>`;
  const table = (rows, third) => `<table class="t"><tr><th>Platz</th><th>Warum</th><th>${third}</th></tr>${rows.map(row).join('')}</table>`;
  const nearList = me ? potentialRanking(now, HP.filter(p => p.pos && distM(me, p.pos) <= 3000), 5) : [];
  const all = potentialRanking(now, HP, 8);
  return `<section class="card hint">
    <h2>Geschätztes Potenzial jetzt</h2>
    <p class="muted small">Aus der Karte berechnet: Was liegt rund um den Platz (Bahnhöfe, Hotels, Kliniken, Büros, Lokale …) und wann ist dort üblicherweise Betrieb? Eine Schätzung, keine gemessenen Umsätze.</p>
    ${me ? (nearList.length ? `<h3>In deiner Nähe (bis 3 km Luftlinie)</h3>${table(nearList, 'Weg')}` : '<p class="muted">Kein passender Platz im Umkreis von 3 km.</p>')
      : '<button class="btn" data-act="geoCoach" style="margin-bottom:10px">📍 Standort abrufen – beste Plätze in meiner Nähe</button>'}
    <h3>Ganz Köln</h3>
    ${table(all, me ? 'Weg' : '')}
  </section>`;
}

/* ---------- Halteplätze: Standort, Rangliste, Verzeichnis ---------- */

// Standort verlassen: Wartezeit ohne Fahrgast merken, damit sie in der Rangliste mitzählt
function closeStand() {
  if (!S.stand) return;
  const min = Math.round((Date.now() - S.stand.since) / 60000);
  if (min >= 1) S.waits.push({ id: uid(), t: S.stand.since, place: S.stand.name, min });
  S.stand = null;
}

function standListHtml(query) {
  const q = query.trim().toLowerCase();
  const btn = (name, sub) => `<li><button type="button" class="btn pick" data-act="standSet" data-name="${esc(name)}">
      <span>${esc(name)}</span>${sub ? `<span class="sub">${esc(sub)}</span>` : ''}</button></li>`;
  if (!q) {
    const near = posFresh() ? nearby(5) : [];
    const nearHtml = near.length ? `<p class="muted small">In deiner Nähe (Luftlinie)</p>
      <ul class="list picks">${near.map(x => btn(x.p.name, `${fmtDist(x.d)} · ${x.p.lage}${hpOpenNow(x.p) ? '' : ' · jetzt nicht in Betrieb'}${x.p.note ? ' · nur ' + x.p.note : ''}`)).join('')}</ul>` : '';
    return `${nearHtml}<p class="muted small">Meine Orte – oder oben tippen, um alle ${HP.length} Halteplätze zu durchsuchen.</p>
      <ul class="list picks">${S.settings.places.map(p => btn(p, '')).join('')}</ul>`;
  }
  const seen = new Set();
  const own = S.settings.places.filter(p => p.toLowerCase().includes(q));
  own.forEach(p => seen.add(p));
  const hits = HP.filter(p => (p.name + ' ' + p.lage).toLowerCase().includes(q) && !seen.has(p.name) && seen.add(p.name)).slice(0, 30);
  if (!own.length && !hits.length) return '<p class="muted">Nichts gefunden.</p>';
  return `<ul class="list picks">${own.map(p => btn(p, 'Mein Ort')).join('')}${hits.map(p => btn(p.name, p.lage + (p.zone ? ' · Zone ' + p.zone : '') + (p.note ? ' · nur ' + p.note : ''))).join('')}</ul>`;
}

function standSheet() {
  return `<h2>Wo stehst du?</h2>
    <label class="f"><input id="standSearch" type="text" placeholder="Halteplatz oder Straße suchen" autocomplete="off"></label>
    <p class="muted small" id="standGeo">${HP.some(p => p.pos) && !posFresh() ? 'Standort wird gesucht …' : ''}</p>
    <div id="standList">${standListHtml('')}</div>
    <button type="button" class="btn ghost" data-act="sheetClose" style="margin-top:10px">Abbrechen</button>`;
}

// Je Ort: Fahrten, Umsatz, Wartezeit (auch vergebliche) und Fahrzeit – nur Fahrten mit gemessener Wartezeit
function standStats(filter) {
  const m = new Map();
  const get = k => {
    let o = m.get(k);
    if (!o) { o = { place: k, rides: 0, rev: 0, wait: 0, dur: 0 }; m.set(k, o); }
    return o;
  };
  for (const r of S.rides) {
    if (r.wait == null || !r.place || (filter && !filter(r.t))) continue;
    const o = get(r.place);
    o.rides++; o.rev += r.amount; o.wait += r.wait; o.dur += r.dur || 0;
  }
  for (const w of S.waits) {
    if (filter && !filter(w.t)) continue;
    get(w.place).wait += w.min;
  }
  return [...m.values()].map(o => Object.assign(o, {
    perHour: o.wait + o.dur > 0 ? o.rev / ((o.wait + o.dur) / 60) : 0,
    avgWait: o.rides ? o.wait / o.rides : null
  }));
}

// Gleiche Tageszeit (± 2 Stunden) und gleicher Tagestyp (Wochenende / Werktag)
function slotFilter(now) {
  const h = new Date(now).getHours();
  const weekend = t => { const d = dow(t), hr = new Date(t).getHours(); return d === 5 || d === 6 || (d === 4 && hr >= 18); };
  const wk = weekend(now);
  return t => { const diff = Math.abs(new Date(t).getHours() - h); return Math.min(diff, 24 - diff) <= 2 && weekend(t) === wk; };
}

const MIN_RIDES = 3; // ab so vielen Fahrten kommt ein Platz in die Rangliste

function standCard(now) {
  const rank = f => standStats(f).filter(o => o.rides >= MIN_RIDES).sort((a, b) => b.perHour - a.perHour);
  const slot = rank(slotFilter(now));
  const useSlot = slot.length >= 2;
  const list = useSlot ? slot : rank(null);
  const tracked = standStats(null).length;
  if (!list.length) {
    return `<section class="card">
      <h2>Umsatzstärkste Halteplätze</h2>
      <p class="muted">Noch keine Rangliste. So misst die App: Tippe unter „Heute“ auf <b>Ich stehe an einem Halteplatz</b>, dann auf <b>Fahrgast eingestiegen</b> und am Ende auf <b>Fahrt beenden</b>.</p>
      <p class="muted small">Ab ${MIN_RIDES} Fahrten erscheint ein Platz hier.${tracked ? ` Bisher ${tracked} ${tracked === 1 ? 'Platz' : 'Plätze'} mit ersten Daten.` : ''}</p>
    </section>`;
  }
  return `<section class="card hint good">
    <h2>Umsatzstärkste Halteplätze ${useSlot ? 'um diese Uhrzeit' : 'insgesamt'}</h2>
    <table class="t">
      <tr><th>Platz</th><th>Fahrten</th><th>Ø Warten</th><th>€ / Std</th></tr>
      ${list.slice(0, 10).map((o, i) => `<tr><td>${i + 1}. ${esc(o.place)}</td><td>${o.rides}</td>
        <td>${Math.round(o.avgWait)} Min</td><td><b>${eur0(o.perHour)}</b></td></tr>`).join('')}
    </table>
    <p class="muted small" style="margin-top:8px">€ / Std = Umsatz geteilt durch Wartezeit plus Fahrzeit. Auch vergebliches Warten zählt mit. Je mehr Fahrten, desto verlässlicher.</p>
  </section>`;
}

function hpMatches() {
  const q = hpQuery.trim().toLowerCase();
  const list = HP.filter(p => (!hpChan || p.ch === hpChan) &&
    (!q || (p.name + ' ' + p.lage + (p.zone ? ' zone ' + p.zone : '') + ' ' + (p.nr || '')).toLowerCase().includes(q)));
  if (hpNear && myPos) {   // nach Entfernung sortieren; Plätze ohne Kartenposition ans Ende
    const me = [myPos.lat, myPos.lon];
    const d = p => p.pos ? distM(me, p.pos) : Infinity;
    list.sort((a, b) => d(a) - d(b));
  }
  return list;
}

function hpListHtml() {
  const list = hpMatches();
  if (!list.length) return '<p class="muted">Kein Halteplatz gefunden.</p>';
  return `<ul class="list hp">${list.map(p => {
    const fav = S.settings.places.includes(p.name);
    const away = myPos && p.pos ? fmtDist(distM([myPos.lat, myPos.lon], p.pos)) + ' Luftlinie' : '';
    const meta = [away, chLabel(p.ch), p.zone ? 'Zone ' + p.zone : '', p.nr ? 'Nr. ' + p.nr : '', p.n ? p.n + ' Plätze' : '',
      p.rs ? 'Rufsäule' : '', p.hrs ? 'nur ' + p.hrs + ' Uhr' + (hpOpenNow(p) ? '' : ' (jetzt nicht in Betrieb)') : '',
      p.note ? 'nur ' + p.note : ''].filter(Boolean).join(' · ');
    const dest = encodeURIComponent(p.lage + ', ' + p.name + ', Köln');
    return `<li>
      <div class="grow"><div><b>${esc(p.name)}</b></div><div class="sub">${esc(p.lage)}</div><div class="sub">${esc(meta)}</div>
        ${p.env && envLine(p) ? `<div class="sub">Umfeld: ${esc(envLine(p))}</div>` : ''}
        ${p.envNames.length ? `<div class="sub">z. B. ${esc(p.envNames.join(', '))}</div>` : ''}</div>
      <button class="x star ${fav ? 'on' : ''}" data-act="hpFav" data-name="${esc(p.name)}"
        aria-label="${fav ? 'Aus meinen Orten entfernen' : 'Zu meinen Orten hinzufügen'}">${fav ? '★' : '☆'}</button>
      <a class="btn route" href="https://www.google.com/maps/dir/?api=1&amp;destination=${dest}" target="_blank" rel="noopener">Route</a>
    </li>`;
  }).join('')}</ul>`;
}

function hpInfoText() {
  const n = hpMatches().length;
  return n + (n === 1 ? ' Halteplatz' : ' Halteplätze') + (hpChan === 5 ? ' · Sonderplätze (Bahnhof, Flughafen, Messe, Veranstaltungen)'
    : hpChan ? ' · Kanal ' + hpChan + ': ' + CHANNELS[hpChan] : '');
}

function updateHp() {
  const list = $('#hpList');
  if (!list) return;
  list.innerHTML = hpListHtml();
  $('#hpInfo').textContent = hpInfoText();
}

function viewPlaces() {
  if (!HP.length) return '<section class="card"><p class="muted">Die Halteplatzliste ist auf diesem Gerät nicht geladen.</p></section>';
  const geoBtn = HP.some(p => p.pos)
    ? `<button class="btn ${hpNear ? 'primary' : ''}" data-act="hpNear" style="margin-bottom:12px">📍 ${hpNear ? 'Sortiert nach Entfernung – tippen zum Ausschalten' : 'Plätze in meiner Nähe'}</button>` : '';
  return `${geoBtn}<label class="f"><input id="hpSearch" type="text" placeholder="Halteplatz, Straße oder Zone suchen" value="${esc(hpQuery)}" autocomplete="off"></label>
    <div class="chips">${[0, 1, 2, 3, 4, 5].map(c => `<label class="chip"><input type="radio" name="hpChan" value="${c}" ${hpChan === c ? 'checked' : ''}><span>${c === 5 ? 'Sonder' : c ? 'Kanal ' + c : 'Alle'}</span></label>`).join('')}</div>
    <p class="muted small" id="hpInfo">${esc(hpInfoText())}</p>
    <section class="card" id="hpList">${hpListHtml()}</section>
    <p class="muted small">Halteplatzliste TAXI RUF Köln, Stand Januar 2023. Sonderplätze (Hauptbahnhof, Flughafen, Messe, Veranstaltungsorte) stammen aus der Liste der Stadt Köln, Stand 2019. Mit ☆ kommt ein Platz in „Meine Orte“ und ist dann mit einem Tipp wählbar. „Route“ öffnet Google Maps.</p>
    <p class="muted small">Entfernungen sind Luftlinie und die Kartenpositionen ungefähr (aus OpenStreetMap) – der Rhein kann dazwischen liegen. Dein Standort bleibt auf dem Handy.</p>`;
}

/* ---------- KI-Berater (Claude) ---------- */

// Der Schlüssel liegt getrennt von den Fahrdaten und nur auf diesem Gerät:
// Er steht nicht im Programmcode und kommt nicht in die Sicherungsdatei.
const AI_KEY = 'taxicoach.aikey';
// Preise in US-Dollar je 1 Mio. Tokens (Listenpreis, nur für die Kostenschätzung in der App)
const AI_MODELS = {
  opus: { id: 'claude-opus-5-5', label: 'Beste Qualität (Opus)', input: 4, output: 20 },
  haiku: { id: 'claude-haiku-5-5', label: 'Sparsam (Haiku)', input: 0.1, output: 0.5 }
};
const aiModel = () => AI_MODELS[S.settings.aiModel] || AI_MODELS.opus;
let ai = { loading: false, text: '', error: '', t: 0, cost: null };

function getAiKey() { try { return localStorage.getItem(AI_KEY) || ''; } catch (e) { return ''; } }
function setAiKey(v) {
  try { if (v) localStorage.setItem(AI_KEY, v); else localStorage.removeItem(AI_KEY); }
  catch (e) { toast('Schlüssel konnte nicht gespeichert werden'); }
}

function aiSystemPrompt() {
  const stands = [1, 2, 3, 4, 5].map(c => {
    const names = [...new Set(HP.filter(p => p.ch === c).map(p => p.name + (p.zone ? ` (${p.zone})` : '') + (p.note ? ` – nur ${p.note}` : '')))];
    return c === 5 ? `Sonderplätze ohne Funkkanal: ${names.join(', ')}` : `Kanal ${c} (${CHANNELS[c]}): ${names.join(', ')}`;
  }).join('\n');
  return `Du bist der Umsatz-Berater in einer App für einen Taxifahrer in Köln, der neu im Beruf ist. Er fragt dich während der Schicht, wohin er als Nächstes fahren soll, und liest deine Antwort im stehenden Auto auf dem Handy.

Du bekommst die aktuelle Zeit, das Wetter, seine eigenen Messungen je Halteplatz, eine grobe Schätzung aus Kartendaten (welche Einrichtungen rund um einen Platz liegen) und einen allgemeinen Erfahrungswert. Seine eigenen Messungen sind die beste Grundlage, aber nur, wenn genug Fahrten dahinterstehen. Bei weniger als etwa 5 Fahrten an einem Platz ist die Zahl ein Hinweis und kein Beweis; sag das dann offen und stütze dich stärker auf Uhrzeit, Wochentag, Wetter und das, was über Köln allgemein bekannt ist. Erfinde keine Zahlen, Veranstaltungen oder Zugzeiten: Den heutigen Veranstaltungskalender kennst du nicht.

Antworte auf Deutsch in einfachen, kurzen Sätzen, ohne Fachwörter und ohne Formatierungszeichen. Nenne zuerst einen konkreten Halteplatz aus der Liste unten, dann in einem Satz den Grund, dann eine Ausweichmöglichkeit. Wenn er gerade an einem Platz steht, sag klar, ob er bleiben oder wechseln soll. Höchstens fünf Sätze.

Halteplätze in Köln (in Klammern die Funkzone), nach Funkkanal:
${stands}`;
}

function aiContext(now, weather) {
  const L = [];
  const d = new Date(now);
  L.push(`Jetzt: ${DAYS_LONG[dow(now)]}, ${pad(d.getDate())}.${pad(d.getMonth() + 1)}., ${hhmm(now)} Uhr`);
  if (weather) L.push('Wetter in Köln: ' + weather);
  const season = seasonHint(now);
  if (season) L.push(`Besonderheit: ${season.title} – ${season.text}`);

  const sh = activeShift();
  if (sh) {
    const s = summary(sh.start, now);
    L.push(`Schicht: läuft seit ${dur(now - sh.start)}, Umsatz ${eur(s.rev)}, ${s.count} Fahrten${s.perHour ? ', ' + eur0(s.perHour) + ' pro Stunde' : ''}. Tagesziel ${eur(S.settings.goal)}.`);
  } else {
    L.push('Schicht: noch nicht gestartet.');
  }
  L.push('Standort: ' + (S.trip ? `Fahrt läuft (ab ${S.trip.place})`
    : S.stand ? `steht seit ${Math.floor((now - S.stand.since) / 60000)} Min an „${S.stand.name}“`
    : 'frei, kein Halteplatz gewählt'));

  const line = o => o.rides
    ? `- ${o.place}: ${o.rides} Fahrten, Ø ${Math.round(o.avgWait)} Min Warten, ${Math.round(o.perHour)} € pro Stunde`
    : `- ${o.place}: 0 Fahrten, ${o.wait} Min vergeblich gewartet`;
  const sorted = f => standStats(f).sort((a, b) => b.perHour - a.perHour).slice(0, 15);
  const slot = sorted(slotFilter(now));
  const all = sorted(null);
  L.push('', 'Eigene Messungen um diese Uhrzeit (gleicher Tagestyp, ± 2 Stunden):', slot.length ? slot.map(line).join('\n') : '- noch keine');
  L.push('', 'Eigene Messungen insgesamt:', all.length ? all.map(line).join('\n') : '- noch keine');

  const places = byPlace(S.rides.filter(r => r.place)).slice(0, 12);
  L.push('', 'Umsatz nach Einstiegsort (alle Fahrten, auch ohne Zeitmessung):',
    places.length ? places.map(p => `- ${p.place}: ${p.count} Fahrten, ${eur(p.rev)} gesamt, Ø ${eur(p.rev / p.count)}`).join('\n') : '- noch keine');

  const hm = heatmap();
  const slots = [];
  hm.cells.forEach((row, di) => row.forEach((v, b) => { if (v != null) slots.push({ v, label: `${DAYS[di]} ${b * 3}–${b * 3 + 3} Uhr` }); }));
  slots.sort((a, b) => b.v - a.v);
  if (slots.length) L.push('', 'Stärkste Zeitfenster bisher: ' + slots.slice(0, 5).map(s => `${s.label} ${Math.round(s.v)} € pro Stunde`).join('; '));

  if (posFresh()) {
    const near = nearby(5);
    if (near.length) L.push('', 'Nächste Halteplätze zu meinem Standort (Luftlinie):',
      near.map(x => `- ${x.p.name}, ${fmtDist(x.d)}${envLine(x.p) ? ' – Umfeld: ' + envLine(x.p) : ''}`).join('\n'));
  }
  if (HAS_UMFELD) {
    const top = potentialRanking(now, HP, 8);
    if (top.length) L.push('', 'Geschätztes Potenzial jetzt laut Kartendaten (grobe Schätzung aus dem Umfeld, keine Messung):',
      top.map(x => `- ${x.p.name}: ${envLine(x.p)}`).join('\n'));
  }
  L.push('', 'Meine Orte: ' + S.settings.places.join(', '));
  const adv = slotAdvice(now);
  L.push(`Allgemeiner Erfahrungswert der App für diese Uhrzeit: ${adv.title} – ${adv.places.join(', ')}. ${adv.text}`);
  L.push('', 'Frage: Wohin soll ich jetzt fahren?');
  return L.join('\n');
}

// Aktuelles Wetter für Köln (Open-Meteo, kostenlos, ohne Anmeldung). Fehlt es, geht es ohne weiter.
async function fetchWeather() {
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 5000);
    const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=50.94&longitude=6.96&current=temperature_2m,precipitation,weather_code&timezone=Europe%2FBerlin', { signal: ctl.signal });
    clearTimeout(timer);
    if (!res.ok) return '';
    const c = (await res.json()).current;
    if (!c) return '';
    const code = c.weather_code;
    const sky = code === 0 ? 'klar' : code <= 3 ? 'bewölkt' : code <= 48 ? 'Nebel' : code <= 57 ? 'Nieselregen'
      : code <= 67 ? 'Regen' : code <= 77 ? 'Schnee' : code <= 82 ? 'Regenschauer' : code <= 86 ? 'Schneeschauer' : 'Gewitter';
    return `${Math.round(c.temperature_2m)} °C, ${sky}${c.precipitation > 0 ? `, ${String(c.precipitation).replace('.', ',')} mm Niederschlag` : ''}`;
  } catch (e) {
    return '';
  }
}

async function askAi() {
  if (ai.loading) return;
  const key = getAiKey();
  if (!key) return toast('Bitte zuerst den KI-Schlüssel eintragen');
  if (navigator.onLine === false) { ai = { loading: false, text: '', error: 'Kein Internet. Die Rangliste unten funktioniert auch ohne Netz.', t: 0, cost: null }; return render(); }
  ai = { loading: true, text: '', error: '', t: 0, cost: null };
  render();

  const fail = msg => { ai = { loading: false, text: '', error: msg, t: 0, cost: null }; if (!sheetOpen()) render(); };

  let Anthropic;
  try {
    Anthropic = (await import('./vendor/anthropic-sdk.js')).default;
  } catch (e) {
    return fail('Der KI-Baustein konnte nicht geladen werden. Bitte Internet prüfen und noch einmal versuchen.');
  }

  try {
    const now = Date.now();
    const weather = await fetchWeather();
    // Der Schlüssel gehört dem Nutzer und liegt nur auf seinem Gerät; deshalb darf der Aufruf direkt aus der App kommen.
    const client = new Anthropic({ apiKey: key, dangerouslyAllowBrowser: true, maxRetries: 1, timeout: 60000 });
    const model = aiModel();
    const response = await client.beta.messages.create({
      model: model.id,
      max_tokens: 4096,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',               // lehnt das Modell ab, versucht der Server es mit dem vorgesehenen Ersatzmodell
      output_config: { effort: 'low' },   // kurze Empfehlung: wenig Denkaufwand reicht und hält die Kosten klein
      system: aiSystemPrompt(),
      messages: [{ role: 'user', content: aiContext(now, weather) }]
    });
    if (response.stop_reason === 'refusal') return fail('Die KI hat diese Anfrage abgelehnt. Bitte später noch einmal versuchen.');
    const text = response.content.filter(b => b.type === 'text').map(b => b.text).join('\n').trim();
    if (!text) return fail(response.stop_reason === 'max_tokens' ? 'Die Antwort wurde abgeschnitten. Bitte noch einmal fragen.' : 'Die KI hat keine Antwort geliefert. Bitte noch einmal fragen.');
    const u = response.usage;
    const cost = u ? (u.input_tokens * model.input + u.output_tokens * model.output) / 1e6 : null;
    ai = { loading: false, text, error: '', t: now, cost };
    if (!sheetOpen()) render();
  } catch (err) {
    if (err instanceof Anthropic.AuthenticationError) fail('Der KI-Schlüssel ist ungültig. Bitte unter „Mehr → Einstellungen“ prüfen.');
    else if (err instanceof Anthropic.PermissionDeniedError) fail('Der KI-Schlüssel hat keine Berechtigung für diese Anfrage.');
    else if (err instanceof Anthropic.RateLimitError) fail('Zu viele Anfragen in kurzer Zeit. Bitte eine Minute warten.');
    else if (err instanceof Anthropic.BadRequestError) fail('Die KI hat die Anfrage nicht angenommen. Häufigster Grund: kein Guthaben auf dem Anthropic-Konto.');
    else if (err instanceof Anthropic.APIConnectionError) fail('Keine Verbindung zur KI. Bitte Internet prüfen.');
    else if (err instanceof Anthropic.APIError) fail(`Die KI ist gerade nicht erreichbar (Fehler ${err.status || '?'}). Bitte später noch einmal versuchen.`);
    else fail('Unerwarteter Fehler bei der KI-Anfrage.');
  }
}

// Kostenloser Weg mit Claude-Abo: Frage samt Zahlen kopieren und in der Claude-App einfügen
async function copyForClaude() {
  const weather = await fetchWeather();
  const text = aiSystemPrompt() + '\n\n' + aiContext(Date.now(), weather);
  try {
    await navigator.clipboard.writeText(text);
    toast('Kopiert – jetzt in der Claude-App einfügen');
  } catch (e) {   // Zwischenablage gesperrt: Text zum Markieren anzeigen
    openSheet(`<h2>Text für die Claude-App</h2>
      <p class="muted small">Alles markieren, kopieren und in der Claude-App einfügen.</p>
      <textarea readonly style="min-height:50vh">${esc(text)}</textarea>
      <button type="button" class="btn" data-act="sheetClose" style="margin-top:10px">Schließen</button>`);
  }
}

// Wo kommen Funk- und App-Aufträge her? Aus der Angabe „Wie kam die Fahrt?“ je Einstiegsort
function sourceCard() {
  const m = new Map();
  for (const r of S.rides) {
    if (!r.place) continue;
    const o = m.get(r.place) || { place: r.place, funk: 0, app: 0, stand: 0, n: 0 };
    o.n++;
    if (r.src === 'Funk') o.funk++; else if (r.src === 'App') o.app++; else if (r.src === 'Halteplatz') o.stand++;
    m.set(r.place, o);
  }
  const list = [...m.values()].sort((a, b) => (b.funk + b.app) - (a.funk + a.app) || b.n - a.n).slice(0, 10);
  if (!list.length) {
    return `<section class="card"><h2>Wo kommen Funk-Aufträge?</h2>
      <p class="muted">Noch keine Daten. Wähle beim Eintragen jeder Fahrt unter „Wie kam die Fahrt?“ aus, ob sie über Funk, App oder direkt am Halteplatz kam – dann siehst du hier, an welchem Platz welche Aufträge kommen.</p></section>`;
  }
  const zone = name => { const p = HP.find(x => x.name === name); return p && p.zone ? ` <span class="muted small">Zone ${p.zone}</span>` : ''; };
  return `<section class="card"><h2>Wo kommen Funk-Aufträge?</h2>
    <table class="t">
      <tr><th>Platz</th><th>Funk</th><th>App</th><th>Einsteiger</th><th>Alle</th></tr>
      ${list.map(o => `<tr><td>${esc(o.place)}${zone(o.place)}</td><td><b>${o.funk}</b></td><td>${o.app}</td><td>${o.stand}</td><td>${o.n}</td></tr>`).join('')}
    </table>
    <p class="muted small" style="margin-top:8px">Aus deinen eigenen Fahrten, sortiert nach Funk und App.</p>
  </section>`;
}

function aiCard() {
  const hasKey = !!getAiKey();
  let body;
  if (!hasKey) {
    body = `<p>Noch nicht eingerichtet. Du brauchst einen eigenen KI-Schlüssel von Anthropic:</p>
      <ol class="tips">
        <li>Auf <b>platform.claude.com</b> ein Konto anlegen und etwas Guthaben aufladen.</li>
        <li>Dort einen „API Key“ erstellen und kopieren.</li>
        <li>Hier in den Einstellungen einfügen.</li>
      </ol>
      <button class="btn" data-act="settings">KI-Schlüssel eintragen</button>`;
  } else if (ai.loading) {
    body = '<p>Die KI denkt nach … das dauert ein paar Sekunden.</p>';
  } else {
    const answer = ai.text ? `<div class="ai-answer">${ai.text.split(/\n+/).map(p => `<p>${esc(p)}</p>`).join('')}</div>
      <p class="muted small">Antwort von ${hhmm(ai.t)} Uhr${ai.cost != null ? ` · Kosten ungefähr ${ai.cost < 0.01 ? 'unter 1' : Math.round(ai.cost * 100)} US-Cent` : ''}</p>` : '';
    const error = ai.error ? `<p class="bad">${esc(ai.error)}</p>` : '';
    body = `${answer}${error}<button class="btn primary" data-act="aiAsk">${ai.text ? 'Neu fragen' : 'Wohin jetzt? KI fragen'}</button>`;
  }
  return `<section class="card hint">
    <h2>🤖 KI-Berater</h2>
    ${body}
    <button class="btn" data-act="aiCopy" style="margin-top:10px">Frage für die Claude-App kopieren (kostenlos mit Abo)</button>
    <p class="muted small" style="margin-top:10px">Die KI bekommt Uhrzeit, Wetter und deine Zahlen je Halteplatz – keine Namen und keine Fahrgastdaten. Hast du deinen Standort abgerufen, bekommt sie die Namen der nächsten Halteplätze, nicht deine genaue Position. Der Knopf „KI fragen“ kostet einen kleinen Betrag von deinem Anthropic-Guthaben (Modell: ${esc(aiModel().label)}).</p>
  </section>`;
}

/* ---------- Ansicht: Zahlen ---------- */

function viewNumbers() {
  const now = Date.now();
  const from = periodStart(period, now);
  const s = summary(from, now);
  const names = { heute: 'Heute', woche: 'Woche', monat: 'Monat', alles: 'Alles' };

  // Balken: letzte 7 Tage
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now); d.setHours(0, 0, 0, 0); d.setDate(d.getDate() - i);
    const a = d.getTime(); const e = new Date(d); e.setDate(e.getDate() + 1);
    days.push({ label: DAYS[dow(a)], rev: sum(S.rides.filter(r => r.t >= a && r.t < e.getTime()), 'amount') });
  }
  const maxDay = Math.max(1, ...days.map(d => d.rev));

  const pays = ['Bar', 'Karte', 'App'].map(p => ({ p, rev: sum(s.rides.filter(r => r.pay === p), 'amount') })).filter(x => x.rev > 0);
  const places = byPlace(s.rides).slice(0, 8);
  const srcMap = new Map();
  for (const r of s.rides) { const o = srcMap.get(r.src) || { src: r.src, count: 0, rev: 0 }; o.count++; o.rev += r.amount; srcMap.set(r.src, o); }
  const srcs = [...srcMap.values()].sort((a, b) => b.rev - a.rev);

  return `<div class="seg">${Object.keys(names).map(k =>
      `<label class="chip"><input type="radio" name="period" value="${k}" ${period === k ? 'checked' : ''}><span>${names[k]}</span></label>`).join('')}</div>
    <div class="kpis">
      <div class="kpi big"><div class="label">Umsatz</div><div class="value">${eur(s.rev)}</div></div>
      <div class="kpi"><div class="label">Pro Stunde</div><div class="value">${s.perHour ? eur0(s.perHour) : '–'}</div></div>
      <div class="kpi"><div class="label">Fahrten</div><div class="value">${s.count}</div></div>
      <div class="kpi"><div class="label">Ø pro Fahrt</div><div class="value">${s.count ? eur0(s.avg) : '–'}</div></div>
      <div class="kpi"><div class="label">Trinkgeld</div><div class="value">${eur0(s.tips)}</div></div>
    </div>
    <section class="card">
      <h2>Mein Verdienst (geschätzt)</h2>
      <table class="t">
        <tr><td>Mein Anteil am Umsatz (${S.settings.share} %)</td><td>${eur(s.rev * S.settings.share / 100)}</td></tr>
        <tr><td>+ Trinkgeld</td><td>${eur(s.tips)}</td></tr>
        <tr><td>− Kosten</td><td>${eur(s.costSum)}</td></tr>
        <tr><td><b>Bleibt</b></td><td><b>${eur(s.mine)}</b></td></tr>
        <tr><td>Gearbeitet</td><td>${s.hours.toFixed(1).replace('.', ',')} Std</td></tr>
      </table>
      <p class="muted small" style="margin-top:8px">Vor Steuern und Abgaben. Den Anteil stellst du unter „Mehr → Einstellungen“ ein.</p>
    </section>
    <section class="card">
      <h2>Letzte 7 Tage</h2>
      <div class="days">${days.map(d => `<div class="day"><span class="v">${d.rev ? Math.round(d.rev) : ''}</span>
        <div class="track"><div class="col" style="height:${(d.rev / maxDay * 100).toFixed(1)}%"></div></div><span class="d">${d.label}</span></div>`).join('')}</div>
    </section>
    ${places.length ? `<section class="card"><h2>Orte</h2><table class="t">
      <tr><th>Einstieg</th><th>Fahrten</th><th>Ø</th><th>Umsatz</th></tr>
      ${places.map(p => `<tr><td>${esc(p.place)}</td><td>${p.count}</td><td>${eur0(p.rev / p.count)}</td><td>${eur(p.rev)}</td></tr>`).join('')}
    </table></section>` : ''}
    ${srcs.length ? `<section class="card"><h2>Woher kommen die Fahrten?</h2><table class="t">
      <tr><th>Quelle</th><th>Fahrten</th><th>Umsatz</th></tr>
      ${srcs.map(p => `<tr><td>${esc(p.src)}</td><td>${p.count}</td><td>${eur(p.rev)}</td></tr>`).join('')}
    </table></section>` : ''}
    ${pays.length ? `<section class="card"><h2>Zahlart</h2><table class="t">
      ${pays.map(p => `<tr><td>${p.p}</td><td>${eur(p.rev)}</td></tr>`).join('')}
    </table></section>` : ''}
    <section class="card">
      <h2>Kosten</h2>
      ${s.costs.length ? `<ul class="list">${s.costs.slice().sort((a, b) => b.t - a.t).map(c => `<li>
        <div class="grow"><div>${esc(c.kind)}</div><div class="sub">${dayKey(c.t).split('-').reverse().join('.')}</div></div>
        <div class="amt">${eur(c.amount)}</div>
        <button class="x" data-act="costDel" data-id="${c.id}" aria-label="Kosten löschen">✕</button></li>`).join('')}</ul>`
        : '<p class="muted">Keine Kosten im Zeitraum.</p>'}
      <button class="btn" data-act="costNew" style="margin-top:10px">＋ Kosten eintragen (Tanken, Waschen …)</button>
    </section>`;
}

function costForm() {
  const kinds = ['Tanken / Laden', 'Waschen', 'Essen', 'Sonstiges'];
  return `<h2>Kosten eintragen</h2>
    <form data-form="cost" autocomplete="off">
      <label class="f"><span>Betrag in Euro</span>
        <input class="money" name="amount" type="text" inputmode="decimal" placeholder="0,00" autofocus required></label>
      <div class="chips">${kinds.map((k, i) => `<label class="chip"><input type="radio" name="kind" value="${k}" ${i === 0 ? 'checked' : ''}><span>${k}</span></label>`).join('')}</div>
      <div class="row">
        <button type="button" class="btn ghost" data-act="sheetClose">Abbrechen</button>
        <button type="submit" class="btn primary">Speichern</button>
      </div>
    </form>`;
}

/* ---------- Ansicht: Rechner ---------- */

// Amtlicher Kölner Taxitarif (Rechtsverordnung, 9. Änderungsverordnung vom 02.04.2026).
// Die zweite Stufe gilt ab 01.03.2027 und wird automatisch verwendet.
const KOELN_STEP = new Date(2027, 2, 1).getTime();
function koelnTariff(now = Date.now()) {
  return now >= KOELN_STEP
    ? { base: 5.0, km1: 3.0, km1Until: 0, km2: 3.0, waitPerHour: 36, large: 7 }
    : { base: 4.9, km1: 2.9, km1Until: 0, km2: 2.9, waitPerHour: 36, large: 6 };
}
const isKoeln = () => S.settings.tariffMode === 'koeln';
function tariff() { return isKoeln() ? koelnTariff() : S.settings.tariff; }

function fareParts(km, waitMin, large) {
  const t = tariff();
  const ride = t.base + (large ? (t.large || 0) : 0)
    + Math.min(km, t.km1Until) * t.km1 + Math.max(0, km - t.km1Until) * t.km2;
  return { ride, total: ride + (waitMin / 60) * t.waitPerHour };
}

function viewCalc() {
  const t = tariff();
  const oneKmPrice = t.km1Until <= 0 || t.km1 === t.km2;
  const de = n => String(n).replace('.', ',');
  const stepNote = Date.now() < KOELN_STEP
    ? 'Ab 1. März 2027 rechnet die App automatisch mit den neuen Preisen (Grundpreis 5,00 €, 3,00 € pro km, Großraum 7,00 €).'
    : 'Es gilt die Tarifstufe seit 1. März 2027.';
  return `<section class="card">
      <h2>Fahrpreis schätzen</h2>
      <label class="f"><span>Strecke in Kilometern</span><input id="calcKm" type="text" inputmode="decimal" placeholder="z. B. 12,5"></label>
      <label class="f"><span>Wartezeit / Stau in Minuten</span><input id="calcWait" type="text" inputmode="decimal" placeholder="0"></label>
      ${t.large > 0 ? `<label class="check"><input type="checkbox" id="calcLarge"><span>Großraumtaxi oder mehr als 4 Fahrgäste (+ ${eur(t.large)})</span></label>` : ''}
      <div class="result" id="calcOut">${eur(t.base)}</div>
      <p class="muted small center">Nur eine Schätzung. Es gilt immer der Taxameter.</p>
      ${isKoeln() ? '<p class="small center" id="calcFix"></p>' : ''}
    </section>
    <section class="card">
      <h2>${isKoeln() ? 'Kölner Taxitarif' : 'Eigener Tarif'}</h2>
      <table class="t">
        <tr><td>Grundpreis</td><td>${eur(t.base)}</td></tr>
        ${oneKmPrice ? `<tr><td>Pro Kilometer</td><td>${eur(t.km2)}</td></tr>`
          : `<tr><td>Pro km (bis ${de(t.km1Until)} km)</td><td>${eur(t.km1)}</td></tr>
        <tr><td>Pro km (danach)</td><td>${eur(t.km2)}</td></tr>`}
        <tr><td>Wartezeit pro Minute</td><td>${eur(t.waitPerHour / 60)}</td></tr>
        ${t.large > 0 ? `<tr><td>Großraum / mehr als 4 Fahrgäste</td><td>+ ${eur(t.large)}</td></tr>` : ''}
      </table>
      ${isKoeln() ? `<p class="muted small" style="margin-top:8px">Amtlicher Tarif der Stadt Köln, Fassung vom 02.04.2026. ${stepNote}</p>
      <p class="muted small">Festpreis ist nur bei Vorbestellung mit festem Start und Ziel erlaubt (Telefon oder App) und darf höchstens 20 % über oder unter dem Tarifpreis liegen. Wartezeit zählt dabei nicht mit.</p>` : ''}
      <button class="btn" data-act="settings" style="margin-top:10px">Tarif ändern</button>
    </section>`;
}

function updateCalc() {
  const out = $('#calcOut');
  if (!out) return;
  const large = $('#calcLarge') ? $('#calcLarge').checked : false;
  const km = Math.max(0, num($('#calcKm').value));
  const p = fareParts(km, Math.max(0, num($('#calcWait').value)), large);
  out.textContent = eur(p.total);
  const fix = $('#calcFix');
  if (fix) fix.textContent = km > 0 ? `Festpreis bei Vorbestellung: ${eur(p.ride * 0.8)} bis ${eur(p.ride * 1.2)}` : '';
}

/* ---------- Ansicht: Mehr ---------- */

const PHRASES = [
  ['Where would you like to go?', 'Wohin möchten Sie?'],
  ['Do you have the address?', 'Haben Sie die Adresse?'],
  ['Shall I help you with your luggage?', 'Soll ich Ihnen mit dem Gepäck helfen?'],
  ['It takes about 15 minutes.', 'Es dauert ungefähr 15 Minuten.'],
  ['Cash or card?', 'Bar oder mit Karte?'],
  ['That is 24 euros, please.', 'Das macht 24 Euro, bitte.'],
  ['Would you like a receipt?', 'Möchten Sie eine Quittung?'],
  ['Have a nice day!', 'Einen schönen Tag noch!']
];

function viewMore() {
  return `<section class="card">
      <h2>Einstellungen</h2>
      <table class="t">
        <tr><td>Tagesziel</td><td>${eur(S.settings.goal)}</td></tr>
        <tr><td>Mein Anteil am Umsatz</td><td>${S.settings.share} %</td></tr>
        <tr><td>Meine Orte</td><td>${S.settings.places.length}</td></tr>
        <tr><td>Tarif</td><td>${isKoeln() ? 'Köln (amtlich)' : 'Eigener'}</td></tr>
      </table>
      <button class="btn" data-act="settings" style="margin-top:10px">Einstellungen ändern</button>
    </section>
    ${checklistCard()}
    <section class="card">
      <h2>Englisch für Fahrgäste</h2>
      ${PHRASES.map(p => `<div class="phrase"><b>${esc(p[0])}</b><span class="muted small">${esc(p[1])}</span></div>`).join('')}
    </section>
    <section class="card stack">
      <h2>Meine Daten</h2>
      <p class="muted small">Alle Daten liegen nur auf diesem Gerät. Mach regelmäßig eine Sicherung. Die App ist dein persönliches Notizbuch und ersetzt nicht den Taxameter oder die Aufzeichnungen deines Betriebs.</p>
      <button class="btn" data-act="exportCsv">Fahrten als Tabelle speichern (CSV)</button>
      <button class="btn" data-act="exportJson">Sicherung speichern</button>
      <button class="btn" data-act="importJson">Sicherung laden</button>
      <input type="file" id="importFile" accept="application/json,.json" hidden>
      <button class="btn danger" data-act="wipe">Alle Daten löschen</button>
    </section>`;
}

function settingsForm() {
  const s = S.settings, t = s.tariff;
  const v = n => String(n).replace('.', ',');
  return `<h2>Einstellungen</h2>
    <form data-form="settings" autocomplete="off">
      <label class="f"><span>Tagesziel Umsatz in Euro (0 = kein Ziel)</span><input name="goal" type="text" inputmode="decimal" value="${v(s.goal)}"></label>
      <label class="f"><span>Mein Anteil am Umsatz in Prozent (selbstständig: 100)</span><input name="share" type="text" inputmode="decimal" value="${v(s.share)}"></label>
      <label class="f"><span>Meine Orte – einer pro Zeile</span><textarea name="places">${esc(s.places.join('\n'))}</textarea></label>
      <h3>Tarif</h3>
      <label class="check"><input type="checkbox" name="koeln" ${isKoeln() ? 'checked' : ''}><span>Amtlichen Kölner Taxitarif verwenden (empfohlen)</span></label>
      <h3>Eigener Tarif – gilt nur, wenn der Haken oben aus ist</h3>
      <label class="f"><span>Grundpreis in Euro</span><input name="base" type="text" inputmode="decimal" value="${v(t.base)}"></label>
      <div class="row">
        <label class="f"><span>Euro pro km (Anfang)</span><input name="km1" type="text" inputmode="decimal" value="${v(t.km1)}"></label>
        <label class="f"><span>gilt bis km (0 = keine Staffel)</span><input name="km1Until" type="text" inputmode="decimal" value="${v(t.km1Until)}"></label>
      </div>
      <label class="f"><span>Euro pro km (danach)</span><input name="km2" type="text" inputmode="decimal" value="${v(t.km2)}"></label>
      <label class="f"><span>Wartezeit in Euro pro Stunde</span><input name="waitPerHour" type="text" inputmode="decimal" value="${v(t.waitPerHour)}"></label>
      <label class="f"><span>Zuschlag Großraumtaxi in Euro</span><input name="large" type="text" inputmode="decimal" value="${v(t.large || 0)}"></label>
      <h3>KI-Berater</h3>
      <label class="f"><span>KI-Schlüssel von Anthropic (${getAiKey() ? 'ist gespeichert – leer lassen, um ihn zu behalten' : 'noch keiner gespeichert'})</span>
        <input name="aikey" type="password" autocomplete="off" placeholder="sk-ant-…"></label>
      <p class="muted small">Der Schlüssel bleibt nur auf diesem Gerät. Er steht nicht im Programm und nicht in der Sicherung.</p>
      <span class="muted small">KI-Modell – Haiku kostet nach Listenpreis etwa ein Vierzigstel von Opus</span>
      <div class="chips">${Object.keys(AI_MODELS).map(k => `<label class="chip"><input type="radio" name="aimodel" value="${k}" ${aiModel() === AI_MODELS[k] ? 'checked' : ''}><span>${AI_MODELS[k].label}</span></label>`).join('')}</div>
      ${getAiKey() ? '<button type="button" class="btn danger" data-act="aiKeyDel" style="margin-bottom:12px">KI-Schlüssel löschen</button>' : ''}
      <div class="row">
        <button type="button" class="btn ghost" data-act="sheetClose">Abbrechen</button>
        <button type="submit" class="btn primary">Speichern</button>
      </div>
    </form>`;
}

/* ---------- Export / Import ---------- */

function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function csvCell(v) {
  let s = String(v == null ? '' : v);
  if (/^[=+\-@]/.test(s)) s = "'" + s; // keine Formeln in Excel auslösen
  return '"' + s.replace(/"/g, '""') + '"';
}

function exportCsv() {
  const de = n => (n || 0).toFixed(2).replace('.', ',');
  const rows = [['Datum', 'Uhrzeit', 'Fahrpreis', 'Trinkgeld', 'Zahlart', 'Einstieg', 'Quelle', 'Wartezeit Min', 'Fahrzeit Min']];
  S.rides.slice().sort((a, b) => a.t - b.t).forEach(r =>
    rows.push([dayKey(r.t).split('-').reverse().join('.'), hhmm(r.t), de(r.amount), de(r.tip), r.pay, r.place, r.src,
      r.wait == null ? '' : r.wait, r.dur == null ? '' : r.dur]));
  download('taxi-fahrten-' + dayKey(Date.now()) + '.csv', '﻿' + rows.map(r => r.map(csvCell).join(';')).join('\r\n'), 'text/csv;charset=utf-8');
}

/* ---------- Rendern und Ereignisse ---------- */

const VIEWS = {
  heute: { title: 'Heute', render: viewToday },
  coach: { title: 'Coach', render: viewCoach },
  plaetze: { title: 'Halteplätze', render: viewPlaces },
  zahlen: { title: 'Zahlen', render: viewNumbers },
  rechner: { title: 'Rechner', render: viewCalc },
  mehr: { title: 'Mehr', render: viewMore }
};

function render() {
  const v = VIEWS[tab];
  $('#title').textContent = v.title;
  $('#view').innerHTML = v.render();
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  tickClock();
}

function tickClock() {
  const now = Date.now();
  $('#clock').textContent = DAYS[dow(now)] + ' ' + hhmm(now);
}

const ACTIONS = {
  shiftStart() {
    if (activeShift()) return;
    S.shifts.push({ id: uid(), start: Date.now(), end: null });
    save(); render(); toast('Schicht gestartet – gute Fahrt!');
  },
  shiftEnd() {
    const sh = activeShift();
    if (!sh) return;
    if (S.trip) return toast('Bitte zuerst die laufende Fahrt beenden');
    if (!confirm('Schicht jetzt beenden?')) return;
    closeStand();
    sh.end = Date.now();
    save(); render(); toast('Schicht beendet');
  },
  rideNew() { openSheet(rideForm()); },
  standPick() {
    if (!activeShift()) return;
    openSheet(standSheet());
    if (!HP.some(p => p.pos) || posFresh()) return;
    // Standort holen und die nächsten Plätze oben einblenden – solange noch nichts getippt wurde
    const done = msg => { const el = $('#standGeo'); if (el) el.textContent = msg; };
    locate().then(() => {
      done('');
      const s = $('#standSearch');
      if (s && !s.value) $('#standList').innerHTML = standListHtml('');
    }).catch(err => done(err.message));
  },
  hpNear() {
    if (hpNear) { hpNear = false; return render(); }
    toast('Standort wird gesucht …');
    locate().then(() => { hpNear = true; if (tab === 'plaetze') render(); })
      .catch(err => toast(err.message));
  },
  aiCopy() { copyForClaude(); },
  geoCoach() {
    toast('Standort wird gesucht …');
    locate().then(() => { if (tab === 'coach' && !sheetOpen()) render(); }).catch(err => toast(err.message));
  },
  standSet(el) {
    closeStand();
    S.stand = { name: el.dataset.name, since: Date.now() };
    save(); closeSheet(); render(); toast('Du stehst an: ' + el.dataset.name);
  },
  standLeave() { closeStand(); save(); render(); },
  tripStart() {
    if (!S.stand) return;
    const now = Date.now();
    S.trip = { place: S.stand.name, wait: Math.max(0, Math.round((now - S.stand.since) / 60000)), start: now };
    S.stand = null;
    save(); render(); toast('Gute Fahrt!');
  },
  tripEnd() { if (S.trip) openSheet(rideForm(S.trip)); },
  tripCancel() {
    if (!confirm('Laufende Fahrt verwerfen? Sie wird nicht gespeichert.')) return;
    S.trip = null;
    save(); render();
  },
  hpFav(el) {
    const name = el.dataset.name;
    const i = S.settings.places.indexOf(name);
    if (i >= 0) S.settings.places.splice(i, 1); else S.settings.places.push(name);
    save(); updateHp();
    toast(i >= 0 ? name + ' entfernt' : name + ' ist jetzt in „Meine Orte“');
  },
  rideDel(el) {
    if (!confirm('Diese Fahrt löschen?')) return;
    S.rides = S.rides.filter(r => r.id !== el.dataset.id);
    save(); render();
  },
  costNew() { openSheet(costForm()); },
  costDel(el) {
    if (!confirm('Diese Kosten löschen?')) return;
    S.costs = S.costs.filter(c => c.id !== el.dataset.id);
    save(); render();
  },
  settings() { openSheet(settingsForm()); },
  aiAsk() { askAi(); },
  aiKeyDel() {
    if (!confirm('KI-Schlüssel von diesem Gerät löschen?')) return;
    setAiKey('');
    ai = { loading: false, text: '', error: '', t: 0, cost: null };
    closeSheet(); render(); toast('KI-Schlüssel gelöscht');
  },
  sheetClose() { closeSheet(); },
  exportCsv() {
    if (!S.rides.length) return toast('Noch keine Fahrten vorhanden');
    exportCsv();
  },
  exportJson() { download('taxi-coach-sicherung-' + dayKey(Date.now()) + '.json', JSON.stringify(S), 'application/json'); },
  importJson() { $('#importFile').click(); },
  wipe() {
    if (!confirm('Wirklich ALLE Fahrten, Schichten, Einstellungen und den KI-Schlüssel löschen? Das kann nicht rückgängig gemacht werden.')) return;
    S = JSON.parse(JSON.stringify(DEFAULTS));
    setAiKey('');
    ai = { loading: false, text: '', error: '', t: 0, cost: null };
    save(); tab = 'heute'; render(); toast('Alles gelöscht');
  }
};

const FORMS = {
  ride(f) {
    const sh = activeShift();
    if (!sh) { closeSheet(); return toast('Bitte zuerst eine Schicht starten'); }
    const amount = num(f.amount.value);
    if (amount <= 0) { f.amount.focus(); return toast('Bitte den Fahrpreis eintragen'); }
    const trip = f.dataset.trip === '1' ? S.trip : null;
    let place;
    if (trip) {
      place = trip.place;
    } else {
      const custom = f.placeNew.value.trim();
      place = custom || (f.place && f.place.value) || '';
      if (custom && !S.settings.places.some(p => p.toLowerCase() === custom.toLowerCase())) S.settings.places.push(custom);
    }
    const pay = f.pay.value || 'Bar';
    const src = f.src.value || 'Halteplatz';
    const now = Date.now();
    const ride = { id: uid(), shiftId: sh.id, t: now, amount, tip: Math.max(0, num(f.tip.value)), pay, place, src };
    if (trip) {   // Fahrt ab Halteplatz: Warte- und Fahrzeit merken, daraus entsteht die Rangliste
      ride.wait = trip.wait;
      ride.dur = Math.max(0, Math.round((now - trip.start) / 60000));
      S.trip = null;
    }
    S.rides.push(ride);
    S.last = { pay, src };
    save(); closeSheet(); render(); toast('Fahrt gespeichert: ' + eur(amount));
  },
  cost(f) {
    const amount = num(f.amount.value);
    if (amount <= 0) { f.amount.focus(); return toast('Bitte einen Betrag eintragen'); }
    S.costs.push({ id: uid(), t: Date.now(), amount, kind: f.kind.value || 'Sonstiges' });
    save(); closeSheet(); render(); toast('Kosten gespeichert');
  },
  settings(f) {
    const s = S.settings;
    s.goal = Math.max(0, num(f.goal.value));
    s.share = Math.min(100, Math.max(0, num(f.share.value)));
    const places = f.places.value.split('\n').map(x => x.trim().slice(0, 40)).filter(Boolean);
    s.places = [...new Set(places)];
    s.tariffMode = f.koeln.checked ? 'koeln' : 'custom';
    s.tariff = {
      base: Math.max(0, num(f.base.value)),
      km1: Math.max(0, num(f.km1.value)),
      km1Until: Math.max(0, num(f.km1Until.value)),
      km2: Math.max(0, num(f.km2.value)),
      waitPerHour: Math.max(0, num(f.waitPerHour.value)),
      large: Math.max(0, num(f.large.value))
    };
    s.aiModel = AI_MODELS[f.aimodel.value] ? f.aimodel.value : 'opus';
    const key = f.aikey.value.trim();
    if (key) setAiKey(key);
    save(); closeSheet(); render();
    toast(key && !key.startsWith('sk-ant-') ? 'Gespeichert – der Schlüssel sieht aber ungewöhnlich aus' : 'Gespeichert');
  }
};

document.addEventListener('click', e => {
  const tabBtn = e.target.closest('#tabs button');
  if (tabBtn) { tab = tabBtn.dataset.tab; render(); window.scrollTo(0, 0); return; }
  const act = e.target.closest('[data-act]');
  if (act && ACTIONS[act.dataset.act]) { ACTIONS[act.dataset.act](act); return; }
  if (e.target.id === 'sheet') closeSheet(); // Tipp neben das Formular schließt es
});

document.addEventListener('submit', e => {
  const f = e.target.closest('form[data-form]');
  if (!f) return;
  e.preventDefault();
  FORMS[f.dataset.form](f);
});

document.addEventListener('change', e => {
  const t = e.target;
  if (t.dataset && t.dataset.check != null) {
    S.check.done[t.dataset.check] = t.checked;
    save(); render(); return;
  }
  if (t.name === 'period') { period = t.value; render(); return; }
  if (t.name === 'hpChan') { hpChan = Number(t.value); updateHp(); return; }
  if (t.id === 'importFile' && t.files[0]) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const d = JSON.parse(reader.result);
        if (!d || !Array.isArray(d.rides) || !Array.isArray(d.shifts)) throw new Error('format');
        if (!confirm('Sicherung laden? Die jetzigen Daten auf diesem Gerät werden ersetzt.')) return;
        S = merge(d); save(); render(); toast('Sicherung geladen');
      } catch (err) { toast('Diese Datei ist keine gültige Sicherung'); }
    };
    reader.readAsText(t.files[0]);
    t.value = '';
  }
});

document.addEventListener('input', e => {
  if (['calcKm', 'calcWait', 'calcLarge'].includes(e.target.id)) updateCalc();
  if (e.target.id === 'hpSearch') { hpQuery = e.target.value; updateHp(); }
  if (e.target.id === 'standSearch') $('#standList').innerHTML = standListHtml(e.target.value);
});

document.addEventListener('keydown', e => { if (e.key === 'Escape' && sheetOpen()) closeSheet(); });

// Laufende Zahlen aktuell halten, ohne ein offenes Formular oder eine Eingabe zu stören
setInterval(() => {
  tickClock();
  if (sheetOpen()) return;
  if (tab === 'heute' || tab === 'coach') render();
}, 30000);

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

render();
