'use strict';

/* ---------- Daten ---------- */

const KEY = 'taxicoach.v1';

const DEFAULTS = {
  settings: {
    goal: 200,            // Tagesziel Umsatz in Euro
    aiModel: 'opus',      // 'opus' = beste Qualität, 'haiku' = sparsam
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
  backupAt: 0,  // Zeitpunkt der letzten Sicherung (für die wöchentliche Erinnerung)
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
  // Beispielorte aus der ersten Version durch die Kölner Orte ersetzen; eigene Eingaben bleiben
  if (Array.isArray(ds.places) && ds.places.join('|') === OLD_PLACES.join('|')) s.settings.places = DEFAULTS.settings.places.slice();
  // Tarif und Umsatzanteil sind nicht mehr einstellbar (der Rechner nutzt immer den Kölner Tarif)
  ['tariff', 'tariffMode', 'tariffIsExample', 'share'].forEach(k => delete s.settings[k]);
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
  const rev = sum(rides, 'amount');
  const hours = workedHours(from, to);
  return { rides, rev, count: rides.length, perHour: hours > 0.05 ? rev / hours : 0 };
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
    return `${radarBanner(now)}${backupCard(now)}<section class="card center">
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

  return `${radarBanner(now)}<div class="kpis">
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

  return `${radarBanner(now)}${aiCard()}
    <section class="card hint">
      <h2>Jetzt: ${DAYS_LONG[dow(now)]}, ${hhmm(now)} Uhr</h2>
      <p><b>${esc(adv.title)}</b></p>
      <ul class="list">${adv.places.map((p, i) => `<li><span class="rank">${i + 1}</span><div class="grow">${esc(p)}</div></li>`).join('')}</ul>
      <p class="small">${esc(adv.text)}</p>
      <p class="muted small">Allgemeine Erfahrungswerte. Deine eigenen Zahlen unten sind genauer, sobald genug Fahrten eingetragen sind.</p>
    </section>
    ${season ? `<section class="card hint warn"><h2>Gerade in Köln: ${esc(season.title)}</h2><p>${esc(season.text)}</p></section>` : ''}
    ${dayTipsCard(now)}
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
  // „Klinik“ in den Kartendaten sind oft kleine Praxiskliniken – die großen Krankenhäuser stehen unten bei HUBS
  klinik:       { label: ['Klinik', 'Kliniken'],              tag: [0.5, 1, 2, 1.8, 1.3, 0.5],   frei: [0.5, 0.5, 1.2, 1.2, 1, 0.5], satt: 3 },
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
  'Flughafen': { label: 'Flughafen', tag: [0.3, 5.5, 3.5, 3.5, 4, 3], frei: [0.3, 5, 4, 4, 4, 3] },
  // Große Krankenhäuser: vormittags Entlassungen, Arzt- und Ambulanztermine, nachmittags Besucher
  'Uniklinik': { label: 'Großklinik', tag: [0.2, 1.5, 7, 5, 3, 0.5], frei: [0.2, 0.5, 3, 3, 2, 0.3] },
  'Klinikum': { label: 'Großklinik', tag: [0.2, 1.2, 6, 4.5, 2.5, 0.4], frei: [0.2, 0.4, 2.5, 2.5, 1.5, 0.3] },
  'Holweide': { label: 'Krankenhaus', tag: [0.2, 1, 4.5, 3.5, 2, 0.3], frei: [0.2, 0.3, 1.5, 1.5, 1, 0.2] },
  'Porz-Krhs.': { label: 'Krankenhaus', tag: [0.2, 1, 4.5, 3.5, 2, 0.3], frei: [0.2, 0.3, 1.5, 1.5, 1, 0.2] },
  'Hildegardis': { label: 'Krankenhaus', tag: [0.2, 1, 4.5, 3.5, 2, 0.3], frei: [0.2, 0.3, 1.5, 1.5, 1, 0.2] },
  'Hohenlind': { label: 'Krankenhaus', tag: [0.2, 1, 4.5, 3.5, 2, 0.3], frei: [0.2, 0.3, 1.5, 1.5, 1, 0.2] }
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

// ---- Tagsüber-Plan: je Zeitfenster die besten Stände, über die Stadt verteilt ----
const TAG_FENSTER = [
  { von: 6, bis: 9, name: 'Früh', icon: '🌅', tip: 'Flughafen- und Bahnhofsfahrten aus Hotels, Geschäftsreisende' },
  { von: 9, bis: 12, name: 'Vormittag', icon: '🏥', tip: 'Arzttermine, Entlassungen aus Kliniken, Behörden' },
  { von: 12, bis: 15, name: 'Mittag', icon: '🍽️', tip: 'Eher ruhig – Bahnhof, Einkaufen, Kliniken; gute Zeit für Pause' },
  { von: 15, bis: 18, name: 'Nachmittag', icon: '🏢', tip: 'Feierabend, Rückreisende, Kliniken-Besucher' }
];

// Nicht fünfmal die Altstadt: ein Stand wird nur genommen, wenn er mindestens 800 m von den schon gewählten entfernt ist
function diverse(ranked, n, minDist = 800) {
  const out = [];
  for (const x of ranked) {
    if (!x.p.pos || out.some(o => distM(o.p.pos, x.p.pos) < minDist)) continue;
    out.push(x);
    if (out.length >= n) break;
  }
  return out;
}

function dayPlan(dayStart, messen) {
  return TAG_FENSTER.map(f => {
    const t = dayStart + ((f.von + f.bis) / 2) * 36e5;
    const picks = diverse(potentialRanking(t, HP, 40), 3).map(x => ({ name: x.p.name, why: x.pot.why.join(', ') }));
    // Messe-Tage: Messeschluss am Nachmittag geht vor
    if (f.von === 15 && messen && messen.length && dow(dayStart) !== 6) picks.unshift({ name: 'Messe Nord / Süd', why: 'Messeschluss 16–19 Uhr' });
    return Object.assign({}, f, { picks: picks.slice(0, 3) });
  });
}

function dayPlanHtml(dayStart, messen) {
  if (!HAS_UMFELD) return '';
  return `<div class="dayplan"><div class="muted small"><b>☀️ Tagsüber</b> – beste Stände:</div>
    ${dayPlan(dayStart, messen).map(f => `<div class="slot"><span class="when">${f.icon} ${pad(f.von)}–${pad(f.bis)}</span>
      <span class="grow">${f.picks.map(p => `<b>${esc(p.name)}</b> <span class="muted small">(${esc(p.why)})</span>`).join(' · ')}</span></div>`).join('')}
  </div>`;
}

const TAG_TIPPS = [
  ['Früh ab 5 Uhr', 'Hotels in Innenstadt und Deutz: Gäste fahren zum Flughafen und zum ersten ICE. Das sind oft die längsten Fahrten des Tages. Nimm am Vorabend Vorbestellungen an.'],
  ['Kliniken am Vormittag', 'Zwischen 9 und 13 Uhr werden Patienten entlassen und Arzttermine wahrgenommen – Uniklinik, Merheim, Holweide, Porz. Frag immer, ob auch eine Rückfahrt gebraucht wird.'],
  ['Stammkunden aufbauen', 'Dialyse, Bestrahlung, Physiotherapie: Viele Patienten fahren mehrmals pro Woche zur gleichen Zeit. Visitenkarte geben – daraus werden feste, planbare Fahrten.'],
  ['Krankenfahrten mit Schein', 'Fahrten mit Transportschein der Krankenkasse rechnet dein Unternehmen ab. Frag deinen Chef, mit welchen Kassen er Verträge hat und was du dafür mitnehmen musst.'],
  ['Hotels kennen', 'Check-out ist meist 7–11 Uhr. Ein freundliches Wort an der Rezeption bringt dir später Vorbestellungen zum Flughafen.'],
  ['Hauptbahnhof tagsüber', 'Fast immer Fahrgäste mit Gepäck. Bei Bahnstreik oder Zugausfällen sofort hin – dann brauchen Hunderte ein Taxi.'],
  ['Mittagsloch nutzen', '12–15 Uhr ist meist am schwächsten: Pause, tanken, Auto sauber machen. Dann bist du am Nachmittag bereit.'],
  ['Messe-Tage', 'Läuft eine Messe, sind die Hotels voll: morgens Hotel → Messe, ab 16 Uhr Messe → Hotel, Bahnhof, Flughafen. Der Reiter „Woche“ zeigt dir die Messetage.'],
  ['Funk und App tagsüber', 'In den Außenbezirken kommen tagsüber kaum Winker. Funk und Vermittlungs-App bringen hier die meisten Aufträge – immer eingeschaltet lassen.'],
  ['Regen am Tag', 'Bei Regen steigt die Nachfrage sofort, vor allem an Haltestellen, Einkaufsstraßen und Kliniken. Der Reiter „Radar“ warnt dich 2 Stunden vorher.'],
  ['Senioren freundlich behandeln', 'Ältere Fahrgäste aus Pflegeheimen und Arztpraxen rufen gern wieder den gleichen Fahrer. Geduld beim Ein- und Aussteigen zahlt sich aus.']
];

function dayTipsCard(now) {
  const t0 = new Date(now); t0.setHours(0, 0, 0, 0);
  const d = radar.data;
  const messen = d && Array.isArray(d.messen) ? d.messen.filter(m => parseLocal(m.von) <= t0.getTime() && parseLocal(m.bis) >= t0.getTime()) : [];
  return `<section class="card">
    <h2>☀️ Tagfahrten heute</h2>
    ${dayPlanHtml(t0.getTime(), messen)}
    <details class="tips-more"><summary>Tipps für Tagfahrten (${TAG_TIPPS.length})</summary>
      <ol class="tips">${TAG_TIPPS.map(([h, t]) => `<li><b>${esc(h)}:</b> ${esc(t)}</li>`).join('')}</ol>
    </details>
  </section>`;
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

/* ---------- Karte: Stände, Veranstaltungen, eigener Standort ---------- */

// Kartenbaustein Leaflet (vendor/leaflet) wird erst geladen, wenn die Karte zum ersten Mal geöffnet wird.
// Kartenbilder: OpenStreetMap (Namensnennung Pflicht).
let placesMode = 'karte';   // 'karte' oder 'liste'
let mapState = { map: null, watch: null, me: null, meCircle: null, followed: false };
let leafletLoading = null;

function loadLeaflet() {
  if (window.L) return Promise.resolve();
  if (leafletLoading) return leafletLoading;
  leafletLoading = new Promise((resolve, reject) => {
    const css = document.createElement('link');
    css.rel = 'stylesheet'; css.href = 'vendor/leaflet/leaflet.css';
    document.head.appendChild(css);
    const s = document.createElement('script');
    s.src = 'vendor/leaflet/leaflet.js';
    s.onload = () => resolve();
    s.onerror = () => { leafletLoading = null; reject(new Error('Karte konnte nicht geladen werden')); };
    document.head.appendChild(s);
  });
  return leafletLoading;
}

function destroyMap() {
  if (mapState.watch != null && navigator.geolocation) navigator.geolocation.clearWatch(mapState.watch);
  if (mapState.map) mapState.map.remove();
  mapState = { map: null, watch: null, me: null, meCircle: null, followed: false };
}

// Heutige große Veranstaltungen (laufend oder noch kommend) und laufende Messen
function mapEvents(now) {
  const d = radar.data;
  if (!d) return [];
  const t0 = new Date(now); t0.setHours(0, 0, 0, 0);
  const out = [];
  for (const e of d.veranstaltungen || []) {
    if (e.abgesagt || e.lat == null || e.groesse === 'M') continue;
    const start = parseLocal(e.beginn), end = start + (e.dauer || 165) * 60000;
    if (end < now - 30 * 60000 || start > t0.getTime() + 864e5 + 3 * 36e5) continue;   // heute bis 3 Uhr nachts
    out.push({ lat: e.lat, lon: e.lon, titel: e.titel, ort: e.ort, art: e.art, start, end, groesse: e.groesse || 'XL' });
  }
  for (const m of d.messen || []) {
    if (m.lat == null || parseLocal(m.von) > now || parseLocal(m.bis) + 864e5 < now) continue;
    out.push({ lat: m.lat, lon: m.lon, titel: 'Messe ' + m.titel, ort: 'Koelnmesse', messe: true });
  }
  return out;
}

// Karte: die 5 besten Stände gerade, über die Stadt verteilt (Nr. 1–5)
// Stadtmitte (Dom/Neumarkt) – Startausschnitt bleibt im Stadtgebiet
const MAP_CITY = [50.938, 6.96];

function mapTop(now) {
  return diverse(potentialRanking(now, HP, 40), 5).map((x, i) => ({ p: x.p, rank: i + 1, why: x.pot.why.join(', ') }));
}

// Punkte: normal klein und grau, Meine Orte gelb, Sonderplätze orange, „nur bei Veranstaltung“ dunkel
const MAP_DOT = { std: { c: '#8b95a3', r: 1 }, mine: { c: '#ffcc00', r: 1.3 }, sonder: { c: '#ff9f43', r: 1.15 }, note: { c: '#4f5866', r: 0.8 } };
const mapDotKind = (p, mine) => p.note ? 'note' : mine.has(p.name) ? 'mine' : p.ch === 5 ? 'sonder' : 'std';

// Schild für eine Veranstaltung: Farbe wie im Radar, Uhrzeit = wann die Leute rauskommen
const EV_ICON = { fb: '⚽', ar: '🎤', ko: '🎵', me: '🏢' };
function evMapLabel(e, now) {
  const c = evColor(e);
  if (e.messe) {
    const h = new Date(now).getHours();
    return { c, hotNow: h >= 16 && h < 19 && dow(now) !== 6, html: `${EV_ICON[c]} Messe 16–19` };
  }
  return { c, hotNow: now >= e.end - 20 * 60000 && now <= e.end + 40 * 60000, html: `${EV_ICON[c]} ${hhmm(e.end)}` };
}

// Liste unter der Karte; Antippen zeigt den Platz auf der Karte
function mapTopListHtml(top) {
  if (!top.length) return '';
  const me = posFresh() ? [myPos.lat, myPos.lon] : null;
  return `<section class="card topnow"><h2>🔥 Jetzt am besten</h2><ul class="list">${top.map(x => `<li class="tp">
    <button type="button" class="toprow" data-act="mapGo" data-name="${esc(x.p.name)}"><span class="rank hot">${x.rank}</span>
      <span class="grow"><b>${esc(x.p.name)}</b><span class="sub">${esc(x.why)}${me ? ' · ' + fmtDist(distM(me, x.p.pos)) + ' von dir' : ''}</span></span>
      <span class="more">Zeigen ›</span></button></li>`).join('')}</ul></section>`;
}

function mapLegendHtml(ev) {
  return `<b class="lg-rk">1</b> jetzt am besten · <i class="lg-d" style="--c:#ffcc00"></i> Meine Orte · <i class="lg-d" style="--c:#ff9f43"></i> Sonderplatz · <i class="lg-d" style="--c:#8b95a3"></i> Stand${ev ? ' · <b>Uhrzeit</b> = Veranstaltung endet' : ''}`;
}

function standPopup(p, hot) {
  const me = posFresh() ? [myPos.lat, myPos.lon] : null;
  const shift = !!activeShift();
  return `<div class="pop"><b>${esc(p.name)}</b>${hot ? ` <span class="hot">🔥 Nr. ${hot.rank} jetzt</span>` : ''}
    <div class="sub">${esc(p.lage)}</div>
    ${hot && hot.why ? `<div class="sub">Warum jetzt: ${esc(hot.why)}</div>` : ''}
    <div class="sub">${esc([chLabel(p.ch), p.zone ? 'Zone ' + p.zone : '', p.n ? p.n + ' Plätze' : '',
      p.note ? 'nur ' + p.note : '', p.hrs ? 'nur ' + p.hrs + ' Uhr' : '', me ? fmtDist(distM(me, p.pos)) + ' von dir' : ''].filter(Boolean).join(' · '))}</div>
    ${p.env && envLine(p, 4) ? `<div class="sub">Umfeld: ${esc(envLine(p, 4))}</div>` : ''}
    <div class="popbtns">
      <a class="btn route" href="${mapsDir(p.pos[0], p.pos[1])}" target="_blank" rel="noopener">Route</a>
      ${shift ? `<button type="button" class="btn route" data-act="mapStand" data-name="${esc(p.name)}">Ich stehe hier</button>` : ''}
    </div></div>`;
}

function eventPopup(e) {
  const near = standsNear(e.lat, e.lon, 3);
  return `<div class="pop"><b>${esc(e.titel)}</b>
    <div class="sub">${esc(e.ort)}${e.start ? ` · ${hhmm(e.start)}–ca. ${hhmm(e.end)}` : ' · Anreise 7–10, Schluss 16–19 Uhr'}</div>
    ${e.end ? `<div class="sub">Am besten ab <b>${hhmm(e.end - 20 * 60000)}</b> in der Nähe sein</div>` : ''}
    <div class="sub">Nächste Stände: ${near.map(x => `${esc(x.p.name)} ${fmtDist(x.d)}`).join(' · ')}</div>
    <div class="popbtns"><a class="btn route" href="${mapsDir(near[0].p.pos[0], near[0].p.pos[1])}" target="_blank" rel="noopener">Route zu ${esc(near[0].p.name)}</a></div></div>`;
}

async function initMap() {
  const el = $('#map');
  if (!el) return;
  try { await loadLeaflet(); } catch (e) { el.innerHTML = `<p class="bad" style="padding:12px">${esc(e.message)}. Bitte Internet prüfen.</p>`; return; }
  if (!$('#map') || tab !== 'plaetze' || placesMode !== 'karte') return;   // inzwischen weggewechselt
  destroyMap();
  const L = window.L;
  const map = L.map('map', { zoomControl: true, preferCanvas: true, attributionControl: true }).setView([50.938, 6.96], 12);
  mapState.map = map;
  L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19, attribution: '© <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a>-Mitwirkende',
    className: 'tiles-dark'
  }).addTo(map);

  const now = Date.now();
  const top = mapTop(now);
  const topBy = new Map(top.map(x => [x.p.name, x]));
  const mine = new Set(S.settings.places);
  // Normale Stände klein und grau, beim Hineinzoomen größer; die 5 besten als rote Nummern obendrauf
  const dotSize = z => z <= 11 ? 2.5 : z === 12 ? 3.5 : z === 13 ? 4.5 : z === 14 ? 6 : 7.5;
  const dots = [];
  mapState.mk = {};
  for (const p of HP) {
    if (!p.pos || topBy.has(p.name)) continue;
    const st = MAP_DOT[mapDotKind(p, mine)];
    const m = L.circleMarker(p.pos, { radius: st.r * dotSize(12), color: '#101317', weight: 1, fillColor: st.c, fillOpacity: 0.95 })
      .bindPopup(() => standPopup(p, null), { maxWidth: 280 }).addTo(map);
    dots.push([m, st.r]);
    mapState.mk[p.name] = m;
  }
  map.on('zoomend', () => { const f = dotSize(map.getZoom()); dots.forEach(([m, r]) => m.setRadius(r * f)); });
  for (const x of top) {
    mapState.mk[x.p.name] = L.marker(x.p.pos, { icon: L.divIcon({ className: 'rkicon', html: `<span>${x.rank}</span>`, iconSize: [30, 30] }), zIndexOffset: 1000 })
      .bindPopup(() => standPopup(x.p, x), { maxWidth: 280 }).addTo(map);
  }
  // Veranstaltungen und Messen heute: farbiges Schild mit der Endzeit
  for (const e of mapEvents(now)) {
    const lb = evMapLabel(e, now);
    L.marker([e.lat, e.lon], { icon: L.divIcon({ className: 'evlab', html: `<span class="evl c-${lb.c}${lb.hotNow ? ' now' : ''}">${lb.html}</span>`, iconSize: [0, 0] }), zIndexOffset: 500 })
      .bindPopup(() => eventPopup(e), { maxWidth: 280 }).addTo(map);
  }
  // Start: alles Wichtige im Bild (Top 5 und Veranstaltungen)
  const focus = [...top.map(x => x.p.pos), ...mapEvents(now).map(e => [e.lat, e.lon])].filter(ll => distM(MAP_CITY, ll) < 7500);
  if (focus.length > 1) { map.fitBounds(focus, { padding: [36, 36], maxZoom: 13 }); if (map.getZoom() < 12) map.setView(MAP_CITY, 12); }

  // Eigener Standort: blauer Punkt, folgt dir, solange die Karte offen ist
  const showMe = pos => {
    if (!mapState.map) return;
    const ll = [pos.lat, pos.lon];
    if (!mapState.me) {
      mapState.meCircle = L.circle(ll, { radius: pos.acc || 30, color: '#4da3ff', weight: 1, fillOpacity: 0.12 }).addTo(map);
      mapState.me = L.circleMarker(ll, { radius: 8, color: '#fff', weight: 3, fillColor: '#2f80ed', fillOpacity: 1 }).addTo(map);
    } else { mapState.me.setLatLng(ll); mapState.meCircle.setLatLng(ll).setRadius(pos.acc || 30); }
    if (!mapState.followed) { map.setView(ll, 15); mapState.followed = true; }
  };
  if (posFresh()) showMe(myPos);
  if (navigator.geolocation) {
    mapState.watch = navigator.geolocation.watchPosition(p => {
      myPos = { lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy, t: Date.now() };
      showMe(myPos);
    }, () => {}, { enableHighAccuracy: true, maximumAge: 15000, timeout: 20000 });
  }
  setTimeout(() => map.invalidateSize(), 50);
}

function viewMap() {
  const now = Date.now();
  const ev = mapEvents(now).length;
  return `<div class="maptools">
      <button type="button" class="btn route" data-act="mapMe">📍 Ich</button>
      <span class="muted small">${mapLegendHtml(ev)}</span>
    </div>
    <div id="map" class="map"></div>
    ${mapTopListHtml(mapTop(now))}`;
}

function viewPlaces() {
  if (!HP.length) return '<section class="card"><p class="muted">Die Halteplatzliste ist auf diesem Gerät nicht geladen.</p></section>';
  const seg = `<div class="seg">${[['karte', '🗺️ Karte'], ['liste', '📋 Liste']].map(([k, l]) =>
    `<label class="chip"><input type="radio" name="placesMode" value="${k}" ${placesMode === k ? 'checked' : ''}><span>${l}</span></label>`).join('')}</div>`;
  if (placesMode === 'karte') return seg + viewMap();
  return seg + viewPlacesList();
}

function viewPlacesList() {
  const geoBtn = HP.some(p => p.pos)
    ? `<button class="btn ${hpNear ? 'primary' : ''}" data-act="hpNear" style="margin-bottom:12px">📍 ${hpNear ? 'Sortiert nach Entfernung – tippen zum Ausschalten' : 'Plätze in meiner Nähe'}</button>` : '';
  return `${geoBtn}<label class="f"><input id="hpSearch" type="text" placeholder="Halteplatz, Straße oder Zone suchen" value="${esc(hpQuery)}" autocomplete="off"></label>
    <div class="chips">${[0, 1, 2, 3, 4, 5].map(c => `<label class="chip"><input type="radio" name="hpChan" value="${c}" ${hpChan === c ? 'checked' : ''}><span>${c === 5 ? 'Sonder' : c ? 'Kanal ' + c : 'Alle'}</span></label>`).join('')}</div>
    <p class="muted small" id="hpInfo">${esc(hpInfoText())}</p>
    <section class="card" id="hpList">${hpListHtml()}</section>
    <p class="muted small">Halteplatzliste TAXI RUF Köln, Stand Januar 2023. Sonderplätze (Hauptbahnhof, Flughafen, Messe, Veranstaltungsorte) stammen aus der Liste der Stadt Köln, Stand 2019. Mit ☆ kommt ein Platz in „Meine Orte“ und ist dann mit einem Tipp wählbar. „Route“ öffnet Google Maps.</p>
    <p class="muted small">Entfernungen sind Luftlinie und die Kartenpositionen ungefähr (aus OpenStreetMap) – der Rhein kann dazwischen liegen. Dein Standort bleibt auf dem Handy.</p>`;
}

/* ---------- Live-Radar: Veranstaltungen, Messen, Regen ---------- */

// radar.json wird einmal täglich von radar/aktualisieren.mjs aus den offiziellen Seiten erzeugt
// (LANXESS arena, Koelnmesse). Der Regen kommt live von Open-Meteo.
let radar = { data: null, loadedAt: 0, rain: null, rainAt: 0 };

async function loadRadar(force) {
  if (!force && radar.data && Date.now() - radar.loadedAt < 3 * 36e5) return;
  try {
    const res = await fetch('radar.json', { cache: 'no-cache' });
    if (res.ok) { radar.data = await res.json(); radar.loadedAt = Date.now(); }
  } catch (e) { /* offline: alte Daten behalten (der Service Worker liefert die letzte Fassung) */ }
}

async function loadRain() {
  if (radar.rain && Date.now() - radar.rainAt < 10 * 60000) return;
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 6000);
    const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=50.94&longitude=6.96&minutely_15=precipitation&forecast_minutely_15=9&past_minutely_15=1&timezone=Europe%2FBerlin', { signal: ctl.signal });
    clearTimeout(timer);
    if (!res.ok) return;
    const m = (await res.json()).minutely_15;
    if (!m) return;
    radar.rain = m.time.map((t, i) => ({ t: new Date(t).getTime(), mm: m.precipitation[i] || 0 }));
    radar.rainAt = Date.now();
  } catch (e) { /* ohne Netz kein Regen-Hinweis */ }
}

// ---- Bahn: Ausfälle und Verspätungen an Hauptbahnhof und Messe/Deutz ----
// Quelle: DBF (dbf.finalrewind.org), ein freier Abfahrtsmonitor auf Basis der Bahn-Echtzeitdaten (IRIS).
// Abruf nur, solange die App offen ist, höchstens alle 4 Minuten.
const BAHN_STATIONEN = [{ name: 'Köln Hbf', stand: 'Hauptbahnhof' }, { name: 'Köln Messe/Deutz', stand: 'Deutz Bhf' }];
radar.bahn = null; radar.bahnAt = 0;

async function loadBahn() {
  if (radar.bahn && Date.now() - radar.bahnAt < 4 * 60000) return;
  const out = [];
  for (const st of BAHN_STATIONEN) {
    try {
      const ctl = new AbortController();
      const timer = setTimeout(() => ctl.abort(), 8000);
      const res = await fetch(`https://dbf.finalrewind.org/${encodeURIComponent(st.name)}.json?mode=json&limit=150`, { signal: ctl.signal });
      clearTimeout(timer);
      if (res.ok) out.push({ st, trains: (await res.json()).departures || [] });
    } catch (e) { /* ohne Netz oder Dienst nicht erreichbar: Bahn-Hinweise fallen weg */ }
  }
  if (out.length) { radar.bahn = out; radar.bahnAt = Date.now(); }
}

