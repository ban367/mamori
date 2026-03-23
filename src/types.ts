import type * as vscode from "vscode";

/** uses: 行から解析されたアクション参照 */
export interface ActionReference {
  /** 元の文字列全体（例: "actions/checkout@v4"） */
  raw: string;
  /** リポジトリオーナー */
  owner: string;
  /** リポジトリ名 */
  repo: string;
  /** サブパス（例: owner/repo/path@ref の path 部分） */
  subPath?: string;
  /** バージョン参照（タグ名またはコミットSHA） */
  ref: string;
  /** 参照の種別 */
  refType: RefType;
  /** uses: 行全体の位置 */
  range: vscode.Range;
  /** ref部分のみの位置（置換用） */
  refRange: vscode.Range;
}

/** 参照の種別 */
export type RefType = "tag" | "commit-sha" | "branch" | "unknown";

/** バージョン解決結果 */
export interface ResolvedAction {
  /** 元の参照 */
  reference: ActionReference;
  /** 解決ステータス */
  status: VersionStatus;
  /** 現在のバージョンに対応するタグ名（SHA参照の場合に解決） */
  currentTag?: string;
  /** 現在のタグに対応するSHA（タグ参照の場合） */
  currentSha?: string;
  /** 最新の安定バージョン */
  latestVersion?: string;
  /** 最新バージョンのSHA */
  latestSha?: string;
  /** 利用可能なタグ一覧（QuickPick用） */
  availableTags?: TagInfo[];
  /** エラーメッセージ（解決失敗時） */
  errorMessage?: string;
}

/** バージョンステータス */
export type VersionStatus = "latest" | "updatable" | "deprecated" | "unresolved";

/** タグ情報 */
export interface TagInfo {
  /** タグ名（例: "v4.2.0"） */
  name: string;
  /** タグのコミットSHA */
  sha: string;
  /** リリース日時 */
  date?: string;
  /** メジャーバージョンタグか（例: "v4"） */
  isMajorTag: boolean;
}

/** キャッシュエントリ */
export interface CacheEntry<T> {
  data: T;
  /** キャッシュ作成時刻（epoch ms） */
  cachedAt: number;
  /** TTL（ミリ秒） */
  ttl: number;
}

/** GitHub APIから取得したタグ情報 */
export interface GitHubTag {
  name: string;
  commit: {
    sha: string;
    url: string;
  };
  zipball_url: string;
  tarball_url: string;
  node_id: string;
}

/** GitHub APIから取得したリリース情報 */
export interface GitHubRelease {
  tag_name: string;
  name: string | null;
  prerelease: boolean;
  draft: boolean;
  published_at: string | null;
  html_url: string;
}

/** レート制限情報 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}
