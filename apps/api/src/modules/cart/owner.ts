import type { Request } from 'express';
import type { Types } from 'mongoose';
import { badRequest } from '../../lib/http-error';

export interface Owner {
  userId?: Types.ObjectId;
  guestId?: string;
}

/** Cart / wishlist / compare belong to the signed-in user, or to the anonymous X-Guest-Id. */
export function ownerOf(req: Request, required = true): Owner {
  if (req.auth) return { userId: req.auth.id };
  if (req.ctx.guestId) return { guestId: req.ctx.guestId };
  if (required) throw badRequest('BAD_REQUEST', 'X-Guest-Id header is required for guest sessions');
  return {};
}

export function ownerFilter(owner: Owner) {
  return owner.userId ? { user: owner.userId } : { guestId: owner.guestId };
}

export const GUEST_TTL_DAYS = 60;
export const guestExpiry = (owner: Owner) => (owner.userId ? null : new Date(Date.now() + GUEST_TTL_DAYS * 86_400_000));

export function syncTarget(owner: Owner) {
  return { userId: owner.userId ? String(owner.userId) : undefined, guestId: owner.guestId };
}
