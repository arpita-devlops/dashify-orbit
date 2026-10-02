// Sample workspace for the demo account. Shared verbatim with client/src/lib/demoData.js.

export function demoData(now = new Date()) {
  const at = (dayOffset, hour, minute = 0) => {
    const d = new Date(now);
    d.setDate(d.getDate() + dayOffset);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };

  const tasks = [
    { title: 'Ship v2 dashboard redesign', description: 'Finalize analytics widgets and polish dark mode.', status: 'in_progress', priority: 'high', tags: ['work', 'frontend'], dueAt: at(0, 18), remindAt: at(0, 16), estimateMins: 90 },
    { title: 'Fix JWT refresh edge case', description: 'Tokens issued right before expiry fail on the second request.', status: 'todo', priority: 'high', tags: ['work', 'backend'], dueAt: at(-1, 17), estimateMins: 45 },
    { title: 'Review open pull requests', description: '', status: 'todo', priority: 'medium', tags: ['work'], dueAt: at(0, 15), estimateMins: 30 },
    { title: 'Solve 3 DSA problems', description: 'Graphs + one hard DP problem.', status: 'todo', priority: 'medium', tags: ['learning', 'dsa'], dueAt: at(0, 21), estimateMins: 60 },
    { title: 'Prepare system design notes', description: 'Rate limiter, URL shortener, news feed.', status: 'todo', priority: 'medium', tags: ['learning'], dueAt: at(1, 12), estimateMins: 60 },
    { title: 'Write blog post on LLM agents', description: 'Planner → tools → memory. Include diagrams.', status: 'todo', priority: 'low', tags: ['writing', 'ai'], dueAt: at(4, 18), estimateMins: 120 },
    { title: 'Evening run — 5 km', description: '', status: 'todo', priority: 'low', tags: ['health'], dueAt: at(0, 19), estimateMins: 40 },
    { title: 'Book dentist appointment', description: '', status: 'todo', priority: 'low', tags: ['personal'], dueAt: at(3, 10), estimateMins: 10 },
    { title: 'Read “Deep Work” — chapter 3', status: 'done', priority: 'low', tags: ['learning'], completedAt: at(0, 9) },
    { title: 'Set up CI pipeline', status: 'done', priority: 'high', tags: ['devops'], completedAt: at(-1, 16) },
    { title: 'Grocery run', status: 'done', priority: 'low', tags: ['personal'], completedAt: at(-1, 19) },
    { title: 'Design onboarding flow', status: 'done', priority: 'medium', tags: ['design'], completedAt: at(-2, 14) },
    { title: 'Write unit tests for planner', status: 'done', priority: 'medium', tags: ['backend'], completedAt: at(-2, 18) },
    { title: 'Refactor API error handling', status: 'done', priority: 'medium', tags: ['backend'], completedAt: at(-3, 11) },
    { title: 'Team sync notes', status: 'done', priority: 'low', tags: ['work'], completedAt: at(-4, 10) },
    { title: 'Update resume', status: 'done', priority: 'medium', tags: ['career'], completedAt: at(-5, 20) },
    { title: 'Plan sprint backlog', status: 'done', priority: 'high', tags: ['work'], completedAt: at(-6, 15) },
  ].map((t) => ({ description: '', dueAt: null, remindAt: null, estimateMins: 45, completedAt: null, ...t }));

  const minutesByDay = [[25, 50], [25, 25, 50], [50], [25, 50, 25], [25], [50, 25], [25, 25]];
  const sessions = [];
  minutesByDay.forEach((list, dayAgo) => {
    list.forEach((minutes, i) => {
      const startedAt = at(-dayAgo, 9 + i * 2, 15);
      sessions.push({ minutes, startedAt, completedAt: new Date(new Date(startedAt).getTime() + minutes * 60_000).toISOString() });
    });
  });

  const ago = (mins) => new Date(now.getTime() - mins * 60_000).toISOString();

  // Distributed team. Member index 0 is the demo user; assignees/authors reference member indexes.
  const team = {
    name: 'Orbit Labs',
    members: [
      { role: 'owner' },
      { name: 'Maya Chen', email: 'maya@dashify.app', timezone: 'America/New_York', workStart: '09:00', workEnd: '17:30', role: 'admin' },
      { name: 'Lukas Weber', email: 'lukas@dashify.app', timezone: 'Europe/Berlin', workStart: '08:30', workEnd: '17:00', role: 'member' },
      { name: 'Priya Nair', email: 'priya@dashify.app', timezone: 'Asia/Kolkata', workStart: '10:00', workEnd: '19:00', role: 'member' },
      { name: 'Kenji Sato', email: 'kenji@dashify.app', timezone: 'Asia/Tokyo', workStart: '09:00', workEnd: '18:00', role: 'viewer' },
    ],
    tasks: [
      { title: 'Realtime presence for team board', description: 'Socket.IO rooms per team, online indicators, reconnect handling.', status: 'in_progress', priority: 'urgent', tags: ['backend', 'realtime'], assignee: 0, dueAt: at(0, 19), estimateMins: 120 },
      { title: 'Design onboarding checklist', description: 'Three-step checklist with progress ring for new workspaces.', status: 'in_progress', priority: 'high', tags: ['design'], assignee: 1, dueAt: at(1, 17), estimateMins: 90 },
      { title: 'Fix flaky e2e login test', description: 'Fails ~1 in 10 runs on CI, likely a token refresh race.', status: 'todo', priority: 'high', tags: ['qa'], assignee: 3, dueAt: at(-1, 18), estimateMins: 45 },
      { title: 'Set up error monitoring', description: 'Sentry for client + API with release tagging.', status: 'todo', priority: 'high', tags: ['devops'], assignee: 2, dueAt: at(1, 10), estimateMins: 60 },
      { title: 'Load test API with k6', description: '500 concurrent users, p95 < 300ms target.', status: 'todo', priority: 'medium', tags: ['devops'], assignee: 2, dueAt: at(4, 12), estimateMins: 120 },
      { title: 'Localize date formats (de-DE)', description: '', status: 'todo', priority: 'medium', tags: ['i18n'], assignee: 2, dueAt: at(2, 12), estimateMins: 60 },
      { title: 'Customer interview synthesis', description: 'Cluster insights from 8 interviews into themes.', status: 'todo', priority: 'medium', tags: ['research'], assignee: 1, dueAt: at(2, 18), estimateMins: 90 },
      { title: 'Sprint demo deck', description: '', status: 'todo', priority: 'medium', tags: ['team'], assignee: 0, dueAt: at(2, 16), estimateMins: 45 },
      { title: 'Write release notes v2.1', description: '', status: 'todo', priority: 'low', tags: ['docs'], assignee: null, dueAt: at(3, 15), estimateMins: 30 },
      { title: 'Ship JWT refresh tokens', status: 'done', priority: 'high', tags: ['backend'], assignee: 0, completedAt: ago(180) },
      { title: 'Accessibility audit fixes', status: 'done', priority: 'medium', tags: ['frontend'], assignee: 1, completedAt: ago(600) },
      { title: 'Kanban drag & drop polish', status: 'done', priority: 'medium', tags: ['frontend'], assignee: 3, completedAt: ago(420) },
      { title: 'API rate limiting', status: 'done', priority: 'high', tags: ['backend'], assignee: 2, completedAt: ago(1500) },
    ].map((t) => ({ description: '', dueAt: null, remindAt: null, estimateMins: 45, completedAt: null, ...t })),
    comments: [
      { task: 0, author: 1, body: 'Presence looks great on staging — could we show who is viewing a card next?', at: ago(95) },
      { task: 0, author: 0, body: '@Maya yes, right after the release. Pushing the room-join fix tonight.', at: ago(70) },
      { task: 2, author: 2, body: '@Priya I think it’s the refresh race — happy to pair tomorrow morning my time.', at: ago(300) },
      { task: 1, author: 4, body: 'Love the progress ring idea. Can we A/B test the copy?', at: ago(40) },
    ],
    activity: [
      { type: 'team.created', actor: 0, at: ago(4320) },
      { type: 'member.joined', actor: 1, at: ago(4200) },
      { type: 'member.joined', actor: 2, at: ago(4100) },
      { type: 'member.joined', actor: 3, at: ago(3900) },
      { type: 'member.joined', actor: 4, at: ago(3000) },
      { type: 'task.status', actor: 2, task: 12, at: ago(1500), meta: { from: 'in_progress', to: 'done' } },
      { type: 'task.status', actor: 1, task: 10, at: ago(600), meta: { from: 'in_progress', to: 'done' } },
      { type: 'task.status', actor: 3, task: 11, at: ago(420), meta: { from: 'in_progress', to: 'done' } },
      { type: 'comment.added', actor: 2, task: 2, at: ago(300) },
      { type: 'task.status', actor: 0, task: 9, at: ago(180), meta: { from: 'in_progress', to: 'done' } },
      { type: 'comment.added', actor: 1, task: 0, at: ago(95) },
      { type: 'comment.added', actor: 0, task: 0, at: ago(70) },
      { type: 'comment.added', actor: 4, task: 1, at: ago(40) },
    ],
  };

  return { tasks, sessions, team };
}
