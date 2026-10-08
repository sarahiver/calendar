export const TYPES = [
  { id: 'urlaub', label: 'Urlaub', short: 'U', color: '#2f7d5b' },
  { id: 'ausgleich', label: 'Gleitzeit / Ausgleich', short: 'G', color: '#2f6fae' },
  { id: 'dienstreise', label: 'Dienstreise', short: 'D', color: '#8156a3' },
  { id: 'fortbildung', label: 'Fortbildung', short: 'F', color: '#b8741a' },
  { id: 'abwesend', label: 'Sonstige Abwesenheit', short: 'A', color: '#5f6b7a' },
];

export const STATUSES = [
  { id: 'geplant', label: 'Geplant' },
  { id: 'beantragt', label: 'Beantragt' },
  { id: 'genehmigt', label: 'Genehmigt' },
  { id: 'abgelehnt', label: 'Abgelehnt' },
];

export const ROLES = [
  { id: 'mitarbeitend', label: 'Mitarbeitend' },
  { id: 'genehmigend', label: 'Genehmigend' },
  { id: 'admin', label: 'Admin' },
];

export const HALF_DAYS = [
  { id: '', label: 'Ganztägig' },
  { id: 'vormittags', label: 'Vormittags' },
  { id: 'nachmittags', label: 'Nachmittags' },
];

// Status, die Mitarbeitende selbst setzen dürfen
export const SELF_STATUSES = ['geplant', 'beantragt'];

export const typeById = (id) => TYPES.find((t) => t.id === id) || TYPES[TYPES.length - 1];
export const statusLabel = (id) => STATUSES.find((s) => s.id === id)?.label || id;
export const roleLabel = (id) => ROLES.find((r) => r.id === id)?.label || id;

export const isApprover = (user) => !!user && (user.role === 'genehmigend' || user.role === 'admin');
export const isAdmin = (user) => !!user && user.role === 'admin';

// Standardfarben für Personen ohne eigene Farbe (gut unterscheidbar, auf Weiß lesbar)
export const PERSON_COLORS = [
  '#1f6fb2', '#2f8a57', '#c0392b', '#8e44ad', '#d68910', '#16a085',
  '#b03a7a', '#5d6d7e', '#7d5a2f', '#2e86c1', '#6c8f1f', '#a04000',
];

export const isHexColor = (c) => typeof c === 'string' && /^#[0-9a-fA-F]{6}$/.test(c);

// Map personId -> Farbe (eigene Farbe oder Standardfarbe nach Reihenfolge)
// Automatische Farben überspringen Farben, die schon jemand fest gewählt hat.
export function buildColorMap(people) {
  const map = new Map();
  const taken = new Set(people.filter((p) => isHexColor(p.color)).map((p) => p.color.toLowerCase()));
  const free = PERSON_COLORS.filter((c) => !taken.has(c));
  const pool = free.length ? free : PERSON_COLORS;
  let n = 0;
  for (const p of people) {
    map.set(p.id, isHexColor(p.color) ? p.color : pool[n++ % pool.length]);
  }
  return map;
}
