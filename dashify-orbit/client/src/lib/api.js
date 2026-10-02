import { ApiError, tokenStore } from './http';
import { createLocalApi } from './localApi';

const API_URL = (import.meta.env.VITE_API_URL || '').replace(/\/$/, '');

function createRemoteApi(aiEngine) {
  async function request(path, { method = 'GET', body } = {}) {
    const token = tokenStore.get();
    let res;
    try {
      res = await fetch(`${API_URL}/api${path}`, {
        method,
        headers: {
          ...(body ? { 'Content-Type': 'application/json' } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: body ? JSON.stringify(body) : undefined,
      });
    } catch {
      throw new ApiError('Cannot reach the Dashify server. Check your connection.');
    }

    if (res.status === 204) return null;
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      if (res.status === 401 && token) window.dispatchEvent(new Event('dashify:unauthorized'));
      throw new ApiError(data.error || `Request failed (${res.status})`, res.status);
    }
    return data;
  }

  const id = (value) => encodeURIComponent(value);
  const post = (path, body) => request(path, { method: 'POST', body: body ?? {} });

  return {
    mode: 'live',
    aiEngine,
    auth: {
      register: (input) => request('/auth/register', { method: 'POST', body: input }),
      login: (input) => request('/auth/login', { method: 'POST', body: input }),
      me: async () => (await request('/auth/me')).user,
      updateProfile: async (input) => (await request('/auth/me', { method: 'PATCH', body: input })).user,
    },
    tasks: {
      list: async ({ teamId } = {}) => (await request(`/tasks${teamId ? `?team=${id(teamId)}` : ''}`)).tasks,
      create: async (input) => (await request('/tasks', { method: 'POST', body: input })).task,
      update: async (taskId, patch) => (await request(`/tasks/${id(taskId)}`, { method: 'PATCH', body: patch })).task,
      remove: (taskId) => request(`/tasks/${id(taskId)}`, { method: 'DELETE' }),
    },
    comments: {
      list: async (taskId) => (await request(`/tasks/${id(taskId)}/comments`)).comments,
      create: async (taskId, body) => (await post(`/tasks/${id(taskId)}/comments`, { body })).comment,
    },
    teams: {
      list: async () => (await request('/teams')).teams,
      create: async (name) => (await post('/teams', { name })).team,
      join: async (code) => (await post('/teams/join', { code })).team,
      get: (teamId) => request(`/teams/${id(teamId)}`),
      rename: async (teamId, name) => (await request(`/teams/${id(teamId)}`, { method: 'PATCH', body: { name } })).team,
      remove: (teamId) => request(`/teams/${id(teamId)}`, { method: 'DELETE' }),
      regenerateCode: async (teamId) => (await post(`/teams/${id(teamId)}/code`)).team,
      setRole: (teamId, userId, role) => request(`/teams/${id(teamId)}/members/${id(userId)}`, { method: 'PATCH', body: { role } }),
      removeMember: (teamId, userId) => request(`/teams/${id(teamId)}/members/${id(userId)}`, { method: 'DELETE' }),
      activity: async (teamId) => (await request(`/teams/${id(teamId)}/activity`)).activity,
      standup: (teamId) => post(`/teams/${id(teamId)}/standup`),
    },
    focus: {
      list: async () => (await request('/focus')).sessions,
      create: async (input) => (await request('/focus', { method: 'POST', body: input })).session,
    },
    ai: {
      plan: (input) => post('/ai/plan', input),
      prioritize: (input) => post('/ai/prioritize', input),
    },
    realtime: {
      // socket.io-client is loaded lazily so the static demo build never ships it to visitors.
      connect(onEvent) {
        let socket = null;
        let closed = false;
        import('socket.io-client').then(({ io }) => {
          if (closed) return;
          socket = io(API_URL, { auth: { token: tokenStore.get() }, transports: ['websocket', 'polling'] });
          socket.on('dashify', onEvent);
          socket.on('connect', () => onEvent({ type: 'connection', status: 'online' }));
          socket.on('disconnect', () => onEvent({ type: 'connection', status: 'offline' }));
        });
        return () => {
          closed = true;
          socket?.disconnect();
        };
      },
    },
  };
}

/**
 * Uses the Express API when VITE_API_URL points at a reachable server,
 * otherwise falls back to the in-browser demo backend (e.g. on GitHub Pages).
 */
export async function createApi() {
  if (API_URL) {
    try {
      const res = await fetch(`${API_URL}/api/health`, { signal: AbortSignal.timeout(2500) });
      if (res.ok) {
        const info = await res.json();
        return createRemoteApi(info.ai);
      }
    } catch {
      // Server unreachable — fall through to demo mode.
    }
  }
  return createLocalApi();
}
