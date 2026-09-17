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
  /** 高さの上限。縦長の写真が画面を占領しないように使う */
  maxHeight?: number;
  /** 写真の上に重ねる要素（♡ や枚数バッジなど） */
  children?: React.ReactNode;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

/**
 * 写真の表示はすべてこのコンポーネントを通す。
 *
 * **輪郭線も影もアクセント色も一切付けない。** 他の面は SolidSurface で
 * 太い輪郭とソリッド影を持つが、写真だけは例外。枠や影や色を乗せると
 * 髪色が正確に見えなくなり、美容師さんに見せるという目的が損なわれる。
 *
 * 下地は無彩色寄りの photoBackground のみ。
 */
export function PhotoFrame({
  uri,
  shape = 'card',
  contentFit = 'cover',
  aspectRatio = layout.photoAspectRatio,
  maxHeight,
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
        maxHeight === undefined ? null : { maxHeight },
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
    /**
     * maxHeight で高さが頭打ちになると、Yoga は aspectRatio を保つために
     * 幅を再計算して縮める。そのままだと縮んだ枠が親の中で左寄せになり、
     * 右側だけに余白ができてしまうため中央に寄せる。
     * 幅が頭打ちにならない場所（グリッドのセルなど）では no-op。
     */
    alignSelf: 'center',
  },
});
