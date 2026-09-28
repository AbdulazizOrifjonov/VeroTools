import { zodResolver } from '@hookform/resolvers/zod';
import { isApiError, useCreateReview, useSession, useUploadReviewImages } from '@vero/api-client';
import { LIMITS } from '@vero/config';
import { createReviewSchema, type CreateReviewInput } from '@vero/validation';
import { useEffect, useLayoutEffect, useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';
import { applyServerErrors } from '../../lib/errors';
import { cameraAvailable, pickImages, type PickedImage, type PickError } from '../../lib/files';
import { haptic } from '../../lib/haptics';
import { errorMessage, translateValidation } from '../../lib/i18n';
import { toast } from '../../lib/toast';
import type { RootScreenProps } from '../../navigation/types';
import { useTheme } from '../../theme/theme';
import {
  Button,
  Card,
  FormTextField,
  IconButton,
  Notice,
  RatingInput,
  ScreenScroll,
  SmartImage,
  Text,
} from '../../ui';
import { Camera, CircleAlert, ImagePlus, X } from '../../ui/icons';

/** Review form: stars, title, text, pros / cons and up to 5 photos (uploaded first, then attached by id). */
export function WriteReviewScreen({ navigation, route }: RootScreenProps<'WriteReview'>) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const { isAuthenticated, isReady } = useSession();
  const upload = useUploadReviewImages();
  const create = useCreateReview();
  const { productId, name } = route.params;
  const [photos, setPhotos] = useState<PickedImage[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const form = useForm<CreateReviewInput>({
    resolver: zodResolver(createReviewSchema),
    defaultValues: { productId, rating: 0, title: '', comment: '', pros: '', cons: '' },
  });

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => null,
      headerRight: () => (
        <IconButton
          icon={X}
          label={t('common:actions.close')}
          size={40}
          onPress={() => navigation.goBack()}
        />
      ),
    });
  }, [navigation, t]);

  useEffect(() => {
    if (isReady && !isAuthenticated) navigation.replace('Login');
  }, [isReady, isAuthenticated, navigation]);

  const addPhotos = async (camera: boolean) => {
    try {
      const left = LIMITS.reviewImagesMax - photos.length;
      if (left <= 0) return;
      const picked = await pickImages({
        camera,
        multiple: !camera,
        limit: left,
        maxBytes: LIMITS.reviewImageMaxBytes,
      });
      if (picked) setPhotos((p) => [...p, ...picked].slice(0, LIMITS.reviewImagesMax));
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

  const onSubmit = form.handleSubmit(async (v) => {
    setFormError(null);
    try {
      const images = photos.length
        ? (await upload.mutateAsync(photos.map((p) => p.file)))
            .map((i) => i.id)
            .filter((id): id is string => !!id)
        : undefined;
      await create.mutateAsync({
        ...v,
        productId,
        images,
        title: v.title || undefined,
        pros: v.pros || undefined,
        cons: v.cons || undefined,
      });
      haptic.success();
      toast.success(t('shop:reviews.submitted'));
      navigation.goBack();
    } catch (e) {
      if (isApiError(e) && e.code === 'REVIEW_EXISTS') {
        setFormError(t('shop:reviews.alreadyReviewed'));
        return;
      }
      if (!applyServerErrors(form, e)) setFormError(errorMessage(t, e));
    }
  });

  const busy = upload.isPending || create.isPending;

  return (
    <ScreenScroll keyboard bottomInset contentContainerStyle={{ gap: 16 }}>
      <View style={{ gap: 4 }}>
        <Text variant="title3">{t('shop:reviews.write')}</Text>
        <Text variant="footnote" color="mutedForeground" numberOfLines={2}>
          {name}
        </Text>
      </View>
      {formError ? (
        <Notice tone="danger" icon={CircleAlert}>
          {formError}
        </Notice>
      ) : null}
      <Card style={{ gap: 8, alignItems: 'center' }}>
        <Text variant="headline">{t('shop:reviews.yourRating')}</Text>
        <Controller
          control={form.control}
          name="rating"
          render={({ field, fieldState }) => (
            <View style={{ alignItems: 'center', gap: 4 }}>
              <RatingInput
                value={Number(field.value) || 0}
                onChange={field.onChange}
                error={!!fieldState.error}
              />
              <Text variant="footnote" color={fieldState.error ? 'danger' : 'mutedForeground'}>
                {fieldState.error
                  ? translateValidation(t, 'validation.rating')
                  : field.value
                    ? t(`shop:reviews.ratingLabels.${field.value}`)
                    : ' '}
              </Text>
            </View>
          )}
        />
      </Card>
      <FormTextField
        control={form.control}
        name="title"
        label={t('shop:reviews.fieldTitle')}
        optionalLabel={t('common:labels.optional')}
        maxLength={120}
      />
      <FormTextField
        control={form.control}
        name="comment"
        label={t('shop:reviews.fieldComment')}
        required
        placeholder={t('shop:reviews.commentPlaceholder')}
        multiline
        maxLength={2000}
      />
      <FormTextField
        control={form.control}
        name="pros"
        label={t('shop:reviews.fieldPros')}
        optionalLabel={t('common:labels.optional')}
        multiline
        maxLength={500}
      />
      <FormTextField
        control={form.control}
        name="cons"
        label={t('shop:reviews.fieldCons')}
        optionalLabel={t('common:labels.optional')}
        multiline
        maxLength={500}
      />

      <View style={{ gap: 10 }}>
        <Text variant="subhead" weight="semibold">
          {t('shop:reviews.fieldPhotos')}
        </Text>
        <View style={styles.photos}>
          {photos.map((p, i) => (
            <View key={`${p.uri}-${i}`}>
              <SmartImage uri={p.uri} well={false} contentFit="cover" style={styles.photo} />
              <IconButton
                icon={X}
                label={t('common:actions.remove')}
                variant="overlay"
                size={26}
                iconSize={14}
                style={styles.remove}
                onPress={() => setPhotos((list) => list.filter((_, j) => j !== i))}
              />
            </View>
          ))}
          {photos.length < LIMITS.reviewImagesMax ? (
            <>
              <Pressable
                onPress={() => void addPhotos(false)}
                accessibilityRole="button"
                accessibilityLabel={t('profile.chooseFromLibrary')}
                style={[styles.add, { borderColor: colors.input }]}
              >
                <ImagePlus size={22} color={colors.mutedForeground} />
              </Pressable>
              {cameraAvailable ? (
                <Pressable
                  onPress={() => void addPhotos(true)}
                  accessibilityRole="button"
                  accessibilityLabel={t('profile.takePhoto')}
                  style={[styles.add, { borderColor: colors.input }]}
                >
                  <Camera size={22} color={colors.mutedForeground} />
                </Pressable>
              ) : null}
            </>
          ) : null}
        </View>
      </View>

      <Button title={t('common:actions.submit')} size="lg" onPress={() => void onSubmit()} loading={busy} />
      <Text variant="caption" color="mutedForeground" align="center">
        {t('reviews.moderationNote')}
      </Text>
    </ScreenScroll>
  );
}

const styles = StyleSheet.create({
  photos: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  photo: { width: 76, height: 76, borderRadius: 12 },
  remove: { position: 'absolute', top: -8, right: -8 },
  add: {
    width: 76,
    height: 76,
    borderRadius: 12,
    borderWidth: 1.5,
    borderStyle: 'dashed',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