// „HH:MM“ aus der Bahn-Anzeige in eine Uhrzeit um jetzt herum umrechnen (auch über Mitternacht)
function hmNear(hm, now) {
  if (!hm) return null;
  const [h, m] = hm.split(':').map(Number);
  const d = new Date(now); d.setHours(h, m, 0, 0);
  let t = d.getTime();
  if (t < now - 12 * 36e5) t += 864e5; else if (t > now + 12 * 36e5) t -= 864e5;
  return t;
}

const FERN = /^(ICE|IC|EC|ECE|FLX|NJ|RJ|RJX|TGV|THA|EST|EN|ES)\b/;

function bahnItems(now = Date.now()) {
  const items = [];
  if (!radar.bahn || Date.now() - radar.bahnAt > 30 * 60000) return items;   // zu alt: lieber nichts zeigen
  const h = new Date(now).getHours();
  const spaet = h >= 21 || h < 2;
  for (const { st, trains } of radar.bahn) {
    const list = trains.map(x => {
      const arr = hmNear(x.scheduledArrival, now), dep = hmNear(x.scheduledDeparture, now);
      const name = (x.train || '').replace(/^S S/, 'S').replace(/\s+/g, ' ').trim();
      const fern = (x.trainClasses || []).includes('F') || FERN.test(name);
      const route = x.route || [];
      return { x, arr, dep, t: arr || dep, name, fern, delay: Math.max(x.delayArrival || 0, x.delayDeparture || 0),
        from: route.length ? route[0].name : '', dest: x.destination || '' };
    }).filter(y => y.t && y.t >= now - 15 * 60000 && y.t <= now + 90 * 60000);
    const label = y => `${y.name} ${hhmm(y.t)} ${y.dep && y.dest && y.dest !== st.name ? 'nach ' + y.dest : y.from ? 'aus ' + y.from : ''}`.trim();

    // 1. Ausfälle
    const weg = list.filter(y => y.x.isCancelled);
    const fernWeg = weg.filter(y => y.fern);
    if (weg.length >= 3 || fernWeg.length >= 1) {
      const top = (fernWeg.length ? fernWeg : weg).slice(0, 3).map(label).join(' · ');
      items.push({ prio: (fernWeg.length && spaet) || weg.length >= 5 ? 3 : 2, icon: '🚆',
        text: `${st.name}: ${weg.length} ${weg.length === 1 ? 'Zug fällt' : 'Züge fallen'} aus`,
        sub: `${top} – gestrandete Reisende brauchen ein Taxi. Halteplatz ${st.stand}`, stand: st.stand });
    }
    // 2. Späte, stark verspätete Fernzüge: danach fahren kaum noch Bahnen
    if (spaet) {
      const lateArr = list.filter(y => y.fern && y.arr && !y.x.isCancelled && y.delay >= 20)
        .map(y => Object.assign(y, { real: y.arr + y.delay * 60000 }))
        .filter(y => y.real >= now - 5 * 60000 && y.real <= now + 75 * 60000)
        .sort((a, b) => a.real - b.real).slice(0, 2);
      for (const y of lateArr) {
        items.push({ prio: 2, icon: '🕐', text: `${y.name}${y.from ? ' aus ' + y.from : ''} kommt ca. ${hhmm(y.real)} an (+${y.delay} Min)`,
          sub: `Spät und verspätet – viele Reisende brauchen ein Taxi. Halteplatz ${st.stand}`, stand: st.stand });
      }
    }
    // 3. Gemeldete Großstörungen (Streik, Stellwerk, Sperrung) bei mehreren Zügen
    const stoer = list.filter(y => (y.x.messages && [...(y.x.messages.delay || []), ...(y.x.messages.qos || [])]
      .some(m => /streik|stellwerk|sperrung|notarzt|polizeieinsatz|unwetter|oberleitung/i.test(m.text || '')) && (y.delay >= 15 || y.x.isCancelled)));
    if (stoer.length >= 3) {
      const grund = ((stoer[0].x.messages.delay || []).concat(stoer[0].x.messages.qos || []).find(m => /streik|stellwerk|sperrung|notarzt|polizeieinsatz|unwetter|oberleitung/i.test(m.text || '')) || {}).text || 'Störung';
      items.push({ prio: 3, icon: '⚠️', text: `${st.name}: Bahn-Störung (${grund})`,
        sub: `${stoer.length} Züge betroffen – jetzt zum Halteplatz ${st.stand}`, stand: st.stand });
    }
  }
  return items;
}

