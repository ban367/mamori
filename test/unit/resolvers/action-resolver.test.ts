import { describe, expect, it, vi } from "vitest";
import { ActionResolver } from "../../../src/resolvers/action-resolver";
import type { ActionReference, GitHubTag } from "../../../src/types";
import { Position, Range } from "../../__mocks__/vscode";

function makeGhTag(name: string, sha: string): GitHubTag {
  return {
    name,
    commit: { sha, url: "" },
    zipball_url: "",
    tarball_url: "",
    node_id: "",
  };
}

function makeRef(overrides: Partial<ActionReference> = {}): ActionReference {
  return {
    raw: "actions/checkout@v4",
    owner: "actions",
    repo: "checkout",
    ref: "v4",
    refType: "tag",
    range: new Range(new Position(0, 0), new Position(0, 30)),
    refRange: new Range(new Position(0, 25), new Position(0, 30)),
    ...overrides,
  } as ActionReference;
}

const sampleTags: GitHubTag[] = [
  makeGhTag("v4", "sha-v4"),
  makeGhTag("v4.2.0", "sha-v4.2.0"),
  makeGhTag("v4.1.0", "sha-v4.1.0"),
  makeGhTag("v4.0.0", "sha-v4.0.0"),
  makeGhTag("v3.6.0", "sha-v3.6.0"),
  makeGhTag("v3", "sha-v3"),
];

describe("ActionResolver.resolveOne", () => {
  const mockClient = {
    getTags: vi.fn().mockResolvedValue(sampleTags),
    getReleases: vi.fn().mockResolvedValue([]),
    findTagBySha: vi.fn(),
    getRateLimiter: vi.fn(),
  };
  const mockCache = {
    get: vi.fn().mockReturnValue(undefined),
    getStale: vi.fn().mockReturnValue(undefined),
    set: vi.fn(),
    delete: vi.fn(),
    clearAll: vi.fn(),
    size: 0,
  };
  const resolver = new ActionResolver(mockClient as any, mockCache as any);

  it("最新タグ参照をlatestと判定する", () => {
    const ref = makeRef({ ref: "v4.2.0", refType: "tag" });
    const result = resolver.resolveOne(ref, sampleTags);
    expect(result.status).toBe("latest");
    expect(result.currentSha).toBe("sha-v4.2.0");
  });

  it("古いタグ参照をupdatableと判定する", () => {
    const ref = makeRef({ ref: "v4.1.0", refType: "tag" });
    const result = resolver.resolveOne(ref, sampleTags);
    expect(result.status).toBe("updatable");
    expect(result.latestVersion).toBe("v4.2.0");
  });

  it("メジャーバージョンタグ（最新メジャー）をlatestと判定する", () => {
    const ref = makeRef({ ref: "v4", refType: "tag" });
    const result = resolver.resolveOne(ref, sampleTags);
    expect(result.status).toBe("latest");
  });

  it("古いメジャーバージョンタグをupdatableと判定する", () => {
    const ref = makeRef({ ref: "v3", refType: "tag" });
    const result = resolver.resolveOne(ref, sampleTags);
    expect(result.status).toBe("updatable");
  });

  it("SHA参照で対応タグを解決する", () => {
    const ref = makeRef({ ref: "sha-v4.1.0", refType: "commit-sha" });
    const result = resolver.resolveOne(ref, sampleTags);
    expect(result.currentTag).toBe("v4.1.0");
    expect(result.status).toBe("updatable");
  });

  it("最新SHAをlatestと判定する", () => {
    const ref = makeRef({ ref: "sha-v4.2.0", refType: "commit-sha" });
    const result = resolver.resolveOne(ref, sampleTags);
    expect(result.status).toBe("latest");
  });

  it("タグなしの場合はunresolvedを返す", () => {
    const ref = makeRef({ ref: "v4.2.0", refType: "tag" });
    const result = resolver.resolveOne(ref, []);
    expect(result.status).toBe("unresolved");
  });

  it("availableTagsを含む", () => {
    const ref = makeRef({ ref: "v4.2.0", refType: "tag" });
    const result = resolver.resolveOne(ref, sampleTags);
    expect(result.availableTags).toBeDefined();
    expect(result.availableTags!.length).toBeGreaterThan(0);
  });
});
