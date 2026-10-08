import { NextResponse } from 'next/server';
import { handler } from '@/lib/server/api';
import { deleteSession, sessionCookie } from '@/lib/server/auth';

export const dynamic = 'force-dynamic';

export const POST = handler(async (request) => {
  await deleteSession(request);
  const res = NextResponse.json({ ok: true });
  res.headers.append('Set-Cookie', sessionCookie('', 0));
  return res;
});
