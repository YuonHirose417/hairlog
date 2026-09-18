// サブパスから読む。パッケージのルートを import すると使わないウェイトまで
// バンドルに含まれ、アプリのサイズが 10MB 以上増える
import { MPLUSRounded1c_400Regular } from '@expo-google-fonts/m-plus-rounded-1c/400Regular';
import { MPLUSRounded1c_500Medium } from '@expo-google-fonts/m-plus-rounded-1c/500Medium';
import { MPLUSRounded1c_700Bold } from '@expo-google-fonts/m-plus-rounded-1c/700Bold';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { Stack, useRootNavigationState, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { initDatabase } from '@/lib/db';
import { REMINDER_KIND } from '@/lib/notifications';
import { initPurchases } from '@/lib/purchases';

SplashScreen.preventAutoHideAsync().catch(() => {});

/** 通知から開くときに引き継ぐもの */
type PendingOpen = {
  /** 予約日（ISO8601）。記録の日付の初期値になる */
  date?: string;
};

export default function RootLayout() {
  const c = useTheme();
  const router = useRouter();

  /**
   * 通知を受け取っても、すぐには遷移しない。
   * ready が false の間はこのコンポーネントが null を返すので **Stack が存在せず**、
   * そこへ router.push しても行き先を失う（完全終了からの起動で起きていた）。
   */
  const [pending, setPending] = useState<PendingOpen | null>(null);
  /**
   * 遷移を実行し終えたもの。効果の中で setState せずに済ませるため ref で持つ。
   * setPending は毎回新しいオブジェクトを作るので、同一性の比較で判定できる。
   */
  const handled = useRef<PendingOpen | null>(null);

  const navigationState = useRootNavigationState();
  const navigationReady = Boolean(navigationState?.key);

  const [fontsLoaded, fontError] = useFonts({
    MPLUSRounded1c_400Regular,
    MPLUSRounded1c_500Medium,
    MPLUSRounded1c_700Bold,
  });

  const [databaseReady, setDatabaseReady] = useState(false);
  const [databaseError, setDatabaseError] = useState<Error | null>(null);

  useEffect(() => {
    initDatabase()
      .then(() => setDatabaseReady(true))
      .catch((error: Error) => {
        // DB が開けなくてもスプラッシュで固まらせない。画面側でエラーを出す
        console.error('[hairlog] DB の初期化に失敗しました', error);
        setDatabaseError(error);
      });
  }, []);

  useEffect(() => {
    /**
     * 撮影リマインドの通知をタップしたら記録追加を開く。
     * ここでは**受け取って保持するだけ**。遷移は下の効果が条件を見て行う。
     */
    function receive(response: Notifications.NotificationResponse | null, source: string) {
      const data = response?.notification.request.content.data;
      if (!data || data.kind !== REMINDER_KIND) return;

      const date = typeof data.appointmentAt === 'string' ? data.appointmentAt : undefined;
      console.log('[hairlog][通知] 受け取り', {
        経由: source,
        予約日時: date,
        id: response?.notification.request.identifier,
      });
      setPending({ date });
    }

    // アプリが終了していたときのタップ。これが無いと通知から起動した初回だけ反応しない
    Notifications.getLastNotificationResponseAsync()
      .then((response) => receive(response, '起動時'))
      .catch(() => {});

    // 起動中・背面のときのタップ
    const subscription = Notifications.addNotificationResponseReceivedListener((response) =>
      receive(response, '起動中')
    );
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    // 課金は起動を止めない。キーが無い / Expo Go でも例外を投げず状態を返すだけ
    initPurchases().then((result) => {
      if (!result.available) {
        console.log(`[hairlog] 課金は無効です: ${result.reason}`, result.detail ?? '');
      }
    });
  }, []);

  const ready = (fontsLoaded || Boolean(fontError)) && (databaseReady || Boolean(databaseError));

  useEffect(() => {
    if (ready) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [ready]);

  useEffect(() => {
    if (!pending || handled.current === pending) return;

    // ready だけでは足りない。Stack が実際にマウントされたかを見る
    if (!ready || !navigationReady) {
      console.log('[hairlog][通知] 保留中', { ready, navigationReady });
      return;
    }

    console.log('[hairlog][通知] 遷移を実行', {
      日付: pending.date,
      時刻: new Date().toLocaleTimeString(),
    });

    handled.current = pending;
    router.push({ pathname: '/add', params: pending.date ? { date: pending.date } : {} });

    // 同じ応答は何度でも返ってくる。消しておかないと、次の普通の起動でも
    // 記録追加が勝手に開いてしまう
    Notifications.clearLastNotificationResponseAsync().catch(() => {});
  }, [pending, ready, navigationReady, router]);

  if (!ready) return null;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <StatusBar style="auto" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: c.background },
          }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="visit/[id]" />
          {/* 見せるモードは写真だけを大きく出したいので全画面 */}
          <Stack.Screen name="showcase/[id]" options={{ presentation: 'fullScreenModal' }} />
          {/* 記録追加はメモ欄を広く取りたいので全画面。キーボードが出ても窮屈にしない */}
          <Stack.Screen name="add/index" options={{ presentation: 'fullScreenModal' }} />
          <Stack.Screen name="settings/paywall" options={{ presentation: 'formSheet' }} />
          <Stack.Screen name="reminder" options={{ presentation: 'formSheet' }} />
        </Stack>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
