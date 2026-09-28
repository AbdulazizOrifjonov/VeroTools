import { Router } from 'express';
import { type Types } from 'mongoose';
import { findRegion, LIMITS, type Language } from '@vero/config';
import type { AddressDTO } from '@vero/types';
import { addressSchema, objectId, z, type AddressData } from '@vero/validation';
import { requireAuth } from '../../middleware/auth';
import { validate, body, params } from '../../middleware/validate';
import { HttpError, notFound } from '../../lib/http-error';
import { noContent, noStore, ok, created } from '../../lib/respond';
import { emitSync } from '../../lib/socket';
import { Address, type IAddress } from '../../models/address.model';

export const addressRouter = Router();
addressRouter.use(requireAuth, (_req, res, next) => {
  noStore(res);
  next();
});

export function toAddressDTO(a: IAddress, lang: Language): AddressDTO {
  return {
    id: String(a._id),
    label: a.label || undefined,
    firstName: a.firstName,
    lastName: a.lastName,
    phone: a.phone,
    region: a.region,
    regionName: findRegion(a.region)?.name[lang] ?? a.region,
    city: a.city,
    district: a.district || undefined,
    street: a.street,
    house: a.house,
    apartment: a.apartment || undefined,
    comment: a.comment || undefined,
    location: a.location?.lat !== undefined && a.location?.lng !== undefined ? { lat: a.location.lat, lng: a.location.lng } : undefined,
    isDefault: a.isDefault,
  };
}

const idParams = z.object({ id: objectId });

async function list(userId: Types.ObjectId) {
  return Address.find({ user: userId }).sort({ isDefault: -1, updatedAt: -1 }).lean();
}

async function makeDefault(userId: Types.ObjectId, id: Types.ObjectId) {
  await Address.updateMany({ user: userId, _id: { $ne: id } }, { $set: { isDefault: false } });
  await Address.updateOne({ _id: id, user: userId }, { $set: { isDefault: true } });
}

addressRouter.get('/', async (req, res) => {
  ok(res, (await list(req.auth!.id)).map((a) => toAddressDTO(a, req.ctx.lang)));
});

addressRouter.post('/', validate({ body: addressSchema }), async (req, res) => {
  const input = body<AddressData>(req);
  const count = await Address.countDocuments({ user: req.auth!.id });
  if (count >= LIMITS.addressesMax) throw new HttpError(422, 'LIMIT_REACHED', 'Too many addresses');
  const doc = await Address.create({ ...input, user: req.auth!.id, isDefault: count === 0 || !!input.isDefault });
  if (doc.isDefault) await makeDefault(req.auth!.id, doc._id);
  emitSync({ userId: String(req.auth!.id) }, 'addresses', req.ctx.instanceId);
  created(res, toAddressDTO(doc.toObject() as IAddress, req.ctx.lang));
});

const OPTIONAL_FIELDS = ['label', 'district', 'apartment', 'comment', 'location'] as const;

addressRouter.patch('/:id', validate({ params: idParams, body: addressSchema.partial() }), async (req, res) => {
  const { id } = params<{ id: string }>(req);
  const input = body<Partial<AddressData>>(req);
  const raw = (req.body ?? {}) as Record<string, unknown>;
  const { isDefault, ...fields } = input;
  const set: Record<string, unknown> = {};
  const unset: Record<string, 1> = {};
  for (const [k, v] of Object.entries(fields)) if (v !== undefined) set[k] = v;
  // optional fields sent as "" / null are cleared (zod turns empty strings into undefined)
  for (const k of OPTIONAL_FIELDS) if (k in raw && (raw[k] === '' || raw[k] === null) && set[k] === undefined) unset[k] = 1;
  const update: Record<string, unknown> = {};
  if (Object.keys(set).length) update.$set = set;
  if (Object.keys(unset).length) update.$unset = unset;
  const doc = Object.keys(update).length
    ? await Address.findOneAndUpdate({ _id: id, user: req.auth!.id }, update, { new: true }).lean()
    : await Address.findOne({ _id: id, user: req.auth!.id }).lean();
  if (!doc) throw notFound('Address');
  // a customer always keeps one default address: it moves only when another one becomes the default
  if (isDefault) await makeDefault(req.auth!.id, doc._id);
  emitSync({ userId: String(req.auth!.id) }, 'addresses', req.ctx.instanceId);
  ok(res, toAddressDTO({ ...doc, isDefault: isDefault ? true : doc.isDefault }, req.ctx.lang));
});

addressRouter.post('/:id/default', validate({ params: idParams }), async (req, res) => {
  const { id } = params<{ id: string }>(req);
  const doc = await Address.findOne({ _id: id, user: req.auth!.id }).lean();
  if (!doc) throw notFound('Address');
  await makeDefault(req.auth!.id, doc._id);
  emitSync({ userId: String(req.auth!.id) }, 'addresses', req.ctx.instanceId);
  ok(res, toAddressDTO({ ...doc, isDefault: true }, req.ctx.lang));
});

addressRouter.delete('/:id', validate({ params: idParams }), async (req, res) => {
  const { id } = params<{ id: string }>(req);
  const doc = await Address.findOneAndDelete({ _id: id, user: req.auth!.id }).lean();
  if (!doc) throw notFound('Address');
  if (doc.isDefault) {
    const next = await Address.findOne({ user: req.auth!.id }).sort({ updatedAt: -1 }).lean();
    if (next) await makeDefault(req.auth!.id, next._id);
  }
  emitSync({ userId: String(req.auth!.id) }, 'addresses', req.ctx.instanceId);
  noContent(res);
});
