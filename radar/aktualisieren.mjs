// Holt Veranstaltungen, bei denen sich viele Menschen sammeln, und schreibt sie nach radar.json:
//  - LANXESS arena (offizieller Eventkalender)
//  - Koelnmesse (offizielle Messeliste)
//  - Heimspiele 1. FC Köln und Viktoria Köln (OpenLigaDB)
//  - große Veranstaltungsorte aus dem koeln.de-Kalender (Palladium, E-Werk, Philharmonie, Tanzbrunnen …)
// Aufruf (im Ordner der App):  node radar/aktualisieren.mjs
// Keine Zusatzpakete nötig (Node 18+).
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'radar.json');
const UA = 'Mozilla/5.0 (compatible; taxi-coach-radar/1.0; einmal taeglich)';
const TAGE_VORAUS = 60;   // so weit in die Zukunft werden Termine gespeichert

// Seite holen und mit dem richtigen Zeichensatz lesen (manche Seiten sind nicht UTF-8)
async function holen(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'de' } });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const ct = res.headers.get('content-type') || '';
  let cs = (ct.match(/charset=([\w-]+)/i) || [])[1];
  if (!cs) cs = (buf.toString('latin1', 0, 3000).match(/<meta[^>]+charset=["']?([\w-]+)/i) || [])[1] || 'utf-8';
  let text = new TextDecoder(cs.toLowerCase()).decode(buf);
  if (text.includes('�')) text = new TextDecoder('windows-1252').decode(buf);
  return text;
}

const entities = s => s.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#0?39;|&apos;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
const nurText = html => entities(html.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ')
  .replace(/<[^>]+>/g, ' | ')).replace(/\s+/g, ' ');
const pad = n => String(n).padStart(2, '0');
const iso = (y, m, d, h = 0, min = 0) => `${y}-${pad(m)}-${pad(d)}T${pad(h)}:${pad(min)}`;   // Ortszeit Köln

// Wie lange dauert so etwas ungefähr? (für die geschätzte Endzeit)
function dauerMin(titel) {
  const t = titel.toLowerCase();
  if (/haie|eishockey/.test(t)) return 150;
  if (/handball|final4|ihf|ehf|basketball|volleyball|upw/.test(t)) return 135;
  if (/kurs|führung|fuehrung/.test(t)) return 120;
  if (/holiday on ice|cirque|cavalluna|musical|mamma mia|ehrlich/.test(t)) return 150;
  if (/comedy|lachende/.test(t)) return 210;
  if (/iem|esports|festival/.test(t)) return 480;
  return 165;   // Konzert / Show
}

async function arena() {
  const html = await holen('https://www.lanxess-arena.de/events-tickets/eventkalender');
  const txt = nurText(html);
  // Muster auf der Seite:  "Di. 24.11.2026 | 19:30 Uhr | ... | Kölner Haie - Nürnberg Ice Tigers | Untertitel |"
  const re = /\b(?:Mo|Di|Mi|Do|Fr|Sa|So)\.\s(\d{2})\.(\d{2})\.(\d{4})[\s|]+(\d{1,2}):(\d{2})\sUhr[\s|]+(?:\d{1,2}:\d{2}\sUhr[\s|]+)?([^|]{2,90})\|([^|]{0,90})\|/g;
  const seen = new Set();
  const out = [];
  let m;
  while ((m = re.exec(txt))) {
    const [, d, mo, y, h, mi, t1, t2] = m;
    const titel = t1.trim();
    if (!titel || /^(tickets?|details?|mehr|abgesagt)$/i.test(titel)) continue;
    const key = `${y}${mo}${d}${h}${mi}${titel}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const unter = t2.trim();
    out.push(mitPos({
      ort: 'LANXESS arena', stand: 'Lanxess Arena', titel, zusatz: /^(tickets?|details?)$/i.test(unter) ? '' : unter,
      beginn: iso(+y, +mo, +d, +h, +mi), dauer: dauerMin(titel + ' ' + unter), groesse: 'XL',
      art: /haie|handball|final4|eishockey|darts/i.test(titel) ? 'Sport' : 'Konzert/Show', abgesagt: /abgesagt|verlegt/i.test(unter)
    }, 'lanxess'));
  }
  return out;
}

async function messe() {
  const html = await holen('https://www.koelnmesse.de/aktuelle-termine/alle-messen/');
  const txt = nurText(html);
  // Muster:  "| PMRExpo | | | 24.11. - 26.11.2026, Köln |"
  const re = /\|\s*([^|]{2,70}?)\s*(?:\|\s*)+(\d{1,2})\.(\d{1,2})\.(?:(\d{4}))?\s*[-–]\s*(\d{1,2})\.(\d{1,2})\.(\d{4}),\s*Köln\b/g;
  const seen = new Set();
  const out = [];
  let m;
  while ((m = re.exec(txt))) {
    const [, name, d1, m1, y1, d2, m2, y2] = m;
    const bisY = +y2, vonY = y1 ? +y1 : (+m1 > +m2 ? bisY - 1 : bisY);
    const titel = name.trim();
    const key = titel + d1 + m1;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(mitPos({ ort: 'Koelnmesse', titel, von: iso(vonY, +m1, +d1).slice(0, 10), bis: iso(bisY, +m2, +d2).slice(0, 10) }, 'koelnmesse'));
  }
  return out;
}

// ---------- Fußball: Heimspiele aus OpenLigaDB (freier Spielplan-Dienst) ----------
const VEREINE = [
  { name: /^1\. FC Köln$/, ligen: ['bl1', 'bl2'], ort: 'RheinEnergieStadion', stand: 'Müngersdorf', groesse: 'XL' },
  { name: /Viktoria Köln/, ligen: ['bl3'], ort: 'Sportpark Höhenberg', stand: 'Höhenberg', groesse: 'M' }
];

async function fussball() {
  const now = new Date();
  const saison = now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
  const out = [];
  for (const v of VEREINE) {
    for (const liga of v.ligen) {
      let spiele;
      try {
        const res = await fetch(`https://api.openligadb.de/getmatchdata/${liga}/${saison}`, { headers: { 'User-Agent': UA } });
        if (!res.ok) continue;
        spiele = await res.json();
      } catch (e) { continue; }
      for (const m of spiele) {
        if (!v.name.test(m.team1.teamName)) continue;   // nur Heimspiele
        const d = new Date(m.matchDateTime);             // Ortszeit Köln ohne Zonenangabe
        out.push(mitPos({
          ort: v.ort, stand: v.stand, titel: `${m.team1.teamName} – ${m.team2.teamName}`, zusatz: 'Fußball',
          beginn: m.matchDateTime.slice(0, 16), dauer: 115, groesse: v.groesse, art: 'Fußball', abgesagt: false,
          _d: d
        }, v.ort === 'RheinEnergieStadion' ? 'rheinenergiestadion' : 'sportpark höhenberg'));
      }
    }
  }
  return out.map(({ _d, ...e }) => e);
}

