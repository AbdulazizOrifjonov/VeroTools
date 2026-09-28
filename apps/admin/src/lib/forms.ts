import { zodResolver } from '@hookform/resolvers/zod';
import { slugify } from '@vero/utils';
import type { FieldValues, Resolver } from 'react-hook-form';
import type { z } from 'zod';

/**
 * zodResolver for forms whose values are the schema input plus UI-only data the schema strips
 * (e.g. image preview urls next to the media id). The single place where that widening is typed.
 * `prepare` reshapes the values right before validation (empty optional numbers → undefined, fields that
 * do not apply to the chosen option cleared…) without touching what the form displays.
 */
export function formResolver<TValues extends FieldValues, TSchema extends z.ZodType>(schema: TSchema, prepare?: (values: TValues) => unknown): Resolver<TValues, unknown, z.output<TSchema>> {
  const base = zodResolver(schema as never) as unknown as Resolver<TValues, unknown, z.output<TSchema>>;
  if (!prepare) return base;
  return (values, context, options) => base(prepare(values) as TValues, context, options);
}

/** '' / null → undefined (optional numeric inputs that z.coerce would otherwise turn into 0). */
export function emptyToUndefined<T>(value: T | '' | null | undefined): T | undefined {
  return value === '' || value === null || value === undefined ? undefined : value;
}

/** URL slug from a name; empty when there is no name yet (slugify('') would return a placeholder). */
export function slugFrom(name: string | undefined | null): string {
  const base = name?.trim();
  return base ? slugify(base) : '';
}
