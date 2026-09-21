# hairlog — プロジェクト指示

美容院でカットした髪型を、写真とメモで記録する iOS アプリ。

**このファイルの指示は、インストール済みスキルの内容と食い違う場合に優先される。**

---

## 1. アプリの目的

- 「この髪型よかったのに忘れた」「写真を撮り忘れた」を防ぐ
- 次の来店時に、美容師さんへスマホを見せて伝えられるようにする
- 男女・髪の長さを問わず使える。**性別で画面や項目を分けない**
- 写真が主役の「自分の髪型ルックブック」のような見た目にする。UI には特にこだわる

---

## 2. 開発環境と制約

- **Windows で開発する。iOS シミュレーターは使えない**
- 動作確認は **iPhone 実機（Expo Go）** で行う
- development build / App Store 提出用ビルドは **EAS Build（クラウド）** で作る
- **課金以外の全機能は Expo Go で動く状態を保つこと。** RevenueCat は Expo Go で動かないため、課金の確認は development build で行う
- 外部のデザインツールや有料 API は使わない

---

## 3. 技術構成（厳守）

| 分類 | 採用 |
|---|---|
| 基盤 | Expo **SDK 57** + expo-router + TypeScript |
| バックエンド | **なし。** データはすべて端末内 |
| DB | `expo-sqlite`（端末内保存） |
| 写真の実体 | `expo-file-system` でアプリ内フォルダに保存。**DB にはパスのみ保存** |
| 写真の取り込み | `expo-image-picker` のみ（`launchCameraAsync` / `launchImageLibraryAsync`）。**expo-camera は使わない** |
| ID 生成 | `expo-crypto` の `Crypto.randomUUID()`。`Date.now()` や自前の乱数は使わない |
| 通知 | `expo-notifications` のローカル通知。**撮影リマインドのみ** |
| 課金 | RevenueCat（`react-native-purchases`）、**買い切り** |
| 配信 | EAS Build / EAS Submit |
| UI | `react-native-reanimated`, `react-native-gesture-handler`, `expo-image`, `expo-blur`, `expo-haptics`, `expo-font`, `@expo/ui` |
| 見せるモード | `expo-brightness`, `expo-keep-awake` |
| 書き出し | `expo-media-library`（カメラロール保存）, `expo-sharing`（データ書き出し） |

### やらないこと

- 外部 API やサーバーを追加しない。**写真を端末の外に送信しない**
- SDK のバージョンを手で上げない（`expo-upgrade` スキルの手順に従う）
- パッケージは必ず `npx expo install <pkg>` で入れる（`npm install` は使わない）

### expo-file-system は新 API を使う

SDK 57 の `Paths` / `File` / `Directory` を使う。**旧 API（`FileSystem.documentDirectory`、`copyAsync` など、`expo-file-system/legacy`）は使わない。**

```ts
import { Paths, File, Directory } from 'expo-file-system';
```

DB に保存するのは `Paths.document` からの**相対パス**（例 `photos/<uuid>.jpg`）のみ。iOS では OS 更新でアプリのコンテナ絶対パスが変わるため、絶対パスを保存すると画像が表示できなくなる。パスの解決は `src/lib/photos.ts` に閉じ込め、画面側は相対パスしか扱わない。

---

## 4. ディレクトリ構成

```
src/
├── app/           Expo Router のルートのみ（画面本体は置かない）
├── screens/       画面本体。route はこれを render するだけ
├── components/ui/ 共通部品。画面はここの部品だけを使う
├── constants/
│   └── theme.ts   デザイントークンの唯一の定義場所
├── lib/
│   ├── db.ts          DB アクセスを全集約
│   ├── photos.ts      ファイル保存/削除/パス解決
│   ├── notifications.ts
│   ├── purchases.ts   RevenueCat ラッパー
│   └── suggestions.ts 美容院名・担当者名の候補
├── hooks/
└── types/
```

**ルール**

- `src/app/` に置いたファイルはすべてルートになる。画面本体・部品・ユーティリティを置かない
- **DB アクセスは `src/lib/db.ts` に集約する。** 画面やコンポーネントで直接 SQL を書かない
- ファイル名は kebab-case（`photo-frame.tsx`）
- スタイルは `StyleSheet.create()` をコンポーネントファイル末尾に置く。別ファイルに分けない

