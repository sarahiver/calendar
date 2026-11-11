'use client';

import { useState } from 'react';

// Wird angezeigt, solange die Abteilungs-PIN nicht eingegeben wurde. Es werden keine Daten geladen.
export default function PinScreen({ api, title, onDone, onLogin }) {
  const [pin, setPin] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/api/auth/pin', { method: 'POST', body: { pin } });
      onDone();
    } catch (err) {
      setError(err.message);
      setPin('');
      setBusy(false);
    }
  }

  return (
    <main className="blocked">
      <form className="blocked-box pin-box" onSubmit={submit}>
        <strong>{title}</strong>
        <p>Bitte die Abteilungs-PIN eingeben. Danach bleibt der Kalender auf diesem Rechner 90 Tage freigeschaltet.</p>
        <input
          className="code-input"
          type="password"
          inputMode="numeric"
          autoComplete="off"
          maxLength={12}
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
          aria-label="Abteilungs-PIN"
          autoFocus
          required
        />
        {error && <p className="form-error">{error}</p>}
        <button type="submit" className="btn primary" disabled={busy || !pin}>
          {busy ? 'Prüft …' : 'Freischalten'}
        </button>
        <button type="button" className="link" onClick={onLogin}>
          Stattdessen mit E-Mail und Passwort anmelden
        </button>
      </form>
    </main>
  );
}
