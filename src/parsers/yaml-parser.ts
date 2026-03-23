import * as vscode from "vscode";
import { USES_LINE_PATTERN } from "../constants";
import type { ActionReference } from "../types";
import { parseActionReference } from "./action-reference";

/**
 * ドキュメントのテキストから uses: 行を解析し、ActionReference の配列を返す
 */
export function parseDocument(document: vscode.TextDocument): ActionReference[] {
  const text = document.getText();
  const references: ActionReference[] = [];

  // 正規表現のlastIndexをリセットするために新しいインスタンスを使用
  const pattern = new RegExp(USES_LINE_PATTERN.source, USES_LINE_PATTERN.flags);
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const raw = match[3]; // キャプチャグループ3がアクション参照文字列
    const parsed = parseActionReference(raw);
    if (!parsed) {
      continue;
    }

    // 行位置の計算
    const lineIndex = text.substring(0, match.index).split("\n").length - 1;
    const prefix = match[1]; // "  uses: " 等のプレフィックス部分
    const quote = match[2]; // クォート文字（空文字、'、"）

    // uses: 行全体のRange
    const lineStart = new vscode.Position(lineIndex, 0);
    const lineEnd = new vscode.Position(lineIndex, match[0].length);
    const range = new vscode.Range(lineStart, lineEnd);

    // ref部分のRange（@以降）
    const refStartCol = prefix.length + quote.length + raw.indexOf("@") + 1;
    const refEndCol = prefix.length + quote.length + raw.length;
    const refRange = new vscode.Range(
      new vscode.Position(lineIndex, refStartCol),
      new vscode.Position(lineIndex, refEndCol),
    );

    references.push({
      raw,
      owner: parsed.owner,
      repo: parsed.repo,
      subPath: parsed.subPath,
      ref: parsed.ref,
      refType: parsed.refType,
      range,
      refRange,
    });
  }

  return references;
}

/**
 * 指定されたドキュメントがGitHub Actions関連ファイルかどうかを判定する
 */
export function isTargetDocument(document: vscode.TextDocument): boolean {
  const filePath = document.uri.fsPath;
  // ワークフローファイル
  if (/[/\\]\.github[/\\]workflows[/\\].+\.ya?ml$/.test(filePath)) {
    return true;
  }
  // Composite Actionファイル
  if (/[/\\]action\.ya?ml$/.test(filePath)) {
    return true;
  }
  return false;
}
