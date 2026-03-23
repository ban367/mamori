# Template

## 言語設定

- すべての応答・コードコメント・エラーメッセージは日本語で記述
- **コミットメッセージは英語**（Conventional Commits形式: `feat:`, `fix:`, `refactor:` 等）
- 技術用語は不自然な日本語訳を避け英語併記可

## プロジェクト概要

<!-- 記入例:
このプロジェクトは〇〇サービスのバックエンド API です。
ユーザー認証・データ管理・通知配信の機能を提供します。
-->

## ディレクトリ構造

- `docs/` - 詳細ドキュメント

<!-- 記入例:
- `src/` - アプリケーションのソースコード
- `tests/` - テストコード
- `docs/` - 詳細ドキュメント
- `scripts/` - ビルド・デプロイスクリプト
-->

## 開発コマンド

<!-- 記入例:
- `make dev` - 開発サーバー起動
- `make test` - テスト実行
- `make lint` - 静的解析
- `make build` - ビルド
-->

## 設計方針

<!-- 記入例:
- シンプルさを優先し、過度な抽象化を避ける
- 外部依存は最小限に留める
- テスタビリティを考慮した設計にする
-->

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
