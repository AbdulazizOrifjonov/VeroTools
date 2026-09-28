import { useContactMessage, usePickupPoints, useSettings } from '@vero/api-client';
import type { PickupPointDTO } from '@vero/types';
import { Alert, AlertDescription, AlertTitle, Button, cn, Form, Skeleton } from '@vero/ui';
import { contactMessageSchema, V, type ContactMessageFormInput } from '@vero/validation';
import { zodResolver } from '@hookform/resolvers/zod';
import { ClockIcon, ExternalLinkIcon, MailIcon, MapPinIcon, PhoneCallIcon, PhoneIcon, SendIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import { Crumbs } from '../components/common/Crumbs';
import { PageTitle } from '../components/common/Section';
import { ErrorState } from '../components/common/states';
import { PhoneField, TextareaField, TextField } from '../components/form/fields';
import { SOCIAL_LABELS, SocialIcon } from '../components/layout/SocialIcon';
import { useDocumentMeta } from '../hooks/use-document-meta';
import { useFormat } from '../hooks/use-format';
import { handleFormError } from '../lib/errors';

type Mode = 'contact' | 'callback';

/** The message is optional in the API schema (callback requests have none) — required for "contact". */
const messageSchema = contactMessageSchema.superRefine((v, ctx) => {
  if (v.type === 'contact' && !v.message) ctx.addIssue({ code: 'custom', message: V.required, path: ['message'] });
});

interface MapPoint {
  lat: number;
  lng: number;
  label: string;
}

function osmEmbed({ lat, lng }: MapPoint, zoom = 16): string {
  const d = 0.35 / 2 ** (zoom - 10);
  const bbox = [lng - d * 1.6, lat - d, lng + d * 1.6, lat + d].map((n) => n.toFixed(5)).join(',');
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat.toFixed(5)},${lng.toFixed(5)}`;
}

function osmLink({ lat, lng }: MapPoint, zoom = 17): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=${zoom}/${lat}/${lng}`;
}

