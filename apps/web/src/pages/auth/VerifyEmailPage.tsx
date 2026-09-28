import { isApiError, useSession } from '@vero/api-client';
import { STORE_ROUTES } from '@vero/config';
import { Button, Spinner, toast } from '@vero/ui';
import { MailCheckIcon, MailWarningIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router';
import { AuthShell } from '../../features/auth/AuthShell';
import { useRequestEmailVerification, useVerifyEmail } from '../../features/auth/hooks';
import { useDocumentMeta } from '../../hooks/use-document-meta';
import { LocaleLink } from '../../hooks/use-lang';
import { errorMessage } from '../../lib/i18n';
import { withQuery } from '../../lib/paths';

/** Tokens already submitted in this tab (a token is single-use; StrictMode / remounts must not resend it). */
const submitted = new Map<string, Promise<void>>();

type State = { kind: 'checking' } | { kind: 'done' } | { kind: 'error'; message: string };

export default function VerifyEmailPage() {
  const { t } = useTranslation();
  const session = useSession();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token')?.trim() ?? '';
  const verify = useVerifyEmail();
  const requestLink = useRequestEmailVerification();
  const [state, setState] = useState<State>(() => (token.length >= 20 ? { kind: 'checking' } : { kind: 'error', message: t('errors:TOKEN_INVALID') }));
  useDocumentMeta({ title: t('shop:account.verifyEmail'), noindex: true });
  const { mutateAsync } = verify;

  useEffect(() => {
    if (token.length < 20) return;
    let active = true;
    let request = submitted.get(token);
    if (!request) {
      request = mutateAsync(token);
      submitted.set(token, request);
    }
    request.then(
      () => active && setState({ kind: 'done' }),
      (error: unknown) => {
        if (!active) return;
        setState({ kind: 'error', message: errorMessage(t, error) });
      },
    );
    return () => {
      active = false;
    };
  }, [token, mutateAsync, t]);

  // a used link opened again by a customer whose e-mail is already verified
  const alreadyVerified = state.kind === 'error' && !!session.user?.isEmailVerified;
  const kind = alreadyVerified ? 'done' : state.kind;
  const canResend = session.isAuthenticated && !!session.user?.email && !session.user.isEmailVerified;

  const resend = async () => {
    try {
      await requestLink.mutateAsync();
      toast.success(t('shop:account.verificationSent'));
    } catch (error) {
      toast.error(errorMessage(t, error));
    }
  };

  return (
    <AuthShell title={t('shop:account.verifyEmail')} aside={false}>
      {kind === 'checking' ? (
        <div className="flex items-center gap-3 py-6 text-muted-foreground" role="status">
          <Spinner size="md" />
          <span>{t('auth.verifying')}</span>
        </div>
      ) : kind === 'done' ? (
        <div className="flex flex-col items-start gap-4" role="status">
          <span className="flex size-12 items-center justify-center rounded-full bg-success-soft text-success" aria-hidden="true">
            <MailCheckIcon className="size-6" />
          </span>
          <p className="text-base font-semibold">{t('shop:account.emailVerifiedDone')}</p>
          <div className="flex flex-wrap gap-2">
            {session.isAuthenticated ? (
              <Button asChild size="lg">
                <LocaleLink to={STORE_ROUTES.account}>{t('common:nav.account')}</LocaleLink>
              </Button>
            ) : (
              <Button asChild size="lg">
                <LocaleLink to={withQuery(STORE_ROUTES.login, { next: STORE_ROUTES.account })}>{t('common:nav.login')}</LocaleLink>
              </Button>
            )}
            <Button asChild size="lg" variant="outline">
              <LocaleLink to={STORE_ROUTES.catalog}>{t('common:actions.continueShopping')}</LocaleLink>
            </Button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col items-start gap-4" role="alert">
          <span className="flex size-12 items-center justify-center rounded-full bg-danger-soft text-danger" aria-hidden="true">
            <MailWarningIcon className="size-6" />
          </span>
          <p className="text-base font-semibold">{state.kind === 'error' ? state.message : ''}</p>
          {canResend ? (
            <Button size="lg" onClick={() => void resend()} loading={requestLink.isPending}>
              {t('auth.sendNewLink')}
            </Button>
          ) : !session.isAuthenticated ? (
            <>
              <p className="text-sm text-muted-foreground">{t('auth.signInToResend')}</p>
              <Button asChild size="lg">
                <LocaleLink to={withQuery(STORE_ROUTES.login, { next: STORE_ROUTES.account })}>{t('common:nav.login')}</LocaleLink>
              </Button>
            </>
          ) : (
            <Button asChild size="lg" variant="outline">
              <LocaleLink to={STORE_ROUTES.account}>{t('common:nav.account')}</LocaleLink>
            </Button>
          )}
        </div>
      )}
      {isApiError(verify.error) && verify.error.isNetwork ? (
        <Button variant="outline" onClick={() => window.location.reload()}>
          {t('common:actions.retry')}
        </Button>
      ) : null}
    </AuthShell>
  );
}
