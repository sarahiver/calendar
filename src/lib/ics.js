import { addDays } from './dates';
import { typeById, statusLabel } from './constants';

// Erzeugt eine .ics-Datei (iCalendar) für einen Eintrag – Outlook öffnet sie als Termin.

const esc = (s) => String(s || '').replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const compact = (iso) => iso.replace(/-/g, '');

function stamp() {
  return new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

// Zeilen nach RFC 5545 auf 75 Zeichen umbrechen
function fold(line) {
  const out = [];
  let rest = line;
  while (rest.length > 74) {
    out.push(rest.slice(0, 74));
    rest = ' ' + rest.slice(74);
  }
  out.push(rest);
  return out.join('\r\n');
}

export function buildIcs({ entry, personName, deputyName, isOwn, title }) {
  const type = typeById(entry.type);
  const summary = `${personName} – ${type.label}${entry.status !== 'genehmigt' ? ` (${statusLabel(entry.status)})` : ''}`;
  const description = [
    `${type.label}, Status: ${statusLabel(entry.status)}`,
    deputyName ? `Vertretung: ${deputyName}` : null,
    entry.note ? `Notiz: ${entry.note}` : null,
    `Quelle: ${title}`,
  ].filter(Boolean).join('\n');

  let timing;
  if (entry.half_day) {
    // Halbe Tage als Uhrzeit (ortsgebunden, Outlook nutzt die lokale Zeitzone)
    const d = compact(entry.date_from);
    const [start, end] = entry.half_day === 'vormittags' ? ['080000', '120000'] : ['120000', '160000'];
    timing = [`DTSTART:${d}T${start}`, `DTEND:${d}T${end}`];
  } else {
    timing = [`DTSTART;VALUE=DATE:${compact(entry.date_from)}`, `DTEND;VALUE=DATE:${compact(addDays(entry.date_to, 1))}`];
  }

  // Eigene Abwesenheit = "Abwesend", Abwesenheit anderer = "Frei" (blockiert den eigenen Kalender nicht)
  const busy = !isOwn ? 'FREE' : entry.type === 'homeoffice' ? 'WORKINGELSEWHERE' : 'OOF';

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Abwesenheitskalender//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${entry.id}@abwesenheitskalender`,
    `DTSTAMP:${stamp()}`,
    ...timing,
    `SUMMARY:${esc(summary)}`,
    `DESCRIPTION:${esc(description)}`,
    `TRANSP:${isOwn ? 'OPAQUE' : 'TRANSPARENT'}`,
    `X-MICROSOFT-CDO-BUSYSTATUS:${busy}`,
    `X-MICROSOFT-CDO-ALLDAYEVENT:${entry.half_day ? 'FALSE' : 'TRUE'}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ];
  return lines.map(fold).join('\r\n') + '\r\n';
}

export function downloadIcs(filename, content) {
  const blob = new Blob([content], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function icsFilename(personName, entry) {
  const safe = personName.replace(/[^\p{L}\p{N}]+/gu, '-').replace(/^-|-$/g, '');
  return `Abwesenheit-${safe}-${entry.date_from}.ics`;
}
