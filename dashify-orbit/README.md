# Dashify — AI-Powered Smart Productivity Dashboard

> **Your day, in orbit.** Dashify pulls scattered to-dos into one gravitational center: AI ranks what matters, plans your hours, and keeps you in flow with focus sessions, reminders and live analytics.

**Live demo:** https://arpita-devlops.github.io/dashify-orbit/ — click **Launch live demo** (or sign in with `demo@dashify.app` / `demo1234`).

## Features

| | |
|---|---|
| **AI daily planner** | Turns open tasks into a time-blocked schedule with breaks and a reason for every slot. Uses OpenAI when `OPENAI_API_KEY` is set, with validated JSON output and a deterministic fallback planner. |
| **AI re-prioritization** | Re-ranks priorities from deadlines, status and momentum. |
| **Smart Kanban board** | Drag & drop between To do / In progress / Done, board and list views, search, priority/tag filters and smart sorting. |
| **Natural-language quick add** | `Finish report tomorrow 5pm #work !high ~45m` → title, due date, tags, priority and estimate. |
| **Command palette** | `Ctrl/⌘ + K` to search, navigate, run AI actions or capture tasks. |
| **Focus mode** | Pomodoro timer linked to tasks; sessions are logged and feed analytics. |
| **Reminders** | Relative reminders delivered as in-app toasts and native browser notifications. |
| **Analytics** | Productivity score, streaks, weekly completions and focus minutes, priority mix. |
| **3D landing experience** | Three.js "task orbit" where closer orbits mean higher priority. Light and dark themes. |

### Team collaboration (distributed teams)

| | |
|---|---|
| **Team workspaces** | Create a team and invite people with an 8-character code. Roles are owner, admin, member and viewer, and every user keeps a private personal workspace. |
| **Real-time sync** | Socket.IO rooms per team: board changes, comments and activity appear instantly for everyone, with online presence. |
| **Assignees and @mentions** | Assign tasks to teammates and discuss them in threaded comments. @mentions and assignments trigger live notifications. |
| **Golden hours** | Each member's working hours are converted to your local time to show the best overlap window for meetings. |
| **Workload balancing** | Estimated load per person, flags for overloaded teammates, and one-click suggestions to reassign work. |
| **AI async standup** | Done, doing, next and blockers per person, plus an LLM-written summary. Copy it straight into Slack or Teams. |

With Docker, the seeded teammates (`maya@dashify.app`, `lukas@dashify.app`, `priya@dashify.app`, `kenji@dashify.app`, all with password `demo1234`) can be opened in a second browser to watch changes sync live. On GitHub Pages, simulated teammates act within their own working hours, and multiple tabs stay in sync through `BroadcastChannel`.

## Tech stack

- **Frontend:** React 19, Vite, Tailwind CSS, Framer Motion, Three.js, React Router
- **Backend:** Node.js, Express 5, MongoDB (Mongoose), JWT, bcrypt
- **AI:** OpenAI Chat Completions (JSON mode) with a heuristic fallback
- **DevOps:** Docker and Docker Compose, nginx, GitHub Actions (CI and Pages deploy)

## Architecture

```
React SPA ──HTTPS/JSON──▶ Express REST API ──▶ MongoDB
  (Vite)                  │ JWT auth · Helmet · rate limits
                          │ input whitelisting · per-user isolation
                          └──▶ AI service (OpenAI → heuristic fallback)
```

When no API is reachable (for example on GitHub Pages), the client switches to a **browser demo backend** that implements the same API contract on top of `localStorage`. The static deployment stays fully interactive.

### Security

- Passwords hashed with bcrypt (12 rounds); constant-time login path that doesn't reveal which emails are registered
- Stateless JWT auth (`Authorization: Bearer`), 7-day expiry, secret from the environment (required in production)
- Every task and focus query is scoped to the authenticated user, so other users' records return 404
- Request bodies are whitelisted field by field, preventing mass assignment and NoSQL operator injection
- Helmet security headers, CORS allow-list, global and auth-specific rate limits, 100 kB body limit
- Only minimal task fields are sent to the LLM, and its output is validated before use

