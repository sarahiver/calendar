'use client';

import { useMemo } from 'react';
import { formatRange, weekday } from '@/lib/dates';
import { countWorkdays } from '@/lib/holidays';
import { typeById, statusLabel } from '@/lib/constants';
import { weekdayNames } from '@/lib/series';

// Serientermine (gleiche Serie + gleicher Status) zu einer Zeile zusammenfassen
function groupRows(entries) {
  const rows = [];
  const bySeries = new Map();
  for (const e of entries) {
    if (!e.series_id) {
      rows.push({ key: e.id, first: e, last: e, count: 1, days: countWorkdays(e.date_from, e.date_to, e.half_day) });
      continue;
    }
    const key = `${e.series_id}|${e.status}`;
    let row = bySeries.get(key);
    if (!row) {
      row = { key, first: e, last: e, count: 0, days: 0, weekdays: new Set(), series: true };
      bySeries.set(key, row);
      rows.push(row);
    }
    row.count += 1;
    row.last = e;
    row.days += countWorkdays(e.date_from, e.date_to, e.half_day);
    row.weekdays.add(weekday(e.date_from));
  }
  return rows;
}

function Table({ entries, personById, colorOf, onOpen, onStatus }) {
  const rows = useMemo(() => groupRows(entries), [entries]);
  return (
    <div className="list-scroll">
      <table className="list">
        <thead>
          <tr>
            <th>Person</th>
            <th>Zeitraum</th>
            <th className="num">Arbeitstage</th>
            <th>Art</th>
            <th>Status</th>
            <th>Vertretung</th>
            {onStatus && <th />}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => {
            const e = r.first;
            const t = typeById(e.type);
            const p = personById.get(e.person_id);
            const deputy = e.deputy_id ? personById.get(e.deputy_id) : null;
            const scope = r.series ? 'following' : 'single';
            return (
              <tr key={r.key} onClick={() => onOpen(e)}>
                <td>
                  <span className="dot" style={{ '--c': colorOf(e.person_id) }} />
                  {p?.name || '–'}
                </td>
                <td className="nowrap">
                  {r.series ? (
                    <>
                      <span className="series-badge">↻ {weekdayNames(r.weekdays)}</span>{' '}
                      {formatRange(r.first.date_from, r.last.date_to)} · {r.count} Termine
                    </>
                  ) : (
                    <>
                      {formatRange(e.date_from, e.date_to)}
                      {e.half_day ? ` (${e.half_day})` : ''}
                    </>
                  )}
                </td>
                <td className="num">{r.days.toLocaleString('de-DE')}</td>
                <td>{t.label}</td>
                <td>
                  <span className={`badge b-${e.status}`}>{statusLabel(e.status)}</span>
                </td>
                <td>{deputy?.name || ''}</td>
                {onStatus && (
                  <td className="actions" onClick={(ev) => ev.stopPropagation()}>
                    <button className="btn small ok" onClick={() => onStatus(e.id, 'genehmigt', scope)}>
                      {r.series ? 'Serie genehmigen' : 'Genehmigen'}
                    </button>
                    <button className="btn small danger" onClick={() => onStatus(e.id, 'abgelehnt', scope)}>Ablehnen</button>
                  </td>
                )}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export default function ListView({ people, entries, pending, colorOf, onOpen, onStatus }) {
  const personById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const sorted = useMemo(
    () => [...entries].sort((a, b) => a.date_from.localeCompare(b.date_from)),
    [entries]
  );

  return (
    <div className="listview">
      {pending.length > 0 && (
        <section className="pending">
          <h3>Offene Anträge</h3>
          <Table entries={pending} personById={personById} colorOf={colorOf} onOpen={onOpen} onStatus={onStatus} />
        </section>
      )}
      <section>
        {pending.length > 0 && <h3>Alle Einträge im Zeitraum</h3>}
        {sorted.length ? (
          <Table entries={sorted} personById={personById} colorOf={colorOf} onOpen={onOpen} />
        ) : (
          <p className="empty">Keine Einträge in diesem Zeitraum.</p>
        )}
      </section>
    </div>
  );
}
