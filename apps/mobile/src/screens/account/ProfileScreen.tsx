import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import {
  useEngagement,
  useLogout,
  useMe,
  useRemoveAvatar,
  useSession,
  useUploadAvatar,
} from '@vero/api-client';
import { LIMITS } from '@vero/config';
import { getInitials } from '@vero/utils';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { confirm } from '../../lib/dialogs';
import { cameraAvailable, pickImages, type PickError } from '../../lib/files';
import { useFormat } from '../../lib/format';
import { errorMessage } from '../../lib/i18n';
import { unregisterPush } from '../../lib/push';
import { toast } from '../../lib/toast';
import { useRootNavigation } from '../../navigation/hooks';
import type { ProfileStackParamList } from '../../navigation/types';
import { useTheme } from '../../theme/theme';
import {
  Badge,
  BottomSheet,
  Button,
  Card,
  Divider,
  IconButton,
  ListRow,
  ScreenScroll,
  SmartImage,
  Text,
} from '../../ui';
import {
  BadgeCheck,
  Bell,
  Camera,
  CircleHelp,
  Heart,
  Image as ImageIcon,
  LogOut,
  MapPin,
  MessageSquareText,
  Package,
  Pencil,
  Scale,
  Settings,
  ShieldAlert,
  Trash2,
} from '../../ui/icons';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Profile'>;

function Avatar({ uri, name, size = 72 }: { uri?: string; name: string; size?: number }) {
  const { colors } = useTheme();
  return (
    <View
      style={[
        styles.avatar,
        { width: size, height: size, borderRadius: size / 2, backgroundColor: colors.brandSoft },
      ]}
    >
      {uri ? (
        <SmartImage uri={uri} well={false} contentFit="cover" style={StyleSheet.absoluteFill} />
      ) : (
        <Text variant="title2" color="brandSoftForeground">
          {getInitials(name) || '—'}
        </Text>
      )}
    </View>
  );
}

