import { config } from '../config.js';
import { heuristicPlan, heuristicPrioritize } from './planner.js';
import { buildStandup } from './team.js';

const CLOCK_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const PRIORITIES = new Set(['low', 'medium', 'high', 'urgent']);

async function chatJSON(system, payload) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.openaiKey}` },
    body: JSON.stringify({
      model: config.openaiModel,
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: JSON.stringify(payload) },
      ],
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!res.ok) throw new Error(`OpenAI request failed with ${res.status}`);
  const data = await res.json();
  return JSON.parse(data.choices?.[0]?.message?.content ?? '{}');
}

// Only send the fields the model needs — never user ids or emails.
const slim = (t) => ({ id: t.id, title: t.title, priority: t.priority, status: t.status, dueAt: t.dueAt, estimateMins: t.estimateMins, tags: t.tags });

async function openaiPlan(tasks, { focus, start, end, now }) {
  const parsed = await chatJSON(
    'You are Dashify, a pragmatic productivity planner. Build a realistic, time-blocked schedule for today using ONLY the provided tasks. ' +
      'Respect the time window, put overdue/urgent work first, group related work, and add a 10–15 minute break after roughly 90 minutes of focus. ' +
      'Reply with JSON: {"summary": string (max 2 sentences, motivating and specific), "blocks": [{"type": "task"|"break", "taskId": string|null, "start": "HH:MM", "end": "HH:MM", "note": string (max 12 words, why this slot)}]}',
    { now: now.toISOString(), window: { start, end }, focus, tasks: tasks.map(slim) },
  );

  const byId = new Map(tasks.map((t) => [t.id, t]));
  const blocks = (Array.isArray(parsed.blocks) ? parsed.blocks : [])
    .filter((b) => CLOCK_RE.test(b?.start) && CLOCK_RE.test(b?.end) && b.start < b.end)
    .filter((b) => b.type === 'break' || byId.has(b.taskId))
    .slice(0, 20)
    .map((b) => {
      const task = byId.get(b.taskId);
      return task
        ? { type: 'task', taskId: task.id, start: b.start, end: b.end, title: task.title, priority: task.priority, note: String(b.note || '').slice(0, 120) }
        : { type: 'break', taskId: null, start: b.start, end: b.end, title: 'Recharge break', note: String(b.note || 'Step away and recharge.').slice(0, 120) };
    });

  if (!blocks.length) throw new Error('OpenAI returned an empty plan');
  return { source: 'openai', summary: String(parsed.summary || '').slice(0, 400), blocks };
}

async function openaiPrioritize(tasks, { now }) {
  const parsed = await chatJSON(
    'You are Dashify, a productivity assistant. Re-assess the priority (low|medium|high|urgent) of each open task using deadlines, status and impact. ' +
      'Only include tasks whose priority should change. Reply with JSON: {"summary": string (1 sentence), "updates": [{"id": string, "priority": string, "reason": string (max 12 words)}]}',
    { now: now.toISOString(), tasks: tasks.map(slim) },
  );

  const byId = new Map(tasks.map((t) => [t.id, t]));
  const updates = (Array.isArray(parsed.updates) ? parsed.updates : [])
    .filter((u) => byId.has(u?.id) && PRIORITIES.has(u.priority) && u.priority !== byId.get(u.id).priority)
    .map((u) => ({ id: u.id, priority: u.priority, reason: String(u.reason || '').slice(0, 200) }));

  return { source: 'openai', summary: String(parsed.summary || '').slice(0, 300), updates };
}

export async function generatePlan(tasks, options) {
  if (config.openaiKey) {
    try {
      return await openaiPlan(tasks, options);
    } catch (err) {
      console.warn('[ai] plan fell back to heuristic:', err.message);
    }
  }
  return heuristicPlan(tasks, options);
}

export async function prioritizeTasks(tasks, options) {
  if (config.openaiKey) {
    try {
      return await openaiPrioritize(tasks, options);
    } catch (err) {
      console.warn('[ai] prioritize fell back to heuristic:', err.message);
    }
  }
  return heuristicPrioritize(tasks, options);
}

/** Async standup for distributed teams: structured per-person report + an LLM-written summary when available. */
export async function teamStandup(members, tasks, options) {
  const report = buildStandup(members, tasks, options);
  if (!config.openaiKey) return report;
  try {
    const parsed = await chatJSON(
      'You are Dashify, writing an async standup for a distributed software team. Using the structured report, write a crisp 2–3 sentence summary for the team lead: ' +
        'what shipped, what is in flight, and any blockers or people who need help. Reply with JSON: {"summary": string}',
      { members: report.members.map(({ name, done, doing, next, blockers }) => ({ name, done, doing, next, blockers })) },
    );
    if (typeof parsed.summary === 'string' && parsed.summary.trim()) {
      return { ...report, source: 'openai', summary: parsed.summary.trim().slice(0, 600) };
    }
  } catch (err) {
    console.warn('[ai] standup fell back to heuristic:', err.message);
  }
  return report;
}
