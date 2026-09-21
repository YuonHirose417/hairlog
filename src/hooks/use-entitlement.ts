import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import {
  describePurchasesStatus,
  fetchIsPro,
  fetchProOffer,
  initPurchases,
  purchasePro,
  restorePro,
  type ProOffer,
  type PurchaseResult,
} from '@/lib/purchases';

export type EntitlementState = {
  /** 買い切りを購入済みか。課金が使えない環境では常に false */
  isPro: boolean;
  /** 最初の照会がまだ終わっていない */
  loading: boolean;
  /** 課金そのものが使えるか（キー未設定 / Expo Go では false） */
  available: boolean;
  /** ロック表示に出す日本語の理由。使える場合は null */
  unavailableLabel: string | null;
};

export type UseEntitlementResult = EntitlementState & {
  refresh: () => Promise<void>;
  purchase: () => Promise<PurchaseResult>;
  restore: () => Promise<PurchaseResult>;
};

/**
 * 購入状態は**アプリ全体で1つ**なので、フックの外に置く。
 *
 * 画面ごとに useState を持つと、購入画面で購入してもその裏に居るホームや設定の
 * isPro が古いままになる。useSyncExternalStore で全画面が同じ値を見る。
 */
let state: EntitlementState = {
  isPro: false,
  loading: true,
  available: false,
  unavailableLabel: null,
};

const listeners = new Set<() => void>();

function setState(next: Partial<EntitlementState>) {
  state = { ...state, ...next };
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** **必ず同じ参照を返す。** 毎回オブジェクトを作ると再描画が止まらなくなる */
function getSnapshot(): EntitlementState {
  return state;
}

let refreshing: Promise<void> | null = null;

/**
 * RevenueCat に購入状態を問い合わせてストアを更新する。
 * 同時に呼ばれても1回にまとめる。
 */
function refresh(): Promise<void> {
  if (refreshing) return refreshing;

  refreshing = (async () => {
    const status = await initPurchases();

    if (!status.available) {
      setState({
        isPro: false,
        loading: false,
        available: false,
        unavailableLabel: describePurchasesStatus(status),
      });
      return;
    }

    setState({
      isPro: await fetchIsPro(),
      loading: false,
      available: true,
      unavailableLabel: null,
    });
  })().finally(() => {
    refreshing = null;
  });

  return refreshing;
}

let started = false;

/** 購入・復元のあと、返ってきた購入状態をストアへ反映する */
async function applyResult(result: PurchaseResult): Promise<PurchaseResult> {
  if (result.ok) {
    setState({ isPro: result.isPro, loading: false });
  }
  return result;
}

/**
 * 購入状態を1箇所に集約する。**画面から RevenueCat を直接触らないこと。**
 *
 * 課金が使えない場合（キー未設定 / Expo Go / 初期化失敗）は エラーにせず
 * isPro: false を返す。有料機能はロック表示になるが、アプリは普通に使える。
 */
export function useEntitlement(): UseEntitlementResult {
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    // 最初にマウントされた1回だけ照会する
    if (started) return;
    started = true;
    void refresh();
  }, []);

  return {
    ...snapshot,
    refresh,
    purchase: () => purchasePro().then(applyResult),
    restore: () => restorePro().then(applyResult),
  };
}

export type UseProOfferResult = {
  /** 表示価格。取得できなければ null */
  offer: ProOffer | null;
  loading: boolean;
  /** 取り直す。課金が後から使えるようになったときに呼ぶ */
  reload: () => Promise<void>;
};

/**
 * 購入画面に出す表示価格を取る。**購入画面だけが使う。**
 * 価格はコードに書かず、必ずここから来た priceString を出すこと。
 */
export function useProOffer(): UseProOfferResult {
  const [offer, setOffer] = useState<ProOffer | null>(null);
  const [loading, setLoading] = useState(true);
  const alive = useRef(true);

  /**
   * 取得して反映する。**同期的な setState を持たない**ので効果からも呼べる
   *（先頭で setLoading すると react-hooks/set-state-in-effect に触れる）。
   */
  const apply = useCallback(async () => {
    const result = await fetchProOffer();
    // 取得を待っている間に画面が閉じられることがある
    if (!alive.current) return;
    setOffer(result);
    setLoading(false);
  }, []);

  // 押されたときだけ、取り直していることを見せる
  const reload = useCallback(async () => {
    setLoading(true);
    await apply();
  }, [apply]);

  useEffect(() => {
    alive.current = true;
    void apply();

    return () => {
      alive.current = false;
    };
  }, [apply]);

  return { offer, loading, reload };
}
