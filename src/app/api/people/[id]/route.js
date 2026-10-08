import { db } from '@/lib/server/supabase';
import { guard, handler, json, readBody, HttpError, isUuid } from '@/lib/server/api';
import { normalizePerson, PERSON_FIELDS, mapDbError } from '@/lib/server/people';

export const dynamic = 'force-dynamic';

export const PATCH = handler(async (request, { params }) => {
  const { user } = await guard(request, { roles: ['admin'] });
  const { id } = await params;
  if (!isUuid(id)) throw new HttpError('Person nicht gefunden.', 404);

  const person = normalizePerson(await readBody(request));
  if (id === user.id && (person.role !== 'admin' || !person.active)) {
    throw new HttpError('Sie können sich nicht selbst die Admin-Rechte entziehen.');
  }

  const { data, error } = await db().from('people').update(person).eq('id', id).select(PERSON_FIELDS).maybeSingle();
  if (error) throw mapDbError(error);
  if (!data) throw new HttpError('Person nicht gefunden.', 404);

  // Deaktivierte Personen werden sofort abgemeldet
  if (!data.active) await db().from('sessions').delete().eq('person_id', id);
  return json({ person: data });
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
