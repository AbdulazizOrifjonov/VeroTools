import { useSession, useUpdatePreferences } from '@vero/api-client';
import { LANGUAGE_LABELS, LANGUAGES, type Language } from '@vero/config';
import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from '@vero/ui';
import { CheckIcon, ChevronDownIcon, GlobeIcon } from 'lucide-react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router';
import { useLang } from '../../hooks/use-lang';
import { storeLanguage } from '../../lib/language';
import { switchLanguagePath } from '../../lib/paths';

/** Switches the URL prefix (keeps the page), persists the choice and syncs it to the account. */
export function useSwitchLanguage() {
  const navigate = useNavigate();
  const location = useLocation();
  const current = useLang();
  const { isAuthenticated, user } = useSession();
  const updatePreferences = useUpdatePreferences();
  return useCallback(
    (lang: Language) => {
      storeLanguage(lang);
      if (isAuthenticated && user?.preferences.language !== lang) updatePreferences.mutate({ language: lang });
      if (lang !== current) void navigate(switchLanguagePath(location, lang), { preventScrollReset: true });
    },
    [navigate, location, current, isAuthenticated, user?.preferences.language, updatePreferences],
  );
}

export function LanguageSwitcher({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { t } = useTranslation();
  const lang = useLang();
  const switchTo = useSwitchLanguage();
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? 'xs' : 'sm'}
          className={cn('gap-1.5 font-semibold text-muted-foreground hover:text-foreground', className)}
          aria-label={`${t('common:a11y.changeLanguage')}: ${LANGUAGE_LABELS[lang].native}`}
        >
          <GlobeIcon aria-hidden="true" />
          <span>{LANGUAGE_LABELS[lang].short}</span>
          <ChevronDownIcon className="size-3.5 opacity-70" aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuLabel>{t('common:language.label')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={lang} onValueChange={(v) => switchTo(v as Language)}>
          {LANGUAGES.map((l) => (
            <DropdownMenuRadioItem key={l} value={l} lang={l}>
              <span className="flex-1">{LANGUAGE_LABELS[l].native}</span>
              <span className="text-xs text-muted-foreground">{LANGUAGE_LABELS[l].short}</span>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Inline segmented language buttons (mobile menu, footer, account settings). */
export function LanguageButtons({ className }: { className?: string }) {
  const { t } = useTranslation();
  const lang = useLang();
  const switchTo = useSwitchLanguage();
  return (
    <div role="group" aria-label={t('common:language.label')} className={cn('flex flex-wrap gap-2', className)}>
      {LANGUAGES.map((l) => (
        <button
          key={l}
          type="button"
          lang={l}
          aria-pressed={l === lang}
          onClick={() => switchTo(l)}
          className={cn(
            'inline-flex h-9 items-center gap-1.5 rounded-md border px-3 text-sm font-semibold transition-colors duration-150',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            l === lang ? 'border-primary bg-brand-soft text-brand-soft-foreground' : 'border-input bg-surface-elevated text-foreground hover:bg-accent',
          )}
        >
          {l === lang ? <CheckIcon className="size-3.5" aria-hidden="true" /> : null}
          {LANGUAGE_LABELS[l].native}
        </button>
      ))}
    </div>
  );
}
