import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';

import { SolidSurface } from '@/components/ui/solid-surface';
import { Text } from '@/components/ui/text';
import { border, layout, radius, spacing, type ColorName } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';

export type ButtonProps = {
  label: string;
  onPress?: (event: GestureResponderEvent) => void;
  /** primary / secondary は輪郭とソリッド影がつく。ghost / danger は素の文字だけ */
  variant?: ButtonVariant;
  disabled?: boolean;
  loading?: boolean;
  /** 親の幅いっぱいに広げる */
  fullWidth?: boolean;
  /**
   * 押したときに面を沈ませる。
   * **「美容師さんに見せる」など主要なボタンだけに使うこと。**
   */
  sink?: boolean;
  /** 押下時の触覚フィードバックを止めたいとき */
  haptic?: boolean;
  style?: StyleProp<ViewStyle>;
  /** ラベルの左に置くアイコンなど */
  leading?: React.ReactNode;
};

type Appearance = {
  background: ColorName;
  outline: ColorName;
  label: ColorName;
  solid: boolean;
};

const APPEARANCE: Record<ButtonVariant, Appearance> = {
  // 黄色の上の文字は必ず ink。白にしない
  primary: { background: 'accent', outline: 'outline', label: 'onAccent', solid: true },
  secondary: { background: 'surface', outline: 'outline', label: 'text', solid: true },
  ghost: { background: 'surface', outline: 'outlineSubtle', label: 'textMuted', solid: false },
  danger: { background: 'surface', outline: 'outlineSubtle', label: 'danger', solid: false },
};

export function Button({
  label,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
  fullWidth = false,
  sink = false,
  haptic = true,
  style,
  leading,
}: ButtonProps) {
  const c = useTheme();
  const [pressed, setPressed] = useState(false);
  const isInactive = disabled || loading;
  const look = APPEARANCE[variant];

  function handlePress(event: GestureResponderEvent) {
    if (isInactive) return;
    if (haptic) {
      // 結果を待つ必要はない。失敗しても操作は続行させる
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    }
    onPress?.(event);
  }

  const content = loading ? (
    <ActivityIndicator color={variant === 'primary' ? c.onAccent : c.textMuted} />
  ) : (
    <View style={styles.content}>
      {leading}
      <Text variant="subhead" color={look.label}>
        {label}
      </Text>
    </View>
  );

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isInactive, busy: loading }}
      disabled={isInactive}
      onPress={handlePress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        fullWidth && styles.fullWidth,
        isInactive && styles.inactive,
        !look.solid && pressed && styles.barePressed,
        style,
      ]}>
      {look.solid ? (
        <SolidSurface
          background={look.background}
          outline={look.outline}
          borderRadius={radius.pill}
          sink={sink}
          pressed={pressed}
          contentStyle={styles.face}>
          {content}
        </SolidSurface>
      ) : (
        <View style={styles.bare}>{content}</View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  face: {
    minHeight: layout.minTouchTarget,
    // 輪郭が太いぶん、内側の余白を広げて窮屈に見えないようにする
    paddingHorizontal: spacing.lg + border.bold,
    paddingVertical: spacing.sm + spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bare: {
    minHeight: layout.minTouchTarget,
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  fullWidth: {
    alignSelf: 'stretch',
  },
  barePressed: {
    opacity: 0.6,
  },
  inactive: {
    opacity: 0.4,
  },
});
