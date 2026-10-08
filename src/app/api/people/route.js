import { db } from '@/lib/server/supabase';
import { guard, handler, json, readBody } from '@/lib/server/api';
import { normalizePerson, PERSON_FIELDS, mapDbError } from '@/lib/server/people';

export const dynamic = 'force-dynamic';

export const GET = handler(async (request) => {
  await guard(request, { roles: ['admin'] });
  const { data, error } = await db()
    .from('people').select(PERSON_FIELDS)
    .order('sort', { ascending: true }).order('name', { ascending: true });
  if (error) throw error;
  return json({ people: data });
});

export const POST = handler(async (request) => {
  await guard(request, { roles: ['admin'] });
  const person = normalizePerson(await readBody(request));
  const { data, error } = await db().from('people').insert(person).select(PERSON_FIELDS).single();
  if (error) throw mapDbError(error);
  return json({ person: data }, 201);
});
