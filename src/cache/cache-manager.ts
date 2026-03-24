import * as vscode from "vscode";
import type { CacheEntry, GitHubTag } from "../types";

const GLOBAL_STATE_KEY = "mamori.cache";

/**
 * Two-layer cache manager.
 * - Memory cache: fast access during session
 * - Persistent cache: survives VS Code restarts via globalState
 */
export class CacheManager {
  private memoryCache = new Map<string, CacheEntry<GitHubTag[]>>();
  private readonly globalState: vscode.Memento;

  constructor(context: vscode.ExtensionContext) {
    this.globalState = context.globalState;
    this.loadFromGlobalState();
  }

  /** Get tags from cache */
  get(owner: string, repo: string): GitHubTag[] | undefined {
    const key = this.buildKey(owner, repo);
    const entry = this.memoryCache.get(key);

    if (!entry) {
      return undefined;
    }

    if (this.isExpired(entry)) {
      return undefined;
    }

    return entry.data;
  }

  /**
   * Get cached data even if expired (stale-while-revalidate pattern).
   * Used when offline.
   */
  getStale(owner: string, repo: string): GitHubTag[] | undefined {
    const key = this.buildKey(owner, repo);
    const entry = this.memoryCache.get(key);
    return entry?.data;
  }

  /** Store tags in cache */
  set(owner: string, repo: string, tags: GitHubTag[]): void {
    const key = this.buildKey(owner, repo);
    const ttl = this.getTtl();
    const entry: CacheEntry<GitHubTag[]> = {
      data: tags,
      cachedAt: Date.now(),
      ttl,
    };

    this.memoryCache.set(key, entry);
    this.saveToGlobalState();
  }

  /** Delete cache for a specific repository */
  delete(owner: string, repo: string): void {
    const key = this.buildKey(owner, repo);
    this.memoryCache.delete(key);
    this.saveToGlobalState();
  }

  /** Clear all caches */
  clearAll(): void {
    this.memoryCache.clear();
    this.saveToGlobalState();
  }

  /** Number of cached repositories */
  get size(): number {
    return this.memoryCache.size;
  }

  private buildKey(owner: string, repo: string): string {
    return `${owner}/${repo}`;
  }

  private isExpired(entry: CacheEntry<GitHubTag[]>): boolean {
    return Date.now() - entry.cachedAt > entry.ttl;
  }

  private getTtl(): number {
    const config = vscode.workspace.getConfiguration("mamori");
    const minutes = config.get<number>("cacheTtlMinutes", 60);
    return minutes * 60 * 1000;
  }

  private loadFromGlobalState(): void {
    const stored = this.globalState.get<Record<string, CacheEntry<GitHubTag[]>>>(GLOBAL_STATE_KEY);
    if (stored) {
      this.memoryCache = new Map(Object.entries(stored));
    }
  }

  private saveToGlobalState(): void {
    const obj = Object.fromEntries(this.memoryCache.entries());
    this.globalState.update(GLOBAL_STATE_KEY, obj);
  }
}
