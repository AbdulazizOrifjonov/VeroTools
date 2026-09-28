import { useNetInfo } from '@react-native-community/netinfo';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import Animated, { FadeInUp, FadeOutUp, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../ui/Text';
import { WifiOff } from '../ui/icons';

/** "No internet connection" pill under the status bar while the device is offline. */
export function OfflineBanner() {
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const net = useNetInfo();
  const offline = net.isConnected === false || net.isInternetReachable === false;
  if (!offline) return null;
  return (
    <View pointerEvents="none" style={[styles.host, { top: insets.top + 4 }]}>
      <Animated.View
        entering={FadeInUp.duration(160).reduceMotion(ReduceMotion.System)}
        exiting={FadeOutUp.duration(160).reduceMotion(ReduceMotion.System)}
        style={styles.pill}
        accessibilityRole="alert"
        accessibilityLiveRegion="assertive"
      >
        <WifiOff size={14} color="#FFFFFF" />
        <Text variant="footnote" weight="bold" style={styles.text}>
          {t('common:status.offline')}
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  host: { position: 'absolute', left: 0, right: 0, alignItems: 'center', zIndex: 999, elevation: 999 },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: '#B91C1C',
  },
  text: { color: '#FFFFFF' },
});
