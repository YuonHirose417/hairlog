import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';

import { countVisits, listVisits } from '@/lib/db';
import type { VisitSummary } from '@/types/models';

export type UseVisitsResult = {
  visits: VisitSummary[];
  /** 全記録数。無料枠の判定に使う。visits.length は上限つきなので使わない */
  count: number;
  loading: boolean;
  reload: () => Promise<void>;
};

/**
 * 記録一覧を読み、画面に戻るたびに取り直す。
 *
 * 記録追加・削除・お気に入りの切り替えから戻ったときに一覧が古いままに
 * ならないよう、useFocusEffect で再取得する。
 */
export function useVisits(): UseVisitsResult {
  const [visits, setVisits] = useState<VisitSummary[]>([]);
  const [count, setCount] = useState(0);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    try {
      const [rows, total] = await Promise.all([listVisits({ limit: 200 }), countVisits()]);
      setVisits(rows);
      setCount(total);
    } catch (error) {
      console.error('[hairlog] 記録の読み込みに失敗しました', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      void reload();
    }, [reload])
  );

  return { visits, count, loading, reload };
}