## Getting started

### Option 1: Docker (full stack)

```bash
docker compose up --build
```

- App: http://localhost:8080
- API: http://localhost:4000/api/health
- A demo account is seeded automatically (`demo@dashify.app` / `demo1234`).

Optional: copy `.env.example` to `.env` and set `OPENAI_API_KEY` to enable LLM planning, or `JWT_SECRET` for persistent sessions.

### Option 2: Local Node.js (v20+)

```bash
# API (needs a MongoDB at MONGO_URI)
cd server
cp .env.example .env
npm install
npm run dev

# Frontend
cd client
npm install
VITE_API_URL=http://localhost:4000 npm run dev
```

Run the frontend without `VITE_API_URL` to use browser demo mode.

### Tests and linting

```bash
cd server && npm test      # planner unit tests (node:test)
cd client && npm run lint  # ESLint
```

## API reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/register` | Create account → `{ token, user }` |
| `POST` | `/api/auth/login` | Sign in → `{ token, user }` |
| `GET` / `PATCH` | `/api/auth/me` | Current user / update name |
| `GET` | `/api/tasks?q=&status=&priority=` | List and filter tasks |
| `POST` | `/api/tasks` | Create task |
| `PATCH` / `DELETE` | `/api/tasks/:id` | Update / delete task |
| `GET` / `POST` | `/api/focus` | List / log focus sessions |
| `POST` | `/api/ai/plan` | `{ focus, start, end, team? }` → time-blocked plan |
| `POST` | `/api/ai/prioritize` | Re-rank open tasks (personal or `{ team }`) |
| `GET` / `POST` | `/api/teams` | List my teams / create a team |
| `POST` | `/api/teams/join` | `{ code }` → join as member |
| `GET` / `PATCH` / `DELETE` | `/api/teams/:id` | Team, members and role / rename (admin) / delete (owner) |
| `PATCH` / `DELETE` | `/api/teams/:id/members/:userId` | Change role / remove member or leave |
| `GET` | `/api/teams/:id/activity` | Activity feed |
| `POST` | `/api/teams/:id/standup` | AI async standup |
| `GET` / `POST` | `/api/tasks/:id/comments` | Comments with @mentions |

The realtime channel is Socket.IO with JWT handshake auth. It emits `task:upsert`, `task:delete`, `comment:new`, `activity`, `presence`, `mention` and `assigned` events, scoped to `team:<id>` and `user:<id>` rooms.

## Deployment

- **Frontend:** pushing to `main` triggers `.github/workflows/deploy.yml`, which builds `client/` and publishes it to GitHub Pages. In the repository settings, go to **Settings → Pages** and set **Source** to **GitHub Actions**.
- **Backend:** `server/` is a standard container (`server/Dockerfile`) and can be deployed to any container host (Render, Railway, Fly.io, Azure Container Apps). Set `MONGO_URI`, `JWT_SECRET`, `CORS_ORIGIN` and optionally `OPENAI_API_KEY`, then build the frontend with `VITE_API_URL` pointing at it.

## Project structure

```
├── client/                 # React SPA
│   ├── src/components/     # UI primitives, app components, Three.js scene
│   ├── src/context/        # Auth, theme, toasts, workspace data, app UI
│   ├── src/lib/            # API client, demo backend, planner, quick-add parser, stats
│   └── src/pages/          # Landing, auth, app (overview, tasks, focus, settings)
├── server/                 # Express API
│   ├── src/routes/         # auth, tasks, focus, ai
│   ├── src/services/       # planner, OpenAI integration, demo data
│   └── test/               # unit tests
├── docker-compose.yml
└── .github/workflows/      # CI and GitHub Pages deploy
```

---

Designed and built by [Arpita Pandey](https://arpita-devlops.github.io/MyPortfolio/).
