/**
 * 撮影リマインドのローカル通知。
 *
 * 「今日の髪型を撮り忘れた」を防ぐための機能。予約日時を登録すると、施術後に
 * 通知が届く。通知は端末内で完結し、サーバーには何も送らない。
 *
 * **許可はアプリ起動時に求めない。** 予約を登録しようとしたときに初めて求める。
 *
 * **iOS では端末の時計を進めても通知は早まらない。** 発火予定は OS 側の
 * スケジューラが持っているため、システム時刻を手で動かしても前倒しにはならない。
 * 動作を確かめるときは scheduleTestNotification()（1分後）で実際に待つか、
 * HOURS_AFTER_APPOINTMENT を一時的に小さくすること（**戻し忘れに注意**）。
 */

import * as Notifications from 'expo-notifications';

import {
  createReminder,
  listActiveReminders,
  markReminderCancelled,
} from '@/lib/db';
import type { PhotoReminder } from '@/types/models';

/** 施術が終わるまでの見込み。予約からこれだけ後に1本目を出す */
const HOURS_AFTER_APPOINTMENT = 2;
/** 2本目を出す時刻（当日） */
const EVENING_HOUR = 20;
/** 1本目と2本目が近すぎると連続で鳴るので、これだけは離す */
const MIN_GAP_HOURS = 1;

const TITLE = '今日の髪型を撮っておきましょう';
const BODY = '次に美容院へ行くとき、美容師さんに見せられます。';

/** 通知の data に入れる種別。タップを受けたときの判別に使う */
export const REMINDER_KIND = 'photo-reminder';

// アプリを開いている間も通知を出す。開いていると出ないと、
// 実機で動作を確認するときに届いていないのか出ていないのか分からなくなる
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

// -----------------------------------------------------------------------------
// 日付のたすき掛け
// -----------------------------------------------------------------------------

/**
 * ローカル時刻での `YYYY-MM-DD`。
 *
 * **`toISOString().slice(0, 10)` は使えない。** あれは UTC の日付なので、
 * 日本時間（UTC+9）では 09:00 より前の予約が前日扱いになる。朝いちの美容院を
 * 登録したときに、その日の記録と突き合わせられなくなる。
 */
export function localDateKey(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// -----------------------------------------------------------------------------
// 許可
// -----------------------------------------------------------------------------

/**
 * 通知の許可を確認し、無ければ求める。
 * **例外を投げない。** 拒否されても false を返すだけにして、呼び出し側が案内を出す。
 */
export async function ensurePermission(): Promise<boolean> {
  try {
    const current = await Notifications.getPermissionsAsync();
    if (current.granted) return true;
    // 一度拒否されていても、設定で許可されていればここで granted になる
    if (!current.canAskAgain) return false;

    const asked = await Notifications.requestPermissionsAsync();
    return asked.granted;
  } catch (error) {
    console.error('[hairlog] 通知の許可を確認できませんでした', error);
    return false;
  }
}

// -----------------------------------------------------------------------------
// スケジュール
// -----------------------------------------------------------------------------

function scheduleAt(when: Date, appointmentAt: string) {
  return Notifications.scheduleNotificationAsync({
    content: {
      title: TITLE,
      body: BODY,
      data: { kind: REMINDER_KIND, appointmentAt },
    },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: when },
  });
}

/**
 * 予約日時から通知を組み立てる。CLAUDE.md §8 の条件どおり。
 *
 * - 2時間後 … 必ず出す
 * - 当日20時 … 2時間後より1時間以上あとで、かつ未来のときだけ出す
 *   （予約が18時以降だと20時が近すぎる／過ぎているため）
 */
export async function scheduleReminder(appointmentAt: Date): Promise<void> {
  // 「次の予約」は1件だけ。前のものが残っていると通知が二重になる
  await cancelReminder();

  const iso = appointmentAt.toISOString();
  const now = Date.now();

  const primaryAt = new Date(appointmentAt.getTime() + HOURS_AFTER_APPOINTMENT * 3600_000);
  const notificationId = await scheduleAt(primaryAt, iso);

  const eveningAt = new Date(appointmentAt);
  eveningAt.setHours(EVENING_HOUR, 0, 0, 0);

  const farEnough = eveningAt.getTime() >= primaryAt.getTime() + MIN_GAP_HOURS * 3600_000;
  const inFuture = eveningAt.getTime() > now;

  const notificationIdEvening =
    farEnough && inFuture ? await scheduleAt(eveningAt, iso) : null;

  await createReminder({ appointmentAt: iso, notificationId, notificationIdEvening });

  // 実機で発火予定時刻を確認できるようにする。
  // 1本目は「予約の2時間後」なので、想定より先の日時になっていないかここで分かる
  await logNotificationDiagnostics(
    `予約を登録（予約日時 ${appointmentAt.toLocaleString()} / 通知 ${
      notificationIdEvening ? 2 : 1
    }本）`
  );
}

