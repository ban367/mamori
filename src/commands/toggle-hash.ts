import * as vscode from "vscode";
import type { ActionResolver } from "../resolvers/action-resolver";
import { parseDocument } from "../parsers/yaml-parser";
import { showHashToggleQuickPick } from "../ui/quick-pick";

/**
 * SHA⇔タグ変換コマンド
 * uses: 行のバージョン部分をSHA/タグで相互変換する
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
      "Mamori: カーソル行にGitHub Actionsの参照が見つかりません",
    );
    return;
  }

  const resolved = resolver.getResolved(reference);
  if (!resolved) {
    vscode.window.showWarningMessage("Mamori: バージョン情報を取得中です。しばらくお待ちください。");
    return;
  }

  const result = await showHashToggleQuickPick(resolved);
  if (!result) {
    return;
  }

  // refRange部分を新しい値で置換
  const edit = new vscode.WorkspaceEdit();
  edit.replace(editor.document.uri, reference.refRange, result.value);
  await vscode.workspace.applyEdit(edit);
}
