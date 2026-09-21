import * as Haptics from 'expo-haptics';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { PhotoFrame, SolidSurface, Text } from '@/components/ui';
import { border, depth, motion, radius, spacing, sticker } from '@/constants/theme';

/** サムネイルの一辺 */
const TILE = 96;
const GAP = spacing.sm;
/** 掴んだ札が何px動いたら隣と入れ替えるか */
const SWAP_DISTANCE = TILE + GAP;

export type PhotoStripProps = {
  /** まだ保存していない写真の絶対 URI。先頭が代表写真 */
  uris: string[];
  onReorder: (next: string[]) => void;
  onRemove: (index: number) => void;
  onAdd: () => void;
  /** 写真の取り込み中。連打で二重に開かないよう、追加タイルを押せなくする */
  busy?: boolean;
};

/**
 * 追加する写真を横に並べる。長押しでドラッグして並べ替えられる。
 *
 * **先頭が代表写真**になり、ホームのグリッドとカードに出る。
 * 枚数が数枚の想定なので、仮想化せず ScrollView に素直に並べる。
 */
export function PhotoStrip({ uris, onReorder, onRemove, onAdd, busy = false }: PhotoStripProps) {
  // 写真は必須なので、1枚も無いときは大きく出して最初に目が行くようにする
  if (uris.length === 0) {
    return <EmptyAddTile onPress={onAdd} busy={busy} />;
  }

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.content}>
      {uris.map((uri, index) => (
        <PhotoTile
          key={uri}
          uri={uri}
          index={index}
          total={uris.length}
          onRemove={() => onRemove(index)}
          onMove={(from, to) => {
            const next = [...uris];
            const [moved] = next.splice(from, 1);
            next.splice(to, 0, moved);
            onReorder(next);
          }}
        />
      ))}

      <AddTile onPress={onAdd} busy={busy} />
    </ScrollView>
  );
}

type PhotoTileProps = {
  uri: string;
  index: number;
  total: number;
  onRemove: () => void;
  onMove: (from: number, to: number) => void;
};

function PhotoTile({ uri, index, total, onRemove, onMove }: PhotoTileProps) {
  const translateX = useSharedValue(0);
  const lifted = useSharedValue(0);

  const drag = Gesture.Pan()
    // 横スクロールと取り合いにならないよう、長押ししてから掴む
    .activateAfterLongPress(250)
    .onStart(() => {
      lifted.set(withTiming(1, { duration: motion.duration.fast }));
      scheduleOnRN(Haptics.impactAsync, Haptics.ImpactFeedbackStyle.Light);
    })
    .onUpdate((event) => {
      // ここから RN ランタイムを呼ばない（毎フレーム走るため）
      translateX.set(event.translationX);
    })
    .onEnd((event) => {
      const steps = Math.round(event.translationX / SWAP_DISTANCE);
      const target = Math.min(Math.max(index + steps, 0), total - 1);

      translateX.set(withSpring(0, { duration: 400, dampingRatio: 0.8, velocity: event.velocityX }));
      lifted.set(withTiming(0, { duration: motion.duration.fast }));

      if (target !== index) {
        scheduleOnRN(Haptics.selectionAsync);
        scheduleOnRN(onMove, index, target);
      }
    });

  const tileStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.get() }, { scale: 1 + lifted.get() * 0.05 }],
    zIndex: lifted.get() > 0 ? 1 : 0,
  }));

  return (
    <GestureDetector gesture={drag}>
      <Animated.View style={[styles.tile, tileStyle]}>
        <PhotoFrame uri={uri} shape="thumb" aspectRatio={1} accessibilityLabel={`写真 ${index + 1}`}>
          {index === 0 ? (
            <View style={styles.leadBadge}>
              <Text variant="caption" style={styles.badgeText}>
                代表
              </Text>
            </View>
          ) : null}
        </PhotoFrame>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`写真 ${index + 1} を削除`}
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            onRemove();
          }}
          hitSlop={8}
          style={({ pressed }) => [styles.removeButton, pressed && styles.pressed]}>
          <Text variant="caption" style={styles.badgeText}>
            ✕
          </Text>
        </Pressable>

        {index === 0 && total > 1 ? (
          <Text variant="caption" color="textFaint" style={styles.hint} numberOfLines={1}>
            長押しで並べ替え
          </Text>
        ) : null}
      </Animated.View>
    </GestureDetector>
  );
}

/** 写真が1枚以上あるときの、末尾に置く小さな追加タイル */
function AddTile({ onPress, busy }: { onPress: () => void; busy: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="写真を追加"
      accessibilityState={{ disabled: busy }}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed, busy && styles.busy]}>
      <SolidSurface
        background="surfaceSunken"
        outline="outline"
        borderRadius={radius.thumb}
        depth={depth.small}
        contentStyle={styles.addTile}>
        <Text variant="title" color="textMuted">
          ＋
        </Text>
      </SolidSurface>
    </Pressable>
  );
}

/** 写真が0枚のときの、大きく目立つ追加タイル */
function EmptyAddTile({ onPress, busy }: { onPress: () => void; busy: boolean }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="写真を追加"
      accessibilityState={{ disabled: busy }}
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed, busy && styles.busy]}>
      <SolidSurface
        background="surfaceSunken"
        outline="outline"
        borderRadius={radius.card}
        contentStyle={styles.emptyTile}>
        <Text variant="display" color="textMuted">
          ＋
        </Text>
        <Text variant="subhead" color="text">
          写真を追加
        </Text>
        <Text variant="caption" color="textMuted">
          正面・横・後ろをまとめて選べます
        </Text>
      </SolidSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: GAP,
    paddingVertical: spacing.sm,
  },
  tile: {
    width: TILE,
  },
  leadBadge: {
    position: 'absolute',
    left: spacing.xs,
    bottom: spacing.xs,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 1,
    borderRadius: radius.pill,
    backgroundColor: sticker.background,
    borderWidth: border.hairline,
    borderColor: sticker.border,
  },
  removeButton: {
    position: 'absolute',
    top: spacing.xs,
    right: spacing.xs,
    width: 24,
    height: 24,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: sticker.background,
    borderWidth: border.hairline,
    borderColor: sticker.border,
  },
  badgeText: {
    color: sticker.text,
  },
  hint: {
    marginTop: spacing.xs,
  },
  addTile: {
    width: TILE,
    height: TILE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyTile: {
    paddingVertical: spacing.xxl,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.xs,
  },
  pressed: { opacity: 0.6 },
  // 黙って無反応にせず、受け付けていないことを見て分かるようにする
  busy: { opacity: 0.4 },
});
