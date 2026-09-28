import { zodResolver } from '@hookform/resolvers/zod';
import { useContactMessage, useMe, usePickupPoints, useSettings } from '@vero/api-client';
import { contactMessageSchema, type ContactMessageFormInput } from '@vero/validation';
import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Linking, Platform, StyleSheet, View } from 'react-native';
import { applyServerErrors } from '../../lib/errors';
import { useFormat } from '../../lib/format';
import { errorMessage } from '../../lib/i18n';
import { openExternal } from '../../lib/links';
import { useTheme } from '../../theme/theme';
import {
  Button,
  Card,
  ErrorState,
  FormPhoneField,
  FormTextField,
  ListRow,
  Notice,
  ScreenScroll,
  Skeleton,
  Text,
  Divider,
} from '../../ui';
import { Clock, Facebook, Instagram, Mail, MapPin, Navigation, Phone, Send, Youtube } from '../../ui/icons';

/** Opens the platform map app at a point (Apple Maps / geo: intent / Google Maps on the web). */
export function openMap(lat: number, lng: number, label: string) {
  const q = encodeURIComponent(label);
  const url =
    Platform.OS === 'ios'
      ? `maps:0,0?q=${q}&ll=${lat},${lng}`
      : Platform.OS === 'android'
        ? `geo:${lat},${lng}?q=${lat},${lng}(${q})`
        : `https://www.google.com/maps/search/?api=1&query=${lat},${lng}`;
  Linking.openURL(url).catch(
    () => void openExternal(`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`),
  );
}

/** Telegram: the app when installed (tg://), otherwise t.me in the browser. */
function openTelegram(url: string) {
  const m = /t\.me\/([A-Za-z0-9_]+)/.exec(url);
  if (m && Platform.OS !== 'web') {
    Linking.openURL(`tg://resolve?domain=${m[1]}`).catch(() => void openExternal(url));
    return;
  }
  void openExternal(url);
}

function ContactForm() {
  const { t } = useTranslation();
  const me = useMe();
  const send = useContactMessage();
  const [sent, setSent] = useState(false);
  const form = useForm<ContactMessageFormInput>({
    resolver: zodResolver(contactMessageSchema),
    defaultValues: { type: 'contact', name: '', phone: '', email: '', subject: '', message: '' },
  });
  useEffect(() => {
    if (me.data && !form.getValues('name')) {
      form.reset({
        type: 'contact',
        name: me.data.fullName,
        phone: me.data.phone,
        email: me.data.email ?? '',
        subject: '',
        message: '',
      });
    }
  }, [me.data, form]);

  const onSubmit = form.handleSubmit((v) =>
    send.mutate(
      { ...v, email: v.email || undefined, subject: v.subject || undefined, message: v.message || undefined },
      {
        onSuccess: () => setSent(true),
        onError: (e) => {
          if (!applyServerErrors(form, e)) form.setError('root', { message: errorMessage(t, e) });
        },
      },
    ),
  );

  if (sent) {
    return (
      <View style={{ gap: 12 }}>
        <Notice tone="success" title={t('shop:contact.sent')} />
        <Button
          title={t('contacts.sendAnother')}
          variant="outline"
          onPress={() => {
            form.reset({ ...form.getValues(), subject: '', message: '' });
            setSent(false);
          }}
        />
      </View>
    );
  }

  return (
    <View style={{ gap: 14 }}>
      {form.formState.errors.root?.message ? (
        <Notice tone="danger">{form.formState.errors.root.message}</Notice>
      ) : null}
      <FormTextField
        control={form.control}
        name="name"
        label={t('shop:fields.name')}
        required
        autoComplete="name"
      />
      <FormPhoneField control={form.control} name="phone" label={t('shop:fields.phone')} required />
      <FormTextField
        control={form.control}
        name="email"
        label={t('shop:fields.email')}
        optionalLabel={t('common:labels.optional')}
        keyboardType="email-address"
        autoCapitalize="none"
      />
      <FormTextField
        control={form.control}
        name="subject"
        label={t('shop:fields.subject')}
        optionalLabel={t('common:labels.optional')}
        maxLength={150}
      />
      <FormTextField
        control={form.control}
        name="message"
        label={t('shop:fields.message')}
        multiline
        maxLength={3000}
      />
      <Text variant="caption" color="mutedForeground">
        {t('contacts.privacyNote')}
      </Text>
      <Button
        title={t('common:actions.send')}
        icon={Send}
        size="lg"
        onPress={() => void onSubmit()}
        loading={send.isPending}
      />
    </View>
  );
}

