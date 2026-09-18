// サブパスから読む。パッケージのルートを import すると使わないウェイトまで
// バンドルに含まれ、アプリのサイズが 10MB 以上増える
import { MPLUSRounded1c_400Regular } from '@expo-google-fonts/m-plus-rounded-1c/400Regular';
import { MPLUSRounded1c_500Medium } from '@expo-google-fonts/m-plus-rounded-1c/500Medium';
import { MPLUSRounded1c_700Bold } from '@expo-google-fonts/m-plus-rounded-1c/700Bold';
import { useFonts } from 'expo-font';
import * as Notifications from 'expo-notifications';
import { Stack, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useTheme } from '@/hooks/use-theme';
import { initDatabase } from '@/lib/db';
import { REMINDER_KIND } from '@/lib/notifications';
import { initPurchases } from '@/lib/purchases';

SplashScreen.preventAutoHideAsync().catch(() => {});

export default function RootLayout() {
  const c = useTheme();
  const router = useRouter();

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
     * 日付は「今日」ではなく**予約日**を渡す。翌朝タップされても正しい日付で記録できる。
     */
    function open(response: Notifications.NotificationResponse | null) {
      const data = response?.notification.request.content.data;
      if (!data || data.kind !== REMINDER_KIND) return;
      const date = typeof data.appointmentAt === 'string' ? data.appointmentAt : undefined;
      router.push({ pathname: '/add', params: date ? { date } : {} });
    }

    // アプリが終了していたときのタップ。これが無いと通知から起動した初回だけ反応しない
    Notifications.getLastNotificationResponseAsync()
      .then(open)
      .catch(() => {});

    // 起動中・背面のときのタップ
    const subscription = Notifications.addNotificationResponseReceivedListener(open);
    return () => subscription.remove();
  }, [router]);

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
