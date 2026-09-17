/**
 * DB の行に対応するドメイン型。
 * SQLite 側は snake_case、アプリ側は camelCase で扱い、変換は src/lib/db.ts が行う。
 */

export type Visit = {
  id: string;
  /** ISO8601。来店した日時 */
  visitedAt: string;
  salonName: string | null;
  stylistName: string | null;
  memo: string | null;
  isFavorite: boolean;
  createdAt: string;
  updatedAt: string;
};

export type Photo = {
  id: string;
  visitId: string;
  /** Paths.document からの相対パス（例 photos/xxxx.jpg）。絶対パスは保存しない */
  uri: string;
  takenAt: string;
  sortOrder: number;
};

/** 写真を1枚以上伴った来店記録。一覧・詳細で使う */
export type VisitWithPhotos = Visit & {
  photos: Photo[];
};

/** 一覧のグリッド用。先頭の1枚だけを持つ軽量な形 */
export type VisitSummary = Visit & {
  coverUri: string | null;
  photoCount: number;
};

export type PhotoReminder = {
  id: string;
  /** ISO8601。美容院の予約日時 */
  appointmentAt: string;
  /** 予約の2時間後に鳴る通知の ID */
  notificationId: string | null;
  /** 当日20時に鳴る通知の ID。条件を満たさず登録しなかった場合は null */
  notificationIdEvening: string | null;
  /** 記録が保存されてキャンセルされた日時。未キャンセルなら null */
  cancelledAt: string | null;
  createdAt: string;
};

/** createVisit / updateVisit の入力。すべて任意項目 */
export type VisitInput = {
  visitedAt?: string;
  salonName?: string | null;
  stylistName?: string | null;
  memo?: string | null;
  isFavorite?: boolean;
};

/** 書き出し（expo-sharing）で吐き出す JSON の形 */
export type ExportPayload = {
  version: 1;
  exportedAt: string;
  visits: VisitWithPhotos[];
};
