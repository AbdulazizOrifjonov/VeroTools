import { usePromotions } from '@vero/api-client';
import { STORE_ROUTES } from '@vero/config';
import { Button, EmptyState, Skeleton } from '@vero/ui';
import { BadgePercentIcon } from 'lucide-react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { Crumbs } from '../components/common/Crumbs';
import { PageTitle, Section } from '../components/common/Section';
import { ErrorState } from '../components/common/states';
import { PromotionCard } from '../components/marketing/PromotionCard';
import { useDocumentMeta } from '../hooks/use-document-meta';
import { LocaleLink } from '../hooks/use-lang';

export default function PromotionsPage() {
  const { t } = useTranslation();
  const promotions = usePromotions();
  useDocumentMeta({ title: t('shop:promotions.title'), description: t('promotions.description') });

  const { active, upcoming } = useMemo(() => {
    const now = Date.now();
    const list = promotions.data ?? [];
    return {
      active: list.filter((p) => new Date(p.startsAt).getTime() <= now && new Date(p.endsAt).getTime() > now).sort((a, b) => +new Date(a.endsAt) - +new Date(b.endsAt)),
      upcoming: list.filter((p) => new Date(p.startsAt).getTime() > now).sort((a, b) => +new Date(a.startsAt) - +new Date(b.startsAt)),
    };
  }, [promotions.data]);

  return (
    <div className="container-page flex flex-col gap-2 py-5 sm:py-6">
      <Crumbs items={[{ label: t('shop:promotions.title') }]} />
      <div className="flex flex-col gap-2 pt-3">
        <PageTitle>{t('shop:promotions.title')}</PageTitle>
        <p className="max-w-2xl text-sm text-muted-foreground">{t('promotions.description')}</p>
      </div>
      {promotions.isPending ? (
        <div className="grid gap-4 py-6 sm:grid-cols-2 lg:grid-cols-3" aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className="aspect-[4/3] rounded-lg" />
          ))}
        </div>
      ) : promotions.isError ? (
        <ErrorState error={promotions.error} onRetry={() => void promotions.refetch()} />
      ) : !active.length && !upcoming.length ? (
        <EmptyState
          icon={<BadgePercentIcon />}
          title={t('shop:promotions.empty')}
          action={
            <Button asChild size="lg">
              <LocaleLink to={STORE_ROUTES.catalog}>{t('common:nav.catalog')}</LocaleLink>
            </Button>
          }
        />
      ) : (
        <>
          {active.length ? (
            <Section title={t('shop:promotions.active')} id="active">
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {active.map((p) => (
                  <li key={p.id} className="flex">
                    <PromotionCard promotion={p} className="w-full" />
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
          {upcoming.length ? (
            <Section title={t('shop:promotions.upcoming')} id="upcoming">
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {upcoming.map((p) => (
                  <li key={p.id} className="flex">
                    <PromotionCard promotion={p} className="w-full" />
                  </li>
                ))}
              </ul>
            </Section>
          ) : null}
        </>
      )}
    </div>
  );
}
