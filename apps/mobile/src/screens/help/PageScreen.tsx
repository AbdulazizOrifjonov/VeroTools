import { useNavigation, useRoute, type RouteProp } from '@react-navigation/native';
import { usePage } from '@vero/api-client';
import { useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import { isNotFound } from '../../lib/errors';
import { useFormat } from '../../lib/format';
import { openHref } from '../../lib/links';
import type { RootStackParamList } from '../../navigation/types';
import { Button, EmptyState, ErrorState, Markdown, ScreenScroll, Skeleton, Text } from '../../ui';
import { FileText } from '../../ui/icons';

/** Content page from the admin panel (about, delivery, warranty, returns, payment, privacy, terms). */
export function PageScreen() {
  const { t } = useTranslation();
  const f = useFormat();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<RootStackParamList, 'Page'>>();
  const page = usePage(route.params.slug);
  const [refreshing, setRefreshing] = useState(false);

  useLayoutEffect(() => {
    if (page.data?.title) navigation.setOptions({ title: page.data.title });
  }, [navigation, page.data?.title]);

  if (page.isPending) {
    return (
      <View style={{ padding: 16, gap: 12 }}>
        <Skeleton height={26} width="60%" />
        {Array.from({ length: 8 }, (_, i) => (
          <Skeleton key={i} height={14} width={i % 3 === 2 ? '70%' : '100%'} />
        ))}
      </View>
    );
  }
  if (page.isError || !page.data) {
    return isNotFound(page.error) ? (
      <EmptyState
        icon={FileText}
        title={t('shop:notFound.title')}
        description={t('shop:notFound.text')}
        action={
          <Button
            title={t('common:actions.goHome')}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onPress={() => (navigation as any).navigate('Tabs', { screen: 'HomeTab' }, { pop: true })}
          />
        }
      />
    ) : (
      <ErrorState error={page.error} onRetry={() => void page.refetch()} retrying={page.isFetching} />
    );
  }

  // internal links (/contact, /delivery, /catalog/…) open inside the app
  const onLink = (href: string) =>
    openHref(href, (target) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigation as any).navigate(target.name, target.params);
    });

  return (
    <ScreenScroll
      bottomInset
      onRefresh={async () => {
        setRefreshing(true);
        await page.refetch();
        setRefreshing(false);
      }}
      refreshing={refreshing}
      contentContainerStyle={{ gap: 14 }}
    >
      <Text variant="title2" accessibilityRole="header">
        {page.data.title}
      </Text>
      <Markdown onLinkPress={onLink}>{page.data.content}</Markdown>
      <Text variant="caption" color="mutedForeground">
        {t('content.updated', { date: f.date(page.data.updatedAt, 'long') })}
      </Text>
    </ScreenScroll>
  );
}
