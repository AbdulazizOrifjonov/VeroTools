import { FlashList } from '@shopify/flash-list';
import { useApi, useAskQuestion, useSession } from '@vero/api-client';
import { uniqueBy } from '@vero/utils';
import { createQuestionSchema } from '@vero/validation';
import { useInfiniteQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, KeyboardAvoidingView, Platform, StyleSheet, View } from 'react-native';
import { errorMessage, translateValidation } from '../../lib/i18n';
import { toast } from '../../lib/toast';
import type { RootScreenProps } from '../../navigation/types';
import { useTheme } from '../../theme/theme';
import { QuestionItem } from '../../features/product/ReviewItems';
import { BottomBar, Button, EmptyState, ErrorState, Notice, Skeleton, Text, TextField } from '../../ui';
import { MessageSquareText } from '../../ui/icons';

/** Product questions & answers with the "ask a question" form (moderated). */
export function QuestionsScreen({ navigation, route }: RootScreenProps<'Questions'>) {
  const { t } = useTranslation();
  const { colors } = useTheme();
  const api = useApi();
  const { isAuthenticated } = useSession();
  const ask = useAskQuestion();
  const { productId, name } = route.params;
  const [text, setText] = useState('');
  const [error, setError] = useState<string | undefined>();
  const [sent, setSent] = useState(false);

  const questions = useInfiniteQuery({
    queryKey: ['questions', productId, { infinite: true }],
    queryFn: ({ pageParam }) => api.catalog.questions(productId, { page: pageParam, limit: 15 }),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.meta.page < last.meta.pages ? last.meta.page + 1 : undefined),
  });
  const items = useMemo(
    () => uniqueBy(questions.data?.pages.flatMap((p) => p.items) ?? [], (q) => q.id),
    [questions.data],
  );

  const submit = () => {
    const parsed = createQuestionSchema.safeParse({ productId, question: text });
    if (!parsed.success) {
      setError(
        translateValidation(
          t,
          parsed.error.issues.find((i) => i.path[0] === 'question')?.message ??
            parsed.error.issues[0]?.message,
        ),
      );
      return;
    }
    setError(undefined);
    ask.mutate(parsed.data, {
      onSuccess: () => {
        setText('');
        setSent(true);
        toast.success(t('shop:questions.submitted'));
      },
      onError: (e) => setError(errorMessage(t, e)),
    });
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={100}
    >
      {questions.isPending ? (
        <View style={{ padding: 16, gap: 12 }}>
          <Skeleton height={80} />
          <Skeleton height={80} />
        </View>
      ) : questions.isError && !items.length ? (
        <ErrorState error={questions.error} onRetry={() => void questions.refetch()} />
      ) : (
        <FlashList
          data={items}
          keyExtractor={(q) => q.id}
          renderItem={({ item }) => <QuestionItem question={item} />}
          ListHeaderComponent={
            <Text variant="footnote" color="mutedForeground" numberOfLines={2} style={{ paddingTop: 12 }}>
              {name}
            </Text>
          }
          ListEmptyComponent={
            <EmptyState compact icon={MessageSquareText} title={t('shop:questions.empty')} />
          }
          ListFooterComponent={
            questions.isFetchingNextPage ? (
              <View style={{ paddingVertical: 20 }}>
                <ActivityIndicator color={colors.link} />
              </View>
            ) : null
          }
          onEndReached={() => {
            if (questions.hasNextPage && !questions.isFetchingNextPage) void questions.fetchNextPage();
          }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 16 }}
          keyboardShouldPersistTaps="handled"
        />
      )}
      <BottomBar style={styles.bar}>
        {isAuthenticated ? (
          <View style={{ flex: 1, gap: 8 }}>
            {sent ? <Notice tone="success">{t('shop:questions.submitted')}</Notice> : null}
            <TextField
              value={text}
              onChangeText={(v) => {
                setText(v);
                setError(undefined);
                setSent(false);
              }}
              placeholder={t('shop:questions.placeholder')}
              multiline
              maxLength={1000}
              error={error}
              accessibilityLabel={t('shop:questions.ask')}
              inputStyle={{ minHeight: 64 }}
            />
            <Button
              title={t('shop:questions.ask')}
              onPress={submit}
              loading={ask.isPending}
              disabled={!text.trim()}
            />
          </View>
        ) : (
          <Button
            title={t('shop:questions.loginToAsk')}
            style={{ flex: 1 }}
            onPress={() => navigation.navigate('Login')}
          />
        )}
      </BottomBar>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  bar: { alignItems: 'flex-start' },
});
