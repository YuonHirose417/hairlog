import { StyleSheet, View } from 'react-native';

import { Button } from '@/components/ui/button';
import { Text } from '@/components/ui/text';
import { spacing } from '@/constants/theme';

export type EmptyStateProps = {
  title: string;
  /** 1〜2文の説明。何をすればいいかを具体的に書く */
  description?: string;
  /** 行動を促すボタン。記録0件の画面では必ず置く */
  actionLabel?: string;
  onAction?: () => void;
  /** 見出しの上に置くイラストやアイコン */
  illustration?: React.ReactNode;
};

/**
 * 記録が0件のときなど、何も無い画面。
 * ホームの空状態では「最初の1枚を撮ってみましょう」と誘導すること。
 */
export function EmptyState({
  title,
  description,
  actionLabel,
  onAction,
  illustration,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      {illustration ? <View style={styles.illustration}>{illustration}</View> : null}

      <Text variant="title" center>
        {title}
      </Text>

      {description ? (
        <Text variant="body" color="textMuted" center style={styles.description}>
          {description}
        </Text>
      ) : null}

      {actionLabel && onAction ? (
        <Button label={actionLabel} onPress={onAction} style={styles.action} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  illustration: {
    marginBottom: spacing.lg,
  },
  description: {
    marginTop: spacing.sm,
    maxWidth: 280,
  },
  action: {
    marginTop: spacing.xl,
  },
});
