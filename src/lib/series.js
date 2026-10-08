import { addDays, weekday, weekStart, diffDays, rangeDays, WEEKDAYS } from './dates';
import { isWorkday } from './holidays';

export const SERIES_INTERVALS = [
  { id: 1, label: 'jede Woche' },
  { id: 2, label: 'alle 2 Wochen' },
  { id: 3, label: 'alle 3 Wochen' },
  { id: 4, label: 'alle 4 Wochen' },
];

export const SERIES_WEEKDAYS = [1, 2, 3, 4, 5]; // Mo–Fr
export const SERIES_MAX_DAYS = 366;
export const SERIES_MAX_OCCURRENCES = 260;

/**
 * Termine einer wöchentlichen Serie.
 * weekdays: 1 = Mo … 5 = Fr. interval: Wochenabstand ab der Startwoche.
 * Wochenenden und Hamburger Feiertage werden übersprungen.
 */
export function seriesDates(start, until, weekdays, interval = 1) {
  if (!start || !until || until < start || !weekdays?.length) return [];
  const startWeek = weekStart(start);
  return rangeDays(start, until).filter((d) => {
    if (!weekdays.includes(weekday(d))) return false;
    const weekIndex = Math.floor(diffDays(startWeek, weekStart(d)) / 7);
    return weekIndex % interval === 0 && isWorkday(d);
  });
}

export function defaultSeriesEnd(start) {
  return addDays(start, 182);
}

export function weekdayNames(days) {
  return [...days].sort().map((d) => WEEKDAYS[d]).join(', ');
}
