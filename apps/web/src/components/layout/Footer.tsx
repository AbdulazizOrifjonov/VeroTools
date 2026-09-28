import { useCategories, useSettings } from '@vero/api-client';
import { STORE_ROUTES } from '@vero/config';
import { Logo, LogoWordmark, Skeleton } from '@vero/ui';
import { formatUzPhone } from '@vero/utils';
import { ClockIcon, MailIcon, MapPinIcon, PhoneIcon } from 'lucide-react';
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { LocaleLink } from '../../hooks/use-lang';
import { LanguageSwitcher } from './LanguageSwitcher';
import { INFO_LINKS, LEGAL_LINKS } from './links';
import { SOCIAL_LABELS, SocialIcon, type SocialNetwork } from './SocialIcon';

function FooterHeading({ children }: { children: ReactNode }) {
  return <h2 className="mb-4 text-sm font-bold tracking-tight text-foreground">{children}</h2>;
}

function FooterLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <li>
      <LocaleLink to={to} className="inline-flex min-h-8 items-center rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
        {children}
      </LocaleLink>
    </li>
  );
}

export function Footer() {
  const { t } = useTranslation();
  const settings = useSettings();
  const categories = useCategories();
  const s = settings.data;
  const year = new Date().getFullYear();
  const socials = s
    ? (Object.entries(s.social) as Array<[string, string | undefined]>).filter(
        (e): e is [SocialNetwork, string] => !!e[1] && e[0] in SOCIAL_LABELS,
      )
    : [];

  return (
    <footer className="mt-auto border-t border-border bg-surface">
      <div className="container-page grid gap-10 py-12 sm:grid-cols-2 lg:grid-cols-[1.35fr_1fr_1fr_1.25fr] lg:gap-12 lg:py-14">
        <div className="flex flex-col gap-4">
          <LocaleLink to="/" className="flex w-fit items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring">
            <Logo size={44} title={t('common:brand.name')} />
            <LogoWordmark height={22} className="text-foreground" aria-hidden="true" />
          </LocaleLink>
          {s ? (
            <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">{s.store.footerAbout ?? t('common:brand.tagline')}</p>
          ) : (
            <div className="flex max-w-sm flex-col gap-2">
              <Skeleton className="h-3.5 w-full" />
              <Skeleton className="h-3.5 w-5/6" />
              <Skeleton className="h-3.5 w-2/3" />
            </div>
          )}
          {socials.length ? (
            <div className="flex flex-col gap-2">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t('shop:footer.followUs')}</span>
              <ul className="flex flex-wrap gap-2">
                {socials.map(([network, url]) => (
                  <li key={network}>
                    <a
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      aria-label={SOCIAL_LABELS[network]}
                      className="flex size-10 items-center justify-center rounded-lg border border-border bg-surface-elevated text-muted-foreground transition-colors hover:border-foreground/25 hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring"
                    >
                      <SocialIcon network={network} className="size-[18px]" />
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>

        <nav aria-labelledby="footer-catalog">
          <FooterHeading>
            <span id="footer-catalog">{t('shop:footer.catalog')}</span>
          </FooterHeading>
          <ul className="flex flex-col gap-0.5">
            {(categories.data ?? []).slice(0, 8).map((c) => (
              <FooterLink key={c.id} to={STORE_ROUTES.category(c.slug)}>
                {c.name}
              </FooterLink>
            ))}
            <FooterLink to={STORE_ROUTES.catalog}>{t('common:nav.allCategories')}</FooterLink>
          </ul>
        </nav>

        <nav aria-labelledby="footer-customers">
          <FooterHeading>
            <span id="footer-customers">{t('shop:footer.customers')}</span>
          </FooterHeading>
          <ul className="flex flex-col gap-0.5">
            {INFO_LINKS.map((l) => (
              <FooterLink key={l.to} to={l.to}>
                {t(l.label)}
              </FooterLink>
            ))}
            <FooterLink to={STORE_ROUTES.promotions}>{t('common:nav.promotions')}</FooterLink>
            <FooterLink to={STORE_ROUTES.brands}>{t('common:nav.brands')}</FooterLink>
          </ul>
        </nav>

        <div>
          <FooterHeading>{t('shop:footer.contacts')}</FooterHeading>
          {s ? (
            <address className="flex flex-col gap-3 text-sm text-muted-foreground not-italic">
              <span className="flex gap-2.5">
                <MapPinIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{s.store.address}</span>
              </span>
              <span className="flex gap-2.5">
                <PhoneIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span className="flex flex-col gap-0.5">
                  <a href={`tel:${s.store.phone}`} className="inline-flex min-h-6 items-center font-semibold text-foreground tabular-nums hover:text-primary dark:hover:text-brand">
                    {formatUzPhone(s.store.phone)}
                  </a>
                  {s.store.phoneSecondary ? (
                    <a href={`tel:${s.store.phoneSecondary}`} className="inline-flex min-h-6 items-center tabular-nums hover:text-foreground">
                      {formatUzPhone(s.store.phoneSecondary)}
                    </a>
                  ) : null}
                </span>
              </span>
              <span className="flex gap-2.5">
                <MailIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span className="flex flex-col gap-0.5">
                  <a href={`mailto:${s.store.email}`} className="inline-flex min-h-6 items-center hover:text-foreground">
                    {s.store.email}
                  </a>
                  {s.store.supportEmail && s.store.supportEmail !== s.store.email ? (
                    <a href={`mailto:${s.store.supportEmail}`} className="inline-flex min-h-6 items-center hover:text-foreground">
                      {s.store.supportEmail}
                    </a>
                  ) : null}
                </span>
              </span>
              <span className="flex gap-2.5">
                <ClockIcon className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>{s.store.workingHours}</span>
              </span>
            </address>
          ) : (
            <div className="flex flex-col gap-3">
              {Array.from({ length: 4 }, (_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          )}
          {s?.paymentMethods.length ? (
            <div className="mt-6">
              <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{t('shop:footer.paymentMethods')}</span>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {s.paymentMethods.map((m) => (
                  <li key={m} className="rounded-md border border-border bg-surface-elevated px-2 py-1 text-xs font-semibold text-foreground">
                    {t(`common:paymentMethod.${m}`)}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>
      <div className="border-t border-border">
        <div className="container-page flex flex-col gap-3 py-5 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>
            {t('shop:footer.rights', { year })}
            {s?.store.legalName ? <span className="ms-1">{s.store.legalName}</span> : null}
          </p>
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
            {LEGAL_LINKS.map((l) => (
              <LocaleLink key={l.to} to={l.to} className="rounded-sm hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring">
                {t(l.label)}
              </LocaleLink>
            ))}
            <LanguageSwitcher compact />
          </div>
        </div>
      </div>
    </footer>
  );
}
