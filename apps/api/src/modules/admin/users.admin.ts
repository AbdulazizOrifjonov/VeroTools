import { Router } from 'express';
import { ALL_PERMISSIONS, PERMISSION_GROUPS, type AdminAuditLog, type AdminRole, type AdminUser } from '@vero/types';
import { escapeRegex } from '@vero/utils';
import { adminResetPasswordSchema, adminUserCreateSchema, adminUserUpdateSchema, objectId, roleInputSchema, z } from '@vero/validation';
import { requirePermission } from '../../middleware/auth';
import { validate, body, params, query } from '../../middleware/validate';
import { HttpError, forbidden, notFound } from '../../lib/http-error';
import { created, noContent, ok, paged } from '../../lib/respond';
import { pageMeta } from '../../lib/pagination';
import { audit } from '../../lib/audit';
import { iso, toImageRef } from '../../lib/localize';
import { User, type IUser } from '../../models/user.model';
import { Role, Permission, type IRole } from '../../models/role.model';
import { AuditLog, type IAuditLog } from '../../models/audit-log.model';
import { effectivePermissions, invalidateRoleCache } from '../auth/permissions';
import { hashPassword, revokeAllSessions } from '../auth/auth.service';

export const usersAdminRouter = Router();
export const rolesAdminRouter = Router();
export const auditAdminRouter = Router();

const idParams = z.object({ id: objectId });
const VALID = new Set<string>(ALL_PERMISSIONS);
const cleanPermissions = (list: string[] | undefined) => (list ?? []).filter((p) => VALID.has(p));

async function toAdminUser(u: IUser): Promise<AdminUser> {
  const role = await Role.findById(u.role).lean();
  return {
    id: String(u._id),
    firstName: u.firstName,
    lastName: u.lastName,
    email: u.email || undefined,
    phone: u.phone,
    avatar: toImageRef(u.avatar, 'uz'),
    role: { id: String(u.role), key: u.roleKey, name: role?.name ?? u.roleKey },
    permissions: u.permissions ?? [],
    effectivePermissions: await effectivePermissions(u),
    status: u.status,
    lastLoginAt: iso(u.lastLoginAt),
    createdAt: iso(u.createdAt)!,
  };
}

export function toAuditDTO(a: IAuditLog): AdminAuditLog {
  return {
    id: String(a._id),
    user: a.user ? { id: String(a.user), name: a.userName ?? '', role: a.userRole } : undefined,
    action: a.action,
    target: a.target?.type ? { type: a.target.type, id: a.target.id, label: a.target.label } : undefined,
    changes: a.changes,
    meta: a.meta,
    ip: a.ip,
    userAgent: a.userAgent,
    createdAt: iso(a.createdAt)!,
  };
}

/** Only a SUPER_ADMIN may manage SUPER_ADMIN accounts or grant the SUPER_ADMIN role. */
function assertCanManage(req: import('express').Request, targetRoleKey: string) {
  if (targetRoleKey === 'SUPER_ADMIN' && req.auth!.roleKey !== 'SUPER_ADMIN') throw forbidden('Only a super admin can manage super admins');
}

/* ---------------------------------- users --------------------------------- */

const listQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().trim().max(80).optional(),
  role: z.string().max(40).optional(),
  status: z.enum(['active', 'blocked']).optional(),
});

usersAdminRouter.get('/', requirePermission('users.read'), validate({ query: listQuery }), async (req, res) => {
  const q = query<z.output<typeof listQuery>>(req);
  const filter: Record<string, unknown> = { roleKey: q.role ? q.role : { $ne: 'CUSTOMER' } };
  if (q.status) filter.status = q.status;
  if (q.q) {
    const rx = { $regex: escapeRegex(q.q), $options: 'i' };
    filter.$or = [{ firstName: rx }, { lastName: rx }, { email: rx }, { phone: rx }];
  }
  const [items, total] = await Promise.all([User.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(), User.countDocuments(filter)]);
  paged(res, await Promise.all(items.map(toAdminUser)), pageMeta(q.page, q.limit, total));
});

