import * as vscode from "vscode";
import { USES_LINE_PATTERN } from "../constants";
import type { ActionReference } from "../types";
import { parseActionReference } from "./action-reference";

/**
 * Parse a document's text to extract `uses:` lines and return ActionReference array.
 */
export function parseDocument(document: vscode.TextDocument): ActionReference[] {
  const text = document.getText();
  const references: ActionReference[] = [];

  const pattern = new RegExp(USES_LINE_PATTERN.source, USES_LINE_PATTERN.flags);
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(text)) !== null) {
    const raw = match[3];
    const parsed = parseActionReference(raw);
    if (!parsed) {
      continue;
    }

    const lineIndex = document.positionAt(match.index).line;
    const prefix = match[1];
    const quote = match[2];

    const lineStart = new vscode.Position(lineIndex, 0);
    const lineTextLength = document.lineAt(lineIndex).text.length;
    const lineEnd = new vscode.Position(lineIndex, lineTextLength);
    const range = new vscode.Range(lineStart, lineEnd);

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
 * Check if a document is a GitHub Actions target file.
 */
export function isTargetDocument(document: vscode.TextDocument): boolean {
  const filePath = document.uri.fsPath;
  if (/[/\\]\.github[/\\]workflows[/\\].+\.ya?ml$/.test(filePath)) {
    return true;
  }
  if (/[/\\]action\.ya?ml$/.test(filePath)) {
    return true;
  }
  return false;
}
