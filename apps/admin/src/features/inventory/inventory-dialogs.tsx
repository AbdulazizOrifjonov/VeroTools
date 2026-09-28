import { zodResolver } from '@hookform/resolvers/zod';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useAdminMutation, useAdminQuery, useApi, useSession } from '@vero/api-client';
import type { AdminInventoryItem } from '@vero/types';
import {
  Button,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  Skeleton,
  toast,
} from '@vero/ui';
import { inventorySettingsSchema } from '@vero/validation';
import { HistoryIcon } from 'lucide-react';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import type { z } from 'zod';
import { ErrorState } from '../../components/common/states';
import { Thumb } from '../../components/common/Thumb';
import { NumberField } from '../../components/form/fields';
import { handleFormError } from '../../lib/errors';
import { useFormat } from '../../lib/format';
import { BeforeAfter, MovementReference, MovementTypeBadge, SignedQuantity, movementAffects } from './movement-ui';

type MinValues = z.input<typeof inventorySettingsSchema>;
type MinOutput = z.output<typeof inventorySettingsSchema>;

/** Low-stock threshold of one stock record. */
export function MinStockDialog({ item, open, onOpenChange }: { item: AdminInventoryItem | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();
  const f = useFormat();
  const { can } = useSession();
  const settings = useAdminQuery(['settings'], (api) => api.admin.settings.get(), { enabled: open && can('settings.read'), staleTime: 60_000 });
  const globalThreshold = settings.data?.find((s) => s.key === 'inventory.lowStockThreshold')?.value;
  const form = useForm<MinValues, unknown, MinOutput>({ resolver: zodResolver(inventorySettingsSchema), defaultValues: { minStock: item?.minStock ?? 0 } });
  useEffect(() => {
    if (open && item) form.reset({ minStock: item.minStock });
  }, [open, item, form]);
  const save = useAdminMutation((api, v: MinOutput) => api.admin.inventory.update(item!.id, v), { invalidate: ['inventory', 'products'] });
  if (!item) return null;
  const submit = form.handleSubmit(async (values) => {
    try {
      await save.mutateAsync(values);
      toast.success(t('inventory.minStockDialog.saved'));
      onOpenChange(false);
    } catch (error) {
      handleFormError(t, form, error);
    }
  });
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="sm" closeLabel={t('common.close')}>
        <DialogHeader>
          <DialogTitle>{t('inventory.minStockDialog.title')}</DialogTitle>
          <DialogDescription>
            <span className="font-medium text-foreground">{f.loc(item.product.name)}</span>
            {item.variant ? ` · ${f.loc(item.variant.name)}` : ''} · <span className="font-mono">{item.sku}</span>
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => void submit(e)} noValidate className="flex min-h-0 flex-1 flex-col gap-5">
            <DialogBody className="flex flex-col gap-3">
              <p className="text-[13px] leading-relaxed text-muted-foreground">{t('inventory.minStockDialog.description')}</p>
              <NumberField
                name="minStock"
                label={t('inventory.minStockDialog.label')}
                required
                suffix={t('common.pcs')}
                description={typeof globalThreshold === 'number' ? t('inventory.minStockDialog.globalHint', { count: globalThreshold }) : undefined}
              />
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" loading={save.isPending}>
                {t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}

const PAGE = 20;

/** Movement history of one stock record (drawer). */
export function MovementsSheet({ item, open, onOpenChange }: { item: AdminInventoryItem | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t } = useTranslation();
  const f = useFormat();
  const api = useApi();
  const query = useInfiniteQuery({
    queryKey: ['admin', 'movements', 'item', item?.id],
    queryFn: ({ pageParam }) => api.admin.inventory.itemMovements(item!.id, { page: pageParam, limit: PAGE }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.pages ? last.meta.page + 1 : undefined),
    enabled: open && !!item,
  });
  const rows = query.data?.pages.flatMap((p) => p.items) ?? [];
  const total = query.data?.pages[0]?.meta.total;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="sm:max-w-xl" closeLabel={t('common.close')}>
        {item ? (
          <>
            <SheetHeader>
              <SheetTitle>{t('inventory.movements.itemTitle', { sku: item.sku })}</SheetTitle>
              <SheetDescription asChild>
                <div className="flex items-center gap-3 pt-1">
                  <Thumb src={item.product.image?.thumb ?? item.product.image?.url} size="md" />
                  <div className="flex min-w-0 flex-col">
                    <span className="line-clamp-2 font-medium text-foreground">{f.loc(item.product.name)}</span>
                    <span className="text-xs">
                      {item.variant ? `${f.loc(item.variant.name)} · ` : ''}
                      {t('inventory.onHand')}: <b className="text-foreground tabular">{f.number(item.stock)}</b> · {t('inventory.reserved')}: <b className="text-foreground tabular">{f.number(item.reserved)}</b>
                    </span>
                  </div>
                </div>
              </SheetDescription>
            </SheetHeader>
            <SheetBody className="pb-6">
              {query.isError ? (
                <ErrorState error={query.error} onRetry={() => void query.refetch()} compact />
              ) : query.isLoading ? (
                <div className="flex flex-col gap-2">
                  {Array.from({ length: 6 }, (_, i) => (
                    <Skeleton key={i} className="h-16 rounded-lg" />
                  ))}
                </div>
              ) : rows.length === 0 ? (
                <p className="py-10 text-center text-sm text-muted-foreground">{t('inventory.movements.empty')}</p>
              ) : (
                <>
                  <p className="mb-2 text-xs text-muted-foreground tabular">{t('table.total', { count: total ?? rows.length })}</p>
                  <ol className="flex flex-col divide-y divide-border rounded-lg border border-border">
                    {rows.map((m) => {
                      const affects = movementAffects(m.type);
                      return (
                        <li key={m.id} className="flex flex-col gap-1.5 px-3 py-2.5 text-[13px]">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="flex items-center gap-2">
                              <MovementTypeBadge type={m.type} />
                              <SignedQuantity value={m.quantity} />
                            </span>
                            <time dateTime={m.createdAt} className="text-xs text-muted-foreground tabular">
                              {f.datetime(m.createdAt)}
                            </time>
                          </div>
                          <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            {affects === 'reserved' ? (
                              <span className="flex items-center gap-1.5">
                                {t('inventory.reserved')}: <BeforeAfter before={m.reservedBefore} after={m.reservedAfter} />
                              </span>
                            ) : affects === 'onHand' ? (
                              <span className="flex items-center gap-1.5">
                                {t('inventory.onHand')}: <BeforeAfter before={m.stockBefore} after={m.stockAfter} />
                              </span>
                            ) : null}
                            <span>
                              <MovementReference movement={m} />
                            </span>
                            <span>{m.user?.name || t('inventory.movements.system')}</span>
                          </div>
                          {m.reason ? <p className="text-[13px] text-foreground">{m.reason}</p> : null}
                        </li>
                      );
                    })}
                  </ol>
                  <div className="mt-3 flex items-center justify-between gap-2">
                    <Button variant="ghost" size="sm" asChild leftIcon={<HistoryIcon />}>
                      <Link to={`/inventory/movements?product=${item.product.id}`}>{t('inventory.movements.all')}</Link>
                    </Button>
                    {query.hasNextPage ? (
                      <Button variant="outline" size="sm" loading={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
                        {t('common.loadMore')}
                      </Button>
                    ) : null}
                  </div>
                </>
              )}
            </SheetBody>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
