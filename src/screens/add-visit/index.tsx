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

import { Button, MemoField, Section, SuggestionRow, TextField } from '@/components/ui';
import { screenPadding, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  addPhoto,
  createVisit,
  distinctSalonNames,
  distinctStylistNames,
  lastVisit,
} from '@/lib/db';
import { savePhoto } from '@/lib/photos';
import { deleteVisitWithPhotos } from '@/lib/visits';
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

  // 写真は必須。メモ・美容院名・担当者名は任意
  const hasPhotos = uris.length > 0;
  const hasInput =
    hasPhotos ||
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
    // 写真の無い記録は「この髪型よかった」を思い出す役に立たないので作らせない
    if (!hasPhotos) {
      Alert.alert('写真を1枚以上追加してください', 'メモや美容院名は後からでも構いません。');
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
      // 途中まで作られた記録を残さない。既にコピー済みの写真ファイルも一緒に消す
      if (createdId) {
        await deleteVisitWithPhotos(createdId).catch(() => {});
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
        <Button label="閉じる" variant="secondary" onPress={handleClose} />
        <Button label="保存" sink inactive={!hasPhotos} loading={saving} onPress={handleSave} />
      </View>

      <ScrollView
        keyboardShouldPersistTaps="handled"
        // 横の余白は Section が持つ。ここで足すと見出しだけ二重に下がる
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.xxl }}>
        {/* 日付・美容院・担当者は上部に小さく。写真とメモを大きく見せる */}
        <Section title="いつ">
          <DateField value={visitedAt} onChange={setVisitedAt} />
        </Section>

        <Section title="どこで・だれに">
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
        </Section>

        <Section title={hasPhotos ? `写真 ${uris.length}枚（必須）` : '写真（必須）'}>
          <PhotoStrip
            uris={uris}
            onReorder={setUris}
            onRemove={(index) => setUris((previous) => previous.filter((_, i) => i !== index))}
            onAdd={() => void addPhotos()}
          />
        </Section>

        <Section title="メモ">
          <MemoField value={memo} onChangeText={setMemo} minHeight={200} />
        </Section>
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
});
