import { DateTimePicker } from '@expo/ui/community/datetime-picker';
import * as Haptics from 'expo-haptics';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, Linking, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, Section, SolidSurface, Text } from '@/components/ui';
import { border, radius, screenPadding, spacing } from '@/constants/theme';
import { useTheme, useThemeScheme } from '@/hooks/use-theme';
import { formatDateTime } from '@/lib/format';
import {
  cancelReminder,
  ensurePermission,
  getNextReminder,
  scheduleReminder,
  scheduleTestNotification,
} from '@/lib/notifications';
import type { PhotoReminder } from '@/types/models';

/** 既定の候補。次に開いたときにすぐ選べるよう、翌日の昼あたりに置く */
function defaultAppointment(): Date {
  const date = new Date();
  date.setDate(date.getDate() + 1);
  date.setHours(13, 0, 0, 0);
  return date;
}

/**
 * 撮影リマインド。次の美容院の予約日時を登録すると、施術後に通知が届く。
 *
 * 記録追加の日付とは逆で、**未来しか選べない**（これから行く予約を登録するため）。
 *
 * **カレンダーの書体は変えられない。** DateTimePicker は iOS の UIDatePicker を
 * そのまま出すネイティブ部品で、中の文字は OS が描いている。公開 prop に
 * フォントを指定するものが無く、M PLUS Rounded 1c にするにはカレンダーを
 * JS で自作するしかない（月送り・地域設定・アクセシビリティまで自前になる）。
 * 色（accentColor）とライト/ダーク（themeVariant）だけは合わせてある。
 */
