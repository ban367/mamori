# Mamori - GitHub Actions Version Manager

GitHub Actions ワークフローファイル内の `uses:` 行に、各アクションのバージョン情報をインライン表示する VS Code 拡張機能です。

## 機能

- **バージョンステータスのインライン表示** — `uses:` 行の横に最新バージョンかどうかを表示（✓ = 最新、⬆ = 更新可能）
- **ダブルクリックでバージョン切り替え** — バージョン部分をダブルクリックすると QuickPick が開き、バージョンを選択できます
- **タグ名 / コミット SHA の選択** — バージョン選択時にタグ名とコミット SHA のどちらで置換するかを選べます
- **SHA ⇔ タグの相互変換** — コマンドパレットからワンクリックで変換
- **ホバーで詳細表示** — 現在のバージョン、最新バージョン、SHA などの詳細情報を表示
- **CodeLens 表示**（オプション）— `uses:` 行の上にバージョン情報を表示
- **オフライン対応** — キャッシュ済みデータを利用して、オフライン時もバージョン情報を表示

## スクリーンショット

<!-- TODO: スクリーンショットを追加 -->

## インストール

### VS Code Marketplace から

1. VS Code の拡張機能パネルを開く（`Ctrl+Shift+X` / `Cmd+Shift+X`）
2. `Mamori` を検索
3. 「インストール」をクリック

### VSIX ファイルから

```sh
npx @vscode/vsce package
code --install-extension mamori-*.vsix
```

## 使い方

1. `.github/workflows/*.yml` または `action.yml` / `action.yaml` を開く
2. `uses:` 行の横にバージョンステータスが自動表示されます
3. バージョン部分をダブルクリックすると、バージョン切り替え QuickPick が開きます
4. コマンドパレット（`Ctrl+Shift+P` / `Cmd+Shift+P`）から以下のコマンドも利用可能です:
   - **Mamori: Change Version** — バージョンを変更
   - **Mamori: Toggle SHA/Tag** — SHA とタグ名を相互変換
   - **Mamori: Refresh Version Info** — バージョン情報を再取得
   - **Mamori: Clear Cache** — キャッシュをクリア
   - **Mamori: Set GitHub Token** — GitHub トークンを設定

## 設定

| 設定項目                       | 型      | デフォルト | 説明                                 |
| ------------------------------ | ------- | ---------- | ------------------------------------ |
| `mamori.cacheTtlMinutes`       | number  | `60`       | キャッシュの有効期間（分）           |
| `mamori.enableCodeLens`        | boolean | `false`    | CodeLens 表示を有効にする            |
| `mamori.enableDecorations`     | boolean | `true`     | インラインバージョン装飾を有効にする |
| `mamori.showMajorVersionOnly`  | boolean | `false`    | メジャーバージョンタグのみ表示       |
| `mamori.maxConcurrentRequests` | number  | `5`        | 同時 API リクエストの最大数          |

## GitHub 認証

GitHub API のレート制限を緩和するため、認証トークンの設定を推奨します。以下の優先順位で認証情報を検索します:

1. **VS Code SecretStorage** — コマンドパレットから `Mamori: Set GitHub Token` で設定
2. **GitHub CLI** — `gh auth token` コマンドの出力
3. **環境変数** — `GITHUB_TOKEN`
4. **未認証** — レート制限あり（60リクエスト/時間）

## 開発

```sh
# 依存パッケージのインストール
npm install

# ビルド
npm run build

# ウォッチモード
npm run watch

# テスト
npm test

# パッケージ作成
npm run package
```

## ライセンス

[MIT](LICENSE)

## コントリビューション

Issue や Pull Request を歓迎します。バグ報告・機能リクエスト・改善提案など、お気軽にどうぞ。

## 詳細ドキュメント

- [Design Doc](docs/design-doc.md) — 設計ドキュメントのエントリポイント
- [Changelog](CHANGELOG.md) — 変更履歴
