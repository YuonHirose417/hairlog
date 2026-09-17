import * as Haptics from 'expo-haptics';
import { Pressable, ScrollView, StyleSheet } from 'react-native';

import { Text } from '@/components/ui/text';
import { border, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

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
 */
export function SuggestionRow({ items, selected, onSelect }: SuggestionRowProps) {
  const c = useTheme();

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
            style={({ pressed }) => [
              styles.chip,
              {
                backgroundColor: isSelected ? c.accentSubtle : c.surfaceSunken,
                borderWidth: border.bold,
                borderColor: isSelected ? c.accentSecondary : c.outlineSubtle,
              },
              pressed && styles.pressed,
            ]}>
            <Text variant="caption" color={isSelected ? 'accentSecondary' : 'textMuted'} numberOfLines={1}>
              {item}
            </Text>
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
    borderRadius: radius.pill,
    maxWidth: 200,
  },
  pressed: { opacity: 0.6 },
});
