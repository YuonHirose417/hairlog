import { useRouter } from 'expo-router';
import { FlatList, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { BLUR_HEADER_HEIGHT, BlurHeader, EmptyState, Fab, Text } from '@/components/ui';
import { DEV_SKIP_PAYWALL } from '@/constants/dev';
import { FREE_VISIT_LIMIT, layout, screenPadding, spacing } from '@/constants/theme';
import { useEntitlement } from '@/hooks/use-entitlement';
import { useTheme } from '@/hooks/use-theme';
import { useVisits } from '@/hooks/use-visits';
import { DevSeed } from '@/screens/home/dev-seed';
import { HeroCard } from '@/screens/home/hero-card';
import { VisitGridCell } from '@/screens/home/visit-grid-cell';
import type { VisitSummary } from '@/types/models';

export function Home() {
  const c = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const { visits, count, loading, reload } = useVisits();
  const { isPro } = useEntitlement();

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
      <BlurHeader title="hairlog" />

      <FlatList
        data={rest}
        renderItem={renderCell}
        keyExtractor={(item) => item.id}
        numColumns={layout.gridColumns}
        columnWrapperStyle={styles.column}
        contentContainerStyle={[
          styles.content,
          {
            // ヘッダーはリストに重なっているので、その分だけ内容を下げる
            paddingTop: insets.top + BLUR_HEADER_HEIGHT + spacing.lg,
            paddingBottom: insets.bottom + spacing.xxl * 2,
          },
        ]}
        ListHeaderComponent={
          <View>
            {__DEV__ ? <DevSeed existingCount={count} onChanged={reload} /> : null}
            {__DEV__ && DEV_SKIP_PAYWALL ? (
              <Text variant="caption" color="danger" style={styles.devNotice}>
                無料枠の判定をスキップ中（constants/dev.ts）
              </Text>
            ) : null}
            {latest ? <HeroCard visit={latest} /> : null}
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
