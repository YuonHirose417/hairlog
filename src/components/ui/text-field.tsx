import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { Text } from '@/components/ui/text';
import { layout, radius, spacing, typography } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type TextFieldProps = Omit<TextInputProps, 'style'> & {
  /** 入力欄の左に小さく置くラベル。「美容院」「担当者」など */
  label?: string;
  /**
   * 下線だけの控えめな見た目にする。
   * 日付・美容院名・担当者名を画面上部に小さく置くときはこちらを使う。
   */
  subtle?: boolean;
};

/**
 * 1行入力。美容院名・担当者名に使う。
 * 写真とメモを主役にするため、既定で控えめな見た目にしてある。
 */
export function TextField({ label, subtle = true, ...rest }: TextFieldProps) {
  const c = useTheme();

  return (
    <View style={styles.row}>
      {label ? (
        <Text variant="caption" color="textFaint" style={styles.label}>
          {label}
        </Text>
      ) : null}
      <TextInput
        placeholderTextColor={c.textFaint}
        selectionColor={c.accent}
        style={[
          styles.input,
          typography.caption,
          { color: c.text },
          subtle
            ? { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: c.border }
            : {
                backgroundColor: c.surfaceSunken,
                borderRadius: radius.control,
                paddingHorizontal: spacing.sm + spacing.xs,
                minHeight: layout.minTouchTarget,
              },
        ]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  label: {
    width: 48,
  },
  input: {
    flex: 1,
    paddingVertical: spacing.sm,
  },
});
