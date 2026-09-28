import { zodResolver } from '@hookform/resolvers/zod';
import { useAdminMutation, useSession } from '@vero/api-client';
import type { AdminInventoryItem, LocalizedText } from '@vero/types';
import {
  Button,
  cn,
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  RadioGroup,
  RadioGroupItem,
  toast,
} from '@vero/ui';
import { inventoryAdjustSchema } from '@vero/validation';
import { ArrowRightIcon } from 'lucide-react';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';
import { Thumb } from '../../components/common/Thumb';
import { FieldMessage, MoneyField, NumberField, TextareaField } from '../../components/form/fields';
import { handleFormError } from '../../lib/errors';
import { useFormat } from '../../lib/format';

export interface AdjustTarget {
  id: string;
  sku: string;
  name: LocalizedText;
  variantName?: LocalizedText;
  image?: { url: string; thumb?: string };
  stock: number;
  reserved: number;
  incoming: number;
  costPrice: number;
}

export function toAdjustTarget(item: AdminInventoryItem): AdjustTarget {
  return {
    id: item.id,
    sku: item.sku,
    name: item.product.name,
    variantName: item.variant?.name,
    image: item.product.image,
    stock: item.stock,
    reserved: item.reserved,
    incoming: item.incoming,
    costPrice: item.costPrice,
  };
}

type Values = z.input<typeof inventoryAdjustSchema>;
type Output = z.output<typeof inventoryAdjustSchema>;
const TYPES = ['IN', 'ADJUSTMENT', 'SET', 'INCOMING'] as const;

/** Result of an adjustment, mirroring the API rules (inventory.service adjust()). */
function preview(target: AdjustTarget, type: (typeof TYPES)[number], quantity: number) {
  const q = Number.isFinite(quantity) ? Math.trunc(quantity) : 0;
  let onHand = target.stock;
  let incoming = target.incoming;
  let error: string | null = null;
  switch (type) {
    case 'IN':
      if (q <= 0) error = 'inventory.adjust.errPositive';
      onHand += q;
      incoming = Math.max(0, incoming - Math.min(incoming, Math.max(0, q)));
      break;
    case 'ADJUSTMENT':
      if (q === 0) error = 'inventory.adjust.errZero';
      onHand += q;
      if (onHand < target.reserved) error = 'inventory.adjust.errBelowReserved';
      break;
    case 'SET':
      if (q < 0) error = 'inventory.adjust.errNegative';
      if (q < target.reserved) error = 'inventory.adjust.errBelowReserved';
      onHand = q;
      break;
    case 'INCOMING':
      if (q === 0) error = 'inventory.adjust.errZero';
      incoming += q;
      if (incoming < 0) error = 'inventory.adjust.errIncoming';
      break;
  }
  return { onHand, available: Math.max(0, onHand - target.reserved), incoming, error };
}

