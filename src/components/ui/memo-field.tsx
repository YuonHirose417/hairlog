import { StyleSheet, TextInput, type TextInputProps } from 'react-native';

import { border, radius, spacing, typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

/** 記録画面のメモ欄で必ず出す例文。指定の文言を変えないこと */
export const MEMO_PLACEHOLDER = '例：前髪は眉上、横は刈り上げ6mm、すき多め';

export type MemoFieldProps = Omit<TextInputProps, 'style' | 'multiline'> & {
  /** 入力欄の最低の高さ。記録画面では大きめに取る */
  minHeight?: number;
};

/**
 * 自由記述のメモ欄。記録画面での入力はこれと写真が主役になる。
 * 選択式の入力（チップ・プルダウン）を足さないこと。
 */
export function MemoField({ minHeight = 160, placeholder, ...rest }: MemoFieldProps) {
  const c = useTheme();

  return (
    <TextInput
      multiline
      textAlignVertical="top"
      placeholder={placeholder ?? MEMO_PLACEHOLDER}
      placeholderTextColor={c.textFaint}
      selectionColor={c.accent}
      style={[
        styles.input,
        typography.body,
        {
          minHeight,
          color: c.text,
          backgroundColor: c.surfaceSunken,
          borderWidth: border.bold,
          borderColor: c.outlineSubtle,
        },
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  input: {
    borderRadius: radius.control,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
});
