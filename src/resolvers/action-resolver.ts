import type { ActionReference, ResolvedAction, GitHubTag, VersionStatus } from "../types";
import type { GitHubClient } from "../api/github-client";
import type { CacheManager } from "../cache/cache-manager";
import { isMajorVersionTag, parseSemverTag } from "../parsers/action-reference";
import {
  sortAndFilterTags,
  getLatestStableTag,
  getLatestTagInMajor,
  isLatestVersion,
} from "./version-comparator";
import * as vscode from "vscode";

/**
 * アクションのバージョン解決を統合的に行うリゾルバー
 */
export class ActionResolver {
  /** 最新の解決結果（HoverProvider等から参照） */
  private resolvedCache = new Map<string, ResolvedAction>();
  private concurrencyLimit: number;

  constructor(
    private readonly githubClient: GitHubClient,
    private readonly cacheManager: CacheManager,
  ) {
    const config = vscode.workspace.getConfiguration("mamori");
    this.concurrencyLimit = config.get<number>("maxConcurrentRequests", 5);
  }

  /** 複数のActionReferenceを一括で解決する */
  async resolveAll(references: ActionReference[]): Promise<ResolvedAction[]> {
    // 同一リポジトリのタグ取得を重複させないようグループ化
    const repoGroups = new Map<string, ActionReference[]>();
    for (const ref of references) {
      const key = `${ref.owner}/${ref.repo}`;
      const group = repoGroups.get(key) ?? [];
      group.push(ref);
      repoGroups.set(key, group);
    }

    // 並行制限付きでリポジトリごとにタグを取得
    const repoKeys = Array.from(repoGroups.keys());
    const tagsByRepo = new Map<string, GitHubTag[]>();

    for (let i = 0; i < repoKeys.length; i += this.concurrencyLimit) {
      const batch = repoKeys.slice(i, i + this.concurrencyLimit);
      const results = await Promise.all(
        batch.map(async (key) => {
          const [owner, repo] = key.split("/");
          const tags = await this.fetchTags(owner, repo);
          return { key, tags };
        }),
      );
      for (const { key, tags } of results) {
        tagsByRepo.set(key, tags);
      }
    }

    // 各参照を解決
    const resolved: ResolvedAction[] = [];
    for (const ref of references) {
      const key = `${ref.owner}/${ref.repo}`;
      const tags = tagsByRepo.get(key) ?? [];
      const result = this.resolveOne(ref, tags);
      this.resolvedCache.set(this.buildRefKey(ref), result);
      resolved.push(result);
    }

    return resolved;
  }

  /** 単一のActionReferenceを解決する */
  resolveOne(reference: ActionReference, githubTags: GitHubTag[]): ResolvedAction {
    if (githubTags.length === 0) {
      return {
        reference,
        status: "unresolved",
        errorMessage: "タグ情報を取得できませんでした",
      };
    }

    const sortedTags = sortAndFilterTags(githubTags);
    const latestStable = getLatestStableTag(sortedTags);

    const result: ResolvedAction = {
      reference,
      status: "unresolved",
      availableTags: sortedTags,
      latestVersion: latestStable?.name,
      latestSha: latestStable?.sha,
    };

    if (reference.refType === "commit-sha") {
      return this.resolveShaRef(reference, githubTags, sortedTags, latestStable, result);
    }

    if (reference.refType === "tag" || reference.refType === "unknown") {
      return this.resolveTagRef(reference, githubTags, sortedTags, latestStable, result);
    }

    return result;
  }

  /** キャッシュから解決結果を取得する */
  getResolved(reference: ActionReference): ResolvedAction | undefined {
    return this.resolvedCache.get(this.buildRefKey(reference));
  }

  /** SHA参照を解決する */
  private resolveShaRef(
    reference: ActionReference,
    githubTags: GitHubTag[],
    sortedTags: ReturnType<typeof sortAndFilterTags>,
    latestStable: ReturnType<typeof getLatestStableTag>,
    result: ResolvedAction,
  ): ResolvedAction {
    // SHAに対応するタグを検索
    const matchingTag = githubTags.find(
      (t) => t.commit.sha === reference.ref || t.commit.sha.startsWith(reference.ref),
    );

    if (matchingTag) {
      result.currentTag = matchingTag.name;
      result.currentSha = matchingTag.commit.sha;
    }

    if (latestStable) {
      if (reference.ref === latestStable.sha || latestStable.sha.startsWith(reference.ref)) {
        result.status = "latest";
      } else {
        result.status = "updatable";
      }
    } else {
      result.status = matchingTag ? "latest" : "unresolved";
    }

    return result;
  }

  /** タグ参照を解決する */
  private resolveTagRef(
    reference: ActionReference,
    githubTags: GitHubTag[],
    sortedTags: ReturnType<typeof sortAndFilterTags>,
    latestStable: ReturnType<typeof getLatestStableTag>,
    result: ResolvedAction,
  ): ResolvedAction {
    // タグに対応するSHAを検索
    const matchingGhTag = githubTags.find((t) => t.name === reference.ref);
    if (matchingGhTag) {
      result.currentSha = matchingGhTag.commit.sha;
    }

    // メジャーバージョンタグの場合（v4 等）
    if (isMajorVersionTag(reference.ref)) {
      const semver = parseSemverTag(reference.ref);
      if (semver) {
        const latestInMajor = getLatestTagInMajor(sortedTags, semver.major);
        if (latestInMajor && latestStable) {
          const latestSemver = parseSemverTag(latestStable.name);
          if (latestSemver && latestSemver.major > semver.major) {
            result.status = "updatable";
          } else {
            result.status = "latest";
          }
        } else {
          result.status = "latest";
        }
      }
      return result;
    }

    // 通常のsemverタグの場合
    if (latestStable) {
      if (isLatestVersion(reference.ref, latestStable)) {
        result.status = "latest";
      } else {
        result.status = "updatable";
      }
    } else {
      result.status = matchingGhTag ? "latest" : "unresolved";
    }

    return result;
  }

  /** リポジトリのタグをキャッシュ付きで取得する */
  private async fetchTags(owner: string, repo: string): Promise<GitHubTag[]> {
    // キャッシュチェック
    const cached = this.cacheManager.get(owner, repo);
    if (cached) {
      return cached;
    }

    // API呼び出し
    try {
      const tags = await this.githubClient.getTags(owner, repo);
      if (tags.length > 0) {
        this.cacheManager.set(owner, repo, tags);
      }
      return tags;
    } catch {
      // オフライン時はstaleキャッシュを使用
      const stale = this.cacheManager.getStale(owner, repo);
      return stale ?? [];
    }
  }

  private buildRefKey(ref: ActionReference): string {
    return `${ref.owner}/${ref.repo}${ref.subPath ? "/" + ref.subPath : ""}@${ref.ref}`;
  }
}
