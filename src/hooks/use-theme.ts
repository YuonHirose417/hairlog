import { useColorScheme } from 'react-native';

import { colors, type ColorScheme, type ThemeColors } from '@/constants/theme';

/**
 * 端末のライト / ダーク設定に追従した色セットを返す。
 *
 * 画面側では `const c = useTheme()` として `c.text` のように使い、
 * 生の hex を書かないこと。
 */
export function useTheme(): ThemeColors {
  const scheme = useColorScheme();
  return colors[scheme === 'dark' ? 'dark' : 'light'];
}

/** 'light' | 'dark' が必要な場面（expo-blur の tint など）で使う */
export function useThemeScheme(): ColorScheme {
  const scheme = useColorScheme();
  return scheme === 'dark' ? 'dark' : 'light';
}
