import { Router, type Request, type Response } from 'express';
import type { AuthResult } from '@vero/types';
import {
  forgotPasswordSchema,
  loginSchema,
  refreshSchema,
  registerSchema,
  resetPasswordSchema,
  sendOtpSchema,
  verifyEmailSchema,
  verifyOtpSchema,
  type RegisterData,
} from '@vero/validation';
import { env } from '../../config/env';
import { logger } from '../../config/logger';
import { requireAuth } from '../../middleware/auth';
import { authLimiter, otpLimiter } from '../../middleware/rate-limit';
import { validate, body } from '../../middleware/validate';
import { badRequest } from '../../lib/http-error';
import { noContent, noStore, ok } from '../../lib/respond';
import { mergeGuestCart } from '../cart/cart.service';
import { mergeGuestCompare, mergeGuestWishlist } from '../cart/wishlist-compare.service';
import { toUserDTO } from '../users/user.serializer';
import * as auth from './auth.service';

export const authRouter = Router();

const cookieName = (client: string) => (client === 'admin' ? 'vt_art' : 'vt_rt');
const cookieOptions = {
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: 'lax' as const,
  path: '/api/auth',
  domain: env.COOKIE_DOMAIN || undefined,
};

function sendAuth(req: Request, res: Response, result: AuthResult, status = 200) {
  noStore(res);
  if (req.ctx.client === 'mobile') return res.status(status).json({ data: result });
  res.cookie(cookieName(req.ctx.client), result.refreshToken!, { ...cookieOptions, maxAge: env.JWT_REFRESH_TTL_DAYS * 86_400_000 });
  const { refreshToken: _omit, ...rest } = result;
  return res.status(status).json({ data: rest });
}

async function mergeGuest(req: Request, userId: import('mongoose').Types.ObjectId) {
  const guestId = req.ctx.guestId;
  if (!guestId || req.ctx.client === 'admin') return;
  try {
    await mergeGuestCart(guestId, userId);
    await mergeGuestWishlist(guestId, userId);
    await mergeGuestCompare(guestId, userId);
  } catch (err) {
    logger.warn({ err }, 'guest session merge failed');
  }
}

authRouter.post('/register', authLimiter, validate({ body: registerSchema }), async (req, res) => {
  const { result, user } = await auth.register(body<RegisterData>(req), req.ctx);
  await mergeGuest(req, user._id);
  sendAuth(req, res, result, 201);
});

authRouter.post('/login', authLimiter, validate({ body: loginSchema }), async (req, res) => {
  const input = body<{ login: string; password: string }>(req);
  const { result, user } = await auth.login(input.login, input.password, req.ctx, { staffOnly: req.ctx.client === 'admin' });
  await mergeGuest(req, user._id);
  sendAuth(req, res, result);
});

authRouter.post('/refresh', validate({ body: refreshSchema }), async (req, res) => {
  const fromBody = body<{ refreshToken?: string }>(req).refreshToken;
  const token = fromBody ?? (req.cookies?.[cookieName(req.ctx.client)] as string | undefined);
  // no session at all (a guest visitor) is not an error: answer 204 so browsers don't log a failed request
  if (!token) return void noContent(res);
  const result = await auth.refresh(token, req.ctx);
  sendAuth(req, res, result);
});

authRouter.post('/logout', async (req, res) => {
  const token = (req.body as { refreshToken?: string })?.refreshToken ?? (req.cookies?.[cookieName(req.ctx.client)] as string | undefined);
  await auth.logout(token);
  res.clearCookie(cookieName(req.ctx.client), cookieOptions);
  noContent(res);
});

authRouter.post('/forgot-password', authLimiter, validate({ body: forgotPasswordSchema }), async (req, res) => {
  ok(res, await auth.forgotPassword(body<{ login: string }>(req).login, req.ctx.lang));
});

authRouter.post('/reset-password', authLimiter, validate({ body: resetPasswordSchema }), async (req, res) => {
  await auth.resetPassword(body<{ token?: string; phone?: string; code?: string; password: string }>(req));
  noContent(res);
});

authRouter.post('/verify-email', validate({ body: verifyEmailSchema }), async (req, res) => {
  await auth.verifyEmail(body<{ token: string }>(req).token);
  noContent(res);
});

authRouter.post('/verify-email/request', requireAuth, otpLimiter, async (req, res) => {
  await auth.requestEmailVerification(req.auth!.user);
  noContent(res);
});

authRouter.post('/otp/send', otpLimiter, requireAuth, validate({ body: sendOtpSchema }), async (req, res) => {
  const input = body<{ phone: string; purpose: 'verify_phone' | 'reset_password' }>(req);
  if (input.purpose !== 'verify_phone' || req.auth!.user.phone !== input.phone) throw badRequest('BAD_REQUEST', 'Phone does not match the account');
  ok(res, await auth.sendOtp(input.phone, 'verify_phone', req.auth!.id));
});

authRouter.post('/otp/verify', authLimiter, requireAuth, validate({ body: verifyOtpSchema }), async (req, res) => {
  const input = body<{ phone: string; code: string }>(req);
  await auth.verifyPhone(req.auth!.id, input.phone, input.code);
  noContent(res);
});

authRouter.get('/me', requireAuth, async (req, res) => {
  noStore(res);
  ok(res, toUserDTO(req.auth!.user, req.auth!.permissions, req.ctx.lang));
});