usersAdminRouter.get('/:id', requirePermission('users.read'), validate({ params: idParams }), async (req, res) => {
  const u = await User.findById(params<{ id: string }>(req).id).lean();
  if (!u) throw notFound('User');
  ok(res, await toAdminUser(u));
});

usersAdminRouter.post('/', requirePermission('users.create'), validate({ body: adminUserCreateSchema }), async (req, res) => {
  const input = body<z.output<typeof adminUserCreateSchema>>(req);
  const role = await Role.findById(input.role).lean();
  if (!role || role.key === 'CUSTOMER') throw new HttpError(422, 'VALIDATION_ERROR', 'Choose a staff role', { fields: { role: 'validation.oneOf' } });
  assertCanManage(req, role.key);
  if (await User.exists({ phone: input.phone })) throw new HttpError(409, 'PHONE_TAKEN', 'Phone already registered', { fields: { phone: 'errors.PHONE_TAKEN' } });
  if (await User.exists({ email: input.email })) throw new HttpError(409, 'EMAIL_TAKEN', 'Email already registered', { fields: { email: 'errors.EMAIL_TAKEN' } });
  const user = await User.create({
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    phone: input.phone,
    passwordHash: await hashPassword(input.password),
    role: role._id,
    roleKey: role.key,
    permissions: cleanPermissions(input.permissions),
    status: input.status,
    isEmailVerified: true,
  });
  await audit(req, { action: 'admin.create', target: { type: 'user', id: String(user._id), label: user.email }, meta: { role: role.key } });
  created(res, await toAdminUser(user.toObject() as IUser));
});

usersAdminRouter.patch('/:id', requirePermission('users.update'), validate({ params: idParams, body: adminUserUpdateSchema }), async (req, res) => {
  const input = body<z.output<typeof adminUserUpdateSchema>>(req);
  const u = await User.findById(params<{ id: string }>(req).id).lean();
  if (!u) throw notFound('User');
  assertCanManage(req, u.roleKey);
  const set: Record<string, unknown> = {};
  for (const k of ['firstName', 'lastName', 'email', 'phone', 'status'] as const) if (input[k] !== undefined) set[k] = input[k];
  if (input.permissions) set.permissions = cleanPermissions(input.permissions);
  let roleChanged = false;
  if (input.role && String(input.role) !== String(u.role)) {
    const role = await Role.findById(input.role).lean();
    if (!role) throw new HttpError(422, 'VALIDATION_ERROR', 'Role not found', { fields: { role: 'errors.NOT_FOUND' } });
    assertCanManage(req, role.key);
    if (String(u._id) === String(req.auth!.id) && u.roleKey === 'SUPER_ADMIN' && role.key !== 'SUPER_ADMIN') throw forbidden('You cannot demote yourself');
    set.role = role._id;
    set.roleKey = role.key;
    roleChanged = true;
  }
  if (input.password) {
    set.passwordHash = await hashPassword(input.password);
    set.passwordChangedAt = new Date();
  }
  if (String(u._id) === String(req.auth!.id) && input.status === 'blocked') throw forbidden('You cannot block yourself');
  if (set.email && set.email !== u.email && (await User.exists({ email: set.email, _id: { $ne: u._id } }))) throw new HttpError(409, 'EMAIL_TAKEN', 'Email already registered');
  if (set.phone && set.phone !== u.phone && (await User.exists({ phone: set.phone, _id: { $ne: u._id } }))) throw new HttpError(409, 'PHONE_TAKEN', 'Phone already registered');
  await User.updateOne({ _id: u._id }, { $set: set });
  if (input.password || input.status === 'blocked' || roleChanged) await revokeAllSessions(u._id);
  await audit(req, {
    action: roleChanged || input.permissions ? 'admin.permissions_change' : 'admin.update',
    target: { type: 'user', id: String(u._id), label: u.email ?? u.phone },
    changes: {
      ...(roleChanged ? { role: { from: u.roleKey, to: set.roleKey } } : {}),
      ...(input.permissions ? { permissions: { from: u.permissions, to: set.permissions } } : {}),
      ...(input.status && input.status !== u.status ? { status: { from: u.status, to: input.status } } : {}),
    },
  });
  ok(res, await toAdminUser((await User.findById(u._id).lean())!));
});

