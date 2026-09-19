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

/**
 * configure() で読み込んだ SDK を保持する。以降の呼び出しで import をやり直さない。
 * 初期化に成功したときだけ入るので、null なら課金は使えない。
 */
let sdk: typeof import('react-native-purchases').default | null = null;

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
    sdk = Purchases;
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

// -----------------------------------------------------------------------------
// 商品の取得・購入・復元
//
// ここから下も **例外を投げない**。呼び出し側（hooks/use-entitlement.ts）は
// 結果オブジェクトだけを見て UI を出し分ける。
// -----------------------------------------------------------------------------

/** RevenueCat の Entitlement 識別子。これが有効なら買い切り済み */
const ENTITLEMENT_ID = 'pro';
/** Offering 識別子。current が空だったときの取りこぼし防止に使う */
const OFFERING_ID = 'default';
/** 買い切りパッケージの識別子 */
const PACKAGE_ID = '$rc_lifetime';
/**
 * 購入シートをユーザーが閉じたときのエラーコード（PURCHASES_ERROR_CODE）。
 * enum を静的 import できないため値で持つ。
 */
const CANCELLED_CODE = '1';

/** 使える状態の SDK を返す。使えないなら null（例外は投げない） */
async function getSdk() {
  await initPurchases();
  return sdk;
}

export type ProOffer = {
  /** RevenueCat から来た表示価格。「¥400」など。**自前で組み立てないこと** */
  priceString: string;
  /** デバッグ表示用 */
  packageId: string;
};

export type PurchaseResult =
  | { ok: true; isPro: boolean }
  /** 購入シートを閉じただけ。**エラー扱いにしない** */
  | { ok: false; reason: 'cancelled' }
  | { ok: false; reason: 'unavailable' | 'no-product' | 'failed'; message: string };

function isCancelled(error: unknown): boolean {
  const e = error as { code?: unknown; userCancelled?: unknown };
  // userCancelled は deprecated だが、古い経路のために両方見る
  return e?.code === CANCELLED_CODE || e?.userCancelled === true;
}

/** 画面にそのまま出せる一文にする。SDK の英語メッセージは最後の手段 */
function describeError(error: unknown): string {
  const e = error as { message?: string };
  return e?.message ?? '通信の状態を確かめて、もう一度お試しください。';
}

/** entitlement 'pro' が有効か。課金が使えない環境では常に false */
export async function fetchIsPro(): Promise<boolean> {
  const purchases = await getSdk();
  if (purchases === null) return false;

  try {
    const info = await purchases.getCustomerInfo();
    return info.entitlements.active[ENTITLEMENT_ID] != null;
  } catch (error) {
    // 通信できないだけで有料機能を失うのは避けたいが、端末内に真実は無いので
    // false に倒す。復元ボタンで戻せる
    console.log('[hairlog] 購入状態の取得に失敗しました', describeError(error));
    return false;
  }
}

/** 買い切りパッケージを探す。見つからなければ null */
async function findPackage() {
  const purchases = await getSdk();
  if (purchases === null) return null;

  const offerings = await purchases.getOfferings();
  // ダッシュボードで current を切り替えても拾えるよう、両方を見る
  const offering = offerings.current ?? offerings.all[OFFERING_ID] ?? null;
  if (offering === null) return null;

  return (
    offering.lifetime ??
    offering.availablePackages.find((item) => item.identifier === PACKAGE_ID) ??
    offering.availablePackages[0] ??
    null
  );
}

/** 購入画面に出す表示価格。取得できなければ null */
export async function fetchProOffer(): Promise<ProOffer | null> {
  try {
    const pkg = await findPackage();
    if (pkg === null) return null;

    return { priceString: pkg.product.priceString, packageId: pkg.identifier };
  } catch (error) {
    console.log('[hairlog] 商品の取得に失敗しました', describeError(error));
    return null;
  }
}

export async function purchasePro(): Promise<PurchaseResult> {
  const purchases = await getSdk();
  if (purchases === null) {
    return { ok: false, reason: 'unavailable', message: describePurchasesStatus(status) };
  }

  try {
    const pkg = await findPackage();
    if (pkg === null) {
      return {
        ok: false,
        reason: 'no-product',
        message: '商品を取得できませんでした。時間をおいてもう一度お試しください。',
      };
    }

    const result = await purchases.purchasePackage(pkg);
    return { ok: true, isPro: result.customerInfo.entitlements.active[ENTITLEMENT_ID] != null };
  } catch (error) {
    if (isCancelled(error)) return { ok: false, reason: 'cancelled' };
    return { ok: false, reason: 'failed', message: describeError(error) };
  }
}

/**
 * 購入を復元する。
 * **購入が見つからないのは失敗ではない**（{ ok: true, isPro: false }）。
 * 画面側で「購入が見つかりませんでした」と案内する。
 */
export async function restorePro(): Promise<PurchaseResult> {
  const purchases = await getSdk();
  if (purchases === null) {
    return { ok: false, reason: 'unavailable', message: describePurchasesStatus(status) };
  }

  try {
    const info = await purchases.restorePurchases();
    return { ok: true, isPro: info.entitlements.active[ENTITLEMENT_ID] != null };
  } catch (error) {
    if (isCancelled(error)) return { ok: false, reason: 'cancelled' };
    return { ok: false, reason: 'failed', message: describeError(error) };
  }
}
