import { isApiError } from '@vero/api-client';
import type { TFunction } from 'i18next';
import type { FieldValues, Path, UseFormReturn } from 'react-hook-form';
import { errorMessage } from './i18n';
import { toast } from './toast';

/**
 * Copies server field errors (`ApiError.fields`, values are i18n keys like "validation.phone" or
 * "errors.PHONE_TAKEN") onto react-hook-form fields. Returns true when at least one was applied.
 */
export function applyServerErrors<T extends FieldValues>(
  form: UseFormReturn<T>,
  error: unknown,
  options: { map?: Record<string, Path<T> | null> } = {},
): boolean {
  if (!isApiError(error) || !error.fields) return false;
  const values = form.getValues() as Record<string, unknown>;
  let applied = false;
  for (const [field, message] of Object.entries(error.fields)) {
    const mapped = options.map && field in options.map ? options.map[field] : (field as Path<T>);
    if (!mapped) continue;
    const top = String(mapped).split('.')[0]!;
    if (!(top in values)) continue;
    form.setError(mapped, { type: 'server', message }, { shouldFocus: !applied });
    applied = true;
  }
  return applied;
}

/** Standard mutation failure handling: field errors → form, everything else → toast. */
export function handleFormError<T extends FieldValues>(
  t: TFunction,
  form: UseFormReturn<T> | null,
  error: unknown,
  options?: { map?: Record<string, Path<T> | null>; params?: Record<string, unknown> },
): void {
  const applied = form ? applyServerErrors(form, error, options) : false;
  if (!applied) toast.error(errorMessage(t, error, options?.params));
}

export function apiErrorCode(error: unknown): string | null {
  return isApiError(error) ? error.code : null;
}

export function isNotFound(error: unknown): boolean {
  return isApiError(error) && (error.status === 404 || error.code === 'NOT_FOUND');
}

export function isNetworkError(error: unknown): boolean {
  return isApiError(error) && error.code === 'NETWORK';
}
