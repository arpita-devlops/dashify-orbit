import bcrypt from 'bcryptjs';
import { Activity } from './models/Activity.js';
import { Comment } from './models/Comment.js';
import { FocusSession } from './models/FocusSession.js';
import { Task } from './models/Task.js';
import { Membership, Team, generateJoinCode } from './models/Team.js';
import { User } from './models/User.js';
import { demoData } from './services/demoData.js';

export const DEMO_EMAIL = 'demo@dashify.app';
const DEMO_PASSWORD = 'demo1234';

export async function ensureDemoUser() {
  let user = await User.findOne({ email: DEMO_EMAIL });
  if (!user) {
    user = await User.create({ name: 'Demo User', email: DEMO_EMAIL, passwordHash: await bcrypt.hash(DEMO_PASSWORD, 12), timezone: 'Asia/Kolkata', workStart: '09:30', workEnd: '18:30' });
    const { tasks, sessions } = demoData();
    await Task.insertMany(tasks.map((t) => ({ ...t, user: user._id })));
    await FocusSession.insertMany(sessions.map((s) => ({ ...s, user: user._id })));
  }
  await ensureDemoTeam(user);
  console.log(`[seed] demo account ready → ${DEMO_EMAIL} / ${DEMO_PASSWORD}`);
}

// Teammates share the demo password so you can sign in as them in a second browser and watch changes sync live.
async function ensureDemoTeam(owner) {
  if (await Membership.exists({ user: owner._id })) return;
  const { team: seed } = demoData();
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12);

  const users = [owner];
  for (const m of seed.members.slice(1)) {
    const existing = await User.findOne({ email: m.email });
    users.push(existing ?? (await User.create({ name: m.name, email: m.email, passwordHash, timezone: m.timezone, workStart: m.workStart, workEnd: m.workEnd })));
  }

  const team = await Team.create({ name: seed.name, joinCode: generateJoinCode(), createdBy: owner._id });
  await Membership.insertMany(seed.members.map((m, i) => ({ team: team._id, user: users[i]._id, role: m.role })));

  const tasks = await Task.insertMany(
    seed.tasks.map(({ assignee, ...t }) => ({ ...t, team: team._id, user: owner._id, assignee: assignee === null ? null : users[assignee]._id })),
  );
  await Comment.insertMany(
    seed.comments.map((c) => ({
      task: tasks[c.task]._id,
      team: team._id,
      author: users[c.author]._id,
      authorName: users[c.author].name,
      body: c.body,
      mentions: users.filter((u, i) => i !== c.author && c.body.includes(`@${u.name.split(' ')[0]}`)).map((u) => u._id),
      createdAt: c.at,
    })),
  );
  await Activity.insertMany(
    seed.activity.map((a) => ({
      team: team._id,
      actor: users[a.actor]._id,
      type: a.type,
      task: a.task !== undefined ? tasks[a.task]._id : null,
      meta: { actorName: users[a.actor].name, name: seed.name, ...(a.task !== undefined && { title: tasks[a.task].title }), ...a.meta },
      createdAt: a.at,
    })),
  );
  console.log(`[seed] team "${seed.name}" ready with ${users.length} members (invite code ${team.joinCode})`);
}
