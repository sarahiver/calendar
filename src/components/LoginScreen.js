'use client';

import { useState } from 'react';

// Wird angezeigt, solange niemand angemeldet ist. Es werden keine Kalenderdaten geladen.
export default function LoginScreen({ api, title, onDone }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/api/auth/login', { method: 'POST', body: { email, password } });
      onDone();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <main className="blocked">
      <form className="blocked-box login-box" onSubmit={submit}>
        <strong>{title}</strong>
        <p>Bitte mit Ihrer dienstlichen E-Mail-Adresse und Ihrem Passwort anmelden. Danach bleiben Sie 90 Tage angemeldet.</p>
        <label>
          E-Mail-Adresse
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
            autoFocus
            required
          />
        </label>
        <label>
          Passwort
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
            required
          />
        </label>
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn primary" disabled={busy}>
          {busy ? 'Prüft …' : 'Anmelden'}
        </button>
        <p className="hint">Noch kein Zugang oder Passwort vergessen? Bitte an die Kalender-Administration wenden.</p>
      </form>
    </main>
  );
}
