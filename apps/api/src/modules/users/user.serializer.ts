import type { Language } from '@vero/config';
import type { UserDTO } from '@vero/types';
import type { IUser } from '../../models/user.model';
import { iso, toImageRef } from '../../lib/localize';
import { isStaffRole } from '../auth/permissions';

export function toUserDTO(user: IUser, permissions: string[], lang: Language): UserDTO {
  const staff = isStaffRole(user.roleKey, permissions);
  return {
    id: String(user._id),
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName} ${user.lastName}`.trim(),
    email: user.email || undefined,
    phone: user.phone,
    avatar: toImageRef(user.avatar, lang, user.firstName),
    role: user.roleKey,
    isStaff: staff,
    permissions: staff ? permissions : [],
    isEmailVerified: user.isEmailVerified,
    isPhoneVerified: user.isPhoneVerified,
    preferences: {
      language: user.preferences?.language ?? 'uz',
      theme: user.preferences?.theme ?? 'system',
      notifications: {
        email: user.preferences?.notifications?.email ?? true,
        push: user.preferences?.notifications?.push ?? true,
        sms: user.preferences?.notifications?.sms ?? true,
        promotions: user.preferences?.notifications?.promotions ?? true,
        priceDrops: user.preferences?.notifications?.priceDrops ?? true,
        backInStock: user.preferences?.notifications?.backInStock ?? true,
      },
    },
    stats: { ordersCount: user.stats?.ordersCount ?? 0, reviewsCount: user.stats?.reviewsCount ?? 0 },
    createdAt: iso(user.createdAt)!,
  };
}
