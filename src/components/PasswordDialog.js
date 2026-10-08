'use client';

import { useState } from 'react';
import Modal from './Modal';

const MIN = 10;

export default function PasswordDialog({ api, forced, onClose, onDone, onLogout }) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [repeat, setRepeat] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    if (next.length < MIN) return setError(`Mindestens ${MIN} Zeichen.`);
    if (next !== repeat) return setError('Die neuen Passwörter stimmen nicht überein.');
    setBusy(true);
    setError(null);
    try {
      await api('/api/auth/password', { method: 'POST', body: { current, next } });
      onDone();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  // Erzwungene Änderung lässt sich nicht wegklicken – nur abmelden
  const close = forced ? onLogout : onClose;

  return (
    <Modal title={forced ? 'Eigenes Passwort festlegen' : 'Passwort ändern'} onClose={close}>
      <form className="form" onSubmit={submit}>
        {forced && (
          <p className="hint">Sie sind mit einem Startpasswort angemeldet. Bitte legen Sie jetzt ein eigenes Passwort fest.</p>
        )}
        <label>
          {forced ? 'Startpasswort' : 'Aktuelles Passwort'}
          <input
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            autoFocus
            required
          />
        </label>
        <label>
          Neues Passwort (mind. {MIN} Zeichen)
          <input type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" required />
        </label>
        <label>
          Neues Passwort wiederholen
          <input type="password" value={repeat} onChange={(e) => setRepeat(e.target.value)} autoComplete="new-password" required />
        </label>
        {error && <p className="form-error">{error}</p>}
        <div className="form-actions">
          <button type="button" className="btn" onClick={close}>{forced ? 'Abmelden' : 'Abbrechen'}</button>
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? 'Speichert …' : 'Passwort speichern'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
