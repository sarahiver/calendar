import 'server-only';
import { db } from './supabase';
import { hmac, safeEqual } from './crypto';

// Abteilungs-PIN: schützt die Ansicht zusätzlich zur SharePoint-Sperre.
// Ist keine PIN gesetzt, ist die Ansicht wie bisher ohne PIN sichtbar.

export const PIN_COOKIE = 'akal_pin';
export const PIN_DAYS = 90;
export const PIN_MIN = 6;
export const PIN_MAX = 12;

const KEY_HASH = 'view_pin_hash';
const KEY_VERSION = 'view_pin_version';

export async function getPinConfig() {
  const { data, error } = await db().from('settings').select('key, value').in('key', [KEY_HASH, KEY_VERSION]);
  if (error) throw error;
  const map = Object.fromEntries((data || []).map((r) => [r.key, r.value]));
  return { hash: map[KEY_HASH] || null, version: map[KEY_VERSION] || '0' };
}

export async function savePinConfig(hash, version) {
  const { error } = await db()
    .from('settings')
    .upsert([
      { key: KEY_HASH, value: hash },
      { key: KEY_VERSION, value: version },
    ]);
  if (error) throw error;
}

export async function removePin() {
  const { error } = await db().from('settings').delete().in('key', [KEY_HASH, KEY_VERSION]);
  if (error) throw error;
}

export function pinProblem(pin) {
  if (typeof pin !== 'string' || !/^\d+$/.test(pin)) return 'Die PIN darf nur aus Ziffern bestehen.';
  if (pin.length < PIN_MIN || pin.length > PIN_MAX) return `Die PIN muss ${PIN_MIN} bis ${PIN_MAX} Ziffern lang sein.`;
  return null;
}

// Cookie-Wert: Ablaufzeit + Signatur, gebunden an die aktuelle PIN-Version.
// Wird die PIN geändert, werden alle bisherigen PIN-Freischaltungen ungültig.
export function issuePinToken(version) {
  const exp = Date.now() + PIN_DAYS * 86400 * 1000;
  return { token: `${exp}.${hmac(`pin.${version}.${exp}`)}`, maxAge: PIN_DAYS * 86400 };
}

export function verifyPinToken(token, version) {
  if (!token || typeof token !== 'string') return false;
  const [exp, sig] = token.split('.');
  if (!exp || !sig || Number(exp) < Date.now()) return false;
  return safeEqual(sig, hmac(`pin.${version}.${exp}`));
}

export function pinCookie(token, maxAgeSeconds) {
  return [
    `${PIN_COOKIE}=${token}`,
    'Path=/',
    `Max-Age=${maxAgeSeconds}`,
    'HttpOnly',
    'Secure',
    'SameSite=None',
    'Partitioned',
  ].join('; ');
}

export async function hasPinAccess(request) {
  const cfg = await getPinConfig();
  if (!cfg.hash) return true;
  return verifyPinToken(request.cookies.get(PIN_COOKIE)?.value, cfg.version);
}
