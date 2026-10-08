import { NextResponse } from 'next/server';
import { db } from '@/lib/server/supabase';
import { guard, handler, readBody, HttpError } from '@/lib/server/api';
import { sha256, safeEqual } from '@/lib/server/crypto';
import { createSession, sessionCookie } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

const MAX_ATTEMPTS = 5;

export const POST = handler(async (request) => {
  await guard(request);
  const body = await readBody(request);
  const email = String(body.email || '').trim().toLowerCase();
  const code = String(body.code || '').replace(/\D/g, '');
  if (!email || code.length !== 6) throw new HttpError('Bitte den 6-stelligen Code eingeben.');

  const nowIso = new Date().toISOString();
  const { data: row, error } = await db()
    .from('login_codes')
    .select('id, code_hash, attempts')
    .eq('email', email)
    .eq('used', false)
    .gt('expires_at', nowIso)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!row) throw new HttpError('Code abgelaufen oder ungültig. Bitte neuen Code anfordern.');
  if (row.attempts >= MAX_ATTEMPTS) throw new HttpError('Zu viele Fehlversuche. Bitte neuen Code anfordern.');

  if (!safeEqual(row.code_hash, sha256(`${email}:${code}:${process.env.APP_SECRET}`))) {
    await db().from('login_codes').update({ attempts: row.attempts + 1 }).eq('id', row.id);
    throw new HttpError('Code ist falsch.');
  }

  await db().from('login_codes').update({ used: true }).eq('id', row.id);

  const { data: person, error: pError } = await db()
    .from('people').select('id, active').eq('email', email).maybeSingle();
  if (pError) throw pError;
  if (!person || !person.active) throw new HttpError('Zugang nicht freigeschaltet.', 403);

  const { token, maxAge } = await createSession(person.id);

  // Aufräumen: abgelaufene Codes und Sitzungen
  await Promise.all([
    db().from('login_codes').delete().lt('expires_at', nowIso),
    db().from('sessions').delete().lt('expires_at', nowIso),
  ]);

  const res = NextResponse.json({ ok: true });
  res.headers.append('Set-Cookie', sessionCookie(token, maxAge));
  return res;
});
