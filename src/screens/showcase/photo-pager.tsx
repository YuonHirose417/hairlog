import { useState } from 'react';
import { FlatList, StyleSheet, View, type NativeScrollEvent, type NativeSyntheticEvent } from 'react-native';

import { radius, showcase, spacing } from '@/constants/theme';
import { ZoomablePhoto } from '@/screens/showcase/zoomable-photo';
import { ShowcaseText } from '@/screens/showcase/showcase-text';
import type { Photo } from '@/types/models';

export type PhotoPagerProps = {
  photos: Photo[];
  width: number;
  height: number;
  /** 拡大の開始・終了。親はメモの出し入れに使う */
  onZoomChange: (zoomed: boolean) => void;
};

/**
 * 写真の横スワイプ。ページ送りは FlatList の paging に任せる。
 *
 * 自前のページャは作らない。慣性・端の抵抗・位置の復元をすべて持っているため。
 * **拡大中はスクロールを止める。** 止めないと、拡大した写真を動かそうとして
 * ページが送られてしまう。
 */
export function PhotoPager({ photos, width, height, onZoomChange }: PhotoPagerProps) {
  const [index, setIndex] = useState(0);
  const [zoomed, setZoomed] = useState(false);

  function handleZoomChange(next: boolean) {
    setZoomed(next);
    onZoomChange(next);
  }

  function handleMomentumEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    const next = Math.round(event.nativeEvent.contentOffset.x / width);
    setIndex(next);
  }

  return (
    <View style={{ width, height }}>
      <FlatList
        data={photos}
        keyExtractor={(photo) => photo.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        // 拡大中はページ送りを止め、ドラッグを写真の移動に使わせる
        scrollEnabled={!zoomed}
        onMomentumScrollEnd={handleMomentumEnd}
        renderItem={({ item }) => (
          <ZoomablePhoto
            uri={item.uri}
            width={width}
            height={height}
            onZoomChange={handleZoomChange}
          />
        )}
      />

      {/* 1枚しかないときは出さない */}
      {photos.length > 1 && !zoomed ? (
        <View style={styles.counter}>
          <ShowcaseText variant="caption" muted>
            {index + 1} / {photos.length}
          </ShowcaseText>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  counter: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.md,
    paddingHorizontal: spacing.sm + spacing.xs,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    backgroundColor: showcase.control,
  },
});