// Beides holen und danach die Ansicht auffrischen (ohne ein offenes Formular zu stören)
function refreshRadar(force) {
  Promise.all([loadRadar(force), loadRain(), loadBahn()]).then(() => {
    if (['heute', 'coach', 'radar'].includes(tab) && !sheetOpen()) render();
  });
}

const parseLocal = s => { const [d, t = '00:00'] = s.split('T'); const [y, mo, da] = d.split('-').map(Number); const [h, mi] = t.split(':').map(Number); return new Date(y, mo - 1, da, h, mi).getTime(); };
const dm = t => { const d = new Date(t); return pad(d.getDate()) + '.' + pad(d.getMonth() + 1) + '.'; };
const sameDay = (a, b) => dayKey(a) === dayKey(b);

// Liste der aktuellen Hinweise, wichtigste zuerst. prio: 3 = jetzt hinfahren, 2 = bald, 1 = Info
function radarItems(now = Date.now()) {
  const items = [];
  const d = radar.data;
  if (d && Array.isArray(d.veranstaltungen)) {
    for (const e of d.veranstaltungen) {
      // Im Radar nur die großen Ereignisse; die mittleren stehen im Reiter „Woche“
      if (e.abgesagt || (e.groesse && e.groesse === 'M')) continue;
      const start = parseLocal(e.beginn), end = start + (e.dauer || 165) * 60000;
      const label = `${e.titel} (${e.ort})`;
      const ev = { start, end, titel: e.titel, ort: e.ort, stand: e.stand, groesse: e.groesse, art: e.art };
      if (now >= end - 20 * 60000 && now <= end + 40 * 60000) {
        items.push({ ev, kind: 'raus', prio: 3, icon: '🔥', text: `Jetzt hin: ${label} endet ca. ${hhmm(end)}`, sub: `Halteplatz ${e.stand}` + (e.stand === 'Lanxess Arena' ? ' – oder Deutz Bhf als Ausweich' : ''), stand: e.stand });
      } else if (now >= start && now < end - 20 * 60000) {
        items.push({ ev, kind: 'laeuft', prio: 2, icon: '🎤', text: `${label} läuft – Ende ca. ${hhmm(end)}`, sub: `Ab ${hhmm(end - 20 * 60000)} am Platz ${e.stand} sein`, stand: e.stand });
      } else if (now >= start - 2 * 36e5 && now < start) {
        items.push({ ev, kind: 'anreise', prio: 2, icon: '🎟️', text: `${label} beginnt ${hhmm(start)}`, sub: 'Anreise läuft: Fahrten vom Hauptbahnhof und aus Hotels dorthin' });
      } else if (start > now && sameDay(start, now)) {
        items.push({ ev, prio: 1, icon: '📅', text: `Heute: ${label}`, sub: `Beginn ${hhmm(start)}, Ende ca. ${hhmm(end)}` });
      } else if (start > now && sameDay(start, now + 864e5)) {
        items.push({ ev, prio: 0, icon: '📅', text: `Morgen: ${label}`, sub: `Beginn ${hhmm(start)}, Ende ca. ${hhmm(end)}` });
      }
    }
  }
  if (d && Array.isArray(d.messen)) {
    const h = new Date(now).getHours(), wd = dow(now);
    for (const m of d.messen) {
      const von = parseLocal(m.von), bis = parseLocal(m.bis) + 864e5;
      if (now >= von && now < bis) {
        if (h >= 7 && h < 10) items.push({ prio: 2, icon: '🏢', text: `Messe ${m.titel}: Anreise`, sub: 'Hotels, Hauptbahnhof und Flughafen → Messe. Gute Zeit für lange Fahrten.' });
        else if (h >= 16 && h < 19 && wd !== 6) items.push({ prio: 3, icon: '🏢', text: `Messe ${m.titel}: Schluss`, sub: 'Jetzt an Messe Nord oder Messe Süd stehen – Fahrten zu Hotels, Bahnhof und Flughafen', stand: 'Messe Nord' });
        else items.push({ prio: 1, icon: '🏢', text: `Messe ${m.titel} läuft bis ${dm(bis - 864e5)}`, sub: 'Viele Messegäste in den Hotels: morgens Anreise, nachmittags 16–19 Uhr Schluss' });
      } else if (von > now && von - now < 3 * 864e5) {
        items.push({ prio: 0, icon: '🏢', text: `Ab ${DAYS_LONG[dow(von)]}: Messe ${m.titel}`, sub: 'Mehr Flughafen- und Hotelfahrten' });
      }
    }
  }
  if (radar.rain && radar.rain.length) {
    const nowRain = radar.rain.filter(r => r.t <= now).slice(-1)[0];
    const next = radar.rain.find(r => r.t > now && r.t - now <= 2 * 36e5 && r.mm >= 0.2);
    if (nowRain && nowRain.mm >= 0.2) items.push({ prio: 2, icon: '🌧️', text: 'Es regnet', sub: 'Mehr Fahrgäste – Innenstadt, Bahnhöfe und Haltestellen' });
    else if (next) items.push({ prio: 2, icon: '🌦️', text: `Regen ab ca. ${hhmm(next.t)}`, sub: 'Dann wird es in der Innenstadt voll – rechtzeitig dort sein' });
  }
  items.push(...bahnItems(now));
  return items.sort((a, b) => b.prio - a.prio);
}

