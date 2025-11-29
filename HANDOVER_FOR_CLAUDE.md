# Claudeへの引き継ぎ資料 (HANDOVER_FOR_CLAUDE)

## 📌 プロジェクト概要
勤怠管理PWAアプリの開発プロジェクトです。
フロントエンドはVanilla JS + HTML/CSS、バックエンドはGoogle Apps Script (GAS) + Google Sheetsを使用しています。

## 🛠 技術スタック
- **Frontend**: HTML5, CSS3, JavaScript (ES6+), PWA (Service Worker)
- **Backend**: Google Apps Script (GAS)
- **Database**: Google Sheets
- **Notification**: LINE Messaging API
- **Hosting**: GitHub Pages

## ✅ 実装済み機能 & 現状

### 1. 勤怠打刻 (30時間制)
- **仕様**: 午前0時〜午前5時59分は「前日の24時〜29時」として扱います。
- **実装**: `js/app.js` の `getToday()` や `formatTime()` でロジックを制御。
- **UI**: 現在時刻の秒数は小さく表示 (`0.5em`)。

### 2. スプレッドシート連携
- **API**: GASの `doPost` でリクエストを受け付けます。
- **CORS対策**: フロントエンドからの `fetch` は `Content-Type: text/plain` で送信しています（`application/json` だとGASでPreflightエラーになるため）。
- **ロジック**:
    - **出勤**: `handleClockIn`。ユーザーIDが一致し、かつ退勤時刻が空の行を探します。なければ新規作成し、勤務時間列に「勤務中」と記録。
    - **退勤**: `handleClockOut`。ユーザーIDが一致し、退勤時刻が空の**最新の行**を更新します。
    - **課題完了**: `handleTaskComplete`。課題完了シートに追記。

### 3. LINE通知
- **機能**: 出勤・退勤・課題完了時にLINEグループへ通知。
- **設定**: GASの **スクリプトプロパティ** に `LINE_ACCESS_TOKEN` と `LINE_GROUP_ID` を保存済み。
- **コード**: `google-apps-script.js` 内の `sendLineMessage` 関数。

### 4. GitHub Pages
- **URL**: `https://Shimagon.github.io/attendance-app/`
- **設定**: `js/app.js` 内の `appUrl` 定数はこのURLに固定されています。

## 📂 ファイル構成
- `index.html`: メイン画面
- `css/style.css`: スタイルシート（キャッシュ対策で `?v=2` 付与済み）
- `js/app.js`: フロントエンドロジック（30時間制、API呼び出し）
- `google-apps-script.js`: GASコード（**これをGASエディタにコピペしてデプロイ**）
- `tests/`: テスト用ファイル

## ⚠️ 注意点・引き継ぎ事項
1.  **GASのデプロイ**:
    - GAS側のコードを変更したら、必ず「デプロイを管理」→「**新バージョン**」でデプロイしてください。
    - スクリプトプロパティ (`LINE_ACCESS_TOKEN`, `LINE_GROUP_ID`) は設定済みですが、環境が変わる場合は `setupScriptProperties` 関数で再設定が必要です。

2.  **30時間制の扱い**:
    - 日付またぎの計算はフロントエンド (`js/app.js`) で行い、GASには「前日の日付」として送信しています。
    - GAS側では日付の整合性チェックを厳密に行わず、「退勤していない最新の行」を探すロジックにしています（日付ズレによる行重複を防ぐため）。

3.  **LINE通知**:
    - 課題完了報告のURLは `js/app.js` でハードコードされています。ドメイン変更時はここも修正が必要です。

## 🚀 次のアクション（もしあれば）
- 現状は安定稼働しています。
- 追加機能要望があれば、`js/app.js` (UI) と `google-apps-script.js` (Backend) の両方を修正してください。
