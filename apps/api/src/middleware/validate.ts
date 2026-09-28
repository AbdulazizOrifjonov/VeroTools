import type { NextFunction, Request, Response } from 'express';
import type { ZodType } from 'zod';
import { HttpError } from '../lib/http-error';

export interface Schemas {
  body?: ZodType;
  query?: ZodType;
  params?: ZodType;
}

function issuesToFields(issues: Array<{ path: PropertyKey[]; message: string }>): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of issues) {
    const key = issue.path.map(String).join('.') || '_';
    if (!fields[key]) fields[key] = issue.message;
  }
  return fields;
}

/** Validates body/query/params with zod; parsed values are available at req.valid.* */
export function validate(schemas: Schemas) {
  return (req: Request, _res: Response, next: NextFunction) => {
    for (const part of ['params', 'query', 'body'] as const) {
      const schema = schemas[part];
      if (!schema) continue;
      const source = part === 'query' ? Object.fromEntries(new URL(req.originalUrl, 'http://x').searchParams) : req[part];
      const result = schema.safeParse(source ?? {});
      if (!result.success) {
        return next(new HttpError(422, 'VALIDATION_ERROR', 'Validation failed', { fields: issuesToFields(result.error.issues) }));
      }
      req.valid[part] = result.data;
    }
    next();
  };
}

export const body = <T>(req: Request) => req.valid.body as T;
export const query = <T>(req: Request) => req.valid.query as T;
export const params = <T>(req: Request) => req.valid.params as T;
