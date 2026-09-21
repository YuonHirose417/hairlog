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
  getVisit,
  lastVisit,
  updateVisit,
} from '@/lib/db';
import { savePhoto } from '@/lib/photos';
import { deleteVisitWithPhotos, syncVisitPhotos } from '@/lib/visits';
import { cancelRemindersForDate } from '@/lib/notifications';
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
 *
 * **visitId を渡すと編集モードになる。** 既存の値を読み込み、写真の選択肢を
 * 自動では出さず、保存は更新になる。
 */
export type AddVisitProps = {
  /** 編集する記録の id。未指定なら新規作成 */
  visitId?: string;
  /**
   * 日付の初期値（ISO8601）。撮影リマインドの通知から開いたときに**予約日**が入る。
   * 翌朝タップされても、記録の日付が予約日になるようにするため。
   */
  initialDate?: string;
};

export function AddVisit({ visitId, initialDate }: AddVisitProps) {
  const editing = Boolean(visitId);
  const c = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const [visitedAt, setVisitedAt] = useState(() => {
    if (!initialDate) return new Date();
    const parsed = new Date(initialDate);
    return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
  });
  const [salonName, setSalonName] = useState('');
  const [stylistName, setStylistName] = useState('');
  const [memo, setMemo] = useState('');
  const [uris, setUris] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const [salonOptions, setSalonOptions] = useState<string[]>([]);
  const [stylistOptions, setStylistOptions] = useState<string[]>([]);

  /**
   * 編集モードで読み込んだ時点の内容。
   * 破棄の確認は**これとの差分**で判定する。新規と同じ「何か入力があるか」だと、
   * 開いただけで必ず確認が出てしまう。
   */
  const [original, setOriginal] = useState<string | null>(null);

  /**
   * 写真の取り込みが走っている間は true。連打で選択肢やカメラが二重に開くのを防ぐ。
   *
   * **ref と state の両方を持つ。** ref は同期的に立つので同じフレームの2回目の
   * タップを確実に弾ける。state は「いま押せない」見た目を出すために使う
   * （state だけだと反映が次の描画になり、取りこぼす）。
   */
  const picking = useRef(false);
  const [pickingNow, setPickingNow] = useState(false);

  const addPhotos = useCallback(async () => {
    if (picking.current) return;
    picking.current = true;
    setPickingNow(true);

    try {
      const result = await pickPhotos();
      if (result.denied) {
        alertPermissionDenied(result.denied);
        return;
      }
      if (result.uris.length === 0) return;

      // 同じ写真を二重に足さない
      setUris((previous) => [...previous, ...result.uris.filter((u) => !previous.includes(u))]);
    } finally {
      // 途中 return でも例外でも必ず戻す。ここを通らないとタイルが押せなくなる
      picking.current = false;
      setPickingNow(false);
    }
  }, []);

  useEffect(() => {
    async function loadDefaults() {
      const [salons, stylists] = await Promise.all([
        distinctSalonNames(),
        distinctStylistNames(),
      ]);
      setSalonOptions(salons);
      setStylistOptions(stylists);

      if (visitId) {
        // 編集: その記録の値を入れる
        const visit = await getVisit(visitId);
        if (!visit) return;
        setVisitedAt(new Date(visit.visitedAt));
        setSalonName(visit.salonName ?? '');
        setStylistName(visit.stylistName ?? '');
        setMemo(visit.memo ?? '');
        setUris(visit.photos.map((photo) => photo.uri));
        setOriginal(
          snapshot(
            visit.visitedAt,
            visit.salonName ?? '',
            visit.stylistName ?? '',
            visit.memo ?? '',
            visit.photos.map((photo) => photo.uri)
          )
        );
        return;
      }

      // 新規: 前回の値を初期値にする。毎回打ち直さずに済むように
      const previous = await lastVisit();
      setSalonName(previous?.salonName ?? '');
      setStylistName(previous?.stylistName ?? '');
    }
    void loadDefaults();
  }, [visitId]);

  // 写真は必須。メモ・美容院名・担当者名は任意
  const hasPhotos = uris.length > 0;
  const hasInput =
    hasPhotos ||
    memo.trim().length > 0 ||
    salonName.trim().length > 0 ||
    stylistName.trim().length > 0;

  const current = snapshot(visitedAt.toISOString(), salonName, stylistName, memo, uris);
  // 編集は読み込んだ内容からの差分、新規は何か入力があるかで判定する
  const dirty = editing ? original !== null && current !== original : hasInput;

  function handleClose() {
    if (!dirty) {
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
      const input = {
        visitedAt: visitedAt.toISOString(),
        salonName,
        stylistName,
        memo,
      };

      if (visitId) {
        await updateVisit(visitId, input);
        // 消えたもの・増えたもの・並び順をまとめて反映する
        await syncVisitPhotos(visitId, uris);
      } else {
        const visit = await createVisit(input);
        createdId = visit.id;

        // 並べ替えた順にアプリ内へコピーする。先頭が代表写真になる
        for (const uri of uris) {
          const saved = await savePhoto(uri);
          await addPhoto({ visitId: visit.id, uri: saved, takenAt: visit.visitedAt });
        }

        // その日の記録が残ったので、残りの撮影リマインドは要らない。
        // 失敗しても保存は成功しているので、握りつぶして先へ進める
        await cancelRemindersForDate(visit.visitedAt).catch(() => {});
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
            busy={pickingNow}
          />
        </Section>

        <Section title="メモ">
          <MemoField value={memo} onChangeText={setMemo} minHeight={200} />
        </Section>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

/** 破棄の確認に使う、内容の指紋 */
function snapshot(
  visitedAt: string,
  salonName: string,
  stylistName: string,
  memo: string,
  uris: string[]
): string {
  return JSON.stringify([visitedAt, salonName.trim(), stylistName.trim(), memo.trim(), uris]);
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
