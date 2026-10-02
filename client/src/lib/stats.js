import { scoreTask } from './planner';

const DAY_MS = 86_400_000;

export const startOfDay = (date) => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
};

export const isSameDay = (a, b) => startOfDay(a).getTime() === startOfDay(b).getTime();

/** Last 7 days (oldest → today) with completed-task counts and focus minutes. */
export function weeklyActivity(tasks, sessions, now = new Date()) {
  const today = startOfDay(now);
  return Array.from({ length: 7 }, (_, i) => {
    const date = new Date(today.getTime() - (6 - i) * DAY_MS);
    return {
      date,
      label: date.toLocaleDateString(undefined, { weekday: 'short' }),
      completed: tasks.filter((t) => t.completedAt && isSameDay(t.completedAt, date)).length,
      focus: sessions.filter((s) => isSameDay(s.startedAt, date)).reduce((sum, s) => sum + s.minutes, 0),
    };
  });
}

export function streak(tasks, sessions, now = new Date()) {
  const active = new Set([
    ...tasks.filter((t) => t.completedAt).map((t) => startOfDay(t.completedAt).getTime()),
    ...sessions.map((s) => startOfDay(s.startedAt).getTime()),
  ]);
  let day = startOfDay(now).getTime();
  if (!active.has(day)) day -= DAY_MS; // today isn't over yet
  let count = 0;
  while (active.has(day)) {
    count++;
    day -= DAY_MS;
  }
  return count;
}

export function workspaceStats(tasks, sessions, now = new Date()) {
  const weekAgo = now.getTime() - 7 * DAY_MS;
  const open = tasks.filter((t) => t.status !== 'done');
  const overdue = open.filter((t) => t.dueAt && new Date(t.dueAt) < now);
  const dueToday = open.filter((t) => t.dueAt && isSameDay(t.dueAt, now));
  const completedWeek = tasks.filter((t) => t.completedAt && new Date(t.completedAt).getTime() >= weekAgo);
  const focusWeek = sessions.filter((s) => new Date(s.startedAt).getTime() >= weekAgo).reduce((sum, s) => sum + s.minutes, 0);
  const focusToday = sessions.filter((s) => isSameDay(s.startedAt, now)).reduce((sum, s) => sum + s.minutes, 0);

  const completionRate = completedWeek.length / Math.max(completedWeek.length + overdue.length + dueToday.length, 1);
  const score = Math.round(
    Math.min(100, Math.max(0, completionRate * 55 + Math.min(focusWeek / 600, 1) * 30 + (overdue.length ? 0 : 15) - overdue.length * 3)),
  );

  const priorityCounts = { urgent: 0, high: 0, medium: 0, low: 0 };
  open.forEach((t) => {
    priorityCounts[t.priority] = (priorityCounts[t.priority] || 0) + 1;
  });

  return {
    open: open.length,
    inProgress: open.filter((t) => t.status === 'in_progress').length,
    overdue: overdue.length,
    dueToday: dueToday.length,
    completedWeek: completedWeek.length,
    focusWeek,
    focusToday,
    score,
    streak: streak(tasks, sessions, now),
    priorityCounts,
  };
}

export const rankTasks = (tasks, now = new Date()) =>
  tasks
    .filter((t) => t.status !== 'done')
    .map((t) => ({ task: t, score: scoreTask(t, { now }).score }))
    .sort((a, b) => b.score - a.score)
    .map(({ task }) => task);
