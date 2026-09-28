import bcrypt from 'bcryptjs';
import { Types } from 'mongoose';
import type { AuthResult } from '@vero/types';
import type { RegisterData } from '@vero/validation';
import { isEmail, normalizeUzPhone } from '@vero/utils';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { hashCode, otpCode, randomToken, sha256 } from '../../lib/crypto';
import { HttpError, badRequest, unauthorized } from '../../lib/http-error';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../../lib/jwt';
import { emailLayout, sendMail } from '../../lib/mailer';
import { sendSms } from '../../lib/sms';
import { events } from '../../lib/events';
import { Role } from '../../models/role.model';
import { RefreshToken, VerificationCode, type VerificationPurpose } from '../../models/token.model';
import { User, type IUser } from '../../models/user.model';
import type { RequestContext } from '../../types/express';
import { toUserDTO } from '../users/user.serializer';
import { effectivePermissions } from './permissions';

const OTP_TTL_MS = 5 * 60_000;
const OTP_COOLDOWN_MS = 60_000;
const OTP_MAX_ATTEMPTS = 5;
const EMAIL_TOKEN_TTL_MS = 60 * 60_000;

export const hashPassword = (password: string) => bcrypt.hash(password, env.BCRYPT_ROUNDS);
export const verifyPassword = (password: string, hash: string) => bcrypt.compare(password, hash);

// real bcrypt hash of a random value, computed once: keeps "unknown user" logins as slow as real ones
let dummyHash: Promise<string> | null = null;
const getDummyHash = () => (dummyHash ??= bcrypt.hash(randomToken(12), env.BCRYPT_ROUNDS));

export async function customerRoleId(): Promise<Types.ObjectId> {
  const role = await Role.findOne({ key: 'CUSTOMER' }).select('_id').lean();
  if (role) return role._id;
  const created = await Role.create({ key: 'CUSTOMER', name: 'Customer', permissions: [], isSystem: true });
  return created._id;
}

async function buildAuthResult(user: IUser, ctx: RequestContext, family?: string): Promise<AuthResult> {
  const permissions = await effectivePermissions(user);
  const tokenId = new Types.ObjectId();
  const fam = family ?? randomToken(16);
  const refreshToken = signRefreshToken({ sub: String(user._id), jti: String(tokenId), fam });
  await RefreshToken.create({
    _id: tokenId,
    user: user._id,
    tokenHash: sha256(refreshToken),
    family: fam,
    client: ctx.client,
    userAgent: ctx.userAgent.slice(0, 300),
    ip: ctx.ip,
    expiresAt: new Date(Date.now() + env.JWT_REFRESH_TTL_DAYS * 86_400_000),
  });
  const access = signAccessToken({ sub: String(user._id), role: user.roleKey, tv: user.tokenVersion ?? 0 });
  return {
    user: toUserDTO(user, permissions, ctx.lang),
    accessToken: access.token,
    expiresIn: access.expiresIn,
    refreshToken,
  };
}

export async function register(input: RegisterData, ctx: RequestContext): Promise<{ result: AuthResult; user: IUser }> {
  const [phoneTaken, emailTaken] = await Promise.all([
    User.exists({ phone: input.phone }),
    input.email ? User.exists({ email: input.email }) : Promise.resolve(null),
  ]);
  if (phoneTaken) throw new HttpError(409, 'PHONE_TAKEN', 'Phone number already registered', { fields: { phone: 'errors.PHONE_TAKEN' } });
  if (emailTaken) throw new HttpError(409, 'EMAIL_TAKEN', 'Email already registered', { fields: { email: 'errors.EMAIL_TAKEN' } });
  const user = await User.create({
    firstName: input.firstName,
    lastName: input.lastName,
    phone: input.phone,
    email: input.email,
    passwordHash: await hashPassword(input.password),
    role: await customerRoleId(),
    roleKey: 'CUSTOMER',
    preferences: { language: ctx.lang },
    lastLoginAt: new Date(),
  });
  const plain = user.toObject() as IUser;
  events.emit('user.registered', { userId: user._id });
  if (plain.email) void requestEmailVerification(plain).catch((err) => logger.warn({ err }, 'verification e-mail failed'));
  return { result: await buildAuthResult(plain, ctx), user: plain };
}

export async function findByLogin(login: string) {
  const trimmed = login.trim();
  if (isEmail(trimmed)) return User.findOne({ email: trimmed.toLowerCase() }).select('+passwordHash').lean();
  const phone = normalizeUzPhone(trimmed);
  if (!phone) return null;
  return User.findOne({ phone }).select('+passwordHash').lean();
}