// ---------- koeln.de Veranstaltungskalender: nur große Veranstaltungsorte ----------
// [Teil des Ortsnamens bei koeln.de, Größe, nächster Halteplatz in der App, Art]
// Größe: XL = Zehntausende, L = mehrere Tausend, M = etwa tausend Besucher (grobe Einteilung)
const ORTE = [
  ['tanzbrunnen', 'L', 'Tanzbrunnen', 'Veranstaltung'],   // „Theater am Tanzbrunnen“ unten als M
  ['theater am tanzbrunnen', 'M', 'Tanzbrunnen', 'Theater'],
  ['rheinenergiestadion', 'XL', 'Müngersdorf', 'Veranstaltung'],
  ['palladium', 'L', 'Schanzenstr.', 'Konzert'],
  ['e-werk', 'L', 'E-Werk', 'Konzert'],
  ['philharmonie', 'L', 'Philharmonie', 'Konzert'],
  ['carlswerk', 'L', 'Schanzenstr.', 'Konzert'],
  ['musical dome', 'L', 'Breslauer Platz', 'Musical'],
  ['halle tor 2', 'L', 'Halle Tor 2', 'Party'],
  ['bootshaus', 'L', 'Bootshaus', 'Party'],
  ['galopprennbahn', 'L', 'Scharnhorst', 'Pferderennen'],
  ['live music hall', 'M', 'Helios', 'Konzert'],
  ['gloria', 'M', 'Neumarkt', 'Konzert'],
  ['kantine', 'M', 'Kantine', 'Konzert'],
  ['essigfabrik', 'M', 'Drehbrücke', 'Konzert'],
  ['volksbühne', 'M', 'Rudolfplatz', 'Theater'],
  ['oper köln', 'M', 'Tanzbrunnen', 'Oper'],
  ['schauspiel köln', 'M', 'Schanzenstr.', 'Theater'],
  ['palastzelt', 'M', 'Schanzenstr.', 'Show'],
  ['gürzenich', 'M', 'Heumarkt', 'Veranstaltung'],
  ['sartory', 'M', 'Friesenplatz', 'Veranstaltung'],
  ['stadthalle mülheim', 'M', 'Wiener Platz', 'Veranstaltung'],
  ['flora', 'M', 'Zoo Bedarfs', 'Veranstaltung'],
  ['rhein roxy', 'M', 'Rhein Roxy', 'Party']
];
// Position jedes Veranstaltungsorts [Breite, Länge] – einmalig über OpenStreetMap ermittelt und geprüft.
// Die App sucht damit die nächsten Taxistände.
const POS = {
  'lanxess': [50.9385, 6.98288], 'koelnmesse': [50.94827, 6.98394], 'rheinenergiestadion': [50.93351, 6.87512],
  'sportpark höhenberg': [50.94511, 7.03047], 'tanzbrunnen': [50.94582, 6.97036], 'theater am tanzbrunnen': [50.94589, 6.97042],
  'palladium': [50.96898, 7.01682], 'e-werk': [50.96962, 7.0166], 'philharmonie': [50.94062, 6.96082],
  'carlswerk': [50.96494, 7.01254], 'musical dome': [50.94283, 6.96172], 'halle tor 2': [50.94877, 6.88013],
  'bootshaus': [50.9517, 6.98195], 'galopprennbahn': [50.98137, 6.95628], 'live music hall': [50.94932, 6.90948],
  'gloria': [50.93753, 6.9449], 'kantine': [50.99833, 6.93699], 'essigfabrik': [50.92471, 6.97808],
  'volksbühne': [50.93636, 6.9368], 'oper köln': [50.94607, 6.97351], 'schauspiel köln': [50.96644, 7.01339],
  'palastzelt': [50.9678, 7.0156],   // Palastzelt Schanzenviertel (Mülheim), ungefähr
  'gürzenich': [50.93662, 6.95882], 'sartory': [50.94085, 6.94306], 'stadthalle mülheim': [50.95988, 7.00502],
  'flora': [50.96018, 6.97071], 'rhein roxy': [50.89949, 6.98688]
};
const mitPos = (e, key) => (POS[key] ? Object.assign(e, { lat: POS[key][0], lon: POS[key][1] }) : e);

