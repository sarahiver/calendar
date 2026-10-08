import { db } from '@/lib/server/supabase';
import { guard, handler, json, readBody, HttpError } from '@/lib/server/api';
import {
  normalizeEntry, assertCanWrite, assertPeopleExist, assertNoOverlap, loadEntry, ENTRY_FULL_FIELDS,
} from '@/lib/server/entries';
import { isApprover } from '@/lib/constants';

export const dynamic = 'force-dynamic';

// Teilweise Änderungen möglich, z. B. nur { status: 'genehmigt' }
export const PATCH = handler(async (request, { params }) => {
  const { user } = await guard(request, { login: true });
  const { id } = await params;
  const existing = await loadEntry(id);
  const body = await readBody(request);

  const entry = normalizeEntry({ ...existing, ...body });
  assertCanWrite(user, entry, existing);
  await assertPeopleExist(entry);
  if (entry.status !== 'abgelehnt') await assertNoOverlap(entry, id);

  const { data, error } = await db()
    .from('entries')
    .update({ ...entry, updated_by: user.id, updated_at: new Date().toISOString() })
    .eq('id', id)
    .select(ENTRY_FULL_FIELDS)
    .single();
  if (error) throw error;
  return json({ entry: data });
});

export const DELETE = handler(async (request, { params }) => {
  const { user } = await guard(request, { login: true });
  const { id } = await params;
  const existing = await loadEntry(id);
  if (!isApprover(user) && existing.person_id !== user.id) {
    throw new HttpError('Sie können nur eigene Einträge löschen.', 403);
  }
  const { error } = await db().from('entries').delete().eq('id', id);
  if (error) throw error;
  return json({ ok: true });
});