export async function login(loginValue: string, password: string, ctx: RequestContext, opts: { staffOnly?: boolean } = {}) {
  const user = await findByLogin(loginValue);
  const ok = await verifyPassword(password, user?.passwordHash ?? (await getDummyHash()));
  if (!user || !ok) throw new HttpError(401, 'INVALID_CREDENTIALS', 'Invalid login or password');
  if (user.status !== 'active') throw new HttpError(403, 'ACCOUNT_BLOCKED', 'Account is blocked');
  if (opts.staffOnly) {
    const perms = await effectivePermissions(user);
    if (user.roleKey === 'CUSTOMER' && perms.length === 0) throw new HttpError(403, 'FORBIDDEN', 'Admin access required');
  }
  await User.updateOne({ _id: user._id }, { $set: { lastLoginAt: new Date() } });
  return { result: await buildAuthResult(user, ctx), user };
}

export async function refresh(token: string, ctx: RequestContext): Promise<AuthResult> {
  const claims = verifyRefreshToken(token);
  const doc = await RefreshToken.findById(claims.jti);
  if (!doc || doc.tokenHash !== sha256(token)) throw unauthorized('SESSION_EXPIRED', 'Session expired');
  if (doc.revokedAt) {
    // Reuse of a rotated token → assume theft and revoke the whole family.
    await RefreshToken.updateMany({ family: doc.family, revokedAt: null }, { $set: { revokedAt: new Date() } });
    logger.warn({ user: String(doc.user), family: doc.family }, 'refresh token reuse detected — session family revoked');
    throw unauthorized('SESSION_EXPIRED', 'Session expired');
  }
  if (doc.expiresAt < new Date()) throw unauthorized('SESSION_EXPIRED', 'Session expired');
  const user = await User.findById(doc.user).lean();
  if (!user || user.status !== 'active') throw unauthorized('SESSION_EXPIRED', 'Session expired');
  const result = await buildAuthResult(user, ctx, doc.family);
  const newId = verifyRefreshToken(result.refreshToken!).jti;
  // concurrency-safe rotation: only one request may rotate a given token
  const rotated = await RefreshToken.updateOne(
    { _id: doc._id, revokedAt: null },
    { $set: { revokedAt: new Date(), replacedBy: new Types.ObjectId(newId), lastUsedAt: new Date() } },
  );
  if (rotated.modifiedCount === 0) {
    await RefreshToken.deleteOne({ _id: newId });
    throw unauthorized('SESSION_EXPIRED', 'Session expired');
  }
  return result;
}

export async function logout(token: string | undefined): Promise<void> {
  if (!token) return;
  try {
    const claims = verifyRefreshToken(token);
    await RefreshToken.updateOne({ _id: claims.jti, revokedAt: null }, { $set: { revokedAt: new Date() } });
  } catch {
    /* already invalid */
  }
}

export async function revokeAllSessions(userId: Types.ObjectId) {
  await RefreshToken.updateMany({ user: userId, revokedAt: null }, { $set: { revokedAt: new Date() } });
  await User.updateOne({ _id: userId }, { $inc: { tokenVersion: 1 } });
}

/* ------------------------------ OTP ------------------------------ */

export async function sendOtp(phone: string, purpose: 'verify_phone' | 'reset_password', userId?: Types.ObjectId) {
  const last = await VerificationCode.findOne({ purpose, target: phone }).sort({ createdAt: -1 }).lean();
  if (last && Date.now() - new Date(last.lastSentAt).getTime() < OTP_COOLDOWN_MS) {
    const wait = Math.ceil((OTP_COOLDOWN_MS - (Date.now() - new Date(last.lastSentAt).getTime())) / 1000);
    throw new HttpError(429, 'OTP_COOLDOWN', 'Please wait before requesting a new code', { details: { cooldownSeconds: wait } });
  }
  const code = otpCode();
  await VerificationCode.create({
    purpose,
    target: phone,
    user: userId,
    codeHash: hashCode(phone, code),
    expiresAt: new Date(Date.now() + OTP_TTL_MS),
  });
  const text =
    purpose === 'reset_password'
      ? `VERO TOOLS: parolni tiklash kodi / код восстановления: ${code}`
      : `VERO TOOLS: tasdiqlash kodi / код подтверждения: ${code}`;
  await sendSms(phone, text);
  if (env.NODE_ENV === 'development') logger.info({ phone, code, purpose }, '[otp:dev] code generated');
  return { cooldownSeconds: OTP_COOLDOWN_MS / 1000 };
}

