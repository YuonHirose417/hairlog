import Constants from 'expo-constants';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, LegalLinks, Section, Text } from '@/components/ui';
import { DEV_SKIP_PAYWALL } from '@/constants/dev';
import { FREE_VISIT_LIMIT, spacing } from '@/constants/theme';
import { useEntitlement } from '@/hooks/use-entitlement';
import { useTheme } from '@/hooks/use-theme';
import { countUnsavedPhotos, countVisits, deleteAllVisits, listAllPhotoUris } from '@/lib/db';
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
  /** まだカメラロールへ保存していない枚数。開くたび数え直す */
  const [unsaved, setUnsaved] = useState(0);
  const [sharing, setSharing] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  const reload = useCallback(async () => {
    try {
      const [visits, pending] = await Promise.all([countVisits(), countUnsavedPhotos()]);
      setCount(visits);
      setUnsaved(pending);
    } catch (error) {
      console.error('[hairlog] 件数の取得に失敗しました', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  /**
   * 書き出しは有料機能（CLAUDE.md §9）。未購入なら購入画面へ送る。
   * 判定は use-entitlement の isPro に任せ、ここで RevenueCat を触らない。
   */
  function requirePro(): boolean {
    if (isPro || DEV_SKIP_PAYWALL) return true;
    router.push('/settings/paywall?from=settings');
    return false;
  }

  async function handleShareRecords() {
    if (sharing) return;
    if (!requirePro()) return;
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

  /**
   * 全件を一括で保存する前に、必ず枚数を伝えて確認する。
   * 意図せずカメラロールが写真で埋まるのを防ぐため。
   */
  function handleSavePhotos() {
    if (progress) return;
    if (!requirePro()) return;

    if (count === 0) {
      Alert.alert('保存できる写真がまだありません');
      return;
    }

    if (unsaved > 0) {
      Alert.alert(
        `${unsaved}枚をカメラロールに追加しますか？`,
        '写真アプリの「hairlog」アルバムに追加されます。',
        [
          { text: 'キャンセル', style: 'cancel' },
          { text: '追加する', onPress: () => void runSavePhotos(true) },
        ]
      );
      return;
    }

    // すべて保存済み。カメラロール側で消してしまった場合の逃げ道を用意する
    Alert.alert(
      'すべての写真は保存済みです',
      'もう一度カメラロールに追加しますか？（写真アプリから削除してしまった場合に使えます）',
      [
        { text: 'キャンセル', style: 'cancel' },
        { text: 'もう一度保存する', onPress: () => void runSavePhotos(false) },
      ]
    );
  }

  async function runSavePhotos(onlyUnsaved: boolean) {
    setProgress({ done: 0, total: 0 });

    const result = await savePhotosToLibrary(onlyUnsaved, (done, total) =>
      setProgress({ done, total })
    );
    setProgress(null);
    await reload();

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

  const saving = progress !== null;
  /** 書き出しは有料。未購入なら鍵つきで見せ、押したら購入画面へ送る */
  const locked = !isPro && !DEV_SKIP_PAYWALL;

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
            leading={locked ? <Text color="onAccent">🔒</Text> : undefined}
            onPress={() => void handleShareRecords()}
            style={styles.action}
          />

          <Button
            label="すべての写真をカメラロールに保存"
            variant="secondary"
            fullWidth
            loading={saving}
            leading={locked ? <Text>🔒</Text> : undefined}
            onPress={handleSavePhotos}
            style={styles.action}
          />

          <Text variant="caption" color="textMuted" style={styles.note}>
            {locked
              ? '書き出しは購入すると使えます。'
              : unsaved > 0
                ? `バックアップ用です。カメラロールに${unsaved}枚追加されます。`
                : 'バックアップ用です。すべての写真は保存済みです。'}
          </Text>
          <Text variant="caption" color="textFaint" style={styles.hint}>
            1枚だけ保存したいときは、記録を開いて「⋯」から保存できます。
          </Text>

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
          {/* 購入画面と同じ部品を使う。文面を2箇所に散らさない */}
          <LegalLinks />

          <Card flat style={styles.action}>
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
  hint: {
    marginTop: spacing.xs,
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
  dangerZone: {
    paddingHorizontal: spacing.md,
  },
});
