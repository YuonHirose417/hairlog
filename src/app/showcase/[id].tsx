import { useLocalSearchParams } from 'expo-router';

import { Showcase } from '@/screens/showcase';

export default function ShowcaseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  return <Showcase id={id} />;
}
