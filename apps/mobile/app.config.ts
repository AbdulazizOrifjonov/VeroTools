import type { ConfigContext, ExpoConfig } from 'expo/config';

/**
 * VERO TOOLS customer app (Expo). Environment:
 *   EXPO_PUBLIC_API_URL   absolute API base, e.g. http://192.168.1.20:4000/api (LAN IP for a phone)
 *   EXPO_PUBLIC_WEB_URL   storefront origin used for share links / universal links (default https://verotools.uz)
 *   EAS_PROJECT_ID        EAS project id — required for Expo push tokens (push is skipped without it)
 */
const API_URL = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:4000/api';
const WEB_URL = (process.env.EXPO_PUBLIC_WEB_URL ?? 'https://verotools.uz').replace(/\/+$/, '');
const PROJECT_ID = process.env.EAS_PROJECT_ID ?? process.env.EXPO_PUBLIC_EAS_PROJECT_ID;

const BRAND = '#FD470E';
const LIGHT_BG = '#FFFFFF';
const DARK_BG = '#0E0E10';

function hostOf(url: string): string | null {
  try {
    return new URL(url).host;
  } catch {
    return null;
  }
}

export default ({ config }: ConfigContext): ExpoConfig => {
  const webHost = hostOf(WEB_URL);
  return {
    ...config,
    name: 'VERO TOOLS',
    slug: 'vero-tools',
    scheme: 'verotools',
    version: '1.0.0',
    orientation: 'portrait',
    icon: './assets/icon.png',
    userInterfaceStyle: 'automatic',
    backgroundColor: LIGHT_BG,
    primaryColor: BRAND,
    ios: {
      bundleIdentifier: 'uz.verotools.app',
      buildNumber: '1',
      supportsTablet: true,
      config: { usesNonExemptEncryption: false },
      associatedDomains: webHost ? [`applinks:${webHost}`] : undefined,
      infoPlist: {
        LSApplicationQueriesSchemes: ['tg', 'tel', 'comgooglemaps', 'yandexmaps'],
      },
    },
    android: {
      package: 'uz.verotools.app',
      versionCode: 1,
      adaptiveIcon: {
        foregroundImage: './assets/adaptive-icon.png',
        monochromeImage: './assets/adaptive-icon-monochrome.png',
        backgroundColor: BRAND,
      },
      predictiveBackGestureEnabled: false,
      softwareKeyboardLayoutMode: 'resize',
      permissions: ['android.permission.POST_NOTIFICATIONS'],
      intentFilters: webHost
        ? [
            {
              action: 'VIEW',
              autoVerify: true,
              data: [
                { scheme: 'https', host: webHost, pathPrefix: '/product' },
                { scheme: 'https', host: webHost, pathPrefix: '/catalog' },
                { scheme: 'https', host: webHost, pathPrefix: '/account' },
                { scheme: 'https', host: webHost, pathPrefix: '/promotions' },
                { scheme: 'https', host: webHost, pathPrefix: '/brands' },
              ],
              category: ['BROWSABLE', 'DEFAULT'],
            },
          ]
        : undefined,
    },
    web: {
      bundler: 'metro',
      output: 'single',
      favicon: './assets/favicon.png',
      name: 'VERO TOOLS',
      shortName: 'VERO TOOLS',
      themeColor: BRAND,
      backgroundColor: LIGHT_BG,
    },
    plugins: [
      [
        'expo-splash-screen',
        {
          image: './assets/splash-icon.png',
          imageWidth: 180,
          resizeMode: 'contain',
          backgroundColor: LIGHT_BG,
          dark: { image: './assets/splash-icon.png', backgroundColor: DARK_BG },
        },
      ],
      'expo-font',
      'expo-system-ui',
      'expo-localization',
      ['expo-secure-store', { faceIDPermission: false }],
      [
        'expo-notifications',
        {
          icon: './assets/notification-icon.png',
          color: BRAND,
          defaultChannel: 'default',
        },
      ],
      [
        'expo-image-picker',
        {
          photosPermission:
            'VERO TOOLS uses your photo library so you can add photos to product reviews and set a profile picture.',
          cameraPermission:
            'VERO TOOLS uses the camera so you can take photos for product reviews and your profile picture.',
          microphonePermission: false,
        },
      ],
      'expo-web-browser',
    ],
    experiments: { typedRoutes: false },
    extra: {
      apiUrl: API_URL,
      webUrl: WEB_URL,
      ...(PROJECT_ID ? { eas: { projectId: PROJECT_ID } } : {}),
    },
  };
};
