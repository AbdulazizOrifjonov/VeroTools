import { useAdminMutation } from '@vero/api-client';
import type { LocalizedText } from '@vero/config';
import type { AdminCategoryNode, AdminSpecDefinition } from '@vero/types';
import { Button, Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, Form, toast } from '@vero/ui';
import { categoryInputSchema } from '@vero/validation';
import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';
import { NumberField, SlugField, SwitchField } from '../../components/form/fields';
import { FieldGrid } from '../../components/form/form-kit';
import { IconField } from '../../components/form/IconPicker';
import { LocalizedField } from '../../components/form/LocalizedField';
import { ComboboxField, MultiSelectField } from '../../components/form/pickers';
import { ImageField, imageToForm, type FormImage } from '../../components/media/ImageFields';
import { handleFormError } from '../../lib/errors';
import { useFormat } from '../../lib/format';
import { formResolver, slugFrom } from '../../lib/forms';
import type { FlatCategory } from '../catalog/catalog-data';

type Input = z.input<typeof categoryInputSchema>;
type Output = z.output<typeof categoryInputSchema>;
/** form values: the schema input with the image preview urls kept alongside the media id */
type Values = Omit<Input, 'image'> & { image: FormImage | null };

const L = (v?: Partial<LocalizedText>): LocalizedText => ({ uz: v?.uz ?? '', ru: v?.ru ?? '', en: v?.en ?? '' });

function toValues(c: AdminCategoryNode | undefined, parent: string | undefined, nextOrder: number): Values {
  return {
    name: L(c?.name),
    slug: c?.slug ?? '',
    description: L(c?.description),
    parent: c ? (c.parent ?? '') : (parent ?? ''),
    icon: c?.icon ?? '',
    image: imageToForm(c?.image),
    order: c?.order ?? nextOrder,
    isActive: c?.isActive ?? true,
    specKeys: c?.specKeys ?? [],
    seoTitle: L(c?.seoTitle),
    seoDescription: L(c?.seoDescription),
  };
}

export interface CategoryDialogTarget {
  category?: AdminCategoryNode;
  parent?: string;
}

