import { useRouter } from 'expo-router';
import { useState } from 'react';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { Keyframe, ReduceMotion } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BLUR_HEADER_HEIGHT, BlurHeader, EmptyState, Fab, IconButton, Text } from '@/components/ui';
import { DEV_SKIP_PAYWALL } from '@/constants/dev';
import { depth, FREE_VISIT_LIMIT, layout, motion, screenPadding, spacing } from '@/constants/theme';
import { useEntitlement } from '@/hooks/use-entitlement';
import { useTheme } from '@/hooks/use-theme';
import { useVisits } from '@/hooks/use-visits';
import { HeroCard } from '@/screens/home/hero-card';
import { ReminderBanner } from '@/screens/home/reminder-banner';
import { VisitGridCell } from '@/screens/home/visit-grid-cell';
import type { VisitSummary } from '@/types/models';

/** 保存した記録がホームに現れるときの動き。scale(0) からは始めない */
const heroEntrance = new Keyframe({
  0: { opacity: 0, transform: [{ scale: 0.95 }] },
  100: { opacity: 1, transform: [{ scale: 1 }] },
})
  .duration(motion.duration.base)
  .reduceMotion(ReduceMotion.System);

export function Home() {
  const c = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const { visits, count, loading } = useVisits();
  const { isPro } = useEntitlement();

  // ヘッダーはリストに重なっているので、その実測の高さだけ中身を下げる。
  // 実測が来るまでは見積もりを使い、初回のちらつきを防ぐ
  const [headerHeight, setHeaderHeight] = useState(insets.top + BLUR_HEADER_HEIGHT);

  // グリッドの列幅を先に決める。FlatList の numColumns は各セルに幅を配らないため
  const gridWidth = width - screenPadding * 2;
  const cellWidth =
    (gridWidth - layout.gridGap * (layout.gridColumns - 1)) / layout.gridColumns;

  const latest = visits[0] ?? null;
  const rest = visits.slice(1);

  /**
   * 無料枠は件数だけでなく購入状態も見る。
   * 購入済みなら件数に関係なく記録追加へ進める。
   */
  function handleAdd() {
    const overFreeLimit = !isPro && count >= FREE_VISIT_LIMIT;
    if (overFreeLimit && !DEV_SKIP_PAYWALL) {
      router.push('/settings/paywall');
      return;
    }
    router.push('/add');
  }

  function renderCell({ item }: { item: VisitSummary }) {
    return <VisitGridCell visit={item} width={cellWidth} />;
  }

  return (
    <View style={[styles.container, { backgroundColor: c.background }]}>
      <BlurHeader
        title="hairlog"
        onHeightChange={setHeaderHeight}
        right={
          <IconButton accessibilityLabel="設定" onPress={() => router.push('/settings')}>
            <Text variant="subhead" color="textMuted">
              ⚙
            </Text>
          </IconButton>
        }
      />

      <FlatList
        data={rest}
        renderItem={renderCell}
        keyExtractor={(item) => item.id}
        numColumns={layout.gridColumns}
        columnWrapperStyle={styles.column}
        contentContainerStyle={[
          styles.content,
          {
            paddingTop: headerHeight + spacing.lg,
            // ＋ボタンの上端からさらに spacing.xl 空ける。
            // 最後の行の日付がボタンに隠れないようにするため
            paddingBottom:
              insets.bottom +
              layout.fabInset +
              layout.fabSize +
              depth.solid +
              spacing.xl,
          },
        ]}
        ListHeaderComponent={
          <View>
            {__DEV__ && DEV_SKIP_PAYWALL ? (
              <Text variant="caption" color="danger" style={styles.devNotice}>
                無料枠の判定をスキップ中（constants/dev.ts）
              </Text>
            ) : null}
            {latest ? (
              // key を記録の id にして、新しく保存されたときだけ再生させる。
              // ListHeaderComponent は仮想化リストの行ではないので entering を使ってよい
              <Animated.View key={latest.id} entering={heroEntrance}>
                <HeroCard visit={latest} />
              </Animated.View>
            ) : null}
            {/* 最新カードの下。未登録なら控えめな1行、登録済みなら日時をはっきり */}
            <ReminderBanner />

            {/* グリッドが空のときは見出しだけが浮くので出さない */}
            {rest.length > 0 ? (
              <Text variant="caption" color="textMuted" style={styles.gridHeading}>
                これまでの髪型
              </Text>
            ) : null}
          </View>
        }
        ListEmptyComponent={
          // 読み込み中に一瞬「記録がありません」が出るのを防ぐ
          loading || latest ? null : (
            // EmptyState は flex:1 で中央寄せするため、高さを与える器が要る
            <View style={styles.empty}>
              <EmptyState
                title="まだ記録がありません"
                description="美容院でカットしたあとに、最初の1枚を撮ってみましょう。"
                actionLabel="写真を撮る"
                onAction={handleAdd}
              />
            </View>
          )
        }
      />

      <Fab onPress={handleAdd} accessibilityLabel="髪型を記録する" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    paddingHorizontal: screenPadding,
  },
  column: {
    gap: layout.gridGap,
    marginBottom: layout.gridGap + spacing.md,
  },
  devNotice: {
    marginBottom: spacing.md,
  },
  empty: {
    minHeight: 420,
  },
  gridHeading: {
    marginBottom: spacing.sm,
  },
});