// Schmaler Hinweis oben auf „Heute“ – nur wenn es wirklich brennt; Antippen öffnet den Reiter „Radar“
function radarBanner(now = Date.now()) {
  const hot = radarItems(now).filter(x => x.prio >= 3);
  if (!hot.length) return '';
  return `<button type="button" class="card radar hot banner" data-act="goRadar">
    <span class="ico">${hot[0].icon}</span>
    <span class="grow"><b>${esc(hot[0].text)}</b>${hot.length > 1 ? `<span class="sub"> + ${hot.length - 1} weitere</span>` : ''}</span>
    <span class="more">Radar ›</span></button>`;
}

// Reiter „Radar“: alles auf einen Blick
// Farbe je Ort – gleich in Liste und Zeitstrahl: Stadion grün, Arena rot, Messe blau, Konzerthallen lila
function evColor(ev) {
  if (!ev) return 'ko';
  if (ev.messe) return 'me';
  if (ev.art === 'Fußball' || /Stadion|Sportpark/i.test(ev.ort || '')) return 'fb';
  if (/LANXESS/i.test(ev.ort || '')) return 'ar';
  return 'ko';
}

// „in 25 Min“, „in 3 Std“, „morgen“
function inDur(t, now) {
  const min = Math.round((t - now) / 60000);
  if (min <= 0) return 'jetzt';
  if (!sameDay(t, now)) return sameDay(t, now + 864e5) ? 'morgen' : DAYS_LONG[dow(t)];
  if (min < 60) return `in ${min} Min`;
  const h = Math.floor(min / 60), m = min % 60;
  return h < 3 && m >= 10 ? `in ${h}:${pad(m)} Std` : `in ${h} Std`;
}

