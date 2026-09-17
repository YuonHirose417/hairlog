import { BlurView } from 'expo-blur';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { border, colors, layout, spacing } from '@/constants/theme';
import { useTheme, useThemeScheme } from '@/hooks/use-theme';

export type BlurHeaderProps = {
  title?: string;
  /** 左端に置く要素（戻るボタンなど） */
  left?: React.ReactNode;
  /** 右端に置く要素（♡ や共有など） */
  right?: React.ReactNode;
};

/** セーフエリアを除いた、ヘッダーの見た目の高さ */
export const BLUR_HEADER_HEIGHT = layout.headerHeight;

/**
 * リストの上に重ねる半透明のヘッダー。
 *
 * **絶対配置で中身に重ねる。** 縦に積むと blur の意味がなく、写真が透けない。
 * 使う側は、リストの contentContainerStyle に
 * `insets.top + BLUR_HEADER_HEIGHT` ぶんの paddingTop を足すこと。
 */
export function BlurHeader({ title, left, right }: BlurHeaderProps) {
  const c = useTheme();
  const scheme = useThemeScheme();
  const insets = useSafeAreaInsets();

  return (
    <BlurView
      intensity={40}
      tint={colors[scheme].blurTint}
      style={[
        styles.container,
        { paddingTop: insets.top, borderBottomColor: c.outlineSubtle },
      ]}>
      <View style={styles.bar}>
        <View style={styles.side}>{left}</View>

        {title ? (
          <Text variant="subhead" numberOfLines={1} style={styles.title}>
            {title}
          </Text>
        ) : (
          <View style={styles.title} />
        )}

        <View style={[styles.side, styles.sideRight]}>{right}</View>
      </View>
    </BlurView>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    borderBottomWidth: border.hairline,
  },
  bar: {
    height: BLUR_HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  side: {
    minWidth: layout.minTouchTarget,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sideRight: {
    justifyContent: 'flex-end',
  },
  title: {
    flex: 1,
    textAlign: 'center',
  },
});
