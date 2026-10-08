import crypto from 'node:crypto';
import { db } from '@/lib/server/supabase';
import { guard, handler, json, readBody, HttpError } from '@/lib/server/api';
import {
  normalizeEntry, assertCanWrite, assertPeopleExist, assertNoOverlap, ENTRY_FULL_FIELDS,
} from '@/lib/server/entries';
import { seriesDates, SERIES_WEEKDAYS, SERIES_MAX_DAYS, SERIES_MAX_OCCURRENCES } from '@/lib/series';
import { isValidISO, diffDays } from '@/lib/dates';

export const dynamic = 'force-dynamic';

export const POST = handler(async (request) => {
  const { user } = await guard(request, { login: true });
  const body = await readBody(request);

  if (body.repeat) return createSeries(user, body);

  const entry = normalizeEntry(body);
  assertCanWrite(user, entry, null);
  await assertPeopleExist(entry);
  await assertNoOverlap(entry);

  const { data, error } = await db()
    .from('entries')
    .insert({ ...entry, created_by: user.id, updated_by: user.id })
    .select(ENTRY_FULL_FIELDS)
    .single();
  if (error) throw error;
  return json({ entry: data, created: 1, skipped: 0 }, 201);
});

// Wöchentliche Serie: ein eintägiger Termin pro Vorkommen, gemeinsame series_id
async function createSeries(user, body) {
  const { weekdays, interval, until } = body.repeat || {};
  const days = Array.isArray(weekdays) ? [...new Set(weekdays.map(Number))].filter((d) => SERIES_WEEKDAYS.includes(d)) : [];
  const step = [1, 2, 3, 4].includes(Number(interval)) ? Number(interval) : 1;

  const base = normalizeEntry({ ...body, date_to: body.date_from });
  if (!days.length) throw new HttpError('Bitte mindestens einen Wochentag für die Serie wählen.');
  if (!isValidISO(until) || until < base.date_from) throw new HttpError('Bitte ein gültiges Enddatum für die Serie wählen.');
  if (diffDays(base.date_from, until) > SERIES_MAX_DAYS) throw new HttpError('Serien dürfen höchstens ein Jahr umfassen.');

  assertCanWrite(user, base, null);
  await assertPeopleExist(base);

  const dates = seriesDates(base.date_from, until, days, step);
  if (!dates.length) throw new HttpError('Im gewählten Zeitraum gibt es keinen passenden Arbeitstag.');
  if (dates.length > SERIES_MAX_OCCURRENCES) throw new HttpError('Zu viele Termine in der Serie.');

  // Tage überspringen, an denen die Person schon einen Eintrag hat
  const { data: existing, error: exError } = await db()
    .from('entries')
    .select('date_from, date_to, half_day')
    .eq('person_id', base.person_id)
    .neq('status', 'abgelehnt')
    .lte('date_from', dates[dates.length - 1])
    .gte('date_to', dates[0]);
  if (exError) throw exError;

  const blocked = (d) =>
    existing.some((o) => {
      if (o.date_from > d || o.date_to < d) return false;
      const bothHalf = base.half_day && o.half_day && o.date_from === o.date_to;
      return !(bothHalf && base.half_day !== o.half_day);
    });

  const free = dates.filter((d) => !blocked(d));
  if (!free.length) throw new HttpError('An allen Serienterminen gibt es bereits Einträge.', 409);

  const seriesId = crypto.randomUUID();
  const rows = free.map((d) => ({
    ...base,
    date_from: d,
    date_to: d,
    series_id: seriesId,
    created_by: user.id,
    updated_by: user.id,
  }));

  const { error } = await db().from('entries').insert(rows);
  if (error) throw error;
  return json({ created: free.length, skipped: dates.length - free.length, series_id: seriesId }, 201);
}
