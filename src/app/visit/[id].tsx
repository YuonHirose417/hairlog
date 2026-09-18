import { useLocalSearchParams } from 'expo-router';

import { VisitDetail } from '@/screens/visit-detail';

export default function VisitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <VisitDetail id={id} />;
}
