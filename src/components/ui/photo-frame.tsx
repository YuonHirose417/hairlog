import { Image, type ImageContentFit } from 'expo-image';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { layout, radius } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { resolvePhotoUri } from '@/lib/photos';

export type PhotoFrameProps = {
  /**
   * DB に入っている相対パス（例 photos/xxxx.jpg）。
   * 絶対 URI への変換はこのコンポーネントが行う。
   */
  uri: string | null;
  /** 角丸。グリッドは thumb、大きく見せるときは card */
  shape?: 'thumb' | 'card' | 'square' | 'none';
  contentFit?: ImageContentFit;
  /** 縦横比。既定は theme.layout.photoAspectRatio（3:4） */
  aspectRatio?: number;
  /** 写真の上に重ねる要素（♡ や枚数バッジなど） */
  children?: React.ReactNode;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * 写真の表示はすべてこのコンポーネントを通す。
 *
 * **アクセント色を一切使わない。** 枠線・影・オーバーレイに色を乗せると
 * 写真の色が濁るため、下地は無彩色の photoBackground のみ。
 */
export function PhotoFrame({
  uri,
  shape = 'card',
  contentFit = 'cover',
  aspectRatio = layout.photoAspectRatio,
  children,
  accessibilityLabel,
  style,
}: PhotoFrameProps) {
  const c = useTheme();

  const borderRadius = {
    thumb: radius.thumb,
    card: radius.card,
    square: 0,
    none: 0,
  }[shape];

  return (
    <View
      style={[
        styles.frame,
        { aspectRatio, borderRadius, backgroundColor: c.photoBackground },
        style,
      ]}>
      {uri ? (
        <Image
          source={{ uri: resolvePhotoUri(uri) }}
          contentFit={contentFit}
          // 一覧をスクロールしても再デコードが走らないようにディスクにも残す
          cachePolicy="memory-disk"
          transition={160}
          accessibilityLabel={accessibilityLabel}
          style={StyleSheet.absoluteFill}
        />
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    width: '100%',
    overflow: 'hidden',
  },
});
