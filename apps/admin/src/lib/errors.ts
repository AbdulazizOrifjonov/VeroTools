import { isApiError, type ApiError } from '@vero/api-client';
import { toast } from '@vero/ui';
import type { TFunction } from 'i18next';
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';
import { errorMessage } from './i18n';

/**
 * Copies server field errors (`ApiError.fields`, values are i18n keys like "validation.duplicate" or
 * "errors.PHONE_TAKEN") onto react-hook-form fields. Messages are translated at render time by the field
 * components. Returns true when at least one field error was applied.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the transformed (resolver output) type is irrelevant here
type AnyForm<T extends FieldValues> = UseFormReturn<T, any, any>;

export function applyServerErrors<T extends FieldValues>(
  form: AnyForm<T>,
  error: unknown,
  options: { map?: Record<string, Path<T> | null> } = {},
): boolean {
  if (!isApiError(error) || !error.fields) return false;
  const values = form.getValues() as Record<string, unknown>;
  let applied = false;
  let focused = false;
  for (const [field, message] of Object.entries(error.fields)) {
    const mapped = options.map && field in options.map ? options.map[field] : (field as Path<T>);
    if (!mapped) continue;
    const top = String(mapped).split('.')[0]!;
    if (!(top in values)) continue;
    form.setError(mapped, { type: 'server', message }, { shouldFocus: !focused });
    focused = true;
    applied = true;
  }
  return applied;
}

/** Standard mutation failure handling: field errors → form (plus a summary toast), everything else → toast. */
export function handleFormError<T extends FieldValues>(
  t: TFunction,
  form: AnyForm<T> | null,
  error: unknown,
  options?: { map?: Record<string, Path<T> | null>; params?: Record<string, unknown> },
): void {
  const applied = form ? applyServerErrors(form, error, options) : false;
  if (applied) toast.error(t('form.fixErrors'));
  else toast.error(errorMessage(t, error, options?.params));
}

/** Toast for a failed action that has no form. */
export function toastError(t: TFunction, error: unknown, params?: Record<string, unknown>): void {
  toast.error(errorMessage(t, error, params));
}

/**
 * Runs an action with a success toast, or an error toast and a re-throw (so confirmation dialogs stay open).
 */
export async function withToast<T>(t: TFunction, action: () => Promise<T>, success?: string | ((result: T) => string)): Promise<T> {
  try {
    const result = await action();
    if (success) toast.success(typeof success === 'function' ? success(result) : success);
    return result;
  } catch (error) {
    toastError(t, error);
    throw error;
  }
}

export function apiErrorCode(error: unknown): string | null {
  return isApiError(error) ? error.code : null;
}

export function isNotFound(error: unknown): boolean {
  return isApiError(error) && (error.status === 404 || error.code === 'NOT_FOUND');
}

export function isForbidden(error: unknown): boolean {
  return isApiError(error) && error.status === 403;
}

export type { ApiError };
