import { usePopularSearches, useSearchSuggestions } from '@vero/api-client';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFormat } from '../../lib/format';
import { useRecentSearches } from '../../lib/recent';
import type { RootScreenProps } from '../../navigation/types';
import { fonts } from '../../theme/fonts';
import { useTheme } from '../../theme/theme';
import { Chip, IconButton, InlineError, PriceText, SmartImage, Text } from '../../ui';
import { ArrowLeft, ArrowUpRight, ChevronRight, History, Search, TrendingUp, X } from '../../ui/icons';

function useDebounced<T>(value: T, ms: number): T {
  const [v, setV] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setV(value), ms);
    return () => clearTimeout(id);
  }, [value, ms]);
  return v;
}

function SectionTitle({
  children,
  action,
  onAction,
}: {
  children: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <View style={styles.sectionTitle}>
      <Text variant="overline" color="mutedForeground" uppercase style={{ flex: 1 }}>
        {children}
      </Text>
      {action && onAction ? (
        <Pressable onPress={onAction} accessibilityRole="button" hitSlop={10}>
          <Text variant="subhead" weight="bold" color="link">
            {action}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

/** Search with debounced suggestions (products, categories, brands), recent and popular searches. */
export function SearchScreen({ navigation, route }: RootScreenProps<'Search'>) {
  const { t } = useTranslation();
  const f = useFormat();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const inputRef = useRef<TextInput>(null);
  const [query, setQuery] = useState(route.params?.q ?? '');
  const debounced = useDebounced(query.trim(), 250);
  const suggestions = useSearchSuggestions(debounced);
  const popular = usePopularSearches();
  const recent = useRecentSearches((s) => s.items);
  const pushRecent = useRecentSearches((s) => s.push);
  const removeRecent = useRecentSearches((s) => s.remove);
  const clearRecent = useRecentSearches((s) => s.clear);

  useEffect(() => {
    const id = setTimeout(() => inputRef.current?.focus(), 250);
    return () => clearTimeout(id);
  }, []);

  const submit = (value: string) => {
    const q = value.trim();
    if (!q) return;
    Keyboard.dismiss();
    pushRecent(q);
    navigation.push('ProductList', { q });
  };

  const typing = debounced.length >= 2;
  const data = typing ? suggestions.data : undefined;
  const empty =
    data &&
    !data.products.length &&
    !data.categories.length &&
    !data.brands.length &&
    !data.suggestions.length;

  return (
    <View style={[styles.flex, { backgroundColor: colors.background, paddingTop: insets.top }]}>
      <View style={[styles.header, { borderBottomColor: colors.border }]}>
        <IconButton icon={ArrowLeft} label={t('common:actions.back')} onPress={() => navigation.goBack()} />
        <View style={[styles.inputBox, { backgroundColor: colors.fill }]}>
          <Search size={18} color={colors.mutedForeground} />
          <TextInput
            ref={inputRef}
            value={query}
            onChangeText={setQuery}
            placeholder={t('shop:search.placeholder')}
            placeholderTextColor={colors.mutedForeground}
            returnKeyType="search"
            onSubmitEditing={() => submit(query)}
            autoCorrect={false}
            autoCapitalize="none"
            style={[styles.input, { color: colors.foreground }]}
            selectionColor={colors.link}
            accessibilityLabel={t('common:nav.search')}
            maxFontSizeMultiplier={1.4}
          />
          {query ? (
            <Pressable
              onPress={() => setQuery('')}
              accessibilityRole="button"
              accessibilityLabel={t('common:actions.clear')}
              hitSlop={10}
            >
              <X size={18} color={colors.mutedForeground} />
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView
        style={styles.flex}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode="on-drag"
      >
        {!typing ? (
          <>
            {recent.length ? (
              <View>
                <SectionTitle action={t('shop:search.clearHistory')} onAction={clearRecent}>
                  {t('shop:search.recent')}
                </SectionTitle>
                {recent.map((r) => (
                  <View key={r} style={styles.recentRow}>
                    <Pressable
                      onPress={() => submit(r)}
                      accessibilityRole="button"
                      accessibilityLabel={r}
                      style={styles.recentMain}
                    >
                      <History size={18} color={colors.mutedForeground} />
                      <Text variant="body" numberOfLines={1} style={styles.flex}>
                        {r}
                      </Text>
                    </Pressable>
                    <IconButton
                      icon={X}
                      size={36}
                      iconSize={16}
                      label={`${t('common:actions.remove')}: ${r}`}
                      color={colors.mutedForeground}
                      onPress={() => removeRecent(r)}
                    />
                  </View>
                ))}
              </View>
            ) : null}
            {popular.data?.length ? (
              <View>
                <SectionTitle>{t('shop:search.popular')}</SectionTitle>
                <View style={styles.chips}>
                  {popular.data.slice(0, 12).map((p) => (
                    <Chip key={p.query} label={p.query} icon={TrendingUp} onPress={() => submit(p.query)} />
                  ))}
                </View>
              </View>
            ) : popular.isError ? (
              <InlineError error={popular.error} onRetry={() => void popular.refetch()} />
            ) : null}
            {!recent.length && !popular.data?.length && !popular.isError ? (
              <Text variant="callout" color="mutedForeground" align="center" style={{ paddingTop: 40 }}>
                {t('shop:search.startTyping')}
              </Text>
            ) : null}
          </>
        ) : suggestions.isError && !data ? (
          <InlineError error={suggestions.error} onRetry={() => void suggestions.refetch()} />
        ) : !data ? (
          <View style={{ paddingTop: 40 }}>
            <ActivityIndicator color={colors.link} />
          </View>
        ) : empty ? (
          <View style={{ paddingTop: 32, gap: 6 }}>
            <Text variant="title3" align="center">
              {t('shop:search.noResults', { query: debounced })}
            </Text>
            <Text variant="callout" color="mutedForeground" align="center">
              {t('shop:search.noResultsHint')}
            </Text>
          </View>
        ) : (
          <>
            {data.suggestions.length ? (
              <View>
                {data.suggestions.slice(0, 5).map((s) => (
                  <Pressable
                    key={s}
                    onPress={() => submit(s)}
                    accessibilityRole="button"
                    accessibilityLabel={s}
                    style={({ pressed }) => [
                      styles.suggestRow,
                      pressed && { backgroundColor: colors.pressed },
                    ]}
                  >
                    <Search size={17} color={colors.mutedForeground} />
                    <Text variant="body" numberOfLines={1} style={styles.flex}>
                      {s}
                    </Text>
                    <ArrowUpRight size={17} color={colors.mutedForeground} />
                  </Pressable>
                ))}
              </View>
            ) : null}
            {data.categories.length ? (
              <View>
                <SectionTitle>{t('shop:search.categories')}</SectionTitle>
                {data.categories.map((c) => (
                  <Pressable
                    key={c.id}
                    onPress={() => {
                      pushRecent(query);
                      navigation.push('ProductList', { category: c.slug, title: c.name });
                    }}
                    accessibilityRole="button"
                    style={({ pressed }) => [
                      styles.suggestRow,
                      pressed && { backgroundColor: colors.pressed },
                    ]}
                  >
                    <Text variant="body" weight="semibold" numberOfLines={1} style={styles.flex}>
                      {c.name}
                    </Text>
                    <Text variant="footnote" color="mutedForeground" tabular>
                      {c.productCount}
                    </Text>
                    <ChevronRight size={17} color={colors.mutedForeground} />
                  </Pressable>
                ))}
              </View>
            ) : null}
            {data.brands.length ? (
              <View>
                <SectionTitle>{t('shop:search.brands')}</SectionTitle>
                <View style={styles.chips}>
                  {data.brands.map((b) => (
                    <Chip
                      key={b.id}
                      label={b.name}
                      count={b.productCount}
                      onPress={() => navigation.push('ProductList', { brand: b.slug, title: b.name })}
                    />
                  ))}
                </View>
              </View>
            ) : null}
            {data.products.length ? (
              <View>
                <SectionTitle>{t('shop:search.products')}</SectionTitle>
                {data.products.map((p) => (
                  <Pressable
                    key={p.id}
                    onPress={() => {
                      pushRecent(query);
                      navigation.navigate('Product', { slug: p.slug });
                    }}
                    accessibilityRole="link"
                    accessibilityLabel={`${p.name}, ${f.price(p.price)}`}
                    style={({ pressed }) => [
                      styles.productRow,
                      pressed && { backgroundColor: colors.pressed },
                    ]}
                  >
                    <SmartImage image={p.image} size="thumb" style={styles.productThumb} />
                    <View style={{ flex: 1, gap: 4 }}>
                      <Text variant="subhead" weight="semibold" numberOfLines={2}>
                        {p.name}
                      </Text>
                      <PriceText amount={p.price} oldAmount={p.oldPrice} size="sm" inline />
                    </View>
                  </Pressable>
                ))}
              </View>
            ) : null}
            <Pressable
              onPress={() => submit(query)}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.allResults,
                { backgroundColor: pressed ? colors.primaryHover : colors.primary },
              ]}
            >
              <Text
                variant="headline"
                style={{ color: colors.primaryForeground, fontFamily: fonts.bold }}
                numberOfLines={1}
              >
                {t('search.allResultsFor', { query: query.trim() })}
              </Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  inputBox: {
    flex: 1,
    height: 44,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    marginRight: 8,
  },
  input: { flex: 1, height: 44, fontFamily: fonts.medium, fontSize: 15, paddingVertical: 0, outlineWidth: 0 },
  content: { padding: 16, gap: 22 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
  recentRow: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
  recentMain: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 44 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  suggestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 46,
    borderRadius: 8,
    paddingHorizontal: 4,
  },
  productRow: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 8, borderRadius: 8 },
  productThumb: { width: 56, height: 56, borderRadius: 10 },
  allResults: {
    height: 48,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
});
