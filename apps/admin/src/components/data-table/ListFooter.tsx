import { cn, NativeSelect, NativeSelectOption, PaginationBar } from '@vero/ui';
import { useTranslation } from 'react-i18next';
import { PAGE_SIZES } from '../../lib/url-state';

/** "1–20 of 125 · rows per page · pages" footer shared by tables and card lists. */
export function ListFooter({
  page,
  limit,
  total,
  pages,
  onPageChange,
  onLimitChange,
  className,
}: {
  page: number;
  limit: number;
  total: number;
  pages?: number;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  className?: string;
}) {
  const { t } = useTranslation();
  const from = total ? (page - 1) * limit + 1 : 0;
  const to = total ? Math.min(total, page * limit) : 0;
  return (
    <div className={cn('flex flex-col gap-3 border-t border-border px-3 py-2.5 sm:flex-row sm:items-center sm:justify-between sm:px-4', className)}>
      <div className="flex items-center gap-3 text-[13px] text-muted-foreground">
        <span className="tabular" aria-live="polite">
          {total > 0 ? t('table.showing', { from, to, total }) : t('table.total', { count: 0 })}
        </span>
        {onLimitChange ? (
          <label className="flex items-center gap-2">
            <span className="hidden sm:inline">{t('table.rowsPerPage')}</span>
            <NativeSelect selectSize="sm" containerClassName="w-[4.75rem]" value={String(limit)} onChange={(e) => onLimitChange(Number(e.target.value))} aria-label={t('table.rowsPerPage')}>
              {PAGE_SIZES.map((size) => (
                <NativeSelectOption key={size} value={size}>
                  {size}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </label>
        ) : null}
      </div>
      {onPageChange && (pages ?? 1) > 1 ? (
        <PaginationBar
          className="mx-0 w-auto justify-start sm:justify-end"
          page={page}
          pages={pages ?? 1}
          onPageChange={onPageChange}
          labels={{
            previous: t('common:a11y.previous'),
            next: t('common:a11y.next'),
            page: (n) => t('common:a11y.page', { page: n }),
            morePages: t('common:a11y.morePages'),
          }}
        />
      ) : null}
    </div>
  );
}
