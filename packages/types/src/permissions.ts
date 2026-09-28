import type { SystemRoleKey } from './enums';

/**
 * Granular permission keys. `*` is a wildcard used only by SUPER_ADMIN.
 * Groups drive the Roles & Permissions matrix in the admin panel.
 */
export const PERMISSION_GROUPS = {
  dashboard: ['dashboard.read'],
  products: ['products.read', 'products.create', 'products.update', 'products.delete'],
  categories: ['categories.read', 'categories.create', 'categories.update', 'categories.delete'],
  brands: ['brands.read', 'brands.create', 'brands.update', 'brands.delete'],
  orders: ['orders.read', 'orders.update'],
  customers: ['customers.read', 'customers.update'],
  users: ['users.read', 'users.create', 'users.update', 'users.delete'],
  roles: ['roles.read', 'roles.manage'],
  reviews: ['reviews.read', 'reviews.moderate'],
  inventory: ['inventory.read', 'inventory.update'],
  coupons: ['coupons.read', 'coupons.create', 'coupons.update', 'coupons.delete'],
  promotions: ['promotions.read', 'promotions.create', 'promotions.update', 'promotions.delete'],
  banners: ['banners.read', 'banners.create', 'banners.update', 'banners.delete'],
  media: ['media.read', 'media.upload', 'media.delete'],
  payments: ['payments.read', 'payments.update'],
  delivery: ['delivery.read', 'delivery.update'],
  expenses: ['expenses.read', 'expenses.create', 'expenses.update', 'expenses.delete'],
  analytics: ['analytics.read'],
  reports: ['reports.read', 'reports.export'],
  notifications: ['notifications.read', 'notifications.send'],
  translations: ['translations.read', 'translations.update'],
  content: ['content.read', 'content.update'],
  settings: ['settings.read', 'settings.update'],
  audit: ['audit.read'],
} as const;

export type PermissionGroup = keyof typeof PERMISSION_GROUPS;
export type Permission = (typeof PERMISSION_GROUPS)[PermissionGroup][number];
export type PermissionOrWildcard = Permission | '*';

export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSION_GROUPS).flat() as Permission[];

const read = (g: PermissionGroup) => `${g}.read` as Permission;

/** Default permission sets for the system roles (seeded; editable in the admin panel except SUPER_ADMIN). */
export const DEFAULT_ROLE_PERMISSIONS: Record<SystemRoleKey, PermissionOrWildcard[]> = {
  CUSTOMER: [],
  MANAGER: [
    'dashboard.read',
    'products.read',
    'products.update',
    'categories.read',
    'brands.read',
    'orders.read',
    'orders.update',
    'customers.read',
    'reviews.read',
    'reviews.moderate',
    'inventory.read',
    'inventory.update',
    'coupons.read',
    'promotions.read',
    'banners.read',
    'media.read',
    'media.upload',
    'payments.read',
    'delivery.read',
    'notifications.read',
    'content.read',
  ],
  ADMIN: ALL_PERMISSIONS.filter((p) => !['roles.manage', 'users.delete', 'audit.read'].includes(p)).concat([
    read('audit'),
  ]),
  SUPER_ADMIN: ['*'],
};

export function hasPermission(
  granted: readonly string[] | undefined | null,
  required: Permission | readonly Permission[],
  mode: 'all' | 'any' = 'all',
): boolean {
  if (!granted || granted.length === 0) return false;
  if (granted.includes('*')) return true;
  const list = Array.isArray(required) ? required : [required as Permission];
  return mode === 'all' ? list.every((p) => granted.includes(p)) : list.some((p) => granted.includes(p));
}
