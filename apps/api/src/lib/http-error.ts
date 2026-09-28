import type { ErrorCode } from '@vero/types';

/** Operational error returned to clients as `{ error: { code, message, fields?, details? } }`. */
export class HttpError extends Error {
  readonly status: number;
  readonly code: ErrorCode;
  readonly fields?: Record<string, string>;
  readonly details?: unknown;

  constructor(status: number, code: ErrorCode, message?: string, opts: { fields?: Record<string, string>; details?: unknown } = {}) {
    super(message ?? code);
    this.status = status;
    this.code = code;
    this.fields = opts.fields;
    this.details = opts.details;
  }
}

export const badRequest = (code: ErrorCode = 'BAD_REQUEST', message?: string, details?: unknown) =>
  new HttpError(400, code, message ?? 'Bad request', { details });
export const unauthorized = (code: ErrorCode = 'UNAUTHORIZED', message = 'Authentication required') =>
  new HttpError(401, code, message);
export const forbidden = (message = 'You do not have permission to perform this action') =>
  new HttpError(403, 'FORBIDDEN', message);
export const notFound = (what = 'Resource') => new HttpError(404, 'NOT_FOUND', `${what} not found`);
export const conflict = (code: ErrorCode = 'CONFLICT', message = 'Conflict', details?: unknown) =>
  new HttpError(409, code, message, { details });
export const unprocessable = (code: ErrorCode, message: string, details?: unknown) =>
  new HttpError(422, code, message, { details });
