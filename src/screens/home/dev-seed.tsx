/**
 * 【開発中だけ出る操作パネル】
 *
 * 記録追加の画面がまだ無いため、ホームの見た目を実機で確認する手段が無い。
 * 既存の savePhoto() / createVisit() / addPhoto() を繋いでサンプルを投入する。
 *
 * **記録追加の実装が終わったらこのファイルごと削除すること。**
 * （src/screens/home/index.tsx からの import も併せて消す）
 */

import * as ImagePicker from 'expo-image-picker';
import { useState } from 'react';
import { Alert, StyleSheet, View } from 'react-native';

import { Button, Card, Text } from '@/components/ui';
import { spacing } from '@/constants/theme';
import { addPhoto, createVisit, deleteAllVisits, listAllPhotoUris } from '@/lib/db';
import { removeOrphanedPhotos, savePhoto } from '@/lib/photos';

/** レイアウト確認用のサンプル。未入力（null）を必ず混ぜる */
const SAMPLE_SALONS = ['SALON GRACE', 'hair atelier mou', null, '303 hair design'];
const SAMPLE_STYLISTS = ['田中', '佐藤', null, '鈴木'];
const SAMPLE_MEMOS = [
  '前髪は眉上、横は刈り上げ6mm、すき多め',
  null,
  'トップは長さを残して重めに。襟足はすっきりさせる。\n分け目は右で、乾かすとき前に向かって乾かすと収まりが良いとのこと。\n次回は少し短めでもいいかも。',
  'いつもより1cm短め。前下がりのボブ',
];

/** 来店間隔のばらつきを再現する（週） */
const WEEK_GAPS = [3, 7, 4, 10, 5, 2, 8, 6];

function sampleVisitedAt(index: number): string {
  const date = new Date();
  let weeksBack = 0;
  for (let i = 0; i < index; i += 1) {
    weeksBack += WEEK_GAPS[i % WEEK_GAPS.length];
  }
  date.setDate(date.getDate() - weeksBack * 7);
  return date.toISOString();
}

export type DevSeedProps = {
  /** 現在の記録数。新しく作る記録の日付を既存の分だけ遡らせるのに使う */
  existingCount: number;
  onChanged: () => void;
};

export function DevSeed({ existingCount, onChanged }: DevSeedProps) {
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string | null>(null);

  async function pickImages(multiple: boolean) {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setLog('写真ライブラリへのアクセスが許可されていません');
      return null;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsMultipleSelection: multiple,
      quality: 0.9,
    });

    if (result.canceled || result.assets.length === 0) return null;
    return result.assets;
  }

  /** 1枚につき1記録。日付・美容院・担当者・メモをサンプルで散らす */
  async function handleSeedMany() {
    setBusy(true);
    try {
      const assets = await pickImages(true);
      if (!assets) return;

      for (let i = 0; i < assets.length; i += 1) {
        const index = existingCount + i;
        const uri = await savePhoto(assets[i].uri);

        const visit = await createVisit({
          visitedAt: sampleVisitedAt(index),
          salonName: SAMPLE_SALONS[index % SAMPLE_SALONS.length],
          stylistName: SAMPLE_STYLISTS[index % SAMPLE_STYLISTS.length],
          memo: SAMPLE_MEMOS[index % SAMPLE_MEMOS.length],
        });
        await addPhoto({ visitId: visit.id, uri, takenAt: visit.visitedAt });
      }

      setLog(`${assets.length}件の記録を追加しました`);
      onChanged();
    } catch (error) {
      setLog(`失敗: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  /** 複数枚を1つの記録にまとめる。枚数バッジの確認用 */
  async function handleSeedMultiPhoto() {
    setBusy(true);
    try {
      const assets = await pickImages(true);
      if (!assets) return;

      if (assets.length < 2) {
        setLog('2枚以上選んでください');
        return;
      }

      const index = existingCount;
      const visit = await createVisit({
        visitedAt: sampleVisitedAt(index),
        salonName: SAMPLE_SALONS[index % SAMPLE_SALONS.length],
        stylistName: SAMPLE_STYLISTS[index % SAMPLE_STYLISTS.length],
        memo: SAMPLE_MEMOS[index % SAMPLE_MEMOS.length],
      });

      for (const asset of assets) {
        const uri = await savePhoto(asset.uri);
        await addPhoto({ visitId: visit.id, uri, takenAt: visit.visitedAt });
      }

      setLog(`写真${assets.length}枚を1記録にまとめました`);
      onChanged();
    } catch (error) {
      setLog(`失敗: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  function handleDeleteAll() {
    Alert.alert(
      'すべての記録を削除しますか？',
      'DB の記録と、アプリ内に保存した写真ファイルの両方を削除します。元に戻せません。',
      [
        { text: 'キャンセル', style: 'cancel' },
        {
          text: '削除する',
          style: 'destructive',
          onPress: () => {
            void performDeleteAll();
          },
        },
      ]
    );
  }

  async function performDeleteAll() {
    setBusy(true);
    try {
      await deleteAllVisits();
      // DB が空になったので既知のパスも空になり、photos/ 配下が全て孤立扱いになる。
      // CASCADE ではファイルの実体は消えないため、この掃除が必要
      const removed = removeOrphanedPhotos(await listAllPhotoUris());
      setLog(`記録を全件削除し、写真ファイル${removed}件を消しました`);
      onChanged();
    } catch (error) {
      setLog(`失敗: ${(error as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card flat style={styles.card}>
      <Text variant="caption" color="textFaint">
        開発用（記録追加の実装後に削除する）
      </Text>

      <View style={styles.row}>
        <Button
          label="サンプル記録を追加"
          variant="secondary"
          onPress={handleSeedMany}
          disabled={busy}
        />
        <Button
          label="2枚を1記録に"
          variant="secondary"
          onPress={handleSeedMultiPhoto}
          disabled={busy}
        />
      </View>

      <Button label="全データを削除" variant="danger" onPress={handleDeleteAll} disabled={busy} />

      {log ? (
        <Text variant="caption" color="textMuted">
          {log}
        </Text>
      ) : null}
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.sm,
    marginBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
});