/** Account hub: profile header (avatar, verification), menu, sign out. Guests see sign-in prompts + help / settings. */
export function ProfileScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const f = useFormat();
  const { colors } = useTheme();
  const root = useRootNavigation();
  const session = useSession();
  const me = useMe();
  const engagement = useEngagement();
  const logout = useLogout();
  const upload = useUploadAvatar();
  const removeAvatar = useRemoveAvatar();
  const [avatarSheet, setAvatarSheet] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const user = me.data ?? session.user;

  const pick = async (camera: boolean) => {
    setAvatarSheet(false);
    try {
      const picked = await pickImages({ camera, square: true, maxBytes: LIMITS.avatarMaxBytes });
      if (!picked?.[0]) return;
      upload.mutate(picked[0].file, {
        onSuccess: () => toast.success(t('common:status.saved')),
        onError: (e) => toast.error(errorMessage(t, e)),
      });
    } catch (e) {
      const code = e as PickError;
      toast.error(
        code === 'too_large'
          ? t('errors:FILE_TOO_LARGE')
          : code === 'permission'
            ? t('profile.photoPermission')
            : t('common:status.error'),
      );
    }
  };

  const onLogout = async () => {
    const ok = await confirm(
      t('common:nav.logout'),
      t('profile.logoutConfirm'),
      t('common:nav.logout'),
      t('common:actions.cancel'),
    );
    if (!ok) return;
    await unregisterPush();
    logout.mutate(undefined, { onSettled: () => toast.info(t('shop:auth.loggedOut')) });
  };

  const unread = engagement.data?.unreadNotifications ?? 0;
  const wishCount = engagement.data?.wishlistIds.length ?? 0;
  const compareCount = engagement.data?.compareIds.length ?? 0;

  if (!session.isAuthenticated || !user) {
    return (
      <ScreenScroll contentContainerStyle={{ gap: 16 }}>
        <Card style={{ gap: 14, alignItems: 'center', paddingVertical: 24 }}>
          <Avatar name="" size={64} />
          <Text variant="title3" align="center">
            {t('profile.guestTitle')}
          </Text>
          <Text variant="callout" color="mutedForeground" align="center">
            {t('shop:auth.benefits')}
          </Text>
          <View style={{ alignSelf: 'stretch', gap: 10 }}>
            <Button title={t('common:nav.login')} size="lg" onPress={() => root.navigate('Login')} />
            <Button
              title={t('common:nav.register')}
              variant="outline"
              size="lg"
              onPress={() => root.navigate('Register')}
            />
          </View>
        </Card>
        <Card padded={false}>
          <ListRow
            icon={Heart}
            title={t('common:nav.wishlist')}
            badge={wishCount}
            onPress={() => root.navigate('Tabs', { screen: 'WishlistTab' }, { pop: true })}
          />
          <Divider inset={66} />
          <ListRow
            icon={Scale}
            title={t('common:nav.compare')}
            badge={compareCount}
            onPress={() => root.navigate('Compare')}
          />
          <Divider inset={66} />
          <ListRow
            icon={Settings}
            title={t('common:nav.settings')}
            onPress={() => navigation.navigate('Settings')}
          />
          <Divider inset={66} />
          <ListRow icon={CircleHelp} title={t('help.title')} onPress={() => navigation.navigate('Help')} />
        </Card>
      </ScreenScroll>
    );
  }

  return (
    <>
      <ScreenScroll
        contentContainerStyle={{ gap: 16 }}
        onRefresh={async () => {
          setRefreshing(true);
          await Promise.all([me.refetch(), engagement.refetch()]);
          setRefreshing(false);
        }}
        refreshing={refreshing}
      >
        <Card style={{ gap: 14 }}>
          <View style={styles.headerRow}>
            <Pressable
              onPress={() => setAvatarSheet(true)}
              accessibilityRole="button"
              accessibilityLabel={t('shop:account.changeAvatar')}
              style={{ opacity: upload.isPending || removeAvatar.isPending ? 0.5 : 1 }}
            >
              <Avatar uri={user.avatar?.thumb ?? user.avatar?.url} name={user.fullName} />
              <View
                style={[styles.cameraBadge, { backgroundColor: colors.primary, borderColor: colors.card }]}
              >
                <Camera size={13} color={colors.primaryForeground} />
              </View>
            </Pressable>
            <View style={{ flex: 1, gap: 3 }}>
              <Text variant="title3" numberOfLines={2}>
                {user.fullName}
              </Text>
              <View style={styles.inline}>
                <Text
                  variant="footnote"
                  color="mutedForeground"
                  tabular
                  numberOfLines={1}
                  style={{ flexShrink: 1 }}
                >
                  {f.phone(user.phone)}
                </Text>
                {user.isPhoneVerified ? <BadgeCheck size={14} color={colors.success} /> : null}
              </View>
              {user.email ? (
                <View style={styles.inline}>
                  <Text
                    variant="footnote"
                    color="mutedForeground"
                    numberOfLines={1}
                    style={{ flexShrink: 1 }}
                  >
                    {user.email}
                  </Text>
                  {user.isEmailVerified ? <BadgeCheck size={14} color={colors.success} /> : null}
                </View>
              ) : null}
            </View>
            <IconButton
              icon={Pencil}
              label={t('common:actions.edit')}
              variant="filled"
              size={40}
              iconSize={18}
              style={{ alignSelf: 'flex-start' }}
              onPress={() => navigation.navigate('EditProfile')}
            />
          </View>
          {!user.isPhoneVerified || (user.email && !user.isEmailVerified) ? (
            <Pressable
              onPress={() => navigation.navigate('EditProfile')}
              accessibilityRole="button"
              style={[styles.verify, { backgroundColor: colors.warningSoft }]}
            >
              <ShieldAlert size={18} color={colors.warning} />
              <Text variant="footnote" weight="semibold" style={{ flex: 1 }}>
                {!user.isPhoneVerified ? t('profile.verifyPhoneHint') : t('profile.verifyEmailHint')}
              </Text>
              <Badge label={t('shop:account.notVerified')} tone="warning" size="sm" />
            </Pressable>
          ) : null}
          <View style={styles.stats}>
            <View style={[styles.stat, { backgroundColor: colors.fill }]}>
              <Text variant="title2" tabular>
                {user.stats.ordersCount}
              </Text>
              <Text variant="caption" color="mutedForeground">
                {t('shop:account.ordersCount')}
              </Text>
            </View>
            <View style={[styles.stat, { backgroundColor: colors.fill }]}>
              <Text variant="title2" tabular>
                {user.stats.reviewsCount}
              </Text>
              <Text variant="caption" color="mutedForeground">
                {t('common:nav.myReviews')}
              </Text>
            </View>
          </View>
          <Text variant="caption" color="mutedForeground">
            {t('shop:account.memberSince', { date: f.date(user.createdAt, 'monthYear') })} ·{' '}
            {t('shop:account.syncedEverywhere')}
          </Text>
        </Card>

        <Card padded={false}>
          <ListRow
            icon={Package}
            title={t('common:nav.orders')}
            onPress={() => navigation.navigate('Orders')}
          />
          <Divider inset={66} />
          <ListRow
            icon={MapPin}
            title={t('common:nav.addresses')}
            onPress={() => navigation.navigate('Addresses')}
          />
          <Divider inset={66} />
          <ListRow
            icon={Bell}
            title={t('common:nav.notifications')}
            badge={unread}
            onPress={() => navigation.navigate('Notifications')}
          />
          <Divider inset={66} />
          <ListRow
            icon={MessageSquareText}
            title={t('common:nav.myReviews')}
            onPress={() => navigation.navigate('MyReviews')}
          />
          <Divider inset={66} />
          <ListRow
            icon={Heart}
            title={t('common:nav.wishlist')}
            badge={wishCount}
            onPress={() => root.navigate('Tabs', { screen: 'WishlistTab' }, { pop: true })}
          />
          <Divider inset={66} />
          <ListRow
            icon={Scale}
            title={t('common:nav.compare')}
            badge={compareCount}
            onPress={() => root.navigate('Compare')}
          />
        </Card>
        <Card padded={false}>
          <ListRow
            icon={Settings}
            title={t('common:nav.settings')}
            onPress={() => navigation.navigate('Settings')}
          />
          <Divider inset={66} />
          <ListRow icon={CircleHelp} title={t('help.title')} onPress={() => navigation.navigate('Help')} />
        </Card>
        <Card padded={false}>
          <ListRow
            icon={LogOut}
            title={t('common:nav.logout')}
            destructive
            chevron={false}
            onPress={() => void onLogout()}
          />
        </Card>
      </ScreenScroll>

      <BottomSheet
        visible={avatarSheet}
        onClose={() => setAvatarSheet(false)}
        title={t('shop:account.avatar')}
        subtitle={t('profile.avatarHint')}
      >
        <Card padded={false}>
          <ListRow
            icon={ImageIcon}
            title={t('profile.chooseFromLibrary')}
            onPress={() => void pick(false)}
            chevron={false}
          />
          {cameraAvailable ? (
            <>
              <Divider inset={66} />
              <ListRow
                icon={Camera}
                title={t('profile.takePhoto')}
                onPress={() => void pick(true)}
                chevron={false}
              />
            </>
          ) : null}
          {user.avatar ? (
            <>
              <Divider inset={66} />
              <ListRow
                icon={Trash2}
                title={t('shop:account.removeAvatar')}
                destructive
                chevron={false}
                onPress={() => {
                  setAvatarSheet(false);
                  removeAvatar.mutate(undefined, { onError: (e) => toast.error(errorMessage(t, e)) });
                }}
              />
            </>
          ) : null}
        </Card>
      </BottomSheet>
    </>
  );
}

const styles = StyleSheet.create({
  avatar: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  cameraBadge: {
    position: 'absolute',
    right: -2,
    bottom: -2,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
  },
  inline: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  verify: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 12 },
  stats: { flexDirection: 'row', gap: 10 },
  stat: { flex: 1, borderRadius: 12, padding: 12, gap: 2 },
});
