import { demoData } from './demoData';
import { ApiError, tokenStore } from './http';
import { heuristicPlan, heuristicPrioritize } from './planner';
import { buildStandup } from './team';
import { browserTimeZone, isWorkingNow } from './timezones';

// Browser-only backend that mirrors the REST + realtime contract, so the full app (including
// team collaboration) works on static hosting such as GitHub Pages.

const DB_KEY = 'dashify:demo-db:v2';
const LEADER_KEY = 'dashify:demo-sim-leader';
export const DEMO_CREDENTIALS = { email: 'demo@dashify.app', password: 'demo1234' };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const STATUSES = ['todo', 'in_progress', 'done'];
const PRIORITIES = ['low', 'medium', 'high', 'urgent'];
const ROLE_RANK = { viewer: 0, member: 1, admin: 2, owner: 3 };
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const uid = () => globalThis.crypto?.randomUUID?.() ?? `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`;
const nowIso = () => new Date().toISOString();
const joinCode = () => Array.from({ length: 8 }, () => CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)]).join('');
const firstName = (name = '') => name.split(/\s+/)[0];
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

async function hashPassword(password) {
  const input = new TextEncoder().encode(`dashify:${password}`);
  if (globalThis.crypto?.subtle) {
    const digest = await crypto.subtle.digest('SHA-256', input);
    return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
  }
  let h = 2166136261; // FNV-1a fallback for non-secure contexts
  for (const byte of input) h = Math.imul(h ^ byte, 16777619);
  return (h >>> 0).toString(16);
}

const emptyDb = () => ({ users: [], sessions: {}, tasks: {}, focus: {}, teams: [], memberships: [], teamTasks: {}, comments: [], activity: [] });

function load() {
  try {
    return { ...emptyDb(), ...JSON.parse(localStorage.getItem(DB_KEY)) };
  } catch {
    return emptyDb();
  }
}

const save = (db) => localStorage.setItem(DB_KEY, JSON.stringify(db));

// ---- Realtime bus: same-tab listeners + other tabs via BroadcastChannel ----
const listeners = new Set();
const channel = typeof BroadcastChannel !== 'undefined' ? new BroadcastChannel('dashify-demo') : null;
channel?.addEventListener('message', (e) => listeners.forEach((fn) => fn(e.data)));
function emit(event) {
  listeners.forEach((fn) => fn(event));
  channel?.postMessage(event);
}

async function ensureDemoAccount(db) {
  if (db.users.some((u) => u.email === DEMO_CREDENTIALS.email)) return;
  const id = uid();
  const demo = { id, name: 'Demo User', email: DEMO_CREDENTIALS.email, passwordHash: await hashPassword(DEMO_CREDENTIALS.password), timezone: browserTimeZone(), workStart: '09:30', workEnd: '18:30', createdAt: nowIso() };
  db.users.push(demo);
  const { tasks, sessions, team } = demoData();
  db.tasks[id] = tasks.map((t, i) => ({ id: uid(), reminded: false, aiReason: '', teamId: null, assigneeId: null, createdBy: id, ...t, createdAt: new Date(Date.now() - i * 3_600_000).toISOString(), updatedAt: nowIso() }));
  db.focus[id] = sessions.map((s) => ({ id: uid(), taskId: null, ...s }));

  // Teammates can't sign in locally (random password) — they're driven by the activity simulator.
  const lockedHash = await hashPassword(uid());
  const users = [demo, ...team.members.slice(1).map((m) => ({ id: uid(), name: m.name, email: m.email, passwordHash: lockedHash, timezone: m.timezone, workStart: m.workStart, workEnd: m.workEnd, createdAt: nowIso() }))];
  db.users.push(...users.slice(1));

  const teamId = uid();
  db.teams.push({ id: teamId, name: team.name, joinCode: joinCode(), createdBy: id, createdAt: nowIso() });
  team.members.forEach((m, i) => db.memberships.push({ teamId, userId: users[i].id, role: m.role, createdAt: nowIso() }));

  const teamTasks = team.tasks.map(({ assignee, ...t }, i) => ({
    id: uid(), reminded: false, aiReason: '', ...t, teamId, createdBy: id, assigneeId: assignee === null ? null : users[assignee].id,
    createdAt: new Date(Date.now() - (i + 2) * 3_600_000).toISOString(), updatedAt: nowIso(),
  }));
  db.teamTasks[teamId] = teamTasks;
  db.comments.push(...team.comments.map((c) => ({ id: uid(), taskId: teamTasks[c.task].id, teamId, authorId: users[c.author].id, authorName: users[c.author].name, body: c.body, mentions: [], createdAt: c.at })));
  db.activity.push(...team.activity.map((a) => ({
    id: uid(), teamId, actorId: users[a.actor].id, type: a.type, taskId: a.task !== undefined ? teamTasks[a.task].id : null,
    meta: { actorName: users[a.actor].name, name: team.name, ...(a.task !== undefined && { title: teamTasks[a.task].title }), ...a.meta }, createdAt: a.at,
  })));
  save(db);
}

