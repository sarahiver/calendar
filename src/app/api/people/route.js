import { db } from '@/lib/server/supabase';
import { guard, handler, json, readBody } from '@/lib/server/api';
import { normalizePerson, PERSON_SELECT, publicPerson, mapDbError } from '@/lib/server/people';

export const dynamic = 'force-dynamic';

export const GET = handler(async (request) => {
  await guard(request, { roles: ['admin'] });
  const { data, error } = await db()
    .from('people').select(PERSON_SELECT)
    .order('sort', { ascending: true }).order('name', { ascending: true });
  if (error) throw error;
  return json({ people: data.map(publicPerson) });
});

export const POST = handler(async (request) => {
  await guard(request, { roles: ['admin'] });
  const person = await normalizePerson(await readBody(request));
  const { data, error } = await db().from('people').insert(person).select(PERSON_SELECT).single();
  if (error) throw mapDbError(error);
  return json({ person: publicPerson(data) }, 201);
});