---

## 5. データ設計

```sql
visits          id, visited_at, salon_name, stylist_name, memo, is_favorite,
                created_at, updated_at
photos          id, visit_id (ON DELETE CASCADE), uri, taken_at, sort_order,
                saved_to_library_at
photo_reminders id, appointment_at, notification_id, notification_id_evening,
                cancelled_at, created_at
```

- `id` は TEXT（UUID）。`expo-crypto` の `randomUUID()` で生成
- 日時はすべて ISO8601 の TEXT
- `is_favorite` は INTEGER（0/1）
- `photos.uri` は `Paths.document` からの相対パス
- `photos.saved_to_library_at` はカメラロールへ保存した日時。未保存なら NULL。二重保存を避けるために使う。**カメラロール側で消されても検知できない**（読み取り権限を求めていないため）ので、設定画面に「もう一度すべて保存」の逃げ道を置いている
- マイグレーションは `PRAGMA user_version` で管理する
- 初期化時に `PRAGMA foreign_keys = ON` と `journal_mode = WAL` を設定する
- **`deleteVisit` は CASCADE で photos 行を消すが、ファイル実体は自動で消えない。** 削除前に `listPhotos` してファイルも消すこと

---

## 6. 画面

1. **ホーム** — 最新の髪型を大きく表示し、その下に過去の写真をグリッドで並べる
2. **記録追加** — ＋ → 記録追加画面 →「＋ 写真を追加」を押して撮影またはカメラロールから選択 → メモ → 保存（保存時に触覚フィードバックとアニメーション）。**画面を開いた直後に写真の選択肢を自動で出さないこと**（表示アニメーション中に出すと iOS に破棄される）
3. **記録詳細**
4. **見せるモード** — 黒背景で写真とメモを大きく表示。画面を明るくし（`expo-brightness`）、スリープさせない（`expo-keep-awake`）。ピンチで拡大、スワイプで写真切り替え
5. **撮影リマインド** — 予約日時を登録すると、施術後に「今日の髪型を撮りましょう」と通知
6. **メモのキーワード検索**（実装するかは未定）
7. **カメラロール保存**（`expo-media-library`）と**データ書き出し**（`expo-sharing`）
8. **設定・購入画面**

---

## 7. 入力のルール

記録画面の入力は **日付・美容院名・担当者名・写真・自由記述のメモ欄1つだけ**。

- 日付は今日、美容院名と担当者名は**前回の値を初期値**にし、過去の入力を候補として出す
- 日付・美容院・担当者は画面**上部に小さく**表示し、**写真とメモを大きく**見せる
- メモ欄のプレースホルダー: `例：前髪は眉上、横は刈り上げ6mm、すき多め`
- **写真は必須。** 1枚も無い記録は保存できない。「この髪型よかったのに忘れた」を防ぐアプリなので、写真の無い記録は役に立たないため。保存を押したら「写真を1枚以上追加してください」と伝える
- **写真以外（メモ・美容院名・担当者名）はすべて任意。** 写真だけでも保存できる
- ホーム画面と見せるモードは**写真がある前提**で書いてよい
- **チップやプルダウンなどの選択式入力は追加しない**（過去の入力候補の再利用は可）
- **次回来店のリマインドは作らない**

---

## 8. 撮影リマインドの仕様

予約日時から最大2本のローカル通知を登録する。

```
primaryAt = appointment_at + 2時間        → 必ず登録
eveningAt = appointment_at と同じ日の 20:00 → 下の条件を すべて 満たす場合のみ登録
            ├─ eveningAt >= primaryAt + 1時間
            └─ eveningAt が未来である
```

- `primaryAt` が日付をまたぐ場合は上の条件で自然に除外され、1本のみになる
- 登録しなかった場合 `notification_id_evening` は NULL
- **予約日に記録が保存されたら、残りの通知をキャンセルする。** `cancelScheduledNotificationAsync(id)` で個別にキャンセルし（`cancelAllScheduledNotificationsAsync` は使わない）、`cancelled_at` を記録する

