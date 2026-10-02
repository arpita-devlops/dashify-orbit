import jwt from 'jsonwebtoken';
import { Server } from 'socket.io';
import { config } from './config.js';
import { Membership } from './models/Team.js';

// Rooms: `user:<id>` for personal notifications, `team:<id>` for shared boards.
let io = null;

export function initRealtime(httpServer) {
  io = new Server(httpServer, { cors: { origin: config.corsOrigins } });

  io.use((socket, next) => {
    try {
      socket.data.userId = jwt.verify(socket.handshake.auth?.token, config.jwtSecret).sub;
      next();
    } catch {
      next(new Error('unauthorized'));
    }
  });

  io.on('connection', async (socket) => {
    const { userId } = socket.data;
    socket.join(`user:${userId}`);
    const memberships = await Membership.find({ user: userId }).select('team').lean();
    for (const m of memberships) {
      socket.join(`team:${m.team}`);
      emitPresence(m.team);
    }

    socket.on('disconnecting', () => {
      const teams = [...socket.rooms].filter((r) => r.startsWith('team:')).map((r) => r.slice(5));
      setTimeout(() => teams.forEach(emitPresence), 50);
    });
  });

  return io;
}

export async function emitPresence(teamId) {
  if (!io) return;
  const sockets = await io.in(`team:${teamId}`).fetchSockets();
  const online = [...new Set(sockets.map((s) => s.data.userId))];
  io.to(`team:${teamId}`).emit('dashify', { type: 'presence', teamId: String(teamId), online });
}

export function emitToTeam(teamId, payload) {
  io?.to(`team:${teamId}`).emit('dashify', { ...payload, teamId: String(teamId) });
}

export function emitToUser(userId, payload) {
  io?.to(`user:${userId}`).emit('dashify', { ...payload, userId: String(userId) });
}

export function joinTeamRoom(userId, teamId) {
  io?.in(`user:${userId}`).socketsJoin(`team:${teamId}`);
  emitPresence(teamId);
}

export function leaveTeamRoom(userId, teamId) {
  io?.in(`user:${userId}`).socketsLeave(`team:${teamId}`);
  emitPresence(teamId);
}

export function closeTeamRoom(teamId) {
  io?.in(`team:${teamId}`).socketsLeave(`team:${teamId}`);
}
