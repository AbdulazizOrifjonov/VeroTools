import type { TFunction } from 'i18next';

/** "orders.update" → "Orders: Edit" (translated), for "no access" messages and the permission matrix. */
export function permissionLabel(t: TFunction, key: string): string {
  if (key === '*') return t('roles.allPermissions');
  const [group, action] = key.split('.');
  if (!group || !action) return key;
  const g = t(`enums.permissionGroup.${group}`, { defaultValue: group });
  const a = t(`enums.permissionAction.${action}`, { defaultValue: action });
  return `${g}: ${a}`;
}

/** Translated name of a system role; custom roles keep the name typed by the administrator. */
export function roleName(t: TFunction, role: { key: string; name?: string } | string): string {
  const key = typeof role === 'string' ? role : role.key;
  const fallback = typeof role === 'string' ? role : (role.name ?? role.key);
  return t(`enums.roles.${key}`, { defaultValue: fallback });
}
