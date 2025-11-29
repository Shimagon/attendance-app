# 引き継ぎ資料 (HANDOVER)

## プロジェクト概要
勤怠管理アプリ（Google Apps Script + HTML/JS）の開発プロジェクトです。
現在、基本的なAPI機能の実装とテストが完了しています。

## ディレクトリ構成
- `tests/`: テスト用ファイルを格納
    - `test-api.html`: APIの動作確認用ツール
- `google-apps-script.js`: GAS側のバックエンドコード
- `SPEC.md`: 仕様書

### テストAPIツールについて
`tests/test-api.html` をブラウザで開くことで、GASのAPIエンドポイントに対してテストリクエストを送信できます。

#### アクセス方法
ローカルサーバーが起動している場合（`./start-server.sh` 実行中）、以下のURLでアクセスできます：
- [http://localhost:8000/tests/test-api.html](http://localhost:8000/tests/test-api.html)

ファイルとして直接開くことも可能です：
- `tests/test-api.html` をダブルクリック、またはブラウザにドラッグ＆ドロップしてください。

### 修正履歴 (2025/11/29)
- **CORSエラーの修正**:
    - 現象: `test-api.html` からのリクエストで "Failed to fetch" エラーが発生。
    - 原因: ブラウザが `application/json` 送信時にプリフライトリクエスト(OPTIONS)を送信するが、GASがこれに対応していないため。
    - 対応: `Content-Type` を `text/plain` に変更し、プリフライトリクエストが発生しないように修正しました。GAS側は `e.postData.contents` で引き続きJSON文字列を受け取れるため、バックエンドの変更は不要です。

### 次のステップ
- スプレッドシートへの反映確認（APIテストツールで成功することを確認済みであれば、実データがシートに入っているか確認してください）
- フロントエンド（PWA）の実装