/** Receive / correct / set stock or record expected stock, with a required reason (inventory movement). */
export function AdjustStockDialog({ target, open, onOpenChange, onDone }: { target: AdjustTarget | null; open: boolean; onOpenChange: (open: boolean) => void; onDone?: (item: AdminInventoryItem) => void }) {
  const { t } = useTranslation();
  const f = useFormat();
  const { can } = useSession();
  // unit cost is finance data (same rule as the API's dashboard: analytics or expenses access)
  const finance = can(['analytics.read', 'expenses.read'], 'any');
  const form = useForm<Values, unknown, Output>({
    resolver: zodResolver(inventoryAdjustSchema),
    defaultValues: { type: 'IN', quantity: '' as unknown as number, reason: '', costPrice: '' as unknown as number },
  });
  useEffect(() => {
    if (open) form.reset({ type: 'IN', quantity: '' as unknown as number, reason: '', costPrice: '' as unknown as number });
  }, [open, target?.id, form]);

  const type = useWatch({ control: form.control, name: 'type' }) as (typeof TYPES)[number];
  const quantityRaw = useWatch({ control: form.control, name: 'quantity' });
  const quantity = Number(quantityRaw);
  const hasQuantity = quantityRaw !== '' && quantityRaw !== undefined && Number.isFinite(quantity);

  const adjust = useAdminMutation((api, v: Output) => api.admin.inventory.adjust(target!.id, v), {
    invalidate: ['inventory', 'movements', 'products'],
  });

  if (!target) return null;
  const result = hasQuantity ? preview(target, type, quantity) : null;

  const submit = form.handleSubmit(async (values) => {
    const check = preview(target, values.type as (typeof TYPES)[number], Number(values.quantity));
    if (check.error) {
      form.setError('quantity', { type: 'client', message: t(check.error) });
      return;
    }
    try {
      const item = await adjust.mutateAsync(values);
      toast.success(t('inventory.adjust.done', { sku: target.sku, count: item.stock }));
      onDone?.(item);
      onOpenChange(false);
    } catch (error) {
      handleFormError(t, form, error);
    }
  });

  const signed = type === 'ADJUSTMENT' || type === 'INCOMING';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="md" closeLabel={t('common.close')}>
        <DialogHeader>
          <DialogTitle>{t('inventory.adjust.title')}</DialogTitle>
          <DialogDescription className="flex items-center gap-3 pt-1">
            <Thumb src={target.image?.thumb ?? target.image?.url} size="md" />
            <span className="flex min-w-0 flex-col">
              <span className="line-clamp-2 font-semibold text-foreground">{f.loc(target.name)}</span>
              <span className="text-xs">
                {target.sku}
                {target.variantName ? ` · ${f.loc(target.variantName)}` : ''}
              </span>
            </span>
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => void submit(e)} noValidate className="flex min-h-0 flex-1 flex-col gap-5">
            <DialogBody className="flex flex-col gap-4">
              <dl className="grid grid-cols-4 gap-2 rounded-lg border border-border bg-surface p-3 text-center">
                {[
                  { label: t('inventory.onHand'), value: target.stock },
                  { label: t('inventory.reserved'), value: target.reserved },
                  { label: t('inventory.available'), value: Math.max(0, target.stock - target.reserved) },
                  { label: t('inventory.incoming'), value: target.incoming },
                ].map((s) => (
                  <div key={s.label} className="flex flex-col gap-0.5">
                    <dt className="text-[11px] font-medium text-muted-foreground">{s.label}</dt>
                    <dd className="text-base font-bold tabular">{f.number(s.value)}</dd>
                  </div>
                ))}
              </dl>

              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel required>{t('inventory.adjust.type')}</FormLabel>
                    <FormControl>
                      <RadioGroup value={field.value} onValueChange={field.onChange} className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {TYPES.map((ty) => (
                          <label
                            key={ty}
                            className={cn(
                              'flex cursor-pointer items-start gap-2.5 rounded-lg border px-3 py-2.5 transition-colors',
                              field.value === ty ? 'border-primary bg-brand-soft/50 dark:border-brand' : 'border-border hover:bg-accent/50',
                            )}
                          >
                            <RadioGroupItem value={ty} className="mt-0.5" />
                            <span className="flex flex-col gap-0.5">
                              <span className="text-[13px] font-semibold">{t(`enums.adjust.${ty}`)}</span>
                              <span className="text-xs leading-snug text-muted-foreground">{t(`inventory.adjust.hint.${ty}`)}</span>
                            </span>
                          </label>
                        ))}
                      </RadioGroup>
                    </FormControl>
                    <FieldMessage />
                  </FormItem>
                )}
              />

              <div className={cn('grid grid-cols-1 gap-4', finance && 'sm:grid-cols-2')}>
                <NumberField
                  name="quantity"
                  label={type === 'SET' ? t('inventory.adjust.newOnHand') : t('inventory.adjust.quantity')}
                  required
                  allowNegative={signed}
                  suffix={t('common.pcs')}
                  description={signed ? t('inventory.adjust.signedHint') : undefined}
                />
                {finance ? <MoneyField name="costPrice" label={t('inventory.adjust.costPrice')} optional description={t('inventory.adjust.costHint', { cost: f.money(target.costPrice) })} /> : null}
              </div>
              <TextareaField name="reason" label={t('inventory.adjust.reason')} required rows={2} maxLength={300} placeholder={t('inventory.adjust.reasonPlaceholder')} />

              <div className={cn('rounded-lg border px-3 py-2.5 text-[13px]', result?.error ? 'border-danger/30 bg-danger-soft/40 dark:bg-danger-soft' : 'border-border bg-surface')} aria-live="polite">
                <p className="mb-1.5 text-xs font-semibold text-muted-foreground">{t('inventory.adjust.result')}</p>
                {result ? (
                  <div className="flex flex-col gap-1">
                    {[
                      { label: t('inventory.onHand'), from: target.stock, to: result.onHand },
                      { label: t('inventory.available'), from: Math.max(0, target.stock - target.reserved), to: result.available },
                      { label: t('inventory.incoming'), from: target.incoming, to: result.incoming },
                    ].map((row) => (
                      <div key={row.label} className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">{row.label}</span>
                        <span className={cn('flex items-center gap-1.5 tabular', row.from !== row.to && 'font-semibold')}>
                          {f.number(row.from)}
                          <ArrowRightIcon className="size-3.5 text-muted-foreground" aria-hidden="true" />
                          <span className={cn(row.to > row.from ? 'text-success' : row.to < row.from ? 'text-danger' : undefined)}>{f.number(row.to)}</span>
                        </span>
                      </div>
                    ))}
                    {result.error ? <p className="mt-1 font-medium text-danger">{t(result.error)}</p> : null}
                  </div>
                ) : (
                  <p className="text-muted-foreground">{t('inventory.adjust.enterQuantity')}</p>
                )}
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" loading={adjust.isPending} disabled={!!result?.error}>
                {t('inventory.adjust.submit')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
