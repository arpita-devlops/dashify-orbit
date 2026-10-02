import {
  ArrowPathIcon,
  ArrowRightStartOnRectangleIcon,
  ClipboardDocumentIcon,
  ClockIcon,
  GlobeAltIcon,
  PencilSquareIcon,
  ScaleIcon,
  SparklesIcon,
  TrashIcon,
  UserGroupIcon,
  UserPlusIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { AnimatePresence, motion } from 'framer-motion';
import { useEffect, useMemo, useState } from 'react';
import Avatar from '../../components/app/Avatar';
import Button from '../../components/ui/Button';
import { EngineBadge } from '../../components/ui/Primitives';
import { useAppUi } from '../../context/AppUiContext';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useWorkspace } from '../../context/WorkspaceContext';
import { ROLE_META, STATUS_META, minutesLabel, timeAgo } from '../../lib/format';
import { workloadBalance } from '../../lib/team';
import { clockLabel, daySegments, isWorkingNow, localTimeIn, overlapSlots, tzCity, tzShortOffset, workWindowLocal } from '../../lib/timezones';

const BAR_COLORS = ['bg-accent', 'bg-ion', 'bg-mint', 'bg-lilac', 'bg-coral', 'bg-accent/70'];

function useNow(interval = 30_000) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), interval);
    return () => clearInterval(id);
  }, [interval]);
  return now;
}

const rise = {
  hidden: { opacity: 0, y: 18 },
  show: (i = 0) => ({ opacity: 1, y: 0, transition: { delay: i * 0.06, duration: 0.5, ease: [0.22, 1, 0.36, 1] } }),
};

