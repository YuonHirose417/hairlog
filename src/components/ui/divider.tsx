import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type DividerProps = {
  /** 上下に余白を足す */
  spaced?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function Divider({ spaced = false, style }: DividerProps) {
  const c = useTheme();

  return (
    <View
      style={[styles.line, { backgroundColor: c.outlineSubtle }, spaced && styles.spaced, style]}
    />
  );
}

const styles = StyleSheet.create({
  line: {
    height: StyleSheet.hairlineWidth,
    alignSelf: 'stretch',
  },
  spaced: {
    marginVertical: spacing.md,
  },
});
