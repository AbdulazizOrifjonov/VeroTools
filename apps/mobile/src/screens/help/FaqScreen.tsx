import { useNavigation } from '@react-navigation/native';
import { useFaq } from '@vero/api-client';
import { FAQ_CATEGORIES, type FaqDTO } from '@vero/types';
import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { openHref } from '../../lib/links';
import { useTheme } from '../../theme/theme';
import {
  Button,
  Card,
  Chip,
  EmptyState,
  ErrorState,
  Markdown,
  ScreenScroll,
  Skeleton,
  Text,
  TextField,
} from '../../ui';
import { ChevronDown, ChevronUp, CircleHelp, Search } from '../../ui/icons';

const FaqItem = memo(function FaqItem({ item, onLink }: { item: FaqDTO; onLink: (href: string) => void }) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(false);
  const Icon = open ? ChevronUp : ChevronDown;
  return (
    <View style={[styles.item, { borderBottomColor: colors.border }]}>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        style={styles.q}
      >
        <Text variant="subhead" weight="semibold" style={{ flex: 1 }}>
          {item.question}
        </Text>
        <Icon size={18} color={colors.mutedForeground} />
      </Pressable>
      {open ? (
        <View style={{ paddingBottom: 14 }}>
          <Markdown size="sm" onLinkPress={onLink}>
            {item.answer}
          </Markdown>
        </View>
      ) : null}
    </View>
  );
});

/** FAQ grouped by category with search. */
export function FaqScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const faq = useFaq();
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const onLink = (href: string) =>
    openHref(href, (target) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (navigation as any).navigate(target.name, target.params);
    });

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (faq.data ?? []).filter(
      (f) =>
        (!category || f.category === category) &&
        (!q || f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)),
    );
  }, [faq.data, category, query]);
  const categories = FAQ_CATEGORIES.filter((c) => faq.data?.some((f) => f.category === c));

  if (faq.isPending) {
    return (
      <View style={{ padding: 16, gap: 12 }}>
        {Array.from({ length: 6 }, (_, i) => (
          <Skeleton key={i} height={48} radius={10} />
        ))}
      </View>
    );
  }
  if (faq.isError)
    return <ErrorState error={faq.error} onRetry={() => void faq.refetch()} retrying={faq.isFetching} />;

  return (
    <ScreenScroll bottomInset contentContainerStyle={{ gap: 14 }}>
      <TextField
        icon={Search}
        value={query}
        onChangeText={setQuery}
        placeholder={t('faq.searchPlaceholder')}
        clearable
        autoCorrect={false}
      />
      {categories.length > 1 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          <Chip label={t('common:labels.all')} selected={!category} onPress={() => setCategory(null)} />
          {categories.map((c) => (
            <Chip
              key={c}
              label={t(`shop:faq.category.${c}`)}
              selected={category === c}
              onPress={() => setCategory(c)}
            />
          ))}
        </ScrollView>
      ) : null}
      {list.length ? (
        <View>
          {list.map((f) => (
            <FaqItem key={f.id} item={f} onLink={onLink} />
          ))}
        </View>
      ) : (
        <EmptyState compact icon={CircleHelp} title={t('common:status.noResults')} />
      )}
      <Card style={{ gap: 10 }}>
        <Text variant="headline">{t('shop:faq.stillQuestions')}</Text>
        <Text variant="footnote" color="mutedForeground">
          {t('faq.contactHint')}
        </Text>
        <Button
          title={t('shop:faq.contactUs')}
          variant="outline"
          onPress={() => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (navigation as any).navigate('Contacts');
          }}
        />
      </Card>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  item: { borderBottomWidth: StyleSheet.hairlineWidth },
  q: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 52, paddingVertical: 12 },
});
