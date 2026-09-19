import { useLocalSearchParams } from 'expo-router';

import { Paywall } from '@/screens/paywall';

export default function PaywallScreen() {
  const { from } = useLocalSearchParams<{ from?: string }>();

  return <Paywall from={from === 'add' ? 'add' : 'settings'} />;
}
