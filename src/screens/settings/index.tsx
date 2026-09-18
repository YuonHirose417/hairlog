import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, Divider, Section, Text } from '@/components/ui';
import { FREE_VISIT_LIMIT, spacing } from '@/constants/theme';
import { useEntitlement } from '@/hooks/use-entitlement';
import { useTheme } from '@/hooks/use-theme';
import { countVisits, deleteAllVisits, listAllPhotoUris } from '@/lib/db';
import { savePhotosToLibrary, shareRecords } from '@/lib/export';
import { cancelReminder } from '@/lib/notifications';
import { removeOrphanedPhotos } from '@/lib/photos';

/**
 * 設定。**データの書き出しが主役**の画面。
 *
 * このアプリのデータは端末内にしか無いので、機種変更やアプリ削除で消える。
 * 書き出しがその唯一の対策であることを画面上でも明記する。
 */
export function Settings() {
  const c = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { isPro } = useEntitlement();

  const [count, setCount] = useState(0);
  const [sharing, setSharing] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const reload = useCallback(async () => {
    try {
      setCount(await countVisits());
    } catch (error) {
      console.error('[hairlog] 件数の取得に失敗しました', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  async function handleShareRecords() {
    if (sharing) return;
    setSharing(true);
    try {
      const result = await shareRecords();
      if (result.ok) return;

      const message = {
        empty: '書き出せる記録がまだありません。',
        unavailable: 'この端末では共有を利用できません。',
        failed: 'もう一度お試しください。',
      }[result.reason];
      Alert.alert('書き出せませんでした', message);
    } finally {
      setSharing(false);
    }
  }

  async function handleSavePhotos() {
    if (progress) return;
    setProgress({ done: 0, total: 0 });

    const result = await savePhotosToLibrary((done, total) => setProgress({ done, total }));
    setProgress(null);

    if (result.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert(
        '写真を保存しました',
        result.failed > 0
          ? `${result.total}枚中 ${result.saved}枚を保存しました。写真アプリの「hairlog」アルバムで確認できます。`
          : `${result.saved}枚すべてを保存しました。写真アプリの「hairlog」アルバムで確認できます。`
      );
      return;
    }

    if (result.reason === 'denied') {
      Alert.alert(
        '写真へのアクセスが許可されていません',
        'iPhone の「設定」→「hairlog」→「写真」から「写真の追加のみ」を許可すると保存できます。'
      );
      return;
    }

    const message = {
      empty: '保存できる写真がまだありません。',
      failed: 'もう一度お試しください。',
    }[result.reason];
    Alert.alert('保存できませんでした', message);
  }

  /** 取り消せない操作なので確認を2段階にする */
  function handleDeleteAll() {
    Alert.alert('すべてのデータを削除しますか？', '記録と写真がすべて消えます。', [
      { text: 'キャンセル', style: 'cancel' },
      { text: '削除する', style: 'destructive', onPress: confirmDeleteAll },
    ]);
  }

  function confirmDeleteAll() {
    Alert.alert(
      '本当に削除しますか？',
      '書き出していない記録は元に戻せません。写真も一緒に削除されます。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '完全に削除する',
          style: 'destructive',
          onPress: () => {
            void runDeleteAll();
          },
        },
      ]
    );
  }

  async function runDeleteAll() {
    try {
      await deleteAllVisits();
      // 写真の実体は CASCADE では消えない
      removeOrphanedPhotos(await listAllPhotoUris());
      // 記録が無いのに撮影のお知らせが届かないよう、予約中の通知も消す
      await cancelReminder();

      await reload();
      Alert.alert('削除しました', 'すべての記録と写真を削除しました。');
    } catch (error) {
      console.error('[hairlog] 全削除に失敗しました', error);
      Alert.alert('削除できませんでした', 'もう一度お試しください。');
    }
  }

  function showComingSoon() {
    Alert.alert('準備中です', '公開後にこちらから開けるようになります。');
  }

  const saving = progress !== null;

  return (
    <View style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Button label="‹ 戻る" variant="ghost" onPress={() => router.back()} />
        <Text variant="subhead">設定</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}>
        <Section title="データの書き出し">
          <Card>
            <Text variant="body">
              アプリを削除するとデータは消えます。定期的な書き出しをおすすめします。
            </Text>
            <Text variant="caption" color="textMuted" style={styles.note}>
              記録は共有先を選んで保存し、写真はカメラロールに保存します。写真は iCloud
              写真でバックアップされます。
            </Text>
          </Card>

          <Button
            label="記録を書き出す"
            sink
            fullWidth
            loading={sharing}
            onPress={() => void handleShareRecords()}
            style={styles.action}
          />

          <Button
            label="写真をカメラロールに保存"
            variant="secondary"
            fullWidth
            loading={saving}
            onPress={() => void handleSavePhotos()}
            style={styles.action}
          />

          {progress && progress.total > 0 ? (
            <Text variant="caption" color="textMuted" style={styles.note}>
              {progress.done} / {progress.total} 枚を保存中…
            </Text>
          ) : null}
        </Section>

        <Section title="記録">
          <Card flat>
            <Text variant="body">
              {isPro ? `${count}件（無制限）` : `${count}件 / 無料枠 ${FREE_VISIT_LIMIT}件`}
            </Text>
          </Card>
        </Section>

        <Section title="アプリについて">
          <Card flat>
            <Pressable
              accessibilityRole="button"
              onPress={showComingSoon}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <Text variant="body">利用規約</Text>
              <Text variant="caption" color="textMuted">
                準備中
              </Text>
            </Pressable>

            <Divider />

            <Pressable
              accessibilityRole="button"
              onPress={showComingSoon}
              style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
              <Text variant="body">プライバシーポリシー</Text>
              <Text variant="caption" color="textMuted">
                準備中
              </Text>
            </Pressable>

            <Divider />

            <View style={styles.row}>
              <Text variant="body">バージョン</Text>
              <Text variant="caption" color="textMuted">
                {Constants.expoConfig?.version ?? '—'}
              </Text>
            </View>
          </Card>
        </Section>

        <View style={styles.dangerZone}>
          <Button
            label="すべてのデータを削除"
            variant="danger"
            fullWidth
            onPress={handleDeleteAll}
          />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
  },
  headerSpacer: {
    // タイトルを中央に保つため、戻るボタンと同じぶんの場所を空ける
    width: 72,
  },
  note: {
    marginTop: spacing.sm,
  },
  action: {
    marginTop: spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  pressed: { opacity: 0.6 },
  dangerZone: {
    paddingHorizontal: spacing.md,
  },
});
