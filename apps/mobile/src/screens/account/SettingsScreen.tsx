import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useMe, useSession, useUpdatePreferences } from '@vero/api-client';
import { LANGUAGE_LABELS, LANGUAGES, THEMES, type Language, type ThemePreference } from '@vero/config';
import type { NotificationPreferences } from '@vero/types';
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { AppState, Linking, StyleSheet, View } from 'react-native';
import { APP_VERSION } from '../../config/env';
import { errorMessage } from '../../lib/i18n';
import { usePrefs } from '../../lib/prefs';
import {
  getPushPermission,
  hasRegisteredPushToken,
  pushUnavailableReason,
  registerPush,
  type PushPermission,
} from '../../lib/push';
import { toast } from '../../lib/toast';
import type { ProfileStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/theme';
import { Button, Card, Divider, ListRow, Notice, RadioCard, ScreenScroll, SwitchRow, Text } from '../../ui';
import { BellRing, Info, KeyRound, Monitor, Moon, Sun } from '../../ui/icons';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Settings'>;

const THEME_ICONS = { light: Sun, dark: Moon, system: Monitor } as const;

function PushSection() {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { isAuthenticated } = useSession();
  const unavailable = pushUnavailableReason();
  const [permission, setPermission] = useState<PushPermission>('undetermined');
  const [registered, setRegistered] = useState(false);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    setPermission(await getPushPermission());
    setRegistered(await hasRegisteredPushToken());
  }, []);

  useEffect(() => {
    void refresh();
    const sub = AppState.addEventListener('change', (s) => s === 'active' && void refresh());
    return () => sub.remove();
  }, [refresh]);

  const enable = async () => {
    setBusy(true);
    const res = await registerPush({ prompt: true });
    setBusy(false);
    await refresh();
    if (res.ok) toast.success(t('push.enabled'));
    else if (res.reason === 'denied') toast.warning(t('push.denied'));
    else if (res.reason === 'error') toast.error(t('common:status.error'));
  };

  return (
    <Card style={{ gap: 12 }}>
      <View style={styles.titleRow}>
        <BellRing size={18} color={colors.foreground} />
        <Text variant="headline">{t('shop:settings.channelPush')}</Text>
      </View>
      {unavailable ? (
        <Notice tone="neutral" icon={Info}>
          <Text variant="footnote">{t(`push.unavailable.${unavailable}`)}</Text>
        </Notice>
      ) : !isAuthenticated ? (
        <Text variant="footnote" color="mutedForeground">
          {t('push.signInFirst')}
        </Text>
      ) : permission === 'granted' && registered ? (
        <Notice tone="success">
          <Text variant="footnote">{t('push.active')}</Text>
        </Notice>
      ) : permission === 'denied' ? (
        <View style={{ gap: 10 }}>
          <Text variant="footnote" color="mutedForeground">
            {t('push.deniedHint')}
          </Text>
          <Button
            title={t('push.openSettings')}
            variant="outline"
            onPress={() => void Linking.openSettings()}
          />
        </View>
      ) : (
        <View style={{ gap: 10 }}>
          <Text variant="footnote" color="mutedForeground">
            {t('settings.pushHint')}
          </Text>
          <Button title={t('push.enable')} onPress={() => void enable()} loading={busy} />
        </View>
      )}
    </Card>
  );
}

