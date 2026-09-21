import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { layout, opticalCenterOffset, spacing } from '@/constants/theme';

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
 * 縦のそろえ方は2段構えにしてある。
 *
 * 1. **ラベルと値は同じベースラインに載せる**（`alignItems: 'baseline'`）。
 *    箱の高さが 22 と 18 で違っても、文字の足元がそろうので互いのずれが
 *    構造的に消える。中央そろえ（`'center'`）だと箱の中心が合うだけで、
 *    文字の位置は字の大きさによってずれる。
 * 2. **その一組を、行（44）の中でまとめて上下中央に置く。**
 *
 * **補正は必ず一組まとめて掛けること。** Text ごとに掛けると variant で量が
 * 変わり（body 1.76 / caption 1.08）、そろえたベースラインが 0.68 ぶん崩れる。
 * 以前はそれが原因でラベルと ↗ の高さが食い違っていた。
 */
export function ListRow({ label, value, onPress }: ListRowProps) {
  const content = (
    <View style={styles.row}>
      <View style={styles.line}>
        <Text variant="body">{label}</Text>
        {value ? (
          <Text variant="caption" color="textMuted">
            {value}
          </Text>
        ) : null}
      </View>
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
    // 高さは minTouchTarget（44）。押せる行があるのでタップ領域の下限を満たす。
    // 2行とも同じ部品・同じ指定なので、高さと余白は必ず一致する
    minHeight: layout.minTouchTarget,
    justifyContent: 'center',
    // ラベルが折り返したときの保険。1行なら minHeight が効く
    paddingVertical: spacing.xs,
  },
  line: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: spacing.sm,
    /**
     * 丸ゴシックは lineHeight の余りが文字の上側に入るため、箱の中央が
     * 見た目の中央にならない。**flex は箱しか見ないので、ここだけは
     * レイアウトでは解けない。** 一組まとめて戻す。
     *
     * 使うのは body の値。ベースラインの位置を決めているのが、いちばん背の
     * 高い body の文字だから。
     */
    transform: [{ translateY: -opticalCenterOffset.body }],
  },
  pressed: { opacity: 0.6 },
});
