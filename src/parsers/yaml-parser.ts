import * as vscode from "vscode";
import { USES_LINE_PATTERN } from "../constants";
import type { ActionReference } from "../types";
import { parseActionReference } from "./action-reference";

/**
 * Parse a document's text to extract `uses:` lines and return ActionReference array.
 */
export function parseDocument(document: vscode.TextDocument): ActionReference[] {
  const references: ActionReference[] = [];
  const lineFlags = USES_LINE_PATTERN.flags.replace(/[gm]/g, "");
  const linePattern = new RegExp(USES_LINE_PATTERN.source, lineFlags);
  const lineCount = document.lineCount;

  for (let i = 0; i < lineCount; i++) {
    const lineText = document.lineAt(i).text;
    const match = linePattern.exec(lineText);
    if (!match) {
      continue;
    }

    const raw = match[3];
    const parsed = parseActionReference(raw);
    if (!parsed) {
      continue;
    }

    const prefix = match[1];
    const quote = match[2];

    const lineStart = new vscode.Position(i, 0);
    const lineEnd = new vscode.Position(i, lineText.length);
    const range = new vscode.Range(lineStart, lineEnd);

    const refStartCol = prefix.length + quote.length + raw.indexOf("@") + 1;
    const refEndCol = prefix.length + quote.length + raw.length;
    const refRange = new vscode.Range(
      new vscode.Position(i, refStartCol),
      new vscode.Position(i, refEndCol),
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
