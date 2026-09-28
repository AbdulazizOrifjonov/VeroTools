import { Router } from 'express';
import { addToCartSchema, applyCouponSchema, mergeGuestSchema, objectId, productRefSchema, updateCartItemSchema, z } from '@vero/validation';
import { optionalAuth, requireAuth } from '../../middleware/auth';
import { validate, body, params } from '../../middleware/validate';
import { noStore, ok } from '../../lib/respond';
import { Notification } from '../../models/notification.model';
import * as cart from './cart.service';
import * as wc from './wishlist-compare.service';
import { ownerOf } from './owner';

export const cartRouter = Router();
export const wishlistRouter = Router();
export const compareRouter = Router();
export const engagementRouter = Router();

for (const r of [cartRouter, wishlistRouter, compareRouter, engagementRouter]) {
  r.use(optionalAuth, (_req, res, next) => {
    noStore(res);
    next();
  });
}

const lineParams = z.object({ lineId: z.string().regex(/^[a-f0-9]{24}(:[a-f0-9]{24})?$/i) });
const productParams = z.object({ productId: objectId });

/* ---------------------------------- cart --------------------------------- */

cartRouter.get('/', async (req, res) => {
  const owner = ownerOf(req, false);
  if (!owner.userId && !owner.guestId) return ok(res, await cart.cartView(null, req.ctx.lang));
  ok(res, await cart.getCart(owner, req.ctx.lang));
});

cartRouter.post('/items', validate({ body: addToCartSchema }), async (req, res) => {
  ok(res, await cart.addItem(ownerOf(req), body(req), req.ctx.lang, req.ctx.instanceId));
});

cartRouter.patch('/items/:lineId', validate({ params: lineParams, body: updateCartItemSchema }), async (req, res) => {
  const { lineId } = params<{ lineId: string }>(req);
  ok(res, await cart.updateItem(ownerOf(req), lineId, body<{ quantity: number }>(req).quantity, req.ctx.lang, req.ctx.instanceId));
});

cartRouter.delete('/items/:lineId', validate({ params: lineParams }), async (req, res) => {
  ok(res, await cart.removeItem(ownerOf(req), params<{ lineId: string }>(req).lineId, req.ctx.lang, req.ctx.instanceId));
});

cartRouter.delete('/', async (req, res) => {
  ok(res, await cart.clearCart(ownerOf(req), req.ctx.lang, req.ctx.instanceId));
});

cartRouter.post('/coupon', validate({ body: applyCouponSchema }), async (req, res) => {
  ok(res, await cart.applyCoupon(ownerOf(req), body<{ code: string }>(req).code, req.ctx.lang, req.ctx.instanceId));
});

cartRouter.delete('/coupon', async (req, res) => {
  ok(res, await cart.removeCoupon(ownerOf(req), req.ctx.lang, req.ctx.instanceId));
});

cartRouter.post('/merge', requireAuth, validate({ body: mergeGuestSchema }), async (req, res) => {
  const { guestId } = body<{ guestId: string }>(req);
  await cart.mergeGuestCart(guestId, req.auth!.id);
  await wc.mergeGuestWishlist(guestId, req.auth!.id);
  await wc.mergeGuestCompare(guestId, req.auth!.id);
  ok(res, await cart.getCart({ userId: req.auth!.id }, req.ctx.lang));
});

/* -------------------------------- wishlist ------------------------------- */

wishlistRouter.get('/', async (req, res) => {
  const owner = ownerOf(req, false);
  if (!owner.userId && !owner.guestId) return ok(res, { count: 0, items: [] });
  ok(res, await wc.getWishlist(owner, req.ctx.lang));
});
wishlistRouter.post('/', validate({ body: productRefSchema }), async (req, res) => {
  ok(res, await wc.addToWishlist(ownerOf(req), body<{ productId: string }>(req).productId, req.ctx.instanceId));
});
wishlistRouter.delete('/:productId', validate({ params: productParams }), async (req, res) => {
  ok(res, await wc.removeFromWishlist(ownerOf(req), params<{ productId: string }>(req).productId, req.ctx.instanceId));
});

/* --------------------------------- compare ------------------------------- */

compareRouter.get('/', async (req, res) => {
  const owner = ownerOf(req, false);
  if (!owner.userId && !owner.guestId) return ok(res, { count: 0, productIds: [], groups: [] });
  ok(res, await wc.getCompare(owner, req.ctx.lang));
});
compareRouter.post('/', validate({ body: productRefSchema }), async (req, res) => {
  ok(res, await wc.addToCompare(ownerOf(req), body<{ productId: string }>(req).productId, req.ctx.instanceId));
});
compareRouter.delete('/:productId', validate({ params: productParams }), async (req, res) => {
  ok(res, await wc.removeFromCompare(ownerOf(req), params<{ productId: string }>(req).productId, req.ctx.instanceId));
});
compareRouter.delete('/', async (req, res) => {
  ok(res, await wc.clearCompare(ownerOf(req), req.ctx.instanceId));
});

/* ------------------------------- engagement ------------------------------ */

engagementRouter.get('/', async (req, res) => {
  const owner = ownerOf(req, false);
  if (!owner.userId && !owner.guestId) return ok(res, { cartCount: 0, wishlistIds: [], compareIds: [], unreadNotifications: 0 });
  const [cartCount, wishlistIds, compareIds, unread] = await Promise.all([
    cart.cartCount(owner),
    wc.wishlistIds(owner),
    wc.compareIds(owner),
    owner.userId ? Notification.countDocuments({ user: owner.userId, readAt: null }) : Promise.resolve(0),
  ]);
  ok(res, { cartCount, wishlistIds, compareIds, unreadNotifications: unread });
});
