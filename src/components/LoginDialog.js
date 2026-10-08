'use client';

import { useState } from 'react';
import Modal from './Modal';

export default function LoginDialog({ api, onClose, onDone }) {
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);

  async function requestCode(e) {
    e?.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await api('/api/auth/request-code', { method: 'POST', body: { email } });
      setInfo(res.message);
      setStep('code');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function verify(e) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await api('/api/auth/verify', { method: 'POST', body: { email, code } });
      onDone();
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <Modal title="Anmelden zum Bearbeiten" onClose={onClose}>
      {step === 'email' ? (
        <form className="form" onSubmit={requestCode}>
          <p className="hint">Sie erhalten einen 6-stelligen Code per E-Mail. Danach bleiben Sie 90 Tage angemeldet.</p>
          <label>
            Dienstliche E-Mail-Adresse
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoFocus
              required
              autoComplete="email"
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <div className="form-actions">
            <button type="button" className="btn" onClick={onClose}>Abbrechen</button>
            <button type="submit" className="btn primary" disabled={busy}>
              {busy ? 'Sendet …' : 'Code anfordern'}
            </button>
          </div>
        </form>
      ) : (
        <form className="form" onSubmit={verify}>
          <p className="hint">{info}</p>
          <label>
            Code aus der E-Mail
            <input
              className="code-input"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              autoFocus
              required
            />
          </label>
          {error && <p className="form-error">{error}</p>}
          <div className="form-actions">
            <button type="button" className="btn ghost" disabled={busy} onClick={() => { setStep('email'); setCode(''); setError(null); }}>
              Andere Adresse
            </button>
            <button type="button" className="btn" disabled={busy} onClick={requestCode}>Neuer Code</button>
            <button type="submit" className="btn primary" disabled={busy || code.length !== 6}>
              {busy ? 'Prüft …' : 'Anmelden'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}
