import type { Server as HttpServer } from 'node:http';
import { Server, type Socket } from 'socket.io';
import { createAdapter } from '@socket.io/redis-adapter';
import { SOCKET_EVENTS, type SyncEntity } from '@vero/config';
import { hasPermission } from '@vero/types';
import { corsOrigins } from '../config/env';
import { logger } from '../config/logger';
import { verifyAccessToken } from './jwt';
import { getRedis } from './redis';
import { User } from '../models/user.model';
import { effectivePermissions } from '../modules/auth/permissions';

let io: Server | null = null;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const rooms = {
  user: (id: string) => `user:${id}`,
  guest: (id: string) => `guest:${id}`,
  admin: 'admin',
};

/** Attaches Socket.IO to the HTTP server. Clients authenticate with the access token (or a guest id). */
export function initSocket(server: HttpServer): Server {
  io = new Server(server, {
    cors: { origin: corsOrigins, credentials: true },
    path: '/socket.io',
    serveClient: false,
    pingInterval: 25_000,
    pingTimeout: 20_000,
  });

  const redis = getRedis();
  if (redis) {
    const sub = redis.duplicate();
    io.adapter(createAdapter(redis, sub));
    logger.info('Socket.IO Redis adapter enabled');
  }

  io.use(async (socket: Socket, next) => {
    try {
      const { token, guestId, admin } = (socket.handshake.auth ?? {}) as { token?: string | null; guestId?: string | null; admin?: boolean };
      if (token) {
        const claims = verifyAccessToken(token);
        const user = await User.findById(claims.sub).select('status roleKey permissions role tokenVersion').lean();
        if (!user || user.status !== 'active' || user.tokenVersion !== claims.tv) return next(new Error('UNAUTHORIZED'));
        socket.data.userId = String(user._id);
        await socket.join(rooms.user(String(user._id)));
        if (admin) {
          const perms = await effectivePermissions(user);
          if (hasPermission(perms, 'orders.read')) {
            socket.data.admin = true;
            await socket.join(rooms.admin);
          }
        }
      } else if (guestId && UUID_RE.test(guestId)) {
        socket.data.guestId = guestId;
        await socket.join(rooms.guest(guestId));
      }
      next();
    } catch {
      next(new Error('UNAUTHORIZED'));
    }
  });

  io.on('connection', (socket) => {
    logger.debug({ user: socket.data.userId, guest: socket.data.guestId, admin: socket.data.admin }, 'socket connected');
  });
  return io;
}

export function getIo(): Server | null {
  return io;
}

export interface SyncTarget {
  userId?: string | null;
  guestId?: string | null;
}

/** Tells every device of the owner to refetch an entity (cart, wishlist, orders, …). */
export function emitSync(target: SyncTarget, entity: SyncEntity, origin?: string | null, id?: string) {
  if (!io) return;
  const payload = { entity, id, origin: origin ?? undefined };
  if (target.userId) io.to(rooms.user(target.userId)).emit(SOCKET_EVENTS.sync, payload);
  if (target.guestId) io.to(rooms.guest(target.guestId)).emit(SOCKET_EVENTS.sync, payload);
}

export function emitToUser(userId: string, event: string, payload: unknown) {
  io?.to(rooms.user(userId)).emit(event, payload);
}

export function emitToAdmins(event: string, payload: unknown) {
  io?.to(rooms.admin).emit(event, payload);
}

export async function closeSocket() {
  await new Promise<void>((resolve) => (io ? io.close(() => resolve()) : resolve()));
  io = null;
}
