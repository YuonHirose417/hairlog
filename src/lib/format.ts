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

/** `3.14` — グリッドのセルなど、幅が狭い場所 */
export function formatShortDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getMonth() + 1}.${date.getDate()}`;
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
