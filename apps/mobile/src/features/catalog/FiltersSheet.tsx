import { useFacets } from '@vero/api-client';
import type { FacetOption, ProductListParams, SpecFacet, SpecFilterValue } from '@vero/types';
import { memo, useEffect, useMemo, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/theme';
import {
  BottomSheet,
  Button,
  Checkbox,
  Divider,
  RadioDot,
  RatingStars,
  Skeleton,
  SwitchRow,
  Text,
  TextField,
} from '../../ui';
import { ChevronDown, ChevronUp, Search } from '../../ui/icons';
import { cleanParams, countFilters, withoutFilters } from './listing';
import { RangeFilter } from './RangeFilter';

function Section({
  title,
  active,
  children,
  initiallyOpen = true,
}: {
  title: string;
  active?: boolean;
  children: ReactNode;
  initiallyOpen?: boolean;
}) {
  const { colors } = useTheme();
  const [open, setOpen] = useState(initiallyOpen || !!active);
  const Icon = open ? ChevronUp : ChevronDown;
  return (
    <View>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        accessibilityLabel={title}
        style={styles.sectionHead}
      >
        <View style={styles.sectionTitle}>
          <Text variant="headline">{title}</Text>
          {active ? <View style={[styles.activeDot, { backgroundColor: colors.primary }]} /> : null}
        </View>
        <Icon size={18} color={colors.mutedForeground} />
      </Pressable>
      {open ? <View style={styles.sectionBody}>{children}</View> : null}
      <Divider />
    </View>
  );
}

const LIMIT = 6;

const OptionsList = memo(function OptionsList({
  options,
  selected,
  onToggle,
  searchable,
  searchLabel,
}: {
  options: FacetOption[];
  selected: string[];
  onToggle: (value: string, on: boolean) => void;
  searchable?: boolean;
  searchLabel?: string;
}) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState(false);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);
  const visible =
    expanded || query ? filtered : filtered.filter((o, i) => i < LIMIT || selected.includes(o.value));
  const hidden = filtered.length - visible.length;
  return (
    <View style={{ gap: 2 }}>
      {searchable && options.length > LIMIT ? (
        <TextField
          icon={Search}
          value={query}
          onChangeText={setQuery}
          placeholder={searchLabel}
          clearable
          containerStyle={{ marginBottom: 6 }}
          autoCorrect={false}
        />
      ) : null}
      {visible.map((o) => (
        <Checkbox
          key={o.value}
          checked={selected.includes(o.value)}
          onChange={(on) => onToggle(o.value, on)}
          label={o.label}
          count={o.count}
          disabled={o.count === 0 && !selected.includes(o.value)}
        />
      ))}
      {!visible.length ? (
        <Text variant="callout" color="mutedForeground" style={{ paddingVertical: 8 }}>
          {t('common:status.noResults')}
        </Text>
      ) : null}
      {hidden > 0 || (expanded && filtered.length > LIMIT && !query) ? (
        <Pressable
          onPress={() => setExpanded((e) => !e)}
          accessibilityRole="button"
          hitSlop={8}
          style={{ paddingVertical: 8 }}
        >
          <Text variant="subhead" weight="bold" color="link">
            {expanded ? t('common:actions.showLess') : t('shop:catalog.more', { count: hidden })}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
});

function RadioRow({
  selected,
  onPress,
  children,
  label,
}: {
  selected: boolean;
  onPress: () => void;
  children: ReactNode;
  label: string;
}) {
  const { colors } = useTheme();
  return (
    <Pressable
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => [
        styles.radioRow,
        { backgroundColor: pressed ? colors.pressed : 'transparent' },
      ]}
    >
      <RadioDot selected={selected} />
      <View style={styles.radioContent}>{children}</View>
    </Pressable>
  );
}

export interface FiltersSheetProps {
  visible: boolean;
  onClose: () => void;
  /** current applied params (scope + filters) */
  value: ProductListParams;
  /** scope that cannot be removed (category page, brand page …) */
  fixed: ProductListParams;
  onApply: (next: ProductListParams) => void;
  showCategory: boolean;
  hideBrand: boolean;
}

/** Facet filters in a bottom sheet: edits a draft (facet counts follow the draft) and applies on "Show N". */
export function FiltersSheet({
  visible,
  onClose,
  value,
  fixed,
  onApply,
  showCategory,
  hideBrand,
}: FiltersSheetProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<ProductListParams>(value);
  useEffect(() => {
    if (visible) setDraft(value);
  }, [visible, value]);
  const facets = useFacets(cleanParams(draft), { enabled: visible });
  const f = facets.data;

  const set = (patch: Partial<ProductListParams>) =>
    setDraft((d) => cleanParams({ ...d, ...patch, page: undefined }));
  const setSpec = (key: string, v: SpecFilterValue | undefined) =>
    setDraft((d) => {
      const specs = { ...(d.specs ?? {}) };
      if (v === undefined) delete specs[key];
      else specs[key] = v;
      return cleanParams({ ...d, specs });
    });

  const total = f?.total;
  const count = countFilters(draft, fixed);

  const renderSpec = (spec: SpecFacet) => {
    const current = draft.specs?.[spec.key];
    if (spec.type === 'boolean') {
      return (
        <SwitchRow
          key={spec.key}
          label={spec.label}
          value={current === true}
          onChange={(on) => setSpec(spec.key, on ? true : undefined)}
          count={spec.count}
        />
      );
    }
    if (spec.type === 'range') {
      if (!(spec.max > spec.min)) return null;
      const range = current && !Array.isArray(current) && typeof current === 'object' ? current : {};
      return (
        <Section
          key={spec.key}
          title={spec.unit ? `${spec.label}, ${spec.unit}` : spec.label}
          active={current !== undefined}
          initiallyOpen={false}
        >
          <RangeFilter
            label={spec.label}
            unit={spec.unit}
            min={spec.min}
            max={spec.max}
            value={range}
            onChange={(r) => setSpec(spec.key, r.min === undefined && r.max === undefined ? undefined : r)}
          />
        </Section>
      );
    }
    if (!spec.options.length) return null;
    const selected = Array.isArray(current) ? current : [];
    return (
      <Section
        key={spec.key}
        title={spec.unit ? `${spec.label}, ${spec.unit}` : spec.label}
        active={selected.length > 0}
        initiallyOpen={false}
      >
        <OptionsList
          options={spec.options}
          selected={selected}
          onToggle={(v, on) => setSpec(spec.key, on ? [...selected, v] : selected.filter((x) => x !== v))}
          searchable
          searchLabel={t('common:actions.search')}
        />
      </Section>
    );
  };

  const booleanSpecs = f?.specs.filter((s) => s.type === 'boolean') ?? [];
  const otherSpecs = f?.specs.filter((s) => s.type !== 'boolean') ?? [];

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={count ? t('shop:catalog.filtersCount', { count }) : t('shop:catalog.filters')}
      size="large"
      headerRight={
        count ? (
          <Button
            title={t('common:actions.reset')}
            variant="ghost"
            size="sm"
            onPress={() => setDraft(withoutFilters(draft, fixed))}
          />
        ) : undefined
      }
      footer={
        <Button
          title={
            total !== undefined
              ? t('listing.showProducts', { count: total })
              : t('shop:catalog.showResults', { count: 0 })
          }
          onPress={() => {
            onApply(cleanParams(draft));
            onClose();
          }}
          loading={facets.isFetching && total === undefined}
          disabled={total === 0}
          size="lg"
          fullWidth
          trailing={
            facets.isFetching && total !== undefined ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : undefined
          }
        />
      }
      contentStyle={{ gap: 0 }}
    >
      {!f ? (
        <View style={{ gap: 18, paddingTop: 8 }}>
          {[0, 1, 2, 3].map((i) => (
            <View key={i} style={{ gap: 10 }}>
              <Skeleton width={120} height={16} />
              <Skeleton height={40} />
            </View>
          ))}
        </View>
      ) : (
        <>
          {showCategory && (f.categories.length || draft.category) ? (
            <Section title={t('common:product.category')} active={!!draft.category && !fixed.category}>
              <RadioRow
                selected={!draft.category}
                onPress={() => set({ category: undefined })}
                label={t('common:labels.all')}
              >
                <Text variant="callout" style={styles.flex}>
                  {t('common:labels.all')}
                </Text>
              </RadioRow>
              {f.categories.map((c) => (
                <RadioRow
                  key={c.value}
                  selected={draft.category === c.value}
                  onPress={() => set({ category: c.value })}
                  label={`${c.label}, ${c.count}`}
                >
                  <Text variant="callout" style={styles.flex}>
                    {c.label}
                  </Text>
                  <Text variant="footnote" color="mutedForeground" tabular>
                    {c.count}
                  </Text>
                </RadioRow>
              ))}
            </Section>
          ) : null}

          {f.price.max > f.price.min ? (
            <Section
              title={t('shop:catalog.price')}
              active={draft.minPrice !== undefined || draft.maxPrice !== undefined}
            >
              <RangeFilter
                money
                label={t('common:product.price')}
                min={f.price.min}
                max={f.price.max}
                value={{ min: draft.minPrice, max: draft.maxPrice }}
                onChange={(r) => set({ minPrice: r.min, maxPrice: r.max })}
              />
            </Section>
          ) : null}

          {!hideBrand && f.brands.length ? (
            <Section title={t('shop:catalog.brands')} active={!!draft.brand?.length}>
              <OptionsList
                options={f.brands}
                selected={draft.brand ?? []}
                searchable
                searchLabel={t('shop:catalog.searchBrand')}
                onToggle={(v, on) => {
                  const current = draft.brand ?? [];
                  set({ brand: on ? [...current, v] : current.filter((b) => b !== v) });
                }}
              />
            </Section>
          ) : null}

          <Section title={t('shop:catalog.availability')} active={!!(draft.inStock || draft.discounted)}>
            <SwitchRow
              label={t('shop:catalog.onlyInStock')}
              value={!!draft.inStock}
              onChange={(v) => set({ inStock: v || undefined })}
              count={f.inStock}
            />
            {!fixed.discounted ? (
              <SwitchRow
                label={t('shop:catalog.onlyDiscounted')}
                value={!!draft.discounted}
                onChange={(v) => set({ discounted: v || undefined })}
                count={f.discounted}
              />
            ) : null}
            {booleanSpecs.map(renderSpec)}
          </Section>

          {f.ratings.some((r) => r.value >= 1 && r.value <= 4 && r.count > 0) ? (
            <Section title={t('shop:catalog.rating')} active={!!draft.rating} initiallyOpen={false}>
              {f.ratings
                .filter((r) => r.value >= 1 && r.value <= 4 && r.count > 0)
                .sort((a, b) => b.value - a.value)
                .map((r) => (
                  <RadioRow
                    key={r.value}
                    selected={draft.rating === r.value}
                    onPress={() => set({ rating: draft.rating === r.value ? undefined : r.value })}
                    label={t('shop:catalog.ratingAtLeast', { value: r.value })}
                  >
                    <RatingStars value={r.value} size={14} />
                    <Text variant="callout" style={styles.flex}>
                      {t('shop:catalog.ratingAtLeast', { value: r.value })}
                    </Text>
                    <Text variant="footnote" color="mutedForeground" tabular>
                      {r.count}
                    </Text>
                  </RadioRow>
                ))}
            </Section>
          ) : null}

          <Section
            title={t('shop:catalog.flags')}
            active={
              !!(
                (draft.isNew && !fixed.isNew) ||
                (draft.bestseller && !fixed.bestseller) ||
                (draft.featured && !fixed.featured)
              )
            }
            initiallyOpen={false}
          >
            {!fixed.isNew ? (
              <Checkbox
                checked={!!draft.isNew}
                onChange={(v) => set({ isNew: v || undefined })}
                label={t('common:product.new')}
              />
            ) : null}
            {!fixed.bestseller ? (
              <Checkbox
                checked={!!draft.bestseller}
                onChange={(v) => set({ bestseller: v || undefined })}
                label={t('common:product.bestseller')}
              />
            ) : null}
            {!fixed.featured ? (
              <Checkbox
                checked={!!draft.featured}
                onChange={(v) => set({ featured: v || undefined })}
                label={t('common:product.featured')}
              />
            ) : null}
          </Section>

          {otherSpecs.map(renderSpec)}
        </>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', minHeight: 52 },
  sectionTitle: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  activeDot: { width: 7, height: 7, borderRadius: 4 },
  sectionBody: { paddingBottom: 16, gap: 4 },
  radioRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 44,
    borderRadius: 8,
    paddingHorizontal: 2,
  },
  radioContent: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10 },
});
