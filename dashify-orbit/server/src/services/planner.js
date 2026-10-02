// Deterministic planning engine. Used as the AI fallback (no API key / API error) and in
// the browser demo mode, so this file is shared verbatim with client/src/lib/planner.js.

export const PRIORITY_WEIGHT = { low: 1, medium: 2, high: 3, urgent: 4 };
const DAY_MS = 86_400_000;

const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const toMinutes = (clock) => {
  const [h, m] = clock.split(':').map(Number);
  return h * 60 + m;
};

export const fromMinutes = (mins) =>
  `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`;

/** Deadline / momentum signals for a task, independent of its current priority. */
export function urgencySignals(task, { now = new Date(), focus = '' } = {}) {
  let score = 0;
  const reasons = [];

  if (task.dueAt) {
    const due = new Date(task.dueAt);
    const days = Math.round((startOfDay(due) - startOfDay(now)) / DAY_MS);
    if (due < now) {
      score += 25;
      reasons.push('overdue');
    } else if (days === 0) {
      score += 18;
      reasons.push('due today');
    } else if (days === 1) {
      score += 10;
      reasons.push('due tomorrow');
    } else if (days <= 3) {
      score += 5;
      reasons.push(`due in ${days} days`);
    }
  }

  if (task.status === 'in_progress') {
    score += 6;
    reasons.push('already in progress');
  }

  const words = focus.toLowerCase().split(/\W+/).filter((w) => w.length > 2);
  if (words.length) {
    const haystack = `${task.title} ${(task.tags || []).join(' ')} ${task.description || ''}`.toLowerCase();
    if (words.some((w) => haystack.includes(w))) {
      score += 8;
      reasons.push('matches your focus');
    }
  }

  if ((task.estimateMins ?? 45) <= 20) {
    score += 2;
    reasons.push('quick win');
  }

  return { score, reasons };
}

export function scoreTask(task, options) {
  const { score, reasons } = urgencySignals(task, options);
  return { score: score + (PRIORITY_WEIGHT[task.priority] ?? 2) * 10, reasons };
}

const priorityFromScore = (score) => {
  if (score >= 34) return 'urgent';
  if (score >= 21) return 'high';
  if (score >= 12) return 'medium';
  return 'low';
};

export function heuristicPrioritize(tasks, { now = new Date() } = {}) {
  const open = tasks.filter((t) => t.status !== 'done');
  const updates = [];
  let raised = 0;
  let lowered = 0;

  for (const task of open) {
    const { score, reasons } = urgencySignals(task, { now });
    const priority = priorityFromScore(score + (PRIORITY_WEIGHT[task.priority] ?? 2) * 7);
    if (priority === task.priority) continue;

    const up = PRIORITY_WEIGHT[priority] > PRIORITY_WEIGHT[task.priority];
    up ? raised++ : lowered++;
    const why = reasons.length ? reasons.join(', ') : 'no deadline pressure';
    updates.push({ id: task.id, priority, reason: `${up ? 'Raised' : 'Lowered'}: ${why}` });
  }

  const summary = updates.length
    ? `Re-ranked ${open.length} open tasks — ${raised} raised, ${lowered} lowered based on deadlines and momentum.`
    : `All ${open.length} open tasks already have sensible priorities.`;

  return { source: 'heuristic', summary, updates };
}

export function heuristicPlan(tasks, { focus = '', start = '09:00', end = '17:00', now = new Date() } = {}) {
  const open = tasks.filter((t) => t.status !== 'done');
  const ranked = open
    .map((task) => ({ task, ...scoreTask(task, { now, focus }) }))
    .sort((a, b) => b.score - a.score);

  const endMins = toMinutes(end);
  let cursor = toMinutes(start);
  let sinceBreak = 0;
  const blocks = [];

  for (const { task, reasons } of ranked) {
    const duration = Math.min(Math.max(task.estimateMins ?? 45, 15), 180);

    if (sinceBreak >= 90 && cursor + 15 <= endMins) {
      blocks.push({ type: 'break', taskId: null, start: fromMinutes(cursor), end: fromMinutes(cursor + 15), title: 'Recharge break', note: 'Step away, stretch and hydrate.' });
      cursor += 15;
      sinceBreak = 0;
    }
    if (cursor + duration > endMins) continue;

    const note = reasons.length ? reasons.join(' · ') : 'keeps momentum going';
    blocks.push({
      type: 'task',
      taskId: task.id,
      start: fromMinutes(cursor),
      end: fromMinutes(cursor + duration),
      title: task.title,
      priority: task.priority,
      note: note.charAt(0).toUpperCase() + note.slice(1),
    });
    cursor += duration;
    sinceBreak += duration;
  }

  const scheduled = blocks.filter((b) => b.type === 'task');
  const hours = Math.max((endMins - toMinutes(start)) / 60, 0);
  let summary;
  if (!open.length) summary = 'No open tasks — enjoy the free time or capture something new.';
  else if (!scheduled.length) summary = 'Your window is too short for any open task — try extending it.';
  else {
    summary = `${scheduled.length} of ${open.length} open tasks fit into your ${hours.toFixed(hours % 1 ? 1 : 0)}h window. Start with “${scheduled[0].title}” — ${scheduled[0].note.toLowerCase()}.`;
  }

  return { source: 'heuristic', summary, blocks };
}
