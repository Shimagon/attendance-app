# 勤怠管理PWAアプリ

スマートフォンからワンタップで出退勤を打刻し、管理者のLINEグループに自動通知する勤怠管理PWAアプリケーション。

## 主な機能

- 出勤/退勤打刻
- 勤務時間の自動計算とリアルタイム表示
- LINEグループへの自動通知
- Googleスプレッドシートへの記録
- 課題完了報告
- PWA対応（ホーム画面追加可能）
- オフライン対応

## プロジェクト構成

```
kensyu5/
├── index.html              # メインHTML
├── manifest.json           # PWAマニフェスト
├── service-worker.js       # Service Worker
├── css/
│   └── style.css          # スタイルシート
├── js/
│   └── app.js             # メインJavaScript
├── icons/
│   ├── icon.svg           # アイコンSVG
│   ├── icon-192x192.png   # PWAアイコン 192x192
│   ├── icon-512x512.png   # PWAアイコン 512x512
│   └── README.md          # アイコン生成手順
├── generate-icons.html    # アイコン生成ツール
├── SPEC.md               # 仕様書
└── README.md             # このファイル
```

## セットアップ

### 1. アイコン画像の生成

PWAとして動作させるには、アイコン画像が必要です。

**方法1: ブラウザでアイコンを生成（推奨）**
```bash
# generate-icons.htmlをブラウザで開く
open generate-icons.html
```
- ページが開いたら「アイコンを生成」ボタンをクリック
- 各アイコンの下にある「ダウンロード」ボタンをクリック
- ダウンロードしたファイルを `icons/` ディレクトリに配置

**方法2: SVGから手動変換**
詳細は [icons/README.md](icons/README.md) を参照

### 2. 外部API設定（オプション）

アプリは現在、LINE通知とスプレッドシート記録の機能を持っていますが、APIエンドポイントの設定が必要です。

#### LINE Messaging API設定

1. [LINE Developers](https://developers.line.biz/)でチャネルを作成
2. Messaging API設定からチャネルアクセストークンを取得
3. `js/app.js` の `API_CONFIG.LINE_NOTIFY_URL` を設定

```javascript
const API_CONFIG = {
    LINE_NOTIFY_URL: 'YOUR_LINE_API_ENDPOINT',
    SPREADSHEET_URL: ''
};
```

#### Google Apps Script設定

1. Googleスプレッドシートを作成
2. 拡張機能 > Apps Script を開く
3. 以下のようなスクリプトを作成:

```javascript
function doPost(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  const data = JSON.parse(e.postData.contents);

  sheet.appendRow([
    data.date,
    data.userName,
    data.clockInTime,
    data.clockOutTime,
    data.workDuration,
    data.eventType,
    data.timestamp
  ]);

  return ContentService.createTextOutput(JSON.stringify({success: true}))
    .setMimeType(ContentService.MimeType.JSON);
}
```

4. デプロイ > 新しいデプロイ > Webアプリ
5. デプロイURLを `js/app.js` の `API_CONFIG.SPREADSHEET_URL` に設定

### 3. ローカル開発サーバーの起動

PWAはHTTPS環境が必要です。ローカル開発には以下のいずれかを使用:

**Python 3を使用:**
```bash
python3 -m http.server 8000
```

**Node.jsを使用:**
```bash
npx http-server -p 8000
```

**VS Code Live Server拡張機能を使用:**
- [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer)をインストール
- index.htmlを右クリック > "Open with Live Server"

アプセス: http://localhost:8000

### 4. HTTPS環境でのテスト

PWAの完全な機能テストにはHTTPSが必要です。

**方法1: ngrokを使用**
```bash
# ngrokをインストール (https://ngrok.com/)
ngrok http 8000
```

**方法2: GitHub Pagesにデプロイ**
```bash
# Gitリポジトリを初期化
git init
git add .
git commit -m "Initial commit"

# GitHubにプッシュしてPages設定
```

## 使い方

### 初回起動

1. アプリを開く
2. 名前を入力
3. 「始める」ボタンをタップ

### 出勤打刻

1. メイン画面の「出勤」ボタンをタップ
2. 出勤時刻が記録され、勤務時間の計測が開始
3. LINEグループに通知が送信される
4. スプレッドシートに記録される

### 退勤打刻

1. メイン画面の「退勤」ボタンをタップ
2. 勤務時間が自動計算される
3. LINEグループに通知が送信される（勤務時間含む）
4. スプレッドシートに記録される

### 課題完了報告

1. 「課題完了報告」ボタンをタップ
2. 確認ダイアログで「OK」を選択
3. 管理者にアプリURLが通知される

### PWAとしてインストール

**iOS Safari:**
1. Safariでアプリを開く
2. 共有ボタンをタップ
3. 「ホーム画面に追加」を選択

**Android Chrome:**
1. Chromeでアプリを開く
2. メニュー > 「ホーム画面に追加」を選択

## データ保存

すべてのデータはブラウザのlocalStorageに保存されます:

- ユーザー設定
- 本日の打刻状態
- 打刻履歴（直近30日分）
- 未送信キュー（オフライン時）
- 課題完了フラグ

### データのバックアップ

ブラウザのデベロッパーツールから手動でバックアップできます:

```javascript
// コンソールで実行
const backup = {
    userSettings: localStorage.getItem('attendanceApp_userSettings'),
    todayAttendance: localStorage.getItem('attendanceApp_todayAttendance'),
    history: localStorage.getItem('attendanceApp_history'),
    pendingQueue: localStorage.getItem('attendanceApp_pendingQueue'),
    taskCompleted: localStorage.getItem('attendanceApp_taskCompleted')
};
console.log(JSON.stringify(backup, null, 2));
```

## オフライン機能

- オフライン時でも打刻可能
- 未送信データは自動的にキューに保存
- オンライン復帰時に自動送信
- Service Workerによる静的リソースのキャッシュ

## 技術スタック

- **フロントエンド**: HTML5, CSS3, JavaScript (ES6+)
- **PWA**: Service Worker, Web App Manifest
- **データ保存**: localStorage API
- **外部連携**: LINE Messaging API, Google Apps Script

## ブラウザ対応

- iOS Safari 14以降
- Android Chrome 90以降
- その他モダンブラウザ

## セキュリティ

- HTTPS必須
- XSS対策（入力値のサニタイズ）
- APIトークンは環境変数で管理推奨

## トラブルシューティング

### PWAがインストールできない
- HTTPS環境で動作しているか確認
- manifest.jsonとアイコンファイルが正しく配置されているか確認
- Service Workerが正常に登録されているか確認（デベロッパーツール > Application）

### 通知が届かない
- `js/app.js`のAPI_CONFIGが正しく設定されているか確認
- ブラウザのコンソールでエラーを確認
- ネットワーク接続を確認

### データが消えた
- ブラウザのキャッシュをクリアすると全データが削除されます
- 定期的にバックアップを推奨

## ライセンス

MIT License

## 作成者

システム開発チーム

---

**バージョン**: 1.0.0
**更新日**: 2025-11-29
