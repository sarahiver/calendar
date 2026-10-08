import { headers } from 'next/headers';
import { checkFrameAccess, issueViewToken } from '@/lib/server/gate';
import CalendarApp from '@/components/CalendarApp';

export const dynamic = 'force-dynamic';

export default async function Page({ searchParams }) {
  const params = await searchParams;
  const access = checkFrameAccess(await headers(), params?.k);

  if (!access.ok) {
    return (
      <main className="blocked">
        <div className="blocked-box">
          <strong>Kein Zugriff</strong>
          <p>Dieser Kalender ist nur über die Abteilungsseite im Intranet verfügbar.</p>
        </div>
      </main>
    );
  }

  return (
    <CalendarApp
      viewToken={issueViewToken()}
      title={process.env.APP_TITLE || 'Abwesenheitskalender'}
    />
  );
}