const DAUER = { Konzert: 165, Theater: 150, Oper: 180, Musical: 165, Show: 150, Party: 300, Pferderennen: 300, Veranstaltung: 180 };

async function koelnDe(von, bis) {
  const fmt = d => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}%20${pad(d.getHours())}:${pad(d.getMinutes())}:00`;
  let url = `https://www.koeln.de/wp-json/tribe/events/v1/events?per_page=50&start_date=${fmt(von)}&end_date=${fmt(bis)}`;
  const out = [];
  let seiten = 0;
  while (url && seiten < 40) {
    const res = await fetch(url, { headers: { 'User-Agent': UA } });
    if (!res.ok) throw new Error('koeln.de: HTTP ' + res.status);
    const j = await res.json();
    seiten++;
    for (const e of j.events || []) {
      const venue = entities((e.venue && e.venue.venue) || '');
      const v = venue.toLowerCase();
      if (v.includes('lanxess')) continue;   // kommt direkt von der Arena
      // längster passender Eintrag gewinnt („theater am tanzbrunnen“ vor „tanzbrunnen“)
      const hit = ORTE.filter(o => v.includes(o[0])).sort((a, b) => b[0].length - a[0].length)[0];
      if (!hit || e.all_day) continue;
      const titel = entities(e.title).trim();
      if (/workshop|führung|fuehrung|kurs\b|probe\b|einführung/i.test(titel)) continue;   // keine Menschenmengen
      const markt = /flohmarkt|trödel|markt\b/i.test(titel);
      const beginn = e.start_date.replace(' ', 'T').slice(0, 16);
      const start = new Date(beginn), ende = new Date(e.end_date.replace(' ', 'T'));
      const min = Math.round((ende - start) / 60000);
      out.push(mitPos({
        ort: venue, stand: hit[2], titel, zusatz: '', beginn,
        dauer: min >= 45 && min <= 600 ? min : DAUER[hit[3]] || 165,
        groesse: markt ? 'M' : hit[1], art: markt ? 'Markt' : hit[3], abgesagt: false
      }, hit[0]));
    }
    url = j.next_rest_url || null;
    if (url) await new Promise(r => setTimeout(r, 2100));   // koeln.de bittet um 2 Sekunden Abstand
  }
  return out;
}