// Eine Zeile im Radar. Veranstaltungen zeigen groß, wann die Leute RAUSKOMMEN.
function radarRow(x, now) {
  const ev = x.ev;
  if (!ev) return `<li><span class="ico">${x.icon}</span>
    <div class="grow"><div><b>${esc(x.text)}</b></div><div class="sub">${esc(x.sub)}</div></div></li>`;
  const c = evColor(ev);
  const anreise = x.kind === 'anreise';
  const t = anreise ? ev.start : ev.end;
  const label = anreise ? 'Beginn' : x.kind === 'raus' ? 'raus' : 'Ende';
  const when = x.kind === 'raus' ? 'JETZT' : inDur(t, now);
  const sub = x.kind ? x.sub : `ab ${hhmm(ev.end - 20 * 60000)} am Platz ${ev.stand} sein · Beginn ${hhmm(ev.start)}`;
  return `<li class="rv${ev.groesse === 'XL' ? ' xl' : ''}${x.kind === 'raus' ? ' now' : ''}">
    <div class="rv-time c-${c}"><small>${label}</small><b>${hhmm(t)}</b><small>${esc(when)}</small></div>
    <div class="grow">
      <div class="rv-tags"><span class="tag c-${c}">${esc(ev.ort)}</span>${ev.groesse === 'XL' ? '<span class="tag big">GROSS</span>' : ''}</div>
      <div class="rv-title">${esc(ev.titel)}</div>
      <div class="sub">${esc(sub)}</div>
    </div></li>`;
}

// Zeitstrahl: von jetzt bis 2 Uhr nachts – wann kommen wo die Leute raus?
function radarTimeline(now) {
  const d = radar.data;
  if (!d) return '';
  const t0 = new Date(now); t0.setMinutes(0, 0, 0);
  const a = t0.getTime();
  const e1 = new Date(now); e1.setDate(e1.getDate() + 1); e1.setHours(2, 0, 0, 0);
  const b = e1.getTime();
  const pct = t => Math.max(0, Math.min(100, (t - a) / (b - a) * 100));
  const rows = [];
  for (const e of d.veranstaltungen || []) {
    if (e.abgesagt || e.groesse === 'M') continue;
    const start = parseLocal(e.beginn), end = start + (e.dauer || 165) * 60000;
    if (end + 40 * 60000 <= now || start >= b) continue;
    rows.push({ start, end, hot0: end - 20 * 60000, hot1: end + 40 * 60000, c: evColor(e), xl: e.groesse === 'XL',
      lab: `${hhmm(end)} ${e.stand}` });
  }
  const wd = dow(now);
  for (const m of d.messen || []) {
    const von = parseLocal(m.von), bis = parseLocal(m.bis) + 864e5;
    const s = new Date(now); s.setHours(16, 0, 0, 0);
    const hot0 = s.getTime(), hot1 = hot0 + 3 * 36e5;
    if (wd !== 6 && now >= von && now < bis && hot1 > now) {
      rows.push({ start: hot0 - 6 * 36e5, end: hot0, hot0, hot1, c: 'me', xl: true, lab: `16–19 Messe` });
    }
  }
  if (!rows.length) return `<section class="card"><h2>🕐 Bis 2 Uhr nachts</h2>
    <p class="muted">Heute keine großen Termine – normaler Betrieb.</p></section>`;
  rows.sort((x, y) => x.hot0 - y.hot0);

  const ticks = [];
  for (let t = a + 36e5; t < b; t += 36e5) {
    const h = new Date(t).getHours();
    if (h % 3 === 0) ticks.push(`<span class="tl-tick${h === 0 ? ' mid' : ''}" style="left:${pct(t)}%">${h}</span>`);
  }
  const row = r => {
    const l = pct(r.hot0), w = Math.max(1.5, pct(r.hot1) - l);
    const rl = pct(r.start), rw = Math.max(0, l - rl);
    const right = l > 62;
    return `<div class="tl-row${r.xl ? ' xl' : ''}">
      <i class="tl-run c-${r.c}" style="left:${rl}%;width:${rw}%"></i>
      <i class="tl-hot c-${r.c}" style="left:${l}%;width:${w}%"></i>
      <span class="tl-lab" style="${right ? `right:${100 - l - w}%;text-align:right` : `left:${l}%`}">${esc(r.lab)}</span>
    </div>`;
  };
  return `<section class="card">
    <h2>🕐 Bis 2 Uhr nachts</h2>
    <div class="tl">
      <div class="tl-ticks">${ticks.join('')}</div>
      <div class="tl-now" style="left:${pct(now)}%"></div>
      ${rows.map(row).join('')}
    </div>
    <p class="muted small" style="margin:8px 0 0">Dicker Strich = Leute kommen raus, dann dort stehen. Dünn = läuft noch.</p>
  </section>`;
}

function viewRadar() {
  const now = Date.now();
  const items = radarItems(now);
  const groups = [
    ['🔥 Jetzt', items.filter(x => x.prio >= 2)],
    ['📅 Später heute', items.filter(x => x.prio === 1)],
    ['🌙 Morgen und demnächst', items.filter(x => x.prio === 0)]
  ];
  const d = radar.data;

  // Stand der einzelnen Quellen – damit du siehst, ob die App wirklich aktuell ist
  const bahnN = radar.bahn ? radar.bahn.reduce((s, b) => s + b.trains.length, 0) : 0;
  const bahnOk = radar.bahn && Date.now() - radar.bahnAt < 30 * 60000;
  const bahnHas = bahnItems(now).length;
  const rainNow = radar.rain ? radar.rain.filter(r => r.t <= now).slice(-1)[0] : null;
  const rainNext = radar.rain ? radar.rain.find(r => r.t > now && r.t - now <= 2 * 36e5 && r.mm >= 0.2) : null;
  const status = [
    ['🚆 Bahn (Hbf, Deutz)', bahnOk ? (bahnHas ? 'Störungen – siehe oben' : `keine Ausfälle · ${bahnN} Züge geprüft`) + ` · ${hhmm(radar.bahnAt)}` : 'nicht erreichbar'],
    ['🌧️ Regen', radar.rain ? (rainNow && rainNow.mm >= 0.2 ? 'es regnet' : rainNext ? `ab ca. ${hhmm(rainNext.t)}` : 'kein Regen in den nächsten 2 Std.') + ` · ${hhmm(radar.rainAt)}` : 'nicht erreichbar'],
    ['🎤 Termine (Arena, Messe, Fußball, Konzerte)', d && d.stand ? `Stand ${dm(new Date(d.stand).getTime())} ${hhmm(new Date(d.stand).getTime())}` : 'werden geladen …']
  ];

  return `<button type="button" class="btn" data-act="radarRefresh" style="margin-bottom:12px">↻ Jetzt aktualisieren</button>
    ${groups.map(([title, list]) => `<section class="card radar ${title.startsWith('🔥') && list.some(x => x.prio >= 3) ? 'hot' : ''}">
      <h2>${title}</h2>
      ${list.length ? `<ul class="list">${list.map(x => radarRow(x, now)).join('')}</ul>`
        : `<p class="muted">${title.startsWith('🔥') ? 'Gerade nichts Besonderes – normaler Betrieb. Schau auf die Karte für die besten Stände.' : 'Nichts angekündigt.'}</p>`}
    </section>`).map((h, i) => i === 1 ? radarTimeline(now) + h : h).join('')}
    <section class="card">
      <h2>Datenstand</h2>
      <table class="t">${status.map(([k, v]) => `<tr><td>${k}</td><td>${esc(v)}</td></tr>`).join('')}</table>
      <p class="muted small" style="margin-top:8px">Die App prüft alle paar Minuten neu, solange sie offen ist. Alle Veranstaltungen der nächsten Tage stehen im Reiter „Woche“.</p>
    </section>`;
}

// Für den KI-Berater: alles, was heute und morgen ansteht
function radarForAi(now = Date.now()) {
  const items = radarItems(now);
  return items.length ? items.map(x => `- ${x.text}: ${x.sub}`).join('\n') : '';
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

Du bekommst die aktuelle Zeit, das Wetter, seine eigenen Messungen je Halteplatz, eine grobe Schätzung aus Kartendaten (welche Einrichtungen rund um einen Platz liegen) und einen allgemeinen Erfahrungswert. Seine eigenen Messungen sind die beste Grundlage, aber nur, wenn genug Fahrten dahinterstehen. Bei weniger als etwa 5 Fahrten an einem Platz ist die Zahl ein Hinweis und kein Beweis; sag das dann offen und stütze dich stärker auf Uhrzeit, Wochentag, Wetter und das, was über Köln allgemein bekannt ist. Erfinde keine Zahlen, Veranstaltungen oder Zugzeiten: Nutze nur die Termine aus dem Live-Radar; was dort nicht steht, kennst du nicht. Endet laut Radar bald eine Veranstaltung oder ist Messeschluss, hat das meist Vorrang.

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
  const rd = radarForAi(now);
  if (rd) L.push('', 'Live-Radar (Veranstaltungen und Messen von den offiziellen Seiten, Endzeiten geschätzt; Regen live):', rd);

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
    await loadRadar();
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
  await loadRadar();
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

/* ---------- Ansicht: Rechner (immer amtlicher Kölner Taxitarif) ---------- */

// Kölner Taxitarif (Rechtsverordnung, Fassung vom 02.04.2026). Am 01.03.2027 tritt die zweite,
// bereits beschlossene Stufe in Kraft – die App wechselt an dem Tag von selbst.
const KOELN_STEP = new Date(2027, 2, 1).getTime();
function tariff(now = Date.now()) {
  return now >= KOELN_STEP
    ? { base: 5.0, km: 3.0, waitMin: 0.6, large: 7 }
    : { base: 4.9, km: 2.9, waitMin: 0.6, large: 6 };
}

function farePrice(km, waitMin, large) {
  const t = tariff();
  return t.base + (large ? t.large : 0) + km * t.km + waitMin * t.waitMin;
}

// ---- Preis zum Ziel: Start (GPS oder Adresse) + Ziel -> Strecke -> Preis ----
// Adresssuche: Photon (OpenStreetMap, komoot). Route: OSRM. Beide nur auf Knopfdruck.
let route = { busy: false, err: '', from: null, to: null, alts: [], km: 0, min: 0, large: false };

// Halteplatz-Namen (z. B. „Flughafen“, „Hauptbahnhof“) direkt erkennen, ohne Suche im Netz
function standByName(q) {
  const n = q.trim().toLowerCase();
  const p = HP.find(x => x.pos && x.name.toLowerCase() === n);
  return p ? { lat: p.pos[0], lon: p.pos[1], label: p.name + ' (Halteplatz)' } : null;
}

// Erst nur in Köln und Umgebung suchen (bis Bonn, Düsseldorf, Leverkusen, Solingen).
// Nur wenn dort nichts passt, deutschlandweit – das Ergebnis wird dann als „weit weg“ markiert.
const REGION_BBOX = '6.55,50.62,7.40,51.30';
async function photon(q, bbox) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 8000);
  const res = await fetch('https://photon.komoot.io/api/?limit=4&lang=de&lat=50.94&lon=6.96' + (bbox ? '&bbox=' + bbox : '')
    + '&q=' + encodeURIComponent(q), { signal: ctl.signal });
  clearTimeout(timer);
  if (!res.ok) throw new Error('Die Adresssuche antwortet gerade nicht.');
  return (await res.json()).features || [];
}

