import { useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  View,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { PhotoFrame, Text } from '@/components/ui';
import { border, radius, spacing, sticker } from '@/constants/theme';
import type { Photo } from '@/types/models';

export type PhotoPagerProps = {
  photos: Photo[];
  width: number;
  maxHeight: number;
  /** 写真をタップしたとき。見せるモードへ進む */
  onPress: () => void;
};

/**
 * 記録詳細の写真。左右スワイプで切り替え、タップで見せるモードへ進む。
 *
 * **見せるモードの pager とは別部品。** あちらは黒背景・拡大あり・showcase の固定色、
 * こちらはテーマ色・拡大なし・タップで遷移。共通なのは FlatList の paging と
 * 枚数表示だけで、1つにすると分岐だらけになる。
 * 拡大のジェスチャを持たないぶん、こちらははるかに単純に書ける。
 */
export function DetailPhotoPager({ photos, width, maxHeight, onPress }: PhotoPagerProps) {
  const [index, setIndex] = useState(0);

  function handleMomentumEnd(event: NativeSyntheticEvent<NativeScrollEvent>) {
    setIndex(Math.round(event.nativeEvent.contentOffset.x / width));
  }

  return (
    <View>
      <FlatList
        data={photos}
        keyExtractor={(photo) => photo.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleMomentumEnd}
        renderItem={({ item, index: position }) => (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`写真 ${position + 1} を大きく見る`}
            onPress={onPress}
            style={({ pressed }) => [{ width }, pressed && styles.pressed]}>
            <PhotoFrame uri={item.uri} shape="none" maxHeight={maxHeight} />
          </Pressable>
        )}
      />

      {/* 1枚しかないときは出さない */}
      {photos.length > 1 ? (
        <View style={styles.counter}>
          <Text variant="caption" style={styles.counterText}>
            {index + 1} / {photos.length}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  pressed: { opacity: 0.85 },
  counter: {
    position: 'absolute',
    top: spacing.sm,
    right: spacing.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 1,
    borderRadius: radius.pill,
    // 枚数バッジと同じシール風。写真の上に乗るのでアクセント色は使わない
    backgroundColor: sticker.background,
    borderWidth: border.bold,
    borderColor: sticker.border,
  },
  counterText: {
    color: sticker.text,
  },
});