const heute = new Date(); heute.setHours(0, 0, 0, 0);
const grenze = new Date(heute.getTime() + TAGE_VORAUS * 864e5);
const result = { stand: new Date().toISOString(), quellen: [], veranstaltungen: [], messen: [], fehler: [] };

try {
  const ev = (await arena()).filter(e => new Date(e.beginn) >= new Date(heute.getTime() - 864e5) && new Date(e.beginn) <= grenze);
  result.veranstaltungen.push(...ev);
  result.quellen.push('https://www.lanxess-arena.de/events-tickets/eventkalender');
} catch (e) { result.fehler.push('Arena: ' + e.message); }

try {
  const ms = (await messe()).filter(x => new Date(x.bis) >= heute && new Date(x.von) <= grenze);
  result.messen.push(...ms);
  result.quellen.push('https://www.koelnmesse.de/aktuelle-termine/alle-messen/');
} catch (e) { result.fehler.push('Messe: ' + e.message); }

try {
  const fb = (await fussball()).filter(e => new Date(e.beginn) >= new Date(heute.getTime() - 864e5) && new Date(e.beginn) <= grenze);
  result.veranstaltungen.push(...fb);
  result.quellen.push('https://www.openligadb.de/');
} catch (e) { result.fehler.push('Fußball: ' + e.message); }

try {
  // koeln.de nur für die nächsten 14 Tage (sonst sehr viele Seiten)
  const ev = await koelnDe(new Date(heute.getTime() - 864e5), new Date(heute.getTime() + 14 * 864e5));
  result.veranstaltungen.push(...ev);
  result.quellen.push('https://www.koeln.de/veranstaltungen/');
} catch (e) { result.fehler.push('koeln.de: ' + e.message); }

// Doppelte Einträge (gleicher Ort, gleiche Zeit, gleicher Titel) entfernen
const seen = new Set();
result.veranstaltungen = result.veranstaltungen.filter(e => {
  const k = e.stand + e.beginn + e.titel.toLowerCase();
  if (seen.has(k)) return false;
  seen.add(k);
  return true;
});
result.veranstaltungen.sort((a, b) => a.beginn.localeCompare(b.beginn));
result.messen.sort((a, b) => a.von.localeCompare(b.von));

// Nichts gefunden: alte Datei nicht mit einer leeren überschreiben
if (!result.veranstaltungen.length && !result.messen.length && fs.existsSync(OUT)) {
  console.error('Keine Termine gefunden – radar.json bleibt unverändert.', result.fehler.join('; '));
  process.exit(1);
}
fs.writeFileSync(OUT, JSON.stringify(result, null, 1) + '\n');
console.log(`radar.json: ${result.veranstaltungen.length} Veranstaltungen, ${result.messen.length} Messen` +
  (result.fehler.length ? ' · Fehler: ' + result.fehler.join('; ') : ''));
