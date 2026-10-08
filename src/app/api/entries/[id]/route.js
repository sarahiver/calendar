import { db } from '@/lib/server/supabase';
import { guard, handler, json, readBody, HttpError } from '@/lib/server/api';
import {
  normalizeEntry, assertCanWrite, assertPeopleExist, assertNoOverlap, loadEntry, loadSeriesEntries,
  parseScope, SERIES_FIELDS, ENTRY_FULL_FIELDS,
} from '@/lib/server/entries';
import { isApprover } from '@/lib/constants';

export const dynamic = 'force-dynamic';

// Teilweise Änderungen möglich, z. B. nur { status: 'genehmigt' }.
// scope: single (Standard) | following (dieser und folgende) | series (ganze Serie)
export const PATCH = handler(async (request, { params }) => {
  const { user } = await guard(request, { login: true });
  const { id } = await params;
  const existing = await loadEntry(id);
  const body = await readBody(request);
  const scope = existing.series_id ? parseScope(body.scope) : 'single';

  if (scope === 'single') {
    const entry = normalizeEntry({ ...existing, ...body });
    assertCanWrite(user, entry, existing);
    await assertPeopleExist(entry);
    if (entry.status !== 'abgelehnt') await assertNoOverlap(entry, id);

    const { data, error } = await db()
      .from('entries')
      .update({ ...entry, series_id: existing.series_id, updated_by: user.id, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select(ENTRY_FULL_FIELDS)
      .single();
    if (error) throw error;
    return json({ entry: data, updated: 1 });
  }

  // Serie: nur Art, Status, Tageshälfte, Vertretung und Notiz – Daten und Person bleiben
  const changes = {};
  for (const key of SERIES_FIELDS) if (key in body) changes[key] = body[key];

  const targets = await loadSeriesEntries(existing, scope);
  let normalized;
  for (const t of targets) {
    const entry = normalizeEntry({ ...t, ...changes });
    assertCanWrite(user, entry, t);
    normalized = entry;
  }
  await assertPeopleExist(normalized);

  const update = {};
  for (const key of SERIES_FIELDS) if (key in changes) update[key] = normalized[key];

  const { error } = await db()
    .from('entries')
    .update({ ...update, updated_by: user.id, updated_at: new Date().toISOString() })
    .in('id', targets.map((t) => t.id));
  if (error) throw error;
  return json({ updated: targets.length });
});

export const DELETE = handler(async (request, { params }) => {
  const { user } = await guard(request, { login: true });
  const { id } = await params;
  const existing = await loadEntry(id);
  if (!isApprover(user) && existing.person_id !== user.id) {
    throw new HttpError('Sie können nur eigene Einträge löschen.', 403);
  }

  const scope = existing.series_id ? parseScope(new URL(request.url).searchParams.get('scope')) : 'single';
  const targets = await loadSeriesEntries(existing, scope);
  if (!isApprover(user) && targets.some((t) => t.person_id !== user.id)) {
    throw new HttpError('Sie können nur eigene Einträge löschen.', 403);
  }

  const { error } = await db().from('entries').delete().in('id', targets.map((t) => t.id));
  if (error) throw error;
  return json({ ok: true, deleted: targets.length });
});
