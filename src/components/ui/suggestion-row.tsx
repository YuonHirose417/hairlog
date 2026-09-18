import * as Haptics from 'expo-haptics';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { SolidSurface } from '@/components/ui/solid-surface';
import { Text } from '@/components/ui/text';
import { depth, radius, spacing } from '@/constants/theme';

export type SuggestionRowProps = {
  /** 過去に入力された値。db.distinctSalonNames() などの結果を渡す */
  items: string[];
  /** 現在入力されている値。一致するものを選択状態にする */
  selected?: string | null;
  onSelect: (value: string) => void;
};

/**
 * 過去の入力を再利用するための候補。
 *
 * これは選択式入力（チップ・プルダウン）の追加ではなく、
 * 自由入力の手間を省くための補助。候補に無い値も自由に入力できる。
 *
 * 選択中は accentSecondary を敷いて、どれが選ばれているか一目で分かるようにする。
 */
export function SuggestionRow({ items, selected, onSelect }: SuggestionRowProps) {
  if (items.length === 0) return null;

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={styles.content}>
      {items.map((item) => {
        const isSelected = item === selected;
        return (
          <Pressable
            key={item}
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            onPress={() => {
              Haptics.selectionAsync().catch(() => {});
              onSelect(item);
            }}
            style={({ pressed }) => pressed && styles.pressed}>
            <SolidSurface
              background={isSelected ? 'accentSecondary' : 'surface'}
              outline="outline"
              borderRadius={radius.pill}
              depth={depth.small}
              contentStyle={styles.chip}>
              <Text
                variant="caption"
                color={isSelected ? 'onAccentSecondary' : 'text'}
                numberOfLines={1}>
                {item}
              </Text>
            </SolidSurface>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxWidth: 200,
  },
  pressed: { opacity: 0.7 },
});
