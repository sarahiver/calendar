'use client';

import { useMemo } from 'react';
import { WEEKDAYS, weekday, isWeekend, todayISO, formatRange } from '@/lib/dates';
import { holidayName } from '@/lib/holidays';
import { typeById, statusLabel } from '@/lib/constants';

export default function TeamView({ people, entries, days, canCreateFor, onOpen, onNew }) {
  const today = todayISO();
  const first = days[0];
  const last = days[days.length - 1];

  // Zelle "personId|tag" -> Einträge
  const cells = useMemo(() => {
    const map = new Map();
    for (const e of entries) {
      const from = e.date_from < first ? first : e.date_from;
      const to = e.date_to > last ? last : e.date_to;
      for (const d of days) {
        if (d < from || d > to) continue;
        const key = `${e.person_id}|${d}`;
        if (!map.has(key)) map.set(key, []);
        map.get(key).push(e);
      }
    }
    return map;
  }, [entries, days, first, last]);

  const absentCount = (d) => {
    const ids = new Set();
    for (const p of people) {
      const list = cells.get(`${p.id}|${d}`);
      if (list?.some((e) => e.status !== 'abgelehnt')) ids.add(p.id);
    }
    return ids.size;
  };

  const dayClass = (d) =>
    [isWeekend(d) && 'weekend', holidayName(d) && 'holiday', d === today && 'today'].filter(Boolean).join(' ');

  if (!people.length) return <p className="empty">Noch keine Personen angelegt.</p>;

  return (
    <div className="team-scroll">
      <table className="team">
        <thead>
          <tr>
            <th className="name-col">Person</th>
            {days.map((d) => (
              <th key={d} className={dayClass(d)} title={holidayName(d) || undefined}>
                <span className="wd">{WEEKDAYS[weekday(d)]}</span>
                <span className="dn">{Number(d.slice(8))}</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {people.map((p) => (
            <tr key={p.id}>
              <th className="name-col" title={p.name}>
                <span className="pname">{p.name}</span>
              </th>
              {days.map((d) => {
                const list = cells.get(`${p.id}|${d}`) || [];
                const clickable = !list.length && canCreateFor(p.id);
                return (
                  <td
                    key={d}
                    className={`${dayClass(d)}${clickable ? ' addable' : ''}`}
                    onClick={clickable ? () => onNew(p.id, d) : undefined}
                    title={clickable ? 'Eintrag anlegen' : holidayName(d) || undefined}
                  >
                    {list.map((e) => {
                      const t = typeById(e.type);
                      const startHere = d === e.date_from || d === first;
                      return (
                        <button
                          key={e.id}
                          className={`bar st-${e.status} half-${e.half_day || 'full'}`}
                          style={{ '--c': t.color }}
                          title={`${p.name} · ${t.label} · ${statusLabel(e.status)}\n${formatRange(e.date_from, e.date_to)}${e.half_day ? ` (${e.half_day})` : ''}`}
                          onClick={(ev) => {
                            ev.stopPropagation();
                            onOpen(e);
                          }}
                        >
                          {startHere ? t.short : ''}
                        </button>
                      );
                    })}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th className="name-col">Abwesend</th>
            {days.map((d) => {
              const n = absentCount(d);
              return (
                <td key={d} className={dayClass(d)}>
                  {n > 0 && !isWeekend(d) && !holidayName(d) ? n : ''}
                </td>
              );
            })}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
