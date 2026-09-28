import type { Types } from 'mongoose';
import { hasPermission, STAFF_ROLE_KEYS, type Permission } from '@vero/types';
import { Role } from '../../models/role.model';

/** Role → permissions cache (roles change rarely; invalidated on role updates). */
const roleCache = new Map<string, { permissions: string[]; at: number }>();
const TTL = 60_000;

export function invalidateRoleCache() {
  roleCache.clear();
}

export async function rolePermissions(roleId: Types.ObjectId | string): Promise<string[]> {
  const key = String(roleId);
  const hit = roleCache.get(key);
  if (hit && Date.now() - hit.at < TTL) return hit.permissions;
  const role = await Role.findById(roleId).select('permissions').lean();
  const permissions = role?.permissions ?? [];
  roleCache.set(key, { permissions, at: Date.now() });
  return permissions;
}

export async function effectivePermissions(user: { role: Types.ObjectId; permissions?: string[]; roleKey?: string }): Promise<string[]> {
  if (user.roleKey === 'SUPER_ADMIN') return ['*'];
  const fromRole = await rolePermissions(user.role);
  return Array.from(new Set([...fromRole, ...(user.permissions ?? [])]));
}

export function isStaffRole(roleKey: string, permissions: string[]): boolean {
  return (STAFF_ROLE_KEYS as readonly string[]).includes(roleKey) || permissions.length > 0;
}

/** Cost prices, margins, stock value and profit are finance data (same rule as the dashboard). */
export const FINANCE_PERMISSIONS: Permission[] = ['analytics.read', 'expenses.read'];

export function canSeeFinance(permissions: readonly string[] | undefined): boolean {
  return hasPermission(permissions, FINANCE_PERMISSIONS, 'any');
}
