import * as vscode from "vscode";
import type { ActionResolver } from "../resolvers/action-resolver";
import { parseDocument } from "../parsers/yaml-parser";
import { showVersionQuickPick } from "../ui/quick-pick";

/**
 * Open QuickPick for the action at the specified line (called from click handler).
 */
export async function changeVersionAtLine(
  resolver: ActionResolver,
  line: number,
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const references = parseDocument(editor.document);
  const reference = references.find((ref) => ref.range.start.line === line);
  if (!reference) {
    return;
  }

  return changeVersionForRef(editor, resolver, reference);
}

/**
 * Change version command.
 * Replaces the version part of a `uses:` line with the selected tag.
 */
export async function changeVersion(
  resolver: ActionResolver,
  args?: { line: number },
): Promise<void> {
  const editor = vscode.window.activeTextEditor;
  if (!editor) {
    return;
  }

  const references = parseDocument(editor.document);
  if (references.length === 0) {
    vscode.window.showInformationMessage("Mamori: No GitHub Actions references found");
    return;
  }

  const targetLine = args?.line ?? editor.selection.active.line;
  const reference = references.find((ref) => ref.range.start.line === targetLine);

  if (!reference) {
    // No uses line at cursor - let user pick from all actions
    const items = references.map((ref) => ({
      label: ref.raw,
      description: `line ${ref.range.start.line + 1}`,
      ref,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      title: "Select action",
      placeHolder: "Select the action to change version",
    });

    if (!selected) {
      return;
    }

    return changeVersionForRef(editor, resolver, selected.ref);
  }

  return changeVersionForRef(editor, resolver, reference);
}

async function changeVersionForRef(
  editor: vscode.TextEditor,
  resolver: ActionResolver,
  reference: ReturnType<typeof parseDocument>[0],
): Promise<void> {
  const resolved = resolver.getResolved(reference);
  if (!resolved) {
    vscode.window.showWarningMessage("Mamori: Fetching version info. Please wait...");
    return;
  }

  const result = await showVersionQuickPick(resolved);
  if (!result) {
    return;
  }

  const edit = new vscode.WorkspaceEdit();
  edit.replace(editor.document.uri, reference.refRange, result.value);
  await vscode.workspace.applyEdit(edit);
}
