/**
 * 記録の削除など、DB とファイルの両方にまたがる操作。
 *
 * db.ts は DB だけ、photos.ts はファイルだけを扱う。両方を触る手続きはここに置く。
 */

import { deleteVisit, listPhotos } from '@/lib/db';
import { deletePhotoFiles } from '@/lib/photos';

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
