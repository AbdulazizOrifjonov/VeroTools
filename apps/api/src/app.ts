import express, { json, Router, urlencoded, type Express } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import mongoose from 'mongoose';
import { pinoHttp } from 'pino-http';
import { API_HEADERS } from '@vero/config';
import { corsOrigins, env } from './config/env';
import { logger } from './config/logger';
import { getRedis } from './lib/redis';
import { requestContext } from './middleware/context';
import { sanitizeInput } from './middleware/sanitize';
import { apiLimiter } from './middleware/rate-limit';
import { optionalAuth } from './middleware/auth';
import { errorHandler, notFoundHandler } from './middleware/error';

// Domain event handlers register on import — keep these explicit so bundling never drops them.
import './modules/orders/orders.service';
import './modules/notifications/notifications.service';

import { authRouter } from './modules/auth/auth.routes';
import { accountRouter } from './modules/users/account.routes';
import { addressRouter } from './modules/addresses/address.routes';
import { homeRouter } from './modules/home/home.routes';
import { brandsRouter, categoriesRouter, productsRouter, searchRouter } from './modules/catalog/catalog.routes';
import { cartRouter, compareRouter, engagementRouter, wishlistRouter } from './modules/cart/cart.routes';
import { checkoutRouter, ordersRouter } from './modules/orders/orders.routes';
import { notificationsRouter } from './modules/notifications/notifications.routes';
import { questionsRouter, reviewsRouter } from './modules/reviews/reviews.routes';
import { contentRouter } from './modules/content/content.routes';
import { paymeRouter } from './modules/payments/payme.routes';
import { clickRouter } from './modules/payments/click.routes';
import { seoApiRouter, seoRootRouter } from './modules/seo/seo.routes';
import { adminRouter } from './modules/admin/admin.router';

export function createApp(): Express {
  const app = express();
  app.disable('x-powered-by');
  app.set('trust proxy', env.TRUST_PROXY);

  app.use(
    helmet({
      // images in /uploads are embedded by the storefront, the admin panel and the mobile app
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: { useDefaults: false, directives: { defaultSrc: ["'none'"], frameAncestors: ["'none'"], imgSrc: ["'self'", 'data:'] } },
    }),
  );
  app.use(
    cors({
      // requests without Origin (mobile app, server-to-server, payment providers) are not subject to CORS
      origin: (origin, cb) => cb(null, !origin || corsOrigins.includes(origin)),
      credentials: true,
      allowedHeaders: ['Authorization', 'Content-Type', 'Accept', API_HEADERS.language, API_HEADERS.guestId, API_HEADERS.client, 'X-Client-Instance'],
      exposedHeaders: ['Content-Disposition', 'RateLimit', 'RateLimit-Policy', 'Retry-After'],
      maxAge: 600,
    }),
  );
  app.use(compression());

  /* ------------------------------------------------------------- health */
  app.get(['/health', '/api/health'], (_req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.json({ status: 'ok', uptime: Math.round(process.uptime()) });
  });
  app.get(['/ready', '/api/ready'], (_req, res) => {
    const db = mongoose.connection.readyState === 1;
    const redis = getRedis();
    const redisOk = !redis || redis.status === 'ready';
    res.setHeader('Cache-Control', 'no-store');
    res.status(db && redisOk ? 200 : 503).json({ status: db && redisOk ? 'ready' : 'degraded', database: db, redis: redis ? redis.status : 'disabled' });
  });

  /* ------------------------------------------------------ uploaded media */
  if (env.STORAGE_DRIVER === 'local') {
    // file names are content-addressed / unique per upload, so they can be cached forever
    app.use('/uploads', express.static(env.UPLOAD_DIR, { index: false, maxAge: '365d', immutable: true, dotfiles: 'deny', fallthrough: true }));
  }

  /* ---------------------------------- request logging, context, parsing */
  app.use(
    pinoHttp({
      logger,
      autoLogging: { ignore: (req) => req.url === '/health' || req.url === '/api/health' || (req.url ?? '').startsWith('/uploads/') },
      customLogLevel: (_req, res, err) => (err || res.statusCode >= 500 ? 'error' : res.statusCode >= 400 ? 'warn' : 'info'),
      serializers: {
        req: (req: { id: unknown; method: string; url: string }) => ({ id: req.id, method: req.method, url: req.url }),
        res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
      },
    }),
  );
  app.use(requestContext);

  // Payment provider callbacks parse their own bodies (JSON-RPC / form) and answer in the provider's format.
  app.use('/api/payments/payme', paymeRouter);
  app.use('/api/payments/click', clickRouter);

  app.use(json({ limit: '2mb' }));
  app.use(urlencoded({ extended: false, limit: '200kb' }));
  app.use(cookieParser());
  app.use(sanitizeInput);

  /* ----------------------------------------------------------------- API */
  const api = Router();
  api.use(apiLimiter);
  // attach the session when a bearer token is sent — except on /auth/*, where a stale token must never block
  // signing in again (routes there that need a user call requireAuth themselves)
  api.use((req, res, next) => (req.path.startsWith('/auth/') ? next() : optionalAuth(req, res, next)));

  api.use('/auth', authRouter);
  api.use('/users/me', accountRouter);
  api.use('/addresses', addressRouter);
  api.use('/home', homeRouter);
  api.use('/categories', categoriesRouter);
  api.use('/brands', brandsRouter);
  api.use('/products', productsRouter);
  api.use('/search', searchRouter);
  api.use('/cart', cartRouter);
  api.use('/wishlist', wishlistRouter);
  api.use('/compare', compareRouter);
  api.use('/engagement', engagementRouter);
  api.use('/checkout', checkoutRouter);
  api.use('/orders', ordersRouter);
  api.use('/notifications', notificationsRouter);
  api.use('/reviews', reviewsRouter);
  api.use('/questions', questionsRouter);
  api.use('/seo', seoApiRouter);
  api.use('/admin', adminRouter);
  api.use('/', contentRouter);
  api.use(notFoundHandler);
  app.use('/api', api);

  /* ------------------------------------------------ crawlers (proxied by web) */
  app.use(seoRootRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
