import { forwardRef, useContext, type ReactNode } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type ScrollViewProps,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { HeaderHeightContext } from '@react-navigation/elements';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../theme/theme';

export interface ScreenProps {
  children: ReactNode;
  style?: StyleProp<ViewStyle>;
  /** add the bottom safe-area inset (screens without a tab bar) */
  bottomInset?: boolean;
  surface?: 'background' | 'surface';
}

/** Plain full-screen container with the themed background. */
export function Screen({ children, style, bottomInset = false, surface = 'background' }: ScreenProps) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.flex,
        { backgroundColor: colors[surface], paddingBottom: bottomInset ? insets.bottom : 0 },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export interface ScreenScrollProps extends ScrollViewProps {
  children: ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
  /** screens without a tab bar get extra bottom padding for the home indicator */
  bottomInset?: boolean;
  /** wrap in KeyboardAvoidingView (forms) */
  keyboard?: boolean;
  padded?: boolean;
  surface?: 'background' | 'surface';
}

/** Scrollable screen: pull-to-refresh, keyboard avoiding, safe-area aware bottom padding. */
export const ScreenScroll = forwardRef<ScrollView, ScreenScrollProps>(function ScreenScroll(
  {
    children,
    onRefresh,
    refreshing = false,
    bottomInset = false,
    keyboard = false,
    padded = true,
    surface = 'background',
    contentContainerStyle,
    style,
    ...rest
  },
  ref,
) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const headerHeight = useContext(HeaderHeightContext) ?? 0;
  const scroll = (
    <ScrollView
      ref={ref}
      style={[styles.flex, { backgroundColor: colors[surface] }, style]}
      contentContainerStyle={[
        padded ? styles.padded : null,
        { paddingBottom: (padded ? 24 : 0) + (bottomInset ? insets.bottom : 0) },
        contentContainerStyle,
      ]}
      keyboardShouldPersistTaps="handled"
      keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
      automaticallyAdjustKeyboardInsets={keyboard}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.link}
            colors={[colors.primary]}
            progressBackgroundColor={colors.card}
          />
        ) : undefined
      }
      {...rest}
    >
      {children}
    </ScrollView>
  );
  if (!keyboard || Platform.OS === 'ios') return scroll;
  return (
    <KeyboardAvoidingView
      behavior="padding"
      keyboardVerticalOffset={headerHeight}
      style={[styles.flex, { backgroundColor: colors[surface] }]}
    >
      {scroll}
    </KeyboardAvoidingView>
  );
});

/** Sticky bottom action bar (product page, cart, checkout). */
export function BottomBar({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  return (
    <View
      style={[
        styles.bottomBar,
        {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, 12),
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  padded: { padding: 16, gap: 16 },
  bottomBar: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
});
