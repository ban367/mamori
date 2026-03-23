# template

## Init

### Claude Code 設定

Anthropic 公式のスキルを利用するため、Claude Code にて以下を実行しておく。

```sh
/plugin marketplace add anthropics/skills
```

## リリースフロー

バージョンタグは GitHub Actions で自動生成されます。

1. リリース用ブランチを作成し、変更をコミットする
2. main ブランチへの PR を作成し、**タイトルを `vX.X.X` 形式**（例: `v1.2.3`）にする
3. PR をマージすると、`tag-version.yaml` ワークフローがそのコミットに同名タグを自動付与する

> タイトルが `vX.X.X` 形式でない PR をマージしてもタグは作成されません。

## 詳細ドキュメント

- [Design Doc](docs/design-doc.md) - 設計ドキュメントのエントリポイント
