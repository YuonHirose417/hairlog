import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet, type GestureResponderEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { radius, shadow, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type FabProps = {
  onPress: (event: GestureResponderEvent) => void;
  accessibilityLabel: string;
  /** 中に置く記号。既定は ＋ */
  symbol?: string;
  disabled?: boolean;
};

const SIZE = 60;

/**
 * 右下に浮かぶ主要操作ボタン。
 *
 * 写真の上に重なるため、アクセント色の不透明な下地を敷いて写真と分離する。
 * アクセント色を使ってよい数少ない箇所のひとつ（♡・主要ボタン・選択状態）。
 */
export function Fab({ onPress, accessibilityLabel, symbol = '＋', disabled = false }: FabProps) {
  const c = useTheme();
  const insets = useSafeAreaInsets();

  function handlePress(event: GestureResponderEvent) {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    onPress(event);
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.base,
        shadow.lifted,
        {
          backgroundColor: c.accent,
          bottom: insets.bottom + spacing.lg,
          right: spacing.md,
        },
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}>
      <Text variant="title" color="onAccent">
        {symbol}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    position: 'absolute',
    width: SIZE,
    height: SIZE,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.85, transform: [{ scale: 0.96 }] },
  disabled: { opacity: 0.4 },
});
