import { db } from '@/lib/server/supabase';
import { guard, handler, json, readBody, HttpError } from '@/lib/server/api';
import { safeEqual } from '@/lib/server/crypto';
import { hashPassword, verifyPassword, passwordProblem } from '@/lib/server/password';

export const dynamic = 'force-dynamic';

// Eigenes Passwort ändern
export const POST = handler(async (request) => {
  const { user } = await guard(request, { login: true, allowMustChange: true });
  const { current, next } = await readBody(request);

  const { data: person, error } = await db()
    .from('people').select('id, role, password_hash').eq('id', user.id).single();
  if (error) throw error;

  const currentOk = person.password_hash
    ? await verifyPassword(String(current || ''), person.password_hash)
    : person.role === 'admin' && !!process.env.INITIAL_ADMIN_PASSWORD &&
      safeEqual(String(current || ''), process.env.INITIAL_ADMIN_PASSWORD);
  if (!currentOk) throw new HttpError('Das aktuelle Passwort ist falsch.');

  const problem = passwordProblem(next);
  if (problem) throw new HttpError(problem);
  if (next === current) throw new HttpError('Das neue Passwort muss sich vom alten unterscheiden.');

  const { error: updateError } = await db()
    .from('people')
    .update({ password_hash: await hashPassword(next), must_change_password: false })
    .eq('id', user.id);
  if (updateError) throw updateError;

  // Andere Sitzungen dieser Person beenden
  await db().from('sessions').delete().eq('person_id', user.id).neq('id', user.sessionId);
  return json({ ok: true });
});
