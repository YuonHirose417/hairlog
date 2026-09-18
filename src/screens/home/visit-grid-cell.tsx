import { useRouter } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';

import { PhotoCountBadge, PhotoFrame, Text } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { formatShortDate } from '@/lib/format';
import { showVisitActions } from '@/screens/home/visit-actions';
import type { VisitSummary } from '@/types/models';

export type VisitGridCellProps = {
  visit: VisitSummary;
  /** 親が計算したセルの幅。numColumns と gap から求める */
  width: number;
  /** 削除されたあとに一覧を読み直す */
  onChanged: () => void;
};

/**
 * グリッドの1セル = 1記録。代表写真を1枚だけ出す。
 *
 * 枚数バッジは唯一、写真の上に重ねてよい要素。無彩色の半透明にして
 * 写真の色を邪魔しない（アクセント色は使わない）。
 *
 * 長押しすると最新カードと同じメニュー（見せる / 削除）が出る。
 */
export function VisitGridCell({ visit, width, onChanged }: VisitGridCellProps) {
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${formatShortDate(visit.visitedAt)} の記録を開く`}
      onPress={() => router.push({ pathname: '/visit/[id]', params: { id: visit.id } })}
      onLongPress={() =>
        showVisitActions(visit.id, {
          onShowcase: () => router.push({ pathname: '/showcase/[id]', params: { id: visit.id } }),
          onDeleted: onChanged,
        })
      }
      delayLongPress={400}
      style={({ pressed }) => [{ width }, pressed && styles.pressed]}>
      <PhotoFrame
        uri={visit.coverUri}
        shape="thumb"
        // グリッドは正方形で揃える（3:4 はヒーローカード用）
        aspectRatio={1}>
        <PhotoCountBadge count={visit.photoCount} />
      </PhotoFrame>

      <Text variant="caption" color="textMuted" numberOfLines={1} style={styles.date}>
        {formatShortDate(visit.visitedAt)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  date: {
    marginTop: spacing.xs,
  },
});