const publicUser = ({ passwordHash: _omit, ...user }) => user;
const membership = (db, teamId, userId) => db.memberships.find((m) => m.teamId === teamId && m.userId === userId);
const userName = (db, userId) => db.users.find((u) => u.id === userId)?.name ?? 'Someone';

function requireRole(db, teamId, userId, minRole = 'viewer', notFound = 'Team not found') {
  const m = membership(db, teamId, userId);
  if (!m || !db.teams.some((t) => t.id === teamId)) throw new ApiError(notFound, 404);
  if (ROLE_RANK[m.role] < ROLE_RANK[minRole]) {
    throw new ApiError(minRole === 'member' ? 'Viewers have read-only access to this team' : minRole === 'owner' ? 'Only the team owner can do that' : 'Only team admins can do that', 403);
  }
  return m;
}

function teamView(db, team, role) {
  const view = { ...team, role, memberCount: db.memberships.filter((m) => m.teamId === team.id).length };
  if (ROLE_RANK[role] < ROLE_RANK.admin) delete view.joinCode;
  return view;
}

function findTask(db, userId, taskId, minRole = 'viewer') {
  const personal = (db.tasks[userId] || []).find((t) => t.id === taskId);
  if (personal) return { task: personal, list: db.tasks[userId], membership: null };
  for (const [teamId, list] of Object.entries(db.teamTasks)) {
    const task = list.find((t) => t.id === taskId);
    if (task) return { task, list, membership: requireRole(db, teamId, userId, minRole, 'Task not found') };
  }
  throw new ApiError('Task not found', 404);
}

function logActivity(db, { teamId, actorId, type, taskId = null, meta = {} }) {
  const activity = { id: uid(), teamId, actorId, type, taskId, meta: { actorName: userName(db, actorId), ...meta }, createdAt: nowIso() };
  db.activity.push(activity);
  return activity;
}

function validateTask(input, partial) {
  const out = {};
  if (!partial || 'title' in input) {
    const title = String(input.title ?? '').trim();
    if (!title || title.length > 140) throw new ApiError('Title is required (max 140 characters)', 400);
    out.title = title;
  }
  if ('description' in input) out.description = String(input.description ?? '').slice(0, 2000);
  if ('status' in input) {
    if (!STATUSES.includes(input.status)) throw new ApiError('Invalid status', 400);
    out.status = input.status;
  }
  if ('priority' in input) {
    if (!PRIORITIES.includes(input.priority)) throw new ApiError('Invalid priority', 400);
    out.priority = input.priority;
  }
  if ('tags' in input) out.tags = [...new Set((input.tags || []).map((t) => String(t).trim().toLowerCase().slice(0, 24)).filter(Boolean))].slice(0, 8);
  for (const key of ['dueAt', 'remindAt']) {
    if (key in input) out[key] = input[key] ? new Date(input[key]).toISOString() : null;
  }
  if ('estimateMins' in input) out.estimateMins = Math.min(Math.max(Math.round(Number(input.estimateMins) || 45), 5), 600);
  if ('reminded' in input) out.reminded = Boolean(input.reminded);
  return out;
}

