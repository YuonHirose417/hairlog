import * as Haptics from 'expo-haptics';
import {
  Pressable,
  StyleSheet,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { layout, radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type IconButtonProps = {
  /** アイコン本体。SF Symbols / 自作 SVG などを渡す */
  children: React.ReactNode;
  onPress?: (event: GestureResponderEvent) => void;
  /** 読み上げ用のラベル。必須 */
  accessibilityLabel: string;
  /** 丸い下地を敷く。写真の上に置くときに使う */
  filled?: boolean;
  disabled?: boolean;
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** ♡・閉じる・共有など、アイコンだけの最小ボタン */
export function IconButton({
  children,
  onPress,
  accessibilityLabel,
  filled = false,
  disabled = false,
  haptic = true,
  style,
}: IconButtonProps) {
  const c = useTheme();

  function handlePress(event: GestureResponderEvent) {
    if (disabled) return;
    if (haptic) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPress?.(event);
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={handlePress}
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        filled && { backgroundColor: c.surfaceSunken },
        pressed && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}>
      {children}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.6 },
  disabled: { opacity: 0.4 },
});
