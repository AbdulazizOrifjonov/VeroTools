import { useQueryClient } from '@tanstack/react-query';
import { useAdminMutation, useAdminQuery, useSession } from '@vero/api-client';
import { PAYMENT_METHODS, type AdminSetting, type PaymentMethod } from '@vero/types';
import { Alert, AlertDescription, Badge, Button, Checkbox, cn, Form, FormField, FormItem, FormLabel, toast } from '@vero/ui';
import { calcInstallment } from '@vero/utils';
import { ArrowDownIcon, ArrowUpIcon, ExternalLinkIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import { useEffect, useMemo, useState, type BaseSyntheticEvent, type ReactNode } from 'react';
import { useFieldArray, useForm, useFormContext, useWatch, type FieldValues, type UseFormReturn } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import type { z } from 'zod';
import { FieldMessage, MoneyField, NumberField, PhoneField, SwitchField, TextField } from '../../components/form/fields';
import { FieldGrid, FormActionBar, FormSection, UnsavedChangesGuard, useSaveShortcut } from '../../components/form/form-kit';
import { IconField } from '../../components/form/IconPicker';
import { LocalizedField } from '../../components/form/LocalizedField';
import { handleFormError } from '../../lib/errors';
import { formResolver } from '../../lib/forms';
import { useFormat } from '../../lib/format';
import {
  flatValues,
  homeSchema,
  installmentSchema,
  lastUpdated,
  normalizeSection,
  notificationsSchema,
  operationsSchema,
  paymentsSchema,
  sectionValues,
  seoSchema,
  socialSchema,
  storeSchema,
  type SectionKey,
} from './settings-model';

const SETTINGS_KEY = ['admin', 'settings'];

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the form values of each section differ
type AnyForm = UseFormReturn<any, unknown, any>;

function useSectionForm(section: SectionKey, schema: z.ZodType, settings: AdminSetting[]) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const defaults = useMemo(() => normalizeSection(section, sectionValues(section, settings)), [section, settings]);
  const form: AnyForm = useForm<FieldValues, unknown, unknown>({ resolver: formResolver<FieldValues, z.ZodType>(schema), defaultValues: defaults });
  useEffect(() => {
    if (!form.formState.isDirty) form.reset(defaults);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- follow refetches while the section is untouched
  }, [defaults]);
  const save = useAdminMutation((api, values: Record<string, unknown>) => api.admin.settings.update(values), { invalidate: ['settings'] });
  const [failed, setFailed] = useState(false);
  const submit = form.handleSubmit(async (output) => {
    try {
      const sent = flatValues(section, output);
      const saved = await save.mutateAsync(sent);
      qc.setQueryData(SETTINGS_KEY, saved);
      // the API answers 200 even when it silently drops values, so confirm that what was sent is what is stored
      const notApplied = Object.entries(sent).some(([key, value]) => !sameValue(saved.find((row) => row.key === key)?.value, value));
      if (notApplied) {
        setFailed(true);
        toast.error(t('settings.notApplied'));
        return;
      }
      setFailed(false);
      form.reset(normalizeSection(section, sectionValues(section, saved)));
      toast.success(t('settings.saved', { group: t(`settings.groups.${section}`) }));
    } catch (error) {
      handleFormError(t, form, error);
    }
  });
  return { form, submit, pending: save.isPending, failed };
}

/** Deep equality independent of object key order. */
function sameValue(a: unknown, b: unknown): boolean {
  const norm = (v: unknown): unknown =>
    Array.isArray(v) ? v.map(norm) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v as Record<string, unknown>).sort(([x], [y]) => x.localeCompare(y)).map(([k, x]) => [k, norm(x)])) : v;
  return JSON.stringify(norm(a ?? null)) === JSON.stringify(norm(b ?? null));
}

