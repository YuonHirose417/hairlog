/**
 * デザイントークンの唯一の定義場所。
 *
 * 画面やコンポーネントに生の hex / 数値リテラルを書かないこと。
 * 色は useTheme()（src/hooks/use-theme.ts）から取り、それ以外はここから直接 import する。
 *
 * 方針「Soft Charcoal」
 * - 落ち着いたグレージュ基調。アクセントはセージグリーン
 * - アクセント色は ♡・主要ボタン・選択状態にだけ使う。写真の周囲には一切使わない
 * - 写真を最優先で大きく見せ、文字やボタンは控えめにする
 */

import { Platform } from 'react-native';

// -----------------------------------------------------------------------------
// 色
// -----------------------------------------------------------------------------

/**
 * ライト / ダークで同じキーを持つ。片方にしかないキーを作らないこと
 * （useTheme() の戻り値の型が割れる）。
 */
export const colors = {
  light: {
    /** 画面の地 */
    background: '#F4F4F2',
    /** カード・シートなど一段持ち上がった面 */
    surface: '#FFFFFF',
    /** 入力欄など、地よりわずかに沈んだ面 */
    surfaceSunken: '#EAEAE7',
    /** 本文 */
    text: '#1F2220',
    /** 補助テキスト（日付・美容院名・担当者名など） */
    textMuted: '#7C817D',
    /** さらに弱い注釈・プレースホルダー */
    textFaint: '#A4A8A4',
    /** 区切り線・枠線 */
    border: '#DEDEDA',
    /** ♡・主要ボタン・選択状態にだけ使う */
    accent: '#6E8B72',
    /** accent の上に載せる文字 */
    onAccent: '#FFFFFF',
    /** accent の淡い面（選択状態の背景など） */
    accentSubtle: '#E4EBE5',
    /** 削除など、取り消せない操作 */
    danger: '#B4564B',
    /** 写真を置く下地。読み込み中もここが見える */
    photoBackground: '#E4E4E0',
    /** モーダルの背後を覆う色 */
    scrim: 'rgba(18, 20, 18, 0.32)',
    /** expo-blur の tint */
    blurTint: 'light',
  },
  dark: {
    background: '#121412',
    surface: '#1D201E',
    surfaceSunken: '#262A27',
    text: '#EDEFEC',
    textMuted: '#9AA09B',
    textFaint: '#6E746F',
    border: '#2F332F',
    accent: '#8FB094',
    onAccent: '#11150F',
    accentSubtle: '#232D24',
    danger: '#D2796D',
    photoBackground: '#262A26',
    scrim: 'rgba(0, 0, 0, 0.5)',
    blurTint: 'dark',
  },
} as const;

export type ColorScheme = keyof typeof colors;
export type ThemeColors = (typeof colors)[ColorScheme];
/** 実際に色として使えるキー。blurTint は 'light' | 'dark' の指定値なので除く */
export type ColorName = Exclude<keyof ThemeColors, 'blurTint'>;

/**
 * 見せるモード専用の固定色。
 * **テーマに関係なく常に黒背景。** ライト / ダークで切り替えないこと。
 */
export const showcase = {
  background: '#000000',
  text: '#FFFFFF',
  textMuted: '#9E9E9E',
  /** 写真の上に重ねるコントロールの下地 */
  control: 'rgba(255, 255, 255, 0.12)',
  /** 見せるモードに入ったときに上げる画面の明るさ（0〜1） */
  brightness: 1,
} as const;

// -----------------------------------------------------------------------------
// 余白
// -----------------------------------------------------------------------------

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
} as const;

/** 画面の左右の基本余白 */
export const screenPadding = spacing.md;

// -----------------------------------------------------------------------------
// 角丸
// -----------------------------------------------------------------------------

export const radius = {
  /** ホームのグリッドサムネイル。小さめにして写真を大きく見せる */
  thumb: 10,
  /** 入力欄・小さめのボタン */
  control: 12,
  /** カード・大きな写真 */
  card: 20,
  /** モーダル / ボトムシート */
  sheet: 28,
  /** 丸ボタン・ピル */
  pill: 999,
} as const;

// -----------------------------------------------------------------------------
// タイポグラフィ
// -----------------------------------------------------------------------------

/**
 * **最小は 12。11 以下のサイズは作らない。**
 */
export const fontSize = {
  caption: 12,
  body: 14,
  subhead: 16,
  title: 20,
  display: 28,
} as const;

export const fontFamily = {
  regular: 'ZenKakuGothicNew_400Regular',
  medium: 'ZenKakuGothicNew_500Medium',
  bold: 'ZenKakuGothicNew_700Bold',
} as const;

/** 和文は行間を広めに取ったほうが読みやすい */
export const lineHeight = {
  caption: 18,
  body: 22,
  subhead: 26,
  title: 30,
  display: 38,
} as const;

/**
 * components/ui/text.tsx の variant に対応する。
 * 画面側で fontSize / fontFamily を個別に指定せず、この variant を使うこと。
 */
export const typography = {
  /** 日付・美容院名・担当者名など、上部に小さく置く情報 */
  caption: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.caption,
    lineHeight: lineHeight.caption,
  },
  /** メモ本文 */
  body: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.body,
    lineHeight: lineHeight.body,
  },
  /** ボタンのラベル、リストの行 */
  subhead: {
    fontFamily: fontFamily.medium,
    fontSize: fontSize.subhead,
    lineHeight: lineHeight.subhead,
  },
  /** 画面の見出し */
  title: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.title,
    lineHeight: lineHeight.title,
  },
  /** 空状態など、ごく限られた場面の大見出し */
  display: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.display,
    lineHeight: lineHeight.display,
  },
} as const;

export type TypographyVariant = keyof typeof typography;

// -----------------------------------------------------------------------------
// 影
// -----------------------------------------------------------------------------

/**
 * 柔らかく広い影。**アクセント色は混ぜない**（写真の周囲に色を乗せないため）。
 * Android は elevation のみ効く。
 */
export const shadow = {
  soft: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOpacity: 0.06,
      shadowRadius: 12,
      shadowOffset: { width: 0, height: 4 },
    },
    default: { elevation: 2 },
  }),
  lifted: Platform.select({
    ios: {
      shadowColor: '#000000',
      shadowOpacity: 0.1,
      shadowRadius: 24,
      shadowOffset: { width: 0, height: 10 },
    },
    default: { elevation: 6 },
  }),
} as const;

// -----------------------------------------------------------------------------
// モーション
// -----------------------------------------------------------------------------

export const motion = {
  duration: {
    fast: 150,
    base: 250,
    slow: 400,
  },
  /** 保存完了など、気持ちよく弾ませたいとき */
  spring: {
    damping: 18,
    stiffness: 180,
    mass: 1,
  },
  /** 写真の拡大・縮小など、跳ねてほしくないとき */
  springTight: {
    damping: 26,
    stiffness: 260,
    mass: 1,
  },
} as const;

// -----------------------------------------------------------------------------
// レイアウト
// -----------------------------------------------------------------------------

export const layout = {
  /** ホームのグリッドの列数 */
  gridColumns: 3,
  /** グリッドのセル間の隙間 */
  gridGap: spacing.xs,
  /** 写真の標準アスペクト比（縦長）。髪型は縦位置で撮ることが多い */
  photoAspectRatio: 3 / 4,
  /** タップ領域の最小サイズ */
  minTouchTarget: 44,
  /** blur ヘッダーの高さ（セーフエリアを除く） */
  headerHeight: 52,
} as const;

/** 無料プランで保存できる記録の上限 */
export const FREE_VISIT_LIMIT = 5;
