<!-- このファイルは docs/design-doc.md の一部です -->

# 実装方針: 技術スタック・ディレクトリ・規約・テスト

## 6. 実装方針

### 技術スタック

| 層             | 技術           | バージョン | 選定理由                                |
| -------------- | -------------- | ---------- | --------------------------------------- |
| 言語           | TypeScript     | 5.3+       | VS Code拡張の標準言語                   |
| ビルド         | esbuild        | 0.20+      | 高速バンドル、VS Code拡張の推奨バンドラ |
| テスト         | Vitest         | 1.2+       | 高速、TypeScriptネイティブサポート      |
| YAMLパース     | 正規表現       | -          | 位置情報が必要、全体パースは不要        |
| HTTP           | fetch (組込み) | -          | 外部依存を最小化                        |
| パッケージ管理 | npm            | -          | 標準的                                  |

### ディレクトリ構成

```text
src/
├── extension.ts              # エントリポイント（activate/deactivate）
├── types.ts                  # 共有型定義
├── constants.ts              # 定数定義
├── parsers/
│   ├── yaml-parser.ts        # ドキュメントからuses:行を正規表現で抽出
│   └── action-reference.ts   # uses:文字列パース（owner/repo@ref）
├── resolvers/
│   ├── action-resolver.ts    # バージョン解決のオーケストレーション
│   └── version-comparator.ts # semverベースのバージョン比較
├── api/
│   ├── github-client.ts      # GitHub REST APIクライアント
│   └── rate-limiter.ts       # レート制限管理
├── auth/
│   └── auth-manager.ts       # PAT管理（SecretStorage + gh CLI fallback）
├── cache/
│   └── cache-manager.ts      # 二層キャッシュ（メモリ + globalState）
├── ui/
│   ├── decorator.ts          # TextEditorDecorationType管理
│   ├── hover-provider.ts     # ホバー詳細+コマンドリンク
│   ├── codelens-provider.ts  # CodeLens（オプション）
│   └── quick-pick.ts         # バージョン選択QuickPick
└── commands/
    ├── register.ts           # コマンド登録
    ├── change-version.ts     # バージョン変更
    ├── toggle-hash.ts        # SHA⇔タグ変換
    └── refresh.ts            # リフレッシュ・キャッシュクリア
test/
├── unit/
│   ├── parsers/              # パーサーのテスト
│   ├── resolvers/            # リゾルバーのテスト
│   ├── api/                  # APIクライアントのテスト
│   └── cache/                # キャッシュのテスト
├── fixtures/                 # テスト用YAMLファイル
└── __mocks__/
    └── vscode.ts             # vscodeモジュールモック
```

### コーディング規約（機能固有）

- YAMLの解析は正規表現ベースで行い、ASTパーサーは使用しない（位置情報の取得が容易なため）
- GitHub APIのレスポンスはキャッシュし、デバウンス（500ms）で重複リクエストを抑制する
- 認証トークンは `vscode.SecretStorage` で暗号化保存し、ログやエラーメッセージに含めない
- オフライン時はstale-while-revalidateパターンでキャッシュデータを表示する
- 並行APIリクエストは設定値（デフォルト5）で制限する

### テスト方針

| テスト種別     | カバレッジ目標 | ツール                          |
| -------------- | -------------- | ------------------------------- |
| ユニットテスト | 80%以上        | Vitest                          |
| 手動テスト     | 主要フロー     | Extension Development Host (F5) |
