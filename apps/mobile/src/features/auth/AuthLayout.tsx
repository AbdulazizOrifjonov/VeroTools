import { useNavigation } from '@react-navigation/native';
import { useLayoutEffect, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { IconButton, Logo, ScreenScroll, Text } from '../../ui';
import { X } from '../../ui/icons';

/** Shared frame of the sign-in / sign-up / password screens (modal, keyboard aware). */
export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  useLayoutEffect(() => {
    navigation.setOptions({
      title: '',
      headerLeft: () => null,
      headerRight: () => (
        <IconButton
          icon={X}
          label={t('common:actions.close')}
          size={40}
          onPress={() => navigation.goBack()}
        />
      ),
    });
  }, [navigation, t]);
  return (
    <ScreenScroll keyboard bottomInset contentContainerStyle={styles.content}>
      <View style={styles.head}>
        <Logo size={56} />
        <Text variant="title1" align="center" accessibilityRole="header">
          {title}
        </Text>
        {subtitle ? (
          <Text variant="callout" color="mutedForeground" align="center">
            {subtitle}
          </Text>
        ) : null}
      </View>
      <View style={styles.body}>{children}</View>
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 24,
    maxWidth: 520,
    width: '100%',
    alignSelf: 'center',
  },
  head: { alignItems: 'center', gap: 10 },
  body: { gap: 16 },
  footer: { gap: 12, alignItems: 'center' },
});
