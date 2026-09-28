import { useFaq, useSettings } from '@vero/api-client';
import { STORE_ROUTES } from '@vero/config';
import type { FaqDTO } from '@vero/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger, Button, cn, EmptyState, Input, Skeleton } from '@vero/ui';
import { MessageCircleQuestionIcon, PhoneIcon, SearchIcon } from 'lucide-react';
import { useEffect, useId, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation } from 'react-router';
import { Crumbs } from '../components/common/Crumbs';
import { Markdown } from '../components/common/Markdown';
import { PageTitle } from '../components/common/Section';
import { ErrorState } from '../components/common/states';
import { useDocumentMeta } from '../hooks/use-document-meta';
import { useFormat } from '../hooks/use-format';
import { LocaleLink } from '../hooks/use-lang';

const ORDER: FaqDTO['category'][] = ['orders', 'delivery', 'payment', 'warranty', 'account', 'general'];

export default function FaqPage() {
  const { t } = useTranslation();
  const f = useFormat();
  const faq = useFaq();
  const settings = useSettings();
  const location = useLocation();
  const searchId = useId();
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<FaqDTO['category'] | null>(null);
  const [open, setOpen] = useState<string[]>([]);
  useDocumentMeta({ title: t('shop:faq.title'), description: t('faq.description') });

  // "/faq#<id>" opens that answer
  useEffect(() => {
    const id = location.hash.slice(1);
    if (id && faq.data?.some((q) => q.id === id)) {
      setOpen((o) => (o.includes(id) ? o : [...o, id]));
      requestAnimationFrame(() => document.getElementById(`faq-${id}`)?.scrollIntoView({ block: 'center' }));
    }
  }, [location.hash, faq.data]);

  const q = query.trim().toLocaleLowerCase();
  const groups = useMemo(() => {
    const items = (faq.data ?? []).filter(
      (x) => (!category || x.category === category) && (!q || x.question.toLocaleLowerCase().includes(q) || x.answer.toLocaleLowerCase().includes(q)),
    );
    return ORDER.map((c) => ({ category: c, items: items.filter((x) => x.category === c) })).filter((g) => g.items.length);
  }, [faq.data, category, q]);
  const categories = useMemo(() => ORDER.filter((c) => faq.data?.some((x) => x.category === c)), [faq.data]);
  const phone = settings.data?.store.phone;

  return (
    <div className="container-page flex flex-col gap-5 py-5 sm:py-6">
      <Crumbs items={[{ label: t('shop:faq.title') }]} />
      <div className="flex flex-col gap-2">
        <PageTitle>{t('shop:faq.title')}</PageTitle>
        <p className="max-w-2xl text-sm text-muted-foreground">{t('faq.description')}</p>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-10">
        <div className="flex min-w-0 flex-col gap-5">
          <div className="flex flex-col gap-3">
            <div className="relative">
              <label htmlFor={searchId} className="sr-only">
                {t('common:actions.search')}
              </label>
              <SearchIcon className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
              <Input id={searchId} type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={t('faq.searchPlaceholder')} className="ps-9" inputSize="lg" />
            </div>
            {categories.length > 1 ? (
              <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0" role="group" aria-label={t('common:product.category')}>
                <div className="flex w-max gap-2">
                  {[null, ...categories].map((c) => (
                    <button
                      key={c ?? 'all'}
                      type="button"
                      aria-pressed={category === c}
                      onClick={() => setCategory(c)}
                      className={cn(
                        'h-9 rounded-full border px-4 text-sm font-semibold whitespace-nowrap transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                        category === c ? 'border-primary bg-brand-soft text-brand-soft-foreground' : 'border-border bg-card hover:bg-accent',
                      )}
                    >
                      {c ? t(`shop:faq.category.${c}`) : t('common:labels.all')}
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {faq.isPending ? (
            <div className="flex flex-col gap-3" aria-busy="true">
              {Array.from({ length: 6 }, (_, i) => (
                <Skeleton key={i} className="h-14 w-full rounded-lg" />
              ))}
            </div>
          ) : faq.isError ? (
            <ErrorState error={faq.error} onRetry={() => void faq.refetch()} />
          ) : !groups.length ? (
            <EmptyState bordered icon={<MessageCircleQuestionIcon />} title={t('common:status.noResults')} />
          ) : (
            <Accordion type="multiple" value={open} onValueChange={setOpen} className="flex flex-col gap-6">
              {groups.map((g) => (
                <section key={g.category} aria-labelledby={`faq-cat-${g.category}`} className="flex flex-col">
                  <h2 id={`faq-cat-${g.category}`} className="mb-1 text-lg font-bold tracking-tight">
                    {t(`shop:faq.category.${g.category}`)}
                  </h2>
                  {g.items.map((item) => (
                    <AccordionItem key={item.id} value={item.id} id={`faq-${item.id}`} className="scroll-mt-[calc(var(--header-offset)+1rem)]">
                      <AccordionTrigger className="text-start">{item.question}</AccordionTrigger>
                      <AccordionContent>
                        <Markdown className="text-sm text-muted-foreground">{item.answer}</Markdown>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </section>
              ))}
            </Accordion>
          )}
        </div>

        <aside className="flex flex-col gap-3 rounded-xl border border-border bg-card p-5 lg:sticky lg:top-[calc(var(--header-offset)+1.5rem)]">
          <span className="flex size-11 items-center justify-center rounded-full bg-brand-soft text-primary dark:text-brand" aria-hidden="true">
            <MessageCircleQuestionIcon className="size-5" />
          </span>
          <h2 className="text-lg font-bold tracking-tight">{t('shop:faq.stillQuestions')}</h2>
          <p className="text-sm text-muted-foreground">{t('faq.contactHint')}</p>
          <div className="flex flex-col gap-2 pt-1">
            {phone ? (
              <Button asChild variant="outline" leftIcon={<PhoneIcon aria-hidden="true" />}>
                <a href={`tel:${phone}`} className="tabular-nums">
                  {f.phone(phone)}
                </a>
              </Button>
            ) : null}
            <Button asChild>
              <LocaleLink to={STORE_ROUTES.contacts}>{t('shop:faq.contactUs')}</LocaleLink>
            </Button>
          </div>
        </aside>
      </div>
    </div>
  );
}
