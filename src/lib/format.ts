/**
 * 表示用の文字列を組み立てる。日付の見た目をここに集約する。
 */

/** `2026.03.14` — 一覧・詳細の日付表示 */
export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}.${month}.${day}`;
}

/**
 * グリッドのセルなど、幅が狭い場所の日付。
 *
 * 今年なら年を省いて `8.27`、今年以外は `2025.8.27` と出す。
 * 直近の記録では年が邪魔になり、古い記録では年が無いと分からないため。
 */
export function formatShortDate(iso: string, now: Date = new Date()): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const monthDay = `${date.getMonth() + 1}.${date.getDate()}`;
  return date.getFullYear() === now.getFullYear()
    ? monthDay
    : `${date.getFullYear()}.${monthDay}`;
}

/** `3月14日 14:00` — 予約日時。日付だけの表示より、時刻まで見せたい場面で使う */
export function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';

  const month = date.getMonth() + 1;
  const day = date.getDate();
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${month}月${day}日 ${hour}:${minute}`;
}

/**
 * 美容院名と担当者名を1行にまとめる。
 *
 * 両方とも任意項目なので、片方だけ・両方無しのすべてを扱う。
 * 何も無いときは null を返し、呼び出し側は行そのものを出さないこと
 * （空行が出ると余白が崩れる）。
 */
export function formatSalonLine(
  salonName: string | null,
  stylistName: string | null
): string | null {
  const salon = salonName?.trim();
  const stylist = stylistName?.trim();

  if (salon && stylist) return `${salon} / ${stylist}さん`;
  if (salon) return salon;
  if (stylist) return `${stylist}さん`;
  return null;
}
