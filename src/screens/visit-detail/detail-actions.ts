/**
 * 記録詳細の「⋯」メニュー。
 *
 * **取り消せない操作（削除）の入口はここだけ。** ホームの長押しメニューからは外し、
 * 誤って消してしまう経路を減らしている。
 */

import * as Haptics from 'expo-haptics';
import { ActionSheetIOS, Alert, Platform } from 'react-native';

import { deleteVisitWithPhotos } from '@/lib/visits';

export type DetailActionHandlers = {
  /** いま表示している写真1枚をカメラロールへ保存する */
  onSavePhoto: () => void;
  onEdit: () => void;
  /** 削除が終わったあと。呼び出し側で画面を閉じる */
  onDeleted: () => void;
};

/**
 * 並びは **保存 → 編集 → 削除**。
 * 取り消せない削除を一番下に置き、誤って押しにくくする。
 */
export function showDetailActions(visitId: string, handlers: DetailActionHandlers) {
  const choose = (index: number) => {
    if (index === 0) handlers.onSavePhoto();
    if (index === 1) handlers.onEdit();
    if (index === 2) confirmDelete(visitId, handlers.onDeleted);
  };

  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: [
          'この写真をカメラロールに保存',
          'この記録を編集',
          'この記録を削除',
          'キャンセル',
        ],
        destructiveButtonIndex: 2,
        cancelButtonIndex: 3,
      },
      choose
    );
    return;
  }

  Alert.alert('この記録', undefined, [
    { text: 'この写真をカメラロールに保存', onPress: () => choose(0) },
    { text: 'この記録を編集', onPress: () => choose(1) },
    { text: 'この記録を削除', style: 'destructive', onPress: () => choose(2) },
    { text: 'キャンセル', style: 'cancel' },
  ]);
}

function confirmDelete(visitId: string, onDeleted: () => void) {
  Alert.alert('この記録を削除しますか？', '削除すると元に戻せません。写真も一緒に削除されます。', [
    { text: 'キャンセル', style: 'cancel' },
    {
      text: '削除する',
      style: 'destructive',
      onPress: () => {
        void runDelete(visitId, onDeleted);
      },
    },
  ]);
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
