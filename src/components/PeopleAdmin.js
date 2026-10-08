'use client';

import { useCallback, useEffect, useState } from 'react';
import Modal from './Modal';
import { ROLES, roleLabel } from '@/lib/constants';

const EMPTY = { name: '', short: '', email: '', role: 'mitarbeitend', active: true, sort: 0, password: '' };

export default function PeopleAdmin({ api, me, onClose }) {
  const [people, setPeople] = useState([]);
  const [form, setForm] = useState(null); // null = keine Bearbeitung
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [confirmId, setConfirmId] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await api('/api/people');
      setPeople(res.people);
    } catch (e) {
      setError(e.message);
    }
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  const set = (key) => (e) =>
    setForm((f) => ({ ...f, [key]: e.target.type === 'checkbox' ? e.target.checked : e.target.value }));

  async function save(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const body = { ...form, sort: Number(form.sort) || 0, password: form.password || undefined };
      await api(form.id ? `/api/people/${form.id}` : '/api/people', { method: form.id ? 'PATCH' : 'POST', body });
      setForm(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    setBusy(true);
    setError(null);
    try {
      await api(`/api/people/${id}`, { method: 'DELETE' });
      setConfirmId(null);
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Modal title="Personen verwalten" onClose={onClose} wide>
      {form ? (
        <form className="form" onSubmit={save}>
          <div className="row">
            <label>
              Name
              <input value={form.name} onChange={set('name')} required autoFocus />
            </label>
            <label className="narrow">
              Kürzel
              <input value={form.short || ''} onChange={set('short')} maxLength={6} />
            </label>
          </div>
          <label>
            E-Mail (für die Anmeldung)
            <input type="email" value={form.email || ''} onChange={set('email')} placeholder="leer = kein Login" />
          </label>
          {form.id !== me?.id && (
            <label>
              {form.id && form.has_password ? 'Neues Startpasswort (leer = unverändert)' : 'Startpasswort (mind. 10 Zeichen)'}
              <input
                type="text"
                value={form.password || ''}
                onChange={set('password')}
                autoComplete="off"
                placeholder={form.email ? '' : 'Nur mit E-Mail-Adresse möglich'}
              />
            </label>
          )}
          {form.id !== me?.id && (
            <p className="hint">Die Person muss das Startpasswort bei der ersten Anmeldung ändern. Teilen Sie es ihr persönlich mit.</p>
          )}
          <div className="row">
            <label>
              Rolle
              <select value={form.role} onChange={set('role')}>
                {ROLES.map((r) => (
                  <option key={r.id} value={r.id}>{r.label}</option>
                ))}
              </select>
            </label>
            <label className="narrow">
              Reihenfolge
              <input type="number" value={form.sort} onChange={set('sort')} />
            </label>
          </div>
          <label className="check">
            <input type="checkbox" checked={form.active} onChange={set('active')} />
            Aktiv (im Kalender sichtbar, Anmeldung möglich)
          </label>
          {error && <p className="form-error">{error}</p>}
          <div className="form-actions">
            <button type="button" className="btn" onClick={() => { setForm(null); setError(null); }}>Abbrechen</button>
            <button type="submit" className="btn primary" disabled={busy}>Speichern</button>
          </div>
        </form>
      ) : (
        <>
          <div className="form-actions start">
            <button className="btn primary" onClick={() => setForm({ ...EMPTY, sort: people.length * 10 })}>
              + Person hinzufügen
            </button>
          </div>
          {error && <p className="form-error">{error}</p>}
          <div className="list-scroll">
            <table className="list">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Kürzel</th>
                  <th>E-Mail</th>
                  <th>Rolle</th>
                  <th>Passwort</th>
                  <th>Status</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {people.map((p) => (
                  <tr key={p.id} className={p.active ? '' : 'inactive'}>
                    <td>{p.name}</td>
                    <td>{p.short}</td>
                    <td>{p.email || '–'}</td>
                    <td>{roleLabel(p.role)}</td>
                    <td>{!p.email ? '–' : !p.has_password ? 'Nicht gesetzt' : p.must_change_password ? 'Startpasswort' : 'Gesetzt'}</td>
                    <td>{p.active ? 'Aktiv' : 'Inaktiv'}</td>
                    <td className="actions">
                      <button className="btn small" onClick={() => setForm({ ...p, password: '' })}>Bearbeiten</button>
                      {p.id !== me?.id &&
                        (confirmId === p.id ? (
                          <span className="confirm">
                            Mit allen Einträgen löschen?
                            <button className="btn small danger" disabled={busy} onClick={() => remove(p.id)}>Ja</button>
                            <button className="btn small" onClick={() => setConfirmId(null)}>Nein</button>
                          </span>
                        ) : (
                          <button className="btn small ghost danger-text" onClick={() => setConfirmId(p.id)}>Löschen</button>
                        ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="hint">Tipp: Ausgeschiedene Personen besser deaktivieren statt löschen – dann bleiben ihre Einträge erhalten.</p>
        </>
      )}
    </Modal>
  );
}
