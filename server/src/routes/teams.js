import { Router } from 'express';
import mongoose from 'mongoose';
import { logActivity, requireMembership } from '../access.js';
import { requireAuth } from '../middleware/auth.js';
import { HttpError } from '../middleware/errors.js';
import { Activity } from '../models/Activity.js';
import { Comment } from '../models/Comment.js';
import { Task } from '../models/Task.js';
import { Membership, ROLE_RANK, Team, generateJoinCode } from '../models/Team.js';
import { User } from '../models/User.js';
import { closeTeamRoom, emitToTeam, emitToUser, joinTeamRoom, leaveTeamRoom } from '../realtime.js';
import { teamStandup } from '../services/ai.js';

const router = Router();
router.use(requireAuth);

const CODE_RE = /^[A-Z2-9]{8}$/;
const ASSIGNABLE_ROLES = ['viewer', 'member', 'admin'];

const readName = (body) => {
  const name = String(body?.name ?? '').trim();
  if (!name || name.length > 60) throw new HttpError(400, 'Team name must be 1–60 characters');
  return name;
};

async function uniqueJoinCode() {
  for (let i = 0; i < 5; i++) {
    const code = generateJoinCode();
    if (!(await Team.exists({ joinCode: code }))) return code;
  }
  throw new HttpError(500, 'Could not generate an invite code');
}

// Only admins see the invite code; everyone else gets the team without it.
const teamView = (team, role, extra = {}) => {
  const json = team.toJSON();
  if (ROLE_RANK[role] < ROLE_RANK.admin) delete json.joinCode;
  return { ...json, role, ...extra };
};

const actorName = async (userId) => (await User.findById(userId).select('name').lean())?.name ?? 'Someone';

router.get('/', async (req, res) => {
  const memberships = (await Membership.find({ user: req.userId }).populate('team')).filter((m) => m.team);
  const counts = await Membership.aggregate([{ $match: { team: { $in: memberships.map((m) => m.team._id) } } }, { $group: { _id: '$team', count: { $sum: 1 } } }]);
  const countMap = new Map(counts.map((c) => [String(c._id), c.count]));
  const teams = memberships.map((m) => teamView(m.team, m.role, { memberCount: countMap.get(String(m.team._id)) ?? 1 }));
  res.json({ teams });
});

router.post('/', async (req, res) => {
  const name = readName(req.body);
  const team = await Team.create({ name, joinCode: await uniqueJoinCode(), createdBy: req.userId });
  await Membership.create({ team: team._id, user: req.userId, role: 'owner' });
  joinTeamRoom(req.userId, team.id);
  await logActivity({ team: team._id, actor: req.userId, type: 'team.created', meta: { actorName: await actorName(req.userId), name } });
  res.status(201).json({ team: teamView(team, 'owner', { memberCount: 1 }) });
});

router.post('/join', async (req, res) => {
  const code = String(req.body?.code ?? '').trim().toUpperCase();
  if (!CODE_RE.test(code)) throw new HttpError(400, 'Invite codes are 8 characters, e.g. K7QM2XPA');
  const team = await Team.findOne({ joinCode: code });
  if (!team) throw new HttpError(404, 'No team found for that invite code');
  if (await Membership.exists({ team: team._id, user: req.userId })) throw new HttpError(409, 'You are already a member of this team');

  await Membership.create({ team: team._id, user: req.userId, role: 'member' });
  joinTeamRoom(req.userId, team.id);
  await logActivity({ team: team._id, actor: req.userId, type: 'member.joined', meta: { actorName: await actorName(req.userId) } });
  emitToTeam(team._id, { type: 'members:changed' });
  res.status(201).json({ team: teamView(team, 'member', { memberCount: await Membership.countDocuments({ team: team._id }) }) });
});

router.get('/:id', async (req, res) => {
  const membership = await requireMembership(req.params.id, req.userId);
  const team = await Team.findById(req.params.id);
  const memberships = await Membership.find({ team: team._id }).populate('user', 'name email timezone workStart workEnd').sort({ createdAt: 1 }).lean();
  const members = memberships
    .filter((m) => m.user)
    .map((m) => ({
      id: String(m.user._id),
      name: m.user.name,
      email: m.user.email,
      timezone: m.user.timezone || 'UTC',
      workStart: m.user.workStart || '09:00',
      workEnd: m.user.workEnd || '18:00',
      role: m.role,
      joinedAt: m.createdAt,
    }));
  res.json({ team: teamView(team, membership.role, { memberCount: members.length }), role: membership.role, members });
});

