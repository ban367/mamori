import * as vscode from "vscode";
import type { CacheEntry, GitHubTag } from "../types";
import { DEFAULT_CACHE_TTL_MS } from "../constants";

const GLOBAL_STATE_KEY = "mamori.cache";

/**
 * 二層キャッシュマネージャー
 * - メモリキャッシュ: セッション中の高速アクセス
 * - 永続キャッシュ: globalStateによるVS Code再起動後の保持
 */
export class CacheManager {
  private memoryCache = new Map<string, CacheEntry<GitHubTag[]>>();
  private readonly globalState: vscode.Memento;

  constructor(context: vscode.ExtensionContext) {
    this.globalState = context.globalState;
    this.loadFromGlobalState();
  }

  /** キャッシュからタグ一覧を取得する */
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
   * 期限切れでもキャッシュデータを返す（stale-while-revalidateパターン）
   * オフライン時に使用
   */
  getStale(owner: string, repo: string): GitHubTag[] | undefined {
    const key = this.buildKey(owner, repo);
    const entry = this.memoryCache.get(key);
    return entry?.data;
  }

  /** キャッシュにタグ一覧を保存する */
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

  /** 特定のリポジトリのキャッシュを削除する */
  delete(owner: string, repo: string): void {
    const key = this.buildKey(owner, repo);
    this.memoryCache.delete(key);
    this.saveToGlobalState();
  }

  /** 全キャッシュをクリアする */
  clearAll(): void {
    this.memoryCache.clear();
    this.saveToGlobalState();
  }

  /** キャッシュされているリポジトリ数を返す */
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