async function searchPlace(q) {
  const own = standByName(q);
  if (own) return [own];
  let feats = await photon(q, REGION_BBOX), far = false;
  if (!feats.length) { feats = await photon(q, ''); far = true; }
  return feats.map(f => {
    const p = f.properties || {};
    const street = [p.street, p.housenumber].filter(Boolean).join(' ');
    const label = [p.name && p.name !== p.street ? p.name : '', street, [p.postcode, p.city || p.town || p.village].filter(Boolean).join(' '), p.district]
      .filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', ');
    return { lat: f.geometry.coordinates[1], lon: f.geometry.coordinates[0], label: label || q, far };
  });
}

async function routeBetween(a, b) {
  const ctl = new AbortController();
  const timer = setTimeout(() => ctl.abort(), 10000);
  const res = await fetch(`https://router.project-osrm.org/route/v1/driving/${a.lon},${a.lat};${b.lon},${b.lat}?overview=false`, { signal: ctl.signal });
  clearTimeout(timer);
  const j = res.ok ? await res.json() : null;
  if (!j || j.code !== 'Ok' || !j.routes || !j.routes.length) throw new Error('Für diese Strecke wurde keine Route gefunden.');
  return { km: j.routes[0].distance / 1000, min: j.routes[0].duration / 60 };
}

function routeResultHtml() {
  if (route.busy) return '<p class="muted center">Wird berechnet …</p>';
  if (route.err) return `<p class="bad">${esc(route.err)}</p>`;
  if (!route.to) return '';
  const p = farePrice(route.km, 0, route.large);
  const alts = route.alts.length ? `<p class="muted small">Nicht das richtige Ziel? ${route.alts.map((a, i) =>
    `<button type="button" class="linkbtn" data-act="routePick" data-i="${i}">${esc(a.label)}</button>`).join(' · ')}</p>` : '';
  const farWarn = route.to.far || route.from.far
    ? '<p class="bad">Achtung: In Köln und Umgebung nichts gefunden – das Ergebnis liegt weit weg. Bitte prüfen, ob das wirklich das Ziel ist.</p>' : '';
  return `${farWarn}<div class="result">${eur(p)}</div>
    <p class="center">${route.km.toFixed(1).replace('.', ',')} km · ca. ${Math.round(route.min)} Min Fahrzeit</p>
    <p class="muted small center">Mit 10 Min Stau: ${eur(farePrice(route.km, 10, route.large))} · mit 20 Min: ${eur(farePrice(route.km, 20, route.large))}</p>
    <p class="muted small">Von: ${esc(route.from.label)}<br>Nach: ${esc(route.to.label)}</p>
    ${alts}
    ${route.km > 35 ? '<p class="small">Hinweis: Liegt das Ziel außerhalb des Pflichtfahrgebiets, musst du den Fahrpreis vorher mit dem Fahrgast vereinbaren.</p>' : ''}`;
}

function updateRoute() { const el = $('#routeOut'); if (el) el.innerHTML = routeResultHtml(); }

async function calcRoute(f) {
  const fromQ = f.from.value.trim(), toQ = f.to.value.trim();
  route.large = f.large.checked;
  if (!toQ) { f.to.focus(); return toast('Bitte ein Ziel eingeben'); }
  route = Object.assign(route, { busy: true, err: '', to: null, alts: [] });
  updateRoute();
  try {
    let from;
    if (fromQ) {
      const r = await searchPlace(fromQ);
      if (!r.length) throw new Error('Start nicht gefunden. Bitte genauer eingeben (Straße, Hausnummer, Stadtteil).');
      from = r[0];
    } else {
      const me = posFresh() ? myPos : await locate();
      from = { lat: me.lat, lon: me.lon, label: 'Mein Standort' + (here.label ? ' (' + here.label + ')' : '') };
    }
    const hits = await searchPlace(toQ);
    if (!hits.length) throw new Error('Ziel nicht gefunden. Bitte genauer eingeben (Straße, Hausnummer, Stadtteil).');
    const r = await routeBetween(from, hits[0]);
    route = Object.assign(route, { busy: false, from, to: hits[0], alts: hits.slice(1), km: r.km, min: r.min });
  } catch (e) {
    route = Object.assign(route, { busy: false, err: e.name === 'AbortError' ? 'Keine Antwort – bitte Internet prüfen.' : e.message });
  }
  updateRoute();
}

async function pickRouteAlt(i) {
  const alt = route.alts[i];
  if (!alt || !route.from) return;
  const rest = route.alts.filter((_, j) => j !== i).concat(route.to);
  route = Object.assign(route, { busy: true, err: '' });
  updateRoute();
  try {
    const r = await routeBetween(route.from, alt);
    route = Object.assign(route, { busy: false, to: alt, alts: rest, km: r.km, min: r.min });
  } catch (e) { route = Object.assign(route, { busy: false, err: e.message }); }
  updateRoute();
}

// ---- Eigener Standort im Rechner: beim Öffnen holen und als Adresse anzeigen ----
let here = { busy: false, err: '', label: '', stand: '', t: 0 };

async function reverseLabel(lat, lon) {
  try {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 6000);
    const res = await fetch(`https://photon.komoot.io/reverse?lang=de&lat=${lat}&lon=${lon}`, { signal: ctl.signal });
    clearTimeout(timer);
    const p = res.ok ? (((await res.json()).features || [])[0] || {}).properties : null;
    if (!p) return '';
    return [[p.street, p.housenumber].filter(Boolean).join(' ') || p.name, p.district || p.locality || p.city].filter(Boolean).join(', ');
  } catch (e) { return ''; }
}

function hereHtml() {
  if (here.busy) return '📍 Standort wird ermittelt …';
  if (here.err) return `<span class="bad">📍 ${esc(here.err)}</span>`;
  if (!myPos) return '📍 Standort noch nicht ermittelt';
  return `📍 <b>${esc(here.label || 'Standort gefunden')}</b>${here.stand ? `<br><span class="muted small">Nächster Halteplatz: ${esc(here.stand)}</span>` : ''}`;
}

function updateHere() { const el = $('#hereOut'); if (el) el.innerHTML = hereHtml(); }

async function locateHere(force) {
  if (here.busy || (!force && posFresh() && here.label && Date.now() - here.t < 2 * 60000)) return updateHere();
  here = { busy: true, err: '', label: '', stand: '', t: 0 };
  updateHere();
  try {
    await locate();
    const near = nearby(1)[0];
    here = { busy: false, err: '', label: await reverseLabel(myPos.lat, myPos.lon), stand: near ? `${near.p.name} (${fmtDist(near.d)})` : '', t: Date.now() };
  } catch (e) {
    here = { busy: false, err: e.message, label: '', stand: '', t: 0 };
  }
  updateHere();
}

function viewCalc() {
  const t = tariff();
  return `<section class="card">
      <h2>Preis zum Ziel</h2>
      <div class="here"><div id="hereOut" class="grow">${hereHtml()}</div>
        <button type="button" class="btn route" data-act="hereAgain" aria-label="Standort neu ermitteln">↻</button></div>
      <form data-form="route" autocomplete="off">
        <label class="f"><span>Start – leer lassen = mein Standort (oben)</span><input name="from" type="text" placeholder="📍 Mein Standort"></label>
        <label class="f"><span>Ziel – Adresse, Ort oder Halteplatz</span><input name="to" type="text" placeholder="z. B. Aachener Str. 703 oder Flughafen"></label>
        <label class="check"><input type="checkbox" name="large" ${route.large ? 'checked' : ''}><span>Großraum (+ ${eur(t.large)})</span></label>
        <button type="submit" class="btn primary">Preis berechnen</button>
      </form>
      <div id="routeOut" style="margin-top:12px">${routeResultHtml()}</div>
      <p class="muted small">Schätzung nach Kölner Tarif auf der schnellsten Strecke, ohne Verkehr. Es gilt der Taxameter. Dein Standort, Start und Ziel werden zur Berechnung an Kartendienste (OpenStreetMap) geschickt – nicht gespeichert.</p>
    </section>
    <section class="card">
      <h2>Nach Kilometern</h2>
      <label class="f"><span>Strecke in Kilometern</span><input id="calcKm" type="text" inputmode="decimal" placeholder="z. B. 12,5"></label>
      <label class="f"><span>Wartezeit / Stau in Minuten</span><input id="calcWait" type="text" inputmode="decimal" placeholder="0"></label>
      <label class="check"><input type="checkbox" id="calcLarge"><span>Großraum (+ ${eur(t.large)})</span></label>
      <div class="result" id="calcOut">${eur(t.base)}</div>
    </section>
    <section class="card">
      <table class="t">
        <tr><td>Start</td><td>${eur(t.base)}</td></tr>
        <tr><td>Pro Kilometer</td><td>${eur(t.km)}</td></tr>
        <tr><td>Pro Minute Stau / Warten</td><td>${eur(t.waitMin)}</td></tr>
        <tr><td>Großraum zum Start</td><td>+ ${eur(t.large)}</td></tr>
      </table>
      <p class="muted small" style="margin-top:8px">Kölner Taxitarif. ${Date.now() < KOELN_STEP ? 'Ab 1. März 2027 gilt der neue Tarif (5,00 € Start, 3,00 € pro km, Großraum 7,00 €) – die App stellt dann von selbst um.' : 'Tarif seit 1. März 2027.'}</p>
    </section>`;
}

