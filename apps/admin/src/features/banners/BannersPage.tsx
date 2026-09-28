import { useAdminList, useAdminMutation, useSession } from '@vero/api-client';
import type { Language, LocalizedText } from '@vero/config';
import { BANNER_PLACEMENTS, type AdminBanner, type BannerPlacement } from '@vero/types';
import {
  Badge,
  Button,
  cn,
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  Form,
  ToggleGroup,
  ToggleGroupItem,
  toast,
  type BadgeVariant,
} from '@vero/ui';
import { bannerInputSchema } from '@vero/validation';
import { ArrowRightIcon, EllipsisIcon, GalleryHorizontalIcon, ImageIcon, MonitorIcon, PencilIcon, PlusIcon, SmartphoneIcon, Trash2Icon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';
import { ConfirmDialog, useConfirm, useDialogTarget } from '../../components/common/ConfirmDialog';
import { Page, PageHeader, usePageMeta } from '../../components/common/page';
import { DataTable, type DataColumn } from '../../components/data-table/DataTable';
import { FilterSelect } from '../../components/data-table/toolbar';
import { DateTimeField, NumberField, SelectField, SwitchField, TextField } from '../../components/form/fields';
import { FieldGrid } from '../../components/form/form-kit';
import { LocalizedField } from '../../components/form/LocalizedField';
import { ImageField, imageToForm, type FormImage } from '../../components/media/ImageFields';
import { handleFormError, toastError } from '../../lib/errors';
import { useFormat } from '../../lib/format';
import { formResolver } from '../../lib/forms';
import { assetUrl } from '../../lib/images';
import { useListState } from '../../lib/url-state';

type LiveState = 'live' | 'scheduled' | 'ended' | 'off';
const LIVE_VARIANT: Record<LiveState, BadgeVariant> = { live: 'success', scheduled: 'info', ended: 'muted', off: 'muted' };

function liveState(b: Pick<AdminBanner, 'isActive' | 'startsAt' | 'endsAt'>, now = Date.now()): LiveState {
  if (!b.isActive) return 'off';
  if (b.startsAt && new Date(b.startsAt).getTime() > now) return 'scheduled';
  if (b.endsAt && new Date(b.endsAt).getTime() <= now) return 'ended';
  return 'live';
}

/** Storefront proportions per placement (desktop / mobile). */
const ASPECT: Record<BannerPlacement, { desktop: string; mobile: string }> = {
  home_hero: { desktop: 'aspect-[1600/560]', mobile: 'aspect-square' },
  home_secondary: { desktop: 'aspect-[16/9]', mobile: 'aspect-[4/3]' },
  home_middle: { desktop: 'aspect-[21/8]', mobile: 'aspect-[4/3]' },
  catalog_top: { desktop: 'aspect-[1600/320]', mobile: 'aspect-[16/7]' },
};

type Input = z.input<typeof bannerInputSchema>;
type Output = z.output<typeof bannerInputSchema>;
type Values = Omit<Input, 'imageDesktop' | 'imageMobile' | 'startsAt' | 'endsAt' | 'title' | 'subtitle' | 'buttonText'> & {
  title: LocalizedText;
  subtitle: LocalizedText;
  buttonText: LocalizedText;
  imageDesktop: FormImage | null;
  imageMobile: FormImage | null;
  startsAt: string;
  endsAt: string;
};

const L = (v?: Partial<LocalizedText>): LocalizedText => ({ uz: v?.uz ?? '', ru: v?.ru ?? '', en: v?.en ?? '' });

function toValues(b?: AdminBanner | null): Values {
  return {
    placement: b?.placement ?? 'home_hero',
    title: L(b?.title),
    subtitle: L(b?.subtitle),
    buttonText: L(b?.buttonText),
    buttonUrl: b?.buttonUrl ?? '',
    imageDesktop: imageToForm(b?.imageDesktop),
    imageMobile: imageToForm(b?.imageMobile),
    textTheme: b?.textTheme ?? 'dark',
    startsAt: b?.startsAt ?? '',
    endsAt: b?.endsAt ?? '',
    priority: b?.priority ?? 0,
    isActive: b?.isActive ?? true,
  };
}

/** Approximation of the storefront banner (BannerText over BannerPicture) that follows the form live. */
function BannerPreview({ values, device, lang }: { values: Values; device: 'desktop' | 'mobile'; lang: Language }) {
  const { t } = useTranslation();
  const image = device === 'mobile' ? (values.imageMobile ?? values.imageDesktop) : (values.imageDesktop ?? values.imageMobile);
  const src = assetUrl(image?.medium ?? image?.url);
  const dark = values.textTheme === 'dark';
  const title = values.title[lang] || values.title.uz;
  const subtitle = values.subtitle[lang] || values.subtitle.uz;
  const button = values.buttonText[lang] || values.buttonText.uz;
  const aspect = ASPECT[values.placement as BannerPlacement] ?? ASPECT.home_hero;
  return (
    <div className={cn('mx-auto w-full', device === 'mobile' && 'max-w-[300px]')}>
      <div className={cn('relative overflow-hidden rounded-xl', device === 'mobile' ? aspect.mobile : aspect.desktop, dark ? 'bg-neutral-900' : 'bg-neutral-100')}>
        {src ? (
          <img src={src} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center text-xs text-muted-foreground">
            <ImageIcon className="size-6" aria-hidden="true" />
            {t('banners.form.previewEmpty')}
          </div>
        )}
        {title ? (
          <div className={cn('absolute inset-0 flex p-4', device === 'mobile' ? 'items-start pt-5' : 'items-center sm:p-6')}>
            <div className={cn('flex max-w-[62%] flex-col items-start gap-1.5', device === 'mobile' && 'max-w-full', dark ? 'text-white' : 'text-neutral-950')}>
              <p className={cn('max-w-[18ch] font-extrabold tracking-tight text-balance', values.placement === 'home_hero' ? 'text-xl leading-[1.1]' : 'text-base leading-tight')}>{title}</p>
              {subtitle ? <p className={cn('line-clamp-3 max-w-[42ch] text-[11px] leading-snug', dark ? 'text-white/80' : 'text-neutral-700')}>{subtitle}</p> : null}
              {button && values.buttonUrl ? (
                <span className="mt-1 inline-flex h-7 items-center gap-1.5 rounded-md bg-primary px-2.5 text-[11px] font-semibold text-primary-foreground">
                  {button}
                  <ArrowRightIcon className="size-3" aria-hidden="true" />
                </span>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

function BannerDialog({ banner, open, onOpenChange }: { banner: AdminBanner | null; open: boolean; onOpenChange: (open: boolean) => void }) {
  const { t, i18n } = useTranslation();
  const isNew = !banner;
  const form = useForm<Values, unknown, Output>({ resolver: formResolver<Values, typeof bannerInputSchema>(bannerInputSchema), defaultValues: toValues(banner) });
  const [device, setDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [lang, setLang] = useState<Language>((i18n.language as Language) ?? 'uz');
  useEffect(() => {
    if (open) form.reset(toValues(banner));
  }, [open, banner, form]);
  const values = useWatch({ control: form.control }) as Values;
  const create = useAdminMutation((api, v: Output) => api.admin.banners.create(v), { invalidate: ['banners'] });
  const update = useAdminMutation((api, v: Output) => api.admin.banners.update(banner!.id, v), { invalidate: ['banners'] });
  const pending = create.isPending || update.isPending;
  const submit = form.handleSubmit(async (v) => {
    try {
      if (isNew) await create.mutateAsync(v);
      else await update.mutateAsync(v);
      toast.success(isNew ? t('banners.form.created') : t('banners.form.saved'));
      onOpenChange(false);
    } catch (error) {
      handleFormError(t, form, error);
    }
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !pending && onOpenChange(o)}>
      <DialogContent size="full" className="xl:max-w-6xl" closeLabel={t('common.close')}>
        <DialogHeader>
          <DialogTitle>{isNew ? t('banners.form.createTitle') : t('banners.form.editTitle')}</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={(e) => void submit(e)} noValidate className="flex min-h-0 flex-1 flex-col gap-5">
            <DialogBody className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
              <div className="flex min-w-0 flex-col gap-5">
                <FieldGrid>
                  <SelectField name="placement" label={t('banners.form.placement')} required options={BANNER_PLACEMENTS.map((p) => ({ value: p, label: t(`enums.placement.${p}`) }))} />
                  <SelectField name="textTheme" label={t('banners.form.textTheme')} description={t('banners.form.textThemeHint')} options={(['dark', 'light'] as const).map((th) => ({ value: th, label: t(`enums.textTheme.${th}`) }))} />
                </FieldGrid>
                <LocalizedField name="title" label={t('banners.form.title')} required="default" maxLength={80} />
                <LocalizedField name="subtitle" label={t('banners.form.subtitle')} multiline rows={2} maxLength={200} />
                <FieldGrid>
                  <LocalizedField name="buttonText" label={t('banners.form.buttonText')} maxLength={40} />
                  <TextField name="buttonUrl" label={t('banners.form.buttonUrl')} optional maxLength={500} placeholder="/catalog/power-tools" description={t('banners.form.buttonUrlHint')} />
                </FieldGrid>
                <ImageField name="imageDesktop" label={t('banners.form.imageDesktop')} required folder="banners" aspect="banner" description={t('banners.form.imageDesktopHint')} />
                <ImageField name="imageMobile" label={t('banners.form.imageMobile')} folder="banners" aspect="wide" description={t('banners.form.imageMobileHint')} />
                <FieldGrid>
                  <DateTimeField name="startsAt" label={t('banners.form.startsAt')} optional />
                  <DateTimeField name="endsAt" label={t('banners.form.endsAt')} optional />
                </FieldGrid>
                <FieldGrid>
                  <NumberField name="priority" label={t('banners.form.priority')} description={t('banners.form.priorityHint')} />
                  <SwitchField name="isActive" label={t('banners.form.active')} />
                </FieldGrid>
              </div>
              <aside className="flex min-w-0 flex-col gap-3 lg:sticky lg:top-0 lg:self-start" aria-label={t('banners.form.preview')}>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h3 className="text-sm font-semibold">{t('banners.form.preview')}</h3>
                  <div className="flex items-center gap-2">
                    <ToggleGroup type="single" size="sm" variant="outline" value={lang} onValueChange={(v) => v && setLang(v as Language)} aria-label={t('banners.form.previewLang')}>
                      {(['uz', 'ru', 'en'] as const).map((l) => (
                        <ToggleGroupItem key={l} value={l} className="px-2 text-xs font-semibold uppercase">
                          {l}
                        </ToggleGroupItem>
                      ))}
                    </ToggleGroup>
                    <ToggleGroup type="single" size="sm" variant="outline" value={device} onValueChange={(v) => v && setDevice(v as 'desktop' | 'mobile')}>
                      <ToggleGroupItem value="desktop" aria-label={t('banners.form.previewDesktop')}>
                        <MonitorIcon />
                      </ToggleGroupItem>
                      <ToggleGroupItem value="mobile" aria-label={t('banners.form.previewMobile')}>
                        <SmartphoneIcon />
                      </ToggleGroupItem>
                    </ToggleGroup>
                  </div>
                </div>
                <div className="rounded-xl border border-border bg-surface p-3">
                  <BannerPreview values={values} device={device} lang={lang} />
                </div>
                <p className="text-xs text-muted-foreground">{t(`enums.placement.${values.placement}`)}</p>
              </aside>
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

export default function BannersPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const { can } = useSession();
  usePageMeta(t('banners.title'));
  const list = useListState({ filters: ['placement'] as const, defaultLimit: 50 });
  const query = useAdminList('banners', (api, p) => api.admin.banners.list(p), list.params);
  const dialog = useDialogTarget<AdminBanner | null>();
  const del = useConfirm<AdminBanner>();
  const remove = useAdminMutation((api, id: string) => api.admin.banners.remove(id), { invalidate: ['banners'] });
  const canUpdate = can('banners.update');

  const columns = useMemo<DataColumn<AdminBanner>[]>(
    () => [
      {
        id: 'banner',
        header: t('banners.columns.banner'),
        meta: { alwaysVisible: true, cellClassName: 'whitespace-normal' },
        cell: ({ row }) => {
          const b = row.original;
          const src = assetUrl(b.imageDesktop?.thumb ?? b.imageDesktop?.url);
          return (
            <div className="flex min-w-72 items-center gap-3">
              <div className={cn('flex h-12 w-28 shrink-0 items-center justify-center overflow-hidden rounded-md border border-border', b.textTheme === 'dark' ? 'bg-neutral-900' : 'bg-neutral-100')}>
                {src ? <img src={src} alt="" className="size-full object-cover" loading="lazy" /> : <ImageIcon className="size-4 text-muted-foreground" aria-hidden="true" />}
              </div>
              <div className="flex min-w-0 flex-col gap-0.5">
                {canUpdate ? (
                  <button type="button" onClick={() => dialog.ask(b)} className="line-clamp-1 text-start font-semibold text-foreground hover:underline focus-visible:outline-2 focus-visible:outline-ring">
                    {f.loc(b.title)}
                  </button>
                ) : (
                  <span className="line-clamp-1 font-semibold">{f.loc(b.title)}</span>
                )}
                {f.loc(b.subtitle) ? <span className="line-clamp-1 text-xs text-muted-foreground">{f.loc(b.subtitle)}</span> : null}
                {b.buttonUrl ? <span className="truncate font-mono text-[11px] text-muted-foreground">{b.buttonUrl}</span> : null}
              </div>
            </div>
          );
        },
      },
      { id: 'placement', header: t('banners.columns.placement'), cell: ({ row }) => t(`enums.placement.${row.original.placement}`) },
      {
        id: 'schedule',
        header: t('banners.columns.schedule'),
        cell: ({ row }) => {
          const b = row.original;
          return b.startsAt || b.endsAt ? (
            <div className="flex flex-col text-[13px] tabular">
              <span>{b.startsAt ? f.datetime(b.startsAt) : '—'}</span>
              <span className="text-muted-foreground">{b.endsAt ? f.datetime(b.endsAt) : '—'}</span>
            </div>
          ) : (
            <span className="text-muted-foreground">{t('banners.always')}</span>
          );
        },
      },
      { id: 'priority', header: t('banners.columns.priority'), meta: { align: 'end' }, cell: ({ row }) => <span className="text-muted-foreground">{row.original.priority}</span> },
      {
        id: 'status',
        header: t('banners.columns.status'),
        cell: ({ row }) => {
          const state = liveState(row.original);
          return (
            <Badge variant={LIVE_VARIANT[state]} size="sm" dot>
              {t(`banners.${state}`)}
            </Badge>
          );
        },
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">{t('table.actions')}</span>,
        meta: { align: 'end', alwaysVisible: true },
        cell: ({ row }) =>
          canUpdate || can('banners.delete') ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon-sm" aria-label={`${t('table.rowActions')}: ${f.loc(row.original.title)}`}>
                  <EllipsisIcon />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                {canUpdate ? (
                  <DropdownMenuItem onSelect={() => dialog.ask(row.original)}>
                    <PencilIcon aria-hidden="true" />
                    {t('common.edit')}
                  </DropdownMenuItem>
                ) : null}
                {can('banners.delete') ? (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={() => del.ask(row.original)}>
                      <Trash2Icon aria-hidden="true" />
                      {t('common.delete')}
                    </DropdownMenuItem>
                  </>
                ) : null}
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null,
      },
    ],
    [t, f, can, canUpdate, dialog.ask, del.ask],
  );

  return (
    <Page>
      <PageHeader
        title={t('banners.title')}
        description={t('banners.description')}
        actions={
          can('banners.create') ? (
            <Button leftIcon={<PlusIcon />} onClick={() => dialog.ask(null)}>
              {t('banners.add')}
            </Button>
          ) : undefined
        }
      />
      <DataTable
        id="banners"
        label={t('banners.title')}
        columns={columns}
        data={query.data?.items}
        getRowId={(b) => b.id}
        isLoading={query.isLoading}
        isFetching={query.isFetching}
        error={query.error}
        onRetry={() => void query.refetch()}
        page={list.page}
        limit={list.limit}
        total={query.data?.meta.total}
        pages={query.data?.meta.pages}
        onPageChange={list.setPage}
        onLimitChange={list.setLimit}
        filtered={!!list.filters.placement}
        onResetFilters={list.reset}
        empty={{ title: t('banners.empty'), description: t('banners.emptyHint'), icon: <GalleryHorizontalIcon /> }}
        toolbar={<FilterSelect label={t('banners.placementFilter')} value={list.filters.placement} onChange={(v) => list.setFilter('placement', v)} options={BANNER_PLACEMENTS.map((p) => ({ value: p, label: t(`enums.placement.${p}`) }))} />}
      />
      <BannerDialog banner={dialog.target} open={dialog.open} onOpenChange={dialog.onOpenChange} />
      <ConfirmDialog
        open={del.open}
        onOpenChange={del.onOpenChange}
        title={t('banners.deleteTitle')}
        description={del.target ? t('banners.deleteText', { title: f.loc(del.target.title) }) : undefined}
        onConfirm={async () => {
          if (!del.target) return;
          try {
            await remove.mutateAsync(del.target.id);
            toast.success(t('form.deleted'));
          } catch (error) {
            toastError(t, error);
            throw error;
          }
        }}
      />
    </Page>
  );
}
