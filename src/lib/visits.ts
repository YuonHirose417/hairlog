/**
 * 記録の削除など、DB とファイルの両方にまたがる操作。
 *
 * db.ts は DB だけ、photos.ts はファイルだけを扱う。両方を触る手続きはここに置く。
 */

import { addPhoto, deletePhoto, deleteVisit, listPhotos, updatePhotoOrder } from '@/lib/db';
import { deletePhotoFile, deletePhotoFiles, savePhoto } from '@/lib/photos';

/**
 * 記録を写真ごと削除する。
 *
 * **photos の行は ON DELETE CASCADE で消えるが、ファイルの実体は残る。**
 * 記録を消すときは deleteVisit() を直接呼ばず、必ずこの関数を通すこと。
 */
export async function deleteVisitWithPhotos(id: string): Promise<void> {
  // 行が消える前にパスを控える
  const photos = await listPhotos(id);
  await deleteVisit(id);
  deletePhotoFiles(photos.map((photo) => photo.uri));
}

/** まだアプリ内へコピーしていない写真か（ImagePicker が返した絶対 URI） */
function isNewPhoto(uri: string): boolean {
  return /^[a-z][a-z0-9+.-]*:\/\//i.test(uri);
}

/**
 * 編集後の並びを記録に反映する。
 *
 * `orderedUris` には **保存済みの相対パスと、新しく選ばれた絶対 URI が混ざる**。
 * 消えたもの・増えたもの・並び順の3つに分けて処理する。
 *
 * **既存の写真は消して入れ直さない。** 並べ替えのたびにファイルをコピーし直すのは
 * 無駄が多く、途中で失敗すると写真を失う。順序は sort_order の更新だけで済ませる。
 *
 * @param orderedUris 画面上の並びそのまま。先頭が代表写真になる
 */
export async function syncVisitPhotos(visitId: string, orderedUris: string[]): Promise<void> {
  const existing = await listPhotos(visitId);
  const kept = new Set(orderedUris);

  // 1. 消えたもの — DB の行とファイルの両方を消す
  for (const photo of existing) {
    if (kept.has(photo.uri)) continue;
    await deletePhoto(photo.id);
    deletePhotoFile(photo.uri);
  }

  // 2. 増えたもの — アプリ内へコピーしてから行を足す。
  //    元の絶対 URI と、保存後の相対パスの対応を控えておく
  const savedUri = new Map<string, string>();
  for (const uri of orderedUris) {
    if (!isNewPhoto(uri)) continue;
    const saved = await savePhoto(uri);
    savedUri.set(uri, saved);
    await addPhoto({ visitId, uri: saved });
  }

  // 3. 並び順 — 画面上の並びどおりに sort_order を振り直す
  const rows = await listPhotos(visitId);
  const idByUri = new Map(rows.map((photo) => [photo.uri, photo.id]));

  for (const [index, uri] of orderedUris.entries()) {
    const id = idByUri.get(savedUri.get(uri) ?? uri);
    if (id) await updatePhotoOrder(id, index);
  }
}
