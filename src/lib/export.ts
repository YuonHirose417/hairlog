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

import { exportAll, listPhotosForBackup, markPhotoSaved } from '@/lib/db';
import { resolvePhotoUri } from '@/lib/photos';
import type { Photo } from '@/types/models';

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

export type SaveOneResult = { ok: true } | { ok: false; reason: 'denied' | 'failed' };

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
    // 前回までの書き出しを先に片付ける。キャッシュに常に1つだけ置く状態を保つ
    cleanUpExportFiles();

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

/** 書き込み専用の許可。読み取り権限までは求めない */
async function ensureLibraryPermission(): Promise<boolean> {
  const permission = await MediaLibrary.requestPermissionsAsync(true);
  return permission.granted;
}

/** 1枚をカメラロールへ入れ、保存済みとして記録する */
async function saveOne(photo: Photo): Promise<boolean> {
  try {
    const asset = await MediaLibrary.createAssetAsync(resolvePhotoUri(photo.uri));
    await putInAlbum(asset);
    await markPhotoSaved(photo.id);
    return true;
  } catch (error) {
    console.log('[hairlog] 写真を保存できませんでした', photo.uri, error);
    return false;
  }
}

/** 記録詳細から、いま見ている1枚だけを保存する */
export async function savePhotoToLibrary(photo: Photo): Promise<SaveOneResult> {
  try {
    if (!(await ensureLibraryPermission())) return { ok: false, reason: 'denied' };
    return (await saveOne(photo)) ? { ok: true } : { ok: false, reason: 'failed' };
  } catch (error) {
    console.error('[hairlog] 写真の保存に失敗しました', error);
    return { ok: false, reason: 'failed' };
  }
}

/**
 * まとめてカメラロールへ保存する（バックアップ用）。
 *
 * 1枚ずつ await するので画面が固まらない。進捗は**1枚ごと**に返す
 * （毎フレームではないので、状態更新の回数は写真の枚数と同じ）。
 *
 * @param onlyUnsaved true なら未保存のぶんだけ。false なら全件を保存し直す
 *   （カメラロール側で消してしまった場合の逃げ道）
 */
export async function savePhotosToLibrary(
  onlyUnsaved: boolean,
  onProgress: (done: number, total: number) => void
): Promise<SavePhotosResult> {
  try {
    const photos = await listPhotosForBackup(onlyUnsaved);
    if (photos.length === 0) return { ok: false, reason: 'empty' };

    if (!(await ensureLibraryPermission())) return { ok: false, reason: 'denied' };

    let saved = 0;
    let failed = 0;

    for (const photo of photos) {
      // 1枚失敗しても残りは保存する
      if (await saveOne(photo)) saved += 1;
      else failed += 1;
      onProgress(saved + failed, photos.length);
    }

    return { ok: true, saved, failed, total: photos.length };
  } catch (error) {
    console.error('[hairlog] 写真の保存に失敗しました', error);
    return { ok: false, reason: 'failed' };
  }
}

// -----------------------------------------------------------------------------
// 掃除
// -----------------------------------------------------------------------------

/**
 * 共有用に作った古い JSON を片付ける。
 *
 * ファイル名に日付が入るので、日をまたぐと前回のぶんが残る。キャッシュ領域なので
 * OS もいずれ消すが、溜めないよう**アプリ起動時**と**書き出しの直前**に呼ぶ。
 *
 * **Sharing.shareAsync() の直後には呼ばない。** シートが閉じた時点で解決するが、
 * 受け取り側のアプリがまだ読んでいることがあり、そこで消すと書き出しが壊れうる。
 */
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
