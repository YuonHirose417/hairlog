import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { Pressable, StyleSheet, type GestureResponderEvent } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { SolidSurface } from '@/components/ui/solid-surface';
import { Text } from '@/components/ui/text';
import { radius, spacing } from '@/constants/theme';

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
 * 太い輪郭とソリッド影を持ち、押すと面だけが沈む。
 * 記号は onAccent（ink）。イエローの上に白を置かない。
 */
export function Fab({ onPress, accessibilityLabel, symbol = '＋', disabled = false }: FabProps) {
  const insets = useSafeAreaInsets();
  const [pressed, setPressed] = useState(false);

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
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        styles.position,
        { bottom: insets.bottom + spacing.lg, right: spacing.md },
        disabled && styles.disabled,
      ]}>
      <SolidSurface
        background="accent"
        borderRadius={radius.pill}
        sink
        pressed={pressed}
        contentStyle={styles.face}>
        <Text variant="title" color="onAccent">
          {symbol}
        </Text>
      </SolidSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  position: {
    position: 'absolute',
  },
  face: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  disabled: { opacity: 0.4 },
});
