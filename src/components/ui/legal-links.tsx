import { Alert, Pressable, StyleSheet } from 'react-native';

import { Card } from '@/components/ui/card';
import { Divider } from '@/components/ui/divider';
import { Text } from '@/components/ui/text';
import { spacing } from '@/constants/theme';

export type LegalLinksProps = {
  /** 右端に出す状態表示。既定は「準備中」 */
  note?: string;
};

/**
 * 利用規約・プライバシーポリシーの2行。
 *
 * **購入画面と設定画面の両方に必要**（CLAUDE.md §9）なので、同じ文面を
 * 2箇所に散らさないよう共通部品にしてある。
 *
 * TODO(公開前): 規約とポリシーを公開したら、Alert をやめて expo-web-browser の
 * openBrowserAsync(url) で開く。URL は constants に置く。
 */
export function LegalLinks({ note = '準備中' }: LegalLinksProps) {
  function showComingSoon() {
    Alert.alert('準備中です', '公開後にこちらから開けるようになります。');
  }

  return (
    <Card flat>
      <Pressable
        accessibilityRole="button"
        onPress={showComingSoon}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
        <Text variant="body">利用規約</Text>
        <Text variant="caption" color="textMuted">
          {note}
        </Text>
      </Pressable>

      <Divider />

      <Pressable
        accessibilityRole="button"
        onPress={showComingSoon}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
        <Text variant="body">プライバシーポリシー</Text>
        <Text variant="caption" color="textMuted">
          {note}
        </Text>
      </Pressable>
    </Card>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  pressed: { opacity: 0.6 },
});
