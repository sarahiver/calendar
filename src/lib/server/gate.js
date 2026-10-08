import 'server-only';
import { hmac, safeEqual } from './crypto';

const VIEW_TOKEN_HOURS = 12;

function allowedOrigins() {
  return (process.env.ALLOWED_ORIGIN || 'https://arbeitsbereiche.vbg.de')
    .split(',')
    .map((s) => s.trim().replace(/\/$/, ''))
    .filter(Boolean);
}

/**
 * Prüft, ob die Seite im SharePoint-iFrame geladen wird.
 * Der Browser setzt Sec-Fetch-Dest und Referer selbst – direkte Aufrufe
 * der URL im Browser werden dadurch zuverlässig abgewiesen.
 */
export function checkFrameAccess(headers, key) {
  if (process.env.GATE_MODE === 'off') return { ok: true };

  const accessKey = process.env.ACCESS_KEY;
  if (accessKey && !safeEqual(key || '', accessKey)) return { ok: false, reason: 'key' };

  if (headers.get('sec-fetch-dest') !== 'iframe') return { ok: false, reason: 'not-framed' };

  const referer = headers.get('referer');
  if (!referer) {
    return process.env.ALLOW_MISSING_REFERER === 'true'
      ? { ok: true }
      : { ok: false, reason: 'no-referer' };
  }

  let origin;
  try {
    origin = new URL(referer).origin;
  } catch {
    return { ok: false, reason: 'bad-referer' };
  }
  if (!allowedOrigins().includes(origin)) return { ok: false, reason: 'origin' };

  return { ok: true };
}

// Kurzlebiges Token, das die Seite nach bestandener Prüfung erhält.
// Alle API-Aufrufe brauchen es – ohne iFrame-Aufruf gibt es also keine Daten.
export function issueViewToken() {
  const exp = Date.now() + VIEW_TOKEN_HOURS * 3600 * 1000;
  return `${exp}.${hmac(`view.${exp}`)}`;
}

export function verifyViewToken(token) {
  if (!token || typeof token !== 'string') return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEqual(sig, hmac(`view.${exp}`));
}
