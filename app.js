'use strict';

/* ---------- Daten ---------- */

const KEY = 'taxicoach.v1';

const DEFAULTS = {
  settings: {
    goal: 200,            // Tagesziel Umsatz in Euro
    share: 100,           // mein Anteil am Umsatz in Prozent (Angestellte z. B. 40–50)
    tariff: { base: 4.5, km1: 2.6, km1Until: 7, km2: 2.0, waitPerHour: 36 }, // Beispielwerte!
    tariffIsExample: true,
    places: ['Hauptbahnhof', 'Flughafen', 'Innenstadt', 'Krankenhaus', 'Hotel', 'Kneipenviertel']
  },
  shifts: [],   // { id, start, end }
  rides: [],    // { id, shiftId, t, amount, tip, pay, place, src }
  costs: [],    // { id, t, amount, kind }
  check: { day: '', done: {} },
  last: { pay: 'Bar', src: 'Halteplatz' }
};

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
  s.settings = Object.assign({}, DEFAULTS.settings, d.settings || {});
  s.settings.tariff = Object.assign({}, DEFAULTS.settings.tariff, (d.settings || {}).tariff || {});
  ['shifts', 'rides', 'costs'].forEach(k => { if (!Array.isArray(s[k])) s[k] = []; });
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
    places: ['Clubs und Diskotheken', 'Kneipenviertel', 'Hauptbahnhof'],
    text: 'Viele kurze Fahrten hintereinander. Nach dem Absetzen direkt zurück ins Ausgehviertel, nicht am Zielort warten.'
  };
  if (goingOut) return {
    title: 'Ausgeh-Abend',
    places: ['Restaurants und Bars', 'Veranstaltungsorte', 'Hotels'],
    text: 'Schau nach, wann Konzerte, Theater oder Spiele enden – 10 Minuten vorher dort stehen.'
  };
  if (d === 6) {
    if (h < 12) return {
      title: 'Sonntagmorgen',
      places: ['Clubs (Heimfahrten)', 'Hauptbahnhof', 'Flughafen'],
      text: 'Bis etwa 8 Uhr letzte Heimfahrten aus dem Nachtleben, danach Reisende.'
    };
    return {
      title: 'Sonntag ab Mittag',
      places: ['Hauptbahnhof', 'Flughafen', 'Hotels'],
      text: 'Rückreise-Tag: Wochenend-Gäste fahren heim, Pendler kommen am Abend an.'
    };
  }
  if (h < 4) return {
    title: 'Nacht unter der Woche – ruhig',
    places: ['Hauptbahnhof (späte Züge)', 'Krankenhaus / Notaufnahme', 'Hotels'],
    text: 'Wenig Laufkundschaft. Funk und Vermittlungs-App anlassen und zentral stehen.'
  };
  if (h < 9) return {
    title: 'Frühschicht',
    places: ['Hotels (Abreise)', 'Flughafen', 'Hauptbahnhof'],
    text: 'Geschäftsreisende und Flughafenfahrten – oft lange, gut bezahlte Touren. Vorbestellungen sind jetzt am wertvollsten.'
  };
  if (h < 12) return {
    title: 'Vormittag – eher ruhig',
    places: ['Krankenhäuser', 'Arztpraxen', 'Seniorenheime'],
    text: 'Arzt- und Krankenfahrten sind planbar. Frag Fahrgäste, ob sie auch eine Rückfahrt brauchen.'
  };
  if (h < 16) return {
    title: 'Mittag',
    places: ['Innenstadt', 'Einkaufszentren', 'Hauptbahnhof'],
    text: 'Schwächere Stunden: gute Zeit für Pause, Tanken und Auto sauber machen.'
  };
  if (h < 20) return {
    title: 'Feierabend-Verkehr',
    places: ['Hauptbahnhof', 'Büroviertel', 'Hotels (Anreise)'],
    text: 'Pendler und ankommende Reisende. Bei Regen ist die Innenstadt jetzt besonders stark.'
  };
  return {
    title: 'Abend',
    places: ['Restaurants', 'Hotels', 'Hauptbahnhof (späte Züge)'],
    text: 'Unter der Woche ruhiger als am Wochenende – Standplätze mit Hotels und Gastronomie bevorzugen.'
  };
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
  const idleMin = Math.floor((now - (rides[0] ? rides[0].t : sh.start)) / 60000);

  let goalLine = '';
  if (goal > 0) {
    if (rev >= goal) goalLine = 'Tagesziel erreicht – alles ab jetzt ist Bonus.';
    else if (perH > 0) goalLine = `Noch ${eur(goal - rev)} – bei diesem Tempo in ca. ${dur((goal - rev) / perH * 36e5)}.`;
    else goalLine = `Noch ${eur(goal - rev)} bis zum Tagesziel.`;
  }

  const adv = slotAdvice(now);
  const idleCard = idleMin >= 20
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
    <button class="btn primary big" data-act="rideNew" style="margin-bottom:14px">＋ Fahrt eintragen</button>
    ${idleCard}
    <section class="card">
      <h2>Fahrten dieser Schicht</h2>
      ${rides.length ? `<ul class="list">${rides.map(r => `<li>
          <div class="grow"><div>${esc(r.place || 'Ohne Ort')}</div>
            <div class="sub">${hhmm(r.t)} · ${esc(r.pay)} · ${esc(r.src)}</div></div>
          <div class="amt">${eur(r.amount)}${r.tip ? `<div class="sub">+ ${eur(r.tip)}</div>` : ''}</div>
          <button class="x" data-act="rideDel" data-id="${r.id}" aria-label="Fahrt löschen">✕</button>
        </li>`).join('')}</ul>` : '<p class="muted">Noch keine Fahrt eingetragen.</p>'}
    </section>
    <button class="btn danger" data-act="shiftEnd">Schicht beenden</button>`;
}

function rideForm() {
  const pays = ['Bar', 'Karte', 'App'];
  const srcs = ['Halteplatz', 'Winker', 'Funk', 'App', 'Stammkunde'];
  return `<h2>Fahrt eintragen</h2>
    <form data-form="ride" autocomplete="off">
      <label class="f"><span>Fahrpreis in Euro</span>
        <input class="money" name="amount" type="text" inputmode="decimal" placeholder="0,00" autofocus required></label>
      <label class="f"><span>Trinkgeld in Euro (freiwillig)</span>
        <input name="tip" type="text" inputmode="decimal" placeholder="0,00"></label>
      <span class="muted small">Bezahlt mit</span>
      <div class="seg">${pays.map(p => `<label class="chip"><input type="radio" name="pay" value="${p}" ${S.last.pay === p ? 'checked' : ''}><span>${p}</span></label>`).join('')}</div>
      <span class="muted small">Wo ist der Fahrgast eingestiegen?</span>
      <div class="chips">${S.settings.places.map(p => `<label class="chip"><input type="radio" name="place" value="${esc(p)}"><span>${esc(p)}</span></label>`).join('')}</div>
      <label class="f"><span>Anderer Ort (wird gemerkt)</span><input name="placeNew" type="text" maxlength="40"></label>
      <span class="muted small">Wie kam die Fahrt?</span>
      <div class="chips">${srcs.map(p => `<label class="chip"><input type="radio" name="src" value="${p}" ${S.last.src === p ? 'checked' : ''}><span>${p}</span></label>`).join('')}</div>
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
  'Prüfe den Veranstaltungskalender deiner Stadt: Konzerte, Fußball, Messen. Das Ende einer Veranstaltung bringt viele Fahrten.',
  'Regen, Kälte und Bahn-Ausfälle erhöhen die Nachfrage. An solchen Tagen lohnt es sich, länger zu fahren.',
  'Lege Pause und Tanken in deine schwachen Stunden (siehe Tabelle „Deine starken Zeiten“).',
  'Lehne kurze Fahrten nicht ab. Im Pflichtfahrgebiet musst du befördern – und viele kurze Fahrten bringen oft mehr pro Stunde als langes Warten.',
  'Fahre den kürzesten Weg, außer der Fahrgast wünscht einen anderen. Im Zweifel kurz fragen.',
  'Biete immer eine Quittung an.',
  'Bediene das Handy nur im Stand.'
];