function RoleBadge({ role }) {
  const meta = ROLE_META[role] ?? ROLE_META.member;
  return <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${meta.className}`}>{meta.label}</span>;
}

/* ---------------- Empty state (personal scope) ---------------- */
function TeamEmptyState() {
  const { teams, switchScope } = useWorkspace();
  const { openTeamModal } = useAppUi();
  const zones = [
    ['New York', 'bg-ion', '-left-2 top-6'],
    ['Berlin', 'bg-mint', 'right-0 top-0'],
    ['Pune', 'bg-accent', '-right-4 bottom-8'],
    ['Tokyo', 'bg-coral', 'left-4 bottom-0'],
  ];

  return (
    <div className="grid items-center gap-10 py-6 lg:grid-cols-2">
      <motion.div variants={rise} initial="hidden" animate="show">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-accent">Team workspaces</p>
        <h1 className="mt-3 font-display text-4xl font-bold tracking-tight">Plan together, across every time zone.</h1>
        <p className="mt-4 max-w-lg text-muted">
          Shared boards that update live, task assignment, comments with @mentions, a golden-hours finder for meetings, workload balancing and AI-written async standups.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Button size="lg" onClick={() => openTeamModal('create')}><UserGroupIcon className="h-5 w-5" /> Create a team</Button>
          <Button size="lg" variant="secondary" onClick={() => openTeamModal('join')}><UserPlusIcon className="h-5 w-5" /> Join with code</Button>
        </div>
        {teams.length > 0 && (
          <div className="mt-8">
            <p className="label">Your teams</p>
            <div className="flex flex-wrap gap-2">
              {teams.map((t) => (
                <button key={t.id} onClick={() => switchScope(t.id)} className="chip px-3 py-1.5 text-sm text-fg hover:border-accent/40">
                  {t.name} · {t.memberCount}
                </button>
              ))}
            </div>
          </div>
        )}
      </motion.div>

      <motion.div variants={rise} custom={1} initial="hidden" animate="show" className="relative mx-auto aspect-square w-full max-w-sm">
        <div className="absolute inset-[28%] rounded-full bg-gradient-to-br from-accent to-coral opacity-90 shadow-glow" />
        <div className="absolute inset-[12%] animate-spin-slow rounded-full border border-dashed border-ion/50" />
        <div className="absolute inset-0 animate-spin-slower rounded-full border border-fg/10" />
        {zones.map(([city, color, pos], i) => (
          <motion.div key={city} className={`card absolute flex items-center gap-2 px-3 py-2 text-xs font-semibold ${pos}`} animate={{ y: [0, -8, 0] }} transition={{ duration: 4 + i, repeat: Infinity, ease: 'easeInOut' }}>
            <span className={`h-2 w-2 rounded-full ${color}`} /> {city}
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

/* ---------------- Header ---------------- */
function TeamHeader() {
  const { currentTeam, teamInfo, role, renameTeam, regenerateCode, connection, online, members } = useWorkspace();
  const toast = useToast();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(currentTeam?.name ?? '');
  const [inviteOpen, setInviteOpen] = useState(false);
  const isAdmin = role === 'admin' || role === 'owner';
  const code = teamInfo?.team?.joinCode;

  const save = async (e) => {
    e.preventDefault();
    try {
      await renameTeam(name);
      setEditing(false);
    } catch (err) {
      toast.error(err.message);
    }
  };

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success('Invite code copied');
    } catch {
      toast.info(`Invite code: ${code}`);
    }
  };

  return (
    <motion.div variants={rise} initial="hidden" animate="show" className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <div className="flex items-center gap-2 text-xs text-muted">
          <span className="relative flex h-2 w-2">
            {connection === 'online' && <span className="absolute inline-flex h-full w-full animate-ping2 rounded-full bg-mint" />}
            <span className={`relative inline-flex h-2 w-2 rounded-full ${connection === 'online' ? 'bg-mint' : 'bg-muted'}`} />
          </span>
          {connection === 'online' ? 'Live' : 'Reconnecting…'} · {online.length} of {members.length} online
        </div>
        {editing ? (
          <form onSubmit={save} className="mt-1 flex items-center gap-2">
            <input autoFocus className="input max-w-xs font-display text-2xl font-bold" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} />
            <Button type="submit" size="sm">Save</Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
          </form>
        ) : (
          <h1 className="mt-1 flex items-center gap-3 font-display text-3xl font-bold tracking-tight">
            {currentTeam?.name}
            <RoleBadge role={role} />
            {isAdmin && (
              <button onClick={() => { setName(currentTeam?.name ?? ''); setEditing(true); }} className="rounded-lg p-1.5 text-muted hover:bg-fg/5 hover:text-fg" aria-label="Rename team">
                <PencilSquareIcon className="h-5 w-5" />
              </button>
            )}
          </h1>
        )}
      </div>

      {isAdmin && code && (
        <div className="relative">
          <Button variant="secondary" onClick={() => setInviteOpen((o) => !o)}>
            <UserPlusIcon className="h-4 w-4" /> Invite teammates
          </Button>
          <AnimatePresence>
            {inviteOpen && (
              <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} className="card absolute right-0 z-30 mt-2 w-80 bg-surface p-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold">Invite code</p>
                  <button onClick={() => setInviteOpen(false)} className="text-muted hover:text-fg" aria-label="Close"><XMarkIcon className="h-4 w-4" /></button>
                </div>
                <button onClick={copy} className="mt-3 flex w-full items-center justify-between rounded-xl border border-dashed border-accent/40 bg-accent/5 px-4 py-3 font-mono text-xl font-semibold tracking-[0.35em] text-accent">
                  {code} <ClipboardDocumentIcon className="h-5 w-5" />
                </button>
                <p className="mt-2 text-xs text-muted">Teammates join from <span className="font-semibold">Create or join a team → Join with code</span>. New members join as Members.</p>
                <Button size="sm" variant="ghost" className="mt-2" onClick={() => regenerateCode().then(() => toast.success('New invite code generated')).catch((err) => toast.error(err.message))}>
                  <ArrowPathIcon className="h-4 w-4" /> Regenerate code
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  );
}

/* ---------------- Members ---------------- */
function MemberCard({ member, now, index }) {
  const { user } = useAuth();
  const { role, online, setMemberRole, removeMember } = useWorkspace();
  const toast = useToast();
  const isMe = member.id === user.id;
  const working = isWorkingNow(member, now);
  const canManage = !isMe && member.role !== 'owner' && (role === 'owner' || (role === 'admin' && member.role !== 'admin'));
  const roleOptions = role === 'owner' ? ['admin', 'member', 'viewer'] : ['member', 'viewer'];

  return (
    <motion.div variants={rise} custom={index} initial="hidden" animate="show" className="card group relative p-4">
      <div className="flex items-start gap-3">
        <Avatar name={member.name} id={member.id} size="h-11 w-11 text-sm" online={online.includes(member.id)} />
        <div className="min-w-0 flex-1">
          <p className="truncate font-semibold">{member.name} {isMe && <span className="text-xs font-normal text-muted">(you)</span>}</p>
          <p className="truncate text-xs text-muted">{member.email}</p>
        </div>
        {canManage ? (
          <select
            value={member.role}
            onChange={(e) => setMemberRole(member.id, e.target.value).catch((err) => toast.error(err.message))}
            className="rounded-lg border border-fg/10 bg-elevated px-1.5 py-1 text-[11px] font-semibold"
            aria-label={`Role for ${member.name}`}
          >
            {roleOptions.map((r) => <option key={r} value={r}>{ROLE_META[r].label}</option>)}
          </select>
        ) : (
          <RoleBadge role={member.role} />
        )}
      </div>
      <div className="mt-4 flex items-end justify-between">
        <div>
          <p className="font-mono text-2xl font-semibold tabular-nums">{localTimeIn(member.timezone, now)}</p>
          <p className="text-xs text-muted">{tzCity(member.timezone)} · {tzShortOffset(member.timezone, now)}</p>
        </div>
        <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold ${working ? 'bg-mint/10 text-mint' : 'bg-fg/[0.05] text-muted'}`}>
          {working ? 'Working now' : 'Off hours'}
        </span>
      </div>
      {canManage && (
        <button
          onClick={() => removeMember(member.id).then(() => toast.success(`${member.name} removed`)).catch((err) => toast.error(err.message))}
          className="absolute right-2 top-12 hidden rounded-lg p-1 text-muted hover:bg-coral/10 hover:text-coral group-hover:block"
          aria-label={`Remove ${member.name}`}
          title="Remove from team"
        >
          <TrashIcon className="h-4 w-4" />
        </button>
      )}
    </motion.div>
  );
}

