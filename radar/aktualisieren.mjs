// Holt Veranstaltungen (LANXESS arena) und Messen (Koelnmesse) von den offiziellen Webseiten
// und schreibt sie nach radar.json, das die App lädt.
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
    out.push({
      ort: 'LANXESS arena', stand: 'Lanxess Arena', titel, zusatz: /^(tickets?|details?)$/i.test(unter) ? '' : unter,
      beginn: iso(+y, +mo, +d, +h, +mi), dauer: dauerMin(titel + ' ' + unter), abgesagt: /abgesagt|verlegt/i.test(unter)
    });
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
    out.push({ ort: 'Koelnmesse', titel, von: iso(vonY, +m1, +d1).slice(0, 10), bis: iso(bisY, +m2, +d2).slice(0, 10) });
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
