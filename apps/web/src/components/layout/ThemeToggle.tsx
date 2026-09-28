import { useSession, useUpdatePreferences } from '@vero/api-client';
import type { ThemePreference } from '@vero/config';
import {
  Button,
  cn,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
  useTheme,
} from '@vero/ui';
import { MonitorIcon, MoonIcon, SunIcon } from 'lucide-react';
import { useCallback } from 'react';
import { useTranslation } from 'react-i18next';

const OPTIONS: Array<{ value: ThemePreference; icon: typeof SunIcon }> = [
  { value: 'light', icon: SunIcon },
  { value: 'dark', icon: MoonIcon },
  { value: 'system', icon: MonitorIcon },
];

/** Applies the theme locally and remembers it on the account (same look on every device). */
export function useSetTheme() {
  const { setPreference } = useTheme();
  const { isAuthenticated, user } = useSession();
  const update = useUpdatePreferences();
  return useCallback(
    (theme: ThemePreference) => {
      setPreference(theme);
      if (isAuthenticated && user?.preferences.theme !== theme) update.mutate({ theme });
    },
    [setPreference, isAuthenticated, user?.preferences.theme, update],
  );
}

export function ThemeToggle({ className, compact = false }: { className?: string; compact?: boolean }) {
  const { t } = useTranslation();
  const { preference, resolvedTheme } = useTheme();
  const setTheme = useSetTheme();
  const Icon = resolvedTheme === 'dark' ? MoonIcon : SunIcon;
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size={compact ? 'icon-sm' : 'icon'}
          className={cn('text-muted-foreground hover:text-foreground', className)}
          aria-label={`${t('common:a11y.toggleTheme')}: ${t(`common:theme.${preference}`)}`}
        >
          <Icon aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-44">
        <DropdownMenuLabel>{t('common:theme.label')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={preference} onValueChange={(v) => setTheme(v as ThemePreference)}>
          {OPTIONS.map(({ value, icon: OptionIcon }) => (
            <DropdownMenuRadioItem key={value} value={value}>
              <OptionIcon aria-hidden="true" />
              {t(`common:theme.${value}`)}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/** Segmented theme buttons (mobile menu, account settings). */
export function ThemeButtons({ className }: { className?: string }) {
  const { t } = useTranslation();
  const { preference } = useTheme();
  const setTheme = useSetTheme();
  return (
    <div role="group" aria-label={t('common:theme.label')} className={cn('flex flex-wrap gap-2', className)}>
      {OPTIONS.map(({ value, icon: OptionIcon }) => (
        <button
          key={value}
          type="button"
          aria-pressed={preference === value}
          onClick={() => setTheme(value)}
          className={cn(
            'inline-flex h-9 items-center gap-2 rounded-md border px-3 text-sm font-semibold transition-colors duration-150',
            'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
            preference === value
              ? 'border-primary bg-brand-soft text-brand-soft-foreground'
              : 'border-input bg-surface-elevated text-foreground hover:bg-accent',
          )}
        >
          <OptionIcon className="size-4" aria-hidden="true" />
          {t(`common:theme.${value}`)}
        </button>
      ))}
    </div>
  );
}
