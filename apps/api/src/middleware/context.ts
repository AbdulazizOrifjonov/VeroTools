import type { NextFunction, Request, Response } from 'express';
import { API_HEADERS, CLIENTS, type ClientApp } from '@vero/config';
import { resolveLanguage } from '@vero/i18n';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/** Resolves language, client app, guest id and client instance for every request. */
export function requestContext(req: Request, _res: Response, next: NextFunction) {
  const url = new URL(req.originalUrl, 'http://x');
  const langParam = url.searchParams.get('lang');
  const header = req.header(API_HEADERS.language);
  const client = (req.header(API_HEADERS.client) ?? 'web').toLowerCase();
  const guest = req.header(API_HEADERS.guestId);
  const instance = req.header('X-Client-Instance');
  req.ctx = {
    lang: resolveLanguage(langParam ?? header?.split(',')[0]),
    client: ((CLIENTS as readonly string[]).includes(client) ? client : 'web') as ClientApp,
    guestId: guest && UUID_RE.test(guest) ? guest.toLowerCase() : null,
    instanceId: instance && /^[\w-]{8,64}$/.test(instance) ? instance : null,
    ip: req.ip ?? req.socket.remoteAddress ?? '',
    userAgent: req.header('user-agent') ?? '',
  };
  req.valid = {};
  next();
}
