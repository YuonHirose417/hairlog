import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, MemoField, SuggestionRow, Text, TextField } from '@/components/ui';
import { screenPadding, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  addPhoto,
  createVisit,
  deleteVisit,
  distinctSalonNames,
  distinctStylistNames,
  lastVisit,
} from '@/lib/db';
import { savePhoto } from '@/lib/photos';
import { alertPermissionDenied, pickPhotos } from '@/lib/pick-photos';
import { DateField } from '@/screens/add-visit/date-field';
import { PhotoStrip } from '@/screens/add-visit/photo-strip';

/**
 * 記録追加。このアプリで最も重要な画面。
 *
 * 美容院を出た直後に片手で短時間で終わらせられることを最優先にする。
 * **入力の手数を増やす要素を足さない**（CLAUDE.md §7）。
 * 選択式の入力（チップ・プルダウン）は追加しないこと。候補チップは
 * 過去の入力を再利用するための補助であって、選択式入力ではない。
 */
export function AddVisit() {
  const c = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [visitedAt, setVisitedAt] = useState(() => new Date());
  const [salonName, setSalonName] = useState('');
  const [stylistName, setStylistName] = useState('');
  const [memo, setMemo] = useState('');
  const [uris, setUris] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [salonOptions, setSalonOptions] = useState<string[]>([]);
  const [stylistOptions, setStylistOptions] = useState<string[]>([]);

  // 開いた直後に一度だけ写真の選択肢を出す。StrictMode の二重実行も防ぐ
  const askedForPhotos = useRef(false);

  const addPhotos = useCallback(async () => {
    const result = await pickPhotos();
    if (result.denied) {
      alertPermissionDenied(result.denied);
      return;
    }
    if (result.uris.length === 0) return;

    // 同じ写真を二重に足さない
    setUris((previous) => [...previous, ...result.uris.filter((u) => !previous.includes(u))]);
  }, []);

  useEffect(() => {
    async function loadDefaults() {
      const [previous, salons, stylists] = await Promise.all([
        lastVisit(),
        distinctSalonNames(),
        distinctStylistNames(),
      ]);
      // 前回の値を初期値にする。毎回打ち直さずに済むように
      setSalonName(previous?.salonName ?? '');
      setStylistName(previous?.stylistName ?? '');
      setSalonOptions(salons);
      setStylistOptions(stylists);
    }
    void loadDefaults();
  }, []);

  useEffect(() => {
    if (askedForPhotos.current) return;
    askedForPhotos.current = true;
    // キャンセルされても画面は閉じない。メモだけの記録も書けるようにするため
    void addPhotos();
  }, [addPhotos]);

  const hasInput =
    uris.length > 0 ||
    memo.trim().length > 0 ||
    salonName.trim().length > 0 ||
    stylistName.trim().length > 0;

  function handleClose() {
    if (!hasInput) {
      router.back();
      return;
    }
    Alert.alert('入力中の内容を破棄しますか？', '保存していない写真とメモは失われます。', [
      { text: '編集を続ける', style: 'cancel' },
      { text: '破棄する', style: 'destructive', onPress: () => router.back() },
    ]);
  }

  async function handleSave() {
    // 日付は常に入っているので判定に含めない。中身が空の記録は作らない
    if (!hasInput) {
      Alert.alert('写真かメモを入力してください', '写真だけ、メモだけでも保存できます。');
      return;
    }
    if (saving) return;

    setSaving(true);
    let createdId: string | null = null;

    try {
      const visit = await createVisit({
        visitedAt: visitedAt.toISOString(),
        salonName,
        stylistName,
        memo,
      });
      createdId = visit.id;

      // 並べ替えた順にアプリ内へコピーする。先頭が代表写真になる
      for (const uri of uris) {
        const saved = await savePhoto(uri);
        await addPhoto({ visitId: visit.id, uri: saved, takenAt: visit.visitedAt });
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
      router.back();
    } catch (error) {
      // 途中まで作られた記録を残さない。入力は画面に残したまま知らせる
      if (createdId) {
        await deleteVisit(createdId).catch(() => {});
      }
      console.error('[hairlog] 記録の保存に失敗しました', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => {});
      Alert.alert('保存できませんでした', 'もう一度お試しください。入力した内容は残っています。');
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Button label="閉じる" variant="ghost" onPress={handleClose} />
        <Button label="保存" sink loading={saving} onPress={handleSave} />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.xxl },
        ]}>
        {/* 日付・美容院・担当者は上部に小さく。写真とメモを大きく見せる */}
        <DateField value={visitedAt} onChange={setVisitedAt} />

        <TextField
          label="美容院"
          value={salonName}
          onChangeText={setSalonName}
          placeholder="未入力"
          returnKeyType="next"
        />
        <SuggestionRow items={salonOptions} selected={salonName} onSelect={setSalonName} />

        <TextField
          label="担当者"
          value={stylistName}
          onChangeText={setStylistName}
          placeholder="未入力"
          returnKeyType="done"
        />
        <SuggestionRow items={stylistOptions} selected={stylistName} onSelect={setStylistName} />

        <Text variant="caption" color="textMuted" style={styles.sectionLabel}>
          {uris.length > 0 ? `写真 ${uris.length}枚` : '写真'}
        </Text>
        <PhotoStrip
          uris={uris}
          onReorder={setUris}
          onRemove={(index) => setUris((previous) => previous.filter((_, i) => i !== index))}
          onAdd={() => void addPhotos()}
        />

        <Text variant="caption" color="textMuted" style={styles.memoLabel}>
          メモ
        </Text>
        <MemoField value={memo} onChangeText={setMemo} minHeight={200} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: screenPadding,
    paddingBottom: spacing.sm,
    gap: spacing.sm,
  },
  content: {
    paddingHorizontal: screenPadding,
  },
  sectionLabel: {
    marginTop: spacing.md,
  },
  memoLabel: {
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
});
