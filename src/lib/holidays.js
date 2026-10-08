import { addDays, pad, rangeDays, isWeekend } from './dates';

// Ostersonntag (Gauß / anonymer gregorianischer Algorithmus)
function easterSunday(y) {
  const a = y % 19;
  const b = Math.floor(y / 100);
  const c = y % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return `${y}-${pad(month)}-${pad(day)}`;
}

const cache = new Map();

// Gesetzliche Feiertage in Hamburg
export function hamburgHolidays(y) {
  if (cache.has(y)) return cache.get(y);
  const easter = easterSunday(y);
  const list = {
    [`${y}-01-01`]: 'Neujahr',
    [addDays(easter, -2)]: 'Karfreitag',
    [addDays(easter, 1)]: 'Ostermontag',
    [`${y}-05-01`]: 'Tag der Arbeit',
    [addDays(easter, 39)]: 'Christi Himmelfahrt',
    [addDays(easter, 50)]: 'Pfingstmontag',
    [`${y}-10-03`]: 'Tag der Deutschen Einheit',
    [`${y}-12-25`]: '1. Weihnachtstag',
    [`${y}-12-26`]: '2. Weihnachtstag',
  };
  if (y >= 2018) list[`${y}-10-31`] = 'Reformationstag';
  cache.set(y, list);
  return list;
}

export function holidayName(iso) {
  return hamburgHolidays(Number(iso.slice(0, 4)))[iso] || null;
}

export const isWorkday = (iso) => !isWeekend(iso) && !holidayName(iso);

// Arbeitstage einer Abwesenheit (Wochenenden und Feiertage zählen nicht)
export function countWorkdays(from, to, halfDay) {
  if (!from || !to || to < from) return 0;
  const n = rangeDays(from, to).filter(isWorkday).length;
  return halfDay && n === 1 ? 0.5 : n;
}