/** Create / edit a category (name uz/ru/en, slug, parent, icon, image, order, visibility, filter specs, SEO). */
export function CategoryDialog({
  target,
  open,
  onOpenChange,
  flat,
  specs,
}: {
  target: CategoryDialogTarget | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flat: FlatCategory[];
  specs: AdminSpecDefinition[];
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const category = target?.category;
  const isNew = !category;

  const siblingsCount = useMemo(() => flat.filter((c) => (c.node.parent ?? '') === (target?.parent ?? category?.parent ?? '')).length, [flat, target, category]);
  const form = useForm<Values, unknown, Output>({ resolver: formResolver<Values, typeof categoryInputSchema>(categoryInputSchema), defaultValues: toValues(category, target?.parent, siblingsCount) });
  const [slugTouched, setSlugTouched] = useState(!isNew);
  useEffect(() => {
    if (!open) return;
    form.reset(toValues(category, target?.parent, siblingsCount));
    setSlugTouched(!!category);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- reset only when the dialog opens for a record
  }, [open, category?.id, target?.parent]);

  const nameEn = useWatch({ control: form.control, name: 'name.en' });
  const nameUz = useWatch({ control: form.control, name: 'name.uz' });
  useEffect(() => {
    // new categories only: the slug follows the name until it is edited by hand
    if (category || slugTouched || !open) return;
    const base = nameEn?.trim() || nameUz?.trim();
    form.setValue('slug', slugFrom(base), { shouldDirty: false });
  }, [nameEn, nameUz, slugTouched, open, form, category]);

  // a category cannot be moved inside itself or its own subtree
  const parentOptions = useMemo(() => {
    const blocked = new Set<string>();
    if (category) {
      blocked.add(category.id);
      for (const c of flat) if (c.path.some((p) => p.id === category.id)) blocked.add(c.node.id);
    }
    return flat.filter((c) => !blocked.has(c.node.id)).map((c) => ({ value: c.node.id, label: f.loc(c.node.name), depth: c.depth, hint: c.node.slug }));
  }, [flat, category, f]);

  const parentId = useWatch({ control: form.control, name: 'parent' });
  const inherited = useMemo(() => {
    const parentNode = flat.find((c) => c.node.id === parentId);
    if (!parentNode) return [];
    return [...new Set([...parentNode.path, parentNode.node].flatMap((n) => n.specKeys))];
  }, [flat, parentId]);
  const specOptions = useMemo(() => specs.map((s) => ({ value: s.key, label: f.loc(s.label), hint: [s.key, s.unit].filter(Boolean).join(' · ') })), [specs, f]);
  const specLabel = (key: string) => {
    const s = specs.find((x) => x.key === key);
    return s ? f.loc(s.label) : key;
  };

  const create = useAdminMutation((api, v: Output) => api.admin.categories.create(v), { invalidate: ['categories', 'products'] });
  const update = useAdminMutation((api, v: Output) => api.admin.categories.update(category!.id, v), { invalidate: ['categories', 'products'] });
  const pending = create.isPending || update.isPending;

  const submit = form.handleSubmit(async (values) => {
    try {
      if (isNew) await create.mutateAsync(values);
      // an empty parent must reach the API as "" (moves the category to the top level); undefined would be dropped
      else await update.mutateAsync({ ...values, parent: values.parent ?? ('' as unknown as undefined) });
      toast.success(isNew ? t('categories.form.created') : t('categories.form.saved'));
      onOpenChange(false);
    } catch (error) {
      handleFormError(t, form, error);
    }
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent size="lg" closeLabel={t('common.close')}>
        <DialogHeader>
          <DialogTitle>{isNew ? t('categories.form.createTitle') : t('categories.form.editTitle')}</DialogTitle>
          {category ? <DialogDescription>{f.loc(category.name)}</DialogDescription> : null}
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => void submit(e)} noValidate className="flex min-h-0 flex-1 flex-col gap-5">
            <DialogBody className="flex flex-col gap-5">
              <LocalizedField name="name" label={t('categories.form.name')} required="all" maxLength={120} />
              <FieldGrid>
                <div onInput={() => setSlugTouched(true)}>
                  <SlugField name="slug" label={t('common.slug')} onGenerate={() => slugFrom(form.getValues('name.en') || form.getValues('name.uz'))} />
                </div>
                <ComboboxField name="parent" label={t('categories.form.parent')} options={parentOptions} placeholder={t('categories.form.root')} description={category ? t('categories.form.parentHint') : undefined} />
              </FieldGrid>
              <FieldGrid>
                <IconField name="icon" label={t('categories.form.icon')} description={t('categories.form.iconHint')} />
                <NumberField name="order" label={t('categories.form.order')} description={t('categories.form.orderHint')} />
              </FieldGrid>
              <ImageField name="image" label={t('categories.form.image')} folder="categories" />
              <SwitchField name="isActive" label={t('categories.form.active')} description={t('categories.form.activeHint')} />
              <LocalizedField name="description" label={t('categories.form.description')} description={t('categories.form.descriptionHint')} multiline rows={3} maxLength={2000} />
              <div className="flex flex-col gap-2">
                <MultiSelectField name="specKeys" label={t('categories.form.specKeys')} description={t('categories.form.specKeysHint')} options={specOptions} />
                {inherited.length ? <p className="text-xs text-muted-foreground">{t('categories.form.inherited', { keys: inherited.map(specLabel).join(', ') })}</p> : null}
              </div>
              <div className="flex flex-col gap-4 border-t border-border pt-4">
                <LocalizedField name="seoTitle" label={t('common.seoTitle')} maxLength={160} />
                <LocalizedField name="seoDescription" label={t('common.seoDescription')} multiline rows={2} maxLength={320} />
              </div>
            </DialogBody>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
                {t('common.cancel')}
              </Button>
              <Button type="submit" loading={pending}>
                {isNew ? t('common.create') : t('common.save')}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
