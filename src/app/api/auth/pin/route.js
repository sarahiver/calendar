import { NextResponse } from 'next/server';
import { db } from '@/lib/server/supabase';
import { guard, handler, readBody, HttpError } from '@/lib/server/api';
import { verifyPassword } from '@/lib/server/password';
import { getPinConfig, issuePinToken, pinCookie } from '@/lib/server/pin';

export const dynamic = 'force-dynamic';

const WINDOW_MINUTES = 15;
const MAX_FAILS_PER_IP = 10;
const MAX_FAILS_TOTAL = 50; // Schutz gegen Raten von vielen Rechnern aus
const PIN_MARKER = '#pin'; // Kennzeichnung in login_attempts

function clientIp(request) {
  return (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unbekannt';
}

async function pinFails(ip) {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
  let q = db()
    .from('login_attempts')
    .select('id', { count: 'exact', head: true })
    .eq('email', PIN_MARKER)
    .eq('success', false)
    .gte('created_at', since);
  if (ip) q = q.eq('ip', ip);
  const { count, error } = await q;
  if (error) throw error;
  return count || 0;
}

export const POST = handler(async (request) => {
  await guard(request, { pin: false });
  const { pin } = await readBody(request);
  const value = String(pin || '').replace(/\s/g, '');
  if (!value) throw new HttpError('Bitte die PIN eingeben.');

  const cfg = await getPinConfig();
  if (!cfg.hash) return NextResponse.json({ ok: true });

  const ip = clientIp(request);
  const [byIp, total] = await Promise.all([pinFails(ip), pinFails(null)]);
  if (byIp >= MAX_FAILS_PER_IP || total >= MAX_FAILS_TOTAL) {
    throw new HttpError(`Zu viele Fehlversuche. Bitte in ${WINDOW_MINUTES} Minuten erneut versuchen.`, 429);
  }

  const ok = await verifyPassword(value, cfg.hash);
  await db().from('login_attempts').insert({ email: PIN_MARKER, ip, success: ok });
  if (!ok) throw new HttpError('Die PIN ist falsch.', 401);

  const { token, maxAge } = issuePinToken(cfg.version);
  const res = NextResponse.json({ ok: true });
  res.headers.append('Set-Cookie', pinCookie(token, maxAge));
  return res;
});