usersAdminRouter.post('/:id/reset-password', requirePermission('users.update'), validate({ params: idParams, body: adminResetPasswordSchema }), async (req, res) => {
  const u = await User.findById(params<{ id: string }>(req).id).lean();
  if (!u) throw notFound('User');
  assertCanManage(req, u.roleKey);
  await User.updateOne({ _id: u._id }, { $set: { passwordHash: await hashPassword(body<{ password: string }>(req).password), passwordChangedAt: new Date() } });
  await revokeAllSessions(u._id);
  await audit(req, { action: 'admin.reset_password', target: { type: 'user', id: String(u._id), label: u.email ?? u.phone } });
  noContent(res);
});

usersAdminRouter.delete('/:id', requirePermission('users.delete'), validate({ params: idParams }), async (req, res) => {
  const u = await User.findById(params<{ id: string }>(req).id).lean();
  if (!u || u.roleKey === 'CUSTOMER') throw notFound('User');
  assertCanManage(req, u.roleKey);
  if (String(u._id) === String(req.auth!.id)) throw forbidden('You cannot delete yourself');
  if (u.roleKey === 'SUPER_ADMIN' && (await User.countDocuments({ roleKey: 'SUPER_ADMIN', status: 'active' })) <= 1) throw forbidden('The last super admin cannot be removed');
  // staff accounts are deactivated (kept for the audit trail), not hard-deleted
  await User.updateOne({ _id: u._id }, { $set: { status: 'blocked' } });
  await revokeAllSessions(u._id);
  await audit(req, { action: 'admin.deactivate', target: { type: 'user', id: String(u._id), label: u.email ?? u.phone } });
  noContent(res);
});

usersAdminRouter.get('/:id/activity', requirePermission(['users.read', 'audit.read'], 'any'), validate({ params: idParams, query: z.object({ page: z.coerce.number().int().min(1).default(1), limit: z.coerce.number().int().min(1).max(100).default(20) }) }), async (req, res) => {
  const { id } = params<{ id: string }>(req);
  const q = query<{ page: number; limit: number }>(req);
  const [items, total] = await Promise.all([
    AuditLog.find({ user: id }).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(),
    AuditLog.countDocuments({ user: id }),
  ]);
  paged(res, items.map(toAuditDTO), pageMeta(q.page, q.limit, total));
});

/* ---------------------------------- roles --------------------------------- */

async function toAdminRole(r: IRole): Promise<AdminRole> {
  return {
    id: String(r._id),
    key: r.key,
    name: r.name,
    description: r.description,
    permissions: r.key === 'SUPER_ADMIN' ? ['*'] : r.permissions,
    isSystem: r.isSystem,
    usersCount: await User.countDocuments({ role: r._id }),
    createdAt: iso(r.createdAt)!,
    updatedAt: iso(r.updatedAt)!,
  };
}

rolesAdminRouter.get('/', requirePermission('roles.read'), async (_req, res) => {
  const roles = await Role.find().sort({ isSystem: -1, createdAt: 1 }).lean();
  ok(res, await Promise.all(roles.map(toAdminRole)));
});

/** Permission catalogue for the Roles & Permissions matrix (served at /admin/permissions and /admin/roles/permissions). */
export const permissionsAdminRouter = Router();

permissionsAdminRouter.get('/', requirePermission('roles.read'), async (_req, res) => {
  const docs = await Permission.find().lean();
  const byKey = new Map(docs.map((d) => [d.key, d]));
  ok(
    res,
    Object.entries(PERMISSION_GROUPS).flatMap(([group, keys]) =>
      keys.map((key) => ({ key, group, description: byKey.get(key)?.description ?? { uz: key, ru: key, en: key } })),
    ),
  );
});

rolesAdminRouter.use('/permissions', permissionsAdminRouter);

