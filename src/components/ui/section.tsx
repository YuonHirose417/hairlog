import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { Text } from '@/components/ui/text';
import { screenPadding, spacing } from '@/constants/theme';

export type SectionProps = {
  /** 控えめな見出し。写真より目立たせないこと */
  title?: string;
  /** 見出しの右端に置く要素（「すべて見る」など） */
  action?: React.ReactNode;
  children: React.ReactNode;
  /** 左右の余白を消す。グリッドを画面幅いっぱいに出すときに使う */
  flush?: boolean;
  style?: StyleProp<ViewStyle>;
};

/** 見出し + 余白の定型。画面ごとに余白を書かず、これを使う */
export function Section({ title, action, children, flush = false, style }: SectionProps) {
  return (
    <View style={[styles.container, style]}>
      {title || action ? (
        <View style={[styles.header, { paddingHorizontal: screenPadding }]}>
          {title ? (
            <Text variant="caption" color="textMuted">
              {title}
            </Text>
          ) : (
            <View />
          )}
          {action}
        </View>
      ) : null}

      <View style={flush ? undefined : { paddingHorizontal: screenPadding }}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
  },
});
