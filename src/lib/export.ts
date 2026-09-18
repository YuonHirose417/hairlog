/**
 * データの書き出し。
 *
 * **このアプリのデータは端末内にしか無い。** 機種変更やアプリ削除で消えるので、
 * ここが唯一の対策になる。
 *
 * `expo-sharing` は1ファイルしか共有できないため、記録（テキスト）と写真を
 * 別々に書き出す。iOS ではカメラロールが iCloud 写真でバックアップされるので、
 * この2つで対策としては完結する。
 *
 * **アプリが勝手にどこかへ送ることはしない。** 共有先はユーザーが毎回選ぶ。
 */

import { Directory, File, Paths } from 'expo-file-system';
// SDK 57 のルートは新しいクラス API になっており、createAssetAsync などは legacy 側にある
import * as MediaLibrary from 'expo-media-library/legacy';
import * as Sharing from 'expo-sharing';

import { exportAll } from '@/lib/db';
import { resolvePhotoUri } from '@/lib/photos';

/** カメラロールでまとめる先 */
const ALBUM_NAME = 'hairlog';

/** 書き出した JSON の形式。読み込みを作るときに見る */
const FORMAT_VERSION = 1;

export type ShareResult =
  | { ok: true; visitCount: number; photoCount: number }
  | { ok: false; reason: 'empty' | 'unavailable' | 'failed' };

export type SavePhotosResult =
  | { ok: true; saved: number; failed: number; total: number }
  | { ok: false; reason: 'empty' | 'denied' | 'failed' };

// -----------------------------------------------------------------------------
// 記録の書き出し
// -----------------------------------------------------------------------------

function fileNameOf(relativeUri: string): string {
  const parts = relativeUri.split('/');
  return parts[parts.length - 1] ?? relativeUri;
}

function exportFileName(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `hairlog-${year}-${month}-${day}.json`;
}

/**
 * 全記録を JSON にして共有する。
 *
 * 写真そのものは入れない（1ファイルに収まらないため）。代わりに **fileName と
 * takenAt** を入れておき、カメラロールに保存した写真と後から突き合わせられるようにする。
 * `createAssetAsync()` は元のファイル名を引き継ぐので、写真アプリ側の filename と一致する。
 */
export async function shareRecords(): Promise<ShareResult> {
  try {
    const payload = await exportAll();
    if (payload.visits.length === 0) return { ok: false, reason: 'empty' };

    if (!(await Sharing.isAvailableAsync())) return { ok: false, reason: 'unavailable' };

    const photoCount = payload.visits.reduce((sum, visit) => sum + visit.photos.length, 0);

    const document = {
      app: 'hairlog',
      formatVersion: FORMAT_VERSION,
      exportedAt: payload.exportedAt,
      visitCount: payload.visits.length,
      photoCount,
      visits: payload.visits.map((visit) => ({
        // 読み込み機能は今はないが、あとで突き合わせられるよう id も残す
        id: visit.id,
        visitedAt: visit.visitedAt,
        salonName: visit.salonName,
        stylistName: visit.stylistName,
        memo: visit.memo,
        isFavorite: visit.isFavorite,
        photos: visit.photos.map((photo) => ({
          order: photo.sortOrder,
          fileName: fileNameOf(photo.uri),
          takenAt: photo.takenAt,
        })),
      })),
    };

    // キャッシュ領域に置く。共有が終われば OS が片付けるので、アプリ内にゴミが残らない
    const file = new File(Paths.cache, exportFileName());
    if (file.exists) file.delete();
    file.create();
    file.write(JSON.stringify(document, null, 2));

    await Sharing.shareAsync(file.uri, {
      mimeType: 'application/json',
      dialogTitle: 'hairlog の記録を書き出す',
      UTI: 'public.json',
    });

    return { ok: true, visitCount: payload.visits.length, photoCount };
  } catch (error) {
    console.error('[hairlog] 記録の書き出しに失敗しました', error);
    return { ok: false, reason: 'failed' };
  }
}

// -----------------------------------------------------------------------------
// 写真の保存
// -----------------------------------------------------------------------------

/** アルバムにまとめる。失敗しても写真自体はカメラロールに入っているので続行する */
async function putInAlbum(asset: MediaLibrary.Asset) {
  try {
    const album = await MediaLibrary.getAlbumAsync(ALBUM_NAME);
    if (album) {
      await MediaLibrary.addAssetsToAlbumAsync([asset], album, false);
      return;
    }
    await MediaLibrary.createAlbumAsync(ALBUM_NAME, asset, false);
  } catch (error) {
    console.log('[hairlog] アルバムにまとめられませんでした（写真は保存済み）', error);
  }
}

/**
 * すべての写真をカメラロールへ保存する。
 *
 * 1枚ずつ await するので画面が固まらない。進捗は**1枚ごと**に返す
 * （毎フレームではないので、状態更新の回数は写真の枚数と同じ）。
 */
export async function savePhotosToLibrary(
  onProgress: (done: number, total: number) => void
): Promise<SavePhotosResult> {
  try {
    const payload = await exportAll();
    const uris = payload.visits.flatMap((visit) => visit.photos.map((photo) => photo.uri));
    if (uris.length === 0) return { ok: false, reason: 'empty' };

    // 書き込み専用。読み取り権限までは求めない
    const permission = await MediaLibrary.requestPermissionsAsync(true);
    if (!permission.granted) return { ok: false, reason: 'denied' };

    let saved = 0;
    let failed = 0;

    for (const uri of uris) {
      try {
        const asset = await MediaLibrary.createAssetAsync(resolvePhotoUri(uri));
        await putInAlbum(asset);
        saved += 1;
      } catch (error) {
        // 1枚失敗しても残りは保存する
        console.log('[hairlog] 写真を保存できませんでした', uri, error);
        failed += 1;
      }
      onProgress(saved + failed, uris.length);
    }

    return { ok: true, saved, failed, total: uris.length };
  } catch (error) {
    console.error('[hairlog] 写真の保存に失敗しました', error);
    return { ok: false, reason: 'failed' };
  }
}

// -----------------------------------------------------------------------------
// 掃除
// -----------------------------------------------------------------------------

/** 共有用に作った古い JSON を片付ける。キャッシュなので OS も消すが、念のため */
export function cleanUpExportFiles(): void {
  try {
    for (const entry of new Directory(Paths.cache).list()) {
      if (entry instanceof File && entry.name.startsWith('hairlog-') && entry.name.endsWith('.json')) {
        entry.delete();
      }
    }
  } catch {
    // 消せなくても支障はない
  }
}
