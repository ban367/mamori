import * as vscode from "vscode";
import type { ActionResolver } from "../resolvers/action-resolver";
import { parseDocument } from "../parsers/yaml-parser";
import { showHashToggleQuickPick } from "../ui/quick-pick";

/**
 * Toggle SHA/Tag command.
 * Converts the version part of a `uses:` line between SHA and tag name.
 */
export async function toggleHash(
  resolver: ActionResolver,
  args?: { line: number },
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const references = parseDocument(editor.document);
  const targetLine = args?.line ?? editor.selection.active.line;
  const reference = references.find((ref) => ref.range.start.line === targetLine);

  if (!reference) {
    vscode.window.showInformationMessage(
      "Mamori: No GitHub Actions reference found at cursor line",
    );
    return;
  }

  const resolved = resolver.getResolved(reference);
  if (!resolved) {
    vscode.window.showWarningMessage("Mamori: Fetching version info. Please wait...");
    return;
  }

  const result = await showHashToggleQuickPick(resolved);
  if (!result) {
    return;
  }

  const edit = new vscode.WorkspaceEdit();
  edit.replace(editor.document.uri, reference.refRange, result.value);
  await vscode.workspace.applyEdit(edit);
}
