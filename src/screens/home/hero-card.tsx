import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';

import { Button, Card, IconButton, PhotoFrame, Text } from '@/components/ui';
import { layout, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { toggleFavorite } from '@/lib/db';
import { formatDate, formatSalonLine } from '@/lib/format';
import type { VisitSummary } from '@/types/models';

export type HeroCardProps = {
  visit: VisitSummary;
};

/**
 * 最新の髪型。ホームで一番大きく出る要素。
 *
 * 写真からボタンまでを Card の枠（outlineSubtle）で囲み、1つのまとまりとして
 * 見せる。**枠はカードのものであって、写真自体には輪郭も影も付けない。**
 * 写真は shape="none" のまま、カードの overflow: hidden で角丸に切り抜かれる。
 *
 * **写真の上には何も重ねない。** 日付・美容院・担当者・♡・ボタンはすべて
 * 写真の下に置く。写真の色を邪魔しないため。
 *
 * - カード本体のタップ → 記録詳細
 * - カードの長押し     → 見せるモード
 * - 「美容師さんに見せる」→ 見せるモード
 */
export function HeroCard({ visit }: HeroCardProps) {
  const c = useTheme();
  const router = useRouter();
  const { height } = useWindowDimensions();

  // 写真の高さに上限を設ける。縦長の写真だと、日付・美容院名・
  // 「美容師さんに見せる」がファーストビューから押し出されてしまうため
  const photoMaxHeight = height * layout.heroMaxHeightRatio;
  // タップした瞬間に見た目を変えるためローカルに持つ。
  // 詳細画面などで変更されて一覧が読み直されたときは、prop の値に追従させる
  // （レンダリング中の state 調整。React が推奨する同期のしかた）
  const [isFavorite, setIsFavorite] = useState(visit.isFavorite);
  const [lastSynced, setLastSynced] = useState(visit.isFavorite);
  if (lastSynced !== visit.isFavorite) {
    setLastSynced(visit.isFavorite);
    setIsFavorite(visit.isFavorite);
  }

  const salonLine = formatSalonLine(visit.salonName, visit.stylistName);

  function openDetail() {
    router.push({ pathname: '/visit/[id]', params: { id: visit.id } });
  }

  function openShowcase() {
    router.push({ pathname: '/showcase/[id]', params: { id: visit.id } });
  }

  function handleLongPress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    openShowcase();
  }

  async function handleToggleFavorite() {
    // 先に見た目を変えて、DB の書き込みを待たせない
    setIsFavorite((previous) => !previous);
    try {
      const next = await toggleFavorite(visit.id);
      setIsFavorite(next);
    } catch (error) {
      setIsFavorite((previous) => !previous);
      console.error('[hairlog] お気に入りの更新に失敗しました', error);
    }
  }

  return (
    <Card flat flush style={styles.container}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${formatDate(visit.visitedAt)} の記録を開く`}
        onPress={openDetail}
        onLongPress={handleLongPress}
        delayLongPress={400}
        style={({ pressed }) => pressed && styles.pressed}>
        {/*
          maxHeight で枠の幅が縮むことがあるため、その左右に残る余白は
          カードの surface（白）ではなく写真の下地色で埋める。
          photoBackground は無彩色寄りなので、髪色の見え方には影響しない。
        */}
        <View style={[styles.photoArea, { backgroundColor: c.photoBackground }]}>
          <PhotoFrame
            uri={visit.coverUri}
            // 角丸はカード側が持つ。写真自体には付けない
            shape="none"
            aspectRatio={layout.photoAspectRatio}
            maxHeight={photoMaxHeight}
            accessibilityLabel="最新の髪型"
          />
        </View>
      </Pressable>

      <View style={styles.body}>
        <View style={styles.meta}>
          <View style={styles.metaText}>
            <Text variant="caption" color="textMuted">
              {formatDate(visit.visitedAt)}
            </Text>
            {salonLine ? (
              <Text variant="caption" color="textMuted" numberOfLines={1}>
                {salonLine}
              </Text>
            ) : null}
          </View>

          <IconButton
            accessibilityLabel={isFavorite ? 'お気に入りを解除' : 'お気に入りに追加'}
            onPress={handleToggleFavorite}>
            <Text variant="subhead" style={{ color: isFavorite ? c.accentSecondary : c.textFaint }}>
              {isFavorite ? '♥' : '♡'}
            </Text>
          </IconButton>
        </View>

        <Button
          label="美容師さんに見せる"
          variant="primary"
          sink
          fullWidth
          onPress={openShowcase}
          style={styles.showButton}
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing.xl,
  },
  pressed: {
    opacity: 0.9,
  },
  photoArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    padding: spacing.md,
  },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  metaText: {
    flex: 1,
    gap: 2,
  },
  showButton: {
    marginTop: spacing.sm,
  },
});
