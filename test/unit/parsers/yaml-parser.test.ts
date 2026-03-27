import { describe, expect, it } from "vitest";
import { parseDocument, isTargetDocument } from "../../../src/parsers/yaml-parser";

/** テスト用の簡易TextDocumentモック */
function createMockDocument(text: string, filePath = "/.github/workflows/ci.yml") {
  const lines = text.split(/\r?\n/);
  return {
    getText: () => text,
    uri: { fsPath: filePath },
    languageId: "yaml",
    positionAt: (offset: number) => {
      let remaining = offset;
      for (let i = 0; i < lines.length; i++) {
        if (remaining <= lines[i].length) {
          return { line: i, character: remaining };
        }
        remaining -= lines[i].length + 1; // +1 for newline
      }
      return { line: lines.length - 1, character: 0 };
    },
    lineCount: lines.length,
    lineAt: (line: number) => ({ text: lines[line] ?? "" }),
  } as any;
}

describe("parseDocument", () => {
  it("単一のuses行をパースできる", () => {
    const doc = createMockDocument(`
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
`);
    const refs = parseDocument(doc);
    expect(refs).toHaveLength(1);
    expect(refs[0].owner).toBe("actions");
    expect(refs[0].repo).toBe("checkout");
    expect(refs[0].ref).toBe("v4");
    expect(refs[0].refType).toBe("tag");
  });

  it("複数のuses行をパースできる", () => {
    const doc = createMockDocument(`
jobs:
  build:
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
      - uses: actions/cache@v3
`);
    const refs = parseDocument(doc);
    expect(refs).toHaveLength(3);
    expect(refs[0].repo).toBe("checkout");
    expect(refs[1].repo).toBe("setup-node");
    expect(refs[2].repo).toBe("cache");
  });

  it("SHA参照を正しく解析する", () => {
    const doc = createMockDocument(`
    steps:
      - uses: actions/checkout@a5ac7e51b41094c92402da3b24376905380afc29
`);
    const refs = parseDocument(doc);
    expect(refs).toHaveLength(1);
    expect(refs[0].refType).toBe("commit-sha");
    expect(refs[0].ref).toBe("a5ac7e51b41094c92402da3b24376905380afc29");
  });

  it("ローカルパスとDocker参照を除外する", () => {
    const doc = createMockDocument(`
    steps:
      - uses: ./local-action
      - uses: docker://alpine:3.18
      - uses: actions/checkout@v4
`);
    const refs = parseDocument(doc);
    expect(refs).toHaveLength(1);
    expect(refs[0].repo).toBe("checkout");
  });

  it("クォート付きのuses値をパースできる", () => {
    const doc = createMockDocument(`
    steps:
      - uses: 'actions/checkout@v4'
      - uses: "actions/setup-node@v3"
`);
    const refs = parseDocument(doc);
    expect(refs).toHaveLength(2);
    expect(refs[0].ref).toBe("v4");
    expect(refs[1].ref).toBe("v3");
  });

  it("コメント付きの行を正しく処理する", () => {
    const doc = createMockDocument(`
    steps:
      - uses: actions/checkout@v4 # ソースを取得
`);
    const refs = parseDocument(doc);
    expect(refs).toHaveLength(1);
    expect(refs[0].ref).toBe("v4");
  });

  it("空のドキュメントで空配列を返す", () => {
    const doc = createMockDocument("");
    const refs = parseDocument(doc);
    expect(refs).toHaveLength(0);
  });

  it("uses行がないドキュメントで空配列を返す", () => {
    const doc = createMockDocument(`
name: CI
on: push
jobs:
  build:
    runs-on: ubuntu-latest
`);
    const refs = parseDocument(doc);
    expect(refs).toHaveLength(0);
  });

  it("サブパス付きアクションをパースできる", () => {
    const doc = createMockDocument(`
    steps:
      - uses: actions/github-script/checks@v7
`);
    const refs = parseDocument(doc);
    expect(refs).toHaveLength(1);
    expect(refs[0].subPath).toBe("checks");
  });

  it("refRangeが正しい位置を指す", () => {
    const doc = createMockDocument("      - uses: actions/checkout@v4");
    const refs = parseDocument(doc);
    expect(refs).toHaveLength(1);
    // "      - uses: actions/checkout@" の長さ = 31, "v4" の末尾 = 33
    expect(refs[0].refRange.start.character).toBe(31);
    expect(refs[0].refRange.end.character).toBe(33);
  });

  it("空行を挟む連続uses行で正しい行番号が返される", () => {
    const doc = createMockDocument(
      "jobs:\n" +
        "  build:\n" +
        "    steps:\n" +
        "      - uses: actions/checkout@v4\n" +
        "\n" +
        "      - uses: actions/setup-node@v4",
    );
    const refs = parseDocument(doc);
    expect(refs).toHaveLength(2);
    expect(refs[0].range.start.line).toBe(3);
    expect(refs[0].repo).toBe("checkout");
    expect(refs[1].range.start.line).toBe(5);
    expect(refs[1].repo).toBe("setup-node");
  });

  it("空行なしの連続uses行で正しい行番号が返される", () => {
    const doc = createMockDocument(
      "    steps:\n" +
        "      - uses: actions/checkout@v4\n" +
        "      - uses: actions/setup-node@v4",
    );
    const refs = parseDocument(doc);
    expect(refs).toHaveLength(2);
    expect(refs[0].range.start.line).toBe(1);
    expect(refs[1].range.start.line).toBe(2);
  });

  it("複数の空行を挟むuses行で正しい行番号が返される", () => {
    const doc = createMockDocument(
      "    steps:\n" +
        "      - uses: actions/checkout@v4\n" +
        "\n" +
        "\n" +
        "      - uses: actions/setup-node@v4",
    );
    const refs = parseDocument(doc);
    expect(refs).toHaveLength(2);
    expect(refs[0].range.start.line).toBe(1);
    expect(refs[1].range.start.line).toBe(4);
  });

  it("CRLF改行コードでも正しくパースできる", () => {
    const doc = createMockDocument(
      "jobs:\r\n" +
        "  build:\r\n" +
        "    steps:\r\n" +
        "      - uses: actions/checkout@v4\r\n" +
        "\r\n" +
        "      - uses: actions/setup-node@v4",
    );
    const refs = parseDocument(doc);
    expect(refs).toHaveLength(2);
    expect(refs[0].range.start.line).toBe(3);
    expect(refs[0].repo).toBe("checkout");
    expect(refs[0].ref).toBe("v4");
    expect(refs[1].range.start.line).toBe(5);
    expect(refs[1].repo).toBe("setup-node");
  });
});

describe("isTargetDocument", () => {
  it("ワークフローファイルを対象と判定する", () => {
    const doc = createMockDocument("", "/project/.github/workflows/ci.yml");
    expect(isTargetDocument(doc)).toBe(true);
  });

  it(".yaml拡張子も対象と判定する", () => {
    const doc = createMockDocument("", "/project/.github/workflows/deploy.yaml");
    expect(isTargetDocument(doc)).toBe(true);
  });

  it("action.ymlを対象と判定する", () => {
    const doc = createMockDocument("", "/project/action.yml");
    expect(isTargetDocument(doc)).toBe(true);
  });

  it("action.yamlを対象と判定する", () => {
    const doc = createMockDocument("", "/project/action.yaml");
    expect(isTargetDocument(doc)).toBe(true);
  });

  it("関係ないYAMLファイルは対象外", () => {
    const doc = createMockDocument("", "/project/config.yml");
    expect(isTargetDocument(doc)).toBe(false);
  });

  it("docker-compose.ymlは対象外", () => {
    const doc = createMockDocument("", "/project/docker-compose.yml");
    expect(isTargetDocument(doc)).toBe(false);
  });
});
