'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { MONTHS, todayISO, monthStart, monthEnd, monthGridRange, monthDays } from '@/lib/dates';
import { TYPES, STATUSES, isApprover, isAdmin, roleLabel, buildColorMap } from '@/lib/constants';
import TeamView from './TeamView';
import MonthView from './MonthView';
import ListView from './ListView';
import YearView from './YearView';
import EntryDialog from './EntryDialog';
import LoginDialog from './LoginDialog';
import PeopleAdmin from './PeopleAdmin';
import PasswordDialog from './PasswordDialog';

const VIEWS = [
  { id: 'team', label: 'Team' },
  { id: 'month', label: 'Monat' },
  { id: 'year', label: 'Jahr' },
  { id: 'list', label: 'Liste' },
];

function storageGet(key, fallback) {
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}
function storageSet(key, value) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* Speicher nicht verfügbar – egal */
  }
}

function shiftMonth({ y, m }, n) {
  const d = new Date(Date.UTC(y, m + n, 1));
  return { y: d.getUTCFullYear(), m: d.getUTCMonth() };
}

export default function CalendarApp({ viewToken, title }) {
  const today = todayISO();
  const [cursor, setCursor] = useState({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 });
  const [view, setView] = useState('team');
  const [data, setData] = useState({ me: null, people: [], entries: [], pending: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expired, setExpired] = useState(false);
  const [personFilter, setPersonFilter] = useState('all');
  const [showRejected, setShowRejected] = useState(false);
  const [dialog, setDialog] = useState(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [adminOpen, setAdminOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    const v = storageGet('akal_view', 'team');
    if (VIEWS.some((x) => x.id === v)) setView(v);
  }, []);

  const api = useCallback(
    async (path, { method = 'GET', body } = {}) => {
      const res = await fetch(path, {
        method,
        credentials: 'same-origin',
        headers: { 'content-type': 'application/json', 'x-view-token': viewToken },
        body: body ? JSON.stringify(body) : undefined,
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (payload.code === 'view_expired') setExpired(true);
        const err = new Error(payload.error || 'Unbekannter Fehler');
        err.status = res.status;
        err.code = payload.code;
        throw err;
      }
      return payload;
    },
    [viewToken]
  );

  const range = useMemo(() => {
    if (view === 'month') return monthGridRange(cursor.y, cursor.m);
    if (view === 'year') return { from: `${cursor.y}-01-01`, to: `${cursor.y}-12-31` };
    if (view === 'list') {
      const end = shiftMonth(cursor, 2);
      return { from: monthStart(cursor.y, cursor.m), to: monthEnd(end.y, end.m) };
    }
    return { from: monthStart(cursor.y, cursor.m), to: monthEnd(cursor.y, cursor.m) };
  }, [view, cursor]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api(`/api/data?from=${range.from}&to=${range.to}`);
      setData(d);
      setError(null);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [api, range]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const me = data.me;
  const colorMap = useMemo(() => buildColorMap(data.people), [data.people]);
  const colorOf = (id) => colorMap.get(id) || '#5f6b7a';
  const step = view === 'year' ? 12 : 1;
  const pendingCount = useMemo(
    () => new Set(data.pending.map((e) => e.series_id || e.id)).size,
    [data.pending]
  );
  const personIds = useMemo(() => new Set(data.people.map((p) => p.id)), [data.people]);
  const people = useMemo(
    () => (personFilter === 'all' ? data.people : data.people.filter((p) => p.id === personFilter)),
    [data.people, personFilter]
  );
  const entries = useMemo(
    () =>
      data.entries.filter(
        (e) =>
          personIds.has(e.person_id) &&
          (showRejected || e.status !== 'abgelehnt') &&
          (personFilter === 'all' || e.person_id === personFilter)
      ),
    [data.entries, personIds, showRejected, personFilter]
  );

  const canEdit = (e) => !!me && (isApprover(me) || e.person_id === me.id);
  const canCreateFor = (pid) => !!me && (isApprover(me) || pid === me.id);

  const openEntry = (e) => setDialog({ mode: canEdit(e) ? 'edit' : 'view', entry: e });
  const openNew = (personId, date) => {
    if (!me) return;
    const pid = personId && canCreateFor(personId) ? personId : me.id;
    setDialog({
      mode: 'new',
      entry: { person_id: pid, type: 'urlaub', status: 'geplant', date_from: date || today, date_to: date || today },
    });
  };

  const changeView = (v) => {
    setView(v);
    storageSet('akal_view', v);
  };

  async function saveEntry(form, id) {
    const res = await api(id ? `/api/entries/${id}` : '/api/entries', { method: id ? 'PATCH' : 'POST', body: form });
    setDialog(null);
    if (form.repeat) {
      setToast(`${res.created} Serientermine angelegt${res.skipped ? `, ${res.skipped} übersprungen (bestehende Einträge)` : ''}`);
    } else {
      setToast(res.updated > 1 ? `${res.updated} Termine geändert` : 'Gespeichert');
    }
    load();
  }

  async function deleteEntry(id, scope = 'single') {
    const res = await api(`/api/entries/${id}?scope=${scope}`, { method: 'DELETE' });
    setDialog(null);
    setToast(res.deleted > 1 ? `${res.deleted} Termine gelöscht` : 'Eintrag gelöscht');
    load();
  }

  async function setStatus(id, status, scope = 'single') {
    try {
      const res = await api(`/api/entries/${id}`, { method: 'PATCH', body: { status, scope } });
      setDialog(null);
      const what = status === 'genehmigt' ? 'Genehmigt' : 'Abgelehnt';
      setToast(res.updated > 1 ? `${what}: ${res.updated} Termine` : what);
      load();
    } catch (e) {
      setToast(e.message);
    }
  }

  async function logout() {
    await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
    setToast('Abgemeldet');
    load();
  }

  const label =
    view === 'year'
      ? String(cursor.y)
      : view === 'list'
      ? (() => {
          const end = shiftMonth(cursor, 2);
          return `${MONTHS[cursor.m].slice(0, 3)} – ${MONTHS[end.m].slice(0, 3)} ${end.y}`;
        })()
      : `${MONTHS[cursor.m]} ${cursor.y}`;

  if (expired) {
    return (
      <main className="blocked">
        <div className="blocked-box">
          <strong>Ansicht abgelaufen</strong>
          <p>Die Seite war zu lange geöffnet.</p>
          <button className="btn primary" onClick={() => window.location.reload()}>Neu laden</button>
        </div>
      </main>
    );
  }

  return (
    <main className="app">
      <header className="topbar">
        <div className="title-row">
          <h1>{title}</h1>
          <div className="user-area">
            {me ? (
              <>
                <span className="who">
                  {me.name} <span className="role">{roleLabel(me.role)}</span>
                </span>
                <button className="btn primary" onClick={() => openNew(me.id, today)}>+ Eintrag</button>
                {isAdmin(me) && <button className="btn" onClick={() => setAdminOpen(true)}>Personen</button>}
                <button className="btn ghost" onClick={() => setPasswordOpen(true)}>Passwort</button>
                <button className="btn ghost" onClick={logout}>Abmelden</button>
              </>
            ) : (
              <button className="btn" onClick={() => setLoginOpen(true)}>Anmelden zum Bearbeiten</button>
            )}
          </div>
        </div>

        <div className="toolbar">
          <div className="nav">
            <button className="btn icon" aria-label="Zurück" onClick={() => setCursor((c) => shiftMonth(c, -step))}>‹</button>
            <button
              className="btn"
              onClick={() => setCursor({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 })}
            >
              Heute
            </button>
            <button className="btn icon" aria-label="Weiter" onClick={() => setCursor((c) => shiftMonth(c, step))}>›</button>
            <span className="period">{label}</span>
            {loading && <span className="spinner" aria-label="Lädt" />}
          </div>

          <div className="filters">
            <select value={personFilter} onChange={(e) => setPersonFilter(e.target.value)} aria-label="Person filtern">
              <option value="all">Alle Personen</option>
              {data.people.map((p) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
            <label className="check">
              <input type="checkbox" checked={showRejected} onChange={(e) => setShowRejected(e.target.checked)} />
              Abgelehnte
            </label>
            <div className="tabs" role="tablist">
              {VIEWS.map((v) => (
                <button
                  key={v.id}
                  role="tab"
                  aria-selected={view === v.id}
                  className={view === v.id ? 'tab active' : 'tab'}
                  onClick={() => changeView(v.id)}
                >
                  {v.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </header>

      {error && (
        <div className="alert">
          {error} <button className="link" onClick={load}>Erneut versuchen</button>
        </div>
      )}

      {isApprover(me) && pendingCount > 0 && view !== 'list' && (
        <button className="pending-hint" onClick={() => changeView('list')}>
          {pendingCount} offene{pendingCount === 1 ? 'r' : ''} Antrag
          {pendingCount === 1 ? '' : 'e'} – zur Liste
        </button>
      )}

      <section className="content">
        {view === 'team' && (
          <TeamView
            people={people}
            entries={entries}
            days={monthDays(cursor.y, cursor.m)}
            colorOf={colorOf}
            canCreateFor={canCreateFor}
            onOpen={openEntry}
            onNew={openNew}
          />
        )}
        {view === 'month' && (
          <MonthView
            cursor={cursor}
            people={data.people}
            entries={entries}
            colorOf={colorOf}
            loggedIn={!!me}
            onOpen={openEntry}
            onNew={(date) => openNew(personFilter !== 'all' ? personFilter : me?.id, date)}
          />
        )}
        {view === 'year' && (
          <YearView
            year={cursor.y}
            people={people}
            entries={entries}
            colorOf={colorOf}
            onPickMonth={(m) => {
              setCursor({ y: cursor.y, m });
              changeView('team');
            }}
          />
        )}
        {view === 'list' && (
          <ListView
            people={data.people}
            entries={entries}
            pending={isApprover(me) ? data.pending : []}
            colorOf={colorOf}
            onOpen={openEntry}
            onStatus={setStatus}
          />
        )}
      </section>

      <footer className="legend">
        {view !== 'team' &&
          people.map((p) => (
            <span key={p.id} className="legend-item">
              <i className="swatch" style={{ '--c': colorOf(p.id) }} />
              {p.short || p.name}
            </span>
          ))}
        {view !== 'team' && <span className="legend-sep" />}
        {TYPES.map((t) => (
          <span key={t.id} className="legend-item">
            <b className="type-letter">{t.short}</b>
            {t.label}
          </span>
        ))}
        <span className="legend-sep" />
        {STATUSES.filter((s) => s.id !== 'abgelehnt' || showRejected).map((s) => (
          <span key={s.id} className="legend-item">
            <i className={`swatch st-${s.id}`} style={{ '--c': '#5f6b7a' }} />
            {s.label}
          </span>
        ))}
        <span className="legend-item">
          <i className="swatch holiday" />
          Feiertag Hamburg
        </span>
      </footer>

      {dialog && (
        <EntryDialog
          mode={dialog.mode}
          entry={dialog.entry}
          people={data.people}
          me={me}
          onClose={() => setDialog(null)}
          onSave={saveEntry}
          onDelete={deleteEntry}
          onStatus={setStatus}
        />
      )}
      {loginOpen && (
        <LoginDialog
          api={api}
          onClose={() => setLoginOpen(false)}
          onDone={() => {
            setLoginOpen(false);
            setToast('Angemeldet');
            load();
          }}
        />
      )}
      {me && (me.mustChange || passwordOpen) && (
        <PasswordDialog
          api={api}
          forced={!!me.mustChange}
          onClose={() => setPasswordOpen(false)}
          onLogout={() => {
            setPasswordOpen(false);
            logout();
          }}
          onDone={() => {
            setPasswordOpen(false);
            setToast('Passwort gespeichert');
            load();
          }}
        />
      )}
      {adminOpen && (
        <PeopleAdmin
          api={api}
          me={me}
          onClose={() => {
            setAdminOpen(false);
            load();
          }}
        />
      )}
      {toast && <div className="toast" role="status">{toast}</div>}
    </main>
  );
}
