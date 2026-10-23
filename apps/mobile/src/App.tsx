import {
  DarkTheme,
  DefaultTheme,
  NavigationContainer,
  type Theme as NavTheme,
} from '@react-navigation/native';
import { ApiProvider } from '@vero/api-client';
import { STORAGE_KEYS } from '@vero/config';
import { QueryClientProvider } from '@tanstack/react-query';
import { useFonts } from 'expo-font';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import { I18nextProvider } from 'react-i18next';
import { StyleSheet } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppEffects } from './core/AppEffects';
import { OfflineBanner } from './core/OfflineBanner';
import { api } from './lib/api';
import { i18n } from './lib/i18n';
import { usePrefs } from './lib/prefs';
import { queryClient, wireQueryEnvironment } from './lib/query';
import { useRecentlyViewed, useRecentSearches } from './lib/recent';
import { secure } from './lib/storage';
import { linking } from './navigation/linking';
import { flushNavigationQueue, navigationRef } from './navigation/ref';
import { RootNavigator } from './navigation/RootNavigator';
import { FONT_ASSETS, fonts } from './theme/fonts';
import { ThemeProvider, useTheme } from './theme/theme';
import { ToastHost } from './ui/Toast';

void SplashScreen.preventAutoHideAsync().catch(() => undefined);
try {
  SplashScreen.setOptions({ duration: 220, fade: true });
} catch {
  /* not supported on this platform */
}
// configureNotificationHandler();

/** Restores preferences, local lists and the session (refresh token → access token) behind the splash screen. */
async function prepare(): Promise<void> {
  await usePrefs.getState().hydrate();
  await Promise.all([useRecentSearches.getState().hydrate(), useRecentlyViewed.getState().hydrate()]);
  const hasToken = !!(await secure.get(STORAGE_KEYS.refreshToken));
  const bootstrap = api.client.bootstrap();
  // never keep the splash longer than a few seconds on a slow network — hooks wait for the session anyway
  await Promise.race([bootstrap, new Promise((resolve) => setTimeout(resolve, hasToken ? 6000 : 3000))]);
}

function Navigation() {
  const { colors, dark } = useTheme();
  const navTheme = useMemo<NavTheme>(() => {
    const base = dark ? DarkTheme : DefaultTheme;
    return {
      ...base,
      dark,
      colors: {
        ...base.colors,
        primary: colors.link,
        background: colors.background,
        card: colors.background,
        text: colors.foreground,
        border: colors.border,
        notification: colors.primary,
      },
      fonts: {
        regular: { fontFamily: fonts.regular, fontWeight: '400' },
        medium: { fontFamily: fonts.medium, fontWeight: '500' },
        bold: { fontFamily: fonts.bold, fontWeight: '700' },
        heavy: { fontFamily: fonts.extrabold, fontWeight: '800' },
      },
    };
  }, [colors, dark]);

  return (
    <NavigationContainer
      ref={navigationRef}
      theme={navTheme}
      linking={linking}
      onReady={flushNavigationQueue}
      documentTitle={{
        formatter: (options) => (options?.title ? `${options.title} · VERO TOOLS` : 'VERO TOOLS'),
      }}
    >
      <StatusBar style={dark ? 'light' : 'dark'} />
      <RootNavigator />
      <AppEffects />
    </NavigationContainer>
  );
}

function Providers() {
  const language = usePrefs((s) => s.language);
  return (
    <ApiProvider api={api} language={language}>
      <ThemeProvider>
        <Navigation />
        <OfflineBanner />
        <ToastHost />
      </ThemeProvider>
    </ApiProvider>
  );
}

export default function App() {
  const [fontsLoaded, fontError] = useFonts(FONT_ASSETS);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unwire = wireQueryEnvironment();
    let active = true;
    prepare()
      .catch(() => undefined)
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
      unwire();
    };
  }, []);

  const loaded = ready && (fontsLoaded || !!fontError);
  useEffect(() => {
    if (loaded) void SplashScreen.hideAsync().catch(() => undefined);
  }, [loaded]);

  if (!loaded) return null;

  return (
    <GestureHandlerRootView style={styles.flex}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <I18nextProvider i18n={i18n}>
            <Providers />
          </I18nextProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({ flex: { flex: 1 } });