function updateCalc() {
  const out = $('#calcOut');
  if (!out) return;
  out.textContent = eur(farePrice(Math.max(0, num($('#calcKm').value)), Math.max(0, num($('#calcWait').value)), $('#calcLarge').checked));
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
        <tr><td>Meine Orte</td><td>${S.settings.places.length}</td></tr>
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
      <p class="muted small">Alle Daten liegen nur auf diesem Gerät. Die App erinnert dich jede Woche an eine Sicherung. Die App ist dein persönliches Notizbuch und ersetzt nicht den Taxameter oder die Aufzeichnungen deines Betriebs.</p>
      <p class="small">Letzte Sicherung: <b>${backupAgo()}</b></p>
      <button class="btn primary" data-act="backupNow">💾 Jetzt sichern (iCloud / Dateien)</button>
      <button class="btn" data-act="importJson">Sicherung laden</button>
      <button class="btn" data-act="exportCsv">Fahrten als Tabelle speichern (CSV)</button>
      <input type="file" id="importFile" accept="application/json,.json" hidden>
      <button class="btn danger" data-act="wipe">Alle Daten löschen</button>
    </section>`;
}

function settingsForm() {
  const s = S.settings;
  const v = n => String(n).replace('.', ',');
  return `<h2>Einstellungen</h2>
    <form data-form="settings" autocomplete="off">
      <label class="f"><span>Tagesziel Umsatz in Euro (0 = kein Ziel)</span><input name="goal" type="text" inputmode="decimal" value="${v(s.goal)}"></label>
      <label class="f"><span>Meine Orte – einer pro Zeile</span><textarea name="places">${esc(s.places.join('\n'))}</textarea></label>
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

// Sicherung: auf dem iPhone über das Teilen-Menü („In Dateien sichern“ → iCloud Drive),
// sonst als Download. Die Datei geht nirgendwohin außer dorthin, wo du sie ablegst.
const BACKUP_DAYS = 7;

async function backupNow() {
  const name = 'taxi-coach-sicherung-' + dayKey(Date.now()) + '.json';
  const text = JSON.stringify(Object.assign({}, S, { backupAt: Date.now() }));
  const done = () => { S.backupAt = Date.now(); save(); render(); toast('Sicherung erstellt'); };
  let file = null;
  try { file = new File([text], name, { type: 'application/json' }); } catch (e) { /* alte Browser ohne File */ }
  if (file && navigator.canShare && navigator.canShare({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title: 'Taxi Coach Sicherung' });
      return done();
    } catch (e) {
      if (e && e.name === 'AbortError') return toast('Sicherung abgebrochen');
      // Teilen klappt nicht: auf Download ausweichen
    }
  }
  download(name, text, 'application/json');
  done();
}

function backupDue(now = Date.now()) {
  if (!S.rides.length && !S.shifts.length) return false;   // noch nichts zu sichern
  return !S.backupAt || now - S.backupAt > BACKUP_DAYS * 864e5;
}

function backupAgo(now = Date.now()) {
  if (!S.backupAt) return 'noch nie';
  const days = Math.floor((now - S.backupAt) / 864e5);
  return days === 0 ? 'heute' : days === 1 ? 'gestern' : `vor ${days} Tagen (${dm(S.backupAt)})`;
}

