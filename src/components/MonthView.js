'use client';

import { useMemo } from 'react';
import { monthGridRange, rangeDays, todayISO, isWeekend, formatRange } from '@/lib/dates';
import { holidayName } from '@/lib/holidays';
import { typeById, statusLabel } from '@/lib/constants';

const HEAD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MAX_CHIPS = 5;

export default function MonthView({ cursor, people, entries, colorOf, loggedIn, onOpen, onNew }) {
  const today = todayISO();
  const { from, to } = monthGridRange(cursor.y, cursor.m);
  const days = rangeDays(from, to);
  const monthPrefix = `${cursor.y}-${String(cursor.m + 1).padStart(2, '0')}`;

  const personById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const order = useMemo(() => new Map(people.map((p, i) => [p.id, i])), [people]);

  const byDay = (d) =>
    entries
      .filter((e) => e.date_from <= d && e.date_to >= d)
      .sort((a, b) => (order.get(a.person_id) ?? 0) - (order.get(b.person_id) ?? 0));

  return (
    <div className="month">
      {HEAD.map((h) => (
        <div key={h} className="month-head">{h}</div>
      ))}
      {days.map((d) => {
        const hol = holidayName(d);
        // An Wochenenden und Feiertagen keine Einträge anzeigen (dort arbeitet ohnehin niemand)
        const list = isWeekend(d) || hol ? [] : byDay(d);
        const cls = [
          'month-day',
          !d.startsWith(monthPrefix) && 'outside',
          isWeekend(d) && 'weekend',
          hol && 'holiday',
          d === today && 'today',
          loggedIn && 'addable',
        ].filter(Boolean).join(' ');
        return (
          <div key={d} className={cls} onClick={loggedIn ? () => onNew(d) : undefined}>
            <div className="month-day-head">
              <span className="dn">{Number(d.slice(8))}</span>
              {hol && <span className="hol">{hol}</span>}
            </div>
            {list.slice(0, MAX_CHIPS).map((e) => {
              const t = typeById(e.type);
              const p = personById.get(e.person_id);
              return (
                <button
                  key={e.id}
                  className={`chip st-${e.status}`}
                  style={{ '--c': colorOf(e.person_id) }}
                  title={`${p?.name} · ${t.label} · ${statusLabel(e.status)}\n${formatRange(e.date_from, e.date_to)}`}
                  onClick={(ev) => {
                    ev.stopPropagation();
                    onOpen(e);
                  }}
                >
                  {p?.short || p?.name} · {t.short}
                  {e.half_day ? ' ½' : ''}
                </button>
              );
            })}
            {list.length > MAX_CHIPS && <span className="more">+{list.length - MAX_CHIPS} weitere</span>}
          </div>
        );
      })}
    </div>
  );
}