/**
 * 【開発中の切り分け用】1分後にテスト通知を予約する。
 *
 * **本番とまったく同じ文面・同じ data** を使う。タップしたときに記録追加が
 * 開くところまで同じ経路を通り、「通知の仕組み自体が動いているか」を切り分けられる。
 *
 * 本番の1本目は予約日時の2時間後なので、そのままでは当日中に届かない。
 * 「届かない」のか「まだ来ていない」だけなのかを見分けるために使う。
 */
export async function scheduleTestNotification(): Promise<boolean> {
  if (!(await ensurePermission())) {
    await logNotificationDiagnostics('テスト通知（許可されていない）');
    return false;
  }

  const at = new Date(Date.now() + 60_000);
  await scheduleAt(at, at.toISOString());
  await logNotificationDiagnostics('テスト通知を1分後に予約');
  return true;
}

// -----------------------------------------------------------------------------
// 診断
// -----------------------------------------------------------------------------

/**
 * 許可の状態と、いま予約されている通知をログに出す。
 *
 * **__DEV__ に限定しない。** 実機で起きた問題を後から追えるようにしておきたい。
 * 出すのは件数と時刻だけで、写真やメモの中身は含まない。
 */
export async function logNotificationDiagnostics(label: string): Promise<void> {
  const tag = '[hairlog][通知]';
  try {
    const permission = await Notifications.getPermissionsAsync();
    console.log(`${tag} ${label}`);
    console.log(`${tag} 許可:`, {
      status: permission.status,
      granted: permission.granted,
      canAskAgain: permission.canAskAgain,
      ios: permission.ios,
    });

    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    console.log(`${tag} 予約済みの通知: ${scheduled.length}件`);

    scheduled.forEach((item, index) => {
      console.log(`${tag}   [${index + 1}]`, {
        id: item.identifier,
        title: item.content.title,
        // トリガの形を決め打ちせず丸ごと出す。日付以外のトリガでも読めるように
        trigger: JSON.stringify(item.trigger),
      });
    });
  } catch (error) {
    console.log(`${tag} 診断に失敗しました`, error);
  }
}

// -----------------------------------------------------------------------------
// 取り消し
// -----------------------------------------------------------------------------

async function cancelNotifications(reminder: PhotoReminder) {
  // 個別に消す。cancelAllScheduledNotificationsAsync は他の予定まで巻き込む
  for (const id of [reminder.notificationId, reminder.notificationIdEvening]) {
    if (!id) continue;
    await Notifications.cancelScheduledNotificationAsync(id).catch(() => {});
  }
}

/** 登録済みのリマインドをすべて取り消す */
export async function cancelReminder(): Promise<void> {
  for (const reminder of await listActiveReminders()) {
    await cancelNotifications(reminder);
    await markReminderCancelled(reminder.id);
  }
  await logNotificationDiagnostics('予約を取り消し');
}

/**
 * その日の記録が保存されたので、残りの通知を消す。
 *
 * **db.findRemindersOn() は使わない。** あれは UTC の日付で比較するため、
 * 朝いちの予約を取りこぼす（localDateKey のコメント参照）。
 */
export async function cancelRemindersForDate(visitedAt: string): Promise<void> {
  const target = localDateKey(visitedAt);

  for (const reminder of await listActiveReminders()) {
    if (localDateKey(reminder.appointmentAt) !== target) continue;
    await cancelNotifications(reminder);
    await markReminderCancelled(reminder.id);
  }
}

// -----------------------------------------------------------------------------
// 参照
// -----------------------------------------------------------------------------

/**
 * 次の予約を1件返す。ついでに前日以前の古いものを片付ける。
 *
 * 当日のものは残す。予約時刻を過ぎていても、2本目の通知がまだ控えている
 * 可能性があるため。
 */
export async function getNextReminder(): Promise<PhotoReminder | null> {
  const today = localDateKey(new Date());
  let next: PhotoReminder | null = null;

  for (const reminder of await listActiveReminders()) {
    const day = localDateKey(reminder.appointmentAt);

    if (day < today) {
      await cancelNotifications(reminder);
      await markReminderCancelled(reminder.id);
      continue;
    }
    // listActiveReminders は appointment_at の昇順なので、最初に見つかったものが最も近い
    if (!next) next = reminder;
  }

  return next;
}
