import { useLocalSearchParams } from 'expo-router';

import { AddVisit } from '@/screens/add-visit';

export default function AddVisitScreen() {
  // id があれば編集、無ければ新規作成。
  // date は撮影リマインドの通知から開いたときに渡ってくる予約日
  const { id, date } = useLocalSearchParams<{ id?: string; date?: string }>();
  return <AddVisit visitId={id} initialDate={date} />;
}
