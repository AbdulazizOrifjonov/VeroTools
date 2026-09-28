import { useQueryClient } from '@tanstack/react-query';
import { useApi, useSession } from '@vero/api-client';
import { LANGUAGES, LANGUAGE_LABELS, type Language } from '@vero/config';
import {
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  toast,
  Tooltip,
  TooltipContent,
  TooltipTrigger,
  useTheme,
  type ThemePreference,
} from '@vero/ui';
import { LanguagesIcon, LogOutIcon, MonitorIcon, MoonIcon, SunIcon, UserRoundIcon } from 'lucide-react';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { imageRefThumb } from '../../lib/images';
import { loadAdminLocale } from '../../lib/i18n';
import { setCurrentLanguage } from '../../lib/language';
import { roleName } from '../../lib/permissions';
import { useLiveStore } from '../../lib/realtime-store';
import { PersonAvatar } from '../common/PersonAvatar';

export function useChangeLanguage() {
  const { i18n } = useTranslation();
  const qc = useQueryClient();
  return async (lang: Language) => {
    await loadAdminLocale(lang);
    setCurrentLanguage(lang);
    await i18n.changeLanguage(lang);
    // report texts, region names and error messages come from the API in the chosen language
    void qc.invalidateQueries({ queryKey: ['admin'] });
  };
}

export function LanguageMenu() {
  const { t, i18n } = useTranslation();
  const change = useChangeLanguage();
  const current = (i18n.resolvedLanguage ?? i18n.language) as Language;
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-1.5 px-2 text-[13px] font-semibold" aria-label={`${t('shell.language')}: ${LANGUAGE_LABELS[current].native}`}>
              <LanguagesIcon className="size-4" aria-hidden="true" />
              {LANGUAGE_LABELS[current].short}
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>{t('shell.language')}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>{t('shell.language')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={current} onValueChange={(v) => void change(v as Language)}>
          {LANGUAGES.map((lang) => (
            <DropdownMenuRadioItem key={lang} value={lang} lang={lang}>
              {LANGUAGE_LABELS[lang].native}
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function ThemeMenu() {
  const { t } = useTranslation();
  const { preference, resolvedTheme, setPreference } = useTheme();
  const Icon = preference === 'system' ? MonitorIcon : resolvedTheme === 'dark' ? MoonIcon : SunIcon;
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon-sm" aria-label={`${t('shell.theme')}: ${t(`common:theme.${preference}`)}`}>
              <Icon className="size-4" />
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>{t('shell.theme')}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-44">
        <DropdownMenuLabel>{t('shell.theme')}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={preference} onValueChange={(v) => setPreference(v as ThemePreference)}>
          <DropdownMenuRadioItem value="light">
            <SunIcon aria-hidden="true" />
            {t('common:theme.light')}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="dark">
            <MoonIcon aria-hidden="true" />
            {t('common:theme.dark')}
          </DropdownMenuRadioItem>
          <DropdownMenuRadioItem value="system">
            <MonitorIcon aria-hidden="true" />
            {t('common:theme.system')}
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function UserMenu() {
  const { t } = useTranslation();
  const api = useApi();
  const qc = useQueryClient();
  const navigate = useNavigate();
  const { user } = useSession();
  const clearLive = useLiveStore((s) => s.clear);
  const [pending, setPending] = useState(false);
  if (!user) return null;
  const name = user.fullName || `${user.firstName} ${user.lastName}`.trim();

  const logout = async () => {
    setPending(true);
    try {
      await api.auth.logout();
    } catch {
      /* the local session is cleared anyway */
    } finally {
      setPending(false);
      qc.clear();
      clearLive();
      toast.success(t('auth.loggedOut'));
      void navigate('/login', { replace: true });
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-2 rounded-full p-0.5 transition-colors hover:bg-accent focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring sm:rounded-lg sm:py-1 sm:ps-1 sm:pe-2"
          aria-label={`${t('shell.account')}: ${name}`}
        >
          <PersonAvatar name={name} src={imageRefThumb(user.avatar)} size="sm" />
          <span className="hidden max-w-36 flex-col items-start leading-tight xl:flex">
            <span className="w-full truncate text-[13px] font-semibold text-foreground">{name}</span>
            <span className="w-full truncate text-[11px] text-muted-foreground">{roleName(t, user.role)}</span>
          </span>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <div className="flex flex-col gap-0.5 px-2.5 py-2">
          <span className="text-xs text-muted-foreground">{t('shell.signedInAs')}</span>
          <span className="truncate text-sm font-semibold">{name}</span>
          <span className="truncate text-xs text-muted-foreground">{user.email ?? user.phone}</span>
          <span className="mt-1 w-fit rounded-xs bg-brand-soft px-1.5 py-0.5 text-[11px] font-semibold text-brand-soft-foreground">{roleName(t, user.role)}</span>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={() => void navigate('/profile')}>
          <UserRoundIcon aria-hidden="true" />
          {t('nav.profile')}
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="destructive" disabled={pending} onSelect={() => void logout()}>
          <LogOutIcon aria-hidden="true" />
          {pending ? t('shell.loggingOut') : t('shell.logout')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
