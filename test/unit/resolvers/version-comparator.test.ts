import { describe, expect, it } from "vitest";
import {
  compareSemver,
  getLatestStableTag,
  getLatestTagInMajor,
  isLatestVersion,
  sortAndFilterTags,
} from "../../../src/resolvers/version-comparator";
import type { GitHubTag, TagInfo } from "../../../src/types";

function makeGhTag(name: string, sha = "abc123"): GitHubTag {
  return {
    name,
    commit: { sha, url: "" },
    zipball_url: "",
    tarball_url: "",
    node_id: "",
  };
}

describe("compareSemver", () => {
  it("メジャーバージョンの大小を比較する", () => {
    expect(compareSemver("v2.0.0", "v1.0.0")).toBeGreaterThan(0);
    expect(compareSemver("v1.0.0", "v2.0.0")).toBeLessThan(0);
  });

  it("マイナーバージョンの大小を比較する", () => {
    expect(compareSemver("v1.2.0", "v1.1.0")).toBeGreaterThan(0);
  });

  it("パッチバージョンの大小を比較する", () => {
    expect(compareSemver("v1.0.2", "v1.0.1")).toBeGreaterThan(0);
  });

  it("同一バージョンは0を返す", () => {
    expect(compareSemver("v1.0.0", "v1.0.0")).toBe(0);
  });

  it("安定版がプレリリースより優先される", () => {
    expect(compareSemver("v1.0.0", "v1.0.0-beta.1")).toBeGreaterThan(0);
  });

  it("v無しのバージョンも比較できる", () => {
    expect(compareSemver("2.0.0", "1.0.0")).toBeGreaterThan(0);
  });
});

describe("sortAndFilterTags", () => {
  it("semverタグを降順でソートする", () => {
    const tags = [makeGhTag("v1.0.0"), makeGhTag("v3.0.0"), makeGhTag("v2.0.0")];
    const sorted = sortAndFilterTags(tags);
    expect(sorted.map((t) => t.name)).toEqual(["v3.0.0", "v2.0.0", "v1.0.0"]);
  });

  it("非semverタグを除外する", () => {
    const tags = [makeGhTag("v1.0.0"), makeGhTag("latest"), makeGhTag("nightly")];
    const sorted = sortAndFilterTags(tags);
    expect(sorted).toHaveLength(1);
    expect(sorted[0].name).toBe("v1.0.0");
  });

  it("メジャーバージョンタグを含む", () => {
    const tags = [makeGhTag("v4"), makeGhTag("v3.1.0"), makeGhTag("v3")];
    const sorted = sortAndFilterTags(tags);
    expect(sorted.some((t) => t.name === "v4")).toBe(true);
    expect(sorted.find((t) => t.name === "v4")?.isMajorTag).toBe(true);
  });
});

describe("getLatestStableTag", () => {
  it("最新の安定版を返す（プレリリース除外）", () => {
    const tags: TagInfo[] = [
      { name: "v3.0.0-beta.1", sha: "b1", isMajorTag: false },
      { name: "v2.1.0", sha: "a1", isMajorTag: false },
      { name: "v2.0.0", sha: "a2", isMajorTag: false },
    ];
    const latest = getLatestStableTag(tags);
    expect(latest?.name).toBe("v2.1.0");
  });

  it("メジャーバージョンタグを除外する", () => {
    const tags: TagInfo[] = [
      { name: "v4", sha: "a1", isMajorTag: true },
      { name: "v3.2.0", sha: "a2", isMajorTag: false },
    ];
    const latest = getLatestStableTag(tags);
    expect(latest?.name).toBe("v3.2.0");
  });

  it("タグがない場合はundefinedを返す", () => {
    expect(getLatestStableTag([])).toBeUndefined();
  });
});

describe("getLatestTagInMajor", () => {
  it("指定メジャーバージョン内の最新を返す", () => {
    const tags: TagInfo[] = [
      { name: "v4.1.0", sha: "a1", isMajorTag: false },
      { name: "v4.0.0", sha: "a2", isMajorTag: false },
      { name: "v3.5.0", sha: "a3", isMajorTag: false },
    ];
    const latest = getLatestTagInMajor(tags, 4);
    expect(latest?.name).toBe("v4.1.0");
  });

  it("指定メジャーバージョンのタグがない場合はundefinedを返す", () => {
    const tags: TagInfo[] = [{ name: "v3.0.0", sha: "a1", isMajorTag: false }];
    expect(getLatestTagInMajor(tags, 4)).toBeUndefined();
  });
});

describe("isLatestVersion", () => {
  it("最新タグ名と一致する場合はtrue", () => {
    const latest: TagInfo = { name: "v4.2.0", sha: "abc", isMajorTag: false };
    expect(isLatestVersion("v4.2.0", latest)).toBe(true);
  });

  it("最新タグのSHAと一致する場合はtrue", () => {
    const latest: TagInfo = { name: "v4.2.0", sha: "abc", isMajorTag: false };
    expect(isLatestVersion("abc", latest)).toBe(true);
  });

  it("一致しない場合はfalse", () => {
    const latest: TagInfo = { name: "v4.2.0", sha: "abc", isMajorTag: false };
    expect(isLatestVersion("v4.1.0", latest)).toBe(false);
  });

  it("latestTagがundefinedの場合はfalse", () => {
    expect(isLatestVersion("v4.2.0", undefined)).toBe(false);
  });
});
