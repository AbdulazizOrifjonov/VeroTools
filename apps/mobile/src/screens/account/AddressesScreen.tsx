import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { useAddresses, useDeleteAddress, useSession, useSetDefaultAddress } from '@vero/api-client';
import { LIMITS } from '@vero/config';
import type { AddressDTO } from '@vero/types';
import { formatUzPhone } from '@vero/utils';
import { useLayoutEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { FlatList, RefreshControl, StyleSheet, View } from 'react-native';
import { formatAddress } from '../../features/address/AddressFields';
import { confirm } from '../../lib/dialogs';
import { useFormat } from '../../lib/format';
import { errorMessage } from '../../lib/i18n';
import { toast } from '../../lib/toast';
import { useRootNavigation } from '../../navigation/hooks';
import type { ProfileStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/theme';
import { Badge, Button, Card, EmptyState, ErrorState, IconButton, Skeleton, Text } from '../../ui';
import { LogIn, MapPin, Pencil, Plus, Trash2 } from '../../ui/icons';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Addresses'>;

function AddressCard({ address, onEdit }: { address: AddressDTO; onEdit: () => void }) {
  const { t } = useTranslation();
  const f = useFormat();
  const { colors } = useTheme();
  const remove = useDeleteAddress();
  const setDefault = useSetDefaultAddress();
  const onDelete = async () => {
    const ok = await confirm(
      t('common:actions.delete'),
      t('shop:addresses.deleteConfirm'),
      t('common:actions.delete'),
      t('common:actions.cancel'),
    );
    if (ok)
      remove.mutate(address.id, {
        onSuccess: () => toast.success(t('shop:addresses.deleted')),
        onError: (e) => toast.error(errorMessage(t, e)),
      });
  };
  return (
    <Card style={{ gap: 8, opacity: remove.isPending ? 0.5 : 1 }}>
      <View style={styles.head}>
        <MapPin size={18} color={address.isDefault ? colors.link : colors.mutedForeground} />
        <Text variant="headline" style={{ flex: 1 }} numberOfLines={1}>
          {address.label || `${address.firstName} ${address.lastName}`}
        </Text>
        {address.isDefault ? <Badge label={t('shop:addresses.default')} tone="brand" size="sm" /> : null}
      </View>
      <Text variant="callout">{formatAddress(address, f.lang, t)}</Text>
      {address.comment ? (
        <Text variant="footnote" color="mutedForeground">
          {address.comment}
        </Text>
      ) : null}
      <Text variant="footnote" color="mutedForeground" tabular>
        {address.firstName} {address.lastName} · {formatUzPhone(address.phone)}
      </Text>
      <View style={styles.actions}>
        {!address.isDefault ? (
          <Button
            title={t('shop:addresses.makeDefault')}
            variant="ghost"
            size="sm"
            loading={setDefault.isPending}
            onPress={() => setDefault.mutate(address.id, { onError: (e) => toast.error(errorMessage(t, e)) })}
            style={{ marginLeft: -12 }}
          />
        ) : (
          <View />
        )}
        <View style={{ flexDirection: 'row', gap: 4 }}>
          <IconButton icon={Pencil} label={t('shop:addresses.edit')} onPress={onEdit} size={40} />
          <IconButton
            icon={Trash2}
            label={t('common:actions.delete')}
            onPress={() => void onDelete()}
            size={40}
            color={colors.danger}
          />
        </View>
      </View>
    </Card>
  );
}

/** Saved delivery addresses (shared with the website): add, edit, delete, set default. */
export function AddressesScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const root = useRootNavigation();
  const { isAuthenticated } = useSession();
  const addresses = useAddresses();
  const [refreshing, setRefreshing] = useState(false);
  const list = addresses.data ?? [];
  const canAdd = list.length < LIMITS.addressesMax;

  useLayoutEffect(() => {
    navigation.setOptions({
      headerRight:
        canAdd && isAuthenticated
          ? () => (
              <IconButton
                icon={Plus}
                label={t('shop:addresses.add')}
                onPress={() => navigation.navigate('AddressForm')}
              />
            )
          : undefined,
    });
  }, [navigation, canAdd, isAuthenticated, t]);

  if (!isAuthenticated) {
    return (
      <EmptyState
        icon={LogIn}
        title={t('shop:auth.loginTitle')}
        action={<Button title={t('shop:auth.signIn')} onPress={() => root.navigate('Login')} />}
      />
    );
  }
  if (addresses.isPending) {
    return (
      <View style={{ padding: 16, gap: 12 }}>
        <Skeleton height={140} radius={14} />
        <Skeleton height={140} radius={14} />
      </View>
    );
  }
  if (addresses.isError)
    return (
      <ErrorState
        error={addresses.error}
        onRetry={() => void addresses.refetch()}
        retrying={addresses.isFetching}
      />
    );

  return (
    <FlatList
      style={{ backgroundColor: colors.background }}
      data={list}
      keyExtractor={(a) => a.id}
      renderItem={({ item }) => (
        <AddressCard address={item} onEdit={() => navigation.navigate('AddressForm', { id: item.id })} />
      )}
      contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 32 }}
      ListEmptyComponent={
        <EmptyState
          icon={MapPin}
          title={t('shop:addresses.empty')}
          description={t('shop:addresses.emptyHint')}
          action={
            <Button
              title={t('shop:addresses.add')}
              icon={Plus}
              onPress={() => navigation.navigate('AddressForm')}
            />
          }
        />
      }
      ListFooterComponent={
        list.length && canAdd ? (
          <Button
            title={t('shop:addresses.add')}
            icon={Plus}
            variant="outline"
            onPress={() => navigation.navigate('AddressForm')}
          />
        ) : null
      }
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={async () => {
            setRefreshing(true);
            await addresses.refetch();
            setRefreshing(false);
          }}
          tintColor={colors.link}
          colors={[colors.primary]}
        />
      }
    />
  );
}

const styles = StyleSheet.create({
  head: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  actions: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
