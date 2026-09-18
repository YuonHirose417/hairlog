import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';

import { motion } from '@/constants/theme';
import { resolvePhotoUri } from '@/lib/photos';

/** ピンチで広げられる上限。これ以上は粗くなって意味がない */
const MAX_SCALE = 4;
/** ダブルタップで一気に寄せる倍率 */
const DOUBLE_TAP_SCALE = 2.5;

export type ZoomablePhotoProps = {
  /** DB に入っている相対パス */
  uri: string;
  width: number;
  height: number;
  /**
   * 拡大が始まった / 終わったときだけ呼ばれる。
   * 親はこれを見てページ送りを止め、メモを隠す。
   */
  onZoomChange: (zoomed: boolean) => void;
};

/**
 * 1枚ぶんの写真。ピンチとダブルタップで拡大し、拡大中だけドラッグで動かせる。
 *
 * 倍率と位置は共有値（UI スレッド）で持ち、React は再描画しない。
 * RN ランタイムへ渡すのは **拡大の開始と終了だけ**（onUpdate からは呼ばない）。
 */
export function ZoomablePhoto({ uri, width, height, onZoomChange }: ZoomablePhotoProps) {
  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);
  /** 親へ通知済みの状態。同じ値を何度も渡さないため */
  const notified = useSharedValue(false);

  function notify(zoomed: boolean) {
    'worklet';
    if (notified.get() === zoomed) return;
    notified.set(zoomed);
    scheduleOnRN(onZoomChange, zoomed);
  }

  function reset() {
    'worklet';
    scale.set(withSpring(1, { duration: 300, dampingRatio: 0.8 }));
    translateX.set(withSpring(0, { duration: 300, dampingRatio: 0.8 }));
    translateY.set(withSpring(0, { duration: 300, dampingRatio: 0.8 }));
    savedScale.set(1);
    savedX.set(0);
    savedY.set(0);
    notify(false);
  }

  /** 拡大した写真が画面の外へ流れていかないよう、動かせる範囲で止める */
  function clamp(value: number, limit: number) {
    'worklet';
    return Math.min(Math.max(value, -limit), limit);
  }

  const pinch = Gesture.Pinch()
    .onStart(() => {
      notify(true);
    })
    .onUpdate((event) => {
      scale.set(Math.min(savedScale.get() * event.scale, MAX_SCALE));
    })
    .onEnd(() => {
      if (scale.get() <= 1) {
        reset();
        return;
      }
      savedScale.set(scale.get());
    });

  const pan = Gesture.Pan()
    // 等倍のときは触らせない。横スワイプのページ送りに譲る
    .enabled(true)
    .onStart(() => {
      savedX.set(translateX.get());
      savedY.set(translateY.get());
    })
    .onUpdate((event) => {
      if (scale.get() <= 1) return;
      const limitX = (width * (scale.get() - 1)) / 2;
      const limitY = (height * (scale.get() - 1)) / 2;
      translateX.set(clamp(savedX.get() + event.translationX, limitX));
      translateY.set(clamp(savedY.get() + event.translationY, limitY));
    });

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      if (scale.get() > 1) {
        reset();
        return;
      }
      scale.set(withTiming(DOUBLE_TAP_SCALE, { duration: motion.duration.base }));
      savedScale.set(DOUBLE_TAP_SCALE);
      notify(true);
    });

  const gesture = Gesture.Simultaneous(pinch, pan, doubleTap);

  const photoStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.get() },
      { translateY: translateY.get() },
      { scale: scale.get() },
    ],
  }));

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[{ width, height }, styles.page, photoStyle]}>
        <Image
          source={{ uri: resolvePhotoUri(uri) }}
          // 髪型の輪郭が切れては意味がないので、切り抜かず全体を見せる
          contentFit="contain"
          cachePolicy="memory-disk"
          transition={120}
          style={StyleSheet.absoluteFill}
        />
      </Animated.View>
    </GestureDetector>
  );
}

const styles = StyleSheet.create({
  page: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
