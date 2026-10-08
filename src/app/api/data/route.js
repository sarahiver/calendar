import { db } from '@/lib/server/supabase';
import { guard, handler, json, HttpError } from '@/lib/server/api';
import { ENTRY_PUBLIC_FIELDS, ENTRY_FULL_FIELDS } from '@/lib/server/entries';
import { isValidISO, diffDays, todayISO } from '@/lib/dates';
import { isApprover } from '@/lib/constants';

export const dynamic = 'force-dynamic';

export const GET = handler(async (request) => {
  const { user } = await guard(request);
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');
  if (!isValidISO(from) || !isValidISO(to) || to < from || diffDays(from, to) > 400) {
    throw new HttpError('Ungültiger Zeitraum.');
  }

  const fields = user ? ENTRY_FULL_FIELDS : ENTRY_PUBLIC_FIELDS;

  const [people, entries, pending] = await Promise.all([
    db().from('people').select('id, name, short, sort, color').eq('active', true)
      .order('sort', { ascending: true }).order('name', { ascending: true }),
    db().from('entries').select(fields).lte('date_from', to).gte('date_to', from)
      .order('date_from', { ascending: true }),
    isApprover(user)
      ? db().from('entries').select(fields).eq('status', 'beantragt').gte('date_to', todayISO())
          .order('date_from', { ascending: true })
      : Promise.resolve({ data: [] }),
  ]);
  for (const r of [people, entries, pending]) if (r.error) throw r.error;

  return json({
    me: user
      ? { id: user.id, name: user.name, short: user.short, role: user.role, mustChange: !!user.must_change_password }
      : null,
    people: people.data,
    entries: entries.data,
    pending: pending.data,
  });
});
