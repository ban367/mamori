import { describe, expect, it } from "vitest";
import {
  detectRefType,
  isMajorVersionTag,
  parseActionReference,
  parseSemverTag,
} from "../../../src/parsers/action-reference";

describe("parseActionReference", () => {
  it("owner/repo@tag 形式をパースできる", () => {
    const result = parseActionReference("actions/checkout@v4");
    expect(result).toEqual({
      owner: "actions",
      repo: "checkout",
      subPath: undefined,
      ref: "v4",
      refType: "tag",
    });
  });

  it("owner/repo@semver 形式をパースできる", () => {
    const result = parseActionReference("actions/checkout@v4.2.1");
    expect(result).toEqual({
      owner: "actions",
      repo: "checkout",
      subPath: undefined,
      ref: "v4.2.1",
      refType: "tag",
    });
  });

  it("owner/repo@commit-sha 形式をパースできる", () => {
    const result = parseActionReference(
      "actions/checkout@a5ac7e51b41094c92402da3b24376905380afc29",
    );
    expect(result).toEqual({
      owner: "actions",
      repo: "checkout",
      subPath: undefined,
      ref: "a5ac7e51b41094c92402da3b24376905380afc29",
      refType: "commit-sha",
    });
  });

  it("owner/repo/path@ref 形式をパースできる", () => {
    const result = parseActionReference("actions/github-script/checks@v7");
    expect(result).toEqual({
      owner: "actions",
      repo: "github-script",
      subPath: "checks",
      ref: "v7",
      refType: "tag",
    });
  });

  it("ローカルパス参照はnullを返す", () => {
    expect(parseActionReference("./local-action")).toBeNull();
  });

  it("Docker参照はnullを返す", () => {
    expect(parseActionReference("docker://alpine:3.18")).toBeNull();
  });

  it("不正な形式はnullを返す", () => {
    expect(parseActionReference("invalid")).toBeNull();
    expect(parseActionReference("")).toBeNull();
  });

  it("短縮SHAをcommit-shaとして判定する", () => {
    const result = parseActionReference("actions/checkout@abc1234");
    expect(result?.refType).toBe("commit-sha");
  });

  it("ブランチ名はunknownとして判定する", () => {
    const result = parseActionReference("actions/checkout@main");
    expect(result?.refType).toBe("unknown");
  });

  it("深いサブパスをパースできる", () => {
    const result = parseActionReference("owner/repo/path/to/action@v1");
    expect(result).toEqual({
      owner: "owner",
      repo: "repo",
      subPath: "path/to/action",
      ref: "v1",
      refType: "tag",
    });
  });
});

describe("detectRefType", () => {
  it("40文字のSHAをcommit-shaと判定する", () => {
    expect(detectRefType("a5ac7e51b41094c92402da3b24376905380afc29")).toBe("commit-sha");
  });

  it("7文字以上の16進数をcommit-shaと判定する", () => {
    expect(detectRefType("abc1234")).toBe("commit-sha");
  });

  it("6文字以下の16進数はcommit-shaと判定しない", () => {
    // COMMIT_SHA_PATTERN は7文字以上を要求する
    expect(detectRefType("abc123")).not.toBe("commit-sha");
    expect(detectRefType("abc12")).not.toBe("commit-sha");
  });

  it("semverタグをtagと判定する", () => {
    expect(detectRefType("v4")).toBe("tag");
    expect(detectRefType("v4.2")).toBe("tag");
    expect(detectRefType("v4.2.1")).toBe("tag");
    expect(detectRefType("1.0.0")).toBe("tag");
  });

  it("プレリリースタグをtagと判定する", () => {
    expect(detectRefType("v4.0.0-beta.1")).toBe("tag");
  });

  it("ブランチ名をunknownと判定する", () => {
    expect(detectRefType("main")).toBe("unknown");
    expect(detectRefType("develop")).toBe("unknown");
    expect(detectRefType("feature/foo")).toBe("unknown");
  });
});

describe("isMajorVersionTag", () => {
  it("メジャーバージョンタグを正しく判定する", () => {
    expect(isMajorVersionTag("v4")).toBe(true);
    expect(isMajorVersionTag("4")).toBe(true);
    expect(isMajorVersionTag("v12")).toBe(true);
  });

  it("マイナー/パッチ付きタグはfalse", () => {
    expect(isMajorVersionTag("v4.2")).toBe(false);
    expect(isMajorVersionTag("v4.2.1")).toBe(false);
  });
});

describe("parseSemverTag", () => {
  it("完全なsemverをパースできる", () => {
    expect(parseSemverTag("v4.2.1")).toEqual({
      major: 4,
      minor: 2,
      patch: 1,
      prerelease: undefined,
    });
  });

  it("v無しのsemverをパースできる", () => {
    expect(parseSemverTag("1.0.0")).toEqual({
      major: 1,
      minor: 0,
      patch: 0,
      prerelease: undefined,
    });
  });

  it("メジャーのみのタグをパースできる", () => {
    expect(parseSemverTag("v4")).toEqual({
      major: 4,
      minor: 0,
      patch: 0,
      prerelease: undefined,
    });
  });

  it("プレリリース付きをパースできる", () => {
    expect(parseSemverTag("v4.0.0-beta.1")).toEqual({
      major: 4,
      minor: 0,
      patch: 0,
      prerelease: "beta.1",
    });
  });

  it("不正な文字列はnullを返す", () => {
    expect(parseSemverTag("main")).toBeNull();
    expect(parseSemverTag("latest")).toBeNull();
  });
});
