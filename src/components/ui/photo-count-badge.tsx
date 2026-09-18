import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { border, radius, spacing, sticker } from '@/constants/theme';

export type PhotoCountBadgeProps = {
  count: number;
  /** 写真の端からの距離。グリッドは詰め気味、大きなカードは少し離す */
  inset?: number;
};

/**
 * 写真の枚数を示すシール風のバッジ。
 *
 * **写真の上に乗せてよい唯一の要素。** そのためアクセント色（イエロー・ネイビー）は
 * 使わず、白フチ + 暗い無彩色の sticker トークンだけで作り、髪色の見え方に
 * 干渉させない。
 *
 * **2枚以上のときだけ描画する。** 判定をここに閉じ込め、呼び出し側に散らさない。
 */
export function PhotoCountBadge({ count, inset = spacing.xs }: PhotoCountBadgeProps) {
  if (count <= 1) return null;

  return (
    <View style={[styles.badge, { top: inset, right: inset }]}>
      <Text variant="caption" style={styles.text}>
        {count}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    position: 'absolute',
    minWidth: 22,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 1,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: sticker.background,
    borderWidth: border.bold,
    borderColor: sticker.border,
  },
  text: {
    color: sticker.text,
  },
});
