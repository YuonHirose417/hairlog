import * as Haptics from 'expo-haptics';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { Text } from '@/components/ui/text';
import { layout, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export type ButtonProps = {
  label: string;
  onPress?: (event: GestureResponderEvent) => void;
  /** primary のみアクセント色を使う。写真の近くでは secondary / ghost を選ぶ */
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  /** 親の幅いっぱいに広げる */
  fullWidth?: boolean;
  /** 押下時の触覚フィードバックを止めたいとき */
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
  /** ラベルの左に置くアイコンなど */
  leading?: React.ReactNode;
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  fullWidth = false,
  haptic = true,
  style,
  leading,
}: ButtonProps) {
  const c = useTheme();
  const isInactive = disabled || loading;

  const background = {
    primary: c.accent,
    secondary: c.surfaceSunken,
    ghost: 'transparent',
    danger: 'transparent',
  }[variant];

  const labelColor = {
    primary: 'onAccent',
    secondary: 'text',
    ghost: 'textMuted',
    danger: 'danger',
  }[variant] as 'onAccent' | 'text' | 'textMuted' | 'danger';

  function handlePress(event: GestureResponderEvent) {
    if (isInactive) return;
    if (haptic) {
      // 結果を待つ必要はない。失敗しても操作は続行させる
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPress?.(event);
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isInactive, busy: loading }}
      disabled={isInactive}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.base,
        { backgroundColor: background },
        variant === 'ghost' || variant === 'danger' ? styles.bare : null,
        fullWidth && styles.fullWidth,
        pressed && styles.pressed,
        isInactive && styles.inactive,
        style,
      ]}>
      {loading ? (
        <ActivityIndicator color={variant === 'primary' ? c.onAccent : c.textMuted} />
      ) : (
        <View style={styles.content}>
          {leading}
          <Text variant="subhead" color={labelColor}>
            {label}
          </Text>
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm + spacing.xs,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bare: {
    paddingHorizontal: spacing.md,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  pressed: {
    opacity: 0.7,
  },
  inactive: {
    opacity: 0.4,
  },
});
