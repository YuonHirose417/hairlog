import { StyleSheet, Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { type ColorName, typography, type TypographyVariant } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type TextProps = RNTextProps & {
  /** タイポグラフィの種類。既定は body */
  variant?: TypographyVariant;
  /** テーマの色名。既定は text */
  color?: ColorName;
  /** 中央寄せ（空状態など） */
  center?: boolean;
};

/**
 * アプリ内の文字はすべてこのコンポーネントを通す。
 * 生の <Text> や、fontSize / fontFamily の直接指定は使わない。
 */
export function Text({
  variant = 'body',
  color = 'text',
  center = false,
  style,
  ...rest
}: TextProps) {
  const c = useTheme();

  return (
    <RNText
      style={[typography[variant], { color: c[color] as string }, center && styles.center, style]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
});