function backupCard(now = Date.now()) {
  if (!backupDue(now)) return '';
  return `<section class="card hint warn">
    <h2>💾 Sicherung fällig</h2>
    <p class="small">Letzte Sicherung: <b>${backupAgo(now)}</b>. ${S.rides.length === 1 ? 'Deine Fahrt liegt' : `Deine ${S.rides.length} Fahrten liegen`} nur auf diesem Handy.</p>
    <p class="muted small">Tippe auf „Jetzt sichern“, dann „In Dateien sichern“ → iCloud Drive.</p>
    <button class="btn primary" data-act="backupNow">💾 Jetzt sichern</button>
  </section>`;
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

/* ---------- Ansicht: Woche – wo sammeln sich in den nächsten Tagen Menschen? ---------- */

let week = { days: 3, showM: false, wx: null, wxAt: 0, open: '' };

// Die nächsten Taxistände zu einem Ort (Luftlinie)
function standsNear(lat, lon, n = 4) {
  return HP.filter(p => p.pos).map(p => ({ p, d: distM([lat, lon], p.pos) })).sort((a, b) => a.d - b.d).slice(0, n);
}

const mapsDir = (lat, lon) => `https://www.google.com/maps/dir/?api=1&amp;destination=${lat},${lon}`;

// Aufgeklappte Liste unter einer Veranstaltung
function nearHtml(lat, lon, ab) {
  const me = posFresh() ? [myPos.lat, myPos.lon] : null;
  return `<div class="near">
    <div class="muted small">Taxistände in der Nähe${ab ? ` – am besten ab ${ab} dort sein` : ''}:</div>
    <ul class="list">${standsNear(lat, lon).map((x, i) => `<li>
      <span class="rank">${i + 1}</span>
      <div class="grow"><div><b>${esc(x.p.name)}</b> <span class="muted small">${fmtDist(x.d)}</span></div>
        <div class="sub">${esc(x.p.lage)}${x.p.note ? ' · nur ' + esc(x.p.note) : ''}${x.p.hrs ? ' · nur ' + esc(x.p.hrs) + ' Uhr' : ''}${me ? ' · von dir ' + fmtDist(distM(me, x.p.pos)) : ''}</div></div>
      <a class="btn route" href="${mapsDir(x.p.pos[0], x.p.pos[1])}" target="_blank" rel="noopener">Route</a></li>`).join('')}</ul>
  </div>`;
}
const GROESSE = { XL: 'Riesig', L: 'Groß', M: 'Mittel' };

// Feiertage in NRW (fest und von Ostern abhängig)
function holidayName(t) {
  const d = new Date(t), y = d.getFullYear(), k = `${d.getMonth() + 1}-${d.getDate()}`;
  const fixed = { '1-1': 'Neujahr', '5-1': 'Tag der Arbeit', '10-3': 'Tag der Deutschen Einheit', '11-1': 'Allerheiligen',
    '12-24': 'Heiligabend', '12-25': '1. Weihnachtstag', '12-26': '2. Weihnachtstag', '12-31': 'Silvester' };
  if (fixed[k]) return fixed[k];
  const e = easter(y), diff = Math.round((new Date(y, d.getMonth(), d.getDate()) - new Date(e.getFullYear(), e.getMonth(), e.getDate())) / 864e5);
  return { '-2': 'Karfreitag', '0': 'Ostersonntag', '1': 'Ostermontag', '39': 'Christi Himmelfahrt',
    '49': 'Pfingstsonntag', '50': 'Pfingstmontag', '60': 'Fronleichnam',
    '-52': 'Weiberfastnacht', '-49': 'Karnevalssonntag', '-48': 'Rosenmontag' }[String(diff)] || '';
}

async function loadWeekWeather() {
  if (week.wx && Date.now() - week.wxAt < 3 * 36e5) return;
  try {
    const res = await fetch('https://api.open-meteo.com/v1/forecast?latitude=50.94&longitude=6.96&daily=precipitation_sum,precipitation_probability_max,temperature_2m_max,temperature_2m_min&forecast_days=8&timezone=Europe%2FBerlin');
    if (!res.ok) return;
    const d = (await res.json()).daily;
    week.wx = {};
    d.time.forEach((t, i) => { week.wx[t] = { rain: d.precipitation_sum[i], prob: d.precipitation_probability_max[i], max: d.temperature_2m_max[i], min: d.temperature_2m_min[i] }; });
    week.wxAt = Date.now();
  } catch (e) { /* ohne Netz kein Wetter */ }
}

function viewWeek() {
  const now = Date.now();
  const d = radar.data;
  const evs = d && Array.isArray(d.veranstaltungen) ? d.veranstaltungen.filter(e => !e.abgesagt) : [];
  const fairs = d && Array.isArray(d.messen) ? d.messen : [];
  const days = [];
  const t0 = new Date(now); t0.setHours(0, 0, 0, 0);
  for (let i = 0; i < week.days; i++) {
    const day = new Date(t0); day.setDate(t0.getDate() + i);
    const a = day.getTime(), b = a + 864e5;
    const list = evs.map(e => ({ e, start: parseLocal(e.beginn) })).filter(x => x.start >= a && x.start < b)
      .map(x => Object.assign(x, { end: x.start + (x.e.dauer || 165) * 60000 }));
    const big = list.filter(x => (x.e.groesse || 'XL') !== 'M');
    const shown = week.showM ? list : big;
    const messen = fairs.filter(m => parseLocal(m.von) <= a && parseLocal(m.bis) >= a);
    days.push({ a, list, big, shown, messen, wx: week.wx && week.wx[dayKey(a)], holiday: holidayName(a), season: seasonHint(a + 12 * 36e5) });
  }

  const head = (x, i) => {
    const date = new Date(x.a);
    const name = i === 0 ? 'Heute' : i === 1 ? 'Morgen' : DAYS_LONG[dow(x.a)];
    const w = x.wx ? ` · ${Math.round(x.wx.max)}°${x.wx.rain >= 1 ? ` · 🌧️ ${String(Math.round(x.wx.rain * 10) / 10).replace('.', ',')} mm` : x.wx.prob >= 50 ? ' · 🌦️' : ''}` : '';
    return `<h2>${name}, ${pad(date.getDate())}.${pad(date.getMonth() + 1)}.<span class="muted small" style="font-weight:400">${w}</span></h2>`;
  };

  // Schlusszeiten der großen Ereignisse: wann und wo die meisten Fahrgäste gleichzeitig rauskommen
  const peaks = x => {
    const ends = x.big.slice().sort((p, q) => p.end - q.end);
    if (!ends.length) return '';
    const near = y => (y.e.lat != null ? standsNear(y.e.lat, y.e.lon, 1)[0].p.name : y.e.stand);
    return `<p class="peak">🔥 <b>Schlusszeiten:</b> ${ends.map(y => `${hhmm(y.end)} ${esc(near(y))}`).join(' · ')}</p>`;
  };

  // Antippen klappt die nächsten Taxistände auf
  const row = y => {
    const key = y.e.beginn + '|' + y.e.titel + '|' + y.e.ort;
    const open = week.open === key && y.e.lat != null;
    const first = y.e.lat != null ? standsNear(y.e.lat, y.e.lon, 1)[0] : null;
    return `<li class="ev ${open ? 'open' : ''}">
      <button type="button" class="evbtn" data-act="evOpen" data-k="${esc(key)}" aria-expanded="${open}">
        <span class="badge g${y.e.groesse || 'XL'}">${GROESSE[y.e.groesse || 'XL']}</span>
        <span class="grow"><span class="evt"><b>${hhmm(y.start)}</b> ${esc(y.e.titel)}</span>
          <span class="sub">${esc(y.e.ort)}${y.e.art ? ' · ' + esc(y.e.art) : ''} · Ende ca. ${hhmm(y.end)}</span>
          <span class="sub">🚕 ${first ? `${esc(first.p.name)} ${fmtDist(first.d)}` : esc(y.e.stand)} ${y.e.lat != null ? `<span class="more">${open ? '▲ zu' : '▼ alle Stände'}</span>` : ''}</span></span>
      </button>
      ${open ? nearHtml(y.e.lat, y.e.lon, hhmm(y.end - 20 * 60000)) : ''}</li>`;
  };

  const dayCard = (x, i) => {
    const notes = [];
    if (x.holiday) notes.push(`🎉 ${x.holiday}`);
    if (x.season) notes.push(`🎄 ${x.season.title}`);
    const messeRows = x.messen.map(m => {
      const key = 'messe|' + m.titel + '|' + x.a;
      const open = week.open === key && m.lat != null;
      return `<li class="ev ${open ? 'open' : ''}">
        <button type="button" class="evbtn" data-act="evOpen" data-k="${esc(key)}" aria-expanded="${open}">
          <span class="badge gXL">Messe</span>
          <span class="grow"><span class="evt"><b>${esc(m.titel)}</b> (bis ${dm(parseLocal(m.bis))})</span>
            <span class="sub">Anreise 7–10 Uhr · Schluss 16–19 Uhr</span>
            <span class="sub">🚕 Messe Nord / Messe Süd ${m.lat != null ? `<span class="more">${open ? '▲ zu' : '▼ alle Stände'}</span>` : ''}</span></span>
        </button>
        ${open ? nearHtml(m.lat, m.lon, '') : ''}</li>`;
    }).join('');
    if ([4, 5].includes(dow(x.a))) notes.push('🌙 Ausgeh-Nacht: Ringe, Zülpicher Str., Altstadt');   // Freitag, Samstag
    if (x.wx && x.wx.rain >= 3) notes.push('🌧️ Viel Regen angesagt – mehr Fahrgäste, besonders abends');
    const hidden = x.list.length - x.shown.length;
    return `<section class="card">${head(x, i)}
      ${notes.map(n => `<p class="small">${n}</p>`).join('')}
      ${dayPlanHtml(x.a, x.messen)}
      ${peaks(x)}
      ${messeRows || x.shown.length ? `<ul class="list">${messeRows}${x.shown.map(row).join('')}</ul>` : '<p class="muted">Keine großen Veranstaltungen.</p>'}
      ${hidden > 0 ? `<p class="muted small">+ ${hidden} kleinere Veranstaltung${hidden === 1 ? '' : 'en'} (oben „auch kleinere“ antippen)</p>` : ''}
    </section>`;
  };

  const stand = d && d.stand ? `Stand der Termine: ${dm(new Date(d.stand).getTime())} ${hhmm(new Date(d.stand).getTime())} Uhr` : 'Termine werden geladen …';
  return `<div class="seg">
      ${[3, 7].map(n => `<label class="chip"><input type="radio" name="weekDays" value="${n}" ${week.days === n ? 'checked' : ''}><span>${n} Tage</span></label>`).join('')}
      <label class="chip"><input type="checkbox" name="weekShowM" ${week.showM ? 'checked' : ''}><span>auch kleinere</span></label>
    </div>
    ${days.map(dayCard).join('')}
    <p class="muted small">Tippe auf eine Veranstaltung, um die Taxistände in der Nähe zu sehen (Luftlinie).</p>
    <p class="muted small">${stand}. Quellen: LANXESS arena, Koelnmesse, OpenLigaDB (Fußball), koeln.de (große Veranstaltungsorte), Wetter: Open-Meteo. Endzeiten und Größe sind geschätzt.</p>`;
}

/* ---------- Rendern und Ereignisse ---------- */

const VIEWS = {
  heute: { title: 'Heute', render: viewToday },
  radar: { title: 'Jetzt wichtig', render: viewRadar },
  woche: { title: 'Woche', render: viewWeek },
  coach: { title: 'Coach', render: viewCoach },
  plaetze: { title: 'Karte', render: viewPlaces },
  rechner: { title: 'Rechner', render: viewCalc },
  mehr: { title: 'Mehr', render: viewMore }
};

function render() {
  const v = VIEWS[tab];
  destroyMap();   // die Karte wird bei jedem Neuaufbau frisch angelegt
  $('#title').textContent = v.title;
  $('#view').innerHTML = v.render();
  document.body.classList.toggle('mapmode', tab === 'plaetze' && placesMode === 'karte');
  document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.tab === tab));
  tickClock();
  if (tab === 'plaetze' && placesMode === 'karte') initMap();
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
  mapStand(el) {
    if (!activeShift()) return toast('Bitte zuerst die Schicht starten');
    closeStand();
    S.stand = { name: el.dataset.name, since: Date.now() };
    save(); tab = 'heute'; render(); window.scrollTo(0, 0);
    toast('Du stehst an: ' + el.dataset.name);
  },
  mapGo(el) {
    const m = mapState.mk && mapState.mk[el.dataset.name];
    if (!m || !mapState.map) return;
    const box = $('#map');
    if (box) window.scrollTo({ top: Math.max(0, box.getBoundingClientRect().top + window.scrollY - 80), behavior: 'smooth' });
    mapState.map.setView(m.getLatLng(), 15);
    m.openPopup();
  },
  mapMe() {
    toast('Standort wird gesucht …');
    locate().then(p => {
      if (mapState.map) { mapState.map.setView([p.lat, p.lon], 15); mapState.followed = true; }
    }).catch(err => toast(err.message));
  },
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
  settings() { openSheet(settingsForm()); },
  routePick(el) { pickRouteAlt(Number(el.dataset.i)); },
  hereAgain() { locateHere(true); },
  goRadar() { tab = 'radar'; render(); window.scrollTo(0, 0); refreshRadar(false); },
  radarRefresh() {
    radar.bahnAt = 0; radar.rainAt = 0; radar.loadedAt = 0;
    toast('Wird aktualisiert …');
    refreshRadar(true);
  },
  evOpen(el) {
    const y = window.scrollY;
    week.open = week.open === el.dataset.k ? '' : el.dataset.k;
    render();
    window.scrollTo(0, y);   // nicht nach oben springen
  },
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
  exportJson() { backupNow(); },
  backupNow() { backupNow(); },
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
  route(f) { calcRoute(f); },
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
  settings(f) {
    const s = S.settings;
    s.goal = Math.max(0, num(f.goal.value));
    const places = f.places.value.split('\n').map(x => x.trim().slice(0, 40)).filter(Boolean);
    s.places = [...new Set(places)];
    s.aiModel = AI_MODELS[f.aimodel.value] ? f.aimodel.value : 'opus';
    const key = f.aikey.value.trim();
    if (key) setAiKey(key);
    save(); closeSheet(); render();
    toast(key && !key.startsWith('sk-ant-') ? 'Gespeichert – der Schlüssel sieht aber ungewöhnlich aus' : 'Gespeichert');
  }
};

document.addEventListener('click', e => {
  const tabBtn = e.target.closest('#tabs button');
  if (tabBtn) {
    tab = tabBtn.dataset.tab; render(); window.scrollTo(0, 0);
    if (tab === 'rechner') locateHere(false);
    if (tab === 'radar') refreshRadar(false);
    if (tab === 'woche') Promise.all([loadRadar(false), loadWeekWeather()]).then(() => { if (tab === 'woche' && !sheetOpen()) render(); });
    return;
  }
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
  if (t.name === 'hpChan') { hpChan = Number(t.value); updateHp(); return; }
  if (t.name === 'placesMode') { placesMode = t.value; render(); window.scrollTo(0, 0); return; }
  if (t.name === 'weekDays') { week.days = Number(t.value); render(); return; }
  if (t.name === 'weekShowM') { week.showM = t.checked; render(); return; }
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
  if (['heute', 'coach', 'radar'].includes(tab)) render();
}, 30000);
setInterval(() => { if (!document.hidden) refreshRadar(false); }, 5 * 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refreshRadar(false); });

if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js').catch(() => {});
}

render();
refreshRadar(true);