/** Contacts: call, e-mail, Telegram, social, store address on the map, pickup points, message form. */
export function ContactsScreen() {
  const { t } = useTranslation();
  const f = useFormat();
  const { colors } = useTheme();
  const settings = useSettings();
  const points = usePickupPoints();
  const s = settings.data;

  return (
    <ScreenScroll keyboard bottomInset contentContainerStyle={{ gap: 16 }}>
      {settings.isPending ? (
        <Skeleton height={220} radius={14} />
      ) : settings.isError || !s ? (
        <ErrorState compact error={settings.error} onRetry={() => void settings.refetch()} />
      ) : (
        <Card padded={false}>
          <ListRow
            icon={Phone}
            title={f.phone(s.store.phone)}
            subtitle={t('contacts.call')}
            onPress={() => void Linking.openURL(`tel:${s.store.phone}`)}
            chevron={false}
          />
          {s.store.phoneSecondary ? (
            <>
              <Divider inset={66} />
              <ListRow
                icon={Phone}
                title={f.phone(s.store.phoneSecondary)}
                subtitle={t('contacts.call')}
                onPress={() => void Linking.openURL(`tel:${s.store.phoneSecondary}`)}
                chevron={false}
              />
            </>
          ) : null}
          <Divider inset={66} />
          <ListRow
            icon={Mail}
            title={s.store.supportEmail ?? s.store.email}
            subtitle={t('common:labels.email')}
            onPress={() => void Linking.openURL(`mailto:${s.store.supportEmail ?? s.store.email}`)}
            chevron={false}
          />
          {s.social.telegram ? (
            <>
              <Divider inset={66} />
              <ListRow
                icon={Send}
                title="Telegram"
                subtitle={s.social.telegram.replace(/^https?:\/\//, '')}
                onPress={() => openTelegram(s.social.telegram!)}
                chevron={false}
              />
            </>
          ) : null}
          <Divider inset={66} />
          <ListRow
            icon={MapPin}
            title={s.store.address}
            subtitle={s.store.map ? t('shop:contact.map') : undefined}
            onPress={
              s.store.map ? () => openMap(s.store.map!.lat, s.store.map!.lng, s.store.name) : undefined
            }
            chevron={false}
            right={s.store.map ? <Navigation size={18} color={colors.link} /> : undefined}
          />
          <Divider inset={66} />
          <ListRow
            icon={Clock}
            title={s.store.workingHours}
            subtitle={t('common:labels.workingHours')}
            chevron={false}
          />
          {s.social.instagram || s.social.facebook || s.social.youtube ? (
            <View style={styles.social}>
              {s.social.instagram ? (
                <Button
                  title="Instagram"
                  icon={Instagram}
                  variant="outline"
                  size="sm"
                  onPress={() => void openExternal(s.social.instagram!)}
                />
              ) : null}
              {s.social.facebook ? (
                <Button
                  title="Facebook"
                  icon={Facebook}
                  variant="outline"
                  size="sm"
                  onPress={() => void openExternal(s.social.facebook!)}
                />
              ) : null}
              {s.social.youtube ? (
                <Button
                  title="YouTube"
                  icon={Youtube}
                  variant="outline"
                  size="sm"
                  onPress={() => void openExternal(s.social.youtube!)}
                />
              ) : null}
            </View>
          ) : null}
        </Card>
      )}

      {points.data?.length ? (
        <View style={{ gap: 10 }}>
          <Text variant="title3">{t('shop:contact.pickupPoints')}</Text>
          {points.data.map((p) => (
            <Card key={p.id} style={{ gap: 6 }}>
              <Text variant="headline">{p.name}</Text>
              <Text variant="footnote" color="mutedForeground">
                {p.address}
              </Text>
              <Text variant="footnote" color="mutedForeground">
                {p.workingHours}
              </Text>
              <View style={styles.pointActions}>
                <Button
                  title={f.phone(p.phone)}
                  icon={Phone}
                  variant="ghost"
                  size="sm"
                  onPress={() => void Linking.openURL(`tel:${p.phone}`)}
                  style={{ marginLeft: -12 }}
                />
                <Button
                  title={t('contacts.showOnMap')}
                  icon={Navigation}
                  variant="ghost"
                  size="sm"
                  onPress={() => openMap(p.location.lat, p.location.lng, p.name)}
                />
              </View>
            </Card>
          ))}
        </View>
      ) : null}

      <Card style={{ gap: 12 }}>
        <Text variant="title3">{t('shop:contact.formTitle')}</Text>
        <ContactForm />
      </Card>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  social: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, padding: 16, paddingTop: 8 },
  pointActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 4, alignItems: 'center' },
});
