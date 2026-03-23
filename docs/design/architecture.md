<!-- このファイルは docs/design-doc.md の一部です -->

# 設計概要: アーキテクチャ・データフロー

## 4. 設計概要

### アーキテクチャ図

```mermaid
graph TD
    A[VS Code Extension Host] --> B[extension.ts<br/>エントリポイント]
    B --> C[YamlParser<br/>uses:行抽出]
    B --> D[Decorator<br/>行末装飾]
    B --> E[HoverProvider<br/>ホバー詳細]
    B --> F[CodeLensProvider<br/>オプション]
    B --> G[Commands<br/>コマンド群]

    C --> H[ActionResolver<br/>バージョン解決]
    H --> I[GitHubClient<br/>REST API]
    H --> J[CacheManager<br/>二層キャッシュ]
    I --> K[AuthManager<br/>認証管理]
    I --> L[RateLimiter<br/>レート制限]

    D --> H
    E --> H
    G --> H
```

### データフロー

```mermaid
sequenceDiagram
    participant Editor as エディタ
    participant Parser as YamlParser
    participant Resolver as ActionResolver
    participant Cache as CacheManager
    participant API as GitHubClient
    participant Decorator as Decorator

    Editor->>Parser: ファイルオープン/変更（debounce 500ms）
    Parser->>Parser: 正規表現でuses:行を抽出
    Parser-->>Resolver: ActionReference[]

    loop 各リポジトリ
        Resolver->>Cache: キャッシュチェック
        alt キャッシュヒット
            Cache-->>Resolver: GitHubTag[]
        else キャッシュミス
            Resolver->>API: GET /repos/{owner}/{repo}/tags
            API-->>Resolver: GitHubTag[]
            Resolver->>Cache: キャッシュ保存
        end
    end

    Resolver->>Resolver: semver比較・ステータス判定
    Resolver-->>Decorator: ResolvedAction[]
    Decorator->>Editor: 行末装飾を適用
```

### 主要コンポーネント

| コンポーネント     | 役割                                         | 技術                        |
| ------------------ | -------------------------------------------- | --------------------------- |
| YamlParser         | ドキュメントからuses:行を正規表現で抽出      | RegExp                      |
| ActionResolver     | バージョン解決のオーケストレーション          | TypeScript                  |
| GitHubClient       | GitHub REST APIによるタグ/リリース情報取得   | fetch API                   |
| CacheManager       | メモリ+永続の二層キャッシュ管理              | Map + globalState           |
| AuthManager        | GitHub認証トークンの優先順位付き管理          | SecretStorage + gh CLI      |
| Decorator          | TextEditorDecorationTypeによる行末装飾        | VS Code API                 |
| HoverProvider      | ホバー時の詳細表示とコマンドリンク            | VS Code API                 |
| CodeLensProvider   | 行上のバージョン変更リンク（オプション）      | VS Code API                 |