rolesAdminRouter.post('/', requirePermission('roles.manage'), validate({ body: roleInputSchema }), async (req, res) => {
  const input = body<z.output<typeof roleInputSchema>>(req);
  if (await Role.exists({ key: input.key })) throw new HttpError(409, 'CONFLICT', 'Role key already exists', { fields: { key: 'validation.duplicate' } });
  const role = await Role.create({ ...input, permissions: cleanPermissions(input.permissions), isSystem: false });
  invalidateRoleCache();
  await audit(req, { action: 'role.create', target: { type: 'role', id: String(role._id), label: role.key }, meta: { permissions: role.permissions } });
  created(res, await toAdminRole(role.toObject() as IRole));
});

rolesAdminRouter.put('/:id', requirePermission('roles.manage'), validate({ params: idParams, body: roleInputSchema.partial() }), async (req, res) => {
  const role = await Role.findById(params<{ id: string }>(req).id).lean();
  if (!role) throw notFound('Role');
  if (role.key === 'SUPER_ADMIN') throw new HttpError(403, 'SYSTEM_PROTECTED', 'The super admin role cannot be changed');
  const input = body<Partial<z.output<typeof roleInputSchema>>>(req);
  const set: Record<string, unknown> = {};
  if (input.name) set.name = input.name;
  if (input.description !== undefined) set.description = input.description;
  if (input.permissions) set.permissions = cleanPermissions(input.permissions);
  if (input.key && !role.isSystem && input.key !== role.key) {
    if (await Role.exists({ key: input.key })) throw new HttpError(409, 'CONFLICT', 'Role key already exists');
    set.key = input.key;
    await User.updateMany({ role: role._id }, { $set: { roleKey: input.key } });
  }
  await Role.updateOne({ _id: role._id }, { $set: set });
  invalidateRoleCache();
  await audit(req, { action: 'permission.change', target: { type: 'role', id: String(role._id), label: role.key }, changes: input.permissions ? { permissions: { from: role.permissions, to: set.permissions } } : undefined });
  ok(res, await toAdminRole((await Role.findById(role._id).lean())!));
});

rolesAdminRouter.delete('/:id', requirePermission('roles.manage'), validate({ params: idParams }), async (req, res) => {
  const role = await Role.findById(params<{ id: string }>(req).id).lean();
  if (!role) throw notFound('Role');
  if (role.isSystem) throw new HttpError(403, 'SYSTEM_PROTECTED', 'System roles cannot be deleted');
  if (await User.exists({ role: role._id })) throw new HttpError(409, 'IN_USE', 'Role is assigned to users');
  await Role.deleteOne({ _id: role._id });
  invalidateRoleCache();
  await audit(req, { action: 'role.delete', target: { type: 'role', id: String(role._id), label: role.key } });
  noContent(res);
});

/* ---------------------------------- audit --------------------------------- */

const auditQuery = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(30),
  user: objectId.optional(),
  action: z.string().max(60).optional(),
  targetType: z.string().max(40).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  q: z.string().max(80).optional(),
});

auditAdminRouter.get('/', requirePermission('audit.read'), validate({ query: auditQuery }), async (req, res) => {
  const q = query<z.output<typeof auditQuery>>(req);
  const filter: Record<string, unknown> = {};
  if (q.user) filter.user = q.user;
  if (q.action) filter.action = { $regex: `^${escapeRegex(q.action)}` };
  if (q.targetType) filter['target.type'] = q.targetType;
  if (q.from || q.to) filter.createdAt = { ...(q.from ? { $gte: q.from } : {}), ...(q.to ? { $lt: q.to } : {}) };
  if (q.q) filter.$or = [{ userName: { $regex: escapeRegex(q.q), $options: 'i' } }, { 'target.label': { $regex: escapeRegex(q.q), $options: 'i' } }];
  const [items, total] = await Promise.all([AuditLog.find(filter).sort({ createdAt: -1 }).skip((q.page - 1) * q.limit).limit(q.limit).lean(), AuditLog.countDocuments(filter)]);
  paged(res, items.map(toAuditDTO), pageMeta(q.page, q.limit, total));
});
