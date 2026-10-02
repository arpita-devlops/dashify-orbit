// Team intelligence: async standups and workload balancing.
// Shared verbatim with client/src/lib/team.js so the browser demo behaves identically.

const DAY_MS = 86_400_000;
const PRIORITY_RANK = { low: 0, medium: 1, high: 2, urgent: 3 };

const hours = (mins) => (mins >= 60 ? `${Math.round((mins / 60) * 10) / 10}h` : `${mins}m`);
const firstName = (name = '') => name.split(/\s+/)[0];

export function buildStandup(members, tasks, { now = new Date() } = {}) {
  const since = now.getTime() - DAY_MS;
  const byDue = (a, b) => (a.dueAt ? new Date(a.dueAt).getTime() : Infinity) - (b.dueAt ? new Date(b.dueAt).getTime() : Infinity);

  const report = members.map((m) => {
    const mine = tasks.filter((t) => t.assigneeId === m.id);
    return {
      userId: m.id,
      name: m.name,
      timezone: m.timezone,
      done: mine.filter((t) => t.status === 'done' && t.completedAt && new Date(t.completedAt).getTime() >= since).map((t) => t.title),
      doing: mine.filter((t) => t.status === 'in_progress').map((t) => t.title),
      next: mine.filter((t) => t.status === 'todo').sort(byDue).slice(0, 2).map((t) => t.title),
      blockers: mine.filter((t) => t.status !== 'done' && t.dueAt && new Date(t.dueAt) < now).map((t) => t.title),
    };
  });

  const shipped = report.reduce((sum, r) => sum + r.done.length, 0);
  const blocked = report.filter((r) => r.blockers.length);
  const unassigned = tasks.filter((t) => !t.assigneeId && t.status !== 'done').length;
  const active = report.filter((r) => r.done.length || r.doing.length).length;

  let summary = `${shipped} task${shipped === 1 ? '' : 's'} shipped in the last 24h with ${active} of ${members.length} teammates active.`;
  summary += blocked.length
    ? ` ${blocked.reduce((s, r) => s + r.blockers.length, 0)} overdue item(s) need attention — check in with ${blocked.map((r) => firstName(r.name)).join(', ')}.`
    : ' No blockers — the team is on track.';
  if (unassigned) summary += ` ${unassigned} open task${unassigned === 1 ? ' is' : 's are'} still unassigned.`;

  return { source: 'heuristic', generatedAt: now.toISOString(), summary, members: report };
}

export function workloadBalance(members, tasks) {
  const open = tasks.filter((t) => t.status !== 'done');
  const load = members.map((m) => {
    const mine = open.filter((t) => t.assigneeId === m.id);
    return {
      userId: m.id,
      name: m.name,
      count: mine.length,
      minutes: mine.reduce((sum, t) => sum + (t.estimateMins ?? 45), 0),
      critical: mine.filter((t) => PRIORITY_RANK[t.priority] >= 2).length,
    };
  });

  const average = load.reduce((sum, l) => sum + l.minutes, 0) / Math.max(load.length, 1);
  const withStatus = load.map((l) => ({
    ...l,
    status: l.minutes > average * 1.4 && l.minutes - average >= 45 ? 'overloaded' : l.minutes < average * 0.5 ? 'light' : 'balanced',
  }));

  const suggestions = [];
  const sorted = [...withStatus].sort((a, b) => b.minutes - a.minutes);
  const heavy = sorted[0];
  const light = sorted[sorted.length - 1];

  if (sorted.length > 1 && heavy.status === 'overloaded' && heavy.minutes - light.minutes >= 60) {
    const candidate = open
      .filter((t) => t.assigneeId === heavy.userId && t.status === 'todo')
      .sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority])[0];
    if (candidate) {
      suggestions.push({
        taskId: candidate.id,
        title: candidate.title,
        to: light.userId,
        toName: light.name,
        reason: `${firstName(heavy.name)} has ${hours(heavy.minutes)} queued while ${firstName(light.name)} has ${hours(light.minutes)}.`,
      });
    }
  }

  const unassigned = open.filter((t) => !t.assigneeId).sort((a, b) => PRIORITY_RANK[b.priority] - PRIORITY_RANK[a.priority]);
  if (unassigned.length && light) {
    suggestions.push({
      taskId: unassigned[0].id,
      title: unassigned[0].title,
      to: light.userId,
      toName: light.name,
      reason: `Unassigned ${unassigned[0].priority}-priority work — ${firstName(light.name)} has the most capacity.`,
    });
  }

  return { average, load: withStatus, suggestions };
}
