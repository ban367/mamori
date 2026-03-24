# Changelog

## [0.1.0] - 2026-03-24

### Added

- GitHub Actions ワークフローファイル内の `uses:` 行にバージョンステータスをインライン表示
- バージョン部分のダブルクリックによるバージョン切り替え（QuickPick）
- タグ名 / コミットSHA の2段階選択による置換形式の選択
- SHA⇔タグの相互変換コマンド
- GitHub API によるタグ・リリース情報の取得
- メモリ + 永続（globalState）の二層キャッシュ
- GitHub認証（SecretStorage PAT / gh CLI / GITHUB_TOKEN 環境変数）
- ホバーによるバージョン詳細表示
- CodeLens 表示（オプション）
- レート制限の監視と警告
- オフライン時の stale-while-revalidate キャッシュ対応
