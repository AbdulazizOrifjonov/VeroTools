import type { NextFunction, Request, Response } from 'express';
import { hasPermission, type Permission } from '@vero/types';
import { verifyAccessToken } from '../lib/jwt';
import { HttpError, forbidden, unauthorized } from '../lib/http-error';
import { User } from '../models/user.model';
import { effectivePermissions, isStaffRole } from '../modules/auth/permissions';

async function resolveAuth(req: Request): Promise<void> {
  const header = req.header('authorization');
  if (!header?.startsWith('Bearer ')) return;
  const claims = verifyAccessToken(header.slice(7).trim());
  const user = await User.findById(claims.sub).lean();
  if (!user) throw unauthorized('TOKEN_INVALID', 'User no longer exists');
  if (user.status !== 'active') throw new HttpError(403, 'ACCOUNT_BLOCKED', 'Account is blocked');
  if (user.tokenVersion !== claims.tv) throw unauthorized('SESSION_EXPIRED', 'Session was revoked');
  const permissions = await effectivePermissions(user);
  req.auth = {
    id: user._id,
    user,
    roleKey: user.roleKey,
    permissions,
    isStaff: isStaffRole(user.roleKey, permissions),
  };
}

/** Attaches req.auth when a valid bearer token is present; anonymous requests continue. */
export async function optionalAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    await resolveAuth(req);
    next();
  } catch (err) {
    next(err);
  }
}

export async function requireAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    if (!req.auth) await resolveAuth(req);
    if (!req.auth) throw unauthorized();
    next();
  } catch (err) {
    next(err);
  }
}

/** Staff-only area (admin panel). */
export async function requireStaff(req: Request, _res: Response, next: NextFunction) {
  try {
    if (!req.auth) await resolveAuth(req);
    if (!req.auth) throw unauthorized();
    if (!req.auth.isStaff) throw forbidden('Admin access required');
    next();
  } catch (err) {
    next(err);
  }
}

export function requirePermission(permission: Permission | Permission[], mode: 'all' | 'any' = 'all') {
  const guard = (req: Request, _res: Response, next: NextFunction) => {
    if (!req.auth) return next(unauthorized());
    if (!hasPermission(req.auth.permissions, permission, mode)) return next(forbidden());
    next();
  };
  // read by the endpoint index generator (apps/api/scripts/api-docs.ts)
  return Object.assign(guard, { permission, permissionMode: mode });
}
