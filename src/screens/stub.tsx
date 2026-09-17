/**
 * 【次フェーズで置き換えるスタブ】
 *
 * ホームからの遷移とパラメータの受け渡しを確認するためだけの画面。
 * 各画面の実装時に、このコンポーネントを使っているルートを本物に差し替える。
 */

import { useRouter } from 'expo-router';
import { StyleSheet, View } from 'react-native';

import { Button, Text } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type StubProps = {
  /** 画面の名前。例「記録詳細」 */
  title: string;
  /** 受け取ったパラメータ。渡っていることを目視で確認する */
  params?: Record<string, string | undefined>;
  /** 見せるモードのように背景を黒固定にしたい場合 */
  background?: string;
};

export function Stub({ title, params, background }: StubProps) {
  const c = useTheme();
  const router = useRouter();

  return (
    <View style={[styles.container, { backgroundColor: background ?? c.background }]}>
      <Text variant="title" center style={background ? styles.onDark : undefined}>
        {title}
      </Text>
      <Text variant="body" color="textMuted" center style={background ? styles.onDark : undefined}>
        この画面は未実装です
      </Text>

      {params
        ? Object.entries(params).map(([key, value]) => (
            <Text
              key={key}
              variant="caption"
              color="textFaint"
              center
              style={background ? styles.onDark : undefined}>
              {key}: {value ?? '(なし)'}
            </Text>
          ))
        : null}

      <Button label="閉じる" variant="secondary" onPress={() => router.back()} style={styles.close} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
    gap: spacing.xs,
  },
  onDark: {
    color: '#FFFFFF',
  },
  close: {
    marginTop: spacing.xl,
  },
});
