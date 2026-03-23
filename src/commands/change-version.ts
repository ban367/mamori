import * as vscode from "vscode";
import type { ActionResolver } from "../resolvers/action-resolver";
import { parseDocument } from "../parsers/yaml-parser";
import { showVersionQuickPick } from "../ui/quick-pick";

/**
 * 指定行のアクションに対してQuickPickを開く（クリックハンドラから呼ばれる）
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
 * バージョン変更コマンド
 * uses: 行のバージョン部分を選択したタグで置換する
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
    vscode.window.showInformationMessage("Mamori: GitHub Actions の参照が見つかりません");
    return;
  }

  // 引数でline指定がある場合はその行、なければカーソル位置
  const targetLine = args?.line ?? editor.selection.active.line;
  const reference = references.find((ref) => ref.range.start.line === targetLine);

  if (!reference) {
    // カーソル行にuses行がない場合、全アクションから選択
    const items = references.map((ref) => ({
      label: ref.raw,
      description: `行 ${ref.range.start.line + 1}`,
      ref,
    }));

    const selected = await vscode.window.showQuickPick(items, {
      title: "対象のアクションを選択",
      placeHolder: "バージョンを変更するアクションを選択してください",
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
    vscode.window.showWarningMessage("Mamori: バージョン情報を取得中です。しばらくお待ちください。");
    return;
  }

  const result = await showVersionQuickPick(resolved);
  if (!result) {
    return;
  }

  // refRange部分を選択された値（タグ名またはSHA）で置換
  const edit = new vscode.WorkspaceEdit();
  edit.replace(editor.document.uri, reference.refRange, result.value);
  await vscode.workspace.applyEdit(edit);
}
