import { useEffect } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { border, depth as depthTokens, motion, type ColorName } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

export type SolidSurfaceProps = {
  children: React.ReactNode;
  /** 面の背景色。テーマの色名で指定する */
  background?: ColorName;
  /** 輪郭の色。主張させたくない枠は outlineSubtle を使う */
  outline?: ColorName;
  borderWidth?: number;
  borderRadius: number;
  /** 影の面を下にずらす量 */
  depth?: number;
  /**
   * 押されている間、面を影の上へ沈める。
   * **主要なボタン（「美容師さんに見せる」と ＋）だけに使うこと。**
   * 多用すると画面が落ち着かなくなる。
   */
  sink?: boolean;
  pressed?: boolean;
  style?: StyleProp<ViewStyle>;
  /** 面の内側に渡すスタイル（padding や配置） */
  contentStyle?: StyleProp<ViewStyle>;
};

/**
 * 太い輪郭と、背面に敷いたソリッドな影で「ぷっくり」した立体感を作る。
 *
 * RN の shadow* プロパティは使わない。shadowRadius: 0 でブラーは消せても
 * Android では elevation に落ちてソリッドにならず、プラットフォーム間で
 * 見た目が割れるため。背面に色面を敷く方式なら両方で同じ絵になる。
 *
 * 押したときに動かすのは **上の面だけ**。影の面は固定なので、面が影に重なって
 * 「潰れて沈む」ように見える。
 *
 * **写真（PhotoFrame）には使わないこと。** 髪色が正確に見えなくなる。
 */
export function SolidSurface({
  children,
  background = 'surface',
  outline = 'outline',
  borderWidth = border.bold,
  borderRadius,
  depth = depthTokens.solid,
  sink = false,
  pressed = false,
  style,
  contentStyle,
}: SolidSurfaceProps) {
  const c = useTheme();

  const offset = useSharedValue(0);

  useEffect(() => {
    // 値の更新は UI スレッドで完結するので、指の動きに追従する
    offset.value = withTiming(sink && pressed ? depth : 0, {
      duration: motion.duration.fast,
    });
  }, [offset, sink, pressed, depth]);

  const faceStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value }],
  }));

  return (
    <View style={[{ paddingBottom: depth, flexShrink: 1 }, style]}>
      {/* 影の面。押しても動かさない */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          { top: depth, backgroundColor: c.solidShadow, borderRadius },
        ]}
      />

      <Animated.View
        style={[
          {
            backgroundColor: c[background],
            borderColor: c[outline],
            borderWidth,
            borderRadius,
            // 中身が長くても親の幅に収まるよう縮める
            flexShrink: 1,
          },
          contentStyle,
          faceStyle,
        ]}>
        {children}
      </Animated.View>
    </View>
  );
}
