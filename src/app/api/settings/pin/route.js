import { guard, handler, json, readBody, HttpError } from '@/lib/server/api';
import { randomToken } from '@/lib/server/crypto';
import { hashPassword } from '@/lib/server/password';
import { getPinConfig, savePinConfig, removePin, pinProblem } from '@/lib/server/pin';

export const dynamic = 'force-dynamic';

// Status der Abteilungs-PIN (nur Admins)
export const GET = handler(async (request) => {
  await guard(request, { roles: ['admin'] });
  const cfg = await getPinConfig();
  return json({ active: !!cfg.hash });
});

// PIN setzen oder ändern – alle bisherigen PIN-Freischaltungen werden ungültig
export const PUT = handler(async (request) => {
  await guard(request, { roles: ['admin'] });
  const { pin } = await readBody(request);
  const value = String(pin || '').replace(/\s/g, '');
  const problem = pinProblem(value);
  if (problem) throw new HttpError(problem);
  await savePinConfig(await hashPassword(value), randomToken());
  return json({ active: true });
});

// PIN entfernen – Ansicht ist danach wieder ohne PIN sichtbar
export const DELETE = handler(async (request) => {
  await guard(request, { roles: ['admin'] });
  await removePin();
  return json({ active: false });
});
