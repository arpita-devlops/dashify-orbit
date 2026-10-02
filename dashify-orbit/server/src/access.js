import mongoose from 'mongoose';
import { HttpError } from './middleware/errors.js';
import { Activity } from './models/Activity.js';
import { Task } from './models/Task.js';
import { Membership, ROLE_RANK } from './models/Team.js';
import { emitToTeam } from './realtime.js';

const DENIED = {
  member: 'Viewers have read-only access to this team',
  admin: 'Only team admins can do that',
  owner: 'Only the team owner can do that',
};

/** Resolves the caller's membership, hiding teams they don't belong to behind a 404. */
export async function requireMembership(teamId, userId, minRole = 'viewer', notFound = 'Team not found') {
  if (!mongoose.isValidObjectId(teamId)) throw new HttpError(404, notFound);
  const membership = await Membership.findOne({ team: teamId, user: userId });
  if (!membership) throw new HttpError(404, notFound);
  if (ROLE_RANK[membership.role] < ROLE_RANK[minRole]) throw new HttpError(403, DENIED[minRole]);
  return membership;
}

/** Personal tasks are owner-only; team tasks are governed by team role. */
export async function findAccessibleTask(taskId, userId, minRole = 'viewer') {
  if (!mongoose.isValidObjectId(taskId)) throw new HttpError(404, 'Task not found');
  const task = await Task.findById(taskId);
  if (!task) throw new HttpError(404, 'Task not found');

  if (task.team) {
    const membership = await requireMembership(task.team, userId, minRole, 'Task not found');
    return { task, membership };
  }
  if (String(task.user) !== String(userId)) throw new HttpError(404, 'Task not found');
  return { task, membership: null };
}

export async function resolveAssignee(teamId, value) {
  if (value === null || value === undefined || value === '') return null;
  if (!mongoose.isValidObjectId(value) || !(await Membership.exists({ team: teamId, user: value }))) {
    throw new HttpError(400, 'Assignee must be a member of this team');
  }
  return value;
}

export async function logActivity({ team, actor, type, task = null, meta = {} }) {
  const activity = await Activity.create({ team, actor, type, task: task?._id ?? task, meta });
  emitToTeam(team, { type: 'activity', activity: activity.toJSON() });
  return activity;
}
