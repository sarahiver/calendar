import { headers } from 'next/headers';
import { checkFrameAccess, issueViewToken } from '@/lib/server/gate';
import CalendarApp from '@/components/CalendarApp';

export const dynamic = 'force-dynamic';

const REASONS = {
  key: 'Zugangsschlüssel (?k=…) fehlt oder stimmt nicht mit ACCESS_KEY überein.',
  'not-framed': 'Der Browser meldet keinen iFrame-Aufruf.',
  'no-referer': 'SharePoint sendet keine Herkunftsangabe → ALLOW_MISSING_REFERER=true setzen.',
  'bad-referer': 'Herkunftsangabe ist ungültig.',
  origin: 'Herkunft passt nicht zu ALLOWED_ORIGIN.',
};

export default async function Page({ searchParams }) {
  const params = await searchParams;
  const h = await headers();
  const access = checkFrameAccess(h, params?.k);

  if (!access.ok) {
    const debug = process.env.GATE_DEBUG === 'true';
    let refOrigin = '–';
    try {
      refOrigin = h.get('referer') ? new URL(h.get('referer')).origin : '(keine)';
    } catch {
      refOrigin = '(ungültig)';
    }
    return (
      <main className="blocked">
        <div className="blocked-box">
          <strong>Kein Zugriff</strong>
          <p>Dieser Kalender ist nur über die Abteilungsseite im Intranet verfügbar.</p>
          {debug && (
            <dl className="debug">
              <dt>Grund</dt>
              <dd>{REASONS[access.reason] || access.reason}</dd>
              <dt>Schlüssel in URL</dt>
              <dd>{params?.k ? 'vorhanden' : 'fehlt'}</dd>
              <dt>Sec-Fetch-Dest</dt>
              <dd>{h.get('sec-fetch-dest') || '(keine)'}</dd>
              <dt>Herkunft</dt>
              <dd>{refOrigin}</dd>
              <dt>Erwartet</dt>
              <dd>{process.env.ALLOWED_ORIGIN || 'https://arbeitsbereiche.vbg.de'}</dd>
            </dl>
          )}
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
