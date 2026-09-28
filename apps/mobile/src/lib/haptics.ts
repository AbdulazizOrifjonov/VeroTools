import * as Haptics from 'expo-haptics';
import { Platform } from 'react-native';

const enabled = Platform.OS === 'ios' || Platform.OS === 'android';

/** Subtle haptic feedback (no-op on the web preview). */
export const haptic = {
  light: () => {
    if (enabled) void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
  },
  selection: () => {
    if (enabled) void Haptics.selectionAsync().catch(() => undefined);
  },
  success: () => {
    if (enabled)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => undefined);
  },
  warning: () => {
    if (enabled)
      void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => undefined);
  },
};
