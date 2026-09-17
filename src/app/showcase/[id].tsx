import { useLocalSearchParams } from 'expo-router';

import { showcase } from '@/constants/theme';
import { Stub } from '@/screens/stub';

export default function ShowcaseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  // 見せるモードはテーマに関係なく常に黒背景
  return <Stub title="見せるモード" params={{ id }} background={showcase.background} />;
}