| 予約時刻 | 2時間後 | 20時通知 | 本数 |
|---|---|---|---|
| 11:00 | 13:00 | 登録（+7h） | 2 |
| 18:00 | 20:00 | 見送り（差0h） | 1 |
| 18:30 | 20:30 | 見送り（過去） | 1 |
| 23:00 | 翌01:00 | 見送り（過去） | 1 |

---

## 9. 課金

| | 内容 |
|---|---|
| 無料 | 見せるモード、記録は **5件**まで |
| 有料（買い切り） | **記録数の無制限** と **写真の書き出し**（記録の JSON 書き出し / 写真のカメラロール保存） |

- **比較表示（2枚の写真を並べる）は作らない。** 有料機能は上の2つだけ
- **設定の書き出しは現在 `isPro` で制限していない。** 誰でも使える状態なので、購入画面を実装するときに `src/screens/settings/index.tsx` で塞ぐこと
- 購入画面には**「購入を復元」ボタン、利用規約リンク、プライバシーポリシーリンク**を必ず置く
- iOS 用公開キーは `.env` の `EXPO_PUBLIC_REVENUECAT_IOS_KEY` から読み込む
- **`.env` は `.gitignore` に入れ、キーの値をコードに直接書かない**
- **キーが未設定でもアプリが落ちないようにし、課金機能だけが無効になるようにする。** `src/lib/purchases.ts` でキー未設定なら初期化せず no-op 化し、`react-native-purchases` は動的 import + try/catch で読む（Expo Go では import が失敗しうる）
- 課金が無効なときは有料機能を**ロック表示**にし、購入ボタンを無効にする

### キーの渡し方

`src/lib/purchases.ts` は実装済み。`initPurchases()` は例外を投げず、`{ available, reason }` を返すだけなので呼び出し側で try/catch は不要。

| 環境 | キーの渡し方 |
|---|---|
| ローカル（Expo Go / dev client） | `.env` の `EXPO_PUBLIC_REVENUECAT_IOS_KEY` |
| EAS Build（クラウド） | **`.env` は `.gitignore` 済みでアップロードされない。** EAS の環境変数を使う |

```bash
eas env:create --name EXPO_PUBLIC_REVENUECAT_IOS_KEY --value <key> --environment development
```

キーを設定するまでは EAS Build 上でも未定義になり、`reason: 'no-key'` で課金だけが無効になる。これは想定どおりの状態。

---

## 9-b. iOS の識別子（変更しないこと）

| 項目 | 値 |
|---|---|
| バンドルID | **`com.yuonhirose.hairlog`** |
| EAS アカウント（owner） | `yuon` |

**バンドルID は一度 Apple に登録すると実質変更できない。** 変更すると証明書・プロビジョニングプロファイル・App Store Connect のレコードがすべて作り直しになる。

---

## 10. UI ルール

- **写真を最優先で大きく見せる**
- 色・余白・角丸・フォントサイズ・輪郭・影・動きは `src/constants/theme.ts` に定義し、**その値だけを使う。** 画面に生の hex / rgba / 数値リテラルを書かない
- 共通部品（ボタン、カード、入力欄、空状態など）は `src/components/ui/` に作り、画面ではそれを使う
- 男女どちらにも合う配色。**ライト・ダークモード両対応**
- 和文フォントは **M PLUS Rounded 1c**（丸ゴシック）
- 記録0件の画面も丁寧に作り、**「最初の1枚を撮ってみましょう」**と誘導する

### デザイン方針（案B: Sunny Solid）

**ひとことで: 元気・シール感。** イエロー×ネイビーの2色に絞り、太い輪郭と下方向のソリッドな影で「ぷっくり」した立体感を出す。

#### 色の使い分け

| 色 | 使う場所 |
|---|---|
| **イエロー**（`accent`） | 主要操作だけ — ＋ボタン、「美容師さんに見せる」、保存 |
| **ネイビー / スカイ**（`accentSecondary`） | ♡（お気に入り）、選択状態 |
| `text` / `textMuted` / `textFaint` | 文字。黒は使わずネイビー寄りの ink にする |

