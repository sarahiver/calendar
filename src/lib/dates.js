// Alle Daten als ISO-Strings 'YYYY-MM-DD', gerechnet in UTC (keine Zeitzonenfehler).

export const pad = (n) => String(n).padStart(2, '0');

export const MONTHS = [
  'Januar', 'Februar', 'März', 'April', 'Mai', 'Juni',
  'Juli', 'August', 'September', 'Oktober', 'November', 'Dezember',
];
export const WEEKDAYS = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];

export function toISO(d) {
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

export function fromISO(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
}

export function isValidISO(s) {
  return typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && toISO(fromISO(s)) === s;
}

export function addDays(s, n) {
  const d = fromISO(s);
  d.setUTCDate(d.getUTCDate() + n);
  return toISO(d);
}

export function diffDays(a, b) {
  return Math.round((fromISO(b) - fromISO(a)) / 86400000);
}

// Heute in lokaler Zeit des Browsers bzw. Servers
export function todayISO() {
  const n = new Date();
  return `${n.getFullYear()}-${pad(n.getMonth() + 1)}-${pad(n.getDate())}`;
}

export const weekday = (s) => fromISO(s).getUTCDay();
export const isWeekend = (s) => {
  const d = weekday(s);
  return d === 0 || d === 6;
};

export function monthStart(y, m) {
  return `${y}-${pad(m + 1)}-01`;
}

export function monthEnd(y, m) {
  return toISO(new Date(Date.UTC(y, m + 1, 0)));
}

export function rangeDays(from, to) {
  const out = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

export function monthDays(y, m) {
  return rangeDays(monthStart(y, m), monthEnd(y, m));
}

// Montag der Woche
export function weekStart(s) {
  const wd = weekday(s);
  return addDays(s, wd === 0 ? -6 : 1 - wd);
}

// Sichtbarer Bereich der Monatsansicht: volle Wochen Mo–So
export function monthGridRange(y, m) {
  const from = weekStart(monthStart(y, m));
  const last = monthEnd(y, m);
  const to = addDays(weekStart(last), 6);
  return { from, to };
}

export function formatDate(s, withWeekday = false) {
  const [y, m, d] = s.split('-');
  const base = `${d}.${m}.${y}`;
  return withWeekday ? `${WEEKDAYS[weekday(s)]}, ${base}` : base;
}

export function formatRange(from, to) {
  if (from === to) return formatDate(from, true);
  return `${formatDate(from)} – ${formatDate(to)}`;
}
