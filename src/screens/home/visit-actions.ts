/**
 * ホームで記録を長押ししたときのメニュー。
 *
 * 記録詳細がまだスタブなので、削除はここからの暫定導線。
 * 最新カードとグリッドで同じメニューを出し、操作を覚えやすくする。
 */

import * as Haptics from 'expo-haptics';
import { ActionSheetIOS, Alert, Platform } from 'react-native';

import { deleteVisitWithPhotos } from '@/lib/visits';

export type VisitActionHandlers = {
  onShowcase: () => void;
  /** 削除が完了したあとに一覧を読み直す */
  onDeleted: () => void;
};

/** 長押しメニューを出す。削除は確認を挟む */
export function showVisitActions(visitId: string, handlers: VisitActionHandlers) {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

  const choose = (index: number) => {
    if (index === 0) handlers.onShowcase();
    if (index === 1) confirmDelete(visitId, handlers.onDeleted);
  };

  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['美容師さんに見せる', 'この記録を削除', 'キャンセル'],
        destructiveButtonIndex: 1,
        cancelButtonIndex: 2,
      },
      choose
    );
    return;
  }

  Alert.alert('この記録', undefined, [
    { text: '美容師さんに見せる', onPress: () => choose(0) },
    { text: 'この記録を削除', style: 'destructive', onPress: () => choose(1) },
    { text: 'キャンセル', style: 'cancel' },
  ]);
}

function confirmDelete(visitId: string, onDeleted: () => void) {
  Alert.alert(
    'この記録を削除しますか？',
    '削除すると元に戻せません。写真も一緒に削除されます。',
    [
      { text: 'キャンセル', style: 'cancel' },
      {
        text: '削除する',
        style: 'destructive',
        onPress: () => {
          void runDelete(visitId, onDeleted);
        },
      },
    ]
  );
}

async function runDelete(visitId: string, onDeleted: () => void) {
  try {
    await deleteVisitWithPhotos(visitId);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onDeleted();
  } catch (error) {
    console.error('[hairlog] 記録の削除に失敗しました', error);
    Alert.alert('削除できませんでした', 'もう一度お試しください。');
  }
}
