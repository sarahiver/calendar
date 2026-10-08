import { db } from '@/lib/server/supabase';
import { guard, handler, json, readBody } from '@/lib/server/api';
import {
  normalizeEntry, assertCanWrite, assertPeopleExist, assertNoOverlap, ENTRY_FULL_FIELDS,
} from '@/lib/server/entries';

export const dynamic = 'force-dynamic';

export const POST = handler(async (request) => {
  const { user } = await guard(request, { login: true });
  const entry = normalizeEntry(await readBody(request));
  assertCanWrite(user, entry, null);
  await assertPeopleExist(entry);
  await assertNoOverlap(entry);

  const { data, error } = await db()
    .from('entries')
    .insert({ ...entry, created_by: user.id, updated_by: user.id })
    .select(ENTRY_FULL_FIELDS)
    .single();
  if (error) throw error;
  return json({ entry: data }, 201);
});
