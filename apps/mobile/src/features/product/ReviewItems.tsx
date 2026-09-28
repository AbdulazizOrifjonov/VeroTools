import type { ProductQuestionDTO, ReviewDTO } from '@vero/types';
import { getInitials } from '@vero/utils';
import { memo } from 'react';
import { useTranslation } from 'react-i18next';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useFormat } from '../../lib/format';
import { useTheme } from '../../theme/theme';
import { Badge, RatingStars, SmartImage, Text } from '../../ui';
import { BadgeCheck, MessageSquareText } from '../../ui/icons';

/** Average, count and 5→1 star distribution bars. */
export const RatingSummary = memo(function RatingSummary({
  average,
  count,
  distribution,
  onFilter,
  activeRating,
}: {
  average: number;
  count: number;
  distribution: Record<'1' | '2' | '3' | '4' | '5', number>;
  onFilter?: (rating: number | undefined) => void;
  activeRating?: number;
}) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const max = Math.max(1, ...Object.values(distribution));
  return (
    <View style={styles.summary}>
      <View style={styles.avgBox}>
        <Text variant="display" tabular>
          {average ? average.toFixed(1) : '—'}
        </Text>
        <RatingStars value={average} size={15} />
        <Text variant="footnote" color="mutedForeground" align="center">
          {t('shop:reviews.basedOn', { count })}
        </Text>
      </View>
      <View style={styles.bars}>
        {(['5', '4', '3', '2', '1'] as const).map((star) => {
          const n = distribution[star] ?? 0;
          const active = activeRating === Number(star);
          return (
            <Pressable
              key={star}
              disabled={!onFilter || n === 0}
              onPress={() => onFilter?.(active ? undefined : Number(star))}
              accessibilityRole={onFilter ? 'button' : undefined}
              accessibilityState={{ selected: active }}
              accessibilityLabel={t('product.filterByStars', { count: Number(star), reviews: n })}
              style={[styles.barRow, active && { backgroundColor: colors.brandSoft, borderRadius: 6 }]}
            >
              <Text variant="footnote" weight="semibold" tabular style={{ width: 12 }}>
                {star}
              </Text>
              <View style={[styles.barTrack, { backgroundColor: colors.fill }]}>
                <View
                  style={[styles.barFill, { width: `${(n / max) * 100}%`, backgroundColor: colors.rating }]}
                />
              </View>
              <Text
                variant="footnote"
                color="mutedForeground"
                tabular
                style={{ width: 28, textAlign: 'right' }}
              >
                {n}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
});

/** One review: author, verified badge, stars, text, pros / cons, photos, store reply. */
export const ReviewItem = memo(function ReviewItem({
  review,
  onOpenPhoto,
}: {
  review: ReviewDTO;
  onOpenPhoto?: (url: string) => void;
}) {
  const { t } = useTranslation();
  const f = useFormat();
  const { colors } = useTheme();
  return (
    <View style={[styles.review, { borderBottomColor: colors.border }]}>
      <View style={styles.reviewHead}>
        <View style={[styles.avatar, { backgroundColor: colors.fill }]}>
          {review.author.avatar ? (
            <SmartImage
              uri={review.author.avatar}
              well={false}
              contentFit="cover"
              style={StyleSheet.absoluteFill}
            />
          ) : (
            <Text variant="subhead" weight="bold" color="mutedForeground">
              {getInitials(review.author.name)}
            </Text>
          )}
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text variant="subhead" weight="bold">
            {review.author.name}
          </Text>
          <View style={styles.metaRow}>
            <RatingStars value={review.rating} size={12} />
            <Text variant="caption" color="mutedForeground">
              {f.date(review.createdAt, 'short')}
            </Text>
          </View>
        </View>
        {review.isVerifiedPurchase ? (
          <Badge label={t('common:product.verifiedPurchase')} tone="success" icon={BadgeCheck} size="sm" />
        ) : null}
      </View>
      {review.title ? <Text variant="headline">{review.title}</Text> : null}
      <Text variant="callout">{review.comment}</Text>
      {review.pros ? (
        <Text variant="callout">
          <Text variant="callout" weight="bold" color="success">
            {`${t('shop:reviews.pros')} `}
          </Text>
          {review.pros}
        </Text>
      ) : null}
      {review.cons ? (
        <Text variant="callout">
          <Text variant="callout" weight="bold" color="danger">
            {`${t('shop:reviews.cons')} `}
          </Text>
          {review.cons}
        </Text>
      ) : null}
      {review.images.length ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
          {review.images.map((img, i) => (
            <Pressable
              key={img.id ?? `${img.url}-${i}`}
              onPress={() => onOpenPhoto?.(img.url)}
              disabled={!onOpenPhoto}
              accessibilityRole="imagebutton"
              accessibilityLabel={`${t('shop:product.photos')} ${i + 1}`}
            >
              <SmartImage image={img} size="thumb" style={styles.photo} contentFit="cover" />
            </Pressable>
          ))}
        </ScrollView>
      ) : null}
      {review.reply ? (
        <View style={[styles.reply, { backgroundColor: colors.surface, borderLeftColor: colors.primary }]}>
          <View style={styles.metaRow}>
            <MessageSquareText size={14} color={colors.link} />
            <Text variant="footnote" weight="bold" color="link">
              {t('shop:reviews.storeReply')}
            </Text>
            <Text variant="caption" color="mutedForeground">
              {f.date(review.reply.createdAt, 'short')}
            </Text>
          </View>
          <Text variant="callout">{review.reply.text}</Text>
        </View>
      ) : null}
    </View>
  );
});

export const QuestionItem = memo(function QuestionItem({ question }: { question: ProductQuestionDTO }) {
  const { t } = useTranslation();
  const f = useFormat();
  const { colors } = useTheme();
  return (
    <View style={[styles.review, { borderBottomColor: colors.border }]}>
      <View style={styles.metaRow}>
        <Text variant="subhead" weight="bold">
          {question.author.name}
        </Text>
        <Text variant="caption" color="mutedForeground">
          {f.date(question.createdAt, 'short')}
        </Text>
      </View>
      <Text variant="callout" weight="medium">
        {question.question}
      </Text>
      {question.answer ? (
        <View style={[styles.reply, { backgroundColor: colors.surface, borderLeftColor: colors.primary }]}>
          <View style={styles.metaRow}>
            <Text variant="footnote" weight="bold" color="link">
              {t('shop:questions.answer')} · {question.answer.author}
            </Text>
            <Text variant="caption" color="mutedForeground">
              {f.date(question.answer.createdAt, 'short')}
            </Text>
          </View>
          <Text variant="callout">{question.answer.text}</Text>
        </View>
      ) : null}
    </View>
  );
});

const styles = StyleSheet.create({
  summary: { flexDirection: 'row', gap: 18, alignItems: 'center' },
  avgBox: { alignItems: 'center', gap: 4, width: 104 },
  bars: { flex: 1, gap: 2 },
  barRow: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 26, paddingHorizontal: 4 },
  barTrack: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  review: { gap: 8, paddingVertical: 16, borderBottomWidth: StyleSheet.hairlineWidth },
  reviewHead: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  photo: { width: 72, height: 72, borderRadius: 10 },
  reply: { gap: 4, padding: 12, borderRadius: 10, borderLeftWidth: 3 },
});
