'use client';

import { useMemo, useState } from 'react';
import Modal from './Modal';
import { TYPES, STATUSES, HALF_DAYS, SELF_STATUSES, typeById, statusLabel, isApprover } from '@/lib/constants';
import { formatRange, weekday, WEEKDAYS } from '@/lib/dates';
import { countWorkdays } from '@/lib/holidays';
import { buildIcs, downloadIcs, icsFilename } from '@/lib/ics';
import { seriesDates, defaultSeriesEnd, SERIES_INTERVALS, SERIES_WEEKDAYS } from '@/lib/series';

const SCOPES = [
  { id: 'single', label: 'Nur dieser Termin' },
  { id: 'following', label: 'Dieser und alle folgenden' },
  { id: 'series', label: 'Ganze Serie' },
];

export default function EntryDialog({ mode, entry, people, me, onClose, onSave, onDelete, onStatus }) {
  const [form, setForm] = useState({
    person_id: entry.person_id,
    type: entry.type || 'urlaub',
    status: entry.status || 'geplant',
    date_from: entry.date_from,
    date_to: entry.date_to,
    half_day: entry.half_day || '',
    deputy_id: entry.deputy_id || '',
    note: entry.note || '',
  });
  const startWd = weekday(entry.date_from);
  const [repeat, setRepeat] = useState({
    on: false,
    weekdays: SERIES_WEEKDAYS.includes(startWd) ? [startWd] : [5],
    interval: 1,
    until: defaultSeriesEnd(entry.date_from),
  });
  const [scope, setScope] = useState('single');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const approver = isApprover(me);
  const isSeries = !!entry.series_id;
  const personName = (id) => people.find((p) => p.id === id)?.name || '–';

  const occurrences = useMemo(
    () => (repeat.on ? seriesDates(form.date_from, repeat.until, repeat.weekdays, repeat.interval) : []),
    [repeat, form.date_from]
  );

  function exportOutlook() {
    const name = personName(entry.person_id);
    const content = buildIcs({
      entry,
      personName: name,
      deputyName: entry.deputy_id ? personName(entry.deputy_id) : null,
      isOwn: !!me && me.id === entry.person_id,
      title: document.title,
    });
    downloadIcs(icsFilename(name, entry), content);
  }

  const outlookButton = (
    <button type="button" className="btn" onClick={exportOutlook} title="Als .ics-Datei herunterladen und in Outlook öffnen">
      In Outlook übernehmen
    </button>
  );

  const seriesBadge = isSeries && <span className="series-badge" title="Teil einer Serie">↻ Serie</span>;

  if (mode === 'view') {
    const t = typeById(entry.type);
    return (
      <Modal
        title="Abwesenheit"
        onClose={onClose}
        footer={
          <>
            {outlookButton}
            <span className="spacer" />
            <button className="btn" onClick={onClose}>Schließen</button>
          </>
        }
      >
        <dl className="details">
          <dt>Person</dt>
          <dd>{personName(entry.person_id)}</dd>
          <dt>Zeitraum</dt>
          <dd>
            {formatRange(entry.date_from, entry.date_to)}
            {entry.half_day ? ` (${entry.half_day})` : ''} {seriesBadge}
          </dd>
          <dt>Arbeitstage</dt>
          <dd>{countWorkdays(entry.date_from, entry.date_to, entry.half_day).toLocaleString('de-DE')}</dd>
          <dt>Art</dt>
          <dd>{t.label}</dd>
          <dt>Status</dt>
          <dd>
            <span className={`badge b-${entry.status}`}>{statusLabel(entry.status)}</span>
          </dd>
          {entry.deputy_id && (
            <>
              <dt>Vertretung</dt>
              <dd>{personName(entry.deputy_id)}</dd>
            </>
          )}
          {entry.note && (
            <>
              <dt>Notiz</dt>
              <dd className="pre">{entry.note}</dd>
            </>
          )}
        </dl>
      </Modal>
    );
  }

  const set = (key) => (e) => {
    const value = e.target.value;
    setForm((f) => {
      const next = { ...f, [key]: value };
      if (key === 'date_from' && (!next.date_to || next.date_to < value)) next.date_to = value;
      if (next.date_from !== next.date_to && !repeat.on) next.half_day = '';
      if (next.deputy_id === next.person_id) next.deputy_id = '';
      return next;
    });
  };

  const toggleWeekday = (d) =>
    setRepeat((r) => ({
      ...r,
      weekdays: r.weekdays.includes(d) ? r.weekdays.filter((x) => x !== d) : [...r.weekdays, d].sort(),
    }));

  const seriesScope = mode === 'edit' && isSeries && scope !== 'single';
  const singleDay = repeat.on || form.date_from === form.date_to;
  const personOptions = approver ? people : people.filter((p) => p.id === me?.id);
  const statusOptions = approver
    ? STATUSES
    : STATUSES.filter((s) => SELF_STATUSES.includes(s.id) || s.id === entry.status);
  const days = repeat.on ? null : countWorkdays(form.date_from, form.date_to, form.half_day);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const body = { ...form, half_day: form.half_day || null, deputy_id: form.deputy_id || null };
    if (mode === 'new' && repeat.on) {
      if (!occurrences.length) {
        setError('Die Serie ergibt keinen Termin. Bitte Wochentage und Enddatum prüfen.');
        setBusy(false);
        return;
      }
      body.date_to = body.date_from;
      body.repeat = { weekdays: repeat.weekdays, interval: repeat.interval, until: repeat.until };
    }
    if (mode === 'edit' && isSeries) body.scope = scope;
    try {
      await onSave(body, mode === 'edit' ? entry.id : null);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  async function remove(deleteScope) {
    setBusy(true);
    try {
      await onDelete(entry.id, deleteScope);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  const deleteControls =
    mode !== 'edit' ? null : confirmDelete ? (
      <span className="confirm">
        Löschen:
        {isSeries ? (
          <>
            <button type="button" className="btn small danger" disabled={busy} onClick={() => remove('single')}>Nur diesen</button>
            <button type="button" className="btn small danger" disabled={busy} onClick={() => remove('following')}>Ab hier</button>
            <button type="button" className="btn small danger" disabled={busy} onClick={() => remove('series')}>Ganze Serie</button>
          </>
        ) : (
          <button type="button" className="btn small danger" disabled={busy} onClick={() => remove('single')}>Ja, löschen</button>
        )}
        <button type="button" className="btn small" onClick={() => setConfirmDelete(false)}>Abbrechen</button>
      </span>
    ) : (
      <button type="button" className="btn ghost danger-text" onClick={() => setConfirmDelete(true)}>Löschen</button>
    );

  const footer = (
    <>
      {deleteControls}
      {mode === 'edit' && !confirmDelete && outlookButton}
      <span className="spacer" />
      {mode === 'edit' && approver && entry.status === 'beantragt' && !confirmDelete && (
        <>
          <button type="button" className="btn ok" disabled={busy} onClick={() => onStatus(entry.id, 'genehmigt', scope)}>
            Genehmigen
          </button>
          <button type="button" className="btn danger" disabled={busy} onClick={() => onStatus(entry.id, 'abgelehnt', scope)}>
            Ablehnen
          </button>
        </>
      )}
      <button type="button" className="btn" onClick={onClose}>Abbrechen</button>
      <button type="submit" form="entry-form" className="btn primary" disabled={busy}>
        {busy ? 'Speichert …' : repeat.on ? `Serie anlegen (${occurrences.length})` : 'Speichern'}
      </button>
    </>
  );

  return (
    <Modal title={mode === 'new' ? 'Neue Abwesenheit' : 'Abwesenheit bearbeiten'} onClose={onClose} footer={footer}>
      <form id="entry-form" className="form" onSubmit={submit}>
        {mode === 'edit' && isSeries && (
          <div className="series-scope">
            <span className="form-label">↻ Dieser Termin gehört zu einer Serie. Änderungen gelten für:</span>
            <div className="seg">
              {SCOPES.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className={scope === s.id ? 'seg-btn active' : 'seg-btn'}
                  onClick={() => setScope(s.id)}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {seriesScope && <span className="hint">Datum und Person bleiben bei Serienänderungen unverändert.</span>}
          </div>
        )}

        <label>
          Person
          <select value={form.person_id} onChange={set('person_id')} disabled={!approver || seriesScope} required>
            {personOptions.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </label>

        <label>
          Art
          <select value={form.type} onChange={set('type')}>
            {TYPES.map((t) => (
              <option key={t.id} value={t.id}>{t.label}</option>
            ))}
          </select>
        </label>

        <div className="row">
          <label>
            {repeat.on ? 'Beginn der Serie' : 'Von'}
            <input type="date" value={form.date_from} onChange={set('date_from')} disabled={seriesScope} required />
          </label>
          {repeat.on ? (
            <label>
              Serie endet am
              <input
                type="date"
                value={repeat.until}
                min={form.date_from}
                onChange={(e) => setRepeat((r) => ({ ...r, until: e.target.value }))}
                required
              />
            </label>
          ) : (
            <label>
              Bis
              <input type="date" value={form.date_to} min={form.date_from} onChange={set('date_to')} disabled={seriesScope} required />
            </label>
          )}
        </div>

        {mode === 'new' && (
          <div className="repeat-box">
            <label className="check">
              <input
                type="checkbox"
                checked={repeat.on}
                onChange={(e) => setRepeat((r) => ({ ...r, on: e.target.checked }))}
              />
              Wiederholen (Serientermin, z. B. jeden Freitag)
            </label>
            {repeat.on && (
              <>
                <div className="repeat-row">
                  <div className="seg">
                    {SERIES_WEEKDAYS.map((d) => (
                      <button
                        key={d}
                        type="button"
                        className={repeat.weekdays.includes(d) ? 'seg-btn active' : 'seg-btn'}
                        onClick={() => toggleWeekday(d)}
                      >
                        {WEEKDAYS[d]}
                      </button>
                    ))}
                  </div>
                  <select
                    value={repeat.interval}
                    onChange={(e) => setRepeat((r) => ({ ...r, interval: Number(e.target.value) }))}
                    aria-label="Wochenabstand"
                  >
                    {SERIES_INTERVALS.map((i) => (
                      <option key={i.id} value={i.id}>{i.label}</option>
                    ))}
                  </select>
                </div>
                <span className="hint">
                  {occurrences.length} Termin{occurrences.length === 1 ? '' : 'e'}
                  {occurrences.length ? ` vom ${formatRange(occurrences[0], occurrences[occurrences.length - 1])}` : ''}.
                  Feiertage und Tage mit bestehendem Eintrag werden übersprungen.
                </span>
              </>
            )}
          </div>
        )}

        <div className="row">
          <label>
            Umfang
            <select value={form.half_day} onChange={set('half_day')} disabled={!singleDay && !seriesScope}>
              {HALF_DAYS.map((h) => (
                <option key={h.id} value={h.id}>{h.label}</option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select value={form.status} onChange={set('status')}>
              {statusOptions.map((s) => (
                <option key={s.id} value={s.id} disabled={!approver && !SELF_STATUSES.includes(s.id)}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label>
          Vertretung (optional)
          <select value={form.deputy_id} onChange={set('deputy_id')}>
            <option value="">–</option>
            {people
              .filter((p) => p.id !== form.person_id)
              .map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
          </select>
        </label>

        <label>
          Notiz (optional, nur für Angemeldete sichtbar)
          <textarea
            value={form.note}
            onChange={set('note')}
            maxLength={500}
            rows={2}
            placeholder="z. B. Erreichbarkeit – bitte keine Gesundheitsangaben"
          />
        </label>

        {days !== null && !seriesScope && (
          <p className="hint">
            {days.toLocaleString('de-DE')} Arbeitstag{days === 1 ? '' : 'e'} (ohne Wochenenden und Hamburger Feiertage)
          </p>
        )}
        {!approver && (
          <p className="hint">Genehmigungen setzen nur genehmigende Personen. Für eine Genehmigung „Beantragt“ wählen.</p>
        )}
        {error && <p className="form-error">{error}</p>}
      </form>
    </Modal>
  );
}