router.patch('/:id', async (req, res) => {
  const membership = await requireMembership(req.params.id, req.userId, 'admin');
  const team = await Team.findByIdAndUpdate(req.params.id, { name: readName(req.body) }, { new: true });
  emitToTeam(team._id, { type: 'members:changed' });
  res.json({ team: teamView(team, membership.role) });
});

router.delete('/:id', async (req, res) => {
  await requireMembership(req.params.id, req.userId, 'owner');
  const teamId = new mongoose.Types.ObjectId(String(req.params.id));
  emitToTeam(teamId, { type: 'team:deleted' });
  closeTeamRoom(String(teamId));
  await Promise.all([
    Team.deleteOne({ _id: teamId }),
    Membership.deleteMany({ team: teamId }),
    Task.deleteMany({ team: teamId }),
    Comment.deleteMany({ team: teamId }),
    Activity.deleteMany({ team: teamId }),
  ]);
  res.status(204).end();
});

router.post('/:id/code', async (req, res) => {
  const membership = await requireMembership(req.params.id, req.userId, 'admin');
  const team = await Team.findByIdAndUpdate(req.params.id, { joinCode: await uniqueJoinCode() }, { new: true });
  res.json({ team: teamView(team, membership.role) });
});

router.patch('/:id/members/:userId', async (req, res) => {
  const me = await requireMembership(req.params.id, req.userId, 'admin');
  const role = req.body?.role;
  if (!ASSIGNABLE_ROLES.includes(role)) throw new HttpError(400, 'Role must be viewer, member or admin');
  if (!mongoose.isValidObjectId(req.params.userId)) throw new HttpError(404, 'Member not found');

  const target = await Membership.findOne({ team: req.params.id, user: req.params.userId });
  if (!target) throw new HttpError(404, 'Member not found');
  if (target.role === 'owner') throw new HttpError(400, "The owner's role can't be changed");
  if ((role === 'admin' || target.role === 'admin') && me.role !== 'owner') throw new HttpError(403, 'Only the owner can grant or revoke admin');

  target.role = role;
  await target.save();
  await logActivity({ team: target.team, actor: req.userId, type: 'member.role', meta: { actorName: await actorName(req.userId), name: await actorName(target.user), role } });
  emitToTeam(target.team, { type: 'members:changed' });
  res.json({ ok: true });
});

router.delete('/:id/members/:userId', async (req, res) => {
  const leaving = req.params.userId === req.userId;
  const me = await requireMembership(req.params.id, req.userId, leaving ? 'viewer' : 'admin');
  if (!mongoose.isValidObjectId(req.params.userId)) throw new HttpError(404, 'Member not found');

  const target = leaving ? me : await Membership.findOne({ team: req.params.id, user: req.params.userId });
  if (!target) throw new HttpError(404, 'Member not found');
  if (target.role === 'owner') throw new HttpError(400, leaving ? 'Owners can’t leave — delete the team or transfer it first' : "The owner can't be removed");
  if (!leaving && target.role === 'admin' && me.role !== 'owner') throw new HttpError(403, 'Only the owner can remove an admin');

  await target.deleteOne();
  await Task.updateMany({ team: target.team, assignee: target.user }, { assignee: null });
  leaveTeamRoom(String(target.user), String(target.team));
  const name = await actorName(target.user);
  await logActivity({
    team: target.team,
    actor: req.userId,
    type: leaving ? 'member.left' : 'member.removed',
    meta: { actorName: leaving ? name : await actorName(req.userId), name },
  });
  emitToTeam(target.team, { type: 'members:changed' });
  if (!leaving) emitToUser(String(target.user), { type: 'team:removed', teamId: String(target.team) });
  res.status(204).end();
});

router.get('/:id/activity', async (req, res) => {
  await requireMembership(req.params.id, req.userId);
  const activity = await Activity.find({ team: req.params.id }).sort({ createdAt: -1 }).limit(60);
  res.json({ activity });
});

router.post('/:id/standup', async (req, res) => {
  await requireMembership(req.params.id, req.userId);
  const memberships = await Membership.find({ team: req.params.id }).populate('user', 'name timezone').lean();
  const members = memberships.filter((m) => m.user && m.role !== 'viewer').map((m) => ({ id: String(m.user._id), name: m.user.name, timezone: m.user.timezone }));
  const tasks = (await Task.find({ team: req.params.id }).limit(500)).map((t) => t.toJSON());
  res.json(await teamStandup(members, tasks, { now: new Date() }));
});

export default router;
