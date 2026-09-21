import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { layout, spacing } from '@/constants/theme';

export type ListRowProps = {
  label: string;
  /** 右端に出す値。「準備中」「↗」「1.0.0」など */
  value?: string;
  /** 押せる行にする。省略すると表示だけの行になる */
  onPress?: () => void;
};

/**
 * ラベルと値を左右に置く行。設定や購入画面の一覧に使う。
 *
 * 文字は opticalCenter を付けて**見た目の上下中央**にそろえる。丸ゴシックは
 * lineHeight の余りが上側に入るため、alignItems: 'center' だけでは下に寄る。
 *
 * 高さは minTouchTarget（44）。押せる行があるので、タップ領域の下限を満たす。
 */
export function ListRow({ label, value, onPress }: ListRowProps) {
  const content = (
    <View style={styles.row}>
      <Text variant="body" opticalCenter>
        {label}
      </Text>
      {value ? (
        <Text variant="caption" color="textMuted" opticalCenter>
          {value}
        </Text>
      ) : null}
    </View>
  );

  if (!onPress) return content;

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => pressed && styles.pressed}>
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: layout.minTouchTarget,
    // ラベルが折り返したときの保険。1行なら minHeight が効く
    paddingVertical: spacing.xs,
    gap: spacing.sm,
  },
  pressed: { opacity: 0.6 },
});
