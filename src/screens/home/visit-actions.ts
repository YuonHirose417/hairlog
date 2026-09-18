/**
 * ホームで記録を長押ししたときのメニュー。
 *
 * **削除は置かない。** 取り消せない操作の入口は記録詳細の「⋯」だけに絞り、
 * 誤って消してしまう経路を減らしている。
 */

import * as Haptics from 'expo-haptics';
import { ActionSheetIOS, Alert, Platform } from 'react-native';

export type VisitActionHandlers = {
  onShowcase: () => void;
};

/** 長押しメニューを出す */
export function showVisitActions(handlers: VisitActionHandlers) {
  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});

  if (Platform.OS === 'ios') {
    ActionSheetIOS.showActionSheetWithOptions(
      {
        options: ['美容師さんに見せる', 'キャンセル'],
        cancelButtonIndex: 1,
      },
      (index) => {
        if (index === 0) handlers.onShowcase();
      }
    );
    return;
  }

  Alert.alert('この記録', undefined, [
    { text: '美容師さんに見せる', onPress: () => handlers.onShowcase() },
    { text: 'キャンセル', style: 'cancel' },
  ]);
}
