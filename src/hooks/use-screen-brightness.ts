import * as Brightness from 'expo-brightness';
import { useEffect } from 'react';

/**
 * 画面の明るさを一時的に上げ、画面を離れたら元に戻す。
 *
 * 見せるモードで美容師さんに写真を見せるため。**戻し忘れると電池を食う**ので、
 * アンマウント時の復帰が最も大事な処理。
 *
 * 明るさを変えられない環境でも画面は使えるべきなので、失敗しても例外を投げない。
 */
export function useScreenBrightness(level: number) {
  useEffect(() => {
    let original: number | null = null;
    let cancelled = false;

    async function raise() {
      try {
        if (!(await Brightness.isAvailableAsync())) return;
        original = await Brightness.getBrightnessAsync();
        // 画面を離れたあとに上げてしまわないよう、待っている間の離脱を見る
        if (cancelled) return;
        await Brightness.setBrightnessAsync(level);
      } catch (error) {
        console.log('[hairlog] 明るさを変更できませんでした', error);
      }
    }

    void raise();

    return () => {
      cancelled = true;
      if (original === null) return;
      // iOS はアプリを離れると OS が戻すが、画面を閉じた時点で明示的に戻す
      Brightness.setBrightnessAsync(original).catch(() => {});
    };
  }, [level]);
}
