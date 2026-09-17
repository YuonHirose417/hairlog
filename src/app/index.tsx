/**
 * 【一時的な動作確認画面】
 *
 * 画面の実装フェーズに入る時点でこのファイルは丸ごとホーム画面に置き換える。
 * DB 層・テーマ・共通部品が実機で意図どおり動くかを見るためだけのもの。
 */

import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import {
  Button,
  Card,
  Divider,
  EmptyState,
  MemoField,
  PhotoFrame,
  Section,
  SuggestionRow,
  Text,
  TextField,
} from '@/components/ui';
import { FREE_VISIT_LIMIT, screenPadding, spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import {
  addPhoto,
  countVisits,
  createVisit,
  deleteVisit,
  distinctSalonNames,
  listPhotos,
  listVisits,
} from '@/lib/db';
import {
  describePurchasesStatus,
  initPurchases,
  isPurchasesConfigured,
  type PurchasesStatus,
} from '@/lib/purchases';
import type { VisitSummary } from '@/types/models';

export default function DebugScreen() {
  const c = useTheme();
  const insets = useSafeAreaInsets();

  const [visits, setVisits] = useState<VisitSummary[]>([]);
  const [count, setCount] = useState(0);
  const [salons, setSalons] = useState<string[]>([]);
  const [log, setLog] = useState<string[]>([]);
  const [memo, setMemo] = useState('');
  const [salon, setSalon] = useState('');
  const [purchases, setPurchases] = useState<PurchasesStatus | null>(null);

  const addLog = useCallback((line: string) => {
    setLog((previous) => [line, ...previous].slice(0, 8));
  }, []);

  const refresh = useCallback(async () => {
    const [rows, total, salonNames] = await Promise.all([
      listVisits({ limit: 20 }),
      countVisits(),
      distinctSalonNames(),
    ]);
    setVisits(rows);
    setCount(total);
    setSalons(salonNames);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        await refresh();
      } catch (error) {
        addLog(`読み込み失敗: ${(error as Error).message}`);
      }
    }
    void load();
  }, [refresh, addLog]);

  useEffect(() => {
    // initPurchases() は _layout で既に走っている。ここでは結果を受け取るだけ
    async function loadPurchases() {
      setPurchases(await initPurchases());
    }
    void loadPurchases();
  }, []);

  async function handleCreate() {
    try {
      const visit = await createVisit({
        salonName: salon || 'テスト美容室',
        stylistName: '田中',
        memo: memo || '前髪は眉上、横は刈り上げ6mm',
      });
      // 写真ファイルは作らず、CASCADE の確認のために行だけ足す
      await addPhoto({ visitId: visit.id, uri: `photos/dummy-${visit.id}.jpg` });
      addLog(`作成: ${visit.id.slice(0, 8)}`);
      await refresh();
    } catch (error) {
      addLog(`作成失敗: ${(error as Error).message}`);
    }
  }

  async function handleDeleteLatest() {
    const target = visits[0];
    if (!target) {
      addLog('削除対象がありません');
      return;
    }
    try {
      const before = await listPhotos(target.id);
      await deleteVisit(target.id);
      const after = await listPhotos(target.id);
      addLog(`削除: photos ${before.length} → ${after.length}（CASCADE）`);
      await refresh();
    } catch (error) {
      addLog(`削除失敗: ${(error as Error).message}`);
    }
  }

  return (
    <ScrollView
      style={{ backgroundColor: c.background }}
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.md, paddingBottom: insets.bottom + spacing.xxl },
      ]}>
      <View style={styles.header}>
        <Text variant="display">hairlog</Text>
        <Text variant="caption" color="textMuted">
          動作確認用の画面（画面実装フェーズで置き換える）
        </Text>
      </View>

      <Section title="課金（RevenueCat）">
        <Card flat>
          <View style={styles.statusRow}>
            <Text variant="body">課金</Text>
            <Text variant="body" color={purchases?.available ? 'accent' : 'textMuted'}>
              {describePurchasesStatus(purchases)}
            </Text>
          </View>
          <Text variant="caption" color="textFaint">
            {isPurchasesConfigured()
              ? 'EXPO_PUBLIC_REVENUECAT_IOS_KEY: 設定あり'
              : 'EXPO_PUBLIC_REVENUECAT_IOS_KEY: 未設定 — この状態でアプリが落ちなければ正常'}
          </Text>
          {purchases && !purchases.available && purchases.detail ? (
            <Text variant="caption" color="textFaint">
              {purchases.detail}
            </Text>
          ) : null}
        </Card>
      </Section>

      <Section title={`DB — ${count} 件 / 無料枠 ${FREE_VISIT_LIMIT} 件`}>
        <View style={styles.row}>
          <Button label="1件作成" onPress={handleCreate} />
          <Button label="最新を削除" variant="secondary" onPress={handleDeleteLatest} />
        </View>

        {log.length > 0 ? (
          <Card flat style={styles.log}>
            {log.map((line, index) => (
              <Text key={`${line}-${index}`} variant="caption" color="textMuted">
                {line}
              </Text>
            ))}
          </Card>
        ) : null}
      </Section>

      <Section title="タイポグラフィ（最小 12px）">
        <Card>
          <Text variant="display">display 28</Text>
          <Text variant="title">title 20</Text>
          <Text variant="subhead">subhead 16</Text>
          <Text variant="body">body 14 — 前髪は眉上、横は刈り上げ6mm、すき多め</Text>
          <Text variant="caption" color="textMuted">
            caption 12 — 2026.03.14 / SALON / 田中さん
          </Text>
        </Card>
      </Section>

      <Section title="ボタン">
        <View style={styles.row}>
          <Button label="保存" />
          <Button label="あとで" variant="secondary" />
        </View>
        <View style={styles.row}>
          <Button label="閉じる" variant="ghost" />
          <Button label="削除" variant="danger" />
          <Button label="読込中" loading />
        </View>
      </Section>

      <Section title="写真の枠（アクセント色は使わない）">
        <View style={styles.row}>
          <PhotoFrame uri={null} shape="card" style={styles.flex} />
          <PhotoFrame uri={null} shape="thumb" style={styles.flex} />
        </View>
      </Section>

      <Section title="入力">
        <Card>
          <TextField label="美容院" value={salon} onChangeText={setSalon} placeholder="未入力" />
          <TextField label="担当者" placeholder="未入力" />
          <Divider spaced />
          <MemoField value={memo} onChangeText={setMemo} minHeight={100} />
        </Card>
        <View style={styles.suggestions}>
          <SuggestionRow items={salons} selected={salon} onSelect={setSalon} />
        </View>
      </Section>

      <Section title="空状態">
        <Card flat style={styles.empty}>
          <EmptyState
            title="まだ記録がありません"
            description="美容院でカットしたあとに、最初の1枚を撮ってみましょう。"
            actionLabel="写真を撮る"
            onAction={() => addLog('空状態のボタンを押しました')}
          />
        </Card>
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingHorizontal: 0,
  },
  header: {
    paddingHorizontal: screenPadding,
    marginBottom: spacing.xl,
  },
  row: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.sm,
    alignItems: 'center',
  },
  flex: { flex: 1 },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: spacing.xs,
  },
  log: {
    marginTop: spacing.sm,
    gap: spacing.xs,
  },
  suggestions: {
    marginTop: spacing.sm,
  },
  empty: {
    height: 320,
  },
});
