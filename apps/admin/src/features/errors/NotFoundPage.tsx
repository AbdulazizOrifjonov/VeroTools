import { Button, EmptyState } from '@vero/ui';
import { CompassIcon, HouseIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { usePageMeta } from '../../components/common/page';

export default function NotFoundPage() {
  const { t } = useTranslation();
  usePageMeta(t('errorPage.notFoundTitle'));
  return (
    <div className="py-10">
      <EmptyState
        titleAs="h1"
        icon={<CompassIcon />}
        title={t('errorPage.notFoundTitle')}
        description={t('errorPage.notFoundText')}
        action={
          <Button variant="outline" asChild leftIcon={<HouseIcon />}>
            <Link to="/">{t('errorPage.toDashboard')}</Link>
          </Button>
        }
      />
    </div>
  );
}

/** Record-level 404 inside a detail page (deleted product, wrong link). */
export function ItemNotFound({ backTo, backLabel }: { backTo: string; backLabel?: string }) {
  const { t } = useTranslation();
  return (
    <div className="py-10">
      <EmptyState
        titleAs="h1"
        icon={<CompassIcon />}
        title={t('errorPage.itemNotFound')}
        description={t('errorPage.itemNotFoundText')}
        action={
          <Button variant="outline" asChild>
            <Link to={backTo}>{backLabel ?? t('errorPage.backToList')}</Link>
          </Button>
        }
      />
    </div>
  );
}
