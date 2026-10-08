import 'server-only';
import { NextResponse } from 'next/server';
import { verifyViewToken } from './gate';
import { getSessionUser } from './auth';

export const json = (data, status = 200) => NextResponse.json(data, { status });
export const fail = (message, status = 400, code) =>
  NextResponse.json({ error: message, ...(code ? { code } : {}) }, { status });

export class HttpError extends Error {
  constructor(message, status = 400, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

/**
 * Jeder API-Aufruf braucht das View-Token aus dem iFrame-Seitenaufruf.
 * Optional: Anmeldung und bestimmte Rollen.
 */
export async function guard(request, { login = false, roles, allowMustChange = false } = {}) {
  if (!verifyViewToken(request.headers.get('x-view-token'))) {
    throw new HttpError('Ansicht abgelaufen. Bitte Seite neu laden.', 401, 'view_expired');
  }
  const user = await getSessionUser(request);
  if (login && !user) throw new HttpError('Bitte anmelden.', 401, 'login_required');
  // Mit Startpasswort darf nur das Passwort geändert werden
  if ((login || roles) && user?.must_change_password && !allowMustChange) {
    throw new HttpError('Bitte zuerst ein eigenes Passwort festlegen.', 403, 'must_change');
  }
  if (roles && (!user || !roles.includes(user.role))) {
    throw new HttpError('Dafür fehlt die Berechtigung.', 403, 'forbidden');
  }
  return { user };
}

// Einheitliche Fehlerbehandlung für Route-Handler
export function handler(fn) {
  return async (request, ctx) => {
    try {
      return await fn(request, ctx);
    } catch (e) {
      if (e instanceof HttpError) return fail(e.message, e.status, e.code);
      console.error(e);
      return fail('Interner Fehler. Bitte später erneut versuchen.', 500);
    }
  };
}

export async function readBody(request) {
  try {
    return await request.json();
  } catch {
    throw new HttpError('Ungültige Anfrage.', 400);
  }
}

export const isUuid = (s) =>
  typeof s === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
