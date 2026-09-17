import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { Divider, Text } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { formatDate } from '@/lib/format';

export type DateFieldProps = {
  value: Date;
  onChange: (next: Date) => void;
};

/**
 * 日付。既定は今日で、**タップしたときだけ**ピッカーを開く。
 *
 * 常にピッカーを出しておくと場所を取り、写真とメモが小さくなる。
 * ほとんどの記録は当日に書かれるので、既定のまま触らずに済むのが普通。
 */
export function DateField({ value, onChange }: DateFieldProps) {
  const [open, setOpen] = useState(false);

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`日付 ${formatDate(value.toISOString())}。タップして変更`}
        onPress={() => setOpen((previous) => !previous)}
        style={({ pressed }) => [styles.row, pressed && styles.pressed]}>
        <Text variant="caption" color="textFaint" style={styles.label}>
          日付
        </Text>
        <Text variant="caption" color="text">
          {formatDate(value.toISOString())}
        </Text>
        <Text variant="caption" color="textFaint">
          {open ? '  ▲' : '  ▾'}
        </Text>
      </Pressable>

      {open ? (
        <View style={styles.picker}>
          <DateTimePicker
            value={value}
            mode="date"
            // 未来の来店は記録しない
            maximumDate={new Date()}
            onValueChange={(_event, date) => onChange(date)}
          />
        </View>
      ) : null}

      <Divider />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.sm,
  },
  pressed: { opacity: 0.6 },
  label: {
    width: 48,
  },
  picker: {
    alignItems: 'center',
    paddingBottom: spacing.sm,
  },
});
