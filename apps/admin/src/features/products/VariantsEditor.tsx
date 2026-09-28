import { useSession } from '@vero/api-client';
import { Badge, Button, cn, FormControl, FormField, FormItem, Input, Switch } from '@vero/ui';
import { PlusIcon, Trash2Icon, XIcon } from 'lucide-react';
import { useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { MoneyField, NumberField, TextField } from '../../components/form/fields';
import { LocalizedField } from '../../components/form/LocalizedField';
import { ImageField } from '../../components/media/ImageFields';
import { emptyVariant, type ProductFormValues } from './product-form-model';

function AttributesEditor({ index }: { index: number }) {
  const { t } = useTranslation();
  const { control } = useFormContext<ProductFormValues>();
  const attrs = useFieldArray({ control, name: `variants.${index}.attributes` });
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-semibold">{t('products.form.variants.attributes')}</span>
      {attrs.fields.map((field, ai) => (
        <div key={field.id} className="flex items-center gap-2">
          <FormField
            control={control}
            name={`variants.${index}.attributes.${ai}.key`}
            render={({ field: f }) => (
              <FormItem className="flex-1 gap-1">
                <FormControl>
                  <Input {...f} value={f.value ?? ''} maxLength={40} placeholder={t('products.form.variants.attributeKeyPlaceholder')} aria-label={t('products.form.variants.attributeKey')} className="font-mono text-[13px]" />
                </FormControl>
              </FormItem>
            )}
          />
          <FormField
            control={control}
            name={`variants.${index}.attributes.${ai}.value`}
            render={({ field: f }) => (
              <FormItem className="flex-1 gap-1">
                <FormControl>
                  <Input {...f} value={f.value ?? ''} maxLength={80} placeholder={t('products.form.variants.attributeValuePlaceholder')} aria-label={t('products.form.variants.attributeValue')} />
                </FormControl>
              </FormItem>
            )}
          />
          <Button type="button" variant="ghost" size="icon-sm" onClick={() => attrs.remove(ai)} aria-label={t('common.remove')}>
            <XIcon />
          </Button>
        </div>
      ))}
      <Button type="button" variant="ghost" size="sm" className="w-fit" onClick={() => attrs.append({ key: '', value: '' })} leftIcon={<PlusIcon />}>
        {t('products.form.variants.addAttribute')}
      </Button>
    </div>
  );
}

/** Product variants: SKU, name (uz required), attributes, prices, cost, image, active flag, initial stock for new ones. */
export function VariantsEditor() {
  const { t } = useTranslation();
  const { can } = useSession();
  // the cost of an existing variant is finance data (kept unchanged on save); a new variant needs one
  const finance = can(['analytics.read', 'expenses.read'], 'any');
  const { control } = useFormContext<ProductFormValues>();
  const variants = useFieldArray({ control, name: 'variants', keyName: 'fieldKey' });
  const values = useWatch({ control, name: 'variants' }) ?? [];

  return (
    <div className="flex flex-col gap-4">
      {variants.fields.length === 0 ? <p className="rounded-lg border border-dashed border-input px-4 py-6 text-center text-sm text-muted-foreground">{t('products.form.variants.empty')}</p> : null}
      {variants.fields.map((field, index) => {
        const v = values[index];
        const existing = !!v?.id;
        return (
          <article key={field.fieldKey} className={cn('flex flex-col gap-4 rounded-xl border border-border p-4', v && !v.isActive && 'bg-surface')}>
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-semibold">{t('products.form.variants.title', { n: index + 1 })}</h3>
                {v?.stock ? (
                  <Badge variant="secondary" size="sm" className="tabular">
                    {t('products.form.variants.stock', { onHand: v.stock.onHand, available: v.stock.available })}
                  </Badge>
                ) : null}
              </div>
              <div className="flex items-center gap-3">
                <FormField
                  control={control}
                  name={`variants.${index}.isActive`}
                  render={({ field: fa }) => (
                    <FormItem className="flex flex-row items-center gap-2">
                      <FormControl>
                        <Switch checked={!!fa.value} onCheckedChange={fa.onChange} size="sm" aria-label={t('products.form.variants.active')} />
                      </FormControl>
                      <span className="text-[13px]">{t('products.form.variants.active')}</span>
                    </FormItem>
                  )}
                />
                <Button type="button" variant="ghost" size="icon-sm" className="text-danger hover:text-danger" onClick={() => variants.remove(index)} aria-label={t('products.form.variants.remove')} title={existing ? t('products.form.variants.removeConfirm') : undefined}>
                  <Trash2Icon />
                </Button>
              </div>
            </header>
            <div className="grid gap-4 lg:grid-cols-[1fr_auto]">
              <div className="flex min-w-0 flex-col gap-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField name={`variants.${index}.sku`} label={t('products.form.fields.sku')} required maxLength={60} className="[&_input]:font-mono [&_input]:uppercase" />
                  {!existing ? <NumberField name={`variants.${index}.initialStock`} label={t('products.form.fields.initialStock')} suffix={t('common.pcs')} optional /> : null}
                </div>
                <LocalizedField name={`variants.${index}.name`} label={t('products.form.variants.name')} required="default" maxLength={120} />
                <div className={existing && !finance ? 'grid gap-4 sm:grid-cols-2' : 'grid gap-4 sm:grid-cols-3'}>
                  <MoneyField name={`variants.${index}.price`} label={t('products.form.fields.price')} required />
                  <MoneyField name={`variants.${index}.oldPrice`} label={t('products.form.fields.oldPrice')} optional />
                  {existing && !finance ? null : <MoneyField name={`variants.${index}.costPrice`} label={t('products.form.fields.costPrice')} required />}
                </div>
                <AttributesEditor index={index} />
              </div>
              <ImageField name={`variants.${index}.image`} label={t('common.image')} folder="products" />
            </div>
          </article>
        );
      })}
      <Button type="button" variant="outline" className="w-fit" onClick={() => variants.append(emptyVariant())} leftIcon={<PlusIcon />}>
        {t('products.form.variants.add')}
      </Button>
    </div>
  );
}