function ContactForm() {
  const { t } = useTranslation();
  const location = useLocation();
  const send = useContactMessage();
  const [mode, setMode] = useState<Mode>(location.hash === '#callback' ? 'callback' : 'contact');
  const [sent, setSent] = useState<Mode | null>(null);
  const form = useForm<ContactMessageFormInput>({
    resolver: zodResolver(messageSchema),
    defaultValues: { type: mode, name: '', phone: '', email: '', subject: '', message: '' },
  });

  useEffect(() => {
    if (location.hash === '#callback') setMode('callback');
  }, [location.hash]);

  useEffect(() => {
    form.setValue('type', mode);
    form.clearErrors();
  }, [mode, form]);

  const submit = form.handleSubmit(async (values) => {
    try {
      await send.mutateAsync(mode === 'callback' ? { type: 'callback', name: values.name, phone: values.phone } : { ...values, type: 'contact' });
      setSent(mode);
      form.reset({ type: mode, name: '', phone: '', email: '', subject: '', message: '' });
    } catch (error) {
      handleFormError(t, form, error);
    }
  });

  const tabs: Array<{ value: Mode; label: string; icon: typeof SendIcon }> = [
    { value: 'contact', label: t('shop:contact.formTitle'), icon: SendIcon },
    { value: 'callback', label: t('shop:contact.callbackTitle'), icon: PhoneCallIcon },
  ];

  return (
    <section id="callback" aria-labelledby="contact-form-title" className="flex scroll-mt-[calc(var(--header-offset)+1rem)] flex-col gap-5 rounded-xl border border-border bg-card p-5 sm:p-6">
      <h2 id="contact-form-title" className="sr-only">
        {mode === 'callback' ? t('shop:contact.callbackTitle') : t('shop:contact.formTitle')}
      </h2>
      <div className="grid grid-cols-2 gap-1 rounded-lg bg-muted p-1" role="group" aria-label={t('shop:contact.title')}>
        {tabs.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            type="button"
            aria-pressed={mode === value}
            onClick={() => {
              setMode(value);
              setSent(null);
            }}
            className={cn(
              'inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-2 py-1.5 text-center text-[13px] leading-tight font-semibold transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-ring sm:text-sm',
              mode === value ? 'bg-background text-foreground shadow-xs' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
      </div>
      {mode === 'callback' ? <p className="-mt-1 text-sm text-muted-foreground">{t('shop:contact.callbackText')}</p> : null}
      {sent === mode ? (
        <Alert variant="success">
          <AlertTitle>{mode === 'callback' ? t('shop:contact.callbackSent') : t('shop:contact.sent')}</AlertTitle>
          <AlertDescription>
            <Button variant="link" size="sm" className="h-auto px-0" onClick={() => setSent(null)}>
              {t('contacts.sendAnother')}
            </Button>
          </AlertDescription>
        </Alert>
      ) : (
        <Form {...form}>
          <form onSubmit={submit} noValidate className="flex flex-col gap-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextField control={form.control} name="name" label={t('shop:fields.name')} required autoComplete="name" maxLength={60} />
              <PhoneField control={form.control} name="phone" label={t('shop:fields.phone')} required />
            </div>
            {mode === 'contact' ? (
              <>
                <div className="grid gap-4 sm:grid-cols-2">
                  <TextField control={form.control} name="email" type="email" label={t('shop:fields.emailOptional')} autoComplete="email" autoCapitalize="none" spellCheck={false} maxLength={120} />
                  <TextField control={form.control} name="subject" label={t('shop:fields.subject')} maxLength={150} />
                </div>
                <TextareaField control={form.control} name="message" label={t('shop:fields.message')} required rows={5} maxLength={3000} />
              </>
            ) : null}
            <p className="text-xs text-muted-foreground">{t('contacts.privacyNote')}</p>
            <div>
              <Button type="submit" size="lg" loading={send.isPending} leftIcon={mode === 'callback' ? <PhoneCallIcon aria-hidden="true" /> : <SendIcon aria-hidden="true" />}>
                {mode === 'callback' ? t('shop:home.ctaButton') : t('common:actions.send')}
              </Button>
            </div>
          </form>
        </Form>
      )}
    </section>
  );
}

function PickupList({ points, active, onSelect }: { points: PickupPointDTO[]; active: string | null; onSelect: (p: PickupPointDTO) => void }) {
  const { t } = useTranslation();
  const f = useFormat();
  return (
    <ul className="grid gap-3 sm:grid-cols-2">
      {points.map((p) => (
        <li key={p.id}>
          <article className={cn('flex h-full flex-col gap-2 rounded-xl border bg-card p-4 transition-colors duration-150', active === p.id ? 'border-primary dark:border-brand' : 'border-border')}>
            <h3 className="font-bold">{p.name}</h3>
            <p className="flex gap-2 text-sm text-muted-foreground">
              <MapPinIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {p.address}
            </p>
            <p className="flex gap-2 text-sm text-muted-foreground">
              <ClockIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {p.workingHours}
            </p>
            <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-1">
              <a href={`tel:${p.phone}`} className="inline-flex items-center gap-1.5 text-sm font-semibold tabular-nums hover:text-primary dark:hover:text-brand">
                <PhoneIcon className="size-4" aria-hidden="true" />
                {f.phone(p.phone)}
              </a>
              <Button variant="ghost" size="sm" className="ms-auto" onClick={() => onSelect(p)} aria-pressed={active === p.id}>
                <MapPinIcon aria-hidden="true" />
                {t('contacts.showOnMap')}
              </Button>
            </div>
          </article>
        </li>
      ))}
    </ul>
  );
}

export default function ContactsPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const settings = useSettings();
  const points = usePickupPoints();
  const [selected, setSelected] = useState<{ id: string | null; point: MapPoint } | null>(null);
  useDocumentMeta({ title: t('shop:contact.title'), description: t('contacts.description') });

  const store = settings.data?.store;
  const social = settings.data?.social;
  const storePoint: MapPoint | null = store?.map ? { lat: store.map.lat, lng: store.map.lng, label: store.address } : null;
  const mapPoint = selected?.point ?? storePoint;

  const selectPoint = (p: PickupPointDTO) => {
    setSelected({ id: p.id, point: { lat: p.location.lat, lng: p.location.lng, label: `${p.name}, ${p.address}` } });
    document.getElementById('map')?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  };

  const socials = social
    ? ([
        ['telegram', social.telegram],
        ['instagram', social.instagram],
        ['facebook', social.facebook],
        ['youtube', social.youtube],
        ['tiktok', social.tiktok],
      ] as const).filter((s): s is readonly [typeof s[0], string] => !!s[1])
    : [];

  return (
    <div className="container-page flex flex-col gap-6 py-5 sm:py-6">
      <Crumbs items={[{ label: t('shop:contact.title') }]} />
      <PageTitle>{t('shop:contact.title')}</PageTitle>

      {settings.isError ? <ErrorState error={settings.error} onRetry={() => void settings.refetch()} /> : null}

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="flex flex-col gap-6">
          <section aria-labelledby="store-contacts" className="flex flex-col gap-4 rounded-xl border border-border bg-card p-5 sm:p-6">
            <h2 id="store-contacts" className="text-lg font-bold tracking-tight">
              {store?.name ?? <Skeleton className="h-6 w-40" />}
            </h2>
            {store ? (
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div className="flex flex-col gap-1">
                  <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t('common:labels.phone')}</dt>
                  <dd className="flex flex-col gap-0.5">
                    <a href={`tel:${store.phone}`} className="inline-flex min-h-7 items-center text-base font-bold tabular-nums hover:text-primary dark:hover:text-brand">
                      {f.phone(store.phone)}
                    </a>
                    {store.phoneSecondary ? (
                      <a href={`tel:${store.phoneSecondary}`} className="inline-flex min-h-6 items-center font-medium tabular-nums text-muted-foreground hover:text-foreground">
                        {f.phone(store.phoneSecondary)}
                      </a>
                    ) : null}
                  </dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t('common:labels.workingHours')}</dt>
                  <dd className="font-medium">{store.workingHours}</dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t('common:labels.email')}</dt>
                  <dd className="flex flex-col gap-0.5">
                    <a href={`mailto:${store.email}`} className="inline-flex min-h-6 items-center gap-1.5 font-medium break-all hover:text-primary dark:hover:text-brand">
                      <MailIcon className="size-4 shrink-0" aria-hidden="true" />
                      {store.email}
                    </a>
                    {store.supportEmail ? (
                      <a href={`mailto:${store.supportEmail}`} className="inline-flex min-h-6 items-center gap-1.5 break-all text-muted-foreground hover:text-foreground">
                        <MailIcon className="size-4 shrink-0" aria-hidden="true" />
                        {store.supportEmail}
                      </a>
                    ) : null}
                  </dd>
                </div>
                <div className="flex flex-col gap-1">
                  <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t('common:labels.address')}</dt>
                  <dd className="font-medium">{store.address}</dd>
                </div>
                {store.legalName ? (
                  <div className="flex flex-col gap-1 sm:col-span-2">
                    <dt className="sr-only">{t('contacts.legalName')}</dt>
                    <dd className="text-xs text-muted-foreground">{store.legalName}</dd>
                  </div>
                ) : null}
              </dl>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {Array.from({ length: 4 }, (_, i) => (
                  <Skeleton key={i} className="h-12" />
                ))}
              </div>
            )}
            {socials.length ? (
              <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
                <span className="me-1 text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t('shop:footer.followUs')}</span>
                {socials.map(([name, url]) => (
                  <a
                    key={name}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={SOCIAL_LABELS[name]}
                    className="flex size-10 items-center justify-center rounded-full border border-border text-muted-foreground transition-colors hover:border-foreground/30 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                  >
                    <SocialIcon network={name} className="size-[18px]" />
                  </a>
                ))}
              </div>
            ) : null}
          </section>
          <ContactForm />
        </div>

        <section id="map" aria-labelledby="map-title" className="flex scroll-mt-[calc(var(--header-offset)+1rem)] flex-col gap-3 lg:sticky lg:top-[calc(var(--header-offset)+1.5rem)]">
          <h2 id="map-title" className="sr-only">
            {t('shop:contact.map')}
          </h2>
          <div className="relative aspect-[4/3] overflow-hidden rounded-xl border border-border bg-muted lg:aspect-[5/4]">
            {/* visible while the map loads (or when the map provider is blocked) */}
            <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-6 text-center text-sm text-muted-foreground" aria-hidden="true">
              <MapPinIcon className="size-7 text-primary dark:text-brand" />
              <span className="max-w-xs">{mapPoint?.label}</span>
            </div>
            {mapPoint ? (
              <iframe
                key={`${mapPoint.lat},${mapPoint.lng}`}
                title={`${t('shop:contact.map')}: ${mapPoint.label}`}
                src={osmEmbed(mapPoint, store?.map?.zoom ?? 16)}
                loading="lazy"
                referrerPolicy="no-referrer"
                className="absolute inset-0 size-full border-0"
              />
            ) : (
              <Skeleton className="absolute inset-0 rounded-none" />
            )}
          </div>
          {mapPoint ? (
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
              <span className="flex min-w-0 items-center gap-2 text-muted-foreground">
                <MapPinIcon className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{mapPoint.label}</span>
              </span>
              <a href={osmLink(mapPoint)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 font-semibold hover:text-primary dark:hover:text-brand">
                {t('contacts.openMap')}
                <ExternalLinkIcon className="size-3.5" aria-hidden="true" />
              </a>
            </div>
          ) : null}
          {selected && storePoint ? (
            <Button variant="outline" size="sm" className="w-fit" onClick={() => setSelected(null)}>
              {t('contacts.showStore')}
            </Button>
          ) : null}
        </section>
      </div>

      <section aria-labelledby="pickup-title" className="flex flex-col gap-4 pt-2">
        <h2 id="pickup-title" className="text-xl font-bold tracking-tight sm:text-2xl">
          {t('shop:contact.pickupPoints')}
        </h2>
        {points.isPending ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {Array.from({ length: 4 }, (_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : points.isError ? (
          <ErrorState compact error={points.error} onRetry={() => void points.refetch()} />
        ) : (
          <PickupList points={points.data} active={selected?.id ?? null} onSelect={selectPoint} />
        )}
      </section>
    </div>
  );
}
