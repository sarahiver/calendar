import { db } from '@/lib/server/supabase';
import { guard, handler, json, readBody, HttpError, isUuid } from '@/lib/server/api';
import { normalizePerson, PERSON_SELECT, publicPerson, mapDbError } from '@/lib/server/people';

export const dynamic = 'force-dynamic';

export const PATCH = handler(async (request, { params }) => {
  const { user } = await guard(request, { roles: ['admin'] });
  const { id } = await params;
  if (!isUuid(id)) throw new HttpError('Person nicht gefunden.', 404);

  const body = await readBody(request);
  const person = await normalizePerson(body);
  if (id === user.id && (person.role !== 'admin' || !person.active)) {
    throw new HttpError('Sie können sich nicht selbst die Admin-Rechte entziehen.');
  }
  if (id === user.id && body.password) {
    throw new HttpError('Ihr eigenes Passwort ändern Sie über „Passwort ändern“.');
  }

  const { data, error } = await db().from('people').update(person).eq('id', id).select(PERSON_SELECT).maybeSingle();
  if (error) throw mapDbError(error);
  if (!data) throw new HttpError('Person nicht gefunden.', 404);

  // Deaktiviert oder Passwort zurückgesetzt → sofort abmelden
  if (!data.active || body.password) await db().from('sessions').delete().eq('person_id', id);
  return json({ person: publicPerson(data) });
});

export const DELETE = handler(async (request, { params }) => {
  const { user } = await guard(request, { roles: ['admin'] });
  const { id } = await params;
  if (!isUuid(id)) throw new HttpError('Person nicht gefunden.', 404);
  if (id === user.id) throw new HttpError('Sie können sich nicht selbst löschen.');

  const { error } = await db().from('people').delete().eq('id', id);
  if (error) throw error;
  return json({ ok: true });
});
