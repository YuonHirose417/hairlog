/**
 * 写真ファイルの保存先と、相対パス ↔ 絶対 URI の変換を閉じ込める。
 *
 * DB に入れるのは Paths.document からの **相対パス**（例 photos/xxxx.jpg）だけ。
 * iOS は OS 更新でアプリのコンテナ絶対パスが変わるため、絶対パスを保存すると
 * 画像が表示できなくなる。画面側は相対パスしか扱わず、表示の直前に
 * resolvePhotoUri() で絶対 URI に直すこと。
 *
 * SDK 57 の新 API（Paths / File / Directory）のみを使う。
 * expo-file-system/legacy は使わない。
 */

import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';

/** 写真を置くフォルダ名。相対パスの先頭にもなる */
const PHOTOS_DIR = 'photos';

function photosDirectory(): Directory {
  return new Directory(Paths.document, PHOTOS_DIR);
}

/** 写真フォルダが無ければ作る。保存前に必ず通る */
function ensurePhotosDirectory(): Directory {
  const dir = photosDirectory();
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

/**
 * DB に入っている相対パスを、表示に使える絶対 URI に直す。
 * <Image source={{ uri: resolvePhotoUri(photo.uri) }} /> のように使う。
 */
export function resolvePhotoUri(relativeUri: string): string {
  // 既に絶対 URI（file:// / ph:// / content://）ならそのまま返す。
  // 記録追加画面では、まだアプリ内へコピーしていない写真をプレビューするため
  if (/^[a-z][a-z0-9+.-]*:\/\//i.test(relativeUri)) return relativeUri;

  return new File(Paths.document, relativeUri).uri;
}

/** ファイルの実体が残っているか。書き出しや表示前の確認に使う */
export function photoExists(relativeUri: string): boolean {
  return new File(Paths.document, relativeUri).exists;
}

/** 元ファイルの拡張子を引き継ぐ。取れなければ jpg にする */
function extensionOf(sourceUri: string): string {
  const match = /\.([a-zA-Z0-9]{1,5})(?:\?|#|$)/.exec(sourceUri);
  return match ? match[1].toLowerCase() : 'jpg';
}

/**
 * 撮影・選択された写真をアプリ内フォルダへコピーし、DB に保存する相対パスを返す。
 *
 * expo-image-picker が返す URI はキャッシュ領域なので、そのまま DB に入れると
 * いずれ OS に消される。必ずここを通してからパスを保存すること。
 *
 * @param sourceUri ImagePicker の asset.uri など、コピー元の絶対 URI
 * @returns `photos/xxxx.jpg` 形式の相対パス
 */
export async function savePhoto(sourceUri: string): Promise<string> {
  const dir = ensurePhotosDirectory();
  const fileName = `${Crypto.randomUUID()}.${extensionOf(sourceUri)}`;
  const destination = new File(dir, fileName);

  await new File(sourceUri).copy(destination);

  return `${PHOTOS_DIR}/${fileName}`;
}

/**
 * 写真の実体を削除する。DB の行は db.deletePhoto / db.deleteVisit で別途消すこと。
 * 既に無い場合は何もしない（削除の再試行で落ちないように）。
 */
export function deletePhotoFile(relativeUri: string): void {
  const file = new File(Paths.document, relativeUri);
  if (file.exists) {
    file.delete();
  }
}

/** 複数枚をまとめて削除する。記録ごと消すときに使う */
export function deletePhotoFiles(relativeUris: string[]): void {
  for (const uri of relativeUris) {
    deletePhotoFile(uri);
  }
}

/**
 * DB に無いのにフォルダへ残っている写真を消す。
 * 保存の途中で中断した場合などに発生する。
 *
 * @param knownUris db.listAllPhotoUris() の結果
 * @returns 削除した件数
 */
export function removeOrphanedPhotos(knownUris: string[]): number {
  const dir = photosDirectory();
  if (!dir.exists) return 0;

  const known = new Set(knownUris);
  let removed = 0;

  for (const entry of dir.list()) {
    if (entry instanceof Directory) continue;
    if (!known.has(`${PHOTOS_DIR}/${entry.name}`)) {
      entry.delete();
      removed += 1;
    }
  }

  return removed;
}