/* ---------------- Time-zone overlap ---------------- */
function OverlapChart({ members, now }) {
  const { slots, best } = useMemo(() => overlapSlots(members, now), [members, now]);
  const nowMin = now.getHours() * 60 + now.getMinutes();
  const pct = (m) => `${(m / 1440) * 100}%`;

  return (
    <section className="card p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><GlobeAltIcon className="h-5 w-5 text-ion" /> Golden hours</h2>
          <p className="text-sm text-muted">Everyone’s working hours, converted to your local time</p>
        </div>
        {best && (
          <div className="rounded-xl border border-accent/30 bg-accent/10 px-3 py-2 text-right">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-accent">Best overlap</p>
            <p className="font-mono text-sm font-semibold">{clockLabel(best.start)} – {clockLabel(best.end)}</p>
            <p className="text-[11px] text-muted">{best.count} of {members.length} available</p>
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-[7.5rem_1fr] gap-x-3 gap-y-2.5 text-xs">
        <span />
        <div className="relative h-4 font-mono text-[10px] text-muted">
          {[0, 3, 6, 9, 12, 15, 18, 21].map((h) => (
            <span key={h} className="absolute -translate-x-1/2" style={{ left: pct(h * 60) }}>{String(h).padStart(2, '0')}</span>
          ))}
        </div>

        {members.map((m, i) => (
          <div key={m.id} className="contents">
            <div className="flex min-w-0 items-center gap-2">
              <Avatar name={m.name} id={m.id} size="h-6 w-6 text-[9px]" />
              <span className="truncate">{m.name.split(' ')[0]}</span>
            </div>
            <div className="relative h-7 overflow-hidden rounded-lg bg-fg/[0.05]">
              {best && <div className="absolute inset-y-0 bg-accent/10" style={{ left: pct(best.start), width: pct(best.end - best.start) }} />}
              {daySegments(workWindowLocal(m, now)).map(([s, e], j) => (
                <motion.div
                  key={j}
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.1 + i * 0.08, duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                  className={`absolute inset-y-1 origin-left rounded-md ${BAR_COLORS[i % BAR_COLORS.length]} opacity-80`}
                  style={{ left: pct(s), width: pct(e - s) }}
                />
              ))}
              <div className="absolute inset-y-0 w-0.5 bg-coral" style={{ left: pct(nowMin) }} />
            </div>
          </div>
        ))}

        <span className="pt-1 text-[10px] uppercase tracking-wider text-muted">Coverage</span>
        <div className="flex h-5 items-end gap-px pt-1">
          {slots.map((count, i) => (
            <span key={i} className="flex-1 rounded-sm bg-ion" style={{ height: `${(count / Math.max(members.length, 1)) * 100}%`, opacity: count ? 0.25 + (count / members.length) * 0.75 : 0.08 }} />
          ))}
        </div>
      </div>
      <p className="mt-4 text-xs text-muted">
        {best ? 'Schedule syncs in the highlighted window; hand off async work outside it.' : 'No shared working hours — lean on comments and AI standups for async handoffs.'}{' '}
        <span className="text-coral">Red line</span> = now.
      </p>
    </section>
  );
}

/* ---------------- Workload ---------------- */
function WorkloadPanel({ members, tasks }) {
  const { updateTask, canEdit } = useWorkspace();
  const toast = useToast();
  const contributors = useMemo(() => members.filter((m) => m.role !== 'viewer'), [members]);
  const { load, suggestions } = useMemo(() => workloadBalance(contributors, tasks), [contributors, tasks]);
  const max = Math.max(...load.map((l) => l.minutes), 60);
  const tone = { overloaded: 'from-coral to-coral/50', balanced: 'from-ion to-ion/50', light: 'from-mint to-mint/50' };

  const apply = async (s) => {
    try {
      await updateTask(s.taskId, { assignee: s.to });
      toast.success(`“${s.title}” assigned to ${s.toName}`);
    } catch {
      // updateTask already surfaced the error
    }
  };

  return (
    <section className="card p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><ScaleIcon className="h-5 w-5 text-lilac" /> Workload balance</h2>
      <p className="text-sm text-muted">Open work per person, weighted by estimates</p>
      <ul className="mt-5 space-y-3">
        {load.map((l) => (
          <li key={l.userId}>
            <div className="mb-1 flex items-center justify-between text-xs">
              <span className="font-medium">{l.name}</span>
              <span className="text-muted">
                {l.count} tasks · {minutesLabel(l.minutes)}
                {l.status === 'overloaded' && <span className="ml-1.5 font-semibold text-coral">overloaded</span>}
              </span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-fg/[0.06]">
              <motion.div className={`h-full rounded-full bg-gradient-to-r ${tone[l.status]}`} initial={{ width: 0 }} animate={{ width: `${(l.minutes / max) * 100}%` }} transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }} />
            </div>
          </li>
        ))}
      </ul>
      {suggestions.length > 0 && (
        <div className="mt-5 space-y-2">
          <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-lilac"><SparklesIcon className="h-3.5 w-3.5" /> AI suggestions</p>
          {suggestions.map((s) => (
            <div key={s.taskId} className="flex items-center gap-3 rounded-xl border border-lilac/20 bg-lilac/[0.06] px-3 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">Assign “{s.title}” → {s.toName.split(' ')[0]}</p>
                <p className="text-xs text-muted">{s.reason}</p>
              </div>
              {canEdit && <Button size="sm" variant="secondary" onClick={() => apply(s)}>Apply</Button>}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

/* ---------------- Standup ---------------- */
function StandupPanel() {
  const { standup, generateStandup, members } = useWorkspace();
  const toast = useToast();
  const [loading, setLoading] = useState(false);

  const run = async () => {
    setLoading(true);
    try {
      await generateStandup();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  const copy = async () => {
    const text = [`Standup — ${new Date(standup.generatedAt).toLocaleString()}`, standup.summary, '', ...standup.members.map((m) =>
      [`*${m.name}*`, m.done.length && `  ✅ Done: ${m.done.join('; ')}`, m.doing.length && `  🔄 Doing: ${m.doing.join('; ')}`, m.next.length && `  ⏭ Next: ${m.next.join('; ')}`, m.blockers.length && `  ⚠️ Blockers: ${m.blockers.join('; ')}`].filter(Boolean).join('\n'),
    )].join('\n');
    try {
      await navigator.clipboard.writeText(text);
      toast.success('Standup copied — paste it into Slack or Teams');
    } catch {
      toast.error('Clipboard unavailable');
    }
  };

  const sections = [
    ['done', 'Done', 'text-mint'],
    ['doing', 'Doing', 'text-accent'],
    ['next', 'Next', 'text-ion'],
    ['blockers', 'Blockers', 'text-coral'],
  ];

  return (
    <section className="card relative overflow-hidden p-5 sm:p-6">
      <div className="pointer-events-none absolute -right-20 -top-20 h-56 w-56 rounded-full bg-lilac/15 blur-3xl" />
      <div className="relative flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><SparklesIcon className="h-5 w-5 text-accent" /> AI async standup</h2>
          <p className="text-sm text-muted">No meeting needed — a daily summary for teams that never share an office hour</p>
        </div>
        <div className="flex items-center gap-2">
          {standup && !loading && <EngineBadge source={standup.source} />}
          {standup && <Button size="sm" variant="ghost" onClick={copy}><ClipboardDocumentIcon className="h-4 w-4" /> Copy</Button>}
          <Button size="sm" variant="ai" onClick={run} loading={loading}>{standup ? 'Refresh' : 'Generate standup'}</Button>
        </div>
      </div>

      {loading ? (
        <div className="relative mt-5 grid gap-3 sm:grid-cols-2">{[0, 1, 2, 3].map((i) => <div key={i} className="h-28 animate-pulse rounded-xl bg-fg/[0.05]" />)}</div>
      ) : standup ? (
        <div className="relative mt-5">
          <p className="rounded-xl border border-fg/10 bg-elevated/70 px-4 py-3 text-sm leading-relaxed">{standup.summary}</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {standup.members.map((m, i) => {
              const member = members.find((x) => x.id === m.userId);
              return (
                <motion.div key={m.userId} variants={rise} custom={i} initial="hidden" animate="show" className="rounded-xl border border-fg/10 bg-surface/70 p-3.5">
                  <div className="mb-2 flex items-center gap-2">
                    <Avatar name={m.name} id={m.userId} size="h-7 w-7 text-[10px]" />
                    <p className="text-sm font-semibold">{m.name}</p>
                    {member && <span className="ml-auto text-[11px] text-muted">{tzCity(member.timezone)}</span>}
                  </div>
                  {sections.every(([key]) => !m[key].length) && <p className="text-xs text-muted">No tracked activity.</p>}
                  {sections.map(([key, label, color]) =>
                    m[key].length ? (
                      <p key={key} className="text-xs leading-relaxed">
                        <span className={`font-semibold ${color}`}>{label}: </span>
                        <span className="text-muted">{m[key].join(' · ')}</span>
                      </p>
                    ) : null,
                  )}
                </motion.div>
              );
            })}
          </div>
        </div>
      ) : (
        <p className="relative mt-5 rounded-xl border border-dashed border-fg/15 px-4 py-8 text-center text-sm text-muted">
          Generate a standup to see what shipped in the last 24h, what’s in flight and who’s blocked.
        </p>
      )}
    </section>
  );
}

/* ---------------- Activity ---------------- */
function describe(a) {
  const m = a.meta || {};
  const title = m.title ? <span className="font-medium text-fg">“{m.title}”</span> : null;
  switch (a.type) {
    case 'task.created': return <>created {title}</>;
    case 'task.status': return a.meta?.to === 'done' ? <>completed {title}</> : <>moved {title} to <span className="font-medium text-fg">{STATUS_META[m.to]?.label ?? m.to}</span></>;
    case 'task.assigned': return m.assigneeName ? <>assigned {title} to <span className="font-medium text-fg">{m.assigneeName}</span></> : <>unassigned {title}</>;
    case 'task.deleted': return <>deleted {title}</>;
    case 'comment.added': return <>commented on {title}{m.snippet && <span className="mt-0.5 block truncate text-muted/80">“{m.snippet}”</span>}</>;
    case 'member.joined': return <>joined the team 👋</>;
    case 'member.left': return <>left the team</>;
    case 'member.removed': return <>removed <span className="font-medium text-fg">{m.name}</span></>;
    case 'member.role': return <>made <span className="font-medium text-fg">{m.name}</span> {ROLE_META[m.role]?.label ?? m.role}</>;
    case 'team.created': return <>created the team</>;
    default: return <>updated the team</>;
  }
}

function ActivityFeed() {
  const { activity } = useWorkspace();
  const now = useNow(30_000);
  return (
    <section className="card flex max-h-[44rem] flex-col p-5 sm:p-6">
      <h2 className="flex items-center gap-2 font-display text-lg font-semibold"><ClockIcon className="h-5 w-5 text-mint" /> Live activity</h2>
      <p className="text-sm text-muted">Updates appear instantly from every teammate</p>
      <ol className="mt-4 flex-1 space-y-1 overflow-y-auto pr-1">
        {activity.length === 0 && <li className="py-8 text-center text-sm text-muted">No activity yet.</li>}
        <AnimatePresence initial={false}>
          {activity.map((a) => (
            <motion.li key={a.id} layout initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.5 }} className="relative flex gap-3 rounded-xl px-2 py-2.5">
              <motion.span className="pointer-events-none absolute inset-0 rounded-xl bg-accent/10" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ duration: 1.8 }} />
              <Avatar name={a.meta?.actorName ?? '?'} id={a.actorId} size="h-7 w-7 text-[10px]" />
              <div className="min-w-0 flex-1 text-sm text-muted">
                <span className="font-semibold text-fg">{a.meta?.actorName ?? 'Someone'}</span> {describe(a)}
                <p className="text-[11px] text-muted/80">{timeAgo(a.createdAt, now.getTime())}</p>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ol>
    </section>
  );
}

/* ---------------- Danger zone ---------------- */
function DangerZone() {
  const { role, leaveTeam, deleteTeam, currentTeam } = useWorkspace();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const isOwner = role === 'owner';

  const act = async () => {
    if (!confirm) return setConfirm(true);
    try {
      await (isOwner ? deleteTeam() : leaveTeam());
      toast.success(isOwner ? `“${currentTeam?.name}” deleted` : `You left “${currentTeam?.name}”`);
    } catch (err) {
      toast.error(err.message);
      setConfirm(false);
    }
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-coral/20 bg-coral/[0.04] px-5 py-4">
      <div>
        <p className="text-sm font-semibold">{isOwner ? 'Delete team' : 'Leave team'}</p>
        <p className="text-xs text-muted">{isOwner ? 'Permanently removes the board, comments and activity for everyone.' : 'Your assigned tasks will become unassigned.'}</p>
      </div>
      <Button variant="danger" size="sm" onClick={act}>
        {isOwner ? <TrashIcon className="h-4 w-4" /> : <ArrowRightStartOnRectangleIcon className="h-4 w-4" />}
        {confirm ? 'Click again to confirm' : isOwner ? 'Delete team' : 'Leave team'}
      </Button>
    </div>
  );
}

export default function Team() {
  const { teamId, members, tasks } = useWorkspace();
  const now = useNow(30_000);

  if (!teamId) return <TeamEmptyState />;

  return (
    <div className="space-y-6">
      <TeamHeader />
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {members.map((m, i) => <MemberCard key={m.id} member={m} now={now} index={i} />)}
      </div>
      <div className="grid gap-6 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-6">
          <OverlapChart members={members} now={now} />
          <StandupPanel />
          <WorkloadPanel members={members} tasks={tasks} />
        </div>
        <div className="xl:sticky xl:top-20 xl:self-start">
          <ActivityFeed />
        </div>
      </div>
      <DangerZone />
    </div>
  );
}
