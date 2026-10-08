import 'server-only';
import crypto from 'node:crypto';
import { safeEqual } from './crypto';

const N = 16384;
const KEYLEN = 64;
export const MIN_PASSWORD_LENGTH = 10;

const scrypt = (password, salt) =>
  new Promise((resolve, reject) =>
    crypto.scrypt(password, salt, KEYLEN, { N, r: 8, p: 1 }, (err, key) => (err ? reject(err) : resolve(key)))
  );

// Format: scrypt$<salt>$<hash>
export async function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('base64url');
  const key = await scrypt(password, salt);
  return `scrypt$${salt}$${key.toString('base64url')}`;
}

export async function verifyPassword(password, stored) {
  if (!stored || typeof stored !== 'string') return false;
  const [algo, salt, hash] = stored.split('$');
  if (algo !== 'scrypt' || !salt || !hash) return false;
  const key = await scrypt(password, salt);
  return safeEqual(key.toString('base64url'), hash);
}

export function passwordProblem(password) {
  if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
    return `Das Passwort muss mindestens ${MIN_PASSWORD_LENGTH} Zeichen lang sein.`;
  }
  if (password.length > 200) return 'Das Passwort ist zu lang.';
  return null;
}
