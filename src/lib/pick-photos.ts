/**
 * 写真の取り込み。撮影とカメラロールの選択肢をまとめて出す。
 *
 * ここが返すのは **ImagePicker が返した一時的な URI**（キャッシュ領域）。
 * アプリ内への保存は、記録を保存するタイミングで lib/photos.ts の savePhoto()
 * が行う。選んだあとキャンセルされても孤立ファイルが残らないようにするため。
 *
 * **例外を投げない。** 権限の拒否もキャンセルも null を返すだけにして、
 * 呼び出し側が落ちないようにする。
 */

import * as ImagePicker from 'expo-image-picker';
import { ActionSheetIOS, Alert, Platform } from 'react-native';

/** 一度に選べる枚数。正面・横・後ろ＋αを想定 */
const SELECTION_LIMIT = 10;

export type PickPhotosResult = {
  uris: string[];
  /** 権限が拒否された。呼び出し側で案内を出す */
  denied?: 'camera' | 'library';
};

type Source = 'camera' | 'library' | 'cancel';

/** 撮影を先に提示する。「あとで」を選べば写真なしで記録を書ける */
function askSource(): Promise<Source> {
  return new Promise((resolve) => {
    if (Platform.OS === 'ios') {
      ActionSheetIOS.showActionSheetWithOptions(
        {
          options: ['写真を撮る', 'カメラロールから選ぶ', 'あとで'],
          cancelButtonIndex: 2,
          title: '今日の髪型を記録しましょう',
        },
        (index) => {
          resolve(index === 0 ? 'camera' : index === 1 ? 'library' : 'cancel');
        }
      );
      return;
    }

    Alert.alert('今日の髪型を記録しましょう', undefined, [
      { text: '写真を撮る', onPress: () => resolve('camera') },
      { text: 'カメラロールから選ぶ', onPress: () => resolve('library') },
      { text: 'あとで', style: 'cancel', onPress: () => resolve('cancel') },
    ]);
  });
}

/** 1枚撮るごとに続けるか聞く。launchCameraAsync が複数撮影に対応しないため */
function askAnotherShot(): Promise<boolean> {
  return new Promise((resolve) => {
    Alert.alert('続けて撮りますか？', '正面・横・後ろを続けて撮れます。', [
      { text: 'これで終わり', style: 'cancel', onPress: () => resolve(false) },
      { text: 'もう1枚撮る', onPress: () => resolve(true) },
    ]);
  });
}

async function captureWithCamera(): Promise<PickPhotosResult> {
  const permission = await ImagePicker.requestCameraPermissionsAsync();
  if (!permission.granted) return { uris: [], denied: 'camera' };

  const uris: string[] = [];

  // 撮る → 続けるか聞く、を繰り返す。キャンセルしたらそこまでの分を返す
  for (;;) {
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'],
      quality: 0.9,
    });

    if (result.canceled || result.assets.length === 0) break;

    uris.push(result.assets[0].uri);

    if (uris.length >= SELECTION_LIMIT) break;
    if (!(await askAnotherShot())) break;
  }

  return { uris };
}

async function pickFromLibrary(): Promise<PickPhotosResult> {
  const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
  if (!permission.granted) return { uris: [], denied: 'library' };

  const result = await ImagePicker.launchImageLibraryAsync({
    mediaTypes: ['images'],
    // 正面・横・後ろを一度に選べるようにする
    allowsMultipleSelection: true,
    selectionLimit: SELECTION_LIMIT,
    quality: 0.9,
  });

  if (result.canceled) return { uris: [] };
  return { uris: result.assets.map((asset) => asset.uri) };
}

/**
 * 選択肢を出して写真を取り込む。
 * キャンセル・「あとで」のときは uris が空の結果を返す（null ではない）。
 */
export async function pickPhotos(): Promise<PickPhotosResult> {
  try {
    const source = await askSource();
    if (source === 'cancel') return { uris: [] };
    return source === 'camera' ? await captureWithCamera() : await pickFromLibrary();
  } catch (error) {
    console.error('[hairlog] 写真の取り込みに失敗しました', error);
    return { uris: [] };
  }
}

/** 権限が拒否されたときの案内。設定アプリから変えてもらう */
export function alertPermissionDenied(kind: 'camera' | 'library') {
  const target = kind === 'camera' ? 'カメラ' : '写真';
  Alert.alert(
    `${target}へのアクセスが許可されていません`,
    `iPhone の「設定」→「hairlog」から${target}を許可すると、写真を追加できます。メモだけで記録することもできます。`
  );
}
