import { Router } from 'express';
import { requireMembership } from '../access.js';
import { requireAuth } from '../middleware/auth.js';
import { Task } from '../models/Task.js';
import { emitToTeam } from '../realtime.js';
import { generatePlan, prioritizeTasks } from '../services/ai.js';
import { parseClock } from '../validation.js';

const router = Router();
router.use(requireAuth);

const teamParam = (req) => (typeof req.body?.team === 'string' && req.body.team ? req.body.team : null);

/** Personal scope → my personal tasks. Team scope → team tasks assigned to me (or nobody). */
async function planningScope(req, minRole = 'viewer') {
  const team = teamParam(req);
  if (!team) return { team: null, filter: { user: req.userId, team: null } };
  await requireMembership(team, req.userId, minRole);
  return { team, filter: { team } };
}

router.post('/plan', async (req, res) => {
  const focus = String(req.body?.focus ?? '').slice(0, 300);
  const start = parseClock(req.body?.start, '09:00');
  const end = parseClock(req.body?.end, '17:00');
  const { team, filter } = await planningScope(req);
  const query = team ? { ...filter, status: { $ne: 'done' }, assignee: { $in: [req.userId, null] } } : { ...filter, status: { $ne: 'done' } };
  const tasks = (await Task.find(query).limit(100)).map((t) => t.toJSON());
  res.json(await generatePlan(tasks, { focus, start, end, now: new Date() }));
});

router.post('/prioritize', async (req, res) => {
  const { team, filter } = await planningScope(req, 'member');
  const open = (await Task.find({ ...filter, status: { $ne: 'done' } }).limit(100)).map((t) => t.toJSON());
  const result = await prioritizeTasks(open, { now: new Date() });

  await Promise.all(result.updates.map((u) => Task.updateOne({ _id: u.id, ...filter }, { priority: u.priority, aiReason: u.reason })));
  const tasks = await Task.find(filter).sort({ createdAt: -1 }).limit(500);
  if (team) {
    const changed = new Set(result.updates.map((u) => u.id));
    tasks.filter((t) => changed.has(t.id)).forEach((t) => emitToTeam(team, { type: 'task:upsert', task: t.toJSON() }));
  }
  res.json({ ...result, tasks });
});

export default router;
