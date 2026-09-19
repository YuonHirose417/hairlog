import * as WebBrowser from 'expo-web-browser';
import { Alert, Pressable, StyleSheet } from 'react-native';

import { Card } from '@/components/ui/card';
import { Divider } from '@/components/ui/divider';
import { Text } from '@/components/ui/text';
import { PRIVACY_URL, TERMS_URL } from '@/constants/legal';
import { spacing } from '@/constants/theme';

/**
 * アプリ内ブラウザで開く。Safari へ飛ばさないのは、購入画面の上から開いても
 * 戻ったときに購入操作をそのまま続けられるようにするため。
 *
 * URL が未設定（公開前）のうちは、開く代わりに案内を出す。
 */
function openLegal(url: string) {
  if (url.length === 0) {
    Alert.alert('準備中です', '公開後にこちらから開けるようになります。');
    return;
  }

  // 開けなくてもアプリは落とさない
  WebBrowser.openBrowserAsync(url).catch(() => {
    Alert.alert('開けませんでした', '通信の状態を確かめて、もう一度お試しください。');
  });
}

function LegalRow({ label, url }: { label: string; url: string }) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => openLegal(url)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
      <Text variant="body">{label}</Text>
      <Text variant="caption" color="textMuted">
        {url.length === 0 ? '準備中' : '↗'}
      </Text>
    </Pressable>
  );
}

/**
 * 利用規約・プライバシーポリシーの2行。
 *
 * **購入画面と設定画面の両方に必要**（CLAUDE.md §9）なので、同じ文面を
 * 2箇所に散らさないよう共通部品にしてある。
 *
 * URL は constants/legal.ts が持つ。公開したらそこを埋めるだけでリンクが有効になる。
 */
export function LegalLinks() {
  return (
    <Card flat>
      <LegalRow label="利用規約" url={TERMS_URL} />
      <Divider />
      <LegalRow label="プライバシーポリシー" url={PRIVACY_URL} />
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
