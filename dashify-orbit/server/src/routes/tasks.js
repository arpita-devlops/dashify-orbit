import { Router } from 'express';
import { findAccessibleTask, logActivity, requireMembership, resolveAssignee } from '../access.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/errors.js';
import { Comment } from '../models/Comment.js';
import { PRIORITIES, STATUSES, Task } from '../models/Task.js';
import { Membership, ROLE_RANK } from '../models/Team.js';
import { User } from '../models/User.js';
import { emitToTeam, emitToUser } from '../realtime.js';
import { parseTaskInput } from '../validation.js';

const router = Router();
router.use(requireAuth);

const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const nameOf = async (userId) => (userId ? (await User.findById(userId).select('name').lean())?.name ?? 'Someone' : null);

router.get('/', async (req, res) => {
  const { q, status, priority, team } = req.query;
  let filter;
  if (typeof team === 'string' && team) {
    await requireMembership(team, req.userId);
    filter = { team };
  } else {
    filter = { user: req.userId, team: null };
  }
  if (typeof status === 'string' && STATUSES.includes(status)) filter.status = status;
  if (typeof priority === 'string' && PRIORITIES.includes(priority)) filter.priority = priority;
  if (typeof q === 'string' && q.trim()) {
    const rx = new RegExp(escapeRegex(q.trim().slice(0, 80)), 'i');
    filter.$or = [{ title: rx }, { description: rx }, { tags: rx }];
  }

  const tasks = await Task.find(filter).sort({ createdAt: -1 }).limit(500);
  res.json({ tasks });
});

router.post('/', async (req, res) => {
  const data = parseTaskInput(req.body);
  const teamId = typeof req.body?.team === 'string' && req.body.team ? req.body.team : null;
  if (teamId) {
    await requireMembership(teamId, req.userId, 'member');
    data.team = teamId;
    data.assignee = await resolveAssignee(teamId, req.body.assignee);
  }
  if (data.status === 'done') data.completedAt = new Date();

  const task = await Task.create({ ...data, user: req.userId });
  if (teamId) {
    emitToTeam(teamId, { type: 'task:upsert', task: task.toJSON() });
    await logActivity({ team: teamId, actor: req.userId, type: 'task.created', task, meta: { title: task.title, actorName: await nameOf(req.userId) } });
  }
  res.status(201).json({ task });
});

router.patch('/:id', async (req, res) => {
  const { task } = await findAccessibleTask(req.params.id, req.userId, 'member');
  const data = parseTaskInput(req.body, { partial: true });
  const before = { status: task.status, assignee: task.assignee ? String(task.assignee) : null };

  if (task.team && 'assignee' in (req.body ?? {})) data.assignee = await resolveAssignee(task.team, req.body.assignee);
  if ('status' in data && data.status !== task.status) {
    task.completedAt = data.status === 'done' ? new Date() : null;
  }
  if ('remindAt' in data && !('reminded' in data)) data.reminded = false;

  Object.assign(task, data);
  await task.save();

  if (task.team) {
    emitToTeam(task.team, { type: 'task:upsert', task: task.toJSON() });
    const actorName = await nameOf(req.userId);
    if (task.status !== before.status) {
      await logActivity({ team: task.team, actor: req.userId, type: 'task.status', task, meta: { title: task.title, actorName, from: before.status, to: task.status } });
    }
    const after = task.assignee ? String(task.assignee) : null;
    if (after !== before.assignee) {
      await logActivity({ team: task.team, actor: req.userId, type: 'task.assigned', task, meta: { title: task.title, actorName, assigneeName: await nameOf(after) } });
      if (after && after !== req.userId) emitToUser(after, { type: 'assigned', teamId: String(task.team), taskId: task.id, title: task.title, by: actorName });
    }
  }
  res.json({ task });
});

router.delete('/:id', async (req, res) => {
  const { task, membership } = await findAccessibleTask(req.params.id, req.userId, 'member');
  if (membership && ROLE_RANK[membership.role] < ROLE_RANK.admin && String(task.user) !== req.userId) {
    throw new HttpError(403, 'Only the task creator or a team admin can delete this task');
  }
  await task.deleteOne();
  await Comment.deleteMany({ task: task._id });

  if (task.team) {
    emitToTeam(task.team, { type: 'task:delete', taskId: task.id });
    await logActivity({ team: task.team, actor: req.userId, type: 'task.deleted', meta: { title: task.title, actorName: await nameOf(req.userId) } });
  }
  res.status(204).end();
});

router.get('/:id/comments', async (req, res) => {
  const { task } = await findAccessibleTask(req.params.id, req.userId);
  const comments = await Comment.find({ task: task._id }).sort({ createdAt: 1 }).limit(200);
  res.json({ comments });
});

const mentionsName = (body, name) => {
  const first = name.split(/\s+/)[0];
  return new RegExp(`@(${escapeRegex(name)}|${escapeRegex(first)})(?![\\p{L}\\d])`, 'iu').test(body);
};

// Viewers may comment — discussion is how read-only stakeholders give feedback.
router.post('/:id/comments', async (req, res) => {
  const { task } = await findAccessibleTask(req.params.id, req.userId);
  const body = String(req.body?.body ?? '').trim();
  if (!body || body.length > 1000) throw new HttpError(400, 'Comment must be 1–1000 characters');

  const authorName = await nameOf(req.userId);
  let mentions = [];
  if (task.team) {
    const members = await Membership.find({ team: task.team }).populate('user', 'name').lean();
    mentions = members.filter((m) => m.user && String(m.user._id) !== req.userId && mentionsName(body, m.user.name)).map((m) => m.user._id);
  }

  const comment = await Comment.create({ task: task._id, team: task.team, author: req.userId, authorName, body, mentions });
  if (task.team) {
    emitToTeam(task.team, { type: 'comment:new', comment: comment.toJSON() });
    await logActivity({ team: task.team, actor: req.userId, type: 'comment.added', task, meta: { title: task.title, actorName: authorName, snippet: body.slice(0, 90) } });
    mentions.forEach((uid) => emitToUser(uid, { type: 'mention', teamId: String(task.team), taskId: task.id, title: task.title, by: authorName }));
  }
  res.status(201).json({ comment });
});

export default router;
