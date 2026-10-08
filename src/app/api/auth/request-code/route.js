import { db } from '@/lib/server/supabase';
import { guard, handler, json, readBody, HttpError } from '@/lib/server/api';
import { randomCode, sha256 } from '@/lib/server/crypto';
import { sendLoginCode } from '@/lib/server/mail';

export const dynamic = 'force-dynamic';

const GENERIC = 'Falls die Adresse freigeschaltet ist, wurde ein Code verschickt.';

export const POST = handler(async (request) => {
  await guard(request);
  const { email: raw } = await readBody(request);
  const email = String(raw || '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new HttpError('Bitte eine gültige E-Mail-Adresse eingeben.');

  // Max. 5 Codes pro Stunde und Adresse
  const since = new Date(Date.now() - 3600 * 1000).toISOString();
  const { count, error: countError } = await db()
    .from('login_codes')
    .select('id', { count: 'exact', head: true })
    .eq('email', email)
    .gte('created_at', since);
  if (countError) throw countError;
  if (count >= 5) throw new HttpError('Zu viele Anfragen. Bitte in einer Stunde erneut versuchen.', 429);

  const { data: person, error } = await db()
    .from('people')
    .select('id, name, active')
    .eq('email', email)
    .maybeSingle();
  if (error) throw error;

  // Gleiche Antwort für unbekannte Adressen (keine Auskunft, wer freigeschaltet ist)
  if (!person || !person.active) return json({ ok: true, message: GENERIC });

  const code = randomCode();
  const { error: insertError } = await db().from('login_codes').insert({
    email,
    code_hash: sha256(`${email}:${code}:${process.env.APP_SECRET}`),
    expires_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
  });
  if (insertError) throw insertError;

  await sendLoginCode({ email, name: person.name, code });
  return json({ ok: true, message: GENERIC });
});
