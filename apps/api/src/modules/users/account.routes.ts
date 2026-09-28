import { Router } from 'express';
import { changePasswordSchema, preferencesSchema, pushTokenSchema, updateProfileSchema, type PreferencesInput } from '@vero/validation';
import { requireAuth } from '../../middleware/auth';
import { validate, body } from '../../middleware/validate';
import { avatarUpload } from '../../middleware/upload';
import { uploadLimiter } from '../../middleware/rate-limit';
import { HttpError } from '../../lib/http-error';
import { noContent, noStore, ok } from '../../lib/respond';
import { emitSync } from '../../lib/socket';
import { User } from '../../models/user.model';
import { Review } from '../../models/review.model';
import { changePassword } from '../auth/auth.service';
import { deleteMedia, toImageValue, uploadFile } from '../media/media.service';
import { toUserDTO } from './user.serializer';
import { toReviewDTO } from '../reviews/review.serializer';

export const accountRouter = Router();
accountRouter.use(requireAuth, (_req, res, next) => {
  noStore(res);
  next();
});

async function respondUser(req: import('express').Request, res: import('express').Response) {
  const user = await User.findById(req.auth!.id).lean();
  emitSync({ userId: String(req.auth!.id) }, 'profile', req.ctx.instanceId);
  ok(res, toUserDTO(user!, req.auth!.permissions, req.ctx.lang));
}

accountRouter.patch('/', validate({ body: updateProfileSchema }), async (req, res) => {
  const input = body<{ firstName: string; lastName: string; email?: string }>(req);
  const current = req.auth!.user;
  if (input.email && input.email !== current.email && (await User.exists({ email: input.email, _id: { $ne: current._id } }))) {
    throw new HttpError(409, 'EMAIL_TAKEN', 'Email already registered', { fields: { email: 'errors.EMAIL_TAKEN' } });
  }
  const emailChanged = (input.email ?? null) !== (current.email ?? null);
  await User.updateOne(
    { _id: current._id },
    {
      $set: { firstName: input.firstName, lastName: input.lastName, ...(input.email ? { email: input.email } : {}), ...(emailChanged ? { isEmailVerified: false } : {}) },
      ...(input.email ? {} : { $unset: { email: 1 } }),
    },
  );
  await respondUser(req, res);
});

accountRouter.patch('/preferences', validate({ body: preferencesSchema }), async (req, res) => {
  const input = body<PreferencesInput>(req);
  const set: Record<string, unknown> = {};
  if (input.language) set['preferences.language'] = input.language;
  if (input.theme) set['preferences.theme'] = input.theme;
  for (const [k, v] of Object.entries(input.notifications ?? {})) if (typeof v === 'boolean') set[`preferences.notifications.${k}`] = v;
  if (Object.keys(set).length) await User.updateOne({ _id: req.auth!.id }, { $set: set });
  await respondUser(req, res);
});

accountRouter.post('/password', validate({ body: changePasswordSchema }), async (req, res) => {
  const input = body<{ currentPassword: string; newPassword: string }>(req);
  await changePassword(req.auth!.id, input.currentPassword, input.newPassword);
  noContent(res);
});

accountRouter.post('/avatar', uploadLimiter, avatarUpload.single('file'), async (req, res) => {
  if (!req.file) throw new HttpError(400, 'FILE_REQUIRED', 'File is required');
  const previous = req.auth!.user.avatar?.media;
  const media = await uploadFile(req.file, 'avatars', { id: req.auth!.id, name: req.auth!.user.firstName });
  await User.updateOne({ _id: req.auth!.id }, { $set: { avatar: toImageValue(media) } });
  if (previous) await deleteMedia(String(previous), true).catch(() => undefined);
  await respondUser(req, res);
});

accountRouter.delete('/avatar', async (req, res) => {
  const previous = req.auth!.user.avatar?.media;
  await User.updateOne({ _id: req.auth!.id }, { $unset: { avatar: 1 } });
  if (previous) await deleteMedia(String(previous), true).catch(() => undefined);
  await respondUser(req, res);
});

accountRouter.post('/push-tokens', validate({ body: pushTokenSchema }), async (req, res) => {
  const { token, platform } = body<{ token: string; platform: 'ios' | 'android' | 'web' }>(req);
  await User.updateMany({ 'pushTokens.token': token, _id: { $ne: req.auth!.id } }, { $pull: { pushTokens: { token } } });
  await User.updateOne({ _id: req.auth!.id }, { $pull: { pushTokens: { token } } });
  await User.updateOne({ _id: req.auth!.id }, { $push: { pushTokens: { $each: [{ token, platform, createdAt: new Date() }], $slice: -10 } } });
  noContent(res);
});

accountRouter.delete('/push-tokens', async (req, res) => {
  const token = String((req.body as { token?: string })?.token ?? '');
  if (token) await User.updateOne({ _id: req.auth!.id }, { $pull: { pushTokens: { token } } });
  noContent(res);
});

accountRouter.get('/reviews', async (req, res) => {
  const reviews = await Review.find({ user: req.auth!.id }).sort({ createdAt: -1 }).limit(100).populate('product', 'slug name images').lean();
  ok(
    res,
    reviews.map((r) => toReviewDTO(r, req.ctx.lang, { includeStatus: true, product: r.product as never })),
  );
});
