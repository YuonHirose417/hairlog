/**
 * DB アクセスの集約点。
 *
 * 画面やコンポーネントから直接 SQL を書かず、必ずこのファイルの関数を経由すること。
 * SQLite は snake_case、アプリ側は camelCase。変換はこのファイル内の map* が担う。
 */

import * as Crypto from 'expo-crypto';
import * as SQLite from 'expo-sqlite';

import type {
  ExportPayload,
  Photo,
  PhotoReminder,
  Visit,
  VisitInput,
  VisitSummary,
  VisitWithPhotos,
} from '@/types/models';

const DATABASE_NAME = 'hairlog.db';

/** マイグレーションを1つ足すたびにこの値を上げ、runMigrations に case を追加する */
const LATEST_SCHEMA_VERSION = 1;

// -----------------------------------------------------------------------------
// 接続とマイグレーション
// -----------------------------------------------------------------------------

let databasePromise: Promise<SQLite.SQLiteDatabase> | null = null;

/**
 * DB を開いてマイグレーションを流す。複数回呼んでも初回の1度しか実行されない。
 * アプリ起動時（ルートの _layout）で await してから画面を描画すること。
 */
export function initDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (!databasePromise) {
    databasePromise = openAndMigrate().catch((error) => {
      // 失敗したら次回の呼び出しでやり直せるようにキャッシュを捨てる
      databasePromise = null;
      throw error;
    });
  }
  return databasePromise;
}

async function openAndMigrate(): Promise<SQLite.SQLiteDatabase> {
  const db = await SQLite.openDatabaseAsync(DATABASE_NAME);

  // WAL は書き込み中の読み取りを速くする。外部キーは既定で OFF なので明示的に有効化する
  await db.execAsync('PRAGMA journal_mode = WAL;');
  await db.execAsync('PRAGMA foreign_keys = ON;');

  await runMigrations(db);
  return db;
}

async function runMigrations(db: SQLite.SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ user_version: number }>('PRAGMA user_version;');
  let version = row?.user_version ?? 0;

  if (version >= LATEST_SCHEMA_VERSION) return;

  if (version === 0) {
    await db.execAsync(`
      CREATE TABLE visits (
        id           TEXT PRIMARY KEY NOT NULL,
        visited_at   TEXT NOT NULL,
        salon_name   TEXT,
        stylist_name TEXT,
        memo         TEXT,
        is_favorite  INTEGER NOT NULL DEFAULT 0,
        created_at   TEXT NOT NULL,
        updated_at   TEXT NOT NULL
      );

      CREATE TABLE photos (
        id         TEXT PRIMARY KEY NOT NULL,
        visit_id   TEXT NOT NULL REFERENCES visits(id) ON DELETE CASCADE,
        uri        TEXT NOT NULL,
        taken_at   TEXT NOT NULL,
        sort_order INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE photo_reminders (
        id                      TEXT PRIMARY KEY NOT NULL,
        appointment_at          TEXT NOT NULL,
        notification_id         TEXT,
        notification_id_evening TEXT,
        cancelled_at            TEXT,
        created_at              TEXT NOT NULL
      );

      CREATE INDEX idx_visits_visited_at ON visits(visited_at DESC);
      CREATE INDEX idx_photos_visit_id   ON photos(visit_id);
      CREATE INDEX idx_reminders_appt    ON photo_reminders(appointment_at);
    `);
    version = 1;
  }

  // PRAGMA はプレースホルダを受け付けないため、定数を直接埋め込む
  await db.execAsync(`PRAGMA user_version = ${version};`);
}

/** テストやリセット用。通常の画面からは呼ばない */
export async function closeDatabase(): Promise<void> {
  if (!databasePromise) return;
  const db = await databasePromise;
  databasePromise = null;
  await db.closeAsync();
}

// -----------------------------------------------------------------------------
// 行 → ドメイン型の変換
// -----------------------------------------------------------------------------

type VisitRow = {
  id: string;
  visited_at: string;
  salon_name: string | null;
  stylist_name: string | null;
  memo: string | null;
  is_favorite: number;
  created_at: string;
  updated_at: string;
};

