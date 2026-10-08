'use client';

import { useMemo } from 'react';
import { MONTHS, monthGridRange, rangeDays, todayISO, isWeekend, pad } from '@/lib/dates';
import { holidayName, countWorkdays } from '@/lib/holidays';
import { typeById, statusLabel } from '@/lib/constants';

const HEAD = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'];
const MAX_STRIPES = 4;

function fmt(n) {
  return n ? n.toLocaleString('de-DE') : '–';
}

export default function YearView({ year, people, entries, colorOf, onPickMonth }) {
  const today = todayISO();
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const personById = useMemo(() => new Map(people.map((p) => [p.id, p])), [people]);
  const order = useMemo(() => new Map(people.map((p, i) => [p.id, i])), [people]);

  // Tag -> Einträge (nur Arbeitstage, sortiert nach Personen-Reihenfolge)
  const byDay = useMemo(() => {
    const map = new Map();
    for (const e of entries) {
      const from = e.date_from < yearStart ? yearStart : e.date_from;
      const to = e.date_to > yearEnd ? yearEnd : e.date_to;
      for (const d of rangeDays(from, to)) {
        if (isWeekend(d) || holidayName(d)) continue;
        if (!map.has(d)) map.set(d, []);
        map.get(d).push(e);
      }
    }
    for (const list of map.values()) list.sort((a, b) => (order.get(a.person_id) ?? 0) - (order.get(b.person_id) ?? 0));
    return map;
  }, [entries, yearStart, yearEnd, order]);

  // Jahressumme je Person (Arbeitstage, auf das Jahr begrenzt)
  const summary = useMemo(() => {
    const rows = new Map(people.map((p) => [p.id, { genehmigt: 0, beantragt: 0, geplant: 0, sonstige: 0, homeoffice: 0 }]));
    for (const e of entries) {
      const row = rows.get(e.person_id);
      if (!row || e.status === 'abgelehnt') continue;
      const from = e.date_from < yearStart ? yearStart : e.date_from;
      const to = e.date_to > yearEnd ? yearEnd : e.date_to;
      const days = countWorkdays(from, to, e.half_day);
      if (e.type === 'urlaub') row[e.status] += days;
      else if (e.type === 'homeoffice') row.homeoffice += days;
      else row.sonstige += days;
    }
    return rows;
  }, [people, entries, yearStart, yearEnd]);

  return (
    <div className="yearview">
      <div className="year-grid">
        {MONTHS.map((name, m) => {
          const { from, to } = monthGridRange(year, m);
          const prefix = `${year}-${pad(m + 1)}`;
          return (
            <section key={name} className="mini">
              <button className="mini-title" onClick={() => onPickMonth(m)} title="Monat in Teamansicht öffnen">
                {name}
              </button>
              <div className="mini-grid">
                {HEAD.map((h) => (
                  <span key={h} className="mini-head">{h}</span>
                ))}
                {rangeDays(from, to).map((d) => {
                  if (!d.startsWith(prefix)) return <span key={d} className="mini-day mini-empty" />;
                  const hol = holidayName(d);
                  const list = byDay.get(d) || [];
                  const cls = [
                    'mini-day',
                    isWeekend(d) && 'weekend',
                    hol && 'holiday',
                    d === today && 'today',
                  ].filter(Boolean).join(' ');
                  const tip = [
                    hol,
                    ...list.map((e) => {
                      const p = personById.get(e.person_id);
                      return `${p?.name}: ${typeById(e.type).label} (${statusLabel(e.status)})${e.half_day ? ' ½' : ''}`;
                    }),
                  ].filter(Boolean).join('\n');
                  return (
                    <span key={d} className={cls} title={tip || undefined} onClick={() => onPickMonth(m)}>
                      <span className="mini-dn">{Number(d.slice(8))}</span>
                      {list.length > 0 && (
                        <span className="mini-stripes">
                          {list.slice(0, MAX_STRIPES).map((e) => (
                            <i key={e.id} className={`ms ms-${e.status}`} style={{ '--c': colorOf(e.person_id) }} />
                          ))}
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <section className="year-summary">
        <h3>Urlaubstage {year}</h3>
        <div className="list-scroll">
          <table className="list static">
            <thead>
              <tr>
                <th>Person</th>
                <th className="num">Urlaub genehmigt</th>
                <th className="num">beantragt</th>
                <th className="num">geplant</th>
                <th className="num">Sonstige Abwesenheit</th>
                <th className="num">Homeoffice</th>
              </tr>
            </thead>
            <tbody>
              {people.map((p) => {
                const r = summary.get(p.id);
                return (
                  <tr key={p.id}>
                    <td>
                      <span className="dot" style={{ '--c': colorOf(p.id) }} />
                      {p.name}
                    </td>
                    <td className="num">{fmt(r.genehmigt)}</td>
                    <td className="num">{fmt(r.beantragt)}</td>
                    <td className="num">{fmt(r.geplant)}</td>
                    <td className="num">{fmt(r.sonstige)}</td>
                    <td className="num">{fmt(r.homeoffice)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="hint">Gezählt werden Arbeitstage ohne Wochenenden und Hamburger Feiertage.</p>
      </section>
    </div>
  );
}
