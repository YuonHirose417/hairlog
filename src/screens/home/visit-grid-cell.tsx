import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';

import { PhotoFrame, Text } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { formatShortDate } from '@/lib/format';
import type { VisitSummary } from '@/types/models';

export type VisitGridCellProps = {
  visit: VisitSummary;
  /** 親が計算したセルの幅。numColumns と gap から求める */
  width: number;
};

/**
 * グリッドの1セル = 1記録。代表写真を1枚だけ出す。
 *
 * 枚数バッジは唯一、写真の上に重ねてよい要素。無彩色の半透明にして
 * 写真の色を邪魔しない（アクセント色は使わない）。
 */
export function VisitGridCell({ visit, width }: VisitGridCellProps) {
  const router = useRouter();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${formatShortDate(visit.visitedAt)} の記録を開く`}
      onPress={() => router.push({ pathname: '/visit/[id]', params: { id: visit.id } })}
      style={({ pressed }) => [{ width }, pressed && styles.pressed]}>
      <PhotoFrame
        uri={visit.coverUri}
        shape="thumb"
        // グリッドは正方形で揃える（3:4 はヒーローカード用）
        aspectRatio={1}>
        {visit.photoCount > 1 ? (
          <View style={styles.badge}>
            <Text variant="caption" style={styles.badgeText}>
              {visit.photoCount}
            </Text>
          </View>
        ) : null}
      </PhotoFrame>

      <Text variant="caption" color="textFaint" numberOfLines={1} style={styles.date}>
        {formatShortDate(visit.visitedAt)}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.7 },
  badge: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    minWidth: 20,
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    // テーマに依らず写真の上で読めるよう、無彩色の半透明を直接指定する
    backgroundColor: 'rgba(0, 0, 0, 0.55)',
  },
  badgeText: {
    color: '#FFFFFF',
  },
  date: {
    marginTop: spacing.xs,
  },
});
