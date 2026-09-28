import { useAdminItem, useAdminMutation, useSession } from '@vero/api-client';
import { PRODUCT_STATUSES, type AdminProduct } from '@vero/types';
import { Alert, AlertDescription, AlertTitle, Button, cn, Form, FormControl, FormDescription, FormField, FormItem, FormLabel, Input, Skeleton, toast } from '@vero/ui';
import { BadgePercentIcon, BoxesIcon, CopyIcon, PlusIcon, Trash2Icon, XIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useParams } from 'react-router';
import { StatusBadge } from '../../components/common/badges';
import { ConfirmDialog } from '../../components/common/ConfirmDialog';
import { Page, PageHeader, usePageMeta } from '../../components/common/page';
import { ErrorState } from '../../components/common/states';
import { MoneyField, NumberField, SelectField, SlugField, SwitchField, TextField } from '../../components/form/fields';
import { bypassUnsavedGuard, FieldGrid, FormActionBar, FormSection, UnsavedChangesGuard, useSaveShortcut } from '../../components/form/form-kit';
import { LocalizedField } from '../../components/form/LocalizedField';
import { ComboboxField, TagsField } from '../../components/form/pickers';
import { ImageListField } from '../../components/media/ImageFields';
import { apiErrorCode, handleFormError, isNotFound, toastError } from '../../lib/errors';
import { useFormat } from '../../lib/format';
import { slugFrom } from '../../lib/forms';
import { ItemNotFound } from '../errors/NotFoundPage';
import { useBrandOptions, useCategoryOptions, useSpecDefinitions } from '../catalog/catalog-data';
import { emptyProduct, normalizeVideo, productResolver, productToForm, withCategorySpecs, type ProductFormValues, type ProductOutput } from './product-form-model';
import { SpecsEditor } from './SpecsEditor';
import { VariantsEditor } from './VariantsEditor';

export default function ProductFormPage() {
  const { id } = useParams<{ id: string }>();
  const isNew = !id;
  const query = useAdminItem('products', id, (api, pid) => api.admin.products.get(pid));
  const specs = useSpecDefinitions();
  const categories = useCategoryOptions();

  if (!isNew && query.isError && !query.data) {
    return isNotFound(query.error) ? <ItemNotFound backTo="/products" /> : <ErrorState error={query.error} onRetry={() => void query.refetch()} />;
  }
  if ((!isNew && !query.data) || specs.isLoading || categories.isLoading) {
    return (
      <Page>
        <Skeleton className="h-10 w-80" />
        <div className="grid gap-4 xl:grid-cols-3">
          <div className="flex flex-col gap-4 xl:col-span-2">
            <Skeleton className="h-72 rounded-xl" />
            <Skeleton className="h-96 rounded-xl" />
          </div>
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </Page>
    );
  }
  return <ProductForm key={query.data?.id ?? 'new'} product={query.data} />;
}

function VideosField() {
  const { t } = useTranslation();
  return (
    <FormField
      name="videos"
      render={({ field }) => {
        const list = (field.value as string[] | undefined) ?? [];
        return (
          <VideoListEditor
            value={list}
            onChange={field.onChange}
            label={t('products.form.fields.videos')}
            hint={t('products.form.fields.videosHint')}
          />
        );
      }}
    />
  );
}

function VideoListEditor({ value, onChange, label, hint }: { value: string[]; onChange: (v: string[]) => void; label: string; hint: string }) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState('');
  const [error, setError] = useState<string | null>(null);
  const add = () => {
    const url = normalizeVideo(draft);
    if (!url) {
      setError(t('products.form.fields.invalidVideo'));
      return;
    }
    if (!value.includes(url)) onChange([...value, url].slice(0, 10));
    setDraft('');
    setError(null);
  };
  return (
    <FormItem>
      <FormLabel>{label}</FormLabel>
      {value.length ? (
        <ul className="flex flex-col gap-1.5">
          {value.map((v) => (
            <li key={v} className="flex items-center gap-2 rounded-md border border-border px-3 py-1.5 text-[13px]">
              <a href={v} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1 truncate text-foreground hover:underline">
                {v}
              </a>
              <Button type="button" variant="ghost" size="icon-sm" className="size-7" onClick={() => onChange(value.filter((x) => x !== v))} aria-label={t('products.form.fields.removeVideo')}>
                <XIcon />
              </Button>
            </li>
          ))}
        </ul>
      ) : null}
      {value.length < 10 ? (
        <div className="flex gap-2">
          <FormControl>
            <Input
              value={draft}
              onChange={(e) => {
                setDraft(e.target.value);
                setError(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  add();
                }
              }}
              placeholder={t('products.form.fields.videoPlaceholder')}
              aria-invalid={!!error || undefined}
            />
          </FormControl>
          <Button type="button" variant="outline" onClick={add} disabled={!draft.trim()} leftIcon={<PlusIcon />}>
            {t('products.form.fields.addVideo')}
          </Button>
        </div>
      ) : null}
      {error ? <p className="text-[13px] font-medium text-danger">{error}</p> : <FormDescription>{hint}</FormDescription>}
    </FormItem>
  );
}

