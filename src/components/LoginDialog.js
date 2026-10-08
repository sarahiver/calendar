'use client';

import { useState } from 'react';
import Modal from './Modal';

export default function LoginDialog({ api, onClose, onDone }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api('/api/auth/login', { method: 'POST', body: { email, password } });
      onDone(res);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal title="Anmelden zum Bearbeiten" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        <p className="hint">Nach der Anmeldung bleiben Sie 90 Tage angemeldet.</p>
        <label>
          Dienstliche E-Mail-Adresse
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoFocus
            required
            autoComplete="username"
          />
        </label>
        <label>
          Passwort
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <p className="hint">Passwort vergessen? Bitte an die Kalender-Administration wenden.</p>
        <div className="form-actions">
          <button type="button" className="btn" onClick={onClose}>Abbrechen</button>
          <button type="submit" className="btn primary" disabled={busy}>
            {busy ? 'Prüft …' : 'Anmelden'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
