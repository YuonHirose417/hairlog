import * as WebBrowser from 'expo-web-browser';
import { Alert } from 'react-native';

import { Card } from '@/components/ui/card';
import { Divider } from '@/components/ui/divider';
import { ListRow } from '@/components/ui/list-row';
import { PRIVACY_URL, TERMS_URL } from '@/constants/legal';

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

/**
 * URL が未設定のときだけ「準備中」を出す。
 * 設定済みなら、開けることは行の右端の山形が示すので値は要らない。
 */
function marker(url: string): string | undefined {
  return url.length === 0 ? '準備中' : undefined;
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
      <ListRow label="利用規約" value={marker(TERMS_URL)} onPress={() => openLegal(TERMS_URL)} />
      <Divider />
      <ListRow
        label="プライバシーポリシー"
        value={marker(PRIVACY_URL)}
        onPress={() => openLegal(PRIVACY_URL)}
      />
    </Card>
  );
}
