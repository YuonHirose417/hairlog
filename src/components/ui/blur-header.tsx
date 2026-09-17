import { BlurView } from 'expo-blur';
import { StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Text } from '@/components/ui/text';
import { colors, layout, spacing } from '@/constants/theme';
import { useTheme, useThemeScheme } from '@/hooks/use-theme';

export type BlurHeaderProps = {
  title?: string;
  /** 左端に置く要素（戻るボタンなど） */
  left?: React.ReactNode;
  /** 右端に置く要素（♡ や共有など） */
  right?: React.ReactNode;
};

/**
 * 写真の上に重なる半透明のヘッダー。
 * 写真を隠さないよう、背景は blur と薄い下地だけにしてある。
 */
export function BlurHeader({ title, left, right }: BlurHeaderProps) {
  const c = useTheme();
  const scheme = useThemeScheme();
  const insets = useSafeAreaInsets();

  return (
    <BlurView
      intensity={40}
      tint={colors[scheme].blurTint}
      style={[styles.container, { paddingTop: insets.top, borderBottomColor: c.border }]}>
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
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  bar: {
    height: layout.headerHeight,
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
