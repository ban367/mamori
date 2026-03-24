import type { ActionReference, ResolvedAction, GitHubTag } from "../types";
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
 * Orchestrates version resolution for action references.
 */
export class ActionResolver {
  /** Cached resolution results (referenced by HoverProvider, etc.) */
  private resolvedCache = new Map<string, ResolvedAction>();
  private concurrencyLimit: number;

  constructor(
    private readonly githubClient: GitHubClient,
    private readonly cacheManager: CacheManager,
  ) {
    const config = vscode.workspace.getConfiguration("mamori");
    this.concurrencyLimit = config.get<number>("maxConcurrentRequests", 5);
  }

  /** Resolve multiple ActionReferences in batch */
  async resolveAll(references: ActionReference[]): Promise<ResolvedAction[]> {
    // Group by repository to avoid duplicate tag fetches
    const repoGroups = new Map<string, ActionReference[]>();
    for (const ref of references) {
      const key = `${ref.owner}/${ref.repo}`;
      const group = repoGroups.get(key) ?? [];
      group.push(ref);
      repoGroups.set(key, group);
    }

    // Fetch tags per repository with concurrency limit
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

    // Resolve each reference
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

  /** Resolve a single ActionReference */
  resolveOne(reference: ActionReference, githubTags: GitHubTag[]): ResolvedAction {
    if (githubTags.length === 0) {
      return {
        reference,
        status: "unresolved",
        errorMessage: "Failed to retrieve tag information",
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

  /** Get cached resolution result */
  getResolved(reference: ActionReference): ResolvedAction | undefined {
    return this.resolvedCache.get(this.buildRefKey(reference));
  }

  /** Resolve a SHA reference */
  private resolveShaRef(
    reference: ActionReference,
    githubTags: GitHubTag[],
    sortedTags: ReturnType<typeof sortAndFilterTags>,
    latestStable: ReturnType<typeof getLatestStableTag>,
    result: ResolvedAction,
  ): ResolvedAction {
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

  /** Resolve a tag reference */
  private resolveTagRef(
    reference: ActionReference,
    githubTags: GitHubTag[],
    sortedTags: ReturnType<typeof sortAndFilterTags>,
    latestStable: ReturnType<typeof getLatestStableTag>,
    result: ResolvedAction,
  ): ResolvedAction {
    const matchingGhTag = githubTags.find((t) => t.name === reference.ref);
    if (matchingGhTag) {
      result.currentSha = matchingGhTag.commit.sha;
    }

    // Major version tag (e.g. v4)
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

    // Standard semver tag
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

  /** Fetch tags with cache support */
  private async fetchTags(owner: string, repo: string): Promise<GitHubTag[]> {
    const cached = this.cacheManager.get(owner, repo);
    if (cached) {
      return cached;
    }

    try {
      const tags = await this.githubClient.getTags(owner, repo);
      if (tags.length > 0) {
        this.cacheManager.set(owner, repo, tags);
      }
      return tags;
    } catch {
      const stale = this.cacheManager.getStale(owner, repo);
      return stale ?? [];
    }
  }

  private buildRefKey(ref: ActionReference): string {
    return `${ref.owner}/${ref.repo}${ref.subPath ? "/" + ref.subPath : ""}@${ref.ref}`;
  }
}
