import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { showcase, typography } from '@/constants/theme';

type ShowcaseVariant = 'caption' | 'memo';

export type ShowcaseTextProps = RNTextProps & {
  variant?: ShowcaseVariant;
  /** 添え物の情報（日付・美容院名など）を弱める */
  muted?: boolean;
};

/**
 * 見せるモード専用の文字。
 *
 * この画面は**テーマに関係なく常に黒背景**なので、共通の Text（useTheme の色を使う）
 * ではなく showcase の固定色を使う。ライトモードで文字が黒くなって読めなくなるのを防ぐ。
 */
export function ShowcaseText({ variant = 'caption', muted = false, style, ...rest }: ShowcaseTextProps) {
  return (
    <RNText
      style={[
        variant === 'memo' ? typography.showcaseMemo : typography.caption,
        { color: muted ? showcase.textMuted : showcase.text },
        style,
      ]}
      {...rest}
    />
  );
}
