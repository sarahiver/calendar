'use client';

import { useMemo } from 'react';
import { formatRange } from '@/lib/dates';
import { countWorkdays } from '@/lib/holidays';
import { typeById, statusLabel } from '@/lib/constants';

function Rows({ entries, personById, colorOf, onOpen, onStatus }) {
  return entries.map((e) => {
    const t = typeById(e.type);
    const p = personById.get(e.person_id);
    const deputy = e.deputy_id ? personById.get(e.deputy_id) : null;
    return (
      <tr key={e.id} onClick={() => onOpen(e)}>
        <td>
          <span className="dot" style={{ '--c': colorOf(e.person_id) }} />
          {p?.name || '–'}
        </td>
        <td className="nowrap">
          {formatRange(e.date_from, e.date_to)}
          {e.half_day ? ` (${e.half_day})` : ''}
        </td>
        <td className="num">{countWorkdays(e.date_from, e.date_to, e.half_day).toLocaleString('de-DE')}</td>
        <td>{t.label}</td>
        <td>
          <span className={`badge b-${e.status}`}>{statusLabel(e.status)}</span>
        </td>
        <td>{deputy?.name || ''}</td>
        {onStatus && (
          <td className="actions" onClick={(ev) => ev.stopPropagation()}>
            <button className="btn small ok" onClick={() => onStatus(e.id, 'genehmigt')}>Genehmigen</button>
            <button className="btn small danger" onClick={() => onStatus(e.id, 'abgelehnt')}>Ablehnen</button>
          </td>
        )}
      </tr>
    );
  });
}

function Table({ entries, personById, colorOf, onOpen, onStatus }) {
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
          <Rows entries={entries} personById={personById} colorOf={colorOf} onOpen={onOpen} onStatus={onStatus} />
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
          <h3>Offene Anträge ({pending.length})</h3>
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
