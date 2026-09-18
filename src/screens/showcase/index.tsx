import { useKeepAwake } from 'expo-keep-awake';
import { useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { layout, radius, showcase, spacing } from '@/constants/theme';
import { useScreenBrightness } from '@/hooks/use-screen-brightness';
import { getVisit } from '@/lib/db';
import { formatDate, formatSalonLine } from '@/lib/format';
import { PhotoPager } from '@/screens/showcase/photo-pager';
import { ShowcaseText } from '@/screens/showcase/showcase-text';
import type { VisitWithPhotos } from '@/types/models';

/** メモを出しているときに、写真に残す高さの割合 */
const PHOTO_RATIO_WITH_MEMO = 0.62;

export type ShowcaseProps = {
  id: string;
};

/**
 * 見せるモード。美容院でスマホを美容師さんに渡して見せるための画面。
 *
 * **自分が操作する画面ではなく、人に手渡す画面。** 見やすさを最優先にする。
 * 背景はテーマに関係なく常に黒（showcase トークン）。useTheme の色を混ぜないこと。
 */
export function Showcase({ id }: ShowcaseProps) {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();

  const [visit, setVisit] = useState<VisitWithPhotos | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [zoomed, setZoomed] = useState(false);

  // 開いている間は画面を消灯させない。アンマウントで自動的に解除される
  useKeepAwake();
  // 開いている間は明るくし、閉じたら元に戻す
  useScreenBrightness(showcase.brightness);

  useEffect(() => {
    async function load() {
      try {
        setVisit(await getVisit(id));
      } catch (error) {
        console.error('[hairlog] 記録の読み込みに失敗しました', error);
      } finally {
        setLoaded(true);
      }
    }
    void load();
  }, [id]);

  const photos = visit?.photos ?? [];
  const memo = visit?.memo?.trim() ?? '';
  const salonLine = formatSalonLine(visit?.salonName ?? null, visit?.stylistName ?? null);

  // メモが空なら領域ごと出さず、写真を最初から全画面にする。
  // 拡大中も同じで、写真に集中させる
  const showMemo = memo.length > 0 && !zoomed;
  const available = height - insets.top - insets.bottom;
  const photoHeight = showMemo ? available * PHOTO_RATIO_WITH_MEMO : available;

  return (
    <View style={styles.container}>
      {/* 黒背景なので、時計やバッテリーは白で出す */}
      <StatusBar style="light" />

      <View style={{ paddingTop: insets.top }}>
        {loaded && photos.length > 0 ? (
          <PhotoPager
            photos={photos}
            width={width}
            height={photoHeight}
            onZoomChange={setZoomed}
          />
        ) : (
          <View style={[styles.fallback, { height: photoHeight }]}>
            {loaded ? (
              <ShowcaseText variant="memo" muted>
                この記録には写真がありません
              </ShowcaseText>
            ) : null}
          </View>
        )}
      </View>

      {showMemo ? (
        <Animated.View
          entering={FadeIn.duration(180)}
          exiting={FadeOut.duration(120)}
          style={styles.memoArea}>
          <ScrollView
            contentContainerStyle={[
              styles.memoContent,
              { paddingBottom: insets.bottom + spacing.lg },
            ]}
            showsVerticalScrollIndicator={false}>
            {visit ? (
              <ShowcaseText variant="caption" muted style={styles.meta}>
                {formatDate(visit.visitedAt)}
                {salonLine ? `　${salonLine}` : ''}
              </ShowcaseText>
            ) : null}

            <ShowcaseText variant="memo">{memo}</ShowcaseText>
          </ScrollView>
        </Animated.View>
      ) : null}

      {/* 左上。手渡された人の親指が届きにくい位置。見た目は控えめに */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="閉じる"
        onPress={() => router.back()}
        hitSlop={spacing.md}
        style={({ pressed }) => [
          styles.close,
          { top: insets.top + spacing.sm, left: spacing.md },
          pressed && styles.pressed,
        ]}>
        <ShowcaseText variant="caption" muted>
          ✕
        </ShowcaseText>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    // テーマに関係なく黒固定
    backgroundColor: showcase.background,
  },
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
  },
  memoArea: {
    flex: 1,
  },
  memoContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    gap: spacing.sm,
  },
  meta: {
    marginBottom: spacing.xs,
  },
  close: {
    position: 'absolute',
    width: layout.minTouchTarget,
    height: layout.minTouchTarget,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: showcase.control,
  },
  pressed: { opacity: 0.5 },
});
