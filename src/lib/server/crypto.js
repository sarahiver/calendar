import 'server-only';
import crypto from 'node:crypto';

function secret() {
  const s = process.env.APP_SECRET;
  if (!s || s.length < 32) throw new Error('APP_SECRET fehlt oder ist kürzer als 32 Zeichen');
  return s;
}

export function hmac(value) {
  return crypto.createHmac('sha256', secret()).update(value).digest('base64url');
}

export function sha256(value) {
  return crypto.createHash('sha256').update(value).digest('hex');
}

export function safeEqual(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

export const randomToken = () => crypto.randomBytes(32).toString('base64url');
export const randomCode = () => String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
