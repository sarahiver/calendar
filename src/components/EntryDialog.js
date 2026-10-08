'use client';

import { useState } from 'react';
import Modal from './Modal';
import { TYPES, STATUSES, HALF_DAYS, SELF_STATUSES, typeById, statusLabel, isApprover } from '@/lib/constants';
import { formatRange } from '@/lib/dates';
import { countWorkdays } from '@/lib/holidays';

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
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const approver = isApprover(me);
  const personName = (id) => people.find((p) => p.id === id)?.name || '–';

  if (mode === 'view') {
    const t = typeById(entry.type);
    return (
      <Modal title="Abwesenheit" onClose={onClose} footer={<button className="btn" onClick={onClose}>Schließen</button>}>
        <dl className="details">
          <dt>Person</dt>
          <dd>{personName(entry.person_id)}</dd>
          <dt>Zeitraum</dt>
          <dd>
            {formatRange(entry.date_from, entry.date_to)}
            {entry.half_day ? ` (${entry.half_day})` : ''}
          </dd>
          <dt>Arbeitstage</dt>
          <dd>{countWorkdays(entry.date_from, entry.date_to, entry.half_day).toLocaleString('de-DE')}</dd>
          <dt>Art</dt>
          <dd>
            <span className="dot" style={{ '--c': t.color }} />
            {t.label}
          </dd>
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
      if (next.date_from !== next.date_to) next.half_day = '';
      if (next.deputy_id === next.person_id) next.deputy_id = '';
      return next;
    });
  };

  const personOptions = approver ? people : people.filter((p) => p.id === me?.id);
  const statusOptions = approver
    ? STATUSES
    : STATUSES.filter((s) => SELF_STATUSES.includes(s.id) || s.id === entry.status);
  const days = countWorkdays(form.date_from, form.date_to, form.half_day);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSave(
        { ...form, half_day: form.half_day || null, deputy_id: form.deputy_id || null },
        mode === 'edit' ? entry.id : null
      );
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    try {
      await onDelete(entry.id);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  const footer = (
    <>
      {mode === 'edit' &&
        (confirmDelete ? (
          <span className="confirm">
            Wirklich löschen?
            <button type="button" className="btn small danger" disabled={busy} onClick={remove}>Ja, löschen</button>
            <button type="button" className="btn small" onClick={() => setConfirmDelete(false)}>Nein</button>
          </span>
        ) : (
          <button type="button" className="btn ghost danger-text" onClick={() => setConfirmDelete(true)}>Löschen</button>
        ))}
      <span className="spacer" />
      {mode === 'edit' && approver && entry.status === 'beantragt' && (
        <>
          <button type="button" className="btn ok" disabled={busy} onClick={() => onStatus(entry.id, 'genehmigt')}>
            Genehmigen
          </button>
          <button type="button" className="btn danger" disabled={busy} onClick={() => onStatus(entry.id, 'abgelehnt')}>
            Ablehnen
          </button>
        </>
      )}
      <button type="button" className="btn" onClick={onClose}>Abbrechen</button>
      <button type="submit" form="entry-form" className="btn primary" disabled={busy}>
        {busy ? 'Speichert …' : 'Speichern'}
      </button>
    </>
  );

  return (
    <Modal title={mode === 'new' ? 'Neue Abwesenheit' : 'Abwesenheit bearbeiten'} onClose={onClose} footer={footer}>
      <form id="entry-form" className="form" onSubmit={submit}>
        <label>
          Person
          <select value={form.person_id} onChange={set('person_id')} disabled={!approver} required>
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
            Von
            <input type="date" value={form.date_from} onChange={set('date_from')} required />
          </label>
          <label>
            Bis
            <input type="date" value={form.date_to} min={form.date_from} onChange={set('date_to')} required />
          </label>
        </div>

        <div className="row">
          <label>
            Umfang
            <select value={form.half_day} onChange={set('half_day')} disabled={form.date_from !== form.date_to}>
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

        <p className="hint">
          {days.toLocaleString('de-DE')} Arbeitstag{days === 1 ? '' : 'e'} (ohne Wochenenden und Hamburger Feiertage)
        </p>
        {!approver && (
          <p className="hint">Genehmigungen setzen nur genehmigende Personen. Für eine Genehmigung „Beantragt“ wählen.</p>
        )}
        {error && <p className="form-error">{error}</p>}
      </form>
    </Modal>
  );
}
