import * as Haptics from 'expo-haptics';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, ScrollView, StyleSheet, View } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Button, Card, LegalLinks, Text } from '@/components/ui';
import { FREE_VISIT_LIMIT, motion, screenPadding, spacing } from '@/constants/theme';
import { useEntitlement, useProOffer } from '@/hooks/use-entitlement';
import { useTheme } from '@/hooks/use-theme';

/** 購入完了を見せてから遷移するまでの時間。切り替わりを慌ただしく見せないため */
const SUCCESS_DELAY = 1200;

const BENEFITS = [
  {
    icon: '∞',
    title: '記録を無制限に保存できる',
    description: `無料では${FREE_VISIT_LIMIT}件まで。上限を気にせず、行くたびに残せます。`,
  },
  {
    icon: '↗',
    title: '写真とデータの書き出しが使える',
    description: '記録の書き出しと、カメラロールへの写真保存。機種変更の備えになります。',
  },
] as const;

export type PaywallProps = {
  /**
   * どこから来たか。購入後の戻り先を決める。
   * add なら記録追加をそのまま開き、settings なら設定へ戻る。
   */
  from?: 'add' | 'settings';
};

export function Paywall({ from = 'settings' }: PaywallProps) {
  const c = useTheme();
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const { available, unavailableLabel, purchase, restore } = useEntitlement();
  const { offer, loading: offerLoading } = useProOffer();

  /** 走っている操作。1本で持つことで二重押しを防ぐ */
  const [busy, setBusy] = useState<'purchase' | 'restore' | null>(null);
  /** 購入完了の表示に切り替わったか */
  const [done, setDone] = useState(false);

  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  /**
   * 購入・復元が成功したときの繋ぎ。
   * 触覚とメッセージを挟んでから、元の操作へ戻す。
   */
  function celebrate() {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setDone(true);

    timer.current = setTimeout(() => {
      if (from === 'add') {
        // 全画面モーダルの購入画面を記録追加に差し替える。
        // 戻ればホームなので、購入画面が履歴に残らない
        router.replace('/add');
        return;
      }
      router.back();
    }, SUCCESS_DELAY);
  }

  async function handlePurchase() {
    if (busy) return;
    setBusy('purchase');

    const result = await purchase();

    if (result.ok && result.isPro) {
      celebrate();
      return;
    }

    setBusy(null);

    // 購入シートを閉じただけ。**エラーにせず静かに戻る**
    if (!result.ok && result.reason === 'cancelled') return;

    if (!result.ok) {
      // 画面は閉じない。やり直せるようにしておく
      Alert.alert('購入できませんでした', result.message);
      return;
    }

    Alert.alert('購入を確認できませんでした', 'しばらくしてから「購入を復元」をお試しください。');
  }

  async function handleRestore() {
    if (busy) return;
    setBusy('restore');

    const result = await restore();

    if (result.ok && result.isPro) {
      celebrate();
      return;
    }

    setBusy(null);

    if (!result.ok && result.reason === 'cancelled') return;

    if (!result.ok) {
      Alert.alert('復元できませんでした', result.message);
      return;
    }

    Alert.alert(
      '購入が見つかりませんでした',
      'ご購入時と同じ Apple ID でサインインしているかご確認ください。'
    );
  }

  if (done) {
    return (
      <View style={[styles.container, styles.center, { backgroundColor: c.background }]}>
        <Animated.View entering={FadeIn.duration(motion.duration.base)} style={styles.center}>
          <Text variant="display" center>
            ありがとうございます
          </Text>
          <Text variant="body" color="textMuted" center style={styles.doneNote}>
            すべての機能が使えるようになりました。
          </Text>
        </Animated.View>
      </View>
    );
  }

  const locked = !available;

  return (
    <View style={[styles.container, { backgroundColor: c.background, paddingTop: insets.top }]}>
      <View style={styles.header}>
        {/* 全画面モーダルの閉じ方は記録追加と同じ形にそろえる */}
        <Button label="閉じる" variant="secondary" onPress={() => router.back()} />
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.content,
          { paddingBottom: insets.bottom + spacing.xxl },
        ]}>
        <Text variant="display">hairlog をもっと使う</Text>
        <Text variant="body" color="textMuted" style={styles.lead}>
          無料では記録を{FREE_VISIT_LIMIT}件まで保存できます。買い切りにすると、次の2つが
          できるようになります。
        </Text>

        <Card style={styles.card} contentStyle={styles.cardContent}>
          {BENEFITS.map((benefit) => (
            <View key={benefit.title} style={styles.benefit}>
              <Text variant="title" style={styles.benefitIcon}>
                {benefit.icon}
              </Text>
              <View style={styles.benefitBody}>
                <Text variant="subhead">{benefit.title}</Text>
                <Text variant="caption" color="textMuted" style={styles.benefitNote}>
                  {benefit.description}
                </Text>
              </View>
            </View>
          ))}
        </Card>

        {/* 価格は必ず RevenueCat から来た表示価格を出す */}
        {offerLoading ? (
          <ActivityIndicator color={c.textMuted} style={styles.price} />
        ) : offer ? (
          <Text variant="title" center style={styles.price}>
            {offer.priceString}
          </Text>
        ) : null}

        <Text variant="caption" color="textMuted" center>
          買い切りで、追加の料金はかかりません。
        </Text>

        <Button
          label={offer ? `${offer.priceString} で購入する` : '購入する'}
          sink
          fullWidth
          disabled={locked || busy !== null}
          loading={busy === 'purchase'}
          onPress={() => void handlePurchase()}
          style={styles.action}
        />

        <Button
          label="購入を復元"
          variant="ghost"
          fullWidth
          disabled={locked || busy !== null}
          loading={busy === 'restore'}
          onPress={() => void handleRestore()}
          style={styles.restore}
        />

        {locked ? (
          <Card flat style={styles.locked}>
            <Text variant="body">いまは購入できません</Text>
            <Text variant="caption" color="textMuted" style={styles.benefitNote}>
              課金は{unavailableLabel ?? '確認中…'}です。実機の development build
              でお試しください。
            </Text>
          </Card>
        ) : null}

        <View style={styles.legal}>
          <LegalLinks />
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneNote: {
    marginTop: spacing.sm,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.sm,
  },
  content: {
    paddingHorizontal: screenPadding,
    paddingTop: spacing.md,
  },
  lead: {
    marginTop: spacing.sm,
  },
  card: {
    marginTop: spacing.lg,
  },
  cardContent: {
    gap: spacing.md,
  },
  benefit: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  benefitIcon: {
    // アイコンの幅をそろえて、見出しの左端を縦に通す
    width: spacing.lg,
    textAlign: 'center',
  },
  benefitBody: {
    flex: 1,
  },
  benefitNote: {
    marginTop: spacing.xs,
  },
  price: {
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  action: {
    marginTop: spacing.md,
  },
  restore: {
    marginTop: spacing.xs,
  },
  locked: {
    marginTop: spacing.md,
  },
  legal: {
    marginTop: spacing.lg,
  },
});