function viewCoach() {
  const now = Date.now();
  const adv = slotAdvice(now);
  const best = myBestPlaces(now);
  const hm = heatmap();

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

  return `<section class="card hint">
      <h2>Jetzt: ${DAYS_LONG[dow(now)]}, ${hhmm(now)} Uhr</h2>
      <p><b>${esc(adv.title)}</b></p>
      <ul class="list">${adv.places.map((p, i) => `<li><span class="rank">${i + 1}</span><div class="grow">${esc(p)}</div></li>`).join('')}</ul>
      <p class="small">${esc(adv.text)}</p>
      <p class="muted small">Allgemeine Erfahrungswerte. Deine eigenen Zahlen unten sind genauer, sobald genug Fahrten eingetragen sind.</p>
    </section>
    ${bestCard}
    <section class="card">
      <h2>Deine starken Zeiten</h2>
      <p class="muted small">Umsatz pro gearbeiteter Stunde in Euro – nach Wochentag und Uhrzeit (Beginn des 3-Stunden-Blocks). Je heller, desto besser.</p>
      ${heat}
      ${anyHeat ? '' : '<p class="muted small" style="margin-top:10px">Die Tabelle füllt sich mit jeder Schicht.</p>'}
    </section>
    <section class="card">
      <h2>13 Regeln für mehr Umsatz</h2>
      <ol class="tips">${TIPS.map(t => `<li>${esc(t)}</li>`).join('')}</ol>
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

function farePrice(km, waitMin) {
  const t = S.settings.tariff;
  const first = Math.min(km, t.km1Until);
  const rest = Math.max(0, km - t.km1Until);
  return t.base + first * t.km1 + rest * t.km2 + (waitMin / 60) * t.waitPerHour;
}

function viewCalc() {
  const t = S.settings.tariff;
  return `<section class="card">
      <h2>Fahrpreis schätzen</h2>
      <label class="f"><span>Strecke in Kilometern</span><input id="calcKm" type="text" inputmode="decimal" placeholder="z. B. 12,5"></label>
      <label class="f"><span>Wartezeit / Stau in Minuten</span><input id="calcWait" type="text" inputmode="decimal" placeholder="0"></label>
      <div class="result" id="calcOut">${eur(t.base)}</div>
      <p class="muted small center">Nur eine Schätzung. Es gilt immer der Taxameter.</p>
    </section>
    <section class="card ${S.settings.tariffIsExample ? 'hint warn' : ''}">
      <h2>Tarif</h2>
      ${S.settings.tariffIsExample ? '<p><b>Das sind Beispielwerte.</b> Trage den Tarif deiner Stadt ein – er steht in der Taxitarifordnung deiner Stadt oder deines Landkreises.</p>' : ''}
      <table class="t">
        <tr><td>Grundpreis</td><td>${eur(t.base)}</td></tr>
        <tr><td>Pro km (bis ${String(t.km1Until).replace('.', ',')} km)</td><td>${eur(t.km1)}</td></tr>
        <tr><td>Pro km (danach)</td><td>${eur(t.km2)}</td></tr>
        <tr><td>Wartezeit pro Stunde</td><td>${eur(t.waitPerHour)}</td></tr>
      </table>
      <button class="btn" data-act="settings" style="margin-top:10px">Tarif ändern</button>
    </section>`;
}

function updateCalc() {
  const out = $('#calcOut');
  if (!out) return;
  out.textContent = eur(farePrice(Math.max(0, num($('#calcKm').value)), Math.max(0, num($('#calcWait').value))));
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
      <h3>Tarif meiner Stadt</h3>
      <label class="f"><span>Grundpreis in Euro</span><input name="base" type="text" inputmode="decimal" value="${v(t.base)}"></label>
      <div class="row">
        <label class="f"><span>Euro pro km (Anfang)</span><input name="km1" type="text" inputmode="decimal" value="${v(t.km1)}"></label>
        <label class="f"><span>gilt bis km</span><input name="km1Until" type="text" inputmode="decimal" value="${v(t.km1Until)}"></label>
      </div>
      <label class="f"><span>Euro pro km (danach)</span><input name="km2" type="text" inputmode="decimal" value="${v(t.km2)}"></label>
      <label class="f"><span>Wartezeit in Euro pro Stunde</span><input name="waitPerHour" type="text" inputmode="decimal" value="${v(t.waitPerHour)}"></label>
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
  const rows = [['Datum', 'Uhrzeit', 'Fahrpreis', 'Trinkgeld', 'Zahlart', 'Einstieg', 'Quelle']];
  S.rides.slice().sort((a, b) => a.t - b.t).forEach(r =>
    rows.push([dayKey(r.t).split('-').reverse().join('.'), hhmm(r.t), de(r.amount), de(r.tip), r.pay, r.place, r.src]));
  download('taxi-fahrten-' + dayKey(Date.now()) + '.csv', '﻿' + rows.map(r => r.map(csvCell).join(';')).join('\r\n'), 'text/csv;charset=utf-8');
}

/* ---------- Rendern und Ereignisse ---------- */

const VIEWS = {
  heute: { title: 'Heute', render: viewToday },
  coach: { title: 'Coach', render: viewCoach },
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
    if (!sh || !confirm('Schicht jetzt beenden?')) return;
    sh.end = Date.now();
    save(); render(); toast('Schicht beendet');
  },
  rideNew() { openSheet(rideForm()); },
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
  sheetClose() { closeSheet(); },
  exportCsv() {
    if (!S.rides.length) return toast('Noch keine Fahrten vorhanden');
    exportCsv();
  },
  exportJson() { download('taxi-coach-sicherung-' + dayKey(Date.now()) + '.json', JSON.stringify(S), 'application/json'); },
  importJson() { $('#importFile').click(); },
  wipe() {
    if (!confirm('Wirklich ALLE Fahrten, Schichten und Einstellungen löschen? Das kann nicht rückgängig gemacht werden.')) return;
    S = JSON.parse(JSON.stringify(DEFAULTS));
    save(); tab = 'heute'; render(); toast('Alles gelöscht');
  }
};

const FORMS = {
  ride(f) {
    const sh = activeShift();
    if (!sh) { closeSheet(); return toast('Bitte zuerst eine Schicht starten'); }
    const amount = num(f.amount.value);
    if (amount <= 0) { f.amount.focus(); return toast('Bitte den Fahrpreis eintragen'); }
    const custom = f.placeNew.value.trim();
    const place = custom || (f.place && f.place.value) || '';
    if (custom && !S.settings.places.some(p => p.toLowerCase() === custom.toLowerCase())) S.settings.places.push(custom);
    const pay = f.pay.value || 'Bar';
    const src = f.src.value || 'Halteplatz';
    S.rides.push({ id: uid(), shiftId: sh.id, t: Date.now(), amount, tip: Math.max(0, num(f.tip.value)), pay, place, src });
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
    const s = S.settings, old = JSON.stringify(s.tariff);
    s.goal = Math.max(0, num(f.goal.value));
    s.share = Math.min(100, Math.max(0, num(f.share.value)));
    const places = f.places.value.split('\n').map(x => x.trim().slice(0, 40)).filter(Boolean);
    s.places = [...new Set(places)];
    s.tariff = {
      base: Math.max(0, num(f.base.value)),
      km1: Math.max(0, num(f.km1.value)),
      km1Until: Math.max(0, num(f.km1Until.value)),
      km2: Math.max(0, num(f.km2.value)),
      waitPerHour: Math.max(0, num(f.waitPerHour.value))
    };
    if (JSON.stringify(s.tariff) !== old) s.tariffIsExample = false;
    save(); closeSheet(); render(); toast('Gespeichert');
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
  if (e.target.id === 'calcKm' || e.target.id === 'calcWait') updateCalc();
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
