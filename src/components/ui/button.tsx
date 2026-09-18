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
  /**
   * 押せない見た目にするが、**押すことはできる**。
   * 押したときに理由を説明したいときに使う（例: 写真が無いまま保存を押した）。
   * 本当に押させたくないときは disabled を使う。
   */
  inactive?: boolean;
  loading?: boolean;
  /** 親の幅いっぱいに広げる */
  fullWidth?: boolean;
  /**
   * 押したときに面を沈ませる。
   * **「美容師さんに見せる」など主要なボタンだけに使うこと。**
   */
  sink?: boolean;
  /**
   * ラベルの最大行数。長いラベルはここまで折り返して収める。
   * フォント縮小は使わない（12px を割って最小サイズのルールを破るため）。
   */
  numberOfLines?: number;
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
  inactive = false,
  loading = false,
  fullWidth = false,
  sink = false,
  numberOfLines = 2,
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
      <Text
        variant="subhead"
        color={look.label}
        numberOfLines={numberOfLines}
        style={styles.label}>
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
        styles.pressable,
        fullWidth && styles.fullWidth,
        (isInactive || inactive) && styles.inactive,
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
  // RN は flexShrink の既定が 0 なので、明示しないと親が狭くても中身が縮まず
  // 文字が横にはみ出して切れる。ボタンの外から中の Text まで通して縮ませる
  pressable: {
    flexShrink: 1,
  },
  face: {
    minHeight: layout.minTouchTarget,
    maxWidth: '100%',
    // 輪郭が太いぶん、内側の余白を広げて窮屈に見えないようにする
    paddingHorizontal: spacing.lg + border.bold,
    paddingVertical: spacing.sm + spacing.xs,
    alignItems: 'center',
    justifyContent: 'center',
  },
  bare: {
    minHeight: layout.minTouchTarget,
    maxWidth: '100%',
    paddingHorizontal: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
    minWidth: 0,
  },
  label: {
    flexShrink: 1,
    textAlign: 'center',
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