function SectionShell({
  section,
  settings,
  form,
  submit,
  pending,
  failed,
  onDirtyChange,
  children,
}: {
  section: SectionKey;
  settings: AdminSetting[];
  form: AnyForm;
  submit: (e?: BaseSyntheticEvent) => Promise<void>;
  pending: boolean;
  failed: boolean;
  onDirtyChange: (dirty: boolean) => void;
  children: ReactNode;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const { can } = useSession();
  const canEdit = can('settings.update');
  const dirty = form.formState.isDirty;
  useEffect(() => onDirtyChange(dirty), [dirty, onDirtyChange]);
  useSaveShortcut(() => void submit(), canEdit && dirty);
  const updated = lastUpdated(section, settings);
  return (
    <Form {...form}>
      <form onSubmit={(e) => void submit(e)} noValidate className="flex min-w-0 flex-col gap-4">
        <UnsavedChangesGuard when={dirty && !pending} />
        <FormSection
          id={`settings-${section}`}
          title={t(`settings.groups.${section}`)}
          description={t(`settings.groupHints.${section}`)}
          actions={updated ? <span className="text-xs text-muted-foreground">{t('settings.lastUpdated', { date: f.datetime(updated) })}</span> : undefined}
        >
          {failed ? (
            <Alert variant="danger">
              <AlertDescription>{t('settings.notApplied')}</AlertDescription>
            </Alert>
          ) : null}
          <fieldset disabled={!canEdit} className="contents">
            {children}
          </fieldset>
        </FormSection>
        {canEdit ? (
          <FormActionBar dirty={dirty} submitting={pending} onDiscard={() => form.reset()} className="mx-0 px-0 sm:mx-0 sm:px-0 lg:mx-0 lg:px-0">
            <Button type="submit" loading={pending} disabled={!dirty}>
              {t('common.save')}
            </Button>
          </FormActionBar>
        ) : null}
      </form>
    </Form>
  );
}

interface SectionProps {
  settings: AdminSetting[];
  onDirtyChange: (dirty: boolean) => void;
}

/* ----------------------------------------------------------------------------------------- store */

export function StoreSection({ settings, onDirtyChange }: SectionProps) {
  const { t } = useTranslation();
  const s = useSectionForm('store', storeSchema, settings);
  const [lat, lng] = useWatch({ control: s.form.control, name: ['store.map.lat', 'store.map.lng'] }) as [number | '', number | ''];
  const mapUrl = lat !== '' && lng !== '' && Number.isFinite(Number(lat)) && Number.isFinite(Number(lng)) ? `https://www.google.com/maps?q=${lat},${lng}` : null;
  return (
    <SectionShell section="store" settings={settings} onDirtyChange={onDirtyChange} {...s}>
      <FieldGrid>
        <TextField name="store.name" label={t('settings.store.name')} required maxLength={80} />
        <TextField name="store.website" label={t('settings.store.website')} type="url" placeholder="https://" maxLength={300} optional />
      </FieldGrid>
      <LocalizedField name="store.legalName" label={t('settings.store.legalName')} required="default" maxLength={160} />
      <FieldGrid>
        <PhoneField name="store.phone" label={t('settings.store.phone')} required />
        <PhoneField name="store.phoneSecondary" label={t('settings.store.phoneSecondary')} optional />
      </FieldGrid>
      <FieldGrid>
        <TextField name="store.email" label={t('settings.store.email')} type="email" required maxLength={120} />
        <TextField name="store.supportEmail" label={t('settings.store.supportEmail')} type="email" optional maxLength={120} />
      </FieldGrid>
      <LocalizedField name="store.address" label={t('settings.store.address')} required="default" maxLength={300} />
      <LocalizedField name="store.workingHours" label={t('settings.store.workingHours')} required="default" maxLength={160} />
      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-sm font-medium">{t('settings.store.map')}</span>
          {mapUrl ? (
            <Button asChild variant="link" size="xs" className="h-auto px-0" leftIcon={<ExternalLinkIcon />}>
              <a href={mapUrl} target="_blank" rel="noopener noreferrer">
                {t('settings.store.openMap')}
              </a>
            </Button>
          ) : null}
        </div>
        <FieldGrid cols={3}>
          <NumberField name="store.map.lat" label={t('settings.store.lat')} decimal allowNegative required />
          <NumberField name="store.map.lng" label={t('settings.store.lng')} decimal allowNegative required />
          <NumberField name="store.map.zoom" label={t('settings.store.zoom')} required />
        </FieldGrid>
        <p className="text-xs text-muted-foreground">{t('settings.store.mapHint')}</p>
      </div>
      <LocalizedField name="store.footerAbout" label={t('settings.store.footerAbout')} multiline rows={3} maxLength={600} />
    </SectionShell>
  );
}

/* ---------------------------------------------------------------------------------------- social */

const SOCIAL = [
  ['telegram', 'https://t.me/…'],
  ['telegramBot', 'https://t.me/…_bot'],
  ['instagram', 'https://instagram.com/…'],
  ['facebook', 'https://facebook.com/…'],
  ['youtube', 'https://youtube.com/@…'],
  ['tiktok', 'https://tiktok.com/@…'],
] as const;

export function SocialSection({ settings, onDirtyChange }: SectionProps) {
  const { t } = useTranslation();
  const s = useSectionForm('social', socialSchema, settings);
  return (
    <SectionShell section="social" settings={settings} onDirtyChange={onDirtyChange} {...s}>
      <FieldGrid>
        {SOCIAL.map(([key, placeholder]) => (
          <TextField key={key} name={`social.${key}`} label={t(`settings.social.${key}`)} type="url" placeholder={placeholder} maxLength={300} optional />
        ))}
      </FieldGrid>
    </SectionShell>
  );
}

/* -------------------------------------------------------------------------------------- payments */

function useProviders() {
  const { can } = useSession();
  return useAdminQuery(['payments', 'providers'], (api) => api.admin.payments.providers(), { enabled: can('payments.read'), staleTime: 60_000 });
}

function MethodsField() {
  const { t } = useTranslation();
  const { control } = useFormContext();
  const providers = useProviders();
  const providerOf = (m: PaymentMethod) => providers.data?.find((p) => p.methods.includes(m));
  return (
    <FormField
      control={control}
      name="payments.enabledMethods"
      render={({ field }) => {
        const value = (field.value ?? []) as PaymentMethod[];
        return (
          <FormItem>
            <FormLabel required>{t('settings.payments.methods')}</FormLabel>
            <ul className="grid gap-2 sm:grid-cols-2" role="group">
              {PAYMENT_METHODS.map((m) => {
                const provider = providerOf(m);
                const id = `pm-${m}`;
                return (
                  <li key={m}>
                    <label htmlFor={id} className="flex h-full cursor-pointer items-start gap-2.5 rounded-lg border border-input bg-surface-elevated p-3 text-sm has-[[data-state=checked]]:border-foreground/40">
                      <Checkbox id={id} className="mt-0.5" checked={value.includes(m)} onCheckedChange={(on) => field.onChange(on ? [...value, m] : value.filter((v) => v !== m))} onBlur={field.onBlur} />
                      <span className="flex min-w-0 flex-col gap-1">
                        <span className="font-medium">{t(`common:paymentMethod.${m}`)}</span>
                        {provider ? (
                          <span className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                            {t('settings.payments.provider', { name: t(`payments.providers.names.${provider.provider}`, { defaultValue: provider.provider }) })}
                            {provider.testMode ? (
                              <Badge variant="warning" size="sm">
                                {t('settings.payments.testMode')}
                              </Badge>
                            ) : null}
                          </span>
                        ) : null}
                        {provider && !provider.configured ? <span className="text-xs text-warning">{t('settings.payments.notConfigured')}</span> : null}
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
            <p className="text-xs text-muted-foreground">{t('settings.payments.methodsHint')}</p>
            <FieldMessage />
          </FormItem>
        );
      }}
    />
  );
}

export function PaymentsSection({ settings, onDirtyChange }: SectionProps) {
  const s = useSectionForm('payments', paymentsSchema, settings);
  return (
    <SectionShell section="payments" settings={settings} onDirtyChange={onDirtyChange} {...s}>
      <MethodsField />
    </SectionShell>
  );
}

/* ----------------------------------------------------------------------------------- installment */

function PlansEditor() {
  const { t } = useTranslation();
  const f = useFormat();
  const { control, formState } = useFormContext();
  const plans = useFieldArray({ control, name: 'installment.plans' });
  const values = (useWatch({ control, name: 'installment.plans' }) ?? []) as Array<{ months: number | ''; markupPercent: number | '' }>;
  const rootError = (formState.errors.installment as { plans?: { message?: string; root?: { message?: string } } } | undefined)?.plans;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{t('settings.installment.plans')}</span>
        <p className="text-xs text-muted-foreground">{t('settings.installment.plansHint')}</p>
      </div>
      <ul className="flex flex-col gap-2">
        {plans.fields.map((field, i) => {
          const v = values[i];
          const months = Number(v?.months);
          const markup = Number(v?.markupPercent);
          const example = months > 0 && Number.isFinite(markup) ? calcInstallment(1_000_000, { months, markupPercent: markup }) : null;
          return (
            <li key={field.id} className="grid grid-cols-[1fr_1fr_auto] items-start gap-3 rounded-lg border border-border p-3">
              <NumberField name={`installment.plans.${i}.months`} label={t('settings.installment.months')} suffix={t('common.months')} required />
              <NumberField name={`installment.plans.${i}.markupPercent`} label={t('settings.installment.markup')} suffix="%" decimal required />
              <Button type="button" variant="ghost" size="icon-sm" className="mt-7 text-muted-foreground hover:text-danger" aria-label={t('settings.installment.remove')} onClick={() => plans.remove(i)} disabled={plans.fields.length <= 1}>
                <Trash2Icon />
              </Button>
              {example ? <p className="col-span-3 -mt-1 text-xs text-muted-foreground tabular">{t('settings.installment.monthly', { amount: f.money(example.monthlyPayment) })}</p> : null}
            </li>
          );
        })}
      </ul>
      {rootError?.message || rootError?.root?.message ? <p className="text-[13px] font-medium text-danger">{t('settings.installment.atLeastOne')}</p> : null}
      <Button type="button" variant="outline" size="sm" className="self-start" leftIcon={<PlusIcon />} onClick={() => plans.append({ months: '', markupPercent: 0 })} disabled={plans.fields.length >= 12}>
        {t('settings.installment.add')}
      </Button>
    </div>
  );
}

export function InstallmentSection({ settings, onDirtyChange }: SectionProps) {
  const { t } = useTranslation();
  const s = useSectionForm('installment', installmentSchema, settings);
  const providers = useProviders();
  const provider = providers.data?.find((p) => p.provider === 'installment');
  return (
    <SectionShell section="installment" settings={settings} onDirtyChange={onDirtyChange} {...s}>
      {provider && !provider.configured ? (
        <Alert variant="warning">
          <AlertDescription>{t('settings.installment.providerOff')}</AlertDescription>
        </Alert>
      ) : null}
      <SwitchField name="installment.enabled" label={t('settings.installment.enabled')} description={t('settings.installment.enabledHint')} />
      <MoneyField name="installment.minAmount" label={t('settings.installment.minAmount')} required className="sm:max-w-xs" />
      <PlansEditor />
    </SectionShell>
  );
}

/* ------------------------------------------------------------------------------------ operations */

export function OperationsSection({ settings, onDirtyChange }: SectionProps) {
  const { t } = useTranslation();
  const s = useSectionForm('operations', operationsSchema, settings);
  return (
    <SectionShell section="operations" settings={settings} onDirtyChange={onDirtyChange} {...s}>
      <NumberField name="order.autoCancelUnpaidMinutes" label={t('settings.orders.autoCancel')} suffix={t('common.minutes')} required description={t('settings.orders.autoCancelHint')} className="sm:max-w-md" />
      <NumberField name="inventory.lowStockThreshold" label={t('settings.inventory.lowStock')} suffix={t('common.pcs')} required description={t('settings.inventory.lowStockHint')} className="sm:max-w-md" />
      <MoneyField name="delivery.defaultFreeThreshold" label={t('settings.delivery.freeThreshold')} required description={t('settings.delivery.freeThresholdHint')} className="sm:max-w-md" />
    </SectionShell>
  );
}

/* ------------------------------------------------------------------------------------------ home */

function ReorderButtons({ index, count, onMove, label }: { index: number; count: number; onMove: (from: number, to: number) => void; label: string }) {
  const { t } = useTranslation();
  return (
    <span className="flex items-center">
      <Button type="button" variant="ghost" size="icon-sm" disabled={index === 0} onClick={() => onMove(index, index - 1)} aria-label={`${t('settings.home.moveUp')}: ${label}`}>
        <ArrowUpIcon />
      </Button>
      <Button type="button" variant="ghost" size="icon-sm" disabled={index === count - 1} onClick={() => onMove(index, index + 1)} aria-label={`${t('settings.home.moveDown')}: ${label}`}>
        <ArrowDownIcon />
      </Button>
    </span>
  );
}

function AdvantagesEditor() {
  const { t } = useTranslation();
  const { control } = useFormContext();
  const list = useFieldArray({ control, name: 'home.advantages' });
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{t('settings.home.advantages')}</span>
        <p className="text-xs text-muted-foreground">{t('settings.home.advantagesHint')}</p>
      </div>
      <ol className="flex flex-col gap-3">
        {list.fields.map((field, i) => {
          const label = t('settings.home.advantage', { n: i + 1 });
          return (
            <li key={field.id} className="flex flex-col gap-3 rounded-lg border border-border p-3 sm:p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-semibold">{label}</span>
                <span className="flex items-center gap-1">
                  <ReorderButtons index={i} count={list.fields.length} onMove={list.move} label={label} />
                  <Button type="button" variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-danger" aria-label={`${t('settings.home.remove')}: ${label}`} onClick={() => list.remove(i)}>
                    <Trash2Icon />
                  </Button>
                </span>
              </div>
              <div className="grid gap-3 sm:grid-cols-[12rem_minmax(0,1fr)]">
                <IconField name={`home.advantages.${i}.icon`} label={t('settings.home.icon')} />
                <LocalizedField name={`home.advantages.${i}.title`} label={t('settings.home.advTitle')} required="default" maxLength={80} />
              </div>
              <LocalizedField name={`home.advantages.${i}.text`} label={t('settings.home.advText')} multiline rows={2} maxLength={240} />
            </li>
          );
        })}
      </ol>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="self-start"
        leftIcon={<PlusIcon />}
        disabled={list.fields.length >= 12}
        onClick={() => list.append({ icon: 'ShieldCheck', title: { uz: '', ru: '', en: '' }, text: { uz: '', ru: '', en: '' } })}
      >
        {t('settings.home.addAdvantage')}
      </Button>
    </div>
  );
}

function TrustBulletsEditor() {
  const { t } = useTranslation();
  const { control } = useFormContext();
  const list = useFieldArray({ control, name: 'product.trustBullets' });
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <span className="text-sm font-medium">{t('settings.home.trustBullets')}</span>
        <p className="text-xs text-muted-foreground">{t('settings.home.trustBulletsHint')}</p>
      </div>
      <ol className="flex flex-col gap-2">
        {list.fields.map((field, i) => {
          const label = t('settings.home.bullet', { n: i + 1 });
          return (
            <li key={field.id} className="flex items-start gap-2 rounded-lg border border-border p-3">
              <LocalizedField name={`product.trustBullets.${i}`} label={label} required="default" maxLength={120} className="flex-1" />
              <span className="mt-7 flex items-center">
                <ReorderButtons index={i} count={list.fields.length} onMove={list.move} label={label} />
                <Button type="button" variant="ghost" size="icon-sm" className="text-muted-foreground hover:text-danger" aria-label={`${t('settings.home.remove')}: ${label}`} onClick={() => list.remove(i)}>
                  <Trash2Icon />
                </Button>
              </span>
            </li>
          );
        })}
      </ol>
      <Button type="button" variant="outline" size="sm" className="self-start" leftIcon={<PlusIcon />} disabled={list.fields.length >= 10} onClick={() => list.append({ uz: '', ru: '', en: '' })}>
        {t('settings.home.addBullet')}
      </Button>
    </div>
  );
}

export function HomeSection({ settings, onDirtyChange }: SectionProps) {
  const s = useSectionForm('home', homeSchema, settings);
  return (
    <SectionShell section="home" settings={settings} onDirtyChange={onDirtyChange} {...s}>
      <AdvantagesEditor />
      <div className="border-t border-border pt-4">
        <TrustBulletsEditor />
      </div>
    </SectionShell>
  );
}

/* ------------------------------------------------------------------------------------------- seo */

export function SeoSection({ settings, onDirtyChange }: SectionProps) {
  const { t } = useTranslation();
  const s = useSectionForm('seo', seoSchema, settings);
  return (
    <SectionShell section="seo" settings={settings} onDirtyChange={onDirtyChange} {...s}>
      <LocalizedField name="seo.title" label={t('settings.seo.title')} required="default" maxLength={160} />
      <LocalizedField name="seo.description" label={t('settings.seo.description')} multiline rows={3} maxLength={320} />
    </SectionShell>
  );
}

/* --------------------------------------------------------------------------------- notifications */

export function NotificationsSection({ settings, onDirtyChange }: SectionProps) {
  const { t } = useTranslation();
  const s = useSectionForm('notifications', notificationsSchema, settings);
  return (
    <SectionShell section="notifications" settings={settings} onDirtyChange={onDirtyChange} {...s}>
      <div className={cn('flex flex-col gap-3')}>
        <SwitchField name="notifications.telegramNewOrders" label={t('settings.notificationsGroup.telegramNewOrders')} description={t('settings.notificationsGroup.telegramNewOrdersHint')} />
        <SwitchField name="notifications.emailOrderStatus" label={t('settings.notificationsGroup.emailOrderStatus')} description={t('settings.notificationsGroup.emailOrderStatusHint')} />
        <SwitchField name="notifications.smsOrderStatus" label={t('settings.notificationsGroup.smsOrderStatus')} description={t('settings.notificationsGroup.smsOrderStatusHint')} />
      </div>
    </SectionShell>
  );
}