function resolveAssignee(db, teamId, value) {
  if (value === null || value === undefined || value === '') return null;
  if (!membership(db, teamId, value)) throw new ApiError('Assignee must be a member of this team', 400);
  return value;
}

const sortNewest = (list) => [...list].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
const withDefaults = (task, userId) => ({ teamId: null, assigneeId: null, createdBy: userId, ...task });

const CANNED_COMMENTS = [
  'Pushed a fix for this — mind taking a look?',
  'Updated the estimate after digging in.',
  'Looks good from my side 👍',
  'Can we sync on this during the overlap window?',
  'Added notes from the customer call.',
  'Blocked on a review here, any takers?',
];

export function createLocalApi() {
  async function session() {
    const db = load();
    await ensureDemoAccount(db);
    const userId = db.sessions[tokenStore.get()];
    const user = db.users.find((u) => u.id === userId);
    if (!user) throw new ApiError('Session expired — please sign in again', 401);
    return { db, user };
  }

  function issueToken(db, user) {
    const token = uid();
    db.sessions[token] = user.id;
    save(db);
    return { token, user: publicUser(user) };
  }

  function membersOf(db, teamId) {
    return db.memberships
      .filter((m) => m.teamId === teamId)
      .map((m) => {
        const u = db.users.find((x) => x.id === m.userId);
        return u && { id: u.id, name: u.name, email: u.email, timezone: u.timezone || 'UTC', workStart: u.workStart || '09:00', workEnd: u.workEnd || '18:00', role: m.role, joinedAt: m.createdAt };
      })
      .filter(Boolean);
  }

  function addComment(db, task, author, body) {
    const mentions = task.teamId
      ? membersOf(db, task.teamId).filter((m) => m.id !== author.id && new RegExp(`@(${escapeRegex(m.name)}|${escapeRegex(firstName(m.name))})(?![\\p{L}\\d])`, 'iu').test(body)).map((m) => m.id)
      : [];
    const comment = { id: uid(), taskId: task.id, teamId: task.teamId, authorId: author.id, authorName: author.name, body, mentions, createdAt: nowIso() };
    db.comments.push(comment);
    const events = [];
    if (task.teamId) {
      events.push({ type: 'comment:new', teamId: task.teamId, comment });
      events.push({ type: 'activity', teamId: task.teamId, activity: logActivity(db, { teamId: task.teamId, actorId: author.id, type: 'comment.added', taskId: task.id, meta: { title: task.title, snippet: body.slice(0, 90) } }) });
      mentions.forEach((userId) => events.push({ type: 'mention', userId, teamId: task.teamId, taskId: task.id, title: task.title, by: author.name }));
    }
    return { comment, events };
  }

  // Simulated teammates: one tab (the leader) occasionally acts as a teammate who is within working hours.
  function simulateTeammate(myId) {
    const leader = JSON.parse(localStorage.getItem(LEADER_KEY) || 'null');
    if (leader && leader.id !== simulatorId && Date.now() - leader.at < 60_000) return;
    localStorage.setItem(LEADER_KEY, JSON.stringify({ id: simulatorId, at: Date.now() }));

    const db = load();
    const teamIds = db.memberships.filter((m) => m.userId === myId).map((m) => m.teamId);
    const teamId = teamIds.find((id) => db.memberships.some((m) => m.teamId === id && m.userId !== myId && m.role !== 'viewer'));
    if (!teamId) return;

    const mates = membersOf(db, teamId).filter((m) => m.id !== myId && m.role !== 'viewer');
    const actor = mates.find((m) => isWorkingNow(m)) ?? mates[Math.floor(Math.random() * mates.length)];
    const tasks = db.teamTasks[teamId] || [];
    const events = [];
    const theirs = tasks.filter((t) => t.assigneeId === actor.id && t.status !== 'done');

    if (theirs.length && Math.random() < 0.55) {
      const task = theirs[Math.floor(Math.random() * theirs.length)];
      const from = task.status;
      task.status = from === 'todo' ? 'in_progress' : 'done';
      task.completedAt = task.status === 'done' ? nowIso() : null;
      task.updatedAt = nowIso();
      events.push({ type: 'task:upsert', teamId, task: { ...task } });
      events.push({ type: 'activity', teamId, activity: logActivity(db, { teamId, actorId: actor.id, type: 'task.status', taskId: task.id, meta: { title: task.title, from, to: task.status } }) });
    } else {
      const open = tasks.filter((t) => t.status !== 'done');
      if (!open.length) return;
      const task = open[Math.floor(Math.random() * open.length)];
      const me = db.users.find((u) => u.id === myId);
      const body = Math.random() < 0.35 ? `@${firstName(me?.name)} could you take a look when you’re online?` : CANNED_COMMENTS[Math.floor(Math.random() * CANNED_COMMENTS.length)];
      events.push(...addComment(db, task, actor, body).events);
    }
    save(db);
    events.forEach(emit);
  }

  const simulatorId = uid();

  return {
    mode: 'demo',
    aiEngine: 'heuristic',

    resetDemo() {
      localStorage.removeItem(DB_KEY);
      localStorage.removeItem(LEADER_KEY);
      tokenStore.clear();
    },

    auth: {
      async register({ name, email, password, timezone }) {
        await wait(350);
        const db = load();
        await ensureDemoAccount(db);
        name = String(name ?? '').trim();
        email = String(email ?? '').trim().toLowerCase();
        if (!name || name.length > 60) throw new ApiError('Please enter your name (max 60 characters)', 400);
        if (!EMAIL_RE.test(email)) throw new ApiError('Please enter a valid email', 400);
        if (String(password ?? '').length < 8) throw new ApiError('Password must be at least 8 characters', 400);
        if (db.users.some((u) => u.email === email)) throw new ApiError('An account with this email already exists', 409);

        const user = { id: uid(), name, email, passwordHash: await hashPassword(password), timezone: timezone || browserTimeZone(), workStart: '09:00', workEnd: '18:00', createdAt: nowIso() };
        db.users.push(user);
        db.tasks[user.id] = [];
        db.focus[user.id] = [];
        return issueToken(db, user);
      },

      async login({ email, password }) {
        await wait(350);
        const db = load();
        await ensureDemoAccount(db);
        const user = db.users.find((u) => u.email === String(email ?? '').trim().toLowerCase());
        if (!user || user.passwordHash !== (await hashPassword(String(password ?? '')))) {
          throw new ApiError('Invalid email or password', 401);
        }
        return issueToken(db, user);
      },

      async me() {
        return publicUser((await session()).user);
      },

      async updateProfile(input) {
        const { db, user } = await session();
        if ('name' in input) {
          const trimmed = String(input.name ?? '').trim();
          if (!trimmed || trimmed.length > 60) throw new ApiError('Please enter your name (max 60 characters)', 400);
          user.name = trimmed;
        }
        if ('timezone' in input) user.timezone = input.timezone;
        if ('workStart' in input) user.workStart = input.workStart;
        if ('workEnd' in input) user.workEnd = input.workEnd;
        save(db);
        db.memberships.filter((m) => m.userId === user.id).forEach((m) => emit({ type: 'members:changed', teamId: m.teamId }));
        return publicUser(user);
      },
    },

    tasks: {
      async list({ teamId } = {}) {
        const { db, user } = await session();
        if (teamId) {
          requireRole(db, teamId, user.id);
          return sortNewest(db.teamTasks[teamId] || []);
        }
        return sortNewest(db.tasks[user.id] || []).map((t) => withDefaults(t, user.id));
      },

      async create(input) {
        const { db, user } = await session();
        const data = validateTask(input, false);
        const teamId = input.team || null;
        if (teamId) requireRole(db, teamId, user.id, 'member');
        const task = {
          id: uid(), description: '', status: 'todo', priority: 'medium', tags: [], dueAt: null, remindAt: null,
          reminded: false, estimateMins: 45, aiReason: '', ...data,
          teamId, createdBy: user.id, assigneeId: teamId ? resolveAssignee(db, teamId, input.assignee) : null,
          completedAt: data.status === 'done' ? nowIso() : null, createdAt: nowIso(), updatedAt: nowIso(),
        };
        const events = [];
        if (teamId) {
          db.teamTasks[teamId] = [task, ...(db.teamTasks[teamId] || [])];
          events.push({ type: 'task:upsert', teamId, task });
          events.push({ type: 'activity', teamId, activity: logActivity(db, { teamId, actorId: user.id, type: 'task.created', taskId: task.id, meta: { title: task.title } }) });
        } else {
          db.tasks[user.id] = [task, ...(db.tasks[user.id] || [])];
        }
        save(db);
        events.forEach(emit);
        return task;
      },

      async update(id, patch) {
        const { db, user } = await session();
        const { task } = findTask(db, user.id, id, 'member');
        const data = validateTask(patch, true);
        const before = { status: task.status, assigneeId: task.assigneeId ?? null };
        if (task.teamId && 'assignee' in patch) data.assigneeId = resolveAssignee(db, task.teamId, patch.assignee);
        if ('status' in data && data.status !== task.status) task.completedAt = data.status === 'done' ? nowIso() : null;
        if ('remindAt' in data && !('reminded' in data)) data.reminded = false;
        Object.assign(task, data, { updatedAt: nowIso() });

        const events = [];
        if (task.teamId) {
          events.push({ type: 'task:upsert', teamId: task.teamId, task: { ...task } });
          if (task.status !== before.status) {
            events.push({ type: 'activity', teamId: task.teamId, activity: logActivity(db, { teamId: task.teamId, actorId: user.id, type: 'task.status', taskId: task.id, meta: { title: task.title, from: before.status, to: task.status } }) });
          }
          if ((task.assigneeId ?? null) !== before.assigneeId) {
            events.push({ type: 'activity', teamId: task.teamId, activity: logActivity(db, { teamId: task.teamId, actorId: user.id, type: 'task.assigned', taskId: task.id, meta: { title: task.title, assigneeName: task.assigneeId ? userName(db, task.assigneeId) : null } }) });
          }
        }
        save(db);
        events.forEach(emit);
        return withDefaults({ ...task }, user.id);
      },

      async remove(id) {
        const { db, user } = await session();
        const { task, list, membership: m } = findTask(db, user.id, id, 'member');
        if (m && ROLE_RANK[m.role] < ROLE_RANK.admin && task.createdBy !== user.id) {
          throw new ApiError('Only the task creator or a team admin can delete this task', 403);
        }
        list.splice(list.indexOf(task), 1);
        db.comments = db.comments.filter((c) => c.taskId !== id);
        const events = [];
        if (task.teamId) {
          events.push({ type: 'task:delete', teamId: task.teamId, taskId: id });
          events.push({ type: 'activity', teamId: task.teamId, activity: logActivity(db, { teamId: task.teamId, actorId: user.id, type: 'task.deleted', meta: { title: task.title } }) });
        }
        save(db);
        events.forEach(emit);
        return null;
      },
    },

    comments: {
      async list(taskId) {
        const { db, user } = await session();
        findTask(db, user.id, taskId);
        return db.comments.filter((c) => c.taskId === taskId).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
      },

      async create(taskId, body) {
        const { db, user } = await session();
        const { task } = findTask(db, user.id, taskId);
        const text = String(body ?? '').trim();
        if (!text || text.length > 1000) throw new ApiError('Comment must be 1–1000 characters', 400);
        const { comment, events } = addComment(db, task, user, text);
        save(db);
        events.forEach(emit);
        return comment;
      },
    },

    teams: {
      async list() {
        const { db, user } = await session();
        return db.memberships
          .filter((m) => m.userId === user.id)
          .map((m) => db.teams.find((t) => t.id === m.teamId) && teamView(db, db.teams.find((t) => t.id === m.teamId), m.role))
          .filter(Boolean);
      },

      async create(name) {
        const { db, user } = await session();
        const trimmed = String(name ?? '').trim();
        if (!trimmed || trimmed.length > 60) throw new ApiError('Team name must be 1–60 characters', 400);
        const team = { id: uid(), name: trimmed, joinCode: joinCode(), createdBy: user.id, createdAt: nowIso() };
        db.teams.push(team);
        db.memberships.push({ teamId: team.id, userId: user.id, role: 'owner', createdAt: nowIso() });
        db.teamTasks[team.id] = [];
        logActivity(db, { teamId: team.id, actorId: user.id, type: 'team.created', meta: { name: trimmed } });
        save(db);
        return teamView(db, team, 'owner');
      },

      async join(code) {
        await wait(400);
        const { db, user } = await session();
        const normalized = String(code ?? '').trim().toUpperCase();
        if (!/^[A-Z2-9]{8}$/.test(normalized)) throw new ApiError('Invite codes are 8 characters, e.g. K7QM2XPA', 400);
        const team = db.teams.find((t) => t.joinCode === normalized);
        if (!team) throw new ApiError('No team found for that invite code', 404);
        if (membership(db, team.id, user.id)) throw new ApiError('You are already a member of this team', 409);
        db.memberships.push({ teamId: team.id, userId: user.id, role: 'member', createdAt: nowIso() });
        const activity = logActivity(db, { teamId: team.id, actorId: user.id, type: 'member.joined' });
        save(db);
        emit({ type: 'activity', teamId: team.id, activity });
        emit({ type: 'members:changed', teamId: team.id });
        return teamView(db, team, 'member');
      },

      async get(teamId) {
        const { db, user } = await session();
        const m = requireRole(db, teamId, user.id);
        const team = db.teams.find((t) => t.id === teamId);
        return { team: teamView(db, team, m.role), role: m.role, members: membersOf(db, teamId) };
      },

      async rename(teamId, name) {
        const { db, user } = await session();
        const m = requireRole(db, teamId, user.id, 'admin');
        const trimmed = String(name ?? '').trim();
        if (!trimmed || trimmed.length > 60) throw new ApiError('Team name must be 1–60 characters', 400);
        const team = db.teams.find((t) => t.id === teamId);
        team.name = trimmed;
        save(db);
        emit({ type: 'members:changed', teamId });
        return teamView(db, team, m.role);
      },

      async remove(teamId) {
        const { db, user } = await session();
        requireRole(db, teamId, user.id, 'owner');
        db.teams = db.teams.filter((t) => t.id !== teamId);
        db.memberships = db.memberships.filter((m) => m.teamId !== teamId);
        db.comments = db.comments.filter((c) => c.teamId !== teamId);
        db.activity = db.activity.filter((a) => a.teamId !== teamId);
        delete db.teamTasks[teamId];
        save(db);
        emit({ type: 'team:deleted', teamId });
        return null;
      },

      async regenerateCode(teamId) {
        const { db, user } = await session();
        const m = requireRole(db, teamId, user.id, 'admin');
        const team = db.teams.find((t) => t.id === teamId);
        team.joinCode = joinCode();
        save(db);
        return teamView(db, team, m.role);
      },

      async setRole(teamId, userId, role) {
        const { db, user } = await session();
        const me = requireRole(db, teamId, user.id, 'admin');
        if (!['viewer', 'member', 'admin'].includes(role)) throw new ApiError('Role must be viewer, member or admin', 400);
        const target = membership(db, teamId, userId);
        if (!target) throw new ApiError('Member not found', 404);
        if (target.role === 'owner') throw new ApiError("The owner's role can't be changed", 400);
        if ((role === 'admin' || target.role === 'admin') && me.role !== 'owner') throw new ApiError('Only the owner can grant or revoke admin', 403);
        target.role = role;
        const activity = logActivity(db, { teamId, actorId: user.id, type: 'member.role', meta: { name: userName(db, userId), role } });
        save(db);
        emit({ type: 'activity', teamId, activity });
        emit({ type: 'members:changed', teamId });
        return { ok: true };
      },

      async removeMember(teamId, userId) {
        const { db, user } = await session();
        const leaving = userId === user.id;
        const me = requireRole(db, teamId, user.id, leaving ? 'viewer' : 'admin');
        const target = leaving ? me : membership(db, teamId, userId);
        if (!target) throw new ApiError('Member not found', 404);
        if (target.role === 'owner') throw new ApiError(leaving ? 'Owners can’t leave — delete the team or transfer it first' : "The owner can't be removed", 400);
        if (!leaving && target.role === 'admin' && me.role !== 'owner') throw new ApiError('Only the owner can remove an admin', 403);
        db.memberships = db.memberships.filter((m) => m !== target);
        (db.teamTasks[teamId] || []).forEach((t) => {
          if (t.assigneeId === userId) t.assigneeId = null;
        });
        const name = userName(db, userId);
        const activity = logActivity(db, { teamId, actorId: user.id, type: leaving ? 'member.left' : 'member.removed', meta: { name, actorName: leaving ? name : user.name } });
        save(db);
        emit({ type: 'activity', teamId, activity });
        emit({ type: 'members:changed', teamId });
        if (!leaving) emit({ type: 'team:removed', userId, teamId });
        return null;
      },

      async activity(teamId) {
        const { db, user } = await session();
        requireRole(db, teamId, user.id);
        return db.activity.filter((a) => a.teamId === teamId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 60);
      },

      async standup(teamId) {
        await wait(1000);
        const { db, user } = await session();
        requireRole(db, teamId, user.id);
        const members = membersOf(db, teamId).filter((m) => m.role !== 'viewer');
        return buildStandup(members, db.teamTasks[teamId] || [], { now: new Date() });
      },
    },

    focus: {
      async list() {
        const { db, user } = await session();
        return [...(db.focus[user.id] || [])].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
      },

      async create({ taskId = null, minutes }) {
        const { db, user } = await session();
        const mins = Math.round(Number(minutes));
        if (!Number.isFinite(mins) || mins < 1 || mins > 240) throw new ApiError('Minutes must be between 1 and 240', 400);
        const completedAt = new Date();
        const entry = { id: uid(), taskId, minutes: mins, startedAt: new Date(completedAt - mins * 60_000).toISOString(), completedAt: completedAt.toISOString() };
        db.focus[user.id] = [entry, ...(db.focus[user.id] || [])];
        save(db);
        return entry;
      },
    },

    ai: {
      async plan(input = {}) {
        await wait(1100); // simulate model latency so the UI's thinking state is visible
        const { db, user } = await session();
        let tasks = db.tasks[user.id] || [];
        if (input.team) {
          requireRole(db, input.team, user.id);
          tasks = (db.teamTasks[input.team] || []).filter((t) => !t.assigneeId || t.assigneeId === user.id);
        }
        return heuristicPlan(tasks, { ...input, now: new Date() });
      },

      async prioritize(input = {}) {
        await wait(900);
        const { db, user } = await session();
        let list = db.tasks[user.id] || [];
        if (input.team) {
          requireRole(db, input.team, user.id, 'member');
          list = db.teamTasks[input.team] || [];
        }
        const result = heuristicPrioritize(list, { now: new Date() });
        const events = [];
        for (const update of result.updates) {
          const task = list.find((t) => t.id === update.id);
          if (!task) continue;
          Object.assign(task, { priority: update.priority, aiReason: update.reason, updatedAt: nowIso() });
          if (input.team) events.push({ type: 'task:upsert', teamId: input.team, task: { ...task } });
        }
        save(db);
        events.forEach(emit);
        return { ...result, tasks: sortNewest(list).map((t) => withDefaults(t, user.id)) };
      },
    },

    realtime: {
      connect(onEvent) {
        listeners.add(onEvent);
        let myId = null;

        const announcePresence = () => {
          const db = load();
          myId = db.sessions[tokenStore.get()] ?? null;
          if (!myId) return;
          db.memberships.filter((m) => m.userId === myId).forEach(({ teamId }) => {
            const online = membersOf(db, teamId).filter((m) => m.id === myId || isWorkingNow(m)).map((m) => m.id);
            onEvent({ type: 'presence', teamId, online });
          });
        };

        onEvent({ type: 'connection', status: 'online' });
        announcePresence();
        const presenceTimer = setInterval(announcePresence, 60_000);
        const simTimer = setInterval(() => myId && simulateTeammate(myId), 30_000 + Math.random() * 15_000);

        return () => {
          listeners.delete(onEvent);
          clearInterval(presenceTimer);
          clearInterval(simTimer);
        };
      },
    },
  };
}
