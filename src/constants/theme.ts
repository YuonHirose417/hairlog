/**
 * デザイントークンの唯一の定義場所。
 *
 * 画面やコンポーネントに生の hex / rgba / 数値リテラルを書かないこと。
 * 色は useTheme()（src/hooks/use-theme.ts）から取り、それ以外はここから直接 import する。
 *
 * 方針「Sunny Solid」
 * - イエロー × ネイビーの2色。太い輪郭と下方向のソリッドな影で「ぷっくり」させる
 * - **写真の上・周囲には色も輪郭も影も乗せない**（髪色が正確に見えなくなるため）
 * - 輪郭と影を使ってよいのは ボタン / カードの枠 / バッジ / ＋ボタン だけ
 * - 黄色の上に置く文字・記号は必ず ink。白にしない
 */

// -----------------------------------------------------------------------------
// 色
// -----------------------------------------------------------------------------

/**
 * ライト / ダークで同じキーを持つ。片方にしかないキーを作らないこと
 * （useTheme() の戻り値の型が割れる）。
 *
 * 12px の文字に使う色は、背景に対してコントラスト比 4.5:1 以上を確保してある。
 */
export const colors = {
  light: {
    /**
     * 画面の地。ほぼ無彩色の白。
     * クリーム（#FFFBF0）はアクセントのイエローと色相が近く、ボタンが背景に
     * 馴染んでしまうため黄みを抜いた。surface(#FFFFFF) との差は残してある。
     */
    background: '#F9F9F7',
    /** カード・シートなど一段持ち上がった面 */
    surface: '#FFFFFF',
    /** 入力欄など、地よりわずかに沈んだ面 */
    surfaceSunken: '#EFEFEC',
    /** 本文。黒ではなくネイビー */
    text: '#1B2430',
    /** 補助テキスト。日付・美容院名など「読ませたい12px」はこれを使う（5.66:1） */
    textMuted: '#5A6675',
    /** 最も弱い注釈・プレースホルダー（背景 #F9F9F7 上で 4.80:1／白の上で 5.06:1） */
    textFaint: '#676F7D',
    /** ボタン・バッジ・＋ の太い輪郭 */
    outline: '#1B2430',
    /** カードなど、主張させたくない枠 */
    outlineSubtle: '#E3E3DF',
    /** 背面に敷く影の面の色 */
    solidShadow: '#1B2430',
    /** 主要操作（＋・見せる・保存） */
    accent: '#FFC72E',
    /** accent の上に置く文字・記号。**白にしない** */
    onAccent: '#1B2430',
    /** ♡・選択状態 */
    accentSecondary: '#2B4C7E',
    /** accentSecondary の上に置く文字（8.7:1） */
    onAccentSecondary: '#FFFFFF',
    /** accentSecondary の淡い面 */
    accentSubtle: '#E7EDF6',
    /** 削除など、取り消せない操作 */
    danger: '#E0524A',
    /** 写真を置く下地。読み込み中もここが見える */
    photoBackground: '#EAEAE7',
    /** モーダルの背後を覆う色 */
    scrim: 'rgba(27, 36, 48, 0.32)',
    /** expo-blur の tint */
    blurTint: 'light',
  },
  dark: {
    background: '#141821',
    surface: '#1F2530',
    surfaceSunken: '#29313E',
    text: '#F4F5F7',
    textMuted: '#A3ADBC',
    /** 4.84:1。ダークでも 12px が読める明るさ */
    textFaint: '#7C8695',
    /** 暗い地にネイビーを引くと消えるため、輪郭は明色に反転する */
    outline: '#E4E7EE',
    outlineSubtle: '#39414F',
    /** 明るい面から黒へ落ちるので、暗い地でも影が読める */
    solidShadow: '#000000',
    /** イエローはダークでも黄色のまま残す */
    accent: '#FFD75E',
    /** ダークでも ink。白にすると眩しく読みにくい */
    onAccent: '#1B2430',
    /** ネイビーは暗い地で沈むのでスカイに置換 */
    accentSecondary: '#7FB3E8',
    /** スカイは明るいので、その上は ink（7.1:1） */
    onAccentSecondary: '#1B2430',
    accentSubtle: '#22303F',
    danger: '#FF7A6E',
    photoBackground: '#2A2F38',
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

/**
 * 枚数バッジ（シール風）の固定色。showcase と同じくテーマで切り替えない。
 *
 * バッジは**写真の上に乗る唯一の要素**なので、イエローもネイビーのアクセントも
 * 使わない。白フチ + 暗い無彩色だけにして、写真の色に干渉させない。
 */
export const sticker = {
  border: '#FFFFFF',
  background: '#1B2430',
  text: '#FFFFFF',
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
// 角丸・輪郭・影の深さ
// -----------------------------------------------------------------------------

export const radius = {
  /** ホームのグリッドサムネイル */
  thumb: 14,
  /** 入力欄・小さめのボタン */
  control: 14,
  /** カード・大きな写真 */
  card: 24,
  /** モーダル / ボトムシート */
  sheet: 28,
  /** 丸ボタン・ピル */
  pill: 999,
} as const;

export const border = {
  hairline: 1,
  /** 「ぷっくり」を出す太い輪郭 */
  bold: 2,
} as const;

/**
 * 背面に敷く影の面を、下へずらす量（px）。
 * RN の shadow* プロパティは使わない（Android で elevation に落ちて見た目が割れるため）。
 */
export const depth = {
  solid: 4,
  small: 2,
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
  regular: 'MPLUSRounded1c_400Regular',
  medium: 'MPLUSRounded1c_500Medium',
  bold: 'MPLUSRounded1c_700Bold',
} as const;

/** 丸ゴシックは行間を広めに取ったほうが読みやすい */
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
  /**
   * ホームのロゴ「hairlog」専用。アプリの顔として一番大きく太くする。
   * 他の画面の見出しには使わない。
   */
  logo: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.display,
    lineHeight: 34,
  },
  /** 空状態など、ごく限られた場面の大見出し */
  display: {
    fontFamily: fontFamily.bold,
    fontSize: fontSize.display,
    lineHeight: lineHeight.display,
  },
  /**
   * 見せるモードのメモ。腕を伸ばした距離から美容師さんに読んでもらうので大きくする。
   * 太字だと長文が重くなるので regular のまま、行間だけ広く取る。
   */
  showcaseMemo: {
    fontFamily: fontFamily.regular,
    fontSize: fontSize.title,
    lineHeight: 32,
  },
} as const;

export type TypographyVariant = keyof typeof typography;

// -----------------------------------------------------------------------------
// モーション
// -----------------------------------------------------------------------------

export const motion = {
  duration: {
    fast: 120,
    base: 220,
    slow: 380,
  },
  /** 保存完了など、気持ちよく弾ませたいとき */
  spring: {
    damping: 12,
    stiffness: 260,
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
  /**
   * 最新カードの写真の高さの上限（画面高に対する比）。
   * これを超えると、日付・美容院名・「美容師さんに見せる」が画面外に出てしまう。
   */
  heroMaxHeightRatio: 0.44,
  /** タップ領域の最小サイズ */
  minTouchTarget: 44,
  /** ＋ボタンの直径 */
  fabSize: 60,
  /** ＋ボタンの下端と画面下（セーフエリア）の間隔 */
  fabInset: spacing.lg,
  /** blur ヘッダーの高さ（セーフエリアを除く） */
  headerHeight: 52,
  /** ホームだけロゴとして扱うので、そのぶん高くする */
  homeHeaderHeight: 80,
} as const;

/**
 * ホームのロゴ専用のトークン。
 *
 * **アクセント色を装飾に使ってよいのはここだけ。**（CLAUDE.md §10 の明示的な例外）
 * 他の装飾へ広げないこと。イエローは主要操作のための色。
 */
export const logo = {
  underlineHeight: 4,
  /** 手で引いた線のような柔らかさを出す */
  underlineRadius: 2,
  underlineGap: spacing.xs,
} as const;

/** 無料プランで保存できる記録の上限 */
export const FREE_VISIT_LIMIT = 5;
