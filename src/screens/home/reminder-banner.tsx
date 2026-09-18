import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { SolidSurface, Text } from '@/components/ui';
import { border, depth, radius, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatDateTime } from '@/lib/format';
import { getNextReminder } from '@/lib/notifications';
import type { PhotoReminder } from '@/types/models';

/**
 * 次の予約への入口。最新カードとグリッドの間に置く。
 *
 * **未登録のときは控えめな1行。** 写真が主役という方針を崩さないよう、
 * 最新カードやグリッドより目立たせない。
 * **登録済みのときだけ**、日時をはっきり見せる。
 */
export function ReminderBanner() {
  const c = useTheme();
  const router = useRouter();
  const [reminder, setReminder] = useState<PhotoReminder | null>(null);

  const reload = useCallback(async () => {
    try {
      setReminder(await getNextReminder());
    } catch (error) {
      console.error('[hairlog] リマインドの読み込みに失敗しました', error);
    }
  }, []);

  // リマインド画面から戻ったときに反映するため、画面に戻るたび読み直す
  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  function open() {
    router.push('/reminder');
  }

  if (!reminder) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="次の予約を登録する"
        onPress={open}
        style={({ pressed }) => [
          styles.quiet,
          { borderColor: c.outlineSubtle },
          pressed && styles.pressed,
        ]}>
        <Text variant="caption" color="textMuted">
          次の予約を登録して撮り忘れを防ぐ
        </Text>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${formatDateTime(reminder.appointmentAt)} の予約を変更する`}
      onPress={open}
      style={({ pressed }) => pressed && styles.pressed}>
      <SolidSurface
        background="surface"
        outline="outline"
        borderRadius={radius.card}
        depth={depth.small}
        style={styles.card}
        contentStyle={styles.cardBody}>
        <View>
          <Text variant="subhead">{formatDateTime(reminder.appointmentAt)} に予約</Text>
          <Text variant="caption" color="textMuted">
            施術後に撮影をお知らせします
          </Text>
        </View>
      </SolidSurface>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  quiet: {
    borderWidth: border.hairline,
    borderRadius: radius.control,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  card: {
    marginBottom: spacing.lg,
  },
  cardBody: {
    padding: spacing.md,
  },
  pressed: { opacity: 0.7 },
});
