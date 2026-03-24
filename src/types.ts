import type * as vscode from "vscode";

/** Parsed action reference from a `uses:` field */
export interface ActionReference {
  /** Original raw string (e.g. "actions/checkout@v4") */
  raw: string;
  /** Repository owner */
  owner: string;
  /** Repository name */
  repo: string;
  /** Sub-path (e.g. the "path" portion in owner/repo/path@ref) */
  subPath?: string;
  /** Version reference (tag name or commit SHA) */
  ref: string;
  /** Reference type */
  refType: RefType;
  /** Range of the entire `uses:` line */
  range: vscode.Range;
  /** Range of only the ref portion (used for replacement) */
  refRange: vscode.Range;
}

/** Reference type */
export type RefType = "tag" | "commit-sha" | "branch" | "unknown";

/** Version resolution result */
export interface ResolvedAction {
  /** Original reference */
  reference: ActionReference;
  /** Resolution status */
  status: VersionStatus;
  /** Tag name corresponding to the current version (resolved when ref is SHA) */
  currentTag?: string;
  /** SHA corresponding to the current tag (resolved when ref is tag) */
  currentSha?: string;
  /** Latest stable version */
  latestVersion?: string;
  /** SHA of the latest version */
  latestSha?: string;
  /** Available tags (for QuickPick) */
  availableTags?: TagInfo[];
  /** Error message (on resolution failure) */
  errorMessage?: string;
}

/** Version status */
export type VersionStatus = "latest" | "updatable" | "deprecated" | "unresolved";

/** Tag information */
export interface TagInfo {
  /** Tag name (e.g. "v4.2.0") */
  name: string;
  /** Commit SHA of the tag */
  sha: string;
  /** Release date */
  date?: string;
  /** Whether this is a major version tag (e.g. "v4") */
  isMajorTag: boolean;
}

/** Cache entry */
export interface CacheEntry<T> {
  data: T;
  /** Cache creation time (epoch ms) */
  cachedAt: number;
  /** TTL (milliseconds) */
  ttl: number;
}

/** Tag information from GitHub API */
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

/** Release information from GitHub API */
export interface GitHubRelease {
  tag_name: string;
  name: string | null;
  prerelease: boolean;
  draft: boolean;
  published_at: string | null;
  html_url: string;
}

/** Rate limit information */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: number;
}
