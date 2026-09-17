import { useLocalSearchParams } from 'expo-router';

import { Stub } from '@/screens/stub';

export default function VisitDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Stub title="記録詳細" params={{ id }} />;
}
