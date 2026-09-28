import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import { PAGE_SLUGS, type PageSlug } from '@vero/types';
import { useTranslation } from 'react-i18next';
import { View } from 'react-native';
import type { ProfileStackParamList } from '../../navigation/types';
import { Card, Divider, ListRow, ScreenScroll } from '../../ui';
import {
  Building2,
  CircleHelp,
  CreditCard,
  FileText,
  Headset,
  Lock,
  RotateCcw,
  ShieldCheck,
  Truck,
  type LucideIcon,
} from '../../ui/icons';

type Props = NativeStackScreenProps<ProfileStackParamList, 'Help'>;

const PAGE_META: Record<Exclude<PageSlug, 'contacts'>, { icon: LucideIcon; nav: string }> = {
  about: { icon: Building2, nav: 'about' },
  delivery: { icon: Truck, nav: 'delivery' },
  warranty: { icon: ShieldCheck, nav: 'warranty' },
  returns: { icon: RotateCcw, nav: 'returns' },
  payment: { icon: CreditCard, nav: 'payment' },
  privacy: { icon: Lock, nav: 'privacy' },
  terms: { icon: FileText, nav: 'terms' },
};

/** Help: FAQ, information pages managed in the admin panel, contacts. */
export function HelpScreen({ navigation }: Props) {
  const { t } = useTranslation();
  const pages = PAGE_SLUGS.filter((s): s is Exclude<PageSlug, 'contacts'> => s !== 'contacts');
  return (
    <ScreenScroll contentContainerStyle={{ gap: 16 }}>
      <Card padded={false}>
        <ListRow icon={CircleHelp} title={t('common:nav.faq')} onPress={() => navigation.navigate('Faq')} />
        <Divider inset={66} />
        <ListRow
          icon={Headset}
          title={t('common:nav.contact')}
          subtitle={t('help.contactHint')}
          onPress={() => navigation.navigate('Contacts')}
        />
      </Card>
      <Card padded={false}>
        {pages.map((slug, i) => {
          const meta = PAGE_META[slug];
          const title = t(`common:nav.${meta.nav}`);
          return (
            <View key={slug}>
              {i > 0 ? <Divider inset={66} /> : null}
              <ListRow
                icon={meta.icon}
                title={title}
                onPress={() => navigation.navigate('Page', { slug, title })}
              />
            </View>
          );
        })}
      </Card>
    </ScreenScroll>
  );
}