type PhotoRow = {
  id: string;
  visit_id: string;
  uri: string;
  taken_at: string;
  sort_order: number;
};

type ReminderRow = {
  id: string;
  appointment_at: string;
  notification_id: string | null;
  notification_id_evening: string | null;
  cancelled_at: string | null;
  created_at: string;
};

function mapVisit(row: VisitRow): Visit {
  return {
    id: row.id,
    visitedAt: row.visited_at,
    salonName: row.salon_name,
    stylistName: row.stylist_name,
    memo: row.memo,
    isFavorite: row.is_favorite === 1,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapPhoto(row: PhotoRow): Photo {
  return {
    id: row.id,
    visitId: row.visit_id,
    uri: row.uri,
    takenAt: row.taken_at,
    sortOrder: row.sort_order,
  };
}

function mapReminder(row: ReminderRow): PhotoReminder {
  return {
    id: row.id,
    appointmentAt: row.appointment_at,
    notificationId: row.notification_id,
    notificationIdEvening: row.notification_id_evening,
    cancelledAt: row.cancelled_at,
    createdAt: row.created_at,
  };
}

/** 空文字だけの入力を NULL に寄せる。すべて任意項目なので未入力は NULL で統一する */
function normalize(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function newId(): string {
  return Crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

// -----------------------------------------------------------------------------
// visits
// -----------------------------------------------------------------------------

/**
 * 来店記録の一覧。新しい順。
 * グリッド表示のため、先頭の写真1枚と枚数だけを併せて返す。
 */
export async function listVisits(
  options: { limit?: number; offset?: number } = {}
): Promise<VisitSummary[]> {
  const { limit = 100, offset = 0 } = options;
  const db = await initDatabase();

  const rows = await db.getAllAsync<VisitRow & { cover_uri: string | null; photo_count: number }>(
    `SELECT v.*,
            (SELECT p.uri FROM photos p
              WHERE p.visit_id = v.id
              ORDER BY p.sort_order ASC, p.taken_at ASC
              LIMIT 1) AS cover_uri,
            (SELECT COUNT(*) FROM photos p WHERE p.visit_id = v.id) AS photo_count
       FROM visits v
      ORDER BY v.visited_at DESC, v.created_at DESC
      LIMIT ? OFFSET ?;`,
    [limit, offset]
  );

  return rows.map((row) => ({
    ...mapVisit(row),
    coverUri: row.cover_uri,
    photoCount: row.photo_count,
  }));
}

/** 1件を写真つきで取得。存在しなければ null */
export async function getVisit(id: string): Promise<VisitWithPhotos | null> {
  const db = await initDatabase();
  const row = await db.getFirstAsync<VisitRow>('SELECT * FROM visits WHERE id = ?;', [id]);
  if (!row) return null;

  const photos = await listPhotos(id);
  return { ...mapVisit(row), photos };
}

/** 直近の1件。美容院名・担当者名の初期値に使う */
export async function lastVisit(): Promise<Visit | null> {
  const db = await initDatabase();
  const row = await db.getFirstAsync<VisitRow>(
    'SELECT * FROM visits ORDER BY visited_at DESC, created_at DESC LIMIT 1;'
  );
  return row ? mapVisit(row) : null;
}

export async function createVisit(input: VisitInput = {}): Promise<Visit> {
  const db = await initDatabase();
  const timestamp = now();

  const visit: Visit = {
    id: newId(),
    visitedAt: input.visitedAt ?? timestamp,
    salonName: normalize(input.salonName),
    stylistName: normalize(input.stylistName),
    memo: normalize(input.memo),
    isFavorite: input.isFavorite ?? false,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await db.runAsync(
    `INSERT INTO visits
       (id, visited_at, salon_name, stylist_name, memo, is_favorite, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      visit.id,
      visit.visitedAt,
      visit.salonName,
      visit.stylistName,
      visit.memo,
      visit.isFavorite ? 1 : 0,
      visit.createdAt,
      visit.updatedAt,
    ]
  );

  return visit;
}

/** 渡されたキーだけを更新する。未指定のキーは現在の値を保つ */
export async function updateVisit(id: string, patch: VisitInput): Promise<Visit | null> {
  const db = await initDatabase();

  const sets: string[] = [];
  const params: (string | number | null)[] = [];

  if (patch.visitedAt !== undefined) {
    sets.push('visited_at = ?');
    params.push(patch.visitedAt);
  }
  if (patch.salonName !== undefined) {
    sets.push('salon_name = ?');
    params.push(normalize(patch.salonName));
  }
  if (patch.stylistName !== undefined) {
    sets.push('stylist_name = ?');
    params.push(normalize(patch.stylistName));
  }
  if (patch.memo !== undefined) {
    sets.push('memo = ?');
    params.push(normalize(patch.memo));
  }
  if (patch.isFavorite !== undefined) {
    sets.push('is_favorite = ?');
    params.push(patch.isFavorite ? 1 : 0);
  }

  if (sets.length > 0) {
    sets.push('updated_at = ?');
    params.push(now(), id);
    await db.runAsync(`UPDATE visits SET ${sets.join(', ')} WHERE id = ?;`, params);
  }

  const row = await db.getFirstAsync<VisitRow>('SELECT * FROM visits WHERE id = ?;', [id]);
  return row ? mapVisit(row) : null;
}

/**
 * 記録を削除する。
 *
 * photos 行は ON DELETE CASCADE で消えるが **ファイルの実体は消えない**。
 * 呼び出し側は削除前に listPhotos() を取り、lib/photos.ts でファイルも消すこと。
 */
export async function deleteVisit(id: string): Promise<void> {
  const db = await initDatabase();
  await db.runAsync('DELETE FROM visits WHERE id = ?;', [id]);
}

/**
 * すべての記録を削除する。開発中のリセット用。
 *
 * photos 行は ON DELETE CASCADE で消えるが **ファイルの実体は残る**。
 * 呼び出し側で lib/photos.ts の removeOrphanedPhotos() を続けて呼ぶこと。
 */
export async function deleteAllVisits(): Promise<void> {
  const db = await initDatabase();
  await db.runAsync('DELETE FROM visits;');
}

/** お気に入りを反転し、反転後の値を返す */
export async function toggleFavorite(id: string): Promise<boolean> {
  const db = await initDatabase();
  await db.runAsync(
    'UPDATE visits SET is_favorite = CASE is_favorite WHEN 1 THEN 0 ELSE 1 END, updated_at = ? WHERE id = ?;',
    [now(), id]
  );
  const row = await db.getFirstAsync<{ is_favorite: number }>(
    'SELECT is_favorite FROM visits WHERE id = ?;',
    [id]
  );
  return row?.is_favorite === 1;
}

/** 無料枠（5件）の判定に使う */
export async function countVisits(): Promise<number> {
  const db = await initDatabase();
  const row = await db.getFirstAsync<{ count: number }>('SELECT COUNT(*) AS count FROM visits;');
  return row?.count ?? 0;
}

/** メモ・美容院名・担当者名の部分一致検索。新しい順 */
export async function searchVisitsByMemo(query: string): Promise<VisitSummary[]> {
  const trimmed = query.trim();
  if (trimmed.length === 0) return listVisits();

  const db = await initDatabase();
  // LIKE のワイルドカードをユーザー入力から取り除いてからパターンを組む
  const pattern = `%${trimmed.replace(/[%_\\]/g, '\\$&')}%`;

  const rows = await db.getAllAsync<VisitRow & { cover_uri: string | null; photo_count: number }>(
    `SELECT v.*,
            (SELECT p.uri FROM photos p
              WHERE p.visit_id = v.id
              ORDER BY p.sort_order ASC, p.taken_at ASC
              LIMIT 1) AS cover_uri,
            (SELECT COUNT(*) FROM photos p WHERE p.visit_id = v.id) AS photo_count
       FROM visits v
      WHERE v.memo         LIKE ? ESCAPE '\\'
         OR v.salon_name   LIKE ? ESCAPE '\\'
         OR v.stylist_name LIKE ? ESCAPE '\\'
      ORDER BY v.visited_at DESC, v.created_at DESC;`,
    [pattern, pattern, pattern]
  );

  return rows.map((row) => ({
    ...mapVisit(row),
    coverUri: row.cover_uri,
    photoCount: row.photo_count,
  }));
}

// -----------------------------------------------------------------------------
// photos
// -----------------------------------------------------------------------------

export async function listPhotos(visitId: string): Promise<Photo[]> {
  const db = await initDatabase();
  const rows = await db.getAllAsync<PhotoRow>(
    'SELECT * FROM photos WHERE visit_id = ? ORDER BY sort_order ASC, taken_at ASC;',
    [visitId]
  );
  return rows.map(mapPhoto);
}

/**
 * 写真を1枚登録する。
 * `uri` は Paths.document からの相対パス（例 photos/xxxx.jpg）。絶対パスを渡さないこと。
 */
export async function addPhoto(input: {
  visitId: string;
  uri: string;
  takenAt?: string;
}): Promise<Photo> {
  const db = await initDatabase();

  const next = await db.getFirstAsync<{ next_order: number }>(
    'SELECT COALESCE(MAX(sort_order) + 1, 0) AS next_order FROM photos WHERE visit_id = ?;',
    [input.visitId]
  );

  const photo: Photo = {
    id: newId(),
    visitId: input.visitId,
    uri: input.uri,
    takenAt: input.takenAt ?? now(),
    sortOrder: next?.next_order ?? 0,
  };

  await db.runAsync(
    'INSERT INTO photos (id, visit_id, uri, taken_at, sort_order) VALUES (?, ?, ?, ?, ?);',
    [photo.id, photo.visitId, photo.uri, photo.takenAt, photo.sortOrder]
  );

  return photo;
}

/**
 * 並び順だけを更新する。
 *
 * 並べ替えのたびにファイルをコピーし直すのは無駄で、失敗すると写真を失う。
 * 既存の写真は sort_order を振り直すだけにする。
 */
export async function updatePhotoOrder(id: string, sortOrder: number): Promise<void> {
  const db = await initDatabase();
  await db.runAsync('UPDATE photos SET sort_order = ? WHERE id = ?;', [sortOrder, id]);
}

/** DB の行だけを消す。ファイルの実体は lib/photos.ts 側で消すこと */
export async function deletePhoto(id: string): Promise<void> {
  const db = await initDatabase();
  await db.runAsync('DELETE FROM photos WHERE id = ?;', [id]);
}

/** 全写真の相対パス。書き出しや孤立ファイルの掃除に使う */
export async function listAllPhotoUris(): Promise<string[]> {
  const db = await initDatabase();
  const rows = await db.getAllAsync<{ uri: string }>('SELECT uri FROM photos;');
  return rows.map((row) => row.uri);
}

// -----------------------------------------------------------------------------
// 入力候補
// -----------------------------------------------------------------------------

async function distinctColumn(column: 'salon_name' | 'stylist_name'): Promise<string[]> {
  const db = await initDatabase();
  // よく使う順に並べ、同数なら直近に使ったものを優先する
  const rows = await db.getAllAsync<{ value: string }>(
    `SELECT ${column} AS value
       FROM visits
      WHERE ${column} IS NOT NULL AND ${column} != ''
      GROUP BY ${column}
      ORDER BY COUNT(*) DESC, MAX(visited_at) DESC
      LIMIT 10;`
  );
  return rows.map((row) => row.value);
}

export function distinctSalonNames(): Promise<string[]> {
  return distinctColumn('salon_name');
}

export function distinctStylistNames(): Promise<string[]> {
  return distinctColumn('stylist_name');
}

// -----------------------------------------------------------------------------
// photo_reminders
// -----------------------------------------------------------------------------

export async function createReminder(input: {
  appointmentAt: string;
  notificationId: string | null;
  notificationIdEvening: string | null;
}): Promise<PhotoReminder> {
  const db = await initDatabase();

  const reminder: PhotoReminder = {
    id: newId(),
    appointmentAt: input.appointmentAt,
    notificationId: input.notificationId,
    notificationIdEvening: input.notificationIdEvening,
    cancelledAt: null,
    createdAt: now(),
  };

  await db.runAsync(
    `INSERT INTO photo_reminders
       (id, appointment_at, notification_id, notification_id_evening, cancelled_at, created_at)
     VALUES (?, ?, ?, ?, ?, ?);`,
    [
      reminder.id,
      reminder.appointmentAt,
      reminder.notificationId,
      reminder.notificationIdEvening,
      reminder.cancelledAt,
      reminder.createdAt,
    ]
  );

  return reminder;
}

/** 未キャンセルかつ予約日時が未来のリマインド。新しい順ではなく近い順 */
export async function listActiveReminders(): Promise<PhotoReminder[]> {
  const db = await initDatabase();
  const rows = await db.getAllAsync<ReminderRow>(
    `SELECT * FROM photo_reminders
      WHERE cancelled_at IS NULL
      ORDER BY appointment_at ASC;`
  );
  return rows.map(mapReminder);
}

/** キャンセル済みとして印をつける。通知そのものの取り消しは lib/notifications.ts が行う */
export async function markReminderCancelled(id: string): Promise<void> {
  const db = await initDatabase();
  await db.runAsync('UPDATE photo_reminders SET cancelled_at = ? WHERE id = ?;', [now(), id]);
}

export async function deleteReminder(id: string): Promise<void> {
  const db = await initDatabase();
  await db.runAsync('DELETE FROM photo_reminders WHERE id = ?;', [id]);
}

/**
 * 指定した「日」に予約されている未キャンセルのリマインドを返す。
 * 記録を保存したときに、その日の残り通知を取り消すために使う。
 *
 * @param isoDate ISO8601 の日時文字列。日付部分だけを見る
 */
export async function findRemindersOn(isoDate: string): Promise<PhotoReminder[]> {
  const db = await initDatabase();
  // ⚠ この関数は **UTC の日付**で比較する。appointment_at は toISOString() で
  // 保存されるため、日本時間（UTC+9）では 09:00 より前の予約が前日扱いになり、
  // 朝いちの美容院を取りこぼす。
  // リマインドのキャンセルには使わないこと。lib/notifications.ts の
  // cancelRemindersForDate() がローカルの日付キーで突き合わせる。
  const day = isoDate.slice(0, 10);

  const rows = await db.getAllAsync<ReminderRow>(
    `SELECT * FROM photo_reminders
      WHERE cancelled_at IS NULL
        AND substr(appointment_at, 1, 10) = ?
      ORDER BY appointment_at ASC;`,
    [day]
  );
  return rows.map(mapReminder);
}

// -----------------------------------------------------------------------------
// 書き出し
// -----------------------------------------------------------------------------

/** 全データを1つの構造にまとめる。expo-sharing で書き出す JSON の元になる */
export async function exportAll(): Promise<ExportPayload> {
  const db = await initDatabase();

  const visitRows = await db.getAllAsync<VisitRow>(
    'SELECT * FROM visits ORDER BY visited_at DESC, created_at DESC;'
  );
  const photoRows = await db.getAllAsync<PhotoRow>(
    'SELECT * FROM photos ORDER BY visit_id ASC, sort_order ASC;'
  );

  const photosByVisit = new Map<string, Photo[]>();
  for (const row of photoRows) {
    const photo = mapPhoto(row);
    const list = photosByVisit.get(photo.visitId);
    if (list) list.push(photo);
    else photosByVisit.set(photo.visitId, [photo]);
  }

  return {
    version: 1,
    exportedAt: now(),
    visits: visitRows.map((row) => ({
      ...mapVisit(row),
      photos: photosByVisit.get(row.id) ?? [],
    })),
  };
}
