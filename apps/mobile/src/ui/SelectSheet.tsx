import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, Pressable, StyleSheet, View } from 'react-native';
import { useTheme } from '../theme/theme';
import { BottomSheet } from './BottomSheet';
import { FieldShell, TextField } from './Input';
import { Check, ChevronDown, Search } from './icons';
import { Text } from './Text';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

export interface SelectSheetProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  options: SelectOption[];
  value?: string | null;
  onSelect: (value: string) => void;
  /** show a search box (defaults to true for more than 10 options) */
  searchable?: boolean;
}

/** Bottom sheet with a single-choice list (regions, cities, sort …). */
export function SelectSheet({
  visible,
  onClose,
  title,
  options,
  value,
  onSelect,
  searchable,
}: SelectSheetProps) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [query, setQuery] = useState('');
  const showSearch = searchable ?? options.length > 10;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? options.filter((o) => o.label.toLowerCase().includes(q)) : options;
  }, [options, query]);

  return (
    <BottomSheet
      visible={visible}
      onClose={onClose}
      title={title}
      scroll={false}
      size={options.length > 8 ? 'large' : 'auto'}
    >
      {showSearch ? (
        <View style={styles.search}>
          <TextField
            icon={Search}
            value={query}
            onChangeText={setQuery}
            placeholder={t('common:actions.search')}
            clearable
            autoCorrect={false}
            returnKeyType="search"
          />
        </View>
      ) : null}
      <FlatList
        data={filtered}
        keyExtractor={(o) => o.value}
        keyboardShouldPersistTaps="handled"
        style={styles.list}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <Text variant="callout" color="mutedForeground" align="center" style={{ paddingVertical: 24 }}>
            {t('common:status.noResults')}
          </Text>
        }
        renderItem={({ item }) => {
          const selected = item.value === value;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: selected }}
              accessibilityLabel={item.label}
              onPress={() => {
                onSelect(item.value);
                setQuery('');
                onClose();
              }}
              style={({ pressed }) => [
                styles.option,
                { backgroundColor: selected ? colors.brandSoft : pressed ? colors.pressed : 'transparent' },
              ]}
            >
              <View style={{ flex: 1, gap: 2 }}>
                <Text
                  variant="body"
                  weight={selected ? 'bold' : 'medium'}
                  color={selected ? 'brandSoftForeground' : 'foreground'}
                >
                  {item.label}
                </Text>
                {item.description ? (
                  <Text variant="footnote" color="mutedForeground">
                    {item.description}
                  </Text>
                ) : null}
              </View>
              {selected ? <Check size={20} color={colors.link} strokeWidth={2.5} /> : null}
            </Pressable>
          );
        }}
      />
    </BottomSheet>
  );
}

/** Field that looks like an input and opens a SelectSheet. */
export const SelectField = memo(function SelectField({
  label,
  placeholder,
  value,
  options,
  onSelect,
  error,
  required,
  disabled,
  sheetTitle,
}: {
  label: string;
  placeholder?: string;
  value?: string | null;
  options: SelectOption[];
  onSelect: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  sheetTitle?: string;
}) {
  const { colors, dark } = useTheme();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);
  return (
    <FieldShell label={label} error={error} required={required}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${label}: ${selected?.label ?? placeholder ?? ''}`}
        accessibilityState={{ disabled: !!disabled }}
        disabled={disabled}
        onPress={() => setOpen(true)}
        style={[
          styles.field,
          {
            borderColor: error ? colors.danger : colors.input,
            borderWidth: error ? 1.5 : StyleSheet.hairlineWidth * 2,
            backgroundColor: dark ? colors.surface : colors.background,
            opacity: disabled ? 0.55 : 1,
          },
        ]}
      >
        <Text
          variant="body"
          weight="medium"
          color={selected ? 'foreground' : 'mutedForeground'}
          numberOfLines={1}
          style={{ flex: 1 }}
        >
          {selected?.label ?? placeholder ?? ''}
        </Text>
        <ChevronDown size={18} color={colors.mutedForeground} />
      </Pressable>
      <SelectSheet
        visible={open}
        onClose={() => setOpen(false)}
        title={sheetTitle ?? label}
        options={options}
        value={value}
        onSelect={onSelect}
      />
    </FieldShell>
  );
});

const styles = StyleSheet.create({
  search: { paddingHorizontal: 16, paddingBottom: 8 },
  list: { flexGrow: 0, flexShrink: 1 },
  listContent: { paddingHorizontal: 8, paddingBottom: 8 },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minHeight: 50,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 10,
  },
  field: {
    minHeight: 48,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    gap: 8,
  },
});
