import type { NextFunction, Request, Response } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import { isProd } from '../config/env';
import { logger } from '../config/logger';
import { HttpError } from '../lib/http-error';

export function notFoundHandler(req: Request, res: Response) {
  res.status(404).json({ error: { code: 'NOT_FOUND', message: `Route ${req.method} ${req.path} not found` } });
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction) {
  if (res.headersSent) return;
  if (err instanceof HttpError) {
    if (err.status >= 500) logger.error({ err }, 'request failed');
    return res.status(err.status).json({ error: { code: err.code, message: err.message, fields: err.fields, details: err.details } });
  }
  if (err instanceof multer.MulterError) {
    const code = err.code === 'LIMIT_FILE_SIZE' ? 'FILE_TOO_LARGE' : 'BAD_REQUEST';
    return res.status(code === 'FILE_TOO_LARGE' ? 413 : 400).json({ error: { code, message: err.message } });
  }
  if (err instanceof mongoose.Error.ValidationError) {
    const fields = Object.fromEntries(Object.entries(err.errors).map(([k, v]) => [k, v.message]));
    return res.status(422).json({ error: { code: 'VALIDATION_ERROR', message: 'Validation failed', fields } });
  }
  if (err instanceof mongoose.Error.CastError) {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: `Invalid ${err.path}` } });
  }
  const mongoErr = err as { code?: number; keyValue?: Record<string, unknown>; keyPattern?: Record<string, unknown>; message?: string };
  if (mongoErr?.code === 11000) {
    const field = Object.keys(mongoErr.keyPattern ?? mongoErr.keyValue ?? {})[0] ?? /index:?\s*'?([\w.]+?)_\d/i.exec(mongoErr.message ?? '')?.[1];
    return res.status(409).json({ error: { code: 'CONFLICT', message: 'Duplicate value', fields: field ? { [field]: 'validation.duplicate' } : undefined } });
  }
  if ((err as { type?: string })?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Malformed JSON body' } });
  }
  if ((err as { type?: string })?.type === 'entity.too.large') {
    return res.status(413).json({ error: { code: 'FILE_TOO_LARGE', message: 'Request body too large' } });
  }
  logger.error({ err, path: req.path, method: req.method }, 'unhandled error');
  return res.status(500).json({
    error: { code: 'INTERNAL_ERROR', message: isProd ? 'Internal server error' : String((err as Error)?.message ?? err) },
  });
}
