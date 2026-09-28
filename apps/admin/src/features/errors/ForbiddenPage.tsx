import { Button, EmptyState } from '@vero/ui';
import { HouseIcon, ShieldAlertIcon } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';
import { usePageMeta } from '../../components/common/page';
import { permissionLabel } from '../../lib/permissions';

/** Shown when the role lacks the permission of the requested screen. */
export default function ForbiddenPage({ permission, noSections = false }: { permission: string; noSections?: boolean }) {
  const { t } = useTranslation();
  usePageMeta(t('errorPage.forbiddenTitle'));
  const labels = permission
    .split(',')
    .map((p) => permissionLabel(t, p.trim()))
    .join(', ');
  return (
    <div className="py-10">
      <EmptyState
        titleAs="h1"
        icon={<ShieldAlertIcon />}
        title={t('errorPage.forbiddenTitle')}
        description={noSections ? t('errorPage.noSections') : t('errorPage.forbiddenText', { permission: labels })}
        action={
          noSections ? undefined : (
            <Button variant="outline" asChild leftIcon={<HouseIcon />}>
              <Link to="/">{t('errorPage.toDashboard')}</Link>
            </Button>
          )
        }
      />
    </div>
  );
}
