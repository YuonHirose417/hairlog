import { Pressable, StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui/text';
import { border, layout, opticalCenterOffset, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ListRowProps = {
  label: string;
  /** 右端に出す値。「1.0.0」「準備中」など。無ければ山形だけになる */
  value?: string;
  /** 押せる行にする。省略すると表示だけの行になり、山形も出ない */
  onPress?: () => void;
};

/**
 * 開くことを示す山形（›）。
 *
 * **文字ではなく View で描く。** ↗ や › をフォントの文字で出すと、記号の
 * グリフは漢字やかなと別の基準で設計されているため、どれだけ正確に
 * そろえても 1px 前後ずれて見える。形を幾何学的に決めてしまえば、
 * グリフ由来のずれが原理的に発生しない。
 *
 * borderWidth を使っているが、これは**アイコンの形を描く手段**であって、
 * CLAUDE.md §10 が制限している「面の装飾としての輪郭」ではない。
 */
function Chevron() {
  const c = useTheme();

  return (
    <View
      style={[
        styles.chevron,
        { borderColor: c.textFaint },
      ]}
    />
  );
}

/**
 * ラベルと値を左右に置く行。設定や購入画面の一覧に使う。
 *
 * **上下のずれが起きない作りにしてある:**
 *
 * - ラベルと値は**同じ variant（body）**。字の大きさが同じならメトリクスも
 *   同じなので、上下位置は計算なしで一致する。強弱は色だけでつける
 * - 右端の山形は View なので、flex で正確に中央へ置ける
 * - 中央補正は**文字にだけ**掛ける。山形は View なので不要で、掛けると逆にずれる
 */
export function ListRow({ label, value, onPress }: ListRowProps) {
  const content = (
    <View style={styles.row}>
      <View style={styles.line}>
        <Text variant="body" style={styles.optical}>
          {label}
        </Text>

        <View style={styles.trailing}>
          {value ? (
            <Text variant="body" color="textMuted" style={styles.optical}>
              {value}
            </Text>
          ) : null}
          {/* 押せる行＝開く行。判定を増やさず onPress の有無で出し分ける */}
          {onPress ? <Chevron /> : null}
        </View>
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
    // 押せる行があるので 44 を下回らせないこと。
    // どの行も同じ部品・同じ指定なので、高さと余白は必ず一致する
    minHeight: layout.listRowHeight,
    justifyContent: 'center',
    // ラベルが折り返したときの保険。1行なら minHeight が効く
    paddingVertical: spacing.sm,
  },
  line: {
    flexDirection: 'row',
    // ラベルと値が同じ variant なので、箱の高さも中身の位置も一致する。
    // 山形は View なので baseline ではなく center でそろえる
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  /**
   * 丸ゴシックは lineHeight の余りが文字の上側に入るため、箱の中央が見た目の
   * 中央にならない。**文字にだけ**掛ける。ラベルと値は同じ variant なので
   * 同じ量が掛かり、互いのそろいは崩れない。
   */
  optical: {
    transform: [{ translateY: -opticalCenterOffset.body }],
  },
  chevron: {
    width: layout.chevronSize,
    height: layout.chevronSize,
    borderRightWidth: border.bold,
    borderTopWidth: border.bold,
    transform: [{ rotate: '45deg' }],
  },
  pressed: { opacity: 0.6 },
});
