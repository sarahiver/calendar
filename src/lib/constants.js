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
