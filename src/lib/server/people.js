import 'server-only';
import { HttpError } from './api';
import { ROLES } from '../constants';

export const PERSON_FIELDS = 'id, name, short, email, role, active, sort';

export function normalizePerson(input) {
  const p = {
    name: String(input.name || '').trim().slice(0, 100),
    short: String(input.short || '').trim().slice(0, 6) || null,
    email: String(input.email || '').trim().toLowerCase() || null,
    role: input.role || 'mitarbeitend',
    active: input.active !== false,
    sort: Number.isFinite(Number(input.sort)) ? Math.trunc(Number(input.sort)) : 0,
  };
  if (!p.name) throw new HttpError('Bitte einen Namen eingeben.');
  if (p.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) throw new HttpError('Ungültige E-Mail-Adresse.');
  if (!ROLES.some((r) => r.id === p.role)) throw new HttpError('Ungültige Rolle.');
  return p;
}

export function mapDbError(error) {
  if (error?.code === '23505') return new HttpError('Diese E-Mail-Adresse ist bereits vergeben.', 409);
  return error;
}