async function consumeOtp(phone: string, code: string, purpose: VerificationPurpose) {
  const doc = await VerificationCode.findOne({ purpose, target: phone, usedAt: null }).sort({ createdAt: -1 });
  if (!doc) throw new HttpError(400, 'OTP_INVALID', 'Invalid code');
  if (doc.expiresAt < new Date()) throw new HttpError(400, 'OTP_EXPIRED', 'Code expired');
  if (doc.attempts >= OTP_MAX_ATTEMPTS) throw new HttpError(429, 'OTP_TOO_MANY_ATTEMPTS', 'Too many attempts');
  if (doc.codeHash !== hashCode(phone, code)) {
    doc.attempts += 1;
    await doc.save();
    throw new HttpError(400, 'OTP_INVALID', 'Invalid code');
  }
  doc.usedAt = new Date();
  await doc.save();
  return doc;
}

export async function verifyPhone(userId: Types.ObjectId, phone: string, code: string) {
  const user = await User.findById(userId).lean();
  if (!user || user.phone !== phone) throw badRequest('BAD_REQUEST', 'Phone does not match the account');
  await consumeOtp(phone, code, 'verify_phone');
  await User.updateOne({ _id: userId }, { $set: { isPhoneVerified: true } });
}

/* ----------------------- password reset / email ------------------- */

export async function forgotPassword(loginValue: string, lang: string): Promise<{ channel: 'email' | 'sms'; cooldownSeconds?: number }> {
  const trimmed = loginValue.trim();
  if (isEmail(trimmed)) {
    const email = trimmed.toLowerCase();
    const user = await User.findOne({ email }).lean();
    if (user && user.status === 'active') {
      const token = randomToken(32);
      await VerificationCode.create({
        purpose: 'reset_password_email',
        target: email,
        user: user._id,
        codeHash: sha256(token),
        expiresAt: new Date(Date.now() + EMAIL_TOKEN_TTL_MS),
      });
      const url = `${env.CLIENT_URL}/reset-password?token=${token}`;
      const t = RESET_EMAIL[lang as keyof typeof RESET_EMAIL] ?? RESET_EMAIL.uz;
      await sendMail({ to: email, subject: t.subject, html: emailLayout({ title: t.title, intro: t.intro, button: { label: t.button, url }, footer: t.footer }) });
      if (env.NODE_ENV === 'development') logger.info({ url }, '[mail:dev] password reset link');
    }
    return { channel: 'email' };
  }
  const phone = normalizeUzPhone(trimmed);
  if (!phone) throw badRequest('VALIDATION_ERROR', 'Enter a phone number or e-mail');
  const user = await User.findOne({ phone }).lean();
  if (user && user.status === 'active') {
    try {
      await sendOtp(phone, 'reset_password', user._id);
    } catch (err) {
      // a cooldown hit must look exactly like the answer for an unknown number (no account enumeration)
      if (!(err instanceof HttpError && err.code === 'OTP_COOLDOWN')) throw err;
    }
  }
  return { channel: 'sms', cooldownSeconds: OTP_COOLDOWN_MS / 1000 };
}

export async function resetPassword(input: { token?: string; phone?: string; code?: string; password: string }) {
  let userId: Types.ObjectId | undefined;
  let phoneVerified = false;
  if (input.token) {
    const doc = await VerificationCode.findOne({ purpose: 'reset_password_email', codeHash: sha256(input.token), usedAt: null });
    if (!doc) throw new HttpError(400, 'TOKEN_INVALID', 'Invalid or used link');
    if (doc.expiresAt < new Date()) throw new HttpError(400, 'TOKEN_EXPIRED', 'Link expired');
    doc.usedAt = new Date();
    await doc.save();
    userId = doc.user;
  } else if (input.phone && input.code) {
    const phone = normalizeUzPhone(input.phone);
    if (!phone) throw badRequest('VALIDATION_ERROR', 'Invalid phone');
    const doc = await consumeOtp(phone, input.code, 'reset_password');
    userId = doc.user ?? (await User.findOne({ phone }).select('_id').lean())?._id;
    phoneVerified = true;
  }
  if (!userId) throw new HttpError(400, 'TOKEN_INVALID', 'Invalid request');
  await User.updateOne(
    { _id: userId },
    {
      $set: { passwordHash: await hashPassword(input.password), passwordChangedAt: new Date(), ...(phoneVerified ? { isPhoneVerified: true } : {}) },
    },
  );
  await revokeAllSessions(userId);
}

