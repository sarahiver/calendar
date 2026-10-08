import 'server-only';
import { db } from './supabase';
import { sha256, randomToken } from './crypto';

export const SESSION_COOKIE = 'akal_session';
export const SESSION_DAYS = 90;

// Partitioned + SameSite=None: Cookie funktioniert im SharePoint-iFrame (Edge/Chrome)
export function sessionCookie(token, maxAgeSeconds) {
  return [
    `${SESSION_COOKIE}=${token}`,
    'Path=/',
    `Max-Age=${maxAgeSeconds}`,
    'HttpOnly',
    'Secure',
    'SameSite=None',
    'Partitioned',
  ].join('; ');
}

export async function createSession(personId) {
  const token = randomToken();
  const expires = new Date(Date.now() + SESSION_DAYS * 86400 * 1000);
  const { error } = await db()
    .from('sessions')
    .insert({ person_id: personId, token_hash: sha256(token), expires_at: expires.toISOString() });
  if (error) throw error;
  return { token, maxAge: SESSION_DAYS * 86400 };
}

export async function getSessionUser(request) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (!token) return null;
  const { data, error } = await db()
    .from('sessions')
    .select('id, expires_at, person:people(id, name, short, email, role, active, must_change_password)')
    .eq('token_hash', sha256(token))
    .maybeSingle();
  if (error || !data || !data.person) return null;
  if (new Date(data.expires_at) < new Date() || !data.person.active) return null;
  return { ...data.person, sessionId: data.id };
}

export async function deleteSession(request) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (token) await db().from('sessions').delete().eq('token_hash', sha256(token));
}
