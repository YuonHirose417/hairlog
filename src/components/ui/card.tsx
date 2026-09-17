import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { SolidSurface } from '@/components/ui/solid-surface';
import { border, depth, radius, spacing } from '@/constants/theme';

export type CardProps = {
  children: React.ReactNode;
  /** 内側の余白を消す。写真をカードいっぱいに敷くときに使う */
  flush?: boolean;
  /** 輪郭を細く弱くし、影も浅くする。情報を並べるだけの箱に使う */
  flat?: boolean;
  /** カードの外側（位置・余白）。影の面を含めた全体にかかる */
  style?: StyleProp<ViewStyle>;
  /** カードの中身の並べ方（gap など） */
  contentStyle?: StyleProp<ViewStyle>;
};

/**
 * 情報をまとめる箱。輪郭とソリッド影を持つ。
 *
 * カードは押せないので沈む動きは付けない（sink は使わない）。
 */
export function Card({
  children,
  flush = false,
  flat = false,
  style,
  contentStyle,
}: CardProps) {
  return (
    <SolidSurface
      background="surface"
      outline={flat ? 'outlineSubtle' : 'outline'}
      borderWidth={flat ? border.hairline : border.bold}
      borderRadius={radius.card}
      depth={flat ? depth.small : depth.solid}
      style={style}
      contentStyle={flush ? styles.flush : styles.padded}>
      <View style={contentStyle}>{children}</View>
    </SolidSurface>
  );
}

const styles = StyleSheet.create({
  padded: { padding: spacing.md, overflow: 'hidden' },
  flush: { padding: 0, overflow: 'hidden' },
});
