<!-- このファイルは docs/design-doc.md の一部です -->

# 詳細設計: データモデル・API仕様・エラーハンドリング

## 5. 詳細設計

### データモデル

```typescript
/** uses: 行から解析されたアクション参照 */
interface ActionReference {
  raw: string;           // 元の文字列全体（例: "actions/checkout@v4"）
  owner: string;         // リポジトリオーナー
  repo: string;          // リポジトリ名
  subPath?: string;      // サブパス（例: owner/repo/path@ref のpath部分）
  ref: string;           // バージョン参照（タグ名またはコミットSHA）
  refType: RefType;      // 参照の種別
  range: vscode.Range;   // uses: 行全体の位置
  refRange: vscode.Range; // ref部分のみの位置（置換用）
}

type RefType = "tag" | "commit-sha" | "branch" | "unknown";

/** バージョン解決結果 */
interface ResolvedAction {
  reference: ActionReference;
  status: VersionStatus;       // "latest" | "updatable" | "deprecated" | "unresolved"
  currentTag?: string;         // SHA→タグ解決結果
  currentSha?: string;         // タグ→SHA解決結果
  latestVersion?: string;      // 最新の安定バージョン
  latestSha?: string;          // 最新バージョンのSHA
  availableTags?: TagInfo[];   // 利用可能なタグ一覧
  errorMessage?: string;       // エラーメッセージ
}

/** タグ情報 */
interface TagInfo {
  name: string;          // タグ名（例: "v4.2.0"）
  sha: string;           // タグのコミットSHA
  date?: string;         // リリース日時
  isMajorTag: boolean;   // メジャーバージョンタグか
}

/** キャッシュエントリ */
interface CacheEntry<T> {
  data: T;
  cachedAt: number;      // キャッシュ作成時刻（epoch ms）
  ttl: number;           // TTL（ミリ秒）
}
```

### 使用するGitHub API

| メソッド | パス                           | 説明             | 認証 |
| -------- | ------------------------------ | ---------------- | ---- |
| GET      | /repos/{owner}/{repo}/tags     | タグ一覧取得     | 任意 |
| GET      | /repos/{owner}/{repo}/releases | リリース一覧取得 | 任意 |

#### レスポンス例

```json
// GET /repos/actions/checkout/tags
[
  {
    "name": "v4.2.0",
    "commit": {
      "sha": "a5ac7e51b41094c92402da3b24376905380afc29",
      "url": "https://api.github.com/repos/actions/checkout/commits/a5ac..."
    }
  }
]
```

### 処理ロジック

#### バージョン解決フロー

1. **タグ参照の場合** (`refType === "tag"`):
   - タグ一覧からsemver形式のタグを抽出・ソート
   - メジャーバージョンタグ（`v4`等）の場合、メジャー系列内の最新パッチと比較
   - 通常のsemverタグの場合、最新安定版と直接比較
   - 対応するコミットSHAも取得

2. **コミットSHA参照の場合** (`refType === "commit-sha"`):
   - タグ一覧の各タグのSHAと照合
   - 一致するタグがあれば `currentTag` に設定
   - 最新安定版のSHAと比較してステータスを判定

#### 認証の優先順位

1. VS Code SecretStorage に保存されたPAT
2. `gh auth token` コマンドの出力（GitHub CLI連携）
3. 環境変数 `GITHUB_TOKEN`
4. 認証なし（レート制限60回/時間）

### エラーハンドリング

| 状況                   | 対処                                               |
| ---------------------- | -------------------------------------------------- |
| API 404応答            | リポジトリ不在として `unresolved` ステータスを設定 |
| APIレート制限超過      | 警告メッセージ表示、リクエストを一時停止           |
| ネットワークエラー     | staleキャッシュを使用、オフラインモード表示        |
| 不正なuses形式         | パーサーがnullを返し、対象から除外                 |
| タグのsemverパース失敗 | sortAndFilterTagsで自動除外                        |
