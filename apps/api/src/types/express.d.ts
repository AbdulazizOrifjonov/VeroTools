import type { Language } from '@vero/config';
import type { Types } from 'mongoose';
import type { IUser } from '../models/user.model';

export interface RequestContext {
  lang: Language;
  client: 'web' | 'admin' | 'mobile';
  guestId: string | null;
  instanceId: string | null;
  ip: string;
  userAgent: string;
}

export interface AuthInfo {
  id: Types.ObjectId;
  user: IUser;
  roleKey: string;
  permissions: string[];
  isStaff: boolean;
}

declare global {
  namespace Express {
    interface Request {
      ctx: RequestContext;
      auth?: AuthInfo;
      /** validated input (body / query / params) */
      valid: { body?: unknown; query?: unknown; params?: unknown };
    }
  }
}

export {};
