import 'server-only';
import { HttpError } from './api';
import { hashPassword, passwordProblem } from './password';
import { ROLES, isHexColor } from '../constants';

// password_hash wird nur gelesen, um "Passwort gesetzt" anzuzeigen – nie ausgeliefert
export const PERSON_SELECT = 'id, name, short, email, role, active, sort, color, password_hash, must_change_password';

export function publicPerson({ password_hash, ...p }) {
  return { ...p, has_password: !!password_hash };
}

export async function normalizePerson(input) {
  const p = {
    name: String(input.name || '').trim().slice(0, 100),
    short: String(input.short || '').trim().slice(0, 6) || null,
    email: String(input.email || '').trim().toLowerCase() || null,
    role: input.role || 'mitarbeitend',
    active: input.active !== false,
    sort: Number.isFinite(Number(input.sort)) ? Math.trunc(Number(input.sort)) : 0,
    color: input.color ? String(input.color).toLowerCase() : null,
  };
  if (p.color && !isHexColor(p.color)) throw new HttpError('Ungültige Farbe.');
  if (!p.name) throw new HttpError('Bitte einen Namen eingeben.');
  if (p.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(p.email)) throw new HttpError('Ungültige E-Mail-Adresse.');
  if (!ROLES.some((r) => r.id === p.role)) throw new HttpError('Ungültige Rolle.');

  // Optional: Startpasswort durch Admin setzen → Person muss es bei der ersten Anmeldung ändern
  if (input.password) {
    if (!p.email) throw new HttpError('Für ein Passwort wird eine E-Mail-Adresse benötigt.');
    const problem = passwordProblem(input.password);
    if (problem) throw new HttpError(problem);
    p.password_hash = await hashPassword(input.password);
    p.must_change_password = true;
  }
  return p;
}

export function mapDbError(error) {
  if (error?.code === '23505') return new HttpError('Diese E-Mail-Adresse ist bereits vergeben.', 409);
  return error;
}
