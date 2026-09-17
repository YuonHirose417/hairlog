/**
 * RevenueCat（react-native-purchases）のラッパー。
 *
 * このファイルの最大の役割は **課金が使えない環境でもアプリを落とさないこと**。
 * 以下の3つの経路をすべて握りつぶし、呼び出し側には状態だけを返す。
 *
 *   1. .env に EXPO_PUBLIC_REVENUECAT_IOS_KEY が無い（開発初期・EAS Build 上）
 *   2. Expo Go で起動していて native モジュールが無い
 *   3. SDK の初期化そのものが失敗した
 *
 * 呼び出し側は available を見て、false なら有料機能をロック表示にする。
 * 例外を投げないので try/catch で囲む必要はない。
 */

import { Platform } from 'react-native';

/** 課金が使えない理由。UI の出し分けとデバッグ表示に使う */
export type PurchasesUnavailableReason =
  /** .env にキーが無い */
  | 'no-key'
  /** native モジュールが無い（Expo Go で起動している） */
  | 'module-missing'
  /** SDK の初期化に失敗した */
  | 'init-failed'
  /** iOS 以外で起動している */
  | 'unsupported-platform';

export type PurchasesStatus =
  | { available: true }
  | { available: false; reason: PurchasesUnavailableReason; detail?: string };

/**
 * EXPO_PUBLIC_ 付きの環境変数はビルド時にバンドルへ埋め込まれる。
 * 未設定なら undefined ではなく空文字になることがあるため、両方を弾く。
 */
function readKey(): string | null {
  const key = process.env.EXPO_PUBLIC_REVENUECAT_IOS_KEY;
  if (typeof key !== 'string') return null;
  const trimmed = key.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/** キーが .env に入っているか。SDK には触れないので、いつ呼んでも安全 */
export function isPurchasesConfigured(): boolean {
  return readKey() !== null;
}

let status: PurchasesStatus | null = null;
let initPromise: Promise<PurchasesStatus> | null = null;

/**
 * 初期化を1度だけ行い、結果を返す。
 * アプリ起動時（_layout）に呼び、以降は getPurchasesStatus() で参照する。
 */
export function initPurchases(): Promise<PurchasesStatus> {
  if (!initPromise) {
    initPromise = configure().then((result) => {
      status = result;
      return result;
    });
  }
  return initPromise;
}

/** initPurchases() が終わるまでは null。UI の出し分けに使う */
export function getPurchasesStatus(): PurchasesStatus | null {
  return status;
}

async function configure(): Promise<PurchasesStatus> {
  // iOS 用のキーしか持たないため、それ以外では初期化しない
  if (Platform.OS !== 'ios') {
    return { available: false, reason: 'unsupported-platform' };
  }

  const key = readKey();
  if (key === null) {
    // キーが無いときは SDK に一切触れない。import すら行わない
    return { available: false, reason: 'no-key' };
  }

  // 静的 import にすると Expo Go で起動した瞬間に落ちるため動的に読む
  let Purchases: typeof import('react-native-purchases').default;
  try {
    const module = await import('react-native-purchases');
    Purchases = module.default;
    if (!Purchases) {
      return { available: false, reason: 'module-missing' };
    }
  } catch (error) {
    return {
      available: false,
      reason: 'module-missing',
      detail: (error as Error).message,
    };
  }

  try {
    Purchases.configure({ apiKey: key });
    return { available: true };
  } catch (error) {
    return {
      available: false,
      reason: 'init-failed',
      detail: (error as Error).message,
    };
  }
}

/** 確認画面やデバッグ表示に出す日本語のラベル */
export function describePurchasesStatus(value: PurchasesStatus | null): string {
  if (value === null) return '確認中…';
  if (value.available) return '有効';

  const label: Record<PurchasesUnavailableReason, string> = {
    'no-key': '無効（キー未設定）',
    'module-missing': '無効（Expo Go では使えません）',
    'init-failed': '無効（初期化に失敗）',
    'unsupported-platform': '無効（iOS 以外）',
  };
  return label[value.reason];
}