function MarginReadout() {
  const { t } = useTranslation();
  const f = useFormat();
  const [price, oldPrice, cost] = useWatch({ name: ['price', 'oldPrice', 'costPrice'] }) as [number | '', number | '', number | ''];
  const p = typeof price === 'number' ? price : 0;
  const c = typeof cost === 'number' ? cost : 0;
  const o = typeof oldPrice === 'number' ? oldPrice : 0;
  const margin = p > 0 && c > 0 ? ((p - c) / p) * 100 : null;
  const markup = p > 0 && c > 0 ? ((p - c) / c) * 100 : null;
  const discount = o > p && p > 0 ? Math.round((1 - p / o) * 100) : 0;
  return (
    <dl className="grid grid-cols-2 gap-3 rounded-lg border border-border bg-surface p-3 text-[13px] sm:grid-cols-4">
      <div className="flex flex-col gap-0.5">
        <dt className="text-xs text-muted-foreground">{t('products.form.fields.profitPerUnit')}</dt>
        <dd className={cn('font-semibold tabular', p && c ? (p - c < 0 ? 'text-danger' : 'text-foreground') : 'text-muted-foreground')}>{p && c ? f.money(p - c) : '—'}</dd>
      </div>
      <div className="flex flex-col gap-0.5">
        <dt className="text-xs text-muted-foreground">{t('products.form.fields.margin')}</dt>
        <dd className={cn('font-semibold tabular', margin === null ? 'text-muted-foreground' : margin < 0 ? 'text-danger' : margin < 10 ? 'text-warning' : 'text-success')}>{margin === null ? '—' : f.percent(margin)}</dd>
      </div>
      <div className="flex flex-col gap-0.5">
        <dt className="text-xs text-muted-foreground">{t('products.form.fields.markup')}</dt>
        <dd className="font-semibold tabular">{markup === null ? '—' : f.percent(markup)}</dd>
      </div>
      <div className="flex flex-col gap-0.5">
        <dt className="text-xs text-muted-foreground">{t('products.form.fields.discount')}</dt>
        <dd className="font-semibold tabular">{discount ? `−${discount}%` : '—'}</dd>
      </div>
    </dl>
  );
}

