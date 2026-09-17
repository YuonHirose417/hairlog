import { useCallback, useEffect, useState } from 'react';

import { initPurchases } from '@/lib/purchases';

export type UseEntitlementResult = {
  /** 買い切りを購入済みか。課金が使えない環境では常に false */
  isPro: boolean;
  loading: boolean;
  refresh: () => Promise<void>;
};

/**
 * 購入状態を1箇所に集約する。画面から RevenueCat を直接触らないこと。
 *
 * 課金が使えない場合（キー未設定 / Expo Go / 初期化失敗）は **エラーにせず
 * isPro: false を返す**。有料機能はロック表示になるが、アプリは普通に使える。
 */
export function useEntitlement(): UseEntitlementResult {
  const [isPro, setIsPro] = useState(false);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    // initPurchases() は1度しか実行されず、2回目以降はキャッシュ済みの Promise を返す
    const status = await initPurchases();

    if (!status.available) {
      setIsPro(false);
      setLoading(false);
      return;
    }

    // TODO(課金フェーズ): Purchases.getCustomerInfo() で entitlement を照会する。
    // キーが未設定の現状ではここに到達しないため、まだ実装しない。
    setIsPro(false);
    setLoading(false);
  }, []);

  useEffect(() => {
    async function load() {
      await refresh();
    }
    void load();
  }, [refresh]);

  return { isPro, loading, refresh };
}
