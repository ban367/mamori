import { describe, expect, it, beforeEach, vi } from "vitest";
import { CacheManager } from "../../../src/cache/cache-manager";
import type { GitHubTag } from "../../../src/types";

function makeMockContext() {
  const store = new Map<string, unknown>();
  return {
    globalState: {
      get: (key: string) => store.get(key),
      update: (key: string, value: unknown) => {
        store.set(key, value);
        return Promise.resolve();
      },
    },
    secrets: {
      get: async () => undefined,
      store: async () => {},
      delete: async () => {},
    },
    subscriptions: [],
  } as any;
}

function makeTag(name: string): GitHubTag {
  return {
    name,
    commit: { sha: `sha-${name}`, url: "" },
    zipball_url: "",
    tarball_url: "",
    node_id: "",
  };
}

describe("CacheManager", () => {
  let cache: CacheManager;

  beforeEach(() => {
    cache = new CacheManager(makeMockContext());
  });

  it("タグを保存し取得できる", () => {
    const tags = [makeTag("v1.0.0"), makeTag("v2.0.0")];
    cache.set("actions", "checkout", tags);
    const result = cache.get("actions", "checkout");
    expect(result).toEqual(tags);
  });

  it("存在しないキーはundefinedを返す", () => {
    expect(cache.get("nonexistent", "repo")).toBeUndefined();
  });

  it("キャッシュを削除できる", () => {
    cache.set("actions", "checkout", [makeTag("v1.0.0")]);
    cache.delete("actions", "checkout");
    expect(cache.get("actions", "checkout")).toBeUndefined();
  });

  it("全キャッシュをクリアできる", () => {
    cache.set("actions", "checkout", [makeTag("v1.0.0")]);
    cache.set("actions", "setup-node", [makeTag("v4.0.0")]);
    cache.clearAll();
    expect(cache.size).toBe(0);
  });

  it("getStaleは期限切れでもデータを返す", () => {
    const tags = [makeTag("v1.0.0")];
    cache.set("actions", "checkout", tags);

    // 強制的に期限切れにする（プライベートプロパティに直接アクセス）
    const memoryCache = (cache as any).memoryCache as Map<string, any>;
    const entry = memoryCache.get("actions/checkout")!;
    entry.cachedAt = Date.now() - entry.ttl - 1;

    // getは期限切れなのでundefined
    expect(cache.get("actions", "checkout")).toBeUndefined();
    // getStaleはデータを返す
    expect(cache.getStale("actions", "checkout")).toEqual(tags);
  });

  it("sizeが正しい値を返す", () => {
    expect(cache.size).toBe(0);
    cache.set("actions", "checkout", [makeTag("v1.0.0")]);
    expect(cache.size).toBe(1);
    cache.set("actions", "setup-node", [makeTag("v4.0.0")]);
    expect(cache.size).toBe(2);
  });
});
