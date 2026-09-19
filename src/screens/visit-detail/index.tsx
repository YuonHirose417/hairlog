import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, IconButton, Text } from '@/components/ui';
import { layout, screenPadding, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getVisit, toggleFavorite } from '@/lib/db';
import { savePhotoToLibrary } from '@/lib/export';
import { formatDate, formatSalonLine } from '@/lib/format';
import { showDetailActions } from '@/screens/visit-detail/detail-actions';
import { DetailPhotoPager } from '@/screens/visit-detail/photo-pager';
import type { VisitWithPhotos } from '@/types/models';

/** 写真の高さの上限（画面高に対する比）。日付とボタンがファーストビューに収まるように */
const PHOTO_MAX_RATIO = 0.46;

export type VisitDetailProps = {
  id: string;
};

/**
 * 記録詳細。記録の「正式な置き場」で、編集と削除をここに集約している。
 *
 * 見た目はホームと同じポップな調子。見せるモードのような黒背景にはしない。
 */
export function VisitDetail({ id }: VisitDetailProps) {
  const c = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const [visit, setVisit] = useState<VisitWithPhotos | null>(null);
  const [loaded, setLoaded] = useState(false);
  /** 表示中の写真。⋯ から1枚だけ保存するときの対象になる */
  const [currentIndex, setCurrentIndex] = useState(0);

  const reload = useCallback(async () => {
    try {
      setVisit(await getVisit(id));
    } catch (error) {
      console.error('[hairlog] 記録の読み込みに失敗しました', error);
    } finally {
      setLoaded(true);
    }
  }, [id]);

  // 編集から戻ったときに古い内容が残らないよう、画面に戻るたび読み直す
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  function openShowcase() {
    router.push({ pathname: '/showcase/[id]', params: { id } });
  }

  function openEdit() {
    router.push({ pathname: '/add', params: { id } });
  }

  /** いま表示している1枚だけをカメラロールへ保存する */
  function handleSavePhoto() {
    const photo = visit?.photos[currentIndex];
    if (!photo) {
      Alert.alert('保存できる写真がありません');
      return;
    }

    // 二重保存になる場合は先に断る。カメラロール側で消した場合に備えて選択肢は残す
    if (photo.savedToLibraryAt) {
      Alert.alert('この写真は保存済みです', 'もう一度カメラロールに追加しますか？', [
        { text: 'キャンセル', style: 'cancel' },
        { text: 'もう一度追加する', onPress: () => void runSavePhoto(photo) },
      ]);
      return;
    }

    void runSavePhoto(photo);
  }

  async function runSavePhoto(photo: VisitWithPhotos['photos'][number]) {
    const result = await savePhotoToLibrary(photo);

    if (result.ok) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      Alert.alert('カメラロールに保存しました', '写真アプリの「hairlog」アルバムで確認できます。');
      await reload();
      return;
    }

    if (result.reason === 'denied') {
      Alert.alert(
        '写真へのアクセスが許可されていません',
        'iPhone の「設定」→「hairlog」→「写真」から「写真の追加のみ」を許可すると保存できます。'
      );
      return;
    }
    Alert.alert('保存できませんでした', 'もう一度お試しください。');
  }

  async function handleToggleFavorite() {
    if (!visit) return;
    // 先に見た目を変えて、DB の書き込みを待たせない
    setVisit({ ...visit, isFavorite: !visit.isFavorite });
    try {
      const next = await toggleFavorite(visit.id);
      setVisit((previous) => (previous ? { ...previous, isFavorite: next } : previous));
    } catch (error) {
      setVisit((previous) => (previous ? { ...previous, isFavorite: !previous.isFavorite } : previous));
      console.error('[hairlog] お気に入りの更新に失敗しました', error);
    }
  }

  if (loaded && !visit) {
    return (
      <View style={[styles.missing, { backgroundColor: c.background, paddingTop: insets.top }]}>
        <Text variant="title" center>
          記録が見つかりません
        </Text>
        <Button label="閉じる" variant="secondary" onPress={() => router.back()} />
      </View>
    );
  }

  const memo = visit?.memo?.trim() ?? '';
  const salonLine = formatSalonLine(visit?.salonName ?? null, visit?.stylistName ?? null);

  return (
    <View style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Button label="‹ 戻る" variant="ghost" onPress={() => router.back()} />

        <View style={styles.headerRight}>
          <IconButton
            accessibilityLabel={visit?.isFavorite ? 'お気に入りを解除' : 'お気に入りに追加'}
            onPress={handleToggleFavorite}>
            <Text
              variant="subhead"
              style={{ color: visit?.isFavorite ? c.accentSecondary : c.textFaint }}>
              {visit?.isFavorite ? '♥' : '♡'}
            </Text>
          </IconButton>

          <IconButton
            accessibilityLabel="この記録の操作"
            onPress={() =>
              showDetailActions(id, {
                onSavePhoto: handleSavePhoto,
                onEdit: openEdit,
                onDeleted: () => router.back(),
              })
            }>
            <Text variant="subhead" color="textMuted">
              ⋯
            </Text>
          </IconButton>
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}>
        {visit && visit.photos.length > 0 ? (
          <DetailPhotoPager
            photos={visit.photos}
            width={width}
            maxHeight={height * PHOTO_MAX_RATIO}
            onPress={openShowcase}
            onIndexChange={setCurrentIndex}
          />
        ) : null}

        <View style={styles.body}>
          {visit ? (
            <View style={styles.meta}>
              <Text variant="subhead">{formatDate(visit.visitedAt)}</Text>
              {salonLine ? (
                <Text variant="caption" color="textMuted">
                  {salonLine}
                </Text>
              ) : null}
            </View>
          ) : null}

          <Button
            label="美容師さんに見せる"
            sink
            fullWidth
            onPress={openShowcase}
            style={styles.showButton}
          />

          <View style={styles.memoHeader}>
            <Text variant="caption" color="textMuted">
              メモ
            </Text>
            {memo ? (
              <Button label="編集" variant="ghost" onPress={openEdit} />
            ) : null}
          </View>

          {/* メモが空なら本文の領域を取らず、追加への入口だけを置く */}
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={memo ? 'メモを編集' : 'メモを追加'}
            onPress={openEdit}
            style={({ pressed }) => pressed && styles.pressed}>
            <Card flat>
              {memo ? (
                <Text variant="body">{memo}</Text>
              ) : (
                <Text variant="body" color="textMuted">
                  ＋ メモを追加
                </Text>
              )}
            </Card>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  missing: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.lg,
    padding: spacing.xl,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.sm,
    minHeight: layout.minTouchTarget,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  body: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.md,
  },
  meta: {
    gap: 2,
  },
  showButton: {
    marginTop: spacing.md,
  },
  memoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  pressed: { opacity: 0.7 },
});
