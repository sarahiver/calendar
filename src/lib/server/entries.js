import 'server-only';
import { db } from './supabase';
import { HttpError, isUuid } from './api';
import { TYPES, STATUSES, SELF_STATUSES, isApprover } from '../constants';
import { isValidISO, diffDays } from '../dates';

export const ENTRY_PUBLIC_FIELDS = 'id, person_id, type, status, date_from, date_to, half_day, deputy_id';
export const ENTRY_FULL_FIELDS = `${ENTRY_PUBLIC_FIELDS}, note, updated_at`;

// Eingaben prüfen und normalisieren (Ergebnis = Datensatz ohne id)
export function normalizeEntry(input) {
  const e = {
    person_id: input.person_id,
    type: input.type,
    status: input.status || 'geplant',
    date_from: input.date_from,
    date_to: input.date_to || input.date_from,
    half_day: input.half_day || null,
    deputy_id: input.deputy_id || null,
    note: typeof input.note === 'string' ? input.note.trim().slice(0, 500) || null : null,
  };

  if (!isUuid(e.person_id)) throw new HttpError('Bitte eine Person auswählen.');
  if (!TYPES.some((t) => t.id === e.type)) throw new HttpError('Ungültige Art der Abwesenheit.');
  if (!STATUSES.some((s) => s.id === e.status)) throw new HttpError('Ungültiger Status.');
  if (!isValidISO(e.date_from) || !isValidISO(e.date_to)) throw new HttpError('Ungültiges Datum.');
  if (e.date_to < e.date_from) throw new HttpError('Das Enddatum liegt vor dem Startdatum.');
  if (diffDays(e.date_from, e.date_to) > 366) throw new HttpError('Zeitraum ist zu lang (max. 1 Jahr).');
  if (e.half_day && !['vormittags', 'nachmittags'].includes(e.half_day)) throw new HttpError('Ungültige Tageshälfte.');
  if (e.half_day && e.date_from !== e.date_to) throw new HttpError('Halbe Tage nur bei eintägigen Einträgen.');
  if (e.deputy_id && !isUuid(e.deputy_id)) throw new HttpError('Ungültige Vertretung.');
  if (e.deputy_id === e.person_id) throw new HttpError('Die Vertretung muss eine andere Person sein.');
  return e;
}

// Rechte prüfen. existing = bisheriger Eintrag (bei Änderung), sonst null.
export function assertCanWrite(user, entry, existing) {
  if (isApprover(user)) return;

  if (entry.person_id !== user.id || (existing && existing.person_id !== user.id)) {
    throw new HttpError('Sie können nur eigene Einträge bearbeiten.', 403);
  }
  if (SELF_STATUSES.includes(entry.status)) return;

  // Genehmigte/abgelehnte Einträge: nur unveränderte Rahmendaten (z. B. Notiz anpassen)
  const unchanged =
    existing &&
    entry.status === existing.status &&
    entry.date_from === existing.date_from &&
    entry.date_to === existing.date_to &&
    (entry.half_day || null) === (existing.half_day || null) &&
    entry.type === existing.type;
  if (!unchanged) {
    throw new HttpError('Genehmigen oder Ablehnen dürfen nur genehmigende Personen. Geänderte Einträge bitte neu beantragen.', 403);
  }
}

export async function assertPeopleExist(entry) {
  const ids = [entry.person_id, entry.deputy_id].filter(Boolean);
  const { data, error } = await db().from('people').select('id').in('id', ids);
  if (error) throw error;
  if ((data || []).length !== new Set(ids).size) throw new HttpError('Person nicht gefunden.');
}

// Überschneidungen derselben Person verhindern (abgelehnte zählen nicht)
export async function assertNoOverlap(entry, ignoreId) {
  let q = db()
    .from('entries')
    .select('id, date_from, date_to, half_day')
    .eq('person_id', entry.person_id)
    .neq('status', 'abgelehnt')
    .lte('date_from', entry.date_to)
    .gte('date_to', entry.date_from);
  if (ignoreId) q = q.neq('id', ignoreId);
  const { data, error } = await q;
  if (error) throw error;

  const conflict = (data || []).find((o) => {
    // Vormittag + Nachmittag am selben Tag ist erlaubt
    const bothHalf = entry.half_day && o.half_day && o.date_from === o.date_to && entry.date_from === o.date_from;
    return !(bothHalf && entry.half_day !== o.half_day);
  });
  if (conflict) throw new HttpError('Für diese Person gibt es in dem Zeitraum bereits einen Eintrag.', 409);
}

export async function loadEntry(id) {
  if (!isUuid(id)) throw new HttpError('Eintrag nicht gefunden.', 404);
  const { data, error } = await db().from('entries').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  if (!data) throw new HttpError('Eintrag nicht gefunden.', 404);
  return data;
}
