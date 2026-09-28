import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator, cn } from '@vero/ui';
import { Fragment } from 'react';
import { useTranslation } from 'react-i18next';
import { LocaleLink } from '../../hooks/use-lang';

export interface Crumb {
  label: string;
  to?: string;
}

/** Breadcrumbs starting at "Home"; the last item is the current page. */
export function Crumbs({ items, className }: { items: Crumb[]; className?: string }) {
  const { t } = useTranslation();
  const all: Crumb[] = [{ label: t('common:nav.home'), to: '/' }, ...items];
  return (
    <Breadcrumb aria-label={t('common:a11y.breadcrumbs')} className={cn('min-w-0', className)}>
      <BreadcrumbList>
        {all.map((c, i) => {
          const last = i === all.length - 1;
          return (
            <Fragment key={`${c.label}-${i}`}>
              <BreadcrumbItem className={cn(last && 'min-w-0')}>
                {last || !c.to ? (
                  <BreadcrumbPage className="max-w-[70vw] sm:max-w-md">{c.label}</BreadcrumbPage>
                ) : (
                  <BreadcrumbLink asChild>
                    <LocaleLink to={c.to}>{c.label}</LocaleLink>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
              {!last ? <BreadcrumbSeparator /> : null}
            </Fragment>
          );
        })}
      </BreadcrumbList>
    </Breadcrumb>
  );
}
