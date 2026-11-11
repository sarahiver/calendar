'use client';

import { useCallback, useEffect, useState } from 'react';

// Abteilungs-PIN verwalten (nur Admins). Die PIN selbst wird nur als Hash gespeichert.
export default function PinSettings({ api }) {
  const [active, setActive] = useState(null);
  const [editing, setEditing] = useState(false);
  const [pin, setPin] = useState('');
  const [repeat, setRepeat] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [confirmRemove, setConfirmRemove] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await api('/api/settings/pin');
      setActive(res.active);
    } catch (e) {
      setError(e.message);
    }
  }, [api]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(e) {
    e.preventDefault();
    if (pin !== repeat) return setError('Die beiden Eingaben stimmen nicht überein.');
    setBusy(true);
    setError(null);
    try {
      await api('/api/settings/pin', { method: 'PUT', body: { pin } });
      setActive(true);
      setEditing(false);
      setPin('');
      setRepeat('');
      setInfo('PIN gespeichert. Alle müssen die neue PIN einmal eingeben – außer angemeldete Personen.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    try {
      await api('/api/settings/pin', { method: 'DELETE' });
      setActive(false);
      setConfirmRemove(false);
      setInfo('PIN entfernt. Der Kalender ist in SharePoint wieder ohne PIN sichtbar.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const digits = (setter) => (e) => setter(e.target.value.replace(/\D/g, ''));

  return (
    <section className="pin-settings">
      <div className="pin-head">
        <div>
          <strong>Abteilungs-PIN</strong>{' '}
          {active === null ? null : active ? (
            <span className="badge b-genehmigt">aktiv</span>
          ) : (
            <span className="badge b-abgelehnt">nicht gesetzt</span>
          )}
          <p className="hint">
            Ohne PIN oder Anmeldung zeigt der Kalender keine Daten. Die PIN gilt pro Rechner 90 Tage.
          </p>
        </div>
        {!editing && (
          <div className="form-actions">
            <button className="btn small" onClick={() => { setEditing(true); setInfo(null); setError(null); }}>
              {active ? 'PIN ändern' : 'PIN festlegen'}
            </button>
            {active &&
              (confirmRemove ? (
                <span className="confirm">
                  Wirklich entfernen?
                  <button className="btn small danger" disabled={busy} onClick={remove}>Ja</button>
                  <button className="btn small" onClick={() => setConfirmRemove(false)}>Nein</button>
                </span>
              ) : (
                <button className="btn small ghost danger-text" onClick={() => setConfirmRemove(true)}>Entfernen</button>
              ))}
          </div>
        )}
      </div>

      {editing && (
        <form className="form" onSubmit={save}>
          <div className="row">
            <label>
              Neue PIN (6–12 Ziffern)
              <input type="password" inputMode="numeric" autoComplete="new-password" maxLength={12}
                value={pin} onChange={digits(setPin)} autoFocus required />
            </label>
            <label>
              PIN wiederholen
              <input type="password" inputMode="numeric" autoComplete="new-password" maxLength={12}
                value={repeat} onChange={digits(setRepeat)} required />
            </label>
          </div>
          {active && (
            <p className="hint">Nach dem Ändern müssen alle die neue PIN eingeben – die alte gilt sofort nicht mehr.</p>
          )}
          <div className="form-actions">
            <button type="button" className="btn" onClick={() => { setEditing(false); setPin(''); setRepeat(''); setError(null); }}>
              Abbrechen
            </button>
            <button type="submit" className="btn primary" disabled={busy}>PIN speichern</button>
          </div>
        </form>
      )}
      {error && <p className="form-error">{error}</p>}
      {info && <p className="hint pin-info">{info}</p>}
    </section>
  );
}
