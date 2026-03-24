# Mamori - GitHub Actions Version Manager

## 言語設定

- すべての応答・コードコメント・エラーメッセージは日本語で記述
- **コミットメッセージは英語**（Conventional Commits形式: `feat:`, `fix:`, `refactor:` 等）
- 技術用語は不自然な日本語訳を避け英語併記可

## プロジェクト概要

GitHub Actionsワークフローファイル内のアクションバージョンをインライン表示・管理するVS Code拡張機能。
行末装飾でバージョンステータスを表示し、QuickPickによるバージョン切り替えやSHA⇔タグ変換を提供する。

## ディレクトリ構造

- `src/` - 拡張機能のソースコード（TypeScript）
- `src/parsers/` - YAML解析・アクション参照パーサー
- `src/resolvers/` - バージョン解決・semver比較
- `src/api/` - GitHub REST APIクライアント
- `src/auth/` - 認証トークン管理
- `src/cache/` - 二層キャッシュ（メモリ+永続）
- `src/ui/` - 装飾・ホバー・CodeLens・QuickPick
- `src/commands/` - コマンド登録・実行
- `test/` - テストコード
- `docs/` - 設計ドキュメント

## 開発コマンド

- `npm run build` - プロダクションビルド（esbuild）
- `npm run watch` - 監視モードビルド
- `npm test` - テスト実行（Vitest）
- `npm run test:watch` - テスト監視モード
- `npx tsc --noEmit` - 型チェック
- F5 - Extension Development Host起動（VS Code内）

## 設計方針

- 外部依存を最小限に留める（YAMLパースは正規表現、HTTPは組み込みfetch）
- セキュリティを優先（トークンはSecretStorage、ログに含めない）
- オフライン耐性（stale-while-revalidateキャッシュ）
- パフォーマンス（デバウンス、並行制限、差分更新）

## 詳細ドキュメント

<!-- 記入例:
- [API 仕様](docs/api.md)
- [データモデル](docs/data-model.md)
- [デプロイ手順](docs/deployment.md)
-->

## 設計ドキュメント

- エントリポイントは `docs/design-doc.md`（ドキュメント構成表あり）
- 実装タスクでは以下を優先参照する:
  - `docs/design/detailed-design.md` - データモデル・API仕様
  - `docs/design/implementation.md` - ファイル配置・コーディング規約
- アーキテクチャ全体の確認が必要な場合は `docs/design/architecture.md` を参照する
- 機能の背景・スコープを確認する場合のみ `docs/design/overview.md` を参照する
- 設計の意図・判断・制約が変わった場合は、実装と同時に該当ドキュメントを更新する:
  - データモデル・APIの変更 → `docs/design/detailed-design.md`
  - ディレクトリ構成・技術スタック・規約の変更 → `docs/design/implementation.md`
  - コンポーネント構成・データフローの変更 → `docs/design/architecture.md`
  - 採用しなかった代替案・トレードオフ → `docs/design/decisions.md`
- ドキュメントと実装の乖離を発見した場合は、ドキュメントを実態に合わせて修正する
