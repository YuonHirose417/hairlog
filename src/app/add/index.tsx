import { useLocalSearchParams } from 'expo-router';

import { AddVisit } from '@/screens/add-visit';

export default function AddVisitScreen() {
  // id があれば編集、無ければ新規作成
  const { id } = useLocalSearchParams<{ id?: string }>();
  return <AddVisit visitId={id} />;
}
