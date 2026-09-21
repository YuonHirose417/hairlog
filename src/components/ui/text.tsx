import { StyleSheet, Text as RNText, type TextProps as RNTextProps } from 'react-native';

import {
  type ColorName,
  opticalCenterOffset,
  typography,
  type TypographyVariant,
} from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type TextProps = RNTextProps & {
  /** タイポグラフィの種類。既定は body */
  variant?: TypographyVariant;
  /** テーマの色名。既定は text */
  color?: ColorName;
  /** 中央寄せ（空状態など） */
  center?: boolean;
  /**
   * 行の中で**上下中央に見える**よう、文字を少し持ち上げる。
   *
   * M PLUS Rounded 1c は lineHeight の余りが上側に入るため、alignItems: 'center'
   * だけでは字が下に寄る。ListRow のように箱の中央に置く場面で使う。
   *
   * **既定は false。** 全体に効かせると既存の段組みまで動くので、必要な場所だけ。
   * 補正量は constants/theme.ts の opticalCenterOffset が持つ。
   */
  opticalCenter?: boolean;
};

/**
 * アプリ内の文字はすべてこのコンポーネントを通す。
 * 生の <Text> や、fontSize / fontFamily の直接指定は使わない。
 */
export function Text({
  variant = 'body',
  color = 'text',
  center = false,
  opticalCenter = false,
  style,
  ...rest
}: TextProps) {
  const c = useTheme();

  return (
    <RNText
      style={[
        typography[variant],
        { color: c[color] as string },
        center && styles.center,
        // transform なのでレイアウトは動かさず、見た目だけ上げる
        opticalCenter && { transform: [{ translateY: -opticalCenterOffset[variant] }] },
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  center: { textAlign: 'center' },
});