function ProductForm({ product }: { product: AdminProduct | undefined }) {
  const { t } = useTranslation();
  const f = useFormat();
  const navigate = useNavigate();
  const { can } = useSession();
  const isNew = !product;
  // whoever creates a product enters its cost; otherwise only finance roles see it
  const showCost = isNew || can(['analytics.read', 'expenses.read'], 'any');
  const specs = useSpecDefinitions();
  const defs = useMemo(() => new Map((specs.data ?? []).map((d) => [d.key, d])), [specs.data]);
  const categories = useCategoryOptions();
  const brands = useBrandOptions();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const title = product ? f.loc(product.name) : t('products.form.newTitle');
  usePageMeta(t('products.title'), product ? f.loc(product.name) : t('nav.newProduct'));

  const defaults = useMemo(
    () => (product ? withCategorySpecs(productToForm(product, defs), categories.flat.find((c) => c.node.id === product.category?.id), defs) : emptyProduct()),
    [product, defs, categories.flat],
  );
  const form = useForm<ProductFormValues, unknown, ProductOutput>({ resolver: productResolver(isNew), defaultValues: defaults, mode: 'onSubmit' });
  const canSave = isNew ? can('products.create') : can('products.update');

  const create = useAdminMutation((api, v: ProductOutput) => api.admin.products.create(v), { invalidate: ['products', 'inventory', 'movements'] });
  const update = useAdminMutation((api, v: ProductOutput) => api.admin.products.update(product!.id, v), { invalidate: ['products', 'inventory', 'movements'] });
  const duplicate = useAdminMutation((api, pid: string) => api.admin.products.duplicate(pid), { invalidate: ['products', 'inventory'] });
  const remove = useAdminMutation((api, pid: string) => api.admin.products.remove(pid), { invalidate: ['products', 'inventory'] });

  const categoryId = useWatch({ control: form.control, name: 'category' });
  const category = categories.flat.find((c) => c.node.id === categoryId);

  // auto slug for new products while the slug has not been edited by hand
  const [slugTouched, setSlugTouched] = useState(!isNew);
  const nameEn = useWatch({ control: form.control, name: 'name.en' });
  const nameUz = useWatch({ control: form.control, name: 'name.uz' });
  useEffect(() => {
    if (slugTouched) return;
    const base = nameEn?.trim() || nameUz?.trim();
    form.setValue('slug', slugFrom(base), { shouldDirty: false });
  }, [nameEn, nameUz, slugTouched, form]);

  const submit = (close: boolean) =>
    form.handleSubmit(async (values) => {
      try {
        const saved = isNew ? await create.mutateAsync(values) : await update.mutateAsync(values);
        form.reset(withCategorySpecs(productToForm(saved, defs), categories.flat.find((c) => c.node.id === saved.category?.id), defs));
        toast.success(isNew ? t('products.form.created') : t('products.form.saved'));
        bypassUnsavedGuard();
        if (close) void navigate('/products');
        else if (isNew) void navigate(`/products/${saved.id}`, { replace: true });
      } catch (error) {
        handleFormError(t, form, error);
      }
    });

  useSaveShortcut(() => void submit(false)(), canSave);
  const pending = create.isPending || update.isPending;
  const dirty = form.formState.isDirty;

  return (
    <Page>
      <UnsavedChangesGuard when={dirty && !pending} />
      <PageHeader
        back={{ to: '/products', label: t('products.form.back') }}
        title={title}
        meta={product ? <StatusBadge kind="product" value={product.status} size="lg" /> : undefined}
        description={
          product
            ? `${t('products.form.sku', { sku: product.sku })} · ${t('products.form.viewsSold', { sold: f.number(product.soldCount), views: f.number(product.viewCount), rating: f.number(product.rating, 1), reviews: f.number(product.reviewCount) })} · ${t('common.lastUpdated', { date: f.datetime(product.updatedAt) })}`
            : undefined
        }
        actions={
          product ? (
            <>
              {can('inventory.read') ? (
                <Button variant="outline" size="sm" asChild leftIcon={<BoxesIcon />}>
                  <Link to={`/inventory?q=${encodeURIComponent(product.sku)}`}>{t('products.actions.inventory')}</Link>
                </Button>
              ) : null}
              {can('products.create') ? (
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<CopyIcon />}
                  loading={duplicate.isPending}
                  onClick={async () => {
                    try {
                      const copy = await duplicate.mutateAsync(product.id);
                      toast.success(t('products.duplicated'));
                      void navigate(`/products/${copy.id}`);
                    } catch (error) {
                      toastError(t, error);
                    }
                  }}
                >
                  {t('products.actions.duplicate')}
                </Button>
              ) : null}
              {can('products.delete') ? (
                <Button variant="outline" size="sm" className="text-danger hover:text-danger" leftIcon={<Trash2Icon />} onClick={() => setConfirmDelete(true)}>
                  {t('products.actions.delete')}
                </Button>
              ) : null}
            </>
          ) : undefined
        }
      />

      <Form {...form}>
        <form onSubmit={(e) => void submit(false)(e)} noValidate className="flex flex-col gap-4">
          <fieldset disabled={!canSave} className="contents">
            <div className="grid min-w-0 gap-4 xl:grid-cols-3">
              <div className="flex min-w-0 flex-col gap-4 xl:col-span-2">
                <FormSection id="basics" title={t('products.form.sections.basics')} description={t('products.form.sections.basicsHint')}>
                  <LocalizedField name="name" label={t('products.form.fields.name')} required="all" maxLength={200} />
                  <FieldGrid>
                    <TextField name="sku" label={t('products.form.fields.sku')} required maxLength={60} description={t('products.form.fields.skuHint')} className="[&_input]:font-mono [&_input]:uppercase" />
                    <div onInput={() => setSlugTouched(true)}>
                      <SlugField name="slug" label={t('common.slug')} onGenerate={() => slugFrom(form.getValues('name.en') || form.getValues('name.uz'))} />
                    </div>
                  </FieldGrid>
                </FormSection>

                <FormSection id="description" title={t('products.form.sections.description')} description={t('products.form.sections.descriptionHint')}>
                  <LocalizedField name="shortDescription" label={t('products.form.fields.shortDescription')} multiline rows={2} maxLength={400} />
                  <LocalizedField name="description" label={t('products.form.fields.description')} markdown rows={12} maxLength={20000} />
                </FormSection>

                <FormSection id="media" title={t('products.form.sections.media')}>
                  <ImageListField name="images" label={t('products.form.fields.images')} max={15} folder="products" />
                  <VideosField />
                </FormSection>

                <FormSection id="pricing" title={t('products.form.sections.pricing')} description={t('products.form.sections.pricingHint')}>
                  {product?.promotion ? (
                    <Alert variant="brand" icon={<BadgePercentIcon />}>
                      <AlertTitle>{t('products.form.promotion.title')}</AlertTitle>
                      <AlertDescription>
                        <p>{t('products.form.promotion.text', { name: f.loc(product.promotion.name), date: f.datetime(product.promotion.endsAt), price: f.money(product.price), regular: f.money(product.regularPrice) })}</p>
                        <p className="text-xs">{t('products.form.promotion.hint')}</p>
                      </AlertDescription>
                    </Alert>
                  ) : null}
                  <FieldGrid cols={showCost ? 3 : 2}>
                    <MoneyField name="price" label={t('products.form.fields.price')} required />
                    <MoneyField name="oldPrice" label={t('products.form.fields.oldPrice')} optional description={t('products.form.fields.oldPriceHint')} />
                    {/* cost and margin are finance data: hidden from roles without analytics / expenses access (kept as is on save) */}
                    {showCost ? <MoneyField name="costPrice" label={t('products.form.fields.costPrice')} required description={t('products.form.fields.costHint')} /> : null}
                  </FieldGrid>
                  {showCost ? <MarginReadout /> : null}
                </FormSection>

                <FormSection id="specs" title={t('products.form.sections.specs')} description={t('products.form.sections.specsHint')}>
                  <SpecsEditor definitions={specs.data ?? []} category={category} />
                </FormSection>

                <FormSection id="variants" title={t('products.form.sections.variants')} description={t('products.form.sections.variantsHint')}>
                  <VariantsEditor />
                </FormSection>

                <FormSection id="seo" title={t('products.form.sections.seo')} description={t('common.seoHint')}>
                  <LocalizedField name="seo.title" label={t('common.seoTitle')} maxLength={160} />
                  <LocalizedField name="seo.description" label={t('common.seoDescription')} multiline rows={2} maxLength={320} />
                </FormSection>
              </div>

              <div className="flex min-w-0 flex-col gap-4">
                <FormSection id="visibility" title={t('products.form.sections.visibility')}>
                  <SelectField name="status" label={t('products.form.fields.status')} options={PRODUCT_STATUSES.map((s) => ({ value: s, label: t(`status.product.${s}`) }))} description={t('products.form.fields.statusHint')} />
                  <SwitchField name="flags.featured" label={t('products.form.fields.featured')} description={t('products.form.fields.featuredHint')} />
                  <SwitchField name="flags.isNew" label={t('products.form.fields.isNew')} description={t('products.form.fields.isNewHint')} />
                  <SwitchField name="flags.bestseller" label={t('products.form.fields.bestseller')} description={t('products.form.fields.bestsellerHint')} />
                </FormSection>

                <FormSection id="organization" title={t('products.form.sections.organization')}>
                  <ComboboxField name="category" label={t('products.form.fields.category')} required options={categories.options} allowClear={false} />
                  <ComboboxField name="brand" label={t('products.form.fields.brand')} options={brands.options} placeholder={t('products.form.fields.noBrand')} />
                  <TagsField name="tags" label={t('products.form.fields.tags')} description={t('products.form.fields.tagsHint')} />
                </FormSection>

                <FormSection id="inventory" title={t('products.form.sections.inventory')} description={t('products.form.sections.inventoryHint')}>
                  {product ? (
                    <div className="flex flex-col gap-2 rounded-lg border border-border bg-surface p-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[13px] font-semibold">{t('products.form.stock.current')}</span>
                        <StatusBadge kind="stock" value={product.stock.status} size="sm" />
                      </div>
                      <dl className="grid grid-cols-4 gap-2 text-center">
                        {[
                          { label: t('inventory.onHand'), value: product.stock.onHand },
                          { label: t('inventory.reserved'), value: product.stock.reserved },
                          { label: t('inventory.available'), value: product.stock.available },
                          { label: t('inventory.incoming'), value: product.stock.incoming },
                        ].map((s) => (
                          <div key={s.label}>
                            <dt className="text-[11px] text-muted-foreground">{s.label}</dt>
                            <dd className="font-bold tabular">{f.number(s.value)}</dd>
                          </div>
                        ))}
                      </dl>
                      {product.variants.length ? <p className="text-xs text-muted-foreground">{t('products.form.stock.variantsNote')}</p> : null}
                      {can('inventory.read') ? (
                        <Button type="button" variant="outline" size="sm" asChild leftIcon={<BoxesIcon />}>
                          <Link to={`/inventory?q=${encodeURIComponent(product.sku)}`}>{t('products.form.stock.manage')}</Link>
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                  <FieldGrid>
                    <NumberField name="minStock" label={t('products.form.fields.minStock')} suffix={t('common.pcs')} description={t('products.form.fields.minStockHint')} />
                    {isNew ? <NumberField name="initialStock" label={t('products.form.fields.initialStock')} suffix={t('common.pcs')} optional description={t('products.form.fields.initialStockHint')} /> : null}
                  </FieldGrid>
                </FormSection>

                <FormSection id="shipping" title={t('products.form.sections.shipping')}>
                  <NumberField name="warrantyMonths" label={t('products.form.fields.warranty')} suffix={t('common.months')} />
                  <FieldGrid>
                    <NumberField name="deliveryDays.min" label={t('products.form.fields.deliveryMin')} suffix={t('common.days')} />
                    <NumberField name="deliveryDays.max" label={t('products.form.fields.deliveryMax')} suffix={t('common.days')} />
                  </FieldGrid>
                  <NumberField name="weightKg" label={t('products.form.fields.weight')} suffix="kg" decimal optional />
                </FormSection>
              </div>
            </div>
          </fieldset>

          {canSave ? (
            <FormActionBar dirty={dirty} submitting={pending} onDiscard={() => form.reset(defaults)}>
              <Button type="button" variant="outline" className="max-sm:hidden" onClick={() => void navigate('/products')} disabled={pending}>
                {t('common.cancel')}
              </Button>
              <Button type="button" variant="outline" loading={pending} onClick={() => void submit(true)()}>
                {t('products.form.saveClose')}
              </Button>
              <Button type="submit" loading={pending}>
                {isNew ? t('products.form.create') : t('products.form.save')}
              </Button>
            </FormActionBar>
          ) : null}
        </form>
      </Form>

      <ConfirmDialog
        open={confirmDelete}
        onOpenChange={setConfirmDelete}
        title={t('products.deleteTitle')}
        description={product ? t('products.deleteText', { name: f.loc(product.name) }) : undefined}
        onConfirm={async () => {
          if (!product) return;
          try {
            await remove.mutateAsync(product.id);
            toast.success(t('form.deleted'));
            bypassUnsavedGuard();
            void navigate('/products');
          } catch (error) {
            if (apiErrorCode(error) === 'IN_USE') toast.error(t('products.deleteInUse'));
            else toastError(t, error);
            throw error;
          }
        }}
      />
    </Page>
  );
}
