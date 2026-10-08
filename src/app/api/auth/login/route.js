import { NextResponse } from 'next/server';
import { db } from '@/lib/server/supabase';
import { guard, handler, readBody, HttpError } from '@/lib/server/api';
import { safeEqual } from '@/lib/server/crypto';
import { verifyPassword } from '@/lib/server/password';
import { createSession, sessionCookie } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

const WINDOW_MINUTES = 15;
const MAX_FAILS_PER_EMAIL = 5;
const MAX_FAILS_PER_IP = 20;
const FAIL_MESSAGE = 'E-Mail-Adresse oder Passwort ist falsch.';

function clientIp(request) {
  return (request.headers.get('x-forwarded-for') || '').split(',')[0].trim() || 'unbekannt';
}

async function failCount(column, value) {
  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();
  const { count, error } = await db()
    .from('login_attempts')
    .select('id', { count: 'exact', head: true })
    .eq(column, value)
    .eq('success', false)
    .gte('created_at', since);
  if (error) throw error;
  return count || 0;
}

export const POST = handler(async (request) => {
  await guard(request);
  const body = await readBody(request);
  const email = String(body.email || '').trim().toLowerCase();
  const password = String(body.password || '');
  if (!email || !password) throw new HttpError('Bitte E-Mail-Adresse und Passwort eingeben.');

  const ip = clientIp(request);
  const [byEmail, byIp] = await Promise.all([failCount('email', email), failCount('ip', ip)]);
  if (byEmail >= MAX_FAILS_PER_EMAIL || byIp >= MAX_FAILS_PER_IP) {
    throw new HttpError(`Zu viele Fehlversuche. Bitte in ${WINDOW_MINUTES} Minuten erneut versuchen.`, 429);
  }

  const { data: person, error } = await db()
    .from('people')
    .select('id, role, active, password_hash, must_change_password')
    .eq('email', email)
    .maybeSingle();
  if (error) throw error;

  let ok = false;
  let mustChange = !!person?.must_change_password;
  if (person?.active) {
    if (person.password_hash) {
      ok = await verifyPassword(password, person.password_hash);
    } else if (person.role === 'admin' && process.env.INITIAL_ADMIN_PASSWORD) {
      // Erstanmeldung des Admins mit dem Startpasswort aus den Umgebungsvariablen
      ok = safeEqual(password, process.env.INITIAL_ADMIN_PASSWORD);
      mustChange = true;
    }
  }

  await db().from('login_attempts').insert({ email, ip, success: ok });
  if (!ok) throw new HttpError(FAIL_MESSAGE, 401);

  const { token, maxAge } = await createSession(person.id);

  // Aufräumen
  const nowIso = new Date().toISOString();
  const oldIso = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  await Promise.all([
    db().from('sessions').delete().lt('expires_at', nowIso),
    db().from('login_attempts').delete().lt('created_at', oldIso),
  ]);

  const res = NextResponse.json({ ok: true, mustChange });
  res.headers.append('Set-Cookie', sessionCookie(token, maxAge));
  return res;
});
