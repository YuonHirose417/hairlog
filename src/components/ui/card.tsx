import { StyleSheet, View, type StyleProp, type ViewProps, type ViewStyle } from 'react-native';

import { radius, shadow, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type CardProps = ViewProps & {
  /** 内側の余白を消す。写真をカードいっぱいに敷くときに使う */
  flush?: boolean;
  /** 影を消して枠線だけにする */
  flat?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Card({ flush = false, flat = false, style, ...rest }: CardProps) {
  const c = useTheme();

  return (
    <View
      style={[
        styles.base,
        { backgroundColor: c.surface },
        flush ? styles.flush : styles.padded,
        flat ? { borderWidth: StyleSheet.hairlineWidth, borderColor: c.border } : shadow.soft,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  base: {
    borderRadius: radius.card,
    overflow: 'hidden',
  },
  padded: { padding: spacing.md },
  flush: { padding: 0 },
});