export async function changePassword(userId: Types.ObjectId, current: string, next: string) {
  const user = await User.findById(userId).select('+passwordHash').lean();
  if (!user || !(await verifyPassword(current, user.passwordHash))) {
    throw new HttpError(400, 'INVALID_PASSWORD', 'Current password is incorrect', { fields: { currentPassword: 'errors.INVALID_PASSWORD' } });
  }
  await User.updateOne({ _id: userId }, { $set: { passwordHash: await hashPassword(next), passwordChangedAt: new Date() } });
  await revokeAllSessions(userId);
}

export async function requestEmailVerification(user: Pick<IUser, '_id' | 'email' | 'preferences' | 'isEmailVerified'>) {
  if (!user.email || user.isEmailVerified) return;
  const token = randomToken(32);
  await VerificationCode.create({
    purpose: 'verify_email',
    target: user.email,
    user: user._id,
    codeHash: sha256(token),
    expiresAt: new Date(Date.now() + 24 * 3600_000),
  });
  const url = `${env.CLIENT_URL}/verify-email?token=${token}`;
  const t = VERIFY_EMAIL[user.preferences?.language ?? 'uz'];
  await sendMail({ to: user.email, subject: t.subject, html: emailLayout({ title: t.title, intro: t.intro, button: { label: t.button, url }, footer: t.footer }) });
  if (env.NODE_ENV === 'development') logger.info({ url }, '[mail:dev] e-mail verification link');
}

export async function verifyEmail(token: string) {
  const doc = await VerificationCode.findOne({ purpose: 'verify_email', codeHash: sha256(token), usedAt: null });
  if (!doc) throw new HttpError(400, 'TOKEN_INVALID', 'Invalid or used link');
  if (doc.expiresAt < new Date()) throw new HttpError(400, 'TOKEN_EXPIRED', 'Link expired');
  doc.usedAt = new Date();
  await doc.save();
  await User.updateOne({ _id: doc.user, email: doc.target }, { $set: { isEmailVerified: true } });
}

const RESET_EMAIL = {
  uz: {
    subject: 'Parolni tiklash — VERO TOOLS',
    title: 'Parolni tiklash',
    intro: 'Hisobingiz uchun parolni tiklash so\'raldi. Yangi parol o\'rnatish uchun tugmani bosing. Havola 1 soat amal qiladi.',
    button: 'Yangi parol o\'rnatish',
    footer: 'Agar siz so\'rov yubormagan bo\'lsangiz, ushbu xatni e\'tiborsiz qoldiring.',
  },
  ru: {
    subject: 'Восстановление пароля — VERO TOOLS',
    title: 'Восстановление пароля',
    intro: 'Для вашего аккаунта запрошено восстановление пароля. Нажмите кнопку, чтобы задать новый пароль. Ссылка действует 1 час.',
    button: 'Задать новый пароль',
    footer: 'Если вы не отправляли запрос, просто проигнорируйте это письмо.',
  },
  en: {
    subject: 'Reset your password — VERO TOOLS',
    title: 'Reset your password',
    intro: 'A password reset was requested for your account. Use the button below to set a new password. The link is valid for 1 hour.',
    button: 'Set a new password',
    footer: 'If you did not request this, you can safely ignore this e-mail.',
  },
};

const VERIFY_EMAIL = {
  uz: {
    subject: 'Emailni tasdiqlang — VERO TOOLS',
    title: 'Email manzilingizni tasdiqlang',
    intro: 'VERO TOOLS hisobingiz uchun ushbu email manzilini tasdiqlang.',
    button: 'Emailni tasdiqlash',
    footer: 'Havola 24 soat amal qiladi.',
  },
  ru: {
    subject: 'Подтвердите email — VERO TOOLS',
    title: 'Подтвердите ваш email',
    intro: 'Подтвердите этот адрес электронной почты для аккаунта VERO TOOLS.',
    button: 'Подтвердить email',
    footer: 'Ссылка действует 24 часа.',
  },
  en: {
    subject: 'Confirm your email — VERO TOOLS',
    title: 'Confirm your email address',
    intro: 'Please confirm this email address for your VERO TOOLS account.',
    button: 'Confirm email',
    footer: 'The link is valid for 24 hours.',
  },
};