/** Language, theme, notification preferences (saved to the account), push notifications, password. */
export function SettingsScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { isAuthenticated } = useSession();
  const me = useMe();
  const update = useUpdatePreferences();
  const language = usePrefs((s) => s.language);
  const theme = usePrefs((s) => s.theme);
  const setLanguage = usePrefs((s) => s.setLanguage);
  const setTheme = usePrefs((s) => s.setTheme);
  const prefs = me.data?.preferences.notifications;

  const saveRemote = (input: Parameters<typeof update.mutate>[0]) => {
    if (!isAuthenticated) return;
    update.mutate(input, { onError: (e) => toast.error(errorMessage(t, e)) });
  };

  const chooseLanguage = (l: Language) => {
    setLanguage(l);
    saveRemote({ language: l });
  };
  const chooseTheme = (th: ThemePreference) => {
    setTheme(th);
    saveRemote({ theme: th });
  };
  const toggle = (key: keyof NotificationPreferences, value: boolean) =>
    update.mutate(
      { notifications: { [key]: value } },
      {
        onSuccess: () => toast.success(t('shop:settings.saved')),
        onError: (e) => toast.error(errorMessage(t, e)),
      },
    );

  return (
    <ScreenScroll contentContainerStyle={{ gap: 16 }}>
      <Card style={{ gap: 10 }}>
        <Text variant="headline">{t('shop:settings.language')}</Text>
        <View
          style={{ gap: 8 }}
          accessibilityRole="radiogroup"
          accessibilityLabel={t('shop:settings.language')}
        >
          {LANGUAGES.map((l) => (
            <RadioCard
              key={l}
              selected={language === l}
              onPress={() => chooseLanguage(l)}
              title={LANGUAGE_LABELS[l].native}
              right={
                <Text variant="footnote" color="mutedForeground">
                  {LANGUAGE_LABELS[l].short}
                </Text>
              }
            />
          ))}
        </View>
      </Card>

      <Card style={{ gap: 10 }}>
        <Text variant="headline">{t('shop:settings.appearance')}</Text>
        <View style={{ gap: 8 }} accessibilityRole="radiogroup" accessibilityLabel={t('common:theme.label')}>
          {THEMES.map((th) => {
            const Icon = THEME_ICONS[th];
            return (
              <RadioCard
                key={th}
                selected={theme === th}
                onPress={() => chooseTheme(th)}
                icon={<Icon size={18} color="#8E8E98" />}
                title={t(`common:theme.${th}`)}
              />
            );
          })}
        </View>
      </Card>

      {isAuthenticated ? (
        <Card style={{ gap: 4 }}>
          <Text variant="headline">{t('shop:settings.notificationChannels')}</Text>
          <Text variant="footnote" color="mutedForeground">
            {t('settings.notificationsHint')}
          </Text>
          {prefs ? (
            <>
              <Text variant="overline" color="mutedForeground" uppercase style={{ marginTop: 10 }}>
                {t('settings.channels')}
              </Text>
              <SwitchRow
                label={t('shop:settings.channelPush')}
                description={t('settings.pushHint')}
                value={prefs.push}
                onChange={(v) => toggle('push', v)}
                disabled={update.isPending}
              />
              <Divider />
              <SwitchRow
                label={t('shop:settings.channelEmail')}
                description={me.data?.email ? undefined : t('settings.noEmail')}
                value={prefs.email}
                onChange={(v) => toggle('email', v)}
                disabled={update.isPending || !me.data?.email}
              />
              <Divider />
              <SwitchRow
                label={t('shop:settings.channelSms')}
                value={prefs.sms}
                onChange={(v) => toggle('sms', v)}
                disabled={update.isPending}
              />
              <Text variant="overline" color="mutedForeground" uppercase style={{ marginTop: 14 }}>
                {t('settings.topics')}
              </Text>
              <SwitchRow
                label={t('shop:settings.promotions')}
                value={prefs.promotions}
                onChange={(v) => toggle('promotions', v)}
                disabled={update.isPending}
              />
              <Divider />
              <SwitchRow
                label={t('shop:settings.priceDrops')}
                value={prefs.priceDrops}
                onChange={(v) => toggle('priceDrops', v)}
                disabled={update.isPending}
              />
              <Divider />
              <SwitchRow
                label={t('shop:settings.backInStock')}
                value={prefs.backInStock}
                onChange={(v) => toggle('backInStock', v)}
                disabled={update.isPending}
              />
            </>
          ) : null}
        </Card>
      ) : null}

      <PushSection />

      {isAuthenticated ? (
        <Card padded={false}>
          <ListRow
            icon={KeyRound}
            title={t('shop:account.changePassword')}
            onPress={() => navigation.navigate('ChangePassword')}
          />
        </Card>
      ) : null}

      <Text variant="caption" color="mutedForeground" align="center">
        OCKEAN · {t('settings.version', { version: APP_VERSION })}
      </Text>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
});
