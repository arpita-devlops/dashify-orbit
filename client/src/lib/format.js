export const PRIORITY_META = {
  urgent: { label: 'Urgent', text: 'text-coral', dot: 'bg-coral', soft: 'bg-coral/10 text-coral border-coral/25', bar: 'from-coral to-coral/40' },
  high: { label: 'High', text: 'text-accent', dot: 'bg-accent', soft: 'bg-accent/10 text-accent border-accent/25', bar: 'from-accent to-accent/40' },
  medium: { label: 'Medium', text: 'text-ion', dot: 'bg-ion', soft: 'bg-ion/10 text-ion border-ion/25', bar: 'from-ion to-ion/40' },
  low: { label: 'Low', text: 'text-mint', dot: 'bg-mint', soft: 'bg-mint/10 text-mint border-mint/25', bar: 'from-mint to-mint/40' },
};

export const STATUS_META = {
  todo: { label: 'To do', dot: 'bg-muted' },
  in_progress: { label: 'In progress', dot: 'bg-accent' },
  done: { label: 'Done', dot: 'bg-mint' },
};

export const PRIORITY_ORDER = ['urgent', 'high', 'medium', 'low'];

export function greeting(now = new Date()) {
  const h = now.getHours();
  if (h < 5) return 'Burning the midnight oil';
  if (h < 12) return 'Good morning';
  if (h < 17) return 'Good afternoon';
  return 'Good evening';
}

export const formatTime = (date) => new Date(date).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });

/** Compact, human due label + tone for chips. */
export function dueLabel(dueAt, now = new Date()) {
  if (!dueAt) return null;
  const due = new Date(dueAt);
  const dayDiff = Math.round((new Date(due).setHours(0, 0, 0, 0) - new Date(now).setHours(0, 0, 0, 0)) / 86_400_000);

  if (due < now) {
    const hours = Math.floor((now - due) / 3_600_000);
    return { text: hours < 24 ? `Overdue ${Math.max(hours, 1)}h` : `Overdue ${Math.floor(hours / 24)}d`, tone: 'overdue' };
  }
  if (dayDiff === 0) return { text: `Today ${formatTime(due)}`, tone: 'today' };
  if (dayDiff === 1) return { text: `Tomorrow ${formatTime(due)}`, tone: 'soon' };
  if (dayDiff < 7) return { text: due.toLocaleDateString(undefined, { weekday: 'short', hour: '2-digit', minute: '2-digit' }), tone: 'later' };
  return { text: due.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), tone: 'later' };
}

export const DUE_TONE = {
  overdue: 'text-coral bg-coral/10 border-coral/25',
  today: 'text-accent bg-accent/10 border-accent/25',
  soon: 'text-ion bg-ion/10 border-ion/25',
  later: 'text-muted bg-fg/[0.04] border-fg/10',
};

/** ISO → value for <input type="datetime-local"> in local time. */
export function toLocalInput(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export const minutesLabel = (mins) => (mins >= 60 ? `${Math.floor(mins / 60)}h${mins % 60 ? ` ${mins % 60}m` : ''}` : `${mins}m`);

export const initials = (name = '?') =>
  name.split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('') || '?';

export function timeAgo(date, now = Date.now()) {
  const secs = Math.round((now - new Date(date).getTime()) / 1000);
  if (secs < 45) return 'just now';
  const mins = Math.round(secs / 60);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.round(hrs / 24)}d ago`;
}

export const ROLE_META = {
  owner: { label: 'Owner', className: 'border-accent/30 bg-accent/10 text-accent' },
  admin: { label: 'Admin', className: 'border-lilac/30 bg-lilac/10 text-lilac' },
  member: { label: 'Member', className: 'border-ion/30 bg-ion/10 text-ion' },
  viewer: { label: 'Viewer', className: 'border-fg/15 bg-fg/[0.05] text-muted' },
};