export function Reminder() {
  const c = useTheme();
  const scheme = useThemeScheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [reminder, setReminder] = useState<PhotoReminder | null>(null);
  const [draft, setDraft] = useState(defaultAppointment);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    try {
      const next = await getNextReminder();
      setReminder(next);
      if (next) setDraft(new Date(next.appointmentAt));
    } catch (error) {
      console.error('[hairlog] リマインドの読み込みに失敗しました', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  async function handleRegister() {
    if (busy) return;
    setBusy(true);
    try {
      // 許可はここで初めて求める。アプリ起動時には求めない
      if (!(await ensurePermission())) {
        Alert.alert(
          '通知が許可されていません',
          'iPhone の「設定」→「hairlog」→「通知」から許可すると、撮影のお知らせが届きます。',
          [
            { text: '閉じる', style: 'cancel' },
            { text: '設定を開く', onPress: () => void Linking.openSettings() },
          ]
        );
        return;
      }

      await scheduleReminder(draft);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      setEditing(false);
      await reload();
    } catch (error) {
      console.error('[hairlog] リマインドの登録に失敗しました', error);
      Alert.alert('登録できませんでした', 'もう一度お試しください。');
    } finally {
      setBusy(false);
    }
  }

  function handleCancel() {
    Alert.alert('予約を取り消しますか？', '撮影のお知らせは届かなくなります。', [
      { text: 'やめる', style: 'cancel' },
      {
        text: '取り消す',
        style: 'destructive',
        onPress: () => {
          void runCancel();
        },
      },
    ]);
  }

  async function runCancel() {
    setBusy(true);
    try {
      await cancelReminder();
      setDraft(defaultAppointment());
      setEditing(false);
      await reload();
    } catch (error) {
      console.error('[hairlog] リマインドの取り消しに失敗しました', error);
      Alert.alert('取り消せませんでした', 'もう一度お試しください。');
    } finally {
      setBusy(false);
    }
  }

  /**
   * 【開発中の切り分け用】1分後にテスト通知を出す。
   * 本番の1本目は予約の2時間後なので、そのままでは当日中に届かず、
   * 「届かない」のか「まだ来ていない」だけなのか分からないため。
   */
  async function handleTestNotification() {
    if (await scheduleTestNotification()) {
      Alert.alert('1分後にテスト通知を送ります', 'アプリを開いたままでも届きます。');
      return;
    }
    Alert.alert(
      '通知が許可されていません',
      'iPhone の「設定」→「hairlog」→「通知」から許可してください。',
      [
        { text: '閉じる', style: 'cancel' },
        { text: '設定を開く', onPress: () => void Linking.openSettings() },
      ]
    );
  }

  const showPicker = editing || !reminder;

  return (
    // formSheet では上の inset が 0 になる。paddingTop: insets.top は全画面のときだけ
    // 正しく、シートでは余計な余白が入るので SafeAreaView に任せる
    <SafeAreaView edges={['top']} style={[styles.container, { backgroundColor: c.background }]}>
      {/* 区切り線でヘッダーと本文を分ける。無いと、下を通る文字と視覚的に溶ける */}
      <View
        style={[
          styles.header,
          { backgroundColor: c.background, borderBottomColor: c.outlineSubtle },
        ]}>
        <Button label="閉じる" variant="secondary" onPress={() => router.back()} />
      </View>

      <ScrollView
        contentContainerStyle={{
          // ネイティブのピッカーは月名をタップすると年月の選択が上へせり出す。
          // 上に余白を取らないとヘッダーに重なる
          paddingTop: spacing.lg,
          paddingBottom: insets.bottom + spacing.xxl,
        }}>
        <Section title="次の予約">
          {reminder && !editing ? (
            <Card>
              <Text variant="title">{formatDateTime(reminder.appointmentAt)} に予約</Text>
              <Text variant="caption" color="textMuted" style={styles.note}>
                施術後に撮影をお知らせします
              </Text>
            </Card>
          ) : (
            <Text variant="caption" color="textMuted">
              予約日時を登録すると、施術後に「今日の髪型を撮っておきましょう」とお知らせします。
            </Text>
          )}
        </Section>

        {showPicker ? (
          <Section title="日時を選ぶ">
            <SolidSurface
              background="surface"
              outline="outline"
              borderRadius={radius.card}
              contentStyle={styles.pickerBody}>
              <DateTimePicker
                value={draft}
                mode="datetime"
                display="inline"
                // 記録追加の日付と逆で、これから行く予約なので未来しか選べない
                minimumDate={new Date()}
                locale="ja_JP"
                accentColor={c.accent}
                themeVariant={scheme}
                onValueChange={(_event, date) => setDraft(date)}
                style={styles.picker}
              />
            </SolidSurface>
          </Section>
        ) : null}

        <View style={styles.actions}>
          {showPicker ? (
            <Button
              label={reminder ? 'この日時に変更' : 'この日時で登録'}
              sink
              fullWidth
              loading={busy}
              onPress={handleRegister}
            />
          ) : (
            <Button label="日時を変更" sink fullWidth onPress={() => setEditing(true)} />
          )}

          {reminder ? (
            <Button
              label="予約を取り消す"
              variant="danger"
              fullWidth
              onPress={handleCancel}
              style={styles.cancelButton}
            />
          ) : null}
        </View>

        {/* 開発ビルドのときだけ出す。リリースでは __DEV__ が false になり消える */}
        {__DEV__ ? (
          <Section title="開発用">
            <Button
              label="1分後にテスト通知"
              variant="secondary"
              fullWidth
              onPress={() => void handleTestNotification()}
            />
            <Text variant="caption" color="textMuted" style={styles.note}>
              本番と同じ文面で1分後に届きます。iOS は端末の時計を進めても通知が
              早まらないため、実際に1分待って確認してください。
            </Text>
          </Section>
        ) : null}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    paddingHorizontal: screenPadding,
    paddingVertical: spacing.sm,
    borderBottomWidth: border.hairline,
  },
  actions: {
    paddingHorizontal: screenPadding,
  },
  note: {
    marginTop: spacing.xs,
  },
  pickerBody: {
    padding: spacing.sm,
  },
  picker: {
    alignSelf: 'stretch',
    // インラインのカレンダーと時刻には高さが要る
    height: 400,
  },
  cancelButton: {
    marginTop: spacing.md,
  },
});
