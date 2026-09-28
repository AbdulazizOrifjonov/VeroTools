import { SPEC_GROUPS, type ProductSpec } from '@vero/types';
import { memo, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../../theme/theme';
import { Button, Text } from '../../ui';

/** Specifications grouped by spec group (main, power, performance, dimensions, equipment, general). */
export const SpecsList = memo(function SpecsList({
  specs,
  collapsedCount = 8,
}: {
  specs: ProductSpec[];
  collapsedCount?: number;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const groups = useMemo(
    () =>
      SPEC_GROUPS.map((g) => ({ group: g, items: specs.filter((s) => s.group === g) }))
        .concat([
          {
            group: 'general' as const,
            items: specs.filter((s) => !(SPEC_GROUPS as readonly string[]).includes(s.group)),
          },
        ])
        .filter((g) => g.items.length),
    [specs],
  );
  if (!specs.length) {
    return (
      <Text variant="callout" color="mutedForeground">
        {t('shop:product.specsEmpty')}
      </Text>
    );
  }
  let shown = 0;
  return (
    <View style={{ gap: 18 }}>
      {groups.map(({ group, items }, gi) => {
        if (!expanded && shown >= collapsedCount) return null;
        const visible = expanded ? items : items.slice(0, Math.max(0, collapsedCount - shown));
        shown += visible.length;
        if (!visible.length) return null;
        return (
          <View key={`${group}-${gi}`} style={{ gap: 4 }}>
            <Text variant="overline" color="mutedForeground" uppercase>
              {t(`specGroup.${group}`)}
            </Text>
            {visible.map((s) => (
              <View
                key={s.key}
                style={[styles.row, { borderBottomColor: colors.border }]}
                accessible
                accessibilityLabel={`${s.label}: ${s.value}`}
              >
                <Text variant="callout" color="mutedForeground" style={styles.label}>
                  {s.label}
                </Text>
                <Text variant="callout" weight="semibold" style={styles.value} tabular>
                  {s.value}
                </Text>
              </View>
            ))}
          </View>
        );
      })}
      {specs.length > collapsedCount ? (
        <Button
          title={expanded ? t('common:actions.showLess') : t('shop:product.allSpecs')}
          variant="outline"
          onPress={() => setExpanded((e) => !e)}
          accessibilityState={{ expanded }}
        />
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth },
  label: { flex: 1.1 },
  value: { flex: 1, textAlign: 'right' },
});
