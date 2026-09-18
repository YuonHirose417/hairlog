import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import { useState } from 'react';
import { Modal, Pressable, StyleSheet, View } from 'react-native';

import { Button, SolidSurface, Text } from '@/components/ui';
import { radius, spacing } from '@/constants/theme';
import { useTheme, useThemeScheme } from '@/hooks/use-theme';
import { formatDate } from '@/lib/format';

export type DateFieldProps = {
  value: Date;
  onChange: (next: Date) => void;
};

/**
 * 日付。既定は今日で、**タップしたときだけ**カレンダーを開く。
 *
 * iOS のインラインピッカーには確定・キャンセルが無いため、自前のモーダルに載せて
 * 下書きの日付を持ち、「決定」で初めて確定する。
 *
 * 画面に出す日付は常に formatDate()（2026.09.18）を通す。端末の暦設定に
 * 関わらずアプリ内の表記を西暦でそろえるため。
 *
 * **カレンダーの書体は変えられない。** DateTimePicker は iOS の UIDatePicker を
 * そのまま出すネイティブ部品で、中の文字は OS が描いている。公開 prop に
 * フォントを指定するものが無いため、ここだけシステムフォントになる。
 * 色（accentColor）とライト/ダーク（themeVariant）だけは合わせてある。
 */
export function DateField({ value, onChange }: DateFieldProps) {
  const c = useTheme();
  const scheme = useThemeScheme();

  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);

  function openPicker() {
    setDraft(value);
    setOpen(true);
  }

  function confirm() {
    onChange(draft);
    setOpen(false);
  }

  return (
    <View>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`日付 ${formatDate(value.toISOString())}。タップして変更`}
        onPress={openPicker}
        style={({ pressed }) => pressed && styles.pressed}>
        <SolidSurface
          background="surface"
          outline="outline"
          borderRadius={radius.pill}
          contentStyle={styles.chip}>
          <Text variant="caption" color="text">
            {formatDate(value.toISOString())}
          </Text>
          <Text variant="caption" color="textMuted">
            ▾
          </Text>
        </SolidSurface>
      </Pressable>

      <Modal visible={open} transparent animationType="fade" onRequestClose={() => setOpen(false)}>
        <View style={[styles.scrim, { backgroundColor: c.scrim }]}>
          <SolidSurface
            background="surface"
            outline="outline"
            borderRadius={radius.sheet}
            style={styles.sheet}
            contentStyle={styles.sheetBody}>
            <View style={styles.sheetHeader}>
              <Button label="キャンセル" variant="secondary" onPress={() => setOpen(false)} />
              <Text variant="subhead">日付</Text>
              <Button label="決定" sink onPress={confirm} />
            </View>

            <DateTimePicker
              value={draft}
              mode="date"
              // カレンダーを直接出す。既定（compact）だとボタン1つになり日付を選べない
              display="inline"
              // 美容院に行った日を記録するので未来は選べない
              maximumDate={new Date()}
              locale="ja_JP"
              accentColor={c.accent}
              themeVariant={scheme}
              onValueChange={(_event, date) => setDraft(date)}
              style={styles.picker}
            />
          </SolidSurface>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  pressed: { opacity: 0.7 },
  scrim: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.md,
  },
  sheet: {
    alignSelf: 'stretch',
  },
  sheetBody: {
    padding: spacing.md,
    gap: spacing.md,
  },
  sheetHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
  },
  picker: {
    alignSelf: 'stretch',
    // インラインのカレンダーは高さが要る
    height: 340,
  },
});