- **イエローの上に置く文字・記号は必ず `onAccent`（ink）。白にしない**（黄色に白は読めない）
- **ダークモードは輪郭を明色に反転する**（`outline` が light `#1B2430` → dark `#E4E7EE`）。暗い地にネイビーの輪郭を引くと消えるため。イエローはダークでも黄色のまま残す
- **アクセント色はロゴの下線にも使ってよい。ただしホームのロゴのみで、他の装飾には広げない。** ブランドの印であって操作ではないため、唯一の例外として認める。色は `c.accent` を使い、ライト／ダークの出し分けを画面に書かない（ダークは `#FFD75E` になる）

#### 輪郭と影

- **輪郭（`border.bold`）と影を使ってよいのは、ボタン・カードの枠・バッジ・＋ボタンだけ**
- **写真（`PhotoFrame`）には輪郭も影も色も一切付けない。** 髪色が正確に見えなくなり、美容師さんに見せるという目的が損なわれる
- ソリッド影は `src/components/ui/solid-surface.tsx` が作る。**RN の `shadow*` プロパティは使わない**（Android で `elevation` に落ちて見た目が割れるため、背面に色面を敷く方式にしてある）

#### 形・文字・動き

- 角丸: グリッドのサムネイル `14` / カード `24` / シート `28`
- **フォントサイズは最小 12px。** 11px 以下は使わない
- **12px の文字は背景とのコントラスト比 4.5:1 以上。** 日付・美容院名など読ませたい文字は `textFaint` ではなく **`textMuted`** を使う
- **押して沈む動き（`sink`）は主要ボタンだけ** —「美容師さんに見せる」と ＋。多用すると画面が落ち着かなくなる
- `expo-blur` のヘッダーは**リストに絶対配置で重ねる**（縦に積むと写真が透けず、blur の意味がない）
- **見せるモードはテーマに関係なく常に黒背景**（`showcase.background` 固定。ライト/ダークで切り替えない）
- 枚数バッジは写真の上に乗る唯一の要素。**アクセント色を使わず**、`sticker` トークン（白フチ + 暗い無彩色）だけで作る

---

## 11. 権限

カメラ・写真ライブラリ・通知の利用目的を `app.json` に**日本語で**書く。文面は「写真は端末内にのみ保存される」ことが伝わるようにする。

---

## 12. スキルの使い方

実装時に以下のインストール済みスキルを参照する。

| 対象 | スキル |
|---|---|
| Expo 全般・構成・画面遷移 | `expo-overview`, `expo-project-structure`, `expo-router` |
| UI | `expo-native-ui`, `expo-ui`, `expo-design-system` |
| アニメーションとジェスチャー | `expo-animation`, `vercel-react-native-skills` |
| 課金のテスト用ビルド | `expo-dev-client` |

**スキルの内容とこの CLAUDE.md が食い違う場合は、CLAUDE.md を優先する。**

---

## 13. 開発コマンド

```bash
npx expo start --go          # Expo Go で確認（課金以外の全機能）
npx expo start --dev-client  # development build で確認（課金を含む）
npx tsc --noEmit             # 型チェック
npm run lint                 # Lint
npx expo install <pkg>       # パッケージ追加（npm install は使わない）
```

**`expo-dev-client` が入っているため、`npx expo start` の既定の接続先は development build になる。** Expo Go を使うときは `--go` を明示すること。

### EAS Build

```bash
npx eas-cli build --platform ios --profile development  # 実機用 development build
npx eas-cli build:list                                  # ビルド履歴と消費の確認
npx eas-cli credentials --platform ios                  # 証明書の状態確認
```

- **Distribution Certificate は新規作成しない。** 同じ Apple アカウントで sakelog の証明書を使っており、Apple の上限は1アカウント2枚。新規作成して上限に達すると既存を revoke するしかなくなり、sakelog 側のビルドも署名が無効になる。ビルド時に聞かれたら**既存を再利用**する
- Provisioning Profile はバンドルIDごとに必要なので、hairlog 用に新規作成してよい
- development build は**ネイティブの依存が変わったときだけ**作り直す。JS だけの変更は Metro 経由で反映される
